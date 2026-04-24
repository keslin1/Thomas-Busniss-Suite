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
let customerSortMode = 'activity'; // tri par défaut = activité
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

/* ── Badge nivo kliyan ──────────────────────── */
function getClientBadge(c) {
  const total = getTotalDepenses(c);
  const count = (c.transactions || []).filter(t => t.txType === 'depans' || !t.txType).length;
  if (total >= 500 || count >= 20) return { label: 'Platinum', color: '#b5d1e8', text: '#1a3a52' };
  if (total >= 200 || count >= 10) return { label: 'Gold',     color: '#d4af37', text: '#3a2a00' };
  if (total >= 75  || count >= 5)  return { label: 'Silver',   color: '#b0b0b0', text: '#2a2a2a' };
  return { label: 'Bronze', color: '#c07a3a', text: '#3a1a00' };
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
          ">${badge.label}</span>
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
  renderCustomers();
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
        ">${badge.label}</span>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin:10px 0;">
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
              <div class="txn-item">
                <div>
                  <div class="txn-desc">${custEsc(t.desc || 'Tranzaksyon')}</div>
                  <div class="txn-date">${fmtDate(t.date)} · <span style="font-size:0.68rem;opacity:0.7;">${typeLabel}</span></div>
                </div>
                <div class="txn-amount" style="color:${amtColor};">${fmtCurrency(t.amount)}</div>
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

  list[idx].transactions.push({ id: uid(), amount, desc, txType, date: Date.now() });
  list[idx].updatedAt = Date.now();

  saveCustomers(list);
  closeTxnOverlay();
  openCustomerDetail(currentCustomerId);
  renderCustomers();
  showToast(txType === 'peman' ? '✅ Peman anrejistre' : '✅ Depans anrejistre');
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

/* ── Helpers locaux ─────────────────────────── */
function custEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
