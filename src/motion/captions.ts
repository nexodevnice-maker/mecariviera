import { DEFAULT_PACE, guidedPace, type Pace } from '../3d/rigs';
import { guided, guideStops } from './guide';
import type { StageProgress } from './stage-progress';

/**
 * Légendes mobiles (sous 900 px) : la scène reste dégagée. Le texte d'un arrêt apparaît en bas de l'écran
 * quand la caméra arrive sur son cadrage et s'efface dès qu'elle repart : pendant un trajet, aucune légende,
 * et aucun texte ne passe jamais sur la scène. Fenêtres tirées du rythme de chaque segment (rigs.ts) —
 * arrivée : fin du mouvement vers l'arrêt ; départ : début du mouvement suivant — avec une marge. Pilotées par
 * ce que l'écran montre (la caméra 3D, qui suit le scroll en ressort ; sans 3D, le scroll) : l'affiche seule,
 * ou une 3D encore en chargement, ont les mêmes légendes. La mise en page (classe has-captions, posée ici)
 * fait des arrêts de simples longueurs de scroll ; sur téléphone, chaque arrêt reçoit un point de pas
 * (guide.ts) et le mouvement occupe tout le pas (rigs.ts, guidedPace).
 */
export function mountCaptions(
  root: HTMLElement,
  stops: HTMLElement[],
  progress: StageProgress,
  narrow: MediaQueryList,
  paces: (Pace | undefined)[],
  {
    margin = 0.1,
    firstUntil,
    quiet,
  }: {
    margin?: number;
    firstUntil?: number;
    /** Arrêt sans légende (l'extinction) : un pas à cette part du segment qui y mène. */
    quiet?: number;
  } = {},
) {
  const panels = stops.map((el) => el.querySelector<HTMLElement>('[data-caption]'));
  const last = stops.length - 1;
  const paceOf = (k: number, steps: boolean) => (steps ? guidedPace(paces[k]) : (paces[k] ?? DEFAULT_PACE));
  const windowsFor = (steps: boolean) =>
    stops.map((_, k): [number, number] => [
      k === 0 ? -Infinity : k - 1 + paceOf(k, steps).window[1] - margin,
      k === last ? Infinity : k === 0 && firstUntil !== undefined ? firstUntil : k + paceOf(k + 1, steps).window[0] + margin,
    ]);
  let windows = windowsFor(guided.matches);

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
    const p = progress.shown();
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
  guided.addEventListener('change', () => {
    windows = windowsFor(guided.matches);
    schedule();
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  progress.onShow(schedule);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(root);

  // Points de pas (téléphone) : le milieu du palier de lecture de chaque légende — la caméra y est posée.
  // Le premier arrêt se lit au départ, le dernier à son centre ; un arrêt sans légende n'a de pas que si
  // `quiet` le demande.
  const rests = stops.map((_, k) => {
    if (!panels[k]) return quiet !== undefined && k > 0 ? k - 1 + quiet : null;
    if (k === 0 || k === last) return k;
    return (k - 1 + paceOf(k, true).window[1] + k + paceOf(k + 1, true).window[0]) / 2;
  });
  guideStops(stops, progress, rests);
}
