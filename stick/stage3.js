// Stage v3: shot-list camera (cuts, blends, whip pans), props fighters can grab/throw, readable contacts.
import { joints, Springs, drawFighter, limbPath, solveAims, clamp, lerp, hash, LEN, EASE } from './rig3.js';
import { buildFrames, FPS } from './engine.js';

export const W = 1920, H = 1080;
const BASE = H / 600;
// [hit-stop frames, impact frames, shake, punch-zoom]
const STOP = { block: [3, 0, 0.12, 0.02], hit: [4, 0, 0.3, 0.05], bighit: [7, 2, 0.75, 0.1], clash: [9, 3, 1.0, 0.14], clang: [3, 0, 0.25, 0.03], wallhit: [5, 0, 0.8, 0.06] };

// ---------- props: keyed free transforms, or attached to a fighter's limb ----------
export class Prop {
  constructor(name, draw) { this.name = name; this.draw = draw; this.keys = []; }
  // at(t, { x, y, rot, face, e }) or at(t, { attach: ['red', 'hA', dx, dy], rot, face })
  at(t, o) { this.keys.push({ t, rot: 0, face: 0, e: 'lin', ...o }); this.keys.sort((a, b) => a.t - b.t); return this; }
  pos(k, t, tracks) {
    if (!k.attach) return [k.x, k.y];
    const [who, limb, dx = 0, dy = 0] = k.attach, J = joints(tracks[who], t);
    return [J[limb][0] + dx * J.f, J[limb][1] + dy];
  }
  sample(t, tracks, full = false) {
    const K = this.keys;
    let a = K[0], b = K[0];
    if (t >= K.at(-1).t) a = b = K.at(-1);
    else if (t > K[0].t) { let i = 0; while (K[i + 1].t < t) i++; a = K[i]; b = K[i + 1]; }
    const u = a === b ? 0 : EASE[b.e]((t - a.t) / (b.t - a.t));
    // an attached key keeps following its limb until the next key takes over
    const pa = this.pos(a, a.attach ? t : a.t, tracks), pb = this.pos(b, b.attach ? t : b.t, tracks);
    const p = [lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u)];
    return full ? { x: p[0], y: p[1], rot: lerp(a.rot, b.rot, u), face: lerp(a.face, b.face, u) } : p;
  }
}

export class Fight {
  constructor(def) {
    Object.assign(this, def);
    this.props = this.props || {};
    this.names = Object.keys(this.fighters);
    this.tracks = Object.fromEntries(this.names.map((n) => [n, this.fighters[n].track]));
    solveAims(this.tracks, this.props);
    for (const e of this.events) {
      if (e.at) { const p = this.point(e.at, e.t); e.x = p[0]; e.y = p[1]; }
      const S = STOP[e.type === 'hit' && e.power >= 4 ? 'bighit' : e.type];
      if (S) Object.assign(e, { stop: true, frames: e.frames ?? S[0], impact: e.impact ?? S[1], shake: e.shake ?? S[2], kick: S[3] });
    }
    this.stops = this.events.filter((e) => e.stop);
    this.frames = buildFrames(this.end, this.stops, this.slows || []);
    this.springs = Object.fromEntries(this.names.map((n) => [n, new Springs()]));
    this.limbState = {}; this.autoSfx = [];
  }
  point(ref, t) {
    if (ref.startsWith('@')) return this.props[ref.slice(1)].sample(t, this.tracks);
    const [n, j] = ref.split('.'); return joints(this.tracks[n], t)[j];
  }
  realTime(t) { const i = this.frames.findIndex((f) => f.t >= t); return (i < 0 ? this.frames.length : i) / FPS; }

  // contact check: the striking point must touch the target (body of the other fighter, or a prop with radius)
  qa(tol = 6) {
    const out = [];
    for (const e of this.events.filter((e) => e.at && ['hit', 'block', 'grab', 'clang'].includes(e.type))) {
      const P = this.point(e.at, e.t);
      let d;
      if (e.vs && e.vs.startsWith('@')) d = Math.hypot(...[0, 1].map((k) => P[k] - this.point(e.vs, e.t)[k])) - (e.r || 26);
      else if (e.vs && e.vs.startsWith('#')) { const q = e.vs.slice(1).split(',').map(Number); d = Math.hypot(P[0] - q[0], P[1] - q[1]) - 6; }
      else {
        const n = e.at.split('.')[0], o = this.names.find((x) => x !== n), J = joints(this.tracks[o], e.t);
        const segs = [[J.H, J.M], [J.M, J.N], [J.sh, J.eA], [J.eA, J.hA], [J.sh, J.eB], [J.eB, J.hB], [J.H, J.kA], [J.kA, J.fA], [J.H, J.kB], [J.kB, J.fB]];
        d = Math.hypot(P[0] - J.C[0], P[1] - J.C[1]) - LEN.head;
        for (const [a, b] of segs) d = Math.min(d, dseg(P, a, b) - 5.5);
      }
      out.push({ t: e.t, type: e.type, at: e.at, gap: +d.toFixed(1), ok: d <= tol });
    }
    return out;
  }

