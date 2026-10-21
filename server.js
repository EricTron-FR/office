// Eric Office : petit serveur local, sans dépendance.
// 1. Sert la page et diffuse (SSE) les nouvelles lignes des sessions Claude Code
//    (~/.claude/projects/<projet>/<session>.jsonl), qu'elles viennent du terminal ou de l'app.
// 2. Lance et pilote des agents Claude Code depuis le bureau (claude -p en stream-json),
//    et relaie leurs demandes de permission à la page (Autoriser / Refuser).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const PORT = Number(process.env.PORT) || 8123;
const ROOT = process.env.CLAUDE_PROJECTS || path.join(os.homedir(), '.claude', 'projects');
const MAX_AGE = 2 * 3600 * 1000;      // on ignore les sessions inactives depuis plus de 2 h
const TAIL = 400 * 1024;              // au départ, on relit seulement la fin du fichier
const TOKEN = crypto.randomBytes(24).toString('hex');   // jeton secret de cette exécution du serveur
const ORIGINS = new Set(['http://localhost:' + PORT, 'http://127.0.0.1:' + PORT]);

/* ---------- le CLI Claude Code ---------- */
// cherche Claude Code : variable CLAUDE_BIN, installeur officiel (~/.local/bin), install npm, puis le PATH
function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const win = process.platform === 'win32', name = win ? 'claude.exe' : 'claude';
  const local = path.join(os.homedir(), '.local', 'bin', name);
  if (fs.existsSync(local)) return local;
  try {
    const root = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const exe = path.join(root, '@anthropic-ai', 'claude-code', 'bin', name);
    if (fs.existsSync(exe)) return exe;
  } catch { }
  try {
    const found = execSync(win ? 'where claude' : 'command -v claude', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const exe = found.find(f => !win || f.toLowerCase().endsWith('.exe'));
    if (exe) return exe;
  } catch { }
  return 'claude';
}
const CLAUDE_BIN = findClaude();

/* ---------- lecture des sessions (fichiers .jsonl) ---------- */
function listSessions() {
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(ROOT, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    let files = [];
    try { files = fs.readdirSync(path.join(ROOT, d.name), { withFileTypes: true }); } catch { continue; }
    for (const f of files) {
      if (f.isDirectory()) {             // <session>/subagents/agent-xxx.jsonl : les sous-agents de cette session
        const sub = path.join(ROOT, d.name, f.name, 'subagents');
        let subs = [];
        try { subs = fs.readdirSync(sub, { withFileTypes: true }); } catch { continue; }
        for (const s of subs) {
          if (!s.isFile() || !s.name.endsWith('.jsonl')) continue;
          const full = path.join(sub, s.name);
          try { const st = fs.statSync(full); out.push({ key: d.name + '/' + f.name + '/subagents/' + s.name, full, size: st.size, mtime: st.mtimeMs, meta: full.replace(/\.jsonl$/, '.meta.json') }); } catch { }
        }
        continue;
      }
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const full = path.join(ROOT, d.name, f.name);
      try { const st = fs.statSync(full); out.push({ key: d.name + '/' + f.name, full, size: st.size, mtime: st.mtimeMs }); } catch { }
    }
  }
  return out;
}
function readRange(file, start, end) {
  const fd = fs.openSync(file, 'r');
  try { const buf = Buffer.alloc(end - start); fs.readSync(fd, buf, 0, buf.length, start); return buf; }
  finally { fs.closeSync(fd); }
}
function pump(res, state) {   // un état de lecture par client connecté
  const now = Date.now();
  for (const s of listSessions()) {
    let off = state.get(s.key), skipFirst = false, meta = null;
    if (off === undefined && s.meta) { try { meta = JSON.parse(fs.readFileSync(s.meta, 'utf8')); } catch { } }
    if (off === undefined) {
      if (now - s.mtime > MAX_AGE) continue;
      off = Math.max(0, s.size - TAIL); skipFirst = off > 0;
    }
    if (s.size < off) off = 0;
    if (s.size === off) { state.set(s.key, off); continue; }
    let buf; try { buf = readRange(s.full, off, s.size); } catch { continue; }
    const end = buf.lastIndexOf(10);
    if (end < 0) { state.set(s.key, off); continue; }
    const begin = skipFirst ? buf.indexOf(10) + 1 : 0;
    const text = begin <= end ? buf.subarray(begin, end).toString('utf8') : '';
    state.set(s.key, off + end + 1);
    if (text) res.write('data: ' + JSON.stringify(meta ? { key: s.key, text, meta } : { key: s.key, text }) + '\n\n');
  }
}

