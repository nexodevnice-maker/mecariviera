import { zoomHold } from './guide';

/**
 * Progression du scroll à travers les arrêts de la scène.
 * 0 = premier arrêt au point focal, n - 1 = dernier ; les valeurs intermédiaires
 * indiquent le trajet entre deux arrêts. Aucun calcul de layout pendant le scroll :
 * les positions sont mesurées au chargement et au redimensionnement.
 *
 * Point focal d'un arrêt : son centre (desktop, et mobile avec légendes — les arrêts y sont de
 * simples longueurs de scroll). Mobile sans légendes (repli) : le haut de sa feuille de texte
 * `[data-focus]` — la caméra est arrivée quand la feuille atteint le milieu de l'écran.
 *
 * Hauteur de référence : celle de la vue épinglée (100svh). Sur téléphone, la barre d'adresse qui se
 * replie ne déplace ni les arrêts ni les points de pas (guide.ts).
 *
 * Deux lectures : `read()`, la position du scroll ; `shown()`, ce que l'écran montre — la caméra 3D
 * quand elle pilote (elle suit le scroll avec un amorti), sinon le scroll lui-même. Les légendes
 * suivent `shown()` : elles apparaissent quand le plan est posé, pas quand le doigt passe.
 */
export interface StageProgress {
  read(): number;
  shown(): number;
  /** Progression affichée par la scène 3D ; `null` : la scène ne pilote plus (retour au scroll). */
  show(p: number | null): void;
  /** Position de scroll (scrollY) où la progression vaut `p`. */
  scrollFor(p: number): number;
  measure(): void;
  onMeasure(fn: () => void): void;
  onShow(fn: () => void): void;
}

export function createStageProgress(
  stops: HTMLElement[],
  narrow: MediaQueryList,
  viewport?: HTMLElement | null,
): StageProgress {
  let marks: number[] = [];
  let half = window.innerHeight / 2;
  let displayed: number | null = null;
  const measured: (() => void)[] = [];
  const showing: (() => void)[] = [];

  const measure = () => {
    half = (viewport?.clientHeight || window.innerHeight) / 2;
    marks = stops.map((el) => {
      const focus = narrow.matches && !el.closest('.has-captions') ? el.querySelector<HTMLElement>('[data-focus]') : null;
      const rect = (focus ?? el).getBoundingClientRect();
      return rect.top + window.scrollY + (focus ? 0 : rect.height / 2);
    });
    for (const fn of measured) fn();
  };

  const read = () => {
    if (marks.length < 2) return 0;
    // Zoom au pincement (téléphone) : la position d'avant le zoom, tenue (guide.ts).
    const center = (zoomHold() ?? window.scrollY) + half;
    if (center <= marks[0]) return 0;
    for (let i = 0; i < marks.length - 1; i++) {
      if (center < marks[i + 1]) return i + (center - marks[i]) / (marks[i + 1] - marks[i]);
    }
    return marks.length - 1;
  };

  const scrollFor = (p: number) => {
    if (marks.length < 2) return (marks[0] ?? half) - half;
    const i = Math.min(Math.max(Math.floor(p), 0), marks.length - 2);
    return marks[i] + (p - i) * (marks[i + 1] - marks[i]) - half;
  };

  measure();
  addEventListener('resize', measure);
  narrow.addEventListener('change', measure);
  document.fonts?.ready.then(measure);
  new ResizeObserver(measure).observe(document.body);

  return {
    read,
    measure,
    scrollFor,
    shown: () => displayed ?? read(),
    show(p) {
      displayed = p;
      for (const fn of showing) fn();
    },
    onMeasure: (fn) => void measured.push(fn),
    onShow: (fn) => void showing.push(fn),
  };
}
