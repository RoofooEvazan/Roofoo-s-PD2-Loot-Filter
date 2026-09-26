// Custom builds drop the PD2 Trader market-price blocks (they only update in the launcher version).
import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, splitLines, Simulator, makeItem } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
for (const f of ['Roofoo.filter', 'RoofooMystery.filter', 'RoofooSlamfestBETA.filter']) {
  const base = fs.readFileSync(f, 'utf8');
  const baseLines = splitLines(base).lines;
  const { text, report } = buildFilter(base, { theme: 'classic', soundPack: 'classic' }, game);
  const lines = splitLines(text).lines;
  assert.ok(!lines.some(l => /^\/\/ (BEGIN|END) AUTO PD2TRADER/.test(l)), 'no price blocks left');
  assert.ok(!/ HR[ }%]/.test(text.replace(/^\/\/.*$/gm, '')), 'no HR prices in rules');
  // everything outside the blocks is untouched, in order
  const outside = []; let inb = false;
  for (const l of baseLines) { if (/^\/\/ BEGIN AUTO PD2TRADER/.test(l)) { inb = true; continue; } if (inb) { if (/^\/\/ END AUTO PD2TRADER/.test(l)) inb = false; continue; } outside.push(l); }
  const kept = lines.filter(l => !/REMOVED AUTO PD2TRADER|Roofoo Filter Builder|Custom build: live market prices|^\/\/\t(Customized|Base:|To keep|BUILDER-PROFILE|NOTE:)|^\/\/$/.test(l));
  assert.deepStrictEqual(kept.filter(l => l !== ''), outside.filter(l => l !== '' && l !== '//'));
  const sim = new Simulator(text);
  const cube = sim.evaluate(makeItem(game, { code: 'box', filtlvl: 4, where: 'inventory' }));
  assert.ok(cube.desc.includes('launcher version'), 'cube note');
  console.log(`${f}: removed ${report.priceBlocks} price blocks, ${baseLines.length - lines.length} fewer lines`);
}
console.log('prices ok');