/* ---------- consommation : tokens notés dans les sessions (7 derniers jours) ---------- */
// prix API publics en $ par million de tokens : entrée, sortie, lecture de cache, écriture de cache
const PRICES = [
  [/fable|mythos/, [10, 50, 1, 12.5]], [/opus-5-5/, [4, 20, 0.2, 5]], [/opus/, [5, 25, 0.5, 6.25]],
  [/sonnet-5-5|sonnet-5/, [2, 10, 0.2, 2.5]], [/sonnet/, [3, 15, 0.3, 3.75]], [/haiku-5-5/, [0.1, 0.5, 0.01, 0.125]], [/haiku/, [1, 5, 0.1, 1.25]]
];
const priceOf = m => (PRICES.find(([re]) => re.test(m || '')) || [null, [4, 20, 0.2, 5]])[1];
const usage = { files: new Map(), recs: new Map() };   // fichier -> octets lus ; id message -> enregistrement
function scanUsage() {
  const since = Date.now() - 8 * 86400e3;
  for (const s of listSessions()) {
    if (s.mtime < since) continue;
    let off = usage.files.get(s.full) || 0;
    if (s.size < off) off = 0;
    if (s.size === off) continue;
    let buf; try { buf = readRange(s.full, off, s.size); } catch { continue; }
    const end = buf.lastIndexOf(10); if (end < 0) continue;
    usage.files.set(s.full, off + end + 1);
    for (const line of buf.subarray(0, end).toString('utf8').split('\n')) {
      if (line.indexOf('"usage"') < 0 || line.indexOf('"assistant"') < 0) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      const m = e.message, u = m && m.usage;
      if (e.type !== 'assistant' || !u || !m.id || m.model === '<synthetic>') continue;
      usage.recs.set(m.id, { t: Date.parse(e.timestamp) || Date.now(), key: s.key, project: e.cwd || s.key.split('/')[0], model: m.model,
        in: u.input_tokens || 0, out: u.output_tokens || 0, cr: u.cache_read_input_tokens || 0, cw: u.cache_creation_input_tokens || 0 });
    }
  }
  for (const [id, r] of usage.recs) if (r.t < since) usage.recs.delete(id);
}
function usageReport() {
  scanUsage();
  const now = Date.now(), day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const blank = () => ({ tokens: 0, out: 0, cost: 0, msgs: 0 });
  const add = (b, r) => {
    const p = priceOf(r.model);
    b.tokens += r.in + r.out + r.cr + r.cw; b.out += r.out; b.msgs++;
    b.cost += (r.in * p[0] + r.out * p[1] + r.cr * p[2] + r.cw * p[3]) / 1e6;
  };
  const rep = { last5h: blank(), today: blank(), week: blank(), days: [], projects: {}, models: {}, sessions: {} };
  for (let i = 6; i >= 0; i--) { const d = new Date(day0.getTime() - i * 86400e3); rep.days.push(Object.assign(blank(), { date: d.toISOString().slice(0, 10), day: d.getDay() })); }
  for (const r of usage.recs.values()) {
    if (now - r.t < 5 * 3600e3) add(rep.last5h, r);
    if (r.t >= day0.getTime()) add(rep.today, r);
    const di = 6 - Math.floor((day0.getTime() + 86400e3 - 1 - r.t) / 86400e3);
    if (di < 0 || di > 6) continue;
    add(rep.week, r); add(rep.days[di], r);
    add(rep.projects[r.project] = rep.projects[r.project] || blank(), r);
    add(rep.models[r.model] = rep.models[r.model] || blank(), r);
    add(rep.sessions[r.key] = rep.sessions[r.key] || blank(), r);
  }
  return rep;
}
let usageCache = null;

/* ---------- diffusion vers les pages ouvertes ---------- */
const clients = new Set();
function broadcast(event, data) {
  const msg = 'event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n';
  for (const res of clients) { try { res.write(msg); } catch { } }
}

/* ---------- agents pilotés depuis le bureau ---------- */
const runs = new Map();    // id -> run
const perms = new Map();   // id -> demande de permission en attente
const runView = r => ({ id: r.id, cwd: r.cwd, sessionId: r.sessionId, status: r.status, mode: r.policy, rules: r.rules.map(ruleLabel), started: r.started, error: r.error || null });

