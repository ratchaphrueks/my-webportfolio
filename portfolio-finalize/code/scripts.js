/* ============================================================
  scripts.js
  Portfolio — Ratchaphruek Srisuphachoke
  All scripts extracted from index.html.
  Sections:
    1. Theme (init + toggle)
    2. SPA Router — showPage()  [+ GA4 & Hotjar virtual pageviews]
    3. Mobile Menu
    4. Navbar Scroll Shadow
    5. mainpage-hero  (slideshow + parallax)
    6. mainpage-projects  (accordion)
    7. mainpage-awards  (accordion)
    8. skillpage-process  (bg inject + stagger reveal)
    9. skillpage-softskills  (stagger delays)
    10. hobbypage-activities  (stagger delays)
    11. mainpage-extracurricular  (stagger + tooltip system)
    12. Scroll Reveal  (central IntersectionObserver)
============================================================ */

/* ============================================================
  1. THEME
  Reads localStorage key "portfolio-theme". Defaults to light.
  toggleTheme() sets data-theme on <html> — all CSS vars update.
============================================================ */
(function initTheme() {
  const saved = localStorage.getItem('portfolio-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('portfolio-theme', next);
}

/* ============================================================
  2. SPA ROUTER — showPage(pageId)
  Fades out the current page (200 ms), fades in the target
  (350 ms), scrolls to top, syncs nav active states, and
  re-runs initScrollReveal() on the newly shown page.

  ANALYTICS: Pushes a virtual pageview to Google Analytics
  (gtag) and a stateChange to Hotjar/Contentsquare every time
  the user navigates between pages. This is required because
  the SPA never triggers a real browser navigation event.
============================================================ */
let currentPage = 'main';

function showPage(pageId) {
  if (pageId === currentPage) return;
  const out = document.getElementById('page-' + currentPage);
  const inn = document.getElementById('page-' + pageId);
  if (!inn) return;

  if (out) {
    out.style.transition = 'opacity 0.2s ease';
    out.style.opacity = '0';
    setTimeout(() => { out.classList.remove('spa-active'); out.style.opacity = ''; out.style.transition = ''; }, 200);
  }

  setTimeout(() => {
    inn.classList.add('spa-active');
    inn.style.opacity = '0'; inn.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      inn.style.transition = 'opacity 0.35s ease';
      inn.style.opacity = '1';
      setTimeout(() => { inn.style.opacity = ''; inn.style.transition = ''; }, 380);
    }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    currentPage = pageId;

    // Sync nav active states
    document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-page') === pageId);
    });

    /* ── SPA Virtual Pageview Tracking ──────────────────────
       GA4: send a page_view hit with the virtual path so the
       SPA navigation appears as a real page change in reports.
       Hotjar/Contentsquare: stateChange signals a new "page"
       to the heatmap / session recording tool.
    ────────────────────────────────────────────────────────── */
    if (typeof gtag === 'function') {
      gtag('config', 'G-B4L2MTVJ4L', { 'page_path': '/' + pageId });
    }
    if (typeof hj === 'function') {
      hj('stateChange', '/' + pageId);
    }

    setTimeout(() => {
      initScrollReveal(inn);
      if (pageId === 'skills') initProcessSteps();
    }, 60);
  }, out ? 180 : 0);
}

/* ============================================================
  3. MOBILE MENU
============================================================ */
function toggleMobileMenu() { const m = document.getElementById('mobile-menu'); if(m) m.classList.toggle('open'); }
function closeMobileMenu()  { const m = document.getElementById('mobile-menu'); if(m) m.classList.remove('open'); }

/* ============================================================
  4. NAVBAR SCROLL SHADOW
============================================================ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.boxShadow = window.scrollY > 60 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
});

/* ============================================================
  5. mainpage-hero
  Slideshow: rotates hero image every 3 s using paths from
  data-slides attribute (pipe-separated).
  Parallax: photo column shifts up on scroll (home page only).
============================================================ */
const badge = document.querySelector('.hero-badge');
if (badge) {
  badge.addEventListener('click', () => {
    badge.textContent = badge.textContent.trim().startsWith('TH') ? 'EN / TH' : 'TH / EN';
  });
}

