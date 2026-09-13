/**
 * Carte de la zone, téléphone : le littoral des Alpes-Maritimes de Cannes à Beaulieu-sur-Mer. Tracé schématique (pas
 * un fond cartographique) : coordonnées WGS84 approchées des points du rivage, des îles de Lérins et du Var. Tout est
 * calculé au build — projection locale à la même échelle dans les deux directions, courbes lissées (Catmull-Rom
 * centripète : ni boucle ni pointe aux caps), lignes de sonde à égale distance du rivage, îles comprises.
 */
export type Pt = [number, number];

/**
 * Rivage continental, d'ouest en est (la mer à droite du sens de tracé) : golfe de la Napoule, Cannes et la pointe de
 * la Croisette, Golfe-Juan, Juan-les-Pins, cap d'Antibes, Antibes, baie des Anges (Cagnes, embouchure du Var,
 * aéroport, promenade des Anglais), port de Nice, mont Boron, rade de Villefranche, cap Ferrat, Beaulieu, Èze-sur-Mer.
 */
export const SHORE: Pt[] = [
  [6.945, 43.5265], [6.958, 43.5325], [6.972, 43.5385], [6.987, 43.543], [7.0, 43.5465], [7.0085, 43.5487],
  [7.0125, 43.5465], [7.0175, 43.55], [7.0255, 43.5497], [7.033, 43.5478], [7.0375, 43.5445], [7.0402, 43.5378],
  [7.0418, 43.5356], [7.0455, 43.5395], [7.052, 43.5455], [7.06, 43.549], [7.0685, 43.5555], [7.076, 43.5632],
  [7.086, 43.5668], [7.1, 43.5672], [7.11, 43.566], [7.116, 43.5625], [7.1172, 43.556], [7.1188, 43.549],
  [7.124, 43.543], [7.1305, 43.5413], [7.137, 43.5465], [7.1408, 43.5535], [7.1378, 43.56], [7.1405, 43.5665],
  [7.1345, 43.5725], [7.1295, 43.579], [7.1285, 43.586], [7.1292, 43.591], [7.1272, 43.6005], [7.1268, 43.61],
  [7.1295, 43.6205], [7.1335, 43.6305], [7.1385, 43.6395], [7.144, 43.645], [7.156, 43.6525], [7.168, 43.6565],
  [7.182, 43.6585], [7.1963, 43.6593], [7.203, 43.6535], [7.213, 43.6495], [7.225, 43.658], [7.229, 43.667],
  [7.24, 43.68], [7.252, 43.6895], [7.265, 43.6945], [7.276, 43.6948], [7.282, 43.6928], [7.287, 43.6925],
  [7.293, 43.6912], [7.2988, 43.6873], [7.305, 43.6905], [7.308, 43.6975], [7.3105, 43.7032], [7.314, 43.7015],
  [7.3185, 43.6975], [7.3212, 43.692], [7.3218, 43.6855], [7.324, 43.6785], [7.329, 43.6718], [7.335, 43.6745],
  [7.3395, 43.68], [7.346, 43.6832], [7.3395, 43.688], [7.335, 43.691], [7.3335, 43.698], [7.3345, 43.704],
  [7.338, 43.7085], [7.344, 43.7128], [7.353, 43.717], [7.364, 43.721], [7.376, 43.725],
];

/** Îles de Lérins : Sainte-Marguerite, face à la Croisette, et Saint-Honorat au sud (contours fermés). */
export const ISLANDS: Pt[][] = [
  [
    [7.028, 43.5195], [7.0325, 43.5228], [7.04, 43.5245], [7.048, 43.5242], [7.056, 43.5224], [7.0625, 43.5196],
    [7.0655, 43.517], [7.06, 43.5145], [7.05, 43.5137], [7.042, 43.5143], [7.034, 43.5162],
  ],
  [[7.0395, 43.508], [7.045, 43.5098], [7.051, 43.5095], [7.0558, 43.5075], [7.053, 43.5052], [7.047, 43.5046], [7.0415, 43.5058]],
];

/** Le Var, de son embouchure vers le nord. */
export const VAR: Pt[] = [
  [7.1963, 43.6593], [7.1948, 43.67], [7.1927, 43.685], [7.1906, 43.7], [7.1892, 43.715], [7.1897, 43.73], [7.1918, 43.745],
  [7.1935, 43.77],
];

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Segment = [Pt, Pt, Pt, Pt];
const f = (n: number) => n.toFixed(1);

