import * as E from './engine.js?v=2026-09-26b';
import {
  TEXT_SLOTS, MARKER_SLOTS, MYSTERY_SLOT_IDS, PRESETS, SOUND_PACKS, TIERS, TEXT_COLORS, TEXT_COLOR_NAMES, MARKER_COLORS, MARKER_SIZES,
} from './themes.js?v=2026-09-26b';

const REPO = 'RoofooEvazan/Roofoo-s-PD2-Loot-Filter';
const BRANCH = 'main';
const BASES = [
  { file: 'Roofoo.filter', label: "Roofoo's filter", out: 'Roofoo-Custom.filter' },
  { file: 'RoofooMystery.filter', label: "Roofoo's filter + Mystery drops", out: 'RoofooMystery-Custom.filter', mystery: true },
  { file: 'RoofooSlamfestBETA.filter', label: 'Slamfest (beta)', out: 'RoofooSlamfest-Custom.filter' },
];
const STORE_KEY = 'roofoo-builder-v1';
const SYMBOLS = ['*', '+', '-', '~', '=', '#', 'o', 'x', '>', '!'];

const S = {
  game: null,
  baseFile: 'Roofoo.filter',
  baseText: null,
  baseDate: '',
  base: null, // { lines, slots, tiers, levelNames }
  profile: blankProfile(),
  tab: 'look',
  open: new Set(),
  itemsUI: { q: '', changed: false, mystery: false, open: new Set(), opts: new Set() },
  test: { entry: null, quality: 'NMAG', eth: false, identified: false, sockets: 0, ilvl: 85, ed: 0, where: 'ground', clvl: 90 },
  memo: {},
};

function blankProfile() {
  return { v: 1, theme: 'classic', soundPack: 'classic', slots: {}, markers: {}, tiers: {}, mystery: {}, rules: [] };
}

