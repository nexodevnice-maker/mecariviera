/**
 * Source unique du contenu MECA RIVIERA.
 *
 * Chaque information factuelle porte un statut (cf. MECA_RIVIERA_REFERENTIELS/04_CONTENT) :
 * - CONFIRMED  : fourni / vérifié par une source fiable du projet ;
 * - TO_CONFIRM : plausible, affichable en prototype, à valider avant publication ;
 * - UNKNOWN    : absent — jamais affiché ;
 * - REQUIRED_BEFORE_PUBLICATION : indispensable avant la mise en ligne commerciale.
 *
 * `npm run content:check` liste tout ce qui reste à valider avant mise en ligne.
 */

export type Status = 'CONFIRMED' | 'TO_CONFIRM' | 'UNKNOWN' | 'REQUIRED_BEFORE_PUBLICATION';

export interface Fact<T> {
  value: T;
  status: Status;
  source: string;
  note?: string;
}

const flyer = 'flyer MECA RIVIERA (transcription référentiel V2)';
const porteur = 'validation du porteur (formulaire du 11/09/2026)';

export const brand = {
  name: { value: 'MECA RIVIERA', status: 'CONFIRMED', source: 'référentiels V2.1' },
  activity: { value: 'Mécanique automobile à domicile', status: 'CONFIRMED', source: 'référentiels V2.1 + flyer' },
  promise: { value: 'La mécanique vient à votre véhicule.', status: 'CONFIRMED', source: 'positionnement référentiels V2.1' },
} satisfies Record<string, Fact<string>>;

export interface Phone {
  display: string;
  href: string;
}

export const contact = {
  phones: {
    value: [
      { display: '06 35 27 73 69', href: 'tel:+33635277369' },
      { display: '07 67 97 53 67', href: 'tel:+33767975367' },
    ],
    status: 'CONFIRMED',
    source: porteur,
    note: 'Les deux numéros sont affichés ; 06 35 27 73 69 en principal.',
  } satisfies Fact<Phone[]>,
  availability: { value: '24 h/24 — 7 j/7', status: 'CONFIRMED', source: porteur } satisfies Fact<string>,
  snapchat: { value: 'mecariviera26', status: 'CONFIRMED', source: porteur } satisfies Fact<string | null>,
  email: { value: null, status: 'CONFIRMED', source: porteur, note: 'Pas d’e-mail pour l’instant.' } satisfies Fact<string | null>,
  /** Numéro qui reçoit les demandes écrites du formulaire (SMS) : le numéro principal (décision du 12/09/2026). */
  requests: {
    value: { display: '06 35 27 73 69', href: 'sms:+33635277369' },
    status: 'CONFIRMED',
    source: porteur,
    note: 'Réception des demandes par SMS au numéro principal (demande du porteur du 12/09/2026 ; historique dans DECISIONS.md).',
  } satisfies Fact<Phone>,
};

export interface Town {
  name: string;
  /** Coordonnées approximatives du centre-ville (WGS84), pour la carte schématique. */
  lat: number;
  lon: number;
}

export const zone = {
  area: { value: 'Alpes-Maritimes (06)', status: 'CONFIRMED', source: porteur } satisfies Fact<string>,
  towns: {
    value: [
      { name: 'Nice', lat: 43.7031, lon: 7.2661 },
      { name: 'Cagnes-sur-Mer', lat: 43.6644, lon: 7.1489 },
      { name: 'Villeneuve-Loubet', lat: 43.659, lon: 7.122 },
      { name: 'Antibes', lat: 43.5808, lon: 7.1239 },
    ],
    status: 'CONFIRMED',
    source: porteur,
    note: '« Villeneuve » du flyer = Villeneuve-Loubet (confirmé).',
  } satisfies Fact<Town[]>,
  surroundings: { value: 'et alentours', status: 'CONFIRMED', source: porteur } satisfies Fact<string>,
};

/** Zone du véhicule sur laquelle la caméra 3D s'arrête pour un service. */
export type CarZone = 'engine' | 'wheel' | 'front' | 'cockpit' | 'rear';

export interface Service {
  id: string;
  label: string;
  /** Ce que vit le client — formulé comme un symptôme, pas comme une promesse. */
  symptom: string;
  /** Ce que MECA RIVIERA fait. */
  intervention: string;
  items: string[];
  zone: CarZone | null;
  status: Status;
  source: string;
}

