/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — customers.js  v2
   CRM · Gestion Kliyan
   ══════════════════════════════════════════════

   NOUVÈLTÈ v3 :
   • Kategori kliyan : AKTIF (an premye, klase pa dènye aktivite) / ANSYEN KLIYAN
     (manyèl oswa otomatik apre CUSTOMER_INACTIVE_DAYS jou san aktivite)
   • Badge pwofil : ✓ Complet / ⚠ Incomplet (+ sa ki manke)
   • CORBEILLE : tout efasman (kliyan, tranzaksyon, fakti POS) rete 30 jou anvan efasman definitif
   NOUVÈLTÈ v2 :
   • Tranzaksyon tipaj : 'depans' (dépense client) | 'peman' (paiement reçu)
   • Klasman otomatik : pa montant total depans + frekans
   • Badge nivo kliyan : Bronze / Silver / Gold / Platinum
   ══════════════════════════════════════════════ */

const CUST_KEY = 'tbs_customers';
let customerSortMode = 'recent'; // tri par défaut = dernière activité (actifs d'abord)
let currentCustomerId = null;

const AVATAR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E";

/* ── Storage ────────────────────────────────── */
function getCustomers() {
  try { return JSON.parse(localStorage.getItem(CUST_KEY)) || []; }
  catch { return []; }
}

function saveCustomers(list) {
  localStorage.setItem(CUST_KEY, JSON.stringify(list));
}

/* ══════════════════════════════════════════════
   KATEGORI KLIYAN : aktif / ansyen + pwofil konplè
   ══════════════════════════════════════════════ */
const CUSTOMER_INACTIVE_DAYS = 90;                       // san aktivite pandan 90 jou → ansyen kliyan (si pa fikse a men)
const CUSTOMER_REQUIRED = [['phone', 'téléphone'], ['address', 'adresse']];   // + non (ajoute ['email','email'] si ou vle l obligatwa)
let oldSectionCollapsed = false;

/* Dènye aktivite = dènye modifikasyon pwofil la, dènye depans/modifikasyon depans, dènye chanjman kategori */
function getCustLastActivity(c) {
  let t = Math.max(c.updatedAt || 0, c.createdAt || 0, c.seniorityAt || 0);
  (c.transactions || []).forEach(x => { t = Math.max(t, x.updatedAt || 0, x.date || 0); });
  return t;
}

/* 'active' | 'old' — fikse a men (c.seniority) genyen sou otomatik */
function getCustomerCategory(c) {
  if (c.seniority === 'old')    return 'old';
  if (c.seniority === 'active') return 'active';
  return (Date.now() - getCustLastActivity(c)) > CUSTOMER_INACTIVE_DAYS * 86400000 ? 'old' : 'active';
}

function getProfileStatus(c) {
  const missing = [];
  if (!String(c.name || '').trim()) missing.push('nom');
  CUSTOMER_REQUIRED.forEach(([k, label]) => { if (!String(c[k] || '').trim()) missing.push(label); });
  return { complete: missing.length === 0, missing };
}

function profileBadgeHtml(c, clickable) {
  const ps   = getProfileStatus(c);
  const base = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;';
  if (ps.complete) {
    return `<span title="Profil complet" style="${base}background:rgba(46,158,107,0.16);color:#5fd39c;border:1px solid rgba(46,158,107,0.45);">✓ Complet</span>`;
  }
  const click = clickable ? ` onclick="event.stopPropagation();openCustomerForm('${c.id}');closeCustomerDetail();"` : '';
  return `<span title="Manque : ${custEsc(ps.missing.join(', '))}"${click} style="${base}background:rgba(230,150,40,0.14);color:#f0b45a;border:1px solid rgba(230,150,40,0.45);${clickable ? 'cursor:pointer;' : ''}">⚠ Incomplet</span>`;
}

function categoryBadgeHtml(c) {
  const base = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;';
  if (getCustomerCategory(c) === 'old') {
    const days = Math.floor((Date.now() - getCustLastActivity(c)) / 86400000);
    return `<span style="${base}background:rgba(160,160,170,0.14);color:#b9b9c4;border:1px solid rgba(160,160,170,0.35);">🕰 Ansyen kliyan${days > 0 ? ' · ' + days + ' j' : ''}</span>`;
  }
  return `<span style="${base}background:rgba(80,160,255,0.12);color:#8bbcff;border:1px solid rgba(80,160,255,0.35);">🟢 Aktif</span>`;
}

/* Mete yon kliyan nan kategori « ansyen » oswa remete l aktif (chwa manyèl) */
function setCustomerSeniority(id, mode) {
  const list = getCustomers();
  const c = list.find(x => x.id === id);
  if (!c) return;
  c.seniority   = mode === 'old' ? 'old' : 'active';
  c.seniorityAt = Date.now();
  saveCustomers(list);
  openCustomerDetail(id);
  renderCustomers();
  showToast(mode === 'old' ? '🕰 Mete nan ansyen kliyan' : '🟢 Kliyan remete aktif');
}

function toggleOldClients() { oldSectionCollapsed = !oldSectionCollapsed; renderCustomers(); }

/* Nouvo aktivite (depans) sou yon ansyen kliyan fikse a men → li tounen aktif otomatikman */
function reactivateIfOld(c) {
  if (c && c.seniority === 'old') { c.seniority = ''; c.seniorityAt = Date.now(); return true; }
  return false;
}

/* ══════════════════════════════════════════════
   CORBEILLE — tout efasman rete 30 jou, apre sa efase pou tout bon
   Kalite : 'client' · 'txn' (tranzaksyon) · 'invoice' (fakti POS, anrejistre pa pos.js)
   ══════════════════════════════════════════════ */
const TRASH_KEY  = 'tbs_trash_v1';
const TRASH_DAYS = 30;
const TRASH_HANDLERS = {};      // kind → { restore(data, item) → true | 'mesaj erè' }

function trashRegister(kind, handler) { TRASH_HANDLERS[kind] = handler; }
function _trashId() { return (typeof uid === 'function') ? uid() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); }
function trashGet() { try { return JSON.parse(localStorage.getItem(TRASH_KEY)) || []; } catch { return []; } }
function trashSave(list) { localStorage.setItem(TRASH_KEY, JSON.stringify(list)); trashUpdateBadge(); }

/* Retire sa ki fin pase 30 jou (rele nan chajman, chak louvèti corbeille ak chak 6 èdtan) */
function trashPurge() {
  const now = Date.now(), list = trashGet();
  const keep = list.filter(x => (x.expiresAt || 0) > now);
  if (keep.length !== list.length) { try { localStorage.setItem(TRASH_KEY, JSON.stringify(keep)); } catch (err) {} }
  trashUpdateBadge();
  return list.length - keep.length;
}

/* Retounen true si anrejistre. Si espas la plen, eseye san foto. */
function trashAdd(kind, label, data, extra) {
  try {
    trashPurge();
    const list = trashGet(), now = Date.now();
    const item = { id: _trashId(), kind, label, data, deletedAt: now, expiresAt: now + TRASH_DAYS * 86400000, ...(extra || {}) };
    list.unshift(item);
    try { trashSave(list); }
    catch (err) {
      if (item.data && item.data.avatar) { item.data = { ...item.data, avatar: null }; trashSave(list); }
      else throw err;
    }
    return true;
  } catch (err) { return false; }
}

