// ===============================================================
//  index.js — Les Cayes Dropshipping v2.1
//  Lojik JavaScript pou paj dakèy (index.html)
// ===============================================================

'use strict';

const MESSAGE_KEY    = 'lcd_user_messages';
const userStorageKey = 'user_profile_data';
let   baseLikes      = 109;

// ── PAGE LOADER (tranzisyon ant paj) ────────────────────────────
window.goTo = function (url) {
  var loader = document.getElementById('page-loader');
  if (loader) loader.classList.add('show');
  setTimeout(function () { window.location.href = url; }, 480);
};

// Masquer le loader au chargement ET au retour arrière (bfcache)
window.addEventListener('load', function () {
  var loader = document.getElementById('page-loader');
  if (loader) loader.classList.remove('show');
});

window.addEventListener('pageshow', function (e) {
  var loader = document.getElementById('page-loader');
  if (loader) loader.classList.remove('show');
});

// ── DRAWER ──────────────────────────────────────────────────────
window.openDrawer = function () {
  var drawer  = document.getElementById('app-drawer');
  var overlay = document.getElementById('drawer-overlay');
  if (drawer)  drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  syncDrw();
  syncDrawerAvatar();
};

window.closeDrawer = function () {
  var drawer  = document.getElementById('app-drawer');
  var overlay = document.getElementById('drawer-overlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// Swipe gesture
(function () {
  var sx = 0;
  document.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    var dx     = e.changedTouches[0].clientX - sx;
    var drawer = document.getElementById('app-drawer');
    if (!drawer) return;
    if (drawer.classList.contains('open') && dx < -60) window.closeDrawer();
    if (!drawer.classList.contains('open') && sx < 30 && dx > 60) window.openDrawer();
  }, { passive: true });
})();

// Sync drawer avec profil localStorage
function syncDrw() {
  var p = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
  var n = document.getElementById('drw-nom');
  var l = document.getElementById('drw-loc');
  var b = document.getElementById('drw-balance');

  if (n) {
    var nm = (p.nom || '').trim();
    n.textContent = nm ? (nm.length > 20 ? nm.substring(0, 18) + '...' : nm) : 'Les Cayes Dropshipping';
  }
  if (l) {
    l.textContent = p.address
      ? p.address.split(',')[0].split(' ').slice(0, 2).join(' ')
      : 'Haiti-Sud';
  }
  if (b) {
    var sb = localStorage.getItem('lcd_user_balance');
    var ep = localStorage.getItem('lcd_epargne_montant');
    if (sb !== null && sb !== '') b.textContent = '$' + parseFloat(sb).toFixed(2);
    else if (ep !== null && ep !== '') b.textContent = parseFloat(ep).toFixed(2) + ' HTG';
    else b.textContent = 'Wè Tranzaksyon';
  }
}

// ── TOP BAR : titre fixe "Les Cayes Drop..." ──────────────────
function refreshTopBar() {
  var titleEl = document.getElementById('top-bar-title');
  if (titleEl) titleEl.textContent = 'Les Cayes Drop...';

  // Avatar photo si disponib
  var topLogo = document.getElementById('top-bar-logo');
  var avatar  = localStorage.getItem('lcd_user_avatar');
  if (topLogo && avatar) {
    topLogo.src = avatar;
    topLogo.style.borderRadius = '50%';
    topLogo.style.objectFit   = 'cover';
    topLogo.style.width       = '32px';
    topLogo.style.height      = '32px';
  }
}

// ── KIYÈS X YE — afficher dans le drawer ──────────────────────
window.initKiyesDrawer = function (nom) {
  var item  = document.getElementById('drw-kiyès');
  var label = document.getElementById('drw-kiyès-label');
  if (!item) return;
  item.style.display = 'flex';
  if (label && nom) {
    var prenom = nom.trim().split(' ')[0];
    label.textContent = 'KIYÈS ' + prenom.toUpperCase() + ' YE';
  }
};

// Navigation vers pwofil.html SANS page-loader
window.allerPwofil = function () {
  window.closeDrawer();
  window.location.href = 'pwofil.html';
};

