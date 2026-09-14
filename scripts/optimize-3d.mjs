// Optimise les sources 3D brutes (3D/, jamais modifiées) vers public/3d/.
// Chaque modèle produit une variante desktop et une variante mobile (-m).
// Aucune affiliation constructeur suggérée : logos et plaques retirés, qu'ils soient
// - des pièces à part (matériaux « badge », « plate ») ;
// - modélisés dans une pièce de garniture (`erase` : triangles supprimés dans une zone) ;
// - imprimés dans un atlas de texture (`patch` : zones recouvertes d'un aplat) ;
// - photographiés sur un scan (`inpaint` : zones du véhicule comblées dans ses textures ; plaques comprises).
// La géométrie est simplifiée SAUF les peintures (le vernis révèle la moindre irrégularité),
// les textures peu visibles réduites, le tout fusionné par matériau, compressé (meshopt), en WebP.
// Usage : npm run assets:3d [-- <id> …]
import { mkdir, stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { center, dedup, flatten, join, meshopt, prune, simplifyPrimitive, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const LOGOS = /badge|plate/i;
const PAINT = /carpaint_max|paint_material|^black_paint$|^red_paint$/i;

// `erase` : zones en mètres (avant du véhicule vers +Z, repère source avant recentrage).
// `patch` : rectangles [x0, y0, x1, y1] en pixels de la texture source.
// `keepFrame` : pas de recentrage (le scan A1 garde son repère : les points désignés en dépendent).
const JOBS = [
  {
    // Scan photogrammétrique réel, capot ouvert : inspection 3D de la section Méthode.
    // Plaques (donnée personnelle) et logos effacés des textures : ils ne sont jamais publiés.
    id: 'a1-scan',
    src: '3D/AUDI_CAPOT_OUVERT/app_trnio_plus_test_voiture_arnaud.glb',
    keepFrame: true,
    // Repère du véhicule dans le scan, mesuré sur les roues et la plaque avant : centre au sol (x, z)
    // et cap de l'avant (rad, autour de la verticale). Zones : [avant, hauteur, côté passager] ± demi-tailles (m).
    frame: { origin: [0.055, -0.359], yaw: -0.4452 },
    inpaint: [
      // À l'avant, la photogrammétrie a aussi projeté plaque et anneaux sur les surfaces derrière la calandre.
      { name: 'plaque avant', center: [1.85, 0.566, 0], half: [0.25, 0.08, 0.3] },
      { name: 'anneaux de calandre', center: [1.84, 0.72, 0], half: [0.26, 0.065, 0.16], tone: 0.25 },
      { name: 'logo et sigle du cache moteur', center: [1.265, 0.962, 0.085], half: [0.065, 0.03, 0.13], diffuse: 200 },
      { name: 'plaque arrière et cadre du vendeur', center: [-1.89, 0.8, 0], half: [0.12, 0.085, 0.3] },
      { name: 'anneaux du hayon', center: [-1.89, 0.975, 0], half: [0.12, 0.05, 0.15] },
      { name: 'monogramme A1', center: [-1.841, 0.731, -0.488], half: [0.1, 0.04, 0.06] },
      { name: 'monogramme TDI', center: [-1.839, 0.744, 0.497], half: [0.1, 0.035, 0.07] },
      { name: 'cache de roue AVG', center: [1.098, 0.395, -0.8125], half: [0.08, 0.08, 0.07] },
      { name: 'cache de roue ARG', center: [-1.258, 0.351, -0.798], half: [0.08, 0.08, 0.07] },
      { name: 'cache de roue ARD', center: [-1.332, 0.362, 0.8027], half: [0.08, 0.08, 0.07] },
      { name: 'cache de roue AVD', center: [1.142, 0.397, 0.8107], half: [0.08, 0.08, 0.07] },
    ],
    variants: {
      d: { ratio: 0.5, error: 0.002, tex: 2048 },
      m: { ratio: 0.25, error: 0.004, tex: 1024 },
    },
  },
  {
    id: 'rs3',
    src: '3D/RS3/2023_audi_rs3_sedan_performance.glb',
    // Anneaux du coffre, modélisés dans le chrome des garnitures (au-dessus de la plaque).
    erase: [{ material: /coloured_material1/i, min: [-0.14, 0.87, -2.3], max: [0.14, 1.08, -2.0] }],
    // Anneaux et monogramme imprimés dans l'atlas des jantes (enjoliveurs).
    patch: [{ material: /wheel1a/i, rects: [[0, 0, 218, 86], [2, 284, 86, 510]] }],
    variants: {
      d: { ratio: 0.6, error: 0.001, tex: 1024, shrink: [[/engine/i, 256]] },
      m: { ratio: 0.3, error: 0.002, tex: 512, shrink: [[/engine|interior|chassis/i, 256]] },
    },
  },
  {
    id: 'c63',
    src: '3D/C63/2017_mercedes-benz_c63_amg_coupe.glb',
    variants: {
      d: { ratio: 1, error: 0, tex: 1024, shrink: [[/engine/i, 256]] },
      m: { ratio: 0.6, error: 0.002, tex: 512, shrink: [[/engine|interior|chassis/i, 256]] },
    },
  },
  {
    id: 'm4',
    src: '3D/M4/2022_bmw_m4_csl.glb',
    // Emblème rond et monogramme imprimés dans l'atlas des jantes (enjoliveurs).
    patch: [{ material: /wheel1a/i, rects: [[0, 0, 136, 136], [6, 428, 150, 486]] }],
    variants: {
      d: { ratio: 0.5, error: 0.001, tex: 1024, shrink: [[/engine/i, 256]] },
      m: { ratio: 0.3, error: 0.002, tex: 512, shrink: [[/engine|interior|chassis/i, 256]] },
    },
  },
  {
    // Téléphone : le corbeau du garde-corps (scan de musée, CC0), vu de loin dans la nuit — une silhouette. Ni textures,
    // ni coordonnées de texture, ni normales (lissées à l'exécution) : la géométrie se simplifie sans coutures. Repère
    // posé : pieds à l'origine, bec vers +Z, hauteur d'un grand corbeau perché.
    id: 'raven',
    src: '3D/CORBEAUX/common_raven.glb',
    keepFrame: true,
    bare: { color: [0.018, 0.018, 0.022], roughness: 0.42 },
    pose: { height: 0.44 },
    variants: {
      m: { ratio: 0.02, error: 0.01, tex: 256 },
    },
  },
];

const textureSlots = (m) => [
  m.getBaseColorTexture(),
  m.getNormalTexture(),
  m.getMetallicRoughnessTexture(),
  m.getOcclusionTexture(),
  m.getEmissiveTexture(),
];

/** Retire les primitives dont le matériau correspond au motif. */
const dropMaterials = (pattern) => (doc) => {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (pattern.test(prim.getMaterial()?.getName() ?? '')) prim.dispose();
    }
  }
};

