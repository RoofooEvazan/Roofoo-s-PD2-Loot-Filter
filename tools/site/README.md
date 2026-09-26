# Filter Builder (GitHub Pages site)

The builder lives in `docs/` and is served by GitHub Pages at
https://roofooevazan.github.io/Roofoo-s-PD2-Loot-Filter/

Players pick a color theme, drop sounds, star tiers and per-filter-level show/hide choices,
then download their own `.filter`. The page always downloads the **latest** `Roofoo.filter`,
`RoofooMystery.filter` or `RoofooSlamfestBETA.filter` from the `main` branch, so every filter
update (including the automatic PD2 Trader price commits) reaches players with no extra work.

## Turning the site on

Repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`**.

## How it changes the filter

Nothing is rewritten. The builder makes small, targeted edits to the live filter text:

| Player choice | What changes in the filter |
| --- | --- |
| Star tiers | Base codes move between the `Alias[NSUNI1]`, `Alias[OSUNI1]`, `Alias[TSUNI1]`, `Alias[TPUNI1]` … lists (same for `SET` and `ETH`). |
| Theme / style tweaks | Colors, symbols, words and minimap markers on the tier, rune and special-drop display lines. |
| Sounds | The `%SOUNDID-…%` on the matching sound line (or one new `… !TOWN` sound line in the sound block). |
| Minimap markers | The `%DOT-D6%`-style token on every line in that marker group. |
| Show / hide | A clearly labelled block right after the Horadric Cube lines. Hides only apply outside town. |
| Mystery drops | Turning them on starts from `RoofooMystery.filter`. Bucket choices rewrite the `Alias[BASTARD_…]` lists; label styles and sounds edit the Little / Lucky / Big Bastard and HOLY MOLY lines. |

The downloaded file starts with a `BUILDER-PROFILE:` comment so a player can load it back into the builder later.

## Keeping it working when you edit the filter

The builder finds each style by its **rule condition text**, listed in `docs/js/themes.js`
(`TEXT_SLOTS` and `MARKER_SLOTS`). If you change the condition of one of those lines, update
`themes.js` too. If a style can't be found, the page tells players it can't be changed and
everything else keeps working.

The star tiers need the alias names to keep the pattern `(NS|OS|TS|TP)(UNI|SET)(ETH)?<number>`
and a code list like `((7gd OR uar) UNI !ETH !ID)`. An empty tier can be `(CLVL>999)`.

## Game data (item names, sounds)

`docs/data/game.json` and `docs/sounds/*.wav` come from a local PD2 install:

```
python tools/site/build_data.py "C:/Program Files/Diablo II"
```

It reads PD2's official archives (`pd2data.mpq`, `pd2assets.mpq` and the vanilla MPQs), not loose
`data/global/excel` overrides. Sounds are extracted with PD2's own `StormLib.dll` through the 32-bit
PowerShell (`extract_wav.ps1`). Re-run after a PD2 patch that adds items or sounds.

## Tests

```
node tools/site/test/engine.test.mjs
node tools/site/test/transform.test.mjs
node tools/site/test/extras.test.mjs
node tools/site/test/mystery.test.mjs
```

`engine.test.mjs` checks that a build with no changes reproduces each filter byte for byte and
prints how common items display on FL0–9.

## Running it locally

```
python -m http.server 8765
```

Then open http://localhost:8765/docs/. On localhost the page uses the filter files in your working copy
instead of GitHub, so you can test filter edits before pushing.
