// Theme building blocks for the Roofoo filter.
//
// A "slot" is one highlight style in the filter (e.g. the 3-star unique look). Slots are
// found in the live filter by their rule conditions, so the builder keeps working when
// Roofoo updates the file, as long as those conditions keep the same text.

const TIER_GROUP = t => `(${t}UNIETH1 OR ${t}UNIETH2 OR ${t}UNI1 OR ${t}UNI2 OR ${t}SETETH1 OR ${t}SET1)`;

// Text slots: styled item labels (decoration colors, symbols, words, minimap marker, sound).
export const TEXT_SLOTS = [
  {
    id: 'uber', group: 'Unique & set tiers', label: 'Boss-arena uniques',
    help: 'The "HOLY MOLY" drops from uber bosses (Third Eye, Cage of the Unsullied, Band of Skulls, Overlord\'s Helm…).',
    sample: { name: 'Overlord\'s Helm', color: 'GOLD' }, item: { code: 'uh9', quality: 'UNI' },
    display: [{ cond: 'PD2UBERUNI1 OR PD2UBERUNI2' }],
    sound: { cond: '(PD2UBERUNI1 OR PD2UBERUNI2) !TOWN' },
  },
  {
    id: 'tp', group: 'Unique & set tiers', label: '3★ Pickup',
    help: 'Always worth grabbing. Strongest alert.',
    sample: { name: 'Sacred Armor', color: 'GOLD' }, item: { code: 'uar', quality: 'UNI' },
    display: [{ condStarts: TIER_GROUP('TP'), notEnds: '!TOWN' }],
    sound: { cond: TIER_GROUP('TP') + ' !TOWN' },
  },
  {
    id: 'ts', group: 'Unique & set tiers', label: '3★',
    help: 'Good items.',
    sample: { name: 'Shako', color: 'GOLD' }, item: { code: 'uap', quality: 'UNI' },
    display: [{ condStarts: TIER_GROUP('TS'), notEnds: '!TOWN' }],
    sound: { cond: TIER_GROUP('TS') + ' !TOWN' },
  },
  {
    id: 'os', group: 'Unique & set tiers', label: '1★',
    help: 'Situational / niche items.',
    sample: { name: 'Colossus Blade', color: 'GOLD' }, item: { code: '7gd', quality: 'UNI' },
    display: [{ condStarts: '(OSUNIETH1 OR OSUNIETH2 OR OSUNIETH3 OR OSUNI1 OR OSUNI2 OR OSUNI3 OR OSUNI4 OR OSSETETH1 OR OSSET1)', notEnds: '!TOWN' }],
    sound: { cond: '(OSUNIETH1 OR OSUNIETH2 OR OSUNIETH3 OR OSUNI1 OR OSUNI2 OR OSUNI3 OR OSUNI4 OR OSSETETH1 OR OSSET1) !TOWN' },
  },
  {
    id: 'ns', group: 'Unique & set tiers', label: 'No star',
    help: 'Low priority. Tiny marker only.',
    sample: { name: 'Colossus Sword', color: 'GOLD' }, item: { code: '7fb', quality: 'UNI' },
    display: [{ condStarts: TIER_GROUP('NS'), notEnds: '!TOWN' }],
    sound: { cond: TIER_GROUP('NS') + ' !TOWN' },
  },
  {
    id: 'rune_high', group: 'Runes', label: 'High runes (Vex – Zod)',
    sample: { name: 'Zod Rune', color: 'ORANGE' }, item: { code: 'r33' },
    display: [{ cond: 'RUNE>25', needIcon: true }],
    sound: { cond: 'RUNE>25 !TOWN' },
  },
  {
    id: 'rune_mid', group: 'Runes', label: 'Mid runes (Lem – Gul)',
    help: 'The sound is shared with Larzuk\'s Puzzlepiece.',
    sample: { name: 'Mal Rune', color: 'ORANGE' }, item: { code: 'r23' },
    display: [{ cond: 'RUNE>19 AND RUNE<26' }],
    sound: { cond: '(RUNE~20-25 OR lpp) !TOWN' },
  },
  {
    id: 'rune_ko', group: 'Runes', label: 'Ko & Fal',
    sample: { name: 'Ko Rune', color: 'ORANGE' }, item: { code: 'r18' },
    display: [{ cond: '(RUNE~18-19)', needIcon: true }],
    sound: { cond: '(RUNE~18-19) !TOWN' },
  },
  {
    id: 'rune_useful', group: 'Runes', label: 'Useful low runes',
    help: 'Tir, Ral, Ort, Sol, Hel and Lum.',
    sample: { name: 'Sol', color: 'ORANGE' }, item: { code: 'r12' },
    display: [{ cond: '(r03 OR r03s OR r08 OR r08s OR r09 OR r09s OR r12 OR r12s OR r15 OR r15s)' }, { cond: '(r17 OR r17s)' }],
    sound: { cond: '(r03 OR r03s OR r08 OR r08s OR r09 OR r09s OR r12 OR r12s OR r15 OR r15s OR r17 OR r17s) !TOWN' },
  },
  {
    id: 'super_rare', group: 'Special drops', label: 'Super rares',
    help: 'Vial of Lightsong and Lilith\'s Mirror. The sound also plays for the Skeleton Key, Horadrim Navigator and Almanac.',
    sample: { name: 'Lilith\'s Mirror', color: 'PURPLE' }, item: { code: 'llmr' },
    display: [{ cond: 'lsvl' }, { cond: 'llmr' }],
    sound: { cond: '(llmr OR lsvl OR rkey OR rid OR rtp) !TOWN' },
  },
  {
    id: 'puzzle', group: 'Special drops', label: 'Puzzlebox & Demonic Cube',
    sample: { name: 'Larzuk\'s Puzzlebox', color: 'GOLD' }, item: { code: 'lbox' },
    display: [{ cond: 'lbox' }, { cond: 'imrn' }],
    sound: { cond: '(lbox OR imrn) !TOWN' },
  },
  {
    id: 'ubermats', group: 'Special drops', label: 'Uber & boss materials',
    help: 'DClone, Rathma and Lucion materials, Uber Ancients relics.',
    sample: { name: 'Vision of Terror', color: 'ORANGE' }, item: { code: 'dcma' },
    display: [
      { cond: '(dcma OR rtma OR luca) STAT185=0' }, { cond: '(dcma OR rtma OR luca) STAT185>0' },
      { cond: 'lucb' }, { cond: 'lucc' }, { cond: 'lucd' }, { cond: 'dcbl OR dcho' }, { cond: 'dcso' },
      { cond: 'rtmf' }, { cond: 'rtmv' }, { cond: 'rtmo' }, { cond: 'cm2f' },
      { cond: 'ubaa' }, { cond: 'ubab' }, { cond: 'ubac' }, { cond: 'uba' },
    ],
    sound: { cond: '(ubtm OR dcma OR dcso OR dcbl OR dcho OR rtma OR rtmv OR rtmo OR cm2f OR rtmf OR luca OR lucb OR lucc OR lucd) !TOWN' },
  },
  {
    id: 'unique_map', group: 'Special drops', label: 'Unique maps',
    sample: { name: 'Ruins of Viz-Jun Map', color: 'GOLD' }, item: { code: 't11', quality: 'UNI' },
    display: [{ cond: 'MAPTIER>0 !ID UNI', needIcon: true }],
    sound: { cond: 'MAPTIER>0 !ID UNI', needSound: true },
  },
  {
    id: 'facet', group: 'Special drops', label: 'Rainbow Facet',
    sample: { name: 'Jewel', color: 'GOLD' }, item: { code: 'jew', quality: 'UNI' },
    display: [{ cond: 'jew UNI !ID' }],
    sound: { cond: 'jew UNI !ID !TOWN' },
  },
  // Mystery drops (only in the Bastard Mystery filter). The sound is part of the label line itself.
  {
    id: 'm_little', group: 'Mystery drops', label: 'Little Bastard', inlineSound: true,
    help: 'Lower mystery drops, e.g. Vex, Ohm and Lo runes, Puzzlebox, Skeleton Key, Demonic Cube.',
    sample: { name: '', color: 'WHITE' }, item: { code: 'r27' },
    display: [{ cond: 'BASTARD_LITTLE_ITEMS BASTARD_OUTSIDE_TOWN' }, { cond: 'BASTARD_LITTLE_RUNES QTY=1 BASTARD_OUTSIDE_TOWN' }],
  },
  {
    id: 'm_lucky', group: 'Mystery drops', label: 'Lucky Bastard', inlineSound: true,
    help: "Higher mystery drops, e.g. Sur to Zod runes, Vial of Lightsong, Lilith's Mirror.",
    sample: { name: '', color: 'WHITE' }, item: { code: 'r30' },
    display: [{ cond: 'BASTARD_LUCKY_ITEMS BASTARD_OUTSIDE_TOWN' }, { cond: 'BASTARD_LUCKY_RUNES QTY=1 BASTARD_OUTSIDE_TOWN' }, { cond: 'BASTARD_LUCKY_UNIQUE BASTARD_OUTSIDE_TOWN' }],
  },
  {
    id: 'm_big', group: 'Mystery drops', label: 'Big Bastard', inlineSound: true,
    help: 'Selected 3★ uniques, normal and ethereal.',
    sample: { name: '', color: 'WHITE' }, item: { code: 'uhm', quality: 'UNI' },
    display: [{ cond: 'UNI !ID BASTARD_3_STAR_UNIQUE BASTARD_OUTSIDE_TOWN' }, { cond: 'UNI !ID ETH BASTARD_3_STAR_ETH_UNIQUE BASTARD_OUTSIDE_TOWN' }],
  },
  {
    id: 'm_holy', group: 'Mystery drops', label: 'HOLY MOLY (boss arenas)', inlineSound: true,
    help: 'Boss uniques, only inside the boss arenas.',
    sample: { name: '', color: 'WHITE' }, item: { code: 'uh9', quality: 'UNI' },
    display: [{ condStarts: 'UNI !ID BASTARD_BOSS_UNIQUE' }],
  },
];

