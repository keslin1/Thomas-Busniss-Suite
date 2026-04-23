/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — objektif.js
   Plan d'action · Pwogram e Woutin
   ══════════════════════════════════════════════ */

const OBJ_KEY = 'tbs_objektif';

const OBJ_COLORS = [
  '#8b3dbc', '#1a6fa8', '#1a6a3a', '#b8860b',
  '#c0392b', '#16a085', '#2c3e50', '#e67e22',
  '#8e44ad', '#2980b9', '#27ae60', '#d35400',
];

let objOpenId  = null;   // objectif actuellement ouvert (accordéon)
let objToastTimer = null;

/* ── Storage ──────────────────────────────── */
function getObjectifs() {
  try { return JSON.parse(localStorage.getItem(OBJ_KEY)) || []; }
  catch { return []; }
}

function saveObjectifs(list) {
  localStorage.setItem(OBJ_KEY, JSON.stringify(list));
}

/* ── Utils ────────────────────────────────── */
function objUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function objEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function objFmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-HT', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function objFmtDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function calcProgress(plans) {
  const total = plans.length;
  if (total === 0) return 0;
  const ok = plans.filter(p => p.status === 'check').length;
  return Math.round((ok / total) * 100);
}

function progressClass(pct) {
  if (pct >= 70) return 'done';
  if (pct >= 30) return 'mid';
  return 'low';
}

