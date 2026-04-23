/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js
   Kalkimatris · Sistèm POS & Fakti PDF
   ══════════════════════════════════════════════ */

const POS_KEY      = 'tbs_pos_history';
const POS_DAYS_TTL = 30; // Rétention 30 jours
const MIN_CHARGE   = 25; // Frais minimum $25

/* ── Tarif par palier de poids ($/lb) ──────── */
const POS_RATES = [
  { max: 1,   rate: 8.00 },
  { max: 3,   rate: 7.50 },
  { max: 5,   rate: 7.00 },
  { max: 10,  rate: 6.50 },
  { max: 20,  rate: 6.00 },
  { max: 50,  rate: 5.50 },
  { max: Infinity, rate: 5.00 },
];

function getTarif(weightLb) {
  for (const tier of POS_RATES) {
    if (weightLb <= tier.max) return tier.rate;
  }
  return POS_RATES[POS_RATES.length - 1].rate;
}

/* ── Storage ────────────────────────────────── */
function getPosHistory() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || []; }
  catch { return []; }
}

function savePosHistory(list) {
  localStorage.setItem(POS_KEY, JSON.stringify(list));
}

/* ── Purge des entrées > 30 jours ──────────── */
function purgePosHistory() {
  const cutoff = Date.now() - POS_DAYS_TTL * 24 * 60 * 60 * 1000;
  const list = getPosHistory().filter(h => h.date >= cutoff);
  savePosHistory(list);
}

/* ── Client autocomplete store ─────────────── */
function getPosClients() {
  try { return JSON.parse(localStorage.getItem('tbs_pos_clients')) || []; }
  catch { return []; }
}

function savePosClient(name, address) {
  if (!name) return;
  const list = getPosClients();
  const idx  = list.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (idx !== -1) {
    list[idx].address = address || list[idx].address;
  } else {
    list.push({ name, address: address || '' });
  }
  localStorage.setItem('tbs_pos_clients', JSON.stringify(list));
}

