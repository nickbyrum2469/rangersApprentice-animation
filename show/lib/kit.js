// Building kit for sets: sky, terrain, castle architecture, interiors, props, effects.
// Everything is deterministic: animated pieces take the time t in their update().
import * as THREE from 'three';
import { toon, inked, tex } from './toon.js';

export const rand = (seed) => {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};
const INK = 0.02;

// A set is a Group plus a list of per-frame updaters.
export class SetBuilder {
  constructor() { this.group = new THREE.Group(); this.updaters = []; this.lights = []; this.anchors = {}; }
  add(o) { this.group.add(o); return o; }
  onUpdate(fn) { this.updaters.push(fn); }
  update(t) { for (const f of this.updaters) f(t); }
}

// ---------------- sky ----------------
export function sky(S, o = {}) {
  const u = {
    top: { value: new THREE.Color(o.top || '#5a8ad0') }, mid: { value: new THREE.Color(o.mid || '#a8c8e8') },
    bottom: { value: new THREE.Color(o.bottom || '#f0d8b0') }, sunDir: { value: new THREE.Vector3(...(o.sunDir || [0.3, 0.2, -1])).normalize() },
    sunCol: { value: new THREE.Color(o.sunCol || '#fff2c0') }, sunSize: { value: o.sunSize ?? 0.04 }, glow: { value: o.glow ?? 0.5 },
    stars: { value: o.stars ?? 0 }, time: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: u,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, bottom, sunDir, sunCol; uniform float sunSize, glow, stars, time; varying vec3 vDir;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float y = vDir.y;
        vec3 c = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, y)) : mix(mid, bottom, smoothstep(0.0, -0.25, y));
        c = mix(c, bottom, smoothstep(0.12, -0.02, y) * 0.7);
        float d = dot(normalize(vDir), sunDir);
        c += sunCol * pow(max(d, 0.0), 12.0) * glow * 0.6 + sunCol * pow(max(d, 0.0), 120.0) * glow;
        c = mix(c, sunCol * 1.15, smoothstep(1.0 - sunSize * 0.02, 1.0 - sunSize * 0.015, d));
        if (stars > 0.0) {
          vec3 q = floor(vDir * 380.0);
          float s = step(0.9975, h(q)) * smoothstep(0.0, 0.3, y);
          s *= 0.6 + 0.4 * sin(time * (2.0 + h(q + 1.0) * 4.0) + h(q) * 30.0);
          c += vec3(s) * stars;
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), m);
  dome.renderOrder = -10;
  S.add(dome);
  S.onUpdate((t) => (u.time.value = t));
  return u;
}

// Moon disc (billboard) for night sets.
export function moon(S, pos, r = 8, color = '#f4f0e0') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,250,235,0.5)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = color; g.beginPath(); g.arc(128, 128, 46, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,165,185,0.35)';
  [[115, 115, 12], [140, 135, 9], [125, 145, 7], [145, 112, 6]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, fog: false }));
  sp.position.set(...pos); sp.scale.set(r * 5.5, r * 5.5, 1);
  S.add(sp);
  return sp;
}

// Soft cloud billboards drifting slowly.
export function clouds(S, n, area, y, color = '#ffffff', opacity = 0.85, seed = 3) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); const r = rand(seed);
  for (let i = 0; i < 14; i++) {
    const x = 40 + r() * 176, yy = 50 + r() * 40, rr = 20 + r() * 30;
    const gr = g.createRadialGradient(x, yy, 0, x, yy, rr);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  }
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, depthWrite: false, fog: false });
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mat);
    const w = 40 + r() * 60;
    s.scale.set(w, w * 0.4, 1);
    s.userData = { x: (r() - 0.5) * area, z: -area * 0.3 - r() * area * 0.5, y: y + r() * 25, v: 0.3 + r() * 0.6 };
    S.add(s); list.push(s);
  }
  S.onUpdate((t) => list.forEach((s) => s.position.set(((s.userData.x + t * s.userData.v + area) % (area * 2)) - area, s.userData.y, s.userData.z)));
}

