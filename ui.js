'use strict';
/* ====================================================================
   Eric Office : interface
   fiches agents · fil d'actu · outils (zoom, pièces, laser, plein écran, kiosque)
   légende · réglages · sons · notifications · badge dans le titre
   ==================================================================== */
const $list = document.getElementById('list'), $detail = document.getElementById('detail');
const $ticker = document.getElementById('ticker'), $count = document.getElementById('count');
const $tools = document.getElementById('tools'), $legend = document.getElementById('legend'), $settings = document.getElementById('settings');
const ST_SHORT = { working: 'code', reading: 'lit', thinking: 'réfléchit', waiting: 'attend', idle: 'pause', asleep: 'dort' };
const ST_ORDER = { waiting: 0, working: 1, reading: 2, thinking: 3, idle: 4, asleep: 5 };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
document.querySelector('header h1').innerHTML = '<i>✻</i> ' + esc(OWNER) + ' Office';

/* ---------- sons (synthétisés, aucun fichier) ---------- */
let AC = null;
const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function tone(freq, dur, type, vol, delay) {
  const c = ac(), o = c.createOscillator(), gn = c.createGain(), t0 = c.currentTime + (delay || 0);
  o.type = type || 'sine'; o.frequency.value = freq;
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol || 0.07, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function purr() {
  const c = ac(), o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), gn = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = 46; lfo.frequency.value = 24; lg.gain.value = 0.035; gn.gain.value = 0.035;
  f.type = 'lowpass'; f.frequency.value = 280;
  lfo.connect(lg).connect(gn.gain); o.connect(f).connect(gn).connect(c.destination);
  o.start(); lfo.start(); gn.gain.setTargetAtTime(0, c.currentTime + 1.8, 0.3); o.stop(c.currentTime + 3); lfo.stop(c.currentTime + 3);
}
function sound(kind) {
  if (!SETTINGS.sound) return;
  try {
    if (kind === 'wait') { tone(880, 0.22); tone(660, 0.3, 'sine', 0.06, 0.16); }
    else if (kind === 'done') { tone(523, 0.16); tone(659, 0.16, 'sine', 0.07, 0.11); tone(784, 0.3, 'sine', 0.07, 0.22); }
    else if (kind === 'error') tone(196, 0.25, 'square', 0.035);
    else if (kind === 'purr') purr();
  } catch { }
}
HOOKS.pet.push(() => sound('purr'));
function notify(text) {
  if (!SETTINGS.notify || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(OWNER + ' Office', { body: text }); } catch { }
}

/* ---------- fil d'actu ---------- */
const NEWS = [];
function pushNews(icon, text, kind) {
  NEWS.unshift({ icon, text, kind: kind || '', t: new Date() });
  NEWS.length = Math.min(NEWS.length, 30);
  renderTicker();
  if (kind === 'done') sound('done');
}
function renderTicker() {
  if (!NEWS.length) return;
  $ticker.innerHTML = NEWS.slice(0, 8).map(n =>
    '<span class="ev ' + n.kind + '"><time>' + n.t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</time>' +
    '<span>' + n.icon + '</span><span>' + esc(n.text) + '</span></span>').join('');
}

/* ---------- suivi des changements d'état ---------- */
const TRACK = new Map();
const uiStart = Date.now();
function trackChanges() {
  const now = Date.now(), quiet = now - uiStart < 5000;
  agents.forEach(a => {
    let tr = TRACK.get(a.id);
    if (!tr) {
      TRACK.set(a.id, { state: a.state, since: now, errorAt: a.m && a.m.errorAt || 0, logCount: a.logCount || 0 });
      if (!quiet && TRACK.size > 0) pushNews('👋', a.name + ' arrive au bureau');
      return;
    }
    if (a.state !== tr.state) {
      if (a.state === 'waiting') { pushNews('⏳', a.name + ' attend ta validation', 'waiting'); sound('wait'); notify(a.name + ' attend ta validation'); }
      if (tr.state === 'asleep') pushNews('☀️', a.name + ' se réveille');
      tr.state = a.state; tr.since = now;
    }
    const e = a.m && a.m.errorAt || 0;
    if (e > tr.errorAt) { tr.errorAt = e; pushNews('❌', a.name + ' : échec' + (a.bubble ? ' sur « ' + a.bubble.replace(/^Attend \? /, '').replace(/\s*\(échec\)$/, '') + ' »' : ''), 'error'); sound('error'); }
    const lc = a.logCount || 0;
    if (lc > tr.logCount) {
      a.log.slice(-(lc - tr.logCount)).forEach(l => { if (l.text.startsWith('🧑') && !a.isSub && !l.text.includes('📬 Message de')) pushNews('💬', 'Tu as écrit à ' + a.name); });
      tr.logCount = lc;
    }
  });
  [...TRACK.keys()].forEach(id => { if (!agents.has(id)) TRACK.delete(id); });
  const waiting = [...agents.values()].filter(a => a.state === 'waiting').length;
  document.title = (waiting ? '(' + waiting + ') ' : '') + OWNER + ' Office';
}
setInterval(trackChanges, 500);

