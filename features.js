'use strict';
/* ====================================================================
   Eric Office : ambiance et fun
   nuit éclairée · laser pour les chats · chat sur le clavier · employé du jour
   papotes + baby-foot · réactions d'Eric · pizza · robot aspirateur · saisons
   ==================================================================== */
const news = (icon, text, kind) => { if (typeof pushNews === 'function') pushNews(icon, text, kind); };
const NOW = () => performance.now();

/* ---------- 1. une vraie nuit : obscurité + sources de lumière ---------- */
const lightCv = document.createElement('canvas'); lightCv.width = W; lightCv.height = H;
const lctx = lightCv.getContext('2d');
function roomBusy(x0, x1) { return everyone().some(a => a.x >= x0 && a.x < x1 && (a.mode === 'sit' || WORK.has(a.state) || !a.path.length)); }
function collectLights(t) {
  const L = [];
  const add = (x, y, r, a, c) => L.push({ x, y, r, a, c });
  // éclairage tamisé partout : plafonniers en veilleuse, plus forts dans les pièces occupées
  const office = roomBusy(0, 22), lounge = roomBusy(23, 32);
  [5, 11, 17].forEach(x => { add(px(x), py(6), 64, office ? 0.6 : 0.42, '#ffe2b0'); add(px(x), py(11), 64, office ? 0.55 : 0.4, '#ffe2b0'); });
  add(px(27.5), py(6), 66, lounge ? 0.6 : 0.45, '#ffd9a8'); add(px(27.5), py(11), 66, lounge ? 0.6 : 0.45, '#ffd9a8');
  add(px(-4.5), py(6), 56, 0.5, '#ffe2b0'); add(px(-4.5), py(11), 56, 0.45, '#ffe2b0');
  // appliques murales le long du mur du fond
  [-6, -2, 2, 7.5, 14.5, 20, 25, 29.5].forEach(x => add(px(x), py(3) - 6, 30, 0.55, '#ffcf8a'));
  // écrans des agents au travail
  DESKS.forEach(d => {
    const a = d.agent;
    if (a && a.mode === 'sit' && a.seat && a.seat.type === 'desk' && WORK.has(a.state))
      add(px(d.dx + 1), py(d.dy), 24, 0.75, STATE_COLOR[a.state]);
  });
  if (owner && owner.seat && owner.seat.ceo) add(px(-4.5), py(7), 24, 0.75, CLAY);
  add(px(-2) + 8, py(9) - 16, 44, 0.85, '#ffd88a');            // lampadaire du CEO
  add(px(-6) + 4, py(7) - 4, 22, 0.7, '#ffe9b0');               // lampe du bureau
  add(px(29) + 8, OYp + 16, 26, 0.8, CLAY);                     // néon étincelle
  add(px(31), py(3), 26, 0.6, '#fff1d6');                       // distributeur
  add(px(3) + 8, py(17) - 4, 18, 0.7, VIOLET); add(px(4) + 8, py(17) - 4, 18, 0.7, BLUE);   // bornes d'arcade
  if (someone(a => a.act === 'tv' && a.mode === 'sit')) add(px(27), py(13), 40, 0.8, [BLUE, VIOLET, CLAY, GREEN][Math.floor(t * 0.8) % 4]);
  add(px(-7) + 2, py(11) - 3, 18, 0.6, '#5aa3c9');              // aquarium
  if (TV.on) add(TVRECT.x + TVRECT.w / 2, TVRECT.y + 22, 40, 0.8, [BLUE, VIOLET, CLAY][Math.floor(t * 0.5) % 3]);   // télé murale
  if (SEASON.halloween) PUMPKINS.forEach(([x, y]) => add(px(x) + 8, py(y) + 8, 22, 0.8, '#ff9a3a'));
  if (SEASON.christmas) add(px(29) + 8, py(8), 30, 0.8, '#ffe08a');
  if (typeof roomLights === 'function') roomLights(t, add);      // salles du bas + terrasse (rooms.js)
  return L;
}
HOOKS.light.push((t, sky) => {
  const dark = sky.kind === 'night' ? 0.38 : sky.kind === 'day' ? (sky.grey ? 0.07 : 0) : 0.18;
  if (!dark) return;
  const L = collectLights(t);
  lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = sky.kind === 'night' ? 'rgba(12,16,42,' + dark + ')' : sky.kind === 'day' ? 'rgba(40,50,70,' + dark + ')' : 'rgba(90,45,40,' + dark + ')';
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  L.forEach(l => {
    const gr = lctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, 'rgba(0,0,0,' + l.a + ')'); gr.addColorStop(0.6, 'rgba(0,0,0,' + (l.a * 0.5) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = gr; lctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  });
  g.drawImage(lightCv, 0, 0);
  if (sky.kind === 'day') return;
  g.globalCompositeOperation = 'lighter';
  L.forEach(l => {
    if (!l.c) return;
    const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, l.c + '26'); gr.addColorStop(1, l.c + '00');
    g.fillStyle = gr; g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  });
  g.globalCompositeOperation = 'source-over';
});