  // ---------- camera: shot list with cuts, blends and whip pans ----------
  cameraAt(t) {
    let i = 0; for (let k = 0; k < this.shots.length; k++) if (t >= this.shots[k].t) i = k;
    const s = this.shots[i]; let c = s.cam(t, this);
    if (s.blend && i > 0 && t < s.t + s.blend) {
      const p = this.shots[i - 1].cam(t, this), u = EASE.io((t - s.t) / s.blend);
      c = { x: lerp(p.x, c.x, u), y: lerp(p.y, c.y, u), zoom: lerp(p.zoom, c.zoom, u), rot: lerp(p.rot || 0, c.rot || 0, u) };
    }
    c.whip = s.whip && t < s.t + 0.12 ? { u: (t - s.t) / 0.12, dir: s.whip } : null;
    return c;
  }

  draw(ctx, i) {
    const fr = this.frames[i], t = fr.t, dt = i > 0 ? t - this.frames[i - 1].t : 0;
    const J = {};
    for (const n of this.names) J[n] = joints(this.tracks[n], t, this.springs[n].step(this.tracks[n], t, dt));
    const cam = this.cameraAt(t);
    let shx = 0, shy = 0, kick = 0;
    for (const s of this.stops) {
      if (s.frame === undefined || i < s.frame) continue;
      const age = (i - s.frame) / FPS, a = s.shake * Math.exp(-age * 8);
      shx += a * 24 * (hash(i * 3.1 + s.t) - 0.5) * 2; shy += a * 18 * (hash(i * 7.7 + s.t) - 0.5) * 2; kick += s.kick * Math.exp(-age * 9);
    }
    const v = { x: cam.x, y: cam.y, zoom: cam.zoom * (1 + kick), rot: cam.rot || 0, shx, shy };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const impact = fr.stop && fr.k < fr.stop.impact ? (fr.k % 2 ? 'neg' : 'inv') : null;
    if (impact) { this.drawImpact(ctx, v, J, fr.stop, impact); this.overlay && this.overlay(ctx, t, i, this); return; }
    this.scene(ctx, v, t, this);
    this.layer(ctx, v, 1);
    this.set && this.set(ctx, t, this);
    this.decals(ctx, t);                      // set pieces behind the fighters
    for (const n of this.names) { const h = clamp(1 - J[n].y / 220, 0.25, 1); ctx.fillStyle = `rgba(40,30,30,${0.2 * h})`; ctx.beginPath(); ctx.ellipse(J[n].H[0], 0, 40 * h, 6 * h, 0, 0, Math.PI * 2); ctx.fill(); }
    this.dust(ctx, t);
    for (const n of this.names) this.smears(ctx, n, t, i);
    for (const n of (this.order ? this.order(t) : this.names)) drawFighter(ctx, J[n], this.fighters[n], { squash: this.squash(n, t, J[n]) });
    for (const p of Object.values(this.props)) p.draw(ctx, p.sample(t, this.tracks, true), t);
    this.impactLines(ctx, t);
    this.debris(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (cam.whip) this.whip(ctx, cam.whip, i);
    this.overlay && this.overlay(ctx, t, i, this);
  }

  layer(ctx, v, p) {
    const s = BASE * Math.pow(v.zoom, p), r = v.rot * Math.PI / 180;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2 + v.shx * p, H / 2 + v.shy * p); ctx.rotate(r); ctx.scale(s, -s); ctx.translate(-v.x * p, -v.y * p);
  }

  // a struck head squashes away from the hit for a beat
  squash(n, t, J) {
    for (const e of this.events) {
      if (e.type !== 'hit' && e.type !== 'clash') continue;
      const age = t - e.t; if (age < 0 || age > 0.25) continue;
      if (e.at && e.at.startsWith(n + '.')) continue;
      const d = Math.hypot(J.C[0] - e.x, J.C[1] - e.y); if (d > 45) continue;
      return [Math.exp(-age * 14), Math.atan2(J.C[1] - e.y, J.C[0] - e.x)];
    }
    return null;
  }

