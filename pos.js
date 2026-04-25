/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v3
   Kalkimatris · Sistèm POS & Fakti PDF
   ══════════════════════════════════════════════

   RÈGLES DE CALCUL :
   • Pwa Volimik  = (L × l × H) / 4000  [cm → lb]
   • Pwa Final    = PwaVol + PwaReyèl
   • Tarif fixe   = $4.90/lb  (toujours)
   • Minimòm      = $25.00 sauf si Pri Espesyal
   • Total        = PrixService + BalRest − BalPaye
   • Afichaj      = $XX.XX  +  XXXX HTG (135 HTG/$)
   ══════════════════════════════════════════════ */

const POS_KEY    = 'tbs_pos_history';
const POS_MAX    = 12;
const MIN_CHARGE = 25.00;
const TARIF_LB   = 4.90;
const HTG_RATE   = 135;

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
  const balRest     = parseFloat(document.getElementById('posDebt')?.value)        || 0;
  const balPaye     = parseFloat(document.getElementById('posChange')?.value)      || 0;

  /* Pwa Volimétrik : divize pa 4000 (estanda ayeyen cm³→lb) */
  const volWeight   = (L * W * H) / 4000;

  /* Pwa Final = vol + reyèl */
  const finalWeight = volWeight + realWeight;

  let subtotal = 0;
  let servicePrix = 0;
  let tarifApplied = TARIF_LB;

  if (customPrice > 0) {
    subtotal    = customPrice;
    servicePrix = customPrice;
    tarifApplied = 0;
  } else if (finalWeight > 0) {
    const brut  = finalWeight * TARIF_LB;
    subtotal    = brut;
    servicePrix = brut < MIN_CHARGE ? MIN_CHARGE : brut;
  }

  /* Total = PrixService + BalanceRestant − BalancePaye */
  const total    = Math.max(0, servicePrix + balRest - balPaye);
  const totalHTG = total * HTG_RATE;

  /* ── Afichaj ─────────────────────────────── */
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt('resVolWeight',    volWeight > 0   ? volWeight.toFixed(2) + ' lb'   : '— lb');
  setTxt('resFinalWeight',  finalWeight > 0 ? finalWeight.toFixed(2) + ' lb' : '— lb');
  setTxt('resTarif',        customPrice > 0 ? 'Pri Espesyal' : (finalWeight > 0 ? '$' + TARIF_LB.toFixed(2) + '/lb' : '—'));
  setTxt('resSubtotal',     subtotal > 0    ? '$' + subtotal.toFixed(2)      : '—');
  setTxt('resService',      servicePrix > 0 ? '$' + servicePrix.toFixed(2)   : '—');
  setTxt('resTotal',        '$' + total.toFixed(2));
  setTxt('resTotalHTG',     totalHTG.toFixed(0) + ' HTG');

  /* Endikasyon minimòm aplike */
  const minBadge = document.getElementById('resMinBadge');
  if (minBadge) {
    if (customPrice <= 0 && finalWeight > 0 && (finalWeight * TARIF_LB) < MIN_CHARGE) {
      minBadge.style.display = 'inline-block';
    } else {
      minBadge.style.display = 'none';
    }
  }

  return { volWeight, finalWeight, tarifApplied, subtotal, servicePrix, total, totalHTG, balRest, balPaye, customPrice };
}

/* ── Autocomplete kliyan ───────────────────── */
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

/* ── Jenere Fakti PDF ──────────────────────── */
function generatePOSInvoice() {
  const clientName = (document.getElementById('posClientName')?.value  || '').trim();
  const clientAddr = (document.getElementById('posClientAddress')?.value || '').trim();
  const desc       = (document.getElementById('posDescription')?.value  || '').trim();
  const noteField  = (document.getElementById('posNote')?.value         || '').trim();

  const vals = calcLive();

  if (vals.finalWeight <= 0 && vals.customPrice <= 0 && !clientName) {
    showToast('⚠️ Antre omwen pwa oswa non kliyan');
    return;
  }

  /* Nimewo fakti otomatik */
  const hist    = getPosHistory();
  const invoiceNo = String((hist.length > 0 ? (parseInt(hist[0].invoiceNo || '0') + 1) : 1)).padStart(3, '0');

  /* Tronke deskripsyon a 100 mo */
  const descWords = desc.split(/\s+/).filter(Boolean);
  const descTrimmed = descWords.length > 100 ? descWords.slice(0, 100).join(' ') + '…' : desc;

  const entry = {
    id: uid(),
    invoiceNo,
    clientName, clientAddr,
    desc: descTrimmed,
    note: noteField,
    realWeight: vals.finalWeight - vals.volWeight, // pwa balan reyèl
    ...vals,
    date: Date.now(),
  };

  hist.unshift(entry);
  if (hist.length > POS_MAX) hist.length = POS_MAX;
  savePosHistory(hist);
  savePosClient(clientName, clientAddr);

  buildPOSPdf(entry);
  showToast('📄 Fakti #' + invoiceNo + ' jenere');
  renderPosHistory();
}