// ---------------- terrain & nature ----------------
export function ground(S, size, color, map, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), toon(color, map ? { map } : {}));
  if (map) map.repeat.set(size / 6, size / 6);
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return S.add(m);
}

// Rolling hills: displaced plane.
export function hills(S, { size = 600, seg = 80, amp = 25, color = '#7aa050', y = -2, seed = 1, flat = 0, flatR = 60, fn = null, vcolor = null } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; const r = rand(seed);
  const waves = Array.from({ length: 6 }, () => [r() * 0.03 + 0.005, r() * 0.03 + 0.005, r() * 6, r() * 0.6 + 0.2]);
  const H = fn || ((x, z) => {
    let h = 0; waves.forEach(([fx, fz, ph, a]) => (h += Math.sin(x * fx + ph) * Math.cos(z * fz + ph * 0.7) * a));
    const k = flat ? THREE.MathUtils.smoothstep(Math.hypot(x, z), flatR * 0.7, flatR * 1.6) : 1;
    return h * amp * k;
  });
  const cols = vcolor ? new Float32Array(p.count * 3) : null;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), yy = H(x, z);
    p.setY(i, yy);
    if (cols) { const c = new THREE.Color(vcolor(x, z, yy)); cols.set([c.r, c.g, c.b], i * 3); }
  }
  if (cols) geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, toon(cols ? '#ffffff' : color, { map: tex.grass(cols ? '#d8d8d8' : color), vertexColors: !!cols, unique: true }));
  m.material.map.repeat.set(size / 8, size / 8);
  m.position.y = y; m.receiveShadow = true;
  S.add(m);
  return { mesh: m, heightAt: (x, z) => y + H(x, z) };
}

// Stylized pine & round trees, instanced so forests are cheap.
export function forest(S, positions, { scale = 1, pineRatio = 0.65, seed = 5, colors = ['#2f5a34', '#3d6b3a', '#4a7a40'] } = {}) {
  const r = rand(seed);
  const pine = new THREE.ConeGeometry(1, 2.4, 7); pine.translate(0, 1.2, 0);
  const pine2 = new THREE.ConeGeometry(0.75, 1.8, 7); pine2.translate(0, 2.2, 0);
  const round = new THREE.IcosahedronGeometry(1.2, 1); round.translate(0, 2.4, 0);
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6); trunk.translate(0, 0.7, 0);
  const mats = colors.map((c) => toon(c));
  const n = positions.length;
  const groups = { pine: [], pine2: [], round: [], trunk: [] };
  positions.forEach(([x, y, z], i) => {
    const s = scale * (0.7 + r() * 0.7);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6), new THREE.Vector3(s, s * (0.9 + r() * 0.4), s));
    groups.trunk.push(m);
    if (r() < pineRatio) { groups.pine.push(m); groups.pine2.push(m); } else groups.round.push(m);
  });
  const make = (geo, list, mat) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true; im.receiveShadow = true;
    S.add(im);
  };
  make(trunk, groups.trunk, toon('#5a3d26'));
  make(pine, groups.pine, mats[0]); make(pine2, groups.pine2, mats[1]); make(round, groups.round, mats[2]);
  return n;
}

export function scatterOnHills(h, n, { minR = 40, maxR = 250, seed = 9, avoid = () => false } = {}) {
  const r = rand(seed); const out = [];
  while (out.length < n) {
    const a = r() * Math.PI * 2, d = minR + Math.sqrt(r()) * (maxR - minR);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (avoid(x, z)) continue;
    out.push([x, h.heightAt(x, z), z]);
  }
  return out;
}

// ---------------- castle architecture ----------------
const stoneMats = new Map();
export function stoneMat(base = '#a39886', repeat = [1, 1], seed = 1) {
  const key = base + repeat + seed;
  if (!stoneMats.has(key)) { const t = tex.stone(base, seed); t.repeat.set(...repeat); stoneMats.set(key, toon('#ffffff', { map: t })); }
  return stoneMats.get(key);
}