/* ---------- 2. pointeur laser : les chats courent après ---------- */
let laserRetarget = 0;
HOOKS.update.push((dt, now, t) => {
  if (!LASER.on || !MOUSE) {
    cats.forEach(c => { if (c.chasing) { c.chasing = false; c.speed = c.baseSpeed; c.nextMove = now + 1500; c.path = []; } });
    return;
  }
  const [mx, my] = MOUSE, tx = Math.floor((mx - OXp) / T) + XMIN, ty = Math.floor((my - OYp) / T);
  cats.forEach(c => {
    if (c.ride) return;
    if (!c.chasing) { c.chasing = true; c.baseSpeed = c.baseSpeed || c.speed; c.speed = c.baseSpeed * 1.9; c.spot = null; c.z = 0; c.mode = 'walk'; }
    c.nextMove = now + 99999; c.petUntil = 0;
    const d = Math.hypot(c.x - (tx + 0.5), c.y - (ty + 0.5));
    if (d < 0.7) { c.path = []; c.mode = 'sit'; c.pounce = now; }
    else if (now > (c._lt || 0) && ty >= 3 && ty < ROWS && tx >= XMIN && tx < XMAX) {
      c._lt = now + 350;
      const target = BLOCKED.has(tx + ',' + ty) ? [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].find(([a, b]) => !BLOCKED.has(a + ',' + b) && b >= 3) : [tx, ty];
      if (target) { c.path = bfs(cellOf(c), target); c.mode = 'walk'; }
    }
    c.z = c.pounce && now - c.pounce < 350 ? Math.round(Math.sin((now - c.pounce) / 350 * Math.PI) * 5) : 0;
  });
});
HOOKS.post.push(t => {
  if (!LASER.on || !MOUSE) return;
  const [x, y] = MOUSE.map(Math.round);
  g.fillStyle = 'rgba(255,40,40,.25)'; g.fillRect(x - 3, y - 3, 7, 7);
  R(x - 1, y - 1, 3, 3, '#ff3b3b'); R(x, y, 1, 1, '#ffd0d0');
});

/* ---------- 3. un chat s'installe sur le clavier d'un agent ---------- */
let nextKeyboardCat = NOW() + 60000 + Math.random() * 60000;
HOOKS.update.push((dt, now) => {
  if (LASER.on || now < nextKeyboardCat) return;
  nextKeyboardCat = now + 120000 + Math.random() * 120000;
  const desks = DESKS.filter(d => d.agent && d.agent.mode === 'sit' && d.agent.state === 'working');
  const c = cats.find(c => !c.path.length && !c.ride && c.mode !== 'sleep') || cats[0];
  if (!desks.length || !c) return;
  const d = pick(desks);
  catGo(c, [d.dx + 1, d.dy], { cell: [d.dx + 1, d.dy], x: d.dx + 1.0, y: d.dy + 0.5, z: 10, k: py(d.dy + 1) + 3, mode: 'sit', stay: 7000, label: 'Sur le clavier de ' + d.agent.name, keyboard: d });
  news('🐈', c.name + ' s\'installe sur le clavier de ' + d.agent.name);
});
HOOKS.post.push(t => {   // l'agent râle gentiment
  cats.forEach(c => {
    if (!c.spot || !c.spot.keyboard || c.path.length) return;
    const a = c.spot.keyboard.agent;
    if (a && a._anchor) icon(Math.floor(t * 2) % 2 ? 'q' : 'bang', a._anchor.x + 6, a._anchor.y - 6, AMBER);
  });
});

/* ---------- 4. employé du jour (tâches terminées aujourd'hui) ---------- */
const dayKey = () => new Date().toISOString().slice(0, 10);
let FAME = (() => { try { const f = JSON.parse(localStorage.getItem('eo-fame') || '{}'); return f.day === dayKey() ? f : { day: dayKey(), n: {} }; } catch { return { day: dayKey(), n: {} }; } })();
const seenDone = new Map();
HOOKS.update.push(() => {
  if (FAME.day !== dayKey()) FAME = { day: dayKey(), n: {} };
  agents.forEach(a => {
    const d = a.m && a.m.doneAt || 0, prev = seenDone.get(a.id);
    if (prev === undefined) { seenDone.set(a.id, d); return; }
    if (d > prev) {
      seenDone.set(a.id, d);
      FAME.n[a.title] = (FAME.n[a.title] || 0) + 1;
      try { localStorage.setItem('eo-fame', JSON.stringify(FAME)); } catch { }
      onAgentDone(a);
    }
  });
});
function employeeOfDay() {
  let best = null;
  Object.entries(FAME.n).forEach(([name, n]) => { if (!best || n > best[1]) best = [name, n]; });
  return best && { name: best[0], n: best[1], agent: [...agents.values()].find(a => a.title === best[0]) };
}
HOOKS.floor.push(() => {   // cadre doré sous la plaque du CEO
  const x0 = px(-5) + 8, y0 = OYp + 19, e = employeeOfDay();
  R(x0 - 1, y0 - 1, 16, 15, '#c9952f'); R(x0, y0, 14, 13, '#2a2622');
  if (e && e.agent) {
    const rows = buildRows(e.agent, 'down', null, false).slice(0, 11);
    const prev = g; drawSprite(rows, x0 + 7, y0 + 12, e.agent.pal, false);
  } else spark(x0 + 7, y0 + 6, 3, '#6b6760');
  R(x0 + 5, y0 + 13, 4, 2, AMBER); R(x0 + 6, y0 + 12, 2, 1, AMBER);
});

