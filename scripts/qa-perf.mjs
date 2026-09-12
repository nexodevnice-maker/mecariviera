// Mesure de performance sur le build de production (npm run build, puis astro preview) :
// FCP, LCP (et son élément), CLS, TBT approché, octets transférés par type, jalons de la scène 3D
// et tâches longues (> 100 ms) horodatées pour attribuer le blocage du fil principal.
// Profil mobile bridé comparable à Lighthouse mobile : 1,6 Mb/s, 150 ms de latence, CPU ÷4.
// Véhicule fixé (le site en tire un au hasard) : deux mesures comparent le même modèle. QA_VEHICLE=rs3|m4, sinon c63.
// Usage : node scripts/qa-perf.mjs [url]   (défaut : http://localhost:4322/)
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const vehicle = process.env.QA_VEHICLE ?? 'c63';
const url = `${process.argv[2] ?? 'http://localhost:4322/'}?vehicle=${vehicle}`;
const executablePath = [
  process.env.QA_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!executablePath) throw new Error('Aucun navigateur Chromium trouvé : définir QA_BROWSER.');

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, cpu: 1, network: null },
  {
    name: 'mobile-4g',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    cpu: 4,
    network: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  },
];

const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });

for (const { name, cpu, network, ...options } of profiles) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (network) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

  const types = new Map();
  const bytes = {};
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => {
    const type = types.get(e.requestId) ?? 'Other';
    bytes[type] = (bytes[type] ?? 0) + e.encodedDataLength;
  });

  await page.addInitScript(() => {
    const perf = { fcp: 0, lcp: 0, lcpElement: '', cls: 0, tbt: 0, longTasks: [] };
    Object.assign(window, { __perf: perf });
    const observe = (type, fn) => new PerformanceObserver((list) => list.getEntries().forEach(fn)).observe({ type, buffered: true });
    observe('paint', (e) => {
      if (e.name === 'first-contentful-paint') perf.fcp = e.startTime;
    });
    observe('largest-contentful-paint', (e) => {
      perf.lcp = e.startTime;
      perf.lcpElement = e.element ? `${e.element.tagName.toLowerCase()}.${e.element.className}`.slice(0, 60) : e.url;
    });
    observe('layout-shift', (e) => {
      if (!e.hadRecentInput) perf.cls += e.value;
    });
    observe('longtask', (e) => {
      perf.tbt += Math.max(0, e.duration - 50);
      if (e.duration > 100) perf.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]);
    });
  });

  const start = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const load = Date.now() - start;
  const stage3d = await page
    .waitForSelector('canvas.is-ready', { timeout: 90000 })
    .then(() => Date.now() - start)
    .catch(() => null);
  await page.waitForTimeout(3000);
  const perf = await page.evaluate(() => window.__perf);
  const marks = await page.evaluate(() =>
    performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('stage:'))
      .map((m) => `${m.name.replace('stage:', '')} ${Math.round(m.startTime)}${m.detail ? ` ${JSON.stringify(m.detail)}` : ''}`),
  );

  const kb = (n) => Math.round(n / 1024);
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  console.log(
    `${name.padEnd(10)} [${vehicle}] FCP ${Math.round(perf.fcp)} ms · LCP ${Math.round(perf.lcp)} ms (${perf.lcpElement}) · CLS ${perf.cls.toFixed(3)} · TBT ~${Math.round(perf.tbt)} ms · load ${load} ms · 3D prête ${stage3d ?? '—'} ms`,
  );
  console.log(
    `${''.padEnd(10)} ${kb(total)} Ko transférés : ${Object.entries(bytes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, n]) => `${type} ${kb(n)}`)
      .join(', ')}`,
  );
  console.log(`${''.padEnd(10)} jalons 3D : ${marks.join(' · ')}`);
  console.log(`${''.padEnd(10)} tâches > 100 ms [début, durée] : ${JSON.stringify(perf.longTasks.slice(0, 24))}`);
  await context.close();
}

await browser.close();
