import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CubeUVReflectionMapping,
  DataTexture,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Fog,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  RedFormat,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type MeshPhysicalMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { StageProgress } from '../motion/stage-progress';
import { paced, RIGS, type Framing, type Shot, type StopKey } from './rigs';
import { STUDIO_ENV_SIGMA, STUDIO_PANELS } from './studio';
import { vehicleById, type VehicleId } from './vehicles';

const INK = 0x0b0c0e;
/** Arrivée des phares : un temps de nuit, puis l'approche. */
const INTRO_DELAY_MS = 400;
const INTRO_MS = 2800;
const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const;
const PAINT = /carpaint_max|paint_material|^black_paint$|^red_paint$/;

interface StageOptions {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  stops: HTMLElement[];
  progress: StageProgress;
  narrow: MediaQueryList;
  vehicle: VehicleId;
  assets: { model: Promise<ArrayBuffer>; environment: Promise<ArrayBuffer | null> };
}

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * Scène unique : le véhicule de la visite, garé la nuit au bord de la mer, une caméra pilotée par le scroll.
 * Le rendu n'a lieu que lorsque quelque chose change (scroll, intro, resize) :
 * au repos, la scène ne consomme rien. Aucune étape lourde ne bloque le fil principal :
 * environnement pré-calculé, géométrie décodée en workers, shaders compilés en parallèle,
 * textures envoyées au GPU une par image. Jalons : stage:env, stage:model, stage:compiled,
 * stage:textures, stage:first-frame.
 */