/* ---------- 5. vie sociale : papotes + baby-foot ---------- */
SPOTS.push(
  { cell: [24, 5], face: 'right', label: 'Papote près du café', w: 5, act: 'chat' },
  { cell: [26, 5], face: 'left', label: 'Papote près du café', w: 5, act: 'chat' },
  { cell: [-2, 23], face: 'right', label: 'Baby-foot', w: 6, act: 'babyfoot' },
  { cell: [1, 23], face: 'left', label: 'Baby-foot', w: 6, act: 'babyfoot' }
);
block(-1, 23); block(0, 23);
const EMOJIS = ['☕', '😂', '💡', '🐱', '🎮', '🍕', '👀', '🔥', '🤔', '🎉', '🐛', '🚀'];
const parked = a => !a.path.length && !a.heading && !a.seat;
furniture.push({   // table de baby-foot
  k: py(24) - 2, draw(t) {
    const x0 = px(-1) + 2, w = 28, y0 = py(23) + 1;
    const p1 = everyone().find(a => parked(a) && a.act === 'babyfoot' && cellOf(a)[0] === -2);
    const p2 = everyone().find(a => parked(a) && a.act === 'babyfoot' && cellOf(a)[0] === 1);
    R(x0, y0 + 13, w + 1, 2, SHADOW);
    panel(x0, y0, w, 11, '#5e3a28'); R(x0 + 2, y0 + 2, w - 4, 7, '#5d9a5f');
    R(x0 + 13, y0 + 2, 1, 7, '#e9f2e0'); R(x0 + 2, y0 + 4, 1, 3, '#e9f2e0'); R(x0 + w - 3, y0 + 4, 1, 3, '#e9f2e0');
    R(x0 + 1, y0 + 4, 1, 3, '#1b1a19'); R(x0 + w - 2, y0 + 4, 1, 3, '#1b1a19');            // buts
    [5, 10, 17, 22].forEach((rx, i) => {                                                    // barres + joueurs
      R(x0 + rx, y0 - 2, 1, 15, '#b9c0c4');
      const off = (p1 && p2) ? Math.round(Math.sin(t * 5 + i) * 1.5) : 0;
      R(x0 + rx - 1, y0 + 3 + off, 3, 2, i % 2 ? BLUE : CLAY); R(x0 + rx - 1, y0 + 6 + off, 3, 2, i % 2 ? BLUE : CLAY);
    });
    panel(x0 + 2, y0 + 11, 3, 4, '#4a2e22'); panel(x0 + w - 5, y0 + 11, 3, 4, '#4a2e22');
    if (p1 && p2) {                                                                          // la balle
      const bx = x0 + 3 + Math.round((Math.sin(t * 2.3) * 0.5 + 0.5) * (w - 7)), by = y0 + 3 + Math.round((Math.sin(t * 3.7) * 0.5 + 0.5) * 4);
      R(bx, by, 2, 2, '#ffffff');
    }
  }
});
HOOKS.update.push((dt, now) => {   // deux agents proches en pause se tournent l'un vers l'autre et papotent
  const idle = everyone().filter(a => parked(a) && !WORK.has(a.state) && a.state !== 'asleep');
  idle.forEach(a => { a.chatWith = null; });
  for (let i = 0; i < idle.length; i++) for (let j = i + 1; j < idle.length; j++) {
    const a = idle[i], b = idle[j];
    if (a.chatWith || b.chatWith || a.act === 'babyfoot' || b.act === 'babyfoot') continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) <= 2.2) {
      a.chatWith = b; b.chatWith = a;
      if (Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)) { a.face = a.x < b.x ? 'right' : 'left'; b.face = a.x < b.x ? 'left' : 'right'; }
      else { a.face = a.y < b.y ? 'down' : 'up'; b.face = a.y < b.y ? 'up' : 'down'; }
      a.nextMove = Math.max(a.nextMove, now + 3000); b.nextMove = Math.max(b.nextMove, now + 3000);
    }
  }
});
HOOKS.overlay.push((c, t) => {
  const done = new Set();
  everyone().forEach(a => {
    if (!a.chatWith || done.has(a.id) || !a._anchor) return;
    done.add(a.id); done.add(a.chatWith.id);
    const speaker = Math.floor(t / 1.6) % 2 ? a : a.chatWith;
    if (!speaker._anchor) return;
    const e = EMOJIS[(hash(a.id + a.chatWith.id) + Math.floor(t / 3.2)) % EMOJIS.length];
    const [x, y] = toCss(speaker._anchor.x, speaker._anchor.y);
    c.fillStyle = 'rgba(255,253,248,.95)'; c.beginPath(); c.roundRect(x - 12, y - 26, 24, 20, 8); c.fill();
    c.beginPath(); c.moveTo(x - 3, y - 7); c.lineTo(x, y - 2); c.lineTo(x + 3, y - 7); c.fill();
    c.font = '13px "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.fillText(e, x, y - 15); c.textAlign = 'left';
  });
});

