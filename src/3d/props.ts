import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Un décor en une pièce par matière (moins d'appels de dessin) : chaque maille fusionnée dans le repère du groupe,
 * encore à l'origine — toutes sans index (certaines formes, la boîte arrondie, n'en ont pas).
 */
export function mergeByMaterial(root: Object3D) {
  root.updateMatrixWorld(true);
  const parts = new Map<Material, BufferGeometry[]>();
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as Material;
    const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrixWorld);
    parts.set(material, [...(parts.get(material) ?? []), geometry]);
  });
  const merged = new Group();
  for (const [material, geometries] of parts) {
    const geometry = mergeGeometries(geometries);
    if (geometry) merged.add(new Mesh(geometry, material));
  }
  return merged;
}

/**
 * Téléphone : la mallette du mécanicien, grande ouverte devant le véhicule (72 × 42 cm) — coque rouge, calage noir ;
 * dans le fond, trois rangées de douilles chromées (empreinte hexagonale), deux cliquets et des rallonges ; dans le
 * couvercle relevé, l'éventail des clés mixtes et une rangée de tournevis. Au sol à côté, trois outils : un cliquet,
 * une clé mixte, un tournevis. Éclairée par la scène (lanterne, phares, ciel). Repère local : ouverture face à +z,
 * charnière à l'arrière (-z). `setLight` suit l'éclairage de la scène : dans la nuit, les outils restent un acier sombre
 * et mat (sans reflets bleutés du clair de lune ni du ciel) ; lanterne et phares allumés, ils brillent.
 */
