// Direction toolkit: poses, motion paths, automatic acting, cameras, and the per-scene context
// that ties choreography to the voice track's timing (timeline.json from the audio build).
import * as THREE from 'three';
import { EXPR } from './character.js';

// ---------------- math ----------------
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);
export const ease = {
  linear: (k) => k, inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3), in: (k) => k * k * k, sine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
};
export const ramp = (t, a, b, e = 'inOut') => ease[e](clamp((t - a) / (b - a)));
// keyframes: key(t, [[0, v0], [2, v1, 'out'], ...]); values may be numbers, arrays or flat objects
export function key(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) return mix(v0, v1, ease[e || 'inOut']((t - t0) / Math.max(1e-6, t1 - t0)));
  }
  return keys[keys.length - 1][1];
}
export function mix(a, b, k) {
  if (typeof a === 'number') return lerp(a, b ?? a, k);
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b?.[i] ?? v, k));
  if (a && typeof a === 'object') {
    const o = {};
    for (const n of new Set([...Object.keys(a), ...Object.keys(b || {})])) o[n] = mix(a[n] ?? zeroLike(b[n]), b?.[n] ?? a[n], k);
    return o;
  }
  return k < 0.5 ? a : b;
}
const zeroLike = (v) => (typeof v === 'number' ? 0 : Array.isArray(v) ? v.map(() => 0) : v && typeof v === 'object' ? {} : v);
// add pose layers: numbers sum, objects merge recursively
export function add(...layers) {
  const out = {};
  for (const L of layers) {
    if (!L) continue;
    for (const [k, v] of Object.entries(L)) {
      if (typeof v === 'number' && typeof out[k] === 'number' && k !== 'blink') out[k] += v;
      else if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') out[k] = add(out[k], v);
      else out[k] = v;
    }
  }
  return out;
}
const h1 = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
export const noise = (t, seed = 0) => { const i = Math.floor(t), f = t - i; return lerp(h1(i + seed * 17.3), h1(i + 1 + seed * 17.3), smooth(f)) * 2 - 1; };

