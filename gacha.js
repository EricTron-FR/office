'use strict';
/* ====================================================================
   Eric Office : l'ouverture de Ball, en grand spectacle
   La Ball tombe et rebondit → tu la touches → elle tremble 3 fois, sa lueur monte en rareté
   → elle explose (flash, rayons, pluie de particules) → le Pokémon apparaît, les étoiles s'allument
   une par une, tampon « NOUVEAU ! » → fanfare d'autant plus longue que le Pokémon est rare.
   Les sons sont synthétisés (aucun fichier) ; 🔊 / 🔇 dans le Pokédex.
   ==================================================================== */
const $g = document.createElement('div'); $g.id = 'gacha'; $g.hidden = true;
$g.innerHTML = '<canvas class="g-fx"></canvas><div class="g-rays"></div><div class="g-stage"></div><div class="g-flash"></div><button class="g-skip" title="Passer l\'animation (Échap)">Passer ⏭</button>';
document.body.appendChild($g);
const $gfx = $g.querySelector('.g-fx'), $gstage = $g.querySelector('.g-stage'), $gflash = $g.querySelector('.g-flash'), $grays = $g.querySelector('.g-rays');
const STARS = { commun: 1, peu: 2, rare: 3, epique: 4, legendaire: 5 };
let G = null;                                          // la séquence en cours

/* ---------- sons ---------- */
const gOn = () => !SETTINGS.gachaMute;
function gTone(f, d, type, vol, delay) { if (gOn()) try { tone(f, d, type || 'square', vol || 0.035, delay || 0); } catch { } }
function gNoise(dur, vol, delay, hp) {                // souffle de l'explosion
  if (!gOn()) return;
  try {
    const c = ac(), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(), gn = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 300; gn.gain.value = vol || 0.12;
    s.buffer = b; s.connect(f).connect(gn).connect(c.destination); s.start(c.currentTime + (delay || 0));
  } catch { }
}
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
function melody(notes, step, type, vol) { notes.forEach((n, i) => { if (n) gTone(NOTE(n), step * 1.6, type, vol, i * step); }); return notes.length * step; }
const FANFARE = {
  commun: () => melody([72, 76, 79], 0.09),
  peu: () => melody([72, 76, 79, 84], 0.09),
  rare: () => { melody([67, 72, 76, 79, 84, 88], 0.08); melody([48, 0, 55, 0, 60], 0.1, 'triangle', 0.05); },
  epique: () => { melody([72, 76, 79, 84, 88, 91, 96], 0.07); setTimeout(() => { melody([84, 88, 91], 0.001, 'square', 0.03); melody([88, 91, 96], 0.001, 'triangle', 0.04); }, 520); melody([48, 55, 60, 55, 60, 67], 0.1, 'triangle', 0.05); },
  legendaire: () => {
    melody([67, 72, 76, 79, 0, 76, 79, 84, 0, 84, 84, 84, 88, 91, 96], 0.11);
    melody([43, 0, 48, 0, 52, 0, 55, 0, 48, 0, 55, 0, 60, 60, 60], 0.11, 'triangle', 0.06);
    setTimeout(() => { melody([84, 88, 91, 96], 0.002, 'square', 0.03); gNoise(1.2, 0.05, 0, 2000); }, 1700);
  }
};

