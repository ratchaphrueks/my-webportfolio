/* ============================================================
  scripts.js
  Portfolio — Ratchaphruek Srisuphachoke
  Sections:
     1. Theme              (init + toggle)
     2. Analytics Engine   (page-time · button clicks · scroll
                            depth · section views · outbound links)
     3. SPA Router         showPage()
     4. Mobile Menu
     5. Navbar Scroll Shadow
     6. mainpage-hero      (slideshow + parallax)
     7. mainpage-projects  (accordion)
     8. mainpage-awards    (accordion)
     9. skillpage-process  (bg inject + stagger reveal)
    10. skillpage-softskills  (stagger delays)
    11. hobbypage-activities (stagger delays)
    12. mainpage-extracurricular (stagger + tooltip system)
    13. Scroll Reveal      (central IntersectionObserver)
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
   2. ANALYTICS ENGINE
   ─────────────────────────────────────────────────────────────
   A. Page-time tracking   — measures seconds spent on each
      virtual page and sends page_engagement to GA4.
   B. Button-click events  — delegated listener on data-track-click.
   C. Outbound-link events — delegated listener on a[href^="http"].
   D. Scroll-depth events  — 25 / 50 / 75 / 100% milestones.
   E. Section-view events  — IntersectionObserver per section.

   How to see this in GA4:
   ┌─────────────────────────────────────────────────────────┐
   │ Reports → Engagement → Events                           │
   │   • page_view        — every SPA navigation             │
   │   • page_engagement  — time_sec + time_msec per page    │
   │   • button_click     — button_label + page_context      │
   │   • outbound_click   — link_url + link_label            │
   │   • scroll_depth     — page_id + scroll_depth_percent   │
   │   • section_view     — section_name + page_id           │
   │                                                         │
   │ Reports → Engagement → Pages and screens                │
   │   • Filter by page_path to compare pages                │
   │                                                         │
   │ Explore → Funnel exploration                            │
   │   • Set steps: page_view → button_click → outbound_click│
   └─────────────────────────────────────────────────────────┘
============================================================ */

/* ── A. Page-time tracking ──────────────────────────────── */
let _pageEnterTime   = Date.now();
let _lastTrackedPage = 'main';

function _trackPageLeave(pageId) {
  const ms = Date.now() - _pageEnterTime;
  /* Only send if the user spent more than 0.5 s — avoids noise */
  if (typeof gtag === 'function' && ms > 500) {
    gtag('event', 'page_engagement', {
      page_id:              pageId,
      engagement_time_sec:  Math.round(ms / 1000),
      engagement_time_msec: ms      /* GA4 uses this for "engaged sessions" */
    });
  }
}

function _trackPageEnter(pageId) {
  _pageEnterTime   = Date.now();
  _lastTrackedPage = pageId;
  const title = pageId.charAt(0).toUpperCase() + pageId.slice(1);
  /* GA4 virtual page_view — replaces bare gtag('config',...) */
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title:    title + ' — Ratchaphruek Portfolio',
      page_location: window.location.href.split('?')[0] + '#' + pageId,
      page_path:     '/' + pageId
    });
  }
  /* Hotjar / Contentsquare virtual page */
  if (typeof hj === 'function') {
    hj('stateChange', '/' + pageId);
  }
}

/*
 * Fire final engagement event when the tab is hidden or closed.
 * Without this the last page the user visits always shows 0 s.
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _trackPageLeave(_lastTrackedPage);
  }
});


/* ── B. Button-click tracking (delegated) ───────────────── */
/*
 * Any element with data-track-click="label" fires a button_click
 * event. This covers buttons, nav links, timeline items, and clubs.
 * Add data-track-click="your_label" to any new element in HTML
 * and it will be automatically tracked here — no extra JS needed.
 */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-track-click]');
  if (!el) return;
  const label = el.getAttribute('data-track-click');
  if (typeof gtag === 'function') {
    gtag('event', 'button_click', {
      button_label: label,
      page_context: currentPage
    });
  }
});


/* ── C. Outbound-link tracking (delegated) ──────────────── */
/*
 * Catches every click on an external link regardless of how it was
 * added to the DOM. Reads data-track-click if present, else falls
 * back to aria-label or trimmed text content.
 */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="http"]');
  if (!link) return;
  const url   = link.href;
  const label = link.getAttribute('data-track-click')
             || link.getAttribute('aria-label')
             || link.textContent.trim().slice(0, 60)
             || url;
  if (typeof gtag === 'function') {
    gtag('event', 'outbound_click', {
      link_url:     url,
      link_label:   label,
      page_context: currentPage
    });
  }
});