// ---------------- pose library ----------------
export const P = {
  stand: () => ({ armL: { out: 0.06, bend: 0.15 }, armR: { out: 0.06, bend: 0.15 } }),
  idle: (t, seed = 0, amt = 1) => ({
    spine: { bend: Math.sin(t * 1.5 + seed) * 0.012 * amt, side: noise(t * 0.25, seed) * 0.02 * amt },
    head: { nod: noise(t * 0.4, seed + 1) * 0.06 * amt, turn: noise(t * 0.3, seed + 2) * 0.1 * amt, tilt: noise(t * 0.35, seed + 3) * 0.06 * amt },
    hipSway: noise(t * 0.2, seed + 4) * 0.02 * amt,
    armL: { fwd: Math.sin(t * 1.5 + seed) * 0.02 * amt }, armR: { fwd: Math.sin(t * 1.5 + seed + 1) * 0.02 * amt },
  }),
  walk: (phase, amt = 1, stride = 0.5) => {
    const a = phase * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    return {
      legL: { fwd: s * stride * amt, bend: Math.max(0, -c) * 0.9 * amt + 0.05 }, legR: { fwd: -s * stride * amt, bend: Math.max(0, c) * 0.9 * amt + 0.05 },
      armL: { fwd: -s * 0.45 * amt, bend: 0.25 + 0.2 * amt }, armR: { fwd: s * 0.45 * amt, bend: 0.25 + 0.2 * amt },
      hipY: -Math.abs(Math.cos(a)) * 0.025 * amt, spine: { twist: -s * 0.08 * amt, bend: 0.04 * amt }, hipTwist: s * 0.08 * amt,
    };
  },
  run: (phase, amt = 1) => {
    const a = phase * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    return {
      legL: { fwd: s * 0.85 * amt, bend: Math.max(0, -c) * 1.7 * amt + 0.2 }, legR: { fwd: -s * 0.85 * amt, bend: Math.max(0, c) * 1.7 * amt + 0.2 },
      armL: { fwd: -s * 0.9 * amt, bend: 1.3 * amt }, armR: { fwd: s * 0.9 * amt, bend: 1.3 * amt },
      hipY: Math.abs(Math.sin(a)) * 0.06 * amt - 0.05, spine: { bend: 0.22 * amt, twist: -s * 0.12 * amt },
    };
  },
  // sitting on something whose top is `seatDrop` metres below the hips' standing height
  sit: (legs = 'down') => ({
    legL: { fwd: 1.5, bend: legs === 'dangle' ? 1.2 : 1.55, out: 0.08 }, legR: { fwd: 1.45, bend: legs === 'dangle' ? 1.35 : 1.5, out: -0.02 },
    spine: { bend: 0.08 }, armL: { fwd: 0.35, bend: 0.6, out: 0.05 }, armR: { fwd: 0.35, bend: 0.6, out: 0.05 },
  }),
  sitHug: () => ({ legL: { fwd: 2.2, bend: 2.3 }, legR: { fwd: 2.1, bend: 2.3 }, spine: { bend: 0.35 }, armL: { fwd: 1.0, bend: 1.0, out: -0.25 }, armR: { fwd: 1.0, bend: 1.0, out: -0.25 }, head: { nod: 0.05 } }),
  climb: (phase) => {
    const a = phase * Math.PI * 2, s = Math.sin(a);
    return {
      armL: { fwd: 2.7 + s * 0.35, bend: 0.5 - s * 0.45, out: 0.15 }, armR: { fwd: 2.7 - s * 0.35, bend: 0.5 + s * 0.45, out: 0.15 },
      legL: { fwd: 0.6 - s * 0.5, bend: 1.0 - s * 0.6, out: 0.15 }, legR: { fwd: 0.6 + s * 0.5, bend: 1.0 + s * 0.6, out: 0.15 },
      spine: { bend: -0.05 }, head: { nod: -0.35 },
    };
  },
  hang: (t) => ({ armL: { fwd: 2.9, bend: 0.15, out: 0.1 }, armR: { fwd: 0.4 + Math.sin(t * 8) * 0.5, bend: 0.4, out: 0.6 }, legL: { fwd: 0.3 + Math.sin(t * 9) * 0.4, bend: 0.6 }, legR: { fwd: -0.2 + Math.sin(t * 7) * 0.5, bend: 0.4 }, head: { nod: 0.5 } }),
  crouch: () => ({ legL: { fwd: 1.1, bend: 1.9 }, legR: { fwd: 1.0, bend: 1.8 }, hipY: -0.42, spine: { bend: 0.5 }, armL: { fwd: 0.6, bend: 0.8 }, armR: { fwd: 0.6, bend: 0.8 }, head: { nod: -0.4 } }),
  armsCrossed: () => ({ armL: { fwd: 0.55, bend: 1.9, out: -0.35, twist: 0.4 }, armR: { fwd: 0.6, bend: 1.9, out: -0.35, twist: 0.4 } }),
  handsOnHips: () => ({ armL: { out: 0.55, bend: 1.9, fwd: -0.2, twist: -0.6 }, armR: { out: 0.55, bend: 1.9, fwd: -0.2, twist: -0.6 } }),
  handsBehind: () => ({ armL: { fwd: -0.35, bend: 0.9, out: -0.1 }, armR: { fwd: -0.35, bend: 0.9, out: -0.1 }, spine: { bend: -0.04 } }),
  point: (side = 'R', up = 0) => ({ ['arm' + side]: { fwd: 1.45 + up, bend: 0.05, out: 0.15 } }),
  reach: (side = 'R', k = 1) => ({ ['arm' + side]: { fwd: 1.3 * k, bend: 0.2, out: 0.1 }, spine: { bend: 0.15 * k } }),
  wave: (t, side = 'R') => ({ ['arm' + side]: { fwd: 0.3, out: 1.9, bend: 1.0 + Math.sin(t * 9) * 0.35 } }),
  shrug: (k = 1) => ({ armL: { out: 0.45 * k, bend: 1.5 * k, fwd: 0.3 * k, twist: -0.8 * k }, armR: { out: 0.45 * k, bend: 1.5 * k, fwd: 0.3 * k, twist: -0.8 * k }, head: { tilt: 0.15 * k } }),
  chin: (side = 'R') => ({ ['arm' + side]: { fwd: 1.0, bend: 2.3, out: -0.3 }, head: { tilt: 0.1, nod: 0.05 } }),
  eat: (t, side = 'R') => ({ ['arm' + side]: { fwd: 0.85, bend: 2.0 + Math.sin(t * 6) * 0.08, out: -0.25 }, head: { nod: 0.08 + Math.sin(t * 12) * 0.02 } }),
  knead: (t) => ({ armL: { fwd: 0.95 + Math.sin(t * 5) * 0.2, bend: 0.7, out: -0.15 }, armR: { fwd: 0.95 + Math.sin(t * 5 + 3) * 0.2, bend: 0.7, out: -0.15 }, spine: { bend: 0.25 + Math.sin(t * 5) * 0.03 }, head: { nod: 0.35 } }),
  fist: (side = 'R') => ({ ['arm' + side]: { fwd: 0.9, bend: 1.6, out: 0.1 } }),
  shove: (k) => ({ armL: { fwd: 1.4 * k, bend: 0.2 + (1 - k) * 0.8 }, armR: { fwd: 1.4 * k, bend: 0.2 + (1 - k) * 0.8 }, spine: { bend: 0.2 * k } }),
  guard: (t, k = 1) => ({ armR: { fwd: 1.0 * k, bend: 1.2 * k, out: 0.2 }, armL: { fwd: 0.6 * k, bend: 1.4 * k, out: -0.1 }, legL: { fwd: 0.3 * k, bend: 0.3 * k }, legR: { fwd: -0.3 * k, bend: 0.4 * k }, hipY: -0.05 * k }),
  swing: (k) => ({ armR: { fwd: lerp(2.6, 0.4, k), bend: lerp(1.2, 0.1, k), out: lerp(0.4, -0.2, k) }, spine: { twist: lerp(0.4, -0.5, k), bend: 0.1 }, armL: { fwd: 0.4, bend: 1.0 } }),
  bow: (k = 1) => ({ spine: { bend: 0.45 * k }, head: { nod: 0.3 * k }, armL: { fwd: 0.2 * k }, armR: { fwd: 0.2 * k } }),
  curtsy: (k = 1) => ({ legL: { fwd: -0.3 * k, bend: 0.6 * k }, legR: { fwd: 0.2 * k, bend: 0.5 * k }, hipY: -0.12 * k, spine: { bend: 0.15 * k }, head: { nod: 0.25 * k }, armL: { out: 0.4 * k, bend: 0.5 }, armR: { out: 0.4 * k, bend: 0.5 } }),
  lieBack: () => ({ legL: { fwd: 0.05 }, legR: { fwd: 0.05 }, armL: { fwd: 0.2, out: 0.2 }, armR: { fwd: 2.6, bend: 2.0, out: 0.2 } }),
  fall: (k) => ({ armL: { fwd: 2.2 * k, out: 0.8 * k, bend: 0.4 }, armR: { fwd: 2.2 * k, out: 0.8 * k, bend: 0.4 }, legL: { fwd: 1.2 * k, bend: 0.4 }, legR: { fwd: 0.9 * k, bend: 0.8 }, spine: { bend: -0.4 * k } }),
};

