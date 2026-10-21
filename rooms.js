'use strict';
/* ====================================================================
   Eric Office : les nouvelles salles
   Rangée du haut, à droite : la terrasse (colonnes 33-41), vue sur Lyon, pluie réelle.
   Rangée du bas (lignes 17-27, mur du fond lignes 14-16) :
     salle de jeux (-8..4) · salle de tests (6..16) · salle serveur (18..26) · bibliothèque (28..41)
   Les agents vont bosser dans la salle qui correspond à leur activité (tests, builds, lecture)
   quand elle dure, sinon ils restent à leur bureau.
   ==================================================================== */
const LOW = { top: 14, floor: 17, bottom: 28 };
const DOORS_DOWN = [1, 10, 20, 29];                   // passages haut → bas (2 cases chacun)
const LOW_WALLS = [5, 17, 27];                        // murs entre les salles du bas (porte en 21-22)
const ROOMS = {
  games: { x0: -8, x1: 5, th: { up: '#2e2440', stripe: '#33284a', wain: '#5a3f7a', hi: '#7a5aa0', line: '#4a3366', base: '#2a1e38' }, floor: '#2c3350' },
  tests: { x0: 6, x1: 17, th: { up: '#eef3f0', stripe: '#e6ece8', wain: '#9fc7b0', hi: '#b5d8c4', line: '#87b29a', base: '#5f8a72' }, floor: '#eef2ef' },
  server: { x0: 18, x1: 27, th: { up: '#2a2f36', stripe: '#30363e', wain: '#3d4550', hi: '#55606d', line: '#333a44', base: '#22262c' }, floor: '#3a3f46' },
  library: { x0: 28, x1: 42, th: { up: '#e9dcc6', stripe: '#e2d3ba', wain: '#8a5a3c', hi: '#a0704e', line: '#7a4c30', base: '#5e3a28' }, floor: '#a27650' }
};
const roomAt = x => Object.keys(ROOMS).find(k => x >= ROOMS[k].x0 && x < ROOMS[k].x1);

/* ---------- murs et passages ---------- */
for (let y = LOW.top; y < LOW.floor; y++) for (let x = XMIN; x < XMAX; x++) if (!DOORS_DOWN.some(d => x === d || x === d + 1)) block(x, y);
LOW_WALLS.forEach(x => { for (let y = LOW.floor; y < LOW.bottom; y++) if (y !== 21 && y !== 22) block(x, y); });
for (let y = 3; y < 14; y++) if (y !== 7 && y !== 8) block(32, y);           // mur pause | terrasse

/* ---------- fond : sols, murs du fond des salles du bas, terrasse ---------- */
function paintRooms() {
  const prev = g; g = bg.getContext('2d');
  // terrasse : deck en bois + garde-corps à droite
  planks(px(32), px(42), py(3), py(14), ['#b5a48c', '#ab9a82', '#bdac94', '#a8977f'], '#8f806c');
  R(px(42) - 3, py(3), 3, py(14) - py(3), '#5a5f66'); for (let y = py(3); y < py(14); y += 6) R(px(42) - 4, y, 1, 4, '#7a8088');
  // sols du bas
  const F0 = py(LOW.floor), F1 = py(LOW.bottom);
  const gm = ROOMS.games;
  R(px(gm.x0), F0, px(gm.x1) - px(gm.x0), F1 - F0, gm.floor);
  for (let y = F0 + 6; y < F1; y += 12) for (let x = px(gm.x0) + ((y / 12) % 2 ? 6 : 0); x < px(gm.x1); x += 12) R(x, y, 2, 2, '#38406a');
  R(px(-7) + 4, py(19) + 4, px(3) - px(-7) - 8, 2, '#d64fa0'); R(px(-7) + 4, py(27) - 2, px(3) - px(-7) - 8, 2, '#3fc6d6');   // bandes néon au sol
  const ts = ROOMS.tests;
  for (let y = F0; y < F1; y += 8) for (let x = px(ts.x0); x < px(ts.x1); x += 8) R(x, y, 8, 8, ((x - px(ts.x0)) / 8 + (y - F0) / 8) % 2 ? '#f3f6f4' : '#e2eae5');
  const sv = ROOMS.server;
  R(px(sv.x0), F0, px(sv.x1) - px(sv.x0), F1 - F0, sv.floor);
  for (let y = F0; y < F1; y += 16) for (let x = px(sv.x0); x < px(sv.x1); x += 16) {
    R(x, y, 16, 1, '#2f3339'); R(x, y, 1, 16, '#2f3339');
    for (let i = 3; i < 15; i += 4) for (let j = 3; j < 15; j += 4) R(x + i, y + j, 1, 1, '#454b53');
  }
  planks(px(ROOMS.library.x0), px(ROOMS.library.x1), F0, F1, ['#a27650', '#9a6e48', '#ab7f58', '#a07450'], '#7e5636');
  R(px(30) + 4, py(22) + 4, px(41) - px(30) - 4, py(27) - py(22) - 2, '#8e3f2a');                                     // tapis rouge
  R(px(30) + 6, py(22) + 6, px(41) - px(30) - 8, py(27) - py(22) - 6, '#b0553a'); R(px(30) + 8, py(22) + 8, px(41) - px(30) - 12, py(27) - py(22) - 10, '#a84e30');
  // mur du fond des salles du bas (avec la tranche du mur vue de dessus)
  const cap0 = py(LOW.top), wy0 = cap0 + 5, wy1 = py(LOW.floor);
  R(px(XMIN), cap0, px(XMAX) - px(XMIN), 5, '#3e3129'); R(px(XMIN), cap0 + 4, px(XMAX) - px(XMIN), 1, '#5a4636');
  Object.values(ROOMS).forEach(({ x0, x1, th }) => {
    const a = px(x0), b = px(x1);
    R(a, wy0, b - a, wy1 - wy0, th.up);
    for (let x = a; x < b; x += 8) R(x, wy0, 4, wy1 - wy0 - 15, th.stripe);
    R(a, wy1 - 15, b - a, 1, 'rgba(255,255,255,.5)'); R(a, wy1 - 14, b - a, 11, th.wain); R(a, wy1 - 14, b - a, 1, th.hi);
    for (let x = a + 8; x < b; x += 16) R(x, wy1 - 12, 1, 8, th.line);
    R(a, wy1 - 3, b - a, 3, th.base);
  });
  R(px(XMIN), wy1, px(XMAX) - px(XMIN), 2, 'rgba(0,0,0,.2)');
  // passages vers le bas
  DOORS_DOWN.forEach(c => {
    const x0 = px(c), fl = (ROOMS[roomAt(c)] || ROOMS.games).floor;
    R(x0 - 2, cap0 + 2, 36, wy1 - cap0 - 2, '#6e4c38'); R(x0, cap0, 32, wy1 - cap0, fl);
    R(x0, cap0, 32, 8, 'rgba(0,0,0,.28)'); R(x0, cap0 + 8, 32, 6, 'rgba(0,0,0,.12)');
  });
  // déco murale
  // salle de jeux : enseigne néon "GAME ON"
  const nx = px(-7), ny = wy0 + 6;
  R(nx - 2, ny - 2, 52, 13, '#1b1622'); pixText('GAME', nx + 2, ny + 2, '#ff5fc8'); pixText('ON', nx + 22, ny + 2, '#5fe8ff');
  // tests : panneau "TESTS"
  R(px(9) + 6, wy0 + 3, 40, 11, '#2f4a3c'); pixText('TESTS', px(9) + 10, wy0 + 6, '#d6f5e2');
  // serveur : climatiseur
  panel(px(25), wy0 + 4, 26, 9, '#d8dde2'); for (let i = 0; i < 5; i++) R(px(25) + 2, wy0 + 6 + i * 1.5 | 0, 22, 1, '#aab3bb');
  // bibliothèque : horloge comtoise et cadres
  panel(px(28) + 4, wy0 + 6, 9, 14, '#6e4632'); R(px(28) + 6, wy0 + 8, 5, 5, CREAM);
  g = prev;
}
paintRooms();
// peint un élément de déco fixe sur le fond
function paintExtra(fn) { const prev = g; g = bg.getContext('2d'); fn(); g = prev; }

// murs verticaux du bas et mur pause | terrasse (même style que les autres murs de séparation)
function splitWall(tx, topY, doorY, bottomY) {
  furniture.push({ k: py(doorY), draw() {
    const x = px(tx) + 3, faceY = py(doorY) - 14;
    R(x, topY, 10, faceY - topY, '#5a4636'); R(x, topY, 1, faceY - topY, '#6e5848'); R(x + 9, topY, 1, faceY - topY, '#4a3a30');
    R(x, faceY, 10, 3, '#f3ece0'); R(x, faceY + 3, 10, 8, '#c9a98a'); R(x, faceY + 11, 10, 3, '#8a5a44');
  } });
  furniture.push({ k: py(bottomY) + 1, draw() {
    const x = px(tx) + 3, top = py(doorY + 2) - 14;
    R(x, top, 10, py(bottomY) - top, '#5a4636'); R(x, top, 10, 1, '#7a6352'); R(x, top, 1, py(bottomY) - top, '#6e5848'); R(x + 9, top, 1, py(bottomY) - top, '#4a3a30');
  } });
}
LOW_WALLS.forEach(tx => splitWall(tx, py(LOW.top) + 5, 21, LOW.bottom));
splitWall(32, OYp + 2, 7, 14);