/* ── D. Scroll-depth tracking ───────────────────────────── */
/*
 * Tracks 25 / 50 / 75 / 100% scroll milestones per page.
 * Each milestone fires once per page per session.
 * In GA4: Events → scroll_depth → parameter scroll_depth_percent.
 */
const _scrollReported = {};

function initScrollDepth(pageId) {
  if (!_scrollReported[pageId]) {
    _scrollReported[pageId] = { 25: false, 50: false, 75: false, 100: false };
  }
  const onScroll = () => {
    if (currentPage !== pageId) return;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return;
    const pct  = Math.round((window.scrollY / docH) * 100);
    [25, 50, 75, 100].forEach(milestone => {
      if (pct >= milestone && !_scrollReported[pageId][milestone]) {
        _scrollReported[pageId][milestone] = true;
        if (typeof gtag === 'function') {
          gtag('event', 'scroll_depth', {
            page_id:              pageId,
            scroll_depth_percent: milestone
          });
        }
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}


/* ── E. Section-view tracking ───────────────────────────── */
/*
 * Fires section_view when a <section> is 25% visible.
 * Each section fires once per page visit.
 * In GA4: Events → section_view → parameter section_name.
 */
function initSectionViews(container, pageId) {
  const sObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      /* Use first meaningful CSS class as section name */
      const name = Array.from(entry.target.classList)
        .find(c => c.includes('-section') || c.includes('-hero')
                || c.includes('-activities') || c.includes('-what')
                || c.includes('-process') || c.includes('quote'))
        || entry.target.className.split(' ')[0]
        || 'unknown_section';
      if (typeof gtag === 'function') {
        gtag('event', 'section_view', {
          section_name: name,
          page_id:      pageId
        });
      }
      sObs.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  container.querySelectorAll('section').forEach(s => sObs.observe(s));
}


/* ============================================================
   3. SPA ROUTER — showPage(pageId)
   Fades out the current page (200 ms), fades in the target
   (350 ms), scrolls to top, syncs nav active states, and
   re-runs initScrollReveal() on the newly shown page.
   Also drives the analytics engine: page-leave → page-enter.
============================================================ */
let currentPage = 'main';

function showPage(pageId) {
  if (pageId === currentPage) return;

  const out = document.getElementById('page-' + currentPage);
  const inn = document.getElementById('page-' + pageId);
  if (!inn) return;

  /* ── Fire leave event for the page we are leaving ── */
  _trackPageLeave(currentPage);

  /* Fade out current page */
  if (out) {
    out.style.transition = 'opacity 0.2s ease';
    out.style.opacity    = '0';
    setTimeout(() => {
      out.classList.remove('spa-active');
      out.style.opacity    = '';
      out.style.transition = '';
    }, 200);
  }

  /* Fade in next page */
  setTimeout(() => {
    inn.classList.add('spa-active');
    inn.style.opacity    = '0';
    inn.style.transition = 'none';

    requestAnimationFrame(() => requestAnimationFrame(() => {
      inn.style.transition = 'opacity 0.35s ease';
      inn.style.opacity    = '1';
      setTimeout(() => {
        inn.style.opacity    = '';
        inn.style.transition = '';
      }, 380);
    }));

    window.scrollTo({ top: 0, behavior: 'instant' });
    currentPage = pageId;

    /* Sync nav active states */
    document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-page') === pageId);
    });

    /* ── Fire enter event for the new page ── */
    _trackPageEnter(pageId);

    /* Re-init scroll reveal, process steps, scroll depth, section views */
    setTimeout(() => {
      initScrollReveal(inn);
      initScrollDepth(pageId);
      initSectionViews(inn, pageId);
      if (pageId === 'skills') initProcessSteps();
    }, 60);

  }, out ? 180 : 0);
}


/* ============================================================
   4. MOBILE MENU
============================================================ */
function toggleMobileMenu() {
  const m = document.getElementById('mobile-menu');
  if (m) m.classList.toggle('open');
}

function closeMobileMenu() {
  const m = document.getElementById('mobile-menu');
  if (m) m.classList.remove('open');
}


/* ============================================================
   5. NAVBAR SCROLL SHADOW
============================================================ */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    nav.style.boxShadow = window.scrollY > 60
      ? '0 2px 20px rgba(0,0,0,0.08)'
      : 'none';
  }
});


