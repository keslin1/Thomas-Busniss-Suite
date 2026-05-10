/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — objektif.js  v3
   Plan d'action · Pwogram e Woutin
   ──────────────────────────────────────────────
   NOUVEAUTÉS v3 :
   • Drag & Drop pour réorganiser les plans
     (ordre persisté dans localStorage via `order`)
   • Clic sur le texte du plan → édition inline
   • Suppression de la case à cocher de validation
   • Migration sécurisée : aucune donnée existante
     n'est écrasée ou corrompue
   ══════════════════════════════════════════════ */

const OBJ_KEY = 'tbs_objektif';

const OBJ_COLORS = [
  '#8b3dbc', '#1a6fa8', '#1a6a3a', '#b8860b',
  '#c0392b', '#16a085', '#2c3e50', '#e67e22',
  '#8e44ad', '#2980b9', '#27ae60', '#d35400',
];

let objOpenId     = null;
let objToastTimer = null;

/* ── Drag state ───────────────────────────────── */
let _dragSrcObjId  = null;
let _dragSrcPlanId = null;

/* ── Storage ──────────────────────────────────── */
function getObjectifs() {
  try { return JSON.parse(localStorage.getItem(OBJ_KEY)) || []; }
  catch { return []; }
}

function saveObjectifs(list) {
  localStorage.setItem(OBJ_KEY, JSON.stringify(list));
}

/* ── Migration sécurisée ─────────────────────── */
/*
  Ajoute la propriété `order` à chaque plan qui n'en a pas encore,
  sans toucher aux autres données.  Appelée une seule fois au init.
*/
function migrateObjectifsOrder() {
  const list    = getObjectifs();
  let changed   = false;

  list.forEach(obj => {
    (obj.plans || []).forEach((plan, idx) => {
      if (plan.order === undefined || plan.order === null) {
        plan.order = idx;
        changed    = true;
      }
    });
  });

  if (changed) saveObjectifs(list);
}

/* ── Utils ────────────────────────────────────── */
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
  const d   = new Date(ts);
  const y   = d.getFullYear();
  const m   = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

