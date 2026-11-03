// ===============================================================
//  index.js — Les Cayes Dropshipping v2.1
//  Lojik JavaScript pou paj dakèy (index.html)
// ===============================================================

'use strict';

const MESSAGE_KEY    = 'lcd_user_messages';
const userStorageKey = 'user_profile_data';
let   baseLikes      = 766;

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

// ── CLICK-AWAY : fermer le drawer si clic en dehors ──
document.addEventListener('click', function (e) {
  var drawer = document.getElementById('app-drawer');
  if (!drawer || !drawer.classList.contains('open')) return;
  // Si le clic est à l'intérieur du drawer ou sur le bouton hamburger, ne rien faire
  var hamburger = document.getElementById('hamburger-btn');
  if (drawer.contains(e.target)) return;
  if (hamburger && hamburger.contains(e.target)) return;
  window.closeDrawer();
}, true);

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

// ── KIYÈS DRAWER — supprimé (menu retiré) ──
// initKiyesDrawer non utilisé

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
  if (totalItems < 2) return;
  var DELAI      = 8000; // 8 secondes entre chaque affiche

  // Copie de la 1re affiche placée à la fin : après la dernière affiche,
  // on avance vers cette copie puis on revient (sans saut visible) à la vraie 1re.
  var clone = items[0].cloneNode(true);
  clone.classList.remove('active');
  clone.setAttribute('aria-hidden', 'true');
  container.appendChild(clone);

  function getStep() {
    return container.children[1].offsetLeft - container.children[0].offsetLeft;
  }
  function currentIndex() {
    return Math.round(container.scrollLeft / getStep());
  }

  var timer;
  function planifier() {
    clearTimeout(timer);
    timer = setTimeout(avancer, DELAI);
  }
  function avancer() {
    var next = Math.min(currentIndex() + 1, totalItems);
    container.scrollTo({ left: getStep() * next, behavior: 'smooth' });
    planifier();
  }

  // Quand on arrive sur la copie (fin de boucle), retour instantané à la 1re affiche
  var scrollEnd;
  container.addEventListener('scroll', function () {
    clearTimeout(scrollEnd);
    scrollEnd = setTimeout(function () {
      if (currentIndex() >= totalItems) {
        container.style.scrollSnapType = 'none';
        container.scrollLeft = 0;
        requestAnimationFrame(function () { container.style.scrollSnapType = ''; });
      }
    }, 150);
  }, { passive: true });

  // Si la personne swipe elle-même, on repart de zéro pour 8 s
  container.addEventListener('touchstart', function () { clearTimeout(timer); }, { passive: true });
  container.addEventListener('touchend', planifier, { passive: true });

  planifier();
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

// ── NOTIFIKASYON DEMANN AVIS (koli disponib) ─────────────────────
var AVIS_PROMPT_KEY = 'lcd_avis_prompt_ack';

function dateKey(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function initAvisPromptBanner() {
  var banner = document.getElementById('avis-prompt-banner');
  if (!banner) return;

  var dates = calcLCDDates();
  var today = dates.today;

  // Fenèt aktif : apre disponibilite, jiska 5 jou apre (komante)
  var inWindow = today > dates.disponib && today <= dates.komante;
  if (!inWindow) { banner.style.display = 'none'; return; }

  var ackKey = AVIS_PROMPT_KEY + '_' + dateKey(dates.disponib);
  var acked  = localStorage.getItem(ackKey) === 'true';
  if (acked) { banner.style.display = 'none'; return; }

  banner.style.display = 'flex';
}

window.confirmAvisPrompt = function () {
  var dates  = calcLCDDates();
  var ackKey = AVIS_PROMPT_KEY + '_' + dateKey(dates.disponib);
  localStorage.setItem(ackKey, 'true');

  var banner = document.getElementById('avis-prompt-banner');
  if (banner) banner.style.display = 'none';

  var textarea = document.getElementById('user-comment');
  if (textarea) {
    textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { textarea.focus(); }, 400);
  }
};