function startHeroSlideshow() {
  const img = document.getElementById('hero-slide-img');
  if (!img) return;
  const slides = (img.getAttribute('data-slides') || '').split('|').map(s => s.trim()).filter(Boolean);
  if (slides.length < 2) return;
  let current = 0;
  setInterval(() => {
    current = (current + 1) % slides.length;
    img.style.opacity = '0';
    setTimeout(() => { img.src = slides[current]; img.style.opacity = '1'; }, 500);
  }, 3000);
}
startHeroSlideshow();

window.addEventListener('scroll', () => {
  if (currentPage !== 'main') return;
  const wrap = document.querySelector('.hero-img-wrap');
  if (wrap) wrap.style.transform = 'translateY(' + (window.scrollY * 0.05) + 'px)';
});

/* ============================================================
  6. mainpage-projects
  Accordion: mouseenter expands a card; row mouseleave
  restores card 01 as default. Click opens data-url.
============================================================ */
const row = document.getElementById('accordionRow');
const cards = Array.from(row ? row.querySelectorAll('.project-card') : []);
const card01 = cards[0];

function setActive(target) { cards.forEach(c => c.classList.toggle('active', c === target)); }
cards.forEach(card => { card.addEventListener('mouseenter', () => setActive(card)); });
if (row) row.addEventListener('mouseleave', () => setActive(card01));

cards.forEach(card => {
  card.addEventListener('click', () => {
    const url = card.getAttribute('data-url');
    if (url && url !== '#') { window.open(url, '_blank', 'noopener,noreferrer'); }
  });
});

/* ============================================================
  7. mainpage-awards
  Same accordion pattern as projects.
============================================================ */
const awardsRow = document.getElementById('awardsRow');
const awardCards = Array.from(awardsRow ? awardsRow.querySelectorAll('.award-card') : []);
const defaultCard = awardCards[0];

function setActiveAward(target) { awardCards.forEach(card => card.classList.toggle('active', card === target)); }
awardCards.forEach(card => { card.addEventListener('mouseenter', () => setActiveAward(card)); });
if (awardsRow) awardsRow.addEventListener('mouseleave', () => setActiveAward(defaultCard));

awardCards.forEach(card => {
  card.addEventListener('click', () => {
    const url = card.getAttribute('data-url');
    if (url && url !== '#') { window.open(url, '_blank', 'noopener,noreferrer'); }
  });
});

/* ============================================================
  8. skillpage-process
  initProcessSteps() is callable so it re-runs when the Skills
  page is revisited after being display:none.
  Reads data-bg-img from each .process-step and injects it as
  a background-image on the .step-bg child.
  IntersectionObserver stagger-reveals each chevron card.
============================================================ */
function initProcessSteps() {
  document.querySelectorAll('.process-step').forEach(step => {
    const imgPath = step.getAttribute('data-bg-img');
    const bgEl    = step.querySelector('.step-bg');
    if (imgPath && bgEl && !bgEl.style.backgroundImage) { bgEl.style.backgroundImage = "url('" + imgPath + "')"; }
  });

  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const index = parseFloat(el.style.getPropertyValue('--i') || 0);
        const delay = index * 0.12;
        el.style.transition = 'opacity 0.5s ease ' + delay + 's, transform 0.5s ease ' + delay + 's, filter 0.35s ease';
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
        stepObs.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.process-step').forEach(step => {
    if (step.style.opacity !== '1') { stepObs.observe(step); }
  });
}

/* ============================================================
  9. skillpage-softskills
  Cascade transition-delay so cards stagger into view.
============================================================ */
document.querySelectorAll('.soft-grid > *').forEach((card, i) => { card.style.transitionDelay = `${i * 0.05}s`; });

