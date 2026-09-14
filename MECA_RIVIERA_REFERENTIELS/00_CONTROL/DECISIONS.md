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
- **Pré-lancement** : `noindex` tant que `PUBLIC_INDEXABLE` ≠ `true` (remplacé le 2026-09-12 : voir « SEO de
  production »).

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

### 2026-09-12 — SEO de production (demande du porteur)
- **Adresse** : `https://nexodev.pages.dev` (Cloudflare Pages, projet `nexodev`, branche `main`) devient `site` ;
  `publication.domain` confirmé. Remplace la règle de pré-lancement : le build de production est indexable
  (`index, follow`), le serveur de développement jamais ; `PUBLIC_INDEXABLE=false` au build garde une
  préproduction non indexable. Aucune variable à régler dans Cloudflare.
- **Balises** : canonique, Open Graph (image de partage : l'affiche RS3 du hero, 1440 × 900), carte Twitter
  `summary_large_image` sans `twitter:site` (aucun compte connu), vérification Google Search Console.
- **Sitemap** : généré par `@astrojs/sitemap` (aucun fichier statique) ; `public/robots.txt` l'annonce, sans
  restriction.
- **404** : `src/pages/404.astro`, hors index. Sans elle, Cloudflare Pages servait l'accueil (statut 200) pour
  toute adresse inconnue — `robots.txt` et sitemap compris.
- **Données structurées** : `WebSite` seul (nom, adresse). Ni LocalBusiness ni Organization : identité de
  l'exploitant, forme juridique, SIREN et adresse restent à fournir.

### 2026-09-12 — Interactions mobiles : un geste, un plan (demande du porteur)
Constat : sur téléphone, un balayage lancé parcourait 2 à 4 écrans, soit 3 à 5 arrêts d'un coup ; la caméra
suivait le doigt presque sans retard (amorti de 0,2 s) et les légendes clignotaient au passage.
- **Pas guidés** (`src/motion/guide.ts`) : sur écran étroit et pointeur tactile, des points d'arrêt natifs
  (scroll-snap obligatoire, `scroll-snap-stop: always`) sur chaque arrêt des deux scènes — un geste mène au plan
  suivant, jamais plusieurs. Le défilement reste natif (aucun détournement du toucher) et redevient libre à
  partir de la carte. 15 pas, écarts de 425 à 824 px sur un écran de 844 : longueurs de scroll mobiles × 0,8,
  introduction de Méthode à 80svh, temps d'arrêt final à 16svh. Un pas « phares éteints » (sans texte) entre
  l'arrière et Méthode : la nuit gagne la voiture avant le noir.
- **Caméra en ressort critique** (`src/motion/follow.ts`) : départ doux, arrivée sans rebond, ~1 s ; en pas
  guidés, le mouvement occupe tout le pas (`guidedPace`, rigs.ts) — la lecture se fait à l'arrêt.
- **Légendes** pilotées par ce que l'écran montre (la caméra), plus par le doigt : elles entrent quand le plan
  se pose.
- **Liens internes** : trajet direct, sans pas intermédiaires, jusqu'au premier palier de la section visée.
- **Toucher** : cibles de 44 px au moins (en-tête, pied de page, puces du formulaire, lien Snapchat), communes
  touchables sur la carte, pression visible sur les boutons, ni flash gris ni délai de double tap ; envoi du
  formulaire sur toute la largeur.
- Desktop inchangé (molette libre, même amorti). Vérifié par gestes tactiles simulés (CDP) : chaque geste arrive
  sur son point, une seule légende, liens exacts. L'élan d'un vrai doigt ne se simule pas sans appareil : il est
  borné par `scroll-snap-stop: always`, pris en charge par Safari (iOS 15+) et Chrome.

### 2026-09-13 — Premier plan : la baie en vrai décor (demande du porteur)
Avant : la photo n'apportait que sa lumière (lune, côte, reflets, en mélange additif) — un panneau flottant dans
la nuit, séparé de la route par le trottoir puis une mer noire, au même placement quel que soit l'écran.
- **Décor** (`src/3d/bay.ts`) : la photo entière — ciel éclairé par la lune, collines du cap, port, reflets —,
  recalée à chaque redimensionnement sur la caméra du premier arrêt : sa partie nette couvre tout le champ
  au-dessus de la bordure, horizon marin à hauteur d'œil. Ordinateur et tablette en paysage : bande large
  (2048 px) ; téléphone et tablette en portrait : bande haute (1280 px). Bords fondus dans la nuit pour les autres
  arrêts (plus longuement à droite, où la ville, coupée par le cadre, s'éteint).
- **Délimitation** : la route s'arrête au début du trottoir, après une pierre de bordure claire (16 cm) ;
  au-delà, la baie en contrebas, qui s'assombrit vers la bordure (profondeur).
- **Lune** : la photo est en portrait — dans un écran en paysage, la lune serait au-dessus du cadre. Les bandes
  commencent sous elle (rangée 0,27 de la photo : jamais deux lunes, aucune retouche du ciel, sa lueur reste) ;
  la lune et son halo, pris à la même photo, forment un calque posé sous l'en-tête, à la verticale de son reflet.
- **Mise au point** : la baie est nette au premier plan ; dès que le mécanicien s'approche, elle passe au flou et
  s'assombrit — le regard va au véhicule.
- **Lisibilité** : un voile sombre sous l'en-tête transparent du haut de page (le ciel éclairé passait derrière
  les liens).
- Fichiers : `npm run assets:bay` (source `unnamed.jpg`, hors version) → `riviera-bay.webp` (203 Ko),
  `riviera-bay-m.webp` (132 Ko), `riviera-moon.webp` (4 Ko) ; affiches du hero recapturées.

### 2026-09-13 — Téléphone : la place, l'esplanade, le relais vers la zone (demande du porteur, mobile seulement)
Sous 900 px uniquement ; l'ordinateur reste tel quel (capture du premier plan comparée : scène identique au pixel
près, seul l'anticrénelage de quelques lettres de la marque, désormais découpée en deux, diffère).
- **Premier plan** : la voiture recentrée et plus proche (caméra à 17 m au lieu de 22), garée dans une place
  marquée — ligne de rive, séparations tous les 6 m, axe de la chaussée en tirets. Au-delà de la bordure, une
  esplanade dallée (dalles de 1,2 × 0,6 m, joints tendus vers la baie) jusqu'à un garde-corps (muret de pierre,
  main courante, lisse basse, barreaux tous les 12 cm, poteaux) et des lampadaires de 3,7 m (mât, crosse,
  lanterne allumée et son halo) : la baie commence au garde-corps, la voiture ne semble plus partir dans le vide.
  Ces éléments sont éclairés par la même nuit que le sol (lanternes, ciel, lueur de la baie), sans lumière de
  scène. Lune plus haute, sous l'en-tête.
