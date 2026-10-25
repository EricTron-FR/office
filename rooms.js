'use strict';
/* ====================================================================
   Eric Office : l'étage, côté extérieur et bibliothèque
   Rangée du haut, à droite : la terrasse (colonnes 33-41), vue sur Lyon, pluie réelle.
   Rangée du bas (lignes 17-27, façade / mur du fond lignes 14-16) :
     jardin suspendu (-8..26), au même étage, avec ses Pokémon (pokemon.js) · bibliothèque (28..41)
   Les agents qui lisent longtemps vont bosser à la bibliothèque, sinon ils restent à leur bureau.
   ==================================================================== */
const LOW = { top: 14, floor: 17, bottom: 28 };
const DOORS_DOWN = [10, 29];                          // passages haut → bas (2 cases chacun) : open space → jardin, cafet → bibliothèque
const GARDEN = { x0: -8, x1: 27, y0: 17, y1: 28 };    // le jardin suspendu
const ROOMS = { library: { x0: 28, x1: 42 } };
const inGarden = (x, y) => x >= GARDEN.x0 && x < GARDEN.x1 && y >= GARDEN.y0 && y < GARDEN.y1;

/* ---------- murs et passages ---------- */
for (let y = LOW.top; y < LOW.floor; y++) for (let x = XMIN; x < XMAX; x++) if (!DOORS_DOWN.some(d => x === d || x === d + 1)) block(x, y);
for (let y = LOW.floor; y < LOW.bottom; y++) if (y !== 21 && y !== 22) block(27, y);      // jardin | bibliothèque, porte en 21-22
for (let y = 3; y < 14; y++) if (y !== 7 && y !== 8) block(32, y);                      // mur pause | terrasse
for (let x = GARDEN.x0; x < GARDEN.x1; x++) block(x, 27);                               // barrière du bas
for (let y = GARDEN.y0; y < GARDEN.y1; y++) block(GARDEN.x0, y);                        // barrière de gauche

/* ---------- herbe, chemin, façade, bibliothèque, terrasse (fond fixe) ---------- */
const GRASS = { base: '#7cc46a', dark: '#4f9a4a', light: '#a6e08a' };
const PATH_CELLS = new Set();
for (let y = 17; y < 21; y++) [10, 11].forEach(x => PATH_CELLS.add(x + ',' + y));
for (let x = -5; x < 27; x++) [21, 22].forEach(y => PATH_CELLS.add(x + ',' + y));
const TALL = { x0: 13, x1: 19, y0: 23, y1: 26 };     // hautes herbes (on y croise des Pokémon sauvages…)
const inTall = (x, y) => x >= TALL.x0 && x < TALL.x1 && y >= TALL.y0 && y < TALL.y1;
const POND = { x0: -5, x1: -1, y0: 18, y1: 21 };
for (let y = POND.y0; y < POND.y1; y++) for (let x = POND.x0; x < POND.x1; x++) block(x, y);

function paintGrass(x0, x1, y0, y1) {
  R(x0, y0, x1 - x0, y1 - y0, GRASS.base);
  for (let y = y0; y < y1; y += 8) for (let x = x0; x < x1; x += 8) {
    const h = scatter(x * 31 + y * 7);
    if (h % 3) continue;
    const tx = x + h % 5, ty = y + (h >>> 4) % 5;            // petites touffes en « v »
    R(tx, ty, 1, 2, GRASS.dark); R(tx + 2, ty, 1, 2, GRASS.dark); R(tx + 1, ty + 1, 1, 1, GRASS.dark);
    if (h % 7 === 0) R(tx + 4, ty + 2, 2, 1, GRASS.light);
  }
}
function paintPath() {
  PATH_CELLS.forEach(k => {
    const [cx, cy] = k.split(',').map(Number), x = px(cx), y = py(cy);
    R(x, y, 16, 16, '#ead69c');
    const h = scatter(cx * 97 + cy * 13);
    R(x + h % 12 + 2, y + (h >>> 5) % 12 + 2, 2, 1, '#d2b878'); R(x + (h >>> 9) % 12 + 1, y + (h >>> 13) % 12 + 1, 1, 1, '#f6e8bc');
    // bordure là où le chemin touche l'herbe
    if (!PATH_CELLS.has(cx + ',' + (cy - 1)) && cy > 17) R(x, y, 16, 2, '#c8a868');
    if (!PATH_CELLS.has(cx + ',' + (cy + 1))) R(x, y + 14, 16, 2, '#c8a868');
    if (!PATH_CELLS.has((cx - 1) + ',' + cy)) R(x, y, 2, 16, '#c8a868');
    if (!PATH_CELLS.has((cx + 1) + ',' + cy) && cx < 26) R(x + 14, y, 2, 16, '#c8a868');
  });
}
const FACADE_WINDOWS = [-6, -3, 1, 4, 7, 14, 17, 20, 23];
function paintRooms() {
  const prev = g; g = bg.getContext('2d');
  // terrasse : deck en bois
  planks(px(32), px(42), py(3), py(14), ['#c8a070', '#bf9868', '#cfa878'], '#7a5a3a');
  R(px(42) - 3, py(3), 3, py(14) - py(3), '#5a5f66'); for (let y = py(3); y < py(14); y += 6) R(px(42) - 4, y, 1, 4, '#7a8088');

  // jardin suspendu : herbe, chemin de sable, mare
  paintGrass(px(GARDEN.x0), px(GARDEN.x1), py(GARDEN.y0), py(GARDEN.y1) + 6);
  paintPath();
  const mx0 = px(POND.x0), mx1 = px(POND.x1), my0 = py(POND.y0), my1 = py(POND.y1);
  R(mx0 - 3, my0 - 3, mx1 - mx0 + 6, my1 - my0 + 6, OUT); R(mx0 - 2, my0 - 2, mx1 - mx0 + 4, my1 - my0 + 4, '#b8b0c8');
  for (let x = mx0 - 2; x < mx1 + 2; x += 6) { R(x, my0 - 2, 5, 1, '#d8d0e4'); R(x + 2, my1 + 1, 4, 1, '#8a8098'); }
  R(mx0, my0, mx1 - mx0, my1 - my0, '#4f90d8'); R(mx0, my0, mx1 - mx0, 3, '#3a70b8');
  // bibliothèque : parquet + tapis
  planks(px(28), px(42), py(LOW.floor), py(LOW.bottom), ['#b07a4c', '#a87244', '#b88252'], '#5a3420');
  R(px(30) + 3, py(22) + 3, px(41) - px(30) - 2, py(27) - py(22), OUT);
  R(px(30) + 4, py(22) + 4, px(41) - px(30) - 4, py(27) - py(22) - 2, '#c8402e');
  R(px(30) + 6, py(22) + 6, px(41) - px(30) - 8, py(27) - py(22) - 6, '#f2c14a'); R(px(30) + 7, py(22) + 7, px(41) - px(30) - 10, py(27) - py(22) - 8, '#c8402e');

  // haut de la rangée du bas : tranche du mur vue de dessus
  const cap0 = py(LOW.top), wy0 = cap0 + 5, wy1 = py(LOW.floor);
  R(px(XMIN), cap0, px(XMAX) - px(XMIN), 5, '#4a3e58'); R(px(XMIN), cap0, px(XMAX) - px(XMIN), 1, OUT); R(px(XMIN), cap0 + 4, px(XMAX) - px(XMIN), 1, OUT);
  // façade de l'immeuble côté jardin : crépi crème, poutre, soubassement en pierre, fenêtres
  const fx0 = px(XMIN), fx1 = px(27);
  R(fx0, wy0, fx1 - fx0, wy1 - wy0, '#f4e6c6');
  for (let x = fx0; x < fx1; x += 6) R(x + (scatter(x) % 4), wy0 + 6 + scatter(x + 1) % 20, 1, 1, '#e6d4ae');
  R(fx0, wy0, fx1 - fx0, 3, '#a0643a'); R(fx0, wy0 + 3, fx1 - fx0, 1, '#6a3e22');
  R(fx0, wy1 - 6, fx1 - fx0, 6, '#a8a0b8'); R(fx0, wy1 - 6, fx1 - fx0, 1, '#c8c0d8');
  for (let x = fx0; x < fx1; x += 12) R(x + ((x / 12) % 2 ? 6 : 0), wy1 - 5, 1, 5, '#8a8098');
  FACADE_WINDOWS.forEach(c => {
    const x = px(c) + 2, y = wy0 + 7;
    R(x - 2, y - 2, 16, 21, OUT); R(x - 1, y - 1, 14, 19, '#ffffff');
    R(x, y, 12, 17, '#8cc8f0'); R(x, y, 12, 3, '#6aaee0');
    R(x + 2, y + 9, 1, 3, '#ffffff'); R(x + 3, y + 7, 1, 3, '#ffffff'); R(x + 4, y + 5, 1, 2, '#ffffff');
    R(x + 5, y, 2, 17, '#ffffff'); R(x, y + 8, 12, 1, '#ffffff');
    R(x - 3, y + 18, 18, 3, OUT); R(x - 2, y + 18, 16, 2, '#c8402e');                                  // jardinière sous la fenêtre
    for (let i = 0; i < 4; i++) { R(x - 1 + i * 4, y + 16, 3, 2, LEAF[1]); R(x + i * 4, y + 15, 1, 1, ['#ffd166', '#ff8fb0', '#ffffff', '#ff8fb0'][(c + i) % 4]); }
  });
  // passages : porte vitrée de l'open space, couloir vers la bibliothèque
  DOORS_DOWN.forEach(c => {
    const x0 = px(c);
    R(x0 - 3, cap0, 38, wy1 - cap0, OUT); R(x0 - 2, cap0 + 1, 36, wy1 - cap0 - 1, '#f6efe2');
    R(x0, cap0, 32, wy1 - cap0, c === 10 ? '#e8b878' : '#f2d29c');
    R(x0, cap0, 32, 8, 'rgba(0,0,0,.28)'); R(x0, cap0 + 8, 32, 6, 'rgba(0,0,0,.12)');
  });
  R(px(10) - 1, wy1, 34, 6, OUT); R(px(10), wy1, 32, 5, '#c8402e'); R(px(10) + 2, wy1 + 1, 28, 2, '#e8604a');   // paillasson
  // mur du fond de la bibliothèque
  pkWall(px(27), px(42), wy0, wy1, WALL_TH.library);
  [[px(29) - 3, 38]].forEach(([x, w]) => { R(x, cap0, w, wy1 - cap0, OUT); R(x + 1, cap0 + 1, w - 2, wy1 - cap0 - 1, '#f6efe2'); R(x + 3, cap0, w - 6, wy1 - cap0, '#f2d29c'); R(x + 3, cap0, w - 6, 8, 'rgba(0,0,0,.28)'); });
  panel(px(28) + 4, wy0 + 6, 9, 14, '#6e4632'); R(px(28) + 6, wy0 + 8, 5, 5, CREAM);                  // horloge comtoise
  R(px(XMIN), wy1, px(XMAX) - px(XMIN), 2, 'rgba(30,20,40,.2)');
  g = prev;
}
paintRooms();
// peint un élément de déco fixe sur le fond
function paintExtra(fn) { const prev = g; g = bg.getContext('2d'); fn(); g = prev; }

