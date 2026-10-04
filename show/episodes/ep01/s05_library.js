// SCENE 5: The castle library. George argues with an empty chair, Alyss reads, Will drips in,
// and the talk turns to his father.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, bookshelf, table, windowMesh, motes, door, rand } from '../../lib/kit.js';
import { P, add, ramp, walkPath, faceTo, shotOn, twoShot, overShoulder, drift, blendShot, headPos, coverage, clamp, lerp } from '../../lib/director.js';

const CHAIR_H = 0.48;
const ALYSS = [-4.55, -0.55], WILLSEAT = [-3.0, -0.55], TABLE = [-3.78, -0.55], GEO = [1.0, -2.2], EMPTY = [1.4, -3.3], CAT = [-5.75, 2.05];

function chair(color = '#6a4428') {
  const g = new THREE.Group(); const m = toon(color);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), m); seat.position.y = CHAIR_H; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), m); back.position.set(0, CHAIR_H + 0.3, -0.22); back.castShadow = true; g.add(back);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, CHAIR_H, 0.05), m); l.position.set(x * 0.2, CHAIR_H / 2, z * 0.2); g.add(l); }
  return g;
}

function cat() {
  const g = new THREE.Group(); const m = toon('#e0a050', { rim: true });
  const body = inked(new THREE.CapsuleGeometry(0.12, 0.25, 4, 10), m, 0.004); body.rotation.z = Math.PI / 2; body.position.y = 0.12; g.add(body);
  const head = new THREE.Group(); head.position.set(0.24, 0.2, 0); g.add(head);
  head.add(inked(new THREE.SphereGeometry(0.1, 12, 10), m, 0.004));
  for (const z of [-1, 1]) { const e = inked(new THREE.ConeGeometry(0.035, 0.07, 4), m, 0.003); e.position.set(0, 0.09, z * 0.05); head.add(e); }
  const eyeM = new THREE.MeshBasicMaterial({ color: '#2a2a10' });
  for (const z of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.03), eyeM); e.position.set(0.095, 0.01, z * 0.04); head.add(e); }
  const tail = inked(new THREE.CapsuleGeometry(0.025, 0.25, 3, 6), m, 0.003); tail.position.set(-0.28, 0.1, 0.05); tail.rotation.set(0.6, 0, 1.2); g.add(tail);
  g.userData = { head, tail };
  return g;
}