/* ---------- fiches agents (panneau de droite) ---------- */
const avatars = new Map();
function avatarOf(a) {
  let cnv = avatars.get(a.id);
  if (!cnv) {
    cnv = document.createElement('canvas'); cnv.width = 12; cnv.height = 18;
    const save = g; g = cnv.getContext('2d');
    drawSprite(buildRows(a, 'down', null, false).slice(0, 18), 6, 18, a.pal, false);
    g = save; avatars.set(a.id, cnv);
  }
  return cnv;
}
function dur(ms) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? s + ' s' : s < 3600 ? Math.floor(s / 60) + ' min' : Math.floor(s / 3600) + ' h ' + (Math.floor(s / 60) % 60);
}
function select(id) {
  selectedId = id; renderList(true); renderDetail(true);
  const a = agents.get(id);
  if (a && !a.isOwner) openChat(a); else closeChat();       // un clic sur un agent affiche sa discussion
}
function renderList(force) {
  let list = [...agents.values()].sort((p, q) => ST_ORDER[p.state] - ST_ORDER[q.state] || p.title.localeCompare(q.title));
  const waiting = list.filter(a => a.state === 'waiting').length;
  $count.textContent = list.length ? list.length + (waiting ? ' · ' + waiting + ' en attente' : '') : '';
  if (SETTINGS.onlyWaiting) list = list.filter(a => a.state === 'waiting');
  const now = Date.now();
  const sig = list.map(a => a.id + a.state + a.mood + a.title + a.bubble + a.actLabel + (a.id === selectedId) + Math.floor((now - ((TRACK.get(a.id) || {}).since || now)) / 10000)).join('|');
  if (!force && sig === renderList.sig) return; renderList.sig = sig;
  if (!list.length) {
    $list.innerHTML = '<div class="empty" style="padding:4px 16px">' + (SETTINGS.onlyWaiting && agents.size ? 'Personne ne t\'attend 🎉' : 'Aucun agent actif.') + '</div>';
    return;
  }
  $list.innerHTML = '';
  list.forEach(a => {
    const el = document.createElement('div'); el.className = 'card' + (a.id === selectedId ? ' sel' : '');
    const since = (TRACK.get(a.id) || {}).since || now;
    const sub = a.mood ? MOOD_LABEL[a.mood] : (a.bubble || a.actLabel || STATE_LABEL[a.state]);
    el.innerHTML = '<div class="meta"><b>' + esc(a.title) + '</b><small>' + esc(sub) + '</small></div>' +
      '<div style="text-align:right;flex:none"><span class="st" style="background:' + STATE_COLOR[a.state] + '">' + ST_SHORT[a.state] + '</span>' +
      '<div class="dur">' + dur(now - since) + '</div></div>';
    const av = avatarOf(a); const img = document.createElement('canvas'); img.width = 12; img.height = 18;
    img.getContext('2d').drawImage(av, 0, 0); el.prepend(img);
    el.onclick = () => select(a.id); $list.appendChild(el);
  });
}
let detailSig = '';
function renderDetail(force) {
  const a = selectedId === 'owner' ? owner : agents.get(selectedId);
  if (!a) { if (detailSig !== 'none') { $detail.innerHTML = '<div class="empty">Clique sur un perso pour voir ce qu\'il fait.</div>'; detailSig = 'none'; } return; }
  const fame = FAME.n[a.title] || 0, eod = employeeOfDay();
  const run = runFor(a.sessionId);
  const sig = a.id + (a.logCount || 0) + a.state + fame + (eod && eod.name) + (run ? run.id + run.status : '') + !!API_TOKEN;
  if (!force && sig === detailSig) return; detailSig = sig;
  const draftEl = $detail.querySelector('.chat textarea');                    // on garde le brouillon en cours
  const draft = draftEl ? { v: draftEl.value, focus: draftEl === document.activeElement, id: a.id } : null;
  if (a.isOwner) {
    $detail.innerHTML = '<div class="fame">★ Le patron. ' + (eod ? 'Employé du jour : <b>' + esc(eod.name) + '</b> (' + eod.n + ' tâche' + (eod.n > 1 ? 's' : '') + ')' : 'Pas encore d\'employé du jour.') + '</div>' +
      '<div class="empty">' + esc(a.actLabel || 'Gère la boîte') + '</div>';
    return;
  }
  $detail.innerHTML = '<div class="cwd"></div>' +
    '<div class="fame">' + (fame ? '✅ ' + fame + ' tâche' + (fame > 1 ? 's' : '') + ' terminée' + (fame > 1 ? 's' : '') + ' aujourd\'hui' : '') + (eod && eod.name === a.title ? ' · ★ Employé du jour' : '') + '</div>' +
    '<div class="acts"><button class="ghost" data-a="rename">✏️ Renommer</button><button class="ghost" data-a="center">🎯 Centrer</button><button class="ghost" data-a="dismiss" title="Retirer du bureau (sa conversation reste sur le disque)">🗑 Retirer</button>' + (a.cwd ? '<button class="ghost" data-a="code">VS Code</button><button class="ghost" data-a="copy">Copier le chemin</button>' : '') + '</div>' +
    '<div id="log"></div>';
  $detail.querySelector('.cwd').textContent = a.cwd || '(dossier inconnu)';
  const us = USAGE && USAGE.sessions[a.id];
  if (us) $detail.querySelector('.fame').insertAdjacentHTML('beforeend', '<div style="color:var(--mute);margin-top:3px">📊 ' + fmtTok(us.tokens) + ' tokens · ' + us.msgs + ' réponses · ' + fmtUsd(us.cost) + ' (7 j)</div>');
  $detail.querySelector('[data-a=rename]').onclick = () => {
    const acts = $detail.querySelector('.acts');
    acts.innerHTML = '<input type="text" maxlength="40" style="flex:1;min-width:0;background:#1f1e1d;border:1px solid var(--clay);color:var(--cream);border-radius:6px;padding:4px 8px;font:inherit">' +
      '<button data-r="ok">OK</button><button class="ghost" data-r="reset" title="Revenir au nom du projet">↺</button>';
    const inp = acts.querySelector('input'); inp.value = a.title; inp.focus(); inp.select();
    const done = v => { setNick(a, v); avatars.delete(a.id); renderList(true); renderDetail(true); };
    acts.querySelector('[data-r=ok]').onclick = () => done(inp.value);
    acts.querySelector('[data-r=reset]').onclick = () => done('');
    inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') renderDetail(true); e.stopPropagation(); };
  };
  $detail.querySelector('[data-a=dismiss]').onclick = () => {
    if (confirm('Retirer « ' + a.name + ' » du bureau ?\n\nSa conversation reste sur le disque. Il reviendra s\'il a une nouvelle activité.')) dismissAgent(a);
  };
  $detail.querySelector('[data-a=center]').onclick = () => { if (a._anchor) { VIEW.z = 3; VIEW.cx = a._anchor.x; VIEW.cy = a._anchor.y + 12; } };
  const code = $detail.querySelector('[data-a=code]');
  if (code) code.onclick = () => { location.href = 'vscode://file/' + encodeURI(a.cwd.replace(/\\/g, '/')); };
  const copy = $detail.querySelector('[data-a=copy]');
  if (copy) copy.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(a.cwd); copy.textContent = 'Copié ✓'; };
  const chat = chatBox(a);
  if (chat) {
    $detail.querySelector('#log').before(chat);
    if (draft && draft.id === a.id) { const ta = chat.querySelector('textarea'); ta.value = draft.v; if (draft.focus) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } }
  }
  const box = $detail.querySelector('#log');
  a.log.slice(-40).reverse().forEach(l => { const d = document.createElement('div'); d.innerHTML = '<time></time><span></span>'; d.querySelector('time').textContent = l.t; d.querySelector('span').textContent = l.text; box.appendChild(d); });
}
setInterval(() => { renderList(); renderDetail(); }, 1000);