// talk: small head bobs, eyebrow lifts and the occasional hand gesture while speaking
export function talking(env, t, seed = 0, gesture = 1) {
  const g = Math.max(0, noise(t * 0.7, seed + 9)) * gesture;
  return {
    head: { nod: env * 0.06 * Math.sin(t * 7 + seed), tilt: env * 0.05 * noise(t * 1.3, seed) },
    expr: { brow: env * 0.25 * Math.max(0, noise(t * 2, seed + 5)) },
    armR: { fwd: g * 0.55, bend: g * 0.9, out: g * 0.15, twist: -g * 0.4 },
  };
}

export function blinkAt(T, seed = 0) {
  const period = 3.2 + h1(seed) * 2.5;
  const ph = ((T + h1(seed + 1) * 10) % period);
  return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
}

// Walk along a path of [x,z] points between times t0..t1. Returns pos, yaw, phase, moving amount.
export function walkPath(t, pts, t0, t1, { y = 0, stride = 0.75, e = 'linear' } = {}) {
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  const k = ease[e](clamp((t - t0) / (t1 - t0)));
  let d = k * L, i = 0;
  while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
  const a = pts[i], b = pts[i + 1] || a, f = seg[i] ? d / seg[i] : 0;
  const x = lerp(a[0], b[0], f), z = lerp(a[1], b[1], f);
  const moving = t > t0 && t < t1 ? 1 : 0;
  return { pos: [x, typeof y === 'function' ? y(x, z) : y, z], yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), phase: (k * L) / (stride * 2), moving };
}

