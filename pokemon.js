'use strict';
/* ====================================================================
   Eric Office : les Pokémon du jardin suspendu
   Ce sont ceux que tu as attrapés et choisis dans le Pokédex (dex.js), 6 au maximum.
   Ils se baladent, dorment la nuit, s'abritent sous la pluie (sauf ceux de la mare, ravis),
   jouent avec les agents en pause et les chats. Survol = nom, clic = câlin.
   Ils utilisent leur sprite pixel art officiel (icônes PokeAPI) ; une Poké Ball en attendant le chargement.
   ==================================================================== */
const CRY = { 25: 'Pika pika !', 26: 'Raiii !', 1: 'Bulbi !', 4: 'Sala !', 7: 'Carapuce !', 133: 'Vouiii !', 39: 'Rondou… doudou ♪', 143: 'Ronnnfl…', 129: '*flop flop*', 150: '…', 151: 'Mew !' };
const SINGERS = new Set([39, 40, 174]);                                   // Rondoudou & co
// les vrais types (dexdata.js) : les électriques font des étincelles, ceux de feu éclairent le jardin la nuit
const SPARKY = { has: id => typeof dexEl === 'function' && dexEl(id, 'e') }, FIERY = { has: id => typeof dexEl === 'function' && dexEl(id, 'f') };
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
      cry: CRY[id] || ((typeof dexName === 'function' ? dexName(id) : '') + ' !'), water: isWater, aqua: isWater, wild: !(ids && ids.length),
      nextLand: performance.now() + 20000 + Math.random() * 30000,
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
const SHELTERS = [[-6, 26], [-4, 26], [22, 26], [25, 26], [23, 19], [26, 19]];   // sous les arbres
function monGo(m, cell, mode, label) {
  if (!cell) return;
  m.path = bfs([Math.floor(m.x), Math.floor(m.y)], cell).filter(c => true); m.mode = 'walk'; m.after = mode || 'idle'; m.afterLabel = label || '';
  if (!m.path.length) { m.mode = m.after; m.label = m.afterLabel; }
}

