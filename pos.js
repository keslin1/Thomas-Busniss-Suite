/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v4
   Jeneratè Fich · Sistèm POS & Fakti PDF
   ══════════════════════════════════════════════

   RÈGLEMAN KALKIL :
   • Pwa Volimik  = (L × l × H) / 4000  [cm → lb]
   • Pwa Final    = PwaVol + PwaBalans
   • Tarif fiks   = $4.90/lb
   • Minimòm      = $25.00 sof si Pri Espesyal
   • Total        = PrixSèvis + BalRès − BalPaye
   • Afichaj      = $XX.XX  +  XXXX HTG (135 HTG/$)
   ══════════════════════════════════════════════ */

const POS_KEY     = 'tbs_pos_history';
const ACHA_KEY    = 'tbs_acha_history';
const POS_MAX     = 12;
const MIN_CHARGE  = 25.00;
const TARIF_LB    = 4.90;
const HTG_RATE    = 135;

/* ── Tab aktif kouran ─────────────────────────── */
let currentPosTab = 'shipping';

function switchPosTab(tab) {
  currentPosTab = tab;

  const shippingPane = document.getElementById('posTabShipping');
  const achaPane     = document.getElementById('posTabAcha');
  const btnShipping  = document.getElementById('tabBtnShipping');
  const btnAcha      = document.getElementById('tabBtnAcha');

  if (tab === 'shipping') {
    shippingPane.style.display = '';
    achaPane.style.display     = 'none';
    btnShipping.classList.add('active');
    btnAcha.classList.remove('active');
  } else {
    shippingPane.style.display = 'none';
    achaPane.style.display     = '';
    btnAcha.classList.add('active');
    btnShipping.classList.remove('active');
    calcAchaLive();
  }
}

/* ── Estokaj ─────────────────────────────────── */
function getPosHistory() {
  try { return JSON.parse(localStorage.getItem(POS_KEY)) || []; }
  catch { return []; }
}

function savePosHistory(list) {
  localStorage.setItem(POS_KEY, JSON.stringify(list));
}

/* ── Estokaj istwa Fich Acha ──────────────────── */
function getAchaHistory() {
  try { return JSON.parse(localStorage.getItem(ACHA_KEY)) || []; }
  catch { return []; }
}

function saveAchaHistory(list) {
  localStorage.setItem(ACHA_KEY, JSON.stringify(list));
}

/* ── Kalkil Fich Acha an dirèk ───────────── */
function calcAchaLive() {
  const achatUsine   = parseFloat(document.getElementById('achaPrixUsine')?.value)    || 0;
  const expedUSA     = parseFloat(document.getElementById('achaExpedUSA')?.value)     || 0;
  const shippingHT   = parseFloat(document.getElementById('achaShippingHaiti')?.value) || 0;

  const sousTotal  = achatUsine + expedUSA;
  const grandTotal = sousTotal + shippingHT;

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('resSousTotal',  '$' + sousTotal.toFixed(2));
  set('resGrandTotal', '$' + grandTotal.toFixed(2));
}

/* ── Jenere Fich Acha ───────────────── */
function generateAchaInvoice() {
  const clientName   = (document.getElementById('achaClientName')?.value     || '').trim();
  const clientAddr   = (document.getElementById('achaClientAddress')?.value  || '').trim();
  const clientPhone  = (document.getElementById('achaClientPhone')?.value    || '').trim();
  const desc         = (document.getElementById('achaDescription')?.value    || '').trim();
  const note         = (document.getElementById('achaNoteExplication')?.value|| '').trim();
  const dateCommande = (document.getElementById('achaDateCommande')?.value   || '');
  const dateExped    = (document.getElementById('achaDateExped')?.value      || '');
  const delaiUSA     = (document.getElementById('achaDelaiUSA')?.value       || '').trim();
  const achatUsine   = parseFloat(document.getElementById('achaPrixUsine')?.value)     || 0;
  const expedUSA     = parseFloat(document.getElementById('achaExpedUSA')?.value)      || 0;
  const shippingHT   = parseFloat(document.getElementById('achaShippingHaiti')?.value) || 0;
  const sousTotal    = achatUsine + expedUSA;
  const grandTotal   = sousTotal + shippingHT;

  if (!clientName && grandTotal <= 0) {
    showToast('Antre omwen non kliyan oswa montan yo');
    return;
  }

  const hist      = getAchaHistory();
  const invoiceNo = String((hist.length > 0 ? (parseInt(hist[0].invoiceNo || '0') + 1) : 1)).padStart(3, '0');

  const entry = {
    id: uid(), type: 'acha', invoiceNo,
    clientName, clientAddr, clientPhone, desc, note,
    dateCommande, dateExped, delaiUSA,
    achatUsine, expedUSA, shippingHT, sousTotal, grandTotal,
    date: Date.now()
  };

  hist.unshift(entry);
  if (hist.length > POS_MAX) hist.length = POS_MAX;
  saveAchaHistory(hist);

  buildAchaPdf(entry);
  showToast('Fich Acha #' + invoiceNo + ' jenere');
  renderPosHistory();
}

/* ── Efase fomilè Acha ───────────────────── */
function clearAchaForm() {
  ['achaClientName','achaClientAddress','achaClientPhone',
   'achaDescription','achaDateCommande','achaDateExped','achaDelaiUSA',
   'achaPrixUsine','achaExpedUSA','achaShippingHaiti','achaNoteExplication']
  .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  calcAchaLive();
  showToast('Fomilè efase');
}

