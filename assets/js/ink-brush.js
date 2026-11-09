/* Ink & Instrument — procedural dry-brush engine
   ------------------------------------------------------------------
   Each stroke is simulated as a real brush on cold-press paper:

   1. Body    – the wet ink reservoir: a ragged-edged band whose width
                follows a pressure curve (land → pool → travel → lift).
   2. Hairs   – individual bristles with their own load, thickness and
                drift, giving fibrous striations and frayed edges.
   3. Tooth   – a per-pixel pass: as the brush runs dry, ink only
                catches on the peaks of the paper. Noise is stretched
                along the direction of travel, so the breakup appears
                as flying-white (飛白) streaks, never as dots or dashes.

   The stroke is rendered once off-screen, then painted onto the page
   behind a moving, rounded brush head — the viewer watches the brush
   travel; nothing is faded or wiped in.

   Public API (window.InkBrush):
     new InkBrush.Stroke(opts)          stroke model
     InkBrush.edges(card, opts)         sequential top → bottom card border
     InkBrush.paintOnce(canvas, fn, ms) one-shot animated stroke
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  /* ---------- deterministic randomness & noise ---------- */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(rand, knots) {                 // smooth 1-D noise, [0,1] → [-1,1]
    var k = [];
    for (var i = 0; i <= knots + 1; i++) k.push(rand() * 2 - 1);
    return function (x) {
      var f = Math.max(0, Math.min(0.99999, x)) * knots;
      var i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t);
      return k[i] + (k[i + 1] - k[i]) * s;
    };
  }
  function hash2(x, y, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {                     // 2-D value noise → [0,1]
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function smooth(e0, e1, x) {
    var t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function parseColor(c) {
    if (Array.isArray(c)) return c;
    var m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim());
    if (!m) return [30, 28, 25];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, k, a) {
    return 'rgba(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ',' + a + ')';
  }

  var T_END = 1.035;                              // stray hairs travel slightly past the lift

  /* ---------- stroke model ---------- */
  /* opts: x0,y0,x1,y1 (css px), width (peak css px), color, seed,
           load 0..1 (ink on the brush), dryness 0..1, bow, wobble,
           flick (px along the normal at the lift), density (hairs/px) */
  function Stroke(o) {
    var rand = rng(o.seed || 7);
    this.o = o;
    this.color = parseColor(o.color || '#1E1C19');
    var dx = o.x1 - o.x0, dy = o.y1 - o.y0;
    this.len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    this.ux = dx / this.len; this.uy = dy / this.len;
    this.nx = -this.uy; this.ny = this.ux;
    this.ang = Math.atan2(this.uy, this.ux);
    this.half = (o.width || 7) / 2;
    this.load = o.load != null ? o.load : 0.92;
    this.dry = o.dryness != null ? o.dryness : 0.55;
    this.bow = o.bow != null ? o.bow : (rand() - 0.5) * 2.4;
    this.wobAmp = o.wobble != null ? o.wobble : 0.9;
    this.flick = o.flick != null ? o.flick : -2.4;
    this.wob = noise1(rand, 4 + Math.floor(rand() * 4));
    this.wob2 = noise1(rand, 19);
    this.press = noise1(rand, 5 + Math.floor(rand() * 3));      // slow pressure swell
    this.edgeA = noise1(rand, 60 + Math.floor(rand() * 40));    // ragged upper edge
    this.edgeB = noise1(rand, 60 + Math.floor(rand() * 40));    // ragged lower edge
    this.seed = Math.floor(rand() * 1e6);

    var n = Math.max(16, Math.round((o.width || 7) * (o.density || 4.2)));
    var b = [];
    for (var i = 0; i < n; i++) {
      var u = -0.97 + 1.94 * (i + 0.5) / n + (rand() - 0.5) * (2.2 / n);
      var au = Math.abs(u);
      var stray = rand() < 0.07;
      b.push({
        u: u,
        r: 0.45 + rand() * 0.9,
        a: au > 0.78 ? 0.42 + rand() * 0.4 : 0.10 + rand() * 0.26,
        load: this.load * (0.7 + rand() * 0.3) - 0.2 * Math.pow(au, 3),
        spend: this.dry * (0.6 + rand() * 0.8),
        t0: au * au * 0.012 * rand() + rand() * 0.004,
        t1: stray ? 1.0 + rand() * (T_END - 1) : 1 - Math.pow(au, 1.5) * 0.15 - rand() * 0.05,
        stray: stray,
        drift: noise1(rand, 3 + Math.floor(rand() * 3)),
        streak: noise1(rand, 8 + Math.floor(rand() * 22)),
        shade: au > 0.78 ? 0.7 + rand() * 0.18 : 0.62 + rand() * 0.4
      });
    }
    this.bristles = b;
  }

  /* pressure → relative width */
  Stroke.prototype.W = function (t) {
    /* rounded, blunt entry: a quarter-ellipse over ~1.3 brush widths */
    var capLen = Math.max(0.004, (this.half * 2.6) / this.len);
    var c = Math.min(1, Math.max(0, t) / capLen);
    var cap = Math.sqrt(Math.max(0, 1 - (1 - c) * (1 - c)));
    var land = cap * (0.84 + 0.16 * smooth(0, 0.04, t));
    var pool = 0.16 * Math.exp(-Math.pow((t - 0.045) / 0.03, 2)); // ink pools where the brush lands
    var body = 0.86 + 0.12 * this.press(t);
    var lift = 1 - 0.93 * Math.pow(smooth(0.66, 1.03, t), 1.15);
    return Math.max(0.03, (land * body + pool) * lift);
  };

  Stroke.prototype.offset = function (t) {
    return this.bow * Math.sin(Math.PI * Math.max(0, Math.min(1, t))) +
           this.wobAmp * (this.wob(t) + 0.3 * this.wob2(t)) +
           this.flick * Math.pow(smooth(0.78, 1.04, t), 2);
  };

  Stroke.prototype.spine = function (t) {
    var o = this.o;
    var off = this.offset(t);
    return [o.x0 + this.ux * this.len * t + this.nx * off,
            o.y0 + this.uy * this.len * t + this.ny * off];
  };

  /* allocation-free spine for the per-frame path: writes into this._p */
  Stroke.prototype.spineXY = function (t) {
    var o = this.o, off = this.offset(t), p = this._p || (this._p = new Float64Array(2));
    p[0] = o.x0 + this.ux * this.len * t + this.nx * off;
    p[1] = o.y0 + this.uy * this.len * t + this.ny * off;
    return p;
  };

  /* spine sampled once every ~6px (x,y pairs), reused by every animation frame */
  Stroke.prototype.rail = function () {
    if (this._rail) return this._rail;
    var step = 6 / this.len, n = Math.ceil(T_END / step) + 1, r = new Float64Array(n * 2), i, p;
    for (i = 0; i < n; i++) { p = this.spineXY(Math.min(T_END, i * step)); r[i * 2] = p[0]; r[i * 2 + 1] = p[1]; }
    this._railStep = step;
    return (this._rail = r);
  };

  /* how wet the reservoir is at t (1 = loaded, 0 = dry) */
  Stroke.prototype.wet = function (t) {
    return Math.max(0, Math.min(1, this.load * 1.08 - this.dry * 1.05 * Math.pow(t, 1.25)));
  };

  /* --- render the whole stroke into ctx (css-px transform already set) ---
     The spine, width, offset and wetness curves are sampled once into typed
     arrays; the hair and paper-tooth passes only read from those tables. */
  Stroke.prototype.render = function (ctx, dpr) {
    var c = this.color, half = this.half, len = this.len, i, k;
    var step = 0.9 / len, n = Math.ceil(T_END / step) + 2;
    var SX = new Float64Array(n), SY = new Float64Array(n), WV = new Float64Array(n);
    for (i = 0; i < n; i++) {
      var tt0 = i * step, o0 = this.offset(tt0);
      SX[i] = this.o.x0 + this.ux * len * tt0 + this.nx * o0;
      SY[i] = this.o.y0 + this.uy * len * tt0 + this.ny * o0;
      WV[i] = this.W(Math.min(1, tt0));
    }
    var nB = Math.floor(1 / step);

    /* 1 · body: one polygon, ragged edges */
    ctx.beginPath();
    for (i = 0; i <= nB; i += 2) {
      var t = i * step, w = WV[i] * half;
      var ea = w * (0.84 + 0.15 * this.edgeA(t) + 0.05 * this.wob2(t * 3 % 1));
      if (i === 0) ctx.moveTo(SX[i] + this.nx * ea, SY[i] + this.ny * ea); else ctx.lineTo(SX[i] + this.nx * ea, SY[i] + this.ny * ea);
    }
    for (i = nB - (nB % 2); i >= 0; i -= 2) {
      var tb = i * step, wb = WV[i] * half;
      var eb = wb * (0.84 + 0.15 * this.edgeB(tb) - 0.05 * this.wob2((tb * 5 + .3) % 1));
      ctx.lineTo(SX[i] - this.nx * eb, SY[i] - this.ny * eb);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(c, 1, 0.92);
    ctx.fill();

    /* 2 · hairs: fibrous striations and frayed edges */
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var sd = this.seed, dryK = 0.55 + this.dry * 0.6;
    for (k = 0; k < this.bristles.length; k++) {
      var br = this.bristles[k], down = false, aS = 0, aN = 0, edgeHair = Math.abs(br.u) > 0.8;
      var i0 = Math.ceil(br.t0 / step), i1 = Math.min(n - 1, Math.floor(br.t1 / step));
      ctx.beginPath();
      for (i = i0; i <= i1; i++) {
        var th = i * step;
        var jitter = edgeHair ? (hash2(i * 2, k, sd) - 0.5) * 0.7 : 0;
        var off = (br.u * WV[i] + br.drift(th) * 0.06) * half + jitter;
        var x = SX[i] + this.nx * off, y = SY[i] + this.ny * off;
        var ink = br.load - br.spend * Math.pow(th, 1.3);
        if (br.stray) ink = Math.min(ink, 0.5);
        var q = ink * 1.3 - (0.62 * (0.5 + 0.5 * br.streak(th)) + 0.38 * vnoise(x / 1.4, y / 1.4, sd)) * dryK;
        if (q > 0) { if (!down) { ctx.moveTo(x, y); down = true; } else ctx.lineTo(x, y); aS += Math.min(1, 0.35 + q * 2); aN++; }
        else down = false;
      }
      if (aN) {
        ctx.strokeStyle = rgba(c, br.shade, (br.a * aS / aN * (br.stray ? 0.6 : 1)).toFixed(3));
        ctx.lineWidth = br.r * (br.stray ? 0.55 : 1);
        ctx.stroke();
      }
    }

    /* 3 · paper tooth: ink skips the valleys as the brush runs dry.
       Width / offset / wetness come from 1-px lookup tables along the stroke. */
    var cv = ctx.canvas, CW = cv.width, CH = cv.height;
    var padC = half * 1.6 + Math.abs(this.bow) + this.wobAmp * 1.4 + Math.abs(this.flick) + 3;
    var pad = Math.ceil(padC * dpr);
    var bx0 = Math.max(0, Math.floor(Math.min(this.o.x0, this.o.x1) * dpr - pad)), bx1 = Math.min(CW, Math.ceil(Math.max(this.o.x0, this.o.x1) * dpr + pad));
    var by0 = Math.max(0, Math.floor(Math.min(this.o.y0, this.o.y1) * dpr - pad)), by1 = Math.min(CH, Math.ceil(Math.max(this.o.y0, this.o.y1) * dpr + pad));
    if (bx1 <= bx0 || by1 <= by0) return;
    var P = Math.ceil(padC) + 2, nL = Math.ceil(len) + 2 * P + 2;
    var LW = new Float64Array(nL), LO = new Float64Array(nL), LD = new Float64Array(nL);
    for (k = 0; k < nL; k++) {
      var tl = (k - P) / len, tc = Math.max(0, Math.min(1, tl));
      LW[k] = this.W(tc) * half + 0.6;
      LO[k] = this.offset(Math.max(0, tl));
      LD[k] = (1 - this.wet(Math.max(0, tl))) * 0.95 + 0.05;
    }
    var img = ctx.getImageData(bx0, by0, bx1 - bx0, by1 - by0), d = img.data, iw = bx1 - bx0, ih = by1 - by0;
    var x0 = this.o.x0, y0 = this.o.y0, ux = this.ux, uy = this.uy, nx = this.nx, ny = this.ny, inv = 1 / dpr;
    for (var py = 0; py < ih; py++) {
      var cy = (by0 + py) * inv, ry = cy - y0, row = py * iw * 4;
      for (var px = 0; px < iw; px++) {
        var pidx = row + px * 4 + 3, al = d[pidx];
        if (!al) continue;
        var cx = (bx0 + px) * inv, rx = cx - x0;
        var along = rx * ux + ry * uy, across = rx * nx + ry * ny;
        var li = Math.round(along) + P;
        if (li < 0) li = 0; else if (li >= nL) li = nL - 1;
        var edge = Math.abs(across - LO[li]) / LW[li];
        if (edge > 1.4) edge = 1.4;
        /* streaks stretched along the stroke + fine speckle of the paper */
        var tooth = 0.62 * vnoise(along / 11, across / 0.85, sd) + 0.38 * vnoise(cx / 0.9, cy / 0.9, sd + 7);
        var dryness = LD[li] + 0.3 * edge * edge * Math.sqrt(edge);
        d[pidx] = al * smooth(dryness - 0.13, dryness + 0.13, tooth);
      }
    }
    ctx.putImageData(img, bx0, by0);
  };

  /* the region already painted at travel t: band along the spine + rounded brush head.
     Runs every animation frame, so it allocates nothing: it walks the cached rail. */
  Stroke.prototype.clipTo = function (ctx, t) {
    var r = this.half * 1.7 + Math.abs(this.flick) + 4, rail = this.rail(), step = this._railStep;
    var nx = this.nx * r, ny = this.ny * r, last = Math.min(rail.length / 2 - 1, Math.floor(t / step)), i;
    var bx = this.o.x0 - this.ux * r, by = this.o.y0 - this.uy * r;      /* start a little behind the entry */
    ctx.beginPath();
    ctx.moveTo(bx + nx, by + ny);
    for (i = 0; i <= last; i++) ctx.lineTo(rail[i * 2] + nx, rail[i * 2 + 1] + ny);
    var hp = this.spineXY(t), hx = hp[0], hy = hp[1];
    ctx.lineTo(hx + nx, hy + ny);
    /* rounded head, slightly flattened like a loaded brush tip. In the ellipse's rotated frame
       +y is the stroke normal, so sweep +n (where the outline arrives) -> front -> -n (where it
       leaves). Sweeping the other way self-intersects the clip and flickers pixels behind the head. */
    ctx.ellipse(hx, hy, r * 0.55, r, this.ang, Math.PI / 2, -Math.PI / 2, true);
    for (i = last; i >= 0; i--) ctx.lineTo(rail[i * 2] - nx, rail[i * 2 + 1] - ny);
    ctx.lineTo(bx - nx, by - ny);
    ctx.closePath();
    ctx.clip();
  };

  /* brush tempo: land and hold, travel, flick off */
  function tempo(x) {
    if (x <= 0) return 0;
    if (x >= 1) return T_END;
    var hold = 0.09;
    if (x < hold) return 0.012 * Math.sin((x / hold) * Math.PI / 2);
    var s = (x - hold) / (1 - hold);
    var p = 0.28 * s + 0.72 * (1 - Math.pow(1 - s, 2.4));
    return 0.012 + (T_END - 0.012) * p;
  }

  /* ---------- canvas plumbing ---------- */
  function fit(canvas) {
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext('2d', { willReadFrequently: false });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr, canvas: canvas };
  }

  /* render a stroke into an off-screen canvas of the same size as `target` */
  var stats = { bakes: 0, bakeMs: 0, maxBakeMs: 0, canvases: 0 };
  function bake(target, stroke, reuse) {
    var t0 = global.performance ? performance.now() : 0;
    var off = reuse || document.createElement('canvas');
    if (!reuse) stats.canvases++;
    if (off.width !== target.canvas.width || off.height !== target.canvas.height) {
      off.width = target.canvas.width; off.height = target.canvas.height;     /* resizing also clears */
    }
    var octx = off.getContext('2d', { willReadFrequently: true });
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, off.width, off.height);
    octx.setTransform(target.dpr, 0, 0, target.dpr, 0, 0);
    stroke.render(octx, target.dpr);
    if (t0) { var ms = performance.now() - t0; stats.bakes++; stats.bakeMs += ms; if (ms > stats.maxBakeMs) stats.maxBakeMs = ms; }
    return off;
  }

  function blit(target, baked, stroke, t) {
    var ctx = target.ctx;
    ctx.save();
    ctx.setTransform(target.dpr, 0, 0, target.dpr, 0, 0);
    ctx.clearRect(0, 0, target.w, target.h);
    if (t < T_END) stroke.clipTo(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(baked, 0, 0);
    ctx.restore();
  }

  /* animate the brush across a baked stroke; returns cancel() */
  function travel(target, baked, stroke, duration, done) {
    var start = 0, raf = 0, cancelled = false;
    function frame(now) {
      if (cancelled) return;
      if (!start) start = now;
      var x = (now - start) / duration;
      blit(target, baked, stroke, tempo(Math.min(1, x)));
      if (x < 1) raf = requestAnimationFrame(frame);
      else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelled = true; cancelAnimationFrame(raf); };
  }

  var reduceMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- sequential card border: top, then bottom ---------- */
  function edges(card, opts) {
    opts = opts || {};
    var pad = opts.pad || 18, strip = opts.strip || 40;
    var topMs = opts.topMs || 680, gapMs = opts.gapMs || 120, botMs = opts.botMs || 620, liftMs = opts.liftMs || 320;
    function color() { return opts.color || getComputedStyle(card).getPropertyValue('--ink-brush').trim() || '#1E1C19'; }

    var host = document.createElement('div');
    host.className = 'ink-edges';
    host.setAttribute('aria-hidden', 'true');
    host.style.setProperty('--ink-pad', pad + 'px');
    host.style.setProperty('--ink-strip', strip + 'px');
    host.innerHTML = '<canvas class="ink-edges__top"></canvas><canvas class="ink-edges__bottom"></canvas>';
    card.appendChild(host);
    var cTop = host.firstChild, cBot = host.lastChild;

    var state = 'idle', cancel = null, timers = [], seed = opts.seed || ((Math.random() * 1e9) | 0);
    var plan = null, planW = 0;
    var bottomLTR = opts.bottomDir === 'ltr';      /* default: the return pass travels right to left */
    var offTop = null, offBot = null;               /* off-screen bake canvases, reused for every hover */

    function makePlan() {
      var a = fit(cTop), b = fit(cBot);
      var W = a.w - pad * 2, y = strip / 2, r = rng(seed), col = color();
      var peak = Math.max(5.4, Math.min(9.6, W * 0.0081));
      var sTop = new Stroke({
        x0: pad - 6 - r() * 5, y0: y + (r() - 0.5) * 1.4,
        x1: pad + W + 2 + r() * 7, y1: y + (r() - 0.5) * 2.6,
        width: peak, color: col, seed: seed + 11,
        load: 0.97, dryness: 0.62, flick: -(2 + r() * 1.8), wobble: 0.8
      });
      /* second pass, the brush a little drier. The lifting tail always flicks
         away from the content: up on the top edge, down on the bottom edge. */
      var land = pad + W + 5 + r() * 5, leave = pad - 3 - r() * 7, by0 = y + (r() - 0.5) * 1.4, by1 = y + (r() - 0.5) * 2.6;
      var mag = 2 + r() * 1.6;
      var sBot = new Stroke({
        x0: bottomLTR ? leave - 3 : land, y0: by0,
        x1: bottomLTR ? land - 3 : leave, y1: by1,
        width: peak * 0.9, color: col, seed: seed + 29,
        load: 0.92, dryness: 0.68, flick: bottomLTR ? mag : -mag, wobble: 0.85
      });
      planW = a.w;
      offTop = bake(a, sTop, offTop);
      offBot = bake(b, sBot, offBot);
      return { a: a, b: b, sTop: sTop, sBot: sBot, top: offTop, bot: offBot };
    }
    function ensurePlan() {
      var wNow = Math.round(cTop.getBoundingClientRect().width);
      if (!plan || wNow !== planW) plan = makePlan();
      return plan;
    }
    function bakeIfIdle() { if (state === 'idle' && !plan) plan = makePlan(); }
    function prepareNext() {           /* bake the next, different stroke while idle */
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      plan = null;
      if (global.requestIdleCallback) requestIdleCallback(bakeIfIdle, { timeout: 600 }); else setTimeout(bakeIfIdle, 60);
    }
    function clearCanvas(cv) { var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); }
    function clearTimers() { for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]); timers.length = 0; }
    function clearAll() {
      clearTimers();
      if (cancel) { cancel(); cancel = null; }
      clearCanvas(cTop); clearCanvas(cBot);
    }
    function set(s) { state = s; card.setAttribute('data-ink', s); }

    function play() {
      if (state === 'top' || state === 'gap' || state === 'bottom' || state === 'held') return;
      clearAll();
      host.classList.remove('is-lifting');
      var P = ensurePlan();
      card.classList.add('is-inked');
      if (reduceMotion) { blit(P.a, P.top, P.sTop, T_END); blit(P.b, P.bot, P.sBot, T_END); set('held'); return; }
      set('top');
      cancel = travel(P.a, P.top, P.sTop, topMs, function () {
        cancel = null;
        if (state !== 'top') return;
        set('gap');                                   /* the brush lifts and moves to the other edge */
        timers.push(setTimeout(function () {
          if (state !== 'gap') return;
          set('bottom');
          cancel = travel(P.b, P.bot, P.sBot, botMs, function () {
            cancel = null;
            if (state === 'bottom') set('held');
          });
        }, gapMs));
      });
    }

    function lift() {
      if (state === 'idle' || state === 'lifting') return;
      clearTimers();
      if (cancel) { cancel(); cancel = null; }
      card.classList.remove('is-inked');
      if (reduceMotion) { clearAll(); set('idle'); prepareNext(); return; }
      set('lifting');
      host.classList.add('is-lifting');
      timers.push(setTimeout(function () {
        if (state !== 'lifting') return;
        clearAll();
        host.classList.remove('is-lifting');
        set('idle');
        prepareNext();
      }, liftMs));
    }

    if ('ResizeObserver' in global) {
      new ResizeObserver(function () {
        if (state === 'held') { plan = null; var P = ensurePlan(); blit(P.a, P.top, P.sTop, T_END); blit(P.b, P.bot, P.sBot, T_END); }
      }).observe(card);
    }

    set('idle');
    /* bake the first stroke ahead of the first hover */
    if (global.requestIdleCallback) requestIdleCallback(bakeIfIdle, { timeout: 1200 }); else setTimeout(bakeIfIdle, 200);

    /* QA / storyboard only: freeze the brush at exact travel positions (0..1) */
    function pose(topT, botT) {
      clearAll();
      var P = ensurePlan();
      if (topT > 0) blit(P.a, P.top, P.sTop, tempo(Math.min(1, topT)));
      if (botT > 0) blit(P.b, P.bot, P.sBot, tempo(Math.min(1, botT)));
      set('pose');
    }

    return { play: play, lift: lift, pose: pose, state: function () { return state; }, host: host };
  }

  /* ---------- bake now, paint later: keeps heavy work out of an opening sequence ---------- */
  function prepareOnce(canvas, make) {
    var target = fit(canvas);
    var s = new Stroke(make(target.w, target.h));
    var baked = bake(target, s);
    return function run(duration, done) {
      if (reduceMotion || !duration) { blit(target, baked, s, T_END); if (done) done(); return function () {}; }
      return travel(target, baked, s, duration, done);
    };
  }

  /* ---------- one-shot stroke (hero swash, section marks) ---------- */
  function paintOnce(canvas, make, duration, done) {
    var target = fit(canvas);
    var s = new Stroke(make(target.w, target.h));
    var baked = bake(target, s);
    if (reduceMotion || !duration) { blit(target, baked, s, T_END); if (done) done(); return function () {}; }
    return travel(target, baked, s, duration, done);
  }

  global.InkBrush = {
    Stroke: Stroke, rng: rng, tempo: tempo, fit: fit, bake: bake, blit: blit, travel: travel,
    edges: edges, paintOnce: paintOnce, prepareOnce: prepareOnce, reduceMotion: reduceMotion, T_END: T_END, stats: stats
  };
})(window);
