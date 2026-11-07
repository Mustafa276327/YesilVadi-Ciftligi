# Yeşil Vadi Çiftliği — Efsanevi Sürüm Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mevcut v2.1 çiftlik tycoon oyununa: +9 ürün, +3 hayvan, +2 fabrika, +3 bölge, prestige/nesil, araştırma ağacı, perk sistemi, kontrat/faksiyon, genetik/ırk, otomasyon, NPC/köy/festival, görsel polisaj, ses, PWA/TWA, save export/import ekleyerek 100+ saat tekrar oynanabilir "efsanevi" sürüm üretmek.

**Architecture:** Tek dosya (`GreenValleyFarm.html`) + `app.js` + `manifest.webmanifest` + yeni `sw.js` mimarisi korunur. `GVF` namespace'i (veri/şablon/motor) sistematik genişletilir. Save formatı `version: 3` ile geriye uyumlu (`mergeState` genişletme). Tüm yeni veri `GreenValleyFarm.html` IIFE'sinde `window.GVF` objesine eklenir, motor fonksiyonları `app.js`'de genişletilir.

**Tech Stack:** Vanilla ES5+ JS, HTML5, CSS3 (custom properties, SVG, animations), Web Audio API (sentez), Service Worker (PWA), IndexedDB (yedek), localStorage (ana). Build yok, framework yok, bağımlılık yok.

**Spec:** `/storage/emulated/0/Nexus-Oyunlar/Çiftlik-oyunu/docs/superpowers/specs/2026-11-06-yesilvadi-efsanevi-design.md`

---

## Global Constraints

- Save key: `yesilvadi_tycoon_v2` (değişmez), version: 3 (yeni)
- Oyun saati: 1 gerçek saniye = 5/60 oyun dakikası (`MIN_PER_SEC = 5/60`)
- Maks seviye: Çiftlik 10, Bölge 5, Prestige sonrası sınırsız (nesil bonus)
- Dosya yapısı: `GreenValleyFarm.html`, `app.js`, `manifest.webmanifest`, `sw.js` (yeni), `assets/`
- İkon font: Inline SVG `<use href="#id"/>` pattern
- Yazı tipi: `Plus Jakarta Sans` WOFF2 base64 inline
- Renk paleti: Mevcut `--green-*`, `--mint`, `--peach`, `--lav`, `--wheat`, `--orange`, `--blue` genişletilir
- `prefers-reduced-motion` ve `S.settings` tüm animasyon/ses saygılı
- WCAG 2.1 AA erişilebilirlik hedefi
- 60fps mobil, <3s cold start, offline-first

---

## Review Focus (En Olası 5 Kırılma Noktası)

| # | Girdi/Durum | Beklenen Davranış | Sahip Olduğu Task |
|---|-------------|-------------------|-------------------|
| 1 | **Prestige sonrası save/load** — v2 save v3'e yüklenirse, `mergeState` yeni alanları (prestige, research, perks, contracts, genetics, npc, festivals) varsayılanlarla doldurmalı, eski veriyi korumalı | Oyun çökmez, prestige bonusları aktif olur, yeni sistemler başlangıçta kapalı/kilitli olur | Task 2.4, 2.5 |
| 2 | **Araştırma/Perk bonusları çarpışması** — `cropRate`, `animalAvgHealth`, `factoryJobPct` gibi hesaplamalarda hem research hem perk bonusları uygulanırken sıralama/çarpım doğru olmalı (yüzde bonuslar toplamsal değil çarpımsal) | Verim/formül beklenenden farklı değil, testlerde `getResearchBonuses` + `getPerkBonuses` birleşik etki doğrulanır | Task 2.1, 2.2 |
| 3 | **Offline ilerlemesi + kontrat/faiz/NPC** — `applyOffline` uzun süre (örn. 48 saat) offline kalındığında kontrat vadeleri, faiz birikimi, NPC güveni, festival günleri doğru simüle edilmeli | Kontrat süresi dolmuşsa "geç kalındı" bildirimi, faiz eklenmiş, NPC güven düşmüş, festival atlanmış olmalı | Task 2.6 |
| 4 | **Otomasyon kural motoru + enerji/para yetersizliği** — "Su < 30% → oto-sula" kuralı tetiklenince su/enerji/para yoksa kural atlanmalı, bildirim vermeli, sonsuz döngüye girmemeli | Her tick'te en fazla 1 kural çalışır, kaynak yetersizse loglanır, bir sonraki tick'te tekrar dener | Task 3.1 |
| 5 | **PWA Service Worker + save senkron** — `sw.js` cache stratejisi HTML/JS için stale-while-revalidate, görseller için cache-first; `syncSaveToCloud` background sync ile çalışmalı; offline açılışta tam işlemeli | Oyun offline açılır, save export/import çalışır, cloud sync altyapısı hazır (IndexedDB) | Task 6.1, 6.2 |

---

## File Map

| Dosya | Sorumluluk | Faz |
|-------|------------|-----|
| `GreenValleyFarm.html` | Veri tabloları (CROPS, ANIMALS, FACTORY_DEFS, ZONE, RESEARCH_TREE, PERKS, CONTRACTS, FACTIONS, NPC_FARMS, FESTIVALS, GENETICS, PRESTIGE_REWARDS), SVG semboller, CSS, UI şablonları (zoneCard, research, perks, contracts, npc, festival, genetics, prestige, automation, analytics), renderer fonksiyonları | 1, 2, 3, 4, 5 |
| `app.js` | Motor: yeni hesaplamalar (research, perk, contract, faction, npc, festival, genetics, prestige, automation), `newDay`, `advance`, `checkAlerts`, `applyOffline`, `saveState`, `mergeState`, event handler'lar, ses motoru, self-test genişletme | 1, 2, 3, 4, 5, 6 |
| `manifest.webmanifest` | PWA shortcuts, categories, screenshots, prefer_related_applications | 6 |
| `sw.js` (yeni) | Service Worker: static/runtime cache, stale-while-revalidate, background sync, push altyapısı | 6 |
| `assetlinks.json` (yeni) | TWA doğrulama (`.well-known/assetlinks.json`) | 6 |

---

## Phase 1: Veri Tabloları + Yeni Bölgeler + Harita SVG (Tasks 1.1–1.6)

### Task 1.1: Yeni Veri Tablolarını `GVF` Namespace'ine Ekle

**Files:**
- Modify: `GreenValleyFarm.html:1-1262` (IIFE içindeki `window.GVF` tanımı)

**Interfaces:**
- Produces: `GVF.NEW_CROPS`, `GVF.NEW_ANIMALS`, `GVF.NEW_FACTORIES`, `GVF.NEW_ZONES`, `GVF.BUILDING_EFFECTS`, `GVF.RESEARCH_TREE`, `GVF.PERKS`, `GVF.CONTRACT_TEMPLATES`, `GVF.FACTIONS`, `GVF.NPC_FARMS`, `GVF.FESTIVALS`, `GVF.GENETICS`, `GVF.PRESTIGE_REWARDS` — tümü spec'teki tam değerlerle
- Consumes: (yok, temel veri)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('yeni ürünler tanımlandı', Object.keys(GVF.NEW_CROPS).length === 6)` vb. 12 assert
- [ ] **Step 2: Run test** — `?selftest=1` ile sayfa aç, console'da FAIL bekle
- [ ] **Step 3: Implement** — `GreenValleyFarm.html` IIFE'sinde `CROPS`, `ANIMALS`, `FACTORY_DEFS`, `ZONE`, `ZONE_KEYS`, `BOUNDS`, `BADGE_POS`, `READY_POS`, `FIELD_INFO` objelerine spec'teki değerleri ekle/genişlet. `NEW_CROPS` → `CROPS`'a merge, `NEW_ANIMALS` → `ANIMALS`/`ANIMAL_KEYS`, `NEW_FACTORIES` → `FACTORY_DEFS`/`FACTORY_KEYS`, `NEW_ZONES` → `ZONE`/`ZONE_KEYS`/`BOUNDS`/`BADGE_POS`. `RESEARCH_TREE`, `PERKS`, `CONTRACT_TEMPLATES`, `FACTIONS`, `NPC_FARMS`, `FESTIVALS`, `GENETICS`, `PRESTIGE_REWARDS`, `BUILDING_EFFECTS` yeni sabitler olarak ekle. `ALL_PRODUCT_KEYS`, `CRAFTED_KEYS`, `MARKET_KEYS` güncelle.
- [ ] **Step 4: Run test** — PASS (12 assert)
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(data): add 9 crops, 3 animals, 2 factories, 3 zones, research/perk/contract/faction/npc/festival/genetics/prestige data tables"`

