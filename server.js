/* ==========================================================================
   SERVIDOR CENTRAL — Controle de Correções Operacionais PROSECURITY
   Sem dependências: só precisa do Node.js (versão 16 ou mais nova).
   - Serve o sistema (index.html, script.js, style.css, assets/) e a API /api/*
   - Guarda TODOS os dados em ./dados/dados.json (com cópias de segurança automáticas)
   - Confere login e senha AQUI (no servidor) e aplica as permissões de cada perfil em cada operação
   Como usar: veja LEIAME_SERVIDOR.md
   ========================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');

const PORTA = Number(process.env.PORT) || 3000;
const RAIZ = __dirname;
const DIR_DADOS = process.env.DADOS_DIR || path.join(RAIZ, 'dados');
const ARQ = path.join(DIR_DADOS, 'dados.json');
const VERSAO = '3.0.0';
const SESSAO_HORAS = 12, MAX_TENTATIVAS = 5, BLOQUEIO_MIN = 5, HASH_RODADAS = 20000;

/* ---------------- Perfis e permissões (mesma matriz do script.js — mantenha as duas iguais) ---------------- */
const PERFIS = { MESTRE: 'Acesso completo e administração dos acessos', CCO: 'Visualização e tratativa das solicitações + Dashboard', SUPERVISOR: 'Criação e acompanhamento das próprias solicitações' };
const PERMISSOES = {
  MESTRE: ['dashboard', 'indicadores', 'correcao.criar', 'correcao.ver', 'correcao.ver.todas', 'correcao.editar', 'correcao.status', 'correcao.excluir', 'historico.ver', 'exportar', 'usuarios.admin', 'backup'],
  CCO: ['dashboard', 'indicadores', 'correcao.ver', 'correcao.ver.todas', 'correcao.status', 'historico.ver', 'exportar'],
  SUPERVISOR: ['correcao.criar', 'correcao.ver', 'correcao.editar.proprias']
};
const STATUS_EDITAVEL_SUPERVISOR = ['PENDENTE', 'AGUARDANDO INFORMAÇÃO', 'DUPLICIDADE / VALIDAR'];
const CAMPOS_STATUS = ['status', 'responsavel', 'correcaoRealizada', 'corrigidoPor', 'concluidoEm'];
const CAMPOS_FIXOS = ['id', 'data', 'criadoEm', 'criadoPor', 'criadoLogin', 'criadoPerfil', 'solicitante'];
const dataLocal = iso => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const CAMPOS_META = ['atualizadoEm', 'atualizadoPor'];

/* Contas iniciais (só sal + hash; as senhas não ficam no código). Preenchido pelo build. */
const SEED_USUARIOS = [
  { login: 'MESTRE', perfil: 'MESTRE', sal: 'eeb320998a8bffcb11a96561d5c50335', hash: '3682629749298131aa63d94f88e5259a054f8ac1924d43ef86a23ac3a0d9d701' },
  { login: 'SUPERVISOR', perfil: 'SUPERVISOR', sal: 'b8ec01a6cab91834de4133cde09e273d', hash: 'fc327b67abe338670a18ea15561074fe9a28bfc4ee61c1505920b96fd7641d67' },
  { login: 'CCO', perfil: 'CCO', sal: 'ee4782ab00df6740f2b9db8904be2d0f', hash: 'd4e3bef78e10eaf23ebf981cd83ef0469b56cf02ba0c3e6d5b7b2b4a9a66aafd' }
];

