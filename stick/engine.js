// Stick-fight engine: posed skeletons with IK, keyframed choreography, hit-stop time warp,
// motion trails, sparks, shockwaves, impact frames, cloth tails, camera with shake and punch-zoom.
// Local pose space: facing right, x forward, y up, origin = the ground point under the fighter.

export const FPS = 24;
export const LEN = { spine: 50, neck: 8, head: 13, upper: 31, fore: 31, thigh: 38, shin: 38 };
const D = Math.PI / 180;
const dir = (a) => [Math.cos(a * D), Math.sin(a * D)];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
const EASE = {
  lin: (u) => u,
  io: (u) => u * u * (3 - 2 * u),
  out: (u) => 1 - Math.pow(1 - u, 3),     // snap: strikes
  in: (u) => u * u * u,                   // wind-ups
  snap: (u) => (u < 0.5 ? 0 : 1),
};
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- pose library (facing right) ----------
const G = { hA: [30, 112], hB: [15, 103] };
export const POSES = {
  stand:   { hip: [0, 73], torso: 91, head: 0, hA: [8, 42], hB: [-6, 42], fA: [10, 0], fB: [-11, 0] },
  guard:   { hip: [0, 66], torso: 80, head: -6, ...G, fA: [23, 0], fB: [-25, 0] },
  ready:   { hip: [-6, 54], torso: 66, head: 10, hA: [30, 92], hB: [-14, 80], fA: [27, 0], fB: [-32, 0] },
  dash:    { hip: [8, 60], torso: 38, head: 30, hA: [-34, 84], hB: [-44, 96], fA: [32, 12], fB: [-42, 26] },
  jab:     { hip: [6, 66], torso: 76, head: -4, hA: [76, 113], hB: [18, 104], fA: [28, 0], fB: [-24, 0] },
  cross:   { hip: [12, 63], torso: 68, head: 0, hA: [22, 104], hB: [86, 112], fA: [30, 0], fB: [-18, 2] },
  windB:   { hip: [-2, 65], torso: 86, head: -4, hA: [28, 110], hB: [-14, 106], fA: [22, 0], fB: [-26, 0] },
  hookB:   { hip: [10, 64], torso: 70, head: 0, hA: [24, 106], hB: [70, 120], eB: [0, 1], fA: [28, 0], fB: [-20, 2] },
  upper:   { hip: [6, 60], torso: 84, head: 4, hA: [26, 104], hB: [44, 156], eB: [1, -0.4], fA: [26, 0], fB: [-22, 0] },
  blockHi: { hip: [-3, 66], torso: 96, head: -14, hA: [28, 130], hB: [22, 121], eA: [1, -0.3], eB: [1, -0.3], fA: [20, 0], fB: [-28, 0] },
  blockMid:{ hip: [-4, 62], torso: 92, head: -10, hA: [30, 98], hB: [26, 108], eA: [1, -0.5], eB: [1, -0.5], fA: [20, 0], fB: [-30, 0] },
  parry:   { hip: [-1, 65], torso: 86, head: -6, hA: [44, 94], hB: [16, 106], fA: [22, 0], fB: [-26, 0] },
  duck:    { hip: [-2, 40], torso: 52, head: 20, hA: [36, 82], hB: [22, 76], fA: [28, 0], fB: [-30, 0] },
  slip:    { hip: [4, 52], torso: 58, head: 10, hA: [62, 82], hB: [20, 92], fA: [32, 0], fB: [-26, 0] },
  lean:    { hip: [2, 62], torso: 132, head: 20, hA: [-6, 112], hB: [-30, 96], fA: [26, 0], fB: [-12, 0] },
  fkick:   { hip: [-6, 74], torso: 106, head: -16, hA: [24, 112], hB: [6, 104], fA: [70, 82], kA: [1, 0.4], fB: [-8, 0] },
  chamber: { hip: [-2, 70], torso: 98, head: -10, hA: [24, 112], hB: [8, 104], fA: [30, 50], kA: [1, 0.6], fB: [-8, 0] },
  rkick:   { hip: [-8, 74], torso: 124, head: -26, hA: [20, 118], hB: [-20, 110], fA: [76, 116], kA: [1, 1], fB: [-6, 0] },
  bkick:   { hip: [2, 70], torso: 60, head: 30, hA: [30, 100], hB: [10, 110], fA: [16, 0], fB: [-82, 78], kB: [-1, 0.2] },
  turn:    { hip: [0, 60], torso: 76, head: 0, hA: [22, 100], hB: [8, 96], fA: [16, 0], fB: [-16, 6] },
  sweep:   { hip: [-4, 26], torso: 64, head: 14, hA: [16, 2], hB: [-30, 40], fA: [84, 6], kA: [0, 1], fB: [-10, 0] },
  tuck:    { hip: [0, 64], torso: 80, head: 0, hA: [26, 96], hB: [16, 90], fA: [16, 36], fB: [-2, 30] },
  airkick: { hip: [0, 64], torso: 116, head: -20, hA: [-6, 110], hB: [-32, 100], fA: [76, 80], kA: [1, 0.3], fB: [-12, 34] },
  land:    { hip: [-12, 32], torso: 50, head: 26, hA: [44, 2], hB: [-44, 62], fA: [26, 0], fB: [-38, 6], kB: [1, 0.4] },
  hitHead: { hip: [-10, 66], torso: 122, head: 30, hA: [-4, 104], hB: [-26, 112], fA: [16, 0], fB: [-28, 0] },
  hitBody: { hip: [-14, 56], torso: 58, head: 24, hA: [16, 78], hB: [8, 84], eA: [-1, 0], fA: [16, 0], fB: [-30, 0] },
  stagger: { hip: [-6, 62], torso: 100, head: 10, hA: [10, 76], hB: [-26, 88], fA: [6, 0], fB: [-34, 0] },
  wipe:    { hip: [0, 70], torso: 88, head: -6, hA: [40, 122], hB: [-6, 44], eA: [0, -1], fA: [14, 0], fB: [-16, 0] },
  beckon:  { hip: [0, 70], torso: 92, head: -8, hA: [48, 104], eA: [0, -1], hB: [-6, 44], fA: [14, 0], fB: [-14, 0] },
};
const FIELDS2 = ['hip', 'hA', 'hB', 'fA', 'fB', 'eA', 'eB', 'kA', 'kB'];
const DEF_HINT = { eA: [-0.3, -1], eB: [-0.3, -1], kA: [1, 0.25], kB: [1, 0.25] };
function resolve(name, over = {}) {
  const base = typeof name === 'string' ? POSES[name] : name;
  if (!base) throw new Error('unknown pose ' + name);
  const p = { ...DEF_HINT, bob: 0, walk: 0, ...base, ...over };
  for (const k of ['pose', 'x', 'y', 'f', 'rot', 'e', 'arc', 'dx']) delete p[k];
  return p;
}

