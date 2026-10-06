// Rig v2 — Becker-style stick fighters.
//  * bold proportions: big head (~1/4 height), thick round limbs, solid color
//  * rubber-hose limbs: each limb is a smooth curve through its joint, and can stretch on fast strikes
//  * contact solving: a key can AIM a hand/foot at a part of the opponent (resolved from the opponent's
//    actual body at that instant), so every hit, block and grab really touches
//  * follow-through: limbs that aren't doing anything ride on springs, so they lag, swing and settle
// Local pose space: facing right, x forward, y up, origin = ground point under the fighter.

export const LEN = { spine: 44, neck: 3, head: 19, upper: 29, fore: 29, thigh: 35, shin: 35 };
const D = Math.PI / 180;
const dir = (a) => [Math.cos(a * D), Math.sin(a * D)];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const EASE = {
  lin: (u) => u,
  io: (u) => u * u * (3 - 2 * u),
  out: (u) => 1 - Math.pow(1 - u, 3),
  in: (u) => u * u * u,
  back: (u) => { const c = 2.2; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },   // overshoot then settle
  hold: (u) => (u < 1 ? 0 : 1),
};
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- poses (facing right). Arms default loose: they hang and swing unless a move uses them ----------
export const POSES = {
  idle:    { hip: [0, 68], torso: 88, head: -2, hA: [14, 36], hB: [-8, 38], fA: [14, 0], fB: [-16, 0] },
  fight:   { hip: [0, 64], torso: 82, head: -4, hA: [26, 70], hB: [6, 62], fA: [22, 0], fB: [-22, 0] },
  crouch:  { hip: [-4, 46], torso: 66, head: 14, hA: [30, 52], hB: [-14, 44], fA: [28, 0], fB: [-28, 0] },
  step:    { hip: [6, 64], torso: 78, head: -2, hA: [22, 66], hB: [-12, 58], fA: [30, 2], fB: [-14, 0] },
  lunge:   { hip: [10, 58], torso: 66, head: 4, hA: [40, 100], hB: [-20, 66], fA: [36, 0], fB: [-30, 0] },
  jab:     { hip: [6, 63], torso: 78, head: -6, hA: [60, 104], hB: [12, 76], fA: [30, 0], fB: [-26, 0] },
  reach:   { hip: [8, 60], torso: 70, head: 2, hA: [60, 96], hB: [10, 80], fA: [32, 0], fB: [-26, 0] },
  recoil:  { hip: [-8, 62], torso: 112, head: 34, hA: [-8, 96], hB: [-34, 86], fA: [16, 0], fB: [-30, 0] },
  hop:     { hip: [-6, 64], torso: 100, head: -10, hA: [-10, 108], hB: [-36, 100], fA: [52, 70], fB: [-4, 6] },
  kick:    { hip: [-6, 68], torso: 104, head: -14, hA: [-4, 92], hB: [-30, 84], fA: [66, 82], fB: [-6, 0], kA: [1, 0.5] },
  chamber: { hip: [-2, 66], torso: 96, head: -8, hA: [16, 84], hB: [-14, 74], fA: [30, 46], fB: [-6, 0], kA: [1, 0.6] },
  pull:    { loose: [0, 0], hip: [-14, 58], torso: 104, head: -6, hA: [30, 92], hB: [22, 84], fA: [24, 0], fB: [-36, 0] },
  heave:   { loose: [0.3, 0.3], hip: [-6, 62], torso: 128, head: 18, hA: [-10, 142], hB: [-20, 136], fA: [30, 0], fB: [-24, 0] },
  tuck:    { hip: [0, 52], torso: 84, head: 6, hA: [22, 70], hB: [10, 62], fA: [18, 26], fB: [4, 22] },
  sprawl:  { hip: [0, 22], torso: 160, head: 10, hA: [-60, 30], hB: [-40, 50], fA: [40, 8], fB: [30, 20] },
  kneel:   { hip: [-6, 38], torso: 70, head: 10, hA: [36, 4], hB: [-30, 40], fA: [24, 0], fB: [-36, 4], kB: [1, -0.2] },
  duck:    { hip: [-6, 32], torso: 42, head: 18, hA: [30, 66], hB: [16, 60], fA: [28, 0], fB: [-30, 0] },
  upper:   { hip: [8, 66], torso: 84, head: -10, hA: [44, 160], hB: [-24, 60], fA: [26, 0], fB: [-26, 6], eA: [1, -0.6] },
  airhit:  { hip: [0, 60], torso: 150, head: 40, hA: [-30, 120], hB: [10, 130], fA: [30, 20], fB: [-10, 10] },
  land:    { hip: [-8, 30], torso: 56, head: 22, hA: [40, 0], hB: [-40, 52], fA: [24, 0], fB: [-36, 6], kB: [1, 0.3] },
  beckon:  { hip: [0, 68], torso: 90, head: -6, hA: [44, 96], hB: [-8, 38], fA: [14, 0], fB: [-14, 0], eA: [0, -1] },
};
const HINT = { eA: [-0.3, -1], eB: [-0.3, -1], kA: [1, 0.25], kB: [1, 0.25] };