/* ---------------- Dados ---------------- */
let D = { correcoes: [], historico: [], usuarios: [], auditoria: [] };
function agoraISO() { return new Date().toISOString(); }
function carregar() {
  fs.mkdirSync(DIR_DADOS, { recursive: true });
  if (fs.existsSync(ARQ)) {
    try { D = { ...D, ...JSON.parse(fs.readFileSync(ARQ, 'utf8')) }; }
    catch (e) { console.error('ERRO ao ler ' + ARQ + ': ' + e.message + '\nO servidor NÃO vai iniciar para não sobrescrever seus dados. Restaure uma cópia da pasta dados/backups.'); process.exit(1); }
  }
  if (!D.usuarios.length) {
    const agora = agoraISO();
    D.usuarios = SEED_USUARIOS.map(u => ({ ...u, ativo: true, descricao: PERFIS[u.perfil], senhaPadrao: true, criadoEm: agora, criadoPor: 'Sistema (conta inicial)', atualizadoEm: agora, atualizadoPor: 'Sistema (conta inicial)' }));
    gravarAgora();
  }
}
let timerGravar = null;
function gravarAgora() {
  const tmp = ARQ + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(D)); fs.renameSync(tmp, ARQ);
}
function agendarGravacao() { if (!timerGravar) timerGravar = setTimeout(() => { timerGravar = null; try { gravarAgora(); } catch (e) { console.error('Falha ao gravar:', e.message); } }, 300); }
function backup() {
  try {
    const dir = path.join(DIR_DADOS, 'backups'); fs.mkdirSync(dir, { recursive: true });
    const d = new Date(), nome = `dados-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}.json`;
    if (!fs.existsSync(path.join(dir, nome)) && fs.existsSync(ARQ)) fs.copyFileSync(ARQ, path.join(dir, nome));
    const todos = fs.readdirSync(dir).filter(f => f.startsWith('dados-')).sort();
    todos.slice(0, Math.max(0, todos.length - 60)).forEach(f => fs.unlinkSync(path.join(dir, f)));
  } catch (e) { console.error('Falha no backup:', e.message); }
}

/* ---------------- Senha e sessão ---------------- */
function hashSenha(senha, sal) {
  const base = Buffer.from(sal + '|' + senha, 'utf8');
  let h = crypto.createHash('sha256').update(base).digest();
  for (let i = 1; i < HASH_RODADAS; i++) h = crypto.createHash('sha256').update(Buffer.concat([h, base])).digest();
  return h.toString('hex');
}
const iguais = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const sessoes = new Map();       // token -> { login, criado }
const tentativas = new Map();    // login -> { n, ate }
const pode = (u, p) => !!u && u.ativo && (PERMISSOES[u.perfil] || []).includes(p);
function usuarioDe(req) {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || ''); if (!m) return null;
  const s = sessoes.get(m[1]); if (!s) return null;
  if (Date.now() - s.criado > SESSAO_HORAS * 3600e3) { sessoes.delete(m[1]); return null; }
  const u = D.usuarios.find(x => x.login === s.login);
  return u && u.ativo ? u : null;
}
const publico = ({ sal, hash, ...r }) => r;
function auditar(evento, login, perfil, detalhe, pessoa = '') {
  D.auditoria.push({ id: crypto.randomUUID(), dataHora: agoraISO(), login: login || '', perfil: perfil || '', pessoa, evento, detalhe: String(detalhe || '').slice(0, 300) });
  if (D.auditoria.length > 5000) D.auditoria.splice(0, D.auditoria.length - 5000);
  agendarGravacao();
}

/* ---------------- Regras de escopo e permissão ---------------- */
const visivel = (u, r) => pode(u, 'correcao.ver') && (pode(u, 'correcao.ver.todas') || r.criadoPerfil === 'SUPERVISOR');
const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
const valorIgual = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

