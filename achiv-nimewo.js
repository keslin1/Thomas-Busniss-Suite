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
        <button class="btn-action" onclick="ACHIV.exportContactPDF('${c.id}')"
          style="background:rgba(14,116,144,.15);border:1.5px solid var(--teal);color:#5fd4f4;flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:.78rem;cursor:pointer;">
          📄 PDF
        </button>
        <button class="btn-action" onclick="ACHIV.openEdit('${c.id}')"
          style="background:transparent;border:1.5px solid var(--gold3);color:var(--gold);flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:.78rem;cursor:pointer;">
          ✏️ Edite
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

  /* ─── EXPORT PDF ────────────────────────────── */
  function exportContactPDF(id) {
    const c = loadContacts().find(x => x.id === id);
    if (!c) return;
    if (!window.jspdf) { showToast('⚠️ jsPDF pa disponib'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
    const W = doc.internal.pageSize.getWidth();
    const TEAL=[14,116,144], GOLD=[193,140,40], WHITE=[255,255,255], DARK=[17,17,17], GRAY=[136,136,136];

    // Header
    doc.setFillColor(...TEAL);
    doc.rect(0,0,W,36,'F');
    doc.setFillColor(...GOLD);
    doc.rect(0,34,W,2,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text('LES CAYES DROPSHIPPING', W/2, 12, {align:'center'});
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text('Achiv Nimewo — Kat Kontakt', W/2, 20, {align:'center'});
    doc.setTextColor(200,220,220);
    doc.text('Dat ekspò : ' + new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}), W/2, 29, {align:'center'});

    // Avatar placeholder + name
    let y = 44;
    const ini = initials(c.name);
    doc.setFillColor(230,245,248);
    doc.circle(22, y+10, 10, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(ini, 22, y+13, {align:'center'});

    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(c.name.toUpperCase(), 36, y+7);
    if (c.group) {
      doc.setFontSize(8);
      doc.setTextColor(...GOLD);
      doc.text('[' + c.group + ']', 36, y+14);
    }
    if (c.address) {
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('📍 ' + c.address, 36, y+20);
    }

    // Phone rows
    y += 30;
    doc.setFillColor(...TEAL);
    doc.rect(10,y,W-20,9,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('NIMEWO TELEFÒN', 14, y+6);

    y += 12;
    const phones = [];
    if (c.phone) phones.push({num: c.phone, lbl: 'Nimewo 1'});
    if (c.phone2) phones.push({num: c.phone2, lbl: 'Nimewo 2'});
    phones.forEach((p, i) => {
      if (i%2===0) { doc.setFillColor(240,248,250); doc.rect(10,y-4,W-20,10,'F'); }
      doc.setFont('helvetica','normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(p.lbl + ' :', 14, y+2);
      doc.setFont('helvetica','bold');
      doc.setTextColor(...TEAL);
      doc.text(p.num, 45, y+2);
      y += 11;
    });

    // Note
    if (c.note) {
      y += 4;
      doc.setFillColor(250,248,240);
      const noteLines = doc.splitTextToSize(c.note, W-28);
      doc.rect(10, y-4, W-20, noteLines.length*6+8, 'F');
      doc.setFont('helvetica','italic');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(noteLines, 14, y+2);
      y += noteLines.length*6+10;
    }

    // WA QR hint
    y += 6;
    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.setTextColor(...TEAL);
    if (c.phone) doc.text('WhatsApp : wa.me/' + c.phone.replace(/\D/g,''), 14, y);

    // Footer
    const fY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setFont('helvetica','italic');
    doc.setTextColor(...GRAY);
    doc.text('Thomas Kabé · Les Cayes Dropshipping · Achiv Nimewo', W/2, fY, {align:'center'});

    doc.save('kontakt-' + c.name.replace(/\s+/g,'-') + '-' + Date.now() + '.pdf');
    showToast('📄 Kat kontakt PDF telechaje!');
  }

  return { render, setSort, openDetail, renderDetail,
           openAdd, openEdit, save, delete: deleteContact,
           changePhoto, exportContactPDF };
})();