// Yaw so that a character at `from` faces `to` (both [x,y,z]).
export const faceTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// Head turn + eye look to aim a character at a world point (approximate, from root & yaw).
export function lookAt(char, yaw, from, target) {
  const dx = target[0] - from[0], dz = target[2] - from[2], dy = target[1] - (from[1] + char.dim.H * 0.9);
  let a = Math.atan2(dx, dz) - yaw;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
  const turn = clamp(a, -1.3, 1.3), nod = clamp(pitch, -0.6, 0.6);
  return { head: { turn: turn * 0.85, nod: nod * 0.7 }, look: [clamp((a - turn * 0.85) * 2, -1, 1) * -1 + clamp(turn * 0.3, -0.5, 0.5), clamp(-nod * 0.5, -1, 1)] };
}

// ---------------- camera ----------------
export function headPos(char) {
  const v = new THREE.Vector3();
  char.head.getWorldPosition(v);
  return [v.x, v.y, v.z];
}

// A shot framing a character: angle is relative to their facing (0 = straight on), dist in metres.
export function shotOn(char, { angle = 0.35, dist = 1.6, height = 0.05, fov = 32, offset = [0, 0, 0], lookOffset = [0, -0.05, 0] } = {}) {
  const hp = headPos(char);
  const yaw = char.root.rotation.y + angle;
  return {
    pos: [hp[0] + Math.sin(yaw) * dist + offset[0], hp[1] + height + offset[1], hp[2] + Math.cos(yaw) * dist + offset[2]],
    target: [hp[0] + lookOffset[0], hp[1] + lookOffset[1], hp[2] + lookOffset[2]], fov,
  };
}

// Over-the-shoulder: camera behind `back` looking at `front`.
export function overShoulder(front, back, { side = 1, dist = 1.1, height = 0.12, fov = 30 } = {}) {
  const a = headPos(front), b = headPos(back);
  const dir = new THREE.Vector3(a[0] - b[0], 0, a[2] - b[2]).normalize();
  const right = new THREE.Vector3(dir.z, 0, -dir.x);
  return {
    pos: [b[0] - dir.x * dist + right.x * 0.45 * side, b[1] + height, b[2] - dir.z * dist + right.z * 0.45 * side],
    target: [a[0], a[1] - 0.05, a[2]], fov,
  };
}

