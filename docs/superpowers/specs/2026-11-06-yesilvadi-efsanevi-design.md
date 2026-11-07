# Yeşil Vadi Çiftliği — Efsanevi Sürüm Tasarım Belgesi

**Tarih:** 2026-11-06  
**Versiyon:** 1.0  
**Durum:** Onay Bekliyor

---

## 1. Niyet ve Neden

Mevcut oyun (v2.1) zaten çok sağlam: 7 bölge, 3 ürün, 4 hayvan, 4 fabrika, hava/mevsim, görevler, başarımlar, çevrimdışı ilerleme, yerel bildirimler, öğretici. **Eksik olan "sonsuzluk" ve "derinlik" hissiyatı.** Oyuncu seviye 10'a ulaştığında ve tüm yükseltmeleri yaptığında hedef kalmıyor.

Bu tasarım, **içerik genişletmesi + meta progresyon + otomasyon + yaşayan dünya + görsel polisaj + teknik mükemmellik** altı direği tek bir bütünlükte birleştirir. Hedef: **100+ saat tekrar oynanabilir, her nesilde farklı hissiyat veren, "premium" kalitesinde, tam offline çalışan, kurulanabilir PWA bir çiftlik tycoon.**

---

## 2. Hedefler, Olmayan Hedefler, Anti-Hedefler