// ── LOGOUT ──────────────────────────────────────────────────────
window.logOut = function () {
  if (!confirm('Dekonekte?')) return;
  localStorage.removeItem('lcd_user_registered');
  localStorage.removeItem(userStorageKey);
  window.closeDrawer();
  window.location.reload();
};

// ── BADGES NOTIFIKASYON ──────────────────────────────────────────
function updateNotifBadges() {
  try {
    var messages    = JSON.parse(localStorage.getItem(MESSAGE_KEY) || '[]');
    var unreadCount = messages.filter(function (m) { return !m.read; }).length;
    var dot         = document.getElementById('tb-dot');
    var footerBadge = document.getElementById('footer-badge');
    if (dot)         dot.style.display         = unreadCount > 0 ? 'block' : 'none';
    if (footerBadge) {
      footerBadge.style.display = unreadCount > 0 ? 'block' : 'none';
      footerBadge.textContent   = unreadCount > 0 ? unreadCount : '';
    }
  } catch (e) {}
}
window.updateNotifBadges = updateNotifBadges;


// ── NOTIFICATIONS ────────────────────────────────────────────────
window.requestPermission = function () {
  if (!('Notification' in window)) {
    alert('Navigatè sa a pa sipòte notifikasyon.');
    return;
  }
  Notification.requestPermission().then(function (permission) {
    if (permission === 'granted') {
      localStorage.setItem('notif_accepted', 'true');
      femenModalNotif();
      new Notification('Sistèm Aktive ✅', {
        body: 'Ou kapab resevwa mesaj Les Cayes Dropshipping yo kounya.',
        icon: '/lescayesdropshipping.png'
      });
    } else {
      window.refuseAccess();
    }
  });
};

window.refuseAccess = function () {
  alert('Atansyon! Aplikasyon LCD pa ka fonksyone san notifikasyon yo.');
};

function femenModalNotif() {
  var modal = document.getElementById('notif-modal');
  if (modal) modal.style.setProperty('display', 'none', 'important');
}

// ── SISTÈM LIKE ──────────────────────────────────────────────────
function initLikeSystem() {
  var likeCountElem = document.getElementById('like-count');
  var likeIcon      = document.getElementById('like-icon');
  var userHasLiked  = localStorage.getItem('user_has_liked') === 'true';

  var current  = 1;
  var interval = 1000 / baseLikes;

  var counter = setInterval(function () {
    current++;
    var displayTotal = userHasLiked ? current + 1 : current;
    if (likeCountElem) likeCountElem.textContent = displayTotal;

    if (current >= baseLikes) {
      clearInterval(counter);
      if (userHasLiked && likeIcon) {
        likeIcon.textContent = 'thumb_up';
        likeIcon.style.color = '#0074D9';
      }
    }
  }, interval);
}

window.toggleLike = function () {
  var likeIcon      = document.getElementById('like-icon');
  var likeCountElem = document.getElementById('like-count');
  var sound         = document.getElementById('like-sound');
  var isLiked       = localStorage.getItem('user_has_liked') === 'true';

  if (!isLiked) {
    if (sound) { sound.currentTime = 0; sound.play(); }
    if (likeIcon) {
      likeIcon.textContent     = 'thumb_up';
      likeIcon.style.color     = '#0074D9';
      likeIcon.style.transform = 'scale(1.3)';
      setTimeout(function () { likeIcon.style.transform = 'scale(1)'; }, 200);
    }
    if (likeCountElem) likeCountElem.textContent = baseLikes + 1;
    localStorage.setItem('user_has_liked', 'true');
  } else {
    if (likeIcon) {
      likeIcon.textContent = 'thumb_up_off_alt';
      likeIcon.style.color = 'var(--bleu-marin)';
    }
    if (likeCountElem) likeCountElem.textContent = baseLikes;
    localStorage.setItem('user_has_liked', 'false');
  }
};

