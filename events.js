'use strict';
/* ====================================================================
   Eric Office : les événements
   évacuation · anniversaire · apéro du vendredi · rush café · arc-en-ciel
   coupure de courant · livreur · zoomies des chats · Fête des Lumières · Nouvel An
   Ils arrivent tout seuls (heure, météo, activité), et peuvent être déclenchés depuis ⚙ Réglages.
   ==================================================================== */
const EV = { evac: 0, party: 0, partyFor: null, blackout: 0, rainbow: 0, fireworks: 0 };
const evNow = () => performance.now();
const dayOf = () => new Date();
function freeCellsIn(x0, x1, y0, y1) {
  const out = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!BLOCKED.has(x + ',' + y)) out.push([x, y]);
  return out.sort(() => Math.random() - 0.5);
}
// envoie du monde à un endroit pour un moment (même ceux qui travaillent, si force)
function gather(people, cells, ms, spot) {
  people.forEach((a, i) => {
    const cell = cells[i % cells.length]; if (!cell) return;
    a.override = { cell, until: evNow() + ms, spot: Object.assign({ face: 'down' }, spot || {}) };
  });
}

/* ---------- 🚨 exercice d'évacuation ---------- */
function startEvac() {
  if (evNow() < EV.evac) return;
  EV.evac = evNow() + 40000;
  const out = !badWeather();
  const cells = out ? freeCellsIn(33, 42, 3, 13) : freeCellsIn(23, 32, 4, 9);
  gather(everyone().filter(a => !a.isNpc), cells, 40000, { label: '🚨 Exercice d\'évacuation', face: 'down' });
  cats.forEach(c => { c.zoomUntil = evNow() + 8000; });
  news('🚨', 'Exercice d\'évacuation ! Tout le monde ' + (out ? 'sur la terrasse' : 'dans la cafet (il pleut)'), 'error');
  if (typeof sound === 'function') { sound('wait'); setTimeout(() => sound('wait'), 700); }
}
HOOKS.light.push(t => {                                   // gyrophares rouges pendant l'alarme
  if (evNow() > EV.evac) return;
  const p = (Math.sin(t * 8) + 1) / 2;
  g.fillStyle = 'rgba(255,40,30,' + (0.06 + p * 0.1).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
});

/* ---------- 🎂 anniversaire (10 tâches dans la journée) ---------- */
const PARTY_DONE = new Set();
function onDoneEvent(a) {
  const n = FAME.n[a.title] || 0;
  if (n >= 10 && !PARTY_DONE.has(dayKey() + a.title)) { PARTY_DONE.add(dayKey() + a.title); startParty(a); }
}
function startParty(a) {
  EV.party = evNow() + 120000; EV.partyFor = a ? a.name : 'l\'équipe';
  const cells = freeCellsIn(24, 31, 9, 13);
  gather(everyone().filter(x => !x.isNpc && !WORK.has(x.state)), cells, 60000, { label: '🎂 Fête l\'anniversaire de ' + EV.partyFor });
  news('🎂', 'C\'est l\'anniversaire de ' + EV.partyFor + (a ? ' : 10 tâches aujourd\'hui !' : ' !'), 'party');
}
HOOKS.post.push(t => {
  if (evNow() > EV.party) return;
  const x0 = px(26) + 6, y0 = py(12) - 8;                 // gâteau avec bougies sur la table basse
  panel(x0 + 4, y0, 16, 7, '#f6a5c0', OUT); R(x0 + 4, y0, 16, 2, CREAM); panel(x0 + 6, y0 - 5, 12, 5, '#fbe3ec', OUT);
  for (let i = 0; i < 4; i++) { R(x0 + 7 + i * 3, y0 - 9, 1, 4, ['#6aa9ff', '#ffd166', '#5fe39a', '#ff8fb0'][i]); R(x0 + 7 + i * 3, y0 - 11 + (Math.floor(t * 8 + i) % 2), 1, 2, AMBER); }
  everyone().forEach(a => {                               // chapeaux pointus
    if (!a._anchor || a.isNpc) return;
    const x = a._anchor.x, y = a._anchor.y + (a.id === selectedId ? 6 : 1), c = ['#ff5fc8', '#5fe8ff', '#ffd166', '#5fe39a'][a.lookHash % 4];
    R(x - 3, y, 7, 2, c); R(x - 2, y - 2, 5, 2, c); R(x - 1, y - 4, 3, 2, c); R(x, y - 6, 1, 2, c); R(x, y - 7, 1, 1, CREAM);
  });
  for (let i = 0; i < 40; i++) {                          // confettis
    const h = scatter(i + 900), p = (t * 0.25 + (h % 100) / 100) % 1;
    R(px(23) + h % (px(32) - px(23)), py(3) + Math.round(p * (py(14) - py(3))), 2, 1, ['#ff5fc8', '#5fe8ff', '#ffd166', '#5fe39a', CLAY][h % 5]);
  }
});

