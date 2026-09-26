// Filter engine: reads a PD2 loot filter, simulates how items display, and applies a
// player's customization profile as small targeted edits to the live filter text.
import { TEXT_SLOTS, MARKER_SLOTS, PRESETS, SOUND_PACKS } from './themes.js?v=2026-09-26c';

export const FILTER_LEVELS = 10; // FL0 .. FL9
const TOKEN_RE = /%([A-Z_]+)(?:-([0-9A-Fa-f]+))?%/g;
const ICON_SIZES = ['BORDER', 'MAP', 'DOT', 'PX'];
const OUTSIDE_TOWN = '!TOWN !SHOP !INVENTORY !CUBE !STASH !EQUIPPED';
export const COLOR_KEYWORDS = new Set(['WHITE', 'GRAY', 'LIGHT_GRAY', 'BLACK', 'BLUE', 'TEAL', 'GREEN', 'DARK_GREEN',
  'SAGE', 'YELLOW', 'GOLD', 'TAN', 'ORANGE', 'CORAL', 'RED', 'PURPLE']);

// ---------------------------------------------------------------- text + rule parsing

export function splitLines(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  return { lines: text.split(/\r?\n/), eol };
}

const norm = s => s.replace(/\s+/g, ' ').trim();

export function parseRule(line) {
  if (!line.startsWith('ItemDisplay[')) return null;
  const close = line.indexOf(']');
  if (close < 0 || line[close + 1] !== ':') return null;
  return { cond: line.slice(12, close), out: line.slice(close + 2) };
}

// Split a rule output into name part, description and trailing bits.
export function splitOutput(out) {
  let comment = '';
  const open = out.indexOf('{');
  const close = open >= 0 ? out.lastIndexOf('}') : -1;
  let name, desc, after;
  if (open >= 0 && close > open) {
    name = out.slice(0, open);
    desc = out.slice(open + 1, close);
    after = out.slice(close + 1);
  } else {
    name = out;
    after = '';
  }
  // Comments start with // (only outside the description).
  const ci = after.indexOf('//');
  if (ci >= 0) { comment = after.slice(ci); after = after.slice(0, ci); }
  if (desc === undefined) {
    const ni = name.indexOf('//');
    if (ni >= 0) { comment = name.slice(ni); name = name.slice(0, ni); }
  }
  return { name, desc, after, comment };
}

// ---------------------------------------------------------------- conditions

function tokenizeCond(src) {
  return src.match(/\(|\)|!|[^\s()!]+/g) || [];
}

const CMP_RE = /^([A-Z_]+?)(\d*)(=|<|>|~)(-?\d+)(?:-(-?\d+))?$/;

// Stats that change between evaluations of the same kind of item (filter level, rolls, levels).
// Everything else about a simulated item is fixed by its code, quality, ethereal state and location.
const DYNAMIC_STATS = new Set(['FILTLVL', 'CLVL', 'DIFF', 'ILVL', 'ALVL', 'SOCK', 'SOCKETS', 'ED']);
const T = 1, F = 0, U = 2; // three-valued logic for static pre-filtering

class CondCompiler {
  constructor(aliases) {
    this.aliases = aliases; // name -> body text
    this.cache = new Map(); // alias -> { test, fixed }
  }
  // Returns { test(item) -> bool, fixed(item) -> T/F/U using only the item's fixed facts }
  compile(src) {
    const toks = tokenizeCond(src);
    let i = 0;
    const peek = () => toks[i];
    const parseOr = () => {
      const parts = [parseAnd()];
      while (peek() === 'OR') { i++; parts.push(parseAnd()); }
      if (parts.length === 1) return parts[0];
      const tests = parts.map(p => p.test), fixeds = parts.map(p => p.fixed);
      return {
        test: it => { for (const f of tests) if (f(it)) return true; return false; },
        fixed: it => { let r = F; for (const f of fixeds) { const v = f(it); if (v === T) return T; if (v === U) r = U; } return r; },
      };
    };
    const parseAnd = () => {
      const parts = [];
      while (i < toks.length && peek() !== ')' && peek() !== 'OR') {
        if (peek() === 'AND') { i++; continue; }
        parts.push(parseUnary());
      }
      if (!parts.length) return { test: () => true, fixed: () => T };
      if (parts.length === 1) return parts[0];
      const tests = parts.map(p => p.test), fixeds = parts.map(p => p.fixed);
      return {
        test: it => { for (const f of tests) if (!f(it)) return false; return true; },
        fixed: it => { let r = T; for (const f of fixeds) { const v = f(it); if (v === F) return F; if (v === U) r = U; } return r; },
      };
    };
    const parseUnary = () => {
      const t = toks[i++];
      if (t === '!') { const p = parseUnary(); return { test: it => !p.test(it), fixed: it => { const v = p.fixed(it); return v === U ? U : v === T ? F : T; } }; }
      if (t === '(') { const p = parseOr(); if (peek() === ')') i++; return p; }
      return this.atom(t);
    };
    return parseOr();
  }
  atom(t) {
    if (this.aliases.has(t)) {
      if (!this.cache.has(t)) {
        this.cache.set(t, { test: () => false, fixed: () => F }); // guards against self-reference
        this.cache.set(t, this.compile(this.aliases.get(t)));
      }
      // Aliases are shared by many rules, so remember each alias result per simulated item.
      const cache = this.cache;
      return {
        test: it => {
          const memo = it._alias || (it._alias = new Map());
          let v = memo.get(t);
          if (v === undefined) { v = cache.get(t).test(it); memo.set(t, v); }
          return v;
        },
        fixed: it => {
          const memo = it._aliasFixed || (it._aliasFixed = new Map());
          let v = memo.get(t);
          if (v === undefined) { v = cache.get(t).fixed(it); memo.set(t, v); }
          return v;
        },
      };
    }
    const m = CMP_RE.exec(t);
    if (m) {
      const key = m[1] + m[2], op = m[3], a = +m[4], b = m[5] !== undefined ? +m[5] : a;
      let test;
      if (op === '=') test = it => it.stat(key) === a;
      else if (op === '<') test = it => it.stat(key) < a;
      else if (op === '>') test = it => it.stat(key) > a;
      else test = it => { const v = it.stat(key); return v >= a && v <= b; };
      const dynamic = DYNAMIC_STATS.has(key);
      return { test, fixed: dynamic ? () => U : it => (test(it) ? T : F) };
    }
    if (/^[A-Z0-9_]+$/.test(t) && /[A-Z]/.test(t)) { const test = it => it.flags.has(t); return { test, fixed: it => (test(it) ? T : F) }; }
    const test = it => it.code === t;
    return { test, fixed: it => (test(it) ? T : F) };
  }
}