export const services: Service[] = [
  {
    id: 'entretien',
    label: 'Entretien & révision',
    symptom: 'La vidange approche, le voyant d’entretien s’allume, la révision est due.',
    intervention: 'Vidange, remplacement des filtres et révision selon les préconisations du constructeur.',
    items: ['Vidange', 'Filtres', 'Révision constructeur'],
    zone: 'engine',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'batterie',
    label: 'Batterie & démarrage',
    symptom: 'La voiture ne démarre plus, ou peine à démarrer le matin.',
    intervention: 'Contrôle de la batterie, du démarrage et de la charge ; remplacement si nécessaire.',
    items: ['Batterie', 'Démarrage', 'Charge'],
    zone: 'engine',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'freinage',
    label: 'Freinage',
    symptom: 'Ça grince, la pédale vibre, le freinage s’allonge.',
    intervention: 'Contrôle et remplacement des plaquettes et des disques.',
    items: ['Plaquettes', 'Disques'],
    zone: 'wheel',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'suspension',
    label: 'Suspension & train avant',
    symptom: 'La voiture tire d’un côté, tape sur les bosses ou flotte en virage.',
    intervention: 'Amortisseurs et éléments de train avant.',
    items: ['Amortisseurs', 'Train avant'],
    zone: 'wheel',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'climatisation',
    label: 'Climatisation',
    symptom: 'La clim souffle tiède ou dégage une mauvaise odeur.',
    intervention: 'Entretien et recharge du circuit de climatisation.',
    items: ['Entretien', 'Recharge'],
    zone: 'front',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic',
    symptom: 'Un voyant s’allume, un bruit inhabituel, une perte de puissance.',
    intervention: 'Recherche de l’origine du problème, toutes marques, avant d’intervenir.',
    items: ['Toutes marques', 'Voyants', 'Pannes'],
    zone: 'cockpit',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'echappement',
    label: 'Échappement',
    symptom: 'Bruit anormal, odeur, voyant antipollution.',
    intervention: 'Ligne d’échappement et catalyseur.',
    items: ['Ligne', 'Catalyseur'],
    zone: 'rear',
    status: 'CONFIRMED',
    source: porteur,
  },
  {
    id: 'depannage',
    label: 'Dépannage',
    symptom: 'Véhicule immobilisé.',
    intervention: 'Dépannage sur place.',
    items: ['Sur place'],
    zone: null,
    status: 'CONFIRMED',
    source: porteur,
  },
];

export interface Step {
  title: string;
  text: string;
}

export const method: Fact<Step[]> = {
  value: [
    { title: 'Vous appelez', text: 'Le véhicule, le problème, l’adresse. Un appel suffit pour commencer.' },
    { title: 'On convient de l’intervention', text: 'Le lieu, le créneau et la nature de l’intervention sont fixés ensemble.' },
    { title: 'On intervient chez vous', text: 'L’outillage et les pièces viennent au véhicule. Pas de garage, pas de dépôt.' },
    { title: 'On vous explique', text: 'Ce qui a été constaté, ce qui a été fait, ce qu’il faudra surveiller.' },
  ],
  status: 'CONFIRMED',
  source: porteur,
};

/** Pièces désignées pendant l'inspection 3D du scan réel (section Méthode), dans l'ordre du scroll. */
export type InspectionKey = 'capot' | 'huile' | 'refroidissement' | 'frein' | 'moteur';

export interface InspectionStep {
  key: InspectionKey;
  zone: string;
  title: string;
  text: string;
  /** Service confirmé auquel la pièce se rattache. */
  service?: string;
}

export const inspection: Fact<InspectionStep[]> = {
  value: [
    {
      key: 'capot',
      zone: 'Compartiment moteur',
      title: 'Capot ouvert',
      text: 'Sur place, le capot s’ouvre et le compartiment moteur se lit d’un coup d’œil : niveaux, fuites, durites, état général.',
    },
    {
      key: 'huile',
      zone: 'Huile moteur',
      title: 'Jauge et remplissage d’huile',
      text: 'Le niveau se lit à la jauge ; l’huile neuve passe par le bouchon de remplissage. C’est le cœur d’une vidange.',
      service: 'Entretien & révision',
    },
    {
      key: 'refroidissement',
      zone: 'Refroidissement',
      title: 'Liquide de refroidissement',
      text: 'Le vase d’expansion montre le niveau du circuit. Il se contrôle moteur froid.',
      service: 'Entretien & révision',
    },
    {
      key: 'frein',
      zone: 'Freinage',
      title: 'Liquide de frein',
      text: 'Son réservoir se trouve près du tablier : niveau et état se vérifient avant toute intervention sur les freins.',
      service: 'Freinage',
    },
    {
      key: 'moteur',
      zone: 'Moteur',
      title: 'Bloc moteur',
      text: 'Bruit inhabituel, voyant, perte de puissance : le diagnostic part d’ici, toutes marques.',
      service: 'Diagnostic',
    },
  ],
  status: 'TO_CONFIRM',
  source: 'textes de l’inspection 3D (section Méthode) — à relire par le porteur',
};

