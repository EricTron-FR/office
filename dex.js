'use strict';
/* ====================================================================
   Eric Office : le Pokédex (gacha)
   Tes agents gagnent des tickets en travaillant pour de vrai → tu fais tourner la roue →
   elle donne une Poké Ball (ou Super, Hyper, Master Ball) → tu l'ouvres → un Pokémon (les 1025, toutes régions).
   Tu choisis la région où tirer. Les doublons rapportent des pièces selon leur rareté : on les échange contre
   des tickets ou des Balls à la boutique. Tu choisis jusqu'à 6 Pokémon pour le jardin.
   Tout est gardé dans ce navigateur (localStorage). Les images viennent du dépôt PokeAPI (GitHub).
   ==================================================================== */
// les 1025 Pokémon de toutes les régions (dexdata.js, généré depuis PokeAPI)
const DEXI = DEX_DATA.map(([name, rate, flag, el, icon, from]) => ({ name, rate: +rate, leg: /[LM]/.test(flag), myth: flag.includes('M'), el, icon, from: +from || 0 }));
// évolutions : n° → les Pokémon en lesquels il peut évoluer
const EVOS = {}; DEXI.forEach((d, i) => { if (d.from) (EVOS[d.from] = EVOS[d.from] || []).push(i + 1); });
const DEX_N = DEXI.length;                            // 1025
const dexName = id => (DEXI[id - 1] || {}).name || '???';
const dexEl = (id, k) => !!DEXI[id - 1] && DEXI[id - 1].el.includes(k);   // w eau · f feu · e électrik · v vol · g spectre
const REGIONS = [['Kanto', 1, 151], ['Johto', 152, 251], ['Hoenn', 252, 386], ['Sinnoh', 387, 493], ['Unys', 494, 649],
  ['Kalos', 650, 721], ['Alola', 722, 809], ['Galar', 810, 905], ['Paldea', 906, 1025]];
const regionOf = id => (REGIONS.find(r => id >= r[1] && id <= r[2]) || REGIONS[0])[0];
// rareté officielle : le taux de capture des jeux (3 = presque impossible, 255 = très facile), plus le statut légendaire / fabuleux
const CAPTURE = DEXI.map(d => d.rate);
const TIERS = ['commun', 'peu', 'rare', 'epique', 'legendaire'];
const TIER_LABEL = { commun: 'Commun', peu: 'Peu commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire' };
const TIER_COLOR = { commun: '#8a94a6', peu: '#5fae5a', rare: '#4f86d6', epique: '#9b6fd6', legendaire: '#f2b23a' };
const TIER_RULE = { commun: 'taux de capture ≥ 190', peu: 'taux 100 à 189', rare: 'taux 60 à 99', epique: 'taux ≤ 50', legendaire: 'légendaires et fabuleux' };
const tierOf = id => { const d = DEXI[id - 1], c = d.rate; return d.leg ? 'legendaire' : c >= 190 ? 'commun' : c >= 100 ? 'peu' : c >= 60 ? 'rare' : 'epique'; };
const TIER_OF = {}; for (let id = 1; id <= DEX_N; id++) TIER_OF[id] = tierOf(id);
const BY_TIER = {}; TIERS.forEach(t => { BY_TIER[t] = []; }); for (let id = 1; id <= DEX_N; id++) BY_TIER[TIER_OF[id]].push(id);
const WATER_IDS = new Set(); for (let id = 1; id <= DEX_N; id++) if (dexEl(id, 'w') && !dexEl(id, 'v')) WATER_IDS.add(id);