// ---------------------------------------------------------------- simulator

export class Simulator {
  constructor(text) {
    const { lines } = splitLines(text);
    const aliases = new Map();
    this.levelNames = ['Show All Items'];
    for (const line of lines) {
      const a = /^Alias\[([A-Za-z0-9_]+)\]:\s*(.*)$/.exec(line);
      if (a) aliases.set(a[1], a[2].replace(/\s*\/\/.*$/, ''));
      const n = /^ItemDisplayFilterName\[\]:\s*(.*)$/.exec(line);
      if (n) this.levelNames.push(n[1].trim());
    }
    const cc = new CondCompiler(aliases);
    this.rules = [];
    lines.forEach((line, idx) => {
      const r = parseRule(line);
      if (!r) return;
      const cont = r.out.includes('%CONTINUE%');
      const parts = splitOutput(r.out.split('%CONTINUE%').join(''));
      const name = parts.name + parts.after;
      const c = cc.compile(r.cond);
      this.rules.push({ idx, test: c.test, fixed: c.fixed, cont, name, desc: parts.desc, notes: readNotes(name) });
    });
    this.byKind = new Map();
  }

  // Rules that could match this kind of item, decided once per kind (code, quality, ethereal,
  // location…). Filter level, character level and rolls are still checked on every evaluation.
  rulesFor(item) {
    let list = this.byKind.get(item.kindKey);
    if (!list) {
      list = this.rules.filter(r => r.fixed(item) !== F);
      this.byKind.set(item.kindKey, list);
    }
    return list;
  }

  // item: see makeItem()
  evaluate(item) {
    let name = item.defaultName, desc = '';
    let last = null;
    // Sounds, markers and tiers take effect when their rule matches, even if a later rule
    // rewrites the name without %NAME% (Roofoo's sound rules rely on this).
    const notes = { icons: [], sound: null, tier: null };
    for (const r of this.rulesFor(item)) {
      if (!r.test(item)) continue;
      const newName = r.name.split('%NAME%').join(name);
      if (r.desc !== undefined) desc = r.desc.split('%NAME%').join(desc);
      name = newName;
      last = r;
      if (r.notes) {
        notes.icons.push(...r.notes.icons);
        if (r.notes.sound !== null) notes.sound = r.notes.sound;
        if (r.notes.tier !== null) notes.tier = r.notes.tier;
      }
      if (!r.cont) break;
    }
    return finishLabel(name, desc, item, last, notes);
  }
}

function readNotes(template) {
  const icons = [];
  let sound = null, tier = null;
  template.replace(TOKEN_RE, (all, key, arg) => {
    if (ICON_SIZES.includes(key) && arg) icons.push({ size: key, color: arg.toUpperCase() });
    if (key === 'SOUNDID' && arg) sound = +arg;
    if (key === 'TIER' && arg) tier = +arg;
    return all;
  });
  return icons.length || sound !== null || tier !== null ? { icons, sound, tier } : null;
}

function finishLabel(name, desc, item, lastRule, notes = { icons: [], sound: null, tier: null }) {
  const icons = [];
  const addIcon = i => { if (!icons.some(x => x.size === i.size && x.color === i.color)) icons.push(i); };
  notes.icons.forEach(addIcon);
  let sound = notes.sound, tier = notes.tier;
  let clean = name.replace(TOKEN_RE, (all, key, arg) => {
    if (ICON_SIZES.includes(key) && arg) { addIcon({ size: key, color: arg.toUpperCase() }); return ''; }
    if (key === 'SOUNDID' && arg) { if (sound === null) sound = +arg; return ''; }
    if (key === 'TIER' && arg) { if (tier === null) tier = +arg; return ''; }
    return all;
  });
  clean = expandMacros(clean, item);
  const visible = clean.replace(TOKEN_RE, '').replace(/%NL%|%CL%/g, '').trim();
  return {
    hidden: visible.length === 0,
    name: clean,
    desc: expandMacros(desc || '', item),
    icons, sound, tier,
    ruleLine: lastRule ? lastRule.idx : null,
  };
}

// PD2 formulas like $f(round(PRICE/1000)). Only numbers, stat names, + - * / ( ) , and a few
// math functions are allowed; anything else is left out rather than evaluated.
function expandFormulas(s, item) {
  let out = '', i = 0;
  while (i < s.length) {
    const at = s.indexOf('$f(', i);
    if (at < 0) { out += s.slice(i); break; }
    out += s.slice(i, at);
    let depth = 0, j = at + 2;
    for (; j < s.length; j++) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')' && --depth === 0) break;
    }
    const expr = s.slice(at + 3, j);
    out += evalFormula(expr, item);
    i = j + 1;
  }
  return out;
}
const FORMULA_FNS = { round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, abs: Math.abs };
function evalFormula(expr, item) {
  if (!/^[\w\s+\-*/().,]*$/.test(expr)) return '';
  const js = expr.replace(/[A-Za-z_][A-Za-z_0-9]*/g, name => {
    if (FORMULA_FNS[name.toLowerCase()]) return `F.${name.toLowerCase()}`;
    const v = item.stat(name.toUpperCase());
    return Number.isFinite(v) ? String(v) : '0';
  });
  try {
    const v = Function('F', `"use strict"; return (${js});`)(FORMULA_FNS);
    return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '';
  } catch { return ''; }
}

