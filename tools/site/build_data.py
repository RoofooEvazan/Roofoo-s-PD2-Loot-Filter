"""Build docs/data/game.json (+ docs/sounds/*.wav) from a local Project Diablo 2 install.

Usage:  python tools/site/build_data.py ["C:/Program Files/Diablo II"]

Everything is read from the official archives (pd2data.mpq etc.), never from loose
data/global/excel overrides, so the site matches what live PD2 players see.
Re-run after a PD2 patch that adds items or sounds.
"""
import json, os, re, subprocess, sys
from mpq import MPQ, tbl
from props import PropFormatter

GAME = sys.argv[1] if len(sys.argv) > 1 else 'C:/Program Files/Diablo II'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'data', 'game.json')
SOUND_DIR = os.path.join(ROOT, 'docs', 'sounds')
B = chr(92)


def excel(m, name):
    raw = m.read(B.join(['data', 'global', 'excel', name])).decode('latin-1')
    lines = raw.splitlines()
    head = lines[0].split('\t')
    rows = []
    for l in lines[1:]:
        c = l.split('\t')
        rows.append({h: (c[i] if i < len(c) else '') for i, h in enumerate(head)})
    return rows


pd2 = MPQ(os.path.join(GAME, 'ProjectD2', 'pd2data.mpq'))

# ---- strings: vanilla -> expansion -> patch -> PD2 (later wins)
strings = {}
for arc, names in [('d2data.mpq', ['string.tbl']), ('d2exp.mpq', ['expansionstring.tbl']),
                   ('patch_d2.mpq', ['patchstring.tbl']),
                   ('ProjectD2/pd2data.mpq', ['string.tbl', 'expansionstring.tbl', 'patchstring.tbl'])]:
    m = pd2 if 'pd2data' in arc else MPQ(os.path.join(GAME, arc))
    for n in names:
        d = m.read(B.join(['data', 'local', 'lng', 'eng', n]))
        if d:
            strings.update(tbl(d))


def clean(s):
    s = re.sub('\xffc.', '', s or '')
    # multi-line strings in D2 are stored bottom-up; the item name is the last line
    return s.split('\n')[-1].strip()


def S(key):
    return clean(strings.get(key, key))


# ---- item types
types = {r['Code']: r for r in excel(pd2, 'ItemTypes.txt') if r['Code']}


def ancestors(t, seen):
    if not t or t in seen or t not in types:
        return seen
    seen.add(t)
    ancestors(types[t]['Equiv1'], seen)
    ancestors(types[t]['Equiv2'], seen)
    return seen


KW = {'HELM': ['helm'], 'CIRC': ['circ'], 'CHEST': ['tors'], 'SHIELD': ['shld'], 'GLOVES': ['glov'],
      'BOOTS': ['boot'], 'BELT': ['belt'], 'ARMOR': ['armo'], 'AXE': ['axe'], 'CLUB': ['club'],
      'TMACE': ['mace'], 'SWORD': ['swor'], 'DAGGER': ['knif'], 'THROWING': ['thro'], 'JAV': ['jave'],
      'SPEAR': ['spea'], 'POLEARM': ['pole'], 'BOW': ['bow'], 'XBOW': ['xbow'], 'STAFF': ['staf'],
      'WAND': ['wand'], 'SCEPTER': ['scep'], 'DIN': ['ashd'], 'NEC': ['head'], 'SIN': ['h2h'],
      'SOR': ['orb'], 'BAR': ['phlm'], 'DRU': ['pelt'], 'ZON': ['amaz'], 'WEAPON': ['weap'],
      'QUIVER': ['misl'], 'JEWELRY': ['ring', 'amul'], 'CHARM': ['char']}
CLASSKW = ['DIN', 'NEC', 'SIN', 'SOR', 'BAR', 'DRU', 'ZON']

GEMTYPES = {'v': 1, 'w': 2, 'g': 3, 'r': 4, 'b': 5, 'y': 6}
GEMLVL = {'c': 1, 'f': 2, 's': 3, 'l': 4, 'z': 4, 'p': 5}


