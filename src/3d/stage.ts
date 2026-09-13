import {
  AdditiveBlending,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
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
  LatheGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  NormalBlending,
  OrthographicCamera,
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
  SphereGeometry,
  SpotLight,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
  type MeshPhysicalMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createFollow } from '../motion/follow';
import { guided } from '../motion/guide';
import type { StageProgress } from '../motion/stage-progress';
import { BANDS, createBay, FIT_TALL, FIT_WIDE, type BayFit } from './bay';
import { guidedPace, paced, RIGS, type Framing, type Shot, type StopKey } from './rigs';
import { STUDIO_ENV_SIGMA, STUDIO_PANELS } from './studio';
import { vehicleById, type Exhaust, type Lamps, type Plate, type VehicleId } from './vehicles';

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
/**
 * Téléphone, intensités (unités physiques) : clair de lune, lampadaire d'en face (la lumière de face), lanterne de
 * l'esplanade — la vraie source de la scène : elle baigne le véhicule, porte sa flaque jusqu'à lui et y dessine son
 * ombre portée (castShadow).
 */
const MOON_LIGHT = 0.8;
const KEY_LIGHT = 85;
const LAMP_LIGHT = 140;
/**
 * Flaque d'une lanterne au sol (téléphone) : éclairement à son pied ; optique routière (répartition « en ailes ») —
 * il reste soutenu jusqu'à LAMP_SPREAD m, où se tient le véhicule, puis il tombe.
 */
const LAMP_POWER = 5.6;
const LAMP_SPREAD = 7.5;
const LAMP_FOOT = LAMP_HEIGHT - 0.17;
/**
 * Téléphone : d'où l'ombre portée du véhicule est projetée — la lanterne voisine (même côté, même hauteur), ramenée à
 * hauteur du milieu du véhicule. Vue de la chaussée, l'ombre de la lanterne exacte, derrière le véhicule, filerait
 * droit vers la caméra et se confondrait avec la nuit ; ainsi (lumière « trichée », comme au cinéma), elle se couche
 * à côté de lui, sur le sol éclairé, lisible — toujours à l'opposé de la lanterne.
 */
const SHADOW_FROM: [number, number, number] = [LAMP_X + LAMP_REACH, LAMP_FOOT, -0.5];
/** Emprise au sol de l'ombre portée (x0, z0, x1, z1 ; m) : du véhicule jusqu'où la lanterne la projette. */
const SHADE_AREA = [-1.5, -3.5, 5.5, 4.5] as const;
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

