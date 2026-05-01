import { readFile, writeFile } from 'node:fs/promises';

const MARKET_API_URL = 'https://api.projectdiablo2.com/market/listing';
const START_MARKER = '// BEGIN AUTO PD2TRADER FACET VALUES';
const END_MARKER = '// END AUTO PD2TRADER FACET VALUES';

const filterFile = process.env.FILTER_FILE || 'Roofoo.filter';
const isLadder = process.env.PD2TRADER_LADDER !== 'false';
const isHardcore = process.env.PD2TRADER_HARDCORE === 'true';
const valueWindows = [
  ['24H', 24],
  ['48H', 48],
  ['72H', 72],
  ['1W', 168],
];
const marketPageLimit = Number(process.env.PD2TRADER_FACET_MARKET_PAGE_LIMIT || 200);
const maxMarketListingsPerWindow = Number(process.env.PD2TRADER_FACET_MAX_LISTINGS || 3000);

const runeValues = new Map([
  ['pul', 0.03],
  ['um', 0.05],
  ['mal', 0.1],
  ['ist', 0.15],
  ['gul', 0.25],
  ['vex', 0.5],
  ['ohm', 0.85],
  ['lo', 1],
  ['sur', 1.5],
  ['jah', 1.6],
  ['cham', 1.75],
  ['ber', 3],
  ['zod', 3.5],
]);

const facets = [
  {
    key: 'fire',
    label: 'Fire',
    color: '%RED%',
    damageStat: 'STAT329',
    pierceStat: 'STAT333',
    masteryMod: 'passive_fire_mastery',
    pierceMod: 'passive_fire_pierce',
  },
  {
    key: 'cold',
    label: 'Cold',
    color: '%BLUE%',
    damageStat: 'STAT331',
    pierceStat: 'STAT335',
    masteryMod: 'passive_cold_mastery',
    pierceMod: 'passive_cold_pierce',
  },
  {
    key: 'lightning',
    label: 'Light',
    color: '%YELLOW%',
    damageStat: 'STAT330',
    pierceStat: 'STAT334',
    masteryMod: 'passive_ltng_mastery',
    pierceMod: 'passive_ltng_pierce',
  },
  {
    key: 'poison',
    label: 'Poison',
    color: '%GREEN%',
    damageStat: 'STAT332',
    pierceStat: 'STAT336',
    masteryMod: 'passive_pois_mastery',
    pierceMod: 'passive_pois_pierce',
  },
];