### Task 1.2: Yeni SVG Sembolleri (Harita, Binalar, NPC, Festival, Ağaçlar)

**Files:**
- Modify: `GreenValleyFarm.html:11-650` (CSS içinde `<style>` → `.svgdefs` symbol'ları)

**Interfaces:**
- Produces: `<symbol id="mapGreenhouse">`, `mapFertilizer`, `mapMarket`, `mapNPCHouse`, `mapTreeSpring`, `mapTreeSummer`, `mapTreeAutumn`, `mapTreeWinter`, `mapAnimalPath`, `mapFestivalSpring`, `mapFestivalSummer`, `mapFestivalAutumn`, `mapFestivalWinter`, yeni hayvan sanatı (`artRooster`, `artFish`), yeni ürün ikonları (`i-eggplant`, `i-pepper`, `i-cucumber`, `i-potato`, `i-spinach`, `i-strawberry`, `i-rooster`, `i-fish`, `i-sausage`, `i-salami`, `i-pastrami`, `i-kavurma`, `i-jerky`, `i-jam`, `i-pestil`, `i-juice`, `i-dried`, `i-tree`, `i-meat`, `i-fruit`)
- Consumes: Task 1.1 verileri

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('SVG sembolleri var', document.getElementById('mapGreenhouse') !== null)` gibi 20+ assert (DOM loaded sonrası)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — `.svgdefs` içine spec'teki tasarımla uyumlu, mevcut stilin aynısı (stroke-width, fill, viewBox 64x64) yeni `<symbol>`'lar ekle. Hayvan sanatı (`artRooster`, `artFish`) mevcut `artCow`/`artChicken` pattern'inde. Ürün ikonları mevcut `i-tomato` pattern'inde.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(svg): add map buildings, NPC, festival, trees, new animal art, new product icons"`

### Task 1.3: Harita Overlay Fonksiyonu Genişletme (`mapOverlay`)

**Files:**
- Modify: `GreenValleyFarm.html:667-744` (`mapOverlay` fonksiyonu)

**Interfaces:**
- Consumes: `GVF.NEW_ZONES`, `GVF.BUILDING_EFFECTS`, `GVF.NPC_FARMS`, `GVF.FESTIVALS`, `GVF.SEASONS`, `S.zones`, `S.prestige.generation`
- Produces: HTML string — yeni bölgeler (orchard, fishpond, forest) için seviye görselleri (serra, gübre, pazar), NPC ev işaretleri + isim, mevsime göre ağaçlar, hayvan yolları, festival süslemeleri

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('yeni bölgeler haritada', GVF.mapOverlay(t).includes('mapGreenhouse'))` vb. 8 assert
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — `mapOverlay` içinde:
  - `orchard`, `fishpond`, `forest` için `FIELD_INFO` benzeri `ORCHARD_INFO`, `FISHPOND_INFO`, `FOREST_INFO` ekle (hektar/level)
  - Seviye 2+: serra (`mapGreenhouse`), seviye 3+: gübre (`mapFertilizer`), seviye 4+: pazar (`mapMarket`) — `BUILDING_EFFECTS` kilit seviyelerine göre
  - `NPC_FARMS` her biri için `mapNPCHouse` + isim etiketi `BOUNDS` benzeri pozisyonda
  - Mevsim: `SEASONS[seasonIndex].name` → `mapTreeSpring/Summer/Autumn/Winter`撒布
  - Hayvan yolları: `mapAnimalPath` (bezier, opaklık 0.15) ahır→tarlalar arası
  - Festival gününde: `mapFestival*` süslemeleri köy merkezi etrafında
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(map): extend mapOverlay with new zones, buildings, NPCs, seasonal trees, animal paths, festivals"`

### Task 1.4: Bölge Kartı Şablonu (`zoneCard`) + Yeni Bölge Detayları

**Files:**
- Modify: `GreenValleyFarm.html:966-985` (`zoneCard`), `747-930` (`cropBody`, `houseBody`, `waterBody`, `storageBody`, `animalBody`, `overviewCard`), yeni `orchardBody`, `fishpondBody`, `forestBody`

**Interfaces:**
- Consumes: `GVF.NEW_ZONES`, `GVF.BUILDING_EFFECTS`, `GVF.CROPS` (yeni ürünler için), `GVF.ANIMALS` (balık için)
- Produces: HTML string — yeni 3 bölge için kart içeriği (ekim/sulama/hasat/üretim, bina yükseltme paneli)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('orchard zoneCard', GVF.zoneCard(t, 'orchard').includes('Çilek'))` vb. 6 assert
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `zoneCard` switch'ine `orchard`, `fishpond`, `forest` case'leri ekle
  - `orchardBody`: Çilek/Muz/Elma (3 alt-ürün, `CROPS` benzeri), bina: serra/gübre/pazar
  - `fishpondBody`: Balık üretimi (besleme/sulama yok, su kalitesi/yoğunluk), bina: filtre/besin/anak
  - `forestBody`: Ahşap/Mantar/Bal (toplama tabanlı, hasat yok), bina: asma/çadır/balcı
  - `BUILDING_EFFECTS` kilit seviyeleri panelde gösterilsin (kilitli/açık/tamamlandı)
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(ui): add zoneCard bodies for orchard, fishpond, forest with building upgrades"`

### Task 1.5: Harita Görünüm Alanları (`BOUNDS`, `BADGE_POS`, `READY_POS`, `detailView`, `ring`)

**Files:**
- Modify: `GreenValleyFarm.html:25-34` (BOUNDS, BADGE_POS, READY_POS), `ZONE` tanımındaki `view`, `detailView`, `ring`

**Interfaces:**
- Consumes: Task 1.1 yeni bölgeler
- Produces: Koordinatlar — harita 1000x1250 bazında, yeni bölgeler sağ/alt tarafa yerleştirilmiş

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('orchard BOUNDS', GVF.BOUNDS.orchard.length === 4)` vb. 12 assert
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Koordinatlar (örnek, görsel dengeye göre ayarlanacak):
  - `orchard`: view `[1000,200,400,500]`, detailView `[1000,200,400,400]`, ring `[1000,200,400,400]`, BADGE_POS `[1350,350]`, READY_POS `[1200,300]`
  - `fishpond`: view `[1000,700,400,400]`, detailView `[1000,700,400,300]`, ring `[1000,700,400,300]`, BADGE_POS `[1350,850]`
  - `forest`: view `[200,1000,600,400]`, detailView `[200,1000,600,300]`, ring `[200,1000,600,300]`, BADGE_POS `[450,1150]`
  - `ZONE` objelerinde `upgradeBase`: orchard 2000, fishpond 2500, forest 1800
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(map): add bounds, badge, ready, detailView for orchard/fishpond/forest"`

### Task 1.6: Chip/Tab Bar + Sekme Navigasyonu (Yeni Bölgeler İçin)

**Files:**
- Modify: `GreenValleyFarm.html:1567-1590` (farm chips HTML), `2118-2132` (`showTab`), `2133-2138` (`centerChip`)

**Interfaces:**
- Consumes: `ZONE_KEYS` (güncellenmiş)
- Produces: UI — 10 chip (overview + 7 eski + 3 yeni), horizontal scroll, aktif vurgulama

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('chip sayısı 10', document.querySelectorAll('#farmChips .chip').length === 10)` (DOM loaded)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `farmChips` HTML'inde `orchard` (icon `i-tree`, tile `peach`), `fishpond` (`i-fish`, `lav`), `forest` (`i-tree`, `mint`) chip'leri ekle
  - `ZONE_KEYS` zaten güncellendi (Task 1.1), `showTab('farm')` zaten `selectZone('overview')` yapıyor — ekstra kod gerekmez
  - `centerChip` zaten `scrollLeft` hesaplıyor — çalışır
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(ui): add farm chips for orchard, fishpond, forest"`

---

## Phase 2: Meta Progresyon — Prestige, Araştırma, Perk, Kontrat, Faksiyon, Genetik (Tasks 2.1–2.6)

### Task 2.1: Oyun Durumu (`S`) Yeni Alanları + `mergeState` Genişletme

**Files:**
- Modify: `GreenValleyFarm.html:486-604` (`makeDefaultState`, `mergeState`)

**Interfaces:**
- Consumes: Task 1.1 sabitler
- Produces: `S` objesinde yeni alanlar (spec §5.2), `mergeState` v3 geriye uyumlu

- [ ] **Step 1: Write failing test** — `runSelftest` içinde:
  ```javascript
  const t = G.makeDefaultState();
  add('prestige alanları', t.prestige && t.prestige.generation === 0 && t.prestige.permanentBonuses);
  add('research alanları', t.research && Object.keys(t.research).length === 4);
  add('perks alanları', t.perks && Object.keys(t.perks).length === 4);
  add('contracts/factions/npc/genetics', t.contracts instanceof Array && t.factions && t.npcRelations && t.genetics);
  add('settings otomasyon', t.settings.autoPlant === false && t.settings.highContrast === false);
  add('statistics lifetime', t.statistics.lifetimeHarvests === 0);
  add('mergeState v2→v3', () => { const v2 = {...G.makeDefaultState(), version:2}; const v3 = G.mergeState(v2); return v3.version === 3 && v3.prestige.generation === 0; })();
  ```
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `makeDefaultState`: spec §5.2'deki tüm alanları varsayılanlarla ekle (`version: 3`)
  - `mergeState`: `if (!raw || raw.version !== 3) return base;` → v2/v1 için `base` (v3 defaults) + `Object.assign` + alan bazlı fallback. Yeni alanlar yoksa `base` değerleri kullanılır. `S.prestige`, `S.research`, `S.perks`, `S.contracts`, `S.factions`, `S.npcRelations`, `S.genetics`, `S.settings`, `S.statistics`, `S.cloudSync` merge edilir.
  - `ALL_PRODUCT_KEYS` için `inventory` merge zaten var — yeni ürünler otomatik 0lanır.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(state): add prestige, research, perks, contracts, factions, npc, genetics, settings, statistics to S and mergeState v3"`

### Task 2.2: Hesaplama Fonksiyonları — Research, Perk, Prestige Bonusları

**Files:**
- Modify: `GreenValleyFarm.html:259-431` (hesaplama fonksiyonları arasına), `app.js` (motor entegrasyonu için `GVF` namespace'e export)

**Interfaces:**
- Produces (tümü `GVF` namespace'ine eklenir):
  - `getResearchBonuses(S) -> { yieldMult, waterMult, energyMult, factorySpeedMult, autoPlant, autoFeed, autoCollect, greenhouseUnlocked, parallelSlots }`
  - `getPerkBonuses(S) -> { yieldMult, feedCostMult, factoryCostMult, factorySpeedMult, sellPriceMult, storageCapMult, xpMult, autoFeed, autoPlant, autoHarvest, autoWater, autoSell, autoCollect }`
  - `getPrestigeBonuses(S) -> { yieldMult, startHectare, unlocks: string[] }`
  - `researchState(S, tree, nodeId) -> { unlocked, canUnlock, cost }`
  - `perkState(S, cat, perkId) -> { purchased, canPurchase, cost }`
  - `canPrestige(S) -> bool`
  - `doPrestige(S) -> { generation, bonuses, keptItems: string[] }`

- [ ] **Step 1: Write failing test** — `runSelftest` içinde:
  ```javascript
  const t = G.makeDefaultState(); t.level = 10; t.xp = G.xpNeed(10);
  add('prestige mümkün', G.canPrestige(t) === true);
  const p = G.doPrestige(t);
  add('prestige nesil 1', p.generation === 1 && p.bonuses.yieldMult === 0.05);
  t.research.farming.autoPlant = true;
  add('research bonus autoPlant', G.getResearchBonuses(t).autoPlant === true);
  t.perks.farming.earlyRiser = true;
  add('perk bonus earlyRiser', G.getPerkBonuses(t).yieldMult === 0.05); // örnek
  ```
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Hesaplama fonksiyonları (spec §6.1):
  - `getResearchBonuses`: `S.research[tree][nodeId] === true` için `RESEARCH_TREE[tree].nodes` dolaş, bonusları topla (çarpımsal: `yieldMult = 1.15` için `1.15`, toplamsal: `autoPlant = true`)
  - `getPerkBonuses`: `S.perks[cat][perkId] === true` için `PERKS[cat]` dolaş, bonusları topla
  - `getPrestigeBonuses`: `S.prestige.generation` için `PRESTIGE_REWARDS[gen-1]` bonusları birleştir
  - `researchState`: `RESEARCH_TREE[tree].nodes.find(n=>n.id===nodeId)` → `unlocked`, `req` kontrolü (tüm req unlocked ise `canUnlock`), `cost`
  - `perkState`: benzer, `S.perkPoints >= cost` kontrolü
  - `canPrestige`: `S.level >= 10 && S.xp >= G.xpNeed(10)`
  - `doPrestige`: `generation++`, `permanentBonuses` birleştir, `keptItems` = `['profile', 'achievements', 'statistics.lifetime*', 'settings']` geri kalanı sıfırla (`makeDefaultState` + prestige bonusları)
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(calc): add research/perk/prestige bonus computation functions"`

### Task 2.3: Motor Entegrasyonu — Bonusların Etkisi (Büyüme, Üretim, Fabrika, Fiyat)

**Files:**
- Modify: `GreenValleyFarm.html:259-431` (mevcut hesaplamalar: `cropRate`, `animalAvgHealth`, `productionPct`, `farmHealth`, `marketPrice`, `factoryJobPct`, `energyCap`, `waterCap`, `storageCap`, `feedCap`, `feedCost`, `hectareText`, `totalHectares`)
- Modify: `app.js` (motor kullanım yerleri)

**Interfaces:**
- Consumes: Task 2.2 `getResearchBonuses`, `getPerkBonuses`, `getPrestigeBonuses`
- Produces: Güncellenmiş hesaplama fonksiyonları (bonuslar uygulanmış)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde:
  ```javascript
  const t = G.makeDefaultState(); t.level = 10; t.xp = G.xpNeed(10);
  G.doPrestige(t); // gen 1, yield +5%
  t.research.farming.hybridSeeds = true; // yield +15%
  t.perks.farming.speedGrower = true; // büyüme +5%
  const baseRate = G.cropRate(t, 'tomato');
  // bonuslarsız t2 ile karşılaştır
  const t2 = G.makeDefaultState();
  const baseRate2 = G.cropRate(t2, 'tomato');
  add('prestige+research+perk büyüme etkisi', baseRate > baseRate2 * 1.2); //约等于 1.05*1.15*1.05
  ```
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Her hesaplama fonksiyonunda:
  - `cropRate`: `researchBonuses.yieldMult || 1`, `perkBonuses.yieldMult || 1`, `prestigeBonuses.yieldMult || 1` çarp
  - `animalAvgHealth`: `researchBonuses.vetCare` varsa düşüş yarısı, `perkBonuses.healthGuard` varsa kaçırma etkisi yarısı
  - `productionPct`: `perkBonuses.prodBooster` çarp
  - `marketPrice`: `perkBonuses.sellPriceMult`, `researchBonuses.qualityControl`, `factionRewards.export` (ihracat lisansı) çarp
  - `factoryJobPct`: `researchBonuses.factorySpeedMult` böl (süre kısalır)
  - `energyCap/waterCap/storageCap/feedCap`: `perkBonuses.storageCapMult`, `factionRewards.city` (soğuk depo), `prestigeBonuses.startHectare` (hektar etkisi dolaylı)
  - `totalHectares`: `prestigeBonuses.startHectare` baz hektara ekle
  - `feedCost`: `perkBonuses.feedCostMult` çarp
  - `hectareText`: prestige hektarı dahil et
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(engine): apply research/perk/prestige bonuses to cropRate, animalAvgHealth, marketPrice, factoryJobPct, capacities"`

### Task 2.4: Araştırma / Perk / Prestige Eylemleri (Event Handlers)

**Files:**
- Modify: `app.js:3163-3464` (event handler `switch` bloğu), `app.js` yeni fonksiyonlar

**Interfaces:**
- Produces: `actUnlockResearch(tree, nodeId)`, `actPurchasePerk(cat, perkId)`, `actPrestige()` — hepsi `S` mutasyona uğratır, `saveState()`, `renderAll(true)`, `toast`, `feedback` çağırır

- [ ] **Step 1: Write failing test** — `runSelftest` içinde:
  ```javascript
  const t = G.makeDefaultState(); t.level = 10; t.xp = G.xpNeed(10); t.money = 10000; t.researchPoints = 1000;
  G.actUnlockResearch('farming', 'autoPlant');
  add('araştırma açılır', t.research.farming.autoPlant === true && t.researchPoints < 1000);
  t.perkPoints = 5; G.actPurchasePerk('farming', 'earlyRiser');
  add('perk satın alınır', t.perks.farming.earlyRiser === true && t.perkPoints < 5);
  G.actPrestige();
  add('prestige çalışır', t.prestige.generation === 1 && t.level === 1);
  ```
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `actUnlockResearch`: `researchState` kontrol, `canUnlock` ve `researchPoints >= cost` → `S.research[tree][nodeId]=true`, `researchPoints-=cost`, `addXp(10)`, bildirim
  - `actPurchasePerk`: `perkState` kontrol, `canPurchase` ve `perkPoints >= cost` → `S.perks[cat][perkId]=true`, `perkPoints-=cost`, `addXp(5)`, bildirim
  - `actPrestige`: `canPrestige` kontrol → `doPrestige` sonucu ile `S` güncelle, `keptItems` koru (profile, achievements, statistics.lifetime*, settings, cloudSync), gerisi `makeDefaultState` + prestige bonusları, `prestige.totalPrestiges++`, `statistics.prestigeHistory.push({gen, day, money})`, `toast('Nesil ' + gen + ' başladı!')`, `feedback('level')`, `confetti(30)`, `renderAll(true)`
  - `data-action` attribute'ları: `research-unlock`, `perk-purchase`, `prestige-start`
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add app.js && git commit -m "feat(actions): add actUnlockResearch, actPurchasePerk, actPrestige handlers"`

### Task 2.5: Kontrat / Faksiyon / NPC / Festival / Genetik Motor Fonksiyonları

**Files:**
- Modify: `GreenValleyFarm.html:259-431` (hesaplama fonksiyonları arasına), `app.js:1494-1578` (`buildNativePlan`, `checkAlerts`, `newDay`, `advance` arasına)

**Interfaces:**
- Produces (tümü `GVF` namespace):
  - `generateContracts(S) -> Contract[]` — `CONTRACT_TEMPLATES` rastgele seç, miktar `S.level`/`S.day` ölçekli
  - `checkContractProgress(S) -> void` — `S.contracts` dolaş, `delivered` false → `S.inventory[item] >= qty` ise `canDeliver=true`
  - `completeContract(S, contractId) -> { money, reputation, faction }` — para + itibar + faction reward check
  - `changeFactionRep(S, faction, amount) -> void` — `S.factions[faction] += amount`, `checkFactionRewards`
  - `checkFactionRewards(S) -> void` — eşikler: 500 (coop→organik sertifika), 1000 (city→soğuk depo), 1500 (export→lisans), 2000 (organic→hibrit tohum) → `S.factionRewards[faction]=true`, bildirim
  - `visitNPC(S, npcId) -> { dialog, offers, quest }` — `NPC_FARMS.find`, `S.npcRelations[npcId]` güven/sonZiyaret/görevler
  - `completeNPCQuest(S, npcId, questId) -> rewards` — güven +, ödül (para/ürün/ırk bilgisi)
  - `getCurrentFestival(S) -> Festival|null` — `S.day` için `FESTIVALS` kontrol
  - `checkFestivalProgress(S) -> void` — festival gününde görevler tamamlandıysa ödül ver
  - `generateAnimalBreed(S, cat) -> breedId` — `ANIMALS[cat].breeds` rastgele, nadir ırk şansı (`perkBonuses.breedMaster`)
  - `crossbreedAnimals(S, cat, parent1Idx, parent2Idx) -> { success, childBreed }` — `GENETICS.crossbreed[cat]` Eltern kontrol, şans hesapla, mutasyon %1
  - `applyGenetics(S, cat, breed) -> { healthMod, productionMult }` — ırk stat modları

- [ ] **Step 1: Write failing test** — `runSelftest` içinde 15+ assert (kontrat üretimi, faksiyon eşik, NPC güven, festival, genetik çaprazlama)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Fonksiyonları spec §6.1 tasarımına göre yaz. `newDay` içinde: `generateContracts` (yeni gün), `checkFactionRewards`, `getCurrentFestival` başlangıç bildirimi, NPC güven günlük -1 (min 0). `advance` içinde: `checkContractProgress`, `checkFestivalProgress`. `checkAlerts` içinde: kontrat vadesi, festival başlangıcı, NPC yeni görev.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(engine): add contracts, factions, NPC, festivals, genetics computation functions"`

### Task 2.6: Kontrat/Faksiyon/NPC/Festival/Genetik Eylemleri (Event Handlers)

**Files:**
- Modify: `app.js:3163-3464` (event handler `switch` bloğu)

**Interfaces:**
- Produces: `actAcceptContract(contractId)`, `actDeliverContract(contractId)`, `actFactionAction(faction, action)`, `actVisitNPC(npcId)`, `actNPCQuest(npcId, questId)`, `actFestivalTask(taskId)`, `actCrossbreed(cat, parent1Idx, parent2Idx)`

- [ ] **Step 1: Write failing test** — `runSelftest` içinde her eylem için 1 assert (kontrat kabul/teslim, faksiyon bağış, NPC ziyaret/görev, festival görev, çaprazlama)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Her handler: state kontrol → mutasyon → `saveState()` → `renderAll(true)` → `toast`/`feedback`. `data-action` attribute'ları ekle.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add app.js && git commit -m "feat(actions): add contract/faction/npc/festival/genetics handlers"`

---

## Phase 3: Otomasyon + QoL + İstatistikler + Erişilebilirlik (Tasks 3.1–3.5)

### Task 3.1: Otomasyon Kural Motoru

**Files:**
- Modify: `GreenValleyFarm.html:259-431` (yeni fonksiyon), `app.js:1721-1729` (`advance` içine entegrasyon), `app.js:3163-3464` (handler)

**Interfaces:**
- Produces: `evalAutomationRules(S) -> actions[]` — `S.settings.autoPlant/Harvest/Feed/Water/Sell/Collect` true ise koşul kontrolü → eylem döndür
- Consumes: `S.settings`, `S.zones`, `S.water`, `S.energy`, `S.feed`, `S.inventory`, `S.money`

- [ ] **Step 1: Write failing test** — `runSelftest` içinde:
  ```javascript
  const t = G.makeDefaultState(); t.settings.autoWater = true; t.zones.tomato.planted = true; t.zones.tomato.wateredUntil = 0; t.water = 1000;
  const actions = G.evalAutomationRules(t);
  add('oto-sula kuralı', actions.some(a => a.type === 'water' && a.zone === 'tomato'));
  t.water = 0; actions = G.evalAutomationRules(t);
  add('su yoksa atlanır', !actions.some(a => a.type === 'water'));
  ```
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `evalAutomationRules`: Her kural için (sıralı: plant→harvest→feed→water→sell→collect):
    - `autoPlant`: Boş tarla + tohum parası + enerji ≥ 2 → `actPlant`
    - `autoHarvest`: Hazır tarla + depo yer → `actHarvest`
    - `autoFeed`: Besleme vakti + yem ≥ maliyet → `doFeed`
    - `autoWater`: Kuru tarla + su ≥ ihtiyaç + enerji ≥ 3/tarla → `actWater` (akıllı sula)
    - `autoSell`: Depo > 90% + envanter > 0 → `doSellAll`
    - `autoCollect`: Hazır fabrika + depo yer → `factoryCollectAll`
  - Her tick'te (advance'de 5 dk aralıkla) **en fazla 1 kural** çalışır (sıralı öncelik). Kaynak yetersizse `toast` + log, bir sonraki tick'te tekrar dener.
  - `S.flags.automationLastTick` ile son çalışma zamanı takip.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(automation): add rule engine evalAutomationRules integrated in advance"`

### Task 3.2: Toplu İşlem Eylemleri

**Files:**
- Modify: `app.js:3163-3464` (handler), `GreenValleyFarm.html` (UI butonları — zoneCard, farmInfo, livestock, factory)

**Interfaces:**
- Produces: `actPlantAll()`, `actHarvestAll()` (zaten var), `actFeedAll()`, `actWaterAll()`, `actSellAll()` (zaten var), `actCollectAll()`, `actFactoryCollectAll()`

- [ ] **Step 1: Write failing test** — `runSelftest` içinde her toplu işlem için 1 assert (enerji/para/yer kontrolüyle)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Her fonksiyon: ilgili tüm nesneler üzerinde döngü, kaynak kontrolü (toplam maliyet ≤ mevcut), başarılı olanları işle, kısmi başarılı olursa `toast` ile bildir. `data-action` attribute'ları: `plant-all`, `feed-all`, `water-all`, `collect-all`, `factory-collect-all`.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add app.js GreenValleyFarm.html && git commit -m "feat(actions): add bulk plant/feed/water/collect/factory-collect actions"`

### Task 3.3: Yeni Sekmeler — Research, Perks, Contracts, Village, Festival, Genetics, Prestige, Automation, Analytics

**Files:**
- Modify: `GreenValleyFarm.html` — HTML yapısı (screen'ler), CSS, renderer fonksiyonları (`renderResearch`, `renderPerks`, `renderContracts`, `renderVillage`, `renderFestival`, `renderGenetics`, `renderPrestige`, `renderAutomation`, `renderAnalytics` genişletme), `showScreen`/`showTab` genişletme

**Interfaces:**
- Consumes: Task 2.1–2.6 state + fonksiyonları
- Produces: 9 yeni tam işlevli sekme (HTML + render + live update)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('research sekmesi render', typeof GVF.renderResearch === 'function')` vb. 9 assert
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** — Her sekme için:
  - **HTML:** `<section class="screen" id="scr-research" data-tab="research">` + içerik container (`#researchContent`)
  - **CSS:** `.research-tree` (grid 4 kolon), `.research-node` (locked/available/done), `.research-connector` (SVG çizgiler), `.perk-grid` (2 kolon), `.contract-card`, `.npc-marker` (harita üzerinde), `.festival-banner`, `.breed-card` (rare/legendary), `.prestige-card`, `.automation-rule`, `.analytics-export`
  - **Renderer:** `GVF.renderResearch(S)`, `renderPerks(S)`, `renderContracts(S)`, `renderVillage(S)`, `renderFestival(S)`, `renderGenetics(S)`, `renderPrestige(S)`, `renderAutomation(S)`, `renderAnalytics(S)` — `sig` pattern'i ile live update
  - **showScreen:** `case 'scr-research': renderResearch(); break` vb.
  - **Tab bar:** `data-tab="research"` + ikon (`i-flask`), `perks` (`i-star`), `contracts` (`i-file`), `village` (`i-users`), `festival` (`i-gift`), `genetics` (`i-dna`), `prestige` (`i-crown`), `automation` (`i-cpu`), `analytics` (mevcut `reports` genişlet)
  - **Live update:** `renderResearchLive` vb. — `sig.research` = `JSON.stringify(S.research) + '|' + S.researchPoints`
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(ui): add 9 new tabs (research, perks, contracts, village, festival, genetics, prestige, automation, analytics) with renderers"`

### Task 3.4: Gelişmiş İstatistikler + CSV Export

**Files:**
- Modify: `GreenValleyFarm.html` (analytics sekmesi genişletme), `app.js` (statistics hesaplama)

**Interfaces:**
- Produces: `GVF.exportStatisticsCSV(S) -> string` — lifetime + daily arrays + prestige history → CSV
- Consumes: `S.statistics`, `S.history`, `S.prestige`

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('CSV export', GVF.exportStatisticsCSV(t).includes('lifetimeHarvests'))`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `S.statistics.dailyEarned/Harvests/Feeds` her gün `newDay`'de push (son 30 gün tut)
  - `exportStatisticsCSV`: Başlık satırı + veri satırları (gün, para, hasat, besleme, ürün, prestige). `Blob` + `URL.createObjectURL` + `<a download>` ile indirme.
  - Analytics sekmesinde "CSV İndir" butonu.
  - Grafikler: Chart.js yok — mevcut CSS bar chart genişletme (lifetime para trendi, prestige karşılaştırması).
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(analytics): add lifetime statistics tracking, CSV export, extended charts"`

### Task 3.5: Erişilebilirlik (WCAG 2.1 AA) + Ayarlar Sekmesi Genişletme

**Files:**
- Modify: `GreenValleyFarm.html` (CSS, settings sekmesi, HTML attribute'lar), `app.js` (settings handler)

**Interfaces:**
- Produces: `S.settings.highContrast`, `largeText`, `reduceMotion` — CSS class toggle (`body.high-contrast`, `body.large-text`), `prefers-reduced-motion` saygısı, focus-visible güçlendirme, ARIA label'lar, buton boyutları ≥48dp

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('high contrast CSS', document.documentElement.classList.contains('high-contrast'))` (toggle sonrası), `add('button min size', getComputedStyle(btn).minHeight >= '48px')`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - CSS: `.high-contrast { --card:#000; --ink:#fff; --muted:#ccc; --line:#fff; --green-900:#0f0; ... }`, `.large-text { font-size: 1.25rem; }`, `.reduce-motion * { animation:none !important; transition:none !important; }`
  - `S.settings` toggle'ları → `document.documentElement.classList.toggle('high-contrast', S.settings.highContrast)` vb. `renderAll`'de uygula.
  - Settings sekmesine: "Yüksek Kontrast", "Büyük Metin", "Hareket Azalt" toggle'ları (mevcut `sound/vibration/notifications` yanına).
  - Tüm interaktif elementler: `min-height: 48px`, `min-width: 48px`, `focus-visible` outline 3px.
  - ARIA: `role="button"`, `aria-label`, `aria-pressed` (toggle'lar), `aria-live="polite"` (toast), `aria-hidden` (modal/scrim).
  - Renk kontrastı: Mevcut palet AA uygun — yüksek kontrast modunda AAA.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(a11y): add high contrast, large text, reduce motion, ARIA labels, 48dp touch targets, settings toggles"`

---

## Phase 4: Yaşayan Dünya — NPC, Festival, Köy Projeleri (Tasks 4.1–4.3)

### Task 4.1: NPC Harita Entegrasyonu + Ziyaret/Diyalog Sistemi

**Files:**
- Modify: `GreenValleyFarm.html` (mapOverlay NPC'ler — Task 1.3 zaten), `renderVillage`, `renderVillageLive`, village sekmesi HTML/CSS
- Modify: `app.js` (handler `actVisitNPC`, `actNPCQuest` — Task 2.6 zaten)

**Interfaces:**
- Produces: Village sekmesi — NPC listesi (portrait, isim, seviye, özelik, güven), "Ziyaret Et" butonu → bottom sheet diyalog (konuşma, teklifler: tohum indirimi, ırk bilgisi, yem takası, meydan okuma, hediye, ipucu), görev butonları

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('NPC ziyaret diyalogu', GVF.renderVillage(t).includes('Hasan Amca'))`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `renderVillage`: `NPC_FARMS` map → kart grid. Her kart: güven çubuğu, son ziyaret, "Ziyaret Et" (`data-action="visit-npc" data-npc="npc1"`)
  - Bottom sheet (`openSheet`): NPC portre, diyalog metni (kişilik bazlı: mentor/nurturer/competitor/friendly/wise/energetic), teklif butonları (`data-action="npc-offer" data-offer="seed_discount"`), görev butonu (`data-action="npc-quest"`)
  - `actVisitNPC`: `S.npcRelations[npcId].lastVisit = S.day`, `trust = Math.min(100, trust + 5)`, `saveState`, `refreshSheet`
  - `actNPCQuest`: Görev türü (tohum ver, hasat et, besle, yükselt) → tamamlanınca `trust +15`, ödül ver, `saveState`, `toast`
  - Harita NPC marker'ı tıklanabilir → village sekmesine götür + NPC kartını vurgu yap.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(npc): add village tab with NPC visit dialog, quests, trust system, map integration"`

### Task 4.2: Mevsimal Festival Sistemi

**Files:**
- Modify: `GreenValleyFarm.html` (festival sekmesi, ana sayfa banner, harita süslemeleri — Task 1.3), `renderFestival`, `renderFestivalLive`
- Modify: `app.js` (handler `actFestivalTask` — Task 2.6 zaten, `newDay`/`checkAlerts` entegrasyonu — Task 2.5 zaten)

**Interfaces:**
- Produces: Festival sekmesi — aktif festival bannerı (countdown), görev listesi (ilerleme çubuğu), ödüller, "Tamamla" butonları. Ana sayfa: festival bannerı (küçük). Harita: mevsime göre süsleme.

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('festival görevleri', GVF.getCurrentFestival(t).tasks.length > 0)`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `getCurrentFestival`: `S.day` → `FESTIVALS` hangi mevsimin hangi gününde → festival objesi döndür.
  - `renderFestival`: Görevler için `checkFestivalProgress` ilerleme (`S.festivalProgress` objesi), her görev: tip/hedef/ilerleme, buton (`data-action="festival-task"`). Ödüller: para/XP/perk/bina.
  - `actFestivalTask`: Görev tamamlandı mı kontrol → ödül ver (`S.money +=`, `addXp`, `S.perks[cat][perkId]=true`, `S.factionRewards...`), `S.festivalProgress[taskId].done=true`, `toast`, `confetti`, `saveState`, `renderAll`.
  - `newDay`: Festival günü başlangıcında `addNotification('Festival başladı!', ...)`, `S.festivalProgress = {}`.
  - Ana sayfa bannerı: `home` render'ında `getCurrentFestival` varsa küçük banner (renkli, countdown).
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(festival): add seasonal festivals with tasks, rewards, home banner, map decorations"`

### Task 4.3: Köy Projeleri + Yerel Liderlik Tablosu

**Files:**
- Modify: `GreenValleyFarm.html` (village sekmesine köy projeleri bölümü, analytics/profil sekmesine leaderboard), `app.js` (simülasyon)

**Interfaces:**
- Produces: Köy projeleri — topluluk hedefleri (örn. "Okul Tamiri: 50.000 ₺", "Su Kuyusu: 30.000 ₺"), katkı butonu (para/ürün), ilerleme çubuğu, tamamlandığında ödül (yeni bina/alan/ırk). Liderlik tablosu — 10 simüle edilmiş oyuncu (isim, seviye, para, hasat, seri) — haftalık sıfırlama.

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('köy projeleri render', GVF.renderVillage(t).includes('Okul'))`, `add('leaderboard simülasyon', GVF.generateLeaderboard(t).length === 10)`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `S.villageProjects` array: `{ id, name, desc, targetMoney, targetItems, currentMoney, currentItems, completed, reward }`
  - `newDay`: Rastgele proje başlatma (haftada 1), simüle edilmiş topluluk katkısı (günlük 1000-5000 ₺).
  - `actVillageDonate(projectId, type, amount)`: Para/ürün katkısı → `currentMoney/Items` artır, `S.money` düş, `toast`, `saveState`.
  - Proje tamamlandığında: `reward` ver (bina kilidi aç, ırk kilidi aç, alan aç), bildirim.
  - `generateLeaderboard(S)`: 10 rastgele isim + `level: 5-50`, `money: 10k-10M`, `harvests: 100-100k`, `streak: 1-365` → `S.day` bazlı seed ile deterministik (haftalık değişir).
  - Analytics/Profil sekmesine "Haftalık Liderlik" paneli.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "feat(village): add community projects with donations, rewards, weekly leaderboard simulation"`

---

## Phase 5: Görsel Polisaj + Ses (Tasks 5.1–5.4)

### Task 5.1: Parçacık Efektleri (Hasat, Besleme, Yapım, Seviye, Prestige)

**Files:**
- Modify: `GreenValleyFarm.html:2338-2439` (`makeFx`, `renderFloat` arasına), CSS (`.particle-*` sınıfları)

**Interfaces:**
- Produces: `spawnParticles(type, x, y, count)` — type: `harvest`|`feed`|`craft`|`levelup`|`prestige`|`contract`|`festival` → DOM `i` elementleri ekler, animasyon sonrası kaldırır

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('particle spawn', typeof GVF.spawnParticles === 'function')`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - CSS: `.particle-harvest` (ürün ikonu uçuşu, parabolik), `.particle-feed` (yem tanesi), `.particle-craft` (dişli/fabrikadan duman), `.particle-levelup` (yıldız/parıltı), `.particle-prestige` (büyük konfeti + ışınlanma), `.particle-contract` (evrak), `.particle-festival` (balon/confetti).
  - `spawnParticles`: `type` + `x,y` (viewport koordinat) + `count` → `for` döngüsünde `document.createElement('i')`, class + style (left/top, `--dx`, `--dy`, `animationDuration`), `app.appendChild`, `setTimeout(remove, 2000)`.
  - Entegrasyon: `actHarvest`/`harvestAll` → `spawnParticles('harvest', elX, elY, 8)`, `doFeed` → `'feed'`, `factoryCollect` → `'craft'`, `showLevelUp` → `'levelup'`, `actPrestige` → `'prestige'` (30 parçacık), `completeContract` → `'contract'`, `actFestivalTask` → `'festival'`.
  - `prefers-reduced-motion` ve `S.settings.reduceMotion` saygılı → hiç spawn etme.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(fx): add particle effects for harvest, feed, craft, levelup, prestige, contract, festival"`

### Task 5.2: Akıcı Geçişler + Gündüz/Gece/Ay Detayları + Hava Parçacıkları

**Files:**
- Modify: `GreenValleyFarm.html:2075-2174` (`animateView`, `setMap`), `2420-2457` (`renderWorld`, `makeFx`), CSS (`.screen` transition, `.tab` transition)

**Interfaces:**
- Produces: Geliştirilmiş `animateView` (600ms ease-out), `makeFx` (ay fazı, yıldız parlaklığı, göl ışığı, çamur/ısı/kar detayları), ekran geçişleri (sayfa kayma + zoom)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('gece ay fazı', GVF.getMoonPhase(t).match(/new|waxing|full|waning/))`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `getMoonPhase(S)`: `S.day % 29.5` → `new/waxing_crescent/first_quarter/waxing_gibbous/full/waning_gibbous/last_quarter/waning_crescent`. Ay ışığı etkisi: `phase === 'full'` → gece su tüketimi -%10, `phase === 'new'` → gece hayvan stresi +%5.
  - `makeFx` genişletme: `phase === 'night'` + `moonPhase` → `sun-mote` parlaklığı ay ışığına göre. `weather === 'rainy'` → `mud-splash` (çamur lekeleri, düşük opaklık). `weather === 'heat'` → `heat-shimmer` yoğunluk sıcaklığa göre. `weather === 'snow'` → `snow-accumulation` (birikinti, `snow-flake` yavaşlar).
  - `animateView`: `dur: 600`, `ease: cubic-bezier(.32,.72,0,1)` (mevcut `--ease`).
  - Ekran geçişi: `.screen` transition `transform .5s var(--ease)` zaten var — `opacity .34s` + `transform .5s` güzel. `showScreen` içinde `next.classList.add('instant')` kaldır, doğal geçiş olsun.
  - Tab bar: `.tab` transition `color .3s` + `transform .3s` — aktif ikon `translateY(-2px)` bounce.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(polish): add moon phases, enhanced weather particles, smoother transitions, night lighting"`

### Task 5.3: Ses Motoru (Web Audio API) — 13 Ses Türü

**Files:**
- Modify: `app.js:1390-1433` (`ensureAudio`, `beep`, `feedback` genişletme), `SOUND_RECIPES` sabiti

**Interfaces:**
- Produces: `playSound(kind)` — `kind`: `tap`|`water`|`coin`|`feed`|`success`|`error`|`level`|`prestige`|`contract`|`npc`|`festival`|`plant`|`harvest` → `AudioContext` sentez

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('ses motoru', typeof GVF.playSound === 'function')`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `SOUND_RECIPES` objesi (spec §8) — her kind için `[{freq, time, type, gain}, ...]` dizisi.
  - `playSound(kind)`: `ensureAudio()` → `ctx.createOscillator` + `gainNode` → her notayı zamanla başlat/bitir. `S.sound` ve `STATIC`/`REDUCED` saygılı.
  - `feedback(kind)` genişletme: `kind` → `playSound(kind)` eşlemesi (`tap`→`tap`, `success`→`success`, `coin`→`coin`, `feed`→`feed`, `water`→`water`, `level`→`level`, `prestige`→`prestige`, `contract`→`contract`, `npc`→`npc`, `festival`→`festival`, `plant`→`plant`, `harvest`→`harvest`, `error`→`error`).
  - Tüm eylemlerde `feedback` çağrısı zaten var — yeni kind'lar otomatik çalışır.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add app.js && git commit -m "feat(audio): add Web Audio API synthesis for 13 sound types integrated in feedback()"`

### Task 5.4: Harita Canlılığı — NPC Gezintisi, Hayvan Yolları, Mevsimi Ağaçlar

**Files:**
- Modify: `GreenValleyFarm.html:667-744` (`mapOverlay` — Task 1.3 zaten kısmen), `2420-2457` (`renderWorld` içinde harita animasyon)

**Interfaces:**
- Produces: Harita üzerinde sürekli animasyon — NPC'ler ev↔köy merkezi yürür, hayvanlar ahır↔meraa döngüsü, ağaçlar mevsime göre yeşerir/sarılar/döker.

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('NPC animasyon', GVF.mapOverlay(t).includes('npc-walk'))`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `mapOverlay` döndürdüğü HTML'e `<animateMotion>` (SMIL) veya CSS `animation` ile hareket yolları ekle:
    - NPC: `mapNPCHouse` → köy merkezi (yaklaşık `[500,600]`) → geri, 30s döngü, gecikme her NPC için farklı.
    - Hayvanlar: `mapCowsmall`/`mapChicken`/`mapSheep` → `mapAnimalPath` (bezier) üzerinden ahır↔meraa, 20s döngü.
    - Ağaçlar: `mapTreeSpring` (yeşil, çiçekli), `Summer` (koyu yeşil), `Autumn` (turuncu/kırmızı, yaprak düşer `leaf-drift`), `Winter` (soğan, kar kaplı). Mevsim değişiminde `cross-fade` (opacity animasyonu 2s).
  - `renderWorld` içinde harita SVG'sine class ekle: `.map-card.phase-night.season-autumn` → CSS ile ağaç görünümü değiştir.
  - Performans: `requestAnimationFrame` yok — SMIL/CSS animation GPU hızlandırılıyor. `screen:not(.active)` içinde `animation-play-state: paused`.
- [ ] **Step 4: Run test** — PASS
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html && git commit -m "feat(map): add NPC walking, animal grazing loops, seasonal tree transitions with SMIL/CSS animations"`

---

## Phase 6: Teknik — PWA, TWA, Save Export/Import, Performans (Tasks 6.1–6.4)

### Task 6.1: Service Worker (`sw.js`) — Offline-First PWA

**Files:**
- Create: `sw.js` (proje kökünde)
- Modify: `GreenValleyFarm.html` (SW registration script), `manifest.webmanifest`

**Interfaces:**
- Produces: `sw.js` — `install` (static cache), `fetch` (stale-while-revalidate HTML/JS, cache-first images/fonts), `activate` (cleanup), `message` (skipWaiting, clearCache, syncSave), `sync` (background sync: save-export)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('SW registration', 'serviceWorker' in navigator)` (browser context'ta test edilemez, manuel doğrulama)
- [ ] **Step 2: Run test** — (Manuel: Chrome DevTools Application → Service Workers → registered + controlled)
- [ ] **Step 3: Implement** —
  - `sw.js`:
    ```js
    const STATIC = 'gvf-static-v3', RUNTIME = 'gvf-runtime-v3';
    const ASSETS = ['/', '/GreenValleyFarm.html', '/app.js', '/manifest.webmanifest', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/jakarta-variable.woff2'];
    self.addEventListener('install', e => { e.waitUntil(caches.open(STATIC).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
    self.addEventListener('fetch', e => {
      const url = new URL(e.request.url);
      if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js')) {
        e.respondWith(caches.open(RUNTIME).then(async c => {
          const resp = await c.match(e.request);
          const fetchPromise = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; });
          return resp || fetchPromise;
        }));
      } else {
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
      }
    });
    self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![STATIC,RUNTIME].includes(k)).map(k => caches.delete(k))))); self.clients.claim(); });
    self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); if (e.data === 'clearCache') caches.keys().then(keys => keys.forEach(k => caches.delete(k))); if (e.data === 'syncSave') self.registration.sync.register('save-export'); });
    self.addEventListener('sync', e => { if (e.tag === 'save-export') e.waitUntil(syncSaveToCloud()); });
    async function syncSaveToCloud() { const clients = await self.clients.matchAll(); clients.forEach(c => c.postMessage({type: 'sync-save'})); }
    ```
  - `GreenValleyFarm.html` init'e: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`.
  - `manifest.webmanifest`: `shortcuts` ekle (Hasat, Besle, Pazar), `categories: ['games','simulation']`, `screenshots` (placeholder), `prefer_related_applications: false`.
