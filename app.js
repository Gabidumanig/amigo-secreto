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
      if (inp.checked && state.opcoes.length >= 3) { inp.checked = false; $('#err-opcoes').textContent = 'Você já escolheu 3. Desmarque uma para trocar.'; return; }
      state.opcoes = inp.checked ? [...state.opcoes, inp.value] : state.opcoes.filter((v) => v !== inp.value);
      $('#err-opcoes').textContent = '';
      syncOpcoes();
    });
  });
  syncOpcoes();
}
function syncOpcoes() {
  const full = state.opcoes.length >= 3;
  document.querySelectorAll('.opt').forEach((l) => {
    const c = l.querySelector('input').checked;
    l.classList.toggle('checked', c);
    l.classList.toggle('disabled', full && !c);
  });
  $('#count').textContent = state.opcoes.length;
}
$('#b-opcoes').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (state.opcoes.length !== 3) { $('#err-opcoes').textContent = 'Escolha exatamente 3 opções.'; return; }
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
$('#b-levar').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  state.levar = $('#in-levar').value.trim();
  if (!state.levar) { $('#err-levar').textContent = 'Responda com o que vai levar, ou escreva "Não".'; return; }
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
        <p class="k">3 opções escolhidas</p>
        ${r.opcoes.length ? `<ol>${r.opcoes.map((o, i) => `<li><b>${i + 1}</b>${esc(o)}</li>`).join('')}</ol>` : '<p class="empty-txt">Ainda não escolheu.</p>'}
        <p class="k">Outra sugestão</p>
        ${r.desejo ? `<p class="wish">${esc(r.desejo)}</p>` : `<p class="empty-txt">${r.levar ? 'Sem outras sugestões.' : 'Ainda não respondeu.'}</p>`}
        <span class="corner">${icon(CARD_ICONS[idx % CARD_ICONS.length])}</span>
        <div class="bring">${icon('mug', 'bring-ic')}<span><strong>Vai levar:</strong> ${r.levar ? esc(r.levar) : '—'}</span></div>
      </article>`).join('');
    grid.querySelectorAll('svg.wreath').forEach(drawWreath);
  }
  $('#menu').innerHTML = state.todas.length
    ? state.todas.map((r) => `<li class="${semResposta(r.levar) ? 'none' : ''}"><span class="n">${esc(r.nome)}</span><span class="w">${r.levar ? esc(r.levar) : 'Ainda não respondeu'}</span></li>`).join('')
    : '<li class="none"><span class="w">Nenhuma resposta ainda.</span></li>';
}
$('#busca').addEventListener('input', renderMural);
$('#b-refresh').addEventListener('click', carregarMural);
$('#b-editar').addEventListener('click', () => {
  if (state.nome) go('sobre'); else { go('nome'); toast('Digite seu nome para editar suas respostas.'); }
});

/* ========= ILUSTRAÇÕES FINE LINE ========= */
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
const f = (n) => (+n).toFixed(1);

/* ---- ícones outdoor (traço fino, 32x32) ---- */
const ICONS = {
  tent: '<path d="M3 26h26"/><path d="M5.5 26 16 7l10.5 19"/><path d="M16 7 13.5 3M16 7l2.5-4"/><path d="M12.5 26 16 18.5l3.5 7.5"/>',
  compass: '<circle cx="16" cy="16" r="11.5"/><circle cx="16" cy="16" r="8.5" stroke-dasharray="1 2.4"/><path d="M16 8.5 18.4 16 16 23.5 13.6 16Z"/><path d="M13.6 16h4.8"/><circle cx="16" cy="16" r="1"/>',
  boot: '<path d="M9 4h7.5v10.5l6.8 2.9c2.2 1 3.2 2.4 3.2 4.3V25H6.5v-6.2c0-2.2 2.5-3.1 2.5-5.4Z"/><path d="M6.5 22.5h20M16.5 8h-3.2M16.5 11h-3.2M16.5 14h-3"/>',
  pack: '<path d="M10 11c0-3.6 2.4-6 6-6s6 2.4 6 6v14a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z"/><path d="M13 5.6c0-2.4 6-2.4 6 0"/><path d="M12.5 17.5h7v6h-7zM12.5 20h7M10 13h12"/>',
  mug: '<path d="M7 12h14v10a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 7 22Z"/><path d="M21 14.5h1.8a3 3 0 0 1 0 6H21"/><path d="M11.5 9c-1.2-1.3 1.2-2.2 0-3.6M16 9c-1.2-1.3 1.2-2.2 0-3.6"/>',
  fire: '<path d="M6 27.5 26 21.5M6 21.5l20 6"/><path d="M16 23.5c-3.8-.6-5.4-4.4-2.6-8.6.3 1.8 1.2 2.6 2.1 2.8-.4-3.4 1.2-6.6 4.2-8.4-1 3.9 2.8 6.3.6 11.3-.9 1.9-2.3 2.9-4.3 2.9Z"/>',
  pine: '<path d="M16 3.5 10.5 12h3l-5 7h3.5L6.5 26.5h19L20 19h3.5l-5-7h3Z"/><path d="M16 26.5V30"/>',
  lantern: '<path d="M12 9h8M13 9V7h6v2"/><path d="M14 7c0-3 4-3 4 0"/><path d="M11 11h10l-1 13.5h-8Z"/><path d="M10 24.5h12"/><path d="M16 21c-1.8-1.6-.6-3.6 0-5.6.8 2 2 3.8 0 5.6Z"/>',
  mountain: '<path d="M2.5 26.5 12 10l4.5 7.5L20 13l9.5 13.5Z"/><path d="M12 10 9.6 14.2l2.4-1 2 1.6"/><path d="M12 10V4.5l4 1.4-4 1.4"/>',
  carabiner: '<path d="M13 5.5c-3.6 0-5.5 2.6-5.5 6.5v8.5c0 3.6 2.4 6 6 6h4.6c3.6 0 5.4-2.6 5.4-6V12c0-3.9-1.9-6.5-5.5-6.5Z"/><path d="M19.5 9.5v12"/><path d="M17.8 9.5h3.4"/>',
};
const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));

/* ---- montanha fine line reutilizável ---- */
// desenha um pico: contorno com ombros, dobra central, neve em zigue-zague e hachura no lado sombreado
function peak(px, py, wl, wr, base, r, opt = {}) {
  const h = base - py, N = 7;
  const side = (dir, w, pw) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const jit = i && i < N ? (r() - .5) * h * .07 : 0;
      pts.push([px + dir * w * Math.pow(t, pw), py + h * t + jit]);
    }
    return pts;
  };
  const L = side(-1, wl, 1.15), R = side(1, wr, .8);
  const xAt = (pts, y) => { for (let i = 1; i < pts.length; i++) if (pts[i][1] >= y) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return x0 + (x1 - x0) * (y - y0) / ((y1 - y0) || 1); } return pts[pts.length - 1][0]; };
  const pts = [...L.slice().reverse(), ...R.slice(1)];
  const outline = 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join('L');
  let s = `<path d="${outline}Z" fill="${opt.fill || 'none'}" stroke="none"/><path d="${outline}"/>`;
  // dobras
  const fold = []; for (let i = 0; i <= 6; i++) { const t = i / 6; fold.push([px + wr * .08 * t + (i % 2 ? 1 : -1) * wl * .035 * (i ? 1 : 0), py + h * t]); }
  s += `<path d="M${fold.map((p) => f(p[0]) + ' ' + f(p[1])).join('L')}" stroke-opacity=".7"/>`;
  const f2y = py + h * .38; s += `<path d="M${f(xAt(L, f2y))} ${f(f2y)}L${f(px - wl * .3)} ${f(py + h * .62)}L${f(px - wl * .26)} ${f(py + h * .9)}" stroke-opacity=".45"/>`;
  // neve
  if (opt.snow !== false) {
    const ys = py + h * .22, xl = xAt(L, ys), xr = xAt(R, ys), n = 6; let z = `M${f(xl)} ${f(ys)}`;
    for (let i = 1; i <= n; i++) { const x = xl + (xr - xl) * i / n; z += `L${f(x - (xr - xl) / n / 2)} ${f(ys + (i % 2 ? h * .08 : h * .035))}L${f(x)} ${f(ys + (r() - .4) * h * .025)}`; }
    s += `<path d="${z}" stroke-opacity=".85"/>`;
  }
  // hachura no lado sombreado
  const hatch = opt.hatch ?? 9;
  for (let i = 1; i <= hatch; i++) {
    const t = .3 + (i / (hatch + 1)) * .66, y = py + h * t;
    const xr = xAt(R, y) - 2, xf = px + wr * .08 * t + 3;
    const len = (xr - xf) * (.4 + r() * .35);
    if (len > 3) s += `<path d="M${f(xr)} ${f(y)}l${f(-len)} ${f(len * .5)}" stroke-opacity=".4"/>`;
  }
  return s;
}
function linePine(x, y, h) {
  const w = h * .34; let s = `<path d="M${f(x)} ${f(y)}V${f(y - h)}"/>`;
  for (let i = 0; i < 4; i++) {
    const yy = y - h * .2 - i * h * .2, ww = w * (1 - i * .2);
    s += `<path d="M${f(x - ww)} ${f(yy)}L${f(x)} ${f(yy - h * .26)}L${f(x + ww)} ${f(yy)}"/>`;
  }
  return s;
}
function sparkle(x, y, s) { return `<path d="M${f(x)} ${f(y - s)}V${f(y + s)}M${f(x - s)} ${f(y)}H${f(x + s)}" stroke-width=".8"/>`; }

/* ---- paisagem de fundo ---- */
function drawRange() {
  const svg = $('#range-svg'); if (!svg) return;
  const W = 1440, H = 320, r = rng(19), bg = '#0c2219';
  let o = `<g fill="none" stroke="#e7d6ae" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">`;
  // céu: lua e estrelas
  o += `<g stroke-opacity=".55"><path d="M1236 46a20 20 0 1 0 22 26 16 16 0 1 1-22-26Z"/></g>`;
  [[180, 40, 4], [320, 86, 3], [610, 30, 3.5], [860, 70, 3], [1040, 26, 4], [1360, 110, 3], [90, 120, 2.5], [1150, 100, 2.5], [470, 120, 2.5]].forEach(([x, y, s]) => (o += `<g stroke-opacity=".6">${sparkle(x, y, s)}</g>`));
  [[400, 140], [700, 120], [980, 150], [1300, 170]].forEach(([x, y]) => (o += `<circle cx="${x}" cy="${y}" r=".9" fill="#e7d6ae" stroke="none" opacity=".6"/>`));
  // pássaros
  o += `<g stroke-opacity=".55"><path d="M760 112q5-5 10 0q5-5 10 0"/><path d="M790 98q4-4 8 0q4-4 8 0"/></g>`;
  // cordilheira de trás
  o += `<g stroke-opacity=".42">`;
  [[140, 150, 230, 210], [470, 110, 260, 230], [820, 135, 220, 240], [1150, 95, 260, 230], [1420, 160, 200, 200]].forEach(([x, y, a, b]) => (o += peak(x, y, a, b, 300, r, { fill: bg, hatch: 10 })));
  o += `</g>`;
  // cordilheira do meio
  o += `<g stroke-opacity=".62">`;
  [[300, 190, 200, 210], [660, 175, 210, 200], [1000, 200, 190, 220], [1300, 205, 180, 180]].forEach(([x, y, a, b]) => (o += peak(x, y, a, b, 310, r, { fill: bg, hatch: 7 })));
  o += `</g>`;
  // trilha pontilhada subindo o pico central
  o += `<path d="M560 318C600 300 640 296 620 276S670 250 650 232S690 205 664 186" stroke-dasharray="1.5 5" stroke-opacity=".9"/>`;
  o += `<path d="M660 176V160l9 3.2-9 3.2" stroke="#c9414a" stroke-opacity=".9"/>`;
  // colinas da frente
  const hill = `M0 300C160 282 300 292 420 296S640 282 760 292S1000 300 1120 288S1340 284 1440 296`;
  o += `<path d="${hill}V${H}H0Z" fill="${bg}" stroke="none"/><path d="${hill}" stroke-opacity=".8"/>`;
  // pinheiros
  o += `<g stroke-opacity=".85">`;
  [[40, 302, 34], [66, 300, 46], [92, 302, 30], [380, 300, 28], [404, 300, 40], [1180, 296, 36], [1206, 294, 48], [1236, 296, 30], [1380, 300, 38], [1404, 302, 28]].forEach(([x, y, h]) => (o += linePine(x, y, h)));
  o += `</g>`;
  // barraca + fogueira
  o += `<g stroke-opacity=".9"><path d="M900 294L928 256L956 294"/><path d="M928 256l-5-6M928 256l5-6"/><path d="M920 294l8-16 8 16"/><path d="M890 294h76" stroke-opacity=".5"/>
    <path d="M982 295l16-5M982 290l16 5"/><path d="M990 289c-3.5-.6-4.6-4-2.3-7.6.3 1.5 1 2.2 1.8 2.4-.3-3 1-5.8 3.6-7.3-.8 3.4 2.4 5.5.5 9.8-.8 1.7-2 2.6-3.6 2.7Z" stroke="#c9414a"/></g>`;
  o += `</g>`;
  svg.innerHTML = o;
}

