/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v5
   Jeneratè Fich · Fich Shipping & Fich Acha (PDF A4 paysage, 2 fich pa paj)

   RÈGLEMAN KALKIL (Shipping) :
   • Pwa Volimik  = (L × l × H) / 4000  [cm → lb]
   • Tarif fiks   = $4.90/lb  ·  Minimòm $25.00 sof si Pri Espesyal
   • Total        = PrixSèvis + BalRès − BalPaye
   • Afichaj      = $XX.XX  +  XXXX HTG (135 HTG/$)

   FICH ACHA :
   • Sous-total = montan acha · Total = sous-total + shipping USA→Ayiti
   • Fich 1 (san shipping) → fich nèt (ak shipping) : modifye nan istorik
   ══════════════════════════════════════════════ */

const POS_KEY     = 'tbs_pos_history_v2';
const ACHA_KEY    = 'tbs_acha_history_v2';
const POS_MAX     = 20;
const MIN_CHARGE  = 25.00;
const TARIF_LB    = 4.90;
const HTG_RATE    = 135;

const PLAT_MAP = {
  alibaba:    { label: 'Alibaba',    file: 'alibaba.png'    },
  aliexpress: { label: 'AliExpress', file: 'aliexpress.png' },
  temu:       { label: 'Temu',       file: 'temu.png'       },
  shein:      { label: 'Shein',      file: 'shein.png'      },
  amazon:     { label: 'Amazon',     file: 'amazon.png'     },
};

let currentPosTab = 'shipping';
let achaEditingId = null;     // id fich acha k ap modifye (si gen)
let posSelected   = [];       // id fich chwazi pou PDF 2-an-1

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function switchPosTab(tab) {
  currentPosTab = tab;
  posSelected = [];
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
  refreshHistoryIfOpen();
}

/* ── Estokaj (nouvo istorik — ansyen yo efase) ── */
function getPosHistory()  { try { return JSON.parse(localStorage.getItem(POS_KEY))  || []; } catch { return []; } }
function savePosHistory(l) { localStorage.setItem(POS_KEY,  JSON.stringify(l)); }
function getAchaHistory() { try { return JSON.parse(localStorage.getItem(ACHA_KEY)) || []; } catch { return []; } }
function saveAchaHistory(l){ localStorage.setItem(ACHA_KEY, JSON.stringify(l)); }

/* Nimewo fich kontinye apre ansyen nimewo yo (pa gen doublon) */
(function migrateOldHistory() {
  try {
    [['tbs_pos_history', 'pos'], ['tbs_acha_history', 'acha']].forEach(([oldKey, t]) => {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) return;
      let max = 0;
      try { (JSON.parse(raw) || []).forEach(h => { max = Math.max(max, parseInt(h.invoiceNo) || 0); }); } catch {}
      const ck = 'tbs_' + t + '_counter';
      localStorage.setItem(ck, String(Math.max(max, parseInt(localStorage.getItem(ck)) || 0)));
      localStorage.removeItem(oldKey);
    });
  } catch {}
})();

function nextInvoiceNo(type) {
  const t    = type === 'acha' ? 'acha' : 'pos';
  const ck   = 'tbs_' + t + '_counter';
  const hist = t === 'acha' ? getAchaHistory() : getPosHistory();
  const maxH = hist.reduce((m, h) => Math.max(m, parseInt(h.invoiceNo) || 0), 0);
  const n    = Math.max(parseInt(localStorage.getItem(ck)) || 0, maxH) + 1;
  localStorage.setItem(ck, String(n));
  return String(n).padStart(3, '0');
}

/* ══════════════════════════════════════════════
   FICH ACHA — fòmilè
   ══════════════════════════════════════════════ */
function calcAchaLive() {
  const achatUsine = parseFloat(document.getElementById('achaPrixUsine')?.value)     || 0;
  const shippingHT = parseFloat(document.getElementById('achaShippingHaiti')?.value) || 0;
  const sousTotal  = achatUsine;
  const grandTotal = sousTotal + shippingHT;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('resSousTotal',     '$' + sousTotal.toFixed(2));
  set('resSousTotalHTG',  '≈ ' + Math.round(sousTotal * HTG_RATE).toLocaleString('fr-HT') + ' HTG');
  set('resGrandTotal',    '$' + grandTotal.toFixed(2));
  set('resGrandTotalHTG', '≈ ' + Math.round(grandTotal * HTG_RATE).toLocaleString('fr-HT') + ' HTG');
}