/* ── Build PDF A4 ───────────────────────────── */
function buildPOSPdf(e) {
  if (!window.jspdf) { showToast('⚠️ jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;

  /* Format A4 potret */
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210, ph = 297;

  /* Palèt koulè LCD */
  const bruR = 101, bruG = 51,  bruB = 19;  // brun LCD
  const orR  = 212, orG  = 175, orB  = 55;  // lò
  const tqR  = 0,   tqG  = 150, tqB  = 166; // tikyiz bannye

  /* ── Chaje logo yon sèl fwa ──────────────── */
  const logoPromise = new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 150; canvas.height = 150;
      canvas.getContext('2d').drawImage(img, 0, 0, 150, 150);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = 'lescayesdropshipping.png';
  });

  logoPromise.then(imgData => {

    /* ══════════════════════════════════════════
       WATERMARK — Logo nan mitan paj la (7% opasité)
       ══════════════════════════════════════════ */
    if (imgData) {
      if (doc.setGState) doc.setGState(doc.GState({ opacity: 0.07 }));
      const wmW = 120, wmH = 120;
      const wmX = (pw - wmW) / 2;
      const wmY = (ph - wmH) / 2;
      doc.addImage(imgData, 'PNG', wmX, wmY, wmW, wmH);
      if (doc.setGState) doc.setGState(doc.GState({ opacity: 1 }));
    }

    /* ══════════════════════════════════════════
       BANNYE SUPERYÈ — Tikyiz
       ══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, 0, pw, 44, 'F');

    /* Liy lò separasyon */
    doc.setFillColor(orR, orG, orB);
    doc.rect(0, 44, pw, 1.5, 'F');

    /* Logo nan bannye a */
    if (imgData) {
      doc.addImage(imgData, 'PNG', 8, 5, 30, 30);
    }

    /* ── Tèks an-tèt ─────────────────────────── */
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LES CAYES DROPSHIPPING', 44, 15);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    /* Chak adrès sou pwòp liy pa li */
    doc.text('USA: 14030 NW 5th Pl North, Miami', 44, 23);
    doc.text('Ayiti: P-au-P · Okap · Miragwàn · Okay · Kan-Peren · Leyogàn · Jeremi', 44, 29);
    doc.text('+509 31 01 39 68  ·  lescayesdropshipping@gmail.com', 44, 35);

    /* Nimewo fakti ak dat — kwen dwat */
    const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FAKTI  #' + (e.invoiceNo || '—'), pw - 12, 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Dat: ' + dateTxt, pw - 12, 22, { align: 'right' });

    /* ══════════════════════════════════════════
       BLÒK KLIYAN
       ══════════════════════════════════════════ */
    let y = 56;

    /* Non kliyan an gras */
    if (e.clientName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(e.clientName, 14, y);
      y += 7;
    }

    /* Adrès kliyan avèk etikèt "Adrès:" */
    if (e.clientAddr) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text('Adrès: ', 14, y);
      const labelW = doc.getTextWidth('Adrès: ');
      doc.setFont('helvetica', 'normal');
      doc.text(e.clientAddr, 14 + labelW, y);
      y += 6;
    }

    y += 3;

    /* Liy separasyon lò */
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y);
    y += 8;

    /* ══════════════════════════════════════════
       TABLO — An-tèt kolòn
       ══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(14, y - 5, pw - 28, 9, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Deskripsyon', 17, y);
    doc.text('Pwa', 118, y, { align: 'right' });
    doc.text('Montan', pw - 16, y, { align: 'right' });
    y += 7;

    /* ══════════════════════════════════════════
       TABLO — Liy done
       ══════════════════════════════════════════ */

    /* Pwa Balan (reyèl) ak Pwa Volimik */
    const realW = (e.realWeight != null && e.realWeight > 0)
      ? e.realWeight.toFixed(2) + ' lb'
      : (e.volWeight != null && e.finalWeight != null)
        ? ((e.finalWeight - e.volWeight) > 0 ? (e.finalWeight - e.volWeight).toFixed(2) + ' lb' : '0.00 lb')
        : '0.00 lb';
    const volW  = e.volWeight > 0 ? e.volWeight.toFixed(2) + ' lb' : '0.00 lb';

    /* Deskripsyon tronke nan 100 mo, afiche sèlman nan kolòn tablo */
    const descText = e.desc || 'Frè ekspedisyon';

    /* Kalkilasyon wotè liy deskripsyon (multiline) */
    const descColW = 95; // lajè kolòn deskripsyon (mm)
    const descLines = doc.splitTextToSize(descText, descColW);

    /* Wotè pwa (2 liy: Balan + Volim) */
    const pwaLines = ['Balan: ' + realW, 'Volim: ' + volW];

    /* Liy prensipal */
    const rowH = Math.max(descLines.length, pwaLines.length) * 5.5 + 4;

    /* Koulè fon altène */
    doc.setFillColor(255, 255, 255);
    doc.rect(14, y - 4, pw - 28, rowH, 'F');

    /* Deskripsyon — kolòn gòch */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(descLines, 17, y);

    /* Pwa Balan ak Pwa Volimik — kolòn mitan */
    doc.setFontSize(8.5);
    pwaLines.forEach((line, idx) => {
      doc.text(line, 118, y + idx * 5.5, { align: 'right' });
    });

    /* Montan — kolòn dwat */
    doc.setTextColor(bruR, bruG, bruB);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('$' + (e.servicePrix || e.subtotal || 0).toFixed(2), pw - 16, y, { align: 'right' });

    y += rowH;

    /* Liy balance si aplikab */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (e.balRest > 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, y - 4, pw - 28, 8, 'F');
      doc.setTextColor(30, 30, 30);
      doc.text('Balans ki rete', 17, y);
      doc.setTextColor(bruR, bruG, bruB);
      doc.text('+$' + e.balRest.toFixed(2), pw - 16, y, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      y += 8;
    }
    if (e.balPaye > 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(14, y - 4, pw - 28, 8, 'F');
      doc.setTextColor(30, 30, 30);
      doc.text('Balans ki peye', 17, y);
      doc.setTextColor(bruR, bruG, bruB);
      doc.text('−$' + e.balPaye.toFixed(2), pw - 16, y, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      y += 8;
    }

    y += 2;

    /* ── Soutatàl ─────────────────────────────── */
    doc.setFillColor(240, 234, 224);
    doc.rect(14, y - 4, pw - 28, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 40, 10);
    doc.text('Soutatàl', 17, y);
    doc.text('$' + (e.subtotal || 0).toFixed(2), pw - 16, y, { align: 'right' });
    y += 10;

    /* ── Total prensipal ──────────────────────── */
    doc.setFillColor(bruR, bruG, bruB);
    doc.rect(14, y - 5, pw - 28, 11, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', 17, y);
    doc.text('$' + (e.total || 0).toFixed(2), pw - 16, y, { align: 'right' });
    y += 12;

    /* ── Ekivalan HTG (anba pri total) ─────────── */
    const htgAmt = Math.round((e.total || 0) * HTG_RATE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 120, 90);
    doc.text(
      '≈ ' + htgAmt.toLocaleString('fr-HT') + ' HTG  (to 135 HTG/$1)',
      pw - 16, y, { align: 'right' }
    );
    y += 10;

    /* ── Zòn Nòt ──────────────────────────────── */
    if (e.note) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      const noteLines = doc.splitTextToSize('Nòt: ' + e.note, pw - 28);
      doc.text(noteLines, 14, y);
      y += noteLines.length * 5 + 4;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 170, 155);
      doc.text('Nòt:', 14, y);
      doc.setDrawColor(200, 190, 175);
      doc.setLineWidth(0.3);
      doc.line(28, y, pw - 14, y);
      y += 6;
      doc.line(14, y, pw - 14, y);
      y += 10;
    }

    /* ── Kondisyon peman ──────────────────────── */
    doc.setFillColor(245, 242, 235);
    doc.rect(14, y, pw - 28, 22, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bruR, bruG, bruB);
    doc.text('Patnè fyab ou pou pwojè komès ak livrezon USA — Ayiti', 17, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Achte sou entènèt avè nou ak konfyans.', 17, y + 13);
    doc.text('To: 135 goud pou $1 · Natcash · Sogebank · Zelle', 17, y + 18);
    y += 26;

    /* ── Siyati ───────────────────────────────── */
    doc.setDrawColor(orR, orG, orB);
    doc.setLineWidth(0.5);
    doc.line(14, y, pw - 14, y);
    y += 7;

    doc.setFontSize(13);
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(40, 20, 5);
    doc.text('Responsab Sid (Thomas Kabé)', pw - 14, y, { align: 'right' });

    /* ── Pye paj ──────────────────────────────── */
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

/* ── Afiche Istorik ─────────────────────────── */
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
          ${h.clientAddr ? `<div style="font-size:0.72rem;color:rgba(200,190,175,0.5);">Adrès: ${h.clientAddr}</div>` : ''}
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">
            #${h.invoiceNo || '—'} · ${new Date(h.date).toLocaleDateString('fr-HT',{day:'2-digit',month:'2-digit',year:'numeric'})}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Space Mono',monospace;font-size:0.95rem;color:#d4af37;">$${(h.total||0).toFixed(2)}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);font-style:italic;">
            ${Math.round((h.total||0)*HTG_RATE).toLocaleString('fr-HT')} HTG
          </div>
          <button onclick='buildPOSPdf(${JSON.stringify(h).replace(/'/g,"&#39;")})' 
            style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">
            🖨️ PDF
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

/* ── Reinisyalize fòmilè ────────────────────── */
function clearPosForm() {
  ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange',
   'posClientName','posClientAddress','posDescription','posNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  calcLive();
  showToast('🔄 Fòmilè efase');
}

/* ── Init ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initPosAutocomplete();

  /* Atache calcLive a tout chan sezi POS yo */
  const liveFields = ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange'];
  liveFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcLive);
  });
});