/**
 * Supprime les triangles d'un matériau dont le centre tombe dans une boîte (mètres, repère monde).
 * À appliquer avant flatten() : les positions sont lues à travers la matrice monde de chaque nœud.
 */
const eraseTriangles = (zones = []) => (doc) => {
  if (!zones.length) return;
  const p = [0, 0, 0];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const rules = zones.filter((z) => z.material.test(prim.getMaterial()?.getName() ?? ''));
      const pos = prim.getAttribute('POSITION');
      const indices = prim.getIndices();
      if (!rules.length || !pos || !indices) continue;
      const keep = [];
      for (let t = 0; t < indices.getCount(); t += 3) {
        const c = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
          pos.getElement(indices.getScalar(t + k), p);
          c[0] += ((m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) * 100) / 3;
          c[1] += ((m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) * 100) / 3;
          c[2] += ((m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) * 100) / 3;
        }
        const inside = rules.some((r) => c.every((v, i) => v > r.min[i] && v < r.max[i]));
        if (!inside) keep.push(indices.getScalar(t), indices.getScalar(t + 1), indices.getScalar(t + 2));
      }
      if (keep.length === indices.getCount()) continue;
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(indices.getBuffer()));
    }
  }
};

/** Couleur médiane du pourtour d'un rectangle (pour un aplat qui se fond dans la pièce). */
function borderColor({ data, info }, [x0, y0, x1, y1]) {
  const samples = [];
  const at = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = x0; x < x1; x++) {
    at(x, y0);
    at(x, y1 - 1);
  }
  for (let y = y0; y < y1; y++) {
    at(x0, y);
    at(x1 - 1, y);
  }
  const median = (c) => samples.map((s) => s[c]).sort((a, b) => a - b)[samples.length >> 1];
  return `rgb(${median(0)},${median(1)},${median(2)})`;
}

