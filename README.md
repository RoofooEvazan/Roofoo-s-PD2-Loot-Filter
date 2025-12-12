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

The sections below document notable changes compared to the base Kryszard filter.

---

### 🟨 ITEMS – UNIQUE
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

---

### 🟩 ITEMS – SET
- **Laying of Hands** upgraded to ★☆☆
- **Trang-Oul’s Armor** upgraded to ★☆☆
- **Trang-Oul’s Shield** upgraded to ★☆☆
- **Trang-Oul’s Gloves** upgraded to ★☆☆
- **Natalya’s Mark** downgraded to ★☆☆

---

### 🟦 ITEMS – RARE
- **Rare Necromancer Heads** upgraded to ★☆☆

---

### 🛒 SHOP
- Added bold highlights to:
  - **+6 Fire Golem Wands**
  - **+5–6 Fire Golem & Fire Skill Damage (>1%) Wands**

---

### 🧿 CHARMS
- Charms now display as **teal text**
- **Filter Level 8** hides all charms **below iLvl 90**
- **iLvl 90 charms** gain additional blue dot indicators
- Minimap icons suppressed when < iLvl 90 charms are hidden

---

### 💎 JEWELS
- Jewels now display as **teal text**
- **≥ iLvl 85 jewels** gain additional dots:
  - Blue for magic
  - Yellow for rare

---

### 🔷 GEMS
- **Flawless Skulls** always shown on all filter levels

---

### 🔊 SOUNDS
- Replaced various drop sounds with **Path of Exile–style sounds**
- Removed drop sounds from **1-star items**
- ⚠️ Known issue: some sounds may skip due to priority conflicts

---

### 🔑 UBER KEYS
- Notification color changed to **orange**

---

### 🎚 FILTER LEVEL 6 & 7
**Armor**
- Hide all magic helms (including eth; excluding circlets)
- Hide all magic armors (including eth)
- Hide all magic shields (including eth)

**Weapons**
- Hide all magic spears & polearms (including eth; excluding Pike / Lance / War Pike)
- Hide all magic Amazon spears (including eth)

**Class Bases**
- Hide all ethereal Druid pelts

---

### 🎚 FILTER LEVEL 7 & 8
- Hide all rare gloves
- Hide all rare bolts

---

### 🎚 FILTER LEVEL 8 (STRICT)
**Armor**
- Hide all magic & rare non-class shields (including eth)
- Hide all magic boots, gloves, and belts (including eth)

**Weapons**
- Hide all non-magic, non-superior non-staff weapons
- Hide all non-magic, non-superior non-class bases
- Hide non-magic Phase Blades
- Hide non-magic dagger bases
- Hide magic daggers and javelins (including eth)

**Class Bases**
- Hide all non-magic & magic Barbarian helms (including eth)
- Hide magic & rare Sorceress orbs (including eth),  
  excluding Jared Stone, Swirling Crystal, Dimensional Shard
- Hide magic & rare Paladin shields (including eth)
- Hide non-magic & superior Paladin shields,  
  excluding Vortex, Kurast, and Zakarum Shields

## 📸 Screenshot Examples

### Charm & Jewel Examples
[![Charm & Jewel examples](screenshots/Jewel&Charms.png)](screenshots/Jewel&Charms.png)

### Meme Enpherno Bastard Sword Drop Example
[![Charm & Jewel examples](screenshots/MemeBastardSword.png)](screenshots/MemeBastardSword.png)

### Notification Example
[![Notification examples](screenshots/DropNotifications.png)](screenshots/DropNotifications.png)

### Fire Golem Shop Highlight Example
[![Fire Golem Shop Highlight example](screenshots/FGShop.png)](screenshots/FGShop.png)
