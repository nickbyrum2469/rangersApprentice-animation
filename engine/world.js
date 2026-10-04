// Scenery library: sky, moon, stars, ridgelines, forests, castle, fog, walls, particles.
(function () {
  const RA = window.RA;
  const { lerp, clamp } = RA.math;
  const W = () => RA.W, H = () => RA.H;

  const world = (RA.world = {});

  // Shared night palette. Episodes can pass their own.
  world.NIGHT = {
    skyTop: '#060a18', skyMid: '#14213f', skyLow: '#33476e', horizonGlow: '#6f7fa3',
    moon: '#f6eedb', moonGlow: '#b9c6e6',
    far: '#3b4c6e', mid: '#25324f', near: '#141c30', fore: '#06090f',
    window: '#ffb45e', fire: '#ff8a3c', rim: '#9fb3dc',
  };

  // ---------- sky ----------
  world.sky = function (ctx, p, shift = 0) {
    const g = ctx.createLinearGradient(0, -200 - shift, 0, H() - shift * 0.3);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.55, p.skyMid);
    g.addColorStop(0.85, p.skyLow);
    g.addColorStop(1, p.horizonGlow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W(), H());
  };

  world.stars = function (ctx, t, { seed = 7, count = 420, w = 2600, h = 1500, x0 = -340, y0 = -900, alpha = 1 } = {}) {
    const r = RA.rng(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const x = x0 + r() * w, y = y0 + r() * h, s = Math.pow(r(), 3) * 2.4 + 0.5;
      const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + r() * 2.5) + r() * 6.28);
      // fade stars toward the horizon
      const hz = clamp(1 - (y - y0) / h * 0.9);
      ctx.globalAlpha = alpha * tw * hz * (0.35 + r() * 0.65);
      ctx.fillStyle = r() > 0.85 ? '#ffe9c7' : '#dfe8ff';
      ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill();
      if (s > 2.2) { // a few bright stars get a cross glint
        ctx.globalAlpha *= 0.4;
        ctx.fillRect(x - s * 4, y - 0.5, s * 8, 1);
        ctx.fillRect(x - 0.5, y - s * 4, 1, s * 8);
      }
    }
    ctx.restore();
  };

  world.moon = function (ctx, x, y, r, p) {
    // wide atmospheric halo
    let g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 9);
    g.addColorStop(0, RA.color.rgba(p.moonGlow, 0.35));
    g.addColorStop(0.25, RA.color.rgba(p.moonGlow, 0.12));
    g.addColorStop(1, RA.color.rgba(p.moonGlow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
    // disc with subtle maria
    const disc = RA.cached('moon' + r, r * 2 + 4, r * 2 + 4, (c, cw) => {
      const cx = cw / 2;
      const dg = c.createRadialGradient(cx - r * 0.3, cx - r * 0.3, r * 0.1, cx, cx, r);
      dg.addColorStop(0, '#fffaf0'); dg.addColorStop(1, p.moon);
      c.fillStyle = dg; c.beginPath(); c.arc(cx, cx, r, 0, 6.283); c.fill();
      c.save(); c.clip();
      const rr = RA.rng(91);
      for (let i = 0; i < 14; i++) {
        const mx = cx + (rr() - 0.5) * r * 1.3, my = cx + (rr() - 0.5) * r * 1.3, mr = r * (0.1 + rr() * 0.3);
        const mg = c.createRadialGradient(mx, my, 0, mx, my, mr);
        mg.addColorStop(0, `rgba(150,160,185,${0.12 + rr() * 0.12})`); mg.addColorStop(1, 'rgba(150,160,185,0)');
        c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, 6.283); c.fill();
      }
      c.restore();
    });
    ctx.save();
    ctx.shadowColor = p.moon; ctx.shadowBlur = r * 0.8;
    ctx.drawImage(disc, x - disc.width / 2, y - disc.height / 2);
    ctx.restore();
  };

  // Soft drifting clouds lit from beneath by the moon.
  world.clouds = function (ctx, t, { seed = 3, count = 7, y = 200, spread = 220, speed = 6, alpha = 0.5, color = '#8a98bb', w = 2600, x0 = -340 } = {}) {
    const puff = RA.cached('cloudpuff', 256, 256, (c) => {
      const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    });
    const tint = RA.cached('cloudpuff' + color, 256, 256, (c) => {
      c.drawImage(puff, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, 256, 256);
    });
    const r = RA.rng(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const cx = x0 + ((r() * w + t * speed * (0.6 + r())) % w), cy = y + (r() - 0.5) * spread;
      const cw = 500 + r() * 700, ch = cw * (0.12 + r() * 0.08);
      for (let k = 0; k < 9; k++) {
        ctx.globalAlpha = alpha * (0.25 + r() * 0.35);
        const pw = cw * (0.3 + r() * 0.4);
        ctx.drawImage(tint, cx + (r() - 0.5) * cw * 0.8 - pw / 2, cy + (r() - 0.5) * ch - ch / 2, pw, ch * (0.8 + r() * 0.8));
      }
    }
    ctx.restore();
  };

  // ---------- trees ----------
  world.pine = function (c, x, y, h, r) {
    const w = h * (0.32 + r() * 0.1);
    c.beginPath();
    c.moveTo(x - h * 0.02, y);
    c.lineTo(x - h * 0.02, y - h * 0.12);
    const tiers = 6 + Math.floor(r() * 4);
    // left edge down → up, jagged
    for (let i = 0; i < tiers; i++) {
      const k = i / tiers, ty = y - h * (0.1 + k * 0.88);
      const tw = w * (1 - k) * (0.85 + r() * 0.3);
      c.lineTo(x - tw, ty + h * 0.02);
      c.lineTo(x - tw * 0.45, ty - h * 0.05);
    }
    c.lineTo(x, y - h);
    for (let i = tiers - 1; i >= 0; i--) {
      const k = i / tiers, ty = y - h * (0.1 + k * 0.88);
      const tw = w * (1 - k) * (0.85 + r() * 0.3);
      c.lineTo(x + tw * 0.45, ty - h * 0.05);
      c.lineTo(x + tw, ty + h * 0.02);
    }
    c.lineTo(x + h * 0.02, y - h * 0.12);
    c.lineTo(x + h * 0.02, y);
    c.closePath();
    c.fill();
  };

  world.oak = function (c, x, y, h, r) {
    c.fillRect(x - h * 0.04, y - h * 0.5, h * 0.08, h * 0.5);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI, d = r() * h * 0.3;
      c.beginPath();
      c.arc(x + Math.cos(a) * d * 1.2, y - h * 0.62 - Math.sin(a) * d, h * (0.12 + r() * 0.12), 0, 6.283);
      c.fill();
    }
  };

  // ---------- ridgelines ----------
  // Paints a mountain / hill band with optional forest along its crest.
  // Returns { img, yAt(x) } so characters/props can stand on the ground line.
  world.ridge = function (o) {
    const id = 'ridge:' + o.id;
    const w = o.width || 2800, h = o.height || 900;
    const yAt = (x) => o.base + RA.fbm(x / (o.freq || 900), o.seed || 1, 5) * (o.amp || 150) + (o.slope ? o.slope(x) : 0);
    const img = RA.cached(id, w, h, (c) => {
      const r = RA.rng((o.seed || 1) * 77);
      // body
      c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) c.lineTo(x, yAt(x));
      c.lineTo(w, h); c.closePath();
      const g = c.createLinearGradient(0, o.base - (o.amp || 150), 0, h);
      g.addColorStop(0, o.top || o.color); g.addColorStop(0.35, o.color); g.addColorStop(1, o.bottom || o.color);
      c.fillStyle = g; c.fill();
      // forest along the crest
      if (o.trees) {
        c.fillStyle = o.treeColor || o.color;
        const { spacing = 14, size = 60, jitter = 0.5, oaks = 0.15, gaps, rows = 1, rowGap = 0.5 } = o.trees;
        for (let row = 0; row < rows; row++) {
          for (let x = -20; x < w + 20; x += spacing * (0.5 + r())) {
            if (gaps && gaps.some(([a, b]) => x > a && x < b)) continue;
            if (row > 0 && r() < 0.35) continue;
            const hh = size * (1 - jitter / 2 + r() * jitter);
            (r() < oaks ? world.oak : world.pine)(c, x, yAt(x) + hh * 0.12 + r() * size * 0.3 + row * size * rowGap, hh, r);
          }
        }
      }
      // moonlit rim: a thin bright line along the crest, fading a short way down the slope
      if (o.rim) {
        c.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 4; i++) {
          c.strokeStyle = RA.color.rgba(o.rim, [0.45, 0.18, 0.08, 0.04][i]);
          c.lineWidth = [2.5, 8, 22, 50][i];
          c.beginPath();
          for (let x = 0; x <= w; x += 6) c.lineTo(x, yAt(x) + c.lineWidth / 2);
          c.stroke();
        }
      }
    });
    return { img, yAt, w, h };
  };

  // Haze band: makes depth by fogging the base of a layer.
  world.haze = function (ctx, y, height, color, alpha, x0 = -400, w = 2800) {
    const g = ctx.createLinearGradient(0, y - height, 0, y + height * 0.4);
    g.addColorStop(0, RA.color.rgba(color, 0));
    g.addColorStop(0.7, RA.color.rgba(color, alpha));
    g.addColorStop(1, RA.color.rgba(color, alpha * 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y - height, w, height * 1.4);
  };

  // Rolling fog wisps.
  world.fog = function (ctx, t, { y = 800, spread = 80, count = 14, seed = 5, color = '#8fa0c4', alpha = 0.18, speed = 18, w = 2800, x0 = -400, size = 900 } = {}) {
    const puff = RA.cached('fogpuff', 512, 128, (c) => {
      const g = c.createRadialGradient(256, 64, 0, 256, 64, 256);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.setTransform(1, 0, 0, 0.25, 0, 48);
      c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    });
    const tint = RA.cached('fogpuff' + color, 512, 128, (c) => {
      c.drawImage(puff, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, 512, 128);
    });
    const r = RA.rng(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const sp = speed * (0.5 + r());
      const x = x0 + (((r() * w + t * sp) % w) + w) % w - size / 2;
      const yy = y + (r() - 0.5) * spread + Math.sin(t * 0.3 + i) * 6;
      ctx.globalAlpha = alpha * (0.5 + r() * 0.5) * (0.75 + 0.25 * Math.sin(t * 0.4 + i * 1.7));
      ctx.drawImage(tint, x, yy - size * 0.125, size * (0.8 + r() * 0.6), size * 0.25);
    }
    ctx.restore();
  };

  // ---------- castle ----------
  // Castle Redmont: a hilltop fortress with a tall keep. (x, y) = centre of its base.
  world.castle = function (ctx, t, x, y, s, p, opts = {}) {
    const body = RA.cached('castle' + s + (opts.color || p.near), 900 * s, 1000 * s, (c) => {
      c.scale(s, s);
      c.fillStyle = opts.color || p.near;
      const bx = 450, by = 700;
      c.fillRect(bx - 400, by - 2, 800, 300); // foundations / rock the castle stands on
      const crenel = (x0, y0, w) => { for (let i = x0; i < x0 + w - 6; i += 16) c.fillRect(i, y0 - 12, 9, 12); };
      const tower = (cx, w, h, roof) => {
        c.fillRect(cx - w / 2, by - h, w, h);
        if (roof) {
          c.beginPath(); c.moveTo(cx - w / 2 - 8, by - h); c.lineTo(cx, by - h - w * 1.3); c.lineTo(cx + w / 2 + 8, by - h); c.fill();
        } else { c.fillRect(cx - w / 2 - 5, by - h - 6, w + 10, 8); crenel(cx - w / 2 - 5, by - h - 6, w + 10); }
      };
      // curtain wall
      c.fillRect(bx - 380, by - 170, 760, 170); crenel(bx - 380, by - 170, 760);
      tower(bx - 380, 70, 250, true);
      tower(bx + 380, 70, 250, true);
      tower(bx - 200, 60, 230, false);
      tower(bx + 210, 60, 230, false);
      // gatehouse
      tower(bx - 40, 120, 220, false);
      // keep, with the tall tower where the Baron keeps his office
      c.fillRect(bx + 20, by - 400, 200, 400); crenel(bx + 15, by - 400, 210);
      tower(bx + 120, 80, 560, true);
      // flagpole
      c.fillRect(bx + 119, by - 560 - 104 - 70, 3, 70);
      // gate arch cut-out (warm)
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(bx - 40, by - 60, 22, Math.PI, 0); c.rect(bx - 62, by - 60, 44, 60); c.fill();
    });
    ctx.drawImage(body, x - body.width / 2, y - 700 * s);

    // live elements: flickering windows, gate glow, banner
    const ox = x - 450 * s, oy = y - 700 * s;
    const wins = opts.windows || [
      [535, 470], [565, 470], [600, 430], [535, 380], [600, 330], [570, 250], [570, 330], [570, 400],
      [270, 560], [310, 600], [655, 600], [70, 520], [830, 510], [400, 560],
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    wins.forEach(([wx, wy], i) => {
      const f = 0.75 + 0.25 * RA.noise1(t * 3 + i * 9.3, i);
      const X = ox + wx * s, Y = oy + wy * s;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, 26 * s);
      g.addColorStop(0, RA.color.rgba(p.window, 0.55 * f)); g.addColorStop(1, RA.color.rgba(p.window, 0));
      ctx.fillStyle = g; ctx.fillRect(X - 26 * s, Y - 26 * s, 52 * s, 52 * s);
      ctx.fillStyle = RA.color.rgba('#ffd9a0', 0.9 * f);
      ctx.fillRect(X - 3 * s, Y - 6 * s, 6 * s, 11 * s);
    });
    // gate
    const gf = 0.8 + 0.2 * RA.noise1(t * 4, 77);
    const GX = ox + 410 * s, GY = oy + 680 * s;
    const gg = ctx.createRadialGradient(GX, GY, 0, GX, GY, 90 * s);
    gg.addColorStop(0, RA.color.rgba(p.fire, 0.6 * gf)); gg.addColorStop(1, RA.color.rgba(p.fire, 0));
    ctx.fillStyle = gg; ctx.fillRect(GX - 90 * s, GY - 90 * s, 180 * s, 180 * s);
    ctx.restore();
    // banner on keep
    ctx.save();
    ctx.fillStyle = opts.color || p.near;
    const fx = ox + 122 * s, fy = oy + (700 - 734) * s;
    ctx.beginPath(); ctx.moveTo(fx, fy);
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      ctx.lineTo(fx + k * 60 * s, fy + Math.sin(t * 5 - k * 4) * 5 * s * k);
    }
    for (let i = 10; i >= 0; i--) {
      const k = i / 10;
      ctx.lineTo(fx + k * 60 * s, fy + 26 * s - k * 6 * s + Math.sin(t * 5 - k * 4) * 5 * s * k);
    }
    ctx.fill();
    ctx.restore();
  };

  // ---------- stone wall (close-ups) ----------
  world.stoneWall = function (id, w, h, seed = 11) {
    return RA.cached('wall:' + id, w, h, (c) => {
      const r = RA.rng(seed);
      c.fillStyle = '#0c101b'; c.fillRect(0, 0, w, h);
      let y = 0;
      while (y < h) {
        const bh = 55 + r() * 55;
        let x = -r() * 120;
        while (x < w) {
          const bw = bh * (1.2 + r() * 1.6);
          const l = 30 + r() * 26, tint = r() * 8;
          // jittered polygon: rough-hewn edges
          const pts = [], n = 14, cx = x + bw / 2, cy = y + bh / 2;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * 2 * Math.PI;
            const ex = Math.cos(a), ey = Math.sin(a);
            const sq = Math.pow(Math.abs(ex), 0.35) * Math.sign(ex), sy = Math.pow(Math.abs(ey), 0.35) * Math.sign(ey);
            pts.push([cx + sq * (bw / 2 - 5 - r() * 4), cy + sy * (bh / 2 - 5 - r() * 4)]);
          }
          c.beginPath(); c.moveTo(...pts[0]); pts.forEach((p) => c.lineTo(...p)); c.closePath();
          const g = c.createLinearGradient(x, y, x + bw * 0.4, y + bh);
          g.addColorStop(0, `rgb(${l + 10 + tint},${l + 14 + tint * 0.5},${l + 30})`);
          g.addColorStop(1, `rgb(${l - 12 + tint},${l - 10},${l + 2})`);
          c.fillStyle = g; c.fill();
          c.save(); c.clip();
          c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + bh - 9, bw, 9);          // underside shadow
          c.fillStyle = 'rgba(190,205,240,0.10)'; c.fillRect(x, y, bw, 5);           // moonlit top edge
          for (let k = 0; k < 26; k++) {                                              // pits & weathering
            c.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(190,205,240,0.05)';
            c.beginPath(); c.arc(x + r() * bw, y + r() * bh, 1 + r() * 4, 0, 6.283); c.fill();
          }
          if (r() < 0.07) { c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + r() * bw, y); c.lineTo(x + r() * bw, y + bh * (0.4 + r() * 0.6)); c.stroke(); }
          if (r() < 0.14) { c.fillStyle = 'rgba(40,72,52,0.35)'; c.beginPath(); c.ellipse(x + bw * r(), y + bh * 0.9, bw * 0.35, bh * 0.25, 0, 0, 6.283); c.fill(); }
          c.restore();
          x += bw;
        }
        y += bh;
      }
    });
  };

  // Ivy vine: returns a cached image plus the climbing path so a character can follow it.
  world.ivy = function (id, w, h, path, seed = 4) {
    return RA.cached('ivy:' + id, w, h, (c) => {
      const r = RA.rng(seed);
      const stem = (pts, width) => {
        c.lineWidth = width; c.lineCap = 'round'; c.strokeStyle = '#0b1410';
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(([x, y]) => c.lineTo(x, y)); c.stroke();
      };
      const pts = [];
      for (let i = 0; i <= 200; i++) { const k = i / 200; pts.push([path(k)[0] + RA.noise1(k * 14, seed) * 18, path(k)[1]]); }
      stem(pts, 9);
      // tendrils & leaves
      for (let i = 0; i < 260; i++) {
        const k = r(), [px, py] = path(k);
        const ax = px + (r() - 0.5) * 220, ay = py + (r() - 0.5) * 120;
        c.lineWidth = 2.5; c.strokeStyle = '#0d1813';
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo((px + ax) / 2, py - 20, ax, ay); c.stroke();
        const n = 2 + Math.floor(r() * 3);
        for (let j = 0; j < n; j++) {
          const lx = lerp(px, ax, 0.4 + r() * 0.6), ly = lerp(py, ay, 0.4 + r() * 0.6), ls = 9 + r() * 10;
          const lit = r();
          c.fillStyle = lit > 0.7 ? '#2c4a3a' : lit > 0.35 ? '#1a3026' : '#10201a';
          c.save(); c.translate(lx, ly); c.rotate(r() * 6.28);
          c.beginPath(); c.moveTo(0, 0);
          c.bezierCurveTo(ls, -ls * 0.6, ls, ls * 0.6, 0, ls * 1.3);
          c.bezierCurveTo(-ls, ls * 0.6, -ls, -ls * 0.6, 0, 0); c.fill();
          c.restore();
        }
      }
    });
  };

  // Arched window with warm interior light spilling onto the wall.
  world.window = function (ctx, t, x, y, w, h, p) {
    const f = 0.85 + 0.15 * RA.noise1(t * 2.5, 42);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, w * 0.2, x, y + h * 0.3, w * 4.5);
    g.addColorStop(0, RA.color.rgba(p.window, 0.42 * f)); g.addColorStop(0.4, RA.color.rgba(p.window, 0.12 * f)); g.addColorStop(1, RA.color.rgba(p.window, 0));
    ctx.fillStyle = g; ctx.fillRect(x - w * 5, y - w * 5, w * 10, w * 10);
    ctx.restore();
    // frame and sill
    ctx.fillStyle = '#0c0f18';
    ctx.beginPath(); ctx.rect(x - w / 2 - 16, y - h / 2, w + 32, h + 10); ctx.arc(x, y - h / 2, w / 2 + 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - w / 2 - 30, y + h / 2, w + 60, 22);
    // glass
    const gl = ctx.createLinearGradient(0, y - h, 0, y + h / 2);
    gl.addColorStop(0, `rgba(255,214,150,${0.9 * f})`); gl.addColorStop(1, `rgba(255,150,70,${0.95 * f})`);
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.arc(x, y - h / 2, w / 2, Math.PI, 0); ctx.fill();
    // mullions
    ctx.fillStyle = '#120d0a';
    ctx.fillRect(x - 3, y - h / 2 - w / 2, 6, h + w / 2);
    ctx.fillRect(x - w / 2, y - 3, w, 6);
  };

  // ---------- particles ----------
  // Deterministic: position derived from t, so scrubbing works.
  world.particles = function (ctx, t, o) {
    const { count = 60, seed = 9, x0 = -100, y0 = -100, w = 2120, h = 1280, kind = 'mote', wind = 40, fall = 20, color = '#dfe6ff' } = o;
    const r = RA.rng(seed);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const px = r(), py = r(), sz = r(), ph = r() * 6.28, sp = 0.5 + r();
      const x = x0 + ((((px * w + t * wind * sp + Math.sin(t * 0.7 + ph) * 30) % w) + w) % w);
      const y = y0 + ((((py * h + t * fall * sp + Math.sin(t * 1.1 + ph) * 12) % h) + h) % h);
      if (kind === 'leaf') {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(t * 2 * sp + ph); ctx.scale(1, Math.sin(t * 3 * sp + ph));
        ctx.fillStyle = o.leafColor || '#0d1220';
        const s = 5 + sz * 7;
        ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.45, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      } else if (kind === 'ember') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + ph))) * (o.alpha ?? 1);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 1 + sz * 2.2, 0, 6.283); ctx.fill();
      } else {
        ctx.globalAlpha = (0.15 + 0.35 * sz) * (0.6 + 0.4 * Math.sin(t * 2 + ph)) * (o.alpha ?? 1);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 0.8 + sz * 2, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  };
})();