/* ---------- sièges de travail des salles thématiques ---------- */
function seat(cell, opts) { return Object.assign({ type: 'seat', cell, stand: [cell[0], cell[1] + 1] }, opts); }
const ZONE_SEATS = {
  tests: [7, 8, 13, 14].map(x => seat([x, 18], { zone: 'tests', pos: [px(x) + 8, py(18) + 7], k: py(18) + 7, face: 'up', legs: 'stand', label: 'Lance les tests' })),
  server: [18, 19, 23, 24].map(x => seat([x, 18], { zone: 'server', pos: [px(x) + 8, py(18) + 7], k: py(18) + 7, face: 'up', legs: 'stand', label: 'Build et déploiement' })),
  library: [31, 34, 37, 40].map(x => seat([x, 21], { zone: 'library', pos: [px(x) + 8, py(21) + 12], k: py(21) + 12, face: 'down', legs: 'sit', act: 'book', label: 'Lit la doc' }))
};
[...ZONE_SEATS.tests, ...ZONE_SEATS.server].forEach(s => block(s.cell[0], s.cell[1] - 1));   // les postes contre le mur
ZONE_SEATS.library.forEach(s => block(...s.cell));
// en pause, on peut aussi venir lire à la bibliothèque
ZONE_SEATS.library.forEach(s => IDLE_SEATS.push(Object.assign(Object.create(s), { w: 8, label: 'Lit un bouquin à la bibliothèque', act: 'book', zone: undefined, ok: () => !seatTaken(s) })));

// quelle salle selon l'activité ? (vote sur les 40 dernières secondes, avec un temps minimum avant de changer)
const RX_TEST = /\b(test|tests|jest|vitest|pytest|mocha|spec|playwright|cypress)\b/i;
const RX_SERVER = /\b(build|docker|deploy|kubectl|terraform|make|compose|ssh|helm|install|pip|git push|cargo|gradle|mvn)\b/i;
function zoneCat(a) {
  if (!WORK.has(a.state)) return null;
  const b = a.bubble || '';
  if (RX_TEST.test(b)) return 'tests';
  if (a.state === 'working' && RX_SERVER.test(b)) return 'server';
  if (a.state === 'reading') return 'library';
  return 'desk';
}
const protoIs = (x, s) => x && typeof x === 'object' && Object.getPrototypeOf(x) === s;
const seatTaken = (s, me) => everyone().some(o => o !== me && (o.seat === s || o.heading === s || o.zoneSeat === s || protoIs(o.seat, s) || protoIs(o.heading, s)));
let zoneTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < zoneTick) return; zoneTick = now + 1000;
  agents.forEach(a => {
    a.votes = a.votes || [];
    const c = zoneCat(a);
    if (!c) { a.votes.length = 0; a.zone = null; a.zoneSeat = null; return; }
    a.votes.push(c); if (a.votes.length > 40) a.votes.shift();
    if (a.votes.length < 10 || now - (a.zoneAt || 0) < 25000) return;
    const n = {}; a.votes.forEach(v => { n[v] = (n[v] || 0) + 1; });
    let want = 'desk';
    const need = { tests: 0.3, server: 0.35, library: 0.35 };
    let best = 0;
    ['tests', 'server', 'library'].forEach(z => { const r = (n[z] || 0) / a.votes.length; if (r >= need[z] && r > best) { best = r; want = z; } });
    if (want === (a.zone || 'desk')) return;
    if (want === 'desk') { a.zone = null; a.zoneSeat = null; a.zoneAt = now; return; }
    const s = ZONE_SEATS[want].find(s => !seatTaken(s, a));
    if (!s) return;
    a.zone = want; a.zoneSeat = s; a.zoneAt = now;
    news({ tests: '🧪', server: '🖥', library: '📚' }[want], a.name + ' file ' + { tests: 'à la salle de tests', server: 'à la salle serveur', library: 'à la bibliothèque' }[want]);
  });
});
const zoneAgent = s => everyone().find(o => o.seat === s && o.mode === 'sit');
const errRecent = a => a && a.m && a.m.errorAt && Date.now() - a.m.errorAt < 90000;

/* ---------- salle de tests ---------- */
furniture.push({ k: py(18) - 1, draw(t) {          // paillasse contre le mur, un écran par poste
  const ty = py(17) - 3;
  [[7, 9], [13, 15]].forEach(([a, b]) => {           // deux îlots, de part et d'autre de l'entrée
    const x0 = px(a) + 1, x1 = px(b) - 1;
    R(x0, py(18) + 1, x1 - x0, 2, SHADOW);
    panel(x0, ty, x1 - x0, 6, '#f6f8f7'); R(x0, ty, x1 - x0, 1, '#ffffff'); panel(x0, ty + 6, x1 - x0, py(18) - ty - 6, '#cfdcd4');
  });
  ZONE_SEATS.tests.forEach(s => {
    const a = zoneAgent(s), sx = px(s.cell[0]) + 2, sy = py(17) - 16;
    panel(sx, sy, 12, 10, '#1d2422');
    if (a) {
      const bad = errRecent(a), c = bad ? '#ff6b5e' : '#5fe39a';
      for (let r = 0; r < 3; r++) R(sx + 2, sy + 2 + r * 2, 3 + ((Math.floor(t * 4) + r * 3) % 6), 1, c);
      R(sx + 9, sy + 6, 2, 2, c);
    } else R(sx + 2, sy + 4, 4, 1, '#3a4a44');
    R(sx + 5, sy + 10, 2, 3, '#55606d');
  });
} });
furniture.push({ k: py(24) + 2, draw(t) {           // table de manip avec fioles qui bouillonnent
  const x0 = px(9) + 4, y0 = py(23) + 2;
  R(x0, y0 + 14, 56, 2, SHADOW);
  panel(x0, y0, 56, 8, '#f6f8f7'); panel(x0, y0 + 8, 56, 5, '#cfdcd4');
  [[6, '#5fe39a'], [16, '#6aa9ff'], [26, '#ff9ad5'], [38, '#ffd166'], [48, '#5fe8ff']].forEach(([dx, c], i) => {
    panel(x0 + dx, y0 - 6, 5, 8, 'rgba(220,235,240,.9)', '#7a8a90'); R(x0 + dx, y0 - 2, 5, 4, c);
    const p = (t * 0.8 + i * 0.27) % 1; g.globalAlpha = 1 - p; R(x0 + dx + 2, y0 - 7 - Math.round(p * 8), 1, 1, c); g.globalAlpha = 1;
  });
} });
[9, 10, 11, 12].forEach(x => block(x, 23));
HOOKS.floor.push(t => {                               // grand voyant d'état au mur : vert si tout passe, rouge sinon
  const testers = ZONE_SEATS.tests.map(zoneAgent).filter(Boolean);
  const bad = testers.some(errRecent), lx = px(13) + 4, ly = py(LOW.top) + 9;
  R(lx - 1, ly - 1, 12, 12, '#2f4a3c');
  R(lx, ly, 10, 10, testers.length ? (bad ? (Math.floor(t * 3) % 2 ? '#ff4b3e' : '#a3261d') : '#3fd17f') : '#4a5a52');
});

/* ---------- salle serveur ---------- */
seed = 99;
const RACKS = [];
[21, 25].forEach(y => [19, 20, 21, 23, 24, 25].forEach(x => { RACKS.push({ x, y, leds: Array.from({ length: 10 }, () => [Math.floor(rnd() * 10), Math.floor(rnd() * 26), rnd()]) }); block(x, y); }));
RACKS.forEach(r => furniture.push({ k: py(r.y + 1) - 1, draw(t) {
  const x0 = px(r.x) + 1, top = py(r.y) - 22, bot = py(r.y + 1) - 2;
  const alarm = ZONE_SEATS.server.some(s => errRecent(zoneAgent(s)));
  panel(x0, top, 14, bot - top, '#1f2328'); R(x0, top, 14, 2, '#3a4049');
  for (let y = top + 4; y < bot - 2; y += 4) R(x0 + 1, y, 12, 1, '#2c3238');
  r.leds.forEach(([lx, ly, ph], i) => {
    const on = Math.floor(t * (2 + ph * 4) + ph * 10) % 3;
    if (on) R(x0 + 2 + lx, top + 4 + ly, 1, 1, alarm && i % 3 === 0 ? '#ff4b3e' : i % 4 === 0 ? AMBER : '#4fe08a');
  });
} }));
furniture.push({ k: py(18) - 1, draw(t) {            // consoles contre le mur
  const ty = py(17) - 3;
  [[18, 20], [23, 25]].forEach(([a, b]) => {         // deux îlots, de part et d'autre de l'entrée
    const x0 = px(a) + 1, x1 = px(b) - 1;
    panel(x0, ty, x1 - x0, 6, '#3a4049'); panel(x0, ty + 6, x1 - x0, py(18) - ty - 6, '#2a2f36');
  });
  ZONE_SEATS.server.forEach(s => {
    const a = zoneAgent(s), sx = px(s.cell[0]) + 2, sy = py(17) - 16;
    panel(sx, sy, 12, 10, '#0f1412');
    if (a) for (let r = 0; r < 4; r++) R(sx + 1, sy + 1 + r * 2, 2 + ((Math.floor(t * 6) + r * 5) % 9), 1, errRecent(a) && r === 3 ? '#ff6b5e' : '#5fe39a');
    R(sx + 5, sy + 10, 2, 3, '#55606d');
  });
} });
HOOKS.floor.push(t => {                               // gyrophare d'alarme
  const alarm = ZONE_SEATS.server.some(s => errRecent(zoneAgent(s))), x = px(22) + 6, y = py(LOW.top) + 8;
  R(x, y + 5, 5, 2, '#55606d'); R(x, y, 5, 5, alarm ? (Math.floor(t * 4) % 2 ? '#ff4b3e' : '#7a1f18') : '#4a2a28');
});

