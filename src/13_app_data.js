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
