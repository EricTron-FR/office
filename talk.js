'use strict';
/* ====================================================================
   Eric Office : les bulles manga
   Quand un agent ou un sous-agent écrit à un autre (outil SendMessage de Claude Code,
   messagerie d'équipe du bureau), quand un stagiaire rend son rapport ou qu'un Pokémon crie :
   grosse bulle blanche à contour épais, nom de celui qui parle, texte qui s'écrit lettre par lettre,
   bulle « cri » hérissée pour les exclamations courtes.
   ==================================================================== */
const SAYS = [];                                  // { who, text, to, t0, dur, mon, shout }
const sayTime = text => Math.min(10000, 2600 + String(text).length * 55);
function say(who, text, opts) {
  if (!who || !text) return;
  opts = opts || {};
  text = String(text).replace(/\s+/g, ' ').trim();
  if (text.length > 160) text = text.slice(0, 157) + '…';
  const now = performance.now();
  // si la personne parle déjà, la réplique suivante attend la fin de la précédente
  const prev = SAYS.filter(s => s.who === who).reduce((m, s) => Math.max(m, s.t0 + s.dur), 0);
  const to = opts.to && (opts.to.name || opts.to);
  SAYS.push({ who, text, to: typeof to === 'string' ? to : '', t0: Math.max(now, prev), dur: opts.ms || sayTime(text), mon: !!opts.mon, shout: /!\s*$/.test(text) && text.length < 28 });
  if (SAYS.length > 40) SAYS.splice(0, SAYS.length - 40);
}
// petite conversation à plusieurs répliques : lines = [[qui, texte], …]
function dialogue(lines, gap) {
  let t = 0;
  lines.forEach(([who, text, to]) => { setTimeout(() => say(who, text, { to }), t); t += sayTime(text) + (gap || 400); });
  return t;
}

function wrapLines(c, text, maxW, maxLines) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (c.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && lines.join(' ').length < text.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
  return lines;
}
// forme hérissée pour les cris
function burstPath(c, cx, cy, rx, ry, n) {
  c.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = i / (n * 2) * Math.PI * 2, k = i % 2 ? 1 : 1.22;
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}
HOOKS.overlay.push((c, t) => {
  const now = performance.now(), placed = [];
  for (let i = SAYS.length - 1; i >= 0; i--) if (now > SAYS[i].t0 + SAYS[i].dur) SAYS.splice(i, 1);
  SAYS.filter(s => now >= s.t0).forEach(s => {
    const a = s.who; if (!a || !a._anchor) return;
    const [hx, hy] = toCss(a._anchor.x, a._anchor.y);
    const age = now - s.t0, life = s.dur, pop = Math.min(1, age / 140), fade = Math.min(1, (life - age) / 300);
    const shown = s.text.slice(0, Math.max(1, Math.floor(age / 28)));          // effet machine à écrire
    c.font = (s.shout ? '700 15px ' : '700 12.5px ') + FONT;
    const lines = wrapLines(c, s.text, s.shout ? 150 : 200, 4), lh = s.shout ? 18 : 15;
    const tw = Math.max(...lines.map(l => c.measureText(l).width));
    const w = Math.ceil(tw + (s.shout ? 34 : 24)), h = lines.length * lh + (s.shout ? 22 : 14);
    // placement : au-dessus et un peu à droite de la tête, en évitant les autres bulles
    let bx = hx + 6, by = hy - h - 22;
    for (let k = 0; k < 6; k++) {
      const hit = placed.find(r => bx < r.x + r.w + 6 && bx + w + 6 > r.x && by < r.y + r.h + 6 && by + h + 6 > r.y);
      if (!hit) break; by = hit.y - h - 8;
    }
    bx = Math.max(4, Math.min(CW - w - 4, bx)); by = Math.max(4, by);
    placed.push({ x: bx, y: by, w, h });
    c.save(); c.globalAlpha = fade;
    const sc = 0.6 + 0.4 * pop, cx = bx + w / 2, cy = by + h / 2;
    c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    c.lineJoin = 'round';
    // la queue de la bulle, vers la bouche
    const tx = Math.max(bx + 14, Math.min(bx + w - 14, hx + 10));
    c.fillStyle = '#ffffff'; c.strokeStyle = '#111018'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(tx - 8, by + h - 4); c.quadraticCurveTo(tx - 2, by + h + 10, hx + 2, hy - 4); c.quadraticCurveTo(tx + 6, by + h + 6, tx + 8, by + h - 4); c.closePath();
    c.fill(); c.stroke();
    if (s.shout) {
      burstPath(c, cx, cy, w / 2, h / 2, 9);
      c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 3; c.stroke();
    } else {
      c.beginPath(); c.ellipse(cx, cy, w / 2 + 6, h / 2 + 5, 0, 0, Math.PI * 2);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.save(); c.translate(2, 3); c.fill(); c.restore();
      c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 3; c.stroke();
    }
    c.fillStyle = '#ffffff'; c.fillRect(tx - 6, by + h - 7, 12, 6);              // raccord queue / bulle
    // le texte (lettre par lettre)
    c.fillStyle = '#111018'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let left = shown.length;
    lines.forEach((l, i) => {
      const part = l.slice(0, Math.max(0, left)); left -= l.length + 1;
      c.fillText(part, cx, by + (s.shout ? 11 : 7) + lh * i + lh / 2 + 1);
    });
    // l'étiquette du nom, façon manga
    const tag = (s.mon ? '★ ' : '') + (a.name || '') + (s.to ? ' → ' + s.to : '');
    c.font = '700 10px ' + FONT;
    const tgw = Math.ceil(c.measureText(tag).width) + 12, tgx = bx - 4, tgy = by - 9;
    c.fillStyle = s.mon ? '#f2b23a' : a.isSub ? '#4f86d6' : '#111018';
    c.beginPath(); c.roundRect(tgx, tgy, tgw, 15, 3); c.fill();
    c.fillStyle = s.mon ? '#111018' : '#ffffff'; c.textAlign = 'left'; c.fillText(tag, tgx + 6, tgy + 8);
    c.restore();
  });
  c.textBaseline = 'middle'; c.textAlign = 'left';
});

