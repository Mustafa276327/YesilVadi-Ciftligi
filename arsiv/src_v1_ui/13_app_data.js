/* ================= Green Valley Farm — data & templates ================= */
(function(){
'use strict';

const icon = (n, cls) => `<svg class="${cls || 'ic'}"><use href="#${n}"/></svg>`;

const ZONE = {
  overview:   { title:'Overview', view:[0,0,1000,1250] },
  house:      { title:'Farm House',     sub:'Main residence', icon:'i-house',  tile:'peach', badge:'Home',      ring:[40,36,406,344],   view:[0,-80,500,625],   detailView:[0,0,540,643] },
  tomato:     { title:'Tomato Field',   crop:'Tomato',            icon:'i-tomato',tile:'peach', badge:'Excellent', growth:78, soil:'72%', harvest:'12 days', ring:[554,36,406,344], view:[460,-30,540,630], detailView:[460,0,540,643] },
  vegetable:  { title:'Vegetable Field',crop:'Lettuce + Carrots', icon:'i-leaf',  tile:'mint',  badge:'Excellent', growth:87, soil:'68%', harvest:'9 days',  ring:[40,476,406,342], view:[0,340,540,630],   detailView:[0,380,540,643] },
  corn:       { title:'Corn Field',     crop:'Corn',              icon:'i-corn',  tile:'wheat', badge:'Good',      growth:70, soil:'74%', harvest:'21 days', ring:[554,476,406,342],view:[460,340,540,630], detailView:[460,380,540,643] },
  animal:     { title:'Animal Area',    sub:'Pasture & barn',     icon:'i-cow',   tile:'peach', badge:'All healthy', ring:[38,898,582,274], view:[16,480,640,720] },
  water:      { title:'Water Tank',     sub:'Main reservoir',     icon:'i-drop',  tile:'lav',   ring:[684,900,276,172], view:[600,730,400,490], detailView:[600,740,400,476] },
  storage:    { title:'Storage',         sub:'Equipment & supplies', icon:'i-box', tile:'wheat', ring:[684,1090,276,110], view:[600,740,400,476], detailView:[600,780,400,500] }
};

const BOUNDS = {
  house:[24,20,446,392],
  tomato:[530,20,446,392],
  vegetable:[24,460,446,376],
  corn:[530,460,446,376],
  animal:[24,888,608,292],
  water:[668,888,308,188],
  storage:[668,1080,308,135]
};

const HERDS = {
  cows:{
    title:'Your cows', sub:'18 in the herd · tap one for details', art:'artCow',
    list:[
      {name:'Bella', breed:'Holstein Friesian', id:'COW-014', age:'3 years', health:96, yield:'32 L/day', note:'Top producer · last check-up 2 days ago'},
      {name:'Daisy', breed:'Jersey', id:'COW-021', age:'4 years', health:91, yield:'24 L/day', note:'Milking group A · vaccinated'},
      {name:'Moose', breed:'Angus', id:'COW-033', age:'2 years', health:86, yield:'18 L/day', note:'Watch weight · check-up in 6 days'},
      {name:'Luna', breed:'Brown Swiss', id:'COW-041', age:'3 years', health:94, yield:'28 L/day', note:'Milking group B · vaccinated'}
    ]
  },
  chickens:{
    title:'Your chickens', sub:'20 in the flock · tap one for details', art:'artChicken',
    list:[
      {name:'Nugget', breed:'Rhode Island Red', id:'EGG-102', age:'1 year', health:98, yield:'6 eggs/wk', note:'Free range · laying well'},
      {name:'Pepper', breed:'Leghorn', id:'EGG-108', age:'2 years', health:94, yield:'5 eggs/wk', note:'Free range · calm'},
      {name:'Sunny', breed:'Orpington', id:'EGG-115', age:'1 year', health:97, yield:'4 eggs/wk', note:'Coop 2 · laying well'}
    ]
  },
  sheep:{
    title:'Your sheep', sub:'6 in the flock · tap one for details', art:'artSheep',
    list:[
      {name:'Cotton', breed:'Merino', id:'SHP-041', age:'3 years', health:95, yield:'4.2 kg wool', note:'Sheared last month'},
      {name:'Biscuit', breed:'Suffolk', id:'SHP-047', age:'2 years', health:92, yield:'3.8 kg wool', note:'Grazing group B'}
    ]
  },
  goats:{
    title:'Your goats', sub:'4 in the herd · tap one for details', art:'artGoat',
    list:[
      {name:'Clover', breed:'Alpine', id:'GOT-012', age:'2 years', health:93, yield:'3.1 L/day', note:'Dairy group · vaccinated'},
      {name:'Buttons', breed:'Nubian', id:'GOT-019', age:'1 year', health:96, yield:'2.6 L/day', note:'Dairy group · playful'}
    ]
  }
};

const CAT_ICON = {cows:'i-cow', chickens:'i-bird', sheep:'i-sheep', goats:'i-goat'};

/* ---------------- card templates ---------------- */
function growSegments(pct){
  return Array.from({length:10}, () => '<i></i>').join('');
}

function cropCard(key){
  const z = ZONE[key];
  return `<div class="icard">
    <div class="ic-head">
      <span class="tile ${z.tile}">${icon(z.icon)}</span>
      <div class="ic-title"><b>${z.title}</b><small>Crop: ${z.crop}</small></div>
      <span class="badge ${z.badge === 'Good' ? 'warn' : ''}">${icon('i-shield')}${z.badge}</span>
    </div>
    <div class="growth-row"><span>Growth</span><b class="growth-val" data-val="${z.growth}">0%</b></div>
    <div class="segbar" data-val="${z.growth}">${growSegments(z.growth)}</div>
    <div class="stats3">
      <div class="statbox"><small>Health</small><b>${z.badge}</b></div>
      <div class="statbox"><small>Soil</small><b>${z.soil}</b></div>
      <div class="statbox"><small>Expected harvest</small><b>${z.harvest}</b></div>
    </div>
    <div class="actions">
      <button class="btn ghost" data-action="water" data-zone="${key}">${icon('i-drop')}Water</button>
      <button class="btn primary" data-action="view" data-zone="${key}">View crop ${icon('i-arrow-right')}</button>
    </div>
  </div>`;
}

function houseCard(){
  return `<div class="icard">
    <div class="ic-head">
      <span class="tile peach">${icon('i-house')}</span>
      <div class="ic-title"><b>Farm House</b><small>Main residence</small></div>
      <span class="badge plain">Home</span>
    </div>
    <div class="stats3">
      <div class="statbox"><small>Size</small><b>180 m²</b></div>
      <div class="statbox"><small>Type</small><b>Farm house</b></div>
      <div class="statbox"><small>Built</small><b>2019</b></div>
    </div>
  </div>`;
}

function animalCard(){
  return `<div class="icard">
    <div class="ic-head">
      <span class="tile peach">${icon('i-cow')}</span>
      <div class="ic-title"><b>Animal Area</b><small>Pasture &amp; barn</small></div>
      <span class="badge">${icon('i-shield')}All healthy</span>
    </div>
    <div class="stats3">
      <div class="statbox"><small>Animals</small><b>48</b></div>
      <div class="statbox"><small>Health</small><b>96%</b></div>
      <div class="statbox"><small>Next feed</small><b>6 PM</b></div>
    </div>
    <button class="btn primary wide" data-action="livestock">Open livestock ${icon('i-arrow-right')}</button>
  </div>`;
}

function waterCard(){
  return `<div class="icard">
    <div class="ic-head">
      <span class="tile water-tint">${icon('i-drop')}</span>
      <div class="ic-title"><b>Water Tank</b><small>Main reservoir</small></div>
    </div>
    <div class="water-stats">
      <div class="statbox"><small>Level</small><b>82%</b></div>
      <div class="statbox"><small>Stored</small><b>8,200 L</b></div>
      <div class="statbox"><small>Used today</small><b>1,240 L</b></div>
    </div>
    <button class="btn primary wide" data-action="smart">Smart watering ${icon('i-arrow-right')}</button>
  </div>`;
}

function storageCard(){
  return `<div class="icard">
    <div class="ic-head">
      <span class="tile wheat">${icon('i-box')}</span>
      <div class="ic-title"><b>Storage</b><small>Equipment &amp; supplies</small></div>
      <span class="badge plain">Secured</span>
    </div>
    <div class="stats3">
      <div class="statbox"><small>Capacity</small><b>12 t</b></div>
      <div class="statbox"><small>Temperature</small><b>18°C</b></div>
      <div class="statbox"><small>Last check</small><b>2 days ago</b></div>
    </div>
  </div>`;
}

function overviewCard(){
  return `<div class="hint-card">
    <span class="tap-ic">${icon('i-tap')}</span>
    <span><b>Tap an area to explore</b><small>7 zones · 4 crops · 48 animals</small></span>
  </div>`;
}

function farmInfoHTML(zone){
  if(zone === 'overview') return overviewCard();
  if(zone === 'house') return houseCard();
  if(zone === 'animal') return animalCard();
  if(zone === 'water') return waterCard();
  if(zone === 'storage') return storageCard();
  return cropCard(zone);
}

function detailHTML(zone){
  if(zone === 'house') return houseCard();
  if(zone === 'animal') return animalCard();
  if(zone === 'water') return waterCard();
  if(zone === 'storage') return storageCard();
  return cropCard(zone);
}

/* ---------------- herd list ---------------- */
function herdRow(cat, cow, i){
  return `<button class="cow-card ${cow.health < 90 ? 'high' : ''}" data-cow="${i}">
    <span class="cow-avatar"><svg viewBox="0 0 64 64"><use href="#${HERDS[cat].art}"/></svg></span>
    <span class="cow-main">
      <span class="cow-name">${cow.name}</span>
      <span class="cow-breed">${cow.breed}</span>
      <span class="cow-tags"><span class="tag">${icon('i-tag')}${cow.id}</span><span class="tag warm">${cow.age}</span></span>
    </span>
    <span class="cow-health">${icon('i-heart')}${cow.health}%</span>
    <svg class="ic cow-chev"><use href="#i-chev"/></svg>
  </button>`;
}

function herdSheet(cat, cow){
  return `<div class="drag"></div>
    <div class="cow-sheet-head">
      <span class="cow-avatar"><svg viewBox="0 0 64 64"><use href="#${HERDS[cat].art}"/></svg></span>
      <div><b>${cow.name}</b><small>${cow.breed} · ${cow.id}</small></div>
      <span class="cow-health">${icon('i-heart')}${cow.health}%</span>
    </div>
    <div class="sheet-stats">
      <div class="statbox"><small>Age</small><b>${cow.age}</b></div>
      <div class="statbox"><small>${cat === 'cows' || cat === 'goats' ? 'Milk' : cat === 'sheep' ? 'Wool' : 'Eggs'}</small><b>${cow.yield}</b></div>
      <div class="statbox"><small>Health</small><b>${cow.health}%</b></div>
    </div>
    <p class="sheet-note">${cow.note}</p>`;
}

/* ---------------- simple screens ---------------- */
const BARS = [42, 58, 47, 72, 64, 88, 76];
const PERF = [
  {name:'Tomato Field', pct:'78%', note:'Excellent', color:'#E4573E'},
  {name:'Corn Field', pct:'70%', note:'Good', color:'#E7B23B'},
  {name:'Vegetable Field', pct:'87%', note:'Excellent', color:'#5FA34A'},
  {name:'Farm House', pct:'—', note:'—', color:'#B98D62'}
];
const HARVEST = [
  {name:'Tomato Field', crop:'Tomato · 420 kg', value:'420 kg', state:'Ready', cls:'', icon:'i-tomato', tile:'peach'},
  {name:'Corn Field', crop:'Corn · 380 kg', value:'380 kg', state:'Ready', cls:'', icon:'i-corn', tile:'wheat'},
  {name:'Vegetable Field', crop:'Lettuce · 260 kg', value:'260 kg', state:'In 3 days', cls:'soon', icon:'i-leaf', tile:'mint'},
  {name:'Vegetable Field', crop:'Carrots · 220 kg', value:'220 kg', state:'In 5 days', cls:'soon', icon:'i-leaf', tile:'mint'}
];

function renderBars(){
  const wrap = document.getElementById('barChart');
  if(!wrap) return;
  wrap.innerHTML = BARS.map(v => `<i style="height:0" data-h="${v}" class="${v === 88 ? 'hi' : ''}"></i>`).join('');
  requestAnimationFrame(() => {
    wrap.querySelectorAll('i').forEach((el, i) => {
      setTimeout(() => { el.style.height = el.dataset.h + '%'; }, 60 + i * 55);
    });
  });
}

function renderPerf(){
  const wrap = document.getElementById('perfList');
  if(!wrap) return;
  wrap.innerHTML = PERF.map(p => `<div class="perf-row"><span class="dot" style="background:${p.color}"></span><b>${p.name}</b><span>${p.pct}</span><small>${p.note}</small></div>`).join('');
}

function renderHarvest(){
  const wrap = document.getElementById('harvestList');
  if(!wrap) return;
  wrap.innerHTML = HARVEST.map(h => `<div class="harvest-card">
    <span class="tile ${h.tile}">${icon(h.icon)}</span>
    <span class="harvest-main"><b>${h.name}</b><small>${h.crop}</small></span>
    <span class="harvest-right"><b>${h.value}</b><span class="${h.cls}">${h.state}</span></span>
  </div>`).join('');
}

window.GVF = { icon, ZONE, BOUNDS, HERDS, CAT_ICON, farmInfoHTML, detailHTML, herdRow, herdSheet, renderBars, renderPerf, renderHarvest };
})();
