'use strict';
/* ====================================================================
   Eric Office : les Pokémon sauvages des hautes herbes
   Environ toutes les 10 minutes, ça bouge dans les hautes herbes du jardin : un Pokémon sauvage s'y cache
   (sa silhouette dépasse si tu ne l'as pas encore). Clique dessus : combat façon Rouge Feu / Vert Feuille.
   Attaque pour l'affaiblir (sans le mettre K.O. !), donne-lui une baie, lance une Ball.
   La capture suit la vraie formule des jeux (taux de capture, PV restants, bonus de la Ball, secousses).
   ==================================================================== */
const WILD_EVERY = 10 * 60e3, WILD_STAY = 4 * 60e3;
const WILD = { id: 0, cell: null, until: 0, next: performance.now() + 2 * 60e3, shiny: false, lvl: 5 };
const WILD_TIER_W = { commun: 50, peu: 30, rare: 14, epique: 5, legendaire: 1 };
const WILD_LVL = { commun: [3, 12], peu: [10, 20], rare: [18, 30], epique: [28, 40], legendaire: [50, 60] };
const WILD_FLEE = { commun: 0.03, peu: 0.05, rare: 0.08, epique: 0.12, legendaire: 0.2 };
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function wildPickMon() {
  const reg = REGIONS.find(r => r[0] === DEX.pullRegion), ghostNight = night();
  const tier = weighted(TIERS, t => WILD_TIER_W[t]);
  let pool = reg ? BY_TIER[tier].filter(id => id >= reg[1] && id <= reg[2]) : BY_TIER[tier];
  if (!pool.length) pool = BY_TIER[tier];
  if (ghostNight) { const gh = pool.filter(id => dexEl(id, 'g')); if (gh.length && Math.random() < 0.4) pool = gh; }   // la nuit, plus de spectres
  const fresh = pool.filter(id => !DEX.caught[id]);
  return fresh.length && Math.random() < 0.5 ? pick(fresh) : pick(pool);
}
function wildSpawn(id) {
  const cells = [];
  for (let y = TALL.y0; y < TALL.y1 - 1; y++) for (let x = TALL.x0; x < TALL.x1; x++) if (!tallBusy(x, y)) cells.push([x, y]);   // pas la dernière rangée (cachée par les sapins)
  if (!cells.length) return;
  WILD.id = id || wildPickMon(); WILD.cell = pick(cells); WILD.until = performance.now() + WILD_STAY;
  WILD.shiny = Math.random() < 1 / 64;
  const [a, b] = WILD_LVL[TIER_OF[WILD.id]]; WILD.lvl = rint(a, b);
  iconOf(WILD.id);
  news('🌿', 'Ça bouge dans les hautes herbes du jardin… Un Pokémon sauvage ! Clique dessus pour l\'affronter.', 'party');
  if (typeof gTone === 'function') [0, 0.08, 0.16].forEach((d, i) => gTone(660 + i * 220, 0.06, 'square', 0.025, d));
}
function wildGone() { WILD.id = 0; WILD.cell = null; WILD.next = performance.now() + WILD_EVERY * (0.8 + Math.random() * 0.4); }
HOOKS.update.push((dt, now) => {
  if (BT) return;
  if (WILD.id && now > WILD.until) { news('🍃', 'Le Pokémon des hautes herbes est reparti…'); wildGone(); return; }
  if (!WILD.id && now > WILD.next) { if (DEX.starter) wildSpawn(); else WILD.next = now + 60e3; }
});

