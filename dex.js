'use strict';
/* ====================================================================
   Eric Office : le Pokédex (gacha)
   Tes agents gagnent des tickets en travaillant pour de vrai → tu fais tourner la roue →
   elle donne une Poké Ball (ou Super, Hyper, Master Ball) → tu l'ouvres → un Pokémon de Kanto.
   Les doublons donnent des bonbons (5 bonbons = 1 ticket). Tu choisis jusqu'à 6 Pokémon pour le jardin.
   Tout est gardé dans ce navigateur (localStorage). Les images viennent du dépôt PokeAPI (GitHub).
   ==================================================================== */
const DEX_NAMES = ('Bulbizarre,Herbizarre,Florizarre,Salamèche,Reptincel,Dracaufeu,Carapuce,Carabaffe,Tortank,Chenipan,Chrysacier,Papilusion,' +
  'Aspicot,Coconfort,Dardargnan,Roucool,Roucoups,Roucarnage,Rattata,Rattatac,Piafabec,Rapasdepic,Abo,Arbok,Pikachu,Raichu,Sabelette,' +
  'Sablaireau,Nidoran♀,Nidorina,Nidoqueen,Nidoran♂,Nidorino,Nidoking,Mélofée,Mélodelfe,Goupix,Feunard,Rondoudou,Grodoudou,Nosferapti,' +
  'Nosferalto,Mystherbe,Ortide,Rafflesia,Paras,Parasect,Mimitoss,Aéromite,Taupiqueur,Triopikeur,Miaouss,Persian,Psykokwak,Akwakwak,' +
  'Férosinge,Colossinge,Caninos,Arcanin,Ptitard,Têtarte,Tartard,Abra,Kadabra,Alakazam,Machoc,Machopeur,Mackogneur,Chétiflor,Boustiflor,' +
  'Empiflor,Tentacool,Tentacruel,Racaillou,Gravalanch,Grolem,Ponyta,Galopa,Ramoloss,Flagadoss,Magnéti,Magnéton,Canarticho,Doduo,Dodrio,' +
  'Otaria,Lamantine,Tadmorv,Grotadmorv,Kokiyas,Crustabri,Fantominus,Spectrum,Ectoplasma,Onix,Soporifik,Hypnomade,Krabby,Krabboss,' +
  'Voltorbe,Électrode,Noeunoeuf,Noadkoko,Osselait,Ossatueur,Kicklee,Tygnon,Excelangue,Smogo,Smogogo,Rhinocorne,Rhinoféros,Leveinard,' +
  'Saquedeneu,Kangourex,Hypotrempe,Hypocéan,Poissirène,Poissoroy,Stari,Staross,M. Mime,Insécateur,Lippoutou,Élektek,Magmar,Scarabrute,' +
  'Tauros,Magicarpe,Léviator,Lokhlass,Métamorph,Évoli,Aquali,Voltali,Pyroli,Porygon,Amonita,Amonistar,Kabuto,Kabutops,Ptéra,Ronflex,' +
  'Artikodin,Électhor,Sulfura,Minidraco,Draco,Dracolosse,Mewtwo,Mew').split(',');