export function box(w, h, d, mat, ink = INK) {
  const g = new THREE.BoxGeometry(w, h, d);
  return inked(g, mat, ink);
}

// Wall segment with crenellations on top. Origin at bottom-centre.
export function wall(len, height, thick, { base = '#a39886', crenel = true } = {}) {
  const g = new THREE.Group();
  const m = stoneMat(base, [len / 4, height / 4]);
  const body = box(len, height, thick, m); body.position.y = height / 2; g.add(body);
  if (crenel) {
    const cm = stoneMat(base, [0.3, 0.3], 2);
    for (let x = -len / 2 + 0.4; x < len / 2 - 0.3; x += 1.2) {
      const c = box(0.6, 0.7, thick * 1.05, cm); c.position.set(x + 0.3, height + 0.35, 0); g.add(c);
    }
  }
  return g;
}

// Round tower with a conical slate roof (or flat crenellated top).
export function tower(radius, height, { base = '#a39886', roof = '#4a5068', roofH = null, flat = false, windows = [], seg = 18 } = {}) {
  const g = new THREE.Group();
  const m = stoneMat(base, [radius * 1.6, height / 4]);
  const body = inked(new THREE.CylinderGeometry(radius, radius * 1.05, height, seg), m, INK);
  body.position.y = height / 2; g.add(body);
  if (flat) {
    const cm = stoneMat(base, [0.3, 0.3], 2);
    const n = Math.round(radius * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = box(0.55, 0.7, 0.5, cm); c.position.set(Math.cos(a) * radius, height + 0.35, Math.sin(a) * radius); c.rotation.y = -a; g.add(c);
    }
  } else {
    const rm = toon(roof);
    const rf = inked(new THREE.ConeGeometry(radius * 1.25, roofH ?? radius * 2.4, seg), rm, INK);
    rf.position.y = height + (roofH ?? radius * 2.4) / 2; g.add(rf);
    const rim = inked(new THREE.CylinderGeometry(radius * 1.27, radius * 1.27, 0.25, seg), toon('#3a3f52'), INK);
    rim.position.y = height + 0.05; g.add(rim);
  }
  windows.forEach(([y, a, lit]) => {
    const w = windowMesh(0.5, 0.9, lit);
    w.position.set(Math.sin(a) * radius * 1.0, y, Math.cos(a) * radius * 1.0); w.rotation.y = a;
    g.add(w);
  });
  return g;
}

// Arched window: dark (or warmly lit) glass in a stone frame.
export function windowMesh(w, h, lit = false, glow = '#ffcf7a') {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h - w / 2);
  shape.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); shape.lineTo(-w / 2, 0);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), lit ? new THREE.MeshBasicMaterial({ color: glow }) : toon('#1c2030'));
  glass.position.z = 0.03;
  g.add(glass);
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), toon('#5a5248'));
  frame.scale.set(1.25, 1.12, 1); frame.position.set(0, -0.06, 0.02);
  g.add(frame);
  const sill = box(w * 1.5, 0.1, 0.2, toon('#7a7060'), 0.008); sill.position.set(0, -0.05, 0.08);
  g.add(sill);
  g.userData.glass = glass;
  return g;
}

export function door(w = 1.4, h = 2.4, color = '#6a4428') {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h - w / 2); shape.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); shape.lineTo(-w / 2, 0);
  const t = tex.planks(color, 3, 5, true);
  t.repeat.set(1 / w, 1 / h);
  const d = inked(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), toon('#ffffff', { map: t }), 0.01);
  g.add(d);
  for (const y of [h * 0.25, h * 0.65]) { const b = box(w * 0.95, 0.08, 0.04, toon('#2a2622'), 0.004); b.position.set(0, y, 0.12); g.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), toon('#3a3430')); ring.position.set(w * 0.3, h * 0.45, 0.14); g.add(ring);
  return g;
}

// Pitched roof with slate or thatch.
export function roof(w, d, h, color = '#4a5068', map = null) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return inked(geo, toon(map ? '#ffffff' : color, map ? { map } : {}), INK);
}

