/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — pos.js  v6
   Jeneratè Fakti inifye (Acha + Shipping) — PDF A4 paysaj, 2 fakti pa paj

   • Yon sèl fòm : kaz ACHA / SHIPPING (koche an wouj sou PDF la)
   • Yon sèl liy nan tablo a : Pwa | Deskripsyon (100 kar.) | Pri U. | Montan USD | HTG
     (chak chan sof deskripsyon : 6 karaktè maksimòm) — OKENN kalkil otomatik
   • Non kliyan, adrès… = polis enfòmatize (Courier) · rès la = ekriti men, plim ble
   • « Terminé pour X » : fakti a antre nan FILE D'ATTENTE (max 10), san PDF
   • Chwazi 2 fakti nan file a → PDF paysaj → yo kite file a, men rete nan istorik
   • Chak peman (Montan m bay) antre otomatikman nan pwofil kliyan an (customers.js)
     → total ogmante, nivo kliyan rekalkile (Bronze / Argent / Platine / Or / Super Client)
   ══════════════════════════════════════════════ */

const FK_KEY       = 'tbs_fakti_v1';
const FK_COUNTER   = 'tbs_fakti_counter';
const FK_MIGRATED  = 'tbs_fakti_migrated_v1';
const FK_PRINTED_MAX = 20;      // istorik : 20 dènye fakti deja enprime
const FK_QUEUE_MAX   = 10;      // file d'attente : 10 fakti maksimòm
const POS_KEY  = 'tbs_pos_history_v2';   // ansyen kle (lekti sèlman — migrasyon)
const ACHA_KEY = 'tbs_acha_history_v2';

