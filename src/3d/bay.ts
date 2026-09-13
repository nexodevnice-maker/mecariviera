import {
  AdditiveBlending,
  LinearMipmapLinearFilter,
  Mesh,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Ray,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
  Vector4,
} from 'three';

/**
 * La baie de Villefranche la nuit (photo du porteur) : le décor du premier plan. La route s'arrête à la bordure
 * du trottoir ; au-delà, la baie en contrebas — ciel éclairé par la lune, collines du cap, port, reflets. Une
 * grande image dans le monde (elle tourne avec la caméra comme un lointain), calée au format de l'écran : elle
 * couvre tout ce que la caméra du premier arrêt voit au-dessus de la bordure, son horizon marin à hauteur d'œil ;
 * ses bords se fondent dans la nuit, pour les autres arrêts. La lune est un calque à part : la photo est en
 * portrait, et dans un écran en paysage la lune serait au-dessus du cadre — elle est posée sous l'en-tête, à la
 * verticale de son reflet.
 */

/** Repères de la photo source (2268 × 4032), en part de sa largeur (x) et de sa hauteur (y) — scripts/bay-assets.mjs. */
export const PHOTO = {
  /** Hauteur / largeur. */
  aspect: 4032 / 2268,
  /** Horizon marin. */
  horizon: 0.498,
  moon: [0.428, 0.2202] as const,
  /** Rayon du calque de la lune, en part de la largeur. */
  moonRadius: 0.16,
};

/** Rangées de la photo couvertes par chaque bande publiée : large (riviera-bay), haute (riviera-bay-m). */
export const BANDS = { wide: [0.27, 0.72], tall: [0.27, 0.8] } as const satisfies Record<string, readonly [number, number]>;

export interface BayFit {
  /** Distance du décor à la caméra du premier arrêt (m), en deçà du plan lointain de la caméra. */
  distance: number;
  /** Agrandissement au-delà du strict nécessaire pour couvrir le champ (1 : bord à bord). */
  zoom: number;
  /** Colonne de la photo (part de sa largeur) posée à `at` (part de la largeur de l'écran, depuis la gauche). */
  anchor: number;
  at: number;
  /** Hauteur de la lune à l'écran (part de la hauteur, depuis le haut) : sous l'en-tête. */
  moonY: number;
  /** Exposition et saturation de la photo dans la scène ; intensité de la lune. */
  level: number;
  saturation: number;
  moonLevel: number;
  /** Exposition de la baie en contrebas, près de la bordure (la profondeur : l'eau s'assombrit vers soi). */
  depth: number;
}

/** Ordinateur et tablette en paysage : la colonne de la lune et de son reflet entre le titre et le véhicule. */
export const FIT_WIDE: BayFit = {
  distance: 100,
  zoom: 1,
  anchor: 0.43,
  at: 0.47,
  moonY: 0.17,
  level: 0.85,
  saturation: 0.85,
  moonLevel: 1,
  depth: 0.55,
};

/** Téléphone et tablette en portrait : la lune au-dessus du véhicule, la baie derrière lui. */
export const FIT_TALL: BayFit = { ...FIT_WIDE, at: 0.45, moonY: 0.115 };

/**
 * Fondu des bords de la bande (part de sa largeur ; de sa hauteur, en haut et en bas), hors champ au premier
 * arrêt : court à gauche (la mer), long à droite — la ville, coupée par le cadre de la photo, s'éteint dans la nuit.
 */
const FEATHER_LEFT = 0.04;
const FEATHER_RIGHT = 0.14;
const FEATHER_TOP = 0.08;
const FEATHER_BOTTOM = 0.03;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const photoFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uLevel;
uniform float uSaturation;
uniform vec4 uFeather; // gauche, droite, haut, bas
uniform float uHorizon; // rangée de l'horizon dans la bande (depuis le bas)
uniform float uDepth;
uniform float uFocus;   // 0 : premier plan, net ; 1 : près du véhicule — la baie floue et plus sombre
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uMap, vUv, uFocus * 2.5).rgb * uLevel * mix(1.0, 0.42, uFocus);
  color = mix(vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), color, uSaturation);
  // Sous l'horizon, la baie s'assombrit à mesure qu'elle se rapproche : le regard descend vers la bordure.
  color *= mix(uDepth, 1.0, smoothstep(uHorizon - 0.42, uHorizon, vUv.y));
  float alpha = smoothstep(0.0, uFeather.x, vUv.x) * smoothstep(0.0, uFeather.y, 1.0 - vUv.x)
    * smoothstep(0.0, uFeather.z, 1.0 - vUv.y) * smoothstep(0.0, uFeather.w, vUv.y);
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}`;

// La lune n'apporte que sa lumière (mélange additif) : son ciel a été retiré à la fabrication.
const moonFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uLevel;
uniform float uFocus;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uMap, vUv, uFocus * 2.0).rgb * uLevel * mix(1.0, 0.5, uFocus), 1.0);
  #include <colorspace_fragment>
}`;