function expandMacros(s, item) {
  s = expandFormulas(s, item);
  return s.replace(TOKEN_RE, (all, key) => {
    switch (key) {
      case 'RUNENAME': return item.runeName || '';
      case 'RUNENUM': return item.stats.RUNE ? String(item.stats.RUNE) : '';
      case 'BASENAME': return item.baseName;
      case 'ILVL': return String(item.stats.ILVL);
      case 'SOCKETS': return String(item.stats.SOCK);
      case 'ED': return String(item.stats.ED);
      case 'QTY': return String(item.stats.QTY || 1);
      case 'LVLREQ': return String(item.stats.LVLREQ || 0);
      case 'CRAFTALVL': return String(item.stats.CRAFTALVL || 0);
      case 'PRICE': return Number.isFinite(item.stats.PRICE) ? String(item.stats.PRICE) : '';
      case 'RES': case 'EDAM': case 'IAS': case 'FCR': return '0';
      default: return all;
    }
  });
}

// Build a simulated item. opts: {code, quality, eth, identified, sockets, ilvl, ed, clvl,
//   diff, filtlvl, where ('ground'|'town'|'inventory'), uniqueName}
export const QUALITIES = ['NMAG', 'SUP', 'INF', 'MAG', 'RARE', 'UNI', 'SET', 'CRAFT'];
export const QUALITY_LABELS = { NMAG: 'Normal', SUP: 'Superior', INF: 'Inferior', MAG: 'Magic', RARE: 'Rare', UNI: 'Unique', SET: 'Set', CRAFT: 'Crafted' };
const QUALITY_COLOR = { MAG: 'BLUE', RARE: 'YELLOW', UNI: 'GOLD', SET: 'GREEN', CRAFT: 'ORANGE' };

export function makeItem(game, opts) {
  const base = game.items[opts.code] || { n: opts.code, k: 'misc', f: [] };
  const q = opts.quality || 'NMAG';
  const flags = new Set(base.f || []);
  const equip = base.k === 'weapon' || base.k === 'armor';
  if (equip) flags.add(base.tier || 'NORM');
  if (q === 'SUP' || q === 'INF') { flags.add('NMAG'); flags.add(q); } else flags.add(q);
  if (opts.eth) flags.add('ETH');
  // In D2 only magic, rare, set, unique and crafted items can be unidentified. White/superior/inferior
  // bases and misc items (runes, gems, potions…) are always identified.
  const canBeUnid = ['MAG', 'RARE', 'UNI', 'SET', 'CRAFT'].includes(q);
  if (opts.identified || !canBeUnid) flags.add('ID');
  const where = opts.where || 'ground';
  if (where === 'ground') flags.add('GROUND');
  if (where === 'inventory') flags.add('INVENTORY');
  if (where === 'shop') flags.add('SHOP');
  if (opts.charClass) flags.add(opts.charClass);
  const stats = {
    FILTLVL: opts.filtlvl ?? 0, CLVL: opts.clvl ?? 90, DIFF: opts.diff ?? 2,
    ILVL: opts.ilvl ?? 85, ALVL: opts.ilvl ?? 85, CRAFTALVL: 0,
    // 'inventory' means carried while out in the field; 'town' and 'shop' are in Harrogath
    MAPID: where === 'town' || where === 'shop' ? 109 : 108,
    SOCK: opts.sockets ?? 0, MAXSOCKETS: base.ms ?? 0, ED: opts.ed ?? 0,
    // Runes drop as a stack of 1 in PD2 (Roofoo's rune rules check QTY=1).
    // Item-specific numbers are "not applicable" (NaN: every comparison is false) on other items,
    // e.g. GOLD<100 must not match a sword.
    RUNE: base.rune ?? NaN, GEM: base.gem ?? NaN, GEMTYPE: base.gemtype ?? NaN,
    MAPTIER: base.maptier ?? (base.t && /^t\dm$/.test(base.t) ? 1 : NaN),
    QTY: base.st || base.rune ? (opts.qty ?? 1) : NaN, PRICE: opts.price ?? 1, GOLD: opts.code === 'gld' ? (opts.gold ?? 1000) : NaN,
  };
  let color = QUALITY_COLOR[q] || base.nc || ((opts.eth || stats.SOCK > 0) && equip ? 'GRAY' : 'WHITE');
  let display = base.n;
  if (opts.identified && opts.uniqueName && (q === 'UNI' || q === 'SET')) display = opts.uniqueName;
  if (q === 'SUP') display = 'Superior ' + base.n;
  if (q === 'INF') display = 'Crude ' + base.n;
  return {
    code: opts.code, flags, stats,
    kindKey: `${opts.code}|${[...flags].sort().join(',')}|${stats.MAPID}|${stats.GOLD}`,
    stat(k) { if (k === 'SOCKETS') k = 'SOCK'; if (k === 'GEMLEVEL') k = 'GEM'; return this.stats[k] ?? 0; },
    defaultName: `%${color}%${display}`,
    baseName: base.n,
    runeName: base.rune ? base.n.replace(/ Rune$/, '') : '',
  };
}

// Turn a finished label into colored segments for display. %NL% lines stack upward in game.
export function labelSegments(text, startColor = 'WHITE') {
  const lines = [[]];
  let color = startColor;
  let last = 0;
  const push = s => { if (s) lines[lines.length - 1].push({ color, text: s.replace(/%%/g, '%') }); };
  const re = /%([A-Z_]+)(?:-([0-9A-Fa-f]+))?%/g;
  let m;
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    last = re.lastIndex;
    if (COLOR_KEYWORDS.has(m[1])) color = m[1];
    else if (m[1] === 'NL' || m[1] === 'CL') lines.push([]);
  }
  push(text.slice(last));
  return lines.reverse();
}

// ---------------------------------------------------------------- tiers

const TIER_ALIAS_RE = /^Alias\[((NS|OS|TS|TP)(UNI|SET)(ETH)?)(\d)\]:\s*(.*)$/;
const CODE_GROUP_RE = /\(((?:[a-z0-9]{2,5})(?: OR [a-z0-9]{2,5})*)\)/;

