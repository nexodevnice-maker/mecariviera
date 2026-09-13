import {
  CatmullRomCurve3,
  Color,
  MathUtils,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Mesh,
  type MeshBasicMaterial,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createFollow } from '../motion/follow';
import { guided } from '../motion/guide';
import type { StageProgress } from '../motion/stage-progress';
import { INSPECTION_PACES } from './inspection-paces';
import { guidedPace, paced, type Pace, type Vec3 } from './rigs';

/**
 * Inspection 3D du scan réel (photogrammétrie d'une A1 capot ouvert), pilotée par le scroll.
 * La voiture reste sombre et désaturée (ce qui masque les défauts du scan) ; une ligne de scan la
 * parcourt de l'arrière vers l'avant, puis une « lampe d'inspection » éclaire en couleurs réelles
 * la pièce désignée par chaque arrêt. Repère du scan : véhicule tourné de -25,5° autour de la
 * verticale (avant vers +X/-Z), centre au sol en (0,055 ; -0,359) — mesuré sur les roues et la
 * plaque ; les pièces ont été relevées par lancer de rayons sur le scan.
 * Plaques et logos sont effacés des textures au pipeline (scripts/optimize-3d.mjs).
 */

type Key = 'releve' | 'capot' | 'huile' | 'refroidissement' | 'frein' | 'moteur' | 'depart';

interface Shot {
  position: Vec3;
  target: Vec3;
  /** Décalage de l'image (desktop : vers la droite ; mobile : vers le haut), comme la scène principale. */
  shift: number;
  mobile?: { position?: Vec3; target?: Vec3; shift?: number };
  /**
   * Lampe d'inspection : centre (repère du scan), rayons de l'ellipsoïde éclairé dans le repère
   * du véhicule — longueur, hauteur, largeur (m) —, intensité 0–1.
   */
  focus: Vec3;
  radii: Vec3;
  focusMix: number;
  /** Ligne de scan : position le long du véhicule (m depuis son centre) et intensité 0–1. */
  sweep: number;
  sweepMix: number;
  /** Point désigné par le trait de rappel. */
  anchor?: Vec3;
  /** Rythme du segment qui mène à ce cadrage (voir rigs.ts). */
  pace?: Pace;
  /** 0 : la voiture n'existe que là où le scan est passé (ouverture sur le noir) ; 1 : visible de nuit. */
  reveal: number;
  /** Isolement de la pièce : 0, la voiture reste lisible ; 1, tout ce qui n'est pas sous la lampe s'éteint presque. */
  isolate: number;
}

const INK = 0x0b0c0e;
/** --blue-soft (src/styles/tokens.css). */
const LINE = 0x86a6ff;
/** Compartiment moteur : sur l'axe du véhicule, entre le tablier et la calandre. */
const BAY: Vec3 = [1.364, 0.88, -0.983];
const BAY_RADII: Vec3 = [0.5, 0.28, 0.78];
/** Au-delà de l'arrière et de l'avant du véhicule : la ligne de scan y est invisible. */
const SWEEP_START = -2.45;
const SWEEP_END = 2.45;

