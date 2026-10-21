'use strict';
/* ====================================================================
   Agent Office : le monde en pixel art, vue de dessus (3/4, style RPG).
   Deux pièces : l'open space (colonnes 0-21) et la salle de pause (23-31),
   séparées par un mur avec une porte. Tout est dessiné pixel par pixel
   dans un petit buffer, puis agrandi d'un facteur entier.
   ==================================================================== */
// colonnes -8..-2 : bureau du CEO · -1 : mur · 0..21 : open space · 22 : mur · 23..31 : salle de pause
// rangée du haut (lignes 0-13) : CEO · open space · pause · terrasse (33-41)
// rangée du bas (lignes 14-27, voir rooms.js) : salle de jeux · tests · serveur · bibliothèque
const T = 16, XMIN = -8, XMAX = 42, ROWS = 28, OXp = 4, OYp = 4;
const COLS = XMAX - XMIN;
const W = OXp * 2 + COLS * T, H = OYp + ROWS * T + 6;
const px = tx => OXp + Math.round((tx - XMIN) * T), py = ty => OYp + Math.round(ty * T);
const TVRECT = { x: px(25) + 1, y: OYp + 6, w: 30, h: 17 };   // écran de la télé murale (pixels du monde)
const OWNER =(() => { try { return JSON.parse(localStorage.getItem('eo-settings') || '{}').owner; } catch { return null; } })() || 'Eric';

const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bufCtx = buf.getContext('2d');
let g = bufCtx;
const cv = document.getElementById('c'), dctx = cv.getContext('2d');
let dpr = 1, u = 3;                       // u = pixels CSS par pixel du monde

// points d'accroche pour features.js et ui.js
const HOOKS = { update: [], floor: [], items: [], post: [], light: [], overlay: [], pet: [] };

/* ---------- vue : la toile remplit la zone, zoom molette + glisser ---------- */
const VIEW = { z: 1, cx: W / 2, cy: H / 2 };
let S = 1, OXc = 0, OYc = 0, CW = 100, CH = 100;   // échelle (px CSS / px monde) et décalage CSS
function resize() {
  const st = cv.parentElement; dpr = window.devicePixelRatio || 1;
  CW = Math.max(100, st.clientWidth - 24); CH = Math.max(100, st.clientHeight - 24);
  cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
  cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
}
function layoutView() {
  let s = Math.min(CW / W, CH / H) * VIEW.z;
  if (s * dpr >= 2) s = Math.floor(s * dpr) / dpr;              // facteur entier : pixels parfaits
  S = u = s;
  const ww = W * s, hh = H * s;
  OXc = ww <= CW ? (CW - ww) / 2 : Math.min(0, Math.max(CW - ww, CW / 2 - VIEW.cx * s));
  OYc = hh <= CH ? (CH - hh) / 2 : Math.min(0, Math.max(CH - hh, CH / 2 - VIEW.cy * s));
}
function clampView() { VIEW.cx = Math.max(0, Math.min(W, VIEW.cx)); VIEW.cy = Math.max(0, Math.min(H, VIEW.cy)); }
// cadre une zone du monde (coordonnées en cases)
function focusTiles(tx0, tx1, ty0, ty1) {
  ty0 = ty0 == null ? 0 : ty0; ty1 = ty1 == null ? ROWS : ty1;
  const x0 = px(tx0), x1 = px(tx1), y0 = py(ty0), y1 = py(ty1), fit = Math.min(CW / W, CH / H);
  VIEW.z = Math.max(1, Math.min(5, Math.min(CW / (x1 - x0), CH / (y1 - y0)) / fit));
  VIEW.cx = (x0 + x1) / 2; VIEW.cy = (y0 + y1) / 2;
}
const toCss = (x, y) => [OXc + x * S, OYc + y * S];
const toWorld = (x, y) => [(x - OXc) / S, (y - OYc) / S];
new ResizeObserver(resize).observe(cv.parentElement);

const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const CLAY = '#d97757', CLAY2 = '#c6613f', CLAY3 = '#a84e30', CREAM = '#faf9f5', INK = '#2a2927';
const BLUE = '#6a9bcc', GREEN = '#788c5d', AMBER = '#e8b04a', VIOLET = '#a990d6', RED = '#e04a3b';
const OUT = '#2b2420', FOUT = '#4f3a2c';  // contours : persos / meubles
const SHADOW = 'rgba(60,40,20,.18)';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * (1 + f))));
  return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, f) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join('');
}
function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function panel(x, y, w, h, c, o) { R(x - 1, y - 1, w + 2, h + 2, o || FOUT); R(x, y, w, h, c); }
function spark(cx, cy, L, c) {          // l'étincelle Claude
  R(cx, cy - L, 1, 2 * L + 1, c); R(cx - L, cy, 2 * L + 1, 1, c);
  const d = Math.max(1, Math.round(L * 0.7));
  for (let i = 1; i <= d; i++) { R(cx + i, cy + i, 1, 1, c); R(cx - i, cy - i, 1, 1, c); R(cx + i, cy - i, 1, 1, c); R(cx - i, cy + i, 1, 1, c); }
  if (L >= 3) R(cx - 1, cy - 1, 3, 3, c);
}
function leaves(cx, by, list) { list.forEach(([x, y, w, h, c]) => panel(cx + x, by + y, w, h, c, '#3d4a2c')); }
const ICON = {
  note: ['..XX.', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..', '.X...'],
  q: ['.XX.', 'X..X', '...X', '..X.', '.X..', '....', '.X..'],
  vein: ['.X.X.', 'XX.XX', '.....', 'XX.XX', '.X.X.'],
  drop: ['.X.', 'XWX', 'XXX', '.X.'],
  bang: ['XX', 'XX', 'XX', '..', 'XX'],
  heart: ['.X.X.', 'XXXXX', 'XXWXX', '.XXX.', '..X..']
};
const FONT3 = {   // mini police pixel 3x5
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'], C: ['XXX', 'X..', 'X..', 'X..', 'XXX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'], E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'], F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  G: ['XXX', 'X..', 'X.X', 'X.X', 'XXX'], H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'], I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..X', '..X', '..X', 'X.X', 'XXX'], K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'], L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'], N: ['XXX', 'X.X', 'X.X', 'X.X', 'X.X'], O: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'], Q: ['XXX', 'X.X', 'X.X', 'XXX', '..X'], R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['XXX', 'X..', 'XXX', '..X', 'XXX'], T: ['XXX', '.X.', '.X.', '.X.', '.X.'], U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'], W: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'], X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'], Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], 1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'], 2: ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  3: ['XXX', '..X', 'XXX', '..X', 'XXX'], 4: ['X.X', 'X.X', 'XXX', '..X', '..X'], 5: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  6: ['XXX', 'X..', 'XXX', 'X.X', 'XXX'], 7: ['XXX', '..X', '..X', '.X.', '.X.'], 8: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  9: ['XXX', 'X.X', 'XXX', '..X', 'XXX'], ':': ['...', '.X.', '...', '.X.', '...'], '°': ['XX.', 'XX.', '...', '...', '...'],
  '-': ['...', '...', 'XXX', '...', '...'], ' ': ['...', '...', '...', '...', '...']
};
function pixText(str, x, y, c, s) {
  s = s || 1;
  [...String(str).toUpperCase()].forEach((ch, i) => (FONT3[ch] || FONT3[' ']).forEach((row, r) => {
    for (let k = 0; k < 3; k++) if (row[k] === 'X') R(x + (i * 4 + k) * s, y + r * s, s, s, c);
  }));
  return String(str).length * 4 * s - s;
}
function icon(name, x, y, c) {
  ICON[name].forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') R(x + i, y + r, 1, 1, row[i] === 'W' ? '#ffffff' : c); });
}

/* ---------- plan des pièces (cases 16 px ; mur du fond = lignes 0 à 2) ---------- */
const DESKS = [];
[6, 10].forEach(dy => [2, 6, 10, 14, 18].forEach(dx => DESKS.push({ i: DESKS.length, dx, dy, agent: null })));
const SOFA = { x: 25, y: 10, n: 4 };
const DOOR = [1, 3];
const SPOTS = [
  { cell: [4, 4], face: 'up', label: 'Regarde la météo', w: 4 },
  { cell: [10, 4], face: 'up', label: 'Regarde par la fenêtre', w: 4 },
  { cell: [18, 4], face: 'up', label: 'Regarde par la fenêtre', w: 3 },
  { cell: [13, 4], face: 'up', label: 'Choisit un livre', w: 4 },
  { cell: [21, 4], face: 'up', label: 'Imprime un truc', w: 2 },
  { cell: [1, 11], face: 'left', label: 'Boit un verre d\'eau', w: 4 },
  { cell: [25, 4], face: 'up', label: 'Prend un café', w: 12 },
  { cell: [28, 4], face: 'up', label: 'Fouille le frigo', w: 4 },
  { cell: [30, 4], face: 'up', label: 'Choisit un snack', w: 5 },
  { cell: [3, 18], face: 'up', label: 'Joue à l\'arcade', w: 7, act: 'arcade' },          // salle de jeux
  { cell: [4, 18], face: 'up', label: 'Joue à l\'arcade', w: 6, act: 'arcade' }
];
const IDLE_SEATS = [];   // sièges de pause des autres salles (rooms.js) : { type:'seat', cell, pos, k, face, legs, w, ok? }
const ACT_LABEL = { guitar: 'Joue de la guitare', book: 'Lit un bouquin', phone: 'Scrolle sur son tel', piano: 'Joue du piano', sleep: 'Fait la sieste', tv: 'Regarde la télé' };
const BLOCKED = new Set();
const block = (x, y) => BLOCKED.add(x + ',' + y);
for (let y = 0; y < 3; y++) for (let x = XMIN; x < XMAX; x++) block(x, y);
for (let y = 3; y < 14; y++) if (y !== 7 && y !== 8) { block(22, y); block(-1, y); }   // murs de séparation, portes en 7-8
// bureau du CEO
const CEO_SEAT = { type: 'desk', dx: -5.5, dy: 7, ceo: true };
[[-6, 7], [-5, 7], [-4, 7], [-5, 6], [-3, 3], [-2, 3], [-8, 3], [-8, 11], [-7, 11], [-6, 10], [-4, 10], [-2, 9]].forEach(c => block(...c));
DESKS.forEach(d => { block(d.dx, d.dy); block(d.dx + 1, d.dy); block(d.dx, d.dy - 1); block(d.dx + 1, d.dy - 1); });
for (let x = 23; x < 29; x++) block(x, 3);                                 // comptoir + frigo
for (let i = 0; i < SOFA.n; i++) block(SOFA.x + i, SOFA.y);
[[13, 3], [14, 3], [15, 3], [21, 3], [0, 11], [0, 13], [21, 13],
 [30, 3], [31, 3], [31, 9], [31, 10], [30, 9], [30, 10], [3, 17], [4, 17], [29, 10], [30, 11], [26, 12], [27, 12], [26, 13], [27, 13], [23, 13], [31, 13]]
  .forEach(c => block(...c));

/* ---------- fond statique ---------- */
const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
function planks(x0, x1, y0, y1, P, seam) {
  for (let y = y0, r = 0; y < y1; y += 4, r++) {
    let x = x0 - ((r * 7) % 5) * 6, i = 0;
    while (x < x1) {
      const len = 22 + ((r * 13 + i * 7) % 4) * 6, a = Math.max(x0, x), b = Math.min(x1, x + len);
      R(a, y, b - a, 4, P[(r * 3 + i * 2) % P.length]);
      R(a, y + 3, b - a, 1, 'rgba(120,80,40,.10)');
      if (x > x0) R(x, y, 1, 4, seam);
      x += len; i++;
    }
  }
}
const WINDOWS = [];                       // vitres : le ciel est redessiné à chaque frame
function drawWindow(fx0, fx1) {
  const WY0 = OYp, fy0 = WY0 + 7, fy1 = py(2) + 4;
  WINDOWS.push([fx0, fx1]);
  R(fx0 - 2, fy0 - 2, fx1 - fx0 + 4, fy1 - fy0 + 4, '#8a6a52');
  R(fx0 - 4, fy1 + 2, fx1 - fx0 + 8, 3, '#f6efe2'); R(fx0 - 4, fy1 + 5, fx1 - fx0 + 8, 1, '#cbbfa8');
  R(fx0 - 11, fy0 - 5, fx1 - fx0 + 22, 2, '#6e4c38');
  [fx0 - 10, fx1 + 3].forEach(x => { R(x, fy0 - 3, 7, fy1 - fy0 + 10, CLAY); R(x + 2, fy0 - 3, 1, fy1 - fy0 + 10, CLAY2); R(x + 5, fy0 - 3, 1, fy1 - fy0 + 10, CLAY2); });
}
function paintBackground() {
  g = bg.getContext('2d');
  R(0, 0, W, H, '#3e3129');
  const F0 = py(3), F1 = py(14), WY0 = OYp, WY1 = py(3);
  // sols : parquet open space / parquet clair + carrelage en salle de pause
  planks(px(XMIN), px(0), F0, F1, ['#9a6e4f', '#8f6547', '#a3765a', '#94694b'], '#7a5640');
  planks(px(0), px(22), F0, F1, ['#e2c59c', '#dcbd93', '#e7cba4', '#d8b88d', '#e0c298'], '#c4a57c');
  // tapis du CEO
  const cx0 = px(-7.5), cx1 = px(-1.5), cy0 = py(5) + 4, cy1 = py(11) - 2;
  R(cx0, cy0, cx1 - cx0, cy1 - cy0, '#8e3f2a'); R(cx0 + 2, cy0 + 2, cx1 - cx0 - 4, cy1 - cy0 - 4, AMBER);
  R(cx0 + 3, cy0 + 3, cx1 - cx0 - 6, cy1 - cy0 - 6, '#a84e30'); R(cx0 + 6, cy0 + 6, cx1 - cx0 - 12, cy1 - cy0 - 12, '#b8583a');
  spark(px(-4.5), cy1 - 14, 6, '#c86a4c');
  planks(px(22), px(32), F0, F1, ['#efd9b6', '#e9d2ad', '#f2dfbf', '#e6cda6'], '#d3b98f');
  for (let y = py(3); y < py(6); y += 8) for (let x = px(23); x < px(32); x += 8)
    R(x, y, 8, 8, ((x - px(23)) / 8 + (y - py(3)) / 8) % 2 ? '#efe9de' : '#e2d9ca');
  R(px(23), py(6), px(32) - px(23), 1, '#c9bca6');
  // tapis du salon avec étincelle
  const rx0 = px(24), rx1 = px(32) - 4, ry0 = py(9) + 2, ry1 = py(14) - 4;
  R(rx0, ry0, rx1 - rx0, ry1 - ry0, '#b85f43'); R(rx0 + 1, ry0 + 1, rx1 - rx0 - 2, ry1 - ry0 - 2, CLAY);
  R(rx0 + 4, ry0 + 4, rx1 - rx0 - 8, ry1 - ry0 - 8, '#eaa386'); R(rx0 + 5, ry0 + 5, rx1 - rx0 - 10, ry1 - ry0 - 10, CLAY);
  for (let y = ry0 + 2; y < ry1 - 2; y += 3) { R(rx0 - 2, y, 2, 1, '#f0d9c8'); R(rx1, y, 2, 1, '#f0d9c8'); }
  spark(px(27), ry1 - 11, 5, '#f3b49a');
  // tapis d'entrée
  R(px(0.5) - 1, py(3) + 1, 24, 7, CLAY2); R(px(0.5) + 1, py(3) + 3, 20, 3, CLAY);
  // mur du fond : crème + soubassement terracotta (open space), sauge (salle de pause)
  const wall = (x0, x1, up, stripe, wain, wainHi, wainLine) => {
    R(x0, WY0, x1 - x0, WY1 - WY0, up);
    for (let x = x0; x < x1; x += 8) R(x, WY0, 4, WY1 - WY0 - 15, stripe);
    R(x0, WY1 - 15, x1 - x0, 1, '#fbf7ef'); R(x0, WY1 - 14, x1 - x0, 11, wain); R(x0, WY1 - 14, x1 - x0, 1, wainHi);
    for (let x = x0 + 8; x < x1; x += 16) R(x, WY1 - 12, 1, 8, wainLine);
    R(x0, WY1 - 3, x1 - x0, 3, '#8a5a44'); R(x0, WY0, x1 - x0, 2, '#e2d6c2');
  };
  wall(px(XMIN), px(-1), '#3f4a5c', '#465267', '#7a5640', '#8f6a50', '#664632');
  wall(px(-1), px(22), '#f3ece0', '#eee5d6', '#d98a6c', '#e6a084', '#c97a5e');
  wall(px(22), px(32), '#e8ecdc', '#e1e6d2', '#93a978', '#a7bc8c', '#7f9463');
  R(px(XMIN), F0, px(32) - px(XMIN), 2, 'rgba(60,40,20,.18)');
  R(px(0), F0, 2, F1 - F0, 'rgba(60,40,20,.10)');

  // --- bureau du CEO ---
  drawWindow(px(-8) + 14, px(-6) + 12);
  const label = (OWNER + ' office').toUpperCase(), lw = label.length * 4 + 7;
  const ex0 = Math.round((px(-5) + 6 + px(-1)) / 2 - lw / 2), ey0 = WY0 + 5;   // plaque "ERIC OFFICE"
  R(ex0 - 1, ey0 - 1, lw + 2, 13, '#c9952f'); R(ex0, ey0, lw, 11, '#2a2622');
  pixText(label, ex0 + 4, ey0 + 3, AMBER);
  spark(ex0 - 6, ey0 + 5, 2, AMBER); spark(ex0 + lw + 5, ey0 + 5, 2, AMBER);
  R(px(23), F0, 2, F1 - F0, 'rgba(60,40,20,.10)');
  // murs latéraux + bas
  R(0, 0, OXp, H, '#3e3129'); R(W - OXp, 0, OXp, H, '#3e3129'); R(0, 0, W, OYp, '#3e3129'); R(0, F1, W, H - F1, '#3e3129');
  R(OXp - 1, OYp, 1, F1 - OYp, '#5a4636'); R(W - OXp, OYp, 1, F1 - OYp, '#5a4636'); R(OXp, F1, W - 2 * OXp, 1, '#5a4636');

  // --- open space ---
  const dx0 = px(0.5), dt = WY1 - 38;                     // porte d'entrée
  R(dx0 - 2, dt - 2, 26, 40, '#6e4c38'); R(dx0, dt, 22, 38, '#a8754f');
  R(dx0 + 3, dt + 3, 16, 14, '#b98660'); R(dx0 + 3, dt + 20, 16, 15, '#b98660');
  R(dx0 + 3, dt + 3, 16, 1, '#c99a74'); R(dx0 + 3, dt + 20, 16, 1, '#c99a74'); R(dx0 + 17, dt + 19, 2, 2, AMBER);
  const wx0 = px(3), wx1 = px(6.5), wy0 = WY0 + 6, wy1 = py(2) + 4;   // écran mural (contenu redessiné à chaque frame)
  R(wx0 - 3, wy0 - 3, wx1 - wx0 + 6, wy1 - wy0 + 6, '#1b1a19'); R(wx0 - 2, wy0 - 2, wx1 - wx0 + 4, 1, '#3a3835');
  R(wx0 + 24, wy1 + 3, 8, 2, '#3a3835');
  drawWindow(px(9) + 4, px(12) + 12);
  drawWindow(px(16) + 4, px(19) + 12);
  const kx = px(14), ky = WY0 + 11;                                         // horloge
  R(kx - 4, ky - 6, 8, 12, OUT); R(kx - 6, ky - 4, 12, 8, OUT); R(kx - 3, ky - 5, 6, 10, CREAM); R(kx - 5, ky - 3, 10, 6, CREAM);
  // les aiguilles sont dessinées à chaque frame (drawClock), à l'heure réelle

  // --- salle de pause ---
  for (let x = px(23); x < px(25); x += 16) { panel(x + 1, WY0 + 4, 14, 16, '#f4efe6'); R(x + 1, WY0 + 4, 14, 1, '#ffffff'); R(x + 7, WY0 + 15, 2, 3, '#9b9384'); }
  R(px(23), WY0 + 21, px(25) - px(23), 1, 'rgba(60,40,20,.2)');
  // télé murale de la cafet (l'écran est dessiné à chaque frame / la vidéo est incrustée par ui.js)
  R(TVRECT.x - 3, TVRECT.y - 3, TVRECT.w + 6, TVRECT.h + 6, '#1b1a19'); R(TVRECT.x - 3, TVRECT.y - 3, TVRECT.w + 6, 1, '#3a3835');
  R(TVRECT.x + TVRECT.w / 2 - 3, TVRECT.y + TVRECT.h + 3, 6, 2, '#3a3835');
  const nx = px(29) + 8, ny = WY0 + 16;                                     // enseigne néon étincelle
  g.fillStyle = 'rgba(255,140,100,.18)'; g.fillRect(nx - 8, ny - 9, 17, 19); g.fillRect(nx - 6, ny - 11, 13, 23);
  R(nx - 7, ny - 9, 15, 19, '#3a3835'); spark(nx, ny, 5, '#ff9a78'); R(nx, ny, 1, 1, '#ffe2d6');
  g = bufCtx;
}

