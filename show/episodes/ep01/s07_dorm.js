// SCENE 7: The wards' dormitory at night. Will in the moonlit window, Horace awake in the dark,
// George talking in his sleep. Ends on the title card: the moonlight becomes a sunrise.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, bed, stoneMat, sky, moon, forest, motes, rand } from '../../lib/kit.js';
import { P, add, ramp, shotOn, twoShot, drift, blendShot, headPos, clamp, lerp } from '../../lib/director.js';
import { titleText } from '../../lib/runtime.js';

const WIN = { x: 0, y: 0.95, w: 1.3, h: 1.4, z: -2.5 };
const BED_H = 0.59;

export default {
  cast: ['will', 'horace', 'george'],
  rim: '#a8c4ff', rimStrength: 0.4, bloom: 0.35, fill: 0.55, fillColor: '#8a9ae0', tint: [0.9, 0.95, 1.08], fadeOut: 0.01,
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#0a1020', 60, 260);
    sky(S, { top: '#04081a', mid: '#0e1a3a', bottom: '#24345a', sunDir: [0.2, 0.35, -1], sunCol: '#c8d8ff', sunSize: 0.0, glow: 0.25, stars: 1.0 });
    moon(S, [25, 45, -120], 7);
    // outside: dark forest under the moon
    const r = rand(7), trees = [];
    for (let i = 0; i < 260; i++) trees.push([(r() - 0.5) * 220, -6, -30 - r() * 120]);
    forest(S, trees, { scale: 4, seed: 3, colors: ['#142238', '#18283f', '#1c2c46'] });
    const land = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), toon('#101a2c')); land.rotation.x = -Math.PI / 2; land.position.set(0, -6, -120); S.add(land);

    room(S, { w: 6, d: 5, h: 3.2, wallBase: '#8a8070', floor: 'wood', open: ['front', 'back'], beams: true });
    // back wall with a deep window Will can sit in
    const wm = stoneMat('#8a8070', [1, 1], 71);
    const seg = (x, w, y, h) => { const b = box(w, h, 0.6, wm); b.position.set(x, y, WIN.z); S.add(b); };
    const x0 = WIN.x - WIN.w / 2, x1 = WIN.x + WIN.w / 2;
    seg((-3 + x0) / 2, x0 + 3, 1.6, 3.2); seg((x1 + 3) / 2, 3 - x1, 1.6, 3.2);
    seg(WIN.x, WIN.w, WIN.y / 2, WIN.y); seg(WIN.x, WIN.w, (3.2 + WIN.y + WIN.h) / 2, 3.2 - WIN.y - WIN.h);
    // beds: George (back left), Horace (front left), two empty on the right
    const beds = [[-2.0, -1.2, '#c8b8a0'], [-2.0, 1.2, '#b8a890'], [2.0, -1.2, '#c0b098'], [2.0, 1.2, '#c8b8a0']];
    beds.forEach(([x, z, c], i) => { const b = bed(c); b.position.set(x, 0, z); b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; S.add(b); });
    const chest = box(0.8, 0.5, 0.45, toon('#5a3a22')); chest.position.set(0, 0.25, 2.1); S.add(chest);

    // moonlight through the window, very little else
    const ml = new THREE.DirectionalLight('#8aa8f0', 0.95);
    ml.position.set(1.5, 4.5, -9); ml.target.position.set(-0.5, 0, 1); ml.castShadow = true;
    ml.shadow.mapSize.set(1024, 1024); ml.shadow.bias = -0.0005; ml.shadow.normalBias = 0.03;
    Object.assign(ml.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
    S.add(ml); S.add(ml.target);
    S.add(new THREE.HemisphereLight('#3a4a88', '#1a1418', 0.8));
    motes(S, [0, 0.4, -0.5], [2.4, 2.2, 3], { n: 70, color: '#c8d8ff', sz: 0.02, speed: 0.08 });

    // the carved wooden token
    const token = inked(new THREE.CylinderGeometry(0.045, 0.03, 0.012, 3), toon('#a87a4a'), 0.003);
    token.rotation.set(Math.PI / 2, 0, Math.PI); token.position.set(0, -0.05, 0.04);
    cast.will.attach('token', token, 'R');
    return { token };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m, k = 0) => ctx.line(m, k), A = (m) => ctx.act(m);
    const tObj = L('objection').s, tWill = L('Will.').s, tTrough = L('The trough').s, tTurns = A('Will turns, surprised').s, tCompl = L('almost a compliment').s;
    const tNo = L('Go to sleep').s, tScared = L('Are you scared').s, tSilence = A('A long silence').s, tAll = L("Battleschool's all").s;
    const tOrph = A("Will doesn't know what to say").s, tDoor = L('size of a door').s, tSnort = A('Horace snorts').s, tNight = L('Night, Will').s;
    const tToken = A('Pulls a small carved').s, tTomorrow = L('Tomorrow.').s, tWindow = A('The window fills').s, tTitle = A("RANGER'S APPRENTICE").s;

    // Will: knees up in the window seat, half-turned to the room
    let will = add(P.sitHug(), { pos: [0.1, WIN.y + 0.04 - cast.will.dim.leg + 0.12, WIN.z + 0.05], yaw: Math.PI / 2 + 0.25, face: 'neutral', idleAmt: 0.5,
      lookAt: t > tToken - 0.5 && t < tTomorrow + 0.3 ? [0.6, WIN.y + 0.2, WIN.z + 0.5] : t < tWill || t > tToken - 0.5 ? [WIN.x - 6, 2.5, -30] : headPos(cast.horace) });
    will.face = t < tTurns ? 'neutral' : t < tNo ? 'curious' : t < tAll ? 'worried' : t < tDoor ? 'sad' : t < tToken ? 'happy' : 'determined';
    if (t > tToken - 0.3) will = add(will, { armR: { fwd: 1.1, bend: 1.7, out: -0.35 }, head: { nod: 0.15 } });
    env.token.visible = t > tToken;

    // Horace on his back, then rolls over
    const roll = ramp(t, tSnort + 0.4, tSnort + 1.2);
    let horace = add({ armL: { fwd: 0.1, out: 0.2 }, armR: { fwd: 2.8, bend: 2.0, out: 0.3 } }, {
      pos: [-1.1, BED_H + 0.14 + roll * 0.05, 1.2], yaw: Math.PI / 2, pitch: -Math.PI / 2, roll: roll * 1.4, noIdle: true,
      face: t < tTrough ? 'neutral' : t < tCompl ? 'embarrassed' : t < tScared ? 'smirk' : t < tSnort ? 'sad' : 'happy',
      lookAt: t > tTrough && t < tTurns + 0.8 ? [0, 3.0, 1.2] : t > tWill - 0.3 && t < tSnort ? headPos(cast.will) : [-1.6, 3, 1.2], lookAmt: 0.7,
    });
    if (t > tSnort && t < tSnort + 0.4) horace.face = 'laugh';
    // George asleep on his side, mumbling
    const george = add({ armL: { fwd: 0.3, out: 0.1 }, armR: { fwd: 1.6, bend: 1.8, out: 0.2 } }, {
      pos: [-1.1, BED_H + 0.14, -1.2], yaw: Math.PI / 2, pitch: -Math.PI / 2, roll: 0.25, head: { turn: 0.4 }, noIdle: true, blink: 1, face: { smile: t > tObj && t < tObj + 2 ? -0.1 : 0.2 }, lookAt: null,
    });

    // ---- camera ----
    const wh = () => headPos(cast.will), hh = () => headPos(cast.horace);
    // Will sits in the window alcove, so his close-ups are always shot from the room side
    const willCam = (dx = 0, d = 1.0, fov = 30) => { const h = wh(); return { pos: [h[0] + 0.55 * d + dx, h[1] + 0.05, h[2] + 0.95 * d], target: [h[0], h[1] - 0.03, h[2]], fov }; };
    const shots = [
      [0, () => blendShot({ pos: [0.4, 1.9, 4.6], target: [0, 1.3, -2.3], fov: 42 }, { pos: [0.3, 1.6, 2.4], target: wh(), fov: 38 }, ramp(t, 0, tObj, 'sine'))],
      [tObj - 0.3, () => drift({ pos: [-2.1, 1.75, -0.55], target: headPos(cast.george), fov: 30 }, t, 0.01)],
      [tWill - 0.2, () => drift({ pos: [-0.3, 1.9, 1.3], target: hh(), fov: 34 }, t, 0.01)],                       // Horace, eyes on the ceiling
      [tWill + 0.8, () => drift(willCam(0.2, 1.1), t, 0.01)],
      [tTrough, () => drift({ pos: [-0.5, 1.7, 1.25], target: hh(), fov: 30 }, t, 0.01)],
      [tTurns, () => drift(willCam(-0.3, 0.9), t, 0.01)],
      [tNo, () => drift({ pos: [-0.5, 1.7, 1.25], target: hh(), fov: 30 }, t, 0.01)],
      [tScared, () => drift(willCam(0, 0.8, 28), t, 0.01)],
      [tSilence, () => drift(blendShot({ pos: [-0.7, 1.6, 1.1], target: hh(), fov: 30 }, { pos: [-0.8, 1.45, 1.15], target: hh(), fov: 24 }, ramp(t, tSilence, tOrph)), t, 0.005)],
      [tOrph, () => drift({ pos: [1.6, 2.3, 2.3], target: [-0.6, 0.9, 0], fov: 46 }, t, 0.01)],                       // two orphans in the dark
      [tDoor, () => drift(willCam(0.3, 1.0), t, 0.01)],
      [tSnort, () => drift({ pos: [-0.4, 1.8, 1.4], target: hh(), fov: 34 }, t, 0.01)],
      [tNight + 1.0, () => drift(willCam(0.1, 1.2, 32), t, 0.01)],
      [tToken, () => drift(blendShot(willCam(0.4, 0.9), willCam(0.2, 0.6, 28), ramp(t, tToken, tWindow)), t, 0.005)],
      [tWindow, () => blendShot({ pos: [0.6, 1.7, -0.6], target: [0, 1.8, -10], fov: 40 }, { pos: [0, 1.75, -3.4], target: [3, 8, -40], fov: 34 }, ramp(t, tWindow, tWindow + 2.0, 'in'))],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;

    // title card: the moonlight turns into a sunrise, then the series title
    const sunrise = ramp(t, tWindow + 0.8, tTitle + 0.2);
    const overlay = (g, W, H) => {
      if (sunrise <= 0) return;
      g.globalAlpha = sunrise;
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#2a3a7a'); gr.addColorStop(0.45, '#e88a6a'); gr.addColorStop(0.75, '#ffc87a'); gr.addColorStop(1, '#fff0c0');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const sx = W * 0.5, sy = H * (0.95 - 0.12 * ramp(t, tTitle, ctx.dur));
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.6);
      sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.12, 'rgba(255,230,160,0.9)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = sg; g.fillRect(0, 0, W, H);
      // painted cloud bands
      for (let i = 0; i < 7; i++) {
        const y = H * (0.18 + i * 0.07), x = ((i * 337 + t * 18) % (W + 600)) - 300;
        const cg = g.createRadialGradient(x, y, 10, x, y, 260);
        cg.addColorStop(0, `rgba(255,${190 + i * 6},${170 + i * 8},0.55)`); cg.addColorStop(1, 'rgba(255,200,180,0)');
        g.fillStyle = cg; g.beginPath(); g.ellipse(x, y, 320, 50, 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      const a = ramp(t, tTitle, tTitle + 1.2) * (1 - ramp(t, ctx.dur - 0.6, ctx.dur));
      titleText(g, W, H, "RANGER'S APPRENTICE", H * 0.43, a, { size: W * 0.062 });
      // oak-leaf rule under the title
      if (a > 0) {
        g.save(); g.globalAlpha = a; g.strokeStyle = '#fff3d6'; g.lineWidth = W * 0.0015;
        g.beginPath(); g.moveTo(W * 0.3, H * 0.52); g.lineTo(W * 0.47, H * 0.52); g.moveTo(W * 0.53, H * 0.52); g.lineTo(W * 0.7, H * 0.52); g.stroke();
        g.fillStyle = '#fff3d6'; g.beginPath(); g.ellipse(W * 0.5, H * 0.52, W * 0.012, W * 0.005, 0, 0, 7); g.fill();
        g.restore();
      }
      titleText(g, W, H, 'EPISODE ONE  ·  THE CHOOSING', H * 0.6, ramp(t, tTitle + 1.4, tTitle + 2.4) * (1 - ramp(t, ctx.dur - 0.6, ctx.dur)), { size: W * 0.021, weight: 500, spacing: 0.35, glow: 'rgba(255,220,180,0.4)' });
    };
    return { poses: { will, horace, george }, camera: cam, overlay };
  },
};