/* ---------- particules (étoiles, confettis, étincelles) ---------- */
const PARTS = [];
let gRaf = 0, gW = 0, gH = 0, gAmbient = null, gShake = 0;
function gResize() { const d = window.devicePixelRatio || 1; gW = innerWidth; gH = innerHeight; $gfx.width = gW * d; $gfx.height = gH * d; $gfx.getContext('2d').setTransform(d, 0, 0, d, 0, 0); }
window.addEventListener('resize', () => { if (!$g.hidden) gResize(); });
function burst(x, y, n, colors, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (o.speed || 7) * (0.35 + Math.random());
    PARTS.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), g: o.g == null ? 0.18 : o.g, life: 1, decay: 0.008 + Math.random() * 0.012,
      c: colors[i % colors.length], s: (o.size || 5) * (0.5 + Math.random()), shape: o.shape || pick(['star', 'sq', 'sq', 'spark']), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
  }
}
function rain(colors, n, shape) {                        // pluie depuis le haut (confettis, or)
  for (let i = 0; i < n; i++) PARTS.push({ x: Math.random() * gW, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 3, g: 0.03, life: 1, decay: 0.004,
    c: pick(colors), s: 4 + Math.random() * 5, shape: shape || pick(['sq', 'star']), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
}
function drawStar(c, s) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.42 : s, a = i / 10 * Math.PI * 2 - Math.PI / 2; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill();
}
function gLoop() {
  const c = $gfx.getContext('2d');
  c.clearRect(0, 0, gW, gH);
  if (gAmbient && Math.random() < gAmbient.rate) PARTS.push({ x: gW / 2 + (Math.random() - 0.5) * 260, y: gH / 2 + 90, vx: (Math.random() - 0.5) * 0.6, vy: -1 - Math.random() * 1.6, g: -0.005, life: 1, decay: 0.012, c: gAmbient.c, s: 2 + Math.random() * 3, shape: 'spark', rot: 0, vr: 0 });
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i];
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99; p.rot += p.vr; p.life -= p.decay;
    if (p.life <= 0 || p.y > gH + 40) { PARTS.splice(i, 1); continue; }
    c.save(); c.globalAlpha = Math.min(1, p.life * 1.5); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c;
    if (p.shape === 'star') drawStar(c, p.s);
    else if (p.shape === 'spark') { c.fillRect(-p.s / 2, -0.75, p.s, 1.5); c.fillRect(-0.75, -p.s / 2, 1.5, p.s); }
    else c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
    c.restore();
  }
  if (gShake > 0) { gShake *= 0.9; $gstage.style.transform = 'translate(' + ((Math.random() - 0.5) * gShake) + 'px,' + ((Math.random() - 0.5) * gShake) + 'px)'; if (gShake < 0.3) { gShake = 0; $gstage.style.transform = ''; } }
  gRaf = requestAnimationFrame(gLoop);
}