/* ============================================================
   6. mainpage-hero
   Slideshow: rotates hero image every 3 s using paths from
   data-slides attribute (pipe-separated).
   Parallax: photo column shifts up on scroll (home page only).
============================================================ */
const badge = document.querySelector('.hero-badge');
if (badge) {
  badge.addEventListener('click', () => {
    badge.textContent = badge.textContent.trim().startsWith('TH')
      ? 'EN / TH'
      : 'TH / EN';
  });
}

function startHeroSlideshow() {
  const img = document.getElementById('hero-slide-img');
  if (!img) return;

  const slides = (img.getAttribute('data-slides') || '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);

  if (slides.length < 2) return;

  let current = 0;
  setInterval(() => {
    current = (current + 1) % slides.length;
    img.style.opacity = '0';
    setTimeout(() => {
      img.src           = slides[current];
      img.style.opacity = '1';
    }, 500);
  }, 3000);
}
startHeroSlideshow();

window.addEventListener('scroll', () => {
  if (currentPage !== 'main') return;
  const wrap = document.querySelector('.hero-img-wrap');
  if (wrap) wrap.style.transform = 'translateY(' + (window.scrollY * 0.05) + 'px)';
});


/* ============================================================
   7. mainpage-projects
   Accordion: mouseenter expands a card; row mouseleave
   restores card 01 as default. Click opens data-url.
============================================================ */
const row    = document.getElementById('accordionRow');
const cards  = Array.from(row ? row.querySelectorAll('.project-card') : []);
const card01 = cards[0];

function setActive(target) {
  cards.forEach(c => c.classList.toggle('active', c === target));
}

cards.forEach(card => {
  card.addEventListener('mouseenter', () => setActive(card));
});

if (row) row.addEventListener('mouseleave', () => setActive(card01));

cards.forEach(card => {
  card.addEventListener('click', () => {
    const url = card.getAttribute('data-url');
    if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  });
});


/* ============================================================
   8. mainpage-awards
   Same accordion pattern as projects.
============================================================ */
const awardsRow   = document.getElementById('awardsRow');
const awardCards  = Array.from(awardsRow ? awardsRow.querySelectorAll('.award-card') : []);
const defaultCard = awardCards[0];

function setActiveAward(target) {
  awardCards.forEach(card => card.classList.toggle('active', card === target));
}

awardCards.forEach(card => {
  card.addEventListener('mouseenter', () => setActiveAward(card));
});

if (awardsRow) awardsRow.addEventListener('mouseleave', () => setActiveAward(defaultCard));

awardCards.forEach(card => {
  card.addEventListener('click', () => {
    const url = card.getAttribute('data-url');
    if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  });
});


/* ============================================================
   9. skillpage-process
   initProcessSteps() is callable so it re-runs when the Skills
   page is revisited after being display:none.
   Reads data-bg-img from each .process-step and injects it as
   a background-image on the .step-bg child.
   IntersectionObserver stagger-reveals each chevron card.
============================================================ */
function initProcessSteps() {

  /* Inject background images */
  document.querySelectorAll('.process-step').forEach(step => {
    const imgPath = step.getAttribute('data-bg-img');
    const bgEl    = step.querySelector('.step-bg');
    if (imgPath && bgEl && !bgEl.style.backgroundImage) {
      bgEl.style.backgroundImage = "url('" + imgPath + "')";
    }
  });

  /* Stagger-reveal with IntersectionObserver */
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const index = parseFloat(el.style.getPropertyValue('--i') || 0);
      const delay = index * 0.12;
      el.style.transition = [
        'opacity 0.5s ease '   + delay + 's',
        'transform 0.5s ease ' + delay + 's',
        'filter 0.35s ease'
      ].join(', ');
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
      stepObs.unobserve(el);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.process-step').forEach(step => {
    if (step.style.opacity !== '1') stepObs.observe(step);
  });
}


/* ============================================================
   10. skillpage-softskills
   Cascade transition-delay so cards stagger into view.
============================================================ */
document.querySelectorAll('.soft-grid > *').forEach((card, i) => {
  card.style.transitionDelay = (i * 0.05) + 's';
});