/* ---------- bibliothèque ---------- */
seed = 17;
furniture.push({ k: py(18) - 1, draw() {             // grandes étagères contre le mur
  const x0 = px(32) + 1, x1 = px(42) - 2, top = py(17) - 30, bot = py(18) - 2;
  panel(x0, top, x1 - x0, bot - top, '#6e4632'); R(x0, top, x1 - x0, 2, '#8a5a40');
  seed = 17;
  for (let s = 0; s < 4; s++) {
    const iy = top + 4 + s * 11;
    R(x0 + 2, iy, x1 - x0 - 4, 9, '#3e2a1e');
    for (let x = x0 + 3; x < x1 - 4;) {
      const bw = 2 + Math.floor(rnd() * 2), bh = 6 + Math.floor(rnd() * 3);
      R(x, iy + 9 - bh, bw, bh, [CLAY, BLUE, GREEN, AMBER, CREAM, '#8c6c9e', '#3a3835', '#c25b6a'][Math.floor(rnd() * 8)]);
      x += bw + (rnd() < 0.1 ? 3 : 0);
    }
    R(x0 + 1, iy + 9, x1 - x0 - 2, 2, '#8a5a40');
  }
  R(px(36), top - 2, 2, bot - top + 2, '#a07a52'); R(px(36) + 6, top - 2, 2, bot - top + 2, '#a07a52');   // échelle
  for (let y = top + 2; y < bot; y += 6) R(px(36), y, 8, 1, '#a07a52');
} });
for (let x = 32; x < 42; x++) block(x, 17);
ZONE_SEATS.library.forEach((s, i) => furniture.push({ k: s.k - 1, draw() {   // fauteuils club + lampe
  const cx = px(s.cell[0]) + 8, by = py(s.cell[1]) + 14;
  R(cx - 9, by, 18, 2, SHADOW);
  panel(cx - 8, by - 18, 16, 10, '#7a3324'); R(cx - 8, by - 18, 16, 1, '#9a4a36');
  panel(cx - 9, by - 9, 18, 8, '#8e3f2a'); panel(cx - 10, by - 13, 3, 12, '#6e2a1c'); panel(cx + 7, by - 13, 3, 12, '#6e2a1c');
  if (i % 2 === 0) { R(cx + 13, by - 22, 1, 20, '#c9952f'); panel(cx + 10, by - 26, 7, 5, '#f6e7b0'); }
} }));
furniture.push({ k: py(25) + 2, draw() {             // grande table avec lampes de banquier
  const x0 = px(33) + 2, y0 = py(24) + 4;
  R(x0, y0 + 14, 60, 2, SHADOW);
  panel(x0, y0, 60, 8, '#7a4e36'); R(x0, y0, 60, 1, '#9a6a4c'); panel(x0, y0 + 8, 60, 5, '#5e3a28');
  [[10], [44]].forEach(([dx]) => { R(x0 + dx + 2, y0 - 6, 1, 6, '#c9952f'); panel(x0 + dx, y0 - 9, 7, 3, '#2f6b4a'); });
  panel(x0 + 22, y0 + 2, 8, 4, CREAM); R(x0 + 26, y0 + 2, 1, 4, '#c9c2b4'); panel(x0 + 34, y0 + 1, 5, 5, BLUE);
} });
[33, 34, 35, 36].forEach(x => block(x, 24));

/* ---------- salle de jeux ---------- */
const BILLIARD = { x: -6, y: 20 };
[-6, -5, -4].forEach(x => { block(x, 20); block(x, 21); });
SPOTS.push(
  { cell: [-7, 20], face: 'right', label: 'Joue au billard', w: 11, act: 'billard' },
  { cell: [-3, 21], face: 'left', label: 'Joue au billard', w: 9, act: 'billard' }
);
furniture.push({ k: py(22) - 1, draw(t) {
  const x0 = px(-6) + 1, y0 = py(20) - 2, w = 46, h = 32;
  const players = everyone().filter(a => a.act === 'billard' && !a.path.length && !a.heading).length + (catOnBilliard() ? 2 : 0);
  R(x0 + 1, y0 + h + 2, w, 3, SHADOW);
  panel(x0, y0, w, h, '#6e3a22'); R(x0 + 3, y0 + 3, w - 6, h - 9, '#2f8f5a'); R(x0 + 3, y0 + 3, w - 6, 1, '#3fa86c');
  R(x0, y0 + h - 6, w, 6, '#5a2e1a');
  [[3, 3], [w / 2 - 1, 2], [w - 5, 3], [3, h - 9], [w / 2 - 1, h - 8], [w - 5, h - 9]].forEach(([dx, dy]) => R(x0 + dx, y0 + dy, 2, 2, '#111'));
  const balls = [[0.3, 0.4, '#ffffff'], [0.6, 0.3, '#e8b04a'], [0.65, 0.55, '#d64545'], [0.7, 0.42, '#3a6aa0'], [0.55, 0.65, '#1b1a19'], [0.75, 0.6, '#5d9a5f']];
  balls.forEach(([bx, by, c], i) => {
    const mv = players >= 2 ? Math.sin(t * (0.7 + i * 0.13) + i) * 0.12 : 0, mv2 = players >= 2 ? Math.cos(t * (0.5 + i * 0.11) + i) * 0.1 : 0;
    R(x0 + 4 + Math.round((bx + mv) * (w - 10)), y0 + 4 + Math.round((by + mv2) * (h - 13)), 2, 2, c);
  });
} });
HOOKS.post.push(() => {                              // la queue de billard dans les mains des joueurs
  everyone().forEach(a => {
    if (a.act !== 'billard' || a.path.length || a.heading || !a._anchor) return;
    const x = a._anchor.x, y = a._anchor.y + 14, d = a.face === 'right' ? 1 : -1;
    for (let i = 0; i < 12; i++) R(x + d * (2 + i), y + Math.round(i * 0.25), 1, 1, i > 9 ? '#f2f2f2' : '#c9953f');
  });
});
// console : grand écran au mur + deux poufs
const CONSOLE = [[-2, 19], [0, 19]].map(([x, y]) => seat([x, y], { pos: [px(x) + 8, py(y) + 10], k: py(y) + 10.5, face: 'up', legs: null, act: 'console', label: 'Joue à la console', w: 12, stand: [x, y + 1] }));
CONSOLE.forEach(s => { IDLE_SEATS.push(s); block(...s.cell); });
HOOKS.floor.push(t => {
  const x0 = px(-2) + 2, y0 = py(LOW.top) + 9, w = 44, h = 22, on = CONSOLE.some(s => zoneAgent(s));
  R(x0 - 2, y0 - 2, w + 4, h + 4, '#111'); R(x0, y0, w, h, on ? '#1a2a4a' : '#22252b');
  if (on) {                                          // petit jeu de plateforme
    const f = Math.floor(t * 6);
    R(x0, y0 + h - 4, w, 4, '#3f7a4a');
    R(x0 + 6 + (f % 30), y0 + h - 9, 4, 5, '#ff5f5f'); R(x0 + 30 - (f % 20), y0 + h - 8, 3, 3, '#ffd166');
    R(x0 + 4, y0 + 4, 8, 3, '#ffffff'); R(x0 + 30, y0 + 6, 10, 3, '#ffffff');
  }
});
CONSOLE.forEach(s => furniture.push({ k: s.k - 1, draw() {
  const cx = px(s.cell[0]) + 8, by = py(s.cell[1]) + 13;
  R(cx - 8, by, 16, 2, SHADOW); panel(cx - 7, by - 9, 14, 9, s.cell[0] < 0 ? '#d64fa0' : '#3fc6d6'); R(cx - 7, by - 9, 14, 2, 'rgba(255,255,255,.25)');
} }));
HOOKS.post.push(() => {                              // manette dans les mains
  CONSOLE.forEach(s => { const a = zoneAgent(s); if (a && a._anchor) panel(a._anchor.x - 3, a._anchor.y + 15, 6, 2, '#3a3835', OUT); });
});
[[-8, 27], [4, 27]].forEach(([tx, ty]) => furniture.push({ k: py(ty) + 14, draw() {   // plantes
  const cx = px(tx) + 8, by = py(ty) + 14;
  panel(cx - 4, by - 7, 8, 7, '#c0704f'); leaves(cx, by - 7, [[-6, -6, 3, 6, '#6f8a52'], [-2, -11, 3, 11, '#7f9c5f'], [3, -7, 3, 7, '#86a566']]);
} }));
block(-8, 27); block(4, 27);

/* ---------- terrasse ---------- */
const badWeather = () => { const s = skyState(Date.now()); return s.rain || s.snow || s.storm; };
const TERRACE_OK = () => !badWeather();
// la terrasse est interdite (pour les balades, les chats…) quand il pleut, neige ou fait de l'orage
function outsideBlocked(cell) { return cell[0] >= 33 && cell[1] < 14 && badWeather(); }
let shelterTick = 0;
HOOKS.update.push((dt, now) => {                       // il se met à pleuvoir : tout le monde rentre
  if (now < shelterTick) return; shelterTick = now + 2000;
  if (!badWeather()) return;
  cats.forEach(c => {
    const tgt = c.path.length ? c.path[c.path.length - 1] : null;
    if (c.ride || c.chasing) return;
    if ((c.x >= 33 && c.y < 14) || (tgt && outsideBlocked(tgt))) { c.spot = null; c.path = []; c.nextMove = 0; c.z = 0; c.mode = 'walk'; catGo(c, [27, 8], null); }
  });
  everyone().forEach(a => {
    if (a.x >= 33 && a.y < 14 && !a.path.length && !WORK.has(a.state) && !a.isOwner) { a.nextMove = 0; standUp(a); }
  });
});
const LOUNGERS = [34, 36].map(x => seat([x, 6], { pos: [px(x) + 8, py(6) + 11], k: py(6) + 11.5, face: 'down', legs: 'sit', act: 'chill', w: 7, ok: TERRACE_OK, stand: [x, 7], label: 'Se pose sur un transat' }));
const CAFE = [seat([37, 10], { pos: [px(37) + 9, py(10) + 9], k: py(10) + 10, face: 'right', legs: 'side', w: 5, ok: TERRACE_OK, label: 'Prend un café en terrasse', stand: [37, 11] }),
  seat([40, 10], { pos: [px(40) + 7, py(10) + 9], k: py(10) + 10, face: 'left', legs: 'side', w: 5, ok: TERRACE_OK, label: 'Prend un café en terrasse', stand: [40, 11] })];