export const MYSTERY_SLOT_IDS = ['m_little', 'm_lucky', 'm_big', 'm_holy'];

// Marker slots: minimap marker only (many lines share one marker token).
export const MARKER_SLOTS = [
  { id: 'm_bases', label: 'Good runeword bases', token: 'DOT-D6', from: '// Runeword base highlights', to: '// Price tag rules' },
  { id: 'm_lowrunes', label: 'Low runes (El – Lum)', token: 'PX-62', from: '// Rune pings and notifications', to: '// Rune notes' },
  { id: 'm_charms', label: 'High item-level charms', token: 'DOT-9B' },
  { id: 'm_rarejew', label: 'Rare jewelry & good rares', token: 'DOT-A8' },
  { id: 'm_class', label: 'Good class-specific magic items', token: 'DOT-97' },
  { id: 'm_gems', label: 'Flawless & perfect gems', token: 'DOT-70' },
  { id: 'm_keys', label: 'Uber keys (Terror, Hate, Destruction)', token: 'DOT-9D' },
  { id: 'm_essence', label: 'Essences, organs & Standard of Heroes', token: 'PX-9D' },
  { id: 'm_crafting', label: 'Worldstone shards & crafting infusions', token: 'DOT-66' },
];

// Text colors available in PD2 filters, with an approximate on-screen color.
export const TEXT_COLORS = {
  WHITE: '#f0f0f0', GRAY: '#7d7d7d', LIGHT_GRAY: '#c3c3c3', BLACK: '#1a1a1a', BLUE: '#6c6cff', TEAL: '#2fc6c6',
  GREEN: '#1dff1d', DARK_GREEN: '#2e9a2e', SAGE: '#9fbf86', YELLOW: '#ffff6a', GOLD: '#c8b27a', TAN: '#a4926a',
  ORANGE: '#ffa726', CORAL: '#ff8566', RED: '#ff4a4a', PURPLE: '#b24dff',
};
export const TEXT_COLOR_NAMES = {
  WHITE: 'White', GRAY: 'Gray', LIGHT_GRAY: 'Light gray', BLACK: 'Black', BLUE: 'Blue', TEAL: 'Teal', GREEN: 'Green',
  DARK_GREEN: 'Dark green', SAGE: 'Sage', YELLOW: 'Yellow', GOLD: 'Gold', TAN: 'Tan', ORANGE: 'Orange', CORAL: 'Coral',
  RED: 'Red', PURPLE: 'Purple',
};