/** Catmull-Rom centripète → segments de Bézier cubiques (extrémités prolongées pour une courbe ouverte). */
function segments(pts: Pt[], closed = false): Segment[] {
  const n = pts.length;
  const at = (i: number): Pt => {
    if (closed) return pts[((i % n) + n) % n];
    if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
    if (i >= n) return [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]];
    return pts[i];
  };
  const d = (a: Pt, b: Pt) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-6;
  return Array.from({ length: closed ? n : n - 1 }, (_, i): Segment => {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const [d1, d2, d3] = [d(p0, p1), d(p1, p2), d(p2, p3)];
    const b1 = [0, 1].map(
      (k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)),
    ) as Pt;
    const b2 = [0, 1].map(
      (k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)),
    ) as Pt;
    return [p1, b1, b2, p2];
  });
}

const pathOf = (segs: Segment[], closed = false) =>
  `M${f(segs[0][0][0])},${f(segs[0][0][1])}` +
  segs.map(([, b1, b2, p]) => ` C${f(b1[0])},${f(b1[1])} ${f(b2[0])},${f(b2[1])} ${f(p[0])},${f(p[1])}`).join('') +
  (closed ? ' Z' : '');

/** Points de la courbe (steps par segment), pour les distances et les tests d'intérieur. */
function sample(segs: Segment[], steps: number): Pt[] {
  const out: Pt[] = [];
  for (const [p0, b1, b2, p1] of segs) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      out.push([0, 1].map((k) => w[0] * p0[k] + w[1] * b1[k] + w[2] * b2[k] + w[3] * p1[k]) as Pt);
    }
  }
  const last = segs[segs.length - 1][3];
  out.push([last[0], last[1]]);
  return out;
}

/** Courbe lissée passant par tous les points (ouverte, ou fermée). */
export const curve = (pts: Pt[], closed = false) => pathOf(segments(pts, closed), closed);

const inside = (p: Pt, poly: Pt[]) => {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) yes = !yes;
  }
  return yes;
};

/** Marching squares d'un champ (valeurs aux nœuds) au niveau 0 : segments de la ligne de niveau. */
function march(field: Float64Array, nx: number, ny: number, level: number, view: View, step: number) {
  const out: [Pt, Pt][] = [];
  const P = (i: number, j: number): Pt => [view.x + i * step, view.y + j * step];
  const cut = (a: Pt, b: Pt, fa: number, fb: number): Pt => {
    const t = fa / (fa - fb);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const f0 = field[j * nx + i] - level;
      const f1 = field[j * nx + i + 1] - level;
      const f2 = field[(j + 1) * nx + i + 1] - level;
      const f3 = field[(j + 1) * nx + i] - level;
      const idx = (f0 > 0 ? 1 : 0) | (f1 > 0 ? 2 : 0) | (f2 > 0 ? 4 : 0) | (f3 > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const [p0, p1, p2, p3] = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const top = () => cut(p0, p1, f0, f1);
      const right = () => cut(p1, p2, f1, f2);
      const bottom = () => cut(p3, p2, f3, f2);
      const left = () => cut(p0, p3, f0, f3);
      if (idx === 1 || idx === 14) out.push([left(), top()]);
      else if (idx === 2 || idx === 13) out.push([top(), right()]);
      else if (idx === 3 || idx === 12) out.push([left(), right()]);
      else if (idx === 4 || idx === 11) out.push([right(), bottom()]);
      else if (idx === 6 || idx === 9) out.push([top(), bottom()]);
      else if (idx === 7 || idx === 8) out.push([left(), bottom()]);
      // Col (deux coins opposés) : tranché par la valeur au centre de la case.
      else if ((idx === 5) === (f0 + f1 + f2 + f3 > 0)) out.push([top(), right()], [left(), bottom()]);
      else out.push([left(), top()], [right(), bottom()]);
    }
  }
  return out;
}

/** Segments bout à bout → lignes continues. */
function chain(segs: [Pt, Pt][]): Pt[][] {
  const key = (p: Pt) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const ends = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    for (const p of [a, b]) ends.set(key(p), [...(ends.get(key(p)) ?? []), k]);
  });
  const used = new Uint8Array(segs.length);
  const lines: Pt[][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = 1;
    const line: Pt[] = [segs[s][0], segs[s][1]];
    for (const forward of [true, false]) {
      for (;;) {
        const tip = forward ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) ?? []).find((k) => !used[k]);
        if (next === undefined) break;
        used[next] = 1;
        const [a, b] = segs[next];
        const other = key(a) === key(tip) ? b : a;
        if (forward) line.push(other);
        else line.unshift(other);
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Moyenne glissante (lignes ouvertes ou fermées) : adoucit la trame de la grille. */
function relax(pts: Pt[], radius: number, closed: boolean): Pt[] {
  const n = pts.length;
  return pts.map((_, i) => {
    let sx = 0;
    let sy = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = closed ? (i + k + n) % n : Math.min(Math.max(i + k, 0), n - 1);
      sx += pts[j][0];
      sy += pts[j][1];
      count++;
    }
    return [sx / count, sy / count];
  });
}