[...LOUNGERS, ...CAFE].forEach(s => { IDLE_SEATS.push(s); block(...s.cell); });
[38, 39].forEach(x => block(x, 10));
SPOTS.push(
  { cell: [35, 3], face: 'up', label: 'Admire la vue sur Lyon', w: 4, ok: TERRACE_OK },
  { cell: [39, 3], face: 'up', label: 'Prend l\'air', w: 3, ok: TERRACE_OK }
);
LOUNGERS.forEach(s => furniture.push({ k: s.k - 1, draw() {      // transats
  const cx = px(s.cell[0]) + 8, by = py(s.cell[1]) + 15;
  R(cx - 8, by, 16, 2, SHADOW);
  panel(cx - 7, by - 22, 14, 10, '#c9a877'); for (let x = cx - 6; x < cx + 7; x += 3) R(x, by - 21, 2, 8, x % 2 ? '#f3e7d0' : CLAY);
  panel(cx - 7, by - 12, 14, 9, '#b8955f'); for (let x = cx - 6; x < cx + 7; x += 3) R(x, by - 11, 2, 7, x % 2 ? '#f3e7d0' : CLAY);
  R(cx - 7, by - 3, 1, 3, '#8a6a42'); R(cx + 6, by - 3, 1, 3, '#8a6a42');
} }));
furniture.push({ k: py(11) - 2, draw() {               // table de café
  const x0 = px(38) + 6, y0 = py(10) + 3;
  R(x0, y0 + 11, 22, 2, SHADOW); panel(x0, y0, 20, 6, '#e9e4da'); R(x0 + 9, y0 + 6, 2, 6, '#8a8f96');
  panel(x0 + 4, y0 + 1, 3, 3, CREAM); panel(x0 + 13, y0 + 1, 3, 3, CLAY);
} });
CAFE.forEach(s => furniture.push({ k: s.k - 1, draw() {
  const cx = s.pos[0], by = py(s.cell[1]) + 14;
  R(cx - 5, by, 10, 2, SHADOW); panel(cx - 4, by - 7, 8, 3, '#5a5f66'); R(cx - 4, by - 4, 1, 4, '#5a5f66'); R(cx + 3, by - 4, 1, 4, '#5a5f66');
  panel(s.face === 'right' ? cx - 5 : cx + 3, by - 15, 2, 9, '#5a5f66');
} }));
HOOKS.post.push(t => {                               // parasol (au-dessus de tout le monde)
  const cx = px(39), y0 = py(10) - 26;
  R(cx, y0 + 4, 1, 26, '#8a8f96');
  for (let i = 0; i < 14; i++) R(cx - 14 + i * 2, y0 + Math.abs(7 - i) / 2 | 0, 2, 5, i % 2 ? '#f3e7d0' : CLAY);
  R(cx - 1, y0 - 1, 3, 2, '#5a5f66');
});
[34, 36, 38, 40].forEach(x => { block(x, 13); furniture.push({ k: py(13) + 14, draw() {     // jardinières fleuries
  const x0 = px(x) + 1;
  panel(x0, py(13) + 7, 14, 7, '#8a6a52'); R(x0, py(13) + 7, 14, 2, '#5a3d2b');
  leaves(x0 + 7, py(13) + 7, [[-6, -5, 3, 5, '#6f8a52'], [-2, -7, 3, 7, '#7f9c5f'], [3, -5, 3, 5, '#6f8a52']]);
  R(x0 + 2, py(13) + 2, 2, 2, ['#ff8fb0', '#ffd166', '#c9a0ff', '#ff8fb0'][x % 4]); R(x0 + 10, py(13) + 1, 2, 2, ['#ffd166', '#ff8fb0', '#ffffff', '#c9a0ff'][x % 4]);
} }); });
// le ciel au-dessus de la terrasse : vue sur Lyon (Fourvière, la tour métallique, le Crayon et l'Incity)
HOOKS.floor.push(t => {
  const sk = skyState(Date.now()), x0 = px(32) + 13, x1 = px(42) - 3, y0 = OYp, y1 = py(3);
  const night = sk.kind === 'night';
  for (let y = y0; y < y1; y++) R(x0, y, x1 - x0, 1, mix(sk.top, sk.bot, (y - y0) / (y1 - y0)));
  if (night && !sk.grey) for (let x = x0; x < x1; x += 3) { const h = hash('t' + x); if (h % 7 === 0) R(x, y0 + 2 + h % 20, 1, 1, (Math.floor(t) + h) % 4 ? '#e8ecff' : '#8a93b8'); }
  // nuages qui défilent
  const cc = night ? '#55607e' : sk.grey ? '#dfe3e7' : '#ffffff';
  for (let i = 0; i < 2 + (sk.grey ? 2 : 0); i++) {
    const hh = hash('tc' + i), cx = x0 + Math.round(((hh % 200) + t * (3 + i)) % (x1 - x0 + 30)) - 15, cy = y0 + 4 + (hh >> 5) % 14;
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    R(cx, cy + 2, 16, 3, cc); R(cx + 3, cy, 8, 3, cc); g.restore();
  }
  const sil = night ? '#1d2236' : sk.grey ? '#8a96a3' : '#7f8fa8', gy = y1 - 8;
  R(x0, gy - 3, x1 - x0, 11, sil);
  for (let i = 0; i < 40; i++) { const hx = x0 + i, hy = gy - 3 - Math.round(Math.sin(i / 40 * Math.PI) * 9); R(hx, hy, 1, gy - hy, sil); }   // colline de Fourvière
  R(x0 + 14, gy - 18, 12, 6, sil); [14, 17, 22, 25].forEach(dx => R(x0 + dx, gy - 21, 1, 3, sil)); R(x0 + 19, gy - 22, 2, 4, sil);   // basilique
  R(x0 + 33, gy - 26, 1, 15, sil); R(x0 + 32, gy - 14, 3, 2, sil);                                   // tour métallique
  R(x0 + 92, gy - 24, 6, 21, sil); R(x0 + 93, gy - 27, 4, 3, sil); R(x0 + 94, gy - 29, 2, 2, sil);   // le Crayon
  R(x0 + 104, gy - 28, 6, 25, sil); R(x0 + 104, gy - 30, 3, 2, sil);                                // l'Incity
  for (let i = 0; i < 9; i++) R(x0 + 50 + i * 4, gy - 6 - (hash('b' + i) % 8), 3, 9, sil);             // immeubles
  if (night) for (let i = 0; i < 26; i++) { const h = hash('w' + i); if ((Math.floor(t * 0.2) + h) % 5) R(x0 + 48 + h % 70, gy - 4 - (h >> 4) % 18, 1, 1, '#ffd88a'); }
  if (sk.fog) { g.fillStyle = 'rgba(225,228,230,.5)'; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  // garde-corps
  R(x0 - 13, y1 - 9, x1 - x0 + 13, 2, '#5a5f66'); for (let x = x0 - 12; x < x1; x += 6) R(x, y1 - 7, 1, 7, '#7a8088');
  // guirlande lumineuse
  for (let i = 0; i < 12; i++) {
    const bx = x0 - 8 + i * 13, by = y1 + 2 + Math.round(Math.sin(i / 11 * Math.PI) * 4);
    R(bx, by, 2, 2, night ? ((Math.floor(t * 1.5) + i) % 5 ? '#ffd88a' : '#fff1c7') : '#d9c69a');
  }
});
// la vraie pluie (ou neige) de Lyon tombe sur la terrasse
// nombre pseudo-aléatoire bien réparti (xorshift) : évite que les gouttes voisines tombent en paquets
const scatter = n => { n = (n * 2654435761 + 1013904223) >>> 0; n ^= n << 13; n >>>= 0; n ^= n >>> 17; n ^= n << 5; return n >>> 0; };
const PUDDLES = [[35, 8.4, 16], [38.5, 12.3, 12], [34.2, 11.2, 9], [40.3, 7.5, 13], [36.8, 4.6, 8]];
const SPLASH_ZONE = { x0: 33.2, x1: 41.6, y0: 3.4, y1: 13.6 };
HOOKS.post.push(t => {
  const sk = skyState(Date.now()); if (!sk.rain && !sk.snow) return;
  const x0 = px(32) + 13, x1 = px(42) - 3, top = OYp, floor0 = py(3), bot = py(14), w = x1 - x0, h = bot - top;
  g.save(); g.beginPath(); g.rect(x0 - 13, top, x1 - x0 + 13, bot - top); g.clip();
  if (sk.rain) {
    const c = WX.code ?? 61, drizzle = c >= 51 && c <= 57, heavy = (c >= 63 && c <= 67) || c >= 81 || sk.storm;
    const wind = Math.max(0.3, Math.min(1.6, (WX.wind || 8) / 14));     // inclinaison selon le vent
    // sol mouillé + flaques avec ronds dans l'eau
    g.fillStyle = 'rgba(30,50,80,' + (drizzle ? 0.07 : 0.14) + ')'; g.fillRect(x0 - 13, floor0, w + 13, bot - floor0);
    PUDDLES.forEach(([tx, ty, pw], i) => {
      const cx = px(tx), cy = py(ty);
      g.fillStyle = 'rgba(110,140,185,.38)'; g.fillRect(cx - pw / 2, cy - 1, pw, 3); g.fillRect(cx - pw / 2 + 2, cy - 2, pw - 4, 5);
      R(cx - pw / 2 + 2, cy - 2, pw - 6, 1, 'rgba(200,220,245,.35)');
      const p = (t * (heavy ? 1.6 : 1) + i * 0.37) % 1, rw = Math.round(2 + p * (pw / 2 - 2));
      g.globalAlpha = 0.7 * (1 - p);
      R(cx - rw, cy, 1, 1, '#dfeaf8'); R(cx + rw, cy, 1, 1, '#dfeaf8'); R(cx - 1, cy - 1 - Math.round(p), 3, 1, '#dfeaf8'); R(cx - 1, cy + 1 + Math.round(p), 3, 1, '#dfeaf8');
      g.globalAlpha = 1;
    });
    // gouttes : couche lointaine (fine, pâle) et couche proche (longue, nette), inclinées par le vent
    const n = drizzle ? 70 : heavy ? 190 : 120;
    for (let i = 0; i < n; i++) {
      const hh = scatter(i + 1), near = i % 3 === 0, len = drizzle ? 2 : near ? 7 : 4, sp = near ? 210 : 140;
      const x = x0 + hh % w, y = top + ((hh >>> 3) % h + t * sp) % h;
      const col = near ? 'rgba(215,228,250,.65)' : 'rgba(190,205,235,.32)';
      const xx = x0 + (((x - x0 - wind * (y - top) * 0.3) % w) + w) % w;   // la goutte dérive avec le vent pendant sa chute
      for (let k = 0; k < len; k++) R(Math.round(xx - wind * k * 0.4), Math.round(y + k), 1, 1, col);
    }
    // éclaboussures qui rebondissent sur le deck
    const m = drizzle ? 10 : heavy ? 36 : 22;
    for (let i = 0; i < m; i++) {
      const cyc = Math.floor(t * 1.8 + i * 0.13), p = (t * 1.8 + i * 0.13) % 1, hh = scatter(i * 7919 + cyc * 104729);
      const sx = px(SPLASH_ZONE.x0 + (hh % 1000) / 1000 * (SPLASH_ZONE.x1 - SPLASH_ZONE.x0)), sy = py(SPLASH_ZONE.y0 + ((hh >>> 10) % 1000) / 1000 * (SPLASH_ZONE.y1 - SPLASH_ZONE.y0));
      if (BLOCKED.has(Math.floor((sx - OXp) / T + XMIN) + ',' + Math.floor((sy - OYp) / T))) continue;
      const col = 'rgba(225,235,250,.75)';
      if (p < 0.12) R(sx, sy, 1, 1, col);
      else if (p < 0.26) { R(sx - 1, sy - 1, 1, 1, col); R(sx + 1, sy - 1, 1, 1, col); R(sx, sy - 2, 1, 1, col); }
      else if (p < 0.4) { R(sx - 2, sy, 1, 1, 'rgba(225,235,250,.45)'); R(sx + 2, sy, 1, 1, 'rgba(225,235,250,.45)'); }
    }
    // gouttes qui tombent du bord du parasol
    for (let i = 0; i < 4; i++) { const p = (t * 1.3 + i * 0.25) % 1; R(px(39) - 13 + i * 9, py(10) - 20 + Math.round(p * 22), 1, 2, 'rgba(215,228,250,.6)'); }
  } else {
    // neige : flocons de tailles variées qui dérivent, fine couche blanche au sol
    g.fillStyle = 'rgba(240,245,250,.18)'; g.fillRect(x0 - 13, floor0, w + 13, bot - floor0);
    for (let i = 0; i < 110; i++) {
      const hh = scatter(i + 50000), big = i % 4 === 0, sp = big ? 22 : 14;
      const y = top + ((hh >>> 3) % h + t * sp) % h, x = x0 + (hh % w) + Math.round(Math.sin(t * 0.8 + i) * (big ? 3 : 2));
      R(x, y, big ? 2 : 1, big ? 2 : 1, big ? '#ffffff' : 'rgba(255,255,255,.75)');
    }
  }
  g.restore();
});

/* ====================================================================
   Déco pour remplir les salles (chaque objet un peu utile devient aussi une activité de pause)
   ==================================================================== */
const deco = (tx, ty, k, draw, solid) => { if (solid !== false) block(tx, ty); furniture.push({ k: k != null ? k : py(ty + 1), draw }); };
const near = (cell) => everyone().some(a => !a.path.length && !a.heading && Math.abs(a.x - cell[0] - 0.5) < 0.6 && Math.abs(a.y - cell[1] - 0.5) < 0.6);
const pot = (cx, by, big) => {
  panel(cx - (big ? 5 : 4), by - (big ? 9 : 7), big ? 10 : 8, big ? 9 : 7, '#c0704f'); R(cx - (big ? 5 : 4), by - (big ? 9 : 7), big ? 10 : 8, 2, '#d68a68');
  leaves(cx, by - (big ? 9 : 7), big
    ? [[-7, -14, 4, 12, '#5d7745'], [3, -16, 4, 14, '#5d7745'], [-3, -24, 3, 22, '#6f8a52'], [1, -20, 3, 18, '#7f9c5f'], [-9, -7, 5, 4, '#6f8a52']]
    : [[-6, -6, 3, 6, '#6f8a52'], [-2, -11, 3, 11, '#7f9c5f'], [3, -7, 3, 7, '#86a566']]);
};

/* --- salle de jeux --- */
paintExtra(() => {                                   // tapis sous la console + posters rétro + cible de fléchettes
  R(px(-3) + 2, py(18) + 2, px(1) - px(-3) - 4, py(21) - py(18) - 4, '#4a2a6a'); R(px(-3) + 4, py(18) + 4, px(1) - px(-3) - 8, py(21) - py(18) - 8, '#5a3a80');
  const wy0 = py(LOW.top) + 5;
  [[px(-4) + 3, '#ff5fc8'], [px(1) + 2, '#5fe8ff']].forEach(([x, c], i) => {
    R(x - 1, wy0 + 5, 16, 20, '#1b1622'); R(x, wy0 + 6, 14, 18, '#241c33');
    const inv = i ? ['..X..X..', '...XX...', '..XXXX..', '.XX..XX.', 'XXXXXXXX', 'X.X..X.X'] : ['...XX...', '..XXXX..', '.XX.X.X.', 'XXXXXXXX', '..X..X..', '.X.XX.X.'];
    inv.forEach((row, r) => { for (let k = 0; k < 8; k++) if (row[k] === 'X') R(x + 3 + k, wy0 + 9 + r, 1, 1, c); });
    R(x + 3, wy0 + 18, 8, 1, c);
  });
  const dx = px(4) + 4, dy = wy0 + 12;                // cible
  R(dx - 5, dy - 5, 11, 11, '#1b1a19'); R(dx - 4, dy - 4, 9, 9, '#e9e2d4'); R(dx - 3, dy - 3, 7, 7, '#d64545'); R(dx - 2, dy - 2, 5, 5, '#e9e2d4'); R(dx - 1, dy - 1, 3, 3, '#3f7a4a'); R(dx, dy, 1, 1, '#d64545');
});
deco(-7, 17, py(18), t => {                          // flipper
  const x0 = px(-7) + 2, top = py(17) - 18, on = near([-7, 18]);
  R(x0, py(18), 13, 2, SHADOW); panel(x0, top, 12, 10, '#2a1e38'); R(x0 + 1, top + 1, 10, 8, on ? ['#ff5fc8', '#5fe8ff', '#ffd166'][Math.floor(t * 4) % 3] : '#4a3a60');
  panel(x0 - 1, top + 10, 14, py(18) - top - 10, '#5a3f7a'); R(x0 + 2, top + 13, 8, 5, '#1b1622');
  if (on) R(x0 + 3 + Math.round((Math.sin(t * 5) * 0.5 + 0.5) * 6), top + 14 + Math.round((Math.cos(t * 4) * 0.5 + 0.5) * 3), 1, 1, '#ffffff');
});
deco(-5, 17, py(18), t => {                          // juke-box
  const x0 = px(-5) + 2, top = py(17) - 20, on = near([-5, 18]);
  R(x0, py(18), 13, 2, SHADOW); panel(x0, top + 4, 12, py(18) - top - 6, '#8a3a2a');
  R(x0 + 1, top, 10, 6, '#c9952f'); R(x0 + 2, top + 1, 8, 4, on ? ['#ff5fc8', '#ffd166', '#5fe8ff'][Math.floor(t * 3) % 3] : '#6e4c38');
  R(x0 + 2, top + 8, 8, 6, '#2a1e18'); for (let i = 0; i < 4; i++) R(x0 + 3, top + 9 + i, 6, 1, ['#ffd166', '#ff8fb0', '#9cc6e6', '#ffd166'][i]);
  R(x0 + 3, top + 16, 6, 4, '#c9952f');
  if (on) for (let i = 0; i < 2; i++) { const p = (t * 0.6 + i / 2) % 1; g.globalAlpha = 1 - p; icon('note', x0 + 3 + i * 5, top - 4 - Math.round(p * 12), i ? '#ff8fb0' : '#ffd166'); g.globalAlpha = 1; }
});
deco(4, 24, py(25), t => {                           // machine à pinces remplie de peluches
  const x0 = px(4) + 1, top = py(24) - 18, on = near([3, 24]);
  R(x0, py(25), 15, 2, SHADOW); panel(x0, top, 14, 18, '#d64fa0'); R(x0 + 2, top + 2, 10, 10, 'rgba(200,230,255,.55)');
  R(x0 + 3, top + 9, 2, 2, '#f6d33c'); R(x0 + 6, top + 10, 2, 2, '#f6a5c0'); R(x0 + 9, top + 9, 2, 2, '#7ccfb0'); R(x0 + 5, top + 8, 2, 2, '#e3350d');
  const cx = x0 + 4 + Math.round((Math.sin(t * (on ? 1.5 : 0.3)) * 0.5 + 0.5) * 5);
  R(cx, top + 2, 1, on ? 3 + Math.round((Math.sin(t * 2) * 0.5 + 0.5) * 3) : 3, '#c9c4bc'); R(cx - 1, top + (on ? 6 : 5), 3, 1, '#c9c4bc');
  panel(x0, top + 18, 14, py(25) - top - 20, '#b03a85'); R(x0 + 9, top + 20, 2, 2, '#ffd166');
});
deco(1, 25, py(26), () => {                          // mange-debout + canettes
  const cx = px(1) + 8, by = py(25) + 14;
  R(cx - 7, by, 14, 2, SHADOW); R(cx - 1, by - 10, 2, 10, '#3a3835'); panel(cx - 7, by - 13, 14, 4, '#3fc6d6');
  R(cx - 4, by - 17, 2, 4, '#e3350d'); R(cx + 2, by - 16, 2, 3, '#ffd166');
});
[[0, 25], [2, 25]].forEach(c => deco(c[0], c[1], py(c[1] + 1) - 1, () => {   // tabourets
  const cx = px(c[0]) + 8, by = py(c[1]) + 14;
  R(cx - 4, by, 8, 1, SHADOW); R(cx, by - 8, 1, 8, '#3a3835'); panel(cx - 3, by - 10, 7, 2, '#d64fa0');
}, false));
SPOTS.push(
  { cell: [-7, 18], face: 'up', label: 'Joue au flipper', w: 9, act: 'flipper' },
  { cell: [-5, 18], face: 'up', label: 'Choisit un morceau au juke-box', w: 8, act: 'jukebox' },
  { cell: [3, 24], face: 'right', label: 'Tente la machine à pinces', w: 8, act: 'claw' },
  { cell: [4, 19], face: 'up', label: 'Joue aux fléchettes', w: 8, act: 'darts' }
);
HOOKS.post.push(t => {                               // fléchettes qui volent
  if (!near([4, 19])) return;
  const p = (t * 0.7) % 1, x = px(4) + 4, y0 = py(19) + 2, y1 = py(LOW.top) + 17;
  if (p < 0.4) R(x - 1, Math.round(y0 + (y1 - y0) * (p / 0.4)), 2, 3, '#e8e2d4');
});

/* --- salle de tests --- */
paintExtra(() => {
  const wy0 = py(LOW.top) + 5;                        // graphique de réussite au mur
  R(px(6) + 3, wy0 + 4, 34, 22, '#2f4a3c'); R(px(6) + 4, wy0 + 5, 32, 20, '#e8f3ec');
  const pts = [14, 12, 13, 9, 10, 6, 7, 4, 5, 3];
  pts.forEach((h, i) => { R(px(6) + 6 + i * 3, wy0 + 5 + h, 2, 20 - h - 1, i === pts.length - 1 ? '#3fd17f' : '#9fc7b0'); });
  pixText('98', px(6) + 22, wy0 + 8, '#2f7a52');
});
deco(15, 19, py(20), t => {                          // tour CI à voyants empilés
  const cx = px(15) + 10, by = py(19) + 14;
  const testers = ZONE_SEATS.tests.map(zoneAgent).filter(Boolean), bad = testers.some(errRecent);
  R(cx - 4, by, 8, 2, SHADOW); R(cx - 1, by - 22, 2, 22, '#8a8f96'); panel(cx - 3, by - 3, 6, 3, '#55606d');
  [['#ff4b3e', bad], [AMBER, testers.length && !bad && Math.floor(t * 2) % 2], ['#3fd17f', testers.length && !bad]].forEach(([c, on], i) => panel(cx - 2, by - 30 + i * 5, 4, 4, on ? c : shade(c, -0.6)));
});
deco(14, 25, py(26), t => {                          // bras robotique qui manipule une éprouvette
  const bx = px(14) + 8, by = py(25) + 13, a = Math.sin(t * 1.3) * 0.6;
  R(bx - 6, by, 12, 2, SHADOW); panel(bx - 5, by - 4, 10, 4, '#e9e4da');
  const ex = bx + Math.round(Math.cos(-1.2 + a) * 8), ey = by - 4 + Math.round(Math.sin(-1.2 + a) * 8);
  for (let i = 0; i <= 8; i++) R(Math.round(bx + (ex - bx) * i / 8), Math.round(by - 4 + (ey - by + 4) * i / 8), 2, 2, AMBER);
  const hx = ex + Math.round(Math.cos(-0.4 - a) * 7), hy = ey + Math.round(Math.sin(-0.4 - a) * 7);
  for (let i = 0; i <= 6; i++) R(Math.round(ex + (hx - ex) * i / 6), Math.round(ey + (hy - ey) * i / 6), 2, 2, AMBER);
  R(hx - 1, hy - 1, 3, 3, '#3a3835'); R(hx, hy + 2, 2, 4, 'rgba(220,235,240,.9)'); R(hx, hy + 4, 2, 2, '#ff9ad5');
});
[25, 26].forEach(y => deco(6, y, py(y + 1), () => {   // casiers
  const x0 = px(6) + 1, top = py(y) - 12;
  panel(x0, top, 14, py(y + 1) - top - 2, '#9fc7b0'); R(x0 + 6, top, 1, py(y + 1) - top - 2, '#87b29a'); R(x0 + 4, top + 8, 1, 2, '#2f4a3c'); R(x0 + 9, top + 8, 1, 2, '#2f4a3c');
}));
deco(8, 26, py(27), t => {                           // bocal à bugs
  const cx = px(8) + 8, by = py(26) + 13;
  R(cx - 6, by, 12, 2, SHADOW); panel(cx - 5, by - 12, 10, 12, 'rgba(220,240,230,.6)', '#7a8a90'); R(cx - 5, by - 13, 10, 2, '#c9952f');
  for (let i = 0; i < 3; i++) R(cx - 3 + ((Math.floor(t * 2) + i * 3) % 6), by - 10 + ((i * 4 + Math.floor(t)) % 8), 1, 1, '#1b1a19');
  pixText('BUG', cx - 5, by + 3, '#2f4a3c');
});
[[16, 27], [10, 27]].forEach(([x, y]) => deco(x, y, py(y) + 14, () => pot(px(x) + 8, py(y) + 14)));

/* --- salle serveur --- */
paintExtra(() => {
  const wy0 = py(LOW.top) + 5;                        // panneau de brassage
  R(px(18) + 4, wy0 + 6, 28, 14, '#1b1f24');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) R(px(18) + 6 + c * 3, wy0 + 8 + r * 4, 2, 2, ['#6aa9ff', '#ffd166', '#5fe39a', '#ff8fb0'][(r + c) % 4]);
  for (let i = 0; i < 10; i++) R(px(18) + 6 + i * 2, wy0 + 20, 1, 6 + (i % 3) * 2, ['#6aa9ff', '#ffd166', '#5fe39a'][i % 3]);
  // câbles au sol entre les baies
  [[py(23) + 8, '#4f6a9a'], [py(23) + 11, '#d6a23a']].forEach(([y, c]) => { for (let x = px(19); x < px(26); x += 1) R(x, y + Math.round(Math.sin(x / 7) * 1.5), 1, 1, c); });
});
[[18, 26], [18, 27]].forEach(([x, y]) => deco(x, y, py(y + 1), t => {   // onduleurs
  const x0 = px(x) + 2, top = py(y) - 10;
  panel(x0, top, 12, py(y + 1) - top - 2, '#2a2f36'); R(x0 + 2, top + 3, 8, 3, '#0f1412');
  R(x0 + 3, top + 4, 1 + Math.floor((Math.sin(t) * 0.5 + 0.5) * 6), 1, '#5fe39a'); R(x0 + 9, top + 9, 1, 1, Math.floor(t * 2) % 2 ? '#5fe39a' : '#2a4a3a');
}));
deco(26, 19, py(20), () => {                         // extincteur
  const cx = px(26) + 10, by = py(19) + 14;
  R(cx - 3, by, 6, 1, SHADOW); panel(cx - 2, by - 11, 5, 11, '#d64545'); R(cx - 1, by - 13, 3, 2, '#1b1a19'); R(cx + 2, by - 12, 3, 1, '#1b1a19');
});
deco(26, 27, py(27) + 14, t => {                      // cartons de matériel + la petite Raspberry Pi
  const x0 = px(26) + 1, by = py(27) + 14;
  panel(x0, by - 9, 13, 9, '#c9a46a'); R(x0, by - 9, 13, 2, '#b08a52'); panel(x0 + 2, by - 16, 9, 7, '#d9b27a');
  panel(x0 + 3, by - 19, 7, 3, '#3f7a4a'); R(x0 + 4, by - 18, 2, 1, Math.floor(t * 3) % 2 ? '#ff4b3e' : '#7a1f18'); R(x0 + 7, by - 18, 1, 1, '#5fe39a');
});