/* ---------- barre d'outils ---------- */
function tool(label, title, fn, id) {
  const b = document.createElement('button'); b.textContent = label; b.title = title; b.onclick = e => { e.stopPropagation(); fn(b); };
  if (id) b.id = id; $tools.appendChild(b); return b;
}
const sep = () => { const s = document.createElement('span'); s.className = 'sep'; $tools.appendChild(s); };
// panneau de droite repliable (replié d'office sur les petits écrans) : plus de place pour le bureau
const asideBtn = tool('◧', 'Afficher / masquer le panneau de droite', () => setAside(document.body.classList.contains('noaside')));
function setAside(show) {
  document.body.classList.toggle('noaside', !show); asideBtn.classList.toggle('on', !show);
  SETTINGS.aside = show ? 'show' : 'hide'; saveSettings();
}
if (SETTINGS.aside === 'hide' || (!SETTINGS.aside && innerWidth < 1300)) setAside(false);
tool('−', 'Dézoomer',() => { VIEW.z = Math.max(1, VIEW.z / 1.3); });
tool('+', 'Zoomer (ou molette)', () => { VIEW.z = Math.min(5, VIEW.z * 1.3); });
tool('⤢', 'Tout voir', () => { VIEW.z = 1; VIEW.cx = W / 2; VIEW.cy = H / 2; });
sep();
{ // aller dans une pièce
  const PLACES = [['Tout le bureau', null], ['Bureau de ' + OWNER, [-8, -1, 0, 14]], ['Open space', [0, 22, 0, 14]], ['Salle de pause', [23, 32, 0, 14]],
    ['Terrasse', [32, 42, 0, 14]], ['Salle de jeux', [-8, 5, 14, 28]], ['Salle de tests', [5, 17, 14, 28]], ['Salle serveur', [17, 27, 14, 28]], ['Bibliothèque', [27, 42, 14, 28]]];
  const sel = document.createElement('select');
  sel.style.cssText = 'background:rgba(31,30,29,.8);border:1px solid #4a4743;color:var(--cream);border-radius:8px;padding:4px 6px;font:inherit;font-size:12px;cursor:pointer';
  sel.innerHTML = '<option value="">📍 Aller à…</option>' + PLACES.map((p, i) => '<option value="' + i + '">' + esc(p[0]) + '</option>').join('');
  sel.onchange = () => {
    const p = PLACES[+sel.value]; if (!p) return;
    if (p[1]) focusTiles(...p[1]); else { VIEW.z = 1; VIEW.cx = W / 2; VIEW.cy = H / 2; }
    sel.value = '';
  };
  $tools.appendChild(sel);
}
sep();
tool('🔴 Laser', 'Les chats courent après ta souris', b => {
  LASER.on = !LASER.on; b.classList.toggle('on', LASER.on);
  if (LASER.on) pushNews('🔴', 'Laser activé : ' + cats.map(c => c.name).join(' et ') + ' arrivent !');
});
tool('⛶', 'Plein écran', () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => { }); });
tool('🖥', 'Mode kiosque (sans panneaux, Échap pour sortir)', () => {
  document.body.classList.toggle('kiosk');
  if (document.body.classList.contains('kiosk') && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
});
sep();
const $usage = document.createElement('div'); $usage.className = 'pop'; $usage.id = 'usage'; $usage.hidden = true;
$tools.parentElement.appendChild($usage);
const pop = (el, btn) => { const open = el.hidden; [$legend, $settings, $usage].forEach(p => p.hidden = true); el.hidden = !open; };

/* ---------- consommation Claude ---------- */
let USAGE = null;
const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(n);
const fmtUsd = n => '≈ ' + (n < 10 ? n.toFixed(2) : Math.round(n)).toString().replace('.', ',') + ' $';
async function loadUsage() {
  if (!location.protocol.startsWith('http')) { $usage.innerHTML = '<div class="empty">Disponible quand le serveur tourne (start.bat).</div>'; return; }
  try { USAGE = await (await fetch('/api/usage')).json(); } catch { $usage.innerHTML = '<div class="empty">Impossible de lire la consommation.</div>'; return; }
  renderUsage();
}
function renderUsage() {
  if (!USAGE) return;
  const U = USAGE, max = Math.max(1, ...U.days.map(d => d.tokens)), J = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const tile = (l, b) => '<div style="flex:1;background:#1f1e1d;border-radius:8px;padding:7px 9px"><div style="font-size:11px;color:var(--mute)">' + l + '</div>' +
    '<div style="font-size:17px;font-weight:700">' + fmtTok(b.tokens) + '</div><div style="font-size:11px;color:var(--mute)">' + b.msgs + ' réponses · ' + fmtUsd(b.cost) + '</div></div>';
  const top = (obj, n, label) => Object.entries(obj).sort((p, q) => q[1].tokens - p[1].tokens).slice(0, n)
    .map(([k, b]) => '<div class="lg" style="justify-content:space-between"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px">' + esc(label(k)) + '</span><span style="color:var(--mute);white-space:nowrap">' + fmtTok(b.tokens) + ' · ' + fmtUsd(b.cost) + '</span></div>').join('') || '<div class="empty">Rien pour l\'instant.</div>';
  $usage.innerHTML = '<h3>Ta consommation Claude</h3>' +
    '<div style="display:flex;gap:6px;margin-bottom:10px">' + tile('5 dernières heures', U.last5h) + tile('Aujourd\'hui', U.today) + tile('7 jours', U.week) + '</div>' +
    '<div style="display:flex;align-items:flex-end;gap:6px;height:70px;margin:4px 0 2px">' + U.days.map((d, i) =>
      '<div title="' + fmtTok(d.tokens) + ' · ' + fmtUsd(d.cost) + '" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%"><div style="height:' + Math.max(2, Math.round(d.tokens / max * 64)) + 'px;background:' + (i === 6 ? 'var(--clay)' : '#6b5a4c') + ';border-radius:3px 3px 0 0"></div></div>').join('') + '</div>' +
    '<div style="display:flex;gap:6px;font-size:10.5px;color:var(--mute);margin-bottom:10px">' + U.days.map(d => '<span style="flex:1;text-align:center">' + J[d.day] + '</span>').join('') + '</div>' +
    '<h3>Par projet (7 j)</h3>' + top(U.projects, 5, k => k.split(/[\\/]/).pop()) +
    '<h3 style="margin-top:10px">Par modèle (7 j)</h3>' + top(U.models, 4, k => k) +
    '<div class="empty" style="font-size:11px;margin-top:10px;max-width:330px">Tokens lus dans tes sessions Claude Code sur ce PC (cache compris). Le coût est l\'équivalent au tarif API : avec un abonnement, ce n\'est pas ce que tu paies. Le quota de ton abonnement n\'est pas consultable ici.</div>';
}
setInterval(() => { if (!$usage.hidden || selectedId) loadUsage(); }, 30000);
if (location.protocol.startsWith('http')) setTimeout(loadUsage, 2000);
tool('📊 Conso', 'Ta consommation Claude (tokens notés dans tes sessions)', () => { const open = $usage.hidden; [$legend, $settings].forEach(p => p.hidden = true); $usage.hidden = !open; if (open) loadUsage(); });
tool('? Légende', 'Que veulent dire les couleurs ?', () => pop($legend));
tool('⚙', 'Réglages', () => { renderSettings(); pop($settings); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('kiosk'); [$legend, $settings].forEach(p => p.hidden = true); } });
document.addEventListener('click', e => { if (!e.target.closest('.pop') && !e.target.closest('#tools')) [$legend, $settings, $usage].forEach(p => p.hidden = true); });

$legend.innerHTML = '<h3>États</h3>' +
  [['working', 'Code (édite, lance des commandes)'], ['reading', 'Lit, cherche, va sur le web'], ['thinking', 'Réfléchit'], ['waiting', 'Attend ta validation'], ['idle', 'En pause'], ['asleep', 'Inactif depuis 30 min']]
    .map(([k, l]) => '<div class="lg"><i style="background:' + STATE_COLOR[k] + '"></i>' + l + '</div>').join('') +
  '<h3 style="margin-top:12px">Humeurs</h3>' +
  [['💢', 'Une commande a échoué (rouge = plusieurs de suite)'], ['🤔', 'Réfléchit longtemps, puis se tient la tête'], ['💦', 'En plein rush'], ['✨', 'Tâche terminée'], ['❗', 'T\'attend'], ['☕', 'Une gorgée de café']]
    .map(([e, l]) => '<div class="lg"><span class="e">' + e + '</span>' + l + '</div>').join('') +
  '<h3 style="margin-top:12px">Astuces</h3><div class="lg">Molette pour zoomer, glisser pour se déplacer.</div><div class="lg">Clique sur un chat pour le caresser.</div>';

