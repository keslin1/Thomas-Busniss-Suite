/* ═══════════════════════════════════════════════
   KALKIMATRIS — JavaScript (LCD uniquement $4.90/lb)
   ═══════════════════════════════════════════════ */

const CALC = (() => {
  const RATE_LCD = 4.90;
  const RATE_BULK = 3.99; // >= 50 lb
  let calcResult = null;

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
    const prix = pwaFinal * tarif;
    calcResult = { pwaFinal, tarif, prix };

    document.getElementById('cPwaVal').textContent = pwaFinal.toFixed(2) + ' lb';
    document.getElementById('cPriVal').textContent = prix.toFixed(2);
    document.getElementById('cTarifVal').textContent =
      `Tarif: $${tarif}/lb${pwaFinal >= 50 ? ' (gwo volim)' : ''}`;
    document.getElementById('calcResultPanel').classList.add('show');
  }

  function runCalc() {
    calcLive();
    if (!calcResult) { showToast('⚠️ Antre dimansyon oswa pwa'); return; }
    const name = document.getElementById('cName').value.trim() || '—';
    const history = loadStore('tb_calcHistory', []);
    history.unshift({
      pwa: calcResult.pwaFinal.toFixed(2),
      pri: calcResult.prix.toFixed(2),
      name,
      ts: Date.now()
    });
    if (history.length > 10) history.pop();
    saveStore('tb_calcHistory', history);
    renderCalcHistory();
    showToast('✅ Kalkil reyisi!');
  }

  function clearCalc() {
    ['cL','cl','cH','cPwa','cName','cCustomPrice'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
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
    const name = document.getElementById('cName').value.trim() || 'Kliyan';
    const finalPrice = customPrice || calcResult.prix;
    buildInvoicePDF(name, calcResult.pwaFinal, calcResult.tarif, finalPrice, customPrice != null);
  }

  function buildInvoicePDF(clientName, pwa, tarif, totalPrice, isCustom) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const TEAL=[14,116,144], GOLD=[193,140,40], WHITE=[255,255,255];
    const DARK=[17,17,17], GRAY=[136,136,136];

    doc.setFillColor(...TEAL);
    doc.rect(0,0,W,38,'F');
    doc.setFillColor(...GOLD);
    doc.rect(0,36,W,2,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.setTextColor(...WHITE);
    doc.text('LES CAYES DROPSHIPPING', W/2, 14, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('Service de livraison & importation', W/2, 21, {align:'center'});
    doc.setFontSize(7.5);
    doc.setTextColor(200,220,220);
    doc.text('+509 31 01 39 68  |  lescayesdropshipping@gmail.com', W/2, 28, {align:'center'});
    doc.text('USA: 14030 NW 5th Pl North  |  Haïti: Camp-Perrin, Matinière', W/2, 33, {align:'center'});

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

    let y = 68;
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

    y = 100;
    doc.setFillColor(...TEAL);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('Description', 14, y+1);
    doc.text('Pwa', W-55, y+1);
    doc.text('Total', W-13, y+1, {align:'right'});

    y += 14;
    doc.setFillColor(230,245,248);
    doc.rect(10,y-5,W-20,10,'F');
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text('Livrezon LCD', 14, y+1);
    doc.text(pwa.toFixed(2)+' lbs', W-55, y+1);
    doc.text('$'+(pwa * tarif).toFixed(2), W-13, y+1, {align:'right'});

    y += 18;
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(.5);
    doc.line(10,y,W-10,y);
    y += 8;
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text('TOTAL ($) :', W-50, y+1);
    doc.setFontSize(12);
    doc.text('$ ' + totalPrice.toFixed(2), W-13, y+2, {align:'right'});
    if (isCustom) {
      y += 8;
      doc.setFont('helvetica','italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('(Pri ajiste pa ajan)', W-13, y, {align:'right'});
    }

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

    const sx = W/2+2;
    doc.setFillColor(240,248,250);
    doc.rect(sx,y-5,W-sx-10,28,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Autorisé par :', sx+4, y+1);
    doc.setFont('helvetica','bolditalic');
    doc.setFontSize(18);
    doc.setTextColor(...DARK);
    doc.text('Thomas', sx+8, y+16);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEAL);
    doc.text('Thomas Kabé — Agent Sud', sx+4, y+22);
    doc.text('Les Cayes Dropshipping', sx+4, y+27);

    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Merci pour votre confiance · Les Cayes Dropshipping', W/2, fY, {align:'center'});

    doc.save('invoice-lcd-'+clientName.replace(/\s+/g,'-')+'-'+Date.now()+'.pdf');
    showToast('🧾 Fich telechaje!');
  }

  return { calcLive, runCalc, clearCalc, renderCalcHistory, genInvoiceLCD };
})();
