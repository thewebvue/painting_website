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
  let ticking = false;
  function onScroll() {
    header.classList.toggle('is-scrolled', (window.scrollY || window.pageYOffset) > 12);
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

  /* ---------- Gallery filter chips ---------- */
  const chips = $$('.chip[data-filter]');
  if (chips.length) {
    const items = $$('.gallery-item');
    const count = $('#result-count');
    chips.forEach(chip => chip.addEventListener('click', () => {
      const wanted = chip.dataset.filter;
      let shown = 0;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      items.forEach(item => {
        const match = wanted === 'all' || item.dataset.category === wanted;
        item.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = 'Showing ' + shown + ' photo' + (shown === 1 ? '' : 's');
    }));
  }

  /* ---------- Lightbox ---------- */
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
    let lastFocus = null;

    function visible() { return shots.filter(s => !s.hidden); }

    const showShot = i => {
      const list = visible();
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
      const list = visible();
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