/** Niveau lu dans une table (secondes, niveau), par morceaux linéaires. */
function ignition(t: number, table: [number, number][] = IGNITION) {
  for (let i = 1; i < table.length; i++) {
    const [t1, v1] = table[i];
    if (t <= t1) {
      const [t0, v0] = table[i - 1];
      return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return table[table.length - 1][1];
}

/**
 * Phares xénon (téléphone) : ils s'amorcent dans l'allumage du lampadaire — un éclair bleuté, un creux, puis la
 * montée en température (s, niveau) ; leur teinte passe du bleu de l'amorçage au blanc froid.
 */
const XENON: [number, number][] = [
  [0, 0],
  [0.3, 0],
  [0.34, 1.7],
  [0.42, 0.3],
  [0.6, 0.75],
  [1.2, 1.05],
  [1.6, 1],
];
/** Faisceau des phares dans l'air (m) ; le banc et sa silhouette, sur l'esplanade (z). */
const BEAM_LENGTH = 7;
const BENCH_Z = -12;

/**
 * Téléphone, arrêt Échappement : les flammes des quatre sorties, une seule fois, à l'arrivée de la caméra — une
 * longue gerbe, puis des détonations qui s'espacent (début, durée, force ; secondes).
 */
const BURSTS: [number, number, number][] = [
  [0, 0.42, 1],
  [0.5, 0.2, 0.8],
  [0.78, 0.16, 0.55],
  [1.0, 0.12, 0.35],
];
const FLAME_S = 1.2;
/** Puis la traînée : fumée et gaz chauds qui dérivent en arrière et montent, dissipés en 2 à 3 s. */
const FLAME_END = FLAME_S + 2.8;
/** Lueur des flammes (unités physiques) : l'arrière du véhicule. */
const FLAME_LIGHT = 3;

function burst(t: number) {
  let power = 0;
  for (const [start, length, force] of BURSTS) {
    const x = t - start;
    if (x > 0 && x < length)
      power = Math.max(power, force * MathUtils.smoothstep(x, 0, 0.03) * (1 - MathUtils.smoothstep(x, length * 0.35, length)));
  }
  return power;
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
  // La lanterne voisine, sans portée limite (une vraie source) : c'est elle qui éclaire la scène.
  const lampLight = new PointLight(0xffc98a, 0, 0, 2);
  lampLight.position.set(LAMP_X + LAMP_REACH, LAMP_HEIGHT - 0.3, LAMP_Z[0]);
  corniche.group.add(moonLight, moonLight.target, keyLight, keyLight.target, lampLight);
  const spec = vehicleById(vehicle);
  // Arrêt Échappement : les flammes des quatre sorties, leur traînée et leur lueur.
  const flames = exhaustFlames(spec.exhaust);
  // Les phares xénon et les feux arrière, qui s'allument avec le lampadaire (optiques du modèle modifiées sur
  // téléphone seulement : l'ordinateur garde ses programmes).
  const lamps = headlamps(car, spec.lamps, spec.tail, narrow.matches);
  // Au pied du bouclier avant, la caisse à outils du mécanicien ; sur l'esplanade, un banc et sa silhouette.
  const kit = toolbox();
  kit.position.set(0.42, 0, spec.bumper + 0.3);
  kit.rotation.y = -0.35;
  kit.updateMatrixWorld(true);
  const bench = benchSitter();
  bench.position.set(EDGE + 0.95, 0, BENCH_Z);
  bench.rotation.y = 0.06;
  // Les plaques « MECA RIVIERA », à la police du site (chargée avant le dessin).
  const family = getComputedStyle(document.body).fontFamily;
  await Promise.race([document.fonts?.load(`800 122px ${family}`), new Promise((resolve) => setTimeout(resolve, 1200))]).catch(
    () => {},
  );
  const plates = licensePlates(spec.plates, plateTexture(family, Math.min(8, renderer.capabilities.getMaxAnisotropy())));
  // Tout ce qui n'existe que sur téléphone (dans la scène sur téléphone seulement, resize).
  const phoneSet = new Group().add(corniche.group, flames.group, flames.light, lamps.group, kit, contactShadow(kit), bench, plates);
  const roadUniforms = (road.material as ShaderMaterial).uniforms;
  roadUniforms.uFlameAt.value.copy(flames.at);
  roadUniforms.uHeadAt.value.set(spec.lamps.center[0], spec.lamps.face);
  roadUniforms.uTailAt.value.set(spec.tail.center[0], spec.tail.face);
  // L'ombre portée du véhicule sous la lanterne voisine : calculée une fois, à la première mise en page téléphone.
  const carBox = new Box3().setFromObject(car);
  let shadeReady = false;
  const bakeShade = () => {
    shadeReady = true;
    const [x0, z0, x1, z1] = SHADE_AREA;
    roadUniforms.uShade.value = castShadow(renderer, [car, kit], new Vector3(...SHADOW_FROM), SHADE_AREA);
    roadUniforms.uShadeArea.value.set(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0));
    roadUniforms.uCarBox.value.set(
      (carBox.min.x + carBox.max.x) / 2,
      (carBox.min.z + carBox.max.z) / 2,
      (carBox.max.x - carBox.min.x) / 2,
      (carBox.max.z - carBox.min.z) / 2,
    );
  };
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

  // Téléphone : le haut de la page appartient à la nuit. La lanterne s'allume dès que la page le quitte (au premier
  // geste) et s'éteint quand on y revient. lampT : secondes d'allumage (LIT : posé) ; lampFade : 1 allumée, 0
  // éteinte (extinction en fondu). Mouvement réduit : ni papillotement ni éclat, un fondu.
  let lampT = reduced.matches ? LIT : 0;
  let lampFade = 0;
  let lampOn = false;
  // Contrôle QA (lamp) : un état figé, que le défilement ne change plus.
  let lampFrozen = false;
  const headColor = new Color();
  const updateLamp = () => {
    if (!narrow.matches) return;
    const t = lampT;
    const on = lampFade * lampFade * (3 - 2 * lampFade);
    const level = (reduced.matches ? 1 : ignition(t)) * on;
    // La scène s'éclaire d'un seul tenant (aucun clignotement d'ensemble), avec un seul éclat sur la carrosserie
    // pendant que les reflets glissent ; la lanterne passe du blanc de l'amorçage à sa lumière chaude.
    const rise = MathUtils.smoothstep(t, 0.1, 0.9) * on;
    const flash = reduced.matches ? 0 : Math.exp(-(((t - 0.46) / 0.14) ** 2)) * on;
    const warm = MathUtils.smoothstep(t, 0.3, 1.1);
    const out = lampUniforms.uOut.value;
    lampUniforms.uLamp.value = level;
    lampUniforms.uLampTint.value.setRGB(1, 0.95 - 0.15 * warm, 0.88 - 0.3 * warm);
    keyLight.color.copy(lampUniforms.uLampTint.value);
    lampLight.color.copy(lampUniforms.uLampTint.value);
    keyLight.intensity = KEY_LIGHT * rise * (1 + 0.9 * flash) * out;
    lampLight.intensity = LAMP_LIGHT * level * (1 + 0.5 * flash) * out;
    // Les phares xénon s'amorcent dans le même temps (éclair bleuté, creux, montée, puis blanc froid), les feux arrière
    // avec eux ; la voiture reste ainsi éclairée jusqu'au bout de la présentation (extinction finale comprise).
    const head = (reduced.matches ? 1 : ignition(t, XENON)) * on;
    const rear = (reduced.matches ? 1 : MathUtils.smoothstep(t, 0.3, 0.42)) * on;
    const strike = reduced.matches ? 0 : 1 - MathUtils.smoothstep(t, 0.4, 1.3);
    lamps.set(head, headColor.setRGB(0.84 - 0.22 * strike, 0.92 - 0.2 * strike, 1.06 + 0.3 * strike), rear);
    roadUniforms.uHead.value = head;
    roadUniforms.uTail.value = rear;
    corniche.setLevel(level * out);
    scene.environmentIntensity = 0.2 + 0.8 * rise;
    scene.environmentRotation.y = -0.9 * (1 - Math.min(t / 1.4, 1) * on) ** 3;
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

  // Dimensions de la vue, relevées au redimensionnement (resize) : aucune lecture de mise en page par image.
  let vw = viewport.clientWidth;
  let vh = viewport.clientHeight;
  const offset = (target: PerspectiveCamera, amount: number) => {
    const w = vw;
    const h = vh;
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
    // Téléphone : pas de trait de rappel (la lumière bleue le remplace).
    if (narrow.matches) {
      if (callout.style.opacity !== '0') callout.style.opacity = '0';
      return;
    }
    const k = Math.round(p);
    const point = anchors[keys[k]] ?? shots[k]?.anchor;
    const origin = stops[k]?.querySelector<HTMLElement>('[data-callout-origin]');
    const strength = 1 - Math.min(Math.abs(p - k) / 0.2, 1);
    if (narrow.matches || !point || !origin || strength <= 0) {
      callout.style.opacity = '0';
      return;
    }
    anchor.set(...point).project(camera);
    const ax = ((anchor.x + 1) / 2) * vw;
    const ay = ((1 - anchor.y) / 2) * vh;
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
    const x = ((anchor.x + 1) / 2) * vw;
    const y = ((1 - anchor.y) / 2) * vh;
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
    vw = viewport.clientWidth;
    vh = viewport.clientHeight;
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
    renderer.setSize(vw, vh, false);
    lights.visible = !backdrop && !narrow.matches;
    // Le sol selon le format. Ordinateur : la route s'arrête au début du trottoir, après la pierre de bordure,
    // la baie au-delà. Téléphone : la place marquée, l'esplanade et son garde-corps, la baie au-delà.
    const ground = (road.material as ShaderMaterial).uniforms;
    ground.uMobile.value = narrow.matches ? 1 : 0;
    const roadMaterial = road.material as ShaderMaterial;
    if (roadMaterial.defines.PHONE !== Number(narrow.matches)) {
      roadMaterial.defines.PHONE = Number(narrow.matches);
      roadMaterial.needsUpdate = true;
    }
    ground.uCut.value = backdrop ? (narrow.matches ? EDGE - 0.05 : KERB - KERB_STONE) : -1000;
    if (narrow.matches) scene.add(phoneSet);
    else scene.remove(phoneSet);
    if (narrow.matches && !shadeReady) bakeShade();
    (lights.material as ShaderMaterial).uniforms.uPixelRatio.value = renderer.getPixelRatio();
    const aspect = vw / vh;
    camera.aspect = aspect;
    // Desktop : sous 16:10, la largeur de champ reste constante — le véhicule garde sa place à côté du texte.
    camera.fov = narrow.matches
      ? // Tablette en portrait : même largeur de champ que sur téléphone, le véhicule garde son ampleur.
        Math.max(26, aspect > 0.6 ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(19)) * 0.6) / aspect)) : 38)
      : aspect < 1.6
        ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(15)) * 1.6) / aspect))
        : 30;
    // Flammes : taille des particules (fumée, étincelles) à l'échelle de l'écran.
    flames.scale((renderer.getPixelRatio() * vh) / (2 * Math.tan(MathUtils.degToRad(camera.fov) / 2)));
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
  // Compilation des shaders sans bloquer le fil principal (KHR_parallel_shader_compile). Les flammes et les phares
  // (téléphone) sont compilés d'avance, puis masqués : aucun à-coup à leur première apparition.
  flames.group.visible = true;
  lamps.group.visible = true;
  await renderer.compileAsync(scene, camera);
  flames.group.visible = false;
  updateLamp();
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
  // Arrêt Échappement (téléphone) : les flammes, une seule fois, quand la caméra y arrive.
  const rearStop = keys.indexOf('rear');
  let flameStart = -1;
  let flameDone = reduced.matches || rearStop < 0;
  const setFlames = (t: number) => {
    const power = flames.update(t);
    roadUniforms.uFlame.value = power * 2.4;
    return power;
  };

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
    // Téléphone : la lanterne suit le haut de la page — allumage (papillotement, éclat) dès qu'on le quitte,
    // extinction en fondu quand on y revient.
    if (narrow.matches && !lampFrozen) {
      const wanted = window.scrollY > 2;
      if (wanted !== lampOn) {
        lampOn = wanted;
        if (lampOn && lampFade === 0) {
          lampT = reduced.matches ? LIT : 0;
          lampFade = reduced.matches ? 0 : 1;
        }
      }
      if (lampOn ? lampT < LIT || lampFade < 1 : lampFade > 0) {
        if (lampOn) {
          lampT = Math.min(lampT + dt, LIT);
          lampFade = Math.min(lampFade + dt / 0.3, 1);
        } else {
          lampFade = Math.max(lampFade - dt / 0.5, 0);
          if (lampFade === 0) lampT = reduced.matches ? LIT : 0;
        }
        updateLamp();
        changed = true;
      }
    }
    // Arrêt Échappement (téléphone) : les flammes, une fois, dès que la caméra s'y pose (le scroll y est arrêté).
    if (narrow.matches && !flameDone) {
      if (flameStart < 0 && Math.abs(target - rearStop) < 0.2 && Math.abs(current - rearStop) < 0.12) flameStart = now;
      if (flameStart >= 0) {
        const t = (now - flameStart) / 1000;
        setFlames(Math.min(t, FLAME_END));
        flameDone = t >= FLAME_END;
        changed = true;
      }
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

    // Téléphone : la fluidité d'abord — un cran de définition en moins dès que les images passent sous ~45 i/s.
    if (dt > (narrow.matches ? 1 / 45 : 1 / 24)) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > (narrow.matches ? 12 : 8) && dprLevel < dprSteps.length - 1) {
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
          // Téléphone : la lanterne posée selon la page — éteinte en haut (et avec `arrival: 0`, l'affiche),
          // allumée ailleurs.
          lampFrozen = false;
          lampOn = options.arrival !== 0 && window.scrollY > 2;
          lampFade = lampOn ? 1 : 0;
          lampT = lampOn || reduced.matches ? LIT : 0;
          applyIntro(options.arrival ?? 1);
          render();
          canvas.classList.add('is-ready');
          return Number(current.toFixed(3));
        },
        // Allumage (téléphone), image par image : l'état `t` secondes après le premier geste, figé.
        lamp(t: number) {
          lampFrozen = true;
          lampOn = true;
          lampFade = 1;
          lampT = t;
          updateLamp();
          render();
          return Number(lampUniforms.uLamp.value.toFixed(2));
        },
        // Flammes de l'arrêt Échappement (téléphone), image par image : l'état `t` secondes après leur départ.
        flame(t: number) {
          flameDone = true;
          const power = setFlames(t);
          render();
          return Number(power.toFixed(2));
        },
        // Position à l'écran (px) de points de la scène : calage du décor.
        project(points: [number, number, number][]) {
          return points.map((point) => {
            anchor.set(...point).project(camera);
            return [Math.round(((anchor.x + 1) / 2) * vw), Math.round(((1 - anchor.y) / 2) * vh)];
          });
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
uniform float uLamp;   // téléphone : niveau des lampadaires (allumés hors du haut de la page)
uniform float uOut;    // extinction finale (1 → 0)
uniform vec3 uLampTint;
uniform float uMoon;
uniform sampler2D uShade; // téléphone : ombre portée du véhicule par la lanterne voisine (R nette, G adoucie)
uniform vec4 uShadeArea;  // son emprise au sol : x0, z0, 1 / largeur, 1 / profondeur
uniform vec4 uCarBox;     // emprise du véhicule : centre (x, z), demi-côtés
uniform float uFlame;     // téléphone : lueur des flammes d'échappement
uniform vec2 uFlameAt;
uniform float uHead;      // téléphone : phares du véhicule (xénon)
uniform vec2 uHeadAt;     // optique droite : x, face avant (z)
uniform float uTail;      // téléphone : feux arrière
uniform vec2 uTailAt;     // feu droit : x, face arrière (z)
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
// Téléphone : flaque d'une lanterne — éclairement à son pied, hauteur de la source et portée (au carré).
const float LAMP_POWER = ${glsl(LAMP_POWER)};
const float LAMP_FOOT2 = ${glsl(LAMP_FOOT * LAMP_FOOT)};
const float LAMP_SPREAD2 = ${glsl(LAMP_SPREAD * LAMP_SPREAD)};

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

// Ordinateur : bitume, bordure et trottoir ; lampadaires de la promenade tous les 24 m ; phares du mécanicien ;
// au-delà du trottoir, la mer, noire.
vec3 desk(vec2 p) {
  // Matière : bitume (usure en grandes plages, reprises, granulat) à faible contraste, jamais une trame.
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  // La bordure du trottoir : une pierre claire.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  albedo = mix(albedo, 0.1 * mix(0.9, 1.1, grain(p, 0.4)) * mix(0.9, 1.1, aggregate), pavement);
  // Caniveau plus sombre au pied de la bordure ; arête de la bordure qui accroche la lumière.
  albedo *= 1.0 - 0.3 * smoothstep(KERB + 0.35, KERB + 0.05, p.x) * (1.0 - pavement);
  float edge = (1.0 - smoothstep(0.0, 0.03 + length(fwidth(p)), abs(p.x - KERB))) * 0.5;
  // Lumière : nuit (la chaussée non éclairée disparaît), lampadaires de la promenade, phares du mécanicien.
  vec3 light = vec3(0.06, 0.068, 0.09);
  for (int k = 0; k < 4; k++) {
    vec2 r = p - vec2(-2.7, 3.0 - float(k) * 24.0);
    light += vec3(1.0, 0.8, 0.58) * 0.9 * exp(-dot(r, r) / 20.0);
  }
  vec2 side = PERP * 0.72;
  vec2 lamp = VAN - AIM * 9.0 * (1.0 - uArrival);
  light += vec3(0.85, 0.9, 1.0) * 1.7 * (beam(p, lamp + side) + beam(p, lamp - side)) * smoothstep(0.0, 0.35, uArrival) * uHeadlights;
  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  return color * (1.0 - smoothstep(-4.5, -6.5, p.x) * 0.85);
}

// Téléphone seulement (PHONE : programme propre au format, celui de l'ordinateur n'en contient rien).
#if PHONE
// Faisceau de croisement d'un phare du véhicule sur le sol : il touche la chaussée à quelques mètres, s'élargit,
// s'éteint au loin.
float lowBeam(vec2 p, vec2 lamp) {
  vec2 v = p - lamp;
  return smoothstep(0.4, 3.0, v.y) * exp(-pow(v.x / max(0.22 + v.y * 0.21, 0.05), 2.0)) / (1.0 + pow(v.y / 9.0, 2.0));
}

// Téléphone : la place marquée, la bordure, l'esplanade ; la nuit de pleine lune ; les lanternes, vraies sources
// (optique routière : la flaque porte jusqu'au véhicule, un surcroît à leur pied), la voisine y dessinant son ombre
// portée ; le lampadaire d'en face, discret ; la lueur des flammes d'échappement.
vec3 phone(vec2 p) {
  float aa = fwidth(p.x) + fwidth(p.y);
  float wear = grain(p, 0.0026) * 0.6 + grain(p, 0.013) * 0.4;
  float aggregate = grain(p, 0.26) * 0.6 + grain(p, 0.65) * 0.4;
  float albedo = 0.035 * mix(0.75, 1.25, wear) * mix(0.82, 1.18, aggregate);
  // Marquage : ligne de rive continue, séparations des places (le véhicule au milieu de la sienne), axe de la
  // chaussée en tirets — peinture routière neuve, d'un blanc franc.
  float onRoad = smoothstep(KERB - 0.01, KERB + 0.01, p.x);
  float rive = 1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - BAY_LINE));
  float between = abs(fract((p.y - BAY_LENGTH * 0.5) / BAY_LENGTH + 0.5) - 0.5) * BAY_LENGTH;
  float bays = (1.0 - smoothstep(0.06, 0.06 + aa, between)) * onRoad * (1.0 - smoothstep(BAY_LINE - 0.01, BAY_LINE + 0.01, p.x));
  float dash = (1.0 - smoothstep(0.06, 0.06 + aa, abs(p.x - CENTER_LINE))) * step(fract(p.y / 7.0), 0.45);
  float paint = max(max(rive, bays), dash) * mix(0.92, 1.0, grain(p, 0.9));
  albedo = mix(albedo, 0.82, paint);
  // La bordure du trottoir : une pierre claire.
  float pavement = smoothstep(KERB + 0.02, KERB - 0.02, p.x);
  albedo = mix(albedo, 0.1 * mix(0.9, 1.1, grain(p, 0.4)) * mix(0.9, 1.1, aggregate), pavement);
  // Au-delà, l'esplanade — dalles de 1,2 × 0,6 m en quinconce, aux joints longs tendus vers le garde-corps et la
  // baie (ils mènent le regard) ; chaque dalle un peu différente.
  float plaza = smoothstep(KERB - KERB_STONE + 0.01, KERB - KERB_STONE - 0.01, p.x);
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

  // Ombre portée du véhicule par la lanterne voisine : nette au contact, adoucie en s'en éloignant (pénombre).
  vec2 shadow = texture2D(uShade, clamp((p - uShadeArea.xy) * uShadeArea.zw, 0.0, 1.0)).rg;
  float shade = mix(shadow.r, shadow.g, smoothstep(0.0, 2.0, length(max(abs(p - uCarBox.xy) - uCarBox.zw, 0.0))));
  vec3 light = vec3(0.06, 0.068, 0.09) + vec3(0.035, 0.045, 0.07) * uMoon;
  float lamp = uLamp * uOut;
  for (int k = 0; k < 4; k++) {
    vec2 s = p - LAMPS[k];
    float r2 = dot(s, s);
    float fall = LAMP_FOOT2 / (r2 + LAMP_FOOT2);
    float wide = r2 / LAMP_SPREAD2;
    float pool = 0.4 * fall * sqrt(fall) + 0.6 / (1.0 + wide * wide);
    // Dans l'ombre, un peu de lumière renvoyée par l'alentour éclairé : jamais un noir plein.
    light += uLampTint * LAMP_POWER * lamp * pool * (k == 0 ? 1.0 - 0.9 * shade : 1.0);
  }
  vec2 o = p - ROAD_LAMP;
  light += uLampTint * 0.6 * lamp * exp(-dot(o, o) / 18.0);
  vec2 q = (p - uFlameAt) * vec2(0.9, 1.6);
  light += vec3(1.0, 0.42, 0.12) * uFlame * exp(-dot(q, q) / 0.35);
  light += vec3(0.8, 0.9, 1.1) * uHead * 2.4 * (lowBeam(p, uHeadAt) + lowBeam(p, vec2(-uHeadAt.x, uHeadAt.y)));
  // Feux arrière : un reflet rouge sur la chaussée, juste derrière le véhicule.
  vec2 t1 = (p - uTailAt) * vec2(1.3, 0.9);
  vec2 t2 = (p - vec2(-uTailAt.x, uTailAt.y)) * vec2(1.3, 0.9);
  light += vec3(1.0, 0.07, 0.04) * uTail * 0.45 * (exp(-dot(t1, t1) / 0.45) + exp(-dot(t2, t2) / 0.45)) * step(p.y, uTailAt.y);
  vec3 color = albedo * light * (1.0 + 2.5 * edge);
  // La peinture routière (billes de verre) renvoie la moindre lumière : les lignes restent blanches dans la nuit.
  color += paint * vec3(0.05, 0.052, 0.056);
  // Au pied des lanternes, les hautes lumières s'adoucissent au lieu d'être écrêtées.
  vec3 over = max(color - 0.7, 0.0);
  return min(color, 0.7) + 0.3 * (1.0 - exp(-over / 0.3));
}
#endif