- **Marque** : « MECA » au bleu clair de la charte (`--blue-soft`) — en-tête, entrée, sur-titre du hero, pied de page.
- **Relais Méthode → Zone** : la montée finale s'arrête à un recul mesuré (voiture entière, de trois quarts, à une
  dizaine de mètres) au lieu du point vu à 48 m ; la zone d'intervention monte ensuite par-dessus la vue encore
  épinglée, couchée (−34°, réduite à 90 %) puis redressée, la scène s'éteignant dessous. Le temps d'arrêt final
  passe à un écran ; le pas guidé suivant se pose sur la zone.
- **Définition** : rendu jusqu'à 2 fois la densité de l'écran (1,5 avant), baissé d'un cran si les images
  ralentissent, dans les deux scènes ; filtrage anisotrope 16× (baie, relevé) et 8× (sol).

### 2026-09-13 — Téléphone : Snapchat, allumage du lampadaire, inspection sur sa place, relais par la ligne de relevé
Sous 900 px uniquement ; l'ordinateur reste tel quel (scène identique au pixel près, 19 programmes GPU).
- **En-tête** : le Snapchat de MECA RIVIERA (fantôme au trait, lien @mecariviera26) entre la marque et la
  disponibilité « 7j/7 · 24h/24 », qui remplace le numéro — toujours dans le hero et la barre d'appel.
