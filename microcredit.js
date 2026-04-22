/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — microcredit.js
   Kont Epay · Micro Crédit HTG
   ══════════════════════════════════════════════ */

const MC_KEY = 'tbs_microcredit';
const MC_RATE = 135; // 135 HTG = $1 USD
let mcCurrentType = 'depo';
let mcCardFlipped = false;

/* ── Card Flip ──────────────────────────────── */
function toggleCardFlip() {
  mcCardFlipped = !mcCardFlipped;
  const wrapper = document.getElementById('livretFlipWrapper');
  if (wrapper) wrapper.classList.toggle('flipped', mcCardFlipped);
}

/* ── Storage ────────────────────────────────── */
function getMCData() {
  try { return JSON.parse(localStorage.getItem(MC_KEY)) || { transactions: [] }; } catch { return { transactions: [] }; }
}

function saveMCData(data) {
  localStorage.setItem(MC_KEY, JSON.stringify(data));
}

/* ── Running Balance ────────────────────────── */
function recalcBalances(txns) {
  let running = 0;
  return txns.map(t => {
    if (t.type === 'depo') running += t.amount;
    else running -= t.amount;
    return { ...t, balance: running };
  });
}

function getCurrentBalance() {
  const data = getMCData();
  const txns = data.transactions;
  if (txns.length === 0) return 0;
  const recalc = recalcBalances(txns);
  return recalc[recalc.length - 1].balance;
}

/* ── Render ─────────────────────────────────── */
function renderMCHistory() {
  const data = getMCData();
  const txns = recalcBalances(data.transactions);
  const balance = txns.length > 0 ? txns[txns.length - 1].balance : 0;

  // Update balance display
  const balEl = document.getElementById('mcBalance');
  const usdEl = document.getElementById('mcBalanceUSD');
  if (balEl) balEl.textContent = balance.toLocaleString('fr-HT') + ' HTG';
  if (usdEl) usdEl.textContent = '≈ $' + (balance / MC_RATE).toFixed(2) + ' USD';

  // Sync balance on back face too
  const balBackEl = document.getElementById('mcBalanceBack');
  if (balBackEl) balBackEl.textContent = balance.toLocaleString('fr-HT') + ' HTG';

  const el = document.getElementById('mcHistoryList');
  if (!el) return;

  if (txns.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:0.85rem;">Okenn tranzaksyon.<br>Kòmanse ak yon depo!</div>`;
    return;
  }

  // Display in reverse order (most recent first)
  const reversed = [...txns].reverse();
  el.innerHTML = reversed.map(t => {
    const sign = t.type === 'depo' ? '+' : '−';
    const icon = t.type === 'depo' ? '↑' : '↓';
    return `
      <div class="mc-item">
        <div class="mc-type-badge ${t.type}">${icon}</div>
        <div class="mc-item-info">
          <div class="mc-item-note">${escHtml(t.note || (t.type === 'depo' ? 'Depo' : 'Retrè'))}</div>
          <div class="mc-item-date">${fmtDate(t.date)}</div>
        </div>
        <div class="mc-item-amounts">
          <div class="mc-item-amount ${t.type}">${sign}${t.amount.toLocaleString('fr-HT')} HTG</div>
          <div class="mc-item-balance">Balans: ${t.balance.toLocaleString('fr-HT')}</div>
        </div>
        <div class="mc-item-actions">
          <button onclick="openMCEdit('${t.id}')">✏️</button>
          <button onclick="deleteMCTxn('${t.id}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── Form ───────────────────────────────────── */
function openMCForm(type) {
  mcCurrentType = type;
  document.getElementById('mcFormTitle').textContent = type === 'depo' ? '+ Depo' : '− Retrè';
  document.getElementById('mcAmount').value = '';
  document.getElementById('mcNote').value = '';
  document.getElementById('mcRatePreview').textContent = '≈ $0.00';
  document.getElementById('mcFormOverlay').classList.remove('hidden');
}

function closeMCForm() {
  document.getElementById('mcFormOverlay').classList.add('hidden');
}

function previewMCRate() {
  const amt = parseFloat(document.getElementById('mcAmount').value) || 0;
  document.getElementById('mcRatePreview').textContent = '≈ $' + (amt / MC_RATE).toFixed(2);
}

function saveMCTxn() {
  const amount = parseFloat(document.getElementById('mcAmount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const note = document.getElementById('mcNote').value.trim();

  // Check sufficient balance for withdrawal
  if (mcCurrentType === 'retrè') {
    const bal = getCurrentBalance();
    if (amount > bal) { showToast('⚠️ Balans ensifizan'); return; }
  }

  const data = getMCData();
  data.transactions.push({
    id: uid(),
    type: mcCurrentType,
    amount,
    note,
    date: Date.now(),
  });
  saveMCData(data);
  closeMCForm();
  renderMCHistory();
  showToast(mcCurrentType === 'depo' ? '✅ Depo anrejistre' : '✅ Retrè anrejistre');
}

/* ── Edit ───────────────────────────────────── */
function openMCEdit(id) {
  const data = getMCData();
  const t = data.transactions.find(x => x.id === id);
  if (!t) return;
  document.getElementById('mcEditId').value = id;
  document.getElementById('mcEditType').value = t.type;
  document.getElementById('mcEditAmount').value = t.amount;
  document.getElementById('mcEditNote').value = t.note || '';
  document.getElementById('mcEditRatePreview').textContent = '≈ $' + (t.amount / MC_RATE).toFixed(2);
  document.getElementById('mcEditOverlay').classList.remove('hidden');
}

function closeMCEdit() {
  document.getElementById('mcEditOverlay').classList.add('hidden');
}

function previewMCEditRate() {
  const amt = parseFloat(document.getElementById('mcEditAmount').value) || 0;
  document.getElementById('mcEditRatePreview').textContent = '≈ $' + (amt / MC_RATE).toFixed(2);
}

function updateMCTxn() {
  const id = document.getElementById('mcEditId').value;
  const amount = parseFloat(document.getElementById('mcEditAmount').value);
  if (!amount || amount <= 0) { showToast('⚠️ Montan obligatwa'); return; }
  const note = document.getElementById('mcEditNote').value.trim();

  const data = getMCData();
  const idx = data.transactions.findIndex(x => x.id === id);
  if (idx === -1) return;
  data.transactions[idx].amount = amount;
  data.transactions[idx].note = note;
  saveMCData(data);
  closeMCEdit();
  renderMCHistory();
  showToast('✅ Modifikasyon anrejistre');
}

/* ── Delete ─────────────────────────────────── */
function deleteMCTxn(id) {
  if (!confirm('Efase tranzaksyon sa a?')) return;
  const data = getMCData();
  data.transactions = data.transactions.filter(x => x.id !== id);
  saveMCData(data);
  renderMCHistory();
  showToast('🗑️ Tranzaksyon efase');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