/* ============================================================
  10. hobbypage-activities
  Cascade transition-delay so cards stagger into view.
============================================================ */
document.querySelectorAll('.hobby-grid > *').forEach((card, i) => { card.style.transitionDelay = `${i * 0.05}s`; });

/* ============================================================
  11. mainpage-extracurricular
  Timeline item stagger delays + floating tooltip system.
  Tooltip is populated from data-tt-* attributes and positioned
  to stay inside the viewport at all times.
============================================================ */
document.querySelectorAll('.timeline-item').forEach((item, i) => { item.style.transitionDelay = `${i * 0.08}s`; });

const ttBox      = document.getElementById('ttBox');
const ttImgWrap  = document.getElementById('ttImgWrap');
const ttCategory = document.getElementById('ttCategory');
const ttTitle    = document.getElementById('ttTitle');
const ttDesc     = document.getElementById('ttDesc');
const ttDate     = document.getElementById('ttDate');
const TT_OFFSET_X = 16;
const TT_OFFSET_Y = 12;
const TT_W = 300;

function populateTooltip(el) {
  const vid   = el.getAttribute('data-tt-vid')   || '';
  const img   = el.getAttribute('data-tt-img')   || '';
  const cat   = el.getAttribute('data-tt-cat')   || '';
  const title = el.getAttribute('data-tt-title') || '';
  const desc  = el.getAttribute('data-tt-desc')  || '';
  const date  = el.getAttribute('data-tt-date')  || '';
  const icon  = el.getAttribute('data-tt-icon')  || '📌';

  if (vid) {
    ttImgWrap.innerHTML = `<video src="${vid}" autoplay loop playsinline style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;"></video>`;
  } else if (img) {
    ttImgWrap.innerHTML = `<img src="${img}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;">`;
  } else {
    ttImgWrap.innerHTML = `<div class="tt-img-placeholder">${icon}</div>`;
  }
  ttCategory.textContent = cat; ttTitle.textContent = title; ttDesc.textContent = desc; ttDate.textContent = date;
}

function positionTooltip(cx, cy) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const th = ttBox.offsetHeight || 240;
  let left = cx + TT_OFFSET_X;
  let top  = cy + TT_OFFSET_Y;
  if (left + TT_W > vw - 8) { left = cx - TT_W - TT_OFFSET_X; }
  if (top + th > vh - 8) { top = cy - th - TT_OFFSET_Y; }
  left = Math.max(8, left); top  = Math.max(8, top);
  ttBox.style.left = `${left}px`; ttBox.style.top  = `${top}px`;
}

const hoverTargets = document.querySelectorAll('.club-circle[data-tt-title], .timeline-item[data-tt-title]');
hoverTargets.forEach(el => {
  el.addEventListener('mouseenter', e => {
    populateTooltip(el);
    positionTooltip(e.clientX, e.clientY);
    ttBox.classList.add('visible');
  });
  el.addEventListener('mousemove', e => { positionTooltip(e.clientX, e.clientY); });
  el.addEventListener('mouseleave', () => { ttBox.classList.remove('visible'); });
});

/* ============================================================
  12. SCROLL REVEAL (central)
  initScrollReveal(container): IntersectionObserver on all
  .scroll-reveal:not(.revealed) inside container.
  80 ms per-element stagger. Re-runs on every page navigation.
============================================================ */
function initScrollReveal(container) {
  const els = (container || document).querySelectorAll('.scroll-reveal:not(.revealed)');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('revealed'), idx * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal(document.getElementById('page-main'));
  document.querySelectorAll('.timeline-item').forEach((item, i) => { item.style.transitionDelay = (i * 0.08) + 's'; });
  document.querySelectorAll('.soft-grid > *').forEach((c, i) => { c.style.transitionDelay = (i * 0.05) + 's'; });
  document.querySelectorAll('.hobby-grid > *').forEach((c, i) => { c.style.transitionDelay = (i * 0.05) + 's'; });
});