export function toolCase() {
  const root = new Group();
  const shell = new MeshStandardMaterial({ color: 0xa3161a, roughness: 0.35 });
  const foam = new MeshStandardMaterial({ color: 0x141518, roughness: 0.95 });
  const chrome = new MeshStandardMaterial({ color: 0xe6e8ec, metalness: 1, roughness: 0.14 });
  const rubber = new MeshStandardMaterial({ color: 0x111113, roughness: 0.8 });
  const bore = new MeshStandardMaterial({ color: 0x050506, roughness: 1 });
  const grips = [0xc4141c, 0xf0b814].map((color) => new MeshStandardMaterial({ color, roughness: 0.45 }));
  const part = (geometry: BufferGeometry, material: Material, parent: Object3D, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  };
  const place = (tool: Object3D, parent: Object3D, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    tool.position.set(x, y, z);
    tool.rotation.set(rx, ry, rz);
    parent.add(tool);
  };

  // Les outils, couchés le long de x.
  const spanner = (length: number) => {
    const tool = new Group();
    const w = 0.012 + length * 0.05;
    part(new BoxGeometry(length, 0.004, w), chrome, tool, 0, 0, 0);
    part(new TorusGeometry(w * 0.85, w * 0.28, 8, 20), chrome, tool, -length / 2, 0, 0, Math.PI / 2);
    part(new TorusGeometry(w * 0.75, w * 0.25, 8, 20), chrome, tool, length / 2 + w * 0.3, 0, 0, Math.PI / 2);
    return tool;
  };
  const screwdriver = (grip: Material, length: number) => {
    const tool = new Group();
    part(new CapsuleGeometry(0.012, 0.075, 6, 12), grip, tool, 0, 0, 0, 0, 0, Math.PI / 2);
    part(new CylinderGeometry(0.0035, 0.0035, length, 8), chrome, tool, 0.05 + length / 2, 0, 0, 0, 0, Math.PI / 2);
    return tool;
  };
  const ratchet = (length: number) => {
    const tool = new Group();
    part(new BoxGeometry(length * 0.55, 0.012, 0.02), chrome, tool, length * 0.2, 0, 0);
    part(new CapsuleGeometry(0.013, length * 0.45, 6, 12), rubber, tool, -length * 0.28, 0, 0, 0, 0, Math.PI / 2);
    part(new CylinderGeometry(0.022, 0.022, 0.018, 18), chrome, tool, length * 0.5, 0, 0);
    return tool;
  };
  const socket = (r: number, h: number, x: number, y: number, z: number) => {
    part(new CylinderGeometry(r, r * 0.96, h, 16), chrome, root, x, y + h / 2, z);
    part(new CylinderGeometry(r * 0.62, r * 0.62, 0.002, 6), bore, root, x, y + h + 0.001, z);
  };

  // Le fond : coque arrondie, calage noir, poignée et fermoirs à l'avant.
  const [W, H, D] = [0.72, 0.1, 0.42];
  part(new RoundedBoxGeometry(W, H, D, 4, 0.02), shell, root, 0, H / 2, 0);
  part(new BoxGeometry(W - 0.05, 0.006, D - 0.05), foam, root, 0, H + 0.003, 0);
  part(new CapsuleGeometry(0.013, 0.17, 6, 12), rubber, root, 0, H * 0.55, D / 2 + 0.028, 0, 0, Math.PI / 2);
  for (const x of [-0.07, 0.07]) part(new BoxGeometry(0.02, 0.03, 0.03), rubber, root, x, H * 0.55, D / 2 + 0.012);
  for (const x of [-0.25, 0.25]) part(new BoxGeometry(0.05, 0.04, 0.012), chrome, root, x, H - 0.022, D / 2 + 0.003);
  // Trois rangées de douilles, des plus petites (devant) aux plus grandes, enfoncées dans le calage.
  const top = H + 0.006;
  const rows: [number, number, number, number][] = [
    [0.14, 11, 0.009, 0.026],
    [0.07, 9, 0.013, 0.03],
    [-0.005, 7, 0.018, 0.036],
  ];
  for (const [z, count, r0, h] of rows) {
    const span = W - 0.12;
    for (let i = 0; i < count; i++) socket(r0 + i * 0.0009, h + i * 0.0015, -span / 2 + (i * span) / (count - 1), top - 0.012, z);
  }
  // Au fond : deux cliquets et deux rallonges, couchés.
  place(ratchet(0.24), root, -0.16, top + 0.008, -0.1, 0, 0.05, 0);
  place(ratchet(0.2), root, 0.17, top + 0.008, -0.1, 0, -0.08, 0);
  part(new CylinderGeometry(0.006, 0.006, 0.15, 10), chrome, root, -0.02, top + 0.006, -0.155, 0, 0, Math.PI / 2);
  part(new CylinderGeometry(0.006, 0.006, 0.1, 10), chrome, root, 0.08, top + 0.006, -0.155, 0, 0, Math.PI / 2);
  // Le couvercle, relevé à 100° : coque, calage, l'éventail des clés mixtes, une rangée de tournevis.
  const lid = new Group();
  lid.position.set(0, H, -D / 2);
  lid.rotation.x = -(Math.PI / 2 + 0.17);
  part(new RoundedBoxGeometry(W, 0.055, D, 4, 0.02), shell, lid, 0, 0.0275, D / 2);
  part(new BoxGeometry(W - 0.05, 0.006, D - 0.05), foam, lid, 0, -0.003, D / 2);
  for (let i = 0; i < 12; i++) {
    const length = 0.13 + i * 0.013;
    place(spanner(length), lid, -0.29 + i * 0.053, -0.008, 0.05 + length / 2, 0, Math.PI / 2, 0);
  }
  for (let i = 0; i < 4; i++) place(screwdriver(grips[i % 2], 0.08 + i * 0.012), lid, -0.26 + i * 0.15, -0.012, D - 0.045);
  root.add(lid);
  // Au sol, à côté : trois outils.
  place(ratchet(0.22), root, W / 2 + 0.14, 0.012, 0.1, 0, -0.7, 0);
  place(spanner(0.24), root, W / 2 + 0.08, 0.003, 0.3, 0, 0.35, 0);
  place(screwdriver(grips[1], 0.13), root, 0.05, 0.013, D / 2 + 0.16, 0, -0.2, 0);
  /**
   * Éclairage de la scène, de 0 (la nuit) à 1 (lanterne et phares allumés). Dans la nuit, un métal renvoie la couleur de
   * la lumière qu'il reçoit — le clair de lune et le ciel, bleutés : l'acier sombre y prend une teinte chaude qui la
   * compense exactement (gris neutre) ; allumé, il redevient chrome.
   */
  const setLight = (level: number) => {
    const t = Math.min(Math.max(level, 0), 1);
    chrome.color.setRGB(0.32 + 0.48 * t, 0.26 + 0.54 * t, 0.18 + 0.62 * t);
    chrome.roughness = 0.45 - 0.31 * t;
  };
  setLight(0);
  return { group: mergeByMaterial(root), setLight };
}
