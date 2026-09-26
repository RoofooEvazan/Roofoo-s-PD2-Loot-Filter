import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, splitLines, readMystery, Simulator, makeItem } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
const base = fs.readFileSync('RoofooMystery.filter', 'utf8');
const m0 = readMystery(splitLines(base).lines);
console.log('buckets:', [...m0.map].map(([k, b]) => `${k}=${b}`).join(' '));
console.log('boss:', m0.boss.join(' '));
assert.strictEqual(m0.map.get('item|r30'), 'LUCKY');
const profile = {
  theme: 'frost', soundPack: 'classic',
  slots: { m_lucky: { words: ['LUCKY!'], sound: 4729 } },
  mystery: { 'item|r30': 'LITTLE', 'item|lbox': '', 'UNI|N|uap': 'BIG', 'UNI|E|7gd': '' },
};
const { text, report } = buildFilter(base, profile, game);
console.log('report.mystery', report.mystery);
const lines = splitLines(text).lines;
for (const l of lines.filter(l => /^Alias\[BASTARD_/.test(l))) console.log(l);
const m1 = readMystery(lines);
assert.strictEqual(m1.map.get('item|r30'), 'LITTLE');
assert.strictEqual(m1.map.get('item|lbox'), undefined);
assert.strictEqual(m1.map.get('UNI|N|uap'), 'BIG');
assert.strictEqual(m1.map.get('UNI|E|7gd'), undefined);
const sim = new Simulator(text);
const show = o => { const r = sim.evaluate(makeItem(game, { filtlvl: 4, ...o })); return `${r.hidden ? 'HIDDEN' : r.name.replace(/%[A-Z_]+%/g, '').trim()} [sound ${r.sound}]`; };
console.log('Ber outside   :', show({ code: 'r30' }));
console.log('Ber in town   :', show({ code: 'r30', where: 'town' }));
console.log('Zod outside   :', show({ code: 'r33' }));
console.log('Shako unique  :', show({ code: 'uap', quality: 'UNI' }));
console.log('Puzzlebox     :', show({ code: 'lbox' }));
console.log('GF eth unique :', show({ code: '7gd', quality: 'UNI', eth: true }));
console.log('mystery ok');
