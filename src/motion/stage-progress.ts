/**
 * Progression du scroll à travers les arrêts de la scène.
 * 0 = premier arrêt au point focal, n - 1 = dernier ; les valeurs intermédiaires
 * indiquent le trajet entre deux arrêts. Aucun calcul de layout pendant le scroll :
 * les positions sont mesurées au chargement et au redimensionnement.
 *
 * Point focal d'un arrêt : son centre (desktop) ou, en mobile, le haut de sa feuille
 * de texte `[data-focus]` — la caméra est arrivée quand la feuille atteint le milieu
 * de l'écran, le véhicule restant visible au-dessus.
 */
export interface StageProgress {
  read(): number;
  measure(): void;
}

export function createStageProgress(stops: HTMLElement[], narrow: MediaQueryList): StageProgress {
  let marks: number[] = [];

  const measure = () => {
    marks = stops.map((el) => {
      const focus = narrow.matches ? el.querySelector<HTMLElement>('[data-focus]') : null;
      const rect = (focus ?? el).getBoundingClientRect();
      return rect.top + window.scrollY + (focus ? 0 : rect.height / 2);
    });
  };

  const read = () => {
    if (marks.length < 2) return 0;
    const center = window.scrollY + window.innerHeight / 2;
    if (center <= marks[0]) return 0;
    for (let i = 0; i < marks.length - 1; i++) {
      if (center < marks[i + 1]) return i + (center - marks[i]) / (marks[i + 1] - marks[i]);
    }
    return marks.length - 1;
  };

  measure();
  addEventListener('resize', measure);
  narrow.addEventListener('change', measure);
  document.fonts?.ready.then(measure);
  new ResizeObserver(measure).observe(document.body);

  return { read, measure };
}
