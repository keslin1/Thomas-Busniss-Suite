/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — microcredit.js  v2
   Kont Epay · La Sûreté Micro Crédit HTG
   ══════════════════════════════════════════════

   NOUVÈLTÈ v2 :
   • PDF téléchargeable à partir de ≥15 transactions
   • Sélection précise du nombre de transactions
   • Chaque téléchargement commence après le dernier
     téléchargé (curseur mcLastExportIdx)
   ══════════════════════════════════════════════ */

const MC_KEY         = 'tbs_microcredit';
const MC_EXPORT_KEY  = 'tbs_mc_last_export_idx'; // index de la dernière transaction exportée
const MC_RATE        = 135; // 135 HTG = $1 USD
let mcCurrentType    = 'depo';
let mcCardFlipped    = false;

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

/* ── Export cursor ──────────────────────────── */
function getMCLastExportIdx() {
  return parseInt(localStorage.getItem(MC_EXPORT_KEY) || '-1');
}

function setMCLastExportIdx(idx) {
  localStorage.setItem(MC_EXPORT_KEY, String(idx));
}

/* ── Running Balance ────────────────────────── */
function recalcBalances(txns) {
  let running = 0;
  return txns.map(t => {
    if (t.type === 'depo') running += t.amount;
    else                   running -= t.amount; // 'retrè' et 'pret' sont des débits
    return { ...t, balance: running };
  });
}

