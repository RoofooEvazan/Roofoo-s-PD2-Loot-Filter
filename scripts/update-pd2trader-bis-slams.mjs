import { readFile, writeFile } from 'node:fs/promises';

const ITEMS_URL = 'https://raw.githubusercontent.com/errolgr/pd2-trade/main/src/assets/items.ts';
const API_URL = 'https://pd2trader.com/item-prices/corruption-prices';
const START_MARKER = '// BEGIN AUTO PD2TRADER BIS SLAMS';
const END_MARKER = '// END AUTO PD2TRADER BIS SLAMS';

const filterFile = process.env.FILTER_FILE || 'Roofoo.filter';
const isLadder = process.env.PD2TRADER_LADDER !== 'false';
const isHardcore = process.env.PD2TRADER_HARDCORE === 'true';
const hours = Number(process.env.PD2TRADER_BIS_HOURS || process.env.PD2TRADER_HOURS || 48);
const minSampleCount = Number(process.env.PD2TRADER_BIS_MIN_SAMPLES || 2);
const minMedianPrice = Number(process.env.PD2TRADER_BIS_MIN_MEDIAN || 0);
const concurrency = Number(process.env.PD2TRADER_BIS_CONCURRENCY || 8);

const manualSafeItems = [
  { name: 'Skyfall', base_code: 'obe', quality: 'UNI' },
];

function cleanDisplayText(text) {
  const seen = new Set();

  return String(text)
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
    })
    .join(', ');
}

function cleanCorruptionPart(text) {
  const part = String(text).trim();

  if (/^to All Skills$/i.test(part)) {
    return '+All Skills';
  }

  if (/^Numsockets$/i.test(part)) {
    return 'Sockets';
  }

  if (/^(Dmg%|Maxdamage Percent|ED|Max Damage)$/i.test(part)) {
    return 'Enhanced Damage';
  }

  if (/^Physical Damage Taken Reduced by\s*%?$/i.test(part)) {
    return 'PDR%';
  }

  const maxResMatch = part.match(/^(?:to\s+)?Maximum\s+(Cold|Fire|Lightning|Poison)\s+Resist(?:ance)?$/i);
  if (maxResMatch) {
    return `Max ${maxResMatch[1]} resistance`;
  }

  return part.replace(/^to\s+/i, '+');
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

async function fetchCorruptionPrices(itemName) {
  const params = new URLSearchParams({
    itemName,
    isLadder: String(isLadder),
    isHardcore: String(isHardcore),
    hours: String(hours),
  });

  const response = await fetch(`${API_URL}?${params}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`PD2 Trader returned ${response.status} ${response.statusText} for ${itemName}`);
  }

  return response.json();
}

function getBestCorruption(pricePayload) {
  const candidates = [];

  for (const corruption of pricePayload?.corruptionPrices || []) {
    if (Array.isArray(corruption.socketPrices) && corruption.socketPrices.length > 0) {
      for (const socketPrice of corruption.socketPrices) {
        candidates.push({
          name: `${socketPrice.socketCount}os`,
          medianPrice: Number(socketPrice.medianPrice),
          averagePrice: Number(socketPrice.averagePrice),
          sampleCount: Number(socketPrice.sampleCount),
        });
      }
      continue;
    }

    candidates.push({
      name: cleanDisplayText(corruption.corruptionName),
      medianPrice: Number(corruption.medianPrice),
      averagePrice: Number(corruption.averagePrice),
      sampleCount: Number(corruption.sampleCount),
    });
  }

  return candidates
    .filter((candidate) => Number.isFinite(candidate.medianPrice))
    .filter((candidate) => candidate.sampleCount >= minSampleCount)
    .filter((candidate) => candidate.medianPrice >= minMedianPrice)
    .sort((a, b) => b.medianPrice - a.medianPrice || b.sampleCount - a.sampleCount)[0] || null;
}

function getSafeItems(uniqueItems, setItems) {
  const rawItems = [
    ...uniqueItems.map((item) => ({ ...item, quality: 'UNI' })),
    ...setItems.map((item) => ({ ...item, quality: 'SET' })),
  ].filter((item) => item.base_code && item.name);

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
  return `ItemDisplay[${item.base_code} ${item.quality} ID]: %NAME%{%NAME%%CL%%PURPLE%BIS Slam: %WHITE%${best.name}}%CONTINUE%`;
}

function lineForNotWorthSlamming(item) {
  return `ItemDisplay[${item.base_code} ${item.quality} ID]: %NAME%{%NAME%%CL%%RED%Not worth slamming}%CONTINUE%`;
}

function buildBlock(lines, stats) {
  return [
    START_MARKER,
    `// Source: PD2 Trader corruption API (${hours}h, ladder=${isLadder}, hardcore=${isHardcore})`,
    `// Shows BIS slam when a corruption has samples >= ${minSampleCount}; otherwise marks the item as not worth slamming`,
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
const itemsToCheck = [...safeItems, ...manualSafeItems];

const results = await mapWithConcurrency(itemsToCheck, async (item) => {
  try {
    const payload = await fetchCorruptionPrices(item.name);
    const best = getBestCorruption(payload);

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
