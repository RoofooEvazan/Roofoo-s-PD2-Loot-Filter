import { readFile, writeFile } from 'node:fs/promises';

const API_URL = 'https://pd2trader.com/item-prices/average/batch';
const START_MARKER = '// BEGIN AUTO PD2TRADER RUNE VALUES';
const END_MARKER = '// END AUTO PD2TRADER RUNE VALUES';

const staticRunes = [
  ['r21', 'Pul Rune', 0.03],
  ['r22', 'Um Rune', 0.05],
  ['r23', 'Mal Rune', 0.1],
  ['r24', 'Ist Rune', 0.15],
  ['r25', 'Gul Rune', 0.25],
  ['r26', 'Vex Rune', 0.5],
  ['r29', 'Sur Rune', 1.5],
  ['r30', 'Ber Rune', 3],
];

const dynamicRunes = [
  ['r27', 'Ohm Rune'],
  ['r28', 'Lo Rune'],
  ['r31', 'Jah Rune'],
  ['r32', 'Cham Rune'],
  ['r33', 'Zod Rune'],
];

const runeOrder = [
  'r21',
  'r22',
  'r23',
  'r24',
  'r25',
  'r26',
  'r27',
  'r28',
  'r29',
  'r30',
  'r31',
  'r32',
  'r33',
];

const filterFile = process.env.FILTER_FILE || 'Roofoo.filter';
const isLadder = process.env.PD2TRADER_LADDER !== 'false';
const isHardcore = process.env.PD2TRADER_HARDCORE === 'true';
const valueWindows = [
  ['24H', 24],
  ['48H', 48],
  ['72H', 72],
  ['1W', 168],
];
const maxTimelineVariance = 0.3;

function formatHr(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return value.toFixed(2).replace(/\.?0+$/, '');
}

function roundToNearestFiveHundredths(value) {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Math.round(value * 20) / 20;
}

function lineForStaticRune(baseCode, runeName, value) {
  const values = valueWindows.map(([label]) => `${label} %WHITE%${formatHr(value)} HR`).join(' %PURPLE%');
  return `ItemDisplay[${baseCode}s]: %NAME%{%NAME%%CL%%PURPLE%${values}%CL%%PURPLE%Current Values:%CL%}%CONTINUE%`;
}

function valueFromPrice(price) {
  if (!price) {
    return undefined;
  }

  return price.medianPrice ?? price.movingAverage7Days ?? price.averagePrice;
}

function directPriceForWindow(priceByWindow, baseCode, windowIndex) {
  const [, windowHours] = valueWindows[windowIndex];
  return priceByWindow.get(windowHours)?.get(baseCode);
}

function valueForWindow(priceByWindow, baseCode, windowIndex, cache = new Map()) {
  if (cache.has(windowIndex)) {
    return cache.get(windowIndex);
  }

  const directValue = valueFromPrice(directPriceForWindow(priceByWindow, baseCode, windowIndex));
  const nextValue =
    windowIndex + 1 < valueWindows.length
      ? valueForWindow(priceByWindow, baseCode, windowIndex + 1, cache)
      : undefined;

  let value = directValue;

  if (!Number.isFinite(value)) {
    value = nextValue;
  } else if (
    Number.isFinite(nextValue) &&
    nextValue > 0 &&
    Math.abs(value - nextValue) / nextValue > maxTimelineVariance
  ) {
    value = nextValue;
  }

  cache.set(windowIndex, value);
  return value;
}

function lineForDynamicRune(priceByWindow, baseCode, runeName) {
  const valueCache = new Map();
  const values = valueWindows.map(([label], windowIndex) => {
    const value = roundToNearestFiveHundredths(valueForWindow(priceByWindow, baseCode, windowIndex, valueCache));

    if (!Number.isFinite(value)) {
      return `${label} %GRAY%?`;
    }

    return `${label} %WHITE%${formatHr(value)} HR`;
  });

  if (values.every((value) => value.includes('%GRAY%?'))) {
    return `// ${runeName}: no PD2 Trader value returned`;
  }

  return `ItemDisplay[${baseCode}s]: %NAME%{%NAME%%CL%%PURPLE%${values.join(' %PURPLE%')}%CL%%PURPLE%Current Values:%CL%}%CONTINUE%`;
}

