/**
 * La caméra suit la progression du scroll.
 * Desktop : amorti simple — la molette avance déjà par crans.
 * Téléphone : ressort critique — la caméra démarre en douceur et se pose sans rebond (~0,8 s), quelle
 * que soit la vitesse du doigt ; un geste vif ne la fait plus sursauter d'un plan à l'autre.
 */
const DESKTOP_RATE = 4.5;
const SPRING = 4.8; // pulsation (rad/s) : 90 % du trajet en ~0,8 s, posé à ~1 s

export function createFollow(narrow: MediaQueryList) {
  let velocity = 0;
  return {
    /** Valeur affichée après `dt` secondes, en route vers `target`. */
    step(current: number, target: number, dt: number) {
      if (!narrow.matches) {
        velocity = 0;
        return current + (target - current) * (1 - Math.exp(-dt * DESKTOP_RATE));
      }
      // Ressort critique, résolu exactement (stable quel que soit dt).
      const decay = Math.exp(-SPRING * dt);
      const offset = current - target;
      const drift = (velocity + SPRING * offset) * dt;
      velocity = (velocity - SPRING * drift) * decay;
      const next = target + (offset + drift) * decay;
      if (Math.abs(next - target) < 1e-4 && Math.abs(velocity) < 1e-3) {
        velocity = 0;
        return target;
      }
      return next;
    },
    /** Encore en mouvement : un écart à la cible, ou de l'élan. */
    moving(current: number, target: number) {
      return Math.abs(target - current) > 1e-4 || velocity !== 0;
    },
  };
}