function trashDaysLeft(it) { return Math.max(0, Math.ceil(((it.expiresAt || 0) - Date.now()) / 86400000)); }
function trashFmt(ts) {
  const d = new Date(ts);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
function trashUpdateBadge() {
  let n = 0; try { n = trashGet().length; } catch (err) {}
  document.querySelectorAll('.trash-count').forEach(el => { el.textContent = n > 0 ? '(' + n + ')' : ''; });
}

function trashRestore(id) {
  const list = trashGet();
  const it = list.find(x => x.id === id);
  if (!it) return;
  const h = TRASH_HANDLERS[it.kind];
  if (!h) { showToast('⚠️ Restorasyon pa posib isit la'); return; }
  const res = h.restore(it.data, it);
  if (res !== true) { showToast(typeof res === 'string' ? res : '⚠️ Restorasyon pa posib'); return; }
  trashSave(list.filter(x => x.id !== id));
  showToast('↩️ Restore : ' + it.label);
  openTrash();
}

function openTrash() {
  trashPurge();
  document.getElementById('trashModal')?.remove();
  const items = trashGet().sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  const icon  = { client: '👤', txn: '💵', invoice: '🧾' };
  const rows  = items.length === 0
    ? `<div style="text-align:center;color:rgba(200,190,175,0.5);padding:34px 10px;font-size:0.85rem;">Corbeille vide.</div>`
    : items.map(it => `
        <div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:1.25rem;">${icon[it.kind] || '📦'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.88rem;font-weight:600;color:#ddd8cc;overflow:hidden;text-overflow:ellipsis;">${custEsc(it.label)}</div>
            <div style="font-size:0.68rem;color:rgba(200,190,175,0.5);margin-top:2px;">Efase ${trashFmt(it.deletedAt)} · definitif nan ${trashDaysLeft(it)} j</div>
          </div>
          <button onclick="trashRestore('${it.id}')" style="flex-shrink:0;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);border-radius:8px;color:#d4af37;font-size:0.76rem;font-weight:600;padding:6px 10px;cursor:pointer;">↩ Restore</button>
        </div>`).join('');
  const modal = document.createElement('div');
  modal.id = 'trashModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(3px);';
  modal.innerHTML = `
    <div style="background:#1a1520;border:1px solid rgba(212,175,55,0.35);border-radius:16px;max-width:400px;width:92%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 0 40px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px 6px;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.05rem;font-weight:700;color:#ddd8cc;">🗑 Corbeille <span style="opacity:0.6;font-weight:500;">(${items.length})</span></div>
        <button onclick="document.getElementById('trashModal').remove()" style="background:none;border:none;color:#aaa;font-size:1.1rem;cursor:pointer;">✕</button>
      </div>
      <div style="padding:0 18px 8px;font-size:0.7rem;color:rgba(200,190,175,0.5);">Tout ce qui est supprimé reste ici ${TRASH_DAYS} jours, puis il est effacé définitivement.</div>
      <div style="overflow-y:auto;padding:0 18px 16px;">${rows}</div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/* Restorasyon pou kliyan ak tranzaksyon */
trashRegister('client', { restore(data) {
  const list = getCustomers();
  if (list.some(c => c.id === data.id)) return '⚠️ Kliyan sa a deja egziste';
  list.unshift({ ...data, updatedAt: Date.now() });
  saveCustomers(list);
  if (typeof renderCustomers === 'function') renderCustomers();
  return true;
} });
trashRegister('txn', { restore(data) {
  const list = getCustomers();
  const c = list.find(x => x.id === data.clientId);
  if (!c) return '⚠️ Kliyan an pa la ankò — restore kliyan an dabò';
  c.transactions = c.transactions || [];
  if (c.transactions.some(t => t.id === data.txn.id)) return '⚠️ Tranzaksyon sa a deja la';
  c.transactions.push(data.txn);
  c.transactions.sort((a, b) => (a.date || 0) - (b.date || 0));
  c.updatedAt = Date.now();
  saveCustomers(list);
  if (typeof renderCustomers === 'function') renderCustomers();
  return true;
} });

/* ── Score d'activité (pour le classement) ── */
function getActivityScore(c) {
  const txns    = c.transactions || [];
  const total   = getTotalDepenses(c);    // montant total dépensé
  const count   = txns.filter(t => t.txType === 'depans' || !t.txType).length; // nombre de fois
  /* Score pondéré : total (80%) + fréquence (20%) */
  return total * 0.8 + count * 0.2;
}

/* Total des dépenses (uniquement type 'depans' ou anciennes transactions sans type) */
function getTotalDepenses(c) {
  return (c.transactions || [])
    .filter(t => t.txType === 'depans' || !t.txType)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

/* Total général (pour affichage) */
function getTotalSpent(c) {
  return (c.transactions || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

/* ── Badge nivo kliyan (5 nivo + statut standard) ── */
function getClientBadge(c) {
  const total = getTotalDepenses(c);
  if (total >= 1000) return { label: 'Super Client', color: '#1a0533', text: '#e0b8ff', emoji: '👑' };
  if (total >= 500)  return { label: 'Or',           color: '#d4af37', text: '#1a0e00', emoji: '🥇' };
  if (total >= 300)  return { label: 'Platine',      color: '#b5d1e8', text: '#1a3a52', emoji: '💎' };
  if (total >= 200)  return { label: 'Argent',       color: '#c0c0c0', text: '#1a1a1a', emoji: '🥈' };
  if (total >= 100)  return { label: 'Bronze',       color: '#c07a3a', text: '#2a0e00', emoji: '🥉' };
  return { label: 'Standard', color: '#3a3a3a', text: '#aaaaaa', emoji: '·' };
}

function getTierRank(total) {
  if (total >= 1000) return 5;
  if (total >= 500)  return 4;
  if (total >= 300)  return 3;
  if (total >= 200)  return 2;
  if (total >= 100)  return 1;
  return 0;
}

/* ── Modal Selebrasyon ──────────────────────── */
function showCelebrationModal(clientName, badge) {
  // Retire l'ancien si existe
  const old = document.getElementById('celebrationModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'celebrationModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);
    animation:fadeInCeleb 0.35s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes fadeInCeleb { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
      @keyframes confettiFall {
        0%  { transform: translateY(-20px) rotate(0deg);   opacity:1; }
        100%{ transform: translateY(120vh) rotate(720deg); opacity:0; }
      }
      .celeb-confetti { position:absolute;width:10px;height:10px;border-radius:2px;animation:confettiFall linear infinite; }
    </style>
    <div style="
      position:relative;overflow:hidden;
      background:linear-gradient(145deg,#1a0533,#0d1f3c);
      border:2px solid ${badge.color};border-radius:20px;
      padding:36px 28px 28px;text-align:center;
      max-width:320px;width:88%;box-shadow:0 0 60px ${badge.color}55;
    " id="celebInner">

      <!-- Confettis générés par JS -->
      <div id="confettiContainer" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div>

      <div style="font-size:3.2rem;margin-bottom:8px;">${badge.emoji}</div>
      <div style="font-size:1.05rem;font-weight:800;color:#fff;font-family:'Rajdhani',sans-serif;letter-spacing:0.05em;margin-bottom:6px;">
        BRAVO !
      </div>
      <div style="font-size:0.95rem;color:${badge.color};font-weight:700;font-family:'Rajdhani',sans-serif;margin-bottom:14px;">
        ${clientName} pase nan nivo
      </div>
      <div style="
        display:inline-block;padding:10px 24px;border-radius:30px;
        background:${badge.color};color:${badge.text};
        font-family:'Cinzel',serif;font-size:1.2rem;font-weight:700;
        letter-spacing:0.1em;margin-bottom:18px;
        box-shadow:0 0 20px ${badge.color}88;
      ">${badge.label.toUpperCase()}</div>
      <div style="font-size:0.78rem;color:rgba(255,255,255,0.45);margin-bottom:20px;font-family:'Rajdhani',sans-serif;">
        Kont kliyan an mete ajou otomatikman.
      </div>
      <button onclick="document.getElementById('celebrationModal').remove()" style="
        background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);
        color:#fff;padding:10px 32px;border-radius:30px;cursor:pointer;
        font-family:'Rajdhani',sans-serif;font-size:0.95rem;font-weight:600;
        transition:background 0.2s;
      ">✔ Kontinye</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Génère confettis
  const colors = [badge.color, '#fff', '#d4af37', '#a78bfa', '#f472b6'];
  const container = modal.querySelector('#confettiContainer');
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'celeb-confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.top  = -(Math.random() * 100) + 'px';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration  = (2 + Math.random() * 3) + 's';
    c.style.animationDelay     = (Math.random() * 2) + 's';
    c.style.width  = (6 + Math.random() * 10) + 'px';
    c.style.height = (6 + Math.random() * 10) + 'px';
    container.appendChild(c);
  }
}

/* ── Render List ────────────────────────────── */
function renderCustomers() {
  let list = getCustomers();
  const q = (document.getElementById('customerSearch')?.value || '').toLowerCase();
  if (q) list = list.filter(c =>
    (c.name    || '').toLowerCase().includes(q) ||
    (c.phone   || '').includes(q) ||
    (c.email   || '').toLowerCase().includes(q)
  );

  const sorter = (a, b) => {
    if (customerSortMode === 'name') return (a.name || '').localeCompare(b.name || '');
    if (customerSortMode === 'amount')   return getTotalDepenses(b) - getTotalDepenses(a);
    if (customerSortMode === 'activity') return getActivityScore(b) - getActivityScore(a);
    return getCustLastActivity(b) - getCustLastActivity(a);          // 'recent' : dènye aktivite an premye
  };
  const active = list.filter(c => getCustomerCategory(c) === 'active').sort(sorter);
  const old    = list.filter(c => getCustomerCategory(c) === 'old').sort(sorter);

  const el = document.getElementById('customerList');
  if (!el) return;
  trashUpdateBadge();

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:48px 20px;font-size:0.9rem;">Okenn kliyan ankò.<br>Peze + pou ajoute premye a.</div>`;
    return;
  }

  const card = (c, isOld) => {
    const total   = getTotalDepenses(c);
    const badge   = getClientBadge(c);
    const avatarHtml = c.avatar
      ? `<img class="cust-avatar" src="${c.avatar}" alt="${custEsc(c.name)}" />`
      : `<div class="cust-initials">${getInitials(c.name)}</div>`;
    return `
      <div class="customer-card" onclick="openCustomerDetail('${c.id}')" ${isOld ? 'style="opacity:0.82;"' : ''}>
        ${avatarHtml}
        <div class="cust-info">
          <div class="cust-name">${custEsc(c.name)}</div>
          <div class="cust-meta">${custEsc(c.phone || c.email || c.address || '—')}</div>
          <div style="margin-top:4px;">${profileBadgeHtml(c, false)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${total > 0 ? `<div class="cust-total">${fmtCurrency(total)}</div>` : ''}
          <span style="
            display:inline-block;margin-top:3px;padding:2px 7px;border-radius:10px;
            font-size:0.65rem;font-weight:700;
            background:${badge.color};color:${badge.text};
          ">${badge.emoji} ${badge.label}</span>
        </div>
      </div>
    `;
  };
  const head = (icon, title, n, onclick, chevron) => `
    <div ${onclick ? `onclick="${onclick}"` : ''} style="display:flex;align-items:center;justify-content:space-between;padding:12px 6px 6px;font-family:'Rajdhani',sans-serif;font-size:0.8rem;font-weight:700;letter-spacing:0.08em;color:rgba(212,175,55,0.85);${onclick ? 'cursor:pointer;' : ''}">
      <span>${icon} ${title}</span><span style="opacity:0.75;">${n}${chevron || ''}</span>
    </div>`;

  let html = head('🟢', 'KLIYAN AKTIF', active.length);
  html += active.length ? active.map(c => card(c, false)).join('')
                        : `<div style="color:var(--text-muted);font-size:0.8rem;padding:6px 8px 10px;">Okenn kliyan aktif.</div>`;
  if (old.length) {
    html += head('🕰', 'ANSYEN KLIYAN', old.length, 'toggleOldClients()', oldSectionCollapsed ? ' ▸' : ' ▾');
    if (!oldSectionCollapsed) html += old.map(c => card(c, true)).join('');
  }
  el.innerHTML = html;
}