/* ---------- ciel : heure réelle + météo de Lyon (Open-Meteo, sans clé) ---------- */
const WX = { code: null, cloud: 25, temp: null, wind: 8, sunrise: null, sunset: null };
const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=45.764&longitude=4.8357' +
  '&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m&daily=sunrise,sunset&timezone=Europe%2FParis&forecast_days=1';
const WX_TEXT = c => c == null ? '' : c === 0 ? 'Dégagé' : c <= 2 ? 'Peu nuageux' : c === 3 ? 'Couvert' : c <= 48 ? 'Brouillard'
  : c <= 57 ? 'Bruine' : c <= 67 ? 'Pluie' : c <= 77 ? 'Neige' : c <= 82 ? 'Averses' : c <= 86 ? 'Averses de neige' : 'Orage';
async function fetchWeather() {
  try {
    const j = await (await fetch(WX_URL)).json(), c = j.current;
    Object.assign(WX, { code: c.weather_code, cloud: c.cloud_cover, temp: c.temperature_2m, wind: c.wind_speed_10m,
      sunrise: Date.parse(j.daily.sunrise[0]), sunset: Date.parse(j.daily.sunset[0]) });
    const el = document.getElementById('weather');
    if (el) { el.hidden = false; el.textContent = 'Lyon · ' + Math.round(WX.temp) + '° · ' + WX_TEXT(WX.code); }
  } catch (e) { /* hors-ligne : on garde l'heure seule */ }
}
fetchWeather(); setInterval(fetchWeather, 15 * 60000);

function skyState(nowMs) {
  const d = new Date(nowMs), base = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sr = WX.sunrise || base + 7.5 * 3600e3, ss = WX.sunset || base + 19.5 * 3600e3, tw = 40 * 60e3;
  let kind = 'night';
  if (nowMs > sr - tw && nowMs < sr + tw) kind = 'dawn';
  else if (nowMs > ss - tw && nowMs < ss + tw) kind = 'dusk';
  else if (nowMs >= sr + tw && nowMs <= ss - tw) kind = 'day';
  const c = WX.code ?? -1;
  const rain = (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95, snow = (c >= 71 && c <= 77) || c === 85 || c === 86;
  const grey = rain || snow || c === 3 || c === 45 || c === 48 || WX.cloud > 85;
  let [top, bot] = { day: ['#6fa8d8', '#c6e0f2'], dawn: ['#7a7fb8', '#f4b48a'], dusk: ['#5a5a9a', '#f29a78'], night: ['#141c34', '#2c3a5e'] }[kind];
  if (grey) { top = mix(top, kind === 'night' ? '#2a2e38' : '#9aa4ae', 0.6); bot = mix(bot, kind === 'night' ? '#3a3f4a' : '#c4cbd2', 0.6); }
  const dayF = Math.max(0, Math.min(1, (nowMs - sr) / (ss - sr)));          // avancée du soleil
  const nightF = ((nowMs - ss) / (24 * 3600e3 - (ss - sr)) + 1) % 1;       // avancée de la lune
  return { kind, top, bot, grey, rain, snow, fog: c === 45 || c === 48, storm: c >= 95, dayF, nightF,
    clouds: WX.code == null ? 3 : Math.round(WX.cloud / 100 * 7), wind: Math.max(3, WX.wind || 8) };
}
function drawSkyAndLight(t) {
  const sk = skyState(Date.now()), fy0 = OYp + 7, fy1 = py(2) + 4, h = fy1 - fy0, F0 = py(3);
  // lumière qui entre par les fenêtres
  const la = sk.kind === 'day' ? (sk.grey ? 0.1 : 0.2) : sk.kind === 'night' ? 0.05 : 0.13;
  const lc = sk.kind === 'night' ? '170,190,255' : sk.kind === 'day' ? '255,248,225' : '255,190,140';
  WINDOWS.forEach(([fx0, fx1]) => {
    for (let i = 0; i < 46; i++) {
      const xs = fx0 + Math.round(i * 0.55), xe = fx1 + Math.round(i * 0.55);
      R(xs, F0 + i, xe - xs, 1, 'rgba(' + lc + ',' + (la * (1 - i / 46)).toFixed(3) + ')');
    }
  });
  WINDOWS.forEach(([fx0, fx1]) => {
    g.save(); g.beginPath(); g.rect(fx0, fy0, fx1 - fx0, h); g.clip();
    for (let y = fy0; y < fy1; y++) R(fx0, y, fx1 - fx0, 1, mix(sk.top, sk.bot, (y - fy0) / h));
    if (sk.kind === 'night' && !sk.grey) for (let x = fx0; x < fx1; x += 2) {     // étoiles
      const hsh = hash('s' + x); if (hsh % 9) continue;
      R(x, fy0 + hsh % (h - 6), 1, 1, (Math.floor(t * 1.5) + hsh) % 5 ? '#e8ecff' : '#8a93b8');
    }
    // soleil ou lune : même position sur toutes les fenêtres, comme un vrai ciel
    const span = px(XMAX) - px(XMIN);
    if (sk.kind !== 'night') {
      const bx = px(XMIN) + Math.round(sk.dayF * span), by = fy0 + 4 + Math.round((1 - Math.sin(Math.PI * sk.dayF)) * (h - 10));
      if (!sk.grey) { g.fillStyle = 'rgba(255,230,150,.35)'; g.fillRect(bx - 6, by - 6, 13, 13); }
      R(bx - 3, by - 2, 7, 5, sk.grey ? '#e9e4d0' : '#ffd866'); R(bx - 2, by - 3, 5, 7, sk.grey ? '#e9e4d0' : '#ffd866');
    } else {
      const bx = px(XMIN) + Math.round(sk.nightF * span), by = fy0 + 4 + Math.round((1 - Math.sin(Math.PI * sk.nightF)) * (h - 10));
      R(bx - 3, by - 2, 7, 5, '#f4efdc'); R(bx - 2, by - 3, 5, 7, '#f4efdc');
      R(bx, by - 3, 4, 5, mix(sk.top, sk.bot, 0.2)); R(bx + 1, by - 2, 3, 3, mix(sk.top, sk.bot, 0.2));   // croissant
    }
    // nuages qui défilent, poussés par le vent de Lyon
    const cc = sk.kind === 'night' ? (sk.grey ? '#4a505c' : '#55607e') : sk.grey ? '#dfe3e7' : '#ffffff', cs = shade(cc, -0.1);
    for (let i = 0; i < sk.clouds + (sk.grey ? 3 : 0); i++) {
      const hh = hash('c' + i), cw = 14 + hh % 12, sp = sk.wind * (0.25 + (hh % 5) * 0.06);
      const cx = Math.round(((hh % span) + t * sp) % (span + 40)) + px(XMIN) - 20, cy = fy0 + 3 + (hh >> 4) % (h - 12);
      R(cx, cy + 2, cw, 4, cc); R(cx + 3, cy, cw - 8, 3, cc); R(cx + cw - 9, cy - 1, 5, 2, cc); R(cx + 1, cy + 5, cw - 2, 1, cs);
    }
    if (sk.rain) for (let x = fx0; x < fx1; x += 3) {
      const yy = fy0 + Math.round((hash('r' + x) % h + t * 70) % h); R(x, yy, 1, 3, 'rgba(210,225,255,.7)');
    }
    if (sk.snow) for (let x = fx0; x < fx1; x += 4) {
      const yy = fy0 + Math.round((hash('n' + x) % h + t * 12) % h); R(x + Math.round(Math.sin(t + x) * 1), yy, 1, 1, '#ffffff');
    }
    if (sk.fog) { g.fillStyle = 'rgba(225,228,230,.55)'; g.fillRect(fx0, fy0, fx1 - fx0, h); }
    if (sk.storm && (t % 7) < 0.12) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(fx0, fy0, fx1 - fx0, h); }
    g.restore();
    R(Math.round((fx0 + fx1) / 2) - 1, fy0, 2, h, '#8a6a52'); R(fx0, Math.round((fy0 + fy1) / 2), fx1 - fx0, 2, '#8a6a52');
    R(fx0, fy0, 1, h, 'rgba(255,255,255,.25)');
  });
  return sk;
}

/* ---------- écran mural : heure, date, météo de Lyon ---------- */
const JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const MOIS = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];
const WX_SHORT = c => c == null ? '' : c === 0 ? 'DEGAGE' : c <= 2 ? 'NUAGEUX' : c === 3 ? 'COUVERT' : c <= 48 ? 'BRUME'
  : c <= 57 ? 'BRUINE' : c <= 67 ? 'PLUIE' : c <= 77 ? 'NEIGE' : c <= 82 ? 'AVERSES' : c <= 86 ? 'NEIGE' : 'ORAGE';
function wxIcon(x, y, sk, t) {             // icône 11x9
  const cloud = (cx, cy, c) => { R(cx, cy + 2, 9, 3, c); R(cx + 1, cy + 1, 4, 1, c); R(cx + 4, cy, 3, 2, c); };
  if (sk.rain || sk.snow || sk.storm || sk.grey || sk.fog) {
    cloud(x + 1, y, sk.storm ? '#8a93a6' : '#c9d1da');
    if (sk.rain) for (let i = 0; i < 3; i++) R(x + 2 + i * 3, y + 6 + (Math.floor(t * 4) + i) % 2, 1, 2, '#6fa8e0');
    if (sk.snow) for (let i = 0; i < 3; i++) R(x + 2 + i * 3, y + 6 + (Math.floor(t * 2) + i) % 2, 1, 1, '#ffffff');
    if (sk.storm) { R(x + 5, y + 5, 2, 1, AMBER); R(x + 4, y + 6, 2, 1, AMBER); R(x + 5, y + 7, 1, 2, AMBER); }
    if (sk.fog) { R(x, y + 6, 10, 1, '#9aa4ae'); R(x + 2, y + 8, 8, 1, '#9aa4ae'); }
  } else if (sk.kind === 'night') {
    R(x + 3, y + 1, 5, 7, '#f4efdc'); R(x + 2, y + 2, 7, 5, '#f4efdc'); R(x + 5, y, 4, 6, '#1f2430'); R(x + 6, y + 1, 4, 5, '#1f2430');
    R(x + 9, y + 1, 1, 1, '#e8ecff'); R(x + 1, y + 7, 1, 1, '#e8ecff');
  } else {
    R(x + 3, y + 2, 5, 5, '#ffd866'); R(x + 4, y + 1, 3, 7, '#ffd866'); R(x + 2, y + 3, 7, 3, '#ffd866');
    if (Math.floor(t * 2) % 2) { R(x + 5, y - 1, 1, 1, '#ffd866'); R(x + 5, y + 9, 1, 1, '#ffd866'); R(x, y + 4, 1, 1, '#ffd866'); R(x + 10, y + 4, 1, 1, '#ffd866'); }
    if (sk.clouds > 2) cloud(x + 3, y + 3, '#ffffff');
  }
}
// horloge murale à l'heure réelle : petite et grande aiguilles + trotteuse terracotta
function drawClock() {
  const cx = px(14), cy = OYp + 11, d = new Date();
  const s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  const hand = (frac, len, c) => {
    const a = frac * Math.PI * 2 - Math.PI / 2;
    for (let i = 1; i <= len; i++) R(cx + Math.round(Math.cos(a) * i), cy + Math.round(Math.sin(a) * i), 1, 1, c);
  };
  // repères 12 / 3 / 6 / 9
  R(cx, cy - 5, 1, 1, '#b9b0a0'); R(cx + 4, cy, 1, 1, '#b9b0a0'); R(cx, cy + 4, 1, 1, '#b9b0a0'); R(cx - 5, cy, 1, 1, '#b9b0a0');
  hand(m / 60, 4, INK); hand(h / 12, 2, INK); hand(s / 60, 3, CLAY);
  R(cx, cy, 1, 1, CLAY);
}
function drawInfoScreen(t, sk) {
  drawClock();
  const x0 = px(3), x1 = px(6.5), y0 = OYp + 6, y1 = py(2) + 4, d = new Date();
  R(x0, y0, x1 - x0, y1 - y0, '#1f2430');
  R(x0, y0, x1 - x0, 1, '#2e3546');
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  pixText(hh, x0 + 4, y0 + 3, CREAM, 2);
  if (d.getSeconds() % 2 === 0) { R(x0 + 19, y0 + 5, 2, 2, CLAY); R(x0 + 19, y0 + 9, 2, 2, CLAY); }
  pixText(mm, x0 + 23, y0 + 3, CREAM, 2);
  wxIcon(x0 + 42, y0 + 3, sk, t);
  pixText(JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()], x0 + 4, y0 + 16, '#9aa4b8');
  const temp = WX.temp != null ? Math.round(WX.temp) + '°' : '--°';
  pixText(temp, x0 + 4, y0 + 23, AMBER);
  pixText(WX_SHORT(WX.code), x0 + 6 + temp.length * 4, y0 + 23, '#c9d1da');
  R(x1 - 4, y1 - 3, 2, 1, GREEN);
}