const ACHA_FIELDS = {
  clientName: 'achaClientName', clientAddr: 'achaClientAddress', clientPhone: 'achaClientPhone',
  plateforme: 'achaPlateforme', plateforme2: 'achaPlateforme2', desc: 'achaDescription',
  dateCommande: 'achaDateCommande', dateLivreUSA: 'achaDateLivreUSA', dateDispoAyiti: 'achaDateDispoAyiti',
  achatUsine: 'achaPrixUsine', shippingHT: 'achaShippingHaiti', note: 'achaNoteExplication'
};

/* ══════════════════════════════════════════════
   2 KLIYAN PA PAJ — Kliyan A / Kliyan B nan menm fòmilè a
   Yon sèl seri chan; bouton A/B chanje kliyan an (done yo sove).
   B opsyonèl : si li vid → PDF pou yon sèl kliyan.
   ══════════════════════════════════════════════ */
const SLOT = {
  ship: {
    ids: ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange',
          'posClientName','posClientAddress','posDescription','posNote'],
    slots: [{}, {}], active: 0, btn: 'shipSlotBtn', info: 'shipSlotInfo',
    filled: o => !!(((o.posClientName || '').trim()) || parseFloat(o.posWeight) > 0 ||
                    parseFloat(o.posCustomPrice) > 0 || parseFloat(o.posL) > 0),
    calc: () => calcLive()
  },
  acha: {
    ids: Object.values(ACHA_FIELDS),
    slots: [{}, {}], active: 0, btn: 'achaSlotBtn', info: 'achaSlotInfo',
    filled: o => !!(((o.achaClientName || '').trim()) || parseFloat(o.achaPrixUsine) > 0),
    calc: () => calcAchaLive()
  }
};

function slotSnap(t) {
  const o = {};
  SLOT[t].ids.forEach(id => { const el = document.getElementById(id); o[id] = el ? el.value : ''; });
  return o;
}
function slotFill(t, o) {
  SLOT[t].ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = (o && o[id] !== undefined) ? o[id] : ''; });
}
function slotCurrent(t) {          // [A, B] avèk kliyan aktif la ajou
  const S = SLOT[t], arr = [S.slots[0], S.slots[1]];
  arr[S.active] = slotSnap(t);
  return arr;
}
function slotSwitch(t, i) {
  const S = SLOT[t];
  if (i === S.active) return;
  S.slots[S.active] = slotSnap(t);
  S.active = i;
  slotFill(t, S.slots[i]);
  S.calc();
  slotUI(t);
}
function slotReset(t) {
  const S = SLOT[t];
  S.slots = [{}, {}]; S.active = 0;
  slotFill(t, {});
  S.calc();
  slotUI(t);
}
function slotUI(t) {
  const S = SLOT[t], cur = slotCurrent(t);
  [0, 1].forEach(i => {
    const b = document.getElementById(S.btn + i);
    if (!b) return;
    const on = S.active === i, ok = S.filled(cur[i]);
    b.textContent = '👤 Kliyan ' + (i === 0 ? 'A' : 'B') + (i === 1 ? ' (opsyonèl)' : '') + (ok ? ' ✓' : '');
    b.style.background  = on ? 'rgba(0,150,166,0.25)' : 'rgba(255,255,255,0.05)';
    b.style.borderColor = on ? 'rgba(0,150,166,0.7)'  : 'rgba(255,255,255,0.12)';
    b.style.color       = on ? '#00acc1' : 'rgba(200,190,175,0.65)';
  });
  const n = cur.filter(S.filled).length;
  const info = document.getElementById(S.info);
  if (info) info.textContent = n >= 2 ? '2 fich sou menm paj PDF paysaj.' : 'Yon sèl fich — lòt mwatye paj la rete blan.';
}

function readAchaForm(snap) {
  snap = snap || slotSnap('acha');
  const f = {};
  Object.keys(ACHA_FIELDS).forEach(k => { f[k] = (snap[ACHA_FIELDS[k]] || '').trim(); });
  f.achatUsine = parseFloat(f.achatUsine) || 0;
  f.shippingHT = parseFloat(f.shippingHT) || 0;
  return f;
}

function setAchaEditUI(entry) {
  const banner = document.getElementById('achaEditBanner');
  const btn    = document.getElementById('achaGenBtn');
  if (banner) banner.style.display = entry ? '' : 'none';
  const no = document.getElementById('achaEditNo');
  if (no && entry) no.textContent = entry.invoiceNo;
  if (btn) btn.textContent = entry ? '💾 Mete ajou Fich Acha PDF' : '🖨️ Jenere Fich Acha PDF';
}