window.dismissAvisPromptOnly = function () {
  // Fèmen sèlman pou sesyon sa — pa anrejistre akò, va reparèt pwochen vizit
  var banner = document.getElementById('avis-prompt-banner');
  if (banner) banner.style.display = 'none';
};


window.focusAvisInput = function (e) {
  e.preventDefault();
  var textarea = document.getElementById('user-comment');
  if (!textarea) return;
  // Scroll vers le textarea avec un léger offset
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(function () { textarea.focus(); }, 400);
};

// ── SISTÈM AVIS KLIYAN ───────────────────────────────────────────
function getRefDate(daysAgo, minutesAgo) {
  minutesAgo = minutesAgo || 0;
  var d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.getTime();
}

function formatDatePublished(timestamp) {
  var d  = new Date(timestamp);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yy = String(d.getFullYear()).slice(-2);
  return dd + '/' + mm + '/' + yy;
}

function fixedDate(y, m, d) {
  return new Date(y, m - 1, d).getTime();
}

// Date de fin du badge "NOUVO" + date "resàmman" : 2 mois après la publication (3 nov. 2026 -> 3 jan. 2027)
var NOUVO_JISKA = new Date(2027, 0, 3).getTime();

var simulationAvis = [
  { id: 110, non: "Wilner C.",  stars: 4, text: "Si nou pa pran koli USA ankò, dim non souple ! Sa fè 2 fwa m rate okazyon, se container magazen nou privilejye - koli pam yo menm pa vini!", publishedAt: fixedDate(2026, 11, 3), nouvoJiska: NOUVO_JISKA },
  { id: 109, non: "Nadège L.",  stars: 3, text: "Okazyon an pa chak mwa ankò non sa k' pase mr Thomas !", publishedAt: fixedDate(2026, 11, 2), nouvoJiska: NOUVO_JISKA },
  { id: 108, non: "Frantz M.",  stars: 5, text: "Sèl pwoblèm mw, se paske m wè nou sote okazyon kounya nou te konn disponib chak mwa. Men aprèsa, tout bagay OK cargo m yo pa janm manke anyen.", publishedAt: fixedDate(2026, 11, 1), nouvoJiska: NOUVO_JISKA },
  { id: 101, non: "Valpare B.",     stars: 5, text: "impotan pou biznis mw, psk ak ansyen transpo an m patka rantre kob m envesti yo.",                                    publishedAt: fixedDate(2025, 11, 14) },
  { id: 102, non: "Claire Suze D.", stars: 5, text: "Pinga warehouse sa vin bay pwob nn mesye Thomas!",                                                                    publishedAt: fixedDate(2025, 11, 29) },
  { id: 103, non: "Steeve P.",      stars: 4, text: "m swete aprè 4,90 lan pa gen lòt frè, bon bgy.",                                                                      publishedAt: fixedDate(2025, 12, 10) },
  { id: 104, non: "Samuel H.",      stars: 5, text: "Ou konn sa wap f an mister Thomas, nou avèw 👍. Livrezon an yon ti jan long, men nap avanse brother.",               publishedAt: fixedDate(2026, 1, 5) },
  { id: 105, non: "Laika V.",       stars: 4, text: "Ebyen gen espwa pou store mwen an la 😂🤣.",                                                                           publishedAt: fixedDate(2026, 1, 18) },
  { id: 106, non: "Tania S.",       stars: 2, text: "Nanpwen anak, asistans red red. Machandiz mw rive an plizye okazyon, men yo rive san manke anyen.",                   publishedAt: fixedDate(2026, 2, 2) },
  { id: 107, non: "Ricardo J.",     stars: 1, text: "Okazyn chak mwa sèlman ki pwoblm pu mw, men pou pri a, sekirite; pa gen plenyen.",                                    publishedAt: fixedDate(2026, 2, 11) }
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

  if (!toutAvis.length) {
    container.innerHTML = '';
    return;
  }

  // Construire le HTML d'une carte. `suffix` garantit un id DOM unique
  // pour la copie dupliquée (utilisée pour la boucle du marquee) ;
  // seule la copie originale (`interactive`) reste cliquable.
  function buildCard(a, suffix, interactive) {
    var isUser       = interactive && localAvis.some(function (la) { return la.id === a.id; });
    var starsAffiche = votes[a.id] !== undefined ? votes[a.id] : (a.stars || 0);
    var isNouvo      = !!a.nouvoJiska && Date.now() < a.nouvoJiska;
    var dateAffiche  = isNouvo ? 'resàmman' : formatDatePublished(a.publishedAt || a.id);
    var starsHTML    = buildStars(a.id, starsAffiche, interactive);
    var initials     = getInitials(a.non);
    var domId        = 'comment-' + a.id + (suffix ? '-' + suffix : '');

    return '<div class="comment-card" id="' + domId + '"' + (suffix ? ' aria-hidden="true"' : '') + '>'
      + '<div class="comment-author">'
      + '<div class="comment-avatar">' + initials + '</div>'
      + '<span class="comment-name">' + a.non + '</span>'
      + starsHTML
      + '</div>'
      + '<p class="comment-text">' + a.text + '</p>'
      + '<div class="comment-footer">'
      + '<span class="comment-date">' + (isNouvo ? '<span class="comment-nouvo">NOUVO</span>' : '') + dateAffiche + '</span>'
      + (isUser
          ? '<div class="user-actions">'
            + '<button onclick="prepareEdit(' + a.id + ')">Modifye</button>'
            + '<button onclick="effacerAvis(' + a.id + ')" style="color:red">Efase</button>'
            + '</div>'
          : '')
      + '</div>'
      + '</div>';
  }

  // Copie originale (interactive) + copie dupliquée (pour boucle sans coupure)
  var originalHTML  = toutAvis.map(function (a) { return buildCard(a, '', true); }).join('');
  var duplicateHTML = toutAvis.map(function (a) { return buildCard(a, 'dup', false); }).join('');

  container.innerHTML = '<div class="avis-marquee-track" id="avis-marquee-track">'
    + originalHTML + duplicateHTML
    + '</div>';

  initAvisMarquee(toutAvis.length);
}