def gem_info(code):
    base = code[:-1] if len(code) == 4 and code.endswith('s') else code
    skulls = {'skc': 1, 'skf': 2, 'sku': 3, 'skl': 4, 'skz': 5}
    if base in skulls:
        return skulls[base], 7
    if len(base) == 3 and base[0] == 'g' and base[2] in GEMTYPES and base[1] in GEMLVL:
        return GEMLVL[base[1]], GEMTYPES[base[2]]
    return None


NAME_COLORS = {'0': 'WHITE', '1': 'RED', '2': 'GREEN', '3': 'BLUE', '4': 'GOLD', '5': 'GRAY', '6': 'BLACK',
               '7': 'TAN', '8': 'ORANGE', '9': 'YELLOW', ':': 'DARK_GREEN', ';': 'PURPLE'}
items = {}


def add(rows, kind):
    for r in rows:
        code = r.get('code')
        if not code or code in items or r['name'] in ('Expansion', ''):
            continue
        anc = set()
        for t in (r.get('type'), r.get('type2')):
            ancestors(t, anc)
        flags = [k for k, v in KW.items() if anc & set(v)]
        if 'CIRC' in flags and 'HELM' in flags:
            flags.remove('HELM')
        if any(c in flags for c in CLASSKW):
            flags.append('CLASS')
        name = S(r.get('namestr') or code)
        if not name or name == code:
            name = r['name']
        it = {'n': name, 'k': kind, 't': r.get('type', ''), 'f': flags}
        # Some names carry their own in-game color code (e.g. runes are orange)
        mc = re.match('\xffc(.)', strings.get(r.get('namestr') or code, ''))
        if mc and mc.group(1) in NAME_COLORS:
            it['nc'] = NAME_COLORS[mc.group(1)]
        if kind in ('weapon', 'armor'):
            it['tier'] = ('NORM' if code == r['normcode'] else 'EXC' if code == r['ubercode']
                          else 'ELT' if code == r['ultracode'] else 'NORM')
            try:
                it['ms'] = int(r['gemsockets'] or 0)
                it['lvl'] = int(r['level'] or 0)
            except ValueError:
                pass
            # Base stats for the in-game style tooltip (only non-zero values are kept)
            cols = (['mindam', 'maxdam', '2handmindam', '2handmaxdam', 'minmisdam', 'maxmisdam', 'reqdex']
                    if kind == 'weapon' else ['minac', 'maxac', 'block'])
            stats = {}
            for c in cols + ['reqstr', 'levelreq', 'durability', 'speed']:
                try:
                    v = int(r.get(c) or 0)
                except ValueError:
                    v = 0
                if v:
                    stats[c] = v
            if kind == 'weapon':
                if r.get('2handed') == '1' and r.get('1or2handed') != '1':
                    stats['twohand'] = 1
                if r.get('nodurability') == '1':
                    stats.pop('durability', None)
            it['s'] = stats
            if types.get(r.get('type')):
                it['tn'] = types[r['type']]['ItemType']
        if r.get('stackable') == '1':
            it['st'] = 1  # has a quantity (QTY) in filters
        if kind == 'misc':
            mr = re.fullmatch(r'r(\d\d)s?', code)
            if mr:
                it['rune'] = int(mr.group(1))
            g = gem_info(code)
            if g:
                it['gem'], it['gemtype'] = g
            mt = re.fullmatch(r't([1-5])[0-9a-z]', code)
            if mt:
                it['maptier'] = int(mt.group(1))
        items[code] = it


add(excel(pd2, 'Weapons.txt'), 'weapon')
add(excel(pd2, 'Armor.txt'), 'armor')
add(excel(pd2, 'Misc.txt'), 'misc')

fmt = PropFormatter(lambda n: excel(pd2, n), S)


def int0(v):
    try:
        return int(v or 0)
    except ValueError:
        return 0


uniques = []
for r in excel(pd2, 'UniqueItems.txt'):
    if r.get('enabled') != '1' or not r.get('code'):
        continue
    # p: property lines shown when identified, rl: required level
    uniques.append({'n': S(r['index']), 'c': r['code'], 'lvl': int0(r['lvl']), 'rl': int0(r.get('lvl req')),
                    'p': fmt.lines(r, 12)})
