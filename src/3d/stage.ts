import {
  AdditiveBlending,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CubeUVReflectionMapping,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Fog,
  Group,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  RedFormat,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SpotLight,
  Sprite,
  SpriteMaterial,
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
import { createFollow } from '../motion/follow';
import { guided } from '../motion/guide';
import type { StageProgress } from '../motion/stage-progress';
import { BANDS, createBay, FIT_TALL, FIT_WIDE, type BayFit } from './bay';
import { guidedPace, paced, RIGS, type Framing, type Shot, type StopKey } from './rigs';
import { STUDIO_ENV_SIGMA, STUDIO_PANELS } from './studio';
import { vehicleById, type VehicleId } from './vehicles';

const INK = 0x0b0c0e;
/**
 * Plan du lieu (m) — x vers la chaussée (côté conducteur), z vers l'avant du véhicule. Bordure du trottoir côté
 * passager et sa pierre : sur ordinateur, la baie commence au-delà.
 */
const KERB = -1.3;
const KERB_STONE = 0.16;
/**
 * Téléphone : la place de stationnement marquée (ligne de rive, longueur d'une place, axe de la chaussée),
 * l'esplanade jusqu'au garde-corps de la corniche (EDGE) et ses lampadaires — mât côté garde-corps, lanterne au
 * bout de la crosse, au-dessus de l'esplanade.
 */
const BAY_LINE = 1.15;
const BAY_LENGTH = 6;
const CENTER_LINE = 4.4;
const EDGE = -6.4;
const LAMP_X = -5.7;
const LAMP_REACH = 0.72;
const LAMP_HEIGHT = 3.7;
const LAMP_Z = [-3, -25, -47, 19];
const glsl = (n: number) => n.toFixed(2);
const LAMP_GLSL = LAMP_Z.map((z) => `vec2(${glsl(LAMP_X + LAMP_REACH)}, ${glsl(z)})`).join(', ');
const LAMP_HEADS_GLSL = LAMP_Z.map((z) => `vec3(${glsl(LAMP_X + LAMP_REACH)}, ${glsl(LAMP_HEIGHT - 0.17)}, ${glsl(z)})`).join(', ');
/** L'autre trottoir : un lampadaire hors champ, face au véhicule (sa lanterne : x, y, z) — la lumière de face. */
const ROAD_LAMP: [number, number, number] = [7.6, 4.1, 2.2];
const ROAD_LAMP_GLSL = `vec2(${glsl(ROAD_LAMP[0])}, ${glsl(ROAD_LAMP[2])})`;
/** Téléphone, intensités (unités physiques) : clair de lune, lampadaire d'en face, lanterne de l'esplanade. */
const MOON_LIGHT = 0.8;
const KEY_LIGHT = 70;
const LAMP_LIGHT = 18;
/**
 * Allumage (téléphone) : la lanterne s'amorce en papillotant, prend sa pleine puissance dans un léger éclat, puis
 * se pose — (secondes, niveau). La scène, elle, s'éclaire d'un seul tenant (updateLamp).
 */
const IGNITION: [number, number][] = [
  [0, 0],
  [0.07, 0.55],
  [0.13, 0.06],
  [0.22, 0.72],
  [0.3, 0.18],
  [0.42, 1.18],
  [0.75, 0.96],
  [1.3, 1],
];
/** Au-delà (s), l'allumage est posé : lumières, reflets, teinte. */
const LIT = 1.6;

function ignition(t: number) {
  for (let i = 1; i < IGNITION.length; i++) {
    const [t1, v1] = IGNITION[i];
    if (t <= t1) {
      const [t0, v0] = IGNITION[i - 1];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return 1;
}

/** Lumières des lampadaires, partagées par le sol, le garde-corps et le cône de lumière (mêmes objets). */
interface LampUniforms {
  uLamp: { value: number };
  uOut: { value: number };
  uLampTint: { value: Color };
  uMoon: { value: number };
}
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
  assets: {
    model: Promise<ArrayBuffer>;
    environment: Promise<ArrayBuffer | null>;
    bay: Promise<ImageBitmap | null>;
    bayBand: keyof typeof BANDS;
    moon: Promise<ImageBitmap | null>;
  };
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

  // Plan lointain au-delà du décor de la baie (à 100 m de la caméra du premier arrêt, bay.ts).
  const camera = new PerspectiveCamera(30, 1, 0.1, 200);

  // Décodage de la géométrie compressée hors du fil principal.
  MeshoptDecoder.useWorkers?.(2);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await assets.model, '');
  const car = prepareCar(gltf.scene);
  const road = street();
  scene.add(car, contactShadow(car), road);
  // Téléphone : la nuit et la pleine lune, puis les lampadaires qui s'allument au premier geste — niveaux partagés
  // par le sol, le garde-corps et le cône de lumière (mêmes uniformes).
  const lampUniforms: LampUniforms = {
    uLamp: { value: 0 },
    uOut: { value: 1 },
    uLampTint: { value: new Color(1, 0.8, 0.58) },
    uMoon: { value: 1 },
  };
  Object.assign((road.material as ShaderMaterial).uniforms, lampUniforms);
  // Téléphone : le bord de la corniche — garde-corps, lampadaires et leurs lumières (dans la scène sur téléphone
  // seulement, resize : l'ordinateur ne les compile jamais) ; le sol reste net au loin (filtrage anisotrope).
  const corniche = promenade(lampUniforms);
  // Clair de lune (venu de la lune du décor, resize), lampadaire d'en face (la lumière de face), lanterne voisine.
  const moonLight = new DirectionalLight(0xb4c6ff, MOON_LIGHT);
  const keyLight = new SpotLight(0xffcf96, 0, 26, 0.5, 0.75, 2);
  keyLight.position.set(...ROAD_LAMP);
  keyLight.target.position.set(0, 0.45, 0);
  const lampLight = new PointLight(0xffc98a, 0, 12, 2);
  lampLight.position.set(LAMP_X + LAMP_REACH, LAMP_HEIGHT - 0.3, LAMP_Z[0]);
  corniche.group.add(moonLight, moonLight.target, keyLight, keyLight.target, lampLight);
  (road.material as ShaderMaterial).uniforms.uNoise.value.anisotropy = narrow.matches
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
    : 1;
  // Le décor : la baie de Villefranche la nuit (photo, bande du format de l'écran) et sa lune ; à défaut, des
  // lumières de côte dessinées.
  const [bayImage, moonImage] = await Promise.all([assets.bay, assets.moon]);
  const backdrop = bayImage
    ? createBay(bayImage, BANDS[assets.bayBand], moonImage, Math.min(narrow.matches ? 16 : 8, renderer.capabilities.getMaxAnisotropy()))
    : null;
  if (backdrop) {
    scene.add(backdrop.mesh);
    if (backdrop.moon) scene.add(backdrop.moon);
  }
  const lights = coastLights();
  scene.add(lights);

  // Allumage (téléphone) : secondes écoulées depuis le premier geste (LIT : posé). Mouvement réduit : allumé
  // d'emblée ; arrivée au milieu de la page : allumage aussitôt.
  let lampT = reduced.matches ? LIT : 0;
  let igniteAt = 0;
  let igniteWanted = window.scrollY > 4;
  addEventListener('scroll', () => (igniteWanted = true), { once: true, passive: true });
  const updateLamp = () => {
    if (!narrow.matches) return;
    const t = lampT;
    const level = reduced.matches ? 1 : ignition(t);
    // La scène s'éclaire d'un seul tenant (aucun clignotement d'ensemble), avec un seul éclat sur la carrosserie
    // pendant que les reflets glissent ; la lanterne passe du blanc de l'amorçage à sa lumière chaude.
    const rise = MathUtils.smoothstep(t, 0.1, 0.9);
    const flash = reduced.matches ? 0 : Math.exp(-(((t - 0.46) / 0.14) ** 2));
    const warm = MathUtils.smoothstep(t, 0.3, 1.1);
    const out = lampUniforms.uOut.value;
    lampUniforms.uLamp.value = level;
    lampUniforms.uLampTint.value.setRGB(1, 0.95 - 0.15 * warm, 0.88 - 0.3 * warm);
    keyLight.color.copy(lampUniforms.uLampTint.value);
    lampLight.color.copy(lampUniforms.uLampTint.value);
    keyLight.intensity = KEY_LIGHT * rise * (1 + 0.9 * flash) * out;
    lampLight.intensity = LAMP_LIGHT * level * out;
    corniche.setLevel(level * out);
    scene.environmentIntensity = 0.2 + 0.8 * rise;
    scene.environmentRotation.y = -0.9 * (1 - Math.min(t / 1.4, 1)) ** 3;
  };
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

  const offset = (target: PerspectiveCamera, amount: number) => {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (narrow.matches) target.setViewOffset(w, h, 0, h * amount, w, h);
    // Sous 1440 px, la colonne de texte pèse plus lourd dans la largeur : le véhicule se décale un peu plus.
    else target.setViewOffset(w, h, -w * (amount + Math.max(0, 1 - w / 1440) * 0.08), 0, w, h);
    target.updateProjectionMatrix();
  };
  const applyOffset = () => offset(camera, shift);

  // Caméra du premier arrêt (même projection) : le décor de la baie se cale sur elle, au format de l'écran.
  const hero = new PerspectiveCamera();
  const fitBackdrop = (options: Partial<BayFit> = {}) => {
    if (!backdrop) return null;
    const [first] = framings;
    hero.fov = camera.fov;
    hero.aspect = camera.aspect;
    hero.far = camera.far;
    hero.position.set(...first.position);
    hero.lookAt(...first.target);
    offset(hero, first.shift);
    // Le décor couvre tout ce qui est au-delà du sol : la bordure (ordinateur), le garde-corps (téléphone).
    return backdrop.fit(hero, narrow.matches ? EDGE : KERB, { ...(narrow.matches ? FIT_TALL : FIT_WIDE), ...options });
  };

  // Extinction (dernier arrêt) : les phares d'abord — leur flaque quitte la chaussée —, puis la rue, la mer
  // et la voiture se fondent dans le noir de la page, où la section Méthode s'ouvre.
  const night = root.querySelector<HTMLElement>('[data-night]');
  const applyNight = (n: number) => {
    (road.material as ShaderMaterial).uniforms.uHeadlights.value = 1 - MathUtils.smoothstep(n, 0, 0.45);
    if (night) night.style.opacity = MathUtils.smoothstep(n, 0.35, 1).toFixed(3);
    // Téléphone : les lampadaires s'éteignent comme les phares.
    const out = 1 - MathUtils.smoothstep(n, 0, 0.45);
    if (narrow.matches && out !== lampUniforms.uOut.value) {
      lampUniforms.uOut.value = out;
      updateLamp();
    }
  };

  const cameraAt = (p: number) => {
    // Borné : l'amorti peut dépasser un instant les extrémités du parcours.
    p = Number.isFinite(p) ? Math.min(Math.max(p, 0), lastStop) : 0;
    const i = Math.min(Math.floor(p), Math.max(lastStop - 1, 0));
    // Chaque segment a son rythme : celui du cadrage visé (rigs.ts).
    const next = shots[Math.min(i + 1, lastStop)];
    // Téléphone, pas guidés : le mouvement occupe tout le pas (la lecture se fait à l'arrêt).
    const t = paced(p - i, guided.matches ? guidedPace(next.pace) : next.pace);
    const out = next.lightsOut;
    applyNight(out ? Math.min(Math.max((p - i - out[0]) / (out[1] - out[0]), 0), 1) : 0);
    // Au premier plan, la baie est nette ; dès que le mécanicien s'approche, la mise au point passe au véhicule.
    backdrop?.focus(MathUtils.smoothstep(p, 0.9, 2.2));
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

  // — Mobile : une petite lumière bleue pose le repère de la pièce du service (le trait de rappel reste au
  // desktop) — même point du véhicule, visible quand la caméra est sur l'arrêt.
  const beacon = root.querySelector<HTMLElement>('[data-beacon]');
  const drawBeacon = (p: number) => {
    if (!beacon) return;
    const k = Math.round(p);
    const point = anchors[keys[k]] ?? shots[k]?.anchor;
    const strength = 1 - Math.min(Math.abs(p - k) / 0.2, 1);
    if (!narrow.matches || !point || strength <= 0) {
      beacon.style.opacity = '0';
      return;
    }
    anchor.set(...point).project(camera);
    const x = ((anchor.x + 1) / 2) * viewport.clientWidth;
    const y = ((1 - anchor.y) / 2) * viewport.clientHeight;
    beacon.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    beacon.style.opacity = strength.toFixed(3);
  };

  // — Dimensions et qualité : la définition baisse d'un cran si les images ralentissent.
  // Téléphone : jusqu'à 2 (définition haute sur écran dense) ; ordinateur : 1,75.
  const dprSteps = (narrow.matches ? [2, 1.5, 1.25, 1, 0.75] : [1.75, 1.25, 1, 0.75]).map((v) =>
    Math.min(window.devicePixelRatio, v),
  );
  let dprLevel = 0;
  let slowFrames = 0;
  let dirty = true;
  let wasNarrow = narrow.matches;

  const resize = () => {
    if (narrow.matches !== wasNarrow) {
      wasNarrow = narrow.matches;
      buildPath();
      // Retour à l'ordinateur : la lumière de la scène posée (celle de l'arrivée des phares, achevée).
      if (!narrow.matches) {
        scene.environmentRotation.y = 0;
        scene.environmentIntensity = 1;
      }
    }
    renderer.setPixelRatio(dprSteps[dprLevel]);
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
    lights.visible = !backdrop && !narrow.matches;
    // Le sol selon le format. Ordinateur : la route s'arrête au début du trottoir, après la pierre de bordure,
    // la baie au-delà. Téléphone : la place marquée, l'esplanade et son garde-corps, la baie au-delà.
    const ground = (road.material as ShaderMaterial).uniforms;
    ground.uMobile.value = narrow.matches ? 1 : 0;
    ground.uCut.value = backdrop ? (narrow.matches ? EDGE - 0.05 : KERB - KERB_STONE) : -1000;
    if (narrow.matches) scene.add(corniche.group);
    else scene.remove(corniche.group);
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
    fitBackdrop();
    // Le clair de lune vient de la lune du décor.
    if (backdrop?.moon) moonLight.position.copy(backdrop.moon.position).setLength(40);
    updateLamp();
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
    (road.material as ShaderMaterial).uniforms.uArrival.value = e;
    // Téléphone : pas de phares — la lumière de la scène suit les lampadaires (updateLamp).
    if (narrow.matches) return updateLamp();
    scene.environmentRotation.y = (1 - e) * -1.2;
    scene.environmentIntensity = 0.72 + 0.28 * e;
  };
  let introStart = 0;
  let introDone = reduced.matches;
  applyIntro(introDone ? 1 : 0);
  // L'entrée « MECA RIVIERA PRESENT » couvre la page jusqu'à la première image : l'arrivée attend qu'elle
  // se lève (meca:enter) ; sans entrée, elle part à la première image.
  let entered = !document.documentElement.classList.contains('has-intro');
  if (!entered)
    addEventListener(
      'meca:enter',
      () => {
        entered = true;
        dirty = true;
      },
      { once: true },
    );

  let current = progress.read();
  const follow = createFollow(narrow);
  cameraAt(current);
  // Compilation des shaders sans bloquer le fil principal (KHR_parallel_shader_compile).
  await renderer.compileAsync(scene, camera);
  performance.mark('stage:compiled', { detail: { programs: renderer.info.programs?.length } });

  // Envoi des textures au GPU une par image, plutôt qu'en un seul bloc au premier rendu.
  for (const texture of collectTextures(scene, scene.environment, ...(backdrop?.textures ?? []))) {
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
    drawBeacon(current);
    progress.show(current);
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
    } else if (follow.moving(current, target)) {
      current = follow.step(current, target, dt);
      changed = true;
    }
    if (!introDone && entered) {
      introStart ||= now;
      const t = Math.min(Math.max(now - introStart - INTRO_DELAY_MS, 0) / INTRO_MS, 1);
      applyIntro(t);
      introDone = t >= 1;
      changed = true;
    }
    // Téléphone : l'allumage, au premier geste (ou dès cette image si le geste l'a précédée).
    if (narrow.matches && igniteWanted && lampT < LIT) {
      igniteAt ||= now;
      lampT = Math.min((now - igniteAt) / 1000, LIT);
      updateLamp();
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
      // La première scène existe : l'entrée peut se lever.
      dispatchEvent(new CustomEvent('meca:scene-ready'));
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
    progress.show(null);
    root.classList.add('is-static');
  });

  if (import.meta.env.DEV) {
    // Contrôle QA : cadrage final immédiat (sans amortissement ni intro) pour des captures fiables ;
    // `arrival: 0` pose l'état d'avant l'arrivée des phares (affiche).
    Object.assign(window, {
      __stage: {
        settle(options: { arrival?: number } = {}) {
          dispatchEvent(new CustomEvent('meca:intro-finish'));
          current = progress.read();
          introDone = true;
          // Téléphone : `arrival: 0` pose la nuit d'avant l'allumage (affiche) ; sinon, lampadaires allumés.
          igniteWanted = options.arrival !== 0;
          lampT = igniteWanted ? LIT : 0;
          applyIntro(options.arrival ?? 1);
          render();
          canvas.classList.add('is-ready');
          return Number(current.toFixed(3));
        },
        // Allumage (téléphone), image par image : l'état `t` secondes après le premier geste, figé.
        lamp(t: number) {
          igniteWanted = false;
          lampT = t;
          updateLamp();
          render();
          return Number(lampUniforms.uLamp.value.toFixed(2));
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
        // Réglage du décor de la baie (calage, exposition, lune) : captures comparatives.
        bay(next: Partial<BayFit> = {}) {
          const state = fitBackdrop(next);
          render();
          return state;
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

function collectTextures(root: Object3D, ...extra: (Texture | null | undefined)[]) {
  const textures = new Set<Texture>();
  for (const texture of extra) if (texture) textures.add(texture);
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
uniform float uCut;
uniform float uMobile; // 1 : téléphone — place marquée, esplanade, lampadaires ; 0 : ordinateur
uniform float uLamp;   // téléphone : niveau des lampadaires (allumés au premier geste)
uniform float uOut;    // extinction finale (1 → 0)
uniform vec3 uLampTint;
uniform float uMoon;
uniform sampler2D uNoise;
varying vec3 vWorld;

const float KERB = ${glsl(KERB)};  // bordure du trottoir, côté passager
const float KERB_STONE = ${glsl(KERB_STONE)};
const float BAY_LINE = ${glsl(BAY_LINE)};       // ligne de rive des places, côté chaussée
const float BAY_LENGTH = ${glsl(BAY_LENGTH)};   // une place : le véhicule au milieu de la sienne
const float CENTER_LINE = ${glsl(CENTER_LINE)}; // axe de la chaussée (tirets)
// Lanternes des lampadaires de l'esplanade (x, z).
const vec2 LAMPS[4] = vec2[4](${LAMP_GLSL});
const vec2 ROAD_LAMP = ${ROAD_LAMP_GLSL}; // lampadaire de l'autre trottoir (hors champ)
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

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vWorld.xz;
  // Au-delà du sol, la baie en contrebas : ordinateur, dès la bordure du trottoir ; téléphone, au garde-corps.
  if (p.x < uCut) discard;
  float mobile = step(0.5, uMobile);
  float aa = fwidth(p.x) + fwidth(p.y);
  // Matière : bitume (usure en grandes plages, reprises, granulat) à faible contraste, jamais une trame.
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);

  // Téléphone : la place marquée — ligne de rive continue, séparations des places (le véhicule au milieu de la
  // sienne), axe de la chaussée en tirets ; peinture blanche un peu usée.
  float onRoad = smoothstep(KERB - 0.01, KERB + 0.01, p.x);
  float rive = 1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - BAY_LINE));
  float between = abs(fract((p.y - BAY_LENGTH * 0.5) / BAY_LENGTH + 0.5) - 0.5) * BAY_LENGTH;
  float bays = (1.0 - smoothstep(0.06, 0.06 + aa, between)) * onRoad * (1.0 - smoothstep(BAY_LINE - 0.01, BAY_LINE + 0.01, p.x));
  float dash = (1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - CENTER_LINE))) * step(fract(p.y / 7.0), 0.45);
  float paint = max(max(rive, bays), dash) * mobile * mix(0.7, 1.0, grain(p, 0.9));
  albedo = mix(albedo, 0.42, paint);

  // La bordure du trottoir : une pierre claire.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  albedo = mix(albedo, 0.1 * mix(0.9, 1.1, grain(p, 0.4)) * mix(0.9, 1.1, aggregate), pavement);
  // Téléphone : au-delà, l'esplanade — dalles de 1,2 × 0,6 m en quinconce, aux joints longs tendus vers le
  // garde-corps et la baie (ils mènent le regard) ; chaque dalle un peu différente.
  float plaza = smoothstep(KERB - KERB_STONE + 0.01, KERB - KERB_STONE - 0.01, p.x) * mobile;
  vec2 slab = vec2((KERB - KERB_STONE - p.x) / 1.2, p.y / 0.6);
  slab.x += step(0.5, fract(slab.y * 0.5)) * 0.5;
  vec2 f = fract(slab);
  float jointGap = min(min(f.x, 1.0 - f.x) * 1.2, min(f.y, 1.0 - f.y) * 0.6);
  float joint = (1.0 - smoothstep(0.006, 0.012 + aa, jointGap)) * (1.0 - smoothstep(9.0, 24.0, length(vWorld - cameraPosition)));
  float tone = 0.085 * mix(0.85, 1.15, hash(floor(slab))) * mix(0.92, 1.08, grain(p, 0.3));
  albedo = mix(albedo, tone * (1.0 - 0.55 * joint), plaza);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;

  // Lumière : nuit (la chaussée non éclairée disparaît) ; lampadaires — de la promenade tous les 24 m
  // (ordinateur) ; de l'esplanade et de l'autre trottoir, allumés au premier geste, leur flaque s'élargissant
  // en chauffant (téléphone) — ; phares du mécanicien (ordinateur) ; clair de lune (téléphone).
  vec3 light = vec3(0.06, 0.068, 0.09) + vec3(0.035, 0.045, 0.07) * uMoon * mobile;
  float spread = 11.0 + 3.0 * min(uLamp, 1.0);
  for (int k = 0; k < 4; k++) {
    vec2 r = p - vec2(-2.7, 3.0 - float(k) * 24.0);
    vec2 s = p - LAMPS[k];
    light += mix(vec3(1.0, 0.8, 0.58) * 0.9 * exp(-dot(r, r) / 20.0), uLampTint * 1.25 * uLamp * uOut * exp(-dot(s, s) / spread), mobile);
  }
  vec2 o = p - ROAD_LAMP;
  light += uLampTint * 1.1 * uLamp * uOut * exp(-dot(o, o) / (spread + 4.0)) * mobile;
  vec2 side = PERP * 0.72;
  vec2 lamp = VAN - AIM * 9.0 * (1.0 - uArrival);
  light += vec3(0.85, 0.9, 1.0) * 1.7 * (beam(p, lamp + side) + beam(p, lamp - side)) * smoothstep(0.0, 0.35, uArrival) * uHeadlights * (1.0 - mobile);

  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  // (Ordinateur) au-delà du trottoir, la mer, noire ; au loin, la chaussée se fond dans la nuit.
  color *= 1.0 - smoothstep(-4.5, -6.5, p.x) * 0.85 * (1.0 - mobile);
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
      uCut: { value: -1000 },
      uMobile: { value: 0 },
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

/** Garde-corps et lampadaires : éclairés par la même nuit que le sol (lanternes, ciel, lueur de la baie). */
const PIECE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 world = modelMatrix * local;
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const PIECE_FRAGMENT = /* glsl */ `
uniform vec3 uInk;
uniform float uAlbedo;
uniform float uShine;
uniform float uLamp;
uniform float uOut;
uniform vec3 uLampTint;
varying vec3 vWorld;
varying vec3 vNormal;
const vec3 HEADS[4] = vec3[4](${LAMP_HEADS_GLSL});
void main() {
  vec3 n = normalize(vNormal);
  vec3 view = normalize(cameraPosition - vWorld);
  // Nuit : le ciel par le dessus, la lueur de la baie par l'arrière (côté mer, vers -x).
  vec3 light = vec3(0.06, 0.068, 0.09) * (0.55 + 0.45 * max(n.y, 0.0)) + vec3(0.07, 0.08, 0.1) * max(-n.x, 0.0);
  vec3 shine = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    vec3 d = HEADS[k] - vWorld;
    float fall = exp(-dot(d, d) / 26.0);
    vec3 l = normalize(d);
    light += uLampTint * 1.4 * fall * (0.3 + 0.7 * max(dot(n, l), 0.0)) * uLamp * uOut;
    shine += uLampTint * fall * pow(max(dot(reflect(-l, n), view), 0.0), 24.0) * uLamp * uOut;
  }
  vec3 color = uAlbedo * light + uShine * shine;
  color = mix(color, uInk, smoothstep(14.0, 42.0, length(vWorld - cameraPosition)));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

/** Cône de lumière d'une lanterne, dans l'air du soir : plus dense sous elle, bords fondus (additif). */
const CONE_FRAGMENT = /* glsl */ `
uniform float uLamp;
uniform float uOut;
uniform vec3 uLampTint;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float h = clamp(vWorld.y / ${glsl(LAMP_HEIGHT)}, 0.0, 1.0);
  float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  float a = 0.045 * h * h * facing * facing * uLamp * uOut;
  gl_FragColor = vec4(uLampTint * a, 1.0);
  #include <colorspace_fragment>
}`;

/** Halo d'une lanterne : dégradé radial, ajouté à la nuit. */
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.4)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Téléphone : le bord de la corniche — un muret de pierre surmonté d'un garde-corps (main courante, lisse basse,
 * barreaux tous les 12 cm, poteaux tous les 2,4 m) ; les lampadaires de l'esplanade (mât, crosse, lanterne
 * allumée et son halo). Aucune lumière de scène : les matières calculent la nuit du sol.
 */
function promenade(lamp: LampUniforms) {
  const group = new Group();
  const piece = (albedo: number, shine: number) =>
    new ShaderMaterial({
      uniforms: { ...lamp, uInk: { value: new Color(INK) }, uAlbedo: { value: albedo }, uShine: { value: shine } },
      vertexShader: PIECE_VERTEX,
      fragmentShader: PIECE_FRAGMENT,
    });
  const stone = piece(0.13, 0.04);
  const metal = piece(0.05, 0.8);
  const [z0, z1] = [-72, 32];
  const length = z1 - z0;
  const middle = (z0 + z1) / 2;

  const wall = new Mesh(new BoxGeometry(0.34, 0.4, length), stone);
  wall.position.set(EDGE, 0.2, middle);
  const rail = new Mesh(new BoxGeometry(0.07, 0.05, length), metal);
  rail.position.set(EDGE, 1.1, middle);
  const lower = new Mesh(new BoxGeometry(0.04, 0.035, length), metal);
  lower.position.set(EDGE, 0.52, middle);
  group.add(wall, rail, lower);

  const matrix = new Matrix4();
  const row = (width: number, height: number, step: number) => {
    const count = Math.floor(length / step);
    const mesh = new InstancedMesh(new BoxGeometry(width, height, width), metal, count);
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, matrix.makeTranslation(EDGE, 0.4 + height / 2, z0 + step * (i + 0.5)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  };
  group.add(row(0.018, 0.68, 0.12), row(0.06, 0.72, 2.4));

  const lens = new MeshBasicMaterial({ color: new Color(1, 0.86, 0.64).multiplyScalar(2.4) });
  const halo = new SpriteMaterial({
    map: glowTexture(),
    color: 0xffc58a,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.6,
  });
  const glows: Sprite[] = [];
  for (const z of LAMP_Z) {
    const x = LAMP_X + LAMP_REACH;
    const pole = new Mesh(new CylinderGeometry(0.045, 0.075, LAMP_HEIGHT, 14), metal);
    pole.position.set(LAMP_X, LAMP_HEIGHT / 2, z);
    const arm = new Mesh(new BoxGeometry(LAMP_REACH + 0.05, 0.05, 0.05), metal);
    arm.position.set(LAMP_X + LAMP_REACH / 2, LAMP_HEIGHT - 0.03, z);
    const head = new Mesh(new BoxGeometry(0.42, 0.13, 0.26), metal);
    head.position.set(x, LAMP_HEIGHT - 0.1, z);
    // La lanterne, tournée vers le sol.
    const glass = new Mesh(new PlaneGeometry(0.36, 0.2), lens);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, LAMP_HEIGHT - 0.17, z);
    const glow = new Sprite(halo);
    glow.scale.setScalar(2.4);
    glow.position.set(x, LAMP_HEIGHT - 0.25, z);
    glows.push(glow);
    group.add(pole, arm, head, glass, glow);
  }
  // Le cône de lumière de la lanterne voisine du véhicule.
  const coneHeight = LAMP_HEIGHT - 0.25;
  const cone = new Mesh(
    new ConeGeometry(1.9, coneHeight, 40, 1, true),
    new ShaderMaterial({
      uniforms: { ...lamp },
      vertexShader: PIECE_VERTEX,
      fragmentShader: CONE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    }),
  );
  cone.position.set(LAMP_X + LAMP_REACH, coneHeight / 2, LAMP_Z[0]);
  group.add(cone);

  const lensColor = lens.color.clone();
  /** Niveau des lanternes (0 : éteintes) : verre, halo et son ampleur. */
  const setLevel = (level: number) => {
    lens.color.copy(lensColor).multiplyScalar(Math.max(level, 0.02));
    halo.opacity = 0.6 * level;
    for (const glow of glows) glow.scale.setScalar(2.4 * (0.85 + 0.15 * Math.min(level, 1.2)));
  };
  return { group, setLevel };
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