// ── MARQUEE AVIS — défilement horizontal continu vers la gauche ──
// La piste contient les avis en double (set A + set B identique) et
// glisse de translateX(0) à translateX(-50%) : quand le set A sort
// entièrement de vue, le set B est visuellement à sa place de départ,
// ce qui crée une boucle infinie parfaitement fluide, sans saut ni
// interruption. La durée est calée sur ~7s par avis.
var AVIS_SECONDES_PAR_AVIS = 7;

function initAvisMarquee(nbAvis) {
  var track = document.getElementById('avis-marquee-track');
  if (!track) return;

  if (!nbAvis || nbAvis < 2) {
    // Un seul avis : rien à faire défiler
    track.style.animation = 'none';
    return;
  }

  var duree = nbAvis * AVIS_SECONDES_PAR_AVIS;
  track.style.animationDuration = duree + 's';
}

// ── FLIP CARD OKAZYON ─────────────────────────────────────────────
window.flipOkazyon = function () {
  var flipper = document.getElementById('okazyon-flipper');
  if (!flipper) return;
  flipper.classList.toggle('flipped');
};

// ── CALCUL AUTOMATIQUE DATES LCD TRACKING ────────────────────────
function getLastSaturdayOfMonth(year, month) {
  // month: 0-indexed
  var lastDay = new Date(year, month + 1, 0);
  var dayOfWeek = lastDay.getDay(); // 0=dim, 6=sam
  var diff = dayOfWeek >= 6 ? 0 : dayOfWeek + 1;
  var lastSat = new Date(year, month + 1, 0 - diff);
  return lastSat;
}

var KT_MOIS = ['Janvye', 'Fevriye', 'Mas', 'Avril', 'Me', 'Jen', 'Jiyè', 'Ut', 'Septanm', 'Oktòb', 'Novanm', 'Desanm'];
var KT_JOU  = ['Dimanch', 'Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi'];