export function readTiers(lines) {
  const aliases = [];
  const map = new Map(); // "UNI|N|code" -> tier
  lines.forEach((line, idx) => {
    const m = TIER_ALIAS_RE.exec(line);
    if (!m) return;
    const body = m[6];
    const g = CODE_GROUP_RE.exec(body);
    const codes = g ? g[1].split(' OR ') : [];
    const eth = !!m[4];
    const both = !!g && !eth && !/ETH/.test(body); // e.g. (rin OR amu) UNI !ID covers everything
    // Extra single-item clauses, e.g. "OR (amu SET !ID FL8_MARKER_OK)" in the 1-star set list
    const extras = [];
    const xre = new RegExp(String.raw`\s+OR\s+\(([a-z0-9]{2,5}) ${m[3]} [^()]*\)`, 'g');
    let xm;
    while ((xm = xre.exec(body))) if (!g || xm.index > g.index) extras.push({ code: xm[1], text: xm[0] });
    const a = { idx, name: m[1] + m[5], tier: m[2], kind: m[3], eth, both, codes, extras, body, group: g ? { at: g.index, len: g[0].length } : null };
    aliases.push(a);
    for (const x of extras) { const key = `${a.kind}|N|${x.code}`; if (!map.has(key)) map.set(key, a.tier); }
    for (const c of codes) {
      for (const e of both ? ['N', 'E'] : [eth ? 'E' : 'N']) {
        const key = `${a.kind}|${e}|${c}`;
        if (!map.has(key)) map.set(key, a.tier);
      }
    }
  });
  return { aliases, map };
}

function applyTiers(lines, changes) {
  const { aliases } = readTiers(lines);
  if (!aliases.length) return 0;
  let count = 0;
  const codeSets = new Map(aliases.map(a => [a, [...a.codes]]));
  const dropExtras = new Map(aliases.map(a => [a, []]));
  for (const [key, tier] of Object.entries(changes)) {
    const [kind, e, code] = key.split('|');
    const eth = e === 'E';
    for (const a of aliases) {
      if (a.kind !== kind || !(a.both || a.eth === eth)) continue;
      const list = codeSets.get(a);
      const at = list.indexOf(code);
      if (at >= 0) list.splice(at, 1);
      if (!eth) for (const x of a.extras) if (x.code === code) dropExtras.get(a).push(x.text);
    }
    if (tier) {
      const targets = aliases.filter(a => a.kind === kind && a.tier === tier && a.eth === eth && !a.both);
      const target = targets[targets.length - 1];
      if (target) codeSets.get(target).push(code);
    }
    count++;
  }
  for (const a of aliases) {
    const list = codeSets.get(a);
    const drops = dropExtras.get(a);
    if (list.join() === a.codes.join() && !drops.length) continue;
    let body;
    if (a.group) {
      const repl = list.length ? `(${list.join(' OR ')})` : '(CLVL>999)';
      body = a.body.slice(0, a.group.at) + repl + a.body.slice(a.group.at + a.group.len);
    } else {
      body = list.length ? `((${list.join(' OR ')}) ${a.kind} ${a.eth ? 'ETH' : '!ETH'} !ID)` : a.body;
    }
    for (const d of drops) body = body.replace(d, '');
    lines[a.idx] = `Alias[${a.name}]: ${body}`;
  }
  return count;
}

// ---------------------------------------------------------------- mystery drops (Bastard Mystery filter)

// Bucket lists in the Mystery filter. Keys used by the builder:
//   'item|<code>'  runes and other items (runes are stored as RUNE=<n> in the filter)
//   'UNI|N|<code>' / 'UNI|E|<code>'  unidentified uniques, normal / ethereal
export const MYSTERY_BUCKETS = {
  BASTARD_LITTLE_ITEMS: { bucket: 'LITTLE', kind: 'item' },
  BASTARD_LITTLE_RUNES: { bucket: 'LITTLE', kind: 'rune' },
  BASTARD_LUCKY_ITEMS: { bucket: 'LUCKY', kind: 'item' },
  BASTARD_LUCKY_RUNES: { bucket: 'LUCKY', kind: 'rune' },
  BASTARD_LUCKY_UNIQUE: { bucket: 'LUCKY', kind: 'uniN' },
  BASTARD_3_STAR_UNIQUE: { bucket: 'BIG', kind: 'uniN' },
  BASTARD_3_STAR_ETH_UNIQUE: { bucket: 'BIG', kind: 'uniE' },
};
const runeCode = n => 'r' + String(n).padStart(2, '0');

export function readMystery(lines) {
  const map = new Map();
  const aliases = {};
  let boss = [];
  lines.forEach((line, idx) => {
    const m = /^Alias\[(BASTARD_[A-Z0-9_]+)\]:\s*(.*)$/.exec(line);
    if (!m) return;
    const body = m[2];
    if (m[1] === 'BASTARD_BOSS_UNIQUE') { boss = body.match(/\b[a-z0-9]{2,5}\b/g) || []; return; }
    const def = MYSTERY_BUCKETS[m[1]];
    if (!def) return;
    aliases[m[1]] = idx;
    if (def.kind === 'rune') {
      for (const r of body.matchAll(/RUNE=(\d+)/g)) map.set('item|' + runeCode(r[1]), def.bucket);
    } else {
      const codes = body.replace(/CLVL>\d+/g, '').match(/\b[a-z0-9]{2,5}\b/g) || [];
      for (const c of codes) {
        const key = def.kind === 'item' ? 'item|' + c : `UNI|${def.kind === 'uniE' ? 'E' : 'N'}|${c}`;
        map.set(key, def.bucket);
      }
    }
  });
  return { present: Object.keys(aliases).length > 0, map, aliases, boss };
}

