// SCENE 2: The castle kitchens. Chubb rules with a ladle; Jenny kneads; a hand steals honey cakes.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, stoneMat, table, barrel, crate, fire, motes, lightShaft, door, props, bench } from '../../lib/kit.js';
import { P, add, ramp, key, walkPath, faceTo, shotOn, overShoulder, twoShot, drift, blendShot, headPos, coverage, clamp, noise } from '../../lib/director.js';

const WIN = { x: -7, y: 1.75, z: -1.5, w: 1.0, h: 0.9 }; // window opening in the left wall
const JENNY = [1.0, -0.25];
const STOVE = [-5.4, -1.9];
const CHUBB_AT_STOVE = [-6.0, -1.05];

export default {
  cast: ['jenny', 'chubb', 'will', 'cook1', 'cook2'],
  rim: '#ffb070', rimStrength: 0.5, bloom: 0.3, fadeIn: 0.5,
  build({ S, scene, ctx, cast }) {
    scene.background = new THREE.Color('#2a1a10');
    scene.fog = new THREE.Fog('#4a3020', 12, 30);
    room(S, { w: 14, d: 10, h: 5, wallBase: '#b8a383', open: ['front', 'left'], beams: true });
    // left wall built around the window opening (thin, so a hand can reach through)
    const wm = stoneMat('#b8a383', [1, 1], 21);
    const seg = (zc, zl, yc, yl) => { const b = box(0.3, yl, zl, wm); b.position.set(-7, yc, zc); S.add(b); };
    const z0 = WIN.z - WIN.w / 2, z1 = WIN.z + WIN.w / 2;
    seg((-5 + z0) / 2, z0 + 5, 2.5, 5);
    seg((z1 + 5) / 2, 5 - z1, 2.5, 5);
    seg(WIN.z, WIN.w, WIN.y / 2, WIN.y);
    seg(WIN.z, WIN.w, (5 + WIN.y + WIN.h) / 2, 5 - WIN.y - WIN.h);
    const sill = box(0.7, 0.08, WIN.w + 0.2, toon('#8a7258')); sill.position.set(-6.75, WIN.y - 0.04, WIN.z); S.add(sill);
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: '#8fb4d6' }));
    outside.position.set(-9.5, 3, WIN.z); outside.rotation.y = Math.PI / 2; S.add(outside);
    // cooling tray with three honey cakes on the sill
    const tray = box(0.5, 0.03, 0.7, toon('#9a7a52'), 0.004); tray.position.set(-6.72, WIN.y + 0.015, WIN.z); S.add(tray);
    const cakes = [0, 1, 2].map((i) => { const c = props.cake(); c.position.set(-6.72, WIN.y + 0.05, WIN.z - 0.2 + i * 0.2); S.add(c); return c; });

    // hearth with fire and a hanging cauldron
    const hearth = new THREE.Group();
    const hb = stoneMat('#9a8a78', [1, 1], 22);
    [[-1.9, 1.4, 0.5, 2.8], [1.9, 1.4, 0.5, 2.8]].forEach(([x, y, w, h]) => { const b = box(w, h, 1.1, hb); b.position.set(x, y, 0); hearth.add(b); });
    const lintel = box(4.3, 0.7, 1.2, hb); lintel.position.set(0, 3.0, 0); hearth.add(lintel);
    const hood = box(3.6, 1.6, 0.9, hb); hood.position.set(0, 4.1, -0.1); hearth.add(hood);
    hearth.position.set(0, 0, -4.6); S.add(hearth);
    fire(S, [0, 0.05, -4.4], { scale: 1.3, intensity: 4, dist: 14 });
    const pot = inked(new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), toon('#2a2622'), 0.01); pot.position.set(0, 1.2, -4.4); S.add(pot);
    motes(S, [0, 1.6, -4.3], [1.4, 3.5, 0.6], { n: 60, color: '#ffb060', sz: 0.04, speed: 0.4, rise: 0.6 });

    // Chubb's stove by the window, with a big pot
    const stove = box(1.4, 0.9, 1.0, stoneMat('#8a7a6a', [1, 1], 23)); stove.position.set(STOVE[0], 0.45, STOVE[1]); S.add(stove);
    const sp = inked(new THREE.CylinderGeometry(0.32, 0.28, 0.45, 16), toon('#b8743a'), 0.008); sp.position.set(STOVE[0], 1.12, STOVE[1]); S.add(sp);
    fire(S, [STOVE[0], 0.1, STOVE[1] + 0.52], { scale: 0.4, intensity: 1.2, dist: 3, light: true, seed: 4 });
    motes(S, [STOVE[0], 1.4, STOVE[1]], [0.5, 1.5, 0.5], { n: 40, color: '#ffffff', sz: 0.06, speed: 0.3, rise: 0.35 }); // steam

    // long table with dough, bowls, flour
    const tb = table(3.6, 1.3, 0.85); tb.position.set(JENNY[0], 0, JENNY[1] + 0.95); S.add(tb);
    const dough = props.dough(); dough.position.set(JENNY[0], 0.9, JENNY[1] + 0.65); S.add(dough);
    for (let i = 0; i < 3; i++) { const b = inked(new THREE.CylinderGeometry(0.16, 0.1, 0.12, 12, 1, true), toon(['#c89a6a', '#a8b0b8', '#d8c8a0'][i], { side: THREE.DoubleSide }), 0.005); b.position.set(JENNY[0] - 1.2 + i * 0.5, 0.92, JENNY[1] + 1.2); S.add(b); }
    const flour = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), toon('#f6f0e2')); flour.rotation.x = -Math.PI / 2; flour.position.set(JENNY[0] + 0.3, 0.902, JENNY[1] + 0.8); S.add(flour);

    // shelves, copper pots on the beam, barrels, back door
    for (let i = 0; i < 2; i++) {
      const sh = box(4, 0.08, 0.5, toon('#5a3a22')); sh.position.set(4.2, 2.0 + i * 0.8, -4.7); S.add(sh);
      for (let k = 0; k < 7; k++) { const j = inked(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10), toon(['#b85a3a', '#d8b878', '#6a8a5a', '#c8c0b0'][k % 4]), 0.005); j.position.set(2.6 + k * 0.5, 2.2 + i * 0.8, -4.6); S.add(j); }
    }
    for (let k = 0; k < 6; k++) {
      const cp = inked(new THREE.CylinderGeometry(0.2 + (k % 3) * 0.05, 0.18, 0.25, 14), toon('#d07a3a'), 0.006); cp.position.set(-1.5 + k * 0.75, 3.9, JENNY[1] + 0.95); S.add(cp);
      const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), toon('#2a2622')); hk.position.set(-1.5 + k * 0.75, 4.35, JENNY[1] + 0.95); S.add(hk);
    }
    [[5.8, 2.5], [6.2, 3.3], [-5.8, 3.0]].forEach(([x, z]) => { const b = barrel(); b.position.set(x, 0, z); S.add(b); });
    const cr = crate(); cr.position.set(5.6, 0.4, 1.0); S.add(cr);
    const counter = box(2.4, 0.9, 0.9, toon('#ffffff', { map: tex.planks('#7a5232', 5, 4) })); counter.position.set(5.6, 0.45, -1.8); S.add(counter);
    const bd = door(1.3, 2.3, '#6a4428'); bd.position.set(6.8, 0, 2.2); bd.rotation.y = -Math.PI / 2; S.add(bd);

    // warm interior light
    S.add(new THREE.HemisphereLight('#ffd8a8', '#3a2a1a', 0.75));
    const key_ = new THREE.DirectionalLight('#fff0d8', 0.9); key_.position.set(-8, 7, 2); key_.castShadow = true;
    key_.shadow.mapSize.set(1024, 1024); key_.shadow.bias = -0.0005; key_.shadow.normalBias = 0.03;
    Object.assign(key_.shadow.camera, { left: -9, right: 9, top: 7, bottom: -3 });
    S.add(key_);

    cast.chubb.attach('ladle', props.ladle(), 'R').rotation.set(Math.PI, 0, 0);
    cast.cook2.attach('knife', props.stick(0.25), 'R');
    const held = [0, 1, 2].map(() => { const c = props.cake(); c.visible = false; cast.will.attach('c', c, 'R'); c.position.set(0, -0.04, 0.03); return c; });
    const bundle = inked(new THREE.SphereGeometry(0.11, 10, 8), toon('#e8dcc0'), 0.004); bundle.visible = false; cast.jenny.attach('bundle', bundle, 'L');
    return { cakes, held, bundle };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m, k) => ctx.line(m, k), A = (m) => ctx.act(m);
    const tSalt = L('Who put salt').s, tCarry = L('Carry on').s, tWin = A('small high window').s, tSees = A('Jenny sees it').s;
    const tGrab = A('The hand closes').s, tThief = L('THIEF').s, tWhack = ctx.sfx('ladle_whack'), tBoy = L('That boy').s;
    const tBird = L('I think it was a bird').s, tFingers = L('With fingers').s, tBig = L('A very big bird').s, tGlare = A('Chubb glares').s, tOut = A('slips out').s;

    // ---- Jenny: kneads, glances at the window, covers for Will, slips out the back ----
    const jWalk = walkPath(t, [JENNY, [3.5, 1.4], [6.4, 2.2]], tGlare + 1.0, ctx.dur + 0.4, { stride: 0.55 });
    const leaving = t > tGlare + 1.0;
    let jenny = add(leaving ? P.walk(jWalk.phase, 1) : P.knead(t), {
      pos: leaving ? jWalk.pos : [JENNY[0], 0, JENNY[1]], yaw: leaving ? jWalk.yaw : 0,
      face: t < tSees ? 'happy' : t < tThief ? 'innocent' : t > tBird - 0.2 && t < tGlare + 1 ? 'innocent' : 'happy',
      lookAt: t > tSees && t < tGrab + 1 ? [WIN.x, WIN.y + 0.3, WIN.z] : undefined,
    });
    if (t > tBird - 0.3 && t < tGlare + 1) jenny = add(jenny, { armL: { fwd: -0.9, bend: 0 }, armR: { fwd: -0.9, bend: 0 }, spine: { bend: -0.25 }, head: { tilt: 0.12 } }); // hands behind back, sweetly
    env.bundle.visible = leaving;

    // ---- Chubb: at the table, then back to his stove; whack; rant; stomps off ----
    const cWalk = walkPath(t, [[JENNY[0] - 0.4, JENNY[1] + 1.9], [-2.6, 0.6], CHUBB_AT_STOVE], tCarry + 2.0, tWin + 1.6, { stride: 0.45 });
    const cOff = walkPath(t, [CHUBB_AT_STOVE, [-3.0, -3.0], [-1.2, -3.6]], tGlare + 0.6, ctx.dur, { stride: 0.45 });
    let chubb;
    const atStove = t > tWin + 1.6;
    const toJenny = faceTo([CHUBB_AT_STOVE[0], 0, CHUBB_AT_STOVE[1]], [JENNY[0], 0, JENNY[1]]);
    if (t < tCarry + 2.0) {
      chubb = add(t > tCarry - 0.2 && t < tCarry + 1.2 ? P.eat(t, 'R') : P.handsOnHips(), { pos: [JENNY[0] - 0.4, 0, JENNY[1] + 1.9], yaw: Math.PI + 0.25, face: t < tCarry ? 'angry' : 'stern' });
      if (t >= tSalt && t < tSalt + 2) chubb = add(chubb, { armR: { fwd: 1.8 + Math.sin(t * 9) * 0.3, bend: 0.6 } });
    } else if (!atStove) {
      chubb = add(P.walk(cWalk.phase, 1), { pos: cWalk.pos, yaw: cWalk.yaw, face: 'stern' });
    } else if (t < tGlare + 0.6) {
      const spin = ramp(t, tThief - 0.15, tThief + 0.35, 'out');
      const swing = ramp(t, tWhack - 0.35, tWhack, 'in') * (1 - ramp(t, tWhack + 0.6, tWhack + 1.2));
      const stir = t < tThief - 0.2 ? { armR: { fwd: 0.9 + Math.sin(t * 4) * 0.15, bend: 0.8, out: Math.cos(t * 4) * 0.2 } } : {};
      const yaw = t < tFingers - 0.3 ? Math.PI * 0.75 - spin * Math.PI * 1.25 : toJenny;
      chubb = add(stir, { pos: [CHUBB_AT_STOVE[0], 0, CHUBB_AT_STOVE[1]], yaw, face: t > tThief - 0.2 ? 'angry' : 'neutral' });
      if (t > tThief - 0.2 && t < tBoy) chubb = add(chubb, P.swing(swing), { armR: { fwd: 2.7 * (1 - swing) + 0.9 * swing } });
      if (t >= tBoy && t < tFingers - 0.3) chubb = add(chubb, { pos: [WIN.x + 0.55, 0.15 + Math.abs(Math.sin(t * 5.5)) * 0.42, WIN.z], noIdle: true, legL: { bend: Math.abs(Math.sin(t * 5.5)) * 0.5 }, legR: { bend: Math.abs(Math.sin(t * 5.5)) * 0.5 }, armR: { fwd: 2.2 + Math.sin(t * 8) * 0.4, bend: 0.5 }, spine: { bend: 0.35 }, lookAt: [WIN.x - 3, WIN.y, WIN.z] });
      if (t >= tFingers - 0.3) chubb = add(chubb, P.handsOnHips(), { face: 'stern' });
    } else {
      chubb = add(P.walk(cOff.phase, 1.2), { pos: cOff.pos, yaw: cOff.yaw, face: 'angry' });
    }

    // ---- Will (outside): only his hand comes through the window ----
    const reach = ramp(t, tWin + 0.6, tWin + 2.0) * (1 - ramp(t, tWhack + 0.05, tWhack + 0.25, 'in'));
    const grabbed = [tGrab + 0.3, tGrab + 0.9, tGrab + 1.6].filter((g) => t > g).length;
    env.cakes.forEach((c, i) => (c.visible = i >= grabbed));
    env.held.forEach((c, i) => (c.visible = i === 0 && grabbed > 0 && reach > 0.2));
    const will = { pos: [-7.38, 0.18 - (1 - reach) * 0.7, WIN.z + 0.05], yaw: Math.PI / 2, noIdle: true, armR: { fwd: 2.55, bend: -0.9 + Math.sin(t * 5) * 0.05 * reach, stretch: 1.85, out: -0.1 }, armL: { fwd: 0.2 }, visible: reach > 0.02 };

    // ---- background cooks ----
    const loop = (t % 16) / 16;
    const c1 = walkPath(loop * 16, [[-2.8, -3.2], [3.0, -3.4], [4.6, -2.6], [3.0, -3.4], [-2.8, -3.2]], 0, 16, { stride: 0.5 });
    const cook1 = add(P.walk(c1.phase, 1), { pos: c1.pos, yaw: c1.yaw, armL: { fwd: 0.9, bend: 1.2 }, armR: { fwd: 0.9, bend: 1.2 }, face: 'neutral', lookAt: null });
    const cook2 = add({ armR: { fwd: 0.9 + Math.abs(Math.sin(t * 6)) * 0.3, bend: 0.9 }, armL: { fwd: 0.7, bend: 0.8 }, spine: { bend: 0.2 }, head: { nod: 0.4 } },
      { pos: [5.6, 0, -1.15], yaw: Math.PI, face: 'neutral', lookAt: t > tThief && t < tThief + 3 ? headPos(cast.chubb) : null });

    // ---- camera ----
    const jh = () => headPos(cast.jenny), ch = () => headPos(cast.chubb);
    const shake = Math.max(0, 1 - Math.abs(t - tWhack) * 4) * 0.05;
    const win = [WIN.x, WIN.y + 0.25, WIN.z];
    const shots = [
      [0, () => blendShot({ pos: [6.5, 3.6, 9], target: [-1, 1.3, -1.8], fov: 40 }, { pos: [3.5, 2.6, 7.2], target: [-0.5, 1.2, -1.5], fov: 40 }, ramp(t, 0, A('kneading dough').s, 'sine'))],
      [A('kneading dough').s, () => blendShot({ pos: [3.0, 2.1, 3.0], target: jh(), fov: 34 }, { pos: [1.9, 1.8, 1.55], target: jh(), fov: 30 }, ramp(t, A('kneading dough').s, tSalt, 'sine'))],
      [tSalt, () => coverage(ctx, t, cast, { chubb: 'jenny', jenny: 'chubb' }) || shotOn(cast.chubb, {})],
      [tWin, () => blendShot({ pos: [-4.4, 1.9, 0.6], target: win, fov: 38 }, { pos: [-5.0, 2.2, 0.0], target: win, fov: 34 }, ramp(t, tWin, tSees))],
      [tSees, () => drift(shotOn(cast.jenny, { angle: 0.5, dist: 0.85, fov: 30 }), t)],
      [tGrab, () => drift({ pos: [-5.4, 2.75, -0.35], target: [WIN.x + 0.3, WIN.y + 0.15, WIN.z], fov: 36 }, t, 0.02)],
      [tThief - 0.1, () => { const s = { pos: [-4.0, 1.7, 1.2], target: [-6.4, 1.8, -1.3], fov: 40 }; s.pos = s.pos.map((v, i) => v + Math.sin(t * 60 + i) * shake); return s; }],
      [tWhack + 0.6, () => drift({ pos: [-5.3, 2.8, -0.3], target: [WIN.x + 0.2, WIN.y + 0.05, WIN.z], fov: 36 }, t, 0.02)],
      [tBoy, () => drift({ pos: [-8.7, 2.0, WIN.z + 0.4], target: [WIN.x + 0.6, WIN.y + 0.05, WIN.z], fov: 40 }, t, 0.02)],
      [tBird, () => coverage(ctx, t, cast, { chubb: 'jenny', jenny: 'chubb' }, { startWide: false }) || shotOn(cast.jenny, {})],
      [tGlare, () => drift(twoShot(cast.chubb, cast.jenny, { fov: 38, dist: 4 }), t)],
      [tOut, () => ({ pos: [2.5, 1.8, 6.5], target: headPos(cast.jenny), fov: 36 })],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { jenny, chubb, will, cook1, cook2 }, camera: cam };
  },
};