function formatDateKT(d) {
  return KT_JOU[d.getDay()] + ' ' + d.getDate() + ' ' + KT_MOIS[d.getMonth()];
}

function calcLCDDates() {
  var today = new Date(); today.setHours(0,0,0,0);

  // ── EKSEPSYON PONKTYÈL ────────────────────────────────────────
  // Chajman jiyè 2026 te dwe fèt 11 jiyè selon règ jeneral la, men li
  // deplase pou 18 jiyè (yon semèn pita). Sa deplase otomatikman
  // Vwayaj (depa) pou 20 jiyè, ak Disponibilite pou 2 out — swiv menm
  // fòmil ki anba a (depa = ramase+2, disponib = premye dimanch >= depa+10).
  // Retire antre sa a nan objè a apre out 2026 si li pa nesesè ankò.
  var RAMASE_EXCEPTIONS = {
    '2026-6': new Date(2026, 6, 18) // kle = 'ane-mwa' (mwa 0-indexed) : jiyè 2026
  };

  function computeForMonth(y, m) {
    var exceptionKey = y + '-' + m;

    // Chargement : premier samedi >= 11 du mois (entre le 11 et le 17)
    // sof si yon eksepsyon defini pi wo a ranplase l.
    var ramase = RAMASE_EXCEPTIONS[exceptionKey]
      ? new Date(RAMASE_EXCEPTIONS[exceptionKey])
      : new Date(y, m, 11);
    if (!RAMASE_EXCEPTIONS[exceptionKey]) {
      while (ramase.getDay() !== 6) ramase.setDate(ramase.getDate() + 1);
    }

    // Départ : lundi suivant le chargement
    var depa = new Date(ramase);
    depa.setDate(depa.getDate() + 2);

    // Date limite commande : veille du chargement
    var limiteCmd = new Date(ramase);
    limiteCmd.setDate(limiteCmd.getDate() - 1);

    // Disponibilité : premier dimanche >= depa + 10, dans le même mois
    // (sof pou yon eksepsyon kote disponibilite a gen dwa tonbe nan mwa
    // apre a — se ka jiyè 2026 la, kote disponib se 2 out).
    var minDisp = new Date(depa);
    minDisp.setDate(minDisp.getDate() + 10);
    var disponib = new Date(minDisp);
    while (disponib.getDay() !== 0) disponib.setDate(disponib.getDate() + 1);
    if (!RAMASE_EXCEPTIONS[exceptionKey] && disponib.getMonth() !== m) {
      disponib = new Date(y, m + 1, 0);
      while (disponib.getDay() !== 0) disponib.setDate(disponib.getDate() - 1);
    }

    // Kòmantè : 5 jou apre disponibilite — fenèt pou kite avis
    var komante = new Date(disponib);
    komante.setDate(komante.getDate() + 5);

    return { ramase: ramase, depa: depa, disponib: disponib, komante: komante, limiteCmd: limiteCmd };
  }

  var y = today.getFullYear();
  var m = today.getMonth();
  var dates = computeForMonth(y, m);

  if (today > dates.komante) {
    m = m + 1;
    if (m > 11) { m = 0; y++; }
    dates = computeForMonth(y, m);
  }

  dates.today = today;
  return dates;
}