/* ---------- 6. Eric réagit : bravo, café livré, stress ---------- */
let ericEmote = null;   // { icon, until }
function onAgentDone(a) {
  news('✅', a.name + ' a terminé sa tâche', 'done');
  if (owner) ericEmote = { icon: '👏', until: NOW() + 3500 };
  checkPizza();
  if (typeof onDoneEvent === 'function') onDoneEvent(a);          // événements (anniversaire…) : events.js
}
let nextCoffeeRun = NOW() + 90000 + Math.random() * 90000;
HOOKS.update.push((dt, now) => {
  if (now > nextCoffeeRun && owner && owner.seat && owner.seat.ceo) {
    nextCoffeeRun = now + 240000 + Math.random() * 180000;
    const a = pick([...agents.values()].filter(a => parked(a) && !WORK.has(a.state) && a.state !== 'asleep'));
    if (a) {
      goTo(a, [-5, 8], { type: 'spot', cell: [-5, 8], face: 'up', act: 'delivery', label: 'Apporte un café à ' + OWNER });
      news('☕', a.name + ' apporte un café à ' + OWNER);
    }
  }
  everyone().forEach(a => {
    if (a.act === 'delivery' && parked(a) && !a._delivered) {
      a._delivered = true;
      if (owner) { owner.sipUntil = now + 2500; ericEmote = { icon: '❤️', until: now + 3000 }; }
    }
    if (a.act !== 'delivery') a._delivered = false;
  });
});
HOOKS.post.push(t => {   // tasse dans la main pendant la livraison
  agents.forEach(a => {
    if (!a._anchor || !(a.heading && a.heading.act === 'delivery')) return;
    panel(a._anchor.x + 6, a._anchor.y + 16, 3, 4, CREAM); R(a._anchor.x + 6, a._anchor.y + 17, 3, 1, CLAY);
  });
  // Eric stressé si beaucoup d'erreurs récentes
  if (!owner || !owner._anchor) return;
  const errs = [...agents.values()].filter(a => a.m && a.m.errorAt && Date.now() - a.m.errorAt < 300000).length;
  if (errs >= 3 && !(ericEmote && ericEmote.until > NOW())) icon('drop', owner._anchor.x - 8, owner._anchor.y + 4 + Math.round((t * 1.6) % 1 * 5), '#7fb6e0');
});
HOOKS.overlay.push(c => {
  if (!ericEmote || ericEmote.until < NOW() || !owner || !owner._anchor) return;
  const [x, y] = toCss(owner._anchor.x, owner._anchor.y);
  c.font = '15px "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.fillText(ericEmote.icon, x + 12, y - 10); c.textAlign = 'left';
});

/* ---------- 7. événements : pizza party, robot aspirateur ---------- */
const doneTimes = [];
let pizzaUntil = 0;
function checkPizza() {
  const now = NOW(); doneTimes.push(now);
  while (doneTimes.length && now - doneTimes[0] > 600000) doneTimes.shift();
  if (doneTimes.length >= 3 && now > pizzaUntil) {
    pizzaUntil = now + 240000; doneTimes.length = 0;
    news('🍕', 'Pizza party ! 3 tâches terminées en 10 minutes', 'party');
    PIZZA_SPOTS.forEach(s => SPOTS.push(s));
    setTimeout(() => PIZZA_SPOTS.forEach(s => { const i = SPOTS.indexOf(s); if (i >= 0) SPOTS.splice(i, 1); }), 240000);
  }
}
const PIZZA_SPOTS = [
  { cell: [25, 12], face: 'right', label: 'Mange une part de pizza', w: 30 },
  { cell: [28, 12], face: 'left', label: 'Mange une part de pizza', w: 30 },
  { cell: [26, 11], face: 'down', label: 'Mange une part de pizza', w: 20 }
];
HOOKS.post.push(t => {
  if (NOW() > pizzaUntil) return;
  const x0 = px(26) + 6, y0 = py(12) - 2;                 // cartons de pizza sur la table basse
  panel(x0, y0 + 2, 10, 5, '#d9b27a'); R(x0 + 1, y0 + 3, 8, 3, '#e8a34a'); R(x0 + 2, y0 + 4, 1, 1, RED); R(x0 + 6, y0 + 3, 1, 1, RED);
  panel(x0 + 12, y0 + 1, 9, 6, '#d9b27a'); R(x0 + 13, y0 + 2, 7, 1, '#c9a46a');
});
const robot = { x: 5.5, y: 12.5, path: [], next: 0, active: false };
HOOKS.update.push((dt, now) => {
  const night = skyState(Date.now()).kind === 'night';
  robot.active = night || SEASON.force === 'robot';
  if (!robot.active) { cats.forEach(c => { if (c.ride) { c.ride = false; c.keyOverride = null; c.z = 0; c.nextMove = now; } }); return; }
  if (!robot.path.length && now > robot.next) {
    let cell, n = 0;
    do { cell = [Math.floor(Math.random() * 22), 3 + Math.floor(Math.random() * 11)]; } while (BLOCKED.has(cell[0] + ',' + cell[1]) && ++n < 40);
    robot.path = bfs([Math.floor(robot.x), Math.floor(robot.y)], cell); robot.next = now + 3000 + Math.random() * 5000;
  }
  if (robot.path.length) {
    const [tx, ty] = robot.path[0], dx = tx + 0.5 - robot.x, dy = ty + 0.5 - robot.y, d = Math.hypot(dx, dy), s = 0.9 * dt;
    if (d <= s) { robot.x = tx + 0.5; robot.y = ty + 0.5; robot.path.shift(); } else { robot.x += dx / d * s; robot.y += dy / d * s; }
  }
  // un chat monte dessus de temps en temps
  cats.forEach(c => {
    if (c.ride) {
      c.x = robot.x; c.y = robot.y; c.z = 4; c.mode = 'sit'; c.path = []; c.nextMove = now + 99999; c.label = 'Fait un tour de robot';
      c.keyOverride = py(robot.y) + 8;
      if (now > c.rideUntil) { c.ride = false; c.keyOverride = null; c.z = 0; c.nextMove = now + 2000; c.label = null; }
    } else if (!LASER.on && !c.path.length && c.mode !== 'sleep' && Math.hypot(c.x - robot.x, c.y - robot.y) < 1.2 && Math.random() < 0.004) {
      c.ride = true; c.rideUntil = now + 15000 + Math.random() * 15000; c.spot = null;
      news('🤖', c.name + ' fait un tour de robot aspirateur');
    }
  });
});
HOOKS.items.push((items, t) => {
  if (!robot.active) return;
  items.push({ k: py(robot.y) + 7.5, draw() {
    const x = px(robot.x), y = py(robot.y) + 8;
    R(x - 6, y - 1, 12, 2, 'rgba(40,25,10,.25)');
    panel(x - 5, y - 4, 10, 4, '#3a3835', OUT); R(x - 4, y - 5, 8, 1, '#3a3835'); R(x - 3, y - 5, 6, 1, '#55524c');
    R(x - 1, y - 3, 2, 1, Math.floor(t * 2) % 2 ? GREEN : '#2f4a2f');
  } });
});

