/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js
   Kalkimatris · POS Logistik & Fakti PDF
   ══════════════════════════════════════════════ */

const POS_KEY = 'tbs_pos_history';
const MAX_HISTORY = 12;

/* ── Live Calculation ───────────────────────── */
function calcLive() {
  const L = parseFloat(document.getElementById('posL')?.value) || 0;
  const W = parseFloat(document.getElementById('posW')?.value) || 0;
  const H = parseFloat(document.getElementById('posH')?.value) || 0;
  const realWeight = parseFloat(document.getElementById('posWeight')?.value) || 0;
  const customPrice = parseFloat(document.getElementById('posCustomPrice')?.value) || 0;
  const debt = parseFloat(document.getElementById('posDebt')?.value) || 0;
  const change = parseFloat(document.getElementById('posChange')?.value) || 0;

  const volWeight = (L * W * H) / 4000;
  const finalWeight = volWeight + realWeight;

  let tarif = 0;
  let tarifLabel = '—';

  if (finalWeight > 0) {
    if (finalWeight < 50) {
      tarif = 4.90;
      tarifLabel = '$4.90/lb';
    } else {
      tarif = 3.99;
      tarifLabel = '$3.99/lb (Gwo volim)';
    }
  }

  let servicePrix = 0;
  if (customPrice > 0) {
    servicePrix = customPrice;
    tarifLabel = 'Pri manyèl';
  } else if (finalWeight > 0) {
    servicePrix = finalWeight * tarif;
    if (servicePrix < 25) servicePrix = 25; // minimum
  }

  const total = servicePrix + debt - change;

  // Update UI
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('resVolWeight', volWeight > 0 ? volWeight.toFixed(2) + ' lb' : '— lb');
  set('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '— lb');
  set('resTarif', tarifLabel);
  set('resService', servicePrix > 0 ? fmtCurrency(servicePrix) : '—');
  set('resTotal', fmtCurrency(Math.max(0, total)));
}

/* ── Generate PDF Invoice ───────────────────── */
function generatePOSInvoice() {
  const L = parseFloat(document.getElementById('posL')?.value) || 0;
  const W = parseFloat(document.getElementById('posW')?.value) || 0;
  const H = parseFloat(document.getElementById('posH')?.value) || 0;
  const realWeight = parseFloat(document.getElementById('posWeight')?.value) || 0;
  const customPrice = parseFloat(document.getElementById('posCustomPrice')?.value) || 0;
  const debt = parseFloat(document.getElementById('posDebt')?.value) || 0;
  const change = parseFloat(document.getElementById('posChange')?.value) || 0;
  const clientName = document.getElementById('posClientName')?.value.trim() || 'Kliyan';
  const description = document.getElementById('posDescription')?.value.trim() || '';

  const volWeight = (L * W * H) / 4000;
  const finalWeight = volWeight + realWeight;
  let tarif = finalWeight >= 50 ? 3.99 : 4.90;
  let servicePrix;
  if (customPrice > 0) {
    servicePrix = customPrice;
  } else {
    servicePrix = finalWeight > 0 ? finalWeight * tarif : 0;
    if (servicePrix < 25 && finalWeight > 0) servicePrix = 25;
  }
  const total = Math.max(0, servicePrix + debt - change);

  if (total === 0 && !clientName) { showToast('⚠️ Ranpli enfòmasyon yo anvan'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;
  const today = fmtDate(Date.now());

// ── Header ──────────────────────────────────
doc.setFillColor(14, 116, 144); // teal
doc.rect(0, 0, pw, 34, 'F');
doc.setFillColor(212, 175, 55); // gold bar
doc.rect(0, 33, pw, 2, 'F');

doc.roundedRect(6, 5, 22, 22, 2, 2, 'S');

const logoImg = 'lescayesdropshipping.png';
doc.addImage(logoImg, 'PNG', 7, 6, 20, 20); 

  // Company name
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('LES CAYES DROPSHIPPING', 34, 12);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 235, 245);
  doc.text('Patnè fyab ou pou pwojè komès ak livrezon USA vèr Haïti', 34, 18);
  doc.setTextColor(255, 255, 255);
  doc.text('+509 31 01 39 68  |  lescayesdropshipping@gmail.com', 34, 23.5);
  doc.text('USA: 14030 NW 5th Pl North  |  Haïti: Camp-Perrin, Matinière', 34, 28.5);

  // ── INVOICE title ────────────────────────────
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(14, 116, 144);
  doc.text('INVOICE', pw - 12, 46, { align: 'right' });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text('Dat :', pw - 42, 54);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text(today, pw - 12, 54, { align: 'right' });

  // ── FACTURÉ À ────────────────────────────────
  doc.setFillColor(14, 116, 144);
  doc.rect(10, 59, pw - 20, 5, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(212, 175, 55);
  doc.text('FAKTIRÉ À :', 13, 63);

  doc.setFillColor(230, 245, 250);
  doc.rect(10, 64, pw - 20, 14, 'F');
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
  doc.text('Non : ' + clientName, 13, 71);

  // ── Table ───────────────────────────────────
  let y = 86;

  // Table header
  doc.setFillColor(14, 116, 144);
  doc.rect(10, y, pw - 20, 7, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('Deskripsyon', 13, y + 5);
  doc.text('Pwa', pw - 44, y + 5);
  doc.text('Montan', pw - 12, y + 5, { align: 'right' });
  y += 7;

  // Table row
  doc.setFillColor(245, 250, 252);
  doc.rect(10, y, pw - 20, 18, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);

  let descLines = [];
  if (description) descLines = doc.splitTextToSize(description, 80);
  else descLines = ['Pakè ' + clientName];
  doc.text(descLines, 13, y + 5.5);

  doc.text(finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '—', pw - 44, y + 5.5);
  doc.setTextColor(14, 116, 144); doc.setFont('helvetica', 'bold');
  doc.text(fmtCurrency(servicePrix), pw - 12, y + 5.5, { align: 'right' });
  y += 20;

// ── Breakdown ───────────────────────────────
  y += 4;
  if (volWeight > 0 || realWeight > 0) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    if (L > 0) doc.text(`Pwa Volimètrik (${L}×${W}×${H}/4000) = ${volWeight.toFixed(2)} lb`, pw - 12, y, { align: 'right' });
    y += 4;
    if (realWeight > 0) doc.text(`Pwa Reyèl = ${realWeight} lb`, pw - 12, y, { align: 'right' });
    y += 4;
    if (tarif > 0 && customPrice === 0) doc.text(`Tarif: $${tarif}/lb (Pwa Final: ${finalWeight.toFixed(2)} lb)`, pw - 12, y, { align: 'right' });
    y += 6;
  }
  
  // Adjustments
  if (debt > 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    doc.text('+ Dèt', 10, y);
    doc.text(fmtCurrency(debt), pw - 12, y, { align: 'right' });
    y += 6;
  }
  if (change > 0) {
    doc.text('− Monnaie', 10, y);
    doc.text('(' + fmtCurrency(change) + ')', pw - 12, y, { align: 'right' });
    y += 6;
  }

  // ── Total ───────────────────────────────────
  y += 2;
  doc.setFillColor(14, 116, 144);
  doc.rect(10, y, pw - 20, 10, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL ($) :', 13, y + 6.5);
  doc.text(fmtCurrency(total), pw - 12, y + 6.5, { align: 'right' });
  y += 16;

  // ── Notes & Signature ────────────────────────
  doc.setFillColor(240, 248, 250);
  doc.rect(10, y, 66, 30, 'F');
  doc.setFillColor(240, 248, 250);
  doc.rect(80, y, pw - 90, 30, 'F');

  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(14, 116, 144);
  doc.text('Nòt & Kondisyon :', 13, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
  doc.text('Achte sou entènèt avèk nou ak konfyans.', 13, y + 12);
  doc.text('Taux 135 goud: Natcash / Sogebank / Cash.', 13, y + 17);
  doc.text('Zell pou dola ameriken.', 13, y + 22);

  doc.setFont('helvetica', 'bold'); doc.setTextColor(14, 116, 144);
  doc.text('Otorize par :', 83, y + 7);

  // Signature cursive style (simulated)
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text('Thomas', 83, y + 19);

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(14, 116, 144);
  doc.text('Thomas Kabé', 83, y + 24);
  doc.text('Les Cayes Dropshipping', 83, y + 28);

  // ── Footer ──────────────────────────────────
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
  doc.text('Mèsi pou konfyans ou · Les Cayes Dropshipping', pw / 2, ph - 6, { align: 'center' });

  // Save to history
  savePOSHistory({ clientName, description, finalWeight, total, date: Date.now() });
  renderPosHistory();

  const fn = `invoice-lcd-${clientName.replace(/\s+/g,'-')}.pdf`;
  doc.save(fn);
  showToast('🖨️ Fakti PDF jenere');
}

/* ── POS History ────────────────────────────── */
function savePOSHistory(entry) {
  let h = [];
  try { h = JSON.parse(localStorage.getItem(POS_KEY)) || []; } catch {}
  h.unshift({ ...entry, id: uid() });
  if (h.length > MAX_HISTORY) h = h.slice(0, MAX_HISTORY);
  localStorage.setItem(POS_KEY, JSON.stringify(h));
}

function getPosHistory() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || []; } catch { return []; }
}

function renderPosHistory() {
  const el = document.getElementById('posHistoryList');
  if (!el) return;
  const h = getPosHistory();
  if (h.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:32px;font-size:0.85rem;">Okenn istorik.</div>`;
    return;
  }
  el.innerHTML = h.map(e => `
    <div class="history-item">
      <div class="history-name">${escHtml(e.clientName)}</div>
      <div class="history-meta">
        <span>${fmtDate(e.date)}</span>
        <span class="history-total">${fmtCurrency(e.total)}</span>
      </div>
      ${e.description ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:3px;">${escHtml(e.description)}</div>` : ''}
    </div>
  `).join('');
}

function togglePosHistory() {
  const p = document.getElementById('posHistoryPanel');
  if (!p) return;
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) renderPosHistory();
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
