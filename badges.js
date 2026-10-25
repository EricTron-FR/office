'use strict';
/* ====================================================================
   Eric Office : badges et défis du jour
   Des badges façon arène, débloqués par le vrai travail de tes agents (tâches, actions, nuits, travail
   en équipe) et par ta collection Pokémon. Chaque badge rapporte des tickets.
   Trois défis par jour (tirés au sort selon la date), chacun récompensé, plus un bonus si tu fais les trois.
   ==================================================================== */
DEX.stats = DEX.stats || {};
DEX.badges = DEX.badges || {};
const stv = k => DEX.stats[k] || 0;
// [id, nom, condition, forme, couleur, (stats) → [valeur, objectif], tickets]
const BADGES = [
  ['roche', 'Badge Roche', 'Un de tes agents termine sa première tâche', 'octa', '#9a9aa8', () => [stv('tasks'), 1], 1],
  ['cascade', 'Badge Cascade', '25 tâches terminées par tes agents', 'drop', '#4f9ae0', () => [stv('tasks'), 25], 3],
  ['foudre', 'Badge Foudre', '100 tâches terminées par tes agents', 'bolt', '#f2c14a', () => [stv('tasks'), 100], 5],
  ['prisme', 'Badge Prisme', '500 actions de tes agents (lire, éditer, lancer…)', 'flower', '#5fae5a', () => [stv('tools'), 500], 3],
  ['ame', 'Badge Âme', 'Des tâches terminées 3 jours d\'affilée', 'heart', '#e0607a', () => [stv('streak'), 3], 3],
  ['marais', 'Badge Marais', '3 agents au travail en même temps', 'ring', '#c9a046', () => [stv('maxBusy'), 3], 2],
  ['volcan', 'Badge Volcan', 'Une tâche terminée après 22 h', 'flame', '#e0533f', () => [stv('nights'), 1], 2],
  ['terre', 'Badge Terre', '2 000 actions de tes agents', 'leaf', '#3f9a5a', () => [stv('tools'), 2000], 5],
  ['zephyr', 'Badge Zéphyr', '10 Pokémon différents', 'diamond', '#8ab0e0', () => [caughtCount(), 10], 2],
  ['essaim', 'Badge Essaim', '50 Balls ouvertes', 'hex', '#9ac83a', () => [stv('pulls'), 50], 3],
  ['brume', 'Badge Brume', 'Attrape un Pokémon de type Spectre', 'ghost', '#7a5ab8', () => [stv('ghosts'), 1], 2],
  ['eclat', 'Badge Éclat', 'Ton premier Pokémon épique', 'star', '#9b6fd6', () => [stv('epics'), 1], 2],
  ['legende', 'Badge Légende', 'Ton premier Pokémon légendaire', 'crown', '#f2b23a', () => [stv('legends'), 1], 5],
  ['calin', 'Badge Câlin', '20 câlins aux chats et aux Pokémon', 'heart', '#ff9ad5', () => [stv('pets'), 20], 2],
  ['equipe', 'Badge Équipe', '10 messages échangés entre tes agents', 'bubble', '#3fb8c8', () => [stv('mails'), 10], 2],
  ['rafale', 'Badge Rafale', 'Ouvre une rafale ×10', 'burst', '#ff8a3a', () => [stv('multi10'), 1], 1],
  ['lune', 'Badge Lune', '5 tâches terminées la nuit', 'moon', '#4a5aa8', () => [stv('nights'), 5], 3],
  ['master', 'Badge Master', 'Gagne une Master Ball', 'ball', '#8a4fc8', () => [stv('masters'), 1], 3],
  ['kanto', 'Badge Kanto', 'Pokédex de Kanto complet', 'shield', '#e0533f', () => [regionCount(REGIONS[0]), 151], 15],
  ['sauvage', 'Badge Herbe Haute', 'Attrape un Pokémon sauvage dans les hautes herbes', 'leaf', '#6cc75a', () => [stv('wild'), 1], 2],
  ['chasseur', 'Badge Chasseur', '15 Pokémon sauvages attrapés', 'star', '#2e7d36', () => [stv('wild'), 15], 4],
  ['maitre', 'Badge Maître Pokémon', '500 Pokémon différents', 'trophy', '#ffd166', () => [caughtCount(), 500], 25]
];
// défis du jour : [stat, objectif, intitulé, tickets]
const DAILY_POOL = [
  ['tasks', 3, 'Tes agents terminent 3 tâches', 2], ['tasks', 6, 'Tes agents terminent 6 tâches', 3],
  ['tools', 80, 'Tes agents font 80 actions', 2], ['tools', 200, 'Tes agents font 200 actions', 3],
  ['pulls', 3, 'Ouvre 3 Balls', 1], ['newmons', 2, 'Attrape 2 nouveaux Pokémon', 2],
  ['pets', 5, 'Fais 5 câlins aux chats ou aux Pokémon', 1], ['mails', 2, 'Tes agents s\'écrivent 2 messages', 2],
  ['nights', 1, 'Une tâche terminée après 22 h', 2], ['wild', 1, 'Attrape un Pokémon sauvage dans les hautes herbes', 2]
];