/* ---------- comportement ---------- */
HOOKS.update.push((dt, now) => {
  const rain = badWeather(), dark = night();
  MONS.forEach(m => {
    if (m.water) {                                                     // les Pokémon d'eau nagent dans la mare (déplacement libre sur l'eau)
      if ((now > m.nextLand || dark) && !m.catPlay) {                  // … ils sortent faire un tour (et toujours pour aller dormir la nuit)
        m.nextLand = now + 30000 + Math.random() * 40000;
        const shore = [[-1, 19], [-1, 18], [-1, 20], [-3, 21], [-4, 21], [-2, 21], [-5, 17], [-2, 17]].filter(([x, y]) => gardenFree(x, y) && !MONS.some(o => o !== m && Math.floor(o.x) === x && Math.floor(o.y) === y));
        if (shore.length && (dark || Math.random() < 0.55)) {
          const [sx, sy] = pick(shore);
          m.water = false; m.x = Math.min(POND.x1 - 0.5, Math.max(POND.x0 + 0.5, sx + 0.5)); m.y = Math.min(POND.y1 - 0.5, Math.max(POND.y0 + 0.5, sy + 0.5));
          m.landUntil = dark ? Infinity : now + 25000 + Math.random() * 35000; m.nightLand = dark;
          m.path = [[sx, sy]]; m.mode = 'walk'; m.after = dark ? 'sleep' : 'idle'; m.afterLabel = dark ? 'Dort au bord de la mare' : 'Sort de la mare'; m.next = now + (dark ? 20000 : 1500);
          emote(m, dark ? '💤' : '💦', 1500);
          return;
        }
      }
      if (!m.tx || now > m.next) {
        m.tx = POND.x0 + 0.5 + Math.random() * (POND.x1 - POND.x0 - 1); m.ty = POND.y0 + 0.5 + Math.random() * (POND.y1 - POND.y0 - 1);
        m.next = now + 4000 + Math.random() * 6000;
      }
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      m.swimming = d > 0.05;
      if (d > 0.05) { m.x += dx / d * Math.min(d, m.speed * dt * 0.6); m.y += dy / d * Math.min(d, m.speed * dt * 0.6); if (Math.abs(dx) > 0.05) m.dir = dx > 0 ? 1 : -1; m.face8 = dir8(dx, dy); }
      m.mode = 'swim'; m.label = rain ? MON_LABEL.rain : MON_LABEL.swim;
      return;
    }
    if (m.petUntil > now || m.playUntil > now) { m.path = []; return; }
    if (m.path.length) {
      const [tx, ty] = m.path[0], tx2 = tx + 0.5, ty2 = ty + 0.5, dx = tx2 - m.x, dy = ty2 - m.y, d = Math.hypot(dx, dy), st = m.speed * dt;
      if (Math.abs(dx) > 0.01) m.dir = dx > 0 ? 1 : -1;
      if (d > 0.01) m.face8 = dir8(dx, dy);
      if (d <= st) { m.x = tx2; m.y = ty2; m.path.shift(); if (!m.path.length) { m.mode = m.after || 'idle'; m.label = m.afterLabel || ''; } }
      else { m.x += dx / d * st; m.y += dy / d * st; }
      return;
    }
    if (m.nightLand && !dark) { m.nightLand = false; m.landUntil = now; m.mode = 'idle'; }        // le jour se lève : on retourne nager
    if (m.aqua && m.landUntil && now > m.landUntil && !m.catPlay) {   // retour à la mare
      const [cx, cy] = [Math.floor(m.x), Math.floor(m.y)];
      if (Math.abs(cx - (-1)) + Math.abs(cy - 19) <= 1 || (cy === 21 && cx >= -5 && cx <= -2) || (cy === 17 && cx >= -5 && cx <= -2)) {
        m.landUntil = 0; m.water = true; m.tx = 0; m.x = Math.min(POND.x1 - 0.5, Math.max(POND.x0 + 0.5, m.x)); m.y = Math.min(POND.y1 - 0.5, Math.max(POND.y0 + 0.5, m.y));
        m.next = now; m.nextLand = now + 30000 + Math.random() * 40000; emote(m, '💦', 1500);
        if (typeof say === 'function' && Math.random() < 0.5) say(m, 'Plouf !', { mon: true });
        return;
      }
      if (!m.path.length) monGo(m, [-1, 19], 'idle', 'Retourne à la mare');
      return;
    }
    if (now < m.next) return;
    m.next = now + 5000 + Math.random() * 9000;
    if (rain && m.aqua) { m.mode = 'idle'; m.label = MON_LABEL.rain; if (Math.random() < 0.5) monGo(m, monCell(), 'idle', MON_LABEL.rain); return; }
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
  if (Math.random() < 0.55) {
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
  cats.forEach(c => {                                                  // le chat a reniflé le Pokémon : ils deviennent copains et jouent
    const m = c.sniff;
    if (!m || c.path.length) return;
    c.sniff = null; c.dir = m.x > c.x ? 1 : -1; m.dir = -c.dir;
    emote(c, '❤️', 1800); emote(m, '❤️', 1800);
    startCatPlay(c, m, now);
  });
});

/* ---------- chats et Pokémon : jeux entre copains ---------- */
// chat (on se court après, chacun son tour) · sieste collés · étincelles de Pikachu que le chat essaie d'attraper · bisou du nez
const CAT_GAMES = {
  chase: { label: (c, m) => 'Joue à chat avec ' + m.name, news: (c, m) => c.name + ' et ' + m.name + ' jouent à chat dans le jardin', ms: 16000 },
  nap: { label: (c, m) => 'Fait la sieste collé à ' + m.name, news: (c, m) => c.name + ' fait la sieste avec ' + m.name, ms: 22000 },
  sparkles: { label: (c, m) => 'Essaie d\'attraper les étincelles de ' + m.name, news: (c, m) => m.name + ' fait des petites étincelles pour amuser ' + c.name, ms: 12000 },
  boop: { label: (c, m) => 'Fait un bisou du nez à ' + m.name, news: (c, m) => c.name + ' fait un bisou du nez à ' + m.name, ms: 7000 }
};
const CAT_PLAYS = [];
function startCatPlay(c, m, now, forced) {
  const games = ['chase', 'chase', 'boop', 'nap'];
  if (SPARKY.has(m.dex)) games.push('sparkles', 'sparkles');
  const game = forced || (night() ? 'nap' : pick(games)), G = CAT_GAMES[game];
  m.path = [];
  if (game !== 'chase') {                                             // pour la sieste, le bisou et les étincelles : le chat vient se coller
    const [x, y] = [Math.floor(m.x), Math.floor(m.y)], side = [[x + 1, y], [x - 1, y], [x, y + 1]].find(([p, q]) => gardenFree(p, q));
    if (side && Math.hypot(c.x - side[0] - 0.5, c.y - side[1] - 0.5) > 0.3) catGo(c, side, null);
  }
  CAT_PLAYS.push({ c, m, game, label: G.label(c, m), until: now + G.ms, step: 0, leaderCat: Math.random() < 0.5 });
  c.catPlay = m.catPlay = true; c.nextMove = m.next = now + 99999;
  c.label = G.label(c, m); m.mode = game === 'nap' ? 'sleep' : 'play'; m.label = 'Joue avec ' + c.name;
  if (game === 'nap') { c.mode = 'sleep'; m.label = 'Fait la sieste avec ' + c.name; }
  news(game === 'nap' ? '😴' : '🐾', G.news(c, m));
}
function endCatPlay(p, now) {
  const { c, m } = p;
  c.catPlay = m.catPlay = false; c.z = 0; c.label = null; c.nextMove = now + 3000 + Math.random() * 3000;
  if (m.mode !== 'sleep' || p.game === 'nap') { m.mode = 'idle'; m.label = ''; }
  m.next = now + 4000;
  emote(c, pick(['😸', '❤️']), 2000); emote(m, '❤️', 2000);
}
// une case libre du jardin pas trop loin, pour courir
function nearGarden(x, y, r) {
  for (let n = 0; n < 20; n++) {
    const cx = Math.floor(x) + Math.round((Math.random() * 2 - 1) * r), cy = Math.floor(y) + Math.round((Math.random() * 2 - 1) * r);
    if (gardenFree(cx, cy) && !inTall(cx, cy)) return [cx, cy];
  }
  return null;
}
HOOKS.update.push((dt, now) => {
  for (let i = CAT_PLAYS.length - 1; i >= 0; i--) {
    const p = CAT_PLAYS[i], { c, m } = p;
    // fin du jeu (ou interrompu : laser, pluie, caresse, Pokémon retiré du jardin)
    if (now > p.until || LASER.on || badWeather() || c.ride || !MONS.includes(m) || c.petUntil > now) { CAT_PLAYS.splice(i, 1); endCatPlay(p, now); continue; }
    c.nextMove = m.next = now + 99999; c.label = p.label;
    if (p.game === 'chase') {                                            // chacun son tour : l'un file, l'autre le poursuit
      if (now > (p.swap || 0)) {
        p.swap = now + 3200 + Math.random() * 1200; p.leaderCat = !p.leaderCat;
        const lead = p.leaderCat ? c : m, cell = nearGarden(lead.x, lead.y, 4);
        if (cell) { if (p.leaderCat) catGo(c, cell, null); else monGo(m, cell, 'play', 'Joue à chat avec ' + c.name); }
        emote(p.leaderCat ? m : c, pick(['😆', '✨', '❗']), 1200);
        if (!c.baseSpeed) c.baseSpeed = c.speed; c.speed = c.baseSpeed * 1.3;
      }
      if (now > (p.follow || 0)) {                                       // le poursuivant suit (sans coller)
        p.follow = now + 450;
        const lead = p.leaderCat ? c : m, chaser = p.leaderCat ? m : c;
        if (Math.hypot(lead.x - chaser.x, lead.y - chaser.y) > 1.3) {
          const tx = Math.floor(lead.x), ty = Math.floor(lead.y);
          const cell = [[tx - 1, ty], [tx + 1, ty], [tx, ty + 1], [tx, ty - 1]].find(([a, b]) => gardenFree(a, b));
          if (cell) { if (chaser === c) { c.path = bfs(cellOf(c), cell); c.mode = 'walk'; } else monGo(m, cell, 'play', 'Joue à chat avec ' + c.name); }
        }
      }
      if (!c.path.length) c.mode = 'sit';
    } else if (p.game === 'sparkles') {                                  // Pikachu fait de petites étincelles, le chat saute pour les attraper
      m.mode = 'spark'; m.label = 'Fait des étincelles pour ' + c.name;
      if (!c.path.length) { c.mode = 'sit'; c.dir = m.x > c.x ? 1 : -1; const ph = (now % 900) / 900; c.z = ph < 0.4 ? Math.round(Math.sin(ph / 0.4 * Math.PI) * 9) : 0; }
      if (now > (p.emo || 0)) { p.emo = now + 3000; emote(c, pick(['😸', '✨', '😺']), 1500); }
    } else if (p.game === 'boop') {
      if (!p.step && !c.path.length) { p.step = 1; c.dir = m.x > c.x ? 1 : -1; m.dir = -c.dir; if (typeof say === 'function') say(m, m.cry, { mon: true }); }
      if (now > (p.emo || 0)) { p.emo = now + 2200; emote(c, '😽', 1500); emote(m, '❤️', 1500); }
    } else if (p.game === 'nap') {                                       // collés l'un à l'autre, qui respirent ensemble
      if (!c.path.length) { c.mode = 'sleep'; c.dir = m.x > c.x ? 1 : -1; }
      m.mode = 'sleep';
      if (now > (p.emo || 0)) { p.emo = now + 6000; emote(c, '💤', 2500); }
    }
  }
  cats.forEach(c => { if (!c.catPlay && c.baseSpeed && !c.playUntil && !c.zoomUntil && !c.chasing) c.speed = c.baseSpeed; });
});

/* ---------- dessin ---------- */
const dir8 = (dx, dy) => (((Math.round((90 - Math.atan2(dy, dx) * 180 / Math.PI) / 45)) % 8) + 8) % 8;
// sprites animés de Pokémon Donjon Mystère (projet communautaire PMD SpriteCollab) : marche sur 8 directions,
// repos, sommeil, saut. Si un Pokémon n'en a pas, on garde son icône.
const PMD = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';
const PMDS = new Map();
function pmdBox(img, fw, fh) {                          // hauteur des pieds et du haut de la tête dans la 1re image
  try {
    const c = document.createElement('canvas'); c.width = fw; c.height = fh; const cc = c.getContext('2d'); cc.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);
    const d = cc.getImageData(0, 0, fw, fh).data; let top = fh, foot = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 40) { if (y < top) top = y; if (y + 1 > foot) foot = y + 1; }
    return foot > top ? { top, foot } : { top: 0, foot: fh };
  } catch { return { top: fh * 0.2, foot: fh * 0.8 }; }
}
function pmdOf(id, shiny) {
  const key = id + (shiny ? 's' : '');
  let e = PMDS.get(key); if (e) return e;
  e = { anims: {} }; PMDS.set(key, e);
  const dir = PMD + String(id).padStart(4, '0') + '/' + (shiny ? '0000/0001/' : '');       // 0000/0001 = version chromatique
  fetch(dir + 'AnimData.xml').then(r => r.ok ? r.text() : Promise.reject(r.status)).then(txt => {
    const doc = new DOMParser().parseFromString(txt, 'text/xml'), by = {};
    doc.querySelectorAll('Anim').forEach(a => { const n = a.querySelector('Name'); if (n) by[n.textContent] = a; });
    const resolve = n => { let a = by[n], k = 0; while (a && a.querySelector('CopyOf') && k++ < 4) a = by[a.querySelector('CopyOf').textContent]; return a; };
    ['Walk', 'Idle', 'Sleep', 'Hop'].forEach(name => {
      const a = resolve(name); if (!a || !a.querySelector('FrameWidth')) return;
      const fw = +a.querySelector('FrameWidth').textContent, fh = +a.querySelector('FrameHeight').textContent;
      const dur = [...a.querySelectorAll('Duration')].map(d => +d.textContent || 1);
      const an = { img: new Image(), fw, fh, dur, total: dur.reduce((s, d) => s + d, 0), ok: false };
      an.img.crossOrigin = 'anonymous';
      an.img.onload = () => { an.rows = Math.max(1, Math.round(an.img.height / fh)); Object.assign(an, pmdBox(an.img, fw, fh)); an.ok = true; };
      an.img.src = dir + a.querySelector('Name').textContent + '-Anim.png';
      e.anims[name] = an;
    });
  }).catch(() => { e.failed = true; });
  return e;
}
// dessine le Pokémon animé ; renvoie la hauteur visible (0 si pas de sprite animé dispo → icône)
function drawPmd(m, x, y) {
  const sh = typeof shinyShown === 'function' && shinyShown(m.dex), es = sh ? pmdOf(m.dex, true) : null;
  const e = es && ((es.anims.Walk && es.anims.Walk.ok) || (es.anims.Idle && es.anims.Idle.ok)) ? es : pmdOf(m.dex), A = e.anims, ok = n => A[n] && A[n].ok;
  if (!ok('Walk') && !ok('Idle')) return 0;
  const moving = m.path.length > 0 || m.water;
  const name = m.mode === 'sleep' && !m.water && ok('Sleep') ? 'Sleep'
    : (m.mode === 'play' || m.petUntil > performance.now()) && ok('Hop') ? 'Hop'
    : moving || !ok('Idle') ? (ok('Walk') ? 'Walk' : 'Idle') : 'Idle';
  const an = A[name], row = an.rows >= 8 ? (m.face8 || 0) : 0;
  let tick = Math.floor(performance.now() * 0.06) % an.total, fi = 0;
  while (fi < an.dur.length - 1 && tick >= an.dur[fi]) { tick -= an.dur[fi]; fi++; }
  const dx = Math.round(x - an.fw / 2), dy = Math.round(y - an.foot + 1);
  if (m.water && !m.path.length) {                       // dans la mare : seul le haut dépasse
    const sink = Math.round((an.foot - an.top) * 0.22) - 2, bob = Math.round(Math.sin(performance.now() / 400));   // on ne voit que le haut, au ras de l'eau
    g.save(); g.beginPath(); g.rect(dx, dy - 10, an.fw, (y + 1) - (dy - 10)); g.clip();
    g.drawImage(an.img, fi * an.fw, row * an.fh, an.fw, an.fh, dx, dy + sink + bob, an.fw, an.fh); g.restore();
    R(x - 9, y - 4, 18, 2, 'rgba(255,255,255,.55)');
  } else g.drawImage(an.img, fi * an.fw, row * an.fh, an.fw, an.fh, dx, dy, an.fw, an.fh);
  return an.foot - an.top;
}
HOOKS.items.push((items, t) => {
  MONS.forEach(m => items.push({ k: py(m.y) + (m.water ? 3 : 7), draw() {
    const x = px(m.x), y = py(m.y) + 7, walking = m.path.length > 0;
    const f = walking ? Math.floor(t * 8) % 2 : (m.mode === 'play' ? Math.round(Math.abs(Math.sin(t * 7)) * 2) : m.mode === 'sing' ? Math.round(Math.abs(Math.sin(t * 3))) : 0);
    if (!m.water) R(x - 7, y - 1, 14, 2, SHADOW);
    const hh = drawPmd(m, x, y) || (drawIcon(m, x, y, f, t), 26);
    if (m.mode === 'spark') for (let i = 0; i < 6; i++) { const a = t * 9 + i, r = 11 + (i % 2) * 3; R(x + Math.round(Math.cos(a) * r), y - 12 + Math.round(Math.sin(a) * r * 0.7), 2, 1, i % 2 ? '#fff6a0' : '#f6d33c'); }
    if (m.mode === 'sing') for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; g.globalAlpha = 1 - q; icon('note', x - 2 + (i - 1) * 7, y - 26 - Math.round(q * 14), ['#ff8fb0', '#9fc8ff', '#ffd166'][i]); g.globalAlpha = 1; }
    if (m.mode === 'sleep' && !m.water) { const p = (t * 0.4 + MONS.indexOf(m) * 0.3) % 1; g.globalAlpha = 1 - p; pixText('z', x + 6 + Math.round(p * 5), y - 24 - Math.round(p * 8), '#ffffff'); g.globalAlpha = 1; }
    if (typeof shinyShown === 'function' && shinyShown(m.dex)) {      // chromatique : des étincelles de temps en temps
      const q = (t * 0.35 + MONS.indexOf(m) * 0.37) % 1;
      if (q < 0.35) [[-9, -18], [8, -22], [-4, -28], [10, -10]].forEach(([dx, dy], k) => {
        const s = Math.max(0, Math.round(Math.sin(Math.min(1, q / 0.35 * 1.4 - k * 0.12) * Math.PI) * 2)); if (!s) return;
        const sx = x + dx, sy = y + dy, c = k % 2 ? '#fff6a0' : '#ffffff';
        R(sx, sy - s, 1, s * 2 + 1, c); R(sx - s, sy, s * 2 + 1, 1, c);
      });
    }
    if (m.petUntil > performance.now()) for (let i = 0; i < 2; i++) { const p = (t * 0.9 + i / 2) % 1; g.globalAlpha = 1 - p; icon('heart', x - 4 + i * 5, y - 28 - Math.round(p * 10), '#e0533f'); g.globalAlpha = 1; }
    m._anchor = { x, y: y - Math.max(18, hh), fy: y };
    m._box = [x - 12, y - Math.max(18, hh), 24, Math.max(18, hh) + 1];
  } }));
});
// icône pixel art officielle (regarde vers la gauche) : recadrée sur le Pokémon, réduite si besoin
// (les sprites des dernières générations sont plus grands), et une version retournée pour aller à droite
const ICONS = new Map();
function iconOf(id) {
  let e = ICONS.get(id);
  if (!e) {
    e = { img: new Image(), ok: false, flip: null }; ICONS.set(id, e);
    e.img.crossOrigin = 'anonymous';
    e.img.onload = () => {
      const src = e.img, W0 = src.width, H0 = src.height;
      let x0 = 0, y0 = 0, x1 = W0, y1 = H0;
      try {                                                               // boîte des pixels visibles
        const t = document.createElement('canvas'); t.width = W0; t.height = H0; const tc = t.getContext('2d'); tc.drawImage(src, 0, 0);
        const d = tc.getImageData(0, 0, W0, H0).data; x0 = W0; y0 = H0; x1 = 0; y1 = 0;
        for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (d[(y * W0 + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x >= x1) x1 = x + 1; if (y < y0) y0 = y; if (y >= y1) y1 = y + 1; }
        if (x1 <= x0) { x0 = 0; y0 = 0; x1 = W0; y1 = H0; }
      } catch { }
      const cw = x1 - x0, ch = y1 - y0, k = Math.min(1, 34 / ch, 40 / cw), w = Math.max(1, Math.round(cw * k)), h = Math.max(1, Math.round(ch * k));
      const mk = flip => { const c = document.createElement('canvas'); c.width = w; c.height = h; const cc = c.getContext('2d'); cc.imageSmoothingEnabled = false;
        if (flip) { cc.translate(w, 0); cc.scale(-1, 1); } cc.drawImage(src, x0, y0, cw, ch, 0, 0, w, h); return c; };
      e.norm = mk(false); e.flip = mk(true); e.ok = true;
    };
    e.img.src = typeof SPRITE !== 'undefined' ? SPRITE.icon(id) : '';
  }
  return e;
}
function drawIcon(m, x, y, f, t) {
  const e = iconOf(m.dex || m);
  if (!e.ok) { pokeball(x, y - 4, true); return; }
  const im = m.dir > 0 ? e.flip : e.norm, w = im.width, h = im.height;
  if (m.water) {                                                           // dans la mare : seul le haut dépasse
    const b = Math.round(Math.sin(t * 2.4));
    g.save(); g.beginPath(); g.rect(x - w / 2, y - h, w, h - 3); g.clip();
    g.drawImage(im, Math.round(x - w / 2), Math.round(y - h + 6 + b)); g.restore();
    R(x - 9, y - 4, 18, 2, 'rgba(255,255,255,.55)');
    return;
  }
  g.drawImage(im, Math.round(x - w / 2), Math.round(y - h + 1 - f));
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
  if (typeof addStat === 'function') addStat('pets');
  if (m.mode === 'sleep') { m.mode = 'idle'; m.label = ''; }
  if (typeof say === 'function') say(m, m.cry, { mon: true });
  if (typeof sound === 'function' && SETTINGS.sound) try { tone(880 + Math.random() * 300, 0.09, 'square', 0.03); tone(1180, 0.12, 'square', 0.03, 0.1); } catch { }
});
HOOKS.overlay.push(c => {
  if (!hoverMon || !hoverMon._anchor) return;
  const m = hoverMon, txt = (m.wild ? '🌿 ' + m.name + ' sauvage' : (typeof shinyShown === 'function' && shinyShown(m.dex) ? '✨ ' + m.name + ' chromatique' : '★ ' + m.name)) + ' · ' + (m.petUntil > performance.now() ? 'Content !' : (m.label || MON_LABEL[m.mode] || 'Se balade')) + ' · clic pour un câlin';
  c.font = '600 11px ' + FONT; const w = Math.ceil(c.measureText(txt).width) + 16;
  const [x, y0] = toCss(m._anchor.x, m._anchor.y), y = y0 - 4;
  pkBox(c, x - w / 2, y - 17, w, 17, '#f2b23a');
  c.fillStyle = INK2; c.textAlign = 'center'; c.fillText(txt, x, y - 8); c.textAlign = 'left';
});
