import { createStageProgress } from '../motion/stage-progress';
import { STUDIO_ENV_URL } from './studio';
import { pickVehicle, VEHICLE_IDS, vehicleUrl, type VehicleId } from './vehicles';

/**
 * Démarre la scène 3D sans jamais retarder le contenu : Three.js et le modèle ne sont
 * chargés qu'après l'événement `load`, pendant un temps mort du navigateur.
 * Sans WebGL 2 ou en mode économie de données, la page reste en version statique (affiche).
 */
export function bootStage(root: HTMLElement | null) {
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  const stops = [...root.querySelectorAll<HTMLElement>('[data-stop]')];
  if (!canvas || !stops.length) return;

  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || !('WebGL2RenderingContext' in window)) {
    root.classList.add('is-static');
    return;
  }

  // Même véhicule que l'affiche : tiré par le script en ligne du hero (data-vehicle sur <html>).
  const stamped = document.documentElement.dataset.vehicle as VehicleId | undefined;
  const vehicle = stamped && VEHICLE_IDS.includes(stamped) ? stamped : pickVehicle();
  const narrow = matchMedia('(max-width: 899px)');
  const progress = createStageProgress(stops, narrow);
  const modelUrl = vehicleUrl(vehicle, narrow.matches);

  const start = () => {
    performance.mark('stage:boot');
    // Modèle et environnement se téléchargent en même temps que le module Three.js.
    const assets = {
      model: fetch(modelUrl).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${modelUrl}`);
        return r.arrayBuffer();
      }),
      environment: fetch(STUDIO_ENV_URL)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null),
    };
    assets.model.catch(() => {}); // rejet traité par createStage (évite un avertissement anticipé)

    import('./stage')
      .then(({ createStage }) => {
        performance.mark('stage:module');
        return createStage({ root, canvas, stops, progress, narrow, vehicle, assets });
      })
      .catch((error) => {
        console.warn('[stage] 3D indisponible, version statique conservée.', error);
        root.classList.add('is-static');
      });
  };
  const idle = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 150);

  if (document.readyState === 'complete') idle(start);
  else addEventListener('load', () => idle(start), { once: true });
}