function aplicarCorrecao(u, item) {
  const rec = item && item.rec;
  if (!rec || typeof rec.id !== 'string' || !/^[A-Za-z0-9._-]{3,60}$/.test(rec.id) || typeof rec.status !== 'string' || !ISO.test(String(rec.atualizadoEm || ''))) return 'registro inválido';
  const atual = D.correcoes.find(r => r.id === rec.id);
  if (!atual) {
    if (!pode(u, 'correcao.criar')) return 'ACESSO NEGADO: sem permissão para criar';
    if (new Date(rec.criadoEm).getTime() > Date.now() + 10 * 60000) return 'Data/hora do computador inválida (futura)';
    if (rec.data !== dataLocal(rec.criadoEm)) return 'A data da solicitação deve ser a data em que ela foi criada';
    const novo = { ...rec, recebidoEm: agoraISO(), criadoLogin: u.login, criadoPerfil: u.perfil, demo: false };
    D.correcoes.push(novo); return '';
  }
  if (!visivel(u, atual)) return 'ACESSO NEGADO: registro fora do seu escopo';
  const chaves = new Set([...Object.keys(atual), ...Object.keys(rec)]);
  const mudou = [...chaves].filter(k => !CAMPOS_META.includes(k) && !['demo', 'criadoLogin', 'criadoPerfil', 'recebidoEm'].includes(k) && !valorIgual(atual[k], rec[k]));
  if (!mudou.length && rec.atualizadoEm === atual.atualizadoEm) return '';        // reenvio do mesmo registro (idempotente)
  if (item.base !== atual.atualizadoEm) return 'CONFLITO';
  if (mudou.some(k => CAMPOS_FIXOS.includes(k))) return 'ACESSO NEGADO: campos de origem não podem ser alterados';
  const mudouStatus = mudou.filter(k => CAMPOS_STATUS.includes(k)), mudouDados = mudou.filter(k => !CAMPOS_STATUS.includes(k));
  const podeEditar = pode(u, 'correcao.editar') || (pode(u, 'correcao.editar.proprias') && atual.criadoPerfil === 'SUPERVISOR' && STATUS_EDITAVEL_SUPERVISOR.includes(atual.status));
  if (mudouDados.length && !podeEditar) return 'ACESSO NEGADO: sem permissão para editar';
  if (mudouStatus.length && !pode(u, 'correcao.status')) {
    // única exceção: o solicitante complementa a informação pedida e a solicitação volta para PENDENTE
    const ok = podeEditar && atual.status === 'AGUARDANDO INFORMAÇÃO' && rec.status === 'PENDENTE' && mudouStatus.length === 1;
    if (!ok) return 'ACESSO NEGADO: sem permissão para tratar/alterar status';
  }
  const idx = D.correcoes.indexOf(atual); D.correcoes[idx] = { ...rec, recebidoEm: atual.recebidoEm, criadoLogin: atual.criadoLogin, criadoPerfil: atual.criadoPerfil, demo: false };
  return '';
}
function aplicarHistorico(u, h) {
  if (!h || typeof h.id !== 'string' || typeof h.correcaoId !== 'string' || !ISO.test(String(h.dataHora || ''))) return 'evento inválido';
  if (D.historico.some(x => x.id === h.id)) return '';       // já recebido (reenvio)
  const r = D.correcoes.find(x => x.id === h.correcaoId);
  if (r ? !visivel(u, r) : !(h.acao === 'EXCLUSÃO' && pode(u, 'correcao.excluir'))) return 'ACESSO NEGADO: histórico fora do seu escopo';
  D.historico.push({ ...h, login: u.login, perfil: u.perfil }); return '';
}
function aplicarUsuarios(u, lista) {
  if (!pode(u, 'usuarios.admin')) return 'ACESSO NEGADO: administração de acessos';
  if (!Array.isArray(lista) || !lista.length) return 'lista inválida';
  for (const x of lista) if (!x || !/^[A-Z0-9_.-]{3,20}$/.test(x.login) || !PERFIS[x.perfil] || typeof x.ativo !== 'boolean' || !/^[a-f0-9]{32}$/.test(x.sal || '') || !/^[a-f0-9]{64}$/.test(x.hash || '')) return 'conta inválida';
  if (new Set(lista.map(x => x.login)).size !== lista.length) return 'logins repetidos';
  if (!lista.some(x => x.perfil === 'MESTRE' && x.ativo)) return 'é preciso manter ao menos uma conta MESTRE ativa';
  D.usuarios = lista.map(x => ({ login: x.login, perfil: x.perfil, ativo: x.ativo, descricao: String(x.descricao || '').slice(0, 80), sal: x.sal, hash: x.hash, senhaPadrao: !!x.senhaPadrao,
    criadoEm: x.criadoEm || agoraISO(), criadoPor: String(x.criadoPor || '').slice(0, 80), atualizadoEm: x.atualizadoEm || agoraISO(), atualizadoPor: String(x.atualizadoPor || '').slice(0, 80) }));
  return '';
}
function estadoPara(u) {
  const corr = D.correcoes.filter(r => visivel(u, r));
  let hist = D.historico;
  if (!pode(u, 'correcao.ver.todas')) { const ids = new Set(corr.map(r => r.id)); hist = hist.filter(h => ids.has(h.correcaoId)); }
  const adm = pode(u, 'usuarios.admin');
  return { correcoes: corr, historico: hist,
    usuarios: adm ? D.usuarios : D.usuarios.map(x => ({ login: x.login, perfil: x.perfil, ativo: x.ativo })),
    auditoria: adm ? D.auditoria.slice(-500) : [] };
}