const HAND_INK = [38, 18, 150];     // ankre ble-vyolèt (modèl manuscrit)
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
let FK_HAND = { ok: false };   // polis manuscrit chaje ?

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
      origins: [], pwa: '', pri: '', totalPay: '', paid: '', bal: '', net: '', faitPar: '',
      dateCmd: '', dateUSA: '', dateHT: '', note: String(h.note || '').slice(0, 120),
      printed: true, pays: [], paidByStage: {}
    });
    (JSON.parse(localStorage.getItem(ACHA_KEY)) || []).forEach(h => {
      const ship = (h.shippingHT || 0) > 0, usd = ship ? h.grandTotal : h.achatUsine;
      out.push({ ...base(h), origins: [h.plateforme, h.plateforme2].filter(Boolean), acha: true, ship,
        stage: ship ? 'acha+ship' : 'acha', desc: String(h.desc || '').slice(0, 100),
        usd: usd ? six(Number(usd).toFixed(2).replace(/\.00$/, '')) : '', htg: usd ? six(Math.round(usd * 135)) : '',
        dateCmd: h.dateCommande || '', dateUSA: h.dateLivreUSA || '', dateHT: h.dateDispoAyiti || '' });
    });
    (JSON.parse(localStorage.getItem(POS_KEY)) || []).forEach(h => {
      out.push({ ...base(h), acha: false, ship: true, stage: 'ship', desc: String(h.desc || '').slice(0, 100),
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
const FK_FIELDS = ['fkName','fkAddr','fkPhone','fkEmail','fkPlat1','fkPlat2','fkPwa','fkDesc','fkPri','fkUsd','fkHtg',
                   'fkPay','fkPaid','fkBal','fkNet','fkFaitPar','fkDateCmd','fkDateUSA','fkDateHT','fkNote'];
const fkEl = id => document.getElementById(id);
const fkVal = id => ((fkEl(id) && fkEl(id).value) || '').trim();
const fkChk = id => !!(fkEl(id) && fkEl(id).checked);
function fkToday() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function fkRead() {
  const lim = (id, n) => fkVal(id).slice(0, n);
  const ds = fkVal('fkDate');
  const origins = [fkVal('fkPlat1'), fkVal('fkPlat2')].filter(Boolean).filter((p, i, a) => a.indexOf(p) === i);
  return {
    clientName: fkVal('fkName'), clientAddr: fkVal('fkAddr'), clientPhone: fkVal('fkPhone'), clientEmail: fkVal('fkEmail'),
    origins, acha: fkChk('fkAcha'), ship: fkChk('fkShip'),
    pwa: lim('fkPwa', 6), desc: lim('fkDesc', 100), pri: lim('fkPri', 6), usd: lim('fkUsd', 6), htg: lim('fkHtg', 6),
    totalPay: lim('fkPay', 6), paid: lim('fkPaid', 6), bal: lim('fkBal', 6), net: fkVal('fkNet'),
    faitPar: lim('fkFaitPar', 30), dateCmd: fkVal('fkDateCmd'), dateUSA: fkVal('fkDateUSA'), dateHT: fkVal('fkDateHT'),
    note: lim('fkNote', 120),
    date: ds ? new Date(ds + 'T12:00:00').getTime() : Date.now()
  };
}

function fkFill(e) {
  const map = { fkName: e.clientName, fkAddr: e.clientAddr, fkPhone: e.clientPhone, fkEmail: e.clientEmail,
    fkPlat1: (e.origins || [])[0] || '', fkPlat2: (e.origins || [])[1] || '', fkPwa: e.pwa, fkDesc: e.desc, fkPri: e.pri,
    fkUsd: e.usd, fkHtg: e.htg, fkPay: e.totalPay, fkPaid: e.paid, fkBal: e.bal, fkNet: e.net || '', fkFaitPar: e.faitPar,
    fkDateCmd: e.dateCmd, fkDateUSA: e.dateUSA, fkDateHT: e.dateHT, fkNote: e.note };
  FK_FIELDS.forEach(id => { if (fkEl(id)) fkEl(id).value = (map[id] == null ? '' : map[id]); });
  if (fkEl('fkAcha')) fkEl('fkAcha').checked = !!e.acha;
  if (fkEl('fkShip')) fkEl('fkShip').checked = !!e.ship;
  if (fkEl('fkDate')) { const d = new Date(e.date || Date.now()); fkEl('fkDate').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
}

function fkOnFlags() {
  const acha = fkChk('fkAcha'), ship = fkChk('fkShip');
  const ns = fkStageFor(fkEditingId ? fkPrev : null, acha, ship);
  if (ns !== fkFormStage && fkEl('fkPaid')) {
    fkFormMemo[fkFormStage] = fkEl('fkPaid').value;
    fkEl('fkPaid').value = fkFormMemo[ns] || '';
    fkFormStage = ns;
  }
  const h = fkEl('fkStageHint');
  if (h) h.textContent = (acha || ship) ? ('Peman etap : ' + STAGE_LABEL[ns] + ' → ajoute nan pwofil kliyan an') : 'Chwazi Acha oswa Shipping';
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
  fkEditingId = null; fkPrev = null; fkFormStage = 'ship'; fkFormMemo = {};
  const b = fkEl('fkEditBanner'); if (b) b.style.display = 'none';
  fkOnFlags(); fkUpdateBtn(); fkCount();
  if (!silent) showToast('Fòm efase');
}

function fkCount() {
  const d = fkEl('fkDescCount'); if (d) d.textContent = fkVal('fkDesc').length + ' / 100';
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
  e.paidByStage = { ...(e.paidByStage || {}), [stage]: e.paid };
  fkLogPayment(e, stage, fkNum(e.paid));
  if (typeof savePosClient === 'function') savePosClient(e.clientName, e.clientAddr, e.clientPhone);
  fkSave(list);

  const q = fkGet().filter(h => !h.printed).length;
  showToast('Fakti #lcd' + fkPad(e.invoiceNo) + (idx < 0 ? ' anrejistre' : ' mete ajou') + ' · file : ' + q);
  fkClear(true);
  fkRefresh();
}

function fkEdit(id) {
  const e = fkGet().find(h => h.id === id); if (!e) return;
  fkClear(true);
  fkEditingId = id;
  fkPrev = { acha: !!e.acha, ship: !!e.ship, stage: e.stage || fkStageFor(null, e.acha, e.ship) };
  fkFormMemo = { ...(e.paidByStage || {}) };
  fkFormStage = fkPrev.stage;
  fkFill(e);
  if (fkEl('fkPaid')) fkEl('fkPaid').value = fkFormMemo[fkFormStage] || '';
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
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.45);margin-top:3px;">#lcd${fkPad(h.invoiceNo)} · ${fkFmtDate(h.date)}${h.usd ? ' · $' + esc(h.usd) : ''}</div>
        </div>
      </label>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="fkEdit('${h.id}')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#ddd8cc;font-size:0.8rem;padding:6px 9px;cursor:pointer;">✏️</button>
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
          <div style="font-family:'Space Mono',monospace;font-size:0.9rem;color:#d4af37;">${h.usd ? '$' + esc(h.usd) : ''}</div>
          <div style="font-size:0.7rem;color:rgba(200,180,100,0.55);">${h.htg ? esc(h.htg) + ' HTG' : ''}</div>
          <button onclick="fkEdit('${h.id}')" style="${btn}">✏️</button><button onclick="printOneFiche('${h.id}')" style="${btn}">PDF</button>${h.printed ? `<button onclick="fkRequeue('${h.id}')" style="${btn}">↩</button>` : ''}
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

/* Polis manuscrit (.ttf) mete sou hébergement : manuscrit.ttf — si li absan, yon itali ble ranplase l */
function fkB64(buf) {
  let s = ''; const b = new Uint8Array(buf), CH = 0x8000;
  for (let i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
  return btoa(s);
}
async function loadHandFont() {
  for (const n of ['manuscrit.ttf', 'Manuscrit.ttf', 'ecriture.ttf', 'hand.ttf']) {
    try {
      const r = await fetch(n);
      if (!r.ok) continue;
      const buf = await r.arrayBuffer(), h = new Uint8Array(buf.slice(0, 4));
      const isTTF = (h[0] === 0 && h[1] === 1 && h[2] === 0 && h[3] === 0) || String.fromCharCode(h[0], h[1], h[2], h[3]) === 'true';
      if (isTTF) return fkB64(buf);
    } catch (err) {}
  }
  return null;
}

/* ══════════════════════════════════════════════
   DESEN PDF — chak fakti = 148.5 × 210 mm (mwatye paj A4 paysaj)
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

/* Ekriti men : ankre ble, ti dekalaj ak ti anjòl pa mo (deterministik) */
function fkSetHand(doc, size) {
  if (FK_HAND.ok) doc.setFont('Hand', 'normal'); else doc.setFont('times', 'italic');
  doc.setFontSize(size);
  doc.setTextColor(HAND_INK[0], HAND_INK[1], HAND_INK[2]);
}
function fkHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function fkRand(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; }
function fkHandText(doc, txt, x, y, size, o) {
  txt = String(txt == null ? '' : txt);
  if (!txt) return;
  o = o || {};
  fkSetHand(doc, size);
  if (o.maxW) { let s = size; while (s > 5.5 && doc.getTextWidth(txt) > o.maxW) { s -= 0.4; doc.setFontSize(s); } }
  const seed = fkHash(txt);
  const words = txt.split(' '), sp = doc.getTextWidth(' ');
  const ws = words.map(w => doc.getTextWidth(w));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let cx = o.align === 'right' ? x - total : (o.align === 'center' ? x - total / 2 : x);
  words.forEach((w, i) => {
    if (w) doc.text(w, cx, y + fkRand(seed + i * 13 + 3) * 0.22, { angle: fkRand(seed + i * 7) * 0.8 });
    cx += ws[i] + sp;
  });
}
function fkType(doc, txt, x, y, maxW, size) {   // polis enfòmatize (Courier)
  txt = String(txt == null ? '' : txt);
  if (!txt) return;
  doc.setFont('courier', 'normal'); doc.setTextColor(15, 15, 15);
  let s = size; doc.setFontSize(s);
  while (s > 5.5 && doc.getTextWidth(txt) > maxW) { s -= 0.3; doc.setFontSize(s); }
  doc.text(txt, x, y);
}
function fkBox(doc, x, y, s, checked) {
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.rect(x, y, s, s, 'S');
  if (checked) {
    doc.setDrawColor(FK_RED[0], FK_RED[1], FK_RED[2]); doc.setLineWidth(0.8);
    doc.line(x + s * 0.16, y + s * 0.56, x + s * 0.42, y + s * 0.84);
    doc.line(x + s * 0.42, y + s * 0.84, x + s * 0.95, y + s * 0.08);
    doc.setDrawColor(15, 15, 15);
  }
}
function fkImgFit(doc, img, x, y, maxW, maxH, alignX) {
  const k = Math.min(maxW / img.w, maxH / img.h), w = img.w * k, h = img.h * k;
  const px = alignX === 'center' ? x + (maxW - w) / 2 : x;
  doc.addImage(img.data, 'PNG', px, y + (maxH - h) / 2, w, h);
  return w;
}

function drawFakti(doc, e, imgs, ox) {
  const W = 148.5, M = 7, R = W - M, CW = W - 2 * M;
  const X = v => ox + v;
  const logo = imgs.logo;
  const label = (t, x, y, size) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size || 7.5); doc.setTextColor(15, 15, 15); doc.text(t, x, y); return doc.getTextWidth(t); };

  /* Watermark — logo an koulè, dèyè tout kontni */
  if (logo) {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.10 }));
    const s = 100;
    doc.addImage(logo, 'PNG', X((W - s) / 2), 70, s, s);
    doc.restoreGraphicsState();
  }

  /* 1. ANTET */
  if (logo) doc.addImage(logo, 'PNG', X(M), 6, 22, 22);
  drawCompanyTitle(doc, X(M + 26), 12.5, [15, 15, 15], R - (M + 26));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
  doc.text('USA: 9801 SW 3rd St, Pembroke Pines, FL 33025-1064', X(M + 26), 18.5);
  doc.text('Haiti: Miragoane, Les Cayes', X(M + 26), 22.7);
  doc.text('+509 35 60 88 69  _  lescayesdropshipping@gmail.com', X(M + 26), 26.9);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(FK_RED[0], FK_RED[1], FK_RED[2]);
  doc.text('No. lcd' + fkPad(e.invoiceNo), X(R), 26.9, { align: 'right' });
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.6); doc.line(X(M), 31, X(R), 31);

  /* 2. BLOK KLIYAN : NON → ADRÈS → ORIJIN | DAT, TELEFÒN, IMÈL + MOTIF PÈMAN */
  const bx = X(M), by = 34, hr = 9.2, LW = 84;
  const rowBase = i => by + hr * i + hr / 2 + 1.2;
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.roundedRect(bx, by, CW, hr * 4, 2, 2, 'S');
  doc.setLineWidth(0.3);
  for (let i = 1; i <= 3; i++) doc.line(bx, by + hr * i, bx + CW, by + hr * i);
  doc.line(bx + LW, by, bx + LW, by + hr * 3);

  let w = label('NON', bx + 2.5, rowBase(0));      fkType(doc, String(e.clientName || "").toUpperCase(), bx + 2.5 + w + 2.5, rowBase(0), LW - w - 7.5, 9);
  w = label('DAT', bx + LW + 2.5, rowBase(0));     fkType(doc, fkFmtDate(e.date), bx + LW + 2.5 + w + 2.5, rowBase(0), CW - LW - w - 7.5, 8.5);
  w = label('ADRÈS', bx + 2.5, rowBase(1));        fkType(doc, e.clientAddr, bx + 2.5 + w + 2.5, rowBase(1), LW - w - 7.5, 8.5);
  w = label('TELEFÒN', bx + LW + 2.5, rowBase(1)); fkType(doc, e.clientPhone, bx + LW + 2.5 + w + 2.5, rowBase(1), CW - LW - w - 7.5, 8.5);
  w = label('ORIJIN MACHANDIZ', bx + 2.5, rowBase(2));
  {
    const ax = bx + 2.5 + w + 3, avail = LW - w - 8, n = (e.origins || []).length;
    if (n) {
      const slot = avail / n;
      e.origins.forEach((k, i) => {
        const im = imgs['plat:' + k];
        if (im) fkImgFit(doc, im, ax + i * slot, by + hr * 2 + 1.3, slot - 2, hr - 2.6, 'left');
        else fkType(doc, PLAT_MAP[k] ? PLAT_MAP[k].label : k, ax + i * slot, rowBase(2), slot - 2, 8.5);
      });
    }
  }
  w = label('IMÈL', bx + LW + 2.5, rowBase(2));    fkType(doc, e.clientEmail, bx + LW + 2.5 + w + 2.5, rowBase(2), CW - LW - w - 7.5, 8);
  label('MOTIF PÈMAN', bx + 2.5, rowBase(3));
  fkBox(doc, bx + 36, by + hr * 3 + (hr - 4) / 2, 4, e.acha);    label('ACHA', bx + 42, rowBase(3), 8.5);
  fkBox(doc, bx + 66, by + hr * 3 + (hr - 4) / 2, 4, e.ship);    label('SHIPPING', bx + 72, rowBase(3), 8.5);

  /* 3. MÒD PÈMAN (imaj) + MONTAN yo */
  const py = by + hr * 4 + 2.6, ph = 22, lw2 = 70;
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.roundedRect(bx, py, lw2, ph, 2, 2, 'S');
  doc.setLineWidth(0.3); doc.line(bx, py + 6.5, bx + lw2, py + 6.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(15, 15, 15);
  doc.text('MÒD PÈMAN', bx + lw2 / 2, py + 4.6, { align: 'center' });
  if (imgs.pay) fkImgFit(doc, imgs.pay, bx + 2, py + 7.6, lw2 - 4, ph - 9, 'center');
  const rx = bx + lw2 + 2.5, rw = CW - lw2 - 2.5, rh = ph / 3, vx = rx + 33;
  doc.setLineWidth(0.5); doc.roundedRect(rx, py, rw, ph, 2, 2, 'S');
  doc.setLineWidth(0.3); doc.line(rx, py + rh, rx + rw, py + rh); doc.line(rx, py + 2 * rh, rx + rw, py + 2 * rh); doc.line(vx, py, vx, py + ph);
  [['MONTAN POU PEYE', e.totalPay], ['MONTAN M BAY', e.paid], ['BALANS M RETE', e.bal]].forEach(([t, v], i) => {
    const yb = py + rh * i + rh / 2 + 1.1;
    label(t, rx + 2, yb, 6.8);
    fkHandText(doc, v, vx + 2.5, yb + 0.2, 10, { maxW: rx + rw - vx - 4 });
  });

  /* 4. FÈT PA + PEYE NÈT / PA PEYE NÈT */
  const fy = py + ph + 2.6, fh = 9;
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.roundedRect(bx, fy, CW, fh, 2, 2, 'S');
  doc.setLineWidth(0.3); doc.line(bx + LW, fy, bx + LW, fy + fh);
  const fb = fy + fh / 2 + 1.2;
  w = label('FÈT PA', bx + 2.5, fb, 7.5);
  doc.setDrawColor(110, 110, 110); doc.setLineWidth(0.25); doc.line(bx + 2.5 + w + 2, fb + 0.8, bx + LW - 3, fb + 0.8);
  fkHandText(doc, e.faitPar, bx + 2.5 + w + 3.5, fb - 0.3, 9.5, { maxW: LW - w - 10 });
  fkBox(doc, bx + LW + 3, fy + (fh - 3.8) / 2, 3.8, e.net === 'peye');   label('PEYE NÈT', bx + LW + 8.5, fb, 7);
  fkBox(doc, bx + LW + 23, fy + (fh - 3.8) / 2, 3.8, e.net === 'pa');    label('PA PEYE NÈT', bx + LW + 28.5, fb, 7);

  /* 5. DAT yo (toujou afiche, menm vid) */
  const dy = fy + fh + 2.6, dh = 9.5, cw3 = CW / 3;
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.roundedRect(bx, dy, CW, dh, 2, 2, 'S');
  doc.setLineWidth(0.3); doc.line(bx + cw3, dy, bx + cw3, dy + dh); doc.line(bx + 2 * cw3, dy, bx + 2 * cw3, dy + dh);
  [['DAT KÒMAND IZÍN', e.dateCmd], ['DAT MACHANDIZ LAN LIVRE USA', e.dateUSA], ['DAT MACHANDIZ LAN DISPONIB AYITI', e.dateHT]].forEach(([t, v], i) => {
    const cx = bx + cw3 * i + 2.5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); doc.setTextColor(15, 15, 15);
    let s = 5.8; while (s > 4.2 && doc.getTextWidth(t) > cw3 - 4) { s -= 0.2; doc.setFontSize(s); }
    doc.text(t, cx, dy + 3.4);
    fkHandText(doc, fkFmtDate(v), cx, dy + 7.7, 9);
  });

  /* 6. TABLO : yon sèl liy — Pwa | Deskripsyon | Pri U. | Montan USD | HTG */
  const ty = dy + dh + 2.6, th = 9, TBL_END = 157, totH = 8.5;
  const dataH = TBL_END - (ty + th) - totH;
  const x1 = bx + 17, x2 = bx + 75, x3 = bx + 92, x4 = bx + 112;
  doc.setFillColor(85, 85, 85); doc.rect(bx, ty, CW, th, 'F');
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.3);
  [x1, x2, x3].forEach(x => doc.line(x, ty, x, ty + th));
  doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.setFontSize(7.5);
  doc.text('PWA', (bx + x1) / 2, ty + 5.6, { align: 'center' });
  doc.text('DESKRIPSYON', (x1 + x2) / 2, ty + 5.6, { align: 'center' });
  doc.text('PRI U.', (x2 + x3) / 2, ty + 5.6, { align: 'center' });
  doc.text('MONTAN', (x3 + bx + CW) / 2, ty + 3.9, { align: 'center' });
  doc.setFontSize(6); doc.text('USD', (x3 + x4) / 2, ty + 7.5, { align: 'center' }); doc.text('HTG', (x4 + bx + CW) / 2, ty + 7.5, { align: 'center' });
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.rect(bx, ty, CW, th + dataH + totH, 'S');
  doc.setLineWidth(0.3);
  doc.line(bx, ty + th + dataH, bx + CW, ty + th + dataH);
  [x1, x2, x3].forEach(x => doc.line(x, ty + th, x, ty + th + dataH));
  doc.setLineDashPattern([1.2, 1.2], 0); doc.line(x4, ty + th, x4, ty + th + dataH + totH); doc.setLineDashPattern([], 0);

  const midY = ty + th + dataH / 2 + 1.4;
  fkHandText(doc, e.pwa, (bx + x1) / 2, midY, 10.5, { align: 'center', maxW: 15 });
  fkHandText(doc, e.pri, (x2 + x3) / 2, midY, 10.5, { align: 'center', maxW: 15 });
  fkHandText(doc, e.usd, (x3 + x4) / 2, midY, 10.5, { align: 'center', maxW: 18 });
  fkHandText(doc, e.htg, (x4 + bx + CW) / 2, midY, 10.5, { align: 'center', maxW: 20.5 });
  if (e.desc) {
    let size = 9.5, lines, lh;
    fkSetHand(doc, size);
    do { doc.setFontSize(size); lines = doc.splitTextToSize(e.desc, x2 - x1 - 4); lh = size * 0.46; size -= 0.5; }
    while (lines.length * lh > dataH - 1.5 && size > 6);
    const y0 = ty + th + (dataH - lines.length * lh) / 2 + lh * 0.78;
    lines.forEach((ln, i) => fkHandText(doc, ln, x1 + 2, y0 + i * lh, size + 0.5));
  }
  /* TOTAL — repete menm montan yo (pa gen kalkil) */
  const tb = ty + th + dataH + totH / 2 + 1.3;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 15, 15);
  doc.text('TOTAL', x3 - 3, tb, { align: 'right' });
  fkHandText(doc, e.usd, (x3 + x4) / 2, tb, 10.5, { align: 'center', maxW: 18 });
  fkHandText(doc, e.htg, (x4 + bx + CW) / 2, tb, 10.5, { align: 'center', maxW: 20.5 });

  /* 7. NÒT */
  if (e.note) {
    const ny = TBL_END + 5.2;
    label('NÒT:', bx, ny, 7);
    fkSetHand(doc, 8.5);
    const nl = doc.splitTextToSize(e.note, CW - 10).slice(0, 2);
    nl.forEach((ln, i) => fkHandText(doc, ln, bx + 9, ny + i * 4.2, 8.5));
  }

  /* 8. MESAJ + SIYATI + PYE PAJ */
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.2); doc.setTextColor(40, 40, 40);
  drawLineWithArrows(doc, 'Nou se patnè fyab ou pou pwojè komès ak livrezon USA -> Ayiti.', X(W / 2), 174.3, [40, 40, 40], { align: 'center' });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.2); doc.setTextColor(40, 40, 40);
  doc.text('Achte sou entènèt avè n ak konfyans.', X(W / 2), 178.3, { align: 'center' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 100, 100);
  doc.text('Siyati kliyan:', bx, 184);
  doc.setDrawColor(130, 130, 130); doc.setLineWidth(0.3); doc.line(bx, 191.5, bx + 58, 191.5);
  const sx1 = X(R) - 62, sx2 = X(R);
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.line(sx1, 191.5, sx2, 191.5);
  doc.setFont('times', 'bolditalic'); doc.setFontSize(10.5); doc.setTextColor(15, 15, 15);
  doc.text('Thomas Kabé (Responsab Sid)', (sx1 + sx2) / 2, 197, { align: 'center' });

  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.3); doc.line(X(M), 200.6, X(R), 200.6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(40, 40, 40);
  doc.text('Les Cayes Dropshipping  _  lescayesdropshipping@gmail.com  _  +509 35 60 88 69  _  Aux Cayes', X(W / 2), 204.3, { align: 'center' });
}

async function buildFichesPdf(entries) {
  if (!window.jspdf) { showToast('jsPDF pa chaje'); return false; }
  entries = (entries || []).filter(Boolean).slice(0, 2);
  if (!entries.length) return false;
  const { jsPDF } = window.jspdf;
  const platKeys = [];
  entries.forEach(e => (e.origins || []).forEach(p => { if (PLAT_MAP[p] && !platKeys.includes(p)) platKeys.push(p); }));

  const res = await Promise.all([loadImg('lescayesdropshipping.png', 400), loadPaiement(), loadHandFont(), ...platKeys.map(loadPlatFit)]);
  const imgs = { logo: res[0], pay: res[1] };
  platKeys.forEach((k, i) => { imgs['plat:' + k] = res[i + 3]; });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  FK_HAND.ok = false;
  if (res[2]) {
    try { doc.addFileToVFS('Hand.ttf', res[2]); doc.addFont('Hand.ttf', 'Hand', 'normal'); doc.setFont('Hand', 'normal'); FK_HAND.ok = true; }
    catch (err) { FK_HAND.ok = false; }
  }
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