// la roue : quelle Ball (w = chance de tomber dessus), et les raretés que chaque Ball peut contenir (en %, dans l'ordre de TIERS)
const BALLS = {
  poke: { name: 'Poké Ball', w: 50, odds: [70, 22, 8, 0, 0], top: '#e0533f', band: '#2a2636' },
  super: { name: 'Super Ball', w: 30, odds: [20, 40, 32, 8, 0], top: '#4f86d6', band: '#e0533f' },
  hyper: { name: 'Hyper Ball', w: 17, odds: [0, 10, 40, 47, 3], top: '#2a2636', band: '#f2c14a' },
  master: { name: 'Master Ball', w: 3, odds: [0, 0, 0, 65, 35], top: '#8a4fc8', band: '#ff8fd0' }
};
const WHEEL = ['poke', 'super', 'poke', 'hyper', 'poke', 'super', 'poke', 'master'];      // 8 parts (le tirage suit les poids, pas la taille des parts)
const SP = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const SPRITE = {
  // icône du jardin : gén. 7 (≤ 807), Épée/Bouclier, Champions, sinon le sprite normal (réduit à l'affichage)
  icon: id => SP + ({ 7: 'versions/generation-vii/icons/', 8: 'versions/generation-viii/sword-shield/icons/', 9: 'versions/generation-ix/champions/icons/' }[(DEXI[id - 1] || {}).icon] || '') + id + '.png',
  // grand sprite : Rouge Feu (≤ 386), Noir/Blanc (≤ 649), sinon le sprite normal
  front: id => SP + (id <= 386 ? 'versions/generation-iii/firered-leafgreen/' : id <= 649 ? 'versions/generation-v/black-white/' : '') + id + '.png'
};

/* ---------- sauvegarde ---------- */
const DEX = Object.assign({ tickets: 0, coins: 0, caught: {}, team: [], pulls: 0, starter: null, day: '', tools: 0, log: [], pullRegion: 'Toutes' },
  (() => { try { return JSON.parse(localStorage.getItem('eo-dex') || '{}'); } catch { return {}; } })());
if (DEX.candies) { DEX.coins = (DEX.coins || 0) + DEX.candies * 2; delete DEX.candies; }     // anciens bonbons → pièces
// pièces gagnées pour un doublon, selon la rareté ; prix à la boutique
const COINS = { commun: 2, peu: 3, rare: 5, epique: 15, legendaire: 40 };
const SHOP = [['ticket', 10, '🎟 1 ticket'], ['super', 15, 'Super Ball'], ['hyper', 40, 'Hyper Ball'], ['master', 150, 'Master Ball']];
function saveDex() { try { localStorage.setItem('eo-dex', JSON.stringify(DEX)); } catch { } updateDexButton(); }
const caughtCount = () => Object.keys(DEX.caught).length;

/* ---------- gagner des tickets (seulement avec les vraies sessions, pas en démo) ---------- */
const dexLive = () => (typeof es !== 'undefined' && !!es) || (typeof rootHandle !== 'undefined' && !!rootHandle);
function earnTickets(n, why) {
  if (!n) return;
  DEX.tickets += n; saveDex();
  if (typeof pushNews === 'function') pushNews('🎟', '+' + n + ' ticket' + (n > 1 ? 's' : '') + ' Pokédex : ' + why, 'party');
}
const stat = (k, n) => { if (typeof addStat === 'function') addStat(k, n || 1); };
function dexOnDone(a) {
  if (!dexLive() || a.isSub) return;
  earnTickets(1, a.name + ' a terminé sa tâche');
  stat('tasks'); const h = new Date().getHours(); if (h >= 22 || h < 6) stat('nights');
}
function dexOnTool() {                                     // appelé à chaque outil utilisé par un agent (lignes récentes seulement)
  if (!dexLive()) return;
  DEX.tools = (DEX.tools || 0) + 1; stat('tools');
  if (DEX.tools % 40 === 0) earnTickets(1, 'tes agents ont bien bossé (40 actions)'); else if (DEX.tools % 5 === 0) saveDex();
}
setTimeout(() => {                                          // bonus du jour, à la première visite
  const d = new Date().toISOString().slice(0, 10);
  if (DEX.day !== d) { DEX.day = d; earnTickets(DEX.starter ? 2 : 0, 'bonus du jour'); saveDex(); }
}, 3000);

