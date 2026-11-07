/* ================= Green Valley Farm — logic ================= */
(function(){
'use strict';
const G = window.GVF;
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const Z = G.ZONE, B = G.BOUNDS, HERDS = G.HERDS;

let currentScreen = 'scr-home';
let farmZone = 'overview';
let detailZone = 'tomato';
let herdCat = 'cows';
let feedTimers = [];
const STATIC = /(^|[?&])static(=|&|$)/.test(location.search);
if(STATIC) document.documentElement.classList.add('static');

/* ---------------- small animations ---------------- */
function countTo(el, to, opt){
  if(!el) return;
  opt = opt || {};
  if(STATIC){ el.textContent = (opt.decimals ? to.toFixed(opt.decimals) : Math.round(to).toLocaleString('en-US')) + (opt.suffix == null ? '%' : opt.suffix); return; }
  const dur = opt.dur || 950;
  const suffix = opt.suffix == null ? '%' : opt.suffix;
  const dec = opt.decimals || 0;
  cancelAnimationFrame(el._raf);
  const t0 = performance.now();
  function tick(t){
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    const v = to * e;
    el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suffix;
    if(p < 1) el._raf = requestAnimationFrame(tick);
  }
  el._raf = requestAnimationFrame(tick);
}

function runRing(ring){
  if(!ring) return;
  const v = Number(ring.dataset.ring) || 0;
  const fill = $('.ring-fill', ring);
  const label = $('b', ring);
  const len = ring.classList.contains('mini-ring') ? 157 : 201;
  if(!fill) return;
  if(STATIC){
    if(ring.dataset.color) fill.style.stroke = ring.dataset.color;
    fill.style.strokeDashoffset = len * (1 - v / 100);
    if(label) label.textContent = v + '%';
    return;
  }
  if(ring.dataset.color) fill.style.stroke = ring.dataset.color;
  fill.style.strokeDashoffset = len;
  if(label) label.textContent = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.strokeDashoffset = len * (1 - v / 100);
  }));
  countTo(label, v, {suffix:'%', dur:1200});
}

function runHome(){
  const ring = $('.mini-ring', $('#scr-home'));
  if(!ring) return;
  runRing(ring);
}

function runFeeding(){
  const steps = $$('#feedSteps .step');
  const lines = $$('#feedSteps .step-line i');
  const pill = $('#feedCount');
  feedTimers.forEach(clearTimeout);
  feedTimers = [];
  if(STATIC){
    steps.forEach((s,i) => s.classList.toggle('done', i < 2));
    lines.forEach((l,i) => l.classList.toggle('on', i < 1));
    if(pill) pill.textContent = '2 of 3 done';
    return;
  }
  steps.forEach(s => s.classList.remove('done'));
  lines.forEach(l => l.classList.remove('on'));
  if(pill) pill.textContent = '0 of 3 done';
  feedTimers.push(setTimeout(() => {
    if(steps[0]) steps[0].classList.add('done');
    if(lines[0]) lines[0].classList.add('on');
    if(pill) pill.textContent = '1 of 3 done';
  }, 480));
  feedTimers.push(setTimeout(() => {
    if(steps[1]) steps[1].classList.add('done');
    if(lines[1]) lines[1].classList.add('on');
    if(pill) pill.textContent = '2 of 3 done';
  }, 1020));
}

function runLivestock(){
  const scope = $('#scr-livestock');
  if(!scope) return;
  const herd = $('.herd-number .count', scope);
  if(STATIC){
    if(herd) herd.textContent = '48';
    $$('.ring', scope).forEach(runRing);
    runFeeding();
    return;
  }
  if(herd) countTo(herd, 48, {suffix:'', dur:1000});
  $$('.ring', scope).forEach(r => {
    const fill = $('.ring-fill', r);
    if(fill) fill.style.strokeDashoffset = 201;
    const b = $('b', r);
    if(b) b.textContent = '0%';
  });
  setTimeout(() => $$('.ring', scope).forEach(runRing), 140);
  runFeeding();
}

