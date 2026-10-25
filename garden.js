'use strict';
/* ====================================================================
   Eric Office : le potager à baies (à la place de l'arbre à baies du jardin)
   Tu achètes des graines avec tes pièces et tu les plantes dans tes parcelles (4 au départ, jusqu'à 9).
   Elles poussent en temps réel (même appli fermée) mais seulement quand la terre est humide :
   arrose en cliquant, ou laisse faire la vraie pluie de Lyon, tes agents jardiniers et tes Pokémon Eau.
   Récolte les baies mûres et utilise-les en combat (SAC → BAIES).
   ==================================================================== */
const BERRIES = {
  oran: { name: 'Baie Oran', c: '#3a78e0', price: 3, grow: 20, desc: 'Soigne 10 PV à ton Pokémon.' },
  framby: { name: 'Baie Framby', c: '#e03a5a', price: 5, grow: 30, desc: 'Capture plus facile (×1,5).' },
  nanab: { name: 'Baie Nanab', c: '#e070c0', price: 6, grow: 45, desc: 'Le Pokémon sauvage ne fuit plus.' },
  sitrus: { name: 'Baie Sitrus', c: '#f0d838', price: 8, grow: 60, desc: 'Soigne un quart des PV.' },
  nanana: { name: 'Baie Nanana', c: '#f09030', price: 10, grow: 90, desc: 'Double les pièces et l\'EXP du combat.' },
  dore: { name: 'Framby dorée', c: '#ffd040', price: 0, grow: 0, desc: 'Capture bien plus facile (×2,5). Récolte rare.' }
};
const WET_MIN = 45;                                    // un arrosage garde la terre humide 45 min
const PLOT_CELLS = [[19, 17], [20, 17], [19, 18], [20, 18], [21, 17], [21, 18], [19, 19], [20, 19], [21, 19]];
const PLOT_PRICE = [0, 0, 0, 0, 20, 30, 45, 60, 80];
DEX.farm = Object.assign({ n: 4, plots: [], bag: {} }, DEX.farm || {});
const FARM = DEX.farm;
PLOT_CELLS.forEach(c => block(...c));
const farmBag = () => FARM.bag;
function farmTake(k) { if (FARM.bag[k] > 0) { FARM.bag[k]--; saveDex(); return true; } return false; }
const plotFrac = p => p ? (BERRIES[p.k].grow ? Math.min(1, p.prog / (BERRIES[p.k].grow * 60e3)) : 1) : 0;
const plotStage = p => { const f = plotFrac(p); return f >= 1 ? 4 : f >= 0.7 ? 3 : f >= 0.4 ? 2 : f >= 0.15 ? 1 : 0; };
const plotWet = p => p && p.wet > Date.now();

/* ---------- la pousse : seulement quand la terre est humide ---------- */
function farmTick() {
  const now = Date.now(), rain = skyState(now).rain;
  FARM.plots.forEach((p, i) => {
    if (!p) return;
    if (rain && plotFrac(p) < 1) p.wet = Math.max(p.wet || 0, now + 10 * 60e3);
    const eff = Math.max(0, Math.min(now, p.wet || 0) - (p.last || now));
    p.prog += eff; p.last = now;
    if (plotFrac(p) >= 1 && !p.told) { p.told = true; news('🫐', 'Tes ' + BERRIES[p.k].name.replace('Baie ', 'Baies ') + ' sont mûres au potager !', 'party'); }
  });
}
farmTick(); saveDex();
let farmT = 0, farmSave = 0;
HOOKS.update.push((dt, now) => {
  if (now < farmT) return; farmT = now + 2000;
  farmTick();
  if (now > farmSave) { farmSave = now + 30000; saveDex(); }
});
function waterPlot(i, who) {
  const p = FARM.plots[i]; if (!p || plotFrac(p) >= 1) return false;
  p.wet = Date.now() + WET_MIN * 60e3; p.splash = performance.now(); saveDex();
  if (who === 'me') { stat('water'); if (typeof gTone === 'function') [0, 0.06, 0.12].forEach((d, k) => gTone(900 + k * 150, 0.05, 'sine', 0.03, d)); }
  return true;
}
const dryPlots = () => FARM.plots.map((p, i) => p && !plotWet(p) && plotFrac(p) < 1 ? i : -1).filter(i => i >= 0);
// les agents qui vont « arroser le potager » arrosent vraiment, et les Pokémon Eau du jardin aussi de temps en temps
const waterSpot = SPOTS.find(s => s.act === 'water');
if (waterSpot) {                                       // on ne va arroser que s'il y a une parcelle sèche
  const ok0 = waterSpot.ok; Object.assign(waterSpot, { cell: [20, 20], face: 'up', label: 'Arrose le potager à baies', ok: () => (!ok0 || ok0()) && dryPlots().length > 0 });
}
let helpT = 0, monWaterT = performance.now() + 8 * 60e3;
HOOKS.update.push((dt, now) => {
  if (now < helpT) return; helpT = now + 5000;
  const dry = dryPlots(); if (!dry.length) return;
  const gardener = playersOf('water')[0];
  if (gardener) { const i = dry[0]; waterPlot(i); emote(gardener, '💧', 1800); news('💧', gardener.name + ' arrose ton potager.'); return; }
  if (now > monWaterT && typeof MONS !== 'undefined') {
    monWaterT = now + 10 * 60e3;
    const m = MONS.find(m => dexEl(m.dex, 'w'));
    if (m) { dry.forEach(i => waterPlot(i)); emote(m, '💦', 2500); news('💦', m.name + ' arrose tout le potager avec un Pistolet à O !', 'party'); }
  }
});