/* ---- guirlanda fine line ---- */
function leafLine(x, y, rot, l, w) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="M0 0C${f(w)} ${f(-l * .3)} ${f(w * .8)} ${f(-l * .78)} 0 ${f(-l)}C${f(-w * .8)} ${f(-l * .78)} ${f(-w)} ${f(-l * .3)} 0 0Z"/><path d="M0 ${f(-l * .12)}V${f(-l * .84)}" stroke-opacity=".55"/></g>`;
}
function drawWreath(svg) {
  const S = +svg.dataset.size || 200, c = S / 2, k = S / 220, small = S < 80;
  const light = svg.dataset.tone === 'light';
  const ink = light ? '#e7d6ae' : '#1a4533', accent = light ? '#7fa58b' : '#5a8f6c';
  const R = S * .36, r = rng(Math.round(S * 13 + 1));
  const sw = small ? .9 : Math.max(.9, 1.1 * Math.sqrt(k));
  let o = `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${f(sw)}">`;
  if (svg.dataset.mountain) o += wreathScene(S, c, k, ink, light);
  // aro fino
  o += `<circle cx="${c}" cy="${c}" r="${f(R)}" stroke="${ink}" stroke-opacity=".35"/>`;
  const n = small ? 12 : 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - .5) * .05;
    const x = c + Math.cos(a) * R, y = c + Math.sin(a) * R, deg = a * 180 / Math.PI + 90;
    const l = S * (small ? .2 : .11 + r() * .03), w = l * .36;
    o += `<g stroke="${ink}">${leafLine(x, y, deg - 30 + (r() - .5) * 10, l, w)}</g>`;
    o += `<g stroke="${accent}">${leafLine(x, y, deg + 180 + 32 + (r() - .5) * 10, l * .85, w * .9)}</g>`;
    if (!small && i % 3 === 1) { // raminho de pinho
      const a2 = a + Math.PI / n, x2 = c + Math.cos(a2) * R, y2 = c + Math.sin(a2) * R, tg = a2 + Math.PI / 2;
      o += `<path d="M${f(x2 - Math.cos(tg) * S * .035)} ${f(y2 - Math.sin(tg) * S * .035)}L${f(x2 + Math.cos(tg) * S * .035)} ${f(y2 + Math.sin(tg) * S * .035)}" stroke="${accent}"/>`;
      for (let j = -2; j <= 2; j++) { const bx = x2 + Math.cos(tg) * j * S * .014, by = y2 + Math.sin(tg) * j * S * .014; o += `<path d="M${f(bx)} ${f(by)}l${f(Math.cos(a2 + .6) * S * .03)} ${f(Math.sin(a2 + .6) * S * .03)}M${f(bx)} ${f(by)}l${f(Math.cos(a2 - .6 + Math.PI) * S * .03)} ${f(Math.sin(a2 - .6 + Math.PI) * S * .03)}" stroke="${accent}" stroke-opacity=".8"/>`; }
    }
  }
  // frutinhas e pontos dourados
  const cl = small ? 4 : 8;
  for (let i = 0; i < cl; i++) {
    const a = (i / cl) * Math.PI * 2 + .4, x = c + Math.cos(a) * R, y = c + Math.sin(a) * R, br = small ? 1.6 : S * .014;
    [[0, 0], [br * 2.1, br * .6], [br * .7, br * 2]].slice(0, small ? 2 : 3).forEach(([dx, dy]) => (o += `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(br)}" fill="#a3242c" stroke="none"/>`));
    if (!small) o += `<circle cx="${f(x - br * 2.4)}" cy="${f(y - br * 1.6)}" r="${f(br * .55)}" fill="#c9a55e" stroke="none"/>`;
  }
  // laço em traço
  if (!small) {
    const bx = c, by = c + R + S * .005, s = S / 220;
    o += `<g transform="translate(${f(bx)} ${f(by)}) scale(${f(s)})" stroke="#a3242c" stroke-width="${f(1.3 / Math.sqrt(s))}">
      <path d="M0 0C-10-16-34-15-32 0C-34 15-10 16 0 0Z"/><path d="M0 0C10-16 34-15 32 0C34 15 10 16 0 0Z"/>
      <path d="M-26-4C-18-7-8-5-2 0M26-4C18-7 8-5 2 0" stroke-opacity=".6"/>
      <path d="M-3 4-16 40l7-3 4 8 7-37M3 4l13 36-7-3-4 8-7-37"/><ellipse cx="0" cy="0" rx="5" ry="6" fill="#fbf8f1"/></g>`;
  }
  o += `</g>`;
  svg.innerHTML = o;
}
function wreathScene(S, c, k0, ink, light) {
  const k = k0 * 1.15;
  const r = rng(5), bg = light ? '#0c2219' : '#fbf8f1';
  const base = c + 26 * k;
  let o = `<g stroke="${ink}" stroke-width="${f(.9 * Math.sqrt(k) + .1)}">`;
  o += `<g stroke-opacity=".55">${peak(c + 22 * k, c - 14 * k, 30 * k, 28 * k, base, r, { fill: bg, hatch: 4 })}</g>`;
  o += peak(c - 8 * k, c - 32 * k, 36 * k, 34 * k, base, r, { fill: bg, hatch: 6 });
  o += `<path d="M${f(c - 52 * k)} ${f(base)}C${f(c - 20 * k)} ${f(base - 6 * k)} ${f(c + 20 * k)} ${f(base + 3 * k)} ${f(c + 52 * k)} ${f(base - 3 * k)}"/>`;
  o += `<g stroke-opacity=".9">${linePine(c - 38 * k, base + 1 * k, 16 * k)}${linePine(c - 29 * k, base, 11 * k)}${linePine(c + 38 * k, base - 1 * k, 14 * k)}</g>`;
  o += `<path d="M${f(c - 18 * k)} ${f(base - 1 * k)}C${f(c - 10 * k)} ${f(base - 12 * k)} ${f(c - 20 * k)} ${f(base - 18 * k)} ${f(c - 12 * k)} ${f(c - 4 * k)}S${f(c - 6 * k)} ${f(c - 22 * k)} ${f(c - 8 * k)} ${f(c - 31 * k)}" stroke-dasharray="${f(1.2 * k)} ${f(3.4 * k)}"/>`;
  o += `<path d="M${f(c - 8 * k)} ${f(c - 32 * k)}V${f(c - 44 * k)}l${f(7 * k)} ${f(2.5 * k)}-${f(7 * k)} ${f(2.5 * k)}" stroke="#a3242c"/>`;
  o += `<path d="M${f(c + 30 * k)} ${f(c - 42 * k)}a${f(7 * k)} ${f(7 * k)} 0 1 0 ${f(8 * k)} ${f(9 * k)} ${f(5.5 * k)} ${f(5.5 * k)} 0 1 1 ${f(-8 * k)} ${f(-9 * k)}Z" stroke-opacity=".8"/>`;
  o += `<g stroke-opacity=".7">${sparkle(c - 30 * k, c - 36 * k, 2.6 * k)}${sparkle(c + 14 * k, c - 50 * k, 2 * k)}</g>`;
  o += `</g>`;
  return o;
}

