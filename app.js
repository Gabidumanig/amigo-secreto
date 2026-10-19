/* ========= CONFIGURAÇÃO ========= */
// Lista de opções de presente.
const OPCOES_PRESENTE = [
  'Escova de cabelo para viagem',
  'Mosquetão',
  'Faixa e acessórios de cabelo',
  'Bandana tubular pescoço e cabeça',
  'Adesivos',
  'Nécessaire compacta para viagem',
  'Toalha compacta para viagem',
  'Boné viagem',
  'Chapéu tipo bucket',
  'Gorro',
  'Meias',
  'Luvas',
  'Top esportivo',
  'Camiseta manga curta',
  'Camiseta manga longa',
  'Pochete',
  'Mochila de ataque',
  'Capa de chuva',
  'Capa de chuva para mochila',
  'Saco estanque pequeno',
  'Garrafa de água',
  'Copo térmico',
  'Lanterna de cabeça',
  'Almofada inflável',
  'Produtos mini de beleza',
  'Aromaterapia',
  'Chás / cafés',
  'Snacks pra trilha',
  'Suplementos'
];

/* ========= API ========= */
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const rawBase = window.__API_BASE__ || '';
const unresolved = rawBase.startsWith('__PORT_');
if (!(window.SHEETS_URL || '').trim() && unresolved && !localHosts.has(location.hostname)) console.error('Placeholder do backend não foi substituído');
const API = unresolved ? 'http://localhost:8000' : rawBase;

const SHEETS = (window.SHEETS_URL || '').trim();
async function api(path, opts = {}) {
  if (SHEETS) return sheetsApi(path, opts);
  const res = await fetch(`${API}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) { const e = new Error(res.status); e.status = res.status; throw e; }
  return res.json();
}
// Google Apps Script: GET para ler, POST text/plain para salvar (evita preflight CORS)
async function sheetsApi(path, opts) {
  let res;
  if (opts.method === 'POST') {
    res = await fetch(SHEETS, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: opts.body, redirect: 'follow' });
  } else {
    const m = path.match(/^\/api\/respostas\/(.+)$/);
    const q = m ? `action=get&nome=${m[1]}` : 'action=list';
    res = await fetch(`${SHEETS}?${q}&t=${Date.now()}`, { redirect: 'follow' });
  }
  if (!res.ok) { const e = new Error(res.status); e.status = res.status; throw e; }
  const j = await res.json();
  if (!j.ok) { const e = new Error(j.status); e.status = j.status; throw e; }
  return j.data ?? {};
}

/* ========= ESTADO ========= */
const state = { nome: '', sobre: '', opcoes: [], desejo: '', levar: '', todas: [] };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ========= NAVEGAÇÃO ========= */
function go(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(`#s-${id}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'opcoes') renderOpcoes();
  if (id === 'sobre') $('#in-sobre').value = state.sobre;
  if (id === 'desejo') $('#in-desejo').value = state.desejo;
  if (id === 'levar') $('#in-levar').value = state.levar;
  if (id === 'mural') carregarMural();
  if (id === 'nome') setTimeout(() => $('#in-nome').focus(), 50);
  document.querySelectorAll('.who').forEach((w) => (w.textContent = state.nome.split(' ')[0]));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) go(b.dataset.go);
});

function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
function busy(btn, on) { btn.disabled = on; }

/* ========= TELA 1 ========= */
$('#f-nome').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = $('#in-nome').value.trim().replace(/\s+/g, ' ');
  const err = $('#err-nome');
  if (nome.length < 2) { err.textContent = 'Digite seu nome para continuar.'; return; }
  err.textContent = '';
  const btn = e.submitter || $('#f-nome .btn'); busy(btn, true);
  state.nome = nome; state.sobre = ''; state.opcoes = []; state.desejo = ''; state.levar = '';
  try {
    const r = await api(`/api/respostas/${encodeURIComponent(nome)}`);
    Object.assign(state, { nome: r.nome, sobre: r.sobre || '', opcoes: r.opcoes || [], desejo: r.desejo || '', levar: r.levar || '' });
    toast(`Que bom te ver de novo, ${r.nome.split(' ')[0]}. Suas respostas foram carregadas.`);
  } catch (ex) {
    if (ex.status !== 404) { err.textContent = 'Não conseguimos conectar agora. Tente de novo.'; busy(btn, false); return; }
  }
  try { await api('/api/respostas', { method: 'POST', body: JSON.stringify({ nome: state.nome }) }); } catch {}
  busy(btn, false);
  go('sobre');
});

/* ========= TELA: SOBRE ========= */
$('#in-sobre').addEventListener('input', () => ($('#err-sobre').textContent = ''));
$('#b-sobre').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  state.sobre = $('#in-sobre').value.trim();
  if (!state.sobre) { $('#err-sobre').textContent = 'Conte um pouquinho sobre você para continuar.'; return; }
  $('#err-sobre').textContent = '';
  busy(btn, true);
  try { await api('/api/respostas', { method: 'POST', body: JSON.stringify({ nome: state.nome, sobre: state.sobre }) }); go('opcoes'); }
  catch { $('#err-sobre').textContent = 'Não foi possível salvar. Tente novamente.'; }
  busy(btn, false);
});

