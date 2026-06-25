/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — customers.js  v2
   CRM · Gestion Kliyan
   ══════════════════════════════════════════════

   NOUVÈLTÈ v2 :
   • Tranzaksyon tipaj : 'depans' (dépense client) | 'peman' (paiement reçu)
   • Klasman otomatik : pa montant total depans + frekans
   • Badge nivo kliyan : Bronze / Silver / Gold / Platinum
   ══════════════════════════════════════════════ */

const CUST_KEY = 'tbs_customers';
let customerSortMode = 'name'; // tri par défaut = alphabétique
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

  if (customerSortMode === 'name')     list.sort((a, b) => a.name.localeCompare(b.name));
  else if (customerSortMode === 'amount') list.sort((a, b) => getTotalDepenses(b) - getTotalDepenses(a));
  else if (customerSortMode === 'bilan15') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (customerSortMode === 'activity') list.sort((a, b) => getActivityScore(b) - getActivityScore(a));
  else list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const el = document.getElementById('customerList');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:48px 20px;font-size:0.9rem;">Okenn kliyan ankò.<br>Peze + pou ajoute premye a.</div>`;
    return;
  }

  el.innerHTML = list.map(c => {
    const total   = getTotalDepenses(c);
    const badge   = getClientBadge(c);
    const avatarHtml = c.avatar
      ? `<img class="cust-avatar" src="${c.avatar}" alt="${custEsc(c.name)}" />`
      : `<div class="cust-initials">${getInitials(c.name)}</div>`;
    return `
      <div class="customer-card" onclick="openCustomerDetail('${c.id}')">
        ${avatarHtml}
        <div class="cust-info">
          <div class="cust-name">${custEsc(c.name)}</div>
          <div class="cust-meta">${custEsc(c.phone || c.email || c.address || '—')}</div>
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
  }).join('');
}

function filterCustomers() { renderCustomers(); }

function sortCustomers(mode, btn) {
  customerSortMode = mode;
  document.querySelectorAll('#customersScreen .sort-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (mode === 'bilan15') {
    showBilan15Modal();
  } else {
    renderCustomers();
  }
}

/* ══════════════════════════════════════════════
   TOTAL — Bilan 15 jours + Historique mensuel
   ══════════════════════════════════════════════ */
const BILAN_KEY = 'tbs_bilan_history';

function getBilanHistory() {
  try { return JSON.parse(localStorage.getItem(BILAN_KEY)) || []; }
  catch { return []; }
}

function saveBilanHistory(list) {
  localStorage.setItem(BILAN_KEY, JSON.stringify(list));
}

function getDepenses15Jours(c) {
  const now   = Date.now();
  const limit = now - (15 * 24 * 60 * 60 * 1000); // 15 jours en ms
  return (c.transactions || [])
    .filter(t => (t.txType === 'depans' || !t.txType) && t.date >= limit)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

function showBilan15Modal() {
  const old = document.getElementById('bilan15Modal');
  if (old) old.remove();

  const list       = getCustomers();
  const now        = Date.now();
  const limit15    = now - (15 * 24 * 60 * 60 * 1000);
  const mois       = new Date().toLocaleDateString('fr-HT', { month: 'long', year: 'numeric' });

  /* Calcul total 15 jours */
  let total15 = 0;
  const rows  = list.map(c => {
    const dep = getDepenses15Jours(c);
    total15  += dep;
    return { name: c.name, dep };
  }).filter(r => r.dep > 0).sort((a, b) => b.dep - a.dep);

  /* Historique mensuel */
  const history = getBilanHistory();

  /* Vérifier si un bilan ce mois existe déjà */
  const moisKey = new Date().toISOString().slice(0, 7); // "2026-06"
  const alreadySaved = history.find(h => h.moisKey === moisKey);

  const rowsHtml = rows.length === 0
    ? `<div style="color:rgba(200,190,175,0.5);font-size:0.85rem;padding:12px 0;text-align:center;">Okenn depans nan 15 dènye jou yo.</div>`
    : rows.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-family:'Rajdhani',sans-serif;font-size:0.9rem;color:#ddd8cc;">${custEsc(r.name)}</span>
          <span style="font-family:'Space Mono',monospace;font-size:0.85rem;color:#d4af37;font-weight:700;">${fmtCurrency(r.dep)}</span>
        </div>`).join('');

  const historyHtml = history.length === 0
    ? `<div style="color:rgba(200,190,175,0.4);font-size:0.8rem;text-align:center;padding:8px 0;">Okenn istorik sove ankò.</div>`
    : [...history].reverse().map(h => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:0.8rem;color:rgba(200,190,175,0.65);font-family:'Rajdhani',sans-serif;">${custEsc(h.mois)}</span>
          <span style="font-family:'Space Mono',monospace;font-size:0.82rem;color:#4caf97;font-weight:700;">${fmtCurrency(h.total)}</span>
        </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'bilan15Modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:8888;
    display:flex;align-items:flex-end;justify-content:center;
    background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);
  `;

  modal.innerHTML = `
    <div style="
      background:#13111a;border-radius:18px 18px 0 0;
      border-top:2px solid #0e7490;
      width:100%;max-width:520px;
      padding:20px 18px 36px;
      max-height:88vh;overflow-y:auto;
      display:flex;flex-direction:column;gap:16px;
    ">
      <!-- En-tête -->
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'Rajdhani',sans-serif;font-size:1rem;font-weight:700;color:#fff;letter-spacing:0.05em;">
            💰 TOTAL — 15 Dènye Jou
          </div>
          <div style="font-size:0.72rem;color:rgba(200,190,175,0.5);margin-top:2px;">${custEsc(mois)}</div>
        </div>
        <button onclick="document.getElementById('bilan15Modal').remove()" style="
          background:rgba(255,255,255,0.1);border:none;border-radius:8px;
          color:#fff;width:32px;height:32px;cursor:pointer;font-size:0.9rem;">✕</button>
      </div>

      <!-- Total 15j highlight -->
      <div style="
        background:rgba(14,116,144,0.15);border:1px solid rgba(14,116,144,0.4);
        border-radius:14px;padding:16px 18px;text-align:center;
      ">
        <div style="font-size:0.72rem;color:rgba(200,190,175,0.55);letter-spacing:0.08em;font-family:'Rajdhani',sans-serif;text-transform:uppercase;margin-bottom:6px;">
          Total antré (15 jou)
        </div>
        <div style="font-family:'Space Mono',monospace;font-size:1.8rem;font-weight:700;color:#d4af37;">
          ${fmtCurrency(total15)}
        </div>
      </div>

      <!-- Détail kliyan yo -->
      <div>
        <div style="font-size:0.7rem;font-weight:700;color:rgba(200,190,175,0.5);letter-spacing:0.1em;font-family:'Rajdhani',sans-serif;margin-bottom:6px;text-transform:uppercase;">Detay pa kliyan</div>
        ${rowsHtml}
      </div>

      <!-- Bouton sauvegarder bilan mensuel -->
      <button onclick="saveBilanMensuel(${total15})" style="
        width:100%;padding:11px;border-radius:12px;
        background:${alreadySaved ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#0e7490,#0a5568)'};
        border:1px solid ${alreadySaved ? 'rgba(255,255,255,0.12)' : '#0e7490'};
        color:${alreadySaved ? 'rgba(200,190,175,0.4)' : '#fff'};
        font-family:'Rajdhani',sans-serif;font-size:0.9rem;font-weight:600;
        letter-spacing:0.05em;cursor:${alreadySaved ? 'default' : 'pointer'};
      " ${alreadySaved ? 'disabled' : ''}>
        ${alreadySaved ? '✔ Bilan mwa sa a deja sove' : '💾 Sove bilan mwa ' + custEsc(mois)}
      </button>

      <!-- Historique mensuel -->
      <div>
        <div style="font-size:0.7rem;font-weight:700;color:rgba(200,190,175,0.5);letter-spacing:0.1em;font-family:'Rajdhani',sans-serif;margin-bottom:6px;text-transform:uppercase;">📁 Istorik Mansyèl</div>
        ${historyHtml}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function saveBilanMensuel(total) {
  const moisKey = new Date().toISOString().slice(0, 7);
  const mois    = new Date().toLocaleDateString('fr-HT', { month: 'long', year: 'numeric' });
  const history = getBilanHistory();

  if (history.find(h => h.moisKey === moisKey)) {
    showToast('⚠️ Bilan mwa sa a deja sove');
    return;
  }

  history.push({
    moisKey,
    mois,
    total,
    savedAt: Date.now(),
  });
  saveBilanHistory(history);
  showToast('✅ Bilan ' + mois + ' sove');
  /* Recharger le modal pour refléter le nouveau statut */
  showBilan15Modal();
}

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
  if (!confirm('Efase kliyan sa a?')) return;
  const list = getCustomers().filter(c => c.id !== id);
  saveCustomers(list);
  closeCustomerDetail();
  renderCustomers();
  showToast('🗑️ Kliyan efase');
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

  const newTotal = getTotalDepenses(list[idx]);
  const newRank  = getTierRank(newTotal);

  saveCustomers(list);
  closeTxnOverlay();
  openCustomerDetail(currentCustomerId);
  renderCustomers();
  showToast(txType === 'peman' ? '✅ Peman anrejistre' : '✅ Depans anrejistre');

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
  list[cIdx].updatedAt = Date.now();

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
  if (!confirm('Efase tranzaksyon sa a?')) return;

  const list = getCustomers();
  const cIdx = list.findIndex(x => x.id === clientId);
  if (cIdx === -1) return;

  list[cIdx].transactions = (list[cIdx].transactions || []).filter(t => t.id !== txnId);
  list[cIdx].updatedAt = Date.now();

  saveCustomers(list);
  openCustomerDetail(clientId);
  renderCustomers();
  showToast('🗑️ Tranzaksyon efase');
}


/* ── Helpers locaux ─────────────────────────── */
function custEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