function applyMystery(lines, changes) {
  const keys = Object.keys(changes);
  if (!keys.length) return 0;
  const cur = readMystery(lines);
  if (!cur.present) return 0;
  const all = new Map(cur.map);
  for (const k of keys) { if (changes[k]) all.set(k, changes[k]); else all.delete(k); }
  for (const [name, def] of Object.entries(MYSTERY_BUCKETS)) {
    const idx = cur.aliases[name];
    if (idx === undefined) continue;
    const picked = [...all].filter(([k, b]) => b === def.bucket).map(([k]) => k);
    let body;
    if (def.kind === 'rune' || def.kind === 'item') {
      const items = picked.filter(k => k.startsWith('item|')).map(k => k.slice(5));
      const isRune = c => /^r\d\d$/.test(c);
      const list = def.kind === 'rune' ? items.filter(isRune).map(c => `RUNE=${+c.slice(1)}`) : items.filter(c => !isRune(c));
      body = list.length ? `(${list.join(' OR ')})` : '(CLVL>999)';
    } else {
      const want = def.kind === 'uniE' ? 'UNI|E|' : 'UNI|N|';
      const codes = picked.filter(k => k.startsWith(want)).map(k => k.slice(want.length));
      body = codes.length ? `((${codes.join(' OR ')}) UNI ${def.kind === 'uniE' ? 'ETH' : '!ETH'} !ID)` : '(CLVL>999)';
    }
    const line = `Alias[${name}]: ${body}`;
    // only rewrite lists that really changed, so an untouched list keeps Roofoo's exact text
    const before = new Set([...cur.map].filter(([, b]) => b === def.bucket).map(([k]) => k));
    const after = new Set(picked);
    const same = before.size === after.size && [...before].every(k => after.has(k));
    if (!same) lines[idx] = line;
  }
  return keys.length;
}

// ---------------------------------------------------------------- label tokens (theme editing)

export function tokenizeLabel(s) {
  const out = [];
  let last = 0;
  const re = /%([A-Z_]+)(?:-([0-9A-Fa-f]+))?%/g;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    last = re.lastIndex;
    const [raw, key, arg] = m;
    if (ICON_SIZES.includes(key) && arg) out.push({ t: 'icon', size: key, color: arg.toUpperCase(), raw });
    else if (key === 'TIER' && arg) out.push({ t: 'tier', v: arg, raw });
    else if (key === 'SOUNDID' && arg) out.push({ t: 'sound', v: +arg, raw });
    else if (COLOR_KEYWORDS.has(key)) out.push({ t: 'color', v: key, raw });
    else if (key === 'NAME') out.push({ t: 'name', raw });
    else out.push({ t: 'other', raw });
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}

export function joinLabel(tokens) {
  return tokens.map(k => {
    switch (k.t) {
      case 'text': return k.v;
      case 'icon': return `%${k.size}-${k.color}%`;
      case 'tier': return `%TIER-${k.v}%`;
      case 'sound': return `%SOUNDID-${k.v}%`;
      case 'color': return `%${k.v}%`;
      default: return k.raw;
    }
  }).join('');
}

// Words in a label: text pieces with letters (e.g. "pick ", "HOLY "), in order.
export function labelWords(tokens) {
  return tokens.filter(k => k.t === 'text' && /[A-Za-z]/.test(k.v));
}

// Decoration colors in order of first appearance.
export function labelColors(tokens) {
  const seen = [];
  for (const k of tokens) if (k.t === 'color' && !seen.includes(k.v)) seen.push(k.v);
  return seen;
}

// Apply a resolved slot style to one label.
// style: {colorMap, symbol, words (array|undefined), icons (array|undefined), markerMap, tier}
export function styleLabel(tokens, style) {
  let t = tokens.map(k => ({ ...k }));
  let wi = 0;
  for (const k of t) {
    if (k.t === 'color' && style.colorMap[k.v]) k.v = style.colorMap[k.v];
    if (k.t === 'text') {
      if (/[A-Za-z]/.test(k.v)) {
        if (style.words && style.words[wi] !== undefined && style.words[wi] !== null) {
          // keep the original spacing around the word so the label layout stays the same
          const lead = k.v.match(/^\s*/)[0], trail = k.v.match(/\s*$/)[0];
          k.v = lead + String(style.words[wi]).trim() + trail;
        }
        wi++;
      } else if (style.symbol && style.symbol !== '*') {
        k.v = k.v.replace(/[*\u00ba]/g, style.symbol);
      }
    }
    if (k.t === 'icon' && style.markerMap && style.markerMap[k.color]) k.color = style.markerMap[k.color];
  }
  if (style.icons) {
    const first = t.findIndex(k => k.t !== 'icon');
    const insertAt = first < 0 ? t.length : first;
    const before = t.slice(0, insertAt).filter(k => k.t !== 'icon');
    const after = t.slice(insertAt).filter(k => k.t !== 'icon');
    t = [...before, ...style.icons.map(i => ({ t: 'icon', size: i.size, color: i.color })), ...after];
  }
  if (style.sound !== undefined && style.sound !== null) {
    t = t.filter(k => k.t !== 'sound');
    if (style.sound) {
      const lastNote = Math.max(t.map(k => k.t).lastIndexOf('icon'), t.map(k => k.t).lastIndexOf('tier'));
      t.splice(lastNote + 1, 0, { t: 'sound', v: style.sound });
    }
  }
  if (style.tier !== undefined) {
    t = t.filter(k => k.t !== 'tier');
    if (style.tier !== '') {
      const lastIcon = t.map(k => k.t).lastIndexOf('icon');
      t.splice(lastIcon + 1, 0, { t: 'tier', v: style.tier });
    }
  }
  return t;
}

// ---------------------------------------------------------------- slot discovery

function matchLocator(rule, loc) {
  const c = norm(rule.cond);
  if (loc.cond !== undefined && c !== norm(loc.cond)) return false;
  if (loc.condStarts !== undefined && !c.startsWith(norm(loc.condStarts))) return false;
  if (loc.notEnds !== undefined && c.endsWith(loc.notEnds)) return false;
  const hasIcon = /%(BORDER|MAP|DOT|PX)-[0-9A-Fa-f]+%/.test(rule.out);
  const hasSound = /%SOUNDID-\d+%/.test(rule.out);
  if (loc.needIcon && !hasIcon) return false;
  if (loc.needSound && !hasSound) return false;
  return true;
}

