// SCENE 1: Redmont at dawn. Valley flyover → Will on the keep roof → he spots the Ranger.
import * as THREE from 'three';
import { sky, hills, forest, scatterOnHills, house, clouds, props, motes, rand } from '../../lib/kit.js';
import { P, key, ramp, add, faceTo, shotOn, drift, blendShot, headPos, walkPath, lerp, clamp } from '../../lib/director.js';
import { Horse } from '../../lib/horse.js';
import { buildRedmont, KEEP, TOWER } from './redmont.js';

const RIVER = (x) => 95 + Math.sin(x / 55) * 22;
const terrain = (x, z) => {
  const r = Math.hypot(x, z);
  let h = r < 34 ? 0 : -16 * THREE.MathUtils.smoothstep(r, 34, 95);          // castle hill
  h += (Math.sin(x * 0.021) * Math.cos(z * 0.017) * 9 + Math.sin(x * 0.05 + 1) * 3) * THREE.MathUtils.smoothstep(r, 60, 140);
  const dr = Math.abs(z - RIVER(x));
  if (dr < 14) h = Math.min(h, -16.5 - (1 - dr / 14) * 1.5);                  // river bed
  return h;
};
const HALT_PATH = [[147, 6], [147, 30], [148, 52]];

export default {
  cast: ['will', 'halt'],
  fadeIn: 2.0,
  rim: '#ffcf9a', rimStrength: 0.45, bloom: 0.35,
  build({ S, scene, ctx, cast }) {
    scene.fog = new THREE.Fog('#f0c4a0', 140, 650);
    sky(S, { top: '#4a6aa8', mid: '#f2b088', bottom: '#ffdcae', sunDir: [1, 0.07, 0.32], sunCol: '#fff0c8', sunSize: 1.6, glow: 0.9 });
    clouds(S, 14, 400, 70, '#ffd6c0', 0.8);
    const sun = new THREE.DirectionalLight('#ffd6ac', 1.7);
    sun.position.set(100, 22, 36); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 });
    S.add(sun); S.add(sun.target);
    S.add(new THREE.HemisphereLight('#ffe2c8', '#6a7a58', 0.95));

    const land = hills(S, {
      size: 900, seg: 140, fn: terrain, y: 0,
      vcolor: (x, z, y) => {   // patchwork farm fields on the lowland, greener on the castle hill
        const r = Math.hypot(x, z);
        if (r < 36) return '#9aa860';
        const f = Math.floor(x / 26) * 7 + Math.floor(z / 20) * 13;
        const pal = ['#8db158', '#a8bb5a', '#c9b45e', '#7fa04e', '#b8c26a', '#98a84a'];
        return Math.abs(z - RIVER(x)) < 20 ? '#7a9a4a' : pal[((f % 6) + 6) % 6];
      },
    });
    // river
    const pts = []; for (let x = -450; x <= 450; x += 15) pts.push(new THREE.Vector3(x, -16.3, RIVER(x)));
    const curve = new THREE.CatmullRomCurve3(pts);
    const river = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 5.5, 6), new THREE.MeshToonMaterial({ color: '#7ab0d0' }));
    river.scale.y = 0.05; river.position.y = -15.5; S.add(river);

    buildRedmont(S, { lit: false });
    // village on the slope below the gate
    const r = rand(12);
    for (let i = 0; i < 26; i++) {
      const a = 0.4 + r() * 1.9, d = 55 + r() * 45;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(z - RIVER(x)) < 14) continue;
      const hs = house(3 + r() * 2.5, 3 + r() * 1.5, 2.4 + r(), i);
      hs.position.set(x, terrain(x, z), z); hs.rotation.y = a + Math.PI / 2 + (r() - 0.5) * 0.4; S.add(hs);
    }
    // forests: dense band to the east (the Ranger's woods) + scattered woods
    const east = []; const rr = rand(4);
    for (let i = 0; i < 700; i++) { const x = 156 + rr() * 90, z = -160 + rr() * 330; east.push([x, terrain(x, z), z]); }
    forest(S, east, { scale: 3.6, pineRatio: 0.55, seed: 2 });
    forest(S, scatterOnHills({ heightAt: (x, z) => terrain(x, z) }, 900, { minR: 120, maxR: 420, avoid: (x, z) => x > 140 || Math.abs(z - RIVER(x)) < 18 || (x > 30 && z > -10 && z < 70) }), { scale: 3.4, seed: 7 });
    motes(S, [0, 18, -8], [40, 14, 30], { n: 160, color: '#fff2c0', sz: 0.06, speed: 0.15 });

    // Halt on Abelard at the forest edge
    const horse = new Horse({ coat: '#6a4a30', mane: '#2a1e16' });
    scene.add(horse.root);
    cast.halt.root.scale.setScalar(1);
    cast.will.attach('apple', props.apple(), 'R').position.set(0, -0.05, 0.03);
    return { horse };
  },

  frame({ t, ctx, cast, env }) {
    const will = cast.will, halt = cast.halt;
    const RIDGE = KEEP.h + KEEP.roofH;
    const seat = [1.0, RIDGE - will.dim.leg + 0.12, KEEP.z];
    const tRise = ctx.act('camera rises').s, tSpot = ctx.act('He spots').s, tStops = ctx.act('The rider stops').s;
    const tUneasy = ctx.line("Can't have seen").s, tBell = ctx.sfx('church_bell'), tBreak = ctx.line('Breakfast').s, tGo = ctx.act('tosses the apple').s;

    // ---- Will ----
    let wp;
    const flinch = ramp(t, tStops + 1.4, tStops + 1.7, 'out') * (1 - ramp(t, tStops + 2.9, tStops + 3.5));
    if (t < tGo) {
      const chewing = t > tRise && t < tSpot - 0.5 && (t % 3) < 1.6;
      const lean = ramp(t, tSpot, tSpot + 1.2) * (1 - flinch);
      wp = add(P.sit('dangle'), {
        pos: [seat[0], seat[1] - flinch * 0.25, seat[2]], yaw: Math.PI / 2,
        legL: { out: 0.55, fwd: -0.9, bend: 0.4 }, legR: { out: 0.55, fwd: -0.9, bend: 0.4 },
        spine: { bend: lean * 0.28 + flinch * 0.6, side: -flinch * 0.2 },
        face: t < tSpot ? 'happy' : t < tStops + 1.4 ? 'curious' : t < tUneasy ? 'scared' : t < tBell ? 'worried' : t < tBreak ? 'surprised' : 'grin',
        armL: { fwd: 0.4, out: 0.35, bend: 0.4 },
      });
      wp = add(wp, chewing ? P.eat(t) : { armR: { fwd: 0.3 + lean * 0.15, bend: 0.5, out: 0.15 } });
      if (t < tSpot) wp.lookAt = [200, 30, KEEP.z + 40];
      else wp.lookAt = t > tStops + 1.4 && t < tStops + 3.0 ? [seat[0] + 5, seat[1] + 1.2, KEEP.z - 1.5] : headPos(halt);
      if (t > tUneasy && t < tBell) wp.face = { smile: 0.35, browAng: 0.6, brow: 0.3 };
    } else {
      // toss the core, slide down the front slope, drop out of frame
      const k = clamp((t - tGo) / 2.6);
      const slide = ramp(t, tGo + 0.5, tGo + 1.6, 'in');
      const drop = ramp(t, tGo + 1.6, tGo + 2.4, 'in');
      wp = add(slide > 0 ? P.fall(0.4) : P.swing(ramp(t, tGo, tGo + 0.4)), {
        pos: [seat[0] + 0.3, seat[1] - slide * 4.6 - drop * 6, KEEP.z + slide * 5.6 + drop * 1.5], yaw: 0.2,
        face: 'grin', spine: { bend: -0.3 * slide },
      });
      will.props.apple.visible = t < tGo + 0.35;
    }
    wp.gesture = 0.2;

    // ---- Halt & Abelard ----
    const hw = walkPath(t, HALT_PATH, tSpot - 2, tStops, { y: (x, z) => terrain(x, z), stride: 1.5 });
    const gone = t > tStops + 3.2;
    env.horse.root.visible = !gone;
    env.horse.apply({ pos: hw.pos, yaw: hw.yaw, phase: hw.phase, walk: hw.moving, t });
    const saddle = new THREE.Vector3(); env.horse.saddle.getWorldPosition(saddle);
    const hp = add(P.sit('down'), {
      pos: [saddle.x, saddle.y - halt.dim.leg + 0.1, saddle.z], yaw: hw.yaw, hood: 1, visible: !gone,
      legL: { out: 0.45, fwd: 0.8, bend: 0.9 }, legR: { out: 0.45, fwd: 0.8, bend: 0.9 }, cloak: { wind: 0.5 },
      armL: { fwd: 0.6, bend: 1.0 }, armR: { fwd: 0.6, bend: 1.0 }, face: 'stern',
      lookAt: t > tStops + 0.3 ? headPos(will) : [hw.pos[0], hw.pos[1] + 1.5, hw.pos[2] + 10], lookAmt: 1,
    });

    // ---- camera ----
    const wh = headPos(will);
    const pov = (target, fov) => ({ pos: [wh[0] + 0.3, wh[1] + 0.1, wh[2] + 0.2], target, fov });
    const halth = headPos(halt);
    const shots = [
      [0, () => blendShot({ pos: [260, 70, 120], target: [0, 10, 0], fov: 30 }, { pos: [150, 42, 95], target: [0, 14, 0], fov: 30 }, ramp(t, 0, 14, 'sine'))],
      [14.2, () => blendShot({ pos: [40, 8, 105], target: [0, 8, 20], fov: 38 }, { pos: [-30, 12, 92], target: [0, 10, 10], fov: 38 }, ramp(t, 14.2, 22.2, 'sine'))],
      [22.2, () => blendShot({ pos: [46, 30, 46], target: [0, 14, -8], fov: 35 }, { pos: [32, 27, 30], target: [3, 18, -10], fov: 35 }, ramp(t, 22.2, tRise, 'sine'))],
      [tRise, () => blendShot({ pos: [TOWER.x + 9, 6, TOWER.z + 12], target: [TOWER.x, 18, TOWER.z], fov: 40 }, { pos: [seat[0] + 6.5, RIDGE + 1.6, KEEP.z + 4.5], target: wh, fov: 34 }, ramp(t, tRise, tRise + 4.5))],
      [tRise + 4.6, () => drift(shotOn(will, { angle: 0.75, dist: 1.5, fov: 30 }), t)],
      [tSpot - 0.6, () => drift(shotOn(will, { angle: 0.25, dist: 0.85, fov: 30 }), t)],
      [tSpot + 1.8, () => pov(halth, 7)],
      [ctx.line('The Ranger').s, () => drift(shotOn(will, { angle: -0.35, dist: 1.0, fov: 30 }), t)],
      [tStops, () => blendShot(pov(halth, 6), pov(halth, 2.4), ramp(t, tStops + 0.2, tStops + 1.3, 'out'))],
      [tStops + 1.35, () => ({ pos: [seat[0] + 4.2, RIDGE + 0.8, KEEP.z + 3.5], target: [seat[0] + 1.5, RIDGE - 0.1, KEEP.z - 0.5], fov: 36 })],
      [tStops + 3.0, () => pov([HALT_PATH[2][0], terrain(151, 52) + 2.5, 52], 4.0)],
      [tUneasy, () => drift(shotOn(will, { angle: 0.4, dist: 1.0, fov: 30 }), t)],
      [tBell - 0.2, () => drift(shotOn(will, { angle: -0.4, dist: 0.8, fov: 30 }), t, 0.02)],
      [tGo, () => { const h = headPos(will); return { pos: [seat[0] + 4.5, RIDGE - 0.3 - ramp(t, tGo + 0.5, tGo + 2.4) * 4, KEEP.z + 6.5], target: h, fov: 38 }; }],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { will: wp, halt: hp }, camera: cam };
  },
};