/* ---------- mobilier dessiné à chaque frame, trié par y (pied de l'objet) ---------- */
const furniture = [];
const SCREEN = { working: CLAY, reading: BLUE, thinking: VIOLET, waiting: AMBER };
var owner = null;                          // Eric, le patron (créé plus bas)
const everyone = () => owner ? [...agents.values(), owner] : [...agents.values()];
const someone = fn => everyone().some(fn);
const playingAt = (cx, cy) => someone(a => !a.path.length && !a.heading && a.act === 'arcade' && Math.floor(a.x) === cx && Math.floor(a.y) === cy);

DESKS.forEach(d => {
  const x0 = px(d.dx) + 1, w = 30, y0 = py(d.dy) + 1, cx = px(d.dx + 1), seatY = py(d.dy) + 3;
  furniture.push({   // chaise de bureau (derrière le perso, qui regarde vers nous)
    k: seatY - 0.5, draw() {
      panel(cx - 8, seatY - 19, 16, 13, CLAY);
      R(cx - 8, seatY - 19, 16, 1, '#eb9a7c'); R(cx - 6, seatY - 16, 12, 1, CLAY2);
      panel(cx - 7, seatY - 5, 14, 4, CLAY2);
    }
  });
  furniture.push({   // bureau
    k: py(d.dy + 1) + 2, draw(t) {
      R(x0, py(d.dy + 1) + 2, w + 1, 2, SHADOW);
      panel(x0, y0, w, 8, '#e0bf95'); R(x0, y0, w, 1, '#efd5b0');
      panel(x0, y0 + 8, w, 8, '#b98f63'); R(x0, y0 + 8, w, 1, '#a17a51');
      panel(x0 + 2, y0 + 10, 9, 4, '#c79f72'); R(x0 + 5, y0 + 11, 3, 1, '#8a6a4a');
      R(x0 + 1, y0 + 17, 2, 2, '#6e4c38'); R(x0 + w - 3, y0 + 17, 2, 2, '#6e4c38');
      const a = d.agent, seated = a && a.mode === 'sit' && a.seat && a.seat.type === 'desk';
      const st = seated && SCREEN[a.state] ? a.state : null;
      if (!(seated && a.sipUntil > performance.now())) {        // mug (sauf s'il est en train de boire)
        panel(x0 + 2, y0 + 1, 4, 5, '#faf7f0'); R(x0 + 2, y0 + 3, 4, 1, CLAY); R(x0 + 6, y0 + 2, 1, 2, FOUT);
        if (st === 'working' || st === 'thinking') for (let i = 0; i < 2; i++) {
          const ph = (t * 1.1 + i / 2) % 1;
          R(x0 + 3 + i + Math.round(Math.sin(ph * 6 + i)), y0 - 1 - Math.round(ph * 7), 1, 1, 'rgba(255,255,255,' + (0.8 - ph * 0.8).toFixed(2) + ')');
        }
      }
      // objet perso : dépend du projet installé à ce bureau
      const deco = a ? a.lookHash % 7 : (d.i % 2 ? 0 : 1), dx2 = x0 + 23;
      if (deco === 6) pokeball(dx2 + 2, y0 + 2, false);                 // Pokéball
      if (deco === 0) { panel(dx2 - 1, y0 + 1, 6, 5, '#ffffff'); R(dx2, y0 + 2, 4, 1, '#c9c2b4'); R(dx2, y0 + 4, 3, 1, '#c9c2b4'); }
      else if (deco === 1) { panel(dx2, y0 + 1, 5, 5, '#c0704f'); leaves(dx2 + 2, y0, [[-3, -5, 2, 5, '#6f8a52'], [0, -7, 2, 7, '#7f9c5f'], [2, -4, 2, 4, '#86a566']]); }
      else if (deco === 2) { panel(dx2 + 1, y0 - 3, 3, 3, CLAY); panel(dx2, y0, 5, 4, CLAY2); R(dx2 + 1, y0 - 2, 1, 1, OUT); R(dx2 + 3, y0 - 2, 1, 1, OUT); }   // figurine
      else if (deco === 3) { panel(dx2, y0 + 1, 5, 4, AMBER); panel(dx2 + 3, y0 - 2, 3, 3, AMBER); R(dx2 + 6, y0 - 1, 1, 1, '#e07a2a'); R(dx2 + 4, y0 - 1, 1, 1, OUT); } // canard
      else if (deco === 4) { panel(dx2, y0 - 3, 5, 7, '#6e4c38'); R(dx2 + 1, y0 - 2, 3, 5, '#9cc6e6'); R(dx2 + 1, y0 + 1, 3, 2, GREEN); }  // photo
      else if (deco === 5) { panel(dx2 + 1, y0 + 2, 4, 4, '#c0704f'); panel(dx2 + 2, y0 - 4, 2, 6, '#5d9a5f', '#3d4a2c'); R(dx2 + 1, y0 - 2, 1, 2, '#5d9a5f'); R(dx2 + 2, y0 - 5, 1, 1, '#e8a0c0'); } // cactus
      // portable : dos de l'écran, le logo étincelle s'allume selon l'activité
      panel(cx - 7, y0 + 3, 14, 3, '#cfcac0');
      if (seated) {
        const on = st && (st !== 'waiting' || Math.floor(t * 3) % 2);
        if (on) { g.fillStyle = SCREEN[st]; g.globalAlpha = 0.22; g.fillRect(cx - 9, y0 - 8, 18, 13); g.globalAlpha = 1; }
        panel(cx - 6, y0 - 5, 12, 8, '#3a3835'); R(cx - 6, y0 - 5, 12, 1, '#55524c');
        spark(cx, y0 - 1, 2, on ? (st === 'waiting' ? AMBER : CREAM) : '#6b6760');
        const sh = a.lookHash;                                       // stickers sur le capot
        R(cx - 5, y0 - 3, 2, 2, [CLAY, BLUE, GREEN, AMBER][sh % 4]); R(cx + 3, y0 + 0, 2, 1, [VIOLET, CREAM, CLAY, BLUE][(sh >>> 3) % 4]);
        if (sh % 3 === 0) R(cx + 3, y0 - 4, 2, 2, '#c25b6a');
        // mains sur le clavier, sauf si elles sont ailleurs (tête, tasse de café)
        const fast = a.mood === 'rush' ? 14 : 8, hb = st === 'working' && Math.floor(t * fast) % 2;
        const handsBusy = a.mood === 'frustrated', sipping = a.sipUntil > performance.now();
        if (!handsBusy) R(cx - 9, y0 + 1 - (hb ? 1 : 0), 3, 2, a.pal.S);
        if (!handsBusy && !sipping) R(cx + 6, y0 + 1 - (hb ? 0 : 1), 3, 2, a.pal.S);
      } else {
        panel(cx - 6, y0 + 1, 12, 2, '#3a3835');
      }
    }
  });
});

/* open space : bibliothèque, plante, imprimante, fontaine, petites plantes */
furniture.push({
  k: py(3) + 8, draw() {
    const x0 = px(13) + 1, top = py(3) - 26, bot = py(3) + 8;
    panel(x0, top, 30, bot - top, '#a87b55'); R(x0, top, 30, 1, '#c39a72');
    seed = 7;
    for (let s = 0; s < 3; s++) {
      const iy = top + 3 + s * 10;
      R(x0 + 2, iy, 26, 8, '#5e4430');
      for (let x = x0 + 3; x < x0 + 26;) {
        const bw = 2 + Math.floor(rnd() * 2), bh = 5 + Math.floor(rnd() * 3);
        R(x, iy + 8 - bh, bw, bh, [CLAY, BLUE, GREEN, AMBER, CREAM, '#8c6c9e', '#3a3835'][Math.floor(rnd() * 7)]);
        x += bw + (rnd() < 0.15 ? 2 : 0);
      }
      R(x0 + 1, iy + 8, 28, 2, '#c39a72');
    }
  }
});
furniture.push({
  k: py(3) + 9, draw() {
    const cx = px(15) + 8, by = py(3) + 9;
    panel(cx - 5, by - 9, 10, 9, '#c0704f'); R(cx - 5, by - 9, 10, 2, '#d68a68');
    leaves(cx, by - 9, [[-8, -12, 4, 10, '#5d7745'], [4, -14, 4, 12, '#5d7745'], [-4, -24, 3, 22, '#6f8a52'], [1, -27, 3, 25, '#7f9c5f'],
      [-1, -18, 3, 16, '#86a566'], [-10, -6, 5, 4, '#6f8a52'], [5, -7, 5, 4, '#7f9c5f']]);
  }
});
furniture.push({
  k: py(3) + 9, draw(t) {
    const x0 = px(21) + 1;
    panel(x0, py(3) - 2, 14, 11, '#d6cfc2'); R(x0, py(3) - 2, 14, 1, '#ece6da'); R(x0 + 5, py(3) + 3, 4, 1, '#9b9384');
    panel(x0 + 1, py(3) - 9, 12, 7, '#efece6'); R(x0 + 3, py(3) - 11, 8, 2, '#ffffff');
    R(x0 + 10, py(3) - 7, 1, 1, Math.floor(t * 1.5) % 2 ? GREEN : '#3d4a2c');
  }
});
furniture.push({
  k: py(12), draw() {
    const x0 = px(0) + 4;
    panel(x0, py(11) + 4, 8, 10, '#d8d2c6'); R(x0 + 2, py(11) + 6, 4, 2, BLUE);
    panel(x0, py(11) - 8, 8, 11, '#9cc6e6'); R(x0 + 1, py(11) - 7, 2, 8, '#d3e8f6');
  }
});

/* bureau du CEO : grand bureau, fauteuil, trophées, plante, aquarium, fauteuils visiteurs, lampe */
furniture.push({   // fauteuil de direction (derrière Eric)
  k: py(7) + 2.5, draw() {
    const cx = px(-4.5), sy0 = py(7) + 3;
    panel(cx - 9, sy0 - 25, 18, 19, '#e8dcc4'); R(cx - 9, sy0 - 25, 18, 2, '#f7efe0');
    for (let i = 0; i < 3; i++) { R(cx - 6 + i * 5, sy0 - 21, 1, 1, '#c9b998'); R(cx - 6 + i * 5, sy0 - 15, 1, 1, '#c9b998'); }
    panel(cx - 8, sy0 - 6, 16, 5, '#d8caae');
  }
});
furniture.push({   // grand bureau en bois sombre avec liseré doré
  k: py(8) + 2, draw(t) {
    const x0 = px(-6) + 1, w = 46, y0 = py(7) + 1, cx = px(-4.5);
    const seated = owner.mode === 'sit' && owner.seat && owner.seat.ceo;
    R(x0, py(8) + 2, w + 1, 2, SHADOW);
    panel(x0, y0, w, 8, '#7a4e36'); R(x0, y0, w, 1, '#9a6a4c');
    panel(x0, y0 + 8, w, 9, '#5e3a28'); R(x0, y0 + 8, w, 1, AMBER);
    panel(x0 + 3, y0 + 10, 10, 5, '#6e4632'); panel(x0 + w - 13, y0 + 10, 10, 5, '#6e4632');
    const nw = OWNER.length * 4 + 5;                                          // plaque nominative
    R(cx - (nw >> 1) - 1, y0 + 9, nw + 2, 7, '#c9952f'); R(cx - (nw >> 1), y0 + 10, nw, 5, '#2a2622');
    pixText(OWNER, cx - (nw >> 1) + 3, y0 + 10, AMBER);
    // lampe, mug, dossiers
    panel(x0 + 3, y0 - 6, 2, 8, '#c9952f'); panel(x0 + 1, y0 - 9, 7, 4, '#2f5a46'); R(x0 + 2, y0 - 5, 5, 1, '#f6e7b0');
    const sipping = seated && owner.sipUntil > performance.now();
    if (!sipping) { panel(x0 + w - 7, y0 + 1, 4, 5, CREAM); R(x0 + w - 7, y0 + 3, 4, 1, AMBER); }
    panel(x0 + 10, y0 + 2, 7, 4, '#ffffff'); R(x0 + 11, y0 + 3, 5, 1, '#c9c2b4');
    // grand écran : dos visible, logo étincelle allumé quand il bosse
    if (seated) { g.fillStyle = CLAY; g.globalAlpha = 0.18; g.fillRect(cx - 10, y0 - 9, 20, 14); g.globalAlpha = 1; }
    panel(cx - 7, y0 - 6, 14, 8, '#2b2a28'); R(cx - 7, y0 - 6, 14, 1, '#45433f');
    panel(cx - 2, y0 + 2, 4, 2, '#45433f');
    spark(cx, y0 - 2, 2, seated ? CREAM : '#5a5853');
    if (seated) {   // mains sur le clavier ; la droite tient la tasse quand il boit
      const hb = Math.floor(t * 7) % 2;
      R(cx - 12, y0 + 2 - (sipping ? 0 : hb), 3, 2, owner.pal.S);
      if (!sipping) R(cx + 9, y0 + 1 + hb, 3, 2, owner.pal.S);
    }
  }
});
furniture.push({   // vitrine à trophées
  k: py(3) + 8, draw(t) {
    const x0 = px(-3) + 1, top = py(3) - 28, bot = py(3) + 8;
    panel(x0, top, 30, bot - top, '#5e3a28'); R(x0, top, 30, 1, '#7a4e36');
    R(x0 + 2, top + 2, 26, 22, '#2a2622'); R(x0 + 2, top + 12, 26, 1, '#5e3a28');
    R(x0 + 4, top + 5, 3, 4, AMBER); R(x0 + 5, top + 9, 1, 2, AMBER); R(x0 + 4, top + 11, 3, 1, '#c9952f');      // coupe
    R(x0 + 11, top + 4, 5, 7, CLAY); spark(x0 + 13, top + 7, 1, CREAM);                                         // plaque étincelle
    R(x0 + 20, top + 6, 4, 5, '#d8d2c6'); R(x0 + 21, top + 5, 2, 1, '#d8d2c6');                                 // médaille
    R(x0 + 4, top + 15, 8, 8, BLUE); R(x0 + 5, top + 16, 6, 6, '#9cc6e6');                                       // cadre photo
    R(x0 + 15, top + 17, 3, 6, GREEN); R(x0 + 19, top + 18, 3, 5, CREAM); R(x0 + 23, top + 16, 3, 7, AMBER);     // livres
    R(x0 + 2, top + 2, 1, 22, 'rgba(255,255,255,.18)');
    panel(x0 + 2, top + 26, 26, bot - top - 28, '#6e4632');
  }
});
furniture.push({   // plante de coin
  k: py(3) + 9, draw() {
    const cx = px(-8) + 8, by = py(3) + 9;
    panel(cx - 5, by - 9, 10, 9, '#2a2622'); R(cx - 5, by - 9, 10, 1, AMBER);
    leaves(cx, by - 9, [[-7, -14, 4, 12, '#5d7745'], [3, -16, 4, 14, '#5d7745'], [-3, -26, 3, 24, '#6f8a52'], [1, -22, 3, 20, '#7f9c5f'], [-9, -7, 5, 4, '#6f8a52']]);
  }
});
furniture.push({   // aquarium
  k: py(12) + 2, draw(t) {
    const x0 = px(-8) + 2, y0 = py(11) - 10;
    panel(x0, y0 + 14, 28, 10, '#5e3a28');
    panel(x0, y0, 28, 14, '#5aa3c9'); R(x0, y0, 28, 2, '#8cc4e0'); R(x0, y0 + 12, 28, 2, '#d8c79c');
    leaves(x0 + 5, y0 + 12, [[0, -6, 1, 6, '#4f8a52'], [2, -8, 1, 8, '#5d9a5f']]);
    [[0, CLAY], [1, AMBER], [2, '#ffffff']].forEach(([i, c]) => {
      const p = (t * (0.12 + i * 0.05) + i * 0.33) % 1, dir = Math.sin(p * Math.PI * 2) > 0 ? 1 : -1;
      const fx = x0 + 4 + Math.round((Math.sin(p * Math.PI * 2) * 0.5 + 0.5) * 18), fy = y0 + 4 + i * 3;
      R(fx, fy, 3, 2, c); R(fx + (dir > 0 ? -1 : 3), fy, 1, 2, c);
    });
    const b = (t * 0.7) % 1; R(x0 + 20, y0 + 11 - Math.round(b * 9), 1, 1, '#d3e8f6');
  }
});
[-6, -4].forEach(tx => furniture.push({   // fauteuils visiteurs (vus de dos)
  k: py(10) + 12, draw() {
    const cx = px(tx) + 8, by = py(10) + 12;
    R(cx - 7, by, 14, 2, SHADOW);
    panel(cx - 6, by - 6, 12, 6, '#6e4632'); panel(cx - 7, by - 14, 14, 9, CLAY); R(cx - 7, by - 14, 14, 1, '#eb9a7c');
  }
}));
furniture.push({   // lampadaire
  k: py(9) + 14, draw() {
    const cx = px(-2) + 8, by = py(9) + 14;
    R(cx - 4, by - 1, 8, 2, '#2a2622'); R(cx, by - 26, 1, 25, '#c9952f');
    panel(cx - 5, by - 32, 11, 6, '#f6e7b0'); g.fillStyle = 'rgba(255,240,190,.12)'; g.fillRect(cx - 12, by - 28, 25, 26);
  }
});
[[0, 13], [21, 13], [23, 13], [31, 13]].forEach(([tx, ty]) => furniture.push({
  k: py(ty) + 14, draw() {
    const cx = px(tx) + 8, by = py(ty) + 14;
    panel(cx - 4, by - 7, 8, 7, '#c0704f');
    leaves(cx, by - 7, [[-6, -6, 3, 6, '#6f8a52'], [-2, -11, 3, 11, '#7f9c5f'], [3, -7, 3, 7, '#86a566']]);
  }
}));