/** `image` : ImageBitmap créée retournée (imageOrientation: 'flipY'), comme l'attend WebGL. */
function toTexture(image: ImageBitmap, anisotropy: number) {
  const texture = new Texture(image);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** `band` : rangées de la photo couvertes par `image` (BANDS). */
export function createBay(image: ImageBitmap, band: readonly [number, number], moonImage: ImageBitmap | null, anisotropy: number) {
  const texture = toTexture(image, anisotropy);
  const [b0, b1] = band;
  const span = b1 - b0;
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uLevel: { value: FIT_WIDE.level },
      uSaturation: { value: FIT_WIDE.saturation },
      uFeather: { value: new Vector4(FEATHER_LEFT, FEATHER_RIGHT, FEATHER_TOP, FEATHER_BOTTOM) },
      uHorizon: { value: (b1 - PHOTO.horizon) / span },
      uDepth: { value: FIT_WIDE.depth },
      uFocus: { value: 0 },
    },
    vertexShader,
    fragmentShader: photoFragment,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.renderOrder = -2;

  const moonTexture = moonImage ? toTexture(moonImage, anisotropy) : null;
  const moonMaterial = moonTexture
    ? new ShaderMaterial({
        uniforms: { uMap: { value: moonTexture }, uLevel: { value: FIT_WIDE.moonLevel }, uFocus: { value: 0 } },
        vertexShader,
        fragmentShader: moonFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      })
    : null;
  const moon = moonMaterial ? new Mesh(new PlaneGeometry(1, 1), moonMaterial) : null;
  if (moon) moon.renderOrder = -1;

  const ray = new Ray();
  const plane = new Plane();
  const forward = new Vector3();
  const right = new Vector3();
  const center = new Vector3();
  const point = new Vector3();
  const normal = new Vector3();

  /** Point de l'écran (coordonnées normalisées) sur le plan du décor : u vers la droite, v au-dessus de l'œil. */
  const onPlane = (camera: PerspectiveCamera, x: number, y: number) => {
    point.set(x, y, 0.5).unproject(camera);
    ray.set(camera.position, point.sub(camera.position).normalize());
    if (!ray.intersectPlane(plane, point)) return null;
    return { u: point.sub(center).dot(right), v: point.y + center.y - camera.position.y };
  };

  /** Hauteur (coordonnées normalisées) de la bordure du trottoir aux bords gauche et droit de l'écran. */
  const kerbLine = (camera: PerspectiveCamera, kerb: number): [number, number] => {
    const seen: [number, number][] = [];
    for (let z = -80; z <= 80; z += 4) {
      point.set(kerb, 0, z).applyMatrix4(camera.matrixWorldInverse);
      if (point.z > -1) continue; // derrière la caméra, ou trop près
      point.set(kerb, 0, z).project(camera);
      seen.push([point.x, point.y]);
    }
    if (seen.length < 2) return [-1, -1];
    const [a, b] = [seen[0], seen[seen.length - 1]];
    const slope = (b[1] - a[1]) / (b[0] - a[0] || 1e-6);
    const at = (x: number) => Math.min(Math.max(a[1] + slope * (x - a[0]), -1), 1);
    return [at(-1), at(1)];
  };

  /**
   * Cale le décor sur la caméra du premier arrêt (`camera`, projection comprise) : la partie nette de la photo
   * couvre le champ au-dessus de la bordure (`kerb`, en x), l'horizon marin à hauteur d'œil, la colonne choisie à
   * sa place ; la lune sous l'en-tête, à la verticale de son reflet (jamais plus haut que dans la photo).
   */
  const fit = (camera: PerspectiveCamera, kerb: number, options: BayFit) => {
    const A = PHOTO.aspect;
    const h = PHOTO.horizon;
    camera.updateMatrixWorld();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.set(-forward.z, 0, forward.x);
    center.copy(camera.position).addScaledVector(forward, options.distance);
    plane.setFromNormalAndCoplanarPoint(normal.copy(forward).negate(), center);

    const [kerbLeft, kerbRight] = kerbLine(camera, kerb);
    const corners = [onPlane(camera, -1, 1), onPlane(camera, 1, 1), onPlane(camera, 1, kerbRight), onPlane(camera, -1, kerbLeft)].filter(
      (c): c is { u: number; v: number } => c !== null,
    );
    const us = corners.map((c) => c.u);
    const vs = corners.map((c) => c.v);
    const uMin = Math.min(...us);
    const uMax = Math.max(...us);
    const vTop = Math.max(...vs);
    const vLow = Math.min(...vs);

    // Partie nette de la bande (hors fondus) : elle doit couvrir tout le champ au-dessus de la bordure.
    const top = b0 + FEATHER_TOP * span;
    const bottom = b1 - FEATHER_BOTTOM * span;
    const usable = 1 - FEATHER_LEFT - FEATHER_RIGHT;
    const scale =
      options.zoom *
      Math.max((uMax - uMin) / usable, vTop > 0 ? vTop / ((h - top) * A) : 0, vLow < 0 ? -vLow / ((bottom - h) * A) : 0);

    // La colonne choisie de la photo à sa place à l'écran, sans jamais découvrir un bord (fondus compris).
    const aim = onPlane(camera, options.at * 2 - 1, 0)?.u ?? 0;
    const lowest = uMax - (0.5 - FEATHER_RIGHT) * scale;
    const highest = uMin + (0.5 - FEATHER_LEFT) * scale;
    const offset = Math.min(Math.max(aim - (options.anchor - 0.5) * scale, lowest), highest);

    mesh.scale.set(scale, scale * A * span, 1);
    mesh.position.copy(center).addScaledVector(right, offset);
    mesh.position.y = camera.position.y + (h - (b0 + b1) / 2) * scale * A;
    mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
    material.uniforms.uLevel.value = options.level;
    material.uniforms.uSaturation.value = options.saturation;
    material.uniforms.uDepth.value = options.depth;

    let moonAt: number | null = null;
    if (moon && moonMaterial) {
      const natural = (h - PHOTO.moon[1]) * scale * A;
      const lowered = onPlane(camera, 0, 1 - 2 * options.moonY)?.v ?? natural;
      const size = 2 * PHOTO.moonRadius * scale;
      moon.scale.set(size, size, 1);
      moon.position
        .copy(center)
        .addScaledVector(forward, -1)
        .addScaledVector(right, offset + (PHOTO.moon[0] - 0.5) * scale);
      moon.position.y = camera.position.y + Math.min(natural, lowered);
      moon.lookAt(camera.position.x, moon.position.y, camera.position.z);
      moonMaterial.uniforms.uLevel.value = options.moonLevel;
      moonAt = Math.min(natural, lowered);
    }
    // Contrôle : largeur de la photo (m) et rangées visibles au premier arrêt (haut de l'écran, bordure).
    return {
      scale: Number(scale.toFixed(2)),
      offset: Number(offset.toFixed(2)),
      rows: [h - vTop / (scale * A), h - vLow / (scale * A)].map((r) => Number(r.toFixed(3))),
      columns: [0.5 + (uMin - offset) / scale, 0.5 + (uMax - offset) / scale].map((c) => Number(c.toFixed(3))),
      kerb: [kerbLeft, kerbRight].map((k) => Number(((1 - k) / 2).toFixed(3))),
      moon: moonAt === null ? null : Number((h - moonAt / (scale * A)).toFixed(3)),
    };
  };

  /** Mise au point sur le véhicule (0 → 1) : en s'approchant, la baie passe au flou et s'assombrit. */
  const focus = (amount: number) => {
    material.uniforms.uFocus.value = amount;
    if (moonMaterial) moonMaterial.uniforms.uFocus.value = amount;
  };

  return { mesh, moon, textures: [texture, ...(moonTexture ? [moonTexture] : [])], fit, focus };
}
