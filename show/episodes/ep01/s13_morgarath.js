// SCENE 13: The Mountains of Rain and Night. Morgarath on his balcony above a sea of Wargals;
// something enormous opens its eyes behind him. Then the "Next time" tag (scene 99).
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { sky, hills, box, rain, rand, stoneMat, fire, motes } from '../../lib/kit.js';
import { P, add, ramp, shotOn, drift, blendShot, headPos, clamp, lerp, flash } from '../../lib/director.js';
import { titleText } from '../../lib/runtime.js';

const BAL = { x: 0, y: 22, z: 0 };

function wargal(seed) {
  const r = rand(seed);
  const g = new THREE.Group();
  const fur = toon(['#5a4232', '#4e3a2c', '#624836'][seed % 3], { rim: true });
  const body = inked(new THREE.CapsuleGeometry(0.45, 0.6, 4, 10), fur, 0.02); body.rotation.x = 0.9; body.position.y = 1.1; g.add(body);
  const head = new THREE.Group(); head.position.set(0, 1.55, 0.55); g.add(head);
  head.add(inked(new THREE.SphereGeometry(0.3, 10, 8), fur, 0.015));
  const snout = inked(new THREE.ConeGeometry(0.16, 0.45, 8), fur, 0.01); snout.rotation.x = Math.PI / 2; snout.position.z = 0.35; head.add(snout);
  for (const sx of [-1, 1]) { const e = inked(new THREE.ConeGeometry(0.08, 0.22, 5), fur, 0.008); e.position.set(sx * 0.18, 0.25, -0.05); e.rotation.z = -sx * 0.4; head.add(e); }
  const eyeM = new THREE.MeshBasicMaterial({ color: '#ff5030' });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), eyeM); e.position.set(sx * 0.12, 0.06, 0.25); head.add(e); }
  for (let i = 0; i < 10; i++) { const t = inked(new THREE.ConeGeometry(0.1, 0.35, 4), fur, 0.008); t.position.set((r() - 0.5) * 0.6, 1.2 + r() * 0.5, -0.2 + (r() - 0.5) * 0.5); t.rotation.set(-0.8 + r() * 0.4, r() * 6, (r() - 0.5) * 0.6); g.add(t); }
  for (const sx of [-1, 1]) { const a = inked(new THREE.CapsuleGeometry(0.12, 0.9, 3, 6), fur, 0.01); a.position.set(sx * 0.45, 0.65, 0.35); a.rotation.x = 0.4; g.add(a); }
  g.userData = { head, ph: r() * 6 };
  return g;
}

