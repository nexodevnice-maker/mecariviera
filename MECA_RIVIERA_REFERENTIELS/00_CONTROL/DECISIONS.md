# MECA RIVIERA — DECISIONS V2.1

## Identité
- Marque / activité : MECA RIVIERA
- Racine projet : `MecaRiviera`
- Présence actuelle : Snapchat
- Ambition : ouverture / structuration d'une entreprise
- Positionnement : mécanique automobile à domicile

## Conséquence
Le produit est développé avec les standards d'un futur site professionnel d'entreprise, mais aucune donnée juridique ou administrative n'est inventée.

## Direction
Automobile premium, technique, locale, directe.
Palette de référence issue des supports existants : noir, blanc, bleu électrique, accent rouge utilisé avec retenue.

## Principe commercial
Le bénéfice client doit être compris très vite : intervention au lieu où se trouve le véhicule, simplicité, rapidité, proximité et sérieux.

## Assets
Les modèles 3D existants sont des assets visuels. Leur présence ne doit pas être utilisée pour suggérer une affiliation officielle avec Audi, BMW ou Mercedes.

### 2026-09-11 — Utilisation des 4 modèles 3D (décision du porteur)
Constat technique (métadonnées embarquées dans les GLB) :
- `AUDI_CAPOT_OUVERT` — « App Trnio Plus test voiture Arnaud », Christopher.Thy, **CC-BY-4.0** (scan photogrammétrique d'une Audi A1 réelle).
- `C63`, `M4`, `RS3` — Ddiaz Design (Sketchfab), **CC-BY-NC-SA-4.0** ; noms de matériaux issus de jeux vidéo (`RewardRecycled`, `nfsM_`).

Décision du porteur : les 4 modèles sont utilisés sur le site (« libres de droits »).
Mesures appliquées : crédit auteur + licence affichés sur le site, aucune mise en avant de logos, aucune formulation suggérant une affiliation constructeur.

### 2026-09-11 — Architecture du premier vertical slice
- **Stack** : Astro 7 (sortie statique, contenu en HTML indexable), TypeScript, Three.js 0.186 chargé en différé. Pas de GSAP ni de Lenis : scroll natif et pilote de progression maison (`src/motion/stage-progress.ts`).
- **Scène** : une seule scène WebGL. C63 retenue (bleu électrique, étriers rouges, jantes noires : la palette MECA RIVIERA). La caméra fait le tour du véhicule ; les arrêts découlent des services (`zone` dans `src/content/site.ts`) et un trait de rappel désigne la zone concernée.
- **Scan A1** : restitué en relevé 3D (nuage de points précalculé, compartiment moteur en bleu). La texture photogrammétrique, trop bruitée, donnait une lecture d'épave.
- **Performance** : environnement de studio précalculé (`public/3d/studio-env.hdr`, format CubeUV), shaders compilés en parallèle, textures envoyées au GPU progressivement, géométrie décodée en workers, logos et textures invisibles retirés au pipeline. TBT mesuré : 12,9 s → ~1,5 s (desktop), 7,2 s → ~1,8 s (mobile bridé).
- **Contenu** : statuts de vérité dans `src/content/site.ts` ; `npm run content:check` sert de gate de publication.
- **Formulaire** : mode test tant que `PUBLIC_FORM_ENDPOINT` n'est pas défini (aucun envoi réseau), transmission par SMS proposée à l'utilisateur.
- **Pré-lancement** : `noindex` tant que `PUBLIC_INDEXABLE` ≠ `true`.

### 2026-09-11 — Affiche, sélecteur de véhicule, logos
- **Affiche du hero** : image fixe capturée sur la scène réelle (10–15 Ko), affichée immédiatement puis relayée par la 3D ; c'est aussi le repli sans WebGL ou en économie de données.
- **M4 et RS3** : elles servent le message « toutes marques » via un sélecteur « Votre véhicule » dans le hero. Libellés par silhouette (Coupé, Berline, Sportive), jamais par marque. La C63 reste le véhicule par défaut (palette MECA RIVIERA). Modèles chargés à la demande seulement.
- **Logos** retirés au pipeline, qu'ils soient des pièces à part (« badge », « plate »), modélisés dans une garniture (coffre RS3) ou imprimés dans un atlas de texture (jantes RS3 et M4). Aucune mention de marque ni d'affiliation.
- **Peintures jamais simplifiées** : le vernis révèle la moindre irrégularité de maillage.

### 2026-09-11 — Retours du porteur (formulaire de validation, 23 questions)
Remplace le sélecteur « Votre véhicule » et le relevé A1 en nuage de points décrits plus haut.
- **Véhicule du hero tiré au hasard** à chaque arrivée (1 chance sur 3 : C63, RS3, M4) ; le sélecteur est retiré. Un script en ligne choisit le véhicule avant le premier affichage, et l'affiche fixe correspond toujours au modèle tiré. `?vehicle=c63|rs3|m4` force le choix (QA).
- **Demandes écrites reçues par SMS au 07 53 81 05 08** (numéro non affiché). Tant qu'aucun `PUBLIC_FORM_ENDPOINT` n'est défini, le formulaire prépare le SMS dans l'application de l'utilisateur : aucun envoi réseau, aucun endpoint fictif.
- **Contact** : 06 35 27 73 69 (principal) et le second numéro affichés, disponibilité 24 h/24 — 7 j/7, Snapchat @mecariviera26, pas d'e-mail. Zone : Menton → Villeneuve-Loubet et alentours ; dépannage sur place.
- **Crédits 3D** : titre, auteur et licence en texte seul, sans lien.
- **Méthode : inspection 3D du scan réel de l'A1** (capot ouvert), pilotée par le scroll. La voiture reste sombre et désaturée (ce qui masque les défauts de la photogrammétrie). Un plan de scan la balaie de l'arrière vers l'avant, puis une lampe d'inspection éclaire en couleurs réelles chaque pièce sous le capot : compartiment, huile (jauge, remplissage), refroidissement (vase d'expansion), liquide de frein, bloc moteur. Les pièces ont été relevées par lancer de rayons sur le scan ; la batterie, non visible sur le scan, n'est pas désignée. Chargement à l'approche de la section ; une capture du premier arrêt sert d'image d'attente et de repli sans WebGL (le relevé en nuage de points est retiré).
- **Scan A1 nettoyé au pipeline** : plaques d'immatriculation avant et arrière (donnée personnelle) avec le cadre du vendeur, anneaux de calandre et de hayon, monogrammes A1 et TDI, logo et sigle du cache moteur, caches de roues. Ils sont effacés des textures (remplis de la teinte de leur pourtour) : ils ne figurent dans aucun fichier publié. Les textes de l'inspection sont nouveaux et restent `TO_CONFIRM`.
- **Statut** : activité en cours de création. Restent bloquants avant publication : identité de l'exploitant, adresse et mentions légales, politique de confidentialité, nom de domaine.

### 2026-09-11 — Passe de finition (demande du porteur : « tout premium »)
- **Hero, Riviera de nuit** : le fond de studio devient un horizon marin nocturne — ciel noir à peine voilé de bleu sur l'horizon, mer plus sombre et, au loin, les lumières d'une côte à flanc de collines (points nets, chauds et froids, avec leurs reflets), derrière le véhicule au premier arrêt. Absentes sur mobile, où l'horizon passe sous l'en-tête. Panorama et lumières sont générés au chargement (aucun fichier) et déterministes : les affiches restent identiques à la scène.
- **Méthode, véhicule capot ouvert** : volume par normales de facette (liseré froid sur la silhouette, léger zénith) ; lampe d'inspection en flaque de lumière (cœur légèrement chaud, halo diffus) au lieu d'une découpe ; introduction plus longue pour le balayage de la ligne de scan.
- **Rythme du scroll** : paliers plus longs à chaque arrêt, déplacements adoucis entre deux (hero et Méthode).
- **Zone** : carte de nuit — terre et mer distinguées, lignes de sonde issues du vrai trait de côte, graticule en degrés-minutes, coordonnées réelles des communes, échelle 5 km et nord, « Baie des Anges » ; zone couverte en halo discret ; la tournée se trace avec un point en tête (une seule horloge). Lisible sur mobile ; affichée sans script ou en mouvement réduit.
- **Ambiance** : grain argentique léger (desktop), lueurs froides et basses derrière la carte et le formulaire. Toujours ni glassmorphism, ni glow permanent, ni néon.
- **Déroulé** : numéros d'étape fins et larges — la séquence se lit d'un coup d'œil.

### 2026-09-12 — V2.3 : autopsie et recomposition cinématographique
Verdict de l'autopsie (M01) : une présentation de produit — des sections premium reliées par du scroll
(scène → transition → scène), la voiture exposée plutôt qu'observée. Principe retenu : **la voiture ne bouge
pas ; la caméra est le regard du mécanicien qui vient à elle.** Chaque passage devient état → événement →
conséquence. Remplace, pour le parcours, les descriptions de la passe de finition ci-dessus.
- **Lieu (M02)** : la voiture est garée la nuit au bord de la mer — bitume à grain de matière, bordure et
  trottoir, la mer noire au-delà, lampadaires de la promenade. Les phares du mécanicien arrivent au premier
  écran et portent l'ombre de la voiture (calcul direct, sans boucle : +1 à 3 ms mesurés, contre +5 à 19 ms
  pour une première version abandonnée). Ni parking, ni garage, ni rue de jeu vidéo. L'affiche du hero montre
  la nuit avant l'arrivée des phares.
- **Rythme (M03)** : chaque segment a sa fenêtre et sa courbe (départ immédiat, accroupissement lent, pas
  rapide, longue marche latérale) et chaque arrêt sa longueur de scroll (`--span`) : plus de métronome.
- **Caméra (M04)** : le tour à hauteur d'homme — approche, face avant, capot, roue (accroupi), vitre, arrière —,
  chaque plan avec son intention écrite dans `src/3d/rigs.ts`. Services en symptôme → service → intervention,
  sans puces ni bouton répété à chaque arrêt ; voile sous la colonne de texte en desktop.
- **Rupture (M05)** : les phares s'éteignent, la scène se fond au noir, un temps de silence, puis le titre
  Méthode sur le même noir ; la ligne de scan fait apparaître l'A1 réelle (rien n'existe avant son passage).
  L'affiche de Méthode ne sert plus qu'au repli sans 3D.
