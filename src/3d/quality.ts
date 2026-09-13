/**
 * Définition adaptative, téléphone : la fluidité d'abord, sans jamais sacrifier la netteté pour rien.
 * - Un cran de moins seulement quand les images ratent durablement le rythme de l'écran — jamais parce que l'écran est
 *   bridé (mode économie d'énergie, batterie faible : 30 images par seconde régulières ne sont pas une surcharge).
 *   Rythme de l'écran : le plus court intervalle récent entre deux images (elles ne viennent jamais plus vite).
 * - Plancher : le dernier cran de `steps` (au-delà, l'image deviendrait floue).
 * - Un cran de plus dès que l'aisance revient (batterie rechargée, plan plus léger), sans va-et-vient : une remontée
 *   aussitôt démentie double le délai avant la suivante.
 */
export function createQuality(steps: readonly number[], onChange: () => void) {
  let level = 0;
  const gaps = new Float32Array(90);
  let gapAt = 0;
  const slow = new Uint8Array(120);
  let slowAt = 0;
  /** Images rendues depuis le dernier changement. */
  let since = 0;
  let changedAt = 0;
  let raisedAt = -Infinity;
  /** Délai (ms) avant de retenter un cran de plus. */
  let wait = 6000;

  const change = (next: number, now: number) => {
    if (next > level && now - raisedAt < 10000) wait = Math.min(wait * 2, 60000);
    if (next < level) raisedAt = now;
    level = next;
    since = 0;
    slow.fill(0);
    changedAt = now;
    onChange();
  };

  return {
    /** Rapport de pixels du cran actuel. */
    get ratio() {
      return steps[level];
    },
    get level() {
      return level;
    },
    /** Intervalle `dt` (s) depuis l'image précédente ; `drawn` : cette image a été rendue ; `now` : horloge (ms). */
    tick(dt: number, drawn: boolean, now: number) {
      if (!(dt > 0 && dt < 0.25)) return;
      gaps[gapAt++ % gaps.length] = dt;
      if (!drawn) return;
      let screen = Infinity;
      for (const gap of gaps) if (gap > 0 && gap < screen) screen = gap;
      slow[slowAt++ % slow.length] = dt > Math.max(screen * 1.6, 0.025) ? 1 : 0;
      since++;
      // Une remontée qui a tenu : le délai redevient court.
      if (raisedAt >= changedAt && now - raisedAt > 20000) wait = 6000;
      let recent = 0;
      for (let k = 1; k <= Math.min(20, since); k++) recent += slow[(slowAt - k + slow.length) % slow.length];
      if (since >= 20 && recent >= 12 && level < steps.length - 1 && now - changedAt > 1500) {
        change(level + 1, now);
        return;
      }
      if (level > 0 && since >= slow.length && now - changedAt > wait) {
        let total = 0;
        for (const s of slow) total += s;
        if (total <= 4) change(level - 1, now);
      }
    },
  };
}