/* ---------- dans le jardin : l'herbe qui s'agite, le Pokémon qui dépasse ---------- */
const SILS = new Map();
function silhouette(im) {
  let s = SILS.get(im);
  if (!s) { s = document.createElement('canvas'); s.width = im.width; s.height = im.height; const c = s.getContext('2d'); c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#1c2a22'; c.fillRect(0, 0, s.width, s.height); SILS.set(im, s); }
  return s;
}
HOOKS.items.push((items, t) => {
  if (!WILD.id || !WILD.cell || BT) return;
  const [cx, cy] = WILD.cell;
  items.push({ k: py(cy) + 11.5, draw() {                       // juste derrière les brins d'herbe de sa case
    const e = iconOf(WILD.id); if (!e.ok) return;
    const p = (t * 0.45) % 1, rise = p < 0.55 ? Math.round(Math.sin(p / 0.55 * Math.PI) * 12) : 0;
    if (!rise) return;
    const im = DEX.caught[WILD.id] ? e.norm : silhouette(e.norm), x = px(cx) + 8, line = py(cy) + 7;
    g.save(); g.beginPath(); g.rect(x - 30, line - 40, 60, 40); g.clip();
    g.drawImage(im, Math.round(x - im.width / 2), line - rise); g.restore();
  } });
});
HOOKS.post.push(t => {
  if (!WILD.id || !WILD.cell || BT) return;
  const [cx, cy] = WILD.cell, x = px(cx) + 8, y = py(cy);
  for (let i = 0; i < 3; i++) {                                 // feuilles qui volent
    const p = (t * 1.3 + i / 3) % 1, lx = x + Math.round(Math.sin(i * 2.1 + p * 4) * 9), ly = y + 4 - Math.round(p * 14);
    g.globalAlpha = 1 - p; R(lx, ly, 2, 1, '#6cc75a'); R(lx + 1, ly + 1, 1, 1, '#2e7d36'); g.globalAlpha = 1;
  }
  if ((t * 0.7) % 1 < 0.45) {                                   // bulle « ! »
    const by = y - 18 - Math.round(Math.abs(Math.sin(t * 6)) * 2);
    R(x - 4, by - 1, 9, 11, OUT); R(x - 3, by, 7, 9, '#ffffff'); R(x, by + 1, 1, 5, '#e0533f'); R(x, by + 7, 1, 1, '#e0533f');
  }
});
const wildHit = e => { if (!WILD.id || !WILD.cell || BT) return false; const [mx, my] = worldAt(e), [cx, cy] = WILD.cell; return mx >= px(cx) - 4 && mx <= px(cx) + 20 && my >= py(cy) - 22 && my <= py(cy) + 16; };
let wildHover = false;
cv.addEventListener('mousemove', e => { wildHover = wildHit(e); if (wildHover && !LASER.on) cv.style.cursor = 'pointer'; });
cv.addEventListener('mouseleave', () => { wildHover = false; });
cv.addEventListener('click', e => { if (wildHit(e) && !LASER.on && !(drag && drag.moved)) startBattle(); });
HOOKS.overlay.push(c => {
  if (!wildHover || !WILD.cell) return;
  const txt = '🌿 Un Pokémon sauvage se cache ici · clic pour l\'affronter';
  c.font = '600 11px ' + FONT; const w = Math.ceil(c.measureText(txt).width) + 16;
  const [x, y] = toCss(px(WILD.cell[0]) + 8, py(WILD.cell[1]) - 22);
  pkBox(c, x - w / 2, y - 17, w, 17, '#5fae5a');
  c.fillStyle = INK2; c.textAlign = 'center'; c.fillText(txt, x, y - 8); c.textAlign = 'left';
});

/* ====================================================================
   Le combat : un vrai écran de GBA (240 × 160), dessiné au canvas
   Effets d'attaque de Pokémon Showdown (play.pokemonshowdown.com/fx),
   cris des Pokémon de PokeAPI (github.com/PokeAPI/cries), sprites de PokeAPI. Musique et jingles originaux.
   Menus ATTAQUE / SAC / POKéMON / FUITE au clavier (flèches, Entrée, Échap) ou à la souris.
   Tes Pokémon gagnent de l'EXP. et montent de niveau (gardé dans le navigateur).
   ==================================================================== */
const GW = 240, GH = 160, GK = 4;
const $bt = document.createElement('div'); $bt.id = 'battle'; $bt.hidden = true;
$bt.innerHTML = '<div class="bt-wrap"><canvas width="' + GW * GK + '" height="' + GH * GK + '"></canvas>' +
  '<div class="bt-help">Clic ou Entrée : valider · Flèches : choisir · Échap ou clic droit : retour</div></div>';
document.body.appendChild($bt);
const btc = $bt.querySelector('canvas'), bx = btc.getContext('2d');
let BT = null;
const btWait = ms => new Promise(r => setTimeout(r, ms));
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = p => 1 - (1 - p) * (1 - p), easeIn = p => p * p;
const UP = id => dexName(id).toUpperCase();

/* ---------- ressources ---------- */
const SHOW = 'https://play.pokemonshowdown.com/fx/';
const SPB = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const CRY_URL = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/';
function loadImg(url, fb) {
  const im = new Image(); if (!url.startsWith(SHOW)) im.crossOrigin = 'anonymous';
  im.onerror = () => { if (fb && im.src !== fb) { im.flipFb = true; im.src = fb; } else im.bad = true; };
  im.src = url; return im;
}
const imOk = im => im && im.complete && im.naturalWidth > 0 && !im.bad;
const FXI = {}; ['waterwisp', 'fireball', 'lightning', 'shadowball', 'impact', 'wisp', 'leftslash', 'rightslash'].forEach(k => { FXI[k] = loadImg(SHOW + k + '.png'); });
const frontUrl = (id, shiny) => shiny ? SPB + (id <= 386 ? 'versions/generation-iii/firered-leafgreen/shiny/' : id <= 649 ? 'versions/generation-v/black-white/shiny/' : 'shiny/') + id + '.png' : SPRITE.front(id);
const backUrl = id => SPB + (id <= 386 ? 'versions/generation-iii/firered-leafgreen/back/' : id <= 649 ? 'versions/generation-v/black-white/back/' : 'back/') + id + '.png';
function playCry(id, rate) {
  if (SETTINGS.gachaMute) return;
  try {
    const a = new Audio(CRY_URL + (id <= 649 ? 'legacy/' : 'latest/') + id + '.ogg'); a.volume = 0.32;
    if (rate) { a.preservesPitch = false; a.playbackRate = rate; }
    a.onerror = () => { if (a.src.includes('/legacy/')) { a.src = a.src.replace('/legacy/', '/latest/'); a.play().catch(() => { }); } };
    a.play().catch(() => { });
  } catch { }
}
const bs = {
  tone: (f, d, ty, v, w) => { if (typeof gTone === 'function') gTone(f, d, ty, v, w); },
  noise: (d, v, w, hp) => { if (typeof gNoise === 'function') gNoise(d, v, w, hp); },
  mel: (n, s, ty, v) => (typeof melody === 'function' ? melody(n, s, ty, v) : 0)
};
// musique de combat (composition originale, en boucle, mesure par mesure)
const MUS = {
  lead: [76, 0, 76, 79, 81, 0, 79, 76, 74, 0, 74, 76, 79, 0, 76, 74, 72, 0, 72, 74, 76, 0, 74, 72, 71, 0, 71, 72, 74, 0, 79, 0,
    76, 0, 76, 79, 81, 0, 83, 84, 86, 0, 84, 83, 81, 0, 79, 0, 77, 0, 76, 74, 76, 0, 79, 81, 83, 0, 81, 79, 76, 0, 0, 0],
  bass: [45, 0, 57, 45, 45, 0, 57, 45, 43, 0, 55, 43, 43, 0, 55, 43, 41, 0, 53, 41, 41, 0, 53, 41, 40, 0, 52, 40, 44, 0, 56, 44],
  step: 0.13, t: 0, bar: 0
};
function startMusic() {
  stopMusic(); MUS.bar = 0;
  const bar = () => {
    if (!BT || BT.musicOff) return;
    const b = MUS.bar++ % 8;
    if (!SETTINGS.gachaMute) for (let i = 0; i < 8; i++) {
      const l = MUS.lead[b * 8 + i], s = MUS.bass[(b % 4) * 8 + i];
      if (l) bs.tone(NOTE(l), MUS.step * 0.9, 'square', 0.013, i * MUS.step);
      if (s) bs.tone(NOTE(s), MUS.step * 0.95, 'triangle', 0.04, i * MUS.step);
    }
    MUS.t = setTimeout(bar, 8 * MUS.step * 1000);
  };
  bar();
}
function stopMusic() { clearTimeout(MUS.t); }

/* ---------- règles : attaques, types, niveaux ---------- */
const TYPE_FR = { w: 'EAU', f: 'FEU', e: 'ÉLECTRIK', v: 'VOL', g: 'SPECTRE', n: 'NORMAL' };
const MOVES = {
  w: { name: 'Pistolet à O', type: 'w', power: 40, pp: 25 }, f: { name: 'Flammèche', type: 'f', power: 40, pp: 25 },
  e: { name: 'Éclair', type: 'e', power: 40, pp: 30 }, v: { name: 'Cru-Ailes', type: 'v', power: 60, pp: 35 },
  g: { name: 'Léchouille', type: 'g', power: 30, pp: 30 }, n: { name: 'Coud\'Krâne', type: 'n', power: 70, pp: 15 },
  tackle: { name: 'Charge', type: 'n', power: 35, pp: 35 }
};
const elsOf = id => ['w', 'f', 'e', 'v', 'g'].filter(k => dexEl(id, k));
const movesOf = id => { const e = elsOf(id)[0]; return [Object.assign({ key: 'a' }, MOVES[e || 'n']), Object.assign({ key: 'b' }, MOVES.tackle)]; };
function effect(mt, foe) {                                     // table des types (réduite aux types connus)
  const T = { w: { f: 2, w: 0.5 }, f: { w: 0.5, f: 0.5 }, e: { w: 2, v: 2, e: 0.5 }, v: { e: 0.5 }, g: { g: 2 }, n: { g: 0 } };
  return elsOf(foe).reduce((m, k) => m * ((T[mt] || {})[k] ?? 1), 1);
}
const maxHp = L => 18 + L * 2;
const xpNeed = L => 12 + L * 3;
const XPT = { commun: 1, peu: 1.3, rare: 1.7, epique: 2.2, legendaire: 3 };
function monLvl(id) { DEX.lv = DEX.lv || {}; return DEX.lv[id] || (DEX.lv[id] = Math.min(40, 8 + (DEX.caught[id] || 1) * 2)); }
const xpRatio = (id, L) => ((DEX.xp || {})[id] || 0) / xpNeed(L);

/* ---------- animation : petites interpolations et effets ---------- */
const TW = [], FX = [];
function tw(ms, fn, ease) { return new Promise(res => TW.push({ t0: performance.now(), ms, fn, ease: ease || (p => p), res })); }
function fxRun(ms, draw) { return new Promise(res => FX.push({ t0: performance.now(), ms, draw, res })); }
function stepAnims(now) {
  for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i], p = Math.min(1, (now - w.t0) / w.ms); w.fn(w.ease(p)); if (p >= 1) { TW.splice(i, 1); w.res(); } }
}
const mkObj = (x, y) => ({ x, y, dx: 0, dy: 0, scale: 1, white: 0, tint: null, alpha: 1, sink: 0, show: true, blink: false });
const P = (x, y, w, h, c) => { bx.fillStyle = c; bx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function rbox(x, y, w, h, fill, line) {
  P(x + 2, y, w - 4, h, line); P(x, y + 2, w, h - 4, line); P(x + 1, y + 1, w - 2, h - 2, line);
  P(x + 2, y + 1, w - 4, h - 2, fill); P(x + 1, y + 2, w - 2, h - 4, fill);
}
function txt(s, x, y, c, sh, size, align, weight) {
  bx.font = (weight || 600) + ' ' + (size || 10) + 'px ' + FONT; bx.textAlign = align || 'left'; bx.textBaseline = 'alphabetic';
  if (sh) { bx.fillStyle = sh; bx.fillText(s, x + 0.75, y + 0.75); }
  bx.fillStyle = c; bx.fillText(s, x, y);
}
function wrapText(s, maxW, size) {
  bx.font = '600 ' + size + 'px ' + FONT;
  const out = []; let line = '';
  s.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (bx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line);
  return out;
}
function pline(x0, y0, x1, y1, c, w) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) P(lerp(x0, x1, i / n) - (w >> 1), lerp(y0, y1, i / n) - (w >> 1), w, w, c);
}
function pell(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); P(cx - hw, cy + y, hw * 2, 1, c); } }
// sprite d'un Pokémon : blanc / teinte (sortie de Ball), clignement (coup reçu), enfoncement (K.O.)
const tcv = document.createElement('canvas'), tcx = tcv.getContext('2d');
function drawMon(o, im, clipY) {
  if (!o.show || o.blink || !imOk(im)) return;
  const n = im.naturalWidth, base = n <= 64 ? 1 : 0.78, s = base * o.scale;
  const w = Math.max(1, Math.round(n * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
  if (o.scale <= 0.02) return;
  const x = Math.round(o.x + o.dx - w / 2), y = Math.round(o.y + o.dy - h + o.sink * h * 1.1);
  let src = im;
  if (o.white > 0 || im.flipFb) {
    tcv.width = w; tcv.height = h; tcx.imageSmoothingEnabled = false;
    tcx.save(); if (im.flipFb) { tcx.translate(w, 0); tcx.scale(-1, 1); } tcx.drawImage(im, 0, 0, w, h); tcx.restore();
    if (o.white > 0) { tcx.globalCompositeOperation = 'source-atop'; tcx.globalAlpha = o.white; tcx.fillStyle = o.tint || '#ffffff'; tcx.fillRect(0, 0, w, h); tcx.globalAlpha = 1; tcx.globalCompositeOperation = 'source-over'; }
    src = tcv;
  }
  bx.save();
  if (clipY != null) { bx.beginPath(); bx.rect(0, 0, GW, clipY); bx.clip(); }
  bx.globalAlpha = o.alpha; bx.drawImage(src, x, y, w, h); bx.restore();
}
function hpBar(x, y, w, r) {
  rbox(x, y, w, 7, '#404850', '#404850');
  txt('PV', x + 2.5, y + 6, '#f8b030', null, 6, 'left', 700);
  const bw = w - 15, fw = Math.round(bw * clamp01(r)), c = r > 0.5 ? ['#70f8a8', '#58d080'] : r > 0.2 ? ['#f8e038', '#c8a808'] : ['#f85838', '#a84048'];
  P(x + 13, y + 2, bw, 3, '#f8f8f8'); if (fw > 0) { P(x + 13, y + 2, fw, 3, c[0]); P(x + 13, y + 2, fw, 1, c[1]); }
}
function miniBall(x, y) { P(x, y, 5, 5, '#303030'); P(x + 1, y + 1, 3, 1, '#f85838'); P(x + 1, y + 3, 3, 1, '#f8f8f8'); P(x + 2, y + 2, 1, 1, '#f8f8f8'); }
function cursor(x, y) { P(x, y, 1, 7, '#484848'); P(x + 1, y + 1, 1, 5, '#484848'); P(x + 2, y + 2, 1, 3, '#484848'); P(x + 3, y + 3, 1, 1, '#484848'); }

/* ---------- dessin d'une image du combat ---------- */
function drawBg(now) {
  const nightMode = typeof night === 'function' && night();
  // fond « hautes herbes » façon Rouge Feu : ciel, collines, champ rayé, deux plateformes d'herbe
  for (let y = 0; y < 52; y += 4) P(0, y, GW, 4, mix('#a8d8f8', '#e8f8f0', y / 52));
  for (let x = 0; x < GW; x++) { const h = 6 + Math.round(Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 2); P(x, 52 - h, 1, h, '#88c070'); }
  P(0, 52, GW, 60, '#b8e090'); for (let y = 54, k = 0; y < 112; y += 4 + (k++ >> 1)) P(0, y, GW, 1, '#d0f0a8');
  pell(176 - BT.slide * 240, 74, 56, 11, '#68a048'); pell(176 - BT.slide * 240, 73, 53, 9, '#a8d878'); pell(170 - BT.slide * 240, 71, 36, 5, '#c8e898');
  pell(62 + BT.slide * 240, 110, 66, 13, '#68a048'); pell(62 + BT.slide * 240, 109, 63, 11, '#a8d878');
  if (nightMode) { bx.fillStyle = 'rgba(30,40,90,.38)'; bx.fillRect(0, 0, GW, 112); }
}
function drawFoeBox() {
  const x = 10 + BT.boxF.dx, y = 14;
  P(x + 2, y + 2, 104, 30, 'rgba(40,48,40,.35)');
  rbox(x, y, 104, 30, '#f8f8d8', '#404838'); P(x + 3, y + 26, 98, 1, '#d8d8b0');
  txt(BT.name, x + 7, y + 11, '#404040', '#d8d0b0', 9.5, 'left', 700);
  bx.font = '700 9.5px ' + FONT; let ex = x + 9 + bx.measureText(BT.name).width;
  if (BT.gender) { txt(BT.gender, ex, y + 11, BT.gender === '♂' ? '#3890f8' : '#f86868', null, 9, 'left', 700); ex += 8; }
  if (DEX.caught[BT.id]) miniBall(ex + 1, y + 4);
  txt('N.' + BT.lvl, x + 98, y + 11, '#404040', '#d8d0b0', 9, 'right', 700);
  hpBar(x + 30, y + 15, 68, BT.fhpS / BT.fmax);
}
function drawMeBox(bob) {
  const m = BT.team[BT.cur], x = 126 + BT.boxM.dx, y = 70 + bob;
  P(x + 2, y + 2, 108, 38, 'rgba(40,48,40,.35)');
  rbox(x, y, 108, 38, '#f8f8d8', '#404838');
  txt(m.name, x + 9, y + 11, '#404040', '#d8d0b0', 9.5, 'left', 700);
  txt('N.' + m.L, x + 102, y + 11, '#404040', '#d8d0b0', 9, 'right', 700);
  hpBar(x + 34, y + 15, 68, BT.mhpS / m.max);
  txt(Math.max(0, Math.ceil(BT.mhpS)) + '/' + m.max, x + 101, y + 30, '#404040', '#d8d0b0', 8.5, 'right', 700);
  P(x + 24, y + 32, 80, 4, '#404850'); txt('EXP', x + 8, y + 36, '#f8b030', null, 5.5, 'left', 700);
  P(x + 26, y + 33, 76, 2, '#585858'); P(x + 26, y + 33, Math.round(76 * clamp01(BT.xpS)), 2, '#40c8f8');
  if (BT.lvFlash) { bx.globalAlpha = BT.lvFlash; P(x, y, 108, 38, '#ffffff'); bx.globalAlpha = 1; }
}
function drawText(now, w) {
  P(0, 112, GW, 48, '#283040');
  rbox(2, 114, w || 236, 44, '#40586e', '#c87840'); P(4, 116, (w || 236) - 4, 1, '#58708a');
  if (!BT.page) return;
  let left = BT.chars;
  BT.page.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; txt(s, 11, 131 + i * 15, '#f8f8f8', '#283040', 10.5); });
  if (BT.more && Math.floor(now / 280) % 2) { const ax = (w || 236) - 8, ay = 148; P(ax, ay, 7, 1, '#f86838'); P(ax + 1, ay + 1, 5, 1, '#f86838'); P(ax + 2, ay + 2, 3, 1, '#f86838'); P(ax + 3, ay + 3, 1, 1, '#f86838'); }
}
function menuItem(i, label, x, y, size, dis) {
  const m = BT.menu, w = (m.cw || 70);
  BT.rects[i] = { x: x - 10, y: y - size - 2, w, h: size + 6 };
  if (m.cur === i) cursor(x - 8, y - size + 2);
  txt(label, x, y, dis ? '#b0b0b0' : '#484848', dis ? null : '#d0d0c8', size, 'left', 700);
}
function drawMenu(now) {
  const m = BT.menu; if (!m) return;
  if (m.kind === 'main') {
    drawText(now, 116); txt('Que doit faire', 11, 131, '#f8f8f8', '#283040', 10.5); txt(BT.team[BT.cur].name + ' ?', 11, 146, '#f8f8f8', '#283040', 10.5);
    rbox(120, 113, 118, 46, '#f8f8f8', '#706880'); P(122, 115, 114, 1, '#d8d0e0');
    m.cw = 54; m.items.forEach((it, i) => menuItem(i, it.label, 134 + (i % 2) * 54, 133 + (i >> 1) * 17, 10, it.dis));
  } else if (m.kind === 'moves') {
    P(0, 112, GW, 48, '#283040'); rbox(1, 113, 158, 46, '#f8f8f8', '#706880'); rbox(161, 113, 78, 46, '#f8f8f8', '#706880');
    m.cw = 74; m.items.forEach((it, i) => menuItem(i, it.label, 14 + (i % 2) * 74, 133 + (i >> 1) * 17, 9, it.dis));
    const it = m.items[m.cur];
    if (it && it.info) {
      const mm = BT.team[BT.cur], left = mm.pp[it.k];
      txt('PP', 168, 131, '#484848', '#d0d0c8', 9, 'left', 700);
      txt(left + '/' + it.info.pp, 232, 131, left ? '#484848' : '#f85838', '#d0d0c8', 9, 'right', 700);
      txt('TYPE/' + TYPE_FR[it.info.type], 168, 149, '#484848', '#d0d0c8', 8.5, 'left', 700);
    } else if (it && it.k === 'back') txt('Retour', 168, 140, '#484848', '#d0d0c8', 9, 'left', 700);
  } else if (m.kind === 'bag') {
    P(0, 112, GW, 48, '#283040'); rbox(1, 113, 158, 46, '#f8f8f8', '#706880'); rbox(161, 113, 78, 46, '#f8f8f8', '#706880');
    m.cw = 74; m.items.forEach((it, i) => menuItem(i, it.label, 14 + (i % 2) * 74, 123 + (i >> 1) * 10.5, 7, it.dis));
    const it = m.items[m.cur];
    txt((m.pocket === 'berries' ? 'BAIES' : 'BALLS') + ' · ' + (DEX.coins || 0) + ' p.', 166, 124, '#484848', '#d0d0c8', 7.5, 'left', 700);
    if (it && it.info) {
      txt(it.info.price, 166, 136, '#3868b8', null, 7.5, 'left', 700);
      wrapText(it.info.desc, 68, 7).slice(0, 2).forEach((l, i) => txt(l, 166, 147 + i * 9, '#585858', null, 7, 'left', 600));
    }
  } else if (m.kind === 'party') drawParty(now);
}
function drawParty(now) {
  for (let y = 0; y < GH; y += 8) for (let x = 0; x < GW; x += 8) P(x, y, 8, 8, ((x + y) >> 3) % 2 ? '#3870a8' : '#3068a0');
  const m = BT.menu;
  BT.team.forEach((t, i) => {
    const x = 6 + (i % 2) * 116, y = 6 + (i >> 1) * 42, sel = m.cur === i, dead = t.hp <= 0, act = i === BT.cur;
    BT.rects[i] = { x, y, w: 110, h: 38 };
    rbox(x, y, 110, 38, sel ? '#f8b850' : '#304050', sel ? '#f8b850' : '#304050');
    rbox(x + 1, y + 1, 108, 36, dead ? '#e8b8b0' : act ? '#f8f0b8' : '#f8f8f0', dead ? '#e8b8b0' : act ? '#f8f0b8' : '#f8f8f0');
    const e = iconOf(t.id);
    if (e.ok) { const k = Math.min(28 / e.norm.width, 26 / e.norm.height, 1), bob = sel && !dead && Math.floor(now / 200) % 2 ? -1 : 0; bx.drawImage(e.norm, x + 4, y + 6 + bob, e.norm.width * k, e.norm.height * k); }
    txt(t.name, x + 36, y + 12, '#404040', '#d0d0c8', 8.5, 'left', 700);
    txt('N.' + t.L, x + 104, y + 12, '#404040', '#d0d0c8', 8, 'right', 700);
    hpBar(x + 36, y + 17, 68, t.hp / t.max);
    txt(dead ? 'K.O.' : Math.ceil(t.hp) + '/' + t.max, x + 104, y + 34, dead ? '#c03030' : '#404040', '#d0d0c8', 8, 'right', 700);
  });
  rbox(4, 134, 170, 22, '#f8f8f8', '#304050'); txt(m.prompt || 'Choisis un POKéMON.', 11, 149, '#404040', '#d0d0c8', 9, 'left', 700);
  const bi = m.items.findIndex(it => it.k === 'back');
  if (bi >= 0) {
    BT.rects[bi] = { x: 180, y: 136, w: 56, h: 18 };
    rbox(180, 136, 56, 18, m.cur === bi ? '#f8b850' : '#f8f8f8', '#304050'); txt('RETOUR', 208, 149, '#404040', null, 8.5, 'center', 700);
  }
}
// la Ball en pixel art (12 × 12, contour fin), comme les sprites du jeu ; en deux moitiés quand elle s'ouvre
const BALL_ROWS = ['....OOOO....', '..OOTTTTOO..', '.OTTTTTTHHO.', '.OTTTTTTTHO.', 'OTTTTOOTTTTO', 'OOOOOWWOOOOO',
  'OWWWOWWOWWWO', 'OWWWWOOWWWWO', '.OWWWWWWWWO.', '.OSWWWWWWSO.', '..OOSSSSOO..', '....OOOO....'];
