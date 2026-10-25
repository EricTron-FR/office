'use strict';
/* ====================================================================
   Eric Office : les Pokémon du jardin suspendu
   Ce sont ceux que tu as attrapés et choisis dans le Pokédex (dex.js), 6 au maximum.
   Ils se baladent, dorment la nuit, s'abritent sous la pluie (sauf ceux de la mare, ravis),
   jouent avec les agents en pause et les chats. Survol = nom, clic = câlin.
   Ils utilisent leur sprite pixel art officiel (icônes PokeAPI) ; une Poké Ball en attendant le chargement.
   ==================================================================== */
const CRY = { 25: 'Pika pika !', 26: 'Raiii !', 1: 'Bulbi !', 4: 'Sala !', 7: 'Carapuce !', 133: 'Vouiii !', 39: 'Rondou… doudou ♪', 143: 'Ronnnfl…', 129: '*flop flop*', 150: '…', 151: 'Mew !' };
const SINGERS = new Set([39, 40]), SPARKY = new Set([25, 26, 81, 82, 100, 101, 125, 135, 145]), FIERY = new Set([4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136, 146]);
let MONS = [];
// (re)construit les habitants du jardin à partir de l'équipe choisie ; sans équipe, un Pikachu sauvage passe dire bonjour
function setGardenTeam(ids) {
  const list = ids && ids.length ? ids.slice(0, 6) : [25];
  const old = new Map(MONS.map(m => [m.dex, m]));
  let water = 0;
  MONS = list.map((id, i) => {
    if (old.has(id)) return old.get(id);
    const isWater = typeof WATER_IDS !== 'undefined' && WATER_IDS.has(id) && water++ < 2;
    const cell = isWater ? [-3, 19] : (monCell() || [10, 23]);
    return { id: 'mon-' + id, dex: id, name: typeof dexName === 'function' ? dexName(id) : 'Pikachu',
      cry: CRY[id] || ((typeof dexName === 'function' ? dexName(id) : '') + ' !'), water: isWater, wild: !(ids && ids.length),
      speed: isWater ? 0.8 : 1 + ((id * 37) % 10) / 9, x: cell[0] + 0.5, y: cell[1] + 0.5, path: [], dir: i % 2 ? 1 : -1, mode: 'idle', next: performance.now() + 2000 + i * 1500, label: '' };
  });
}
const MON_LABEL = { idle: 'Se balade', walk: 'Se balade', sleep: 'Dort', swim: 'Nage dans la mare', sing: 'Chante sa berceuse…', spark: 'Fait des étincelles !', play: 'Joue', shelter: 'S\'abrite sous l\'arbre', rain: 'Adore la pluie !' };
const night = () => skyState(Date.now()).kind === 'night';
const gardenFree = (x, y) => inGarden(x, y) && !BLOCKED.has(x + ',' + y) && y < 27;
function monCell() {
  for (let n = 0; n < 40; n++) {
    const x = GARDEN.x0 + 1 + Math.floor(Math.random() * (GARDEN.x1 - GARDEN.x0 - 1)), y = GARDEN.y0 + Math.floor(Math.random() * (GARDEN.y1 - GARDEN.y0 - 1));
    if (gardenFree(x, y)) return [x, y];
  }
  return null;
}
const SHELTERS = [[-7, 26], [-4, 26], [23, 26], [26, 26], [23, 19], [26, 19]];   // sous les arbres
function monGo(m, cell, mode, label) {
  if (!cell) return;
  m.path = bfs([Math.floor(m.x), Math.floor(m.y)], cell).filter(c => true); m.mode = 'walk'; m.after = mode || 'idle'; m.afterLabel = label || '';
  if (!m.path.length) { m.mode = m.after; m.label = m.afterLabel; }
}

