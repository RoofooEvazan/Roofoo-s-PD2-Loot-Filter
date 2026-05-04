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

const runeValueOptions = {
  roundToNearestFiveHundredths: true,
  useTimelineVarianceFilter: false,
  minSampleCount: 2,
};

const materialValueOptions = {
  roundToNearestFiveHundredths: false,
  useTimelineVarianceFilter: true,
  maxTimelineVariance: 10,
  onlyFilterHighOutliers: true,
};

const dynamicRunes = [
  ['r27', 'Ohm Rune', 'r27s', runeValueOptions],
  ['r28', 'Lo Rune', 'r28s', runeValueOptions],
  ['r31', 'Jah Rune', 'r31s', runeValueOptions],
  ['r32', 'Cham Rune', 'r32s', runeValueOptions],
  ['r33', 'Zod Rune', 'r33s', runeValueOptions],
];

const dynamicCurrencyItems = [
  ['pk3', 'Key of Destruction', 'pk3', materialValueOptions],
  ['pk2', 'Key of Hate', 'pk2', materialValueOptions],
  ['pk1', 'Key of Terror', 'pk1', materialValueOptions],
  ['ubaa', 'Sigil of Madawc', 'ubaa', materialValueOptions],
  ['ubab', 'Sigil of Talic', 'ubab', materialValueOptions],
  ['ubac', 'Sigil of Korlic', 'ubac', materialValueOptions],
  ['dcbl', 'Pure Demonic Essence', 'dcbl', materialValueOptions],
  ['dcso', 'Prime Evil Soul', 'dcso', materialValueOptions],
  ['dcho', 'Black Soulstone Shard', 'dcho', materialValueOptions],
  ['rtmo', "Trang-Oul's Jawbone", 'rtmo', materialValueOptions],
  ['rtmv', 'Splinter of the Void', 'rtmv', materialValueOptions],
  ['cm2f', 'Hellfire Ashes', 'cm2f', materialValueOptions],
  ['lucb', 'Demonic Insignia', 'lucb', materialValueOptions],
  ['lucc', 'Talisman of Transgression', 'lucc', materialValueOptions],
  ['lucd', 'Flesh of Malic', 'lucd', materialValueOptions],
  ['lbox', "Larzuk's Puzzlebox", 'lbox', materialValueOptions],
  ['lpp', "Larzuk's Puzzlepiece", 'lpp', materialValueOptions],
  ['imrn', 'Demonic Cube', 'imrn', materialValueOptions],
  ['iwss', 'Catalyst Shard', 'iwss', materialValueOptions],
  ['std', 'Standard of Heroes', 'std', materialValueOptions],
  ['fed', 'Festering Essence of Destruction', 'fed', materialValueOptions],
  ['ceh', 'Charged Essence of Hatred', 'ceh', materialValueOptions],
  ['bet', 'Burning Essence of Terror', 'bet', materialValueOptions],
  ['tes', 'Twisted Essence of Suffering', 'tes', materialValueOptions],
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
const cubeRuneOrder = [
  'r27',
  'r28',
  'r31',
  'r32',
  'r33',
];
const cubeRuneExtraPadding = new Map([
  ['r28', 2],
  ['r31', 2],
  ['r32', 6],
  ['r33', 3],
]);
const valueOrder = [...runeOrder, ...dynamicCurrencyItems.map(([baseCode]) => baseCode)];
const dynamicValueItems = [...dynamicRunes, ...dynamicCurrencyItems];
const priceQueryItems = dynamicValueItems;
const currencyDisplayCodes = dynamicCurrencyItems.map(([, , displayCode]) => displayCode);

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

function formatUpdatedAtForDisplay(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function roundValue(value, options = runeValueOptions) {
  if (!Number.isFinite(value)) {
    return value;
  }

  if (!options.roundToNearestFiveHundredths) {
    return value;
  }

  const rounded = Math.round(value * 20) / 20;
  return value > 0 && rounded === 0 ? 0.05 : rounded;
}

function lineForValueDisplay(displayCode, values, updatedAt, stack24hValue, stackLabel = 'Stack Value') {
  const updatedLine = `%GOLD%Updated: ${formatUpdatedAtForDisplay(updatedAt)}`;
  const stackLine = Number.isFinite(stack24hValue)
    ? `%RED%${stackLabel}: %WHITE%$f(round(QTY*${formatHr(stack24hValue)}*100)/100) HR %PURPLE%at 24H Prices`
    : undefined;
  const spacerLine = '%BLACK%|';
  const lowerLines = [spacerLine, stackLine, `%PURPLE%${values.join(' %PURPLE%')}`].filter(Boolean).join('%CL%');

  return `ItemDisplay[${displayCode}]: %NAME%{%NAME%%CL%${lowerLines}%CL%%PURPLE%Current Values:%CL%${spacerLine}%CL%${updatedLine}%CL%${spacerLine}%CL%}`;
}

function lineForStaticRune(baseCode, runeName, value, updatedAt) {
  const values = valueWindows.map(([label]) => `${label} %WHITE%${formatHr(value)} HR`).join(' %PURPLE%');
  return lineForValueDisplay(`${baseCode}s`, [values], updatedAt, value, 'Rune Stack Value');
}

function normalizePriceValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const wssMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*wss$/);

  if (wssMatch) {
    return Number(wssMatch[1]) * 0.01;
  }

  const hrMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*hr$/);

  if (hrMatch) {
    return Number(hrMatch[1]);
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function valueFromPrice(price, options = runeValueOptions) {
  if (!price) {
    return undefined;
  }

  if (options.minSampleCount && (price.sampleCount ?? 0) < options.minSampleCount) {
    return undefined;
  }

  for (const key of ['medianPrice', 'averagePrice', 'movingAverage7Days']) {
    const value = normalizePriceValue(price[key]);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return undefined;
}

function directPriceForWindow(priceByWindow, baseCode, windowIndex) {
  const [, windowHours] = valueWindows[windowIndex];
  return priceByWindow.get(windowHours)?.get(baseCode);
}

function valueForWindow(priceByWindow, baseCode, windowIndex, cache = new Map(), options = runeValueOptions) {
  if (cache.has(windowIndex)) {
    return cache.get(windowIndex);
  }

  const directPrice = directPriceForWindow(priceByWindow, baseCode, windowIndex);
  const directValue = valueFromPrice(directPrice, options);
  const nextValue =
    windowIndex + 1 < valueWindows.length
      ? valueForWindow(priceByWindow, baseCode, windowIndex + 1, cache, options)
      : undefined;

  let value = directValue;

  if (!Number.isFinite(value) && baseCode === 'r32' && directPrice && options.minSampleCount && (directPrice.sampleCount ?? 0) < options.minSampleCount) {
    const zodValue = valueForWindow(priceByWindow, 'r33', windowIndex, new Map(), options);
    value = Number.isFinite(zodValue) ? zodValue / 2 : undefined;
  }

  if (!Number.isFinite(value)) {
    value = nextValue;
  } else if (options.useTimelineVarianceFilter && Number.isFinite(nextValue) && nextValue > 0) {
    const allowedVariance = options.maxTimelineVariance ?? maxTimelineVariance;
    const variance = Math.abs(value - nextValue) / nextValue;
    const isOutlier = options.onlyFilterHighOutliers ? value > nextValue && variance > allowedVariance : variance > allowedVariance;

    if (isOutlier) {
      value = nextValue;
    }
  }

  cache.set(windowIndex, value);
  return value;
}

function valueLinesForDynamicItem(priceByWindow, baseCode, options = runeValueOptions) {
  const valueCache = new Map();
  const roundedValuesByWindow = [];
  const values = valueWindows.map(([label], windowIndex) => {
    const value = roundValue(valueForWindow(priceByWindow, baseCode, windowIndex, valueCache, options), options);
    roundedValuesByWindow[windowIndex] = value;

    if (!Number.isFinite(value)) {
      return `${label} %GRAY%?`;
    }

    return `${label} %WHITE%${formatHr(value)} HR`;
  });

  return { values, roundedValuesByWindow };
}

function lineForDynamicItem(priceByWindow, baseCode, itemName, displayCode, updatedAt, options = runeValueOptions) {
  const { values, roundedValuesByWindow } = valueLinesForDynamicItem(priceByWindow, baseCode, options);

  if (values.every((value) => value.includes('%GRAY%?'))) {
    return `// ${itemName}: no PD2 Trader value returned`;
  }

  const isRune = runeOrder.includes(baseCode);
  const stackLabel = isRune ? 'Rune Stack Value' : 'Stack Value';
  return lineForValueDisplay(displayCode, values, updatedAt, roundedValuesByWindow[0], stackLabel);
}

function lineForCubeRuneValue(priceByWindow, baseCode, staticByBaseCode, dynamicByBaseCode) {
  const staticRune = staticByBaseCode.get(baseCode);
  const dynamicRune = dynamicByBaseCode.get(baseCode);
  const runeName = (staticRune?.[1] || dynamicRune?.[1] || baseCode).replace(' Rune', '');
  const values = staticRune
    ? valueWindows.map(([label]) => `${label} %WHITE%${formatHr(staticRune[2])} HR`)
    : valueLinesForDynamicItem(priceByWindow, baseCode, dynamicRune?.[3] || runeValueOptions).values;

  const compactValues = values.map((value) => {
    const match = value.match(/%WHITE%([^ ]+) HR/);
    return match ? match[1] : value.includes('%GRAY%?') ? '?' : value;
  });

  const labeledValues = valueWindows.map(([label], index) => `%PURPLE%${label} %WHITE%${compactValues[index]}`).join('  ');
  return `%RED%${runeName}: ${labeledValues} HR`;
}

function visibleFilterTextLength(line) {
  return line.replace(/%[A-Z0-9_-]+%/g, '').length;
}

function lineForCubeValues(priceByWindow, staticByBaseCode, dynamicByBaseCode, updatedAt) {
  const rawCubeLines = cubeRuneOrder.map((baseCode) => lineForCubeRuneValue(priceByWindow, baseCode, staticByBaseCode, dynamicByBaseCode));
  const targetVisibleLength = Math.max(...rawCubeLines.map(visibleFilterTextLength));
  const cubeLines = rawCubeLines.map((line, index) => {
    const baseCode = cubeRuneOrder[index];
    const extraPadding = cubeRuneExtraPadding.get(baseCode) || 0;
    return `${line}${' '.repeat(targetVisibleLength - visibleFilterTextLength(line) + extraPadding)}`;
  });
  const updatedLine = `%GOLD%Updated: ${formatUpdatedAtForDisplay(updatedAt)}`;
  const displayLines = [
    `ItemDisplay[box]: %NAME%{%NAME%%CL%%BLACK%|}%CONTINUE%`,
    ...cubeLines.map((line) => `ItemDisplay[box]: %NAME%{%NAME%%CL%${line}}%CONTINUE%`),
    `ItemDisplay[box]: %NAME%{%NAME%%CL%%PURPLE%Current Values:%CL%%BLACK%|%CL%${updatedLine}%CL%%BLACK%|%CL%}`,
  ];

  return displayLines.join('\n');
}

async function fetchRunePrices(windowHours) {
  const body = {
    baseCodes: priceQueryItems.map(([baseCode]) => baseCode),
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
  const updatedAt = new Date().toISOString();
  const priceDataUpdatedAt = getUpdatedAt(priceByWindow);
  const staticByBaseCode = new Map(staticRunes.map((rune) => [rune[0], rune]));
  const dynamicByBaseCode = new Map(dynamicValueItems.map((item) => [item[0], item]));
  const generatedLines = valueOrder.map((baseCode) => {
    const staticRune = staticByBaseCode.get(baseCode);

    if (staticRune) {
      return lineForStaticRune(...staticRune, updatedAt);
    }

    const dynamicItem = dynamicByBaseCode.get(baseCode);
    return lineForDynamicItem(priceByWindow, dynamicItem[0], dynamicItem[1], dynamicItem[2], updatedAt, dynamicItem[3]);
  });
  const cubeValueLine = lineForCubeValues(priceByWindow, staticByBaseCode, dynamicByBaseCode, updatedAt);

  return [
    START_MARKER,
    `// Source: PD2 Trader API (${valueWindows.map(([label]) => label).join(', ')}, ladder=${isLadder}, hardcore=${isHardcore})`,
    '// Applies to stackable rune item codes and selected currency/material item codes; Lem is intentionally excluded',
    '// Static values: Pul, Um, Mal, Ist, Gul, Vex, Sur, Ber',
    '// Dynamic rune values: Ohm, Lo, Jah, Cham, Zod; median rounded to nearest 0.05 HR',
    '// Dynamic material values: keys, boss materials, and selected utility currency; exact median HR values with WSS converted at 0.01 HR each',
    '// Horadric Cube rune values: dynamic PD2 Trader runes only',
    `// Updated: ${updatedAt}`,
    `// Price data through: ${priceDataUpdatedAt}`,
    cubeValueLine,
    ...generatedLines,
    END_MARKER,
  ].join('\n');
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function conditionHasDisplayCode(condition, displayCode) {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(displayCode)}([^A-Za-z0-9]|$)`).test(condition);
}

function ensureCurrencyPresentationRulesContinue(filterText) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';
  let insideGeneratedBlock = false;

  return filterText
    .replace(
      /^ItemDisplay\[std\]: %PX-9D%%NAME%\{%NAME%\}\/\/\{(.+?)\}%CONTINUE%$/m,
      'ItemDisplay[std]: %PX-9D%%NAME%{%NAME%%CL%$1}%CONTINUE%'
    )
    .split(/\r?\n/)
    .map((line) => {
      if (line === START_MARKER) {
        insideGeneratedBlock = true;
        return line;
      }

      if (line === END_MARKER) {
        insideGeneratedBlock = false;
        return line;
      }

      if (insideGeneratedBlock || line.includes('%CONTINUE%')) {
        return line;
      }

      const match = line.match(/^ItemDisplay\[([^\]]+)\]:(.*)$/);

      if (!match) {
        return line;
      }

      const [, condition] = match;
      const shouldContinue = currencyDisplayCodes.some((displayCode) => conditionHasDisplayCode(condition, displayCode));

      return shouldContinue ? `${line}%CONTINUE%` : line;
    })
    .join(eol);
}

function ensureCubeFilterLevelRulesContinue(filterText) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';

  return filterText
    .split(/\r?\n/)
    .map((line) => (/^ItemDisplay\[box FILTLVL=\d+\]:/.test(line) && !line.includes('%CONTINUE%') ? `${line}%CONTINUE%` : line))
    .join(eol);
}

function findLastMatch(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  let lastMatch;

  for (const match of text.matchAll(new RegExp(pattern.source, flags))) {
    lastMatch = match;
  }

  return lastMatch;
}

function replaceOrInsertBlock(filterText, block) {
  const eol = filterText.includes('\r\n') ? '\r\n' : '\n';
  const normalizedBlock = block.replace(/\n/g, eol);
  const start = filterText.indexOf(START_MARKER);
  const end = filterText.indexOf(END_MARKER);
  const valueBlockAnchorPattern = /^\/\/ Craft Infusions$/m;
  const runeTooltipPattern = /^ItemDisplay\[RUNE>0\].*$/m;
  const insertPattern = (filterText.match(valueBlockAnchorPattern) && valueBlockAnchorPattern) || runeTooltipPattern;

  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + END_MARKER.length;
    const withoutExistingBlock = `${filterText.slice(0, start)}${filterText.slice(afterEnd)}`.replace(/\n{3,}/g, `${eol}${eol}`);
    const match = findLastMatch(withoutExistingBlock, insertPattern);

    if (match && match.index !== undefined) {
      return `${withoutExistingBlock.slice(0, match.index)}${normalizedBlock}${eol}${withoutExistingBlock.slice(match.index)}`;
    }

    return `${filterText.slice(0, start)}${normalizedBlock}${filterText.slice(afterEnd)}`;
  }

  const match = findLastMatch(filterText, insertPattern);

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
const currentFilter = ensureCubeFilterLevelRulesContinue(ensureCurrencyPresentationRulesContinue(await readFile(filterFile, 'utf8')));
const nextFilter = replaceOrInsertBlock(currentFilter, block);

if (nextFilter === currentFilter) {
  console.log(`No PD2 Trader rune value changes needed in ${filterFile}`);
} else {
  await writeFile(filterFile, nextFilter, 'utf8');
  console.log(`Updated PD2 Trader rune values in ${filterFile}`);
}