const DEX_N = DEX_NAMES.length;                       // 151
const dexName = id => DEX_NAMES[id - 1] || '???';
// rareté officielle : le taux de capture des jeux (3 = presque impossible, 255 = très facile), via PokeAPI,
// plus le statut légendaire / fabuleux
const CAPTURE = [45,45,45,45,45,45,45,45,45,255,120,45,255,120,45,255,120,45,255,127,255,90,255,90,190,75,255,90,235,120,45,235,120,45,150,25,190,75,170,50,255,90,255,120,45,190,75,190,75,255,50,255,90,190,75,190,75,190,75,255,120,45,200,100,50,180,90,45,255,120,45,190,60,255,120,45,190,60,190,75,190,60,45,190,45,190,75,190,75,190,60,190,90,45,45,190,75,225,60,190,60,90,45,190,75,45,45,45,190,60,120,60,30,45,45,225,75,225,60,225,60,45,45,45,45,45,45,45,255,45,45,35,45,45,45,45,45,45,45,45,45,45,25,3,3,3,45,45,45,3,45];
const LEGENDS = new Set([144, 145, 146, 150, 151]);
const TIERS = ['commun', 'peu', 'rare', 'epique', 'legendaire'];
const TIER_LABEL = { commun: 'Commun', peu: 'Peu commun', rare: 'Rare', epique: 'Épique', legendaire: 'Légendaire' };
const TIER_COLOR = { commun: '#8a94a6', peu: '#5fae5a', rare: '#4f86d6', epique: '#9b6fd6', legendaire: '#f2b23a' };
const TIER_RULE = { commun: 'taux de capture ≥ 190', peu: 'taux 100 à 189', rare: 'taux 60 à 99', epique: 'taux ≤ 50', legendaire: 'légendaires et fabuleux' };
const tierOf = id => { const c = CAPTURE[id - 1]; return LEGENDS.has(id) ? 'legendaire' : c >= 190 ? 'commun' : c >= 100 ? 'peu' : c >= 60 ? 'rare' : 'epique'; };
const TIER_OF = {}; for (let id = 1; id <= DEX_N; id++) TIER_OF[id] = tierOf(id);
const BY_TIER = {}; TIERS.forEach(t => { BY_TIER[t] = []; }); for (let id = 1; id <= DEX_N; id++) BY_TIER[TIER_OF[id]].push(id);
const WATER_IDS = new Set([7, 8, 9, 54, 55, 60, 61, 62, 72, 73, 86, 87, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 129, 130, 131, 134, 138, 139, 140, 141]);

// la roue : quelle Ball (w = chance de tomber dessus), et les raretés que chaque Ball peut contenir (en %, dans l'ordre de TIERS)
const BALLS = {
  poke: { name: 'Poké Ball', w: 50, odds: [70, 22, 8, 0, 0], top: '#e0533f', band: '#2a2636' },
  super: { name: 'Super Ball', w: 30, odds: [20, 40, 32, 8, 0], top: '#4f86d6', band: '#e0533f' },
  hyper: { name: 'Hyper Ball', w: 17, odds: [0, 10, 40, 47, 3], top: '#2a2636', band: '#f2c14a' },
  master: { name: 'Master Ball', w: 3, odds: [0, 0, 0, 65, 35], top: '#8a4fc8', band: '#ff8fd0' }
};
const WHEEL = ['poke', 'super', 'poke', 'hyper', 'poke', 'super', 'poke', 'master'];      // 8 parts (le tirage suit les poids, pas la taille des parts)
const SPRITE = {
  icon: id => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/' + id + '.png',
  front: id => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen/' + id + '.png'
};

/* ---------- sauvegarde ---------- */
const DEX = Object.assign({ tickets: 0, candies: 0, caught: {}, team: [], pulls: 0, starter: null, day: '', tools: 0, log: [] },
  (() => { try { return JSON.parse(localStorage.getItem('eo-dex') || '{}'); } catch { return {}; } })());
function saveDex() { try { localStorage.setItem('eo-dex', JSON.stringify(DEX)); } catch { } updateDexButton(); }
const caughtCount = () => Object.keys(DEX.caught).length;