/* ---------- dessin ---------- */
function berryPx(c, k, x, y, s) {                      // une baie en pixel art (7×7), pour le monde et l'interface
  const col = BERRIES[k].c, rows = ['...G...', '..GGO..', '.OCCCO.', 'OCHCCCO', 'OCCCCDO', '.ODDDO.', '..OOO..'];
  const pal = { O: '#2a2030', G: '#3a9a4a', C: col, H: mix(col, '#ffffff', 0.6), D: mix(col, '#000000', 0.3) };
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { c.fillStyle = pal[ch]; c.fillRect(x + i * s, y + j * s, s, s); } }));
}
HOOKS.floor.push(() => {
  for (let i = 0; i < FARM.n; i++) {
    const [cx, cy] = PLOT_CELLS[i], x0 = px(cx), y0 = py(cy), p = FARM.plots[i], wet = plotWet(p);
    R(x0 + 1, y0 + 2, 14, 13, FOUT); R(x0 + 2, y0 + 3, 12, 11, wet ? '#5a3a26' : '#8c6440');
    for (let r = 0; r < 3; r++) R(x0 + 3, y0 + 5 + r * 3, 10, 1, wet ? '#462c1c' : '#74502e');
    if (wet) { R(x0 + 3, y0 + 4, 3, 1, '#6e4c34'); R(x0 + 9, y0 + 10, 3, 1, '#6e4c34'); }          // terre mouillée : juste plus sombre et un peu brillante
    R(x0 + 1, y0 + 14, 14, 1, WOOD.dk); R(x0 + 1, y0 + 2, 14, 1, WOOD.lt);
  }
});
for (let i = 0; i < PLOT_CELLS.length; i++) furniture.push({ k: py(PLOT_CELLS[i][1]) + 12, draw(t) {
  const [cx0, cy0] = PLOT_CELLS[i], cx = px(cx0) + 8, by = py(cy0) + 13;
  if (i >= FARM.n) {                                   // la prochaine parcelle à vendre : un petit panneau
    if (i !== FARM.n) return;
    R(cx - 1, by - 8, 2, 8, '#6a3e22'); panel(cx - 6, by - 14, 12, 7, '#d8a868'); R(cx - 4, by - 12, 8, 1, '#7a5030'); R(cx - 4, by - 10, 5, 1, '#7a5030');
    return;
  }
  const p = FARM.plots[i]; if (!p) return;
  const st = plotStage(p), sw = Math.round(Math.sin(t * 1.5 + i) * 0.6);
  if (st === 0) { R(cx - 3, by - 4, 6, 2, '#6a4a2a'); R(cx - 1, by - 5, 2, 1, '#c8a070'); }
  else if (st === 1) { R(cx, by - 7, 1, 5, '#3a9a4a'); R(cx - 2 + sw, by - 8, 2, 2, '#5fc85a'); R(cx + 1 + sw, by - 9, 2, 2, '#5fc85a'); }
  else {
    const w = st === 2 ? 8 : st === 3 ? 11 : 12, h = st === 2 ? 7 : st === 3 ? 9 : 11;
    R(cx, by - 4, 1, 3, '#2e7d36');
    blob(cx - (w >> 1) + sw, by - 3 - h, w, h, '#4fae4a', '#1f5a2a');
    R(cx - (w >> 1) + 2 + sw, by - 2 - h, 3, 1, '#7fd070');
    if (st === 3) [[-3, -8], [2, -10], [3, -5]].forEach(([dx, dy]) => { R(cx + dx + sw, by + dy, 2, 2, '#ffffff'); R(cx + dx + sw, by + dy, 1, 1, BERRIES[p.k].c); });
    if (st === 4) {
      const col = BERRIES[p.k].c, hi = mix(col, '#ffffff', 0.6);
      [[-4, -10], [1, -12], [3, -7], [-2, -6]].forEach(([dx, dy]) => { R(cx + dx + sw - 1, by + dy - 1, 4, 4, '#2a2030'); R(cx + dx + sw, by + dy, 2, 2, col); R(cx + dx + sw, by + dy, 1, 1, hi); });
      if (Math.floor(t * 2 + i) % 3 === 0) { R(cx + 5, by - 15, 1, 3, '#ffffff'); R(cx + 4, by - 14, 3, 1, '#ffffff'); }
    }
  }
  if (!plotWet(p) && st < 4 && Math.floor(t * 1.2 + i * 0.3) % 2) { R(cx + 4, by - 16, 3, 4, '#2a2030'); R(cx + 5, by - 17, 1, 1, '#2a2030'); R(cx + 5, by - 15, 1, 2, '#6ab0f8'); }   // une goutte : « arrose-moi »
} });
HOOKS.post.push(t => {                                // arrosoir + gouttes, et petits chiffres de récolte
  const now = performance.now();
  FARM.plots.forEach((p, i) => {
    if (!p || !p.splash || now - p.splash > 1200) return;
    const [cx0, cy0] = PLOT_CELLS[i], x = px(cx0) + 12, y = py(cy0) - 6, q = (now - p.splash) / 1200;
    panel(x, y, 7, 5, '#4f86d6'); R(x - 3, y + 1, 3, 1, '#4f86d6'); R(x + 2, y - 2, 3, 2, '#4f86d6');
    for (let k = 0; k < 4; k++) { const d = (q * 3 + k / 4) % 1; R(x - 4 - k, y + 2 + Math.round(d * 12), 1, 2, '#9fd0ff'); }
  });
});
const FLOATS = [];
HOOKS.overlay.push(c => {
  const now = performance.now();
  for (let i = FLOATS.length - 1; i >= 0; i--) {
    const f = FLOATS[i], q = (now - f.t0) / 1600; if (q >= 1) { FLOATS.splice(i, 1); continue; }
    const [x, y] = toCss(f.x, f.y - q * 18);
    c.globalAlpha = 1 - q * q; c.font = '700 14px ' + FONT; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#2a2030'; c.strokeText(f.txt, x, y); c.fillStyle = f.c; c.fillText(f.txt, x, y); c.textAlign = 'left'; c.globalAlpha = 1;
  }
  if (farmHover < 0) return;
  const [cx0, cy0] = PLOT_CELLS[farmHover], p = FARM.plots[farmHover];
  const txt = farmHover >= FARM.n ? '🪧 Parcelle à vendre · ' + PLOT_PRICE[farmHover] + ' pièces · clic pour l\'acheter'
    : !p ? '🌱 Parcelle libre · clic pour planter'
    : plotFrac(p) >= 1 ? '🫐 ' + BERRIES[p.k].name + ' mûre ! · clic pour récolter'
    : '🌿 ' + BERRIES[p.k].name + ' · ' + Math.floor(plotFrac(p) * 100) + ' % · ' + (plotWet(p) ? '💧 humide (' + Math.ceil((p.wet - Date.now()) / 60e3) + ' min)' : '🌵 sèche · clic pour arroser');
  c.font = '600 11px ' + FONT; const w = Math.ceil(c.measureText(txt).width) + 16;
  const [x, y] = toCss(px(cx0) + 8, py(cy0) - 14);
  pkBox(c, x - w / 2, y - 17, w, 17, '#5fae5a');
  c.fillStyle = INK2; c.textAlign = 'center'; c.fillText(txt, x, y - 8); c.textAlign = 'left';
});