export async function createStage({ root, canvas, stops, progress, narrow, vehicle, assets }: StageOptions) {
  const viewport = canvas.parentElement as HTMLElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const renderer = new WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  // La vérification des erreurs de shaders force une attente synchrone : réservée au développement.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new Scene();
  scene.background = nightHorizon(narrow.matches ? 1024 : 2048);
  scene.fog = new Fog(INK, 16, 40);
  const environment = await assets.environment;
  scene.environment = environment ? bakedStudio(environment) : studio(renderer);
  performance.mark('stage:env');

  const camera = new PerspectiveCamera(30, 1, 0.1, 80);

  // Décodage de la géométrie compressée hors du fil principal.
  MeshoptDecoder.useWorkers?.(2);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await assets.model, '');
  const car = prepareCar(gltf.scene);
  const road = street();
  scene.add(car, contactShadow(car), road);
  // Lumières de la côte, au loin (desktop ; sur mobile, l'horizon passe sous l'en-tête).
  const lights = coastLights();
  scene.add(lights);
  performance.mark('stage:model');

  // — Caméra : une courbe passe par les cadrages de chaque arrêt (variante mobile si besoin).
  const rig = RIGS.c63;
  const keys = stops.map((el) => el.dataset.stop as StopKey);
  const shots: Shot[] = keys.map((key) => rig[key] ?? rig.hero);
  const anchors = vehicleById(vehicle).anchors ?? {};
  const lastStop = shots.length - 1;
  const lookAt = new Vector3();
  let framings: Framing[] = [];
  let positions: CatmullRomCurve3;
  let targets: CatmullRomCurve3;
  let shift = 0;

  const buildPath = () => {
    framings = shots.map((s) => (narrow.matches ? { ...s, ...s.mobile } : s));
    positions = new CatmullRomCurve3(framings.map((f) => new Vector3(...f.position)), false, 'centripetal');
    targets = new CatmullRomCurve3(framings.map((f) => new Vector3(...f.target)), false, 'centripetal');
  };
  buildPath();

  const applyOffset = () => {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (narrow.matches) camera.setViewOffset(w, h, 0, h * shift, w, h);
    // Sous 1440 px, la colonne de texte pèse plus lourd dans la largeur : le véhicule se décale un peu plus.
    else camera.setViewOffset(w, h, -w * (shift + Math.max(0, 1 - w / 1440) * 0.08), 0, w, h);
    camera.updateProjectionMatrix();
  };

  // Extinction (dernier arrêt) : les phares d'abord — leur flaque quitte la chaussée —, puis la rue, la mer
  // et la voiture se fondent dans le noir de la page, où la section Méthode s'ouvre.
  const night = root.querySelector<HTMLElement>('[data-night]');
  const applyNight = (n: number) => {
    (road.material as ShaderMaterial).uniforms.uHeadlights.value = 1 - MathUtils.smoothstep(n, 0, 0.45);
    if (night) night.style.opacity = MathUtils.smoothstep(n, 0.35, 1).toFixed(3);
  };

  const cameraAt = (p: number) => {
    const i = Math.min(Math.floor(p), Math.max(lastStop - 1, 0));
    // Chaque segment a son rythme : celui du cadrage visé (rigs.ts).
    const next = shots[Math.min(i + 1, lastStop)];
    const t = paced(p - i, next.pace);
    const out = next.lightsOut;
    applyNight(out ? Math.min(Math.max((p - i - out[0]) / (out[1] - out[0]), 0), 1) : 0);
    const u = lastStop > 0 ? (i + t) / lastStop : 0;
    positions.getPoint(u, camera.position);
    targets.getPoint(u, lookAt);
    camera.lookAt(lookAt);
    shift = MathUtils.lerp(framings[i].shift, framings[Math.min(i + 1, lastStop)].shift, t);
    applyOffset();
  };

  // — Trait de rappel : prolonge le filet de l'arrêt actif jusqu'à la zone concernée du véhicule.
  const callout = root.querySelector<SVGSVGElement>('[data-callout]');
  const calloutLine = callout?.querySelector('path');
  const calloutRings = callout ? [...callout.querySelectorAll('circle')] : [];
  const anchor = new Vector3();

  const drawCallout = (p: number) => {
    if (!callout || !calloutLine) return;
    const k = Math.round(p);
    const point = anchors[keys[k]] ?? shots[k]?.anchor;
    const origin = stops[k]?.querySelector<HTMLElement>('[data-callout-origin]');
    const strength = 1 - Math.min(Math.abs(p - k) / 0.2, 1);
    if (narrow.matches || !point || !origin || strength <= 0) {
      callout.style.opacity = '0';
      return;
    }
    anchor.set(...point).project(camera);
    const ax = ((anchor.x + 1) / 2) * viewport.clientWidth;
    const ay = ((1 - anchor.y) / 2) * viewport.clientHeight;
    const r = origin.getBoundingClientRect();
    calloutLine.setAttribute('d', `M${r.right},${r.bottom} H${r.right + 56} L${ax},${ay}`);
    for (const c of calloutRings) {
      c.setAttribute('cx', `${ax}`);
      c.setAttribute('cy', `${ay}`);
    }
    callout.style.opacity = strength.toFixed(3);
  };

  // — Dimensions et qualité : la définition baisse d'un cran si les images ralentissent.
  const dprSteps = [narrow.matches ? 1.5 : 1.75, 1.25, 1, 0.75].map((v) => Math.min(window.devicePixelRatio, v));
  let dprLevel = 0;
  let slowFrames = 0;
  let dirty = true;
  let wasNarrow = narrow.matches;

  const resize = () => {
    if (narrow.matches !== wasNarrow) {
      wasNarrow = narrow.matches;
      buildPath();
    }
    renderer.setPixelRatio(dprSteps[dprLevel]);
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
    lights.visible = !narrow.matches;
    (lights.material as ShaderMaterial).uniforms.uPixelRatio.value = renderer.getPixelRatio();
    const aspect = viewport.clientWidth / viewport.clientHeight;
    camera.aspect = aspect;
    // Desktop : sous 16:10, la largeur de champ reste constante — le véhicule garde sa place à côté du texte.
    camera.fov = narrow.matches
      ? // Tablette en portrait : même largeur de champ que sur téléphone, le véhicule garde son ampleur.
        Math.max(26, aspect > 0.6 ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(19)) * 0.6) / aspect)) : 38)
      : aspect < 1.6
        ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(15)) * 1.6) / aspect))
        : 30;
    applyOffset();
    progress.measure();
    dirty = true;
  };
  resize();
  new ResizeObserver(resize).observe(viewport);
  reduced.addEventListener('change', () => (dirty = true));

  // — Arrivée : la voiture attend dans la nuit (c'est l'affiche), puis les phares du mécanicien
  // approchent : leur flaque glisse sur la chaussée jusqu'à elle, les reflets glissent sur la
  // carrosserie, elle s'éclaire. Calée sur le temps réel (0,4 s de nuit, puis 2,8 s).
  const applyIntro = (t: number) => {
    const e = 1 - (1 - t) ** 3;
    scene.environmentRotation.y = (1 - e) * -1.2;
    scene.environmentIntensity = 0.72 + 0.28 * e;
    (road.material as ShaderMaterial).uniforms.uArrival.value = e;
  };
  let introStart = 0;
  let introDone = reduced.matches;
  applyIntro(introDone ? 1 : 0);

  let current = progress.read();
  cameraAt(current);
  // Compilation des shaders sans bloquer le fil principal (KHR_parallel_shader_compile).
  await renderer.compileAsync(scene, camera);
  performance.mark('stage:compiled', { detail: { programs: renderer.info.programs?.length } });

  // Envoi des textures au GPU une par image, plutôt qu'en un seul bloc au premier rendu.
  for (const texture of collectTextures(scene, scene.environment)) {
    renderer.initTexture(texture);
    await nextFrame();
  }
  performance.mark('stage:textures', { detail: { textures: renderer.info.memory.textures } });

  let raf = 0;
  let lastTime = 0;
  let firstFrame = true;

  const render = () => {
    cameraAt(current);
    renderer.render(scene, camera);
    drawCallout(current);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.25) : 1 / 60;
    lastTime = now;

    const target = progress.read();
    let changed = dirty;
    if (reduced.matches) {
      const snapped = Math.round(target);
      if (snapped !== current) {
        current = snapped;
        changed = true;
      }
    } else if (Math.abs(target - current) > 1e-4) {
      current += (target - current) * (1 - Math.exp(-dt * 4.5));
      changed = true;
    }
    if (!introDone) {
      introStart ||= now;
      const t = Math.min(Math.max(now - introStart - INTRO_DELAY_MS, 0) / INTRO_MS, 1);
      applyIntro(t);
      introDone = t >= 1;
      changed = true;
    }
    if (!changed) {
      slowFrames = 0;
      return;
    }

    dirty = false;
    render();
    if (firstFrame) {
      firstFrame = false;
      performance.mark('stage:first-frame', {
        detail: { programs: renderer.info.programs?.length, calls: renderer.info.render.calls },
      });
      canvas.classList.add('is-ready');
    }

    if (dt > 1 / 24) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 8 && dprLevel < dprSteps.length - 1) {
      dprLevel++;
      slowFrames = 0;
      resize();
    }
  };

  const start = () => {
    if (raf) return;
    lastTime = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(root);

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    root.classList.add('is-static');
  });

  if (import.meta.env.DEV) {
    // Contrôle QA : cadrage final immédiat (sans amortissement ni intro) pour des captures fiables ;
    // `arrival: 0` pose l'état d'avant l'arrivée des phares (affiche).
    Object.assign(window, {
      __stage: {
        settle(options: { arrival?: number } = {}) {
          current = progress.read();
          introDone = true;
          applyIntro(options.arrival ?? 1);
          render();
          canvas.classList.add('is-ready');
          return Number(current.toFixed(3));
        },
        // Coût d'une image (ms), sol affiché ou non : readPixels attend la fin du rendu GPU.
        bench(frames = 12, withRoad = true) {
          const gl = renderer.getContext();
          const pixel = new Uint8Array(4);
          road.visible = withRoad;
          render();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          const t0 = performance.now();
          for (let k = 0; k < frames; k++) {
            render();
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          }
          const ms = (performance.now() - t0) / frames;
          road.visible = true;
          render();
          return Number(ms.toFixed(1));
        },
        info() {
          return {
            vehicle,
            p: Number(current.toFixed(3)),
            target: Number(progress.read().toFixed(3)),
            dpr: renderer.getPixelRatio(),
            size: [canvas.width, canvas.height],
            calls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            textures: renderer.info.memory.textures,
            programs: renderer.info.programs?.length,
            baked: Boolean(environment),
            dprLevel,
          };
        },
      },
    });
  }
}