/* ---------- la séquence ---------- */
const wait = ms => new Promise(r => { if (G && G.skip) return r(); const t = setTimeout(r, ms); if (G) G.timers.push([t, r]); });
function skipAll() { if (!G || G.skip) return; G.skip = true; G.timers.forEach(([t, r]) => { clearTimeout(t); r(); }); G.timers = []; if (G.click) G.click(); }
$g.querySelector('.g-skip').onclick = e => { e.stopPropagation(); skipAll(); };
document.addEventListener('keydown', e => {
  if ($g.hidden) return;
  if (e.key === 'Escape') { e.stopPropagation(); skipAll(); }
  if ((e.key === ' ' || e.key === 'Enter') && G && G.click) { e.preventDefault(); G.click(); }
}, true);
function glowStages(tier) {                             // la lueur monte d'un cran à chaque secousse, jusqu'à la vraie rareté
  const T = TIERS.indexOf(tier);
  return [TIERS[Math.min(T, 0)], TIERS[Math.min(T, Math.ceil(T / 2))], TIERS[T]];
}
function ballCanvas(ball, size) {
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = size * 2; cv2.className = 'g-ball';
  const cc = cv2.getContext('2d'); cc.scale(2, 2); ballIcon(cc, size / 2, size / 2, size / 2 - 6, ball); return cv2;
}
// ball : la Ball gagnée ; result : { id, tier, isNew, coins } ; onEnd(action) : 'again' | 'dex' | 'ok'
async function gachaShow(ball, result, onEnd) {
  const { id, tier, isNew, coins } = result, color = TIER_COLOR[tier], legend = tier === 'legendaire', big = tier === 'epique' || legend;
  G = { skip: false, timers: [], click: null };
  $g.querySelector('.g-skip').style.display = '';
  $g.hidden = false; $g.className = 'g-on t-' + tier; gResize(); PARTS.length = 0; cancelAnimationFrame(gRaf); gLoop();
  $grays.style.setProperty('--tc', color); $grays.classList.remove('on');
  $gstage.innerHTML = '<div class="g-ballwrap"><div class="g-glow"></div></div><div class="g-hint">Touche la ' + esc(BALLS[ball].name) + ' !</div>';
  const wrap = $gstage.querySelector('.g-ballwrap'), glow = $gstage.querySelector('.g-glow'), hint = $gstage.querySelector('.g-hint');
  const bc = ballCanvas(ball, 150); wrap.appendChild(bc);
  // 1. la Ball tombe et rebondit
  wrap.classList.add('drop');
  [0, 0.06, 0.12, 0.18].forEach((d, i) => gTone(NOTE(84 - i * 5), 0.06, 'square', 0.03, d));
  await wait(560); gTone(110, 0.12, 'triangle', 0.08); gNoise(0.15, 0.06, 0, 200);
  burst(gW / 2, gH / 2 + 80, 18, ['#ffffff', '#e8e0d0'], { speed: 3, g: 0.05, size: 4, shape: 'sq', up: 1 });
  await wait(450);
  // 2. on attend qu'on la touche
  hint.classList.add('show'); gAmbient = { c: '#ffffff', rate: 0.15 };
  if (!G.skip) await new Promise(r => { G.click = r; wrap.onclick = r; });
  G.click = null; hint.classList.remove('show');
  // 3. trois secousses, la lueur change de couleur et grandit
  const stages = glowStages(tier);
  for (let i = 0; i < 3; i++) {
    const tc = TIER_COLOR[stages[i]];
    wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
    glow.style.setProperty('--gc', tc); glow.style.setProperty('--gs', String(1 + i * 0.45)); glow.classList.add('on');
    gAmbient = { c: tc, rate: 0.3 + i * 0.3 };
    gTone(NOTE(55 + i * 5), 0.08, 'square', 0.05); gTone(NOTE(67 + i * 7), 0.1, 'square', 0.03, 0.12); gNoise(0.05, 0.05, 0.02, 1500);
    burst(gW / 2, gH / 2, 10 + i * 12, [tc, '#ffffff'], { speed: 2.5 + i, g: 0, size: 4, shape: 'spark' });
    if (i === 2 && big) gShake = 8;
    await wait(i === 2 ? 900 : 760);
  }
  // pour les légendaires : un temps de suspense en plus
  if (legend && !G.skip) {
    wrap.classList.add('tremble'); gAmbient = { c: '#ffe08a', rate: 1 };
    for (let k = 0; k < 6; k++) gTone(NOTE(60 + k * 2), 0.12, 'sawtooth', 0.02, k * 0.13);
    gShake = 14; await wait(1100); wrap.classList.remove('tremble');
  }
  // 4. l'explosion
  gAmbient = null;
  $gflash.classList.remove('go'); void $gflash.offsetWidth; $gflash.classList.add('go');
  gNoise(big ? 0.9 : 0.5, big ? 0.16 : 0.1, 0, 200); gTone(NOTE(48), 0.4, 'triangle', 0.09);
  const cols = { commun: ['#ffffff', '#c9d1da', '#8a94a6'], peu: ['#ffffff', '#a6e08a', '#5fae5a'], rare: ['#ffffff', '#9fd0ff', '#4f86d6'], epique: ['#ffffff', '#e8d4ff', '#9b6fd6', '#ff8fd0'], legendaire: ['#ffffff', '#ffe08a', '#f2b23a', '#ff9a3a'] }[tier];
  burst(gW / 2, gH / 2, { commun: 60, peu: 80, rare: 120, epique: 170, legendaire: 260 }[tier], cols, { speed: big ? 12 : 9, g: 0.12, size: big ? 7 : 6 });
  if (big) gShake = legend ? 22 : 12;
  $grays.classList.add('on');
  // 5. le Pokémon
  $gstage.innerHTML = '<div class="g-reveal">' +
    '<div class="g-mon"><img src="' + SPRITE.front(id) + '" alt=""></div>' +
    (legend ? '<div class="g-banner">LÉGENDAIRE !!!</div>' : tier === 'epique' ? '<div class="g-banner epic">ÉPIQUE !</div>' : '') +
    '<div class="g-num">N° ' + String(id).padStart(3, '0') + '</div><div class="g-name"></div>' +
    '<div class="g-stars">' + '★★★★★'.split('').map((s, i) => '<span class="' + (i < STARS[tier] ? 'lit' : '') + '">★</span>').join('') + '</div>' +
    '<div class="g-tier" style="background:' + color + '">' + TIER_LABEL[tier] + ' · taux de capture ' + CAPTURE[id - 1] + '</div>' +
    (isNew ? '<div class="g-new">NOUVEAU !</div>' : '<div class="g-dup">Déjà attrapé · +' + coins + ' 🪙</div>') +
    '<div class="g-btns"></div></div>';
  const rv = $gstage.querySelector('.g-reveal');
  await wait(250);
  rv.classList.add('in');
  // le nom s'écrit lettre par lettre
  const nm = rv.querySelector('.g-name'), name = dexName(id);
  for (let i = 1; i <= name.length; i++) { nm.textContent = name.slice(0, i); gTone(NOTE(76 + (i % 4) * 2), 0.03, 'square', 0.02); await wait(55); }
  // les étoiles s'allument une à une, de plus en plus aigu
  const stars = rv.querySelectorAll('.g-stars span.lit');
  for (let i = 0; i < stars.length; i++) {
    stars[i].classList.add('zap'); gTone(NOTE(79 + i * 4), 0.14, 'square', 0.04); gTone(NOTE(91 + i * 4), 0.1, 'sine', 0.03, 0.04);
    const r = stars[i].getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 12, [color, '#ffffff', '#ffe08a'], { speed: 4, g: 0.1, size: 5, shape: 'star' });
    await wait(260);
  }
  rv.querySelector('.g-tier').classList.add('zap');
  FANFARE[tier]();
  if (isNew) {
    await wait(300);
    const st = rv.querySelector('.g-new'); st.classList.add('slam'); gTone(NOTE(45), 0.2, 'triangle', 0.1); gNoise(0.2, 0.08, 0, 300); gShake = Math.max(gShake, 8);
    const r = st.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 50, ['#ff5f5f', '#ffd166', '#5fe39a', '#5fe8ff', '#c9a0ff', '#ffffff'], { speed: 8, g: 0.2, size: 6, shape: 'sq' });
  } else rv.querySelector('.g-dup').classList.add('show');
  if (legend) rain(['#ffe08a', '#f2b23a', '#ffffff', '#ff9a3a'], 180, 'star');
  else if (tier === 'epique') rain(['#e8d4ff', '#9b6fd6', '#ffffff', '#ff8fd0'], 90);
  else if (isNew) rain(['#ff5f5f', '#ffd166', '#5fe39a', '#5fe8ff', '#ffffff'], 50);
  // 6. et maintenant ?
  G.skip = false;
  const btns = rv.querySelector('.g-btns');
  btns.innerHTML = (DEX.tickets ? '<button data-g="again" class="g-again">🎡 Encore ! (' + DEX.tickets + ' 🎟)</button>' : '') + '<button data-g="dex" class="ghost">📕 Pokédex</button><button data-g="ok" class="ghost">OK</button>';
  btns.classList.add('show'); $g.querySelector('.g-skip').style.display = 'none';
  btns.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { closeGacha(); onEnd && onEnd(b.dataset.g); });
}
function closeGacha() { $g.hidden = true; cancelAnimationFrame(gRaf); PARTS.length = 0; gAmbient = null; gShake = 0; $grays.classList.remove('on'); G = null; }

