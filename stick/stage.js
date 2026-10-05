// Stage: draws a fight (scene, fighters, trails, effects, camera, titles) frame by frame.
import { FPS, joints, Tail, buildFrames, clamp, lerp, hash } from './engine.js';

export const W = 1920, H = 1080;
const BASE = H / 600;           // world units visible vertically at zoom 1 = 600

const STOP = { block: [2, 0, 0.18, 0.03], hit: [5, 0, 0.45, 0.08], bighit: [8, 2, 0.8, 0.14], clash: [9, 3, 1.0, 0.16] };

export class Fight {
  constructor(def) {
    Object.assign(this, def);
    this.names = Object.keys(this.fighters);
    for (const e of this.events) {
      const S = STOP[e.type === 'hit' && e.power >= 4 ? 'bighit' : e.type];
      if (S) Object.assign(e, { stop: true, frames: e.frames ?? S[0], impact: e.impact ?? S[1], shake: e.shake ?? S[2], kick: S[3] });
    }
    // events can be pinned to a joint: at: 'red.hA' puts the spark exactly where that fist is
    for (const e of this.events) if (e.at) { const [n, j] = e.at.split('.'); const p = joints(this.fighters[n].track, e.t)[j]; e.x = p[0] + (e.ox || 0); e.y = p[1] + (e.oy || 0); }
    this.stops = this.events.filter((e) => e.stop);
    this.frames = buildFrames(this.end, this.stops, this.slows || []);
    this.tails = {};
    for (const n of this.names) this.tails[n] = this.fighters[n].tails.map((a) => new Tail(...a));
    this.limbState = {};
    this.autoSfx = [];
    this.grain = makeGrain();
  }
  realTime(t) { const i = this.frames.findIndex((f) => f.t >= t); return (i < 0 ? this.frames.length : i) / FPS; }

  cameraAt(t) {
    let shot = this.shots[0];
    for (const s of this.shots) if (t >= s.t) shot = s;
    return { ...shot.cam(t, this), cut: shot.t };
  }
  chest(n, t) { const J = joints(this.fighters[n].track, t); return [(J.N[0] + J.H[0]) / 2, (J.N[1] + J.H[1]) / 2]; }

  draw(ctx, i) {
    const fr = this.frames[i], t = fr.t;
    const dt = i > 0 ? t - this.frames[i - 1].t : 0;
    const J = {};
    for (const n of this.names) J[n] = joints(this.fighters[n].track, t);
    for (const n of this.names) for (const tl of this.tails[n]) tl.step(J[n], dt, t);

    // camera + shake + punch zoom (shake runs in real frames, so it keeps going through hit-stop)
    const cam = this.cameraAt(t);
    let shx = 0, shy = 0, shr = 0, kick = 0;
    for (const s of this.stops) {
      if (s.frame === undefined || i < s.frame) continue;
      const age = (i - s.frame) / FPS, a = s.shake * Math.exp(-age * 7);
      shx += a * 26 * (hash(i * 3.1 + s.t) - 0.5) * 2; shy += a * 20 * (hash(i * 7.7 + s.t) - 0.5) * 2; shr += a * 1.4 * (hash(i * 1.3) - 0.5);
      kick += s.kick * Math.exp(-age * 9);
    }
    const zoom = cam.zoom * (1 + kick);
    const view = { x: cam.x, y: cam.y, zoom, rot: (cam.rot || 0) + shr, shx, shy };

    const impact = fr.stop && fr.k < fr.stop.impact ? (fr.k % 2 === 0 ? 'inv' : 'neg') : null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (impact) {
      this.drawImpact(ctx, view, J, fr.stop, impact, t);
    } else {
      this.scene(ctx, view, t, this);
      this.layer(ctx, view, 1);
      for (const n of this.names) shadow(ctx, J[n]);
      this.effectsBack(ctx, t);
      // ghosts during dashes
      for (const n of this.names) {
        const F = this.fighters[n];
        const v = Math.abs(joints(F.track, t).x - joints(F.track, t - 0.04).x) / 0.04;
        if (v > 450) for (const g of [0.09, 0.05]) drawFighter(ctx, joints(F.track, t - g), F, { alpha: 0.18 * clamp((v - 450) / 600), mono: F.accent });
      }
      for (const n of this.names) this.trails(ctx, n, t, i);
      for (const n of this.names) {
        for (const tl of this.tails[n]) tl.draw(ctx);
        drawFighter(ctx, J[n], this.fighters[n], {});
      }
      this.effectsFront(ctx, t, view);
      this.layer(ctx, view, 1.25); this.front && this.front(ctx, t, view, this);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.screenFX(ctx, t, i);
    }
    this.titles && this.titles(ctx, t, i, this);
    if (!impact) post(ctx, this.grain, i);
  }