function formatHr(value) {
  if (!Number.isFinite(value)) {
    return '?';
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
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

function normalizePriceValue(value) {
  if (typeof value === 'number') {
    return value > 0 ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const wssMatch = normalized.match(/(\d+(?:\.\d+)?)\s*wss\b/);

  if (wssMatch) {
    return Number(wssMatch[1]) * 0.01;
  }

  const hrMatch = normalized.match(/(\d+(?:\.\d+)?)\s*hr\b/);

  if (hrMatch) {
    return Number(hrMatch[1]);
  }

  const numericMatch = normalized.match(/^(\d+(?:\.\d+)?|\.\d+)(?:\s|,|\/|$)/);

  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  for (const [runeName, runeValue] of runeValues) {
    if (new RegExp(`\\b${runeName}\\b`, 'i').test(normalized)) {
      return runeValue;
    }
  }

  return undefined;
}

function priceFromListing(listing) {
  const noteValue = normalizePriceValue(listing.price);

  if (Number.isFinite(noteValue)) {
    return noteValue;
  }

  const hrValue = normalizePriceValue(listing.hr_price);
  return Number.isFinite(hrValue) ? hrValue : undefined;
}

function facetRollFromListing(listing) {
  const modifiers = new Map((listing.item?.modifiers || []).map((modifier) => [modifier.name, Number(modifier.values?.[0])]));

  for (const facet of facets) {
    const damage = modifiers.get(facet.masteryMod);
    const pierce = modifiers.get(facet.pierceMod);

    if (damage >= 3 && damage <= 5 && pierce >= 3 && pierce <= 5) {
      return { facet, damage, pierce };
    }
  }

  return null;
}

async function fetchFacetListings(windowHours) {
  const listings = [];
  let skip = 0;
  let total = 0;
  const updatedAfter = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

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
      'item.base_code': 'jew',
      'item.quality.name': 'Unique',
      'item.is_identified': 'true',
      'item.corrupted': 'false',
    });

    const response = await fetch(`${MARKET_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`ProjectD2 market returned ${response.status} ${response.statusText} for Rainbow Facets`);
    }

    const payload = await response.json();
    total = Number(payload.total || 0);
    listings.push(...(Array.isArray(payload.data) ? payload.data : []));
    skip += marketPageLimit;
  } while (skip < total && listings.length < maxMarketListingsPerWindow);

  return listings;
}

function buildPriceTable(listingsByWindow) {
  const pricesByWindow = new Map();

  for (const [label, listings] of listingsByWindow) {
    const groups = new Map();

    for (const listing of listings) {
      const roll = facetRollFromListing(listing);
      const price = priceFromListing(listing);

      if (!roll || !Number.isFinite(price) || price <= 0) {
        continue;
      }

      const key = `${roll.facet.key}:${roll.damage}:${roll.pierce}`;
      const group = groups.get(key) || [];
      group.push(price);
      groups.set(key, group);
    }

    pricesByWindow.set(
      label,
      new Map([...groups].map(([key, prices]) => [key, median(prices)])),
    );
  }

  return pricesByWindow;
}

function valueForWindow(pricesByWindow, key, windowIndex) {
  const [label] = valueWindows[windowIndex];
  return pricesByWindow.get(label)?.get(key);
}

function lineForFacet(pricesByWindow, facet, damage, pierce) {
  const key = `${facet.key}:${damage}:${pierce}`;
  const values = valueWindows.map(([label], windowIndex) => {
    const value = valueForWindow(pricesByWindow, key, windowIndex);
    return `${label} ${Number.isFinite(value) ? `%WHITE%${formatHr(value)} HR` : '%GRAY%?'}`;
  });

  return `ItemDisplay[jew UNI ID ${facet.damageStat}=${damage} ${facet.pierceStat}=${pierce}]: %NAME%{%NAME%%CL%%PURPLE%${values.join(' %PURPLE%')}%CL%${facet.color}${facet.label} ${damage}/${pierce} Facet Values:%CL%}%CONTINUE%`;
}

function buildBlock(pricesByWindow, listingsByWindow) {
  const generatedLines = [];

  for (const facet of facets) {
    for (let damage = 3; damage <= 5; damage += 1) {
      for (let pierce = 3; pierce <= 5; pierce += 1) {
        generatedLines.push(lineForFacet(pricesByWindow, facet, damage, pierce));
      }
    }
  }

  const sampleCounts = valueWindows
    .map(([label]) => `${label}=${listingsByWindow.get(label)?.length || 0}`)
    .join(', ');

  return [
    START_MARKER,
    `// Source: ProjectD2 market listings (${valueWindows.map(([label]) => label).join(', ')}, ladder=${isLadder}, hardcore=${isHardcore})`,
    '// Applies to identified, uncorrupted Rainbow Facet listings; each timeframe uses only its own listings',
    '// WSS prices are converted at 0.01 HR each',
    `// Market samples fetched: ${sampleCounts}`,
    ...generatedLines,
    END_MARKER,
  ].join('\n');
}

function replaceOrInsertBlock(filterText, block) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';
  const normalizedBlock = block.replace(/\n/g, eol);
  const start = filterText.indexOf(START_MARKER);
  const end = filterText.indexOf(END_MARKER);

  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + END_MARKER.length;
    return `${filterText.slice(0, start)}${normalizedBlock}${filterText.slice(afterEnd)}`;
  }

  const rainbowFacetDisplay = /^ItemDisplay\[jew UNI !ID\]:.*$/m;
  const match = filterText.match(rainbowFacetDisplay);

  if (match && match.index !== undefined) {
    const insertAt = match.index + match[0].length;
    return `${filterText.slice(0, insertAt)}${eol}${eol}${normalizedBlock}${filterText.slice(insertAt)}`;
  }

  return `${filterText.replace(/\s*$/, '')}${eol}${eol}${normalizedBlock}${eol}`;
}

const listingsByWindow = new Map();

for (const [label, windowHours] of valueWindows) {
  listingsByWindow.set(label, await fetchFacetListings(windowHours));
}

const pricesByWindow = buildPriceTable(listingsByWindow);
const block = buildBlock(pricesByWindow, listingsByWindow);
const currentFilter = await readFile(filterFile, 'utf8');
const nextFilter = replaceOrInsertBlock(currentFilter, block);

if (nextFilter === currentFilter) {
  console.log(`No PD2 Trader facet value changes needed in ${filterFile}`);
} else {
  await writeFile(filterFile, nextFilter, 'utf8');
  console.log(`Updated PD2 Trader facet values in ${filterFile}`);
}