/* ---------- rafale ×5 / ×10 : toutes les Balls d'un coup, ouvertes une par une ---------- */
async function gachaMulti(items, onEnd) {
  const n = items.length, order = TIERS;
  const best = items.reduce((b, it) => order.indexOf(it.tier) > order.indexOf(b.tier) ? it : b, items[0]);
  G = { skip: false, timers: [], click: null };
  $g.querySelector('.g-skip').style.display = '';
  $g.hidden = false; $g.className = 'g-on g-multi t-commun'; gResize(); PARTS.length = 0; cancelAnimationFrame(gRaf); gLoop();
  $grays.classList.remove('on');
  $gstage.innerHTML = '<div class="g-mtitle">' + (n >= 10 ? '🔥 RAFALE ×10' : '⚡ RAFALE ×5') + '</div><div class="g-cards c' + n + '">' +
    items.map((it, i) => '<div class="g-card" style="animation-delay:' + (i * 70) + 'ms"><div class="g-cglow"></div></div>').join('') +
    '</div><div class="g-hint">Touche pour tout ouvrir !</div><div class="g-recap"></div>';
  const cards = [...$gstage.querySelectorAll('.g-card')], hint = $gstage.querySelector('.g-hint');
  cards.forEach((c, i) => { c.appendChild(ballCanvas(items[i].ball, 84)); });
  items.forEach((it, i) => gTone(NOTE(84 - (i % 5) * 3), 0.05, 'square', 0.025, i * 0.07));
  await wait(n * 70 + 650);
  hint.classList.add('show'); gAmbient = { c: '#ffffff', rate: 0.2 };
  if (!G.skip) await new Promise(r => { G.click = r; $gstage.querySelector('.g-cards').onclick = r; });
  G.click = null; hint.classList.remove('show'); gAmbient = null;
  let fresh = 0, coins = 0;
  for (let i = 0; i < n; i++) {
    const it = items[i], card = cards[i], tc = TIER_COLOR[it.tier], T = order.indexOf(it.tier), r = card.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // petite secousse, la lueur annonce la rareté
    card.style.setProperty('--tc', tc); card.classList.add('shake');
    gTone(NOTE(60 + T * 4), 0.06, 'square', 0.04); gNoise(0.04, 0.04, 0, 1500);
    await wait(T >= 3 ? 650 : 300);
    // ouverture
    if (it.isNew) fresh++; else coins += it.coins || 0;
    card.classList.remove('shake'); card.classList.add('open', 't-' + it.tier);
    card.innerHTML = '<div class="g-cglow"></div><img src="' + SPRITE.front(it.id) + '" alt=""><b>' + esc(dexName(it.id)) + '</b>' +
      '<span class="g-cstars">' + '★'.repeat(STARS[it.tier]) + '</span>' + (it.isNew ? '<i class="g-cnew">NEW</i>' : '<i class="g-cdup">+' + (it.coins || 0) + ' 🪙</i>');
    burst(cx, cy, [14, 20, 34, 70, 140][T], [tc, '#ffffff', T >= 3 ? '#ffe08a' : tc], { speed: 4 + T * 1.6, g: 0.12, size: 4 + T });
    melody([72 + T * 2, 76 + T * 2, 79 + T * 2].slice(0, 1 + Math.min(2, T)), 0.06);
    if (T === 3) { gShake = 10; $grays.style.setProperty('--tc', tc); $grays.classList.add('on'); }
    if (T === 4) {
      $gflash.classList.remove('go'); void $gflash.offsetWidth; $gflash.classList.add('go');
      gShake = 22; $grays.style.setProperty('--tc', tc); $grays.classList.add('on'); $g.classList.add('t-legendaire');
      FANFARE.legendaire(); rain(['#ffe08a', '#f2b23a', '#ffffff', '#ff9a3a'], 120, 'star');
    }
    await wait([260, 280, 380, 800, 1700][T]);
  }
  // récap
  G.skip = false;
  if (order.indexOf(best.tier) < 4) FANFARE[best.tier]();
  if (fresh) rain(['#ff5f5f', '#ffd166', '#5fe39a', '#5fe8ff', '#ffffff'], 30 + fresh * 8);
  const recap = $gstage.querySelector('.g-recap');
  recap.innerHTML = '<div class="g-rline"><b>' + fresh + '</b> nouveau' + (fresh > 1 ? 'x' : '') + ' · <b>+' + coins + '</b> 🪙 · meilleur : <b style="color:' + TIER_COLOR[best.tier] + '">' + esc(dexName(best.id)) + '</b> (' + TIER_LABEL[best.tier] + ')</div>' +
    '<div class="g-btns show">' + (DEX.tickets >= n ? '<button data-g="again" class="g-again">' + (n >= 10 ? '🔥' : '⚡') + ' Encore ×' + n + ' (' + DEX.tickets + ' 🎟)</button>' : '') +
    '<button data-g="dex" class="ghost">📕 Pokédex</button><button data-g="ok" class="ghost">OK</button></div>';
  recap.classList.add('show'); $g.querySelector('.g-skip').style.display = 'none';
  recap.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { closeGacha(); onEnd && onEnd(b.dataset.g); });
}