const BALL_COL = { poke: ['#f05038', '#ff9a80'], super: ['#3878e8', '#88b8ff'], hyper: ['#383848', '#686878'], master: ['#8848d0', '#c090f0'] };
const BALL_DOTS = { super: [[2, 3, '#f05038'], [2, 8, '#f05038'], [3, 2, '#f05038'], [3, 9, '#f05038']], hyper: [[1, 4, '#f8d038'], [2, 3, '#f8d038'], [1, 7, '#f8d038'], [2, 8, '#f8d038']],
  master: [[2, 3, '#ff90d0'], [2, 8, '#ff90d0'], [2, 5, '#ffffff'], [2, 6, '#ffffff'], [3, 5, '#ffffff'], [3, 6, '#ffffff']] };
const BALLS_PX = new Map();
function ballPx(kind, dark) {
  const key = kind + (dark ? 'd' : ''); let c = BALLS_PX.get(key);
  if (c) return c;
  const [t, h] = BALL_COL[kind] || BALL_COL.poke, pal = { O: '#303040', T: t, H: h, W: '#f8f8f8', S: '#c8c8d8' };
  c = document.createElement('canvas'); c.width = c.height = 12; const cc = c.getContext('2d');
  BALL_ROWS.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { cc.fillStyle = dark ? mix(pal[ch], '#000000', 0.35) : pal[ch]; cc.fillRect(x, y, 1, 1); } }));
  (BALL_DOTS[kind] || []).forEach(([y, x, col]) => { cc.fillStyle = dark ? mix(col, '#000000', 0.35) : col; cc.fillRect(x, y, 1, 1); });
  BALLS_PX.set(key, c); return c;
}
function drawBall(b) {
  const im = ballPx(b.kind || 'poke', b.dark);
  bx.save(); bx.translate(Math.round(b.x), Math.round(b.y));
  if (b.open) {                                      // lueur douce, et le haut de la Ball qui bascule
    const gr = bx.createRadialGradient(0, 0, 1, 0, 0, 14); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(0.5, 'rgba(255,230,230,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    bx.fillStyle = gr; bx.beginPath(); bx.arc(0, 0, 14, 0, Math.PI * 2); bx.fill();
    bx.drawImage(im, 0, 6, 12, 6, -6, 0, 12, 6);
    bx.save(); bx.translate(-6, 0); bx.rotate(-0.6); bx.drawImage(im, 0, 0, 12, 6, 0, -6, 12, 6); bx.restore();
  } else { bx.rotate(b.rot || 0); bx.drawImage(im, -6, -6); }
  bx.restore();
}
function btFrame(now) {
  if (!BT) return;
  requestAnimationFrame(btFrame);
  stepAnims(now);
  BT.rects = [];
  bx.setTransform(GK, 0, 0, GK, 0, 0); bx.imageSmoothingEnabled = false;
  P(0, 0, GW, GH, '#000000');
  bx.save();
  if (BT.shake) bx.translate(Math.round((Math.random() * 2 - 1) * BT.shake), Math.round((Math.random() * 2 - 1) * BT.shake * 0.5));
  drawBg(now);
  const sl = BT.slide * 240, menuMain = BT.menu && BT.menu.kind === 'main', bob = menuMain && Math.floor(now / 300) % 2 ? 1 : 0;
  BT.foe.dx0 = -sl; BT.me.dx0 = sl;
  const fo = Object.assign({}, BT.foe, { dx: BT.foe.dx - sl }), mo = Object.assign({}, BT.me, { dx: BT.me.dx + sl, dy: BT.me.dy + bob });
  drawMon(fo, BT.front, BT.foe.sink ? 86 : null);
  if (BT.trainerCv && BT.trainer.show) { const c = BT.trainerCv; bx.drawImage(c, Math.round(BT.trainer.x + sl - c.width * 1.5), 113 - c.height * 3, c.width * 3, c.height * 3); }
  drawMon(mo, BT.team[BT.cur].back);
  FX.slice().forEach(f => { const p = Math.min(1, (now - f.t0) / f.ms); f.draw(p, now); if (p >= 1) { FX.splice(FX.indexOf(f), 1); f.res(); } });
  if (BT.ball) drawBall(BT.ball);
  if (BT.boxF.show) drawFoeBox();
  if (BT.boxM.show) drawMeBox(menuMain ? 1 - bob : 0);
  bx.restore();
  if (BT.menu) drawMenu(now); else drawText(now);
  if (BT.flash > 0) { bx.globalAlpha = BT.flash; P(0, 0, GW, GH, BT.flashC || '#ffffff'); bx.globalAlpha = 1; }
  if (BT.black > 0) { bx.globalAlpha = BT.black; P(0, 0, GW, GH, '#000000'); bx.globalAlpha = 1; }
  // PV dans le rouge : le bip d'alerte des jeux
  const cur = BT.team[BT.cur];
  if (BT.menu && cur.hp > 0 && cur.hp / cur.max <= 0.2 && now > BT.beepAt) { BT.beepAt = now + 900; bs.tone(1320, 0.07, 'square', 0.02); bs.tone(1320, 0.07, 'square', 0.02, 0.12); }
}

/* ---------- textes et menus ---------- */
function showPage(lines, hold) {
  return new Promise(res => {
    BT.menu = null; BT.page = lines; BT.chars = 0; BT.more = false;
    const total = lines.join('').length;
    let done = false;
    const finish = () => { if (done) return; done = true; clearTimeout(BT.autoT); clearInterval(BT.typeT); BT.adv = null; BT.more = false; res(); };
    BT.adv = () => { BT.chars = total; };
    const iv = BT.typeT = setInterval(() => {
      if (!BT) { clearInterval(iv); return res(); }
      BT.chars = Math.min(total, BT.chars + 1);
      if (BT.chars >= total) { clearInterval(BT.typeT); BT.more = true; BT.adv = finish; BT.autoT = setTimeout(finish, hold || 2400); }
    }, 24);
  });
}
async function btSay(s, hold) {
  const lines = wrapText(s, 214, 10.5);
  for (let i = 0; i < lines.length; i += 2) { if (!BT) return; await showPage(lines.slice(i, i + 2), hold); }
}
function btChoose(m) {
  return new Promise(res => {
    m.cur = m.cur || 0;
    if (!m.items[m.cur] || m.items[m.cur].dis) { const f = m.items.findIndex(i => !i.dis); m.cur = f < 0 ? 0 : f; }
    BT.page = null; BT.adv = null; BT.menu = m;
    m.pick = i => { const it = m.items[i]; if (!it || it.dis) { bs.tone(160, 0.06, 'square', 0.03); return; } bs.tone(1250, 0.035, 'square', 0.03); BT.menu = null; res(it.k); };
    m.back = () => { if (m.backKey) { bs.tone(900, 0.03, 'square', 0.03); BT.menu = null; res(m.backKey); } };
  });
}
document.addEventListener('keydown', e => {
  if (!BT || $bt.hidden) return;
  const k = e.key, m = BT.menu, ok = k === 'Enter' || k === ' ' || k === 'z' || k === 'Z', back = k === 'Escape' || k === 'Backspace' || k === 'x' || k === 'X';
  if (!ok && !back && !k.startsWith('Arrow')) return;
  e.preventDefault(); e.stopPropagation();
  if (!m) { if (ok && BT.adv) BT.adv(); return; }
  const n = m.items.length, c = m.cols || 1, old = m.cur;
  if (k === 'ArrowLeft' && m.cur % c > 0) m.cur--;
  else if (k === 'ArrowRight' && m.cur % c < c - 1 && m.cur + 1 < n) m.cur++;
  else if (k === 'ArrowUp' && m.cur - c >= 0) m.cur -= c;
  else if (k === 'ArrowDown') m.cur = Math.min(n - 1, m.cur + c);
  else if (ok) m.pick(m.cur);
  else if (back) m.back();
  if (m.cur !== old) bs.tone(1000, 0.02, 'square', 0.02);
}, true);
const toLogical = e => { const r = btc.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * GW, (e.clientY - r.top) / r.height * GH]; };
const rectAt = e => { const [x, y] = toLogical(e); return (BT.rects || []).findIndex(r => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); };
btc.addEventListener('mousemove', e => {
  if (!BT) return;
  if (!BT.menu) { btc.style.cursor = BT.adv ? 'pointer' : 'default'; return; }
  const i = rectAt(e); btc.style.cursor = i >= 0 ? 'pointer' : 'default';
  if (i >= 0 && BT.menu.cur !== i) { BT.menu.cur = i; bs.tone(1000, 0.02, 'square', 0.015); }
});
btc.addEventListener('click', e => { if (!BT) return; if (BT.menu) { const i = rectAt(e); if (i >= 0) BT.menu.pick(i); } else if (BT.adv) BT.adv(); });
btc.addEventListener('contextmenu', e => { if (BT && BT.menu) { e.preventDefault(); BT.menu.back(); } });