- **Inspection (M06)** : sous la lampe, la pièce domine et le reste s'éteint (jauge, vase d'expansion, liquide
  de frein ; isolement partiel pour le bloc moteur). Aucun HUD, un seul trait de rappel.
- **Territoire (M07)** : l'inspection s'achève en prenant de la hauteur — vue d'en haut, la voiture devient un
  point —, puis « Où est garé votre véhicule ? ». Les communes deviennent des choix : le véhicule est posé sur la
  carte, la tournée entre par la route du littoral et s'arrête au bord de son cercle, « On vient à [commune] ».
  Aucune base n'est indiquée (la route d'entrée reste schématique) et le halo de zone couverte s'en tient aux
  communes confirmées. Sans script : liste des communes ; mouvement réduit : états d'arrivée, sans trajet.
- **Conversion (M08)** : la demande conclut le parcours — « Votre véhicule reste là. MECA RIVIERA vient à
  vous. » — et la commune choisie sur la carte y est déjà renseignée (événement `meca:town`). Le déroulé d'une
  intervention quitte l'espace entre l'inspection et la carte pour la demande : ce qui se passe ensuite.
- **Mobile (M09)** : recomposé — la carte entre la question et les choix, la demande dans l'ordre appel →
  formulaire → déroulé ; la chaussée la plus proche de l'objectif se fond dans la nuit (voile bas en CSS).