/* --- bibliothèque --- */
deco(29, 25, py(26), t => {                          // globe terrestre
  const cx = px(29) + 8, by = py(25) + 14, sp = Math.floor(t * 2) % 4;
  R(cx - 4, by, 8, 2, SHADOW); R(cx - 3, by - 2, 6, 2, '#6e4632'); R(cx, by - 5, 1, 3, '#c9952f');
  panel(cx - 4, by - 13, 8, 8, '#5a8fc0'); R(cx - 3 + sp, by - 11, 2, 3, '#6fa86c'); R(cx - 2 + ((sp + 2) % 4), by - 8, 2, 2, '#6fa86c');
});
deco(40, 25, py(26), () => {                         // chariot de livres
  const x0 = px(40) + 1, by = py(25) + 14;
  R(x0, by, 14, 2, SHADOW); panel(x0, by - 12, 14, 9, '#8a5a40'); R(x0 + 1, by - 11, 12, 1, '#a0704e');
  for (let i = 0; i < 6; i++) R(x0 + 1 + i * 2, by - 17 + (i % 2), 2, 6 - (i % 2), [CLAY, BLUE, GREEN, AMBER, '#8c6c9e', CREAM][i]);
  R(x0 + 1, by - 2, 2, 2, '#3a3835'); R(x0 + 11, by - 2, 2, 2, '#3a3835');
});
[32.5, 35.5, 38.5].forEach(x => furniture.push({ k: py(22) - 1, draw(t) {   // guéridons avec théière
  const cx = px(x) + 8, by = py(21) + 13;
  R(cx - 4, by, 8, 1, SHADOW); R(cx, by - 7, 1, 7, '#6e4632'); panel(cx - 4, by - 9, 9, 2, '#8a5a40');
  panel(cx - 2, by - 13, 5, 4, '#f3e7d0'); R(cx + 3, by - 12, 1, 2, '#f3e7d0');
  const p = (t * 0.6 + x) % 1; g.globalAlpha = 0.7 - p * 0.7; R(cx, by - 15 - Math.round(p * 6), 1, 1, '#ffffff'); g.globalAlpha = 1;
} }));
deco(38, 26, py(27), () => {                         // piles de livres par terre
  const x0 = px(38) + 2, by = py(26) + 14;
  [[0, 0, CLAY], [1, 3, BLUE], [0, 6, GREEN], [2, 9, AMBER]].forEach(([dx, dy, c]) => panel(x0 + dx, by - 3 - dy, 10, 3, c));
  [[13, 0, '#8c6c9e'], [12, 3, CREAM]].forEach(([dx, dy, c]) => panel(x0 + dx - 1, by - 3 - dy, 8, 3, c));
});
[[28, 27], [41, 27], [28, 19]].forEach(([x, y], i) => deco(x, y, py(y) + 14, () => pot(px(x) + 8, py(y) + 14, i === 2)));