export interface Credit {
  title: string;
  author: string;
  license: string;
  url: string;
}

/**
 * Attribution des modèles 3D (obligation de licence). « Modifié » : optimisation et matériaux. Conservée pour
 * la traçabilité ; plus affichée dans la maquette (voir publication.creditsDisplay).
 */
export const credits: Credit[] = [
  {
    title: 'App Trnio Plus test voiture Arnaud',
    author: 'Christopher.Thy',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/app-trnio-plus-test-voiture-arnaud-8b01b3459bb14f008d2c5122c8d50aa8',
  },
  {
    title: '2023 Audi RS3 Sedan performance',
    author: 'Ddiaz Design',
    license: 'CC BY-NC-SA 4.0',
    url: 'https://sketchfab.com/3d-models/2023-audi-rs3-sedan-performance-baeb16a9d4234577a0a2ebea8a9e380e',
  },
  {
    title: '2017 Mercedes-Benz C63 AMG Coupe',
    author: 'Ddiaz Design',
    license: 'CC BY-NC-SA 4.0',
    url: 'https://sketchfab.com/3d-models/2017-mercedes-benz-c63-amg-coupe-3493e64daddc4c258280bab7bfbe7361',
  },
  {
    title: '2022 BMW M4 CSL',
    author: 'Ddiaz Design',
    license: 'CC BY-NC-SA 4.0',
    url: 'https://sketchfab.com/3d-models/2022-bmw-m4-csl-cbd90adb3b2c4af28da1ede516d55b79',
  },
];

/** Éléments à réunir avant la mise en ligne commerciale (09_GATES/PUBLICATION_READINESS). */
export const publication = {
  operator: {
    value: null,
    status: 'REQUIRED_BEFORE_PUBLICATION',
    source: porteur,
    note: 'Activité en cours de création : identité de l’exploitant, forme juridique et SIREN à fournir (mentions légales).',
  },
  legalNotice: {
    value: null,
    status: 'REQUIRED_BEFORE_PUBLICATION',
    source: porteur,
    note: 'Adresse à fournir plus tard ; page Mentions légales (éditeur, hébergeur).',
  },
  privacy: {
    value: null,
    status: 'REQUIRED_BEFORE_PUBLICATION',
    source: porteur,
    note: 'Contact données personnelles : l’exploitant. Page Politique de confidentialité à rédiger.',
  },
  formDestination: {
    value: 'SMS au 06 35 27 73 69',
    status: 'CONFIRMED',
    source: porteur,
    note: 'Le formulaire rédige un SMS vers contact.requests ; PUBLIC_FORM_ENDPOINT reste possible plus tard.',
  },
  domain: {
    value: 'https://nexodev.pages.dev',
    status: 'CONFIRMED',
    source: porteur,
    note: 'Adresse de production (Cloudflare Pages, branche main), déclarée dans `site` (astro.config.mjs). Si un domaine propre est acheté : changer `site` et la ligne Sitemap de public/robots.txt.',
  },
  logo: {
    value: 'Signe provisoire (deux traits obliques)',
    status: 'CONFIRMED',
    source: porteur,
    note: 'Signe provisoire conservé.',
  },
  creditsDisplay: {
    value: null,
    status: 'REQUIRED_BEFORE_PUBLICATION',
    source: porteur,
    note: 'Maquette de démonstration : crédits 3D retirés de l’affichage (demande du porteur du 12/09/2026). Avant toute mise en ligne publique ou commerciale : licences acquises ou vérifiées, attribution rétablie si la licence l’exige (CC BY, CC BY-NC-SA) — la clause NC exclut un usage commercial en l’état.',
  },
  modelLicenses: {
    value: 'C63, M4, RS3 : CC BY-NC-SA 4.0 — scan A1 : CC BY 4.0',
    status: 'CONFIRMED',
    source: porteur,
    note: 'Utilisation des 4 modèles confirmée par le porteur (DECISIONS.md).',
  },
} satisfies Record<string, Fact<string | null>>;
