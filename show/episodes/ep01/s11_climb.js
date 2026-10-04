// SCENE 11: The tower climb at night. Rooftops, the ivy, the near-fall, the guard below, the window.
import * as THREE from 'three';
import { toon, inked } from '../../lib/toon.js';
import { sky, moon, ground, clouds, motes, props, box } from '../../lib/kit.js';
import { P, add, ramp, key, walkPath, shotOn, drift, blendShot, headPos, clamp, lerp, speedLines, noise } from '../../lib/director.js';
import { buildRedmont, TOWER, HALL } from './redmont.js';
import { addIvy, ivyPoint, ivyAngle } from './ivy.js';

const WIN_Y = 24;

export default {
  cast: ['will', 'cadet4'],
  rim: '#9ab8ff', rimStrength: 0.6, bloom: 0.45, fill: 0.5, fillColor: '#7a8ad0', tint: [0.92, 0.96, 1.08],
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#0c1428', 50, 220);
    sky(S, { top: '#03071a', mid: '#0c1838', bottom: '#1e2c50', sunDir: [0, 0.4, 1], sunCol: '#c8d8ff', sunSize: 0, glow: 0.2, stars: 1.0 });
    moon(S, [20, 70, 140], 9);
    clouds(S, 8, 300, 60, '#5a6a98', 0.6, 3);
    const ml = new THREE.DirectionalLight('#9ab4f0', 1.0); ml.position.set(20, 45, 80); ml.target.position.set(TOWER.x, 10, TOWER.z); ml.castShadow = true;
    ml.shadow.mapSize.set(2048, 2048); ml.shadow.bias = -0.0005; ml.shadow.normalBias = 0.04;
    Object.assign(ml.shadow.camera, { left: -30, right: 30, top: 35, bottom: -10, near: 10, far: 200 });
    S.add(ml); S.add(ml.target);
    S.add(new THREE.HemisphereLight('#3a4a88', '#120e14', 0.6));
    ground(S, 400, '#2a3a2a');
    buildRedmont(S, { lit: true, flags: true, officeDark: true });
    const ivy = addIvy(S, TOWER, { top: WIN_Y });
    motes(S, [TOWER.x, 8, TOWER.z + 4], [16, 20, 10], { n: 60, color: '#a8c0ff', sz: 0.04, speed: 0.3 });
    // the shutter on the Baron's window, which Will eases open
    const hinge = new THREE.Group(); hinge.position.set(TOWER.x - 0.32, WIN_Y + 0.05, TOWER.z + TOWER.r * 1.0 + 0.08);
    const sh = box(0.62, 0.95, 0.05, toon('#4a3020'), 0.006); sh.position.set(0.31, 0.47, 0); hinge.add(sh); S.add(hinge);
    // guard's lantern
    const lantern = props.lantern(); cast.cadet4.attach('lantern', lantern, 'R');
    return { ivy, hinge };
  },

  frame({ t, ctx, cast, env }) {
    const A = (m) => ctx.act(m), L = (m) => ctx.line(m);
    const tBase = A('He reaches the base').s, tClimb = A('His fingers wedge').s, tGust = A('Halfway up').s, tRip = ctx.sfx('ivy_rip');
    const tScrab = A('His feet scrabble').s, tDont = L("Don't look down").s, tGuard = A('Far below, a GUARD').s, tLast = A('Will climbs the last stretch').s;
    const tLooksDown = tDont + 2.0;

    // ---- Will ----
    let will, hipY;
    const leg = cast.will.dim.leg;
    if (t < tBase) {
      // running along the great hall roof ridge, a shadow against the moon
      const rp = walkPath(t, [[HALL.x - 11.5, HALL.z + 4], [HALL.x - 0.5, HALL.z + 4]], -0.5, tBase, { stride: 1.0 });
      will = add(P.run(rp.phase, 1), { pos: [rp.pos[0], HALL.h + HALL.roofH - 0.05, rp.pos[2]], yaw: rp.yaw, face: 'determined' });
    } else {
      // climbing in surges up the ivy
      const surge = (t0, t1, y0, y1, n) => { const k = clamp((t - t0) / (t1 - t0)) * n; return lerp(y0, y1, (Math.floor(k) + ((k % 1) < 0.6 ? 0 : (k % 1 - 0.6) / 0.4)) / n); };
      if (t < tClimb) hipY = leg;
      else if (t < tGust) hipY = surge(tClimb, tGust, leg + 0.4, 12.2, 9);
      else if (t < tRip) hipY = surge(tGust, tRip, 12.2, 12.8, 1);
      else if (t < tLast) hipY = 12.8 - ramp(t, tRip, tRip + 0.3, 'out') * 0.35;
      else hipY = surge(tLast, ctx.dur - 0.3, 12.45, WIN_Y - 0.85, 7);
      const p = ivyPoint(TOWER, hipY, 0.2);
      const yaw = Math.PI + ivyAngle(hipY);
      const ph = t < tRip ? (t - tClimb) * 1.4 : (t - tLast) * 2.3;
      const swing = t > tRip && t < tScrab ? Math.sin((t - tRip) * 6) * (1 - (t - tRip) / (tScrab - tRip)) : 0;
      let pose;
      if (t < tClimb) pose = add(P.stand(), { head: { nod: -0.6 }, face: 'worried' });
      else if (t > tRip && t < tScrab + 0.5) pose = add(P.hang(t), { face: 'scared' });
      else if (t > tScrab && t < tLast) pose = add(P.climb(0.25), { face: t < tGuard ? 'scared' : 'worried', noIdle: true });
      else pose = add(P.climb(ph), { face: 'determined' });
      will = add(pose, { pos: [p[0] + swing * 0.5, hipY - leg + (t < tClimb ? 0 : 0), p[2] + Math.abs(swing) * 0.4], yaw, roll: swing * 0.5 });
      if (t > tLooksDown && t < tGuard + 3.3) will = add(will, { head: { nod: 0.9, turn: 0.35 }, lookAt: null });
      if (t > tScrab && t < tDont) will = add(will, { head: { nod: -0.1, tilt: 0.3 }, face: { lid: 0.7, browAng: 0.8, smile: -0.4 } });
    }
    // the torn ivy flaps away from the wall
    env.ivy.pivot.rotation.x = -ramp(t, tRip, tRip + 0.25, 'out') * 0.9 + (t > tRip ? Math.sin(t * 7) * 0.08 * (1 - ramp(t, tRip, tRip + 3)) : 0);
    // shutter eases open at the very end
    env.hinge.rotation.y = -ramp(t, ctx.dur - 1.2, ctx.dur - 0.1) * 1.4;

    // ---- the guard: walks his round below, stops under Will, yawns, looks about, moves on ----
    const g0 = [TOWER.x - 6, TOWER.z + 9], gStop = [TOWER.x + 0.6, TOWER.z + 6], g1 = [TOWER.x + 8, TOWER.z + 10];
    const gw = walkPath(t, [g0, gStop], tGuard - 1.5, tGuard + 1.0, { stride: 0.5 });
    const gw2 = walkPath(t, [gStop, g1], tGuard + 3.6, tGuard + 7, { stride: 0.5 });
    let guard;
    if (t < tGuard + 1.0) guard = add(P.walk(gw.phase, t > tGuard - 1.5 ? 1 : 0), { pos: gw.pos, yaw: gw.yaw, face: 'sleepy', lookAt: null });
    else if (t < tGuard + 3.6) {
      const k = t - tGuard - 1.0;
      guard = add(k < 1.0 ? { armL: { fwd: 2.6, bend: 1.0 }, spine: { bend: -0.15 } } : {}, { pos: [gStop[0], 0, gStop[1]], yaw: gw.yaw, face: k < 1.0 ? { eyes: 'closed', open: 0.8, mouthShape: '' } : 'sleepy',
        head: { turn: k > 1.2 && k < 2.6 ? Math.sin((k - 1.2) * 4.5) * 0.9 : 0 }, lookAt: null });
    } else guard = add(P.walk(gw2.phase, 1), { pos: gw2.pos, yaw: gw2.yaw, face: 'sleepy', lookAt: null });
    guard.visible = t > tGuard - 1.6;

    // ---- camera ----
    const wh = () => headPos(cast.will);
    const hand = () => { const v = new THREE.Vector3(); cast.will.arms.L.hand.getWorldPosition(v); return v.toArray(); };
    const shots = [
      [0, () => drift({ pos: [HALL.x - 4, HALL.h + 2.5, HALL.z + 16], target: [HALL.x - 5, HALL.h + HALL.roofH + 0.8, HALL.z + 4], fov: 44 }, t)],          // rooftop run against the moon
      [tBase, () => blendShot({ pos: [TOWER.x + 1.2, 0.3, TOWER.z + 6.5], target: [TOWER.x, 20, TOWER.z], fov: 55 }, { pos: [TOWER.x + 1.4, 0.4, TOWER.z + 7.2], target: [TOWER.x, 24, TOWER.z], fov: 50 }, ramp(t, tBase, tClimb))], // vertigo up-shot
      [tClimb, () => { const h = hand(); return { pos: [h[0] + 0.45, h[1] + 0.1, h[2] + 0.55], target: h, fov: 34 }; }],          // fingers in the cracks
      [tClimb + 2.2, () => { const h = wh(); return drift({ pos: [h[0] + 2.4, h[1] + 0.4, h[2] + 3.0], target: h, fov: 38 }, t); }],
      [tGust, () => { const h = wh(); return drift({ pos: [h[0] - 1.8, h[1] - 1.5, h[2] + 2.6], target: h, fov: 36 }, t, 0.08); }],
      [tRip - 0.2, () => { const h = wh(); return { pos: [h[0] + 1.1, h[1] + 0.2, h[2] + 1.6], target: h, fov: 40 }; }],
      [tScrab, () => { const h = wh(); return drift({ pos: [h[0] + 0.55, h[1] + 0.05, h[2] + 0.7], target: h, fov: 30 }, t, 0.01); }],        // face pressed to the stone
      [tLooksDown, () => { const h = wh(); return { pos: [h[0] + 0.15, h[1] - 0.1, h[2] + 0.3], target: [TOWER.x + 1, 0, TOWER.z + 7], fov: 62 }; }],  // looking down: oh no
      [tGuard, () => { const h = wh(); return { pos: [h[0] + 0.2, h[1] - 0.3, h[2] + 0.45], target: headPos(cast.cadet4), fov: 30 }; }],
      [tGuard + 1.6, () => drift({ pos: [gStop[0] + 2.2, 0.6, gStop[1] + 4.2], target: [TOWER.x, 5.0, TOWER.z + 4], fov: 58 }, t)],                // guard below, Will a speck above
      [tLast, () => { const h = wh(); return drift({ pos: [h[0] + 2.0, h[1] - 0.6, h[2] + 3.4], target: [h[0], h[1] + 0.6, h[2]], fov: 40 }, t); }],
      [ctx.dur - 1.4, () => ({ pos: [TOWER.x + 1.2, WIN_Y + 0.6, TOWER.z + TOWER.r + 2.0], target: [TOWER.x, WIN_Y + 0.3, TOWER.z + TOWER.r], fov: 38 })],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    const overlay = (g, W, H) => speedLines(g, W, H, t, clamp(1 - Math.abs(t - tRip - 0.2) / 0.5), 0.5, 0.5);
    return { poses: { will, cadet4: guard }, camera: cam, overlay };
  },
};
