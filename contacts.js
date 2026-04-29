/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — contacts.js
   Achiv Nimewo · Repètwa Kontakt
   ══════════════════════════════════════════════ */

const CONT_KEY = 'tbs_contacts';
let contactSortMode = 'name';

/* ── Storage ────────────────────────────────── */
function getContacts() {
  try { return JSON.parse(localStorage.getItem(CONT_KEY)) || []; } catch { return []; }
}

function saveContacts(list) {
  localStorage.setItem(CONT_KEY, JSON.stringify(list));
}

/* ── Render ─────────────────────────────────── */
function renderContacts() {
  let list = getContacts();
  const q = (document.getElementById('contactSearch')?.value || '').toLowerCase();
  if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone1 || '').includes(q));

  if (contactSortMode === 'name')   list.sort((a, b) => a.name.localeCompare(b.name));
  else if (contactSortMode === 'group') list.sort((a, b) => (a.group || '').localeCompare(b.group || ''));
  else list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const el = document.getElementById('contactList');
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;font-size:0.85rem;">Okenn kontakt.<br>Ajoute premye kontakt ou a!</div>`;
    return;
  }

  if (contactSortMode === 'group') {
    const groups = {};
    list.forEach(c => {
      const g = c.group || 'Lòt';
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    el.innerHTML = Object.entries(groups).map(([g, items]) => `
      <div class="group-header">${escHtmlC(g)}</div>
      ${items.map(c => renderContactCard(c)).join('')}
    `).join('');
  } else {
    el.innerHTML = list.map(renderContactCard).join('');
  }
}

function renderContactCard(c) {
  const avatarHtml = c.avatar
    ? `<img src="${c.avatar}" alt="${escHtmlC(c.name)}" class="contact-avatar" />`
    : `<div class="contact-initials">${getInitials(c.name)}</div>`;
  return `
    <div class="contact-card">
      ${avatarHtml}
      <div class="contact-info">
        <div class="contact-name">${escHtmlC(c.name)}</div>
        <div class="contact-phone">${escHtmlC(c.phone1 || '')}</div>
        ${c.group ? `<span class="contact-group">${escHtmlC(c.group)}</span>` : ''}
      </div>
      <div class="contact-actions">
        ${c.phone1 ? `<button onclick="window.location.href='tel:${c.phone1}'">📞 Rele</button>` : ''}
        <button onclick="editContact('${c.id}')">✏️ Edit</button>
        <button onclick="deleteContact('${c.id}')">🗑</button>
      </div>
    </div>
  `;
}

/* ── Sort ─────────────────────────────────── */
function sortContacts(mode, btn) {
  contactSortMode = mode;
  document.querySelectorAll('#contactsScreen .sort-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderContacts();
}

function filterContacts() { renderContacts(); }

/* ── Form ─────────────────────────────────── */
function openContactForm() {
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E";
  document.getElementById('contactFormTitle').textContent = 'Nouvo Kontakt';
  document.getElementById('contId').value = '';
  document.getElementById('contName').value = '';
  document.getElementById('contPhone1').value = '';
  document.getElementById('contPhone2').value = '';
  document.getElementById('contGroup').value = '';
  document.getElementById('contAddress').value = '';
  document.getElementById('contNote').value = '';
  document.getElementById('contAvatarPreview').src = DEFAULT_AVATAR;
  document.getElementById('contactFormOverlay').classList.remove('hidden');
}

function closeContactForm() {
  document.getElementById('contactFormOverlay').classList.add('hidden');
}

function previewContAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  fileToBase64(file).then(data => {
    document.getElementById('contAvatarPreview').src = data;
  });
}

function saveContact() {
  const name = document.getElementById('contName').value.trim();
  if (!name) { showToast('⚠️ Non obligatwa'); return; }

  const id = document.getElementById('contId').value || uid();
  const avatar = document.getElementById('contAvatarPreview').src;
  const phone1 = document.getElementById('contPhone1').value.trim();
  const phone2 = document.getElementById('contPhone2').value.trim();
  const group   = document.getElementById('contGroup').value;
  const address = document.getElementById('contAddress').value.trim();
  const note    = document.getElementById('contNote').value.trim();

  let list = getContacts();
  const idx = list.findIndex(c => c.id === id);
  const contact = { id, name, avatar, phone1, phone2, group, address, note, updatedAt: Date.now() };

  if (idx >= 0) list[idx] = contact;
  else list.push(contact);

  saveContacts(list);
  closeContactForm();
  renderContacts();
  showToast('✅ Kontakt anrejistre');
}

function editContact(id) {
  const list = getContacts();
  const c = list.find(x => x.id === id);
  if (!c) return;
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23222'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23555'/%3E%3Cellipse cx='32' cy='52' rx='18' ry='12' fill='%23555'/%3E%3C/svg%3E";
  document.getElementById('contactFormTitle').textContent = 'Modifye Kontakt';
  document.getElementById('contId').value = c.id;
  document.getElementById('contName').value = c.name;
  document.getElementById('contPhone1').value = c.phone1 || '';
  document.getElementById('contPhone2').value = c.phone2 || '';
  document.getElementById('contGroup').value = c.group || '';
  document.getElementById('contAddress').value = c.address || '';
  document.getElementById('contNote').value = c.note || '';
  document.getElementById('contAvatarPreview').src = c.avatar || DEFAULT_AVATAR;
  document.getElementById('contactFormOverlay').classList.remove('hidden');
}

function deleteContact(id) {
  if (!confirm('Efase kontakt sa a?')) return;
  let list = getContacts();
  list = list.filter(c => c.id !== id);
  saveContacts(list);
  renderContacts();
  showToast('🗑️ Kontakt efase');
}

function escHtmlC(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