/* ---------- gagner des tickets (seulement avec les vraies sessions, pas en démo) ---------- */
const dexLive = () => (typeof es !== 'undefined' && !!es) || (typeof rootHandle !== 'undefined' && !!rootHandle);
function earnTickets(n, why) {
  if (!n) return;
  DEX.tickets += n; saveDex();
  if (typeof pushNews === 'function') pushNews('🎟', '+' + n + ' ticket' + (n > 1 ? 's' : '') + ' Pokédex : ' + why, 'party');
}
function dexOnDone(a) { if (dexLive() && !a.isSub) earnTickets(1, a.name + ' a terminé sa tâche'); }
function dexOnTool() {                                     // appelé à chaque outil utilisé par un agent (lignes récentes seulement)
  if (!dexLive()) return;
  DEX.tools = (DEX.tools || 0) + 1;
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
  // un petit coup de pouce : on favorise un peu les Pokémon pas encore attrapés
  const pool = BY_TIER[tier], fresh = pool.filter(id => !DEX.caught[id]);
  const id = fresh.length && Math.random() < 0.6 ? pick(fresh) : pick(pool);
  return { id, tier };
}
function catchMon(id) {
  const isNew = !DEX.caught[id];
  DEX.caught[id] = (DEX.caught[id] || 0) + 1; DEX.pulls++;
  let candy = 0;
  if (!isNew) { candy = { commun: 1, peu: 1, rare: 2, epique: 3, legendaire: 5 }[TIER_OF[id]]; DEX.candies += candy; }
  if (isNew && DEX.team.length < 6) { DEX.team.push(id); if (typeof setGardenTeam === 'function') setGardenTeam(DEX.team); }
  DEX.log.unshift({ id, at: Date.now() }); DEX.log.length = Math.min(DEX.log.length, 30);
  saveDex();
  return { isNew, candy };
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
  const tabs = [['roue', '🎡 Roue'], ['dex', '📕 Pokédex'], ['jardin', '🌳 Mon jardin']];
  $dex.innerHTML = '<div class="dx-frame"><div class="dx-top"><span class="dx-led"></span><span class="dx-led s r"></span><span class="dx-led s y"></span><span class="dx-led s g"></span>' +
    '<b>POKÉDEX</b><span class="dx-sp"></span><span class="dx-chip">🎟 ' + DEX.tickets + ' ticket' + (DEX.tickets > 1 ? 's' : '') + '</span><span class="dx-chip">🍬 ' + DEX.candies + '</span>' +
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
let wheelAngle = 0;
// spinning : les ampoules du bord défilent ; hl : part gagnante qui clignote
function drawWheel(cnv, ang, spinning, hl) {
  const c = cnv.getContext('2d'), s = cnv.width, R0 = s / 2 - 16, cx = s / 2, cy = s / 2, n = WHEEL.length, now = performance.now();
  c.clearRect(0, 0, s, s);
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(cx, cy, R0 + 14, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e0533f'; c.beginPath(); c.arc(cx, cy, R0 + 11, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 24; i++) {                                     // guirlande d'ampoules
    const a = i / 24 * Math.PI * 2, lit = spinning ? (Math.floor(now / 70) + i) % 3 === 0 : hl != null ? Math.floor(now / 180) % 2 === i % 2 : i % 2 === 0;
    c.fillStyle = lit ? '#fff6b0' : '#8a3a2a'; c.beginPath(); c.arc(cx + Math.cos(a) * (R0 + 6), cy + Math.sin(a) * (R0 + 6), 3.2, 0, Math.PI * 2); c.fill();
    if (lit) { c.fillStyle = 'rgba(255,240,150,.35)'; c.beginPath(); c.arc(cx + Math.cos(a) * (R0 + 6), cy + Math.sin(a) * (R0 + 6), 6, 0, Math.PI * 2); c.fill(); }
  }
  c.fillStyle = '#2a2636'; c.beginPath(); c.arc(cx, cy, R0 + 2, 0, Math.PI * 2); c.fill();
  WHEEL.forEach((b, i) => {
    const a0 = ang + i * 2 * Math.PI / n - Math.PI / 2, a1 = a0 + 2 * Math.PI / n;
    c.fillStyle = i === hl && Math.floor(now / 150) % 2 ? '#fff6b0' : i % 2 ? '#fbf3dc' : '#f2d29c'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R0, a0, a1); c.closePath(); c.fill();
    c.strokeStyle = '#2a2636'; c.lineWidth = 2; c.stroke();
    const am = (a0 + a1) / 2; ballIcon(c, cx + Math.cos(am) * R0 * 0.66, cy + Math.sin(am) * R0 * 0.66, s * 0.065, b);
  });
  c.fillStyle = '#e0533f'; c.beginPath(); c.arc(cx, cy, 16, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a2636'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#ffffff'; c.font = '700 13px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✻', cx, cy + 1);
  // flèche en haut
  const bob = spinning ? Math.sin(now / 35) * 2 : 0;
  c.fillStyle = '#2a2636'; c.beginPath(); c.moveTo(cx - 13, 0); c.lineTo(cx + 13, 0); c.lineTo(cx + bob, 28); c.closePath(); c.fill();
  c.fillStyle = '#ffd166'; c.beginPath(); c.moveTo(cx - 9, 2); c.lineTo(cx + 9, 2); c.lineTo(cx + bob, 23); c.closePath(); c.fill();
}
function renderWheel(body) {
  body.innerHTML = '<div class="dx-wheel"><canvas width="320" height="320"></canvas><div class="dx-side">' +
    '<div class="dx-dialog" id="dxMsg">' + (DEX.tickets ? 'Fais tourner la roue pour gagner une Ball !' : 'Plus de tickets… Tes agents en gagnent un à chaque tâche terminée.') + '</div>' +
    '<button class="dx-go"' + (DEX.tickets ? '' : ' disabled') + '>🎡 Tourner la roue · 1 🎟</button>' +
    (DEX.candies >= 5 ? '<button class="dx-candy">🍬 Échanger 5 bonbons contre 1 ticket</button>' : '<div class="dx-hint">🍬 Les doublons donnent des bonbons : 5 bonbons = 1 ticket.</div>') +
    '<table class="dx-odds"><tr><th></th><th>Roue</th>' + TIERS.map(t => '<th title="' + TIER_RULE[t] + '"><i style="background:' + TIER_COLOR[t] + '"></i>' + TIER_LABEL[t] + '</th>').join('') + '</tr>' +
      Object.entries(BALLS).map(([k, b]) => '<tr><td><canvas width="22" height="22" data-b="' + k + '"></canvas> <b>' + b.name + '</b></td><td>' + b.w + ' %</td>' + b.odds.map(o => '<td>' + (o ? o + ' %' : '–') + '</td>').join('') + '</tr>').join('') + '</table>' +
      '<div class="dx-hint">Rareté = le vrai taux de capture des jeux Pokémon (survole les colonnes).</div>' +
    '</div></div><div class="dx-open" hidden></div>';
  const cnv = body.querySelector('.dx-wheel canvas'); drawWheel(cnv, wheelAngle);
  body.querySelectorAll('[data-b]').forEach(cc => ballIcon(cc.getContext('2d'), 11, 11, 8, cc.dataset.b));
  const candy = body.querySelector('.dx-candy');
  if (candy) candy.onclick = () => { DEX.candies -= 5; DEX.tickets++; saveDex(); renderDex(); };
  body.querySelector('.dx-go').onclick = () => spin(cnv, body);
}
function spin(cnv, body) {
  if (spinning || DEX.tickets < 1) return;
  DEX.tickets--; saveDex(); spinning = true;
  body.querySelector('.dx-go').disabled = true;
  const ball = rollBall(), n = WHEEL.length;
  const slots = WHEEL.map((b, i) => b === ball ? i : -1).filter(i => i >= 0), slot = pick(slots);
  // la part gagnante doit finir sous la flèche (en haut)
  const seg = 2 * Math.PI / n, target = -(slot + 0.5) * seg + (Math.random() - 0.5) * 0.6 * seg;
  const start = wheelAngle, end = target + 2 * Math.PI * Math.ceil((start + 10 * Math.PI - target) / (2 * Math.PI));   // au moins 5 tours
  const t0 = performance.now(), dur = 3600;
  let lastTick = -1;
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - p, 4);
    wheelAngle = start + (end - start) * e; drawWheel(cnv, wheelAngle, true);
    const tick = Math.floor((wheelAngle - start) / seg);
    if (tick !== lastTick) { lastTick = tick; if (!SETTINGS.gachaMute) try { tone(900 + (1 - p) * 700, 0.025, 'square', 0.02); } catch { } }
    if (p < 1) requestAnimationFrame(step);
    else {
      wheelAngle = end % (2 * Math.PI);
      // la part gagnante clignote un instant, puis le spectacle commence
      const t1 = performance.now(), blink = () => { drawWheel(cnv, wheelAngle, false, slot); if (performance.now() - t1 < 900) requestAnimationFrame(blink); else openBall(ball); };
      if (!SETTINGS.gachaMute) try { tone(1320, 0.12, 'square', 0.04); tone(1760, 0.2, 'square', 0.03, 0.1); } catch { }
      blink();
    }
  };
  requestAnimationFrame(step);
}
function openBall(ball) {
  const { id, tier } = rollMon(ball), res = catchMon(id);
  if (typeof pushNews === 'function') pushNews('📕', (res.isNew ? 'Nouveau Pokémon : ' : 'Encore un ') + dexName(id) + ' (' + TIER_LABEL[tier] + ')', res.isNew ? 'party' : '');
  updateDexButton();
  const done = action => {
    spinning = false;
    if (action === 'dex') { dexTab = 'dex'; renderDex(); return; }
    renderDex();
    if (action === 'again') { const go = $dex.querySelector('.dx-go'); if (go) go.click(); }
  };
  if (typeof gachaShow === 'function') gachaShow(ball, { id, tier, isNew: res.isNew, candy: res.candy }, done); else done('ok');
}

