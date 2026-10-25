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

/* ---------- le combat ---------- */
const $bt = document.createElement('div'); $bt.id = 'battle'; $bt.hidden = true;
$bt.innerHTML = '<div class="bt"><div class="bt-wipe"></div>' +
  '<div class="bt-plat foe"></div><div class="bt-plat me"></div>' +
  '<img class="bt-mon foe" alt=""><img class="bt-mon me" alt="">' +
  '<div class="bt-box foe"><div class="bt-nm"><b></b><span></span></div><div class="bt-hp"><small>PV</small><div><i></i></div></div></div>' +
  '<div class="bt-box me"><div class="bt-nm"><b></b><span></span></div><div class="bt-hp"><small>PV</small><div><i></i></div></div><div class="bt-hpn"></div></div>' +
  '<div class="bt-fx"></div>' +
  '<div class="bt-bottom"><div class="bt-text"></div><div class="bt-menu" hidden></div></div></div>';
document.body.appendChild($bt);
const $q = s => $bt.querySelector(s);
let BT = null;
const btWait = ms => new Promise(r => setTimeout(r, ms));
const SPB = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const frontUrl = (id, shiny) => shiny ? SPB + (id <= 386 ? 'versions/generation-iii/firered-leafgreen/shiny/' : id <= 649 ? 'versions/generation-v/black-white/shiny/' : 'shiny/') + id + '.png' : SPRITE.front(id);
const backUrl = id => SPB + (id <= 386 ? 'versions/generation-iii/firered-leafgreen/back/' : id <= 649 ? 'versions/generation-v/black-white/back/' : 'back/') + id + '.png';
function setSprite(img, url, fallback, wPct) {
  img.classList.remove('flipx'); img.style.width = '';
  img.onload = () => { const n = img.naturalWidth; img.style.width = (wPct * (n / 64) * (n > 64 ? 0.8 : 1)) + '%'; };
  img.onerror = () => { if (fallback && img.src !== fallback) { img.classList.add('flipx'); img.src = fallback; } };
  img.src = url;
}
// petits sons (synthétisés, coupés avec le 🔇 du Pokédex)
const bs = {
  tone: (f, d, ty, v, w) => { if (typeof gTone === 'function') gTone(f, d, ty, v, w); },
  noise: (d, v, w, hp) => { if (typeof gNoise === 'function') gNoise(d, v, w, hp); },
  mel: (n, s, ty, v) => (typeof melody === 'function' ? melody(n, s, ty, v) : 0)
};
const MOVE_OF = { w: ['Pistolet à O', 'w'], f: ['Flammèche', 'f'], e: ['Éclair', 'e'], v: ['Cru-Ailes', 'v'], g: ['Léchouille', 'g'] };
const elsOf = id => ['w', 'f', 'e', 'v', 'g'].filter(k => dexEl(id, k));
function effect(mt, foe) {                                    // table des types (réduite aux types connus)
  const T = { w: { f: 2, w: 0.5 }, f: { w: 0.5, f: 0.5 }, e: { w: 2, v: 2, e: 0.5 }, v: { e: 0.5 }, g: { g: 2 }, n: { g: 0 } };
  return elsOf(foe).reduce((m, k) => m * ((T[mt] || {})[k] ?? 1), 1);
}
function hpColor(p) { return p > 50 ? '#58d080' : p > 20 ? '#f8c030' : '#f85838'; }
function drawHp() {
  const f = $q('.bt-box.foe i'), m = $q('.bt-box.me i');
  f.style.width = BT.fhp + '%'; f.style.background = hpColor(BT.fhp);
  const mp = BT.mhp / BT.mmax * 100; m.style.width = mp + '%'; m.style.background = hpColor(mp);
  $q('.bt-hpn').textContent = Math.max(0, Math.ceil(BT.mhp)) + ' / ' + BT.mmax;
}
// texte façon Game Boy : lettre par lettre, clic (ou Entrée / Espace) pour avancer
function btSay(txt) {
  return new Promise(res => {
    const el = $q('.bt-text'), menu = $q('.bt-menu'); menu.hidden = true; el.textContent = ''; el.classList.remove('more');
    let i = 0, fin = false;
    const done = () => { if (fin) return; fin = true; clearTimeout(BT.at); BT.adv = null; el.classList.remove('more'); res(); };
    const step = () => {
      if (!BT) return res();
      el.textContent = txt.slice(0, ++i);
      if (i < txt.length) { BT.tt = setTimeout(step, 24); return; }
      el.classList.add('more'); BT.adv = done; BT.at = setTimeout(done, 1500);
    };
    BT.adv = () => { i = txt.length - 1; };
    step();
  });
}
function btMenu(prompt, opts, cls) {
  return new Promise(res => {
    const el = $q('.bt-text'), menu = $q('.bt-menu');
    el.textContent = prompt; el.classList.remove('more'); BT.adv = null;
    menu.className = 'bt-menu ' + (cls || ''); menu.hidden = false;
    menu.innerHTML = opts.map(([k, l, dis, sub]) => '<button data-k="' + k + '"' + (dis ? ' disabled' : '') + '>' + l + (sub ? '<small>' + sub + '</small>' : '') + '</button>').join('');
    menu.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); bs.tone(1200, 0.04, 'square', 0.03); menu.hidden = true; BT.menuEsc = null; res(b.dataset.k); });
    BT.menuEsc = () => { const back = opts.find(o => o[0] === 'back' || o[0] === 'run'); if (back) { menu.hidden = true; BT.menuEsc = null; res(back[0]); } };
  });
}
$q('.bt-bottom').addEventListener('click', () => { if (BT && BT.adv) BT.adv(); });
document.addEventListener('keydown', e => {
  if (!BT) return;
  if ((e.key === 'Enter' || e.key === ' ') && BT.adv) { e.preventDefault(); BT.adv(); }
  if (e.key === 'Escape') { e.stopPropagation(); if (BT.menuEsc) BT.menuEsc(); }
}, true);
async function anim(el, frames, ms, opts) { if (!el.animate) return; try { await el.animate(frames, Object.assign({ duration: ms, fill: 'forwards', easing: 'ease-out' }, opts)).finished; } catch { } }
async function blink(el) { await anim(el, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }], 420, { easing: 'steps(7)' }); }

