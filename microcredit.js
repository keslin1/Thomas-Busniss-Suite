/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — microcredit.js
   Kont Epay · La Sûreté Micro Crédit HTG
   ══════════════════════════════════════════════ */

const MC_KEY  = 'tbs_microcredit';
const MC_RATE = 135; // 135 HTG = $1 USD
let mcCurrentType = 'depo';
let mcCardFlipped = false;

/* ── Card Flip ──────────────────────────────── */
function toggleCardFlip() {
  mcCardFlipped = !mcCardFlipped;
  const wrapper = document.getElementById('livretFlipWrapper');
  if (wrapper) wrapper.classList.toggle('flipped', mcCardFlipped);
}

/* ── Storage ────────────────────────────────── */
function getMCData() {
  try { return JSON.parse(localStorage.getItem(MC_KEY)) || { transactions: [] }; }
  catch { return { transactions: [] }; }
}

function saveMCData(data) {
  localStorage.setItem(MC_KEY, JSON.stringify(data));
}

/* ── Running Balance ────────────────────────── */
function recalcBalances(txns) {
  let running = 0;
  return txns.map(t => {
    if (t.type === 'depo') running += t.amount;
    else running -= t.amount;
    return { ...t, balance: running };
  });
}

function getCurrentBalance() {
  const data = getMCData();
  if (data.transactions.length === 0) return 0;
  const recalc = recalcBalances(data.transactions);
  return recalc[recalc.length - 1].balance;
}

