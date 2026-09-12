# MECA RIVIERA — site

Mécanique automobile à domicile, Alpes-Maritimes. Positionnement : **la mécanique vient au véhicule.**

Site statique (Astro 7) avec deux scènes 3D (Three.js) pilotées par le scroll, autour d'un seul principe —
**le véhicule reste, le mécanicien vient** : une entrée « MECA RIVIERA — PRESENT » couvre la préparation de la
première scène ; le hero montre un véhicule tiré au hasard (C63, RS3 ou M4), garé la nuit sur la corniche, la
baie de Villefranche en contrebas (photo du porteur, `public/media/riviera-bay*.webp`), dont la caméra fait le
tour à hauteur d'homme, zone par zone ; les phares s'éteignent, puis la section Méthode inspecte le scan réel
d'une A1, capot ouvert, pièce par pièce, et prend de la hauteur ; la carte demande où est garé le véhicule et y
fait venir la tournée ; la demande reprend la commune choisie. Sur mobile, le texte des arrêts devient une
légende en bas de l'écran, visible quand la caméra est arrivée (`src/motion/captions.ts`), et une petite lumière
bleue désigne la pièce du service. Les règles de conception et de vérité du contenu sont dans
`MECA_RIVIERA_REFERENTIELS/` ; les décisions prises pendant la production sont consignées dans
`MECA_RIVIERA_REFERENTIELS/00_CONTROL/DECISIONS.md`.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:4321) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Sert `dist/` (http://localhost:4321, ou `-- --port 4322`) |
| `npm run content:check` | **Gate de publication** : liste tout ce qui n'est pas `CONFIRMED` (`-- --strict` pour échouer) |
| `npm run assets:3d [-- a1-scan c63 rs3 m4]` | Optimise les sources `3D/` vers `public/3d/` (desktop + `-m` mobile) ; logos et plaques effacés |
| `npm run assets:env` | Pré-calcule l'éclairage du studio (`public/3d/studio-env.hdr`) |
| `npm run assets:posters [-- stage\|inspection]` | Capture les affiches fixes : hero (`public/media/stage-*`), Méthode (`public/media/inspection-*`) — serveur de dev requis |
| `npm run qa:shots [-- <dossier>]` | Captures de chaque arrêt et section, desktop + mobile, erreurs console, audit axe |
| `npm run qa:perf` | FCP, LCP, CLS, TBT, octets, jalons 3D sur le build servi en 4322 (profil mobile bridé ; véhicule fixé par `QA_VEHICLE`, C63 par défaut) |

Les scripts `assets:*` et `qa:*` pilotent Edge ou Chrome installés localement (`playwright-core`,
aucun navigateur téléchargé). Variable `QA_BROWSER` pour en indiquer un autre ; `?vehicle=c63|rs3|m4`
fixe le véhicule du hero (captures reproductibles).

## Structure

```
src/
  content/site.ts        contenu unique, chaque fait avec son statut (CONFIRMED, TO_CONFIRM, …)
  pages/index.astro      page d'accueil
  pages/404.astro        page introuvable (hors index)
  layouts/Base.astro     <head> commun : indexation, canonique, Open Graph, Twitter, Search Console
  components/            Header, Stage (hero + services), Method (inspection), Territory, Contact, Footer, MobileBar
  3d/                    hero : boot (chargement différé), stage, rigs (cadrages), studio (éclairage),
                         vehicles (tirage du véhicule) ; Méthode : inspection (scan A1)
  motion/                progression du scroll à travers les arrêts
  styles/                tokens (couleurs, typo, espaces) et base
scripts/                 pipeline d'assets et outils de QA
public/3d, public/media  dérivés optimisés (versionnés)
3D/                      sources brutes (lourdes, hors version, jamais modifiées)
```

## Contenu

Tout le texte factuel vient de `src/content/site.ts`. Les services déterminent les arrêts de la caméra :
un service ajouté avec une `zone` (`engine`, `wheel`, `front`, `cockpit`, `rear`) rejoint automatiquement
l'arrêt correspondant. Les étapes de l'inspection (`inspection`) désignent chacune une pièce du scan A1.
La commune choisie sur la carte (`Territory`) est transmise à la demande (`Contact`) par l'événement
`meca:town`.
Une information inconnue reste `UNKNOWN` et n'est jamais affichée.

## Indexation et SEO

- Production : `https://nexodev.pages.dev` (`site` dans `astro.config.mjs`) — Cloudflare Pages, branche `main`,
  `npm run build` → `dist/`. Canonique, Open Graph et image de partage en URLs absolues ; sitemap généré par
  `@astrojs/sitemap` (`sitemap-index.xml`), annoncé par `public/robots.txt` ; page 404 hors index.
- Le build de production est indexable (`index, follow`) ; le serveur de développement ne l'est jamais.
  `PUBLIC_INDEXABLE=false` au build donne une préproduction non indexable. Nouveau domaine : changer `site` et
  la ligne `Sitemap` de `public/robots.txt`.
- Données structurées : `WebSite` seul (nom, adresse) — aucune donnée d'entreprise tant qu'elle n'est pas
  confirmée.

## Pré-lancement

- Le formulaire n'envoie rien sur le réseau tant que `PUBLIC_FORM_ENDPOINT` n'est pas défini : il prépare
  la demande en SMS vers le numéro de réception (`contact.requests` : le 06 35 27 73 69), dans l'application
  de l'utilisateur.
- Maquette : les crédits 3D ne sont pas affichés. Avant toute publication, licences acquises ou attribution
  rétablie (`publication.creditsDisplay`, relevé par `npm run content:check`).
- Avant publication : `npm run content:check -- --strict` doit passer, et les points de
  `MECA_RIVIERA_REFERENTIELS/09_GATES/PUBLICATION_READINESS.md` être réunis (mentions légales,
  confidentialité).