/* ---------- comportement ---------- */
HOOKS.update.push((dt, now) => {
  const rain = badWeather(), dark = night();
  MONS.forEach(m => {
    if (m.water) {                                                     // Carapuce nage dans la mare (déplacement libre sur l'eau)
      if (!m.tx || now > m.next) {
        m.tx = POND.x0 + 0.5 + Math.random() * (POND.x1 - POND.x0 - 1); m.ty = POND.y0 + 0.5 + Math.random() * (POND.y1 - POND.y0 - 1);
        m.next = now + 4000 + Math.random() * 6000;
      }
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      if (d > 0.05) { m.x += dx / d * Math.min(d, m.speed * dt * 0.6); m.y += dy / d * Math.min(d, m.speed * dt * 0.6); if (Math.abs(dx) > 0.05) m.dir = dx > 0 ? 1 : -1; }
      m.mode = 'swim'; m.label = rain ? MON_LABEL.rain : dark ? 'Fait la planche sous les étoiles' : MON_LABEL.swim;
      return;
    }
    if (m.petUntil > now || m.playUntil > now) { m.path = []; return; }
    if (m.path.length) {
      const [tx, ty] = m.path[0], tx2 = tx + 0.5, ty2 = ty + 0.5, dx = tx2 - m.x, dy = ty2 - m.y, d = Math.hypot(dx, dy), st = m.speed * dt;
      if (Math.abs(dx) > 0.01) m.dir = dx > 0 ? 1 : -1;
      if (d <= st) { m.x = tx2; m.y = ty2; m.path.shift(); if (!m.path.length) { m.mode = m.after || 'idle'; m.label = m.afterLabel || ''; } }
      else { m.x += dx / d * st; m.y += dy / d * st; }
      return;
    }
    if (now < m.next) return;
    m.next = now + 5000 + Math.random() * 9000;
    if (rain) {                                                        // à l'abri sous un arbre
      const s = SHELTERS[MONS.indexOf(m) % SHELTERS.length];
      if (Math.floor(m.x) !== s[0] || Math.floor(m.y) !== s[1]) monGo(m, s, 'shelter', MON_LABEL.shelter); else m.mode = 'shelter';
      return;
    }
    if (dark && !FIERY.has(m.dex)) { if (m.mode !== 'sleep') { m.mode = 'sleep'; m.label = MON_LABEL.sleep; } m.next = now + 20000; return; }
    const r = Math.random();
    if (SINGERS.has(m.dex) && r < 0.18) { m.mode = 'sing'; m.label = MON_LABEL.sing; m.next = now + 9000; lullaby(m); return; }
    if (SPARKY.has(m.dex) && r < 0.15) { m.mode = 'spark'; m.label = MON_LABEL.spark; m.next = now + 2500; return; }
    if (r < 0.25) { m.mode = Math.random() < 0.5 ? 'idle' : 'sleep'; m.label = m.mode === 'sleep' ? 'Fait une petite sieste' : ''; return; }
    monGo(m, monCell(), 'idle');
  });
});
// Rondoudou chante : les agents en pause tout près piquent du nez
function lullaby(m) {
  if (typeof say === 'function') say(m, '♪ Rondou… doudou… ♪', { mon: true });
  setTimeout(() => {
    everyone().forEach(a => { if (!WORK.has(a.state) && !a.isOwner && Math.hypot(a.x - m.x, a.y - m.y) < 4) emote(a, '😴', 3500); });
    cats.forEach(c => { if (Math.hypot(c.x - m.x, c.y - m.y) < 4 && !c.path.length) { c.mode = 'sleep'; c.nextMove = performance.now() + 15000; } });
  }, 1800);
}

