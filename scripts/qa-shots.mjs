// QA visuelle : captures déterministes de chaque arrêt de la scène et de chaque section,
// desktop et mobile, avec relevé des erreurs console et audit d'accessibilité (axe-core).
// Nécessite le serveur de dev (crochet window.__stage).
// Usage : node scripts/qa-shots.mjs [dossier] [url]
// Variables : QA_ONLY=desktop|mobile  QA_REDUCED=1 (prefers-reduced-motion)  QA_BROWSER=<chemin>  QA_NO_AXE=1
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const out = process.argv[2] ?? 'qa-shots';
const url = process.argv[3] ?? 'http://localhost:4321/';
const only = process.env.QA_ONLY?.split(',');
mkdirSync(out, { recursive: true });

const executablePath = [
  process.env.QA_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!executablePath) throw new Error('Aucun navigateur Chromium trouvé : définir QA_BROWSER.');

const viewports = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

for (const { name, ...options } of viewports) {
  if (only && !only.includes(name)) continue;
  const context = await browser.newContext({
    ...options,
    reducedMotion: process.env.QA_REDUCED ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 240)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
  });

  // Véhicule fixé pour des captures reproductibles (le site en tire un au hasard) : QA_VEHICLE=rs3|m4, sinon c63.
  await page.goto(`${url}?vehicle=${process.env.QA_VEHICLE ?? 'c63'}`, { waitUntil: 'load' });
  // Pas guidés (téléphone tactile) neutralisés : chaque capture au point focal exact de son arrêt.
  await page.addStyleTag({ content: 'html{scroll-snap-type:none!important}' });
  const has3d = await page
    .waitForFunction(() => '__stage' in window, null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!has3d) logs.push('[qa] scène 3D absente (window.__stage)');
  await page.waitForTimeout(1600);

  // Même point focal que src/motion/stage-progress.ts : centre de l'arrêt, ou haut de la feuille en mobile.
  const stops = await page.$$eval('[data-stop]', (els) =>
    els.map((el) => {
      const focus = matchMedia('(max-width: 899px)').matches && !el.closest('.has-captions') ? el.querySelector('[data-focus]') : null;
      const r = (focus ?? el).getBoundingClientRect();
      const mark = r.top + scrollY + (focus ? 0 : r.height / 2);
      return { key: el.dataset.stop, y: Math.round(mark - innerHeight / 2), inspection: Boolean(el.closest('[data-inspection]')) };
    }),
  );
  for (const [i, stop] of stops.entries()) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), stop.y);
    // L'inspection 3D (section Méthode) se charge à l'approche : l'attendre avant de capturer.
    if (stop.inspection) {
      await page
        .waitForFunction(() => '__inspection' in window, null, { timeout: 45000 })
        .catch(() => logs.push('[qa] inspection 3D absente (window.__inspection)'));
    }
    await page.evaluate(() => {
      window.__stage?.settle();
      window.__inspection?.settle();
    });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${out}/${name}${process.env.QA_VEHICLE ? `-${process.env.QA_VEHICLE}` : ''}-${String(i).padStart(2, '0')}-${stop.key}.png` });
  }

  // Sections après la scène : un écran à partir du haut de chacune (en-tête fixe compris).
  const sections = await page.$$eval('main > section[id], body > footer', (els) =>
    els.map((el) => ({ key: el.id || el.tagName.toLowerCase(), y: Math.round(el.getBoundingClientRect().top + scrollY) })),
  );
  for (const section of sections) {
    for (const [k, offset] of [0, 1].entries()) {
      const y = section.y + offset * (options.viewport.height - 120);
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${name}${process.env.QA_VEHICLE ? `-${process.env.QA_VEHICLE}` : ''}-s-${section.key}-${k}.png` });
    }
  }

  if (!process.env.QA_NO_AXE) {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] });
      return result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
      }));
    });
    logs.push(`[axe] ${violations.length} violation(s)`);
    for (const v of violations) logs.push(`[axe] ${v.impact} ${v.id} — ${v.help} → ${v.nodes.join(' | ')}`);
  }

  const info = await page.evaluate(() => window.__stage?.info());
  console.log(`${name.padEnd(8)} ${stops.length} arrêts, ${sections.length} sections  ${JSON.stringify(info)}`);
  for (const line of logs) if (!/X4122|double precision/.test(line)) console.log(`  ${line}`);
  await context.close();
}

await browser.close();