/* ---------- qui parle à qui : messages détectés dans les sessions Claude Code ---------- */
// to : nom d'équipe, nom ou id du sous-agent, « main » (le parent), ou nom de session
function resolveTo(from, to) {
  const raw = String(to || '').replace(/\s*\[[^\]]*\]\s*$/, '').trim(), k = raw.toLowerCase();
  if (!k) return null;
  if ((k === 'main' || k === 'parent') && from.parentId) return agents.get(from.parentId) || null;
  return [...agents.values()].find(a => a !== from && (
    (a.agentId && (a.agentId.toLowerCase() === k || a.agentId.toLowerCase() === 'a' + k)) ||
    (a.subName && a.subName.toLowerCase() === k) || a.name.toLowerCase() === k || (a.baseTitle || '').replace(/^↳ /, '').toLowerCase() === k)) || null;
}
// un agent (ou un stagiaire) envoie un message : il va voir le destinataire et lui parle en bulle
function agentSays(from, to, text) {
  const dest = resolveTo(from, to), short = text.length > 70 ? text.slice(0, 70) + '…' : text, toName = dest ? dest.name : String(to || '').replace(/\s*\[[^\]]*\]\s*$/, '');
  if (typeof pushNews === 'function') pushNews('💬', from.name + ' → ' + toName + ' : ' + short);
  if (typeof addStat === 'function' && dexLive()) addStat('mails');
  addLog(from, '✉️ À ' + toName + ' : ' + short);
  if (dest) addLog(dest, '📬 De ' + from.name + ' : ' + short);
  if (dest && dest !== from) chatVisit(from, dest, text);
  else say(from, text, { to: toName });
}

/* ---------- démo : les stagiaires discutent entre eux ---------- */
const INTERN_TALKS = [
  ['Tu as trouvé où est défini useAuth ?', 'Dans src/hooks/auth.ts, ligne 42 !', 'Top, merci ! Je branche les tests dessus.'],
  ['J\'ai fini d\'explorer le code, je t\'envoie la liste des fichiers.', 'Parfait, je m\'occupe des tests !'],
  ['Attention, le test de paiement plante encore !', 'Je regarde… c\'est le mock qui est mal configuré.', 'Bien vu, merci !'],
  ['Tu bosses sur quoi ?', 'La revue de sécurité. Et toi ?', 'La doc de l\'API. On fait la pause ensemble après ?'],
  ['Il y a une faille XSS dans le formulaire !', 'Oups. Je préviens le chef.'],
  ['Tu peux relire ma PR ?', 'Vas-y, envoie le lien !', 'C\'est fait ✅']
];
let internTick = performance.now() + 15000;
HOOKS.update.push((dt, now) => {
  if (now < internTick || (typeof es !== 'undefined' && es)) return;      // seulement en démo (en vrai, ce sont les vrais messages)
  internTick = now + 18000 + Math.random() * 14000;
  const subs = [...agents.values()].filter(a => a.isSub && !a.leaving && !a.override);
  if (subs.length < 2) return;
  const a = subs[0], b = subs[1], lines = pick(INTERN_TALKS);
  chatVisit(a, b, lines[0], lines.slice(1));
  if (typeof pushNews === 'function') pushNews('💬', a.name.replace(/^↳ /, '') + ' → ' + b.name.replace(/^↳ /, '') + ' : ' + lines[0]);
});