/* ---------- 8bis. touche Pokémon : peluches, Pokéballs, console ---------- */
const PY = '#f6d33c', PYd = '#d9a91f';
function plushMouse(x, y) {            // souris électrique jaune, assise ; y = bas des pattes
  R(x - 4, y - 13, 2, 4, PY); R(x - 4, y - 14, 2, 2, OUT); R(x + 3, y - 13, 2, 4, PY); R(x + 3, y - 14, 2, 2, OUT);
  panel(x - 4, y - 9, 9, 8, PY, OUT);
  R(x - 2, y - 7, 1, 1, OUT); R(x + 2, y - 7, 1, 1, OUT); R(x - 3, y - 5, 2, 1, '#e3350d'); R(x + 2, y - 5, 2, 1, '#e3350d'); R(x, y - 5, 1, 1, '#8a5a20');
  R(x - 3, y - 1, 2, 1, PYd); R(x + 2, y - 1, 2, 1, PYd);
  R(x + 5, y - 4, 2, 1, PY); R(x + 6, y - 6, 1, 2, PY); R(x + 6, y - 7, 3, 1, PY); R(x + 8, y - 10, 1, 3, PY); R(x + 5, y - 3, 1, 2, '#8a5a20');
}
function plushPink(x, y) {             // boule rose qui chante
  panel(x - 4, y - 8, 9, 8, '#f6a5c0', OUT); R(x - 1, y - 10, 3, 2, '#f6a5c0'); R(x, y - 9, 1, 1, '#e07aa0');
  R(x - 3, y - 6, 2, 2, '#ffffff'); R(x + 2, y - 6, 2, 2, '#ffffff'); R(x - 2, y - 5, 1, 1, '#3a6aa0'); R(x + 3, y - 5, 1, 1, '#3a6aa0');
  R(x - 4, y - 9, 2, 2, '#f6a5c0'); R(x + 3, y - 9, 2, 2, '#f6a5c0'); R(x, y - 3, 1, 1, '#c25b6a');
}
function plushBulb(x, y) {             // bestiole à bulbe
  panel(x - 2, y - 12, 6, 5, '#4f9a5a', OUT); R(x - 1, y - 12, 2, 1, '#6fb87a');
  panel(x - 5, y - 7, 10, 6, '#7ccfb0', OUT); R(x - 3, y - 4, 2, 1, '#5aa890'); R(x + 2, y - 3, 2, 1, '#5aa890');
  R(x - 3, y - 6, 1, 1, '#c8392a'); R(x + 2, y - 6, 1, 1, '#c8392a'); R(x - 6, y - 8, 2, 2, '#7ccfb0'); R(x + 5, y - 8, 2, 2, '#7ccfb0');
}
furniture.push({ k: py(SOFA.y) + 15.3, draw() { plushMouse(px(SOFA.x) - 2, py(SOFA.y) - 2); } });       // sur l'accoudoir
furniture.push({ k: py(3) + 8.6, draw() { plushPink(px(-3) + 8, py(3) - 28); pokeball(px(-2) + 6, py(3) - 30, true); } });   // sur la vitrine du patron
furniture.push({ k: py(3) + 8.6, draw() { plushBulb(px(13) + 6, py(3) - 26); } });  // sur la bibliothèque
HOOKS.post.push(() => {   // console portable rétro sur la table basse
  const x0 = px(26) + 11, y0 = py(12) + 2;
  if (NOW() < pizzaUntil) return;
  panel(x0, y0, 5, 7, '#c9c4bc', OUT); R(x0 + 1, y0 + 1, 3, 2, '#8bac0f'); R(x0 + 1, y0 + 4, 1, 1, '#3a3835'); R(x0 + 3, y0 + 5, 1, 1, '#c25b6a');
});
// une Pokéball-jouet par terre : les chats la poussent en passant
const toy = { x: 28.5, y: 8.5, vx: 0, vy: 0, rot: 0 };
HOOKS.update.push((dt, now) => {
  cats.forEach(c => {
    const d = Math.hypot(c.x - toy.x, c.y - toy.y);
    if (d < 0.55 && c.mode === 'walk' && Math.hypot(toy.vx, toy.vy) < 0.5) {
      const ang = Math.atan2(toy.y - c.y, toy.x - c.x) + (Math.random() - 0.5) * 0.8;
      toy.vx = Math.cos(ang) * 3.2; toy.vy = Math.sin(ang) * 3.2;
    }
  });
  if (!toy.vx && !toy.vy) return;
  const nx = toy.x + toy.vx * dt, ny = toy.y + toy.vy * dt;
  const free = (x, y) => !BLOCKED.has(Math.floor(x) + ',' + Math.floor(y)) && Math.floor(y) !== SOFA.y - 1 + (x >= SOFA.x && x < SOFA.x + SOFA.n ? 0 : 99) && y >= 3.3 && y < ROWS - 0.2 && x > XMIN + 0.2 && x < XMAX - 0.2;
  if (free(nx, toy.y)) toy.x = nx; else toy.vx *= -0.6;
  if (free(toy.x, ny)) toy.y = ny; else toy.vy *= -0.6;
  toy.rot += Math.hypot(toy.vx, toy.vy) * dt * 3;
  toy.vx *= Math.pow(0.25, dt); toy.vy *= Math.pow(0.25, dt);
  if (Math.hypot(toy.vx, toy.vy) < 0.05) { toy.vx = 0; toy.vy = 0; }
});
// séance de jeu : un chat (parfois les deux) court après la balle, bondit et la renvoie
let nextPlay = NOW() + 40000 + Math.random() * 60000;
function startPlay(c, now) {
  c.playUntil = now + 15000 + Math.random() * 15000; c.spot = null; c.z = 0; c.mode = 'walk'; c.path = [];
  c.label = 'Joue avec la Pokéball';
}
HOOKS.update.push((dt, now) => {
  if (LASER.on) { cats.forEach(c => { c.playUntil = 0; }); return; }
  if (now > nextPlay) {
    nextPlay = now + 90000 + Math.random() * 120000;
    const free = cats.filter(c => !c.ride && !(c.spot && c.spot.keyboard) && !(c.petUntil > now));
    if (free.length) {
      const c = pick(free); startPlay(c, now);
      news('⚾', c.name + ' joue avec la Pokéball');
      const other = free.find(o => o !== c);
      if (other && Math.random() < 0.4) { startPlay(other, now); other.playUntil = c.playUntil; news('🐾', other.name + ' se joint à la partie !'); }
    }
  }
  cats.forEach(c => {
    if (!c.playUntil) return;
    if (now > c.playUntil) { c.playUntil = 0; c.label = null; c.z = 0; c.mode = 'sit'; c.nextMove = now + 3000; if (c.baseSpeed) c.speed = c.baseSpeed; return; }
    c.nextMove = now + 99999; c.label = 'Joue avec la Pokéball';
    const d = Math.hypot(c.x - toy.x, c.y - toy.y);
    if (d < 0.75) {
      if (Math.hypot(toy.vx, toy.vy) < 1.2 && now > (c._kick || 0)) {          // coup de patte !
        c._kick = now + 500; c.pounce = now;
        const ang = Math.random() * Math.PI * 2, sp = 2.2 + Math.random() * 2.2;
        toy.vx = Math.cos(ang) * sp; toy.vy = Math.sin(ang) * sp;
        c.dir = toy.vx >= 0 ? 1 : -1; c.path = []; c.mode = 'sit';
      }
    } else if (now > (c._lt || 0)) {                                       // course vers la balle
      c._lt = now + 300;
      const tx = Math.floor(toy.x), ty = Math.floor(toy.y);
      const target = BLOCKED.has(tx + ',' + ty) ? [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].find(([a, b]) => !BLOCKED.has(a + ',' + b) && b >= 3) : [tx, ty];
      if (target) { c.path = bfs(cellOf(c), target); c.mode = 'walk'; }
      if (!c.baseSpeed) c.baseSpeed = c.speed;
      c.speed = c.baseSpeed * 1.5;
    }
    c.z = c.pounce && now - c.pounce < 380 ? Math.round(Math.sin((now - c.pounce) / 380 * Math.PI) * 4) : 0;
  });
});
// le pompon de l'arbre à chat : un chat se dresse et tape dedans
let nextPompon = NOW() + 60000 + Math.random() * 60000;
HOOKS.update.push((dt, now) => {
  POM.e = Math.max(0, POM.e - dt * 0.2);
  if (LASER.on) { cats.forEach(c => { c.pomUntil = 0; }); return; }
  if (now > nextPompon) {
    nextPompon = now + 120000 + Math.random() * 120000;
    const c = pick(cats.filter(c => !c.playUntil && !c.ride && !(c.spot && (c.spot.keyboard || c.spot.tree)) && !(c.petUntil > now)));
    if (c) { c.pomUntil = Infinity; c.pomGoUntil = now + 60000; catGo(c, [-7, 8], null); news('🧶', c.name + ' va jouer avec le pompon de l\'arbre à chat'); }
  }
  cats.forEach(c => {
    if (!c.pomUntil) return;
    if (now > c.pomUntil || (c.pomUntil === Infinity && now > c.pomGoUntil)) { c.pomUntil = 0; c.z = 0; c.label = null; c.nextMove = now + 2000; return; }
    c.nextMove = now + 99999; c.label = 'Joue avec le pompon';
    if (c.path.length) return;
    if (Math.abs(c.x - (-6.5)) > 0.3 || Math.abs(c.y - 8.5) > 0.3) { catGo(c, [-7, 8], null); return; }
    if (c.pomUntil === Infinity) c.pomUntil = now + 12000 + Math.random() * 10000;   // le chrono démarre à l'arrivée
    c.dir = -1; c.mode = 'sit';
    // petits bonds réguliers vers le pompon
    const ph = (now % 1100) / 1100;
    c.z = ph < 0.35 ? Math.round(Math.sin(ph / 0.35 * Math.PI) * 11) : 0;
    if (ph < 0.05 && !c._hit) { POM.e = Math.min(1, POM.e + 0.4); c._hit = true; }
    if (ph > 0.5) c._hit = false;
  });
});
HOOKS.items.push(items => {
  items.push({ k: py(toy.y) + 6, draw() {
    const x = px(toy.x), y = py(toy.y) + 4;
    R(x - 2, y + 2, 5, 1, 'rgba(40,25,10,.25)');
    pokeball(x, y, false, Math.floor(toy.rot) % 2 === 1);
  } });
});