/* ---------- animations d'attaque (effets de Pokémon Showdown) ---------- */
function sprite(k, x, y, s, a, rot) {
  const im = FXI[k]; if (!imOk(im)) return false;
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  bx.save(); bx.globalAlpha = a == null ? 1 : a; bx.imageSmoothingEnabled = true; bx.translate(x, y); if (rot) bx.rotate(rot);
  bx.drawImage(im, -w / 2, -h / 2, w, h); bx.restore(); return true;
}
async function blinkObj(o) { await tw(480, p => { o.blink = Math.floor(p * 8) % 2 === 1; }); o.blink = false; }
async function moveAnim(t, mine) {
  const A = mine ? BT.me : BT.foe, d = mine ? 1 : -1;
  const from = mine ? [78, 84] : [170, 52], to = mine ? [176, 50] : [62, 86];
  if (t === 'n' || t === 'v') {                                  // l'attaquant fonce sur sa cible
    bs.noise(0.12, 0.05, 0, 2000);
    await tw(130, p => { A.dx = 12 * d * p; A.dy = -6 * d * p; }, easeOut);
    if (t === 'v') {
      bs.noise(0.3, 0.07, 0, 3000);
      fxRun(420, p => { ['leftslash', 'rightslash'].forEach((k, i) => { const q = clamp01(p * 1.6 - i * 0.4); if (q > 0 && q < 1) sprite(k, to[0] + (i ? 6 : -6), to[1], 0.35, 1 - q); }); });
    } else fxRun(300, p => { if (!sprite('impact', to[0], to[1], 0.25 + p * 0.25, 1 - p)) { pline(to[0] - 8 * p, to[1], to[0] + 8 * p, to[1], '#fff', 2); pline(to[0], to[1] - 8 * p, to[0], to[1] + 8 * p, '#fff', 2); } });
    await tw(150, p => { A.dx = 12 * d * (1 - p); A.dy = -6 * d * (1 - p); });
    A.dx = 0; A.dy = 0; await btWait(220);
  } else if (t === 'w') {
    [0, 1, 2, 3, 4, 5].forEach(i => bs.tone(600 + i * 90, 0.05, 'sine', 0.04, i * 0.07));
    await fxRun(760, p => {
      for (let i = 0; i < 7; i++) {
        const q = clamp01(p * 1.7 - i * 0.1); if (q <= 0 || q >= 1) continue;
        const x = lerp(from[0], to[0], q), y = lerp(from[1], to[1], q) - Math.sin(q * Math.PI) * 14;
        if (!sprite('waterwisp', x, y, 0.22, 0.95)) { P(x - 1, y - 1, 3, 3, '#3888f8'); P(x - 1, y - 1, 1, 1, '#c8e8ff'); }
      }
      if (p > 0.6) { const s = (p - 0.6) / 0.4; for (let k = 0; k < 7; k++) { const a = k * 0.9; P(to[0] + Math.cos(a) * (4 + s * 13), to[1] + Math.sin(a) * (3 + s * 8), 2, 2, '#68b0f8'); } }
    });
  } else if (t === 'f') {
    bs.noise(0.6, 0.06, 0, 400);
    await fxRun(820, p => {
      for (let i = 0; i < 4; i++) { const q = clamp01(p * 1.8 - i * 0.15); if (q > 0 && q < 1) sprite('fireball', lerp(from[0], to[0], q), lerp(from[1], to[1], q) - Math.sin(q * Math.PI) * 10, 0.25, 1); }
      if (p > 0.55) for (let k = 0; k < 5; k++) sprite('fireball', to[0] + (k - 2) * 7, to[1] + 6 - ((k * 7 + Math.floor(p * 30)) % 10), 0.2, 1 - (p - 0.55) / 0.45);
    });
  } else if (t === 'e') {
    [0, 0.08, 0.16, 0.24].forEach((w, i) => bs.tone(1600 - i * 200, 0.05, 'square', 0.035, w)); bs.noise(0.4, 0.06, 0.1, 2500);
    BT.flashC = '#f8f070';
    await fxRun(650, p => {
      BT.flash = p < 0.5 && Math.floor(p * 14) % 2 ? 0.3 : 0;
      sprite('lightning', to[0], to[1] - 22, 0.4, 0.9);
      let x = to[0] + 6, y = 0;
      while (y < to[1]) { const nx = to[0] + (Math.random() * 14 - 7), ny = y + 8; pline(x, y, nx, ny, '#f8e030', 2); pline(x, y, nx, ny, '#ffffff', 1); x = nx; y = ny; }
    });
    BT.flash = 0;
  } else if (t === 'g') {
    bs.mel([60, 63, 58, 54], 0.1, 'sine', 0.04);
    BT.flashC = '#503080';
    await fxRun(850, p => {
      BT.flash = Math.sin(p * Math.PI) * 0.28;
      for (let i = 0; i < 3; i++) { const q = (p + i / 3) % 1; sprite('shadowball', to[0] + Math.cos(q * 6.28) * 16 * (1 - p), to[1] + Math.sin(q * 6.28) * 10 * (1 - p), 0.18, 0.9); }
      if (p > 0.7) sprite('wisp', to[0], to[1], 0.4, (1 - p) * 3);
    });
    BT.flash = 0;
  }
}