- [ ] **Step 4: Run test** — Manuel: Chrome DevTools → Application → Service Worker → "Offline" tikli → sayfa yenile → çalışır. Lighthouse PWA audit > 90.
- [ ] **Step 5: Commit** — `git add sw.js GreenValleyFarm.html manifest.webmanifest && git commit -m "feat(pwa): add Service Worker offline-first, stale-while-revalidate, background sync, manifest shortcuts"`

### Task 6.2: Save Export/Import + IndexedDB Yedek + Cloud Sync Altyapısı

**Files:**
- Modify: `app.js` (yeni fonksiyonlar), `GreenValleyFarm.html` (settings sekmesine butonlar)

**Interfaces:**
- Produces: `exportSave() -> void` (dosya indirme), `importSave(file) -> Promise<void>` (doğrulama + merge), `saveToIndexedDB() -> Promise<void>`, `loadFromIndexedDB() -> Promise<S|null>`, `syncSaveToCloud() -> Promise<void>` (altyapı, IndexedDB ↔ Firebase hazır)

- [ ] **Step 1: Write failing test** — `runSelftest` içinde `add('export save', typeof GVF.exportSave === 'function')`, `add('import save', typeof GVF.importSave === 'function')`
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - `exportSave`: `JSON.stringify(S)` → `Blob` → `URL.createObjectURL` → `<a download="yesilvadi-save-${dateKey()}.json">` → click → `URL.revokeObjectURL`. `toast('Yedek indirildi')`.
  - `importSave(file)`: `file.text()` → `JSON.parse` → `version` kontrol (2/3) → `G.mergeState` → `S = merged` → `saveState()` → `renderAll(true)` → `toast('Yedek yüklendi')`. Hata durumunda `toast('Geçersiz yedek', 'err')`.
  - `saveToIndexedDB`: `idb.open('yesilvadi', 1, db => { db.createObjectStore('saves'); })` → `put('saves', S, 'current')`.
  - `loadFromIndexedDB`: `get('saves', 'current')` → `S` veya `null`.
  - `syncSaveToCloud`: `navigator.serviceWorker.ready.then(reg => reg.sync.register('save-export'))` → SW background sync tetikler → `syncSaveToCloud` (Task 6.1) → client'lara `postMessage({type: 'sync-save'})` → client `saveToIndexedDB()`.
  - Settings sekmesine: "Yedek İndir (JSON)", "Yedek Yükle (dosya seç)", "IndexedDB'ye Kaydet", "IndexedDB'den Yükle", "Bulut Senkron (yakında)" butonları.
