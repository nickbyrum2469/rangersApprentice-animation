// SCENE 10: The castle walls at sunset. Everyone has somewhere to belong except Will.
// He looks up at the Baron's tower and makes a decision.
import * as THREE from 'three';
import { toon, inked } from '../../lib/toon.js';
import { sky, ground, clouds, motes, props } from '../../lib/kit.js';
import { P, add, ramp, walkPath, shotOn, twoShot, drift, blendShot, headPos, clamp, lerp } from '../../lib/director.js';
import { buildRedmont, TOWER } from './redmont.js';
import { addIvy } from './ivy.js';

const WALL_TOP = 9.0;
const WILL = [23.8, -7.5]; // inner edge of the east curtain wall, between two merlons; sees the tower clearly

export default {
  cast: ['will', 'horace', 'cadet1', 'jenny', 'alyss', 'pauline'],
  rim: '#ff9a6a', rimStrength: 0.6, bloom: 0.55,
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#d08a78', 60, 260);
    sky(S, { top: '#3a3a80', mid: '#f08a6a', bottom: '#ffc080', sunDir: [-1, 0.04, 0.35], sunCol: '#ffc070', sunSize: 1.8, glow: 1.1, stars: 0.2 });
    clouds(S, 12, 300, 50, '#ffa890', 0.8, 6);
    const sun = new THREE.DirectionalLight('#ffa060', 1.4); sun.position.set(-80, 10, 28); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
    S.add(sun);
    S.add(new THREE.HemisphereLight('#b8a0d0', '#5a4030', 0.8));
    ground(S, 400, '#7a8a50');
    buildRedmont(S, { lit: true });
    addIvy(S, TOWER, { top: 24 });
    motes(S, [0, 1, 0], [40, 6, 40], { n: 120, color: '#ffd8a0', sz: 0.06, speed: 0.12 });
    cast.jenny.attach('tray', (() => { const g = new THREE.Group(); const t = inked(new THREE.BoxGeometry(0.5, 0.03, 0.35), toon('#9a7a52'), 0.004); g.add(t); for (let i = 0; i < 3; i++) { const c = props.cake(); c.position.set(-0.15 + i * 0.15, 0.03, 0); g.add(c); } return g; })(), 'R').position.set(0, 0.02, 0.15);
    return {};
  },

  frame({ t, ctx, cast }) {
    const A = (m) => ctx.act(m), L = (m) => ctx.line(m);
    const tNarr = L('By evening').s, tFarm = L('The farm').s, tLook = A('He looks up at the tallest tower').s, tWrite = L('What did you write').s, tStudy = A('He studies the tower').s, tBest = L('Best climber').s;

    // Will: alone on the wall, legs dangling over the drop
    let will = add(P.sit('dangle'), { pos: [WILL[0] - 0.1, WALL_TOP + 0.02 - cast.will.dim.leg + 0.1, WILL[1]], yaw: -Math.PI / 2, idleAmt: 0.4,
      face: t < tFarm ? 'sad' : t < tLook ? 'angry' : t < tStudy ? 'curious' : 'determined', armL: { fwd: 0.4, out: 0.3, bend: 0.4 }, armR: { fwd: 0.4, out: 0.3, bend: 0.4 } });
    if (t < tLook) will.lookAt = t < tFarm ? [12, 0.8, 2] : [10, 3, 0];
    else will.lookAt = [TOWER.x, t < tStudy ? 24 : 14 + Math.sin(t * 0.8) * 8, TOWER.z];
    // the others, living their new lives in the courtyard below
    const horace = add(P.handsOnHips(), { pos: [12, 0, 2], yaw: 0.6, face: 'grin', lookAt: headPos(cast.cadet1) });
    const cadet1 = add({ armL: { fwd: 1.2, bend: 1.2 }, armR: { fwd: 1.2, bend: 1.2 } }, { pos: [12.7, 0, 2.6], yaw: -2.4, face: 'happy', lookAt: headPos(cast.horace) });
    const jw = walkPath(t % 10, [[8, 14], [13, 6]], 0, 10, { stride: 0.5 });
    const jenny = add(P.walk(jw.phase * 1.3, 1), { pos: jw.pos, yaw: jw.yaw, face: 'happy', armR: { fwd: 1.4, bend: 1.5 } });
    const pw = walkPath(t, [[14, -4], [11, -1], [8, 3]], 0, ctx.dur, { stride: 0.5 });
    const pauline = add(P.walk(pw.phase, 0.7), P.handsBehind(), { pos: pw.pos, yaw: pw.yaw, face: 'neutral' });
    const alyss = add(P.walk(pw.phase, 0.7), P.handsBehind(), { pos: [pw.pos[0] + 0.7, 0, pw.pos[2] + 0.4], yaw: pw.yaw, face: 'happy', lookAt: headPos(cast.pauline) });

    const wh = () => headPos(cast.will);
    const shots = [
      [0, () => blendShot({ pos: [12, 1.6, -2], target: [WILL[0], WALL_TOP + 1.2, WILL[1]], fov: 40 }, { pos: [16, 4, -5], target: wh(), fov: 34 }, ramp(t, 0, tNarr, 'sine'))],
      [tNarr - 1.5, () => drift({ pos: [WILL[0] + 1.6, WALL_TOP + 2.4, WILL[1] - 1.4], target: [12, 0.8, 2], fov: 40 }, t)],   // over Will's shoulder, down into the courtyard
      [tNarr + 2.4, () => drift({ pos: [9, 1.5, 6], target: [12, 1.2, 2], fov: 38 }, t)],
      [tFarm, () => drift(shotOn(cast.will, { angle: -0.4, dist: 1.0, fov: 30 }), t)],
      [tLook, () => blendShot({ pos: [WILL[0] + 0.6, WALL_TOP + 1.3, WILL[1] + 0.5], target: [TOWER.x, 10, TOWER.z], fov: 32 }, { pos: [WILL[0] + 0.6, WALL_TOP + 1.3, WILL[1] + 0.5], target: [TOWER.x, 24, TOWER.z], fov: 22 }, ramp(t, tLook, tWrite, 'sine'))],
      [tWrite, () => drift(shotOn(cast.will, { angle: 0.3, dist: 0.85, fov: 28 }), t)],
      [tStudy, () => blendShot({ pos: [TOWER.x + 3, 2, TOWER.z + 10], target: [TOWER.x, 4, TOWER.z + 3], fov: 40 }, { pos: [TOWER.x + 3, 10, TOWER.z + 10], target: [TOWER.x, 22, TOWER.z + 3], fov: 40 }, ramp(t, tStudy, tBest, 'sine'))],
      [tBest, () => drift(shotOn(cast.will, { angle: 0.1, dist: 0.7, fov: 28 }), t, 0.01)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { will, horace, cadet1, jenny, alyss, pauline }, camera: cam };
  },
};