### Hedefler
- **İçerik:** +9 ürün, +3 hayvan türü, +2 fabrika, +3 harita bölgesi, genetik/ırk sistemi
- **Meta Progresyon:** Prestige (Nesil), Araştırma Ağacı (4 dal), Perk Sistemi (30+), Kontratlar, İtibar/Faksiyon (4)
- **Otomasyon:** Kural tabanlı yönetim paneli, toplu işlemler, gelişmiş istatistikler, erişilebilirlik
- **Yaşayan Dünya:** NPC komşu çiftlikler (4-6), haftalık köy pazarı, 4 mevsimal festival, yerel liderlik tablosu, köy projeleri
- **Görsel/His:** Harita canlılığı (NPC'ler, hayvan yolları, mevsime göre ağaçlar), parçacık efektleri, akıcı geçişler, gündüz/gece detayları, hava parçacıkları, sentetik ses tasarımı
- **Teknik:** Offline-first PWA (Service Worker), save export/import/bulut senkron altyapısı, 60fps mobil, <3s cold start, TWA hazır, WCAG 2.1 AA

### Olmayan Hedefler (Non-Goals)
- Çok oyunculu / backend / sunucu
- Mikro işlem, reklam, para kazanma
- Harici framework (React, Vue, Phaser) — vanilla JS/HTML/CSS kalır
- Mevcut save formatını bozma — `mergeState` geriye uyumlu kalır
- Performansı riske atma — her animasyon `prefers-reduced-motion` saygılı

### Anti-Hedefler (Başarısızlık Kriterleri)
- Yeni sistemler eklendiğinde FPS 30'un altına düşerse
- Save/load 2 saniyeden uzun sürerse
- Prestige sonrası "yeni oyun +" hissi vermiyorsa (sadece stat sıfırlamaysa)
- Erişilebilirlik testlerinde kritik hata verirse
- PWA kurulumu mobilde çalışmıyorsa

---

## 3. Kısıtlar

| Kısıt | Değer |
|-------|-------|
| Platform | Tarayıcı (PWA), Android WebView (TWA) |
| Depolama | `localStorage` (ana), `IndexedDB` (yedek/bulut), `sessionStorage` (geçici) |
| Save Anahtarı | `yesilvadi_tycoon_v2` (değişmez) |
| Versiyon | `version: 2` (mevcut) → `version: 3` (bu tasarım) |
| Oyun Saati | 1 gerçek saniye = 5/60 oyun dakikası (`MIN_PER_SEC = 5/60`) |
| Maks Seviye | Çiftlik: 10, Bölge: 5, Prestige sonrası sınırsız (nesil bazlı bonus) |
| Dosya Yapısı | Tek HTML (`GreenValleyFarm.html`), tek JS (`app.js`), `manifest.webmanifest`, yeni `sw.js` |
| İkon Font | Inline SVG `<use href="#id"/>` pattern'i korunur |
| Yazı Tipi | `Plus Jakarta Sans` (WOFF2 base64 inline) |
| Renk Paleti | Mevcut CSS custom properties (`--green-*`, `--mint`, `--peach`, `--lav`, `--wheat`, `--orange`, `--blue`) genişletilir |

---

## 4. Yaklaşımlar ve Seçim

| Yaklaşım | Açıklama | Neden Seçilmedi / Seçildi |
|----------|----------|---------------------------|
| **A: Tek Dosya Monolit** (mevcut) | Tüm HTML/CSS/JS tek dosyada, `GVF` namespace | ✅ **Seçildi** — Mevcut mimari çok temiz, namespace ayrımı net, build yok, dağıtım trivial |
| **B: Modüler ES Modules** | `src/data.js`, `src/engine.js`, `src/ui.js`... | ❌ Build step gerektirir, HTTP/2 push yoksa mobilde yavaşlar, PWA cache karmaşıklığı |
| **C: Framework (Preact/Svelte)** | Bileşen tabanlı UI | ❌ Bundle boyutu, runtime maliyeti, mevcut vanilla performansını bozar |
| **D: Game Engine (Phaser/PIXI)** | Canvas/WebGL render | ❌ DOM tabanlı UI (erişilebilirlik, CSS animasyonlar) çok daha uygun, SVG harita zaten mükemmel |

**Karar:** Mevcut **tek dosya + namespace** mimarisi korunur, sadece `GVF` namespace'i sistematik genişletilir. Yeni `sw.js` ayrı dosya olarak eklenir.

---

## 5. Veri Mimarisi — `GVF` Namespace Genişletmesi

Tüm yeni veri `GreenValleyFarm.html` içindeki IIFE'nin `window.GVF` nesnesine eklenir. Mevcut anahtarlar korunur, yeniler eklenir.

### 5.1 Yeni Sabit Veri Tabloları

```javascript
// Yeni ürünler (CROPS'a eklenir)
const NEW_CROPS = {
  eggplant:    { name:'Patlıcan', short:'Patlıcan', icon:'i-eggplant', tile:'peach', color:'#6B3A8E', growth:1.5, seedCost:55, yieldBase:100, waterUse:450, items:{ eggplant:1 }, desc:'Sera patlıcanı; ılık havayı sever.' },
  pepper:      { name:'Biber', short:'Biber', icon:'i-pepper', tile:'peach', color:'#D94A2E', growth:1.7, seedCost:60, yieldBase:90, waterUse:400, items:{ pepper:1 }, desc:'Acı veya tatlı biber; sera ideali.' },
  cucumber:    { name:'Salatalık', short:'Salatalık', icon:'i-cucumber', tile:'mint', color:'#3FA34D', growth:1.9, seedCost:50, yieldBase:110, waterUse:520, items:{ cucumber:1 }, desc:'Su bol, soğuk havayı sevmez.' },
  potato:      { name:'Patates', short:'Patates', icon:'i-potato', tile:'wheat', color:'#C9A84C', growth:1.3, seedCost:45, yieldBase:140, waterUse:480, items:{ potato:1 }, desc:'Toprak altı verimli, depolama kolay.' },
  spinach:     { name:'Ispanak', short:'Ispanak', icon:'i-spinach', tile:'mint', color:'#2E7D3A', growth:2.0, seedCost:40, yieldBase:85, waterUse:380, items:{ spinach:1 }, desc:'Hızlı büyür, kışın değerli.' },
  strawberry:  { name:'Çilek', short:'Çilek', icon:'i-strawberry', tile:'peach', color:'#D93A5E', growth:1.6, seedCost:70, yieldBase:95, waterUse:420, items:{ strawberry:1 }, desc:'Mevsimlik, pazar fiyatı yüksek.' }
};

// Yeni hayvan türleri (ANIMALS'a eklenir)
const NEW_ANIMALS = {
  roosters: { name:'Horozlar', one:'Horoz', icon:'i-rooster', art:'artRooster', item:'egg', itemName:'Yumurta', unit:'adet', baseCount:8, perLevel:2, yieldBase:.7, health:92, color:'#C08A32', tile:'wheat', names:['Kral','Uyanıkcı','Şahin','Alaca'], breeds:['Denizli','Ankara','İzmir'] },
  fish:     { name:'Balıklar', one:'Balık', icon:'i-fish', art:'artFish', item:'fish', itemName:'Balık', unit:'kg', baseCount:0, perLevel:50, yieldBase:.2, health:95, color:'#4E8FB0', tile:'lav', names:['Altın','Gümüş','Çipura','Levrek'], breeds:['Sazan','Alabalık','Levrek','Çipura'] },
  // Keçi ırkları ayrı nesne olarak (genetik için)
  goatBreeds: {
    saanen:    { name:'Saanen', milkMult:1.2, healthMod:0, color:'#F5F0E8' },
    nubian:    { name:'Nubian', milkMult:1.0, healthMod:5, color:'#D9C8B0' },
    kilkecisi: { name:'Kıl Keçisi', milkMult:0.8, healthMod:10, color:'#B8A088' }
  }
};

// Yeni fabrikalar (FACTORY_DEFS'a eklenir)
const NEW_FACTORIES = {
  meat: {
    name:'Et Fabrikası', icon:'i-meat', tile:'peach', desc:'Hayvan etinden sucuk, salam, pastırma, kavurma üret.',
    unlockCost:12000, slotCosts:[3500,8000,15000], accent:'#B64B35',
    recipes:[
      { id:'sausage', name:'Sucuk', icon:'i-sausage', out:{ sausage:3 }, need:{ meat:4 }, time:40, xp:16 },
      { id:'salami', name:'Salam', icon:'i-salami', out:{ salami:2 }, need:{ meat:3, wool:1 }, time:50, xp:18 },
      { id:'pastrami', name:'Pastırma', icon:'i-pastrami', out:{ pastrami:1 }, need:{ meat:5 }, time:60, xp:22 },
      { id:'kavurma', name:'Kavurma', icon:'i-kavurma', out:{ kavurma:2 }, need:{ meat:3, butter:1 }, time:35, xp:14 },
      { id:'jerky', name:'Çiğ Köfte', icon:'i-jerky', out:{ jerky:4 }, need:{ meat:2, lettuce:1 }, time:25, xp:10 }
    ]
  },
  fruit: {
    name:'Meyve Fabrikası', icon:'i-fruit', tile:'peach', desc:'Çilek, domates, meyvelerden reçel, şerbet, kuruyemiş, marmelat.',
    unlockCost:10000, slotCosts:[3000,7000,14000], accent:'#D93A5E',
    recipes:[
      { id:'strawberryJam', name:'Çilek Reçeli', icon:'i-jam', out:{ strawberryJam:2 }, need:{ strawberry:6, sugar:2 }, time:30, xp:12 },
      { id:'tomatoJam', name:'Domates Marmelatı', icon:'i-jam', out:{ tomatoJam:2 }, need:{ tomato:8, sugar:1 }, time:35, xp:13 },
      { id:'fruitLeather', name:'Fruit Leather (Pestil)', icon:'i-pestil', out:{ fruitLeather:3 }, need:{ strawberry:4, tomato:2 }, time:40, xp:14 },
      { id:'juice', name:'Meyve Suyu', icon:'i-juice', out:{ juice:4 }, need:{ strawberry:3, tomato:2 }, time:20, xp:9 },
      { id:'driedFruit', name:'Kuruyemiş Karışımı', icon:'i-dried', out:{ driedFruit:2 }, need:{ strawberry:2, tomato:1, corn:1 }, time:45, xp:15 }
    ]
  }
};

// Yeni harita bölgeleri (ZONE'a eklenir)
const NEW_ZONES = {
  orchard:    { title:'Meyve Bahçesi', sub:'Çilek, muz, elma', icon:'i-tree', tile:'peach', view:[1000,200,400,500], detailView:[1000,200,400,400], ring:[1000,200,400,400], upgradeBase:2000 },
  fishpond:   { title:'Balık Havuzu', sub:'Su ürünleri üretimi', icon:'i-fish', tile:'lav', view:[1000,700,400,400], detailView:[1000,700,400,300], ring:[1000,700,400,300], upgradeBase:2500 },
  forest:     { title:'Orman Alanı', sub:'Ahşap, mantar, bal', icon:'i-tree', tile:'mint', view:[200,1000,600,400], detailView:[200,1000,600,300], ring:[200,1000,600,300], upgradeBase:1800 }
};

// Yeni binalar (bölge içinde yükseltme etkisi olarak)
const BUILDING_EFFECTS = {
  greenhouse: { name:'Serra', desc:'Hava etkisini %50 azaltır, büyüme hızı sabitler', unlockLevel:3, zones:['tomato','vegetable','corn','eggplant','pepper','cucumber','spinach','strawberry'] },
  fertilizer: { name:'Gübre Fabrikası', desc:'Hayvan gübresi → tarla verimi +%20', unlockLevel:3, zones:['animal'] },
  market:     { name:'Pazar Yeri', desc:'NPC alıcıları çeker, fiyat +%5', unlockLevel:4, zones:['storage'] }
};

// Araştırma Ağacı (RESEARCH)
const RESEARCH_TREE = {
  farming: {
    name:'Tarım Bilimi', icon:'i-sprout', color:'#3F8B52',
    nodes: [
      { id:'autoPlant', name:'Otomatik Ekim', desc:'Tohum varken boş tarla otomatik ekilir', cost:500, req:{} },
      { id:'hybridSeeds', name:'Hibrit Tohumlar', desc:'Tüm ürün verimi +%15', cost:1200, req:{autoPlant:true} },
      { id:'dripIrrigation', name:'Damla Sulama', desc:'Su kullanımı -%25', cost:800, req:{autoPlant:true} },
      { id:'greenhouseTech', name:'Serra Teknolojisi', desc:'Serra kilidi açılır', cost:2000, req:{hybridSeeds:true, dripIrrigation:true} },
      { id:'cropRotation', name:'Fasıl Tarımı', desc:'Ekim sonrası toprak verimi +%10 (bir sonraki ekim)', cost:1500, req:{hybridSeeds:true} }
    ]
  },
  livestock: {
    name:'Hayvancılık', icon:'i-cow', color:'#B07B52',
    nodes: [
      { id:'autoFeed', name:'Otomatik Besleme', desc:'Yem varken besleme vakti otomatik', cost:600, req:{} },
      { id:'genetics', name:'Genetik Seçim', desc:'İrk çaprazlama sistemi açılır', cost:1500, req:{autoFeed:true} },
      { id:'premiumBreed', name:'Elite Irklar', desc:'Nadir ırklar (Angus, Merino, vb.) açılır', cost:3000, req:{genetics:true} },
      { id:'vetCare', name:'Veteriner Bakım', desc:'Hayvan sağlığı doğal düşüşü -%50', cost:1000, req:{autoFeed:true} },
      { id:'megaBarn', name:'Mega Ahır', desc:'Hayvan kapasitesi +%50 (seviye 5 üstü)', cost:2500, req:{genetics:true, vetCare:true} }
    ]
  },
  industry: {
    name:'Sanayi', icon:'i-factory', color:'#7A6EB4',
    nodes: [
      { id:'factorySpeed', name:'Hızlı Üretim', desc:'Tüm fabrika süreleri -%15', cost:800, req:{} },
      { id:'parallelSlots', name:'Paralel Yuvalar', desc:'Fabrika başına +1 yuva (maks 5)', cost:2000, req:{factorySpeed:true} },
      { id:'autoCollect', name:'Otomatik Toplama', desc:'Hazır üretim otomatik depoya alınır', cost:1500, req:{factorySpeed:true} },
      { id:'qualityControl', name:'Kalite Kontrol', desc:'Fabrika ürün fiyatı +%10', cost:2500, req:{parallelSlots:true, autoCollect:true} },
      { id:'megaFactory', name:'Mega Fabrika', desc:'4. yuva kilidi açılır', cost:5000, req:{qualityControl:true} }
    ]
  },
  economy: {
    name:'Ekonomi', icon:'i-coin', color:'#D99A2A',
    nodes: [
      { id:'marketInsight', name:'Pazar İçgörüsü', desc:'Fiyat trendi 2 gün önceden görülür', cost:600, req:{} },
      { id:'contracts', name:'Kontrat Sistemi', desc:'Uzun vadeli sözleşmeler açılır', cost:1200, req:{marketInsight:true} },
      { id:'exportLicense', name:'İhracat Lisansı', desc:'Dış pazar: fiyat +%20, miktar 2x', cost:2500, req:{contracts:true} },
      { id:'factionTies', name:'Faksiyon Bağları', desc:İtibar sistemi açılır', cost:1800, req:{marketInsight:true} },
      { id:'banking', name:'Bankacılık', desc:'Faizli birikim (günlük %0.5), kredi', cost:3000, req:{exportLicense:true, factionTies:true} }
    ]
  }
};

// Perk Sistemi (PERKS) — 30+ perk, 4 kategori
const PERKS = {
  farming: [
    { id:'earlyRiser', name:'Erken Kalkıcı', desc:'Sabah 06:00-09:00 arası enerji +%20', cost:1 },
    { id:'greenThumb', name:'Yeşil Parmak', desc:'Tüm sulama su kullanımı -%10', cost:1 },
    { id:'speedGrower', name:'Hızlı Büyüme', desc:'Tarlalar büyüme hızı +%5', cost:2 },
    { id:'seedSaver', name:'Tohum Kurtarıcı', desc:'Ekim maliyeti -%15', cost:2 },
    { id:'harvestMaster', name:'Hasat Ustası', desc:'Hasat XP +%25', cost:3 }
  ],
  livestock: [
    { id:'animalWhisperer', name:'Hayvan Anlayışı', desc:'Hayvan sağlığı doğal artışı +%1', cost:1 },
    { id:'feedEfficiency', name:'Yem Verimliliği', desc:'Besleme yem maliyeti -%15', cost:1 },
    { id:'prodBooster', name:'Verim Artırıcı', desc:'Hayvan günlük üretim +%5', cost:2 },
    { id:'healthGuard', name:'Sağlık Koruyucu', desc:'Kaçırılan besleme sağlık düşüşü -%50', cost:2 },
    { id:'breedMaster', name:'Irk Ustası', desc:'Nadir ırk görünme şansı +%10', cost:3 }
  ],
  industry: [
    { id:'factoryManager', name:'Fabrika Müdürü', desc:'Fabrika açılış maliyeti -%10', cost:1 },
    { id:'recipeMaster', name:'Tarif Ustası', desc:'Fabrika XP +%20', cost:1 },
    { id:'slotOptimizer', name:'Yuva Optimizasyonu', desc:'Yuva açma maliyeti -%15', cost:2 },
    { id:'autoCollector', name:'Oto Toplayıcı', desc:'Hazır üretim 5 dk gecikmeyle toplanır', cost:3 },
    { id:'qualityGuru', name:'Kalite Güru', desc:'Fabrika ürün baz fiyat +%8', cost:3 }
  ],
  economy: [
    { id:'trader', name:'Tüccar', desc:'Pazar fiyatları %5 daha iyi', cost:1 },
    { id:'negotiator', name:'Müzakereci', desc:'Sipariş ödülü +%10', cost:1 },
    { id:'investor', name:'Yatırımcı', desc:'Günlük faiz +%0.2', cost:2 },
    { id:'hoarder', name:'Biriktirici', desc:'Depo kapasitesi +%15', cost:2 },
    { id:'tycoon', name:'Tycoon', desc:'Tüm kazançlar +%5 (sadece 1, prestige sonrası)', cost:5 }
  ]
};

// Kontrat Sistemi (CONTRACTS)
const CONTRACT_TEMPLATES = [
  { type:'weekly', item:'milk', qty:500, rewardMult:1.4, duration:7, reputation:50, faction:'coop' },
  { type:'seasonal', item:'tomato', qty:2000, rewardMult:1.5, duration:30, reputation:200, faction:'organic' },
  { type:'export', item:'cheese', qty:100, rewardMult:1.8, duration:14, reputation:150, faction:'export' },
  { type:'city', item:'bread', qty:300, rewardMult:1.3, duration:5, reputation:80, faction:'city' }
];

// Faksiyonlar (FACTIONS)
const FACTIONS = {
  coop:     { name:'Köy Kooperatifi', icon:'i-users', color:'#3F8B52', desc:'Yerel üretimi destekler. Ödül: Organik sertifika (+%10 fiyat).' },
  city:     { name:'Şehir Marketleri', icon:'i-building', color:'#55A9DC', desc:'Hacim odaklı. Ödül: Soğuk depolama (+%20 depo).' },
  organic:  { name:'Organik Sendikası', icon:'i-leaf', color:'#6FAE56', desc:'Kimyasalsız üretim. Ödül: Hibrit tohum erken erişimi.' },
  export:   { name:'İhracatçılar Birliği', icon:'i-globe', color:'#D99A2A', desc:'Dış pazarlara giriş. Ödül: İhracat lisansı (2x miktar).' }
};

// NPC Çiftlikler (NPC_FARMS) — 6 adet, haritada görünür
const NPC_FARMS = [
  { id:'npc1', name:'Hasan Amca', zone:'tomato', level:3, personality:'mentor', speciality:'tomato', offers:['seed_discount','advice'] },
  { id:'npc2', name:'Ayşe Teyze', zone:'animal', level:4, personality:'nurturer', speciality:'cows', offers:['breed_info','feed_trade'] },
  { id:'npc3', name:'Mehmet Abi', zone:'corn', level:5, personality:'competitor', speciality:'corn', offers:['price_watch','challenge'] },
  { id:'npc4', name:'Fatma Bacı', zone:'orchard', level:2, personality:'friendly', speciality:'strawberry', offers:['recipe_share','gift'] },
  { id:'npc5', name:'Ali Dede', zone:'forest', level:6, personality:'wise', speciality:'wood', offers:['ancient_tech','lore'] },
  { id:'npc6', name:'Zeynep', zone:'fishpond', level:3, personality:'energetic', speciality:'fish', offers:['pond_tips','contest'] }
];

// Mevsimal Festivaller (FESTIVALS)
const FESTIVALS = {
  spring: { name:'Çiçek Festivali', days:[1,2,3], tasks:[{type:'harvest',item:'strawberry',target:50},{type:'visit',npc:'npc4'}], rewards:{money:2000,xp:500,item:{strawberryJam:5}} },
  summer: { name:'Şeker Festivali', days:[90,91,92], tasks:[{type:'craft',item:'jam',target:20},{type:'sell',item:'strawberry',target:1000}], rewards:{money:5000,xp:1000,perk:'trader'} },
  autumn: { name:'Hasat Bayramı', days:[180,181,182], tasks:[{type:'harvest',target:100},{type:'upgrade',target:3}], rewards:{money:8000,xp:1500,building:'greenhouse'} },
  winter: { name:'Kış Pazarı', days:[270,271,272], tasks:[{type:'craft',item:'canned',target:30},{type:'deliver',target:10}], rewards:{money:10000,xp:2000,perk:'hoarder'} }
};

// Genetik / Irk Sistemi (GENETICS)
const GENETICS = {
  crossbreed: {
    cow:    { parents:['holstein','jersey'], child:'angus', chance:0.05, stats:{health:5,milk:0.3} },
    chicken:{ parents:['atak-s','ligorin'], child:'brahma', chance:0.08, stats:{health:3,egg:0.1} },
    sheep:  { parents:['merinos','suffolk'], child:'kivircik', chance:0.1, stats:{health:4,wool:0.15} },
    goat:   { parents:['saanen','nubian'], child:'kilkecisi', chance:0.12, stats:{health:6,milk:-0.1} }
  },
  mutation: { chance:0.01, statBoost:{health:10,production:0.5}, visual:'star' }
};

// Prestige / Nesil Sistemi (PRESTIGE)
const PRESTIGE_REWARDS = [
  { gen:1, bonus:{yield:0.05, hectare:1, unlock:'roosters'} },
  { gen:2, bonus:{yield:0.10, hectare:2, unlock:'fish', perkPoint:1} },
  { gen:3, bonus:{yield:0.15, hectare:3, unlock:'goatBreed:saanen', researchPoint:100} },
  { gen:4, bonus:{yield:0.20, hectare:4, unlock:'building:greenhouse', researchPoint:200} },
  { gen:5, bonus:{yield:0.25, hectare:5, unlock:'perk:tycoon', researchPoint:500} }
];
```

### 5.2 Oyun Durumu (`S`) Yeni Alanları

```javascript
// mergeState içinde eklenecek varsayılanlar
S.research = { farming:{}, livestock:{}, industry:{}, economy:{} }; // unlocked node ids
S.researchPoints = 0;
S.perks = { farming:{}, livestock:{}, industry:{}, economy:{} }; // purchased perk ids
S.perkPoints = 0;
S.contracts = []; // active contracts
S.contractHistory = [];
S.factions = { coop:0, city:0, organic:0, export:0 }; // reputation
S.factionRewards = { coop:false, city:false, organic:false, export:false };
S.npcRelations = {}; // npcId -> { trust:0, lastVisit:0, questsDone:0 }
S.genetics = { cows:{}, chickens:{}, sheep:{}, goats:{} }; // breed data per animal
S.prestige = { generation:0, totalPrestiges:0, permanentBonuses:{} };
S.settings = { 
  autoPlant:false, autoHarvest:false, autoFeed:false, autoWater:false, autoSell:false, autoCollect:false,
  highContrast:false, largeText:false, reduceMotion:REDUCED, sound:true, vibration:true, notifications:true
};
S.statistics = { 
  lifetimeHarvests:0, lifetimeSales:0, lifetimeCrafts:0, 
  dailyEarned:[], dailyHarvests:[], dailyFeeds:[],
  prestigeHistory:[]
};
S.cloudSync = { enabled:false, lastSync:0, provider:'indexeddb' }; // 'firebase' gelecekte
```

---

## 6. Motor Değişiklikleri — `app.js` Genişletmeleri

### 6.1 Yeni Hesaplama Fonksiyonları (`GVF` namespace)

```javascript
// Araştırma
researchState(S, tree, nodeId) -> { unlocked, canUnlock, cost }
unlockResearch(S, tree, nodeId) -> bool
getResearchBonuses(S) -> { yieldMult, waterMult, energyMult, factorySpeedMult, ... }

// Perk
perkState(S, cat, perkId) -> { purchased, canPurchase, cost }
purchasePerk(S, cat, perkId) -> bool
getPerkBonuses(S) -> { yieldMult, feedCostMult, factoryCostMult, ... }

// Kontrat
generateContracts(S) -> Contract[]
checkContractProgress(S) -> void
completeContract(S, contractId) -> { money, reputation, faction }

// Faksiyon
changeFactionRep(S, faction, amount) -> void
checkFactionRewards(S) -> void

// NPC
visitNPC(S, npcId) -> { dialog, offers, quest }
completeNPCQuest(S, npcId, questId) -> rewards

// Festival
getCurrentFestival(S) -> Festival|null
checkFestivalProgress(S) -> void

// Genetik
generateAnimalBreed(S, cat) -> breedId
crossbreedAnimals(S, cat, parent1, parent2) -> { success, childBreed }
applyGenetics(S, cat, breed) -> { healthMod, productionMult }

// Prestige
canPrestige(S) -> bool
doPrestige(S) -> { generation, bonuses, keptItems }
getPrestigeBonuses(S) -> { yieldMult, startHectare, unlocks }

// Otomasyon
evalAutomationRules(S) -> actions[]
```

### 6.2 Motor Döngüsü Entegrasyonu

| Fonksiyon | Değişiklik |
|-----------|------------|
| `newDay()` | Kontrat gün sayacı, festival kontrolü, NPC güven güncellemesi, faiz hesaplama, araştırma puanı ver (günlük görev tamamlanınca) |
| `advance()` | Otomasyon kuralları değerlendirme (her 5 dk oyun süresinde bir), kontrat teslim tarihi kontrolü |
| `checkAlerts()` | Kontrat vadesi, festival başlangıcı, NPC ziyareti hazır, araştırma tamamlandı bildirimleri |
| `saveState()` | Yeni alanlar JSON'a dahil (mevcut `mergeState` zaten geriye uyumlu) |
| `applyOffline()` | Offline sırasında kontrat/faiz/NPC ilerlemesi simüle |

### 6.3 Yeni Eylemler (Event Handler'lar)

```javascript
// Otomasyon
actToggleAutomation(rule) // rule: 'plant'|'harvest'|'feed'|'water'|'sell'|'collect'
actRunAutomation() // manuel tetikleme

// Araştırma
actUnlockResearch(tree, nodeId)

// Perk
actPurchasePerk(cat, perkId)

// Kontrat
actAcceptContract(contractId)
actDeliverContract(contractId)

// Faksiyon
actFactionAction(faction, action) // 'donate'|'quest'

// NPC
actVisitNPC(npcId)
actNPCQuest(npcId, questId)

// Festival
actFestivalTask(taskId)

// Genetik
actCrossbreed(cat, parent1Idx, parent2Idx)

// Prestige
actPrestige()

// Ayarlar
actToggleSetting(key)
```

---

## 7. UI / Şablon Genişletmeleri — `GreenValleyFarm.html`

### 7.1 Yeni Sekmeler / Ekranlar

| Sekme | ID | İçerik |
|-------|-----|--------|
| **Araştırma** | `scr-research` | 4 dal ağaç görünümü, düğüm kilitli/açık/tamamlandı, puan gösterimi |
| **Perkler** | `scr-perks` | 4 kategori, perk kartları, satın alma, aktif pasif göstergeleri |
| **Kontratlar** | `scr-contracts` | Aktif kontratlar (ilerleme çubuğu), geçmiş, faksiyon itibarı |
| **NPC / Köy** | `scr-village` | Harita üzerine NPC işaretleri, ziyaret diyalogları, görevler |
| **Festival** | `scr-festival` | Mevcut festival paneli, görevler, ödüller, countdown |
| **Genetik** | `scr-genetics` | Ahır seviye 4+ açılır: ırk listesi, çaprazlama arayüzü, mutasyon şansı |
| **Prestige** | `scr-prestige` | Seviye 10+: nesil özeti, kalıcı bonuslar, "Yeni Vadi Kur" butonu |
| **Otomasyon** | `scr-automation` | Kural listesi (toggle'lı), koşul/eylem düzenleyici, çalıştır butonu |
| **İstatistikler** | `scr-analytics` (genişlet) | Yaşam boyu grafikler, prestige geçmişi, export CSV butonu |
| **Ayarlar** | `scr-settings` (genişlet) | Erişilebilirlik, bulut senkron, veri yönetimi (export/import/sil) |

### 7.2 Mevcut Ekran Genişletmeleri

| Ekran | Eklemeler |
|-------|-----------|
| **Ana Sayfa** | Festival bannerı, NPC ziyaret bildirimi, araştırma tamamlama toast'u |
| **Çiftlik Haritası** | 3 yeni bölge çipi (meyve, balık, orman), NPC işaretleri (küçük evler), bina görselleri (serra, gübre, pazar) |
| **Bölge Detayı** | Bina yükseltme paneli (serra, gübre, pazar), kontrat teslim butonu (depo bölgesinde) |
| **Ahır** | Genetik sekmesi (seviye 4+), ırk filtresi, çaprazlama butonu, nadir ırk rozetleri |
| **Fabrikalar** | 2 yeni fabrika kartı, paralel yuva göstergesi, otomatik toplama toggle'ı |
| **Pazar** | Kontrat sekmesi, faksiyon itibar çubukları, ihracat lisansı fiyat gösterimi |
| **Profil** | Prestige/nesil rozeti, araştırma puanı, perk noktaları, yaşam boyu istatistikler |
| **Başlangıç** | "Devam Et" butonu prestige sonrası "Nesil X Başla" olur |

### 7.3 CSS / Görsel Yeni Sınıflar

```css
/* Araştırma ağacı */
.research-tree{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.research-node{...}.research-node.locked{...}.research-node.available{...}.research-node.done{...}
.research-connector{...} /* SVG çizgiler ile dal arası bağlantılar */

/* Perk kartları */
.perk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.perk-card{...}.perk-card.purchased{...}.perk-card.affordable{...}

/* Kontrat */
.contract-card{...}.contract-card.active{...}.contract-card.completed{...}.contract-progress{...}

/* NPC */
.npc-marker{position:absolute;...}.npc-dialog{...}.npc-quest{...}

/* Festival */
.festival-banner{...}.festival-countdown{...}.festival-task{...}

/* Genetik */
.breed-card{...}.breed-card.rare{...}.breed-card.legendary{...}.crossbreed-panel{...}

/* Prestige */
.prestige-card{...}.generation-badge{...}.kept-items{...}

/* Otomasyon */
.automation-rule{...}.rule-condition{...}.rule-action{...}.rule-toggle{...}

/* Parçacık efektleri */
.particle-harvest{...}.particle-feed{...}.particle-craft{...}.particle-levelup{...}

/* Erişilebilirlik */
.high-contrast{...}.large-text{...}.focus-visible-enhanced{...}
```

### 7.4 Harita SVG Genişletmeleri

- **Yeni bölgeler:** `orchard`, `fishpond`, `forest` için `viewBox`, `detailView`, `ring`, `BOUNDS`, `BADGE_POS`, `READY_POS`
- **Binalar:** `mapGreenhouse`, `mapFertilizer`, `mapMarket` sembolleri (inline SVG `<symbol id="mapGreenhouse">...`)
- **NPC evleri:** `mapNPCHouse` + isim etiketi
- **Mevsime göre ağaçlar:** `mapTreeSpring`, `mapTreeSummer`, `mapTreeAutumn`, `mapTreeWinter`
- **Hayvan yolları:** `mapAnimalPath` (bezier eğrileri, düşük opaklık)
- **Festival süslemeleri:** `mapFestivalSpring`, `mapFestivalSummer`, `mapFestivalAutumn`, `mapFestivalWinter`

---

## 8. Ses Tasarımı (Web Audio API)

```javascript
const SOUND_RECIPES = {
  plant:    [{f:220,t:0.1,type:'noise',gain:0.03},{f:180,t:0.15,type:'sine',gain:0.02}],
  water:    [{f:440,t:0.05,type:'sine',gain:0.04},{f:880,t:0.08,type:'triangle',gain:0.03}],
  harvest:  [{f:330,t:0.07,type:'square',gain:0.05},{f:440,t:0.1,type:'sawtooth',gain:0.03}],
  feed:     [{f:200,t:0.1,type:'triangle',gain:0.04},{f:150,t:0.15,type:'sine',gain:0.02}],
  craft:    [{f:300,t:0.05,type:'sine',gain:0.03},{f:600,t:0.08,type:'triangle',gain:0.02},{f:900,t:0.1,type:'sine',gain:0.01}],
  levelup:  [{f:523,t:0.1,type:'triangle',gain:0.05},{f:659,t:0.1,type:'triangle',gain:0.04},{f:784,t:0.1,type:'triangle',gain:0.04},{f:1047,t:0.2,type:'triangle',gain:0.05}],
  prestige: [{f:261,t:0.2,type:'sine',gain:0.06},{f:329,t:0.2,type:'sine',gain:0.05},{f:392,t:0.2,type:'sine',gain:0.05},{f:523,t:0.3,type:'sine',gain:0.06},{f:659,t:0.4,type:'sine',gain:0.04}],
  contract: [{f:440,t:0.1,type:'sine',gain:0.04},{f:554,t:0.1,type:'sine',gain:0.03},{f:659,t:0.1,type:'sine',gain:0.03}],
  npc:      [{f:350,t:0.1,type:'triangle',gain:0.03},{f:400,t:0.1,type:'sine',gain:0.02}],
  festival: [{f:523,t:0.15,type:'triangle',gain:0.04},{f:659,t:0.15,type:'triangle',gain:0.03},{f:784,t:0.15,type:'triangle',gain:0.03},{f:1047,t:0.2,type:'triangle',gain:0.04}]
};
```

Tüm sesler `ensureAudio()` içinde `AudioContext` ile sentezlenir, `prefers-reduced-motion` ve `S.sound` saygılı.

---

## 9. PWA / Service Worker (`sw.js`)

```javascript
// Cache stratejisi
const STATIC_CACHE = 'gvf-static-v3';
const RUNTIME_CACHE = 'gvf-runtime-v3';
const ASSETS = [
  '/', '/GreenValleyFarm.html', '/app.js', '/manifest.webmanifest',
  '/assets/icon-192.png', '/assets/icon-512.png', '/assets/jakarta-variable.woff2'
];

// Install: static cache
// Fetch: stale-while-revalidate (HTML/JS), cache-first (images/fonts)
// Activate: eski cache temizliği
// Message: 'skipWaiting', 'clearCache', 'syncSave'

// Background Sync (Save export)
self.addEventListener('sync', e => {
  if (e.tag === 'save-export') e.waitUntil(syncSaveToCloud());
});

// Push Notification (gelecekte Firebase için altyapı)
self.addEventListener('push', e => { /* native bridge ile entegre */ });
```

`manifest.webmanifest` güncellemeleri:
- `shortcuts`: [{name:'Hasat',url:'/#farm-harvest',icons:[...]},{name:'Besle',url:'/#livestock-feed',icons:[...]},{name:'Pazar',url:'/#market',icons:[...]}]
- `categories`: ['games','simulation']
- `screenshots`: [...]
- `prefer_related_applications`: false

---

## 10. Android TWA Hazırlığı

- `assetlinks.json` (`.well-known/assetlinks.json`) — SHA-256 fingerprint ile
- `splash-screen.png` (320x320, adaptive icon uyumlu)
- `twa-manifest.json` (bubblewrap/gradle için)
- Native bridge: `AndroidFarm` interface genişletmesi (`syncSave`, `requestPermission`, `showToast`)

---

## 11. Test Stratejisi

### 11.1 Genişletilmiş Self-Test (`runSelftest`)

Mevcut testlere eklenecek yeni assertler:

```javascript
// Veri tabloları
add('yeni ürünler tanımlandı', Object.keys(NEW_CROPS).length === 6);
add('yeni hayvanlar tanımlandı', Object.keys(NEW_ANIMALS).length >= 2);
add('yeni fabrikalar tanımlandı', Object.keys(NEW_FACTORIES).length === 2);
add('yeni bölgeler tanımlandı', Object.keys(NEW_ZONES).length === 3);
add('araştırma ağacı 4 dal', Object.keys(RESEARCH_TREE).length === 4);
add('perk sayısı 30+', Object.values(PERKS).flat().length >= 30);
add('faksiyon sayısı 4', Object.keys(FACTIONS).length === 4);
add('NPC çiftlik sayısı 6', NPC_FARMS.length === 6);
add('festival sayısı 4', Object.keys(FESTIVALS).length === 4);
add('genetik çaprazlama tanımlandı', Object.keys(GENETICS.crossbreed).length === 4);
add('prestige ödülleri 5 nesil', PRESTIGE_REWARDS.length === 5);

// Motor fonksiyonları
const t = G.makeDefaultState();
t.level = 10; t.xp = G.xpNeed(10);
add('prestige kontrolü', G.canPrestige(t) === true);
const p = G.doPrestige(t);
add('prestige nesil artırır', p.generation === 1 && p.keptItems.length > 0);

// Araştırma
add('araştırma puanı başlangıç 0', t.researchPoints === 0);
G.unlockResearch(t, 'farming', 'autoPlant');
add('araştırma kilidi açılır', t.research.farming.autoPlant === true);

// Perk
G.purchasePerk(t, 'farming', 'earlyRiser');
add('perk satın alınır', t.perks.farming.earlyRiser === true);

// Kontrat
t.contracts = G.generateContracts(t);
add('kontrat üretilir', t.contracts.length > 0);

// Faksiyon
G.changeFactionRep(t, 'coop', 100);
add('faksiyon itibar artar', t.factions.coop === 100);

// Genetik
const breed = G.generateAnimalBreed(t, 'cows');
add('ırk üretilir', ANIMALS.cows.breeds.includes(breed));

// Save/Load yuvarlak turu
const saved = JSON.stringify(t);
const loaded = G.mergeState(JSON.parse(saved));
add('save/load yuvarlak', loaded.level === t.level && loaded.prestige.generation === t.prestige.generation);
```

### 11.2 Entegrasyon Test Senaryoları (Manuel)

| Senaryo | Beklenen |
|---------|----------|
| Seviye 10 → Prestige → Yeni oyun başlar, nesil 1, %5 verim bonusu, 1 hektar bonus, horoz açılır | ✅ |
| Araştırma: Otomatik Ekim → Hibrit Tohumlar → Serra Teknolojisi kilidi açılır | ✅ |
| Perk: Tycoon (5 nokta) → Prestige sonrası tüm kazanç +%5 | ✅ |
| Kontrat: Haftalık 500L süt → 7 günde teslim → para + itibar + faksiyon ödülü | ✅ |
| NPC: Hasan Amca ziyaret → güven artar → tohum indirimi kazanılır | ✅ |
| Festival: Çiçek Festivali (Gün 1-3) → görevler → reçel ödülü | ✅ |
| Genetik: Holstein + Jersey → %5 Angus → sağlık +5, süt +%30 | ✅ |
| Otomasyon: "Su < 30% → oto-sula" → kuru tarla otomatik sulanır | ✅ |
| PWA: Kurulum → offline açılış → tam çalışır | ✅ |
| Erişilebilirlik: Yüksek kontrast + büyük metin → tüm metin okunur, butonlar 48x48dp | ✅ |

---

## 12. Uygulama Sırası (Fazlar)

| Faz | Odak | Tahmini Değişiklik |
|-----|------|-------------------|
| **1** | Veri tabloları + yeni bölgeler + harita SVG | `GreenValleyFarm.html` (data, SVG, zoneCard), `app.js` (data) |
| **2** | Meta progresyon: Prestige, Araştırma, Perk, Kontrat, Faksiyon, Genetik | `app.js` (newDay, checkAlerts, save/load, yeni hesaplamalar, eylemler) |
| **3** | Otomasyon + QoL + İstatistikler + Erişilebilirlik | `GreenValleyFarm.html` (yeni sekmeler, paneller), `app.js` (otomasyon motoru) |
| **4** | Yaşayan Dünya: NPC, Festival, Köy Projeleri | `GreenValleyFarm.html` (NPC harita, diyaloglar, festival banner), `app.js` (simülasyon) |
| **5** | Görsel Polisaj: Parçacıklar, Geçişler, Gündüz/Gece, Hava, Ses | `GreenValleyFarm.html` (CSS, FX fonksiyonları, ses motoru) |
| **6** | Teknik: PWA (sw.js), TWA, Save Export/Import, Performans | `sw.js`, `manifest.webmanifest`, `assetlinks.json`, `app.js` (cloud sync) |

Her faz **kendi içinde test edilebilir, commit'lenebilir, oynanabilir** bir artış verir.

---

## 13. Onay ve Sonraki Adım

> **Bu tasarım belgesi onaylandığında**, `writing-plans` skill'i ile **detaylı uygulama planı** (tasks, interfaces, testler, commit mesajları) yazılacak ve onayınız alındıktan sonra uygulanmaya başlanacaktır.

**Onay için:** "Tasarım onaylandı, planı yaz" deyiniz.