/* ---------- célébrations (badge débloqué, défi réussi) : une à la fois ---------- */
const CELEB = [];
let celebOn = false;
// opts : { title, sub, color, draw(ctx, size) facultatif, reward }
function celebrate(opts) { CELEB.push(opts); if (!celebOn) nextCeleb(); }
function nextCeleb() {
  const o = CELEB.shift();
  if (!o) { celebOn = false; return; }
  if (!$g.hidden) { setTimeout(() => { CELEB.unshift(o); nextCeleb(); }, 1200); celebOn = true; return; }   // on attend la fin du gacha
  celebOn = true;
  const box = document.createElement('div'); box.className = 'celeb';
  box.innerHTML = '<div class="cb-rays" style="--tc:' + (o.color || '#ffd166') + '"></div><div class="cb-card"><canvas width="160" height="160"></canvas><div class="cb-title"></div><div class="cb-sub"></div>' +
    (o.reward ? '<div class="cb-rew">+' + o.reward + ' 🎟</div>' : '') + '<small>clic pour continuer</small></div>';
  box.querySelector('.cb-title').textContent = o.title; box.querySelector('.cb-sub').textContent = o.sub || '';
  document.body.appendChild(box);
  const cc = box.querySelector('canvas').getContext('2d');
  if (o.draw) o.draw(cc, 160); else { cc.font = '96px "Segoe UI Emoji", sans-serif'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText(o.emoji || '🏅', 80, 86); }
  melody([67, 72, 76, 79, 84], 0.08); setTimeout(() => melody([79, 84, 88], 0.001, 'square', 0.03), 450);
  const close = () => { if (!box.parentNode) return; box.classList.add('out'); setTimeout(() => { box.remove(); nextCeleb(); }, 300); };
  box.onclick = close; setTimeout(close, 5200);
}

/* ====================================================================
   La grande roue, en plein écran, façon jeu télé
   Maintiens le bouton : la jauge de puissance oscille, relâche au bon moment (« PARFAIT ! »).
   La roue part en trombe (flou de vitesse), le clapet claque sur chaque picot, les ampoules suivent
   la vitesse, puis elle ralentit… dépasse parfois sur la part d'à côté avant de revenir. Explosion,
   bannière, et on enchaîne sur l'ouverture de la Ball.
   ==================================================================== */