function initLCDTrackingBloc() {
  var dates = calcLCDDates();
  var today = dates.today;

  // Dates affichées
  var el0 = document.getElementById('ltb-date-0');
  var el1 = document.getElementById('ltb-date-1');
  var el2 = document.getElementById('ltb-date-2');
  var el3 = document.getElementById('ltb-date-3');
  // Étape 0 : date limite commande (veille du chargement)
  var moisDebut = KT_MOIS[dates.ramase.getMonth()];
  if (el0) el0.textContent = '1 ' + moisDebut + ' — ' + formatDateKT(dates.limiteCmd);
  if (el1) el1.textContent = formatDateKT(dates.ramase);
  if (el2) el2.textContent = formatDateKT(dates.depa);
  if (el3) el3.textContent = formatDateKT(dates.disponib);
  // Étape 4 "Kòmantè" — pas de date affichée

  // Mesaj anons : "Plase kòmand ou yo... avan le [X mwa]" — dat anbakman (ramase)
  var deadlineEl = document.getElementById('ltb-deadline-day');
  if (deadlineEl) {
    deadlineEl.textContent = dates.ramase.getDate() + ' ' + KT_MOIS[dates.ramase.getMonth()];
  }

  // Statut dynamique
  var statutEl  = document.getElementById('ltb-statut-text');
  var statutDot = document.getElementById('ltb-statut-dot');
  var dotWrap   = document.getElementById('ltb-statut-dot-wrap');
  var statut, dotClass, isPulse = false;

  // Dates intermédiaires calculées
  var depa5 = new Date(dates.depa); depa5.setDate(depa5.getDate() + 5);   // depa+5j = fin vol / début dedwanman
  var depa9 = new Date(dates.depa); depa9.setDate(depa9.getDate() + 9);   // depa+9j = fin dedwanman / kamyon pati

  if (today < dates.ramase) {
    statut   = 'Nou ouvri pou resevwa koli';
    dotClass = 'ltb-dot-live';
    isPulse  = true;
  } else if (today.getTime() === dates.ramase.getTime()) {
    statut   = 'Dènye jou nap resevwa koli';
    dotClass = 'ltb-dot-live';
    isPulse  = true;
  } else if (today <= dates.depa) {
    statut   = 'Preparasyon pou vwayaj';
    dotClass = 'ltb-dot-live';
    isPulse  = true;
  } else if (today <= depa5) {
    // Vol en cours — jusqu'à 5 jours après départ
    statut   = 'Nou nan lè a ✈';
    dotClass = 'ltb-dot-live';
    isPulse  = true;
  } else if (today <= depa9) {
    // Dédouanement — 4 jours (depa+5 → depa+9)
    statut   = 'Pwosesis dedwànman 🛃';
    dotClass = 'ltb-dot-blue';
    isPulse  = true;
  } else if (today < dates.disponib) {
    // Camion en route vers Les Cayes
    statut   = 'Kamyon nou nan wout pou aux Cayes 🚛';
    dotClass = 'ltb-dot-blue';
    isPulse  = true;
  } else if (today <= dates.komante) {
    // Disponible — fenêt avis 5 jours
    statut   = 'Koli disponib aux Cayes';
    dotClass = 'ltb-dot-kaki';
    isPulse  = false;
  } else {
    // Fenêt fermée → cycle suivant géré par calcLCDDates
    statut   = 'Nou ouvri pou resevwa koli';
    dotClass = 'ltb-dot-live';
    isPulse  = true;
  }

  if (statutEl)  statutEl.textContent = statut;
  if (statutDot) statutDot.className  = 'ltb-statut-dot ' + dotClass;
  if (dotWrap)   dotWrap.classList.toggle('ltb-dot-pulse', isPulse);

  // Colorier les étapes selon progression
  // Règle : étapes passées = vert (done), première future = vert vide (active), reste = gris
  var steps     = [0, 1, 2, 3];
  var stepDates = [dates.limiteCmd, dates.ramase, dates.depa, dates.disponib];

  var activeStepFound = false;
  var step3Done = today >= dates.disponib;
  var doneCount = 0; // combien d'étapes sont "done" parmi les 5

  steps.forEach(function (i) {
    var step = document.getElementById('ltb-step-' + i);
    if (!step) return;
    step.classList.remove('ltb-step-done', 'ltb-step-active');

    if (today >= stepDates[i]) {
      step.classList.add('ltb-step-done');
      doneCount++;
    } else if (!activeStepFound) {
      step.classList.add('ltb-step-active');
      activeStepFound = true;
    }
  });

  // Étape 4 "Kòmantè" — vert dès que étape 3 est verte
  var step4 = document.getElementById('ltb-step-4');
  if (step4) {
    step4.classList.remove('ltb-step-done', 'ltb-step-active');
    if (step3Done) { step4.classList.add('ltb-step-done'); doneCount++; }
    else if (!activeStepFound) { step4.classList.add('ltb-step-active'); }
  }

  // Anciens connecteurs — ignorés (display:none en CSS), garder pour compatibilité
  for (var c = 0; c <= 3; c++) {
    var conn = document.getElementById('ltb-conn-' + c);
    if (conn) { conn.classList.remove('ltb-conn-done'); }
  }

  // Calculer la largeur de la barre de progression verte
  // La barre va de l'étape 0 (left 10%) jusqu'à la dernière étape done
  // 5 étapes réparties à : 10%, 32.5%, 55%, 77.5%, 90%
  // Chaque segment = ~22.5% de la barre totale (80% de largeur totale / 4 segments)
  var segmentWidth = 20; // % entre chaque étape sur 80% de rail
  var fillPct = 0;
  if (doneCount > 0) {
    // La barre s'étend jusqu'au centre de la dernière étape done
    // Étape 0 = position 0%, étape 4 = position 100% du rail
    fillPct = Math.min(100, ((doneCount - 1) / 4) * 100);
  }
  var fillEl = document.getElementById('ltb-progress-fill');
  if (fillEl) {
    // Rail couvre de left:10% à right:10% = 80% de la largeur totale
    // Convertir fillPct du rail en % de la largeur totale du conteneur
    var fillWidth = (fillPct / 100) * 80; // en % du conteneur
    fillEl.style.width = fillWidth + '%';
  }
}

