// SCENE 4: The training yard. Rodney drills the cadets; Horace watches hungrily; Will and Horace
// spar with sticks; Will dodges everything until he slips and gets shoved into the horse trough.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { sky, ground, box, fence, trough, barrel, wall, tower, props, motes, rand, clouds, house } from '../../lib/kit.js';
import { P, add, ramp, key, walkPath, faceTo, shotOn, twoShot, overShoulder, drift, blendShot, headPos, coverage, lerp, clamp, speedLines, flash, mix } from '../../lib/director.js';

const TROUGH = [5.7, 9.8];
const CADETS = [['cadet1', -3, -4.2], ['cadet2', 0, -4.2], ['cadet3', 3, -4.2], ['cadet4', -3, -2.2], ['cadet2b', 0, -2.2], ['cadet1b', 3, -2.2]];

export default {
  cast: ['will', 'horace', 'rodney', 'cadet1', 'cadet2', 'cadet3', 'cadet4'],
  rim: '#fff4dc', rimStrength: 0.5, bloom: 0.3,
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#d8e6f0', 40, 160);
    sky(S, { top: '#3a78cc', mid: '#9ccbee', bottom: '#eaf2f6', sunDir: [0.4, 0.75, 0.5], sunCol: '#fff6dc', sunSize: 0.5, glow: 0.35 });
    clouds(S, 10, 200, 60, '#ffffff', 0.9, 8);
    const sun = new THREE.DirectionalLight('#fff3dc', 1.55);
    sun.position.set(10, 16, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16 });
    S.add(sun);
    S.add(new THREE.HemisphereLight('#dcecff', '#a08a60', 0.95));
    ground(S, 120, '#ffffff', tex.dirt('#c2a77a', 44));
    // fence around the yard (front side has a gap Horace leans next to)
    const f1 = fence(24); f1.position.set(0, 0, 6); S.add(f1);
    const f2 = fence(24); f2.position.set(0, 0, -10); S.add(f2);
    const f3 = fence(16); f3.position.set(-12, 0, -2); f3.rotation.y = Math.PI / 2; S.add(f3);
    const f4 = fence(16); f4.position.set(12, 0, -2); f4.rotation.y = Math.PI / 2; S.add(f4);
    // weapon racks and straw practice dummies
    for (let i = 0; i < 3; i++) {
      const post = box(0.16, 1.8, 0.16, toon('#6a4a2a')); post.position.set(-9 + i * 2.2, 0.9, -8); S.add(post);
      const sack = inked(new THREE.CapsuleGeometry(0.28, 0.5, 4, 10), toon('#d8b878'), 0.012); sack.position.set(-9 + i * 2.2, 1.5, -8); S.add(sack);
    }
    const rack = box(3, 0.1, 0.3, toon('#5a3a22')); rack.position.set(8, 1.2, -9.5); S.add(rack);
    for (let i = 0; i < 6; i++) { const sw = props.sword(1.0); sw.position.set(6.8 + i * 0.45, 0.2, -9.4); sw.rotation.z = 0.1; S.add(sw); }
    const tr = trough(2.4); tr.position.set(TROUGH[0], 0, TROUGH[1]); S.add(tr);
    const b = barrel(); b.position.set(7.6, 0, 9.4); S.add(b);
    // castle walls & barracks behind
    const w = wall(60, 9, 2, { base: '#b3a68e' }); w.position.set(0, 0, -16); S.add(w);
    for (const x of [-24, 24]) { const t = tower(3.2, 14, { base: '#b3a68e' }); t.position.set(x, 0, -16); S.add(t); }
    // the rest of the castle enclosing the yard
    for (const [x, z, ry, len] of [[-26, 10, Math.PI / 2, 52], [26, 10, Math.PI / 2, 52], [0, 34, 0, 52]]) { const ww = wall(len, 9, 2, { base: '#b3a68e' }); ww.position.set(x, 0, z); ww.rotation.y = ry; S.add(ww); }
    for (const [x, z] of [[-26, 34], [26, 34]]) { const t = tower(3.2, 14, { base: '#b3a68e' }); t.position.set(x, 0, z); S.add(t); }
    const keep = box(16, 20, 12, toon('#b3a68e', { map: tex.stone('#b3a68e', 45) })); keep.position.set(-14, 10, 22); S.add(keep);
    for (let i = 0; i < 4; i++) { const hs = house(5, 4, 3.4, 50 + i); hs.position.set(14 + (i % 2) * 6, 0, 18 + Math.floor(i / 2) * 6); S.add(hs); }
    const bar = house(14, 6, 4.5, 41); bar.position.set(-6, 0, -12.5); bar.rotation.y = Math.PI; S.add(bar);
    motes(S, [0, 0.2, 2], [22, 1.6, 16], { n: 200, color: '#fff2d0', sz: 0.04, speed: 0.15 });

    for (const id of ['cadet1', 'cadet2', 'cadet3', 'cadet4']) {
      cast[id].attach('sword', props.sword(0.75), 'R').rotation.set(-1.4, 0, 0);
      const sh = inked(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), toon('#8a5a3a'), 0.006); sh.rotation.z = Math.PI / 2; cast[id].attach('shield', sh, 'L').position.set(0.05, -0.05, 0);
    }
    const hStick = props.stick(1.0); cast.horace.attach('stick', hStick, 'R').rotation.set(-1.3, 0, 0);
    const wStick = props.stick(0.9); cast.will.attach('stick', wStick, 'R').rotation.set(-1.3, 0, 0);
    const flying = props.stick(0.9); S.add(flying);
    const slate = box(0.3, 0.22, 0.02, toon('#3a3a42'), 0.004); cast.rodney.attach('slate', slate, 'L').position.set(0, -0.05, 0.08);

    // water splash: ballistic droplets, plus drips off Will afterwards
    const n = 160, r = rand(5), vel = [];
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, s = 1 + r() * 2.5; vel.push([Math.cos(a) * s * 0.8, 2.5 + r() * 3.5, Math.sin(a) * s * 0.8]); }
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const drops = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#cfe8ff', size: 0.07, transparent: true, opacity: 0.9 }));
    S.add(drops);
    const st = { t0: 1e9 };
    S.onUpdate((t) => {
      const dt = t - st.t0;
      drops.visible = dt > 0 && dt < 1.6;
      for (let i = 0; i < n; i++) {
        const y = 0.6 + vel[i][1] * dt - 4.9 * dt * dt;
        pos.set([TROUGH[0] + vel[i][0] * dt, Math.max(-1, y), TROUGH[1] + vel[i][2] * dt], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
    });
    return { st, wStick, hStick, flying, water: tr.userData.water };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m) => ctx.line(m), A = (m) => ctx.act(m);
    const tShield = L('Shields UP').s, tLean = A('Leaning on the fence').s, tWalk = A('Will walks up').s, tBack = L('doing it backwards').s;
    const tTurn = A('Horace turns').s, tToss = L("And you'd know").s, tRod = A("The other cadets haven't").s, tSquare = A('square off').s;
    const tAtk = A('Horace attacks').s, tDead = L('Dead.').s, tRed = A('Horace goes red').s, tShove = A('Horace shoves').s, tSplash = ctx.sfx('big_splash');
    const tLaugh = A('A couple of cadets laugh').s, tDiff = L("That's the difference").s, tWalkOff = A('He drops his stick').s, tSlate = A('Sir Rodney writes').s;
    env.st.t0 = tSplash;

    // ---- cadets drilling in rows (block, then cut), laughing after the splash ----
    const poses = {};
    const ids = ['cadet1', 'cadet2', 'cadet3', 'cadet4'];
    ids.forEach((id, i) => {
      const [, x, z] = CADETS[i];
      const beat = ((t + 0.05 * i) % 1.6) / 1.6;
      const drill = beat < 0.5 ? add(P.guard(t, 1), { armL: { fwd: 1.3, bend: 1.5, out: -0.2 } }) : P.swing(ramp(beat, 0.5, 0.75, 'in'));
      const laughing = t > tLaugh && t < tLaugh + 3.5;
      poses[id] = add(laughing ? { spine: { bend: -0.1 + Math.sin(t * 14) * 0.04 }, armL: { fwd: 0.3 } } : drill, {
        pos: [x, 0, z], yaw: laughing ? faceTo([x, 0, z], [TROUGH[0], 0, TROUGH[1]]) : 0.12,
        face: laughing ? 'laugh' : 'determined', lookAt: laughing ? headPos(cast.will) : null, gesture: 0,
      });
    });

    // ---- Rodney: paces and barks; later watches; finally writes on his slate ----
    let rod;
    if (t < tRod) {
      const pace = Math.sin(t * 0.35) * 2;
      rod = add(t > tShield - 0.2 && t < tShield + 3.6 ? P.point('R', 0.2) : P.handsBehind(), { pos: [-7 + pace * 0.3, 0, -3.2 + pace], yaw: Math.PI / 2, face: t < tShield + 3.6 ? 'angry' : 'stern', lookAt: [0, 1.4, -3] });
    } else if (t < tSlate) {
      rod = add(P.armsCrossed(), { pos: [-7.5, 0, 3.0], yaw: 0.9, face: 'stern', lookAt: headPos(cast.horace) });
    } else {
      const shake = t > tSlate + 2.4 ? Math.sin(t * 9) * 0.25 * (1 - ramp(t, tSlate + 3.2, tSlate + 3.8)) : 0;
      rod = add({ armL: { fwd: 0.9, bend: 1.3 }, armR: { fwd: 0.9, bend: 1.5 + Math.sin(t * 10) * 0.08 } }, { pos: [-7.5, 0, 3.0], yaw: 0.9, face: 'stern', head: { turn: shake }, lookAt: t > tSlate + 1.4 ? headPos(cast.will) : [-7.3, 1.0, 3.4] });
    }

    // ---- Horace & Will ----
    const H0 = [1.5, 6.7], W0 = [0.5, 6.85];
    let hor, will;
    const hSq = [2.6, 8.1], wSq = [0.4, 8.1];
    const wPath = walkPath(t, [[8, 10.5], [3.5, 8.0], W0], tWalk - 0.2, tBack, { stride: 0.5 });
    if (t < tTurn) {
      // Horace copies the drill over the fence
      const beat = (t % 1.6) / 1.6;
      hor = add(beat < 0.5 ? P.guard(t, 0.8) : P.swing(ramp(beat, 0.5, 0.75, 'in')), { pos: [H0[0], 0, H0[1]], yaw: Math.PI, face: 'determined', lookAt: t < tWalk ? [0, 1.3, -3] : undefined });
      if (t > tBack) hor = add(P.armsCrossed(), { pos: [H0[0], 0, H0[1]], yaw: Math.PI, face: 'stern', lookAt: [0, 1.3, -3] });
      will = t < tBack ? add(P.walk(wPath.phase, 1), P.eat(t), { pos: wPath.pos, yaw: wPath.yaw, face: 'happy' }) : add(P.handsBehind(), { pos: [W0[0], 0, W0[1]], yaw: Math.PI, face: 'smirk', lookAt: headPos(cast.horace) });
    } else if (t < tSquare) {
      const k = ramp(t, tTurn, tTurn + 0.8);
      hor = add(t > tToss + 1.6 && t < tToss + 2.3 ? P.swing(0.3) : P.handsOnHips(), { pos: [H0[0], 0, H0[1]], yaw: lerp(Math.PI, -Math.PI / 2 - 0.4, k), face: t < tToss ? 'smirk' : 'proud', lookAt: headPos(cast.will) });
      will = add(t > tToss + 2.4 ? P.guard(t, 0.4) : P.handsBehind(), { pos: [W0[0], 0, W0[1]], yaw: Math.PI / 2 + 0.3, face: t < tToss + 2.4 ? 'surprised' : 'grin', lookAt: headPos(cast.horace) });
    } else if (t < tShove) {
      // the duel
      const tt = t - tAtk;
      const wPos = t < tAtk ? wSq : key(tt, [[0, wSq], [1.2, [0.5, 8.6]], [2.0, [0.9, 8.9]], [2.8, [2.0, 8.3], 'out'], [3.3, [3.5, 8.0], 'out'], [tRed - tAtk, [3.5, 8.0]], [tRed - tAtk + 1.2, [4.3, 8.7]], [tRed - tAtk + 2.4, [4.6, 9.2]], [tShove - tAtk, [4.7, 9.3]]]);
      const hPos = t < tAtk ? hSq : key(tt, [[0, hSq], [2.8, [2.3, 8.1]], [tRed - tAtk, [2.4, 8.2]], [tShove - tAtk, [3.8, 8.9]]]);
      const swingPh = (tt * (t > tRed ? 1.5 : 1.1)) % 1;
      const ducking = tt > 0.3 && tt < 1.1 || (tt > 2.2 && tt < 3.0);
      hor = add(t < tAtk ? P.guard(t) : P.swing(clamp(swingPh * 1.6)), { pos: [hPos[0], 0, hPos[1]], yaw: faceTo([hPos[0], 0, hPos[1]], [wPos[0], 0, wPos[1]]), face: t > tRed ? 'angry' : 'determined', lookAt: headPos(cast.will) });
      will = add(ducking ? P.crouch() : P.guard(t, 1), { pos: [wPos[0], 0, wPos[1]], yaw: faceTo([wPos[0], 0, wPos[1]], [hPos[0], 0, hPos[1]]), face: t > tDead - 0.3 ? 'grin' : 'determined', lookAt: headPos(cast.horace) });
      if (t > tDead - 0.6 && t < tDead + 0.4) will = add(will, P.point('R', -0.4));
      if (t > tShove - 0.5) will = add(will, P.fall(ramp(t, tShove - 0.5, tShove)), { face: 'surprised' });
    } else {
      const fly = ramp(t, tShove + 0.1, tSplash, 'linear');
      const wp = [lerp(4.7, TROUGH[0], fly), Math.sin(fly * Math.PI) * 0.8 + (fly >= 1 ? 0.15 : 0), lerp(9.3, TROUGH[1], fly)];
      const inTrough = t >= tSplash;
      will = inTrough
        ? add(P.sit('dangle'), { pos: [TROUGH[0], 0.12 - cast.will.dim.leg + 0.25 + ramp(t, tLaugh, tLaugh + 0.6) * 0.15, TROUGH[1]], yaw: -2.5, face: t < tLaugh + 0.3 ? 'surprised' : 'angry', armL: { fwd: 0.4, out: 0.5 }, armR: { fwd: 0.4, out: 0.5 }, lookAt: headPos(cast.horace) })
        : add(P.fall(1), { pos: [wp[0], wp[1], wp[2]], yaw: -2.5, pitch: -fly * 0.8, face: 'scared' });
      const hw = walkPath(t, [[3.9, 8.9], [2.0, 7.4], [0.8, 6.75]], tWalkOff, tWalkOff + 2.6, { stride: 0.55 });
      if (t < tWalkOff) hor = add(t < tShove + 0.5 ? P.shove(1 - ramp(t, tShove + 0.2, tShove + 0.5)) : P.stand(), { pos: [3.9, 0, 8.9], yaw: faceTo([3.9, 0, 8.9], [TROUGH[0], 0, TROUGH[1]]), face: t < tDiff + 6 ? 'proud' : 'worried', lookAt: headPos(cast.will) });
      else if (t < tWalkOff + 2.6) hor = add(P.walk(hw.phase, 1), { pos: hw.pos, yaw: hw.yaw, face: 'neutral' });
      else hor = add({ armL: { fwd: 0.6, bend: 0.4 }, armR: { fwd: 0.6, bend: 0.4 }, spine: { bend: 0.15 } }, { pos: [0.8, 0, 6.75], yaw: Math.PI, face: 'sad', lookAt: [0, 1.4, -3] });
    }
    // stick props
    const stickGone = t > tShove - 0.1;
    env.wStick.visible = t > tToss + 2.4 && !stickGone;
    env.hStick.visible = t > tLean - 0.5 && t < tWalkOff + 0.3;
    env.flying.visible = stickGone && t < tShove + 1.2;
    const fk = clamp((t - tShove + 0.1) / 1.2);
    env.flying.position.set(4.6 + fk * 2.5, 1.2 + Math.sin(fk * Math.PI) * 2.2 - fk * 1.1, 9.0 - fk * 1.5);
    env.flying.rotation.set(fk * 18, fk * 6, 0);
    env.water.position.y = 0.62 + (t > tSplash && t < tSplash + 2 ? Math.sin((t - tSplash) * 20) * 0.03 * (1 - (t - tSplash) / 2) : 0);

    poses.rodney = rod; poses.horace = hor; poses.will = will;

    // ---- camera ----
    const hh = () => headPos(cast.horace), wh = () => headPos(cast.will), rh = () => headPos(cast.rodney);
    const shots = [
      [0, () => blendShot({ pos: [10, 9, 16], target: [0, 1, -3], fov: 40 }, { pos: [5, 4.5, 10], target: [-1, 1.2, -3], fov: 40 }, ramp(t, 0, tShield, 'sine'))],
      [tShield, () => drift(shotOn(cast.rodney, { angle: 0.5, dist: 1.4, fov: 30 }), t)],
      [tLean, () => blendShot({ pos: [1.2, 1.3, 1.5], target: hh(), fov: 34 }, { pos: [1.5, 1.45, 4.6], target: hh(), fov: 30 }, ramp(t, tLean, tWalk, 'sine'))],
      [tWalk, () => drift(twoShot(cast.horace, cast.will, { fov: 36, dist: 3.2, side: -1 }), t)],
      [tBack, () => coverage(ctx, t, cast, { will: 'horace', horace: 'will' }, { startWide: false }) || twoShot(cast.horace, cast.will)],
      [tTurn, () => ({ pos: [W0[0] - 0.4, 0.7, W0[1] + 1.2], target: hh(), fov: 34 })],  // low angle: Horace towers over Will
      [tToss, () => coverage(ctx, t, cast, { will: 'horace', horace: 'will' }, { startWide: false }) || twoShot(cast.horace, cast.will)],
      [tRod, () => drift(shotOn(cast.rodney, { angle: 0.2, dist: 0.9, fov: 28 }), t, 0.015)],
      [tSquare, () => ({ pos: [1.5, 0.25, 11.5], target: [1.5, 1.0, 8.1], fov: 42 })],                // anime standoff, low and wide
      [tAtk, () => drift({ pos: [1.4, 1.6, 12], target: [1.6, 0.9, 8.3], fov: 40 }, t, 0.06)],
      [tAtk + 2.6, () => ({ pos: [4.5, 0.5, 6.8], target: wh(), fov: 38 })],
      [tDead - 0.5, () => drift(shotOn(cast.will, { angle: 0.6, dist: 1.0 }), t)],
      [tRed, () => drift(shotOn(cast.horace, { angle: -0.4, dist: 1.1, fov: 32 }), t)],
      [tRed + 1.2, () => drift({ pos: [3.0, 1.4, 12.5], target: [4.2, 0.9, 8.8], fov: 40 }, t, 0.06)],
      [tShove, () => ({ pos: [8.6, 2.2, 6.6], target: [5.0, 0.9, 9.3], fov: 44 })],
      [tSplash + 0.6, () => drift({ pos: [8.4, 1.9, 7.4], target: wh(), fov: 36 }, t)],
      [tLaugh, () => drift({ pos: [1, 1.8, -0.5], target: [0, 1.3, -3.4], fov: 40 }, t)],
      [tLaugh + 1.4, () => drift(shotOn(cast.will, { angle: 0.3, dist: 1.0, fov: 30 }), t)],
      [tDiff, () => ({ pos: [TROUGH[0] + 0.5, 0.75, TROUGH[1] + 0.6], target: hh(), fov: 34 })],          // Will's POV, looking up
      [tDiff + 3.8, () => drift(shotOn(cast.horace, { angle: 0.3, dist: 0.9, fov: 30 }), t)],
      [tWalkOff, () => drift({ pos: [3, 1.8, 11], target: hh(), fov: 38 }, t)],
      [tWalkOff + 2.8, () => drift(shotOn(cast.horace, { angle: 0.9, dist: 0.8, fov: 28 }), t, 0.01)],
      [tSlate, () => drift(shotOn(cast.rodney, { angle: 0.3, dist: 1.6, fov: 32 }), t)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;

    const overlay = (g, W, H) => {
      const k = clamp(1 - Math.abs(t - tShove - 0.35) / 0.45);
      speedLines(g, W, H, t, k, 0.62, 0.5);
      flash(g, W, H, t > tShove + 0.2 && t < tShove + 0.27 ? 0.85 : 0);
      speedLines(g, W, H, t, clamp(1 - Math.abs(t - tDead) / 0.35) * 0.7, 0.5, 0.45);
    };
    return { poses, camera: cam, overlay };
  },
};