// Minimap marker colors (palette index in hex -> friendly name). Colors come from game.json.
export const MARKER_COLORS = [
  ['20', 'White'], ['1F', 'Silver'], ['D6', 'Gray'], ['C6', 'Dark gray'], ['62', 'Red'], ['0A', 'Dark red'],
  ['66', 'Pink'], ['70', 'Light pink'], ['68', 'Orange'], ['60', 'Dark orange'], ['6D', 'Gold'], ['A8', 'Light yellow'],
  ['53', 'Bronze'], ['84', 'Bright green'], ['7F', 'Green'], ['77', 'Dark green'], ['A9', 'Mint'], ['9F', 'Teal'],
  ['97', 'Blue'], ['9D', 'Lavender'], ['9B', 'Purple'], ['4B', 'Plum'],
];

// Marker sizes, biggest first (the filter's own note: BORDER > MAP > DOT > PX).
export const MARKER_SIZES = [['BORDER', 'Huge'], ['MAP', 'Large'], ['DOT', 'Medium'], ['PX', 'Small']];

// Color variations. text: decoration color swaps. marker: minimap color swaps.
export const PRESETS = [
  { id: 'classic', label: 'Roofoo Classic', blurb: 'Exactly as Roofoo ships it.', text: {}, marker: {} },
  {
    id: 'ember', label: 'Ember', blurb: 'Fire and embers: reds, oranges and gold.',
    text: { GREEN: 'ORANGE', PURPLE: 'RED', SAGE: 'CORAL', DARK_GREEN: 'RED', BLUE: 'ORANGE', TEAL: 'CORAL', YELLOW: 'GOLD', LIGHT_GRAY: 'TAN', GRAY: 'TAN' },
    marker: { '84': '68', '7F': '60', 'A9': '70', '97': '62', '9D': '66', '9B': '0A', 'D6': '60', 'A8': '6D' },
  },
  {
    id: 'frost', label: 'Frost', blurb: 'Icy blues, teals and whites.',
    text: { GREEN: 'TEAL', PURPLE: 'BLUE', RED: 'WHITE', ORANGE: 'TEAL', YELLOW: 'LIGHT_GRAY', SAGE: 'BLUE', DARK_GREEN: 'TEAL', CORAL: 'LIGHT_GRAY', GOLD: 'WHITE', TAN: 'LIGHT_GRAY', GRAY: 'BLUE' },
    marker: { '68': '9F', '62': '97', '0A': '97', '66': '9D', '70': 'A9', '84': '9F', '7F': '9F', '9B': '9D', 'A8': '20', 'D6': '1F' },
  },
  {
    id: 'venom', label: 'Venom', blurb: 'Toxic greens with a yellow sting.',
    text: { PURPLE: 'DARK_GREEN', RED: 'GREEN', ORANGE: 'YELLOW', CORAL: 'SAGE', BLUE: 'TEAL', GRAY: 'DARK_GREEN', LIGHT_GRAY: 'SAGE', TAN: 'SAGE' },
    marker: { '68': '84', '62': '7F', '0A': '77', '66': 'A9', '70': 'A9', '9B': '84', '97': '9F', '9D': 'A9' },
  },
  {
    id: 'royal', label: 'Royal', blurb: 'Purple and gold.',
    text: { GREEN: 'GOLD', RED: 'PURPLE', ORANGE: 'GOLD', YELLOW: 'WHITE', SAGE: 'TAN', DARK_GREEN: 'PURPLE', CORAL: 'PURPLE', BLUE: 'PURPLE', TEAL: 'GOLD' },
    marker: { '68': '9B', '62': '9B', '0A': '4B', '66': '9D', '84': '6D', '7F': '53', 'A9': 'A8', '97': '9D', 'D6': '6D' },
  },
  {
    id: 'contrast', label: 'High Contrast', blurb: 'Blue, orange and white only. Easier to tell apart with red-green color blindness.',
    text: { GREEN: 'WHITE', PURPLE: 'BLUE', RED: 'ORANGE', SAGE: 'WHITE', DARK_GREEN: 'BLUE', CORAL: 'ORANGE', TEAL: 'BLUE', GOLD: 'YELLOW', TAN: 'LIGHT_GRAY' },
    marker: { '68': '6D', '62': '20', '0A': '97', '66': '6D', '70': '20', '84': '97', '7F': '97', '9B': '20', 'A9': '20', '9D': '97' },
  },
];

