// SCENE 12: The Baron's office, at night. A stripe of moonlight across the desk, a blank paper,
// and a voice from the darkest corner.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, table, bookshelf, door, stoneMat, props, motes } from '../../lib/kit.js';
import { P, add, ramp, walkPath, faceTo, shotOn, twoShot, overShoulder, drift, blendShot, headPos, coverage, clamp, lerp, speedLines } from '../../lib/director.js';

const WIN = { x: -4, y: 1.0, z: -0.8, w: 1.0, h: 1.6 };
const DESK = [-0.4, -0.6];
const CHAIR = [2.9, -2.5];
const DOOR = [4, 1.4];

function armchair() {
  const g = new THREE.Group(); const m = toon('#3a2418');
  const seat = box(0.8, 0.15, 0.8, m); seat.position.y = 0.45; g.add(seat);
  const back = box(0.8, 1.1, 0.15, m); back.position.set(0, 1.0, -0.35); g.add(back);
  for (const x of [-0.38, 0.38]) { const a = box(0.12, 0.35, 0.75, m); a.position.set(x, 0.65, 0); g.add(a); }
  return g;
}

export default {
  cast: ['will', 'halt'],
  rim: '#9ab8ff', rimStrength: 0.55, bloom: 0.5, fill: 0.5, fillColor: '#6a7ac8', tint: [0.94, 0.97, 1.06],
  build({ S, scene, cast }) {
    scene.background = new THREE.Color('#05070e');
    scene.fog = new THREE.Fog('#05070e', 8, 22);
    room(S, { w: 8, d: 7, h: 4, wallBase: '#6a6258', floor: 'wood', open: ['front', 'left', 'right'], beams: true });
    // left wall with the window Will climbs through; right wall with the door
    const wm = stoneMat('#6a6258', [1, 1], 91);
    const segL = (z, w, y, h) => { const b = box(0.4, h, w, wm); b.position.set(-4, y, z); S.add(b); };
    const z0 = WIN.z - WIN.w / 2, z1 = WIN.z + WIN.w / 2;
    segL((-3.5 + z0) / 2, z0 + 3.5, 2, 4); segL((z1 + 3.5) / 2, 3.5 - z1, 2, 4); segL(WIN.z, WIN.w, WIN.y / 2, WIN.y); segL(WIN.z, WIN.w, (4 + WIN.y + WIN.h) / 2, 4 - WIN.y - WIN.h);
    const segR = (z, w) => { const b = box(0.4, 4, w, wm); b.position.set(4, 2, z); S.add(b); };
    segR((-3.5 + DOOR[1] - 0.7) / 2, DOOR[1] - 0.7 + 3.5); segR((DOOR[1] + 0.7 + 3.5) / 2, 3.5 - DOOR[1] - 0.7);
    const lint = box(0.4, 1.5, 1.4, wm); lint.position.set(4, 3.25, DOOR[1]); S.add(lint);
    const hinge = new THREE.Group(); hinge.position.set(3.85, 0, DOOR[1] - 0.65); S.add(hinge);
    const d = box(0.08, 2.5, 1.3, toon('#ffffff', { map: tex.planks('#5a3a20', 92, 5, true) }), 0.008); d.position.set(0, 1.25, 0.65); hinge.add(d);
    // furniture: the big desk, shelves, a map, the dark armchair in the corner
    const desk = table(2.2, 1.1, 0.82, '#4a2e1a'); desk.position.set(DESK[0], 0, DESK[1]); S.add(desk);
    const deskFront = box(2.2, 0.7, 0.06, toon('#3a2214')); deskFront.position.set(DESK[0], 0.45, DESK[1] + 0.53); S.add(deskFront);
    const folder = props.folder(); folder.position.set(DESK[0] - 0.2, 0.84, DESK[1] + 0.05); S.add(folder);
    const inkpot = inked(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), toon('#1a1a2a'), 0.003); inkpot.position.set(DESK[0] + 0.7, 0.86, DESK[1] - 0.2); S.add(inkpot);
    const candle = inked(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), toon('#e8e0c8'), 0.003); candle.position.set(DESK[0] + 0.85, 0.91, DESK[1] + 0.25); S.add(candle);
    [[-1.8, -3.25, 0], [1.0, -3.25, 0]].forEach(([x, z, r]) => { const b = bookshelf(2.4, 3.4); b.position.set(x, 0, z); b.rotation.y = r; S.add(b); });
    const map = box(1.6, 1.0, 0.02, toon('#d8c8a0'), 0.004); map.position.set(3.75, 2.2, -1.3); map.rotation.y = -Math.PI / 2; S.add(map);
    const chair = armchair(); chair.position.set(CHAIR[0], 0, CHAIR[1]); chair.rotation.y = -0.85; S.add(chair);
    const deskChair = armchair(); deskChair.position.set(DESK[0], 0, DESK[1] - 0.95); deskChair.scale.setScalar(0.9); S.add(deskChair);

    // moonlight through the window: the only real light in the room
    const moon = new THREE.DirectionalLight('#a8c0ff', 2.6);
    moon.position.set(-12, 6, -1.8); moon.target.position.set(0, 0, -0.4); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.02;
    Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 30 });
    S.add(moon); S.add(moon.target);
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: '#1a2a58' })); outside.position.set(-7, 2, WIN.z); outside.rotation.y = Math.PI / 2; S.add(outside);
    const ambient = new THREE.HemisphereLight('#34408a', '#0a0808', 0.55); S.add(ambient);
    // torchlight from the corridor when the door opens
    const torch = new THREE.PointLight('#ffa050', 0, 9, 1.6); torch.position.set(5.2, 2.0, DOOR[1]); S.add(torch);
    const corridor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6), new THREE.MeshBasicMaterial({ color: '#c87830' })); corridor.position.set(4.6, 1.3, DOOR[1]); corridor.rotation.y = -Math.PI / 2; S.add(corridor);
    motes(S, [-1.5, 0.5, -0.6], [4, 2, 1.2], { n: 90, color: '#c8d8ff', sz: 0.025, speed: 0.08 });
    const paper = props.paper(); S.add(paper);
    // a faint glint for Halt's eyes in the dark
    const glint = new THREE.PointLight('#9ab0ff', 0, 1.4, 2); S.add(glint);
    return { hinge, torch, paper, folder, glint };
  },

  frame({ t, ctx, cast, env }) {
    const A = (m) => ctx.act(m), L = (m) => ctx.line(m);
    const tFolder = A('The leather folder').s, tOpen = A('He opens it').s, tBlank = A("It's blank").s, tWhat = L('What?').s, tCorner = A('From the darkest corner').s;
    const tLonger = L('It took you longer').s, tSting = ctx.sfx('sting'), tSpin = A('Will spins around').s, tWasnt = L('I wasn').s, tClimbing = L('Climbing five stories').s;
    const tWatching = L('You were watching').s, tWaiting = L('I was waiting for you').s, tPick = A('He picks up the blank').s, tReal = L('The real one').s;
    const tDrop = A("Will's shoulders drop").s, tNow = L('What happens now').s, tStairs = L('Now you go back down').s, tFarm = L("He'll throw me out").s;
    const tPerhaps = L('Perhaps.').s, tToDoor = A('Will walks to the door').s, tHow = L('How did you know').s, tSits = A('Halt sits back down').s, tExact = L("exactly what I would").s;
    const tOut = A('Will stares at him').s, tLaugh = A('very faintly').s;

    // ---------- Will ----------
    const atDesk = [DESK[0] + 0.05, DESK[1] + 1.05];
    const wIn = walkPath(t, [[-3.4, WIN.z], [-2.4, -0.1], atDesk], 1.0, tFolder + 1.2, { stride: 0.4 });
    const wDoor = walkPath(t, [atDesk, [1.8, 1.1], [DOOR[0] - 0.7, DOOR[1]]], tToDoor, tToDoor + 1.6, { stride: 0.5 });
    const wOut = walkPath(t, [[DOOR[0] - 0.7, DOOR[1]], [DOOR[0] + 1.0, DOOR[1]]], tOut + 0.6, tOut + 1.4, { stride: 0.5 });
    let will;
    if (t < 1.0) will = add(P.crouch(), { pos: [-4.0, WIN.y, WIN.z], yaw: Math.PI / 2, face: 'determined' });                           // crouched in the window
    else if (t < tFolder + 1.2) will = add(P.walk(wIn.phase, 0.6), P.crouch(), { hipY: -0.25, pos: wIn.pos, yaw: wIn.yaw, face: 'determined', spine: { bend: 0.3 } });
    else if (t < tToDoor) {
      const spin = ramp(t, tSpin, tSpin + 0.3, 'out');
      will = { pos: [atDesk[0], 0, atDesk[1]], yaw: lerp(Math.PI, faceTo([atDesk[0], 0, atDesk[1]], [CHAIR[0], 0, CHAIR[1]]), spin), face: 'determined' };
      if (t < tSpin) will = add(will, t > tOpen ? { armL: { fwd: 1.2, bend: 0.8, out: -0.2 }, armR: { fwd: 1.2, bend: 0.8, out: -0.2 }, head: { nod: 0.4 } } : P.reach('R', 0.8));
      if (t > tSpin) will.lookAt = headPos(cast.halt);
      will.face = t < tBlank ? 'determined' : t < tCorner ? 'curious' : t < tSpin ? 'worried' : t < tWatching ? 'scared' : t < tDrop ? 'surprised' : t < tPerhaps ? 'sad' : 'worried';
      if (t > tDrop && t < tStairs) will = add(will, { spine: { bend: 0.15 }, armL: { fwd: -0.05, bend: 0 }, armR: { fwd: -0.05, bend: 0 }, head: { nod: 0.35 } });
      if (t > tStairs) will.lookAt = headPos(cast.halt);
    } else if (t < tOut + 0.6) {
      will = t < tToDoor + 1.6 ? add(P.walk(wDoor.phase, 1), { pos: wDoor.pos, yaw: wDoor.yaw, face: 'sad' })
        : { pos: [DOOR[0] - 0.7, 0, DOOR[1]], yaw: lerp(Math.PI / 2, -Math.PI / 2 - 0.4, ramp(t, tToDoor + 1.7, tToDoor + 2.3)), face: t < tExact ? 'curious' : 'surprised', lookAt: headPos(cast.halt) };
    } else will = add(P.walk(wOut.phase, 1), { pos: wOut.pos, yaw: Math.PI / 2, visible: t < tOut + 1.3 });

    // ---------- Halt ----------
    const sitPos = [CHAIR[0], 0.5 - cast.halt.dim.leg + 0.12, CHAIR[1]];
    const standAt = [1.5, -1.2];
    const hRise = walkPath(t, [[CHAIR[0] - 0.3, CHAIR[1] + 0.4], standAt], tSpin + 0.7, tWasnt + 0.6, { stride: 0.45 });
    const hDoor = walkPath(t, [standAt, [2.6, 0.4], [DOOR[0] - 0.6, DOOR[1] - 0.8]], tStairs + 1.6, tStairs + 3.6, { stride: 0.45 });
    const hBack = walkPath(t, [[DOOR[0] - 0.6, DOOR[1] - 0.8], [2.6, -1.3], [CHAIR[0] - 0.3, CHAIR[1] + 0.4]], tSits, tSits + 1.5, { stride: 0.45 });
    let halt;
    const sitting = (extra) => add(P.sit('down'), { pos: sitPos, yaw: -0.85, hood: 1, face: 'stern', ...extra });
    if (t < tSpin + 0.7) halt = sitting({ armL: { fwd: 0.6, bend: 1.2 }, armR: { fwd: 0.6, bend: 1.2 }, lookAt: headPos(cast.will), lookAmt: 0.6 });
    else if (t < tWasnt + 0.6) halt = add(P.walk(hRise.phase, 0.6), { pos: hRise.pos, yaw: hRise.yaw, hood: 1, face: 'stern' });
    else if (t < tStairs + 1.6) {
      halt = add(P.armsCrossed(), { pos: [standAt[0], 0, standAt[1]], yaw: faceTo([standAt[0], 0, standAt[1]], [atDesk[0], 0, atDesk[1]]), hood: 1, face: t < tWaiting ? 'stern' : t < tReal ? 'smirk' : 'stern', gesture: 0.3 });
      if (t > tPick && t < tPick + 2.0) halt = add(halt, P.crouch(), { armL: { fwd: 1.0, bend: 0.4 }, spine: { bend: 0.7 }, hipY: -0.3 * Math.sin(clamp((t - tPick) / 2) * Math.PI) });
    } else if (t < tStairs + 3.6) halt = add(P.walk(hDoor.phase, 1), { pos: hDoor.pos, yaw: hDoor.yaw, hood: 1, face: 'stern' });
    else if (t < tSits) halt = add(t < tStairs + 4.6 ? P.reach('R', 0.9) : P.armsCrossed(), { pos: [DOOR[0] - 0.6, 0, DOOR[1] - 0.8], yaw: t < tStairs + 4.6 ? Math.PI / 2 : -2.6, hood: 1, face: t > tPerhaps ? 'smirk' : 'stern', lookAt: headPos(cast.will) });
    else if (t < tSits + 1.5) halt = add(P.walk(hBack.phase, 1), { pos: hBack.pos, yaw: hBack.yaw, hood: 1, face: 'stern' });
    else halt = sitting({ armL: { fwd: 0.6, bend: 1.2 }, armR: { fwd: 0.6, bend: 1.2 }, lookAt: t < tOut + 1.3 ? headPos(cast.will) : null, face: t > tLaugh ? 'smirk' : 'stern' });
    if (t > tLaugh) halt.face = { smile: 0.55, lid: 0.45, brow: -0.1, browAng: -0.2, open: 0.05 };
    halt.cloak = { wind: 0.1 };

    // ---------- props & light ----------
    const doorOpen = ramp(t, tStairs + 3.8, tStairs + 4.5) * (1 - ramp(t, tOut + 1.5, tOut + 2.2));
    env.hinge.rotation.y = doorOpen * 1.5;
    env.torch.intensity = doorOpen * 7;
    // the paper: in the folder → in Will's hands → falls → picked up by Halt
    if (t < tOpen + 0.6) { env.paper.visible = false; }
    else if (t < tSpin) { const h = new THREE.Vector3(); cast.will.arms.R.hand.getWorldPosition(h); env.paper.visible = true; env.paper.position.set(h.x - 0.08, h.y + 0.05, h.z - 0.05); env.paper.rotation.set(-1.3, 0, 0); }
    else if (t < tPick + 0.9) { const k = ramp(t, tSpin, tSpin + 0.7, 'in'); env.paper.visible = true; env.paper.position.set(atDesk[0] - 0.1 + k * 0.3, lerp(1.0, 0.01, k), atDesk[1] - 0.3 + k * 0.4); env.paper.rotation.set(-1.3 * (1 - k), k * 2, 0); }
    else env.paper.visible = false;
    const hh = headPos(cast.halt);
    env.glint.position.set(hh[0] - 0.4, hh[1], hh[2] + 0.4);
    env.glint.intensity = (t < tSpin + 0.6 || t > tSits + 1.5) ? 0.6 : 0;

    // ---------- camera ----------
    const wh = () => headPos(cast.will);
    const pairs = { halt: 'will', will: 'halt' };
    const shots = [
      [0, () => drift({ pos: [0.8, 1.6, 1.8], target: [-3.6, 1.4, WIN.z], fov: 40 }, t)],
      [tFolder, () => drift({ pos: [DESK[0] + 0.5, 1.35, DESK[1] + 0.9], target: [DESK[0] - 0.2, 0.84, DESK[1] + 0.05], fov: 32 }, t, 0.01)],
      [tOpen, () => drift({ pos: [DESK[0] - 0.5, 1.3, DESK[1] - 0.75], target: wh(), fov: 34 }, t, 0.01)],
      [tBlank, () => { const p = env.paper.position; return { pos: [p.x + 0.05, p.y + 0.35, p.z + 0.3], target: [p.x, p.y, p.z], fov: 30 }; }],
      [tWhat, () => drift(shotOn(cast.will, { angle: 0.25, dist: 0.8, fov: 28 }), t, 0.01)],
      [tCorner, () => blendShot({ pos: [0.2, 1.4, 0.8], target: [CHAIR[0], 1.0, CHAIR[1]], fov: 40 }, { pos: [1.4, 1.3, -0.6], target: [CHAIR[0], 1.05, CHAIR[1]], fov: 30 }, ramp(t, tCorner, tSting, 'sine'))],
      [tSpin, () => drift({ pos: [atDesk[0] - 0.6, 1.0, atDesk[1] + 1.2], target: wh(), fov: 34 }, t, 0.03)],
      [tSpin + 1.1, () => drift({ pos: [0.6, 0.7, -0.1], target: hh, fov: 36 }, t, 0.01)],                                // Halt rises into the light, from low
      [tWasnt, () => coverage(ctx, t, cast, pairs, { startWide: false, toward: [0, 3] }) || shotOn(cast.halt, {})],
      [tPick, () => ({ pos: [standAt[0] - 2.0, 1.3, standAt[1] + 2.2], target: [standAt[0] - 0.3, 0.7, standAt[1] + 0.3], fov: 40 })],
      [tReal, () => coverage(ctx, t, cast, pairs, { startWide: false, toward: [0, 3] }) || shotOn(cast.halt, {})],
      [tDrop, () => drift(twoShot(cast.will, cast.halt, { fov: 36, toward: [0, 3] }), t)],
      [tNow, () => coverage(ctx, t, cast, pairs, { startWide: false, toward: [0, 3] }) || shotOn(cast.will, {})],
      [tStairs + 3.6, () => drift({ pos: [-1.6, 1.6, 2.4], target: [3.2, 1.3, DOOR[1] - 0.3], fov: 40 }, t)],             // the door opens: torchlight
      [tFarm, () => coverage(ctx, t, cast, pairs, { startWide: false, toward: [0, 3] }) || shotOn(cast.will, {})],
      [tToDoor, () => drift({ pos: [-1.8, 1.5, 1.6], target: [DOOR[0] - 0.7, 1.3, DOOR[1]], fov: 38 }, t)],
      [tHow, () => drift(shotOn(cast.will, { angle: 0.3, dist: 1.1, fov: 30 }), t)],
      [tSits, () => drift({ pos: [1.2, 1.4, -0.8], target: hh, fov: 34 }, t, 0.01)],
      [tExact, () => drift(blendShot(shotOn(cast.halt, { angle: 0.2, dist: 1.0, fov: 28 }), shotOn(cast.halt, { angle: 0.2, dist: 0.6, fov: 24 }), ramp(t, tExact, tOut)), t, 0.005)],
      [tOut, () => drift({ pos: [-1.0, 1.6, 2.0], target: [2.4, 1.2, -0.6], fov: 44 }, t)],
      [tLaugh, () => drift(shotOn(cast.halt, { angle: 0.25, dist: 0.7, fov: 26 }), t, 0.004)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    const overlay = (g, W, H) => speedLines(g, W, H, t, clamp(1 - Math.abs(t - tSting - 0.15) / 0.4) * 0.8, 0.5, 0.45);
    // the room falls dark when the door closes
    const dark = ramp(t, tOut + 1.6, tOut + 2.4) * 0.75;
    return { poses: { will, halt }, camera: cam, overlay, fade: dark };
  },
};
