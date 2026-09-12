// Affiches fixes des scènes 3D, capturées sur la vraie page au cadrage exact de leur premier arrêt :
// - hero : une par véhicule (?vehicle=…), affichée immédiatement, avant l'arrivée de la 3D ;
// - inspection (section Méthode) : affichée pendant le chargement du scan.
// Chacune sert aussi de repli permanent sans WebGL.
// Nécessite le serveur de dev (crochets window.__stage et window.__inspection).
// Usage : npm run assets:posters [-- stage|inspection] [-- <url>]
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4321/';
const only = args.filter((a) => !a.startsWith('http'));
const wanted = (kind) => !only.length || only.includes(kind);
const VEHICLES = ['c63', 'rs3', 'm4'];
const executablePath = [
  process.env.QA_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!executablePath) throw new Error('Aucun navigateur Chromium trouvé : définir QA_BROWSER.');

const targets = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

// Qualité un peu plus haute que les rendus éditoriaux : l'affiche est aussi le repli permanent sans WebGL.
async function save(png, base) {
  const image = sharp(png);
  const { width, height } = await image.metadata();
  await image.clone().avif({ quality: 62 }).toFile(`public/media/${base}.avif`);
  await image.clone().webp({ quality: 84 }).toFile(`public/media/${base}.webp`);
  console.log(`public/media/${base}.{avif,webp}  ${width}×${height}`);
}

mkdirSync('public/media', { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });

for (const vehicle of wanted('stage') ? VEHICLES : []) {
  for (const { name, ...options } of targets) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(`${url}?vehicle=${vehicle}`, { waitUntil: 'load' });
    await page.waitForFunction(() => '__stage' in window, null, { timeout: 60000 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    // Seule la scène : textes, en-tête, barre mobile et affiche existante masqués ; pas de fondu.
    await page.addStyleTag({
      content:
        '.stage__content,.site-header,.mbar,.stage__callout{visibility:hidden!important}.stage__poster,.stage__viewport::after,body::after{display:none!important}.stage__canvas{transition:none!important;opacity:1!important}',
    });
    // La nuit avant l'arrivée des phares : la scène 3D reprend exactement là, puis joue l'arrivée.
    await page.evaluate(() => window.__stage.settle({ arrival: 0 }));
    await page.waitForTimeout(250);
    await save(await page.locator('[data-stage-canvas]').screenshot(), `stage-${vehicle}-${name}`);
    await context.close();
  }
}

for (const { name, ...options } of wanted('inspection') ? targets : []) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${url}?vehicle=c63`, { waitUntil: 'load' });
  // Arrêt « capot » (le compartiment relevé et éclairé) au point focal, même calcul que
  // src/motion/stage-progress.ts : c'est le repli sans 3D, l'ouverture 3D étant noire.
  const top = await page.$$eval('[data-inspection] [data-stop]', (els) => {
    const el = els[1];
    const focus = matchMedia('(max-width: 899px)').matches ? el.querySelector('[data-focus]') : null;
    const r = (focus ?? el).getBoundingClientRect();
    return Math.round(r.top + scrollY + (focus ? 0 : r.height / 2) - innerHeight / 2);
  });
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForFunction(() => '__inspection' in window, null, { timeout: 60000 });
  await page.addStyleTag({
    content:
      '.method__content,.site-header,.mbar,.method__callout{visibility:hidden!important}.method__poster,.method__viewport::after,body::after{display:none!important}.method__canvas{transition:none!important;opacity:1!important}',
  });
  await page.evaluate(() => window.__inspection.settle());
  await page.waitForTimeout(250);
  await save(await page.locator('[data-inspection-canvas]').screenshot(), `inspection-${name}`);
  await context.close();
}

await browser.close();