/* ---------- stats ---------- */
const dayStr = d => (d || new Date()).toISOString().slice(0, 10);
function addStat(k, n) {
  DEX.stats[k] = stv(k) + (n || 1);
  if (k === 'tasks') {                                    // série de jours avec au moins une tâche
    const today = dayStr(), yest = dayStr(new Date(Date.now() - 86400000));
    if (DEX.stats.lastTaskDay !== today) {
      DEX.stats.run = DEX.stats.lastTaskDay === yest ? stv('run') + 1 : 1;
      DEX.stats.lastTaskDay = today; DEX.stats.streak = Math.max(stv('streak'), DEX.stats.run);
    }
  }
  saveDex(); checkAll();
}
function maxStat(k, v) { if (v > stv(k)) { DEX.stats[k] = v; saveDex(); checkAll(); } }
setInterval(() => {                                       // combien d'agents bossent en même temps (vraies sessions seulement)
  if (!dexLive()) return;
  maxStat('maxBusy', [...agents.values()].filter(a => !a.isSub && WORK.has(a.state)).length);
}, 5000);
HOOKS.pet.push(() => addStat('pets'));

/* ---------- badges ---------- */
function checkAll() { checkBadges(); checkDaily(); }
function checkBadges() {
  BADGES.forEach(([id, name, desc, shape, color, prog, reward]) => {
    if (DEX.badges[id]) return;
    const [v, goal] = prog();
    if (v < goal) return;
    DEX.badges[id] = Date.now(); DEX.tickets += reward; saveDex();
    if (typeof pushNews === 'function') pushNews('🏅', name + ' obtenu ! +' + reward + ' tickets', 'party');
    if (typeof celebrate === 'function') celebrate({ title: name + ' !', sub: desc, color, reward, draw: (c, s) => drawBadge(c, s, shape, color) });
  });
}

/* ---------- défis du jour ---------- */
function dailyPicks(day) {                                 // 3 défis différents, tirés selon la date
  let h = hash('defi' + day); const keys = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 50; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const d = DAILY_POOL[h % DAILY_POOL.length];
    if (keys.has(d[0])) continue; keys.add(d[0]); out.push(DAILY_POOL.indexOf(d));
  }
  return out;
}
function daily() {
  const today = dayStr();
  if (!DEX.daily || DEX.daily.day !== today) { DEX.daily = { day: today, base: Object.assign({}, DEX.stats), picks: dailyPicks(today), done: [], bonus: false }; saveDex(); }
  return DEX.daily;
}
const dailyProg = (D, i) => { const [k, goal] = DAILY_POOL[i]; return [Math.min(goal, stv(k) - (D.base[k] || 0)), goal]; };
function checkDaily() {
  const D = daily();
  D.picks.forEach(i => {
    if (D.done.includes(i)) return;
    const [v, goal] = dailyProg(D, i);
    if (v < goal) return;
    const [, , label, reward] = DAILY_POOL[i];
    D.done.push(i); DEX.tickets += reward; saveDex();
    if (typeof pushNews === 'function') pushNews('🎯', 'Défi du jour réussi : ' + label + ' (+' + reward + ' 🎟)', 'party');
    if (typeof celebrate === 'function') celebrate({ title: 'Défi réussi !', sub: label, color: '#5fae5a', reward, emoji: '🎯' });
  });
  if (!D.bonus && D.done.length === D.picks.length) {
    D.bonus = true; DEX.tickets += 2; saveDex();
    if (typeof celebrate === 'function') celebrate({ title: 'Les 3 défis du jour !', sub: 'Bonus de fin de journée', color: '#f2b23a', reward: 2, emoji: '🏆' });
  }
}
setTimeout(checkAll, 4000);
setInterval(() => { if (DEX.daily && DEX.daily.day !== dayStr()) { daily(); if (!$dex.hidden && dexTab === 'badges') renderDex(); } }, 60000);