export interface Coast {
  view: View;
  /** Unités de la carte par kilomètre. */
  km: number;
  project: (p: Pt) => Pt;
  coast: string;
  land: string;
  islands: string[];
  river: string;
  /** Lignes de sonde, par profondeur (de la plus proche du rivage à la plus au large). */
  soundings: string[][];
}

/**
 * La carte : cadre (lon0, lat0 au coin nord-ouest ; lon1, lat1 au coin sud-est), échelle (unités par km), lignes de
 * sonde à `depths` km du rivage.
 */
export function buildCoast({
  lon0 = 6.955,
  lat0 = 43.765,
  lon1 = 7.36,
  lat1 = 43.5,
  km = 30,
  depths = [0.9, 2, 3.6],
}: Partial<{ lon0: number; lat0: number; lon1: number; lat1: number; km: number; depths: number[] }> = {}): Coast {
  const KY = km * 111.2;
  const KX = KY * Math.cos((43.63 * Math.PI) / 180);
  const project = ([lon, lat]: Pt): Pt => [(lon - lon0) * KX, (lat0 - lat) * KY];
  const view: View = { x: 0, y: 0, w: Math.round((lon1 - lon0) * KX), h: Math.round((lat0 - lat1) * KY) };

  const shore = SHORE.map(project);
  const shoreSegs = segments(shore);
  const shoreLine = sample(shoreSegs, 6);
  const [first, last] = [shore[0], shore[shore.length - 1]];
  const top = view.y - 60;
  const landPoly: Pt[] = [...shoreLine, [last[0] + 60, last[1]], [last[0] + 60, top], [first[0] - 60, top], [first[0] - 60, first[1]]];
  const islandSegs = ISLANDS.map((outline) => segments(outline.map(project), true));
  const islandPolys = islandSegs.map((segs) => sample(segs, 6));

  // Champ de distance au rivage (négatif à terre), sur une grille de 6 unités (200 m), puis lignes de niveau.
  const step = 6;
  const nx = Math.ceil(view.w / step) + 1;
  const ny = Math.ceil(view.h / step) + 1;
  const lines = [shoreLine, ...islandPolys.map((poly) => [...poly, poly[0]])];
  const segs: number[] = [];
  for (const line of lines) for (let i = 0; i < line.length - 1; i++) segs.push(line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]);
  const field = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = view.x + i * step;
      const y = view.y + j * step;
      let best = Infinity;
      for (let s = 0; s < segs.length; s += 4) {
        const [ax, ay, dx, dy] = [segs[s], segs[s + 1], segs[s + 2] - segs[s], segs[s + 3] - segs[s + 1]];
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        const ex = ax + t * dx - x;
        const ey = ay + t * dy - y;
        best = Math.min(best, ex * ex + ey * ey);
      }
      const onLand = inside([x, y], landPoly) || islandPolys.some((poly) => inside([x, y], poly));
      field[j * nx + i] = onLand ? -Math.sqrt(best) : Math.sqrt(best);
    }
  }
  const soundings = depths.map((depth) =>
    chain(march(field, nx, ny, depth * km, view, step))
      .filter((line) => line.length > 8)
      .map((line) => {
        const closed = Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) < step;
        const soft = relax(closed ? line.slice(0, -1) : line, 3, closed).filter((_, k) => k % 3 === 0);
        return soft.length > 3 ? curve(soft, closed) : '';
      })
      .filter(Boolean),
  );

  return {
    view,
    km,
    project,
    coast: pathOf(shoreSegs),
    land: `${pathOf(shoreSegs)} L${f(last[0] + 60)},${f(last[1])} L${f(last[0] + 60)},${f(top)} L${f(first[0] - 60)},${f(top)} L${f(first[0] - 60)},${f(first[1])} Z`,
    islands: islandSegs.map((segs) => pathOf(segs, true)),
    river: curve(VAR.map(project)),
    soundings,
  };
}