function filterCustomers() { renderCustomers(); }

function sortCustomers(mode, btn) {
  customerSortMode = mode;
  document.querySelectorAll('#customersScreen .cm-tab[data-sort]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCustomers();
}

/* ══════════════════════════════════════════════
   BILAN MANSYÈL — Rantre kliyan − Soti = Benefis
   Rantre = depans kliyan nan mwa a · Soti = soti manyèl nan mwa a
   Soti manyèl : non oswa motif + montan ($ oswa HTG) · HTG konvèti ak taux benefis la
   ══════════════════════════════════════════════ */
const SORTIES_KEY = 'tbs_sorties_v1';
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
let bilanMonthKey = null;

function getSorties() { try { return JSON.parse(localStorage.getItem(SORTIES_KEY)) || []; } catch { return []; } }
function saveSorties(list) { localStorage.setItem(SORTIES_KEY, JSON.stringify(list)); }
function bilanKeyOf(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function bilanLabel(key) { const p = key.split('-'); return MOIS_FR[(+p[1]) - 1] + ' ' + p[0]; }
function bilanShiftKey(key, delta) { const p = key.split('-').map(Number); return bilanKeyOf(new Date(p[0], p[1] - 1 + delta, 1).getTime()); }
function bilanDefaultDate(key) {
  if (key === bilanKeyOf(Date.now())) { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  return key + '-01';
}

function bilanData(key) {
  const p = key.split('-').map(Number);
  const start = new Date(p[0], p[1] - 1, 1).getTime(), end = new Date(p[0], p[1], 1).getTime();
  const inR = t => t >= start && t < end;
  const tx = getProfitTaux();
  const rentrees = [], perClient = {};
  const customers = getCustomers();
  customers.forEach(c => {
    (c.transactions || []).forEach(t => {
      if ((t.txType === 'depans' || !t.txType) && inR(t.date || 0)) {
        const a = parseFloat(t.amount) || 0;
        rentrees.push({ date: t.date, client: c.name || '', desc: t.desc || '', amount: a });
        perClient[c.name || ''] = (perClient[c.name || ''] || 0) + a;
      }
    });
  });
  rentrees.sort((a, b) => a.date - b.date);
  const manual = getSorties().filter(x => inR(x.date || 0)).map(x => ({
    id: x.id, date: x.date, label: x.label || 'Soti', amount: parseFloat(x.amount) || 0, cur: x.cur === 'HTG' ? 'HTG' : 'USD',
    usd: x.cur === 'HTG' ? (parseFloat(x.amount) || 0) / tx : (parseFloat(x.amount) || 0)
  })).sort((a, b) => a.date - b.date);
  const totalIn = rentrees.reduce((sum, r) => sum + r.amount, 0);
  const totalManual = manual.reduce((sum, r) => sum + r.usd, 0);
  return { key, tx, rentrees, perClient, manual, totalIn, totalManual, totalOut: totalManual, profit: totalIn - totalManual };
}

function bilanGoMonth(delta) { bilanMonthKey = bilanShiftKey(bilanMonthKey || bilanKeyOf(Date.now()), delta); showBilanModal(); }

function addSortie() {
  const label = (document.getElementById('bilanSLabel')?.value || '').trim();
  const amount = parseFloat(String(document.getElementById('bilanSAmount')?.value || '').replace(',', '.'));
  const cur = document.getElementById('bilanSCur')?.value === 'HTG' ? 'HTG' : 'USD';
  const ds = document.getElementById('bilanSDate')?.value || bilanDefaultDate(bilanMonthKey || bilanKeyOf(Date.now()));
  if (!label) { showToast('⚠️ Antre non oswa motif soti a'); return; }
  if (!(amount > 0)) { showToast('⚠️ Montan obligatwa'); return; }
  const date = new Date(ds + 'T12:00:00').getTime();
  const list = getSorties();
  list.push({ id: uid(), label, amount, cur, date });
  saveSorties(list);
  bilanMonthKey = bilanKeyOf(date);
  showBilanModal();
  showToast('✅ Soti anrejistre');
}

function deleteSortie(id) {
  if (!confirm('Efase soti sa a ?')) return;
  saveSorties(getSorties().filter(x => x.id !== id));
  showBilanModal();
  showToast('🗑️ Soti efase');
}

function showBilanModal() {
  custInjectMenuStyles();
  const oldM = document.getElementById('bilanModal');
  const oldPanel = document.getElementById('bilanPanel');
  const keepScroll = oldPanel ? oldPanel.scrollTop : 0;
  if (oldM) oldM.remove();
  if (!bilanMonthKey) bilanMonthKey = bilanKeyOf(Date.now());
  const d = bilanData(bilanMonthKey);
  const col = d.profit >= 0 ? '#4caf97' : '#e07070';
  const lbl = "font-size:0.68rem;font-weight:700;letter-spacing:0.08em;color:rgba(200,190,175,0.55);font-family:'Rajdhani',sans-serif;text-transform:uppercase;";
  const inp = 'width:100%;box-sizing:border-box;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#ddd8cc;padding:9px 10px;font-size:0.88rem;';
  const delBtn = id => `<button onclick="deleteSortie('${id}')" title="Efase" style="background:none;border:1px solid rgba(220,80,80,0.3);border-radius:6px;color:#e07070;font-size:0.75rem;padding:3px 7px;cursor:pointer;flex-shrink:0;">🗑</button>`;
  const row = (left, sub, right, extra) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="flex:1;min-width:0;"><div style="font-size:0.86rem;color:#ddd8cc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${left}</div>${sub ? `<div style="font-size:0.68rem;color:rgba(200,190,175,0.45);">${sub}</div>` : ''}</div>
      <div style="text-align:right;flex-shrink:0;font-family:'Space Mono',monospace;font-size:0.82rem;font-weight:700;">${right}</div>${extra || ''}
    </div>`;
  const clients = Object.keys(d.perClient).sort((a, b) => d.perClient[b] - d.perClient[a]);
  const inHtml = clients.length ? clients.map(n => row(custEsc(n), '', `<span style="color:#d4af37;">${fmtUsdP(d.perClient[n])}</span>`)).join('')
    : `<div style="color:rgba(200,190,175,0.45);font-size:0.82rem;padding:8px 0;text-align:center;">Okenn rantre nan mwa sa a.</div>`;
  const outManual = d.manual.map(x => row(custEsc(x.label), fmtDate(x.date) + (x.cur === 'HTG' ? ' · ' + fmtHtgP(x.amount) : ''), `<span style="color:#e07070;">-${fmtUsdP(x.usd)}</span>`, delBtn(x.id))).join('');
  const outHtml = outManual || `<div style="color:rgba(200,190,175,0.45);font-size:0.82rem;padding:8px 0;text-align:center;">Okenn soti nan mwa sa a.</div>`;
  const stat = (t, v, c) => `<div class="bl-stat"><div style="${lbl}">${t}</div><div style="font-family:'Space Mono',monospace;font-size:1.05rem;font-weight:700;color:${c};margin-top:3px;">${v}</div></div>`;

  const m = document.createElement('div');
  m.id = 'bilanModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:8888;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);';
  m.innerHTML = `
    <div id="bilanPanel" style="background:#13111a;border-radius:18px 18px 0 0;border-top:2px solid #d4af37;width:100%;max-width:520px;padding:18px 16px 32px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.05rem;font-weight:700;color:#fff;letter-spacing:0.06em;">📊 BILAN</div>
        <button onclick="document.getElementById('bilanModal').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;width:32px;height:32px;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <button class="bl-nav" onclick="bilanGoMonth(-1)">‹</button>
        <div style="font-family:'Rajdhani',sans-serif;font-size:1rem;font-weight:700;color:#d4af37;text-transform:capitalize;">${bilanLabel(d.key)}</div>
        <button class="bl-nav" onclick="bilanGoMonth(1)">›</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${stat('Rantre kliyan', fmtUsdP(d.totalIn), '#d4af37')}
        ${stat('Soti total', fmtOutP(d.totalOut), '#e07070')}
      </div>
      <div style="padding:14px;border-radius:14px;text-align:center;background:${d.profit >= 0 ? 'rgba(76,175,151,0.1)' : 'rgba(224,112,112,0.1)'};border:1px solid ${d.profit >= 0 ? 'rgba(76,175,151,0.4)' : 'rgba(224,112,112,0.4)'};">
        <div style="${lbl}">Benefis</div>
        <div style="font-family:'Space Mono',monospace;font-size:1.7rem;font-weight:700;color:${col};">${fmtUsdP(d.profit)}</div>
        <div style="font-family:'Space Mono',monospace;font-size:1rem;font-weight:700;color:${col};">${fmtHtgP(d.profit * d.tx)}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;font-size:0.72rem;color:rgba(200,190,175,0.55);">
          <span>Taux HTG</span>
          <input type="text" inputmode="decimal" value="${d.tx}" onchange="setProfitTaux(this.value)" style="width:70px;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#ddd8cc;padding:4px 8px;font-size:0.8rem;" />
        </div>
      </div>
      <button class="bl-pdf" onclick="exportBilanPDF()">📄 Ekspòte bilan ${bilanLabel(d.key)} an PDF</button>

      <div><div style="${lbl}margin-bottom:4px;">Rantre pa kliyan</div>${inHtml}</div>

      <div>
        <div style="${lbl}margin-bottom:4px;">Soti</div>
        ${outHtml}
        <div style="margin-top:10px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
          <div style="${lbl}margin-bottom:8px;">+ Nouvo soti</div>
          <input id="bilanSLabel" type="text" placeholder="Non oswa motif soti a" style="${inp}margin-bottom:8px;" />
          <div style="display:grid;grid-template-columns:1fr 84px;gap:8px;margin-bottom:8px;">
            <input id="bilanSAmount" type="number" step="0.01" min="0" placeholder="Montan" style="${inp}" />
            <select id="bilanSCur" style="${inp}"><option value="USD">$</option><option value="HTG">HTG</option></select>
          </div>
          <input id="bilanSDate" type="date" value="${bilanDefaultDate(d.key)}" style="${inp}margin-bottom:10px;" />
          <button class="bl-pdf" style="margin:0;" onclick="addSortie()">✔ Anrejistre soti a</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  const np = document.getElementById('bilanPanel'); if (np && keepScroll) np.scrollTop = keepScroll;
}

/* PDF bilan mansyèl : antèt òdinè konpayi a, rantre, soti, benefis */
async function exportBilanPDF() {
  if (!window.jspdf) { showToast('⚠️ jsPDF pa chaje'); return; }
  const key = bilanMonthKey || bilanKeyOf(Date.now());
  const d = bilanData(key);
  const { jsPDF } = window.jspdf;
  let logo = null;
  if (typeof loadImg === 'function') { try { logo = await loadImg('lescayesdropshipping.png', 400); } catch (err) {} }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 14, R = W - M;
  const GREEN = [20, 120, 70], RED = [190, 40, 40];

  /* Antèt konpayi */
  if (logo) doc.addImage(logo, 'PNG', M, 9, 22, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(15, 15, 15);
  doc.text('LES CAYES DROPSHIPPING CO., LTD.', M + 27, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
  doc.text('USA: 9801 SW 3rd St, Pembroke Pines, FL 33025', M + 27, 20.5);
  doc.text('Haiti: Les Cayes', M + 27, 25);
  doc.text('+509 35 60 88 69  |  lescayesdropshipping@gmail.com', M + 27, 29.5);
  doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.5); doc.line(M, 34, R, 34);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 15, 15);
  doc.text('BILAN MANSYÈL', M, 43);
  doc.setFontSize(11); doc.text(bilanLabel(key).toUpperCase(), R, 43, { align: 'right' });

  /* Rezime */
  let y = 49;
  const bw = (R - M - 8) / 3;
  const box = (i, title, val, rgb) => {
    const x = M + i * (bw + 4);
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.25); doc.rect(x, y, bw, 17);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(95, 95, 95); doc.text(title, x + 3, y + 5);
    doc.setFontSize(12); doc.setTextColor(rgb[0], rgb[1], rgb[2]); doc.text(val, x + 3, y + 12.5);
  };
  const pc = d.profit >= 0 ? GREEN : RED;
  box(0, 'RANTRE KLIYAN', fmtUsdP(d.totalIn), [15, 15, 15]);
  box(1, 'SOTI TOTAL', fmtOutP(d.totalOut), RED);
  box(2, 'BENEFIS', fmtUsdP(d.profit), pc);
  y += 22;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(pc[0], pc[1], pc[2]);
  doc.text('Benefis an HTG : ' + fmtHtgP(d.profit * d.tx) + '   |   taux ' + d.tx + ' HTG', M, y);
  y += 8;

  const ensure = h => { if (y + h > 278) { doc.addPage(); y = 18; } };
  const fit = (t, w) => { t = String(t == null ? '' : t); while (t.length > 1 && doc.getTextWidth(t) > w) t = t.slice(0, -1); return t; };
  const table = (title, heads, rows, totalLabel, totalVal, totalRgb) => {
    ensure(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 15, 15); doc.text(title, M, y);
    y += 3;
    doc.setFillColor(232, 232, 232); doc.rect(M, y, R - M, 6.5, 'F');
    doc.setFontSize(7.5); doc.setTextColor(60, 60, 60);
    heads.forEach(h => doc.text(h.t, h.right ? h.x : h.x, y + 4.4, h.right ? { align: 'right' } : undefined));
    y += 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(25, 25, 25);
    if (!rows.length) { doc.setTextColor(120, 120, 120); doc.text('Okenn done.', M + 2, y + 5); y += 8; }
    rows.forEach(r => {
      ensure(7);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(25, 25, 25);
      heads.forEach((h, i) => {
        const v = r[i];
        if (h.right) doc.text(String(v), h.x, y + 4.6, { align: 'right' });
        else doc.text(fit(v, h.w), h.x, y + 4.6);
      });
      doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.15); doc.line(M, y + 6.5, R, y + 6.5);
      y += 6.5;
    });
    ensure(9);
    doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.line(M, y + 1, R, y + 1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(15, 15, 15);
    doc.text(totalLabel, M + 2, y + 6.5);
    doc.setTextColor(totalRgb[0], totalRgb[1], totalRgb[2]);
    doc.text(totalVal, R - 2, y + 6.5, { align: 'right' });
    y += 14;
  };

  table('RANTRE KLIYAN', [
    { t: 'DAT', x: M + 2, w: 22 }, { t: 'KLIYAN', x: M + 26, w: 50 }, { t: 'DESKRIPSYON', x: M + 78, w: 78 }, { t: 'MONTAN', x: R - 2, right: true }
  ], d.rentrees.map(r => [fmtDate(r.date), r.client, r.desc, fmtUsdP(r.amount)]), 'TOTAL RANTRE', fmtUsdP(d.totalIn), [15, 15, 15]);

  const sRows = d.manual.map(x => [fmtDate(x.date), x.label + (x.cur === 'HTG' ? ' · ' + fmtHtgP(x.amount) : ''), '-' + fmtUsdP(x.usd)]);
  table('SOTI', [
    { t: 'DAT', x: M + 2, w: 22 }, { t: 'NON OSWA MOTIF', x: M + 26, w: 130 }, { t: 'MONTAN', x: R - 2, right: true }
  ], sRows, 'TOTAL SOTI', fmtOutP(d.totalOut), RED);

  ensure(26);
  doc.setFillColor(245, 245, 245); doc.setDrawColor(15, 15, 15); doc.setLineWidth(0.4); doc.rect(M, y, R - M, 20, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 15, 15);
  doc.text('BENEFIS = RANTRE - SOTI', M + 4, y + 7);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 70, 70);
  doc.text(fmtUsdP(d.totalIn) + ' - ' + fmtUsdP(d.totalOut), M + 4, y + 14);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(pc[0], pc[1], pc[2]);
  doc.text(fmtUsdP(d.profit), R - 4, y + 8, { align: 'right' });
  doc.setFontSize(10); doc.text(fmtHtgP(d.profit * d.tx), R - 4, y + 15, { align: 'right' });

  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
    doc.text('Jenere pa Thomas Kabé · Les Cayes Dropshipping · ' + fmtDate(Date.now()), W / 2, 289, { align: 'center' });
    doc.text('Paj ' + p + ' / ' + n, R, 289, { align: 'right' });
  }
  doc.save('LCD-Bilan-' + key + '.pdf');
  showToast('📄 PDF bilan jenere');
}