/* murs de séparation entre les pièces, avec une porte */
[[22, CLAY2], [-1, '#2a2622']].forEach(([tx, signC]) => {
  furniture.push({
    k: py(7), draw() {
      const x = px(tx) + 3, top = OYp + 2, faceY = py(7) - 14;
      R(x, top, 10, faceY - top, '#5a4636'); R(x, top, 1, faceY - top, '#6e5848'); R(x + 9, top, 1, faceY - top, '#4a3a30');
      R(x, faceY, 10, 3, '#f3ece0'); R(x, faceY + 3, 10, 8, '#d98a6c'); R(x, faceY + 11, 10, 3, '#8a5a44');
    }
  });
  furniture.push({
    k: py(14) + 1, draw() {
      const x = px(tx) + 3, top = py(9) - 14;
      R(x, top, 10, py(14) - top, '#5a4636'); R(x, top, 10, 1, '#7a6352'); R(x, top, 1, py(14) - top, '#6e5848'); R(x + 9, top, 1, py(14) - top, '#4a3a30');
    }
  });
});

/* salle de pause : cuisine, frigo, distributeur, piano, arcades, canapé, table, pouf */
furniture.push({
  k: py(4) + 1, draw(t) {
    const x0 = px(23), x1 = px(27), ct = py(3) - 4;
    panel(x0, ct, x1 - x0, 6, '#efe9df'); R(x0, ct, x1 - x0, 1, '#ffffff');
    panel(x0, ct + 6, x1 - x0, py(4) + 1 - ct - 6, '#e0d8c8');
    for (let x = x0 + 16; x < x1; x += 16) R(x, ct + 7, 1, py(4) - ct - 8, '#c8bfae');
    for (let x = x0; x < x1; x += 16) R(x + 7, ct + 9, 2, 2, '#9b9384');
    R(x0, py(4) - 1, x1 - x0, 2, '#8a7f70');
    R(x0 + 3, ct + 1, 12, 4, '#9aa3a8'); R(x0 + 4, ct + 2, 10, 2, '#b9c3c8'); R(x0 + 8, ct - 5, 2, 6, '#b9c0c4'); R(x0 + 8, ct - 5, 4, 1, '#b9c0c4');
    const mx = px(25) + 2;                                                   // machine à café
    panel(mx, ct - 17, 12, 17, '#3a3835'); R(mx, ct - 17, 12, 2, '#55524c');
    R(mx + 3, ct - 10, 6, 5, '#1b1a19'); R(mx + 9, ct - 15, 2, 2, Math.floor(t * 2) % 2 ? CLAY : '#5a2e20');
    spark(mx + 4, ct - 14, 1, CLAY);
    panel(mx + 4, ct - 4, 4, 3, CREAM);
    if (someone(a => !a.path.length && Math.floor(a.x) === 25 && Math.floor(a.y) === 4))
      for (let i = 0; i < 3; i++) { const ph = (t * 1.3 + i / 3) % 1; R(mx + 5 + Math.round(Math.sin(ph * 7 + i)), ct - 6 - Math.round(ph * 10), 1, 1, 'rgba(255,255,255,' + (0.9 - ph * 0.9).toFixed(2) + ')'); }
    [[CLAY, 0], [BLUE, 5]].forEach(([c, o]) => panel(px(24) + 4 + o, ct - 4, 3, 4, c));
    panel(px(26) + 4, ct - 5, 7, 5, '#c0704f');
    leaves(px(26) + 7, ct - 5, [[-5, -7, 3, 7, '#6f8a52'], [-1, -10, 3, 10, '#7f9c5f'], [3, -6, 3, 6, '#86a566']]);
    // frigo américain deux portes
    const fx = px(27) + 2, fw = 28, ft = OYp + 12, fb = py(4) + 1;
    R(fx, fb, fw + 1, 2, SHADOW);
    panel(fx, ft, fw, fb - ft, '#e9eef0'); R(fx, ft, fw, 1, '#ffffff');
    R(fx + 13, ft, 2, 30, '#c9d1d5'); R(fx, ft + 30, fw, 2, '#c9d1d5');
    R(fx + 11, ft + 9, 1, 12, '#9aa3a8'); R(fx + 16, ft + 9, 1, 12, '#9aa3a8'); R(fx + 9, ft + 37, 10, 1, '#9aa3a8');
    R(fx + 2, ft + 2, 1, 26, 'rgba(255,255,255,.6)');
    spark(fx + 6, ft + 7, 2, CLAY); panel(fx + 19, ft + 5, 4, 4, AMBER); panel(fx + 20, ft + 14, 5, 6, '#9cc6e6');
    R(fx + 2, fb - 3, fw - 4, 2, '#b9c3c8');
  }
});
furniture.push({ // distributeur de snacks, même gabarit que le frigo
  k: py(4) + 1, draw(t) {
    const x0 = px(30) + 2, w = 28, top = OYp + 12, bot = py(4) + 1;
    R(x0, bot, w + 1, 2, SHADOW);
    panel(x0, top, w, bot - top, '#e6dfd2'); R(x0, top, w, 5, CLAY); R(x0, top + 5, w, 1, CLAY2);
    spark(x0 + 9, top + 2, 1, CREAM);
    R(x0 + 2, top + 8, 17, 24, '#2a2622');
    const SN = [AMBER, BLUE, GREEN, CREAM, '#c25b6a', VIOLET, CLAY, '#9cc6e6', AMBER];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { R(x0 + 4 + c * 5, top + 10 + r * 8, 4, 4, SN[r * 3 + c]); R(x0 + 3 + c * 5, top + 15 + r * 8, 6, 1, '#55524c'); }
    R(x0 + 2, top + 8, 1, 24, 'rgba(255,255,255,.3)');
    R(x0 + 21, top + 9, 5, 10, '#cfc7b8');
    for (let i = 0; i < 3; i++) R(x0 + 22, top + 10 + i * 3, 3, 2, '#9b9384');
    R(x0 + 23, top + 21, 1, 3, '#2a2622');
    R(x0 + 22, top + 26, 3, 2, Math.floor(t * 1.2) % 2 ? AMBER : '#b08a3a');
    R(x0 + 3, top + 34, 15, 4, '#1b1a19');
    R(x0 + 2, bot - 3, w - 4, 2, '#cfc7b8');
  }
});
furniture.push({ // piano droit, de profil contre le mur de droite (clavier côté pianiste)
  k: py(10) + 2, draw(t) {
    const x0 = px(31) + 4, w = 11, top = py(9) - 10, face = py(11) - 13, bot = py(11) - 2;
    const playing = someone(a => a.mode === 'sit' && a.seat && a.seat.type === 'piano');
    R(x0 - 6, bot, w + 7, 2, SHADOW);
    panel(x0, top, w, face - top, '#4a3428'); R(x0, top, w, 1, '#6b4c3a'); R(x0 + w - 2, top + 1, 1, face - top - 1, '#3a2a22');
    panel(x0, face, w, bot - face, '#3a2a22'); R(x0 + 2, face + 2, w - 4, bot - face - 4, '#47332a');
    R(x0 + 3, bot - 2, 2, 1, AMBER); R(x0 + 6, bot - 2, 2, 1, AMBER);                        // pédales
    // clavier, vu de dessus, qui dépasse côté gauche
    const ky = py(9) + 4, kh = 24;
    panel(x0 - 6, ky, 6, kh, '#3a2a22');
    R(x0 - 6, ky, 5, kh, '#f6f2ea');
    for (let y = ky + 2; y < ky + kh; y += 3) R(x0 - 6, y, 5, 1, '#c9c2b4');
    for (let y = ky + 1, i = 0; y < ky + kh - 1; y += 3, i++) if (i % 7 !== 2 && i % 7 !== 6) R(x0 - 3, y, 2, 2, '#1e1a18');
    if (playing) for (let i = 0; i < 3; i++) { const k = Math.floor(t * 6 + i * 3.7) % 8; R(x0 - 6, ky + k * 3, 2, 2, '#e8d0a8'); }
    // partition + métronome sur le dessus
    panel(x0 + 2, top + 3, 6, 7, CREAM); R(x0 + 3, top + 5, 4, 1, '#9b958a'); R(x0 + 3, top + 7, 3, 1, '#9b958a');
    panel(x0 + 3, top + 14, 4, 5, '#a8754f'); R(x0 + 5, top + 14 - (playing ? Math.floor(t * 4) % 2 : 0), 1, 3, '#e9e2d4');
  }
});
furniture.push({ // tabouret du pianiste (sous lui)
  k: py(10) + 3, draw() {
    const x0 = px(30) + 3, y0 = py(10) + 1;
    R(x0, y0 + 7, 11, 2, SHADOW);
    panel(x0, y0, 10, 3, '#3a2a22'); R(x0, y0, 10, 1, '#5a4033');
    R(x0 + 1, y0 + 4, 1, 4, '#2a1e18'); R(x0 + 8, y0 + 4, 1, 4, '#2a1e18');
  }
});
furniture.push({ // télé face au canapé (on voit son dos, l'écran éclaire la pièce)
  k: py(14) - 1, draw(t) {
    const x0 = px(26) + 1, w = 30, y0 = py(13) + 3;
    const on = someone(a => a.act === 'tv' && a.mode === 'sit');
    R(x0, y0 + 10, w + 1, 2, SHADOW);
    if (on) {
      g.fillStyle = [BLUE, VIOLET, CLAY, GREEN][Math.floor(t * 0.8) % 4];
      g.globalAlpha = 0.16 + (Math.floor(t * 5) % 2) * 0.04; g.fillRect(x0 - 4, y0 - 22, w + 8, 18); g.globalAlpha = 1;
    }
    panel(x0, y0 + 2, w, 8, '#5e3a28'); R(x0, y0 + 2, w, 1, '#7a4e36');
    R(x0 + 3, y0 + 5, 9, 3, '#4a2e22'); R(x0 + 18, y0 + 5, 9, 3, '#4a2e22');
    panel(x0 + 3, y0 - 9, w - 6, 10, '#2b2a28'); R(x0 + 3, y0 - 9, w - 6, 1, '#45433f');
    spark(x0 + 15, y0 - 4, 1, on ? CREAM : '#55524c');
    R(x0 + w - 6, y0 - 1, 1, 1, on ? GREEN : '#a33');
  }
});
[[3, VIOLET, '#5a4a8a'], [4, BLUE, '#3f6b8e']].forEach(([tx, c1, c2]) => furniture.push({ // bornes d'arcade (salle de jeux)
  k: py(18) + 1, draw(t) {
    const x0 = px(tx) + 2, w = 12, top = py(17) - 14, bot = py(18) + 1, on = playingAt(tx, 18);
    R(x0, bot, w + 1, 2, SHADOW);
    panel(x0, top, w, bot - top, c2); R(x0, top, w, 4, c1); spark(x0 + 6, top + 2, 1, CREAM);
    R(x0 + 2, top + 6, 8, 8, '#141320');
    if (on) {
      const f = Math.floor(t * 6);
      R(x0 + 3 + (f % 5), top + 12, 2, 1, AMBER);
      R(x0 + 3 + ((f * 3) % 6), top + 7 + (f % 3), 1, 1, CLAY);
      R(x0 + 4 + ((f * 2) % 4), top + 9, 1, 1, GREEN);
      g.fillStyle = c1; g.globalAlpha = 0.25; g.fillRect(x0 - 1, top + 5, w + 2, 11); g.globalAlpha = 1;
    } else { R(x0 + 4, top + 9, 4, 1, '#3a3860'); }
    R(x0 - 1, top + 15, w + 2, 3, shade(c2, -0.25));
    R(x0 + 3, top + 13 + (on && Math.floor(t * 5) % 2 ? 1 : 0), 1, 2, RED);
    R(x0 + 7, top + 16, 1, 1, AMBER); R(x0 + 9, top + 16, 1, 1, GREEN);
    R(x0 + 2, top + 20, w - 4, 1, shade(c2, 0.2));
  }
}));
furniture.push({ // canapé, tourné vers nous
  k: py(SOFA.y) + 15, draw() {
    const x0 = px(SOFA.x) + 1, w = SOFA.n * T - 2, y0 = py(SOFA.y) - 6;
    R(x0, y0 + 23, w, 2, SHADOW);
    panel(x0, y0, w, 11, '#7f9463'); R(x0, y0, w, 1, '#93a978');
    for (let i = 1; i < SOFA.n; i++) R(x0 + i * T - 1, y0 + 2, 1, 8, '#6c8053');
    panel(x0, y0 + 11, w, 6, '#93a978'); R(x0, y0 + 11, w, 1, '#a7bc8c');
    for (let i = 1; i < SOFA.n; i++) R(x0 + i * T - 1, y0 + 11, 1, 6, '#7f9463');
    panel(x0, y0 + 17, w, 5, '#6c8053');
    panel(x0 - 5, y0 + 4, 5, 18, '#6c8053'); R(x0 - 5, y0 + 4, 5, 1, '#7f9463');
    panel(x0 + w, y0 + 4, 5, 18, '#6c8053'); R(x0 + w, y0 + 4, 5, 1, '#7f9463');
    panel(x0 + 2, y0 + 4, 8, 7, CLAY); R(x0 + 4, y0 + 7, 4, 1, CLAY2);
    panel(x0 + w - 10, y0 + 4, 8, 7, CREAM); spark(x0 + w - 6, y0 + 7, 1, CLAY);
  }
});
furniture.push({ // guitare posée sur son support (quand personne n'en joue)
  k: py(SOFA.y) + 14, draw() {
    if (someone(a => a.act === 'guitar' && a.mode === 'sit')) { R(px(29) + 6, py(10) + 10, 5, 4, '#3a2a22'); return; }
    const cx = px(29) + 8, by = py(10) + 13;
    R(cx - 3, by, 7, 1, '#3a2a22');
    panel(cx - 3, by - 8, 7, 7, '#c9853e', OUT); R(cx - 1, by - 6, 2, 2, '#4a2e1c'); R(cx - 3, by - 8, 7, 1, '#dda05a');
    R(cx, by - 18, 1, 10, '#6e4c38'); panel(cx - 1, by - 21, 3, 3, '#3a2a22', OUT);
  }
});
furniture.push({ // table basse
  k: py(13) - 2, draw() {
    const x0 = px(26) + 3, y0 = py(12) + 1;
    R(x0, y0 + 12, 27, 2, SHADOW);
    panel(x0, y0, 26, 8, '#e0bf95'); R(x0, y0, 26, 1, '#efd5b0');
    panel(x0, y0 + 8, 26, 3, '#b98f63');
    panel(x0 + 3, y0 + 2, 7, 4, CLAY); R(x0 + 4, y0 + 3, 5, 2, '#f5efe3');
    panel(x0 + 14, y0 + 2, 3, 4, CREAM);
    panel(x0 + 20, y0 + 2, 4, 4, '#c0704f'); leaves(x0 + 22, y0 + 2, [[-2, -4, 2, 4, '#7f9c5f'], [1, -3, 2, 3, '#86a566']]);
  }
});
furniture.push({ // pouf
  k: py(11) + 9, draw() {
    const cx = px(30) + 8, by = py(11) + 13;
    R(cx - 8, by, 16, 2, SHADOW);
    // pouf Pokéball
    panel(cx - 7, by - 10, 14, 10, '#ffffff', OUT); R(cx - 7, by - 10, 14, 4, '#e3350d'); R(cx - 6, by - 10, 12, 1, '#f26a4a');
    R(cx - 7, by - 6, 14, 2, OUT); panel(cx - 2, by - 7, 4, 4, '#ffffff', OUT); R(cx - 1, by - 6, 2, 2, '#e9e4da');
    R(cx - 6, by - 2, 12, 1, '#d8d2c6');
  }
});
// Pokéball en pixels (5x5, ou 7x7 si big)
function pokeball(cx, cy, big, tilt) {
  const m = big
    ? ['..OOO..', '.ORRRO.', 'ORRRRRO', 'OOOWOOO', 'OWWWWWO', '.OWWWO.', '..OOO..']
    : ['.OOO.', 'ORRRO', 'OOWOO', 'OWWWO', '.OOO.'];
  const pal = { O: OUT, R: '#e3350d', W: '#ffffff' }, n = m.length, h = n >> 1;
  m.forEach((row, r) => { for (let c = 0; c < n; c++) { const ch = tilt ? m[c][n - 1 - r] : row[c]; if (ch !== '.') R(cx - h + c, cy - h + r, 1, 1, pal[ch]); } });
}

