// Anime-style character: rigid-part skeleton, cel-shaded body with rim light, a painted 2D
// anime face wrapped on the head (AnimeFace), and hair built from individual tapered locks.
//
// Pose parameters (radians) are applied every frame with char.apply(p):
//   pos [x,y,z], yaw, pitch, roll, hipY, hipSway, hipTwist
//   spine {bend, twist, side}, head {nod, turn, tilt}
//   armL / armR {fwd, out, bend, twist, wrist}     legL / legR {fwd, out, bend, toe}
//   expr {brow, browAng, smile, open, lid, wide, eyes:'happy'|'closed', mouthShape, blush}
//   mouth 0..1 (talking envelope)  look [x,y]  blink 0..1  cloak {wind}  hood 0..1  t
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { AnimeFace } from './animeface.js';

// ---------------- expressions ----------------
export const EXPR = {
  neutral:    { brow: 0, browAng: 0, smile: 0.1, open: 0, lid: 0.08, wide: 0 },
  happy:      { brow: 0.3, browAng: 0.15, smile: 0.8, open: 0, lid: 0.05, wide: 0 },
  laugh:      { brow: 0.4, browAng: 0.2, smile: 1, open: 0.5, eyes: 'happy', wide: 0 },
  grin:       { brow: 0.25, browAng: 0, smile: 1, open: 0.45, lid: 0.15, mouthShape: 'grin' },
  smirk:      { brow: -0.1, browAng: -0.3, smile: 0.5, open: 0, lid: 0.35, wide: 0 },
  sad:        { brow: 0.1, browAng: 0.9, smile: -0.6, open: 0, lid: 0.3, wide: 0 },
  hurt:       { brow: 0.3, browAng: 1, smile: -0.8, open: 0.1, lid: 0.25, wide: 0 },
  angry:      { brow: -0.5, browAng: -1, smile: -0.5, open: 0, lid: 0.15, wide: 0 },
  surprised:  { brow: 0.9, browAng: 0.2, smile: 0, open: 0.4, mouthShape: 'o', lid: 0, wide: 1 },
  scared:     { brow: 0.8, browAng: 0.8, smile: -0.5, open: 0.3, lid: 0, wide: 1 },
  worried:    { brow: 0.35, browAng: 0.8, smile: -0.25, open: 0, lid: 0.12, wide: 0.2 },
  determined: { brow: -0.3, browAng: -0.5, smile: 0.1, open: 0, lid: 0.25, wide: 0 },
  sleepy:     { brow: -0.1, browAng: 0.2, smile: 0.1, open: 0, lid: 0.6, wide: 0 },
  stern:      { brow: -0.4, browAng: -0.4, smile: -0.15, open: 0, lid: 0.35, wide: 0 },
  curious:    { brow: 0.5, browAng: 0.35, smile: 0.2, open: 0, lid: 0.0, wide: 0.4 },
  proud:      { brow: 0.1, browAng: -0.15, smile: 0.7, open: 0, lid: 0.35, wide: 0 },
  innocent:   { brow: 0.6, browAng: 0.5, smile: 0.6, open: 0, eyes: 'happy', wide: 0 },
  menace:     { brow: -0.5, browAng: -0.7, smile: 0.35, open: 0, lid: 0.45, wide: 0 },
  embarrassed:{ brow: 0.3, browAng: 0.6, smile: 0.3, open: 0, lid: 0.2, blush: 1 },
};

// ---------------- geometry helpers ----------------
// Anime head: round cranium narrowing to a soft V chin.
function deform(v, R) {
  const ny = v.y / R;
  if (ny < 0.12) {
    const t = Math.min(1, (0.12 - ny) / 1.12);
    v.x *= 1 - 0.42 * Math.pow(t, 1.3);
    v.z = v.z * (1 - 0.12 * t) + R * 0.07 * t;
    v.y *= 1 + 0.2 * t;
  }
  return v;
}
function animeHeadGeometry(R, seg = 40, opts) {
  const g = opts ? new THREE.SphereGeometry(R, seg, seg * 0.75, ...opts) : new THREE.SphereGeometry(R, seg, seg * 0.75);
  const p = g.attributes.position, v = new THREE.Vector3();
  const base = opts ? R / 1.004 : R;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); deform(v, base); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}