// murs verticaux (même style que les autres murs de séparation)
function splitWall(tx, topY, doorY, bottomY) {
  furniture.push({ k: py(doorY), draw() {
    const x = px(tx) + 3, faceY = py(doorY) - 14;
    R(x - 1, topY, 12, faceY - topY + 14, OUT); R(x, topY, 10, faceY - topY, '#4a3e58'); R(x + 1, topY, 2, faceY - topY, '#62567a');
    R(x, faceY, 10, 3, '#efe0c2'); R(x, faceY + 3, 10, 8, '#8a5a3c'); R(x, faceY + 3, 10, 1, '#a87452'); R(x, faceY + 11, 10, 3, '#4a2c1c');
  } });
  furniture.push({ k: py(bottomY) + 1, draw() {
    const x = px(tx) + 3, top = py(doorY + 2) - 14;
    R(x - 1, top - 1, 12, py(bottomY) - top + 1, OUT); R(x, top, 10, py(bottomY) - top, '#4a3e58'); R(x + 1, top, 2, py(bottomY) - top, '#62567a');
  } });
}
splitWall(27, py(LOW.top) + 5, 21, LOW.bottom);
splitWall(32, OYp + 2, 7, 14);

/* ---------- sièges de travail de la bibliothèque ---------- */
function seat(cell, opts) { return Object.assign({ type: 'seat', cell, stand: [cell[0], cell[1] + 1] }, opts); }
const ZONE_SEATS = {
  library: [31, 34, 37, 40].map(x => seat([x, 21], { zone: 'library', pos: [px(x) + 8, py(21) + 12], k: py(21) + 12, face: 'down', legs: 'sit', act: 'book', label: 'Lit la doc' }))
};
ZONE_SEATS.library.forEach(s => block(...s.cell));
// en pause, on peut aussi venir lire à la bibliothèque
ZONE_SEATS.library.forEach(s => IDLE_SEATS.push(Object.assign(Object.create(s), { w: 8, label: 'Lit un bouquin à la bibliothèque', act: 'book', zone: undefined, ok: () => !seatTaken(s) })));

// un agent qui lit longtemps (doc, web, recherche) file à la bibliothèque (vote sur 40 s, avec un temps minimum avant de changer)
function zoneCat(a) {
  if (!WORK.has(a.state)) return null;
  return a.state === 'reading' ? 'library' : 'desk';
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
    const lib = a.votes.filter(v => v === 'library').length / a.votes.length;
    const want = lib >= 0.35 ? 'library' : 'desk';
    if (want === (a.zone || 'desk')) return;
    if (want === 'desk') { a.zone = null; a.zoneSeat = null; a.zoneAt = now; return; }
    const s = ZONE_SEATS.library.find(s => !seatTaken(s, a));
    if (!s) return;
    a.zone = want; a.zoneSeat = s; a.zoneAt = now;
    news('📚', a.name + ' file à la bibliothèque');
  });
});
const zoneAgent = s => everyone().find(o => o.seat === s && o.mode === 'sit');