// niveau d'autorisation (modifiable en cours de route) + règles « toujours autoriser » de la session
const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const cmdOf = input => String((input && input.command) || '').trim();
function ruleFor(tool, input) {           // « npm test », « git status »… ou l'outil entier
  if (!SHELL_TOOLS.has(tool)) return { tool };
  const w = cmdOf(input).split(/\s+/);
  const prefix = w[1] && /^[a-z][\w:.-]*$/i.test(w[1]) ? w[0] + ' ' + w[1] : w[0];
  return { tool, prefix };
}
const ruleLabel = r => r.prefix ? r.prefix : r.tool;
function autoAllowed(run, tool, input) {
  if (!run) return false;
  if (run.policy === 'trust') return true;
  if (run.policy === 'acceptEdits' && EDIT_TOOLS.has(tool)) return true;
  const cmd = cmdOf(input);
  return run.rules.some(r => r.tool === tool && (!r.prefix || cmd === r.prefix || cmd.startsWith(r.prefix + ' ')));
}

function startRun({ cwd, prompt, resume, mode }) {
  let st; try { st = fs.statSync(cwd); } catch { throw new Error('Dossier introuvable : ' + cwd); }
  if (!st.isDirectory()) throw new Error('Ce n\'est pas un dossier : ' + cwd);
  if (!prompt || !String(prompt).trim()) throw new Error('Il faut une consigne.');
  const id = crypto.randomBytes(6).toString('hex');
  const cfg = path.join(os.tmpdir(), 'eric-office-mcp-' + id + '.json');
  fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { eo: {
    type: 'stdio', command: process.execPath, args: [path.join(__dirname, 'perm-mcp.js')],
    env: { EO_RUN: id, EO_PORT: String(PORT), EO_TOKEN: TOKEN } } } }));
  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--mcp-config', cfg, '--permission-prompt-tool', 'mcp__eo__approve'];
  if (resume) args.push('--resume', resume);
  const proc = spawn(CLAUDE_BIN, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  const run = { id, proc, cwd, sessionId: resume || null, status: 'running', policy: mode || 'default', rules: [], started: Date.now(), cfg, errTail: '' };
  runs.set(id, run);

  let out = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', chunk => {
    out += chunk; let i;
    while ((i = out.indexOf('\n')) >= 0) {
      const line = out.slice(0, i).trim(); out = out.slice(i + 1);
      if (!line) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      if (ev.session_id && run.sessionId !== ev.session_id) { run.sessionId = ev.session_id; broadcast('run', runView(run)); }
      if (ev.type === 'result') {
        run.status = 'idle';
        if (ev.is_error) run.error = ev.result || (ev.errors || []).join(' ') || 'Erreur';
        broadcast('run', runView(run));
      } else if (ev.type === 'assistant' && run.status !== 'running') { run.status = 'running'; broadcast('run', runView(run)); }
    }
  });
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', c => { run.errTail = (run.errTail + c).slice(-2000); });
  proc.on('error', e => { run.status = 'ended'; run.error = 'Impossible de lancer Claude Code : ' + e.message; broadcast('run', runView(run)); });
  proc.on('exit', code => {
    run.status = 'ended';
    if (code && !run.error) run.error = (run.errTail.trim().split('\n').pop() || ('Arrêt (code ' + code + ')'));
    for (const p of perms.values()) if (p.runId === id) decide(p.id, false, 'L\'agent s\'est arrêté.');
    try { fs.unlinkSync(cfg); } catch { }
    broadcast('run', runView(run));
  });
  sendToRun(run, prompt);
  broadcast('run', runView(run));
  return run;
}
function sendToRun(run, text) {
  if (!run || run.status === 'ended') throw new Error('Cet agent est arrêté.');
  run.status = 'running'; run.error = null;
  run.proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: String(text) }, parent_tool_use_id: null }) + '\n');
  broadcast('run', runView(run));
}
function decide(pid, allow, message, always) {
  const p = perms.get(pid); if (!p) return false;
  perms.delete(pid);
  if (allow && always) {                  // « toujours autoriser » : on retient la règle pour cette session
    const run = runs.get(p.runId), rule = ruleFor(p.view.tool, p.input);
    if (run && !run.rules.some(r => r.tool === rule.tool && r.prefix === rule.prefix)) { run.rules.push(rule); broadcast('run', runView(run)); }
  }
  p.reply(allow ? { behavior: 'allow', updatedInput: p.input } : { behavior: 'deny', message: message || 'Refusé depuis Eric Office.' });
  broadcast('perm-done', { id: pid, allow });
  return true;
}

/* ---------- HTTP ---------- */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.setEncoding('utf8');
    req.on('data', c => { d += c; if (d.length > 1e6) { reject(new Error('Trop gros')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { reject(new Error('JSON invalide')); } });
  });
}
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
// les appels qui agissent viennent soit de la page (même origine), soit du serveur MCP local ; toujours avec le jeton
function allowed(req) {
  if (req.headers['x-eo-token'] !== TOKEN) return false;
  const o = req.headers.origin;
  return !o || ORIGINS.has(o);
}