window.toggleUnlike = function () {
  var unlikeIcon = document.getElementById('unlike-icon');
  var isUnliked  = localStorage.getItem('user_has_unliked') === 'true';

  if (!isUnliked) {
    if (unlikeIcon) {
      unlikeIcon.textContent = 'thumb_down';
      unlikeIcon.style.color = '#e74c3c';
    }
    localStorage.setItem('user_has_unliked', 'true');
    // Annuler le like si actif
    if (localStorage.getItem('user_has_liked') === 'true') {
      window.toggleLike();
    }
  } else {
    if (unlikeIcon) {
      unlikeIcon.textContent = 'thumb_down_off_alt';
      unlikeIcon.style.color = '';
    }
    localStorage.setItem('user_has_unliked', 'false');
  }
};

// ── CAROUSEL BANNER ──────────────────────────────────────────────
function initBannerCarousel() {
  var carousel  = document.getElementById('banner-carousel');
  var container = carousel ? carousel.querySelector('.carousel-container') : null;
  if (!carousel || !container) return;

  var items      = container.querySelectorAll('.carousel-item');
  var totalItems = items.length;
  var scrollAmount = 0;

  setInterval(function () {
    var itemWidth = items[0].offsetWidth;
    if (scrollAmount >= itemWidth * (totalItems - 1)) {
      scrollAmount = 0;
      carousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      scrollAmount += itemWidth;
      carousel.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, 10000);
}

// ── MODALS ───────────────────────────────────────────────────────
window.openModal = function (modalId) {
  var modal = document.getElementById(modalId);
  if (modal) { modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }
};

window.closeModal = function (modalId) {
  var modal = document.getElementById(modalId);
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = 'auto'; }
};

// ── SISTÈM AVIS KLIYAN ───────────────────────────────────────────
function getRefDate(daysAgo, minutesAgo) {
  minutesAgo = minutesAgo || 0;
  var d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.getTime();
}

function formatDateRelative(timestamp) {
  var now        = Date.now();
  var diffMs     = now - timestamp;
  var diffMin    = Math.floor(diffMs / 60000);
  var diffHours  = Math.floor(diffMs / 3600000);
  var diffDays   = Math.floor(diffMs / 86400000);
  var diffWeeks  = Math.floor(diffDays / 7);
  var diffMonths = Math.floor(diffDays / 30);

  if (diffMin < 2)      return 'kounye a';
  if (diffMin < 60)     return 'sa gen ' + diffMin + ' minit';
  if (diffHours < 24)   return 'sa gen ' + diffHours + ' è';
  if (diffDays === 1)   return 'yè';
  if (diffDays === 2)   return 'avan-yè';
  if (diffDays < 7)     return diffDays + ' jou pase';
  if (diffWeeks === 1)  return '1 semèn pase';
  if (diffWeeks < 5)    return diffWeeks + ' semèn pase';
  if (diffMonths === 1) return '1 mwa pase';
  if (diffMonths < 12)  return diffMonths + ' mwa pase';
  return 'plis pase 1 an';
}

var simulationAvis = [
  { id: 101, non: "Valpare B.",     stars: 5, text: "impotan pou biznis mw, psk ak ansyen transpo an m patka rantre kob m envesti yo.",                                    publishedAt: getRefDate(3) },
  { id: 102, non: "Claire Suze D.", stars: 5, text: "Pinga warehouse sa vin bay pwob nn mesye Thomas!",                                                                    publishedAt: getRefDate(1) },
  { id: 103, non: "Steeve P.",      stars: 4, text: "m swete aprè 4,90 lan pa gen lòt frè, bon bgy.",                                                                      publishedAt: getRefDate(5) },
  { id: 104, non: "Samuel H.",      stars: 5, text: "Ou konn sa wap f an mister Thomas, nou avèw 👍. Livrezon an yon ti jan long, men nap avanse brother.",               publishedAt: getRefDate(0, 45) },
  { id: 105, non: "Laika V.",       stars: 4, text: "Ebyen gen espwa pou store mwen an la 😂🤣.",                                                                           publishedAt: getRefDate(21) },
  { id: 106, non: "Tania S.",       stars: 2, text: "Nanpwen anak, asistans red red. Machandiz mw rive an plizye okazyon, men yo rive san manke anyen.",                   publishedAt: getRefDate(59) },
  { id: 107, non: "Ricardo J.",     stars: 1, text: "Okazyn chak mwa sèlman ki pwoblm pu mw, men pou pri a, sekirite; pa gen plenyen.",                                    publishedAt: getRefDate(2) }
];

function buildStars(avisId, currentStars, isInteractive) {
  var html = '<span class="stars-row">';
  for (var i = 1; i <= 5; i++) {
    var filled = i <= currentStars ? 'star' : 'star_border';
    var color  = i <= currentStars ? '#FFD700' : '#ccc';
    if (isInteractive) {
      html += '<i class="material-icons star-vote"'
            + ' style="font-size:18px; color:' + color + '; cursor:pointer;"'
            + ' onclick="voterAvis(' + avisId + ', ' + i + ')"'
            + ' onmouseover="hoverStars(' + avisId + ', ' + i + ')"'
            + ' onmouseout="resetStarHover(' + avisId + ')"'
            + ' data-val="' + i + '">' + filled + '</i>';
    } else {
      html += '<i class="material-icons" style="font-size:14px; color:' + color + ';">' + filled + '</i>';
    }
  }
  html += '</span>';
  return html;
}

window.voterAvis = function (avisId, nouvoStars) {
  var votes = JSON.parse(localStorage.getItem('avis_votes') || '{}');
  votes[avisId] = nouvoStars;
  localStorage.setItem('avis_votes', JSON.stringify(votes));
  aficheAvis();
};

window.hoverStars = function (avisId, hoverVal) {
  var card = document.getElementById('comment-' + avisId);
  if (!card) return;
  card.querySelectorAll('.star-vote').forEach(function (star) {
    var val = parseInt(star.getAttribute('data-val'));
    star.textContent = val <= hoverVal ? 'star' : 'star_border';
    star.style.color = val <= hoverVal ? '#FFD700' : '#ccc';
  });
};

window.resetStarHover = function (avisId) {
  var votes = JSON.parse(localStorage.getItem('avis_votes') || '{}');
  var found = simulationAvis.find(function (a) { return a.id === avisId; });
  var stars = votes[avisId] !== undefined ? votes[avisId] : (found ? found.stars : 0);
  var card  = document.getElementById('comment-' + avisId);
  if (!card) return;
  card.querySelectorAll('.star-vote').forEach(function (star) {
    var val = parseInt(star.getAttribute('data-val'));
    star.textContent = val <= stars ? 'star' : 'star_border';
    star.style.color = val <= stars ? '#FFD700' : '#ccc';
  });
};

function getInitials(name) {
  return name
    ? name.split(' ').map(function (p) { return p[0]; }).join('').substring(0, 2).toUpperCase()
    : '?';
}

function aficheAvis() {
  var container = document.getElementById('comments-container');
  if (!container) return;

  var localAvis = JSON.parse(localStorage.getItem('user_simulated_avis') || '[]');
  var votes     = JSON.parse(localStorage.getItem('avis_votes') || '{}');
  var toutAvis  = localAvis.concat(simulationAvis);

  container.innerHTML = toutAvis.map(function (a) {
    var isUser       = localAvis.some(function (la) { return la.id === a.id; });
    var starsAffiche = votes[a.id] !== undefined ? votes[a.id] : (a.stars || 0);
    var dateAffiche  = formatDateRelative(a.publishedAt || a.id);
    var starsHTML    = buildStars(a.id, starsAffiche, true);
    var initials     = getInitials(a.non);

    return '<div class="comment-card" id="comment-' + a.id + '">'
      + '<div class="comment-author">'
      + '<div class="comment-avatar">' + initials + '</div>'
      + '<span class="comment-name">' + a.non + '</span>'
      + starsHTML
      + '</div>'
      + '<p class="comment-text" id="text-' + a.id + '">' + a.text + '</p>'
      + '<div class="comment-footer">'
      + '<span class="comment-date">' + dateAffiche + '</span>'
      + (isUser
          ? '<div class="user-actions">'
            + '<button onclick="prepareEdit(' + a.id + ')">Modifye</button>'
            + '<button onclick="effacerAvis(' + a.id + ')" style="color:red">Efase</button>'
            + '</div>'
          : '')
      + '</div>'
      + '</div>';
  }).join('');
}

window.ajouterAvis = function () {
  var textInput = document.getElementById('user-comment');
  if (!textInput) return;
  var text   = textInput.value.trim();
  var editId = textInput.getAttribute('data-edit-id');
  if (!text) return;

  var profile   = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
  var userName  = profile.nom || 'Oumenm';
  var localAvis = JSON.parse(localStorage.getItem('user_simulated_avis') || '[]');

  if (editId) {
    localAvis = localAvis.map(function (a) {
      return a.id == editId ? Object.assign({}, a, { text: text }) : a;
    });
    textInput.removeAttribute('data-edit-id');
  } else {
    localAvis.unshift({ id: Date.now(), non: userName, text: text, stars: 0, publishedAt: Date.now() });
  }

  localStorage.setItem('user_simulated_avis', JSON.stringify(localAvis));
  textInput.value = '';
  aficheAvis();
};

window.prepareEdit = function (id) {
  var localAvis = JSON.parse(localStorage.getItem('user_simulated_avis') || '[]');
  var avis      = localAvis.find(function (a) { return a.id == id; });
  if (!avis) return;
  var input = document.getElementById('user-comment');
  if (!input) return;
  input.value = avis.text;
  input.setAttribute('data-edit-id', id);
  input.focus();
};

window.effacerAvis = function (id) {
  if (!confirm('Èske ou vle efase kòmantè sa a?')) return;
  var localAvis = JSON.parse(localStorage.getItem('user_simulated_avis') || '[]');
  localAvis     = localAvis.filter(function (a) { return a.id != id; });
  localStorage.setItem('user_simulated_avis', JSON.stringify(localAvis));
  aficheAvis();
};

// ── INVENTÈ ─────────────────────────────────────────────────────
var INV_KEY = 'lcd_inventaire';

function invLoad() { return JSON.parse(localStorage.getItem(INV_KEY) || '[]'); }
function invSave(data) { localStorage.setItem(INV_KEY, JSON.stringify(data)); }

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatInvDate(dateStr) {
  if (!dateStr) return '—';
  var parts = dateStr.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function invRender() {
  var tbody = document.getElementById('inv-tbody');
  if (!tbody) return;
  var items = invLoad();
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px;">Pa gen atik pou kounye a</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(function (item, i) {
    return '<tr>'
      + '<td class="inv-td-num">' + (i + 1) + '</td>'
      + '<td class="inv-td-nom">' + escHtml(item.desc) + '</td>'
      + '<td class="inv-td-desc">' + escHtml(item.tracking || '—') + '</td>'
      + '<td class="inv-td-date">' + (item.date ? formatInvDate(item.date) : '—') + '</td>'
      + '<td class="inv-td-del inv-hide-cap" style="display:flex;gap:6px;align-items:center;">'
      + '<button class="inv-edit-btn" onclick="invEdit(' + item.id + ')" title="Modifye"><span class="material-icons" style="font-size:14px;">edit</span></button>'
      + '<button class="inv-del-btn" onclick="invDelete(' + item.id + ')" title="Efase"><span class="material-icons" style="font-size:14px;">delete</span></button>'
      + '</td>'
      + '</tr>';
  }).join('');
}

