// Core engine: deterministic time-based rendering.
// Every frame is a pure function of time t, so the browser preview and the
// frame-by-frame video render always produce identical images.
(function () {
  const RA = (window.RA = window.RA || {});

  RA.W = 1920;
  RA.H = 1080;

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => clamp((v - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  RA.math = { clamp, lerp, invLerp, smooth };

  RA.ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };

  // Keyframe track: key(t, [[0, 0], [2, 100, 'inOut'], [5, 40]])
  // Each key is [time, value, easingIntoThisKey]. Values may be numbers or arrays.
  RA.key = function (t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      const [t0, v0] = keys[i - 1];
      if (t <= t1) {
        const k = (RA.ease[e || 'inOut'])((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  };

  // ---------- deterministic randomness / noise ----------
  RA.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  const hash = (i, seed) => {
    let h = (i * 374761393 + seed * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  RA.noise1 = function (x, seed = 0) {
    const i = Math.floor(x), f = x - i;
    return lerp(hash(i, seed), hash(i + 1, seed), smooth(f)) * 2 - 1;
  };
  RA.fbm = function (x, seed = 0, oct = 5) {
    let a = 0, amp = 0.5, fr = 1;
    for (let o = 0; o < oct; o++) { a += amp * RA.noise1(x * fr, seed + o * 31); amp *= 0.5; fr *= 2.03; }
    return a;
  };

  // ---------- color ----------
  RA.color = {
    hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; },
    mix(a, b, t) {
      const A = typeof a === 'string' ? this.hex(a) : a, B = typeof b === 'string' ? this.hex(b) : b;
      return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
    },
    rgba(h, a) { const [r, g, b] = this.hex(h); return `rgba(${r},${g},${b},${a})`; },
  };

  // ---------- offscreen cache ----------
  // Static scenery (mountains, forests, walls) is painted once, then reused.
  const cache = new Map();
  RA.cached = function (id, w, h, paint) {
    if (!cache.has(id)) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w); c.height = Math.ceil(h);
      paint(c.getContext('2d'), c.width, c.height);
      cache.set(id, c);
    }
    return cache.get(id);
  };

  // ---------- camera & parallax ----------
  // Camera {x, y, zoom}. A layer at depth d (0 = sky at infinity, 1 = camera plane)
  // moves d * camera offset and scales 1 + (zoom - 1) * d around screen centre.
  RA.withLayer = function (ctx, cam, d, fn) {
    const s = 1 + (cam.zoom - 1) * d;
    ctx.save();
    ctx.translate(RA.W / 2, RA.H / 2);
    ctx.scale(s, s);
    ctx.translate(-RA.W / 2 - cam.x * d, -RA.H / 2 - cam.y * d);
    fn(ctx);
    ctx.restore();
  };

  // ---------- post-processing ----------
  RA.post = {
    vignette(ctx, strength = 0.55) {
      const g = ctx.createRadialGradient(RA.W / 2, RA.H / 2, RA.H * 0.35, RA.W / 2, RA.H / 2, RA.H * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${strength})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, RA.W, RA.H);
    },
    grade(ctx, color, alpha, mode = 'soft-light') {
      ctx.save();
      ctx.globalCompositeOperation = mode;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, RA.W, RA.H);
      ctx.restore();
    },
    letterbox(ctx, aspect = 2.39) {
      const bar = Math.round((RA.H - RA.W / aspect) / 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, RA.W, bar);
      ctx.fillRect(0, RA.H - bar, RA.W, bar);
      return bar;
    },
    fade(ctx, a) {
      if (a <= 0) return;
      ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`;
      ctx.fillRect(0, 0, RA.W, RA.H);
    },
  };

  // ---------- text ----------
  RA.text = {
    title(ctx, str, y, alpha, opts = {}) {
      if (alpha <= 0) return;
      const size = opts.size || 120, spacing = opts.spacing ?? 0.18;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${opts.weight || 600} ${size}px Cinzel`;
      ctx.letterSpacing = `${size * spacing}px`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = opts.glow || 'rgba(255,214,150,0.55)';
      ctx.shadowBlur = size * 0.35;
      ctx.fillStyle = opts.color || '#f1e3c4';
      ctx.textAlign = opts.align || 'center';
      ctx.fillText(str, (opts.x ?? RA.W / 2) + (ctx.textAlign === 'center' ? size * spacing / 2 : 0), y);
      ctx.restore();
    },
    line(ctx, x1, x2, y, alpha) {
      if (alpha <= 0) return;
      ctx.save();
      const g = ctx.createLinearGradient(x1, 0, x2, 0);
      g.addColorStop(0, 'rgba(241,227,196,0)');
      g.addColorStop(0.5, `rgba(241,227,196,${0.8 * alpha})`);
      g.addColorStop(1, 'rgba(241,227,196,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x1, y - 1, x2 - x1, 2);
      ctx.restore();
    },
    // Narration subtitle, sits just above the lower letterbox bar.
    caption(ctx, str, alpha, bar = 138) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'italic 500 46px "Cormorant Garamond"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#efe6d2';
      ctx.fillText(str, RA.W / 2, RA.H - bar - 34);
      ctx.restore();
    },
  };

  // Fade-in/out envelope: 0 before a, ramps to 1 over fi, holds, ramps to 0 ending at b.
  RA.env = (t, a, b, fi = 0.8, fo = 0.8) => clamp(Math.min((t - a) / fi, (b - t) / fo));

  // ---------- timeline ----------
  // An episode is a list of shots: { name, duration, draw(ctx, t, T) }
  // t = local time inside the shot, T = global episode time.
  RA.timeline = function (shots) {
    let acc = 0;
    const list = shots.map((s) => { const o = { ...s, start: acc }; acc += s.duration; return o; });
    return {
      shots: list,
      duration: acc,
      draw(ctx, T) {
        const s = list.find((x) => T < x.start + x.duration) || list[list.length - 1];
        ctx.save();
        ctx.clearRect(0, 0, RA.W, RA.H);
        s.draw(ctx, T - s.start, T);
        ctx.restore();
      },
    };
  };
})();