// Sound packs: slot id -> sound id (0 = silent). Slots left out keep Roofoo's sound.
export const SOUND_PACKS = [
  { id: 'classic', label: 'Roofoo Classic', sounds: {} },
  {
    id: 'tinks', label: 'PD2 drop tinks', blurb: 'Rising "tink" sounds: the better the drop, the higher the pitch.',
    sounds: { ns: 0, os: 4714, ts: 4720, tp: 4726, uber: 4729, rune_high: 4728, rune_mid: 4722, rune_ko: 0, rune_useful: 0, super_rare: 4727, puzzle: 4724, ubermats: 4725, unique_map: 4721, facet: 4723, m_little: 4724, m_lucky: 4728, m_big: 4727, m_holy: 4729 },
  },
  {
    id: 'quiet', label: 'Quiet', blurb: 'Only the big drops make noise.',
    sounds: { os: 0, ts: 0, rune_mid: 0, puzzle: 0, ubermats: 0, unique_map: 0, facet: 0 },
  },
  { id: 'silent', label: 'Silent', blurb: 'No drop sounds at all.', sounds: Object.fromEntries(TEXT_SLOTS.map(s => [s.id, 0])) },
];

export const TIERS = [
  { id: '', label: 'Plain', short: 'Plain', help: 'Normal item color, no marker. Hidden outside town on the two strictest levels.' },
  { id: 'NS', label: 'No star', short: 'No ★', slot: 'ns' },
  { id: 'OS', label: '1 star', short: '1★', slot: 'os' },
  { id: 'TS', label: '3 star', short: '3★', slot: 'ts' },
  { id: 'TP', label: '3 star pickup', short: '3★ Pick', slot: 'tp' },
];
