// Pré-calcule l'environnement lumineux du studio (PMREM, format CubeUV de Three.js) et l'enregistre
// en Radiance HDR (RGBE, compression RLE). À l'exécution, plus aucun rendu ni compilation de shaders
// de flou : le fichier est décodé et utilisé tel quel (mapping CubeUVReflectionMapping).
// Les lignes sont écrites dans l'ordre GL (bas → haut) : la texture est chargée avec flipY = false.
// Usage : npm run assets:env
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, posix } from 'node:path';
import { chromium } from 'playwright-core';
import { STUDIO_ENV_SIGMA, STUDIO_ENV_SIZE, STUDIO_ENV_URL, STUDIO_PANELS } from '../src/3d/studio.ts';

const ORIGIN = 'http://bake.local';
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
</head><body><script type="module">
import * as THREE from 'three';

window.bake = (panels, sigma, size) => {
  const renderer = new THREE.WebGLRenderer();
  const env = new THREE.Scene();
  const plane = new THREE.PlaneGeometry(1, 1);
  for (const p of panels) {
    const mesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.power), side: THREE.DoubleSide }));
    mesh.scale.set(p.size[0], p.size[1], 1);
    mesh.position.set(...p.position);
    mesh.rotation.set(...p.rotation);
    env.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, sigma, 0.1, 100, { size });
  const { width, height } = target;

  // Copie texel à texel (texelFetch) vers une cible Float32 lisible.
  const floatTarget = new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType, depthBuffer: false });
  const copy = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { map: { value: target.texture } },
      vertexShader: 'in vec3 position; void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; uniform sampler2D map; out vec4 color; void main() { color = texelFetch(map, ivec2(gl_FragCoord.xy), 0); }',
    }),
  );
  copy.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(copy);
  renderer.setRenderTarget(floatTarget);
  renderer.render(scene, new THREE.Camera());
  renderer.setRenderTarget(null);
  const data = new Float32Array(width * height * 4);
  renderer.readRenderTargetPixels(floatTarget, 0, 0, width, height, data);

  // RGBE : mantisse 8 bits par canal, exposant partagé.
  const rgbe = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[4 * i], g = data[4 * i + 1], b = data[4 * i + 2];
    const v = Math.max(r, g, b);
    if (v < 1e-32) continue;
    const e = Math.floor(Math.log2(v)) + 1;
    const scale = 256 / Math.pow(2, e);
    rgbe[4 * i] = Math.min(255, Math.floor(r * scale));
    rgbe[4 * i + 1] = Math.min(255, Math.floor(g * scale));
    rgbe[4 * i + 2] = Math.min(255, Math.floor(b * scale));
    rgbe[4 * i + 3] = e + 128;
  }
  let binary = '';
  for (let i = 0; i < rgbe.length; i += 0x8000) binary += String.fromCharCode(...rgbe.subarray(i, i + 0x8000));
  return { width, height, rgbe: btoa(binary) };
};
window.bakeReady = true;
</script></body></html>`;

/** Compression RLE « nouveau format » Radiance d'un canal d'une ligne. */
function rleChannel(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    let run = 1;
    while (i + run < bytes.length && run < 127 && bytes[i + run] === bytes[i]) run++;
    if (run >= 3) {
      out.push(128 + run, bytes[i]);
      i += run;
      continue;
    }
    const start = i;
    let count = 0;
    while (i < bytes.length && count < 128) {
      let r = 1;
      while (i + r < bytes.length && r < 3 && bytes[i + r] === bytes[i]) r++;
      if (r >= 3) break;
      i++;
      count++;
    }
    out.push(count, ...bytes.subarray(start, start + count));
  }
  return out;
}

function encodeHDR(width, height, rgbe) {
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'ascii');
  const chunks = [header];
  const channel = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const line = [2, 2, width >> 8, width & 255];
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; x++) channel[x] = rgbe[4 * (y * width + x) + c];
      line.push(...rleChannel(channel));
    }
    chunks.push(Buffer.from(line));
  }
  return Buffer.concat(chunks);
}

const executablePath = [
  process.env.QA_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => p && existsSync(p));
if (!executablePath) throw new Error('Aucun navigateur Chromium trouvé : définir QA_BROWSER.');

const browser = await chromium.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
await page.route(`${ORIGIN}/**`, (route) => {
  const path = posix.normalize(new URL(route.request().url()).pathname);
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: HTML });
  const file = join(process.cwd(), path);
  if (!path.startsWith('/node_modules/three/') || !existsSync(file)) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ contentType: extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream', body: readFileSync(file) });
});
await page.goto(`${ORIGIN}/`);
await page.waitForFunction(() => window.bakeReady === true);

const { width, height, rgbe } = await page.evaluate(([p, s, n]) => window.bake(p, s, n), [STUDIO_PANELS, STUDIO_ENV_SIGMA, STUDIO_ENV_SIZE]);
const file = join('public', STUDIO_ENV_URL);
writeFileSync(file, encodeHDR(width, height, Buffer.from(rgbe, 'base64')));
console.log(`${file}  ${width}×${height}  ${(readFileSync(file).length / 1024).toFixed(1)} Ko`);
await browser.close();
