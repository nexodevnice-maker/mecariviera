// Photo de la baie de Villefranche (unnamed.jpg, fournie par le porteur, hors version) → décor du premier plan :
//   public/media/riviera-bay.webp    bande large (ordinateur, tablette en paysage)
//   public/media/riviera-bay-m.webp  bande haute (téléphone, tablette en portrait)
//   public/media/riviera-moon.webp   la lune et son halo, à part : la scène la pose sous l'en-tête, au-dessus
//                                    de son reflet (la photo est en portrait — dans un écran en paysage, la lune
//                                    serait au-dessus du cadre)
// Les bandes commencent sous la lune et sa traînée (rangée 0,27) : jamais deux lunes, aucune retouche du ciel ;
// sa lueur, elle, reste dans la photo. Métadonnées retirées. Repères : src/3d/bay.ts (PHOTO, BANDS).
// Usage : node scripts/bay-assets.mjs [photo source]
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = process.argv[2] ?? 'unnamed.jpg';
if (!existsSync(SOURCE)) throw new Error(`${SOURCE} introuvable : photo source de la baie (hors version).`);

// Mêmes valeurs que src/3d/bay.ts.
const MOON = [0.428, 0.2202];
const MOON_RADIUS = 0.16; // part de la largeur
const BANDS = [
  { file: 'public/media/riviera-bay.webp', rows: [0.27, 0.72], width: 2048 },
  { file: 'public/media/riviera-bay-m.webp', rows: [0.27, 0.8], width: 1280 },
];

const image = sharp(SOURCE).rotate();
const { width: W, height: H } = await image.metadata();

for (const band of BANDS) {
  const top = Math.round(band.rows[0] * H);
  const height = Math.round(band.rows[1] * H) - top;
  const out = await image
    .clone()
    .extract({ left: 0, top, width: W, height })
    .resize({ width: band.width })
    .webp({ quality: 78, effort: 6 })
    .toFile(band.file);
  console.log(`${band.file}  ${out.width}×${out.height}  ${(out.size / 1024).toFixed(0)} Ko  (rangées ${band.rows.join(' → ')})`);
}

// La lune : carré centré sur elle ; le ciel qui l'entoure est retiré (plan incliné ajusté sur l'anneau du bord,
// le ciel s'éclairant vers l'horizon), puis le halo s'éteint vers le bord — ajoutée à la nuit, sans cadre.
const R = Math.round(MOON_RADIUS * W);
const cx = Math.round(MOON[0] * W);
const cy = Math.round(MOON[1] * H);
const size = 2 * R;
const { data } = await image.clone().extract({ left: cx - R, top: cy - R, width: size, height: size }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
// Moindres carrés, par canal : valeur = a + b·x + c·y sur l'anneau 0,9 R → R.
const fit = [0, 1, 2].map((ch) => {
  let n = 0, sx = 0, sy = 0, sv = 0, sxx = 0, syy = 0, sxy = 0, sxv = 0, syv = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - R, y - R);
      if (r < 0.9 * R || r > R) continue;
      const v = data[(y * size + x) * 3 + ch];
      const u = x - R, w = y - R;
      n++; sx += u; sy += w; sv += v; sxx += u * u; syy += w * w; sxy += u * w; sxv += u * v; syv += w * v;
    }
  }
  // Système normal 3 × 3 (anneau symétrique : termes croisés quasi nuls, résolu directement).
  const b = (sxv - (sx * sv) / n) / (sxx - (sx * sx) / n);
  const c = (syv - (sy * sv) / n) / (syy - (sy * sy) / n);
  const a = (sv - b * sx - c * sy) / n;
  return { a, b, c };
});
const moon = Buffer.alloc(size * size * 3);
const smooth = (e0, e1, v) => { const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const r = Math.hypot(x - R, y - R);
    const fade = 1 - smooth(0.5 * R, R, r);
    for (let ch = 0; ch < 3; ch++) {
      const { a, b, c } = fit[ch];
      const sky = a + b * (x - R) + c * (y - R);
      const i = (y * size + x) * 3 + ch;
      moon[i] = Math.round(Math.max(data[i] - sky, 0) * fade);
    }
  }
}
const out = await sharp(moon, { raw: { width: size, height: size, channels: 3 } })
  .resize({ width: 512 })
  .webp({ quality: 90, effort: 6 })
  .toFile('public/media/riviera-moon.webp');
console.log(`public/media/riviera-moon.webp  ${out.width}×${out.height}  ${(out.size / 1024).toFixed(0)} Ko  (ciel retiré : ${fit.map((f) => f.a.toFixed(0)).join('/')})`);