async function startBattle() {
  if (BT || !WILD.id) return;
  if (!DEX.starter) { openDex(); return; }
  const id = WILD.id, mine = DEX.team[0] || DEX.starter || 25, tier = TIER_OF[id];
  const myLvl = Math.min(100, 12 + Math.floor(caughtCount() / 8) + Math.floor((DEX.caught[mine] || 1) * 2));
  BT = { id, mine, tier, fhp: 100, mmax: 20 + myLvl * 2, mhp: 0, berry: false, adv: null, menuEsc: null, shiny: WILD.shiny, lvl: WILD.lvl };
  BT.mhp = BT.mmax;
  const foeImg = $q('.bt-mon.foe'), meImg = $q('.bt-mon.me'), fx = $q('.bt-fx');
  fx.innerHTML = '';
  [foeImg, meImg].forEach(el => { if (el.getAnimations) el.getAnimations().forEach(a => a.cancel()); el.style.opacity = ''; });
  setSprite(foeImg, frontUrl(id, BT.shiny), null, 30);
  setSprite(meImg, backUrl(mine), SPRITE.front(mine), 38);
  $q('.bt-box.foe b').textContent = dexName(id) + (BT.shiny ? ' ✨' : ''); $q('.bt-box.foe span').textContent = 'N.' + BT.lvl + (DEX.caught[id] ? ' ◓' : '');
  $q('.bt-box.foe span').title = DEX.caught[id] ? 'Déjà dans ton Pokédex' : '';
  $q('.bt-box.me b').textContent = dexName(mine); $q('.bt-box.me span').textContent = 'N.' + myLvl;
  drawHp(); $q('.bt-text').textContent = ''; $q('.bt-menu').hidden = true;
  $bt.hidden = false; $bt.className = 'intro';
  // transition : l'écran clignote puis se ferme en volets, comme dans les jeux
  bs.mel([76, 0, 76, 0, 79, 81, 83, 84, 86, 88], 0.06, 'square', 0.03);
  await btWait(1100); $bt.className = 'go';
  bs.mel([64, 0, 67, 71, 72, 0, 72, 74, 76], 0.09, 'square', 0.025); bs.mel([40, 0, 47, 0, 45, 0, 43, 0, 40], 0.09, 'triangle', 0.05);
  await btWait(900);
  if (BT.shiny) { sparkle(foeImg, 10); bs.mel([84, 88, 91, 96], 0.06); }
  await btSay('Un ' + dexName(id) + ' sauvage apparaît !' + (BT.shiny ? ' Il brille !' : ''));
  $bt.classList.add('sent'); bs.tone(520, 0.08, 'square', 0.03); bs.noise(0.2, 0.05, 0, 1200);
  await btSay('Vas-y ! ' + dexName(mine) + ' !');
  let end = '';
  while (!end) {
    const c = await btMenu('Que doit faire ' + dexName(mine) + ' ?', [['fight', 'ATTAQUE'], ['ball', 'BALL'], ['berry', 'BAIE', BT.berry], ['run', 'FUITE']], 'main');
    if (c === 'run') { bs.mel([67, 64, 60], 0.07); await btSay('Vous prenez la fuite !'); end = 'run'; break; }
    if (c === 'fight') {
      const el = elsOf(mine)[0], typed = el ? MOVE_OF[el] : ['Bélier', 'n'];
      const mv = await btMenu('Quelle attaque ?', [['typed', typed[0], false, typed[1] === 'n' ? 'NORMAL · forte' : 'forte'], ['tackle', 'Charge', false, 'NORMAL · faible'], ['back', '↩ RETOUR']], 'moves');
      if (mv === 'back') continue;
      const [name, mt] = mv === 'typed' ? typed : ['Charge', 'n'];
      end = await myAttack(name, mt, mv === 'typed' ? [28, 42] : [12, 22]);
      if (!end) end = await foeTurn();
    } else if (c === 'berry') {
      BT.berry = true; bs.mel([72, 76, 79], 0.06);
      await btSay('Tu lances une Baie Framby à ' + dexName(id) + '.');
      await btSay(dexName(id) + ' la croque… Il a l\'air plus facile à attraper !');
      end = await foeTurn();
    } else if (c === 'ball') {
      const coins = DEX.coins || 0;
      const balls = [['poke', 'Poké Ball', 0, 1], ['super', 'Super Ball', 5, 1.5], ['hyper', 'Hyper Ball', 12, 2], ['master', 'Master Ball', 100, 255]];
      const b = await btMenu('Quelle Ball ? (🪙 ' + coins + ')', [...balls.map(([k, l, p]) => [k, l, coins < p, p ? p + ' 🪙' : 'gratuite']), ['back', '↩ RETOUR']], 'balls');
      if (b === 'back') continue;
      const ball = balls.find(x => x[0] === b);
      if (ball[2]) { DEX.coins -= ball[2]; saveDex(); }
      end = await throwBall(ball[0], ball[1], ball[3]);
      if (!end) end = await foeTurn();
    }
  }
  await btWait(300);
  $bt.className = 'out'; await btWait(450);
  $bt.hidden = true; $bt.className = ''; BT = null;
  wildGone();
}
function sparkle(el, n) {
  const fx = $q('.bt-fx'), r = el.getBoundingClientRect(), br = $q('.bt').getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'bt-star';
    s.style.left = (r.left - br.left + r.width * (0.2 + Math.random() * 0.6)) + 'px'; s.style.top = (r.top - br.top + r.height * (0.2 + Math.random() * 0.6)) + 'px';
    s.style.animationDelay = (i * 0.06) + 's'; fx.appendChild(s); setTimeout(() => s.remove(), 1400);
  }
}
async function myAttack(name, mt, [lo, hi]) {
  const meImg = $q('.bt-mon.me'), foeImg = $q('.bt-mon.foe');
  await btSay(dexName(BT.mine) + ' utilise ' + name + ' !');
  await anim(meImg, [{ transform: 'translate(0,0)' }, { transform: 'translate(12%,-6%)' }, { transform: 'translate(0,0)' }], 260, { fill: 'none' });
  const eff = effect(mt, BT.id);
  if (!eff) { await btSay('Ça n\'affecte pas ' + dexName(BT.id) + '…'); return ''; }
  const crit = Math.random() < 0.08, dmg = rint(lo, hi) * eff * (crit ? 1.5 : 1);
  bs.noise(0.18, eff > 1 ? 0.14 : 0.09, 0, 700); bs.tone(eff > 1 ? 160 : 220, 0.1, 'square', 0.04);
  await blink(foeImg);
  BT.fhp = Math.max(0, BT.fhp - dmg); drawHp(); await btWait(650);
  if (crit) await btSay('Coup critique !');
  if (eff > 1) await btSay('C\'est super efficace !');
  else if (eff < 1) await btSay('Ce n\'est pas très efficace…');
  if (BT.fhp <= 0) {
    bs.mel([67, 64, 60, 55], 0.09);
    await anim(foeImg, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(60%)', opacity: 0 }], 500);
    await btSay(dexName(BT.id) + ' sauvage est K.O. !');
    DEX.coins = (DEX.coins || 0) + 2; saveDex();
    await btSay('Raté pour la capture… Tu ramasses 2 🪙. (Astuce : affaiblis-le sans le mettre K.O.)');
    return 'ko';
  }
  return '';
}
async function foeTurn() {
  const meImg = $q('.bt-mon.me'), foeImg = $q('.bt-mon.foe');
  const el = elsOf(BT.id)[0], [name, mt] = el && Math.random() < 0.6 ? MOVE_OF[el] : ['Charge', 'n'];
  await btSay(dexName(BT.id) + ' sauvage utilise ' + name + ' !');
  await anim(foeImg, [{ transform: 'translate(0,0)' }, { transform: 'translate(-10%,5%)' }, { transform: 'translate(0,0)' }], 260, { fill: 'none' });
  const eff = effect(mt, BT.mine);
  if (!eff) { await btSay('Ça n\'affecte pas ' + dexName(BT.mine) + '…'); return ''; }
  const dmg = BT.mmax * (rint(8, 16) + Math.min(14, Math.floor(BT.lvl / 5))) / 100 * eff;
  bs.noise(0.16, 0.08, 0, 600); bs.tone(180, 0.1, 'square', 0.04);
  await blink(meImg);
  BT.mhp = Math.max(0, BT.mhp - dmg); drawHp(); await btWait(600);
  if (eff > 1) await btSay('C\'est super efficace !');
  if (BT.mhp <= 0) {
    await anim(meImg, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(60%)', opacity: 0 }], 500);
    await btSay(dexName(BT.mine) + ' est K.O. !');
    await btSay(dexName(BT.id) + ' sauvage en profite pour s\'enfuir…');
    return 'lost';
  }
  return '';
}
// la vraie formule de capture (3e génération) : a = (3·PVmax − 2·PV) · taux · bonus Ball / (3·PVmax) ; 4 tests de secousse
function catchRoll(bonus) {
  if (bonus >= 255) return 4;
  const rate = CAPTURE[BT.id - 1], a = Math.min(255, (300 - 2 * BT.fhp) * rate * bonus * (BT.berry ? 1.5 : 1) / 300);
  if (a >= 255) return 4;
  const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
  let n = 0; while (n < 4 && Math.random() * 65536 < b) n++;
  return n;
}
async function throwBall(ball, label, bonus) {
  const foeImg = $q('.bt-mon.foe'), fx = $q('.bt-fx');
  await btSay('Tu lances une ' + label + ' !');
  const bc = ballCanvas(ball, 46); bc.className = 'bt-ball'; fx.appendChild(bc);
  bs.mel([60, 64, 67, 72], 0.04);
  await anim(bc, [{ left: '18%', top: '72%', transform: 'translate(-50%,-50%) rotate(0)' }, { left: '45%', top: '18%', offset: 0.5, transform: 'translate(-50%,-50%) rotate(360deg)' },
    { left: '72%', top: '30%', transform: 'translate(-50%,-50%) rotate(720deg)' }], 700, { easing: 'linear' });
  // le Pokémon est aspiré dans la Ball
  bs.noise(0.25, 0.07, 0, 2500); bs.mel([84, 79, 72], 0.05);
  await anim(foeImg, [{ filter: 'brightness(1)', transform: 'scale(1)', opacity: 1 }, { filter: 'brightness(8)', transform: 'scale(.9)', opacity: 1, offset: 0.4 }, { filter: 'brightness(8)', transform: 'scale(0)', opacity: 0 }], 450);
  await anim(bc, [{ top: '30%' }, { top: '44%' }, { top: '38%' }, { top: '44%' }], 500, { easing: 'ease-in' });
  const shakes = catchRoll(bonus);
  for (let i = 0; i < Math.min(3, shakes); i++) {
    await btWait(380); bs.tone(260, 0.05, 'square', 0.05); bs.tone(200, 0.05, 'square', 0.04, 0.06);
    await anim(bc, [{ transform: 'translate(-50%,-50%) rotate(0)' }, { transform: 'translate(-50%,-50%) rotate(-24deg)' }, { transform: 'translate(-50%,-50%) rotate(20deg)' }, { transform: 'translate(-50%,-50%) rotate(0)' }], 420, { easing: 'ease-in-out' });
  }
  await btWait(450);
  if (shakes >= 4) {
    bs.tone(1400, 0.05, 'square', 0.05); bc.style.filter = 'brightness(.7)'; sparkle(bc, 8);
    const res = catchMon(BT.id); stat('wild'); if (BT.shiny) { stat('shinies'); DEX.coins = (DEX.coins || 0) + 20; saveDex(); }
    if (typeof FANFARE !== 'undefined') FANFARE[BT.tier](); else bs.mel([72, 76, 79, 84], 0.1);
    await btSay('Gotcha ! ' + dexName(BT.id) + ' est attrapé !');
    if (res.isNew) await btSay('Les données de ' + dexName(BT.id) + ' sont ajoutées au Pokédex !' + (DEX.team.includes(BT.id) ? ' Il rejoint ton jardin.' : ''));
    else await btSay('Tu l\'avais déjà : +' + res.coins + ' 🪙' + (BT.shiny ? ' (et +20 🪙 pour un chromatique !)' : ''));
    news('🌿', dexName(BT.id) + ' sauvage attrapé dans les hautes herbes !' + (res.isNew ? ' Nouveau !' : ''), 'party');
    updateDexButton();
    return 'caught';
  }
  // il s'échappe
  bs.noise(0.3, 0.09, 0, 900);
  bc.remove();
  await anim(foeImg, [{ filter: 'brightness(8)', transform: 'scale(0)', opacity: 0 }, { filter: 'brightness(1)', transform: 'scale(1)', opacity: 1 }], 350);
  await btSay(['Oh non ! Le Pokémon s\'est libéré !', 'Raah ! Ça y était presque !', 'Aaah ! Presque !', 'Mince ! Ça y était presque !'][shakes]);
  if (Math.random() < WILD_FLEE[BT.tier]) {
    await anim(foeImg, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(60%)', opacity: 0 }], 450);
    await btSay(dexName(BT.id) + ' sauvage s\'enfuit !');
    return 'fled';
  }
  return '';
}
// pour tester : wildSpawn(25) fait apparaître Pikachu dans les hautes herbes
window.wildSpawn = wildSpawn;
