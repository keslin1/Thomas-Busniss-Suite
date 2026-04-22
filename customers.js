/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — customers.js
   CRM · Gestion Kliyan
   ══════════════════════════════════════════════ */

const CUST_KEY = 'tbs_customers';
let customerSortMode = 'recent';
let currentCustomerId = null;

/* ── Storage ────────────────────────────────── */
function getCustomers() {
  try { return JSON.parse(localStorage.getItem(CUST_KEY)) || []; } catch { return []; }
}

function saveCustomers(list) {
  localStorage.setItem(CUST_KEY, JSON.stringify(list));
}

/* ── Render List ────────────────────────────── */
function renderCustomers() {
  let list = getCustomers();
  const q = (document.getElementById('customerSearch')?.value || '').toLowerCase();
  if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));

  if (customerSortMode === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (customerSortMode === 'amount') list.sort((a, b) => getTotalSpent(b) - getTotalSpent(a));
  else list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const el = document.getElementById('customerList');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:48px 20px;font-size:0.9rem;">Okenn kliyan ankò.<br>Peze + pou ajoute premye a.</div>`;
    return;
  }

  el.innerHTML = list.map(c => {
    const total = getTotalSpent(c);
    const avatarHtml = c.avatar
      ? `<img class="cust-avatar" src="${c.avatar}" alt="${c.name}" />`
      : `<div class="cust-initials">${getInitials(c.name)}</div>`;
    return `
      <div class="customer-card" onclick="openCustomerDetail('${c.id}')">
        ${avatarHtml}
        <div class="cust-info">
          <div class="cust-name">${escHtml(c.name)}</div>
          <div class="cust-meta">${escHtml(c.phone || c.email || c.address || '—')}</div>
        </div>
        <div class="cust-total">${total > 0 ? fmtCurrency(total) : ''}</div>
      </div>
    `;
  }).join('');
}

function getTotalSpent(c) {
  return (c.transactions || []).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
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
  document.getElementById('custId').value = id || '';
  document.getElementById('customerFormTitle').textContent = id ? 'Modifye Kliyan' : 'Nouvo Kliyan';

  if (id) {
    const c = getCustomers().find(x => x.id === id);
    if (c) {
      document.getElementById('custName').value = c.name || '';
      document.getElementById('custAddress').value = c.address || '';
      document.getElementById('custPhone').value = c.phone || '';
      document.getElementById('custEmail').value = c.email || '';
      document.getElementById('custBio').value = c.bio || '';
      document.getElementById('custAvatarPreview').src = c.avatar || 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E';
    }
  } else {
    ['custName', 'custAddress', 'custPhone', 'custEmail', 'custBio'].forEach(f => {
      document.getElementById(f).value = '';
    });
    document.getElementById('custAvatarPreview').src = 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E';
  }
  document.getElementById('customerFormOverlay').classList.remove('hidden');
}

function closeCustomerForm() {
  document.getElementById('customerFormOverlay').classList.add('hidden');
}

async function previewCustAvatar(input) {
  if (input.files && input.files[0]) {
    const b64 = await fileToBase64(input.files[0]);
    pendingCustAvatar = b64;
    document.getElementById('custAvatarPreview').src = b64;
  }
}