window.openInv  = function () { window.goTo('inventaire.html'); };

window.closeInv = function () {
  var invOverlay = document.getElementById('inv-overlay');
  var invPanel   = document.getElementById('inv-panel');
  if (invOverlay) invOverlay.classList.remove('open');
  if (invPanel)   invPanel.classList.remove('open');
  document.body.style.overflow = '';
};

window.invAdd = function () {
  var nomEl   = document.getElementById('inv-nom');
  var trackEl = document.getElementById('inv-tracking');
  var dateEl  = document.getElementById('inv-date');
  var addBtn  = document.querySelector('.inv-add-btn');
  var editId  = addBtn ? parseInt(addBtn.getAttribute('data-edit-id') || '0') : 0;

  if (!nomEl) return;
  var desc     = nomEl.value.trim();
  var tracking = trackEl ? trackEl.value.trim() : '';
  var date     = dateEl  ? dateEl.value : '';

  if (!desc) {
    nomEl.classList.add('error');
    setTimeout(function () { nomEl.classList.remove('error'); }, 1200);
    return;
  }

  var items = invLoad();
  if (editId) {
    items = items.map(function (it) { return it.id === editId ? Object.assign({}, it, { desc: desc, tracking: tracking, date: date }) : it; });
    if (addBtn) { addBtn.innerHTML = '<span class="material-icons" style="font-size:18px;">add_circle</span> Ajoute'; addBtn.setAttribute('data-edit-id', ''); }
  } else {
    items.push({ id: Date.now(), desc: desc, tracking: tracking, date: date });
  }
  invSave(items);
  nomEl.value = '';
  if (trackEl) trackEl.value = '';
  if (dateEl)  dateEl.value  = '';
  invRender();
};

