// Saved setups (profiles) and how older ones are upgraded.
//
// Every setup carries a version number in `v`. When the shape of a setup changes, bump
// SETUP_VERSION and add ONE step to UPGRADES that turns version N-1 into version N. Every way a
// setup gets in (this browser's storage, My setups, setup files, share links, setup codes and the
// BUILDER-PROFILE line of a built filter) goes through upgradeSetup(), so old setups keep working.
// Each step lists anything it couldn't carry over, and the player is told.
// Keep a sample of each old format in tools/site/test/setups/ (see setups.test.mjs).
import { PRESETS, SOUND_PACKS, TEXT_SLOTS, MARKER_SLOTS } from './themes.js?v=2026-09-27g';

export const SETUP_VERSION = 2;
export const SECTIONS = ['UNI', 'SET', 'RARE', 'MAG', 'NMAG', 'RUNE', 'GEM', 'POT', 'MISC'];
export const SCROLLS = ['isc', 'tsc', 'ibk', 'tbk'];

export function blankProfile() {
  return { v: SETUP_VERSION, theme: 'classic', soundPack: 'classic', slots: {}, markers: {}, tiers: {}, mystery: {}, rules: [] };
}

export function categoryOf(code, it) {
  const f = it.f || [];
  if (it.rune) return 'Rune';
  if (it.gem) return 'Gem';
  if (/Potion|Elixir/.test(it.n)) return 'Potion';
  if (f.includes('CHARM')) return 'Charm';
  if (it.t === 'jewl') return 'Jewel';
  if (f.includes('JEWELRY')) return 'Jewelry';
  if (it.maptier || /Map$/.test(it.n)) return 'Map';
  if (it.k === 'weapon') return 'Weapon base';
  if (it.k === 'armor') return 'Armor base';
  return 'Other item';
}

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// UPGRADES[n] turns a version-n setup into version n+1: (profile, game, notes) => void
const UPGRADES = {
  // v1: item rules were { kind: 'unique'|'set'|'misc'|'base', q: [qualities], codes }.
  // v2: one rule per row of the Items tab, keyed by section: { key: 'UNI:uap', section, codes }.
  1(p, game, notes) {
    let crafted = 0;
    const rules = [];
    for (const r of p.rules) {
      if (r.section) { rules.push(r); continue; }
      const code = r.codes[0];
      const it = (game && game.items[code]) || {};
      let section = (Array.isArray(r.q) && r.q[0]) || 'NMAG';
      if (r.kind === 'unique') section = 'UNI';
      else if (r.kind === 'set') section = 'SET';
      else if (r.kind === 'misc') {
        const cat = categoryOf(code, it);
        section = cat === 'Rune' ? 'RUNE' : cat === 'Gem' ? 'GEM' : cat === 'Potion' || SCROLLS.includes(code) ? 'POT' : 'MISC';
      }
      if (section === 'CRAFT') { crafted++; continue; }
      if (section === 'SUP') { section = 'NMAG'; r.sup = r.sup || 'sup'; }
      r.section = section;
      r.key = r.id = `${section}:${code}`;
      delete r.q; delete r.kind; delete r.note;
      rules.push(r);
    }
    p.rules = rules;
    if (crafted) notes.push(`${plural(crafted, 'rule')} for crafted items (the builder no longer has a crafted-items list)`);
  },
};

// Make any setup safe to use: known fields with the right types, unknown ones dropped.
// No game data needed; upgradeSetup() does the rest.
export function normalizeProfile(p) {
  const b = blankProfile();
  if (!p || typeof p !== 'object') return b;
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const out = {
    ...b,
    v: Number.isInteger(p.v) && p.v > 0 ? p.v : 1,
    theme: typeof p.theme === 'string' ? p.theme : b.theme,
    soundPack: typeof p.soundPack === 'string' ? p.soundPack : b.soundPack,
    slots: obj(p.slots), markers: obj(p.markers), tiers: obj(p.tiers), mystery: obj(p.mystery),
    rules: Array.isArray(p.rules) ? p.rules.filter(r => r && typeof r === 'object' && Array.isArray(r.codes) && r.codes.length) : [],
  };
  if (p.safetyNet === false) out.safetyNet = false;
  return out;
}

// Bring a setup of any age up to SETUP_VERSION.
// Returns { profile, notes, from, newer }: notes are things that couldn't be carried over;
// newer means it was saved by a newer builder than this one (usually an old cached page).
export function upgradeSetup(input, game) {
  const p = normalizeProfile(input);
  const from = p.v;
  const notes = [];
  const newer = from > SETUP_VERSION;
  for (let v = from; v < SETUP_VERSION; v++) UPGRADES[v](p, game, notes);
  p.v = SETUP_VERSION;

  // Whatever the version: drop what this builder doesn't know (renamed or removed options/items)
  if (!PRESETS.some(t => t.id === p.theme)) { notes.push(`the color theme "${p.theme}"`); p.theme = 'classic'; }
  if (!SOUND_PACKS.some(s => s.id === p.soundPack)) { notes.push(`the sound pack "${p.soundPack}"`); p.soundPack = 'classic'; }
  const dropKeys = (o, ok, what) => {
    const bad = Object.keys(o).filter(k => !ok(k));
    for (const k of bad) delete o[k];
    if (bad.length) notes.push(plural(bad.length, what));
  };
  dropKeys(p.slots, k => TEXT_SLOTS.some(s => s.id === k), 'old label setting');
  dropKeys(p.markers, k => MARKER_SLOTS.some(s => s.id === k), 'old minimap setting');
  const seen = new Set();
  let gone = 0;
  p.rules = p.rules.filter(r => {
    if (!SECTIONS.includes(r.section) || (game && !r.codes.some(c => game.items[c]))) { gone++; return false; }
    return seen.has(r.key) ? false : seen.add(r.key);
  });
  if (gone) notes.push(`${plural(gone, 'item rule')} for items that are no longer in the game`);
  return { profile: p, notes, from, newer };
}

// One sentence for the player about an upgraded setup, or '' when there's nothing to say.
export function upgradeMessage({ notes, newer }) {
  const parts = [];
  if (newer) parts.push('This setup was saved by a newer version of the builder. Refresh the page (Ctrl+F5) to get it; until then some choices may be missing.');
  if (notes.length) parts.push(`Parts of this setup couldn't be carried over to this version of the builder: ${notes.join('; ')}. Everything else was loaded.`);
  return parts.join(' ');
}