/* ══════════════════════════════════════════════
   BUILD PDF FICH ACHA — LCD branding
   ══════════════════════════════════════════════ */
function buildAchaPdf(e) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297;

  const bruR = 101, bruG = 51,  bruB = 19;
  const orR  = 212, orG  = 175, orB  = 55;
  const tqR  = 0,   tqG  = 150, tqB  = 166;

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

    /* ── Watermark ── */
    if (imgData) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      const wmSize = 110;
      doc.addImage(imgData, 'PNG', (pw - wmSize) / 2, (ph - wmSize) / 2 - 10, wmSize, wmSize);
      doc.restoreGraphicsState();
    }

    /* ══ 1. ANTET ══ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, 0, pw, 46, 'F');
    doc.setFillColor(orR, orG, orB);
    doc.rect(0, 46, pw, 2, 'F');

    if (imgData) doc.addImage(imgData, 'PNG', 8, 7, 30, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 44, 17);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 242, 248);
    doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
    doc.text('Haiti: Pòtoprens · Okap · Miragwàn · Okay · Kan-Peren · Leyogàn · Jeremi', 44, 31);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 37);

    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' });
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('FICH ACHA  lcd' + String(e.invoiceNo || '0').padStart(4, '0'), pw - 10, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 242, 248);
    doc.text('Dat: ' + dateTxt, pw - 10, 27, { align: 'right' });

    doc.setFillColor(orR, orG, orB);
    doc.roundedRect(pw - 62, 32, 50, 10, 3, 3, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 40, 10);
    doc.text('FICH ACHA', pw - 37, 38.5, { align: 'center' });

    /* ══ 2. BLOK KLIYAN ══ */
    let y = 60;
    if (e.clientName) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 15, 15);
      doc.text(e.clientName.toUpperCase(), 14, y); y += 8;
    }
    if (e.clientAddr) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      doc.text('Adrès: ' + e.clientAddr, 14, y); y += 6;
    }
    if (e.clientPhone) {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      doc.text('Tél: ' + e.clientPhone, 14, y); y += 6;
    }
    y += 2;
    doc.setDrawColor(orR, orG, orB); doc.setLineWidth(0.7);
    doc.line(14, y, pw - 14, y); y += 10;

    const tableW   = pw - 28;
    const colMontX = pw - 12;

    /* ══ 3. DESKRIPSYON + DATES ══ */
    if (e.desc) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
      doc.text('Deskripsyon machandiz:', 14, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
      const descLines = doc.splitTextToSize(e.desc, tableW);
      doc.text(descLines, 14, y); y += descLines.length * 5.5 + 4;
    }

    const fmtD = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('fr-HT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
    if (e.dateCommande || e.dateExped || e.delaiUSA) {
      doc.setFillColor(246, 250, 252); doc.rect(14, y, tableW, 22, 'F');
      doc.setDrawColor(tqR, tqG, tqB); doc.setLineWidth(0.4); doc.rect(14, y, tableW, 22);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(tqR, tqG, tqB);
      doc.text('Dat kòmand usine:', 18, y + 8);
      doc.text('Dat ekspedisyon usine:', 18, y + 15);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
      doc.text(fmtD(e.dateCommande), colMontX, y + 8,  { align: 'right' });
      doc.text(fmtD(e.dateExped),    colMontX, y + 15, { align: 'right' });
      y += 22;
      if (e.delaiUSA) {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80);
        doc.text('Delè estimé pou ariv nan USA: ' + e.delaiUSA, 14, y + 5); y += 10;
      }
      y += 6;
    }

    /* ══ 4A. BLOK ACHA ORIJEN ══ */
    doc.setFillColor(tqR, tqG, tqB); doc.rect(14, y, tableW, 12, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Acha Orijen  (Alibaba / Usine)', 18, y + 8); y += 12;

    doc.setFillColor(252, 250, 245); doc.rect(14, y, tableW, 11, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text('Pri acha nan usine', 18, y + 7.5);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
    doc.text('$' + (e.achatUsine || 0).toFixed(2), colMontX, y + 7.5, { align: 'right' }); y += 11;

    doc.setFillColor(248, 252, 252); doc.rect(14, y, tableW, 11, 'F');
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text('Frè ekspedisyon  usine → USA', 18, y + 7.5);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(tqR, tqG, tqB);
    doc.text('$' + (e.expedUSA || 0).toFixed(2), colMontX, y + 7.5, { align: 'right' }); y += 11;

    doc.setFillColor(235, 245, 250); doc.rect(14, y, tableW, 13, 'F');
    doc.setDrawColor(tqR, tqG, tqB); doc.setLineWidth(0.3); doc.rect(14, y, tableW, 13);
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(tqR, tqG, tqB);
    doc.text('SOUS-TOTAL ACHA', 18, y + 9);
    doc.text('$' + (e.sousTotal || 0).toFixed(2), colMontX, y + 9, { align: 'right' }); y += 19;

    /* ══ 4B. BLOK LIVREZON LOKAL ══ */
    doc.setFillColor(bruR, bruG, bruB); doc.rect(14, y, tableW, 12, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('Livrezon Lokal  (USA → Ayiti)', 18, y + 8); y += 12;

    doc.setFillColor(252, 248, 242); doc.rect(14, y, tableW, 11, 'F');
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    const htLabel = (e.shippingHT || 0) > 0 ? 'Frè shipping USA → Ayiti' : 'Frè shipping USA → Ayiti (poko kofime)';
    doc.text(htLabel, 18, y + 7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor((e.shippingHT || 0) > 0 ? bruR : 160, (e.shippingHT || 0) > 0 ? bruG : 130, (e.shippingHT || 0) > 0 ? bruB : 80);
    doc.text((e.shippingHT || 0) > 0 ? '$' + e.shippingHT.toFixed(2) : '—', colMontX, y + 7.5, { align: 'right' }); y += 11;

    doc.setFillColor(255, 243, 196); doc.rect(14, y, tableW, 16, 'F');
    doc.setTextColor(101, 51, 19); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', 18, y + 10.5);
    doc.text('$' + (e.grandTotal || 0).toFixed(2), colMontX, y + 10.5, { align: 'right' }); y += 22;

    /* ══ 5. NÒT ══ */
    if (e.note) {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(70, 70, 70);
      const noteLines = doc.splitTextToSize('Nòt: ' + e.note, tableW);
      doc.text(noteLines, 14, y); y += noteLines.length * 5.5 + 8;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(160, 150, 135);
      doc.text('Nòt:', 14, y);
      doc.setDrawColor(200, 190, 175); doc.setLineWidth(0.3);
      doc.line(28, y, pw - 14, y); y += 7;
      doc.line(14, y, pw - 14, y); y += 9;
    }

    /* ══ 6. MARKETING / ALIBABA ══ */
    const msg1 = 'Siw gen machandiz ki entèresew sou Alibaba, ou ka pataje link li avèk nou pou edew evalye pri l oswa achte li pou ou.';
    const msg2 = 'Les Cayes Dropshipping, nou se patnè fyab ou pou pwojè komès ak livrezon USA vers Haïti.';
    const msg1Lines = doc.splitTextToSize(msg1, tableW - 10);
    const boxH = msg1Lines.length * 5.5 + 20;
    doc.setFillColor(246, 242, 236); doc.rect(14, y, tableW, boxH, 'F');
    doc.setDrawColor(orR, orG, orB); doc.setLineWidth(0.5); doc.rect(14, y, tableW, boxH);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
    doc.text(msg1Lines, 19, y + 8);
    doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 50); doc.setFontSize(8);
    doc.text(msg2, 19, y + 8 + msg1Lines.length * 5.5 + 4);
    y += boxH + 6;

    /* ══ 7. SIYATI ══ */
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.text('Siyati kliyan:', 14, y + 6);
    doc.setDrawColor(160, 150, 135); doc.setLineWidth(0.3);
    doc.line(14, y + 15, 82, y + 15);
    doc.setFontSize(13); doc.setFont('times', 'bolditalic'); doc.setTextColor(40, 20, 5);
    doc.text('Thomas Kabé — Responsab Sid', pw - 14, y + 6, { align: 'right' });
    doc.setDrawColor(orR, orG, orB); doc.setLineWidth(0.5);
    doc.line(pw - 14, y + 10, pw - 14 - 90, y + 10);
    y += 22;

    /* ══ 8. PYE PAJ ══ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255);
    doc.text(
      'Les Cayes Dropshipping  ·  lescayesdropshipping@gmail.com  ·  +509 31 01 39 68  ·  Kan-Peren, Okay, Ayiti',
      pw / 2, ph - 5.5, { align: 'center' }
    );

    const clientSlug = (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
    const fname = 'FichAcha_' + clientSlug + '_lcd' + String(e.invoiceNo || '0').padStart(4, '0') + '.pdf';
    doc.save(fname);
  });
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

  /* Pwa Volimik : TOUJOU fòmil (L×W×H)/4000 — pa janm chanje pou customPrice */
  const volWeight   = (L * W * H) / 4000;

  /* Pwa Final = volimik + balans */
  const finalWeight = volWeight + realWeight;

  /* ── Fòmil definitif : (Pwa Reyèl × 4.90) × 2 ── */
  let subtotal    = 0;
  let discount    = 0;
  let discountPct = 0;
  let servicePrix = 0;

  if (realWeight > 0) {
    const brut = (realWeight * TARIF_LB) * 2;
    subtotal   = brut < MIN_CHARGE ? MIN_CHARGE : brut;
  }

  /* ── Si customPrice aktif : aplike l dirèkteman ── */
  if (customPrice > 0 && subtotal > 0) {
    servicePrix = customPrice;
  } else if (customPrice > 0 && subtotal === 0) {
    subtotal    = customPrice;
    servicePrix = customPrice;
  } else {
    servicePrix = subtotal;
  }

  /* Total = PrixServis + BalRes - BalPaye */
  const total    = Math.max(0, servicePrix + balRest - balPaye);
  const totalHTG = total * HTG_RATE;

  /* ── Afichaj ─────────────────────────────────── */
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',   volWeight > 0   ? volWeight.toFixed(2) + ' lb'   : '- lb');
  setTxt('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '- lb');
  setTxt('resTarif',       finalWeight > 0 ? '$' + TARIF_LB.toFixed(2) + '/lb' : '-');
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

  return { volWeight, finalWeight, subtotal, discount, discountPct, servicePrix, total, totalHTG, balRest, balPaye, customPrice, realWeight };
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
    dimL: parseFloat(document.getElementById('posL')?.value) || 0,
    dimW: parseFloat(document.getElementById('posW')?.value) || 0,
    dimH: parseFloat(document.getElementById('posH')?.value) || 0,
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
    doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
    doc.text('Haiti: Pòtoprens · Okap · Miragwàn · Okay · Kan-Peren · Leyogàn · Jeremi', 44, 31);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 37);

    /* Nimewo fakti + dat — kwen dwat antet */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FAKTI  lcd' + String(e.invoiceNo || '0').padStart(4, '0'), pw - 10, 18, { align: 'right' });
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
    doc.text('Scale Weight',   colBal,        hY, { align: 'center' });
    doc.text('DIM Weight',  colVol,        hY, { align: 'center' });
    doc.text('Amount',       colMontX,      hY, { align: 'right'  });
    y += tblHeaderH;

    /* ══════════════════════════════════════════
       4. RANJE PRENSIPAL — yon sèl fwa (pa de fwa)
       Deskripsyon (maks 100 mo, pasaj liy otomatik)
       Pwa Balans | Pwa Volimik avèk "lb"
       ══════════════════════════════════════════ */
    const rawDesc   = (e.desc || 'Sèvis lojistik');
    const words     = rawDesc.split(/\s+/);
    const shortDesc = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');

    /* ── Pwa Balans : toujou pwa reyèl ── */
    const pwaBalansVal = (e.realWeight > 0 ? e.realWeight.toFixed(2) : '0.00') + ' lb';

    /* ── Pwa Volimik : TOUJOU pwa reyèl (L×W×H)/4000 — pa janm ajiste ── */
    const displayVolWeight = e.volWeight || 0;

    /* Récupère L, W, H stockés dans l'entrée (si disponibles) */
    const dimL = e.dimL || 0;
    const dimW = e.dimW || 0;
    const dimH = e.dimH || 0;
    const hasDims = dimL > 0 && dimW > 0 && dimH > 0;

    /* Ligne 1 : dimensions (si dispo) — Ligne 2 : résultat lb */
    const volLine1 = hasDims ? `(${dimL}×${dimW}×${dimH})` : '';
    const volLine2 = displayVolWeight.toFixed(2) + ' lb';

    const montant = '$' + (e.subtotal || 0).toFixed(2);

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

    /* Pwa Balans — yon liy */
    doc.text(pwaBalansVal, colBal, midRow, { align: 'center' });

    /* Pwa Volimik — de liy si gen dimansyon, sinon yon liy */
    if (hasDims) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(volLine1, colVol, midRow - 3, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(volLine2, colVol, midRow + 3.5, { align: 'center' });
    } else {
      doc.text(volLine2, colVol, midRow, { align: 'center' });
    }

    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFontSize(9.5);
    doc.setTextColor(bruR, bruG, bruB);
    doc.text(montant, colMontX, midRow, { align: 'right' });
    doc.restoreGraphicsState();

    y += mainRowH;

    /* ══════════════════════════════════════════
       5. RANJE RÈS Balans + BALANS PEYE
       ══════════════════════════════════════════ */
    const extraRows = [];
    if (e.balRest > 0) extraRows.push(['Rès balans',  '+$' + e.balRest.toFixed(2)]);
    if (e.balPaye > 0) extraRows.push(['Balans peye', '-$' + e.balPaye.toFixed(2)]);

    extraRows.forEach((r, i) => {
      if (y > ph - 100) { doc.addPage(); y = 20; }
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
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
      doc.restoreGraphicsState();
      y += 10;
    });

    y += 4;

    /* ══════════════════════════════════════════
       6. RABÈ (si customPrice < subtotal) — ANVAN total, % sèlman
       ══════════════════════════════════════════ */
    const discount    = e.discount    || 0;
    const discountPct = e.discountPct || 0;
    if (discount > 0) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      doc.setFillColor(240, 255, 240);
      doc.rect(14, y, tableW, 11, 'F');
      doc.restoreGraphicsState();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      /* Tèks opasité 0.55 */
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      doc.setTextColor(30, 100, 30);
      doc.text('Discount', colDesc + 4, y + 7.5);
      doc.text('-' + discountPct + '%', colMontX, y + 7.5, { align: 'right' });
      doc.restoreGraphicsState();
      y += 13;
    }

    /* ══════════════════════════════════════════
       7. TOTAL (USD) — bannè prensipal (te rele "Sibtotal")
       Se liy ofisyèl final la (servicePrix aprè rabè)
       ══════════════════════════════════════════ */
doc.saveGraphicsState();
    doc.setFillColor(255, 243, 196);
    doc.rect(14, y, tableW, 16, 'F');
    doc.setTextColor(101, 51, 19);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total (USD)', colDesc + 4, y + 10.5);
    doc.text('$' + (e.servicePrix || 0).toFixed(2), colMontX, y + 10.5, { align: 'right' });
    doc.restoreGraphicsState();
    y += 16;

    /* ══════════════════════════════════════════
       8. TOTAL HTG — konvèsyon referans discrè
       ══════════════════════════════════════════ */
    const totalHTG = Math.round((e.total || 0) * 135);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFillColor(230, 225, 215);
    doc.rect(14, y, tableW, 11, 'F');
    doc.setTextColor(120, 100, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ekivalan HTG (135 HTG / $1)', colDesc + 4, y + 7.5);
    doc.setFontSize(9);
    doc.text('≈ ' + totalHTG.toLocaleString('en-US') + ' HTG', colMontX, y + 7.5, { align: 'right' });
    doc.restoreGraphicsState();
    y += 17;

    /* ══════════════════════════════════════════
       9. ZON NOT
       ══════════════════════════════════════════ */
    /* Not rabè otomatik : sèlman si customPrice < pri nòmal (realWeight×4.90×2) */
    const normalPrice  = Math.max((e.realWeight || 0) * 4.90 * 2, 25);
    const hasDiscount  = (e.customPrice > 0) && (e.customPrice < normalPrice);
    const autoNote     = hasDiscount
      ? 'Yon rabè espesyal aplike sou fakti sa a.'
      : '';
    const fullNote = [autoNote, e.note].filter(Boolean).join(' ');

    if (fullNote) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(hasDiscount ? 30 : 70, hasDiscount ? 100 : 70, hasDiscount ? 30 : 70);
      const noteLines = doc.splitTextToSize('Not: ' + fullNote, tableW);
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
    doc.text('Achte sou entènèt avè n ak konfyans.', 19, y + 16);
    doc.text('Mòd pèman: Cash · Natcash · Sogebank · Zelle', 19, y + 22);
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
    doc.text('Responsab Sid (Thomas Kabé)', pw - 14, y + 6, { align: 'right' });
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
    const clientSlug = (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
    const fname = 'Fakti_' + clientSlug + '_lcd' + String(e.invoiceNo || '0').padStart(4, '0') + '.pdf';
    doc.save(fname);
  });
}

function renderPosHistory() {
  const el = document.getElementById('posHistoryList');
  if (!el) return;

  const shipping = getPosHistory().map(h => ({ ...h, _type: 'shipping' }));
  const acha     = getAchaHistory().map(h => ({ ...h, _type: 'acha' }));
  const list     = [...shipping, ...acha].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 20);

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.85rem;">Okenn fich ankò.</div>`;
    return;
  }

  el.innerHTML = list.map(h => {
    const isAcha  = h._type === 'acha';
    const badge   = isAcha
      ? `<span style="font-size:0.62rem;background:rgba(212,175,55,0.2);color:#d4af37;border-radius:4px;padding:1px 5px;margin-left:5px;">ACHA</span>`
      : `<span style="font-size:0.62rem;background:rgba(0,150,166,0.2);color:#00acc1;border-radius:4px;padding:1px 5px;margin-left:5px;">SHIPPING</span>`;
    const amount  = isAcha ? (h.balance || 0) : (h.total || 0);
    const label   = isAcha ? 'Balance dwe' : 'Total';
    const pdfCall = isAcha
      ? `buildAchaPdf(${JSON.stringify(h).replace(/'/g, "&#39;")})`
      : `buildPOSPdf(${JSON.stringify(h).replace(/'/g, "&#39;")})`;
    const dateStr = new Date(h.date).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' });

    return `
    <div class="pos-history-item" style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <div style="font-size:0.9rem;font-weight:600;color:#ddd8cc;">${h.clientName || '-'}${badge}</div>
          ${h.clientAddr ? `<div style="font-size:0.72rem;color:rgba(200,190,175,0.5);">${h.clientAddr}</div>` : ''}
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">
            #${h.invoiceNo || '-'} · ${dateStr}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:0.62rem;color:rgba(200,190,175,0.45);margin-bottom:1px;">${label}</div>
          <div style="font-family:'Space Mono',monospace;font-size:0.95rem;color:#d4af37;">$${amount.toFixed(2)}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);font-style:italic;">
            ${Math.round(amount * HTG_RATE).toLocaleString('fr-HT')} HTG
          </div>
          <button onclick='${pdfCall}'
            style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">
            PDF
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── Efase fomilè (tab-aware) ────────────────── */
function clearPosForm() {
  if (currentPosTab === 'acha') {
    clearAchaForm();
  } else {
    ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange',
     'posClientName','posClientAddress','posDescription','posNote'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    calcLive();
    showToast('Fomilè efase');
  }
}

/* ══════════════════════════════════════════════
   BUILD PDF FICH ACHA — menm branding LCD
   ══════════════════════════════════════════════ */
function buildAchaPdf(e) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297;

  /* Palèt koulè LCD */
  const bruR = 101, bruG = 51,  bruB = 19;
  const orR  = 212, orG  = 175, orB  = 55;
  const tqR  = 0,   tqG  = 150, tqB  = 166;

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

    /* ── Watermark ── */
    if (imgData) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.07 }));
      const wmSize = 110;
      doc.addImage(imgData, 'PNG', (pw - wmSize) / 2, (ph - wmSize) / 2 - 10, wmSize, wmSize);
      doc.restoreGraphicsState();
    }

    /* ══ 1. ANTET (banye touez, 0–46 mm) ══ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, 0, pw, 46, 'F');
    doc.setFillColor(orR, orG, orB);
    doc.rect(0, 46, pw, 2, 'F');

    if (imgData) doc.addImage(imgData, 'PNG', 8, 7, 30, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 44, 17);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 242, 248);
    doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
    doc.text('Haiti: Pòtoprens · Okap · Miragwàn · Okay · Kan-Peren · Leyogàn · Jeremi', 44, 31);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 37);

    /* Nimewo & date */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FICH ACHA  lcd' + String(e.invoiceNo || '0').padStart(4, '0'), pw - 10, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(220, 242, 248);
    doc.text('Dat: ' + dateTxt, pw - 10, 27, { align: 'right' });

    /* Badj "FICH ACHA" */
    doc.setFillColor(orR, orG, orB);
    doc.roundedRect(pw - 50, 32, 38, 10, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 40, 10);
    doc.text('FICH ACHA', pw - 31, 38.5, { align: 'center' });

    /* ══ 2. BLOK KLIYAN (60–88 mm) ══ */
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
      y += 6;
    }
    if (e.clientPhone) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text('Tél: ' + e.clientPhone, 14, y);
      y += 6;
    }

    y += 2;
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.7);
    doc.line(14, y, pw - 14, y);
    y += 10;

    const tableW   = pw - 28;
    const colMontX = pw - 12;

    /* ══ 3. DESKRIPSYON ACHA ══ */
    if (e.desc) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bruR, bruG, bruB);
      doc.text('Deskripsyon acha:', 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      const descLines = doc.splitTextToSize(e.desc, tableW);
      doc.text(descLines, 14, y);
      y += descLines.length * 5.5 + 6;
    }

    /* ══ 4. TABLEAU MONTANTS ══ */

    /* Antet tablo */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(14, y, tableW, 12, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Detay pèman', 18, y + 8);
    doc.text('Montan (USD)', colMontX, y + 8, { align: 'right' });
    y += 12;

    /* Ranje: Total acha */
    doc.setFillColor(252, 250, 245);
    doc.rect(14, y, tableW, 12, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text('Total acha', 18, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bruR, bruG, bruB);
    doc.text('$' + (e.totalAcha || 0).toFixed(2), colMontX, y + 8, { align: 'right' });
    y += 12;

    /* Ranje: Montan peye */
    doc.setFillColor(242, 248, 242);
    doc.rect(14, y, tableW, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text('Montan kliyan peye', 18, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 30);
    doc.text('- $' + (e.montPaye || 0).toFixed(2), colMontX, y + 8, { align: 'right' });
    y += 12;

    /* Bannè Balance dwe */
    doc.setFillColor(255, 243, 196);
    doc.rect(14, y, tableW, 16, 'F');
    doc.setTextColor(101, 51, 19);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance dwe', 18, y + 10.5);
    doc.text('$' + (e.balance || 0).toFixed(2), colMontX, y + 10.5, { align: 'right' });
    y += 16;

    /* HTG */
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFillColor(230, 225, 215);
    doc.rect(14, y, tableW, 11, 'F');
    doc.setTextColor(120, 100, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ekivalan HTG (' + HTG_RATE + ' HTG / $1)', 18, y + 7.5);
    doc.setFontSize(9);
    doc.text('≈ ' + (e.balHTG || 0).toLocaleString('en-US') + ' HTG', colMontX, y + 7.5, { align: 'right' });
    doc.restoreGraphicsState();
    y += 17;

    /* ══ 5. NÒT / EKSPLIKASYON ══ */
    if (e.note) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(70, 70, 70);
      const noteLines = doc.splitTextToSize('Nòt: ' + e.note, tableW);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5.5 + 8;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(160, 150, 135);
      doc.text('Nòt:', 14, y);
      doc.setDrawColor(200, 190, 175);
      doc.setLineWidth(0.3);
      doc.line(28, y, pw - 14, y);
      y += 7;
      doc.line(14, y, pw - 14, y);
      y += 9;
    }

    /* ══ 6. KONDISYON PEMAN ══ */
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
    doc.text('Achte sou entènèt avè n ak konfyans.', 19, y + 16);
    doc.text('Mòd pèman: Cash · Natcash · Sogebank · Zelle', 19, y + 22);
    y += 31;

    /* ══ 7. SIYATI ══ */
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
    doc.text('Responsab Sid (Thomas Kabé)', pw - 14, y + 6, { align: 'right' });
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(pw - 14, y + 10, pw - 14 - 82, y + 10);

    /* ══ 8. PYE PAJ ══ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Les Cayes Dropshipping  ·  lescayesdropshipping@gmail.com  ·  +509 31 01 39 68  ·  Kan-Peren, Okay, Ayiti',
      pw / 2, ph - 5.5, { align: 'center' }
    );

    const clientSlug = (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
    const fname = 'FichAcha_' + clientSlug + '_lcd' + String(e.invoiceNo || '0').padStart(4, '0') + '.pdf';
    doc.save(fname);
  });
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

  /* Pwa Volimik : TOUJOU fòmil (L×W×H)/4000 — pa janm chanje pou customPrice */
  const volWeight   = (L * W * H) / 4000;

  /* Pwa Final = volimik + balans */
  const finalWeight = volWeight + realWeight;

  /* ── Fòmil definitif : (Pwa Reyèl × 4.90) × 2 ── */
  let subtotal    = 0;
  let discount    = 0;
  let discountPct = 0;
  let servicePrix = 0;

  if (realWeight > 0) {
    const brut = (realWeight * TARIF_LB) * 2;
    subtotal   = brut < MIN_CHARGE ? MIN_CHARGE : brut;
  }

  /* ── Si customPrice aktif : aplike l dirèkteman ── */
  if (customPrice > 0 && subtotal > 0) {
    servicePrix = customPrice;
  } else if (customPrice > 0 && subtotal === 0) {
    subtotal    = customPrice;
    servicePrix = customPrice;
  } else {
    servicePrix = subtotal;
  }

  /* Total = PrixServis + BalRes - BalPaye */
  const total    = Math.max(0, servicePrix + balRest - balPaye);
  const totalHTG = total * HTG_RATE;

  /* ── Afichaj ─────────────────────────────────── */
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',   volWeight > 0   ? volWeight.toFixed(2) + ' lb'   : '- lb');
  setTxt('resFinalWeight', finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '- lb');
  setTxt('resTarif',       finalWeight > 0 ? '$' + TARIF_LB.toFixed(2) + '/lb' : '-');
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

  return { volWeight, finalWeight, subtotal, discount, discountPct, servicePrix, total, totalHTG, balRest, balPaye, customPrice, realWeight };
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
    dimL: parseFloat(document.getElementById('posL')?.value) || 0,
    dimW: parseFloat(document.getElementById('posW')?.value) || 0,
    dimH: parseFloat(document.getElementById('posH')?.value) || 0,
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
    doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
    doc.text('Haiti: Pòtoprens · Okap · Miragwàn · Okay · Kan-Peren · Leyogàn · Jeremi', 44, 31);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 37);

    /* Nimewo fakti + dat — kwen dwat antet */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FAKTI  lcd' + String(e.invoiceNo || '0').padStart(4, '0'), pw - 10, 18, { align: 'right' });
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
    doc.text('Scale Weight',   colBal,        hY, { align: 'center' });
    doc.text('DIM Weight',  colVol,        hY, { align: 'center' });
    doc.text('Amount',       colMontX,      hY, { align: 'right'  });
    y += tblHeaderH;

    /* ══════════════════════════════════════════
       4. RANJE PRENSIPAL — yon sèl fwa (pa de fwa)
       Deskripsyon (maks 100 mo, pasaj liy otomatik)
       Pwa Balans | Pwa Volimik avèk "lb"
       ══════════════════════════════════════════ */
    const rawDesc   = (e.desc || 'Sèvis lojistik');
    const words     = rawDesc.split(/\s+/);
    const shortDesc = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');

    /* ── Pwa Balans : toujou pwa reyèl ── */
    const pwaBalansVal = (e.realWeight > 0 ? e.realWeight.toFixed(2) : '0.00') + ' lb';

    /* ── Pwa Volimik : TOUJOU pwa reyèl (L×W×H)/4000 — pa janm ajiste ── */
    const displayVolWeight = e.volWeight || 0;

    /* Récupère L, W, H stockés dans l'entrée (si disponibles) */
    const dimL = e.dimL || 0;
    const dimW = e.dimW || 0;
    const dimH = e.dimH || 0;
    const hasDims = dimL > 0 && dimW > 0 && dimH > 0;

    /* Ligne 1 : dimensions (si dispo) — Ligne 2 : résultat lb */
    const volLine1 = hasDims ? `(${dimL}×${dimW}×${dimH})` : '';
    const volLine2 = displayVolWeight.toFixed(2) + ' lb';

    const montant = '$' + (e.subtotal || 0).toFixed(2);

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

    /* Pwa Balans — yon liy */
    doc.text(pwaBalansVal, colBal, midRow, { align: 'center' });

    /* Pwa Volimik — de liy si gen dimansyon, sinon yon liy */
    if (hasDims) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(volLine1, colVol, midRow - 3, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(volLine2, colVol, midRow + 3.5, { align: 'center' });
    } else {
      doc.text(volLine2, colVol, midRow, { align: 'center' });
    }

    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFontSize(9.5);
    doc.setTextColor(bruR, bruG, bruB);
    doc.text(montant, colMontX, midRow, { align: 'right' });
    doc.restoreGraphicsState();

    y += mainRowH;

    /* ══════════════════════════════════════════
       5. RANJE RÈS Balans + BALANS PEYE
       ══════════════════════════════════════════ */
    const extraRows = [];
    if (e.balRest > 0) extraRows.push(['Rès balans',  '+$' + e.balRest.toFixed(2)]);
    if (e.balPaye > 0) extraRows.push(['Balans peye', '-$' + e.balPaye.toFixed(2)]);

    extraRows.forEach((r, i) => {
      if (y > ph - 100) { doc.addPage(); y = 20; }
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
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
      doc.restoreGraphicsState();
      y += 10;
    });

    y += 4;

    /* ══════════════════════════════════════════
       6. RABÈ (si customPrice < subtotal) — ANVAN total, % sèlman
       ══════════════════════════════════════════ */
    const discount    = e.discount    || 0;
    const discountPct = e.discountPct || 0;
    if (discount > 0) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      doc.setFillColor(240, 255, 240);
      doc.rect(14, y, tableW, 11, 'F');
      doc.restoreGraphicsState();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      /* Tèks opasité 0.55 */
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.55 }));
      doc.setTextColor(30, 100, 30);
      doc.text('Discount', colDesc + 4, y + 7.5);
      doc.text('-' + discountPct + '%', colMontX, y + 7.5, { align: 'right' });
      doc.restoreGraphicsState();
      y += 13;
    }

    /* ══════════════════════════════════════════
       7. TOTAL (USD) — bannè prensipal (te rele "Sibtotal")
       Se liy ofisyèl final la (servicePrix aprè rabè)
       ══════════════════════════════════════════ */
doc.saveGraphicsState();
    doc.setFillColor(255, 243, 196);
    doc.rect(14, y, tableW, 16, 'F');
    doc.setTextColor(101, 51, 19);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total (USD)', colDesc + 4, y + 10.5);
    doc.text('$' + (e.servicePrix || 0).toFixed(2), colMontX, y + 10.5, { align: 'right' });
    doc.restoreGraphicsState();
    y += 16;

    /* ══════════════════════════════════════════
       8. TOTAL HTG — konvèsyon referans discrè
       ══════════════════════════════════════════ */
    const totalHTG = Math.round((e.total || 0) * 135);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.55 }));
    doc.setFillColor(230, 225, 215);
    doc.rect(14, y, tableW, 11, 'F');
    doc.setTextColor(120, 100, 70);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ekivalan HTG (135 HTG / $1)', colDesc + 4, y + 7.5);
    doc.setFontSize(9);
    doc.text('≈ ' + totalHTG.toLocaleString('en-US') + ' HTG', colMontX, y + 7.5, { align: 'right' });
    doc.restoreGraphicsState();
    y += 17;

    /* ══════════════════════════════════════════
       9. ZON NOT
       ══════════════════════════════════════════ */
    /* Not rabè otomatik : sèlman si customPrice < pri nòmal (realWeight×4.90×2) */
    const normalPrice  = Math.max((e.realWeight || 0) * 4.90 * 2, 25);
    const hasDiscount  = (e.customPrice > 0) && (e.customPrice < normalPrice);
    const autoNote     = hasDiscount
      ? 'Yon rabè espesyal aplike sou fakti sa a.'
      : '';
    const fullNote = [autoNote, e.note].filter(Boolean).join(' ');

    if (fullNote) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(hasDiscount ? 30 : 70, hasDiscount ? 100 : 70, hasDiscount ? 30 : 70);
      const noteLines = doc.splitTextToSize('Not: ' + fullNote, tableW);
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
    doc.text('Achte sou entènèt avè n ak konfyans.', 19, y + 16);
    doc.text('Mòd pèman: Cash · Natcash · Sogebank · Zelle', 19, y + 22);
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
    doc.text('Responsab Sid (Thomas Kabé)', pw - 14, y + 6, { align: 'right' });
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
    const clientSlug = (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
    const fname = 'Fakti_' + clientSlug + '_lcd' + String(e.invoiceNo || '0').padStart(4, '0') + '.pdf';
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

  /* Champs Shipping — kalkil an dirèk */
  const liveFields = ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange'];
  liveFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcLive);
  });

  /* Champs Fich Acha — kalkil an dirèk */
  const achaLiveFields = ['achaPrixUsine','achaExpedUSA','achaShippingHaiti'];
  achaLiveFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcAchaLive);
  });

  /* Otokomplè Acha — ataché kòm listener */
  const achaNameInput = document.getElementById('achaClientName');
  if (achaNameInput) {
    achaNameInput.addEventListener('input', initAchaAutocomplete);
    achaNameInput.addEventListener('blur', () => setTimeout(removeAchaDropdown, 200));
  }
});

/* ── Otokomplete Acha ──────────────────────────
   Fonksyon sa a rele chak fwa yo tape nan champ
   'achaClientName' (ataché nan DOMContentLoaded)
   ──────────────────────────────────────────── */
function initAchaAutocomplete() {
  const nameInput = document.getElementById('achaClientName');
  const addrInput = document.getElementById('achaClientAddress');
  if (!nameInput) return;

  const val = nameInput.value.trim().toLowerCase();
  removeAchaDropdown();
  if (!val) return;

  /* Fusionner sources: customers.js + pos_clients */
  const sources = [];
  if (typeof getCustomers === 'function') {
    getCustomers().forEach(c => sources.push({ name: c.name, address: c.address || '', phone: c.phone || '' }));
  }
  getPosClients().forEach(c => {
    if (!sources.find(s => s.name.toLowerCase() === c.name.toLowerCase())) {
      sources.push({ name: c.name, address: c.address || '', phone: '' });
    }
  });

  const matches = sources.filter(c => c.name.toLowerCase().startsWith(val));
  if (matches.length === 0) return;

  const wrapper = nameInput.parentElement;
  if (wrapper) wrapper.style.position = 'relative';

  const dd = document.createElement('div');
  dd.id = 'achaClientDropdown';
  dd.style.cssText = `
    position:absolute;z-index:999;background:#1a1520;
    border:1px solid rgba(255,255,255,0.15);border-radius:8px;
    left:0;right:0;top:100%;max-height:160px;overflow-y:auto;
  `;
  matches.forEach(c => {
    const item = document.createElement('div');
    item.innerHTML = `<strong style="color:#ddd8cc;">${c.name}</strong>${c.address ? '<span style="color:rgba(200,190,175,0.5);font-size:0.82em;"> · ' + c.address + '</span>' : ''}`;
    item.style.cssText = 'padding:10px 12px;cursor:pointer;font-size:0.875rem;border-bottom:1px solid rgba(255,255,255,0.06);';
    item.addEventListener('mousedown', () => {
      nameInput.value = c.name;
      if (addrInput) addrInput.value = c.address || '';
      const phoneEl = document.getElementById('achaClientPhone');
      if (phoneEl && c.phone) phoneEl.value = c.phone;
      removeAchaDropdown();
    });
    dd.appendChild(item);
  });
  if (wrapper) wrapper.appendChild(dd);
}

function removeAchaDropdown() {
  const dd = document.getElementById('achaClientDropdown');
  if (dd) dd.remove();
}

document.addEventListener('click', e => {
  if (!e.target.closest('#achaClientName')) removeAchaDropdown();
});
