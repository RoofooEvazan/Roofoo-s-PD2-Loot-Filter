import { readFile, writeFile } from 'node:fs/promises';

const ITEMS_URL = 'https://raw.githubusercontent.com/errolgr/pd2-trade/main/src/assets/items.ts';
const MARKET_API_URL = 'https://api.projectdiablo2.com/market/listing';
const START_MARKER = '// BEGIN AUTO PD2TRADER BIS SLAMS';
const END_MARKER = '// END AUTO PD2TRADER BIS SLAMS';

const filterFile = process.env.FILTER_FILE || 'Roofoo.filter';
const isLadder = process.env.PD2TRADER_LADDER !== 'false';
const isHardcore = process.env.PD2TRADER_HARDCORE === 'true';
const hours = Number(process.env.PD2TRADER_BIS_HOURS || process.env.PD2TRADER_HOURS || 48);
const minSampleCount = Number(process.env.PD2TRADER_BIS_MIN_SAMPLES || 2);
const minMedianPrice = Number(process.env.PD2TRADER_BIS_MIN_MEDIAN || 0);
const concurrency = Number(process.env.PD2TRADER_BIS_CONCURRENCY || 8);
const marketPageLimit = Number(process.env.PD2TRADER_BIS_MARKET_PAGE_LIMIT || 200);
const maxMarketListingsPerItem = Number(process.env.PD2TRADER_BIS_MAX_LISTINGS || 800);
const excludedUniqueSlamBaseCodes = new Set(['cm1', 'cm2', 'cm3', 'cm1p', 'cm2p', 'cm3p', 'jew']);
const cosmeticCorruptionCodes = new Set(['transform_dye']);
const resistanceCodes = new Set(['coldresist', 'fireresist', 'lightresist', 'poisonresist']);
const maxResistanceCodes = new Set(['maxcoldresist', 'maxfireresist', 'maxlightresist', 'maxpoisonresist']);
const maxResistancePairCodes = new Map([
  ['maxcoldresist', 'coldresist'],
  ['maxfireresist', 'fireresist'],
  ['maxlightresist', 'lightresist'],
  ['maxpoisonresist', 'poisonresist'],
]);
const corruptionDisplayNames = new Map([
  ['all_resist', 'All Res'],
  ['coldresist', 'C Res'],
  ['curse_resistance', 'Curse Res'],
  ['damageresist', 'PDR%'],
  ['dexterity', 'Dex'],
  ['dmg%', 'ED'],
  ['energy', 'Energy'],
  ['fireresist', 'F Res'],
  ['hpregen', 'Rep Life'],
  ['item_allskills', '+Skills'],
  ['item_armor_percent', 'E-Def'],
  ['item_cannotbefrozen', 'CBF'],
  ['item_crushingblow', 'CB'],
  ['item_deadlystrike', 'DS'],
  ['item_demon_tohit', 'Demon AR'],
  ['item_demondamage_percent', 'Demon Dmg'],
  ['item_fasterattackrate', 'IAS'],
  ['item_fasterblockrate', 'FBR'],
  ['item_fastercastrate', 'FCR'],
  ['item_fastergethitrate', 'FHR'],
  ['item_fastermovevelocity', 'FRW'],
  ['item_fractionaltargetac', 'Target Def'],
  ['item_goldbonus', 'GF'],
  ['item_healafterkill', 'LAEK'],
  ['item_ignoretargetac', 'ITD'],
  ['item_magicbonus', 'MF'],
  ['item_manaafterkill', 'MAEK'],
  ['item_maxhp_percent', 'Max Life'],
  ['item_pierce', 'Pierce'],
  ['item_thorns_perlevel', 'Thorns'],
  ['item_undead_tohit', 'Undead AR'],
  ['item_undeaddamage_percent', 'Undead Dmg'],
  ['lifedrainmindam', 'LL'],
  ['lightresist', 'L Res'],
  ['magic_damage_reduction', 'MDR'],
  ['manadrainmindam', 'ML'],
  ['max_all_resist', 'Max All Res'],
  ['maxcoldresist', 'Max C Res'],
  ['maxdamage_percent', 'ED'],
  ['maxfireresist', 'Max F Res'],
  ['maxhp', 'Life'],
  ['maxlightresist', 'Max L Res'],
  ['maxmana', 'Mana'],
  ['maxpoisonresist', 'Max P Res'],
  ['passive_cold_mastery', 'C Skill Dmg'],
  ['passive_cold_pierce', '-Enemy C Res'],
  ['passive_fire_mastery', 'F Skill Dmg'],
  ['passive_fire_pierce', '-Enemy F Res'],
  ['passive_ltng_mastery', 'L Skill Dmg'],
  ['passive_ltng_pierce', '-Enemy L Res'],
  ['passive_pois_mastery', 'P Skill Dmg'],
  ['passive_pois_pierce', '-Enemy P Res'],
  ['poisonresist', 'P Res'],
  ['strength', 'Str'],
  ['toblock', 'ICB'],
  ['tohit', 'AR'],
  ['vitality', 'Vit'],
]);