function generateAchaInvoice() {
  const cur = slotCurrent('acha');
  const hist = getAchaHistory();
  const entries = [];

  cur.forEach((snap, i) => {
    if (!SLOT.acha.filled(snap)) return;
    const f = readAchaForm(snap);
    const sousTotal  = f.achatUsine;
    const grandTotal = sousTotal + f.shippingHT;
    const idx = (i === 0 && achaEditingId) ? hist.findIndex(h => h.id === achaEditingId) : -1;
    let entry;
    if (idx >= 0) {
      entry = { ...hist[idx], ...f, sousTotal, grandTotal, updatedAt: Date.now() };
      hist[idx] = entry;
    } else {
      entry = { id: uid(), type: 'acha', invoiceNo: nextInvoiceNo('acha'), ...f, sousTotal, grandTotal, date: Date.now() };
      hist.unshift(entry);
    }
    entry._updated = idx >= 0;
    entries.push(entry);
    savePosClient(f.clientName, f.clientAddr);
  });

  if (!entries.length) { showToast('Antre omwen non kliyan oswa montan yo'); return; }

  if (hist.length > POS_MAX) hist.length = POS_MAX;
  saveAchaHistory(hist.map(h => { const c = { ...h }; delete c._updated; return c; }));

  buildFichesPdf('acha', entries);
  showToast('Fich Acha ' + entries.map(e => '#' + e.invoiceNo).join(' + ') + (entries[0]._updated ? ' mete ajou' : ' jenere'));
  clearAchaForm(true);
  refreshHistoryIfOpen();
}

function clearAchaForm(silent) {
  achaEditingId = null;
  setAchaEditUI(null);
  slotReset('acha');
  if (silent !== true) showToast('Fomilè efase');
}

/* Rechaje yon fich nan fòmilè pou modifye li (egz. ajoute shipping) */
function editAchaFiche(id) {
  const entry = getAchaHistory().find(h => h.id === id);
  if (!entry) return;
  if (currentPosTab !== 'acha') switchPosTab('acha');
  slotReset('acha');
  Object.keys(ACHA_FIELDS).forEach(k => {
    const el = document.getElementById(ACHA_FIELDS[k]);
    if (!el) return;
    const v = entry[k];
    el.value = (v === undefined || v === null || ((k === 'achatUsine' || k === 'shippingHT') && !v)) ? '' : v;
  });
  achaEditingId = id;
  setAchaEditUI(entry);
  calcAchaLive();
  slotUI('acha');
  document.getElementById('posHistoryPanel')?.classList.add('hidden');
  document.getElementById('posTabAcha')?.scrollTo?.({ top: 0, behavior: 'smooth' });
  showToast('Fich #' + entry.invoiceNo + ' chaje — ajoute shipping la');
}

/* ══════════════════════════════════════════════
   MOTÈ PDF — A4 PAYSAJ, 2 SEKSYON ENGAL
   Chak fich desine nan fòma pòtrè A4 (210 × h mm) epi mete
   a echèl nan yon mwatye paj (148.5 × 210 mm = A5 pòtrè).
   Yon sèl fich → lòt mwatye a rete blan.
   ══════════════════════════════════════════════ */
/* Eseye plizyè non fichye (png/jpg, majiskil/minisk) — premye ki chaje a genyen */
function platCandidates(key) {
  const base = PLAT_MAP[key].file.replace(/\.\w+$/, '');
  const names = [...new Set([base, base.charAt(0).toUpperCase() + base.slice(1), PLAT_MAP[key].label])];
  const out = [];
  names.forEach(n => ['png', 'jpg', 'jpeg'].forEach(x => out.push(n + '.' + x)));
  return out;
}
async function loadImgAny(list) {
  for (const src of list) { const d = await loadImg(src); if (d) return d; }
  return null;
}

function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 200;
      c.getContext('2d').drawImage(img, 0, 0, 200, 200);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Tit antet : "LES CAYES DROPSHIPPING CO., LTD." — rapetise otomatikman si li twò laj */
function drawCompanyTitle(doc, x, y) {
  const txt = 'LES CAYES DROPSHIPPING CO., LTD.';
  let size = 15;
  doc.setFont('helvetica', 'bold');
  if (typeof doc.getTextWidth === 'function') {
    doc.setFontSize(size);
    while (size > 10 && doc.getTextWidth(txt) > 102) { size -= 0.5; doc.setFontSize(size); }
  }
  doc.setFontSize(size);
  doc.setTextColor(255, 255, 255);
  doc.text(txt, x, y);
}