/* ---------- bibliothèque ---------- */
seed = 17;
furniture.push({ k: py(18) - 1, draw() {             // grandes étagères contre le mur
  const x0 = px(32) + 1, x1 = px(42) - 2, top = py(17) - 30, bot = py(18) - 2;
  panel(x0, top, x1 - x0, bot - top, '#7a4a30'); R(x0, top, x1 - x0, 2, '#9a6444');
  seed = 17;
  for (let s = 0; s < 4; s++) {
    const iy = top + 4 + s * 11;
    R(x0 + 2, iy, x1 - x0 - 4, 9, '#3e2418');
    for (let x = x0 + 3; x < x1 - 4;) {
      const bw = 2 + Math.floor(rnd() * 2), bh = 6 + Math.floor(rnd() * 3);
      const c = ['#e0533f', '#4f86d6', '#5fae5a', '#f2b23a', '#f6efe2', '#9b6fd6', '#3a3040', '#e0607a'][Math.floor(rnd() * 8)];
      R(x, iy + 9 - bh, bw, bh, c); R(x, iy + 9 - bh, 1, bh, shade(c, 0.2));
      x += bw + (rnd() < 0.1 ? 3 : 0);
    }
    R(x0 + 1, iy + 9, x1 - x0 - 2, 2, '#9a6444');
  }
  R(px(36), top - 2, 2, bot - top + 2, '#c08a5a'); R(px(36) + 6, top - 2, 2, bot - top + 2, '#c08a5a');   // échelle
  for (let y = top + 2; y < bot; y += 6) R(px(36), y, 8, 1, '#c08a5a');
} });
for (let x = 32; x < 42; x++) block(x, 17);
ZONE_SEATS.library.forEach((s, i) => furniture.push({ k: s.k - 1, draw() {   // fauteuils club + lampe
  const cx = px(s.cell[0]) + 8, by = py(s.cell[1]) + 14;
  R(cx - 9, by, 18, 2, SHADOW);
  panel(cx - 8, by - 18, 16, 10, '#a83a2a');
  panel(cx - 9, by - 9, 18, 8, '#c8402e'); panel(cx - 10, by - 13, 3, 12, '#8a2a1c'); panel(cx + 7, by - 13, 3, 12, '#8a2a1c');
  if (i % 2 === 0) { R(cx + 13, by - 22, 1, 20, '#c9952f'); panel(cx + 10, by - 26, 7, 5, '#ffe08a'); }
} }));
furniture.push({ k: py(25) + 2, draw() {             // grande table avec lampes de banquier
  const x0 = px(33) + 2, y0 = py(24) + 4;
  R(x0, y0 + 14, 60, 2, SHADOW);
  panel(x0, y0, 60, 8, '#8a5236'); panel(x0, y0 + 8, 60, 5, '#6a3a24');
  [[10], [44]].forEach(([dx]) => { R(x0 + dx + 2, y0 - 6, 1, 6, '#c9952f'); panel(x0 + dx, y0 - 9, 7, 3, '#3f9a5a'); });
  panel(x0 + 22, y0 + 2, 8, 4, '#ffffff'); R(x0 + 26, y0 + 2, 1, 4, '#c9c2b4'); panel(x0 + 34, y0 + 1, 5, 5, '#4f86d6');
} });
[33, 34, 35, 36].forEach(x => block(x, 24));