/* --- terrasse --- */
paintExtra(() => {                                   // tapis d'extérieur sous les transats
  R(px(33) + 6, py(5) + 2, px(38) - px(33) - 8, py(8) - py(5) - 2, '#3f7a6a');
  for (let x = px(33) + 8; x < px(38) - 4; x += 6) R(x, py(5) + 4, 3, py(8) - py(5) - 6, '#4f8a7a');
});
deco(41, 5, py(6), t => {                            // barbecue
  const cx = px(41) + 7, by = py(5) + 14, on = near([40, 5]);
  R(cx - 6, by, 12, 2, SHADOW); R(cx - 4, by - 6, 1, 6, '#3a3835'); R(cx + 3, by - 6, 1, 6, '#3a3835');
  panel(cx - 6, by - 11, 12, 5, '#2a2622'); R(cx - 5, by - 12, 10, 1, '#55524c');
  if (on) {
    R(cx - 4, by - 13, 3, 1, '#c25b3a'); R(cx + 1, by - 13, 3, 1, '#d6a23a');
    for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i / 3) % 1; g.globalAlpha = 0.6 - p * 0.6; R(cx - 2 + i * 2 + Math.round(Math.sin(p * 6 + i) * 2), by - 16 - Math.round(p * 14), 2, 2, '#d8d2c6'); g.globalAlpha = 1; }
  }
});
deco(41, 3, py(4), () => {                           // longue-vue
  const cx = px(41) + 6, by = py(3) + 14;
  R(cx - 3, by, 6, 1, SHADOW); R(cx, by - 9, 1, 9, '#5a5f66'); R(cx - 3, by - 1, 7, 1, '#5a5f66');
  panel(cx - 3, by - 13, 8, 3, '#c9952f'); R(cx + 5, by - 13, 2, 3, '#1b1a19');
});
deco(33, 9, py(9) + 10, () => {                     // banc en bois (2 cases)
  const x0 = px(33) + 2, by = py(9) + 13;
  R(x0, by, 29, 2, SHADOW); panel(x0, by - 6, 28, 3, '#a8754f'); R(x0 + 1, by - 3, 1, 3, '#6e4c38'); R(x0 + 26, by - 3, 1, 3, '#6e4c38');
  panel(x0, by - 14, 28, 2, '#a8754f'); R(x0 + 2, by - 12, 1, 6, '#6e4c38'); R(x0 + 25, by - 12, 1, 6, '#6e4c38');
});
[[33, 12], [41, 12]].forEach(([x, y]) => deco(x, y, py(y) + 14, () => {   // oliviers en pot
  const cx = px(x) + 8, by = py(y) + 14;
  panel(cx - 5, by - 8, 10, 8, '#d9cdb4'); R(cx - 5, by - 8, 10, 2, '#efe7d6'); R(cx, by - 20, 2, 12, '#7a5a3c');
  leaves(cx + 1, by - 18, [[-8, -6, 6, 5, '#7f9463'], [2, -8, 6, 6, '#8ea472'], [-4, -12, 7, 5, '#93a978'], [-2, -3, 8, 4, '#7f9463']]);
}));
SPOTS.push(
  { cell: [40, 5], face: 'right', label: 'Fait griller des saucisses', w: 4, ok: TERRACE_OK, act: 'bbq' },
  { cell: [40, 3], face: 'right', label: 'Regarde Lyon à la longue-vue', w: 4, ok: TERRACE_OK }
);
IDLE_SEATS.push(seat([34, 9], { pos: [px(33) + 16, py(9) + 11], k: py(9) + 11.5, face: 'down', legs: 'sit', w: 4, ok: TERRACE_OK, label: 'Se pose sur le banc', stand: [34, 10] }));
block(34, 9);