const SHOTS: Record<Key, Shot> = {
  releve: {
    position: [4.4, 2.3, -4.4],
    target: [0.1, 0.6, -0.75],
    shift: 0.24,
    mobile: { position: [5.8, 2.9, -5.8], target: [0.05, 0.6, -0.4], shift: 0.22 },
    focus: BAY,
    radii: BAY_RADII,
    focusMix: 0,
    sweep: SWEEP_START,
    sweepMix: 1,
    reveal: 0,
    isolate: 0,
  },
  capot: {
    position: [2.6, 2.9, -2.68],
    target: [1.385, 0.8, -0.938],
    shift: 0.22,
    mobile: { position: [3.15, 3.4, -3.16], shift: 0.22 },
    focus: BAY,
    radii: BAY_RADII,
    focusMix: 1,
    sweep: SWEEP_END,
    sweepMix: 1,
    pace: INSPECTION_PACES.capot,
    reveal: 1,
    isolate: 0,
  },
  // La lampe sur la jauge (anneau orange) : le point d'attention, pas tout le cache moteur.
  huile: {
    position: [2.2, 1.95, -1.95],
    target: [1.45, 0.88, -0.92],
    shift: 0.2,
    mobile: { position: [2.7, 2.3, -2.4], shift: 0.22 },
    focus: [1.547, 0.88, -0.913],
    radii: [0.16, 0.14, 0.16],
    focusMix: 1,
    sweep: SWEEP_END,
    sweepMix: 0,
    anchor: [1.547, 0.869, -0.913],
    pace: INSPECTION_PACES.huile,
    reveal: 1,
    isolate: 1,
  },
  refroidissement: {
    position: [2.65, 2.1, -0.95],
    target: [1.5, 0.9, -0.5],
    shift: 0.2,
    mobile: { position: [3.1, 2.4, -1.2], shift: 0.22 },
    focus: [1.5, 0.91, -0.47],
    radii: [0.17, 0.15, 0.17],
    focusMix: 1,
    sweep: SWEEP_END,
    sweepMix: 0,
    anchor: [1.483, 0.944, -0.46],
    pace: INSPECTION_PACES.refroidissement,
    reveal: 1,
    isolate: 1,
  },
  frein: {
    position: [1.975, 2.35, -2.6],
    target: [1.06, 0.86, -1.06],
    shift: 0.22,
    mobile: { position: [2.3, 2.7, -3.0], shift: 0.22 },
    focus: [1.043, 0.845, -1.067],
    radii: [0.19, 0.15, 0.19],
    focusMix: 1,
    sweep: SWEEP_END,
    sweepMix: 0,
    anchor: [1.043, 0.842, -1.067],
    pace: INSPECTION_PACES.frein,
    reveal: 1,
    isolate: 1,
  },
  moteur: {
    position: [2.75, 1.95, -1.65],
    target: [1.35, 0.9, -0.87],
    shift: 0.2,
    mobile: { position: [2.6, 3.0, -1.9], target: [1.35, 0.9, -0.9], shift: 0.22 },
    focus: [1.33, 0.92, -0.9],
    radii: [0.36, 0.2, 0.42],
    focusMix: 1,
    sweep: SWEEP_END,
    sweepMix: 0,
    anchor: [1.361, 0.93, -0.96],
    // Le bloc entier : un recul plus ample, un isolement partiel.
    pace: INSPECTION_PACES.moteur,
    reveal: 1,
    isolate: 0.6,
  },
  // Prendre de la hauteur. Ordinateur : la voiture vue d'en haut, petite sur le noir — le point de la carte qui
  // suit (même cap que le cadrage précédent, pas de roulis) ; arrivée avant la fin du segment, un temps d'arrêt
  // sur la voiture devenue point. Téléphone : un recul mesuré — la voiture entière, de trois quarts et
  // d'au-dessus, dans le même axe —, puis la zone d'intervention monte par-dessus (Territory.astro). La lampe
  // s'éteint.
  depart: {
    position: [1.36, 40, -1.09],
    target: [0.055, 0, -0.359],
    shift: 0.2,
    mobile: { position: [8.37, 7.6, -4.99], target: [0.055, 0.2, -0.359], shift: 0.22 },
    focus: BAY,
    radii: BAY_RADII,
    focusMix: 0,
    sweep: SWEEP_END,
    sweepMix: 0,
    pace: INSPECTION_PACES.depart,
    reveal: 1,
    isolate: 0,
  },
};

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform vec3 uFocus;
uniform vec3 uRadii;
uniform float uFocusMix;
uniform float uSweep;
uniform float uSweepMix;
uniform float uReveal;
uniform float uIsolate;
uniform vec3 uInk;
uniform vec3 uLine;
varying vec2 vUv;
varying vec3 vWorld;

// Repère du véhicule dans le scan : centre au sol (x, z), axe avant, axe latéral ; demi-emprise (m).
const vec2 CAR_CENTER = vec2(0.055, -0.359);
const vec2 CAR_FORWARD = vec2(0.9026, -0.4305);
const vec2 CAR_SIDE = vec2(0.4305, 0.9026);
const vec2 CAR_HALF = vec2(2.02, 0.92);

// Repère du scan → repère du véhicule : (longueur, hauteur, largeur).
vec3 toCar(vec3 p) {
  vec2 rel = p.xz - CAR_CENTER;
  return vec3(dot(rel, CAR_FORWARD), p.y, dot(rel, CAR_SIDE));
}