const STATIC = {
  '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/world.js': ['world.js', 'text/javascript'], '/features.js': ['features.js', 'text/javascript'], '/rooms.js': ['rooms.js', 'text/javascript'], '/events.js': ['events.js', 'text/javascript'], '/ui.js': ['ui.js', 'text/javascript']
};

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (url === '/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('retry: 2000\n\n');
      clients.add(res);
      res.write('event: runs\ndata: ' + JSON.stringify({ runs: [...runs.values()].map(runView), perms: [...perms.values()].map(p => p.view) }) + '\n\n');
      const state = new Map();
      pump(res, state);
      const timer = setInterval(() => { try { pump(res, state); } catch (e) { console.error(e.message); } }, 1000);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => { clearInterval(timer); clearInterval(ping); clients.delete(res); });
      return;
    }
    // le jeton n'est lisible que par une page servie ici (pas de CORS : un autre site ne peut pas le lire)
    if (url === '/api/usage' && req.method === 'GET') {
      if (!usageCache || Date.now() - usageCache.at > 30000) usageCache = { at: Date.now(), data: usageReport() };
      return json(res, 200, usageCache.data);
    }
    if (url === '/api/session-token' && req.method === 'GET') return json(res, 200, { token: TOKEN, claude: CLAUDE_BIN !== 'claude' || null });
    if (url.startsWith('/api/')) {
      if (req.method !== 'POST' || !allowed(req)) return json(res, 403, { error: 'Interdit' });
      const body = await readJson(req);
      if (url === '/api/runs') {
        const run = startRun({ cwd: body.cwd, prompt: body.prompt, resume: body.resume, mode: body.mode });
        return json(res, 200, runView(run));
      }
      let m;
      if ((m = url.match(/^\/api\/runs\/([0-9a-f]+)\/message$/))) { sendToRun(runs.get(m[1]), body.text); return json(res, 200, { ok: true }); }
      if ((m = url.match(/^\/api\/runs\/([0-9a-f]+)\/stop$/))) {
        const run = runs.get(m[1]); if (run && run.status !== 'ended') { try { run.proc.stdin.end(); } catch { } setTimeout(() => { try { run.proc.kill(); } catch { } }, 1500); }
        return json(res, 200, { ok: true });
      }
      if ((m = url.match(/^\/api\/runs\/([0-9a-f]+)\/mode$/))) {   // changer le niveau d'autorisation en cours de route
        const run = runs.get(m[1]);
        if (!run || !['default', 'acceptEdits', 'trust'].includes(body.mode)) return json(res, 400, { error: 'Mode inconnu' });
        run.policy = body.mode; broadcast('run', runView(run));
        for (const p of [...perms.values()]) if (p.runId === run.id && autoAllowed(run, p.view.tool, p.input)) decide(p.id, true);
        return json(res, 200, { ok: true });
      }
      if (url === '/api/perm') {           // appelé par perm-mcp.js : on garde la requête ouverte jusqu'à la décision
        const run = runs.get(body.runId);
        if (autoAllowed(run, body.tool_name, body.input)) {               // déjà autorisé par le mode ou une règle
          broadcast('perm-auto', { runId: body.runId, sessionId: run.sessionId, tool: body.tool_name, input: body.input || {} });
          return json(res, 200, { behavior: 'allow', updatedInput: body.input || {} });
        }
        const pid = crypto.randomBytes(6).toString('hex');
        const view = { id: pid, runId: body.runId, sessionId: run && run.sessionId, cwd: run && run.cwd, tool: body.tool_name, input: body.input || {}, at: Date.now() };
        perms.set(pid, { id: pid, runId: body.runId, input: body.input || {}, view, reply: decision => json(res, 200, decision) });
        req.on('close', () => { if (perms.has(pid) && res.writableEnded === false && res.destroyed) { perms.delete(pid); broadcast('perm-done', { id: pid }); } });
        broadcast('perm', view);
        return;
      }
      if ((m = url.match(/^\/api\/perm\/([0-9a-f]+)$/))) return json(res, 200, { ok: decide(m[1], !!body.allow, null, !!body.always) });
      return json(res, 404, { error: 'Inconnu' });
    }
    const f = STATIC[url];
    if (f) {
      res.writeHead(200, { 'Content-Type': f[1] + '; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(path.join(__dirname, f[0])));
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    json(res, 400, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Eric Office  →  http://localhost:' + PORT);
  console.log('Sessions lues dans : ' + ROOT);
  console.log('Claude Code : ' + CLAUDE_BIN);
});