/* ---------- tirage ---------- */
const weighted = (items, wOf) => { let r = Math.random() * items.reduce((s, x) => s + wOf(x), 0); return items.find(x => (r -= wOf(x)) < 0) || items[items.length - 1]; };
function rollBall() { return weighted(Object.keys(BALLS), k => BALLS[k].w); }
function rollMon(ball) {
  const odds = BALLS[ball].odds, tier = weighted(TIERS, t => odds[TIERS.indexOf(t)]);
  // la région choisie pour le tirage (sinon toutes) ; un petit coup de pouce aux Pokémon pas encore attrapés
  const reg = REGIONS.find(r => r[0] === DEX.pullRegion);
  let pool = reg ? BY_TIER[tier].filter(id => id >= reg[1] && id <= reg[2]) : BY_TIER[tier];
  if (!pool.length) pool = BY_TIER[tier];
  const fresh = pool.filter(id => !DEX.caught[id]);
  const id = fresh.length && Math.random() < 0.6 ? pick(fresh) : pick(pool);
  return { id, tier };
}
function catchMon(id) {
  const isNew = !DEX.caught[id];
  DEX.caught[id] = (DEX.caught[id] || 0) + 1; DEX.pulls++;
  let coins = 0;
  if (!isNew) { coins = COINS[TIER_OF[id]]; DEX.coins = (DEX.coins || 0) + coins; }
  if (isNew) { DEX.got = DEX.got || {}; DEX.got[id] = Date.now(); }
  if (isNew && DEX.team.length < 6) { DEX.team.push(id); if (typeof setGardenTeam === 'function') setGardenTeam(DEX.team); }
  stat('pulls'); if (isNew) stat('newmons');
  const t = TIER_OF[id]; if (t === 'epique') stat('epics'); if (t === 'legendaire') stat('legends'); if (dexEl(id, 'g')) stat('ghosts');
  DEX.log.unshift({ id, at: Date.now() }); DEX.log.length = Math.min(DEX.log.length, 30);
  saveDex();
  return { isNew, coins };
}

/* ---------- interface : la fenêtre Pokédex ---------- */
const $dex = document.createElement('div'); $dex.id = 'dex'; $dex.hidden = true;
document.body.appendChild($dex);
let dexTab = 'roue', spinning = false;
const dexBtn = tool('📕 Pokédex', 'Pokédex : gagne des tickets avec tes agents, fais tourner la roue, attrape-les tous', () => openDex());
function updateDexButton() { dexBtn.textContent = '📕 Pokédex · 🎟 ' + DEX.tickets; dexBtn.classList.toggle('glow', DEX.tickets > 0); }
updateDexButton();
function openDex(tab) {
  if (tab) dexTab = tab;
  if (!DEX.starter) dexTab = 'starter';
  $dex.hidden = false; renderDex();
}
function closeDex() { if (!spinning) $dex.hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$dex.hidden && (typeof $g === 'undefined' || $g.hidden)) closeDex(); });
$dex.addEventListener('click', e => { if (e.target === $dex) closeDex(); });
const imgTag = (id, kind, cls) => '<img class="' + (cls || '') + '" src="' + SPRITE[kind](id) + '" alt="' + esc(dexName(id)) + '" loading="lazy" onerror="this.classList.add(\'nf\')">';
function renderDex() {
  const tabs = [['roue', '🎡 Roue'], ['dex', '📕 Pokédex'], ['jardin', '🌳 Mon jardin'], ['badges', '🏅 Badges & défis']];
  $dex.innerHTML = '<div class="dx-frame"><div class="dx-top"><span class="dx-led"></span><span class="dx-led s r"></span><span class="dx-led s y"></span><span class="dx-led s g"></span>' +
    '<b>POKÉDEX</b><span class="dx-sp"></span><span class="dx-chip">🎟 ' + DEX.tickets + ' ticket' + (DEX.tickets > 1 ? 's' : '') + '</span><span class="dx-chip" title="Pièces : gagnées avec les doublons">🪙 ' + (DEX.coins || 0) + '</span>' +
    '<span class="dx-chip">' + caughtCount() + ' / ' + DEX_N + '</span><button class="dx-x dx-mute" title="Sons du gacha">' + (SETTINGS.gachaMute ? '🔇' : '🔊') + '</button><button class="dx-x" title="Fermer (Échap)">✕</button></div>' +
    (dexTab === 'starter' ? '' : '<div class="dx-tabs">' + tabs.map(([k, l]) => '<button data-tab="' + k + '" class="' + (dexTab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>') +
    '<div class="dx-body"></div></div>';
  $dex.querySelector('.dx-x:not(.dx-mute)').onclick = closeDex;
  $dex.querySelector('.dx-mute').onclick = () => { SETTINGS.gachaMute = !SETTINGS.gachaMute; saveSettings(); renderDex(); };
  $dex.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (!spinning) { dexTab = b.dataset.tab; renderDex(); } });
  const body = $dex.querySelector('.dx-body');
  if (dexTab === 'starter') renderStarter(body);
  else if (dexTab === 'roue') renderWheel(body);
  else if (dexTab === 'dex') renderGrid(body);
  else if (dexTab === 'badges' && typeof renderBadges === 'function') renderBadges(body);
  else renderTeam(body);
}

// premier passage : on choisit son starter (et on reçoit 3 tickets pour commencer)
function renderStarter(body) {
  body.innerHTML = '<div class="dx-dialog">Bienvenue dans le monde des Pokémon ! Le professeur Chen t\'offre ton premier compagnon. Lequel choisis-tu ?</div>' +
    '<div class="dx-starters">' + [1, 4, 7].map(id => '<button data-st="' + id + '">' + imgTag(id, 'front', 'big') + '<b>' + dexName(id) + '</b></button>').join('') + '</div>' +
    '<div class="dx-hint">Ensuite : chaque tâche terminée par un de tes agents rapporte un ticket 🎟, et toutes les 40 actions aussi. Un ticket = un tour de roue.</div>';
  body.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    const id = +b.dataset.st;
    DEX.starter = id; catchMon(id); DEX.tickets += 3; saveDex();
    if (typeof pushNews === 'function') pushNews('🎉', dexName(id) + ' rejoint ton jardin ! +3 tickets pour commencer', 'party');
    dexTab = 'roue'; renderDex();
  });
}