  smears(ctx, n, t, i) {
    const F = this.fighters[n], tr = F.track;
    const now = joints(tr, t), was = joints(tr, t - 0.035);
    for (const [end, root, mid] of [['hA', 'sh', 'eA'], ['hB', 'sh', 'eB'], ['fA', 'H', 'kA'], ['fB', 'H', 'kB']]) {
      const sp = Math.hypot(now[end][0] - was[end][0], now[end][1] - was[end][1]) / 0.035;
      const key = n + end, st = this.limbState[key] || {};
      if (sp > 1000 && !st.fast && !this.frames[i].stop) this.autoSfx.push({ time: i / FPS, type: 'whoosh', power: clamp(sp / 2400, 0.3, 1), x: now[end][0] });
      st.fast = sp > 650; this.limbState[key] = st;
      const a = clamp((sp - 500) / 900);
      if (a < 0.05) continue;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 11;
      for (let k = 1; k <= 3; k++) {
        const G = joints(tr, t - k * 0.013);
        ctx.globalAlpha = a * (0.4 - k * 0.1); ctx.strokeStyle = F.color;
        ctx.beginPath(); limbPath(ctx, G[root], G[mid], G[end]); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // impact lines radiate AROUND the contact point (the fist on the face stays visible)
  impactLines(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      if (!['hit', 'block', 'clash', 'clang', 'wallhit'].includes(e.type)) continue;
      const age = t - e.t, life = e.type === 'block' ? 0.16 : 0.26;
      if (age < 0 || age > life) continue;
      const u = age / life, big = e.type === 'clash' ? 2.2 : e.type === 'block' ? 0.7 : 1 + (e.power || 1) * 0.15;
      const n = e.type === 'block' ? 7 : 12, r0 = (24 + 40 * u) * big, len = 40 * big * (1 - u * 0.6);
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.fillStyle = e.type === 'clang' ? '#ffe08a' : '#ffffff'; ctx.globalAlpha = 1 - u * 0.7;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + hash(k * 7 + j) * 0.5, w = 0.06 + hash(j + k) * 0.05, L = len * (0.6 + hash(j * 3 + k) * 0.8);
        ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); ctx.lineTo(Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L)); ctx.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); ctx.fill();
      }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - u); ctx.beginPath(); ctx.arc(0, 0, r0 * 0.85, 0, Math.PI * 2); ctx.stroke();
      if (e.type === 'clang' || e.type === 'block') {   // sparks
        ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let j = 0; j < 10; j++) {
          const a = hash(j * 5.1 + k) * Math.PI * 2, sp = 200 + hash(j * 2.3 + k) * 300, d0 = sp * age, d1 = sp * Math.max(0, age - 0.025);
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1 - 300 * age * age); ctx.lineTo(Math.cos(a) * d0, Math.sin(a) * d0 - 300 * age * age); ctx.stroke();
        }
      }
      if (e.type === 'clash') { ctx.lineWidth = 8 * (1 - u); ctx.beginPath(); ctx.arc(0, 0, 40 + u * 600, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }
  decals(ctx, t) {   // wall cracks stay
    for (const [k, e] of this.events.entries()) {
      if (e.type !== 'wallhit' || t < e.t) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(e.x - 300, 4, 296, 420); ctx.clip(); ctx.strokeStyle = 'rgba(40,20,15,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const n = 6 + (e.power || 1) * 2;
      for (let j = 0; j < n; j++) {
        let x = e.x - 18, y = e.y, a = (j / n) * Math.PI * 2 + (hash(j + k) - 0.5) * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let s = 0; s < 3; s++) { const L = (6 + hash(j * 7 + s + k) * 9) * (1 + (e.power || 1) * 0.2); a += (hash(j * 3 + s * 5 + k) - 0.5) * 0.9; x = Math.min(e.x - 3, x + Math.cos(a) * L); y += Math.sin(a) * L; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(40,20,15,0.25)'; ctx.beginPath(); ctx.ellipse(e.x - 18, e.y, 14, 16 + (e.power || 1) * 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  debris(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      if (e.type !== 'wallhit') continue;
      const age = t - e.t; if (age < 0 || age > 1.2) continue;
      for (let j = 0; j < 6 + (e.power || 1) * 3; j++) {
        const vx = 60 + hash(j * 3 + k) * 220, vy = (hash(j * 7 + k) - 0.3) * 260, x = e.x + 4 + vx * age, y = Math.max(2, e.y + vy * age - 600 * age * age);
        ctx.fillStyle = j % 3 ? '#a4553f' : '#d8c3a5'; ctx.save(); ctx.translate(x, y); ctx.rotate(age * 10 + j);
        const s = 3 + hash(j + k) * 5; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      }
    }
  }
  dust(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      const age = t - e.t;
      if (age < 0 || age > 1.2 || !['dust', 'land', 'wallhit'].includes(e.type)) continue;
      const P = e.power || 1, gy = e.type === 'wallhit' ? e.y : 0, gx = e.type === 'wallhit' ? e.x + 10 : e.x;
      for (let j = 0; j < (e.n || 9); j++) {
        const r1 = hash(j * 1.9 + k * 7), r2 = hash(j * 4.3 + k * 3), life = 0.5 + r1 * 0.6;
        if (age > life) continue;
        const u = age / life;
        const x = gx + (e.dir ?? (r2 - 0.5) * 2) * (30 + r2 * 140) * P * (1 - Math.exp(-age * 4)) + (r2 - 0.5) * 24;
        const y = gy + 4 + (20 + r1 * 60) * (1 - Math.exp(-age * 3)) * (e.type === 'wallhit' ? (r2 - 0.5) * 2 : 1);
        ctx.fillStyle = `rgba(245,238,225,${0.7 * (1 - u)})`;
        ctx.beginPath(); ctx.arc(x, y, (6 + u * 20 * (0.6 + r1)) * Math.sqrt(P), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  whip(ctx, w, i) {   // whip pan: smear the frame sideways + speed streaks
    const k = 1 - w.u;
    ctx.globalAlpha = 0.18;
    for (let j = 1; j <= 5; j++) ctx.drawImage(ctx.canvas, w.dir * j * 26 * k, 0);
    ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
    for (let j = 0; j < 40; j++) { const y = hash(j * 3.3 + i) * H, x = hash(j * 7.1 + i) * W; ctx.lineWidth = 2 + hash(j) * 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w.dir * 500, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  drawImpact(ctx, v, J, s, mode) {
    const bg = mode === 'inv' ? '#000' : '#fff', fg = mode === 'inv' ? '#fff' : '#000';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    this.layer(ctx, v, 1);
    ctx.fillStyle = fg;
    for (let k = 0; k < 36; k++) {
      const a = hash(k * 9.1 + s.t) * Math.PI * 2, r0 = 60 + hash(k * 3.3) * 60, w = 0.015 + hash(k * 1.7) * 0.03;
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
      ctx.lineTo(s.x + Math.cos(a - w) * 1600, s.y + Math.sin(a - w) * 1600); ctx.lineTo(s.x + Math.cos(a + w) * 1600, s.y + Math.sin(a + w) * 1600); ctx.fill();
    }
    for (const n of this.names) drawFighter(ctx, J[n], this.fighters[n], { mono: fg });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-9; const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L); return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy); };

// ---------- shot helpers ----------
const smooth = (F, t, fn, lag) => { let x = 0, y = 0, w = 0; for (let k = 0; k < 8; k++) { const q = fn(t - (k / 7) * lag), ww = 1 - k / 9; x += q[0] * ww; y += q[1] * ww; w += ww; } return [x / w, y / w]; };
export const two = (o = {}) => (t, F) => {
  const [x, y] = smooth(F, t, (tt) => { let a = [0, 0]; for (const n of F.names) { const c = joints(F.tracks[n], tt).chest; a[0] += c[0] / 2; a[1] += c[1] / 2; } return a; }, o.lag ?? 0.3);
  return { x: x + (o.ox || 0), y: Math.max(y, 60) + (o.oy ?? 20), zoom: o.zoom || 1.7, rot: o.rot || 0 };
};
export const on = (name, o = {}) => (t, F) => {
  const [x, y] = smooth(F, t, (tt) => joints(F.tracks[name], tt).chest, o.lag ?? 0.15);
  return { x: x + (o.ox || 0), y: y + (o.oy ?? 20), zoom: o.zoom || 2.5, rot: o.rot || 0 };
};
export const prop = (name, o = {}) => (t, F) => {
  const [x, y] = smooth(F, t, (tt) => F.props[name].sample(tt, F.tracks), o.lag ?? 0.1);
  return { x: x + (o.ox || 0), y: y + (o.oy || 0), zoom: o.zoom || 1.6, rot: o.rot || 0 };
};
export const fixed = (x, y, zoom, o = {}) => (t) => ({ x: x + (o.dx || 0) * t, y, zoom: zoom + (o.dz || 0) * t, rot: o.rot || 0 });