// Returns, per text slot, the display line indexes and the sound line index (if any).
export function findSlots(lines) {
  const rules = [];
  lines.forEach((line, idx) => { const r = parseRule(line); if (r) rules.push({ ...r, idx }); });
  const found = {};
  for (const slot of TEXT_SLOTS) {
    const display = [];
    for (const loc of slot.display) {
      // Display lines are the styled ones, not the sound-only lines with the same condition.
      const hit = rules.find(r => matchLocator(r, loc) && (slot.inlineSound || !/%SOUNDID-/.test(r.out)) && !display.includes(r.idx));
      if (hit) display.push(hit.idx);
    }
    const sl = slot.sound && rules.find(r => matchLocator(r, slot.sound) && (slot.sound.needSound || /%SOUNDID-|%NAME%/.test(r.out)));
    let sound = null, soundId = null;
    if (sl) { sound = sl.idx; const m = /%SOUNDID-(\d+)%/.exec(sl.out); soundId = m ? +m[1] : null; }
    const first = display.length ? splitOutput(parseRule(lines[display[0]]).out) : null;
    if (slot.inlineSound && first) { const m = /%SOUNDID-(\d+)%/.exec(first.name); soundId = m ? +m[1] : null; }
    found[slot.id] = { display, sound, soundId, tokens: first ? tokenizeLabel(first.name) : null };
  }
  return found;
}

function markerRange(lines, slot) {
  let from = 0, to = lines.length;
  if (slot.from) { const i = lines.findIndex(l => l.startsWith(slot.from)); if (i >= 0) from = i; }
  if (slot.to) { const i = lines.findIndex((l, j) => j > from && l.startsWith(slot.to)); if (i >= 0) to = i; }
  return [from, to];
}

export function findMarkers(lines) {
  const out = {};
  for (const m of MARKER_SLOTS) {
    const [a, b] = markerRange(lines, m);
    let n = 0;
    for (let i = a; i < b; i++) if (lines[i].startsWith('ItemDisplay[') && lines[i].includes(`%${m.token}%`)) n++;
    out[m.id] = n;
  }
  return out;
}

// ---------------------------------------------------------------- profile -> style resolution

export function presetById(id) { return PRESETS.find(p => p.id === id) || PRESETS[0]; }
export function soundPackById(id) { return SOUND_PACKS.find(p => p.id === id) || SOUND_PACKS[0]; }

export function resolveSlotStyle(profile, slotId) {
  const preset = presetById(profile.theme);
  const custom = (profile.slots || {})[slotId] || {};
  return {
    colorMap: { ...preset.text, ...(custom.colors || {}) },
    markerMap: preset.marker,
    symbol: custom.symbol || '*',
    words: custom.words,
    icons: custom.icons,
    tier: custom.tier,
  };
}

// Sound for a slot: custom > sound pack > filter default. null = keep, 0 = silent.
export function resolveSlotSound(profile, slotId) {
  const custom = (profile.slots || {})[slotId] || {};
  if (custom.sound !== undefined) return custom.sound;
  const pack = soundPackById(profile.soundPack);
  if (pack.sounds[slotId] !== undefined) return pack.sounds[slotId];
  return null;
}

export function resolveMarker(profile, m) {
  const preset = presetById(profile.theme);
  const custom = (profile.markers || {})[m.id];
  const [size, color] = m.token.split('-');
  if (custom === null) return null; // removed
  if (custom) return { size: custom.size || size, color: custom.color || color };
  return { size, color: preset.marker[color] || color };
}

// ---------------------------------------------------------------- rule overrides

export function ruleCondition(rule, game) {
  const parts = [];
  const codes = rule.codes || [];
  parts.push(codes.length === 1 ? codes[0] : `(${codes.join(' OR ')})`);
  const equip = codes.some(c => { const it = game.items[c]; return it && (it.k === 'weapon' || it.k === 'armor'); });
  const jewelry = codes.some(c => ['rin', 'amu', 'jew', 'cm1', 'cm2', 'cm3'].includes(c));
  if (rule.section) {
    // Items tab rules: the section is the quality (UNI, SET, RARE, MAG, NMAG); misc sections have none
    if (['UNI', 'SET', 'RARE', 'MAG'].includes(rule.section)) parts.push(rule.section);
    if (rule.section === 'NMAG') parts.push(rule.sup === 'sup' ? 'SUP' : rule.sup === 'norm' ? 'NMAG !SUP' : 'NMAG');
  } else if ((equip || jewelry) && rule.q && rule.q.length) {
    parts.push(rule.q.length === 1 ? rule.q[0] : `(${rule.q.join(' OR ')})`);
  }
  if (equip && rule.eth === 'yes') parts.push('ETH');
  if (equip && rule.eth === 'no') parts.push('!ETH');
  if (rule.sock && rule.sock.length) parts.push(rule.sock.length === 1 ? `SOCK=${rule.sock[0]}` : `(${rule.sock.map(n => `SOCK=${n}`).join(' OR ')})`);
  if (rule.ilvlMin > 1) parts.push(`ILVL>${rule.ilvlMin - 1}`);
  if (rule.clvlMin > 1) parts.push(`CLVL>${rule.clvlMin - 1}`);
  if (rule.clvlMax && rule.clvlMax < 99) parts.push(`CLVL<${rule.clvlMax + 1}`);
  return parts.join(' ');
}

const flExpr = levels => levels.length === 1 ? `FILTLVL=${levels[0]}` : `(${levels.map(l => `FILTLVL=${l}`).join(' OR ')})`;