/* ---------- clics : planter, arroser, récolter, acheter ---------- */
let farmHover = -1;
const plotAt = e => { const [mx, my] = worldAt(e); return PLOT_CELLS.findIndex(([x, y], i) => i <= FARM.n && mx >= px(x) && mx < px(x) + 16 && my >= py(y) - 8 && my < py(y) + 16); };
cv.addEventListener('mousemove', e => { farmHover = (typeof BT !== 'undefined' && BT) ? -1 : plotAt(e); if (farmHover >= 0 && !LASER.on) cv.style.cursor = 'pointer'; });
cv.addEventListener('mouseleave', () => { farmHover = -1; });
cv.addEventListener('click', e => {
  if (LASER.on || (drag && drag.moved)) return;
  const i = plotAt(e); if (i < 0) return;
  const [cx0, cy0] = PLOT_CELLS[i], p = FARM.plots[i];
  if (i >= FARM.n) { buyPlot(); return; }
  if (!p) { openSeedPicker(i, e.clientX, e.clientY); return; }
  if (plotFrac(p) >= 1) { harvest(i); return; }
  if (plotWet(p)) FLOATS.push({ x: px(cx0) + 8, y: py(cy0) - 4, txt: 'Déjà humide 💧', c: '#9fd0ff', t0: performance.now() });
  else if (waterPlot(i, 'me')) FLOATS.push({ x: px(cx0) + 8, y: py(cy0) - 4, txt: '💧 Arrosé !', c: '#9fd0ff', t0: performance.now() });
});
function harvest(i) {
  const p = FARM.plots[i], [cx0, cy0] = PLOT_CELLS[i], n = 2 + Math.floor(Math.random() * 3), gold = Math.random() < 0.05;
  FARM.bag[p.k] = (FARM.bag[p.k] || 0) + n; if (gold) FARM.bag.dore = (FARM.bag.dore || 0) + 1;
  FARM.plots[i] = null; saveDex(); stat('harvest', n);
  FLOATS.push({ x: px(cx0) + 8, y: py(cy0) - 4, txt: '+' + n + ' ' + BERRIES[p.k].name, c: BERRIES[p.k].c, t0: performance.now() });
  if (gold) { FLOATS.push({ x: px(cx0) + 8, y: py(cy0) - 16, txt: '✨ +1 Framby dorée !', c: '#ffd040', t0: performance.now() + 300 }); news('✨', 'Une Framby dorée au potager !', 'party'); }
  if (typeof melody === 'function') melody(gold ? [72, 76, 79, 84, 88] : [72, 76, 79], 0.07);
}
function buyPlot() {
  if (FARM.n >= PLOT_CELLS.length) return;
  const price = PLOT_PRICE[FARM.n];
  if ((DEX.coins || 0) < price) { news('🪙', 'Il faut ' + price + ' pièces pour une nouvelle parcelle (tu en as ' + (DEX.coins || 0) + ').'); return; }
  if (!confirm('Acheter une nouvelle parcelle pour ' + price + ' pièces ?')) return;
  DEX.coins -= price; FARM.n++; saveDex(); updateDexButton();
  news('🌱', 'Nouvelle parcelle au potager ! (' + FARM.n + ' / ' + PLOT_CELLS.length + ')', 'party');
  if (!$dex.hidden) renderDex();
}
function plant(i, k) {
  const b = BERRIES[k]; if ((DEX.coins || 0) < b.price || FARM.plots[i]) return false;
  DEX.coins -= b.price; FARM.plots[i] = { k, prog: 0, wet: 0, last: Date.now() }; stat('planted');
  saveDex(); updateDexButton(); farmTick();
  const [cx0, cy0] = PLOT_CELLS[i]; FLOATS.push({ x: px(cx0) + 8, y: py(cy0) - 4, txt: '🌱 ' + b.name + ' plantée', c: '#a8ec84', t0: performance.now() });
  if (typeof gTone === 'function') gTone(520, 0.06, 'square', 0.03);
  return true;
}
// petite fenêtre pour choisir quoi planter
const $seed = document.createElement('div'); $seed.id = 'seedpick'; $seed.hidden = true; document.body.appendChild($seed);
function berryCanvas(k, s) { const c = document.createElement('canvas'); c.width = c.height = 7 * s; berryPx(c.getContext('2d'), k, 0, 0, s); return c; }
function openSeedPicker(i, x, y) {
  const coins = DEX.coins || 0;
  $seed.innerHTML = '<b>🌱 Planter une graine</b><small>🪙 ' + coins + ' pièces · pousse seulement quand la terre est humide</small>' +
    Object.entries(BERRIES).filter(([k]) => k !== 'dore').map(([k, b]) => '<button data-k="' + k + '"' + (coins < b.price ? ' disabled' : '') + '><span class="bi"></span><span><b>' + b.name + '</b><small>' + b.desc + '</small></span><em>' + b.price + ' 🪙<small>' + (b.grow >= 60 ? (b.grow / 60).toString().replace('.', ',') + ' h' : b.grow + ' min') + '</small></em></button>').join('') +
    '<button class="sp-x">Annuler</button>';
  $seed.querySelectorAll('[data-k]').forEach(btn => { btn.querySelector('.bi').appendChild(berryCanvas(btn.dataset.k, 3)); btn.onclick = () => { plant(i, btn.dataset.k); $seed.hidden = true; }; });
  $seed.querySelector('.sp-x').onclick = () => { $seed.hidden = true; };
  $seed.hidden = false;
  const w = $seed.offsetWidth, h = $seed.offsetHeight;
  $seed.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px'; $seed.style.top = Math.max(8, Math.min(innerHeight - h - 8, y - h - 12)) + 'px';
}
document.addEventListener('mousedown', e => { if (!$seed.hidden && !$seed.contains(e.target)) $seed.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') $seed.hidden = true; });

/* ---------- onglet « Potager » du Pokédex ---------- */
function renderFarm(body) {
  const bag = FARM.bag, coins = DEX.coins || 0;
  const plots = PLOT_CELLS.slice(0, FARM.n).map((c, i) => {
    const p = FARM.plots[i];
    return '<div class="fm-plot' + (p && plotFrac(p) >= 1 ? ' ripe' : '') + '">' + (p ? '<span class="bi" data-b="' + p.k + '"></span><b>' + BERRIES[p.k].name + '</b><small>' + (plotFrac(p) >= 1 ? 'Mûre ! Va la récolter' : Math.floor(plotFrac(p) * 100) + ' % · ' + (plotWet(p) ? '💧 humide' : '🌵 à arroser')) + '</small><i style="width:' + Math.floor(plotFrac(p) * 100) + '%"></i>' : '<b>Libre</b><small>clique sur la parcelle dans le jardin pour planter</small>') + '</div>';
  }).join('');
  body.innerHTML = '<div class="dx-dialog">Plante des graines, arrose (ou laisse la pluie de Lyon et tes agents le faire), récolte : tes baies servent en combat, dans le SAC.</div>' +
    '<h4>🧺 Tes baies</h4><div class="fm-bag">' + Object.entries(BERRIES).map(([k, b]) => '<div class="' + (bag[k] ? '' : 'none') + '"><span class="bi" data-b="' + k + '"></span><b>' + b.name + '</b><span class="n">×' + (bag[k] || 0) + '</span><small>' + b.desc + '</small></div>').join('') + '</div>' +
    '<h4>🌱 Tes parcelles (' + FARM.n + ' / ' + PLOT_CELLS.length + ')</h4><div class="fm-plots">' + plots + '</div>' +
    '<div class="fm-actions">' + (FARM.n < PLOT_CELLS.length ? '<button class="fm-buy"' + (coins < PLOT_PRICE[FARM.n] ? ' disabled' : '') + '>🪧 Nouvelle parcelle · ' + PLOT_PRICE[FARM.n] + ' 🪙</button>' : '') +
    '<button class="fm-water">💧 Tout arroser</button><button class="fm-go">🌳 Aller au potager</button></div>' +
    '<div class="dx-hint">Graines : ' + Object.entries(BERRIES).filter(([k]) => k !== 'dore').map(([k, b]) => b.name.replace('Baie ', '') + ' ' + b.price + ' 🪙 (' + (b.grow >= 60 ? (b.grow / 60).toString().replace('.', ',') + ' h' : b.grow + ' min') + ')').join(' · ') + '. Un arrosage garde la terre humide ' + WET_MIN + ' min. 5 % de chances de trouver une Framby dorée à la récolte.</div>';
  body.querySelectorAll('.bi[data-b]').forEach(s => s.appendChild(berryCanvas(s.dataset.b, 3)));
  const buy = body.querySelector('.fm-buy'); if (buy) buy.onclick = buyPlot;
  body.querySelector('.fm-water').onclick = () => { const d = dryPlots(); d.forEach(i => waterPlot(i, 'me')); news('💧', d.length ? d.length + ' parcelle' + (d.length > 1 ? 's' : '') + ' arrosée' + (d.length > 1 ? 's' : '') + '.' : 'Tout est déjà humide.'); renderDex(); };
  body.querySelector('.fm-go').onclick = () => { closeDex(); focusTiles(14, 26, 15, 22); };
}
