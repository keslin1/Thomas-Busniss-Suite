/* ═══════════════════════════════════════════════
   KALKIMATRIS — JavaScript (LCD uniquement $4.90/lb)
   v2 : Frè minimum 25$, Dette, Monnaie, Description
   ═══════════════════════════════════════════════ */

const CALC = (() => {
  const RATE_LCD = 4.90;
  const RATE_BULK = 3.99; // >= 50 lb
  const MIN_PRICE = 25;
  let calcResult = null;
  let priceManuallyEdited = false;

  /* ─── CALCUL LIVE ──────────────────────────── */
  function calcLive() {
    const L = parseFloat(document.getElementById('cL').value) || 0;
    const l = parseFloat(document.getElementById('cl').value) || 0;
    const H = parseFloat(document.getElementById('cH').value) || 0;
    const pwaBalans = parseFloat(document.getElementById('cPwa').value) || 0;
    const dette = parseFloat(document.getElementById('cDette').value) || 0;
    const monnaie = parseFloat(document.getElementById('cMonnaie').value) || 0;
    const customPriceEl = document.getElementById('cCustomPrice');
    const customPrice = customPriceEl ? (parseFloat(customPriceEl.value) || null) : null;

    const pwaVol = (L * l * H) / 4000;
    const pwaFinal = pwaVol + pwaBalans;

    if (pwaFinal <= 0) {
      document.getElementById('calcResultPanel').classList.remove('show');
      calcResult = null;
      return;
    }

    const tarif = pwaFinal >= 50 ? RATE_BULK : RATE_LCD;
    const prixBrut = customPrice !== null ? customPrice : pwaFinal * tarif;
    const needsMinimum = prixBrut < MIN_PRICE && customPrice === null;
    const prixService = needsMinimum ? MIN_PRICE : prixBrut;
    const prixFinal = prixService + dette - monnaie;

    calcResult = { pwaFinal, tarif, prixBrut, prixService, prixFinal, needsMinimum, dette, monnaie, customPrice };

    // Mise à jour affichage
    document.getElementById('cPwaVal').textContent = pwaFinal.toFixed(2) + ' lb';
    document.getElementById('cPriVal').textContent = prixBrut.toFixed(2);

    // Tarif label
    let tarifTxt = `Tarif: $${tarif}/lb${pwaFinal >= 50 ? ' (gwo volim)' : ''}`;
    if (priceManuallyEdited && customPrice !== null) tarifTxt += ' · ⚡ Pri ajiste pa ajan';
    document.getElementById('cTarifVal').textContent = tarifTxt;

    // Subtotal / Total breakdown
    const breakdownEl = document.getElementById('calcBreakdown');
    if (breakdownEl) {
      let html = '';
      if (needsMinimum) {
        html += `<div class="breakdown-row"><span class="bd-lbl">Subtotal</span><span class="bd-val">$${prixBrut.toFixed(2)}</span></div>`;
        html += `<div class="breakdown-row freminimum"><span class="bd-lbl">↑ Frè minimum 25$</span><span class="bd-val bd-fix">$25.00</span></div>`;
      }
      if (dette > 0) {
        html += `<div class="breakdown-row"><span class="bd-lbl">+ Dette</span><span class="bd-val bd-dette">+$${dette.toFixed(2)}</span></div>`;
      }
      if (monnaie > 0) {
        html += `<div class="breakdown-row"><span class="bd-lbl">− Monnaie kliyan</span><span class="bd-val bd-monnaie">−$${monnaie.toFixed(2)}</span></div>`;
      }
      const totalLabel = needsMinimum || dette > 0 || monnaie > 0 ? 'TOTAL FINAL' : 'TOTAL';
      html += `<div class="breakdown-row total-final"><span class="bd-lbl">${totalLabel}</span><span class="bd-val bd-total">$${prixFinal.toFixed(2)}</span></div>`;
      breakdownEl.innerHTML = html;
      breakdownEl.style.display = 'block';
    }

    document.getElementById('calcResultPanel').classList.add('show');
  }

  /* ─── WATCH custom price ───────────────────── */
  function onCustomPriceChange() {
    const el = document.getElementById('cCustomPrice');
    priceManuallyEdited = el && el.value !== '';
    calcLive();
  }

  /* ─── RUN CALC ─────────────────────────────── */
  function runCalc() {
    calcLive();
    if (!calcResult) { showToast('⚠️ Antre dimansyon oswa pwa'); return; }
    const name = document.getElementById('cName').value.trim() || '—';
    const history = loadStore('tb_calcHistory', []);
    history.unshift({
      pwa: calcResult.pwaFinal.toFixed(2),
      pri: calcResult.prixFinal.toFixed(2),
      name,
      ts: Date.now()
    });
    if (history.length > 10) history.pop();
    saveStore('tb_calcHistory', history);
    renderCalcHistory();
    showToast('✅ Kalkil reyisi!');
  }

  function clearCalc() {
    ['cL','cl','cH','cPwa','cName','cCustomPrice','cDesc','cDette','cMonnaie'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    priceManuallyEdited = false;
    document.getElementById('calcResultPanel').classList.remove('show');
    const bd = document.getElementById('calcBreakdown');
    if (bd) bd.innerHTML = '';
    calcResult = null;
  }

  function renderCalcHistory() {
    const history = loadStore('tb_calcHistory', []);
    const el = document.getElementById('calcHistory');
    if (!el) return;
    if (!history.length) {
      el.innerHTML = '<div style="color:var(--gray);font-size:.78rem;text-align:center;padding:16px;">Pa gen istorik ankò.</div>';
      return;
    }
    el.innerHTML = history.map(h => `
      <div class="hist-item">
        <div>
          <div class="hist-time">${new Date(h.ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
          <div class="hist-pwa">${h.pwa} lb${h.name !== '—' ? ' · ' + escHtml(h.name) : ''}</div>
        </div>
        <div class="hist-price">$${h.pri}</div>
      </div>
    `).join('');
  }

  /* ─── GENERATE INVOICE ─────────────────────── */
  function genInvoiceLCD() {
    if (!calcResult) { showToast('⚠️ Kalkile anvan'); return; }
    const name = document.getElementById('cName').value.trim() || 'Kliyan';
    const desc = (document.getElementById('cDesc') ? document.getElementById('cDesc').value.trim() : '') || 'Livrezon LCD';
    buildInvoicePDF(name, calcResult.pwaFinal, calcResult.tarif, calcResult, desc);
  }

  /* ─── BUILD PDF ────────────────────────────── */
  function buildInvoicePDF(clientName, pwa, tarif, result, description) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const TEAL=[14,116,144], GOLD=[193,140,40], WHITE=[255,255,255];
    const DARK=[17,17,17], GRAY=[136,136,136];

    // ── HEADER ──
    doc.setFillColor(...TEAL);
    doc.rect(0,0,W,38,'F');
    doc.setFillColor(...GOLD);
    doc.rect(0,36,W,2,'F');

    // Try logo image — graceful fallback to text
    try {
      const logoEl = document.getElementById('__invoiceLogoCache');
      if (logoEl && logoEl.dataset.b64) {
        doc.addImage(logoEl.dataset.b64, 'PNG', 6, 4, 18, 18);
      }
    } catch(e) {}

    doc.setFont('helvetica','bold');
    doc.setFontSize(15);
    doc.setTextColor(...WHITE);
    doc.text('LES CAYES DROPSHIPPING', W/2, 13, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('Service de livraison & importation', W/2, 20, {align:'center'});
    doc.setFontSize(7.5);
    doc.setTextColor(200,220,220);
    doc.text('+509 31 01 39 68  |  lescayesdropshipping@gmail.com', W/2, 27, {align:'center'});
    doc.text('USA: 14030 NW 5th Pl North  |  Haïti: Camp-Perrin, Matinière', W/2, 33, {align:'center'});

    // ── INVOICE TITLE ──
    doc.setFont('helvetica','bold');
    doc.setFontSize(20);
    doc.setTextColor(...TEAL);
    doc.text('INVOICE', W-12, 50, {align:'right'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const today = new Date().toLocaleDateString('fr-FR');
    doc.text('Date :', W-45, 58);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica','bold');
    doc.text(today, W-12, 58, {align:'right'});

    // ── CLIENT BOX ──
    let y = 66;
    doc.setFillColor(...TEAL);
    doc.rect(10,y-5,W-20,24,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('FACTURÉ À :', 14, y+1);
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text('Nom : ' + clientName, 14, y+8);
    doc.text('Date : ' + today, 14, y+15);

    // ── ITEMS TABLE ──
    y = 98;
    doc.setFillColor(...TEAL);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('Description', 14, y+1);
    doc.text('Pwa', W-55, y+1);
    doc.text('Montan', W-13, y+1, {align:'right'});

    y += 13;
    doc.setFillColor(230,245,248);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(description, 14, y+1);
    doc.text(pwa.toFixed(2)+' lbs', W-55, y+1);
    doc.text('$'+(pwa*tarif).toFixed(2), W-13, y+1, {align:'right'});

    // ── BREAKDOWN ──
    y += 16;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(.4);
    doc.line(10,y,W-10,y);
    y += 5;

    const rows = [];
    if (result.needsMinimum) {
      rows.push({ lbl:'Subtotal', val:'$'+result.prixBrut.toFixed(2), italic:true, color:GRAY });
      rows.push({ lbl:'↑ Frè minimum 25$', val:'$25.00', italic:true, color:[200,120,0] });
    }
    if (result.dette > 0) rows.push({ lbl:'+ Dette', val:'+$'+result.dette.toFixed(2), color:[180,60,60] });
    if (result.monnaie > 0) rows.push({ lbl:'− Monnaie kliyan', val:'−$'+result.monnaie.toFixed(2), color:[30,130,80] });

    rows.forEach(r => {
      doc.setFont('helvetica', r.italic ? 'italic' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...(r.color||DARK));
      doc.text(r.lbl, 14, y+3);
      doc.text(r.val, W-13, y+3, {align:'right'});
      y += 8;
    });

    // ── TOTAL FINAL ──
    doc.setFillColor(...TEAL);
    doc.rect(10,y,W-20,12,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text('TOTAL ($) :', 14, y+8);
    doc.setFontSize(12);
    doc.text('$ ' + result.prixFinal.toFixed(2), W-13, y+8, {align:'right'});
    y += 18;

    // Insigne ajustement manuel
    if (result.customPrice !== null && result.customPrice !== undefined) {
      doc.setFont('helvetica','italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('⚡ Pri a ajiste pa ajan', W-13, y, {align:'right'});
      y += 7;
    }

    // ── NOTES + SIGNATURE ──
    y += 4;
    doc.setFillColor(240,248,250);
    doc.rect(10,y-5,W/2-14,28,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Notes & Conditions :', 14, y+1);
    doc.setFont('helvetica','normal');
    doc.setTextColor(...DARK);
    doc.text('Achte sou entènèt avèk nou ak konfyans.', 14, y+8);
    doc.text('Taux 135 goud — Natcash / Moncash.', 14, y+14);
    doc.text('Zèl pou dola ameriken.', 14, y+20);

    // Signature — fine, style stylo
    const sx = W/2+2;
    doc.setFillColor(240,248,250);
    doc.rect(sx,y-5,W-sx-10,28,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Autorisé par :', sx+4, y+1);
    // Signature fine : taille 15, weight normal, font cursive simulée via helvetica oblique
    doc.setFont('helvetica','oblique');
    doc.setFontSize(15);
    doc.setTextColor(30,30,30);
    // Simule un trait fin avec une légère ombre décalée
    doc.setTextColor(200,200,200);
    doc.text('Thomas', sx+9, y+17);
    doc.setTextColor(30,30,30);
    doc.text('Thomas', sx+8, y+16);
    // Underline fin sous la signature
    doc.setDrawColor(14,116,144);
    doc.setLineWidth(0.3);
    doc.line(sx+6, y+18, sx+38, y+18);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Thomas Kabé — Agent Sud', sx+4, y+22);
    doc.text('Les Cayes Dropshipping', sx+4, y+27);

    // ── FOOTER ──
    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Merci pour votre confiance · Les Cayes Dropshipping', W/2, fY, {align:'center'});

    doc.save('invoice-lcd-'+clientName.replace(/\s+/g,'-')+'-'+Date.now()+'.pdf');
    showToast('🧾 Fich telechaje!');
  }

  /* ─── PRELOAD LOGO ─────────────────────────── */
  function preloadLogo() {
    if (document.getElementById('__invoiceLogoCache')) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'lescayesdropshipping.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img,0,0);
        const b64 = canvas.toDataURL('image/png').split(',')[1];
        const cache = document.createElement('div');
        cache.id = '__invoiceLogoCache';
        cache.dataset.b64 = b64;
        cache.style.display = 'none';
        document.body.appendChild(cache);
      } catch(e) {}
    };
  }

  // Préchargement au boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadLogo);
  } else {
    preloadLogo();
  }

  return { calcLive, onCustomPriceChange, runCalc, clearCalc, renderCalcHistory, genInvoiceLCD };
})();
