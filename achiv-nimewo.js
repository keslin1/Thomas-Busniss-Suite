/* ═══════════════════════════════════════════════
   ACHIV NIMEWO — JavaScript
   Profil WhatsApp, SMS, Appel local
   ═══════════════════════════════════════════════ */

const ACHIV = (() => {
  let currentSort = 'name';
  let editingId = null;

  function loadContacts() { return loadStore('tb_achiv', []); }
  function saveContacts(c) { saveStore('tb_achiv', c); }

  function cleanPhone(p) { return (p || '').replace(/\D/g, ''); }

  /* ─── SORT ─────────────────────────────────── */
  function setSort(mode, el) {
    currentSort = mode;
    document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    render();
  }

  /* ─── INITIALS ──────────────────────────────── */
  function initials(name) {
    return (name || '').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }

  /* ─── RENDER LIST ──────────────────────────── */
  function render() {
    const contacts = loadContacts();
    const q = (document.getElementById('achivSearch')?.value || '').toLowerCase();
    let list = contacts.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.phone||'').includes(q) ||
      (c.phone2||'').includes(q) ||
      (c.group||'').toLowerCase().includes(q)
    );
    if (currentSort === 'name') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (currentSort === 'recent') list.sort((a,b) => (b.ts||0)-(a.ts||0));
    else {
      // group sort
      list.sort((a,b) => (a.group||'zzz').localeCompare(b.group||'zzz') || (a.name||'').localeCompare(b.name||''));
    }

    const el = document.getElementById('achivList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📒</div><div class="empty-state-text">Pa gen kontakt ankò.<br>Klike + pou ajoute youn.</div></div>`;
      return;
    }

    // Group header si tri par groupe
    if (currentSort === 'group') {
      const groups = {};
      list.forEach(c => {
        const g = c.group || 'Lòt';
        if (!groups[g]) groups[g] = [];
        groups[g].push(c);
      });
      el.innerHTML = Object.entries(groups).map(([g, arr]) => `
        <div style="font-size:.68rem;font-weight:700;color:var(--gold3);letter-spacing:1px;text-transform:uppercase;margin:12px 0 6px 4px;">${escHtml(g)}</div>
        ${arr.map(c => contactCardHTML(c)).join('')}
      `).join('');
    } else {
      el.innerHTML = list.map(c => contactCardHTML(c)).join('');
    }
  }

  function contactCardHTML(c) {
    const p = cleanPhone(c.phone);
    return `
    <div class="contact-card">
      <div class="contact-card-main" onclick="ACHIV.openDetail('${c.id}')">
        <div class="contact-wa-avatar">
          ${c.photo
            ? `<img src="${c.photo}" alt="${c.name}"/>`
            : `<span class="wa-initials">${initials(c.name)}</span>`}
          <div class="wa-ring"></div>
        </div>
        <div class="contact-main-info">
          <div class="contact-main-name">${escHtml(c.name)}</div>
          <div class="contact-main-phone">${c.phone || '—'}</div>
          ${c.group ? `<span class="contact-group-badge">${escHtml(c.group)}</span>` : ''}
        </div>
        <div class="contact-quick-actions" onclick="event.stopPropagation()">
          ${p ? `
            <button class="quick-btn quick-wa" title="WhatsApp"
              onclick="window.open('https://wa.me/${p}')">💬</button>
            <button class="quick-btn quick-sms" title="SMS"
              onclick="window.open('sms:${c.phone}')">✉️</button>
            <button class="quick-btn quick-call" title="Rele"
              onclick="window.open('tel:${c.phone}')">📞</button>
          ` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ─── DETAIL ────────────────────────────────── */
  function openDetail(id) {
    const contacts = loadContacts();
    const c = contacts.find(x => x.id === id);
    if (!c) return;
    window._currentAchivId = id;
    goScreen('achivDetail');
    document.getElementById('appBarTitle').textContent = (c.name || '').toUpperCase();
    renderDetail(c);
  }

  function renderDetail(c) {
    const p1 = cleanPhone(c.phone);
    const p2 = cleanPhone(c.phone2);

    const phoneRows = [];
    if (c.phone) {
      phoneRows.push({ num: c.phone, clean: p1, label: 'Nimewo 1' });
    }
    if (c.phone2) {
      phoneRows.push({ num: c.phone2, clean: p2, label: 'Nimewo 2' });
    }

    const phoneHTML = phoneRows.map(p => `
      <div class="achiv-phone-item">
        <div class="phone-icon">📱</div>
        <div style="flex:1;">
          <div class="phone-number">${p.num}</div>
          <div class="phone-type">${p.label}</div>
        </div>
        <div class="phone-actions">
          <button class="phone-btn phone-btn-wa" onclick="window.open('https://wa.me/${p.clean}')">💬 WA</button>
          <button class="phone-btn phone-btn-sms" onclick="window.open('sms:${p.num}')">✉️ SMS</button>
          <button class="phone-btn phone-btn-call" onclick="window.open('tel:${p.num}')">📞</button>
        </div>
      </div>
    `).join('') || '<div style="padding:16px;color:var(--gray);font-size:.8rem;">Pa gen nimewo.</div>';

    document.getElementById('achivDetailContent').innerHTML = `
      <div class="achiv-detail-header">
        <div class="achiv-wa-photo" onclick="ACHIV.changePhoto('${c.id}')">
          ${c.photo
            ? `<img src="${c.photo}" alt="${c.name}"/>`
            : `<span class="wa-initials-lg">${initials(c.name)}</span>`}
          <div class="wa-status-dot"></div>
          <div class="photo-hint">📷</div>
        </div>
        <div class="achiv-detail-name">${escHtml(c.name)}</div>
        ${c.group ? `<div class="achiv-detail-group">${escHtml(c.group)}</div>` : ''}
        ${c.note ? `<div class="achiv-detail-note">${escHtml(c.note)}</div>` : ''}
      </div>

      <div class="achiv-phones">${phoneHTML}</div>

      ${c.address ? `
      <div class="achiv-detail-meta">
        <div class="meta-row">
          <div class="meta-icon">📍</div>
          <div><div class="meta-lbl">Adrès</div><div class="meta-val">${escHtml(c.address)}</div></div>
        </div>
      </div>` : ''}

      <div class="achiv-detail-btns">
        <button class="btn-action" onclick="ACHIV.openEdit('${c.id}')"
          style="background:transparent;border:1.5px solid var(--gold3);color:var(--gold);flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:.78rem;cursor:pointer;">
          ✏️ Edite
        </button>
        <button class="btn-action" onclick="ACHIV.exportPDF('${c.id}')"
          style="background:transparent;border:1.5px solid #14b8a6;color:#14b8a6;flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:.78rem;cursor:pointer;">
          📄 PDF
        </button>
        <button class="btn-action btn-del" onclick="ACHIV.delete('${c.id}')"
          style="flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:.78rem;cursor:pointer;background:transparent;border:1.5px solid var(--red);color:var(--red);">
          🗑 Siprime
        </button>
      </div>
    `;
  }

  /* ─── ADD / EDIT ────────────────────────────── */
  function openAdd() {
    editingId = null;
    document.getElementById('modalAchivTitle').textContent = 'NOUVO KONTAKT';
    ['aNom','aPhone','aPhone2','aGroup','aAddr','aNote'].forEach(id => {
      document.getElementById(id).value = '';
    });
    openModal('modalAchiv');
  }

  function openEdit(id) {
    const contacts = loadContacts();
    const c = contacts.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById('modalAchivTitle').textContent = 'EDITE KONTAKT';
    document.getElementById('aNom').value = c.name || '';
    document.getElementById('aPhone').value = c.phone || '';
    document.getElementById('aPhone2').value = c.phone2 || '';
    document.getElementById('aGroup').value = c.group || '';
    document.getElementById('aAddr').value = c.address || '';
    document.getElementById('aNote').value = c.note || '';
    openModal('modalAchiv');
  }

  function save() {
    const name = document.getElementById('aNom').value.trim();
    const phone = document.getElementById('aPhone').value.trim();
    if (!name) { showToast('⚠️ Mete non kontakt la'); return; }
    if (!phone) { showToast('⚠️ Mete nimewo telefòn'); return; }

    const contacts = loadContacts();
    const data = {
      name,
      phone,
      phone2: document.getElementById('aPhone2').value.trim(),
      group: document.getElementById('aGroup').value.trim(),
      address: document.getElementById('aAddr').value.trim(),
      note: document.getElementById('aNote').value.trim(),
      ts: Date.now()
    };

    if (editingId) {
      const idx = contacts.findIndex(c => c.id === editingId);
      if (idx !== -1) contacts[idx] = { ...contacts[idx], ...data };
    } else {
      contacts.unshift({ id: 'a' + Date.now(), photo: null, ...data });
    }

    saveContacts(contacts);
    closeModal('modalAchiv');
    render();
    showToast('✅ Kontakt anrejistre!');
  }

  function deleteContact(id) {
    if (!confirm('Ou sèten ou vle siprime kontakt sa a?')) return;
    const contacts = loadContacts();
    saveContacts(contacts.filter(c => c.id !== id));
    goScreen('achiv');
    showToast('🗑 Kontakt siprime.');
  }

  function changePhoto(id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const contacts = loadContacts();
        const idx = contacts.findIndex(c => c.id === id);
        if (idx !== -1) {
          contacts[idx].photo = ev.target.result;
          saveContacts(contacts);
          renderDetail(contacts[idx]);
          showToast('📷 Foto mete ajou!');
        }
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }

  /* ─── EXPORT PDF CONTACT ─────────────────────── */
  function exportPDF(id) {
    const contacts = loadContacts();
    const c = contacts.find(x => x.id === id);
    if (!c) return;
    if (!window.jspdf) { showToast('⚠️ jsPDF pa chaje'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const TEAL=[14,116,144], GOLD=[193,140,40], WHITE=[255,255,255], DARK=[17,17,17], GRAY=[136,136,136];

    doc.setFillColor(...TEAL);
    doc.rect(0,0,W,30,'F');
    doc.setFillColor(...GOLD);
    doc.rect(0,28,W,2,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('ACHIV NIMEWO', W/2, 11, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('Repètwa Kontakt — Thomas Business', W/2, 19, {align:'center'});
    const dateExport = new Date().toLocaleString('fr-FR');
    doc.setFontSize(7);
    doc.setTextColor(200,220,220);
    doc.text('Eksò : ' + dateExport, W/2, 26, {align:'center'});

    let y = 44;
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    doc.setTextColor(...TEAL);
    doc.text(c.name.toUpperCase(), 14, y);
    y += 8;
    if (c.group) {
      doc.setFont('helvetica','italic');
      doc.setFontSize(9);
      doc.setTextColor(...GOLD);
      doc.text(c.group, 14, y);
      y += 8;
    }
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    if (c.phone)   { doc.text('📞 Nimewo 1 : ' + c.phone, 14, y); y += 7; }
    if (c.phone2)  { doc.text('📞 Nimewo 2 : ' + c.phone2, 14, y); y += 7; }
    if (c.address) { doc.text('📍 Adrès : ' + c.address, 14, y); y += 7; }
    if (c.note) {
      y += 4;
      doc.setFont('helvetica','italic');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      const noteLines = doc.splitTextToSize('Nòt : ' + c.note, W-28);
      doc.text(noteLines, 14, y);
    }

    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Thomas Kabé · Achiv Nimewo · ' + dateExport, W/2, fY, {align:'center'});

    doc.save('kontakt-'+c.name.replace(/\s+/g,'-')+'-'+Date.now()+'.pdf');
    showToast('📄 PDF telechaje!');
  }

  return { render, setSort, openDetail, renderDetail,
           openAdd, openEdit, save, delete: deleteContact,
           changePhoto, exportPDF };
})();