/* ── Calcul live ────────────────────────────── */
function calcLive() {
  const L = parseFloat(document.getElementById('posL')?.value) || 0;
  const W = parseFloat(document.getElementById('posW')?.value) || 0;
  const H = parseFloat(document.getElementById('posH')?.value) || 0;
  const realWeight    = parseFloat(document.getElementById('posWeight')?.value)      || 0;
  const customPrice   = parseFloat(document.getElementById('posCustomPrice')?.value) || 0;
  const debt          = parseFloat(document.getElementById('posDebt')?.value)        || 0;
  const changePaid    = parseFloat(document.getElementById('posChange')?.value)      || 0;

  // Poids volumique : L×l×H / 139 (diviseur standard aérien)
  const volWeight  = (L * W * H) / 139;
  const finalWeight = Math.max(volWeight, realWeight);

  // Tarif applicable
  const tarif = customPrice > 0 ? customPrice : getTarif(finalWeight);

  // Subtotal = frais brut du colis
  const subtotal = finalWeight > 0 ? finalWeight * tarif : 0;

  // Total = max(subtotal, MIN_CHARGE) + dette — sauf prix custom
  let total;
  if (customPrice > 0) {
    // Prix custom saisi manuellement : prévaut, pas de minimum imposé
    total = (finalWeight * customPrice) + debt;
  } else if (finalWeight > 0) {
    const base = finalWeight * tarif;
    total = (base < MIN_CHARGE ? MIN_CHARGE : base) + debt;
  } else {
    total = 0;
  }

  const change = changePaid > 0 ? changePaid - total : 0;

  // Affichage
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',  volWeight > 0 ? volWeight.toFixed(2) + ' lb' : '— lb');
  setTxt('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '— lb');
  setTxt('resTarif',      finalWeight > 0 ? '$' + tarif.toFixed(2) + '/lb' : '—');
  setTxt('resService',    subtotal > 0   ? '$' + subtotal.toFixed(2) : '—');
  setTxt('resTotal',      total > 0      ? '$' + total.toFixed(2)   : '$0.00');

  // Monnaie rendue
  const changeRow = document.getElementById('resChangeRow');
  const changeTxt = document.getElementById('resChangeAmt');
  if (changeRow && changeTxt) {
    if (changePaid > 0 && total > 0) {
      changeRow.style.display = 'flex';
      changeTxt.textContent = (change >= 0 ? '+' : '') + '$' + change.toFixed(2);
      changeTxt.style.color = change >= 0 ? '#4ade80' : '#f87171';
    } else {
      changeRow.style.display = 'none';
    }
  }

  return { volWeight, finalWeight, tarif, subtotal, total, debt, changePaid };
}

/* ── Autocomplete client ───────────────────── */
function initPosAutocomplete() {
  const nameInput = document.getElementById('posClientName');
  const addrInput = document.getElementById('posClientAddress');
  if (!nameInput) return;

  nameInput.addEventListener('input', () => {
    const val = nameInput.value.trim().toLowerCase();
    removePosDropdown();
    if (!val) return;

    const matches = getPosClients().filter(c => c.name.toLowerCase().startsWith(val));
    if (matches.length === 0) return;

    const dd = document.createElement('div');
    dd.id = 'posClientDropdown';
    dd.style.cssText = `
      position: absolute; z-index: 999; background: #1a1520;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
      left: 0; right: 0; top: 100%; max-height: 160px; overflow-y: auto;
    `;
    matches.forEach(c => {
      const item = document.createElement('div');
      item.textContent = c.name + (c.address ? ' · ' + c.address : '');
      item.style.cssText = 'padding: 10px 12px; cursor: pointer; font-size: 0.875rem; color: #ddd8cc; border-bottom: 1px solid rgba(255,255,255,0.06);';
      item.addEventListener('mousedown', () => {
        nameInput.value = c.name;
        if (addrInput) addrInput.value = c.address || '';
        removePosDropdown();
      });
      dd.appendChild(item);
    });

    const wrap = nameInput.parentElement;
    if (wrap) {
      wrap.style.position = 'relative';
      wrap.appendChild(dd);
    }
  });

  nameInput.addEventListener('blur', () => {
    setTimeout(removePosDropdown, 200);
  });
}

function removePosDropdown() {
  const dd = document.getElementById('posClientDropdown');
  if (dd) dd.remove();
}

/* ── Generate Invoice PDF ──────────────────── */
function generatePOSInvoice() {
  const clientName = (document.getElementById('posClientName')?.value || '').trim();
  const clientAddr = (document.getElementById('posClientAddress')?.value || '').trim();
  const desc       = (document.getElementById('posDescription')?.value  || '').trim();

  const { volWeight, finalWeight, tarif, subtotal, total, debt, changePaid } = calcLive();

  if (finalWeight <= 0 && !clientName) {
    showToast('⚠️ Antre omwen pwa oswa non kliyan');
    return;
  }

  // Save to history
  const entry = {
    id: uid ? uid() : Date.now().toString(36),
    clientName, clientAddr, desc,
    volWeight, finalWeight, tarif, subtotal, total, debt, changePaid,
    date: Date.now(),
  };
  purgePosHistory();
  const hist = getPosHistory();
  hist.unshift(entry);
  savePosHistory(hist);

  // Save client for autocomplete
  savePosClient(clientName, clientAddr);

  // Generate PDF
  buildPOSPdf(entry);
  showToast('📄 Fakti PDF jenere');
  renderPosHistory();
}

function buildPOSPdf(e) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  const accentR = 101, accentG = 51, accentB = 19; // brown

  // ── Header ──
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 0, pw, 32, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 31, pw, 1.5, 'F');

  // Logo image (lescayesdropshipping.png dans un carré 22x22)
  try {
    const logoImg = new Image();
    logoImg.src = 'lescayesdropshipping.png';
    // Synchronous approach: use canvas to get base64 if already loaded
    const canvas = document.createElement('canvas');
    canvas.width  = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(logoImg, 0, 0, 80, 80);
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 8, 5, 22, 22);
  } catch (_) {
    // Fallback square if image not available
    doc.setFillColor(255, 255, 255, 30);
    doc.roundedRect(8, 5, 22, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('LCD', 14, 17);
  }

  // Title beside logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('LES CAYES DROPSHIPPING', 34, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Kalkimatris · Fakti Ekspedisyon', 34, 18);
  doc.setFontSize(7.5);
  doc.text('Dat: ' + new Date(e.date).toLocaleDateString('fr-HT',{day:'2-digit',month:'2-digit',year:'numeric'}), 34, 24);

  let y = 40;

  // ── Client block ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  if (e.clientName) {
    doc.text(e.clientName, 10, y);
    y += 5.5;
  }
  if (e.clientAddr) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(e.clientAddr, 10, y);
    y += 5;
  }
  if (e.desc) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    const dLines = doc.splitTextToSize('📦 ' + e.desc, pw - 20);
    doc.text(dLines, 10, y);
    y += dLines.length * 4.5;
  }

  y += 4;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(10, y, pw - 10, y);
  y += 7;

  // ── Table (sans description des détails de calcul) ──
  const rows = [];
  if (e.volWeight > 0)   rows.push(['Pwa volimik',  e.volWeight.toFixed(2) + ' lb', '']);
  if (e.finalWeight > 0) rows.push(['Pwa final',    e.finalWeight.toFixed(2) + ' lb', '']);
  if (e.tarif > 0)       rows.push(['Tarif',        '$' + e.tarif.toFixed(2) + '/lb', '']);
  if (e.subtotal > 0)    rows.push(['Subtotal',     '',  '$' + e.subtotal.toFixed(2)]);
  if (e.debt > 0)        rows.push(['Dèt',          '',  '+$' + e.debt.toFixed(2)]);

  // Table header
  doc.setFillColor(240, 235, 230);
  doc.rect(10, y - 4, pw - 20, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentR, accentG, accentB);
  doc.text('Deskripsyon', 12, y);
  doc.text('Detay', 95, y);
  doc.text('Montan', pw - 12, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  rows.forEach((r, i) => {
    if (y > ph - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 248);
    doc.rect(10, y - 3.5, pw - 20, 6.5, 'F');
    doc.setTextColor(40, 40, 40);
    doc.text(r[0], 12, y);
    if (r[1]) doc.text(r[1], 95, y);
    if (r[2]) {
      doc.setTextColor(accentR, accentG, accentB);
      doc.text(r[2], pw - 12, y, { align: 'right' });
      doc.setTextColor(40, 40, 40);
    }
    y += 6.5;
  });

  // ── Total row ──
  y += 2;
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(10, y - 4, pw - 20, 9, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', 12, y);
  doc.text('$' + e.total.toFixed(2), pw - 12, y, { align: 'right' });
  y += 11;

  // Monnaie rendue
  if (e.changePaid > 0) {
    const chg = e.changePaid - e.total;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Monnen paye: $' + e.changePaid.toFixed(2), 12, y);
    doc.setTextColor(chg >= 0 ? 22 : 220, chg >= 0 ? 163 : 38, chg >= 0 ? 74 : 38);
    doc.text('Monnen rann: $' + Math.abs(chg).toFixed(2), pw - 12, y, { align: 'right' });
    y += 8;
  }

  // ── Footer ──
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Thomas Kabé · Les Cayes Dropshipping · lescayesdropshipping@gmail.com', pw / 2, ph - 8, { align: 'center' });

  const fname = 'Fakti-LCD-' + (e.clientName || 'Kliyan').replace(/\s+/g, '_') + '-' + Date.now() + '.pdf';
  doc.save(fname);
}

/* ── Render History ─────────────────────────── */
function renderPosHistory() {
  purgePosHistory();
  const list = getPosHistory();
  const el   = document.getElementById('posHistoryList');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.85rem;">Okenn fakti ankò.</div>`;
    return;
  }

  el.innerHTML = list.map(h => `
    <div class="pos-history-item" style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <div style="font-size:0.9rem;font-weight:600;color:#ddd8cc;">${h.clientName || '—'}</div>
          ${h.clientAddr ? `<div style="font-size:0.72rem;color:rgba(200,190,175,0.5);">${h.clientAddr}</div>` : ''}
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">${new Date(h.date).toLocaleDateString('fr-HT',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Space Mono',monospace;font-size:0.95rem;color:#d4af37;">$${(h.total||0).toFixed(2)}</div>
          <button onclick="buildPOSPdf(${JSON.stringify(h).replace(/"/g,'&quot;')})" style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">🖨️ PDF</button>
        </div>
      </div>
    </div>
  `).join('');
}

function togglePosHistory() {
  const panel = document.getElementById('posHistoryPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderPosHistory();
}

/* ── Init ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initPosAutocomplete();
  // Ajouter la ligne Change dans le result panel si absente
  const resultPanel = document.getElementById('posResultPanel');
  if (resultPanel && !document.getElementById('resChangeRow')) {
    const row = document.createElement('div');
    row.id = 'resChangeRow';
    row.className = 'result-row';
    row.style.display = 'none';
    row.innerHTML = `<span>Monnen rann</span><span id="resChangeAmt" class="mono"></span>`;
    resultPanel.appendChild(row);
  }
});
