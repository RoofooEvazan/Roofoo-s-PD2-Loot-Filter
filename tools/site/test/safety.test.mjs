// Safety net: items the filter and the builder's data don't know always show, captioned "Missing".
import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, splitLines, Simulator, makeItem } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
for (const f of ['Roofoo.filter', 'RoofooMystery.filter', 'RoofooSlamfestBETA.filter']) {
  const base = fs.readFileSync(f, 'utf8');
  const { text, report } = buildFilter(base, { theme: 'classic', soundPack: 'classic', rules: [
    { key: 'NMAG:7gd', section: 'NMAG', codes: ['7gd'], fl: { 9: 'hide' } } ] }, game);
  const lines = splitLines(text).lines;
  const longest = Math.max(...lines.map(l => l.length));
  const netAt = lines.findIndex(l => l.startsWith('ItemDisplay[!BUILDER_KNOWN_ITEMS_1'));
  const firstOther = lines.findIndex(l => l.startsWith('ItemDisplay[') && !/^ItemDisplay\[box/.test(l) && !l.startsWith('ItemDisplay[!BUILDER_KNOWN'));
  assert.ok(netAt > 0 && netAt < firstOther, 'safety net comes before every other rule except the cube tooltip');
  assert.ok(longest <= 2429 || lines.filter(l => l.length > 2429).every(l => !l.includes('BUILDER_KNOWN')), 'no safety-net line longer than the filter already uses');
  const sim = new Simulator(text);
  // a brand-new item code, as if PD2 added it in a patch: shown on every level, in and out of town
  for (const [code, quality] of [['zz9', 'NMAG'], ['q7x', 'UNI']]) {
    for (let fl = 0; fl < 10; fl++) for (const where of ['ground', 'town']) {
      const r = sim.evaluate(makeItem(game, { code, quality, filtlvl: fl, where }));
      assert.ok(!r.hidden && r.name.includes('Missing'), `${code} FL${fl} ${where} shows as Missing`);
    }
  }
  // known items are untouched by the net
  for (const [code, quality] of [['r33', 'NMAG'], ['7gd', 'UNI'], ['hp1', 'NMAG'], ['uap', 'RARE'], ['cm3', 'MAG'], ['7gd', 'NMAG']]) {
    for (let fl = 0; fl < 10; fl++) {
      const r = sim.evaluate(makeItem(game, { code, quality, filtlvl: fl }));
      assert.ok(!r.name.includes('Missing'), `${code} not marked Missing`);
    }
  }
  assert.ok(sim.evaluate(makeItem(game, { code: '7gd', quality: 'NMAG', filtlvl: 9 })).hidden, 'player hide choices still work');
  console.log(`${f}: ${report.safetyNetCodes} known codes, longest line ${longest}, net at line ${netAt + 1}`);
}
console.log('safety ok');