  layer(ctx, v, p) {
    const s = BASE * Math.pow(v.zoom, p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2 + v.shx * p, H / 2 + v.shy * p);
    ctx.rotate(v.rot * Math.PI / 180);
    ctx.scale(s, -s);
    ctx.translate(-v.x * p, -v.y * p);
  }

  trails(ctx, n, t, i) {
    const F = this.fighters[n];
    for (const end of ['hA', 'hB', 'fA', 'fB']) {
      const pts = [];
      for (let j = 0; j <= 10; j++) pts.push(joints(F.track, t - j * 0.012)[end]);
      const sp = Math.hypot(pts[0][0] - pts[3][0], pts[0][1] - pts[3][1]) / 0.036;
      const key = n + end, st = this.limbState[key] || { fast: false };
      if (sp > 1100 && !st.fast && !this.frames[i].stop) this.autoSfx.push({ time: i / FPS, type: 'whoosh', power: clamp(sp / 2600, 0.3, 1), x: pts[0][0] });
      st.fast = sp > 700; this.limbState[key] = st;
      const a = clamp((sp - 380) / 1100);
      if (a <= 0.02) continue;
      const L = [], R = [];
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j], q = pts[Math.min(pts.length - 1, j + 1)], o = pts[Math.max(0, j - 1)];
        let nx = -(q[1] - o[1]), ny = q[0] - o[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const w = 9 * (1 - j / pts.length);
        L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]);
      }
      ctx.globalAlpha = a * 0.75; ctx.fillStyle = F.trail;
      ctx.beginPath(); ctx.moveTo(...L[0]); for (const p of L) ctx.lineTo(...p); for (const p of R.reverse()) ctx.lineTo(...p); ctx.fill();
      ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#fff8e8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1, 7)) ctx.lineTo(...p); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  effectsBack(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      const age = t - e.t;
      if (age < 0) continue;
      if ((e.type === 'dust' || e.type === 'land') && age < 1.2) dust(ctx, e, age, k);
      if (e.type === 'clash' && age < 0.9) {
        // ground shockwave
        ctx.globalAlpha = (1 - age / 0.9) * 0.7; ctx.strokeStyle = '#ffe2b0'; ctx.lineWidth = 6 * (1 - age);
        ctx.beginPath(); ctx.ellipse(e.x, 0, 60 + age * 900, 8 + age * 30, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }
  effectsFront(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      const age = t - e.t;
      if (age < 0 || age > 0.9) continue;
      if (e.type === 'hit' || e.type === 'block' || e.type === 'clash') spark(ctx, e, age, k);
    }
  }
  screenFX(ctx, t, i) {
    for (const e of this.events) {
      if (e.type !== 'speed' || t < e.t || t > e.t + e.dur) continue;
      const a = Math.sin(clamp((t - e.t) / e.dur) * Math.PI);
      ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
      for (let k = 0; k < 46; k++) {
        const r = hash(k * 13.1 + Math.floor(i / 1) * 0.37);
        if (e.radial) {
          const ang = hash(k * 7.3 + i) * Math.PI * 2, r0 = 380 + hash(k + i * 3) * 300;
          ctx.globalAlpha = a * 0.55; ctx.lineWidth = 2 + hash(k * 3 + i) * 5;
          ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0); ctx.lineTo(W / 2 + Math.cos(ang) * 1400, H / 2 + Math.sin(ang) * 1400); ctx.stroke();
        } else {
          const y = r * H, x0 = hash(k * 5.7 + i * 1.7) * W, len = 200 + hash(k * 2.1 + i) * 600;
          ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1.5 + hash(k) * 3;
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len * (e.dir || -1), y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  drawImpact(ctx, view, J, s, mode, t) {
    const bg = mode === 'inv' ? '#000' : '#fff', fg = mode === 'inv' ? '#fff' : '#000';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    this.layer(ctx, view, 1);
    // radial burst from the point of impact
    ctx.fillStyle = fg;
    for (let k = 0; k < 40; k++) {
      const a = hash(k * 9.1 + s.t) * Math.PI * 2, r0 = 30 + hash(k * 3.3) * 50, w = 0.012 + hash(k * 1.7) * 0.03;
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
      ctx.lineTo(s.x + Math.cos(a - w) * 1500, s.y + Math.sin(a - w) * 1500); ctx.lineTo(s.x + Math.cos(a + w) * 1500, s.y + Math.sin(a + w) * 1500); ctx.fill();
    }
    for (const n of this.names) drawFighter(ctx, J[n], this.fighters[n], { mono: fg, rim: false });
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

// ---------- fighters ----------
export function drawFighter(ctx, J, F, { alpha = 1, mono = null, rim = true }) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const body = mono || F.body, far = mono || F.far, w = 7.5;
  const seg = (pts, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke(); };
  const parts = [[[J.sh, J.eB, J.hB], far], [[J.H, J.kB, J.fB], far], [[J.H, J.N], body], [[J.H, J.kA, J.fA], body], [[J.sh, J.eA, J.hA], body]];
  if (rim && !mono) {
    // sunset rim light on the sun side
    ctx.save(); ctx.translate(1.8, 1.6);
    for (const [p] of parts) seg(p, F.rim, w + 1.5);
    ctx.fillStyle = F.rim; ctx.beginPath(); ctx.arc(J.C[0], J.C[1], 13.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const [p, c] of parts.slice(0, 4)) seg(p, c, w);
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(J.C[0], J.C[1], 13, 0, Math.PI * 2); ctx.fill();
  seg(parts[4][0], parts[4][1], w);
  if (!mono && F.band) {   // headband across the brow
    ctx.strokeStyle = F.accent; ctx.lineWidth = 4.5;
    const a = J.headAng * Math.PI / 180;
    ctx.beginPath(); ctx.arc(J.C[0], J.C[1], 12.2, a - 0.5, a + 2.75); ctx.stroke();
  }
  if (!mono && F.scarf) { ctx.strokeStyle = F.accent; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(J.N[0] - 6, J.N[1] - 2); ctx.lineTo(J.N[0] + 6, J.N[1] - 2); ctx.stroke(); }
  ctx.restore();
}
function shadow(ctx, J) {
  const h = clamp(1 - J.y / 200, 0.2, 1);
  ctx.fillStyle = `rgba(10,4,16,${0.35 * h})`;
  ctx.beginPath(); ctx.ellipse(J.H[0], 1, 34 * h, 4 * h, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------- effects ----------
function spark(ctx, e, age, k) {
  const life = e.type === 'clash' ? 0.6 : e.type === 'hit' ? 0.32 : 0.22;
  if (age > life) return;
  const u = age / life, P = e.power || 1, big = e.type === 'clash' ? 2.4 : e.type === 'hit' ? 1 + P * 0.2 : 0.7;
  const R = (28 + 40 * u) * big;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.globalAlpha = 1 - u;
  // star burst
  const n = e.type === 'block' ? 6 : 10;
  ctx.fillStyle = e.color || '#fff4d6';
  ctx.beginPath();
  for (let j = 0; j < n * 2; j++) {
    const a = (j / (n * 2)) * Math.PI * 2 + hash(k) * 3, r = j % 2 ? R * 0.25 : R * (0.7 + hash(j + k * 11) * 0.6) * (1 - u * 0.6);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, R * 0.22 * (1 - u), 0, Math.PI * 2); ctx.fill();
  // ring
  ctx.strokeStyle = e.ring || '#ffd27a'; ctx.lineWidth = 4 * (1 - u) * big;
  ctx.beginPath(); ctx.arc(0, 0, R * (0.6 + u * 1.6), 0, Math.PI * 2); ctx.stroke();
  if (e.type === 'clash') { ctx.lineWidth = 9 * (1 - u); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 40 + u * 700, 0, Math.PI * 2); ctx.stroke(); }
  // flying sparks
  ctx.strokeStyle = '#fff1c4'; ctx.lineCap = 'round'; ctx.lineWidth = 2.5;
  const m = e.type === 'block' ? 7 : 14;
  for (let j = 0; j < m; j++) {
    const a = hash(j * 3.7 + k) * Math.PI * 2 + (e.dir || 0), sp = (120 + hash(j * 5.1 + k) * 380) * big;
    const d0 = sp * age, d1 = sp * Math.max(0, age - 0.03);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1 - 200 * age * age); ctx.lineTo(Math.cos(a) * d0, Math.sin(a) * d0 - 200 * age * age); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function dust(ctx, e, age, k) {
  const n = e.n || 10, P = e.power || 1;
  for (let j = 0; j < n; j++) {
    const r1 = hash(j * 1.9 + k * 7), r2 = hash(j * 4.3 + k * 3);
    const life = 0.6 + r1 * 0.6; if (age > life) continue;
    const u = age / life;
    const vx = (e.dir ?? (r2 - 0.5) * 2) * (40 + r2 * 160) * P, vy = 20 + r1 * 70;
    const x = e.x + vx * (1 - Math.exp(-age * 3)) / 3 * 3 + (r2 - 0.5) * 30, y = (e.y || 0) + 4 + vy * (1 - Math.exp(-age * 2)) / 2;
    ctx.fillStyle = `rgba(214,170,150,${0.45 * (1 - u)})`;
    ctx.beginPath(); ctx.arc(x, y, (6 + u * 26 * (0.6 + r1)) * Math.sqrt(P), 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- post ----------
function makeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
}
function post(ctx, grain, i) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,20,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  const ox = (hash(i) * 256) | 0, oy = (hash(i * 3.3) * 256) | 0;
  ctx.translate(-ox, -oy); ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------- camera helpers ----------
export function follow(F, t, { zoom = 1, oy = 30, ox = 0, min = 0.7, max = 2.4, fit = 900, rot = 0 } = {}) {
  let x = 0, y = 0, wsum = 0, sep = 0;
  for (let k = 0; k < 8; k++) {
    const w = 1 - k / 9, tt = t - k * 0.04;
    const a = F.chest(F.names[0], tt), b = F.chest(F.names[1], tt);
    x += (a[0] + b[0]) / 2 * w; y += (a[1] + b[1]) / 2 * w; sep += Math.abs(a[0] - b[0]) * w; wsum += w;
  }
  x /= wsum; y /= wsum; sep /= wsum;
  return { x: x + ox, y: y + oy, zoom: clamp(fit / (sep + 300), min, max) * zoom, rot };
}
export function on(F, name, t, { zoom = 2.4, oy = 30, ox = 0, rot = 0, lag = 0.06 } = {}) {
  let x = 0, y = 0;
  for (let k = 0; k < 4; k++) { const c = F.chest(name, t - k * lag / 3); x += c[0] / 4; y += c[1] / 4; }
  return { x: x + ox, y: y + oy, zoom, rot };
}
