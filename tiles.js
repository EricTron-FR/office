'use strict';
/* ====================================================================
   Eric Office : les tuiles libres de droits (CC-BY-SA 3.0, voir assets/CREDITS.md)
   Extérieur « Pokemon-inspired » de Red_Voxel : herbe et chemin (assemblés en quarts de tuile
   de 8 px, avec bords et coins selon les voisins), sapins, haie, boîte aux lettres.
   Intérieur de Bonsaiheldin : parquet, dallage, tapis rouge / vert / bleu.
   Tant que les images ne sont pas chargées (ou hors-ligne), le dessin à la main reste affiché.
   ==================================================================== */
const TILES = { ok: false, ext: new Image(), int: new Image() };
{
  let n = 0;
  const done = () => { if (++n === 2) { TILES.ok = true; repaintAll(); } };
  TILES.ext.onload = done; TILES.int.onload = done;
  TILES.ext.src = 'assets/tiles-exterieur-redvoxel.png';
  TILES.int.src = 'assets/tiles-interieur-bonsaiheldin.png';
}
const tOk = () => TILES.ok;
// copie un morceau de planche ; flipY : retourné de haut en bas
function blit(img, sx, sy, sw, sh, dx, dy, flipY) {
  if (flipY) { g.save(); g.translate(0, dy * 2 + sh); g.scale(1, -1); g.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh); g.restore(); }
  else g.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
}
// tout le fond est redessiné une fois les tuiles arrivées
function repaintAll() {
  WINDOWS.length = 0;
  paintBackground();
  if (typeof paintRooms === 'function') paintRooms();
  if (typeof BG_EXTRAS !== 'undefined') BG_EXTRAS.forEach(fn => { const prev = g; g = bg.getContext('2d'); fn(); g = prev; });
}

/* ---------- extérieur ---------- */
const GRASS_Q = [[128, 0], [136, 0], [144, 0], [152, 0], [128, 8], [136, 8], [144, 8], [152, 8], [128, 16], [136, 16], [144, 16],
  [152, 16], [160, 16], [168, 16], [128, 32], [128, 48], [168, 24], [168, 32], [168, 40]];
function tileGrass(x0, x1, y0, y1) {
  for (let y = y0; y < y1; y += 8) for (let x = x0; x < x1; x += 8) {
    const q = GRASS_Q[scatter((x >> 3) * 7 + (y >> 3) * 131) % GRASS_Q.length];
    blit(TILES.ext, q[0], q[1], Math.min(8, x1 - x), Math.min(8, y1 - y), x, y);
  }
}
// le chemin : chaque quart de 8 px prend le bon morceau (bord, coin, coin rentrant, milieu)
const PQ = {
  tl: [136, 24], tr: [160, 24], bl: [136, 48], br: [160, 48],
  t: [[144, 24], [152, 24]], b: [[144, 48], [152, 48]], l: [[136, 32], [136, 40]], r: [[160, 32], [160, 40]],
  c: [[144, 32], [152, 32], [144, 40], [152, 40]], inw: [184, 8], ine: [192, 8]
};
function tilePath(isPath) {                               // isPath(cx, cy) sur les cases de 16 px
  const q = (qx, qy) => isPath(Math.floor(qx / 2), Math.floor(qy / 2));
  const cells = [];
  PATH_CELLS.forEach(k => { const [cx, cy] = k.split(',').map(Number); cells.push([cx, cy]); });
  cells.forEach(([cx, cy]) => {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const qx = cx * 2 + i, qy = cy * 2 + j, n = q(qx, qy - 1), s = q(qx, qy + 1), w = q(qx - 1, qy), e = q(qx + 1, qy);
      let src, flip = false;
      const alt = arr => arr[(qx + qy) % arr.length];
      if (!n && !w) src = PQ.tl; else if (!n && !e) src = PQ.tr; else if (!s && !w) src = PQ.bl; else if (!s && !e) src = PQ.br;
      else if (!n) src = alt(PQ.t); else if (!s) src = alt(PQ.b); else if (!w) src = alt(PQ.l); else if (!e) src = alt(PQ.r);
      else if (!q(qx - 1, qy - 1)) src = PQ.inw; else if (!q(qx + 1, qy - 1)) src = PQ.ine;
      else if (!q(qx - 1, qy + 1)) { src = PQ.inw; flip = true; } else if (!q(qx + 1, qy + 1)) { src = PQ.ine; flip = true; }
      else src = alt(PQ.c);
      blit(TILES.ext, src[0], src[1], 8, 8, px(cx) + i * 8, py(cy) + j * 8, flip);
    }
  });
}
// sapin (42x48, avec son ombre au sol) : by = pied du tronc
function tileTree(cx, by) { blit(TILES.ext, 83, 48, 42, 48, Math.round(cx - 21), Math.round(by - 44)); }
// haie (motif 3x3 : coins, bords, milieu) sur w x h cases
function tileHedge(x0, y0, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = i === 0 ? 0 : i === w - 1 ? 2 : 1, r = j === 0 ? 0 : j === h - 1 ? 2 : 1;
    blit(TILES.ext, c * 16, 96 + r * 16, 16, 16, x0 + i * 16, y0 + j * 16);
  }
}
function tileMailbox(cx, by) { blit(TILES.ext, 131, 72, 10, 24, Math.round(cx - 5), Math.round(by - 24)); }

/* ---------- intérieur ---------- */
// tint : voile de couleur pour éclaircir le parquet (il est assez sombre d'origine)
function tileWood(x0, x1, y0, y1, tint) {
  for (let y = y0; y < y1; y += 16) for (let x = x0; x < x1; x += 16)
    blit(TILES.int, (((x - x0) >> 4) % 3) * 16, 0, Math.min(16, x1 - x), Math.min(16, y1 - y), x, y);
  if (tint) { g.fillStyle = tint; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
}
const WOOD_LIGHT = 'rgba(255,222,170,.38)', WOOD_WARM = 'rgba(255,200,150,.14)';
function tileStone(x0, x1, y0, y1) {
  for (let y = y0; y < y1; y += 16) for (let x = x0; x < x1; x += 16)
    blit(TILES.int, (((x - x0) >> 4) + ((y - y0) >> 4)) % 2 ? 32 : 16, 16, Math.min(16, x1 - x), Math.min(16, y1 - y), x, y);
}
// tapis (coins, bords, milieu) : couleur rouge, vert ou bleu ; w x h cases depuis (x0, y0) en pixels
const RUG_ROW = { red: 5, green: 8, blue: 11 };
function tileRug(x0, y0, w, h, color) {
  const b = RUG_ROW[color] || 5;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const c = i === 0 ? 0 : i === w - 1 ? 2 : 1, r = j === 0 ? 0 : j === h - 1 ? 2 : 1;
    blit(TILES.int, c * 16, (b + r) * 16, 16, 16, x0 + i * 16, y0 + j * 16);
  }
}
