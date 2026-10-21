// Eric Office : mini serveur MCP (stdio) utilisé par Claude Code via --permission-prompt-tool.
// Quand un agent lancé depuis le bureau veut utiliser un outil qui demande une autorisation,
// Claude Code appelle l'outil « approve » ; on relaie la question au serveur du bureau et on
// attend la réponse de l'utilisateur (Autoriser / Refuser) avant de répondre.
// Il fournit aussi la messagerie d'équipe (equipe, envoyer_message, lire_messages) pour que les agents se parlent.
const http = require('http');

const PORT = Number(process.env.EO_PORT) || 8123;
const RUN = process.env.EO_RUN || '';
const TOKEN = process.env.EO_TOKEN || '';

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function log(...a) { process.stderr.write('[perm-mcp] ' + a.join(' ') + '\n'); }

function askOffice(args) {
  return post('/api/perm', { runId: RUN, tool_name: args.tool_name, input: args.input || {}, tool_use_id: args.tool_use_id },
    { behavior: 'deny', message: 'Réponse invalide du bureau.' });
}
function post(pathname, obj, fallback) {
  return new Promise(resolve => {
    const body = JSON.stringify(obj);
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-EO-Token': TOKEN } }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(fallback); }
      });
    });
    req.on('error', e => resolve(Object.assign({}, fallback, { message: 'Le bureau ne répond pas : ' + e.message, text: 'Le bureau ne répond pas : ' + e.message })));
    req.end(body);
  });
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    handle(msg).catch(e => log(e.message));
  }
});

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    send({ jsonrpc: '2.0', id, result: {
      protocolVersion: (params && params.protocolVersion) || '2025-06-18',
      capabilities: { tools: {} }, serverInfo: { name: 'eric-office', version: '1.0.0' } } });
  } else if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: [{
      name: 'approve',
      description: 'Demande à l\'utilisateur, depuis Eric Office, s\'il autorise un appel d\'outil.',
      inputSchema: { type: 'object', properties: {
        tool_name: { type: 'string' }, input: { type: 'object' }, tool_use_id: { type: 'string' } }, required: ['tool_name'] }
    }, {
      name: 'equipe',
      description: 'Liste les autres agents Claude Code présents dans Eric Office (leur nom, s\'ils sont occupés, leur dossier).',
      inputSchema: { type: 'object', properties: {} }
    }, {
      name: 'envoyer_message',
      description: 'Envoie un message court à un collègue d\'Eric Office (par son nom, ou « tous »). Il le reçoit dès qu\'il est disponible.',
      inputSchema: { type: 'object', properties: {
        a: { type: 'string', description: 'Nom du destinataire (voir l\'outil equipe), ou « tous »' },
        texte: { type: 'string', description: 'Le message' } }, required: ['a', 'texte'] }
    }, {
      name: 'lire_messages',
      description: 'Lit les messages reçus de tes collègues d\'Eric Office (et vide la boîte).',
      inputSchema: { type: 'object', properties: {} }
    }] } });
  } else if (method === 'tools/call') {
    const name = params && params.name, args = (params && params.arguments) || {};
    if (name && name !== 'approve') {
      const r = await post('/api/team', { runId: RUN, op: name, args }, { text: 'Réponse invalide du bureau.', error: true });
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: r.text }], isError: !!r.error } });
      return;
    }
    const decision = await askOffice(args);
    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(decision) }] } });
  } else if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} });
  } else if (id !== undefined) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Méthode inconnue : ' + method } });
  }
}