// A simple house (village): plaster walls, timber, thatch.
export function house(w = 4, d = 3.5, h = 2.6, seed = 1) {
  const g = new THREE.Group(); const r = rand(seed);
  const walls = box(w, h, d, toon('#ffffff', { map: tex.plaster(['#ead9b8', '#e2cfa8', '#f0e2c6'][Math.floor(r() * 3)], seed) }));
  walls.position.y = h / 2; g.add(walls);
  const th = tex.thatch(); th.repeat.set(2, 2);
  const rf = roof(w + 0.6, d + 0.6, h * 0.75, '#c8a35a', th); rf.position.y = h; rf.rotation.y = Math.PI / 2 * (r() > 0.5 ? 1 : 0);
  if (rf.rotation.y) rf.scale.set((d + 0.6) / (w + 0.6), 1, (w + 0.6) / (d + 0.6));
  g.add(rf);
  const dr = door(0.9, 1.7, '#6a4428'); dr.position.set(0, 0, d / 2 + 0.01); g.add(dr);
  const wn = windowMesh(0.5, 0.6, r() > 0.6); wn.position.set(w * 0.28, h * 0.45, d / 2 + 0.01); g.add(wn);
  return g;
}

// ---------------- interiors ----------------
// Room: floor, three or four walls, ceiling beams. Origin at floor centre, door/front wall optional.
export function room(S, { w = 10, d = 8, h = 4, wallBase = '#b0a490', floor = 'flag', open = ['front'], beams = true } = {}) {
  const g = new THREE.Group();
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon('#ffffff', { map: floor === 'wood' ? tex.planks('#8a6040', 4, 8) : tex.flagstone('#9a9284') }));
  fl.material.map.repeat.set(w / 4, d / 4);
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const wm = stoneMat(wallBase, [w / 4, h / 4], 4), wm2 = stoneMat(wallBase, [d / 4, h / 4], 5);
  const mk = (name, len, m, x, z, ry) => {
    if (open.includes(name)) return;
    const wl = box(len, h, 0.4, m); wl.position.set(x, h / 2, z); wl.rotation.y = ry; g.add(wl);
  };
  mk('back', w, wm, 0, -d / 2, 0); mk('front', w, wm, 0, d / 2, 0);
  mk('left', d, wm2, -w / 2, 0, Math.PI / 2); mk('right', d, wm2, w / 2, 0, Math.PI / 2);
  if (beams) {
    const bm = toon('#4a3020');
    for (let x = -w / 2 + 1.5; x < w / 2; x += 2.5) { const b = box(0.3, 0.35, d, bm, 0.01); b.position.set(x, h - 0.2, 0); g.add(b); }
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon('#3a2a1e')); ce.rotation.x = Math.PI / 2; ce.position.y = h; g.add(ce);
  }
  S.add(g);
  return g;
}

export function table(w = 2.2, d = 1, h = 0.8, color = '#7a5232') {
  const g = new THREE.Group();
  const top = box(w, 0.1, d, toon('#ffffff', { map: tex.planks(color, 6, 4) }), 0.01); top.position.y = h; g.add(top);
  const lm = toon(color);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = box(0.1, h, 0.1, lm, 0.008); l.position.set(x * (w / 2 - 0.12), h / 2, z * (d / 2 - 0.12)); g.add(l); }
  return g;
}

export function bench(w = 2, h = 0.45, color = '#6a4428') {
  const g = new THREE.Group();
  const top = box(w, 0.08, 0.4, toon(color), 0.008); top.position.y = h; g.add(top);
  for (const x of [-1, 1]) { const l = box(0.08, h, 0.35, toon(color), 0.006); l.position.set(x * (w / 2 - 0.15), h / 2, 0); g.add(l); }
  return g;
}