/* ====================================================================
   Agents pilotés depuis le bureau : lancement, discussion, autorisations
   ==================================================================== */
const RUNS = new Map(), PERMS = new Map();
// agents retirés du bureau : clé de session -> date du retrait (ils reviennent s'ils ont une nouvelle activité)
const HIDDEN = (() => { try { return JSON.parse(localStorage.getItem('eo-hidden') || '{}'); } catch { return {}; } })();
const saveHidden = () => { try { localStorage.setItem('eo-hidden', JSON.stringify(HIDDEN)); } catch { } };
function dismissAgent(a) {
  const run = runFor(a.sessionId);
  if (run && API_TOKEN) api('/api/runs/' + run.id + '/stop').catch(() => { });
  HIDDEN[a.id] = { at: Date.now(), name: a.name };
  saveHidden();
  pushNews('🗑', a.name + ' a été retiré du bureau');
  removeAgent(a); select(null);
}
const $perms = document.getElementById('perms'), $newagent = document.getElementById('newagent'), $btnNew = document.getElementById('btnNew');
let API_TOKEN = null;
if (location.protocol.startsWith('http')) {
  fetch('/api/session-token').then(r => r.json()).then(j => { API_TOKEN = j.token; $btnNew.hidden = false; }).catch(() => { });
}
async function api(pathname, body) {
  const r = await fetch(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EO-Token': API_TOKEN || '' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('Erreur ' + r.status));
  return j;
}
const runFor = sid => sid && [...RUNS.values()].find(r => r.sessionId === sid && r.status !== 'ended');
function permFor(sid) { return sid && [...PERMS.values()].find(p => p.sessionId === sid); }
function permLabel(p) {
  const i = p.input || {}, base = s => String(s || '').split(/[\\/]/).pop();
  if (i.command) return p.tool + ' · ' + i.command;
  if (i.file_path) return p.tool + ' · ' + base(i.file_path);
  if (i.url) return p.tool + ' · ' + i.url;
  return p.tool;
}
function alwaysLabel(p) {                // même règle que le serveur : « npm test », « git status »… ou l'outil entier
  if (p.tool !== 'Bash' && p.tool !== 'PowerShell') return p.tool;
  const w = String((p.input || {}).command || '').trim().split(/\s+/);
  return w[1] && /^[a-z][\w:.-]*$/i.test(w[1]) ? w[0] + ' ' + w[1] : w[0];
}
function permDetail(p) {
  const i = p.input || {};
  if (i.command) return i.command;
  if (i.file_path && (i.new_string || i.content)) return i.file_path + '\n\n' + String(i.new_string || i.content).slice(0, 600);
  return JSON.stringify(i, null, 1).slice(0, 600);
}
const agentOfPerm = p => [...agents.values()].find(a => a.sessionId === p.sessionId);
function onPerm(p) {
  const a = agentOfPerm(p), who = a ? a.name : (p.cwd ? p.cwd.split(/[\\/]/).pop() : 'Un agent');
  pushNews('🔐', who + ' demande : ' + permLabel(p), 'waiting'); sound('wait'); notify(who + ' demande ton autorisation : ' + permLabel(p));
  renderPerms();
}
// messagerie d'équipe : un agent écrit à un autre, il se lève et va lui parler
const sentNames = new Map();
function onMail(m) {
  const all = [...agents.values()], bySid = sid => sid && all.find(a => a.sessionId === sid);
  const from = bySid(m.fromSession), to = bySid(m.toSession);
  const short = m.text.length > 70 ? m.text.slice(0, 70) + '…' : m.text;
  pushNews('✉️', (from ? from.name : m.from) + ' → ' + (to ? to.name : m.to) + ' : ' + short);
  if (to) addLog(to, '📬 De ' + (from ? from.name : m.from) + ' : ' + short);
  if (from) addLog(from, '✉️ À ' + (to ? to.name : m.to) + ' : ' + short);
  if (from && to) chatVisit(from, to);
}
function onRunsChanged(r) {
  RUNS.forEach(run => {                             // le nom d'équipe suit le nom affiché dans le bureau
    const a = run.status !== 'ended' && [...agents.values()].find(x => x.sessionId === run.sessionId);
    if (a && API_TOKEN && a.name !== run.name && sentNames.get(run.id) !== a.name) {
      sentNames.set(run.id, a.name); api('/api/runs/' + run.id + '/name', { name: a.name }).catch(() => { });
    }
  });
  if (r && r.error && r.status !== 'running' && r.error !== onRunsChanged.lastErr) {
    onRunsChanged.lastErr = r.error;
    pushNews('⚠️', /not logged in/i.test(r.error) ? 'Claude Code n\'est pas connecté : lance « claude » dans un terminal puis /login' : 'Agent : ' + r.error, 'error');
  }
  renderPerms(); renderDetail(true);
}
function renderPerms() {
  const list = [...PERMS.values()].sort((p, q) => p.at - q.at);
  $perms.innerHTML = '';
  list.forEach(p => {
    const a = agentOfPerm(p), who = a ? a.name : (p.cwd ? p.cwd.split(/[\\/]/).pop() : 'Agent');
    const el = document.createElement('div'); el.className = 'perm';
    el.innerHTML = '🔐 <b></b> veut utiliser <b></b><code></code><div class="row" style="flex-wrap:wrap"><button>✅ Autoriser</button><button data-always title="Ne plus me demander pour ça pendant cette session"></button><button class="no">❌ Refuser</button>' +
      (a ? '<button class="no" data-s>Voir</button>' : '') + '</div>';
    const bs = el.querySelectorAll('b'); bs[0].textContent = who; bs[1].textContent = p.tool;
    el.querySelector('code').textContent = permDetail(p);
    el.querySelector('[data-always]').textContent = '✅ Toujours « ' + alwaysLabel(p) + ' »';
    const ok = el.querySelector('.row button'), no = el.querySelector('.row .no');
    ok.onclick = () => api('/api/perm/' + p.id, { allow: true }).catch(e => alert(e.message));
    el.querySelector('[data-always]').onclick = () => api('/api/perm/' + p.id, { allow: true, always: true }).then(() => pushNews('✅', 'Toujours autorisé pour ' + who + ' : ' + alwaysLabel(p))).catch(e => alert(e.message));
    no.onclick = () => api('/api/perm/' + p.id, { allow: false }).catch(e => alert(e.message));
    const see = el.querySelector('[data-s]'); if (see) see.onclick = () => select(a.id);
    $perms.appendChild(el);
  });
}
// formulaire « Nouvel agent »
$btnNew.onclick = e => {
  e.stopPropagation();
  const dirs = [...new Set([...agents.values()].map(a => a.cwd).filter(Boolean))];
  $newagent.innerHTML = '<h3>Nouvel agent</h3>' +
    '<label>Dossier de travail</label><input type="text" id="naDir" list="naDirs" placeholder="C:\\Users\\…\\mon-projet">' +
    '<datalist id="naDirs">' + dirs.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>' +
    '<label>Ce qu\'il doit faire</label><textarea id="naPrompt" placeholder="Ex. : ajoute des tests pour le module de paiement"></textarea>' +
    '<label>Autorisations</label><select id="naMode"><option value="default">Me demander avant chaque action sensible</option>' +
    '<option value="acceptEdits">Modifier les fichiers sans demander (commandes : je valide)</option></select>' +
    '<div style="display:flex;gap:8px;margin-top:12px"><button id="naGo">🚀 Lancer</button><button class="ghost" id="naCancel">Annuler</button></div>' +
    '<div class="empty" id="naMsg" style="margin-top:8px;font-size:12px"></div>';
  [$legend, $settings].forEach(p => p.hidden = true); $newagent.hidden = false;
  if (dirs[0]) $newagent.querySelector('#naDir').value = dirs[0];
  $newagent.querySelector('#naCancel').onclick = () => { $newagent.hidden = true; };
  $newagent.querySelector('#naGo').onclick = async () => {
    const cwd = $newagent.querySelector('#naDir').value.trim(), prompt = $newagent.querySelector('#naPrompt').value.trim();
    const msg = $newagent.querySelector('#naMsg');
    if (!cwd || !prompt) { msg.textContent = 'Indique un dossier et une consigne.'; return; }
    try {
      msg.textContent = 'Lancement…';
      await api('/api/runs', { cwd, prompt, mode: $newagent.querySelector('#naMode').value });
      pushNews('🚀', 'Nouvel agent lancé dans ' + cwd.split(/[\\/]/).pop());
      $newagent.hidden = true;
    } catch (err) { msg.textContent = '⚠️ ' + err.message; }
  };
};
document.addEventListener('click', e => { if (!e.target.closest('#newagent') && e.target !== $btnNew) $newagent.hidden = true; });
// dans la fiche : un bouton pour ouvrir la discussion
function chatBox(a) {
  if (a.isOwner) return null;
  const box = document.createElement('div');
  box.innerHTML = '<button style="width:100%;margin:2px 0 10px">💬 Ouvrir la discussion</button>';
  box.querySelector('button').onclick = () => openChat(a);
  return box;
}
// envoi d'un message : dans la conversation pilotée, ou en reprenant la session
async function sendTo(a, text) {
  const r = runFor(a.sessionId);
  if (r) return api('/api/runs/' + r.id + '/message', { text });
  if (!a.cwd) throw new Error('Dossier de la session inconnu.');
  return api('/api/runs', { cwd: a.cwd, prompt: text, resume: a.sessionId });
}

/* ====================================================================
   Fenêtre de discussion, façon app Claude Code
   ==================================================================== */
const $chat = document.createElement('div'); $chat.id = 'chat'; $chat.hidden = true;
$chat.innerHTML =
  '<div class="ch-head"><canvas width="12" height="18"></canvas><div class="ch-who"><b></b><small></small></div><span class="st"></span>' +
  '<button class="ghost ch-stop" title="Arrêter l\'agent">⏹</button><button class="ghost ch-close" title="Fermer (Échap)">✕</button></div>' +
  '<div class="ch-acts"><button class="ghost" data-c="rename" title="Renommer">✏️</button><button class="ghost" data-c="center" title="Centrer sur lui au bureau">🎯</button>' +
  '<button class="ghost" data-c="code" title="Ouvrir le dossier dans VS Code">VS Code</button><button class="ghost" data-c="copy" title="Copier le chemin du dossier">📋</button>' +
  '<button class="ghost" data-c="dismiss" title="Retirer du bureau">🗑</button><span class="sub"></span></div>' +
  '<div class="ch-log"></div><div class="ch-perms"></div>' +
  '<div class="ch-foot"><textarea rows="1" placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"></textarea><button class="ch-send">➤</button></div>' +
  '<div class="ch-hint"></div>';
document.querySelector('aside').appendChild($chat);
// actions de l'agent, dans l'en-tête de la discussion
$chat.querySelector('.ch-acts').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'), a = agents.get(chatId);
  if (!b || !a) return;
  const c = b.dataset.c;
  if (c === 'rename') { const v = prompt('Nouveau nom pour cet agent (vide = nom du projet) :', a.title); if (v !== null) { setNick(a, v); avatars.delete(a.id); renderList(true); chatSig = ''; } }
  if (c === 'center' && a._anchor) { VIEW.z = 3; VIEW.cx = a._anchor.x; VIEW.cy = a._anchor.y + 12; }
  if (c === 'code' && a.cwd) location.href = 'vscode://file/' + encodeURI(a.cwd.replace(/\\/g, '/'));
  if (c === 'copy' && a.cwd && navigator.clipboard) { navigator.clipboard.writeText(a.cwd); b.textContent = '✓'; setTimeout(() => { b.textContent = '📋'; }, 1500); }
  if (c === 'dismiss' && confirm('Retirer « ' + a.name + ' » du bureau ?\n\nSa conversation reste sur le disque. Il reviendra s\'il a une nouvelle activité.')) dismissAgent(a);
});
const $clog = $chat.querySelector('.ch-log'), $cta = $chat.querySelector('textarea'), $cperms = $chat.querySelector('.ch-perms');
let chatId = null, chatSig = '';
const chatOpen = new Set();             // outils dépliés
const localSent = [];                   // messages envoyés, en attente d'apparaître dans la session