/** Environnement pré-calculé (scripts/bake-env.mjs) : décodé et utilisé tel quel, sans PMREM. */
function bakedStudio(buffer: ArrayBuffer): Texture {
  const hdr = new HDRLoader().parse(buffer);
  const texture = new DataTexture(hdr.data, hdr.width, hdr.height, RGBAFormat, hdr.type);
  texture.mapping = CubeUVReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** Repli : calcul de l'environnement à l'exécution (fichier pré-calculé absent ou illisible). */
function studio(renderer: WebGLRenderer): Texture {
  const env = new Scene();
  const plane = new PlaneGeometry(1, 1);
  for (const panel of STUDIO_PANELS) {
    const mesh = new Mesh(
      plane,
      new MeshBasicMaterial({ color: new Color(panel.color).multiplyScalar(panel.power), side: DoubleSide }),
    );
    mesh.scale.set(panel.size[0], panel.size[1], 1);
    mesh.position.set(...panel.position);
    mesh.rotation.set(...panel.rotation);
    env.add(mesh);
  }
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, STUDIO_ENV_SIGMA).texture;
  pmrem.dispose();
  return texture;
}

function prepareCar(model: Object3D) {
  model.scale.setScalar(100); // modèles sources exprimés en centièmes de mètre
  model.updateMatrixWorld(true);
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as MeshPhysicalMaterial;
    const name = material.name.toLowerCase();
    // Aucun logo constructeur mis en avant : badges et plaques masqués (déjà retirés par le pipeline).
    if (/badge|plate/.test(name)) {
      mesh.visible = false;
      return;
    }
    // La transmission (passe de rendu supplémentaire) est remplacée par une transparence simple.
    if (material.transmission > 0) {
      material.transmission = 0;
      material.transparent = true;
      material.opacity = Math.min(material.opacity, 0.3);
      material.depthWrite = false;
    }
    // Seules les peintures gardent le matériau « physique » (vernis) ; ailleurs, le standard suffit :
    // moins de variantes de shaders à compiler, donc une scène prête plus tôt.
    if (PAINT.test(name) && material.isMeshPhysicalMaterial) {
      material.clearcoat = 1;
      material.clearcoatRoughness = 0.04;
    } else if (material.isMeshPhysicalMaterial) {
      mesh.material = new MeshStandardMaterial().copy(material);
      material.dispose();
    }
  });
  return model;
}