function overrideLines(profile, game) {
  const top = [], sounds = [];
  for (const rule of profile.rules || []) {
    if (!rule.codes || !rule.codes.length) continue;
    const cond = ruleCondition(rule, game);
    const hide = [], show = [];
    for (let l = 0; l < FILTER_LEVELS; l++) {
      const v = (rule.fl || {})[l];
      if (v === 'hide') hide.push(l);
      if (v === 'show') show.push(l);
    }
    const label = (rule.label || cond).replace(/[\r\n]/g, ' ');
    if (hide.length || show.length || rule.sound) top.push(`// ${label}`);
    const marker = rule.marker ? `%${rule.marker}%` : '';
    if (show.length) {
      if (rule.sound) top.push(`ItemDisplay[${flExpr(show)} ${cond} ${OUTSIDE_TOWN}]: %SOUNDID-${rule.sound}%${marker}%NAME%{%NAME%}`);
      top.push(`ItemDisplay[${flExpr(show)} ${cond}]: ${marker}%NAME%{%NAME%}`);
    }
    if (hide.length) top.push(`ItemDisplay[${flExpr(hide)} ${cond} ${OUTSIDE_TOWN}]:`);
    if (rule.sound) sounds.push(`ItemDisplay[${cond} ${OUTSIDE_TOWN}]: %SOUNDID-${rule.sound}%%NAME%{%NAME%}%CONTINUE% // ${label}`);
    if (!show.length && rule.marker) top.push(`ItemDisplay[${cond}]: ${marker}%NAME%{%NAME%}%CONTINUE%`);
  }
  return { top, sounds };
}

// ---------------------------------------------------------------- build

export const PRICE_NOTE = "Live market prices (rune values, Rainbow Facet values and slam suggestions) only work in the launcher version of Roofoo's filter.";

// Custom filters don't get the 6-hourly PD2 Trader updates, so their market prices would go stale.
// Remove every "BEGIN AUTO PD2TRADER ... END AUTO PD2TRADER" block and leave a note in its place.
export function stripPriceBlocks(lines) {
  const out = [];
  let inBlock = false, blocks = 0;
  for (const line of lines) {
    if (/^\/\/ BEGIN AUTO PD2TRADER\b/.test(line)) {
      inBlock = true;
      blocks++;
      out.push(`// ${line.slice(3).replace('BEGIN AUTO', 'REMOVED AUTO')}: ${PRICE_NOTE}`);
      continue;
    }
    if (inBlock) {
      if (/^\/\/ END AUTO PD2TRADER\b/.test(line)) inBlock = false;
      continue;
    }
    out.push(line);
  }
  if (blocks) {
    // In game: say so on the Horadric Cube tooltip, where the rune prices used to be listed
    out.splice(firstRuleIndex(out), 0,
      '// Note on the Horadric Cube tooltip (Roofoo Filter Builder)',
      'ItemDisplay[box]: %NAME%{%NAME%%NL%%GRAY%Custom build: live market prices only in the launcher version}%CONTINUE%');
  }
  return { lines: out, blocks };
}

// ---------------------------------------------------------------- safety net for unknown items

export const MISSING_CAPTION = 'Missing';

// Codes an ItemDisplay condition or alias mentions (lowercase item codes like 7gd, r33s, cm2f)
function filterCodes(lines) {
  const codes = new Set();
  for (const l of lines) {
    let cond = null;
    if (l.startsWith('ItemDisplay[')) cond = l.slice(12, l.indexOf(']'));
    else { const m = /^Alias\[[^\]]+\]:\s*(.*)$/.exec(l); if (m) cond = m[1].replace(/\s*\/\/.*$/, ''); }
    if (cond) for (const t of cond.match(/\b[a-z0-9]{2,5}\b/g) || []) if (/[a-z]/.test(t)) codes.add(t);
  }
  return codes;
}

// Items the game didn't have when the builder's data was made, and that the filter doesn't mention
// either, always show with a "Missing" caption. Codes are split over several aliases so no line
// gets longer than the ones Roofoo's filter already uses (PD2 reads each line into a fixed buffer).
export function safetyNetLines(allCodes, lines) {
  const known = [...new Set([...allCodes, ...filterCodes(lines)])].sort();
  const chunks = [];
  let cur = [];
  for (const c of known) {
    if ((cur.join(' OR ').length + c.length + 4) > 1800) { chunks.push(cur); cur = []; }
    cur.push(c);
  }
  if (cur.length) chunks.push(cur);
  const names = chunks.map((_, i) => `BUILDER_KNOWN_ITEMS_${i + 1}`);
  return {
    known: known.length,
    lines: [
      '// ===============================',
      '// SAFETY NET (Roofoo Filter Builder)',
      '// Items newer than this filter (not in PD2\'s item list when the builder was updated, and not',
      `// mentioned anywhere in the filter) always show, marked [${MISSING_CAPTION}], so a game patch can't hide them.`,
      '// ===============================',
      ...chunks.map((c, i) => `Alias[${names[i]}]: (${c.join(' OR ')})`),
      `ItemDisplay[${names.map(n => '!' + n).join(' ')}]: %MAP-0A%%NAME% %GRAY%[%RED%${MISSING_CAPTION}%GRAY%]{%NAME%%CL%%RED%${MISSING_CAPTION}%WHITE%: this item is newer than your filter.%CL%%GRAY%It always shows so you never miss it. Update your filter to style it.}`,
    ],
  };
}