// la roue
function ballIcon(c, x, y, r, b) {                           // une Ball dessinée au canvas
  const B = BALLS[b];
  c.save(); c.translate(x, y);
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(0, 0, r + 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = B.top; c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.fill();
  if (b === 'hyper') { c.fillStyle = B.band; c.fillRect(-r * 0.75, -r * 0.75, r * 0.35, r * 0.5); c.fillRect(r * 0.4, -r * 0.75, r * 0.35, r * 0.5); }
  if (b === 'super') { c.fillStyle = B.band; c.fillRect(-r * 0.85, -r * 0.45, r * 0.4, r * 0.3); c.fillRect(r * 0.45, -r * 0.45, r * 0.4, r * 0.3); }
  if (b === 'master') { c.fillStyle = '#ffffff'; c.font = '700 ' + Math.round(r * 0.8) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('M', 0, -r * 0.45); }
  c.fillStyle = '#2a2636'; c.fillRect(-r, -r * 0.12, r * 2, r * 0.24);
  c.beginPath(); c.arc(0, 0, r * 0.32, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r * 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-r * 0.4, -r * 0.5, r * 0.18, 0, Math.PI * 2); c.fill();
  c.restore();
}
let wheelAngle = 0;                                       // position de la grande roue (gacha.js), gardée d'un tour à l'autre
// l'écran de lancement : les 4 Balls qui flottent, le gros bouton, les rafales ; la vraie roue s'ouvre en plein écran
function renderWheel(body) {
  const reg = REGIONS.find(r => r[0] === DEX.pullRegion), t = DEX.tickets;
  body.innerHTML = '<div class="dx-launch"><div class="dx-ltitle">✨ ROUE DE LA CHANCE ✨</div>' +
    '<div class="dx-lballs">' + Object.entries(BALLS).map(([k, b], i) => '<div class="dx-lball" style="animation-delay:' + (i * 0.25) + 's"><canvas width="112" height="112" data-b="' + k + '"></canvas><b>' + b.name + '</b><small>' + b.w + ' % de chances</small></div>').join('') + '</div>' +
    '<button class="dx-go"' + (t ? '' : ' disabled') + '>🎡 LANCER LA ROUE · 1 🎟</button>' +
    '<div class="dx-multi"><button class="dx-m5"' + (t >= 5 ? '' : ' disabled') + '>⚡ Rafale ×5 · 5 🎟</button><button class="dx-m10"' + (t >= 10 ? '' : ' disabled') + ' title="Au moins un Pokémon rare ou mieux garanti">🔥 Rafale ×10 · 10 🎟</button></div>' +
    '<div class="dx-lhint">' + (t ? 'Tu as <b>' + t + ' ticket' + (t > 1 ? 's' : '') + '</b> 🎟' : 'Plus de tickets : tes agents en gagnent en travaillant (une tâche terminée = 1 🎟).') + '</div></div>' +
    '<div class="dx-lgrid"><div>' +
    '<label class="dx-reg">🗺 Tirer dans <select>' + ['Toutes', ...REGIONS.map(r => r[0])].map(r => '<option' + (r === DEX.pullRegion ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>' +
      '<small>' + (reg ? regionCount(reg) + ' / ' + (reg[2] - reg[1] + 1) : caughtCount() + ' / ' + DEX_N) + ' attrapés</small></label>' +
    '<div class="dx-shop"><b>🪙 Boutique</b> <span>' + (DEX.coins || 0) + ' pièces</span><div>' + SHOP.map(([k, price, label]) =>
      '<button data-shop="' + k + '"' + ((DEX.coins || 0) >= price ? '' : ' disabled') + '>' + (k === 'ticket' ? '' : '<canvas width="18" height="18" data-b="' + k + '"></canvas>') + label + ' · ' + price + ' 🪙</button>').join('') + '</div>' +
      '<small>Doublons : ' + TIERS.map(t => TIER_LABEL[t] + ' +' + COINS[t]).join(' · ') + '</small></div></div><div>' +
    '<table class="dx-odds"><tr><th></th><th>Roue</th>' + TIERS.map(t => '<th title="' + TIER_RULE[t] + '"><i style="background:' + TIER_COLOR[t] + '"></i>' + TIER_LABEL[t] + '</th>').join('') + '</tr>' +
      Object.entries(BALLS).map(([k, b]) => '<tr><td><canvas width="22" height="22" data-b="' + k + '"></canvas> <b>' + b.name + '</b></td><td>' + b.w + ' %</td>' + b.odds.map(o => '<td>' + (o ? o + ' %' : '–') + '</td>').join('') + '</tr>').join('') + '</table>' +
      '<div class="dx-hint">Rareté = le vrai taux de capture des jeux Pokémon (survole les colonnes).</div></div></div>';
  body.querySelectorAll('[data-b]').forEach(cc => { const r = cc.width / 2; ballIcon(cc.getContext('2d'), r, r, r - 3, cc.dataset.b); });
  body.querySelector('.dx-reg select').onchange = e => { DEX.pullRegion = e.target.value; saveDex(); renderDex(); };
  body.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
    const [k, price] = SHOP.find(s => s[0] === b.dataset.shop);
    if (spinning || (DEX.coins || 0) < price) return;
    DEX.coins -= price; saveDex();
    if (k === 'ticket') { DEX.tickets++; saveDex(); renderDex(); return; }
    spinning = true; openBall(k);                               // la Ball achetée s'ouvre tout de suite
  });
  body.querySelector('.dx-go').onclick = () => spin(body);
  body.querySelector('.dx-m5').onclick = () => spinMulti(body, 5);
  body.querySelector('.dx-m10').onclick = () => spinMulti(body, 10);
}
// rafale : la roue tourne vite, puis toutes les Balls s'ouvrent à la suite (×10 : au moins un rare garanti)
function spinMulti(body, n) {
  if (spinning || DEX.tickets < n) return;
  DEX.tickets -= n; saveDex(); spinning = true;
  body.querySelectorAll('button').forEach(b => { b.disabled = true; });
  if (typeof gachaWheel !== 'function') { openMulti(n); return; }
  gachaWheel(null, null, wheelAngle, n).then(ang => { wheelAngle = ang; openMulti(n); });
}
function openMulti(n) {
  const rolls = [];
  for (let i = 0; i < n; i++) { const ball = rollBall(); rolls.push(Object.assign({ ball }, rollMon(ball))); }
  if (n >= 10 && !rolls.some(r => TIERS.indexOf(r.tier) >= 2)) {          // garantie : un rare ou mieux
    let r; do { r = Object.assign({ ball: 'hyper' }, rollMon('hyper')); } while (TIERS.indexOf(r.tier) < 2);
    rolls[n - 1] = r;
  }
  const items = rolls.map(r => { if (r.ball === 'master') stat('masters'); const res = catchMon(r.id); return Object.assign(r, res); });
  if (n >= 10) stat('multi10');
  const fresh = items.filter(i => i.isNew).length, best = items.slice().sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier))[0];
  if (typeof pushNews === 'function') pushNews('📕', 'Rafale ×' + n + ' : ' + fresh + ' nouveau' + (fresh > 1 ? 'x' : '') + ', meilleur : ' + dexName(best.id) + ' (' + TIER_LABEL[best.tier] + ')', fresh ? 'party' : '');
  updateDexButton();
  const done = action => {
    spinning = false;
    if (action === 'dex') { dexTab = 'dex'; renderDex(); return; }
    renderDex();
    if (action === 'again') { const go = $dex.querySelector(n >= 10 ? '.dx-m10' : '.dx-m5'); if (go && !go.disabled) go.click(); }
  };
  if (typeof gachaMulti === 'function') gachaMulti(items, done); else done('ok');
}
function spin(body) {
  if (spinning || DEX.tickets < 1) return;
  DEX.tickets--; saveDex(); spinning = true;
  body.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const ball = rollBall();
  const slots = WHEEL.map((b, i) => b === ball ? i : -1).filter(i => i >= 0), slot = pick(slots);
  if (typeof gachaWheel !== 'function') { openBall(ball); return; }
  gachaWheel(ball, slot, wheelAngle).then(ang => { wheelAngle = ang; openBall(ball); });
}
function openBall(ball) {
  const { id, tier } = rollMon(ball), res = catchMon(id);
  if (ball === 'master') stat('masters');
  if (typeof pushNews === 'function') pushNews('📕', (res.isNew ? 'Nouveau Pokémon : ' : 'Encore un ') + dexName(id) + ' (' + TIER_LABEL[tier] + ')', res.isNew ? 'party' : '');
  updateDexButton();
  const done = action => {
    spinning = false;
    if (action === 'dex') { dexTab = 'dex'; renderDex(); return; }
    renderDex();
    if (action === 'again') { const go = $dex.querySelector('.dx-go'); if (go) go.click(); }
  };
  if (typeof gachaShow === 'function') gachaShow(ball, { id, tier, isNew: res.isNew, coins: res.coins }, done); else done('ok');
}