/* Siyati manuscrit : kenbe pwopòsyon, retire fon blan an (transparan) */
function loadImgRaw(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const r = Math.min(1, 700 / img.width);
        const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const id = ctx.getImageData(0, 0, w, h), d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          d[i + 3] = lum >= 235 ? 0 : (lum <= 150 ? 255 : Math.round((235 - lum) / 85 * 255));
        }
        ctx.putImageData(id, 0, 0);
        resolve({ data: c.toDataURL('image/png'), w, h });
      } catch (err) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
async function loadSignature() {
  for (const n of ['manuscrit.jpg', 'Manuscrit.jpg', 'manuscrit.jpeg', 'manuscrit.png', 'Manuscrit.png', 'Manuscrit.jpeg']) {
    const r = await loadImgRaw(n); if (r) return r;
  }
  return null;
}

/* Siyati : imaj manuscrit sou liy la, "Thomas Kabé (Responsab Sid)" anba — retounen y final */
function drawSignature(doc, y, pw, sig) {
  const LS = 15;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
  doc.text('Siyati kliyan:', 14, y + 6);
  doc.setDrawColor(160, 150, 135); doc.setLineWidth(0.3);
  doc.line(14, y + LS, 82, y + LS);
  const x2 = pw - 14, x1 = x2 - 82, cx = (x1 + x2) / 2;
  if (sig && sig.data) {
    const k = Math.min(46 / sig.w, 13 / sig.h), w = sig.w * k, h = sig.h * k;
    doc.addImage(sig.data, 'PNG', cx - w / 2, y + LS - h + 0.8, w, h);
  }
  doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.5);
  doc.line(x1, y + LS, x2, y + LS);
  doc.setFontSize(11); doc.setFont('times', 'bolditalic'); doc.setTextColor(40, 20, 5);
  doc.text('Thomas Kabé (Responsab Sid)', cx, y + LS + 6, { align: 'center' });
  return y + LS + 10;
}

function buildFichesPdf(type, entries) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return; }
  entries = (entries || []).filter(Boolean).slice(0, 2);
  if (!entries.length) return;
  const { jsPDF } = window.jspdf;
  const drawFn = type === 'acha' ? drawAchaFiche : drawShippingFiche;

  const platKeys = [];
  if (type === 'acha') {
    entries.forEach(e => [e.plateforme, e.plateforme2].forEach(p => { if (PLAT_MAP[p] && !platKeys.includes(p)) platKeys.push(p); }));
  }

  Promise.all([
    loadImg('lescayesdropshipping.png'),
    loadSignature(),
    ...platKeys.map(k => loadImgAny(platCandidates(k)))
  ]).then(res => {
    const imgs = { 'lescayesdropshipping.png': res[0], 'manuscrit': res[1] };
    platKeys.forEach((k, i) => { imgs['plat:' + k] = res[i + 2]; });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const k = doc.internal.scaleFactor;
    const PAGE_H = 210, HALF_W = 148.5, FW = 210;

    entries.forEach((e, i) => {
      /* 1) Mezi wotè reyèl kontni an (san desen) pou li antre nan yon sèl paj */
      const probe = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 1500] });
      const yEnd  = drawFn(probe, e, {}, 297);
      const phV   = Math.max(297, yEnd + 6 + 14);          // 14 = bannè pye paj

      /* 2) Echèl + pozisyon nan mwatye a */
      const s  = Math.min(HALF_W / FW, PAGE_H / phV);
      const ox = i * HALF_W + (HALF_W - FW * s) / 2;

      doc.saveGraphicsState();
      doc.internal.write(s.toFixed(5), '0', '0', s.toFixed(5), (ox * k).toFixed(4), (PAGE_H * k * (1 - s)).toFixed(4), 'cm');
      drawFn(doc, e, imgs, phV);
      doc.restoreGraphicsState();
    });

    if (entries.length === 2) {
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.8);
      doc.line(HALF_W, 0, HALF_W, PAGE_H);
      doc.setDrawColor(170, 170, 170); doc.setLineWidth(0.15);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.line(HALF_W, 0, HALF_W, PAGE_H);
      doc.setLineDashPattern([], 0);
    }

    const slug = e => (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
    const no   = e => 'lcd' + String(e.invoiceNo || '0').padStart(4, '0');
    const pre  = type === 'acha' ? 'FichAcha_' : 'Fakti_';
    const fname = entries.length === 1
      ? pre + slug(entries[0]) + '_' + no(entries[0]) + '.pdf'
      : pre + slug(entries[0]) + '_et_' + slug(entries[1]) + '.pdf';
    doc.save(fname);
  });
}