export function bed(color = '#c8b8a0') {
  const g = new THREE.Group();
  const fr = box(1.0, 0.35, 2.0, toon('#6a4428'), 0.01); fr.position.y = 0.25; g.add(fr);
  const mt = box(0.9, 0.18, 1.9, toon(color), 0.01); mt.position.y = 0.5; g.add(mt);
  const pl = box(0.6, 0.12, 0.35, toon('#f0ead8'), 0.008); pl.position.set(0, 0.64, -0.75); g.add(pl);
  const bl = box(0.95, 0.08, 1.2, toon('#7a5a8a'), 0.008); bl.position.set(0, 0.62, 0.3); g.add(bl);
  const hb = box(1.0, 0.6, 0.08, toon('#5a3a22'), 0.01); hb.position.set(0, 0.6, -0.98); g.add(hb);
  return g;
}

export function barrel(h = 1.0) {
  const g = new THREE.Group();
  const b = inked(new THREE.CylinderGeometry(0.4, 0.4, h, 14), toon('#ffffff', { map: tex.planks('#8a6040', 7, 10, true) }), 0.01);
  b.position.y = h / 2; g.add(b);
  const mid = inked(new THREE.CylinderGeometry(0.44, 0.44, h * 0.6, 14), toon('#8a6040'), 0.01); mid.position.y = h / 2; mid.scale.set(1, 1, 1); g.add(mid);
  for (const y of [0.12, 0.88]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 16), toon('#3a3430')); r.rotation.x = Math.PI / 2; r.position.y = y * h; g.add(r); }
  return g;
}

export function crate(s = 0.8) {
  return box(s, s, s, toon('#ffffff', { map: tex.planks('#9a7048', 8, 4) }), 0.01);
}

export function hay(r = 1.2) {
  const g = new THREE.Group(); const rr = rand(7);
  const m = toon('#e0c070', { map: tex.thatch('#e0c070') });
  for (let i = 0; i < 6; i++) {
    const s = inked(new THREE.SphereGeometry(r * (0.6 + rr() * 0.4), 12, 8), m, 0.015);
    s.position.set((rr() - 0.5) * r, r * 0.3 + rr() * 0.2, (rr() - 0.5) * r); s.scale.y = 0.6; g.add(s);
  }
  return g;
}

