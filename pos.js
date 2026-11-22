/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v6
   Jeneratè Fakti inifye (Acha + Shipping) — PDF A4 paysaj, 2 fakti pa paj

   • Yon sèl fòm : kaz ACHA / SHIPPING (koche an wouj sou PDF la)
   • Yon sèl liy nan tablo a : Pwa | Deskripsyon (100 kar.) | Pri U. | Montan USD | HTG
     (chak chan sof deskripsyon : 6 karaktè maksimòm) · ekstansyon otomatik (LBS, $, HTG) — OKENN kalkil otomatik
   • Tout ranpli = menm polis (Courier nwa) · siyati Thomas Kabé = imaj manuscrit.jpg
   • « Terminé pour X » : fakti a antre nan FILE D'ATTENTE (max 10), san PDF
   • Chwazi 2 fakti nan file a → PDF paysaj → yo kite file a, men rete nan istorik
   • Chak fakti : pri kliyan an peye (Montan US) antre otomatikman nan pwofil kliyan an (customers.js)
     → total ogmante, nivo kliyan rekalkile (Bronze / Argent / Platine / Or / Super Client)
   ══════════════════════════════════════════════ */

const FK_KEY       = 'tbs_fakti_v1';
const FK_COUNTER   = 'tbs_fakti_counter';
const FK_MIGRATED  = 'tbs_fakti_migrated_v1';
const FK_PRINTED_MAX = 20;      // istorik : 20 dènye fakti deja enprime
const FK_QUEUE_MAX   = 10;      // file d'attente : 10 fakti maksimòm
const POS_KEY  = 'tbs_pos_history_v2';   // ansyen kle (lekti sèlman — migrasyon)
const ACHA_KEY = 'tbs_acha_history_v2';

const FK_RED      = [200, 0, 0];

const PLAT_MAP = {
  alibaba:    { label: 'Alibaba',    file: 'alibaba.png'    },
  aliexpress: { label: 'AliExpress', file: 'aliexpress.png' },
  temu:       { label: 'Temu',       file: 'temu.png'       },
  shein:      { label: 'Shein',      file: 'shein.png'      },
  amazon:     { label: 'Amazon',     file: 'amazon.png'     },
};
const STAGE_LABEL = { 'acha': 'Acha', 'ship': 'Shipping', 'acha+ship': 'Acha + Shipping' };

let fkEditingId = null;     // id fakti k ap modifye
let fkSelected  = [];       // id chwazi nan file a (max 2)
let fkPrev      = null;     // eta anvan modifikasyon : {acha, ship, stage}
let fkFormStage = 'ship';   // etap peman fòm lan
let fkFormMemo  = {};       // montan « m bay » pa etap

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fkUid() { return (typeof uid === 'function') ? uid() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); }
function fkPad(no) { return String(no || '0').padStart(4, '0'); }
function fkNum(s) { const n = parseFloat(String(s || '').replace(',', '.').replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }

/* ── Estokaj ─────────────────────────────────── */
function fkGet() { try { return JSON.parse(localStorage.getItem(FK_KEY)) || []; } catch { return []; } }
function fkSave(list) {
  /* Fakti pa enprime pa janm efase · istorik = 20 dènye fakti enprime */
  const printed = list.filter(e => e.printed).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, FK_PRINTED_MAX);
  const keep = new Set([...list.filter(e => !e.printed), ...printed].map(e => e.id));
  localStorage.setItem(FK_KEY, JSON.stringify(list.filter(e => keep.has(e.id))));
}
/* Kompatibilite ansyen non (lòt fichye ka rele yo) */
function getPosHistory()  { try { return JSON.parse(localStorage.getItem(POS_KEY))  || []; } catch { return []; } }
function getAchaHistory() { try { return JSON.parse(localStorage.getItem(ACHA_KEY)) || []; } catch { return []; } }

/* Nimewo kontinye apre tout ansyen nimewo yo */
function fkNextNo() {
  const maxH = fkGet().reduce((m, h) => Math.max(m, parseInt(h.invoiceNo) || 0), 0);
  const old  = Math.max(parseInt(localStorage.getItem('tbs_pos_counter')) || 0, parseInt(localStorage.getItem('tbs_acha_counter')) || 0);
  const n = Math.max(parseInt(localStorage.getItem(FK_COUNTER)) || 0, maxH, old) + 1;
  localStorage.setItem(FK_COUNTER, String(n));
  return fkPad(n);
}

/* Migrasyon yon sèl fwa : ansyen fich Acha / Shipping → nouvo istorik (ansyen done yo pa efase) */
(function fkMigrate() {
  try {
    if (localStorage.getItem(FK_MIGRATED)) return;
    const out = fkGet();
    const six = v => { const s = (v === 0 || v) ? String(v) : ''; return s.length <= 6 ? s : ''; };
    const base = h => ({
      id: h.id || fkUid(), invoiceNo: String(h.invoiceNo || '0'), date: h.date || Date.now(),
      clientName: h.clientName || '', clientAddr: h.clientAddr || '', clientPhone: h.clientPhone || '', clientEmail: '',
      origins: [], pwa: '', pri: '', totalPay: '', paid: '', bal: '', net: '', 
      dateCmd: '', dateUSA: '', dateHT: '', note: String(h.note || '').slice(0, 120),
      printed: true, pays: [], paidByStage: {}
    });
    (JSON.parse(localStorage.getItem(ACHA_KEY)) || []).forEach(h => {
      const ship = (h.shippingHT || 0) > 0, usd = ship ? h.grandTotal : h.achatUsine;
      out.push({ ...base(h), origins: [h.plateforme, h.plateforme2].filter(Boolean), acha: true, ship,
        stage: ship ? 'acha+ship' : 'acha', desc: String(h.desc || '').slice(0, 400),
        usd: usd ? six(Number(usd).toFixed(2).replace(/\.00$/, '')) : '', htg: usd ? six(Math.round(usd * 135)) : '',
        dateCmd: h.dateCommande || '', dateUSA: h.dateLivreUSA || '', dateHT: h.dateDispoAyiti || '' });
    });
    (JSON.parse(localStorage.getItem(POS_KEY)) || []).forEach(h => {
      out.push({ ...base(h), acha: false, ship: true, stage: 'ship', desc: String(h.desc || '').slice(0, 400),
        pwa: h.realWeight > 0 ? six(Number(h.realWeight).toFixed(2)) : '',
        usd: h.total ? six(Number(h.total).toFixed(2).replace(/\.00$/, '')) : '', htg: h.total ? six(Math.round(h.total * 135)) : '' });
    });
    out.sort((a, b) => (b.date || 0) - (a.date || 0));
    fkSave(out);
    localStorage.setItem(FK_MIGRATED, '1');
  } catch (err) {}
})();

/* ══════════════════════════════════════════════
   PWOFIL KLIYAN (customers.js) — peman → total + nivo
   ══════════════════════════════════════════════ */