/* ── Utils date ─────────────────────────────── */
function mcFmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mcDateInputToTs(val) {
  if (!val) return Date.now();
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

function mcTsToDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── Render ─────────────────────────────────── */
function renderMCHistory() {
  const data = getMCData();
  const txns = recalcBalances(data.transactions);
  const balance = txns.length > 0 ? txns[txns.length - 1].balance : 0;

  const balEl = document.getElementById('mcBalance');
  const usdEl = document.getElementById('mcBalanceUSD');
  if (balEl) balEl.textContent = balance.toLocaleString('fr-HT') + ' HTG';
  if (usdEl) usdEl.textContent = '≈ $' + (balance / MC_RATE).toFixed(2) + ' USD';

  // Bouton reçu PDF si multiple de 15
  const pdfBtn = document.getElementById('mcReceiptBtn');
  if (pdfBtn) {
    if (txns.length > 0 && txns.length % 15 === 0) {
      pdfBtn.classList.remove('hidden');
    } else {
      pdfBtn.classList.add('hidden');
    }
  }

  const el = document.getElementById('mcHistoryList');
  if (!el) return;

  if (txns.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:0.85rem;">Okenn tranzaksyon.<br>Kòmanse ak yon depo!</div>`;
    return;
  }

  const reversed = [...txns].reverse();
  el.innerHTML = reversed.map(t => {
    const sign = t.type === 'depo' ? '+' : '−';
    const icon = t.type === 'depo' ? '↑' : '↓';
    return `
      <div class="mc-item">
        <div class="mc-type-badge ${t.type}">${icon}</div>
        <div class="mc-item-info">
          <div class="mc-item-note">${escHtml(t.note || (t.type === 'depo' ? 'Depo' : 'Retrè'))}</div>
          <div class="mc-item-date">${mcFmtDate(t.txDate || t.date)}</div>
        </div>
        <div class="mc-item-amounts">
          <div class="mc-item-amount ${t.type}">${sign}${t.amount.toLocaleString('fr-HT')} HTG</div>
          <div class="mc-item-balance">Balans: ${t.balance.toLocaleString('fr-HT')}</div>
        </div>
        <div class="mc-item-actions">
          <button onclick="openMCEdit('${t.id}')">✏️</button>
          <button onclick="deleteMCTxn('${t.id}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── Form ───────────────────────────────────── */
function openMCForm(type) {
  mcCurrentType = type;
  document.getElementById('mcFormTitle').textContent = type === 'depo' ? '+ Depo' : '− Retrè';
  document.getElementById('mcAmount').value  = '';
  document.getElementById('mcNote').value    = '';
  document.getElementById('mcTxDate').value  = mcTsToDateInput(Date.now());
  document.getElementById('mcRatePreview').textContent = '≈ $0.00';
  document.getElementById('mcFormOverlay').classList.remove('hidden');
}

function closeMCForm() {
  document.getElementById('mcFormOverlay').classList.add('hidden');
}

function previewMCRate() {
  const amt = parseFloat(document.getElementById('mcAmount').value) || 0;
  document.getElementById('mcRatePreview').textContent = '≈ $' + (amt / MC_RATE).toFixed(2);
}

function saveMCTxn() {
  const amount  = parseFloat(document.getElementById('mcAmount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const note    = document.getElementById('mcNote').value.trim();
  const dateVal = document.getElementById('mcTxDate').value;
  const txDate  = mcDateInputToTs(dateVal);

  if (mcCurrentType === 'retrè') {
    if (amount > getCurrentBalance()) { showToast('⚠️ Balans ensifizan'); return; }
  }

  const data = getMCData();
  data.transactions.push({
    id: uid(),
    type: mcCurrentType,
    amount,
    note,
    txDate,
    date: Date.now(),
  });
  saveMCData(data);
  closeMCForm();
  renderMCHistory();
  showToast(mcCurrentType === 'depo' ? '✅ Depo anrejistre' : '✅ Retrè anrejistre');

  // Proposer PDF automatiquement si multiple de 15
  const count = data.transactions.length;
  if (count > 0 && count % 15 === 0) {
    setTimeout(() => {
      if (confirm(`✅ ${count} tranzaksyon fèt!\nTélécharger reçu PDF pou 15 dènye?`)) {
        generateMCReceiptPDF();
      }
    }, 400);
  }
}

/* ── Edit ───────────────────────────────────── */
function openMCEdit(id) {
  const data = getMCData();
  const t = data.transactions.find(x => x.id === id);
  if (!t) return;
  document.getElementById('mcEditId').value     = id;
  document.getElementById('mcEditType').value   = t.type;
  document.getElementById('mcEditAmount').value = t.amount;
  document.getElementById('mcEditNote').value   = t.note || '';
  document.getElementById('mcEditTxDate').value = mcTsToDateInput(t.txDate || t.date);
  document.getElementById('mcEditRatePreview').textContent = '≈ $' + (t.amount / MC_RATE).toFixed(2);
  document.getElementById('mcEditOverlay').classList.remove('hidden');
}

function closeMCEdit() {
  document.getElementById('mcEditOverlay').classList.add('hidden');
}

function previewMCEditRate() {
  const amt = parseFloat(document.getElementById('mcEditAmount').value) || 0;
  document.getElementById('mcEditRatePreview').textContent = '≈ $' + (amt / MC_RATE).toFixed(2);
}

function updateMCTxn() {
  const id     = document.getElementById('mcEditId').value;
  const amount = parseFloat(document.getElementById('mcEditAmount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const note    = document.getElementById('mcEditNote').value.trim();
  const dateVal = document.getElementById('mcEditTxDate').value;
  const txDate  = mcDateInputToTs(dateVal);

  const data = getMCData();
  const idx  = data.transactions.findIndex(x => x.id === id);
  if (idx === -1) return;
  data.transactions[idx].amount = amount;
  data.transactions[idx].note   = note;
  data.transactions[idx].txDate = txDate;
  saveMCData(data);
  closeMCEdit();
  renderMCHistory();
  showToast('✅ Modifikasyon anrejistre');
}

/* ── Delete ─────────────────────────────────── */
function deleteMCTxn(id) {
  if (!confirm('Efase tranzaksyon sa a?')) return;
  const data = getMCData();
  data.transactions = data.transactions.filter(x => x.id !== id);
  saveMCData(data);
  renderMCHistory();
  showToast('🗑️ Tranzaksyon efase');
}

/* ── PDF Receipt (15 transactions) ─────────── */
function generateMCReceiptPDF() {
  const data = getMCData();
  if (data.transactions.length === 0) { showToast('Okenn tranzaksyon'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  // Couleurs
  const gR = 22, gG = 101, gB = 52;   // vert
  const oR = 180, oG = 140, oB = 30;  // or

  // Prendre les 15 dernières transactions (dans l'ordre chronologique)
  const txns = recalcBalances(data.transactions);
  const last15 = txns.slice(-15);

  /* ─── En-tête ─────────────────────────────── */
  doc.setFillColor(gR, gG, gB);
  doc.rect(0, 0, pw, 40, 'F');
  doc.setFillColor(oR, oG, oB);
  doc.rect(0, 39, pw, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LA SÛRETÉ MICRO CRÉDIT', pw / 2, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Champlois (Tèt timòn) — Camp-Perrin', pw / 2, 19, { align: 'center' });
  doc.text('(509) 4737-9586  ·  3117-0735  ·  4924-2583', pw / 2, 25, { align: 'center' });

  const dateTxt = 'Dat: ' + new Date().toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(dateTxt, pw / 2, 32, { align: 'center' });

  let y = 50;

  /* ─── Infos membre (carnet 0612) ───────────── */
  doc.setFillColor(240, 248, 242);
  doc.rect(10, y - 5, pw - 20, 34, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('ENFÒMASYON MANM — Karnet #0612', 14, y);
  y += 6;

  const memberInfo = [
    ['Non',         'Keslin'],
    ['Siyati',      'Benoit'],
    ['Dat li fèt',  '12-05-2002'],
    ['Kote li fèt', 'Sud, Camp-Perrin'],
    ['Kote li rete','Guillaume'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  memberInfo.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text(k + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(v, 55, y);
    y += 5.5;
  });

  y += 4;
  doc.setDrawColor(oR, oG, oB);
  doc.setLineWidth(0.4);
  doc.line(10, y, pw - 10, y);
  y += 7;

  /* ─── Tableau 15 transactions ──────────────── */
  doc.setFillColor(228, 244, 233);
  doc.rect(10, y - 4.5, pw - 20, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('Dat', 12, y);
  doc.text('Deskripsyon', 35, y);
  doc.text('Montan (HTG)', pw - 12, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let totalDepo = 0, totalRetre = 0;

  last15.forEach((t, i) => {
    if (y > ph - 50) { doc.addPage(); y = 20; }

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 250);
    doc.rect(10, y - 3.5, pw - 20, 7, 'F');

    doc.setTextColor(50, 50, 50);
    doc.text(mcFmtDate(t.txDate || t.date), 12, y);

    const noteTxt = (t.note || (t.type === 'depo' ? 'Depo' : 'Retrè')).substring(0, 30);
    doc.text(noteTxt, 35, y);

    const sign = t.type === 'depo' ? '+' : '−';
    doc.setTextColor(t.type === 'depo' ? gR : 180, t.type === 'depo' ? gG : 30, t.type === 'depo' ? gB : 30);
    doc.text(sign + t.amount.toLocaleString('fr-HT'), pw - 12, y, { align: 'right' });

    if (t.type === 'depo')  totalDepo  += t.amount;
    else                    totalRetre += t.amount;

    y += 7;
  });

  // Totaux
  y += 2;
  doc.setFillColor(220, 240, 226);
  doc.rect(10, y - 4, pw - 20, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('Total depo:', 12, y);
  doc.text('+' + totalDepo.toLocaleString('fr-HT') + ' HTG', pw - 12, y, { align: 'right' });
  y += 8;

  doc.setFillColor(250, 235, 232);
  doc.rect(10, y - 4, pw - 20, 8, 'F');
  doc.setTextColor(180, 30, 30);
  doc.text('Total retrè:', 12, y);
  doc.text('−' + totalRetre.toLocaleString('fr-HT') + ' HTG', pw - 12, y, { align: 'right' });
  y += 10;

  // Solde final
  const finalBal = last15[last15.length - 1]?.balance || 0;
  doc.setFillColor(gR, gG, gB);
  doc.rect(10, y - 4, pw - 20, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('BALANS FINAL', 12, y);
  doc.text(finalBal.toLocaleString('fr-HT') + ' HTG', pw - 12, y, { align: 'right' });
  y += 14;

  /* ─── Signature Responsab ──────────────────── */
  doc.setDrawColor(oR, oG, oB);
  doc.setLineWidth(0.35);
  doc.line(10, y, pw - 10, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Siyati Responsab:', 10, y);
  y += 8;
  // Ligne pour signature manuelle
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(40, y, pw - 20, y);

  // Pied de page
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('La Sûreté Micro Crédit · Champlois, Camp-Perrin · (509) 4737-9586', pw / 2, ph - 6, { align: 'center' });

  const fname = 'LaSurete-Recu-' + Date.now() + '.pdf';
  doc.save(fname);
  showToast('📄 Reçu PDF téléchargé');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
