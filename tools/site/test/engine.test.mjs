import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, Simulator, makeItem, findSlots, splitLines, readTiers, findMarkers, labelSegments } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
for (const f of ['Roofoo.filter', 'RoofooMystery.filter', 'RoofooSlamfestBETA.filter']) {
  const base = fs.readFileSync(f, 'latin1');
  const { lines } = splitLines(base);
  const slots = findSlots(lines);
  const missing = Object.entries(slots).filter(([k, v]) => !v.display.length).map(([k]) => k);
  const nosound = Object.entries(slots).filter(([k, v]) => v.sound === null).map(([k]) => k);
  console.log(f, 'slots missing:', missing.join(',') || 'none', '| no sound line:', nosound.join(','), '| markers:', JSON.stringify(findMarkers(lines)));
  const { text } = buildFilter(base, { theme: 'classic', soundPack: 'classic' }, game, { stripPrices: false });
  const body = text.split(/\r?\n/).slice(5).join(base.includes('\r\n') ? '\r\n' : '\n');
  assert.strictEqual(body, base, 'identity build must equal base for ' + f);
}
console.log('identity OK');
const base = fs.readFileSync('Roofoo.filter', 'latin1');
const sim = new Simulator(base);
console.log('levels', sim.levelNames);
const show = (o) => { const out = []; for (let fl = 0; fl < 10; fl++) { const r = sim.evaluate(makeItem(game, { ...o, filtlvl: fl })); out.push(r.hidden ? '--' : 'ok'); } return out.join(' '); };
const one = (o, fl=4) => { const r = sim.evaluate(makeItem(game, { ...o, filtlvl: fl })); return JSON.stringify({ h: r.hidden, n: r.name, i: r.icons, s: r.sound, t: r.tier, line: r.ruleLine+1 }); };
for (const o of [
  { code: 'uar', quality: 'UNI' }, { code: '7gd', quality: 'UNI' }, { code: '7gs', quality: 'UNI' }, { code: 'rar', quality: 'UNI' },
  { code: 'r33' }, { code: 'r23' }, { code: 'r01' }, { code: 'r08' }, { code: 'hp1' }, { code: 'hp5' }, { code: 'gpv' }, { code: 'glv', quality: 'NMAG' },
  { code: 'cm3', quality: 'MAG', ilvl: 85 }, { code: 'cm3', quality: 'MAG', ilvl: 91 }, { code: 'llmr' }, { code: 'lbox' },
  { code: '7gd', quality: 'NMAG', eth: true, sockets: 0, ed: 15 }, { code: 'uap', quality: 'RARE' }, { code: 'amu', quality: 'SET' }, { code: 'xtp', quality: 'UNI' },
  { code: 't31', quality: 'UNI' }, { code: 'jew', quality: 'UNI' }, { code: 'lsd', quality: 'NMAG' }, { code: 'rin', quality: 'UNI' },
]) console.log((o.code + ' ' + (o.quality || '') + (o.eth ? ' eth' : '')).padEnd(18), show(o), one(o));
