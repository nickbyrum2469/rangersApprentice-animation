// Stage v2: Becker-style presentation. Wide, readable side view; simple graphic effects; contact QA.
import { joints, Springs, drawFighter, limbPath, solveAims, clamp, lerp, hash, LEN } from './rig2.js';
import { buildFrames, FPS } from './engine.js';

export const W = 1920, H = 1080;
const BASE = H / 600;
const STOP = { block: [3, 0, 0.12, 0.02], hit: [5, 0, 0.35, 0.05], bighit: [8, 2, 0.7, 0.1], grab: [2, 0, 0.05, 0], land: [2, 0, 0.3, 0.02] };

export class Fight {
  constructor(def) {
    Object.assign(this, def);
    this.names = Object.keys(this.fighters);
    const tracks = Object.fromEntries(this.names.map((n) => [n, this.fighters[n].track]));
    solveAims(tracks);
    // events pinned to a contact: placed exactly between the touching parts
    for (const e of this.events) {
      if (e.at) { const [n, j] = e.at.split('.'); const p = joints(tracks[n], e.t)[j]; e.x = p[0]; e.y = p[1]; }
      const S = STOP[e.type === 'hit' && e.power >= 4 ? 'bighit' : e.type];
      if (S) Object.assign(e, { stop: true, frames: e.frames ?? S[0], impact: e.impact ?? S[1], shake: e.shake ?? S[2], kick: S[3] });
    }
    this.stops = this.events.filter((e) => e.stop);
    this.frames = buildFrames(this.end, this.stops, this.slows || []);
    this.springs = Object.fromEntries(this.names.map((n) => [n, new Springs()]));
    this.limbState = {}; this.autoSfx = [];
  }
  realTime(t) { const i = this.frames.findIndex((f) => f.t >= t); return (i < 0 ? this.frames.length : i) / FPS; }

  // every hit/block/grab must actually touch: distance from the contact limb to the nearest part of the other body
  qa(tol = 6) {
    const out = [];
    for (const e of this.events.filter((e) => e.at && ['hit', 'block', 'grab'].includes(e.type))) {
      const [n, j] = e.at.split('.'), o = this.names.find((x) => x !== n);
      const P = joints(this.fighters[n].track, e.t)[j], J = joints(this.fighters[o].track, e.t);
      const segs = [[J.H, J.N], [J.sh, J.eA], [J.eA, J.hA], [J.sh, J.eB], [J.eB, J.hB], [J.H, J.kA], [J.kA, J.fA], [J.H, J.kB], [J.kB, J.fB]];
      let d = Math.hypot(P[0] - J.C[0], P[1] - J.C[1]) - LEN.head;
      for (const [a, b] of segs) d = Math.min(d, dseg(P, a, b) - 5.5);
      out.push({ t: e.t, type: e.type, at: e.at, gap: +d.toFixed(1), ok: d <= tol });
    }
    return out;
  }