export function buildFilter(baseText, profile, game, meta = {}) {
  let { lines, eol } = splitLines(baseText);
  const report = { tiers: 0, slots: [], missing: [], markers: 0, rules: 0, soundLinesAdded: 0, priceBlocks: 0 };
  if (meta.stripPrices !== false) {
    const stripped = stripPriceBlocks(lines);
    lines = stripped.lines;
    report.priceBlocks = stripped.blocks;
  }

  // 1) tier moves (alias edits, line count unchanged)
  report.tiers = applyTiers(lines, profile.tiers || {});
  report.mystery = applyMystery(lines, profile.mystery || {});

  // 2) text slots
  const slots = findSlots(lines);
  const claimed = new Set();
  const newSoundLines = [];
  for (const slot of TEXT_SLOTS) {
    const f = slots[slot.id];
    if (!f.display.length) { if (!slot.inlineSound) report.missing.push(slot.label); continue; }
    const style = resolveSlotStyle(profile, slot.id);
    if (slot.inlineSound) style.sound = resolveSlotSound(profile, slot.id);
    let changed = false;
    for (const idx of f.display) {
      claimed.add(idx);
      const r = parseRule(lines[idx]);
      const p = splitOutput(r.out);
      const tokens = tokenizeLabel(p.name);
      // multi-line slots: words apply to every line that has the same wording as the first line
      const sameWords = labelWords(tokens).map(k => k.v).join('|') === labelWords(f.tokens).map(k => k.v).join('|');
      const st = sameWords ? style : { ...style, words: undefined };
      const name = joinLabel(styleLabel(tokens, st));
      if (name !== p.name) {
        lines[idx] = `ItemDisplay[${r.cond}]: ${rebuildOut(r.out, p, name)}`.replace(']:  ', ']: ');
        changed = true;
      }
    }
    const snd = slot.inlineSound ? null : resolveSlotSound(profile, slot.id);
    if (snd !== null && snd !== f.soundId) {
      changed = true;
      if (f.sound !== null) {
        const r = parseRule(lines[f.sound]);
        let out = r.out.replace(/%SOUNDID-\d+%/g, '');
        if (snd) out = `%SOUNDID-${snd}%` + out.replace(/^\s+/, '');
        lines[f.sound] = `ItemDisplay[${r.cond}]: ${out.replace(/^\s+/, '')}`;
      } else if (snd) {
        newSoundLines.push(`ItemDisplay[${slot.sound.cond}]: %SOUNDID-${snd}%%NAME%{%NAME%}%CONTINUE% // ${slot.label}`);
      }
    }
    if (changed) report.slots.push(slot.label);
  }

  // 3) marker slots
  for (const m of MARKER_SLOTS) {
    const want = resolveMarker(profile, m);
    const repl = want ? `%${want.size}-${want.color}%` : '';
    if (repl === `%${m.token}%`) continue;
    const [a, b] = markerRange(lines, m);
    for (let i = a; i < b; i++) {
      if (claimed.has(i) || !lines[i].startsWith('ItemDisplay[')) continue;
      const r = parseRule(lines[i]);
      if (!r.out.includes(`%${m.token}%`)) continue;
      lines[i] = `ItemDisplay[${r.cond}]:${r.out.split(`%${m.token}%`).join(repl)}`;
      report.markers++;
    }
  }

  // 4) insertions (bottom first so indexes stay valid)
  const ov = overrideLines(profile, game);
  report.rules = (profile.rules || []).filter(r => r.codes && r.codes.length).length;
  const soundLines = [...newSoundLines, ...ov.sounds];
  report.soundLinesAdded = soundLines.length;
  if (soundLines.length) {
    let at = lines.findIndex(l => l.startsWith('// Gold hiding thresholds'));
    if (at < 0) at = firstRuleIndex(lines);
    while (at > 0 && lines[at - 1].trim() === '') at--;
    lines.splice(at, 0, '// Player sound choices (Roofoo Filter Builder)', ...soundLines);
  }
  if (ov.top.length) {
    let at = firstRuleIndex(lines);
    while (at > 0 && /^(\/\/|Alias\[|\s*$)/.test(lines[at - 1])) at--;
    lines.splice(at, 0,
      '// ===============================',
      '// PLAYER SHOW / HIDE CHOICES (Roofoo Filter Builder)',
      '// These run before everything else. Hidden items still show in town.',
      '// ===============================',
      ...ov.top, '');
  }

  // Safety net goes first of all, so no hide rule can swallow an item the filter has never heard of
  if (profile.safetyNet !== false && game.allCodes) {
    const net = safetyNetLines(game.allCodes, lines);
    report.safetyNetCodes = net.known;
    let at = firstRuleIndex(lines);
    while (at > 0 && /^(\/\/|Alias\[|\s*$)/.test(lines[at - 1])) at--;
    lines.splice(at, 0, ...net.lines, '');
  }

  const header = [
    '//\tCustomized with the Roofoo Filter Builder' + (meta.url ? ': ' + meta.url : ''),
    `//\tBase: ${meta.baseName || 'Roofoo.filter'}${meta.baseDate ? ' (' + meta.baseDate + ')' : ''} | Theme: ${presetById(profile.theme).label} | Sounds: ${soundPackById(profile.soundPack).label}`,
    '//\tTo keep editing, open the builder and use "Load a filter file" with this file.',
    `//\tBUILDER-PROFILE: ${meta.profileCode || ''}`,
    ...(report.priceBlocks ? [`//\tNOTE: ${PRICE_NOTE} They were removed from this custom version.`] : []),
    '//',
  ];
  const text = [...header, ...lines].join(eol);
  return { text, report };
}

function firstRuleIndex(lines) {
  const i = lines.findIndex(l => { const r = parseRule(l); return r && !/^\s*box\b/.test(r.cond); });
  return i < 0 ? lines.length : i;
}

function rebuildOut(out, parts, newName) {
  // Keep %CONTINUE% placement, description and comments exactly as they were.
  const cont = out.includes('%CONTINUE%');
  const wasInName = cont && parts.name.includes('%CONTINUE%');
  let s = newName;
  if (wasInName && !s.includes('%CONTINUE%')) s += '%CONTINUE%';
  if (parts.desc !== undefined) s += `{${parts.desc}}`;
  s += parts.after + parts.comment;
  return s;
}

// ---------------------------------------------------------------- profile codes (share links)

export async function encodeProfile(profile) {
  const json = new TextEncoder().encode(JSON.stringify(profile));
  const cs = new CompressionStream('deflate-raw');
  const buf = await new Response(new Blob([json]).stream().pipeThrough(cs)).arrayBuffer();
  let bin = '';
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decodeProfile(code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const ds = new DecompressionStream('deflate-raw');
  const text = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
  return JSON.parse(text);
}