export function trough(len = 2.2) {
  const g = new THREE.Group();
  const wm = toon('#7a5a3a', { map: tex.planks('#7a5a3a', 9, 3) });
  const base = box(len, 0.1, 0.8, wm, 0.01); base.position.y = 0.1; g.add(base);
  for (const z of [-0.4, 0.4]) { const s = box(len, 0.7, 0.08, wm, 0.01); s.position.set(0, 0.4, z); g.add(s); }
  for (const x of [-len / 2, len / 2]) { const s = box(0.08, 0.7, 0.88, wm, 0.01); s.position.set(x, 0.4, 0); g.add(s); }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.1, 0.72), new THREE.MeshToonMaterial({ color: '#5a8ab0', transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.62; g.add(water);
  g.userData.water = water;
  return g;
}

export function fence(len, h = 1.1) {
  const g = new THREE.Group(); const m = toon('#8a6a48');
  for (let x = -len / 2; x <= len / 2 + 0.01; x += 2) { const p = box(0.14, h, 0.14, m, 0.008); p.position.set(x, h / 2, 0); g.add(p); }
  for (const y of [h * 0.45, h * 0.85]) { const r = box(len, 0.1, 0.06, m, 0.006); r.position.set(0, y, 0.06); g.add(r); }
  return g;
}

export function bookshelf(w = 2.4, h = 3.2) {
  const g = new THREE.Group();
  const t = tex.books(Math.floor(w * 10)); t.repeat.set(w / 2.4, h / 3.2);
  const back = box(w, h, 0.5, toon('#ffffff', { map: t }), 0.015); back.position.y = h / 2; g.add(back);
  for (const x of [-1, 1]) { const s = box(0.1, h, 0.55, toon('#4a3020'), 0.008); s.position.set(x * w / 2, h / 2, 0.02); g.add(s); }
  return g;
}

export function banner(w = 1.2, h = 3, color = '#8a1e22', emblem = '#d8b048') {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 128; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 128, 320);
  x.fillStyle = emblem; x.fillRect(8, 8, 112, 8); x.fillRect(8, 290, 112, 8);
  // stylised oak leaf emblem
  x.beginPath(); x.moveTo(64, 70); x.bezierCurveTo(110, 110, 100, 200, 64, 240); x.bezierCurveTo(28, 200, 18, 110, 64, 70); x.fill();
  x.strokeStyle = color; x.lineWidth = 4; x.beginPath(); x.moveTo(64, 80); x.lineTo(64, 236); x.stroke();
  const geo = new THREE.PlaneGeometry(w, h, 6, 10);
  const m = new THREE.Mesh(geo, toon('#ffffff', { map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
  m.position.y = -h / 2;
  g.add(m);
  const rod = inked(new THREE.CylinderGeometry(0.03, 0.03, w * 1.2, 6), toon('#3a2a1a'), 0.005); rod.rotation.z = Math.PI / 2; g.add(rod);
  g.userData.cloth = geo;
  return g;
}

// ---------------- light & fire ----------------
export function fire(S, pos, { scale = 1, light = true, intensity = 3, dist = 9, seed = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos);
  const flameMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const fl = [];
  [['#ff7a20', 0.9, 0.35, 0.9], ['#ffb040', 0.9, 0.25, 0.7], ['#fff0a0', 0.9, 0.13, 0.45]].forEach(([c, o, r, h], i) => {
    for (let k = 0; k < 3; k++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 8), flameMat(c, o));
      f.position.set((k - 1) * 0.12 * scale, (h * scale) / 2, (k % 2) * 0.05 * scale);
      g.add(f); fl.push([f, i * 3 + k, h * scale]);
    }
  });
  let L = null;
  if (light) { L = new THREE.PointLight('#ff9a40', intensity, dist, 1.6); L.position.y = 0.5 * scale; g.add(L); }
  S.add(g);
  S.onUpdate((t) => {
    fl.forEach(([f, i, h]) => {
      const n = Math.sin(t * (9 + i) + i * 1.3) * 0.5 + Math.sin(t * (13 + i * 0.7) + i) * 0.5;
      f.scale.set(1 + n * 0.08, 1 + n * 0.25, 1 + n * 0.08);
      f.position.y = (h * f.scale.y) / 2;
    });
    if (L) L.intensity = intensity * (0.85 + 0.15 * Math.sin(t * 11 + seed) * Math.sin(t * 7.3 + seed * 2));
  });
  return g;
}

export function torch(S, pos, opts = {}) {
  const g = new THREE.Group(); g.position.set(...pos);
  const st = inked(new THREE.CylinderGeometry(0.04, 0.03, 0.6, 6), toon('#4a3020'), 0.006); st.rotation.x = -0.4; st.position.set(0, 0, 0.12); g.add(st);
  S.add(g);
  fire(S, [pos[0], pos[1] + 0.25, pos[2] + 0.25], { scale: 0.35, intensity: opts.intensity ?? 2.2, dist: opts.dist ?? 7, seed: pos[0] * 7 });
  return g;
}

// Volumetric-looking light shaft (sunbeam through a window).
export function lightShaft(S, from, to, width = 1, color = '#fff2c8', opacity = 0.18) {
  const len = new THREE.Vector3(...from).distanceTo(new THREE.Vector3(...to));
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.2, 'rgba(0,0,0,0)'); gx.addColorStop(0.8, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const geo = new THREE.CylinderGeometry(width * 0.5, width * 0.9, len, 4, 1, true);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...from);
  mesh.lookAt(...to); mesh.rotateX(-Math.PI / 2);
  S.add(mesh);
  return mesh;
}