/*
  LOGIQUE CHECK :
  ✔  check   = Accompli    → 100% pou plan sa a
  ✕  fail    = Non accompli → 0%  pou plan sa a
  pending     = En attente  → compte ni check ni fail
*/
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
  if (typeof showToast === 'function') { showToast(msg); return; }
  const el = document.getElementById('objToast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(objToastTimer);
  objToastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

/* ── Tri par ordre ────────────────────────────── */
function sortedPlans(plans) {
  return [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/* ── Render ───────────────────────────────────── */
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

  if (objOpenId) {
    const card = document.querySelector(`.obj-card[data-id="${objOpenId}"]`);
    if (card) card.classList.add('open');
  }

  /* Attacher les handlers drag & drop après le rendu */
  _attachDragHandlers();
}

function renderObjCard(obj) {
  const plans  = obj.plans || [];
  const pct    = calcProgress(plans);
  const pClass = progressClass(pct);
  const color  = obj.color || '#8b3dbc';
  const isOpen = obj.id === objOpenId;

  const sorted   = sortedPlans(plans);
  const plansHtml = sorted.map(p => renderPlanItem(obj.id, p)).join('');

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
      <div class="obj-plans" id="plans-${obj.id}" data-obj-id="${obj.id}">
        ${plansHtml}
        <button class="add-plan-btn" onclick="openPlanForm('${obj.id}')">+ Ajoute yon plan</button>
      </div>
      <div class="obj-card-actions">
        <button class="obj-edit-btn" onclick="openObjForm('${obj.id}')">✏️ Modifye</button>
        <button class="obj-del-btn"  onclick="deleteObjectif('${obj.id}')">🗑 Efase</button>
      </div>
    </div>`;
}

/*
  renderPlanItem v3 :
  - Suppression de la case à cocher
  - Poignée drag handle à gauche
  - Clic sur le texte → édition inline
  - Boutons ✔ / ✕ / ↺ maintenus
  - Boutons ✏️ et 🗑️ maintenus
*/
function renderPlanItem(objId, p) {
  let statusClass = '';
  if (p.status === 'check') statusClass = 'plan-success';
  if (p.status === 'fail')  statusClass = 'plan-fail';

  const hasProof  = !!p.proof;
  const proofHtml = p.proof
    ? `<img class="plan-proof-img" src="${p.proof}" alt="Prèv" onclick="openProofOverlay('${objId}','${p.id}')" />`
    : '';
  const dueTxt = p.dueDate ? `<span>Limit: ${objFmtDate(p.dueDate)}</span>` : '';

  /* Boutons de statut (sans case à cocher) */
  let actionBtns = '';
  if (p.status === 'pending') {
    actionBtns = `
      <button class="plan-btn check" onclick="setPlanStatus('${objId}','${p.id}','check')" title="Accompli">✔</button>
      <button class="plan-btn fail"  onclick="setPlanStatus('${objId}','${p.id}','fail')"  title="Non accompli">✕</button>`;
  } else {
    actionBtns = `
      <button class="plan-btn cancel" onclick="setPlanStatus('${objId}','${p.id}','pending')" title="Remete an atant">↺</button>`;
  }

  const editPlanBtn = `<button class="plan-edit-btn" onclick="openEditPlanForm('${objId}','${p.id}')" title="Modifye plan">✏️</button>`;
  const delPlanBtn  = `<button class="plan-del-btn"  onclick="deletePlan('${objId}','${p.id}')" title="Efase plan">🗑️</button>`;

  return `
    <div class="plan-item ${statusClass}"
         data-plan-id="${p.id}"
         data-obj-id="${objId}"
         draggable="true">
      <!-- Poignée drag -->
      <div class="plan-drag-handle" title="Glise pou reoganize">⠿</div>
      <div class="plan-body">
        <!-- Clic sur le texte → édition inline -->
        <div class="plan-text plan-text-editable"
             onclick="inlineEditPlan(event,'${objId}','${p.id}')"
             title="Klike pou modifye">${objEsc(p.text)}</div>
        <div class="plan-date">${dueTxt}</div>
        ${proofHtml}
      </div>
      <button class="plan-proof-btn ${hasProof ? 'has-proof' : ''}"
              onclick="openProofOverlay('${objId}','${p.id}')"
              title="Foto prèv">👁️</button>
      <div class="plan-actions">
        ${actionBtns}
        ${editPlanBtn}
        ${delPlanBtn}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════
   ÉDITION INLINE (clic sur le texte du plan)
   ══════════════════════════════════════════════ */
function inlineEditPlan(evt, objId, planId) {
  /* Éviter de déclencher si l'utilisateur clique sur un bouton enfant */
  evt.stopPropagation();

  const textEl = evt.currentTarget;
  if (textEl.querySelector('input')) return; /* déjà en édition */

  const currentText = textEl.textContent.trim();

  /* Remplacer le texte par un champ input */
  textEl.innerHTML = `
    <input type="text"
           class="plan-inline-input"
           value="${objEsc(currentText)}"
           onclick="event.stopPropagation()"
           onkeydown="handleInlineKey(event,'${objId}','${planId}',this)"
           onblur="commitInlineEdit('${objId}','${planId}',this)" />`;

  const input = textEl.querySelector('input');
  input.focus();
  input.select();
}

function handleInlineKey(evt, objId, planId, input) {
  if (evt.key === 'Enter') { input.blur(); }
  if (evt.key === 'Escape') {
    /* Annuler — re-rendre sans modification */
    objOpenId = objId;
    renderObjectifs();
  }
}

function commitInlineEdit(objId, planId, input) {
  const newText = (input.value || '').trim();
  if (!newText) {
    objOpenId = objId;
    renderObjectifs();
    return;
  }

  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (!plan) return;

  if (plan.text !== newText) {
    plan.text     = newText;
    obj.updatedAt = Date.now();
    saveObjectifs(list);
    objShowToast('✅ Plan modifye');
  }

  objOpenId = objId;
  renderObjectifs();
}

/* ══════════════════════════════════════════════
   DRAG & DROP — réorganisation des plans
   ══════════════════════════════════════════════ */
function _attachDragHandlers() {
  document.querySelectorAll('.plan-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', _onDragStart);
    item.addEventListener('dragover',  _onDragOver);
    item.addEventListener('drop',      _onDrop);
    item.addEventListener('dragend',   _onDragEnd);
  });
}

function _onDragStart(evt) {
  _dragSrcObjId  = this.dataset.objId;
  _dragSrcPlanId = this.dataset.planId;
  this.classList.add('plan-dragging');
  evt.dataTransfer.effectAllowed = 'move';
  evt.dataTransfer.setData('text/plain', _dragSrcPlanId);
}

function _onDragOver(evt) {
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'move';

  /* Indiquer visuellement la position cible */
  document.querySelectorAll('.plan-item').forEach(el => el.classList.remove('plan-drag-over'));
  this.classList.add('plan-drag-over');
}

function _onDrop(evt) {
  evt.preventDefault();
  evt.stopPropagation();

  const targetPlanId = this.dataset.planId;
  const targetObjId  = this.dataset.objId;

  /* On n'autorise le déplacement que dans le même objectif */
  if (_dragSrcPlanId === targetPlanId || _dragSrcObjId !== targetObjId) {
    _cleanDragClasses();
    return;
  }

  /* Réordonner dans le localStorage */
  const list = getObjectifs();
  const obj  = list.find(o => o.id === _dragSrcObjId);
  if (!obj) { _cleanDragClasses(); return; }

  const sorted = sortedPlans(obj.plans);
  const srcIdx = sorted.findIndex(p => p.id === _dragSrcPlanId);
  const tgtIdx = sorted.findIndex(p => p.id === targetPlanId);

  if (srcIdx === -1 || tgtIdx === -1) { _cleanDragClasses(); return; }

  /* Déplacer l'élément */
  const [moved] = sorted.splice(srcIdx, 1);
  sorted.splice(tgtIdx, 0, moved);

  /* Réécrire la propriété `order` sans toucher aux autres propriétés */
  sorted.forEach((plan, idx) => {
    const original = obj.plans.find(p => p.id === plan.id);
    if (original) original.order = idx;
  });

  obj.updatedAt = Date.now();
  saveObjectifs(list);
  _cleanDragClasses();

  objOpenId = _dragSrcObjId;
  renderObjectifs();
  objShowToast('↕️ Lòd plan yo mete ajou');
}

function _onDragEnd() {
  _cleanDragClasses();
}

function _cleanDragClasses() {
  document.querySelectorAll('.plan-item').forEach(el => {
    el.classList.remove('plan-dragging', 'plan-drag-over');
  });
}

/* ── Accordéon ────────────────────────────────── */
function toggleObjCard(id) {
  objOpenId = (objOpenId === id) ? null : id;
  renderObjectifs();
}

/* ── Objectif Form ────────────────────────────── */
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
    titleEl.textContent = 'Modifye objektif';
    inputEl.value = obj.title;
    buildColorSwatches(obj.color || OBJ_COLORS[0]);
  } else {
    titleEl.textContent = 'Nouvo objektif';
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

  const color  = getSelectedColor();
  const editId = document.getElementById('objEditId').value;
  const list   = getObjectifs();
  const now    = Date.now();

  if (editId) {
    const idx = list.findIndex(o => o.id === editId);
    if (idx !== -1) {
      list[idx].title     = title;
      list[idx].color     = color;
      list[idx].updatedAt = now;
    }
  } else {
    list.unshift({ id: objUid(), title, color, plans: [], createdAt: now, updatedAt: now });
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

/* ── Plan Form (Ajoute) ──────────────────────── */
function openPlanForm(objId) {
  document.getElementById('planObjId').value    = objId;
  document.getElementById('planEditId').value   = '';
  document.getElementById('planTextInput').value = '';
  document.getElementById('planDateInput').value = '';
  document.getElementById('planFormTitle').textContent = 'Ajoute yon plan';
  document.getElementById('planFormOverlay').classList.remove('hidden');
}

function closePlanForm() {
  document.getElementById('planFormOverlay').classList.add('hidden');
}

/* ── Plan Form (Édition) ─────────────────────── */
function openEditPlanForm(objId, planId) {
  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('planObjId').value     = objId;
  document.getElementById('planEditId').value    = planId;
  document.getElementById('planTextInput').value = plan.text || '';
  document.getElementById('planDateInput').value = objFmtDateInput(plan.dueDate);
  document.getElementById('planFormTitle').textContent = 'Modifye plan';
  document.getElementById('planFormOverlay').classList.remove('hidden');
}

function savePlan() {
  const objId  = document.getElementById('planObjId').value;
  const editId = document.getElementById('planEditId').value;
  const text   = (document.getElementById('planTextInput').value || '').trim();
  if (!text) { objShowToast('⚠️ Deskripsyon plan obligatwa'); return; }

  const dateVal = document.getElementById('planDateInput').value;
  const dueDate = dateVal ? new Date(dateVal).getTime() : null;

  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;

  if (editId) {
    const plan = obj.plans.find(p => p.id === editId);
    if (plan) {
      plan.text    = text;
      plan.dueDate = dueDate;
    }
    obj.updatedAt = Date.now();
    objShowToast('✅ Plan modifye');
  } else {
    /* Ordre : placer le nouveau plan à la fin */
    const maxOrder = obj.plans.reduce((mx, p) => Math.max(mx, p.order ?? 0), -1);
    obj.plans.push({
      id:        objUid(),
      text,
      dueDate,
      status:    'pending',
      proof:     null,
      order:     maxOrder + 1,
      createdAt: Date.now(),
    });
    obj.updatedAt = Date.now();
    objShowToast('✅ Plan ajoute');
  }

  saveObjectifs(list);
  objOpenId = objId;
  closePlanForm();
  renderObjectifs();
}

/* ── Plan Delete ─────────────────────────────── */
function deletePlan(objId, planId) {
  if (!confirm('Efase plan sa a?')) return;
  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  obj.plans     = obj.plans.filter(p => p.id !== planId);
  obj.updatedAt = Date.now();
  saveObjectifs(list);
  objOpenId = objId;
  renderObjectifs();
  objShowToast('🗑️ Plan efase');
}

/* ── Plan Status ─────────────────────────────── */
function setPlanStatus(objId, planId, status) {
  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (!plan) return;
  plan.status   = status;
  obj.updatedAt = Date.now();
  saveObjectifs(list);
  objOpenId = objId;
  renderObjectifs();

  const msgs = {
    check:   '✔️ Plan akompli!',
    fail:    '✕ Plan non akompli',
    pending: '↺ Plan remete an atant',
  };
  objShowToast(msgs[status] || '');
}

/* ── Proof (Photo preuve) ────────────────────── */
function openProofOverlay(objId, planId) {
  document.getElementById('proofObjId').value  = objId;
  document.getElementById('proofPlanId').value = planId;

  const list = getObjectifs();
  const obj  = list.find(o => o.id === objId);
  const plan = obj ? obj.plans.find(p => p.id === planId) : null;

  const imgEl   = document.getElementById('proofFullImg');
  const noImgEl = document.getElementById('proofNoImg');
  const delBtn  = document.getElementById('proofDeleteBtn');

  if (plan && plan.proof) {
    imgEl.src = plan.proof;
    imgEl.style.display   = 'block';
    noImgEl.style.display = 'none';
    delBtn.style.display  = 'inline-block';
  } else {
    imgEl.src = '';
    imgEl.style.display   = 'none';
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
  const reader = new FileReader();
  reader.onload = ev => {
    const b64    = ev.target.result;
    const objId  = document.getElementById('proofObjId').value;
    const planId = document.getElementById('proofPlanId').value;
    const list   = getObjectifs();
    const obj    = list.find(o => o.id === objId);
    if (!obj) return;
    const plan = obj.plans.find(p => p.id === planId);
    if (!plan) return;
    plan.proof    = b64;
    obj.updatedAt = Date.now();
    saveObjectifs(list);
    const imgEl = document.getElementById('proofFullImg');
    imgEl.src = b64;
    imgEl.style.display   = 'block';
    document.getElementById('proofNoImg').style.display    = 'none';
    document.getElementById('proofDeleteBtn').style.display = 'inline-block';
    objOpenId = objId;
    renderObjectifs();
    objShowToast('📷 Foto prèv anrejistre');
    input.value = '';
  };
  reader.readAsDataURL(input.files[0]);
}

function deleteProof() {
  const objId  = document.getElementById('proofObjId').value;
  const planId = document.getElementById('proofPlanId').value;
  const list   = getObjectifs();
  const obj    = list.find(o => o.id === objId);
  if (!obj) return;
  const plan = obj.plans.find(p => p.id === planId);
  if (plan) { plan.proof = null; obj.updatedAt = Date.now(); }
  saveObjectifs(list);
  const imgEl = document.getElementById('proofFullImg');
  imgEl.src = '';
  imgEl.style.display   = 'none';
  document.getElementById('proofNoImg').style.display    = 'block';
  document.getElementById('proofDeleteBtn').style.display = 'none';
  objOpenId = objId;
  renderObjectifs();
  objShowToast('🗑️ Foto prèv efase');
}

/* ── Navigation ──────────────────────────────── */
function objGoBack() {
  if (typeof goBack === 'function') goBack();
  else window.history.back();
}

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Migration sécurisée avant tout rendu */
  migrateObjectifsOrder();
  renderObjectifs();
});
