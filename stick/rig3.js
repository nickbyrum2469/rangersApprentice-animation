// Rig v3 — fluid Becker-style stick fighters.
//  * motion passes THROUGH keys on smooth splines (no dead stop at every key); snaps only where asked
//  * elbows/knees bend a fixed anatomical way (elbows fold the forearm forward, knees point forward): never backwards
//  * curved spine, head on a spring (lags and bobs), loose hands on springs (follow-through)
//  * contact aiming against the opponent's real body, or against props
// Local pose space: facing right, x forward, y up, origin = ground point under the fighter.

export const LEN = { spine: 44, neck: 3, head: 19, upper: 29, fore: 29, thigh: 35, shin: 35 };
const D = Math.PI / 180;
const dir = (a) => [Math.cos(a * D), Math.sin(a * D)];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const EASE = {
  lin: (u) => u, io: (u) => u * u * (3 - 2 * u), out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u,
  back: (u) => { const c = 2.0; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

export const POSES = {
  idle:    { hip: [0, 68], torso: 88, bend: 2, head: -2, hA: [14, 36], hB: [-8, 38], fA: [14, 0], fB: [-16, 0] },
  cool:    { hip: [0, 69], torso: 96, bend: -4, head: 8, hA: [10, 92], hB: [4, 88], fA: [18, 0], fB: [-12, 0] },          // arms crossed, leaning back
  fight:   { hip: [0, 63], torso: 80, bend: 6, head: -6, hA: [28, 76], hB: [10, 68], fA: [22, 0], fB: [-22, 0] },
  crouch:  { hip: [-4, 44], torso: 62, bend: 10, head: 14, hA: [30, 52], hB: [-16, 42], fA: [28, 0], fB: [-28, 0] },
  run:     { hip: [6, 62], torso: 62, bend: 8, head: 18, hA: [-26, 70], hB: [30, 84], fA: [26, 6], fB: [-30, 18] },
  jab:     { hip: [6, 63], torso: 76, bend: 4, head: -6, hA: [60, 104], hB: [12, 76], fA: [30, 0], fB: [-26, 0] },
  cross:   { hip: [12, 61], torso: 68, bend: 6, head: -2, hA: [16, 80], hB: [66, 104], fA: [32, 0], fB: [-20, 2] },
  hook:    { hip: [8, 62], torso: 72, bend: 4, head: 0, hA: [18, 80], hB: [56, 112], fA: [30, 0], fB: [-22, 2] },
  body:    { hip: [10, 54], torso: 60, bend: 10, head: 10, hA: [16, 76], hB: [60, 70], fA: [34, 0], fB: [-26, 0] },
  guardHi: { hip: [-3, 64], torso: 96, bend: -4, head: -14, hA: [26, 122], hB: [20, 112], fA: [20, 0], fB: [-28, 0] },
  cross2:  { hip: [-6, 62], torso: 98, bend: -6, head: -16, hA: [30, 112], hB: [30, 100], fA: [18, 0], fB: [-30, 0] },     // crossed-arm block
  duck:    { hip: [-6, 32], torso: 42, bend: 16, head: 22, hA: [30, 62], hB: [14, 56], fA: [28, 0], fB: [-30, 0] },
  lean:    { hip: [2, 60], torso: 136, bend: -14, head: 20, hA: [-8, 112], hB: [-34, 94], fA: [28, 0], fB: [-12, 0] },
  rkick:   { hip: [-8, 72], torso: 122, bend: -8, head: -26, hA: [10, 104], hB: [-26, 96], fA: [72, 118], fB: [-6, 0] },
  chamber: { hip: [-2, 68], torso: 98, bend: 0, head: -10, hA: [18, 84], hB: [-12, 74], fA: [30, 46], fB: [-6, 0] },
  sweep:   { hip: [-4, 24], torso: 70, bend: 10, head: 14, hA: [18, 2], hB: [-32, 40], fA: [80, 6], fB: [-10, 0], kA: -1 },
  hitBody: { hip: [-12, 54], torso: 56, bend: 22, head: 26, hA: [14, 66], hB: [6, 72], fA: [16, 0], fB: [-30, 0] },
  hitHead: { hip: [-10, 64], torso: 118, bend: -14, head: 34, hA: [-6, 100], hB: [-30, 108], fA: [16, 0], fB: [-28, 0] },
  airhit:  { hip: [0, 60], torso: 150, bend: -18, head: 40, hA: [-30, 120], hB: [10, 130], fA: [36, 24], fB: [14, 6] },
  tuck:    { hip: [0, 52], torso: 84, bend: 18, head: 10, hA: [24, 70], hB: [12, 62], fA: [18, 26], fB: [4, 22] },
  flykick: { hip: [0, 64], torso: 112, bend: -8, head: -20, hA: [-6, 104], hB: [-32, 96], fA: [76, 78], fB: [-14, 34] },
  dblkick: { hip: [0, 64], torso: 150, bend: -10, head: -40, hA: [-30, 110], hB: [-20, 120], fA: [74, 70], fB: [70, 58] },
  knee:    { hip: [0, 64], torso: 84, bend: 8, head: -4, hA: [34, 112], hB: [20, 108], fA: [24, 66], fB: [-10, 26] },
  land:    { hip: [-8, 30], torso: 56, bend: 12, head: 22, hA: [40, 0], hB: [-40, 52], fA: [24, 0], fB: [-36, 6] },
  sit:     { hip: [6, 16], torso: 98, bend: 14, head: 26, hA: [26, 4], hB: [10, 6], fA: [64, 0], fB: [52, 0] },
  kneel:   { hip: [-6, 38], torso: 70, bend: 10, head: 10, hA: [36, 4], hB: [-30, 40], fA: [24, 0], fB: [-36, 4] },
  throw:   { hip: [10, 62], torso: 74, bend: 4, head: -4, hA: [70, 96], hB: [-20, 70], fA: [32, 0], fB: [-24, 2] },
  windup:  { hip: [-8, 64], torso: 100, bend: -6, head: 6, hA: [-46, 92], hB: [20, 80], fA: [26, 0], fB: [-28, 0] },
  wallrun: { hip: [0, 64], torso: 70, bend: 10, head: 10, hA: [-20, 70], hB: [30, 90], fA: [30, 20], fB: [-24, 40] },
  beckon:  { hip: [0, 68], torso: 90, bend: 0, head: -6, hA: [44, 96], hB: [-8, 38], fA: [14, 0], fB: [-14, 0] },
  ouch:    { hip: [-4, 66], torso: 96, bend: 4, head: 10, hA: [20, 120], hB: [16, 90], fA: [14, 0], fB: [-18, 0] },
};
// fixed bend directions (local space): arms -1 (forearm folds forward/up), legs +1 (knee forward)
const DEF = { eA: -1, eB: -1, kA: 1, kB: 1, loose: [0.85, 0.85], bob: 0, walk: 0, bend: 0, head: 0 };
const FIXED = ['eA', 'eB', 'kA', 'kB'];   // not interpolated

export class Track {
  constructor(name, opts = {}) { this.name = name; Object.assign(this, opts); this.keys = []; }
  // at(t, pose, { x | dx, y, f, rot, e, arc, aim: { hA: ['blue.C', stopShort, dy, pass] | ['@lid', ...] }, ...poseOverrides })
  at(t, pose, o = {}) {
    const prev = this.keys.at(-1);
    const base = typeof pose === 'string' ? POSES[pose] : pose;
    if (!base) throw new Error('unknown pose ' + pose);
    const p = { ...DEF, ...base };
    for (const [k, v] of Object.entries(o)) if (!['x', 'dx', 'y', 'dy', 'f', 'rot', 'e', 'arc', 'aim'].includes(k)) p[k] = v;
    const k = { t, p, x: o.x ?? (prev ? prev.x + (o.dx || 0) : 0), y: o.y ?? (o.dy !== undefined && prev ? prev.y + o.dy : 0), f: o.f ?? (prev ? prev.f : 1),
      rot: o.rot ?? (prev ? prev.rot : 0), e: o.e || 'spline', arc: o.arc || 0, aim: o.aim || null };
    if (k.aim) { const l = [...p.loose]; if (k.aim.hA) l[0] = 0; if (k.aim.hB) l[1] = 0; p.loose = l; }
    this.keys.push(k); this.keys.sort((a, b) => a.t - b.t);
    return this;
  }
  hold(t, o = {}) { const k = this.keys.at(-1); this.keys.push({ ...k, t, e: o.e || 'lin', arc: 0, p: { ...k.p } }); return this; }
  sample(t) {
    const K = this.keys;
    if (t <= K[0].t) return K[0];
    if (t >= K.at(-1).t) return K.at(-1);
    let i = 0; while (K[i + 1].t < t) i++;
    const a = K[i], b = K[i + 1], ul = (t - a.t) / (b.t - a.t);
    const out = { p: { ...b.p }, f: ul < 0.5 ? a.f : b.f };
    if (b.e !== 'spline') {
      const u = EASE[b.e](ul);
      for (const key of Object.keys(b.p)) if (!FIXED.includes(key)) out.p[key] = mix(a.p[key] ?? b.p[key], b.p[key], u);
      out.x = lerp(a.x, b.x, u); out.y = lerp(a.y, b.y, u); out.rot = lerp(a.rot, b.rot, u);
    } else {
      // Hermite through the keys; tangents from neighbours (zero next to snaps/holds so strikes stay crisp)
      const z = K[i - 1], c = K[i + 2], dt = b.t - a.t;
      const tanA = z && a.e === 'spline' ? 1 : 0, tanB = c && c.e === 'spline' ? 1 : 0;
      const herm = (va, vb, vz, vc) => {
        const ma = tanA && vz !== undefined ? (vb - vz) / (b.t - z.t) * dt * 0.8 : 0;
        const mb = tanB && vc !== undefined ? (vc - va) / (c.t - a.t) * dt * 0.8 : 0;
        const u = ul, u2 = u * u, u3 = u2 * u;
        return (2 * u3 - 3 * u2 + 1) * va + (u3 - 2 * u2 + u) * ma + (-2 * u3 + 3 * u2) * vb + (u3 - u2) * mb;
      };
      for (const key of Object.keys(b.p)) {
        if (FIXED.includes(key)) continue;
        const va = a.p[key] ?? b.p[key], vb = b.p[key], vz = z?.p[key] ?? va, vc = c?.p[key] ?? vb;
        out.p[key] = Array.isArray(vb) ? vb.map((v, j) => herm(va[j], v, vz[j], vc[j])) : herm(va, vb, vz, vc);
      }
      out.x = herm(a.x, b.x, z?.x, c?.x); out.y = herm(a.y, b.y, z?.y, c?.y); out.rot = herm(a.rot, b.rot, z?.rot, c?.rot);
    }
    out.y += b.arc * 4 * ul * (1 - ul);
    for (const k of FIXED) out.p[k] = ul < 0.5 ? a.p[k] : b.p[k];
    return out;
  }
}
const mix = (a, b, u) => (Array.isArray(b) ? b.map((v, j) => lerp(a[j], v, u)) : lerp(a, b, u));

// Resolve aims into local targets, pass by pass (attacks first, then reactions)
export function solveAims(tracks, props = {}) {
  const all = [];
  for (const tr of Object.values(tracks)) for (const k of tr.keys) if (k.aim) for (const [limb, spec] of Object.entries(k.aim)) all.push({ tr, k, limb, spec });
  all.sort((a, b) => (a.spec[3] || 0) - (b.spec[3] || 0));
  for (const { k, limb, spec } of all) {
    const [ref, ox = 0, oy = 0] = spec;
    let w;
    if (ref.startsWith('@')) w = props[ref.slice(1)].sample(k.t, tracks);
    else if (ref.startsWith('#')) w = ref.slice(1).split(',').map(Number);
    else { const [opp, part] = ref.split('.'); w = joints(tracks[opp], k.t)[part]; }
    k.p[limb] = [(w[0] - ox * k.f - k.x) * k.f, w[1] + oy - k.y];
    if (k.rot) {   // undo the body rotation so the target lands in rotated space correctly
      const H = k.p.hip, r = -k.rot * D, lx = k.p[limb][0] - H[0], ly = k.p[limb][1] - H[1];
      k.p[limb] = [H[0] + lx * Math.cos(r) - ly * Math.sin(r), H[1] + lx * Math.sin(r) + ly * Math.cos(r)];
    }
  }
}

function ik(S, T, a, b, sign, stretch = 1.12) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1e-3;
  const s = clamp(d / (a + b), 1, stretch); a *= s; b *= s;
  const dd = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = Math.atan2(dy, dx), ang = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const J = [S[0] + a * Math.cos(base + sign * ang), S[1] + a * Math.sin(base + sign * ang)];
  const E = d > a + b ? [S[0] + dx / d * (a + b), S[1] + dy / d * (a + b)] : T;
  return [J, E];
}

// world joints at story time t; `sp` = spring state { hA, hB, C } in world space (optional)
export function joints(tr, t, sp = null) {
  const s = tr.sample(t), p = s.p;
  const bob = p.bob ? Math.abs(Math.sin(t * Math.PI * 2.4 + (tr.phase || 0))) * p.bob : 0;
  const breath = Math.sin(t * 2.2 + (tr.phase || 0)) * 1.0;
  const r = s.rot * D, cr = Math.cos(r), sr = Math.sin(r);
  const H = [p.hip[0], p.hip[1] + bob];
  const td = dir(p.torso), fwd = dir(p.torso - 90);
  const N = [H[0] + LEN.spine * td[0], H[1] + LEN.spine * td[1] + breath * 0.4];
  const M = [(H[0] + N[0]) / 2 + fwd[0] * p.bend, (H[1] + N[1]) / 2 + fwd[1] * p.bend];   // spine curve control
  const hd = dir(p.torso + p.head + p.bend * 0.8);
  let C = [N[0] + (LEN.neck + LEN.head) * hd[0], N[1] + (LEN.neck + LEN.head) * hd[1]];
  const sh = [N[0] - 4 * td[0], N[1] - 4 * td[1]];
  // local <-> world
  const toW = (v) => { const lx = v[0] - H[0], ly = v[1] - H[1]; return [s.x + s.f * (H[0] + lx * cr - ly * sr), s.y + H[1] + lx * sr + ly * cr]; };
  const toL = (w) => { const lx = (w[0] - s.x) * s.f - H[0], ly = w[1] - s.y - H[1]; return [H[0] + lx * cr + ly * sr, H[1] - lx * sr + ly * cr]; };
  let FA = p.fA, FB = p.fB;
  if (p.walk) {
    const ph = s.x * 0.08;
    FA = [FA[0] + Math.sin(ph) * 15 * p.walk * s.f, FA[1] + Math.max(0, Math.cos(ph)) * 10 * p.walk];
    FB = [FB[0] - Math.sin(ph) * 15 * p.walk * s.f, FB[1] + Math.max(0, -Math.cos(ph)) * 10 * p.walk];
  }
  let hA = [p.hA[0], p.hA[1] + bob + breath], hB = [p.hB[0], p.hB[1] + bob + breath];
  if (sp) {
    const la = toL(sp.hA), lb = toL(sp.hB);
    hA = [lerp(hA[0], la[0], p.loose[0]), lerp(hA[1], la[1], p.loose[0])];
    hB = [lerp(hB[0], lb[0], p.loose[1]), lerp(hB[1], lb[1], p.loose[1])];
    if (sp.C) {   // head lags on a spring, but stays attached to the neck
      const lc = toL(sp.C), q = [lerp(C[0], lc[0], 0.55), lerp(C[1], lc[1], 0.55)];
      const dx = q[0] - N[0], dy = q[1] - N[1], d = Math.hypot(dx, dy) || 1;
      C = [N[0] + dx / d * (LEN.neck + LEN.head), N[1] + dy / d * (LEN.neck + LEN.head)];
    }
  }
  const [eA, HA] = ik(sh, hA, LEN.upper, LEN.fore, p.eA);
  const [eB, HB] = ik(sh, hB, LEN.upper, LEN.fore, p.eB);
  if (sp && sp.fA) FA = toL(sp.fA);   // planted feet (world-locked) override the pose
  if (sp && sp.fB) FB = toL(sp.fB);
  const [kA, fA] = ik(H, FA, LEN.thigh, LEN.shin, p.kA, 1.05);
  const [kB, fB] = ik(H, FB, LEN.thigh, LEN.shin, p.kB, 1.05);
  const L = { H, M, N, C, sh, eA, hA: HA, eB, hB: HB, kA, fA, kB, fB, hAt: hA, hBt: hB, fAt: FA, fBt: FB, Ct: [N[0] + (LEN.neck + LEN.head) * hd[0], N[1] + (LEN.neck + LEN.head) * hd[1]] };
  const W = {};
  for (const [k, v] of Object.entries(L)) W[k] = toW(v);
  W.chest = [(W.N[0] * 2 + W.H[0]) / 3, (W.N[1] * 2 + W.H[1]) / 3];
  W.f = s.f; W.x = s.x; W.y = s.y; W.rot = s.rot;
  return W;
}

// damped springs (stateful; advance once per rendered frame)
export class Springs {
  constructor() { this.s = {}; }
  step(tr, t, dt) {
    const J = joints(tr, t);
    for (const [key, tgt, k, c] of [['hA', J.hAt, 150, 12], ['hB', J.hBt, 150, 12], ['C', J.Ct, 260, 16]]) {
      let st = this.s[key];
      if (!st) st = this.s[key] = { p: [...tgt], v: [0, 0] };
      if (dt > 0) {
        const n = 4, h = dt / n;
        for (let i = 0; i < n; i++) for (let a = 0; a < 2; a++) {
          st.v[a] += (k * (tgt[a] - st.p[a]) - c * st.v[a] - (a === 1 && key !== 'C' ? 50 : 0)) * h; st.p[a] += st.v[a] * h;
        }
      }
    }
    return { hA: this.s.hA.p, hB: this.s.hB.p, C: this.s.C.p };
  }
}

export function limbPath(ctx, S, J, E) {
  const ax = S[0] - J[0], ay = S[1] - J[1], bx = E[0] - J[0], by = E[1] - J[1];
  const l1 = Math.hypot(ax, ay), l2 = Math.hypot(bx, by);
  ctx.moveTo(S[0], S[1]);
  if (l1 < 1 || l2 < 1) { ctx.lineTo(E[0], E[1]); return; }
  const th = Math.acos(clamp((ax * bx + ay * by) / (l1 * l2), -1, 1));
  const r = Math.min(15, Math.tan(th / 2) * 0.45 * Math.min(l1, l2));
  if (th > 3.1 || r < 0.5) ctx.lineTo(J[0], J[1]); else ctx.arcTo(J[0], J[1], E[0], E[1], r);
  ctx.lineTo(E[0], E[1]);
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(clamp(v * k, 0, 255)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// squash: [amount 0..1, angle] squashes the head along the hit direction
export function drawFighter(ctx, J, F, { alpha = 1, mono = null, width = 11, squash = null } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width;
  const near = mono || F.color, far = mono || shade(F.color, 0.72);
  const L = (S, Jn, E, col) => { ctx.strokeStyle = col; ctx.beginPath(); limbPath(ctx, S, Jn, E); ctx.stroke(); };
  L(J.sh, J.eB, J.hB, far); L(J.H, J.kB, J.fB, far);
  ctx.strokeStyle = near; ctx.beginPath(); ctx.moveTo(...J.H); ctx.quadraticCurveTo(J.M[0], J.M[1], J.N[0], J.N[1]); ctx.stroke();
  L(J.H, J.kA, J.fA, near);
  ctx.fillStyle = near; ctx.beginPath();
  if (squash && squash[0] > 0.01) {
    ctx.save(); ctx.translate(J.C[0], J.C[1]); ctx.rotate(squash[1]); ctx.scale(1 - squash[0] * 0.35, 1 + squash[0] * 0.2);
    ctx.arc(0, 0, LEN.head, 0, Math.PI * 2); ctx.restore();
  } else ctx.arc(J.C[0], J.C[1], LEN.head, 0, Math.PI * 2);
  ctx.fill();
  L(J.sh, J.eA, J.hA, near);
  ctx.restore();
}

export class FootLock {
  constructor() { this.s = {}; }
  // J0: joints without lock; returns world foot positions to use
  step(J0, t, dt) {
    const out = {};
    const grounded = Math.abs(J0.y) < 2 && Math.abs(J0.rot % 360) < 5;
    for (const [key, other] of [['fA', 'fB'], ['fB', 'fA']]) {
      const want = J0[key + 't'];
      let st = this.s[key];
      if (!st) st = this.s[key] = { pos: [...want], step: null };
      if (!grounded || want[1] > 4) { st.pos = [...want]; st.step = null; out[key] = null; continue; }   // foot in the air: follow the pose
      if (dt > 0) {
        if (st.step) {
          st.step.u += dt / st.step.dur;
          st.step.to = [want[0], 0];
          if (st.step.u >= 1) { st.pos = st.step.to; st.step = null; }
        } else if (Math.hypot(want[0] - st.pos[0], want[1] - st.pos[1]) > 16 && !(this.s[other] && this.s[other].step && this.s[other].step.u < 0.5)) {
          st.step = { from: [...st.pos], to: [want[0], 0], u: 0, dur: 0.11 };
        }
      }
      if (st.step) { const u = st.step.u; st.pos = [lerp(st.step.from[0], st.step.to[0], u), Math.sin(Math.PI * u) * 13]; }
      out[key] = st.pos;
    }
    return out;
  }
}