// Hair cap trimmed along a hairline (front/side/back heights in units of R).
const capCache = new Map();
function hairCapGeometry(R, front = 0.45, side = 0.05, back = -0.6) {
  const key = [R, front, side, back].join('|');
  if (capCache.has(key)) return capCache.get(key);
  const src = new THREE.SphereGeometry(R, 96, 64).toNonIndexed();
  const p = src.attributes.position, keep = [];
  const line = (x, z) => { const c = Math.cos(Math.atan2(x, z)); return c > 0 ? THREE.MathUtils.lerp(side, front, c * c) : THREE.MathUtils.lerp(side, back, c * c); };
  for (let i = 0; i < p.count; i += 3) {
    let ok = true;
    for (let k = 0; k < 3; k++) if (p.getY(i + k) / R < line(p.getX(i + k) / R, p.getZ(i + k) / R)) { ok = false; break; }
    if (ok) for (let k = 0; k < 3; k++) keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  g.computeVertexNormals();
  capCache.set(key, g);
  return g;
}

// A tapered, curved lock of hair pointing along local -Y. bend curls the tip along +Z.
const lockCache = new Map();
function lockGeometry(len, w, bend) {
  const key = [len, w, bend].map((v) => v.toFixed(4)).join('|');
  if (lockCache.has(key)) return lockCache.get(key);
  const g = new THREE.ConeGeometry(w, len, 7, 6);
  g.rotateX(Math.PI); g.translate(0, -len / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = -p.getY(i) / len;
    p.setZ(i, p.getZ(i) * 0.6 + bend * len * k * k);
  }
  g.computeVertexNormals();
  lockCache.set(key, g);
  return g;
}

// Beard: the lower jaw of the (deformed) head, below a line that rises toward the ears.
const beardCache = new Map();
function beardGeometry(R, front = -0.6, side = 0.0, scale = 1.07) {
  const key = [R, front, side, scale].join('|');
  if (beardCache.has(key)) return beardCache.get(key);
  const src = animeHeadGeometry(R * scale, 64).toNonIndexed();
  const p = src.attributes.position, keep = [];
  const base = R * scale;
  const line = (x, z) => { const c = Math.max(0, Math.cos(Math.atan2(x, z))); return THREE.MathUtils.lerp(side, front, c * c); };
  for (let i = 0; i < p.count; i += 3) {
    let ok = true;
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k) / base, y = p.getY(i + k) / base, z = p.getZ(i + k) / base;
      if (y > line(x, z) || z < -0.35) { ok = false; break; }
    }
    if (ok) for (let k = 0; k < 3; k++) keep.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  g.computeVertexNormals();
  beardCache.set(key, g);
  return g;
}

const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

