/* ═══════════════════════════════════════════════
   MICRO CRÉDIT — JavaScript
   Monnaie principale : HTG  (taux: 135 HTG = $1 USD)
   ═══════════════════════════════════════════════ */

const EPARGNE = (() => {
  const TAUX = 135; // 135 HTG = 1 USD
  let epargneMode = 'depot';

  function htgToUsd(htg) { return htg / TAUX; }
  function fmtHTG(n) { return n.toLocaleString('fr-FR') + ' HTG'; }
  function fmtUSD(n) { return '≈ $' + htgToUsd(n).toFixed(2) + ' USD'; }

  function openTxnModal(mode) {
    epargneMode = mode;
    document.getElementById('epargneModalTitle').textContent = mode === 'depot' ? 'DEPO' : 'RETRÈ';
    document.getElementById('eTxnDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('eTxnAmount').value = '';
    document.getElementById('eTxnNote').value = '';
    document.getElementById('eTxnConvert').textContent = '';
    openModal('modalEpargne');
  }

  function previewConvert() {
    const val = parseFloat(document.getElementById('eTxnAmount').value) || 0;
    const el = document.getElementById('eTxnConvert');
    if (val > 0) {
      el.textContent = `= $${htgToUsd(val).toFixed(2)} USD  (taux: 135 HTG/$1)`;
    } else {
      el.textContent = '';
    }
  }

  function saveEpargne() {
    const date = document.getElementById('eTxnDate').value;
    const amount = parseFloat(document.getElementById('eTxnAmount').value) || 0;
    const note = document.getElementById('eTxnNote').value.trim();
    if (!amount) { showToast('⚠️ Mete montan an (HTG)'); return; }

    const txns = loadStore('tb_epargne', []);
    const prevSolde = txns.length > 0 ? (parseFloat(txns[txns.length-1].solde) || 0) : 0;
    const newSolde = epargneMode === 'depot' ? prevSolde + amount : prevSolde - amount;

    txns.push({
      id: 'e' + Date.now(),
      date,
      depot: epargneMode === 'depot' ? amount : 0,
      retrait: epargneMode === 'retrait' ? amount : 0,
      solde: newSolde,
      note,
      ts: Date.now()
    });
    saveStore('tb_epargne', txns);
    closeModal('modalEpargne');
    renderEpargne();
    showToast(epargneMode === 'depot' ? '✅ Depo anrejistre!' : '✅ Retrè anrejistre!');
  }

  function renderEpargne() {
    const txns = loadStore('tb_epargne', []);
    const solde = txns.length > 0 ? (parseFloat(txns[txns.length-1].solde) || 0) : 0;

    const balHTG = document.getElementById('balanceHTG');
    const balUSD = document.getElementById('balanceUSD');
    if (balHTG) balHTG.textContent = fmtHTG(solde);
    if (balUSD) balUSD.textContent = fmtUSD(solde);

    const tableEl = document.getElementById('epargneTable');
    if (!tableEl) return;
    if (!txns.length) {
      tableEl.innerHTML = `<div class="empty-txn">Pa gen tranzaksyon ankò.<br>Klike <strong>Depo</strong> pou kòmanse epay ou.</div>`;
      return;
    }
    tableEl.innerHTML = [...txns].reverse().map(t => `
      <div class="table-row">
        <div class="table-cell date-col">${t.date || '—'}</div>
        <div class="table-cell money depot-col">${t.depot > 0 ? t.depot.toLocaleString('fr-FR') : '—'}</div>
        <div class="table-cell money retrait-col">${t.retrait > 0 ? t.retrait.toLocaleString('fr-FR') : '—'}</div>
        <div class="table-cell money solde-col">${parseFloat(t.solde).toLocaleString('fr-FR')}</div>
      </div>
    `).join('');
  }

  return { openTxnModal, previewConvert, saveEpargne, renderEpargne };
})();