function md(text) {                      // mise en forme légère : blocs de code, `code`, **gras**, titres
  return String(text).split('```').map((part, i) => {
    if (i % 2) { const body = part.replace(/^[\w+-]*\n/, ''); return '<pre class="ch-code">' + esc(body.replace(/\n$/, '')) + '</pre>'; }
    return '<div class="ch-p">' + esc(part)
      .replace(/^#{1,6} (.*)$/gm, '<b>$1</b>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/^\s*[-*] /gm, '• ').trim() + '</div>';
  }).join('');
}
function toolDetail(it) {
  const i = it.input || {}, lines = (s, n) => String(s || '').split('\n').slice(0, n);
  let h = '';
  if (i.command) h += '<pre class="ch-code">$ ' + esc(i.command) + '</pre>';
  else if (i.old_string != null || i.edits) {
    const edits = i.edits || [{ old_string: i.old_string, new_string: i.new_string }];
    h += '<pre class="ch-code ch-diff">' + edits.map(e => lines(e.old_string, 25).map(l => '<span class="del">- ' + esc(l) + '</span>').join('\n') + '\n' +
      lines(e.new_string, 25).map(l => '<span class="add">+ ' + esc(l) + '</span>').join('\n')).join('\n···\n') + '</pre>';
  } else if (i.content != null) h += '<pre class="ch-code">' + esc(lines(i.content, 30).join('\n')) + (String(i.content).split('\n').length > 30 ? '\n…' : '') + '</pre>';
  else h += '<pre class="ch-code">' + esc(JSON.stringify(i, null, 2).slice(0, 1500)) + '</pre>';
  if (it.out) h += '<div class="ch-outl">' + (it.st === 'err' ? 'Erreur' : 'Résultat') + '</div><pre class="ch-code ch-out' + (it.st === 'err' ? ' err' : '') + '">' + esc(it.out.slice(0, 2500)) + (it.out.length > 2500 ? '\n…' : '') + '</pre>';
  return h;
}
function openChat(a) {
  if (selectedId !== a.id) { select(a.id); return; }        // select() ouvre la discussion
  chatId = a.id; chatSig = ''; $chat.hidden = false; document.body.classList.add('chatting');
  const av = avatarOf(a), c = $chat.querySelector('.ch-head canvas'); c.getContext('2d').clearRect(0, 0, 12, 18); c.getContext('2d').drawImage(av, 0, 0);
  renderChat(true); setTimeout(() => { $clog.scrollTop = $clog.scrollHeight; $cta.focus(); }, 0);
}
function closeChat() { $chat.hidden = true; chatId = null; document.body.classList.remove('chatting'); }
function renderChat(force) {
  const a = agents.get(chatId);
  if (!a) { if (!$chat.hidden) closeChat(); return; }
  const run = runFor(a.sessionId), perms = [...PERMS.values()].filter(p => p.sessionId === a.sessionId);
  const now = Date.now();
  // les messages envoyés disparaissent de la file dès qu'ils apparaissent dans la session
  for (let k = localSent.length - 1; k >= 0; k--) {
    const m = localSent[k];
    if (m.id !== a.id) continue;
    if ((a.chat || []).some(it => it.k === 'user' && it.text.trim() === m.text && (it.t || now) >= m.at - 5000) || now - m.at > 120000) localSent.splice(k, 1);
  }
  const mine = localSent.filter(m => m.id === a.id);
  const thinking = WORK.has(a.state) && a.state !== 'waiting';
  const sig = a.chatVer + '|' + a.state + '|' + a.bubble + '|' + perms.map(p => p.id).join() + '|' + mine.length + '|' + (run ? run.status : '') + '|' + [...chatOpen].join();
  // en-tête
  $chat.querySelector('.ch-who b').textContent = a.name;
  $chat.querySelector('.ch-who small').textContent = a.cwd || '';
  const st = $chat.querySelector('.ch-head .st'); st.textContent = ST_SHORT[a.state]; st.style.background = STATE_COLOR[a.state];
  $chat.querySelector('.ch-stop').style.display = run && run.status !== 'ended' ? '' : 'none';
  $chat.querySelectorAll('[data-c=code],[data-c=copy]').forEach(b => { b.style.display = a.cwd ? '' : 'none'; });
  const fame = FAME.n[a.title] || 0, us = USAGE && USAGE.sessions[a.id];
  $chat.querySelector('.ch-acts .sub').textContent = [fame ? '✅ ' + fame + ' tâche' + (fame > 1 ? 's' : '') + ' aujourd\'hui' : '',
    us ? '📊 ' + fmtTok(us.tokens) + ' tokens · ' + fmtUsd(us.cost) + ' (7 j)' : ''].filter(Boolean).join('  ·  ');
  $chat.querySelector('.ch-hint').textContent = !API_TOKEN ? 'Envoi de messages disponible quand le serveur tourne (start.bat).'
    : run ? '🟢 Piloté depuis le bureau' : 'Envoyer un message reprendra cette session depuis le bureau.';
  $cta.disabled = !API_TOKEN;
  if (!force && sig === chatSig) {                          // seul le spinner bouge
    const sp = $clog.querySelector('.ch-think i'); if (sp) sp.textContent = SPIN[Math.floor(performance.now() / 110) % SPIN.length];
    return;
  }
  chatSig = sig;
  const atBottom = $clog.scrollHeight - $clog.scrollTop - $clog.clientHeight < 80;
  let h = '';
  (a.chat || []).forEach(it => {
    if (it.k === 'user') h += '<div class="ch-user">' + md(it.text) + '</div>';
    else if (it.k === 'text') h += '<div class="ch-ai">' + md(it.text) + '</div>';
    else if (it.k === 'tool') {
      const open = chatOpen.has(it.id), sum = toolInfo(it.name, it.input)[1];
      h += '<div class="ch-tool ' + it.st + (open ? ' open' : '') + '" data-id="' + esc(it.id) + '"><div class="ch-trow"><i></i><b>' + esc(it.name.replace(/^mcp__.*__/, '')) + '</b>' +
        '<span>' + esc(sum.replace(/^(Édite|Écrit|Lit|Cherche|Liste|Web:|\$) ?/, '')) + '</span><em>' + (open ? '▾' : '▸') + '</em></div>' +
        (open ? '<div class="ch-tdet">' + toolDetail(it) + '</div>' : '') + '</div>';
    }
  });
  mine.forEach(m => { h += '<div class="ch-user pending">' + md(m.text) + '<small>envoi…</small></div>'; });
  if (!(a.chat || []).length && !mine.length) h += '<div class="empty" style="padding:20px 4px">Pas encore de messages dans cette session (ou ils sont plus anciens que ce que le bureau a chargé).</div>';
  if (thinking || mine.length) h += '<div class="ch-think"><i>' + SPIN[0] + '</i> ' + esc(a.state === 'thinking' || mine.length ? 'Réflexion…' : (a.bubble || 'Au travail…')) + '</div>';
  $clog.innerHTML = h;
  $clog.querySelectorAll('.ch-tool .ch-trow').forEach(row => row.onclick = () => {
    const id = row.parentElement.dataset.id; chatOpen.has(id) ? chatOpen.delete(id) : chatOpen.add(id); renderChat(true);
  });
  if (atBottom || force) $clog.scrollTop = $clog.scrollHeight;
  // demandes d'autorisation, directement dans la conversation
  $cperms.innerHTML = '';
  perms.forEach(p => {
    const el = document.createElement('div'); el.className = 'perm';
    el.innerHTML = '🔐 <b></b> demande ton autorisation<code></code><div class="row" style="flex-wrap:wrap"><button>✅ Autoriser</button><button data-always title="Ne plus me demander pour ça pendant cette session"></button><button class="no">❌ Refuser</button></div>';
    el.querySelector('b').textContent = p.tool; el.querySelector('code').textContent = permDetail(p);
    el.querySelector('[data-always]').textContent = '✅ Toujours « ' + alwaysLabel(p) + ' »';
    const ok = el.querySelector('.row button'), no = el.querySelector('.row .no');
    ok.onclick = () => api('/api/perm/' + p.id, { allow: true }).catch(e => alert(e.message));
    el.querySelector('[data-always]').onclick = () => api('/api/perm/' + p.id, { allow: true, always: true }).then(() => pushNews('✅', 'Toujours autorisé pour ' + a.name + ' : ' + alwaysLabel(p))).catch(e => alert(e.message));
    no.onclick = () => api('/api/perm/' + p.id, { allow: false }).catch(e => alert(e.message));
    $cperms.appendChild(el);
  });
}
// niveau d'autorisation de l'agent piloté (modifiable en cours de route) + ce qui est déjà « toujours autorisé »
const $cmode = document.createElement('div'); $cmode.className = 'ch-mode';
$chat.querySelector('.ch-foot').before($cmode);
const MODES = [['default', '🔐 Me demander à chaque fois'], ['acceptEdits', '📝 Fichiers sans demander (je valide les commandes)'], ['trust', '🚀 Tout sans demander (confiance)']];
let modeKey = '';
function renderMode(a) {
  const run = a && runFor(a.sessionId);
  const key = run ? run.id + run.mode + (run.rules || []).join('|') : (a ? 'ext' : '');
  if (key === modeKey) return; modeKey = key;
  if (!run) {
    $cmode.innerHTML = a && API_TOKEN ? '<div class="ch-modeinfo">Session ouverte dans ton terminal ou l\'app : change ses autorisations là-bas avec <b>Maj+Tab</b>.</div>' : '';
    return;
  }
  $cmode.innerHTML = '<label>Autorisations <select>' + MODES.map(([v, l]) => '<option value="' + v + '"' + (run.mode === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    (run.rules && run.rules.length ? '<div class="ch-modeinfo">Toujours autorisé : ' + run.rules.map(r => '<code>' + esc(r) + '</code>').join(' ') + '</div>' : '');
  $cmode.querySelector('select').onchange = e => {
    const v = e.target.value;
    if (v === 'trust' && !confirm('Mode confiance : l\'agent pourra modifier des fichiers ET lancer n\'importe quelle commande sans te demander.\n\nActiver pour cette session ?')) { e.target.value = run.mode; return; }
    api('/api/runs/' + run.id + '/mode', { mode: v }).then(() => pushNews('🔐', a.name + ' : ' + MODES.find(m => m[0] === v)[1])).catch(err => alert(err.message));
  };
}
setInterval(() => { if (!$chat.hidden) renderMode(agents.get(chatId)); }, 400);
async function chatSend() {
  const a = agents.get(chatId), text = $cta.value.trim();
  if (!a || !text || !API_TOKEN) return;
  if (!runFor(a.sessionId) && WORK.has(a.state) && !confirm('Cette session a l\'air ouverte ailleurs (terminal ou app).\nLa reprendre depuis le bureau en même temps peut créer des conflits.\n\nContinuer quand même ?')) return;
  $cta.value = ''; $cta.style.height = '';
  const m = { id: a.id, text, at: Date.now() }; localSent.push(m); renderChat(true);
  try { await sendTo(a, text); pushNews('💬', 'Tu as écrit à ' + a.name + ' (depuis le bureau)'); }
  catch (err) { localSent.splice(localSent.indexOf(m), 1); if (!$cta.value) $cta.value = text; renderChat(true); alert(err.message); }
}
$chat.querySelector('.ch-send').onclick = chatSend;
$chat.querySelector('.ch-close').onclick = () => select(null);
$chat.querySelector('.ch-stop').onclick = () => { const a = agents.get(chatId), r = a && runFor(a.sessionId); if (r) api('/api/runs/' + r.id + '/stop'); };
$cta.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); }
  if (e.key === 'Escape') $cta.blur();
});
$cta.addEventListener('input', () => { $cta.style.height = ''; $cta.style.height = Math.min(160, $cta.scrollHeight) + 'px'; });
setInterval(() => { if (!$chat.hidden) renderChat(); }, 250);
// double-clic sur un perso (au bureau ou dans la liste) : ouvre la discussion
cv.addEventListener('dblclick', e => { const a = agentAt(e); if (a && !a.isOwner) openChat(a); });
$list.addEventListener('dblclick', () => { const a = agents.get(selectedId); if (a) openChat(a); });