function animateCrop(scope){
  if(!scope) return;
  if(STATIC){
    $$('.growth-val', scope).forEach(el => { el.textContent = el.dataset.val + '%'; });
    $$('.segbar', scope).forEach(bar => {
      const n = Math.round((Number(bar.dataset.val) || 0) / 10);
      $$('i', bar).forEach((s, i) => s.classList.toggle('on', i < n));
    });
    return;
  }
  $$('.growth-val', scope).forEach(el => countTo(el, Number(el.dataset.val) || 0, {suffix:'%', dur:850}));
  $$('.segbar', scope).forEach(bar => {
    const n = Math.round((Number(bar.dataset.val) || 0) / 10);
    const segs = $$('i', bar);
    segs.forEach(s => s.classList.remove('on'));
    segs.forEach((s, i) => {
      if(i < n) setTimeout(() => s.classList.add('on'), 80 + i * 38);
    });
  });
}

/* ---------------- map ---------------- */
function applyRing(svg, ring){
  if(!svg) return;
  if(!ring){ svg.classList.remove('has-hl'); return; }
  const rects = $$('.zone-hl rect', svg);
  rects.forEach(r => {
    r.setAttribute('x', ring[0]);
    r.setAttribute('y', ring[1]);
    r.setAttribute('width', ring[2]);
    r.setAttribute('height', ring[3]);
    r.setAttribute('rx', 28);
  });
  svg.classList.add('has-hl');
}

function setViewInstant(svg, view){
  if(svg) svg.setAttribute('viewBox', view.join(' '));
}

function animateView(svg, view, dur){
  if(!svg) return;
  if(STATIC){ svg.setAttribute('viewBox', view.join(' ')); return; }
  dur = dur || 760;
  cancelAnimationFrame(svg._mapRaf);
  const cur = (svg.getAttribute('viewBox') || '0 0 1000 1200').trim().split(/\s+/).map(Number);
  const from = cur.length === 4 ? cur : [0,0,1000,1200];
  const t0 = performance.now();
  function tick(t){
    const p = Math.min(1, (t - t0) / dur);
    const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    svg.setAttribute('viewBox', from.map((f, i) => f + (view[i] - f) * e).join(' '));
    if(p < 1) svg._mapRaf = requestAnimationFrame(tick);
  }
  svg._mapRaf = requestAnimationFrame(tick);
}

function setMap(svg, view, opt){
  if(!svg) return;
  opt = opt || {};
  svg.classList.toggle('zoomed', opt.labels === false);
  applyRing(svg, opt.highlight || null);
  if(opt.animate === false) setViewInstant(svg, view);
  else animateView(svg, view, opt.dur);
}

function zoneAt(svg, evt){
  try{
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    for(const k in B){
      const b = B[k];
      if(loc.x >= b[0] && loc.x <= b[0] + b[2] && loc.y >= b[1] && loc.y <= b[1] + b[3]) return k;
    }
  }catch(e){}
  return null;
}

/* ---------------- farm ---------------- */
function centerChip(zone){
  const chips = $('#farmChips');
  const chip = $('#farmChips .chip[data-zone="' + zone + '"]');
  if(!chips || !chip) return;
  const target = chip.offsetLeft - (chips.clientWidth - chip.offsetWidth) / 2;
  chips.scrollLeft = Math.max(0, Math.min(target, chips.scrollWidth - chips.clientWidth));
}

function selectZone(zone, opt){
  if(!Z[zone]) return;
  opt = opt || {};
  farmZone = zone;
  $$('#farmChips .chip').forEach(c => c.classList.toggle('active', c.dataset.zone === zone));
  const m = Z[zone];
  setMap($('#farmMap'), m.view, {
    labels: zone === 'overview',
    highlight: zone === 'overview' ? null : m.ring,
    animate: opt.animate !== false
  });
  const info = $('#farmInfo');
  if(info){
    info.innerHTML = G.farmInfoHTML(zone);
    animateCrop(info);
  }
  centerChip(zone);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerChip(zone));
}