void main() {
  vec3 tex = texture2D(map, vUv).rgb;
  float lum = dot(tex, vec3(0.2126, 0.7152, 0.0722));
  vec3 car = toCar(vWorld);
  // Nuit : luminance seule, froide et basse ; un cran plus clair derrière la ligne de scan (relevé).
  float dx = car.x - uSweep;
  float scanned = uSweepMix * (1.0 - smoothstep(-0.3, 0.02, dx));
  // À l'ouverture (uReveal = 0), la voiture n'existe que là où la ligne de scan est passée.
  vec3 color = lum * mix(vec3(0.2, 0.215, 0.26) * uReveal, vec3(0.3, 0.32, 0.39), scanned);
  // Volume : normale de facette (dérivées écran), tournée vers l'observateur — la silhouette
  // accroche un liseré froid, les dessus un peu de lumière zénithale.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 toEye = normalize(cameraPosition - vWorld);
  facet *= sign(dot(facet, toEye));
  color += (uLine * 0.05 * pow(1.0 - max(dot(facet, toEye), 0.0), 4.0) + vec3(0.009, 0.01, 0.014) * max(facet.y, 0.0)) * max(uReveal, scanned);
  // Lampe d'inspection : couleurs réelles dans un ellipsoïde aligné sur le véhicule, cœur légèrement
  // chaud, et une lumière diffuse autour — une flaque de lumière plutôt qu'une découpe.
  float d = length((car - toCar(uFocus)) / uRadii);
  float core = 1.0 - smoothstep(0.55, 1.0, d);
  float spill = 1.0 - smoothstep(0.9, 1.7, d);
  // Isolement : tout ce qui n'est pas sous la lampe s'éteint presque — la pièce domine la scène.
  color *= mix(1.0, 0.3, uIsolate * (1.0 - spill));
  color += color * 0.4 * uFocusMix * spill * (1.0 - core);
  color = mix(color, tex * mix(vec3(0.94, 0.96, 1.0), vec3(1.06, 1.02, 0.95), core), uFocusMix * core);
  // Ligne de scan : trait fin (largeur constante à l'écran) et halo en couleurs réelles.
  float line = uSweepMix * (1.0 - smoothstep(0.005, 0.005 + 1.5 * fwidth(dx), abs(dx)));
  float glow = uSweepMix * exp(-dx * dx / 0.04);
  color = mix(color, tex, glow * 0.7);
  color += uLine * (line * 1.2 + glow * 0.1);
  // Sol : bien plus sombre que la voiture, puis fondu dans le fond de page au-delà de l'emprise.
  vec2 q = abs(car.xz) - CAR_HALF + 0.4;
  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.4;
  color *= mix(0.25, 1.0, smoothstep(0.02, 0.2, vWorld.y));
  color = mix(color, uInk, smoothstep(0.0, 0.4, outside));
  // À l'ouverture, ce que la ligne n'a pas encore relevé se confond avec le fond de page : pas de
  // silhouette, seulement la ligne et ce qu'elle a déjà lu.
  color = mix(uInk, color, clamp(max(max(uReveal, scanned), glow * 0.7 + line), 0.0, 1.0));
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

interface InspectionOptions {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  stops: HTMLElement[];
  progress: StageProgress;
  narrow: MediaQueryList;
}

const v3 = (a: Vec3) => new Vector3(...a);

export async function createInspection({ root, canvas, stops, progress, narrow }: InspectionOptions) {
  const viewport = canvas.parentElement as HTMLElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const renderer = new WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new Scene();
  scene.background = new Color(INK);
  const camera = new PerspectiveCamera(32, 1, 0.05, 60);

  // Uniformes partagés (mêmes objets) : un seul réglage pilote toutes les parties du scan.
  const uniforms = {
    uFocus: { value: v3(BAY) },
    uRadii: { value: v3(BAY_RADII) },
    uFocusMix: { value: 0 },
    uSweep: { value: SWEEP_START },
    uSweepMix: { value: 1 },
    uReveal: { value: 0 },
    uIsolate: { value: 0 },
    uInk: { value: new Color(INK) },
    uLine: { value: new Color(LINE) },
  };

  MeshoptDecoder.useWorkers?.(2);
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(narrow.matches ? '/3d/a1-scan-m.glb' : '/3d/a1-scan.glb');
  const anisotropy = Math.min(narrow.matches ? 16 : 8, renderer.capabilities.getMaxAnisotropy());
  gltf.scene.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as MeshBasicMaterial;
    if (source.map) source.map.anisotropy = anisotropy;
    mesh.material = new ShaderMaterial({ uniforms: { ...uniforms, map: { value: source.map } }, vertexShader, fragmentShader });
    source.dispose();
  });
  scene.add(gltf.scene);

  // — Caméra et éclairage : interpolés d'arrêt en arrêt, avec un palier pendant la lecture.
  const keys = stops.map((el) => el.dataset.stop as Key);
  const shots = keys.map((key) => SHOTS[key] ?? SHOTS.releve);
  const last = shots.length - 1;
  const lookAt = new Vector3();
  let framings: { position: Vec3; target: Vec3; shift: number }[] = [];
  let positions: CatmullRomCurve3;
  let targets: CatmullRomCurve3;
  let shift = 0;

  const buildPath = () => {
    framings = shots.map((s) => (narrow.matches ? { ...s, ...s.mobile } : s));
    positions = new CatmullRomCurve3(framings.map((f) => v3(f.position)), false, 'centripetal');
    targets = new CatmullRomCurve3(framings.map((f) => v3(f.target)), false, 'centripetal');
  };
  buildPath();

  const applyOffset = () => {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    if (narrow.matches) camera.setViewOffset(w, h, 0, h * shift, w, h);
    else camera.setViewOffset(w, h, -w * (shift + Math.max(0, 1 - w / 1440) * 0.08), 0, w, h);
    camera.updateProjectionMatrix();
  };

  const lerp = MathUtils.lerp;
  const mix3 = (out: Vector3, a: Vec3, b: Vec3, t: number) =>
    out.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));

  const at = (p: number) => {
    const i = Math.min(Math.floor(p), Math.max(last - 1, 0));
    // Chaque segment a son rythme : celui du cadrage visé. La ligne de scan, elle, avance à vitesse
    // constante pendant son segment — un balayage, pas un glissé.
    const shotPace = shots[Math.min(i + 1, last)].pace;
    // Téléphone, pas guidés : le mouvement occupe tout le pas (la lecture se fait à l'arrêt).
    const pace = guided.matches ? guidedPace(shotPace) : shotPace;
    const t = paced(p - i, pace);
    const sweep = paced(p - i, { window: pace?.window ?? [0.18, 0.82], ease: 'linear' });
    const u = last > 0 ? (i + t) / last : 0;
    positions.getPoint(u, camera.position);
    targets.getPoint(u, lookAt);
    camera.lookAt(lookAt);
    const a = shots[i];
    const b = shots[Math.min(i + 1, last)];
    mix3(uniforms.uFocus.value, a.focus, b.focus, t);
    mix3(uniforms.uRadii.value, a.radii, b.radii, t);
    uniforms.uFocusMix.value = lerp(a.focusMix, b.focusMix, t);
    uniforms.uSweep.value = lerp(a.sweep, b.sweep, sweep);
    uniforms.uSweepMix.value = lerp(a.sweepMix, b.sweepMix, t);
    // La nuit ne revient qu'en fin de balayage : jusque-là, seul le relevé existe.
    uniforms.uReveal.value = lerp(a.reveal, b.reveal, t ** 3);
    uniforms.uIsolate.value = lerp(a.isolate, b.isolate, t);
    shift = lerp(framings[i].shift, framings[Math.min(i + 1, last)].shift, t);
    applyOffset();
  };

  // — Trait de rappel : du filet de l'arrêt actif à la pièce éclairée.
  const callout = root.querySelector<SVGSVGElement>('[data-callout]');
  const calloutLine = callout?.querySelector('path');
  const calloutRings = callout ? [...callout.querySelectorAll('circle')] : [];
  const anchor = new Vector3();

  const drawCallout = (p: number) => {
    if (!callout || !calloutLine) return;
    const k = Math.round(p);
    const point = shots[k]?.anchor;
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

  // Définition : ordinateur, 1,75 au plus ; téléphone, jusqu'à 2, baissée d'un cran si les images ralentissent.
  const phoneSteps = [2, 1.5, 1.25].map((v) => Math.min(window.devicePixelRatio, v));
  let phoneLevel = 0;
  let slowFrames = 0;
  const pixelRatio = () => (narrow.matches ? phoneSteps[phoneLevel] : Math.min(window.devicePixelRatio, 1.75));

  let dirty = true;
  let wasNarrow = narrow.matches;
  const resize = () => {
    if (narrow.matches !== wasNarrow) {
      wasNarrow = narrow.matches;
      buildPath();
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
    const aspect = viewport.clientWidth / viewport.clientHeight;
    camera.aspect = aspect;
    camera.fov = narrow.matches
      ? Math.max(30, aspect > 0.6 ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(21)) * 0.6) / aspect)) : 42)
      : aspect < 1.6
        ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(16)) * 1.6) / aspect))
        : 32;
    applyOffset();
    progress.measure();
    dirty = true;
  };
  resize();
  new ResizeObserver(resize).observe(viewport);
  reduced.addEventListener('change', () => (dirty = true));

  let current = progress.read();
  const follow = createFollow(narrow);
  at(current);
  await renderer.compileAsync(scene, camera);

  let raf = 0;
  let lastTime = 0;
  const render = () => {
    at(current);
    renderer.render(scene, camera);
    drawCallout(current);
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
    if (!changed) return;
    dirty = false;
    render();
    canvas.classList.add('is-ready');
    if (!narrow.matches) return;
    if (dt > 1 / 24) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 8 && phoneLevel < phoneSteps.length - 1) {
      phoneLevel++;
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
    root.classList.remove('has-3d');
    root.classList.add('is-static');
  });

  if (import.meta.env.DEV) {
    Object.assign(window, {
      __inspection: {
        settle() {
          current = progress.read();
          render();
          canvas.classList.add('is-ready');
          return Number(current.toFixed(3));
        },
        info() {
          const round = (v: number) => Number(v.toFixed(2));
          return {
            p: Number(current.toFixed(3)),
            narrow: narrow.matches,
            camera: camera.position.toArray().map(round),
            target: lookAt.toArray().map(round),
            fov: round(camera.fov),
            shift: round(shift),
          };
        },
      },
    });
  }
}
