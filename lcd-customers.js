/* ═══════════════════════════════════════════════
   LCD CUSTOMERS — JavaScript
   ═══════════════════════════════════════════════ */

const LCD = (() => {
  let currentSort = 'amount';
  let editingClientId = null;

  /* ─── HELPERS ──────────────────────────────── */
  function loadClients() { return loadStore('tb_clients', []); }
  function saveClients(c) { saveStore('tb_clients', c); }
  function totalAmount(c) {
    return (c.transactions || []).reduce((s,t) => s + (parseFloat(t.amount) || 0), 0);
  }

  /* ─── SORT ─────────────────────────────────── */
  function setSort(mode, el) {
    currentSort = mode;
    document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderClients();
  }

  /* ─── RENDER LIST ──────────────────────────── */
  function renderClients() {
    const clients = loadClients();
    const q = (document.getElementById('clientSearch')?.value || '').toLowerCase();
    let list = clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
    if (currentSort === 'amount') list.sort((a,b) => totalAmount(b) - totalAmount(a));
    else if (currentSort === 'name') list.sort((a,b) => a.name.localeCompare(b.name));
    else list.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const el = document.getElementById('clientList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Pa gen kliyan ankò.<br>Klike + pou ajoute youn.</div></div>`;
      return;
    }
    el.innerHTML = list.map((c, i) => {
      const amt = totalAmount(c);
      const txnCount = (c.transactions || []).length;
      const initials = c.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      return `
      <div class="client-card" onclick="LCD.openClientDetail('${c.id}')">
        <div class="client-avatar">
          ${c.photo ? `<img src="${c.photo}" alt="${c.name}"/>` : initials}
        </div>
        <div class="client-info">
          <div class="client-name">${escHtml(c.name)} ${rankLabel}</div>
          <div class="client-phone">${c.phone || ''} ${c.address ? '· '+c.address : ''}</div>
          ${txnCount > 0 ? `<span class="rank-badge">${txnCount} tranzaksyon</span>` : ''}
        </div>
        <div class="client-stats">
          <div class="client-amount">$${amt.toFixed(2)}</div>
          <div class="client-txn">${txnCount} sèvis</div>
        </div>
      </div>`;
    }).join('');
  }

  /* ─── ADD CLIENT ────────────────────────────── */
  function openAddClient() {
    editingClientId = null;
    document.getElementById('modalClientTitle').textContent = 'NOUVO KLIYAN';
    ['fName','fAddr','fPhone','fEmail','fBio'].forEach(id => {
      document.getElementById(id).value = '';
    });
    openModal('modalAddClient');
  }

  function saveClient() {
    const name = document.getElementById('fName').value.trim();
    if (!name) { showToast('⚠️ Mete non kliyan an'); return; }
    const clients = loadClients();
    if (editingClientId) {
      const idx = clients.findIndex(c => c.id === editingClientId);
      if (idx !== -1) {
        clients[idx] = { ...clients[idx],
          name,
          address: document.getElementById('fAddr').value.trim(),
          phone: document.getElementById('fPhone').value.trim(),
          email: document.getElementById('fEmail').value.trim(),
          bio: document.getElementById('fBio').value.trim(),
          updatedAt: Date.now()
        };
      }
    } else {
      clients.unshift({
        id: 'c' + Date.now(),
        name,
        address: document.getElementById('fAddr').value.trim(),
        phone: document.getElementById('fPhone').value.trim(),
        email: document.getElementById('fEmail').value.trim(),
        bio: document.getElementById('fBio').value.trim(),
        photo: null,
        transactions: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    saveClients(clients);
    closeModal('modalAddClient');
    renderClients();
    showToast('✅ Kliyan anrejistre!');
  }

  /* ─── CLIENT DETAIL ─────────────────────────── */
  function openClientDetail(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    window._currentClientId = id;
    goScreen('clientDetail');
    document.getElementById('appBarTitle').textContent = c.name.toUpperCase();
    renderClientDetail(c);
  }

  function renderClientDetail(c) {
    const amt = totalAmount(c);
    const txnCount = (c.transactions || []).length;
    const lastTxn = txnCount > 0
      ? (c.transactions[txnCount-1].date || '—')
      : '—';
    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    const txnRows = (c.transactions || []).slice().reverse().map(t => `
      <div class="txn-item">
        <div>
          <div class="txn-date">${t.date || '—'}</div>
          <div class="txn-desc">${escHtml(t.desc || '—')}</div>
        </div>
        <div class="txn-amount">$${parseFloat(t.amount || 0).toFixed(2)}</div>
      </div>
    `).join('') || '<div style="padding:20px;text-align:center;color:var(--gray);font-size:.82rem;">Pa gen tranzaksyon ankò.</div>';

    document.getElementById('clientDetailContent').innerHTML = `
      <div class="profile-header">
        <div class="profile-cover">${initials}</div>
        <div class="profile-info">
          <div class="profile-avatar-large" onclick="LCD.changePhoto('${c.id}')" id="profAvatar">
            ${c.photo
              ? `<img src="${c.photo}" alt="${c.name}"/>`
              : `<span style="font-size:1.3rem;">+📷</span>`}
          </div>
          <div class="profile-bio">
            <div class="profile-fullname">${escHtml(c.name)}</div>
            <div class="profile-tagline">${escHtml(c.bio || '')}</div>
            <div class="profile-contacts">
              ${c.phone ? `<div class="contact-chip" onclick="window.open('tel:${c.phone}')">📞 ${c.phone}</div>` : ''}
              ${c.email ? `<div class="contact-chip" onclick="window.open('mailto:${c.email}')">✉️ ${c.email}</div>` : ''}
              ${c.address ? `<div class="contact-chip">📍 ${c.address}</div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">$${amt.toFixed(2)}</div><div class="stat-lbl">Total</div></div>
        <div class="stat-box"><div class="stat-val">${txnCount}</div><div class="stat-lbl">Tranzaksyon</div></div>
        <div class="stat-box"><div class="stat-val">${lastTxn}</div><div class="stat-lbl">Dènye</div></div>
      </div>

      <div class="txn-list">
        <div class="txn-header">
          <div class="txn-header-title">Istorik Sèvis</div>
          <button class="btn-add-txn" onclick="LCD.openAddTxn('${c.id}')">+ Ajoute</button>
        </div>
        ${txnRows}
      </div>

      <div class="action-row">
        ${c.phone ? `<button class="btn-action btn-wa" onclick="window.open('https://wa.me/${c.phone.replace(/\D/g,'')}')">💬 WhatsApp</button>` : ''}
        ${c.email ? `<button class="btn-action btn-email-action" onclick="window.open('mailto:${c.email}')">✉️ Email</button>` : ''}
        <button class="btn-action" onclick="LCD.editClient('${c.id}')" style="background:transparent;border:1.5px solid var(--gold3);color:var(--gold);">✏️ Edite</button>
      </div>
      <div class="action-row">
        <button class="btn-action btn-del" onclick="LCD.deleteClient('${c.id}')">🗑 Siprime</button>
      </div>
    `;
  }

  /* ─── TRANSACTION ───────────────────────────── */
  function openAddTxn(id) {
    window._currentClientId = id;
    document.getElementById('fTxnDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('fTxnDesc').value = '';
    document.getElementById('fTxnAmount').value = '';
    openModal('modalAddTxn');
  }

  function saveTxn() {
    const id = window._currentClientId;
    const date = document.getElementById('fTxnDate').value;
    const desc = document.getElementById('fTxnDesc').value.trim();
    const amount = parseFloat(document.getElementById('fTxnAmount').value) || 0;
    if (!amount) { showToast('⚠️ Mete montan an'); return; }
    const clients = loadClients();
    const idx = clients.findIndex(c => c.id === id);
    if (idx !== -1) {
      if (!clients[idx].transactions) clients[idx].transactions = [];
      clients[idx].transactions.push({ id: 't'+Date.now(), date, desc, amount });
      clients[idx].updatedAt = Date.now();
      saveClients(clients);
      closeModal('modalAddTxn');
      renderClientDetail(clients[idx]);
      showToast('✅ Tranzaksyon anrejistre!');
    }
  }

  /* ─── EDIT / DELETE ─────────────────────────── */
  function editClient(id) {
    const clients = loadClients();
    const c = clients.find(x => x.id === id);
    if (!c) return;
    editingClientId = id;
    document.getElementById('modalClientTitle').textContent = 'EDITE KLIYAN';
    document.getElementById('fName').value = c.name || '';
    document.getElementById('fAddr').value = c.address || '';
    document.getElementById('fPhone').value = c.phone || '';
    document.getElementById('fEmail').value = c.email || '';
    document.getElementById('fBio').value = c.bio || '';
    openModal('modalAddClient');
  }

  function deleteClient(id) {
    if (!confirm('Ou sèten ou vle siprime kliyan sa a?')) return;
    const clients = loadClients();
    saveClients(clients.filter(c => c.id !== id));
    goScreen('lcd');
    showToast('🗑 Kliyan siprime.');
  }

  function changePhoto(id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const clients = loadClients();
        const idx = clients.findIndex(c => c.id === id);
        if (idx !== -1) {
          clients[idx].photo = ev.target.result;
          saveClients(clients);
          const av = document.getElementById('profAvatar');
          if (av) av.innerHTML = `<img src="${ev.target.result}" alt="photo"/>`;
          showToast('📷 Foto mete ajou!');
        }
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }

  /* ─── GROUP EMAIL ───────────────────────────── */
  function openGroupEmail() {
    const clients = loadClients();
    const withEmail = clients.filter(c => c.email);
    document.getElementById('emailChips').innerHTML = withEmail.map(c => `
      <div class="email-chip selected" data-email="${c.email}" onclick="this.classList.toggle('selected')">
        ${escHtml(c.name)}
      </div>
    `).join('');
    document.getElementById('emailSubject').value = '';
    document.getElementById('emailBody').value = '';
    openModal('modalEmail');
  }

  function sendGroupEmail() {
    const sel = [...document.querySelectorAll('.email-chip.selected')]
      .map(e => e.dataset.email).filter(Boolean);
    if (!sel.length) { showToast('⚠️ Chwazi destinatè yo'); return; }
    const subj = encodeURIComponent(document.getElementById('emailSubject').value || 'Mesaj LCD');
    const body = encodeURIComponent(document.getElementById('emailBody').value || '');
    window.open(`mailto:${sel.join(',')}?subject=${subj}&body=${body}`);
    closeModal('modalEmail');
  }

  return { setSort, renderClients, openAddClient, saveClient, openClientDetail,
           renderClientDetail, openAddTxn, saveTxn, editClient, deleteClient,
           changePhoto, openGroupEmail, sendGroupEmail };
})();