/* ---------- le déroulé du combat ---------- */
function trainerCanvas() {
  if (typeof owner === 'undefined' || !owner || typeof buildRows !== 'function') return null;
  try {
    const rows = buildRows(owner, 'up', LEGS.fb[0]), w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const old = g; g = c.getContext('2d'); drawSprite(rows, w >> 1, h, owner.pal, false); g = old;
    return c;
  } catch { return null; }
}
async function startBattle() {
  if (BT || !WILD.id) return;
  if (!DEX.starter) { openDex(); return; }
  DEX.lv = DEX.lv || {}; DEX.xp = DEX.xp || {};
  const ids = (DEX.team.length ? DEX.team : [DEX.starter]).slice(0, 6);
  const team = ids.map(id => { const L = monLvl(id), max = maxHp(L), mv = movesOf(id); return { id, L, max, hp: max, name: UP(id), back: loadImg(backUrl(id), SPRITE.front(id)), moves: mv, pp: { a: mv[0].pp, b: mv[1].pp } }; });
  const id = WILD.id, lvl = WILD.lvl;
  BT = {
    id, lvl, tier: TIER_OF[id], name: UP(id), shiny: WILD.shiny, gender: TIER_OF[id] === 'legendaire' ? '' : Math.random() < 0.5 ? '♂' : '♀',
    fmax: maxHp(lvl), fhp: maxHp(lvl), fhpS: maxHp(lvl), berry: false, team, cur: 0, mhpS: team[0].hp, xpS: xpRatio(team[0].id, team[0].L),
    foe: mkObj(176, 84), me: mkObj(62, 116), trainer: { x: 60, show: true }, slide: 1, boxF: { dx: -130, show: true }, boxM: { dx: 130, show: false },
    front: loadImg(frontUrl(id, WILD.shiny), WILD.shiny ? SPRITE.front(id) : null), page: null, chars: 0, more: false, menu: null, adv: null, rects: [],
    shake: 0, flash: 0, flashC: '#fff', black: 1, ball: null, mainCur: 0, beepAt: 0, lvFlash: 0
  };
  BT.me.show = false; BT.trainerCv = trainerCanvas();
  TW.length = 0; FX.length = 0;
  $bt.hidden = false; $bt.className = 'enter';
  bs.mel([76, 0, 76, 0, 79, 81, 83, 84, 86, 88, 0, 91], 0.06, 'square', 0.03);
  await btWait(1150);
  $bt.className = 'on'; requestAnimationFrame(btFrame); startMusic();
  await tw(220, p => { BT.black = 1 - p; });
  await tw(1300, p => { BT.slide = 1 - p; }, easeOut);
  playCry(id);
  if (BT.shiny) { bs.mel([84, 88, 91, 96, 0, 96], 0.06); fxRun(1100, p => { for (let i = 0; i < 6; i++) { const a = i * 1.05 + p * 3, r = 14 + p * 10; if (!sprite('wisp', 176 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.8, 0.12, 1 - p)) P(176 + Math.cos(a) * r, 50 + Math.sin(a) * r, 2, 2, '#fff6a0'); } }); }
  await tw(320, p => { BT.boxF.dx = -130 * (1 - p); }, easeOut);
  await btSay('Un ' + BT.name + ' sauvage apparaît !' + (BT.shiny ? ' Il brille !' : ''));
  await sendOut(0, true);
  let end = '';
  while (!end && BT) end = await turn();
  await finish(end);
}
async function sendOut(i, first) {
  const m = BT.team[i]; BT.cur = i; BT.mhpS = m.hp; BT.xpS = xpRatio(m.id, m.L);
  await btSay(first ? 'Go ! ' + m.name + ' !' : 'À toi, ' + m.name + ' !');
  if (first) tw(520, p => { BT.trainer.x = 60 - 120 * p; }, easeIn);
  BT.ball = { x: 30, y: 84, rot: 0, kind: 'poke' };
  bs.noise(0.15, 0.04, 0, 3000);
  await tw(460, p => { BT.ball.x = lerp(first ? 44 : 6, 62, p); BT.ball.y = lerp(80, 96, p) - Math.sin(p * Math.PI) * 28; BT.ball.rot = p * 9; });
  BT.ball.open = true; bs.tone(1500, 0.04, 'square', 0.03); bs.noise(0.3, 0.06, 0, 1500);
  BT.me.show = true; BT.me.scale = 0; BT.me.white = 1; BT.me.tint = '#ffffff'; BT.me.sink = 0; BT.me.alpha = 1;
  fxRun(400, p => { for (let k = 0; k < 10; k++) { const a = k * 0.63, r = 4 + p * 22; P(62 + Math.cos(a) * r, 96 + Math.sin(a) * r * 0.7, 2, 2, k % 2 ? '#ffffff' : '#f8d0d0'); } });
  await tw(240, p => { BT.me.scale = p; }, easeOut);
  BT.ball = null; BT.trainer.show = false;
  playCry(m.id);
  await tw(320, p => { BT.me.white = 1 - p; });
  BT.boxM.show = true; await tw(300, p => { BT.boxM.dx = 130 * (1 - p); }, easeOut);
}
const foeMove = () => { const e = elsOf(BT.id)[0]; return e && Math.random() < 0.6 ? MOVES[e] : MOVES.tackle; };
async function turn() {
  const m = BT.team[BT.cur];
  const c = await btChoose({ kind: 'main', cols: 2, cur: BT.mainCur, items: [{ k: 'fight', label: 'ATTAQUE' }, { k: 'bag', label: 'SAC' }, { k: 'mon', label: 'POKéMON' }, { k: 'run', label: 'FUITE' }] });
  BT.mainCur = ['fight', 'bag', 'mon', 'run'].indexOf(c);
  if (c === 'run') {
    if (BT.lvl > m.L + 4 && Math.random() < 0.3) { await btSay('Impossible de fuir !'); return attack(false, foeMove()); }
    [0, 0.07, 0.14].forEach((w, i) => bs.tone(500 - i * 80, 0.06, 'square', 0.03, w));
    await btSay('Vous prenez la fuite !');
    return 'run';
  }
  if (c === 'fight') {
    const items = m.moves.map(mv => ({ k: mv.key, label: mv.name.toUpperCase(), dis: m.pp[mv.key] <= 0, info: mv }));
    items.push({ k: '-1', label: '-', dis: true }, { k: '-2', label: '-', dis: true });
    const k = await btChoose({ kind: 'moves', cols: 2, items, backKey: 'back' });
    if (k === 'back') return '';
    const mv = m.moves.find(x => x.key === k); m.pp[k]--;
    return (await attack(true, mv)) || attack(false, foeMove());
  }
  if (c === 'mon') {
    const i = await partyPick(true); if (i < 0) return '';
    await btSay(m.name + ', reviens !');
    BT.me.tint = '#f87878'; await tw(220, p => { BT.me.white = p; });
    await tw(220, p => { BT.me.scale = 1 - p; }); BT.me.show = false; BT.me.scale = 1; BT.me.white = 0;
    await tw(220, p => { BT.boxM.dx = 130 * p; });
    await sendOut(i, false);
    return attack(false, foeMove());
  }
  // le sac : deux poches, les Balls et les baies du potager
  return bagMenu();
}
const BALL_BAG = [['poke', 'POKé BALL', 0, 1, 'Une Ball classique.'], ['super', 'SUPER BALL', 5, 1.5, 'Meilleur taux de capture.'],
  ['hyper', 'HYPER BALL', 12, 2, 'Très bon taux de capture.'], ['master', 'MASTER BALL', 100, 255, 'Capture à coup sûr !']];
