// SCENE 6: The castle gate at dusk. The market packs up, the crowd falls silent as the Ranger rides
// in, and he speaks to Will on the wall above without ever looking up.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { sky, ground, box, barrel, crate, motes, clouds, rand, forest } from '../../lib/kit.js';
import { P, add, ramp, walkPath, faceTo, shotOn, twoShot, drift, blendShot, headPos, coverage, clamp, lerp } from '../../lib/director.js';
import { Horse } from '../../lib/horse.js';
import { buildRedmont } from './redmont.js';

const GATE_Z = 25, WALL_TOP = 11.0;
const WILL = [0.2, GATE_Z + 1.15]; // in the gap between two merlons
const ROAD = [[0.4, 58], [0.2, 40], [0, 27], [0, 18], [-2, 10]];

function stall(color, seed) {
  const g = new THREE.Group(); const r = rand(seed);
  const wood = toon('#6a4a2a');
  for (const [x, z] of [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.1), wood); p.position.set(x, 1.15, z); p.castShadow = true; g.add(p); }
  const cloth = inked(new THREE.BoxGeometry(2.8, 0.06, 1.8), toon(color), 0.01); cloth.position.y = 2.35; cloth.rotation.x = 0.12; g.add(cloth);
  const counter = inked(new THREE.BoxGeometry(2.4, 0.9, 0.7), toon('#8a6040', { map: tex.planks('#8a6040', seed, 4) }), 0.01); counter.position.set(0, 0.45, 0.4); g.add(counter);
  for (let i = 0; i < 5; i++) { const f = inked(new THREE.SphereGeometry(0.1, 8, 6), toon(['#d84a3a', '#e8b84a', '#7aa84a', '#d88a3a'][i % 4]), 0.004); f.position.set(-0.8 + i * 0.4, 0.95, 0.45 + r() * 0.1); g.add(f); }
  return g;
}

