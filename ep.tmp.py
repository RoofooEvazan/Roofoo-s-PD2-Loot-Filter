p='docs/js/engine.js'; s=open(p,encoding='utf-8').read()
def rep(a,b):
    global s
    assert a in s, a[:60]; s=s.replace(a,b,1)
rep("""export function buildFilter(baseText, profile, game, meta = {}) {
  const { lines, eol } = splitLines(baseText);
  const report = { tiers: 0, slots: [], missing: [], markers: 0, rules: 0, soundLinesAdded: 0 };
""", """export const PRICE_NOTE = 'Live market prices (rune values, Rainbow Facet values and slam suggestions) only work in the launcher version of Roofoo\'s filter.';

// Custom filters don't get the 6-hourly PD2 Trader updates, so their market prices would go stale.
// Remove every "BEGIN AUTO PD2TRADER ... END AUTO PD2TRADER" block and leave a note in its place.
export function stripPriceBlocks(lines) {
  const out = [];
  let inBlock = false, removed = 0, blocks = 0;
  for (const line of lines) {
    if (/^\/\/ BEGIN AUTO PD2TRADER\b/.test(line)) {
      inBlock = true;
      blocks++;
      out.push(`// ${line.slice(3).replace('BEGIN AUTO', 'REMOVED AUTO')}: ${PRICE_NOTE}`);
      continue;
    }
    if (inBlock) {
      removed++;
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
  return { lines: out, blocks, removed };
}

export function buildFilter(baseText, profile, game, meta = {}) {
  let { lines, eol } = splitLines(baseText);
  const report = { tiers: 0, slots: [], missing: [], markers: 0, rules: 0, soundLinesAdded: 0, priceBlocks: 0 };
  if (meta.stripPrices !== false) {
    const stripped = stripPriceBlocks(lines);
    lines = stripped.lines;
    report.priceBlocks = stripped.blocks;
  }
""")
rep("""    `//\tBUILDER-PROFILE: ${meta.profileCode || ''}`,
    '//',""", """    `//\tBUILDER-PROFILE: ${meta.profileCode || ''}`,
    ...(report.priceBlocks ? [`//\tNOTE: ${PRICE_NOTE} They were removed from this custom version.`] : []),
    '//',""")
open(p,'w',encoding='utf-8').write(s)