/* ---------- terrasse ---------- */
const badWeather = () => { const s = skyState(Date.now()); return s.rain || s.snow || s.storm; };
const TERRACE_OK = () => !badWeather();
// la terrasse et le jardin sont interdits (balades, chats…) quand il pleut, neige ou fait de l'orage
function outsideBlocked(cell) { return ((cell[0] >= 33 && cell[1] < 14) || inGarden(cell[0], cell[1])) && badWeather(); }
const isOutside = o => (o.x >= 33 && o.y < 14) || inGarden(Math.floor(o.x), Math.floor(o.y));
let shelterTick = 0;
HOOKS.update.push((dt, now) => {                       // il se met à pleuvoir : tout le monde rentre
  if (now < shelterTick) return; shelterTick = now + 2000;
  if (!badWeather()) return;
  cats.forEach(c => {
    const tgt = c.path.length ? c.path[c.path.length - 1] : null;
    if (c.ride || c.chasing) return;
    if (isOutside(c) || (tgt && outsideBlocked(tgt))) { c.spot = null; c.path = []; c.nextMove = 0; c.z = 0; c.mode = 'walk'; catGo(c, [27, 8], null); }
  });
  everyone().forEach(a => {
    if (isOutside(a) && !a.path.length && !WORK.has(a.state) && !a.isOwner && !a.override) { a.nextMove = 0; standUp(a); }
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
  panel(cx - 7, by - 22, 14, 10, '#d8b080'); for (let x = cx - 6; x < cx + 7; x += 3) R(x, by - 21, 2, 8, x % 2 ? '#ffffff' : '#4f86d6');
  panel(cx - 7, by - 12, 14, 9, '#c8a070'); for (let x = cx - 6; x < cx + 7; x += 3) R(x, by - 11, 2, 7, x % 2 ? '#ffffff' : '#4f86d6');
  R(cx - 7, by - 3, 1, 3, '#8a6a42'); R(cx + 6, by - 3, 1, 3, '#8a6a42');
} }));
furniture.push({ k: py(11) - 2, draw() {               // table de café
  const x0 = px(38) + 6, y0 = py(10) + 3;
  R(x0, y0 + 11, 22, 2, SHADOW); panel(x0, y0, 20, 6, '#ffffff'); R(x0 + 9, y0 + 6, 2, 6, '#8a8f96');
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
  for (let i = 0; i < 14; i++) R(cx - 14 + i * 2, y0 + Math.abs(7 - i) / 2 | 0, 2, 5, i % 2 ? '#ffffff' : '#e0533f');
  R(cx - 1, y0 - 1, 3, 2, '#5a5f66');
});
[34, 36, 38, 40].forEach(x => { block(x, 13); furniture.push({ k: py(13) + 14, draw() {     // jardinières fleuries
  const x0 = px(x) + 1;
  panel(x0, py(13) + 7, 14, 7, '#a0643a'); R(x0, py(13) + 7, 14, 2, '#6a3e22');
  leaves(x0 + 7, py(13) + 7, [[-6, -5, 3, 5, '#6f8a52'], [-2, -7, 3, 7, '#7f9c5f'], [3, -5, 3, 5, '#6f8a52']]);
  R(x0 + 2, py(13) + 2, 2, 2, ['#ff8fb0', '#ffd166', '#c9a0ff', '#ff8fb0'][x % 4]); R(x0 + 10, py(13) + 1, 2, 2, ['#ffd166', '#ff8fb0', '#ffffff', '#c9a0ff'][x % 4]);
} }); });
// le ciel au-dessus de la terrasse : vue sur Lyon (Fourvière, la tour métallique, le Crayon et l'Incity)
HOOKS.floor.push(t => {
  const sk = skyState(Date.now()), x0 = px(32) + 13, x1 = px(42) - 3, y0 = OYp, y1 = py(3);
  const night = sk.kind === 'night';
  for (let y = y0; y < y1; y++) R(x0, y, x1 - x0, 1, mix(sk.top, sk.bot, (y - y0) / (y1 - y0)));
  if (night && !sk.grey) for (let x = x0; x < x1; x += 3) { const h = hash('t' + x); if (h % 7 === 0) R(x, y0 + 2 + h % 20, 1, 1, (Math.floor(t) + h) % 4 ? '#e8ecff' : '#8a93b8'); }
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

/* ---------- la vraie pluie (ou neige) de Lyon : sur la terrasse et sur le jardin ---------- */
// nombre pseudo-aléatoire bien réparti (xorshift) : évite que les gouttes voisines tombent en paquets
function scatter(n) { n = (n * 2654435761 + 1013904223) >>> 0; n ^= n << 13; n >>>= 0; n ^= n >>> 17; n ^= n << 5; return n >>> 0; }
const WET = [
  { x0: px(32) + 13, x1: px(42) - 3, top: OYp, floor0: py(3), bot: py(14), splash: { x0: 33.2, x1: 41.6, y0: 3.4, y1: 13.6 },
    puddles: [[35, 8.4, 16], [38.5, 12.3, 12], [34.2, 11.2, 9], [40.3, 7.5, 13], [36.8, 4.6, 8]] },
  { x0: px(GARDEN.x0), x1: px(GARDEN.x1), top: py(LOW.floor) - 18, floor0: py(LOW.floor), bot: py(LOW.bottom) + 6, splash: { x0: -7, x1: 26.6, y0: 17.2, y1: 26.8 },
    puddles: [[4, 21.6, 16], [12.5, 22.4, 14], [20.2, 21.5, 12], [10.6, 18.6, 10], [-2.4, 22.3, 12]] }
];
HOOKS.post.push(t => {
  const sk = skyState(Date.now()); if (!sk.rain && !sk.snow) return;
  WET.forEach((z, zi) => {
    const { x0, x1, top, floor0, bot } = z, w = x1 - x0, h = bot - top, big = w > 300 ? 3 : 1;
    g.save(); g.beginPath(); g.rect(x0 - (zi ? 0 : 13), top, x1 - x0 + (zi ? 0 : 13), bot - top); g.clip();
    if (sk.rain) {
      const c = WX.code ?? 61, drizzle = c >= 51 && c <= 57, heavy = (c >= 63 && c <= 67) || c >= 81 || sk.storm;
      const wind = Math.max(0.3, Math.min(1.6, (WX.wind || 8) / 14));     // inclinaison selon le vent
      g.fillStyle = 'rgba(30,50,80,' + (drizzle ? 0.07 : 0.14) + ')'; g.fillRect(x0 - 13, floor0, w + 13, bot - floor0);
      z.puddles.forEach(([tx, ty, pw], i) => {                             // flaques avec ronds dans l'eau
        const cx = px(tx), cy = py(ty);
        g.fillStyle = 'rgba(110,140,185,.38)'; g.fillRect(cx - pw / 2, cy - 1, pw, 3); g.fillRect(cx - pw / 2 + 2, cy - 2, pw - 4, 5);
        R(cx - pw / 2 + 2, cy - 2, pw - 6, 1, 'rgba(200,220,245,.35)');
        const p = (t * (heavy ? 1.6 : 1) + i * 0.37) % 1, rw = Math.round(2 + p * (pw / 2 - 2));
        g.globalAlpha = 0.7 * (1 - p);
        R(cx - rw, cy, 1, 1, '#dfeaf8'); R(cx + rw, cy, 1, 1, '#dfeaf8'); R(cx - 1, cy - 1 - Math.round(p), 3, 1, '#dfeaf8'); R(cx - 1, cy + 1 + Math.round(p), 3, 1, '#dfeaf8');
        g.globalAlpha = 1;
      });
      // gouttes : couche lointaine (fine, pâle) et couche proche (longue, nette), inclinées par le vent
      const n = (drizzle ? 70 : heavy ? 190 : 120) * big;
      for (let i = 0; i < n; i++) {
        const hh = scatter(i + 1 + zi * 77777), near = i % 3 === 0, len = drizzle ? 2 : near ? 7 : 4, sp = near ? 210 : 140;
        const x = x0 + hh % w, y = top + ((hh >>> 3) % h + t * sp) % h;
        const col = near ? 'rgba(215,228,250,.65)' : 'rgba(190,205,235,.32)';
        const xx = x0 + (((x - x0 - wind * (y - top) * 0.3) % w) + w) % w;
        for (let k = 0; k < len; k++) R(Math.round(xx - wind * k * 0.4), Math.round(y + k), 1, 1, col);
      }
      // éclaboussures qui rebondissent au sol
      const m = (drizzle ? 10 : heavy ? 36 : 22) * big, S0 = z.splash;
      for (let i = 0; i < m; i++) {
        const cyc = Math.floor(t * 1.8 + i * 0.13), p = (t * 1.8 + i * 0.13) % 1, hh = scatter(i * 7919 + cyc * 104729 + zi);
        const sx = px(S0.x0 + (hh % 1000) / 1000 * (S0.x1 - S0.x0)), sy = py(S0.y0 + ((hh >>> 10) % 1000) / 1000 * (S0.y1 - S0.y0));
        if (BLOCKED.has(Math.floor((sx - OXp) / T + XMIN) + ',' + Math.floor((sy - OYp) / T))) continue;
        const col = 'rgba(225,235,250,.75)';
        if (p < 0.12) R(sx, sy, 1, 1, col);
        else if (p < 0.26) { R(sx - 1, sy - 1, 1, 1, col); R(sx + 1, sy - 1, 1, 1, col); R(sx, sy - 2, 1, 1, col); }
        else if (p < 0.4) { R(sx - 2, sy, 1, 1, 'rgba(225,235,250,.45)'); R(sx + 2, sy, 1, 1, 'rgba(225,235,250,.45)'); }
      }
      if (!zi) for (let i = 0; i < 4; i++) { const p = (t * 1.3 + i * 0.25) % 1; R(px(39) - 13 + i * 9, py(10) - 20 + Math.round(p * 22), 1, 2, 'rgba(215,228,250,.6)'); }   // gouttes du parasol
    } else {
      // neige : flocons de tailles variées qui dérivent, fine couche blanche au sol
      g.fillStyle = 'rgba(240,245,250,.18)'; g.fillRect(x0 - 13, floor0, w + 13, bot - floor0);
      for (let i = 0; i < 110 * big; i++) {
        const hh = scatter(i + 50000 + zi * 999), bg2 = i % 4 === 0, sp = bg2 ? 22 : 14;
        const y = top + ((hh >>> 3) % h + t * sp) % h, x = x0 + (hh % w) + Math.round(Math.sin(t * 0.8 + i) * (bg2 ? 3 : 2));
        R(x, y, bg2 ? 2 : 1, bg2 ? 2 : 1, bg2 ? '#ffffff' : 'rgba(255,255,255,.75)');
      }
    }
    g.restore();
  });
});

/* ====================================================================
   Déco (chaque objet un peu utile devient aussi une activité de pause)
   ==================================================================== */
const deco = (tx, ty, k, draw, solid) => { if (solid !== false) block(tx, ty); furniture.push({ k: k != null ? k : py(ty + 1), draw }); };
const near = (cell) => everyone().some(a => !a.path.length && !a.heading && Math.abs(a.x - cell[0] - 0.5) < 0.6 && Math.abs(a.y - cell[1] - 0.5) < 0.6);
const pot = (cx, by, big) => {
  panel(cx - (big ? 5 : 4), by - (big ? 9 : 7), big ? 10 : 8, big ? 9 : 7, '#c8603a'); R(cx - (big ? 5 : 4), by - (big ? 9 : 7), big ? 10 : 8, 2, '#e07a50');
  leaves(cx, by - (big ? 9 : 7), big
    ? [[-7, -14, 4, 12, '#5d7745'], [3, -16, 4, 14, '#5d7745'], [-3, -24, 3, 22, '#6f8a52'], [1, -20, 3, 18, '#7f9c5f'], [-9, -7, 5, 4, '#6f8a52']]
    : [[-6, -6, 3, 6, '#6f8a52'], [-2, -11, 3, 11, '#7f9c5f'], [3, -7, 3, 7, '#86a566']]);
};

/* --- bibliothèque --- */
deco(29, 25, py(26), t => {                          // globe terrestre
  const cx = px(29) + 8, by = py(25) + 14, sp = Math.floor(t * 2) % 4;
  R(cx - 4, by, 8, 2, SHADOW); R(cx - 3, by - 2, 6, 2, '#6e4632'); R(cx, by - 5, 1, 3, '#c9952f');
  panel(cx - 4, by - 13, 8, 8, '#4f86d6'); R(cx - 3 + sp, by - 11, 2, 3, '#5fae5a'); R(cx - 2 + ((sp + 2) % 4), by - 8, 2, 2, '#5fae5a');
});
deco(40, 25, py(26), () => {                         // chariot de livres
  const x0 = px(40) + 1, by = py(25) + 14;
  R(x0, by, 14, 2, SHADOW); panel(x0, by - 12, 14, 9, '#8a5a40');
  for (let i = 0; i < 6; i++) R(x0 + 1 + i * 2, by - 17 + (i % 2), 2, 6 - (i % 2), ['#e0533f', '#4f86d6', '#5fae5a', '#f2b23a', '#9b6fd6', '#ffffff'][i]);
  R(x0 + 1, by - 2, 2, 2, '#3a3835'); R(x0 + 11, by - 2, 2, 2, '#3a3835');
});
[32.5, 35.5, 38.5].forEach(x => furniture.push({ k: py(22) - 1, draw(t) {   // guéridons avec théière
  const cx = px(x) + 8, by = py(21) + 13;
  R(cx - 4, by, 8, 1, SHADOW); R(cx, by - 7, 1, 7, '#6e4632'); panel(cx - 4, by - 9, 9, 2, '#8a5a40');
  panel(cx - 2, by - 13, 5, 4, '#ffffff'); R(cx + 3, by - 12, 1, 2, '#ffffff');
  const p = (t * 0.6 + x) % 1; g.globalAlpha = 0.7 - p * 0.7; R(cx, by - 15 - Math.round(p * 6), 1, 1, '#ffffff'); g.globalAlpha = 1;
} }));
deco(38, 26, py(27), () => {                         // piles de livres par terre
  const x0 = px(38) + 2, by = py(26) + 14;
  [[0, 0, '#e0533f'], [1, 3, '#4f86d6'], [0, 6, '#5fae5a'], [2, 9, '#f2b23a']].forEach(([dx, dy, c]) => panel(x0 + dx, by - 3 - dy, 10, 3, c));
  [[13, 0, '#9b6fd6'], [12, 3, '#ffffff']].forEach(([dx, dy, c]) => panel(x0 + dx - 1, by - 3 - dy, 8, 3, c));
});
[[28, 27], [41, 27], [28, 19]].forEach(([x, y], i) => deco(x, y, py(y) + 14, () => pot(px(x) + 8, py(y) + 14, i === 2)));
SPOTS.push(
  { cell: [33, 18], face: 'up', label: 'Range des livres', w: 5 },
  { cell: [38, 18], face: 'up', label: 'Choisit un livre', w: 5 },
  { cell: [34, 25], face: 'up', label: 'Feuillette un livre à la grande table', w: 5, act: 'book' }
);

/* --- terrasse --- */
paintExtra(() => {                                   // tapis d'extérieur sous les transats
  R(px(33) + 5, py(5) + 1, px(38) - px(33) - 6, py(8) - py(5), OUT);
  R(px(33) + 6, py(5) + 2, px(38) - px(33) - 8, py(8) - py(5) - 2, '#3f9aa0');
  for (let x = px(33) + 8; x < px(38) - 4; x += 6) R(x, py(5) + 4, 3, py(8) - py(5) - 6, '#5fb8b8');
});
deco(41, 5, py(6), t => {                            // barbecue
  const cx = px(41) + 7, by = py(5) + 14, on = near([40, 5]);
  R(cx - 6, by, 12, 2, SHADOW); R(cx - 4, by - 6, 1, 6, '#3a3835'); R(cx + 3, by - 6, 1, 6, '#3a3835');
  panel(cx - 6, by - 11, 12, 5, '#3a3040'); R(cx - 5, by - 12, 10, 1, '#55524c');
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
  R(x0, by, 29, 2, SHADOW); panel(x0, by - 6, 28, 3, '#b8703e'); R(x0 + 1, by - 3, 1, 3, '#6e4c38'); R(x0 + 26, by - 3, 1, 3, '#6e4c38');
  panel(x0, by - 14, 28, 2, '#b8703e'); R(x0 + 2, by - 12, 1, 6, '#6e4c38'); R(x0 + 25, by - 12, 1, 6, '#6e4c38');
});
[[33, 12], [41, 12]].forEach(([x, y]) => deco(x, y, py(y) + 14, () => {   // oliviers en pot
  const cx = px(x) + 8, by = py(y) + 14;
  panel(cx - 5, by - 8, 10, 8, '#e8dcc4'); R(cx, by - 20, 2, 12, '#7a5a3c');
  leaves(cx + 1, by - 18, [[-8, -6, 6, 5, '#7f9463'], [2, -8, 6, 6, '#8ea472'], [-4, -12, 7, 5, '#93a978'], [-2, -3, 8, 4, '#7f9463']]);
}));
SPOTS.push(
  { cell: [40, 5], face: 'right', label: 'Fait griller des saucisses', w: 4, ok: TERRACE_OK, act: 'bbq' },
  { cell: [40, 3], face: 'right', label: 'Regarde Lyon à la longue-vue', w: 4, ok: TERRACE_OK }
);
IDLE_SEATS.push(seat([34, 9], { pos: [px(33) + 16, py(9) + 11], k: py(9) + 11.5, face: 'down', legs: 'sit', w: 4, ok: TERRACE_OK, label: 'Se pose sur le banc', stand: [34, 10] }));
block(34, 9);

/* ====================================================================
   Jardin suspendu : arbres, mare, hautes herbes, potager, pique-nique…
   (les Pokémon qui y vivent sont dans pokemon.js)
   ==================================================================== */
// arbre façon Pokémon : grosse boule de feuillage en couches, contour sombre, tronc court
// disque pixel (ellipse pleine), ligne par ligne
function disc(cx, cy, rx, ry, c) {
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); R(cx - w, cy + y, w * 2 + 1, 1, c); }
}
function pkTree(cx, by, small) {
  const r = small ? 0.68 : 1, s = v => Math.round(v * r);
  R(cx - s(14), by - 2, s(28), 4, SHADOW);
  panel(cx - 3, by - s(12), 6, s(12), '#8a5a34'); R(cx - 2, by - s(12), 1, s(12), '#a8703e');
  const ccy = by - s(27);
  disc(cx, ccy, s(16) + 1, s(14) + 1, '#1f3a24');                           // contour
  disc(cx, ccy, s(16), s(14), LEAF[0]);
  disc(cx - s(2), ccy - s(3), s(13), s(10), LEAF[1]);                       // couches de feuillage
  disc(cx - s(5), ccy - s(6), s(7), s(5), LEAF[2]);
  [[-9, 2], [6, -4], [-2, 7], [9, 5], [-11, -6], [1, -10]].forEach(([x, y]) => { R(cx + s(x), ccy + s(y), 3, 2, '#2f7a3a'); R(cx + s(x) + 1, ccy + s(y) - 1, 2, 1, LEAF[3]); });
  R(cx - s(8), ccy - s(9), 3, 1, '#b8f0a0'); R(cx - s(10), ccy - s(7), 2, 1, '#b8f0a0');   // reflet
}
const TREES = [[-6, 25], [24, 25], [24, 18], [-6, 23.0001]].slice(0, 3);
TREES.forEach(([x, y]) => { block(x, y); block(x + 1, y); furniture.push({ k: py(y) + 14, draw() { pkTree(px(x + 1), py(y) + 14); } }); });
// barrière blanche tout autour (bas et gauche)
furniture.push({ k: py(27) + 14, draw() {
  const y = py(27) + 4;
  R(px(GARDEN.x0), y + 3, px(GARDEN.x1) - px(GARDEN.x0), 1, OUT); R(px(GARDEN.x0), y + 8, px(GARDEN.x1) - px(GARDEN.x0), 1, OUT);
  R(px(GARDEN.x0), y + 4, px(GARDEN.x1) - px(GARDEN.x0), 2, '#ffffff'); R(px(GARDEN.x0), y + 9, px(GARDEN.x1) - px(GARDEN.x0), 2, '#ffffff');
  for (let x = px(GARDEN.x0) + 2; x < px(GARDEN.x1); x += 8) { R(x - 1, y - 1, 5, 14, OUT); R(x, y, 3, 12, '#ffffff'); R(x, y, 3, 1, '#f6f2e8'); R(x + 2, y + 1, 1, 11, '#d8d4e4'); }
} });
furniture.push({ k: py(17), draw() {
  const x = px(GARDEN.x0) + 6;
  for (let y = py(17); y < py(27) + 4; y += 8) { R(x - 1, y - 1, 5, 10, OUT); R(x, y, 3, 8, '#ffffff'); R(x + 2, y, 1, 8, '#d8d4e4'); }
  R(x - 3, py(17), 1, py(27) - py(17) + 4, OUT); R(x + 4, py(17), 1, py(27) - py(17) + 4, OUT);
} });
// la mare : reflets qui bougent, nénuphars
HOOKS.floor.push(t => {
  const x0 = px(POND.x0), x1 = px(POND.x1), y0 = py(POND.y0), y1 = py(POND.y1);
  for (let i = 0; i < 7; i++) {
    const h = scatter(i + 300), p = (t * 0.25 + (h % 100) / 100) % 1, x = x0 + 3 + h % (x1 - x0 - 10), y = y0 + 6 + (h >>> 7) % (y1 - y0 - 10);
    R(x + Math.round(p * 4), y, 4, 1, 'rgba(255,255,255,' + (0.55 - Math.abs(p - 0.5)).toFixed(2) + ')');
  }
  [[x0 + 6, y0 + 9], [x1 - 14, y1 - 12], [x0 + 26, y0 + 22]].forEach(([x, y], i) => {
    const b = Math.round(Math.sin(t * 1.2 + i));
    R(x - 1, y - 1 + b, 9, 6, '#1f5a2c'); R(x, y + b, 7, 4, '#5fb85a'); R(x + 3, y + b, 2, 2, '#4f9a4a');
    if (i === 1) { R(x + 1, y - 2 + b, 3, 2, '#ff9ad5'); R(x + 2, y - 3 + b, 1, 1, '#ffffff'); }
  });
});
// petites fleurs qui se balancent dans l'herbe
const FLOWERS = [];
for (let i = 0; i < 46; i++) {
  const h = scatter(i * 131 + 7), cx = GARDEN.x0 + 1 + h % (GARDEN.x1 - GARDEN.x0 - 1), cy = GARDEN.y0 + (h >>> 8) % (GARDEN.y1 - GARDEN.y0 - 1);
  if (BLOCKED.has(cx + ',' + cy) || PATH_CELLS.has(cx + ',' + cy) || inTall(cx, cy)) continue;
  FLOWERS.push({ x: px(cx) + 3 + (h >>> 3) % 10, y: py(cy) + 4 + (h >>> 12) % 9, c: ['#ff6b6b', '#ffd166', '#ffffff', '#ff9ad5', '#9fc8ff'][h % 5], ph: (h % 100) / 100 });
}
HOOKS.floor.push(t => {
  FLOWERS.forEach(f => {
    const s = Math.floor(t * 1.4 + f.ph * 2) % 2;
    R(f.x, f.y + 2, 1, 2, '#3f8f4a');
    R(f.x - 1 + s, f.y, 1, 1, f.c); R(f.x + 1 + s, f.y, 1, 1, f.c); R(f.x + s, f.y - 1, 1, 1, f.c); R(f.x + s, f.y + 1, 1, 1, f.c); R(f.x + s, f.y, 1, 1, '#ffd166');
  });
});
// hautes herbes : elles recouvrent le bas des persos (comme dans Pokémon) et bougent quand on passe
const tallBusy = (cx, cy) => [...everyone(), ...cats, ...(typeof MONS !== 'undefined' ? MONS : [])].some(o => Math.floor(o.x) === cx && Math.floor(o.y) === cy);
for (let y = TALL.y0; y < TALL.y1; y++) for (let x = TALL.x0; x < TALL.x1; x++) furniture.push({ k: py(y) + 12, draw(t) {
  const x0 = px(x), y0 = py(y), wig = tallBusy(x, y) ? (Math.floor(t * 8) % 2 ? 1 : -1) : 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const bx = x0 + i * 8, by = y0 + 3 + j * 7;
    R(bx, by + 2, 8, 6, '#2f7a3a');
    R(bx + 1 + wig, by, 2, 6, '#5fb85a'); R(bx + 4, by - 1, 2, 7, '#4fa858'); R(bx + 6 - wig, by + 1, 2, 5, '#5fb85a');
    R(bx + 1 + wig, by, 1, 1, '#a6e08a'); R(bx + 4, by - 1, 1, 1, '#a6e08a');
  }
} });
// boîte aux lettres : le drapeau se lève quand les agents s'écrivent
const MAILBOX = { up: 0 };
deco(8, 17, py(17) + 14, t => {
  const cx = px(8) + 8, by = py(17) + 14;
  R(cx - 5, by, 10, 2, SHADOW); R(cx - 1, by - 8, 3, 8, '#8a5a34');
  panel(cx - 6, by - 17, 12, 9, '#e0533f'); R(cx - 4, by - 14, 8, 2, OUT);
  const up = performance.now() < MAILBOX.up;
  if (up) { R(cx + 6, by - 22, 1, 8, OUT); R(cx + 7, by - 22, 4, 3, '#ffd166'); }
  else { R(cx + 6, by - 13, 5, 1, OUT); R(cx + 7, by - 12, 4, 2, '#ffd166'); }
});
// panneau en bois
deco(13, 18, py(18) + 14, () => {
  const cx = px(13) + 8, by = py(18) + 14;
  R(cx - 9, by, 18, 2, SHADOW); R(cx - 6, by - 6, 2, 6, '#6a3e22'); R(cx + 4, by - 6, 2, 6, '#6a3e22');
  panel(cx - 14, by - 16, 28, 10, '#c8803e'); R(cx - 13, by - 15, 26, 1, '#e8a060');
  pixText('JARDIN', cx - 11, by - 13, '#3a2214');
});
SPOTS.push({ cell: [13, 19], face: 'up', label: 'Lit le panneau du jardin', w: 2, ok: TERRACE_OK });
// banc du jardin, contre la façade
const GBENCH = [4, 5].map(x => seat([x, 18], { pos: [px(x) + 8, py(18) + 8], k: py(18) + 9, face: 'down', legs: 'sit', w: 6, ok: TERRACE_OK, label: 'Prend le soleil sur le banc', stand: [x, 19] }));
GBENCH.forEach(s => { IDLE_SEATS.push(s); block(...s.cell); });
furniture.push({ k: py(18) + 8, draw() {
  const x0 = px(4) + 1, by = py(18) + 13;
  R(x0, by, 30, 2, SHADOW);
  panel(x0, by - 17, 30, 6, '#b8703e'); R(x0, by - 14, 30, 1, '#8a5030');
  panel(x0, by - 8, 30, 4, '#c8803e'); R(x0 + 2, by - 4, 2, 4, '#6a3e22'); R(x0 + 26, by - 4, 2, 4, '#6a3e22');
} });
// arbre à baies (comme les baies Pokémon)
deco(21, 18, py(18) + 14, t => {
  const cx = px(21) + 8, by = py(18) + 14;
  pkTree(cx, by, true);
  [[-6, -18, '#e0533f'], [3, -21, '#4f86d6'], [-2, -24, '#e0533f'], [5, -15, '#f2b23a'], [-7, -12, '#4f86d6']].forEach(([x, y, c]) => { R(cx + x - 1, by + y - 1, 4, 4, OUT); R(cx + x, by + y, 2, 2, c); R(cx + x, by + y, 1, 1, '#ffffff'); });
});
SPOTS.push({ cell: [21, 19], face: 'up', label: 'Cueille des baies', w: 5, ok: TERRACE_OK, act: 'berry' });
// potager clôturé
for (let y = 24; y < 26; y++) for (let x = 1; x < 6; x++) block(x, y);
furniture.push({ k: py(25) + 14, draw(t) {
  const x0 = px(1), y0 = py(24), w = 80, h = 32;
  R(x0 + 1, y0 + 2, w - 2, h - 4, '#8a5a34');
  for (let r = 0; r < 3; r++) {
    R(x0 + 3, y0 + 5 + r * 9, w - 6, 4, '#6a4024'); R(x0 + 3, y0 + 5 + r * 9, w - 6, 1, '#a0703e');
    for (let i = 0; i < 8; i++) {
      const sx = x0 + 6 + i * 9, sy = y0 + 4 + r * 9, kind = (i + r) % 3;
      if (kind === 0) { R(sx, sy - 2, 1, 3, LEAF[2]); R(sx + 2, sy - 2, 1, 3, LEAF[2]); R(sx + 1, sy, 1, 2, '#f08a3a'); }          // carottes
      else if (kind === 1) { blob(sx, sy - 2, 4, 3, LEAF[1], '#1f3a24'); }                                                         // salades
      else { R(sx + 1, sy - 3, 1, 4, LEAF[0]); R(sx, sy - 1, 3, 2, '#e0533f'); }                                                     // tomates
    }
  }
  [y0, y0 + h - 3].forEach(yy => { R(x0, yy, w, 3, OUT); R(x0, yy + 1, w, 1, '#ffffff'); });
  for (let x = x0; x <= x0 + w; x += 10) { R(x - 1, y0 - 3, 3, h + 3, OUT); R(x, y0 - 2, 1, h + 1, '#ffffff'); }
} });
SPOTS.push({ cell: [3, 23], face: 'down', label: 'Arrose le potager', w: 5, ok: TERRACE_OK, act: 'water' });
HOOKS.post.push(t => {                               // l'arrosoir et l'eau qui coule
  everyone().forEach(a => {
    if (a.act !== 'water' || a.path.length || a.heading || !a._anchor) return;
    const x = a._anchor.x + 5, y = a._anchor.y + 16;
    panel(x, y, 5, 4, '#4f86d6'); R(x + 5, y + 1, 3, 1, '#4f86d6');
    for (let i = 0; i < 3; i++) { const p = (t * 2 + i / 3) % 1; R(x + 8, y + 2 + Math.round(p * 7), 1, 1, '#9fd0ff'); }
  });
});
// pique-nique : couverture à carreaux + panier
furniture.push({ k: py(24) - 2, draw() {
  const x0 = px(20) + 2, y0 = py(24) + 2;
  R(x0 - 1, y0 - 1, 46, 26, OUT);
  for (let y = 0; y < 24; y += 4) for (let x = 0; x < 44; x += 4) R(x0 + x, y0 + y, 4, 4, ((x + y) / 4) % 2 ? '#e0533f' : '#ffffff');
} });
deco(21, 24, py(24) + 12, () => {
  const cx = px(21) + 8, by = py(24) + 12;
  panel(cx - 6, by - 7, 12, 7, '#c8803e'); for (let x = cx - 5; x < cx + 6; x += 2) R(x, by - 6, 1, 6, '#a0643a');
  R(cx - 5, by - 11, 1, 4, '#8a5030'); R(cx + 4, by - 11, 1, 4, '#8a5030'); R(cx - 5, by - 11, 10, 1, '#8a5030');
  R(cx - 3, by - 9, 3, 2, '#e0533f'); R(cx + 1, by - 9, 2, 2, '#ffd166');                    // pomme, fromage
}, true);
[[20, 24, 'right'], [22, 25, 'left']].forEach(([x, y, f]) => IDLE_SEATS.push(seat([x, y], { pos: [px(x) + 8, py(y) + 12], k: py(y) + 12, face: f === 'right' ? 'down' : 'down', legs: 'sit', w: 6, ok: TERRACE_OK, label: 'Pique-nique dans le jardin', stand: [x, y + 1 < 27 ? y + 1 : y - 1] })));
// réverbères
[[7, 20], [19, 20]].forEach(([x, y]) => deco(x, y, py(y) + 14, t => {
  const cx = px(x) + 8, by = py(y) + 14, night = skyState(Date.now()).kind !== 'day';
  R(cx - 4, by, 8, 2, SHADOW); R(cx - 3, by - 3, 6, 3, '#3a3040'); R(cx - 1, by - 26, 2, 24, '#3a3040'); R(cx, by - 26, 1, 24, '#5a5068');
  panel(cx - 4, by - 33, 8, 7, night ? '#ffe08a' : '#e8eef2'); R(cx - 5, by - 35, 10, 2, '#3a3040');
}));
// pots de fleurs près de la porte
[[9, 17], [12, 17]].forEach(([x, y]) => deco(x, y, py(y) + 14, () => pot(px(x) + 8, py(y) + 14)));
SPOTS.push(
  { cell: [-1, 19], face: 'left', label: 'Regarde les poissons de la mare', w: 6, ok: TERRACE_OK },
  { cell: [-3, 21], face: 'up', label: 'Fait des ricochets sur la mare', w: 4, ok: TERRACE_OK },
  { cell: [16, 24], face: 'down', label: 'Se balade dans les hautes herbes', w: 5, ok: TERRACE_OK },
  { cell: [10, 23], face: 'down', label: 'Prend l\'air dans le jardin', w: 4, ok: TERRACE_OK }
);
HOOKS.post.push(t => {                               // cueillette : une baie dans la main
  everyone().forEach(a => {
    if (a.act !== 'berry' || a.path.length || a.heading || !a._anchor) return;
    R(a._anchor.x + 5, a._anchor.y + 15, 4, 4, OUT); R(a._anchor.x + 6, a._anchor.y + 16, 2, 2, '#e0533f');
  });
});