- **Allumage** : au lancement, la nuit — la pleine lune (clair de lune froid, dirigé depuis la lune du décor)
  éclaire une partie de la voiture et de l'esplanade. Au premier geste, les lampadaires s'allument : la lanterne
  voisine s'amorce en papillotant (petite surface), passe du blanc à sa lumière chaude, sa flaque s'élargit, un
  cône de lumière descend dans l'air ; un lampadaire de l'autre trottoir, hors champ, éclaire la face visible du
  véhicule, avec un seul éclat pendant que les reflets glissent sur la carrosserie — 1,6 s, dans le temps du
  premier pas. La luminosité d'ensemble monte d'un seul tenant (aucun clignotement de grande surface) ; mouvement
  réduit : allumé d'emblée. Pas de phares du mécanicien sur téléphone ; les lampadaires s'éteignent avec la scène.
- **Inspection** : la voiture capot ouvert détourée (le sol du relevé retiré) et garée dans une place marquée — la
  place d'abord, vide, puis la ligne de relevé y fait apparaître la voiture ; les pièces nommées prennent le bleu
  de la marque (lavis, contour) et leur lumière d'identification.
- **Relais vers la zone** : l'inclinaison 3D, qui brouillait les textes en perspective, est remplacée par la ligne
  de relevé — le bord de la zone est un trait bleu lumineux qui monte et balaie la dernière vue, la carte révélée
  derrière lui ; sans transformation, les textes restent nets.
- **Garde** : le parcours des deux scènes est borné (l'amorti pouvait en dépasser le début un instant et
  interrompre le rendu de l'inspection).
- **Découpe refaite (même jour)** : le sol du scan n'est pas à zéro mais un plan incliné, à 4–14 cm selon l'endroit
  (ajusté sur 9 000 sommets du scan : y = 0,093 + 0,019 × longueur + 0,013 × largeur, ±7 mm) — la coupe à hauteur
  fixe en laissait une bordure grise, et la place, posée à zéro, faisait flotter la voiture. Désormais : retiré ce
  qui est à moins de 3,5 cm au-dessus de ce plan ; hors du contour mesuré de la carrosserie (3,98 × 1,76 m), la
  soudure sol-caisse sous 50 cm (les rétroviseurs restent) ; au-delà de 16 cm, tout. La place est posée sur ce
  même plan, les pneus reposent dessus ; ombre de contact resserrée sous la caisse.

### 2026-09-13 — Téléphone : la nuit en haut de page, la vraie lumière et l'ombre, les flammes, l'entrée, la fluidité
Sous 900 px uniquement ; l'ordinateur reste tel quel (19 programmes GPU, scène identique hors lissage des textes).
- **La nuit en haut de page** : la lanterne ne reste plus allumée. Elle s'allume dès que la page quitte le haut
  (papillotement, éclat, 1,6 s) et s'éteint en fondu (0,5 s) quand on y revient ; en redescendant, nouvel allumage.
  Mouvement réduit : un fondu, sans papillotement ni éclat.
- **La vraie lumière** : la lanterne voisine devient la source de la scène — sur la carrosserie (140 cd, sans portée
  limite, un éclat à l'allumage) et au sol, en optique routière (répartition « en ailes » : éclairement soutenu
  jusqu'à 7,5 m, où se tient le véhicule, puis qui tombe ; surcroît au pied), hautes lumières adoucies plutôt
  qu'écrêtées. Verre, halo, cône de lumière et garde-corps renforcés d'autant ; le lampadaire d'en face reste la
  lumière de face de la carrosserie (85 cd), discret au sol.
- **L'ombre portée** : la silhouette exacte du véhicule projetée sur le sol (les vitres laissent passer la lumière),
  adoucie en deux pénombres — nette au contact, large en s'éloignant — ; calculée une fois au chargement (véhicule et
  lanterne immobiles) et lue par le sol en une texture : aucune ombre en temps réel. Source : la lanterne (même côté,
  même hauteur) ramenée à hauteur du milieu du véhicule — l'ombre de la lanterne exacte, derrière lui, filerait droit
  vers la caméra et se confondrait avec la nuit ; elle se couche ainsi à côté de lui, sur le sol éclairé. Dans
  l'ombre, un dixième de la lumière (renvoi de l'alentour) : jamais un noir plein.