/* ---------- pathfinding (la case cible peut être un siège) ---------- */
function bfs(from, to) {
  const key = (x, y) => x + ',' + y;
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const prev = new Map([[key(...from), null]]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny), isT = nx === to[0] && ny === to[1];
      if (nx < XMIN || ny < 0 || nx >= XMAX || ny >= ROWS || prev.has(k) || (BLOCKED.has(k) && !isT)) continue;
      prev.set(k, [x, y]);
      if (isT) {
        const path = []; let cur = [nx, ny];
        while (cur && !(cur[0] === from[0] && cur[1] === from[1])) { path.unshift(cur); cur = prev.get(key(...cur)); }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return [];
}

/* ====================================================================
   Persos : sprites 12x21 dessinés pixel par pixel
   O contour · H cheveux · S peau · E yeux · R joues · T t-shirt · A ombre t-shirt
   C badge étincelle · P pantalon · B chaussures · K/k casquette
   ==================================================================== */
const SPR = {
  down: [
    '....OOOO....', '..OOHHHHOO..', '.OHHHHHHHHO.', 'OHHHHHHHHHHO', 'OHHHHHHHHHHO', 'OHSSSHHSSSHO',
    'OSSSSSSSSSSO', 'OSSESSSSESSO', 'OSSESSSSESSO', 'OSRSSSSSSRSO', '.OSSSSSSSSO.', '..OOOSSOOO..',
    '.OATTTTTTAO.', 'OAATTTCTTAAO', 'OAATTTTTTAAO', 'OSSTTTTTTSSO'],
  up: [
    '....OOOO....', '..OOHHHHOO..', '.OHHHHHHHHO.', 'OHHHHHHHHHHO', 'OHHHHHHHHHHO', 'OHHHHHHHHHHO',
    'OHHHHHHHHHHO', 'OHHHHHHHHHHO', 'OHHHHHHHHHHO', 'OSHHHHHHHHSO', '.OHHHHHHHHO.', '..OOOSSOOO..',
    '.OATTTTTTAO.', 'OAATTTTTTAAO', 'OAATTTTTTAAO', 'OSSTTTTTTSSO'],
  right: [
    '....OOOO....', '..OOHHHHOO..', '.OHHHHHHHHO.', 'OHHHHHHHHHHO', 'OHHHHHHHHHHO', 'OHHHHHHSSSHO',
    'OHHHHSSSSSSO', 'OHHHSSSSSESO', 'OHHHSSSSSESO', 'OHHSSSSSSRSO', '.OHSSSSSSSO.', '...OOSSOOO..',
    '...OTTTTO...', '...OTAATO...', '...OTAATO...', '...OTSSTO...']
};
const LEGS = {
  fb: [
    ['..OPPPPPPO..', '..OPPOOPPO..', '..OPPOOPPO..', '..OBBOOBBO..', '..OOOOOOOO..'],
    ['..OPPPPPPO..', '..OPPOOPPO..', '..OPPOOBBO..', '..OBBOOOOO..', '..OOOO......'],
    ['..OPPPPPPO..', '..OPPOOPPO..', '..OBBOOPPO..', '..OOOOOBBO..', '......OOOO..']],
  side: [
    ['...OPPPPO...', '...OPPPPO...', '...OPPPPO...', '...OBBBBBO..', '...OOOOOOO..'],
    ['...OPPPPO...', '..OPPOOPPO..', '.OPPO..OPPO.', '.OBBO..OBBBO', '.OOOO..OOOOO'],
    ['...OPPPPO...', '...OPPPPO...', '...OPPPPO...', '...OBBBBBO..', '...OOOOOOO..']],
  sit: ['..OPPPPPPO..', '.OPPPPPPPPO.', '.OOBBOOBBOO.', '..OOO..OOO..'],
  sitSide: ['...OPPPPPPO.', '...OOOOOPPO.', '.......OPPO.', '.......OBBBO', '.......OOOOO']
};
const SHIRTS = ['#d97757', '#6a9bcc', '#788c5d', '#a990d6', '#e8b04a', '#c25b6a', '#4f7f8a', '#f5efe3'];
const SKINS = ['#f6d3b3', '#e8b48c', '#c48a5c', '#8d5a3b'];
const HAIRS = ['#2b2018', '#6b3f1f', '#d39a3a', '#1f1f27', '#b4452f', '#e9e2d4', '#5a4a8a'];

function setPx(rows, r, c, ch) { if (rows[r] && c >= 0 && c < rows[r].length) rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); }
function buildRows(a, face, legs, sleep) {
  const base = face === 'left' ? 'right' : face;
  let rows = SPR[base].slice();
  if (sleep && base !== 'up') rows = rows.map((r, i) => i === 7 ? r.replace(/E/g, 'S') : i === 8 ? r.replace(/E/g, 'O') : r);
  if (a.style === 1) for (let r = 9; r < 14; r++) {                 // cheveux longs
    if (base === 'right') { setPx(rows, r, 1, 'H'); setPx(rows, r, 2, 'H'); setPx(rows, r, 0, 'O'); }
    else { setPx(rows, r, 0, 'O'); setPx(rows, r, 1, 'H'); setPx(rows, r, 10, 'H'); setPx(rows, r, 11, 'O'); }
  }
  if (a.style === 3) {                                               // casquette terracotta
    rows = rows.map((r, i) => i <= 3 ? r.replace(/H/g, 'K') : r);
    if (base === 'down') rows[4] = 'OkkkkkkkkkkO';
    if (base === 'right') rows[4] = 'OKKKKKKkkkkO';
    if (base === 'up') rows[4] = rows[4].replace(/H/g, 'K');
  }
  if (a.isOwner) {                                                   // Eric : lunettes fines + sweat à capuche noir
    if (base === 'down') {
      [2, 3, 4, 7, 8, 9].forEach(c => setPx(rows, 6, c, 'G'));
      [2, 4, 5, 6, 7, 9].forEach(c => setPx(rows, 7, c, 'G')); [2, 4, 7, 9].forEach(c => setPx(rows, 8, c, 'G'));
      [3, 8].forEach(c => setPx(rows, 8, c, 'L'));                   // reflet des verres
      rows[11] = '.OTTOSSOTTO.';                                     // capuche autour du cou
      setPx(rows, 12, 5, 'W'); setPx(rows, 12, 6, 'W'); setPx(rows, 13, 5, 'W'); setPx(rows, 13, 6, 'W');   // cordons
      setPx(rows, 13, 6, 'W'); [4, 5, 6, 7].forEach(c => setPx(rows, 15, c, 'A'));                         // poche
    }
    if (base === 'right') {
      [8, 9, 10].forEach(c => setPx(rows, 6, c, 'G')); [5, 6, 7, 8, 10].forEach(c => setPx(rows, 7, c, 'G')); [8, 10].forEach(c => setPx(rows, 8, c, 'G'));
      rows[11] = '..OTTTSSOO..';
    }
    if (base === 'up') { setPx(rows, 7, 0, 'G'); setPx(rows, 7, 11, 'G'); rows[10] = '.OTTTTTTTTO.'; rows[11] = '.OTTTTTTTTO.'; }
  }
  // accessoires des agents : casque audio, bonnet, barbe, lunettes
  if (a.acc === 'headphones') {
    for (let c = 3; c <= 8; c++) setPx(rows, 1, c, 'D');
    if (base === 'right') { for (let r = 6; r <= 8; r++) { setPx(rows, r, 4, 'J'); setPx(rows, r, 5, 'J'); } }
    else for (let r = 6; r <= 8; r++) { setPx(rows, r, 0, 'J'); setPx(rows, r, 11, 'J'); }
  }
  if (a.acc === 'beanie') {
    rows = rows.map((r, i) => i <= 3 ? r.replace(/[HK]/g, 'Q') : r);
    rows[4] = base === 'up' ? 'OqqqqqqqqqqO' : 'OqqqqqqqqqqO';
    setPx(rows, 0, 5, 'q'); setPx(rows, 0, 6, 'q');
  }
  if (a.acc === 'beard' && base !== 'up') {
    if (base === 'down') { [1, 2, 9, 10].forEach(c => setPx(rows, 9, c, 'H')); for (let c = 2; c <= 9; c++) setPx(rows, 10, c, 'H'); setPx(rows, 10, 5, 'S'); setPx(rows, 10, 6, 'S'); }
    else { for (let c = 6; c <= 10; c++) setPx(rows, 10, c, 'H'); setPx(rows, 9, 6, 'H'); setPx(rows, 9, 7, 'H'); }
  }
  if (a.acc === 'glasses') {
    if (base === 'down') { [2, 4, 5, 6, 7, 9].forEach(c => setPx(rows, 7, c, 'G')); [2, 4, 7, 9].forEach(c => setPx(rows, 8, c, 'G')); }
    if (base === 'right') { [5, 6, 7, 8, 10].forEach(c => setPx(rows, 7, c, 'G')); [8, 10].forEach(c => setPx(rows, 8, c, 'G')); }
  }
  if (legs) rows = rows.concat(legs);
  if (a.style === 2 && a.acc !== 'beanie') rows = ['....OOOO....', '...OHHHHO...'].concat(rows);   // chignon
  return rows;
}
// les sprites sont mis en cache (un petit canvas par pose et par palette)
function drawSprite(rows, cx, bottom, pal, flip) {
  const w = rows[0].length, h = rows.length, x0 = cx - (w >> 1), y0 = bottom - h;
  if (!pal.__c) Object.defineProperty(pal, '__c', { value: new Map() });
  const key = (flip ? 'f' : '') + rows.join('');
  let cnv = pal.__c.get(key);
  if (!cnv) {
    cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
    const cc = cnv.getContext('2d');
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = rows[r][flip ? w - 1 - c : c];
      if (ch !== '.') { cc.fillStyle = pal[ch] || '#ff00ff'; cc.fillRect(c, r, 1, 1); }
    }
    if (pal.__c.size > 400) pal.__c.clear();
    pal.__c.set(key, cnv);
  }
  g.drawImage(cnv, x0, y0);
  return y0;
}

/* ---------- agents ---------- */
const agents = new Map();
let selectedId = null;
const ACCS = ['none', 'headphones', 'beanie', 'beard', 'glasses', 'none', 'headphones', 'glasses'];
const PANTS_C = ['#3b3a4a', '#4a3b33', '#2f4058', '#5a4632', '#3a4a3a'];
// lookKey : le projet → le même perso, la même tenue et le même bureau d'une session à l'autre
function makeAgent(id, name, noDesk, lookKey) {
  const h = hash(lookKey || id), shirt = SHIRTS[h % SHIRTS.length], acc = ACCS[(h >>> 12) % ACCS.length];
  const beanie = [CLAY2, BLUE, GREEN, AMBER, '#5a4a8a'][(h >>> 15) % 5];
  const a = {
    id, name, title: name, cwd: '', log: [], style: (h >>> 9) % 4, m: {}, acc, lookHash: h, lookKey: lookKey || id,
    pal: {
      O: OUT, E: OUT, H: HAIRS[(h >>> 5) % HAIRS.length], S: SKINS[(h >>> 3) % SKINS.length], T: shirt, A: shade(shirt, -0.2),
      C: shirt === CLAY ? CREAM : CLAY, P: PANTS_C[(h >>> 18) % PANTS_C.length], B: '#4a3b33', K: CLAY, k: CLAY3, R: '#e9a08a',
      D: '#3a3835', J: [CLAY, BLUE, GREEN][(h >>> 20) % 3], Q: beanie, q: shade(beanie, -0.25), G: '#3a302a', L: '#cfe3ee'
    },
    x: DOOR[0] + 0.5, y: DOOR[1] + 0.5, path: [], mode: 'stand', seat: null, heading: null, face: 'down',
    state: 'idle', bubble: '', act: null, actLabel: '', mood: null, nextMove: 0, desk: null
  };
  a.pal.R = shade(a.pal.S, -0.08);
  a.palRed = Object.assign({}, a.pal, { S: mix(a.pal.S, '#e0533f', 0.4), R: mix(a.pal.S, '#c8392a', 0.55) });
  if (!noDesk) assignDesk(a);
  return a;
}
function makeOwner() {
  const o = makeAgent('owner', OWNER, true);
  o.isOwner = true; o.style = 0;
  Object.assign(o.pal, { H: '#4a2f1f', S: '#f1c9a5', T: '#2b2a2e', A: '#1d1c20', C: '#2b2a2e', P: '#6b4a32', B: '#2a1e18', W: '#e9e4da', G: '#3a302a', L: '#cfe3ee' });
  o.pal.R = shade(o.pal.S, -0.08);
  o.palRed = Object.assign({}, o.pal, { S: mix(o.pal.S, '#e0533f', 0.4) });
  o.heading = CEO_SEAT; arrive(o);
  return o;
}
// surnoms donnés par l'utilisateur, retenus par projet
const NICKS = (() => { try { return JSON.parse(localStorage.getItem('eo-nicks') || '{}'); } catch { return {}; } })();
function setNick(a, name) {
  name = (name || '').trim().slice(0, 40);
  if (name) NICKS[a.lookKey] = name; else delete NICKS[a.lookKey];
  try { localStorage.setItem('eo-nicks', JSON.stringify(NICKS)); } catch { }
  a.title = a.name = name || a.baseTitle || a.title;
}
// bureau préféré du projet si libre, sinon on remplit d'abord le centre de l'open space
const DESK_ORDER = DESKS.slice().sort((p, q) => (Math.abs(p.dx + 1 - 11) + (p.dy === 6 ? 0 : 1.5)) - (Math.abs(q.dx + 1 - 11) + (q.dy === 6 ? 0 : 1.5)));
function assignDesk(a) {
  const pref = DESKS[a.lookHash % DESKS.length];
  const d = !pref.agent ? pref : DESK_ORDER.find(d => !d.agent);
  if (d) { d.agent = a; a.desk = d; }
}
function removeAgent(a) { if (a.desk) a.desk.agent = null; agents.delete(a.id); if (selectedId === a.id) selectedId = null; }
function addLog(a, text) {
  a.log.push({ t: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text });
  a.logCount = (a.logCount || 0) + 1;
  if (a.log.length > 80) a.log.shift();
}

