/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js
   Kalkimatris · Sistèm POS & Fakti PDF
   ══════════════════════════════════════════════ */

const POS_KEY      = 'tbs_pos_history';
const POS_MAX      = 12;   // 12 dènye fakti
const MIN_CHARGE   = 25;   // Frè minimum $25

/* ── Grille tarifaire LCD ───────────────────── */
// Si PwaFinal < 50 lb  → $4.90/lb
// Si PwaFinal >= 50 lb → $3.99/lb
function getTarif(weightLb) {
  return weightLb >= 50 ? 3.99 : 4.90;
}

/* ── Storage ────────────────────────────────── */
function getPosHistory() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || []; }
  catch { return []; }
}

function savePosHistory(list) {
  localStorage.setItem(POS_KEY, JSON.stringify(list));
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
  const L           = parseFloat(document.getElementById('posL')?.value)           || 0;
  const W           = parseFloat(document.getElementById('posW')?.value)           || 0;
  const H           = parseFloat(document.getElementById('posH')?.value)           || 0;
  const realWeight  = parseFloat(document.getElementById('posWeight')?.value)      || 0;
  const customPrice = parseFloat(document.getElementById('posCustomPrice')?.value) || 0;
  const balRest     = parseFloat(document.getElementById('posDebt')?.value)        || 0;  // Balance restante
  const balPaye     = parseFloat(document.getElementById('posChange')?.value)      || 0;  // Balance à payer

  // Pwa Volimétrique : (L × l × H) / 4000
  const volWeight   = (L * W * H) / 4000;

  // Pwa final = PwaVol + PwaReyèl
  const finalWeight = volWeight + realWeight;

  // Tarif applicab
  let tarif, servicePrix, subtotal;

  if (customPrice > 0) {
    // Prix personnalisé : remplace le calcul automatique
    tarif      = customPrice;
    servicePrix = finalWeight > 0 ? finalWeight * customPrice : customPrice;
    subtotal    = servicePrix;
  } else if (finalWeight > 0) {
    tarif       = getTarif(finalWeight);
    const brut  = finalWeight * tarif;
    servicePrix = brut < MIN_CHARGE ? MIN_CHARGE : brut;
    subtotal    = servicePrix;
  } else {
    tarif = 0; servicePrix = 0; subtotal = 0;
  }

  // Total = PrixService + BalanceRestante - BalancePaye
  const total = subtotal + balRest - balPaye;

  // Affichage
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',   volWeight > 0   ? volWeight.toFixed(2) + ' lb'   : '— lb');
  setTxt('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '— lb');
  setTxt('resTarif',       tarif > 0       ? '$' + tarif.toFixed(2) + '/lb' : '—');
  setTxt('resService',     subtotal > 0    ? '$' + subtotal.toFixed(2)      : '—');
  setTxt('resTotal',       '$' + Math.max(0, total).toFixed(2));

  return { volWeight, finalWeight, tarif, subtotal, total: Math.max(0, total), balRest, balPaye, customPrice };
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
      position:absolute;z-index:999;background:#1a1520;
      border:1px solid rgba(255,255,255,0.15);border-radius:8px;
      left:0;right:0;top:100%;max-height:160px;overflow-y:auto;
    `;
    matches.forEach(c => {
      const item = document.createElement('div');
      item.textContent = c.name + (c.address ? ' · ' + c.address : '');
      item.style.cssText = 'padding:10px 12px;cursor:pointer;font-size:0.875rem;color:#ddd8cc;border-bottom:1px solid rgba(255,255,255,0.06);';
      item.addEventListener('mousedown', () => {
        nameInput.value = c.name;
        if (addrInput) addrInput.value = c.address || '';
        removePosDropdown();
      });
      dd.appendChild(item);
    });

    const wrap = nameInput.parentElement;
    if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(dd); }
  });

  nameInput.addEventListener('blur', () => setTimeout(removePosDropdown, 200));
}

function removePosDropdown() {
  const dd = document.getElementById('posClientDropdown');
  if (dd) dd.remove();
}

/* ── Generate Invoice PDF ──────────────────── */
function generatePOSInvoice() {
  const clientName = (document.getElementById('posClientName')?.value  || '').trim();
  const clientAddr = (document.getElementById('posClientAddress')?.value || '').trim();
  const desc       = (document.getElementById('posDescription')?.value  || '').trim();
  const noteField  = (document.getElementById('posNote')?.value         || '').trim();

  const vals = calcLive();

  if (vals.finalWeight <= 0 && !clientName) {
    showToast('⚠️ Antre omwen pwa oswa non kliyan');
    return;
  }

  const entry = {
    id: uid(),
    clientName, clientAddr, desc, note: noteField,
    ...vals,
    date: Date.now(),
  };

  const hist = getPosHistory();
  hist.unshift(entry);
  // Limité aux 12 derniers
  if (hist.length > POS_MAX) hist.length = POS_MAX;
  savePosHistory(hist);
  savePosClient(clientName, clientAddr);

  buildPOSPdf(entry);
  showToast('📄 Fakti PDF jenere');
  renderPosHistory();
}

/* ── Build PDF A5 ───────────────────────────── */
function buildPOSPdf(e) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  // Couleurs brand
  const bR = 101, bG = 51, bB = 19;   // brun LCD
  const gR = 212, gG = 175, gB = 55;  // or

  /* ─── En-tête ─────────────────────────────── */
  doc.setFillColor(bR, bG, bB);
  doc.rect(0, 0, pw, 36, 'F');
  doc.setFillColor(gR, gG, gB);
  doc.rect(0, 35, pw, 1.5, 'F');

  // Logo : chargement asynchrone via canvas
  const logoPromise = new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 120, 120);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = 'lescayesdropshipping.png';
  });

  logoPromise.then(imgData => {
    if (imgData) {
      doc.addImage(imgData, 'PNG', 6, 4, 26, 26);
    } else {
      doc.setFillColor(255, 255, 255, 40);
      doc.roundedRect(6, 4, 26, 26, 3, 3, 'F');
    }

    // Texte entête
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 36, 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 36, 18);
    doc.text('USA: 14030 NW 5th Pl North  ·  Haïti: Camp-Perrin, Matinière', 36, 23);
    const dateTxt = 'Dat: ' + new Date(e.date).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' });
    doc.text(dateTxt, 36, 29);

    let y = 44;

    /* ─── Bloc client ──────────────────────── */
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    if (e.clientName) { doc.text(e.clientName, 10, y); y += 6; }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    if (e.clientAddr) { doc.text('📍  ' + e.clientAddr, 10, y); y += 5; }
    if (e.desc) {
      const dLines = doc.splitTextToSize('📦  ' + e.desc, pw - 20);
      doc.text(dLines, 10, y);
      y += dLines.length * 4.5;
    }

    y += 4;
    doc.setDrawColor(gR, gG, gB);
    doc.setLineWidth(0.4);
    doc.line(10, y, pw - 10, y);
    y += 7;

    /* ─── Tableau ──────────────────────────── */
    // En-tête tableau
    doc.setFillColor(240, 234, 224);
    doc.rect(10, y - 4.5, pw - 20, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bR, bG, bB);
    doc.text('Deskripsyon', 12, y);
    doc.text('Detay', 90, y);
    doc.text('Montan', pw - 12, y, { align: 'right' });
    y += 6;

    // Lignes du tableau — PAS de poids vol/réel/tarif visible
    const rows = [];
    if (e.subtotal > 0) rows.push(['Frè ekspedisyon', '', '$' + e.subtotal.toFixed(2)]);
    if (e.balRest > 0)  rows.push(['Balance restante', '', '+$' + e.balRest.toFixed(2)]);
    if (e.balPaye > 0)  rows.push(['Balance à payer',  '', '-$' + e.balPaye.toFixed(2)]);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    rows.forEach((r, i) => {
      if (y > ph - 50) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 248);
      doc.rect(10, y - 3.5, pw - 20, 7, 'F');
      doc.setTextColor(40, 40, 40);
      doc.text(r[0], 12, y);
      if (r[1]) doc.text(r[1], 90, y);
      if (r[2]) {
        doc.setTextColor(bR, bG, bB);
        doc.text(r[2], pw - 12, y, { align: 'right' });
        doc.setTextColor(40, 40, 40);
      }
      y += 7;
    });

    // Subtotal ligne
    y += 1;
    doc.setFillColor(235, 226, 208);
    doc.rect(10, y - 4, pw - 20, 7.5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 40, 10);
    doc.text('Subtotal', 12, y);
    doc.text('$' + e.subtotal.toFixed(2), pw - 12, y, { align: 'right' });
    y += 8;

    // Total principal
    doc.setFillColor(bR, bG, bB);
    doc.rect(10, y - 4, pw - 20, 9, 'F');
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', 12, y);
    doc.text('$' + (e.total || 0).toFixed(2), pw - 12, y, { align: 'right' });
    y += 13;

    /* ─── Adresse fumée sous le nom ────────── */
    if (e.clientAddr) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 150, 135);
      doc.text('📍  ' + e.clientAddr, 10, y);
      y += 7;
    }

    /* ─── Zone Note ────────────────────────── */
    if (e.note) {
      y += 2;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(90, 90, 90);
      const noteLines = doc.splitTextToSize('Nòt: ' + e.note, pw - 20);
      doc.text(noteLines, 10, y);
      y += noteLines.length * 4.5 + 4;
    }

    /* ─── Espace note vide si pas de note ──── */
    if (!e.note) {
      y += 4;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 170, 155);
      doc.text('Nòt:', 10, y);
      doc.setDrawColor(200, 190, 175);
      doc.setLineWidth(0.3);
      doc.line(22, y, pw - 10, y);
      y += 6;
      doc.line(10, y, pw - 10, y);
      y += 10;
    }

    /* ─── Signature ────────────────────────── */
    // Ligne de séparation
    doc.setDrawColor(gR, gG, gB);
    doc.setLineWidth(0.35);
    doc.line(10, y, pw - 10, y);
    y += 6;

    // Signature en style cursif simulé
    doc.setFontSize(12);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(50, 30, 10);
    doc.text("L'Agent Sud (Thomas Kabé)", pw / 2, y, { align: 'center' });
    y += 4;

    // Pied de page
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 150, 135);
    doc.text('Les Cayes Dropshipping · lescayesdropshipping@gmail.com · +509 31 01 39 68', pw / 2, ph - 6, { align: 'center' });

    const fname = 'Fakti-LCD-' + (e.clientName || 'Kliyan').replace(/\s+/g, '_') + '-' + Date.now() + '.pdf';
    doc.save(fname);
  });
}

/* ── Render History ─────────────────────────── */
function renderPosHistory() {
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
          <button onclick='buildPOSPdf(${JSON.stringify(h).replace(/'/g,"&#39;")})' style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">🖨️ PDF</button>
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
});