/* ====================================================================
   Interactions : on s'entraîne à plusieurs, on fête, on aide, on déploie
   ==================================================================== */
const EMOTES = new Map();                              // id -> { e, until }
function emote(a, e, ms) { if (a) EMOTES.set(a.id, { e, until: performance.now() + (ms || 2500) }); }
HOOKS.overlay.push(c => {
  const now = performance.now();
  EMOTES.forEach((v, id) => {
    if (v.until < now) { EMOTES.delete(id); return; }
    const a = everyone().find(x => x.id === id); if (!a || !a._anchor) return;
    const [x, y] = toCss(a._anchor.x, a._anchor.y), k = Math.min(1, (v.until - now) / 400);
    c.globalAlpha = k; c.font = '15px "Segoe UI Emoji", sans-serif'; c.textAlign = 'center';
    c.fillText(v.e, x + 11, y - 8 - (1 - k) * 6); c.textAlign = 'left'; c.globalAlpha = 1;
  });
});
const idleHere = a => !a.isOwner && !a.path.length && !a.heading && !WORK.has(a.state) && a.state !== 'asleep';
const freeIdle = (except) => [...agents.values()].filter(a => a !== except && !a.path.length && !a.heading && !WORK.has(a.state) && a.state !== 'asleep'
  && !['console', 'billard', 'babyfoot', 'arcade', 'bbq', 'bbqwait', 'dance', 'help', 'jukebox'].includes(a.act));
const occupied = cell => everyone().some(o => (!o.path.length && cellOf(o)[0] === cell[0] && cellOf(o)[1] === cell[1]) || (o.heading && o.heading.cell && o.heading.cell[0] === cell[0] && o.heading.cell[1] === cell[1]));
const closest = (list, a) => list.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
const playersOf = act => everyone().filter(a => a.act === act && !a.path.length && !a.heading);

// 1. on rejoint les copains : jeux à deux, juke-box (danse), barbecue
const DANCE_CELLS = [[-6, 18], [-4, 19], [-6, 19], [-3, 18]];
let socialTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < socialTick) return; socialTick = now + 4000;
  const join = (host, cell, spot) => { const b = closest(freeIdle(host), host); if (b) { goTo(b, cell, Object.assign({ type: 'spot', cell }, spot)); return b; } };
  ['billard', 'babyfoot', 'arcade'].forEach(act => {
    const p = playersOf(act); if (p.length !== 1 || Math.random() > 0.45) return;
    const sp = SPOTS.find(s => s.act === act && !occupied(s.cell)); if (sp) join(p[0], sp.cell, sp);
  });
  const cons = CONSOLE.map(zoneAgent).filter(Boolean);
  if (cons.length === 1 && Math.random() < 0.45) { const s = CONSOLE.find(s => !seatTaken(s)), b = s && closest(freeIdle(cons[0]), cons[0]); if (b) goTo(b, s.cell, s); }
  const dj = playersOf('jukebox')[0];
  if (dj && Math.random() < 0.5) { const cell = DANCE_CELLS.find(c => !occupied(c)); if (cell) join(dj, cell, { face: 'down', act: 'dance', label: 'Danse sur le juke-box' }); }
  const griller = playersOf('bbq')[0];
  if (griller && !playersOf('bbqwait').length && Math.random() < 0.5 && !occupied([39, 5])) join(griller, [39, 5], { face: 'right', act: 'bbqwait', label: 'Attend sa saucisse' });
  // les danseurs se dandinent de gauche à droite
});
HOOKS.update.push((dt, now, t) => { playersOf('dance').forEach(a => { a.face = Math.floor(t * 2 + a.lookHash) % 2 ? 'left' : 'right'; }); });