window.invEdit = function (id) {
  var items   = invLoad();
  var item    = items.find(function (it) { return it.id === id; });
  if (!item) return;
  var nomEl   = document.getElementById('inv-nom');
  var trackEl = document.getElementById('inv-tracking');
  var dateEl  = document.getElementById('inv-date');
  if (nomEl)   nomEl.value   = item.desc     || '';
  if (trackEl) trackEl.value = item.tracking || '';
  if (dateEl)  dateEl.value  = item.date     || '';
  var addBtn = document.querySelector('.inv-add-btn');
  if (addBtn) { addBtn.innerHTML = '<span class="material-icons" style="font-size:18px;">save</span> Sove'; addBtn.setAttribute('data-edit-id', String(id)); }
  if (nomEl) nomEl.focus();
};

window.invDelete = function (id) {
  if (!confirm('Efase atik sa a?')) return;
  invSave(invLoad().filter(function (it) { return it.id !== id; }));
  invRender();
};

window.invClear = function () {
  if (!confirm('Efase TOUT atik yo nan enventè a?')) return;
  invSave([]);
  invRender();
};

window.invCapture = function () {
  var zone = document.getElementById('inv-cap-zone');
  if (!zone) return;
  document.querySelectorAll('.inv-hide-cap').forEach(function (el) { el.style.display = 'none'; });
  if (typeof html2canvas === 'undefined') {
    alert('Bibliyotèk telechajman an pa chaje.');
    document.querySelectorAll('.inv-hide-cap').forEach(function (el) { el.style.display = ''; });
    return;
  }
  html2canvas(zone, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
    .then(function (canvas) {
      document.querySelectorAll('.inv-hide-cap').forEach(function (el) { el.style.display = ''; });
      var link = document.createElement('a');
      link.download = 'inventaire-LCD-' + new Date().toISOString().slice(0, 10) + '.jpg';
      link.href     = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    })
    .catch(function (err) {
      document.querySelectorAll('.inv-hide-cap').forEach(function (el) { el.style.display = ''; });
      console.error('Erreur export:', err);
      alert('Telechajman echwe. Eseye ankò.');
    });
};

// ── OFFRE PREMYE KÒMAND (15 jou) ────────────────────────────────
function initPromoFirstOrder() {
  var PROMO_KEY    = 'lcd_promo_start';
  var PROMO_DAYS   = 15;
  var PROMO_MS     = PROMO_DAYS * 24 * 60 * 60 * 1000;

  var promoEl      = document.getElementById('promo-first-order');
  var countdownEl  = document.getElementById('promo-countdown');
  if (!promoEl || !countdownEl) return;

  // Initialise seulement si utilisateur enregistré
  var isRegistered = localStorage.getItem('lcd_user_registered') === 'true';
  if (!isRegistered) return;

  var startStr = localStorage.getItem(PROMO_KEY);
  if (!startStr) {
    // Première fois : enregistre la date de départ
    localStorage.setItem(PROMO_KEY, String(Date.now()));
    startStr = localStorage.getItem(PROMO_KEY);
  }

  var startTime = parseInt(startStr, 10);
  var endTime   = startTime + PROMO_MS;

  function updateCountdown() {
    var remaining = endTime - Date.now();
    if (remaining <= 0) {
      // Offre expirée : cacher définitivement
      promoEl.style.display = 'none';
      return;
    }
    promoEl.style.display = 'block';
    var days    = Math.floor(remaining / 86400000);
    var hours   = Math.floor((remaining % 86400000) / 3600000);
    var minutes = Math.floor((remaining % 3600000) / 60000);
    var seconds = Math.floor((remaining % 60000) / 1000);
    countdownEl.textContent = days + 'j ' + hours + 'h ' + minutes + 'm ' + seconds + 's';
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ── PHOTO PROFIL DANS DRAWER ─────────────────────────────────────
window.initPromoFirstOrder = initPromoFirstOrder;
function syncDrawerAvatar() {
  var drwAvatar = document.getElementById('drw-avatar-img');
  if (!drwAvatar) return;
  var avatar = localStorage.getItem('lcd_user_avatar');
  if (avatar) {
    drwAvatar.src = avatar;
    drwAvatar.style.borderRadius = '50%';
    drwAvatar.style.objectFit   = 'cover';
    drwAvatar.style.padding     = '0';
  } else {
    drwAvatar.src                = 'lescayesdropshipping.png';
    drwAvatar.style.borderRadius = '13px';
    drwAvatar.style.objectFit   = 'contain';
    drwAvatar.style.padding     = '4px';
  }
}

// ── INICIALIZASYON JENERAL ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // 1. Badge NEW tranzaksyon
  var newBadge = document.getElementById('new-badge');
  if (newBadge && localStorage.getItem('transaction_visited') === 'true') {
    newBadge.style.display = 'none';
  }

  // 2. Systèm Like
  initLikeSystem();

  // 3. Top bar fixe
  refreshTopBar();

  // 4. Badges notifikasyon
  updateNotifBadges();

  // 5. Avis kliyan
  aficheAvis();

  // 6. Carousel
  initBannerCarousel();

  // 7. Modal notifikasyon
  var dejaAksepte    = localStorage.getItem('notif_accepted');
  var pèmisyonSistèm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
  if (pèmisyonSistèm === 'granted' || dejaAksepte === 'true') {
    femenModalNotif();
  } else {
    var modal = document.getElementById('notif-modal');
    if (modal) modal.style.display = 'flex';
  }

  // 8. Sync drawer
  syncDrw();
  syncDrawerAvatar();

  // 8b. Promo premye kòmand
  initPromoFirstOrder();

  // 9. Badge cloche
  var msgs   = JSON.parse(localStorage.getItem(MESSAGE_KEY) || '[]');
  var unread = msgs.filter(function (m) { return !m.read; }).length;
  var dot    = document.getElementById('tb-dot');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  // 10. Kiyès drawer — si profil existant
  var profile = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
  if (profile.nom) {
    window.initKiyesDrawer(profile.nom);
  }

  // 10b. Bouton CTA "Kreye yon kont" — afficher seulement si pas de profil local
  var ctaKont = document.getElementById('cta-kreye-kont');
  if (ctaKont) {
    var isReg     = localStorage.getItem('lcd_user_registered') === 'true';
    var profLocal = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
    var hasProf   = !!(profLocal.nom && profLocal.email);
    // Le module Firebase va gérer l'état final — ici on initialise l'état par défaut
    if (!isReg && !hasProf) {
      ctaKont.style.display = 'block';
    } else {
      ctaKont.style.display = 'none';
    }
  }

  // 11. Unlike — rétablir état
  var isUnliked  = localStorage.getItem('user_has_unliked') === 'true';
  var unlikeIcon = document.getElementById('unlike-icon');
  if (isUnliked && unlikeIcon) {
    unlikeIcon.textContent = 'thumb_down';
    unlikeIcon.style.color = '#e74c3c';
  }

  // 12. Service Worker notifications push
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'SAVE_NOTIF') {
        var KEY  = 'lcd_user_messages';
        var msgs = JSON.parse(localStorage.getItem(KEY) || '[]');
        msgs.unshift({ id: Date.now(), title: event.data.title, body: event.data.body, time: new Date().toLocaleString('ht-HT'), read: false });
        if (msgs.length > 10) msgs = msgs.slice(0, 10);
        localStorage.setItem(KEY, JSON.stringify(msgs));
        updateNotifBadges();
      }
    });
  }
});