// ---------------------------------------------------------------- utilities

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const panel = id => document.getElementById('panel-' + id);
const clone = o => JSON.parse(JSON.stringify(o));
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function store(get, value) {
  try {
    if (get) return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch { return null; }
}
function persist() { store(false, { profile: S.profile, baseFile: S.baseFile }); }

const markerHex = code => (S.game.palette[parseInt(code, 16)] || '#fff');
const markerName = code => (MARKER_COLORS.find(m => m[0] === code) || [code, 'Color ' + code])[1];

// ---------------------------------------------------------------- label rendering

function labelHTML(name, opts = {}) {
  // compact: squeeze long runs of spaces so small previews fit
  if (opts.compact) name = name.replace(/ {3,}/g, '  ');
  const lines = E.labelSegments(name, opts.startColor || 'WHITE');
  const html = lines.map(segs => {
    // trim spaces at the line edges; spacing inside the label is kept
    const s = segs.map(x => ({ ...x }));
    if (s.length) { s[0].text = s[0].text.replace(/^\s+/, ''); s[s.length - 1].text = s[s.length - 1].text.replace(/\s+$/, ''); }
    return `<span class="ln">${s.map(x => `<span style="color:${TEXT_COLORS[x.color] || '#fff'}">${esc(x.text)}</span>`).join('')}</span>`;
  }).join('');
  return `<div class="label">${html}</div>`;
}

function minimapHTML(icons, cls = '') {
  if (!icons || !icons.length) return `<span class="mm empty ${cls}" title="No minimap marker"></span>`;
  const order = ['BORDER', 'MAP', 'DOT', 'PX'];
  const sorted = [...icons].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
  const title = sorted.map(i => `${sizeName(i.size)} ${markerName(i.color).toLowerCase()} marker`).join(' + ');
  return `<span class="mm ${cls}" title="Minimap: ${esc(title)}">${sorted.map(i => `<i class="mk ${i.size}" style="--c:${markerHex(i.color)}"></i>`).join('')}</span>`;
}
const sizeName = s => (MARKER_SIZES.find(m => m[0] === s) || [s, s])[1];

function groundHTML(result, extra = '', compact = false) {
  if (result.hidden) return `<div class="ground ${extra}">${minimapHTML([])}<div class="label hidden-item">Hidden on the ground</div></div>`;
  return `<div class="ground ${extra}">${minimapHTML(result.icons)}${labelHTML(result.name, { compact })}</div>`;
}

// Style tokens of a slot -> preview result for the sample item
function slotPreview(slotId, profile = S.profile) {
  const slot = TEXT_SLOTS.find(s => s.id === slotId);
  const f = S.base.slots[slotId];
  if (!f || !f.tokens) return null;
  const tokens = E.styleLabel(f.tokens, E.resolveSlotStyle(profile, slotId));
  const text = E.joinLabel(tokens).split('%CONTINUE%').join('').split('%NAME%').join(`%${slot.sample.color}%${slot.sample.name}`);
  const icons = [];
  const name = text.replace(/%(BORDER|MAP|DOT|PX)-([0-9A-Fa-f]+)%/g, (_, size, color) => { icons.push({ size, color: color.toUpperCase() }); return ''; })
    .replace(/%(TIER|SOUNDID)-\d+%/g, '');
  return { hidden: false, name, icons };
}

function visibleLength(name) {
  return name.replace(/%[A-Z_]+(-[0-9A-Fa-f]+)?%/g, '').trim().length;
}

// ---------------------------------------------------------------- sounds

let audio;
function playSound(id) {
  if (!id) return;
  const known = S.game.sounds.some(s => s.id === +id);
  if (!known) { toast('No preview for this sound, but it will still play in game.'); return; }
  try { audio && audio.pause(); } catch { /* ignore */ }
  audio = new Audio(`sounds/${id}.wav`);
  audio.volume = 0.7;
  audio.play().catch(() => toast('Your browser blocked the sound preview. Click again.'));
}

function soundOptions(selected, defaultId) {
  const groups = {};
  for (const s of S.game.sounds) (groups[s.group] = groups[s.group] || []).push(s);
  let html = `<option value="0"${+selected === 0 ? ' selected' : ''}>No sound</option>`;
  const inList = S.game.sounds.some(s => s.id === +selected);
  if (+selected && !inList) html += `<option value="${selected}" selected>${esc(soundLabel(selected))}</option>`;
  if (defaultId && !S.game.sounds.some(s => s.id === defaultId) && +selected !== defaultId) html += `<option value="${defaultId}">${esc(soundLabel(defaultId))}</option>`;
  for (const [g, list] of Object.entries(groups)) {
    html += `<optgroup label="${esc(g)}">${list.map(s => `<option value="${s.id}"${s.id === +selected ? ' selected' : ''}>${esc(s.label)}${s.id === defaultId ? ' (default)' : ''}</option>`).join('')}</optgroup>`;
  }
  return html;
}
function soundLabel(id) {
  const s = S.game.sounds.find(x => x.id === +id);
  if (s) return s.label;
  const key = S.game.soundNames[id];
  return key ? `${key.replace(/_/g, ' ')} (default)` : `Sound #${id}`;
}

// ---------------------------------------------------------------- building & simulating

function built() {
  const key = JSON.stringify([S.baseFile, S.profile]);
  if (S.memo.builtKey !== key) {
    const meta = { baseName: S.baseFile, baseDate: S.baseDate, url: location.origin + location.pathname, profileCode: S.memo.code || '' };
    S.memo.built = E.buildFilter(S.baseText, S.profile, S.game, meta);
    S.memo.builtKey = key;
    S.memo.finalSim = null;
  }
  return S.memo.built;
}
// Line number -> mystery label ("Lucky Bastard"…) for a filter text
function mysteryLines(text) {
  const map = new Map();
  const found = E.findSlots(E.splitLines(text).lines);
  for (const id of MYSTERY_SLOT_IDS) {
    const slot = TEXT_SLOTS.find(t => t.id === id);
    for (const idx of found[id].display) map.set(idx, id === 'm_holy' ? 'HOLY MOLY' : slot.label);
  }
  return map;
}
const isMysteryBase = () => !!(BASES.find(b => b.file === S.baseFile) || {}).mystery;

function finalSim() {
  const b = built();
  if (!S.memo.finalSim) { S.memo.finalSim = new E.Simulator(b.text); S.memo.finalLines = E.splitLines(b.text).lines; S.memo.finalSim.mystery = mysteryLines(b.text); }
  return S.memo.finalSim;
}
function baselineSim() {
  const p = { ...S.profile, rules: [] };
  const key = JSON.stringify([S.baseFile, p]);
  if (S.memo.baseKey !== key) {
    S.memo.baseSim = new E.Simulator(E.buildFilter(S.baseText, p, S.game).text);
    S.memo.baseKey = key;
  }
  return S.memo.baseSim;
}

async function profileCode() { return E.encodeProfile({ ...S.profile, base: S.baseFile }); }

// ---------------------------------------------------------------- catalog (item picker)

function categoryOf(code, it) {
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

function buildCatalog() {
  const out = [];
  const miscByName = new Map();
  for (const [code, it] of Object.entries(S.game.items)) {
    if (!it.n || it.n === 'Not used' || /^\s*$/.test(it.n)) continue;
    if (it.k === 'misc') {
      const e = miscByName.get(it.n);
      if (e) { e.codes.push(code); continue; }
      const entry = { key: 'm:' + code, name: it.n, cat: categoryOf(code, it), codes: [code], q: [], kind: 'misc' };
      miscByName.set(it.n, entry);
      out.push(entry);
    } else {
      const tierName = { NORM: 'Normal', EXC: 'Exceptional', ELT: 'Elite' }[it.tier] || '';
      out.push({ key: 'b:' + code, name: it.n, cat: categoryOf(code, it), sub: tierName, codes: [code], q: ['NMAG'], kind: 'equip' });
    }
  }
  const baseName = c => (S.game.items[c] || {}).n || c;
  for (const u of S.game.uniques) out.push({ key: 'u:' + u.n + ':' + u.c, name: u.n, cat: 'Unique', sub: baseName(u.c), codes: [u.c], q: ['UNI'], kind: 'unique', uniqueName: u.n });
  for (const s of S.game.sets) out.push({ key: 's:' + s.n + ':' + s.c, name: s.n, cat: 'Set', sub: `${baseName(s.c)} · ${s.s}`, codes: [s.c], q: ['SET'], kind: 'set', uniqueName: s.n });
  return out;
}

function searchCatalog(q, limit = 14) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const starts = [], contains = [];
  for (const e of S.catalog) {
    const n = e.name.toLowerCase();
    if (n.startsWith(q)) starts.push(e);
    else if (n.includes(q) || (e.sub && e.sub.toLowerCase().includes(q))) contains.push(e);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

// Item card spec for a picker / catalog entry
function entrySpec(e) {
  const q = e.q && e.q[0] ? e.q[0] : 'NMAG';
  return { code: e.codes[0], quality: q, names: e.uniqueName ? [e.uniqueName] : undefined };
}

// Item card spec for a theme style's sample item
function slotSpec(slotId) {
  const slot = TEXT_SLOTS.find(s => s.id === slotId);
  return slot && slot.item ? { code: slot.item.code, quality: slot.item.quality || 'NMAG' } : null;
}
const slotAttr = id => { const sp = slotSpec(id); return sp ? itemAttr(sp) : ''; };

function pickerHTML(id, placeholder) {
  return `<div class="picker" data-picker="${id}">
    <input type="search" placeholder="${esc(placeholder)}" autocomplete="off" aria-label="${esc(placeholder)}" data-picker-input="${id}">
    <div class="picker-results" hidden></div></div>`;
}

function wirePicker(root, id, onPick) {
  const box = root.querySelector(`[data-picker="${id}"]`);
  if (!box) return;
  const input = box.querySelector('input');
  const res = box.querySelector('.picker-results');
  let list = [], active = 0;
  const draw = () => {
    list = searchCatalog(input.value);
    if (!list.length) { res.hidden = true; res.innerHTML = ''; return; }
    res.hidden = false;
    res.innerHTML = list.map((e, i) => `<button type="button" data-i="${i}" class="${i === active ? 'active' : ''}" ${itemAttr(entrySpec(e))}><span>${esc(e.name)}</span><small>${esc(e.cat)}${e.sub ? ' · ' + esc(e.sub) : ''}</small></button>`).join('');
  };
  input.addEventListener('input', () => { active = 0; draw(); });
  input.addEventListener('keydown', ev => {
    if (res.hidden) return;
    if (ev.key === 'ArrowDown') { active = Math.min(active + 1, list.length - 1); draw(); ev.preventDefault(); }
    if (ev.key === 'ArrowUp') { active = Math.max(active - 1, 0); draw(); ev.preventDefault(); }
    if (ev.key === 'Enter' && list[active]) { pick(list[active]); ev.preventDefault(); }
    if (ev.key === 'Escape') { res.hidden = true; }
  });
  res.addEventListener('mousedown', ev => ev.preventDefault());
  res.addEventListener('click', ev => { const b = ev.target.closest('button[data-i]'); if (b) pick(list[+b.dataset.i]); });
  input.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 120));
  function pick(e) { input.value = ''; res.hidden = true; hideTip(); onPick(e); }
}

// ---------------------------------------------------------------- change bookkeeping

function counts() {
  const p = S.profile;
  const look = (p.theme !== 'classic' ? 1 : 0) + (p.soundPack !== 'classic' ? 1 : 0)
    + Object.values(p.slots).filter(v => v && Object.keys(v).length).length + Object.keys(p.markers).length;
  const tiers = Object.entries(p.tiers).filter(([k, v]) => (S.base.tiers.map.get(k) || '') !== v).length
    + (S.base.mystery.present ? Object.entries(p.mystery || {}).filter(([k, v]) => (S.base.mystery.map.get(k) || '') !== v).length : 0);
  const rules = p.rules.filter(r => Object.keys(r.fl || {}).length || r.sound || r.marker).length;
  return { look, tiers, rules, items: tiers + rules };
}

function changed(rerender = true) {
  persist();
  S.memo.code = null;
  updateTabCounts();
  if (rerender) render();
}

function updateTabCounts() {
  const c = counts();
  for (const [tab, n] of [['look', c.look], ['items', c.items]]) {
    const b = document.querySelector(`#tabs [data-tab="${tab}"]`);
    let badge = b.querySelector('.count');
    if (n && !badge) { badge = document.createElement('span'); badge.className = 'count'; b.appendChild(badge); }
    if (badge) { if (n) badge.textContent = n; else badge.remove(); }
  }
}

function slotCustom(id, create) {
  if (!S.profile.slots[id] && create) S.profile.slots[id] = {};
  return S.profile.slots[id] || {};
}
function cleanSlot(id) {
  const c = S.profile.slots[id];
  if (!c) return;
  if (c.colors && !Object.keys(c.colors).length) delete c.colors;
  if (c.words && c.words.every(w => w === null || w === undefined)) delete c.words;
  if (c.symbol === '*') delete c.symbol;
  if (!Object.keys(c).length) delete S.profile.slots[id];
}

// ---------------------------------------------------------------- tab: colors & sounds

function renderLook() {
  const p = S.profile;
  const missing = TEXT_SLOTS.filter(s => !s.inlineSound && !S.base.slots[s.id].display.length);
  const groups = [...new Set(TEXT_SLOTS.map(s => s.group))];
  const presetTiles = PRESETS.map(pr => {
    const prev = slotPreview('tp', { ...p, theme: pr.id, slots: {} }) || slotPreview('rune_high', { ...p, theme: pr.id, slots: {} });
    return `<button class="tile" data-act="preset" data-id="${pr.id}" aria-pressed="${p.theme === pr.id}">
      <span class="t-name">${esc(pr.label)} <span class="check">✓</span></span>
      <span ${slotAttr('tp')}>${prev ? groundHTML(prev, '', true) : ''}</span>
      <span class="t-blurb">${esc(pr.blurb)}</span></button>`;
  }).join('');
  const packTiles = SOUND_PACKS.map(sp => `<button class="tile" data-act="pack" data-id="${sp.id}" aria-pressed="${p.soundPack === sp.id}">
      <span class="t-name">${esc(sp.label)} <span class="check">✓</span></span>
      <span class="t-blurb">${esc(sp.blurb || 'The sounds Roofoo picked for each drop type.')}</span></button>`).join('');

  panel('look').innerHTML = `
    ${mysterySwitchHTML()}
    <h2>Pick a color theme</h2>
    <p class="lead">Themes recolor the highlights on valuable drops. The star tiers and everything that shows or hides stay exactly like Roofoo's filter. You can fine-tune any single style further down.</p>
    <div class="tile-grid">${presetTiles}</div>

    <h2>Pick your drop sounds</h2>
    <p class="lead">Choose a sound pack, then change single sounds below if you like. Picking a pack clears single-sound changes. Sounds only play for drops outside town.</p>
    <div class="tile-grid">${packTiles}</div>

    ${missing.length ? `<div class="notice">This filter version doesn't have these styles, so they can't be changed here: ${esc(missing.map(s => s.label).join(', '))}.</div>` : ''}
    ${groups.map(g => {
      const slots = TEXT_SLOTS.filter(s => s.group === g && S.base.slots[s.id].display.length);
      if (!slots.length) return '';
      return `<h2>${esc(g)}</h2><div class="slot-grid">${slots.map(slotCard).join('')}</div>`;
    }).join('')}

    <h2>Minimap markers</h2>
    <p class="lead">Smaller highlights that only put a marker on your minimap. Change the size or color, or turn one off.</p>
    <div class="marker-table">${MARKER_SLOTS.map(markerRow).join('')}</div>
  `;
}

function slotCard(slot) {
  const f = S.base.slots[slot.id];
  const custom = slotCustom(slot.id);
  const prev = slotPreview(slot.id);
  const snd = E.resolveSlotSound(S.profile, slot.id);
  const current = snd === null ? (f.soundId || 0) : snd;
  const isCustom = Object.keys(custom).length > 0;
  const tooLong = prev && visibleLength(prev.name) > 56;
  return `<article class="card slot" data-slot="${slot.id}">
    <header><h4>${esc(slot.label)}</h4>${isCustom ? '<span class="badge">Customized</span>' : ''}</header>
    ${slot.help ? `<p class="help">${esc(slot.help)}</p>` : ''}
    <div data-preview="${slot.id}" ${slotAttr(slot.id)}>${prev ? groundHTML(prev, '', true) : ''}</div>
    ${tooLong ? '<div class="warn">This label is longer than the 56 characters PD2 can show. It may get cut off.</div>' : ''}
    <div class="sound-row"><span class="lbl">Sound</span>
      <select data-act="slot-sound" data-slot="${slot.id}" aria-label="Sound for ${esc(slot.label)}">${soundOptions(current, f.soundId)}</select>
      <button class="btn icon-btn" data-act="play" data-sound="${current}" title="Play sound" aria-label="Play sound">▶</button></div>
    <details class="customize" data-details="${slot.id}" ${S.open.has(slot.id) ? 'open' : ''}>
      <summary>Customize this style</summary>
      ${slotEditor(slot)}
    </details>
  </article>`;
}

function slotEditor(slot) {
  const f = S.base.slots[slot.id];
  const style = E.resolveSlotStyle(S.profile, slot.id);
  const custom = slotCustom(slot.id);
  const colors = E.labelColors(f.tokens);
  const words = E.labelWords(f.tokens);
  const hasStars = f.tokens.some(k => k.t === 'text' && k.v.includes('*'));
  const baseIcons = f.tokens.filter(k => k.t === 'icon').map(k => ({ size: k.size, color: style.markerMap[k.color] || k.color }));
  const icons = custom.icons || baseIcons;
  const colorSelect = (from) => {
    const val = style.colorMap[from] || from;
    return `<span class="color-pick"><span class="sw" style="--c:${TEXT_COLORS[val]}"></span>
      <select data-act="slot-color" data-slot="${slot.id}" data-from="${from}" aria-label="Replace ${esc(TEXT_COLOR_NAMES[from])}">
      ${Object.keys(TEXT_COLORS).map(c => `<option value="${c}"${c === val ? ' selected' : ''}>${esc(TEXT_COLOR_NAMES[c])}</option>`).join('')}</select></span>`;
  };
  return `<div class="editor">
    ${colors.length ? `<div class="field"><span>Decoration colors</span><div class="chips">${colors.map(colorSelect).join('')}</div></div>` : ''}
    ${hasStars ? `<div class="field"><span>Symbol</span><select data-act="slot-symbol" data-slot="${slot.id}">${SYMBOLS.map(s => `<option${s === style.symbol ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>` : ''}
    ${words.length ? `<div class="field"><span>Words</span><div class="chips">${words.map((w, i) => {
      const val = custom.words && custom.words[i] != null ? custom.words[i] : w.v.trim();
      return `<input type="text" maxlength="14" size="8" value="${esc(val)}" data-act="slot-word" data-slot="${slot.id}" data-i="${i}" aria-label="Word ${i + 1}">`;
    }).join('')}</div></div>` : ''}
    <div class="field"><span>Minimap marker</span>
      ${icons.map((ic, i) => `<div class="marker-row">${markerSelects(`data-act="slot-icon" data-slot="${slot.id}" data-i="${i}"`, ic)}
        <button class="btn small ghost" data-act="slot-icon-del" data-slot="${slot.id}" data-i="${i}">Remove</button></div>`).join('')}
      ${icons.length < 3 ? `<button class="btn small" data-act="slot-icon-add" data-slot="${slot.id}">${icons.length ? 'Add another marker' : 'Add a marker'}</button>` : ''}
    </div>
    <div><button class="btn small ghost" data-act="slot-reset" data-slot="${slot.id}">Reset this style to the theme</button></div>
  </div>`;
}

function markerSelects(attrs, ic) {
  return `<select ${attrs} data-part="size" aria-label="Marker size">${MARKER_SIZES.map(([v, l]) => `<option value="${v}"${v === ic.size ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <span class="color-pick"><span class="sw" style="--c:${markerHex(ic.color)}"></span><select ${attrs} data-part="color" aria-label="Marker color">
    ${MARKER_COLORS.some(m => m[0] === ic.color) ? '' : `<option value="${ic.color}" selected>${esc(markerName(ic.color))}</option>`}
    ${MARKER_COLORS.map(([v, l]) => `<option value="${v}"${v === ic.color ? ' selected' : ''}>${l}</option>`).join('')}</select></span>`;
}

function markerRow(m) {
  if (!S.base.markerCounts[m.id]) return '';
  const cur = E.resolveMarker(S.profile, m);
  const custom = S.profile.markers[m.id];
  return `<div class="card marker-line">
    ${minimapHTML(cur ? [cur] : [])}
    <div><b>${esc(m.label)}</b>${custom !== undefined ? ' <span class="badge">Changed</span>' : ''}</div>
    <div class="ctrls">
      ${cur ? markerSelects(`data-act="marker" data-id="${m.id}"`, cur) : '<span class="hint">Marker off</span>'}
      <button class="btn small ghost" data-act="marker-toggle" data-id="${m.id}">${cur ? 'Turn off' : 'Turn on'}</button>
      ${custom !== undefined ? `<button class="btn small ghost" data-act="marker-reset" data-id="${m.id}">Reset</button>` : ''}
    </div></div>`;
}

function refreshSlot(id) {
  const card = panel('look').querySelector(`.slot[data-slot="${id}"]`);
  if (!card) return render();
  const tmp = document.createElement('div');
  tmp.innerHTML = slotCard(TEXT_SLOTS.find(s => s.id === id));
  card.replaceWith(tmp.firstElementChild);
}

function onLookEvent(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act, id = t.dataset.slot;
  const p = S.profile;
  if (ev.type === 'click') {
    if (act === 'preset') { p.theme = t.dataset.id; return changed(); }
    if (act === 'pack') {
      p.soundPack = t.dataset.id;
      for (const k of Object.keys(p.slots)) { delete p.slots[k].sound; cleanSlot(k); }
      return changed();
    }
    if (act === 'play') return playSound(+t.dataset.sound);
    if (act === 'slot-reset') { delete p.slots[id]; changed(false); return refreshSlot(id); }
    if (act === 'slot-icon-add' || act === 'slot-icon-del') {
      const c = slotCustom(id, true);
      const f = S.base.slots[id];
      const style = E.resolveSlotStyle(p, id);
      const icons = c.icons || f.tokens.filter(k => k.t === 'icon').map(k => ({ size: k.size, color: style.markerMap[k.color] || k.color }));
      if (act === 'slot-icon-add') icons.push({ size: 'DOT', color: '20' }); else icons.splice(+t.dataset.i, 1);
      c.icons = icons;
      changed(false);
      return refreshSlot(id);
    }
    if (act === 'marker-toggle') {
      const m = MARKER_SLOTS.find(x => x.id === t.dataset.id);
      if (E.resolveMarker(p, m)) p.markers[m.id] = null;
      else { const [size, color] = m.token.split('-'); p.markers[m.id] = { size, color }; }
      return changed();
    }
    if (act === 'marker-reset') { delete p.markers[t.dataset.id]; return changed(); }
  }
  if (ev.type === 'change') {
    if (act === 'slot-sound') {
      const c = slotCustom(id, true);
      c.sound = +t.value;
      changed(false);
      playSound(+t.value);
      return refreshSlot(id);
    }
    if (act === 'slot-color') {
      const c = slotCustom(id, true);
      const preset = E.presetById(p.theme);
      const from = t.dataset.from;
      c.colors = c.colors || {};
      if (t.value === (preset.text[from] || from)) delete c.colors[from]; else c.colors[from] = t.value;
      cleanSlot(id); changed(false);
      return refreshSlot(id);
    }
    if (act === 'slot-symbol') { slotCustom(id, true).symbol = t.value; cleanSlot(id); changed(false); return refreshSlot(id); }
    if (act === 'slot-icon') {
      const c = slotCustom(id, true);
      const f = S.base.slots[id];
      const style = E.resolveSlotStyle(p, id);
      c.icons = c.icons || f.tokens.filter(k => k.t === 'icon').map(k => ({ size: k.size, color: style.markerMap[k.color] || k.color }));
      c.icons[+t.dataset.i][t.dataset.part] = t.value;
      changed(false);
      return refreshSlot(id);
    }
    if (act === 'marker') {
      const m = MARKER_SLOTS.find(x => x.id === t.dataset.id);
      const cur = E.resolveMarker(p, m) || {};
      p.markers[m.id] = { ...cur, [t.dataset.part]: t.value };
      return changed();
    }
  }
  if (ev.type === 'input' && act === 'slot-word') {
    const c = slotCustom(id, true);
    const words = E.labelWords(S.base.slots[id].tokens);
    c.words = c.words || words.map(() => null);
    const i = +t.dataset.i;
    c.words[i] = t.value.trim() === words[i].v.trim() ? null : t.value;
    cleanSlot(id);
    changed(false);
    const prev = slotPreview(id);
    panel('look').querySelector(`[data-preview="${id}"]`).innerHTML = groundHTML(prev, '', true);
  }
}

// ---------------------------------------------------------------- tab: items (stars, mystery, show / hide)

const canBeEth = code => { const it = S.game.items[code]; return it && (it.k === 'weapon' || it.k === 'armor'); };
const tierOf = key => (key in S.profile.tiers ? S.profile.tiers[key] : (S.base.tiers.map.get(key) || ''));

const ITEM_SECTIONS = [
  { id: 'UNI', label: 'Unique items', rarity: 'UNI', blurb: 'Star tier and visibility of every unique, by the base it drops on.' },
  { id: 'SET', label: 'Set items', rarity: 'SET', blurb: 'Star tier and visibility of every set item, by the base it drops on.' },
  { id: 'RARE', label: 'Rare items', rarity: 'RARE', blurb: 'Rare (yellow) drops, including rings, amulets and jewels.' },
  { id: 'MAG', label: 'Magic items', rarity: 'MAG', blurb: 'Magic (blue) drops, including rings, amulets, jewels and charms.' },
  { id: 'NMAG', label: 'Normal & superior bases', rarity: 'WHITE', blurb: 'White and gray bases, e.g. for runewords.' },
  { id: 'RUNE', label: 'Runes', rarity: 'ORANGE' },
  { id: 'GEM', label: 'Gems', rarity: 'WHITE' },
  { id: 'POT', label: 'Potions, scrolls & throwing potions', rarity: 'WHITE' },
  { id: 'MISC', label: 'Keys, maps & other items', rarity: 'WHITE' },
];
const EQUIP_SECTIONS = ['UNI', 'SET', 'RARE', 'MAG', 'NMAG'];
const JEWELRY_GROUP = 'Rings, amulets & jewels';
const SCROLLS = ['isc', 'tsc', 'ibk', 'tbk'];

// Every row of every section: { key, section, code, codes, name, tier, group, names }
function itemRows(section) {
  S.memo.itemRows = S.memo.itemRows || {};
  if (S.memo.itemRows[section]) return S.memo.itemRows[section];
  const rows = [];
  const add = (code, extra = {}) => {
    const it = S.game.items[code];
    if (!it) return;
    const g = reportGroup(code, it);
    rows.push({ key: `${section}:${code}`, section, code, codes: [code], name: it.n, tier: it.tier, group: ['Rings & amulets', 'Jewels'].includes(g) ? JEWELRY_GROUP : g, ...extra });
  };
  const equip = Object.entries(S.game.items).filter(([, it]) => (it.k === 'weapon' || it.k === 'armor') && it.t !== 'tpot' && it.n).map(([c]) => c);
  if (section === 'UNI' || section === 'SET') {
    const list = section === 'UNI' ? S.game.uniques : S.game.sets;
    const by = new Map();
    for (const u of list) (by.get(u.c) || by.set(u.c, []).get(u.c)).push(u.n);
    for (const [code, names] of by) add(code, { names });
  } else if (section === 'RARE' || section === 'MAG' || section === 'NMAG') {
    for (const c of equip) add(c);
    if (section !== 'NMAG') for (const c of ['rin', 'amu', 'jew']) add(c, { group: JEWELRY_GROUP });
    if (section === 'MAG') for (const c of ['cm1', 'cm2', 'cm3']) add(c, { group: 'Charms' });
  } else {
    for (const e of S.catalog) {
      if (e.kind !== 'misc') continue;
      const code = e.codes[0];
      if (['gld', 'rin', 'amu', 'jew', 'cm1', 'cm2', 'cm3'].includes(code)) continue;
      const cat = e.cat;
      const sec = cat === 'Rune' ? 'RUNE' : cat === 'Gem' ? 'GEM' : cat === 'Potion' || SCROLLS.includes(code) ? 'POT' : 'MISC';
      if (sec !== section) continue;
      const it = S.game.items[code];
      rows.push({ key: `${section}:${code}`, section, code, codes: [...e.codes], name: e.name, group: section === 'MISC' ? (cat === 'Map' ? 'Maps' : 'Other items') : section === 'POT' ? (SCROLLS.includes(code) ? 'Scrolls & tomes' : 'Potions') : section === 'GEM' ? 'Gems' : 'Runes', color: TEXT_COLORS[it.nc] || '#f0f0f0' });
    }
    if (section === 'POT') for (const [c, it] of Object.entries(S.game.items)) if (it.t === 'tpot') add(c, { group: 'Throwing potions' });
  }
  // gear first, then jewelry, charms and everything else
  const GEAR = REPORT_ORDER.slice(REPORT_ORDER.indexOf('Helms'));
  const order = g => { const i = GEAR.indexOf(g); return i >= 0 ? i : g === JEWELRY_GROUP ? 100 : g === 'Charms' ? 101 : 102 + Math.max(0, REPORT_ORDER.indexOf(g)); };
  const tierRank = { NORM: 0, EXC: 1, ELT: 2 };
  if (section === 'RUNE') rows.sort((a, b) => (S.game.items[a.code].rune || 0) - (S.game.items[b.code].rune || 0));
  else rows.sort((a, b) => order(a.group) - order(b.group) || (tierRank[a.tier] ?? 0) - (tierRank[b.tier] ?? 0) || a.name.localeCompare(b.name));
  S.memo.itemRows[section] = rows;
  return rows;
}

// ---- per-row rules (show / hide choices and options)

const ruleFor = key => S.profile.rules.find(r => r.key === key);
function ruleOrNew(row) {
  let r = ruleFor(row.key);
  if (!r) {
    r = { id: row.key, key: row.key, section: row.section, codes: [...row.codes], label: ruleLabel(row), fl: {} };
    S.profile.rules.push(r);
  }
  return r;
}
function ruleLabel(row) {
  const sec = ITEM_SECTIONS.find(s => s.id === row.section);
  return EQUIP_SECTIONS.includes(row.section) ? `${row.name} (${sec.label.replace(/ items| bases/, '').toLowerCase()})` : row.name;
}
const RULE_OPTS = ['eth', 'sup', 'sock', 'ilvlMin', 'clvlMin', 'clvlMax', 'sound', 'marker'];
const ruleHasEffect = r => r && (Object.keys(r.fl || {}).length || r.sound || r.marker);
const ruleOptCount = r => (r ? RULE_OPTS.filter(k => k !== 'sound' && k !== 'marker' && r[k] !== undefined && r[k] !== '' && !(Array.isArray(r[k]) && !r[k].length) && r[k] !== 'any' && r[k] !== 'both').length : 0);
function pruneRule(key) {
  const i = S.profile.rules.findIndex(r => r.key === key);
  if (i < 0) return;
  const r = S.profile.rules[i];
  if (!ruleHasEffect(r) && !ruleOptCount(r)) S.profile.rules.splice(i, 1);
}

// The drops a row stands for, given its options (used to show Roofoo's default per level)
function rowVariants(row, r = {}) {
  const sec = row.section;
  const equip = canBeEth(row.code);
  const qual = sec === 'NMAG' ? (r.sup === 'sup' ? ['SUP'] : r.sup === 'norm' ? ['NMAG'] : ['NMAG', 'SUP']) : EQUIP_SECTIONS.includes(sec) ? [sec] : ['NMAG'];
  const eths = !equip ? [false] : r.eth === 'yes' ? [true] : r.eth === 'no' ? [false] : [false, true];
  const socks = r.sock && r.sock.length ? r.sock : [0];
  const ilvl = r.ilvlMin > 1 ? Math.max(r.ilvlMin, 1) : 85;
  const clvl = Math.min(Math.max(90, r.clvlMin || 1), r.clvlMax || 99);
  const out = [];
  for (const quality of qual) for (const eth of eths) for (const sockets of socks) {
    out.push({ code: row.code, quality, eth, sockets, ed: quality === 'SUP' ? 15 : 0, ilvl, clvl });
  }
  return out;
}

function rowDefaults(row, r) {
  const sim = baselineSim();
  const out = [];
  for (let fl = 0; fl < E.FILTER_LEVELS; fl++) {
    const states = rowVariants(row, r).map(v => sim.evaluate(E.makeItem(S.game, { ...v, filtlvl: fl })));
    const shown = states.filter(s => !s.hidden).length;
    out.push(shown === states.length ? 'show' : shown === 0 ? 'hide' : 'some');
  }
  return out;
}

function rowChanged(row) {
  if (ruleHasEffect(ruleFor(row.key))) return true;
  if (row.section === 'UNI' || row.section === 'SET') {
    for (const e of ['N', 'E']) { const k = `${row.section}|${e}|${row.code}`; if (k in S.profile.tiers && S.profile.tiers[k] !== (S.base.tiers.map.get(k) || '')) return true; }
  }
  for (const k of mysteryKeysFor(row)) if (k in (S.profile.mystery || {}) && S.profile.mystery[k] !== (S.base.mystery.map.get(k) || '')) return true;
  return false;
}

// ---- mystery drops (Bastard Mystery filter)

const mysteryOn = () => isMysteryBase() && S.base.mystery.present;
const MYST_SEGS = {
  item: [['', 'Off'], ['LITTLE', 'Little'], ['LUCKY', 'Lucky']],
  N: [['', 'Off'], ['LUCKY', 'Lucky'], ['BIG', 'Big']],
  E: [['', 'Off'], ['BIG', 'Big']],
};
const mysteryOf = key => (key in (S.profile.mystery || {}) ? S.profile.mystery[key] : (S.base.mystery.map.get(key) || ''));
function mysteryKeysFor(row) {
  if (!mysteryOn()) return [];
  if (row.section === 'UNI') return [`UNI|N|${row.code}`].concat(canBeEth(row.code) ? [`UNI|E|${row.code}`] : []);
  if (['RUNE', 'MISC', 'POT', 'GEM'].includes(row.section)) return ['item|' + (row.codes.find(c => !/^r\d\ds$/.test(c)) || row.code)];
  return [];
}
const rowIsMystery = row => mysteryKeysFor(row).some(k => mysteryOf(k));

function mysterySwitchHTML() {
  const on = isMysteryBase();
  return `<div class="card myst-switch ${on ? 'on' : ''}">
    <div><b>Mystery drops</b> <span class="badge">${on ? 'On' : 'Off'}</span>
      <p class="hint" style="margin:4px 0 0">Big drops hide their real name outside town behind a label like <b>Lucky Bastard</b> and play a sound, so you find out what it is back in town.${on ? ' Choose which drops are mysteries on the Items tab: runes, items and uniques each have a Mystery setting.' : ''}</p></div>
    <button class="btn ${on ? 'ghost' : 'primary'}" data-act="${on ? 'mystery-off' : 'mystery-on'}">${on ? 'Turn off' : 'Turn on'}</button></div>`;
}

function mysteryCardHTML() {
  if (!mysteryOn()) return mysterySwitchHTML();
  const previews = MYSTERY_SLOT_IDS.map(id => {
    const slot = TEXT_SLOTS.find(t => t.id === id);
    const prev = slotPreview(id);
    return prev ? `<div class="card"><b>${esc(slot.label)}</b><div ${slotAttr(id)}>${groundHTML(prev, '', true)}</div><span class="hint">${esc(slot.help || '')}</span></div>` : '';
  }).join('');
  const boss = [...new Set(S.base.mystery.boss)].map(c => S.game.uniques.filter(u => u.c === c).map(u => u.n)).flat();
  const count = [...new Set([...S.base.mystery.map.keys(), ...Object.keys(S.profile.mystery || {})])].filter(k => mysteryOf(k)).length;
  return `<details class="card myst-box" data-sec="mystery"${S.itemsUI.open.has('mystery') ? ' open' : ''}>
    <summary><b>Mystery drops</b><span class="rp-counts"><span class="c-myst">${count} mystery drops</span><span class="badge">On</span></span></summary>
    <div class="myst-body">
      <p class="lead" style="margin-bottom:10px">Outside town these drops show a mystery label and its sound instead of their real name. In town you see what they really are. Set each drop's label with the <b>Mystery</b> buttons on its row below (runes, special items and uniques), or tick "Only mystery drops" to list them. Label looks and sounds are on the <b>Colors &amp; sounds</b> tab.</p>
      <div class="tier-legend myst-legend">${previews}</div>
      <p class="hint">Always a mystery inside the uber boss arenas (HOLY MOLY): ${esc(boss.join(', '))}.</p>
      <button class="btn small ghost" data-act="mystery-off">Turn mystery drops off</button>
    </div></details>`;
}

function segHTML(label, segs, cur, was, attrs) {
  return `<div class="tcol"><span class="tl"><span>${esc(label)}</span>${cur !== was ? `<button class="btn small ghost undo" ${attrs(was)}>Undo</button>` : ''}</span>
    <div class="seg" role="group" aria-label="${esc(label)}">${segs.map(([v, l, title]) => `<button ${attrs(v)} aria-pressed="${v === cur}" class="${v === was && v !== cur ? 'was' : ''}"${title ? ` title="${esc(title)}"` : ''}>${esc(l)}</button>`).join('')}</div></div>`;
}

// ---- rendering

function renderItems() {
  const el = panel('items');
  const u = S.itemsUI;
  const names = S.base.levelNames;
  el.innerHTML = `
    <h2>Items</h2>
    <p class="lead">Every drop in one place. Open a section, find the item, and click a filter level to flip it: <b style="color:#b9f0b9">Show</b> something Roofoo hides there, or <b style="color:#ffc2bc">Hide</b> something Roofoo shows. Click again to go back to Roofoo's choice. <b>Options</b> narrows it down (ethereal, sockets, superior, item level, character level). Hidden items still show in town.</p>
    <details class="customize"><summary>What do the filter levels mean?</summary>
      <div class="fl-legend">${names.map((n, i) => `<div><b>FL${i}</b>${esc(n)}</div>`).join('')}</div>
      <p class="hint">You pick the filter level in game. The Horadric Cube's tooltip shows which one is active.</p></details>
    <div class="toolbar">
      <input type="search" placeholder="Search any item, unique or set… (e.g. Shako, Ber, Monarch)" value="${esc(u.q)}" data-if="q" aria-label="Search items">
      <label class="qchip"><input type="checkbox" data-if="changed" ${u.changed ? 'checked' : ''}> Only my changes</label>
      ${mysteryOn() ? `<label class="qchip"><input type="checkbox" data-if="mystery" ${u.mystery ? 'checked' : ''}> Only mystery drops</label>` : ''}
      <button class="btn small ghost" data-act="close-all">Close all</button>
    </div>
    ${mysteryCardHTML()}
    <div id="item-sections">${ITEM_SECTIONS.map(sectionHTML).join('')}</div>`;
}

function filteredRows(section) {
  const u = S.itemsUI;
  const q = u.q.trim().toLowerCase();
  return itemRows(section).filter(row => {
    if (q && !row.name.toLowerCase().includes(q) && !(row.names || []).some(n => n.toLowerCase().includes(q))) return false;
    if (u.changed && !rowChanged(row)) return false;
    if (u.mystery && !rowIsMystery(row)) return false;
    return true;
  });
}
const filtering = () => !!(S.itemsUI.q.trim() || S.itemsUI.changed || S.itemsUI.mystery);

function sectionHTML(sec) {
  if ((sec.id === 'UNI' || sec.id === 'SET') && !S.base.tiers.aliases.length && !filtering()) {
    // e.g. Slamfest: no star lists, but show/hide still works
  }
  const rows = filteredRows(sec.id);
  if (!rows.length && filtering()) return '';
  const changedN = rows.filter(rowChanged).length;
  const open = filtering() ? rows.length <= 60 : S.itemsUI.open.has(sec.id);
  const color = TEXT_COLORS[sec.rarity] || RARITY[sec.rarity] || '#eee';
  return `<details class="card isec" data-sec="${sec.id}"${open ? ' open' : ''}>
    <summary><b style="color:${color}">${esc(sec.label)}</b><span class="rp-counts">${changedN ? `<span class="c-changed">${changedN} changed</span>` : ''}<span class="c-total">${rows.length}${filtering() ? ' found' : ''}</span></span></summary>
    <div class="isec-body" data-body="${sec.id}">${open ? sectionBody(sec, rows) : ''}</div></details>`;
}

function sectionBody(sec, rows = filteredRows(sec.id)) {
  let html = sec.blurb ? `<p class="hint" style="margin:0 0 10px">${esc(sec.blurb)}</p>` : '';
  if ((sec.id === 'UNI' || sec.id === 'SET') && S.base.tiers.aliases.length) {
    html += `<div class="tier-legend">${TIERS.map(t => {
      const prev = t.slot ? slotPreview(t.slot) : { hidden: false, name: '%GOLD%Colossus Blade', icons: [] };
      const sp = t.slot ? slotSpec(t.slot) : { code: '7gd', quality: 'UNI' };
      return `<div class="card"><b>${esc(t.label)}</b><div ${itemAttr(sp)}>${prev ? groundHTML(prev, '', true) : ''}</div>${t.help ? `<span class="hint">${esc(t.help)}</span>` : ''}</div>`;
    }).join('')}</div>`;
  }
  const groups = new Map();
  for (const row of rows) (groups.get(row.group) || groups.set(row.group, []).get(row.group)).push(row);
  if (groups.size === 1) return html + `<div class="irows">${rows.map(itemRowHTML).join('')}</div>`;
  for (const [g, list] of groups) {
    const gid = `${sec.id}|${g}`;
    const open = (filtering() && rows.length <= 60) || S.itemsUI.open.has(gid);
    const changedN = list.filter(rowChanged).length;
    html += `<details class="igrp" data-grp="${esc(gid)}"${open ? ' open' : ''}>
      <summary><span>${esc(g)}</span><span class="rp-counts">${changedN ? `<span class="c-changed">${changedN} changed</span>` : ''}<span class="c-total">${list.length}</span></span></summary>
      <div class="irows" data-grp-body="${esc(gid)}">${open ? list.map(itemRowHTML).join('') : ''}</div></details>`;
  }
  return html;
}

function itemRowHTML(row) {
  const r = ruleFor(row.key);
  const defs = rowDefaults(row, r);
  const names = S.base.levelNames;
  const sec = row.section;
  const cells = defs.map((d, fl) => {
    const ov = r && r.fl && r.fl[fl];
    const cls = ov ? `ov-${ov}` : `def-${d === 'hide' ? 'hide' : d === 'some' ? 'some' : 'show'}`;
    const label = ov === 'show' ? 'Show' : ov === 'hide' ? 'Hide' : d === 'show' ? 'Shown' : d === 'hide' ? 'Hidden' : 'Some';
    const tip = `FL${fl} ${names[fl] || ''}: Roofoo ${d === 'show' ? 'shows' : d === 'hide' ? 'hides' : 'shows some versions of'} this.${ov ? ` You: ${ov === 'show' ? 'always show' : 'hide'}.` : ''} Click to change.`;
    return `<button class="fl ${cls}" data-act="fl" data-row="${row.key}" data-fl="${fl}" title="${esc(tip)}"><span class="num">FL${fl}</span><span class="st">${label}</span></button>`;
  }).join('');
  const quality = EQUIP_SECTIONS.includes(sec) ? (sec === 'NMAG' ? 'NMAG' : sec) : 'NMAG';
  const spec = { code: row.code, quality, names: row.names };
  const color = row.color || RARITY[quality === 'NMAG' ? 'WHITE' : quality];
  let extra = '';
  if ((sec === 'UNI' || sec === 'SET') && S.base.tiers.aliases.length) {
    const tseg = e => {
      const key = `${sec}|${e}|${row.code}`;
      return segHTML(`Stars${canBeEth(row.code) ? (e === 'N' ? ' · normal' : ' · ethereal') : ''}`, TIERS.map(t => [t.id, t.short, t.label]), tierOf(key), S.base.tiers.map.get(key) || '', v => `data-act="tier" data-key="${key}" data-tier="${v}"`);
    };
    extra += tseg('N') + (canBeEth(row.code) ? tseg('E') : '');
  }
  for (const k of mysteryKeysFor(row)) {
    const kind = k.startsWith('UNI|') ? k.split('|')[1] : 'item';
    const label = kind === 'item' ? 'Mystery label' : `Mystery · ${kind === 'N' ? 'normal' : 'ethereal'}`;
    extra += segHTML(label, MYST_SEGS[kind], mysteryOf(k), S.base.mystery.map.get(k) || '', v => `data-act="myst-set" data-key="${k}" data-b="${v}"`);
  }
  const optsOpen = S.itemsUI.opts.has(row.key);
  const nOpts = ruleOptCount(r);
  return `<div class="irow${rowChanged(row) ? ' changed' : ''}" data-row="${row.key}">
    <div class="irow-head">
      <div class="irow-name">${iconSVG(iconFor({ code: row.code, group: row.group }), color)}<div>
        <b class="item-link" ${itemAttr(spec)} style="color:${color}">${esc(row.name)}</b>${row.tier ? `<span class="tier-tag t-${row.tier}">${TIER_LABEL[row.tier]}</span>` : ''}
        ${row.names ? `<div class="tnames${sec === 'SET' ? ' set' : ''}">${esc(row.names.join(', '))}</div>` : ''}</div></div>
      ${extra ? `<div class="irow-extra">${extra}</div>` : ''}
    </div>
    <div class="irow-fl"><div class="flstrip mini">${cells}</div>
      <button class="btn small ${optsOpen ? '' : 'ghost'}" data-act="opts" data-row="${row.key}" aria-expanded="${optsOpen}">Options${nOpts ? ` (${nOpts})` : ''} ${optsOpen ? '▴' : '▾'}</button></div>
    ${optsOpen ? optionsHTML(row, r) : ''}
  </div>`;
}

function optionsHTML(row, r = {}) {
  const sec = row.section;
  const it = S.game.items[row.code] || {};
  const equip = canBeEth(row.code);
  const k = row.key;
  const fields = [];
  if (equip) {
    fields.push(`<label>Ethereal<select data-opt="eth" data-row="${k}"><option value="any"${!r.eth || r.eth === 'any' ? ' selected' : ''}>Ethereal or not</option><option value="no"${r.eth === 'no' ? ' selected' : ''}>Not ethereal</option><option value="yes"${r.eth === 'yes' ? ' selected' : ''}>Ethereal only</option></select></label>`);
  }
  if (sec === 'NMAG') {
    fields.push(`<label>Normal or superior<select data-opt="sup" data-row="${k}"><option value="both"${!r.sup || r.sup === 'both' ? ' selected' : ''}>Both</option><option value="norm"${r.sup === 'norm' ? ' selected' : ''}>Normal only</option><option value="sup"${r.sup === 'sup' ? ' selected' : ''}>Superior only</option></select></label>`);
  }
  if (equip && it.ms) {
    const sel = r.sock || [];
    const chips = [`<button class="sock${!sel.length ? ' on' : ''}" data-act="sock" data-row="${k}" data-n="any">Any</button>`]
      .concat(Array.from({ length: it.ms + 1 }, (_, n) => `<button class="sock${sel.includes(n) ? ' on' : ''}" data-act="sock" data-row="${k}" data-n="${n}">${n === 0 ? 'None' : n}</button>`));
    fields.push(`<div class="field"><span>Sockets</span><div class="socks">${chips.join('')}</div></div>`);
  }
  if (['MAG', 'RARE'].includes(sec)) {
    fields.push(`<label>Item level at least<input type="number" min="1" max="99" placeholder="any" value="${r.ilvlMin || ''}" data-opt="ilvlMin" data-row="${k}"></label>`);
  }
  fields.push(`<label>Character level<span class="range"><input type="number" min="1" max="99" placeholder="1" value="${r.clvlMin || ''}" data-opt="clvlMin" data-row="${k}"> to <input type="number" min="1" max="99" placeholder="99" value="${r.clvlMax || ''}" data-opt="clvlMax" data-row="${k}"></span></label>`);
  fields.push(`<label>Extra sound<span class="range"><select data-opt="sound" data-row="${k}">${soundOptions(r.sound || 0)}</select><button class="btn icon-btn" data-act="play" data-sound="${r.sound || 0}" aria-label="Play">▶</button></span></label>`);
  fields.push(`<label>Marker when you force it to show<select data-opt="marker" data-row="${k}"><option value="">None</option>${MARKER_COLORS.map(([v, l]) => `<option value="DOT-${v}"${r.marker === 'DOT-' + v ? ' selected' : ''}>${l} dot</option>`).join('')}</select></label>`);
  return `<div class="irow-opts">
    <p class="hint">These narrow down which drops your Show / Hide choices apply to. The level strip above updates to show what Roofoo does with exactly these drops.</p>
    <div class="test-form">${fields.join('')}</div>
    <div class="row"><button class="btn small ghost" data-act="fl-all" data-row="${k}" data-v="hide">Hide on every level</button>
      <button class="btn small ghost" data-act="fl-all" data-row="${k}" data-v="">Back to Roofoo's choice</button>
      <button class="btn small ghost danger" data-act="row-reset" data-row="${k}">Reset this item</button></div>
  </div>`;
}

function rowByKey(key) {
  const sec = key.split(':')[0];
  return itemRows(sec).find(r => r.key === key);
}

function refreshRow(key) {
  const row = rowByKey(key);
  for (const el of panel('items').querySelectorAll(`.irow[data-row="${CSS.escape(key)}"]`)) {
    const tmp = document.createElement('div');
    tmp.innerHTML = itemRowHTML(row);
    el.replaceWith(tmp.firstElementChild);
  }
}

function fillDetails(d) {
  if (d.dataset.sec && d.dataset.sec !== 'mystery') {
    const body = d.querySelector(':scope > .isec-body');
    if (d.open && !body.innerHTML.trim()) body.innerHTML = sectionBody(ITEM_SECTIONS.find(s => s.id === d.dataset.sec));
  }
  if (d.dataset.grp) {
    const body = d.querySelector(':scope > .irows');
    if (d.open && !body.innerHTML.trim()) {
      const [sec, g] = [d.dataset.grp.slice(0, d.dataset.grp.indexOf('|')), d.dataset.grp.slice(d.dataset.grp.indexOf('|') + 1)];
      body.innerHTML = filteredRows(sec).filter(r => r.group === g).map(itemRowHTML).join('');
    }
  }
}

function onItemsEvent(ev) {
  const u = S.itemsUI;
  const f = ev.target.closest('[data-if]');
  if (f && (ev.type === 'change' || (ev.type === 'input' && f.dataset.if === 'q'))) {
    u[f.dataset.if] = f.type === 'checkbox' ? f.checked : f.value;
    const redraw = () => { document.getElementById('item-sections').innerHTML = ITEM_SECTIONS.map(sectionHTML).join('') || '<div class="card empty-state">Nothing matches.</div>'; };
    if (f.dataset.if === 'q') { clearTimeout(S.itemTimer); S.itemTimer = setTimeout(redraw, 180); } else redraw();
    return;
  }
  const opt = ev.target.closest('[data-opt]');
  if (opt && ev.type === 'change') {
    const row = rowByKey(opt.dataset.row);
    const r = ruleOrNew(row);
    const key = opt.dataset.opt;
    let v = opt.value;
    if (['ilvlMin', 'clvlMin', 'clvlMax', 'sound'].includes(key)) v = v === '' ? undefined : Math.max(0, +v) || undefined;
    if ((key === 'eth' && v === 'any') || (key === 'sup' && v === 'both') || v === '') v = undefined;
    if (v === undefined) delete r[key]; else r[key] = v;
    if (key === 'sound' && v) playSound(v);
    pruneRule(row.key);
    changed(false);
    return refreshRow(row.key);
  }
  const t = ev.target.closest('[data-act]');
  if (!t || ev.type !== 'click') return;
  const act = t.dataset.act;
  if (act === 'play') return playSound(+t.dataset.sound);
  if (act === 'close-all') { u.open.clear(); u.opts.clear(); return renderItems(); }
  if (act === 'tier') {
    const key = t.dataset.key, val = t.dataset.tier, was = S.base.tiers.map.get(key) || '';
    if (val === was) delete S.profile.tiers[key]; else S.profile.tiers[key] = val;
    changed(false);
    return refreshRow(t.closest('.irow').dataset.row);
  }
  if (act === 'myst-set') {
    const key = t.dataset.key, b = t.dataset.b;
    S.profile.mystery = S.profile.mystery || {};
    if (b === (S.base.mystery.map.get(key) || '')) delete S.profile.mystery[key]; else S.profile.mystery[key] = b;
    changed(false);
    return refreshRow(t.closest('.irow').dataset.row);
  }
  const row = t.dataset.row && rowByKey(t.dataset.row);
  if (!row) return;
  if (act === 'opts') {
    if (u.opts.has(row.key)) u.opts.delete(row.key); else u.opts.add(row.key);
    return refreshRow(row.key);
  }
  if (act === 'fl') {
    const fl = +t.dataset.fl;
    const r = ruleOrNew(row);
    const def = rowDefaults(row, r)[fl];
    if (r.fl[fl]) delete r.fl[fl]; else r.fl[fl] = def === 'hide' ? 'show' : 'hide';
    pruneRule(row.key);
    changed(false);
    return refreshRow(row.key);
  }
  if (act === 'fl-all') {
    const r = ruleOrNew(row);
    r.fl = {};
    if (t.dataset.v) for (let l = 0; l < E.FILTER_LEVELS; l++) r.fl[l] = t.dataset.v;
    pruneRule(row.key);
    changed(false);
    return refreshRow(row.key);
  }
  if (act === 'sock') {
    const r = ruleOrNew(row);
    if (t.dataset.n === 'any') delete r.sock;
    else {
      const n = +t.dataset.n;
      const set = new Set(r.sock || []);
      if (set.has(n)) set.delete(n); else set.add(n);
      r.sock = [...set].sort((a, b) => a - b);
      if (!r.sock.length) delete r.sock;
    }
    pruneRule(row.key);
    changed(false);
    return refreshRow(row.key);
  }
  if (act === 'row-reset') {
    const i = S.profile.rules.findIndex(r => r.key === row.key);
    if (i >= 0) S.profile.rules.splice(i, 1);
    for (const e of ['N', 'E']) delete S.profile.tiers[`${row.section}|${e}|${row.code}`];
    for (const k of mysteryKeysFor(row)) delete (S.profile.mystery || {})[k];
    changed(false);
    return refreshRow(row.key);
  }
}

// Old "Show / hide items" rules (one rule per added item) -> Items tab rows
function migrateRules(p) {
  for (const r of p.rules || []) {
    if (r.section || !r.codes || !r.codes.length) continue;
    const code = r.codes[0];
    const it = (S.game && S.game.items[code]) || {};
    let section = (r.q && r.q[0]) || 'NMAG';
    if (r.kind === 'unique') section = 'UNI';
    else if (r.kind === 'set') section = 'SET';
    else if (r.kind === 'misc') {
      const cat = categoryOf(code, it);
      section = cat === 'Rune' ? 'RUNE' : cat === 'Gem' ? 'GEM' : cat === 'Potion' || SCROLLS.includes(code) ? 'POT' : 'MISC';
    }
    if (section === 'CRAFT') continue;
    r.section = section;
    r.key = `${section}:${code}`;
    r.id = r.key;
    delete r.q; delete r.kind; delete r.note;
  }
  // one rule per row
  const seen = new Set();
  p.rules = (p.rules || []).filter(r => !r.key || (seen.has(r.key) ? false : seen.add(r.key)));
}

// ---------------------------------------------------------------- tab: test an item

function testQualities(entry) {
  if (!entry) return [];
  const it = S.game.items[entry.codes[0]] || {};
  if (it.k === 'weapon' || it.k === 'armor') return ['NMAG', 'SUP', 'MAG', 'RARE', 'UNI', 'SET', 'CRAFT'];
  if (['rin', 'amu'].includes(entry.codes[0])) return ['MAG', 'RARE', 'UNI', 'SET', 'CRAFT'];
  if (['jew', 'cm1', 'cm2', 'cm3'].includes(entry.codes[0])) return ['MAG', 'RARE', 'UNI'];
  return [];
}

function renderTest() {
  const t = S.test;
  const quals = testQualities(t.entry);
  const it = t.entry ? S.game.items[t.entry.codes[0]] || {} : {};
  const equip = it.k === 'weapon' || it.k === 'armor';
  panel('test').innerHTML = `
    <h2>Test an item</h2>
    <p class="lead">See exactly how an item looks on every filter level with <i>your</i> filter, before you download it.</p>
    ${pickerHTML('test', 'Pick an item to test: "Shako", "Zod Rune", "Monarch"…')}
    ${t.entry ? `
    <div class="test-form">
      <label>Item<b class="item-link" ${itemAttr(testSpec())} style="text-transform:none;letter-spacing:0;color:var(--text);font-size:15px">${esc(t.entry.name)}</b></label>
      ${quals.length ? `<label>Quality<select data-tt="quality">${quals.map(q => `<option value="${q}"${q === t.quality ? ' selected' : ''}>${E.QUALITY_LABELS[q]}</option>`).join('')}</select></label>` : ''}
      ${equip ? `<label class="check"><input type="checkbox" data-tt="eth" ${t.eth ? 'checked' : ''}> Ethereal</label>` : ''}
      ${quals.length ? `<label class="check"><input type="checkbox" data-tt="identified" ${t.identified ? 'checked' : ''}> Identified</label>` : ''}
      ${equip ? `<label>Sockets<input type="number" min="0" max="6" value="${t.sockets}" data-tt="sockets"></label>` : ''}
      ${equip && t.quality === 'SUP' ? `<label>Enhanced def/dmg %<input type="number" min="0" max="15" value="${t.ed}" data-tt="ed"></label>` : ''}
      ${quals.length ? `<label>Item level<input type="number" min="1" max="99" value="${t.ilvl}" data-tt="ilvl"></label>` : ''}
      <label>Character level<input type="number" min="1" max="99" value="${t.clvl}" data-tt="clvl"></label>
      <label>Where<select data-tt="where"><option value="ground"${t.where === 'ground' ? ' selected' : ''}>Dropped outside town</option><option value="town"${t.where === 'town' ? ' selected' : ''}>Dropped in town</option></select></label>
    </div>
    <div class="results" id="test-results"></div>` : '<div class="card empty-state" style="margin-top:14px">Pick an item above to see it on every filter level.</div>'}`;
  wirePicker(panel('test'), 'test', e => {
    S.test.entry = e;
    const qs = testQualities(e);
    S.test.quality = e.q[0] && qs.includes(e.q[0]) ? e.q[0] : (qs[0] || 'NMAG');
    S.test.identified = false;
    renderTest();
  });
  if (t.entry) drawTestResults();
}

function testSpec() {
  const t = S.test;
  const q = testQualities(t.entry).length ? t.quality : 'NMAG';
  return { code: t.entry.codes[0], quality: q, eth: !!t.eth, identified: !!t.identified, sockets: +t.sockets, ed: +t.ed, ilvl: +t.ilvl,
    uniqueName: t.entry.uniqueName, names: t.entry.uniqueName ? [t.entry.uniqueName] : undefined };
}

function drawTestResults() {
  const t = S.test;
  const sim = finalSim();
  const lines = S.memo.finalLines;
  const names = S.base.levelNames;
  const quals = testQualities(t.entry);
  const q = quals.length ? t.quality : 'NMAG';
  const rows = [];
  for (let fl = 0; fl < E.FILTER_LEVELS; fl++) {
    const item = E.makeItem(S.game, { code: t.entry.codes[0], quality: q, eth: t.eth, identified: t.identified, sockets: +t.sockets, ilvl: +t.ilvl, ed: +t.ed, where: t.where, clvl: +t.clvl, filtlvl: fl, uniqueName: t.entry.uniqueName });
    const r = sim.evaluate(item);
    const line = r.ruleLine !== null ? lines[r.ruleLine] : '';
    const desc = r.desc ? E.labelSegments(r.desc).map(segs => segs.map(s => s.text).join('')).join('\n').trim() : '';
    rows.push(`<div class="card res">
      <div class="fln"><b>FL${fl}</b><span>${esc(names[fl] || '')}</span></div>
      <div ${itemAttr(testSpec())}>${groundHTML(r)}</div>
      <div class="row">${r.sound ? `<button class="btn small" data-act="play" data-sound="${r.sound}">▶ ${esc(soundLabel(r.sound))}</button>` : '<span class="hint">No sound</span>'}</div>
      <details class="why"><summary>Why? (filter line ${r.ruleLine !== null ? r.ruleLine + 1 : '–'})</summary>${desc ? `<div class="desc">${esc(desc)}</div>` : ''}<code>${esc(line)}</code></details>
    </div>`);
  }
  document.getElementById('test-results').innerHTML = rows.join('');
}

function onTestEvent(ev) {
  const tt = ev.target.closest('[data-tt]');
  if (tt && (ev.type === 'change' || (ev.type === 'input' && tt.type === 'number'))) {
    S.test[tt.dataset.tt] = tt.type === 'checkbox' ? tt.checked : tt.value;
    if (tt.dataset.tt === 'quality') return renderTest();
    return drawTestResults();
  }
  const t = ev.target.closest('[data-act="play"]');
  if (t && ev.type === 'click') playSound(+t.dataset.sound);
}

// ---------------------------------------------------------------- tab: overview & review

const WEAPON_GROUPS = {
  swor: 'Swords', '2hcs': 'Swords', axe: 'Axes', club: 'Maces, clubs & hammers', mace: 'Maces, clubs & hammers',
  hamm: 'Maces, clubs & hammers', knif: 'Daggers', tkni: 'Throwing weapons', taxe: 'Throwing weapons', jave: 'Javelins',
  spea: 'Spears', pole: 'Polearms', bow: 'Bows', xbow: 'Crossbows', staf: 'Staves', wand: 'Wands', scep: 'Scepters',
  sc9: 'Scepters', h2h: 'Assassin claws', h2h2: 'Assassin claws', orb: 'Sorceress orbs', abow: 'Amazon weapons',
  aspe: 'Amazon weapons', ajav: 'Amazon weapons', tpot: 'Throwing potions',
};
const MISC_GROUPS = { Rune: 'Runes', Gem: 'Gems', Potion: 'Potions', Charm: 'Charms', Jewel: 'Jewels', Jewelry: 'Rings & amulets', Map: 'Maps', 'Other item': 'Other items' };
const REPORT_ORDER = ['Runes', 'Gems', 'Potions', 'Charms', 'Jewels', 'Rings & amulets', 'Maps', 'Other items',
  'Helms', 'Circlets', 'Barbarian helms', 'Druid pelts', 'Body armor', 'Shields', 'Paladin shields', 'Necromancer heads',
  'Gloves', 'Boots', 'Belts', 'Arrows & bolts', 'Swords', 'Axes', 'Maces, clubs & hammers', 'Daggers', 'Throwing weapons',
  'Javelins', 'Spears', 'Polearms', 'Bows', 'Crossbows', 'Staves', 'Wands', 'Scepters', 'Assassin claws', 'Sorceress orbs',
  'Amazon weapons', 'Throwing potions', 'Other armor', 'Other weapons'];

// Simple line icons (24x24, stroked) for each kind of item.
const ICONS = {
  sword: 'M5 19l3-3m-1 4l-3-3M8 16L19 5V3h-2L6 14', axe: 'M6 20L16 10m-3-3c2-3 6-3 7-2s1 5-2 7z',
  mace: 'M5 19l8-8m2-6a4 4 0 1 1 0 .01M15 3v2m4 2h2m-6 8v-2', dagger: 'M6 18l2-2m0 0l9-9 1-3-3 1-9 9m2 2l-2-2',
  bow: 'M6 4c8 2 12 6 14 14M6 4l14 14M4 20l4-4', staff: 'M5 19L17 7m0 0l2-4m-2 4l-3-1m3 1l1 3',
  spear: 'M4 20L18 6m0 0l2-2m-4 0l4 4', claw: 'M6 20l4-10m0 10l3-10m1 10l2-10M7 10h10',
  orb: 'M12 4a6 6 0 1 0 .01 0M12 16v4m-3 0h6', helm: 'M5 14a7 7 0 0 1 14 0v3H5zm4 3v3m6-3v3',
  armor: 'M8 4l4 2 4-2 3 3-2 3v10H7V10L5 7z', shield: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z',
  gloves: 'M8 20v-8l-2-3 2-1 2 2V5h2v6V4h2v7V5h2v8l-1 7z', boots: 'M8 4h5v9l6 3v4H6v-4l2-3z',
  belt: 'M3 10h18v4H3zm7-1h4v6h-4z', ring: 'M12 9a6 6 0 1 0 .01 0M10 5l2-2 2 2-2 2z',
  amulet: 'M6 3c0 6 12 6 12 0m-6 6l3 4-3 5-3-5z', rune: 'M8 3h8l3 4v10l-3 4H8l-3-4V7zm2 5l4 4-4 4',
  gem: 'M7 4h10l4 5-9 11L3 9zm-4 5h18M9 4l3 5 3-5', potion: 'M10 3h4m-4 0v5l-4 6a5 5 0 0 0 4 7h4a5 5 0 0 0 4-7l-4-6V3',
  charm: 'M7 4h10v16H7zm3 4h4m-4 4h4', jewel: 'M12 3l8 9-8 9-8-9z', map: 'M6 4h11v14a2 2 0 0 1-2 2H6zm0 0a2 2 0 0 0 0 4h2',
  arrows: 'M4 20L18 6m0 0v4m0-4h-4M8 20l12-12', item: 'M6 6h12v12H6z',
};
const GROUP_ICON = {
  Runes: 'rune', Gems: 'gem', Potions: 'potion', Charms: 'charm', Jewels: 'jewel', Maps: 'map', 'Other items': 'item',
  Helms: 'helm', Circlets: 'helm', 'Barbarian helms': 'helm', 'Druid pelts': 'helm', 'Body armor': 'armor', Shields: 'shield',
  'Paladin shields': 'shield', 'Necromancer heads': 'shield', Gloves: 'gloves', Boots: 'boots', Belts: 'belt',
  'Arrows & bolts': 'arrows', Swords: 'sword', Axes: 'axe', 'Maces, clubs & hammers': 'mace', Daggers: 'dagger',
  'Throwing weapons': 'dagger', Javelins: 'spear', Spears: 'spear', Polearms: 'spear', Bows: 'bow', Crossbows: 'bow',
  Staves: 'staff', Wands: 'staff', Scepters: 'mace', 'Assassin claws': 'claw', 'Sorceress orbs': 'orb',
  'Amazon weapons': 'bow', 'Throwing potions': 'potion', 'Other armor': 'armor', 'Other weapons': 'sword',
};
function iconFor(row) {
  if (row.code === 'rin') return 'ring';
  if (row.code === 'amu') return 'amulet';
  return GROUP_ICON[row.group] || 'item';
}
const iconSVG = (name, color) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="color:${color}"><path d="${ICONS[name] || ICONS.item}"/></svg>`;

// In-game rarity colors
const RARITY = { WHITE: '#f0f0f0', SUP: '#f0f0f0', MAG: '#6c6cff', RARE: '#ffff6a', UNI: '#c8b27a', SET: '#1dff1d', ITEM: '#f0f0f0' };
const VERSION_LABEL = { WHITE: 'Normal', SUP: 'Superior', MAG: 'Magic', RARE: 'Rare', UNI: 'Unique', SET: 'Set', ITEM: '' };
const TIER_LABEL = { NORM: 'Normal', EXC: 'Exceptional', ELT: 'Elite' };

function reportGroup(code, it) {
  if (it.k === 'weapon') return WEAPON_GROUPS[it.t] || 'Other weapons';
  if (it.k === 'armor') {
    const f = it.f || [];
    for (const [flag, g] of [['BAR', 'Barbarian helms'], ['DRU', 'Druid pelts'], ['DIN', 'Paladin shields'], ['NEC', 'Necromancer heads'],
      ['CIRC', 'Circlets'], ['HELM', 'Helms'], ['CHEST', 'Body armor'], ['SHIELD', 'Shields'], ['GLOVES', 'Gloves'],
      ['BOOTS', 'Boots'], ['BELT', 'Belts'], ['QUIVER', 'Arrows & bolts']]) if (f.includes(flag)) return g;
    return 'Other armor';
  }
  if ((it.f || []).includes('QUIVER')) return 'Arrows & bolts';
  return MISC_GROUPS[categoryOf(code, it)] || 'Other items';
}

// Every kind of drop the overview checks, with the versions that can drop.
function reportRows() {
  if (S.memo.reportRows) return S.memo.reportRows;
  const uniq = new Map(), sets = new Map();
  for (const u of S.game.uniques) (uniq.get(u.c) || uniq.set(u.c, []).get(u.c)).push(u.n);
  for (const s of S.game.sets) (sets.get(s.c) || sets.set(s.c, []).get(s.c)).push(s.n);
  const rows = [];
  for (const [code, it] of Object.entries(S.game.items)) {
    if (it.k === 'misc' || !it.n) continue;
    const versions = ['WHITE', 'SUP', 'MAG', 'RARE'];
    if (uniq.has(code)) versions.push('UNI');
    if (sets.has(code)) versions.push('SET');
    rows.push({ key: code, code, name: it.n, tier: it.tier, group: reportGroup(code, it), versions, eth: it.k !== 'weapon' || !['tpot'].includes(it.t), ms: it.ms || 0, uniq: uniq.get(code), sets: sets.get(code) });
  }
  for (const e of S.catalog) {
    if (e.kind !== 'misc') continue;
    const code = e.codes[0];
    if (code === 'gld') continue;
    const it = S.game.items[code];
    let versions = ['ITEM'];
    if (code === 'rin' || code === 'amu') versions = ['MAG', 'RARE', 'UNI', 'SET'];
    else if (code === 'jew') versions = ['MAG', 'RARE', 'UNI'];
    else if (['cm1', 'cm2', 'cm3'].includes(code)) versions = ['MAG', 'UNI'];
    rows.push({ key: code, code, name: e.name, group: reportGroup(code, it), versions, eth: false, ms: 0, uniq: uniq.get(code), sets: sets.get(code), color: TEXT_COLORS[it.nc] || '#f0f0f0' });
  }
  // Some PD2-only bases share a name with a normal base; tell them apart by their unique
  const seen = new Map();
  for (const r of rows) seen.set(r.group + r.name, (seen.get(r.group + r.name) || 0) + 1);
  for (const r of rows) if (seen.get(r.group + r.name) > 1 && r.uniq) r.note = `base of ${r.uniq[0]}`;
  const order = g => { const i = REPORT_ORDER.indexOf(g); return i < 0 ? 99 : i; };
  rows.sort((a, b) => order(a.group) - order(b.group) || a.name.localeCompare(b.name));
  S.memo.reportRows = rows;
  return rows;
}

// Item levels where Roofoo's rules change their answer (e.g. ALVL>74 -> 75), so we check exactly there.
function ilvlPoints() {
  if (S.memo.ilvlPoints) return S.memo.ilvlPoints;
  const pts = new Set([1, 99]);
  for (const m of S.baseText.matchAll(/\b(?:ILVL|ALVL|CRAFTALVL)(=|<|>|~)(\d+)(?:-(\d+))?/g)) {
    const a = +m[2], b = m[3] !== undefined ? +m[3] : a;
    if (m[1] === '>') pts.add(a + 1);
    else if (m[1] === '<') pts.add(a);
    else { pts.add(a); pts.add(b + 1); }
  }
  S.memo.ilvlPoints = [...pts].filter(p => p >= 1 && p <= 99).sort((x, y) => x - y);
  return S.memo.ilvlPoints;
}

// The individual checks for one version of an item: [{dim, val, opts}]
function versionChecks(row, v) {
  if (v === 'WHITE' || v === 'SUP') {
    const out = [];
    for (let s = 0; s <= row.ms; s++) out.push({ dim: 'sock', val: s, opts: { quality: v === 'SUP' ? 'SUP' : 'NMAG', sockets: s, ed: v === 'SUP' ? 15 : 0 } });
    return out;
  }
  if (v === 'MAG' || v === 'RARE') {
    return ilvlPoints().map(p => ({ dim: 'ilvl', val: p, opts: { quality: v, ilvl: p } }));
  }
  if (v === 'ITEM') return [{ dim: null, val: null, opts: { quality: 'NMAG' } }];
  return [{ dim: null, val: null, opts: { quality: v } }];
}

// -> Map(rowKey -> [{ v, eth, dim, val, hidden, opts }])
async function computeReport(sim, fl, opts, progress) {
  const out = new Map();
  const rows = reportRows();
  const common = { filtlvl: fl, clvl: opts.clvl, diff: opts.diff, where: 'ground' };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = [];
    for (const v of row.versions) {
      for (const eth of row.eth ? [false, true] : [false]) {
        for (const c of versionChecks(row, v)) {
          const o = { code: row.code, ...common, ...c.opts, eth };
          const res = sim.evaluate(E.makeItem(S.game, o));
          const myst = !res.hidden && sim.mystery ? sim.mystery.get(res.ruleLine) || null : null;
          cells.push({ v, eth, dim: c.dim, val: c.val, hidden: res.hidden, myst, opts: o });
        }
      }
    }
    out.set(row.key, cells);
    if (i % 40 === 39) { progress && progress((i + 1) / rows.length); await new Promise(r => setTimeout(r, 0)); }
  }
  let gold = 0;
  for (const amt of [49, 99, 199, 399, 999, 1999, 2999, 4999, 9999]) {
    if (sim.evaluate(E.makeItem(S.game, { code: 'gld', gold: amt, ...common })).hidden) gold = amt;
  }
  out.gold = gold;
  return out;
}

function reportKey(which, fl) {
  const o = S.report;
  return JSON.stringify([S.baseFile, which, which === 'roofoo' ? '' : S.profile, fl, o.clvl, o.diff]);
}

async function getReport(which, fl, progress) {
  S.memo.reports = S.memo.reports || new Map();
  const key = reportKey(which, fl);
  if (S.memo.reports.has(key)) return S.memo.reports.get(key);
  if (which === 'roofoo' && !S.memo.roofooSim) { S.memo.roofooSim = new E.Simulator(S.baseText); S.memo.roofooSim.mystery = mysteryLines(S.baseText); }
  const sim = which === 'roofoo' ? S.memo.roofooSim : finalSim();
  const rep = await computeReport(sim, fl, { clvl: +S.report.clvl, diff: +S.report.diff }, progress);
  S.memo.reports.set(key, rep);
  return rep;
}

const cellKey = c => `${c.v}|${c.eth}|${c.dim}|${c.val}`;

// Merge cells into chips: same version + ethereal + result, with neighbouring socket counts / item levels joined.
function makeChips(row, cells) {
  let chips = [];
  const groups = new Map();
  for (const c of cells) {
    const k = `${c.v}|${c.eth}|${c.hidden}|${c.myst || ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  for (const list of groups.values()) {
    const { v, eth, hidden, dim, myst } = list[0];
    const all = versionChecks(row, v).map(x => x.val);
    // split into runs that are next to each other in the full list of checked values
    let run = [];
    const flush = () => { if (run.length) chips.push({ v, eth, hidden, dim, myst, vals: run.map(c => c.val), all, cell: run[run.length - 1] }); run = []; };
    let lastIdx = -2;
    for (const c of list) {
      const idx = all.indexOf(c.val);
      if (idx !== lastIdx + 1) flush();
      run.push(c);
      lastIdx = idx;
    }
    flush();
  }
  // Ethereal and non-ethereal behave the same? Show one chip for both.
  const merged = [];
  for (const c of chips) {
    const twin = merged.find(m => m.v === c.v && m.hidden === c.hidden && m.myst === c.myst && m.eth !== c.eth && m.eth !== 'any' && m.vals.join() === c.vals.join());
    if (twin) { twin.eth = 'any'; if (!twin.cell.opts.eth) twin.cell = c.cell.opts.eth ? twin.cell : c.cell; } else merged.push(c);
  }
  chips = merged;
  const vOrder = ['ITEM', 'WHITE', 'SUP', 'MAG', 'RARE', 'UNI', 'SET'];
  const ethOrder = e => (e === 'any' ? 0 : e ? 2 : 1);
  chips.sort((a, b) => vOrder.indexOf(a.v) - vOrder.indexOf(b.v) || ethOrder(a.eth) - ethOrder(b.eth) || (a.vals[0] ?? 0) - (b.vals[0] ?? 0));
  return chips;
}

function rangeText(chip) {
  if (!chip.dim || chip.vals.length === chip.all.length) return '';
  const lo = chip.vals[0];
  if (chip.dim === 'sock') {
    const hi = chip.vals[chip.vals.length - 1];
    if (hi === 0) return 'no sockets';
    if (lo === hi) return `${lo} socket${lo === 1 ? '' : 's'}`;
    return `${lo}–${hi} sockets`;
  }
  const idx = chip.all.indexOf(chip.vals[chip.vals.length - 1]);
  const hi = idx + 1 < chip.all.length ? chip.all[idx + 1] - 1 : 99;
  if (hi >= 99) return `ilvl ${lo}+`;
  return lo === hi ? `ilvl ${lo}` : `ilvl ${lo}–${hi}`;
}

function chipLabel(row, chip) {
  const parts = [];
  let name = row.versions[0] === 'ITEM' ? row.name : VERSION_LABEL[chip.v];
  const names = chip.v === 'UNI' ? row.uniq : chip.v === 'SET' ? row.sets : null;
  if (names && names.length && names.length <= 2) name += ` (${names.join(', ')})`;
  else if (names && names.length) name += ` (${names.length} items)`;
  parts.push(name);
  if (chip.eth === true) parts.push('ethereal');
  else if (chip.eth === false && row.eth) parts.push('non-ethereal');
  const r = rangeText(chip);
  if (r) parts.push(r);
  if (chip.myst) parts.push(`drops as “${chip.myst}”`);
  return parts;
}

function renderReport() {
  S.report = S.report || { fl: 8, clvl: 90, diff: 2, mode: 'all', q: '' };
  const r = S.report;
  const names = S.base.levelNames;
  panel('report').innerHTML = `
    <h2>Overview &amp; review</h2>
    <p class="lead">What your filter shows and hides on the ground on each filter level, in plain words. <b style="color:#ff8a80">Red</b> border = hidden outside town, <b style="color:#8fe39a">green</b> border = shown. The text color is the item's rarity. Hover or tap any item to see it the way the game does. Nothing is ever hidden in town.</p>
    <div class="test-form">
      <label>Filter level<select data-rp="fl">${names.map((n, i) => `<option value="${i}"${i === +r.fl ? ' selected' : ''}>FL${i}: ${esc(n)}</option>`).join('')}</select></label>
      <label>Show<select data-rp="mode">
        <option value="all"${r.mode === 'all' ? ' selected' : ''}>Everything</option>
        <option value="new"${r.mode === 'new' ? ' selected' : ''}>Only what changes from the level below</option>
        <option value="mine"${r.mode === 'mine' ? ' selected' : ''}>Only what I changed from Roofoo's filter</option>
      </select></label>
      <label>Character level<input type="number" min="1" max="99" value="${esc(r.clvl)}" data-rp="clvl"></label>
      <label>Difficulty<select data-rp="diff">${['Normal', 'Nightmare', 'Hell'].map((d, i) => `<option value="${i}"${i === +r.diff ? ' selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>Search<input type="search" value="${esc(r.q)}" placeholder="Filter the list…" data-rp="q"></label>
    </div>
    <p class="hint" style="margin-top:-4px">Items are checked as unidentified drops. Superior items are checked with their best roll (15% enhanced defense or damage).</p>
    <div id="report-out"><div class="card empty-state">Working it out…</div></div>`;
  drawReport();
}

async function drawReport() {
  const r = S.report;
  const token = (S.reportToken = (S.reportToken || 0) + 1);
  const outEl = () => document.getElementById('report-out');
  const progress = p => { if (token === S.reportToken && outEl()) outEl().innerHTML = `<div class="card empty-state">Checking every item… ${Math.round(p * 100)}%<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div></div>`; };
  const fl = +r.fl;
  const cur = await getReport('mine', fl, progress);
  let cmp = null;
  if (r.mode === 'new') cmp = fl > 0 ? await getReport('mine', fl - 1, progress) : null;
  if (r.mode === 'mine') cmp = await getReport('roofoo', fl, progress);
  if (token !== S.reportToken || !outEl()) return; // settings changed while working

  const q = r.q.trim().toLowerCase();
  const groups = new Map();
  let nHidden = 0, nShown = 0;
  for (const row of reportRows()) {
    if (q && !row.name.toLowerCase().includes(q) && !(row.uniq || []).concat(row.sets || []).some(n => n.toLowerCase().includes(q))) continue;
    let cells = cur.get(row.key) || [];
    if (cmp) {
      const before = new Map((cmp.get(row.key) || []).map(c => [cellKey(c), c.hidden]));
      cells = cells.filter(c => before.get(cellKey(c)) !== c.hidden);
    }
    if (!cells.length) continue;
    const chips = makeChips(row, cells);
    const hid = chips.filter(c => c.hidden), shown = chips.filter(c => !c.hidden);
    if (hid.length) nHidden++;
    if (shown.length) nShown++;
    if (!groups.has(row.group)) groups.set(row.group, { hidden: [], shown: [] });
    const g = groups.get(row.group);
    if (hid.length) g.hidden.push({ row, chips: hid });
    if (shown.length) g.shown.push({ row, chips: shown });
  }

  const names = S.base.levelNames;
  const flName = `FL${fl} ${esc(names[fl] || '')}`;
  const intro = r.mode === 'all'
    ? `On <b>${flName}</b>: <b class="t-hid">${nHidden}</b> kinds of drops have something hidden and <b class="t-shown">${nShown}</b> have something shown.`
    : r.mode === 'new'
      ? (fl === 0 ? 'FL0 is the first level, so there is nothing below to compare with.' : `Going from <b>FL${fl - 1}</b> to <b>${flName}</b>: <b class="t-hid">${nHidden}</b> kinds of drops start hiding and <b class="t-shown">${nShown}</b> start showing.`)
      : `Compared with Roofoo's filter on <b>${flName}</b>: your choices hide <b class="t-hid">${nHidden}</b> and show <b class="t-shown">${nShown}</b> kinds of drops.`;
  const goldLine = cur.gold && r.mode === 'all' ? `<p class="hint">Gold piles of ${cur.gold.toLocaleString()} or less are hidden.</p>` : '';

  const itemHTML = ({ row, chips }) => {
    const color = row.versions[0] === 'ITEM' ? row.color : '#e6e0d4';
    const single = row.versions[0] === 'ITEM';
    const chipHTML = chips.map(ch => {
      const [name, ...notes] = chipLabel(row, ch);
      const col = row.versions[0] === 'ITEM' ? row.color : RARITY[ch.v];
      const o = ch.cell.opts;
      const spec = { code: row.code, quality: o.quality, eth: o.eth, sockets: o.sockets, ed: o.ed, ilvl: o.ilvl,
        names: ch.v === 'UNI' ? row.uniq : ch.v === 'SET' ? row.sets : undefined,
        ilvlText: ch.dim === 'ilvl' ? rangeText(ch).replace('ilvl ', '') : undefined,
        verdict: { fl, clvl: +r.clvl, diff: +r.diff } };
      return `<button type="button" class="rp-chip ${ch.hidden ? 'hid' : 'shown'}" ${itemAttr(spec)} style="color:${col}">${esc(name)}${notes.length ? `<em>${esc(notes.join(' · '))}</em>` : ''}</button>`;
    }).join('');
    if (single) return `<div class="rp-item">${iconSVG(iconFor(row), row.color)}<div class="rp-vers">${chipHTML}</div></div>`;
    return `<div class="rp-item">${iconSVG(iconFor(row), color)}<div><div class="rp-name">${esc(row.name)}${row.tier ? `<span class="tier-tag t-${row.tier}">${TIER_LABEL[row.tier]}</span>` : ''}${row.note ? `<small>${esc(row.note)}</small>` : ''}</div>
      <div class="rp-vers">${chipHTML}</div></div></div>`;
  };
  const col = (list, kind) => `<div class="rp-col ${kind}"><h4>${kind === 'hid' ? 'Hidden' : 'Shown'} <span>${list.length}</span></h4>${list.length ? list.map(itemHTML).join('') : `<p class="hint">${kind === 'hid' ? 'Nothing hidden.' : 'Nothing shown.'}</p>`}</div>`;

  let html = `<p class="rp-intro">${intro}</p>${goldLine}
    <div class="row" style="margin:6px 0 14px"><button class="btn small" data-act="rp-open">Open all</button><button class="btn small ghost" data-act="rp-close">Close all</button>
    <button class="btn small ghost" data-act="rp-copy">Copy as text</button></div>`;
  if (!groups.size) html += `<div class="card empty-state">${r.mode === 'all' ? 'No items match.' : 'No differences.'}</div>`;
  for (const [g, lists] of groups) {
    html += `<details class="card rp-group"${S.reportOpen && S.reportOpen.has(g) ? ' open' : ''} data-group="${esc(g)}">
      <summary><b>${esc(g)}</b><span class="rp-counts"><span class="c-hid">${lists.hidden.length} hidden</span><span class="c-shown">${lists.shown.length} shown</span></span></summary>
      <div class="rp-cols">${col(lists.hidden, 'hid')}${col(lists.shown, 'shown')}</div></details>`;
  }
  outEl().innerHTML = html;

  S.reportText = () => {
    const lines = [`Roofoo filter on FL${fl} (${names[fl] || ''}), character level ${r.clvl}. Hidden = no label on the ground outside town.`, ''];
    if (cur.gold && r.mode === 'all') lines.push(`Gold piles of ${cur.gold} or less are hidden`, '');
    for (const [g, lists] of groups) {
      lines.push(`== ${g} ==`);
      for (const [label, list] of [['Hidden', lists.hidden], ['Shown', lists.shown]]) {
        if (!list.length) continue;
        lines.push(`  ${label}:`);
        for (const { row, chips } of list) {
          const parts = chips.map(ch => chipLabel(row, ch).join(', '));
          lines.push(row.versions[0] === 'ITEM' ? `  - ${row.name}` : `  - ${row.name}${row.tier ? ' (' + TIER_LABEL[row.tier] + ')' : ''}: ${parts.join('; ')}`);
        }
      }
      lines.push('');
    }
    return lines.join('\n');
  };
}

// ---- in-game style tooltip

function statLines(code, o) {
  const it = S.game.items[code] || {};
  const s = it.s || {};
  const lines = [];
  const ed = o.quality === 'SUP' ? 1 + (o.ed || 15) / 100 : 1;
  const eth = o.eth ? 1.5 : 1;
  const mul = v => Math.floor(v * ed * eth);
  if (it.k === 'armor' && s.maxac) lines.push(['WHITE', `Defense: ${mul(s.minac)}${s.maxac !== s.minac ? '–' + mul(s.maxac) : ''}`]);
  if (s.block) lines.push(['WHITE', `Chance to Block: ${s.block}%`]);
  if (it.k === 'weapon') {
    if (s.mindam && !s.twohand) lines.push(['WHITE', `One-Hand Damage: ${mul(s.mindam)} to ${mul(s.maxdam)}`]);
    if (s['2handmindam']) lines.push(['WHITE', `Two-Hand Damage: ${mul(s['2handmindam'])} to ${mul(s['2handmaxdam'])}`]);
    if (s.minmisdam) lines.push(['WHITE', `Throw Damage: ${mul(s.minmisdam)} to ${mul(s.maxmisdam)}`]);
  }
  if (s.durability) { const d = o.eth ? Math.floor(s.durability / 2) + 1 : s.durability; lines.push(['WHITE', `Durability: ${d} of ${d}`]); }
  if (s.reqdex) lines.push(['WHITE', `Required Dexterity: ${Math.max(0, s.reqdex - (o.eth ? 10 : 0))}`]);
  if (s.reqstr) lines.push(['WHITE', `Required Strength: ${Math.max(0, s.reqstr - (o.eth ? 10 : 0))}`]);
  if (s.levelreq && (o.quality === 'NMAG' || o.quality === 'SUP')) lines.push(['WHITE', `Required Level: ${s.levelreq}`]);
  if (o.quality === 'SUP') lines.push(['BLUE', `+${o.ed || 15}% Enhanced ${it.k === 'weapon' ? 'Damage' : 'Defense'}`]);
  const tags = [];
  if (o.eth) tags.push('Ethereal (Cannot be Repaired)');
  if (o.sockets) tags.push(`Socketed (${o.sockets})`);
  if (tags.length) lines.push(['BLUE', tags.join(', ')]);
  return lines;
}

// ---- item cards (hover or tap any item anywhere on the site)
// Put itemAttr({...}) on any element that stands for an item:
//   code, quality ('NMAG'|'SUP'|'MAG'|'RARE'|'UNI'|'SET'|'CRAFT'), eth, sockets, ed, ilvl, identified,
//   names (possible uniques/sets), ilvlText, verdict ({ fl, clvl, diff } adds the HIDDEN/SHOWN stamp)
function itemAttr(spec) {
  return `data-item="${esc(JSON.stringify(spec))}" tabindex="0"`;
}

// Possible unique / set names for a base, for the "Could be:" line
function namesFor(code, quality) {
  const list = quality === 'UNI' ? S.game.uniques : quality === 'SET' ? S.game.sets : null;
  return list ? list.filter(u => u.c === code).map(u => u.n) : undefined;
}

function itemCardHTML(spec) {
  const code = spec.code;
  const it = S.game.items[code] || { n: code, f: [] };
  const q = spec.quality || 'NMAG';
  const magicQ = ['MAG', 'RARE', 'UNI', 'SET', 'CRAFT'].includes(q);
  const o = { code, quality: q, eth: !!spec.eth, sockets: +spec.sockets || 0, ed: +spec.ed || 0, ilvl: spec.ilvl || 85 };
  const sim = finalSim();
  const rarity = it.k === 'misc' && !magicQ ? (TEXT_COLORS[it.nc] || '#f0f0f0') : (RARITY[q === 'NMAG' ? 'WHITE' : q] || '#f0f0f0');
  const icon = code === 'rin' ? 'ring' : code === 'amu' ? 'amulet' : (GROUP_ICON[reportGroup(code, it)] || 'item');
  const seg = (color, text, cls = '') => `<div class="${cls}" style="color:${TEXT_COLORS[color] || color}">${esc(text)}</div>`;
  const baseLine = () => (it.tn || it.tier) ? seg('GRAY', [it.tier ? TIER_LABEL[it.tier] : '', it.tn || ''].filter(Boolean).join(' ')) : '';
  // The card always shows the item as it reads once identified. Whether it shows on the ground is
  // worked out separately below, as the unidentified drop it really is.
  const heldName = uniqueName => {
    // price is unknown until the item is rolled, so leave Roofoo's sell-price tag out (NaN = not applicable)
    const held = sim.evaluate(E.makeItem(S.game, { ...o, identified: true, uniqueName, where: 'inventory', price: NaN }));
    return labelHTML(held.hidden ? `%WHITE%${uniqueName || it.n}` : held.name);
  };
  let html = `<div class="tt-head">${iconSVG(icon, rarity)}</div>`;

  if (q === 'UNI' || q === 'SET') {
    const list = q === 'UNI' ? S.game.uniques : S.game.sets;
    const all = list.filter(u => u.c === code);
    const wanted = spec.names && spec.names.length ? all.filter(u => spec.names.includes(u.n)) : all;
    const shown = (wanted.length ? wanted : all).slice(0, spec.names && spec.names.length === 1 ? 1 : 2);
    const color = q === 'UNI' ? 'GOLD' : 'GREEN';
    shown.forEach((u, i) => {
      if (i) html += '<div class="tt-sep"></div>';
      html += `<div class="tt-name">${heldName(u.n)}</div>`;
      html += seg(color, it.n);
      if (u.s) html += seg('GRAY', u.s, 'tt-small');
      for (const [c, t] of statLines(code, { ...o, quality: q })) html += seg(c, t.replace(/^(Defense|One-Hand Damage|Two-Hand Damage|Throw Damage):/, 'Base $1:'));
      if (u.rl) html += seg('WHITE', `Required Level: ${u.rl}`);
      for (const p of u.p || []) html += seg('BLUE', p);
      for (const p of u.sb || []) html += seg('GREEN', p);
    });
    const more = (wanted.length ? wanted : all).length - shown.length;
    if (more > 0) html += `<div class="tt-could">…and ${more} other ${q === 'UNI' ? 'unique' : 'set'} item${more === 1 ? '' : 's'} on this base: ${esc((wanted.length ? wanted : all).slice(shown.length).map(u => u.n).join(', '))}</div>`;
  } else {
    html += `<div class="tt-name">${heldName()}</div>`;
    if (magicQ) html += seg(q === 'RARE' ? 'YELLOW' : q === 'CRAFT' ? 'ORANGE' : 'BLUE', it.n);
    html += baseLine();
    for (const [c, t] of statLines(code, o)) html += seg(c, t);
    if (q === 'MAG' || q === 'RARE' || q === 'CRAFT') html += seg('BLUE', q === 'MAG' ? '+ 1–2 random magic properties' : q === 'RARE' ? '+ 3–6 random magic properties' : '+ crafted properties');
  }
  if (spec.ilvlText) html += seg('GRAY', `Item Level: ${spec.ilvlText}`);
  if (spec.verdict) {
    const v = spec.verdict;
    const ground = sim.evaluate(E.makeItem(S.game, { ...o, identified: false, filtlvl: v.fl, clvl: v.clvl, diff: v.diff, where: 'ground' }));
    const myst = !ground.hidden && sim.mystery ? sim.mystery.get(ground.ruleLine) : null;
    html += `<div class="tt-verdict ${ground.hidden ? 'hid' : 'shown'}">${ground.hidden ? 'Hidden' : 'Shown'}</div>`;
    if (myst) html += `<div class="tt-myst">as a mystery drop: <b>${esc(myst)}</b><br>its real name shows in town</div>`;
    html += `<div class="tt-where">on the ground at FL${v.fl}${magicQ ? ', as an unidentified drop' : ''}${!ground.hidden && ground.sound ? ` · 🔊 ${esc(soundLabel(ground.sound))}` : ''}</div>`;
  }
  return html;
}

let tipFor = null;
function showTip(el) {
  const tip = document.getElementById('tip');
  let spec;
  try { spec = JSON.parse(el.dataset.item); } catch { return; }
  if (!spec || !spec.code || !S.game || !S.game.items[spec.code] || !S.baseText) return;
  tipFor = el;
  tip.innerHTML = itemCardHTML(spec);
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width / 2 - tw / 2;
  x = Math.max(8, Math.min(x, innerWidth - tw - 8));
  let y = r.bottom + 8;
  if (y + th > innerHeight - 8) y = Math.max(8, r.top - th - 8);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTip() { const t = document.getElementById('tip'); if (t) t.hidden = true; tipFor = null; }

function wireItemCards() {
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-item]'); if (el && el !== tipFor) showTip(el); });
  document.addEventListener('mouseout', e => { const el = e.target.closest('[data-item]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', e => { const el = e.target.closest('[data-item]'); if (el) showTip(el); });
  document.addEventListener('focusout', e => { if (e.target.closest('[data-item]')) hideTip(); });
  // Phones: tapping an item shows its card, tapping anywhere else hides it
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-item]');
    // ignore items that just disappeared (e.g. a search result that was picked)
    if (el && el.isConnected && el.offsetParent !== null) showTip(el); else hideTip();
  });
  window.addEventListener('scroll', hideTip, { passive: true });
}

function onReportEvent(ev) {
  const rp = ev.target.closest('[data-rp]');
  if (rp && (ev.type === 'change' || (ev.type === 'input' && rp.dataset.rp === 'q'))) {
    S.report[rp.dataset.rp] = rp.value;
    hideTip();
    if (rp.dataset.rp === 'q') { clearTimeout(S.rpTimer); S.rpTimer = setTimeout(drawReport, 150); return; }
    return drawReport();
  }
  const t = ev.target.closest('[data-act]');
  if (t && ev.type === 'click') {
    const all = panel('report').querySelectorAll('details[data-group]');
    if (t.dataset.act === 'rp-open') all.forEach(d => { d.open = true; });
    if (t.dataset.act === 'rp-close') all.forEach(d => { d.open = false; });
    if (t.dataset.act === 'rp-copy' && S.reportText) copy(S.reportText(), 'List copied.');
  }
}

// ---------------------------------------------------------------- tab: save & install

// Custom downloads drop the PD2 Trader market prices, which only keep updating in the launcher version.
function priceNoticeHTML() {
  const slam = S.baseFile === 'RoofooSlamfestBETA.filter';
  return `<div class="notice price-note"><b>Live market prices are not included.</b> Rune values, Rainbow Facet values and slam suggestions${slam ? " (including Slamfest's whole FL9 slam mode)" : ''} update every 6 hours only in the <b>launcher version</b> of Roofoo's filter, so they're removed from custom versions instead of going out of date. Want them? Pick Roofoo's filter from the PD2 launcher's online filter list instead.</div>`;
}

function renderSave() {
  const b = built();
  const r = b.report;
  const c = counts();
  const base = BASES.find(x => x.file === S.baseFile);
  const items = [];
  if (S.profile.theme !== 'classic') items.push(`Color theme: <b>${esc(E.presetById(S.profile.theme).label)}</b>`);
  if (S.profile.soundPack !== 'classic') items.push(`Sound pack: <b>${esc(E.soundPackById(S.profile.soundPack).label)}</b>`);
  const custom = TEXT_SLOTS.filter(sl => S.profile.slots[sl.id]).map(sl => sl.label);
  if (custom.length) items.push(`Your own tweaks to: ${esc(custom.join(', '))}`);
  const markers = MARKER_SLOTS.filter(m => m.id in S.profile.markers).map(m => m.label);
  if (markers.length) items.push(`Minimap markers changed: ${esc(markers.join(', '))}`);
  if (c.tiers) items.push(`<b>${c.tiers}</b> star tier / mystery ${c.tiers === 1 ? 'change' : 'changes'}`);
  if (isMysteryBase()) items.push('Mystery drops: <b>on</b>');
  if (c.rules) items.push(`<b>${c.rules}</b> ${c.rules === 1 ? 'item' : 'items'} with show/hide or sound changes`);
  panel('save').innerHTML = `
    <h2>Save &amp; install</h2>
    <div class="save-grid">
      <div class="card save-box">
        <h3>1. Download your filter</h3>
        ${items.length ? `<ul class="changes">${items.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="hint">No changes yet. You\'ll get Roofoo\'s filter as it is, minus the live market prices (see below).</p>'}
        ${priceNoticeHTML()}
        <div class="row"><input type="text" id="out-name" value="${esc(S.outName || base.out)}" aria-label="File name" style="flex:1;min-width:180px">
          <button class="btn primary" data-act="download">Download</button></div>
        <h3>2. Install it</h3>
        <ol class="steps">
          <li>Move the file into your PD2 filter folder:<br><span class="path">Diablo II\\ProjectD2\\filters\\local\\</span><br><span class="hint">Usually <span class="path">C:\\Program Files (x86)\\Diablo II\\ProjectD2\\filters\\local\\</span></span></li>
          <li>Open the PD2 launcher, go to the loot filter settings, choose <b>Local</b> and select <b>${esc((S.outName || base.out).replace(/\.filter$/, ''))}</b>.</li>
          <li>In game, pick your filter level like you normally do. The Horadric Cube tooltip shows which level is active.</li>
        </ol>
        <h3>3. Staying up to date</h3>
        <p class="hint" style="margin:0">This builder always starts from Roofoo's newest filter on GitHub. Your choices are saved in this browser, so when Roofoo updates, come back and download again.</p>
      </div>
      <div class="card save-box">
        <h3>Share your setup</h3>
        <p class="hint" style="margin:0">A link that opens this builder with all your choices. Great for sharing with friends or moving to another computer.</p>
        <div class="row"><button class="btn" data-act="share">Copy share link</button><button class="btn ghost" data-act="copy-code">Copy setup code</button></div>
        <h3>Load a setup</h3>
        <p class="hint" style="margin:0">Paste a setup code, or pick a filter file you made here before.</p>
        <textarea id="import-code" placeholder="Paste a setup code…" aria-label="Setup code"></textarea>
        <div class="row"><button class="btn" data-act="import">Load code</button>
          <label class="btn ghost">Load a filter file<input type="file" accept=".filter,.txt" id="import-file" hidden></label></div>
        <h3>Start over</h3>
        <div class="row"><button class="btn danger" data-act="reset">Reset everything to Roofoo's filter</button></div>
      </div>
    </div>
    ${r.missing.length ? `<div class="notice">Heads up: this filter version is missing some styles the builder knows (${esc(r.missing.join(', '))}). Everything else still works.</div>` : ''}`;
  panel('save').querySelector('#out-name').addEventListener('input', e => { S.outName = e.target.value; });
  panel('save').querySelector('#import-file').addEventListener('change', importFile);
}

async function download() {
  S.memo.code = await profileCode();
  S.memo.builtKey = null; // rebuild with the setup code in the header
  const b = built();
  const base = BASES.find(x => x.file === S.baseFile);
  let name = (S.outName || base.out).trim() || base.out;
  if (!/\.filter$/i.test(name)) name += '.filter';
  const blob = new Blob([b.text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(`Downloaded ${name}. Put it in ProjectD2\\filters\\local.`);
}

async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { prompt('Copy this:', text); }
}

async function applyImported(p) {
  if (!p || typeof p !== 'object') throw new Error('bad');
  const base = p.base && BASES.some(b => b.file === p.base) ? p.base : S.baseFile;
  delete p.base;
  S.profile = { ...blankProfile(), ...p };
  migrateRules(S.profile);
  if (base !== S.baseFile) await loadBase(base); else changed();
  persist();
}

async function importFile(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const text = await file.text();
  const m = /BUILDER-PROFILE:\s*(\S+)/.exec(text);
  if (!m) return toast("That file wasn't made with this builder, so there's nothing to load.");
  try { await applyImported(await E.decodeProfile(m[1])); toast('Loaded your setup from the filter file.'); } catch { toast("Couldn't read the setup in that file."); }
}

async function onSaveEvent(ev) {
  const t = ev.target.closest('[data-act]');
  if (!t || ev.type !== 'click') return;
  const act = t.dataset.act;
  if (act === 'download') return download();
  if (act === 'share') return copy(`${location.origin}${location.pathname}#p=${await profileCode()}`, 'Share link copied.');
  if (act === 'copy-code') return copy(await profileCode(), 'Setup code copied.');
  if (act === 'import') {
    const code = $('#import-code').value.trim().replace(/^.*#p=/, '');
    try { await applyImported(await E.decodeProfile(code)); toast('Setup loaded.'); } catch { toast("That code doesn't look right. Check you copied all of it."); }
  }
  if (act === 'reset') {
    if (!confirm('Reset all your choices back to Roofoo\'s filter?')) return;
    S.profile = blankProfile();
    changed();
    toast('Everything is back to Roofoo\'s filter.');
  }
}

// ---------------------------------------------------------------- tabs & boot

function render() {
  hideTip();
  if (!S.base) return;
  ({ look: renderLook, items: renderItems, test: renderTest, report: renderReport, save: renderSave })[S.tab]();
}

function setTab(tab) {
  S.tab = tab;
  for (const b of document.querySelectorAll('#tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const p of document.querySelectorAll('.panel')) p.hidden = p.id !== 'panel-' + tab;
  render();
  window.scrollTo({ top: 0 });
}

async function fetchFilter(file) {
  const sources = [];
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) sources.push(`../${file}`);
  sources.push(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${file}`);
  let lastErr;
  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) return { text: await res.text(), url };
      lastErr = new Error(res.status + ' ' + url);
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function loadBase(file) {
  const status = $('#status');
  status.className = 'wrap status';
  status.textContent = `Loading ${file} from GitHub…`;
  $('#download-top').disabled = true;
  try {
    const { text, url } = await fetchFilter(file);
    S.baseFile = file;
    S.baseText = text;
    const { lines } = E.splitLines(text);
    const sim = new E.Simulator(text);
    S.base = { lines, slots: E.findSlots(lines), tiers: E.readTiers(lines), mystery: E.readMystery(lines), levelNames: sim.levelNames, markerCounts: E.findMarkers(lines) };
    S.memo = {};
    $('#base-select').value = file;
    status.innerHTML = `Using the latest <b>${esc(file)}</b> ${url.startsWith('http') ? 'from GitHub' : '(local copy)'}<span id="base-date"></span>. Your choices are saved in this browser. Custom versions leave out the live market prices, which only work in the launcher version.`;
    $('#download-top').disabled = false;
    persist();
    updateTabCounts();
    render();
    fetch(`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(file)}&per_page=1`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j || !j[0]) return;
        const d = new Date(j[0].commit.committer.date);
        S.baseDate = d.toISOString().slice(0, 10);
        const el = document.getElementById('base-date');
        if (el) el.textContent = `, updated ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
      }).catch(() => {});
  } catch (e) {
    status.className = 'wrap status error';
    status.textContent = `Couldn't load ${file} from GitHub. Check your connection and refresh the page. (${e.message})`;
  }
}

// Opens a pre-filled GitHub issue with what we need to reproduce the problem
async function reportBug() {
  const tab = (document.querySelector('#tabs [aria-selected="true"]') || {}).textContent || S.tab;
  let code = '';
  try { code = await profileCode(); } catch { /* no setup yet */ }
  const setup = code && code.length < 3500 ? code : '(too long for the link: copy it from Save & install and paste it here)';
  const body = [
    '**What happened?**', '', '', '**What did you expect to happen?**', '', '', '**Steps to reproduce**', '1. ', '',
    '---', '_Builder details (please keep these, they help us reproduce it):_',
    `- Tab: ${tab.replace(/^\d+/, '').trim()}`,
    `- Filter: ${S.baseFile}${S.baseDate ? ' (updated ' + S.baseDate + ')' : ''}`,
    `- Browser: ${navigator.userAgent}`,
    `- Setup code: \`${setup}\``,
  ].join('\n');
  const url = `https://github.com/${REPO}/issues/new?labels=bug&title=${encodeURIComponent('Filter Builder: ')}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener');
}

async function boot() {
  const sel = $('#base-select');
  sel.innerHTML = BASES.map(b => `<option value="${b.file}">${esc(b.label)}</option>`).join('');
  sel.addEventListener('change', () => loadBase(sel.value));
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  $('#download-top').addEventListener('click', download);
  for (const id of ['#report-bug', '#report-bug-footer']) $(id).addEventListener('click', e => { e.preventDefault(); reportBug(); });

  const look = panel('look');
  for (const type of ['click', 'change', 'input']) look.addEventListener(type, onLookEvent);
  look.addEventListener('toggle', e => {
    const d = e.target.closest('details[data-details]');
    if (d) { if (d.open) S.open.add(d.dataset.details); else S.open.delete(d.dataset.details); }
  }, true);
  const items = panel('items');
  for (const type of ['click', 'change', 'input']) items.addEventListener(type, onItemsEvent);
  // open / close sections and groups: remember them, and fill their rows the first time they open
  items.addEventListener('toggle', e => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    const id = d.dataset.sec || d.dataset.grp;
    if (!id) return;
    if (d.open) S.itemsUI.open.add(id); else S.itemsUI.open.delete(id);
    fillDetails(d);
  }, true);
  const test = panel('test');
  for (const type of ['click', 'change', 'input']) test.addEventListener(type, onTestEvent);
  const report = panel('report');
  for (const type of ['click', 'change', 'input']) report.addEventListener(type, onReportEvent);
  wireItemCards();
  // Mystery drops on/off switch (Colors & sounds and Stars & mystery tabs)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act="mystery-on"], [data-act="mystery-off"]');
    if (!b) return;
    loadBase(b.dataset.act === 'mystery-on' ? 'RoofooMystery.filter' : 'Roofoo.filter')
      .then(() => toast(b.dataset.act === 'mystery-on' ? 'Mystery drops are on.' : 'Mystery drops are off.'));
  });
  report.addEventListener('toggle', e => {
    const d = e.target.closest && e.target.closest('details[data-group]');
    if (!d) return;
    S.reportOpen = S.reportOpen || new Set();
    if (d.open) S.reportOpen.add(d.dataset.group); else S.reportOpen.delete(d.dataset.group);
  }, true);
  panel('save').addEventListener('click', onSaveEvent);

  const saved = store(true);
  if (saved && saved.profile) { S.profile = { ...blankProfile(), ...saved.profile }; S.baseFile = saved.baseFile || S.baseFile; }

  try {
    const res = await fetch('data/game.json');
    S.game = await res.json();
  } catch {
    $('#status').className = 'wrap status error';
    $('#status').textContent = "Couldn't load the item data. Refresh the page to try again.";
    return;
  }
  S.catalog = buildCatalog();
  migrateRules(S.profile);

  const hash = /[#&]p=([\w-]+)/.exec(location.hash);
  if (hash) {
    try {
      const p = await E.decodeProfile(hash[1]);
      if (p.base && BASES.some(b => b.file === p.base)) S.baseFile = p.base;
      delete p.base;
      S.profile = { ...blankProfile(), ...p };
      migrateRules(S.profile);
      history.replaceState(null, '', location.pathname);
      setTimeout(() => toast('Loaded a shared setup.'), 400);
    } catch { toast("That share link didn't work."); }
  }
  await loadBase(S.baseFile);
}

boot();