export default {
  cast: ['george', 'alyss', 'will'],
  rim: '#fff2d0', rimStrength: 0.5, bloom: 0.4,
  build({ S, scene, cast }) {
    scene.background = new THREE.Color('#2a2018');
    scene.fog = new THREE.Fog('#3a2a1a', 14, 30);
    room(S, { w: 12, d: 10, h: 5.5, wallBase: '#a89878', floor: 'wood', open: ['front'], beams: true });
    // tall arched windows on the left wall, sunlight pouring in
    for (const z of [-2.2, 2.0]) {
      const w = windowMesh(1.1, 2.4, true, '#dff0ff'); w.position.set(-5.78, 1.0, z); w.rotation.y = Math.PI / 2; S.add(w);
    }
    const sill = box(0.5, 0.1, 1.4, toon('#8a7258')); sill.position.set(-5.6, 0.98, 2.0); S.add(sill);
    // bookshelves everywhere
    [[-2.5, -4.6, 0], [0.3, -4.6, 0], [3.1, -4.6, 0], [5.6, -2.2, -Math.PI / 2], [5.6, 0.6, -Math.PI / 2], [2.6, -1.0, Math.PI / 2], [2.6, 1.6, Math.PI / 2]].forEach(([x, z, r], i) => {
      const b = bookshelf(2.6, 3.6); b.position.set(x, 0, z); b.rotation.y = r; S.add(b);
    });
    const tb = table(1.5, 1.0, 0.78, '#6a4428'); tb.position.set(TABLE[0], 0, TABLE[1]); S.add(tb);
    const c1 = chair(); c1.position.set(ALYSS[0], 0, ALYSS[1]); c1.rotation.y = Math.PI / 2; S.add(c1);
    const c2 = chair(); c2.position.set(WILLSEAT[0], 0, WILLSEAT[1]); c2.rotation.y = -Math.PI / 2; S.add(c2);
    const c3 = chair(); c3.position.set(EMPTY[0], 0, EMPTY[1]); c3.rotation.y = 0.3; S.add(c3);
    // books and a candle on the table
    const book = new THREE.Group();
    for (const s of [-1, 1]) { const p = inked(new THREE.BoxGeometry(0.16, 0.02, 0.22), toon('#f2ead2'), 0.003); p.position.set(s * 0.085, 0, 0); p.rotation.z = s * 0.08; book.add(p); }
    book.position.set(TABLE[0] - 0.35, 0.8, TABLE[1]); book.rotation.y = Math.PI / 2; S.add(book);
    for (let i = 0; i < 3; i++) { const b = box(0.24, 0.06, 0.32, toon(['#7a2e24', '#2f4a6a', '#5a6b2f'][i]), 0.004); b.position.set(TABLE[0] + 0.4, 0.81 + i * 0.06, TABLE[1] + 0.25); b.rotation.y = i * 0.3; S.add(b); }
    // dust in the sunbeams
    motes(S, [-3.6, 0.3, 0], [4, 3.5, 7], { n: 220, color: '#fff6dc', sz: 0.035, speed: 0.12 });
    const sunCol = '#fff4d8';
    const sun = new THREE.DirectionalLight(sunCol, 1.6); sun.position.set(-12, 7, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4 });
    S.add(sun);
    S.add(new THREE.HemisphereLight('#ffe8c8', '#3a2a1a', 0.7));
    const dr = door(1.3, 2.5); dr.position.set(5.78, 0, 3.2); dr.rotation.y = -Math.PI / 2; S.add(dr);
    const kitty = cat(); kitty.position.set(CAT[0], 1.04, CAT[1]); kitty.rotation.y = -0.4; S.add(kitty);
    // puddles Will leaves behind
    const pm = new THREE.MeshBasicMaterial({ color: '#4a3a2a', transparent: true, opacity: 0.45, depthWrite: false });
    const puddles = []; const r = rand(3);
    for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.15 + r() * 0.1, 12), pm); p.rotation.x = -Math.PI / 2; p.position.y = 0.006; p.visible = false; S.add(p); puddles.push(p); }
    // drips falling off Will
    const n = 40, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const drips = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#9fd0ff', size: 0.035, transparent: true, opacity: 0.8 }));
    S.add(drips);
    return { kitty, puddles, drips, dripPos: pos, dripGeo: geo };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m) => ctx.line(m), A = (m) => ctx.act(m);
    const tFurther = L('and furthermore').s, tAlyss = A('At a table by the window').s, tLosing = L('losing the argument').s, tWin = L('winning').s;
    const tWet = A('Will walks in').s, tHorace = L('Horace?').s, tLucky = L('He just got lucky').s, tHand = L('On the one hand').s, tThanks = L('Thank you, George').s;
    const tNo = L('What will you do').s, tLook = A('Will looks out of the window').s, tFather = L('My father was a knight').s, tTold = L('Did someone').s;
    const tKnow = L('No. But I know').s, tGlance = A('Alyss and George glance').s, tProud = L('Then I hope').s, tBattle = L('Battleschool. That').s;

    // ---- George: argues with the chair, switching sides; drifts over to the table later ----
    let george;
    const geoWalk = walkPath(t, [GEO, [-1.2, -1.6], [-3.3, -1.75]], tHand - 1.6, tHand + 0.2, { stride: 0.5 });
    if (t < tHand - 1.6) {
      const side = Math.floor((t - tFurther) / 2.6) % 2 === 0;
      const gx = GEO[0] + (side ? 0 : 0.6);
      george = add(t > tFurther ? (side ? P.point('R', 0.1) : P.chin('L')) : P.chin('R'), { pos: [gx, 0, GEO[1]], yaw: faceTo([gx, 0, GEO[1]], [EMPTY[0], 0, EMPTY[1]]) + (side ? 0 : 0.5), face: side ? 'determined' : 'curious', lookAt: t < tFurther ? [EMPTY[0], 0.9, EMPTY[1]] : undefined });
      if (t > tLosing && t < tWin + 2.5) george = add(george, { face: 'worried' });
    } else if (t < tHand + 0.2) george = add(P.walk(geoWalk.phase, 1), { pos: geoWalk.pos, yaw: geoWalk.yaw, face: 'curious' });
    else george = add(t > tHand + 0.5 && t < tThanks ? P.shrug(0.7) : P.handsBehind(), { pos: [-3.3, 0, -1.75], yaw: faceTo([-3.3, 0, -1.75], [WILLSEAT[0], 0, WILLSEAT[1]]) - 0.3, face: t > tTold - 0.3 && t < tGlance + 1.5 ? 'worried' : 'curious' });

    // ---- Alyss: reading, then gently questioning; reaches for Will's hand ----
    let alyss = add(P.sit('down'), { pos: [ALYSS[0], CHAIR_H - cast.alyss.dim.leg + 0.08, ALYSS[1]], yaw: Math.PI / 2, face: 'neutral' });
    if (t < tWet + 1.5) alyss = add(alyss, { armR: { fwd: 1.05, bend: 0.75, out: -0.15 }, armL: { fwd: 1.05, bend: 0.75, out: -0.15 }, head: { nod: 0.45 }, lookAt: t < tLosing ? null : headPos(cast.george) });
    if (t > tGlance + 0.8 && t < tBattle + 1) alyss = add(alyss, P.reach('L', 0.9), { spine: { bend: 0.15 } });
    alyss.face = t < tLosing ? 'neutral' : t < tWet ? 'smirk' : t < tNo ? 'smirk' : t < tFather ? 'worried' : t < tGlance ? 'sad' : 'happy';
    if (t > tProud && t < tBattle) alyss.face = { smile: 0.5, browAng: 0.5, brow: 0.2, lid: 0.15 };

    // ---- Will: squelches in, sits, broods at the window, speaks about his father ----
    const ww = walkPath(t, [[5.0, 2.8], [1.4, 1.6], [-1.6, 0.4], [-2.6, -0.2], [WILLSEAT[0] + 0.3, WILLSEAT[1]]], tWet - 0.3, tHorace + 1.0, { stride: 0.45 });
    let will;
    if (t < tWet - 0.3) will = { pos: [8, 0, 3], visible: false };
    else if (t < tHorace + 1.0) will = add(P.walk(ww.phase, 0.8), { pos: ww.pos, yaw: ww.yaw, face: 'angry', spine: { bend: 0.12 }, armL: { fwd: 0.1, bend: 0.1 }, armR: { fwd: 0.1, bend: 0.1 } });
    else {
      will = add(P.sit('down'), { pos: [WILLSEAT[0], CHAIR_H - cast.will.dim.leg + 0.08, WILLSEAT[1]], yaw: -Math.PI / 2, face: 'angry' });
      if (t > tLook && t < tTold) will = add(will, { lookAt: [-7, 2.2, 2.0], spine: { bend: 0.1 } });
      if (t > tLook && t < tBattle) will = add(will, { armL: { fwd: 0.95, bend: 0.4, out: -0.15 } });
    }
    will.face = t < tLucky ? 'angry' : t < tThanks + 1 ? 'smirk' : t < tFather ? 'determined' : t < tTold ? { smile: 0.25, browAng: 0.5, brow: 0.2, lid: 0.3 } : t < tGlance ? 'determined' : t < tBattle ? 'sad' : 'determined';
    if (t > tThanks - 0.1 && t < tThanks + 1.5) will.face = { smile: 0.3, lid: 0.5, brow: -0.2, browAng: -0.2 };

    // puddles appear behind him as he walks; drips fall while he is wet
    env.puddles.forEach((p, i) => {
      const k = i / env.puddles.length, at = tWet - 0.3 + k * (tHorace + 1.3 - tWet);
      const w = walkPath(at, [[5.0, 2.8], [1.4, 1.6], [-1.6, 0.4], [-2.6, -0.2], [WILLSEAT[0] + 0.3, WILLSEAT[1]]], tWet - 0.3, tHorace + 1.0);
      p.visible = t > at; p.position.x = w.pos[0] + (i % 2 ? 0.12 : -0.12); p.position.z = w.pos[2];
    });
    const wp = cast.will.root.position;
    for (let i = 0; i < 40; i++) {
      const ph = (t * 0.9 + i * 0.137) % 1;
      env.dripPos.set([wp.x + Math.sin(i * 5.1) * 0.18, 1.3 * (1 - ph) + 0.02, wp.z + Math.cos(i * 3.3) * 0.12], i * 3);
    }
    env.dripGeo.attributes.position.needsUpdate = true;
    env.drips.visible = t > tWet;

    // the cat: dozes, then leaves in disgust when Will drips in
    const leave = ramp(t, tWet + 2.0, tWet + 3.4);
    env.kitty.position.set(CAT[0] + leave * 0.1, 1.04 + Math.sin(leave * Math.PI) * 0.15, CAT[1] + leave * 1.6);
    env.kitty.visible = leave < 0.99;
    env.kitty.userData.head.rotation.y = t > tWet + 0.6 ? 0.9 : Math.sin(t * 0.3) * 0.2;
    env.kitty.userData.tail.rotation.y = Math.sin(t * 2) * 0.4;

    const pairs = { will: 'alyss', alyss: 'will', george: 'will' };
    const shots = [
      [0, () => blendShot({ pos: [4.5, 3.6, 6.5], target: [-2, 1.4, -2], fov: 40 }, { pos: [3.4, 2.4, 3.0], target: [0.5, 1.3, -2.8], fov: 38 }, ramp(t, 0, tFurther, 'sine'))],
      [tFurther, () => drift(blendShot(shotOn(cast.george, { angle: 0.8, dist: 2.2, fov: 34 }), shotOn(cast.george, { angle: -0.6, dist: 1.6, fov: 32 }), ramp(t, tFurther, tAlyss, 'sine')), t)],
      [tAlyss, () => blendShot({ pos: [-1.0, 1.6, 2.4], target: headPos(cast.alyss), fov: 34 }, { pos: [-2.6, 1.3, 0.7], target: headPos(cast.alyss), fov: 30 }, ramp(t, tAlyss, tLosing, 'sine'))],
      [tLosing, () => coverage(ctx, t, cast, { alyss: 'george', george: 'alyss' }, { startWide: false }) || shotOn(cast.alyss, {})],
      [tWet, () => drift({ pos: [-1.2, 1.7, 4.2], target: headPos(cast.will), fov: 40 }, t)],
      [tWet + 1.8, () => ({ pos: [-4.0, 1.4, 0.8], target: [CAT[0], 1.25, CAT[1]], fov: 34 })],
      [tHorace, () => coverage(ctx, t, cast, pairs, { startWide: false }) || twoShot(cast.will, cast.alyss)],
      [tLook, () => drift({ pos: [-3.5, 1.2, 1.0], target: headPos(cast.will), fov: 32 }, t, 0.01)],
      [tFather, () => drift(blendShot(shotOn(cast.will, { angle: -0.5, dist: 1.4, fov: 30 }), shotOn(cast.will, { angle: -0.4, dist: 0.75, fov: 28 }), ramp(t, tFather, tTold - 0.2, 'sine')), t, 0.01)],
      [tTold, () => coverage(ctx, t, cast, { ...pairs, will: 'george' }, { startWide: false }) || twoShot(cast.will, cast.george)],
      [tGlance, () => drift(twoShot(cast.alyss, cast.george, { fov: 34 }), t)],
      [tGlance + 1.2, () => ({ pos: [TABLE[0] + 0.2, 1.25, TABLE[1] + 0.9], target: [TABLE[0], 0.8, TABLE[1]], fov: 36 })],   // the hand squeeze
      [tProud, () => drift(shotOn(cast.alyss, { angle: 0.3, dist: 0.85, fov: 30 }), t)],
      [tBattle, () => drift(blendShot(shotOn(cast.will, { angle: -0.2, dist: 1.0 }), shotOn(cast.will, { angle: -0.2, dist: 0.7 }), ramp(t, tBattle, ctx.dur)), t)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { george, alyss, will }, camera: cam };
  },
};