/* ---------- 8quater. collection Riftbound (TCG) dans le bureau du patron ---------- */
// couleurs des six domaines : Fury, Calm, Mind, Body, Order, Chaos
const RB = ['#d9453a', '#4f9a5a', '#3f7fd1', '#e0892f', '#e8c44a', '#8b5ac7'];
block(-8, 5); block(-7, 5);
function rbCard(x, y, c, shine) {               // carte 4x6 : bord doré, illustration de la couleur du domaine
  R(x, y, 4, 6, '#c9952f'); R(x + 1, y + 1, 2, 3, c); R(x + 1, y + 4, 2, 1, '#f4ecd8');
  if (shine) R(x + 1, y + 1, 1, 1, '#ffffff');
}
furniture.push({   // vitrine de collection
  k: py(6) + 2, draw(t) {
    const x0 = px(-8) + 2, w = 28, top = py(5) - 16, bot = py(6) + 2;
    R(x0, bot, w + 1, 2, SHADOW);
    panel(x0, top, w, bot - top, '#4a2e22'); R(x0, top, w, 1, '#6b4433');
    // boosters et display scellé sur le dessus
    [[1, RB[2]], [7, RB[0]], [13, RB[5]]].forEach(([dx, c]) => { panel(x0 + dx, top - 6, 5, 6, c, OUT); R(x0 + dx, top - 6, 5, 1, shade(c, 0.3)); R(x0 + dx + 2, top - 4, 1, 2, '#f4ecd8'); });
    panel(x0 + 20, top - 7, 7, 7, '#2a2236', OUT); R(x0 + 21, top - 6, 5, 2, '#c9952f'); spark(x0 + 23, top - 2, 1, '#c9952f');
    // deux étagères vitrées remplies de cartes
    const sh = Math.floor(t * 0.7) % 12;
    for (let row = 0; row < 2; row++) {
      const yy = top + 3 + row * 11;
      R(x0 + 2, yy, w - 4, 9, '#1f2430');
      for (let i = 0; i < 5; i++) rbCard(x0 + 3 + i * 5, yy + 2, RB[(i + row * 2) % 6], sh === i + row * 5);
      R(x0 + 2, yy + 9, w - 4, 1, '#c39a72');
    }
    g.fillStyle = 'rgba(200,230,255,.10)'; g.fillRect(x0 + 2, top + 3, w - 4, 21);      // reflet de la vitre
    R(x0 + 3, top + 3, 1, 21, 'rgba(255,255,255,.25)');
    panel(x0 + 2, bot - 5, w - 4, 3, '#5e3a28');
  }
});
HOOKS.post.push(() => {   // petit tapis de jeu avec deux cartes, entre l'écran et la tasse du patron
  const x = px(-6) + 31, y = py(7) + 2;
  R(x, y, 8, 5, '#2a3a5a'); R(x, y, 8, 1, '#3f557f');
  rbCard(x + 1, y - 1, RB[0]); rbCard(x + 5, y - 1, RB[2]);
});