async function bagMenu() {
  for (;;) {
    const coins = DEX.coins || 0, bag = typeof farmBag === 'function' ? farmBag() : {}, pocket = BT.pocket || 'balls';
    let items;
    if (pocket === 'balls') {
      const nb = Object.values(bag).reduce((x, y) => x + y, 0);
      items = BALL_BAG.map(([k, l, p, b, d]) => ({ k, label: l, dis: coins < p, info: { price: p ? p + ' pièces' : 'Gratuite', desc: d } }));
      items.push({ k: 'pk-berries', label: 'BAIES ▶', info: { price: nb + ' baie' + (nb > 1 ? 's' : ''), desc: 'Les baies de ton potager.' } }, { k: 'back', label: 'RETOUR' });
    } else {
      items = Object.entries(BERRIES).map(([k, b]) => ({ k: 'b-' + k, label: b.name.toUpperCase().replace('BAIE ', 'B. '), dis: !(bag[k] > 0), info: { price: '×' + (bag[k] || 0), desc: b.desc } }));
      items.push({ k: 'pk-balls', label: '◀ BALLS', info: { price: '', desc: 'Retour aux Balls.' } }, { k: 'back', label: 'RETOUR' });
    }
    const k = await btChoose({ kind: 'bag', cols: 2, items, backKey: 'back', pocket });
    if (k === 'back') return '';
    if (k === 'pk-berries' || k === 'pk-balls') { BT.pocket = k === 'pk-berries' ? 'berries' : 'balls'; continue; }
    if (k.startsWith('b-')) return useBerry(k.slice(2));
    const ball = BALL_BAG.find(x => x[0] === k);
    if (ball[2]) { DEX.coins -= ball[2]; saveDex(); }
    return (await throwBall(ball[0], ball[1], ball[3])) || attack(false, foeMove());
  }
}
async function useBerry(k) {
  if (!farmTake(k)) return '';
  const m = BT.team[BT.cur], B = BERRIES[k], NAME = B.name.toUpperCase();
  if (k === 'oran' || k === 'sitrus') {
    await btSay(m.name + ' mange une ' + NAME + ' !');
    const a = m.hp; m.hp = Math.min(m.max, m.hp + (k === 'oran' ? 10 : Math.ceil(m.max / 4)));
    bs.mel([72, 76, 79, 84], 0.06);
    fxRun(600, p => { for (let i = 0; i < 6; i++) { const q = (p + i / 6) % 1; P(48 + i * 6, 100 - q * 40, 2, 2, q < 0.5 ? '#a8f8c8' : '#ffffff'); } });
    await tw(500, p => { BT.mhpS = lerp(a, m.hp, p); });
    await btSay(m.hp > a ? m.name + ' récupère ' + (m.hp - a) + ' PV !' : 'Ses PV sont déjà au maximum…');
  } else {
    await btSay('Vous donnez une ' + NAME + ' à ' + BT.name + ' sauvage.');
    await fxRun(500, p => { const x = lerp(70, 176, p), y = lerp(90, 52, p) - Math.sin(p * Math.PI) * 20; P(x - 2, y - 2, 5, 5, B.c); P(x - 1, y - 3, 2, 1, '#48a838'); P(x - 1, y - 1, 1, 1, '#ffffff'); });
    bs.mel([72, 76, 79], 0.06);
    if (k === 'framby' || k === 'dore') { BT.capMul = Math.max(BT.capMul || 1, k === 'dore' ? 2.5 : 1.5); await btSay(BT.name + ' sauvage la mange. Il a l\'air ' + (k === 'dore' ? 'beaucoup ' : '') + 'plus facile à attraper !'); }
    else if (k === 'nanab') { BT.noFlee = true; await btSay(BT.name + ' sauvage la mange et se calme. Il ne s\'enfuira plus !'); }
    else if (k === 'nanana') { BT.double = true; await btSay(BT.name + ' sauvage la mange, ravi ! Les pièces et l\'EXP. de ce combat seront doublées.'); }
  }
  return attack(false, foeMove());
}
function partyPick(canBack) {
  const items = BT.team.map((t, i) => ({ k: 'm' + i, label: t.name, dis: t.hp <= 0 || i === BT.cur }));
  if (canBack) items.push({ k: 'back', label: 'RETOUR' });
  return btChoose({ kind: 'party', cols: 2, items, backKey: canBack ? 'back' : null, prompt: canBack ? 'Choisis un POKéMON.' : 'Qui envoyer au combat ?' }).then(k => k === 'back' ? -1 : +k.slice(1));
}
async function attack(mine, mv) {
  if (!BT) return 'end';
  const atk = BT.team[BT.cur], D = mine ? BT.foe : BT.me;
  await btSay((mine ? atk.name : BT.name + ' sauvage') + ' utilise ' + mv.name.toUpperCase() + ' !');
  await moveAnim(mv.type, mine);
  const defId = mine ? BT.id : atk.id, eff = effect(mv.type, defId);
  if (!eff) { await btSay('Ça n\'affecte pas ' + (mine ? BT.name + ' sauvage' : atk.name) + '…'); return ''; }
  const L = mine ? atk.L : BT.lvl, stab = elsOf(mine ? atk.id : BT.id).includes(mv.type) ? 1.5 : 1, crit = Math.random() < 1 / 16;
  const dmg = Math.max(1, Math.floor(((2 * L / 5 + 2) * mv.power / 50 + 2) * stab * eff * (0.85 + Math.random() * 0.15) * (crit ? 2 : 1)));
  if (eff > 1) { bs.noise(0.3, 0.15, 0, 400); bs.tone(90, 0.2, 'square', 0.05); BT.shake = 3; }
  else if (eff < 1) { bs.noise(0.12, 0.05, 0, 1200); }
  else { bs.noise(0.2, 0.1, 0, 700); bs.tone(160, 0.1, 'square', 0.04); }
  await blinkObj(D); BT.shake = 0;
  if (mine) { const a = BT.fhp; BT.fhp = Math.max(0, a - dmg); await tw(Math.min(1000, 250 + (a - BT.fhp) * 14), p => { BT.fhpS = lerp(a, BT.fhp, p); }); }
  else { const a = atk.hp; atk.hp = Math.max(0, a - dmg); await tw(Math.min(1000, 250 + (a - atk.hp) * 14), p => { BT.mhpS = lerp(a, atk.hp, p); }); }
  if (crit) await btSay('Coup critique !');
  if (eff > 1) await btSay('C\'est super efficace !'); else if (eff < 1) await btSay('Ce n\'est pas très efficace…');
  if (mine && BT.fhp <= 0) return foeFaint();
  if (!mine && atk.hp <= 0) return meFaint();
  return '';
}
async function foeFaint() {
  playCry(BT.id, 0.72); await btWait(350);
  [0, 0.06, 0.12, 0.18].forEach((w, i) => bs.tone(700 - i * 140, 0.08, 'square', 0.03, w));
  await tw(450, p => { BT.foe.sink = p; }, easeIn); BT.foe.show = false;
  await tw(250, p => { BT.boxF.dx = -130 * p; });
  await btSay(BT.name + ' sauvage est K.O. !');
  stopMusic(); bs.mel([67, 72, 76, 72, 79, 0, 84], 0.1);
  await gainXp();
  const gain = BT.double ? 4 : 2; DEX.coins = (DEX.coins || 0) + gain; saveDex();
  await btSay('Vous ramassez ' + gain + ' pièces. Astuce : pour capturer un Pokémon, affaiblis-le sans le mettre K.O. !');
  return 'ko';
}
async function meFaint() {
  const m = BT.team[BT.cur];
  playCry(m.id, 0.72); await btWait(350);
  await tw(450, p => { BT.me.sink = p; }, easeIn); BT.me.show = false; BT.me.sink = 0;
  await tw(250, p => { BT.boxM.dx = 130 * p; }); BT.boxM.show = false;
  await btSay(m.name + ' est K.O. !');
  if (!BT.team.some(t => t.hp > 0)) {
    stopMusic(); await btSay('Vous n\'avez plus de POKéMON en forme !');
    await btSay(BT.name + ' sauvage retourne dans les hautes herbes…');
    return 'lost';
  }
  const i = await partyPick(false);
  await sendOut(i, false);
  return '';
}
async function gainXp() {
  const m = BT.team[BT.cur]; if (m.hp <= 0) return;
  DEX.xp = DEX.xp || {}; DEX.lv = DEX.lv || {};
  let left = Math.max(1, Math.round(BT.lvl * XPT[BT.tier] * 1.4)) * (BT.double ? 2 : 1);
  await btSay(m.name + ' gagne ' + left + ' points EXP. !');
  while (left > 0 && m.L < 100) {
    const need = xpNeed(m.L), have = DEX.xp[m.id] || 0, take = Math.min(left, need - have), r0 = have / need;
    DEX.xp[m.id] = have + take; left -= take;
    const r1 = DEX.xp[m.id] / need; let lastT = 0;
    await tw(Math.max(300, (r1 - r0) * 1200), p => { BT.xpS = lerp(r0, r1, p); const t = Math.floor(p * 12); if (t !== lastT) { lastT = t; bs.tone(600 + (r0 + (r1 - r0) * p) * 900, 0.03, 'square', 0.015); } });
    if (DEX.xp[m.id] >= need) {
      DEX.xp[m.id] = 0; m.L++; DEX.lv[m.id] = m.L;
      const old = m.max; m.max = maxHp(m.L); m.hp += m.max - old; BT.mhpS = m.hp; BT.xpS = 0;
      bs.mel([72, 76, 79, 84, 0, 84], 0.07);
      tw(500, p => { BT.lvFlash = Math.sin(p * Math.PI) * 0.7; });
      await btSay(m.name + ' monte au N.' + m.L + ' !');
    }
  }
  saveDex();
}
// la vraie formule de capture (3e génération) : a = (3·PVmax − 2·PV) · taux · bonus Ball / (3·PVmax) ; 4 tests de secousse
function catchRoll(bonus) {
  if (bonus >= 255) return 4;
  const M = BT.fmax, H = Math.max(1, BT.fhp), rate = CAPTURE[BT.id - 1];
  const a = (3 * M - 2 * H) * rate * bonus * (BT.capMul || 1) / (3 * M);
  if (a >= 255) return 4;
  const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
  let n = 0; while (n < 4 && Math.random() * 65536 < b) n++;
  return n;
}
async function throwBall(kind, label, bonus) {
  await btSay('Vous lancez une ' + label + ' !');
  BT.ball = { x: 20, y: 100, rot: 0, kind };
  bs.noise(0.35, 0.05, 0, 3500);
  await tw(640, p => { BT.ball.x = lerp(20, 176, p); BT.ball.y = lerp(100, 38, p) - Math.sin(p * Math.PI) * 40; BT.ball.rot = p * 14; });
  BT.ball.rot = 0; BT.ball.open = true;
  bs.mel([84, 88, 91], 0.04); bs.noise(0.3, 0.05, 0, 4000);
  BT.foe.tint = '#f87878';
  fxRun(500, p => { bx.globalAlpha = 0.5 * (1 - p); for (let k = 0; k < 6; k++) pline(176, 38, 176 + (k - 2.5) * 8, 62, '#f8a8a8', 2); bx.globalAlpha = 1; });
  await tw(220, p => { BT.foe.white = p; });
  await tw(300, p => { BT.foe.scale = 1 - p; BT.foe.dy = -36 * p; }, easeIn);
  BT.foe.show = false; BT.ball.open = false;
  bs.tone(400, 0.05, 'square', 0.04);
  await tw(300, p => { BT.ball.y = lerp(38, 63, p); }, easeIn); bs.tone(220, 0.05, 'square', 0.05);
  await tw(170, p => { BT.ball.y = 63 - Math.sin(p * Math.PI) * 8; }); bs.tone(220, 0.04, 'square', 0.04);
  await tw(120, p => { BT.ball.y = 63 - Math.sin(p * Math.PI) * 3; }); bs.tone(220, 0.03, 'square', 0.03);
  const shakes = catchRoll(bonus);
  for (let i = 0; i < Math.min(3, shakes); i++) {
    await btWait(480); bs.tone(300, 0.04, 'square', 0.05); bs.tone(240, 0.04, 'square', 0.05, 0.08);
    await tw(520, p => { BT.ball.rot = Math.sin(p * Math.PI * 2) * 0.5; BT.ball.x = 176 + Math.sin(p * Math.PI * 2) * 2; });
  }
  await btWait(550);
  if (shakes >= 4) {
    bs.tone(1900, 0.05, 'square', 0.05); BT.ball.dark = true;
    fxRun(700, p => { [-1, 0, 1].forEach(k => { const x = 176 + k * 14 * p, y = 59 - 18 * p + (k ? 4 * p : 0); bx.globalAlpha = 1 - p * 0.7; P(x - 1, y - 3, 2, 6, '#f8e060'); P(x - 3, y - 1, 6, 2, '#f8e060'); P(x, y, 1, 1, '#ffffff'); bx.globalAlpha = 1; }); });
    stopMusic(); await btWait(250);
    bs.mel([72, 0, 72, 76, 79, 0, 76, 79, 84, 0, 84], 0.1); bs.mel([48, 0, 52, 0, 55, 0, 52, 0, 60], 0.12, 'triangle', 0.05);
    const wasTeam = DEX.team.length, res = catchMon(BT.id);
    stat('wild'); if (BT.shiny) { stat('shinies'); DEX.coins = (DEX.coins || 0) + 20; saveDex(); }
    await btSay('Et hop ! ' + BT.name + ' est attrapé !', 3000);
    await gainXp();
    if (res.isNew) await btSay('Les données de ' + BT.name + ' ont été ajoutées au POKéDEX.');
    else { if (BT.double) { DEX.coins += res.coins; saveDex(); } await btSay('Vous l\'aviez déjà : +' + res.coins * (BT.double ? 2 : 1) + ' pièces.'); }
    if (BT.shiny) await btSay('Un POKéMON chromatique ! +20 pièces.');
    if (DEX.team.length > wasTeam) await btSay(BT.name + ' rejoint ton jardin !');
    news('🌿', dexName(BT.id) + ' sauvage attrapé dans les hautes herbes !' + (res.isNew ? ' Nouveau !' : ''), 'party');
    updateDexButton();
    return 'caught';
  }
  // il s'échappe
  BT.ball.open = true; bs.noise(0.35, 0.09, 0, 900); bs.tone(700, 0.06, 'square', 0.04);
  BT.foe.show = true; BT.foe.scale = 0; BT.foe.dy = 0; BT.foe.white = 1;
  await tw(260, p => { BT.foe.scale = p; }, easeOut);
  BT.ball = null;
  await tw(260, p => { BT.foe.white = 1 - p; }); BT.foe.tint = null;
  await btSay(['Oh non ! Le POKéMON s\'est libéré !', 'Raaah ! Ça y était presque !', 'Aaaaah ! Presque !', 'Mince ! Ça y était presque !'][shakes]);
  if (!BT.noFlee && Math.random() < WILD_FLEE[BT.tier]) {
    bs.noise(0.3, 0.05, 0, 2500);
    await tw(420, p => { BT.foe.dx = 90 * p; BT.foe.alpha = 1 - p; }); BT.foe.show = false;
    await tw(250, p => { BT.boxF.dx = -130 * p; });
    await btSay(BT.name + ' sauvage s\'enfuit !');
    return 'fled';
  }
  return '';
}
async function finish() {
  if (!BT) return;
  stopMusic();
  await tw(420, p => { BT.black = p; });
  $bt.className = 'leave'; await btWait(260);
  $bt.hidden = true; $bt.className = ''; BT = null; TW.length = 0; FX.length = 0;
  wildGone(); updateDexButton();
}
// pour tester : wildSpawn(25) fait apparaître Pikachu dans les hautes herbes
window.wildSpawn = wildSpawn;
