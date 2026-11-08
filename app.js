/* ================= Yeşil Vadi Çiftliği — veri, durum ve şablonlar ================= */
(function(){
'use strict';

const icon = (n, cls) => `<svg class="${cls || 'ic'}"><use href="#${n}"/></svg>`;
/* 1 gerçek dakika = 5 oyun dakikası → 1 gerçek saniye = 5/60 oyun dakikası. */
const MIN_PER_SEC = 5 / 60;
const DAY_MIN = 1440;
const MAX_LEVEL = 5;
const FARM_MAX_LEVEL = 10;
const SAVE_KEY = 'yesilvadi_tycoon_v2';

const ZONE = {
  overview:  { title:'Genel Bakış', sub:'Tüm çiftlik', icon:'i-map', tile:'mint', view:[0,0,1000,1250], upgradeBase:0 },
  house:     { title:'Çiftlik Evi', sub:'Ana konut · enerji merkezi', icon:'i-house', tile:'peach', view:[24,-62,446,558], detailView:[30,26,434,380], ring:[30,26,434,380], upgradeBase:1500 },
  tomato:    { title:'Domates Tarlası', sub:'Kırmızı altın', crop:'Domates', icon:'i-tomato', tile:'peach', view:[530,-62,446,558], detailView:[530,20,446,392], ring:[530,20,446,392], upgradeBase:900 },
  vegetable: { title:'Sebze Bahçesi', sub:'Marul & havuç', crop:'Marul + Havuç', icon:'i-leaf', tile:'mint', view:[24,370,446,558], detailView:[24,460,446,376], ring:[24,460,446,376], upgradeBase:850 },
  corn:      { title:'Mısır Tarlası', sub:'Altın başaklar', crop:'Mısır', icon:'i-corn', tile:'wheat', view:[530,370,446,558], detailView:[530,460,446,376], ring:[530,460,446,376], upgradeBase:950 },
  animal:    { title:'Hayvan Ahırı', sub:'Süt, yumurta ve yün', icon:'i-cow', tile:'peach', view:[24,620,608,760], ring:[24,888,608,292], upgradeBase:1800 },
  water:     { title:'Su Deposu', sub:'Ana rezervuar', icon:'i-drop', tile:'lav', view:[668,798,308,385], detailView:[600,740,400,476], ring:[668,888,308,188], upgradeBase:1100 },
  storage:   { title:'Depo', sub:'Ekipman ve erzak', icon:'i-box', tile:'wheat', view:[668,980,308,385], detailView:[600,780,400,476], ring:[668,1080,308,135], upgradeBase:1000 }
};
const ZONE_KEYS = ['house','tomato','vegetable','corn','animal','water','storage'];

const BOUNDS = {
  house:[24,20,446,392], tomato:[530,20,446,392], vegetable:[24,460,446,376],
  corn:[530,460,446,376], animal:[24,888,608,292], water:[668,888,308,188], storage:[668,1080,308,135]
};

const BADGE_POS = {
  house:[408,374], tomato:[908,374], vegetable:[408,798], corn:[908,798],
  animal:[590,1148], water:[938,930], storage:[938,1110]
};
const READY_POS = { tomato:[752,242], vegetable:[248,688], corn:[752,688] };

const WEATHER = {
  sunny:  { name:'Güneşli', icon:'i-sun', color:'#D99A24', growth:1.08, rain:0, solar:1.30, animal:1.04, waterUse:1.05,
            price:{}, desc:'Büyüme hızlı, güneş enerjisi bol. Tarlaları sulamayı unutma.' },
  cloudy: { name:'Parçalı Bulutlu', icon:'i-cloudsun', color:'#7C8E93', growth:1.00, rain:0, solar:.75, animal:1.00, waterUse:1.00,
            price:{}, desc:'Dengeli bir gün. Ne çok sıcak ne çok soğuk.' },
  rainy:  { name:'Yağmurlu', icon:'i-rain', color:'#4E8FB0', growth:1.20, rain:420, solar:.30, animal:.94, waterUse:0,
            price:{ tomato:.92, lettuce:1.10, carrot:1.08, corn:.96, milk:1.03, egg:1.00, wool:1.05 },
            desc:'Yağmur tarlaları kendiliğinden sular, depoya su ekler. Hasat biraz yavaş.' },
  storm:  { name:'Fırtınalı', icon:'i-storm', color:'#5B6E8C', growth:.72, rain:720, solar:.12, animal:.84, waterUse:0,
            price:{ tomato:1.18, lettuce:1.12, carrot:1.15, corn:1.12, milk:1.08, egg:1.10, wool:1.15 },
            desc:'Büyüme yavaş, hayvanlar tedirgin. Ürün fiyatları yükseliyor.' },
  heat:   { name:'Sıcak Dalga', icon:'i-heat', color:'#D9772E', growth:.88, rain:0, solar:1.50, animal:.88, waterUse:1.60,
            price:{ tomato:.86, lettuce:1.24, carrot:1.20, corn:.95, milk:1.08, egg:1.02, wool:1.04 },
            desc:'Su hızlı tükenir, enerji bol. Sebze fiyatları tavan yapar.' },
  snow:   { name:'Karlı', icon:'i-snow', color:'#7FA6B8', growth:.46, rain:60, solar:.22, animal:.86, waterUse:.80,
            price:{ tomato:1.30, lettuce:1.20, carrot:1.22, corn:1.15, milk:1.20, egg:1.18, wool:1.25 },
            desc:'Büyüme çok yavaş; kış ürünleri altın değerinde.' }
};

const SEASONS = [
  { name:'İlkbahar', icon:'i-sprout', color:'#6FAE56', pool:['sunny','cloudy','rainy','rainy','sunny','storm'], base:[16,25], desc:'Tohumlar uyanıyor, yağmur bereket getiriyor.' },
  { name:'Yaz', icon:'i-sun', color:'#D9A62E', pool:['sunny','sunny','heat','cloudy','sunny','storm'], base:[26,35], desc:'Güneş bol, su kritik. Sıcak dalgalara dikkat.' },
  { name:'Sonbahar', icon:'i-leaf', color:'#B67B3C', pool:['cloudy','rainy','rainy','sunny','cloudy','storm'], base:[13,22], desc:'Hasat mevsimi. Pazar fiyatları hareketli.' },
  { name:'Kış', icon:'i-snow', color:'#6E99AC', pool:['snow','snow','cloudy','storm','snow','sunny'], base:[0,7], desc:'Kar altında yavaş büyüme, yüksek fiyatlar.' }
];

const CROPS = {
  tomato:    { name:'Domates', short:'Domates', icon:'i-tomato', tile:'peach', color:'#E4573E', growth:1.6, seedCost:40, yieldBase:110, waterUse:420, items:{ tomato:1 }, desc:'Sera domatesi; sulanırsa hızla büyür.' },
  vegetable: { name:'Sebze Bahçesi', short:'Marul & Havuç', icon:'i-leaf', tile:'mint', color:'#5FA34A', growth:1.8, seedCost:50, yieldBase:95, waterUse:480, items:{ lettuce:.55, carrot:.45 }, desc:'Marul ve havuç aynı bahçede; iki ürün birden.' },
  corn:      { name:'Mısır Tarlası', short:'Mısır', icon:'i-corn', tile:'wheat', color:'#E7B23B', growth:1.4, seedCost:35, yieldBase:125, waterUse:500, items:{ corn:1 }, desc:'Altın başaklar; hayvan yemi için de değerli.' }
};

const ANIMALS = {
  cows:     { name:'İnekler', one:'İnek', icon:'i-cow', art:'artCow', item:'milk', itemName:'Süt', unit:'L', baseCount:18, perLevel:2, yieldBase:1.5, health:96, color:'#4B7F54', tile:'mint',
              names:['Sarıkız','Benekli','Pamuk','Gülbeyaz','Karabaş','Fındık','Ceviz','Kınalı','Maviş','Yonca','Badem','Şeker','Menekşe','Fıstık'],
              breeds:['Holstein','Jersey','Simental','Montofon'] },
  chickens: { name:'Tavuklar', one:'Tavuk', icon:'i-chicken', art:'artChicken', item:'egg', itemName:'Yumurta', unit:'adet', baseCount:20, perLevel:3, yieldBase:.55, health:94, color:'#C08A32', tile:'wheat',
              names:['Gıdak','Sarıkız','Kınalı','Pofuduk','Cikcik','Biber','Mısır','Pamuk','Yumak','Telli'],
              breeds:['Atak-S','Ligorin','Brahma','Sussex'] },
  sheep:    { name:'Koyunlar', one:'Koyun', icon:'i-sheep', art:'artSheep', item:'wool', itemName:'Yün', unit:'kg', baseCount:6, perLevel:1, yieldBase:.30, health:95, color:'#7A8B70', tile:'lav',
              names:['Pamuk','Bulut','Yonca','Kıvırcık','Merinos','Fıstık','Bisküvi','Lale'],
              breeds:['Merinos','Suffolk','Kıvırcık'] },
  goats:    { name:'Keçiler', one:'Keçi', icon:'i-goat', art:'artGoat', item:'milk', itemName:'Süt', unit:'L', baseCount:4, perLevel:1, yieldBase:.90, health:93, color:'#8A7B63', tile:'peach',
              names:['Yonca','Fıstık','Kınalı','Maviş','Ceviz','Badem'],
              breeds:['Saanen','Nubian','Kıl Keçisi'] }
};
const ANIMAL_KEYS = ['cows','chickens','sheep','goats'];

const MARKET = {
  tomato:  { name:'Domates', icon:'i-tomato', tile:'peach', unit:'kg', base:18, desc:'Taze sera domatesi' },
  lettuce: { name:'Marul', icon:'i-leaf', tile:'mint', unit:'kg', base:12, desc:'Günlük taze marul' },
  carrot:  { name:'Havuç', icon:'i-leaf', tile:'peach', unit:'kg', base:14, desc:'Tatlı bahçe havuçları' },
  corn:    { name:'Mısır', icon:'i-corn', tile:'wheat', unit:'kg', base:9, desc:'Altın başak mısır' },
  milk:    { name:'Süt', icon:'i-milk', tile:'lav', unit:'L', base:26, desc:'İnek ve keçi sütü' },
  egg:     { name:'Yumurta', icon:'i-egg', tile:'wheat', unit:'adet', base:4, desc:'Köy yumurtası' },
  wool:    { name:'Yün', icon:'i-wool', tile:'lav', unit:'kg', base:45, desc:'Yumuşak koyun yünü' }
};
const MARKET_KEYS = ['tomato','lettuce','carrot','corn','milk','egg','wool'];

/* Fabrika ürünleri ayrı tutulur; siparişler yalnızca çiğ ürün ister. */
const CRAFTED = {
  packagedMilk: { name:'Paket Süt', icon:'i-milk', tile:'lav', unit:'L', base:42, desc:'Fabrikada paketlenmiş günlük süt' },
  yogurt:       { name:'Yoğurt', icon:'i-yogurt', tile:'lav', unit:'kg', base:58, desc:'Kavanozda ev yoğurdu' },
  cheese:       { name:'Kaşar Peyniri', icon:'i-cheese', tile:'wheat', unit:'kg', base:126, desc:'Olgunlaştırılmış çiftlik kaşarı' },
  butter:       { name:'Tereyağı', icon:'i-butter', tile:'wheat', unit:'kg', base:92, desc:'Köy tereyağı' },
  ayran:        { name:'Ayran', icon:'i-milk', tile:'lav', unit:'L', base:30, desc:'Buz gibi köy ayranı' },
  iceCream:     { name:'Dondurma', icon:'i-icecream', tile:'peach', unit:'L', base:104, desc:'Sütlü çiftlik dondurması' },
  sweater:      { name:'Yün Kazak', icon:'i-shirt', tile:'mint', unit:'adet', base:270, desc:'Sıcak, el örgüsü kazak' },
  pants:        { name:'Yün Pantolon', icon:'i-pants', tile:'lav', unit:'adet', base:340, desc:'Dayanıklı keçi yünü pantolon' },
  shoes:        { name:'Yün Ayakkabı', icon:'i-shoe', tile:'peach', unit:'çift', base:300, desc:'Keçi yünü astarlı ayakkabı' },
  scarf:        { name:'Atkı', icon:'i-scarf', tile:'wheat', unit:'adet', base:138, desc:'Yumuşak yün atkı' },
  socks:        { name:'Çorap', icon:'i-sock', tile:'mint', unit:'çift', base:86, desc:'Sıcak tutan yün çorap' },
  hat:          { name:'Yün Şapka', icon:'i-hat', tile:'lav', unit:'adet', base:156, desc:'Köy işi yün şapka' },
  dress:        { name:'Yün Elbise', icon:'i-dress', tile:'peach', unit:'adet', base:500, desc:'Özel dikim yün elbise' },
  blanket:      { name:'Yün Battaniye', icon:'i-wool', tile:'mint', unit:'adet', base:390, desc:'Kışlık el dokuma battaniye' },
  bread:        { name:'Köy Ekmeği', icon:'i-bread', tile:'wheat', unit:'adet', base:34, desc:'Taş fırında köy ekmeği' },
  cake:         { name:'Yaş Pasta', icon:'i-cake', tile:'peach', unit:'adet', base:170, desc:'Sütlü, yumurtalı yaş pasta' },
  borek:        { name:'Börek', icon:'i-pie', tile:'wheat', unit:'adet', base:126, desc:'Peynirli ev böreği' },
  cookie:       { name:'Kurabiye', icon:'i-cake', tile:'wheat', unit:'paket', base:74, desc:'Tereyağlı köy kurabiyesi' },
  pie:          { name:'Havuçlu Turta', icon:'i-pie', tile:'peach', unit:'adet', base:186, desc:'Havuçlu, tarçınlı turta' },
  cornBread:    { name:'Mısır Ekmeği', icon:'i-bread', tile:'wheat', unit:'adet', base:48, desc:'Mısır unlu sıcak ekmek' },
  cannedTomato: { name:'Domates Konservesi', icon:'i-jar', tile:'peach', unit:'kavanoz', base:64, desc:'Kışa hazır domates konservesi' },
  cannedCorn:   { name:'Mısır Konservesi', icon:'i-can', tile:'wheat', unit:'kavanoz', base:54, desc:'Tatlı mısır konservesi' },
  pickle:       { name:'Turşu', icon:'i-jar', tile:'mint', unit:'kavanoz', base:50, desc:'Marul ve havuç turşusu' },
  ketchup:      { name:'Ketçap', icon:'i-ketchup', tile:'peach', unit:'şişe', base:96, desc:'Bahçe domatesinden ketçap' },
  cannedVeg:    { name:'Sebze Konservesi', icon:'i-can', tile:'mint', unit:'kavanoz', base:74, desc:'Karışık sebze konservesi' },
  tomatoSauce:  { name:'Domates Sosu', icon:'i-jar', tile:'peach', unit:'kavanoz', base:82, desc:'Havuçlu ev domates sosu' }
};
const CRAFTED_KEYS = Object.keys(CRAFTED);
const ALL_PRODUCT_KEYS = MARKET_KEYS.concat(CRAFTED_KEYS);

const FACTORY_DEFS = {
  dairy: {
    name:'Süt Fabrikası', icon:'i-milk', tile:'lav', desc:'Sütü paketle; yoğurt, kaşar, tereyağı ve dondurma üret.',
    unlockCost:4000, slotCosts:[1800,4200,8500], accent:'#7A6EB4',
    recipes:[
      { id:'packagedMilk', name:'Paket Süt', icon:'i-milk', out:{ packagedMilk:2 }, need:{ milk:2 }, time:12, xp:6 },
      { id:'yogurt', name:'Yoğurt', icon:'i-yogurt', out:{ yogurt:2 }, need:{ milk:3 }, time:20, xp:9 },
      { id:'cheese', name:'Kaşar', icon:'i-cheese', out:{ cheese:1 }, need:{ milk:4 }, time:35, xp:14 },
      { id:'butter', name:'Tereyağı', icon:'i-butter', out:{ butter:2 }, need:{ milk:3 }, time:18, xp:8 },
      { id:'ayran', name:'Ayran', icon:'i-milk', out:{ ayran:2 }, need:{ milk:1, yogurt:1 }, time:15, xp:7 },
      { id:'iceCream', name:'Dondurma', icon:'i-icecream', out:{ iceCream:2 }, need:{ milk:2, egg:2 }, time:30, xp:12 }
    ]
  },
  textile: {
    name:'Dokuma Atölyesi', icon:'i-wool', tile:'mint', desc:'Keçi yününü kazak, pantolon, ayakkabı ve elbiseye dönüştür.',
    unlockCost:6500, slotCosts:[2200,5200,10000], accent:'#4E8A5B',
    recipes:[
      { id:'sweater', name:'Yün Kazak', icon:'i-shirt', out:{ sweater:1 }, need:{ wool:4 }, time:45, xp:18 },
      { id:'pants', name:'Yün Pantolon', icon:'i-pants', out:{ pants:1 }, need:{ wool:5 }, time:55, xp:22 },
      { id:'shoes', name:'Yün Ayakkabı', icon:'i-shoe', out:{ shoes:1 }, need:{ wool:3, milk:1 }, time:40, xp:16 },
      { id:'scarf', name:'Atkı', icon:'i-scarf', out:{ scarf:1 }, need:{ wool:2 }, time:20, xp:9 },
      { id:'socks', name:'Çorap', icon:'i-sock', out:{ socks:2 }, need:{ wool:2 }, time:18, xp:8 },
      { id:'hat', name:'Yün Şapka', icon:'i-hat', out:{ hat:1 }, need:{ wool:3 }, time:25, xp:10 },
      { id:'dress', name:'Yün Elbise', icon:'i-dress', out:{ dress:1 }, need:{ wool:6, milk:2 }, time:60, xp:24 },
      { id:'blanket', name:'Battaniye', icon:'i-wool', out:{ blanket:1 }, need:{ wool:8 }, time:70, xp:26 }
    ]
  },
  bakery: {
    name:'Çiftlik Fırını', icon:'i-bread', tile:'wheat', desc:'Yumurta, süt, tereyağı ve sebzeyle sıcak fırın ürünleri hazırla.',
    unlockCost:8000, slotCosts:[2400,5600,11000], accent:'#C08A32',
    recipes:[
      { id:'bread', name:'Köy Ekmeği', icon:'i-bread', out:{ bread:2 }, need:{ corn:2, egg:1 }, time:12, xp:6 },
      { id:'cake', name:'Yaş Pasta', icon:'i-cake', out:{ cake:1 }, need:{ egg:3, milk:2, butter:1 }, time:30, xp:14 },
      { id:'borek', name:'Peynirli Börek', icon:'i-pie', out:{ borek:1 }, need:{ egg:2, cheese:1, lettuce:1 }, time:25, xp:12 },
      { id:'cookie', name:'Kurabiye', icon:'i-cake', out:{ cookie:3 }, need:{ egg:2, butter:1, milk:1 }, time:20, xp:10 },
      { id:'pie', name:'Havuçlu Turta', icon:'i-pie', out:{ pie:1 }, need:{ egg:2, carrot:2, butter:1 }, time:35, xp:15 },
      { id:'cornBread', name:'Mısır Ekmeği', icon:'i-bread', out:{ cornBread:2 }, need:{ corn:3, egg:1, milk:1 }, time:20, xp:9 }
    ]
  },
  cannery: {
    name:'Konserve Atölyesi', icon:'i-jar', tile:'peach', desc:'Tarladan gelen domates, mısır ve sebzeleri kışa hazırla.',
    unlockCost:9500, slotCosts:[2800,6500,12500], accent:'#B5643A',
    recipes:[
      { id:'cannedTomato', name:'Domates Konservesi', icon:'i-jar', out:{ cannedTomato:2 }, need:{ tomato:8 }, time:20, xp:9 },
      { id:'cannedCorn', name:'Mısır Konservesi', icon:'i-can', out:{ cannedCorn:2 }, need:{ corn:8 }, time:18, xp:8 },
      { id:'pickle', name:'Turşu', icon:'i-jar', out:{ pickle:2 }, need:{ lettuce:4, carrot:4 }, time:25, xp:10 },
      { id:'ketchup', name:'Ketçap', icon:'i-ketchup', out:{ ketchup:1 }, need:{ tomato:10, lettuce:1 }, time:30, xp:13 },
      { id:'cannedVeg', name:'Sebze Konservesi', icon:'i-can', out:{ cannedVeg:2 }, need:{ lettuce:3, carrot:3, corn:2 }, time:28, xp:11 },
      { id:'tomatoSauce', name:'Domates Sosu', icon:'i-jar', out:{ tomatoSauce:2 }, need:{ tomato:6, carrot:2 }, time:26, xp:11 }
    ]
  }
};
const FACTORY_KEYS = Object.keys(FACTORY_DEFS);
const FACTORY_MAX_SLOTS = 4;
const FACTORY_FEED_KEYS = ['milk','egg','wool'];

const ACHIEVEMENTS = [
  { id:'firstHarvest', name:'İlk Hasat', desc:'İlk hasadını topla.', icon:'i-tomato', reward:200, check:S=>S.stats.harvests>=1, goal:S=>[Math.min(S.stats.harvests,1),1] },
  { id:'harvest25', name:'Hasat Ustası', desc:'25 hasat yap.', icon:'i-wheat', reward:500, check:S=>S.stats.harvests>=25, goal:S=>[Math.min(S.stats.harvests,25),25] },
  { id:'firstSale', name:'İlk Satış', desc:'Pazarda ilk ürününü sat.', icon:'i-tag', reward:250, check:S=>S.stats.sold>=1, goal:S=>[Math.min(S.stats.sold,1),1] },
  { id:'rich', name:'Kasa Doldu', desc:'Kasanda 10.000 ₺ biriktir.', icon:'i-coin', reward:1000, check:S=>S.money>=10000, goal:S=>[Math.min(Math.round(S.money),10000),10000] },
  { id:'animalLover', name:'Hayvan Dostu', desc:'Sürüyü 60 hayvana çıkar.', icon:'i-cow', reward:600, check:S=>totalAnimals(S)>=60, goal:S=>[Math.min(totalAnimals(S),60),60] },
  { id:'upgrader', name:'Modern Çiftlik', desc:'5 bölge yükseltmesi yap.', icon:'i-arrow-up', reward:700, check:S=>S.stats.upgrades>=5, goal:S=>[Math.min(S.stats.upgrades,5),5] },
  { id:'level5', name:'Vadi Patronu', desc:'5. seviyeye ulaş.', icon:'i-star', reward:800, check:S=>S.level>=5, goal:S=>[Math.min(S.level,5),5] },
  { id:'week', name:'Bir Hafta', desc:'7. güne ulaş.', icon:'i-calendar', reward:1000, check:S=>S.day>=7, goal:S=>[Math.min(S.day,7),7] },
  { id:'firstFactory', name:'Sanayici', desc:'İlk fabrikanı aç.', icon:'i-factory', reward:900, check:S=>factoryOpenCount(S)>=1, goal:S=>[Math.min(factoryOpenCount(S),1),1] },
  { id:'craftMaster', name:'Üretim Ustası', desc:'Fabrikada 10 üretim tamamla.', icon:'i-gear', reward:1200, check:S=>S.stats.crafted>=10, goal:S=>[Math.min(S.stats.crafted,10),10] }
];

const QUEST_POOL = [
  { type:'harvest', name:'Hasat Zamanı', desc:'Tarlalardan hasat yap', icon:'i-tomato', target:3, reward:260, xp:60 },
  { type:'feed', name:'Besleme Vakti', desc:'Hayvanları besle', icon:'i-wheat', target:3, reward:220, xp:50 },
  { type:'sell', name:'Pazar Günü', desc:'Ürün sat', icon:'i-tag', target:4, reward:300, xp:70 },
  { type:'upgrade', name:'Modernleşme', desc:'Bir bölgeyi yükselt', icon:'i-arrow-up', target:1, reward:360, xp:80 },
  { type:'water', name:'Sulama', desc:'Tarla sula', icon:'i-drop', target:2, reward:180, xp:40 },
  { type:'collect', name:'Ürünleri Topla', desc:'Hayvan ürünü topla', icon:'i-box', target:2, reward:200, xp:45 },
  { type:'earn', name:'Kazanç', desc:'Para kazan', icon:'i-coin', target:1000, reward:300, xp:60 }
];

const DAILY_REWARDS = [
  { money:150, feed:0,  energy:0,  xp:0,  label:'150 ₺' },
  { money:200, feed:10, energy:0,  xp:10, label:'200 ₺ + 10 kg yem' },
  { money:250, feed:0,  energy:20, xp:10, label:'250 ₺ + 20 enerji' },
  { money:350, feed:15, energy:0,  xp:20, label:'350 ₺ + 15 kg yem' },
  { money:450, feed:0,  energy:25, xp:20, label:'450 ₺ + 25 enerji' },
  { money:600, feed:20, energy:20, xp:30, label:'600 ₺ + 20 kg yem + enerji' },
  { money:1000, feed:30, energy:40, xp:60, label:'1.000 ₺ + büyük paket' }
];

const BUYERS = ['Vadi Market','Köy Kahvesi','Yeşil Restoran','Organik Sepet','Şehir Hali','Mavi Kafe','Çiftlik Fırını'];

/* ---------- biçimlendirme ---------- */
let nf;
try { nf = new Intl.NumberFormat('tr-TR'); } catch(e) { nf = { format:n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.') }; }
const fmt = n => nf.format(Math.round(Number(n) || 0));
const money = n => fmt(n) + ' ₺';
const num = (n, d) => {
  const v = Number(n) || 0;
  return nf.format(d == null ? Math.round(v) : Number(v.toFixed(d)));
};
const qty = n => {
  const v = Number(n) || 0;
  if (v >= 100) return fmt(v);
  if (Math.abs(v - Math.round(v)) < .05) return fmt(Math.round(v));
  return String(Number(v.toFixed(1))).replace('.', ',');
};
const timeStr = m => {
  m = ((Math.round(m) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return String(Math.floor(m / 60)).padStart(2,'0') + ':' + String(m % 60).padStart(2,'0');
};
const realText = sec => {
  sec = Math.max(1, Math.round(sec));
  if (sec < 60) return sec + ' sn';
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return m + ' dk' + (s > 4 ? ' ' + s + ' sn' : '');
  const h = Math.floor(m / 60);
  return h + ' sa ' + (m % 60) + ' dk';
};
const etaText = gameMin => {
  if (gameMin <= .3) return 'hazır';
  return '≈ ' + realText(gameMin / MIN_PER_SEC);
};
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
const nowAbs = S => S.day * DAY_MIN + S.time;
const seasonIndex = day => Math.floor((Math.max(1,day) - 1) / 7) % 4;
const seasonOf = S => SEASONS[seasonIndex(S.day)];
const weatherOf = S => WEATHER[S.weather] || WEATHER.sunny;
const phaseOf = time => time < 300 ? 'night' : time < 480 ? 'dawn' : time < 1080 ? 'day' : time < 1260 ? 'dusk' : 'night';
const xpNeed = level => Math.round(150 * Math.pow(1.35, Math.max(0, level - 1)));
const RANKS = ['Acemi Çiftçi','Meraklı Çiftçi','Deneyimli Çiftçi','Usta Çiftçi','Çiftlik Patronu','Vadi Ustası','Tycoon','Efsane Çiftçi','Vadi Efsanesi','Çiftlik İmparatoru'];
const rankName = level => RANKS[Math.min(RANKS.length - 1, Math.max(0, level - 1))];

/* ---------- oyun hesapları ---------- */
const zoneLevel = (S,key) => (S.zones[key] && S.zones[key].level) || 1;
const FIELD_INFO = {
  tomato:    { base:4.0, perLevel:1.5 },
  vegetable: { base:3.5, perLevel:1.25 },
  corn:      { base:5.0, perLevel:2.0 }
};
const fieldHectares = (S,key) => {
  const f = FIELD_INFO[key];
  if (!f) return 0;
  return f.base + f.perLevel * (zoneLevel(S,key) - 1);
};
const fieldExtraHectares = key => (FIELD_INFO[key] ? FIELD_INFO[key].perLevel : 0);
const totalHectares = S => Object.keys(FIELD_INFO).reduce((a,k) => a + fieldHectares(S,k), 0);
const hectareText = (S,key) => num(fieldHectares(S,key), 1) + ' ha';
const waterCap = S => 10000 + 2500 * (zoneLevel(S,'water') - 1);
const energyCap = S => 100 + 25 * (zoneLevel(S,'house') - 1);
const storageCap = S => 2600 + 800 * (zoneLevel(S,'storage') - 1);
const feedCap = S => 200 + 50 * (zoneLevel(S,'storage') - 1);
const animalCount = (S,cat) => ANIMALS[cat].baseCount + ANIMALS[cat].perLevel * (zoneLevel(S,'animal') - 1);
const totalAnimals = S => ANIMAL_KEYS.reduce((a,k) => a + animalCount(S,k), 0);
const feedCost = S => 12 + 2 * zoneLevel(S,'animal');
const isWatered = (S,z) => !!(z.planted && nowAbs(S) < (z.wateredUntil || 0));
const cropRate = (S,key) => {
  const c = CROPS[key], z = S.zones[key], w = weatherOf(S);
  let r = 100 / c.growth;
  r *= w.growth;
  r *= 1 + .14 * (zoneLevel(S,key) - 1);
  if (!isWatered(S,z)) r *= .45;
  if (S.energy <= 0) r *= .7;
  return r;
};
const growthLeft = (S,key) => {
  const z = S.zones[key];
  if (!z.planted) return 0;
  if (z.ready) return 0;
  const r = cropRate(S,key);
  return r <= 0 ? 9999 : (100 - z.growth) / r * 60;
};
const cropYield = (S,key) => {
  const z = S.zones[key], base = FIELD_INFO[key] ? FIELD_INFO[key].base : 1;
  return CROPS[key].yieldBase * (fieldHectares(S,key) / base) * (isWatered(S,z) ? 1.08 : .92);
};
const waterPct = S => clamp(S.water / waterCap(S) * 100, 0, 100);
const energyPct = S => clamp(S.energy / energyCap(S) * 100, 0, 100);
const feedPct = S => clamp(S.feed / feedCap(S) * 100, 0, 100);
const animalAvgHealth = S => {
  let total = 0, n = 0;
  ANIMAL_KEYS.forEach(k => { const c = animalCount(S,k); total += (S.animals[k].health || 90) * c; n += c; });
  return n ? total / n : 90;
};
const productionPct = S => Math.round(animalAvgHealth(S) * .78 + feedPct(S) * .22);
const cropHealth = S => {
  const keys = Object.keys(CROPS);
  let sum = 0;
  keys.forEach(k => {
    const z = S.zones[k];
    sum += !z.planted ? 50 : z.ready ? 100 : isWatered(S,z) ? 100 : 65;
  });
  return sum / keys.length;
};
const farmHealth = S => Math.round(animalAvgHealth(S) * .58 + waterPct(S) * .2 + energyPct(S) * .12 + cropHealth(S) * .1);
const farmHealthLabel = v => v >= 88 ? 'Sağlıklı' : v >= 72 ? 'İyi' : v >= 55 ? 'Dikkat' : 'Riskli';
const farmHealthNote = S => {
  if (waterPct(S) < 20) return 'Su deposu azalıyor';
  if (S.energy < 20) return 'Enerji düşük';
  if (feedPct(S) < 25) return 'Yem azalıyor';
  if (missedFeeds(S) > 0) return 'Besleme gecikti';
  if (countReady(S) > 0) return countReady(S) + ' tarla hasada hazır';
  return 'Her şey yolunda';
};
const productMeta = item => MARKET[item] || CRAFTED[item] || null;
const invTotal = S => ALL_PRODUCT_KEYS.reduce((a,k) => a + (S.inventory[k] || 0), 0);
const marketPrice = (S,item) => {
  const w = weatherOf(S), m = productMeta(item);
  if (!m) return 0;
  const mult = (S.marketMult && S.marketMult[item]) || 1;
  const wm = (w.price && w.price[item]) || 1;
  return Math.max(1, Math.round(m.base * mult * wm * (1 + .02 * (zoneLevel(S,'storage') - 1))));
};
const priceTrend = (S,item) => {
  const prev = S.prevPrices && S.prevPrices[item];
  if (!prev) return 'flat';
  const now = marketPrice(S,item);
  if (now > prev * 1.015) return 'up';
  if (now < prev * .985) return 'down';
  return 'flat';
};
const marketMood = S => {
  let up = 0, down = 0;
  ALL_PRODUCT_KEYS.forEach(k => { const t = priceTrend(S,k); if (t === 'up') up++; else if (t === 'down') down++; });
  if (up > down + 1) return 'Fiyatlar yükseliyor';
  if (down > up + 1) return 'Fiyatlar düşüyor';
  return 'Fiyatlar güncel';
};
const dateKey = (d) => {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0');
};
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };
const dailyAvailable = S => (S.daily.lastClaimedDate || '') !== dateKey();
const dailyPos = S => {
  const last = S.daily.lastClaimedDate || '';
  if (!last) return 0;
  if (last !== dateKey() && last !== yesterdayKey()) return 0;
  return S.daily.streak % 7;
};
const nextFeedSlot = S => {
  const i = S.feedSlots.findIndex(v => !v);
  return i;
};
const dueFeedSlot = S => {
  const times = [360,720,1080];
  for (let i = 0; i < 3; i++) if (!S.feedSlots[i] && S.time >= times[i]) return i;
  return -1;
};
const feedSlotState = (S,i) => {
  if (S.feedSlots[i]) return 'done';
  const due = dueFeedSlot(S);
  const times = [360,720,1080];
  if (i === due) return S.time > times[i] + 90 ? 'late' : 'current';
  if (S.time > times[i] + 90) return 'missed';
  return 'upcoming';
};
const missedFeeds = S => {
  const times = [360,720,1080];
  return [0,1,2].filter(i => !S.feedSlots[i] && S.time > times[i] + 90).length;
};
const countReady = S => Object.keys(CROPS).filter(k => S.zones[k].planted && S.zones[k].ready).length;
const readyCrops = S => Object.keys(CROPS).filter(k => S.zones[k].planted && S.zones[k].ready);
const zoneStatus = (S,key) => {
  if (CROPS[key]) {
    const z = S.zones[key];
    if (!z.planted) return 'Boş';
    if (z.ready) return 'Hasada hazır';
    if (!isWatered(S,z)) return 'Sulanmalı';
    return 'Büyüyor';
  }
  if (key === 'animal') return missedFeeds(S) ? 'Besleme gecikti' : 'Sağlıklı';
  if (key === 'water') return 'Dolu';
  if (key === 'house') return 'Enerji ' + Math.round(energyPct(S)) + '%';
  if (key === 'storage') return 'Depo ' + Math.round(invTotal(S) / storageCap(S) * 100) + '%';
  return '';
};
const statusClass = (S,key) => {
  if (CROPS[key]) {
    const z = S.zones[key];
    if (!z.planted) return 'empty';
    if (z.ready) return 'ready';
    if (!isWatered(S,z)) return 'dry';
    return 'growing';
  }
  if (key === 'animal') return missedFeeds(S) ? 'dry' : 'animal';
  return 'growing';
};
const tempOf = S => {
  const s = seasonOf(S), w = S.weather;
  const off = { sunny:3, cloudy:0, rainy:-2, storm:-4, heat:6, snow:-3 }[w] || 0;
  return Math.round(s.base[0] + (s.base[1] - s.base[0]) * .55 + off);
};
const weatherWaterText = S => {
  const w = weatherOf(S);
  if (w.rain > 0) return (S.weather === 'snow' ? 'Kar +' : 'Yağmur +') + w.rain + ' L';
  return 'Yağmur yok';
};
const weatherSolarText = S => {
  const s = weatherOf(S).solar;
  return s >= 1.2 ? 'Güçlü' : s >= .7 ? 'Orta' : s >= .3 ? 'Zayıf' : 'Yok';
};
const dailyRewardFor = S => DAILY_REWARDS[dailyPos(S)];
const unreadCount = S => (S.notifications || []).filter(n => !n.read).length;
const achievementCount = S => ACHIEVEMENTS.filter(a => S.achievements && S.achievements[a.id]).length;

/* ---------- fabrika hesapları ---------- */
const factoryState = (S,id) => (S.factories && S.factories[id]) || { unlocked:false, slots:1, jobs:[] };
const factoryUnlocked = (S,id) => !!(S.factories && S.factories[id] && S.factories[id].unlocked);
const factoryRecipes = id => (FACTORY_DEFS[id] && FACTORY_DEFS[id].recipes) || [];
const factoryRecipe = (id,recipeId) => factoryRecipes(id).find(r => r.id === recipeId) || null;
const factorySlotCost = (S,id) => {
  const def = FACTORY_DEFS[id], st = factoryState(S,id);
  if (!def || st.slots >= FACTORY_MAX_SLOTS) return 0;
  return def.slotCosts[st.slots - 1] || 0;
};
const factoryOpenCount = S => FACTORY_KEYS.filter(k => factoryUnlocked(S,k)).length;
const factoryJobDone = job => !!job.done;
const factoryNow = S => nowAbs(S);
const factoryJobLeft = (S,job) => Math.max(0, (job.endsAt || 0) - factoryNow(S));
const factoryJobPct = (S,job) => {
  if (job.done) return 100;
  const total = Math.max(1, (job.endsAt || 0) - (job.startedAt || 0));
  return clamp((factoryNow(S) - (job.startedAt || 0)) / total * 100, 0, 100);
};
const factoryNeedText = need => Object.keys(need || {}).map(k => qty(need[k]) + ' ' + ((productMeta(k) || {}).unit || '') + ' ' + ((productMeta(k) || {}).name || k).toLowerCase()).join(' · ');
const factoryOutText = out => Object.keys(out || {}).map(k => qty(out[k]) + ' ' + ((productMeta(k) || {}).unit || '') + ' ' + ((productMeta(k) || {}).name || k).toLowerCase()).join(' · ');
const factoryCanStart = (S,id,recipeId) => {
  if (!factoryUnlocked(S,id)) return false;
  const def = FACTORY_DEFS[id], st = factoryState(S,id), r = factoryRecipe(id,recipeId);
  if (!def || !r || st.jobs.length >= st.slots) return false;
  return Object.keys(r.need).every(k => (S.inventory[k] || 0) >= r.need[k]);
};
const factoryAnyDone = (S,id) => factoryState(S,id).jobs.some(j => j.done);

/* ---------- görev / sipariş üretimi ---------- */
function makeQuests(day) {
  const len = QUEST_POOL.length, start = ((day - 1) * 2) % len, idx = [];
  for (let i = 0; i < 3; i++) {
    let k = (start + i * 3) % len, guard = 0;
    while (idx.indexOf(k) >= 0 && guard++ < len) k = (k + 1) % len;
    idx.push(k);
  }
  return idx.map((k,i) => Object.assign({}, QUEST_POOL[k], { id:'q' + day + '-' + i, progress:0, claimed:false, day:day }));
}
function makeOrders(day) {
  const a = MARKET_KEYS[(day * 3) % MARKET_KEYS.length];
  let b = MARKET_KEYS[(day * 3 + 2) % MARKET_KEYS.length];
  if (b === a) b = MARKET_KEYS[(day * 3 + 3) % MARKET_KEYS.length];
  const qa = [8,12,15,10,18][day % 5], qb = [6,10,8,14,7][day % 5];
  return [
    { id:'o' + day + '-a', buyer:BUYERS[day % BUYERS.length], item:a, qty:qa, reward:Math.round(MARKET[a].base * qa * 1.35), delivered:false },
    { id:'o' + day + '-b', buyer:BUYERS[(day + 3) % BUYERS.length], item:b, qty:qb, reward:Math.round(MARKET[b].base * qb * 1.35), delivered:false }
  ];
}
function makeNotification(id, title, text, icon, time, read) {
  return { id:id, title:title, text:text, icon:icon, time:time || '06:00', read:!!read };
}

/* ---------- başlangıç durumu ---------- */
function makeDefaultState() {
  const now = Date.now();
  const waterUntil = 1 * DAY_MIN + 360 + 600;
  const mult = {}, prev = {};
  ALL_PRODUCT_KEYS.forEach(k => { mult[k] = 1; prev[k] = productMeta(k).base; });
  const factories = {};
  FACTORY_KEYS.forEach(id => { factories[id] = { unlocked:false, slots:1, jobs:[] }; });
  return {
    version: 3,
    money: 2500,
    level: 1,
    xp: 0,
    day: 1,
    time: 360,
    profile: { name:'Çiftçi', farm:'Yeşil Vadi Çiftliği', onboarded:false },
    notificationsEnabled: true,
    weather: 'sunny',
    forecast: 'cloudy',
    temp: 24,
    energy: 76,
    water: 8200,
    feed: 120,
    inventory: { tomato:140, lettuce:80, carrot:60, corn:100, milk:0, egg:0, wool:0 },
    zones: {
      house:     { level:1 },
      tomato:    { level:1, planted:true, growth:86, ready:false, wateredUntil:waterUntil, harvests:0 },
      vegetable: { level:1, planted:true, growth:90, ready:false, wateredUntil:waterUntil, harvests:0 },
      corn:      { level:1, planted:true, growth:82, ready:false, wateredUntil:waterUntil, harvests:0 },
      animal:    { level:1 },
      water:     { level:1 },
      storage:   { level:1 }
    },
    animals: {
      cows:     { health:96, production:4.8 },
      chickens: { health:94, production:6 },
      sheep:    { health:95, production:1.2 },
      goats:    { health:93, production:1.6 }
    },
    feedSlots: [false,false,false],
    feedSlotTimes: [null,null,null],
    lastFeedDay: 1,
    autoFeed: false,
    quests: makeQuests(1),
    questDay: 1,
    orders: makeOrders(1),
    orderDay: 1,
    factories,
    daily: { lastClaimedDate:'', lastClaimedDay:0, streak:0 },
    achievements: {},
    stats: { earned:0, spent:0, harvests:0, sold:0, feeds:0, upgrades:0, products:0, crafted:0, factorySpent:0, days:1, xpEarned:0, waterUsed:0, feedGiven:0, orders:0, playSeconds:0 },
    dayStats: { earned:0, harvests:0, sold:0, feeds:0, products:0 },
    history: [],
    notifications: [
      makeNotification(1,'Günaydın, çiftçi!','Domates tarlası hasada çok yakın. İlk hasadını topla.','i-sun','06:00',false),
      makeNotification(2,'Besleme zamanı','Hayvanların sabah yemini bekliyor. Yem stoğun 120 kg.','i-wheat','06:00',false)
    ],
    marketMult: mult,
    prevPrices: prev,
    marketTab: 'sell',
    selectedZone: 'overview',
    selectedCat: 'cows',
    flags: { lowWaterDay:0, lowEnergyDay:0, lowFeedDay:0, notifAsked:false, ready:{}, feedDue:{0:true}, missed:{} },
    tutorialDone: false,
    sound: true,
    vibration: true,
    startSeen: false,
    lastSaved: now,
    lastSimAt: now,
    createdAt: now
  };
}
function mergeState(raw) {
  const base = makeDefaultState();
  if (!raw || typeof raw !== 'object' || raw.version !== 3) return base;
  const S = Object.assign(base, raw);
  S.profile = Object.assign(base.profile, raw.profile || {});
  if (!raw.profile || typeof raw.profile.onboarded !== 'boolean') S.profile.onboarded = false;
  S.inventory = Object.assign(base.inventory, raw.inventory || {});
  ALL_PRODUCT_KEYS.forEach(k => { if (S.inventory[k] == null) S.inventory[k] = 0; });
  S.stats = Object.assign(base.stats, raw.stats || {});
  S.dayStats = Object.assign(base.dayStats, raw.dayStats || {});
  S.daily = Object.assign(base.daily, raw.daily || {});
  if (!S.daily.lastClaimedDate && raw.daily && raw.daily.lastClaimedDay === raw.day) S.daily.lastClaimedDate = dateKey();
  if (!S.daily.lastClaimedDate) S.daily.lastClaimedDate = '';
  S.flags = Object.assign(base.flags, raw.flags || {});
  S.achievements = raw.achievements || {};
  S.marketMult = Object.assign(base.marketMult, raw.marketMult || {});
  S.prevPrices = Object.assign(base.prevPrices, raw.prevPrices || {});
  S.factories = base.factories;
  FACTORY_KEYS.forEach(id => {
    const r = (raw.factories && raw.factories[id]) || {};
    S.factories[id] = { unlocked:!!r.unlocked, slots:clamp(Number(r.slots) || 1, 1, FACTORY_MAX_SLOTS), jobs:Array.isArray(r.jobs) ? r.jobs : [] };
  });
  S.zones = base.zones;
  Object.keys(base.zones).forEach(k => { S.zones[k] = Object.assign(base.zones[k], (raw.zones && raw.zones[k]) || {}); });
  S.animals = base.animals;
  Object.keys(base.animals).forEach(k => { S.animals[k] = Object.assign(base.animals[k], (raw.animals && raw.animals[k]) || {}); });
  S.feedSlots = Array.isArray(raw.feedSlots) && raw.feedSlots.length === 3 ? raw.feedSlots : [false,false,false];
  S.feedSlotTimes = Array.isArray(raw.feedSlotTimes) && raw.feedSlotTimes.length === 3 ? raw.feedSlotTimes : [null,null,null];
  S.notifications = Array.isArray(raw.notifications) ? raw.notifications : base.notifications;
  S.history = Array.isArray(raw.history) ? raw.history : [];
  S.quests = raw.questDay === raw.day && Array.isArray(raw.quests) && raw.quests.length ? raw.quests : makeQuests(raw.day || 1);
  S.questDay = raw.day || 1;
  S.orders = raw.orderDay === raw.day && Array.isArray(raw.orders) ? raw.orders : makeOrders(raw.day || 1);
  S.orderDay = raw.day || 1;
  S.level = clamp(S.level || 1, 1, FARM_MAX_LEVEL);
  S.xp = Math.max(0, S.xp || 0);
  S.money = Math.max(0, Math.round(S.money || 0));
  if (S.notificationsEnabled == null) S.notificationsEnabled = true;
  if (!S.lastSimAt || S.lastSimAt > Date.now() + 60000) S.lastSimAt = S.lastSaved || Date.now();
  S.energy = clamp(S.energy == null ? 76 : S.energy, 0, energyCap(S));
  S.water = clamp(S.water == null ? 8200 : S.water, 0, waterCap(S));
  S.feed = clamp(S.feed == null ? 120 : S.feed, 0, feedCap(S));
  S.time = clamp(S.time || 0, 0, 1439);
  S.day = Math.max(1, S.day || 1);
  if (!S.weather || !WEATHER[S.weather]) S.weather = 'sunny';
  if (!S.forecast || !WEATHER[S.forecast]) S.forecast = 'cloudy';
  S.credit = Object.assign({ active:false, principal:0, interest:0, dueDay:0, totalPaid:0, lastInterestDay:0 }, raw.credit || {});
  S.social = Object.assign(base.social, raw.social || {});
  return S;
}

/* ---------- harita katmanı ---------- */
function tractorMap(x,y,s){
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="22" cy="38" rx="30" ry="8" fill="#2E5A2C" opacity=".2"/>
    <g transform="rotate(-6 20 20)">
      <rect x="0" y="10" width="42" height="22" rx="3" fill="#C23B2E"/>
      <rect x="12" y="2" width="20" height="15" rx="3" fill="#2F3E3A"/>
      <rect x="14" y="4" width="16" height="10" rx="2" fill="#9FCBD9"/>
      <circle cx="7" cy="34" r="11" fill="#2E2B27"/><circle cx="7" cy="34" r="4.6" fill="#7B756C"/>
      <circle cx="35" cy="34" r="11" fill="#2E2B27"/><circle cx="35" cy="34" r="4.6" fill="#7B756C"/>
      <circle cx="10" cy="9" r="6.6" fill="#2E2B27"/><circle cx="36" cy="9" r="6.6" fill="#2E2B27"/>
      <rect x="39" y="-2" width="3" height="8" fill="#4C4A44"/>
    </g>
  </g>`;
}
function waterTowerMap(x,y,s){
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="70" rx="26" ry="6" fill="#2E5A2C" opacity=".2"/>
    <path d="M-18 70 0 10l18 60" fill="none" stroke="#8B8A78" stroke-width="3"/>
    <path d="M-10 70 0 26l10 44" fill="none" stroke="#A3A18C" stroke-width="2"/>
    <rect x="-24" y="-2" width="48" height="34" rx="7" fill="#7FB6C9"/>
    <rect x="-20" y="2" width="40" height="26" rx="5" fill="#9FD3E4"/>
    <path d="M-20 8h40M-20 20h40" stroke="#D9F1F7" stroke-width="1.6" opacity=".7"/>
    <path d="M-24 6h48" stroke="#5C8E9F" stroke-width="2"/>
  </g>`;
}
function pipeLine(x1,x2,y){
  let s = `<path d="M${x1} ${y}H${x2}" stroke="#6FB4CF" stroke-width="5" stroke-linecap="round"/>`;
  for (let x = x1 + 16; x < x2; x += 54) s += `<circle cx="${x}" cy="${y}" r="3.4" fill="#3F8FB3"/>`;
  return s;
}
function mapBadge(x,y,text){
  return `<g class="dyn-badge" transform="translate(${x} ${y})" filter="url(#pillShadow)">
    <rect x="-27" y="-14" width="54" height="28" rx="14" fill="#FFFDF8" stroke="#E4D7B8" stroke-width="1.5"/>
    <text x="0" y="5.5" text-anchor="middle" font-family="'Plus Jakarta Sans',sans-serif" font-size="15" font-weight="800" fill="#8A6420">${text}</text>
  </g>`;
}
function mapAlert(x,y,ic,color,cls){
  /* Haritadaki yuvarlak uyarılar sabit durur; kullanıcı isteğiyle sallanma kaldırıldı. */
  return `<g class="${cls || ''}" transform="translate(${x} ${y})">
    <circle r="25" fill="#FFFDF8" opacity=".92"/>
    <circle r="19" fill="${color}"/>
    <use href="#${ic}" x="-10" y="-10" width="20" height="20" color="#FFFDF8"/>
  </g>`;
}
function mapFence(x,y,w,color){
  color = color || '#B9A57C';
  let s = `<g transform="translate(${x} ${y})">`;
  for (let i = 0; i <= w; i += 16) s += `<path d="M${i} -9v18" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="M-2 -4h${w+4}M-2 5h${w+4}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></g>`;
  return s;
}
function mapFlag(x,y,color){
  return `<g transform="translate(${x} ${y})"><path d="M0 0v24" stroke="#7B6A50" stroke-width="2.4"/><path d="M1 1c8 2 10 7 17 6v11C11 18 8 13 1 15Z" fill="${color || '#E8A13A'}"/></g>`;
}
function mapFlowers(x,y,color){
  return `<g transform="translate(${x} ${y})" fill="${color || '#E8A13A'}">
    <circle cx="0" cy="0" r="3"/><circle cx="9" cy="4" r="2.4"/><circle cx="17" cy="-2" r="2.7"/>
    <path d="M0 4v7M9 6v7M17 1v7" stroke="#5F8A4C" stroke-width="1.4"/>
  </g>`;
}
function mapOverlay(S){
  const lv = k => zoneLevel(S,k);
  let o = '';

  /* ev */
  const h = lv('house');
  if (h >= 2) o += `<g transform="translate(196 84) scale(.82)"><use href="#mapSolar"/></g>` + mapFence(58,330,96) + mapFlowers(88,306,'#E8A13A');
  if (h >= 3) o += `<g transform="translate(300 164) scale(.4)"><use href="#mapBarn"/></g>` + mapFlag(350,142,'#4E8A5B') + `<path d="M120 342h120" stroke="#D8C39B" stroke-width="5" stroke-linecap="round"/>`;
  if (h >= 4) o += `<g transform="translate(44 198) scale(.5)"><use href="#mapGreenhouse"/></g>` + mapFlowers(55,235,'#D9533C') + mapFlowers(388,248,'#7A6EB4');
  if (h >= 5) o += `<g transform="translate(330 214) scale(.48)" class="dyn-mill"><use href="#mapWindmill"/></g>` + mapFlag(372,188,'#E8C56A') + `<circle cx="250" cy="196" r="118" fill="none" stroke="#E8C56A" stroke-width="2.4" stroke-dasharray="4 10" opacity=".65"/>`;

  /* tarlalar */
  const field = (key,scare,green,trac,pipeY,fenceX) => {
    const l = lv(key);
    let s = '';
    if (l >= 2) s += `<g transform="translate(${scare[0]} ${scare[1]}) scale(.68)"><use href="#mapScarecrow"/></g>` + mapFence(fenceX, scare[1] + 84, 92);
    if (l >= 3) s += pipeLine(548 + (key === 'vegetable' ? -500 : 0), 958 + (key === 'vegetable' ? -500 : 0), pipeY) +
      `<g transform="translate(${fenceX + 112} ${scare[1] + 72}) scale(.38)"><use href="#mapTankSmall"/></g>`;
    if (l >= 4) s += `<g transform="translate(${green[0]} ${green[1]}) scale(.46)"><use href="#mapGreenhouse"/></g>` + mapFlowers(fenceX + 20, scare[1] + 112, '#D9533C');
    if (l >= 5) s += tractorMap(trac[0], trac[1], .62) + mapFlag(trac[0] + 72, trac[1] - 34, '#E8C56A');
    return s;
  };
  o += field('tomato', [566,62], [846,322], [548,332], 34, 572);
  o += field('vegetable', [60,506], [352,748], [46,742], 474, 66);
  o += field('corn', [566,506], [846,748], [548,742], 474, 572);

  /* hayvanlar */
  const a = lv('animal');
  if (a >= 2) o += `<g transform="translate(558 1042) scale(.9)"><use href="#mapHay"/></g>
    <g transform="translate(482 1148) scale(.78)"><use href="#mapTrough"/></g>` + mapFence(78,1194,112) + mapFlowers(88,1172,'#E8A13A');
  if (a >= 3) o += `<g transform="translate(562 894) scale(.55)"><use href="#mapSilo"/></g>` + mapFlag(606,884,'#4E8A5B') + mapFence(486,918,72);
  if (a >= 4) o += `<g transform="translate(392 900) scale(.4)"><use href="#mapStore"/></g>
    <g transform="translate(410 1004) scale(.92)"><g class="map-animal"><use href="#mapCowsmall"/></g></g>
    <g transform="translate(330 1138) scale(.9)"><g class="map-animal"><use href="#mapCowsmall"/></g></g>
    <g transform="translate(516 982)"><g class="map-animal"><use href="#mapChicken"/></g></g><g transform="translate(542 998) scale(.85)"><g class="map-animal"><use href="#mapChicken"/></g></g>
    <g transform="translate(252 1000) scale(.95)"><g class="map-animal"><use href="#mapSheep"/></g></g>` + mapFlowers(206,1160,'#7A6EB4') + `<g transform="translate(470 1124) scale(.65)"><use href="#mapCrate"/></g>`;
  if (a >= 5) o += `<g transform="translate(566 1002) scale(.5)" class="dyn-mill"><use href="#mapWindmill"/></g>` + mapFlag(600,978,'#E8C56A');

  /* su */
  const w = lv('water');
  if (w >= 2) o += `<g transform="translate(894 1004) scale(.55)"><use href="#mapTankSmall"/></g>`;
  if (w >= 2) o += pipeLine(812, 868, 986) + mapFlag(868,934,'#55A9DC');
  if (w >= 3) o += waterTowerMap(884, 900, .68) + `
    <circle cx="748" cy="968" r="73" fill="none" stroke="#E3DCC4" stroke-width="3" opacity=".65"/>` + mapFlowers(688,1010,'#7A6EB4');
  if (w >= 4) o += `<g transform="translate(684 1004) scale(.66)"><use href="#mapSolar"/></g>` + mapFence(684,1046,66);
  if (w >= 5) o += `<g transform="translate(884 1034) scale(.7)"><rect x="-24" y="-18" width="48" height="36" rx="6" fill="#D8D3C2" stroke="#A9A389" stroke-width="2"/><rect x="-16" y="-10" width="32" height="20" rx="3" fill="#8FD0E4"/><path d="M-10 0h20" stroke="#FFFDF8" stroke-width="2"/></g>
    <circle cx="748" cy="968" r="80" fill="none" stroke="#E8C56A" stroke-width="3" stroke-dasharray="6 8" opacity=".8"/>` + mapFlag(934,1018,'#E8C56A');

  /* depo */
  const st = lv('storage');
  const sc = .66 + .07 * (st - 1);
  o += `<g transform="translate(${700 - (sc - .66) * 70} ${1090 - (sc - .66) * 50}) scale(${sc})"><use href="#mapStore"/></g>`;
  if (st >= 2) o += `<g transform="translate(926 1084) scale(.5)"><use href="#mapSilo"/></g>` + mapFlag(952,1060,'#B5892D');
  if (st >= 3) o += `<g transform="translate(884 1140) scale(1.05)"><use href="#mapCrate"/></g>
    <g transform="translate(910 1152) scale(.8)"><use href="#mapCrate"/></g>` + mapFence(820,1168,64);
  if (st >= 4) o += `<g transform="translate(720 1082) scale(.42)"><use href="#mapSolar"/></g>` + mapFlowers(742,1118,'#4E8A5B');
  if (st >= 5) o += `<g transform="translate(880 1100)"><circle r="18" fill="#E8C56A"/><use href="#i-star" x="-9" y="-9" width="18" height="18" color="#5C3E0C"/></g>` + mapFlag(700,1118,'#E8C56A');

  /* seviye rozetleri */
  ZONE_KEYS.forEach(k => { o += mapBadge(BADGE_POS[k][0], BADGE_POS[k][1], 'Sv. ' + lv(k)); });

  /* hazır / uyarı rozetleri */
  Object.keys(READY_POS).forEach(k => {
    if (S.zones[k].planted && S.zones[k].ready) {
      const p = READY_POS[k];
      o += `<g class="dyn-ready" transform="translate(${p[0]} ${p[1]})">
        <circle class="dyn-ready-ring" r="33" fill="none" stroke="#F0B84B" stroke-width="3"/>
        <circle r="24" fill="#FFF7DC" stroke="#E8A13A" stroke-width="3"/>
        <use href="#i-check" x="-11" y="-11" width="22" height="22" color="#A06E18"/>
      </g>`;
    }
  });
  if (dueFeedSlot(S) >= 0) o += mapAlert(330, 1006, 'i-wheat', '#D99A2A');
  if (waterPct(S) < 20) o += mapAlert(922, 952, 'i-drop', '#4E8FB0');
  if (energyPct(S) < 20) o += mapAlert(318, 340, 'i-bolt', '#D9772E');
  if (invTotal(S) > storageCap(S) * .92) o += mapAlert(906, 1160, 'i-box', '#B64B35');
  return o;
}

/* ---------- bölge kartları ---------- */
function zoneUpgradeCost(key, level) {
  const base = ZONE[key].upgradeBase || 1000;
  return Math.round(base * Math.pow(1.72, level - 1) / 10) * 10;
}
function nextLevelEffect(key, lv) {
  switch (key) {
    case 'house': return '+25 enerji kapasitesi · +%8 güneş' + (lv + 1 >= 4 ? ' · otomatik yem' : '');
    case 'tomato': case 'vegetable': case 'corn': return '+' + num(fieldExtraHectares(key), 1) + ' hektar · +%14 büyüme · yeni görünüm';
    case 'animal': return '+2 inek · +3 tavuk · +1 koyun · +1 keçi · +%12 üretim';
    case 'water': return '+2.500 L kapasite · +%15 yağmur';
    case 'storage': return '+800 depo · +50 kg yem · +%2 pazar';
    default: return '';
  }
}
function upgradePanel(S, key, lv) {
  if (lv >= MAX_LEVEL) {
    return `<div class="upgrade-panel"><div class="up-main"><small>Bölge seviyesi</small><b>Maksimum seviye</b><span>Bu bölge tamamen gelişti; görünümü zirvede.</span></div><button class="btn small max" disabled>${icon('i-check-circle')} Maks</button></div>`;
  }
  const cost = zoneUpgradeCost(key, lv), can = S.money >= cost;
  return `<div class="upgrade-panel"><div class="up-main"><small>Seviye ${lv} → ${lv + 1}</small><b>${money(cost)}</b><span>${nextLevelEffect(key, lv)}</span></div><button class="btn gold small" data-action="upgrade" data-zone="${key}" ${can ? '' : 'disabled'}>${icon('i-arrow-up')} Yükselt</button></div>`;
}
function detailButton(key, detail) {
  return detail ? '' : `<button class="btn ghost" data-action="detail" data-zone="${key}">${icon('i-expand')} Detay</button>`;
}
function cropBody(S, key, opts) {
  const z = S.zones[key], c = CROPS[key], lv = zoneLevel(S, key);
  const watered = isWatered(S, z), ready = z.ready, pct = Math.round(z.growth);
  const status = zoneStatus(S, key), sc = statusClass(S, key), left = growthLeft(S, key);
  const y = Math.round(cropYield(S, key)), w = weatherOf(S);
  let actions = '';
  if (!z.planted) {
    const can = S.money >= c.seedCost;
    actions = `<button class="btn primary" data-action="plant" data-zone="${key}" ${can ? '' : 'disabled'}>${icon('i-seed')} Ek · ${money(c.seedCost)}</button>`;
  } else if (ready) {
    actions = `<button class="btn primary" data-action="harvest" data-zone="${key}">${icon('i-basket')} Hasat Et</button>`;
  } else if (!watered) {
    const can = S.water >= c.waterUse;
    actions = `<button class="btn primary" data-action="water" data-zone="${key}" ${can ? '' : 'disabled'}>${icon('i-drop')} Sula · ${fmt(c.waterUse)} L</button>`;
  } else {
    actions = `<button class="btn primary" disabled>${icon('i-sprout')} Büyüyor</button>`;
  }
  actions += detailButton(key, opts.detail);
  let alert = '';
  if (ready) alert = `<div class="zone-alert good">${icon('i-basket')} Hasat hazır. Topla, ürünler depoya gitsin.</div>`;
  else if (!z.planted) alert = `<div class="zone-alert">${icon('i-seed')} Tarla boş. Ekim yaparak yeni bir döngü başlat.</div>`;
  else if (!watered) alert = `<div class="zone-alert bad">${icon('i-drop')} Toprak kuru. Sula, büyüme hızı yükselsin.</div>`;
  else if (invTotal(S) > storageCap(S) * .9) alert = `<div class="zone-alert">${icon('i-box')} Depo doluyor. Hasattan önce ürün sat.</div>`;
  else if (w.rain > 0) alert = `<div class="zone-alert good">${icon('i-rain')} Yağmur toprağı suladı. Doğa çalışıyor.</div>`;
  return `<div class="zone-sub-row"><span class="status-pill ${sc}" data-live="status">${status}</span><small>${watered ? 'Sulu toprak' : z.planted ? 'Kuru toprak' : 'Ekim bekliyor'}</small></div>
    <div class="growth-row"><span>${z.planted ? (ready ? 'Hasat hazır' : 'Büyüme') : 'Tarla boş'}</span><b data-live="growthText">${z.planted ? pct + '%' : '—'}</b></div>
    <div class="growth-track ${ready ? 'ready' : ''}"><i data-live="growth" style="width:${z.planted ? pct : 0}%"></i></div>
    <div class="growth-note"><span data-live="note">${z.planted ? (ready ? 'Toplamaya hazır' : watered ? 'Sulanıyor · ' + etaText(left) : 'Su bekliyor') : 'Ekim yapılmadı'}</span><span>${c.short} · ${qty(y)} kg</span></div>
    <div class="stats3">
      <div class="statbox"><small>Tarla alanı</small><b>${hectareText(S,key)}</b></div>
      <div class="statbox"><small>Verim</small><b>${qty(y)} kg</b></div>
      <div class="statbox"><small>Hasat</small><b>${z.harvests || 0}</b></div>
    </div>
    <div class="zone-effects">
      <span class="effect-chip">${icon('i-sprout')} Büyüme %${Math.round(cropRate(S,key) / (100 / c.growth) * 100)}</span>
      <span class="effect-chip">${icon('i-drop')} ${fmt(c.waterUse)} L</span>
      <span class="effect-chip">${icon('i-sun')} ${w.name}</span>
      <span class="effect-chip">${icon('i-star')} Sv. ${lv}</span>
    </div>
    <div class="hectare-note">${icon('i-expand')} Tarla büyüdükçe hektar ve hasat verimi artar. Sv. ${lv} → ${lv < MAX_LEVEL ? 'Sv. ' + (lv + 1) + ': +' + num(fieldExtraHectares(key),1) + ' ha' : 'maksimum alan'}</div>
    ${alert}
    <div class="actions">${actions}</div>`;
}
function houseBody(S, opts) {
  const lv = zoneLevel(S, 'house'), ep = Math.round(energyPct(S));
  const w = weatherOf(S), solar = (0.9 * w.solar + .15).toFixed(1);
  let alert = '';
  if (S.energy < 20) alert = `<div class="zone-alert bad">${icon('i-bolt')} Enerji düşük. Güneş paneli yavaş şarj ediyor.</div>`;
  else if (w.solar > 1.2) alert = `<div class="zone-alert good">${icon('i-sun')} Güneşli hava; enerji hızlı doluyor.</div>`;
  const canBuy = S.energy < energyCap(S) && S.money >= 120;
  return `<div class="zone-sub-row"><span class="status-pill growing">Enerji merkezi</span><small>${solar} enerji/sa</small></div>
    <div class="growth-row"><span>Çiftlik enerjisi</span><b data-live="energyText">${Math.round(S.energy)} / ${energyCap(S)}</b></div>
    <div class="energy-bar"><i data-live="energyBar" style="width:${ep}%"></i></div>
    <div class="growth-note"><span>Güneş paneli · ${weatherSolarText(S)}</span><span>Bölge Sv. ${lv}</span></div>
    <div class="stats3">
      <div class="statbox"><small>Enerji</small><b>%${ep}</b></div>
      <div class="statbox"><small>Kapasite</small><b>${energyCap(S)}</b></div>
      <div class="statbox"><small>Güneş</small><b>${weatherSolarText(S)}</b></div>
    </div>
    <div class="zone-effects">
      <span class="effect-chip">${icon('i-bolt')} +${solar}/sa</span>
      <span class="effect-chip">${icon('i-house')} Sv. ${lv}</span>
      ${lv >= 4 ? `<span class="effect-chip">${icon('i-wheat')} Oto. yem</span>` : `<span class="effect-chip">${icon('i-lock')} Sv. 4: oto. yem</span>`}
    </div>
    ${alert}
    <div class="actions">
      <button class="btn primary" data-action="buy-energy" ${canBuy ? '' : 'disabled'}>${icon('i-bolt')} Enerji Al · 120 ₺</button>
      ${detailButton('house', opts.detail)}
    </div>
    ${lv >= 4 ? `<div class="upgrade-panel"><div class="up-main"><small>Otomatik yem</small><b>${S.autoFeed ? 'Açık' : 'Kapalı'}</b><span>Her sabah 3 öğünü otomatik verir (yem varsa).</span></div><button class="btn small ${S.autoFeed ? 'soft' : 'gold'}" data-action="toggle-autofeed">${S.autoFeed ? 'Kapat' : 'Aç'}</button></div>` : ''}`;
}
function waterBody(S, opts) {
  const lv = zoneLevel(S, 'water'), wp = Math.round(waterPct(S)), w = weatherOf(S);
  const dry = Object.keys(CROPS).filter(k => S.zones[k].planted && !isWatered(S, S.zones[k]));
  const need = dry.reduce((a, k) => a + CROPS[k].waterUse, 0);
  const canWater = need > 0 && S.water >= need;
  const canBuy = S.water < waterCap(S) && S.money >= 40;
  let alert = '';
  if (wp < 20) alert = `<div class="zone-alert bad">${icon('i-drop')} Su seviyesi kritik. Tankı doldur veya yağmuru bekle.</div>`;
  else if (w.rain > 0) alert = `<div class="zone-alert good">${icon('i-rain')} Yağmur depoyu dolduruyor (+${w.rain} L).</div>`;
  else if (dry.length) alert = `<div class="zone-alert">${icon('i-drop')} ${dry.length} tarla susuz. Akıllı sula ile hepsini hallet.</div>`;
  return `<div class="zone-sub-row"><span class="status-pill ${wp < 20 ? 'dry' : 'growing'}">${wp < 20 ? 'Kritik' : 'Dolu'}</span><small>${weatherWaterText(S)}</small></div>
    <div class="growth-row"><span>Su rezervi</span><b>${fmt(S.water)} / ${fmt(waterCap(S))} L</b></div>
    <div class="water-bar"><i style="width:${wp}%"></i></div>
    <div class="growth-note"><span>${dry.length ? dry.length + ' tarla susuz' : 'Tüm tarlalar sulu'}</span><span>%${wp}</span></div>
    <div class="stats3">
      <div class="statbox"><small>Depo</small><b>%${wp}</b></div>
      <div class="statbox"><small>Yağmur</small><b>${w.rain > 0 ? '+' + w.rain + ' L' : 'Yok'}</b></div>
      <div class="statbox"><small>Kapasite</small><b>${fmt(waterCap(S))}</b></div>
    </div>
    <div class="zone-effects">
      <span class="effect-chip">${icon('i-drop')} +%15 yağmur</span>
      <span class="effect-chip">${icon('i-sun')} ${w.name}</span>
      <span class="effect-chip">${icon('i-star')} Sv. ${lv}</span>
    </div>
    ${alert}
    <div class="actions">
      <button class="btn primary" data-action="auto-water" ${canWater ? '' : 'disabled'}>${icon('i-drop')} ${dry.length ? 'Akıllı Sula · ' + fmt(need) + ' L' : 'Tarlalar sulu'}</button>
      ${detailButton('water', opts.detail)}
    </div>
    <button class="btn ghost wide" data-action="buy-water" ${canBuy ? '' : 'disabled'}>${icon('i-refresh')} Tankı Doldur · 40 ₺ (+1.000 L)</button>`;
}
function storageBody(S, opts) {
  const lv = zoneLevel(S, 'storage'), used = invTotal(S), cap = storageCap(S);
  const pct = Math.round(used / cap * 100), fp = Math.round(feedPct(S));
  const canBuy = S.feed < feedCap(S) && S.money >= 100;
  let alert = '';
  if (pct > 90) alert = `<div class="zone-alert bad">${icon('i-box')} Depo neredeyse dolu. Pazarda ürün sat.</div>`;
  else if (fp < 25) alert = `<div class="zone-alert">${icon('i-wheat')} Yem azalıyor. Hayvanlar için yem al.</div>`;
  else alert = `<div class="zone-alert good">${icon('i-check-circle')} Depo düzenli; pazar bonusu +%${2 * (lv - 1)}.</div>`;
  return `<div class="zone-sub-row"><span class="status-pill ${pct > 90 ? 'dry' : 'growing'}">${pct > 90 ? 'Doluyor' : 'Düzenli'}</span><small>${fmt(used)} / ${fmt(cap)} birim</small></div>
    <div class="growth-row"><span>Depo doluluğu</span><b>%${pct}</b></div>
    <div class="growth-track"><i style="width:${pct}%"></i></div>
    <div class="growth-note"><span>Pazar bonusu +%${2 * (lv - 1)}</span><span>Yem ${Math.round(S.feed)} / ${feedCap(S)} kg</span></div>
    <div class="stats3">
      <div class="statbox"><small>Depo</small><b>${fmt(used)} / ${fmt(cap)}</b></div>
      <div class="statbox"><small>Yem</small><b>${Math.round(S.feed)} kg</b></div>
      <div class="statbox"><small>Pazar</small><b>+%${2 * (lv - 1)}</b></div>
    </div>
    <div class="zone-effects">
      <span class="effect-chip">${icon('i-tag')} +%2 pazar</span>
      <span class="effect-chip">${icon('i-wheat')} +50 kg yem</span>
      <span class="effect-chip">${icon('i-star')} Sv. ${lv}</span>
    </div>
    ${alert}
    <div class="actions">
      <button class="btn primary" data-goto="market">${icon('i-tag')} Pazara Git</button>
      ${detailButton('storage', opts.detail)}
    </div>
    <button class="btn ghost wide" data-action="buy-feed" ${canBuy ? '' : 'disabled'}>${icon('i-wheat')} Yem Al · 100 ₺ (+25 kg)</button>`;
}
function animalBody(S, opts) {
  const lv = zoneLevel(S, 'animal'), count = totalAnimals(S), avg = Math.round(animalAvgHealth(S));
  const due = dueFeedSlot(S), cost = feedCost(S);
  const canFeed = due >= 0 && S.feed >= cost;
  let alert = '';
  if (due >= 0) alert = `<div class="zone-alert">${icon('i-wheat')} Besleme vakti! Hayvanlar seni bekliyor.</div>`;
  else if (feedPct(S) < 25) alert = `<div class="zone-alert bad">${icon('i-wheat')} Yem azalıyor. Pazarda yem al.</div>`;
  else if (missedFeeds(S)) alert = `<div class="zone-alert bad">${icon('i-clock')} ${missedFeeds(S)} öğün kaçtı; sağlık düşüyor.</div>`;
  else alert = `<div class="zone-alert good">${icon('i-check-circle')} Sürü sağlıklı; üretim devam ediyor.</div>`;
  return `<div class="zone-sub-row"><span class="status-pill animal">${count} hayvan</span><small>Sağlık %${avg} · Yem ${Math.round(S.feed)} kg</small></div>
    <div class="growth-row"><span>Sürü sağlığı</span><b>%${avg}</b></div>
    <div class="growth-track"><i style="width:${avg}%"></i></div>
    <div class="growth-note"><span>${missedFeeds(S) ? missedFeeds(S) + ' öğün gecikti' : 'Besleme düzenli'}</span><span>Üretim %${productionPct(S)}</span></div>
    <div class="stats3">
      <div class="statbox"><small>Hayvan</small><b>${count}</b></div>
      <div class="statbox"><small>Sağlık</small><b>%${avg}</b></div>
      <div class="statbox"><small>Üretim</small><b>%${productionPct(S)}</b></div>
    </div>
    <div class="zone-effects">
      <span class="effect-chip">${icon('i-wheat')} ${cost} kg/öğün</span>
      <span class="effect-chip">${icon('i-cow')} ${animalCount(S,'cows')} inek</span>
      <span class="effect-chip">${icon('i-egg')} ${animalCount(S,'chickens')} tavuk</span>
    </div>
    ${alert}
    <div class="actions">
      <button class="btn primary" data-goto="livestock">${icon('i-cow')} Ahıra Git</button>
      <button class="btn ghost" data-action="feed" ${canFeed ? '' : 'disabled'}>${icon('i-wheat')} Yem Ver</button>
    </div>`;
}
function overviewCard(S) {
  const health = farmHealth(S), ready = countReady(S), due = dueFeedSlot(S);
  const alerts = [];
  if (ready) alerts.push({ icon:'i-basket', tile:'wheat', title:ready + ' tarla hasada hazır', text:'Ürünleri topla, depoya taşı.', link:'Hasat', action:'harvest-all' });
  if (due >= 0) alerts.push({ icon:'i-wheat', tile:'wheat', title:'Besleme vakti', text:'Hayvanlar ' + timeStr([360,720,1080][due]) + ' öğününü bekliyor.', link:'Ahır', goto:'livestock' });
  if (waterPct(S) < 25) alerts.push({ icon:'i-drop', tile:'lav', title:'Su azalıyor', text:'Depo %' + Math.round(waterPct(S)) + '. Tarlalar susuz kalabilir.', link:'Su', zone:'water' });
  if (feedPct(S) < 25) alerts.push({ icon:'i-wheat', tile:'wheat', title:'Yem azalıyor', text:'Sürü için yem al; sağlık düşmesin.', link:'Pazar', goto:'market' });
  if (energyPct(S) < 25) alerts.push({ icon:'i-bolt', tile:'peach', title:'Enerji düşük', text:'Çiftlik yavaşlıyor. Enerji al veya güneşi bekle.', link:'Ev', zone:'house' });
  if (invTotal(S) > storageCap(S) * .9) alerts.push({ icon:'i-box', tile:'lav', title:'Depo doluyor', text:'Ürünleri satarak yer aç.', link:'Pazar', goto:'market' });
  if (!alerts.length) alerts.push({ icon:'i-check-circle', tile:'mint', title:'Her şey yolunda', text:'Çiftlik sağlıklı. Yeni hedeflere hazır.', link:'Çiftlik', goto:'farm' });
  const rows = alerts.slice(0,3).map(a => `<div class="overview-alert"><span class="oa-ic ${a.tile}">${icon(a.icon)}</span><span class="oa-main"><b>${a.title}</b><small>${a.text}</small></span>${a.action ? `<button class="link-btn" data-action="${a.action}">${a.link} ${icon('i-chev')}</button>` : a.zone ? `<button class="link-btn" data-zone="${a.zone}">${a.link} ${icon('i-chev')}</button>` : `<button class="link-btn" data-goto="${a.goto}">${a.link} ${icon('i-chev')}</button>`}</div>`).join('');
  const dry = Object.keys(CROPS).filter(k => S.zones[k].planted && !isWatered(S,S.zones[k]));
  const need = dry.reduce((a,k) => a + CROPS[k].waterUse, 0);
  const canWater = need > 0 && S.water >= need;
  const canFeed = due >= 0 && S.feed >= feedCost(S);
  return `<div class="icard" data-card-zone="overview">
    <div class="ic-head"><span class="tile mint">${icon('i-map')}</span><div class="ic-title"><b>Genel Bakış</b><small>7 bölge · günlük çiftlik döngüsü</small></div><span class="level-chip">${icon('i-shield')} %${health}</span></div>
    <div class="zone-sub-row"><span class="status-pill ${health >= 80 ? 'growing' : 'dry'}">${farmHealthLabel(health)}</span><small>${farmHealthNote(S)}</small></div>
    ${rows}
    <div class="actions">
      <button class="btn primary" data-action="harvest-all" ${ready ? '' : 'disabled'}>${icon('i-basket')} Hasadı Topla</button>
      <button class="btn ghost" data-action="auto-water" ${canWater ? '' : 'disabled'}>${icon('i-drop')} Akıllı Sula</button>
    </div>
    <div class="overview-stats">
      <div class="statbox"><small>Hasada hazır</small><b>${ready}</b></div>
      <div class="statbox"><small>Hayvan</small><b>${totalAnimals(S)}</b></div>
      <div class="statbox"><small>Depo</small><b>${Math.round(invTotal(S) / storageCap(S) * 100)}%</b></div>
    </div>
    <div class="zone-alert good">${icon('i-sparkle')} ${weatherOf(S).desc}</div>
    <div class="actions">
      <button class="btn ghost" data-action="feed" ${canFeed ? '' : 'disabled'}>${icon('i-wheat')} Yem Ver</button>
      <button class="btn ghost" data-action="weather">${icon('i-cloudsun')} Hava Durumu</button>
    </div>
  </div>`;
}
function zoneCard(S, key, opts) {
  opts = opts || {};
  if (key === 'overview') return overviewCard(S);
  const meta = ZONE[key], lv = zoneLevel(S, key), max = lv >= MAX_LEVEL;
  let body = '';
  if (CROPS[key]) body = cropBody(S, key, opts);
  else if (key === 'house') body = houseBody(S, opts);
  else if (key === 'water') body = waterBody(S, opts);
  else if (key === 'storage') body = storageBody(S, opts);
  else if (key === 'animal') body = animalBody(S, opts);
  return `<div class="icard lv${lv} ${opts.detail ? 'detail-card' : ''}" data-card-zone="${key}">
    <div class="ic-head">
      <span class="tile ${meta.tile}">${icon(meta.icon)}</span>
      <div class="ic-title"><b>${meta.title}</b><small>${meta.sub}</small></div>
      <span class="level-chip ${max ? 'max' : ''}">${icon('i-star')} ${max ? 'Maks' : 'Sv. ' + lv}</span>
    </div>
    ${body}
    ${upgradePanel(S, key, lv)}
  </div>`;
}

/* ---------- hayvanlar ---------- */
function prodLabel(a) {
  return a.item === 'milk' ? a.one + ' sütü' : a.itemName;
}
function prodIcon(a) {
  return a.item === 'egg' ? 'i-egg' : a.item === 'wool' ? 'i-wool' : 'i-milk';
}
function herdSamples(S, cat) {
  const a = ANIMALS[cat], lv = zoneLevel(S,'animal'), n = animalCount(S,cat);
  const count = Math.min(5, n);
  const out = [];
  for (let i = 0; i < count; i++) {
    const health = Math.round(clamp(S.animals[cat].health + ((i % 3) - 1) * 2, 70, 100));
    out.push({
      i: i, name: a.names[i % a.names.length], breed: a.breeds[i % a.breeds.length],
      health: health, age: 2 + ((i * 3 + lv) % 6),
      prod: a.yieldBase * (1 + .12 * (lv - 1)) * (health / 100)
    });
  }
  return out;
}
function cowCard(S, cat, s) {
  const a = ANIMALS[cat];
  return `<button class="cow-card ${s.health < 90 ? 'high' : ''}" data-action="open-cow" data-cat="${cat}" data-i="${s.i}">
    <span class="cow-avatar"><svg viewBox="0 0 64 64"><use href="#${a.art}"/></svg></span>
    <span class="cow-main"><span class="cow-name">${s.name}<span class="tag warm">${a.one}</span></span><span class="cow-breed">${s.breed} · ${s.age} yaş</span><span class="cow-tags"><span class="tag">${icon('i-shield')} %${s.health}</span><span class="tag">${icon(prodIcon(a))} ${qty(s.prod)} ${a.unit}/gün</span></span></span>
    <span class="cow-health">${icon('i-shield')} %${s.health}</span><span class="cow-chev">${icon('i-chev')}</span>
  </button>`;
}
function catCard(S, cat) {
  const a = ANIMALS[cat], active = S.selectedCat === cat, prod = S.animals[cat].production;
  return `<button class="cat-card ${active ? 'active' : ''}" data-action="select-cat" data-cat="${cat}">
    ${prod >= .5 ? '<span class="cat-badge"></span>' : ''}
    <svg class="cat-art" viewBox="0 0 64 64"><use href="#${a.art}"/></svg>
    <b>${animalCount(S,cat)}</b>
    <span>${icon(a.icon)} ${a.name}</span>
  </button>`;
}
function productionList(S) {
  const items = ANIMAL_KEYS.filter(cat => S.animals[cat].production >= .05);
  if (!items.length) return `<div class="production-empty">Henüz ürün birikmedi. Hayvanlar üretmeye devam ediyor.</div>`;
  return items.map(cat => {
    const a = ANIMALS[cat], v = S.animals[cat].production;
    return `<div class="prod-item ${v >= 1 ? 'ready' : ''}"><span class="pi-top">${icon(prodIcon(a))} ${prodLabel(a)}</span><b>${qty(v)} ${a.unit}</b></div>`;
  }).join('');
}
function feedSteps(S) {
  const times = ['06:00','12:00','18:00'], labels = ['Sabah','Öğle','Akşam'];
  return `<div class="step-line"><i class="${S.feedSlots[0] ? 'on' : ''}"></i><i class="${S.feedSlots[1] ? 'on' : ''}"></i></div>` +
    times.map((t,i) => {
      const st = feedSlotState(S,i);
      const em = st === 'done' ? (S.feedSlotTimes[i] != null ? timeStr(S.feedSlotTimes[i]) : 'Tamam') : st === 'current' ? 'Şimdi' : st === 'late' ? 'Gecikti' : st === 'missed' ? 'Kaçtı' : 'Bekliyor';
      return `<div class="step ${st}"><span class="node">${icon('i-check')}</span><b>${t}</b><small>${labels[i]}</small><em>${em}</em></div>`;
    }).join('');
}
function animalUpgradeCard(S) {
  const lv = zoneLevel(S,'animal'), max = lv >= MAX_LEVEL, cost = zoneUpgradeCost('animal',lv), can = S.money >= cost;
  return `<div class="au-main"><small>Ahır seviyesi ${lv}</small><b>Daha büyük sürü, daha çok üretim</b><span>${max ? 'Ahır maksimum seviyede.' : '+2 inek · +3 tavuk · +1 koyun · +1 keçi · +%12 üretim'}</span></div><span class="au-level">Sv. ${lv}</span>${max ? `<button class="btn small max" disabled>${icon('i-check-circle')} Maks</button>` : `<button class="btn gold small" data-action="upgrade" data-zone="animal" ${can ? '' : 'disabled'}>${icon('i-arrow-up')} ${money(cost)}</button>`}`;
}
function cowSheet(S, cat, idx) {
  const a = ANIMALS[cat], list = herdSamples(S,cat), s = list.find(x => x.i === idx) || list[0];
  if (!s) return '';
  const prod = S.animals[cat].production, due = dueFeedSlot(S), canFeed = due >= 0 && S.feed >= feedCost(S);
  return `<div class="drag"></div>
    <div class="cow-sheet-head"><span class="cow-avatar"><svg viewBox="0 0 64 64"><use href="#${a.art}"/></svg></span><div><b>${s.name}</b><small>${s.breed} · ${s.age} yaş · ${a.one}</small></div><span class="cow-health">${icon('i-shield')} %${s.health}</span></div>
    <div class="sheet-stats"><div class="statbox"><small>Günlük verim</small><b>${qty(s.prod)} ${a.unit}</b></div><div class="statbox"><small>Biriken</small><b>${qty(prod)} ${a.unit}</b></div><div class="statbox"><small>Sağlık</small><b>%${s.health}</b></div></div>
    <p class="sheet-note">${s.name} ${S.animals[cat].health >= 92 ? 'çok sağlıklı ve mutlu görünüyor.' : 'biraz yorgun; düzenli beslenmeye ihtiyacı var.'} ${weatherOf(S).name} havada verim %${Math.round(weatherOf(S).animal * 100)} seviyesinde.</p>
    <div class="cow-sheet-actions"><button class="btn ghost" data-action="feed" ${canFeed ? '' : 'disabled'}>${icon('i-wheat')} Yem Ver</button><button class="btn primary" data-action="collect-cat" data-cat="${cat}" ${prod >= .05 ? '' : 'disabled'}>${icon('i-box')} Ürünleri Topla</button></div>`;
}

/* ---------- pazar ---------- */
function trendText(t) { return t === 'up' ? '▲ Yükseliş' : t === 'down' ? '▼ Düşüş' : '• Sabit'; }
function marketRows(S) {
  const raw = MARKET_KEYS.map(k => marketRow(S,k));
  const crafted = CRAFTED_KEYS.map(k => marketRow(S,k,true));
  const craftedAny = CRAFTED_KEYS.some(k => (S.inventory[k] || 0) >= .01);
  return raw.join('') + `<div class="market-section-h">Fabrika ürünleri · işlenmiş</div>` + (crafted.length ? crafted.join('') : '') +
    (craftedAny ? '' : `<div class="market-empty empty-state market-craft-hint">${icon('i-factory')} Fabrikada üretim yap; işlenmiş ürünler burada daha yüksek fiyata satılır.</div>`);
}
function marketRow(S,k,crafted){
  const m = productMeta(k), inv = S.inventory[k] || 0, p = marketPrice(S,k), t = priceTrend(S,k);
  return `<div class="market-row ${crafted ? 'crafted-row' : ''}"><span class="tile ${m.tile}">${icon(m.icon)}</span><div class="mr-main"><b>${m.name}</b><small>${m.desc}</small><span class="mr-stock">Stok: ${qty(inv)} ${m.unit}${crafted ? ' · Fabrika' : ''}</span></div><div class="mr-price"><b>${money(p)}</b><small class="price-${t}">${trendText(t)}</small></div><button class="btn sell" data-action="sell" data-item="${k}" ${inv < .01 ? 'disabled' : ''}>Sat</button></div>`;
}
function supplyRows(S) {
  const rows = [
    { key:'feed', name:'Çiftlik Yemi', icon:'i-wheat', tile:'wheat', amount:S.feed, cap:feedCap(S), unit:'kg', price:100, add:'+25 kg' },
    { key:'energy', name:'Enerji Paketi', icon:'i-bolt', tile:'peach', amount:S.energy, cap:energyCap(S), unit:'enerji', price:120, add:'+20 enerji' },
    { key:'water', name:'Su Tankeri', icon:'i-drop', tile:'lav', amount:S.water, cap:waterCap(S), unit:'L', price:40, add:'+1.000 L' }
  ];
  return rows.map(r => {
    const full = r.amount >= r.cap, can = !full && S.money >= r.price;
    return `<div class="supply-card"><span class="tile ${r.tile}">${icon(r.icon)}</span><div class="sc-main"><b>${r.name}</b><small>${fmt(r.amount)} / ${fmt(r.cap)} ${r.unit} · ${r.add}</small></div><button class="btn ${full ? 'ghost' : 'gold'}" data-action="buy" data-buy="${r.key}" ${can ? '' : 'disabled'}>${full ? 'Dolu' : money(r.price)}</button></div>`;
  }).join('');
}
function orderRows(S) {
  if (!S.orders || !S.orders.length) return `<div class="market-empty empty-state">${icon('i-truck')}Bugün sipariş yok. Yarın yeni alıcılar gelecek.</div>`;
  return S.orders.map(o => {
    const m = MARKET[o.item], inv = S.inventory[o.item] || 0, can = inv >= o.qty && !o.delivered;
    return `<div class="order-card ${o.delivered ? 'done' : ''}"><div class="order-top"><span class="order-buyer">${icon('i-user')}</span><b>${o.buyer}</b><span class="order-reward">${money(o.reward)}</span></div><div class="order-body"><span class="tag">${icon(m.icon)} ${m.name}</span><span class="tag">${fmt(o.qty)} ${m.unit}</span><span class="tag">Stok: ${qty(inv)}</span>${o.delivered ? `<span class="order-done">${icon('i-check-circle')} Teslim edildi</span>` : `<button class="btn primary" data-action="deliver" data-order="${o.id}" ${can ? '' : 'disabled'}>Teslim Et</button>`}</div></div>`;
  }).join('');
}
function marketContent(S) {
  if (S.marketTab === 'supply') return `<div class="market-section-h">Tedarik · kasadan al</div>${supplyRows(S)}<p class="market-note">Yem, enerji ve su çiftliğin can damarı. Fiyatlar hava durumuna göre değişmez; stoklar sınırlıdır.</p>`;
  if (S.marketTab === 'orders') return `<div class="market-section-h">Günün siparişleri · daha yüksek fiyat</div>${orderRows(S)}<p class="market-note">Siparişler her gün yenilenir. Teslim ettiğinde ürünler envanterden düşer ve ödeme anında kasaya girer.</p>`;
  const any = ALL_PRODUCT_KEYS.some(k => (S.inventory[k] || 0) >= .01);
  return `<div class="market-section-h">Ürünlerin · güncel fiyat</div>${marketRows(S)}<button class="btn soft wide" data-action="sellAll" ${any ? '' : 'disabled'}>${icon('i-coin')} Tüm ürünleri sat</button><p class="market-note">Fiyatlar hava durumu, sezon ve depo seviyesine göre değişir. Fabrika ürünleri işlenmiş olduğu için daha yüksek fiyat taşır.</p>`;
}

/* ---------- fabrikalar ---------- */
function factoryRecipeRow(S, fid, r) {
  const st = factoryState(S, fid), def = FACTORY_DEFS[fid];
  const full = st.jobs.length >= st.slots;
  const missing = Object.keys(r.need).some(k => (S.inventory[k] || 0) < r.need[k]);
  const can = !full && !missing;
  const outMeta = productMeta(Object.keys(r.out)[0]) || { tile:def.tile };
  const label = full ? 'Kuyruk dolu' : missing ? 'Malzeme eksik' : 'Üret';
  return `<div class="factory-recipe ${can ? '' : 'is-disabled'}">
    <span class="tile ${outMeta.tile || def.tile}">${icon(r.icon)}</span>
    <div class="fr-main"><b>${r.name}</b><small>${factoryNeedText(r.need)}</small><span class="fr-meta">${etaText(r.time)} · ${factoryOutText(r.out)} · +${r.xp} XP</span></div>
    <button class="btn small ${can ? 'gold' : 'ghost'}" data-action="factory-start" data-factory="${fid}" data-recipe="${r.id}" ${can ? '' : 'disabled'}>${icon(can ? 'i-play' : 'i-lock')}<span>${label}</span></button>
  </div>`;
}
function factoryJobRow(S, fid, job) {
  const r = factoryRecipe(fid, job.recipe) || { name:'Üretim', icon:'i-factory' };
  const p = Math.round(factoryJobPct(S, job)), left = factoryJobLeft(S, job);
  return `<div class="factory-job ${job.done ? 'done' : ''}">
    <span class="tile ${job.done ? 'mint' : 'wheat'}">${icon(job.done ? 'i-check-circle' : r.icon)}</span>
    <div class="fj-main"><b>${r.name}</b><small>${job.done ? 'Hazır · ürünü depoya al' : 'Kalan ' + etaText(left)}</small><span class="fj-bar"><i data-fjob="${fid}:${job.id}" style="width:${p}%"></i></span></div>
    ${job.done ? `<button class="btn small primary" data-action="factory-collect" data-factory="${fid}" data-job="${job.id}">${icon('i-box')} Topla</button>` : `<span class="fj-pct" data-fpct="${fid}:${job.id}">%${p}</span>`}
  </div>`;
}
function factoryCard(S, id) {
  const def = FACTORY_DEFS[id], st = factoryState(S, id), unlocked = factoryUnlocked(S, id);
  if (!unlocked) {
    const can = S.money >= def.unlockCost;
    return `<div class="card factory-card factory-locked" data-factory-card="${id}">
      <div class="factory-head"><span class="tile ${def.tile}">${icon(def.icon)}</span><div class="fh-main"><b>${def.name}</b><small>${def.desc}</small></div><span class="factory-lock">${icon('i-lock')}</span></div>
      <div class="factory-locked-note">${icon('i-factory')} Bu fabrika kapalı. Açtığında ${factoryRecipes(id).length} farklı ürün üretebilirsin.</div>
      <div class="factory-lock-foot"><span><small>Açılış</small><b>${money(def.unlockCost)}</b></span><button class="btn gold" data-action="factory-unlock" data-factory="${id}" ${can ? '' : 'disabled'}>${icon('i-unlock')} Fabrikayı Aç</button></div>
    </div>`;
  }
  const slots = st.slots, jobs = st.jobs || [], done = jobs.filter(j => j.done).length;
  const slotCost = factorySlotCost(S, id), canSlot = slots < FACTORY_MAX_SLOTS && S.money >= slotCost;
  return `<div class="card factory-card" data-factory-card="${id}">
    <div class="factory-head"><span class="tile ${def.tile}">${icon(def.icon)}</span><div class="fh-main"><b>${def.name}</b><small>${def.desc}</small></div><span class="pill mint">${icon('i-factory')} Açık</span></div>
    <div class="factory-bar"><span>Kuyruk <b>${jobs.length}/${slots}</b></span><span>${done ? done + ' hazır' : 'Üretim hattı hazır'}</span></div>
    <div class="factory-jobs">${jobs.length ? jobs.map(j => factoryJobRow(S,id,j)).join('') : `<div class="factory-empty">${icon('i-clock')} Kuyruk boş. Aşağıdaki tariflerden birini seç.</div>`}</div>
    <div class="factory-actions">
      <button class="btn ghost small" data-action="factory-collect-all" data-factory="${id}" ${done ? '' : 'disabled'}>${icon('i-box')} Hazırları Topla</button>
      <button class="btn small soft" data-action="factory-slot" data-factory="${id}" ${canSlot ? '' : 'disabled'}>${icon('i-plus')} ${slots >= FACTORY_MAX_SLOTS ? 'Kuyruk maks.' : 'Yuva Aç · ' + money(slotCost)}</button>
    </div>
    <div class="factory-recipes-head"><b>Üretim tarifleri</b><span>${factoryRecipes(id).length} tarif · farklı malzemeler</span></div>
    <div class="factory-recipes">${factoryRecipes(id).map(r => factoryRecipeRow(S,id,r)).join('')}</div>
  </div>`;
}
function factoryContent(S) {
  const open = factoryOpenCount(S), jobs = FACTORY_KEYS.reduce((a,k) => a + factoryState(S,k).jobs.length, 0);
  return `<div class="factory-summary card"><div><small>Açık fabrika</small><b>${open} / ${FACTORY_KEYS.length}</b></div><div><small>Kuyruktaki iş</small><b>${jobs}</b></div><div><small>Ustabaşı</small><b>${S.stats.crafted || 0}</b></div></div>
    <div class="factory-tip">${icon('i-sparkle')} Fabrikalar hammaddeyi işler; ürünler pazarda daha yüksek fiyata satılır. Kuyruk yuvası açmak ve fabrika kurmak kasadan para harcar.</div>
    ${FACTORY_KEYS.map(id => factoryCard(S,id)).join('')}`;
}

/* ---------- görevler / günlük ---------- */
function questRow(q, S) {
  const pct = Math.min(100, q.progress / q.target * 100), done = q.progress >= q.target;
  const val = q.type === 'earn' ? `${fmt(Math.min(q.progress,q.target))} / ${fmt(q.target)} ₺` : `${fmt(Math.min(q.progress,q.target))} / ${fmt(q.target)}`;
  return `<div class="quest-row"><span class="quest-ic">${icon(q.icon)}</span><div class="quest-main"><b>${q.name}</b><small>${q.desc} · ${val}</small><div class="quest-prog"><span class="xpbar"><i style="width:${pct}%"></i></span><span>%${Math.round(pct)}</span></div></div><span class="quest-reward">${money(q.reward)}</span>${q.claimed ? `<span class="quest-claim done">Alındı</span>` : `<button class="quest-claim" data-action="claim-quest" data-quest="${q.id}" ${done ? '' : 'disabled'}>Al</button>`}</div>`;
}
function questSheet(S) {
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Günlük Görevler</h2><p>Her gün 3 yeni görev. Tamamla, ödülü kap.</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div><div class="quests-card" style="padding:0">${S.quests.map(q => questRow(q,S)).join('')}</div><p class="sheet-note">Görevler oyun günü değiştiğinde yenilenir. Ödüller anında kasaya ve XP'ye eklenir.</p>`;
}
function dailyCard(S) {
  const av = dailyAvailable(S), pos = dailyPos(S), reward = DAILY_REWARDS[pos];
  if (av) {
    return `<span class="daily-gift">${icon('i-gift')}</span><span class="daily-main"><b>Bugünün ödülü hazır!</b><small>Gerçek gün serisi: ${S.daily.streak} · ${reward.label}</small></span><span class="daily-cta">Al</span><span class="daily-dot"></span>`;
  }
  return `<span class="daily-gift">${icon('i-check-circle')}</span><span class="daily-main"><b>Bugünkü ödül alındı</b><small>Yarın yeni ödül seni bekliyor.</small></span><span class="daily-cta">Yarın</span>`;
}
function dailySheet(S) {
  const av = dailyAvailable(S), pos = dailyPos(S);
  const fresh = !S.daily.lastClaimedDate || (S.daily.lastClaimedDate !== dateKey() && S.daily.lastClaimedDate !== yesterdayKey());
  const claimed = fresh ? 0 : av ? (S.daily.streak % 7) : (S.daily.streak % 7 || 7);
  const boxes = DAILY_REWARDS.map((r,i) => {
    const isClaimed = i < claimed, isCurrent = av && i === pos && !isClaimed;
    return `<div class="daily-box ${isClaimed ? 'claimed' : ''} ${isCurrent ? 'current' : ''} ${!isClaimed && !isCurrent ? 'locked' : ''}"><span class="db-day">${i + 1}. Gün</span><span class="db-ic">${icon(isClaimed ? 'i-check-circle' : 'i-gift')}</span><b>${r.money} ₺${r.feed ? ' + ' + r.feed + ' kg' : ''}${r.energy ? ' + ' + r.energy + '⚡' : ''}</b>${isClaimed ? `<span class="db-check">${icon('i-check')}</span>` : ''}</div>`;
  }).join('');
  const reward = DAILY_REWARDS[pos];
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Günlük Ödül</h2><p>Gerçek gün serisi: ${S.daily.streak} · ${av ? 'Bugünkü ödül hazır' : 'Yarın tekrar gel'}</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div><div class="daily-sheet">${boxes}</div><div class="sheet-actions">${av ? `<button class="btn primary" data-action="claim-daily">${icon('i-gift')} Ödülü Al · ${reward.label}</button>` : `<button class="btn ghost" disabled>${icon('i-clock')} Yarın yeni ödül</button>`}</div><p class="sheet-note">Ödüller oyun gününe göre değil, gerçek takvim gününe göre yenilenir. Her gün dönüp alırsan seri büyür; 7 günde bir büyük ödül gelir.</p>`;
}
function achievementRows(S) {
  return ACHIEVEMENTS.map(a => {
    const done = !!(S.achievements && S.achievements[a.id]), g = a.goal(S);
    return `<div class="ach-row ${done ? 'unlocked' : ''}"><span class="ach-ic">${icon(a.icon)}</span><div class="ach-main"><b>${a.name}</b><small>${a.desc}${done ? '' : ' · ' + fmt(g[0]) + '/' + fmt(g[1])}</small></div><span class="ach-reward">${done ? 'Alındı' : money(a.reward)}</span>${done ? `<span class="ach-check">${icon('i-check')}</span>` : `<span class="ach-lock">${icon('i-lock')}</span>`}</div>`;
  }).join('');
}

/* ================= ONLINE/SOCIAL FEATURES ================= */
const FRIENDS = [
  {id:'friend_1', name:'Ahmet Çiftçi', level:12, farm:'Güneşli Çiftlik', avatar:'👨‍🌾', lastVisit:'2 saat önce', online:true, gifts:['seed','fertilizer']},
  {id:'friend_2', name:'Ayşe Yıldız', level:8, farm:'Yeşil Bahçe', avatar:'👩‍🌾', lastVisit:'5 saat önce', online:false, gifts:['water']},
  {id:'friend_3', name:'Mehmet Demir', level:15, farm:'Demir Çiftliği', avatar:'👨‍🌾', lastVisit:'1 gün önce', online:true, gifts:['fertilizer','seed']},
  {id:'friend_4', name:'Fatma Kaya', level:10, farm:'Kaya Çiftliği', avatar:'👩‍🌾', lastVisit:'3 saat önce', online:true, gifts:['water','fertilizer']},
  {id:'friend_5', name:'Ali Vural', level:22, farm:'Vural Farm', avatar:'👨‍🌾', lastVisit:'30 dk önce', online:true, gifts:['seed','water','fertilizer']},
];

const LEADERBOARD = [
  {rank:1, name:'MasterFarmer', level:50, money:1250000, farm:'Altın Vadisi', avatar:'🏆'},
  {rank:2, name:'GreenThumb', level:45, money:980000, farm:'Yeşil Vadi', avatar:'🥈'},
  {rank:3, name:'FarmMaster', level:42, money:875000, farm:'Yeşil Vadisi', avatar:'🥉'},
  {rank:4, name:'CropKing', level:38, money:720000, farm:'Mahsul Krallığı', avatar:'👑'},
  {rank:5, name:'FarmPro', level:35, money:650000, farm:'Pro Çiftlik', avatar:'⭐'},
  {rank:6, name:'HarvestHero', level:32, money:580000, farm:'Hasat Kahramanı', avatar:'🌾'},
  {rank:7, name:'CropMaster', level:30, money:520000, farm:'Mahsul Ustası', avatar:'🌱'},
  {rank:8, name:'GreenFarmer', level:28, money:480000, farm:'Yeşil Çiftçi', avatar:'🌿'},
  {rank:9, name:'SeedSower', level:25, money:410000, farm:'Tohum Ekimci', avatar:'🌱'},
  {rank:10, name:'FarmRookie', level:22, money:350000, farm:'Yeni Çiftlik', avatar:'🌿'},
];

const EVENTS = [
  {id:'harvest_festival', name:'Hasat Festivali', desc:'Tüm hasatlar %50 daha fazla verir!', duration:3, reward:{money:5000, xp:1000}, icon:'🎉', active:false},
  {id:'rain_week', name:'Yağmurlu Hafta', desc:'Su kullanımı %50 azalır, hasat %20 artar', duration:7, reward:{water:5000, xp:500}, icon:'🌧️', active:false},
  {id:'double_xp', name:'Çift XP Haftası', desc:'Tüm aktivitelerden çift XP kazanırsınız', duration:3, reward:{xp:2000}, icon:'⚡', active:false},
  {id:'market_boom', name:'Pazar Boom', desc:'Tüm satış fiyatları %30 artar', duration:2, reward:{money:10000}, icon:'📈', active:false},
  {id:'animal_joy', name:'Hayvan Şenliği', desc:'Hayvan sağlığı %20 artar, üretim %25 artar', duration:4, reward:{feed:1000, xp:800}, icon:'🐄', active:false},
];

const SOCIAL_ACTIONS = [
  {id:'visit', name:'Ziyaret Et', desc:'Arkadaş çiftliğini ziyaret et', reward:{xp:50, money:200}, icon:'👋'},
  {id:'gift', name:'Hediye Gönder', desc:'Arkadaşına hediye gönder', reward:{xp:30, money:100}, icon:'🎁'},
  {id:'help', name:'Yardım Et', desc:'Arkadaşının çiftliğinde yardım et', reward:{xp:100, money:500}, icon:'🤝'},
  {id:'trade', name:'Ticaret Yap', desc:'Arkadaşınla ürün ticareti yap', reward:{xp:50, money:300}, icon:'🤝'},
];

const ONLINE_FEATURES = {
  leaderboard:{name:'Liderlik Tablosu', desc:'Dünya sıralamasında yerinizi görün', icon:'🏆', unlocked:true},
  friends:{name:'Arkadaşlar', desc:'Arkadaşlarınızı ziyaret edin, hediye gönderin', icon:'👥', unlocked:true},
  events:{name:'Etkinlikler', desc:'Aktif etkinliklere katılın, ödül kazanın', icon:'🎪', unlocked:true},
  coop:{name:'Kooperatif', desc:'Arkadaşlarınızla kooperatif kurun', icon:'🤝', unlocked:false, reqLevel:15},
  trade:{name:'Global Pazar', desc:'Dünya çapında ticaret yapın', icon:'🌍', unlocked:false, reqLevel:20},
  chat:{name:'Sohbet', desc:'Arkadaşlarınızla sohbet edin', icon:'💬', unlocked:false, reqLevel:10},
};

const FRIEND_INTERACTIONS = {
  visit:{xp:50, money:200, cooldown:3600},
  gift:{xp:30, money:100, cooldown:7200},
  help:{xp:100, money:500, cooldown:14400},
  trade:{xp:50, money:300, cooldown:10800},
};

function renderFriends(S){
  const onlineCount = FRIENDS.filter(f => f.online).length;
  return `
    <div class="friends-header">
      <h3>${icon('i-users')} Arkadaşlar <span class="badge">${FRIENDS.length}</span><span class="badge online">${onlineCount} çevrimiçi</span></h3>
    </div>
    <div class="friends-list">
      ${FRIENDS.map(f => `
        <div class="friend-card ${f.online ? 'online' : 'offline'}" data-friend="${f.id}">
          <span class="friend-avatar">${f.avatar}</span>
          <div class="friend-info">
            <div class="friend-name">${f.name} <span class="level-badge">Seviye ${f.level}</span></div>
            <div class="friend-farm">${f.farm}</div>
            <div class="friend-status">
              <span class="status-dot ${f.online ? 'online' : 'offline'}"></span>
              <span>${f.online ? 'Çevrimiçi' : 'Son giriş: ' + f.lastVisit}</span>
            </div>
          </div>
          <div class="friend-actions">
            ${SOCIAL_ACTIONS.map(a => `
              <button class="btn small ${a.id === 'visit' ? 'primary' : 'ghost'}" 
                data-action="friend-${a.id}" data-friend="${f.id}" 
                ${f.online ? '' : a.id !== 'gift' ? 'disabled' : ''}>
                ${icon(a.id === 'visit' ? 'i-user' : a.id === 'gift' ? 'i-gift' : a.id === 'help' ? 'i-help' : 'i-trade')}
                ${a.name}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div class="friend-card add-friend-card">
        <span class="friend-avatar add-avatar">+</span>
        <div class="friend-info">
          <div class="friend-name">Arkadaş Ekle</div>
          <div class="friend-farm">Kod veya ID ile arkadaş ekle</div>
        </div>
        <button class="btn small primary" data-action="add-friend">${icon('i-plus')} Ekle</button>
      </div>
    </div>
  `;
}
function renderLeaderboard(S){
  return `
    <div class="leaderboard-header">
      <h3>${icon('i-trophy')} Liderlik Tablosu</h3>
      <div class="player-rank">Sizin Sıralamanız: #${Math.max(1, Math.floor(1000 / Math.max(1, S.level * 10)))}</div>
    </div>
    <div class="leaderboard-list">
      ${LEADERBOARD.map(p => `
        <div class="leaderboard-row ${S.profile.name === p.name ? 'you' : ''}" data-rank="${p.rank}">
          <span class="rank-badge">${p.rank <= 3 ? '🥇🥈🥉'.charAt(p.rank-1) : '#' + p.rank}</span>
          <span class="player-avatar">${p.avatar}</span>
          <div class="player-info">
            <div class="player-name">${p.name} ${p.name === S.profile.name ? '<span class="you-badge">Siz</span>' : ''}</div>
            <div class="player-farm">${p.farm}</div>
          </div>
          <div class="player-stats">
            <span class="stat"><b>${p.level}</b> seviye</span>
            <span class="stat"><b>${fmt(p.money)}</b> ₺</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
function renderEvents(S){
  const activeEvents = EVENTS.filter(e => e.active);
  const upcomingEvents = EVENTS.filter(e => !e.active);
  return `
    <div class="events-header">
      <h3>${icon('i-calendar')} Etkinlikler</h3>
      <span class="badge">${activeEvents.length} aktif</span>
    </div>
    ${activeEvents.length ? `
      <div class="events-active">
        <h4>${icon('i-fire')} Aktif Etkinlikler</h4>
        ${activeEvents.map(e => `
          <div class="event-card active" data-event="${e.id}">
            <span class="event-icon">${e.icon}</span>
            <div class="event-info">
              <h4>${e.name}</h4>
              <p>${e.desc}</p>
              <div class="event-reward">${e.reward.money ? money(e.reward.money) + ' ₺' : ''} ${e.reward.xp ? e.reward.xp + ' XP' : ''} ${e.reward.water ? e.reward.water + ' L su' : ''} ${e.reward.feed ? e.reward.feed + ' kg yem' : ''}</div>
            </div>
            <span class="event-time">${e.duration} gün kaldı</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
    ${upcomingEvents.length ? `
      <div class="events-upcoming">
        <h4>${icon('i-clock')} Yaklaşan Etkinlikler</h4>
        ${upcomingEvents.map(e => `
          <div class="event-card upcoming" data-event="${e.id}">
            <span class="event-icon">${e.icon}</span>
            <div class="event-info">
              <h4>${e.name}</h4>
              <p>${e.desc}</p>
              <div class="event-reward">${e.reward.money ? money(e.reward.money) + ' ₺' : ''} ${e.reward.xp ? e.reward.xp + ' XP' : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}
function renderOnline(S){
  return `
    <div class="online-tabs">
      <button class="tab-btn active" data-action="online-tab" data-online-tab="leaderboard">${icon('i-trophy')} Liderlik</button>
      <button class="tab-btn" data-action="online-tab" data-online-tab="friends">${icon('i-users')} Arkadaşlar</button>
      <button class="tab-btn" data-action="online-tab" data-online-tab="events">${icon('i-calendar')} Etkinlikler</button>
      <button class="tab-btn" data-action="online-tab" data-online-tab="features">${icon('i-globe')} Özellikler</button>
    </div>
    <div class="online-content" id="onlineContent">
      ${renderLeaderboard(S)}
    </div>
  `;
}
function renderOnlineFeatures(S){
  return `
    <div class="features-grid">
      ${Object.entries(ONLINE_FEATURES).map(([key, f]) => `
        <div class="feature-card ${f.unlocked ? '' : 'locked'}" data-feature="${key}">
          <span class="feature-icon">${f.icon}</span>
          <h4>${f.name}</h4>
          <p>${f.desc}</p>
          ${!f.unlocked ? `<span class="lock-badge">Seviye ${f.reqLevel} gerekli</span>` : `<button class="btn small primary" data-action="online-feature" data-online-feature="${key}">${icon('i-play')} Aç</button>`}
        </div>
      `).join('')}
    </div>
  `;
}

/* ================= BANK FUNCTIONS ================= */
function renderBank(S){
  const c = S.credit || { active:false, principal:0, interest:0, dueDay:0, totalPaid:0, lastInterestDay:0 };
  const maxLoan = Math.max(1000, Math.floor(S.money * 5));
  const interestRate = 0.02;
  if (!c.active){
    return `
      <div class="bank-card">
        <div class="bank-card-header"><h3>Kredi Başvurusu</h3><span class="badge">Yeni</span></div>
        <div class="bank-info-row"><span class="bank-info-label">Maksimum Kredi</span><span class="bank-info-value">${money(maxLoan)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Faiz Oranı</span><span class="bank-info-value">%${Math.round(interestRate*100)} / gün</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Vade</span><span class="bank-info-value">30 gün</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Günlük Faiz</span><span class="bank-info-value negative">${money(Math.floor(maxLoan * interestRate))} / gün</span></div>
      <div class="bank-loan-form">
        <div class="input-group"><label>Kredi Miktarı (₺)</label><input type="number" id="loanAmount" min="1000" max="${maxLoan}" step="100" placeholder="Örn: 10000"></div>
        <div class="hint">En fazla ${money(maxLoan)} kredi çekebilirsiniz. Günlük faiz %2. Vade 30 gün.</div>
      </div>
      <div class="bank-actions"><button class="btn primary" data-action="take-loan">${icon('i-bank')} Kredi Çek</button></div>
    </div>
    `;
  }
  const remaining = c.principal + c.interest - c.totalPaid;
  const daysLeft = Math.max(0, c.dueDay - S.day);
  const progress = c.principal > 0 ? Math.min(100, (c.totalPaid / (c.principal + c.interest)) * 100) : 0;
  const dailyInterest = Math.floor(c.principal * 0.02);
  return `
    <div class="bank-card">
      <div class="bank-card-header"><h3>Aktif Kredi</h3><span class="badge ${daysLeft > 0 ? 'active' : 'danger'}">${daysLeft > 0 ? 'Aktif' : 'Gecikmiş'}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Ana Para</span><span class="bank-info-value">${money(c.principal)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Biriken Faiz</span><span class="bank-info-value negative">${money(c.interest)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Toplam Borç</span><span class="bank-info-value negative">${money(c.principal + c.interest)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Ödenen</span><span class="bank-info-value positive">${money(c.totalPaid)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Kalan</span><span class="bank-info-value">${money(remaining)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Vade</span><span class="bank-info-value">${daysLeft > 0 ? daysLeft + ' gün' : 'Geçti'}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Günlük Faiz</span><span class="bank-info-value negative">${money(dailyInterest)} / gün</span></div>
      <div class="bank-progress"><i style="width:${progress}%"></i></div>
      <div class="bank-actions">
        <button class="btn primary" data-action="repay-loan">${icon('i-coin')} Öde (${money(Math.min(remaining, S.money))})</button>
        <button class="btn ghost small" data-action="repay-all">${icon('i-coin')} Tümünü Öde</button>
      </div>
    </div>
    <div class="bank-card">
      <div class="bank-card-header"><h3>Kredi Hesaplayıcı</h3></div>
      <div class="bank-info-row"><span class="bank-info-label">Miktar</span><span class="bank-info-value">${money(maxLoan)}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Günlük Faiz</span><span class="bank-info-value">${money(Math.floor(maxLoan * 0.02))}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">30 Gün Toplam Faiz</span><span class="bank-info-value">${money(Math.floor(maxLoan * 0.02 * 30))}</span></div>
      <div class="bank-info-row"><span class="bank-info-label">Toplam Geri Ödeme</span><span class="bank-info-value">${money(maxLoan + Math.floor(maxLoan * 0.02 * 30))}</span></div>
    </div>
  `;
}

/* ---------- bildirim / hava / yardım ---------- */
function notificationRows(S) {
  const list = (S.notifications || []).slice(0, 30);
  if (!list.length) return `<div class="notice-empty">Bildirim yok. Çiftlik sakin.</div>`;
  return list.map(n => `<div class="notice-row ${n.read ? '' : 'unread'}"><span class="notice-ic">${icon(n.icon || 'i-bell')}</span><div class="notice-main"><b>${n.title}</b><small>${n.text} · ${n.time}</small></div></div>`).join('');
}
function notificationsSheet(S) {
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Bildirimler</h2><p>${unreadCount(S)} okunmamış bildirim</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div>${notificationRows(S)}<div class="sheet-actions"><button class="btn ghost" data-action="mark-read">${icon('i-check-circle')} Tümünü okundu işaretle</button></div>`;
}
function weatherSheet(S) {
  const w = weatherOf(S), t = tempOf(S), f = WEATHER[S.forecast], s = seasonOf(S);
  const effects = [
    { ic:'i-sprout', name:'Büyüme hızı', val:'%' + Math.round(w.growth * 100) },
    { ic:'i-cow', name:'Hayvan verimi', val:'%' + Math.round(w.animal * 100) },
    { ic:'i-bolt', name:'Güneş enerjisi', val:weatherSolarText(S) },
    { ic:'i-drop', name:'Yağmur', val:w.rain > 0 ? '+' + w.rain + ' L' : 'Yok' },
    { ic:'i-drop', name:'Su tüketimi', val:'%' + Math.round(w.waterUse * 100) }
  ];
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Hava Durumu</h2><p>${s.name} · Gün ${S.day} · ${timeStr(S.time)}</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div>
    <div class="weather-hero"><span class="wh-glyph">${icon(w.icon)}</span><div class="wh-main"><b>${w.name}</b><small>${w.desc}</small></div><span class="wh-temp">${t}°</span></div>
    <div class="weather-forecast">${icon(f.icon)}<b>Yarın: ${f.name}</b><small>${SEASONS[seasonIndex(S.day + 1)].name} · ${f.growth >= 1 ? 'iyi büyüme' : 'yavaş büyüme'}</small></div>
    <div class="sheet-section"><h3>Çiftliğe etkisi</h3><div class="effect-list">${effects.map(e => `<div class="effect-row">${icon(e.ic)} ${e.name}<b>${e.val}</b></div>`).join('')}</div></div>
    <p class="sheet-note">${w.rain > 0 ? 'Yağmur tüm tarlaları sular ve depoya su ekler.' : w.waterUse > 1.2 ? 'Sıcak hava suyu hızla tüketir; tarlaları erkenden sula.' : 'Hava; büyüme, enerji, hayvan verimi ve pazar fiyatlarını doğrudan etkiler.'}</p>`;
}
function helpSheet() {
  const steps = [
    { t:'Tarlayı ek, sula, hasat et', d:'Tarlaya dokun. Kuru toprakta büyüme yavaşlar; sula. Hasat ürünü depoya taşır.' },
    { t:'Hayvanları zamanında besle', d:'Besleme saatleri 06:00, 12:00 ve 18:00. Yem stoğun bitmesin; üretim düşer.' },
    { t:'Pazarda sat, çiftliği yükselt', d:'Ürünleri sat, bölgeleri yükselt. Her seviye verimi ve haritayı görünür şekilde değiştirir.' },
    { t:'Havayı ve görevleri takip et', d:'Yağmur, sıcak dalga ve kar; büyümeyi, suyu ve fiyatları etkiler. Günlük görevleri kaçırma.' }
  ];
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Nasıl Oynanır?</h2><p>Yeşil Vadi Çiftliği · tycoon rehberi</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div>
    <div class="tutorial-card"><span class="tc-ic">${icon('i-sprout')}</span><b>Küçük bir çiftlikten imparatorluğa</b><small>Her şey birbirine bağlı: toprak, su, enerji, hayvanlar, hava ve pazar. Doğru dengeyi kur, çiftliği büyüt.</small></div>
    <div class="help-steps">${steps.map((s,i) => `<div class="help-step"><span class="hs-num">${i + 1}</span><div><b>${s.t}</b><small>${s.d}</small></div></div>`).join('')}</div>
    <div class="sheet-section"><h3>Altın kurallar</h3><div class="effect-list"><div class="effect-row">${icon('i-drop')} Su olmadan tarla büyümez.<b>Düzenli sula</b></div><div class="effect-row">${icon('i-wheat')} Yem olmadan üretim düşer.<b>Stok tut</b></div><div class="effect-row">${icon('i-coin')} Yükseltmeler kalıcıdır.<b>Uzun vadeli düşün</b></div></div></div>
    <div class="sheet-actions"><button class="btn primary" data-action="tutorial">${icon('i-play')} Öğreticiyi Başlat</button></div>
    <p class="sheet-note">Oyun çevrimdışı çalışır; ilerlemen otomatik kaydedilir. Ana menüden devam edebilirsin.</p>`;
}
function tutorialSheet(step) {
  const steps = [
    { icon:'i-sprout', title:'Tarlayı canlandır', text:'Domates tarlasına dokun; suluysa hasat et. Kuruysa önce sula. Her hasat depoya ürün ve XP kazandırır.' },
    { icon:'i-cow', title:'Sürüyü besle', text:'Hayvanlar 06:00, 12:00 ve 18:00 beslenir. Yem stoğunu takip et; zamanında besle, üretim artsın.' },
    { icon:'i-tag', title:'Sat ve yükselt', text:'Pazarda ürünlerini sat, kazandığın parayla bölgeleri yükselt. Her seviye haritayı ve üretimi değiştirir.' }
  ];
  const s = steps[step] || steps[0];
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Çiftçi Okulu</h2><p>Adım ${step + 1} / 3</p></div><button class="sheet-close" data-action="close-sheet">${icon('i-close')}</button></div>
    <div class="tutorial-card"><span class="tc-ic">${icon(s.icon)}</span><b>${s.title}</b><small>${s.text}</small><div class="tut-dots">${steps.map((_,i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="sheet-actions">${step > 0 ? `<button class="btn ghost" data-action="tutorial-prev">Geri</button>` : `<button class="btn ghost" data-action="tutorial-skip">Atla</button>`}<button class="btn primary" data-action="${step >= 2 ? 'tutorial-done' : 'tutorial-next'}">${step >= 2 ? 'Başla!' : 'Devam'}</button></div>`;
}

/* ---------- dışa aktarım ---------- */
window.GVF = {
  MIN_PER_SEC, DAY_MIN, MAX_LEVEL, FARM_MAX_LEVEL, SAVE_KEY,
  ZONE, ZONE_KEYS, BOUNDS, BADGE_POS, READY_POS,
  WEATHER, SEASONS, CROPS, ANIMALS, ANIMAL_KEYS, MARKET, MARKET_KEYS,
  CRAFTED, CRAFTED_KEYS, ALL_PRODUCT_KEYS, FACTORY_DEFS, FACTORY_KEYS, FACTORY_MAX_SLOTS,
  ACHIEVEMENTS, QUEST_POOL, DAILY_REWARDS, BUYERS,
  icon, fmt, money, num, qty, timeStr, realText, etaText, clamp, nowAbs,
  seasonIndex, seasonOf, weatherOf, phaseOf, xpNeed, rankName,
  FIELD_INFO, fieldHectares, fieldExtraHectares, totalHectares, hectareText,
  zoneLevel, waterCap, energyCap, storageCap, feedCap, animalCount, totalAnimals, feedCost,
  isWatered, cropRate, growthLeft, cropYield, waterPct, energyPct, feedPct,
  animalAvgHealth, productionPct, cropHealth, farmHealth, farmHealthLabel, farmHealthNote,
  productMeta, invTotal, marketPrice, priceTrend, marketMood, dailyAvailable, dailyPos,
  dateKey, yesterdayKey,
  factoryState, factoryUnlocked, factoryRecipes, factoryRecipe, factorySlotCost, factoryOpenCount,
  factoryJobLeft, factoryJobPct, factoryNeedText, factoryOutText, factoryCanStart, factoryAnyDone,
  nextFeedSlot, dueFeedSlot, feedSlotState, missedFeeds, countReady, readyCrops,
  zoneStatus, statusClass, tempOf, weatherWaterText, weatherSolarText, dailyRewardFor,
  unreadCount, achievementCount, makeQuests, makeOrders, makeNotification,
  makeDefaultState, mergeState, mapOverlay, mapBadge, tractorMap, waterTowerMap, pipeLine,
  zoneUpgradeCost, nextLevelEffect, upgradePanel, detailButton,
  cropBody, houseBody, waterBody, storageBody, animalBody, overviewCard, zoneCard,
  prodLabel, prodIcon, herdSamples, cowCard, catCard, productionList, feedSteps,
  animalUpgradeCard, cowSheet, trendText, marketRows, supplyRows, orderRows, marketContent,
  factoryCard, factoryContent, factoryRecipeRow, factoryJobRow,
  questRow, questSheet, dailyCard, dailySheet, achievementRows,
  notificationRows, notificationsSheet, weatherSheet, helpSheet, tutorialSheet,
  FRIENDS, LEADERBOARD, EVENTS, SOCIAL_ACTIONS, ONLINE_FEATURES, FRIEND_INTERACTIONS,
  renderFriends, renderLeaderboard, renderEvents, renderOnline, renderOnlineFeatures, renderBank
};
})();
/* ================= Yeşil Vadi Çiftliği — oyun motoru ================= */
(function(){
'use strict';
const G = window.GVF;
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const Z = G.ZONE, CROPS = G.CROPS, ANIMALS = G.ANIMALS, MARKET = G.MARKET;
const ANIMAL_KEYS = G.ANIMAL_KEYS, MARKET_KEYS = G.MARKET_KEYS;
const CRAFTED = G.CRAFTED, CRAFTED_KEYS = G.CRAFTED_KEYS, ALL_PRODUCT_KEYS = G.ALL_PRODUCT_KEYS;
const FACTORY_DEFS = G.FACTORY_DEFS, FACTORY_KEYS = G.FACTORY_KEYS, FACTORY_MAX_SLOTS = G.FACTORY_MAX_SLOTS;
const STATIC = /(^|[?&])static(=|&|$)/.test(location.search);
const PARAMS = new URLSearchParams(location.search);
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
if (STATIC) document.documentElement.classList.add('static');

/* DOM'a yalnızca gerçekten değişen metni yaz. Aynı 250 ms'lik döngüde
   gereksiz layout/paint üretmemek, titremenin en büyük kaynağını keser. */
function setText(el, value){
  if (!el) return;
  const text = String(value);
  if (el._lastText === text) return;
  el._lastText = text;
  el.textContent = text;
}
function setHTML(el, value){
  if (!el) return;
  const html = String(value);
  if (el._lastHTML === html) return;
  el._lastHTML = html;
  el.innerHTML = html;
}
function setWidth(el, pct){
  if (!el) return;
  const value = Math.round(pct * 10) / 10 + '%';
  if (el._lastWidth === value) return;
  el._lastWidth = value;
  el.style.width = value;
}

/* ---------------- kayıt / durum ---------------- */
function readRawSave(){
  try { const raw = localStorage.getItem(G.SAVE_KEY); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}
const rawSave = readRawSave();
let hasSave = !!(rawSave && rawSave.version === 2);
let S = hasSave ? G.mergeState(rawSave) : G.makeDefaultState();
if (!S.lastSaved || S.lastSaved > Date.now() + 60000) S.lastSaved = Date.now();

let gameStarted = false;
let currentScreen = 'scr-home';
let farmZone = S.selectedZone || 'overview';
let detailZone = 'tomato';
let tutorialStep = 0;
let sheetKind = null, sheetData = null;
let confirmCb = null;
let audioCtx = null;
let lastFrame = Date.now(), lastSaveAt = Date.now(), lastUiAt = 0, lastAlertAt = 0;
let levelUpOpen = false;
let newReadyPulse = false;
let startVisible = false;
let offlineApplied = false;
let simPaused = false;
let setupOpen = false;
let setupAfterStart = false;
let factorySig = '';
let lastNativePlan = '';

const sig = { world:'', overlay:'', farm:'', homeQuest:'', daily:'', market:'', profile:'', live:'', feed:'', prod:'', cat:'', cows:'', ach:'', factory:'', worldClass:'' };
const phaseNames = { dawn:'Şafak', day:'Gündüz', dusk:'Akşam', night:'Gece' };

/* ---------------- minik yardımcılar ---------------- */
function toast(msg, type){
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('err', type === 'err');
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), type === 'err' ? 2600 : 2200);
}
function pulseWifi(){
  const w = $('#sbWifi');
  if (!w) return;
  w.classList.remove('saving');
  void w.offsetWidth;
  w.classList.add('saving');
}
function animateNumber(el, to, opts){
  if (!el) return;
  opts = opts || {};
  const suffix = opts.suffix == null ? '' : opts.suffix;
  if (STATIC || REDUCED) { el.textContent = Math.round(to) + suffix; el.dataset.val = Math.round(to); return; }
  cancelAnimationFrame(el._raf);
  const from = Number(el.dataset.val || 0), dur = opts.dur || 700, t0 = performance.now();
  function step(t){
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e) + suffix;
    if (p < 1) el._raf = requestAnimationFrame(step);
    else el.dataset.val = Math.round(to);
  }
  el._raf = requestAnimationFrame(step);
}
function setRing(el, val){
  if (!el) return;
  const v = G.clamp(Math.round(val), 0, 100);
  if (el.dataset.init && el.dataset.ring === String(v)) return;
  el.dataset.ring = v;
  const fill = $('.ring-fill', el), label = $('b', el);
  const len = el.classList.contains('mini-ring') ? 157 : 201;
  const first = !el.dataset.init;
  el.dataset.init = '1';
  if (fill){
    if (el.dataset.color) fill.style.stroke = el.dataset.color;
    if (first && !STATIC && !REDUCED){
      fill.style.strokeDashoffset = len;
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.strokeDashoffset = len * (1 - v / 100); }));
    } else {
      fill.style.strokeDashoffset = len * (1 - v / 100);
    }
  }
  if (label){
    if (first && !STATIC && !REDUCED) animateNumber(label, v, { suffix:'%', dur:1100 });
    else label.textContent = v + '%';
  }
}

/* ---------------- ses / titreşim ---------------- */
function ensureAudio(){
  if (STATIC || !S.sound) return null;
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function beep(kind){
  if (STATIC || !S.sound) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const seq = {
    tap:    [[620,0,.04,'sine',.025]],
    water:  [[420,0,.08,'sine',.03],[620,.06,.1,'sine',.025]],
    coin:   [[880,0,.06,'triangle',.035],[1180,.055,.09,'triangle',.03]],
    feed:   [[330,0,.07,'triangle',.03],[494,.06,.1,'triangle',.03]],
    success:[[523,0,.07,'sine',.035],[659,.07,.08,'sine',.03],[784,.14,.12,'sine',.03]],
    error:  [[220,0,.1,'square',.025],[176,.09,.12,'square',.02]],
    level:  [[523,0,.09,'triangle',.04],[659,.09,.09,'triangle',.035],[784,.18,.1,'triangle',.035],[1046,.28,.2,'triangle',.04]]
  }[kind] || [];
  const t0 = ctx.currentTime;
  seq.forEach(([f, at, dur, type, gain]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(gain, t0 + at + .012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0 + at); o.stop(t0 + at + dur + .02);
  });
}
function buzz(pattern){
  if (STATIC || !S.vibration || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch(e){}
}
function feedback(kind){
  beep(kind === 'tap' ? 'tap' : kind);
  if (kind === 'success' || kind === 'coin') buzz(12);
  else if (kind === 'error') buzz([18, 40, 18]);
  else if (kind === 'level') buzz([20, 50, 20, 50, 35]);
}

/* ---------------- kaydet / çevrimdışı ---------------- */
function saveState(force){
  if (STATIC) return;
  try {
    checkAchievements();
    const now = Date.now();
    S.lastSaved = now;
    S.lastSimAt = now;
    localStorage.setItem(G.SAVE_KEY, JSON.stringify(S));
    hasSave = true;
    lastSaveAt = now;
    pulseWifi();
    syncNativeNotifications();
  } catch(e){}
}
function snapshot(){
  let prod = 0;
  ANIMAL_KEYS.forEach(k => prod += S.animals[k].production);
  return { day:S.day, money:S.money, level:S.level, ready:G.countReady(S), prod:prod, water:S.water, feed:S.feed, energy:S.energy, factoryDone: factoryDoneCount() };
}
function factoryDoneCount(){
  return FACTORY_KEYS.reduce((a,id) => a + ((S.factories && S.factories[id] && S.factories[id].jobs) || []).filter(j => j.done).length, 0);
}
function applyOffline(){
  if (STATIC) return null;
  const source = S.lastSimAt || S.lastSaved || Date.now();
  const elapsedMs = Date.now() - source;
  /* Oyun arka planda da yaşar; uzun yokluklarda 72 saatlik güvenli sınır. */
  const capMs = 72 * 3600 * 1000;
  const sec = Math.min(Math.max(0, elapsedMs / 1000), capMs / 1000);
  if (sec < 1){ S.lastSimAt = Date.now(); return null; }
  const before = snapshot();
  advance(sec * G.MIN_PER_SEC, true);
  const after = snapshot();
  S.lastSimAt = Date.now();
  S.lastSaved = Date.now();
  saveState(true);
  if (sec >= 60){
    const ready = after.ready;
    const prod = Math.max(0, after.prod - before.prod);
    addNotification('Çiftlik seni bekledi', Math.round(sec / 60) + ' dakika boyunca çiftlik çalıştı. ' + (ready ? ready + ' tarla hasada hazır.' : 'Üretim devam etti.'), 'i-clock');
    return { sec:sec, minutes:sec * G.MIN_PER_SEC, before:before, after:after, ready:ready, prod:prod };
  }
  return { sec:sec, minutes:sec * G.MIN_PER_SEC, before:before, after:after, ready:after.ready, prod:Math.max(0, after.prod - before.prod) };
}
function offlineSheet(o){
  const mins = Math.max(1, Math.round(o.sec / 60));
  const time = mins >= 60 ? Math.floor(mins / 60) + ' sa ' + (mins % 60) + ' dk' : mins + ' dk';
  return `<div class="drag"></div><div class="sheet-head"><div class="sh-main"><h2>Çiftlik seni bekledi</h2><p>${time} boyunca çiftlik kendi kendine çalıştı.</p></div><button class="sheet-close" data-action="close-sheet">${G.icon('i-close')}</button></div>
    <div class="tutorial-card"><span class="tc-ic">${G.icon('i-sun')}</span><b>Gün ${o.after.day} · Seviye ${o.after.level}</b><small>${o.ready ? o.ready + ' tarla hasada hazır. Ürünleri topla, pazarda sat.' : 'Tarlalar büyümeye devam etti. Yeni günün planını yap.'}</small></div>
    <div class="stats3">
      <div class="statbox"><small>Hasada hazır</small><b>${o.ready}</b></div>
      <div class="statbox"><small>Biriken ürün</small><b>${G.qty(o.prod)}</b></div>
      <div class="statbox"><small>Kasa</small><b>${G.money(o.after.money)}</b></div>
    </div>
    <p class="sheet-note">Çevrimdışı ilerleme en fazla 72 saat birikir. Çiftliğini düzenli ziyaret et; ürünler depoda yer kaplar.</p>
    <div class="sheet-actions"><button class="btn primary" data-action="close-sheet">Çiftliğe Dön</button></div>`;
}

/* ---------------- zaman / büyüme ---------------- */
function addNotification(title, text, icon){
  const n = G.makeNotification('n' + Date.now() + Math.random().toString(36).slice(2,6), title, text, icon || 'i-bell', G.timeStr(S.time), false);
  S.notifications.unshift(n);
  if (S.notifications.length > 30) S.notifications.length = 30;
  updateBell();
  if (sheetKind === 'notifications') refreshSheet();
}
function nativeBridge(){
  return (typeof window !== 'undefined' && window.AndroidFarm) ? window.AndroidFarm : null;
}
function cancelNativeNotifications(force){
  const bridge = nativeBridge();
  if (!bridge) return;
  if (!force && lastNativePlan === '__off') return;
  if (typeof bridge.cancelAll === 'function'){ try { bridge.cancelAll(); } catch(e){} }
  lastNativePlan = '__off';
}
function syncNativeNotifications(force){
  const bridge = nativeBridge();
  if (STATIC || !bridge) return;
  if (!S.notificationsEnabled){ cancelNativeNotifications(); return; }
  try {
    const plan = buildNativePlan();
    const signature = JSON.stringify(plan);
    if (!force && signature === lastNativePlan) return;
    lastNativePlan = signature;
    if (typeof bridge.syncNotifications === 'function') bridge.syncNotifications(signature);
  } catch(e){}
}
function buildNativePlan(){
  const now = Date.now();
  const plan = [];
  const realAt = gameDelta => Math.round((now + Math.max(0, gameDelta) / G.MIN_PER_SEC * 1000) / 5000) * 5000;
  const add = (id, title, text, at, icon) => {
    if (!at || at <= now + 2500) return;
    if (at > now + 72 * 3600 * 1000) return;
    plan.push({ id:id, title:title, text:text, at:at, icon:icon || 'i-bell' });
  };
  const baseGame = G.nowAbs(S);
  /* Hasat zamanı */
  Object.keys(CROPS).forEach(k => {
    const z = S.zones[k];
    if (!z.planted || z.ready) return;
    const left = G.growthLeft(S,k);
    if (left > 0) add('harvest-' + k, Z[k].title + ' hazır olacak', 'Tarla yaklaşık ' + G.etaText(left) + ' sonra hasada hazır. Toplamayı unutma.', realAt(left), 'i-sprout');
  });
  /* Sıradaki besleme — geçmiş öğün için bildirim kurma; o an uygulamadaydın. */
  const feedTimes = [360,720,1080], feedLabels = ['sabah','öğle','akşam'];
  for (let i = 0; i < 3; i++){
    if (S.feedSlots[i]) continue;
    const targetAbs = S.day * G.DAY_MIN + feedTimes[i];
    if (targetAbs <= baseGame + 1) continue;
    add('feed-next', 'Hayvanları besle', 'Sürü ' + feedLabels[i] + ' öğününü bekliyor. Yem stoğu: ' + Math.round(S.feed) + ' kg.', realAt(targetAbs - baseGame), 'i-wheat');
    break;
  }
  /* Fabrika işleri */
  FACTORY_KEYS.forEach(id => {
    const st = G.factoryState(S,id), def = FACTORY_DEFS[id];
    st.jobs.forEach((job, i) => {
      if (job.done) return;
      const r = G.factoryRecipe(id, job.recipe) || { name:'Üretim' };
      const left = Math.max(0, (job.endsAt || 0) - baseGame);
      add('factory-' + id + '-' + (job.id || i), def.name + ' · ' + r.name + ' hazır', 'Üretim tamamlandı. Fabrikadan topla.', realAt(left), 'i-factory');
    });
  });
  /* Siparişler */
  const pendingOrders = (S.orders || []).filter(o => !o.delivered);
  if (pendingOrders.length){
    const targetAbs = S.day * G.DAY_MIN + 1080;
    const delta = targetAbs > baseGame ? targetAbs - baseGame : G.DAY_MIN - (baseGame % G.DAY_MIN) + 1080;
    add('orders', 'Bekleyen siparişler var', pendingOrders.length + ' sipariş teslim edilmeyi bekliyor. Stoklarını kontrol et.', realAt(delta), 'i-truck');
  }
  /* Günlük ödül — gerçek takvim günü, 09:00 */
  const d = new Date();
  let dailyAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
  if (dailyAt.getTime() <= now) dailyAt.setDate(dailyAt.getDate() + 1);
  if (G.dailyAvailable(S)) add('daily-reward', 'Günlük ödül hazır', 'Bugünün ödülünü almayı unutma. Seri: ' + S.daily.streak + ' gün.', dailyAt.getTime(), 'i-gift');
  /* Kritik stoklar — plan imzası her kayıtta değişmesin diye sabit 10 dk sınırı. */
  const lowAt = Math.ceil((now + 60000) / (10 * 60 * 1000)) * (10 * 60 * 1000);
  if (G.waterPct(S) < 20) add('low-water', 'Su deposu azaldı', 'Su deposu %' + Math.round(G.waterPct(S)) + '. Tankı doldur.', lowAt, 'i-drop');
  if (G.feedPct(S) < 22) add('low-feed', 'Yem stoğu azaldı', 'Yem ' + Math.round(S.feed) + ' kg. Pazarda yem al.', lowAt, 'i-wheat');
  if (G.energyPct(S) < 18) add('low-energy', 'Enerji düşük', 'Çiftlik enerjisi %' + Math.round(G.energyPct(S)) + '. Enerji al veya güneşi bekle.', lowAt, 'i-bolt');
  return plan;
}
function syncFactoryJobs(silent){
  const now = G.nowAbs(S);
  FACTORY_KEYS.forEach(id => {
    const st = G.factoryState(S,id), def = FACTORY_DEFS[id];
    st.jobs.forEach(job => {
      if (job.done) return;
      if (now + .001 >= (job.endsAt || Infinity)){
        job.done = true;
        const r = G.factoryRecipe(id, job.recipe) || { name:'Üretim' };
        addNotification('Fabrika üretimi hazır', def.name + ' · ' + r.name + ' tamamlandı. Toplamak için fabrikaya git.', 'i-factory');
        if (!silent && currentScreen === 'scr-factory'){ factorySig = ''; renderFactoryLive(); }
      }
    });
  });
}
function checkAlerts(){
  const day = S.day, due = G.dueFeedSlot(S);
  syncFactoryJobs(false);
  const readyN = G.countReady(S);
  if (readyN > 0){
    G.readyCrops(S).forEach(k => {
      if (!S.flags.ready[k]){ S.flags.ready[k] = true; addNotification('Hasat hazır', Z[k].title + ' toplanmayı bekliyor.', 'i-basket'); }
    });
  }
  if (due >= 0 && !S.flags.feedDue[due]){
    S.flags.feedDue[due] = true;
    addNotification('Besleme vakti', 'Hayvanlar ' + ['06:00','12:00','18:00'][due] + ' öğününü bekliyor.', 'i-wheat');
  }
  if (G.waterPct(S) < 20 && S.flags.lowWaterDay !== day){ S.flags.lowWaterDay = day; addNotification('Su azalıyor', 'Su deposu %' + Math.round(G.waterPct(S)) + '. Tankı doldur.', 'i-drop'); }
  if (G.feedPct(S) < 22 && S.flags.lowFeedDay !== day){ S.flags.lowFeedDay = day; addNotification('Yem azalıyor', 'Yem stoğu ' + Math.round(S.feed) + ' kg. Pazarda yem al.', 'i-wheat'); }
  if (G.energyPct(S) < 18 && S.flags.lowEnergyDay !== day){ S.flags.lowEnergyDay = day; addNotification('Enerji düşük', 'Çiftlik enerjisi %' + Math.round(G.energyPct(S)) + '. Enerji al veya güneşi bekle.', 'i-bolt'); }
  if (G.invTotal(S) > G.storageCap(S) * .92 && S.flags.fullStorageDay !== day){ S.flags.fullStorageDay = day; addNotification('Depo doluyor', 'Ürünleri satarak depoda yer aç.', 'i-box'); }
  S.flags.orderReady = S.flags.orderReady || {};
  (S.orders || []).forEach(o => {
    if (o.delivered || S.flags.orderReady[o.id]) return;
    if ((S.inventory[o.item] || 0) >= o.qty){
      S.flags.orderReady[o.id] = true;
      addNotification('Sipariş hazır', o.buyer + ' için ' + o.qty + ' ' + G.productMeta(o.item).unit + ' ' + G.productMeta(o.item).name + ' hazır. Teslim edebilirsin.', 'i-truck');
    }
  });
}
function newDay(silent){
  const oldSeason = G.seasonIndex(S.day);
  S.history.push({ day:S.day, earned:S.dayStats.earned, harvests:S.dayStats.harvests, sold:S.dayStats.sold, feeds:S.dayStats.feeds, products:S.dayStats.products });
  if (S.history.length > 14) S.history.shift();
  const missed = S.feedSlots.filter(v => !v).length;
  ANIMAL_KEYS.forEach(k => {
    if (missed) S.animals[k].health = G.clamp(S.animals[k].health - missed * 1.7, 55, 100);
    else S.animals[k].health = G.clamp(S.animals[k].health + .7, 55, 100);
  });
  S.feedSlots = [false,false,false];
  S.feedSlotTimes = [null,null,null];
  S.day++;
  S.stats.days = S.day;
  S.dayStats = { earned:0, harvests:0, sold:0, feeds:0, products:0, crafted:0 };
  S.quests = G.makeQuests(S.day);
  S.questDay = S.day;
  S.orders = G.makeOrders(S.day);
  S.orderDay = S.day;
  S.flags.ready = {};
  S.flags.feedDue = {};
  S.flags.orderReady = {};
  S.flags.lowWaterDay = 0;
  S.flags.lowFeedDay = 0;
  S.flags.lowEnergyDay = 0;
  S.flags.fullStorageDay = 0;
  ALL_PRODUCT_KEYS.forEach(k => { S.prevPrices[k] = G.marketPrice(S, k); });
  S.weather = S.forecast;
  S.forecast = pickWeather(S.day + 1, S.weather);
  ALL_PRODUCT_KEYS.forEach(k => {
    const drift = (Math.random() * .16 - .08);
    S.marketMult[k] = G.clamp((S.marketMult[k] || 1) * (1 + drift), .78, 1.34);
  });
  const w = G.weatherOf(S);
  if (w.rain > 0){
    S.water = Math.min(G.waterCap(S), S.water + w.rain);
    Object.keys(CROPS).forEach(k => {
      if (S.zones[k].planted) S.zones[k].wateredUntil = Math.max(S.zones[k].wateredUntil || 0, G.nowAbs(S) + 720);
    });
  }
  if (S.autoFeed && G.zoneLevel(S,'house') >= 4){
    const cost = G.feedCost(S) * 3;
    if (S.feed >= cost){
      S.feed -= cost;
      S.feedSlots = [true,true,true];
      S.feedSlotTimes = [360,720,1080];
      S.stats.feeds += 3; S.stats.feedGiven += cost; S.dayStats.feeds += 3;
      ANIMAL_KEYS.forEach(k => { S.animals[k].health = G.clamp(S.animals[k].health + 1.2, 55, 100); });
      addNotification('Otomatik yem verildi', 'Günün üç öğünü de otomatik beslendi (' + cost + ' kg).', 'i-wheat');
      S.flags.feedDue = {0:true,1:true,2:true};
    } else {
      addNotification('Otomatik yem yetersiz', 'Otomatik besleme için yem stoğu yetmedi.', 'i-wheat');
    }
  }
  const ns = G.seasonIndex(S.day);
  if (ns !== oldSeason){
    addNotification(G.SEASONS[ns].name + ' geldi', G.SEASONS[ns].desc, G.SEASONS[ns].icon);
  }
  addNotification('Gün ' + S.day + ' başladı', w.name + ' · ' + G.tempOf(S) + '°. ' + (S.forecast ? 'Yarın: ' + G.WEATHER[S.forecast].name + '.' : ''), w.icon);
  addXp(8, true);
  checkAchievements(true);
  if (!silent){
    saveState();
    renderAll(true);
    toast('Gün ' + S.day + ' başladı · ' + w.name);
    feedback('success');
  }
}
function pickWeather(day, current){
  const season = G.SEASONS[G.seasonIndex(day)];
  const pool = season.pool;
  let w = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (current && w === current && guard++ < 6) w = pool[Math.floor(Math.random() * pool.length)];
  return w;
}
function stepGame(dm, silent){
  dm = Math.max(0, dm);
  if (!dm) return;
  S.time += dm;
  while (S.time >= G.DAY_MIN){ S.time -= G.DAY_MIN; newDay(silent); }
  const w = G.weatherOf(S);
  Object.keys(CROPS).forEach(k => {
    const z = S.zones[k];
    if (!z.planted || z.ready) return;
    const rate = G.cropRate(S, k);
    z.growth = Math.min(100, z.growth + rate * dm / 60);
    if (z.growth >= 99.999){ z.growth = 100; z.ready = true; newReadyPulse = true; }
  });
  const hours = dm / 60;
  const daylight = S.time >= 330 && S.time < 1140;
  const solar = daylight ? (.9 * w.solar + .15) : .05;
  const planted = Object.keys(CROPS).filter(k => S.zones[k].planted).length;
  const drain = .24 + .05 * planted;
  S.energy = G.clamp(S.energy + solar * hours - drain * hours, 0, G.energyCap(S));
  ANIMAL_KEYS.forEach(cat => {
    const a = ANIMALS[cat], count = G.animalCount(S, cat), h = S.animals[cat].health / 100;
    const fedFactor = .55 + .15 * S.feedSlots.filter(Boolean).length;
    const perHour = a.yieldBase * count * (1 + .12 * (G.zoneLevel(S,'animal') - 1)) * h * w.animal * fedFactor / 24;
    S.animals[cat].production = Math.min(80, S.animals[cat].production + perHour * hours);
  });
}
function advance(gameMinutes, silent){
  let rem = Math.max(0, gameMinutes), guard = 0;
  while (rem > .01 && guard++ < 6000){
    const step = Math.min(rem, 20);
    stepGame(step, silent);
    rem -= step;
  }
  syncFactoryJobs(true);
}

/* ---------------- XP / seviye / başarım ---------------- */
function levelReward(level){ return { money:level * 180, feed:10, energy:10 }; }
function addXp(amount, silent){
  amount = Math.max(0, Math.round(amount));
  if (!amount) return false;
  S.stats.xpEarned += amount;
  if (S.level >= G.FARM_MAX_LEVEL){ S.xp = G.xpNeed(S.level); return false; }
  S.xp += amount;
  let leveled = false, totalMoney = 0, totalFeed = 0, totalEnergy = 0, finalLevel = S.level;
  while (S.level < G.FARM_MAX_LEVEL && S.xp >= G.xpNeed(S.level)){
    S.xp -= G.xpNeed(S.level);
    S.level++;
    const r = levelReward(S.level);
    S.money += r.money; S.feed = Math.min(G.feedCap(S), S.feed + r.feed); S.energy = Math.min(G.energyCap(S), S.energy + r.energy);
    totalMoney += r.money; totalFeed += r.feed; totalEnergy += r.energy;
    finalLevel = S.level; leveled = true;
  }
  if (S.level >= G.FARM_MAX_LEVEL) S.xp = G.xpNeed(S.level);
  if (leveled){
    addNotification('Seviye ' + finalLevel, G.rankName(finalLevel) + ' oldun! Ödüller kasaya eklendi.', 'i-star');
    if (!silent) showLevelUp(finalLevel, { money:totalMoney, feed:totalFeed, energy:totalEnergy });
  }
  return leveled;
}
function showLevelUp(level, rewards){
  const card = $('#levelUp');
  if (!card) return;
  $('#levelUpTitle').textContent = 'Seviye ' + level;
  $('#levelUpText').textContent = G.rankName(level) + ' oldun! Çiftliğin büyüyor, yeni fırsatlar açılıyor.';
  $('#levelUpRewards').innerHTML = `<span>+${G.money(rewards.money)}</span><span>+${rewards.feed} kg yem</span><span>+${rewards.energy} enerji</span>`;
  card.classList.add('open');
  card.setAttribute('aria-hidden','false');
  levelUpOpen = true;
  feedback('level');
  confetti();
}
function closeLevelUp(){
  const card = $('#levelUp');
  if (!card) return;
  card.classList.remove('open');
  card.setAttribute('aria-hidden','true');
  levelUpOpen = false;
}
function checkAchievements(silent){
  let got = false;
  G.ACHIEVEMENTS.forEach(a => {
    if (!S.achievements[a.id] && a.check(S)){
      S.achievements[a.id] = true;
      S.money += a.reward;
      addNotification('Başarım: ' + a.name, a.desc + ' +' + G.money(a.reward), a.icon);
      if (!silent) { toast('Başarım açıldı · ' + a.name + ' +' + G.money(a.reward)); feedback('success'); }
      got = true;
    }
  });
  return got;
}
function questProgress(type, amount){
  S.quests.forEach(q => { if (!q.claimed && q.type === type) q.progress += amount; });
}

/* ---------------- yükseltme / üretim ---------------- */
function upgradeCost(key){ return G.zoneUpgradeCost(key, G.zoneLevel(S,key)); }
function canUpgrade(key){ return G.zoneLevel(S,key) < G.MAX_LEVEL && S.money >= upgradeCost(key); }
function doUpgrade(key){
  if (!Z[key] || key === 'overview') return false;
  const lv = G.zoneLevel(S,key), cost = G.zoneUpgradeCost(key, lv);
  if (lv >= G.MAX_LEVEL){ toast(Z[key].title + ' zaten maksimum seviyede.'); feedback('error'); return false; }
  if (S.money < cost){ toast('Yetersiz kasa · gereken ' + G.money(cost)); feedback('error'); return false; }
  S.money -= cost;
  S.stats.spent += cost;
  S.zones[key].level = lv + 1;
  S.stats.upgrades++;
  if (key === 'house' && lv + 1 >= 4 && !S.autoFeed) S.autoFeed = false;
  if (key === 'water') S.water = Math.min(G.waterCap(S), S.water + 500);
  if (key === 'storage') S.feed = Math.min(G.feedCap(S), S.feed + 15);
  if (key === 'animal') ANIMAL_KEYS.forEach(k => { S.animals[k].health = G.clamp(S.animals[k].health + 1.5, 55, 100); });
  questProgress('upgrade', 1);
  addXp(24);
  addNotification(Z[key].title + ' yükseltildi', 'Seviye ' + (lv + 1) + '. Harita ve verim güncellendi.', 'i-arrow-up');
  const card = $(`[data-card-zone="${key}"]`);
  if (card){ card.classList.add('just-upgraded'); setTimeout(() => card.classList.remove('just-upgraded'), 700); }
  burstAt(key);
  saveState();
  renderAll(true);
  toast(Z[key].title + ' · Seviye ' + (lv + 1) + ' · ' + G.nextLevelEffect(key, lv));
  feedback('success');
  return true;
}
function harvestOne(key, quiet){
  const z = S.zones[key], c = CROPS[key];
  if (!z || !c || !z.planted || !z.ready) return null;
  const room = G.storageCap(S) - G.invTotal(S);
  if (room < 1) return { full:true, key:key };
  const base = G.cropYield(S,key), total = Math.round(base);
  const amount = Math.min(total, Math.floor(room));
  if (amount < 1) return { full:true, key:key };
  const shares = Object.keys(c.items);
  let given = 0;
  shares.forEach((item, idx) => {
    let add = idx === shares.length - 1 ? amount - given : Math.round(amount * c.items[item]);
    add = Math.max(0, add);
    S.inventory[item] = (S.inventory[item] || 0) + add;
    given += add;
  });
  z.planted = false; z.growth = 0; z.ready = false; z.wateredUntil = 0; z.harvests = (z.harvests || 0) + 1;
  S.stats.harvests++; S.dayStats.harvests++;
  questProgress('harvest', 1);
  addXp(Math.round(12 + base * .08));
  const parts = shares.map(item => G.qty(amount * c.items[item]) + ' ' + MARKET[item].unit + ' ' + MARKET[item].name.toLowerCase());
  if (!quiet) toast(c.short + ' hasat edildi · ' + parts.join(' · '));
  if (amount < total && !quiet) toast('Depo doldu · ' + (total - amount) + ' kg sığmadı');
  return { key:key, amount:amount, items:shares, partial:amount < total };
}
function harvestAll(){
  const ready = G.readyCrops(S);
  if (!ready.length){ toast('Hasada hazır tarla yok.'); feedback('error'); return; }
  let total = 0, partial = false, done = 0;
  ready.forEach(k => {
    const r = harvestOne(k, true);
    if (r && !r.full){ total += r.amount; partial = partial || r.partial; done++; }
  });
  if (!done){ toast('Depo dolu · önce ürün sat.'); feedback('error'); return; }
  questProgress('harvest', 0);
  saveState(); renderAll(true);
  toast(done + ' tarla hasat edildi · ' + total + ' kg ürün depoya girdi' + (partial ? ' (depo doldu)' : ''));
  feedback('success'); confetti(18);
}
function collectOne(cat, quiet){
  const p = S.animals[cat].production;
  if (p < .01) return 0;
  const a = ANIMALS[cat];
  const room = G.storageCap(S) - G.invTotal(S);
  if (room < .01) return 0;
  const amount = Math.min(p, room);
  S.inventory[a.item] = (S.inventory[a.item] || 0) + amount;
  S.animals[cat].production = Math.max(0, p - amount);
  S.stats.products += amount; S.dayStats.products += amount;
  addXp(4);
  if (!quiet) toast(a.itemName + ' toplandı · ' + G.qty(amount) + ' ' + a.unit);
  return amount;
}
function collectAll(cat){
  const cats = cat ? [cat] : ANIMAL_KEYS;
  let total = 0, names = [];
  cats.forEach(k => {
    const p = S.animals[k].production;
    if (p >= .01){
      const got = collectOne(k, true);
      if (got > 0){ total += got; names.push(G.qty(got) + ' ' + ANIMALS[k].unit + ' ' + G.prodLabel(ANIMALS[k]).toLowerCase()); }
    }
  });
  if (total < .01){ toast('Toplanacak ürün yok. Hayvanlar üretmeye devam ediyor.'); feedback('error'); return; }
  questProgress('collect', 1);
  saveState(); renderAll(true);
  toast('Ürünler toplandı · ' + names.join(' · '));
  feedback('coin');
}
function doFeed(){
  const due = G.dueFeedSlot(S);
  if (due < 0){
    const next = G.nextFeedSlot(S);
    toast(next >= 0 ? 'Sonraki besleme ' + ['06:00','12:00','18:00'][next] + '.' : 'Bugünkü tüm beslemeler tamam.');
    feedback('error'); return false;
  }
  const cost = G.feedCost(S);
  if (S.feed < cost){ toast('Yem yetersiz · gereken ' + cost + ' kg. Pazarda yem al.'); feedback('error'); return false; }
  S.feed -= cost;
  S.feedSlots[due] = true;
  S.feedSlotTimes[due] = Math.round(S.time);
  S.stats.feeds++; S.stats.feedGiven += cost; S.dayStats.feeds++;
  ANIMAL_KEYS.forEach(k => { S.animals[k].health = G.clamp(S.animals[k].health + 1.3, 55, 100); });
  questProgress('feed', 1);
  addXp(7);
  saveState(); renderAll(true);
  if (sheetKind === 'cow') refreshSheet();
  toast('Sürü beslendi · ' + cost + ' kg yem · ' + ['sabah','öğle','akşam'][due] + ' öğünü');
  feedback('feed');
  return true;
}
function doSell(item){
  const meta = G.productMeta(item);
  const inv = meta ? (S.inventory[item] || 0) : 0;
  if (!meta || inv < .01){ toast('Satılacak ' + (meta ? meta.name.toLowerCase() : 'ürün') + ' yok.'); feedback('error'); return; }
  const price = G.marketPrice(S,item), earn = Math.round(inv * price);
  S.money += earn;
  S.inventory[item] = 0;
  S.stats.earned += earn; S.stats.sold++; S.dayStats.earned += earn; S.dayStats.sold++;
  questProgress('sell', 1); questProgress('earn', earn);
  addXp(5);
  saveState(); renderAll(true);
  flyCoin(null, earn);
  toast(meta.name + ' satıldı · +' + G.money(earn));
  feedback('coin');
}
function doSellAll(){
  let total = 0;
  ALL_PRODUCT_KEYS.forEach(k => { total += (S.inventory[k] || 0) * G.marketPrice(S,k); });
  total = Math.round(total);
  if (total < 1){ toast('Depoda satılacak ürün yok.'); feedback('error'); return; }
  ALL_PRODUCT_KEYS.forEach(k => { S.inventory[k] = 0; });
  S.money += total;
  S.stats.earned += total; S.stats.sold++; S.dayStats.earned += total; S.dayStats.sold++;
  questProgress('sell', 1); questProgress('earn', total);
  addXp(9);
  saveState(); renderAll(true);
  flyCoin(null, total);
  toast('Tüm ürünler satıldı · +' + G.money(total));
  feedback('coin'); confetti(20);
}
function doDeliver(id){
  const o = (S.orders || []).find(x => x.id === id);
  if (!o || o.delivered){ toast('Bu sipariş zaten teslim edildi.'); feedback('error'); return; }
  if ((S.inventory[o.item] || 0) < o.qty){ toast('Yetersiz stok · ' + o.qty + ' ' + MARKET[o.item].unit + ' ' + MARKET[o.item].name + ' gerekiyor.'); feedback('error'); return; }
  S.inventory[o.item] -= o.qty;
  S.money += o.reward;
  o.delivered = true;
  S.stats.orders++; S.stats.earned += o.reward; S.stats.sold++; S.dayStats.earned += o.reward; S.dayStats.sold++;
  questProgress('sell', 1); questProgress('earn', o.reward);
  addXp(14);
  saveState(); renderAll(true);
  flyCoin(null, o.reward);
  toast(o.buyer + ' siparişi teslim edildi · +' + G.money(o.reward));
  feedback('coin');
}
function doBuy(what){
  const cfg = {
    feed:  { cost:100, add:25, cap:() => G.feedCap(S),  cur:() => S.feed,  set:v => S.feed = v,  name:'25 kg yem' },
    energy:{ cost:120, add:20, cap:() => G.energyCap(S), cur:() => S.energy, set:v => S.energy = v, name:'20 enerji' },
    water: { cost:40,  add:1000, cap:() => G.waterCap(S), cur:() => S.water, set:v => S.water = v, name:'1.000 L su' }
  }[what];
  if (!cfg) return;
  if (cfg.cur() >= cfg.cap() - .01){ toast('Depo zaten dolu.'); feedback('error'); return; }
  if (S.money < cfg.cost){ toast('Yetersiz kasa · gereken ' + G.money(cfg.cost)); feedback('error'); return; }
  S.money -= cfg.cost; S.stats.spent += cfg.cost;
  cfg.set(Math.min(cfg.cap(), cfg.cur() + cfg.add));
  saveState(); renderAll(true);
  toast(cfg.name + ' alındı · -' + G.money(cfg.cost));
  feedback('success');
}

/* ---------------- fabrika eylemleri ---------------- */
function factoryToast(msg, err){ toast(msg, err ? 'err' : undefined); feedback(err ? 'error' : 'success'); }
function doFactoryUnlock(id){
  const def = FACTORY_DEFS[id];
  if (!def){ return; }
  if (G.factoryUnlocked(S,id)){ factoryToast('Bu fabrika zaten açık.', true); return; }
  if (S.money < def.unlockCost){ factoryToast('Yetersiz kasa · gereken ' + G.money(def.unlockCost), true); return; }
  S.money -= def.unlockCost;
  S.stats.spent += def.unlockCost;
  S.stats.factorySpent = (S.stats.factorySpent || 0) + def.unlockCost;
  S.factories[id] = { unlocked:true, slots:1, jobs:[] };
  addXp(28);
  addNotification(def.name + ' açıldı', 'Yeni üretim tarifleri ve kuyruk hazır. Fabrikalarım sekmesinden üretime başla.', def.icon);
  saveState(); renderAll(true);
  factoryToast(def.name + ' açıldı · ' + def.recipes.length + ' tarif kullanılabilir');
  confetti(16);
}
function doFactorySlot(id){
  const def = FACTORY_DEFS[id], st = G.factoryState(S,id);
  if (!def || !G.factoryUnlocked(S,id)){ factoryToast('Önce fabrikayı aç.', true); return; }
  if (st.slots >= FACTORY_MAX_SLOTS){ factoryToast('Kuyruk zaten maksimumda.', true); return; }
  const cost = G.factorySlotCost(S,id);
  if (S.money < cost){ factoryToast('Yetersiz kasa · yeni yuva ' + G.money(cost), true); return; }
  S.money -= cost;
  S.stats.spent += cost;
  S.stats.factorySpent = (S.stats.factorySpent || 0) + cost;
  st.slots += 1;
  addXp(16);
  addNotification('Fabrika kuyruğu büyüdü', def.name + ' artık aynı anda ' + st.slots + ' iş alabilir.', 'i-plus');
  saveState(); renderAll(true);
  factoryToast('Yeni üretim yuvası açıldı · ' + st.slots + ' iş');
  feedback('success');
}
function doFactoryStart(id, recipeId){
  const st = G.factoryState(S,id), r = G.factoryRecipe(id,recipeId);
  if (!G.factoryUnlocked(S,id)){ factoryToast('Önce fabrikayı aç.', true); return; }
  if (!r){ return; }
  if (st.jobs.length >= st.slots){ factoryToast('Kuyruk dolu. Yeni yuva aç veya ürünleri topla.', true); return; }
  const missing = Object.keys(r.need).filter(k => (S.inventory[k] || 0) < r.need[k]);
  if (missing.length){ factoryToast('Malzeme eksik · ' + missing.map(k => G.productMeta(k).name).join(', '), true); return; }
  Object.keys(r.need).forEach(k => { S.inventory[k] = Math.max(0, (S.inventory[k] || 0) - r.need[k]); });
  const startedAt = G.nowAbs(S);
  const job = { id:'j' + Date.now().toString(36) + Math.random().toString(36).slice(2,4), recipe:r.id, startedAt:startedAt, endsAt:startedAt + r.time, done:false };
  st.jobs.push(job);
  addXp(3);
  saveState(); renderAll(true);
  factoryToast(r.name + ' üretime girdi · ' + G.etaText(r.time));
  feedback('success');
  if (currentScreen === 'scr-factory') renderFactoryLive(true);
}
function factoryCollect(id, jobId){
  const st = G.factoryState(S,id), idx = st.jobs.findIndex(j => j.id === jobId);
  if (idx < 0){ return; }
  const job = st.jobs[idx], r = G.factoryRecipe(id, job.recipe);
  if (!r) { st.jobs.splice(idx,1); saveState(); renderAll(true); return; }
  if (!job.done && G.nowAbs(S) + .001 < job.endsAt){ factoryToast('Üretim henüz bitmedi · ' + G.etaText(G.factoryJobLeft(S,job)), true); return; }
  const outKeys = Object.keys(r.out);
  const totalOut = outKeys.reduce((a,k) => a + r.out[k], 0);
  const room = G.storageCap(S) - G.invTotal(S);
  if (room < totalOut){ factoryToast('Depoda yer yok · önce ürün sat.', true); return; }
  outKeys.forEach(k => { S.inventory[k] = (S.inventory[k] || 0) + r.out[k]; });
  st.jobs.splice(idx,1);
  S.stats.crafted = (S.stats.crafted || 0) + 1;
  S.stats.products = (S.stats.products || 0) + totalOut;
  S.dayStats.crafted = (S.dayStats.crafted || 0) + totalOut;
  addXp(r.xp || 0);
  saveState(); renderAll(true);
  factoryToast(r.name + ' depoya alındı · ' + G.factoryOutText(r.out));
  feedback('coin');
}
function factoryCollectAll(id){
  const st = G.factoryState(S,id);
  const done = st.jobs.filter(j => j.done || G.nowAbs(S) + .001 >= j.endsAt);
  if (!done.length){ factoryToast('Toplanacak hazır üretim yok.', true); return; }
  let room = G.storageCap(S) - G.invTotal(S);
  const collected = [];
  let totalOut = 0, totalXp = 0, stopped = false;
  done.forEach(job => {
    const r = G.factoryRecipe(id, job.recipe);
    if (!r){ collected.push(job); return; }
    const amount = Object.keys(r.out).reduce((a,k) => a + r.out[k], 0);
    if (room < amount){ stopped = true; return; }
    Object.keys(r.out).forEach(k => { S.inventory[k] = (S.inventory[k] || 0) + r.out[k]; });
    room -= amount; totalOut += amount; totalXp += r.xp || 0;
    collected.push(job);
  });
  if (!collected.length){
    factoryToast('Depoda yer yok · önce ürün sat.', true);
    return;
  }
  const collectedSet = new Set(collected);
  st.jobs = st.jobs.filter(j => !collectedSet.has(j));
  S.stats.crafted = (S.stats.crafted || 0) + collected.length;
  S.stats.products = (S.stats.products || 0) + totalOut;
  S.dayStats.crafted = (S.dayStats.crafted || 0) + totalOut;
  addXp(totalXp);
  factorySig = '';
  saveState(); renderAll(true);
  if (stopped) factoryToast(collected.length + ' üretim alındı · depo doldu, kalanlar bekliyor.', true);
  else factoryToast(collected.length + ' üretim depoya alındı · ' + totalOut + ' ürün');
  feedback('coin');
}

/* ---------------- ekran / harita ---------------- */
function setTab(key){
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.nav === key));
}
let topbarScrimFrame = 0;
function syncTopbarScrim(){
  const app = $('#app');
  if (!app) return;
  const sc = currentScreen ? document.getElementById(currentScreen) : null;
  app.classList.toggle('topbar-scrolled', !!sc && sc.scrollTop > 6);
}
function queueTopbarScrim(){
  if (topbarScrimFrame) return;
  topbarScrimFrame = requestAnimationFrame(() => {
    topbarScrimFrame = 0;
    syncTopbarScrim();
  });
}
function showScreen(id, tab, opts){
  const next = document.getElementById(id);
  if (!next) return;
  opts = opts || {};
  if (id !== currentScreen || opts.force){
    const prev = document.getElementById(currentScreen);
    if (prev) prev.classList.remove('active');
    next.classList.remove('active');
    void next.offsetWidth;
    next.classList.add('active');
    next.scrollTop = 0;
    currentScreen = id;
  }
  setTab(tab || (id === 'scr-home' ? 'home' : id === 'scr-farm' || id === 'scr-detail' ? 'farm' : id === 'scr-livestock' ? 'livestock' : id === 'scr-factory' ? 'factory' : id === 'scr-market' ? 'market' : 'profile'));
  document.body.classList.toggle('hide-nav', id === 'scr-detail');
  if (id === 'scr-home') renderHome();
  if (id === 'scr-farm') renderFarm(true);
  if (id === 'scr-livestock') { renderLivestockStatic(); renderLivestockLive(); }
  if (id === 'scr-factory') { renderFactory(); renderFactoryLive(); }
  if (id === 'scr-detail') renderDetail(true);
  if (id === 'scr-market') renderMarket();
  if (id === 'scr-profile') renderProfile();
  if (id === 'scr-analytics') renderReports();
  if (id === 'scr-community') renderCommunity();
  if (id === 'scr-bank') renderBankScreen();
  renderStatus();
  syncTopbarScrim();
}
function showTab(key){
  if (key === 'farm'){
    /* Alt çubuktan Çiftlik'e basıldığında her zaman genel bakış açılır. */
    showScreen('scr-farm','farm');
    selectZone('overview', { animate:false, silent:true });
    const sc = $('#scr-farm'); if (sc) sc.scrollTo({ top:0, behavior:'auto' });
    return;
  }
  if (key === 'home'){ showScreen('scr-home','home'); return; }
  if (key === 'livestock'){ showScreen('scr-livestock','livestock'); return; }
  if (key === 'factory'){ showScreen('scr-factory','factory'); return; }
  if (key === 'market'){ showScreen('scr-market','market'); return; }
  if (key === 'profile'){ showScreen('scr-profile','profile'); return; }
  if (key === 'reports'){ showScreen('scr-analytics','profile'); return; }
  if (key === 'bank'){ showScreen('scr-bank','bank'); return; }
  if (key === 'community'){ showScreen('scr-community','community'); return; }
}
function centerChip(zone){
  const chips = $('#farmChips'), chip = $('#farmChips .chip[data-zone="' + zone + '"]');
  if (!chips || !chip) return;
  const target = chip.offsetLeft - (chips.clientWidth - chip.offsetWidth) / 2;
  chips.scrollLeft = Math.max(0, Math.min(target, chips.scrollWidth - chips.clientWidth));
}
function applyRing(svg, ring){
  if (!svg) return;
  if (!ring){ svg.classList.remove('has-hl'); return; }
  $$('.zone-hl rect', svg).forEach(r => {
    r.setAttribute('x', ring[0]); r.setAttribute('y', ring[1]);
    r.setAttribute('width', ring[2]); r.setAttribute('height', ring[3]);
    r.setAttribute('rx', 28);
  });
  svg.classList.add('has-hl');
}
function setViewInstant(svg, view){ if (svg) svg.setAttribute('viewBox', view.join(' ')); }
function animateView(svg, view, dur){
  if (!svg) return;
  if (STATIC || REDUCED){ setViewInstant(svg, view); return; }
  dur = dur || 700;
  cancelAnimationFrame(svg._mapRaf);
  const cur = (svg.getAttribute('viewBox') || '0 0 1000 1250').trim().split(/\s+/).map(Number);
  const from = cur.length === 4 ? cur : [0,0,1000,1250];
  if (Math.abs(from[0]-view[0]) < .5 && Math.abs(from[2]-view[2]) < .5) { setViewInstant(svg, view); return; }
  const t0 = performance.now();
  function tick(t){
    const p = Math.min(1, (t - t0) / dur);
    const e = p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2;
    svg.setAttribute('viewBox', from.map((f,i) => f + (view[i]-f)*e).join(' '));
    if (p < 1) svg._mapRaf = requestAnimationFrame(tick);
  }
  svg._mapRaf = requestAnimationFrame(tick);
}
function setMap(svg, view, opts){
  if (!svg) return;
  opts = opts || {};
  svg.classList.toggle('zoomed', opts.labels === false);
  applyRing(svg, opts.highlight || null);
  if (opts.animate === false) setViewInstant(svg, view);
  else animateView(svg, view, opts.dur);
}
function zoneAt(svg, evt){
  try {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    for (const k in G.BOUNDS){
      const b = G.BOUNDS[k];
      if (loc.x >= b[0] && loc.x <= b[0]+b[2] && loc.y >= b[1] && loc.y <= b[1]+b[3]) return k;
    }
  } catch(e){}
  return null;
}
function selectZone(zone, opts){
  if (!Z[zone]) return;
  opts = opts || {};
  farmZone = zone;
  S.selectedZone = zone;
  S.flags.mapTipSeen = true;
  $$('#farmChips .chip').forEach(c => c.classList.toggle('active', c.dataset.zone === zone));
  const m = Z[zone];
  const map = $('#farmMap');
  setMap(map, m.view, { labels: zone === 'overview', highlight: zone === 'overview' ? null : m.ring, animate:opts.animate !== false });
  const tip = $('#mapTip'); if (tip) tip.classList.add('hide');
  const info = $('#farmInfo');
  if (info){ info.innerHTML = G.zoneCard(S, zone); sig.farm = farmSig(); }
  centerChip(zone);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerChip(zone));
  if (!opts.silent) feedback('tap');
  renderMapOverlay(true);
}
function openDetail(zone){
  if (!Z[zone] || zone === 'overview') return;
  if (zone === 'animal'){ showScreen('scr-livestock','livestock'); return; }
  detailZone = zone;
  const m = Z[zone];
  const sheet = $('#detailSheet');
  if (sheet){ sheet.innerHTML = G.zoneCard(S, zone, { detail:true }); }
  const map = $('#detailMap');
  setViewInstant(map, m.detailView || m.view);
  map.classList.add('zoomed');
  applyRing(map, null);
  $('#dynDetail').innerHTML = G.mapOverlay(S);
  showScreen('scr-detail','farm');
  const scr = $('#scr-detail'); if (scr) scr.scrollTop = 0;
  applyWorldClasses();
  renderDetailLive();
  feedback('tap');
}
function openMap(zone){
  zone = zone || farmZone;
  const m = Z[zone] || Z.overview;
  $('#modalTitle').textContent = zone === 'overview' ? 'Çiftlik haritası' : m.title;
  const svg = $('#modalMap');
  setViewInstant(svg, zone === 'overview' ? [0,0,1000,1250] : m.view);
  svg.classList.toggle('zoomed', zone !== 'overview');
  applyRing(svg, zone === 'overview' ? null : m.ring);
  $('#dynModal').innerHTML = G.mapOverlay(S);
  const modal = $('#mapModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  feedback('tap');
}
function closeMap(){
  const modal = $('#mapModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
}
function burstAt(zone){
  const card = $('#farmMapCard');
  if (!card) return;
  const b = $('#farmMap');
  if (!b) return;
  const dot = document.createElement('i');
  dot.className = 'map-burst';
  dot.style.left = '50%'; dot.style.top = '46%';
  card.appendChild(dot);
  setTimeout(() => dot.remove(), 850);
}

function confetti(n){
  if (STATIC || REDUCED) return;
  const app = $('#app');
  if (!app) return;
  n = n || 24;
  const colors = ['#F0B84B','#E4573E','#83C267','#55A9DC','#B07B52','#FFF7DC'];
  for (let i = 0; i < n; i++){
    const b = document.createElement('i');
    b.className = 'confetti-bit';
    b.style.left = (Math.random() * 100).toFixed(1) + '%';
    b.style.background = colors[i % colors.length];
    b.style.animationDuration = (1.5 + Math.random() * 1.5).toFixed(2) + 's';
    b.style.animationDelay = (Math.random() * .3).toFixed(2) + 's';
    app.appendChild(b);
    setTimeout(() => b.remove(), 3400);
  }
}
function flyCoin(fromEl, amount){
  if (STATIC || REDUCED) return;
  const app = $('#app'), target = $('#coinTarget') || $('#sbMoney') || $('.sb-bell') || $('#farmMoney');
  if (!app || !target) return;
  const ar = app.getBoundingClientRect(), tr = target.getBoundingClientRect();
  let sx = ar.left + ar.width / 2, sy = ar.top + ar.height * .55;
  if (fromEl && fromEl.getBoundingClientRect){
    const r = fromEl.getBoundingClientRect();
    sx = r.left + r.width / 2; sy = r.top + r.height / 2;
  }
  const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
  const n = Math.min(8, Math.max(4, Math.round(Math.log10(Math.max(10, amount)) * 3)));
  for (let i = 0; i < n; i++){
    const c = document.createElement('span');
    c.className = 'fly-coin coin-fly-anim';
    c.textContent = '₺';
    c.style.left = (sx - ar.left - 7) + 'px';
    c.style.top = (sy - ar.top - 7) + 'px';
    c.style.setProperty('--dx', (tx - sx + (Math.random() * 28 - 14)).toFixed(1) + 'px');
    c.style.setProperty('--dy', (ty - sy + (Math.random() * 16 - 8)).toFixed(1) + 'px');
    c.style.animationDelay = (i * 40) + 'ms';
    app.appendChild(c);
    setTimeout(() => c.remove(), 1200 + i * 40);
  }
}

/* ---------------- harita / dünya ---------------- */
function renderMapOverlay(force){
  const s = [
    G.ZONE_KEYS.map(k => G.zoneLevel(S,k)).join(''),
    Object.keys(CROPS).map(k => (S.zones[k].planted?1:0) + (S.zones[k].ready?1:0)).join(''),
    G.dueFeedSlot(S), G.countReady(S),
    G.waterPct(S) < 20 ? 1 : 0, G.energyPct(S) < 20 ? 1 : 0,
    G.invTotal(S) > G.storageCap(S) * .92 ? 1 : 0, S.autoFeed ? 1 : 0
  ].join('|');
  if (!force && s === sig.overlay) return;
  sig.overlay = s;
  const html = G.mapOverlay(S);
  if (currentScreen === 'scr-farm'){ const a = $('#dynFarm'); if (a) setHTML(a, html); }
  else if (currentScreen === 'scr-detail'){ const b = $('#dynDetail'); if (b) setHTML(b, html); }
  const modal = $('#mapModal');
  if (modal && modal.classList.contains('open')){ const c = $('#dynModal'); if (c) setHTML(c, html); }
}
function applyWorldClasses(){
  const phase = G.phaseOf(S.time), w = S.weather, season = G.seasonIndex(S.day);
  const status = $('#statusbar');
  const cacheKey = phase + '|' + w + '|' + season + '|' + currentScreen + '|' + (startVisible ? 1 : 0);
  if (sig.worldClass === cacheKey) return;
  sig.worldClass = cacheKey;
  const app = $('#app');
  if (app){ app.dataset.phase = phase; app.dataset.weather = w; app.dataset.season = G.SEASONS[season].name.toLowerCase(); }
  const home = $('#homeWrap'); if (home) home.classList.toggle('time-night', phase === 'night');
  const start = $('#startScreen');
  if (start) start.dataset.phase = phase;
  [['#farmMapCard','map-card'], ['#detailHero','detail-hero']].forEach(([sel, cls]) => {
    const el = $(sel); if (!el) return;
    ['phase-dawn','phase-dusk','phase-night','w-rainy','w-storm','w-snow','w-heat','w-cloudy','w-sunny'].forEach(c => el.classList.remove(c));
    el.classList.add('phase-' + phase);
    el.classList.add('w-' + w);
  });
  if (status){
    const startShown = start && !start.classList.contains('hidden');
    const light = !startShown && ((currentScreen === 'scr-home' && phase === 'night') || currentScreen === 'scr-detail');
    status.classList.toggle('sb-light', !!light);
  }
}
function makeFx(el, weather, phase, calm){
  if (!el) return;
  el.innerHTML = '';
  const n = window.innerWidth < 390 ? .8 : 1;
  const add = (cls, count, fn) => {
    for (let i = 0; i < count; i++){
      const d = document.createElement('i');
      d.className = cls;
      fn(d, i);
      el.appendChild(d);
    }
  };
  const rand = (a,b) => a + Math.random() * (b-a);
  if (weather === 'rainy' || weather === 'storm'){
    add('rain-drop', Math.round((weather === 'storm' ? 30 : 20) * n), d => {
      d.style.left = rand(0,100) + '%';
      d.style.animationDuration = rand(.55,1.05) + 's';
      d.style.animationDelay = rand(0,1.2) + 's';
      d.style.opacity = rand(.35,.8);
    });
    add('cloud-puff', 3, d => {
      d.style.top = rand(0,32) + '%';
      d.style.animationDuration = rand(16,28) + 's';
      d.style.animationDelay = rand(-20,0) + 's';
      d.style.opacity = rand(.15,.3);
    });
  }
  if (weather === 'storm'){
    const l = document.createElement('span'); l.className = 'lightning'; el.appendChild(l);
  }
  if (weather === 'snow'){
    add('snow-flake', Math.round(24 * n), d => {
      d.style.left = rand(0,100) + '%';
      d.style.width = d.style.height = rand(3,6) + 'px';
      d.style.animationDuration = rand(3.4,7) + 's';
      d.style.animationDelay = rand(0,3) + 's';
    });
  }
  if (weather === 'heat'){
    add('heat-shimmer', 7, d => {
      d.style.top = rand(10,90) + '%';
      d.style.animationDuration = rand(2.2,4.4) + 's';
      d.style.animationDelay = rand(0,2) + 's';
    });
    if (!calm) add('sun-mote', Math.round(12 * n), d => {
      d.style.left = rand(0,100) + '%';
      d.style.top = rand(10,90) + '%';
      d.style.animationDuration = rand(3,7) + 's';
      d.style.animationDelay = rand(0,3) + 's';
    });
  }
  if (weather === 'sunny'){
    if (!calm) add('sun-mote', Math.round(11 * n), d => {
      d.style.left = rand(0,100) + '%';
      d.style.top = rand(8,90) + '%';
      d.style.animationDuration = rand(4,8) + 's';
      d.style.animationDelay = rand(0,4) + 's';
    });
  }
  if (weather === 'cloudy'){
    add('cloud-puff', 4, d => {
      d.style.top = rand(2,40) + '%';
      d.style.animationDuration = rand(18,30) + 's';
      d.style.animationDelay = rand(-24,0) + 's';
      d.style.opacity = rand(.2,.36);
    });
  }
  if (phase === 'night' && !calm){
    add('sun-mote', 5, d => {
      d.style.left = rand(0,100) + '%'; d.style.top = rand(0,70) + '%';
      d.style.background = 'rgba(255,247,214,.7)';
      d.style.animationDuration = rand(5,9) + 's'; d.style.animationDelay = rand(0,4) + 's';
    });
  }
  if (phase === 'dusk' || phase === 'dawn'){
    add('leaf-drift', 4, d => {
      d.style.left = rand(0,90) + '%'; d.style.top = rand(-10,10) + '%';
      d.style.animationDuration = rand(6,11) + 's'; d.style.animationDelay = rand(0,4) + 's';
      d.style.opacity = rand(.25,.5);
    });
  }
}
function renderStars(el, count){
  if (!el) return;
  if (el.dataset.done) return;
  el.dataset.done = '1';
  let html = '';
  for (let i = 0; i < count; i++){
    html += `<i style="left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*62).toFixed(1)}%;animation-delay:${(Math.random()*3).toFixed(1)}s;opacity:${(.3+Math.random()*.7).toFixed(2)}"></i>`;
  }
  el.innerHTML = html;
}
function renderFloat(el){
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  const bits = ['🌿','🍃','✨','🌾','🍂','✨','🌱'];
  let html = '';
  for (let i = 0; i < 7; i++){
    html += `<i style="left:${(6+Math.random()*84).toFixed(1)}%;top:${(12+Math.random()*62).toFixed(1)}%;font-size:${(9+Math.random()*9).toFixed(0)}px;animation-duration:${(5+Math.random()*5).toFixed(1)}s;animation-delay:${(Math.random()*4).toFixed(1)}s;opacity:${(.35+Math.random()*.45).toFixed(2)}">${bits[i % bits.length]}</i>`;
  }
  el.innerHTML = html;
}
function renderWorld(force){
  applyWorldClasses();
  const phase = G.phaseOf(S.time), w = S.weather;
  const key = w + '|' + phase;
  if (key !== sig.world){
    sig.world = key;
    makeFx($('#homeFx'), w, phase);
    makeFx($('#farmMapFx'), w, phase, true);
    makeFx($('#detailFx'), w, phase, true);
    makeFx($('#startFx'), w, phase);
    const hs = $('#homeStars'); if (hs) hs.style.opacity = phase === 'night' ? 1 : 0;
    const ss = $('#startStars'); if (ss){ ss.style.display = phase === 'night' ? 'block' : 'none'; ss.style.opacity = phase === 'night' ? 1 : 0; }
  }
  renderStars($('#homeStars'), 26);
  renderStars($('#startStars'), 32);
  renderFloat($('#homeFloat'));
  renderFloat($('#startFloat'));
}
function updateBell(){
  const n = G.unreadCount(S), el = $('#bellCount');
  if (!el) return;
  setText(el, n > 9 ? '9+' : String(n));
  el.style.display = n ? 'grid' : 'none';
}

/* ---------------- durum çubuğu ---------------- */
function renderStatus(){
  setText($('#sbTime'), G.timeStr(S.time));
  setText($('#sbFarmName'), S.profile ? S.profile.farm : 'Yeşil Vadi Çiftliği');
  setText($('#sbProfileName'), S.profile ? S.profile.name : 'Çiftçi');
  setText($('#sbLevel'), S.level);
  const pct = G.energyPct(S), bat = $('#sbBattery'), fill = $('#sbBatteryFill');
  setWidth(fill, pct);
  if (bat){
    bat.classList.toggle('low', pct < 20);
    bat.classList.toggle('mid', pct >= 20 && pct < 50);
    bat.title = 'Çiftlik enerjisi: %' + Math.round(pct);
  }
  applyWorldClasses();
}

/* ---------------- ana sayfa ---------------- */
function renderHome(live){
  const w = G.weatherOf(S), health = G.farmHealth(S);
  const wIcon = $('#homeWeatherIcon');
  if (wIcon) setHTML(wIcon, G.icon(w.icon));
  setText($('#homeTemp'), G.tempOf(S) + '°');
  setText($('#homeWeatherName'), w.name);
  setText($('#homeDayBox'), 'Gün ' + S.day);
  setText($('#homeWeatherWater'), G.weatherWaterText(S));
  setText($('#homeWeatherSolar'), G.weatherSolarText(S));
  setRing($('#homeHealthRing'), health);
  setText($('#homeHealthLabel'), G.farmHealthLabel(health));
  setText($('#homeHealthNote'), G.farmHealthNote(S));
  setText($('#walletMoney'), G.money(S.money));
  setText($('#walletSeason'), G.seasonOf(S).name);
  setText($('#walletLevel'), 'Seviye ' + S.level);
  const need = G.xpNeed(S.level), xpPct = S.level >= G.FARM_MAX_LEVEL ? 100 : G.clamp(S.xp / need * 100, 0, 100);
  setText($('#walletXpText'), G.fmt(S.xp) + ' / ' + G.fmt(need) + ' XP');
  setWidth($('#walletXpBar'), xpPct);
  const qc = $('#qcMoney');
  if (qc) setHTML(qc, G.fmt(S.money) + ' <small>₺</small>');
  setText($('#qcHarvest'), G.countReady(S));
  setText($('#qcAnimals'), G.totalAnimals(S));
  setText($('#qcWater'), '%' + Math.round(G.waterPct(S)));
  const qs = S.quests.map(q => q.id + ':' + Math.round(q.progress) + ':' + (q.claimed?1:0)).join('|');
  if (!live || qs !== sig.homeQuest){
    sig.homeQuest = qs;
    const hq = $('#homeQuests'); if (hq) setHTML(hq, S.quests.map(q => G.questRow(q,S)).join(''));
  }
  const ds = (G.dailyAvailable(S)?1:0) + ':' + S.daily.streak + ':' + G.dateKey();
  if (!live || ds !== sig.daily){
    sig.daily = ds;
    const hd = $('#homeDaily');
    if (hd){
      setHTML(hd, G.dailyCard(S));
      hd.classList.toggle('claimed', !G.dailyAvailable(S));
    }
  }
  updateBell();
}
function renderHomeLive(){ renderHome(true); }

function renderCommunity(){
  const content = $('#communityContent');
  if (!content) return;
  const activeBtn = $('.com-tab-btn.active');
  const tab = activeBtn ? activeBtn.dataset.comTab : 'friends';
  if (tab === 'friends') content.innerHTML = G.renderFriends(S);
  else if (tab === 'leaderboard') content.innerHTML = G.renderLeaderboard(S);
  else if (tab === 'events') content.innerHTML = G.renderEvents(S);
  else if (tab === 'features') content.innerHTML = G.renderOnlineFeatures(S);
}
function renderCommunityLive(){ renderCommunity(); }

function renderBankScreen(){
  const c = $('#bankContent');
  if (!c) return;
  c.innerHTML = G.renderBank(S);
}
function renderBankScreenLive(){ renderBankScreen(); }

/* ---------------- başlangıç ekranı ---------------- */
function renderStart(){
  const w = G.weatherOf(S);
  const app = $('#app'), startScreen = $('#startScreen');
  if (app) app.classList.toggle('start-open', !!startVisible && !!startScreen && !startScreen.classList.contains('hidden'));
  const label = $('#startContinueLabel'), sub = $('#startContinueSub'), stats = $('#startStats');
  const saved = hasSave || gameStarted;
  if (label) label.textContent = saved ? 'Devam Et' : 'Oyna';
  if (sub) sub.textContent = saved ? ('Gün ' + S.day + ' · Seviye ' + S.level + ' · ' + G.money(S.money)) : 'Yeni bir çiftlik seni bekliyor';
  if (stats) stats.textContent = 'Gün ' + S.day + ' · Seviye ' + S.level + ' · ' + G.money(S.money);
  const dot = $('#startDailyDot');
  if (dot) dot.style.display = G.dailyAvailable(S) ? 'block' : 'none';
  const sound = $('#startSound');
  if (sound){
    const u = $('use', sound);
    if (u) u.setAttribute('href', S.sound ? '#i-sound' : '#i-mute');
    sound.setAttribute('aria-label', S.sound ? 'Sesi kapat' : 'Sesi aç');
  }
  const start = $('#startScreen');
  if (start) start.dataset.weather = S.weather;
  updateBell();
  renderStatus();
}

/* ---------------- ses / titreşim anahtarları ---------------- */
function updateSoundSwitches(){
  const ss = $('#soundSwitch'), vs = $('#vibrationSwitch'), ns = $('#notifSwitch');
  if (ss) ss.classList.toggle('on', !!S.sound);
  if (vs) vs.classList.toggle('on', !!S.vibration);
  if (ns) ns.classList.toggle('on', !!S.notificationsEnabled);
  const sound = $('#startSound');
  if (sound){
    const u = $('use', sound);
    if (u) u.setAttribute('href', S.sound ? '#i-sound' : '#i-mute');
  }
}

/* ---------------- çiftlik ---------------- */
function farmSig(){
  return [
    farmZone,
    G.ZONE_KEYS.map(k => G.zoneLevel(S,k) + ':' + (S.zones[k].planted?1:0) + ':' + (S.zones[k].ready?1:0) + ':' + (G.isWatered(S,S.zones[k])?1:0)).join(','),
    G.dueFeedSlot(S), G.countReady(S),
    Math.round(S.money / 10), Math.round(S.water / 50), Math.round(S.feed), Math.round(S.energy / 5),
    G.invTotal(S) > G.storageCap(S) * .9 ? 1 : 0, S.autoFeed ? 1 : 0
  ].join('~');
}
function updateGrowthLive(scope, key){
  if (!scope) return;
  if (CROPS[key]){
    const z = S.zones[key], pct = Math.round(z.growth);
    const bar = $('[data-live="growth"]', scope);
    if (bar) bar.style.width = (z.planted ? pct : 0) + '%';
    const txt = $('[data-live="growthText"]', scope);
    if (txt) txt.textContent = z.planted ? pct + '%' : '—';
    const st = $('[data-live="status"]', scope);
    if (st){
      st.textContent = G.zoneStatus(S,key);
      st.className = 'status-pill ' + G.statusClass(S,key);
    }
    const note = $('[data-live="note"]', scope);
    if (note){
      const watered = G.isWatered(S,z), left = G.growthLeft(S,key);
      note.textContent = z.planted ? (z.ready ? 'Toplamaya hazır' : watered ? 'Sulanıyor · ' + G.etaText(left) : 'Su bekliyor') : 'Ekim yapılmadı';
    }
  }
  if (key === 'house'){
    const ep = Math.round(G.energyPct(S));
    const bar = $('[data-live="energyBar"]', scope); if (bar) bar.style.width = ep + '%';
    const txt = $('[data-live="energyText"]', scope); if (txt) txt.textContent = Math.round(S.energy) + ' / ' + G.energyCap(S);
  }
}
function renderFarm(force){
  const w = G.weatherOf(S);
  setText($('#farmSeason'), G.seasonOf(S).name);
  setText($('#farmHectares'), G.num(G.totalHectares(S), 1));
  setText($('#farmWeatherText'), w.name + ' ' + G.tempOf(S) + '°');
  const fwi = $('#farmWeatherIcon'); if (fwi) setHTML(fwi, G.icon(w.icon));
  setText($('#farmMoney'), G.money(S.money));
  setText($('#farmIncome'), 'Bugün ' + G.money(S.dayStats.earned));
  setText($('#farmLevelText'), 'Seviye ' + S.level);
  const need = G.xpNeed(S.level), xpPct = S.level >= G.FARM_MAX_LEVEL ? 100 : G.clamp(S.xp / need * 100, 0, 100);
  setText($('#farmXpText'), G.fmt(S.xp) + ' / ' + G.fmt(need) + ' XP');
  setWidth($('#farmXpBar'), xpPct);
  setText($('#farmTemp'), G.tempOf(S) + '°');
  setText($('#farmDay'), 'Gün ' + S.day);
  setText($('#farmForecast'), 'Yarın: ' + (G.WEATHER[S.forecast] || G.WEATHER.cloudy).name.split(' ')[0]);
  const map = $('#farmMap');
  if (map){
    const want = Z[farmZone].view.join(' ');
    if (map.getAttribute('viewBox') !== want) setMap(map, Z[farmZone].view, { labels:farmZone === 'overview', highlight:farmZone === 'overview' ? null : Z[farmZone].ring, animate:false });
    else { map.classList.toggle('zoomed', farmZone !== 'overview'); applyRing(map, farmZone === 'overview' ? null : Z[farmZone].ring); }
  }
  $$('#farmChips .chip').forEach(c => c.classList.toggle('active', c.dataset.zone === farmZone));
  const tip = $('#mapTip'); if (tip) tip.classList.toggle('hide', !!S.flags.mapTipSeen);
  setText($('#mapTipSub'), G.countReady(S) + ' tarla hazır · ' + G.totalAnimals(S) + ' hayvan');
  const fs = farmSig();
  const info = $('#farmInfo');
  if (info && (force || fs !== sig.farm)){
    sig.farm = fs;
    setHTML(info, G.zoneCard(S, farmZone));
  }
  if (info) updateGrowthLive(info, farmZone);
  const planted = Object.keys(CROPS).filter(k => S.zones[k].planted).length;
  setText($('#exploreNote'), planted + ' ürün büyüyor');
  setText($('#exploreCrops'), planted + ' tarla');
  setText($('#exploreAnimals'), G.totalAnimals(S) + ' hayvan');
  setText($('#exploreWater'), 'Su: %' + Math.round(G.waterPct(S)));
  setText($('#exploreWeather'), w.name + ' · ' + G.tempOf(S) + '°');
  renderMapOverlay(force);
  applyWorldClasses();
}
function renderFarmLive(){
  if (currentScreen === 'scr-farm'){
    setText($('#farmMoney'), G.money(S.money));
    setText($('#farmIncome'), 'Bugün ' + G.money(S.dayStats.earned));
    const need = G.xpNeed(S.level), xpPct = S.level >= G.FARM_MAX_LEVEL ? 100 : G.clamp(S.xp / need * 100, 0, 100);
    setWidth($('#farmXpBar'), xpPct);
    setText($('#farmXpText'), G.fmt(S.xp) + ' / ' + G.fmt(need) + ' XP');
    setText($('#farmTemp'), G.tempOf(S) + '°');
    setText($('#farmDay'), 'Gün ' + S.day);
    setText($('#farmHectares'), G.num(G.totalHectares(S), 1));
    const fs = farmSig();
    const info = $('#farmInfo');
    if (info && fs !== sig.farm){
      sig.farm = fs;
      setHTML(info, G.zoneCard(S, farmZone));
    }
    if (info) updateGrowthLive(info, farmZone);
    setText($('#exploreWater'), 'Su: %' + Math.round(G.waterPct(S)));
    setText($('#exploreAnimals'), G.totalAnimals(S) + ' hayvan');
    renderMapOverlay(false);
    applyWorldClasses();
  }
}
function renderDetail(force){
  const m = Z[detailZone];
  if (!m) return;
  const sheet = $('#detailSheet');
  const fs = farmSig();
  if (sheet && (force || fs !== sig.farm)){
    sig.farm = fs;
    sheet.innerHTML = G.zoneCard(S, detailZone, { detail:true });
  }
  if (sheet) updateGrowthLive(sheet, detailZone);
  const map = $('#detailMap');
  if (map){ setViewInstant(map, m.detailView || m.view); map.classList.add('zoomed'); applyRing(map, null); }
  renderMapOverlay(force);
  const planted = Object.keys(CROPS).filter(k => S.zones[k].planted).length;
  $('#detailExploreCrops').textContent = planted + ' tarla';
  $('#detailExploreAnimals').textContent = G.totalAnimals(S) + ' hayvan';
  $('#detailExploreWeather').textContent = G.weatherOf(S).name;
  applyWorldClasses();
}
function renderDetailLive(){
  if (currentScreen !== 'scr-detail') return;
  const sheet = $('#detailSheet');
  const fs = farmSig();
  if (sheet && fs !== sig.farm){ sig.farm = fs; sheet.innerHTML = G.zoneCard(S, detailZone, { detail:true }); }
  if (sheet) updateGrowthLive(sheet, detailZone);
  renderMapOverlay(false);
  applyWorldClasses();
}

/* ---------------- hayvanlar ---------------- */
function herdTitleFor(cat){
  return { cows:'İneklerin', chickens:'Tavukların', sheep:'Koyunların', goats:'Keçilerin' }[cat] || ANIMALS[cat].name;
}
function renderLivestockStatic(){
  const total = G.totalAnimals(S);
  setText($('#livestockSub'), S.profile.farm + ' · ' + total + ' hayvan');
  const hc = $('#herdCount');
  if (hc){
    if (!hc.dataset.val) hc.dataset.val = String(Number(hc.textContent) || 0);
    if (hc.textContent !== String(total)) animateNumber(hc, total, { dur:700 });
  }
  const a = ANIMALS[S.selectedCat] || ANIMALS.cows;
  setText($('#herdTitle'), herdTitleFor(S.selectedCat));
  setText($('#herdSub'), G.animalCount(S, S.selectedCat) + ' sürüde · detay için dokun');
  setHTML($('#catGrid'), ANIMAL_KEYS.map(k => G.catCard(S,k)).join(''));
  setHTML($('#cowList'), G.herdSamples(S, S.selectedCat).map(c => G.cowCard(S, S.selectedCat, c)).join(''));
  setHTML($('#animalUpgradeCard'), G.animalUpgradeCard(S));
  sig.cat = catSig();
  sig.cows = cowsSig();
  renderLivestockLive();
}
function catSig(){
  return S.selectedCat + '|' + ANIMAL_KEYS.map(k => G.animalCount(S,k) + (S.animals[k].production >= .5 ? '!' : '')).join(',');
}
function cowsSig(){
  return S.selectedCat + '|' + G.zoneLevel(S,'animal') + '|' + Math.round(G.animalAvgHealth(S)) + '|' + S.feedSlots.join('') + '|' + S.day;
}
function renderLivestockLive(){
  if (currentScreen !== 'scr-livestock') return;
  const total = G.totalAnimals(S), health = G.animalAvgHealth(S), prod = G.productionPct(S);
  const hc = $('#herdCount'); if (hc) hc.textContent = String(total);
  const hs = $('#herdStatus');
  if (hs){
    const ok = health >= 88;
    hs.className = 'pill ' + (ok ? 'mint' : health >= 74 ? 'warn' : 'red');
    hs.innerHTML = G.icon(ok ? 'i-shield' : 'i-bolt') + (ok ? 'Sağlıklı' : health >= 74 ? 'İyi' : 'Dikkat');
  }
  setRing($('#ringHealth'), health);
  setRing($('#ringFeed'), G.feedPct(S));
  setRing($('#ringProd'), prod);
  $('#gaugeHealthNote').textContent = health >= 92 ? 'Mükemmel' : health >= 80 ? 'İyi' : 'Dikkat';
  $('#gaugeFeedNote').textContent = Math.round(S.feed) + ' kg stok';
  $('#gaugeProdNote').textContent = prod >= 88 ? 'Hedefte' : prod >= 70 ? 'İyi' : 'Düşük';
  const done = S.feedSlots.filter(Boolean).length;
  $('#feedCount').textContent = done + ' / 3';
  const fsig = S.feedSlots.join('') + '|' + S.feedSlotTimes.join(',') + '|' + G.dueFeedSlot(S) + '|' + Math.floor(S.time / 30) + '|' + S.day;
  if (fsig !== sig.feed){ sig.feed = fsig; $('#feedSteps').innerHTML = G.feedSteps(S); }
  const due = G.dueFeedSlot(S), cost = G.feedCost(S), next = G.nextFeedSlot(S);
  const btn = $('#feedBtn');
  if (btn){
    btn.disabled = due < 0 || S.feed < cost;
    btn.classList.toggle('due', due >= 0);
    $('#feedBtnLabel').textContent = due >= 0 ? 'Yem Ver' : next >= 0 ? 'Sonraki ' + ['06:00','12:00','18:00'][next] : 'Besleme Tamam';
    $('#feedBtnCost').textContent = cost + ' kg';
  }
  $('#feedStock').textContent = Math.round(S.feed) + ' kg';
  $('#feedStockBar').style.width = G.feedPct(S) + '%';
  const psig = ANIMAL_KEYS.map(k => Math.round(S.animals[k].production * 10)).join(',');
  if (psig !== sig.prod){
    sig.prod = psig;
    $('#productionList').innerHTML = G.productionList(S);
  }
  const totalProd = ANIMAL_KEYS.reduce((a,k) => a + S.animals[k].production, 0);
  $('#productionSub').textContent = totalProd >= .05 ? 'Toplam ' + G.qty(totalProd) + ' birim ürün hazır' : 'Sağmal ürünleri topla';
  $('#collectBtn').disabled = totalProd < .05;
  if (catSig() !== sig.cat){ sig.cat = catSig(); $('#catGrid').innerHTML = ANIMAL_KEYS.map(k => G.catCard(S,k)).join(''); }
  if (cowsSig() !== sig.cows){
    sig.cows = cowsSig();
    $('#cowList').innerHTML = G.herdSamples(S, S.selectedCat).map(c => G.cowCard(S, S.selectedCat, c)).join('');
    $('#herdSub').textContent = G.animalCount(S, S.selectedCat) + ' sürüde · detay için dokun';
  }
  setText($('#livestockSub'), S.profile.farm + ' · ' + total + ' hayvan');
}

/* ---------------- pazar ---------------- */
function renderMarket(){
  const w = G.weatherOf(S);
  setText($('#marketDay'), S.day);
  setText($('#marketWeather'), w.name);
  setText($('#marketSeason'), G.seasonOf(S).name);
  setText($('#marketMoney'), G.money(S.money));
  setText($('#marketTrend'), G.marketMood(S));
  setText($('#marketCapacity'), G.qty(G.invTotal(S)) + ' / ' + G.fmt(G.storageCap(S)));
  setText($('#marketToday'), G.money(S.dayStats.earned));
  $$('#marketTabs .mtab').forEach(t => t.classList.toggle('active', t.dataset.mtab === S.marketTab));
  setHTML($('#marketContent'), G.marketContent(S));
  sig.market = S.marketTab + '|' + ALL_PRODUCT_KEYS.map(k => Math.round((S.inventory[k]||0)*10) + ':' + G.marketPrice(S,k)).join(',') + '|' + S.orders.map(o => o.delivered?1:0).join('');
}
function renderMarketLive(){
  if (currentScreen !== 'scr-market') return;
  setText($('#marketMoney'), G.money(S.money));
  setText($('#marketCapacity'), G.qty(G.invTotal(S)) + ' / ' + G.fmt(G.storageCap(S)));
  setText($('#marketToday'), G.money(S.dayStats.earned));
  setText($('#marketTrend'), G.marketMood(S));
}

/* ---------------- fabrikalar ---------------- */
function factoryLiveSig(){
  return FACTORY_KEYS.map(id => {
    const st = G.factoryState(S,id);
    return [G.factoryUnlocked(S,id)?1:0, st.slots, st.jobs.map(j => j.recipe + ':' + (j.done?1:0)).join('+'), st.jobs.filter(j=>j.done).length].join(':');
  }).join('|') + '|' + Math.round(S.money/10) + '|' + ALL_PRODUCT_KEYS.map(k => Math.round((S.inventory[k]||0)*10)).join(',') + '|' + (S.stats.crafted||0);
}
function renderFactory(){
  setHTML($('#factoryContent'), G.factoryContent(S));
  factorySig = factoryLiveSig();
  sig.factory = factorySig;
  updateFactoryBars();
}
function renderFactoryLive(force){
  if (currentScreen !== 'scr-factory') return;
  const fs = factoryLiveSig();
  if (force || fs !== factorySig){
    factorySig = fs; sig.factory = fs;
    setHTML($('#factoryContent'), G.factoryContent(S));
  }
  updateFactoryBars();
}
function updateFactoryBars(){
  const labels = $$('#factoryContent [data-fpct]');
  $$('#factoryContent [data-fjob]').forEach(el => {
    const parts = el.dataset.fjob.split(':'), fid = parts[0], jid = parts.slice(1).join(':');
    const st = G.factoryState(S,fid), job = st.jobs.find(j => j.id === jid);
    if (!job) return;
    const pct = Math.round(G.factoryJobPct(S,job));
    setWidth(el, pct);
    const label = labels.find(x => x.dataset.fpct === el.dataset.fjob);
    if (label) setText(label, '%' + pct);
  });
}

/* ---------------- profil / rapor ---------------- */
function renderProfile(){
  setText($('#profileLevel'), S.level);
  setText($('#profileName'), S.profile.name);
  setText($('#profileFarmName'), S.profile.farm);
  setText($('#profileSub'), G.seasonOf(S).name + ' · Gün ' + S.day);
  setText($('#profileRank'), G.rankName(S.level));
  setText($('#profileMoney'), G.fmt(S.money));
  setText($('#profileHarvests'), G.fmt(S.stats.harvests));
  setText($('#profileDays'), S.day);
  const need = G.xpNeed(S.level), pct = S.level >= G.FARM_MAX_LEVEL ? 100 : G.clamp(S.xp / need * 100, 0, 100);
  setWidth($('#profileXpBar'), pct);
  setText($('#profileXpText'), G.fmt(S.xp) + ' / ' + G.fmt(need) + ' XP');
  const ach = G.achievementCount(S);
  setText($('#achCount'), ach + ' / ' + G.ACHIEVEMENTS.length);
  const as = G.ACHIEVEMENTS.map(a => (S.achievements[a.id]?1:0)).join('');
  if (as !== sig.ach){ sig.ach = as; setHTML($('#achievementList'), G.achievementRows(S)); }
  updateSoundSwitches();
}
function renderProfileLive(){
  if (currentScreen !== 'scr-profile') return;
  setText($('#profileMoney'), G.fmt(S.money));
  setText($('#profileHarvests'), G.fmt(S.stats.harvests));
  setText($('#profileDays'), S.day);
  const need = G.xpNeed(S.level), pct = S.level >= G.FARM_MAX_LEVEL ? 100 : G.clamp(S.xp / need * 100, 0, 100);
  setWidth($('#profileXpBar'), pct);
  setText($('#profileXpText'), G.fmt(S.xp) + ' / ' + G.fmt(need) + ' XP');
  const as = G.ACHIEVEMENTS.map(a => (S.achievements[a.id]?1:0)).join('');
  if (as !== sig.ach){
    sig.ach = as;
    setHTML($('#achievementList'), G.achievementRows(S));
    setText($('#achCount'), G.achievementCount(S) + ' / ' + G.ACHIEVEMENTS.length);
  }
}
function renderReports(){
  const entries = S.history.slice(-6).concat([{ day:S.day, earned:S.dayStats.earned, harvests:S.dayStats.harvests, sold:S.dayStats.sold, feeds:S.dayStats.feeds, products:S.dayStats.products }]);
  const max = Math.max(1, ...entries.map(e => e.earned || 0));
  const best = Math.max(0, ...entries.map(e => e.earned || 0));
  const totalEarned = entries.reduce((a,e) => a + (e.earned || 0), 0);
  const totalHarvests = entries.reduce((a,e) => a + (e.harvests || 0), 0);
  $('#reportEarned').innerHTML = G.fmt(totalEarned) + ' <i>₺</i>';
  $('#reportDays').textContent = S.day + ' gün';
  $('#reportHarvests').textContent = G.fmt(totalHarvests);
  $('#reportBest').textContent = 'En iyi: ' + G.money(best);
  $('#barChart').innerHTML = entries.map(e => {
    const h = Math.max(8, Math.round((e.earned || 0) / max * 100));
    return `<i class="${(e.earned||0) === best && best > 0 ? 'hi' : ''}" style="height:${h}%"></i>`;
  }).join('');
  if (totalEarned <= 0) $('#barChart').innerHTML = `<span class="chart-empty">İlk satışını yap, grafik dolmaya başlasın.</span>`;
  $('#barLabels').innerHTML = entries.map(e => `<span>G${e.day}</span>`).join('');
  const colors = { house:'#D99A2A', tomato:'#E4573E', vegetable:'#5FA34A', corn:'#E7B23B', animal:'#B07B52', water:'#4E8FB0', storage:'#8E7A57' };
  $('#perfList').innerHTML = G.ZONE_KEYS.map(k => {
    const z = S.zones[k], status = G.zoneStatus(S,k);
    const sub = CROPS[k] ? G.qty(z.harvests || 0) + ' hasat' : k === 'animal' ? G.totalAnimals(S) + ' hayvan' : k === 'water' ? '%' + Math.round(G.waterPct(S)) + ' dolu' : k === 'storage' ? '%' + Math.round(G.invTotal(S)/G.storageCap(S)*100) + ' dolu' : '%' + Math.round(G.energyPct(S)) + ' enerji';
    return `<div class="perf-row"><i class="dot" style="background:${colors[k]}"></i><b>${Z[k].title}</b><span>Sv. ${G.zoneLevel(S,k)}</span><small>${sub}</small></div>`;
  }).join('');
}

/* ---------------- sayfalar / dialoglar ---------------- */
function openSheet(html, kind, data){
  sheetKind = kind || null;
  sheetData = data || null;
  const sc = $('#sheetScrim'), box = $('#sheetContent');
  if (!sc || !box) return;
  box.innerHTML = html;
  box.scrollTop = 0;
  sc.classList.add('open');
  sc.setAttribute('aria-hidden','false');
}
function closeSheet(){
  const sc = $('#sheetScrim');
  if (!sc) return;
  sc.classList.remove('open');
  sc.setAttribute('aria-hidden','true');
  sheetKind = null; sheetData = null;
}
function refreshSheet(){
  if (!sheetKind) return;
  if (sheetKind === 'weather') openSheet(G.weatherSheet(S), 'weather');
  else if (sheetKind === 'quests') openSheet(G.questSheet(S), 'quests');
  else if (sheetKind === 'daily') openSheet(G.dailySheet(S), 'daily');
  else if (sheetKind === 'notifications') openSheet(G.notificationsSheet(S), 'notifications');
  else if (sheetKind === 'help') openSheet(G.helpSheet(), 'help');
  else if (sheetKind === 'tutorial') openSheet(G.tutorialSheet(tutorialStep), 'tutorial');
  else if (sheetKind === 'cow' && sheetData) openSheet(G.cowSheet(S, sheetData.cat, sheetData.i), 'cow', sheetData);
}
function openWeather(){ openSheet(G.weatherSheet(S), 'weather'); feedback('tap'); }
function openQuests(){ openSheet(G.questSheet(S), 'quests'); feedback('tap'); }
function openDaily(){ openSheet(G.dailySheet(S), 'daily'); feedback('tap'); }
function openNotifications(){ openSheet(G.notificationsSheet(S), 'notifications'); feedback('tap'); }
function openHelp(){ openSheet(G.helpSheet(), 'help'); feedback('tap'); }
function startTutorial(){ tutorialStep = 0; openSheet(G.tutorialSheet(0), 'tutorial'); feedback('tap'); }
function tutorialNext(){ tutorialStep = Math.min(2, tutorialStep + 1); openSheet(G.tutorialSheet(tutorialStep), 'tutorial'); feedback('tap'); }
function tutorialPrev(){ tutorialStep = Math.max(0, tutorialStep - 1); openSheet(G.tutorialSheet(tutorialStep), 'tutorial'); feedback('tap'); }
function tutorialDone(){
  S.tutorialDone = true;
  closeSheet();
  saveState();
  toast('Çiftçi Okulu tamamlandı. İyi hasatlar!');
  feedback('success');
}
function tutorialSkip(){ S.tutorialDone = true; closeSheet(); saveState(); }
function openCow(cat, i){
  const c = cat || S.selectedCat;
  openSheet(G.cowSheet(S, c, i || 0), 'cow', { cat:c, i:i || 0 });
  feedback('tap');
}
function showConfirm(title, text, icon, cb){
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  $('#confirmIcon').innerHTML = G.icon(icon || 'i-help');
  confirmCb = cb || null;
  const c = $('#confirm');
  c.classList.add('open');
  c.setAttribute('aria-hidden','false');
}
function closeConfirm(){
  const c = $('#confirm');
  if (!c) return;
  c.classList.remove('open');
  c.setAttribute('aria-hidden','true');
  confirmCb = null;
}
function askReset(){
  showConfirm('Oyunu sıfırla', 'Tüm ilerlemen, paran, hayvanların ve yükseltmelerin silinecek. Bu işlem geri alınamaz.', 'i-refresh', () => {
    doNewGame();
    toast('Yeni oyun başlatıldı.');
  });
}
function askNewGame(){
  showConfirm('Yeni oyun', 'Mevcut çiftlik silinip sıfırdan başlanacak. Devam etmek istiyor musun?', 'i-refresh', () => {
    doNewGame();
    toast('Yeni bir çiftlik kuruldu.');
  });
}
function doNewGame(){
  if (!STATIC){ try { localStorage.removeItem(G.SAVE_KEY); } catch(e){} }
  cancelNativeNotifications();
  closeSetup();
  S = G.makeDefaultState();
  hasSave = false;
  gameStarted = false;
  startVisible = true;
  offlineApplied = false;
  simPaused = false;
  document.body.classList.remove('app-paused');
  farmZone = 'overview'; detailZone = 'tomato';
  S.selectedZone = 'overview';
  tutorialDoneReset();
  sig.world = ''; sig.overlay = ''; sig.farm = ''; sig.homeQuest = ''; sig.daily = ''; sig.market = ''; sig.ach = ''; sig.feed = ''; sig.prod = ''; sig.cat = ''; sig.cows = ''; sig.factory = ''; sig.worldClass = ''; factorySig = '';
  closeSheet(); closeMap(); closeConfirm(); closeLevelUp();
  const start = $('#startScreen');
  if (start){ start.classList.remove('hidden','leaving'); start.setAttribute('aria-hidden','false'); }
  startVisible = true;
  $$('.screen').forEach(sc => sc.classList.toggle('active', sc.id === 'scr-home'));
  currentScreen = 'scr-home';
  setTab('home');
  document.body.classList.remove('hide-nav');
  renderAll(true);
  renderWorld(true);
  renderStart();
  lastFrame = Date.now();
}
function tutorialDoneReset(){ /* yeni oyunda öğretici yeniden açılır */ }
function toggleSound(){
  S.sound = !S.sound;
  updateSoundSwitches(); renderStart(); saveState();
  if (S.sound) feedback('tap');
  toast(S.sound ? 'Ses efektleri açık' : 'Ses efektleri kapalı');
}
function toggleVibration(){
  S.vibration = !S.vibration;
  updateSoundSwitches(); saveState();
  if (S.vibration) buzz(15);
  toast(S.vibration ? 'Titreşim açık' : 'Titreşim kapalı');
}
function toggleNotifications(){
  S.notificationsEnabled = !S.notificationsEnabled;
  const bridge = nativeBridge();
  if (S.notificationsEnabled && bridge && typeof bridge.requestNotificationPermission === 'function'){
    try { bridge.requestNotificationPermission(); } catch(e){}
  }
  if (!S.notificationsEnabled) cancelNativeNotifications();
  else syncNativeNotifications(true);
  updateSoundSwitches(); saveState();
  toast(S.notificationsEnabled ? 'Çiftlik bildirimleri açık · hasat, besleme ve fabrika haberleri' : 'Çiftlik bildirimleri kapalı');
  feedback('tap');
}
function openSetup(edit){
  const sc = $('#setupScreen');
  if (!sc) return;
  if (!edit) setupAfterStart = setupAfterStart || !gameStarted;
  else setupAfterStart = false;
  setupOpen = true;
  const app = $('#app'); if (app) app.classList.add('setup-open');
  const player = $('#setupPlayer'), farm = $('#setupFarm');
  if (player) player.value = (S.profile && S.profile.name) || '';
  if (farm) farm.value = (S.profile && S.profile.farm) || '';
  const title = $('#setupTitle');
  if (title) title.textContent = edit ? 'Çiftlik profilini düzenle' : 'Çiftliğine isim ver';
  const desc = $('#setupDesc');
  if (desc) desc.textContent = edit ? 'Çiftçi adını ve çiftlik adını güncelle. Değişiklikler hemen kaydedilir.' : 'İlk girişte çiftliğini kendin adlandır. İsmin üst çubukta ve profilinde görünür.';
  const saveLabel = $('#setupSaveLabel');
  if (saveLabel) saveLabel.textContent = edit ? 'Değişiklikleri Kaydet' : 'Çiftliği Kur';
  const skip = $('#setupSkip');
  if (skip) skip.style.display = edit ? 'none' : '';
  sc.classList.add('open');
  sc.setAttribute('aria-hidden','false');
  setTimeout(() => { if (player) try { player.focus({ preventScroll:true }); } catch(e){} }, 220);
  feedback('tap');
}
function closeSetup(){
  const sc = $('#setupScreen');
  if (!sc) return;
  sc.classList.remove('open');
  sc.setAttribute('aria-hidden','true');
  setupOpen = false;
  const app = $('#app'); if (app) app.classList.remove('setup-open');
}
function saveSetup(defaults){
  const player = $('#setupPlayer'), farm = $('#setupFarm');
  const fallbackPlayer = 'Çiftçi', fallbackFarm = 'Yeşil Vadi Çiftliği';
  let name = defaults ? fallbackPlayer : ((player && player.value) || '').trim();
  let farmName = defaults ? fallbackFarm : ((farm && farm.value) || '').trim();
  if (!name) name = fallbackPlayer;
  if (!farmName) farmName = fallbackFarm;
  S.profile = S.profile || {};
  S.profile.name = name.slice(0,18);
  S.profile.farm = farmName.slice(0,30);
  S.profile.onboarded = true;
  if (S.notificationsEnabled && !S.flags.notifAsked){
    S.flags.notifAsked = true;
    const bridge = nativeBridge();
    if (bridge && typeof bridge.requestNotificationPermission === 'function'){
      try { bridge.requestNotificationPermission(); } catch(e){}
    }
  }
  const proceed = !gameStarted && setupAfterStart;
  setupAfterStart = false;
  closeSetup();
  saveState();
  if (proceed){
    startGame(false);
  } else {
    renderAll(true);
    toast('Çiftlik profili güncellendi · ' + S.profile.farm);
    feedback('success');
  }
}
function openMenu(){
  startVisible = true;
  const start = $('#startScreen');
  if (start){ start.classList.remove('hidden','leaving'); start.setAttribute('aria-hidden','false'); }
  renderStart();
  renderWorld(true);
  saveState();
  feedback('tap');
}
function startGame(instant){
  if (!S.profile.onboarded && !STATIC && !PARAMS.has('selftest')){
    setupAfterStart = true;
    openSetup(false);
    return;
  }
  const wasStarted = gameStarted;
  gameStarted = true;
  const start = $('#startScreen');
  let off = null;
  if (!wasStarted) off = applyOffline();
  startVisible = false;
  lastFrame = Date.now();
  const finish = () => {
    if (start){ start.classList.add('hidden'); start.classList.remove('leaving'); start.setAttribute('aria-hidden','true'); }
    if (!wasStarted && S.notificationsEnabled && !S.flags.notifAsked && !STATIC){
      S.flags.notifAsked = true;
      const bridge = nativeBridge();
      if (bridge && typeof bridge.requestNotificationPermission === 'function'){
        try { bridge.requestNotificationPermission(); } catch(e){}
      }
    }
    renderAll(true);
    renderStart();
    saveState();
    if (!wasStarted){
      if (!S.tutorialDone && !STATIC && !PARAMS.has('selftest')){
        setTimeout(() => { if (gameStarted && !S.tutorialDone) startTutorial(); }, 650);
      } else if (off && off.sec > 300 && !STATIC){
        setTimeout(() => { if (gameStarted) openSheet(offlineSheet(off), 'offline'); }, 500);
      } else {
        toast('Çiftliğine hoş geldin, ' + G.rankName(S.level) + '!');
      }
    }
  };
  if (start && !STATIC && !instant && !REDUCED){
    start.classList.add('leaving');
    setTimeout(finish, 520);
  } else {
    finish();
  }
  feedback('success');
}
function claimDaily(){
  if (!G.dailyAvailable(S)){ toast('Bugünkü ödülü aldın. Yarın tekrar gel.'); feedback('error'); return; }
  const prev = S.daily.lastClaimedDate || '';
  const continuing = prev === G.yesterdayKey();
  const pos = continuing ? S.daily.streak % 7 : 0;
  const r = G.DAILY_REWARDS[pos];
  S.money += r.money;
  S.feed = Math.min(G.feedCap(S), S.feed + r.feed);
  S.energy = Math.min(G.energyCap(S), S.energy + r.energy);
  S.daily.streak = (continuing ? S.daily.streak : 0) + 1;
  S.daily.lastClaimedDate = G.dateKey();
  S.daily.lastClaimedDay = S.day;
  addXp(r.xp || 0);
  addNotification('Günlük ödül alındı', r.label + ' · ' + S.daily.streak + ' günlük seri.', 'i-gift');
  saveState(); renderAll(true); refreshSheet();
  toast('Günlük ödül · ' + r.label);
  feedback('coin'); confetti(18);
}
function claimQuest(id){
  const q = S.quests.find(x => x.id === id);
  if (!q || q.claimed) return;
  if (q.progress < q.target){ toast('Görev henüz tamamlanmadı.'); feedback('error'); return; }
  q.claimed = true;
  S.money += q.reward;
  addXp(q.xp || 0);
  saveState(); renderAll(true); refreshSheet();
  toast('Görev tamamlandı · ' + q.name + ' +' + G.money(q.reward));
  feedback('coin');
}
function markAllRead(){
  S.notifications.forEach(n => n.read = true);
  updateBell(); refreshSheet(); saveState();
  toast('Bildirimler okundu.');
  feedback('tap');
}
function toggleAutoFeed(){
  if (G.zoneLevel(S,'house') < 4){ toast('Otomatik yem için çiftlik evi Sv. 4 gerekli.'); feedback('error'); return; }
  S.autoFeed = !S.autoFeed;
  saveState(); renderAll(true);
  toast(S.autoFeed ? 'Otomatik yem açık · her sabah 3 öğün' : 'Otomatik yem kapalı');
  feedback('success');
}

/* ---------------- eylemler ---------------- */
function actPlant(key){
  const c = CROPS[key], z = S.zones[key];
  if (!c || !z) return;
  if (z.planted){ toast('Bu tarla zaten ekili.'); feedback('error'); return; }
  if (S.money < c.seedCost){ toast('Yetersiz kasa · tohum ' + G.money(c.seedCost)); feedback('error'); return; }
  if (S.energy < 2){ toast('Enerji yetersiz · biraz güneş bekle.'); feedback('error'); return; }
  S.money -= c.seedCost; S.stats.spent += c.seedCost;
  S.energy = Math.max(0, S.energy - 2);
  z.planted = true; z.growth = 0; z.ready = false;
  const w = G.weatherOf(S);
  z.wateredUntil = w.rain > 0 ? G.nowAbs(S) + 600 : 0;
  addXp(4);
  saveState(); renderAll(true);
  toast(c.short + ' ekildi · ' + (w.rain > 0 ? 'yağmur suladı' : 'sulamayı unutma'));
  feedback('success');
}
function actWater(key){
  const c = CROPS[key], z = S.zones[key];
  if (!c || !z || !z.planted){ toast('Önce ekim yap.'); feedback('error'); return; }
  if (z.ready){ toast('Tarla hasada hazır; önce ürünü topla.'); feedback('error'); return; }
  if (G.isWatered(S,z)){ toast('Toprak zaten sulu.'); feedback('error'); return; }
  if (S.water < c.waterUse){ toast('Su yetersiz · gereken ' + G.fmt(c.waterUse) + ' L. Tankı doldur.'); feedback('error'); return; }
  if (S.energy < 3){ toast('Enerji yetersiz · sulama için 3 enerji gerekli.'); feedback('error'); return; }
  S.water -= c.waterUse; S.stats.waterUsed += c.waterUse;
  S.energy = Math.max(0, S.energy - 3);
  z.wateredUntil = G.nowAbs(S) + 600;
  questProgress('water', 1);
  addXp(3);
  saveState(); renderAll(true);
  toast(c.short + ' sulandı · ' + G.fmt(c.waterUse) + ' L');
  feedback('water');
}
function actHarvest(key){
  const r = harvestOne(key, true);
  if (!r){ toast('Hasada hazır ürün yok.'); feedback('error'); return; }
  if (r.full){ toast('Depo dolu · önce ürün sat.'); feedback('error'); return; }
  saveState(); renderAll(true);
  toast(CROPS[key].short + ' hasat edildi · ' + r.amount + ' kg depoya girdi' + (r.partial ? ' (depo doldu)' : ''));
  feedback('success'); confetti(10);
}
function autoWater(){
  const dry = Object.keys(CROPS).filter(k => S.zones[k].planted && !S.zones[k].ready && !G.isWatered(S, S.zones[k]));
  if (!dry.length){ toast('Sulanacak kuru tarla yok.'); feedback('error'); return; }
  const need = dry.reduce((a,k) => a + CROPS[k].waterUse, 0);
  const energy = dry.length * 3;
  if (S.water < need){ toast('Su yetersiz · gereken ' + G.fmt(need) + ' L. Tankı doldur.'); feedback('error'); return; }
  if (S.energy < energy){ toast('Enerji yetersiz · gereken ' + energy + ' enerji.'); feedback('error'); return; }
  S.water -= need; S.stats.waterUsed += need;
  S.energy -= energy;
  const until = G.nowAbs(S) + 600;
  dry.forEach(k => { S.zones[k].wateredUntil = until; });
  questProgress('water', dry.length);
  addXp(2 + dry.length * 2);
  saveState(); renderAll(true);
  toast(dry.length + ' tarla sulandı · ' + G.fmt(need) + ' L');
  feedback('water');
}

/* ================= BANK ACTIONS ================= */
function actOpenBank(){
  showScreen('scr-bank', 'bank');
  feedback('tap');
}
function actTakeLoan(){
  const amount = Number($('#loanAmount')?.value || 0);
  const maxLoan = Math.max(1000, Math.floor(S.money * 5));
  if (amount < 1000 || amount > maxLoan){
    toast('Miktar 1.000 - ' + G.money(maxLoan) + ' aralığında olmalı.');
    feedback('error');
    return;
  }
  const principal = Math.floor(amount);
  const dailyInterest = Math.floor(principal * 0.02);
  const dueDay = S.day + 30;
  S.credit = { active:true, principal, interest:0, dueDay, totalPaid:0, lastInterestDay:S.day };
  S.money += principal;
  S.stats.earned += principal;
  saveState(); renderAll(true);
  toast('Kredi onaylandı! ' + G.money(principal) + ' hesabınıza eklendi.');
  feedback('success');
}
function repayLoan(amount){
  const c = S.credit;
  const remaining = c.principal + c.interest - c.totalPaid;
  const payAmount = Math.min(amount || remaining, remaining, S.money);
  if (payAmount <= 0){ toast('Ödenecek tutar yok.'); feedback('error'); return; }
  S.money -= payAmount;
  c.totalPaid += payAmount;
  if (c.totalPaid >= c.principal + c.interest){
    c.active = false; c.principal = 0; c.interest = 0; c.dueDay = 0; c.totalPaid = 0; c.lastInterestDay = 0;
    toast('Kredi tamamen ödendi! Tebrikler.');
    feedback('success');
  } else {
    toast('Kredi ödemesi yapıldı: ' + G.money(payAmount));
    feedback('success');
  }
  saveState(); renderAll(true);
}
function actRepayLoan(){
  const c = S.credit;
  if (!c.active){ toast('Aktif kredi yok.'); feedback('error'); return; }
  const remaining = c.principal + c.interest - c.totalPaid;
  const amount = Number($('#loanAmount')?.value || remaining);
  repayLoan(amount);
}
function actRepayAll(){
  const c = S.credit;
  if (!c.active){ toast('Aktif kredi yok.'); feedback('error'); return; }
  const remaining = c.principal + c.interest - c.totalPaid;
  if (S.money < remaining){
    toast('Tüm borcu ödemek için yeterli bakiyeniz yok. (Gereken: ' + G.money(remaining) + ')');
    feedback('error');
    return;
  }
  repayLoan(remaining);
}

/* ================= SOCIAL ACTIONS ================= */
function actFriendVisit(friendId){
  const friend = G.FRIENDS.find(f => f.id === friendId);
  if (!friend) return;
  if (!friend.online){
    toast(friend.name + ' çevrimiçi değil. Hediye gönderebilirsiniz.');
    feedback('error');
    return;
  }
  const reward = G.FRIEND_INTERACTIONS.visit;
  S.xp += reward.xp;
  S.money += reward.money;
  toast(friend.name + ' çiftliğini ziyaret ettiniz! +' + reward.xp + ' XP, +' + G.money(reward.money));
  feedback('success');
  G.renderFriends(S);
}
function actFriendGift(friendId){
  const friend = G.FRIENDS.find(f => f.id === friendId);
  if (!friend) return;
  const reward = G.FRIEND_INTERACTIONS.gift;
  S.xp += reward.xp;
  S.money += reward.money;
  toast('Hediye gönderildi: ' + friend.name + ' · +' + reward.xp + ' XP, +' + G.money(reward.money));
  feedback('success');
  G.renderFriends(S);
}
function actFriendHelp(friendId){
  const friend = G.FRIENDS.find(f => f.id === friendId);
  if (!friend) return;
  if (!friend.online){
    toast(friend.name + ' çevrimiçi değil, yardım edemezsiniz.');
    feedback('error');
    return;
  }
  const reward = G.FRIEND_INTERACTIONS.help;
  S.xp += reward.xp;
  S.money += reward.money;
  toast(friend.name + ' çiftliğinde yardım ettiniz! +' + reward.xp + ' XP, +' + G.money(reward.money));
  feedback('success');
  G.renderFriends(S);
}
function actFriendTrade(friendId){
  const friend = G.FRIENDS.find(f => f.id === friendId);
  if (!friend) return;
  if (!friend.online){
    toast(friend.name + ' çevrimiçi değil, ticaret yapamazsınız.');
    feedback('error');
    return;
  }
  const reward = G.FRIEND_INTERACTIONS.trade;
  S.xp += reward.xp;
  S.money += reward.money;
  toast(friend.name + ' ile ticaret yaptınız! +' + reward.xp + ' XP, +' + G.money(reward.money));
  feedback('success');
  G.renderFriends(S);
}
function actAddFriend(){
  const code = prompt('Arkadaş kodunu girin (örn: FRIEND_12345):');
  if (!code) return;
  const newFriend = {
    id: 'friend_' + Date.now(),
    name: 'Yeni Arkadaş',
    level: Math.floor(Math.random() * 20) + 5,
    farm: 'Yeni Çiftlik',
    avatar: ['👨‍🌾','👩‍🌾','🧑‍🌾'][Math.floor(Math.random()*3)],
    lastVisit: 'Az önce',
    online: true,
    gifts: ['seed','fertilizer','water'][Math.floor(Math.random()*3)]
  };
  G.FRIENDS.push(newFriend);
  S.social.friends.push({id: newFriend.id, lastInteraction: 0});
  toast('Yeni arkadaş eklendi: ' + newFriend.name + ' (Seviye ' + newFriend.level + ')');
  feedback('success');
  if (currentScreen === 'scr-community'){
    const content = $('#communityContent');
    const activeBtn = $('.com-tab-btn.active');
    if (activeBtn && activeBtn.dataset.comTab === 'friends' && content){
      content.innerHTML = G.renderFriends(S);
    }
  }
}
function switchOnlineTab(tab){
  $$('.online-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.onlineTab === tab));
  const content = $('#onlineContent');
  if (!content) return;
  if (tab === 'leaderboard') content.innerHTML = G.renderLeaderboard(S);
  else if (tab === 'friends') content.innerHTML = G.renderFriends(S);
  else if (tab === 'events') content.innerHTML = G.renderEvents(S);
  else if (tab === 'features') content.innerHTML = G.renderOnlineFeatures(S);
  feedback('tap');
}
function actOnlineFeature(feature){
  const f = G.ONLINE_FEATURES[feature];
  if (!f || f.unlocked){
    toast(f ? f.name + ' zaten açık.' : 'Özellik bulunamadı.');
    return;
  }
  if (S.level < f.reqLevel){
    toast(f.name + ' için seviye ' + f.reqLevel + ' gerekli. (Siz: ' + S.level + ')');
    feedback('error');
    return;
  }
  f.unlocked = true;
  toast(f.name + ' özelliği açıldı!');
  feedback('success');
  if (currentScreen === 'scr-online'){
    const content = $('#onlineContent');
    if (content) content.innerHTML = G.renderOnlineFeatures(S);
  }
}
function selectCat(cat){
  if (!ANIMALS[cat]) return;
  S.selectedCat = cat;
  renderLivestockStatic();
  feedback('tap');
}

/* ---------------- yönlendirme / döngü ---------------- */
function routeFromHash(){
  const h = (location.hash || '').replace('#','');
  if (!h) return;
  if (h === 'start'){ openMenu(); return; }
  if (startVisible){ startGame(true); }
  if (h === 'home'){ showTab('home'); return; }
  if (h === 'farm'){ showTab('farm'); return; }
  if (h === 'livestock'){ showTab('livestock'); return; }
  if (h === 'factory'){ showTab('factory'); return; }
  if (h === 'market'){ showTab('market'); return; }
  if (h === 'profile'){ showTab('profile'); return; }
  if (h === 'reports' || h === 'analytics'){ showTab('reports'); return; }
  if (h === 'bank'){ showTab('bank'); return; }
  if (h === 'community'){ showTab('community'); return; }
  if (h.indexOf('farm-') === 0){ showTab('farm'); selectZone(h.slice(5), { animate:false, silent:true }); return; }
  if (h.indexOf('detail-') === 0){ showTab('farm'); openDetail(h.slice(7)); return; }
  if (h.indexOf('map-') === 0){ showTab('farm'); openMap(h.slice(4)); return; }
}
function renderAll(force){
  renderWorld(force);
  renderStatus();
  renderStart();
  updateSoundSwitches();
  updateBell();
  if (currentScreen === 'scr-home') renderHome(force);
  else if (currentScreen === 'scr-farm') renderFarm(force);
  else if (currentScreen === 'scr-livestock') renderLivestockStatic();
  else if (currentScreen === 'scr-factory') renderFactory();
  else if (currentScreen === 'scr-detail') renderDetail(force);
  else if (currentScreen === 'scr-market') renderMarket();
  else if (currentScreen === 'scr-profile') renderProfile();
  else if (currentScreen === 'scr-analytics') renderReports();
  else if (currentScreen === 'scr-community') renderCommunity();
  else if (currentScreen === 'scr-bank') renderBankScreen();
  renderMapOverlay(force);
}
function tickUI(){
  renderStatus();
  if (startVisible) renderStart();
  if (currentScreen === 'scr-home') renderHomeLive();
  else if (currentScreen === 'scr-farm') renderFarmLive();
  else if (currentScreen === 'scr-detail') renderDetailLive();
  else if (currentScreen === 'scr-livestock') renderLivestockLive();
  else if (currentScreen === 'scr-factory') renderFactoryLive();
  else if (currentScreen === 'scr-market') renderMarketLive();
  else if (currentScreen === 'scr-profile') renderProfileLive();
  else if (currentScreen === 'scr-community') renderCommunityLive();
  else if (currentScreen === 'scr-bank') renderBankScreenLive();
  updateBell();
}
function tick(){
  if (!gameStarted || STATIC || simPaused || document.hidden){ lastFrame = Date.now(); return; }
  const now = Date.now();
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt <= 0) return;
  dt = Math.min(5, dt);
  stepGame(dt * G.MIN_PER_SEC, false);
  if (newReadyPulse){
    newReadyPulse = false;
    renderMapOverlay(true);
    if (currentScreen === 'scr-farm'){ sig.farm = ''; renderFarm(true); }
    if (currentScreen === 'scr-detail'){ sig.farm = ''; renderDetail(true); }
  }
  if (now - lastAlertAt > 1500){ lastAlertAt = now; checkAlerts(); }
  if (now - lastUiAt > 240){ lastUiAt = now; tickUI(); }
  if (now - lastSaveAt > 9000) saveState();
}
function pauseApp(){
  if (!gameStarted || STATIC) return;
  simPaused = true;
  lastFrame = Date.now();
  document.body.classList.add('app-paused');
  saveState();
  syncNativeNotifications(true);
}
function resumeApp(){
  if (!gameStarted || STATIC) return;
  cancelNativeNotifications();
  document.body.classList.remove('app-paused');
  const off = applyOffline();
  simPaused = false;
  lastFrame = Date.now();
  lastAlertAt = 0;
  checkAlerts();
  renderAll(true);
  if (off && off.sec > 60){
    toast('Çiftlik seni bekledi · ' + Math.round(off.sec / 60) + ' dk · ' + off.ready + ' tarla hazır');
  }
}

/* ---------------- olaylar ---------------- */
function bind(){
  $$('.screen').forEach(sc => sc.addEventListener('scroll', queueTopbarScrim, { passive:true }));
  window.addEventListener('resize', queueTopbarScrim, { passive:true });
  const tabbar = $('#tabbar');
  if (tabbar) tabbar.addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t){ showTab(t.dataset.nav); e.stopPropagation(); feedback('tap'); }
  });
  const chips = $('#farmChips');
  if (chips) chips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    selectZone(chip.dataset.zone);
    const scr = $('#scr-farm'); if (scr) scr.scrollTo({ top:0, behavior:STATIC ? 'auto' : 'smooth' });
    e.stopPropagation();
  });
  const farmMap = $('#farmMap');
  if (farmMap) farmMap.addEventListener('click', e => {
    if (currentScreen !== 'scr-farm') return;
    const z = zoneAt(farmMap, e);
    if (!z) return;
    if (z === farmZone && farmZone !== 'overview') openDetail(z);
    else selectZone(z);
    e.stopPropagation();
  });
  const expandFarm = $('#expandFarm');
  if (expandFarm) expandFarm.addEventListener('click', e => { e.stopPropagation(); openMap(farmZone); });
  const expandDetail = $('#expandDetail');
  if (expandDetail) expandDetail.addEventListener('click', e => { e.stopPropagation(); openMap(detailZone); });
  const closeMapBtn = $('#closeMap');
  if (closeMapBtn) closeMapBtn.addEventListener('click', e => { e.stopPropagation(); closeMap(); });
  const mapModal = $('#mapModal');
  if (mapModal) mapModal.addEventListener('click', e => { if (e.target === mapModal) closeMap(); });
  const bell = $('#bellBtn');
  if (bell) bell.addEventListener('click', e => { e.stopPropagation(); openNotifications(); });
  const marketTabs = $('#marketTabs');
  if (marketTabs) marketTabs.addEventListener('click', e => {
    const t = e.target.closest('.mtab');
    if (!t) return;
    S.marketTab = t.dataset.mtab;
    renderMarket();
    feedback('tap');
    e.stopPropagation();
  });
  const communityTabsContainer = $('#communityContent')?.parentElement?.querySelector('.community-tabs');
  if (communityTabsContainer) {
    communityTabsContainer.addEventListener('click', e => {
      const btn = e.target.closest('.com-tab-btn');
      if (btn) {
        const tab = btn.dataset.comTab;
        const content = $('#communityContent');
        $$('.com-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.comTab === tab));
        if (tab === 'friends') content.innerHTML = G.renderFriends(S);
        else if (tab === 'leaderboard') content.innerHTML = G.renderLeaderboard(S);
        else if (tab === 'events') content.innerHTML = G.renderEvents(S);
        else if (tab === 'features') content.innerHTML = G.renderOnlineFeatures(S);
        feedback('tap');
      }
    });
  }
  const scrim = $('#sheetScrim');
  if (scrim) scrim.addEventListener('click', e => { if (e.target === scrim) closeSheet(); });
  const confirm = $('#confirm');
  if (confirm) confirm.addEventListener('click', e => {
    const b = e.target.closest('[data-confirm]');
    if (!b) { if (e.target === confirm) closeConfirm(); return; }
    const yes = b.dataset.confirm === 'yes';
    const cb = confirmCb;
    closeConfirm();
    if (yes && cb) cb();
  });
  const level = $('#levelUp');
  if (level) level.addEventListener('click', e => { if (e.target === level) closeLevelUp(); });

  document.addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl){
      const type = actionEl.dataset.action;
      const zone = actionEl.dataset.zone;
      switch(type){
        case 'start': startGame(); break;
        case 'newgame': askNewGame(); break;
        case 'daily': openDaily(); break;
        case 'quests': openQuests(); break;
        case 'weather': openWeather(); break;
        case 'notifications': openNotifications(); break;
        case 'help': openHelp(); break;
        case 'tutorial': startTutorial(); break;
        case 'tutorial-next': tutorialNext(); break;
        case 'tutorial-prev': tutorialPrev(); break;
        case 'tutorial-done': tutorialDone(); break;
        case 'tutorial-skip': tutorialSkip(); break;
        case 'sound': toggleSound(); break;
        case 'vibration': toggleVibration(); break;
        case 'notifications-toggle': toggleNotifications(); break;
        case 'edit-profile': openSetup(true); break;
        case 'setup-save': saveSetup(); break;
        case 'setup-skip': saveSetup(true); break;
        case 'factory-unlock': doFactoryUnlock(actionEl.dataset.factory); break;
        case 'factory-slot': doFactorySlot(actionEl.dataset.factory); break;
        case 'factory-start': doFactoryStart(actionEl.dataset.factory, actionEl.dataset.recipe); break;
        case 'factory-collect': factoryCollect(actionEl.dataset.factory, actionEl.dataset.job); break;
        case 'factory-collect-all': factoryCollectAll(actionEl.dataset.factory); break;
        case 'menu': openMenu(); break;
        case 'reset': askReset(); break;
        case 'reports': showTab('reports'); break;
        case 'scroll-upgrade': {
          const card = $('#animalUpgradeCard');
          if (card){ card.scrollIntoView({ behavior:STATIC ? 'auto' : 'smooth', block:'center' }); card.classList.add('just-upgraded'); setTimeout(() => card.classList.remove('just-upgraded'), 700); }
          break;
        }
        case 'close-sheet': closeSheet(); break;
        case 'close-map': closeMap(); break;
        case 'open-map': openMap(zone || (currentScreen === 'scr-detail' ? detailZone : farmZone)); break;
        case 'levelup-close': closeLevelUp(); break;
        case 'plant': actPlant(zone); break;
        case 'water': actWater(zone); break;
        case 'harvest': actHarvest(zone); break;
        case 'harvest-all': harvestAll(); break;
        case 'auto-water': autoWater(); break;
        case 'buy-water': doBuy('water'); break;
        case 'buy-energy': doBuy('energy'); break;
        case 'buy-feed': doBuy('feed'); break;
        case 'buy': doBuy(actionEl.dataset.buy); break;
        case 'feed': doFeed(); break;
        case 'collect': collectAll(); break;
        case 'collect-cat': collectAll(actionEl.dataset.cat); break;
        case 'sell': doSell(actionEl.dataset.item); break;
        case 'sellAll': doSellAll(); break;
        case 'deliver': doDeliver(actionEl.dataset.order); break;
        case 'upgrade': doUpgrade(zone); break;
        case 'toggle-autofeed': toggleAutoFeed(); break;
        case 'detail': openDetail(zone); break;
        case 'select-cat': selectCat(actionEl.dataset.cat); break;
        case 'open-cow': openCow(actionEl.dataset.cat, Number(actionEl.dataset.i)); break;
        case 'claim-quest': claimQuest(actionEl.dataset.quest); break;
        case 'claim-daily': claimDaily(); break;
        case 'mark-read': markAllRead(); break;
        case 'friend-visit': actFriendVisit(actionEl.dataset.friend); break;
        case 'friend-gift': actFriendGift(actionEl.dataset.friend); break;
        case 'friend-help': actFriendHelp(actionEl.dataset.friend); break;
        case 'friend-trade': actFriendTrade(actionEl.dataset.friend); break;
        case 'add-friend': actAddFriend(); break;
        case 'take-loan': actTakeLoan(); break;
        case 'repay-loan': actRepayLoan(); break;
        case 'repay-all': actRepayAll(); break;
        case 'online-tab': switchOnlineTab(actionEl.dataset.onlineTab); break;
        case 'online-feature': actOnlineFeature(actionEl.dataset.onlineFeature); break;
      }
      return;
    }
    const gotoEl = e.target.closest('[data-goto]');
    if (gotoEl){
      const target = gotoEl.dataset.goto, zone = gotoEl.dataset.zone;
      if (target === 'farm'){
        showTab('farm');
        if (zone) selectZone(zone, { animate:false });
      } else if (target === 'livestock' || target === 'factory' || target === 'market' || target === 'profile' || target === 'home' || target === 'reports'){
        showTab(target);
      }
      feedback('tap');
      return;
    }
    const back = e.target.closest('[data-back]');
    if (back){ showTab(back.dataset.back || 'farm'); feedback('tap'); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav){ showTab(nav.dataset.nav); feedback('tap'); return; }
    const zoneEl = e.target.closest('[data-zone]');
    if (zoneEl && !e.target.closest('#farmChips') && !e.target.closest('#farmMap')){
      const zone = zoneEl.dataset.zone;
      if (currentScreen !== 'scr-farm') showTab('farm');
      selectZone(zone, { animate:false });
      feedback('tap');
      return;
    }
  });

  document.addEventListener('pointerdown', () => { ensureAudio(); }, { passive:true });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ closeSheet(); closeMap(); closeLevelUp(); closeConfirm(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden){
      pauseApp();
    } else if (gameStarted && !STATIC){
      resumeApp();
    }
  });
  window.addEventListener('pagehide', () => pauseApp());
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('resize', () => { renderWorld(true); });
  /* Android WebView yaşam döngüsü köprüsü. */
  if (G && typeof G === 'object'){
    G.pauseApp = pauseApp;
    G.resumeApp = resumeApp;
    G.syncNativeNotifications = syncNativeNotifications;
    G.openSetup = openSetup;
  }
}

