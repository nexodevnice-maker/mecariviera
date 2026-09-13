import type { StopKey, Vec3 } from './rigs';

export type VehicleId = 'c63' | 'rs3' | 'm4';

/** Téléphone, arrêt Échappement : les sorties (centre de chaque embout, à son débouché) et la taille d'un embout (m). */
export interface Exhaust {
  tips: Vec3[];
  size: [number, number];
}

export interface Vehicle {
  id: VehicleId;
  /** Silhouette, jamais la marque : aucune affiliation constructeur suggérée. */
  label: string;
  file: string;
  /** Ajustement des points désignés par le trait de rappel (dimensions propres au modèle). */
  anchors?: Partial<Record<StopKey, Vec3>>;
  /** Sorties d'échappement, relevées sur les modèles -m (géométrie des embouts). */
  exhaust: Exhaust;
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'c63',
    label: 'Coupé',
    file: 'c63',
    // Quatre embouts trapézoïdaux, deux de chaque côté.
    exhaust: {
      tips: [[-0.59, 0.343, -2.31], [-0.455, 0.348, -2.337], [0.455, 0.348, -2.337], [0.59, 0.343, -2.31]],
      size: [0.13, 0.065],
    },
  },
  {
    id: 'rs3',
    label: 'Berline',
    file: 'rs3',
    anchors: { front: [0.25, 0.38, 2.27], rear: [0.45, 0.33, -2.2] },
    // Deux sorties ovales, deux tubes dans chacune.
    exhaust: {
      tips: [[-0.53, 0.332, -2.236], [-0.46, 0.332, -2.236], [0.46, 0.332, -2.236], [0.53, 0.332, -2.236]],
      size: [0.065, 0.07],
    },
  },
  {
    id: 'm4',
    label: 'Sportive',
    file: 'm4',
    anchors: { wheel: [0.86, 0.45, 1.45], front: [0.25, 0.38, 2.39], rear: [0.42, 0.3, -2.36] },
    // Quatre sorties rondes, groupées au milieu du diffuseur.
    exhaust: {
      tips: [[-0.387, 0.29, -2.357], [-0.272, 0.292, -2.366], [0.272, 0.292, -2.366], [0.387, 0.29, -2.357]],
      size: [0.085, 0.085],
    },
  },
];

export const VEHICLE_IDS = VEHICLES.map((v) => v.id);

export const vehicleById = (id: VehicleId) => VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];

/** Variante mobile (-m) plus légère sous 900 px. */
export const vehicleUrl = (id: VehicleId, narrow: boolean) => `/3d/${vehicleById(id).file}${narrow ? '-m' : ''}.glb`;

/**
 * Véhicule de la visite : tiré au hasard (1 chance sur 3). `?vehicle=c63|rs3|m4` le fixe
 * (captures, contrôle). Le tirage est fait une seule fois, par le script en ligne du hero
 * (qui choisit aussi l'affiche) ; cette fonction n'est qu'un repli.
 */
export function pickVehicle(search = location.search): VehicleId {
  const asked = new URLSearchParams(search).get('vehicle') as VehicleId | null;
  if (asked && VEHICLE_IDS.includes(asked)) return asked;
  return VEHICLE_IDS[Math.floor(Math.random() * VEHICLE_IDS.length)];
}
