// Castle Redmont exterior, shared by every outdoor scene in the castle.
// Layout (metres): courtyard centred on the origin, front gate facing +z, the keep at the back
// with the Baron's tall tower beside it.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { box, wall, tower, roof, stoneMat, windowMesh, door, house, barrel, crate, hay, banner } from '../../lib/kit.js';

export const KEEP = { x: 0, z: -8, w: 14, d: 12, h: 18, roofH: 5 };
export const TOWER = { x: 9.5, z: -15.5, r: 3.2, h: 30 };
export const HALL = { x: 0, z: 2, w: 12, d: 8, h: 11, roofH: 3.5 };

export function buildRedmont(S, { lit = false, base = '#b3a68e', flags = true, officeDark = false } = {}) {
  const g = new THREE.Group();
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), toon('#ffffff', { map: tex.dirt('#b09a74') }));
  yard.material.map.repeat.set(10, 10);
  yard.rotation.x = -Math.PI / 2; yard.position.y = 0.02; yard.receiveShadow = true; g.add(yard);

  // curtain walls (gap in the front wall for the gatehouse)
  const W = (len, x, z, ry) => { const w = wall(len, 9, 2.2, { base }); w.position.set(x, 0, z); w.rotation.y = ry; g.add(w); };
  W(50, 0, -25, 0); W(50, -25, 0, Math.PI / 2); W(50, 25, 0, Math.PI / 2);
  W(21, -14.5, 25, 0); W(21, 14.5, 25, 0);
  for (const [x, z] of [[-25, -25], [25, -25], [-25, 25], [25, 25]]) {
    const t = tower(3.4, 14, { base, windows: [[9, Math.atan2(x, z), lit]] }); t.position.set(x, 0, z); g.add(t);
  }
  // gatehouse
  for (const x of [-4.6, 4.6]) { const t = tower(2.6, 13, { base, flat: true, windows: [[8, 0, lit]] }); t.position.set(x, 0, 25); g.add(t); }
  const arch = box(7, 4, 2.6, stoneMat(base, [2, 1])); arch.position.set(0, 9, 25); g.add(arch);
  const cr = wall(7, 0.01, 2.6, { base }); cr.position.set(0, 11, 25); g.add(cr);
  const port = box(6.2, 0.5, 0.3, toon('#3a3430')); port.position.set(0, 6.8, 26.2); g.add(port);
  for (let x = -2.8; x <= 2.8; x += 0.7) { const b = box(0.12, 1.6, 0.12, toon('#3a3430'), 0.004); b.position.set(x, 7.6, 26.2); g.add(b); }

  // the keep
  const keep = box(KEEP.w, KEEP.h, KEEP.d, stoneMat(base, [KEEP.w / 4, KEEP.h / 4], 3));
  keep.position.set(KEEP.x, KEEP.h / 2, KEEP.z); g.add(keep);
  const kr = roof(KEEP.d + 0.8, KEEP.w + 0.8, KEEP.roofH, '#4a5068', (() => { const t = tex.stone('#5a6078', 11, 14); t.repeat.set(3, 2); return t; })());
  kr.rotation.y = Math.PI / 2; kr.position.set(KEEP.x, KEEP.h, KEEP.z); g.add(kr);
  const chim = box(1.1, 3.2, 1.1, stoneMat(base, [0.5, 1], 6)); chim.position.set(4.2, KEEP.h + 3.2, KEEP.z - 1.3); g.add(chim);
  const chim2 = box(1.1, 3.2, 1.1, stoneMat(base, [0.5, 1], 6)); chim2.position.set(-4.5, KEEP.h + 3.2, KEEP.z + 1.3); g.add(chim2);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const w = windowMesh(0.9, 1.6, lit && (i + j) % 2 === 0); w.position.set(KEEP.x - 4.8 + i * 3.2, 4 + j * 4.5, KEEP.z + KEEP.d / 2 + 0.01); g.add(w);
  }
  const kd = door(2.2, 3.4); kd.position.set(KEEP.x, 0, KEEP.z + KEEP.d / 2 + 0.02); g.add(kd);

  // the Baron's tower: tallest in the castle, ivy up one side
  const tw = tower(TOWER.r, TOWER.h, { base, roofH: 9, windows: [[24, 0, lit && !officeDark], [16, 0.5, false], [8, 0, false], [24, Math.PI / 2, lit && !officeDark]] });
  tw.position.set(TOWER.x, 0, TOWER.z); g.add(tw);

  // great hall in front of the keep
  const hall = box(HALL.w, HALL.h, HALL.d, stoneMat(base, [3, 3], 7)); hall.position.set(HALL.x - 6, HALL.h / 2, HALL.z + 4); g.add(hall);
  const hr = roof(HALL.d + 0.6, HALL.w + 0.6, HALL.roofH, '#4a5068', (() => { const t = tex.stone('#5a6078', 12, 14); t.repeat.set(3, 1.5); return t; })());
  hr.rotation.y = Math.PI / 2; hr.position.set(HALL.x - 6, HALL.h, HALL.z + 4); g.add(hr);

  // kitchens (with a smoking chimney) and stables along the west wall
  const k = house(9, 6, 5, 3); k.position.set(-17, 0, 12); k.rotation.y = Math.PI / 2; g.add(k);
  const st = house(12, 5, 4, 5); st.position.set(17, 0, 10); st.rotation.y = -Math.PI / 2; g.add(st);
  for (let i = 0; i < 6; i++) { const b = barrel(); b.position.set(-12 + (i % 3) * 0.9, 0, 17 + Math.floor(i / 3) * 0.9); g.add(b); }
  for (let i = 0; i < 3; i++) { const c = crate(); c.position.set(12 + i, 0.4, 17); c.rotation.y = i; g.add(c); }
  const hy = hay(1.4); hy.position.set(14, 0, 4); g.add(hy);

  // flags on the corner towers
  if (flags) {
    const fl = [];
    for (const [x, z, h] of [[-25, -25, 22], [25, -25, 22], [TOWER.x, TOWER.z, TOWER.h + 9]]) {
      const pole = inked(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), toon('#3a2a1a'), 0.01); pole.position.set(x, h + 1.5, z); g.add(pole);
      const geo = new THREE.PlaneGeometry(2.4, 1.3, 10, 4);
      const f = new THREE.Mesh(geo, toon('#8a1e22', { side: THREE.DoubleSide }));
      f.position.set(x + 1.2, h + 2.4, z); g.add(f);
      fl.push({ geo, base: geo.attributes.position.array.slice() });
    }
    S.onUpdate((t) => fl.forEach(({ geo, base }) => {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = base[i * 3] + 1.2; p.setZ(i, Math.sin(t * 4 - x * 2.2) * 0.18 * x); }
      p.needsUpdate = true;
    }));
  }
  S.add(g);
  return g;
}
