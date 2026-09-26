"""Turn UniqueItems/SetItems property codes into the lines the game shows on an identified item.

This follows the game's own description tables (ItemStatCost.txt descfunc/descval/descstr*),
with special cases for the properties that the game describes in a custom way (damage ranges,
skills, chance-to-cast, charges, auras). Variable rolls are shown as a range, e.g. "+200-275%".
"""
import re

CLASSES = {'ama': 'Amazon', 'sor': 'Sorceress', 'nec': 'Necromancer', 'pal': 'Paladin', 'bar': 'Barbarian',
           'dru': 'Druid', 'ass': 'Assassin'}
CLASS_ORDER = ['Amazon', 'Sorceress', 'Necromancer', 'Paladin', 'Barbarian', 'Druid', 'Assassin']
SKILL_TABS = ['Bow and Crossbow', 'Passive and Magic', 'Javelin and Spear', 'Fire', 'Lightning', 'Cold',
              'Curses', 'Poison and Bone', 'Summoning', 'Combat', 'Offensive Aura', 'Defensive Aura',
              'Combat', 'Masteries', 'Warcries', 'Summoning', 'Shape Shifting', 'Elemental',
              'Traps', 'Shadow Disciplines', 'Martial Arts']
ELEM = {'fire': 'Fire', 'ltng': 'Lightning', 'cold': 'Cold', 'mag': 'Magic', 'pois': 'Poison'}
EVENTS = {'hit-skill': 'on striking', 'gethit-skill': 'when struck', 'att-skill': 'on attack',
          'kill-skill': 'when you Kill an Enemy', 'death-skill': 'when you Die', 'levelup-skill': 'when you Level-Up'}