/* ── Stil meni kliyan + bilan (enjekte yon sèl fwa) ── */
function custInjectMenuStyles() {
  if (!document.head || document.getElementById('cmStyles')) return;
  const st = document.createElement('style');
  st.id = 'cmStyles';
  st.textContent = `
  .cm-tabs{display:flex;gap:6px;padding:4px;margin:10px 0 8px;border-radius:15px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .cm-tab{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 6px;border:0;border-radius:11px;background:transparent;color:rgba(200,190,175,.68);font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.82rem;letter-spacing:.04em;white-space:nowrap;cursor:pointer;transition:background .18s,color .18s,transform .12s}
  .cm-tab.active{background:linear-gradient(135deg,#0e7490,#0a5568);color:#fff;box-shadow:0 4px 12px rgba(14,116,144,.38)}
  .cm-tab:active{transform:scale(.96)}
  .cm-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:6px}
  .cm-act{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 4px 9px;border-radius:13px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);color:#ddd8cc;font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.03em;cursor:pointer;transition:background .18s,border-color .18s,transform .12s}
  .cm-act span:last-child{text-align:center;line-height:1.15}
  .cm-act .ico{font-size:1.2rem;line-height:1}
  .cm-act.cm-act-bilan{background:linear-gradient(135deg,#f6dc8e 0%,#d9b440 52%,#b78a12 100%);border-color:rgba(212,175,55,.7);color:#1d1200;box-shadow:0 4px 14px rgba(212,175,55,.28)}
  .cm-act.cm-act-bilan:hover{background:linear-gradient(135deg,#f6dc8e 0%,#d9b440 52%,#b78a12 100%)}
  .cm-act:hover{background:rgba(14,116,144,.16);border-color:rgba(14,116,144,.5)}
  .cm-act:active{transform:scale(.95)}
  .bl-stat{padding:12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .bl-nav{width:38px;height:34px;border-radius:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#ddd8cc;font-size:1.2rem;cursor:pointer}
  .bl-pdf{width:100%;padding:12px;border:0;border-radius:12px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.92rem;letter-spacing:.03em;color:#1d1200;background:linear-gradient(135deg,#f6dc8e,#d9b440 52%,#b78a12);box-shadow:0 6px 16px rgba(212,175,55,.22)}
  .bl-pdf:active{transform:translateY(1px)}
  `;
  document.head.appendChild(st);
}
custInjectMenuStyles();