/* ---------- les agents en pause viennent jouer avec eux, les chats viennent renifler ---------- */
let playTick = performance.now() + 20000;
HOOKS.update.push((dt, now) => {
  if (now < playTick) return; playTick = now + 25000 + Math.random() * 25000;
  if (badWeather()) return;
  const m = pick(MONS.filter(m => !m.water && !m.path.length && m.mode !== 'sleep'));
  if (!m) return;
  if (Math.random() < 0.7) {
    const a = pick(freeIdle().filter(a => !a.isSub || Math.random() < 0.5));
    const cell = a && besideOf(m);
    if (!cell) return;
    goTo(a, cell, { type: 'spot', cell, face: cell.face, act: 'pokeplay', label: 'Joue avec ' + m.name });
    a.playMon = m; m.next = now + 25000;
    news('⚡', a.name + ' va jouer avec ' + m.name + ' dans le jardin');
  } else {
    const c = pick(cats.filter(c => !c.path.length && c.mode !== 'sleep' && !c.ride && !c.playUntil));
    const [x, y] = [Math.floor(m.x), Math.floor(m.y)];
    const cell = [[x + 1, y], [x - 1, y], [x, y + 1]].find(([p, q]) => gardenFree(p, q));
    if (!c || !cell) return;
    catGo(c, cell, { cell, mode: 'sit', stay: 6000, label: 'Renifle ' + m.name });
    c.sniff = m; m.next = now + 20000;
  }
});
HOOKS.update.push((dt, now) => {
  everyone().forEach(a => {                                            // l'agent est arrivé : ils jouent ensemble
    const m = a.playMon;
    if (!m) return;
    if (a.act !== 'pokeplay') { a.playMon = null; return; }
    if (a.path.length || a.heading || a._played) return;
    a._played = true; m.playUntil = now + 9000; m.mode = 'play'; m.label = 'Joue avec ' + a.name; m.dir = a.x > m.x ? 1 : -1;
    emote(a, pick(['😄', '❤️', '✨']), 2500); emote(m, '❤️', 2500);
    if (typeof say === 'function') setTimeout(() => say(m, m.cry, { mon: true }), 900);
    setTimeout(() => { a._played = false; a.playMon = null; if (m.playUntil <= performance.now() + 50) { m.mode = 'idle'; m.label = ''; } }, 9200);
  });
  cats.forEach(c => {                                                  // le chat renifle… et Pikachu lui envoie une petite décharge
    const m = c.sniff;
    if (!m || c.path.length) return;
    c.sniff = null; c.dir = m.x > c.x ? 1 : -1;
    if (SPARKY.has(m.dex)) {
      m.mode = 'spark'; m.label = MON_LABEL.spark; m.next = now + 2500;
      emote(c, '⚡', 2000); c.zoomUntil = now + 5000;
      news('⚡', m.name + ' envoie une petite décharge à ' + c.name + ' !');
    } else { emote(c, '❓', 1800); emote(m, '❤️', 1800); }
  });
});
// de temps en temps, un Pokémon sauvage surgit des hautes herbes
let wildTick = performance.now() + 90000;
HOOKS.update.push((dt, now) => {
  if (now < wildTick) return; wildTick = now + 240000 + Math.random() * 300000;
  if (badWeather() || night()) return;
  const m = pick(MONS.filter(m => !m.water && !m.path.length && m.mode !== 'sleep' && m.playUntil < now));
  if (!m) return;
  m.x = TALL.x0 + 0.5 + Math.floor(Math.random() * (TALL.x1 - TALL.x0)); m.y = TALL.y0 + 0.5 + Math.floor(Math.random() * (TALL.y1 - TALL.y0));
  m.mode = 'idle'; m.label = 'Surgit des hautes herbes !'; m.next = now + 5000;
  emote(m, '❗', 2500);
  if (typeof say === 'function') say(m, m.cry, { mon: true });
  news('🌿', 'Un ' + m.name + ' sauvage apparaît dans les hautes herbes !');
});

