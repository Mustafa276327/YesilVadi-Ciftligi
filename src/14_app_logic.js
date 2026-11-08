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
  openFriendModal(friend);
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

/* ================= FRIEND INTERACTION MODAL ================= */
let currentFriendModal = null;
let currentFriendData = null;
let friendModalTab = 'trade';

function openFriendModal(friend){
  currentFriendData = friend;
  friendModalTab = 'trade';
  const modal = document.createElement('div');
  modal.className = 'friend-modal-overlay';
  modal.innerHTML = `
    <div class="friend-modal" role="dialog" aria-modal="true" aria-labelledby="friendModalTitle">
      <div class="friend-modal-header">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="friend-modal-avatar">${friend.avatar}</span>
          <div class="friend-modal-info">
            <div class="friend-modal-name" id="friendModalTitle">${friend.name}</div>
            <div class="friend-modal-farm">${friend.farm} · Seviye ${friend.level}</div>
          </div>
        </div>
        <button class="friend-modal-close" data-action="close-friend-modal" aria-label="Kapat">${G.icon('i-close')}</button>
      </div>
      <div class="friend-modal-body" id="friendModalBody">
        ${renderFriendModalTab(friend, 'trade')}
      </div>
      <div class="friend-modal-tabs" style="display:flex;border-top:1px solid var(--line);padding:0 16px">
        <button class="friend-modal-tab-btn ${friendModalTab==='trade'?'active':''}" data-friend-tab="trade" style="flex:1;padding:14px 0;font-size:13px;font-weight:700;color:${friendModalTab==='trade'?'#3F8350':'#7A786F'};background:none;border:none;border-bottom:2px solid ${friendModalTab==='trade'?'#3F8350':'transparent'};">${G.icon('i-trade')} Ticaret</button>
        <button class="friend-modal-tab-btn ${friendModalTab==='gift'?'active':''}" data-friend-tab="gift" style="flex:1;padding:14px 0;font-size:13px;font-weight:700;color:${friendModalTab==='gift'?'#3F8350':'#7A786F'};background:none;border:none;border-bottom:2px solid ${friendModalTab==='gift'?'#3F8350':'transparent'};">${G.icon('i-gift')} Hediye</button>
        <button class="friend-modal-tab-btn ${friendModalTab==='help'?'active':''}" data-friend-tab="help" style="flex:1;padding:14px 0;font-size:13px;font-weight:700;color:${friendModalTab==='help'?'#3F8350':'#7A786F'};background:none;border:none;border-bottom:2px solid ${friendModalTab==='help'?'#3F8350':'transparent'};">${G.icon('i-help')} Yardım</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  currentFriendModal = modal;
  modal.addEventListener('click', e => {
    const tabBtn = e.target.closest('.friend-modal-tab-btn');
    if (tabBtn){
      friendModalTab = tabBtn.dataset.friendTab;
      const body = $('#friendModalBody');
      if (body) body.innerHTML = renderFriendModalTab(friend, friendModalTab);
      $$('.friend-modal-tab-btn').forEach(b => {
        const active = b.dataset.friendTab === friendModalTab;
        b.style.color = active ? '#3F8350' : '#7A786F';
        b.style.borderBottomColor = active ? '#3F8350' : 'transparent';
      });
      return;
    }
    const closeBtn = e.target.closest('[data-action="close-friend-modal"]');
    if (closeBtn || e.target === modal) closeFriendModal();
    const tradeConfirm = e.target.closest('[data-action="confirm-trade"]');
    if (tradeConfirm) confirmFriendTrade(friend);
    const giftOption = e.target.closest('.friend-modal-gift-option');
    if (giftOption){
      $$('.friend-modal-gift-option').forEach(o => o.classList.remove('selected'));
      giftOption.classList.add('selected');
      return;
    }
    const helpOption = e.target.closest('.friend-modal-help-option');
    if (helpOption){
      $$('.friend-modal-help-option').forEach(o => o.classList.remove('selected'));
      helpOption.classList.add('selected');
      return;
    }
    const giftConfirm = e.target.closest('[data-action="confirm-gift"]');
    if (giftConfirm) confirmFriendGift(friend);
    const helpConfirm = e.target.closest('[data-action="confirm-help"]');
    if (helpConfirm) confirmFriendHelp(friend);
  });
  feedback('tap');
}

function closeFriendModal(){
  if (currentFriendModal){
    currentFriendModal.remove();
    currentFriendModal = null;
    currentFriendData = null;
  }
}

function renderFriendModalTab(friend, tab){
  if (tab === 'trade'){
    return `
      <div class="friend-modal-section friend-modal-trade">
        <div class="friend-modal-section-title">Ticaret Teklifi</div>
        <p style="font-size:13px;color:#7A786F;margin:0 0 16px">${friend.name} ile ürün takası yapın. Fiyatları ayarlayın.</p>
        <div class="friend-modal-trade-inputs">
          <div class="friend-modal-trade-input">
            <span class="friend-modal-trade-label">Vereceğiniz (₺)</span>
            <input type="number" id="tradeGive" min="0" max="${S.money}" value="0" placeholder="0">
          </div>
          <div class="friend-modal-trade-input">
            <span class="friend-modal-trade-label">Alacağınız (₺)</span>
            <input type="number" id="tradeGet" min="0" value="0" placeholder="0">
          </div>
        </div>
        <div class="friend-modal-trade-actions">
          <button class="btn ghost" data-action="close-friend-modal">${G.icon('i-close')} İptal</button>
          <button class="btn primary" data-action="confirm-trade">${G.icon('i-check-circle')} Ticaret Et</button>
        </div>
      </div>
    `;
  }
  if (tab === 'gift'){
    const gifts = [
      {id:'seeds', name:'Tohum Paketi', desc:'5x Rastgele Tohum', icon:'🌱', value:500},
      {id:'fertilizer', name:'Gübre', desc:'Hızlı büyüme +%25', icon:'🧪', value:800},
      {id:'water', name:'Su Tankı', desc:'10.000 L Su', icon:'💧', value:600},
      {id:'feed', name:'Yem Paketi', desc:'20 kg Hayvan Yemi', icon:'🌾', value:700},
      {id:'energy', name:'Enerji İçeceği', desc:'+30 Enerji', icon:'⚡', value:900},
    ];
    return `
      <div class="friend-modal-section">
        <div class="friend-modal-section-title">Hediye Seçin</div>
        <p style="font-size:13px;color:#7A786F;margin:0 0 16px">Bir hediye gönderin. Değer: ${G.money(G.FRIEND_INTERACTIONS.gift.money)}</p>
        <div class="friend-modal-gift-options">
          ${gifts.map(g => `
            <label class="friend-modal-gift-option">
              <input type="radio" name="gift" value="${g.id}" data-value="${g.value}">
              <span class="friend-modal-gift-icon">${g.icon}</span>
              <div class="friend-modal-gift-info">
                <div class="friend-modal-gift-name">${g.name}</div>
                <div class="friend-modal-gift-desc">${g.desc}</div>
              </div>
              <span class="friend-modal-gift-check">${G.icon('i-check-circle')}</span>
            </label>
          `).join('')}
        </div>
        <div style="margin-top:16px">
          <button class="btn primary" style="width:100%" data-action="confirm-gift">${G.icon('i-gift')} Hediye Gönder</button>
        </div>
      </div>
    `;
  }
  if (tab === 'help'){
    const helpTypes = [
      {id:'water', name:'Sulama Yardımı', desc:'Tüm tarlalarını sular', icon:'💧', reward:{xp:100, money:500}},
      {id:'feed', name:'Besleme Yardımı', desc:'Hayvanlarını besler', icon:'🌾', reward:{xp:150, money:800}},
      {id:'harvest', name:'Hasat Yardımı', desc:'Olgun ürünleri toplar', icon:'✂️', reward:{xp:200, money:1000}},
      {id:'clean', name:'Temizlik Yardımı', desc:'Çiftliği temizler', icon:'🧹', reward:{xp:80, money:300}},
    ];
    return `
      <div class="friend-modal-section friend-modal-help-options">
        <div class="friend-modal-section-title">Yardım Türü Seçin</div>
        <p style="font-size:13px;color:#7A786F;margin:0 0 16px">${friend.name} çiftliğinde yardım edin. Ödül: ${G.money(G.FRIEND_INTERACTIONS.help.money)} + ${G.FRIEND_INTERACTIONS.help.xp} XP</p>
        ${helpTypes.map(h => `
          <label class="friend-modal-help-option">
            <input type="radio" name="help" value="${h.id}">
            <span class="friend-modal-help-icon">${h.icon}</span>
            <div class="friend-modal-help-info">
              <div class="friend-modal-help-name">${h.name}</div>
              <div class="friend-modal-help-desc">${h.desc}</div>
            </div>
            <span class="friend-modal-help-reward">+${h.reward.xp} XP · ${G.money(h.reward.money)}</span>
            <span class="friend-modal-help-check">${G.icon('i-check-circle')}</span>
          </label>
        `).join('')}
        <div style="margin-top:16px">
          <button class="btn primary" style="width:100%" data-action="confirm-help">${G.icon('i-help')} Yardım Et</button>
        </div>
      </div>
    `;
  }
  return '';
}

function confirmFriendTrade(friend){
  const give = Number($('#tradeGive')?.value || 0);
  const get = Number($('#tradeGet')?.value || 0);
  if (give <= 0 && get <= 0){
    toast('En az bir taraf için miktar girin.');
    feedback('error');
    return;
  }
  if (give > S.money){
    toast('Paranız yetmiyor.');
    feedback('error');
    return;
  }
  S.money -= give;
  S.money += get;
  S.xp += G.FRIEND_INTERACTIONS.trade.xp;
  toast(`${friend.name} ile ticaret tamamlandı! Verdi: ${G.money(give)}, Aldı: ${G.money(get)} · +${G.FRIEND_INTERACTIONS.trade.xp} XP`);
  feedback('success');
  closeFriendModal();
  if (currentScreen === 'scr-community') renderCommunity();
}

function confirmFriendGift(friend){
  const selected = document.querySelector('.friend-modal-gift-option.selected input');
  if (!selected){
    toast('Bir hediye seçin.');
    feedback('error');
    return;
  }
  const giftId = selected.value;
  const giftValue = Number(selected.dataset.value);
  S.money -= giftValue;
  S.xp += G.FRIEND_INTERACTIONS.gift.xp;
  toast(`${friend.name} hediye gönderdiniz! Değer: ${G.money(giftValue)} · +${G.FRIEND_INTERACTIONS.gift.xp} XP`);
  feedback('success');
  closeFriendModal();
  if (currentScreen === 'scr-community') renderCommunity();
}

function confirmFriendHelp(friend){
  const selected = document.querySelector('.friend-modal-help-option.selected input');
  if (!selected){
    toast('Bir yardım türü seçin.');
    feedback('error');
    return;
  }
  if (!friend.online){
    toast(friend.name + ' çevrimiçi değil, yardım edemezsiniz.');
    feedback('error');
    return;
  }
  S.xp += G.FRIEND_INTERACTIONS.help.xp;
  S.money += G.FRIEND_INTERACTIONS.help.money;
  toast(`${friend.name} çiftliğinde yardım ettiniz! +${G.FRIEND_INTERACTIONS.help.xp} XP, +${G.money(G.FRIEND_INTERACTIONS.help.money)}`);
  feedback('success');
  closeFriendModal();
  if (currentScreen === 'scr-community') renderCommunity();
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
        case 'close-friend-modal': closeFriendModal(); break;
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
