// Episode 1 — "The Choosing" — cold open (~36s).
// Shot list:
//   A  kingdom   Descend from the night sky to Castle Redmont on its hill.
//   B  watcher   A hooded Ranger stands against the moon, overlooking the castle. Title card.
//   C  climb     Close on the castle wall: a boy climbs the ivy toward a lit window.
//   D  card      Episode title card.
(function () {
  const RA = window.RA;
  const { world: Wd, chars, key, env, post, text } = RA;
  const P = Wd.NIGHT;
  const BAR = 138; // 2.39:1 letterbox

  // ---- reusable layers for this episode ----
  const farRange = () => Wd.ridge({ id: 'far', width: 2800, height: 1300, base: 620, amp: 190, freq: 700, seed: 2, color: P.far, top: '#4e6189', bottom: '#2c3a58', rim: P.rim });
  const castleHill = (peak = 1260) => Wd.ridge({
    id: 'castleHill' + peak, width: 2800, height: 1300, base: 790, amp: 70, freq: 600, seed: 5, color: '#1c2642', top: '#2b3859', bottom: '#121a30', rim: P.rim,
    slope: (x) => -230 * Math.exp(-Math.pow((x - peak) / 380, 2)),
    trees: { spacing: 12, size: 46, rows: 4, rowGap: 0.55, gaps: [[peak - 250, peak + 270]] },
  });
  const nearForest = () => Wd.ridge({ id: 'near', width: 2800, height: 1300, base: 930, amp: 60, freq: 500, seed: 8, color: P.near, rim: P.rim, trees: { spacing: 18, size: 130, oaks: 0.25 } });
  const foreground = () => Wd.ridge({ id: 'fore', width: 2800, height: 1500, base: 1060, amp: 40, seed: 12, color: P.fore, trees: { spacing: 45, size: 520, gaps: [[640, 2200]] } });

  // ---------------- Shot A: the kingdom ----------------
  const shotA = {
    name: 'kingdom', duration: 11,
    draw(ctx, t) {
      const cam = { x: key(t, [[0, -60], [11, 40, 'linear']]), y: key(t, [[0, -650], [8.5, 0, 'inOut']]), zoom: key(t, [[0, 1], [11, 1.06, 'inOut']]) };
      Wd.sky(ctx, P, cam.y * 0.1);
      RA.withLayer(ctx, cam, 0.08, (c) => Wd.stars(c, t));
      RA.withLayer(ctx, cam, 0.12, (c) => Wd.moon(c, 1380, 170, 58, P));
      RA.withLayer(ctx, cam, 0.15, (c) => Wd.clouds(c, t, { y: 140, alpha: 0.35, count: 6 }));
      const far = farRange();
      RA.withLayer(ctx, cam, 0.3, (c) => { c.drawImage(far.img, -440, 0); Wd.haze(c, 700, 160, '#5c6d93', 0.45); });
      const hill = castleHill();
      RA.withLayer(ctx, cam, 0.5, (c) => {
        Wd.castle(c, t, 1260 - 440, hill.yAt(1260) + 18, 0.52, P, { color: '#0f1528' });
        c.drawImage(hill.img, -440, 0);
        Wd.fog(c, t, { y: 860, count: 12, alpha: 0.14, seed: 3 });
      });
      const near = nearForest();
      RA.withLayer(ctx, cam, 0.75, (c) => {
        c.drawImage(near.img, -440, 0);
        Wd.fog(c, t, { y: 980, count: 10, alpha: 0.16, seed: 4, speed: 26 });
      });
      const fore = foreground();
      RA.withLayer(ctx, cam, 1.0, (c) => {
        c.drawImage(fore.img, -440, 0);
        Wd.particles(c, t, { count: 50, kind: 'mote', alpha: 0.6 });
      });
      post.grade(ctx, '#2a3f7a', 0.25);
      post.vignette(ctx);
      post.letterbox(ctx);
      text.caption(ctx, 'Fifteen years ago, the Kingdom of Araluen nearly fell.', env(t, 1.8, 5.6, 0.7, 0.7));
      text.caption(ctx, 'Now, in the fief of Redmont, the castle sleeps.', env(t, 6.2, 10.6, 0.7, 0.7));
      post.fade(ctx, 1 - t / 1.8);
      post.fade(ctx, (t - 10.4) / 0.6);
    },
  };

  // ---------------- Shot B: the watcher ----------------
  const outcrop = () => RA.cached('outcrop', 1100, 600, (c) => {
    const r = RA.rng(21);
    const pts = [[0, 600], [40, 420], [120, 330], [230, 270]];
    for (let x = 260; x <= 760; x += 30) pts.push([x, 205 + RA.fbm(x / 120, 4) * 30 + r() * 8]);
    pts.push([860, 240], [980, 300], [1100, 280], [1100, 600]);
    c.beginPath(); c.moveTo(...pts[0]); pts.forEach((p) => c.lineTo(...p)); c.closePath();
    c.fillStyle = '#05070d'; c.fill();
    // moonlit edge along the top
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = 'rgba(160,180,225,0.55)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(...pts[1]); pts.slice(2, -2).forEach((p) => c.lineTo(p[0], p[1] + 1)); c.stroke();
    // grass tufts
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#05070d'; c.lineWidth = 2;
    for (let i = 0; i < 140; i++) {
      const p = pts[2 + Math.floor(r() * (pts.length - 5))];
      const x = p[0] + (r() - 0.5) * 40;
      c.beginPath(); c.moveTo(x, p[1] + 6); c.quadraticCurveTo(x + 4, p[1] - 10, x + (r() - 0.3) * 16, p[1] - 14 - r() * 18); c.stroke();
    }
  });

  const shotB = {
    name: 'watcher', duration: 10,
    draw(ctx, t) {
      const cam = { x: key(t, [[0, 0], [10, 50, 'inOut']]), y: key(t, [[0, 20], [10, -10, 'inOut']]), zoom: key(t, [[0, 1], [10, 1.12, 'inOut']]) };
      Wd.sky(ctx, P);
      RA.withLayer(ctx, cam, 0.05, (c) => { Wd.stars(c, t + 30, { seed: 13, alpha: 0.7 }); Wd.moon(c, 1470, 420, 175, P); });
      RA.withLayer(ctx, cam, 0.1, (c) => Wd.clouds(c, t, { y: 250, alpha: 0.28, count: 5, seed: 9, speed: 10 }));
      const far = farRange();
      RA.withLayer(ctx, cam, 0.2, (c) => { c.drawImage(far.img, -900, 110); Wd.haze(c, 840, 220, '#5c6d93', 0.5); });
      const hill = castleHill(1550);
      RA.withLayer(ctx, cam, 0.4, (c) => {
        c.save(); c.translate(-120, 300); c.scale(0.8, 0.8);
        Wd.castle(c, t, 1550, hill.yAt(1550) + 18, 0.52, P, { color: '#0f1528' });
        c.drawImage(hill.img, 0, 0);
        c.restore();
        Wd.fog(c, t, { y: 900, count: 12, alpha: 0.25, seed: 6 });
      });
      RA.withLayer(ctx, cam, 0.65, (c) => Wd.fog(c, t, { y: 1000, count: 8, alpha: 0.2, seed: 7, speed: 30 }));
      RA.withLayer(ctx, cam, 1.0, (c) => {
        const rock = outcrop();
        c.drawImage(rock, 980, 560);
        // Halt: hood up, longbow in hand, cloak streaming in the wind.
        chars.ranger(c, t, 1470, 560 + 214, 380, { facing: -1, wind: 1.1, rim: '#c8d4f0', rimOffset: [-2.5, -2.5] });
        Wd.particles(c, t, { count: 26, kind: 'leaf', wind: -160, fall: 45, seed: 4 });
      });
      post.grade(ctx, '#2a3f7a', 0.25);
      post.vignette(ctx, 0.6);
      post.letterbox(ctx);
      const a = env(t, 2.6, 9.3, 1.4, 0.9);
      text.title(ctx, "RANGER'S", 360, a, { x: 480, size: 96, spacing: 0.16 });
      text.title(ctx, 'APPRENTICE', 470, a, { x: 480, size: 96, spacing: 0.16 });
      text.line(ctx, 180, 780, 540, env(t, 3.4, 9.3, 1.2, 0.9));
      text.title(ctx, 'EPISODE ONE  ·  THE CHOOSING', 585, env(t, 3.8, 9.3, 1.2, 0.9), { x: 480, size: 30, spacing: 0.3, weight: 500, glow: 'rgba(0,0,0,0)' });
      post.fade(ctx, 1 - t / 0.8);
      post.fade(ctx, (t - 9.3) / 0.7);
    },
  };

  // ---------------- Shot C: the climb ----------------
  const WALL_W = 2400, WALL_H = 3300, WIN = [1060, 760];
  const ivyPath = (k) => [960 + Math.sin(k * 7) * 40 + k * 60, 3300 - k * 2440];

  const shotC = {
    name: 'climb', duration: 11,
    draw(ctx, t) {
      // climb in surges: each cycle the boy hauls himself up one step
      const cycles = 7, prog = RA.math.clamp((t - 0.6) / 9.6);
      const k = prog * cycles, step = 1700 / cycles;
      const surge = Math.min(cycles, Math.floor(k) + RA.ease.inOut(k % 1));
      const boyY = 2700 - surge * step;
      const cam = { x: key(t, [[0, -20], [11, 20]]), y: key(t, [[0, 1980], [10.6, 400, 'inOut']]), zoom: key(t, [[0, 1.0], [11, 1.08]]) };

      ctx.fillStyle = '#0b0f1a'; ctx.fillRect(0, 0, RA.W, RA.H);
      RA.withLayer(ctx, cam, 1.0, (c) => {
        c.drawImage(Wd.stoneWall('redmont', WALL_W, WALL_H), -240, 0);
        // moonlight raking across from the upper left
        const g = c.createLinearGradient(-240, 0, WALL_W - 240, WALL_H * 0.5);
        g.addColorStop(0, 'rgba(150,175,230,0.22)'); g.addColorStop(0.6, 'rgba(60,80,130,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
        c.fillStyle = g; c.fillRect(-240, 0, WALL_W, WALL_H);
        Wd.window(c, t, WIN[0] - 240, WIN[1], 130, 190, P);
        c.drawImage(Wd.ivy('wall', WALL_W, WALL_H, ivyPath), -240, 0);
        // Will
        const pose = chars.climb(k % 1 * 0.5 + Math.floor(k) * 0.5);
        const ivyX = ivyPath((3300 - boyY) / 2440)[0] - 240;
        const nearWin = RA.math.invLerp(1500, 1000, boyY);
        chars.figure(c, t, ivyX, boyY, 300, pose, {
          ...chars.cast.will, color: '#05070c',
          rim: RA.color.mix(P.rim, P.window, nearWin), rimOffset: [0, -2.5], rimAlpha: 0.6 + nearWin * 0.3,
        });
      });
      // drifting motes in front
      Wd.particles(ctx, t, { count: 40, kind: 'mote', alpha: 0.5, wind: 12, fall: -8, seed: 17 });
      post.grade(ctx, '#2a3f7a', 0.2);
      post.vignette(ctx, 0.7);
      post.letterbox(ctx);
      text.caption(ctx, '...but one boy couldn’t wait for morning.', env(t, 1.5, 6.2, 0.7, 0.8));
      post.fade(ctx, 1 - t / 0.6);
      post.fade(ctx, (t - 10) / 1.0);
    },
  };

  // ---------------- Shot D: title card ----------------
  const shotD = {
    name: 'card', duration: 4,
    draw(ctx, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, RA.W, RA.H);
      Wd.particles(ctx, t, { count: 40, kind: 'ember', color: '#ff9a4a', wind: 10, fall: -30, seed: 3, alpha: 0.5 });
      const a = env(t, 0.2, 3.7, 0.9, 0.7);
      text.title(ctx, 'EPISODE ONE', 470, a, { size: 34, spacing: 0.4, weight: 500, glow: 'rgba(0,0,0,0)' });
      text.title(ctx, 'THE CHOOSING', 560, a, { size: 92, spacing: 0.14 });
      text.line(ctx, 660, 1260, 630, a);
    },
  };

  RA.episode = RA.timeline([shotA, shotB, shotC, shotD]);
})();
