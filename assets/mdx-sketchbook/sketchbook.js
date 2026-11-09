/* MDX — The Living Notebook
   One camera, driven by scroll position only, so every frame is reversible.
   The twelve plates keep V004's own CSS animations; scroll sets their time instead of the clock.
   Persistent elements (lens, 7B accumulator, margin rule) follow V004's per-scene geometry. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var params = new URLSearchParams(location.search);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STATIC = params.has('static') || reduce;
  if (STATIC) doc.classList.add('static');
  var I18N = { en: { plate: 'Plate', toggleAnim: 'Animated view' }, tr: { plate: 'Levha', toggleAnim: 'Animasyonlu görünüm' } };
  var L = I18N[doc.lang] || I18N.en;

  var $ = function (id) { return document.getElementById(id); };
  var opening = $('opening'), stage = $('stage'), intro = $('intro'), world = $('world'), page = $('page'),
      frame = $('frame'), back = $('bookBack'), front = $('bookFront'), lens = $('lens'), rule = $('rule'),
      lensArt = $('lensArt'), lensOverlay = $('lensOverlay'), acc = $('acc'), ctrl = $('nbCtrl'), count = $('nbCount'),
      prevB = $('nbPrev'), nextB = $('nbNext'), staticHost = $('staticPlates');
  var N = 12, SC = {};
  for (var n = 1; n <= N; n++) SC[n] = frame.querySelector('.scene[data-scene="' + n + '"]');

  var toggle = document.querySelector('[data-static-toggle]');
  if (toggle) {
    if (reduce) toggle.style.display = 'none';
    else if (STATIC) { toggle.textContent = L.toggleAnim; toggle.href = location.pathname; }
  }

  /* ---------- motion helpers ---------- */
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function X(t) { return ((ax * t + bx) * t + cx) * t; }
    function Y(t) { return ((ay * t + by) * t + cy) * t; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
      return Y(t);
    };
  }
  var ease = bezier(.65, .05, .36, 1);            // V004's drawing curve
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seg = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- the story, in units of 1% of the stage height ----------
     Pacing follows content density: [draw, hold] per plate. Diagram and number plates get room;
     text-led plates (IV, VI, XI) draw faster. Transitions overlap the next plate's first strokes. */
  var CAM = { a: 4, b: 118 };
  var BUD = { 1: [150, 20], 2: [110, 15], 3: [130, 20], 4: [64, 10], 5: [150, 25], 6: [76, 10],
              7: [140, 25], 8: [110, 20], 9: [120, 20], 10: [100, 15], 11: [64, 10], 12: [90, 30] };
  var XL = 50, OV = .4;
  var S = {}, at = 96;
  for (n = 1; n <= N; n++) { S[n] = { a: at, b: at + BUD[n][0] }; S[n].e = S[n].b + BUD[n][1]; at = S[n].e + OV * XL; }
  var END = S[N].e;

  /* ---------- V004 geometry (landscape) and the portrait boards ---------- */
  var BOARD = { l: { w: 1280, h: 720 }, p: { w: 720, h: 1560 } };
  var LENS = {
    l: { 1: { l: 800, t: 120, w: 400, o: 1 }, 2: { l: 150, t: 100, w: 540, o: 1 }, 3: { l: 110, t: 268, w: 120, o: 0 }, 12: { l: 110, t: 150, w: 440, o: 1 }, hid: { l: 600, t: 330, w: 80, o: 0 } },
    p: { 1: { l: 150, t: 790, w: 390, o: 1 }, 2: { l: 110, t: 90, w: 500, o: 1 }, 3: { l: 60, t: 480, w: 170, o: 0 }, 12: { l: 120, t: 830, w: 480, o: 1 }, hid: { l: 300, t: 700, w: 80, o: 0 } }
  };
  var ACC = {
    l: { 5: { l: 958, t: 224, w: 258, h: 70 }, 6: { l: 322, t: 346, w: 696, h: 60 }, 7: { l: 330, t: 170, w: 300, h: 300 } },
    p: { 5: { l: 446, t: 838, w: 236, h: 70 }, 6: { l: 78, t: 710, w: 610, h: 134 }, 7: { l: 70, t: 380, w: 345, h: 345 } }
  };
  var RULE = { l: { 1: 248, 2: 770, 5: 248, 6: 1032, 7: 248, 9: 1040, 11: 640 }, p: { 1: 46, 2: 46, 5: 46, 6: 46, 7: 46, 9: 46, 11: 46 } };
  function lensAt(o, k) { return LENS[o][k] || LENS[o].hid; }
  function accAt(o, k) {
    var g = ACC[o][k <= 5 ? 5 : k >= 7 ? 7 : 6];
    return { l: g.l, t: g.t, w: g.w, h: g.h, o: (k >= 5 && k <= 7) ? 1 : 0 };
  }
  function ruleAt(o, k) { return RULE[o][k]; }

  /* ---------- the notebook object: generated for the current page proportions ---------- */
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  function wrect(x, y, w, h, a) {
    return 'M' + r1(x + a) + ' ' + r1(y) + ' C' + r1(x + w / 3) + ' ' + r1(y - a) + ' ' + r1(x + 2 * w / 3) + ' ' + r1(y + a) + ' ' + r1(x + w) + ' ' + r1(y) +
      ' C' + r1(x + w + a) + ' ' + r1(y + h / 3) + ' ' + r1(x + w - a) + ' ' + r1(y + 2 * h / 3) + ' ' + r1(x + w + a) + ' ' + r1(y + h) +
      ' C' + r1(x + 2 * w / 3) + ' ' + r1(y + h + a) + ' ' + r1(x + w / 3) + ' ' + r1(y + h - a) + ' ' + r1(x) + ' ' + r1(y + h + a) +
      ' C' + r1(x - a) + ' ' + r1(y + 2 * h / 3) + ' ' + r1(x + a) + ' ' + r1(y + h / 3) + ' ' + r1(x + a) + ' ' + r1(y);
  }
  var settled = false;
  function anim(cls, delay, dur) {
    if (settled) return '';
    return ' class="' + cls + '" style="animation-delay:' + delay + 's' + (dur ? ';animation-duration:' + dur + 's' : '') + '"';
  }
  function drawBook(O, PW, PH, s0, w0) {
    var k = 1 / s0, P = function (v) { return v * k; };
    var ink = 1.25 * k, pen = .8 * k, a = P(.45);
    var b = '', f = '';
    var hatch = '';
    for (var y = P(16); y < PH + P(6); y += P(4.6)) hatch += 'M' + r1(PW + P(7.6)) + ' ' + r1(y) + ' L' + r1(PW + P(12.4)) + ' ' + r1(y - P(4.8)) + ' ';
    for (var x = P(14); x < PW + P(8); x += P(4.6)) hatch += 'M' + r1(x) + ' ' + r1(PH + P(12.6)) + ' L' + r1(x + P(4.8)) + ' ' + r1(PH + P(7.8)) + ' ';
    b += '<path d="' + hatch + '" fill="none" stroke="#8F897E" stroke-width="' + r1(.7 * k) + '" stroke-linecap="round" opacity=".55" pathLength="1"' + anim('bk-draw', 1.55, 1.4) + '/>';
    var cover = wrect(-P(2.4), -P(3.4), PW + P(9), PH + P(10.6), a);
    b += '<path d="' + cover + '" fill="#2E2A26"' + anim('bk-fade', 0, .8) + '/>';
    b += '<path d="' + cover + '" fill="none" stroke="#1E1C19" stroke-width="' + r1(ink) + '" pathLength="1"' + anim('bk-draw', .05, 1.2) + '/>';
    var rx = PW * (O === 'l' ? .66 : .62), rw = P(5.2);
    var ribbon = 'M' + r1(rx) + ' ' + r1(PH - P(4)) + ' L' + r1(rx + rw) + ' ' + r1(PH - P(4)) + ' L' + r1(rx + rw + P(.6)) + ' ' + r1(PH + P(20)) +
      ' L' + r1(rx + rw / 2 + P(.3)) + ' ' + r1(PH + P(16.2)) + ' L' + r1(rx - P(.2)) + ' ' + r1(PH + P(20.4)) + ' Z';
    b += '<path d="' + ribbon + '" fill="#57534B" stroke="#1E1C19" stroke-width="' + r1(.9 * k) + '" stroke-linejoin="round"' + anim('bk-fade', 1.3, .7) + '/>';
    var shades = ['#E6DECD', '#ECE5D7', '#F1EBE0'];
    for (var i = 3; i >= 1; i--) {
      b += '<path d="' + wrect(i * P(1.05), i * P(1.45), PW, PH, a) + '" fill="' + shades[3 - i] + '" stroke="#8F897E" stroke-width="' + r1(pen) + '"' + anim('bk-fade', .2 + (3 - i) * .1, .6) + '/>';
    }
    f += '<path d="' + wrect(0, 0, PW, PH, a) + '" fill="none" stroke="#1E1C19" stroke-width="' + r1(ink) + '" pathLength="1"' + anim('bk-draw', .3, 1.3) + '/>';
    var pitch = P(Math.max(8, w0 / 40)), x0 = P(6), holes = '', wire = '';
    var cnt = Math.floor((PW - x0 - P(6)) / pitch) + 1, x1 = (PW - (cnt - 1) * pitch) / 2;
    for (var j = 0; j < cnt; j++) {
      var cx = x1 + j * pitch, hr = P(1.25), hy = P(4.4);
      holes += 'M' + r1(cx + hr) + ' ' + r1(hy) + ' a' + r1(hr) + ' ' + r1(hr) + ' 0 1 0 ' + r1(-2 * hr) + ' 0 a' + r1(hr) + ' ' + r1(hr) + ' 0 1 0 ' + r1(2 * hr) + ' 0 ';
      wire += 'M' + r1(cx - P(.3)) + ' ' + r1(hy) + ' C' + r1(cx - P(1.3)) + ' ' + r1(-P(1.6)) + ' ' + r1(cx + P(1.2)) + ' ' + r1(-P(7.4)) + ' ' + r1(cx + P(2.6)) + ' ' + r1(-P(5.9)) +
        ' C' + r1(cx + P(3.8)) + ' ' + r1(-P(4.5)) + ' ' + r1(cx + P(2.1)) + ' ' + r1(P(1.2)) + ' ' + r1(cx + P(.7)) + ' ' + r1(hy - P(.2)) + ' ';
    }
    f += '<path d="' + holes + '" fill="#2E2A26"' + anim('bk-fade', .7, .5) + '/>';
    f += '<path d="' + wire + '" fill="none" stroke="#1E1C19" stroke-width="' + r1(1.15 * k) + '" stroke-linecap="round" pathLength="1"' + anim('bk-draw', .75, 1.5) + '/>';
    var Lp = P(O === 'l' ? Math.min(.46 * w0, 300) : .92 * w0), w = Lp * (O === 'l' ? .052 : .06), xb = Lp - 3.1 * w, xt = Lp - .55 * w, h = w / 2;
    var body = 'M0 ' + r1(-h) + ' L' + r1(xb) + ' ' + r1(-h) + ' L' + r1(xb) + ' ' + r1(h) + ' L0 ' + r1(h) + ' C' + r1(-w * .18) + ' ' + r1(h * .5) + ' ' + r1(-w * .18) + ' ' + r1(-h * .5) + ' 0 ' + r1(-h) + ' Z';
    var facets = 'M0 ' + r1(-h / 3) + ' L' + r1(xb) + ' ' + r1(-h / 3) + ' M0 ' + r1(h / 3) + ' L' + r1(xb) + ' ' + r1(h / 3);
    var cone = 'M' + r1(xb) + ' ' + r1(-h) + ' L' + r1(xt) + ' ' + r1(-h * .26) + ' L' + r1(xt) + ' ' + r1(h * .26) + ' L' + r1(xb) + ' ' + r1(h) +
      ' C' + r1(xb + w * .35) + ' ' + r1(h * .55) + ' ' + r1(xb + w * .05) + ' ' + r1(h * .1) + ' ' + r1(xb + w * .3) + ' 0 C' + r1(xb + w * .05) + ' ' + r1(-h * .1) + ' ' + r1(xb + w * .35) + ' ' + r1(-h * .55) + ' ' + r1(xb) + ' ' + r1(-h) + ' Z';
    var tip = 'M' + r1(xt) + ' ' + r1(-h * .26) + ' L' + r1(Lp) + ' 0 L' + r1(xt) + ' ' + r1(h * .26) + ' Z';
    var bx = O === 'l' ? PW - P(4) : PW + P(4), by = PH + P(O === 'l' ? 13 : 14), ang = O === 'l' ? 183 : 182.5;
    f += '<g transform="translate(' + r1(bx) + ' ' + r1(by) + ') rotate(' + ang + ')" stroke="#1E1C19" stroke-width="' + r1(1.05 * k) + '" stroke-linejoin="round">' +
      '<path d="' + body + '" fill="#B5552F"' + anim('bk-fade', 2.15, .6) + '/>' +
      '<path d="' + facets + '" fill="none" stroke="#93401F" stroke-width="' + r1(.8 * k) + '"' + anim('bk-fade', 2.15, .6) + '/>' +
      '<path d="' + cone + '" fill="#EAD9BD"' + anim('bk-fade', 2.15, .6) + '/>' +
      '<path d="' + tip + '" fill="#1E1C19"' + anim('bk-fade', 2.15, .6) + '/>' +
      '<path d="' + body + ' ' + cone + '" fill="none" pathLength="1"' + anim('bk-draw', 1.8, 1) + '/>' +
      '</g>';
    [back, front].forEach(function (svg) {
      svg.setAttribute('width', PW); svg.setAttribute('height', PH);
      svg.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH);
    });
    back.innerHTML = b; front.innerHTML = f;
  }

  /* ---------- plate timelines: V004 animations, paused, timed by scroll ---------- */
  var groups = {};
  function collect() {
    void getComputedStyle(frame).width;
    for (var k = 1; k <= N; k++) {
      var roots = [SC[k]];
      if (k === 1) roots.push(lensArt);
      if (k === 2) roots.push(lensOverlay);
      var g = { anims: [], loops: [], dur: 0, t: -1 };
      roots.forEach(function (root) {
        root.getAnimations({ subtree: true }).forEach(function (a) {
          var el = a.effect && a.effect.target;
          if (el && el.hasAttribute('data-pre')) return;
          if (a.effect.getComputedTiming().iterations === Infinity) {      // V004's explanatory loops run on the clock,
            g.loops.push({ el: el, at: a.effect.getTiming().delay });       // but appear only once their plate reaches them
            return;
          }
          a.pause(); g.anims.push(a);
          g.dur = Math.max(g.dur, a.effect.getComputedTiming().endTime);
        });
      });
      groups[k] = g;
    }
  }
  function setGroup(g, q) {
    var t = Math.round(q * g.dur);
    if (t === g.t) return;
    g.t = t;
    for (var i = 0; i < g.anims.length; i++) g.anims[i].currentTime = t;
    for (i = 0; i < g.loops.length; i++) g.loops[i].el.style.visibility = t >= g.loops[i].at ? '' : 'hidden';
  }

  /* ---------- layout ---------- */
  var O = '', W = 0, H = 0, PW, PH, E, s0, C0x, C0y, th0, unit, top0 = 0, bookKey = '', modeKey = '';
  var fx = 0, fy = 0, f = 1, panMax = 0;
  function layout(force) {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!force && w === W && Math.abs(h - H) < 2) return false;
    W = w; H = h;
    var compact = W / H >= 1 && H < 560;                 // phone landscape: a readable portrait board, panned
    var o = (W / H >= 1 && !compact) ? 'l' : 'p';
    var mk = o + (compact ? 'c' : ''), changed = mk !== modeKey;
    O = o; modeKey = mk; frame.dataset.o = O; doc.classList.toggle('nb-compact', compact);
    var B = BOARD[O], U = Math.min(W, H) / 60;
    E = Math.round(3.4 * U);
    PW = W + 2 * E; PH = H + 2 * E;
    page.style.width = PW + 'px'; page.style.height = PH + 'px';

    var bar = O === 'p' ? 44 : 0;
    var fit = Math.min(W / B.w, (H - bar) / B.h);
    f = O === 'l' ? fit : Math.min(W / B.w, Math.max(fit, compact ? .6 : .5));
    panMax = Math.max(0, B.h * f - (H - bar) + 6);
    fx = E + (W - B.w * f) / 2; fy = E + bar + Math.max(0, (H - bar - B.h * f) / 2);
    page.style.backgroundSize = (26 * f) + 'px ' + (26 * f) + 'px';
    rule.style.top = (-(fy + 2 * H) / f) + 'px'; rule.style.height = ((PH + 4 * H + panMax) / f) + 'px';
    lastPan = -1; placeFrame(0);

    intro.style.transform = 'none';
    var ir = intro.getBoundingClientRect(), last = intro.lastElementChild.getBoundingClientRect();
    var x0, y0, w0;
    if (W / H >= 1) {
      x0 = Math.max(.53 * W, ir.right + .03 * W);
      w0 = Math.min(.40 * W, .93 * W - x0);
      s0 = Math.min(w0 / PW, .6 * H / PH); w0 = s0 * PW;
      y0 = (H - s0 * PH) / 2 + .03 * H;
      th0 = -1.6;
    } else {
      var top = last.bottom + Math.max(24, .035 * H);
      s0 = Math.min(.46, (H - top - .085 * H) / PH, .62 * W / PW); w0 = s0 * PW;
      x0 = (W - w0) / 2 + .02 * W; y0 = top;
      th0 = -1.3;
    }
    C0x = x0 + w0 / 2; C0y = y0 + s0 * PH / 2;
    var Fx = (C0x - s0 * W / 2) / (1 - s0), Fy = (C0y - s0 * H / 2) / (1 - s0);
    intro.style.transformOrigin = Fx + 'px ' + Fy + 'px';
    var key = [O, PW, PH, Math.round(s0 * 1000)].join();
    if (key !== bookKey) { bookKey = key; drawBook(W / H >= 1 ? 'l' : 'p', PW, PH, s0, w0); }

    unit = H / 100;
    if (!STATIC) opening.style.height = (END * unit + H) + 'px';
    top0 = opening.getBoundingClientRect().top + window.scrollY;
    if (changed) collect();
    return true;
  }
  var lastPan = -1;
  function placeFrame(pan) {
    var py = Math.round(pan * panMax);
    if (py === lastPan) return;
    lastPan = py;
    frame.style.transform = 'translate(' + fx + 'px,' + (fy - py) + 'px) scale(' + f + ')';
    page.style.backgroundPosition = (fx + 13 * f) + 'px ' + (fy - py + 13 * f) + 'px';
  }

  /* ---------- one frame of the story ---------- */
  var MIX0 = [251, 250, 247], MIX1 = [246, 241, 231];
  var plate = 1, lastBg = '', sceneState = {}, ruleLast = 0;
  function setScene(k, op, dy) {
    var s = sceneState[k] || (sceneState[k] = {});
    if (s.op === op && s.dy === dy) return;
    s.op = op; s.dy = dy;
    SC[k].style.opacity = op;
    SC[k].style.transform = dy ? 'translateY(' + dy + 'px)' : '';
    SC[k].style.visibility = op <= 0 ? 'hidden' : '';
  }
  function render(pos) {
    var r = seg(pos, CAM.a, CAM.b), c = ease(r);
    var m = Math.pow(s0, 1 - c), w = (m - s0) / (1 - s0);
    var cx = lerp(C0x, W / 2, w), cy = lerp(C0y, H / 2, w);
    var th = th0 * (1 - ease(seg(r, 0, .82)));
    world.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(' + th + 'deg) scale(' + m + ') translate(' + (-PW / 2) + 'px,' + (-PH / 2) + 'px)';

    var io = 1 - seg(r, .04, .36);
    intro.style.transform = 'scale(' + (m / s0) + ')';
    intro.style.opacity = io;
    intro.style.visibility = io <= 0 ? 'hidden' : '';
    var hideBook = c >= .999 ? 'hidden' : '';
    back.style.visibility = hideBook; front.style.visibility = hideBook;
    var k = seg(r, .15, .7), bg = 'rgb(' + MIX0.map(function (v, i) { return Math.round(lerp(v, MIX1[i], k)); }).join(',') + ')';
    doc.classList.toggle('on-paper', k > .6);
    if (bg !== lastBg) { stage.style.backgroundColor = bg; opening.style.backgroundColor = bg; lastBg = bg; }
    if (!groups[1]) return;

    // where are we: in plate `cur`, or in the transition cur → cur+1 (progress x)
    var cur = 1, x = 0, n;
    for (n = 1; n < N; n++) if (pos >= S[n].e) cur = n + 1;
    if (cur > 1 && pos < S[cur - 1].e + XL) { cur = cur - 1; x = seg(pos, S[cur].e, S[cur].e + XL); }
    var xe = ease(x), nx = Math.min(N, cur + 1);

    for (n = 1; n <= N; n++) {
      setGroup(groups[n], seg(pos, S[n].a, S[n].b));
      var inStart = n === 1 ? -1e9 : S[n - 1].e, outStart = n === N ? 1e9 : S[n].e;
      var xo = seg(pos, outStart, outStart + XL * .42);
      setScene(n, pos < inStart ? 0 : 1 - xo, -10 * xo);
    }
    lensOverlay.style.opacity = SC[2].style.opacity;

    // persistent elements, interpolated between V004 scene states
    var la = lensAt(O, cur), lb = x > 0 ? lensAt(O, nx) : la;
    var lo = cur === 2 && x > 0 ? seg(xe, .3, 1) : xe;      // V004 delays the lens fade on II → III
    lens.style.transform = 'translate(' + lerp(la.l, lb.l, xe) + 'px,' + lerp(la.t, lb.t, xe) + 'px) scale(' + lerp(la.w, lb.w, xe) / 400 + ')';
    lens.style.opacity = lerp(la.o, lb.o, lo);

    var aa = accAt(O, cur), ab = x > 0 ? accAt(O, nx) : aa, ao = lerp(aa.o, ab.o, xe), flying = cur === 6 && x > 0;
    if (cur === 7) {
      var t7 = seg(pos, S[7].a, S[7].b) * groups[7].dur / 1000;     // V004: the 7B block lands, then dissolves after 2.3 s
      ao = x > 0 ? 0 : 1 - seg(t7, 2.3, 2.9); flying = x === 0 && t7 < 3.0;
    }
    acc.style.left = lerp(aa.l, ab.l, xe) + 'px'; acc.style.top = lerp(aa.t, ab.t, xe) + 'px';
    acc.style.width = lerp(aa.w, ab.w, xe) + 'px'; acc.style.height = lerp(aa.h, ab.h, xe) + 'px';
    acc.style.opacity = ao; acc.classList.toggle('flying', flying);

    // the margin rule keeps its last place when a plate hides it (V004 placeRule)
    var ra = ruleAt(O, cur), rb = x > 0 ? ruleAt(O, nx) : ra;
    for (n = cur; n >= 1; n--) if (ruleAt(O, n) !== undefined) { ruleLast = ruleAt(O, n); break; }
    var fromL = ra === undefined ? ruleLast : ra, toL = rb === undefined ? fromL : rb;
    rule.style.left = (lerp(fromL, toL, xe) - 5) + 'px';
    rule.style.opacity = lerp(ra === undefined ? 0 : 1, rb === undefined ? 0 : 1, xe);

    // compact boards pan down the plate as it draws, and back up between plates
    if (panMax > 0) {
      var pq = pos < S[1].a ? 0 : ease(seg(seg(pos, S[cur].a, S[cur].b), .12, .95));
      placeFrame(x > 0 ? lerp(1, 0, xe) : pq);
    } else placeFrame(0);

    ctrl.classList.toggle('is-on', r >= .92 && pos < END + 30);
    var p = x > .5 ? nx : cur;
    if (p !== plate) {
      plate = p; count.textContent = (p < 10 ? '0' : '') + p + ' / 12';
      prevB.setAttribute('aria-label', L.plate + ' ' + (p - 1)); nextB.setAttribute('aria-label', L.plate + ' ' + (p + 1));
    }
  }

  /* ---------- static plates (reduced motion, ?static) ---------- */
  function buildStatic() {
    staticHost.innerHTML = '';
    for (var k = 1; k <= N; k++) {
      var fig = document.createElement('figure');
      fig.className = 'static-plate'; fig.id = 'plate-' + k; fig.dataset.n = k;
      fig.setAttribute('aria-label', SC[k].getAttribute('aria-label'));
      var fr = frame.cloneNode(true);
      fr.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
      fr.removeAttribute('id'); fr.removeAttribute('style');
      fr.querySelectorAll('.scene').forEach(function (s) { if (+s.dataset.scene !== k) s.remove(); else s.removeAttribute('style'); });
      if (k !== 2) fr.querySelector('.lens-overlay').remove();
      fig.appendChild(fr); staticHost.appendChild(fig);
    }
    world.setAttribute('aria-hidden', 'true');
  }
  function layoutStatic() {
    var cw = Math.min(staticHost.clientWidth - 32, 1280);
    var o = cw < 700 ? 'p' : 'l', B = BOARD[o], fs = cw / B.w;
    staticHost.querySelectorAll('.static-plate').forEach(function (fig) {
      var k = +fig.dataset.n, fr = fig.querySelector('.frame'), g = lensAt(o, k), a = accAt(o, k), rl = ruleAt(o, k);
      fr.dataset.o = o;
      fig.style.height = (B.h * fs) + 'px';
      fig.style.backgroundSize = (26 * fs) + 'px ' + (26 * fs) + 'px';
      fig.style.backgroundPosition = (13 * fs) + 'px ' + (13 * fs) + 'px';
      fr.style.transform = 'scale(' + fs + ')';
      var ln = fr.querySelector('.lens'); ln.style.transform = 'translate(' + g.l + 'px,' + g.t + 'px) scale(' + g.w / 400 + ')'; ln.style.opacity = g.o;
      var ac = fr.querySelector('.acc'); ac.style.cssText = 'left:' + a.l + 'px;top:' + a.t + 'px;width:' + a.w + 'px;height:' + a.h + 'px;opacity:' + (k === 5 || k === 6 ? 1 : 0);
      var ru = fr.querySelector('.rule'); ru.style.left = ((rl || 0) - 5) + 'px'; ru.style.top = '0px'; ru.style.height = B.h + 'px'; ru.style.opacity = rl === undefined ? 0 : 1;
    });
  }

  /* ---------- scroll, smoothing, controls ---------- */
  var target = 0, cur = 0, raf = 0, last = 0;
  function readScroll() { target = clamp((window.scrollY - top0) / unit, -5, END + 60); }
  function tick(now) {
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    cur += (target - cur) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - cur) < .02) cur = target;
    render(cur);
    if (cur !== target) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
  }
  function onScroll() { readScroll(); if (!raf) raf = requestAnimationFrame(tick); }
  function goTo(pos) { window.scrollTo({ top: top0 + pos * unit, behavior: 'smooth' }); }
  function goPlate(k) {
    if (k < 1) return goTo(0);
    if (k > N) return document.getElementById('contents').scrollIntoView({ behavior: 'smooth' });
    goTo(S[k].b + BUD[k][1] * .5);
  }

  function init() {
    layout(true);
    document.querySelectorAll('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (STATIC) return;
        e.preventDefault(); goPlate(+a.getAttribute('data-goto'));
      });
    });
    if (STATIC) {
      var g1 = lensAt(O, 1);
      lens.style.transform = 'translate(' + g1.l + 'px,' + g1.t + 'px) scale(' + g1.w / 400 + ')';
      rule.style.left = (RULE[O][1] - 5) + 'px';
      render(0);
      buildStatic(); layoutStatic();
      doc.classList.add('ready');
      window.addEventListener('resize', function () { if (layout()) render(0); layoutStatic(); });
      return;
    }
    readScroll(); cur = target; render(cur);
    doc.classList.add('ready');
    setTimeout(function () { settled = true; }, 3600);
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (layout()) { for (var k in groups) groups[k].t = -1; sceneState = {}; readScroll(); cur = target; render(cur); } }, 120);
    });
    prevB.addEventListener('click', function () { goPlate(plate - 1); });
    nextB.addEventListener('click', function () { goPlate(plate + 1); });
    window.MDXSketchbook = { S: S, CAM: CAM, END: END, get pos() { return cur; }, render: render, goTo: goTo, goPlate: goPlate };
  }

  init();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    if (layout(true)) { for (var k in groups) groups[k].t = -1; sceneState = {}; if (STATIC) { render(0); layoutStatic(); } else { readScroll(); cur = target; render(cur); } }
  });
})();