/* ---------- 🍻 apéro du vendredi (dès 17 h) · ☕ rush café du matin ---------- */
const APERO = [[35, 7], [37, 7], [36, 8], [38, 7], [35, 9]].map(cell => ({ cell, face: 'down', label: 'Apéro du vendredi 🍻', w: 12, act: 'apero', ok: () => TERRACE_OK() && aperoTime() }));
const APERO_IN = [[24, 8], [25, 9], [27, 8], [28, 9]].map(cell => ({ cell, face: 'down', label: 'Apéro du vendredi 🍻', w: 12, act: 'apero', ok: () => !TERRACE_OK() && aperoTime() }));
const RUSH = [[24, 4], [26, 4], [24, 5]].map(cell => ({ cell, face: 'up', label: 'Fait la queue au café ☕', w: 14, ok: () => rushTime() }));
SPOTS.push(...APERO, ...APERO_IN, ...RUSH);
function aperoTime() { const d = dayOf(); return (d.getDay() === 5 && d.getHours() >= 17 && d.getHours() < 21) || EV.forceApero > evNow(); }
function rushTime() { const d = dayOf(), h = d.getHours() + d.getMinutes() / 60; return (d.getDay() >= 1 && d.getDay() <= 5 && h >= 8.5 && h < 9.75) || EV.forceRush > evNow(); }
let aperoAnnounced = '';
HOOKS.update.push(() => {
  const k = dayKey();
  const d = dayOf(), realFriday = d.getDay() === 5 && d.getHours() >= 17 && d.getHours() < 21;
  if (realFriday && aperoAnnounced !== k) { aperoAnnounced = k; news('🍻', 'C\'est vendredi : apéro ' + (TERRACE_OK() ? 'sur la terrasse' : 'à la cafet') + ' !', 'party'); }
});
HOOKS.post.push(t => {                                    // un verre à la main pendant l'apéro
  everyone().forEach(a => {
    if (a.act !== 'apero' || !a._anchor || a.path.length) return;
    const x = a._anchor.x + 6, y = a._anchor.y + 15;
    R(x, y, 3, 4, a.lookHash % 2 ? '#ffd166' : '#e05a4a'); R(x, y, 3, 1, '#fff7e0'); R(x + 1, y + 4, 1, 2, '#d8d2c6');
  });
});

/* ---------- 🌈 arc-en-ciel quand la pluie s'arrête ---------- */
let wasRaining = null;
HOOKS.update.push(() => {
  const sk = skyState(Date.now());
  if (wasRaining && !sk.rain && sk.kind !== 'night') { EV.rainbow = evNow() + 10 * 60000; news('🌈', 'La pluie s\'arrête sur Lyon : arc-en-ciel !'); }
  wasRaining = sk.rain;
});
function drawRainbow(x0, x1, y0, y1, cx, cy, r) {
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  ['#ff5f5f', '#ffa34f', '#ffe066', '#7fe07f', '#6ab8ff', '#a98bff'].forEach((c, i) => {
    g.strokeStyle = c; g.globalAlpha = 0.45; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r - i * 2, Math.PI, 2 * Math.PI); g.stroke();
  });
  g.globalAlpha = 1; g.restore();
}
HOOKS.floor.push(() => {
  if (evNow() > EV.rainbow) return;
  drawRainbow(px(32) + 13, px(42) - 3, OYp, py(3) - 8, px(37), py(3) + 4, 46);
  const wy0 = OYp + 7, wy1 = py(2) + 4;
  WINDOWS.forEach(([fx0, fx1]) => drawRainbow(fx0, fx1, wy0, wy1, (fx0 + fx1) / 2 + 20, wy1 + 14, 34));
});