/* ====================================================================
   Interactions : on se rejoint, on fête, on chuchote, les stagiaires vont et viennent
   ==================================================================== */
const EMOTES = new Map();                              // id -> { e, until }
function emote(a, e, ms) { if (a) EMOTES.set(a.id, { e, until: performance.now() + (ms || 2500) }); }
HOOKS.overlay.push(c => {
  const now = performance.now();
  EMOTES.forEach((v, id) => {
    if (v.until < now) { EMOTES.delete(id); return; }
    const a = everyone().find(x => x.id === id) || (typeof MONS !== 'undefined' && MONS.find(x => x.id === id)); if (!a || !a._anchor) return;
    const [x, y] = toCss(a._anchor.x, a._anchor.y), k = Math.min(1, (v.until - now) / 400);
    c.globalAlpha = k; c.font = '15px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; c.textAlign = 'center';
    c.fillText(v.e, x + 11, y - 8 - (1 - k) * 6); c.textAlign = 'left'; c.globalAlpha = 1;
  });
});
const idleHere = a => !a.isOwner && !a.path.length && !a.heading && !WORK.has(a.state) && a.state !== 'asleep';
const freeIdle = (except) => [...agents.values()].filter(a => a !== except && !a.path.length && !a.heading && !WORK.has(a.state) && a.state !== 'asleep' && !a.override
  && !['bbq', 'bbqwait', 'help', 'pokeplay'].includes(a.act));