const WSEG = {                                           // couleurs des parts selon la Ball
  poke: ['#ff6a55', '#c8392a'], super: ['#5f9aff', '#2f5fc8'], hyper: ['#4a4458', '#1f1a28'], master: ['#b878ff', '#6a2fc0']
};
function drawBigWheel(c, size, ang, o) {
  const n = WHEEL.length, seg = 2 * Math.PI / n, cx = size / 2, cy = size / 2 + 10, R0 = size / 2 - 34, now = performance.now();
  c.clearRect(0, 0, size, size + 20);
  // halo derrière la roue
  const halo = c.createRadialGradient(cx, cy, R0 * 0.6, cx, cy, R0 + 40); halo.addColorStop(0, 'rgba(255,220,120,.25)'); halo.addColorStop(1, 'rgba(255,220,120,0)');
  c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, R0 + 40, 0, Math.PI * 2); c.fill();
  // anneau doré + ampoules
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(cx, cy, R0 + 26, 0, Math.PI * 2); c.fill();
  const rim = c.createLinearGradient(0, cy - R0, 0, cy + R0); rim.addColorStop(0, '#ffe08a'); rim.addColorStop(0.5, '#e0a030'); rim.addColorStop(1, '#a86a10');
  c.fillStyle = rim; c.beginPath(); c.arc(cx, cy, R0 + 22, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(cx, cy, R0 + 6, 0, Math.PI * 2); c.fill();
  const NB = 32;
  for (let i = 0; i < NB; i++) {
    const a = i / NB * Math.PI * 2, bx = cx + Math.cos(a) * (R0 + 14), by = cy + Math.sin(a) * (R0 + 14);
    let lit;
    if (o.mode === 'win') lit = Math.floor(now / 120) % 2 === i % 2;
    else if (o.mode === 'idle') lit = (Math.floor(now / 220) + i) % 4 === 0;
    else lit = (Math.floor(o.chase) + i) % 4 < 2;
    if (lit) { c.fillStyle = 'rgba(255,240,170,.45)'; c.beginPath(); c.arc(bx, by, 9, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = o.mode === 'win' && lit ? o.winColor : lit ? '#fff6b0' : '#7a4a10'; c.beginPath(); c.arc(bx, by, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(bx - 1.5, by - 1.5, 1.6, 0, Math.PI * 2); c.fill();
  }
  // les parts (avec flou de vitesse : copies fantômes un peu en arrière)
  const ghosts = o.vel > 7 ? [[-o.vel * 0.018, 0.22], [-o.vel * 0.009, 0.4]] : [];
  [...ghosts, [0, 1]].forEach(([da, alpha]) => {
    c.globalAlpha = alpha;
    WHEEL.forEach((b, i) => {
      const a0 = ang + da + i * seg - Math.PI / 2, a1 = a0 + seg, [c1, c2] = WSEG[b];
      const gr = c.createRadialGradient(cx, cy, 10, cx, cy, R0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      c.fillStyle = (o.mode === 'win' && i === o.slot && Math.floor(now / 110) % 2) ? '#fff6b0' : gr;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R0, a0, a1); c.closePath(); c.fill();
      c.strokeStyle = '#fff3c8'; c.lineWidth = 3; c.stroke();
      if (alpha === 1) {
        const am = (a0 + a1) / 2;
        ballIcon(c, cx + Math.cos(am) * R0 * 0.62, cy + Math.sin(am) * R0 * 0.62, R0 * 0.13, b);
        c.save(); c.translate(cx + Math.cos(am) * R0 * 0.88, cy + Math.sin(am) * R0 * 0.88); c.rotate(am + Math.PI / 2);
        c.fillStyle = 'rgba(255,255,255,.92)'; c.font = '700 ' + Math.round(R0 * 0.065) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(BALLS[b].name.split(' ')[0].toUpperCase(), 0, 0); c.restore();
      }
    });
  });
  c.globalAlpha = 1;
  // reflet sur la roue
  const sh = c.createLinearGradient(cx - R0, cy - R0, cx + R0, cy + R0); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  c.fillStyle = sh; c.beginPath(); c.arc(cx, cy, R0, 0, Math.PI * 2); c.fill();
  // picots (le clapet tape dessus)
  for (let i = 0; i < n * 2; i++) {
    const a = ang + i * seg / 2 - Math.PI / 2, qx = cx + Math.cos(a) * (R0 - 4), qy = cy + Math.sin(a) * (R0 - 4);
    c.fillStyle = '#2a2636'; c.beginPath(); c.arc(qx, qy, 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(qx, qy, 3, 0, Math.PI * 2); c.fill();
  }
  // moyeu
  const hub = c.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 34); hub.addColorStop(0, '#ff9a80'); hub.addColorStop(1, '#c8392a');
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(cx, cy, 36, 0, Math.PI * 2); c.fill();
  c.fillStyle = hub; c.beginPath(); c.arc(cx, cy, 32, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(cx, cy); c.rotate(-ang * 0.5); c.fillStyle = '#fff'; c.font = '700 34px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✻', 0, 2); c.restore();
  // le clapet en haut (il bascule quand il touche un picot)
  c.save(); c.translate(cx, cy - R0 - 30); c.rotate(o.flap || 0);
  c.fillStyle = '#2a2636'; c.beginPath(); c.moveTo(-20, -6); c.lineTo(20, -6); c.lineTo(0, 46); c.closePath(); c.fill();
  c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(-14, -2); c.lineTo(14, -2); c.lineTo(0, 38); c.closePath(); c.fill();
  c.fillStyle = '#e0533f'; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a2636'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
  c.restore();
}
// ball/slot : résultat déjà tiré ; multi : rafale (la roue tourne juste très vite). Renvoie l'angle final.
async function gachaWheel(ball, slot, startAng, multi) {
  const n = WHEEL.length, seg = 2 * Math.PI / n;
  G = { skip: false, timers: [], click: null };
  $g.querySelector('.g-skip').style.display = '';
  $g.hidden = false; $g.className = 'g-on g-wheel t-commun'; gResize(); PARTS.length = 0; cancelAnimationFrame(gRaf); gLoop();
  $grays.style.setProperty('--tc', '#ffd166'); $grays.classList.add('on');
  const size = Math.max(300, Math.min(600, Math.floor(Math.min(innerWidth, innerHeight - 170) * 0.9)));
  $gstage.innerHTML = '<div class="g-wtitle">' + (multi ? (multi >= 10 ? '🔥 RAFALE ×10 🔥' : '⚡ RAFALE ×5 ⚡') : '✨ ROUE DE LA CHANCE ✨') + '</div>' +
    '<canvas class="g-bigwheel"></canvas><div class="g-wctl"><div class="g-power"><i></i><b></b></div>' +
    '<button class="g-spin">MAINTIENS POUR LANCER !</button></div><div class="g-wbanner"></div>';
  const cnv = $gstage.querySelector('.g-bigwheel'), d = window.devicePixelRatio || 1;
  cnv.width = size * d; cnv.height = (size + 20) * d; cnv.style.width = size + 'px'; cnv.style.height = (size + 20) + 'px';
  const c = cnv.getContext('2d'); c.scale(d, d);
  const st = { ang: startAng || 0, vel: 0, chase: 0, flap: 0, mode: 'idle', slot, winColor: '#fff6b0' };
  let raf = 0, alive = true;
  const frame = () => { if (!alive) return; st.flap *= 0.82; drawBigWheel(c, size, st.ang, st); raf = requestAnimationFrame(frame); };
  frame();
  // 1. la jauge de puissance : maintenir, relâcher au bon moment
  const btn = $gstage.querySelector('.g-spin'), pw = $gstage.querySelector('.g-power'), bar = pw.querySelector('i'), lab = pw.querySelector('b');
  let power = 0.7;
  if (!G.skip) await new Promise(res => {
    let t0 = 0, holding = false, osc = 0;
    const tick = () => {
      if (!holding) return;
      power = 0.5 - 0.5 * Math.cos((performance.now() - t0) / 1000 * Math.PI * 1.6);
      bar.style.width = Math.round(power * 100) + '%';
      bar.style.background = power > 0.92 ? '#ffd166' : power > 0.6 ? '#5fe39a' : '#5f9aff';
      lab.textContent = power > 0.92 ? 'PARFAIT !' : '';
      st.ang -= 0.004 + power * 0.01;                                     // la roue recule un peu : on prend son élan
      const q = Math.floor(performance.now() / 90);
      if (q !== osc) { osc = q; gTone(300 + power * 600, 0.02, 'square', 0.012); }
      requestAnimationFrame(tick);
    };
    const down = e => { if (e && e.preventDefault) e.preventDefault(); if (holding) return; holding = true; t0 = performance.now(); pw.classList.add('on'); btn.textContent = 'RELÂCHE !'; tick(); };
    const up = () => { if (!holding) return; holding = false; cleanup(); res(); };
    const key = e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (e.type === 'keydown') down(); else up(); } };
    const cleanup = () => { btn.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', key, true); window.removeEventListener('keyup', key, true); G.click = null; };
    btn.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('keydown', key, true); window.addEventListener('keyup', key, true);
    G.click = () => { cleanup(); res(); };                               // « Passer »
  });
  const perfect = power > 0.92;
  $gstage.querySelector('.g-wctl').classList.add('gone');
  if (perfect) {
    gTone(NOTE(84), 0.1, 'square', 0.04); gTone(NOTE(91), 0.15, 'square', 0.04, 0.08);
    const r = btn.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 40, ['#ffd166', '#ffffff'], { speed: 7, size: 5, shape: 'star' });
  }
  // 2. la trajectoire : le résultat, avec parfois un « presque » sur la part d'à côté
  let target, overshoot = 0;
  if (multi) target = st.ang + (10 + power * 6) * Math.PI;
  else {
    const base = -(slot + 0.5) * seg + (Math.random() - 0.5) * 0.5 * seg;
    const turns = Math.ceil((st.ang - base) / (2 * Math.PI)) + 5 + Math.round(power * 4) + (perfect ? 1 : 0);
    target = base + turns * 2 * Math.PI;
    const neighbour = WHEEL[(slot - 1 + n) % n];
    if (Math.random() < 0.45 || neighbour === 'master') overshoot = seg * (0.55 + Math.random() * 0.2);   // ça passe dessus… et ça revient
  }
  // 3. la rotation : départ en trombe, longue décélération
  gNoise(0.6, 0.08, 0, 600);
  const from = st.ang, dur = multi ? 2200 : 4300 + power * 1500, t0 = performance.now();
  let lastPeg = Math.floor(from / (seg / 2)), lastT = t0, lastAng = from;
  await new Promise(res => {
    const step = () => {
      const now = performance.now();
      if (G.skip) { st.ang = target; res(); return; }
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3.4);
      st.ang = from + (target + overshoot - from) * e;
      const dt = Math.max(1, now - lastT) / 1000; st.vel = (st.ang - lastAng) / dt; lastT = now; lastAng = st.ang;
      st.chase += st.vel * dt * 4; st.mode = 'spin';
      const peg = Math.floor(st.ang / (seg / 2));
      if (peg !== lastPeg) { lastPeg = peg; st.flap = Math.min(0.75, 0.25 + st.vel * 0.04); gTone(Math.max(700, 1900 - 3000 / Math.max(1, st.vel)) + Math.random() * 300, 0.018, 'square', 0.02); }
      if (Math.random() < Math.min(0.6, st.vel / 30)) burst(innerWidth / 2 + (Math.random() - 0.5) * size, innerHeight / 2 + (Math.random() - 0.5) * size * 0.5, 1, ['#fff6b0'], { speed: 1, g: 0, size: 3, shape: 'spark' });
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
  if (overshoot && !G.skip) {                              // le retour en arrière, tout doucement : suspense !
    await wait(420);
    const a0 = st.ang, t1 = performance.now(), back = 650;
    await new Promise(res => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t1) / back), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        st.ang = a0 - overshoot * e;
        const peg = Math.floor(st.ang / (seg / 2));
        if (peg !== lastPeg) { lastPeg = peg; st.flap = -0.5; gTone(1100, 0.03, 'square', 0.03); }
        if (p < 1 && !G.skip) requestAnimationFrame(step); else { st.ang = a0 - overshoot; res(); }
      };
      requestAnimationFrame(step);
    });
  }
  st.vel = 0;
  // 4. arrêt : flash, explosion, bannière
  const winBall = multi ? null : WHEEL[slot], col = winBall ? WSEG[winBall][0] : '#ffd166';
  st.mode = 'win'; st.winColor = col;
  $gflash.classList.remove('go'); void $gflash.offsetWidth; $gflash.classList.add('go');
  const wr = cnv.getBoundingClientRect();
  burst(wr.left + wr.width / 2, wr.top + 30, winBall === 'master' ? 220 : winBall === 'hyper' ? 140 : 90, [col, '#ffffff', '#ffd166'], { speed: 10, g: 0.15, size: 6 });
  if (winBall === 'master') { gShake = 24; rain(['#b878ff', '#ff8fd0', '#ffd166', '#5fe8ff', '#ffffff'], 160, 'star'); FANFARE.legendaire(); }
  else if (winBall === 'hyper') { gShake = 12; melody([67, 72, 76, 79, 84, 88], 0.06); gNoise(0.3, 0.07, 0, 800); }
  else if (winBall === 'super') { gShake = 6; melody([72, 76, 79, 84], 0.07); }
  else if (multi) { gShake = 10; melody([72, 76, 79, 84, 88, 91], 0.05); }
  else melody([72, 79], 0.09);
  const ban = $gstage.querySelector('.g-wbanner');
  ban.textContent = multi ? 'C\'EST PARTI ×' + multi + ' !' : BALLS[winBall].name.toUpperCase() + ' !';
  ban.style.color = col; ban.classList.add('show');
  await wait(multi ? 900 : winBall === 'master' ? 1900 : 1300);
  alive = false; cancelAnimationFrame(raf);
  $grays.classList.remove('on');
  return ((st.ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}
