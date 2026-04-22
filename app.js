/* ══════════════════════════════════════════════
   THOMAS BUSINESS SUITE — app.js
   Navigation · PIN · Utilities
   ══════════════════════════════════════════════ */

const PIN_CODE = '56665';
let pinBuffer = '';
let screenHistory = [];

/* ── PIN PAD ────────────────────────────────── */
function pinPress(digit) {
  if (pinBuffer.length >= 5) return;
  pinBuffer += digit;
  updateDots();
  if (pinBuffer.length === 5) {
    setTimeout(() => checkPin(), 120);
  }
}

function pinDelete() {
  if (pinBuffer.length === 0) return;
  pinBuffer = pinBuffer.slice(0, -1);
  updateDots();
}

function updateDots() {
  for (let i = 0; i < 5; i++) {
    const dot = document.getElementById('dot' + i);
    if (dot) dot.classList.toggle('filled', i < pinBuffer.length);
  }
}

function checkPin() {
  if (pinBuffer === PIN_CODE) {
    pinBuffer = '';
    updateDots();
    navigateTo('dashScreen');
  } else {
    pinBuffer = '';
    updateDots();
    const err = document.getElementById('pinError');
    if (err) {
      err.classList.remove('hidden');
      setTimeout(() => err.classList.add('hidden'), 2000);
    }
    // Shake dots
    const dotsEl = document.querySelector('.pin-dots');
    if (dotsEl) {
      dotsEl.style.animation = 'none';
      dotsEl.offsetHeight; // reflow
      dotsEl.style.animation = 'shake 0.4s ease';
    }
  }
}

/* ── NAVIGATION ─────────────────────────────── */
function navigateTo(screenId) {
  const current = document.querySelector('.screen.active');
  if (current && current.id !== screenId) {
    current.classList.remove('active');
    // Delay hiding to allow CSS transition to complete
    const toHide = current;
    setTimeout(() => { toHide.style.display = 'none'; }, 350);
  }
  const next = document.getElementById(screenId);
  if (next) {
    next.style.display = 'flex';
    // Force reflow before adding active class to trigger transition
    next.getBoundingClientRect();
    requestAnimationFrame(() => {
      next.classList.add('active');
    });
    // Avoid duplicates in history
    if (screenHistory[screenHistory.length - 1] !== screenId) {
      screenHistory.push(screenId);
    }
  }
}

function goBack() {
  if (screenHistory.length <= 1) return;
  screenHistory.pop();
  const prev = screenHistory[screenHistory.length - 1];
  const current = document.querySelector('.screen.active');
  if (current) {
    current.classList.remove('active');
    const toHide = current;
    setTimeout(() => { toHide.style.display = 'none'; }, 350);
  }
  const prevEl = document.getElementById(prev);
  if (prevEl) {
    prevEl.style.display = 'flex';
    prevEl.getBoundingClientRect();
    requestAnimationFrame(() => prevEl.classList.add('active'));
  }
}

function openModule(name) {
  const map = {
    customers: 'customersScreen',
    pos: 'posScreen',
    microcredit: 'microcreditScreen',
    contacts: 'contactsScreen',
  };
  if (map[name]) {
    navigateTo(map[name]);
    if (name === 'customers') renderCustomers();
    if (name === 'microcredit') renderMCHistory();
    if (name === 'contacts') renderContacts();
    if (name === 'pos') renderPosHistory();
  }
}

/* ── TOAST ──────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

/* ── UTILS ──────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCurrency(n) {
  return '$' + parseFloat(n || 0).toFixed(2);
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  navigateTo('lockScreen');
});