sets = []
for r in excel(pd2, 'SetItems.txt'):
    if not r.get('item') or not r.get('index') or r['index'] == 'Expansion':
        continue
    # sb: partial set bonuses, e.g. "+50 to Life (2 Items)"
    sets.append({'n': S(r['index']), 's': S(r['set']), 'c': r['item'], 'rl': int0(r.get('lvl req')),
                 'p': fmt.lines(r, 9), 'sb': fmt.set_bonuses(r)})

pal = MPQ(os.path.join(GAME, 'd2data.mpq')).read(B.join(['data', 'global', 'palette', 'ACT1', 'pal.dat']))
palette = ['#%02x%02x%02x' % (pal[i * 3 + 2], pal[i * 3 + 1], pal[i * 3]) for i in range(256)]

# ---- curated sounds offered in the picker: (id, label, group)
G1, G2, G3, G4 = 'PD2 drop sounds', 'Quest & objects', 'Item sounds', 'Voices & monsters'
SOUNDS = [(4714 + i, 'Drop Tink %d' % (i + 1), G1) for i in range(16)] + [
    (35, 'Hellforge Smash', G2), (34, 'Hellforge Place', G2), (27, "Anya's Steam", G2),
    (418, 'Cairn Stones Success', G2), (14, 'Quest Complete', G2), (7, 'Level Up', G2),
    (2669, 'Gem Shrine', G2), (2667, 'Experience Shrine', G2), (2548, 'Special Chest', G2),
    (29, 'Ancients Cloud', G2),
    (242, 'Rune', G3), (217, 'Gem', G3), (226, 'Jewel', G3), (241, 'Ring', G3), (205, 'Amulet', G3),
    (214, 'Charm', G3), (240, 'Rare', G3), (221, 'Gold', G3), (248, 'Whip Crack', G3),
    (619, 'Blood Raven Mist (start)', G4), (621, 'Blood Raven Mist (end)', G4),
    (1123, 'Greater Mummy Resurrect', G4), (913, 'Fallen War Cry', G4), (705, 'Dark Wanderer Death', G4),
    (3918, 'Gheed "Good day"', G4), (4609, 'Soldier "Let us out!"', G4), (4610, 'Soldier "Over here!"', G4),
    (4700, 'Butcher "Fresh meat"', G4), (4701, 'Leoric Taunt', G4), (4734, 'Na-Krul Taunt', G4),
    (766, 'Diablo Yell', G4), (447, 'Andariel Death', G4), (1292, 'Mephisto Death', G4), (1209, 'Izual Death', G4),
]
snd_rows = excel(pd2, 'Sounds.txt')
sounds, manifest = [], []
os.makedirs(SOUND_DIR, exist_ok=True)
for sid, label, group in SOUNDS:
    row = snd_rows[sid]
    sounds.append({'id': sid, 'label': label, 'group': group, 'key': row['Sound']})
    out = os.path.join(SOUND_DIR, '%d.wav' % sid)
    if not os.path.exists(out):
        # speech (act*/ folders) lives under data/local/sfx, everything else under data/global/sfx
        area = 'local' if re.match(r'act\d', row['FileName'], re.I) else 'global'
        manifest.append(B.join(['data', area, 'sfx', row['FileName']]) + '|' + out.replace('/', B))
sound_names = {i: r['Sound'] for i, r in enumerate(snd_rows) if r.get('Sound')}

if manifest:
    mf = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_manifest.txt')
    open(mf, 'w').write('\n'.join(manifest))
    ps = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    r = subprocess.run([ps, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extract_wav.ps1'),
                        '-Manifest', mf, '-GameDir', GAME.replace('/', B)], capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip())
    os.remove(mf)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
# Every item code the game has right now (all rows, even unnamed ones). The builder's safety net
# shows any item whose code isn't in this list, i.e. items added to PD2 after this data was built.
all_codes = sorted({r['code'] for t in ('Weapons.txt', 'Armor.txt', 'Misc.txt') for r in excel(pd2, t) if r.get('code')})

json.dump({'items': items, 'uniques': uniques, 'sets': sets, 'palette': palette, 'sounds': sounds, 'allCodes': all_codes,
           'soundNames': sound_names}, open(OUT, 'w'), separators=(',', ':'))
print('items', len(items), 'uniques', len(uniques), 'sets', len(sets), 'sounds', len(sounds),
      '->', OUT, os.path.getsize(OUT))
