# TECHNICAL RULES

## Architecture
Préférer une architecture simple et maintenable :
- experience/
- components/
- content/
- motion/
- media/
- 3d/
- hooks/
- styles/

## Motion
GSAP / ScrollTrigger uniquement si déjà pertinent dans le projet. Lenis seulement si son intégration est fiable.

## 3D
- lazy load ;
- DPR maîtrisé ;
- cleanup ;
- éviter les modèles lourds inutiles ;
- fallback image / vidéo ;
- ne pas maintenir plusieurs scènes WebGL coûteuses simultanément sans nécessité.

## Assets connus
- Audi capot ouvert : ~38 MB
- BMW M4 CSL : ~21 MB
- Mercedes C63 AMG : ~10 MB
- Audi RS3 : ~13 MB

Ces poids imposent une stratégie de chargement progressive.

## Performance
LCP, poids média, FPS, mémoire GPU et temps d'interaction doivent être observés en conditions réelles.

## SEO
HTML sémantique, titres propres, metadata, contenu indexable, alt text.

## Accessibility
Clavier, focus, contraste, reduced-motion, boutons accessibles, alternative aux médias.

## Forms
Aucune donnée ne doit être envoyée vers un endpoint inventé. En développement : mode test/local tant que la destination réelle n'est pas confirmée.