const WORK = new Set(['working', 'reading', 'thinking', 'waiting']);
const cellOf = a => [Math.min(XMAX - 1, Math.max(XMIN, Math.floor(a.x))), Math.min(ROWS - 1, Math.max(0, Math.floor(a.y)))];
const sofaSeat = i => ({ type: 'sofa', i, cell: [SOFA.x + i, SOFA.y] });
const seatUsed = (a, pred) => everyone().some(o => o !== a && [o.seat, o.heading].some(s => s && pred(s)));
function freeSofa(a) { const f = [...Array(SOFA.n).keys()].filter(i => !seatUsed(a, s => s.type === 'sofa' && s.i === i)); return f.length ? f[Math.floor(Math.random() * f.length)] : null; }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function standUp(a) {
  if (a.mode === 'sit' && a.seat) {
    const s = a.seat;
    if (s.type === 'desk') { a.x = s.dx + 0.5; a.y = s.dy - 0.5; }
    if (s.type === 'sofa') { a.x = s.cell[0] + 0.5; a.y = SOFA.y + 1.5; }
    if (s.type === 'piano') { a.x = 29.5; a.y = 9.5; }
    if (s.type === 'beanbag') { a.x = 30.5; a.y = 12.5; }
    if (s.stand) { a.x = s.stand[0] + 0.5; a.y = s.stand[1] + 0.5; }
  }
  a.mode = 'stand'; a.seat = null; a.act = null; a.actLabel = '';
}
function goTo(a, cell, target) {
  standUp(a);
  a.path = bfs(cellOf(a), cell);
  a.heading = target || { type: 'spot' };
  if (!a.path.length) arrive(a);
}
function arrive(a) {
  const s = a.heading; a.heading = null;
  a.act = s && s.act || null; a.actLabel = s && s.label || '';
  if (!s || s.type === 'spot') {
    if (s && s.face) a.face = s.face;
    a.nextMove = performance.now() + 7000 + Math.random() * 9000; return;
  }
  a.seat = s; a.mode = 'sit'; a.face = s.face || (s.type === 'piano' ? 'right' : 'down');
  a.nextMove = performance.now() + (s.type === 'desk' || s.zone ? 0 : 14000 + Math.random() * 16000);
  if (s.ceo) { a.state = 'working'; a.actLabel = 'Bosse à son bureau'; a.nextMove = performance.now() + 25000 + Math.random() * 25000; }
}
// Eric : bosse à son bureau, puis sort voir un agent, prendre un café ou faire une pause, et revient
function updateOwner(o, now) {
  if (o.act === 'pet' && !o.path.length && !o.heading && o.petCatRef) {
    const c = o.petCatRef; c.petUntil = now + 600; c.nextMove = Math.max(c.nextMove, now + 2000);
  }
  if (o.seat && o.seat.ceo) {
    if (!o.nextSip) o.nextSip = now + 6000 + Math.random() * 10000;
    if (now > o.nextSip) { o.sipUntil = now + 1800; o.nextSip = now + 14000 + Math.random() * 16000; }
  }
  if (o.heading || o.path.length || now < o.nextMove) return;
  if (!(o.seat && o.seat.ceo)) { o.state = 'working'; goTo(o, [-5, 6], CEO_SEAT); return; }
  o.state = 'idle';
  const workers = [...agents.values()].filter(a => a.mode === 'sit' && a.seat && a.seat.type === 'desk' && WORK.has(a.state));
  const r = Math.random();
  if (r < 0.45 && workers.length) {
    const w = pick(workers), cell = [w.seat.dx + (Math.random() < 0.5 ? 0 : 1), w.seat.dy + 1];
    goTo(o, cell, { type: 'spot', cell, face: 'up', act: 'watch', label: 'Passe voir ' + w.name });
    o.watchId = w.id;
  } else if (r < 0.62) goTo(o, [25, 4], { type: 'spot', cell: [25, 4], face: 'up', label: 'Prend un café' });
  else if (r < 0.8 && petCat(o)) { /* va caresser un chat */ }
  else pickActivity(o, now);
}
function petCat(o) {
  const c = pick(cats.filter(c => !c.path.length && !(c.spot && (c.spot.tree || c.spot.sofa != null || c.spot.beanbag))));
  if (!c) return false;
  const [x, y] = cellOf(c);
  const opt = [[x + 1, y, 'left'], [x - 1, y, 'right'], [x, y + 1, 'up']].find(([a, b]) => !BLOCKED.has(a + ',' + b) && b >= 3);
  if (!opt) return false;
  c.nextMove = Math.max(c.nextMove, performance.now() + 20000);       // le chat attend son câlin
  goTo(o, [opt[0], opt[1]], { type: 'spot', cell: [opt[0], opt[1]], face: opt[2], act: 'pet', label: 'Caresse ' + c.name });
  o.petCatRef = c;
  return true;
}
// choisit une activité de pause, pondérée
function pickActivity(a, now) {
  if (a.state === 'asleep') {
    if (a.seat && (a.seat.type === 'sofa' || a.seat.type === 'beanbag')) { a.act = 'sleep'; a.actLabel = ACT_LABEL.sleep; a.nextMove = now + 20000; return; }
    const i = freeSofa(a);
    if (i != null) goTo(a, sofaSeat(i).cell, Object.assign(sofaSeat(i), { act: 'sleep', label: ACT_LABEL.sleep }));
    else a.nextMove = now + 3000;
    return;
  }
  const opts = [];
  const si = freeSofa(a);
  if (si != null) opts.push([26, () => { const act = pick(['guitar', 'guitar', 'tv', 'tv', 'book', 'phone']); goTo(a, sofaSeat(si).cell, Object.assign(sofaSeat(si), { act, label: ACT_LABEL[act] })); }]);
  if (!seatUsed(a, s => s.type === 'piano')) opts.push([12, () => goTo(a, [30, 9], { type: 'piano', act: 'piano', label: ACT_LABEL.piano })]);
  if (!seatUsed(a, s => s.type === 'beanbag')) opts.push([6, () => { const act = pick(['phone', 'book']); goTo(a, [30, 11], { type: 'beanbag', act, label: ACT_LABEL[act] }); }]);
  SPOTS.forEach(sp => {
    const busy = everyone().some(o => o !== a && ((o.heading && o.heading.cell === sp.cell) || (!o.path.length && !o.seat && cellOf(o)[0] === sp.cell[0] && cellOf(o)[1] === sp.cell[1])));
    if (!busy && (!sp.ok || sp.ok())) opts.push([sp.w, () => goTo(a, sp.cell, Object.assign({ type: 'spot' }, sp))]);
  });
  IDLE_SEATS.forEach(s => {
    if ((!s.ok || s.ok()) && !seatUsed(a, x => x === s)) opts.push([s.w, () => goTo(a, s.cell, s)]);
  });
  opts.push([4, () => {
    let c, n = 0;
    do { c = [Math.floor(Math.random() * 32), 3 + Math.floor(Math.random() * (ROWS - 3))]; } while (BLOCKED.has(c[0] + ',' + c[1]) && ++n < 30);
    if (!BLOCKED.has(c[0] + ',' + c[1]) && !(typeof outsideBlocked === 'function' && outsideBlocked(c))) goTo(a, c, { type: 'spot', label: 'Se balade' });
  }]);
  let r = Math.random() * opts.reduce((s, o) => s + o[0], 0);
  for (const [w, go] of opts) { if ((r -= w) <= 0) { go(); return; } }
}
function updateAgent(a, dt, now) {
  if (a.isOwner) updateOwner(a, now);
  else if (WORK.has(a.state)) {
    // salle thématique (tests, serveur, bibliothèque) choisie par rooms.js selon l'activité qui dure
    const zs = a.zoneSeat;
    const wantType = zs ? 'zone' : a.desk ? 'desk' : 'sofa';
    const ok = zs ? (a.seat === zs || a.heading === zs) : (a.seat && a.seat.type === wantType) || (a.heading && a.heading.type === wantType);
    if (!ok && zs) goTo(a, zs.cell, zs);
    else if (!ok) {
      if (a.desk) goTo(a, [a.desk.dx, a.desk.dy - 1], { type: 'desk', dx: a.desk.dx, dy: a.desk.dy });
      else { const i = freeSofa(a); if (i != null) goTo(a, sofaSeat(i).cell, sofaSeat(i)); }
    }
    // une gorgée de café de temps en temps
    if (a.seat && a.seat.type === 'desk') {
      if (!a.nextSip) a.nextSip = now + 6000 + Math.random() * 10000;
      if (now > a.nextSip) { a.sipUntil = now + 1800; a.nextSip = now + 14000 + Math.random() * 16000; }
    }
  } else if (a.mode === 'sit' && a.seat && (a.seat.type === 'desk' || a.seat.zone)) {
    standUp(a); a.nextMove = now + 800;
  } else if (a.heading && (a.heading.type === 'desk' || a.heading.zone)) {
    a.path = []; a.heading = null; a.nextMove = now;
  } else if (!a.heading && !a.path.length && now > a.nextMove) {
    pickActivity(a, now);
  }
  if (a.path.length) {
    const [tx, ty] = a.path[0], tx2 = tx + 0.5, ty2 = ty + 0.5;
    const dx = tx2 - a.x, dy = ty2 - a.y, dist = Math.hypot(dx, dy), stp = 2.8 * dt;
    if (Math.abs(dx) > Math.abs(dy)) a.face = dx > 0 ? 'right' : 'left'; else if (Math.abs(dy) > 0.001) a.face = dy > 0 ? 'down' : 'up';
    if (dist <= stp) { a.x = tx2; a.y = ty2; a.path.shift(); if (!a.path.length) arrive(a); }
    else { a.x += dx / dist * stp; a.y += dy / dist * stp; }
  }
}
function screenPos(a) {
  if (a.mode === 'sit' && a.seat) {
    const s = a.seat;
    if (s.pos) return s.pos;
    if (s.type === 'desk') return [px(s.dx + 1), py(s.dy) - 2];
    if (s.type === 'piano') return [px(30) + 8, py(10) + 8];
    if (s.type === 'beanbag') return [px(30.5), py(11) + 12];
    return [px(s.cell[0] + 0.5), py(SOFA.y) + 13];
  }
  return [px(a.x), py(a.y) + 6];
}
function sortKey(a) {
  if (a.mode === 'sit' && a.seat) {
    const s = a.seat;
    if (s.k != null) return s.k;
    if (s.type === 'desk') return py(s.dy) + 3;
    if (s.type === 'piano') return py(10) + 8;
    if (s.type === 'beanbag') return py(11) + 10;
    return py(SOFA.y) + 15.5;
  }
  return py(a.y) + 6;
}

/* ---------- les chats ---------- */
const sofaBusy = i => someone(a => [a.seat, a.heading].some(s => s && s.type === 'sofa' && s.i === i));
const CAT_SPOTS = [
  ...[0, 1, 2, 3].map(i => ({ cell: [SOFA.x + i, SOFA.y], z: 7, sleep: true, sofa: i, w: 5 })),
  { cell: [30, 11], z: 6, sleep: true, beanbag: true, w: 5 },
  { cell: [25, 11], sleep: true, w: 3 }, { cell: [28, 11], sleep: true, w: 3 }, { cell: [29, 12], sleep: true, w: 2 },
  { cell: [11, 4], sleep: true, w: 3 }, { cell: [17, 4], sleep: true, w: 3 },        // au soleil sous les fenêtres
  { cell: [-3, 8], sleep: true, w: 4 }, { cell: [-7, 8], sleep: true, w: 3 },        // tapis du patron
  { cell: [28, 4], w: 3 }, { cell: [24, 4], w: 2 },                                   // réclament devant le frigo
  { cell: [-4, 12], z: 7, sleep: true, basket: true, cat: 'Ninja', w: 12 },          // paniers dans le bureau du patron
  { cell: [-2, 12], z: 7, sleep: true, basket: true, cat: 'Pixel', w: 12 }
];
const POM = { e: 0 };                                                                   // énergie du pompon (0 à 1)
CAT_SPOTS.push({ cell: [-8, 8], z: 40, sleep: true, tree: true, w: 8 });              // en haut de l'arbre à chat
block(-4, 12); block(-2, 12); block(-8, 8);
furniture.push({   // arbre à chat
  k: py(8) + 12, draw(t) {
    const cx = px(-8) + 8, by = py(8) + 12;
    R(cx - 8, by, 16, 2, SHADOW);
    panel(cx - 7, by - 4, 14, 4, '#d8c8a8');
    R(cx - 1, by - 34, 3, 30, '#c9a877'); for (let y = by - 33; y < by - 4; y += 2) R(cx - 1, y, 3, 1, '#a88a5a');
    R(cx + 4, by - 22, 2, 18, '#c9a877'); for (let y = by - 21; y < by - 4; y += 2) R(cx + 4, y, 2, 1, '#a88a5a');
    panel(cx - 7, by - 14, 8, 3, '#e8dcc4'); R(cx - 7, by - 14, 8, 1, '#f5ecd8');
    panel(cx + 1, by - 24, 7, 3, '#e8dcc4'); R(cx + 1, by - 24, 7, 1, '#f5ecd8');
    panel(cx - 7, by - 37, 15, 4, '#e8dcc4'); R(cx - 7, by - 37, 15, 1, '#f5ecd8');
    const sw = Math.round(Math.sin(t * (1.8 + POM.e * 5)) * (2 + POM.e * 4));   // pompon qui se balance (plus fort si un chat joue)
    R(cx + 6, by - 33, 1, 7, '#9b958a'); panel(cx + 5 + sw, by - 26, 3, 3, CLAY);
  }
});
[[-4, CLAY, 14], [-2, BLUE, 17]].forEach(([tx, cushion, bw]) => furniture.push({   // paniers à chat
  k: py(12) + 10, draw() {
    const cx = px(tx) + 8, by = py(12) + 12;
    R(cx - (bw >> 1) - 1, by, bw + 2, 2, SHADOW);
    panel(cx - (bw >> 1), by - 7, bw, 7, '#b98a55'); R(cx - (bw >> 1), by - 7, bw, 2, '#d9ae74');
    for (let x = cx - (bw >> 1) + 1; x < cx + (bw >> 1); x += 2) R(x, by - 4, 1, 3, '#9c7040');
    R(cx - (bw >> 1) + 2, by - 6, bw - 4, 2, cushion);
  }
}));
const cats = [
  { name: 'Ninja', big: false, col: '#2a2622', hi: '#45403a', ol: '#100e0d', eye: '#c6e05a', speed: 2.4, x: 25.5, y: 11.5 },
  { name: 'Pixel', big: true, col: '#d98a4a', hi: '#f2c79a', stripe: '#a85e2a', ol: OUT, eye: '#7fb86a', speed: 1.7, x: -2.5, y: 8.5 }
].map(c => Object.assign(c, { path: [], mode: 'sleep', dir: 1, z: 0, spot: null, nextMove: performance.now() + 8000 + Math.random() * 10000 }));
const CAT_LABEL = { sleep: 'Fait la sieste', sit: 'Observe', walk: 'Se promène' };