/* Retourne true si un prêt non régularisé est encore actif */
function _mcHasActiveLoan(txns) {
  if (txns.length === 0) return false;
  const lastBal = txns[txns.length - 1].balance;
  if (lastBal < 0) return true;
  // Parcours inverse : 'pret' trouvé avant un dépôt qui ramène solde >= 0 = prêt actif
  for (let i = txns.length - 1; i >= 0; i--) {
    if (txns[i].type === 'pret') return true;
    if (txns[i].type === 'depo' && txns[i].balance >= 0) return false;
  }
  return false;
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
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ── Render ─────────────────────────────────── */
function renderMCHistory() {
  const data  = getMCData();
  const txns  = recalcBalances(data.transactions);
  const balance = txns.length > 0 ? txns[txns.length - 1].balance : 0;

  const balEl = document.getElementById('mcBalance');
  const usdEl = document.getElementById('mcBalanceUSD');
  if (balEl) balEl.textContent = fmtHTG(balance) + ' HTG';
  if (usdEl) usdEl.textContent = '≈ $' + (balance / MC_RATE).toFixed(2) + ' USD';

  /* ── Bouton PDF : toujours visible, actif si ≥15 transactions disponibles ── */
  const lastExport  = getMCLastExportIdx();
  const available   = txns.length - (lastExport + 1);
  const pdfBtn      = document.getElementById('mcReceiptBtn');
  const pdfCountEl  = document.getElementById('mcReceiptCount');

  if (pdfBtn) {
    pdfBtn.classList.remove('hidden');
    pdfBtn.style.opacity = available > 0 ? '1' : '0.45';
    pdfBtn.style.pointerEvents = available > 0 ? 'auto' : 'none';
    if (pdfCountEl) {
      pdfCountEl.textContent = available > 0 ? available + ' disponib' : 'Tout ekspòte';
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
    const isPret  = t.type === 'pret';
    const isDepo  = t.type === 'depo';
    const sign    = isDepo ? '+' : '−';
    const icon    = isDepo ? '↑' : (isPret ? '⚑' : '↓');
    const badgeCls = isDepo ? 'depo' : (isPret ? 'pret' : 'retrè');
    const defaultLabel = isDepo ? 'Depo' : (isPret ? 'Prè' : 'Retrè');
    const amtColor = isDepo ? 'depo' : (isPret ? 'pret' : 'retrè');
    return `
      <div class="mc-item">
        <div class="mc-type-badge ${badgeCls}">${icon}</div>
        <div class="mc-item-info">
          <div class="mc-item-note">${escHtml(t.note || defaultLabel)}</div>
          <div class="mc-item-date">${mcFmtDate(t.txDate || t.date)}</div>
        </div>
        <div class="mc-item-amounts">
          <div class="mc-item-amount ${amtColor}">${sign}${fmtHTG(t.amount)} HTG</div>
          <div class="mc-item-balance">Balans: ${fmtHTG(t.balance)}</div>
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
  const noteRaw = document.getElementById('mcNote').value.trim();
  const dateVal = document.getElementById('mcTxDate').value;
  const txDate  = mcDateInputToTs(dateVal);

  /* ── Détection automatique du Prêt ────────────────────────────────────
     Si c'est un Retrè mais que le montant dépasse le solde actuel,
     on l'enregistre comme un Prêt (type 'pret') sans bloquer. */
  let finalType = mcCurrentType;
  let note      = noteRaw;
  if (mcCurrentType === 'retrè' && amount > getCurrentBalance()) {
    finalType = 'pret';
    if (!note) note = 'Prè';
    showToast('ℹ️ Montan depase balans — anrejistre kòm Prè');
  }

  const data = getMCData();
  data.transactions.push({
    id: uid(),
    type: finalType,
    amount,
    note,
    txDate,
    date: Date.now(),
  });
  saveMCData(data);
  closeMCForm();
  renderMCHistory();
  renderMCGrowthChart();
  if (finalType === 'depo')   showToast('✅ Depo anrejistre');
  else if (finalType === 'pret') showToast('✅ Prè anrejistre');
  else                           showToast('✅ Retrè anrejistre');
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

/* ══════════════════════════════════════════════
   PDF RECEIPT — SÉLECTION FLEXIBLE
   ══════════════════════════════════════════════
   Logique :
   - Les transactions sont indexées 0..N-1
   - getMCLastExportIdx() retourne le dernier index exporté (-1 si jamais)
   - Un export commence à lastExportIdx + 1
   - L'utilisateur choisit combien en exporter (≥15)
   - Après export, le curseur est mis à jour
   ══════════════════════════════════════════════ */

/* Ouvrir le dialogue de sélection */
function openMCPdfDialog() {
  const data       = getMCData();
  const txns       = recalcBalances(data.transactions);
  const lastExport = getMCLastExportIdx();
  const startIdx   = lastExport + 1;
  const available  = txns.length - startIdx;

  if (available < 1) {
    showToast('⚠️ Okenn tranzaksyon disponib pou ekspòte');
    return;
  }

  const dialog = document.getElementById('mcPdfDialogOverlay');
  if (!dialog) {
    /* Créer le dialogue dynamiquement si absent du HTML */
    _buildMCPdfDialog(available, startIdx);
    return;
  }

  /* Mettre à jour les infos du dialogue existant */
  const maxEl = document.getElementById('mcPdfMaxCount');
  const inEl  = document.getElementById('mcPdfCountInput');
  if (maxEl) maxEl.textContent = available;
  if (inEl) {
    inEl.min   = 1;
    inEl.max   = available;
    inEl.value = available; // proposer le maximum par défaut
  }
  dialog.classList.remove('hidden');
}

function closeMCPdfDialog() {
  const dialog = document.getElementById('mcPdfDialogOverlay');
  if (dialog) dialog.classList.add('hidden');
}

/* Construire le dialogue dynamiquement */
function _buildMCPdfDialog(available, startIdx) {
  const existing = document.getElementById('mcPdfDialogOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'mcPdfDialogOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  overlay.innerHTML = `
    <div style="background:#1a2018;border-radius:16px;padding:24px;width:100%;max-width:320px;border:1px solid rgba(80,160,60,0.3);">
      <div style="font-size:1rem;font-weight:700;color:#e8f5e0;margin-bottom:6px;">📄 Télécharger reçu PDF</div>
      <div style="font-size:0.8rem;color:#8fbc70;margin-bottom:16px;">
        <span id="mcPdfMaxCount">${available}</span> tranzaksyon disponib (apre dènye ekspòtasyon)
      </div>
      <label style="display:block;font-size:0.75rem;color:#9ab88a;margin-bottom:6px;">
        Konbyen tranzaksyon pou ekspòte ?
      </label>
      <input id="mcPdfCountInput" type="number" min="1" max="${available}" value="${available}"
        style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(80,160,60,0.4);
               background:#0f1a0d;color:#e8f5e0;font-size:1rem;box-sizing:border-box;margin-bottom:16px;" />
      <div style="display:flex;gap:10px;">
        <button onclick="closeMCPdfDialog()" 
          style="flex:1;padding:10px;border-radius:8px;background:transparent;
                 border:1px solid rgba(255,255,255,0.15);color:#888;cursor:pointer;">
          Anile
        </button>
        <button onclick="confirmMCPdfExport()"
          style="flex:2;padding:10px;border-radius:8px;
                 background:linear-gradient(135deg,#226614,#2d8020);
                 border:none;color:white;font-weight:700;cursor:pointer;">
          Télécharger PDF
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/* Confirmer et lancer l'export */
function confirmMCPdfExport() {
  const data       = getMCData();
  const txns       = recalcBalances(data.transactions);
  const lastExport = getMCLastExportIdx();
  const startIdx   = lastExport + 1;
  const available  = txns.length - startIdx;

  const countInput = document.getElementById('mcPdfCountInput');
  let count = parseInt(countInput?.value || available);

  if (isNaN(count) || count < 1) {
    showToast('⚠️ Minimòm 1 tranzaksyon obligatwa');
    return;
  }
  if (count > available) count = available;

  /* Slice : de startIdx jusqu'à startIdx + count */
  const slice    = txns.slice(startIdx, startIdx + count);
  const endIdx   = startIdx + count - 1;

  closeMCPdfDialog();
  generateMCReceiptPDF(slice);

  /* Mettre à jour le curseur */
  setMCLastExportIdx(endIdx);
  renderMCHistory();
  showToast('📄 Reçu #' + (startIdx + 1) + '–' + (endIdx + 1) + ' téléchargé');
}

/* Ancien point d'entrée (rétrocompat) — redirige vers le dialogue */
function generateMCReceiptPDF(sliceArg) {
  /* Si appelé sans argument = ouverture dialogue */
  if (!sliceArg) {
    openMCPdfDialog();
    return;
  }

  const txnsToExport = sliceArg;
  if (!txnsToExport || txnsToExport.length === 0) {
    showToast('Okenn tranzaksyon pou ekspòte');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  const gR = 22,  gG = 101, gB = 52;   // vert
  const oR = 180, oG = 140, oB = 30;   // or

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
  doc.text('(509) 4737-9586  ·  3117-0735  ·  4924-2583',  pw / 2, 25, { align: 'center' });

  const periodStart = mcFmtDate(txnsToExport[0]?.txDate || txnsToExport[0]?.date);
  const periodEnd   = mcFmtDate(txnsToExport[txnsToExport.length - 1]?.txDate || txnsToExport[txnsToExport.length - 1]?.date);
  doc.text('Peryòd: ' + periodStart + ' — ' + periodEnd, pw / 2, 32, { align: 'center' });

  let y = 50;

  /* ─── Infos membre ─────────────────────────── */
  doc.setFillColor(240, 248, 242);
  doc.rect(10, y - 5, pw - 20, 34, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('ENFÒMASYON MANM — Kanè #0612', 14, y);
  y += 6;

  const memberInfo = [
    ['Non',          'Keslin'],
    ['Siyati',       'Benoit'],
    ['Dat li fèt',   '12-05-2002'],
    ['Kote li fèt',  'Sud, Camp-Perrin'],
    ['Kote li rete', 'Guillaume'],
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

  /* ─── En-tête tableau ──────────────────────── */
  doc.setFillColor(228, 244, 233);
  doc.rect(10, y - 4.5, pw - 20, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('Dat',              12, y);
  doc.text('Deskripsyon',      35, y);
  doc.text('Montan (HTG)', pw - 12, y, { align: 'right' });
  y += 6;

  /* ─── Lignes ───────────────────────────────── */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let totalDepo = 0, totalRetre = 0;

  /* Espace requis en bas de page pour les totaux + solde + signature + footer */
  const FOOTER_HEIGHT = 60;

  /* Helper : imprimer l'en-tête de tableau sur une nouvelle page */
  const _printTableHeader = () => {
    doc.setFillColor(228, 244, 233);
    doc.rect(10, y - 4.5, pw - 20, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gR, gG, gB);
    doc.text('Dat',              12, y);
    doc.text('Deskripsyon',      35, y);
    doc.text('Montan (HTG)', pw - 12, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    y += 6;
  };

  txnsToExport.forEach((t, i) => {
    /* Saut de page si plus assez d'espace (lignes + pied) */
    if (y > ph - FOOTER_HEIGHT) {
      /* Pied de page numéroté sur chaque page intermédiaire */
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('La Sûreté Micro Crédit · Champlois, Camp-Perrin · (509) 4737-9586', pw / 2, ph - 6, { align: 'center' });
      doc.addPage();
      y = 20;
      _printTableHeader();
    }
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 252, i % 2 === 0 ? 255 : 250);
    doc.rect(10, y - 3.5, pw - 20, 7, 'F');
    doc.setTextColor(50, 50, 50);
    doc.text(mcFmtDate(t.txDate || t.date), 12, y);
    const isPret  = t.type === 'pret';
    const isDepo  = t.type === 'depo';
    const defaultLabel = isDepo ? 'Depo' : (isPret ? 'Prè' : 'Retrè');
    const noteTxt = (t.note || defaultLabel).substring(0, 30);
    doc.text(noteTxt, 35, y);
    const sign = isDepo ? '+' : '−';
    /* Couleur montant : vert=dépôt, jaune=prêt, rouge=retrait */
    if (isDepo)       doc.setTextColor(gR, gG, gB);
    else if (isPret)  doc.setTextColor(180, 140, 10);
    else              doc.setTextColor(180, 30, 30);
    doc.text(sign + fmtHTG(t.amount), pw - 12, y, { align: 'right' });
    if (isDepo)  totalDepo  += t.amount;
    else         totalRetre += t.amount;
    y += 7;
  });

  /* ─── Totaux (avec saut de page si nécessaire) ─── */
  y += 2;
  if (y > ph - 55) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('La Sûreté Micro Crédit · Champlois, Camp-Perrin · (509) 4737-9586', pw / 2, ph - 6, { align: 'center' });
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(220, 240, 226);
  doc.rect(10, y - 4, pw - 20, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gR, gG, gB);
  doc.text('Total depo:', 12, y);
  doc.text('+' + fmtHTG(totalDepo) + ' HTG', pw - 12, y, { align: 'right' });
  y += 8;

  doc.setFillColor(250, 235, 232);
  doc.rect(10, y - 4, pw - 20, 8, 'F');
  doc.setTextColor(180, 30, 30);
  doc.text('Total retrè:', 12, y);
  doc.text('−' + fmtHTG(totalRetre) + ' HTG', pw - 12, y, { align: 'right' });
  y += 10;

  /* ─── Solde final du batch ─────────────────── */
  const finalBal = txnsToExport[txnsToExport.length - 1]?.balance || 0;
  doc.setFillColor(gR, gG, gB);
  doc.rect(10, y - 4, pw - 20, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('BALANS FINAL', 12, y);
  doc.text(fmtHTG(finalBal) + ' HTG', pw - 12, y, { align: 'right' });
  y += 14;

  /* ─── Signature ────────────────────────────── */
  doc.setDrawColor(oR, oG, oB);
  doc.setLineWidth(0.35);
  doc.line(10, y, pw - 10, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Siyati Responsab:', 10, y);
  y += 8;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(40, y, pw - 20, y);

  /* ─── Pied de page ─────────────────────────── */
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('La Sûreté Micro Crédit · Champlois, Camp-Perrin · (509) 4737-9586', pw / 2, ph - 6, { align: 'center' });

  const fname = 'LaSurete-Recu-' + Date.now() + '.pdf';
  doc.save(fname);
}

/* ══════════════════════════════════════════════
   COURBE DE CROISSANCE DYNAMIQUE  v2
   ══════════════════════════════════════════════
   Règles couleur (spécification révisée) :
   🟢 Vert   : dernier dépôt < 4 jours
   🟡 Jaune  : inactivité 8 à 14 jours
   🔴 Rouge  : inactivité > 17 jours
   (entre 4–7j et 15–17j : transition douce)

   Automatisme de descente :
   La courbe décroît automatiquement si aucun dépôt
   n'est enregistré depuis plus de 7 jours (-3%/j).
   ══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   COURBE DE CROISSANCE DYNAMIQUE  v3
   ══════════════════════════════════════════════
   Design : Fond blanc (#FFFFFF), axes/textes noir (#000000)
   Filtre : 1 mois, 2 mois, 12 mois
   Couleur courbe dynamique selon inactivité :
   🟢 Vert   : dernier dépôt < 4 jours
   🟡 Jaune  : inactivité 4 à 7 jours
   🔴 Rouge  : inactivité > 7 jours
   Descente simulée : -3%/jour si inactivité > 7j
   ══════════════════════════════════════════════ */

/* Période active (en mois) — modifiée par le sélecteur */
let mcChartPeriodMonths = 1;

/* Couleur d'un segment selon la nature de la transaction :
   🟢 Vert   = croissance (dépôt)
   🔴 Rouge  = baisse (retrait classique)
   🟡 Jaune  = prêt en cours ou transaction après prêt non régularisé */
function _mcSegmentColor(type, loanActive) {
  if (loanActive) return '#ca8a04'; // 🟡 Jaune tant que prêt actif
  if (type === 'depo')  return '#16a34a'; // 🟢 Vert
  return '#dc2626';                        // 🔴 Rouge
}

function _mcStatusText(txns) {
  if (!txns || txns.length === 0) return { text: '— Okenn done', color: '#888' };
  const hasLoan = _mcHasActiveLoan(txns);
  if (hasLoan) return { text: '⚑ Prè aktif — règleman an atant', color: '#ca8a04' };
  // Statut basé sur le solde courant vs. sommet maximal
  const maxBal  = Math.max(...txns.map(t => t.balance));
  const lastBal = txns[txns.length - 1].balance;
  const pct     = maxBal > 0 ? ((lastBal - maxBal) / maxBal * 100).toFixed(1) : 0;
  if (lastBal >= maxBal) return { text: '● Nou nan somè a — nouvo rekò balans', color: '#16a34a' };
  if (parseFloat(pct) >= -10) return { text: `⚠ Prè somè: ${pct}% — balans bon`, color: '#16a34a' };
  if (parseFloat(pct) >= -30) return { text: `⚠ Balans bès ${pct}% depi somè a`, color: '#d97706' };
  return { text: `🔴 Balans bès ${pct}% depi somè a — aksyon rekiz`, color: '#dc2626' };
}

/* ── Sélecteur de période ──────────────────────
   Injecte les boutons-filtre au-dessus du canvas
   si pas encore présents, puis redessine le chart.
   ──────────────────────────────────────────── */
function _mcEnsurePeriodSelector() {
  if (document.getElementById('mcPeriodSelector')) return;

  const wrap = document.querySelector('.mc-chart-canvas-wrap');
  if (!wrap) return;

  const bar = document.createElement('div');
  bar.id = 'mcPeriodSelector';
  bar.style.cssText = `
    display:flex; gap:6px; justify-content:flex-end;
    padding: 4px 0 10px 0;
  `;

  const periods = [
    { label: '1 mwa',   months: 1  },
    { label: '2 mwa',   months: 2  },
    { label: '12 mwa',  months: 12 },
  ];

  periods.forEach(p => {
    const btn = document.createElement('button');
    btn.textContent  = p.label;
    btn.dataset.months = p.months;
    btn.style.cssText = `
      padding:4px 11px; border-radius:20px; border:1px solid #bbb;
      background: ${p.months === mcChartPeriodMonths ? '#111' : '#f5f5f5'};
      color:       ${p.months === mcChartPeriodMonths ? '#fff' : '#333'};
      font-size:0.72rem; font-weight:600; cursor:pointer;
      font-family:'Rajdhani',sans-serif; transition:all 0.15s;
    `;
    btn.addEventListener('click', () => {
      mcChartPeriodMonths = p.months;
      /* Mettre à jour le style de tous les boutons */
      bar.querySelectorAll('button').forEach(b => {
        const active = parseInt(b.dataset.months) === mcChartPeriodMonths;
        b.style.background = active ? '#111' : '#f5f5f5';
        b.style.color       = active ? '#fff' : '#333';
      });
      renderMCGrowthChart();
    });
    bar.appendChild(btn);
  });

  /* Insérer avant le canvas */
  wrap.insertBefore(bar, wrap.firstChild);
}

/* ── Appliquer le style "fond blanc" au conteneur canvas ── */
function _mcStyleChartWrap() {
  const wrap = document.querySelector('.mc-chart-canvas-wrap');
  if (!wrap) return;
  wrap.style.background    = '#ffffff';
  wrap.style.borderRadius  = '10px';
  wrap.style.padding       = '12px 8px 8px 8px';
  wrap.style.border        = '1px solid #e5e7eb';
}

function renderMCGrowthChart() {
  _mcStyleChartWrap();
  _mcEnsurePeriodSelector();

  const canvas = document.getElementById('mcGrowthChart');
  if (!canvas) return;

  const data = getMCData();
  const txns = recalcBalances(data.transactions);

  /* ── État vide ── */
  if (txns.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const infoEl = document.getElementById('mcActivityStatus');
    if (infoEl) { infoEl.textContent = '— Okenn depo ankò'; infoEl.style.color = '#888'; }
    return;
  }

  /* ── Statut global ─── */
  const now        = Date.now();
  const statusInfo = _mcStatusText(txns);

  /* ── Fenêtre temporelle selon période choisie ─ */
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - mcChartPeriodMonths);
  windowStart.setHours(0, 0, 0, 0);

  /* ── Construire les points : regrouper par jour ─ */
  const byDay = {};
  txns.forEach(t => {
    const ts = t.txDate || t.date;
    if (ts < windowStart.getTime()) return; // hors fenêtre
    const d  = new Date(ts);
    const dk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    byDay[dk] = t.balance;
  });

  /* Ajouter le solde au début de la fenêtre (interpolé depuis les txns antérieures) */
  const windowKey = windowStart.getFullYear() + '-' +
    String(windowStart.getMonth()+1).padStart(2,'0') + '-' +
    String(windowStart.getDate()).padStart(2,'0');

  /* Trouver le dernier solde avant la fenêtre */
  const beforeWindow = txns.filter(t => (t.txDate || t.date) < windowStart.getTime());
  if (beforeWindow.length > 0 && !byDay[windowKey]) {
    byDay[windowKey] = beforeWindow[beforeWindow.length - 1].balance;
  }

  let points = Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b));

  /* Simulation de descente supprimée — le graphique reflète uniquement
     les vraies transactions enregistrées. */

  if (points.length === 0) {
    /* Aucune donnée dans la fenêtre */
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '13px Rajdhani, sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('Okenn done nan peryòd sa a', canvas.offsetWidth / 2, 80);
    return;
  }

  /* ── Formater les labels (axe X) ─────────────── */
  const fmtLabel = (dk) => {
    const [, m, d] = dk.split('-');
    if (mcChartPeriodMonths <= 2) return d + '/' + m;        // JJ/MM
    return m + '/' + dk.slice(0, 4).slice(2);               // MM/AA
  };

  const labels = points.map(([dk]) => fmtLabel(dk));
  const values = points.map(([, v]) => v);

  /* ── Dates complètes pour le tooltip ─────────── */
  const fullDates = points.map(([dk]) => {
    const [y, m, d] = dk.split('-');
    return d + '/' + m + '/' + y;
  });

  /* ── Détruire l'instance Chart.js précédente ─ */
  if (canvas._mcChart) {
    canvas._mcChart.destroy();
    canvas._mcChart = null;
  }

  /* ── Couleurs par segment (vert/rouge/jaune) ───────────────────────
     On construit un tableau de couleurs de points en suivant l'état
     du prêt : dès qu'un 'pret' apparaît, on passe en jaune ; on reste
     jaune jusqu'à ce que le solde repasse ≥ 0 après remboursement.
     Hors prêt : vert si le solde monte vs point précédent, rouge sinon. */
  const pointColors = values.map((v, i) => {
    /* Vérifier si un prêt est actif jusqu'à ce point */
    const txnsUpTo = txns.slice(0, txns.length); // all txns already filtered by window
    // On parcourt les points du graphe : trouver la txn correspondante au dk
    const dk = points[i][0];
    // Sous-ensemble des txns jusqu'à ce jour
    const txnsUntilDk = txns.filter(t => {
      const ts = t.txDate || t.date;
      const d  = new Date(ts);
      const k  = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      return k <= dk;
    });
    const loanActive = _mcHasActiveLoan(txnsUntilDk);
    if (loanActive) return '#ca8a04'; // jaune
    if (i === 0) return '#16a34a';   // premier point = vert par défaut
    return v >= values[i - 1] ? '#16a34a' : '#dc2626';
  });

  /* Couleur dominante pour le dégradé de fond = couleur du dernier point */
  const dominantColor = pointColors[pointColors.length - 1] || '#16a34a';

  const ctx      = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 180);
  gradient.addColorStop(0, dominantColor + '33');
  gradient.addColorStop(1, dominantColor + '05');

  /* Plugin inline pour colorer chaque segment */
  const segmentColorPlugin = {
    id: 'mcSegmentColor',
    beforeDraw(chart) {
      // Pas nécessaire ici — on gère via segment option
    }
  };

  canvas._mcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Solde HTG',
        data: values,
        borderColor: (ctx2) => {
          // ctx2.p0DataIndex = index du point de départ du segment
          if (!ctx2.p0DataIndex && ctx2.p0DataIndex !== 0) return dominantColor;
          return pointColors[ctx2.p0DataIndex] || dominantColor;
        },
        segment: {
          borderColor: (ctx2) => pointColors[ctx2.p0DataIndex] || dominantColor,
        },
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: points.length <= 15 ? 4 : 2,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        tension: 0.38,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: lineColor,
          borderWidth: 1.5,
          titleColor: '#111111',
          bodyColor: '#333333',
          padding: 10,
          callbacks: {
            title: (items) => fullDates[items[0].dataIndex] || items[0].label,
            label: ctx => ' ' + fmtHTG(ctx.parsed.y) + ' HTG',
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#111111',
            font: { size: 10, family: "'Rajdhani', sans-serif" },
            maxRotation: mcChartPeriodMonths >= 12 ? 45 : 0,
            autoSkip: true,
            maxTicksLimit: mcChartPeriodMonths >= 12 ? 12 : 8,
          },
          grid:  { color: 'rgba(0,0,0,0.07)' }
        },
        y: {
          ticks: {
            color: '#111111',
            font:  { size: 10, family: "'Rajdhani', sans-serif" },
            callback: v => fmtHTG(v),
          },
          grid: { color: 'rgba(0,0,0,0.07)' }
        }
      }
    }
  });

  /* ── Indicateur texte d'inactivité ──────── */
  const infoEl = document.getElementById('mcActivityStatus');
  if (infoEl) {
    infoEl.textContent = statusInfo.text;
    infoEl.style.color = statusInfo.color;
  }
}

/* ── Init graphique au chargement de la section ─── */
function initMCDashboard() {
  renderMCGrowthChart();
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Formatage monétaire : virgule comme séparateur de milliers ─────────── */
function fmtHTG(n) {
  /* Toujours utiliser la virgule : 2,888 HTG — jamais d'espace ni de slash */
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