- **Performance** : ni GSAP ni Lenis, aucune dépendance ajoutée. L'inspection ne se charge plus pour une
  section laissée derrière soi (lien direct vers la carte ou la demande) : sa compilation figeait le trajet de
  la carte (1,6 s mesuré). A/B sur build servi, même machine, 3 tours alternés contre l'état d'avant V2.3
  (`8b8ff3e`) : TBT médian desktop 693 → 732 ms (dans le bruit), mobile bridé 1 655 → 1 839 ms (plages qui se
  recouvrent : 1 413–1 912 contre 1 714–1 866), « 3D prête » identique (12,5 → 12,4 s en mobile bridé). Écart
  mobile non concluant sur cette machine (Intel UHD 620, fortes variations d'un tour à l'autre) : à re-mesurer.
- **Retiré** : la liste des services du survol, les puces et le bouton « Appeler » de chaque arrêt, les bordures
  entre les sections de nuit, l'affiche d'attente à l'ouverture de Méthode, le déroulé isolé entre l'inspection
  et la carte, les noms de communes en grand titre.

### 2026-09-12 — V2.3+ : finition (qualité visuelle, mobile, timing)
- **Entrée** : « MECA RIVIERA — PRESENT » sur la nuit (noir, un souffle de bleu nuit en bas), pendant la
  préparation réelle de la première scène. Elle se lève dès la première image 3D rendue (sans WebGL : l'affiche
  décodée), jamais avant 1,3 s de lecture, au plus tard à 5 s — l'affiche, identique à la première image, prend
  alors le relais —, et aussitôt à la moindre interaction. L'arrivée des phares attend la levée. Sans script, ou
  arrivée par un lien vers une section : aucune entrée. Avec l'entrée, la 3D se charge aussitôt (plus d'attente
  de `load`).