export function twoShot(a, b, { dist = 3.2, height = 0.1, fov = 35, side = 1, toward = null } = {}) {
  const A = headPos(a), B = headPos(b);
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
  const dir = new THREE.Vector3(B[0] - A[0], 0, B[2] - A[2]).normalize();
  const n = new THREE.Vector3(-dir.z, 0, dir.x);
  // put the camera on the side the pair is facing (side = -1 flips to the other side)
  const fx = Math.sin(a.root.rotation.y) + Math.sin(b.root.rotation.y), fz = Math.cos(a.root.rotation.y) + Math.cos(b.root.rotation.y);
  if (toward) { if (n.x * (toward[0] - (A[0] + B[0]) / 2) + n.z * (toward[1] - (A[2] + B[2]) / 2) < 0) n.multiplyScalar(-1); }
  else if (n.x * fx + n.z * fz < 0) n.multiplyScalar(-1);
  n.multiplyScalar(side);
  const sep = Math.hypot(B[0] - A[0], B[2] - A[2]);
  const d = Math.max(dist, sep * 1.25);
  return { pos: [mid[0] + n.x * d, mid[1] + height, mid[2] + n.z * d], target: [mid[0], mid[1] - 0.15, mid[2]], fov };
}

export const blendShot = (a, b, k) => ({ pos: mix(a.pos, b.pos, k), target: mix(a.target, b.target, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll || 0, b.roll || 0, k) });
// gentle drift so held shots never feel frozen
export function drift(s, t, amt = 0.04) {
  return { ...s, pos: [s.pos[0] + noise(t * 0.15, 1) * amt, s.pos[1] + noise(t * 0.12, 2) * amt * 0.5, s.pos[2] + noise(t * 0.13, 3) * amt] };
}

// ---------------- scene context ----------------
export const CHAR_IDS = {
  'WILL': 'will', 'HORACE': 'horace', 'ALYSS': 'alyss', 'JENNY': 'jenny', 'GEORGE': 'george', 'HALT': 'halt',
  'BARON ARALD': 'baron', 'SIR RODNEY': 'rodney', 'LADY PAULINE': 'pauline', 'MASTER CHUBB': 'chubb', 'MASTER NIGEL': 'nigel',
  'MORGARATH': 'morgarath', 'CLERK': 'clerk', 'FARMER 1': 'farmer1', 'FARMER 2': 'farmer2', 'NARRATOR': null,
};

export class SceneCtx {
  constructor(timeline, sceneInfo) {
    this.TL = timeline; this.S = sceneInfo;
    this.lines = timeline.lines.filter((l) => l.scene === sceneInfo.n).map((l) => ({ ...l, id: CHAR_IDS[l.char], s: l.start - sceneInfo.start, e: l.end - sceneInfo.start }));
    this.actions = timeline.actions.filter((a) => a.scene === sceneInfo.n).map((a) => ({ ...a, s: a.start - sceneInfo.start, e: a.end - sceneInfo.start }));
    this.sfxs = timeline.sfx.filter((x) => x.start >= sceneInfo.start - 0.01 && x.start <= sceneInfo.end).map((x) => ({ ...x, s: x.start - sceneInfo.start }));
    this.dur = sceneInfo.end - sceneInfo.start;
  }
  // find a line by text (k-th match) → {s, e, ...}
  line(match, k = 0) {
    const m = this.lines.filter((l) => l.text.includes(match));
    if (!m[k]) { console.warn('no line', match); return { s: 0, e: 0 }; }
    return m[k];
  }
  act(match, k = 0) {
    const m = this.actions.filter((a) => a.text.includes(match));
    if (!m[k]) { console.warn('no action', match); return { s: 0, e: 0 }; }
    return m[k];
  }
  sfx(name, k = 0) { const m = this.sfxs.filter((x) => x.name === name); return m[k] ? m[k].s : 0; }
  // current mouth openness for a character
  mouth(id, t) {
    for (const l of this.lines) {
      if (l.id !== id || t < l.s - 0.05 || t > l.e + 0.05) continue;
      for (const m of l.mouth) {
        const i = Math.floor((t + this.S.start - m.start) * 30);
        if (i >= 0 && i < m.env.length) {
          const a = m.env[i], b = m.env[Math.min(i + 1, m.env.length - 1)];
          const f = (t + this.S.start - m.start) * 30 - i;
          return Math.min(1, lerp(a, b, f) * 1.3);
        }
      }
    }
    return 0;
  }
  speaking(id, t) { return this.lines.some((l) => l.id === id && t >= l.s && t <= l.e); }
  // the line being spoken (or most recently spoken) at t
  current(t) {
    let c = null;
    for (const l of this.lines) if (l.s <= t + 0.2) c = l;
    return c;
  }
  lineIndex(t) { const c = this.current(t); return c ? this.lines.indexOf(c) : -1; }
}