/* ---------- dessin des badges (formes d'arène, contour sombre, reflet) ---------- */
function drawBadge(c, size, shape, color, locked) {
  const s = size / 100, cx = size / 2, cy = size / 2;
  c.save(); c.translate(cx, cy); c.scale(s, s);
  const P = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
  const poly = (n, r, rot) => P(Array.from({ length: n }, (_, i) => { const a = rot + i / n * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; }));
  const star = (n, r1, r2) => P(Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; return [Math.cos(a) * r, Math.sin(a) * r]; }));
  const path = {
    octa: () => poly(8, 40, Math.PI / 8), hex: () => poly(6, 40, 0), diamond: () => P([[0, -44], [34, 0], [0, 44], [-34, 0]]),
    star: () => star(5, 44, 20), burst: () => star(8, 44, 26), shield: () => P([[-34, -36], [34, -36], [34, 4], [0, 42], [-34, 4]]),
    drop: () => { c.beginPath(); c.moveTo(0, -44); c.bezierCurveTo(26, -10, 34, 6, 34, 16); c.arc(0, 16, 34, 0, Math.PI); c.bezierCurveTo(-34, 6, -26, -10, 0, -44); c.closePath(); },
    heart: () => { c.beginPath(); c.moveTo(0, 38); c.bezierCurveTo(-46, 6, -36, -38, 0, -16); c.bezierCurveTo(36, -38, 46, 6, 0, 38); c.closePath(); },
    bolt: () => P([[8, -44], [-26, 6], [-4, 6], [-12, 44], [26, -8], [4, -8]]),
    ring: () => { c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.arc(0, 0, 16, 0, Math.PI * 2, true); },
    flame: () => { c.beginPath(); c.moveTo(0, -44); c.bezierCurveTo(30, -16, 38, 10, 30, 26); c.bezierCurveTo(22, 42, -22, 42, -30, 26); c.bezierCurveTo(-38, 8, -18, -4, -14, -20); c.bezierCurveTo(-6, -8, 2, -18, 0, -44); c.closePath(); },
    leaf: () => { c.beginPath(); c.ellipse(0, 0, 22, 42, Math.PI / 5, 0, Math.PI * 2); },
    flower: () => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.moveTo(Math.cos(a) * 24 + 16, Math.sin(a) * 24); c.arc(Math.cos(a) * 24, Math.sin(a) * 24, 16, 0, Math.PI * 2); } c.moveTo(18, 0); c.arc(0, 0, 18, 0, Math.PI * 2); },
    ghost: () => { c.beginPath(); c.arc(0, -8, 32, Math.PI, 0); c.lineTo(32, 40); for (let i = 0; i < 4; i++) c.lineTo(32 - 16 * i - 8, i % 2 ? 40 : 30); c.lineTo(-32, 40); c.closePath(); },
    moon: () => { c.beginPath(); c.arc(0, 0, 40, Math.PI * 0.35, Math.PI * 1.65); c.arc(16, -4, 30, Math.PI * 1.5, Math.PI * 0.5, true); c.closePath(); },
    crown: () => P([[-40, 30], [-40, -22], [-20, 2], [0, -36], [20, 2], [40, -22], [40, 30]]),
    trophy: () => { c.beginPath(); c.moveTo(-30, -36); c.lineTo(30, -36); c.bezierCurveTo(30, 0, 14, 12, 8, 14); c.lineTo(8, 26); c.lineTo(22, 26); c.lineTo(22, 40); c.lineTo(-22, 40); c.lineTo(-22, 26); c.lineTo(-8, 26); c.lineTo(-8, 14); c.bezierCurveTo(-14, 12, -30, 0, -30, -36); c.closePath(); },
    bubble: () => { c.beginPath(); c.roundRect(-40, -34, 80, 56, 16); c.moveTo(-10, 22); c.lineTo(-22, 42); c.lineTo(8, 22); c.closePath(); },
    ball: () => { c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); }
  }[shape] || (() => { c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); });
  path();
  c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = '#2a2636'; c.stroke();
  if (locked) { c.fillStyle = '#d8d0c4'; c.fill('evenodd'); c.restore(); return; }
  const gr = c.createRadialGradient(-14, -18, 4, 0, 0, 50); gr.addColorStop(0, shade(color, 0.45)); gr.addColorStop(0.55, color); gr.addColorStop(1, shade(color, -0.3));
  c.fillStyle = gr; c.fill('evenodd');
  if (shape === 'ball') { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI); c.fill(); c.fillStyle = '#2a2636'; c.fillRect(-40, -5, 80, 10); c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); }
  c.save(); path(); c.clip('evenodd');                      // reflet
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-12, -22, 16, 8, -0.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(14, 22, 10, 4, -0.5, 0, Math.PI * 2); c.fill();
  c.restore();
  c.restore();
}