/** Recouvre des zones de texture (logos imprimés dans un atlas) par des aplats de la couleur voisine. */
const patchTextures = (rules = []) => async (doc) => {
  for (const rule of rules) {
    for (const material of doc.getRoot().listMaterials()) {
      if (!rule.material.test(material.getName())) continue;
      const texture = material.getBaseColorTexture();
      if (!texture) continue;
      const source = Buffer.from(texture.getImage());
      const raw = await sharp(source).raw().toBuffer({ resolveWithObject: true });
      const { width, height } = raw.info;
      const rects = rule.rects.map(([x0, y0, x1, y1]) => [
        Math.max(0, x0),
        Math.max(0, y0),
        Math.min(width, x1),
        Math.min(height, y1),
      ]);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects
        .map((r) => `<rect x="${r[0]}" y="${r[1]}" width="${r[2] - r[0]}" height="${r[3] - r[1]}" fill="${borderColor(raw, r)}"/>`)
        .join('')}</svg>`;
      const out = await sharp(source).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
      texture.setImage(new Uint8Array(out)).setMimeType('image/png');
    }
  }
};

/** Remplit les pixels d'un triangle (coordonnées en pixels), élargi de `pad` pixels. */
function rasterize([ax, ay], [bx, by], [cx, cy], width, height, pad, plot) {
  const sign = Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  if (!sign) return;
  const edges = [
    [ax, ay, bx, by],
    [bx, by, cx, cy],
    [cx, cy, ax, ay],
  ].map(([x0, y0, x1, y1]) => {
    const length = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [x0, y0, (x1 - x0) / length, (y1 - y0) / length];
  });
  const xMin = Math.max(0, Math.floor(Math.min(ax, bx, cx) - pad));
  const xMax = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx) + pad));
  const yMin = Math.max(0, Math.floor(Math.min(ay, by, cy) - pad));
  const yMax = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy) + pad));
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      // Distance signée du centre du pixel à chaque bord (positive à l'intérieur).
      if (edges.every(([ex, ey, dx, dy]) => sign * (dx * (y + 0.5 - ey) - dy * (x + 0.5 - ex)) >= -pad)) plot(y * width + x);
    }
  }
}

/**
 * Efface des zones du véhicule (plaques, logos) dans les textures d'un scan : les triangles dont le
 * centre tombe dans une zone sont tracés dans l'espace UV, puis remplis de la couleur médiane de
 * leur pourtour 3D, bords fondus. Zones dans le repère du véhicule (`frame`).
 * À appliquer avant flatten() : les positions sont lues à travers la matrice monde de chaque nœud.
 */
const inpaintRegions = (frame, regions = []) => async (doc) => {
  if (!regions.length) return;
  const [ox, oz] = frame.origin;
  const cos = Math.cos(frame.yaw);
  const sin = Math.sin(frame.yaw);
  // `grow` : zone élargie (m) — son pourtour 3D donne la couleur de remplissage.
  const regionOf = ([x, y, z], grow = 0) => {
    const s = (x - ox) * cos + (z - oz) * sin;
    const l = -(x - ox) * sin + (z - oz) * cos;
    const local = [s, y, l];
    return regions.findIndex((r) => local.every((v, k) => Math.abs(v - r.center[k]) < r.half[k] + grow));
  };

  const byTexture = new Map();
  const shell = new Map();
  const all = new Map();
  const p = [0, 0, 0];
  const uv = [0, 0];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const texture = prim.getMaterial()?.getBaseColorTexture();
      const pos = prim.getAttribute('POSITION');
      const coords = prim.getAttribute('TEXCOORD_0');
      const indices = prim.getIndices();
      if (!texture || !pos || !coords || !indices) continue;
      for (let t = 0; t < indices.getCount(); t += 3) {
        const ids = [indices.getScalar(t), indices.getScalar(t + 1), indices.getScalar(t + 2)];
        const c = [0, 0, 0];
        for (const i of ids) {
          pos.getElement(i, p);
          c[0] += (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / 3;
          c[1] += (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / 3;
          c[2] += (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / 3;
        }
        const region = regionOf(c);
        const corners = ids.map((i) => [...coords.getElement(i, uv)]);
        if (!all.has(texture)) all.set(texture, []);
        all.get(texture).push(...corners[0], ...corners[1], ...corners[2]);
        if (region >= 0) {
          if (!byTexture.has(texture)) byTexture.set(texture, []);
          byTexture.get(texture).push({ region, uv: corners });
          continue;
        }
        // Pourtour 3D (6 cm) : un échantillon de couleur au centre UV du triangle.
        const near = regionOf(c, 0.06);
        if (near < 0) continue;
        if (!shell.has(texture)) shell.set(texture, []);
        shell.get(texture).push({ region: near, uv: [0, 1].map((k) => (corners[0][k] + corners[1][k] + corners[2][k]) / 3) });
      }
    }
  }

  const images = new Map();
  const decode = async (texture) => {
    if (!images.has(texture)) {
      const { data, info } = await sharp(Buffer.from(texture.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      images.set(texture, { data, width: info.width, height: info.height });
    }
    return images.get(texture);
  };
  // Couleur de remplissage : prise dans le pourtour 3D de chaque zone (calandre autour des anneaux,
  // pare-chocs autour de la plaque…). Plus fiable que le pourtour dans l'atlas : un atlas de
  // photogrammétrie est morcelé et ses marges répètent le contenu à effacer.
  const samples = regions.map(() => []);
  for (const [texture, list] of shell) {
    const { data, width, height } = await decode(texture);
    for (const { region, uv: [u, v] } of list) {
      const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(v * height)));
      const i = 3 * (y * width + x);
      samples[region].push([data[i], data[i + 1], data[i + 2]]);
    }
  }
  const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const fills = samples.map((list, r) => {
    if (!list.length) return null;
    // `tone` : rang dans le pourtour, du plus sombre (0) au plus clair (1) ; médiane par défaut.
    // Moyenne d'une fenêtre de ±3 % autour de ce rang : une vraie teinte du pourtour, sans bruit.
    list.sort((a, b) => luma(a) - luma(b));
    const at = Math.round((list.length - 1) * (regions[r].tone ?? 0.5));
    const window = list.slice(Math.max(0, at - (list.length >> 5)), at + (list.length >> 5) + 1);
    return [0, 1, 2].map((ch) => Math.round(window.reduce((sum, c) => sum + c[ch], 0) / window.length));
  });

  for (const [texture, triangles] of byTexture) {
    const { data, width, height } = await decode(texture);
    // Texels occupés par le maillage : la marge d'une zone ne gagne que des texels libres
    // (gouttières entre îlots de l'atlas, qui répètent le contenu à effacer), jamais une autre pièce.
    const used = new Uint8Array(width * height);
    const uvs = all.get(texture);
    for (let t = 0; t < uvs.length; t += 6) {
      const [a, b, c] = [0, 2, 4].map((k) => [uvs[t + k] * width, uvs[t + k + 1] * height]);
      rasterize(a, b, c, width, height, 0.7, (i) => (used[i] = 1));
    }
    const label = new Int16Array(width * height).fill(-1);
    const pixels = regions.map(() => []);
    let frontier = [];
    for (const { region, uv: corners } of triangles) {
      const [a, b, c] = corners.map(([u, v]) => [u * width, v * height]);
      rasterize(a, b, c, width, height, 1, (i) => {
        if (label[i] >= 0) return;
        label[i] = region;
        pixels[region].push(i);
        frontier.push(i);
      });
    }
    // Gouttières : jusqu'à 4 px (texture 4096) — elles couvrent le filtrage et la réduction (2048 / 1024).
    for (let k = 0; k < 4; k++) {
      const next = [];
      for (const i of frontier) {
        const x = i % width;
        for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
          if (j < 0 || j >= label.length || label[j] >= 0 || used[j]) continue;
          label[j] = label[i];
          pixels[label[i]].push(j);
          next.push(j);
        }
      }
      frontier = next;
    }
    for (const [r, list] of pixels.entries()) {
      if (!list.length) continue;
      // Pourtour : pixels hors zones à moins de 3 px ; sa couleur médiane sert de fond.
      const ring = new Set();
      for (const i of list) {
        const x = i % width;
        const y = (i - x) / width;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height && label[ny * width + nx] < 0) ring.add(ny * width + nx);
          }
        }
      }
      const border = [...ring];
      // INPAINT_DEBUG=1 : zones en magenta, sans diffusion, pour vérifier leur emprise sur un rendu.
      const fill = process.env.INPAINT_DEBUG
        ? [255, 0, 255]
        : (fills[r] ?? [0, 1, 2].map((ch) => border.map((i) => data[3 * i + ch]).sort((u, v) => u - v)[border.length >> 1] ?? 0));
      for (const i of list) for (let ch = 0; ch < 3; ch++) data[3 * i + ch] = fill[ch];
      // Diffusion (Gauss-Seidel) depuis le pourtour dans l'atlas (`diffuse` passes) : seulement sur une
      // surface continue (cache moteur) ; sur un atlas morcelé, elle réintroduirait le contenu effacé.
      for (let k = 0; k < (process.env.INPAINT_DEBUG ? 0 : (regions[r].diffuse ?? 0)); k++) {
        for (const i of list) {
          const x = i % width;
          const neighbours = [x > 0 && i - 1, x < width - 1 && i + 1, i >= width && i - width, i < width * (height - 1) && i + width].filter(
            (j) => j !== false,
          );
          for (let ch = 0; ch < 3; ch++) {
            let sum = 0;
            for (const j of neighbours) sum += data[3 * j + ch];
            data[3 * i + ch] = Math.round(sum / neighbours.length);
          }
        }
      }
      console.log(`  inpaint ${regions[r].name} : ${triangles.filter((t) => t.region === r).length} triangles, ${list.length} px (${width}×${height})`);
    }
    const png = await sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
    texture.setImage(new Uint8Array(png)).setMimeType('image/png');
  }
  for (const [r, region] of regions.entries()) {
    if (![...byTexture.values()].some((list) => list.some((t) => t.region === r))) console.warn(`  inpaint ${region.name} : aucun triangle`);
  }
};

/** Simplifie la géométrie, sauf les peintures. */
const simplifyExcept = (keep, options) => (doc) => {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!keep.test(prim.getMaterial()?.getName() ?? '')) simplifyPrimitive(prim, options);
    }
  }
};

/** Réduit les textures des matériaux correspondant au motif (dimension maximale en pixels). */
const shrinkTextures = (rules = []) => async (doc) => {
  const done = new Set();
  for (const [pattern, max] of rules) {
    for (const material of doc.getRoot().listMaterials()) {
      if (!pattern.test(material.getName())) continue;
      for (const texture of textureSlots(material)) {
        if (!texture || done.has(texture)) continue;
        done.add(texture);
        const [w, h] = texture.getSize() ?? [0, 0];
        if (Math.max(w, h) <= max) continue;
        const image = sharp(Buffer.from(texture.getImage())).resize(max, max, { fit: 'inside' });
        const out = texture.getMimeType() === 'image/png' ? await image.png().toBuffer() : await image.jpeg().toBuffer();
        texture.setImage(new Uint8Array(out));
      }
    }
  }
};

/**
 * Silhouette seule : textures, coordonnées de texture et normales retirées (matériau spéculaire-brillance compris),
 * une matière unie à la place.
 */
const bareMaterials = ({ color, roughness }) => (doc) => {
  for (const extension of doc.getRoot().listExtensionsUsed()) {
    if (/SpecularGlossiness/.test(extension.extensionName)) extension.dispose();
  }
  for (const material of doc.getRoot().listMaterials()) {
    material
      .setBaseColorTexture(null)
      .setNormalTexture(null)
      .setOcclusionTexture(null)
      .setMetallicRoughnessTexture(null)
      .setEmissiveTexture(null)
      .setBaseColorFactor([...color, 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(roughness);
  }
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) if (semantic !== 'POSITION') prim.setAttribute(semantic, null);
    }
  }
};

/**
 * Repère posé d'un animal scanné : transformations des nœuds appliquées aux sommets ; pieds à l'origine (centre du bas
 * du modèle), tête vers +Z (du bas du corps, queue comprise, au haut de la tête), hauteur `height` (m).
 */
const poseModel = ({ height }) => (doc) => {
  const accessors = new Set();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (accessors.has(pos)) continue;
      accessors.add(pos);
      const a = pos.getArray();
      for (let i = 0; i < a.length; i += 3) {
        const [x, y, z] = [a[i], a[i + 1], a[i + 2]];
        a[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
        a[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        a[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      }
    }
  }
  for (const node of doc.getRoot().listNodes()) node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  const points = [];
  for (const pos of accessors) {
    const a = pos.getArray();
    for (let i = 0; i < a.length; i += 3) points.push([a[i], a[i + 1], a[i + 2]]);
  }
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  const h = y1 - y0;
  const middle = (list) => [0, 2].map((k) => list.reduce((sum, p) => sum + p[k], 0) / list.length);
  const [fx, fz] = middle(points.filter((p) => p[1] < y0 + 0.06 * h));
  const head = middle(points.filter((p) => p[1] > y1 - 0.2 * h));
  const body = middle(points.filter((p) => p[1] > y0 + 0.15 * h && p[1] < y0 + 0.35 * h));
  const yaw = Math.atan2(head[0] - body[0], head[1] - body[1]);
  const [c, s, k] = [Math.cos(yaw), Math.sin(yaw), height / h];
  for (const pos of accessors) {
    const a = pos.getArray();
    for (let i = 0; i < a.length; i += 3) {
      const [x, y, z] = [a[i] - fx, a[i + 1] - y0, a[i + 2] - fz];
      a[i] = k * (x * c - z * s);
      a[i + 1] = k * y;
      a[i + 2] = k * (x * s + z * c);
    }
    pos.setArray(a);
  }
  console.log(`  pose : hauteur ${h.toFixed(3)} → ${height} m (×${k.toFixed(3)}), cap ${((yaw * 180) / Math.PI).toFixed(1)}°`);
};

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const only = process.argv.slice(2);
await mkdir('public/3d', { recursive: true });

for (const job of JOBS) {
  if (only.length && !only.includes(job.id)) continue;
  for (const [variant, v] of Object.entries(job.variants)) {
    const doc = await io.read(job.src);
    // prune() d'abord : un skin orphelin (RS3) empêche flatten() de remonter les nœuds, donc join() de fusionner.
    const steps = [
      dropMaterials(LOGOS),
      eraseTriangles(job.erase),
      patchTextures(job.patch),
      inpaintRegions(job.frame, job.inpaint),
      prune(),
      dedup(),
      flatten(),
      join(),
    ];
    if (job.bare) steps.push(bareMaterials(job.bare));
    steps.push(weld());
    if (v.ratio < 1) steps.push(simplifyExcept(PAINT, { simplifier: MeshoptSimplifier, ratio: v.ratio, error: v.error }));
    if (job.pose) steps.push(poseModel(job.pose));
    if (!job.keepFrame) steps.push(center({ pivot: 'below' }));
    steps.push(
      prune(),
      shrinkTextures(v.shrink),
      textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [v.tex, v.tex], quality: 82 }),
      meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    );
    await doc.transform(...steps);

    const out = `public/3d/${job.id}${variant === 'd' ? '' : `-${variant}`}.glb`;
    await io.write(out, doc);

    let tris = 0;
    let prims = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        prims++;
        const indices = prim.getIndices();
        tris += (indices ? indices.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
      }
    }
    const { size } = await stat(out);
    console.log(
      `${out.padEnd(24)} ${(size / 1e6).toFixed(2).padStart(6)} MB ${Math.round(tris).toString().padStart(8)} tris ${String(prims).padStart(4)} prims ${doc.getRoot().listTextures().length} tex`,
    );
  }
}