// ---------- tracks ----------
export class Track {
  constructor(name, opts = {}) { this.name = name; Object.assign(this, opts); this.keys = []; }
  // at(t, pose, { x | dx, y, f, rot, e, arc, aim: { hA: 'blue.C' | [opp, part, dx, dy] }, ...poseOverrides })
  at(t, pose, o = {}) {
    const prev = this.keys.at(-1);
    const base = typeof pose === 'string' ? POSES[pose] : pose;
    if (!base) throw new Error('unknown pose ' + pose);
    const p = { ...HINT, loose: [0.8, 0.8], bob: 0, walk: 0, ...base };
    for (const [k, v] of Object.entries(o)) if (!['x', 'dx', 'y', 'f', 'rot', 'e', 'arc', 'aim'].includes(k)) p[k] = v;
    const k = { t, p, x: o.x ?? (prev ? prev.x + (o.dx || 0) : 0), y: o.y ?? 0, f: o.f ?? (prev ? prev.f : 1),
      rot: o.rot ?? (prev ? prev.rot : 0), e: o.e || 'io', arc: o.arc || 0, aim: o.aim || null };
    if (k.aim) {   // aimed limbs are under control: no spring
      if (k.aim.hA) p.loose = [0, p.loose[1]];
      if (k.aim.hB) p.loose = [p.loose[0], 0];
    }
    this.keys.push(k); this.keys.sort((a, b) => a.t - b.t);
    return this;
  }
  hold(t, o = {}) { const k = this.keys.at(-1); this.keys.push({ ...k, t, e: o.e || 'lin', arc: 0, p: { ...k.p }, aim: k.aim }); return this; }
  sample(t) {
    const K = this.keys;
    if (t <= K[0].t) return { ...K[0] };
    if (t >= K.at(-1).t) return { ...K.at(-1) };
    let i = 0; while (K[i + 1].t < t) i++;
    const a = K[i], b = K[i + 1], ul = (t - a.t) / (b.t - a.t), u = EASE[b.e](ul);
    const p = {};
    for (const key of Object.keys(b.p)) {
      const va = a.p[key] ?? b.p[key], vb = b.p[key];
      p[key] = Array.isArray(vb) ? vb.map((v, j) => lerp(va[j], v, u)) : lerp(va, vb, u);
    }
    return { p, x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + b.arc * 4 * ul * (1 - ul), f: ul < 0.5 ? a.f : b.f, rot: lerp(a.rot, b.rot, u) };
  }
}