/* ---------- ⚡ coupure de courant pendant l'orage ---------- */
let nextBlackout = evNow() + 120000;
function blackout() {
  EV.blackout = evNow() + 4500;
  news('⚡', 'Coupure de courant !', 'error');
  everyone().forEach(a => { if (!a.isNpc && Math.random() < 0.6 && typeof emote === 'function') emote(a, pick(['😱', '😮', '🙀']), 2500); });
}
HOOKS.update.push((dt, now) => {
  if (now > nextBlackout) { nextBlackout = now + 180000 + Math.random() * 300000; if (skyState(Date.now()).storm) blackout(); }
});
HOOKS.light.push(t => {
  if (evNow() > EV.blackout) return;
  const left = EV.blackout - evNow(), flick = left < 900 && Math.floor(t * 12) % 2;   // ça clignote juste avant le retour du courant
  g.fillStyle = 'rgba(6,8,18,' + (flick ? 0.35 : 0.78) + ')'; g.fillRect(0, 0, W, H);
});

/* ---------- 📦 le livreur apporte un colis à Eric ---------- */
let nextDelivery = evNow() + (4 + Math.random() * 6) * 60000;
function startDelivery() {
  if (NPCS.some(n => n.isCourier)) return;
  const d = makeAgent('npc-livreur-' + Date.now(), '📦 Livreur', true);
  d.isNpc = d.isCourier = true; d.state = 'idle'; d.style = 3;
  Object.assign(d.pal, { T: '#8a5a2a', K: '#8a5a2a', k: '#5e3a18', P: '#3a2a1a' }); finishPal(d.pal);
  d.x = DOOR[0] + 0.5; d.y = DOOR[1] + 0.5; d.phase = 'in';
  d.override = { cell: [-5, 8], until: evNow() + 60000, spot: { face: 'up', label: 'Apporte un colis à ' + OWNER } };
  NPCS.push(d);
  news('📦', 'Un livreur arrive avec un colis pour ' + OWNER);
}
HOOKS.update.push((dt, now) => {
  if (now > nextDelivery) { nextDelivery = now + (120 + Math.random() * 120) * 60000; startDelivery(); }
  NPCS.slice().forEach(d => {
    if (!d.isCourier || d.path.length || d.heading) return;
    if (d.phase === 'in' && Math.abs(d.x - (-4.5)) < 0.6 && Math.abs(d.y - 8.5) < 0.6) {
      d.phase = 'out';
      if (typeof emote === 'function') { emote(d, '📦', 2500); if (owner) emote(owner, '😄', 2500); }
      d.override = { cell: DOOR, until: now + 60000, sent: false, spot: { face: 'up', label: 'Repart' } };
      d.outAt = now;
    } else if (d.phase === 'out' && now - d.outAt > 1500 && cellOf(d)[0] === DOOR[0] && cellOf(d)[1] === DOOR[1]) {
      NPCS.splice(NPCS.indexOf(d), 1);
    }
  });
});
HOOKS.post.push(() => {                                   // le carton dans les bras
  NPCS.forEach(d => { if (d.isCourier && d.phase === 'in' && d._anchor) panel(d._anchor.x - 4, d._anchor.y + 14, 8, 6, '#c9a46a', OUT); });
});

/* ---------- 🐈 zoomies : la nuit, un chat pique un sprint ---------- */
let nextZoomies = evNow() + 300000;
function startZoomies(c) {
  c = c || pick(cats.filter(c => !c.ride && !c.chasing)); if (!c) return;
  c.zoomUntil = evNow() + 15000; news('🐈', c.name + ' a les zoomies !');
}
HOOKS.update.push((dt, now) => {
  if (now > nextZoomies) { nextZoomies = now + (8 + Math.random() * 12) * 60000; if (skyState(Date.now()).kind === 'night') startZoomies(); }
  cats.forEach(c => {
    if (!c.zoomUntil) return;
    if (now > c.zoomUntil) { c.zoomUntil = 0; if (c.baseSpeed) c.speed = c.baseSpeed; c.label = null; c.nextMove = now + 2000; return; }
    if (!c.baseSpeed) c.baseSpeed = c.speed;
    c.speed = c.baseSpeed * 3; c.nextMove = now + 99999; c.label = 'Zoomies !'; c.petUntil = 0;
    if (!c.path.length) {
      let cell, n = 0;
      do { cell = [XMIN + Math.floor(Math.random() * COLS), 3 + Math.floor(Math.random() * (ROWS - 3))]; } while ((BLOCKED.has(cell[0] + ',' + cell[1]) || outsideBlocked(cell)) && ++n < 30);
      catGo(c, cell, null); c.mode = 'walk';
    }
  });
});