function openDetail(zone){
  if(!Z[zone]) return;
  if(zone === 'animal'){ showScreen('scr-livestock', 'farm'); return; }
  detailZone = zone;
  const m = Z[zone];
  const sheet = $('#detailSheet');
  if(sheet){
    sheet.innerHTML = G.detailHTML(zone);
    sheet.style.animation = 'none';
    void sheet.offsetWidth;
    sheet.style.animation = '';
  }
  const map = $('#detailMap');
  const view = m.detailView || m.view;
  setViewInstant(map, view);
  map.classList.add('zoomed');
  applyRing(map, m.ring);
  showScreen('scr-detail', 'farm');
  animateCrop(sheet);
  const scr = $('#scr-detail');
  if(scr) scr.scrollTop = 0;
}

/* ---------------- screens ---------------- */
function setTab(key){
  $$('#tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.nav === key));
}

function showScreen(id, tab){
  const next = document.getElementById(id);
  if(!next) return;
  if(id !== currentScreen){
    const prev = document.getElementById(currentScreen);
    if(prev) prev.classList.remove('active');
    next.classList.remove('active');
    void next.offsetWidth;
    next.classList.add('active');
    next.scrollTop = 0;
    currentScreen = id;
  }
  setTab(tab || 'home');
  document.body.classList.toggle('hide-nav', id === 'scr-livestock');
  if(id === 'scr-home') runHome();
  if(id === 'scr-livestock') runLivestock();
  if(id === 'scr-analytics') G.renderBars();
}

const SCREEN_FOR_TAB = {home:'scr-home', farm:'scr-farm', analytics:'scr-analytics', harvest:'scr-harvest', profile:'scr-profile'};

function showTab(key){
  if(!SCREEN_FOR_TAB[key]) return;
  if(key === 'farm'){
    if(currentScreen === 'scr-detail' || currentScreen === 'scr-livestock'){
      showScreen('scr-farm', 'farm');
      selectZone(farmZone === 'overview' ? 'overview' : farmZone, {animate:false});
    }else if(currentScreen === 'scr-farm'){
      selectZone('overview');
      $('#scr-farm').scrollTo({top:0, behavior:'smooth'});
    }else{
      showScreen('scr-farm', 'farm');
    }
    return;
  }
  showScreen(SCREEN_FOR_TAB[key], key);
}

/* ---------------- modal / sheets / toast ---------------- */
function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function openMap(zone){
  zone = zone || farmZone;
  const m = Z[zone] || Z.overview;
  const title = $('#modalTitle');
  if(title) title.textContent = zone === 'overview' ? 'Farm map' : m.title;
  const svg = $('#modalMap');
  setViewInstant(svg, m.view);
  setMap(svg, m.view, {labels: zone === 'overview', highlight: zone === 'overview' ? null : m.ring, animate:false});
  const modal = $('#mapModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeMap(){
  const modal = $('#mapModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function openCow(index){
  const herd = HERDS[herdCat];
  const cow = herd.list[index];
  if(!cow) return;
  $('#cowSheet').innerHTML = G.herdSheet(herdCat, cow);
  $('#cowScrim').classList.add('open');
  $('#cowScrim').setAttribute('aria-hidden', 'false');
}

function closeCow(){
  $('#cowScrim').classList.remove('open');
  $('#cowScrim').setAttribute('aria-hidden', 'true');
}

/* ---------------- herd ---------------- */
function renderHerd(cat){
  herdCat = cat;
  const herd = HERDS[cat];
  $$('#catGrid .cat-card').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  $('#herdTitle').textContent = herd.title;
  $('#herdSub').textContent = herd.sub;
  $('#cowList').innerHTML = herd.list.map((c, i) => G.herdRow(cat, c, i)).join('');
}

/* ---------------- events ---------------- */
function bind(){
  $('#tabbar').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if(t) showTab(t.dataset.nav);
  });

  $('#farmChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    selectZone(chip.dataset.zone);
    const scr = $('#scr-farm');
    if(scr) scr.scrollTo({top:0, behavior:'smooth'});
  });

  $('#farmMap').addEventListener('click', e => {
    const z = zoneAt($('#farmMap'), e);
    if(!z) return;
    if(currentScreen !== 'scr-farm') return;
    if(z === farmZone && farmZone !== 'overview') openDetail(z);
    else selectZone(z);
  });

  $('#expandFarm').addEventListener('click', e => { e.stopPropagation(); openMap(farmZone); });
  $('#expandDetail').addEventListener('click', () => openMap(detailZone));
  $('#closeMap').addEventListener('click', closeMap);
  $('#mapModal').addEventListener('click', e => { if(e.target === $('#mapModal')) closeMap(); });

  document.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if(go){
      const target = go.dataset.goto;
      if(target === 'farm'){
        const zone = go.dataset.zone || 'overview';
        showScreen('scr-farm', 'farm');
        selectZone(zone);
        const scr = $('#scr-farm');
        if(scr) scr.scrollTo({top:0, behavior:'smooth'});
      }else if(target === 'livestock'){
        showScreen('scr-livestock', 'farm');
      }
      return;
    }

    const act = e.target.closest('[data-action]');
    if(act){
      const type = act.dataset.action;
      const z = act.dataset.zone;
      if(type === 'livestock') showScreen('scr-livestock', 'farm');
      else if(type === 'view'){
        if(currentScreen === 'scr-detail') toast(Z[z].title + ' · harvest in ' + Z[z].harvest);
        else openDetail(z);
      }
      else if(type === 'water') toast('Watering started · ' + Z[z].title);
      else if(type === 'smart') toast('Smart watering started · 1,240 L scheduled');
      return;
    }

    const back = e.target.closest('[data-back]');
    if(back){
      showTab('farm');
      return;
    }

    const cat = e.target.closest('.cat-card');
    if(cat){ renderHerd(cat.dataset.cat); return; }

    const cow = e.target.closest('.cow-card');
    if(cow){ openCow(Number(cow.dataset.cow)); return; }

    if(e.target.closest('.bell')){ toast('1 new notification · Farm health is excellent'); return; }

    const sw = e.target.closest('.settings .switch');
    if(sw) sw.classList.toggle('on');
  });

  $('#cowScrim').addEventListener('click', e => {
    if(e.target === $('#cowScrim')) closeCow();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){ closeCow(); closeMap(); }
  });
}

/* ---------------- init ---------------- */
function init(){
  G.renderBars();
  G.renderPerf();
  G.renderHarvest();
  renderHerd('cows');
  selectZone('overview', {animate:false});
  const detailMap = $('#detailMap');
  if(detailMap){
    setViewInstant(detailMap, Z.tomato.detailView);
    applyRing(detailMap, Z.tomato.ring);
  }
  bind();
  showScreen('scr-home', 'home');
  setTimeout(runHome, 180);
  setTimeout(routeFromHash, 120);
}

/* optional deep links: #farm, #farm-tomato, #detail-tomato, #map-water, #livestock ... */
function routeFromHash(){
  const h = (location.hash || '').replace('#','');
  if(!h) return;
  if(h === 'livestock'){ showScreen('scr-livestock','farm'); return; }
  if(h.indexOf('detail-') === 0){ openDetail(h.slice(7)); return; }
  if(h.indexOf('map-') === 0){ openMap(h.slice(4)); return; }
  if(h.indexOf('farm-') === 0){
    showScreen('scr-farm','farm');
    selectZone(h.slice(5));
    return;
  }
  if(SCREEN_FOR_TAB[h]) showTab(h);
}

document.addEventListener('DOMContentLoaded', init);
})();
