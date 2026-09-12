import { mountCaptions } from '../motion/captions';
import { createStageProgress } from '../motion/stage-progress';
import { RIGS, type StopKey } from './rigs';
import { STUDIO_ENV_URL } from './studio';
import { pickVehicle, VEHICLE_IDS, vehicleUrl, type VehicleId } from './vehicles';

/**
 * Démarre la scène 3D. Avec l'entrée « MECA RIVIERA PRESENT », la 3D est la première scène : elle se
 * charge aussitôt, pendant l'entrée. Sans entrée (arrivée par un lien vers une section), elle ne retarde
 * jamais le contenu : Three.js et le modèle ne sont chargés qu'après `load`, pendant un temps mort.
 * Sans WebGL 2 ou en mode économie de données, la page reste en version statique (affiche) — l'entrée
 * est prévenue (meca:scene-ready, repli statique) et se lève sur l'affiche.
 */
export function bootStage(root: HTMLElement | null) {
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  const stops = [...root.querySelectorAll<HTMLElement>('[data-stop]')];
  if (!canvas || !stops.length) return;

  // Légendes mobiles (le texte ne passe jamais sur la scène) : pilotées par le scroll, avec ou sans 3D.
  const narrow = matchMedia('(max-width: 899px)');
  const progress = createStageProgress(stops, narrow);
  const rig = RIGS.c63;
  mountCaptions(root, stops, progress, narrow, stops.map((el) => rig[el.dataset.stop as StopKey]?.pace), { firstUntil: 0.12 });

  const fallback = () => {
    root.classList.add('is-static');
    dispatchEvent(new CustomEvent('meca:scene-ready', { detail: { static: true } }));
  };
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || !('WebGL2RenderingContext' in window)) {
    fallback();
    return;
  }

  // Même véhicule que l'affiche : tiré par le script en ligne du hero (data-vehicle sur <html>).
  const stamped = document.documentElement.dataset.vehicle as VehicleId | undefined;
  const vehicle = stamped && VEHICLE_IDS.includes(stamped) ? stamped : pickVehicle();
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
      // Le lointain de la première scène (photo de la baie) : décodé hors du fil principal, déjà retourné
      // pour WebGL. À défaut, la scène garde ses lumières de côte dessinées.
      bay: fetch(`/media/riviera-bay${narrow.matches ? '-m' : ''}.webp`)
        .then((r) => (r.ok ? r.blob() : null))
        .then((blob) => (blob ? createImageBitmap(blob, { imageOrientation: 'flipY' }) : null))
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
        fallback();
      });
  };
  const idle = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 150);

  if (document.documentElement.classList.contains('has-intro')) start();
  else if (document.readyState === 'complete') idle(start);
  else addEventListener('load', () => idle(start), { once: true });
}