// Dialogue coverage: cuts on each new line between a two-shot, an over-the-shoulder and a
// close-up of the speaker, like a storyboarded anime conversation. `pairs` maps a speaker
// id to who they are talking to. Returns null when nobody (on screen) is speaking.
export function coverage(ctx, t, cast, pairs, { closeDist = 0.95, fov = 30, startWide = true, side = 1, sideBySide = false, noOTS = [], toward = null } = {}) {
  const cur = ctx.current(t);
  if (!cur || !cur.id || !cast[cur.id]) return null;
  const idx = ctx.lines.indexOf(cur);
  const sp = cast[cur.id], ls = cast[pairs[cur.id]] || null;
  const pattern = idx === 0 && startWide ? 0 : (idx % 3) + 0;
  let s;
  if (!ls) s = shotOn(sp, { angle: 0.35 * side, dist: closeDist, fov });
  else if (pattern === 0) {
    const A = headPos(sp), B = headPos(ls);
    s = Math.hypot(A[0] - B[0], A[2] - B[2]) > 3.2 ? shotOn(sp, { angle: (idx % 2 ? 0.35 : -0.35), dist: 1.25, fov }) : twoShot(sp, ls, { side, fov: 34, toward });
  }
  else if (pattern === 1 && noOTS.includes(pairs[cur.id])) s = shotOn(sp, { angle: (idx % 2 ? 0.55 : -0.55), dist: 1.3, fov });
  else if (pattern === 1) s = sideBySide ? shotOn(sp, { angle: Math.sign(headPos(ls)[0] - headPos(sp)[0] || 1) * 0.75, dist: 1.5, fov }) : overShoulder(sp, ls, { side: (idx % 2 ? 1 : -1) * side, fov });
  else s = shotOn(sp, { angle: (idx % 2 ? 0.4 : -0.4), dist: closeDist, fov });
  return drift(s, t, 0.025);
}

// ---------------- anime overlay effects (drawn on the 2D overlay canvas) ----------------
// Radial speed lines converging on (cx, cy), the classic shock/impact effect.
export function speedLines(g, W, H, t, k = 1, cx = 0.5, cy = 0.5, color = 'rgba(255,255,255,') {
  if (k <= 0) return;
  const n = 90, R = Math.hypot(W, H);
  for (let i = 0; i < n; i++) {
    const h = Math.sin(i * 91.7 + Math.floor(t * 24) * 13.1) * 0.5 + 0.5;
    const a = (i / n) * Math.PI * 2 + h * 0.05;
    const r0 = R * (0.22 + h * 0.18), w = 2 + h * 6;
    g.strokeStyle = color + (0.25 + h * 0.5) * k + ')'; g.lineWidth = w;
    g.beginPath(); g.moveTo(W * cx + Math.cos(a) * r0, H * cy + Math.sin(a) * r0); g.lineTo(W * cx + Math.cos(a) * R, H * cy + Math.sin(a) * R); g.stroke();
  }
}
// A one- or two-frame white impact flash.
export function flash(g, W, H, k) { if (k > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(1, k)})`; g.fillRect(0, 0, W, H); } }