async function fetchRunePrices(windowHours) {
  const body = {
    baseCodes: dynamicRunes.map(([baseCode]) => baseCode),
    isLadder,
    isHardcore,
    hours: windowHours,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PD2 Trader API returned ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.data)) {
    throw new Error('PD2 Trader API response did not include a data array');
  }

  return new Map(payload.data.map((price) => [price.baseCode, price]));
}

function getUpdatedAt(priceByWindow) {
  return (
    [...priceByWindow.values()]
      .flatMap((pricesByBaseCode) => [...pricesByBaseCode.values()])
      .map((price) => price.timeRange?.end)
      .filter(Boolean)
      .sort()
      .at(-1) || new Date().toISOString()
  );
}

function buildBlock(priceByWindow) {
  const updatedAt = getUpdatedAt(priceByWindow);
  const staticByBaseCode = new Map(staticRunes.map((rune) => [rune[0], rune]));
  const dynamicByBaseCode = new Map(dynamicRunes.map((rune) => [rune[0], rune]));
  const generatedLines = runeOrder.map((baseCode) => {
    const staticRune = staticByBaseCode.get(baseCode);

    if (staticRune) {
      return lineForStaticRune(...staticRune);
    }

    const dynamicRune = dynamicByBaseCode.get(baseCode);
    return lineForDynamicRune(priceByWindow, dynamicRune[0], dynamicRune[1]);
  });

  return [
    START_MARKER,
    `// Source: PD2 Trader API (${valueWindows.map(([label]) => label).join(', ')}, ladder=${isLadder}, hardcore=${isHardcore})`,
    '// Applies to stackable rune item codes only; Lem is intentionally excluded',
    '// Static values: Pul, Um, Mal, Ist, Gul, Vex, Sur, Ber',
    '// Dynamic values: Ohm, Lo, Jah, Cham, Zod; median rounded to nearest 0.05 HR',
    `// Updated: ${updatedAt}`,
    ...generatedLines,
    END_MARKER,
  ].join('\n');
}

function replaceOrInsertBlock(filterText, block) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';
  const normalizedBlock = block.replace(/\n/g, eol);
  const start = filterText.indexOf(START_MARKER);
  const end = filterText.indexOf(END_MARKER);
  const runeTooltipPattern = /^ItemDisplay\[RUNE>0\].*$/m;

  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + END_MARKER.length;
    const withoutExistingBlock = `${filterText.slice(0, start)}${filterText.slice(afterEnd)}`.replace(/\n{3,}/g, `${eol}${eol}`);
    const match = withoutExistingBlock.match(runeTooltipPattern);

    if (match && match.index !== undefined) {
      return `${withoutExistingBlock.slice(0, match.index)}${normalizedBlock}${eol}${withoutExistingBlock.slice(match.index)}`;
    }

    return `${filterText.slice(0, start)}${normalizedBlock}${filterText.slice(afterEnd)}`;
  }

  const match = filterText.match(runeTooltipPattern);

  if (match && match.index !== undefined) {
    const insertAt = match.index;
    return `${filterText.slice(0, insertAt)}${normalizedBlock}${eol}${filterText.slice(insertAt)}`;
  }

  return `${filterText.replace(/\s*$/, '')}${eol}${eol}${normalizedBlock}${eol}`;
}

const priceByWindow = new Map();

for (const [, windowHours] of valueWindows) {
  priceByWindow.set(windowHours, await fetchRunePrices(windowHours));
}

const block = buildBlock(priceByWindow);
const currentFilter = await readFile(filterFile, 'utf8');
const nextFilter = replaceOrInsertBlock(currentFilter, block);

if (nextFilter === currentFilter) {
  console.log(`No PD2 Trader rune value changes needed in ${filterFile}`);
} else {
  await writeFile(filterFile, nextFilter, 'utf8');
  console.log(`Updated PD2 Trader rune values in ${filterFile}`);
}