/* ══════════════════════════════════════════════
   DESEN FICH ACHA (pòtrè 210 mm × ph) — retounen y final
   ══════════════════════════════════════════════ */
function drawAchaFiche(doc, e, imgs, ph) {
  const pw = 210;
  const bruR = 101, bruG = 51,  bruB = 19;
  const orR  = 212, orG  = 175, orB  = 55;
  const tqR  = 0,   tqG  = 150, tqB  = 166;
  const imgData = imgs['lescayesdropshipping.png'] || null;
  const plats   = [e.plateforme, e.plateforme2].filter(p => PLAT_MAP[p]);
  const tableW = pw - 28, colMontX = pw - 12;
  let y = 60;

  /* Watermark */
  if (imgData) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.10 }));
    doc.addImage(imgData, 'PNG', (pw - 110) / 2, (ph - 110) / 2 - 10, 110, 110);
    doc.restoreGraphicsState();
  }

  /* 1. ANTET */
  doc.setFillColor(tqR, tqG, tqB); doc.rect(0, 0, pw, 46, 'F');
  doc.setFillColor(orR, orG, orB); doc.rect(0, 46, pw, 2, 'F');
  if (imgData) doc.addImage(imgData, 'PNG', 8, 7, 30, 30);

  doc.setTextColor(255, 255, 255);
  drawCompanyTitle(doc, 44, 17);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(220, 242, 248);
  doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
  doc.text('Haiti: Miragoane, Les Cayes', 44, 31);
  doc.text('+509 35 60 88 69  -  lescayesdropshipping@gmail.com', 44, 37);

  const dateTxt = new Date(e.date).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('FICH ACHA  lcd' + String(e.invoiceNo || '0').padStart(4, '0'), pw - 10, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(220, 242, 248);
  doc.text('Dat: ' + dateTxt, pw - 10, 27, { align: 'right' });

  /* Badge platfòm (1 oswa 2) — sou fon touez */
  if (plats.length) {
    const n = plats.length, totalW = n === 1 ? 40 : 52, bx = pw - 12 - totalW, slotW = totalW / n;
    plats.forEach((p, i) => {
      const d = imgs['plat:' + p], x = bx + i * slotW;
      if (d) doc.addImage(d, 'PNG', x + 2, 33, slotW - 4, 10);
      else {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text(PLAT_MAP[p].label, x + slotW / 2, 40, { align: 'center' });
      }
    });
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('FICH ACHA', pw - 32, 40, { align: 'center' });
  }

  /* 2. BLOK KLIYAN */
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

  /* 3. DESKRIPSYON */
  if (e.desc) {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
    doc.text('Deskripsyon machandiz:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    const descLines = doc.splitTextToSize(e.desc, tableW);
    doc.text(descLines, 14, y); y += descLines.length * 5.5 + 4;
  }

  /* 3B. DATES — toujou afiche (— si vid) */
  const fmtD = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  [
    ['Dat kòmand izín:',                    e.dateCommande],
    ['Dat machandiz lan livre USA:',        e.dateLivreUSA],
    ['Dat machandiz lan disponib Ayiti:',   e.dateDispoAyiti],
  ].forEach(([lab, v]) => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
    doc.text(lab, 14, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(fmtD(v), colMontX, y, { align: 'right' }); y += 5.2;
  });
  y += 4;

  /* 4. TABLO — yon sèl bar ble, ranje beige, kadriyaj lò fen (menm stil ak Shipping) */
  const tTop = y;
  doc.setFillColor(tqR, tqG, tqB); doc.rect(14, y, tableW, 12, 'F');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  const platNames = plats.map(p => PLAT_MAP[p].label).join(' + ');
  doc.text('Orijin acha a  (' + (platNames ? platNames + ' / ' : '') + 'Izín)', 18, y + 8);
  doc.text('Amount', colMontX, y + 8, { align: 'right' });
  y += 12;

  const htg = v => '≈ ' + Math.round((v || 0) * HTG_RATE).toLocaleString('fr-HT') + ' HTG';
  const row = (label, usd, bg, bold, dash) => {
    doc.setFillColor(bg[0], bg[1], bg[2]); doc.rect(14, y, tableW, 12, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(label, 18, y + 7.5);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(bruR, bruG, bruB);
    doc.text(dash ? '—' : '$' + (usd || 0).toFixed(2), colMontX, y + 6.5, { align: 'right' });
    if (!dash) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 100, 70);
      doc.text(htg(usd), colMontX, y + 10.3, { align: 'right' });
    }
    y += 12;
  };
  const hasShipping = (e.shippingHT || 0) > 0;
  row('Montan acha izín (USD)', e.achatUsine, [252, 250, 245], false, false);
  row('SOUS-TOTAL ACHA', e.sousTotal, [246, 242, 236], true, false);
  row(hasShipping ? 'Frè shipping USA → Ayiti (USD)' : 'Frè shipping USA → Ayiti (USD)  (poko konfime)',
      e.shippingHT, [252, 250, 245], false, !hasShipping);

  /* Liy separasyon fen + kadriyaj lò */
  doc.setDrawColor(210, 200, 185); doc.setLineWidth(0.25);
  doc.line(14, y - 12, 14 + tableW, y - 12);
  doc.line(14, y - 24, 14 + tableW, y - 24);
  doc.setDrawColor(orR, orG, orB); doc.setLineWidth(0.3);
  doc.line(14, tTop, 14, y);                    // gòch
  doc.line(14, y, 14 + tableW, y);              // anba
  /* pa gen liy sou bò dwat : montan yo pa dwe travèse l */
  y += 4;

  /* TOTAL (USD) — jòn pal, tèks mawon */
  doc.setFillColor(255, 243, 196); doc.rect(14, y, tableW, 16, 'F');
  doc.setTextColor(101, 51, 19); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Total (USD)', 18, y + 10.5);
  doc.text('$' + (e.grandTotal || 0).toFixed(2), colMontX, y + 10.5, { align: 'right' });
  y += 16;

  /* Ekivalan HTG — diskrè */
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.55 }));
  doc.setFillColor(230, 225, 215); doc.rect(14, y, tableW, 11, 'F');
  doc.setTextColor(120, 100, 70); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Ekivalan HTG (' + HTG_RATE + ' HTG / $1)', 18, y + 7.5);
  doc.setFontSize(9);
  doc.text(htg(e.grandTotal), colMontX, y + 7.5, { align: 'right' });
  doc.restoreGraphicsState();
  y += 13;

  /* 5. NÒT */
  if (e.note) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(70, 70, 70);
    const noteLines = doc.splitTextToSize('Nòt: ' + e.note, tableW);
    doc.text(noteLines, 14, y); y += noteLines.length * 5.5 + 5;
  } else {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(160, 150, 135);
    doc.text('Nòt:', 14, y);
    doc.setDrawColor(200, 190, 175); doc.setLineWidth(0.3);
    doc.line(28, y, pw - 14, y); y += 6;
    doc.line(14, y, pw - 14, y); y += 7;
  }

  /* 6. MARKETING — san fon ni fòm, an italik (pou fich la respire) */
  const msg1 = 'Siw gen machandiz ki entèresew sou sit chinwa yo, ou ka pataje link yo avèk nou pou edew evalye pri l oswa achte li pou ou.';
  const msg2 = 'Les Cayes Dropshipping, nou se patnè fyab ou pou pwojè komès ak livrezon USA-Ayiti.';
  const msg3 = 'Mòd pèman: Cash · Natcash · Sogebank · Zelle';
  doc.setDrawColor(orR, orG, orB); doc.setLineWidth(0.5);
  doc.line(14, y, pw - 14, y); y += 6;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(bruR, bruG, bruB);
  const msg1Lines = doc.splitTextToSize(msg1, tableW);
  doc.text(msg1Lines, 14, y); y += msg1Lines.length * 5.5 + 3;
  doc.setFontSize(8); doc.setFont('helvetica', 'bolditalic'); doc.setTextColor(bruR, bruG, bruB);
  const msg2Lines = doc.splitTextToSize(msg2, tableW);
  doc.text(msg2Lines, 14, y); y += msg2Lines.length * 5.2 + 2;
  doc.setFont('helvetica', 'italic'); doc.setTextColor(70, 70, 70);
  const msg3Lines = doc.splitTextToSize(msg3, tableW);
  doc.text(msg3Lines, 14, y); y += msg3Lines.length * 5.2 + 5;

  /* 7. SIYATI */
  const yEnd = drawSignature(doc, y, pw, imgs['manuscrit']);

  /* 8. PYE PAJ */
  doc.setFillColor(tqR, tqG, tqB);
  doc.rect(0, ph - 14, pw, 14, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 255, 255);
  doc.text('Les Cayes Dropshipping  /  +509 35 60 88 69  /  Aux Cayes, rue du Vivier #66', pw / 2, ph - 6, { align: 'center' });

  return yEnd;
}


