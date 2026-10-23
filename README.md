# Roofoo’s PD2 Loot Filter

A loot filter for **Project Diablo 2**, built for late-game farming and mapping: strict levels that cut ground clutter, clear star tiers for uniques and sets, and useful item info right on the label. It started as a fork of **[Kryszard](https://twitch.tv/Kryszard)’s filter** and keeps its structure and philosophy. 👉 **Full credit to Kryszard** for the base filter.

**Maintained by** [RoofooEvazan](https://twitch.tv/RoofooEvazan) and [Enpherno](https://twitch.tv/Enpherno)

**Current version:** Season 14 (October 2026)

🎨 [Filter Builder](https://roofooevazan.github.io/Roofoo-s-PD2-Loot-Filter/) · 🐞 [Report a problem](https://github.com/RoofooEvazan/Roofoo-s-PD2-Loot-Filter/issues)

---

## Contents

- [What's new in Season 14](#-whats-new-in-season-14)
- [Getting the filter](#-getting-the-filter)
- [Filter levels](#%EF%B8%8F-filter-levels)
- [Unique & set tiers](#-unique--set-tiers)
- [Holy grail](#-holy-grail)
- [Mystery drops](#-mystery-drops)
- [Make it yours: Filter Builder](#-make-it-yours-filter-builder)
- [Maps](#%EF%B8%8F-maps)
- [Live market prices](#-live-market-prices)
- [Item info & quality of life](#-item-info--quality-of-life)
- [Screenshots](#-screenshots)

---

## ✨ What's new in Season 14

- **Holy grail tracking.** Uniques and sets you haven't found yet are tagged so you notice them. Ones you've already found step aside outside town.
- **Nothing gets lost in town.** Every item shows in town. If your filter level would hide it outside, it tells you so.
- **Identified uniques and sets always show,** on every filter level.
- **Uniques never vanish on the strict levels.** Lower-value uniques now show quietly instead of being hidden.
- **New staff mod bases.** A fresh list of white and grey skill weapons worth keeping, highlighted on every filter level.
- **Season 14 items.** New uniques, sets, maps and items are covered, along with the new rune and gem stacks.
- **Quest items always show,** in and out of town, and they stay out of the grail.
- **A cleaner, faster filter.** Leftover rules were tidied up, typos fixed, and junk gems follow the same rules on every level.
- **Smarter slam prices.** The "not worth slamming" hint comes back once the first week of the season has given the market enough data.

---

## 📥 Getting the filter

**From the PD2 launcher (recommended).** Open the loot filter settings, pick **Roofoo's Filter** from the online list, then choose a file below. The launcher version updates on its own and includes the live market prices.

| File | What it is |
| --- | --- |
| `Roofoo.filter` | The main filter. |
| `RoofooMystery.filter` | The main filter plus [Mystery drops](#-mystery-drops): big drops hide their name outside town. |
| `RoofooSlamfestBETA.filter` | Beta. The main filter plus a town "slamfest" mode on FL9 that shows the best corruptions and their prices for identified uniques and sets. |

**Your own version.** Use the [Filter Builder](#-make-it-yours-filter-builder) to change colors, sounds, tiers and what shows on each level, then put the downloaded file in `Diablo II\ProjectD2\filters\local\` and pick it under **Local** in the launcher.

---

## 🎚️ Filter levels

Pick the level in game. The Horadric Cube's tooltip shows which one is active.

| Level | Name |
| --- | --- |
| FL0 | Show All Items |
| FL1 | Hide Just Trash Items |
| FL2 | More Notify |
| FL3 | More Notify - w/o Potions |
| FL4 | Recommended |
| FL5 | Recommended - w/o Potions |
| FL6 | Strict Filter |
| FL7 | Strict Filter - w/o Potions |
| FL8 | Max-Strictness Filter - Ultra Strict End Game |
| FL9 | Max-Strictness Filter - No Large Charms |

**Everything shows in town.** On every level, items in town, in shops, your inventory, cube and stash stay visible. Anything your level would hide outside town says so on its label.

**FL8 and FL9 (strict mode)** hide low-value clutter outside town:

- Uniques, sets and runewords always pass. Lower-value uniques show quietly instead of with stars.
- White bases, magic and rare gear only show when they're worth a look, such as good sockets or enhanced defense/damage, staff mod bases, and selected magic and rare bases.
- Set amulets are hidden.

**FL9** is FL8 plus it hides magic Large Charms, set rings and antidote potions outside town.

---

## ⭐ Unique & set tiers

Every unique and set item gets a tier by the base it drops on. The tier decides its look, minimap marker and sound, and it can differ between the season-start levels (FL1–FL7) and the strict levels (FL8–FL9).

| Tier | Meaning | Look | Sound |
| --- | --- | --- | --- |
| No star | Low priority | Small minimap marker | None |
| 1 star | Situational / niche | Stars and a minimap marker | None |
| 3 star | Good items | Decorated name and minimap marker | Notification |
| 3 star pickup | Always worth grabbing | Big border, "pick … up" label | Strong alert |

Less noise, more signal: only 3-star items and up make a sound. Tiers are reviewed at the start of each season against the market.

**Special drops**

- **HOLY MOLY:** uber boss uniques (e.g. The Third Eye, Cage of the Unsullied, Band of Skulls, Overlord's Helm) get their own label and sound.
- Uber and DClone materials are handled with map-specific logic.
- Enpherno's Bastard Sword meme highlight lives on.

---

## 🏆 Holy grail

New in Season 14. The filter knows which uniques and sets you've already found:

- **Not found yet:** the item is tagged **[GRAIL]** with its own border and sound, on top of its normal tier.
- **Already found:** it steps aside outside town while it's unidentified, unless its tier says it's worth showing anyway. In town, and once identified, it always shows.
- Items that could be one of several uniques count as new until you've found all of them.
- Quest items are never part of the grail.

---

## 🩸 Mystery drops

In `RoofooMystery.filter`, selected high-value drops hide their real name while they're unidentified outside town. You see a mystery label and hear a custom sound instead, and find out what it is back in town.

| Label | Applies to | Drops |
| --- | --- | --- |
| Little Bastard | Lower mystery drops | Vex, Ohm and Lo runes, Larzuk's Puzzlebox, Skeleton Key, Demonic Cube |
| Lucky Bastard | Higher mystery drops | Sur, Ber, Jah, Cham and Zod runes, Vial of Lightsong, Lilith's Mirror, Horadrim Navigator, Horadrim Almanac, Tyrael's Might / Templar's Might |
| Big Bastard | 3-star uniques | Mang Song's Lesson, Griffon's Eye, Veil of Steel / Nightwing's Veil |
| Big Bastard | Ethereal 3-star uniques | Mang Song's Lesson, Doombringer, Executioner's Justice, The Grandfather, The Cranium Basher / Earth Shifter, Steel Pillar, Tomb Reaver, The Reaper's Toll, Stormspire, Schaefer's Hammer / Stone Crusher, Bloodtree Stump, Tyrael's Might / Templar's Might, Veil of Steel / Nightwing's Veil, Purgatory, Steel Carapace |
| HOLY MOLY | Uber boss uniques, only inside the boss arenas | The Third Eye, Cage of the Unsullied, Band of Skulls, Aidan's Scar, Dark Abyss, Itherael's Path, Overlord's Helm, Hadriel's Hand |

- Mystery labels only show outside town. Returning to town reveals the item's name.
- Every mystery label has its own sound.
- With the Filter Builder you can change which drops are mysteries and how each label looks and sounds.

[![Mystery drop example](screenshots/MysteryExample2.jpg)](screenshots/MysteryExample2.jpg)

---

## 🎨 Make it yours: Filter Builder

**[Open the Filter Builder](https://roofooevazan.github.io/Roofoo-s-PD2-Loot-Filter/)**: no filter code needed.

- **Colors & sounds:** pick a color theme (Classic, Ember, Frost, Venom, Royal, High Contrast) or restyle any single highlight, and choose drop sounds with previews in your browser.
- **Items:** every unique, set, rare, magic, base, rune, gem and potion in collapsible sections. Change star tiers, turn Mystery drops on or off, and show or hide anything per filter level, narrowed by ethereal, sockets, superior, item level or character level.
- **Test an item** and **Overview & review:** see how any item looks on every filter level, or everything your filter shows and hides, with in-game style item cards on hover.
- **Save & install:** download your `.filter`, share your setup as a link, or load it back later.

The builder always starts from the newest version of this filter, so come back after an update and download again. Your choices are saved in your browser.

Custom versions leave out the [live market prices](#-live-market-prices), which only stay current in the launcher version, and always show items newer than the filter, marked `[Missing]`.

[![Filter Builder: Items](screenshots/BuilderItems.png)](screenshots/BuilderItems.png)

---

## 🗺️ Maps

Maps tell you what matters before you enter.

**Debuffs, worked out for you** (only shown when the map rolled them):

- **Block reduction:** your real block chance after the debuff.
- **FHR reduction:** your real FHR, and frame loss if any.
- **All resistance reduction:** your resistances after the debuff.

**Monster alerts:** quick tags for dangerous or notable spawns: Minions of Destruction, Dolls 💀, Souls ⚡, Cows 🐄, Ghosts, Witches, Fetishes, Vampire Lords, Reanimated Horde and extra boss rolls.

**Monster resistances:** the highest monster resistance values, with 100+ still highlighted as immune.

[![Map debuff and monster labels](screenshots/MapSmartFilterExample.jpg)](screenshots/MapSmartFilterExample.jpg)
[![Map debuff and monster labels 2](screenshots/MapSmartFilterExample2.jpg)](screenshots/MapSmartFilterExample2.jpg)

---

## 💹 Live market prices

Market values from PD2's own market listings and [PD2 Trader](https://pd2trader.com), refreshed in this repository every 6 hours:

- **Rune prices:** median values over the last 24 hours, 48 hours, 72 hours and 1 week on rune stacks, with the current high-rune values on the Horadric Cube.
- **Best-in-slot slams:** on FL8, identified uniques and sets show their most valuable corruption and its price range, based on the last 48 hours of listings.
- **Rainbow Facet values** by type and roll, plus key and boss material values.

These only work in the **launcher version**, which gets the updates automatically. Custom versions made with the Filter Builder leave them out instead of letting them go stale.

| BIS slams | Rune prices |
| --- | --- |
| [![BIS slam example](screenshots/BISSlamExample.jpg)](screenshots/BISSlamExample.jpg) | [![Rune price example](screenshots/RunePriceExample3.jpg)](screenshots/RunePriceExample3.jpg) |
| [![BIS slam example 2](screenshots/BISSlamExample2.jpg)](screenshots/BISSlamExample2.jpg) | [![Rune price example 2](screenshots/RunePriceExample4.jpg)](screenshots/RunePriceExample4.jpg) |

---

## 🧹 Item info & quality of life

- **Resistance summaries:** boots, and rare and crafted gear where it matters, show their total resistances on the ground label (Dual, Tri or Quad Res), colored low, medium or high.
- **Short sell values:** vendor prices show as `$35K` instead of long numbers.
- **Base notes:** white bases show their maximum sockets, which runewords fit, and cube upgrade recipes with the requirements after upgrading.
- **Staff mod bases:** white and grey skill weapons worth keeping get a note saying what they're good for.
- **Runes and gems:** runes list the runewords that use them; gems show their cube recipes.
- **Charm tags:** grand, large and small charms are tagged by their useful stats (life, FHR, resistances, skills and more).
- **Crafting infusions** show what each craft gives.
- **Shop hunting:** vendor items worth buying are highlighted, from high-skill staff mods to Fire Golem items.

| Dual res | Tri res | Quad res |
| --- | --- | --- |
| [![Dual res example](screenshots/BootDualResExample.jpg)](screenshots/BootDualResExample.jpg) | [![Tri res example](screenshots/BootTriResExample.jpg)](screenshots/BootTriResExample.jpg) | [![Quad res example](screenshots/BootQuadResExample.jpg)](screenshots/BootQuadResExample.jpg) |

---

## 📸 Screenshots

### In game

**Drop notifications**
[![Notification examples](screenshots/DropNotifications.png)](screenshots/DropNotifications.png)

**Charms & jewels**
[![Charm and jewel examples](screenshots/Jewel&Charms.png)](screenshots/Jewel&Charms.png)

**Fire Golem shop highlight**
[![Fire Golem shop highlight](screenshots/FGShop.png)](screenshots/FGShop.png)

**Enpherno's Bastard Sword meme drop**
[![Meme Bastard Sword example](screenshots/MemeBastardSword.png)](screenshots/MemeBastardSword.png)

### Filter Builder

**Colors & sounds:** color themes, drop sounds and every highlight style
[![Filter Builder: Colors & sounds](screenshots/BuilderColorsSounds.png)](screenshots/BuilderColorsSounds.png)

**Test an item:** how one item looks on every filter level
[![Filter Builder: Test an item](screenshots/BuilderTestItem.png)](screenshots/BuilderTestItem.png)

**Overview & review:** everything hidden (red) and shown (green) on a filter level, by rarity, sockets and item level
[![Filter Builder: Overview & review](screenshots/BuilderOverview.png)](screenshots/BuilderOverview.png)

**Save & install:** download, install steps and the new-item safety net
[![Filter Builder: Save & install](screenshots/BuilderSaveInstall.png)](screenshots/BuilderSaveInstall.png)