// ---------- a fighter's track of keys ----------
export class Track {
  constructor(opts) { Object.assign(this, opts); this.keys = []; }
  // at(t, pose, {x|dx, y, f, rot, e, arc, ...poseOverrides})
  at(t, pose, o = {}) {
    const prev = this.keys.at(-1);
    const k = {
      t, p: resolve(pose, o),
      x: o.x ?? (prev ? prev.x + (o.dx || 0) : 0),
      y: o.y ?? 0, f: o.f ?? (prev ? prev.f : 1), rot: o.rot ?? (prev ? prev.rot : 0),
      e: o.e || 'io', arc: o.arc || 0,
    };
    this.keys.push(k); this.keys.sort((a, b) => a.t - b.t);
    return this;
  }
  hold(t) { const k = this.keys.at(-1); this.keys.push({ ...k, t, e: 'lin', arc: 0, p: { ...k.p } }); return this; }
  sample(t) {
    const K = this.keys;
    if (t <= K[0].t) return { ...K[0], p: { ...K[0].p } };
    if (t >= K.at(-1).t) return { ...K.at(-1), p: { ...K.at(-1).p } };
    let i = 0; while (K[i + 1].t < t) i++;
    const a = K[i], b = K[i + 1];
    const u = EASE[b.e]((t - a.t) / (b.t - a.t));
    const p = {};
    for (const key of Object.keys(b.p)) {
      const va = a.p[key] ?? b.p[key], vb = b.p[key];
      p[key] = Array.isArray(vb) ? [lerp(va[0], vb[0], u), lerp(va[1], vb[1], u)] : lerp(va, vb, u);
    }
    const ul = (t - a.t) / (b.t - a.t);
    return { p, x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + b.arc * 4 * ul * (1 - ul), f: u < 0.5 ? a.f : b.f, rot: lerp(a.rot, b.rot, u) };
  }
}