// Resolve aims into local targets, in passes (strikes first, then the things that react to strikes).
export function solveAims(tracks) {
  const all = [];
  for (const tr of Object.values(tracks)) for (const k of tr.keys) if (k.aim) for (const [limb, spec] of Object.entries(k.aim)) all.push({ tr, k, limb, spec: typeof spec === 'string' ? [spec] : spec });
  all.sort((a, b) => (a.spec[3] || 0) - (b.spec[3] || 0));   // spec[3] = pass number
  for (const { tr, k, limb, spec } of all) {
    const [ref, ox = 0, oy = 0] = spec;
    const [opp, part] = ref.split('.');
    const J = joints(tracks[opp], k.t);
    const w = J[part];
    // world → this fighter's local space at this key (keys hold root x, y, f exactly)
    k.p[limb] = [(w[0] + ox * k.f * -1 - k.x) * k.f, w[1] + oy - k.y];
  }
}

// 2-bone IK with a bend hint; allows a little stretch past full reach (rubber hose)
function ik(S, T, a, b, hint, stretch = 1.12) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1e-3;
  const s = clamp(d / (a + b), 1, stretch);
  a *= s; b *= s;
  const dd = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = Math.atan2(dy, dx), ang = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const c1 = [S[0] + a * Math.cos(base + ang), S[1] + a * Math.sin(base + ang)];
  const c2 = [S[0] + a * Math.cos(base - ang), S[1] + a * Math.sin(base - ang)];
  const m = [(S[0] + T[0]) / 2, (S[1] + T[1]) / 2];
  const J = (c1[0] - m[0]) * hint[0] + (c1[1] - m[1]) * hint[1] >= (c2[0] - m[0]) * hint[0] + (c2[1] - m[1]) * hint[1] ? c1 : c2;
  const E = d > a + b ? [S[0] + dx / d * (a + b), S[1] + dy / d * (a + b)] : T;
  return [J, E];
}

// world joints at story time t. `springs` (optional) replaces loose hand targets with lagged world positions.
export function joints(tr, t, springs = null) {
  const s = tr.sample(t), p = s.p;
  const bob = p.bob ? Math.abs(Math.sin(t * Math.PI * 2.4 + (tr.phase || 0))) * p.bob : 0;
  const breath = Math.sin(t * 2.2 + (tr.phase || 0)) * 1.0;
  const H = [p.hip[0], p.hip[1] + bob];
  const td = dir(p.torso);
  const N = [H[0] + LEN.spine * td[0], H[1] + LEN.spine * td[1] + breath * 0.4];
  const hd = dir(p.torso + p.head);
  const C = [N[0] + (LEN.neck + LEN.head) * hd[0], N[1] + (LEN.neck + LEN.head) * hd[1]];
  const sh = [N[0] - 4 * td[0], N[1] - 4 * td[1]];
  let FA = p.fA, FB = p.fB;
  if (p.walk) {
    const ph = s.x * 0.08;
    FA = [FA[0] + Math.sin(ph) * 15 * p.walk * s.f, FA[1] + Math.max(0, Math.cos(ph)) * 9 * p.walk];
    FB = [FB[0] - Math.sin(ph) * 15 * p.walk * s.f, FB[1] + Math.max(0, -Math.cos(ph)) * 9 * p.walk];
  }
  const [kA, fA] = ik(H, FA, LEN.thigh, LEN.shin, p.kA, 1.05);
  const [kB, fB] = ik(H, FB, LEN.thigh, LEN.shin, p.kB, 1.05);
  const L = { H, N, C, sh, kA, fA, kB, fB, hAt: [p.hA[0], p.hA[1] + bob + breath], hBt: [p.hB[0], p.hB[1] + bob + breath] };
  const r = s.rot * D, cr = Math.cos(r), sr = Math.sin(r);
  const toW = (v) => { const lx = v[0] - H[0], ly = v[1] - H[1]; return [s.x + s.f * (H[0] + lx * cr - ly * sr), s.y + H[1] + lx * sr + ly * cr]; };
  const hintW = (h) => { const x = h[0] * cr - h[1] * sr, y = h[0] * sr + h[1] * cr; return [s.f * x, y]; };
  const W = {};
  for (const [k, v] of Object.entries(L)) W[k] = toW(v);
  // arms solved in world space so springs can drag the hands
  for (const [limb, el, tgt, hk, li] of [['hA', 'eA', 'hAt', 'eA', 0], ['hB', 'eB', 'hBt', 'eB', 1]]) {
    let T = W[tgt];
    if (springs && springs[limb]) T = [lerp(T[0], springs[limb][0], p.loose[li]), lerp(T[1], springs[limb][1], p.loose[li])];
    const [E, Hd] = ik(W.sh, T, LEN.upper, LEN.fore, hintW(p[hk]));
    W[el] = E; W[limb] = Hd;
  }
  W.f = s.f; W.x = s.x; W.y = s.y; W.rot = s.rot; W.loose = p.loose;
  W.headAng = s.f > 0 ? p.torso + p.head + s.rot : 180 - (p.torso + p.head + s.rot);
  return W;
}