function collectTextures(root: Object3D, extra?: Texture | null) {
  const textures = new Set<Texture>();
  if (extra) textures.add(extra);
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const material = mesh.material as MeshPhysicalMaterial;
    for (const slot of TEXTURE_SLOTS) {
      const texture = material[slot];
      if (texture) textures.add(texture);
    }
  });
  return textures;
}

/**
 * Le lieu : un bord de route, la nuit, face à la mer. Repère : véhicule centré, avant vers +Z, côté
 * conducteur vers +X (côté chaussée), côté passager vers -X (bordure, trottoir, puis la mer, noire).
 */
const STREET_FRAGMENT = /* glsl */ `
uniform vec3 uInk;
uniform float uArrival;
uniform float uHeadlights;
uniform sampler2D uNoise;
varying vec3 vWorld;

const float KERB = -1.3;                // bordure du trottoir, côté passager
// Phares du véhicule du mécanicien, garé derrière la caméra du premier arrêt, dirigés vers la voiture.
const vec2 VAN = vec2(9.6, 11.5);
const vec2 AIM = vec2(-0.641, -0.768);
const vec2 PERP = vec2(0.768, -0.641);
// Demi-largeur du véhicule vue des phares : son emprise (0,98 × 2,4 m) projetée en travers du faisceau.
const float SPREAD = 2.29;

// Grain de matière à l'échelle donnée (texture pavable ; les mipmaps l'adoucissent au loin).
float grain(vec2 p, float scale) {
  return texture2D(uNoise, p * scale).r;
}

// Faisceau d'un phare sur la chaussée : il se pose à quelques mètres et garde sa force jusqu'à la
// voiture. L'ombre du véhicule est un cône derrière lui, dans l'angle qu'il occupe vu du phare, dont
// la pénombre s'élargit avec la distance (calcul direct, sans boucle). Les phares sont plus bas que le
// toit : derrière la voiture, la chaussée reste dans son ombre.
float beam(vec2 p, vec2 lamp) {
  vec2 v = p - lamp;
  float along = dot(v, AIM);
  float across = dot(v, PERP);
  float light = smoothstep(5.0, 11.0, along) * exp(-pow(across / (0.3 + along * 0.13), 2.0)) / (1.0 + pow(along / 16.0, 2.0));
  float reach = dot(-lamp, AIM);
  float angle = abs(across / max(along, 0.1) - dot(-lamp, PERP) / reach);
  float soft = 0.004 + 0.02 * max(along - reach, 0.0) / reach;
  float shadow = smoothstep(reach - 0.5, reach + 0.5, along) * (1.0 - smoothstep(SPREAD / reach - soft, SPREAD / reach + soft, angle));
  return light * (1.0 - shadow);
}

void main() {
  vec2 p = vWorld.xz;
  // Matière : bitume (usure en grandes plages, reprises, granulat) à faible contraste, jamais une trame ;
  // trottoir plus fin et plus clair au-delà de la bordure.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  albedo = mix(albedo, 0.05 * mix(0.9, 1.1, grain(p, 0.1)) * mix(0.9, 1.1, aggregate), pavement);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;

  // Lumière : nuit (la chaussée non éclairée disparaît), lampadaires de la promenade tous les 24 m,
  // phares du mécanicien.
  vec3 light = vec3(0.06, 0.068, 0.09);
  for (int k = 0; k < 4; k++) {
    vec2 r = p - vec2(-2.7, 3.0 - float(k) * 24.0);
    light += vec3(1.0, 0.8, 0.58) * 0.9 * exp(-dot(r, r) / 20.0);
  }
  vec2 side = PERP * 0.72;
  vec2 lamp = VAN - AIM * 9.0 * (1.0 - uArrival);
  light += vec3(0.85, 0.9, 1.0) * 1.7 * (beam(p, lamp + side) + beam(p, lamp - side)) * smoothstep(0.0, 0.35, uArrival) * uHeadlights;

  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  // Au-delà du trottoir, la mer, noire ; au loin, la chaussée se fond dans la nuit.
  color *= 1.0 - smoothstep(-4.5, -6.5, p.x) * 0.85;
  color = mix(color, uInk, smoothstep(14.0, 42.0, length(vWorld - cameraPosition)));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

/** Grain de matière (256², pavable, lissé, déterministe) : le bitume le lit à plusieurs échelles. */
function grainTexture() {
  const size = 256;
  const random = seeded(7);
  const raw = Float32Array.from({ length: size * size }, () => random());
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) sum += raw[((y + dy + size) % size) * size + ((x + dx + size) % size)];
      }
      // Lissage 3 × 3, puis contraste rétabli autour de 0,5.
      data[y * size + x] = Math.round(Math.min(Math.max((sum / 9 - 0.5) * 2.6 + 0.5, 0), 1) * 255);
    }
  }
  const texture = new DataTexture(data, size, size, RedFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Le lieu, en un seul plan : bitume, bordure et trottoir côté passager, lampadaires de la promenade
 * qui s'éloignent, et les phares du mécanicien qui arrivent (uArrival) et éclairent la voiture — elle
 * projette leur ombre longue sur la chaussée. Tout est calculé dans le shader : ni texture, ni objet.
 */
function street() {
  const material = new ShaderMaterial({
    uniforms: {
      uInk: { value: new Color(INK) },
      uArrival: { value: 1 },
      uHeadlights: { value: 1 },
      uNoise: { value: grainTexture() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: STREET_FRAGMENT,
  });
  const mesh = new Mesh(new PlaneGeometry(160, 160), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Pseudo-aléatoire déterministe : le même panorama à chaque visite (affiches comprises). */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fond de nuit : un ciel noir qui se voile à peine de bleu sur l'horizon, puis la mer, plus sombre.
 * Panorama équirectangulaire dessiné au chargement : il tourne avec la caméra, comme un vrai lointain.
 */
function nightHorizon(width: number): Texture {
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const horizon = height / 2;
  const deg = height / 180; // pixels par degré d'élévation

  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#0b0c0e');
  sky.addColorStop(0.86, '#0b0c0f');
  sky.addColorStop(0.975, '#0e1117');
  sky.addColorStop(1, '#141a24');
  g.fillStyle = sky;
  g.fillRect(0, 0, width, horizon);

  const sea = g.createLinearGradient(0, horizon, 0, horizon + 8 * deg);
  sea.addColorStop(0, '#10141b');
  sea.addColorStop(0.2, '#0c0e12');
  sea.addColorStop(1, '#0b0c0e');
  g.fillStyle = sea;
  g.fillRect(0, horizon, width, height - horizon);

  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Lumières d'une côte à flanc de collines, au loin : la Riviera de nuit, discrète derrière le véhicule
 * au premier arrêt (ailleurs, la mer reste noire). Points ronds et nets à toute définition, hors
 * brouillard, à 70 m (en deçà du plan lointain de la caméra).
 */
function coastLights() {
  const random = seeded(26);
  const position: number[] = [];
  const tint: number[] = [];
  const size: number[] = [];
  const warm = new Color(0xffb26e);
  const cool = new Color(0xc8dcff);
  const color = new Color();
  const add = (azimuth: number, elevation: number, glow: number, px: number, base: Color) => {
    position.push(Math.cos(azimuth) * 70, 1.4 + Math.tan(elevation) * 70, Math.sin(azimuth) * 70);
    color.copy(base).multiplyScalar(glow);
    tint.push(color.r, color.g, color.b);
    size.push(px);
  };
  for (let i = 0; i < 170; i++) {
    // Secteur vu derrière le véhicule au premier arrêt : plus dense à sa droite, clairsemé vers le texte.
    const along = 1 - (1 - random()) ** 1.6;
    const azimuth = MathUtils.degToRad(-160 + along * 48);
    // Relief : des collines qui s'élèvent peu à peu, sans prétention de précision.
    const ridge = 0.2 + 1.1 * (Math.sin(along * 7.2 + 0.6) * 0.5 + 0.5) ** 1.5 * (0.4 + along);
    const base = random() < 0.7 ? warm : cool;
    const glow = 0.4 + random() * 0.6;
    const px = 2 + random() * 2.2;
    add(azimuth, MathUtils.degToRad(0.12 + random() * ridge), glow, px, base);
    // Reflet sur l'eau, sous les plus vives.
    if (glow > 0.8) add(azimuth, -MathUtils.degToRad(0.08 + random() * 0.25), glow * 0.22, px * 0.8, base);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('tint', new Float32BufferAttribute(tint, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(size, 1));
  const material = new ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 tint;
      attribute float size;
      uniform float uPixelRatio;
      varying vec3 vTint;
      void main() {
        vTint = tint;
        gl_PointSize = size * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vTint;
      void main() {
        gl_FragColor = vec4(vTint, 1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5)));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/** Ombre de contact précalculée (texture elliptique) : aucun shadow map en temps réel. */
function contactShadow(model: Object3D) {
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.translate(64, 128);
  g.scale(1, 2);
  const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.9)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gradient;
  g.fillRect(-64, -64, 128, 128);

  const mesh = new Mesh(
    new PlaneGeometry(size.x * 1.35, size.z * 1.12),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), color: 0x000000, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((box.min.x + box.max.x) / 2, 0.004, (box.min.z + box.max.z) / 2);
  return mesh;
}