/* ---------------- test ---------------- */
function runSelftest(){
  const results = [];
  const add = (name, ok, info) => { results.push({ name, ok:!!ok, info:info || '' }); };
  const bad = html => /undefined|NaN/.test(html);
  const t = G.makeDefaultState();
  try {
    add('varsayılan durum', t.version === 3 && t.money === 2500 && t.day === 1, 'v' + t.version);
    add('görev üretimi', G.makeQuests(3).length === 3);
    add('sipariş üretimi', G.makeOrders(2).length === 2);
    add('yükseltme maliyeti', G.zoneUpgradeCost('house',1) === 1500, G.zoneUpgradeCost('house',1));
    add('su kapasitesi', G.waterCap({ zones:{ water:{ level:2 } } }) === 12500);
    add('büyüme oranı', G.cropRate(t,'tomato') > 0);
    add('hasat verimi', G.cropYield(t,'tomato') > 0);
    add('besleme durumu', G.feedSlotState(t,0) === 'current', G.feedSlotState(t,0));
    add('harita katmanı', G.mapOverlay(t).length > 500 && !bad(G.mapOverlay(t)));
    const htmls = [];
    ['overview','house','tomato','vegetable','corn','animal','water','storage'].forEach(k => htmls.push(G.zoneCard(t,k)));
    htmls.push(G.zoneCard(t,'tomato',{detail:true}));
    htmls.push(G.marketContent(t));
    t.marketTab = 'supply'; htmls.push(G.marketContent(t));
    t.marketTab = 'orders'; htmls.push(G.marketContent(t));
    htmls.push(G.questSheet(t), G.dailySheet(t), G.weatherSheet(t), G.helpSheet(), G.tutorialSheet(0));
    htmls.push(G.achievementRows(t), G.notificationRows(t), G.cowSheet(t,'cows',0));
    htmls.push(G.feedSteps(t), G.productionList(t), G.animalUpgradeCard(t), G.catCard(t,'cows'), G.cowCard(t,'cows',G.herdSamples(t,'cows')[0]));
    htmls.push(G.supplyRows(t), G.orderRows(t), G.marketRows(t), G.questRow(t.quests[0],t), G.dailyCard(t));
    htmls.push(G.factoryContent(t), G.factoryCard(t,'dairy'), G.factoryRecipeRow(t,'dairy',G.FACTORY_DEFS.dairy.recipes[0]));
    add('şablonlar dolu', htmls.every(h => h && h.length > 40));
    add('şablonlarda undefined/NaN yok', htmls.every(h => !bad(h)));
    add('başlangıç hektarı', Math.abs(G.totalHectares(t) - 12.5) < .01, G.totalHectares(t));
    const t5 = G.makeDefaultState();
    Object.keys(t5.zones).forEach(k => { t5.zones[k].level = 5; });
    add('maksimum hektar', Math.abs(G.totalHectares(t5) - 31.5) < .01, G.totalHectares(t5));
    add('hektar verime yansıyor', G.cropYield(t5,'tomato') > G.cropYield(t,'tomato'));
    const maxMap = G.mapOverlay(t5);
    add('yükseltme görselleri', maxMap.length > G.mapOverlay(t).length * 1.35 && !bad(maxMap), maxMap.length + ' karakter');
    const td = G.makeDefaultState();
    td.day = 9;
    td.daily.lastClaimedDate = G.dateKey();
    add('günlük ödül gerçek güne bağlı', G.dailyAvailable(td) === false);
    td.daily.lastClaimedDate = G.yesterdayKey();
    add('günlük seri devamı', G.dailyAvailable(td) === true && G.dailyPos(td) === 0);
    currentScreen = 'scr-market'; farmZone = 'tomato'; t.selectedZone = 'tomato';
    showTab('farm');
    add('çiftlik sekmesi genel bakış', farmZone === 'overview' && S.selectedZone === 'overview', farmZone + '/' + S.selectedZone);
    const backup = S;
    S = G.makeDefaultState();
    S.zones.tomato.growth = 0; S.zones.tomato.ready = false;
    advance(240, true);
    add('büyüme simülasyonu', S.zones.tomato.ready === true, 'growth=' + S.zones.tomato.growth);
    S.time = 1439;
    advance(2, true);
    add('gün geçişi', S.day === 2 && S.questDay === 2 && S.orderDay === 2, 'day=' + S.day);
    add('günlük görevler yenilendi', S.quests.length === 3 && S.quests[0].day === 2);
    S = G.makeDefaultState();
    const m0 = S.money;
    S.zones.tomato.planted = false; S.zones.tomato.growth = 0; S.zones.tomato.ready = false; S.zones.tomato.wateredUntil = 0;
    actPlant('tomato');
    add('ekim eylemi', S.zones.tomato.planted === true && S.money < m0, 'money=' + S.money);
    const w0 = S.water;
    actWater('tomato');
    add('sulama eylemi', S.water < w0 && S.zones.tomato.wateredUntil > G.nowAbs(S));
    S.zones.tomato.growth = 100; S.zones.tomato.ready = true;
    const inv0 = S.inventory.tomato || 0;
    actHarvest('tomato');
    add('hasat eylemi', S.zones.tomato.planted === false && (S.inventory.tomato || 0) > inv0, 'tomato=' + (S.inventory.tomato || 0));
    const moneyS = S.money;
    doSell('tomato');
    add('satış eylemi', S.money > moneyS, 'money=' + S.money);
    const lv0 = S.zones.tomato.level, cashU = S.money;
    doUpgrade('tomato');
    add('yükseltme eylemi', S.zones.tomato.level === lv0 + 1 && S.money < cashU, 'lv=' + S.zones.tomato.level);
    const feed0 = S.feed;
    doFeed();
    add('besleme eylemi', S.feed < feed0 && S.feedSlots[0] === true, 'feed=' + S.feed);
    const prod0 = ANIMAL_KEYS.reduce((a,k) => a + S.animals[k].production, 0);
    collectAll();
    const invProd = ANIMAL_KEYS.reduce((a,k) => a + (S.inventory[ANIMALS[k].item] || 0), 0);
    add('ürün toplama eylemi', prod0 > 0 && invProd > 0, 'inv=' + invProd.toFixed(1));
    const streak0 = S.daily.streak;
    claimDaily();
    add('günlük ödül eylemi', S.daily.streak === streak0 + 1, 'streak=' + S.daily.streak);
    S.quests[0].progress = S.quests[0].target;
    const cashQ = S.money;
    claimQuest(S.quests[0].id);
    add('görev ödülü eylemi', S.quests[0].claimed === true && S.money > cashQ, 'quest=' + S.quests[0].name);
    closeLevelUp();
    S = G.makeDefaultState();
    S.money = 50000; S.inventory.milk = 20; S.inventory.egg = 10;
    doFactoryUnlock('dairy');
    doFactorySlot('dairy');
    const unlockedNow = G.factoryUnlocked(S,'dairy') && G.factoryState(S,'dairy').slots === 2;
    doFactoryStart('dairy','packagedMilk');
    const job = S.factories.dairy.jobs[0];
    advance(40, true);
    const craftedBefore = S.inventory.packagedMilk || 0;
    if (job) factoryCollect('dairy', job.id);
    add('fabrika kilidi ve yuvası', unlockedNow);
    add('fabrika üretimi tamamlandı', !!job && job.done && (S.inventory.packagedMilk || 0) > craftedBefore, 'süt=' + S.inventory.packagedMilk);
    const np = buildNativePlan(), nowNp = Date.now();
    add('bildirim planı', np.length > 0 && np.every(e => e.id && e.title && e.text && e.icon && e.at > nowNp && e.at <= nowNp + 72*3600*1000), np.length + ' bildirim');

    // Social features tests
    add('friends data loaded', G.FRIENDS.length === 5);
    add('leaderboard data loaded', G.LEADERBOARD.length === 10);
    add('events data loaded', G.EVENTS.length === 5);
    add('online features data loaded', Object.keys(G.ONLINE_FEATURES).length === 6);
    add('friend interactions defined', Object.keys(G.FRIEND_INTERACTIONS).length === 4);
    const friendsHtml = G.renderFriends(S);
    add('friends render', friendsHtml && friendsHtml.includes('Arkadaşlar'));
    const lbHtml = G.renderLeaderboard(S);
    add('leaderboard render', lbHtml && lbHtml.includes('Liderlik'));
    const eventsHtml = G.renderEvents(S);
    add('events render', eventsHtml && eventsHtml.includes('Etkinlikler'));
    const onlineHtml = G.renderOnline(S);
    add('online render', onlineHtml && onlineHtml.includes('leaderboard-list'));
    const featHtml = G.renderOnlineFeatures(S);
    add('online özellikler render', featHtml && featHtml.includes('feature-card'));
    const bankHtml = G.renderBank(S);
    add('banka render', bankHtml && (bankHtml.includes('Kredi Başvurusu') || bankHtml.includes('Aktif Kredi')));
    const comHtml = G.renderFriends(S);
    add('arkadaş ekle kartı', comHtml && comHtml.includes('Arkadaş Ekle'));

    S = backup;
    add('durum geri yüklendi', S === backup);
  } catch(err){
    add('çalışma hatası', false, err && err.message ? err.message : String(err));
  }
  const pass = results.filter(r => r.ok).length, fail = results.length - pass;
  const box = document.createElement('div');
  box.id = 'selftest';
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:#111;color:#fff;font:11px/1.4 monospace;padding:8px 10px;border-radius:8px;max-width:90vw;max-height:80vh;overflow:auto;opacity:.94';
  box.innerHTML = '<b>SELFTEST ' + (fail ? 'FAIL' : 'PASS') + '</b> (' + pass + '/' + results.length + ')<br>' +
    results.map(r => (r.ok ? '✓ ' : '✗ ') + r.name + (r.info ? ' — ' + r.info : '')).join('<br>');
  document.body.appendChild(box);
  document.title = (fail ? 'SELFTEST FAIL ' : 'SELFTEST PASS ') + pass + '/' + results.length;
  if (fail) console.error('SELFTEST FAIL', results); else console.log('SELFTEST PASS', results);
  try { renderAll(true); } catch(e){}
}