// damped springs for loose hands (stateful: advance once per rendered frame)
export class Springs {
  constructor() { this.s = {}; }
  step(tr, t, dt) {
    const J = joints(tr, t);
    for (const limb of ['hA', 'hB']) {
      const tgt = J[limb + 't'] || J[limb];
      let st = this.s[limb];
      if (!st) st = this.s[limb] = { p: [...tgt], v: [0, 0] };
      if (dt > 0) {
        const k = 170, c = 13, n = 4, h = dt / n;
        for (let i = 0; i < n; i++) for (let a = 0; a < 2; a++) {
          const acc = k * (tgt[a] - st.p[a]) - c * st.v[a] + (a === 1 ? -60 : 0);
          st.v[a] += acc * h; st.p[a] += st.v[a] * h;
        }
      }
    }
    return { hA: this.s.hA.p, hB: this.s.hB.p };
  }
}

// ---------- drawing ----------
export function limbPath(ctx, S, J, E) {
  // rubber hose: two segments joined by a soft round bend (never an S-squiggle, never overshooting)
  const ax = S[0] - J[0], ay = S[1] - J[1], bx = E[0] - J[0], by = E[1] - J[1];
  const l1 = Math.hypot(ax, ay), l2 = Math.hypot(bx, by);
  ctx.moveTo(S[0], S[1]);
  if (l1 < 1 || l2 < 1) { ctx.lineTo(E[0], E[1]); return; }
  const th = Math.acos(clamp((ax * bx + ay * by) / (l1 * l2), -1, 1));   // interior angle at the joint
  const r = Math.min(16, Math.tan(th / 2) * 0.45 * Math.min(l1, l2));
  if (th > 3.1 || r < 0.5) ctx.lineTo(J[0], J[1]); else ctx.arcTo(J[0], J[1], E[0], E[1], r);
  ctx.lineTo(E[0], E[1]);
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(clamp(v * k, 0, 255)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export function drawFighter(ctx, J, F, { alpha = 1, mono = null, width = 11 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width;
  const near = mono || F.color, far = mono || shade(F.color, 0.72);
  const L = (S, Jn, E, col) => { ctx.strokeStyle = col; ctx.beginPath(); limbPath(ctx, S, Jn, E); ctx.stroke(); };
  L(J.sh, J.eB, J.hB, far); L(J.H, J.kB, J.fB, far);
  ctx.strokeStyle = near; ctx.beginPath(); ctx.moveTo(...J.H); ctx.lineTo(...J.N); ctx.stroke();
  L(J.H, J.kA, J.fA, near);
  ctx.fillStyle = near; ctx.beginPath(); ctx.arc(J.C[0], J.C[1], LEN.head, 0, Math.PI * 2); ctx.fill();
  L(J.sh, J.eA, J.hA, near);
  ctx.restore();
}
