/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v3
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
   BUILD PDF A4 — VERSION KORIJE KONPLE
   ══════════════════════════════════════════════ */
function buildPOSPdf(e) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297;

  /* Palèt LCD */
  const bruR = 101, bruG = 51,  bruB = 19;   // brun LCD
  const orR  = 212, orG  = 175, orB  = 55;   // lo
  const tqR  = 0,   tqG  = 150, tqB  = 166;  // touez

  /* ── Chaj logo yon sel fwa ───────────────────── */
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

    /* ═══════════════════════════════════════════
       WATERMARK — dèyè tout lòt bagay
       ═══════════════════════════════════════════ */
    if (imgData) {
      if (doc.setGState) doc.setGState(doc.GState({ opacity: 0.07 }));
      const wmW = 130, wmH = 130;
      const wmX = (pw - wmW) / 2;
      const wmY = (ph - wmH) / 2;
      doc.addImage(imgData, 'PNG', wmX, wmY, wmW, wmH);
      if (doc.setGState) doc.setGState(doc.GState({ opacity: 1 }));
    }

    /* ═══════════════════════════════════════════
       ANTET — banye touez (0 a 42 mm)
       ═══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, 0, pw, 42, 'F');

    /* Liy lo */
    doc.setFillColor(orR, orG, orB);
    doc.rect(0, 42, pw, 1.5, 'F');

    /* Logo antet */
    if (imgData) {
      doc.addImage(imgData, 'PNG', 7, 5, 30, 30);
    }

    /* Non konpayi */
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 42, 13);

    /* Adres sou 3 liy separe */
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('USA: 14030 NW 5th Pl North, Miami, FL', 42, 20);
    doc.text('Ayiti: Potoprens · Okap · Miragwan · Okay · Kan-Peren · Leyogan · Jeremi', 42, 26);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 42, 32);

    /* Nimewo fakti + dat — kwen dwat */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FAKTI  #' + (e.invoiceNo || '-'), pw - 12, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text('Dat: ' + dateTxt, pw - 12, 20, { align: 'right' });

    /* ═══════════════════════════════════════════
       BLOK KLIYAN
       ═══════════════════════════════════════════ */
    let y = 54;

    /* Non kliyan an gras */
    if (e.clientName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(e.clientName, 14, y);
      y += 7;
    }

    /* Adres kliyan avek etiket "Adres:" */
    if (e.clientAddr) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text('Adres: ' + e.clientAddr, 14, y);
      y += 6;
    }

    /* Liy lo anba blok kliyan */
    y += 3;
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y);
    y += 8;

    /* ═══════════════════════════════════════════
       TABLO — antet kolòn
       ═══════════════════════════════════════════ */
    const colDesc  = 14;       // depart kolòn Deskripsyon
    const colPwaX  = 130;      // sant kolòn Pwa
    const colMontX = pw - 16;  // bò dwat kolòn Montan

    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(14, y - 5, pw - 28, 9, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Deskripsyon', colDesc + 3, y);
    doc.text('Pwa', colPwaX, y, { align: 'center' });
    doc.text('Montan', colMontX, y, { align: 'right' });
    y += 7;

    /* ═══════════════════════════════════════════
       TABLO — ranje prensipal
       Deskripsyon sèlman nan tablo (maks 100 mo)
       Pwa Balans + Pwa Volim sou 2 liy separe
       ═══════════════════════════════════════════ */
    const rawDesc   = (e.desc || 'Fre ekspedisyon');
    const words     = rawDesc.split(/\s+/);
    const shortDesc = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');

    const pwaBalans = (e.realWeight > 0 ? e.realWeight.toFixed(2) : '0.00') + ' lb';
    const pwaVolim  = (e.volWeight  > 0 ? e.volWeight.toFixed(2)  : '0.00') + ' lb';
    const montant   = '$' + (e.servicePrix || e.subtotal || 0).toFixed(2);

    /* Kalkilasyon wote ranje */
    const descMaxW   = 90;  // mm disponib pou kolòn Deskripsyon
    doc.setFontSize(8.5);
    const descSplits = doc.splitTextToSize(shortDesc, descMaxW);
    const descH      = descSplits.length * 5;
    const pwaH       = 12;  // 2 liy pwa × 6 mm
    const mainRowH   = Math.max(descH, pwaH) + 6;

    /* Fon ranje */
    doc.setFillColor(255, 255, 255);
    doc.rect(14, y - 4, pw - 28, mainRowH, 'F');

    /* Deskripsyon */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(descSplits, colDesc + 3, y);

    /* Pwa Balans */
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text('Balans: ' + pwaBalans, colPwaX, y,     { align: 'center' });
    /* Pwa Volim */
    doc.text('Volim:  ' + pwaVolim,  colPwaX, y + 6, { align: 'center' });

    /* Montan */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(bruR, bruG, bruB);
    doc.text(montant, colMontX, y, { align: 'right' });

    y += mainRowH;

    /* Ranje pou BalRes + BalPaye */
    const extraRows = [];
    if (e.balRest > 0) extraRows.push(['Balans res',  '+$' + e.balRest.toFixed(2)]);
    if (e.balPaye > 0) extraRows.push(['Balans peye', '-$' + e.balPaye.toFixed(2)]);

    extraRows.forEach((r, i) => {
      if (y > ph - 80) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 248 : 255);
      doc.rect(14, y - 4, pw - 28, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(r[0], colDesc + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bruR, bruG, bruB);
      doc.text(r[1], colMontX, y, { align: 'right' });
      y += 7;
    });

    y += 2;

    /* ═══════════════════════════════════════════
       SOUBTOTAL
       ═══════════════════════════════════════════ */
    doc.setFillColor(240, 234, 224);
    doc.rect(14, y - 4, pw - 28, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 40, 10);
    doc.text('Soubtotal', colDesc + 3, y);
    doc.text('$' + (e.subtotal || 0).toFixed(2), colMontX, y, { align: 'right' });
    y += 10;

    /* ═══════════════════════════════════════════
       TOTAL FINAL
       ═══════════════════════════════════════════ */
    doc.setFillColor(bruR, bruG, bruB);
    doc.rect(14, y - 5, pw - 28, 11, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', colDesc + 3, y);
    doc.text('$' + (e.total || 0).toFixed(2), colMontX, y, { align: 'right' });
    y += 13;

    /* ═══════════════════════════════════════════
       EKIVALAN HTG — ban lo dedye
       ═══════════════════════════════════════════ */
    const htgAmt = Math.round((e.total || 0) * HTG_RATE);
    doc.setFillColor(orR, orG, orB);
    doc.rect(14, y - 5, pw - 28, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 25, 5);
    doc.text('Ekivalan HTG', colDesc + 3, y);
    doc.text(htgAmt.toLocaleString('fr-HT') + ' HTG', colMontX, y, { align: 'right' });
    y += 6;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 55, 20);
    doc.text('Taux: 135 goud pou $1', colMontX, y, { align: 'right' });
    y += 10;

    /* ═══════════════════════════════════════════
       ZON NOT
       ═══════════════════════════════════════════ */
    if (e.note) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const noteLines = doc.splitTextToSize('Not: ' + e.note, pw - 28);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5 + 4;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 170, 155);
      doc.text('Not:', 14, y);
      doc.setDrawColor(200, 190, 175);
      doc.setLineWidth(0.3);
      doc.line(28, y, pw - 14, y);
      y += 6;
      doc.line(14, y, pw - 14, y);
      y += 10;
    }

    /* ═══════════════════════════════════════════
       KONDISYON PEMAN
       ═══════════════════════════════════════════ */
    doc.setFillColor(245, 242, 235);
    doc.rect(14, y, pw - 28, 22, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bruR, bruG, bruB);
    doc.text('Patne fyab ou pou pwoje komes ak livrezon USA-Ayiti', 17, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Achte sou entenet ave nou ak konfyans.', 17, y + 13);
    doc.text('Natcash · Sogebank · Zelle  ·  Taux 135 goud pou $1', 17, y + 18);
    y += 26;

    /* ═══════════════════════════════════════════
       SIYATI
       ═══════════════════════════════════════════ */
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y);
    y += 7;

    doc.setFontSize(13);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(40, 20, 5);
    doc.text('Responsab Sid (Thomas Kabe)', pw - 14, y, { align: 'right' });

    /* ═══════════════════════════════════════════
       PYE PAJ
       ═══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, ph - 12, pw, 12, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Les Cayes Dropshipping · lescayesdropshipping@gmail.com · +509 31 01 39 68 · Kan-Peren, Okay',
      pw / 2, ph - 5, { align: 'center' }
    );

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

/* ── Efase fomile ────────────────────────────── */
function clearPosForm() {
  ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange',
   'posClientName','posClientAddress','posDescription','posNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  calcLive();
  showToast('Fomile efase');
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