/* ══════════════════════════════════════════
   FICH SHIPPING — kliyan, kalkil, jenerasyon
   ══════════════════════════════════════════ */
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
  const cur    = slotCurrent('ship');
  const backup = SLOT.ship.active;
  const hist   = getPosHistory();
  const entries = [];

  cur.forEach(snap => {
    if (!SLOT.ship.filled(snap)) return;
    slotFill('ship', snap);              // calcLive() li chan yo
    const vals = calcLive();
    const clientName = (snap.posClientName || '').trim();
    const clientAddr = (snap.posClientAddress || '').trim();
    const entry = {
      id: uid(), invoiceNo: nextInvoiceNo('pos'),
      clientName, clientAddr,
      desc: (snap.posDescription || '').trim(), note: (snap.posNote || '').trim(),
      ...vals,
      dimL: parseFloat(snap.posL) || 0, dimW: parseFloat(snap.posW) || 0, dimH: parseFloat(snap.posH) || 0,
      date: Date.now(),
    };
    hist.unshift(entry);
    entries.push(entry);
    savePosClient(clientName, clientAddr);
  });
  slotFill('ship', cur[backup]);         // remèt kliyan aktif la
  calcLive();

  if (!entries.length) { showToast('Antre omwen pwa oswa non kliyan'); return; }

  if (hist.length > POS_MAX) hist.length = POS_MAX;
  savePosHistory(hist);
  buildFichesPdf('shipping', entries);
  showToast('Fakti ' + entries.map(e => '#' + e.invoiceNo).join(' + ') + ' jenere');
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