/* ---------------- HTTP ---------------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const ESTATICOS = new Set(['index.html', 'script.js', 'style.css']);
function json(res, cod, obj) { const s = JSON.stringify(obj); res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(s); }
function corpo(req) {
  return new Promise((ok, err) => {
    const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 30e6) { err(new Error('corpo muito grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); } catch (e) { err(new Error('JSON inválido')); } });
    req.on('error', err);
  });
}
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'), rota = url.pathname;
    if (rota.startsWith('/api/')) {
      if (req.method === 'GET' && rota === '/api/ping') return json(res, 200, { ok: true, servidor: 'prosecurity-correcoes', versao: VERSAO, agora: agoraISO() });
      if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'método não permitido' });
      const b = await corpo(req);
      if (rota === '/api/login') {
        const login = String(b.login || '').trim().toUpperCase().slice(0, 30), senha = String(b.senha || '').slice(0, 200);
        const t = tentativas.get(login) || { n: 0, ate: 0 };
        if (t.ate > Date.now()) return json(res, 429, { ok: false, erro: `Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em ${Math.ceil((t.ate - Date.now()) / 60000)} min.` });
        const u = D.usuarios.find(x => x.login === login);
        const h = hashSenha(senha, u ? u.sal : '0'.repeat(32));
        if (!(u && u.ativo && iguais(h, u.hash))) {
          t.n += 1; if (t.n >= MAX_TENTATIVAS) { t.ate = Date.now() + BLOQUEIO_MIN * 60000; t.n = 0; }
          tentativas.set(login, t); auditar('LOGIN_FALHA', login, '', u && !u.ativo ? 'Conta desativada' : 'Login ou senha inválidos');
          return json(res, 401, { ok: false, erro: 'Login ou senha inválidos, ou conta desativada.' });
        }
        tentativas.delete(login);
        const token = crypto.randomBytes(32).toString('hex'); sessoes.set(token, { login, criado: Date.now() });
        auditar('LOGIN', u.login, u.perfil, 'Acesso realizado');
        return json(res, 200, { ok: true, token, usuario: publico(u) });
      }
      const u = usuarioDe(req);
      if (!u) return json(res, 401, { ok: false, erro: 'sessão inválida ou expirada' });
      if (rota === '/api/logout') { const m = /Bearer (\S+)/.exec(req.headers.authorization || ''); if (m) sessoes.delete(m[1]); auditar('LOGOUT', u.login, u.perfil, ''); return json(res, 200, { ok: true }); }
      if (rota === '/api/sync') {
        const rej = [], aceitos = { correcoes: [], historico: [], exclusoes: [] };
        for (const it of (Array.isArray(b.correcoes) ? b.correcoes : [])) { const m = aplicarCorrecao(u, it); if (m) { rej.push({ tipo: 'correcao', id: it && it.rec && it.rec.id, motivo: m }); if (m.startsWith('ACESSO NEGADO')) auditar('ACESSO_NEGADO', u.login, u.perfil, `${m} (${it.rec && it.rec.id})`); } else aceitos.correcoes.push(it.rec.id); }
        for (const h of (Array.isArray(b.historico) ? b.historico : [])) { const m = aplicarHistorico(u, h); if (m) rej.push({ tipo: 'historico', id: h && h.id, motivo: m }); else aceitos.historico.push(h.id); }
        for (const id of (Array.isArray(b.exclusoes) ? b.exclusoes : [])) {
          const r = D.correcoes.find(x => x.id === id);
          if (!r) { aceitos.exclusoes.push(id); continue; }
          if (!pode(u, 'correcao.excluir') || !visivel(u, r)) { rej.push({ tipo: 'exclusao', id, motivo: 'ACESSO NEGADO: exclusão' }); auditar('ACESSO_NEGADO', u.login, u.perfil, 'Tentativa de excluir ' + id); continue; }
          D.correcoes = D.correcoes.filter(x => x.id !== id); aceitos.exclusoes.push(id);
        }
        if (Array.isArray(b.usuarios)) { const m = aplicarUsuarios(u, b.usuarios); if (m) rej.push({ tipo: 'usuarios', id: '', motivo: m }); else aceitos.usuarios = true; }
        for (const a of (Array.isArray(b.auditoria) ? b.auditoria : []).slice(0, 200)) {
          if (!a || ['LOGIN', 'LOGIN_FALHA', 'LOGOUT'].includes(a.evento)) continue;
          D.auditoria.push({ id: String(a.id || crypto.randomUUID()).slice(0, 60), dataHora: ISO.test(String(a.dataHora)) ? a.dataHora : agoraISO(), login: u.login, perfil: u.perfil, pessoa: String(a.pessoa || '').slice(0, 80), evento: String(a.evento || '').slice(0, 40), detalhe: String(a.detalhe || '').slice(0, 300) });
        }
        agendarGravacao();
        return json(res, 200, { ok: true, aceitos, rejeitados: rej, estado: estadoPara(u), agora: agoraISO() });
      }
      return json(res, 404, { ok: false, erro: 'rota inexistente' });
    }
    // arquivos do sistema (somente a lista permitida)
    let nome = decodeURIComponent(rota === '/' ? '/index.html' : rota).replace(/^\/+/, '');
    const permitido = ESTATICOS.has(nome) || /^assets\/[A-Za-z0-9._-]+$/.test(nome);
    const arq = path.join(RAIZ, nome);
    if (!permitido || !arq.startsWith(RAIZ) || !fs.existsSync(arq)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(arq).pipe(res);
  } catch (e) { json(res, 400, { ok: false, erro: e.message }); }
});

carregar(); backup(); setInterval(backup, 3600e3);
servidor.listen(PORTA, '0.0.0.0', () => {
  console.log('\n=== Controle de Correções Operacionais — PROSECURITY (servidor ' + VERSAO + ') ===');
  console.log('Endereço para todos os usuários da rede (Wi-Fi/cabo da empresa):');
  Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).forEach(i => console.log('   http://' + i.address + ':' + PORTA));
  console.log('Neste computador:  http://localhost:' + PORTA);
  console.log('Dados gravados em: ' + ARQ + '\nNão feche esta janela enquanto o sistema estiver em uso.\n');
});
const sair = () => { try { if (timerGravar) clearTimeout(timerGravar); gravarAgora(); } catch (e) { /* ignora */ } process.exit(0); };
process.on('SIGINT', sair); process.on('SIGTERM', sair);
module.exports = { hashSenha };