- **Lignes blanches** : peinture routière neuve, d'un blanc franc (albédo 0,82, usure presque nulle), qui renvoie la
  moindre lumière et reste lisible au clair de lune ; de même sur la place de l'inspection.
- **Flammes à l'arrêt Échappement** : à l'arrivée de la caméra, une seule fois par visite (même en revenant) — une
  longue gerbe puis trois détonations qui s'espacent (1,2 s). Une flamme par sortie, sur les embouts relevés de
  chaque modèle (quatre trapèzes, deux ovales à double tube, quatre ronds) : cœur bleu au débouché, jaune, orange,
  pointe rouge qui se déchire ; éclat au débouché, lueur orangée sur l'arrière du véhicule et au sol. Cadrage mobile de
  l'arrêt : un pas en retrait, recentré sur la poupe — les quatre sorties dans le cadre. Mouvement réduit : aucune.
- **L'entrée à chaque arrivée** : rechargée, rouverte, revenue par l'historique ou par un lien d'ancre, la page repart
  du haut (restauration du défilement désactivée) et l'entrée dure ses 5 s pleines — une fine barre blanche s'y
  remplit —, la page immobile ; un geste ne l'écourte plus.
- **Fluidité** : sur téléphone, le sol ne calcule plus les phares et lampadaires de l'ordinateur (branche selon le
  format) ; plus aucune mesure de mise en page par image (dimensions de la vue, bas de section des légendes, haut de
  la zone relevés au redimensionnement ; propriétés du relais réécrites seulement si elles changent) ; la définition
  baisse d'un cran dès que les images passent sous ~45 i/s (au lieu de 24), jusqu'à 1 sur l'inspection. L'ombre
  calculée une fois et les flammes invisibles au repos ne coûtent rien.

### 2026-09-13 — Retour au premier plan, phares xénon et feux arrière, mallette, banc, plaques, flammes UHQ
Visuel sur téléphone seulement ; le retour au premier plan vaut pour tous les formats.
- **Toujours le premier plan** : à chaque arrivée — rechargement, réouverture, retour par l'historique, lien vers une
  section —, ni position de défilement restaurée ni ancre ; le haut est réimposé tant que le visiteur n'a pas bougé
  (certains navigateurs restaurent tard), la page se remet en haut en partant, et une page restaurée depuis
  l'historique est rechargée. L'entrée s'affiche donc à chaque fois, ordinateur compris (qui restaurait la position).
  Téléphone : l'entrée dure 2,5 s au lieu de 5, barre comprise.
- **Phares xénon et feux arrière** : dans l'allumage du lampadaire, les phares s'amorcent — éclair bleuté, creux,
  montée, blanc froid. Les optiques du modèle deviennent émissives dans le volume des phares seulement (les pièces
  lumineuses mêlent avant et arrière) ; éclat et traînée à chaque optique, faisceau dans l'air, faisceau de croisement
  au sol. Les feux arrière s'allument avec eux, d'un rouge franc (vitres teintées compensées de leur opacité, halo,
  reflet sur la chaussée). La voiture reste ainsi éclairée jusqu'au bout de la présentation, extinction finale
  comprise ; seul le haut de page reste à la nuit.
- **Mallette** : caisse à outils rouge (acier peint, couvercle, poignée et fermoirs chromés) au pied du bouclier avant,
  une clé mixte posée devant ; elle porte son ombre avec le véhicule.