// Floating dust motes / embers / fireflies.
export function motes(S, center, size, { n = 120, color = '#fff4d0', sz = 0.03, speed = 0.1, seed = 3, rise = 0 } = {}) {
  const geo = new THREE.BufferGeometry(); const r = rand(seed);
  const base = new Float32Array(n * 3), pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { base[i * 3] = (r() - 0.5) * size[0]; base[i * 3 + 1] = r() * size[1]; base[i * 3 + 2] = (r() - 0.5) * size[2]; ph[i] = r() * 100; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: sz, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.position.set(...center);
  S.add(pts);
  S.onUpdate((t) => {
    for (let i = 0; i < n; i++) {
      const p = ph[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * speed * 3 + p) * 0.3;
      pos[i * 3 + 1] = rise ? ((base[i * 3 + 1] + t * rise * (0.5 + (p % 1))) % size[1]) : base[i * 3 + 1] + Math.sin(t * speed * 2 + p * 1.3) * 0.2;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * speed * 2.5 + p) * 0.3;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// Rain streaks.
export function rain(S, center, size, n = 1500, seed = 4) {
  const r = rand(seed);
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 6); const base = [];
  for (let i = 0; i < n; i++) base.push([(r() - 0.5) * size[0], r() * size[1], (r() - 0.5) * size[2], 14 + r() * 6]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#9aa8c8', transparent: true, opacity: 0.5 }));
  lines.position.set(...center);
  S.add(lines);
  S.onUpdate((t) => {
    base.forEach(([x, y, z, v], i) => {
      const yy = size[1] - ((size[1] - y + t * v) % size[1]);
      pos.set([x + yy * 0.08, yy, z, x + yy * 0.08 + 0.05, yy + 0.6, z], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
  });
}

// Simple flat shadowless props held in hands.
export const props = {
  apple() { const a = inked(new THREE.SphereGeometry(0.045, 10, 8), toon('#c83a2a'), 0.004); return a; },
  cake() { const g = new THREE.Group(); const c = inked(new THREE.CylinderGeometry(0.05, 0.055, 0.04, 10), toon('#d8a050'), 0.003); g.add(c); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.01, 10), toon('#f0d080')); top.position.y = 0.024; g.add(top); return g; },
  ladle() { const g = new THREE.Group(); const h = inked(new THREE.CylinderGeometry(0.012, 0.015, 0.5, 6), toon('#8a6040'), 0.004); h.position.y = 0.2; g.add(h); const b = inked(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#a07850'), 0.004); b.position.y = 0.46; b.rotation.x = Math.PI; g.add(b); return g; },
  stick(len = 0.9) { const s = inked(new THREE.CylinderGeometry(0.018, 0.022, len, 6), toon('#9a7048'), 0.004); s.position.y = len * 0.4; return s; },
  paper() { const g = new THREE.Group(); const p = inked(new THREE.BoxGeometry(0.16, 0.005, 0.11), toon('#f0e8d0'), 0.002); g.add(p); return g; },
  lantern() { const g = new THREE.Group(); const b = inked(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 6), toon('#3a3430'), 0.004); b.position.y = -0.12; g.add(b); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd080' })); gl.position.y = -0.12; g.add(gl); const L = new THREE.PointLight('#ffb050', 1.5, 5, 1.5); L.position.y = -0.12; g.add(L); return g; },
  longbow(h = 1.5) {
    const g = new THREE.Group();
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -h / 2, 0), new THREE.Vector3(0, 0, 0.22), new THREE.Vector3(0, h / 2, 0));
    g.add(inked(new THREE.TubeGeometry(curve, 16, 0.016, 6), toon('#6a4a2a'), 0.004));
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, h, 3), new THREE.MeshBasicMaterial({ color: '#d8d0c0' })); g.add(s);
    return g;
  },
  dough() { const d = inked(new THREE.SphereGeometry(0.18, 14, 10), toon('#f2e2c0'), 0.006); d.scale.set(1.3, 0.45, 1); return d; },
  folder() { const f = inked(new THREE.BoxGeometry(0.3, 0.02, 0.22), toon('#6a3a22'), 0.004); return f; },
  sword(len = 0.9) { const g = new THREE.Group(); const b = inked(new THREE.BoxGeometry(0.05, len, 0.012), toon('#9a7048'), 0.004); b.position.y = len / 2; g.add(b); const gd = inked(new THREE.BoxGeometry(0.18, 0.03, 0.03), toon('#6a4a2a'), 0.004); gd.position.y = 0.05; g.add(gd); return g; },
};