function objShowToast(msg) {
  // Use global showToast if available (embedded in Thomas Business)
  if (typeof showToast === 'function') { showToast(msg); return; }
  const el = document.getElementById('objToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(objToastTimer);
  objToastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

/* ── Render ───────────────────────────────── */
function renderObjectifs() {
  const list = getObjectifs();
  const body = document.getElementById('objBody');
  if (!body) return;

  if (list.length === 0) {
    body.innerHTML = `
      <div class="obj-empty">
        <div class="obj-empty-icon">🎯</div>
        <div>Okenn objektif ankò.<br>Peze <b>+</b> pou kreye premye a.</div>
      </div>`;
    return;
  }

  body.innerHTML = list.map(obj => renderObjCard(obj)).join('');

  // Restore open state
  if (objOpenId) {
    const card = document.querySelector(`.obj-card[data-id="${objOpenId}"]`);
    if (card) card.classList.add('open');
  }
}

function renderObjCard(obj) {
  const plans = obj.plans || [];
  const pct   = calcProgress(plans);
  const pClass = progressClass(pct);
  const color  = obj.color || '#8b3dbc';
  const isOpen = obj.id === objOpenId;

  const plansHtml = plans.map(p => renderPlanItem(obj.id, p)).join('');

  return `
    <div class="obj-card ${isOpen ? 'open' : ''}" data-id="${obj.id}">
      <div class="obj-card-header" onclick="toggleObjCard('${obj.id}')">
        <div class="obj-color-dot" style="background:${color};"></div>
        <div class="obj-title-wrap">
          <div class="obj-title">${objEsc(obj.title)}</div>
          <div class="obj-meta">
            ${plans.length} plan${plans.length !== 1 ? 's' : ''}
            ${obj.updatedAt ? '· Dènye chanjman: ' + objFmtDate(obj.updatedAt) : ''}
          </div>
        </div>
        <div class="obj-progress-badge ${pClass}">${pct}%</div>
        <span class="obj-chevron">›</span>
      </div>
      <div class="obj-progress-bar-wrap">
        <div class="obj-progress-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
      <div class="obj-plans" id="plans-${obj.id}">
        ${plansHtml}
        <button class="add-plan-btn" onclick="openPlanForm('${obj.id}')">+ Ajoute yon plan</button>
      </div>
      <div class="obj-card-actions">
        <button class="obj-edit-btn" onclick="openObjForm('${obj.id}')">✏️ Modifye</button>
        <button class="obj-del-btn"  onclick="deleteObjectif('${obj.id}')">🗑 Efase</button>
      </div>
    </div>`;
}

function renderPlanItem(objId, p) {
  let statusClass = '';
  if (p.status === 'check') statusClass = 'plan-success';
  if (p.status === 'fail')  statusClass = 'plan-fail';

  const hasProof = !!p.proof;
  const proofHtml = p.proof
    ? `<img class="plan-proof-img" src="${p.proof}" alt="Prèv" onclick="openProofOverlay('${objId}','${p.id}')" />`
    : '';

  const dueTxt = p.dueDate ? `<span>Limit: ${objFmtDate(p.dueDate)}</span>` : '';

  let actionBtns = '';
  if (p.status === 'pending') {
    actionBtns = `
      <button class="plan-btn check"  onclick="setPlanStatus('${objId}','${p.id}','check')"  title="Reyisi">✔</button>
      <button class="plan-btn fail"   onclick="setPlanStatus('${objId}','${p.id}','fail')"   title="Echwe">✕</button>`;
  } else {
    actionBtns = `
      <button class="plan-btn cancel" onclick="setPlanStatus('${objId}','${p.id}','pending')" title="Renmèt an atant">↺</button>`;
  }

  return `
    <div class="plan-item ${statusClass}" data-plan-id="${p.id}">
      <div class="plan-body">
        <div class="plan-text">${objEsc(p.text)}</div>
        <div class="plan-date">${dueTxt}</div>
        ${proofHtml}
      </div>
      <button class="plan-proof-btn ${hasProof ? 'has-proof' : ''}"
              onclick="openProofOverlay('${objId}','${p.id}')"
              title="Foto prèv">👁️</button>
      <div class="plan-actions">${actionBtns}</div>
    </div>`;
}

/* ── Accordéon ────────────────────────────── */
function toggleObjCard(id) {
  if (objOpenId === id) {
    objOpenId = null;
  } else {
    objOpenId = id;
  }
  renderObjectifs();
}

/* ── Objectif Form ────────────────────────── */
function buildColorSwatches(selected) {
  const row = document.getElementById('objColorRow');
  if (!row) return;
  row.innerHTML = OBJ_COLORS.map(c => `
    <div class="obj-color-swatch ${c === selected ? 'selected' : ''}"
         style="background:${c};"
         onclick="selectObjColor('${c}', this)"></div>
  `).join('');
}

function selectObjColor(color, el) {
  document.querySelectorAll('.obj-color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

function getSelectedColor() {
  const sel = document.querySelector('.obj-color-swatch.selected');
  return sel ? sel.style.background : OBJ_COLORS[0];
}

function openObjForm(id = null) {
  document.getElementById('objEditId').value = id || '';
  const titleEl = document.getElementById('objFormTitle');
  const inputEl = document.getElementById('objTitleInput');

  if (id) {
    const obj = getObjectifs().find(o => o.id === id);
    if (!obj) return;
    titleEl.textContent = 'Modifye Objektif';
    inputEl.value = obj.title;
    buildColorSwatches(obj.color || OBJ_COLORS[0]);
  } else {
    titleEl.textContent = 'Nouvo Objektif';
    inputEl.value = '';
    buildColorSwatches(OBJ_COLORS[0]);
  }
  document.getElementById('objFormOverlay').classList.remove('hidden');
}

function closeObjForm() {
  document.getElementById('objFormOverlay').classList.add('hidden');
}

function saveObjectif() {
  const title = (document.getElementById('objTitleInput').value || '').trim();
  if (!title) { objShowToast('⚠️ Tit objektif obligatwa'); return; }

  const color = getSelectedColor();
  const editId = document.getElementById('objEditId').value;
  const list = getObjectifs();
  const now = Date.now();

  if (editId) {
    const idx = list.findIndex(o => o.id === editId);
    if (idx !== -1) {
      list[idx].title = title;
      list[idx].color = color;
      list[idx].updatedAt = now;
    }
  } else {
    list.unshift({
      id: objUid(),
      title,
      color,
      plans: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  saveObjectifs(list);
  closeObjForm();
  renderObjectifs();
  objShowToast(editId ? '✅ Objektif modifye' : '✅ Objektif kreye');
}

function deleteObjectif(id) {
  if (!confirm('Efase objektif sa a ak tout plan li yo?')) return;
  const list = getObjectifs().filter(o => o.id !== id);
  if (objOpenId === id) objOpenId = null;
  saveObjectifs(list);
  renderObjectifs();
  objShowToast('🗑️ Objektif efase');
}

/* ── Plan Form ────────────────────────────── */
function openPlanForm(objId) {
  document.getElementById('planObjId').value = objId;
  document.getElementById('planTextInput').value = '';
  document.getElementById('planDateInput').value = '';
  document.getElementById('planFormOverlay').classList.remove('hidden');
}

function closePlanForm() {
  document.getElementById('planFormOverlay').classList.add('hidden');
}

function savePlan() {
  const objId = document.getElementById('planObjId').value;
  const text  = (document.getElementById('planTextInput').value || '').trim();
  if (!text) { objShowToast('⚠️ Deskripsyon plan obligatwa'); return; }

  const dateVal = document.getElementById('planDateInput').value;
  const dueDate = dateVal ? new Date(dateVal).getTime() : null;

  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;

  obj.plans.push({
    id: objUid(),
    text,
    dueDate,
    status: 'pending',
    proof: null,
    createdAt: Date.now(),
  });
  obj.updatedAt = Date.now();

  saveObjectifs(list);
  objOpenId = objId;
  closePlanForm();
  renderObjectifs();
  objShowToast('✅ Plan ajoute');
}

/* ── Plan Status ──────────────────────────── */
function setPlanStatus(objId, planId, status) {
  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (!plan) return;
  plan.status = status;
  obj.updatedAt = Date.now();
  saveObjectifs(list);
  objOpenId = objId;
  renderObjectifs();

  const msgs = { check: '✅ Plan mache!', fail: '❌ Plan echwe', pending: '↺ Plan remete an atant' };
  objShowToast(msgs[status] || '');
}

/* ── Proof (Photo preuve) ─────────────────── */
function openProofOverlay(objId, planId) {
  document.getElementById('proofObjId').value  = objId;
  document.getElementById('proofPlanId').value = planId;

  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  const plan = obj ? obj.plans.find(p => p.id === planId) : null;

  const imgEl  = document.getElementById('proofFullImg');
  const noImgEl = document.getElementById('proofNoImg');
  const delBtn = document.getElementById('proofDeleteBtn');

  if (plan && plan.proof) {
    imgEl.src = plan.proof;
    imgEl.style.display = 'block';
    noImgEl.style.display = 'none';
    delBtn.style.display  = 'inline-block';
  } else {
    imgEl.src = '';
    imgEl.style.display = 'none';
    noImgEl.style.display = 'block';
    delBtn.style.display  = 'none';
  }
  document.getElementById('proofOverlay').classList.remove('hidden');
}

function closeProofOverlay() {
  document.getElementById('proofOverlay').classList.add('hidden');
}

function uploadProof(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    const objId  = document.getElementById('proofObjId').value;
    const planId = document.getElementById('proofPlanId').value;
    const list = getObjectifs();
    const obj  = list.find(o => o.id === objId);
    if (!obj) return;
    const plan = obj.plans.find(p => p.id === planId);
    if (!plan) return;
    plan.proof = b64;
    obj.updatedAt = Date.now();
    saveObjectifs(list);
    // Refresh proof overlay
    const imgEl = document.getElementById('proofFullImg');
    imgEl.src = b64;
    imgEl.style.display = 'block';
    document.getElementById('proofNoImg').style.display   = 'none';
    document.getElementById('proofDeleteBtn').style.display = 'inline-block';
    objOpenId = objId;
    renderObjectifs();
    objShowToast('📷 Foto prèv anrejistre');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

function deleteProof() {
  const objId  = document.getElementById('proofObjId').value;
  const planId = document.getElementById('proofPlanId').value;
  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (plan) { plan.proof = null; obj.updatedAt = Date.now(); }
  saveObjectifs(list);
  const imgEl = document.getElementById('proofFullImg');
  imgEl.src = '';
  imgEl.style.display = 'none';
  document.getElementById('proofNoImg').style.display   = 'block';
  document.getElementById('proofDeleteBtn').style.display = 'none';
  objOpenId = objId;
  renderObjectifs();
  objShowToast('🗑️ Foto prèv efase');
}

/* ── Navigation (standalone vs embedded) ──── */
function objGoBack() {
  if (typeof goBack === 'function') {
    goBack();
  } else {
    window.history.back();
  }
}

/* ── Init ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderObjectifs();
});
