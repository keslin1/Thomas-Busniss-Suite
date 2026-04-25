/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v4
   Kalkimatris · Sistèm POS & Fakti PDF
   ══════════════════════════════════════════════

   RÈGLEMAN KALKIL :
   • Pwa Volimik  = (L × l × H) / 4000  [cm → lb]
   • Pwa Final    = PwaVol + PwaBalans
   • Tarif fiks   = $4.90/lb
   • Minimòm      = $25.00 sof si Pri Espesyal
   • Total        = PrixSèvis + BalRès − BalPaye
   • Afichaj      = $XX.XX  +  XXXX HTG (135 HTG/$)
   ══════════════════════════════════════════════ */

const POS_KEY    = 'tbs_pos_history';
const POS_MAX    = 12;
const MIN_CHARGE = 25.00;
const TARIF_LB   = 4.90;
const HTG_RATE   = 135;

/* ── Estokaj ─────────────────────────────────── */
function getPosHistory() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || []; }
  catch { return []; }
}

function savePosHistory(list) {
  localStorage.setItem(POS_KEY, JSON.stringify(list));
}

/* ── Estokaj kliyan pou otokomplè ─────────────── */
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

/* ── Kalkil an dirèk ─────────────────────────── */
function calcLive() {
  const L           = parseFloat(document.getElementById('posL')?.value)           || 0;
  const W           = parseFloat(document.getElementById('posW')?.value)           || 0;
  const H           = parseFloat(document.getElementById('posH')?.value)           || 0;
  const realWeight  = parseFloat(document.getElementById('posWeight')?.value)      || 0;
  const customPrice = parseFloat(document.getElementById('posCustomPrice')?.value) || 0;
  const balRest     = parseFloat(document.getElementById('posDebt')?.value)        || 0;
  const balPaye     = parseFloat(document.getElementById('posChange')?.value)      || 0;

  /* Pwa Volimik : divize pa 4000 (estanda ayeryen cm3 -> lb) */
  const volWeight   = (L * W * H) / 4000;

  /* Pwa Final = volimik + balans */
  const finalWeight = volWeight + realWeight;

  let subtotal    = 0;
  let servicePrix = 0;
  let tarifApplied = TARIF_LB;

  if (customPrice > 0) {
    subtotal     = customPrice;
    servicePrix  = customPrice;
    tarifApplied = 0;
  } else if (finalWeight > 0) {
    const brut  = finalWeight * TARIF_LB;
    subtotal    = brut;
    servicePrix = brut < MIN_CHARGE ? MIN_CHARGE : brut;
  }

  /* Total = PrixServis + BalRes - BalPaye */
  const total    = Math.max(0, servicePrix + balRest - balPaye);
  const totalHTG = total * HTG_RATE;

  /* ── Afichaj ─────────────────────────────────── */
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',   volWeight > 0   ? volWeight.toFixed(2) + ' lb'   : '- lb');
  setTxt('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '- lb');
  setTxt('resTarif',       customPrice > 0 ? 'Pri espesyal' : (finalWeight > 0 ? '$' + TARIF_LB.toFixed(2) + '/lb' : '-'));
  setTxt('resSubtotal',    subtotal > 0    ? '$' + subtotal.toFixed(2)      : '-');
  setTxt('resService',     servicePrix > 0 ? '$' + servicePrix.toFixed(2)   : '-');
  setTxt('resTotal',       '$' + total.toFixed(2));
  setTxt('resTotalHTG',    totalHTG.toFixed(0) + ' HTG');

  /* Endikasyon minimom */
  const minBadge = document.getElementById('resMinBadge');
  if (minBadge) {
    if (customPrice <= 0 && finalWeight > 0 && (finalWeight * TARIF_LB) < MIN_CHARGE) {
      minBadge.style.display = 'inline-block';
    } else {
      minBadge.style.display = 'none';
    }
  }

  return { volWeight, finalWeight, tarifApplied, subtotal, servicePrix, total, totalHTG, balRest, balPaye, customPrice, realWeight };
}

/* ── Otokomplete kliyan ───────────────────────── */
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
        calcLive();
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

/* ── Jenere Fakti PDF ─────────────────────────── */
function generatePOSInvoice() {
  const clientName = (document.getElementById('posClientName')?.value   || '').trim();
  const clientAddr = (document.getElementById('posClientAddress')?.value || '').trim();
  const desc       = (document.getElementById('posDescription')?.value   || '').trim();
  const noteField  = (document.getElementById('posNote')?.value          || '').trim();

  const vals = calcLive();

  if (vals.finalWeight <= 0 && vals.customPrice <= 0 && !clientName) {
    showToast('Antre omwen pwa oswa non kliyan');
    return;
  }

  /* Nimewo fakti otomatik */
  const hist      = getPosHistory();
  const invoiceNo = String((hist.length > 0 ? (parseInt(hist[0].invoiceNo || '0') + 1) : 1)).padStart(3, '0');

  const entry = {
    id: uid(),
    invoiceNo,
    clientName, clientAddr, desc, note: noteField,
    ...vals,
    date: Date.now(),
  };

  hist.unshift(entry);
  if (hist.length > POS_MAX) hist.length = POS_MAX;
  savePosHistory(hist);
  savePosClient(clientName, clientAddr);

  buildPOSPdf(entry);
  showToast('Fakti #' + invoiceNo + ' jenere');
  renderPosHistory();
}

/* ══════════════════════════════════════════════
   BUILD PDF A4 — VERSION KORIJE KONPLÈ v5
   Chanjman :
   ✔ Fakti ranpli paj la antye (yon sèl ranje prensipal)
   ✔ Yon sèl deskripsyon nan tablo (maks 100 mo, pasaj liy otomatik)
   ✔ Non kliyan an gras + "Adrès: " devan adrès
   ✔ Antet aliye pwòp ak pwofesyonèl
   ✔ Watermark (logo transparan) nan sant zòn kontni paj la
   ✔ Pwa Balans + Pwa Volimik afiche klèman avèk "lb"
   ✔ Konvèsyon HTG vizib ak eleg anba total USD (135 HTG/$1)
   ✔ Tablo espasye pou evite chevauchement tèks
   ✔ Tou an Kreyòl Ayisyen
   ══════════════════════════════════════════════ */
function buildPOSPdf(e) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297;

  /* ── Palèt koulè LCD ────────────────────────── */
  const bruR = 101, bruG = 51,  bruB = 19;   // brun LCD
  const orR  = 212, orG  = 175, orB  = 55;   // lò
  const tqR  = 0,   tqG  = 150, tqB  = 166;  // touez

  /* ── Chaj logo ──────────────────────────────── */
  const loadLogo = () => new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 200;
      canvas.getContext('2d').drawImage(img, 0, 0, 200, 200);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = 'lescayesdropshipping.png';
  });

  loadLogo().then(imgData => {

    /* ══════════════════════════════════════════
       WATERMARK — nan sant zòn kontni paj la
       Mete l ANVAN tout kontni pou l rete dèyè
       ══════════════════════════════════════════ */
    if (imgData) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      const wmSize = 110;
      const wmX = (pw - wmSize) / 2;
      const wmY = (ph - wmSize) / 2 - 10;
      doc.addImage(imgData, 'PNG', wmX, wmY, wmSize, wmSize);
      doc.restoreGraphicsState();
    }

    /* ══════════════════════════════════════════
       1. ANTET — banye touez (0–46 mm)
       Logo agòch, tèks konpayi a mitan-gòch,
       Nimewo fakti + dat nan kwen dwat
       ══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, 0, pw, 46, 'F');

    /* Liy lò anba antet */
    doc.setFillColor(orR, orG, orB);
    doc.rect(0, 46, pw, 2, 'F');

    /* Logo */
    if (imgData) {
      doc.addImage(imgData, 'PNG', 8, 7, 30, 30);
    }

    /* Non konpayi */
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 44, 17);

    /* Adres sou 3 liy */
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 242, 248);
    doc.text('USA: 14030 NW 5th Pl North, Miami, FL', 44, 25);
    doc.text('Ayiti: Potoprens · Okap · Miragwan · Okay · Kan-Peren · Leyogan · Jeremi', 44, 31);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 37);

    /* Nimewo fakti + dat — kwen dwat antet */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FAKTI  #' + (e.invoiceNo || '-'), pw - 10, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 242, 248);
    doc.text('Dat: ' + dateTxt, pw - 10, 27, { align: 'right' });

    /* ══════════════════════════════════════════
       2. BLOK KLIYAN (58–82 mm)
       Non an gras majiskil, Adrès avèk prefiks "Adrès: "
       ══════════════════════════════════════════ */
    let y = 60;

    if (e.clientName) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 15, 15);
      doc.text(e.clientName.toUpperCase(), 14, y);
      y += 8;
    }

    if (e.clientAddr) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Adrès: ' + e.clientAddr, 14, y);
      y += 7;
    }

    /* Liy lò separatè anba blok kliyan */
    y += 2;
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.7);
    doc.line(14, y, pw - 14, y);
    y += 10;

    /* ══════════════════════════════════════════
       3. ANTET TABLO
       Kolòn: Deskripsyon | Pwa Balans | Pwa Volimik | Montan
       ══════════════════════════════════════════ */
    const tableW   = pw - 28;       // 182 mm (maji 14 mm chak bò)
    const colDesc  = 14;            // bò gòch Deskripsyon
    const colBal   = 119;           // sant Pwa Balans
    const colVol   = 152;           // sant Pwa Volimik
    const colMontX = pw - 12;       // bò dwat Montan
    const tblHeaderH = 12;

    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(14, y, tableW, tblHeaderH, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const hY = y + 8;
    doc.text('Deskripsyon',  colDesc + 4,  hY);
    doc.text('Pwa Balans',   colBal,        hY, { align: 'center' });
    doc.text('Pwa Volimik',  colVol,        hY, { align: 'center' });
    doc.text('Montan',       colMontX,      hY, { align: 'right'  });
    y += tblHeaderH;

    /* ══════════════════════════════════════════
       4. RANJE PRENSIPAL — yon sèl fwa (pa de fwa)
       Deskripsyon (maks 100 mo, pasaj liy otomatik)
       Pwa Balans | Pwa Volimik avèk "lb"
       ══════════════════════════════════════════ */
    const rawDesc   = (e.desc || 'Sèvis lojistik');
    const words     = rawDesc.split(/\s+/);
    const shortDesc = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');

    const pwaBalansVal = (e.realWeight > 0 ? e.realWeight.toFixed(2) : '0.00') + ' lb';
    const pwaVolimVal  = (e.volWeight  > 0 ? e.volWeight.toFixed(2)  : '0.00') + ' lb';
    const montant      = '$' + (e.servicePrix || 0).toFixed(2);

    doc.setFontSize(8.5);
    const descMaxW   = 88;
    const descSplits = doc.splitTextToSize(shortDesc, descMaxW);
    /* Wotè ranje = nombre liy × 5.5 mm + pading vètikal 10 mm min */
    const mainRowH   = Math.max(descSplits.length * 5.5 + 10, 18);

    /* Fond ranje */
    doc.setFillColor(252, 250, 245);
    doc.rect(14, y, tableW, mainRowH, 'F');

    /* Sèpasyon kolòn (liy vètikal leje) */
    doc.setDrawColor(210, 200, 185);
    doc.setLineWidth(0.25);
    const colSepY1 = y;
    const colSepY2 = y + mainRowH;
    doc.line(colBal - 15, colSepY1, colBal - 15, colSepY2);
    doc.line(colVol - 12, colSepY1, colVol - 12, colSepY2);
    doc.line(colMontX - 18, colSepY1, colMontX - 18, colSepY2);

    /* Tèks Deskripsyon — aliye anlè ranje + pading 5 mm */
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(descSplits, colDesc + 4, y + 7);

    /* Pwa Balans + Pwa Volimik + Montan — aliye mitan vètikal ranje */
    const midRow = y + mainRowH / 2 + 1.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(35, 35, 35);
    doc.text(pwaBalansVal, colBal, midRow, { align: 'center' });
    doc.text(pwaVolimVal,  colVol, midRow, { align: 'center' });
    doc.setFontSize(9.5);
    doc.setTextColor(bruR, bruG, bruB);
    doc.text(montant, colMontX, midRow, { align: 'right' });

    y += mainRowH;

    /* ══════════════════════════════════════════
       5. RANJE BALANS RÈS + BALANS PEYE
       ══════════════════════════════════════════ */
    const extraRows = [];
    if (e.balRest > 0) extraRows.push(['Balans rès',  '+$' + e.balRest.toFixed(2)]);
    if (e.balPaye > 0) extraRows.push(['Balans peye', '-$' + e.balPaye.toFixed(2)]);

    extraRows.forEach((r, i) => {
      if (y > ph - 100) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 246 : 255, i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 243 : 255);
      doc.rect(14, y, tableW, 10, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(r[0], colDesc + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(bruR, bruG, bruB);
      doc.text(r[1], colMontX, y + 7, { align: 'right' });
      y += 10;
    });

    y += 4;

    /* ══════════════════════════════════════════
       6. SOUBTOTAL
       ══════════════════════════════════════════ */
    doc.setFillColor(235, 228, 213);
    doc.rect(14, y, tableW, 11, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 40, 10);
    doc.text('Soubtotal', colDesc + 4, y + 7.5);
    doc.text('$' + (e.subtotal || 0).toFixed(2), colMontX, y + 7.5, { align: 'right' });
    y += 16;

    /* ══════════════════════════════════════════
       7. TOTAL FINAL USD (bannè brun)
       ══════════════════════════════════════════ */
    doc.setFillColor(bruR, bruG, bruB);
    doc.rect(14, y, tableW, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL FINAL', colDesc + 4, y + 9.5);
    doc.text('$' + (e.total || 0).toFixed(2), colMontX, y + 9.5, { align: 'right' });
    y += 14;

    /* ══════════════════════════════════════════
       8. KONVÈSYON HTG — bannè lò, trè vizib
       Taux: 135 HTG / $1
       ══════════════════════════════════════════ */
    const totalHTG = Math.round((e.total || 0) * 135);
    doc.setFillColor(245, 230, 180);
    doc.rect(14, y, tableW, 14, 'F');
    doc.setTextColor(30, 15, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Valè an Goud (135 HTG / $1)', colDesc + 4, y + 9.5);
    doc.setFontSize(12);
    doc.text(totalHTG.toLocaleString('en-US') + ' HTG', colMontX, y + 9.5, { align: 'right' });
    y += 20;

    /* ══════════════════════════════════════════
       9. ZON NOT
       ══════════════════════════════════════════ */
    if (e.note) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(70, 70, 70);
      const noteLines = doc.splitTextToSize('Not: ' + e.note, tableW);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5.5 + 6;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(160, 150, 135);
      doc.text('Not:', 14, y);
      doc.setDrawColor(200, 190, 175);
      doc.setLineWidth(0.3);
      doc.line(28, y, pw - 14, y);
      y += 7;
      doc.line(14, y, pw - 14, y);
      y += 9;
    }

    /* ══════════════════════════════════════════
       10. KONDISYON PEMAN
       ══════════════════════════════════════════ */
    doc.setFillColor(246, 242, 236);
    doc.rect(14, y, tableW, 26, 'F');
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.rect(14, y, tableW, 26);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bruR, bruG, bruB);
    doc.text('Patnè fyab ou pou pwojè komès ak livrezon USA-Ayiti', 19, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    doc.text('Achte sou entènèt avèk nou ak konfyans ak sekirite.', 19, y + 16);
    doc.text('Mòd peman: Natcash · Sogebank · Zelle  ·  Taux: 135 goud pou $1', 19, y + 22);
    y += 31;

    /* ══════════════════════════════════════════
       11. SIYATI
       ══════════════════════════════════════════ */
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Siyati kliyan:', 14, y + 6);
    doc.setDrawColor(160, 150, 135);
    doc.setLineWidth(0.3);
    doc.line(14, y + 15, 82, y + 15);

    doc.setFontSize(13);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(40, 20, 5);
    doc.text('Responsab Sid (Thomas Kabe)', pw - 14, y + 6, { align: 'right' });
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(pw - 14, y + 10, pw - 14 - 82, y + 10);
    y += 22;

    /* ══════════════════════════════════════════
       12. PYE PAJ — bannè touez tout lajè
       ══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Les Cayes Dropshipping  ·  lescayesdropshipping@gmail.com  ·  +509 31 01 39 68  ·  Kan-Peren, Okay, Ayiti',
      pw / 2, ph - 5.5, { align: 'center' }
    );

    /* Sove PDF */
    const fname = 'Fakti-LCD-' + (e.clientName || 'Kliyan').replace(/\s+/g, '_') + '-' + (e.invoiceNo || Date.now()) + '.pdf';
    doc.save(fname);
  });
}

/* ── Afiche Istwa Fakti ───────────────────────── */
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
          <div style="font-size:0.9rem;font-weight:600;color:#ddd8cc;">${h.clientName || '-'}</div>
          ${h.clientAddr ? `<div style="font-size:0.72rem;color:rgba(200,190,175,0.5);">Adres: ${h.clientAddr}</div>` : ''}
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">
            #${h.invoiceNo || '-'} · ${new Date(h.date).toLocaleDateString('fr-HT',{day:'2-digit',month:'2-digit',year:'numeric'})}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Space Mono',monospace;font-size:0.95rem;color:#d4af37;">$${(h.total||0).toFixed(2)}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);font-style:italic;">
            ${Math.round((h.total||0)*HTG_RATE).toLocaleString('fr-HT')} HTG
          </div>
          <button onclick='buildPOSPdf(${JSON.stringify(h).replace(/'/g,"&#39;")})' 
            style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">
            PDF
          </button>
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

/* ── Efase fomilè ────────────────────────────── */
function clearPosForm() {
  ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange',
   'posClientName','posClientAddress','posDescription','posNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  calcLive();
  showToast('Fomilè efase');
}

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initPosAutocomplete();

  const liveFields = ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange'];
  liveFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcLive);
  });
});
