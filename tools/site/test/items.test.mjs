import fs from 'node:fs';
import assert from 'node:assert';
import { buildFilter, Simulator, makeItem } from '../../../docs/js/engine.js';
const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
const base = fs.readFileSync('Roofoo.filter', 'latin1');
const profile = { theme: 'classic', soundPack: 'classic', rules: [
  { key: 'UNI:7gd', section: 'UNI', codes: ['7gd'], label: 'Colossus Blade (unique)', eth: 'yes', fl: { 9: 'hide' } },
  { key: 'NMAG:7cr', section: 'NMAG', codes: ['7cr'], label: 'Phase Blade (normal & superior)', sup: 'sup', sock: [0, 5], eth: 'no', fl: { 8: 'show', 9: 'show' } },
  { key: 'MAG:cm3', section: 'MAG', codes: ['cm3'], label: 'Grand Charm (magic)', ilvlMin: 50, clvlMax: 70, fl: { 8: 'show' } },
  { key: 'RUNE:r01', section: 'RUNE', codes: ['r01', 'r01s'], label: 'El Rune', clvlMin: 60, fl: { 4: 'hide' } },
] };
const { text } = buildFilter(base, profile, game);
const lines = text.split(/\r?\n/);
const i = lines.findIndex(l => l.includes('PLAYER SHOW'));
console.log(lines.slice(i + 3, i + 14).join('\n'));
const sim = new Simulator(text);
const hid = o => sim.evaluate(makeItem(game, o)).hidden;
assert.strictEqual(hid({ code: '7gd', quality: 'UNI', eth: true, filtlvl: 9 }), true);
assert.strictEqual(hid({ code: '7gd', quality: 'UNI', eth: false, filtlvl: 9 }), false);
assert.strictEqual(hid({ code: '7cr', quality: 'SUP', ed: 3, sockets: 5, filtlvl: 9 }), false);
assert.strictEqual(hid({ code: '7cr', quality: 'NMAG', sockets: 5, filtlvl: 9 }), true, 'plain normal Phase Blade still hidden');
assert.strictEqual(hid({ code: 'cm3', quality: 'MAG', ilvl: 60, clvl: 65, filtlvl: 8 }), false);
assert.strictEqual(hid({ code: 'cm3', quality: 'MAG', ilvl: 60, clvl: 80, filtlvl: 8 }), true, 'char level above range keeps Roofoo');
assert.strictEqual(hid({ code: 'r01', filtlvl: 4, clvl: 70 }), true);
assert.strictEqual(hid({ code: 'r01', filtlvl: 4, clvl: 30 }), false);
console.log('items ok');