/* ---------- l'onglet « Badges & défis » ---------- */
function renderBadges(body) {
  const D = daily(), got = BADGES.filter(b => DEX.badges[b[0]]).length;
  const bar = (v, goal, col) => '<div class="bd-bar"><i style="width:' + Math.min(100, Math.round(v / goal * 100)) + '%;background:' + col + '"></i><span>' + Math.min(v, goal) + ' / ' + goal + '</span></div>';
  body.innerHTML = '<h4>🎯 Défis du jour</h4><div class="bd-daily">' + D.picks.map(i => {
      const [, , label, reward] = DAILY_POOL[i], [v, goal] = dailyProg(D, i), done = D.done.includes(i);
      return '<div class="bd-ch' + (done ? ' done' : '') + '"><b>' + (done ? '✅ ' : '') + esc(label) + '</b>' + bar(v, goal, '#5fae5a') + '<span class="bd-rew">+' + reward + ' 🎟</span></div>';
    }).join('') + '</div>' +
    '<div class="dx-hint">' + (D.bonus ? '🏆 Les trois défis sont faits : bonus récupéré !' : 'Fais les trois pour un bonus de +2 🎟. Nouveaux défis demain.') + '</div>' +
    '<h4>🏅 Boîte à badges · ' + got + ' / ' + BADGES.length + '</h4><div class="bd-case">' + BADGES.map(([id, name, desc, shape, color, prog, reward]) => {
      const owned = DEX.badges[id], [v, goal] = prog();
      return '<div class="bd-badge' + (owned ? ' got' : '') + '" title="' + esc(desc) + '"><canvas width="128" height="128" data-badge="' + id + '"></canvas><b>' + esc(name) + '</b><small>' + esc(desc) + '</small>' +
        (owned ? '<em>Obtenu le ' + new Date(owned).toLocaleDateString('fr-FR') + '</em>' : bar(v, goal, color) + '<span class="bd-rew">+' + reward + ' 🎟</span>') + '</div>';
    }).join('') + '</div>' +
    '<div class="dx-hint">Les badges liés à tes agents ne comptent que leurs vraies sessions (pas le mode démo).</div>';
  body.querySelectorAll('[data-badge]').forEach(cv2 => {
    const b = BADGES.find(x => x[0] === cv2.dataset.badge);
    drawBadge(cv2.getContext('2d'), 128, b[3], b[4], !DEX.badges[b[0]]);
  });
}
