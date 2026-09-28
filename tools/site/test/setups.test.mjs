// Old setups must keep loading. Every file in test/setups/ is a sample of a past (or future) setup
// format; each one is upgraded, checked, built into a filter and run through the simulator.
// When the setup format changes, bump SETUP_VERSION in docs/js/setup.js, add the upgrade step,
// and add a sample of the old format here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { buildFilter, Simulator, makeItem } from '../../../docs/js/engine.js';
import { SETUP_VERSION, upgradeSetup, upgradeMessage, blankProfile } from '../../../docs/js/setup.js';

const game = JSON.parse(fs.readFileSync('docs/data/game.json', 'utf8'));
const base = fs.readFileSync('Roofoo.filter', 'latin1');
const dir = 'tools/site/test/setups';
const load = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

// every sample loads, ends up current, builds and simulates
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const file = load(f);
  const up = upgradeSetup(file.profile, game);
  const p = up.profile;
  assert.strictEqual(p.v, SETUP_VERSION, f);
  for (const r of p.rules) {
    assert.ok(r.section && r.key === `${r.section}:${r.codes[0]}`, `${f}: ${JSON.stringify(r)}`);
    assert.ok(!('kind' in r) && !('q' in r), f);
  }
  // upgrading again changes nothing
  assert.deepStrictEqual(upgradeSetup(clone(p), game).profile, p, `${f}: not stable`);
  const { text } = buildFilter(base, p, game);
  const sim = new Simulator(text);
  sim.evaluate(makeItem(game, { code: 'uap', quality: 'UNI', filtlvl: 9 }));
  console.log(`${f}: from v${up.from}, ${up.notes.length ? 'dropped ' + up.notes.join('; ') : 'nothing dropped'}`);
}

// v1: rules by kind/quality become Items-tab rows, and they still do what they did
{
  const up = upgradeSetup(load('v1-legacy.roofoo-setup.json').profile, game);
  const keys = up.profile.rules.map(r => r.key);
  assert.deepStrictEqual(keys, ['UNI:uap', 'NMAG:7cr', 'RUNE:r01', 'POT:hp5']);
  assert.strictEqual(up.profile.rules[1].sup, 'sup');
  assert.strictEqual(up.profile.theme, 'ember');
  assert.deepStrictEqual(Object.keys(up.profile.slots), ['uber']);
  assert.ok(up.notes.some(n => /crafted/.test(n)), 'crafted rule reported');
  assert.ok(up.notes.some(n => /no longer in the game/.test(n)), 'missing item reported');
  assert.ok(up.notes.some(n => /label setting/.test(n)), 'retired slot reported');
  assert.ok(/couldn't be carried over/.test(upgradeMessage(up)));
  const sim = new Simulator(buildFilter(base, up.profile, game).text);
  assert.strictEqual(sim.evaluate(makeItem(game, { code: 'uap', quality: 'UNI', filtlvl: 9 })).hidden, true, 'Shako hidden at FL9');
  assert.strictEqual(sim.evaluate(makeItem(game, { code: 'r01', filtlvl: 4 })).hidden, true, 'El hidden at FL4');
}

// current format: untouched, no message
{
  const file = load('v2-current.roofoo-setup.json');
  const up = upgradeSetup(file.profile, game);
  assert.deepStrictEqual(up.notes, []);
  assert.strictEqual(upgradeMessage(up), '');
  assert.deepStrictEqual(up.profile, file.profile);
}

// newer builder: load what we understand, warn
{
  const up = upgradeSetup(load('v99-newer.roofoo-setup.json').profile, game);
  assert.ok(up.newer);
  assert.ok(!('someFutureOption' in up.profile));
  assert.deepStrictEqual(up.profile.rules.map(r => r.key), ['UNI:uap']);
  assert.ok(/newer version/.test(upgradeMessage(up)));
}

// junk never throws and gives the defaults
for (const junk of [null, 42, 'x', [], { rules: 'no' }, { rules: [null, { codes: 'uap' }] }, { theme: 5 }]) {
  const up = upgradeSetup(junk, game);
  assert.deepStrictEqual(up.profile, blankProfile(), JSON.stringify(junk));
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }
console.log('setups ok');