function renderSettings() {
  const seg = (key, opts) => '<div class="seg">' + opts.map(([v, l]) => '<button data-k="' + key + '" data-v="' + v + '" class="' + (SETTINGS[key] === v ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  const chk = (key, l) => '<label><input type="checkbox" data-c="' + key + '"' + (SETTINGS[key] ? ' checked' : '') + '> ' + l + '</label>';
  $settings.innerHTML = '<h3>Texte au-dessus des persos</h3>' + seg('labels', [['full', 'Complet'], ['compact', 'Discret'], ['none', 'Aucun']]) +
    chk('onlyWaiting', 'Montrer seulement ceux qui m\'attendent') + chk('sound', 'Sons') + chk('notify', 'Notification quand un agent m\'attend') +
    '<h3 style="margin-top:12px">Ton prénom</h3><label><input type="text" id="ownerName" value="' + esc(OWNER) + '"> <button class="ghost" id="saveName" style="padding:4px 9px;font-size:12px">OK</button></label>' +
    '<div class="empty" style="font-size:11px">Appliqué au rechargement de la page.</div>' +
    (Object.keys(HIDDEN).length ? '<h3 style="margin-top:12px">Agents retirés</h3>' + Object.entries(HIDDEN).map(([k, h]) =>
      '<label style="justify-content:space-between"><span>' + esc(h.name || k.split('/').pop()) + '</span><button class="ghost" data-restore="' + esc(k) + '" style="padding:2px 8px;font-size:11px">Faire revenir</button></label>').join('') : '');
  $settings.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { SETTINGS[b.dataset.k] = b.dataset.v; saveSettings(); renderSettings(); });
  $settings.querySelectorAll('[data-c]').forEach(c => c.onchange = () => {
    SETTINGS[c.dataset.c] = c.checked; saveSettings();
    if (c.dataset.c === 'sound' && c.checked) { try { ac().resume(); tone(660, 0.15); } catch { } }
    if (c.dataset.c === 'notify' && c.checked && 'Notification' in window) Notification.requestPermission();
    renderList(true);
  });
  if (typeof EVENTS !== 'undefined') {                    // déclencher un événement pour le voir
    $settings.insertAdjacentHTML('beforeend', '<h3 style="margin-top:12px">Déclencher un événement</h3><div class="seg" style="flex-wrap:wrap">' +
      EVENTS.map((e, i) => '<button data-ev="' + i + '">' + esc(e[0]) + '</button>').join('') + '</div>');
    $settings.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { triggerEvent(+b.dataset.ev); $settings.hidden = true; });
  }
  $settings.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => { delete HIDDEN[b.dataset.restore]; saveHidden(); renderSettings(); });
  $settings.querySelector('#saveName').onclick = () => { SETTINGS.owner = $settings.querySelector('#ownerName').value.trim() || 'Eric'; saveSettings(); location.reload(); };
}