// le Pokédex : par région, silhouettes pour ceux qu'il reste à attraper
let dexRegion = 'Kanto', dexOnlyMine = false, dexQ = '';
// recherche : par nom (Pokémon attrapés seulement, les autres restent des ???) ou par numéro
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dexMatch = (id, q) => !q || String(id) === q.replace(/^0+/, '') || (!!DEX.caught[id] && norm(dexName(id)).includes(norm(q)));
const regionCount = r => { let n = 0; for (let id = r[1]; id <= r[2]; id++) if (DEX.caught[id]) n++; return n; };
function renderGrid(body) {
  const reg = REGIONS.find(r => r[0] === dexRegion) || REGIONS[0];
  let h = '<div class="dx-regions">' + REGIONS.map(r => { const n = regionCount(r), tot = r[2] - r[1] + 1;
    return '<button data-reg="' + r[0] + '" class="' + (r[0] === reg[0] ? 'on' : '') + (n === tot ? ' full' : '') + '">' + r[0] + ' <small>' + n + '/' + tot + '</small></button>'; }).join('') + '</div>' +
    '<div class="dx-filt"><input class="dx-q" type="search" placeholder="🔍 Nom ou numéro (toutes régions)" value="' + esc(dexQ) + '">' +
    '<label class="dx-only"><input type="checkbox"' + (dexOnlyMine ? ' checked' : '') + '> Seulement mes Pokémon</label></div><div class="dx-grid">';
  const q = dexQ.trim(), from = q ? 1 : reg[1], to = q ? DEX_N : reg[2];
  for (let id = from; id <= to; id++) {
    if (dexOnlyMine && !DEX.caught[id]) continue;
    if (!dexMatch(id, q)) continue;
    const n = DEX.caught[id] || 0, tier = TIER_OF[id];
    h += '<div class="dx-cell' + (n ? ' got' : '') + (DEX.team.includes(id) ? ' team' : '') + '" title="' + (n ? esc(dexName(id)) + ' · ' + TIER_LABEL[tier] + ' · taux de capture ' + CAPTURE[id - 1] + ' · ×' + n : '??? · ' + TIER_LABEL[tier]) + '" data-id="' + id + '">' +
      '<span class="num">' + String(id).padStart(3, '0') + '</span>' + imgTag(id, 'icon', n ? '' : 'sil') +
      '<span class="nm">' + (n ? esc(dexName(id)) : '???') + '</span>' + (n > 1 ? '<span class="cnt">×' + n + '</span>' : '') +
      '<i style="background:' + TIER_COLOR[tier] + '"></i></div>';
  }
  body.innerHTML = '<div class="dx-hint">Clique sur un Pokémon attrapé pour l\'ajouter à ton jardin (ou l\'en retirer). 🌳 = dans le jardin.</div>' + h + '</div>';
  body.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { dexRegion = b.dataset.reg; renderDex(); });
  body.querySelector('.dx-only input').onchange = e => { dexOnlyMine = e.target.checked; renderDex(); };
  const qi = body.querySelector('.dx-q');
  qi.oninput = () => { dexQ = qi.value; renderDex(); const n = $dex.querySelector('.dx-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  body.querySelectorAll('.dx-cell.got').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.id); renderDex(); });
}
function toggleTeam(id) {
  const i = DEX.team.indexOf(id);
  if (i >= 0) DEX.team.splice(i, 1);
  else if (DEX.team.length >= 6) { alert('Ton jardin accueille 6 Pokémon au maximum. Retire-en un d\'abord.'); return; }
  else DEX.team.push(id);
  saveDex(); if (typeof setGardenTeam === 'function') setGardenTeam(DEX.team);
}
// le jardin : les 6 Pokémon qui y vivent ; la liste se filtre (nom, région, rareté, type) et se trie
const TEAM_F = { q: '', reg: '', tier: '', el: '', sort: 'recent', out: false };
const EL_LABEL = { w: '💧 Eau', f: '🔥 Feu', e: '⚡ Électrik', v: '🪽 Vol', g: '👻 Spectre' };
function teamList() {
  const f = TEAM_F, reg = REGIONS.find(r => r[0] === f.reg), q = norm(f.q.trim());
  const got = DEX.got || {};
  return Object.keys(DEX.caught).map(Number).filter(id =>
    (!q || norm(dexName(id)).includes(q) || String(id) === q.replace(/^0+/, '')) &&
    (!reg || (id >= reg[1] && id <= reg[2])) && (!f.tier || TIER_OF[id] === f.tier) && (!f.el || dexEl(id, f.el)) && (!f.out || !DEX.team.includes(id))
  ).sort(f.sort === 'name' ? (a, b) => dexName(a).localeCompare(dexName(b), 'fr')
    : f.sort === 'rare' ? (a, b) => TIERS.indexOf(TIER_OF[b]) - TIERS.indexOf(TIER_OF[a]) || CAPTURE[a - 1] - CAPTURE[b - 1]
    : f.sort === 'count' ? (a, b) => DEX.caught[b] - DEX.caught[a] || a - b
    : f.sort === 'recent' ? (a, b) => (got[b] || 0) - (got[a] || 0) || b - a
    : (a, b) => a - b);
}
function renderTeam(body) {
  const f = TEAM_F, opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + l + '</option>';
  body.innerHTML = '<div class="dx-dialog">Ton jardin accueille jusqu\'à 6 Pokémon. Les Pokémon aquatiques nagent dans la mare (deux au maximum).</div>' +
    '<div class="dx-team"></div>' +
    '<div class="dx-filt">' +
      '<input class="dx-q" type="search" placeholder="🔍 Chercher un Pokémon (nom ou n°)" value="' + esc(f.q) + '">' +
      '<select data-f="reg">' + opt('', '🗺 Toutes régions', f.reg) + REGIONS.map(r => opt(r[0], r[0], f.reg)).join('') + '</select>' +
      '<select data-f="tier">' + opt('', '⭐ Toutes raretés', f.tier) + TIERS.map(t => opt(t, TIER_LABEL[t], f.tier)).join('') + '</select>' +
      '<select data-f="el">' + opt('', '🏷 Tous types', f.el) + Object.entries(EL_LABEL).map(([k, l]) => opt(k, l, f.el)).join('') + '</select>' +
      '<select data-f="sort">' + [['recent', '↓ Récents'], ['num', '↓ N° Pokédex'], ['name', '↓ Nom'], ['rare', '↓ Plus rares'], ['count', '↓ Plus d\'exemplaires']].map(([v, l]) => opt(v, l, f.sort)).join('') + '</select>' +
      '<label class="dx-only"><input type="checkbox" data-f="out"' + (f.out ? ' checked' : '') + '> Pas encore au jardin</label>' +
    '</div><h4 class="dx-count"></h4><div class="dx-pick"></div>' +
    '<button class="dx-goto">🌳 Aller voir le jardin</button>';
  const slots = body.querySelector('.dx-team'), pickEl = body.querySelector('.dx-pick'), cnt = body.querySelector('.dx-count');
  const drawSlots = () => {
    slots.innerHTML = [0, 1, 2, 3, 4, 5].map(i => {
      const id = DEX.team[i];
      return id ? '<div class="dx-slot" data-rm="' + id + '">' + imgTag(id, 'front', 'mid') + '<b>' + esc(dexName(id)) + '</b><small>retirer</small></div>' : '<div class="dx-slot empty">vide</div>';
    }).join('');
    slots.querySelectorAll('[data-rm]').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.rm); drawSlots(); drawList(); });
  };
  let shown = 0;
  const drawList = (more) => {
    const list = teamList(), total = caughtCount();
    shown = more ? shown + 120 : Math.max(120, shown);
    cnt.textContent = list.length === total ? 'Tes Pokémon (' + total + ')' : list.length + ' sur ' + total + ' Pokémon';
    pickEl.innerHTML = list.slice(0, shown).map(id => '<button data-add="' + id + '" class="' + (DEX.team.includes(id) ? 'in' : '') + '" title="#' + id + ' · ' + TIER_LABEL[TIER_OF[id]] + ' · ×' + DEX.caught[id] + '">' +
      imgTag(id, 'icon') + '<span>' + esc(dexName(id)) + '</span><i style="background:' + TIER_COLOR[TIER_OF[id]] + '"></i></button>').join('') +
      (list.length > shown ? '<button class="dx-more">Voir plus (' + (list.length - shown) + ')</button>' : '') +
      (!list.length ? '<div class="dx-hint">Aucun Pokémon ne correspond.</div>' : '');
    pickEl.querySelectorAll('[data-add]').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.add); drawSlots(); el.classList.toggle('in', DEX.team.includes(+el.dataset.add)); if (f.out) drawList(); });
    const m = pickEl.querySelector('.dx-more'); if (m) m.onclick = () => drawList(true);
  };
  drawSlots(); drawList();
  body.querySelector('.dx-q').oninput = e => { f.q = e.target.value; shown = 0; drawList(); };
  body.querySelectorAll('select[data-f]').forEach(el => el.onchange = () => { f[el.dataset.f] = el.value; shown = 0; drawList(); });
  body.querySelector('input[data-f="out"]').onchange = e => { f.out = e.target.checked; shown = 0; drawList(); };
  body.querySelector('.dx-goto').onclick = () => { closeDex(); focusTiles(-8, 27, 14, 28); };
}

// au chargement : les habitants du jardin
setGardenTeam(DEX.team);