export default {
  cast: ['will', 'halt', 'farmer1', 'farmer2', 'mother', 'child', 'cook1', 'clerk'],
  rim: '#ffb080', rimStrength: 0.7, bloom: 0.55, tint: [1.02, 0.97, 1.0],
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#c08a90', 50, 220);
    sky(S, { top: '#2a3a78', mid: '#e0907a', bottom: '#ffc890', sunDir: [-1, 0.06, 0.25], sunCol: '#ffd090', sunSize: 1.4, glow: 1.0, stars: 0.4 });
    clouds(S, 10, 300, 55, '#ffb0a0', 0.75, 5);
    const sun = new THREE.DirectionalLight('#ffb27a', 1.35); sun.position.set(-60, 9, 20); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 150 });
    sun.target.position.set(0, 0, 30); S.add(sun); S.add(sun.target);
    S.add(new THREE.HemisphereLight('#c8a8d8', '#5a4a3a', 0.85));
    ground(S, 400, '#ffffff', tex.dirt('#a8906a', 61));
    buildRedmont(S, { lit: true });
    // the market outside the gate, with lanterns
    [[-6, 33, '#a8382e'], [6.5, 34, '#3a5a8a'], [-6.5, 40, '#d8a83a'], [6, 41, '#5a7a3a']].forEach(([x, z, c], i) => {
      const st = stall(c, i + 3); st.position.set(x, 0, z); st.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; S.add(st);
    });
    const lamps = [[-4.6, 2.4, 33], [5, 2.4, 34], [-4.8, 2.4, 40], [1.8, 6.5, 26.6], [-1.8, 6.5, 26.6]];
    lamps.forEach(([x, y, z], i) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd28a' })); l.position.set(x, y, z); S.add(l);
      if (i < 3) { const L = new THREE.PointLight('#ffb060', 2.2, 9, 1.6); L.position.set(x, y - 0.1, z); S.add(L); }
    });
    for (let i = 0; i < 8; i++) { const b = i % 2 ? barrel(0.8) : crate(0.6); b.position.set((i % 2 ? -1 : 1) * (8.5 + (i % 3)), i % 2 ? 0 : 0.3, 30 + i * 2); S.add(b); }
    const trees = []; const r = rand(9);
    for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 260, z = 60 + r() * 140; if (Math.abs(x) < 12) continue; trees.push([x, 0, z]); }
    forest(S, trees, { scale: 3.2, seed: 6 });
    motes(S, [0, 0.5, 34], [16, 3, 16], { n: 80, color: '#ffe0a0', sz: 0.05, speed: 0.2 }); // fireflies

    const horse = new Horse({ coat: '#6a4a30', mane: '#2a1e16' });
    S.add(horse.root);
    const bow = cast.halt.attach('bow', (() => { const g = new THREE.Group(); const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.75, 0), new THREE.Vector3(0, 0, 0.2), new THREE.Vector3(0, 0.75, 0)); g.add(inked(new THREE.TubeGeometry(c, 16, 0.015, 6), toon('#6a4a2a'), 0.004)); return g; })(), 'L');
    bow.rotation.set(0.3, 0, 0.2);
    cast.clerk.attach('lantern', (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd28a' })); b.position.y = -0.1; g.add(b); return g; })(), 'R');
    return { horse };
  },

  frame({ t, ctx, cast, env }) {
    const A = (m) => ctx.act(m), L = (m) => ctx.line(m);
    const tQuiet = A('the crowd goes quiet').s, tStep = A('people step back').s, tRanger = L('Ranger.').s, tWalk = L('walk through a forest').s;
    const tShadow = L('not even really there').s, tBelow = A('rides through the gate directly below').s, tSpeak = A('without stopping').s;
    const tMind = L("Mind you don't fall").s, tJerk = A('Will jerks back').s, tHow = L('How does he').s;

    // Halt & Abelard: slow walk up the road, under the gate, into the courtyard shadows
    const hw = walkPath(t, ROAD, tQuiet - 1.5, tJerk + 2.5, { stride: 1.5 });
    env.horse.apply({ pos: hw.pos, yaw: hw.yaw, phase: hw.phase, walk: hw.moving, t });
    env.horse.root.visible = t < tJerk + 2.0;
    const saddle = new THREE.Vector3(); env.horse.saddle.getWorldPosition(saddle);
    const halt = add(P.sit('down'), {
      pos: [saddle.x, saddle.y - cast.halt.dim.leg + 0.1, saddle.z], yaw: hw.yaw, hood: 1, visible: t < tJerk + 2.0,
      legL: { out: 0.45, fwd: 0.8, bend: 0.9 }, legR: { out: 0.45, fwd: 0.8, bend: 0.9 }, armL: { fwd: 0.6, bend: 1.0 }, armR: { fwd: 0.6, bend: 1.0 },
      cloak: { wind: 0.35 }, face: 'stern', lookAt: [saddle.x, saddle.y + 1.0, saddle.z - 6], lookAmt: 0.6, gesture: 0,
    });

    // Will on the parapet above the gate, leaning over to look
    const lean = ramp(t, tBelow + 0.5, tBelow + 2.2) * (1 - ramp(t, tJerk, tJerk + 0.25, 'out'));
    const wobble = t > tJerk && t < tJerk + 1.4 ? Math.sin((t - tJerk) * 14) * (1 - (t - tJerk) / 1.4) : 0;
    let will = add(P.sit('dangle'), {
      pos: [WILL[0], WALL_TOP + 0.05 - cast.will.dim.leg + 0.08 - lean * 0.05, WILL[1] - lean * 0.12], yaw: 0.1, spine: { bend: lean * 0.55 - (t > tJerk ? 0.3 * (1 - ramp(t, tJerk + 0.6, tJerk + 1.6)) : 0), side: wobble * 0.3 },
      face: t < tQuiet ? 'neutral' : t < tBelow ? 'curious' : t < tMind ? 'curious' : t < tHow ? 'scared' : 'surprised',
      lookAt: t < tQuiet ? [0, 1, 40] : t < tJerk ? headPos(cast.halt) : t < tJerk + 1.4 ? [0, 2, 15] : [0, 0, 18],
    });
    if (wobble) will = add(will, { armL: { out: 1.4 + wobble, fwd: 0.4 }, armR: { out: 1.4 - wobble, fwd: 0.4 } });

    // the crowd shrinks back as he passes
    const back = ramp(t, tStep - 0.3, tStep + 0.8);
    const toRoad = (p) => faceTo(p, hw.pos);
    const crowd = (id, p, extra = {}) => add(P.stand(), { pos: p, yaw: t > tQuiet ? toRoad(p) : extra.yaw0 ?? 0, face: t > tQuiet ? 'worried' : 'neutral', lookAt: t > tQuiet ? headPos(cast.halt) : undefined, ...extra });
    const f1p = [-3.1 - back * 0.5, 0, 33.9], f2p = [-2.4 - back * 0.5, 0, 33.4];
    const farmer1 = crowd('farmer1', f1p, { face: t > tRanger - 0.5 ? 'scared' : 'neutral', lookAt: t > tRanger - 0.3 && t < tBelow ? headPos(cast.farmer2) : headPos(cast.halt) });
    const farmer2 = crowd('farmer2', f2p, { face: t > tWalk ? 'worried' : 'neutral', lookAt: t > tWalk - 0.3 && t < tBelow ? headPos(cast.farmer1) : headPos(cast.halt) });
    if (t > tStep && t < tStep + 1.6) Object.assign(farmer1, add(farmer1, { armR: { fwd: 1.3, bend: 1.6, out: -0.4 } })); // sign against bad luck
    const mp = [3.2 + back * 0.8, 0, 37.5];
    const mother = crowd('mother', mp, { armR: { fwd: back * 0.5, out: back * 0.6, bend: 0.4 } });
    const child = crowd('child', [mp[0] + 0.45 + back * 0.15, 0, mp[2] + 0.35 - back * 0.6], { face: t > tQuiet ? 'curious' : 'happy', lookAt: headPos(cast.halt) });
    const cook1 = crowd('cook1', [-6.2, 0, 39.4], { yaw0: Math.PI / 2, armL: { fwd: 0.9, bend: 1.2 }, armR: { fwd: 0.9, bend: 1.2 } });
    const clerk = crowd('clerk', [6.0, 0, 41.0], { yaw0: -Math.PI / 2, armR: { fwd: 0.6, bend: 0.4 } });

    // ---- camera ----
    const hh = () => headPos(cast.halt), wh = () => headPos(cast.will);
    const shots = [
      [0, () => blendShot({ pos: [14, 9, 56], target: [0, 6, 26], fov: 42 }, { pos: [9, 6, 48], target: [0, 6, 26], fov: 40 }, ramp(t, 0, tQuiet, 'sine'))],
      [tQuiet, () => drift({ pos: [1.6, 0.6, hw.pos[2] - 7], target: [hw.pos[0], 1.8, hw.pos[2]], fov: 34 }, t)],
      [tStep, () => drift({ pos: [mp[0] - 2.5, 1.3, mp[2] - 3.2], target: [mp[0], 1.0, mp[2]], fov: 36 }, t)],
      [tRanger, () => coverage(ctx, t, cast, { farmer1: 'farmer2', farmer2: 'farmer1' }) || twoShot(cast.farmer1, cast.farmer2)],
      [tShadow + 1.4, () => drift({ pos: [-4, 1.5, hw.pos[2] + 4], target: hh(), fov: 34 }, t)],
      [tBelow, () => drift({ pos: [4.0, 8.6, GATE_Z + 8.0], target: wh(), fov: 24 }, t)],
      [tBelow + 2.3, () => ({ pos: [1.2, 1.0, Math.max(hw.pos[2] + 8.5, GATE_Z + 9)], target: [0.2, 4.4, GATE_Z + 1.5], fov: 60 })],                       // Will's POV, down at the hood
      [tSpeak, () => drift({ pos: [hw.pos[0] + 0.3, 2.0, hw.pos[2] - 1.6], target: hh(), fov: 30 }, t, 0.02)],                // close on the hood, from below
      [tJerk, () => drift({ pos: [3.5, 9.5, GATE_Z + 5], target: wh(), fov: 34 }, t)],
      [tJerk + 1.8, () => ({ pos: [WILL[0] + 0.5, WALL_TOP + 3.2, WILL[1] - 2.6], target: [-1, 0.5, 15], fov: 42 })],                 // POV: nobody there
      [tHow, () => drift({ pos: [WILL[0] + 0.7, WALL_TOP + 1.0, WILL[1] + 1.7], target: wh(), fov: 32 }, t)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { will, halt, farmer1, farmer2, mother, child, cook1, clerk }, camera: cam };
  },
};