/* ====================================================================
   Télé murale de la cafet : n'importe quelle vidéo ou live YouTube
   (lecteur YouTube officiel incrusté pile sur l'écran ; clic sur la télé = grand lecteur)
   ==================================================================== */
const LOFI_URL = 'https://www.youtube.com/watch?v=8b3fqIBrNW0';   // mix lofi hip hop (Lofi Girl) : une vidéo, donc un lien stable
const $stage = document.querySelector('.stage');
const $tvbox = document.createElement('div');
$tvbox.style.cssText = 'position:absolute;display:none;overflow:hidden;z-index:1;pointer-events:none;background:#000';
const $tvclose = document.createElement('button');
$tvclose.textContent = '✕ Réduire'; $tvclose.className = 'ghost';
$tvclose.style.cssText = 'position:absolute;display:none;z-index:4;padding:3px 9px;font-size:12px;background:rgba(31,30,29,.9)';
$stage.append($tvbox, $tvclose);
const $tvpop = document.createElement('div'); $tvpop.className = 'pop'; $tvpop.hidden = true; $tvpop.style.cssText = 'left:auto;right:18px;min-width:330px';
$stage.appendChild($tvpop);
let tvBig = false;

function ytEmbed(url, muted) {
  url = String(url || '').trim();
  const id = (url.match(/(?:[?&]v=|youtu\.be\/|\/live\/|\/shorts\/|\/embed\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(url) ? url : null);
  const list = (url.match(/[?&]list=([\w-]+)/) || [])[1];
  const common = 'autoplay=1&playsinline=1&rel=0&modestbranding=1' + (muted ? '&mute=1' : '');
  const chan = (url.match(/\/channel\/(UC[\w-]{22})/) || [])[1];      // lien de chaîne : son live en cours
  if (chan && !id) return 'https://www.youtube.com/embed/live_stream?channel=' + chan + '&' + common;
  if (id) return 'https://www.youtube.com/embed/' + id + '?' + common + '&loop=1&playlist=' + id + (list ? '&list=' + list : '');
  if (list) return 'https://www.youtube.com/embed/videoseries?list=' + list + '&' + common;
  return null;
}
function tvOn(url) {
  const src = ytEmbed(url, SETTINGS.tvMuted);
  if (!src) { alert('Lien YouTube non reconnu.\nColle un lien de vidéo, de live ou de playlist YouTube.'); return false; }
  $tvbox.innerHTML = '<iframe src="' + esc(src) + '" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="Télé de la cafet"></iframe>';
  $tvbox.style.display = 'block'; TV.on = true;
  SETTINGS.tvUrl = url; saveSettings();
  pushNews('📺', 'La télé de la cafet est allumée');
  return true;
}
function tvOff() { $tvbox.innerHTML = ''; $tvbox.style.display = 'none'; $tvclose.style.display = 'none'; TV.on = false; tvBig = false; }
function tvExpand(big) {
  tvBig = big;
  $tvbox.style.pointerEvents = big ? 'auto' : 'none';
  $tvbox.style.borderRadius = big ? '12px' : '0';
  $tvbox.style.boxShadow = big ? '0 10px 40px rgba(0,0,0,.6)' : 'none';
  $tvclose.style.display = big ? 'block' : 'none';
}
// à chaque frame, l'écran incrusté suit la télé (zoom, déplacement, taille de la fenêtre)
HOOKS.overlay.push(() => {
  if (!TV.on) return;
  if (tvBig) {
    const w = Math.min(640, $stage.clientWidth - 60), h = Math.round(w * 9 / 16);
    Object.assign($tvbox.style, { left: '30px', top: Math.max(60, ($stage.clientHeight - h) / 2 - 20) + 'px', width: w + 'px', height: h + 'px' });
    Object.assign($tvclose.style, { left: (30 + w - 92) + 'px', top: (Math.max(60, ($stage.clientHeight - h) / 2 - 20) - 32) + 'px' });
    return;
  }
  const cr = cv.getBoundingClientRect(), sr = $stage.getBoundingClientRect();
  const [x, y] = toCss(TVRECT.x, TVRECT.y);
  Object.assign($tvbox.style, { left: (cr.left - sr.left + x) + 'px', top: (cr.top - sr.top + y) + 'px', width: TVRECT.w * S + 'px', height: TVRECT.h * S + 'px' });
});
$tvclose.onclick = () => tvExpand(false);
// clic sur la télé dans le bureau : grand lecteur si elle est allumée, sinon le panneau pour choisir une vidéo
cv.addEventListener('click', e => {
  const r = cv.getBoundingClientRect(), [mx, my] = toWorld(e.clientX - r.left, e.clientY - r.top);
  if (mx < TVRECT.x - 3 || mx > TVRECT.x + TVRECT.w + 3 || my < TVRECT.y - 3 || my > TVRECT.y + TVRECT.h + 5) return;
  if (TV.on) tvExpand(true); else openTvPop();
});
function openTvPop() {
  [$legend, $settings, $usage].forEach(p => p.hidden = true);
  $tvpop.innerHTML = '<h3>📺 Télé de la cafet</h3>' +
    '<label style="font-size:12px;color:var(--mute)">Lien YouTube (vidéo, live ou playlist)</label>' +
    '<input type="text" id="tvUrl" style="width:100%;margin:4px 0 8px;background:#1f1e1d;border:1px solid var(--line);color:var(--cream);border-radius:6px;padding:6px 8px;font:inherit;font-size:13px" placeholder="https://www.youtube.com/watch?v=…">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button id="tvGo">▶ Allumer</button><button class="ghost" id="tvLofi">🎧 Mix Lofi Girl</button>' +
    (TV.on ? '<button class="ghost" id="tvBig">⤢ Agrandir</button><button class="ghost" id="tvStop">⏹ Éteindre</button>' : '') + '</div>' +
    '<label style="margin-top:10px"><input type="checkbox" id="tvMute"' + (SETTINGS.tvMuted ? ' checked' : '') + '> Sans le son (image seule)</label>' +
    '<div class="empty" style="font-size:11px;margin-top:6px;max-width:310px">Clique sur la télé dans le bureau pour l\'agrandir et régler le volume. Quand elle est allumée, les agents en pause viennent la regarder.</div>';
  const inp = $tvpop.querySelector('#tvUrl'); inp.value = SETTINGS.tvUrl || '';
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $tvpop.querySelector('#tvGo').click(); };
  $tvpop.querySelector('#tvGo').onclick = () => { if (inp.value.trim() && tvOn(inp.value)) $tvpop.hidden = true; };
  $tvpop.querySelector('#tvLofi').onclick = () => { inp.value = LOFI_URL; if (tvOn(LOFI_URL)) $tvpop.hidden = true; };
  const big = $tvpop.querySelector('#tvBig'); if (big) big.onclick = () => { tvExpand(true); $tvpop.hidden = true; };
  const stop = $tvpop.querySelector('#tvStop'); if (stop) stop.onclick = () => { tvOff(); $tvpop.hidden = true; };
  $tvpop.querySelector('#tvMute').onchange = e => { SETTINGS.tvMuted = e.target.checked; saveSettings(); if (TV.on) tvOn(SETTINGS.tvUrl); };
  $tvpop.hidden = false;
}
tool('📺 Télé', 'Télé de la cafet : mets une vidéo ou un live YouTube', () => { if ($tvpop.hidden) openTvPop(); else $tvpop.hidden = true; });
document.addEventListener('click', e => { if (!e.target.closest('.pop') && !e.target.closest('#tools') && e.target !== cv) $tvpop.hidden = true; });