class PropFormatter:
    def __init__(self, excel, S):
        self.S = S  # string lookup (key -> English text)
        self.props = {r['code']: r for r in excel('Properties.txt') if r.get('code')}
        self.stats = {r['Stat']: r for r in excel('ItemStatCost.txt') if r.get('Stat')}
        self.skills_by_id, self.skills_by_name = {}, {}
        descs = {r['skilldesc']: r for r in excel('SkillDesc.txt') if r.get('skilldesc')}
        for r in excel('Skills.txt'):
            if not r.get('skill'):
                continue
            d = descs.get(r.get('skilldesc'))
            name = S(d['str name']) if d and d.get('str name') else r['skill']
            info = (name, CLASSES.get(r.get('charclass'), ''))
            self.skills_by_name[r['skill'].lower()] = info
            if r.get('Id', '').isdigit():
                self.skills_by_id[r['Id']] = info

    def skill(self, par):
        return self.skills_by_id.get(str(par)) or self.skills_by_name.get(str(par).lower()) or (str(par), '')

    @staticmethod
    def num(mn, mx):
        return f'{mn}' if mn == mx else f'{mn}-{mx}'

    def line(self, code, par, mn, mx):
        """-> (text, priority) or None"""
        try:
            mn = int(mn) if mn not in ('', None) else 0
            mx = int(mx) if mx not in ('', None) else mn
        except ValueError:
            return None
        v = self.num(mn, mx)
        plus = '' if mn < 0 else '+'
        m = re.fullmatch(r'dmg-(fire|ltng|cold|mag|pois)', code)
        if m:
            if m.group(1) == 'pois' and par:
                secs = int(par) / 25
                return (f'Adds {round(mn * int(par) / 256)}-{round(mx * int(par) / 256)} Poison Damage over {secs:g} Seconds', 150)
            return (f'Adds {mn}-{mx} {ELEM[m.group(1)]} Damage', 150)
        m = re.fullmatch(r'(fire|ltng|cold|mag|pois)-(min|max)', code)
        if m:
            return (f'+{v} to {"Minimum" if m.group(2) == "min" else "Maximum"} {ELEM[m.group(1)]} Damage', 149)
        special = {
            'dmg%': f'+{v}% Enhanced Damage', 'ac%': f'+{v}% Enhanced Defense', 'dmg-norm': f'Adds {mn}-{mx} Damage',
            'dmg-min': f'+{v} to Minimum Damage', 'dmg-max': f'+{v} to Maximum Damage', 'res-all': f'All Resistances {plus}{v}',
            'res-all-max': f'+{v}% to All Maximum Resistances', 'all-stats': f'+{v} to all Attributes',
            'allskills': f'+{v} to All Skills', 'sock': f'Socketed ({v})', 'ethereal': 'Ethereal (Cannot be Repaired)',
            'indestruct': 'Indestructible', 'nofreeze': 'Cannot Be Frozen', 'ac': f'+{v} Defense',
        }
        if code in special:
            return (special[code], 160)
        if code in CLASSES:
            return (f'+{v} to {CLASSES[code]} Skill Levels', 158)
        if code == 'skilltab' and str(par).isdigit() and int(par) < len(SKILL_TABS):
            cls = CLASS_ORDER[int(par) // 3]
            return (f'+{v} to {SKILL_TABS[int(par)]} Skills ({cls} Only)', 157)
        if code in ('skill', 'oskill', 'skill-rand'):
            name, cls = self.skill(par)
            return (f'+{v} to {name}' + (f' ({cls} Only)' if cls and code == 'skill' else ''), 156)
        if code in EVENTS:
            name, _ = self.skill(par)
            return (f'{mn}% Chance to cast level {mx} {name} {EVENTS[code]}', 155)
        if code == 'charged':
            name, _ = self.skill(par)
            return (f'Level {mx} {name} ({mn}/{mn} Charges)', 100)
        if code == 'aura':
            name, _ = self.skill(par)
            return (f'Level {v} {name} Aura When Equipped', 159)

        # Generic: describe through the first stat the property sets
        p = self.props.get(code)
        if not p:
            return None
        stat = p.get('stat1')
        st = self.stats.get(stat) if stat else None
        if not st:
            return None
        func = int(st.get('descfunc') or 0)
        dval = int(st.get('descval') or 0)
        strpos = self.S(st.get('descstrpos') or '')
        strneg = self.S(st.get('descstrneg') or '') or strpos
        s = strneg if mn < 0 else strpos
        s2 = self.S(st.get('descstr2') or '')
        prio = int(st.get('descpriority') or 0)
        if func == 0 or not s:
            return None
        if code.endswith('/lvl') or 'perlevel' in (stat or ''):
            # per-level properties: par is the value per level in eighths
            try:
                per = int(par) / 8
            except ValueError:
                per = 0
            return (f'+{per:g} per Character Level {s} {s2}'.strip(), prio)
        if func != 15 and abs(mx) < abs(mn):
            # a "max" below "min" isn't a range (e.g. splash stores 100 / 1); skill procs (func 15)
            # use min = chance and max = skill level, so they keep both numbers
            mx = mn
            v = self.num(mn, mx)
        av = v.lstrip('-') if mn < 0 else v
        if re.search(r'%[+]?d|%s', s):
            # Fill-in-the-blanks text: fill each blank in order. Skill-event stats (descfunc 15,
            # e.g. "%d%% Chance to cast level %d %s on block") take chance, skill level, skill name.
            if func == 15:
                args = [str(mn), str(mx), self.skill(par)[0]]
            else:
                args = [v] * 4
            it = iter(args)

            def fill(m):
                tok = m.group(0)
                if tok == '%%':
                    return '%'
                val = next(it, v)
                return f'{plus}{val}' if tok == '%+d' else val
            return (re.sub(r'%%|%\+d|%d|%s', fill, s), prio)
        if dval == 0 and func not in (3, 5, 6, 7, 8, 9, 11, 20, 21):
            txt = s  # the game shows only the text (e.g. "Melee Attacks Deal Splash Damage")
        elif func in (1, 12):
            txt = f'{plus}{v} {s}' if dval != 2 else f'{s} {plus}{v}'
        elif func == 2:
            txt = f'{v}% {s}' if dval != 2 else f'{s} {v}%'
        elif func == 3:
            txt = f'{v} {s}' if dval == 1 else (f'{s} {v}' if dval == 2 else s)
        elif func == 4:
            txt = f'{plus}{v}% {s}' if dval != 2 else f'{s} {plus}{v}%'
        elif func == 5:
            txt = f'{self.num(mn * 100 // 128, mx * 100 // 128)}% {s}'
        elif func in (6, 7, 8, 9):
            sign = '+' if func in (6, 8) else ''
            pct = '%' if func in (7, 8) else ''
            txt = f'{sign}{v}{pct} {s} {s2}'
        elif func == 11:
            txt = f'Repairs 1 Durability in {round(100 / max(mn, 1))} Seconds'
        elif func == 20:
            txt = f'-{av}% {s}'
        elif func == 21:
            txt = f'-{av} {s}'
        else:
            txt = f'{plus}{v} {s}' if dval != 2 else f'{s} {plus}{v}'
        return (re.sub(r'\s+', ' ', txt).strip(), prio)

    def lines(self, row, n=12, prefix=''):
        out = []
        for i in range(1, n + 1):
            code = row.get(f'{prefix}prop{i}')
            if not code:
                continue
            got = self.line(code, row.get(f'{prefix}par{i}', ''), row.get(f'{prefix}min{i}', ''), row.get(f'{prefix}max{i}', ''))
            if got:
                out.append(got)
        out.sort(key=lambda x: -x[1])
        # drop exact duplicates (e.g. split min/max pairs that describe the same thing)
        seen, res = set(), []
        for t, _ in out:
            if t not in seen:
                seen.add(t)
                res.append(t)
        return res

    def set_bonuses(self, row):
        """Partial set bonuses on a set item: (2 items) ... (5 items)."""
        out = []
        for k in range(1, 6):
            for ab in 'ab':
                code = row.get(f'aprop{k}{ab}')
                if not code:
                    continue
                got = self.line(code, row.get(f'apar{k}{ab}', ''), row.get(f'amin{k}{ab}', ''), row.get(f'amax{k}{ab}', ''))
                if got:
                    out.append(f'{got[0]} ({k + 1} Items)')
        return out
