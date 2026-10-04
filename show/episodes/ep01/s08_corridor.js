// SCENE 8: Outside the Baron's office, Choosing Day morning. Five nervous wards on a bench.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, bench, windowMesh, door, banner, motes, lightShaft } from '../../lib/kit.js';
import { P, add, ramp, walkPath, shotOn, twoShot, drift, blendShot, headPos, coverage, clamp, lerp, noise } from '../../lib/director.js';

const SEAT = 0.45;
// left → right on the bench
const BENCH = { jenny: -1.9, george: -1.0, alyss: 0.0, horace: 1.05, will: 2.0 };
const BZ = -1.3;

export default {
  cast: ['jenny', 'george', 'alyss', 'horace', 'will', 'clerk'],
  rim: '#fff2d8', rimStrength: 0.5, bloom: 0.4,
  build({ S, scene, cast }) {
    scene.background = new THREE.Color('#2a2420');
    scene.fog = new THREE.Fog('#4a3e34', 16, 34);
    room(S, { w: 16, d: 5, h: 5, wallBase: '#b0a088', floor: 'flag', open: ['front'], beams: false });
    // vaulted ceiling ribs
    for (let x = -7; x <= 7; x += 2.8) { const r = inked(new THREE.TorusGeometry(2.5, 0.12, 6, 16, Math.PI), toon('#8a7a64'), 0.01); r.position.set(x, 2.6, 0); r.rotation.y = Math.PI / 2; S.add(r); }
    // tall windows on the back wall with morning light
    for (const x of [-5.5, 5.5]) { const w = windowMesh(1.1, 2.4, true, '#fff4d8'); w.position.set(x, 1.5, -2.28); S.add(w); }
    lightShaft(S, [-5.5, 3.3, -2.2], [-3.5, 0, 1.4], 1.4, '#fff0c8', 0.1);
    lightShaft(S, [5.5, 3.3, -2.2], [7, 0, 1.4], 1.4, '#fff0c8', 0.1);
    const b = bench(5.2); b.position.set(0, 0, BZ - 0.05); S.add(b);
    // the heavy oak door to the Baron's office, with banners either side
    const d = door(1.8, 3.2, '#5a3a20'); d.position.set(-4.2, 0, -2.28); S.add(d);
    for (const x of [-6.0, -2.4]) { const bn = banner(0.9, 2.4); bn.position.set(x, 4.2, -2.25); S.add(bn); }
    const sun = new THREE.DirectionalLight('#fff0d6', 1.2); sun.position.set(-3, 6, -10); sun.target.position.set(0, 0, 2); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -3 });
    S.add(sun); S.add(sun.target);
    S.add(new THREE.HemisphereLight('#ffe8c8', '#4a3a2a', 0.8));
    motes(S, [0, 0.3, 0], [14, 3.5, 4], { n: 120, color: '#fff6dc', sz: 0.03, speed: 0.1 });
    return { door: d };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m) => ctx.line(m), A = (m) => ctx.act(m);
    const tJenny = L("didn't eat").s, tGeorge = L("You're not dying").s, tAlyss = L('George.').s, tSorry = L('Sorry.').s;
    const tDoor = A('The door opens').s, tClerk = L('The wards of Redmont').s, tStand = A('They stand').s;

    const stand = ramp(t, tStand, tStand + 0.6);
    const sitPose = (id, extra = {}) => {
      const c = cast[id];
      const base = add(P.sit('down'), { pos: [BENCH[id], lerp(SEAT - c.dim.leg + 0.08, 0, stand), BZ + 0.05], yaw: 0 });
      return add(stand > 0.5 ? P.stand() : base, { pos: [BENCH[id], lerp(SEAT - c.dim.leg + 0.08, 0, stand), BZ + 0.05 + stand * 0.25], yaw: 0, ...extra });
    };
    // each ward fidgets in their own way
    const jenny = add(sitPose('jenny'), { hipY: Math.abs(Math.sin(t * 7)) * 0.02 * (1 - stand), face: t < tJenny + 0.5 ? 'worried' : t < tGeorge ? 'scared' : 'worried' }, t < tGeorge ? { armL: { fwd: 0.9, bend: 1.9, out: -0.3 } } : {});
    const george = add(sitPose('george'), t > tGeorge - 0.2 && t < tSorry ? P.chin('R') : {}, { face: t < tAlyss ? 'curious' : 'embarrassed' });
    const alyss = add(sitPose('alyss'), { face: t > tAlyss - 0.2 && t < tSorry + 0.8 ? 'stern' : 'neutral', armL: { fwd: 0.6, bend: 1.0, out: -0.2 }, armR: { fwd: 0.6, bend: 1.0, out: -0.2 }, idleAmt: 0.3 });
    const horace = add(sitPose('horace'), { face: t > tStand ? 'determined' : 'smirk' }, stand < 0.5 ? { armL: { out: 0.5, fwd: 0.1 }, armR: { out: 0.5, fwd: 0.1 }, spine: { bend: -0.12 } } : {});
    const will = add(sitPose('will'), { face: t > tStand + 0.8 ? 'determined' : 'worried', legL: { bend: 1.55 + Math.max(0, Math.sin(t * 13)) * 0.18 * (1 - stand) } });
    // Will and Horace share a look as they stand
    if (t > tStand + 0.3) { will.lookAt = headPos(cast.horace); horace.lookAt = headPos(cast.will); }
    if (t > tStand + 1.4 && t < tStand + 2.0) { horace.head = { nod: 0.25 }; will.head = { nod: 0.25 }; }
    // the clerk opens the door
    const open = ramp(t, tDoor, tDoor + 0.8);
    env.door.rotation.y = -open * 1.4;
    const clerk = { pos: [-4.2 + open * 0.2, 0, -2.0 + open * 0.9], yaw: 0.6, face: 'neutral', visible: t > tDoor + 0.3, armR: { fwd: 0.5, bend: 1.2 } };

    const shots = [
      [0, () => blendShot({ pos: [0, 1.3, 6.5], target: [0, 1.0, BZ], fov: 40 }, { pos: [0, 1.2, 4.8], target: [0, 1.0, BZ], fov: 40 }, ramp(t, 0, tJenny, 'sine'))],
      [tJenny, () => coverage(ctx, t, cast, { jenny: 'george', george: 'jenny', alyss: 'george', clerk: 'will' }, { startWide: false, sideBySide: true }) || shotOn(cast.jenny, {})],
      [tSorry + 0.3, () => drift({ pos: [3.4, 1.15, 2.2], target: headPos(cast.will), fov: 36 }, t)],     // Will's bouncing knee, Horace beside him
      [tDoor, () => drift({ pos: [0.5, 1.6, 3.5], target: [-4.0, 1.6, -2.0], fov: 38 }, t)],
      [tClerk + 0.2, () => drift(shotOn(cast.clerk, { angle: 0.5, dist: 1.4, fov: 32 }), t)],
      [tStand, () => drift(blendShot({ pos: [1.5, 1.4, 2.6], target: [1.5, 1.35, BZ], fov: 34 }, { pos: [1.5, 1.6, 2.0], target: [1.5, 1.55, BZ], fov: 30 }, ramp(t, tStand, ctx.dur)), t)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { jenny, george, alyss, horace, will, clerk }, camera: cam };
  },
};