- **Banc** : sur l'esplanade, à droite du cadre, face à la baie ; une silhouette assise de dos, capuche relevée,
  penchée en avant — matières presque noires, découpée sur les lumières de la côte.
- **Plaques** : « MECA RIVIERA » au format européen — bande de l'Europe (étoiles, F), à droite le signe de la marque
  et 06. Posées sur les surfaces relevées par lancer de rayons sur chaque modèle (plan ajusté, inclinaison comprise) :
  C63 devant la grille basse et dans son logement arrière, RS3 sur le support de calandre et sur la malle, M4 devant
  les naseaux et sur le bouclier. La voiture de la Méthode, un relevé réel, ne montre pas de plaque.
- **Flammes UHQ** : deux couches par sortie (enveloppe ; cœur plus étroit et plus court), couleur selon la
  température — base bleutée au débouché, cœur jaune-blanc, corps orange, bords et pointe rougeâtres —, bruit
  fractal ; étincelles ; puis la traînée — fumée et gaz chauds qui dérivent en arrière, montent et s'effilochent,
  dissipés en 2 à 3 s — et les débouchés qui refroidissent de l'orangé au rouge sombre.
- **Ordinateur** : le sol a désormais un programme par format (le code du téléphone ajouté au programme commun
  modifiait légèrement le rendu de l'ordinateur à la compilation) ; rendu identique à l'œil, 19 programmes.

### 2026-09-13 — Premier plan tenu, mallette ouverte, feux rouge vif, phares réalistes, plaque M4, voiture de la Méthode
Visuel sur téléphone seulement ; le premier plan tenu vaut pour tous les formats.
- **Premier plan tenu** : introuvable dans le moteur de Chrome (16 rechargements, téléphone lent simulé, doigt posé :
  toujours en haut, points de pas à leur place), le décalage vient d'un navigateur qui rétablit la position tard
  (Safari, navigateurs intégrés aux applications). Le haut est désormais tenu à chaque image pendant l'entrée, puis
  1,5 s après elle et après le chargement complet ; le premier geste du visiteur, l'entrée levée, lui rend la main (au
  plus tard 12 s après l'arrivée). Vérifié avec des restaurations tardives simulées, de 0,3 à 3,6 s après le
  rechargement.
- **Mallette** (refaite entièrement à la demande du porteur) : une vraie mallette de mécanicien, grande ouverte
  (72 × 42 cm) — coque rouge arrondie, calage noir, poignée et fermoirs ; dans le fond, trois rangées de douilles
  chromées (empreinte hexagonale), deux cliquets et des rallonges ; dans le couvercle relevé à 100°, l'éventail de douze
  clés mixtes et une rangée de tournevis. Au sol à côté, trois outils seulement : un cliquet, une clé mixte, un
  tournevis. Décollée du véhicule (1,25 m devant le bouclier, côté chaussée), dans le cadre du premier plan comme de la
  face avant ; fusionnée en une pièce par matière (le banc aussi), src/3d/props.ts.
- **Feux arrière rouge vif** : émission rouge dosée sous la compression des hautes lumières (plus forte, elle virait
  au rose), reflets des feux teintés de rouge.
- **Phares** : seules les parties claires des optiques (lentilles, réflecteurs, signature lumineuse) s'allument, le
  boîtier reste sombre ; éclat et traînée plus discrets.
- **Plaque arrière de la M4** : sur la face de la malle, juste sous le logo, inclinée comme elle (15°) — elle était
  sur la bande plate au-dessus du diffuseur, puis en haut du bouclier, encore trop basse au goût du porteur.
- **Outils dans la nuit** : un métal renvoie la couleur de la lumière qu'il reçoit ; sous le clair de lune et le ciel,
  les chromes de la mallette paraissaient bleus. Dans la nuit, leur acier sombre prend une teinte chaude qui compense
  ce bleu (gris neutre) ; lanterne et phares allumés, il redevient chrome.
- **Voiture de la Méthode** : ses couleurs réelles de nuit au lieu d'une luminance froide — lanterne chaude, ciel
  froid, normales du scan lissées, reflet discret, liseré — et une plaque MECA RIVIERA sur son support avant (la bande
  saillante de la plaque d'origine, relevée sur le scan). Le scan en haute définition (textures 2048) demanderait plus
  de 100 Mo de mémoire graphique : écarté. Ordinateur : programme propre, inchangé.

### 2026-09-14 — Premier plan à coup sûr, zoom au doigt, carte de Cannes à Beaulieu, drapeau du 06, deux numéros, feux, mentions, fluidité
Visuel sur téléphone seulement ; le premier plan vaut pour tous les formats.
- **Premier plan à coup sûr** : trois failles corrigées dans la tenue du haut de page. Le retour en haut était un glissé
  (la page défile en `scroll-behavior: smooth`) qu'un doigt pouvait interrompre à mi-page ; les points d'accroche des
  pas guidés restaient actifs pendant la tenue ; la tenue s'arrêtait 12 s après l'arrivée, même quand le chargement
  complet — après lequel Safari rétablit la position — venait plus tard. Désormais, pendant la tenue (classe is-held),
  retour instantané et sans accroche, à chaque image et à chaque défilement, jusqu'à 1,5 s après l'entrée et le
  chargement complet (garde-fou : 25 s) ; la main rendue au premier geste, au clavier ou au focus (lecteur d'écran) ;
  en partant, retour en haut instantané. Vérifié : cinq rechargements successifs depuis de plus en plus bas, dix
  restaurations simulées de 0,15 à 3,6 s après l'arrivée, téléphone bridé (4G, processeur ÷4), ordinateur.
- **Zoom au pincement** : dès que deux doigts se posent, et tant que la page est agrandie, les points d'accroche sont
  levés et la progression des scènes reste celle d'avant le zoom — la voiture ne bouge pas, doigts posés ou levés, même
  en se déplaçant dans l'image agrandie. Revenue à l'échelle 1, la page reprend exactement sa position et les pas
  reprennent ; le défilement guidé est inchangé (src/motion/guide.ts, stage-progress.ts).
- **Zone d'intervention** : carte étendue, de Cannes à Beaulieu-sur-Mer — rivage relevé point par point (pointe de la
  Croisette, Golfe-Juan, cap d'Antibes, baie des Anges, port de Nice, mont Boron, rade de Villefranche, cap Ferrat),
  îles de Lérins, le Var ; lignes de sonde à égale distance du rivage, îles comprises, calculées au build
  (src/content/coast.ts) ; lueur des villes la nuit ; repères (Cannes, Beaulieu, caps, îles). Mêmes quatre communes,
  même tournée, qui entre par la basse corniche depuis Èze. Dans le cartouche, le vrai drapeau traditionnel des
  Alpes-Maritimes, au choix du porteur (aigle rouge couronnée sur trois monts, mer ondée, fond blanc) : fichier
  Flag_of_the_County_of_Nice.svg de Wikimedia Commons, domaine public, débarrassé de ses métadonnées d'éditeur
  (public/media/flag-06.svg) — aucune version officielle à fond bleu avec l'aigle n'existe ; le drapeau institutionnel
  du Département (logo déposé) a été écarté. L'ordinateur garde sa carte.
- **Deux numéros** : « Appeler », dans la barre du bas, ouvre le choix entre le 06 35 27 73 69 et le 07 67 97 53 67 (la
  mention seule sur le bouton, à la demande du porteur) ; sous « Vous êtes ailleurs dans le 06 ? », deux boutons
  d'appel.
- **Phares xénon** plus bleutés et plus prononcés : teinte bleue, voile bleu autour de chaque optique, traînée plus
  longue, faisceau plus dense, lueur bleutée au pied du bouclier.
- **Feux arrière** comme au freinage : rouge franc sur tout le verre (toujours sous la compression des hautes lumières),
  halo et lueur plus larges, et leur lueur rouge sur la chaussée derrière le véhicule.
- **Méthode** : la lueur bleue autour de la pièce n'apparaît qu'une fois le relevé passé (fin du balayage du capot).
- **Entrée** : en bas à gauche, « © MECA RIVIERA · Tous droits réservés », « Mentions légales · CGU · CLU »,
  « Conception nexoDeveloppement » (texte ; les pages elles-mêmes restent à rédiger — publication.legalNotice).
- **Fluidité, deux passes mesurées** : parcours guidé complet au doigt sur téléphone, dans deux conditions de batterie
  faible simulées — écran bridé à 30 images/s (mode économie d'énergie) et processeur ralenti ×4 —, avant / après.
  - Passe 1 — la cause de la « qualité réduite » : bridé à 30 images/s, l'écran était pris pour une surcharge et la
    définition des scènes 3D descendait jusqu'à 0,75 (flou) ; chaque changement de définition figeait la page, jusqu'à
    1,6 s. La définition suit désormais le vrai rythme de l'écran (src/3d/quality.ts) : un cran de moins seulement si
    les images ratent durablement leur rendez-vous, jamais sous 1,25, et elle remonte quand l'aisance revient. Plus
    aucune lecture de mise en page par image dans la Méthode ; textures envoyées au processeur graphique une par image ;
    la carte animée sur son propre calque ; la barre d'appel n'écrit plus dans la page à chaque défilement.
  - Passe 2 — la mise en place de la Méthode (chargement, compilation) tombait pendant les flammes de l'Échappement :
    elle attend un temps calme (flammes finies, pas de geste en cours ; au plus 3 s) et se fait par petites étapes, une
    image entre chacune.
  - Résultat : écran bridé, définition 2 sur les deux scènes (au lieu de 0,75 et 1) ; processeur ÷4, plus longue tâche
    bloquante ramenée de 1,1–7,5 s à 0,16 s, blocages cumulés de 3,0–14,6 s à 1,8 s.

### 2026-09-14 — L'ordinateur comme le téléphone (demande du porteur : « reporte absolument tout »)
Fin de la règle « téléphone seulement » : ce qui était réservé au téléphone vaut désormais sur tous les formats.
- **Scène d'ouverture** : la nuit en haut de page et l'allumage du lampadaire (vraie lumière, ombre portée), l'esplanade,
  son garde-corps et la place marquée, les phares xénon et les feux arrière (et leurs lueurs au sol), la mallette, le
  banc et sa silhouette, les plaques MECA RIVIERA, les flammes de l'Échappement. L'arrivée des phares du mécanicien et
  le sol de l'ordinateur d'avant ne sont plus utilisés.
- **Méthode** : la voiture en couleurs réelles de nuit, sur sa place, avec sa plaque, la lueur bleue après le relevé ;
  le recul final est commun aux deux formats (la zone monte par-dessus).
- **Défilement** : les pas guidés — un cran de molette, un geste du pavé tactile ou une page du clavier : un plan — et le
  zoom tenu.
- **Zone** : la carte de Cannes à Beaulieu et son drapeau (celle d'Antibes à Nice est retirée), ses textes ramenés à la
  taille de la page ; le relais par la ligne de relevé ; les deux boutons d'appel, côte à côte.
- **Contact et en-tête** : la barre d'appel et son choix des deux numéros (compacte, en bas à droite) ; le Snapchat et la
  disponibilité dans l'en-tête ; « MECA » au bleu de la marque.
- **Entrée** : 2,5 s, la barre, les mentions en bas à gauche.
- Restent propres à chaque format les seules adaptations de mise en page : colonne de texte (ordinateur) ou légendes en
  bas de l'écran (téléphone), cadrages de caméra, trait de rappel (ordinateur) ou point lumineux (téléphone), affiches.
  L'ordinateur compile désormais les 30 programmes du téléphone (19 auparavant) ; ses affiches sont refaites.