/* ========= TELA 2 ========= */
const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke="#fbf8f1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"/></svg>';
function renderOpcoes() {
  const box = $('#opcoes');
  box.innerHTML = OPCOES_PRESENTE.map((o, i) => `
    <label class="opt" data-v="${esc(o)}">
      <input type="checkbox" value="${esc(o)}" id="op${i}">
      <span class="box">${CHECK}</span><span class="txt">${esc(o)}</span>
    </label>`).join('');
  box.querySelectorAll('input').forEach((inp) => {
    inp.checked = state.opcoes.includes(inp.value);
    inp.addEventListener('change', () => {
      state.opcoes = inp.checked ? [...state.opcoes, inp.value] : state.opcoes.filter((v) => v !== inp.value);
      $('#err-opcoes').textContent = '';
      syncOpcoes();
    });
  });
  syncOpcoes();
}
function syncOpcoes() {
  document.querySelectorAll('.opt').forEach((l) => {
    const c = l.querySelector('input').checked;
    l.classList.toggle('checked', c);
    l.classList.remove('disabled');
    l.querySelector('input').disabled = false;
  });
  $('#count').textContent = state.opcoes.length;
}
$('#b-opcoes').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (state.opcoes.length < 1) { $('#err-opcoes').textContent = 'Escolha pelo menos 1 opção.'; return; }
  $('#err-opcoes').textContent = '';
  busy(btn, true);
  try { await api('/api/respostas', { method: 'POST', body: JSON.stringify({ nome: state.nome, opcoes: state.opcoes }) }); go('desejo'); }
  catch { $('#err-opcoes').textContent = 'Não foi possível salvar. Tente novamente.'; }
  busy(btn, false);
});

/* ========= TELA 3 ========= */
$('#b-desejo').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  state.desejo = $('#in-desejo').value.trim();
  $('#err-desejo').textContent = '';
  busy(btn, true);
  try { await api('/api/respostas', { method: 'POST', body: JSON.stringify({ nome: state.nome, desejo: state.desejo }) }); go('levar'); }
  catch { $('#err-desejo').textContent = 'Não foi possível salvar. Tente novamente.'; }
  busy(btn, false);
});

/* ========= TELA 4 ========= */
$('#in-levar').removeAttribute('required');
$('#b-levar').addEventListener('click', async (e) => {
  e.preventDefault();
  const btn = e.currentTarget;
  state.levar = $('#in-levar').value.trim();
  $('#err-levar').textContent = '';
  busy(btn, true);
  try { await api('/api/respostas', { method: 'POST', body: JSON.stringify({ nome: state.nome, levar: state.levar }) }); toast('Respostas salvas. Obrigada!'); go('mural'); }
  catch { $('#err-levar').textContent = 'Não foi possível salvar. Tente novamente.'; }
  busy(btn, false);
});

/* ========= TELA 5: MURAL ========= */
const BRING_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8934a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18M5 11a7 7 0 0 1 14 0M12 4V2M4 15h16l-1.5 5h-13z"/></svg>';
const CARD_ICONS = ['tent', 'compass', 'boot', 'lantern', 'carabiner', 'pine', 'pack', 'mountain'];
function semResposta(txt) {
  return !txt || /^(n[aã]o|nao\.?|não\.?|-)$/i.test(txt.trim());
}
async function carregarMural() {
  const grid = $('#mural');
  grid.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  try { state.todas = await api('/api/respostas'); }
  catch { grid.innerHTML = '<div class="empty"><h3>Não foi possível carregar</h3><p>Verifique a conexão e toque em Atualizar.</p></div>'; return; }
  renderMural();
}
function renderMural() {
  const q = $('#busca').value.trim().toLowerCase();
  const lista = state.todas.filter((r) => r.nome.toLowerCase().includes(q));
  const grid = $('#mural');
  if (!state.todas.length) {
    grid.innerHTML = '<div class="empty"><h3>Ninguém respondeu ainda</h3><p>Assim que as amigas preencherem, as preferências aparecem aqui.</p></div>';
  } else if (!lista.length) {
    grid.innerHTML = `<div class="empty"><h3>Nenhuma amiga encontrada</h3><p>Não há respostas para “${esc(q)}”.</p></div>`;
  } else {
    grid.innerHTML = lista.map((r, idx) => `
      <article class="friend">
        <div class="top"><svg class="wreath mini" data-size="44" viewBox="0 0 44 44" aria-hidden="true"></svg><h3>${esc(r.nome)}</h3></div>
        ${r.sobre ? `<p class="k">Sobre ela</p><p class="about">${esc(r.sobre)}</p>` : ''}
        <p class="k">Sugestões de presentes</p>
        ${r.opcoes.length ? `<ol>${r.opcoes.map((o, i) => `<li><b>${i + 1}</b>${esc(o)}</li>`).join('')}</ol>` : '<p class="empty-txt">Ainda não escolheu.</p>'}
        <p class="k">Outra sugestão</p>
        ${r.desejo ? `<p class="wish">${esc(r.desejo)}</p>` : `<p class="empty-txt">Sem outras sugestões informadas.</p