const manualSafeItems = [
  { name: 'Giant Maimer', base_code: '7vo', quality: 'UNI' },
  { name: 'Skyfall', base_code: 'obe', quality: 'UNI' },
];

function isExcludedFromSlamNotes(item) {
  return item.quality === 'UNI' && excludedUniqueSlamBaseCodes.has(String(item.base_code).toLowerCase());
}

function cleanDisplayText(text) {
  const seen = new Set();

  const parts = String(text)
    .split(',')
    .map((part) => cleanCorruptionPart(part))
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  const maxResParts = new Set(['Max C Res', 'Max F Res', 'Max L Res', 'Max P Res']);
  if ([...maxResParts].every((part) => parts.includes(part))) {
    return ['Max All Res', ...parts.filter((part) => !maxResParts.has(part))].join(', ');
  }

  return parts.join(', ');
}

function cleanCorruptionPart(text) {
  const part = String(text).trim();

  if (/^to All Skills$/i.test(part)) {
    return '+Skills';
  }

  if (/^Numsockets$/i.test(part)) {
    return 'Sockets';
  }

  if (/^(Dmg%|Maxdamage Percent|ED|Max Damage)$/i.test(part)) {
    return 'ED';
  }

  if (/^Physical Damage Taken Reduced by\s*%?$/i.test(part)) {
    return 'PDR%';
  }

  if (/^Physical Damage Taken Reduced by\s+\d+(?:\.\d+)?%$/i.test(part)) {
    return 'PDR%';
  }

  const maxResMatch = part.match(/^(?:to\s+)?Maximum\s+(Cold|Fire|Lightning|Poison)\s+Resist(?:ance)?$/i);
  if (maxResMatch) {
    return `Max ${resistanceAbbreviation(maxResMatch[1])} Res`;
  }

  return abbreviateCorruptionPart(part.replace(/^to\s+/i, '+'));
}

function resistanceAbbreviation(resistance) {
  return {
    cold: 'C',
    fire: 'F',
    lightning: 'L',
    poison: 'P',
  }[String(resistance).toLowerCase()] || resistance;
}