/* ══════════════════════════════════════════
   DESEN FICH SHIPPING (pòtrè 210 mm × ph) — retounen y final
   ══════════════════════════════════════════ */
function drawShippingFiche(doc, e, imgs, ph) {
  const pw = 210;
  const bruR = 101, bruG = 51,  bruB = 19;
  const orR  = 212, orG  = 175, orB  = 55;
  const tqR  = 0,   tqG  = 150, tqB  = 166;
  const imgData = imgs['lescayesdropshipping.png'] || null;

    /* ══════════════════════════════════════════
       WATERMARK — nan sant zòn kontni paj la
       Mete l ANVAN tout kontni pou l rete dèyè
       ══════════════════════════════════════════ */
    if (imgData) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.10 }));
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
    drawCompanyTitle(doc, 44, 17);

    /* Adres sou 3 liy */
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 242, 248);
    doc.text('USA: 14030 NW 5th Pl, North Miami, FL', 44, 25);
    doc.text('Haiti: Miragoane, Les Cayes', 44, 31);
    doc.text('+509 35 60 88 69  _  lescayesdropshipping@gmail.com', 44, 37);

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

    const montant = '$' + (e.servicePrix || e.subtotal || 0).toFixed(2);

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
    const fullNote = e.note || '';
    const hasDiscount = false;
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
    y = drawSignature(doc, y, pw, imgs['manuscrit']);
    const yEndShip = y;

    /* ══════════════════════════════════════════
       12. PYE PAJ — bannè touez tout lajè
       ══════════════════════════════════════════ */
    doc.setFillColor(tqR, tqG, tqB);
    doc.rect(0, ph - 14, pw, 14, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Les Cayes Dropshipping  _  lescayesdropshipping@gmail.com  _  +509 35 60 88 69  _  Aux Cayes, rue du Vivier #67',
      pw / 2, ph - 5.5, { align: 'center' }
    );
  return yEndShip;
}

/* ══════════════════════════════════════════════
   ISTORIK (20 dènye fich pa kalite) + PDF 1 oswa 2 fich
   ══════════════════════════════════════════════ */
function refreshHistoryIfOpen() {
  const p = document.getElementById('posHistoryPanel');
  if (p && !p.classList.contains('hidden')) renderPosHistory();
}

