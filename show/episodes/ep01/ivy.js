// Ivy growing up the front (+z) face of the Baron's tower. Returns the climbing line and the
// section that tears loose during the climb.
import * as THREE from 'three';
import { toon, inked } from '../../lib/toon.js';
import { rand } from '../../lib/kit.js';

export function ivyAngle(y) { return 0.13 * Math.sin(y * 0.45) + 0.04 * Math.sin(y * 1.7); }

export function ivyPoint(T, y, out = 0.06) {
  const a = ivyAngle(y), r = T.r * (1.05 - 0.05 * (y / T.h)) + out;
  return [T.x + Math.sin(a) * r, y, T.z + Math.cos(a) * r];
}

export function addIvy(S, T, { top = 24, tearFrom = 11.5, tearTo = 14.5, seed = 4 } = {}) {
  const r = rand(seed);
  const stemMat = toon('#3a4a2a'), leafMats = ['#2f5a2f', '#3d6b36', '#4a7a3a'].map((c) => toon(c, { side: THREE.DoubleSide }));
  const leafGeo = new THREE.CircleGeometry(0.11, 6); leafGeo.scale(1, 1.25, 1);
  const main = new THREE.Group(), tear = new THREE.Group();
  const build = (y0, y1, parent) => {
    const pts = []; for (let y = y0; y <= y1 + 0.01; y += 0.4) { const p = ivyPoint(T, y); pts.push(new THREE.Vector3(...p)); }
    if (pts.length < 2) return;
    parent.add(inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(4, pts.length * 3), 0.035, 5), stemMat, 0.006));
    // side tendrils and leaves
    for (let y = y0; y < y1; y += 0.22) {
      for (let k = 0; k < 3; k++) {
        const da = (r() - 0.5) * 0.5, dy = (r() - 0.5) * 0.4;
        const a = ivyAngle(y) + da, rr = T.r * (1.05 - 0.05 * (y / T.h)) + 0.05 + r() * 0.05;
        const leaf = new THREE.Mesh(leafGeo, leafMats[Math.floor(r() * 3)]);
        leaf.position.set(T.x + Math.sin(a) * rr, y + dy, T.z + Math.cos(a) * rr);
        leaf.lookAt(T.x + Math.sin(a) * (rr + 1), y + dy + 0.3, T.z + Math.cos(a) * (rr + 1));
        leaf.rotateZ(r() * 6.28);
        leaf.castShadow = true;
        parent.add(leaf);
      }
    }
  };
  build(0, tearFrom, main); build(tearTo, top, main);
  // the section that rips away: pivots from its top
  const pivot = new THREE.Group(); const tp = ivyPoint(T, tearTo); pivot.position.set(...tp);
  build(tearFrom, tearTo, tear); tear.position.set(-tp[0], -tp[1], -tp[2]);
  pivot.add(tear); main.add(pivot);
  S.add(main);
  return { pivot };
}