function catGo(c, cell, spot) { c.path = bfs(cellOf(c), cell); c.spot = spot || null; c.mode = 'walk'; c.z = 0; c.label = null; if (!c.path.length) catArrive(c); }
function catArrive(c) {
  const s = c.spot, now = performance.now();
  c.mode = s && s.sleep && Math.random() < 0.75 ? 'sleep' : 'sit';
  c.z = s && s.z || 0;
  if (s && s.sofa != null) { c.x = s.cell[0] + 0.5; c.y = SOFA.y + 0.5; }
  if (s && s.beanbag) { c.x = 30.5; c.y = 11.4; }
  if (s && s.x != null) c.x = s.x;
  if (s && s.y != null) c.y = s.y;
  if (s && s.mode) c.mode = s.mode;
  c.label = s && s.label || null;
  if (s && s.stay) c.nextMove = now + s.stay;
  c.nextMove = now + (c.mode === 'sleep' ? 25000 + Math.random() * 30000 : 5000 + Math.random() * 8000);
}
function updateCat(c, dt, now) {
  // quelqu'un veut s'asseoir à sa place sur le canapé : le chat descend
  if (!c.path.length && c.spot && c.spot.sofa != null && sofaBusy(c.spot.sofa)) { c.y = SOFA.y + 1.5; c.z = 0; c.spot = null; c.nextMove = 0; }
  if (c.petUntil > now) {                                     // on le caresse : il ne bouge plus et ronronne
    if (c.path.length) { const [x, y] = cellOf(c); c.path = []; c.x = x + 0.5; c.y = y + 0.5; c.spot = null; }
    if (c.mode === 'walk') c.mode = 'sit';
    return;
  }
  if (!c.path.length && now > c.nextMove) {
    const r = Math.random();
    if (r < 0.5) {
      const free = CAT_SPOTS.filter(s => (!s.cat || s.cat === c.name) && !cats.some(o => o !== c && o.spot === s) && (s.sofa == null || !sofaBusy(s.sofa)) && (!s.beanbag || !someone(a => a.seat && a.seat.type === 'beanbag')) && (!s.ok || s.ok()) && !(typeof outsideBlocked === 'function' && outsideBlocked(s.cell)));
      let tot = Math.random() * free.reduce((n, s) => n + s.w, 0);
      const s = free.find(s => (tot -= s.w) <= 0);
      if (s) catGo(c, s.cell, s);
    } else if (r < 0.72) {                               // va voir quelqu'un (souvent Eric)
      const ppl = everyone(), p = Math.random() < 0.4 && owner ? owner : pick(ppl);
      if (p) {
        const [x, y] = cellOf(p);
        const cell = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].find(([a, b]) => !BLOCKED.has(a + ',' + b) && b >= 3);
        if (cell && !(typeof outsideBlocked === 'function' && outsideBlocked(cell))) catGo(c, cell, { follow: true });
      }
    } else if (r < 0.9) {
      let cell, n = 0;
      do { cell = [XMIN + Math.floor(Math.random() * COLS), 3 + Math.floor(Math.random() * (ROWS - 3))]; } while (BLOCKED.has(cell[0] + ',' + cell[1]) && ++n < 30);
      if (!BLOCKED.has(cell[0] + ',' + cell[1]) && !(typeof outsideBlocked === 'function' && outsideBlocked(cell))) catGo(c, cell, null);
    } else { c.mode = 'sit'; c.nextMove = now + 6000; }
  }
  if (c.path.length) {
    const [tx, ty] = c.path[0], tx2 = tx + 0.5, ty2 = ty + 0.5;
    const dx = tx2 - c.x, dy = ty2 - c.y, dist = Math.hypot(dx, dy), stp = c.speed * dt;
    if (Math.abs(dx) > 0.01) c.dir = dx > 0 ? 1 : -1;
    if (dist <= stp) { c.x = tx2; c.y = ty2; c.path.shift(); if (!c.path.length) catArrive(c); }
    else { c.x += dx / dist * stp; c.y += dy / dist * stp; }
  }
}
function catKey(c) {
  if (c.keyOverride != null) return c.keyOverride;
  if (c.spot && c.spot.k != null && !c.path.length) return c.spot.k;
  if (c.spot && c.spot.sofa != null && !c.path.length) return py(SOFA.y) + 15.6;
  if (c.spot && c.spot.beanbag && !c.path.length) return py(11) + 9.5;
  if (c.spot && c.spot.basket && !c.path.length) return py(12) + 10.5;
  if (c.spot && c.spot.tree && !c.path.length) return py(8) + 12.5;
  return py(c.y) + 7;
}
function drawCat(c, t) {
  const big = c.big, bw = big ? 13 : 10, bh = big ? 6 : 4, hw = big ? 7 : 6, hh = big ? 6 : 5;
  const x = px(c.x), fy = py(c.y) + 7, y = fy - c.z, d = c.dir, col = c.col, ol = c.ol;
  const stripes = (x0, y0, w, h) => { if (c.stripe) for (let i = 2; i < w - 1; i += 3) R(x0 + i, y0, 1, h, c.stripe); };
  R(x - (bw >> 1), y - 1, bw, 2, 'rgba(40,25,10,.2)');
  let hx, hy;
  if (c.mode === 'sleep') {                                    // en boule
    const breath = (t * 0.6) % 1 < 0.5 ? 0 : 1, w = bw + 1, h = bh + 1 + breath;
    panel(x - (w >> 1), y - h, w, h, col, ol); stripes(x - (w >> 1), y - h, w, h - 1);
    R(x - (w >> 1), y - 2, w, 1, shade(col, -0.18));          // la queue qui fait le tour
    hx = d > 0 ? x + (w >> 1) - hw + 2 : x - (w >> 1) - 2; hy = y - hh;
    panel(hx, hy, hw, hh - 1, col, ol); stripes(hx, hy, hw, 2);
    R(hx, hy - 2, 1, 2, col); R(hx + hw - 1, hy - 2, 1, 2, col);
    R(d > 0 ? hx + hw - 3 : hx + 1, hy + 2, 2, 1, ol);        // yeux fermés
    const p = (t * 0.4 + (big ? 0.5 : 0)) % 1;                 // petits z
    g.globalAlpha = 1 - p; R(hx + 2, hy - 5 - Math.round(p * 8), 3, 1, '#f5efe3'); R(hx + 3, hy - 4 - Math.round(p * 8), 1, 1, '#f5efe3'); R(hx + 2, hy - 3 - Math.round(p * 8), 3, 1, '#f5efe3'); g.globalAlpha = 1;
  } else if (c.mode === 'sit') {                              // assis de profil
    const w = big ? 8 : 6, h = big ? 9 : 7;
    panel(x - (w >> 1), y - h, w, h, col, ol); stripes(x - (w >> 1), y - h, w, h - 2);
    R(d > 0 ? x + (w >> 1) - 2 : x - (w >> 1), y - h + 2, 2, h - 3, c.hi);
    const tw = Math.round(Math.sin(t * 2) * 1);
    R(d > 0 ? x - (w >> 1) - 4 : x + (w >> 1), y - 1, 4, 1, col); R(d > 0 ? x - (w >> 1) - 4 : x + (w >> 1) + 3, y - 3 + tw, 1, 2, col);
    hx = x - (hw >> 1) + d; hy = y - h - hh + 2;
    panel(hx, hy, hw, hh, col, ol); stripes(hx, hy, hw, 2);
  } else {                                                     // marche
    const f = Math.floor(t * 9) % 2, bx0 = x - (bw >> 1), top = y - 2 - bh;
    [[1, f], [3, 1 - f], [bw - 4, 1 - f], [bw - 2, f]].forEach(([lx, up]) => R(bx0 + lx, y - 2, 1, 2 - up, shade(col, -0.15)));
    panel(bx0, top, bw, bh, col, ol); stripes(bx0, top, bw, bh - 1); R(bx0 + 1, top + bh - 1, bw - 2, 1, c.hi);
    const tx = d > 0 ? bx0 - 1 : bx0 + bw, wag = Math.round(Math.sin(t * 6));
    R(tx, top - 3, 1, 4, col); R(tx - d, top - 4 + wag, 1, 2, col);
    hx = d > 0 ? bx0 + bw - 3 : bx0 - hw + 3; hy = top - hh + 3;
    panel(hx, hy, hw, hh, col, ol); stripes(hx, hy, hw, 2);
  }
  if (c.mode !== 'sleep') {
    R(hx, hy - 2, 1, 2, col); R(hx + hw - 1, hy - 2, 1, 2, col); R(hx, hy - 3, 1, 1, ol); R(hx + hw - 1, hy - 3, 1, 1, ol);
    const blink = Math.floor(t * 0.5 + (big ? 0.3 : 0)) % 6 === 0;
    const ex = d > 0 ? hx + hw - 2 : hx + 1;
    R(ex, hy + 1, 1, blink ? 1 : 2, blink ? ol : c.eye); R(ex - d * 2, hy + 1, 1, blink ? 1 : 2, blink ? ol : c.eye);
    R(d > 0 ? hx + hw - 1 : hx, hy + 3, 1, 1, '#e79a9a');
  }
  if (c.petUntil > performance.now()) {                        // cœurs quand on le caresse
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.9 + i / 2) % 1; g.globalAlpha = 1 - p;
      icon('heart', x - 4 + i * 5 + Math.round(Math.sin(p * 6 + i) * 2), y - 18 - Math.round(p * 12), '#e0533f');
      g.globalAlpha = 1;
    }
  }
  c._box = [x - 8, y - 16, 16, 18];
}

/* ---------- humeur, calculée à partir des vraies données de la session ---------- */
const MOOD_LABEL = {
  angry: 'Une commande a planté', furious: 'Erreurs en série !', frustrated: 'Bloqué, réfléchit dur',
  pondering: 'Réfléchit longuement', rush: 'En plein rush', happy: 'Tâche terminée !'
};
function computeMood(a, nowMs) {
  const m = a.m || {};
  if (m.errorAt) {
    const furious = m.errors3m >= 3;
    if (nowMs - m.errorAt < (furious ? 9000 : 4000)) return furious ? 'furious' : 'angry';
  }
  if (a.state === 'thinking' && m.thinkSince) {
    const d = nowMs - m.thinkSince;
    if (d > 45000) return 'frustrated';
    if (d > 20000) return 'pondering';
  }
  if (a.state === 'working' && m.intensity >= 8) return 'rush';
  if (m.doneAt && nowMs - m.doneAt < 4500 && !WORK.has(a.state)) return 'happy';
  return null;
}

function drawPerson(a, t) {
  const now = performance.now(), nowMs = Date.now();
  let [x, y] = screenPos(a);
  const sel = a.id === selectedId, seat = a.mode === 'sit' && a.seat ? a.seat.type : null;
  const walking = a.path.length > 0, frame = walking ? 1 + Math.floor(t * 7) % 2 : 0;
  const face = seat === 'piano' ? 'right' : seat === 'seat' ? (a.seat.face || 'down') : seat ? 'down' : a.face, side = face === 'left' || face === 'right';
  const mood = a.mood = computeMood(a, nowMs);
  if (mood === 'angry' || mood === 'furious') x += Math.floor(t * 18) % 2 ? 1 : -1;
  if (!seat) {
    R(x - 5, y - 1, 10, 2, 'rgba(60,40,20,.22)'); R(x - 4, y - 2, 8, 1, 'rgba(60,40,20,.12)');
    if (sel) { R(x - 7, y - 1, 1, 2, CLAY); R(x + 6, y - 1, 1, 2, CLAY); R(x - 6, y + 1, 12, 1, CLAY); R(x - 6, y - 2, 12, 1, CLAY); }
  }
  let legs = null;
  if (!seat) legs = side ? LEGS.side[frame] : LEGS.fb[frame];
  else if (seat === 'sofa' || seat === 'beanbag') legs = LEGS.sit;
  else if (seat === 'piano') legs = LEGS.sitSide;
  else if (seat === 'seat') legs = { sit: LEGS.sit, side: LEGS.sitSide, stand: side ? LEGS.side[0] : LEGS.fb[0] }[a.seat.legs] || null;
  if (seat === 'seat' && a.seat.legs === 'stand') R(x - 5, y - 1, 10, 2, 'rgba(60,40,20,.22)');   // debout à un poste : ombre au sol
  const rows = buildRows(a, face, legs, a.state === 'asleep' || a.act === 'sleep');
  let by = y;
  if (walking && frame === 1) by -= 1;
  if (seat === 'desk') {
    if (a.state === 'working' && Math.floor(t * (mood === 'rush' ? 12 : 6)) % 2) by -= 1;
    if (a.state === 'thinking' && Math.floor(t * 1.2) % 2) by -= 1;
  }
  if (mood === 'happy') by -= Math.round(Math.abs(Math.sin(t * 9)) * 3);
  if (seat === 'piano') x += Math.round(Math.sin(t * 2.2));
  if (a.act === 'guitar' && seat) by -= Math.floor(t * 2.5) % 2;
  const pal = mood === 'furious' ? a.palRed : a.pal, S = pal.S;
  const top = drawSprite(rows, x, by, pal, face === 'left');
  const head = top + (a.style === 2 ? 2 : 0), body = head + 12;   // haut de la tête / du t-shirt

  // accessoires selon l'activité
  if (seat === 'sofa' || seat === 'beanbag' || (seat === 'seat' && a.seat.legs === 'sit')) {
    if (a.act === 'guitar') {
      for (let i = 0; i < 7; i++) R(x - i, body + 1 - (i >> 1), 1, 2, '#6e4c38');
      panel(x - 9, body - 4, 2, 3, '#3a2a22', OUT);
      panel(x + 1, body + 1, 7, 5, '#c9853e', OUT); R(x + 1, body + 1, 7, 1, '#dda05a'); R(x + 3, body + 3, 2, 2, '#4a2e1c');
      R(x + 4, body + (Math.floor(t * 8) % 2), 2, 2, S); R(x - 5, body - 2, 2, 2, S);
    } else if (a.act === 'book') {
      panel(x - 5, body, 10, 6, CLAY, OUT); R(x - 4, body + 1, 4, 4, CREAM); R(x, body + 1, 4, 4, '#efe7d8');
      R(x - 3, body + 2, 2, 1, '#c9c2b4'); R(x + 1, body + 2, 2, 1, '#c9c2b4'); R(x - 3, body + 4, 2, 1, '#c9c2b4');
      R(x - 6, body + 3, 2, 2, S); R(x + 4, body + 3, 2, 2, S);
    } else if (a.act === 'phone') {
      panel(x + 1, body - 3, 3, 5, '#2b2a28', OUT); R(x + 1, body - 2, 3, 3, Math.floor(t * 2) % 2 ? '#9cc6e6' : '#b6d6ee'); R(x + 1, body + 2, 3, 2, S);
    }
  }
  if (a.act === 'guitar' && seat || a.act === 'piano' && seat) {     // notes de musique
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.55 + i / 3) % 1;
      g.globalAlpha = 1 - p;
      icon('note', x - 2 + (i - 1) * 6 + Math.round(Math.sin(p * 6 + i) * 2), head - 8 - Math.round(p * 16), [CLAY, BLUE, VIOLET][i]);
      g.globalAlpha = 1;
    }
  }
  if (seat === 'desk' && now < (a.sipUntil || 0)) {                   // gorgée de café
    panel(x + 3, head + 8, 4, 4, '#faf7f0', OUT); R(x + 3, head + 9, 4, 1, CLAY); R(x + 3, head + 12, 3, 2, S);
  }
  // humeurs
  if (mood === 'angry' || mood === 'furious') {
    if (mood === 'furious' || Math.floor(t * 4) % 2) icon('vein', x + 4, head - 2, RED);
    if (mood === 'furious') for (let i = 0; i < 2; i++) {
      const p = (t * 1.4 + i * 0.5) % 1;
      g.globalAlpha = 1 - p;
      R(x - 9 - Math.round(p * 3), head + 3 - Math.round(p * 10), 2, 2, '#d8d2c6');
      R(x + 8 + Math.round(p * 3), head + 3 - Math.round(p * 10), 2, 2, '#d8d2c6');
      g.globalAlpha = 1;
    }
  } else if (mood === 'frustrated') {
    const b = Math.floor(t * 3) % 2;
    R(x - 7, head + 2 + b, 2, 3, S); R(x + 5, head + 2 + (1 - b), 2, 3, S);       // se tient la tête
    if (Math.floor(t * 1.5) % 2) icon('vein', x + 4, head - 3, RED);
    const p = (t * 0.8) % 1; g.globalAlpha = 1 - p; R(x - 1, head - 4 - Math.round(p * 8), 2, 2, '#d8d2c6'); g.globalAlpha = 1;
  } else if (mood === 'pondering') {
    R(x + 2, head + 11, 2, 2, S);                                                  // main au menton
    icon('q', x + 5, head - 9 - (Math.floor(t * 2) % 2), VIOLET);
  } else if (mood === 'rush') {
    const p = (t * 1.6) % 1;
    icon('drop', x - 8, head + 1 + Math.round(p * 5), '#7fb6e0');
  } else if (mood === 'happy') {
    for (let i = 0; i < 4; i++) {
      const ang = t * 3 + i * Math.PI / 2;
      spark(x + Math.round(Math.cos(ang) * 10), head + 5 + Math.round(Math.sin(ang) * 6), 1, i % 2 ? AMBER : CLAY);
    }
  }
  if (a.state === 'waiting' && Math.floor(t * 2) % 2 && !mood) icon('bang', x + 6, head - 6, AMBER);
  if (a.act === 'watch' && !a.path.length && !a.heading) {           // Eric observe un agent
    const w = agents.get(a.watchId);
    const ic = !w || w.state === 'thinking' ? 'q' : w.state === 'waiting' ? 'bang' : 'heart';
    icon(ic, x + 5, head - 8 - Math.floor(t * 2) % 2, ic === 'heart' ? '#e0533f' : ic === 'bang' ? AMBER : VIOLET);
  }

  if (sel) { const b = Math.floor(t * 3) % 2; R(x - 2, top - 6 - b, 5, 1, CLAY); R(x - 1, top - 5 - b, 3, 1, CLAY); R(x, top - 4 - b, 1, 1, CLAY); }
  const fy = seat === 'seat' ? y + 2 : seat === 'desk' ? py(a.seat.dy + 1) + 3 : seat === 'sofa' ? py(SOFA.y + 1) : seat === 'piano' ? py(10) + 9 : seat === 'beanbag' ? py(12) : y;
  a._anchor = { x, y: top - (sel ? 6 : 1), fy };
  a._box = [x - 7, top - 1, 14, (seat === 'desk' ? y + 8 : y + 1) - top];
}