function abbreviateCorruptionPart(part) {
  const allResMatch = part.match(/^All Resistances\s+\+?(\d+%)$/i);
  if (allResMatch) {
    return `All Res ${allResMatch[1]}`;
  }

  const singleResMatch = part.match(/^(Cold|Fire|Lightning|Poison) Resist\s+(\d+%)$/i);
  if (singleResMatch) {
    return `${resistanceAbbreviation(singleResMatch[1])} Res ${singleResMatch[2]}`;
  }

  const enemyResMatch = part.match(/^Enemy (Cold|Fire|Lightning|Poison) Resistance$/i);
  if (enemyResMatch) {
    return `-Enemy ${resistanceAbbreviation(enemyResMatch[1])} Res`;
  }

  const maxLifeMatch = part.match(/^Increase Maximum Life\s+(\d+%)$/i);
  if (maxLifeMatch) {
    return `Max Life ${maxLifeMatch[1]}`;
  }

  const replenishLifeMatch = part.match(/^Replenish Life\s+\+?(\d+)$/i);
  if (replenishLifeMatch) {
    return `Rep Life ${replenishLifeMatch[1]}`;
  }

  const requirementsMatch = part.match(/^Requirements\s+(-?\d+%)$/i);
  if (requirementsMatch) {
    return `Req ${requirementsMatch[1]}`;
  }

  const replacements = new Map([
    ['All Skills', '+Skills'],
    ['Attack Rating', 'AR'],
    ['Attack Rating against Demons', 'Demon AR'],
    ['Better Chance of Getting Magic Items', 'MF'],
    ['Cannot Be Frozen', 'CBF'],
    ['Chance of Crushing Blow', 'CB'],
    ['Chance of Deadly Strike', 'DS'],
    ['Chance to Pierce', 'Pierce'],
    ['Cold Skill Damage', 'C Skill Dmg'],
    ['Damage to Demons', 'Demon Dmg'],
    ['Enhanced Damage', 'ED'],
    ['Enhanced Defense', 'E-Def'],
    ['Extra Gold from Monsters', 'GF'],
    ['Faster Block Rate', 'FBR'],
    ['Faster Cast Rate', 'FCR'],
    ['Faster Run/Walk', 'FRW'],
    ['Fire Skill Damage', 'F Skill Dmg'],
    ["Ignore Target's Defense", 'ITD'],
    ['Increased Attack Speed', 'IAS'],
    ['Increased Chance of Blocking', 'ICB'],
    ['Life stolen per hit', 'LL'],
    ['Life after each Kill', 'LAEK'],
    ['Lightning Skill Damage', 'L Skill Dmg'],
    ['Mana stolen per hit', 'ML'],
    ['Mana after each Kill', 'MAEK'],
    ['Target Defense', 'Target Def'],
    ['Vitality', 'Vit'],
  ]);

  return replacements.get(part) || part;
}

function formatHr(value) {
  if (!Number.isFinite(value)) {
    return '?';
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

function formatPriceRange(lowPrice, highPrice) {
  if (!Number.isFinite(lowPrice) || !Number.isFinite(highPrice)) {
    return '? HR';
  }

  if (lowPrice === highPrice) {
    return `${formatHr(lowPrice)} HR`;
  }

  return `${formatHr(lowPrice)}-${formatHr(highPrice)} HR`;
}

function parsePd2TraderItems(source) {
  const transformed = source
    .replace(/^export const uniqueItems =/m, 'const uniqueItems =')
    .replace(/^export const setItems =/m, 'const setItems =')
    .replace(/^export const runeWords =/m, 'const runeWords =')
    .replace(/^export const allItems =/m, 'const allItems =');

  return new Function(`${transformed}\nreturn { uniqueItems, setItems };`)();
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function qualityName(item) {
  return item.quality === 'SET' ? 'Set' : 'Unique';
}

function normalizePriceValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const wssMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*wss\b/);

  if (wssMatch) {
    return Number(wssMatch[1]) * 0.01;
  }

  const hrMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*hr\b/);

  if (hrMatch) {
    return Number(hrMatch[1]);
  }

  const numericMatch = normalized.match(/^(\d+(?:\.\d+)?)$/);
  return numericMatch ? Number(numericMatch[1]) : undefined;
}

function priceFromListing(listing) {
  const noteValue = normalizePriceValue(listing.price);

  if (Number.isFinite(noteValue)) {
    return noteValue;
  }

  const hrValue = normalizePriceValue(listing.hr_price);
  return Number.isFinite(hrValue) ? hrValue : undefined;
}