  draw(ctx, i) {
    const fr = this.frames[i], t = fr.t, dt = i > 0 ? t - this.frames[i - 1].t : 0;
    const J = {};
    for (const n of this.names) J[n] = joints(this.fighters[n].track, t, this.springs[n].step(this.fighters[n].track, t, dt));
    // camera: calm wide follow + shake + punch zoom
    const cam = this.camera(t, this);
    let shx = 0, shy = 0, kick = 0;
    for (const s of this.stops) {
      if (s.frame === undefined || i < s.frame) continue;
      const age = (i - s.frame) / FPS, a = s.shake * Math.exp(-age * 8);
      shx += a * 24 * (hash(i * 3.1 + s.t) - 0.5) * 2; shy += a * 18 * (hash(i * 7.7 + s.t) - 0.5) * 2;
      kick += s.kick * Math.exp(-age * 9);
    }
    const v = { x: cam.x, y: cam.y, zoom: cam.zoom * (1 + kick), shx, shy };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const impact = fr.stop && fr.k < fr.stop.impact ? (fr.k % 2 ? 'neg' : 'inv') : null;
    if (impact) return this.drawImpact(ctx, v, J, fr.stop, impact);
    this.scene(ctx, v, t, this);
    this.layer(ctx, v, 1);
    for (const n of this.names) { const h = clamp(1 - J[n].y / 220, 0.25, 1); ctx.fillStyle = `rgba(30,50,20,${0.22 * h})`; ctx.beginPath(); ctx.ellipse(J[n].H[0], 0, 40 * h, 6 * h, 0, 0, Math.PI * 2); ctx.fill(); }
    this.fxBack(ctx, t);
    for (const n of this.names) this.smears(ctx, n, t, i);
    const order = this.order ? this.order(t) : this.names;
    for (const n of order) drawFighter(ctx, J[n], this.fighters[n]);
    this.fxFront(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.overlay && this.overlay(ctx, t, i, this);
  }

  layer(ctx, v, p) {
    const s = BASE * Math.pow(v.zoom, p);
    ctx.setTransform(s, 0, 0, -s, W / 2 + v.shx * p - v.x * p * s, H / 2 + v.shy * p + v.y * p * s);
  }

  // Becker-style smear: extra copies of a fast limb along its path, plus whoosh cues
  smears(ctx, n, t, i) {
    const F = this.fighters[n], tr = F.track;
    const now = joints(tr, t), was = joints(tr, t - 0.035);
    for (const [end, root, mid] of [['hA', 'sh', 'eA'], ['hB', 'sh', 'eB'], ['fA', 'H', 'kA'], ['fB', 'H', 'kB']]) {
      const sp = Math.hypot(now[end][0] - was[end][0], now[end][1] - was[end][1]) / 0.035;
      const key = n + end, st = this.limbState[key] || {};
      if (sp > 1000 && !st.fast && !this.frames[i].stop) this.autoSfx.push({ time: i / FPS, type: 'whoosh', power: clamp(sp / 2400, 0.3, 1), x: now[end][0] });
      st.fast = sp > 650; this.limbState[key] = st;
      const a = clamp((sp - 450) / 900);
      if (a < 0.05) continue;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 11;
      for (let k = 1; k <= 3; k++) {
        const G = joints(tr, t - k * 0.012);
        ctx.globalAlpha = a * (0.42 - k * 0.1); ctx.strokeStyle = F.color;
        ctx.beginPath(); limbPath(ctx, G[root], G[mid], G[end]); ctx.stroke();
      }
      // speed streak behind the fist/foot
      ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath();
      for (let k = 0; k <= 6; k++) { const p = joints(tr, t - k * 0.01)[end]; k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke(); ctx.restore();
    }
  }

  fxBack(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      const age = t - e.t;
      if (age < 0 || age > 1.2 || !['dust', 'land'].includes(e.type)) continue;
      for (let j = 0; j < (e.n || 9); j++) {
        const r1 = hash(j * 1.9 + k * 7), r2 = hash(j * 4.3 + k * 3), life = 0.5 + r1 * 0.6;
        if (age > life) continue;
        const u = age / life, P = e.power || 1;
        const x = e.x + (e.dir ?? (r2 - 0.5) * 2) * (30 + r2 * 140) * P * (1 - Math.exp(-age * 4)) + (r2 - 0.5) * 24;
        const y = 4 + (20 + r1 * 60) * (1 - Math.exp(-age * 3));
        ctx.fillStyle = `rgba(250,248,240,${0.75 * (1 - u)})`;
        ctx.beginPath(); ctx.arc(x, y, (6 + u * 20 * (0.6 + r1)) * Math.sqrt(P), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  fxFront(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      const age = t - e.t;
      if (age < 0 || !['hit', 'block'].includes(e.type)) continue;
      const life = e.type === 'hit' ? 0.28 : 0.18;
      if (age > life) continue;
      const u = age / life, big = e.type === 'hit' ? 1 + (e.power || 1) * 0.25 : 0.65;
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(hash(k) * 3);
      // white flash shape: a jagged star, Becker-style, with a thin ring
      ctx.globalAlpha = 1 - u * 0.8; ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const n = e.type === 'hit' ? 9 : 6, R = (26 + 30 * u) * big;
      for (let j = 0; j < n * 2; j++) { const a = (j / (n * 2)) * Math.PI * 2, r = j % 2 ? R * 0.3 : R * (0.7 + hash(j + k * 13) * 0.6) * (1 - u * 0.5); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill();
      ctx.strokeStyle = e.ring || '#fff6c8'; ctx.lineWidth = 5 * (1 - u); ctx.beginPath(); ctx.arc(0, 0, R * (0.5 + u * 1.5), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  drawImpact(ctx, v, J, s, mode) {
    const bg = mode === 'inv' ? '#000' : '#fff', fg = mode === 'inv' ? '#fff' : '#000';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    this.layer(ctx, v, 1);
    ctx.fillStyle = fg;
    for (let k = 0; k < 36; k++) {
      const a = hash(k * 9.1 + s.t) * Math.PI * 2, r0 = 40 + hash(k * 3.3) * 60, w = 0.015 + hash(k * 1.7) * 0.03;
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
      ctx.lineTo(s.x + Math.cos(a - w) * 1600, s.y + Math.sin(a - w) * 1600); ctx.lineTo(s.x + Math.cos(a + w) * 1600, s.y + Math.sin(a + w) * 1600); ctx.fill();
    }
    for (const n of this.names) drawFighter(ctx, J[n], this.fighters[n], { mono: fg });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-9; const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L); return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy); };

// a calm follow camera: midpoint of both fighters, heavily smoothed, fixed zoom
export function wide(F, t, { zoom = 1.3, oy = 90, lag = 0.5 } = {}) {
  let x = 0, wsum = 0;
  for (let k = 0; k < 10; k++) {
    const tt = t - (k / 9) * lag, w = 1 - k / 11;
    let m = 0; for (const n of F.names) m += F.fighters[n].track.sample(tt).x / F.names.length;
    x += m * w; wsum += w;
  }
  return { x: x / wsum, y: oy, zoom };
}

// bright, painted-looking park: sky, clouds, hills, trees, grass
export function park(ctx, v, t, F) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5fb3ee'); g.addColorStop(0.55, '#a9daf7'); g.addColorStop(1, '#e6f6ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  F.layer(ctx, v, 0.08);
  for (let k = 0; k < 7; k++) {
    const cx = -1300 + k * 420 + hash(k) * 200 - t * 4, cy = 230 + hash(k * 3) * 160;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(cx + j * 38 - 76, cy + Math.sin(j * 2) * 10, 52 + hash(j + k) * 30, 30 + hash(j * 2 + k) * 14, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  F.layer(ctx, v, 0.25);
  hills(ctx, 3, -3000, 3000, -60, 110, '#9cc9a0');
  F.layer(ctx, v, 0.5);
  hills(ctx, 9, -3000, 3000, -80, 70, '#76b06c');
  for (let k = 0; k < 18; k++) tree(ctx, -1900 + k * 230 + hash(k) * 90, -70 + hash(k * 5) * 20, 0.8 + hash(k * 2) * 0.5, '#4f8f4a', '#5d4433');
  F.layer(ctx, v, 1);
  ctx.fillStyle = '#7cc35a'; ctx.fillRect(-3000, -1000, 6000, 1000);
  ctx.fillStyle = '#93d46c'; ctx.fillRect(-3000, -8, 6000, 8);
  ctx.fillStyle = '#5ea844';
  for (let k = 0; k < 160; k++) { const x = -3000 + k * 38 + hash(k) * 20; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 4, 9 + hash(k * 3) * 8); ctx.lineTo(x + 8, 0); ctx.fill(); }
}
function hills(ctx, seed, x0, x1, base, amp, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, -800);
  for (let x = x0; x <= x1; x += 60) ctx.lineTo(x, base + amp * (0.6 + 0.4 * Math.sin(x * 0.0021 + seed) + 0.25 * Math.sin(x * 0.0057 + seed * 2)));
  ctx.lineTo(x1, -800); ctx.fill();
}
function tree(ctx, x, y, s, leaf, trunk) {
  ctx.fillStyle = trunk; ctx.fillRect(x - 6 * s, y, 12 * s, 70 * s);
  ctx.fillStyle = leaf;
  for (const [dx, dy, r] of [[0, 90, 46], [-34, 66, 34], [34, 66, 36], [0, 130, 34]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
}
