# Roofoo’s PD2 Loot Filter

**Edited and maintained by:**  
- [Enpherno](https://twitch.tv/Enpherno)  
- [RoofooEvazan](https://twitch.tv/RoofooEvazan)

A selectively customized fork of **[Kryszard](https://twitch.tv/Kryszard)’s Project Diablo 2 loot filter**.

This filter preserves Kryszard’s original structure and philosophy while adding **targeted late-game refinements**, stricter **FL7+/FL8+ filtering**, reduced ground clutter, and clearer base and quality visibility for end-game farming and mapping.

All changes are incremental and intentional, designed to enhance high-level play without sacrificing the clarity, information density, or reliability of the original filter.

👉 **Full credit to Kryszard** for the base loot filter.

---

## 🔄 Changelog
**Current Version:** 13.0.8  
**Updated:** May 15, 2026  

13.0.8 - May 15, 2026

Added details for what each crafting recipe gives. Information is shown on Crafting Infusions for said craft.

13.0.7 - May 11, 2026

The following now hide on FL8 & 9
- Magic/Rare Non-eth Arreat style only show now
- Magic/Rare Eth Thunder maul styles now show

The following now changed forr all filters
- Moved some runes to 1 star (Ral, Tir, Tal, Sol, Amn, Lum)
- Arach, Shako, Marrowalks and Valk Wing are all now 1-star
  
13.0.6 - May 9, 2026

The following now show on FL8 & 9
- Magic and Rare Barb helms *Wasn't working properly on last update*


13.0.5 - May 8, 2026

The following now hide on FL8 & 9
- Magic/Rare non-eth claws
- Set Amulets

The following now hide on FL9 only
- Antidotes
- Set Rings

The following now show on FL8 & 9
- Magic and Rare Barb helms
- Magic and Rare War, Rune and Archon staves

13.0.4 - May 3, 2026
- Removed set ammy's from showing in FL8 & 9
- Cube now displays rune prices for runes which prices may adjust through the season (Ohm, Lo, Jah, Cham, Zod)
- Demonic cube added to the Little Bastard bucket in the Mystery Filter
- Currency values added to Demonic Cube matching other currencies
- Fixed an issue where the Lucky/Little/Big Bastard name was overwriting the items name while in the cube or inventory

13.0.3 - May 2, 2026
- Added Filter Level 9 which is the same as FL8 however hides all Large Charms

Filter Level 8
- Reduced non-eth rare Necro heads to No Star
- Now shows non-eth magic Aegis, Ward, and Monarch shields
- Now hides eth magic wands and eth rare boots

---

## 💡 What This Filter Is About

- Clean, readable loot presentation  
- Smart highlighting for actually valuable items  
- Strict endgame filtering (FL8) without losing safety in town  
- Helpful stat summaries so you don’t need to ID everything blindly  
- Built for real gameplay, not just theorycrafting  

---

## 🩸 BASTARD MYSTERY DROPS

The RoofooBastardMystery filter fork includes a Bastard Mystery System for selected high-value drops.

When these items drop unidentified outside of town, the filter hides the real item name and replaces it with a mystery label + custom sound.
This keeps big drops exciting while still allowing the item to be safely identified once brought back to town.

### Mystery Labels

| Mystery Label | Applies To | Included Drops |
| --- | --- | --- |
| Little Bastard | Lower mystery drops | Larzuk's Puzzlebox, Vex Rune, Ohm Rune, Lo Rune, Skeleton Key, Demonic Cube |
| Lucky Bastard | Higher mystery drops | Sur Rune, Ber Rune, Jah Rune, Cham Rune, Zod Rune, Vial of Lightsong, Lilith's Mirror, Horadrim Navigator, Horadrim Almanac, Tyrael's Might / Templar's Might |
| HOLY MOLY | Boss-arena-only boss uniques | The Third Eye, Cage of the Unsullied, Band of Skulls, Aidan's Scar, Dark Abyss, Itherael's Path, Overlord's Helm, Hadriel's Hand |
| Big Bastard | 3-star uniques | Mang Song's Lesson, Griffon's Eye, Veil of Steel / Nightwing's Veil |
| Big Bastard | ETH 3-star uniques | Mang Song's Lesson, Doombringer, Executioner's Justice, The Grandfather, The Cranium Basher / Earth Shifter, Steel Pillar, Tomb Reaver, The Reaper's Toll, Stormspire, Schaefer's Hammer / Stone Crusher, Bloodtree Stump, Tyrael's Might / Templar's Might, Veil of Steel / Nightwing's Veil, Purgatory, Steel Carapace |

### 📝 Notes

- 🎯 Bastard Mystery drops only trigger outside town  
- 🏟️ Boss unique mystery drops only trigger inside boss arenas  
- 🔊 All mystery drops use a custom sound cue  
- 🏠 Returning to town reveals the item name normally  

#### Bastard Mystery Drop Examples
[![Bastard Example](screenshots/MysteryExample2.jpg)](screenshots/MysteryExample2.jpg)

---

## ⭐ ITEMS – UNIQUE & SET

### Simplified Tiering System

All Unique and Set items are now grouped into easy-to-understand tiers:

- ⭐ No Star (low priority)  
- ⭐⭐ 1-Star (situational / niche)  
- ⭐⭐⭐ 3-Star (good items)  
- ⭐⭐⭐📦 3-Star Pickup (always worth grabbing)  

All items and tiers can be easily viewed at https://docs.google.com/spreadsheets/d/1AS-dQqCeaY0zxShYd6qVlFXGqRtlsRKtRBPwFgL5Sws/edit?usp=sharing

### What Changed

- Cleaned up and unified all tier logic  
- Removed old LoD vs PD2 split  
- Updated tiers to match current endgame expectations  

### FL8 Behavior (Strict Mode)

- ❌ Unlisted unidentified Uniques/Sets are hidden outside town  
- ✅ Still visible in town (so you never lose items permanently)  
- ✅ Special items (like unique maps & Uber drops) are always handled safely  

### Special Touches

- Enpherno Bastard Sword meme highlight lives on  
- Uber/DClone drops handled with map-specific logic  

---

## 👢 BOOTS (RARE / CRAFTED / SET / UNIQUE)

This is one of the biggest QoL upgrades.

### 🔥 Resistance Summary System

- Total resistances now show directly on the ground item name  

### 🧠 Smart Labels

- Dual Res  
- Tri Res  
- Quad Res  

### 🎨 Color Scaling

- 🔴 Low (<70) → Red  
- 🟠 Medium (70–90) → Orange  
- 🟢 High (90+) → Green  

### Examples

#### Dual Res Example
[![Dual Res Example](screenshots/BootDualResExample.jpg)](screenshots/BootDualResExample.jpg)

#### Tri Res Example
[![Tri Res Example](screenshots/BootTriResExample.jpg)](screenshots/BootTriResExample.jpg)

#### Quad Res Example
[![Quad Res Example](screenshots/BootQuadResExample.jpg)](screenshots/BootQuadResExample.jpg)

---

## 🟡 RARES & 🟠 CRAFTED ITEMS

- Same resistance system as boots applied where relevant  
- Cleaned-up tooltip info  
- Easier to evaluate value vs junk  

---

## 🗺️ MAPS – HUGE UPGRADE

Maps now actually tell you what matters before you enter.

### ⚔️ Debuff Intelligence

- **Block reduction** → Shows your actual block chance after map debuffs  
- **FHR reduction** → Shows real FHR + frame loss if applicable  
- **All res reduction** → Shows character resistances after the map debuff is applied
  
👉 These only display when rolled on the map  

---

### 👹 Monster Roll Alerts

Quick tags show dangerous or notable spawns:

- MoD (Minions of Destruction)  
- Dolls 💀  
- Souls ⚡  
- Cows 🐄  
- Ghosts  
- Witches  
- Fetishes  
- Vampire Lords  
- Reanimated Horde  
- Extra Boss rolls  

---

### 🛡️ Resistance Display Upgrade

- Shows highest monster resistance values  
- 100+ still highlights immunity  

#### Map Debuff & Mob Smart Labeling
[![Map Debuff & Mob Smart Labeling Example](screenshots/MapSmartFilterExample.jpg)](screenshots/MapSmartFilterExample.jpg)
[![Map Debuff & Mob Smart Labeling 2 Example](screenshots/MapSmartFilterExample2.jpg)](screenshots/MapSmartFilterExample2.jpg)

---

### ⚔️ Dynamic Best In Slot Slams - BETA FEATURE FOR NOW

- Added dynamic BIS slams to each weapon which are updated every 6 hours based on the last 48 hours of listings

[![BIS Slam Example](screenshots/BISSlamExample.jpg)](screenshots/BISSlamExample.jpg)
[![BIS Slam Example](screenshots/BISSlamExample2.jpg)](screenshots/BISSlamExample2.jpg)

---

### ⚔️ Dynamic Rune Prices - BETA FEATURE FOR NOW

- Added dynamic rune prices to each stackable rune which are updated every 6 hours
- Values show are median values of the listings recorded in the last 24 Hours, 48 Hours, 72 Hours and 1 Week.

[![Rune Price Example](screenshots/RunePriceExample3.jpg)](screenshots/RunePriceExample3.jpg)
[![Rune Price Example2](screenshots/RunePriceExample4.jpg)](screenshots/RunePriceExample4.jpg)

---

## 🔊 SOUND SYSTEM

- ❌ No Star / 1-Star → No sound  
- ⭐⭐⭐ → Notification sound  
- ⭐⭐⭐📦 → Strong alert  

👉 Less noise, more signal  

---

## 🚫 FILTER LEVEL 8 (STRICT MODE)

### Behavior

- Aggressively hides low-value clutter  
- Hides unlisted Uniques/Sets outside town only  
- Keeps everything visible in town  

👉 Maximum efficiency without risk  

---

## 🧹 QUALITY OF LIFE

### 💰 Sell Value Cleanup

- Displays as `$35K` instead of long numbers  

### 🧼 General Improvements

- Cleaner internal structure  
- Easier future updates  

Removed:

- DPS display experiments  
- Ground-name spacing tests  
- Formatting leftovers  

---

## 🎯 WHO THIS FILTER IS FOR

- Players pushing maps and endgame content  
- Anyone tired of loot clutter  
- Players who want smart info at a glance  
- Players who enjoy clean visuals + useful data  

---

## 🚀 FINAL NOTE

This filter is built from real gameplay experience—not just theory.

It evolves every season to stay aligned with:

- PD2 balance changes  
- Meta shifts  
- What actually matters in real gameplay  

---

## 📸 Screenshot Examples

### Charm & Jewel Examples
[![Charm & Jewel examples](screenshots/Jewel&Charms.png)](screenshots/Jewel&Charms.png)

### Meme Enpherno Bastard Sword Drop Example
[![Meme Bastard Sword example](screenshots/MemeBastardSword.png)](screenshots/MemeBastardSword.png)

### Notification Example
[![Notification examples](screenshots/DropNotifications.png)](screenshots/DropNotifications.png)

### Fire Golem Shop Highlight Example
[![Fire Golem Shop Highlight example](screenshots/FGShop.png)](screenshots/FGShop.png)
