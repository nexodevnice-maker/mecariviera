import { DEFAULT_PACE, type Pace } from '../3d/rigs';
import type { StageProgress } from './stage-progress';

/**
 * Légendes mobiles (sous 900 px) : la scène reste dégagée. Le texte d'un arrêt apparaît en bas de l'écran
 * quand la caméra arrive sur son cadrage et s'efface dès qu'elle repart : pendant un trajet, aucune légende,
 * et aucun texte ne passe jamais sur la scène. Fenêtres tirées du rythme de chaque segment (rigs.ts) —
 * arrivée : fin du mouvement vers l'arrêt ; départ : début du mouvement suivant — avec une marge. Pilotées par
 * le scroll, sans attendre la 3D : l'affiche seule, ou une 3D encore en chargement, ont les mêmes légendes.
 * La mise en page (classe has-captions, posée ici) fait des arrêts de simples longueurs de scroll.
 */
export function mountCaptions(
  root: HTMLElement,
  stops: HTMLElement[],
  progress: StageProgress,
  narrow: MediaQueryList,
  paces: (Pace | undefined)[],
  { margin = 0.1, firstUntil }: { margin?: number; firstUntil?: number } = {},
) {
  const panels = stops.map((el) => el.querySelector<HTMLElement>('[data-caption]'));
  const start = (k: number) => (paces[k] ?? DEFAULT_PACE).window[0];
  const end = (k: number) => (paces[k] ?? DEFAULT_PACE).window[1];
  const last = stops.length - 1;
  const windows = stops.map((_, k): [number, number] => [
    k === 0 ? -Infinity : k - 1 + end(k) - margin,
    k === last ? Infinity : k === 0 && firstUntil !== undefined ? firstUntil : k + start(k + 1) + margin,
  ]);

  let active = -1;
  let visible = false;
  let frame = 0;
  const show = (next: number) => {
    if (next === active) return;
    panels[active]?.classList.remove('is-active');
    panels[next]?.classList.add('is-active');
    active = next;
  };
  const update = () => {
    frame = 0;
    // Hors écran, ou section qui s'en va (la suivante monte dessous) : aucune légende ne reste posée.
    if (!narrow.matches || !visible || root.getBoundingClientRect().bottom < innerHeight - 1) return show(-1);
    const p = progress.read();
    show(windows.findIndex(([a, b], k) => panels[k] !== null && p >= a && p <= b));
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };
  const layout = () => {
    root.classList.toggle('has-captions', narrow.matches);
    // Fondus activés une fois l'état caché posé (captions-ready) : au chargement ou au changement
    // d'orientation, les légendes passent d'un coup à l'état caché — aucun éclair de texte en bas de l'écran.
    root.classList.remove('captions-ready');
    progress.measure();
    schedule();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('captions-ready')));
  };
  layout();
  narrow.addEventListener('change', layout);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(root);
}
