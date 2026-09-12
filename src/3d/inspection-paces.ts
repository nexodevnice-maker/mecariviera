import type { Pace } from './rigs';

/**
 * Rythme de chaque segment de l'inspection (celui qui mène à l'arrêt ; voir rigs.ts) : partagé par la scène
 * 3D et par les légendes mobiles, sans charger Three.js.
 */
export const INSPECTION_PACES: Record<string, Pace | undefined> = {
  releve: undefined,
  // Le balayage occupe presque tout le segment (la ligne avance à vitesse constante).
  capot: { window: [0.05, 0.95] },
  // Mises au point : courtes, le regard saute d'une pièce à l'autre.
  huile: { window: [0.3, 0.75] },
  refroidissement: { window: [0.3, 0.75] },
  frein: { window: [0.3, 0.75] },
  // Le bloc entier : un recul plus ample.
  moteur: { window: [0.2, 0.85] },
  // Prendre de la hauteur : départ au quart du segment (le bloc moteur a le temps d'être lu), arrivée avant
  // sa fin — un temps d'arrêt sur la voiture devenue point.
  depart: { window: [0.25, 0.85] },
};