/* ---------------- başlat ---------------- */
function init(){
  if (PARAMS.has('newgame')){
    try { localStorage.removeItem(G.SAVE_KEY); } catch(e){}
    S = G.makeDefaultState();
    hasSave = false;
  }
  if (PARAMS.get('tab') && ['sell','supply','orders'].indexOf(PARAMS.get('tab')) >= 0) S.marketTab = PARAMS.get('tab');
  if (PARAMS.get('cat') && ANIMALS[PARAMS.get('cat')]) S.selectedCat = PARAMS.get('cat');
  if (PARAMS.get('t') != null && PARAMS.get('t') !== ''){
    const tv = Number(PARAMS.get('t'));
    if (Number.isFinite(tv)) S.time = ((Math.round(tv) % 1440) + 1440) % 1440;
  }
  const simMin = Number(PARAMS.get('sim') || 0);
  if (Number.isFinite(simMin) && simMin > 0) advance(Math.min(simMin, 7 * 1440), true);
  const hash = (location.hash || '').replace('#','');
  const forceStart = PARAMS.has('start');
  const auto = PARAMS.has('play') || PARAMS.has('newgame') || PARAMS.has('selftest') || (!!hash && hash !== 'start');
  const showStart = forceStart || (!STATIC && !auto) || (STATIC && forceStart);
  const start = $('#startScreen');
  bind();
  if (showStart){
    startVisible = true; gameStarted = false;
    if (start){ start.classList.remove('hidden','leaving'); start.setAttribute('aria-hidden','false'); }
    renderAll(true);
    renderWorld(true);
    renderStart();
  } else {
    startVisible = false; gameStarted = false;
    if (start){ start.classList.add('hidden'); start.classList.remove('leaving'); start.setAttribute('aria-hidden','true'); }
    if (PARAMS.has('selftest')){
      gameStarted = false;
      renderAll(true);
      routeFromHash();
      if (!location.hash) showTab('home');
    } else {
      startGame(true);
      routeFromHash();
      if (!location.hash) showTab('home');
    }
  }
  const dbgSheet = PARAMS.get('sheet');
  if (dbgSheet){
    setTimeout(() => {
      if (dbgSheet === 'weather') openWeather();
      else if (dbgSheet === 'quests') openQuests();
      else if (dbgSheet === 'daily') openDaily();
      else if (dbgSheet === 'notifications') openNotifications();
      else if (dbgSheet === 'help') openHelp();
      else if (dbgSheet === 'tutorial') startTutorial();
      else if (dbgSheet === 'cow') openCow(S.selectedCat, 0);
      else if (dbgSheet === 'level') showLevelUp(4, { money:720, feed:10, energy:10 });
      else if (dbgSheet === 'confirm') showConfirm('Emin misin?', 'Bu işlem geri alınamaz.', 'i-help');
      else if (dbgSheet === 'offline') openSheet(offlineSheet({ sec:5400, minutes:450, ready:2, prod:38, after:{ day:3, level:4, money:12450 }, before:{} }), 'offline');
    }, 250);
  }
  lastFrame = Date.now();
  setInterval(tick, 250);
  if (PARAMS.has('selftest')) setTimeout(runSelftest, 450);
}
document.addEventListener('DOMContentLoaded', init);
})();