// Ancienne fonction conservée pour compatibilité
function initPulsingDots() {
  // Remplacée par initLCDTrackingBloc
}
window.initPulsingDots = initPulsingDots;

// ── GALERIE LIVREZON ─────────────────────────────────────────────
// Calcul automatique des données du mois précédent (même logique que calcLCDDates)
function calcLCDHistPrevMonth() {
  var today = new Date();
  var y = today.getFullYear();
  var m = today.getMonth() - 1;
  if (m < 0) { m = 11; y--; }

  var ramase = new Date(y, m, 11);
  while (ramase.getDay() !== 6) ramase.setDate(ramase.getDate() + 1);

  var depa = new Date(ramase);
  depa.setDate(depa.getDate() + 2);

  var minDisp = new Date(depa);
  minDisp.setDate(minDisp.getDate() + 10);
  var disponib = new Date(minDisp);
  while (disponib.getDay() !== 0) disponib.setDate(disponib.getDate() + 1);
  if (disponib.getMonth() !== m) {
    disponib = new Date(y, m + 1, 0);
    while (disponib.getDay() !== 0) disponib.setDate(disponib.getDate() - 1);
  }

  var diffJou = Math.round((disponib - depa) / (1000 * 60 * 60 * 24));

  return {
    mois     : KT_MOIS[m],
    depa     : depa.getDate() + ' ' + KT_MOIS[m] + ' ' + y,
    disponib : disponib.getDate() + ' ' + KT_MOIS[m] + ' ' + y,
    jou      : diffJou
  };
}