/* ---------- 8ter. télé murale de la cafet (la vidéo YouTube est incrustée par ui.js) ---------- */
const TV = { on: false };
HOOKS.floor.push(t => {
  const { x, y, w, h } = TVRECT;
  if (TV.on) {                                            // sous la vidéo : écran sombre qui scintille un peu
    R(x, y, w, h, '#101216'); R(x, y, w, 1, 'rgba(255,255,255,.08)');
  } else {
    R(x, y, w, h, '#23262c'); R(x + 2, y + 2, 8, 1, 'rgba(255,255,255,.12)'); R(x + 2, y + 3, 4, 1, 'rgba(255,255,255,.08)');
    spark(x + w / 2, y + h / 2, 2, '#4a4d55');
  }
  R(x + w - 3, y + h + 1, 1, 1, TV.on ? GREEN : '#a33');
});
const TV_SPOT = { cell: [25, 5], face: 'up', label: 'Regarde la télé', w: 14 };
HOOKS.update.push(() => {                                 // télé allumée : les agents en pause viennent la regarder
  const i = SPOTS.indexOf(TV_SPOT);
  if (TV.on && i < 0) SPOTS.push(TV_SPOT);
  if (!TV.on && i >= 0) SPOTS.splice(i, 1);
});

/* ---------- 8. saisons : Halloween, Noël ---------- */
const SEASON = (() => {
  const q = new URLSearchParams(location.search).get('season'), d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  return {
    halloween: q === 'halloween' || (!q && ((m === 10 && day >= 15) || (m === 11 && day <= 2))),
    halloweenNight: q === 'halloween' || (m === 10 && day === 31),
    christmas: q === 'christmas' || (!q && m === 12 && day <= 27),
    force: q
  };
})();
const PUMPKINS = [[2, 3], [12, 13], [-7, 4], [29, 13]];
if (SEASON.halloween) {
  PUMPKINS.forEach(([x, y]) => block(x, y));
  PUMPKINS.forEach(([tx, ty]) => furniture.push({ k: py(ty) + 13, draw(t) {
    const cx = px(tx) + 8, by = py(ty) + 13;
    R(cx - 6, by, 12, 2, SHADOW);
    panel(cx - 5, by - 7, 10, 7, '#e07a2a', '#7a3a10'); R(cx - 2, by - 7, 1, 7, '#c4621c'); R(cx + 2, by - 7, 1, 7, '#c4621c');
    R(cx, by - 10, 2, 3, '#5d7745');
    const glow = Math.floor(t * 3) % 2 ? '#ffd24a' : '#ffb02a';
    R(cx - 3, by - 5, 2, 1, glow); R(cx + 2, by - 5, 2, 1, glow); R(cx - 2, by - 3, 5, 1, glow);
  } }));
}
if (SEASON.christmas) {
  block(29, 8);
  furniture.push({ k: py(9) + 2, draw(t) {
    const cx = px(29) + 8, by = py(9) + 2;
    R(cx - 7, by, 14, 2, SHADOW); panel(cx - 2, by - 4, 4, 4, '#6e4c38');
    [[-7, -10, 14], [-5, -17, 10], [-3, -23, 6]].forEach(([x, y, w]) => panel(cx + x, by + y, w, 7, '#3f7a4a', '#1f3a24'));
    spark(cx, by - 26, 2, '#ffd866');
    [[-4, -8], [3, -6], [-2, -14], [2, -16], [0, -20], [-5, -5]].forEach(([x, y], i) => R(cx + x, by + y, 1, 1, (Math.floor(t * 2) + i) % 3 ? [RED, AMBER, BLUE][i % 3] : '#ffffff'));
  } });
}
HOOKS.floor.push((t, sky) => {   // toiles d'araignée + chauves-souris aux fenêtres
  if (!SEASON.halloween) return;
  const web = (x, y, dir) => { for (let i = 0; i < 9; i++) { R(x + dir * i, y, 1, 1, 'rgba(230,230,230,.7)'); R(x, y + i, 1, 1, 'rgba(230,230,230,.7)'); } for (let i = 0; i < 6; i++) R(x + dir * i, y + 6 - i, 1, 1, 'rgba(230,230,230,.5)'); };
  web(px(XMIN) + 1, OYp + 2, 1); web(px(-1) - 2, OYp + 2, -1); web(px(0) + 1, OYp + 2, 1); web(px(22) - 2, OYp + 2, -1); web(px(23) + 1, OYp + 2, 1); web(px(32) - 2, OYp + 2, -1);
  if (sky.kind !== 'night') return;
  WINDOWS.forEach(([fx0, fx1], wi) => {
    const p = (t * 0.15 + wi * 0.37) % 1, bx = fx0 + Math.round(p * (fx1 - fx0)), by = OYp + 12 + Math.round(Math.sin(t * 3 + wi) * 3), f = Math.floor(t * 6) % 2;
    if (bx > fx1 - 4) return;
    R(bx, by, 2, 1, '#1b1a19'); R(bx - 2, by - f, 2, 1, '#1b1a19'); R(bx + 2, by - f, 2, 1, '#1b1a19');
  });
});
HOOKS.post.push(t => {   // chapeaux de sorcière le 31 octobre, bonnets de Noël en décembre
  if (!SEASON.halloweenNight && !SEASON.christmas) return;
  everyone().forEach(a => {
    if (!a._anchor) return;
    const x = a._anchor.x, y = a._anchor.y + (a.id === selectedId ? 6 : 1);
    if (SEASON.halloweenNight) { R(x - 7, y + 1, 14, 2, '#2a2236'); R(x - 4, y - 3, 8, 4, '#2a2236'); R(x - 2, y - 6, 4, 3, '#2a2236'); R(x, y - 8, 2, 2, '#2a2236'); R(x - 4, y - 1, 8, 1, '#e07a2a'); }
    else { R(x - 6, y + 1, 12, 2, '#ffffff'); R(x - 5, y - 3, 10, 4, RED); R(x - 2, y - 6, 5, 3, RED); R(x + 3, y - 7, 2, 2, '#ffffff'); }
  });
});
