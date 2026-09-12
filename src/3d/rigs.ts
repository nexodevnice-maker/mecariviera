/**
 * Cadrages caméra par arrêt de la scène, en mètres.
 * Repère des modèles : avant du véhicule vers +Z, côté conducteur vers +X, origine au sol, au centre.
 */
export type Vec3 = [number, number, number];

export interface Framing {
  position: Vec3;
  target: Vec3;
  /**
   * Décalage de l'image pour libérer la zone de texte.
   * Desktop : part de la largeur, vers la droite. Mobile : part de la hauteur, vers le haut.
   */
  shift: number;
}

/**
 * Rythme d'un segment : comment la caméra rejoint ce cadrage depuis le précédent. `window` : part du
 * segment de scroll pendant laquelle elle bouge (avant, elle tient le cadrage précédent ; après, elle est
 * arrivée) ; `ease` : `inOut` part et se pose en douceur, `out` part tout de suite et se pose longuement,
 * `in` s'éloigne en accélérant, `linear` avance à vitesse constante (balayage).
 */
export interface Pace {
  window: [number, number];
  ease?: 'inOut' | 'out' | 'in' | 'linear';
}

export interface Shot extends Framing {
  /** Point du véhicule désigné par le trait de rappel (zone du service). */
  anchor?: Vec3;
  mobile?: Partial<Framing>;
  pace?: Pace;
  /** Extinction : part du segment pendant laquelle les lumières s'éteignent (les phares, puis tout). */
  lightsOut?: [number, number];
}

const EASE = {
  inOut: (x: number) => x * x * x * (x * (x * 6 - 15) + 10),
  out: (x: number) => 1 - (1 - x) ** 3,
  in: (x: number) => x * x * x,
  linear: (x: number) => x,
};

/** Rythme par défaut : palier de lecture, déplacement adouci. */
export const DEFAULT_PACE: Pace = { window: [0.18, 0.82] };

/**
 * Téléphone, pas guidés (motion/guide.ts) : chaque geste mène d'un arrêt au suivant et la lecture se fait à
 * l'arrêt — le mouvement occupe tout le pas, avec la même courbe.
 */
export function guidedPace(pace?: Pace): Pace {
  return { window: [0.04, 0.96], ease: pace?.ease };
}

/** Avancement (0–1) de la caméra dans un segment de scroll, selon le rythme du cadrage visé. */
export function paced(fraction: number, pace: Pace = DEFAULT_PACE) {
  const [a, b] = pace.window;
  const x = Math.min(Math.max((fraction - a) / (b - a), 0), 1);
  return EASE[pace.ease ?? 'inOut'](x);
}

/** Variante mobile d'un cadrage : le même regard, un pas en arrière et un peu plus haut (portrait). */
function back(position: Vec3, target: Vec3, k = 1.35, up = 0.3): Vec3 {
  return [
    target[0] + (position[0] - target[0]) * k,
    target[1] + (position[1] - target[1]) * k + up,
    target[2] + (position[2] - target[2]) * k,
  ];
}

function shot(position: Vec3, target: Vec3, shift: number, extra: Partial<Shot> = {}): Shot {
  return { position, target, shift, mobile: { position: back(position, target), shift: 0.22 }, ...extra };
}

export type StopKey = 'hero' | 'overview' | 'engine' | 'wheel' | 'front' | 'cockpit' | 'rear' | 'night';

/**
 * Le regard du mécanicien. Il arrive par la route, s'approche à pied, puis fait le tour du véhicule
 * côté conducteur, à hauteur d'homme (debout 1,5 à 2 m, accroupi 0,7 m) : face avant, capot, roue,
 * poste de conduite, arrière. La voiture ne bouge jamais ; c'est lui qui vient.
 */
export const RIGS: Record<'c63', Record<StopKey, Shot>> = {
  c63: {
    // Arriver : depuis la route, à hauteur de conducteur ; la voiture garée sur la corniche, la baie derrière.
    // (Mobile : de plus loin, là où s'arrête le véhicule du mécanicien, debout sur la route — l'horizon descend,
    // la lune et la baie tiennent au-dessus du toit, avec du ciel entre eux ; le texte dessous ; l'approche
    // devient une marche.)
    hero: {
      position: [6.86, 1.38, 8.22],
      target: [0.1, 0.6, 0],
      shift: 0.28,
      mobile: { position: [14.08, 2.3, 16.9], target: [0, 0.6, 0], shift: 0.12 },
    },
    // S'approcher : à pied, dans l'axe des phares ; départ au premier pixel, arrivée longuement posée.
    overview: shot([3.7, 1.62, 4.6], [0.3, 0.75, 0.9], 0.25, { pace: { window: [0, 0.9], ease: 'out' } }),
    // Face avant : un pas de côté, devant la calandre.
    front: shot([1.2, 1.5, 5.6], [0.15, 0.62, 2.3], 0.26, { anchor: [0.25, 0.38, 2.38], pace: { window: [0.3, 0.72] } }),
    // Capot : à l'angle avant, un pas en retrait, le regard vers le bas — capot et pare-brise dans le cadre.
    // (Deux services à lire : le mouvement s'achève plus tôt, le palier dure.)
    engine: shot([2.5, 2.3, 4.3], [0.25, 0.85, 1.2], 0.25, {
      anchor: [0, 1.02, 1.6],
      pace: { window: [0.2, 0.7] },
      mobile: { position: back([2.5, 2.3, 4.3], [0.25, 0.85, 1.2], 1.55), shift: 0.22 },
    }),
    // Roue : s'accroupir devant la roue avant — lentement, puis rester (deux services à lire).
    wheel: shot([2.55, 0.72, 2.45], [0.85, 0.42, 1.35], 0.3, { anchor: [0.86, 0.45, 1.38], pace: { window: [0.2, 0.8] } }),
    // Poste de conduite : se relever, regarder par la vitre conducteur.
    cockpit: shot([2.35, 1.5, 0.35], [0.1, 1.0, 0.45], 0.24, { anchor: [0.3, 0.95, 0.15], pace: { window: [0.25, 0.85] } }),
    // Arrière : longer le flanc jusqu'à l'échappement, un peu accroupi.
    // (Mobile : la cible remonte sur l'arrière du véhicule, sinon il sort du haut du cadre portrait.)
    rear: shot([2.2, 0.95, -4.2], [0.4, 0.42, -2.25], 0.3, {
      anchor: [0.45, 0.33, -2.3],
      pace: { window: [0.2, 0.85] },
      mobile: { position: back([2.2, 0.95, -4.2], [0.3, 0.75, -1.9]), target: [0.3, 0.75, -1.9], shift: 0.22 },
    }),
    // Revenir à l'avant pour ouvrir le capot — au cadrage du premier plan de l'inspection. Les phares
    // s'éteignent, puis tout : le silence avant la section Méthode, qui s'ouvre sur le même noir. (Départ au
    // tiers du segment : l'arrière a le temps d'être lu.)
    night: shot([1.78, 2.3, 5.66], [0.33, 0.6, 0.21], 0.24, { pace: { window: [0.3, 0.85] }, lightsOut: [0.4, 1] }),
  },
};