window.ouvrirGalerie = function () {
  var modal = document.getElementById('galerie-modal');
  var grid  = document.getElementById('galerie-grid');
  if (!modal || !grid) return;

  // ── Titre et recap dynamiques : mois précédent ──
  var hist    = calcLCDHistPrevMonth();
  var titreEl = document.getElementById('galerie-titre');
  if (titreEl) titreEl.textContent = '📦 Prèv Livrezon mwa ' + hist.mois;

  // Phrase d'annonce automatique
  var annonceDates  = calcLCDDates();
  var annonceLimite = annonceDates.limiteCmd;
  var annonceJour   = annonceLimite.getDate();
  var annonceMois   = KT_MOIS[annonceLimite.getMonth()];
  var annonceEl     = document.getElementById('gal-annonce');
  if (annonceEl) {
    annonceEl.textContent = 'Plase kòmand ou yo pou yo rive nan adrès nou avan le "' + annonceJour + ' ' + annonceMois + '" nan mwa a pou asire w koli w pati nan pwochen vwayaj la';
  }

  // Injecter recap okazyon pasé
  var elDepa = document.getElementById('gal-hist-depa');
  var elDisp = document.getElementById('gal-hist-disponib');
  var elJou  = document.getElementById('gal-hist-jou');
  if (elDepa) elDepa.textContent = hist.depa;
  if (elDisp) elDisp.textContent = hist.disponib;
  if (elJou)  elJou.textContent  = hist.jou + ' jou ✅';

  // Générer les 4 vignettes
  grid.innerHTML = '';
  for (var i = 1; i <= 4; i++) {
    var src = 'okazyon' + i + '.jpg';
    var img = document.createElement('img');
    img.src = src;
    img.alt = 'Livrezon ' + i;
    img.setAttribute('data-src', src);
    img.addEventListener('click', function () {
      ouvrirLightbox(this.getAttribute('data-src'));
    });
    grid.appendChild(img);
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.fermerGalerie = function (e) {
  var modal = document.getElementById('galerie-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

function ouvrirLightbox(src) {
  var lb    = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightbox-img');
  if (!lb || !lbImg) return;
  lbImg.src = src;
  lb.style.display = 'flex';
}

window.fermerLightbox = function () {
  var lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
};

window.ajouterAvis = function () {
  var textInput = document.getElementById('user-comment');
  if (!textInput) return;
  var text   = textInput.value.trim();
  var editId = textInput.getAttribute('data-edit-id');
  if (!text) return;

  var profile   = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
  var profNom   = (profile.nom || '').trim();
  var userName  = profNom || 'Itilizatè enkoni';
  var localAvis = JSON.parse(localStorage.getItem('user_simulated_avis') || '[]');
  var isNewAvis = !editId;

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

  if (isNewAvis) sendAvisNotification(userName, profile.email, text);
};

// ── Notifikasyon Web3Forms lè yon kliyan kite yon avis ───────────
function sendAvisNotification(userName, userEmail, avisText) {
  var createdRaw = localStorage.getItem('lcd_account_created');
  var createdStr = 'Pa disponib';
  if (createdRaw) {
    try {
      var cd = new Date(createdRaw);
      createdStr = cd.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                 + ' à ' + cd.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { /* ignore */ }
  }

  var now     = new Date();
  var dateStr = now.toLocaleDateString('fr-HT', { day: '2-digit', month: '2-digit', year: 'numeric' })
              + ' à ' + now.toLocaleTimeString('fr-HT', { hour: '2-digit', minute: '2-digit' });

  var payload = {
    access_key: 'a2d5b024-731b-4a8c-a5d4-d46a64e4f60a',
    subject:    'Nouvo avis kliyan : ' + userName,
    from_name:  userName,
    replyto:    userEmail || 'noreply@lescayesdropshipping.com',
    message:    'Yon kliyan kite yon avis sou aplikasyon an.\n\n'
              + '———————————————\n'
              + 'Non kliyan      : ' + userName + '\n'
              + 'Imel kliyan     : ' + (userEmail || 'pa disponib') + '\n'
              + 'Kont kreye le   : ' + createdStr + '\n'
              + 'Dat avis        : ' + dateStr + '\n'
              + '———————————————\n'
              + 'Avis :\n' + avisText
  };

  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function (err) {
    console.log('Web3Forms avis notification error:', err);
  });
}

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

  // 5b. Tracking bloc LCD dates (calcul automatique)
  initLCDTrackingBloc();

  // 5c. Notifikasyon demann avis (koli disponib)
  // initAvisPromptBanner(); // dezaktive — fenèt demann avis retire

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

  // 10. Kiyès drawer supprimé

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