const occupied = cell => everyone().some(o => (!o.path.length && cellOf(o)[0] === cell[0] && cellOf(o)[1] === cell[1]) || (o.heading && o.heading.cell && o.heading.cell[0] === cell[0] && o.heading.cell[1] === cell[1]));
const closest = (list, a) => list.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
const playersOf = act => everyone().filter(a => a.act === act && !a.path.length && !a.heading);

// 1. barbecue : quelqu'un vient attendre sa saucisse
let socialTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < socialTick) return; socialTick = now + 4000;
  const griller = playersOf('bbq')[0];
  if (griller && !playersOf('bbqwait').length && Math.random() < 0.5 && !occupied([39, 5])) {
    const b = closest(freeIdle(griller), griller);
    if (b) goTo(b, [39, 5], { type: 'spot', cell: [39, 5], face: 'right', act: 'bbqwait', label: 'Attend sa saucisse' });
  }
});
let resultTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < resultTick) return; resultTick = now + 11000;
  const g1 = playersOf('bbq')[0], g2 = playersOf('bbqwait')[0];
  if (g1 && g2) { emote(g1, '🌭', 2600); emote(g2, '😋', 2600); }
  playersOf('berry').forEach(a => emote(a, pick(['🍓', '🫐', '😋']), 2200));
  playersOf('water').forEach(a => emote(a, pick(['🌱', '💧']), 2000));
});