/* ---- festão fine line no topo ---- */
function drawGarland() {
  const svg = $('#garland-svg');
  const W = Math.max(window.innerWidth, 360), H = svg.parentElement.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const swags = Math.max(2, Math.round(W / 420)), seg = W / swags, sag = H * .5, top = 4, r = rng(42);
  let o = `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1">`;
  for (let s = 0; s < swags; s++) {
    const x0 = s * seg;
    const yAt = (t) => top + Math.sin(t * Math.PI) * sag;
    let d = `M${f(x0)} ${f(top)}`;
    for (let i = 1; i <= 40; i++) { const t = i / 40; d += `L${f(x0 + t * seg)} ${f(yAt(t))}`; }
    o += `<path d="${d}" stroke="#7fa58b" stroke-opacity=".7"/>`;
    const steps = Math.round(seg / 16);
    for (let i = 1; i < steps; i++) {
      const t = i / steps, x = x0 + t * seg, y = yAt(t);
      const ang = Math.atan2(Math.cos(t * Math.PI) * Math.PI * sag / seg, 1) * 180 / Math.PI;
      const side = i % 2 ? 1 : -1;
      o += `<g stroke="${i % 3 ? '#9cbf9f' : '#e7d6ae'}" stroke-opacity=".85">${leafLine(x, y, ang + 90 + side * 55, 13 + r() * 5, 4.4)}</g>`;
      if (i % 7 === 3) o += `<circle cx="${f(x + 3)}" cy="${f(y + 5)}" r="2.3" fill="#b8323b"/><circle cx="${f(x - 2)}" cy="${f(y + 7)}" r="2" fill="#b8323b"/>`;
      if (i % 9 === 5) o += `<circle cx="${f(x)}" cy="${f(y - 6)}" r="1.4" fill="#d8b56a"/>`;
    }
    // pequeno pingente: estrela fine line no meio do festão
    const mx = x0 + seg / 2, my = yAt(.5);
    o += `<path d="M${f(mx)} ${f(my + 4)}v10" stroke="#e7d6ae" stroke-opacity=".6"/><g stroke="#e7d6ae" stroke-opacity=".9">${sparkle(mx, my + 19, 4.5)}</g>`;
  }
  for (let s = 0; s <= swags; s++) {
    const x = s * seg;
    o += `<g transform="translate(${f(x)} ${top + 7}) scale(.4)" stroke="#c9414a" stroke-width="2.4"><path d="M0 0C-10-16-34-15-32 0C-34 15-10 16 0 0Z"/><path d="M0 0C10-16 34-15 32 0C34 15 10 16 0 0Z"/><path d="M-3 4-16 40l7-3 4 8 7-37M3 4l13 36-7-3-4 8-7-37"/></g>`;
  }
  o += `</g>`;
  svg.innerHTML = o;
}

const SUMMIT = `<span class="summit">${icon('mountain')}</span>`;
document.querySelectorAll('.steps').forEach((st) => st.insertAdjacentHTML('beforeend', SUMMIT));
document.querySelectorAll('svg.wreath').forEach(drawWreath);
drawGarland();
drawRange();
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawGarland, 150); });
