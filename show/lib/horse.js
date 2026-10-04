// Small shaggy Ranger horse with a procedural walk.
import * as THREE from 'three';
import { toon, inked } from './toon.js';

export class Horse {
  constructor({ coat = '#7a5a3a', mane = '#3a2a1e', scale = 1 } = {}) {
    const s = scale, ink = 0.015 * s;
    const C = toon(coat), M = toon(mane), hoof = toon('#2a2220');
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.body.position.y = 1.05 * s;
    this.root.add(this.body);
    const barrel = inked(new THREE.CapsuleGeometry(0.34 * s, 0.85 * s, 6, 14), C, ink);
    barrel.rotation.x = Math.PI / 2; barrel.scale.set(1, 1, 0.95);
    this.body.add(barrel);
    // neck + head
    this.neck = new THREE.Group(); this.neck.position.set(0, 0.15 * s, 0.55 * s); this.body.add(this.neck);
    const nk = inked(new THREE.CapsuleGeometry(0.17 * s, 0.5 * s, 4, 10), C, ink); nk.position.set(0, 0.3 * s, 0.12 * s); nk.rotation.x = 0.55; this.neck.add(nk);
    this.head = new THREE.Group(); this.head.position.set(0, 0.62 * s, 0.32 * s); this.neck.add(this.head);
    const hd = inked(new THREE.CapsuleGeometry(0.13 * s, 0.38 * s, 4, 10), C, ink); hd.rotation.x = 1.9; hd.position.set(0, -0.08 * s, 0.17 * s); this.head.add(hd);
    const muzzle = inked(new THREE.SphereGeometry(0.12 * s, 10, 8), toon('#5a4030'), ink); muzzle.position.set(0, -0.2 * s, 0.38 * s); muzzle.scale.set(1, 0.9, 1.1); this.head.add(muzzle);
    for (const sx of [1, -1]) {
      const ear = inked(new THREE.ConeGeometry(0.045 * s, 0.14 * s, 6), C, ink * 0.6); ear.position.set(sx * 0.08 * s, 0.12 * s, 0.02 * s); ear.rotation.z = -sx * 0.25; this.head.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 8, 6), new THREE.MeshBasicMaterial({ color: '#120c08' })); eye.position.set(sx * 0.12 * s, 0.0, 0.14 * s); this.head.add(eye);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.009 * s, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); gl.position.set(sx * 0.135 * s, 0.012 * s, 0.155 * s); this.head.add(gl);
    }
    // shaggy mane & forelock
    for (let i = 0; i < 8; i++) {
      const m = inked(new THREE.SphereGeometry(0.09 * s, 8, 6), M, ink * 0.6);
      m.position.set(0, (0.1 + i * 0.08) * s, (0.0 + i * 0.05) * s); m.scale.set(0.7, 1.2, 1); this.neck.add(m);
    }
    const fl = inked(new THREE.SphereGeometry(0.08 * s, 8, 6), M, ink * 0.6); fl.position.set(0, 0.1 * s, 0.1 * s); this.head.add(fl);
    // tail
    this.tail = new THREE.Group(); this.tail.position.set(0, 0.15 * s, -0.75 * s); this.body.add(this.tail);
    const tl = inked(new THREE.CapsuleGeometry(0.08 * s, 0.55 * s, 4, 8), M, ink); tl.position.y = -0.3 * s; this.tail.add(tl);
    this.tail.rotation.x = 0.35;
    // legs: [x, z]
    this.legs = [[0.17, 0.42], [-0.17, 0.42], [0.17, -0.48], [-0.17, -0.48]].map(([x, z]) => {
      const hip = new THREE.Group(); hip.position.set(x * s, -0.1 * s, z * s); this.body.add(hip);
      const up = inked(new THREE.CapsuleGeometry(0.075 * s, 0.38 * s, 4, 8), C, ink); up.position.y = -0.25 * s; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -0.48 * s; hip.add(knee);
      const lo = inked(new THREE.CapsuleGeometry(0.05 * s, 0.32 * s, 4, 8), C, ink); lo.position.y = -0.2 * s; knee.add(lo);
      const feather = inked(new THREE.SphereGeometry(0.075 * s, 8, 6), M, ink * 0.5); feather.position.y = -0.38 * s; feather.scale.set(1, 0.8, 1); knee.add(feather);
      const hf = inked(new THREE.CylinderGeometry(0.06 * s, 0.07 * s, 0.07 * s, 8), hoof, ink * 0.5); hf.position.y = -0.44 * s; knee.add(hf);
      return { hip, knee };
    });
    // saddle
    const sd = inked(new THREE.CapsuleGeometry(0.3 * s, 0.25 * s, 4, 10), toon('#4a2e1c'), ink);
    sd.rotation.x = Math.PI / 2; sd.scale.set(1.15, 0.45, 0.6); sd.position.set(0, 0.32 * s, -0.05 * s); this.body.add(sd);
    this.saddle = new THREE.Group(); this.saddle.position.set(0, 0.42 * s, -0.05 * s); this.body.add(this.saddle);
    this.s = s;
  }

  // walk: phase in cycles, speed 0 (standing) .. 1 (walking)
  apply({ pos = [0, 0, 0], yaw = 0, phase = 0, walk = 0, headDown = 0, t = 0 }) {
    this.root.position.set(...pos);
    this.root.rotation.y = yaw;
    const P = phase * Math.PI * 2;
    const offs = [0, 0.5, 0.75, 0.25]; // four-beat walk
    this.legs.forEach((L, i) => {
      const a = Math.sin(P + offs[i] * Math.PI * 2);
      L.hip.rotation.x = a * 0.35 * walk;
      L.knee.rotation.x = Math.max(0, -Math.cos(P + offs[i] * Math.PI * 2)) * 0.7 * walk * (i < 2 ? -1 : 1);
    });
    this.body.position.y = 1.05 * this.s + Math.sin(P * 2) * 0.02 * walk;
    this.neck.rotation.x = Math.sin(P * 2) * 0.06 * walk + headDown * 0.6;
    this.tail.rotation.z = Math.sin(t * 1.3) * 0.15;
    this.head.rotation.y = Math.sin(t * 0.4) * 0.1;
  }
}