- [ ] **Step 4: Run test** — PASS (fonksiyon varlığı), manuel: JSON indir → yeni sekmede yükle → oyun aynen devam eder.
- [ ] **Step 5: Commit** — `git add app.js GreenValleyFarm.html && git commit -m "feat(save): add JSON export/import, IndexedDB backup, cloud sync infrastructure"`

### Task 6.3: Android TWA Hazırlığı (`assetlinks.json`, splash, manifest)

**Files:**
- Create: `.well-known/assetlinks.json` (proje kökünde, sunucuya deploy edilecek), `twa-manifest.json` (bubblewrap için)
- Modify: `manifest.webmanifest` (TWA uyumlu alanlar)

**Interfaces:**
- Produces: `assetlinks.json` — `[{relation:['delegate_permission/common.handle_all_urls'], target:{namespace:'android_app', package_name:'com.yesilvadi.farm', sha256_cert_fingerprints:['...']}}]`

- [ ] **Step 1: Write failing test** — (Manuel: Digital Asset Links doğrulama)
- [ ] **Step 2: Run test** — (Deploy sonrası)
- [ ] **Step 3: Implement** —
  - `assetlinks.json`: Şablon — `package_name` ve `sha256_cert_fingerprints` placeholder (gerçek keystore imzasıyla doldurulacak).
  - `manifest.webmanifest`: `display: 'standalone'`, `orientation: 'portrait-primary'`, `scope: '/'`, `start_url: '/'`, `theme_color: '#F5F1E8'`, `background_color: '#F5F1E8'`, `icons` zaten var.
  - `twa-manifest.json`: Bubblewrap CLI için şablon (package name, name, colors, icons, signing key alias).
  - Not: Gerçek TWA build için Android Studio/bubblewrap ayrı repoda — bu repoda sadece doğrulama dosyaları hazırlanır.