function normTxt(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function fkEnsureCustomer(e) {
  if (typeof getCustomers !== 'function' || typeof saveCustomers !== 'function') return null;
  const list = getCustomers();
  let c = e.custId ? list.find(x => x.id === e.custId) : null;
  if (!c) c = list.find(x => normTxt(x.name) === normTxt(e.clientName));
  if (!c) {
    c = { id: fkUid(), name: e.clientName, address: e.clientAddr || '', phone: e.clientPhone || '', email: e.clientEmail || '',
          bio: '', avatar: null, transactions: [], createdAt: Date.now(), updatedAt: Date.now() };
    list.unshift(c);
  } else {
    if (!c.address && e.clientAddr)  c.address = e.clientAddr;
    if (!c.phone   && e.clientPhone) c.phone   = e.clientPhone;
    if (!c.email   && e.clientEmail) c.email   = e.clientEmail;
  }
  saveCustomers(list);
  return c.id;
}

/* Etap peman : dènye sèvis ki ajoute a. Acha → apre sa Shipping = 2yèm peman (pa doublon) */
function fkStageFor(prev, acha, ship) {
  if (!prev) return (acha && ship) ? 'acha+ship' : (acha ? 'acha' : 'ship');
  if (prev.acha === acha && prev.ship === ship) return prev.stage;
  if (acha && ship) {
    if (prev.acha && !prev.ship) return 'ship';
    if (prev.ship && !prev.acha) return 'acha';
    return prev.stage;
  }
  return acha ? 'acha' : 'ship';
}

/* Anrejistre (oswa korije) peman an nan pwofil kliyan an. Chak etap = yon sèl tranzaksyon. */
function fkLogPayment(e, stage, amount) {
  if (!(amount > 0) || typeof getCustomers !== 'function') return;
  const custId = fkEnsureCustomer(e);
  if (!custId) return;
  const list = getCustomers();
  const c = list.find(x => x.id === custId);
  if (!c) return;
  if (!c.transactions) c.transactions = [];

  const prevRank = getTierRank(getTotalDepenses(c));
  const origin = (e.origins || []).map(k => PLAT_MAP[k] ? PLAT_MAP[k].label : '').filter(Boolean).join(' + ');
  const desc = 'Fakti lcd' + fkPad(e.invoiceNo) + ' · ' + STAGE_LABEL[stage] + (origin ? ' · ' + origin : '');
  e.pays = e.pays || [];
  const p = e.pays.find(x => x.stage === stage);

  if (p) {
    if (p.custId && p.custId !== custId) {               // kliyan chanje → deplase tranzaksyon an
      const old = list.find(x => x.id === p.custId);
      if (old) old.transactions = (old.transactions || []).filter(t => t.id !== p.txId);
      p.txId = null;
    }
    const t = p.txId ? c.transactions.find(x => x.id === p.txId) : null;
    if (t) { t.amount = amount; t.desc = desc; }
    else { p.txId = fkUid(); c.transactions.push({ id: p.txId, amount, desc, txType: 'depans', date: Date.now(), invoiceId: e.id, stage }); }
    p.usd = amount; p.custId = custId;
  } else {
    const txId = fkUid();
    c.transactions.push({ id: txId, amount, desc, txType: 'depans', date: Date.now(), invoiceId: e.id, stage });
    e.pays.push({ stage, usd: amount, txId, custId, date: Date.now() });
  }
  c.updatedAt = Date.now();
  e.custId = custId;
  saveCustomers(list);

  if (getTierRank(getTotalDepenses(c)) > prevRank && typeof showCelebrationModal === 'function') {
    showCelebrationModal(c.name, getClientBadge(c));
  }
  if (typeof renderCustomers === 'function') { try { renderCustomers(); } catch (err) {} }
}

/* ══════════════════════════════════════════════
   FÒM : lekti / ranpli / efase
   ══════════════════════════════════════════════ */
const FK_FIELDS = ['fkName','fkAddr','fkPhone','fkEmail','fkPlat1','fkPlat2','fkPwa','fkDesc','fkPriOther','fkTaux','fkUsd','fkHtg',
                   'fkPay','fkPaid','fkBal','fkNet','fkDateCmd','fkDateUSA','fkDateHT','fkNote'];
const FK_PRICES = ['3,99', '4,90'];
const fkEl  = id => document.getElementById(id);
const fkVal = id => ((fkEl(id) && fkEl(id).value) || '').trim();
const fkChk = id => !!(fkEl(id) && fkEl(id).checked);
function fkToday() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function fkOnPri() {
  const o = fkEl('fkPriOther');
  if (o) o.style.display = fkVal('fkPriSel') === 'other' ? '' : 'none';
}

function fkRead() {
  const lim = (id, n) => fkVal(id).slice(0, n);
  const ds = fkVal('fkDate');
  const origins = [fkVal('fkPlat1'), fkVal('fkPlat2')].filter(Boolean).filter((p, i, a) => a.indexOf(p) === i);
  const sel = fkVal('fkPriSel');
  return {
    clientName: fkVal('fkName'), clientAddr: fkVal('fkAddr'), clientPhone: fkVal('fkPhone'), clientEmail: fkVal('fkEmail'),
    origins, acha: fkChk('fkAcha'), ship: fkChk('fkShip'),
    pwa: lim('fkPwa', 6), desc: lim('fkDesc', 400), pri: sel === 'other' ? lim('fkPriOther', 6) : sel,
    taux: lim('fkTaux', 6), usd: lim('fkUsd', 6), htg: lim('fkHtg', 6),
    totalPay: lim('fkPay', 6), paid: lim('fkPaid', 6), bal: lim('fkBal', 6), net: fkVal('fkNet'),
    dateCmd: fkVal('fkDateCmd'), dateUSA: fkVal('fkDateUSA'), dateHT: fkVal('fkDateHT'),
    note: lim('fkNote', 200),
    date: ds ? new Date(ds + 'T12:00:00').getTime() : Date.now()
  };
}

function fkFill(e) {
  const map = { fkName: e.clientName, fkAddr: e.clientAddr, fkPhone: e.clientPhone, fkEmail: e.clientEmail,
    fkPlat1: (e.origins || [])[0] || '', fkPlat2: (e.origins || [])[1] || '', fkPwa: e.pwa, fkDesc: e.desc,
    fkTaux: e.taux, fkUsd: e.usd, fkHtg: e.htg, fkPay: e.totalPay, fkPaid: e.paid, fkBal: e.bal, fkNet: e.net || '',
    fkDateCmd: e.dateCmd, fkDateUSA: e.dateUSA, fkDateHT: e.dateHT, fkNote: e.note };
  FK_FIELDS.forEach(id => { if (fkEl(id)) fkEl(id).value = (map[id] == null ? '' : map[id]); });
  if (fkEl('fkPriSel')) {
    const p = e.pri || '';
    if (!p) { fkEl('fkPriSel').value = ''; }
    else if (FK_PRICES.includes(p)) { fkEl('fkPriSel').value = p; }
    else { fkEl('fkPriSel').value = 'other'; if (fkEl('fkPriOther')) fkEl('fkPriOther').value = p; }
  }
  if (fkEl('fkAcha')) fkEl('fkAcha').checked = !!e.acha;
  if (fkEl('fkShip')) fkEl('fkShip').checked = !!e.ship;
  if (fkEl('fkDate')) {
    const d = new Date(e.date || Date.now());
    fkEl('fkDate').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  fkOnPri();
}

/* Montan ki antre nan pwofil kliyan an = pri kliyan an peye selon livrezon an (kolòn Montan US,
   oswa Total HTG ÷ taux si Montan US vid) — pou Acha kou Shipping. « Montan m bay » pa ale nan pwofil la. */
function fkPayAmount(e) {
  const usd = fkNum(e.usd);
  if (usd > 0) return usd;
  return (fkNum(e.taux) > 0 && fkNum(e.htg) > 0) ? Math.round(fkNum(e.htg) / fkNum(e.taux) * 100) / 100 : 0;
}

function fkOnFlags() {
  const acha = fkChk('fkAcha'), ship = fkChk('fkShip');
  const show = (id, on) => { const el = fkEl(id); if (el) el.style.display = on ? '' : 'none'; };
  show('fkRowDates', acha); show('fkAchaBlock', acha);
  const ns = fkStageFor(fkEditingId ? fkPrev : null, acha, ship);
  fkFormStage = ns;
  const h = fkEl('fkStageHint');
  if (h) h.textContent = (!acha && !ship) ? 'Chwazi Acha oswa Shipping'
    : 'Peman etap ' + STAGE_LABEL[ns] + ' = Montan US (pri kliyan an peye) → ajoute nan pwofil kliyan an';
}

function fkUpdateBtn() {
  const b = fkEl('fkDoneBtn'); if (!b) return;
  const n = fkVal('fkName');
  b.textContent = (fkEditingId ? '💾 Mettre à jour pour ' : '✅ Terminé pour ') + (n || 'le client');
}

function fkClear(silent) {
  FK_FIELDS.forEach(id => { if (fkEl(id)) fkEl(id).value = ''; });
  if (fkEl('fkAcha')) fkEl('fkAcha').checked = false;
  if (fkEl('fkShip')) fkEl('fkShip').checked = false;
  if (fkEl('fkDate')) fkEl('fkDate').value = fkToday();
  if (fkEl('fkPriSel')) fkEl('fkPriSel').value = '';
  fkOnPri();
  fkEditingId = null; fkPrev = null; fkFormStage = 'ship'; fkFormMemo = {};
  const b = fkEl('fkEditBanner'); if (b) b.style.display = 'none';
  fkOnFlags(); fkUpdateBtn(); fkCount();
  if (!silent) showToast('Fòm efase');
}

function fkCount() {
  const d = fkEl('fkDescCount'); if (d) d.textContent = fkVal('fkDesc').length + ' / 400';
}

/* ══════════════════════════════════════════════
   « TERMINÉ POUR X » — enrejistre fakti a + peman nan pwofil
   ══════════════════════════════════════════════ */
function fkFinish() {
  const f = fkRead();
  if (!f.clientName) { showToast('Antre non kliyan an'); return; }
  if (!f.acha && !f.ship) { showToast('Chwazi Acha oswa Shipping'); return; }

  const list = fkGet();
  const idx = fkEditingId ? list.findIndex(h => h.id === fkEditingId) : -1;
  let e, prev = null;
  if (idx < 0) {
    if (list.filter(h => !h.printed).length >= FK_QUEUE_MAX) { showToast("File d'attente pleine (10) — enprime 2 fakti dabò"); return; }
    e = { id: fkUid(), invoiceNo: fkNextNo(), pays: [], paidByStage: {}, ...f, printed: false };
    list.unshift(e);
  } else {
    const old = list[idx];
    prev = { acha: old.acha, ship: old.ship, stage: old.stage || fkStageFor(null, old.acha, old.ship) };
    e = { ...old, ...f, date: f.date, printed: false, updatedAt: Date.now() };
    list[idx] = e;
  }
  const stage = fkStageFor(prev, e.acha, e.ship);
  e.stage = stage;
  const amt = fkPayAmount(e);
  const pk = e.pays || [];
  const warn = (amt > 0 && !pk.some(p => p.stage === stage) && pk.some(p => Math.abs((p.usd || 0) - amt) < 0.005))
    ? ' · ⚠ menm montan ak peman anvan an — verifye Montan US' : '';
  fkLogPayment(e, stage, amt);
  if (typeof savePosClient === 'function') savePosClient(e.clientName, e.clientAddr, e.clientPhone);
  fkSave(list);

  const q = fkGet().filter(h => !h.printed).length;
  showToast('Fakti #lcd' + fkPad(e.invoiceNo) + (idx < 0 ? ' anrejistre' : ' mete ajou') + ' · file : ' + q + warn);
  fkClear(true);
  fkRefresh();
  if (idx >= 0) switchPosTab('queue');
}

function fkEdit(id) {
  const e = fkGet().find(h => h.id === id); if (!e) return;
  fkClear(true);
  fkEditingId = id;
  fkPrev = { acha: !!e.acha, ship: !!e.ship, stage: e.stage || fkStageFor(null, e.acha, e.ship) };
  fkFormStage = fkPrev.stage;
  fkFill(e);
  const b = fkEl('fkEditBanner'); if (b) b.style.display = '';
  if (fkEl('fkEditNo')) fkEl('fkEditNo').textContent = 'lcd' + fkPad(e.invoiceNo);
  fkOnFlags(); fkUpdateBtn(); fkCount();
  const p = fkEl('posHistoryPanel'); if (p) p.classList.add('hidden');
  switchPosTab('new');
  const pane = fkEl('fkPaneNew'); if (pane) pane.scrollTop = 0;
}

/* ══════════════════════════════════════════════
   ONGLET + FILE D'ATTENTE + ISTORIK
   ══════════════════════════════════════════════ */
function switchPosTab(tab) {
  const t = (tab === 'queue') ? 'queue' : 'new';
  if (fkEl('fkPaneNew'))   fkEl('fkPaneNew').style.display   = t === 'new' ? '' : 'none';
  if (fkEl('fkPaneQueue')) fkEl('fkPaneQueue').style.display = t === 'queue' ? '' : 'none';
  if (fkEl('fkTabNew'))   fkEl('fkTabNew').classList.toggle('active', t === 'new');
  if (fkEl('fkTabQueue')) fkEl('fkTabQueue').classList.toggle('active', t === 'queue');
  if (t === 'queue') fkRenderQueue();
}

function fkRefresh() {
  const q = fkGet().filter(h => !h.printed).length;
  const c = fkEl('fkQueueCount'); if (c) c.textContent = q;
  fkRenderQueue();
  refreshHistoryIfOpen();
}

function fkFlagChips(h) {
  const chip = (t) => `<span style="font-size:0.62rem;background:rgba(255,255,255,0.1);color:#ddd8cc;border-radius:4px;padding:1px 5px;margin-right:4px;">${t}</span>`;
  return (h.acha ? chip('ACHA') : '') + (h.ship ? chip('SHIPPING') : '');
}

function fkRenderQueue() {
  const el = fkEl('fkQueueList'); if (!el) return;
  const q = fkGet().filter(h => !h.printed);
  fkSelected = fkSelected.filter(id => q.some(h => h.id === id));
  const bar = fkEl('fkQueueBar');
  if (bar) bar.innerHTML = `<span id="fkSelCount" style="font-size:0.74rem;color:rgba(200,190,175,0.6);">${fkSelected.length} / 2 chwazi · ${q.length} / ${FK_QUEUE_MAX} nan file</span>
    <button onclick="fkPrintSelected()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.3);border-radius:6px;color:#fff;font-size:0.78rem;padding:7px 12px;cursor:pointer;">📄 PDF paysaj (1-2 fakti)</button>`;
  if (!q.length) { el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.85rem;">File d'attente vid.<br>Fè yon fakti epi klike « Terminé pour… ».</div>`; return; }
  el.innerHTML = q.map(h => `
    <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;min-width:0;">
        <input type="checkbox" ${fkSelected.includes(h.id) ? 'checked' : ''} onchange="fkToggleSel('${h.id}', this)" style="margin-top:3px;" />
        <div style="min-width:0;">
          <div style="font-size:0.92rem;font-weight:600;color:#ddd8cc;">${esc(h.clientName)}</div>
          <div style="margin-top:3px;">${fkFlagChips(h)}</div>
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.45);margin-top:3px;">#lcd${fkPad(h.invoiceNo)} · ${fkFmtDate(h.date)}${h.usd ? ' · ' + esc(fkFmtUsd(h.usd)) : ''}</div>
        </div>
      </label>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="fkEdit('${h.id}')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#ddd8cc;font-size:0.8rem;padding:6px 9px;cursor:pointer;">✏️</button>
        <button onclick="fkDuplicate('${h.id}')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#ddd8cc;font-size:0.8rem;padding:6px 9px;cursor:pointer;">📑</button>
        <button onclick="fkDelete('${h.id}')" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:rgba(200,190,175,0.7);font-size:0.8rem;padding:6px 9px;cursor:pointer;">🗑</button>
      </div>
    </div>`).join('');
}

function fkToggleSel(id, cb) {
  const i = fkSelected.indexOf(id);
  if (cb.checked) {
    if (fkSelected.length >= 2) { cb.checked = false; showToast('Maksimòm 2 fakti pa paj'); return; }
    if (i < 0) fkSelected.push(id);
  } else if (i >= 0) fkSelected.splice(i, 1);
  const n = fkEl('fkSelCount');
  if (n) n.textContent = fkSelected.length + ' / 2 chwazi · ' + fkGet().filter(h => !h.printed).length + ' / ' + FK_QUEUE_MAX + ' nan file';
}

function fkDelete(id) {
  const e = fkGet().find(h => h.id === id); if (!e) return;
  if (!confirm('Efase fakti ' + e.clientName + ' ? (peman nan pwofil kliyan an rete)')) return;
  fkSave(fkGet().filter(h => h.id !== id));
  if (fkEditingId === id) fkClear(true);
  fkRefresh();
}

/* Duplike yon fakti nan file a : kopi rete nan file a (pa gen PDF), san peman — modifye l apre ak ✏️ */
function fkDuplicate(id) {
  const list = fkGet();
  const i = list.findIndex(h => h.id === id);
  if (i < 0) return;
  if (list.filter(h => !h.printed).length >= FK_QUEUE_MAX) { showToast("File d'attente pleine (10)"); return; }
  const src = list[i];
  const copy = { ...src, id: fkUid(), invoiceNo: fkNextNo(), date: Date.now(), printed: false, printedAt: null,
                 pays: [], paidByStage: {}, totalPay: '', paid: '', bal: '', net: '' };
  list.splice(i, 0, copy);
  fkSave(list);
  fkRefresh();
  showToast('Dupliqué → #lcd' + fkPad(copy.invoiceNo) + ' (nan file)');
}

function fkRequeue(id) {
  const list = fkGet();
  if (list.filter(h => !h.printed).length >= FK_QUEUE_MAX) { showToast("File d'attente pleine (10)"); return; }
  const i = list.findIndex(h => h.id === id); if (i < 0) return;
  list[i].printed = false; fkSave(list); fkRefresh();
}

function fkPrintSelected() {
  if (!fkSelected.length) { showToast('Chwazi 1 oswa 2 fakti'); return; }
  fkPrintIds(fkSelected.slice());
}

async function fkPrintIds(ids) {
  const list = fkGet();
  const sel = ids.map(id => list.find(h => h.id === id)).filter(Boolean);
  if (!sel.length) return;
  const ok = await buildFichesPdf(sel);
  if (!ok) return;
  const list2 = fkGet();
  sel.forEach(s => { const i = list2.findIndex(h => h.id === s.id); if (i >= 0) { list2[i].printed = true; list2[i].printedAt = Date.now(); } });
  fkSave(list2);
  fkSelected = [];
  fkRefresh();
  showToast('PDF anrejistre · ' + sel.map(e => '#lcd' + fkPad(e.invoiceNo)).join(' + '));
}

function printOneFiche(id) { fkPrintIds([id]); }

/* Istorik (panno kote) : tout fakti, pi nouvo anwo */
function togglePosHistory() {
  const panel = fkEl('posHistoryPanel'); if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderPosHistory();
}
function refreshHistoryIfOpen() {
  const p = fkEl('posHistoryPanel');
  if (p && !p.classList.contains('hidden')) renderPosHistory();
}
function renderPosHistory() {
  const el = fkEl('posHistoryList'); if (!el) return;
  const list = fkGet().sort((a, b) => (b.date || 0) - (a.date || 0));
  if (!list.length) { el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:0.85rem;">Okenn fakti ankò.</div>`; return; }
  const btn = 'margin-top:4px;margin-left:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#ddd8cc;font-size:0.72rem;padding:3px 8px;cursor:pointer;';
  el.innerHTML = list.map(h => {
    const st = h.printed
      ? `<span style="font-size:0.62rem;background:rgba(60,160,80,0.2);color:#6fcf86;border-radius:4px;padding:1px 5px;margin-left:5px;">ENPRIME</span>`
      : `<span style="font-size:0.62rem;background:rgba(212,175,55,0.2);color:#d4af37;border-radius:4px;padding:1px 5px;margin-left:5px;">NAN FILE</span>`;
    return `
    <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="min-width:0;">
          <div style="font-size:0.9rem;font-weight:600;color:#ddd8cc;">${esc(h.clientName) || '-'}${st}</div>
          <div style="margin-top:3px;">${fkFlagChips(h)}</div>
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.4);margin-top:2px;">#lcd${fkPad(h.invoiceNo)} · ${fkFmtDate(h.date)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-family:'Space Mono',monospace;font-size:0.9rem;color:#d4af37;">${h.usd ? esc(fkFmtUsd(h.usd)) : ''}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);">${h.htg ? esc(fkFmtHtg(h.htg)) : ''}</div>
          <button onclick="fkEdit('${h.id}')" style="${btn}">✏️</button><button onclick="fkDuplicate('${h.id}')" style="${btn}">📑</button><button onclick="printOneFiche('${h.id}')" style="${btn}">PDF</button>${h.printed ? `<button onclick="fkRequeue('${h.id}')" style="${btn}">↩</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   SIJESYON KLIYAN — customers.js + lis POS (non, adrès, telefòn, imèl)
   ══════════════════════════════════════════════ */
function getPosClients() {
  try { return JSON.parse(localStorage.getItem('tbs_pos_clients')) || []; }
  catch { return []; }
}
function savePosClient(name, address, phone) {
  if (!name) return;
  const list = getPosClients();
  const idx  = list.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  if (idx !== -1) { list[idx].address = address || list[idx].address; list[idx].phone = phone || list[idx].phone || ''; }
  else list.push({ name, address: address || '', phone: phone || '' });
  localStorage.setItem('tbs_pos_clients', JSON.stringify(list));
}
function nameMatches(name, typed) {
  const n = normTxt(name).replace(/[\-'’.,]+/g, ' ');
  const v = normTxt(typed).replace(/[\-'’.,]+/g, ' ');
  if (!v) return false;
  return n.startsWith(v) || (' ' + n).includes(' ' + v);
}
function getClientSources() {
  const sources = [];
  const add = c => {
    if (!c || !c.name) return;
    const key = normTxt(c.name);
    const ex  = sources.find(s => normTxt(s.name) === key);
    if (ex) {
      if (!ex.address && c.address) ex.address = c.address;
      if (!ex.phone   && c.phone)   ex.phone   = c.phone;
      if (!ex.email   && c.email)   ex.email   = c.email;
    } else sources.push({ name: c.name, address: c.address || '', phone: c.phone || '', email: c.email || '' });
  };
  if (typeof getCustomers === 'function') { try { getCustomers().forEach(add); } catch (err) {} }
  getPosClients().forEach(add);
  return sources;
}
function findClientMatches(typed) {
  const v = normTxt(typed);
  return getClientSources()
    .filter(c => nameMatches(c.name, typed))
    .sort((a, b) => (normTxt(b.name).startsWith(v) ? 1 : 0) - (normTxt(a.name).startsWith(v) ? 1 : 0) || a.name.localeCompare(b.name))
    .slice(0, 8);
}
function showClientDropdown(nameInput, ddId, onPick) {
  const old = document.getElementById(ddId);
  if (old) old.remove();
  const val = nameInput.value.trim();
  if (!val) return;
  const matches = findClientMatches(val);
  if (matches.length === 0) return;
  const dd = document.createElement('div');
  dd.id = ddId;
  dd.style.cssText = `position:absolute;z-index:999;background:#1a1520;border:1px solid rgba(255,255,255,0.15);border-radius:8px;left:0;right:0;top:100%;max-height:200px;overflow-y:auto;`;
  matches.forEach(c => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:10px 12px;cursor:pointer;font-size:0.875rem;border-bottom:1px solid rgba(255,255,255,0.06);';
    const strong = document.createElement('strong');
    strong.style.color = '#ddd8cc'; strong.textContent = c.name; item.appendChild(strong);
    const extra = [c.address, c.phone].filter(Boolean).join(' · ');
    if (extra) {
      const sp = document.createElement('div');
      sp.style.cssText = 'color:rgba(200,190,175,0.55);font-size:0.78em;margin-top:2px;';
      sp.textContent = extra; item.appendChild(sp);
    }
    item.addEventListener('mousedown', ev => { ev.preventDefault(); onPick(c); dd.remove(); });
    item.addEventListener('touchstart', () => { onPick(c); dd.remove(); }, { passive: true });
    dd.appendChild(item);
  });
  const wrap = nameInput.parentElement;
  if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(dd); }
}
function removeFkDropdown() { const dd = fkEl('fkNameDropdown'); if (dd) dd.remove(); }

function initFkAutocomplete() {
  const n = fkEl('fkName'); if (!n) return;
  n.addEventListener('input', () => {
    fkUpdateBtn();
    showClientDropdown(n, 'fkNameDropdown', c => {
      n.value = c.name;
      if (fkEl('fkAddr'))  fkEl('fkAddr').value  = c.address || '';
      if (fkEl('fkPhone')) fkEl('fkPhone').value = c.phone   || '';
      if (fkEl('fkEmail')) fkEl('fkEmail').value = c.email   || '';
      removeFkDropdown(); fkUpdateBtn();
    });
  });
  n.addEventListener('blur', () => setTimeout(removeFkDropdown, 200));
}
document.addEventListener('click', e => { if (!e.target.closest('#fkName')) removeFkDropdown(); });

/* ══════════════════════════════════════════════
   IMAJ + POLIS
   ══════════════════════════════════════════════ */
function loadImg(src, size) {
  size = size || 200;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Kenbe pwopòsyon (logo platfòm, imaj peman) */
function loadImgFit(src, maxPx) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const r = Math.min(1, (maxPx || 900) / img.width);
        const w = Math.max(1, Math.round(img.width * r)), h = Math.max(1, Math.round(img.height * r));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ data: c.toDataURL('image/png'), w, h });
      } catch (err) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function platCandidates(key) {
  const base = PLAT_MAP[key].file.replace(/\.\w+$/, '');
  const names = [...new Set([base, base.charAt(0).toUpperCase() + base.slice(1), PLAT_MAP[key].label])];
  const out = [];
  names.forEach(n => ['png', 'jpg', 'jpeg'].forEach(x => out.push(n + '.' + x)));
  return out;
}
async function loadPlatFit(key) {
  for (const src of platCandidates(key)) { const d = await loadImgFit(src, 500); if (d) return d; }
  return null;
}
async function loadPaiement() {
  for (const n of ['paiement.png', 'Paiement.png', 'paiement.jpg', 'paiement.jpeg', 'paiement.webp']) {
    const r = await loadImgFit(n, 1400); if (r) return r;
  }
  return null;
}

/* Siyati Thomas Kabé = imaj manuscrit.jpg (fon blan retire → transparan, kenbe pwopòsyon) */
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
async function loadSignatureImg() {
  for (const n of ['manuscrit.jpg', 'Manuscrit.jpg', 'manuscrit.jpeg', 'manuscrit.png']) {
    const r = await loadImgRaw(n); if (r) return r;
  }
  return null;
}

/* ══════════════════════════════════════════════
   DESEN PDF — chak fakti = 148.5 × 210 mm (mwatye paj A4 paysaj)
   Estil : papye ki respire — liy fen, pa gen kwen won, tout ranpli an Courier nwa
   ══════════════════════════════════════════════ */
function fkFmtDate(v) {
  if (!v) return '';
  let d;
  if (typeof v === 'number') d = new Date(v);
  else if (/^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(v.slice(0, 10) + 'T12:00:00');
  else return String(v);
  if (isNaN(d)) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

/* Ekstansyon otomatik : 23 → 23 LBS · 4.90 → 4,90$ · 39 → 39$ · 135 → 135 HTG · 5265 → 5,265 HTG */
function fkFmtWeight(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  const m = s.replace(',', '.').match(/^([0-9]*\.?[0-9]+)\s*([a-zA-Z]*)$/);
  if (!m) return s;
  let u = (m[2] || 'LBS').toUpperCase();
  if (u === 'LB') u = 'LBS';
  return m[1].replace('.', ',') + ' ' + u;
}
function fkFmtUsd(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  const m = s.replace(',', '.').replace(/\s*(usd|us|dollars?)$/i, '').match(/^\$?\s*([0-9]*\.?[0-9]+)\s*\$?$/);
  return m ? m[1].replace('.', ',') + '$' : s;
}
function fkFmtHtg(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  const m = s.replace(/[\s,]/g, '').replace(/(htg|gdes|g)$/i, '').match(/^([0-9]+)(\.[0-9]+)?$/);
  if (!m) return s;
  return m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (m[2] ? m[2].replace('.', ',') : '') + ' HTG';
}

function drawCompanyTitle(doc, x, y, rgb, maxW) {
  const txt = 'LES CAYES DROPSHIPPING CO., LTD.';
  let size = 15;
  rgb = rgb || [255, 255, 255]; maxW = maxW || 102;
  doc.setFont('helvetica', 'bold');
  if (typeof doc.getTextWidth === 'function') {
    doc.setFontSize(size);
    while (size > 10 && doc.getTextWidth(txt) > maxW) { size -= 0.5; doc.setFontSize(size); }
  }
  doc.setFontSize(size);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(txt, x, y);
}

function drawLineWithArrows(doc, line, x, y, rgb, opts) {
  const parts = String(line).split('->');
  if (parts.length === 1) { doc.text(line, x, y, opts); return; }
  const align = (opts && opts.align) || 'left';
  const total = doc.getTextWidth(line);
  let cx = align === 'right' ? x - total : (align === 'center' ? x - total / 2 : x);
  const aw = doc.getTextWidth('->');
  const fs = doc.getFontSize() * 0.3528;
  const midY = y - fs * 0.30;
  parts.forEach((p, i) => {
    if (p) { doc.text(p, cx, y); cx += doc.getTextWidth(p); }
    if (i < parts.length - 1) {
      const headL = Math.min(1.8, fs * 0.5), headH = headL * 0.95;
      const x1 = cx + 0.4, tip = cx + aw - 0.3;
      doc.saveGraphicsState();
      doc.setDrawColor(rgb[0], rgb[1], rgb[2]); doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(0.28);
      doc.line(x1, midY, tip - headL + 0.3, midY);
      doc.triangle(tip, midY, tip - headL, midY - headH / 2, tip - headL, midY + headH / 2, 'F');
      doc.restoreGraphicsState();
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      cx += aw;
    }
  });
}

/* Tout ranpli = Courier nwa (menm polis ak enfo kliyan an) */
function fkType(doc, txt, x, y, maxW, size, o) {
  txt = String(txt == null ? '' : txt);
  if (!txt) return;
  o = o || {};
  doc.setFont('courier', o.bold ? 'bold' : 'normal'); doc.setTextColor(15, 15, 15);
  let s = size; doc.setFontSize(s);
  while (s > 5.5 && doc.getTextWidth(txt) > maxW) { s -= 0.3; doc.setFontSize(s); }
  doc.text(txt, x, y, o.align ? { align: o.align } : undefined);
}
function fkBox(doc, x, y, s, checked) {
  doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.3); doc.rect(x, y, s, s, 'S');
  if (checked) {
    doc.setDrawColor(FK_RED[0], FK_RED[1], FK_RED[2]); doc.setLineWidth(0.75);
    doc.line(x + s * 0.16, y + s * 0.56, x + s * 0.42, y + s * 0.84);
    doc.line(x + s * 0.42, y + s * 0.84, x + s * 0.95, y + s * 0.08);
  }
}
function fkImgFit(doc, img, x, y, maxW, maxH, alignX) {
  const k = Math.min(maxW / img.w, maxH / img.h), w = img.w * k, h = img.h * k;
  const px = alignX === 'center' ? x + (maxW - w) / 2 : (alignX === 'right' ? x + maxW - w : x);
  doc.addImage(img.data, 'PNG', px, y + (maxH - h) / 2, w, h);
  return w;
}

/* Koupe tèks nan liy (menm mo ki twò long) — pa depann de jsPDF pou fakti a pa janm depase */
function fkWrap(doc, txt, maxW) {
  const out = [];
  let cur = '';
  String(txt == null ? '' : txt).split(/\s+/).filter(Boolean).forEach(word => {
    while (doc.getTextWidth(word) > maxW && word.length > 1) {
      let k = word.length;
      while (k > 1 && doc.getTextWidth(word.slice(0, k)) > maxW) k--;
      if (cur) { out.push(cur); cur = ''; }
      out.push(word.slice(0, k));
      word = word.slice(k);
    }
    const t = cur ? cur + ' ' + word : word;
    if (cur && doc.getTextWidth(t) > maxW) { out.push(cur); cur = word; } else cur = t;
  });
  if (cur) out.push(cur);
  return out;
}

function drawFakti(doc, e, imgs, ox) {
  const W = 148.5, M = 10, R = W - M, CW = W - 2 * M;
  const L = ox + M, RR = ox + R;
  const acha = !!e.acha, ship = !!e.ship;
  const hair = (x1, x2, y) => { doc.setDrawColor(175, 175, 175); doc.setLineWidth(0.15); doc.line(x1, y, x2, y); };
  const lab = (t, x, y, size, o) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(size || 6.3); doc.setTextColor(95, 95, 95);
    doc.text(t, x, y, o);
    return doc.getTextWidth(t);
  };

  /* Watermark — logo an koulè, dèyè tout kontni */
  if (imgs.logo) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.10 }));
    const s = 100;
    doc.addImage(imgs.logo, 'PNG', ox + (W - s) / 2, 72, s, s);
    doc.restoreGraphicsState();
  }

  /* 1. ANTET */
  if (imgs.logo) doc.addImage(imgs.logo, 'PNG', L, 8, 20, 20);
  drawCompanyTitle(doc, L + 25, 14.5, [15, 15, 15], RR - (L + 25));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(70, 70, 70);
  doc.text('USA: 9801 SW 3rd St, Pembroke Pines, FL 33025', L + 25, 19.2);
  doc.text('Haiti: Les Cayes', L + 25, 22.9);
  doc.text('+509 35 60 88 69  |  lescayesdropshipping@gmail.com', L + 25, 26.6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(FK_RED[0], FK_RED[1], FK_RED[2]);
  doc.text('No. lcd' + fkPad(e.invoiceNo), RR, 26.6, { align: 'right' });
  {   /* Fraz komèsyal yon sèl liy, anba enfo konpayi a */
    const tag = 'Nou se patnè fyab ou pou pwojè komès ak livrezon USA -> Ayiti.  Achte sou entènèt avè n ak konfyans.';
    let ts = 7.2;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(ts);
    while (ts > 5.2 && doc.getTextWidth(tag) > CW) { ts -= 0.2; doc.setFontSize(ts); }
    doc.setTextColor(60, 60, 60);
    drawLineWithArrows(doc, tag, (L + RR) / 2, 31.2, [60, 60, 60], { align: 'center' });
  }
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.line(L, 33.4, RR, 33.4);

  /* ── Blòk yo (flux vètikal : fakti a pa janm depase mwatye paj la) ── */
  const lw = 78, rgap = 4.5, rwid = CW - lw - rgap, rx = L + lw + rgap;
  const PITCH = 9.5;
  const nRows = 3;

  const field = (x, w, y0, title, draw) => {
    lab(title, x, y0 + 2.6);
    hair(x, x + w, y0 + 8.3);
    draw(x, w, y0);
  };
  const text = (t, x, w, y0, size) => fkType(doc, t, x, y0 + 7.1, w, size || 8.8);

  const blocks = [];

  /* Motif pèman */
  blocks.push({ h: 4.4, draw: y => {
    const yb = y + 3.3;
    lab('MOTIF PÈMAN', L, yb, 6.3);
    fkBox(doc, L + 27, y + 0.1, 3.8, acha);  lab('ACHA', L + 32.5, yb, 7.5);
    fkBox(doc, L + 50, y + 0.1, 3.8, ship);  lab('SHIPPING', L + 55.5, yb, 7.5);
  } });

  /* Enfo kliyan */
  blocks.push({ h: PITCH * nRows, draw: y => {
    const rowY = i => y + PITCH * i;
    field(L, lw, rowY(0), 'NON', () => text(String(e.clientName || '').toUpperCase(), L, lw, rowY(0), 9.2));
    field(rx, rwid, rowY(0), 'DAT', () => text(fkFmtDate(e.date), rx, rwid, rowY(0)));
    field(L, lw, rowY(1), 'ADRÈS', () => text(e.clientAddr, L, lw, rowY(1)));
    field(rx, rwid, rowY(1), 'TELEFÒN', () => text(e.clientPhone, rx, rwid, rowY(1)));
    {
      const y0 = rowY(2);
      field(L, lw, y0, 'ORIJIN MACHANDIZ', () => {
        const ks = e.origins || [], n = ks.length;
        if (!n) return;
        const slot = lw / Math.max(n, 2);
        ks.forEach((k, i) => {
          const im = imgs['plat:' + k];
          if (im) fkImgFit(doc, im, L + i * slot, y0 + 3.4, slot - 3, 5.6, 'left');
          else fkType(doc, PLAT_MAP[k] ? PLAT_MAP[k].label : k, L + i * slot, y0 + 7.1, slot - 3, 8.8);
        });
      });
    }
    field(rx, rwid, rowY(2), 'IMÈL', () => text(e.clientEmail, rx, rwid, rowY(2), 8.2));
  } });

  /* Dat (Acha sèlman) */
  if (acha) blocks.push({ h: 10.5, draw: y => {
    const cw = (CW - 8) / 3;
    [['DAT KÒMAND IZÍN', e.dateCmd], ['DAT MACHANDIZ LAN LIVRE USA', e.dateUSA], ['DAT MACHANDIZ LAN DISPONIB AYITI', e.dateHT]].forEach(([t, v], i) => {
      const x = L + i * (cw + 4);
      let s = 5.8; doc.setFont('helvetica', 'bold'); doc.setFontSize(s);
      while (s > 4.2 && doc.getTextWidth(t) > cw) { s -= 0.2; doc.setFontSize(s); }
      lab(t, x, y + 2.6, s);
      hair(x, x + cw, y + 9.3);
      fkType(doc, fkFmtDate(v), x, y + 8.1, cw, 8.6);
    });
  } });

  /* Tablo : PWA | DESKRIPSYON | PRI U. | TAUX | MONTAN US  +  TOTAL HTG (gras) */
  const th = 8, totH = 10, dataBase = 18;
  const c = [L, L + 17, L + 80, L + 96, L + 112, RR];
  const descW = c[2] - c[1] - 4;
  const tbl = { h: 0, dH: dataBase, dl: null, draw: (y, grow) => {
    const dH = tbl.dH + grow;
    doc.setFillColor(232, 232, 232); doc.rect(L, y, CW, th, 'F');
    doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.line(L, y, RR, y);
    ['PWA', 'DESKRIPSYON', 'PRI U.', 'TAUX', 'MONTAN US'].forEach((t, i) => lab(t, (c[i] + c[i + 1]) / 2, y + 5.1, 6.6, { align: 'center' }));
    const yd = y + th, ym = yd + dH / 2 + 1.2;
    fkType(doc, fkFmtWeight(e.pwa), (c[0] + c[1]) / 2, ym, 15.5, 9, { align: 'center' });
    fkType(doc, fkFmtUsd(e.pri), (c[2] + c[3]) / 2, ym, 14.5, 9, { align: 'center' });
    fkType(doc, fkFmtHtg(e.taux), (c[3] + c[4]) / 2, ym, 14.5, 9, { align: 'center' });
    fkType(doc, fkFmtUsd(e.usd), (c[4] + c[5]) / 2, ym, 15, 9, { align: 'center' });
    if (tbl.dl) {
      const dl = tbl.dl;
      doc.setFont('courier', 'normal'); doc.setFontSize(dl.size); doc.setTextColor(15, 15, 15);
      const y0 = yd + (dH - dl.lines.length * dl.lh) / 2 + dl.lh * 0.78;
      dl.lines.forEach((ln, i) => doc.text(ln, c[1] + 2, y0 + i * dl.lh));
    }
    hair(L, RR, yd + dH);
    doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.line(L, yd + dH + totH, RR, yd + dH + totH);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(15, 15, 15);
    doc.text('TOTAL', c[1] + 2, yd + dH + totH / 2 + 1.3);
    fkType(doc, fkFmtHtg(e.htg), RR - 2, yd + dH + totH / 2 + 1.7, 52, 11.5, { align: 'right', bold: true });
  } };

  /* Rezime peman (Acha) + logo peman adwat anba total, san tit */
  const summary = { h: 19.5, draw: y => {
    const sw = 62;
    [['MONTAN POU PEYE', e.totalPay], ['MONTAN M BAY', e.paid], ['BALANS M RETE', e.bal]].forEach(([t, v], i) => {
      const yb = y + 4 + i * 6.6;
      lab(t, L, yb, 6.4);
      hair(L, L + sw, yb + 1.5);
      const shown = v ? fkFmtUsd(v) : (acha ? '' : '-');
      fkType(doc, shown, L + sw - 1, yb, 28, 9, { align: 'right' });
    });
    const pw = 64, px = RR - pw;
    const cb = y + 3.8;
    fkBox(doc, RR - 58, cb - 2.9, 3.4, e.net === 'peye');  lab('PEYE NÈT', RR - 53, cb, 6.8);
    fkBox(doc, RR - 30, cb - 2.9, 3.4, e.net === 'pa');    lab('PA PEYE NÈT', RR - 25, cb, 6.8);
    if (imgs.pay) fkImgFit(doc, imgs.pay, px, y + 8.2, pw, 8, 'right');
  } };

  /* Nòt : maks 3 liy, ti polis si l long */
  let noteLines = [];
  if (e.note) {
    doc.setFont('courier', 'normal'); doc.setFontSize(7);
    noteLines = fkWrap(doc, e.note, CW - 12);
    if (noteLines.length > 3) { noteLines = noteLines.slice(0, 3); noteLines[2] = noteLines[2].slice(0, Math.max(0, noteLines[2].length - 3)) + '...'; }
  }
  const note = { h: 3 + noteLines.length * 3.4, draw: y => {
    lab('NÒT', L, y + 3, 6.3);
    noteLines.forEach((ln, i) => fkType(doc, ln, L + 10, y + 3 + i * 3.4, CW - 12, 7));
  } };

  blocks.push(tbl, summary);
  if (noteLines.length) blocks.push(note);

  /* Distribisyon espas — deskripsyon (400 kar.) ak nòt rapetisse otomatikman pou fakti a rete nan mwatye paj la */
  const TOP = 37, BOTTOM = 182, GAP = 4.5, MINGAP = 2.8;
  const nGaps = blocks.length - 1;
  const otherH = blocks.filter(b => b !== tbl).reduce((s, b) => s + b.h, 0);
  const maxDH = (BOTTOM - TOP) - otherH - th - totH - MINGAP * nGaps;

  let dH = Math.min(dataBase, maxDH);
  if (e.desc) {
    doc.setFont('courier', 'normal');
    let size = 8.6, lines, lh, fit = false;
    for (; size >= 4.8; size = Math.round((size - 0.2) * 10) / 10) {
      doc.setFontSize(size);
      lines = fkWrap(doc, e.desc, descW); lh = size * 0.47;
      if (lines.length * lh + 2 <= maxDH) { fit = true; break; }
    }
    if (!fit) {                                   // dènye rekou : koupe nan fen pou pa janm depase paj la
      size = 4.8; doc.setFontSize(size);
      lines = fkWrap(doc, e.desc, descW); lh = size * 0.47;
      const cap = Math.max(1, Math.floor((maxDH - 2) / lh));
      if (lines.length > cap) { lines = lines.slice(0, cap); lines[cap - 1] = lines[cap - 1].slice(0, Math.max(0, lines[cap - 1].length - 3)) + '...'; }
    }
    tbl.dl = { size, lines, lh };
    dH = Math.max(Math.min(dataBase, maxDH), Math.min(maxDH, lines.length * lh + 5));
  }
  tbl.dH = dH;
  tbl.h = th + dH + totH;

  const natural = blocks.reduce((s, b) => s + b.h, 0) + GAP * nGaps;
  let extra = (BOTTOM - TOP) - natural, grow = 0, gap;
  if (extra >= 0) {
    grow = Math.min(extra * 0.4, 10); extra -= grow;
    gap = GAP + Math.min(extra / nGaps, 6);
  } else gap = Math.max(MINGAP, GAP + extra / nGaps);
  let y = TOP;
  blocks.forEach(b => {
    const g = b === tbl ? grow : 0;
    b.draw(y, g);
    y += b.h + g + gap;
  });

  /* Anba : FÈT PA + siyati manuscrit.jpg (pi piti, poze sou liy la) */
  lab('FÈT PA', L, 196, 6.4);
  hair(L + 10, L + 48, 197);
  if (imgs.sig) fkImgFit(doc, imgs.sig, L + 12, 186.5, 31, 10.2, 'left');
}

async function buildFichesPdf(entries) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return false; }
  entries = (entries || []).filter(Boolean).slice(0, 2);
  if (!entries.length) return false;
  const { jsPDF } = window.jspdf;
  const platKeys = [];
  entries.forEach(e => { (e.origins || []).forEach(p => { if (PLAT_MAP[p] && !platKeys.includes(p)) platKeys.push(p); }); });

  const res = await Promise.all([loadImg('lescayesdropshipping.png', 400), loadPaiement(), loadSignatureImg(), ...platKeys.map(loadPlatFit)]);
  const imgs = { logo: res[0], pay: res[1], sig: res[2] };
  platKeys.forEach((k, i) => { imgs['plat:' + k] = res[i + 3]; });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  entries.forEach((e, i) => drawFakti(doc, e, imgs, i * 148.5));

  if (entries.length === 2) {
    doc.setDrawColor(170, 170, 170); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0); doc.line(148.5, 0, 148.5, 210); doc.setLineDashPattern([], 0);
  }
  const slug = e => (e.clientName || 'Kliyan').trim().replace(/\s+/g, '_');
  const no = e => 'lcd' + fkPad(e.invoiceNo);
  doc.save(entries.length === 1 ? 'Fakti_' + slug(entries[0]) + '_' + no(entries[0]) + '.pdf'
                                : 'Fakti_' + slug(entries[0]) + '_et_' + slug(entries[1]) + '.pdf');
  return true;
}

/* Kompatibilite ansyen non (si lòt fichye rele yo) */
function calcLive() {}
function calcAchaLive() {}
function generatePOSInvoice() { fkFinish(); }
function generateAchaInvoice() { fkFinish(); }
function clearPosForm() { fkClear(); }

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initFkAutocomplete();
  const d = fkEl('fkDesc'); if (d) d.addEventListener('input', fkCount);
  fkClear(true);
  switchPosTab('new');
  fkRefresh();
});