const morgarath = {
  cast: ['morgarath'],
  rim: '#8aa0ff', rimStrength: 0.7, bloom: 0.5, fill: 0.35, fillColor: '#5a6aa8', tint: [0.9, 0.93, 1.05], sat: 0.85,
  build({ S, scene }) {
    scene.fog = new THREE.FogExp2('#0a0c14', 0.0055);
    sky(S, { top: '#05060c', mid: '#10141f', bottom: '#1a1e2c', sunDir: [0, 0.3, -1], sunCol: '#8090c0', sunSize: 0, glow: 0.1 });
    // jagged black cliffs ringing a rain-soaked plateau
    hills(S, { size: 500, seg: 120, y: 0, color: '#1a1a20', fn: (x, z) => {
      const d = Math.hypot(x, z - 30);
      const ring = THREE.MathUtils.smoothstep(d, 45, 70) * (28 + Math.sin(x * 0.13) * 10 + Math.sin(z * 0.21 + 1) * 8 + Math.abs(Math.sin(x * 0.5 + z * 0.3)) * 6);
      return ring + Math.sin(x * 0.4) * Math.cos(z * 0.35) * 0.6;
    } });
    // Morgarath's balcony on a cliff spur
    const spur = inked(new THREE.CylinderGeometry(4, 9, BAL.y, 7), stoneMat('#2a2830', [2, 4], 131), 0.03); spur.position.set(BAL.x, BAL.y / 2, BAL.z - 4); S.add(spur);
    const floor = box(7, 0.6, 5, stoneMat('#34323a', [2, 1], 132)); floor.position.set(BAL.x, BAL.y - 0.3, BAL.z); S.add(floor);
    for (let i = 0; i < 8; i++) { const p = box(0.25, 1.0, 0.25, stoneMat('#3a3842', [0.2, 0.5], 133), 0.01); p.position.set(BAL.x - 3.2 + i * 0.92, BAL.y + 0.5, BAL.z + 2.4); S.add(p); }
    const rail = box(7, 0.2, 0.35, stoneMat('#3a3842', [2, 0.2], 134)); rail.position.set(BAL.x, BAL.y + 1.05, BAL.z + 2.4); S.add(rail);
    const arch = box(4.5, 6, 0.8, stoneMat('#2a2830', [1, 2], 135)); arch.position.set(BAL.x, BAL.y + 3, BAL.z - 2.6); S.add(arch);
    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.2), new THREE.MeshBasicMaterial({ color: '#020204' })); doorway.position.set(BAL.x, BAL.y + 2.1, BAL.z - 2.18); S.add(doorway);
    // the Kalkara: a huge shape in the doorway, two dull eyes
    const kal = new THREE.Group(); kal.position.set(BAL.x - 0.2, BAL.y, BAL.z - 3.2);
    const kb = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), new THREE.MeshBasicMaterial({ color: '#06060a' })); kb.position.y = 2.2; kb.scale.set(1, 1.3, 0.8); kal.add(kb);
    const eyeM = new THREE.MeshBasicMaterial({ color: '#f0d890', transparent: true, opacity: 0 });
    const eyes = [-0.4, 0.4].map((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), eyeM); e.position.set(x, 3.0, 1.0); e.scale.y = 0.6; kal.add(e); return e; });
    S.add(kal);
    // the Wargal horde below
    const horde = []; const r = rand(21);
    for (let i = 0; i < 70; i++) {
      const w = wargal(i); const a = r() * Math.PI * 2, d = 8 + r() * 30;
      w.position.set(Math.cos(a) * d, 0, 30 + Math.sin(a) * d * 0.7); w.rotation.y = Math.PI + (r() - 0.5) * 0.8; w.scale.setScalar(0.9 + r() * 0.3);
      S.add(w); horde.push(w);
    }
    S.onUpdate((t) => horde.forEach((w, i) => { w.position.y = Math.abs(Math.sin(t * 2 + w.userData.ph)) * 0.08; w.userData.head.rotation.y = Math.sin(t * 0.7 + w.userData.ph) * 0.4; }));
    rain(S, [0, 0, 15], [80, 40, 60], 2600, 7);
    // war-camp bonfires silhouette the horde
    [[-8, 26], [9, 34], [0, 44]].forEach(([x, z], i) => fire(S, [x, 0, z], { scale: 2.4, intensity: 14, dist: 34, seed: i }));
    motes(S, [0, 1, 34], [30, 10, 24], { n: 160, color: '#ff8a3a', sz: 0.12, speed: 0.4, rise: 1.2 });
    const moonish = new THREE.DirectionalLight('#6a78b0', 0.5); moonish.position.set(-20, 40, 40); S.add(moonish);
    S.add(new THREE.HemisphereLight('#2a3050', '#050508', 0.5));
    const bolt = new THREE.DirectionalLight('#d8e0ff', 0); bolt.position.set(30, 60, 50); S.add(bolt);
    return { bolt, eyeM, eyes };
  },
  frame({ t, ctx, cast, env }) {
    const A = (m) => ctx.act(m), L = (m) => ctx.line(m);
    const tNarr = L('Far to the east').s, tReveal = A('On a stone balcony').s, tForgot = L('Fifteen years').s, tGrowl = ctx.sfx('wargal_growl'), tSleep = L('Let them sleep').s, tShift = A('Behind him, something huge').s, tBlack = A('Black.').s;
    const strikes = [0.5, tNarr + 1.5, tReveal, tForgot + 5.5, tShift + 0.2];
    let L_ = 0; for (const s of strikes) { const d = t - s; if (d > 0 && d < 0.5) L_ = Math.max(L_, (d < 0.08 ? 1 : 0.6) * (1 - d / 0.5)); }
    env.bolt.intensity = L_ * 4;
    const open = ramp(t, tShift + 0.6, tShift + 1.4);
    env.eyeM.opacity = open; env.eyes.forEach((e) => (e.scale.y = 0.15 + open * 0.5));
    const turn = ramp(t, tSleep + 2.4, tSleep + 3.2);
    const m = add(P.handsBehind(), { pos: [BAL.x + 0.6, BAL.y, BAL.z + 1.4], yaw: lerp(0.15, Math.PI - 0.3, turn), face: t < tSleep ? 'menace' : 'smirk', idleAmt: 0.3,
      lookAt: t < tForgot ? [0, 0, 40] : t < tSleep + 2.4 ? [0, 0, 40] : [BAL.x, BAL.y + 3, BAL.z - 3] });
    if (t > tForgot && t < tSleep) m.lookAt = t > tForgot + 3 ? undefined : [0, 2, 40];
    const mh = () => headPos(cast.morgarath);
    const shots = [
      [0, () => blendShot({ pos: [0, 6, 85], target: [0, 8, 20], fov: 46 }, { pos: [0, 10, 62], target: [0, 14, 15], fov: 44 }, ramp(t, 0, tReveal, 'sine'))],
      [tReveal, () => blendShot({ pos: [6, BAL.y - 2, BAL.z + 14], target: [BAL.x, BAL.y + 1.5, BAL.z], fov: 38 }, { pos: [4, BAL.y + 0.5, BAL.z + 8], target: mh(), fov: 34 }, ramp(t, tReveal, tForgot, 'sine'))],
      [tForgot, () => drift(shotOn(cast.morgarath, { angle: 0.35, dist: 1.1, fov: 28 }), t, 0.01)],
      [tForgot + 3.6, () => drift({ pos: [BAL.x - 1.2, BAL.y + 3.6, BAL.z + 1.4], target: [0, 0, 38], fov: 50 }, t)],     // over his shoulder: the horde
      [tGrowl - 0.6, () => drift(shotOn(cast.morgarath, { angle: -0.25, dist: 0.8, fov: 26 }), t, 0.01)],
      [tShift, () => blendShot({ pos: [BAL.x + 1.8, BAL.y + 1.8, BAL.z + 3.5], target: [BAL.x - 0.2, BAL.y + 2.6, BAL.z - 3], fov: 40 }, { pos: [BAL.x + 0.8, BAL.y + 2.4, BAL.z + 1.0], target: [BAL.x - 0.2, BAL.y + 3.0, BAL.z - 2.3], fov: 30 }, ramp(t, tShift, tBlack, 'in'))],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { morgarath: m }, camera: cam, overlay: (g, W, H) => flash(g, W, H, L_ * 0.35), fade: ramp(t, tBlack, tBlack + 0.15) };
  },
  fadeOut: 0.05,
};