/* ── Customer Form ──────────────────────────── */
let pendingCustAvatar = null;

function openCustomerForm(id = null) {
  pendingCustAvatar = null;
  const idEl = document.getElementById('custId');
  if (idEl) idEl.value = id || '';

  const titleEl = document.getElementById('customerFormTitle');
  if (titleEl) titleEl.textContent = id ? 'Modifye Kliyan' : 'Nouvo kliyan';

  const prevEl = document.getElementById('custAvatarPreview');

  if (id) {
    const c = getCustomers().find(x => x.id === id);
    if (c) {
      _setVal('custName',    c.name    || '');
      _setVal('custAddress', c.address || '');
      _setVal('custPhone',   c.phone   || '');
      _setVal('custEmail',   c.email   || '');
      _setVal('custBio',     c.bio     || '');
      if (prevEl) prevEl.src = c.avatar || AVATAR_PLACEHOLDER;
    }
  } else {
    ['custName', 'custAddress', 'custPhone', 'custEmail', 'custBio'].forEach(f => _setVal(f, ''));
    if (prevEl) prevEl.src = AVATAR_PLACEHOLDER;
  }

  const overlay = document.getElementById('customerFormOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeCustomerForm() {
  const overlay = document.getElementById('customerFormOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

async function previewCustAvatar(input) {
  if (input.files && input.files[0]) {
    const b64 = await fileToBase64(input.files[0]);
    pendingCustAvatar = b64;
    const prev = document.getElementById('custAvatarPreview');
    if (prev) prev.src = b64;
  }
}

function saveCustomer() {
  const name = (document.getElementById('custName')?.value || '').trim();
  if (!name) { showToast('⚠️ Non kliyan obligatwa'); return; }

  const list     = getCustomers();
  const id       = document.getElementById('custId')?.value || uid();
  const existing = list.find(c => c.id === id);
  const now      = Date.now();

  const data = {
    id,
    name,
    address:  (document.getElementById('custAddress')?.value || '').trim(),
    phone:    (document.getElementById('custPhone')?.value   || '').trim(),
    email:    (document.getElementById('custEmail')?.value   || '').trim(),
    bio:      (document.getElementById('custBio')?.value     || '').trim(),
    avatar:   pendingCustAvatar || (existing ? existing.avatar : null),
    transactions: existing ? existing.transactions : [],
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  if (existing) {
    const idx = list.findIndex(c => c.id === id);
    list[idx] = data;
  } else {
    list.unshift(data);
  }

  saveCustomers(list);
  closeCustomerForm();
  renderCustomers();
  showToast('✅ Kliyan anrejistre');
}

/* ── Customer Detail ────────────────────────── */
function openCustomerDetail(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;
  currentCustomerId = id;

  const avatarSrc  = c.avatar || AVATAR_PLACEHOLDER;
  const total      = getTotalDepenses(c);
  const badge      = getClientBadge(c);
  const txns       = (c.transactions || []).slice().reverse();
  const txCount    = txns.filter(t => t.txType === 'depans' || !t.txType).length;
  const profileStatus = getProfileStatus(c);
  const isOld      = getCustomerCategory(c) === 'old';

  const html = `
    <div class="cust-detail-header">
      <img class="cust-detail-avatar" src="${avatarSrc}"
           onerror="this.src='${AVATAR_PLACEHOLDER}'" />
      <div>
        <div class="cust-detail-name">${custEsc(c.name)}</div>
        <div class="cust-detail-meta">${custEsc(c.phone || '')}${c.email ? ' · ' + custEsc(c.email) : ''}</div>
        ${c.address ? `<div class="cust-detail-meta">📍 ${custEsc(c.address)}</div>` : ''}
        ${c.bio ? `<div class="cust-detail-meta" style="color:var(--text-dim);font-style:italic;margin-top:4px;">${custEsc(c.bio)}</div>` : ''}
        <span style="
          display:inline-block;margin-top:6px;padding:3px 10px;border-radius:12px;
          font-size:0.72rem;font-weight:700;
          background:${badge.color};color:${badge.text};
        ">${badge.emoji} ${badge.label}</span>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">${profileBadgeHtml(c, true)}${categoryBadgeHtml(c)}</div>
        ${profileStatus.complete ? '' : `<div class="cust-detail-meta" style="color:#f0b45a;margin-top:4px;font-size:0.72rem;">Manque : ${custEsc(profileStatus.missing.join(', '))}</div>`}
      </div>
    </div>

    <div style="display:flex;gap:10px;margin:10px 0;align-items:stretch;">
      <div class="cust-detail-total" style="flex:1;">
        💰 ${fmtCurrency(total)}<br>
        <span style="font-size:0.7rem;opacity:0.65;">${txCount} sèvis</span>
      </div>
    </div>

    <div class="cust-detail-actions">
      <button onclick="openTxnOverlay()">💵<span>Depans</span></button>
      ${c.phone ? `<button onclick="waOpen('${custEsc(c.phone)}')">💬<span>WhatsApp</span></button>` : ''}
      ${c.email ? `<button onclick="emailClient('${custEsc(c.email)}')">📧<span>Email</span></button>` : ''}
      <button onclick="exportCustomerPDF('${c.id}')">📄<span>PDF</span></button>
    </div>
    <div class="cust-detail-btns">
      <button class="btn-outline-teal" onclick="openCustomerForm('${c.id}');closeCustomerDetail();">✏️ Modifye</button>
      <button class="btn-outline-teal" onclick="setCustomerSeniority('${c.id}','${isOld ? 'active' : 'old'}')">${isOld ? '🟢 Remete aktif' : '🕰 Ansyen kliyan'}</button>
      <button class="btn-outline-red" onclick="deleteCustomer('${c.id}')">🗑</button>
    </div>

    <div class="txn-list-wrap">
      <div class="txn-list-title">ISTWA TRANZAKSYON (${txns.length})</div>
      ${txns.length === 0
        ? `<div style="color:var(--text-muted);font-size:0.85rem;padding:12px 0;">Okenn tranzaksyon.</div>`
        : txns.map(t => {
            const isDepans = t.txType === 'depans' || !t.txType;
            const typeLabel = t.txType === 'peman' ? '💳 Peman' : '🛍 Depans';
            const amtColor  = t.txType === 'peman' ? '#4caf97' : '#d4af37';
            return `
              <div class="txn-item" style="display:flex;align-items:center;gap:6px;">
                <div style="flex:1;">
                  <div class="txn-desc">${custEsc(t.desc || 'Tranzaksyon')}</div>
                  <div class="txn-date">${fmtDate(t.date)} · <span style="font-size:0.68rem;opacity:0.7;">${typeLabel}</span></div>
                </div>
                <div class="txn-amount" style="color:${amtColor};flex-shrink:0;">${fmtCurrency(t.amount)}</div>
                <button onclick="editTxn('${c.id}','${t.id}')" title="Modifye" style="
                  background:none;border:1px solid rgba(212,175,55,0.3);border-radius:6px;
                  color:#d4af37;font-size:0.75rem;padding:3px 7px;cursor:pointer;flex-shrink:0;">✏️</button>
                <button onclick="deleteTxn('${c.id}','${t.id}')" title="Efase" style="
                  background:none;border:1px solid rgba(220,80,80,0.3);border-radius:6px;
                  color:#e07070;font-size:0.75rem;padding:3px 7px;cursor:pointer;flex-shrink:0;">🗑</button>
              </div>
            `;
          }).join('')
      }
    </div>
  `;

  const content = document.getElementById('customerDetailContent');
  if (content) content.innerHTML = html;

  const overlay = document.getElementById('customerDetailOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeCustomerDetail() {
  const overlay = document.getElementById('customerDetailOverlay');
  if (overlay) overlay.classList.add('hidden');
  currentCustomerId = null;
}

function deleteCustomer(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;
  if (!confirm('Efase kliyan sa a?\n(Li ap rete nan Corbeille ' + TRASH_DAYS + ' jou, ou ka restore l.)')) return;
  if (!trashAdd('client', c.name || 'Kliyan', c)) {
    if (!confirm('⚠️ Pa gen ase espas pou mete l nan Corbeille. Efase l kanmenm ?')) return;
  }
  saveCustomers(getCustomers().filter(x => x.id !== id));
  closeCustomerDetail();
  renderCustomers();
  showToast('🗑️ Kliyan mete nan Corbeille (' + TRASH_DAYS + ' jou)');
}

/* ── Transactions ───────────────────────────── */
function openTxnOverlay() {
  _setVal('txnAmount', '');
  _setVal('txnDesc',   '');
  /* Type par défaut = depans */
  const typeEl = document.getElementById('txnType');
  if (typeEl) typeEl.value = 'depans';
  const overlay = document.getElementById('txnOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeTxnOverlay() {
  const overlay = document.getElementById('txnOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function saveTxn() {
  const amount = parseFloat(document.getElementById('txnAmount')?.value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const desc   = (document.getElementById('txnDesc')?.value  || '').trim() || 'Tranzaksyon';
  const txType = (document.getElementById('txnType')?.value  || 'depans');

  const list = getCustomers();
  const idx  = list.findIndex(c => c.id === currentCustomerId);
  if (idx === -1) return;
  if (!list[idx].transactions) list[idx].transactions = [];

  const prevTotal = getTotalDepenses(list[idx]);
  const prevRank  = getTierRank(prevTotal);

  list[idx].transactions.push({ id: uid(), amount, desc, txType, date: Date.now() });
  list[idx].updatedAt = Date.now();
  const wasOld = reactivateIfOld(list[idx]);

  const newTotal = getTotalDepenses(list[idx]);
  const newRank  = getTierRank(newTotal);

  saveCustomers(list);
  closeTxnOverlay();
  openCustomerDetail(currentCustomerId);
  renderCustomers();
  showToast((txType === 'peman' ? '✅ Peman anrejistre' : '✅ Depans anrejistre') + (wasOld ? ' · 🟢 kliyan remete aktif' : ''));

  if (txType === 'depans' && newRank > prevRank) {
    const badge = getClientBadge(list[idx]);
    showCelebrationModal(list[idx].name, badge);
  }
}

/* ── Actions ────────────────────────────────── */
function waOpen(phone) {
  const clean = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${clean}`, '_blank');
}

function emailClient(email) {
  window.location.href = `mailto:${email}`;
}

function emailAllCustomers() {
  const list = getCustomers().filter(c => c.email);
  if (list.length === 0) { showToast('Okenn kliyan ak email'); return; }
  const emails = list.map(c => c.email).join(',');
  window.location.href = `mailto:${emails}?from=lescayesdropshipping@gmail.com`;
}

/* ── PDF Export (kliyan endividyèl) ─────────── */
function exportCustomerPDF(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;

  if (!window.jspdf) { showToast('⚠️ jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  const tR = 14, tG = 116, tB = 144; // teal
  const gR = 212, gG = 175, gB = 55; // or
  const badge = getClientBadge(c);

  // En-tête
  doc.setFillColor(tR, tG, tB);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setFillColor(gR, gG, gB);
  doc.rect(0, 27, pw, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LCD CUSTOMERS', 10, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Les Cayes Dropshipping · Rapò Kliyan', 10, 20);

  // Infos kliyan
  let y = 38;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(c.name, 10, y);

  // Badge nivo
  doc.setFontSize(8);
  doc.text('[' + badge.label + ']', pw - 12, y, { align: 'right' });
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (c.phone)   { doc.text('📞  ' + c.phone,   10, y); y += 5; }
  if (c.email)   { doc.text('✉  ' + c.email,    10, y); y += 5; }
  if (c.address) { doc.text('📍  ' + c.address,  10, y); y += 5; }
  if (c.bio) {
    y += 2;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(c.bio, pw - 20);
    doc.text(lines, 10, y);
    y += lines.length * 4.5 + 2;
  }

  y += 4;
  doc.setDrawColor(gR, gG, gB);
  doc.setLineWidth(0.5);
  doc.line(10, y, pw - 10, y);
  y += 8;

  // Transactions
  const txns = c.transactions || [];
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(tR, tG, tB);
  doc.text('ISTWA TRANZAKSYON', 10, y);
  y += 7;

  if (txns.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
    doc.text('Okenn tranzaksyon.', 10, y);
    y += 8;
  } else {
    doc.setFillColor(240, 245, 248);
    doc.rect(10, y - 4, pw - 20, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
    doc.text('Dat',         12, y);
    doc.text('Deskripsyon', 38, y);
    doc.text('Tip',        pw - 38, y);
    doc.text('Montan',     pw - 12, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    let totalDepans = 0, totalPeman = 0;
    [...txns].reverse().forEach((t, i) => {
      if (y > ph - 30) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.rect(10, y - 3.5, pw - 20, 6.5, 'F');
      doc.setTextColor(30, 30, 30);
      doc.text(fmtDate(t.date), 12, y);
      const dl = doc.splitTextToSize(t.desc || '—', 50);
      doc.text(dl[0], 38, y);
      const tipColor = t.txType === 'peman' ? [14, 116, 144] : [160, 110, 20];
      doc.setTextColor(...tipColor);
      doc.text(t.txType === 'peman' ? 'Peman' : 'Depans', pw - 38, y);
      doc.setTextColor(tR, tG, tB);
      doc.text(fmtCurrency(t.amount), pw - 12, y, { align: 'right' });
      if (t.txType === 'peman') totalPeman  += parseFloat(t.amount || 0);
      else                      totalDepans += parseFloat(t.amount || 0);
      doc.setTextColor(30, 30, 30);
      y += 6.5;
    });

    // Résumé
    y += 3;
    doc.setFillColor(240, 245, 248);
    doc.rect(10, y - 4, pw - 20, 8, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(tR, tG, tB);
    doc.text('Total depans', 12, y);
    doc.text(fmtCurrency(totalDepans), pw - 12, y, { align: 'right' });
    y += 8;

    if (totalPeman > 0) {
      doc.setFillColor(gR, gG, gB);
      doc.rect(10, y - 4, pw - 20, 8, 'F');
      doc.setTextColor(30, 30, 30);
      doc.text('Total peman', 12, y);
      doc.text(fmtCurrency(totalPeman), pw - 12, y, { align: 'right' });
      y += 8;
    }
  }

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
  doc.text(`Jenere pa Thomas Kabé · Les Cayes Dropshipping · ${fmtDate(Date.now())}`, pw / 2, ph - 8, { align: 'center' });

  const fn = `LCD-Client-${c.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fn);
  showToast('📄 PDF jenere');
}

/* ── PDF All Customers ──────────────────────── */
function exportCustomersPDF() {
  const list = getCustomers();
  if (list.length === 0) { showToast('Okenn kliyan'); return; }

  if (!window.jspdf) { showToast('⚠️ jsPDF pa chaje'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  const tR = 14, tG = 116, tB = 144;
  const gR = 212, gG = 175, gB = 55;

  // Trier par activité pour ce rapport
  const sorted = [...list].sort((a, b) => getActivityScore(b) - getActivityScore(a));

  doc.setFillColor(tR, tG, tB);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setFillColor(gR, gG, gB);
  doc.rect(0, 27, pw, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('LISTE KLIYAN LCD', 10, 12);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Total: ${sorted.length} kliyan · ${fmtDate(Date.now())}`, 10, 21);

  let y = 38;
  sorted.forEach((c, i) => {
    if (y > ph - 20) { doc.addPage(); y = 20; }
    const badge = getClientBadge(c);
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(10, y - 4, pw - 20, 12, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(c.name, 12, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 80, 20);
    doc.text('[' + badge.label + ']', pw - 12, y, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    doc.text(c.phone || c.email || '—', 12, y + 5);
    const total = getTotalDepenses(c);
    if (total > 0) {
      doc.setTextColor(tR, tG, tB); doc.setFont('helvetica', 'bold');
      doc.text(fmtCurrency(total), pw - 12, y + 5, { align: 'right' });
    }
    y += 14;
  });

  doc.save('LCD-Kliyan.pdf');
  showToast('📄 PDF liste jenere');
}

/* ── Modifye yon tranzaksyon pa occasion ────────
   Klike sou ✏️ devan yon depans ouvri yon fenèt
   pou korije montan oswa deskripsyon an.
   ──────────────────────────────────────────── */
function editTxn(clientId, txnId) {
  const list = getCustomers();
  const cIdx = list.findIndex(x => x.id === clientId);
  if (cIdx === -1) return;
  const tIdx = (list[cIdx].transactions || []).findIndex(t => t.id === txnId);
  if (tIdx === -1) return;

  const t = list[cIdx].transactions[tIdx];

  // Retire ancien modal si existe
  const old = document.getElementById('editTxnModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'editTxnModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:8888;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(3px);
  `;
  modal.innerHTML = `
    <div style="
      background:#1a1520;border:1px solid rgba(212,175,55,0.35);
      border-radius:16px;padding:24px 22px;max-width:320px;width:90%;
      box-shadow:0 0 40px rgba(0,0,0,0.6);
    ">
      <div style="font-family:'Rajdhani',sans-serif;font-size:1rem;font-weight:700;color:#ddd8cc;margin-bottom:14px;">
        ✏️ Modifye depans
      </div>
      <label style="font-size:0.78rem;color:rgba(200,190,175,0.6);display:block;margin-bottom:4px;">Montan ($)</label>
      <input id="editTxnAmount" type="number" min="0.01" step="0.01" value="${parseFloat(t.amount).toFixed(2)}" style="
        width:100%;box-sizing:border-box;background:#111;border:1px solid rgba(255,255,255,0.12);
        border-radius:8px;color:#ddd8cc;padding:9px 11px;font-size:0.95rem;margin-bottom:12px;
      "/>
      <label style="font-size:0.78rem;color:rgba(200,190,175,0.6);display:block;margin-bottom:4px;">Deskripsyon</label>
      <input id="editTxnDesc" type="text" value="${custEsc(t.desc || '')}" style="
        width:100%;box-sizing:border-box;background:#111;border:1px solid rgba(255,255,255,0.12);
        border-radius:8px;color:#ddd8cc;padding:9px 11px;font-size:0.9rem;margin-bottom:18px;
      "/>
      <div style="display:flex;gap:10px;">
        <button onclick="saveEditTxn('${clientId}','${txnId}')" style="
          flex:1;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);
          border-radius:10px;color:#d4af37;padding:10px;font-size:0.9rem;cursor:pointer;
          font-family:'Rajdhani',sans-serif;font-weight:600;">✔ Anrejistre</button>
        <button onclick="document.getElementById('editTxnModal').remove()" style="
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
          border-radius:10px;color:#aaa;padding:10px 16px;font-size:0.9rem;cursor:pointer;">Anile</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('editTxnAmount').focus();
}

function saveEditTxn(clientId, txnId) {
  const newAmount = parseFloat(document.getElementById('editTxnAmount')?.value);
  if (isNaN(newAmount) || newAmount <= 0) { showToast('⚠️ Montan enkòrèk'); return; }
  const newDesc = (document.getElementById('editTxnDesc')?.value || '').trim() || 'Tranzaksyon';

  const list = getCustomers();
  const cIdx = list.findIndex(x => x.id === clientId);
  if (cIdx === -1) return;
  const tIdx = (list[cIdx].transactions || []).findIndex(t => t.id === txnId);
  if (tIdx === -1) return;

  const prevRank = getTierRank(getTotalDepenses(list[cIdx]));

  list[cIdx].transactions[tIdx].amount = newAmount;
  list[cIdx].transactions[tIdx].desc   = newDesc;
  list[cIdx].transactions[tIdx].updatedAt = Date.now();
  list[cIdx].updatedAt = Date.now();
  reactivateIfOld(list[cIdx]);

  const newRank = getTierRank(getTotalDepenses(list[cIdx]));
  saveCustomers(list);

  document.getElementById('editTxnModal')?.remove();
  openCustomerDetail(clientId);
  renderCustomers();
  showToast('✅ Tranzaksyon mete ajou');

  if (newRank > prevRank) {
    const badge = getClientBadge(list[cIdx]);
    showCelebrationModal(list[cIdx].name, badge);
  }
}

/* ── Efase yon tranzaksyon pa occasion ────────── */
function deleteTxn(clientId, txnId) {
  if (!confirm('Efase tranzaksyon sa a?\n(Li ap rete nan Corbeille ' + TRASH_DAYS + ' jou, ou ka restore l.)')) return;

  const list = getCustomers();
  const cIdx = list.findIndex(x => x.id === clientId);
  if (cIdx === -1) return;
  const txn = (list[cIdx].transactions || []).find(t => t.id === txnId);
  if (!txn) return;

  const label = (txn.desc || 'Tranzaksyon') + ' · ' + fmtCurrency(txn.amount) + ' · ' + (list[cIdx].name || '');
  if (!trashAdd('txn', label, { clientId, clientName: list[cIdx].name, txn })) {
    if (!confirm('⚠️ Pa gen ase espas pou mete l nan Corbeille. Efase l kanmenm ?')) return;
  }

  list[cIdx].transactions = (list[cIdx].transactions || []).filter(t => t.id !== txnId);
  list[cIdx].updatedAt = Date.now();

  saveCustomers(list);
  openCustomerDetail(clientId);
  renderCustomers();
  showToast('🗑️ Tranzaksyon mete nan Corbeille (' + TRASH_DAYS + ' jou)');
}



/* ══════════════════════════════════════════════
   TAUX HTG + FÒMA MONTAN — itilize pa Bilan mansyèl (133 pa defo, pèsonalizab)
   ══════════════════════════════════════════════ */
const PROFIT_TAUX_KEY = 'tbs_profit_taux';
const PROFIT_DEF_TAUX = 133;
function getProfitTaux() {
  const n = parseFloat(String(localStorage.getItem(PROFIT_TAUX_KEY) || '').replace(',', '.'));
  return n > 0 ? n : PROFIT_DEF_TAUX;
}
function fmtHtgP(n) {
  const r = Math.round(Math.abs(n));
  return (n < 0 && r > 0 ? '-' : '') + String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' HTG';
}
function fmtOutP(n) { return n > 0 ? '-' + fmtUsdP(n) : fmtUsdP(0); }
function fmtUsdP(n) { return (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2); }

function setProfitTaux(v) {
  const n = parseFloat(String(v || '').replace(',', '.'));
  if (n > 0) localStorage.setItem(PROFIT_TAUX_KEY, String(n)); else localStorage.removeItem(PROFIT_TAUX_KEY);
  if (document.getElementById('bilanModal')) showBilanModal();
}

/* ── Helpers locaux ─────────────────────────── */
function custEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Purge automatique de la corbeille (30 jours) ── */
trashPurge();
document.addEventListener('DOMContentLoaded', () => { trashPurge(); renderCustomersSafe(); });
setInterval(trashPurge, 6 * 3600 * 1000);
function renderCustomersSafe() { try { trashUpdateBadge(); } catch (err) {} }
