/* ═══════════════════════════════════════════════
   KALKIMATRIS — JavaScript (LCD uniquement $4.90/lb)
   v2.0 — Frais minimum, Dette, Monnaie, Logo
   ═══════════════════════════════════════════════ */

const CALC = (() => {
  const RATE_LCD = 4.90;
  const RATE_BULK = 3.99; // >= 50 lb
  const MIN_FRAIS = 25.00;
  let calcResult = null;
  let priceManuallyAdjusted = false;

  function calcLive() {
    const L = parseFloat(document.getElementById('cL').value) || 0;
    const l = parseFloat(document.getElementById('cl').value) || 0;
    const H = parseFloat(document.getElementById('cH').value) || 0;
    const pwaBalans = parseFloat(document.getElementById('cPwa').value) || 0;

    const pwaVol = (L * l * H) / 4000;
    const pwaFinal = pwaVol + pwaBalans;

    if (pwaFinal <= 0) {
      document.getElementById('calcResultPanel').classList.remove('show');
      calcResult = null;
      return;
    }

    const tarif = pwaFinal >= 50 ? RATE_BULK : RATE_LCD;
    const prixBrut = pwaFinal * tarif;
    const applyMin = prixBrut < MIN_FRAIS;
    const prixService = applyMin ? MIN_FRAIS : prixBrut;

    calcResult = { pwaFinal, tarif, prixBrut, prixService, applyMin };

    document.getElementById('cPwaVal').textContent = pwaFinal.toFixed(2) + ' lb';

    // Label dynamique Total/Subtotal
    const priceLbl = document.getElementById('result-price-lbl-dyn');
    const priceVal = document.getElementById('cPriVal');
    const minBadge = document.getElementById('cMinBadge');

    if (applyMin) {
      priceLbl.textContent = 'Subtotal (kalkil brut)';
      priceVal.textContent = prixBrut.toFixed(2);
      minBadge.style.display = 'block';
    } else {
      priceLbl.textContent = 'Pri Kalkile — LCD $' + tarif + '/lb';
      priceVal.textContent = prixService.toFixed(2);
      minBadge.style.display = 'none';
    }

    document.getElementById('cTarifVal').textContent =
      `Tarif: $${tarif}/lb${pwaFinal >= 50 ? ' (gwo volim)' : ''}`;

    updateFinalTotal();
    document.getElementById('calcResultPanel').classList.add('show');
  }

  function updateFinalTotal() {
    if (!calcResult) return;
    const dette = parseFloat(document.getElementById('cDette')?.value) || 0;
    const monnaie = parseFloat(document.getElementById('cMonnaie')?.value) || 0;

    // Priorité : frais min s'applique seulement sur le service
    const base = calcResult.prixService;
    const total = base + dette - monnaie;

    const finalEl = document.getElementById('cFinalTotal');
    if (finalEl) {
      finalEl.textContent = '$ ' + Math.max(0, total).toFixed(2);
    }

    // Lignes de détail
    const detteRow = document.getElementById('cDetteRow');
    const monnaieRow = document.getElementById('cMonnaieRow');
    if (detteRow) detteRow.style.display = dette > 0 ? 'flex' : 'none';
    if (monnaieRow) monnaieRow.style.display = monnaie > 0 ? 'flex' : 'none';

    // Badge ajustement manuel
    const adjBadge = document.getElementById('cAdjBadge');
    if (adjBadge) adjBadge.style.display = priceManuallyAdjusted ? 'block' : 'none';
  }

  function onCustomPriceInput() {
    const custom = parseFloat(document.getElementById('cCustomPrice').value);
    priceManuallyAdjusted = !isNaN(custom) && custom > 0;
    updateFinalTotal();
  }

  function runCalc() {
    calcLive();
    if (!calcResult) { showToast('⚠️ Antre dimansyon oswa pwa'); return; }
    const name = document.getElementById('cName').value.trim() || '—';
    const history = loadStore('tb_calcHistory', []);
    history.unshift({
      pwa: calcResult.pwaFinal.toFixed(2),
      pri: calcResult.prixService.toFixed(2),
      name,
      ts: Date.now()
    });
    if (history.length > 10) history.pop();
    saveStore('tb_calcHistory', history);
    renderCalcHistory();
    showToast('✅ Kalkil reyisi!');
  }

  function clearCalc() {
    ['cL','cl','cH','cPwa','cName','cCustomPrice','cDette','cMonnaie'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    priceManuallyAdjusted = false;
    document.getElementById('calcResultPanel').classList.remove('show');
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

  function genInvoiceLCD() {
    if (!calcResult) { showToast('⚠️ Kalkile anvan'); return; }
    const customPrice = parseFloat(document.getElementById('cCustomPrice').value) || null;
    const dette = parseFloat(document.getElementById('cDette')?.value) || 0;
    const monnaie = parseFloat(document.getElementById('cMonnaie')?.value) || 0;
    const name = document.getElementById('cName').value.trim() || 'Kliyan';
    const desc = document.getElementById('cDesc')?.value.trim() || 'LCD livrezon';

    const servicePrice = customPrice || calcResult.prixService;
    const isCustom = customPrice != null;
    buildInvoicePDF(name, calcResult.pwaFinal, calcResult.tarif, servicePrice,
                    calcResult.prixBrut, calcResult.applyMin, dette, monnaie,
                    isCustom, desc);
  }

  function buildInvoicePDF(clientName, pwa, tarif, servicePrice,
                            prixBrut, applyMin, dette, monnaie, isCustom, desc) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const TEAL=[14,116,144], GOLD=[193,140,40], WHITE=[255,255,255];
    const DARK=[17,17,17], GRAY=[136,136,136], LIGHT=[230,245,248];

    /* ── HEADER ── */
    doc.setFillColor(...TEAL);
    doc.rect(0,0,W,38,'F');
    doc.setFillColor(...GOLD);
    doc.rect(0,36,W,2,'F');

    // Tente de charger le logo
    const logo = new Image();
    logo.src = 'lescayesdropshipping.png';
    logo.onload = () => {
      try { doc.addImage(logo, 'PNG', 8, 4, 28, 28); } catch(e) {}
      _writeInvoiceBody(doc, W, TEAL, GOLD, WHITE, DARK, GRAY, LIGHT,
        clientName, pwa, tarif, servicePrice, prixBrut, applyMin, dette,
        monnaie, isCustom, desc);
    };
    logo.onerror = () => {
      _writeInvoiceBody(doc, W, TEAL, GOLD, WHITE, DARK, GRAY, LIGHT,
        clientName, pwa, tarif, servicePrice, prixBrut, applyMin, dette,
        monnaie, isCustom, desc);
    };
  }

  function _writeInvoiceBody(doc, W, TEAL, GOLD, WHITE, DARK, GRAY, LIGHT,
    clientName, pwa, tarif, servicePrice, prixBrut, applyMin, dette, monnaie,
    isCustom, desc) {

    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('LES CAYES DROPSHIPPING', W/2+10, 12, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('Service de livraison & importation', W/2+10, 19, {align:'center'});
    doc.setFontSize(7.5);
    doc.setTextColor(200,220,220);
    doc.text('+509 31 01 39 68  |  lescayesdropshipping@gmail.com', W/2, 26, {align:'center'});
    doc.text('USA: 14030 NW 5th Pl North  |  Haïti: Camp-Perrin, Matinière', W/2, 32, {align:'center'});

    /* ── INVOICE LABEL ── */
    doc.setFont('helvetica','bold');
    doc.setFontSize(20);
    doc.setTextColor(...TEAL);
    doc.text('INVOICE', W-12, 48, {align:'right'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const today = new Date().toLocaleDateString('fr-FR');
    doc.text('Date :', W-45, 56);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica','bold');
    doc.text(today, W-12, 56, {align:'right'});

    /* ── BILLED TO ── */
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

    /* ── TABLE HEADER ── */
    y = 98;
    doc.setFillColor(...TEAL);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('Description', 14, y+1);
    doc.text('Pwa', W-55, y+1);
    doc.text('Montant', W-13, y+1, {align:'right'});

    /* ── TABLE ROW ── */
    y += 14;
    doc.setFillColor(...LIGHT);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(desc, 14, y+1);
    doc.text(pwa.toFixed(2)+' lbs', W-55, y+1);
    doc.text('$'+prixBrut.toFixed(2), W-13, y+1, {align:'right'});

    /* ── MINIMUM FRAIS (si applicable) ── */
    y += 12;
    if (applyMin) {
      doc.setFillColor(255,248,225);
      doc.rect(10,y-3,W-20,10,'F');
      doc.setFont('helvetica','italic');
      doc.setFontSize(8);
      doc.setTextColor(180,120,0);
      doc.text('Frè minimum 25$', 14, y+4);
      doc.setFont('helvetica','bold');
      doc.text('$25.00', W-13, y+4, {align:'right'});
      y += 14;
    }

    /* ── DIVIDER ── */
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(.5);
    doc.line(10,y,W-10,y);
    y += 8;

    /* ── SOUS-TOTAL SERVICE ── */
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text(applyMin ? 'Subtotal :' : 'Total service :', W-55, y);
    doc.text('$ ' + servicePrice.toFixed(2), W-13, y, {align:'right'});

    /* ── DETTE (si présente) ── */
    if (dette > 0) {
      y += 8;
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text('+ Dette :', W-55, y);
      doc.setTextColor(180,60,60);
      doc.text('$ ' + dette.toFixed(2), W-13, y, {align:'right'});
    }

    /* ── MONNAIE (si présente) ── */
    if (monnaie > 0) {
      y += 8;
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text('− Monnaie :', W-55, y);
      doc.setTextColor(40,140,40);
      doc.text('$ ' + monnaie.toFixed(2), W-13, y, {align:'right'});
    }

    /* ── TOTAL FINAL ── */
    y += 10;
    const totalFinal = Math.max(0, servicePrice + dette - monnaie);
    doc.setFillColor(...TEAL);
    doc.rect(10,y-5,W-20,14,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('TOTAL FINAL ($) :', 14, y+4);
    doc.setFontSize(13);
    doc.text('$ ' + totalFinal.toFixed(2), W-13, y+4, {align:'right'});

    if (isCustom) {
      y += 12;
      doc.setFont('helvetica','italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('(Pri ajiste pa ajan)', W-13, y, {align:'right'});
    }

    /* ── NOTES + SIGNATURE ── */
    y += 18;
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

    // Signature — style stylo fluide (fin)
    const sx = W/2+2;
    doc.setFillColor(240,248,250);
    doc.rect(sx,y-5,W-sx-10,28,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Autorisé par :', sx+4, y+1);

    // Signature fine (trait de stylo simulé)
    doc.setFont('helvetica','italic');
    doc.setFontSize(22);
    doc.setTextColor(30,30,30);
    // Réduction de l'épaisseur via SVG-style workaround : taille + opacité légère
    doc.setFont('courier','italic'); // Courier italic = trait plus fin visuellement
    doc.setFontSize(20);
    doc.text('Thomas', sx+6, y+18);

    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Thomas Kabé — Agent Sud', sx+4, y+22);
    doc.text('Les Cayes Dropshipping', sx+4, y+27);

    /* ── FOOTER ── */
    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Merci pour votre confiance · Les Cayes Dropshipping', W/2, fY, {align:'center'});

    doc.save('invoice-lcd-'+clientName.replace(/\s+/g,'-')+'-'+Date.now()+'.pdf');
    showToast('🧾 Fich telechaje!');
  }

  return { calcLive, runCalc, clearCalc, renderCalcHistory, genInvoiceLCD,
           onCustomPriceInput, updateFinalTotal };
})();