- **Photo de la baie** (`unnamed.jpg`, fournie par le porteur ; source hors version) : la baie de Villefranche
  la nuit devient le vrai lointain de la première scène — un plan dans le monde 3D, au-delà de la mer, qui bouge
  avec la caméra comme un paysage ; la route devient une corniche (le sol s'arrête au bord de mer, le port se voit
  en contrebas). Seule la lumière est prise à la photo (mélange additif, teinte du ciel retirée, saturation
  retenue) : la lune et son halo, la côte éclairée, le reflet — ni cadre ni bord. Modes essayés puis écartés :
  photo calée sur l'horizon (seule la lune visible), fenêtres rectangulaire puis elliptique (bande de ciel
  visible), masques sans mélange additif (disque autour de la lune). Recadrée à la partie utile, métadonnées
  retirées : 128 Ko en desktop, 52 Ko en mobile. Remplace les lumières de côte dessinées (repli sans la photo).
  Le port est placé à gauche du capot, jamais une lueur qui semble sortir du véhicule.
- **Mobile, premier plan** : caméra reculée à 22 m, debout (2,3 m) — la lune, la baie au-dessus de l'horizon
  avec du ciel avant le toit, la voiture entière, puis le texte ; l'approche devient une marche.
- **Mobile, légendes** : les arrêts deviennent des longueurs de scroll ; leur texte, une légende posée en bas de
  l'écran, au-dessus de la barre d'appel, visible quand la caméra est arrivée, effacée dès qu'elle repart ou que
  la section s'en va — plus aucun texte ne passe sur la scène. Fenêtres tirées des rythmes de la caméra
  (`src/motion/captions.ts`, rythmes de l'inspection dans `src/3d/inspection-paces.ts`), pilotées par le scroll
  (avec ou sans 3D) ; sortie brève et entrée différée : jamais deux légendes à la fois. Sans script, les feuilles
  restent le repli. En-tête mobile opaque dès qu'on quitte le haut de page.
- **Mobile, services** : une petite lumière bleue d'identification sur la pièce du service (point net, lueur
  courte qui respire à peine, immobile en mouvement réduit) remplace le trait de rappel du desktop.
- **Timing** : paliers de lecture allongés là où le texte ne tenait pas — capot 0,31 → 0,51 écran, roue
  0,29 → 0,47, arrière 0,14 → 0,41, bloc moteur 0,24 → 0,39 ; mouvements toujours variés (0,36 à 1,03 écran).
- **SMS** : les demandes écrites partent au 06 35 27 73 69 (remplace le 07 53 81 05 08 ; demande du porteur du
  12/09/2026) — lien vérifié en envoyant le formulaire.
- **Crédits 3D** : retirés de l'affichage de la maquette (demande du porteur) ; la non-affiliation reste
  affichée ; licences et attributions conservées dans `src/content/site.ts` ; point bloquant de publication
  `publication.creditsDisplay` (licences à acquérir ou attribution à rétablir — la clause NC exclut un usage
  commercial en l'état).