/* ---------- dessin ---------- */
HOOKS.items.push((items, t) => {
  MONS.forEach(m => items.push({ k: py(m.y) + (m.water ? 3 : 7), draw() {
    const x = px(m.x), y = py(m.y) + 7, walking = m.path.length > 0;
    const f = walking ? Math.floor(t * 8) % 2 : (m.mode === 'play' ? Math.round(Math.abs(Math.sin(t * 7)) * 2) : m.mode === 'sing' ? Math.round(Math.abs(Math.sin(t * 3))) : 0);
    if (!m.water) R(x - 7, y - 1, 14, 2, SHADOW);
    drawIcon(m, x, y, f, t);
    if (m.mode === 'spark') for (let i = 0; i < 6; i++) { const a = t * 9 + i, r = 11 + (i % 2) * 3; R(x + Math.round(Math.cos(a) * r), y - 12 + Math.round(Math.sin(a) * r * 0.7), 2, 1, i % 2 ? '#fff6a0' : '#f6d33c'); }
    if (m.mode === 'sing') for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; g.globalAlpha = 1 - q; icon('note', x - 2 + (i - 1) * 7, y - 26 - Math.round(q * 14), ['#ff8fb0', '#9fc8ff', '#ffd166'][i]); g.globalAlpha = 1; }
    if (m.mode === 'sleep' && !m.water) { const p = (t * 0.4 + MONS.indexOf(m) * 0.3) % 1; g.globalAlpha = 1 - p; pixText('z', x + 6 + Math.round(p * 5), y - 24 - Math.round(p * 8), '#ffffff'); g.globalAlpha = 1; }
    if (m.petUntil > performance.now()) for (let i = 0; i < 2; i++) { const p = (t * 0.9 + i / 2) % 1; g.globalAlpha = 1 - p; icon('heart', x - 4 + i * 5, y - 28 - Math.round(p * 10), '#e0533f'); g.globalAlpha = 1; }
    m._anchor = { x, y: y - 26, fy: y };
    m._box = [x - 12, y - 26, 24, 27];
  } }));
});
// icône pixel art officielle (40x30, regarde vers la gauche), retournée selon la direction
const ICONS = new Map();
function iconOf(id) {
  let e = ICONS.get(id);
  if (!e) {
    e = { img: new Image(), ok: false, flip: null }; ICONS.set(id, e);
    e.img.crossOrigin = 'anonymous';
    e.img.onload = () => {
      e.ok = true;
      const c = document.createElement('canvas'); c.width = e.img.width; c.height = e.img.height;
      const cc = c.getContext('2d'); cc.translate(c.width, 0); cc.scale(-1, 1); cc.drawImage(e.img, 0, 0); e.flip = c;
    };
    e.img.src = typeof SPRITE !== 'undefined' ? SPRITE.icon(id) : '';
  }
  return e;
}
function drawIcon(m, x, y, f, t) {
  const e = iconOf(m.dex || m);
  if (!e.ok) { pokeball(x, y - 4, true); return; }
  const im = m.dir > 0 ? e.flip : e.img, w = im.width, h = im.height;
  if (m.water) {                                                           // dans la mare : seul le haut dépasse
    const b = Math.round(Math.sin(t * 2.4));
    g.save(); g.beginPath(); g.rect(x - w / 2, y - h, w, h - 3); g.clip();
    g.drawImage(im, Math.round(x - w / 2), Math.round(y - h + 8 + b)); g.restore();
    R(x - 9, y - 4, 18, 2, 'rgba(255,255,255,.55)');
    return;
  }
  g.drawImage(im, Math.round(x - w / 2), Math.round(y - h + 3 - f));
}
// la nuit, les Pokémon de feu éclairent le jardin
function monLights(t, add) {
  MONS.forEach(m => { if (FIERY.has(m.dex)) add(px(m.x) - 6 * m.dir, py(m.y) - 2, 30, 0.7, '#ffb04a'); });
}

/* ---------- survol et caresses ---------- */
let hoverMon = null;
cv.addEventListener('mousemove', e => {
  if (!MOUSE) { hoverMon = null; return; }
  const [mx, my] = MOUSE;
  hoverMon = MONS.find(m => m._box && mx >= m._box[0] && mx <= m._box[0] + m._box[2] && my >= m._box[1] && my <= m._box[1] + m._box[3]) || null;
  if (hoverMon && !LASER.on) cv.style.cursor = 'pointer';
});
cv.addEventListener('mouseleave', () => { hoverMon = null; });
cv.addEventListener('click', () => {
  if (!hoverMon || LASER.on || (drag && drag.moved)) return;
  const m = hoverMon, now = performance.now();
  m.petUntil = now + 2500; m.next = Math.max(m.next, now + 4000);
  if (m.mode === 'sleep') { m.mode = 'idle'; m.label = ''; }
  if (typeof say === 'function') say(m, m.cry, { mon: true });
  if (typeof sound === 'function' && SETTINGS.sound) try { tone(880 + Math.random() * 300, 0.09, 'square', 0.03); tone(1180, 0.12, 'square', 0.03, 0.1); } catch { }
});
HOOKS.overlay.push(c => {
  if (!hoverMon || !hoverMon._anchor) return;
  const m = hoverMon, txt = (m.wild ? '🌿 ' + m.name + ' sauvage' : '★ ' + m.name) + ' · ' + (m.petUntil > performance.now() ? 'Content !' : (m.label || MON_LABEL[m.mode] || 'Se balade')) + ' · clic pour un câlin';
  c.font = '600 11px ' + FONT; const w = Math.ceil(c.measureText(txt).width) + 16;
  const [x, y0] = toCss(m._anchor.x, m._anchor.y), y = y0 - 4;
  pkBox(c, x - w / 2, y - 17, w, 17, '#f2b23a');
  c.fillStyle = INK2; c.textAlign = 'center'; c.fillText(txt, x, y - 8); c.textAlign = 'left';
});
