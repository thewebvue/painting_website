/* =========================================================
   Rithwin's Pro Painters - shared script (loaded on every page)
   Each feature checks that its markup exists, so this one
   file works across all pages.
========================================================= */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Intro / preloader (paint bucket pour) ----------
     Plays once per browser session, on whichever page the visitor opens
     first; every page after that skips it via the html.intro-skip class
     an inline script in <head> already set (see build.py's head()), so
     there is no flash. */
  (() => {
    const intro = $('#intro-overlay');
    if (!intro) return;
    if (document.documentElement.classList.contains('intro-skip')) {
      intro.style.display = 'none';
      return;
    }
    try { sessionStorage.setItem('rppIntroPlayed', '1'); } catch (e) { /* private mode: intro may replay, harmless */ }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      intro.style.display = 'none';
      document.body.classList.remove('no-scroll');
    };

    if (reduceMotion) { finish(); return; }

    document.body.classList.add('no-scroll');
    const skip = () => {
      if (done) return;
      intro.classList.add('is-skip');
      setTimeout(finish, 420);
    };
    const skipBtn = $('#intro-skip', intro);
    if (skipBtn) skipBtn.addEventListener('click', skip);
    intro.addEventListener('click', e => { if (e.target === intro) skip(); });

    requestAnimationFrame(() => intro.classList.add('is-enter'));
    setTimeout(() => intro.classList.add('is-tip'), 550);      // bucket lifts, tips, streams start
    setTimeout(() => intro.classList.add('is-splash'), 1450);  // colors hit the floor, blobs merge
    setTimeout(() => intro.classList.add('is-reveal'), 2750);  // brand name paints on
    setTimeout(() => intro.classList.add('is-exit'), 4500);    // whole overlay fades -- holds the finished brand name on screen a bit longer before fading

    intro.addEventListener('animationend', e => {
      if (e.target === intro && e.animationName === 'intro-exit') finish();
    });
    setTimeout(finish, 5400); // fail-safe in case the animationend event doesn't fire
  })();

  /* ---------- Image fallback (if a photo URL fails to load) ---------- */
  const FALLBACK = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="800" height="600" fill="#211F1B"/>' +
    '<g fill="none" stroke="#E08F0F" stroke-width="10" stroke-linecap="round">' +
    '<path d="M180 150 L620 150"/><path d="M180 260 L560 260"/><path d="M180 370 L500 370"/>' +
    '</g><rect x="560" y="330" width="70" height="140" rx="8" fill="#E08F0F" opacity=".9"/></svg>'
  );
  $$('img').forEach(img => {
    const swap = () => { if (img.dataset.fb) return; img.dataset.fb = '1'; img.src = FALLBACK; };
    img.addEventListener('error', swap);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) swap();
  });

  /* ---------- Sticky header shadow ---------- */
  const header = $('#header');

  /* ---------- Gallery: sticky jump-nav shadow + active-section highlight ----------
     The bar itself just needs CSS (position:sticky); this only adds the
     "picked up off the page" shadow once it's actually pinned, and marks
     whichever category is currently in view so it's clear which section
     you're scrolled into. */
  const galFilters = $('#gallery-filters');
  const galChips = galFilters ? $$('.chip', galFilters) : [];
  const galSections = ['gal-wall', 'gal-wood', 'gal-ceiling']
    .map(id => document.getElementById(id)).filter(Boolean);
  const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76;

  let ticking = false;
  function onScroll() {
    header.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 12);
    if (galFilters) {
      galFilters.classList.toggle('is-stuck', galFilters.getBoundingClientRect().top <= headerH + .5);
      let activeId = null;
      galSections.forEach(sec => { if (sec.getBoundingClientRect().top <= headerH + 48) activeId = sec.id; });
      galChips.forEach(c => c.classList.toggle('is-active', !!activeId && c.getAttribute('href') === '#' + activeId));
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $('#nav-toggle');
  const menu = $('#nav-menu');
  const backdrop = $('#nav-backdrop');
  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    backdrop.classList.toggle('is-visible', open);
    document.body.classList.toggle('no-scroll', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  backdrop.addEventListener('click', () => setMenu(false));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  window.addEventListener('pageshow', () => setMenu(false));

  /* ---------- Animated stat counters ---------- */
  const counters = $$('[data-count]');
  const statBlock = $('#hero-stats, #stat-band');
  function runCounter(el) {
    const target = Number(el.dataset.count);
    const duration = 1800;
    let start = null;
    const step = ts => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (counters.length) {
    if (reduceMotion || !hasIO) {
      counters.forEach(c => { c.textContent = Number(c.dataset.count).toLocaleString('en-IN'); });
    } else {
      counters.forEach(c => { c.textContent = '0'; });
      const groups = new Map();
      counters.forEach(c => {
        const root = c.closest('.hero-stats, .stat-band') || document.body;
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(c);
      });
      groups.forEach((els, root) => {
        const io = new IntersectionObserver((entries, obs) => {
          if (entries[0].isIntersecting) { els.forEach(runCounter); obs.disconnect(); }
        }, { threshold: 0.4 });
        io.observe(root);
      });
    }
  }

  /* ---------- Lightbox ----------
     The gallery page is split into three category sections (Wall Painting,
     Wood Polish, False Ceiling). Opening any photo scopes prev/next
     navigation to just that photo's own category/section, so browsing
     never drifts into a different section's images. */
  const lb = $('#lightbox');
  const shots = $$('.gallery-item');
  if (lb && shots.length) {
    const lbImg = $('#lb-img');
    const lbCap = $('#lb-cap');
    const lbCount = $('#lb-count');
    const lbClose = $('#lb-close');
    const lbPrev = $('#lb-prev');
    const lbNext = $('#lb-next');
    let current = 0;
    let currentCategory = null;
    let lastFocus = null;

    function categoryShots() {
      return currentCategory
        ? shots.filter(s => s.dataset.category === currentCategory)
        : shots;
    }

    const showShot = i => {
      const list = categoryShots();
      if (!list.length) return;
      current = (i + list.length) % list.length;
      const item = list[current];
      lbImg.classList.add('is-loading');
      delete lbImg.dataset.fb;
      lbImg.src = item.dataset.full;
      lbImg.alt = item.dataset.caption;
      lbCap.textContent = item.dataset.caption;
      lbCount.textContent = (current + 1) + ' / ' + list.length;
    };
    lbImg.addEventListener('error', () => { if (!lbImg.dataset.fb) { lbImg.dataset.fb = '1'; lbImg.src = FALLBACK; } });

    const openLightbox = item => {
      lastFocus = document.activeElement;
      currentCategory = item.dataset.category;
      const list = categoryShots();
      showShot(list.indexOf(item));
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
      lbClose.focus();
    };
    const closeLightbox = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocus) lastFocus.focus();
    };

    shots.forEach(item => item.addEventListener('click', () => openLightbox(item)));
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', () => showShot(current - 1));
    lbNext.addEventListener('click', () => showShot(current + 1));
    $('#lb-stage').addEventListener('click', e => { if (e.target === e.currentTarget) closeLightbox(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showShot(current - 1);
      else if (e.key === 'ArrowRight') showShot(current + 1);
      else if (e.key === 'Tab') {
        const first = lbClose, last = lbNext;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    let touchX = null;
    lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) showShot(current + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive: true });
  }

  /* ---------- Enquiry form -> pre-filled WhatsApp message ----------
     No backend on a plain HTML/CSS/JS site, so the enquiry is sent as a
     ready-to-send WhatsApp message. Replace WHATSAPP_NUMBER below once
     the real business WhatsApp number is confirmed. */
  const WHATSAPP_NUMBER = '919876543210'; // TODO: replace with the real WhatsApp number, country code first, no + or spaces
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const form = $('#enquiry-form');

  if (form) {
    const success = $('#form-success');
    const submitBtn = $('#submit-btn');
    const submitLabel = $('.btn-label', submitBtn);
    const serviceSelect = $('#f-service');

    const wanted = new URLSearchParams(window.location.search).get('service');
    if (wanted && serviceSelect) serviceSelect.value = wanted;

    const rules = {
      name:    v => v.trim().length >= 2 || 'Enter your full name.',
      phone:   v => {
        const digits = v.replace(/\D/g, '');
        return (/^[+\d\s\-()]+$/.test(v) && digits.length >= 7 && digits.length <= 15) || 'Enter a valid phone number with 7 to 15 digits.';
      },
      service: v => v !== '' || 'Choose the work you need done.',
      area:    v => v.trim().length >= 2 || 'Tell us your village or town.'
    };

    const validateField = input => {
      const rule = rules[input.name];
      if (!rule) return true;
      const result = rule(input.value);
      const wrap = input.closest('.field');
      const ok = result === true;
      wrap.classList.toggle('has-error', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      $('.field-error', wrap).textContent = ok ? '' : result;
      return ok;
    };

    $$('input, select', form).forEach(input => {
      input.addEventListener('blur', () => {
        if (input.value !== '' || input.closest('.field').classList.contains('has-error')) validateField(input);
      });
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('has-error')) validateField(input);
      });
      input.addEventListener('change', () => validateField(input));
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = $$('input, select', form).filter(f => rules[f.name]);
      const results = fields.map(validateField);
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Opening WhatsApp…';

      const name = $('#f-name').value.trim();
      const phone = $('#f-phone').value.trim();
      const service = serviceSelect.value;
      const area = $('#f-area').value.trim();
      const message = $('#f-message') ? $('#f-message').value.trim() : '';

      const lines = [
        'Hello Rithwin\'s Pro Painters, I would like a quote.',
        'Name: ' + name,
        'Phone: ' + phone,
        'Work needed: ' + service,
        'Area: ' + area
      ];
      if (message) lines.push('Message: ' + message);

      const waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(waUrl, '_blank', 'noopener');

      form.hidden = true;
      success.hidden = false;
      success.focus();
      submitBtn.disabled = false;
      submitLabel.textContent = 'Send enquiry on WhatsApp';
    });

    const again = $('#another-btn');
    if (again) again.addEventListener('click', () => {
      form.reset();
      $$('.field', form).forEach(f => f.classList.remove('has-error'));
      $$('.field-error', form).forEach(s => { s.textContent = ''; });
      success.hidden = true;
      form.hidden = false;
      $('#f-name').focus();
    });
  }

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
