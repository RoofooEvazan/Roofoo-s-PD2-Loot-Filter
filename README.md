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
Current Version - 12.1.2 - Updated December 13, 2025

The sections below document notable changes compared to the base Kryszard filter.

---

### 🟨 ITEMS – UNIQUE
12.1.1
- Added meme highlight to **unid Unique Bastard Swords**
- **Uldyssian’s Awakening** downgraded to ★☆☆ (Eth remains ★★★)
- **Whispering Mirage** downgraded to ★☆☆
- **Fleshripper** downgraded to ☆☆☆
- **Ripsaw** downgraded to ☆☆☆
- **Achilles’ Edge** downgraded to ☆☆☆ (Eth remains ★★★)
- **Hellrack** downgraded to ☆☆☆
- **Wraithflight** downgraded to ☆☆☆ (Eth also ☆☆☆)
- **Ribcracker** downgraded to ☆☆☆ (Eth remains ★★★)
- **Steel Carapace** upgraded to ★★★ (Eth pickup enforced)
- **Wolfhowl** downgraded to ☆☆☆
- **Steel Shade** downgraded to ★☆☆
- **Hotspur** downgraded to ★☆☆
- **Homunculus** downgraded to ★☆☆
- **Gerke’s Sanctuary** downgraded to ★☆☆
- **The Oculus** downgraded to ★☆☆
- **Death Cleaver** downgraded to ★☆☆ (Eth remains ★★★)
- **Wraithskin** downgraded to ☆☆☆
- **Sacred Totem** downgraded to ☆☆☆
- **Zerae’s Resolve** downgraded to ☆☆☆
- **Shatterblade** downgraded to ☆☆☆
- **Stalker’s Cull** downgraded to ☆☆☆
- **Ebonbane** downgraded to ☆☆☆
- **Crackleshot** downgraded to ☆☆☆
- **Titan’s Grip** downgraded to ★☆☆
- **Arkaine’s Valor** upgraded to ★★★ pickup
- **Snowclash** upgraded to ★★★ pickup
- **Shifter / Cranium Basher** downgraded to ★☆☆ (Eth remains ★★★)
- **Magefist** upgraded to ★☆☆
- **Marrowwalk** upgraded to ★☆☆
- **Cranebeak** upgraded to ★★★
- **Skull Collector** upgraded to ★☆☆
- **Corpsemourn** upgraded to ★☆☆
- **Harlequin Crest (Shako)** downgraded to ★★★
- **Widowmaker** upgraded to ★☆☆
- **Blackhand Key** upgraded to ★☆☆
- **Pus Spitter** upgraded to ★★★
- **Razor’s Edge** downgraded to ☆☆☆
- **Guardian Angel** downgraded to ★☆☆
- **Twilight’s Reflection** downgraded to ★☆☆
- **Goblin Toe** downgraded to ☆☆☆
- **Silks of the Victor** upgraded to ★☆☆
- **Plague Bearer** upgraded to ★☆☆
- **Brimstone Rain** downgraded to ★★★

12.1.2
- **Executioner's Justice** upgraded to ★☆☆
- **Jade Talon** upgraded to ★☆☆
- **Steel Pillar** downgraded to ★☆☆ (Eth remains ★★★)
- **Widowmaker** upgraded to ★☆☆
- **Purgatory** downgraded to ★☆☆ (Eth remains ★★★)

---

### 🟩 ITEMS – SET
12.1.1
- **Laying of Hands** upgraded to ★☆☆
- **Trang-Oul’s Armor** upgraded to ★☆☆
- **Trang-Oul’s Shield** upgraded to ★☆☆
- **Trang-Oul’s Gloves** upgraded to ★☆☆
- **Natalya’s Mark** downgraded to ★☆☆

12.1.2
- **Tal Rasha's Guardianship (Armor)** downgraded to ★☆☆

---

### 🟦 ITEMS – RARE
12.1.1
- **Rare Necromancer Heads** upgraded to ★☆☆

---

