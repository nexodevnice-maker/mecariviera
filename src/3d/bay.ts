import {
  AdditiveBlending,
  LinearMipmapLinearFilter,
  MathUtils,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
  Vector4,
} from 'three';

/**
 * La baie de Villefranche la nuit (photo fournie par le porteur), en vrai lointain de la scène : un plan
 * au-delà de la mer, derrière le véhicule, bords fondus dans la nuit. Il est dans le monde — il bouge avec
 * la caméra comme un paysage lointain — et ne passe jamais devant la voiture ni la route (profondeur).
 */
export interface BayPlacement {
  /** Direction du centre de la photo depuis l'origine de la scène (degrés, même repère que la caméra). */
  azimuth: number;
  /** Largeur apparente de la photo depuis l'origine (degrés). */
  width: number;
  /** Distance du plan à l'origine (m) : en deçà du plan lointain de la caméra. */
  distance: number;
  /** Ligne d'horizon de la photo (part de sa hauteur, depuis le haut) : posée à hauteur d'œil. */
  horizon: number;
  /** Hauteur d'œil dans la scène (m). */
  eye: number;
  /** Exposition de la photo dans la nuit de la scène. */
  level: number;
  /**
   * Ce qui est pris à la photo — le reste est la nuit de la scène : la lune et son halo (centre x, y, rayon),
   * la côte éclairée (centre x, y, rayons x, y) et le reflet de la lune sur l'eau (idem). Coordonnées de texture
   * (y vers le haut), rayons en largeurs de photo ; chaque zone se fond dans la nuit, sans bord.
   */
  moon: [number, number, number];
  coast: [number, number, number, number];
  glint: [number, number, number, number];
  /** Teinte du ciel de la photo retirée avant de l'ajouter à la nuit (linéaire). */
  floor: number;
  /** Saturation de la lumière de la photo : un peu retenue, des lumières de ville plutôt que des flammes. */
  saturation: number;
}

/**
 * Photo recadrée (public/media/riviera-bay*.webp : 4 % → 74 % de sa hauteur). Repères, en part de la hauteur
 * recadrée depuis le haut : lune 0,253 ; horizon marin 0,65 ; lumières du cap Ferrat et port de Villefranche
 * juste dessous ; reflet de la lune jusqu'en bas. Placement desktop : la lune entre le titre et le véhicule, la
 * baie éclairée derrière son capot, l'horizon de la photo à hauteur d'œil — le port, en contrebas, se voit
 * au-delà du bord de mer.
 */
export const BAY: BayPlacement = {
  // Le port à gauche du capot, avec de l'air : jamais une lueur qui semble sortir du véhicule.
  azimuth: -149,
  width: 18,
  distance: 55,
  horizon: 0.65,
  eye: 1.5,
  level: 0.85,
  // La lune : un rayon large, fondu dès le centre — son halo s'éteint comme dans le ciel, sans disque.
  moon: [0.427, 0.747, 0.3],
  // Rayon < distance au bord droit de la photo : la côte s'éteint avant lui, jamais coupée net.
  coast: [0.56, 0.257, 0.4, 0.17],
  glint: [0.43, 0.171, 0.12, 0.2],
  floor: 0.07,
  saturation: 0.7,
};

/**
 * Mobile (portrait, champ étroit) : la photo dans l'axe du premier plan, la lune au-dessus du véhicule ; la
 * côte un peu au-dessus de l'horizon de la scène (collines du cap Ferrat), avec du ciel entre elle et le toit.
 */
export const BAY_MOBILE: BayPlacement = { ...BAY, azimuth: -131, width: 14, eye: 4.3, glint: [0.43, 0.21, 0.1, 0.12] };

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uLevel;
uniform float uFloor;  // teinte du ciel nocturne de la photo, retirée : seule la lumière s'ajoute à la scène
uniform float uSaturation;
uniform float uAspect; // hauteur / largeur de la photo
uniform vec3 uMoon;    // lune : centre (x, y), rayon — en largeurs de photo
uniform vec4 uCoast;   // côte éclairée : centre (x, y), rayons (x, y)
uniform vec4 uGlint;   // reflet de la lune : centre (x, y), rayons (x, y)
varying vec2 vUv;

float zone(vec2 center, vec2 radii, float inner) {
  return 1.0 - smoothstep(inner, 1.0, length((vUv - center) * vec2(1.0, uAspect) / radii));
}

void main() {
  // La photo n'apporte que sa lumière (mélange additif) : sans la teinte de son ciel, ses zones sombres
  // n'ajoutent rien — ni cadre, ni disque, ni tache ; la lune, la côte et les reflets s'ajoutent à la nuit.
  vec3 light = max(texture2D(uMap, vUv).rgb - uFloor, 0.0) * uLevel;
  light = mix(vec3(dot(light, vec3(0.2126, 0.7152, 0.0722))), light, uSaturation);
  // Seules la lune, la côte et le reflet sont pris à la photo (le premier plan, arbres et rive, est écarté).
  float weight = max(max(zone(uMoon.xy, uMoon.zz, 0.0), zone(uCoast.xy, uCoast.zw, 0.5)), zone(uGlint.xy, uGlint.zw, 0.0));
  weight *= smoothstep(0.0, 0.04, vUv.x) * smoothstep(0.0, 0.04, 1.0 - vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(0.0, 0.04, 1.0 - vUv.y);
  gl_FragColor = vec4(light, weight);
  #include <colorspace_fragment>
}`;

/** `image` : ImageBitmap créée retournée (imageOrientation: 'flipY'), comme l'attend WebGL. */
export function createBay(image: ImageBitmap, anisotropy: number) {
  const texture = new Texture(image);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;

  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uLevel: { value: BAY.level },
      uFloor: { value: BAY.floor },
      uSaturation: { value: BAY.saturation },
      uAspect: { value: image.height / image.width },
      uMoon: { value: new Vector3(...BAY.moon) },
      uCoast: { value: new Vector4(...BAY.coast) },
      uGlint: { value: new Vector4(...BAY.glint) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const aspect = image.height / image.width;
  const mesh = new Mesh(new PlaneGeometry(1, aspect), material);
  mesh.renderOrder = -1;

  let placement = BAY;
  const place = (next: Partial<BayPlacement> = {}) => {
    placement = { ...placement, ...next };
    const { azimuth, width, distance, horizon, eye, level, moon, coast, glint, floor, saturation } = placement;
    material.uniforms.uFloor.value = floor;
    material.uniforms.uSaturation.value = saturation;
    material.uniforms.uMoon.value.set(...moon);
    material.uniforms.uCoast.value.set(...coast);
    material.uniforms.uGlint.value.set(...glint);
    const size = 2 * distance * Math.tan(MathUtils.degToRad(width / 2));
    const az = MathUtils.degToRad(azimuth);
    mesh.scale.set(size, size, 1);
    // L'horizon de la photo à hauteur d'œil ; le plan tourné vers l'origine de la scène.
    mesh.position.set(Math.cos(az) * distance, eye - size * aspect * (0.5 - horizon), Math.sin(az) * distance);
    mesh.lookAt(0, mesh.position.y, 0);
    material.uniforms.uLevel.value = level;
    return placement;
  };
  place();
  return { mesh, texture, material, place };
}