// 2. bibliothèque : on chuchote
let hushTick = 0;
HOOKS.update.push((dt, now) => {
  if (now < hushTick) return; hushTick = now + 6000;
  const talkers = everyone().filter(a => a.chatWith && a.x >= 28 && a.y >= 17);
  if (!talkers.length) return;
  const reader = everyone().find(a => a.mode === 'sit' && a.x >= 28 && a.y >= 17);
  if (reader) emote(reader, '🤫', 2500); talkers.forEach(a => emote(a, '😶', 1800));
});

/* ---------- sous-agents (stagiaires) : badge sur le torse, rapport au chef, puis départ ---------- */
HOOKS.update.push(() => {
  agents.forEach(a => {
    if (!a.leaving) return;
    const now = performance.now(), boss = agents.get(a.parentId);
    if (!a._leaving) {
      a._leaving = true; a.zoneSeat = null;
      if (typeof pushNews === 'function') pushNews('✅', a.name + ' a fini sa mission');
      const cell = boss && besideOf(boss);
      if (cell) {                                      // il apporte d'abord son rapport à l'agent qui l'a lancé
        a._report = 'walk'; emote(a, '📄', 30000);
        goTo(a, cell, { type: 'spot', cell, face: cell.face, label: 'Apporte son rapport à ' + boss.name });
      } else leave(a);
    } else if (a._report === 'walk') {
      if (!a.path.length && !a.heading) {
        a._report = 'talk'; a._reportEnd = now + 3500; a.nextMove = now + 4000;
        emote(a, '📄', 3500); emote(boss, '👍', 3500);
        if (typeof say === 'function' && boss) say(a, pick(['Mission accomplie, chef !', 'Voilà mon rapport !', 'C\'est fait ! Tout est dans le rapport.']), { to: boss });
        if (typeof pushNews === 'function' && boss) pushNews('📄', a.name.replace(/^↳ /, '') + ' : rapport remis à ' + boss.name);
      }
    } else if (a._report === 'talk') {
      if (now > a._reportEnd) leave(a);
    } else if (!a.path.length && !a.heading) {
      removeAgent(a);
      if (typeof sessions !== 'undefined' && sessions.get(a.id)) sessions.get(a.id).done = true;
    }
  });
});
function leave(a) {
  a._report = null; emote(a, '👋', 2500);
  goTo(a, DOOR, { type: 'spot', cell: DOOR, face: 'up', label: 'A fini sa mission, s\'en va' });
}
// une case libre juste à côté de quelqu'un, pour venir lui parler (derrière son bureau s'il y est assis)
function besideOf(b) {
  const free = (x, y) => !BLOCKED.has(x + ',' + y) && y >= 3;
  if (b.seat && b.seat.type === 'desk') {
    const c = [[b.seat.dx + 1, b.seat.dy + 1], [b.seat.dx, b.seat.dy + 1]].find(([x, y]) => free(x, y));
    if (c) return Object.assign(c, { face: 'up' });
  }
  const [x, y] = cellOf(b);
  const c = [[x + 1, y, 'left'], [x - 1, y, 'right'], [x, y + 1, 'up'], [x, y - 1, 'down']].find(([p, q]) => free(p, q));
  return c ? Object.assign([c[0], c[1]], { face: c[2] }) : null;
}
// un agent va voir un collègue pour lui parler, puis retourne à sa place (text : ce qu'il lui dit, en bulle manga)
// replies : répliques suivantes (alternées : l'autre, puis lui, puis l'autre…), lancées une fois sur place
function chatVisit(a, b, text, replies) {
  const cell = besideOf(b); if (!cell || a.leaving) { if (text && typeof say === 'function') say(a, text, { to: b }); return; }
  a.override = { cell, until: performance.now() + 40000, talk: b.id, text, replies: replies || [], spot: { face: cell.face, label: 'Va parler à ' + b.name } };
  emote(a, '✉️', 3000);
}
HOOKS.update.push(() => {
  const now = performance.now();
  agents.forEach(a => {
    const o = a.override;
    if (o && o.talk && o.text && !o.talkEnd && now > o.until - 300) { o.talkEnd = 1; say(a, o.text, { to: agents.get(o.talk) }); return; }   // trop loin : il le dit quand même
    if (!o || !o.talk || !o.sent || a.path.length || a.heading) return;
    if (!o.talkEnd) {                                // arrivé : on discute quelques secondes
      const b = agents.get(o.talk);
      if (o.text && typeof say === 'function') {
        const lines = [[a, o.text, b], ...o.replies.map((l, i) => i % 2 ? [a, l, b] : [b, l, a])].filter(l => l[0]);
        o.talkEnd = o.until = now + dialogue(lines.map(([w, l, to]) => [w, l, to && to.name])) + 800;
        if (b) setTimeout(() => emote(b, '❗', 1500), 500);
        if (b && b.mode !== 'sit') { b.face = { up: 'down', down: 'up', left: 'right', right: 'left' }[o.spot.face] || b.face; b.nextMove = Math.max(b.nextMove, now + (o.talkEnd - now)); }
      }
      else { emote(a, '💬', 2500); setTimeout(() => emote(b, '💬', 2500), 2500); }
    }
  });
});
HOOKS.post.push(() => {
  agents.forEach(a => {
    if (!a.isSub || !a._anchor) return;
    const x = a._anchor.x, y = a._anchor.y + (a.id === selectedId ? 6 : 1);
    R(x - 1, y + 12, 1, 3, '#e0533f'); R(x + 1, y + 12, 1, 3, '#e0533f'); panel(x - 2, y + 15, 4, 3, '#ffffff', OUT); R(x - 1, y + 16, 2, 1, '#4f86d6');
  });
});