/* ---------- 🎆 Fête des Lumières (Lyon, autour du 8 décembre) et Nouvel An ---------- */
const FETE = (() => {
  const q = new URLSearchParams(location.search).get('season'), d = dayOf(), m = d.getMonth() + 1, day = d.getDate();
  return { lumieres: q === 'lumieres' || (m === 12 && day >= 5 && day <= 9), newyear: q === 'newyear' || (m === 12 && day === 31) || (m === 1 && day === 1) };
})();
const FIREWORKS = [];
HOOKS.floor.push(t => {
  const night = skyState(Date.now()).kind === 'night';
  if (FETE.lumieres && night) {                           // lumignons sur le rebord des fenêtres
    const sill = py(2) + 4;
    WINDOWS.forEach(([fx0, fx1]) => { for (let x = fx0 + 3; x < fx1 - 2; x += 7) { R(x, sill - 1, 3, 3, '#f3e7d0'); R(x + 1, sill - 3 + (Math.floor(t * 6 + x) % 2), 1, 2, AMBER); } });
  }
  if (!((FETE.newyear || FETE.lumieres) && night) && evNow() > EV.fireworks) return;
  if (Math.random() < 0.04) {                             // une nouvelle fusée de temps en temps
    const zones = [[px(32) + 20, px(42) - 10], ...WINDOWS];
    const [z0, z1] = pick(zones);
    FIREWORKS.push({ x: z0 + Math.random() * (z1 - z0), y: OYp + 8 + Math.random() * 18, t0: t, c: pick(['#ff5fc8', '#5fe8ff', '#ffd166', '#5fe39a', '#ff8a5f', '#c9a0ff']), z0, z1 });
  }
  for (let i = FIREWORKS.length - 1; i >= 0; i--) {
    const f = FIREWORKS[i], p = (t - f.t0) / 1.4;
    if (p > 1) { FIREWORKS.splice(i, 1); continue; }
    g.save(); g.beginPath(); g.rect(f.z0, OYp, f.z1 - f.z0, py(3) - OYp - 6); g.clip(); g.globalAlpha = 1 - p;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r = 2 + p * 11; R(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r + p * p * 4), 1, 1, f.c); }
    g.globalAlpha = 1; g.restore();
  }
});

/* ---------- déclencher un événement à la main (⚙ Réglages) ---------- */
const EVENTS = [
  ['🚨 Évacuation', startEvac],
  ['🎂 Anniversaire', () => startParty(pick([...agents.values()]) || null)],
  ['🍻 Apéro', () => { EV.forceApero = evNow() + 5 * 60000; news('🍻', 'Apéro improvisé !', 'party'); }],
  ['☕ Rush café', () => { EV.forceRush = evNow() + 3 * 60000; news('☕', 'Rush café !'); }],
  ['🌈 Arc-en-ciel', () => { EV.rainbow = evNow() + 3 * 60000; news('🌈', 'Arc-en-ciel sur Lyon !'); }],
  ['⚡ Coupure', blackout],
  ['📦 Livreur', startDelivery],
  ['🐈 Zoomies', () => startZoomies()],
  ['🎆 Feu d\'artifice', () => { EV.fireworks = evNow() + 20000; news('🎆', 'Feu d\'artifice !', 'party'); }]
];
function triggerEvent(i) { const e = EVENTS[i]; if (e) e[1](); }
// pour tester une ambiance au chargement : ?event=evac, party, apero, rush, rainbow, blackout, delivery, zoomies, fireworks
(() => {
  const q = new URLSearchParams(location.search).get('event');
  const map = { evac: 0, party: 1, apero: 2, rush: 3, rainbow: 4, blackout: 5, delivery: 6, zoomies: 7, fireworks: 8 };
  if (q in map) setTimeout(() => triggerEvent(map[q]), 4000);
})();