- [ ] **Step 4: Run test** — (Manuel: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://domain.com&relation=delegate_permission/common.handle_all_urls`)
- [ ] **Step 5: Commit** — `git add .well-known/assetlinks.json twa-manifest.json manifest.webmanifest && git commit -m "feat(twa): add assetlinks.json, twa-manifest.json, manifest updates for Trusted Web Activity"`

### Task 6.4: Performans + Self-Test Genişletme + Son Kontroller

**Files:**
- Modify: `GreenValleyFarm.html` (virtual scrolling için listeler — `quests`, `contracts`, `npc`, `achievements`), `app.js:3490-3605` (`runSelftest` genişletme)

**Interfaces:**
- Produces: Virtual scrolling (sadece görünen DOM node'ları), `runSelftest` 100+ assert (tüm yeni sistemler), Lighthouse performans > 90

- [ ] **Step 1: Write failing test** — `runSelftest` içinde yeni 50+ assert (Task 1–6 tüm sistemler için entegrasyon testleri)
- [ ] **Step 2: Run test** — FAIL
- [ ] **Step 3: Implement** —
  - **Virtual scrolling**: Uzun listeler (`quests`, `contracts`, `NPC_FARMS`, `ACHIEVEMENTS`, `history`) için `IntersectionObserver` + `data-index` pattern. Sadece viewport + 5 buffer render et. `renderResearchLive`/`renderContractsLive` vb. içinde uygula.
  - **Self-test genişletme**: Spec §11.1'deki tüm assert'leri `runSelftest` içine ekle (veri tabloları, motor fonksiyonları, eylemler, save/load yuvarlak, prestige, research, perk, contract, faction, npc, festival, genetics, automation, particles, audio, PWA).
  - **Performans**: `requestAnimationFrame` batching (zaten var), `setText`/`setHTML`/`setWidth` diffing (zaten var), SVG `viewBox` animasyonu `cancelAnimationFrame` (zaten var). Yeni: `mapOverlay` sadece `force` veya `sig.overlay` değişince render et (zaten var). Liste render'ları virtual.
  - **Lighthouse**: `npm i -g lighthouse` → `lighthouse http://localhost:8080 --view` (local test) — PWA, Performance, Accessibility, Best Practices > 90.
- [ ] **Step 4: Run test** — `?selftest=1` → PASS (100+ assert). Lighthouse > 90.
- [ ] **Step 5: Commit** — `git add GreenValleyFarm.html app.js && git commit -m "perf: virtual scrolling for long lists, extended self-test 100+ asserts, Lighthouse 90+ verified"`

---

## Execution Handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-11-06-yesilvadi-efsanevi-implementation.md`.

**Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven**, because the 28 tasks have tight interface dependencies (Task 2.2 → 2.3 → 2.4, Task 1.1 → 1.3 → 1.4 → 1.5, Task 3.1 → 3.2, Task 4.1 → 4.2 → 4.3) and a mistake in early data/calculation tasks would cascade silently into UI/automation/world tasks. Independent review per task catches interface mismatches early.

**Does the plan capture what you want, and which approach should we use?**