function median(values) {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function average(values) {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function corruptionKey(parts) {
  return [...parts].sort().join('|');
}

function socketKey(socketCount) {
  return `socket:${socketCount}`;
}

function normalizedCorruptionCodes(listing) {
  const item = listing.item || {};
  let corruptions = Array.isArray(item.corruptions)
    ? [...new Set(item.corruptions.filter((corruption) => !cosmeticCorruptionCodes.has(corruption)))]
    : [];

  if (corruptions.includes('item_numsockets')) {
    return [socketKey(Number(item.socket_count || 0))];
  }

  if (corruptions.includes('all_resist')) {
    return ['all_resist'];
  }

  if ([...maxResistanceCodes].every((code) => corruptions.includes(code))) {
    return ['max_all_resist'];
  }

  for (const [maxResCode, pairedResCode] of maxResistancePairCodes) {
    if (corruptions.includes(maxResCode)) {
      corruptions = corruptions.filter((corruption) => corruption !== pairedResCode);
    }
  }

  return corruptions.sort();
}

function listingCorruptionKey(listing) {
  const corruptions = normalizedCorruptionCodes(listing);
  return corruptions.length > 0 ? corruptionKey(corruptions) : null;
}

function displayNameFromCorruptionCodes(corruptions) {
  const labels = corruptions.map((corruption) => {
    if (corruption.startsWith('socket:')) {
      return `${Number(corruption.split(':')[1] || 0)}os`;
    }

    return corruptionDisplayNames.get(corruption) || cleanCorruptionPart(corruption.replace(/^item_/, ''));
  });

  return cleanDisplayText(labels.join(', '));
}

function cleanCorruptionLabel(label) {
  return cleanCorruptionPart(
    String(label)
      .replace(/^[+-]?\d+(?:\.\d+)?%?\s+(?:to\s+)?/i, '')
      .replace(/^requirements\s+/i, 'Requirements ')
      .trim(),
  );
}

function displayNameFromListing(listing) {
  return displayNameFromCorruptionCodes(normalizedCorruptionCodes(listing));
}

async function fetchMarketListings(item) {
  const listings = [];
  let skip = 0;
  let total = 0;
  const updatedAfter = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  do {
    const params = new URLSearchParams({
      type: 'item',
      '$limit': String(marketPageLimit),
      '$skip': String(skip),
      accepted_offer_id: 'null',
      'updated_at[$gte]': updatedAfter,
      '$sort[bumped_at]': '-1',
      is_hardcore: String(isHardcore),
      is_ladder: String(isLadder),
      'item.name[$regex]': `^${escapeRegExp(item.name)}$`,
      'item.name[$options]': 'i',
      'item.base_code': item.base_code,
      'item.quality.name': qualityName(item),
      'item.corrupted': 'true',
    });

    const response = await fetch(`${MARKET_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`ProjectD2 market returned ${response.status} ${response.statusText} for ${item.name}`);
    }

    const payload = await response.json();
    total = Number(payload.total || 0);
    listings.push(...(Array.isArray(payload.data) ? payload.data : []));
    skip += marketPageLimit;
  } while (skip < total && listings.length < maxMarketListingsPerItem);

  return listings;
}

function getBestCorruptionFromListings(listings) {
  const groups = new Map();

  for (const listing of listings) {
    const price = priceFromListing(listing);
    const key = listingCorruptionKey(listing);

    if (!key || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    const group = groups.get(key) || {
      name: displayNameFromListing(listing),
      prices: [],
    };

    group.prices.push(price);
    groups.set(key, group);
  }

  const candidates = [...groups.values()]
    .map((group) => ({
      name: group.name,
      medianPrice: median(group.prices),
      averagePrice: average(group.prices),
      lowPrice: Math.min(...group.prices),
      highPrice: Math.max(...group.prices),
      sampleCount: group.prices.length,
    }))
    .filter((candidate) => Number.isFinite(candidate.medianPrice))
    .filter((candidate) => candidate.sampleCount >= minSampleCount)
    .filter((candidate) => candidate.medianPrice >= minMedianPrice);

  return candidates.sort((a, b) => b.medianPrice - a.medianPrice || b.sampleCount - a.sampleCount)[0] || null;
}

function getSafeItems(uniqueItems, setItems) {
  const rawItems = [
    ...uniqueItems.map((item) => ({ ...item, quality: 'UNI' })),
    ...setItems.map((item) => ({ ...item, quality: 'SET' })),
  ].filter((item) => item.base_code && item.name && !isExcludedFromSlamNotes(item));

  const byFilterKey = new Map();

  for (const item of rawItems) {
    const key = `${item.quality}:${item.base_code}`;
    const items = byFilterKey.get(key) || [];
    items.push(item);
    byFilterKey.set(key, items);
  }

  const safeItems = [];
  const skippedAmbiguous = [];

  for (const [key, items] of byFilterKey) {
    const uniqueNames = new Set(items.map((item) => item.name));
    if (items.length === 1 || uniqueNames.size === 1) {
      safeItems.push(items[0]);
    } else {
      skippedAmbiguous.push({ key, names: items.map((item) => item.name) });
    }
  }

  return { safeItems, skippedAmbiguous };
}

async function mapWithConcurrency(items, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function lineForBisSlam(item, best) {
  return `ItemDisplay[${item.base_code} ${item.quality} ID]: %NAME%{%NAME%%CL%%PURPLE%BIS: %WHITE%${best.name} %GRAY%[${formatPriceRange(best.lowPrice, best.highPrice)}]}%CONTINUE%`;
}

function lineForNotWorthSlamming(item) {
  return `ItemDisplay[${item.base_code} ${item.quality} ID]: %NAME%{%NAME%%CL%%RED%Not worth slamming}%CONTINUE%`;
}

function buildBlock(lines, stats) {
  return [
    START_MARKER,
    `// Source: ProjectD2 market listings (${hours}h, ladder=${isLadder}, hardcore=${isHardcore})`,
    `// Shows abbreviated BIS slam plus low-high HR range when a corruption has priced samples >= ${minSampleCount}; WSS prices are converted at 0.01 HR each`,
    '// Slam names come from canonical corruption codes so native item stats do not pollute the label',
    '// Items without enough priced corruption samples are marked as not worth slamming',
    '// Shows even after corruption because rules intentionally do not require STAT360=0',
    `// Generated lines: ${stats.generated}; BIS lines: ${stats.bis}; not worth lines: ${stats.notWorth}; ambiguous item-code groups skipped: ${stats.skippedAmbiguous}`,
    ...lines,
    END_MARKER,
  ].join('\n');
}

function replaceOrInsertBlock(filterText, block) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';
  const normalizedBlock = block.replace(/\n/g, eol);
  const start = filterText.indexOf(START_MARKER);
  const end = filterText.indexOf(END_MARKER);
  let withoutGeneratedBlock = filterText;

  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + END_MARKER.length;
    withoutGeneratedBlock = `${filterText.slice(0, start)}${filterText.slice(afterEnd)}`;
  }

  const withoutLegacySkyfall = withoutGeneratedBlock.replace(
    /\r?\n\/\/ Clean Skyfall slam note\r?\nItemDisplay\[obe UNI ID\]:[^\r\n]*\r?\n/g,
    eol,
  );
  const anchorMatch = withoutLegacySkyfall.match(/\r?\n\/\/ Tooltip description rules end here/);

  if (anchorMatch && anchorMatch.index !== undefined) {
    const anchorIndex = anchorMatch.index;
    return `${withoutLegacySkyfall.slice(0, anchorIndex)}${eol}${normalizedBlock}${eol}${withoutLegacySkyfall.slice(anchorIndex)}`;
  }

  return `${withoutLegacySkyfall.replace(/\s*$/, '')}${eol}${eol}${normalizedBlock}${eol}`;
}

const source = await fetchText(ITEMS_URL);
const { uniqueItems, setItems } = parsePd2TraderItems(source);
const { safeItems, skippedAmbiguous } = getSafeItems(uniqueItems, setItems);
const itemsToCheck = [...safeItems, ...manualSafeItems].filter((item) => !isExcludedFromSlamNotes(item));

const results = await mapWithConcurrency(itemsToCheck, async (item) => {
  try {
    const listings = await fetchMarketListings(item);
    const best = getBestCorruptionFromListings(listings);

    return { item, best };
  } catch (error) {
    console.warn(`Skipping ${item.name}: ${error.message}`);
    return null;
  }
});

const slamLines = results
  .filter(Boolean)
  .sort((a, b) => a.item.quality.localeCompare(b.item.quality) || a.item.base_code.localeCompare(b.item.base_code))
  .map(({ item, best }) => (best ? lineForBisSlam(item, best) : lineForNotWorthSlamming(item)));

const block = buildBlock(slamLines, {
  generated: slamLines.length,
  bis: results.filter((result) => result?.best).length,
  notWorth: results.filter((result) => result && !result.best).length,
  skippedAmbiguous: skippedAmbiguous.length,
});
const currentFilter = await readFile(filterFile, 'utf8');
const nextFilter = replaceOrInsertBlock(currentFilter, block);

if (nextFilter === currentFilter) {
  console.log(`No PD2 Trader BIS slam changes needed in ${filterFile}`);
} else {
  await writeFile(filterFile, nextFilter, 'utf8');
  console.log(`Updated ${slamLines.length} PD2 Trader BIS slam lines in ${filterFile}`);
  console.log(`Skipped ${skippedAmbiguous.length} ambiguous item-code groups`);
}
