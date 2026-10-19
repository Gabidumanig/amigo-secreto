// Amigo Secreto & Oficina de Guirlandas - API da planilha
// Cole este codigo em Extensoes > Apps Script da sua planilha Google.
const ABA = 'Respostas';
const CABECALHO = ['chave', 'Nome', 'Opção 1', 'Opção 2', 'Opção 3', 'Outra sugestão', 'Vai levar', 'Atualizado em', 'Sobre ela'];
const COLS = CABECALHO.length;
const LIMITE = 60;

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(ABA);
  if (!s) {
    s = ss.insertSheet(ABA);
    s.appendRow(CABECALHO);
    s.setFrozenRows(1);
    s.hideColumns(1);
  }
  if (s.getLastColumn() < COLS) s.getRange(1, COLS).setValue(CABECALHO[COLS - 1]);
  return s;
}
function chave_(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function limpa_(v, max) {
  let t = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(t)) t = "'" + t; // evita fórmulas
  return t;
}
function linhas_() {
  const s = aba_();
  const n = s.getLastRow();
  if (n < 2) return [];
  const v = s.getRange(1, 1, n, COLS).getValues();
  v.shift();
  return v.filter(function (r) { return r[0]; }).map(function (r) {
    return {
      nome: String(r[1]),
      opcoes: [r[2], r[3], r[4]].map(String).filter(function (x) { return x; }),
      desejo: String(r[5] || ''),
      levar: String(r[6] || ''),
      sobre: String(r[8] || ''),
    };
  });
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'get') {
    const k = chave_(p.nome);
    const r = linhas_().filter(function (x) { return chave_(x.nome) === k; })[0];
    return json_(r ? { ok: true, data: r } : { ok: false, status: 404 });
  }
  const todas = linhas_().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }); });
  return json_({ ok: true, data: todas });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const nome = String(d.nome || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!nome) return json_({ ok: false, status: 400 });
    const k = chave_(nome);
    const s = aba_();
    const vals = s.getRange(1, 1, Math.max(s.getLastRow(), 1), COLS).getValues();
    let row = -1;
    for (let i = 1; i < vals.length; i++) if (vals[i][0] === k) { row = i + 1; break; }
    if (row === -1) {
      if (vals.length - 1 >= LIMITE) return json_({ ok: false, status: 429 });
      s.appendRow([k, limpa_(nome, 60), '', '', '', '', '', new Date(), '']);
      row = s.getLastRow();
    }
    const atual = s.getRange(row, 1, 1, COLS).getValues()[0];
    atual[1] = limpa_(nome, 60);
    if (Array.isArray(d.opcoes)) {
      const o = d.opcoes.slice(0, 3);
      for (let j = 0; j < 3; j++) atual[2 + j] = limpa_(o[j] || '', 80);
    }
    if (typeof d.desejo === 'string') atual[5] = limpa_(d.desejo, 600);
    if (typeof d.levar === 'string') atual[6] = limpa_(d.levar, 400);
    if (typeof d.sobre === 'string') atual[8] = limpa_(d.sobre, 800);
    atual[7] = new Date();
    s.getRange(row, 1, 1, COLS).setValues([atual]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