### 🛒 SHOP
12.1.1
- Added bold highlights to:
  - **+6 Fire Golem Wands**
  - **+5–6 Fire Golem & Fire Skill Damage (>1%) Wands**

---

### 🧿 CHARMS
12.1.1
- Charms now display as **teal text**
- **Filter Level 8** hides all charms **below iLvl 90**
- **iLvl 90 charms** gain additional blue dot indicators
- Minimap icons suppressed when < iLvl 90 charms are hidden

---

### 💎 JEWELS
12.1.1
- Jewels now display as **teal text**
- **≥ iLvl 85 jewels** gain additional dots:
  - Blue for magic
  - Yellow for rare

---

### 🔷 GEMS
12.1.1
- **Flawless Skulls** always shown on all filter levels

---

### 🔊 SOUNDS
12.1.1
- Replaced various drop sounds with **Path of Exile–style sounds**
- Removed drop sounds from **1-star items**
- ⚠️ Known issue: some sounds may skip due to priority conflicts

12.1.2
- High Rune drop sounds changed to POE sounds to ensure priority over other sounds (results of existing LOD sounds having too low priority)

---

### 🔑 UBER KEYS
12.1.1
- Notification color changed to **orange**

---

### 🎚 FILTER LEVEL 6 & 7
**Armor**
12.1.1
- Hide all magic helms (including eth; excluding circlets)
- Hide all magic armors (including eth)
- Hide all magic shields (including eth)

**Weapons**
12.1.1
- Hide all magic spears & polearms (including eth; excluding Pike / Lance / War Pike)
- Hide all magic Amazon spears (including eth)

**Class Bases**
12.1.1
- Hide all ethereal Druid pelts

---

### 🎚 FILTER LEVEL 7 & 8
12.1.1
- Hide all rare gloves
- Hide all rare bolts

---

### 🎚 FILTER LEVEL 8 (STRICT)
**Armor**
12.1.1
- Hide all magic & rare non-class shields (including eth)
- Hide all magic boots, gloves, and belts (including eth)

12.1.2
- Hide all normal and exceptional armor bases excluding Gothic Plate and Linked Mail (including eth) **To be assessed further, may adjust in future versions**
- Hide all non-magic and superior elite armor bases with less than 10% enhanced defense (including eth)

**Weapons**
12.1.1
- Hide all non-magic, non-superior non-staff weapons
- Hide all non-magic, non-superior non-class bases
- Hide non-magic Phase Blades
- Hide non-magic dagger bases
- Hide magic daggers and javelins (including eth)
- Hide non-magic, no-skill Archon staves
- Hide rare and magic daggers (including eth)
- Hide all rare and magic scepters (including eth)

12.1.2
- Hide all rare and magic maces (including eth)
- Hide all rare and magic Legend Sword/Espandon/Two-handed Sword (including eth)
- Hide all non-magic and superior spear and polearms with less than 10% enhanced damage (including eth)
  

**Class Bases**
12.1.2
- Hide all non-magic & magic Barbarian helms (including eth)
- Hide magic & rare Sorceress orbs (including eth),  
  excluding Jared Stone, Swirling Crystal, Dimensional Shard
- Hide magic & rare Paladin shields (including eth)
- Hide non-magic & superior Paladin shields,  
  excluding Vortex, Kurast, and Zakarum Shields
- Hide all non-magic, socketed or skills druid pelts

## 📸 Screenshot Examples

### Charm & Jewel Examples
[![Charm & Jewel examples](screenshots/Jewel&Charms.png)](screenshots/Jewel&Charms.png)

### Meme Enpherno Bastard Sword Drop Example
[![Charm & Jewel examples](screenshots/MemeBastardSword.png)](screenshots/MemeBastardSword.png)

### Notification Example
[![Notification examples](screenshots/DropNotifications.png)](screenshots/DropNotifications.png)

### Fire Golem Shop Highlight Example
[![Fire Golem Shop Highlight example](screenshots/FGShop.png)](screenshots/FGShop.png)