/* ---------- lumières de la rangée du bas et de la terrasse (utilisé par features.js la nuit) ---------- */
function roomLights(t, add) {
  const busy = everyone().some(a => a.x >= 28 && a.y >= 17);
  add(px(35), py(20), 70, busy ? 0.6 : 0.4, '#ffd9a8'); add(px(35), py(25), 70, busy ? 0.55 : 0.38, '#ffd9a8');
  ZONE_SEATS.library.forEach((s, i) => { if (i % 2 === 0) add(px(s.cell[0]) + 21, py(s.cell[1]) - 10, 24, 0.75, '#ffe9b0'); });
  add(px(33) + 14, py(24), 22, 0.7, '#cfe8b0'); add(px(33) + 48, py(24), 22, 0.7, '#cfe8b0');
  for (let i = 0; i < 12; i += 2) add(px(32) + 5 + i * 13, py(3) + 3, 16, 0.6, '#ffd88a');   // guirlande
  add(px(37), py(6), 60, 0.35, '#ffe2b0'); add(px(38), py(11), 60, 0.35, '#ffe2b0');
  // jardin : réverbères, fenêtres éclairées de la façade, porte
  [[7, 20], [19, 20]].forEach(([x, y]) => add(px(x) + 8, py(y) - 4, 62, 0.8, '#ffe08a'));
  FACADE_WINDOWS.forEach(c => add(px(c) + 8, py(LOW.top) + 22, 18, 0.6, '#ffd88a'));
  add(px(11), py(17), 30, 0.5, '#ffe2b0');
  add(px(-3), py(19), 40, 0.25, '#9fd0ff');                                                // la mare brille un peu
  if (typeof monLights === 'function') monLights(t, add);
}

/* ---------- chats : nouveaux coins favoris ---------- */
CAT_SPOTS.push(
  { cell: [35, 23], sleep: true, w: 3 },
  { cell: [37, 8], sleep: true, w: 3, ok: TERRACE_OK },
  { cell: [-1, 20], w: 6, ok: TERRACE_OK, label: 'Guette les poissons de la mare' },
  { cell: [16, 25], sleep: true, w: 5, ok: TERRACE_OK, label: 'Se cache dans les hautes herbes' },
  { cell: [4, 18], z: 6, sleep: true, w: 5, ok: () => TERRACE_OK() && !seatTaken(GBENCH[0]), label: 'Fait la sieste sur le banc' },
  { cell: [21, 25], sleep: true, w: 4, ok: TERRACE_OK, label: 'Lorgne le panier de pique-nique' }
);