export class Character {
  constructor(spec) {
    this.spec = spec;
    const H = spec.height, kid = !!spec.kid;
    const d = (this.dim = {
      H,
      headR: H * (kid ? 0.088 : 0.072) * (spec.headScale || 1),
      neck: H * 0.035,
      torso: H * (kid ? 0.26 : 0.28) * (spec.torsoScale || 1),
      shoulderW: H * 0.23 * (spec.shoulders || 1),
      hipW: H * 0.16 * (spec.hips || 1),
      upper: H * 0.17, fore: H * 0.155,
      armR: H * 0.022 * (spec.arms || 1),
      legR: H * 0.03 * (spec.legs || 1),
      handR: H * 0.026 * (spec.hands || 1),
      footH: H * 0.04,
    });
    d.leg = H - d.headR * 2.05 - d.neck - d.torso;
    d.thigh = d.leg * 0.5;
    d.shin = d.leg * 0.5 - d.footH;
    d.rT = d.shoulderW * 0.5 * 0.8;

    const M = (c, o = {}) => toon(c, { rim: true, ...o });
    const skin = M(spec.skin), cloth = M(spec.tunic), sleeve = M(spec.sleeve || spec.tunic);
    const pants = M(spec.pants), boot = M(spec.boots), hairM = M(spec.hair.color);
    const ink = d.H * 0.0032;
    this.ink = ink;
    this.mats = { skin, cloth, hairM };

    const root = (this.root = new THREE.Group());
    root.name = spec.name;
    const hips = (this.hips = new THREE.Group());
    hips.position.y = d.leg;
    root.add(hips);

    // ---- torso: tapered chest-to-waist lathe ----
    const spine = (this.spine = new THREE.Group());
    hips.add(spine);
    const chest = d.rT * (spec.chest || 1) * (1 + (spec.belly || 0) * 0.15), waist = d.rT * (spec.waist || 0.74) * (1 + (spec.belly || 0) * 0.75);
    const bl = spec.belly || 0;
    const prof = [[waist * 0.9, -0.02], [waist * (1 + bl * 0.12), 0.12], [waist * (1.02 + bl * 0.2), 0.3], [Math.max(chest * 0.98, waist * (1 + bl * 0.05)), 0.55], [chest, 0.78], [chest * 0.82, 0.93], [d.headR * 0.33, 1.0], [0.001, 1.0]]
      .map(([r, y]) => new THREE.Vector2(r, y * d.torso));
    const torso = inked(new THREE.LatheGeometry(prof, 20), cloth, ink);
    torso.scale.set(1, 1, 0.68 + (spec.belly || 0) * 0.2);
    spine.add(torso);
    if (spec.collar) {
      const c = inked(new THREE.TorusGeometry(d.headR * 0.62, d.headR * 0.12, 8, 20), M(spec.collar), ink);
      c.rotation.x = Math.PI / 2; c.position.y = d.torso * 0.97; c.scale.set(1.15, 0.85, 1);
      spine.add(c);
    }
    const skirtLen = spec.robe ? d.leg - d.footH * 0.3 : (spec.tunicLen || 0.35) * d.leg;
    if (skirtLen > 0.01) {
      const bottomR = waist * (spec.robe ? 1.75 : 1.3) * (spec.skirtFlare || 1);
      const sk = inked(new THREE.CylinderGeometry(waist * 0.98, bottomR, skirtLen, 22, 1, false), M(spec.robeColor || spec.tunic), ink);
      sk.scale.z = 0.8;
      sk.position.y = d.torso * 0.12 - skirtLen / 2;
      spine.add(sk);
    }
    if (spec.apron) {
      const ap = inked(new THREE.CylinderGeometry(waist * 1.03, waist * 1.35, d.torso * 0.45 + d.leg * 0.5, 16, 1, true, -0.85, 1.7), M(spec.apron, { side: THREE.DoubleSide }), ink * 0.6);
      ap.scale.z = 0.84; ap.position.y = d.torso * 0.25 - d.leg * 0.2;
      spine.add(ap);
    }
    if (spec.belt) {
      const belt = inked(new THREE.TorusGeometry(waist * 1.02, waist * 0.1, 6, 24), M(spec.belt), ink * 0.6);
      belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.72 + (spec.belly || 0) * 0.15, 1); belt.position.y = d.torso * 0.12;
      spine.add(belt);
      const buckle = inked(new THREE.BoxGeometry(waist * 0.3, waist * 0.24, waist * 0.06), M('#d4ad52'), ink * 0.5);
      buckle.position.set(0, d.torso * 0.12, waist * 0.74 * (1 + (spec.belly || 0) * 0.15));
      spine.add(buckle);
    }
    if (spec.mail) {
      const ml = inked(new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x * 1.06, v.y * 0.92)), 20), M('#8f97a2'), ink);
      ml.scale.z = 0.72; spine.add(ml);
    }

    // ---- neck & head ----
    const neck = (this.neck = new THREE.Group());
    neck.position.y = d.torso * 0.97;
    spine.add(neck);
    const neckMesh = inked(new THREE.CylinderGeometry(d.headR * 0.26, d.headR * 0.32, d.neck * 2.2, 10), skin, ink);
    neckMesh.position.y = d.neck * 0.6;
    neck.add(neckMesh);
    const head = (this.head = new THREE.Group());
    head.position.y = d.neck + d.headR * 0.95;
    neck.add(head);
    this.buildHead(head, d, spec, skin, hairM, ink);

    // ---- arms ----
    this.arms = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const sh = new THREE.Group();
      sh.position.set(sx * (chest * 0.98), d.torso * 0.8, 0);
      spine.add(sh);
      sh.add(inked(new THREE.SphereGeometry(d.armR * 1.25, 12, 10), sleeve, ink));
      const up = inked(new THREE.CapsuleGeometry(d.armR * 1.15, d.upper - d.armR, 4, 10), sleeve, ink);
      up.position.y = -d.upper / 2;
      sh.add(up);
      const el = new THREE.Group();
      el.position.y = -d.upper;
      sh.add(el);
      const fo = inked(new THREE.CapsuleGeometry(d.armR, d.fore - d.armR, 4, 10), spec.shortSleeves ? skin : sleeve, ink);
      fo.position.y = -d.fore / 2;
      el.add(fo);
      if (spec.cuffs) {
        const cf = inked(new THREE.CylinderGeometry(d.armR * 1.35, d.armR * 1.45, d.fore * 0.18, 10), M(spec.cuffs), ink * 0.6);
        cf.position.y = -d.fore * 0.84; el.add(cf);
      }
      const hand = new THREE.Group();
      hand.position.y = -d.fore - d.handR * 0.3;
      el.add(hand);
      const handM = spec.gloves ? M(spec.gloves) : skin;
      const palm = inked(new THREE.SphereGeometry(d.handR, 12, 10), handM, ink);
      palm.scale.set(0.85, 1.2, 0.6);
      hand.add(palm);
      const thumb = inked(new THREE.CapsuleGeometry(d.handR * 0.25, d.handR * 0.5, 3, 6), handM, ink * 0.7);
      thumb.position.set(-sx * d.handR * 0.15, 0, d.handR * 0.55); thumb.rotation.x = 0.5;
      hand.add(thumb);
      this.arms[side] = { sh, el, hand };
    }

    // ---- legs ----
    this.legs = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const hp = new THREE.Group();
      hp.position.set(sx * d.hipW * 0.3, 0, 0);
      hips.add(hp);
      const th = inked(new THREE.CapsuleGeometry(d.legR * 1.15, d.thigh - d.legR, 4, 10), pants, ink);
      th.position.y = -d.thigh / 2;
      hp.add(th);
      const kn = new THREE.Group();
      kn.position.y = -d.thigh;
      hp.add(kn);
      const sh = inked(new THREE.CapsuleGeometry(d.legR * 0.95, d.shin - d.legR, 4, 10), spec.tallBoots ? boot : pants, ink);
      sh.position.y = -d.shin / 2;
      kn.add(sh);
      const ft = new THREE.Group();
      ft.position.y = -d.shin;
      kn.add(ft);
      const bootR = d.footH * 0.55;
      const bt = inked(new THREE.CapsuleGeometry(bootR, d.H * 0.06, 4, 10), boot, ink);
      bt.rotation.x = Math.PI / 2;
      bt.scale.set(1.15, 1, 1);
      bt.position.set(0, -d.footH + bootR, d.H * 0.022);
      ft.add(bt);
      this.legs[side] = { hp, kn, ft };
    }

    if (spec.cloak) this.buildCloak(spine, d, spec);
    if (spec.quiver) {
      const q = inked(new THREE.CylinderGeometry(d.rT * 0.2, d.rT * 0.17, d.torso * 0.9, 10), M('#5b3a22'), ink);
      q.position.set(d.rT * 0.35, d.torso * 0.6, -d.rT * 0.95); q.rotation.z = -0.35;
      spine.add(q);
      for (let i = 0; i < 5; i++) {
        const f = inked(new THREE.ConeGeometry(d.rT * 0.06, d.rT * 0.3, 4), M(i % 2 ? '#d8d0c0' : '#7a4a2a'), ink * 0.5);
        f.position.set(d.rT * (0.5 + i * 0.03), d.torso * 1.05 + (i % 3) * 0.01, -d.rT * 0.95 + (i - 2) * 0.012);
        f.rotation.z = -0.35;
        spine.add(f);
      }
    }
    this.props = {};
    this.apply({});
  }

  buildHead(head, d, spec, skin, hairM, ink) {
    const R = d.headR;
    head.add(inked(animeHeadGeometry(R), skin, ink));
    // the painted anime face
    this.face = new AnimeFace(spec);
    this.faceTex = new THREE.CanvasTexture(this.face.canvas);
    this.faceTex.colorSpace = THREE.SRGBColorSpace;
    this.faceTex.anisotropy = 4;
    const faceGeo = animeHeadGeometry(R * 1.004, 48, [Math.PI / 2 - 1.05, 2.1, Math.PI * 0.2, Math.PI * 0.64]);
    const faceMat = toon('#ffffff', { map: this.faceTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, unique: true });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.renderOrder = 2;
    head.add(faceMesh);
    for (const sx of [1, -1]) {
      const e = inked(new THREE.SphereGeometry(R * 0.2, 10, 8), skin, ink * 0.8);
      e.scale.set(0.45, 1, 0.7); e.position.set(sx * R * 0.93, -R * 0.08, -R * 0.02);
      head.add(e);
    }
    if (spec.glasses) {
      const gm = toon('#3a3024');
      for (const sx of [1, -1]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(R * 0.21, R * 0.018, 6, 20), gm);
        r.position.set(sx * R * 0.33, R * 0.0, R * 0.98); head.add(r);
      }
      const br = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.015, R * 0.015, R * 0.26, 6), gm);
      br.rotation.z = Math.PI / 2; br.position.set(0, R * 0.02, R * 1.02); head.add(br);
    }
    this.buildHair(head, R, spec, hairM, ink);
  }

  // Place a lock on the head. phi: around (0 = front, + = character's left), theta: down from the top.
  // n/u: how much it points outward / upward instead of hanging down. bend: tip curl. tw: sideways lean.
  lock(head, R, mat, ink, { phi, theta, len, w, n = 0.25, u = 0, bend = 0.2, tw = 0, r = 1.0 }) {
    const dir = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
    const axis = DOWN.clone().multiplyScalar(Math.max(0, 1 - n - u)).addScaledVector(dir, n).addScaledVector(UP, u);
    axis.x += tw;
    axis.normalize();
    const m = inked(lockGeometry(len * R, w * R * 1.5, bend), mat, ink * 0.8);
    m.position.copy(dir).multiplyScalar(R * r);
    m.quaternion.setFromUnitVectors(DOWN, axis);
    const out = dir.clone().projectOnPlane(axis).normalize();
    const zNow = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
    const ang = Math.atan2(new THREE.Vector3().crossVectors(zNow, out).dot(axis), zNow.dot(out));
    m.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
    head.add(m);
    return m;
  }

  buildHair(head, R, spec, hairM, ink) {
    const style = spec.hair.style;
    const L = (o) => this.lock(head, R, hairM, ink, o);
    const cap = (front = 0.45, side = 0.05, back = -0.55, scale = 1.06) => {
      const m = inked(hairCapGeometry(R * scale, front, side, back), hairM, ink);
      m.scale.set(1, 1.02, 1);
      head.add(m); return m;
    };
    const bangs = (n, spread, len, w, theta = 0.42, bend = 0.25, jitter = 0.15) => {
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0 : i / (n - 1) - 0.5;
        L({ phi: k * spread * 2, theta: theta + Math.abs(k) * 0.15, len: len * (1 - Math.abs(k) * 0.3 + Math.sin(i * 7.1) * jitter), w, n: 0.42, bend: bend + 0.15, tw: k * 0.25, r: 1.04 });
      }
    };
    const ring = (n, theta, len, w, o = {}) => {
      const from = o.from ?? 0.9, to = o.to ?? Math.PI * 2 - 0.9;
      for (let i = 0; i < n; i++) {
        const phi = from + (i / (n - 1)) * (to - from);
        L({ phi, theta, len: len * (1 + Math.sin(i * 3.7) * (o.jitter ?? 0.15)), w, n: o.n ?? 0.3, u: o.u ?? 0, bend: o.bend ?? 0.25, tw: o.tw ?? 0 });
      }
    };
    // anime "angel ring" sheen across the crown
    const sheen = (theta = 0.55, arc = 2.0) => {
      const r = R * 1.08 * Math.sin(theta);
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, R * 0.045, 4, 24, arc), toon(spec.hair.shine || '#ffffff', { transparent: true, opacity: 0.4, depthWrite: false }));
      t.rotation.x = Math.PI / 2; t.rotation.z = -Math.PI / 2 - arc / 2;
      t.position.y = R * 1.08 * Math.cos(theta) + R * 0.03;
      head.add(t);
    };

    switch (style) {
      case 'messy': // Will: spiky and untidy, falling over his forehead
        cap(0.42, -0.08, -0.7, 1.07);
        bangs(7, 0.62, 0.62, 0.17, 0.4, 0.3, 0.2);
        ring(9, 1.0, 0.7, 0.2, { n: 0.45, bend: 0.35, jitter: 0.25 });
        for (let i = 0; i < 6; i++) L({ phi: -1.2 + i * 0.5, theta: 0.32, len: 0.55, w: 0.2, n: 0.5, bend: 0.35 });
        L({ phi: 0.3, theta: 0.05, len: 0.4, w: 0.12, n: 0.2, u: 0.75, bend: 0.4 }); // stray tuft
        sheen(0.5);
        break;
      case 'crew': // Horace: short, upswept spikes
        cap(0.4, 0.1, -0.45, 1.06);
        bangs(6, 0.55, 0.42, 0.16, 0.36, 0.1, 0.2);
        for (let i = 0; i < 7; i++) L({ phi: -1.0 + i * 0.33, theta: 0.18, len: 0.42, w: 0.17, n: 0.55, u: 0.3, bend: -0.25 });
        for (let i = 0; i < 9; i++) L({ phi: 1.3 + i * 0.46, theta: 0.75, len: 0.38, w: 0.18, n: 0.6, bend: 0.15 });
        sheen(0.55, 1.6);
        break;
      case 'long': // Alyss: long straight hair, soft parted bangs
        cap(0.45, -0.25, -0.95, 1.07);
        for (const sgn of [-1, 1]) for (let i = 0; i < 3; i++) L({ phi: sgn * (0.12 + i * 0.22), theta: 0.38, len: 0.6 - i * 0.05, w: 0.18, n: 0.15, bend: 0.2, tw: sgn * 0.18 });
        for (const sgn of [-1, 1]) L({ phi: sgn * 1.15, theta: 0.85, len: 2.2, w: 0.24, n: 0.12, bend: 0.12 });
        ring(11, 1.0, 3.4, 0.3, { from: 1.6, to: Math.PI * 2 - 1.6, n: 0.12, bend: 0.1, jitter: 0.06 });
        sheen(0.55, 2.4);
        break;
      case 'curly_bun': { // Jenny: auburn curls and a bun
        cap(0.42, -0.05, -0.6, 1.08);
        bangs(6, 0.6, 0.45, 0.17, 0.42, 0.55, 0.15);
        ring(10, 1.05, 0.55, 0.22, { n: 0.5, bend: 0.7, from: 1.1, to: Math.PI * 2 - 1.1 });
        const bun = inked(new THREE.SphereGeometry(R * 0.42, 14, 10), hairM, ink); bun.position.set(0, R * 1.05, -R * 0.45); head.add(bun);
        sheen(0.5);
        break;
      }
      case 'neat': // George: tidy, side-swept
        cap(0.5, 0.05, -0.5, 1.06);
        for (let i = 0; i < 6; i++) L({ phi: -0.5 + i * 0.2, theta: 0.32, len: 0.55 - i * 0.04, w: 0.18, n: 0.15, bend: 0.2, tw: 0.45 });
        ring(8, 1.1, 0.5, 0.2, { n: 0.25, bend: 0.15, jitter: 0.08 });
        sheen(0.55);
        break;
      case 'shaggy': // Halt: rough, unkempt grey
        cap(0.42, -0.12, -0.8, 1.08);
        bangs(6, 0.7, 0.55, 0.19, 0.42, 0.25, 0.3);
        ring(12, 0.95, 0.75, 0.24, { n: 0.18, bend: 0.3, jitter: 0.3 });
        for (let i = 0; i < 5; i++) L({ phi: -1.0 + i * 0.5, theta: 0.3, len: 0.45, w: 0.2, n: 0.45, bend: 0.3 });
        sheen(0.5, 1.6);
        break;
      case 'updo': { // Lady Pauline
        cap(0.5, 0.0, -0.5, 1.06);
        const bun = inked(new THREE.SphereGeometry(R * 0.45, 14, 10), hairM, ink); bun.position.set(0, R * 0.55, -R * 1.0); head.add(bun);
        for (const sgn of [-1, 1]) L({ phi: sgn * 1.05, theta: 0.85, len: 1.0, w: 0.1, n: 0.1, bend: 0.3 });
        sheen(0.55);
        break;
      }
      case 'short_dark':
        cap(0.5, 0.08, -0.5, 1.05);
        for (let i = 0; i < 7; i++) L({ phi: -0.75 + i * 0.25, theta: 0.38, len: 0.3, w: 0.16, n: 0.45, bend: 0.2, r: 1.03 });
        sheen(0.55, 1.6);
        break;
      case 'balding': // Master Nigel
        cap(-0.2, -0.1, -0.5, 1.04).scale.set(1, 0.6, 1);
        for (const sgn of [-1, 1]) for (let i = 0; i < 3; i++) L({ phi: sgn * (1.5 + i * 0.35), theta: 1.25, len: 0.35, w: 0.18, n: 0.15, bend: 0.3 });
        break;
      case 'chef': { // Master Chubb
        cap(0.5, 0.15, -0.45, 1.05);
        bangs(5, 0.5, 0.35, 0.15, 0.45, 0.2);
        const band = inked(new THREE.CylinderGeometry(R * 0.98, R * 1.0, R * 0.42, 20), toon('#f4f1ea', { rim: true }), ink);
        band.position.y = R * 0.8; head.add(band);
        const puff = inked(new THREE.SphereGeometry(R * 1.18, 20, 14), toon('#ffffff', { rim: true }), ink);
        puff.position.y = R * 1.42; puff.scale.set(1, 0.8, 1); head.add(puff);
        break;
      }
      case 'long_pale': // Morgarath
        cap(0.5, -0.3, -1.0, 1.07);
        bangs(7, 0.55, 0.55, 0.15, 0.36, 0.05, 0.25);
        for (const sgn of [-1, 1]) L({ phi: sgn * 1.1, theta: 0.85, len: 2.6, w: 0.22, n: 0.1, bend: 0.05 });
        ring(11, 1.0, 4.0, 0.3, { from: 1.5, to: Math.PI * 2 - 1.5, n: 0.1, bend: 0.05, jitter: 0.05 });
        sheen(0.55, 2.2);
        break;
      case 'cap': { // farmers' cloth caps
        const capM = toon(spec.hair.capColor || '#6a5a3a', { rim: true });
        const c = inked(new THREE.SphereGeometry(R * 1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), capM, ink);
        c.rotation.x = -0.2; head.add(c);
        const brim = inked(new THREE.CylinderGeometry(R * 0.6, R * 0.6, R * 0.06, 16, 1, false, -0.8, 1.6), capM, ink * 0.6);
        brim.position.set(0, R * 0.55, R * 0.7); head.add(brim);
        ring(7, 1.15, 0.35, 0.18, { n: 0.4, bend: 0.2 });
        break;
      }
    }
    if (spec.beard) {
      const bm = toon(spec.beard.color || spec.hair.color, { rim: true });
      const st = spec.beard.style;
      head.add(inked(beardGeometry(R, st === 'short' ? -0.7 : -0.62, st === 'short' ? -0.15 : 0.05, st === 'big' ? 1.12 : 1.06), bm, ink));
      const B = (o) => this.lock(head, R, bm, ink, o);
      if (st !== 'short') {   // shaggy beard hanging from the chin
        const n = st === 'big' ? 9 : 6, len = st === 'big' ? 1.0 : 0.5;
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1) - 0.5;
          const m = B({ phi: k * 1.6, theta: 2.3, len: len * (1 - Math.abs(k) * 0.6), w: st === 'big' ? 0.24 : 0.17, n: 0.35, bend: 0.25, r: 0.95 });
          m.position.multiplyScalar(1).setY(m.position.y - R * 0.12); m.position.x *= 0.65;
        }
      }
    }
  }

  buildCloak(spine, d, spec) {
    const len = d.torso * 0.95 + d.leg * 0.78;
    const geo = new THREE.CylinderGeometry(d.rT * 0.75, d.rT * 1.9, len, 28, 10, true, Math.PI * 0.22, Math.PI * 1.56);
    geo.translate(0, -len / 2, 0);
    this.cloakBase = geo.attributes.position.array.slice();
    this.cloakLen = len;
    const mat = toon('#ffffff', { map: spec.cloak.map, side: THREE.DoubleSide, unique: true, rim: true });
    const cloak = inked(geo, mat, d.H * 0.003);
    cloak.position.set(0, d.torso * 0.98, -d.rT * 0.1);
    cloak.scale.z = 0.85;
    spine.add(cloak);
    this.cloak = cloak;
    const hoodUp = inked(new THREE.SphereGeometry(d.headR * 1.38, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), mat, d.H * 0.003);
    hoodUp.rotation.x = -0.6;
    const tip = inked(new THREE.ConeGeometry(d.headR * 0.55, d.headR * 1.2, 12), mat, d.H * 0.003);
    tip.position.set(0, d.headR * 0.5, -d.headR * 1.15); tip.rotation.x = -2.0;
    hoodUp.add(tip);
    hoodUp.position.set(0, d.headR * 0.15, -d.headR * 0.12);
    this.head.add(hoodUp);
    this.hoodUp = hoodUp;
    const hoodDown = inked(new THREE.TorusGeometry(d.headR * 0.8, d.headR * 0.3, 8, 18), mat, d.H * 0.003);
    hoodDown.rotation.x = Math.PI / 2 + 0.4;
    hoodDown.position.set(0, d.torso * 0.98, -d.rT * 0.35);
    spine.add(hoodDown);
    this.hoodDown = hoodDown;
  }

  attach(name, obj, side = 'R') {
    this.arms[side].hand.add(obj);
    this.props[name] = obj;
    return obj;
  }

  apply(p) {
    const r = this.root;
    const pos = p.pos || [0, 0, 0];
    r.position.set(pos[0], pos[1] || 0, pos[2]);
    r.rotation.set(p.pitch || 0, p.yaw || 0, p.roll || 0, 'YXZ');
    this.hips.position.y = this.dim.leg + (p.hipY || 0);
    this.hips.rotation.set(0, p.hipTwist || 0, p.hipSway || 0);
    const sp = p.spine || {};
    this.spine.rotation.set(sp.bend || 0, sp.twist || 0, sp.side || 0);
    const hd = p.head || {};
    this.neck.rotation.set((hd.nod || 0) * 0.35, (hd.turn || 0) * 0.35, (hd.tilt || 0) * 0.3);
    this.head.rotation.set((hd.nod || 0) * 0.65, (hd.turn || 0) * 0.65, (hd.tilt || 0) * 0.7);

    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const a = p['arm' + side] || {};
      const A = this.arms[side];
      A.sh.rotation.set(-(a.fwd || 0), sx * (a.twist || 0), sx * (0.1 + (a.out || 0)));
      A.el.rotation.set(-(a.bend ?? 0.12), 0, 0);
      A.sh.scale.set(1, a.stretch || 1, 1);
      A.hand.rotation.set(-(a.wrist || 0), 0, 0);
      const l = p['leg' + side] || {};
      const L = this.legs[side];
      L.hp.rotation.set(-(l.fwd || 0), 0, sx * (l.out || 0));
      L.kn.rotation.set(l.bend || 0, 0, 0);
      L.ft.rotation.set(-(l.toe || 0) + (l.fwd || 0) - (l.bend || 0), 0, 0);
    }

    // expression → painted anime face (3-frame lip flap, like cel anime)
    const e = { ...EXPR.neutral, ...(p.expr || {}) };
    const blink = p.blink || 0, talk = p.mouth || 0;
    const open = Math.max(e.open || 0, talk);
    let mouth = 'closed';
    if (e.mouthShape === 'grin' && open > 0.2) mouth = 'grin';
    else if (e.mouthShape === 'o' && talk < 0.1) mouth = 'o';
    else if (open > 0.62) mouth = 'open3';
    else if (open > 0.32) mouth = 'open2';
    else if (open > 0.1) mouth = 'open1';
    const look = p.look || [0, 0];
    const st = {
      eye: blink > 0.65 ? 'closed' : e.eyes ? e.eyes : blink > 0.25 ? 'half' : e.wide > 0.5 ? 'wide' : 'open',
      lid: Math.max(0, e.lid || 0) * 0.8, lidAng: e.browAng < 0 ? e.browAng * 0.6 : e.browAng * 0.35,
      lx: -look[0], ly: look[1], brow: e.brow, browAng: e.browAng, mouth, smile: e.smile, blush: e.blush || 0,
    };
    if (this.face.draw(st)) this.faceTex.needsUpdate = true;

    if (this.cloak) {
      const pa = this.cloak.geometry.attributes.position;
      const w = p.cloak?.wind ?? 0.2, t = p.t || 0, Ln = this.cloakLen;
      const sw = -(sp.bend || 0) * 0.9;
      for (let i = 0; i < pa.count; i++) {
        const x = this.cloakBase[i * 3], y = this.cloakBase[i * 3 + 1], z = this.cloakBase[i * 3 + 2];
        const k = -y / Ln;
        const wave = Math.sin(t * 3.1 - k * 4 + x * 6) * 0.04 * w * k + Math.sin(t * 1.7 + x * 3) * 0.02 * w * k;
        pa.setXYZ(i, x * (1 + k * 0.05 * w), y, z - (w * 0.18 + wave) * k * k - sw * y * 0.3);
      }
      pa.needsUpdate = true;
      this.cloak.geometry.computeVertexNormals();
      const hood = p.hood ?? 0;
      this.hoodUp.visible = hood > 0.5;
      this.hoodDown.visible = hood <= 0.5;
    }
  }
}