// le Pokédex : 151 cases, silhouettes pour ceux qu'il reste à attraper
function renderGrid(body) {
  let h = '<div class="dx-grid">';
  for (let id = 1; id <= DEX_N; id++) {
    const n = DEX.caught[id] || 0, tier = TIER_OF[id];
    h += '<div class="dx-cell' + (n ? ' got' : '') + (DEX.team.includes(id) ? ' team' : '') + '" title="' + (n ? esc(dexName(id)) + ' · ' + TIER_LABEL[tier] + ' · taux de capture ' + CAPTURE[id - 1] + ' · ×' + n : '??? · ' + TIER_LABEL[tier]) + '" data-id="' + id + '">' +
      '<span class="num">' + String(id).padStart(3, '0') + '</span>' + imgTag(id, 'icon', n ? '' : 'sil') +
      '<span class="nm">' + (n ? esc(dexName(id)) : '???') + '</span>' + (n > 1 ? '<span class="cnt">×' + n + '</span>' : '') +
      '<i style="background:' + TIER_COLOR[tier] + '"></i></div>';
  }
  body.innerHTML = '<div class="dx-hint">Clique sur un Pokémon attrapé pour l\'ajouter à ton jardin (ou l\'en retirer). 🌳 = dans le jardin.</div>' + h + '</div>';
  body.querySelectorAll('.dx-cell.got').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.id); renderDex(); });
}
function toggleTeam(id) {
  const i = DEX.team.indexOf(id);
  if (i >= 0) DEX.team.splice(i, 1);
  else if (DEX.team.length >= 6) { alert('Ton jardin accueille 6 Pokémon au maximum. Retire-en un d\'abord.'); return; }
  else DEX.team.push(id);
  saveDex(); if (typeof setGardenTeam === 'function') setGardenTeam(DEX.team);
}
// le jardin : les 6 Pokémon qui y vivent
function renderTeam(body) {
  const caught = Object.keys(DEX.caught).map(Number).sort((a, b) => a - b);
  body.innerHTML = '<div class="dx-dialog">Ton jardin accueille jusqu\'à 6 Pokémon. Les Pokémon aquatiques nagent dans la mare.</div>' +
    '<div class="dx-team">' + [0, 1, 2, 3, 4, 5].map(i => {
      const id = DEX.team[i];
      return id ? '<div class="dx-slot" data-rm="' + id + '">' + imgTag(id, 'front', 'mid') + '<b>' + esc(dexName(id)) + '</b><small>retirer</small></div>' : '<div class="dx-slot empty">vide</div>';
    }).join('') + '</div>' +
    '<h4>Tes Pokémon (' + caught.length + ')</h4><div class="dx-pick">' + caught.map(id => '<button data-add="' + id + '" class="' + (DEX.team.includes(id) ? 'in' : '') + '">' + imgTag(id, 'icon') + '<span>' + esc(dexName(id)) + '</span></button>').join('') + '</div>' +
    '<button class="dx-goto">🌳 Aller voir le jardin</button>';
  body.querySelectorAll('[data-rm]').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.rm); renderDex(); });
  body.querySelectorAll('[data-add]').forEach(el => el.onclick = () => { toggleTeam(+el.dataset.add); renderDex(); });
  body.querySelector('.dx-goto').onclick = () => { closeDex(); focusTiles(-8, 27, 14, 28); };
}

// au chargement : les habitants du jardin
setGardenTeam(DEX.team);