function saveCustomer() {
  const name = document.getElementById('custName').value.trim();
  if (!name) { showToast('⚠️ Non kliyan obligatwa'); return; }

  const list = getCustomers();
  const id = document.getElementById('custId').value || uid();
  const existing = list.find(c => c.id === id);
  const now = Date.now();

  const data = {
    id,
    name,
    address: document.getElementById('custAddress').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    email: document.getElementById('custEmail').value.trim(),
    bio: document.getElementById('custBio').value.trim(),
    avatar: pendingCustAvatar || (existing ? existing.avatar : null),
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

  const avatarSrc = c.avatar || 'data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E';
  const total = getTotalSpent(c);
  const txns = (c.transactions || []).slice().reverse();

  const html = `
    <div class="cust-detail-header">
      <img class="cust-detail-avatar" src="${avatarSrc}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E'" />
      <div>
        <div class="cust-detail-name">${escHtml(c.name)}</div>
        <div class="cust-detail-meta">${escHtml(c.phone || '')} ${c.email ? '· ' + c.email : ''}</div>
        ${c.address ? `<div class="cust-detail-meta">${escHtml(c.address)}</div>` : ''}
        ${c.bio ? `<div class="cust-detail-meta" style="color:var(--text-dim);font-style:italic;margin-top:4px;">${escHtml(c.bio)}</div>` : ''}
      </div>
    </div>
    <div class="cust-detail-total">Total: ${fmtCurrency(total)}</div>
    <div class="cust-detail-actions">
      <button onclick="openTxnOverlay()">💵<span>Tranzaksyon</span></button>
      ${c.phone ? `<button onclick="waOpen('${c.phone}')">💬<span>WhatsApp</span></button>` : ''}
      ${c.email ? `<button onclick="emailClient('${c.email}')">📧<span>Email</span></button>` : ''}
      <button onclick="exportCustomerPDF('${c.id}')">📄<span>PDF</span></button>
    </div>
    <div class="cust-detail-btns">
      <button class="btn-outline-teal" onclick="openCustomerForm('${c.id}');closeCustomerDetail();">✏️ Modifye</button>
      <button class="btn-outline-red" onclick="deleteCustomer('${c.id}')">🗑</button>
    </div>
    <div class="txn-list-wrap">
      <div class="txn-list-title">ISTWA TRANZAKSYON (${txns.length})</div>
      ${txns.length === 0
        ? `<div style="color:var(--text-muted);font-size:0.85rem;">Okenn tranzaksyon.</div>`
        : txns.map(t => `
          <div class="txn-item">
            <div>
              <div class="txn-desc">${escHtml(t.desc || 'Tranzaksyon')}</div>
              <div class="txn-date">${fmtDate(t.date)}</div>
            </div>
            <div class="txn-amount">${fmtCurrency(t.amount)}</div>
          </div>
        `).join('')
      }
    </div>
  `;

  document.getElementById('customerDetailContent').innerHTML = html;
  document.getElementById('customerDetailOverlay').classList.remove('hidden');
}

function closeCustomerDetail() {
  document.getElementById('customerDetailOverlay').classList.add('hidden');
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
  document.getElementById('txnAmount').value = '';
  document.getElementById('txnDesc').value = '';
  document.getElementById('txnOverlay').classList.remove('hidden');
}

function closeTxnOverlay() {
  document.getElementById('txnOverlay').classList.add('hidden');
}

function saveTxn() {
  const amount = parseFloat(document.getElementById('txnAmount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const desc = document.getElementById('txnDesc').value.trim() || 'Tranzaksyon';
  const list = getCustomers();
  const idx = list.findIndex(c => c.id === currentCustomerId);
  if (idx === -1) return;
  if (!list[idx].transactions) list[idx].transactions = [];
  list[idx].transactions.push({ id: uid(), amount, desc, date: Date.now() });
  list[idx].updatedAt = Date.now();
  saveCustomers(list);
  closeTxnOverlay();
  openCustomerDetail(currentCustomerId);
  renderCustomers();
  showToast('✅ Tranzaksyon anrejistre');
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

/* ── PDF Export ─────────────────────────────── */
function exportCustomerPDF(id) {
  const c = getCustomers().find(x => x.id === id);
  if (!c) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148, ph = 210;

  // Header
  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 27, pw, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('LCD CUSTOMERS', 10, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Les Cayes Dropshipping · Rapò Kliyan', 10, 20);

  // Client Info
  let y = 38;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(c.name, 10, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (c.phone) { doc.text('📞  ' + c.phone, 10, y); y += 5; }
  if (c.email) { doc.text('✉  ' + c.email, 10, y); y += 5; }
  if (c.address) { doc.text('📍  ' + c.address, 10, y); y += 5; }
  if (c.bio) {
    y += 2;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(c.bio, pw - 20);
    doc.text(lines, 10, y);
    y += lines.length * 4.5 + 2;
  }

  // Divider
  y += 4;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(10, y, pw - 10, y);
  y += 8;

  // Transactions
  const txns = c.transactions || [];
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144);
  doc.text('ISTWA TRANZAKSYON', 10, y);
  y += 7;

  if (txns.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
    doc.text('Okenn tranzaksyon.', 10, y);
    y += 8;
  } else {
    // Table header
    doc.setFillColor(240, 245, 248);
    doc.rect(10, y - 4, pw - 20, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
    doc.text('Dat', 12, y);
    doc.text('Deskripsyon', 38, y);
    doc.text('Montan', pw - 20, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    let total = 0;
    txns.forEach((t, i) => {
      if (y > ph - 30) { doc.addPage(); y = 20; }
      doc.setFillColor(i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.rect(10, y - 3.5, pw - 20, 6.5, 'F');
      doc.setTextColor(30, 30, 30);
      doc.text(fmtDate(t.date), 12, y);
      const dlines = doc.splitTextToSize(t.desc || '—', 60);
      doc.text(dlines[0], 38, y);
      doc.setTextColor(14, 116, 144);
      doc.text(fmtCurrency(t.amount), pw - 12, y, { align: 'right' });
      doc.setTextColor(30, 30, 30);
      total += parseFloat(t.amount || 0);
      y += 6.5;
    });

    // Total row
    y += 2;
    doc.setFillColor(212, 175, 55, 30);
    doc.rect(10, y - 4, pw - 20, 8, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('TOTAL', 12, y);
    doc.setTextColor(14, 116, 144);
    doc.text(fmtCurrency(total), pw - 12, y, { align: 'right' });
  }

  // Footer
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
  doc.text(`Jenere pa Thomas Kabé · Les Cayes Dropshipping · ${fmtDate(Date.now())}`, pw / 2, ph - 8, { align: 'center' });

  const fn = `LCD-Client-${c.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(fn);
  showToast('📄 PDF jenere');
}

/* ── PDF All Customers (stub) ───────────────── */
function exportCustomersPDF() {
  const list = getCustomers();
  if (list.length === 0) { showToast('Okenn kliyan'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw = 148;

  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 27, pw, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('LISTE KLIYAN LCD', 10, 12);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Total: ${list.length} kliyan · ${fmtDate(Date.now())}`, 10, 21);

  let y = 38;
  list.forEach((c, i) => {
    if (y > 195) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(10, y - 4, pw - 20, 12, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(c.name, 12, y);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    doc.text(c.phone || c.email || '—', 12, y + 5);
    const total = getTotalSpent(c);
    if (total > 0) {
      doc.setTextColor(14, 116, 144); doc.setFont('helvetica', 'bold');
      doc.text(fmtCurrency(total), pw - 12, y, { align: 'right' });
    }
    y += 14;
  });

  doc.save('LCD-Kliyan.pdf');
  showToast('📄 PDF liste jenere');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