void main() {
  vec2 p = vWorld.xz;
  // Au-delà du sol, la baie en contrebas : ordinateur, dès la bordure du trottoir ; téléphone, au garde-corps.
  if (p.x < uCut) discard;
  #if PHONE
  vec3 color = phone(p);
  #else
  vec3 color = desk(p);
  #endif
  // Au loin, le sol se fond dans la nuit.
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
    // Programme du format : 1 sur téléphone (resize).
    defines: { PHONE: 0 },
    uniforms: {
      uInk: { value: new Color(INK) },
      uArrival: { value: 1 },
      uHeadlights: { value: 1 },
      uCut: { value: -1000 },
      uMobile: { value: 0 },
      // Téléphone : ombre portée (castShadow ; aucune ombre en attendant), lueur des flammes.
      uShade: { value: Object.assign(new DataTexture(new Uint8Array(4), 1, 1), { needsUpdate: true }) },
      uShadeArea: { value: new Vector4(0, 0, 1, 1) },
      uCarBox: { value: new Vector4(0, 0, 1, 1) },
      uFlame: { value: 0 },
      uFlameAt: { value: new Vector2() },
      uHead: { value: 0 },
      uHeadAt: { value: new Vector2() },
      uTail: { value: 0 },
      uTailAt: { value: new Vector2() },
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
    float fall = exp(-dot(d, d) / 34.0);
    vec3 l = normalize(d);
    light += uLampTint * 2.6 * fall * (0.3 + 0.7 * max(dot(n, l), 0.0)) * uLamp * uOut;
    shine += uLampTint * 1.6 * fall * pow(max(dot(reflect(-l, n), view), 0.0), 24.0) * uLamp * uOut;
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
  float a = 0.085 * h * h * facing * facing * uLamp * uOut;
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

  const lens = new MeshBasicMaterial({ color: new Color(1, 0.86, 0.64).multiplyScalar(3.2) });
  const halo = new SpriteMaterial({
    map: glowTexture(),
    color: 0xffc58a,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85,
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
    glow.scale.setScalar(2.8);
    glow.position.set(x, LAMP_HEIGHT - 0.25, z);
    glows.push(glow);
    group.add(pole, arm, head, glass, glow);
  }
  // Le cône de lumière de la lanterne voisine du véhicule.
  const coneHeight = LAMP_HEIGHT - 0.25;
  const cone = new Mesh(
    new ConeGeometry(2.3, coneHeight, 40, 1, true),
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
    halo.opacity = 0.85 * level;
    for (const glow of glows) glow.scale.setScalar(2.8 * (0.85 + 0.15 * Math.min(level, 1.2)));
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

/** Pièces lumineuses des modèles (optiques avant et arrière mêlées : le volume de chaque feu les départage). */
const HEADLAMP = /lbucket|lglass|lighta_material|red_glass/i;

/** Faisceau des phares dans l'air du soir : dense à l'optique, fondu vers l'avant (additif). */
const BEAM_VERTEX = /* glsl */ `
uniform float uLength;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
void main() {
  vAlong = 0.5 - position.y / uLength;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const BEAM_FRAGMENT = /* glsl */ `
uniform float uHead;
uniform vec3 uHeadColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vAlong;
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  float a = 0.012 * uHead * facing * facing * (1.0 - vAlong) * (1.0 - vAlong) * smoothstep(0.0, 0.05, vAlong);
  gl_FragColor = vec4(uHeadColor * a, 1.0);
  #include <colorspace_fragment>
}`;

/** Traînée horizontale d'un éclat (reflet d'optique) : dégradé étiré, fondu en hauteur. */
function streakTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const across = g.createLinearGradient(0, 0, 256, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = across;
  g.fillRect(0, 0, 256, 32);
  g.globalCompositeOperation = 'destination-in';
  const high = g.createLinearGradient(0, 0, 0, 32);
  high.addColorStop(0, 'rgba(0,0,0,0)');
  high.addColorStop(0.5, 'rgba(0,0,0,1)');
  high.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = high;
  g.fillRect(0, 0, 256, 32);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Téléphone : les feux du véhicule — phares xénon (les optiques avant s'allument : émission ajoutée aux pièces
 * lumineuses du modèle, dans le volume des phares seulement ; un éclat et sa traînée à chaque optique, le faisceau dans
 * l'air ; au sol, le faisceau de croisement, STREET_FRAGMENT) et feux arrière d'un rouge franc (même principe, halo
 * rouge, reflet sur la chaussée). `patch` : optiques modifiées (téléphone au chargement) ; sinon, les programmes de
 * l'ordinateur restent intacts.
 */
function headlamps(model: Object3D, lamps: Lamps, tail: Lamps, patch: boolean) {
  const uHead = { value: 0 };
  const uHeadColor = { value: new Color(0.84, 0.92, 1.06) };
  const uTail = { value: 0 };
  const v = (n: number) => n.toFixed(3);
  const [cx, cy, cz] = lamps.center;
  const [hx, hy, hz] = lamps.half;
  const [tx, ty, tz] = tail.center;
  const [sx, sy, sz] = tail.half;
  if (patch)
    model.traverse((node) => {
      const mesh = node as Mesh;
      const material = mesh.material as MeshStandardMaterial;
      if (!mesh.isMesh || !HEADLAMP.test(material.name)) return;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uHead = uHead;
        shader.uniforms.uHeadColor = uHeadColor;
        shader.uniforms.uTail = uTail;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vLampWorld;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n\tvLampWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uHead;\nuniform vec3 uHeadColor;\nuniform float uTail;\nvarying vec3 vLampWorld;')
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            vec3 lampBox = abs(vec3(abs(vLampWorld.x), vLampWorld.yz) - vec3(${v(cx)}, ${v(cy)}, ${v(cz)})) - vec3(${v(hx)}, ${v(hy)}, ${v(hz)});
            float inLamp = 1.0 - smoothstep(-0.01, 0.02, max(max(lampBox.x, lampBox.y), lampBox.z));
            vec3 tailBox = abs(vec3(abs(vLampWorld.x), vLampWorld.yz) - vec3(${v(tx)}, ${v(ty)}, ${v(tz)})) - vec3(${v(sx)}, ${v(sy)}, ${v(sz)});
            float inTail = 1.0 - smoothstep(-0.01, 0.02, max(max(tailBox.x, tailBox.y), tailBox.z));
            // Vitres teintées (transparentes) : leur émission compensée de leur opacité.
            float lit = (0.3 + 0.7 * dot(diffuseColor.rgb, vec3(0.3333))) / max(diffuseColor.a, 0.25);
            totalEmissiveRadiance += (uHeadColor * uHead * inLamp + vec3(1.0, 0.035, 0.02) * uTail * inTail) * lit;`,
          );
      };
    });
  const group = new Group();
  group.visible = false;
  const glow = new SpriteMaterial({
    map: glowTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  const streak = new SpriteMaterial({
    map: streakTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  const air = new ShaderMaterial({
    uniforms: { uHead, uHeadColor, uLength: { value: BEAM_LENGTH } },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const cone = new ConeGeometry(1.5, BEAM_LENGTH, 32, 1, true);
  const flares: Sprite[] = [];
  for (const x of [-cx, cx]) {
    const flare = new Sprite(glow);
    flare.position.set(x, cy, lamps.face + 0.03);
    const trail = new Sprite(streak);
    trail.position.copy(flare.position);
    trail.scale.set(2.4, 0.1, 1);
    // Le faisceau : sommet à l'optique, ouvert vers l'avant, un rien vers le sol.
    const shaft = new Mesh(cone, air);
    shaft.rotation.x = -Math.PI / 2 + 0.05;
    shaft.position.set(x, cy - Math.sin(0.05) * (BEAM_LENGTH / 2), lamps.face + Math.cos(0.05) * (BEAM_LENGTH / 2));
    flares.push(flare);
    group.add(flare, trail, shaft);
  }
  // Feux arrière : un halo rouge sur chaque optique.
  const red = new SpriteMaterial({
    map: glowTexture(),
    color: 0xff2a1a,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  for (const x of [-tx, tx]) {
    const halo = new Sprite(red);
    halo.position.set(x, ty, tail.face - 0.03);
    halo.scale.setScalar(0.5);
    group.add(halo);
  }
  /** Phares (0 : éteints ; l'amorçage dépasse 1) et leur teinte ; feux arrière (0 à 1). */
  const set = (level: number, color: Color, rear: number) => {
    uHead.value = level * 3;
    uTail.value = rear * 2.2;
    uHeadColor.value.copy(color);
    glow.color.copy(color);
    streak.color.copy(color).multiplyScalar(0.8);
    glow.opacity = Math.min(level, 1);
    streak.opacity = Math.min(level, 1) * 0.5;
    red.opacity = rear * 0.7;
    for (const flare of flares) flare.scale.setScalar(0.75 + 0.3 * Math.min(level, 1.7));
    group.visible = level > 0.002 || rear > 0.002;
  };
  return { group, set };
}

/**
 * Plaque d'immatriculation au format européen (520 × 110 mm) : « MECA RIVIERA » en noir sur blanc ; à gauche la bande
 * de l'Europe (étoiles, F), à droite le signe de la marque (Mark.astro) et le département, 06.
 */
function plateTexture(family: string, anisotropy: number) {
  const W = 1040;
  const H = 220;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  const rounded = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  g.fillStyle = '#15161a';
  rounded(0, 0, W, H, 22);
  g.fill();
  g.save();
  rounded(8, 8, W - 16, H - 16, 15);
  g.clip();
  g.fillStyle = '#f2f3f0';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#0c3aa6';
  g.fillRect(0, 0, 100, H);
  g.fillRect(W - 100, 0, 100, H);
  g.restore();
  // L'Europe : douze étoiles en couronne, la lettre du pays.
  g.fillStyle = '#ffd100';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sx = 54 + Math.cos(a) * 27;
    const sy = 74 + Math.sin(a) * 27;
    g.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 2.6 : 6.2;
      const b = -Math.PI / 2 + (k * Math.PI) / 5;
      g.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
    }
    g.fill();
  }
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.font = `700 62px ${family}`;
  g.fillText('F', 54, 184);
  // Le signe de la marque (deux traits obliques : bleu, blanc) et le département.
  g.save();
  g.translate(W - 50 - 16 * 2.3, 74 - 16 * 2.3);
  g.scale(2.3, 2.3);
  g.fillStyle = '#8fb1ff';
  g.fill(new Path2D('M12.5 6h8L15 26H7z'));
  g.fillStyle = '#ffffff';
  g.fill(new Path2D('M22.5 6h3.5l-5.5 20H17z'));
  g.restore();
  g.font = `800 56px ${family}`;
  g.fillText('06', W - 50, 186);
  // L'immatriculation : le nom, en capitales serrées.
  g.fillStyle = '#121214';
  g.font = `800 122px ${family}`;
  const text = 'MECA RIVIERA';
  const room = W - 200 - 56;
  const width = g.measureText(text).width;
  g.save();
  g.translate(W / 2, 156);
  g.scale(Math.min(1, room / width), 1);
  g.fillText(text, 0, 0);
  g.restore();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Téléphone : les deux plaques, posées sur la caisse — support noir, plaque devant, inclinés comme elle. */
function licensePlates(plates: { front: Plate; rear: Plate }, map: Texture) {
  const group = new Group();
  const face = new MeshStandardMaterial({ map, roughness: 0.38, metalness: 0 });
  const holder = new MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6, metalness: 0.1 });
  const plate = new PlaneGeometry(0.5, 0.106);
  const frame = new PlaneGeometry(0.516, 0.12);
  for (const [{ at, slope }, rear] of [
    [plates.front, false],
    [plates.rear, true],
  ] as const) {
    const mount = new Group();
    mount.position.set(...at);
    mount.rotation.set(Math.atan(slope), rear ? Math.PI : 0, 0);
    const front = new Mesh(plate, face);
    front.position.z = 0.002;
    mount.add(new Mesh(frame, holder), front);
    group.add(mount);
  }
  return group;
}

/**
 * Téléphone : la caisse à outils du mécanicien, au pied du bouclier — acier peint rouge, couvercle et charnière,
 * poignée et fermoirs chromés ; une clé mixte posée devant. Éclairée par la scène (lanterne, lampadaire, ciel).
 */
function toolbox() {
  const group = new Group();
  const paint = new MeshStandardMaterial({ color: 0x9a1712, metalness: 0.35, roughness: 0.4 });
  const chrome = new MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.22 });
  const seam = new MeshStandardMaterial({ color: 0x121214, metalness: 0.2, roughness: 0.6 });
  const add = (mesh: Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  add(new Mesh(new RoundedBoxGeometry(0.52, 0.17, 0.22, 3, 0.012), paint), 0, 0.085, 0);
  add(new Mesh(new RoundedBoxGeometry(0.53, 0.055, 0.23, 3, 0.016), paint), 0, 0.2, 0);
  add(new Mesh(new BoxGeometry(0.524, 0.006, 0.224), seam), 0, 0.171, 0);
  add(new Mesh(new CylinderGeometry(0.011, 0.011, 0.3, 14), chrome), 0, 0.272, 0).rotation.z = Math.PI / 2;
  for (const x of [-0.14, 0.14]) {
    add(new Mesh(new BoxGeometry(0.02, 0.05, 0.02), chrome), x, 0.25, 0);
    add(new Mesh(new BoxGeometry(0.036, 0.05, 0.012), chrome), x * 1.25, 0.168, 0.116);
  }
  // Clé mixte : manche plat, œil et fourche en anneaux.
  const wrench = new Group();
  const ring = new TorusGeometry(0.016, 0.0055, 8, 20);
  for (const x of [-0.11, 0.11]) {
    const eye = new Mesh(ring, chrome);
    eye.rotation.x = Math.PI / 2;
    eye.position.x = x;
    wrench.add(eye);
  }
  wrench.add(new Mesh(new BoxGeometry(0.2, 0.006, 0.02), chrome));
  wrench.position.set(0.1, 0.006, 0.26);
  wrench.rotation.y = 0.5;
  group.add(wrench);
  return group;
}

/**
 * Téléphone : un banc de promenade face à la baie et, dessus, une silhouette de dos, dans l'ombre — capuche relevée,
 * penchée en avant, les avant-bras sur les cuisses. Matières presque noires : elle se découpe sur les lumières de la
 * côte. Repère local : le banc regarde vers -x (la mer).
 */
function benchSitter() {
  const group = new Group();
  const iron = new MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.6, roughness: 0.5 });
  const wood = new MeshStandardMaterial({ color: 0x21170f, roughness: 0.85 });
  const cloth = new MeshStandardMaterial({ color: 0x08090b, roughness: 0.95 });
  const place = (mesh: Mesh, x: number, y: number, z: number, rz = 0, parent: Group = group) => {
    mesh.position.set(x, y, z);
    mesh.rotation.z = rz;
    parent.add(mesh);
    return mesh;
  };
  // Le banc (1,8 m) : quatre lattes d'assise, trois de dossier incliné, deux flancs de fonte.
  const seat = new BoxGeometry(0.085, 0.03, 1.8);
  for (let i = 0; i < 4; i++) place(new Mesh(seat, wood), -0.16 + i * 0.1, 0.45, 0);
  const back = new BoxGeometry(0.03, 0.085, 1.8);
  for (let i = 0; i < 3; i++) place(new Mesh(back, wood), 0.24 + i * 0.025, 0.57 + i * 0.115, 0, 0.2);
  for (const z of [-0.8, 0.8]) {
    place(new Mesh(new BoxGeometry(0.04, 0.45, 0.05), iron), -0.18, 0.225, z);
    place(new Mesh(new BoxGeometry(0.04, 0.9, 0.05), iron), 0.22, 0.44, z, 0.14);
    place(new Mesh(new BoxGeometry(0.44, 0.04, 0.05), iron), 0.02, 0.42, z);
  }
  // La silhouette, assise sur la moitié droite du banc.
  const person = new Group();
  const body = (geometry: BufferGeometry, x: number, y: number, z: number, rz = 0) => place(new Mesh(geometry, cloth), x, y, z, rz, person);
  // Buste (profondeur : 0,62 de la largeur), penché vers la mer.
  const torso = new LatheGeometry(
    [
      [0.001, 0],
      [0.15, 0.01],
      [0.16, 0.12],
      [0.18, 0.28],
      [0.2, 0.4],
      [0.19, 0.47],
      [0.13, 0.53],
      [0.06, 0.56],
      [0.001, 0.57],
    ].map(([r, h]) => new Vector2(r, h)),
    24,
  );
  torso.scale(0.62, 1, 1);
  body(torso, 0.06, 0.47, 0, 0.14);
  const shoulders = new CapsuleGeometry(0.065, 0.26, 6, 12);
  shoulders.rotateX(Math.PI / 2);
  body(shoulders, 0, 0.93, 0);
  const head = new SphereGeometry(0.1, 20, 16);
  head.scale(0.95, 1.12, 0.9);
  body(head, -0.03, 1.13, 0);
  const hood = new SphereGeometry(0.118, 20, 16);
  hood.scale(1, 1.05, 1.02);
  body(hood, 0.02, 1.14, 0);
  // Bras vers les genoux, avant-bras sur les cuisses, jambes et pieds.
  const upper = new CapsuleGeometry(0.05, 0.22, 6, 10);
  const fore = new CapsuleGeometry(0.045, 0.22, 6, 10);
  const thigh = new CapsuleGeometry(0.07, 0.3, 6, 10);
  const shin = new CapsuleGeometry(0.055, 0.34, 6, 10);
  const foot = new BoxGeometry(0.24, 0.07, 0.09);
  for (const side of [-1, 1]) {
    body(upper, -0.06, 0.8, side * 0.2, -0.45);
    body(fore, -0.24, 0.64, side * 0.16, -1.25);
    body(thigh, -0.16, 0.54, side * 0.1, Math.PI / 2);
    body(shin, -0.4, 0.29, side * 0.1, -0.09);
    body(foot, -0.47, 0.035, side * 0.1);
  }
  person.position.z = 0.35;
  group.add(person);
  return group;
}

/**
 * Téléphone : l'ombre portée du véhicule par une lanterne, au sol. La silhouette est projetée depuis la lanterne sur
 * le plan du sol (exacte : source ponctuelle, sol plat ; les vitres laissent passer la lumière), puis adoucie deux
 * fois — pénombre de contact (R) et pénombre lointaine (G), que le sol mêle selon la distance au véhicule.
 * Calculée une fois (véhicule et lanterne immobiles) : le sol la lit en une texture, aucune ombre en temps réel.
 */
function castShadow(renderer: WebGLRenderer, models: Object3D[], light: Vector3, area: readonly number[]) {
  const [x0, z0, x1, z1] = area;
  const width = 480;
  const height = Math.round((width * (z1 - z0)) / (x1 - x0));
  const target = () => new WebGLRenderTarget(width, height, { depthBuffer: false });
  const [silhouette, across, result] = [target(), target(), target()];
  const flat = new OrthographicCamera();
  const projected = new ShaderMaterial({
    uniforms: { uLight: { value: light }, uArea: { value: new Vector4(x0, z0, 1 / (x1 - x0), 1 / (z1 - z0)) } },
    vertexShader: /* glsl */ `
      uniform vec3 uLight;
      uniform vec4 uArea;
      void main() {
        vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
        vec2 g = uLight.xz + (w.xz - uLight.xz) * uLight.y / max(uLight.y - w.y, 0.05);
        gl_Position = vec4((g - uArea.xy) * uArea.zw * 2.0 - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      void main() {
        gl_FragColor = vec4(1.0);
      }`,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const caster = new Scene();
  for (const model of models) model.updateMatrixWorld(true);
  for (const model of models)
    model.traverse((node) => {
    const mesh = node as Mesh;
    const material = mesh.material as MeshStandardMaterial;
    if (!mesh.isMesh || !mesh.visible || (material.transparent && material.opacity < 0.9)) return;
    const proxy = new Mesh(mesh.geometry, projected);
    proxy.matrixAutoUpdate = false;
    proxy.matrix.copy(mesh.matrixWorld);
    proxy.frustumCulled = false;
    caster.add(proxy);
  });
  const blur = new ShaderMaterial({
    uniforms: { uMap: { value: null }, uStep: { value: new Vector2() } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec2 uStep;
      varying vec2 vUv;
      void main() {
        // Gaussienne à 13 prises : R serrée (pénombre de contact), G large (pénombre lointaine).
        vec2 sum = vec2(0.0);
        float total = 0.0;
        for (int i = -6; i <= 6; i++) {
          float w = exp(-float(i * i) / 18.0);
          sum += w * vec2(texture2D(uMap, vUv + uStep * float(i) * 0.5).r, texture2D(uMap, vUv + uStep * float(i) * 2.0).g);
          total += w;
        }
        gl_FragColor = vec4(sum / total, 0.0, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), blur);
  quad.frustumCulled = false;
  const pass = new Scene().add(quad);

  const previous = renderer.getRenderTarget();
  const clearColor = renderer.getClearColor(new Color());
  const clearAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(silhouette);
  renderer.render(caster, flat);
  blur.uniforms.uMap.value = silhouette.texture;
  blur.uniforms.uStep.value.set(1 / width, 0);
  renderer.setRenderTarget(across);
  renderer.render(pass, flat);
  blur.uniforms.uMap.value = across.texture;
  blur.uniforms.uStep.value.set(0, 1 / height);
  renderer.setRenderTarget(result);
  renderer.render(pass, flat);
  renderer.setRenderTarget(previous);
  renderer.setClearColor(clearColor, clearAlpha);
  silhouette.dispose();
  across.dispose();
  projected.dispose();
  blur.dispose();
  quad.geometry.dispose();
  return result.texture;
}

/** Bruit de valeur lissé, partagé par les flammes et leur fumée. */
const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

/**
 * Une flamme : la gerbe (lathe unitaire) mise à la section de l'embout et à sa longueur, qui ondule vers la pointe ;
 * deux couches — l'enveloppe, et un cœur plus étroit et plus court (uCore).
 */
const FLAME_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uLength;
uniform vec2 uTip;
uniform float uSeed;
uniform float uCore;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  float s = position.y;
  vec2 tip = uTip * mix(1.0, 0.55, uCore);
  float len = uLength * mix(1.0, 0.72, uCore);
  vec3 p = vec3(position.x * tip.x, s * len, position.z * tip.y);
  float sway = sin(s * 7.0 - uTime * 41.0 + uSeed) * 0.6 + sin(s * 13.0 - uTime * 67.0 + uSeed * 2.1) * 0.4;
  p.x += sway * s * s * 0.06;
  p.z += cos(s * 9.0 - uTime * 53.0 + uSeed) * s * s * 0.035;
  vUv = uv;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * vec3(normal.x / tip.x, normal.y / max(len, 0.01), normal.z / tip.y));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

/**
 * La couleur suit la température : base bleutée au débouché (combustion vive, plus nette au cœur), cœur jaune-blanc,
 * corps orange, bords et pointe rougeâtres qui se déchirent (bruit fractal) ; additif.
 */
const FLAME_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform float uSeed;
uniform float uCore;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
void main() {
  float s = vUv.y;
  // Turbulence qui file vers la pointe (sans couture autour de la gerbe).
  float a = vUv.x * 6.2832;
  vec2 q = vec2(cos(a), sin(a)) * 1.4 + vec2(uSeed, s * 4.5 - uTime * 17.0);
  float n = fbm(q) * 1.1;
  float facing = abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld)));
  float body = pow(facing, mix(1.1, 1.6, uCore)) * (1.0 - smoothstep(0.25 + 0.5 * n, 1.0, s)) * smoothstep(0.0, 0.05, s);
  // Température : maximale au débouché et au cœur, elle tombe vers la pointe et les bords ; poches plus chaudes.
  float heat = clamp((1.0 - s) * mix(0.62, 1.0, uCore) * mix(0.55, 1.0, facing) + 0.35 * (n - 0.5), 0.0, 1.0);
  vec3 color = mix(vec3(0.75, 0.08, 0.02), vec3(1.9, 0.5, 0.07), smoothstep(0.1, 0.4, heat));
  color = mix(color, vec3(2.3, 1.75, 0.85), smoothstep(0.45, 0.8, heat));
  float blue = (1.0 - smoothstep(0.04, mix(0.18, 0.3, uCore), s)) * mix(0.55, 1.0, uCore);
  color = mix(color, vec3(0.3, 0.5, 2.1), blue);
  gl_FragColor = vec4(color * body * (0.4 + 0.9 * n) * uPower * mix(1.0, 0.8, uCore), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Traînée : fumée — gaz encore chaud à la sortie (orangé), puis fumée froide qui dérive, monte, s'étale et s'efface. */
const SMOKE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
attribute vec3 aVel;
attribute vec4 aLife; // naissance (s), durée (s), taille (m), graine
varying float vAge;
varying float vSeed;
void main() {
  float t = uTime - aLife.x;
  vAge = t / aLife.y;
  vSeed = aLife.w;
  vec3 p = position + aVel * (1.0 - exp(-1.5 * max(t, 0.0))) / 1.5 + vec3(0.0, 0.08 * t * t, 0.0);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  float alive = step(0.0, vAge) * step(vAge, 1.0);
  gl_PointSize = alive * min(aLife.z * (0.35 + 2.4 * sqrt(clamp(vAge, 0.0, 1.0))) * uScale / -view.z, 480.0);
}`;

const SMOKE_FRAGMENT = /* glsl */ `
varying float vAge;
varying float vSeed;
${NOISE_GLSL}
void main() {
  if (vAge < 0.0 || vAge > 1.0) discard;
  vec2 c = gl_PointCoord - 0.5;
  float n = noise(c * 3.5 + vSeed * 17.0 + vAge * 1.8) * 0.65 + noise(c * 7.0 - vSeed * 5.0) * 0.35;
  // Volutes effilochées : le bruit creuse la fumée, qui s'éclaircit en s'étalant.
  float wisp = smoothstep(0.25, 0.75, n);
  float a = smoothstep(1.0, 0.2, length(c) * 2.0 + 0.45 * (n - 0.5)) * wisp * smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.3, 1.0, vAge));
  vec3 color = mix(vec3(1.5, 0.55, 0.16), vec3(0.17, 0.18, 0.21), smoothstep(0.0, 0.18, vAge));
  gl_FragColor = vec4(color, a * mix(0.45, 0.16, vAge));
  #include <colorspace_fragment>
}`;

/** Étincelles : projetées des sorties à chaque détonation, elles retombent et s'éteignent (additif). */
const SPARK_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScale;
attribute vec3 aVel;
attribute vec4 aLife;
varying float vAge;
void main() {
  float t = uTime - aLife.x;
  vAge = t / aLife.y;
  vec3 p = position + aVel * t + vec3(0.0, -2.2 * t * t, 0.0);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = step(0.0, vAge) * step(vAge, 1.0) * max(aLife.z * uScale / -view.z, 1.5);
}`;

const SPARK_FRAGMENT = /* glsl */ `
varying float vAge;
void main() {
  if (vAge < 0.0 || vAge > 1.0) discard;
  float a = (1.0 - smoothstep(0.2, 1.0, length(gl_PointCoord - 0.5) * 2.0)) * (1.0 - vAge);
  gl_FragColor = vec4(mix(vec3(2.2, 1.5, 0.7), vec3(1.6, 0.35, 0.08), vAge) * a, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Téléphone, arrêt Échappement : une flamme par sortie en deux couches (enveloppe rougeâtre ; cœur bleu au débouché,
 * puis jaune-blanc), un éclat à chaque débouché puis le métal qui refroidit, des étincelles, et la traînée — fumée et
 * gaz chauds qui dérivent en arrière et montent, dissipés en 2 à 3 s ; lueur orangée sur l'arrière du véhicule.
 * Particules tirées une fois (graine fixe), animées par le temps seul. Invisibles au repos.
 */
function exhaustFlames({ tips, size }: Exhaust) {
  const group = new Group();
  group.visible = false;
  // La gerbe s'évase après le débouché (jusqu'à ~1,6 fois l'embout), puis s'effile.
  const profile = Array.from({ length: 25 }, (_, j) => {
    const s = j / 24;
    return new Vector2((0.6 + 1.7 * MathUtils.smoothstep(s, 0, 0.35)) * (1 - s) ** 0.8, s);
  });
  const geometry = new LatheGeometry(profile, 32);
  const glow = new SpriteMaterial({
    map: glowTexture(),
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  const flames: Mesh[] = [];
  tips.forEach((tip, i) => {
    for (const core of [0, 1]) {
      const flame = new Mesh(
        geometry,
        new ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uPower: { value: 0 },
            uLength: { value: 0.2 },
            uTip: { value: new Vector2(size[0] / 2, size[1] / 2) },
            uSeed: { value: i * 1.7 + core * 5.3 },
            uCore: { value: core },
          },
          vertexShader: FLAME_VERTEX,
          fragmentShader: FLAME_FRAGMENT,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          side: DoubleSide,
        }),
      );
      flame.position.set(...tip);
      // Le long de l'échappement (vers l'arrière), un rien vers le sol.
      flame.rotation.x = -Math.PI / 2 - 0.05;
      flame.frustumCulled = false;
      flames.push(flame);
      group.add(flame);
    }
    const spark = new Sprite(glow);
    spark.position.set(tip[0], tip[1], tip[2] - 0.04);
    spark.scale.setScalar(Math.max(...size) * 4.5);
    group.add(spark);
  });
  // Fumée et étincelles : tirées une fois, pour chaque détonation et chaque sortie.
  const random = seeded(63);
  const scale = { value: 800 };
  const cloud = (
    count: number,
    emit: (tip: number[], start: number, length: number) => number[],
    vertexShader: string,
    fragmentShader: string,
    additive: boolean,
  ) => {
    const position: number[] = [];
    const vel: number[] = [];
    const life: number[] = [];
    for (const [start, length, force] of BURSTS)
      for (const tip of tips)
        for (let k = 0; k < Math.round(count * force); k++) {
          const [px, py, pz, vx, vy, vz, born, span, grain] = emit(tip, start, length);
          position.push(px, py, pz);
          vel.push(vx, vy, vz);
          life.push(born, span, grain, random());
        }
    const cloudGeometry = new BufferGeometry();
    cloudGeometry.setAttribute('position', new Float32BufferAttribute(position, 3));
    cloudGeometry.setAttribute('aVel', new Float32BufferAttribute(vel, 3));
    cloudGeometry.setAttribute('aLife', new Float32BufferAttribute(life, 4));
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: scale },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
    });
    const points = new Points(cloudGeometry, material);
    points.frustumCulled = false;
    group.add(points);
    return material;
  };
  const smoke = cloud(
    7,
    (tip, start, length) => [
      tip[0] + (random() - 0.5) * 0.04,
      tip[1] + (random() - 0.5) * 0.03,
      tip[2] - 0.05,
      (random() - 0.5) * 0.25,
      0.12 + random() * 0.25,
      -(0.8 + random() * 0.9),
      start + random() * length * 0.8,
      2 + random() * 0.9,
      0.16 + random() * 0.12,
    ],
    SMOKE_VERTEX,
    SMOKE_FRAGMENT,
    false,
  );
  const sparks = cloud(
    5,
    (tip, start, length) => [
      tip[0],
      tip[1],
      tip[2] - 0.03,
      (random() - 0.5) * 0.8,
      0.3 + random() * 0.9,
      -(2.5 + random() * 2.5),
      start + random() * length * 0.5,
      0.25 + random() * 0.35,
      0.018,
    ],
    SPARK_VERTEX,
    SPARK_FRAGMENT,
    true,
  );
  const center = tips.reduce((sum, tip) => sum.add(new Vector3(...tip)), new Vector3()).divideScalar(tips.length);
  const light = new PointLight(0xff8a3a, 0, 0, 2);
  light.position.set(center.x, center.y + 0.05, center.z - 0.3);
  const share = [1, 0.9, 0.95, 0.85];
  /** Chaleur des débouchés : pleine pendant une gerbe, puis le métal refroidit (≈ 0,9 s). */
  const heatAt = (t: number) => {
    let heat = 0;
    for (const [start, length, force] of BURSTS) {
      const x = t - start;
      if (x > 0) heat = Math.max(heat, force * (x < length ? MathUtils.smoothstep(x, 0, 0.05) : Math.exp(-(x - length) / 0.9)));
    }
    return heat;
  };
  /** État `t` s après le départ ; renvoie la lueur du sol. */
  const update = (t: number) => {
    const live = t > 0 && t < FLAME_END;
    let total = 0;
    tips.forEach((_, i) => {
      const power = burst(t - i * 0.014) * share[i % share.length];
      for (const flame of [flames[i * 2], flames[i * 2 + 1]]) {
        const uniforms = (flame.material as ShaderMaterial).uniforms;
        uniforms.uPower.value = power;
        uniforms.uTime.value = t;
        uniforms.uLength.value = 0.2 + 0.5 * power;
        flame.visible = power > 0.002;
      }
      total += power / tips.length;
    });
    const heat = live ? heatAt(t) : 0;
    // Débouchés : éclat pendant les gerbes, puis le métal qui refroidit, de l'orangé au rouge sombre.
    const hot = Math.min(total * 2, 1);
    glow.color.setRGB(1, 0.18 + 0.45 * hot, 0.05 + 0.35 * hot);
    glow.opacity = Math.min(Math.max(total * 1.3, heat * 0.5), 1);
    smoke.uniforms.uTime.value = t;
    sparks.uniforms.uTime.value = t;
    light.intensity = FLAME_LIGHT * (total + 0.15 * heat);
    group.visible = live;
    return live ? total + 0.1 * heat : 0;
  };
  /** Pixels par mètre à 1 m de la caméra : taille des particules. */
  const setScale = (value: number) => {
    scale.value = value;
  };
  return { group, light, update, scale: setScale, at: new Vector2(center.x, center.z - 0.35) };
}