// 2. fins de partie et petites victoires
let resultTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < resultTick) return; resultTick = now + 11000;
  [['billard', '🏆'], ['babyfoot', '🏆'], ['arcade', '🏆']].forEach(([act, win]) => {
    const p = playersOf(act); if (p.length < 2) return;
    const w = pick(p); p.forEach(a => emote(a, a === w ? win : pick(['😤', '😅', '🙃']), 2800));
  });
  const cons = CONSOLE.map(zoneAgent).filter(Boolean);
  if (cons.length === 2) { const w = pick(cons); cons.forEach(a => emote(a, a === w ? '🏆' : 'GG', 2800)); }
  else if (cons.length === 1) emote(cons[0], pick(['🎮', '⭐', '😤']), 2200);
  playersOf('darts').forEach(a => emote(a, pick(['🎯', '🎯', '😬']), 2200));
  playersOf('flipper').forEach(a => emote(a, pick(['⭐', '⭐', '💥']), 2200));
  playersOf('claw').forEach(a => emote(a, Math.random() < 0.25 ? '🧸' : '😩', 2400));
  const g1 = playersOf('bbq')[0], g2 = playersOf('bbqwait')[0];
  if (g1 && g2) { emote(g1, '🌭', 2600); emote(g2, '😋', 2600); }
  playersOf('dance').forEach(a => emote(a, pick(['🎶', '🕺', '💃']), 2000));
});

// 3. bibliothèque : on chuchote
let hushTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < hushTick) return; hushTick = now + 6000;
  const talkers = everyone().filter(a => a.chatWith && a.x >= 28 && a.y >= 17);
  if (!talkers.length) return;
  const reader = everyone().find(a => a.mode === 'sit' && a.x >= 28 && a.y >= 17);
  if (reader) emote(reader, '🤫', 2500); talkers.forEach(a => emote(a, '😶', 1800));
});

// 4. tests qui échouent : panique, un collègue vient aider, puis on fête quand ça repasse
let helpTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < helpTick) return; helpTick = now + 3000;
  ZONE_SEATS.tests.forEach(s => {
    const a = zoneAgent(s); if (!a) return;
    const failing = errRecent(a);
    if (failing && !a._failing) { emote(a, '😱', 3000); a._failing = true; }
    if (!failing && a._failing) { emote(a, '🎉', 3500); a._failing = false; const h = everyone().find(o => o.act === 'help' && o.helpFor === a.id); if (h) emote(h, '🙌', 3000); }
    if (failing && !everyone().some(o => o.helpFor === a.id && (o.act === 'help' || (o.heading && o.heading.act === 'help'))) && Math.random() < 0.5) {
      const cell = [s.cell[0], 20], b = !occupied(cell) && closest(freeIdle(a), a);
      if (b) { goTo(b, cell, { type: 'spot', cell, face: 'up', act: 'help', label: 'Aide ' + a.name + ' à débugger' }); b.helpFor = a.id; }
    }
  });
});

// 5. déploiement : une petite fusée décolle de la console
const ROCKETS = [];
let rocketTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < rocketTick) return; rocketTick = now + 1000;
  ZONE_SEATS.server.forEach(s => {
    const a = zoneAgent(s); if (!a) return;
    const deploying = /\b(git push|deploy|déploie|release|publish)\b/i.test(a.bubble || '');
    if (deploying && a._lastRocket !== a.bubble) { a._lastRocket = a.bubble; ROCKETS.push({ x: px(s.cell[0]) + 8, y: py(17) - 18, t0: now }); news('🚀', a.name + ' déploie !'); emote(a, '🚀', 2500); }
    if (!deploying) a._lastRocket = null;
  });
});
HOOKS.post.push(() => {
  const now = performance.now();
  for (let i = ROCKETS.length - 1; i >= 0; i--) {
    const r = ROCKETS[i], p = (now - r.t0) / 2200;
    if (p > 1) { ROCKETS.splice(i, 1); continue; }
    const y = r.y - Math.round(p * p * 70);
    R(r.x - 1, y, 3, 6, '#e9e4da'); R(r.x, y - 2, 1, 2, '#d64545'); R(r.x - 2, y + 4, 1, 2, '#d64545'); R(r.x + 2, y + 4, 1, 2, '#d64545');
    R(r.x - 1, y + 6, 3, 2 + Math.floor(now / 60) % 2, AMBER); R(r.x, y + 8, 1, 2, '#ff6b3e');
    g.globalAlpha = 0.5 * (1 - p); R(r.x - 2, y + 10, 5, 3, '#d8d2c6'); g.globalAlpha = 1;
  }
});

// 6. Eric vient voir sur place quand ça chauffe
let ericPatrol = 0;
HOOKS.update.push((dt, now) => {
  if (!owner || now < ericPatrol || !(owner.seat && owner.seat.ceo)) return;
  const testsBad = ZONE_SEATS.tests.some(s => errRecent(zoneAgent(s))), serverBad = ZONE_SEATS.server.some(s => errRecent(zoneAgent(s)));
  if (!testsBad && !serverBad) return;
  ericPatrol = now + 180000;
  const cell = testsBad ? [11, 20] : [21, 19];
  owner.state = 'idle';
  goTo(owner, cell, { type: 'spot', cell, face: 'up', label: testsBad ? 'Vient voir les tests qui plantent' : 'Vient voir l\'alarme du serveur' });
  news('👀', OWNER + ' descend voir ' + (testsBad ? 'les tests' : 'la salle serveur'));
});

// 7. les chats sautent sur le billard
const BILLIARD_CAT = { cell: [-5, 20], z: 12, x: -4.5, y: 21.0, k: py(22) - 0.5, mode: 'sit', stay: 9000, w: 3, label: 'Joue avec les boules de billard' };
CAT_SPOTS.push(BILLIARD_CAT);
const catOnBilliard = () => cats.some(c => c.spot === BILLIARD_CAT && !c.path.length);

/* ---------- sous-agents (stagiaires) : badge sur le torse, et départ par la porte quand ils ont fini ---------- */
HOOKS.update.push(() => {
  agents.forEach(a => {
    if (!a.leaving) return;
    if (!a._leaving) {
      a._leaving = true; a.zoneSeat = null;
      if (typeof emote === 'function') emote(a, '👋', 2500);
      goTo(a, DOOR, { type: 'spot', cell: DOOR, face: 'up', label: 'A fini sa mission, s\'en va' });
      if (typeof pushNews === 'function') pushNews('✅', a.name + ' a fini sa mission');
    } else if (!a.path.length && !a.heading) {
      removeAgent(a);
      if (typeof sessions !== 'undefined' && sessions.get(a.id)) sessions.get(a.id).done = true;
    }
  });
});
HOOKS.post.push(() => {
  agents.forEach(a => {
    if (!a.isSub || !a._anchor) return;
    const x = a._anchor.x, y = a._anchor.y + (a.id === selectedId ? 6 : 1);
    R(x - 1, y + 12, 1, 3, CLAY); R(x + 1, y + 12, 1, 3, CLAY); panel(x - 2, y + 15, 4, 3, CREAM, OUT); R(x - 1, y + 16, 2, 1, BLUE);
  });
});

/* ---------- d'autres raisons de descendre en pause ---------- */
SPOTS.push(
  { cell: [11, 22], face: 'down', label: 'Observe les fioles du labo', w: 5 },
  { cell: [16, 22], face: 'left', label: 'Regarde le bras robotique', w: 4 },
  { cell: [22, 20], face: 'up', label: 'Écoute ronronner les serveurs', w: 5 },
  { cell: [33, 18], face: 'up', label: 'Range des livres', w: 5 },
  { cell: [38, 18], face: 'up', label: 'Choisit un livre', w: 5 },
  { cell: [34, 25], face: 'up', label: 'Feuillette un livre à la grande table', w: 5, act: 'book' }
);

/* ---------- lumières des nouvelles salles (utilisé par features.js la nuit) ---------- */
function roomLights(t, add) {
  const busy = (x0, x1) => everyone().some(a => a.x >= x0 && a.x < x1 && a.y >= 17);
  [[-2, 'games', '#c9a0ff'], [11, 'tests', '#e8fff2'], [22, 'server', '#9fd0ff'], [35, 'library', '#ffd9a8']].forEach(([cx, k, c]) => {
    const r = ROOMS[k], on = busy(r.x0, r.x1);
    add(px(cx), py(20), 70, on ? 0.6 : 0.4, c); add(px(cx), py(25), 70, on ? 0.55 : 0.38, c);
  });
  add(px(-7) + 24, py(LOW.top) + 12, 30, 0.7, '#ff5fc8');                              // néon "GAME ON"
  if (CONSOLE.some(s => zoneAgent(s))) add(px(-1), py(LOW.top) + 20, 34, 0.8, BLUE);
  RACKS.forEach((r, i) => { if (i % 3 === 0) add(px(r.x) + 8, py(r.y) - 10, 16, 0.5, '#4fe08a'); });
  ZONE_SEATS.library.forEach((s, i) => { if (i % 2 === 0) add(px(s.cell[0]) + 21, py(s.cell[1]) - 10, 24, 0.75, '#ffe9b0'); });
  add(px(33) + 14, py(24), 22, 0.7, '#cfe8b0'); add(px(33) + 48, py(24), 22, 0.7, '#cfe8b0');
  for (let i = 0; i < 12; i += 2) add(px(32) + 5 + i * 13, py(3) + 3, 16, 0.6, '#ffd88a');   // guirlande
  add(px(37), py(6), 60, 0.35, '#ffe2b0'); add(px(38), py(11), 60, 0.35, '#ffe2b0');
}

/* ---------- chats : nouveaux coins favoris ---------- */
CAT_SPOTS.push(
  { cell: [22, 23], sleep: true, w: 5, label: 'Se réchauffe près des serveurs' },
  { cell: [35, 23], sleep: true, w: 3 },
  { cell: [37, 8], sleep: true, w: 3, ok: TERRACE_OK }
);
