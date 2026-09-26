import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, Simulator, makeItem, splitLines, readTiers } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
const base = fs.readFileSync('Roofoo.filter', 'latin1');
const profile = {
  theme: 'frost', soundPack: 'tinks',
  slots: { tp: { words: ['GRAB ', ' IT'], symbol: '+', icons: [{ size: 'MAP', color: '84' }], sound: 35 }, ns: { sound: 4714 } },
  markers: { m_bases: { size: 'MAP', color: '9B' }, m_gems: null },
  tiers: { 'UNI|N|7gd': 'TP', 'UNI|N|uar': '', 'UNI|E|7gd': 'NS', 'SET|N|xar': 'TS', 'UNI|N|rin': 'OS' },
  rules: [
    { codes: ['r33'], label: 'Zod Rune', fl: { 9: 'hide' } },
    { codes: ['hp5'], label: 'Super Healing Potion', fl: { 3: 'show', 8: 'show' }, sound: 4720, marker: 'DOT-62' },
    { codes: ['7cr'], label: 'Phase Blade', q: ['NMAG', 'SUP'], eth: 'no', fl: { 8: 'show', 9: 'show' } },
  ],
};
const { text, report } = buildFilter(base, profile, game, { profileCode: 'TEST' });
console.log(report);
const diff = [];
const a = base.split(/\r?\n/), b = text.split(/\r?\n/);
console.log('lines', a.length, '->', b.length);

const sim = new Simulator(text);
const t = readTiers(splitLines(text).lines);
assert.strictEqual(t.map.get('UNI|N|7gd'), 'TP'); assert.strictEqual(t.map.get('UNI|N|uar'), undefined);
assert.strictEqual(t.map.get('UNI|E|7gd'), 'NS'); assert.strictEqual(t.map.get('SET|N|xar'), 'TS');
assert.strictEqual(t.map.get('UNI|N|rin'), 'OS'); assert.strictEqual(t.map.get('UNI|E|rin'), undefined);
const ev = (o) => { const out = []; for (let fl = 0; fl < 10; fl++) { const r = sim.evaluate(makeItem(game, { ...o, filtlvl: fl })); out.push(r.hidden ? '--' : 'ok'); } return out.join(' '); };
const one = (o, fl = 4) => { const r = sim.evaluate(makeItem(game, { ...o, filtlvl: fl })); return JSON.stringify({ n: r.name.trim(), i: r.icons, s: r.sound, line: r.ruleLine + 1 }); };
for (const o of [{ code: '7gd', quality: 'UNI' }, { code: '7gd', quality: 'UNI', eth: true }, { code: 'uar', quality: 'UNI' }, { code: 'xar', quality: 'SET' },
  { code: 'rin', quality: 'UNI' }, { code: 'r33' }, { code: 'hp5' }, { code: '7cr', quality: 'NMAG' }, { code: 'gpv' }, { code: 'uap', quality: 'UNI' }])
  console.log((o.code + ' ' + (o.quality || '') + (o.eth ? ' eth' : '')).padEnd(14), ev(o), one(o));
console.log('town hide check r33 FL9 town:', sim.evaluate(makeItem(game, { code: 'r33', filtlvl: 9, where: 'town' })).hidden);
console.log(b.slice(0, 5).join('\n'));
const i = b.findIndex(l => l.includes('PLAYER SHOW'));
console.log(b.slice(i - 1, i + 14).join('\n'));
const j = b.findIndex(l => l.includes('Player sound choices'));
console.log(b.slice(j - 2, j + 5).join('\n'));