function ik(S, T, a, b, hint) {
  let dx = T[0] - S[0], dy = T[1] - S[1];
  let d = Math.hypot(dx, dy) || 1e-3;
  const dd = clamp(d, Math.abs(a - b) + 0.01, a + b - 0.01);
  const base = Math.atan2(dy, dx);
  const ang = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
  const c1 = [S[0] + a * Math.cos(base + ang), S[1] + a * Math.sin(base + ang)];
  const c2 = [S[0] + a * Math.cos(base - ang), S[1] + a * Math.sin(base - ang)];
  const m = [(S[0] + T[0]) / 2, (S[1] + T[1]) / 2];
  const s1 = (c1[0] - m[0]) * hint[0] + (c1[1] - m[1]) * hint[1];
  const s2 = (c2[0] - m[0]) * hint[0] + (c2[1] - m[1]) * hint[1];
  const J = s1 >= s2 ? c1 : c2;
  // the end can't reach past the limb length
  const e = d > a + b ? [S[0] + dx / d * (a + b), S[1] + dy / d * (a + b)] : T;
  const jd = Math.hypot(e[0] - J[0], e[1] - J[1]) || 1;
  return [J, [J[0] + (e[0] - J[0]) / jd * b, J[1] + (e[1] - J[1]) / jd * b]];
}

// world-space joints for a fighter at story time t
export function joints(tr, t) {
  const s = tr.sample(t), p = s.p;
  const bob = p.bob ? Math.abs(Math.sin(t * Math.PI * 2.6 + tr.phase)) * p.bob : 0;
  const breath = Math.sin(t * 2.4 + tr.phase) * 1.2;
  const H = [p.hip[0], p.hip[1] + bob];
  const N = [H[0] + LEN.spine * dir(p.torso)[0], H[1] + LEN.spine * dir(p.torso)[1] + breath * 0.5];
  const hd = dir(p.torso + p.head);
  const C = [N[0] + (LEN.neck + LEN.head) * hd[0], N[1] + (LEN.neck + LEN.head) * hd[1]];
  const sh = [N[0] - 3 * dir(p.torso)[0], N[1] - 3 * dir(p.torso)[1]];
  const up = (v) => [v[0], v[1] + bob + breath];
  const [eA, hA] = ik(sh, up(p.hA), LEN.upper, LEN.fore, p.eA);
  const [eB, hB] = ik(sh, up(p.hB), LEN.upper, LEN.fore, p.eB);
  let FA = p.fA, FB = p.fB;
  if (p.walk) {   // simple stepping: feet swap with distance travelled
    const ph = s.x * 0.075;
    FA = [FA[0] + Math.sin(ph) * 16 * p.walk * s.f, FA[1] + Math.max(0, Math.cos(ph)) * 9 * p.walk];
    FB = [FB[0] - Math.sin(ph) * 16 * p.walk * s.f, FB[1] + Math.max(0, -Math.cos(ph)) * 9 * p.walk];
  }
  const [kA, fA] = ik(H, FA, LEN.thigh, LEN.shin, p.kA);
  const [kB, fB] = ik(H, FB, LEN.thigh, LEN.shin, p.kB);
  const L = { H, N, C, sh, eA, hA, eB, hB, kA, fA, kB, fB };
  // knot at the back of the head (headband) and the scarf point at the neck
  L.knot = [C[0] + LEN.head * dir(p.torso + p.head + 150)[0], C[1] + LEN.head * dir(p.torso + p.head + 150)[1]];
  L.brow = [C[0] + LEN.head * dir(p.torso + p.head + 20)[0], C[1] + LEN.head * dir(p.torso + p.head + 20)[1]];
  L.scarf = [N[0] - 3 * dir(p.torso)[0], N[1] - 3 * dir(p.torso)[1]];
  const r = s.rot * D, cr = Math.cos(r), sr = Math.sin(r);
  const W = {};
  for (const [k, v] of Object.entries(L)) {
    const lx = v[0] - H[0], ly = v[1] - H[1];
    const rx = H[0] + lx * cr - ly * sr, ry = H[1] + lx * sr + ly * cr;
    W[k] = [s.x + s.f * rx, s.y + ry];
  }
  W.f = s.f; W.x = s.x; W.y = s.y; W.rot = s.rot; W.headAng = s.f > 0 ? p.torso + p.head + s.rot : 180 - (p.torso + p.head + s.rot);
  return W;
}

