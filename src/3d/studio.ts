/**
 * Studio de nuit : un plafond diffus, de longues bandes pour dessiner la carrosserie, une touche bleue.
 * Données partagées entre la scène (calcul de repli) et le pré-calcul de l'environnement
 * (scripts/bake-env.mjs) : modifier un panneau ici, puis relancer `npm run assets:env`.
 */
export interface Panel {
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  color: number;
  power: number;
}

const HALF_PI = Math.PI / 2;
export const STUDIO_BLUE = 0x2455ff;

export const STUDIO_PANELS: Panel[] = [
  { size: [20, 20], position: [0, 9, 0], rotation: [HALF_PI, 0, 0], color: 0xffffff, power: 0.35 },
  { size: [2.4, 14], position: [0, 6.5, 0], rotation: [HALF_PI, 0, 0], color: 0xffffff, power: 6 },
  { size: [1, 12], position: [-3.2, 6, 0], rotation: [HALF_PI, 0, 0], color: 0xffffff, power: 3 },
  { size: [12, 1], position: [-8, 2.4, 0], rotation: [0, HALF_PI, 0], color: 0xffffff, power: 2.5 },
  { size: [12, 0.8], position: [8, 1.6, 0], rotation: [0, -HALF_PI, 0], color: STUDIO_BLUE, power: 6 },
  { size: [6, 0.6], position: [0, 1.2, 10], rotation: [0, Math.PI, 0], color: 0xffffff, power: 2 },
  { size: [6, 0.5], position: [0, 1.5, -10], rotation: [0, 0, 0], color: 0xffffff, power: 2 },
];

/** Environnement pré-calculé : PMREM au format CubeUV de Three.js, encodé en Radiance HDR (RGBE). */
export const STUDIO_ENV_URL = '/3d/studio-env.hdr';
export const STUDIO_ENV_SIGMA = 0.02;
export const STUDIO_ENV_SIZE = 256;