function togglePosHistory() {
  const panel = document.getElementById('posHistoryPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) { posSelected = []; renderPosHistory(); }
}

function currentHistory() { return currentPosTab === 'acha' ? getAchaHistory() : getPosHistory(); }

function togglePosSelect(id, cb) {
  const i = posSelected.indexOf(id);
  if (cb.checked) {
    if (posSelected.length >= 2) { cb.checked = false; showToast('Maksimòm 2 fich pa paj'); return; }
    if (i < 0) posSelected.push(id);
  } else if (i >= 0) {
    posSelected.splice(i, 1);
  }
  const n = document.getElementById('posSelCount');
  if (n) n.textContent = posSelected.length + ' / 2 chwazi';
}

function printSelectedFiches() {
  const list = currentHistory();
  const sel = posSelected.map(id => list.find(h => h.id === id)).filter(Boolean);
  if (!sel.length) { showToast('Chwazi 1 oswa 2 fich'); return; }
  buildFichesPdf(currentPosTab, sel);
}

function printOneFiche(id) {
  const h = currentHistory().find(x => x.id === id);
  if (h) buildFichesPdf(currentPosTab, [h]);
}

function renderPosHistory() {
  const el = document.getElementById('posHistoryList');
  if (!el) return;
  const isAcha = currentPosTab === 'acha';
  const list = currentHistory().slice(0, POS_MAX);

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.85rem;">Okenn fich ankò.</div>`;
    return;
  }

  const bar = `
    <div style="position:sticky;top:0;z-index:2;background:#1a1520;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:8px;">
      <span id="posSelCount" style="font-size:0.74rem;color:rgba(200,190,175,0.6);">${posSelected.length} / 2 chwazi</span>
      <button onclick="printSelectedFiches()" style="background:rgba(0,150,166,0.25);border:1px solid rgba(0,150,166,0.5);border-radius:6px;color:#00acc1;font-size:0.74rem;padding:5px 10px;cursor:pointer;">📄 PDF paysaj (1-2 fich)</button>
    </div>`;

  el.innerHTML = bar + list.map(h => {
    const amount  = isAcha ? (h.grandTotal || 0) : (h.total || 0);
    const dateStr = new Date(h.date).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const status  = isAcha
      ? ((h.shippingHT || 0) > 0
          ? `<span style="font-size:0.62rem;background:rgba(60,160,80,0.2);color:#6fcf86;border-radius:4px;padding:1px 5px;margin-left:5px;">NÈT</span>`
          : `<span style="font-size:0.62rem;background:rgba(212,175,55,0.2);color:#d4af37;border-radius:4px;padding:1px 5px;margin-left:5px;">SHIPPING POKO METE</span>`)
      : '';
    const editBtn = isAcha
      ? `<button onclick="editAchaFiche('${h.id}')" style="margin-top:4px;margin-right:4px;background:rgba(0,150,166,0.2);border:1px solid rgba(0,150,166,0.45);border-radius:6px;color:#00acc1;font-size:0.72rem;padding:3px 8px;cursor:pointer;">✏️ Modifye</button>`
      : '';
    return `
    <div class="pos-history-item" style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;">
          <input type="checkbox" ${posSelected.includes(h.id) ? 'checked' : ''} onchange="togglePosSelect('${h.id}', this)" style="margin-top:3px;" />
          <div>
            <div style="font-size:0.9rem;font-weight:600;color:#ddd8cc;">${esc(h.clientName) || '-'}${status}</div>
            ${h.clientAddr ? `<div style="font-size:0.72rem;color:rgba(200,190,175,0.5);">${esc(h.clientAddr)}</div>` : ''}
            <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">#${esc(h.invoiceNo) || '-'} · ${dateStr}</div>
          </div>
        </label>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:0.62rem;color:rgba(200,190,175,0.45);margin-bottom:1px;">Total</div>
          <div style="font-family:'Space Mono',monospace;font-size:0.95rem;color:#d4af37;">$${amount.toFixed(2)}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);font-style:italic;">${Math.round(amount * HTG_RATE).toLocaleString('fr-HT')} HTG</div>
          ${editBtn}<button onclick="printOneFiche('${h.id}')" style="margin-top:4px;background:rgba(101,51,19,0.3);border:1px solid rgba(101,51,19,0.5);border-radius:6px;color:#d4af37;font-size:0.72rem;padding:3px 8px;cursor:pointer;">PDF</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── Efase fomilè (tab-aware) ────────────────── */
function clearPosForm() {
  if (currentPosTab === 'acha') { clearAchaForm(); return; }
  slotReset('ship');
  showToast('Fomilè efase');
}

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initPosAutocomplete();

  ['posL','posW','posH','posWeight','posCustomPrice','posDebt','posChange'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcLive);
  });
  ['achaPrixUsine','achaShippingHaiti'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcAchaLive);
  });

  const achaNameInput = document.getElementById('achaClientName');
  if (achaNameInput) {
    achaNameInput.addEventListener('input', initAchaAutocomplete);
    achaNameInput.addEventListener('blur', () => setTimeout(removeAchaDropdown, 200));
  }
  setAchaEditUI(null);

  /* Bouton Kliyan A / B + endikatè ✓ */
  document.getElementById('posTabShipping')?.addEventListener('input', () => slotUI('ship'));
  document.getElementById('posTabAcha')?.addEventListener('input', () => slotUI('acha'));
  slotUI('ship');
  slotUI('acha');
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