// "NEXT TIME" tag over the end of the score
const nextTime = {
  cast: [],
  fadeIn: 0.8,
  build({ scene }) { scene.background = new THREE.Color('#050806'); return {}; },
  frame({ t, ctx }) {
    const overlay = (g, W, H) => {
      const gr = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
      gr.addColorStop(0, '#1e3020'); gr.addColorStop(1, '#030503');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // drifting leaves
      for (let i = 0; i < 40; i++) {
        const x = ((i * 173 + t * (20 + (i % 5) * 8)) % (W + 100)) - 50, y = ((i * 97 + t * (30 + (i % 3) * 10)) % (H + 100)) - 50;
        g.save(); g.translate(x, y); g.rotate(t * (0.5 + (i % 4) * 0.3) + i); g.fillStyle = `rgba(${90 + (i % 3) * 30},${120 + (i % 4) * 15},60,0.35)`;
        g.beginPath(); g.ellipse(0, 0, W * 0.008, W * 0.004, 0, 0, 7); g.fill(); g.restore();
      }
      const a = ramp(t, 0.2, 1.4) * (1 - ramp(t, ctx.dur - 0.8, ctx.dur));
      titleText(g, W, H, 'NEXT TIME', H * 0.4, a, { size: W * 0.022, weight: 500, spacing: 0.5, glow: 'rgba(200,255,200,0.2)' });
      titleText(g, W, H, "THE RANGER'S APPRENTICE", H * 0.5, a, { size: W * 0.05, glow: 'rgba(160,220,140,0.45)' });
    };
    return { poses: {}, camera: { pos: [0, 0, 5], target: [0, 0, 0], fov: 40 }, overlay };
  },
};

export { morgarath, nextTime };
