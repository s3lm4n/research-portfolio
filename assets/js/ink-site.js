/* Ink & Instrument — page choreography (site-wide)
   hero sequence · stop-motion line boil · scroll-inked thesis ·
   painted card borders · section brush marks · margin-rule progress.
   Every block is a no-op when its markup is absent. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var B = window.InkBrush;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  /* ---------- masthead + drawer ---------- */
  var mast = document.querySelector('.mast');
  var toggle = document.querySelector('.mast__toggle');
  var drawer = document.getElementById('drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = drawer.hasAttribute('hidden');
      if (open) drawer.removeAttribute('hidden'); else drawer.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) { drawer.setAttribute('hidden', ''); toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) { drawer.setAttribute('hidden', ''); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  /* ---------- scroll: masthead state + margin rule progress ---------- */
  /* --read is written on the margin rule itself, never on <html>: a custom property set on the
     root re-evaluates style for the whole document on every scroll frame (costly on long pages). */
  var rule = document.querySelector('.margin-rule');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, window.scrollY / max));
      if (rule) rule.style.setProperty('--read', p.toFixed(4));
      if (mast) mast.classList.toggle('is-scrolled', window.scrollY > (mast.classList.contains('mast--page') ? 8 : window.innerHeight * 0.55));
      inkThesis();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- hero: the opening sequence ---------- */
  var hero = document.querySelector('.hero');
  function startHero() {
    if (!hero) return;
    var swash = hero.querySelector('.hero__swash'), run = null;
    if (swash && B) {
      /* approved V002 underline: narrower, drier, ~80% opacity, so the name leads */
      doc.setAttribute('data-swash', 'reduced');
      /* bake before the sequence starts (hero still hidden), so the opening only replays it */
      run = B.prepareOnce(swash, function (w, h) {
        return {
          x0: w * 0.03, y0: h * 0.64, x1: w * 0.975, y1: h * 0.5,
          width: Math.max(12, h * 0.4), color: '#B5552F', seed: 4127,
          load: 0.9, dryness: 0.66, bow: -h * 0.05, wobble: h * 0.025,
          flick: -h * 0.07, density: 2.6
        };
      });
    }
    hero.classList.add('is-live');
    if (run) setTimeout(function () { run(1150); }, reduce ? 0 : 750);
  }
  if (document.fonts && document.fonts.ready) {
    var started = false;
    var go = function () { if (!started) { started = true; startHero(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 1200);            // never hold the page hostage to a font
  } else startHero();

  /* ---------- reveal on scroll (stepped) ---------- */
  var revealables = document.querySelectorAll('.rise-in, .area, .record, .folio, .sec__head, .ink-plate, [data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (n) { n.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    revealables.forEach(function (n) { io.observe(n); });
  }

  /* ---------- section brush marks: painted once when the heading arrives ---------- */
  var marks = document.querySelectorAll('.mark');
  function paintMark(cv, i) {
    if (!B || cv._done) return;
    cv._done = true;
    var color = cv.getAttribute('data-ink') || (i % 2 ? '#3F6F6A' : '#B5552F');
    B.paintOnce(cv, function (w, h) {
      return { x0: 3, y0: h * 0.58, x1: w - 6, y1: h * 0.46, width: Math.max(7, h * 0.42), color: color,
               seed: 900 + i * 37, load: 0.92, dryness: 0.68, wobble: 0.8, bow: -1.2, flick: -1.6, density: 3.6 };
    }, reduce ? 0 : 520);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = Array.prototype.indexOf.call(marks, e.target);
        setTimeout(function () { paintMark(e.target, i); }, 180);
        mio.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    marks.forEach(function (m) { mio.observe(m); });
  } else {
    marks.forEach(paintMark);
  }

  /* ---------- 01 thesis: words are inked as you read ---------- */
  var thesis = document.querySelector('[data-ink-text]');
  var words = [], notes = [];
  if (thesis) {
    thesis.querySelectorAll('p').forEach(function (p) {
      var parts = p.textContent.split(/(\s+)/);
      p.textContent = '';
      parts.forEach(function (s) {
        if (/^\s+$/.test(s) || !s) { p.appendChild(document.createTextNode(s)); return; }
        var sp = document.createElement('span');
        sp.className = 'w';
        sp.textContent = s;
        p.appendChild(sp);
        words.push(sp);
      });
    });
    notes = Array.prototype.slice.call(document.querySelectorAll('.thesis__notes .note'));
  }
  function inkThesis() {
    if (!thesis || !words.length) return;
    if (reduce) { words.forEach(function (w) { w.classList.add('is-inked'); }); notes.forEach(function (n) { n.classList.add('is-in'); }); return; }
    var r = thesis.getBoundingClientRect(), vh = window.innerHeight;
    /* ink starts when the text reaches 78% of the viewport; finishes at 38% */
    var p = (vh * 0.78 - r.top) / Math.max(1, (r.height + vh * 0.4));
    p = Math.max(0, Math.min(1, p * 1.15));
    var n = Math.round(p * words.length);
    for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-inked', i < n);
    notes.forEach(function (note) { note.classList.toggle('is-in', p >= parseFloat(note.getAttribute('data-at') || '1') - 0.02); });
  }

  /* ---------- stop-motion line boil (8 fps) for drawings in view ---------- */
  var turb = document.querySelector('#boil feTurbulence');
  var boilers = document.querySelectorAll('.boil');
  if (turb && !reduce && boilers.length) {
    var visible = new Set();
    var bio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    });
    boilers.forEach(function (b) { bio.observe(b); });
    var seeds = [1, 4, 9], k = 0;
    setInterval(function () {
      if (!visible.size || document.hidden) return;
      k = (k + 1) % seeds.length;
      turb.setAttribute('seed', String(seeds[k]));
    }, 125);
  }

  /* ---------- painted card border: top (left → right), pause, bottom (right → left) ---------- */
  document.querySelectorAll('.folio, [data-ink-edges]').forEach(function (card) {
    if (!B) return;
    var brush = B.edges(card, { pad: 18, strip: 40 });
    if (canHover) {
      card.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') brush.play(); });
      card.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') brush.lift(); });
    }
    /* keyboard: tabbing into the card inks it, leaving lifts it */
    card.addEventListener('focusin', function () { if (card.querySelector(':focus-visible')) brush.play(); });
    card.addEventListener('focusout', function () {
      setTimeout(function () { if (!card.contains(document.activeElement) && !card.matches(':hover')) brush.lift(); }, 0);
    });
    /* touch: no hover exists, so the border is painted once as the card settles into view */
    if (!canHover && 'IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { setTimeout(brush.play, 250); tio.disconnect(); } });
      }, { threshold: 0.55 });
      tio.observe(card);
    }
    card._ink = brush;          // exposed for QA tooling
  });

  onScroll();
})();
