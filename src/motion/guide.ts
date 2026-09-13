import type { StageProgress } from './stage-progress';

/**
 * Pas guidés, sur téléphone : dans les deux scènes, un geste mène au plan suivant — jamais plusieurs d'un
 * élan. Le défilement reste natif ; des points d'arrêt (scroll-snap obligatoire, `scroll-snap-stop: always`)
 * sont posés au milieu du palier de lecture de chaque arrêt, là où la caméra est posée et la légende
 * affichée. La caméra les rejoint en ressort (follow.ts). Actif sur écran étroit et pointeur tactile, du haut
 * de la page jusqu'à la carte (dernier point) ; au-delà, défilement libre. Les liens internes vont droit au
 * but : sans pas intermédiaires, jusqu'au premier palier de la section visée.
 */
export const guided = matchMedia('(max-width: 899px) and (pointer: coarse)');
const html = document.documentElement;
const points: { el: HTMLElement; y: number }[] = [];
/** Scroll du dernier point (le haut de la carte) : au-delà, défilement libre. */
let end = Infinity;
/** Marge haute du défilement (en-tête fixe) : les points s'alignent dessous. */
let pad = 0;
let navigating = false;
let started = false;
let settleTimer = 0;

/**
 * Zoom au pincement (téléphone) : la page reste où elle était. Dès que deux doigts se posent, et tant que la page est
 * agrandie, les points d'accroche sont levés et la progression des scènes reste celle d'avant le zoom
 * (stage-progress.ts) : la voiture reste en place, sans pas ni changement de plan, doigts posés ou levés. Revenue à
 * l'échelle 1, doigts levés, la page reprend exactement sa position d'avant, et les pas reviennent.
 */
let zoomAt: number | null = null;
let fingers = 0;
/** Position (scrollY) tenue pendant un zoom au pincement ; null hors zoom. */
export const zoomHold = () => zoomAt;

const docTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

const update = () => {
  html.classList.toggle('is-guided', guided.matches && !navigating && zoomAt === null && window.scrollY < end - 2);
};

const zoomCheck = () => {
  const zoomed = guided.matches && (fingers > 1 || (window.visualViewport?.scale ?? 1) > 1.01);
  if (zoomed && zoomAt === null) {
    zoomAt = window.scrollY;
    update();
  } else if (!zoomed && zoomAt !== null && fingers === 0) {
    const y = zoomAt;
    zoomAt = null;
    // Retour instantané (sans glissé) à la position d'avant le zoom, avant que l'accroche ne revienne.
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    html.style.scrollBehavior = '';
    update();
  }
};

const onTouches = (event: TouchEvent) => {
  fingers = event.touches.length;
  zoomCheck();
};

const measureEnd = () => {
  pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
  const zone = document.getElementById('zone');
  end = zone ? docTop(zone) - pad : Infinity;
  update();
};

/** Fin d'un trajet de lien interne : les pas reprennent quand le défilement s'arrête. */
const settle = () => {
  clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    navigating = false;
    update();
  }, 200);
};

const onClick = (event: MouseEvent) => {
  if (!guided.matches || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
  const id = link?.hash.slice(1);
  const target = id ? document.getElementById(decodeURIComponent(id)) : null;
  if (!link || !target) return;
  event.preventDefault();
  const top = docTop(target) - pad;
  // Section à pas : jusqu'à son premier palier (titre lu, caméra posée), s'il est à portée.
  const first = points.find((p) => p.y >= top - 1 && p.y <= top + window.innerHeight * 1.5);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  navigating = true;
  update();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  window.scrollTo({
    top: Math.max(0, Math.min(first ? first.y : top, max)),
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
  settle();
};

function start() {
  if (started) return;
  started = true;
  addEventListener(
    'scroll',
    () => {
      if (navigating) settle();
      update();
    },
    { passive: true },
  );
  // Le doigt reprend la main pendant un trajet : les pas reviennent aussitôt.
  addEventListener(
    'touchstart',
    () => {
      if (!navigating) return;
      navigating = false;
      update();
    },
    { passive: true },
  );
  // Zoom au pincement : doigts posés ou levés, et échelle de la page (visualViewport).
  for (const type of ['touchstart', 'touchend', 'touchcancel'] as const)
    addEventListener(type, onTouches, { passive: true, capture: true });
  window.visualViewport?.addEventListener('resize', zoomCheck);
  addEventListener('resize', measureEnd);
  guided.addEventListener('change', measureEnd);
  new ResizeObserver(measureEnd).observe(document.body);
  document.addEventListener('click', onClick);
  measureEnd();
}

/** Pose un point d'arrêt par progression de `rests` (null : arrêt sans pas, p. ex. l'extinction). */
export function guideStops(stops: HTMLElement[], progress: StageProgress, rests: (number | null)[]) {
  const container = stops[0]?.parentElement;
  if (!container) return;
  pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
  const own = rests.flatMap((rest) => {
    if (rest === null) return [];
    const el = document.createElement('i');
    el.className = 'guide-point';
    el.setAttribute('aria-hidden', 'true');
    const point = { el, y: 0 };
    points.push(point);
    return [{ point, rest }];
  });
  const place = () => {
    const top = docTop(container);
    for (const { point, rest } of own) {
      point.y = Math.round(progress.scrollFor(rest));
      point.el.style.top = `${point.y + pad - top}px`;
    }
    points.sort((a, b) => a.y - b.y);
  };
  // Chaque point entre dans la page déjà à sa place : sans position, il se poserait en bas de la scène et
  // le défilement s'y accrocherait.
  place();
  for (const { point } of own) container.append(point.el);
  progress.onMeasure(place);
  start();
}