/* ============================================================
   11. hobbypage-activities
   Cascade transition-delay so cards stagger into view.
============================================================ */
document.querySelectorAll('.hobby-grid > *').forEach((card, i) => {
  card.style.transitionDelay = (i * 0.05) + 's';
});


/* ============================================================
   12. mainpage-extracurricular
   Timeline item stagger delays + floating tooltip system.
   Tooltip is populated from data-tt-* attributes and positioned
   to stay inside the viewport at all times.
============================================================ */
document.querySelectorAll('.timeline-item').forEach((item, i) => {
  item.style.transitionDelay = (i * 0.08) + 's';
});

/* Tooltip element references */
const ttBox      = document.getElementById('ttBox');
const ttImgWrap  = document.getElementById('ttImgWrap');
const ttCategory = document.getElementById('ttCategory');
const ttTitle    = document.getElementById('ttTitle');
const ttDesc     = document.getElementById('ttDesc');
const ttDate     = document.getElementById('ttDate');

const TT_OFFSET_X = 16;
const TT_OFFSET_Y = 12;
const TT_W        = 300;

/* FIX Bug 8: null-guard — return early if any tooltip element is missing
   to prevent TypeError: Cannot set properties of null              */
function populateTooltip(el) {
  if (!ttImgWrap || !ttCategory || !ttTitle || !ttDesc || !ttDate) return;

  const vid   = el.getAttribute('data-tt-vid')   || '';
  const img   = el.getAttribute('data-tt-img')   || '';
  const cat   = el.getAttribute('data-tt-cat')   || '';
  const title = el.getAttribute('data-tt-title') || '';
  const desc  = el.getAttribute('data-tt-desc')  || '';
  const date  = el.getAttribute('data-tt-date')  || '';
  const icon  = el.getAttribute('data-tt-icon')  || '📌';

  if (vid) {
    ttImgWrap.innerHTML = `<video src="${vid}" autoplay loop playsinline
      style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;">
    </video>`;
  } else if (img) {
    ttImgWrap.innerHTML = `<img src="${img}" alt="${title}" loading="lazy"
      style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;">`;
  } else {
    ttImgWrap.innerHTML = `<div class="tt-img-placeholder">${icon}</div>`;
  }

  ttCategory.textContent = cat;
  ttTitle.textContent    = title;
  ttDesc.textContent     = desc;
  ttDate.textContent     = date;
}

function positionTooltip(cx, cy) {
  if (!ttBox) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const th = ttBox.offsetHeight || 240;

  let left = cx + TT_OFFSET_X;
  let top  = cy + TT_OFFSET_Y;

  if (left + TT_W > vw - 8) left = cx - TT_W - TT_OFFSET_X;
  if (top  + th   > vh - 8) top  = cy - th   - TT_OFFSET_Y;

  left = Math.max(8, left);
  top  = Math.max(8, top);

  ttBox.style.left = left + 'px';
  ttBox.style.top  = top  + 'px';
}

const hoverTargets = document.querySelectorAll(
  '.club-circle[data-tt-title], .timeline-item[data-tt-title]'
);

hoverTargets.forEach(el => {
  el.addEventListener('mouseenter', e => {
    populateTooltip(el);
    positionTooltip(e.clientX, e.clientY);
    if (ttBox) ttBox.classList.add('visible');
  });
  el.addEventListener('mousemove', e => {
    positionTooltip(e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', () => {
    if (ttBox) ttBox.classList.remove('visible');
  });
});


/* ============================================================
   13. SCROLL REVEAL (central)
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
  const mainPage = document.getElementById('page-main');

  /* Bootstrap analytics for the initial landing page */
  _trackPageEnter('main');
  initScrollDepth('main');
  if (mainPage) initSectionViews(mainPage, 'main');

  initScrollReveal(mainPage);

  document.querySelectorAll('.timeline-item').forEach((item, i) => {
    item.style.transitionDelay = (i * 0.08) + 's';
  });
  document.querySelectorAll('.soft-grid > *').forEach((c, i) => {
    c.style.transitionDelay = (i * 0.05) + 's';
  });
  document.querySelectorAll('.hobby-grid > *').forEach((c, i) => {
    c.style.transitionDelay = (i * 0.05) + 's';
  });
});
