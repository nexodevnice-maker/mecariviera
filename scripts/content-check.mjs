// Gate publication : liste chaque information qui n'est pas CONFIRMED dans src/content/site.ts.
// Usage : npm run content:check [-- --strict]   (--strict : code de sortie 1 s'il reste des points)
import * as site from '../src/content/site.ts';

const rows = [];

function visit(path, node) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.status === 'string' && typeof node.source === 'string') {
    if (node.status !== 'CONFIRMED') rows.push({ path, status: node.status, note: node.note ?? '', source: node.source });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => visit(`${path}.${item?.id ?? i}`, item));
    return;
  }
  for (const [key, value] of Object.entries(node)) visit(path ? `${path}.${key}` : key, value);
}

for (const [key, value] of Object.entries(site)) visit(key, value);

if (!rows.length) {
  console.log('Contenu : tout est CONFIRMED.');
} else {
  console.log(`${rows.length} information(s) à valider avant publication :\n`);
  for (const r of rows) {
    console.log(`  [${r.status}] ${r.path}`);
    console.log(`      source : ${r.source}`);
    if (r.note) console.log(`      note   : ${r.note}`);
  }
}

if (process.argv.includes('--strict') && rows.length) process.exit(1);