/* ====================================================================
   Boucle d'affichage + calque texte (bulles, noms)
   ==================================================================== */
const STATE_COLOR = { working: CLAY, reading: BLUE, thinking: VIOLET, waiting: AMBER, idle: '#9b968c', asleep: '#6d6a63' };
const STATE_LABEL = { working: 'Au travail', reading: 'Lit / cherche', thinking: 'Réfléchit', waiting: 'Attend (validation ?)', idle: 'En pause', asleep: 'Endormi' };
const SPIN = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/* ---------- réglages partagés avec ui.js ---------- */
const SETTINGS = Object.assign({ labels: 'compact', sound: false, onlyWaiting: false }, (() => {
  try { return JSON.parse(localStorage.getItem('eo-settings') || '{}'); } catch { return {}; }
})());
function saveSettings() { try { localStorage.setItem('eo-settings', JSON.stringify(SETTINGS)); } catch { } }

function overlay(t) {
  const c = dctx, Wc = CW;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.textBaseline = 'middle';
  const toBub = (bx, by, w, h) => [(bx - OXc) / S, (by - OYc) / S, w / S, h / S];
  if (hoverCat && hoverCat._box) {                        // nom du chat au survol
    const txt = '🐾 ' + hoverCat.name + ' · ' + (hoverCat.petUntil > performance.now() ? 'Ronronne…' : (hoverCat.label || CAT_LABEL[hoverCat.mode]) + ' · clic pour caresser');
    c.font = '600 11px ' + FONT; const w = Math.ceil(c.measureText(txt).width) + 14;
    const [x, y0] = toCss(hoverCat._box[0] + 8, hoverCat._box[1]), y = y0 - 4;
    c.fillStyle = 'rgba(42,41,39,.85)'; c.beginPath(); c.roundRect(x - w / 2, y - 16, w, 16, 8); c.fill();
    c.fillStyle = CREAM; c.textAlign = 'center'; c.fillText(txt, x, y - 7.5); c.textAlign = 'left';
  }
  const placed = [];
  const list = everyone().filter(a => a._anchor).sort((p, q) => q._anchor.y - p._anchor.y);
  for (const a of list) {
    const [x, y] = toCss(a._anchor.x, a._anchor.y), fy = toCss(0, a._anchor.fy)[1];
    a._bub = null;
    const hidden = (SETTINGS.onlyWaiting && a.state !== 'waiting' && !a.isOwner) || SETTINGS.labels === 'none';
    if (a.state === 'asleep' || a.act === 'sleep') {
      c.font = '700 12px ' + FONT; c.fillStyle = '#5a5249';
      for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - p; c.fillText(i % 2 ? 'Z' : 'z', x + 10 + p * 12, y - p * 26); }
      c.globalAlpha = 1;
    }
    if (a.id === selectedId || a.id === hoverId || (SETTINGS.labels === 'full' && WORK.has(a.state) && !hidden)) {   // bulle complète
      const name = a.name.length > 18 ? a.name.slice(0, 17) + '…' : a.name;
      let act = (a.mood ? MOOD_LABEL[a.mood] + ' · ' : '') + (a.bubble || a.actLabel || STATE_LABEL[a.state]);
      if (act.length > 34) act = act.slice(0, 33) + '…';
      c.font = '700 12px ' + FONT; const wn = c.measureText(name).width;
      c.font = '400 12px ' + FONT; const wa = c.measureText(act).width;
      const w = Math.ceil(28 + wn + 8 + wa + 10), h = 24;
      const free = (bx, by) => bx >= 2 && bx + w <= Wc - 2 && by >= 2 &&
        !placed.some(r => bx < r.x + r.w + 4 && bx + w + 4 > r.x && by < r.y + r.h + 4 && by + h + 4 > r.y);
      let bx = Math.round(Math.max(2, Math.min(Wc - w - 2, x - w / 2))), by = Math.round(y - h - 8);
      search: for (let lvl = 0; lvl < 8; lvl++) for (const o of [0, 0.6, -0.6, 1.2, -1.2]) {
        const qx = Math.round(x - w / 2 + o * w), qy = Math.round(y - h - 8 - lvl * (h + 6));
        if (free(qx, qy)) { bx = qx; by = qy; break search; }
      }
      placed.push({ x: bx, y: by, w, h });
      a._bub = toBub(bx, by, w, h);
      const col = STATE_COLOR[a.state] || CLAY;
      c.strokeStyle = col; c.lineWidth = 1.5;
      const ax = Math.max(bx + 12, Math.min(bx + w - 12, x));
      if (by + h < y - 9 || Math.abs(ax - x) > 1) { c.setLineDash([2, 3]); c.beginPath(); c.moveTo(ax, by + h + 5); c.lineTo(x, y - 2); c.stroke(); c.setLineDash([]); }
      c.fillStyle = 'rgba(30,20,10,.22)'; c.beginPath(); c.roundRect(bx + 1, by + 2, w, h, 9); c.fill();
      c.fillStyle = '#fffdf8'; c.beginPath(); c.roundRect(bx, by, w, h, 9); c.fill(); c.stroke();
      c.fillStyle = '#fffdf8'; c.beginPath(); c.moveTo(ax - 5, by + h - 1); c.lineTo(ax, by + h + 5); c.lineTo(ax + 5, by + h - 1); c.fill();
      c.beginPath(); c.moveTo(ax - 5, by + h); c.lineTo(ax, by + h + 5); c.lineTo(ax + 5, by + h); c.stroke();
      c.fillStyle = col; c.font = '700 15px ' + FONT; c.textAlign = 'center';
      const glyph = a.state === 'waiting' ? (Math.floor(t * 3) % 2 ? '!' : ' ') : WORK.has(a.state) ? SPIN[Math.floor(t * 9) % SPIN.length] : '•';
      c.fillText(glyph, bx + 14, by + h / 2 + 1); c.textAlign = 'left';
      c.font = '700 12px ' + FONT; c.fillStyle = INK; c.fillText(name, bx + 26, by + h / 2 + 1);
      c.font = '400 12px ' + FONT; c.fillStyle = '#6b655c'; c.fillText(act, bx + 26 + wn + 8, by + h / 2 + 1);
    } else if (a.isOwner) {                                 // étiquette du patron
      if (SETTINGS.labels === 'none') continue;
      c.font = '700 10px ' + FONT;
      const name = '★ ' + a.name, w = Math.ceil(c.measureText(name).width) + 12;
      c.fillStyle = 'rgba(198,97,63,.88)'; c.beginPath(); c.roundRect(x - w / 2, fy + 3, w, 14, 7); c.fill();
      c.fillStyle = CREAM; c.textAlign = 'center'; c.fillText(name, x, fy + 10.5); c.textAlign = 'left';
    } else if (hidden) {
      continue;
    } else if (WORK.has(a.state)) {                         // étiquette discrète : spinner + nom
      c.font = '600 10px ' + FONT;
      const name = a.name.length > 16 ? a.name.slice(0, 15) + '…' : a.name;
      const w = Math.ceil(c.measureText(name).width) + 22, h = 15;
      let bx = Math.round(Math.max(2, Math.min(Wc - w - 2, x - w / 2))), by = Math.round(y - h - 3);
      for (let i = 0; i < 6; i++) {
        const hit = placed.find(r => bx < r.x + r.w + 2 && bx + w + 2 > r.x && by < r.y + r.h + 2 && by + h + 2 > r.y);
        if (!hit) break; by = hit.y - h - 2;
      }
      placed.push({ x: bx, y: by, w, h });
      a._bub = toBub(bx, by, w, h);
      c.fillStyle = 'rgba(42,41,39,.72)'; c.beginPath(); c.roundRect(bx, by, w, h, 7); c.fill();
      const glyph = a.state === 'waiting' ? (Math.floor(t * 3) % 2 ? '!' : ' ') : SPIN[Math.floor(t * 9) % SPIN.length];
      c.fillStyle = STATE_COLOR[a.state]; c.font = '700 11px ' + FONT; c.textAlign = 'center'; c.fillText(glyph, bx + 9, by + h / 2 + 1);
      c.textAlign = 'left'; c.font = '600 10px ' + FONT; c.fillStyle = CREAM; c.fillText(name, bx + 17, by + h / 2 + 1);
    } else {
      c.font = '600 10px ' + FONT;
      const name = a.name.length > 16 ? a.name.slice(0, 15) + '…' : a.name, w = Math.ceil(c.measureText(name).width) + 10;
      c.fillStyle = 'rgba(42,41,39,.6)'; c.beginPath(); c.roundRect(x - w / 2, fy + 3, w, 14, 7); c.fill();
      c.fillStyle = 'rgba(250,249,245,.9)'; c.textAlign = 'center'; c.fillText(name, x, fy + 10.5); c.textAlign = 'left';
    }
  }
  HOOKS.overlay.forEach(f => f(c, t));
}

owner = makeOwner();
paintBackground();
let last = performance.now();
function frame(now) { step(now); requestAnimationFrame(frame); }
// secours : si rAF est suspendu (onglet masqué), un timer prend le relais
setInterval(() => { const n = performance.now(); if (n - last > 250) step(n); }, 100);
function step(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  const all = everyone();
  all.forEach(a => updateAgent(a, dt, now));
  cats.forEach(c => updateCat(c, dt, now));
  HOOKS.update.forEach(f => f(dt, now, t));
  g = bufCtx;
  g.drawImage(bg, 0, 0);
  const sky = drawSkyAndLight(t);
  drawInfoScreen(t, sky);
  HOOKS.floor.forEach(f => f(t, sky));
  const items = furniture.map(f => ({ k: f.k, draw: () => f.draw(t) }));
  all.forEach(a => items.push({ k: sortKey(a), draw: () => drawPerson(a, t) }));
  cats.forEach(c => items.push({ k: catKey(c), draw: () => drawCat(c, t) }));
  HOOKS.items.forEach(f => f(items, t, sky));
  items.sort((p, q) => p.k - q.k).forEach(i => i.draw());
  HOOKS.post.forEach(f => f(t, sky));
  if (HOOKS.light.length) HOOKS.light.forEach(f => f(t, sky));
  else if (sky.kind === 'night') { g.fillStyle = 'rgba(20,28,64,.2)'; g.fillRect(0, 0, W, H); }
  layoutView();
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.fillStyle = '#1f1e1d'; dctx.fillRect(0, 0, cv.width, cv.height);
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(buf, Math.round(OXc * dpr), Math.round(OYc * dpr), Math.round(W * S * dpr), Math.round(H * S * dpr));
  overlay(t);
}
resize();
requestAnimationFrame(frame);

/* ---------- souris : survol, clic, zoom molette, glisser pour se déplacer ---------- */
let hoverId = null, hoverCat = null, drag = null, MOUSE = null;
const LASER = { on: false };
function worldAt(e) { const r = cv.getBoundingClientRect(); return toWorld(e.clientX - r.left, e.clientY - r.top); }
function agentAt(e) {
  const [mx, my] = worldAt(e);
  const inside = b => b && mx >= b[0] && mx <= b[0] + b[2] && my >= b[1] && my <= b[1] + b[3];
  const sorted = everyone().sort((p, q) => sortKey(q) - sortKey(p));
  return sorted.find(a => inside(a._bub)) || sorted.find(a => inside(a._box)) || null;
}
cv.addEventListener('click', e => {
  if (drag && drag.moved) return;
  if (LASER.on) return;
  const a = agentAt(e);
  if (!a && hoverCat) {                                      // clic sur un chat : on le caresse
    hoverCat.petUntil = performance.now() + 3000; hoverCat.nextMove = Math.max(hoverCat.nextMove, performance.now() + 5000);
    if (hoverCat.mode === 'sleep') hoverCat.mode = 'sit';
    HOOKS.pet.forEach(f => f(hoverCat));
    return;
  }
  select(a ? a.id : null);
});
cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, cx: VIEW.cx, cy: VIEW.cy, moved: false }; });
window.addEventListener('mouseup', () => { setTimeout(() => { drag = null; }, 0); });
cv.addEventListener('mousemove', e => {
  MOUSE = worldAt(e);
  if (drag && (e.buttons & 1) && !LASER.on) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) { VIEW.cx = drag.cx - dx / S; VIEW.cy = drag.cy - dy / S; clampView(); cv.style.cursor = 'grabbing'; return; }
  }
  const a = agentAt(e); hoverId = a ? a.id : null;
  const [mx, my] = MOUSE;
  hoverCat = a ? null : cats.find(c => c._box && mx >= c._box[0] && mx <= c._box[0] + c._box[2] && my >= c._box[1] && my <= c._box[1] + c._box[3]) || null;
  cv.style.cursor = LASER.on ? 'none' : a || hoverCat ? 'pointer' : VIEW.z > 1 ? 'grab' : 'default';
});
cv.addEventListener('mouseleave', () => { hoverId = null; hoverCat = null; MOUSE = null; });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, [wx, wy] = toWorld(mx, my);
  VIEW.z = Math.max(1, Math.min(5, VIEW.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
  layoutView();
  VIEW.cx = (CW / 2 - mx) / S + wx; VIEW.cy = (CH / 2 - my) / S + wy; clampView();
}, { passive: false });


