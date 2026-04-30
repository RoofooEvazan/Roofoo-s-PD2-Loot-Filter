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
Current Version - 13.0.1 - Updated April 29th, 2026

The sections below document notable changes compared to the base Kryszard filter.

💡 What This Filter Is About
Clean, readable loot presentation
Smart highlighting for actually valuable items
Strict endgame filtering (FL8) without losing safety in town
Helpful stat summaries so you don’t need to ID everything blindly
Built for real gameplay, not just theorycrafting
⭐ ITEMS – UNIQUE & SET
Simplified Tiering System

All Unique and Set items are now grouped into easy-to-understand tiers:

⭐ No Star (low priority)
⭐⭐ 1-Star (situational / niche)
⭐⭐⭐ 3-Star (good items)
⭐⭐⭐📦 3-Star Pickup (always worth grabbing)
What Changed
Cleaned up and unified all tier logic
Removed old LoD vs PD2 split (no more confusion)
Updated tiers to match current endgame expectations
FL8 Behavior (Strict Mode)
❌ Unlisted unidentified Uniques/Sets are hidden outside town
✅ Still visible in town (so you never lose items permanently)
✅ Special items (like unique maps & Uber drops) are always handled safely
Special Touches
The Enpherno Bastard Sword meme highlight lives on
Uber/DClone drops are still handled with map-specific logic
👢 BOOTS (RARE / CRAFTED / SET / UNIQUE)

This is one of the biggest QoL upgrades.

🔥 Resistance Summary System

Boots now show total resistance at a glance, like:

Total resistances show up in the item name on the ground
🧠 Smart Labels
Dual Res
Tri Res
Quad Res
🎨 Color Scaling
🔴 Low (<70) → Red
🟠 Medium (70–90) → Orange
🟢 High (90+) → Green

### Dual Res Example
[![Dual Res Example](screenshots/BootDualResExample.jpeg)](screenshots/BootDualResExample.jpeg)

### Tri Res Example
[![Tri Res Example](screenshots/BootTriResExample.jpeg)](screenshots/BootTriResExample.jpeg)

### Quad Res Example
[![Quad Res Example](screenshots/BootQuadResExample.jpeg)](screenshots/BootQuadResExample.jpeg)

🟡 RARES & 🟠 CRAFTED ITEMS
Same resistance system as boots applied where relevant
Cleaned-up tooltip info
Easier to quickly evaluate value vs junk
🗺️ MAPS – HUGE UPGRADE

Maps now actually tell you what matters before you enter.

⚔️ Debuff Intelligence
Block reduction → This shows your characters actual block chance with the map debuff accounted for. It's fully dynamic and adjusts with different gear/character/stats/debuffs.
Faster Hit Recovery → This shows your characters actual FHR with the map debuff accounted for. Additionally, if the map debuff lowers your FHR frames, an additional tooltip will tell you how many frames you will lose.

Both of these debuffs only show up if your map rolls them. Allowing you to quickly reroll maps accorrdingly.


👹 Monster Roll Alerts

Quick tags show dangerous or notable spawns:

MoD (Minions of Destruction)
Dolls 💀
Souls ⚡
Cows 🐄
Ghosts
Witches
Fetishes
Vampire Lords
Reanimated Horde
Extra Boss rolls
🛡️ Resistance Display Upgrade
Shows actual highest monster resistance values
100+ still highlights as immunity

### Map Debuff & Mob Smart Labeling Example
[![Map Debuff & Mob Smart Labeling Example](screenshots/MapSmartFilterExample.jpeg)](screenshots/MapSmartFilterExample.jpeg)

🔊 SOUND SYSTEM

Cleaned up and standardized:

❌ No Star / 1-Star → No sound
⭐⭐⭐ 3-Star → Notification sound
⭐⭐⭐📦 Pickup Tier → Strong alert

👉 Less noise, more signal

🚫 FILTER LEVEL 8 (STRICT MODE)

This is where the filter becomes endgame-ready.

Behavior
Aggressively hides low-value clutter
Hides unlisted Uniques/Sets outside town only
Keeps everything visible in town as a safety net

👉 You get maximum efficiency without risk

🧹 QUALITY OF LIFE
💰 Sell Value Cleanup
Displays as $35K instead of long numbers
🧼 General Improvements
Cleaner internal structure (easier future updates)
Removed experimental / clutter features:
DPS display experiments
Ground-name spacing tests
Formatting leftovers

👉 Leaner, faster, easier to maintain

🎯 WHO THIS FILTER IS FOR
Players pushing maps and endgame content
Anyone tired of loot clutter
People who want smart info at a glance
Players who enjoy clean visuals + useful data
🚀 FINAL NOTE

This filter is built from real gameplay experience—not just theory.

It evolves every season to stay aligned with:

PD2 balance changes
Meta shifts
What actually matters when you're playing

## 📸 Screenshot Examples

### Charm & Jewel Examples
[![Charm & Jewel examples](screenshots/Jewel&Charms.png)](screenshots/Jewel&Charms.png)

### Meme Enpherno Bastard Sword Drop Example
[![Charm & Jewel examples](screenshots/MemeBastardSword.png)](screenshots/MemeBastardSword.png)

### Notification Example
[![Notification examples](screenshots/DropNotifications.png)](screenshots/DropNotifications.png)

### Fire Golem Shop Highlight Example
[![Fire Golem Shop Highlight example](screenshots/FGShop.png)](screenshots/FGShop.png)