// ---------- cloth tails (verlet) ----------
export class Tail {
  constructor(n, seg, anchorKey, color, width, wind = -140) { Object.assign(this, { n, seg, anchorKey, color, width, wind }); this.pts = null; }
  step(J, dt, t) {
    const A = J[this.anchorKey];
    if (!this.pts) { this.pts = Array.from({ length: this.n }, (_, i) => ({ x: A[0] - J.f * i * this.seg * 0.7, y: A[1] - i * this.seg * 0.7, px: 0, py: 0 })); this.pts.forEach((p) => { p.px = p.x; p.py = p.y; }); }
    if (dt <= 0) return;
    const sub = 4, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      this.pts[0].x = A[0]; this.pts[0].y = A[1]; this.pts[0].px = A[0]; this.pts[0].py = A[1];
      for (let i = 1; i < this.n; i++) {
        const p = this.pts[i];
        const gust = this.wind * (0.75 + 0.35 * Math.sin(t * 3.1 + i * 0.7) + 0.2 * Math.sin(t * 7.3 + i));
        const vx = (p.x - p.px) * 0.96, vy = (p.y - p.py) * 0.96;
        p.px = p.x; p.py = p.y;
        p.x += vx + gust * h * h * 60; p.y += vy - 300 * h * h + Math.sin(t * 9 + i * 1.3) * 0.15;
      }
      for (let it = 0; it < 3; it++) for (let i = 1; i < this.n; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-3, k = (d - this.seg) / d;
        if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
      }
    }
  }
  draw(ctx, sc) {
    if (!this.pts) return;
    ctx.fillStyle = this.color;
    const P = this.pts, n = P.length, left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = this.width * (1 - i / n * 0.75) * 0.5;
      left.push([P[i].x + nx * w, P[i].y + ny * w]); right.push([P[i].x - nx * w, P[i].y - ny * w]);
    }
    ctx.beginPath(); ctx.moveTo(...left[0]); for (const p of left) ctx.lineTo(...p); for (const p of right.reverse()) ctx.lineTo(...p); ctx.closePath(); ctx.fill();
  }
}

// ---------- time warp: hit-stop and slow motion ----------
export function buildFrames(end, stops, slows) {
  const rate = (t) => { for (const s of slows) if (t >= s.a && t < s.b) return s.rate; return 1; };
  const S = [...stops].sort((a, b) => a.t - b.t);
  const frames = []; let t = 0, si = 0;
  while (t < end) {
    frames.push({ t, stop: null });
    const nt = t + rate(t) / FPS;
    while (si < S.length && S[si].t <= nt) {
      const s = S[si++];
      if (s.t >= t) { s.frame = frames.length; for (let k = 0; k < s.frames; k++) frames.push({ t: s.t, stop: s, k }); }
    }
    t = nt;
  }
  return frames;
}
export const realTimeOf = (frames, t) => { const i = frames.findIndex((f) => f.t >= t); return (i < 0 ? frames.length : i) / FPS; };
