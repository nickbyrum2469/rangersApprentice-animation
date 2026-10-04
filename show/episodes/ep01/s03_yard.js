// SCENE 3: Behind the kitchens. Will in the hay; Jenny brings the cakes she saved for him.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { sky, ground, box, door, windowMesh, hay, barrel, crate, props, motes, tower, wall, stoneMat, roof } from '../../lib/kit.js';
import { P, add, ramp, walkPath, shotOn, twoShot, drift, blendShot, headPos, coverage } from '../../lib/director.js';

const SEAT = 0.48;
const WILL = [-1.0, -0.4], JEN = [-0.25, -0.35], DOOR = [3.2, -1.7];

export default {
  cast: ['will', 'jenny'],
  rim: '#fff0d0', rimStrength: 0.5, bloom: 0.3,
  build({ S, scene, cast }) {
    scene.fog = new THREE.Fog('#cfe2f0', 30, 120);
    sky(S, { top: '#3f7fd0', mid: '#9fd0f0', bottom: '#e8f2f8', sunDir: [-0.5, 0.6, 0.6], sunCol: '#fff8e0', sunSize: 0.6, glow: 0.4 });
    const sun = new THREE.DirectionalLight('#fff4e0', 1.5);
    sun.position.set(-8, 12, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -6 });
    S.add(sun);
    S.add(new THREE.HemisphereLight('#dceeff', '#8a7a5a', 0.9));
    const g = ground(S, 80, '#ffffff', tex.dirt('#b39b74'));
    // the kitchen building: plaster over stone with dark timbers
    const bld = box(12, 4.6, 6, toon('#ffffff', { map: tex.plaster('#ece0c4', 31) }));
    bld.position.set(0, 2.3, -5); S.add(bld);
    const base = box(12.1, 0.8, 6.1, stoneMat('#a49882', [3, 0.3], 32)); base.position.set(0, 0.4, -5); S.add(base);
    const tm = toon('#4a3020');
    for (const x of [-5.8, -3, 0.6, 5.8]) { const b = box(0.22, 4.6, 0.1, tm, 0.008); b.position.set(x, 2.3, -1.97); S.add(b); }
    const beam = box(12, 0.22, 0.1, tm, 0.008); beam.position.set(0, 3.4, -1.97); S.add(beam);
    const th = tex.thatch('#c9a560'); th.repeat.set(3, 2);
    const rf = roof(6.8, 12.6, 3, '#c9a560', th); rf.rotation.y = Math.PI / 2; rf.position.set(0, 4.6, -5); S.add(rf);
    const ch = box(0.9, 2.2, 0.9, stoneMat('#9a8e7a', [0.5, 1], 33)); ch.position.set(-3.5, 6.6, -5.5); S.add(ch);
    motes(S, [-3.5, 7.6, -5.5], [0.6, 4, 0.6], { n: 50, color: '#e8e8e8', sz: 0.12, speed: 0.2, rise: 0.4 });
    const wn = windowMesh(1.0, 0.9, false); wn.position.set(WILL[0], 1.75, -1.98); S.add(wn);
    const sill = box(1.3, 0.08, 0.3, toon('#8a7258')); sill.position.set(WILL[0], 1.72, -1.86); S.add(sill);
    const dr = door(1.2, 2.2, '#6a4428'); dr.position.set(DOOR[0], 0, -1.96); S.add(dr);
    // hay pile Will landed in, barrels, crates, a cart
    const hy = hay(0.9); hy.position.set(-0.6, 0, -0.75); hy.scale.set(1.5, 0.62, 0.75); S.add(hy);
    const hy2 = hay(0.6); hy2.position.set(-0.65, 0, -0.25); hy2.scale.set(1.6, 0.5, 0.6); S.add(hy2);
    [[-4.6, -1.3], [-5.3, -0.6], [5.2, -1.2]].forEach(([x, z]) => { const b = barrel(); b.position.set(x, 0, z); S.add(b); });
    [[4.6, 0.2], [5.4, 0.4]].forEach(([x, z], i) => { const c = crate(0.7); c.position.set(x, 0.35, z); c.rotation.y = i * 0.6; S.add(c); });
    // castle beyond the roof
    const tw = tower(3, 20, { base: '#b3a68e', roofH: 7 }); tw.position.set(-9, 0, -26); S.add(tw);
    const kw = wall(40, 9, 2, { base: '#b3a68e' }); kw.position.set(0, 0, -32); S.add(kw);
    // straw bits stuck in Will's hair
    const straw = toon('#e8c860');
    for (let i = 0; i < 6; i++) {
      const s = inked(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), straw, 0.002);
      s.position.set((i - 2.5) * 0.05, 0.12 + (i % 2) * 0.02, -0.02 + (i % 3) * 0.04); s.rotation.set(i * 0.7, i, 0.9 + i * 0.4);
      cast.will.head.add(s);
    }
    const cakes = [0, 1, 2, 3].map((i) => { const c = props.cake(); c.position.set(JEN[0] - 0.4 + i * 0.09, SEAT + 0.06, JEN[1] + 0.32); c.visible = false; S.add(c); return c; });
    const cloth = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), toon('#e8dcc0', { side: THREE.DoubleSide })); cloth.rotation.x = -Math.PI / 2; cloth.position.set(JEN[0] - 0.27, SEAT + 0.03, JEN[1] + 0.32); cloth.visible = false; S.add(cloth);
    const bundle = inked(new THREE.SphereGeometry(0.11, 10, 8), toon('#e8dcc0'), 0.004); cast.jenny.attach('bundle', bundle, 'L');
    const wc = props.cake(); cast.will.attach('cake', wc, 'R').position.set(0, -0.04, 0.03);
    const jc = props.cake(); cast.jenny.attach('cake', jc, 'R').position.set(0, -0.04, 0.03);
    return { cakes, cloth, bundle, wc, jc };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m) => ctx.line(m);
    const tGot = L('I got one').s, tTerr = L('terrible at stealing').s, tOpen = ctx.act('She opens the bundle').s, tHero = L("You're a hero").s;
    const tKnow = L('I know').s, tNo = L('No.').s, tNerv = L("You're nervous").s, tBit = L('A bit').s, tChubb = L('Not even slightly').s;
    const tStill = L('Still Battleschool.').s, tLooks = ctx.act('Jenny looks at him').s, tBoth = L('Better eat both').s;

    // Jenny walks out of the door and sits beside him
    const jw = walkPath(t, [[DOOR[0], DOOR[1] + 0.3], [1.4, 0.6], [JEN[0] + 0.1, JEN[1] + 0.7], JEN], tGot - 0.4, tTerr - 0.2, { stride: 0.5 });
    const sat = t > tTerr - 0.2;
    const sitK = ramp(t, tTerr - 0.2, tTerr + 0.3);
    let jenny;
    if (!sat) jenny = add(P.walk(jw.phase, 1), { pos: jw.pos, yaw: jw.yaw, face: 'smirk' });
    else {
      jenny = add(P.sit('down'), { pos: [JEN[0], SEAT - cast.jenny.dim.leg + 0.08 - (1 - sitK) * 0.3, JEN[1]], yaw: -0.25, face: 'smirk' });
      if (t > tOpen && t < tHero) jenny = add(jenny, P.reach('L', 0.8), P.reach('R', 0.6));
      if (t > tKnow + 0.6 && t < tKnow + 1.6) jenny = add(jenny, P.reach('R', 0.9));
      if (t > tKnow + 1.6 && t < tChubb) jenny = add(jenny, P.eat(t, 'R'));
      if (t > tLooks + 0.8 && t < tBoth + 1) jenny = add(jenny, P.reach('R', 0.7), { spine: { side: 0.12 } });
    }
    jenny.face = t < tOpen ? 'smirk' : t < tKnow ? 'happy' : t < tNo ? 'proud' : t < tNerv + 0.8 ? 'smirk' : t < tChubb ? 'curious' : t < tStill ? 'proud' : t < tBoth ? 'worried' : 'happy';
    if (t > tChubb + 4.5 && t < tStill) jenny.face = 'curious';
    env.bundle.visible = t < tOpen + 0.4;
    env.cloth.visible = t >= tOpen + 0.4;
    const willTook = t > tHero + 0.6, jenTook = t > tKnow + 1.1;
    env.cakes.forEach((c, i) => (c.visible = t >= tOpen + 0.4 && !(i === 0 && willTook) && !(i === 3 && jenTook)));
    env.jc.visible = jenTook && t < tChubb + 2;

    // Will: rubbing his sore head, then delighted, then quietly stubborn
    let will = add(P.sit('down'), { pos: [WILL[0], SEAT - cast.will.dim.leg + 0.06, WILL[1]], yaw: 0.3, spine: { bend: -0.1 } });
    if (t < tTerr) will = add(will, { armR: { fwd: 2.6, bend: 1.9, out: 0.4 + Math.sin(t * 7) * 0.1 }, face: 'hurt', head: { tilt: -0.15 } });
    else will = add(will, { face: 'curious' });
    if (t > tHero - 0.3 && t < tHero + 0.6) will = add(will, P.reach('R', 1));
    if (t > tHero + 0.6 && t < tKnow + 2) will = add(will, P.eat(t, 'R'));
    will.face = t < tTerr ? 'hurt' : t < tOpen ? 'embarrassed' : t < tKnow ? 'grin' : t < tNo ? 'happy' : t < tNerv ? 'determined' : t < tChubb ? 'embarrassed' : t < tStill ? 'curious' : t < tLooks ? 'determined' : 'neutral';
    env.wc.visible = t > tHero + 0.6 || (t > tLooks + 1.5);

    const pairs = { will: 'jenny', jenny: 'will' };
    const shots = [
      [0, () => blendShot({ pos: [3.5, 3.0, 6.5], target: [-0.6, 1.4, -1.5], fov: 38 }, { pos: [2.2, 1.6, 4.5], target: headPos(cast.will), fov: 34 }, ramp(t, 0, tGot + 1.5, 'sine'))],
      [tGot + 1.5, () => drift(shotOn(cast.will, { angle: 0.2, dist: 1.0 }), t)],
      [tTerr - 0.6, () => drift(twoShot(cast.will, cast.jenny, { fov: 34, dist: 2.2 }), t)],
      [tHero, () => coverage(ctx, t, cast, pairs, { startWide: false, sideBySide: true }) || twoShot(cast.will, cast.jenny)],
      [tLooks, () => drift(shotOn(cast.jenny, { angle: -0.5, dist: 1.0, fov: 30 }), t)],
      [tLooks + 1.4, () => drift(blendShot(twoShot(cast.will, cast.jenny, { fov: 34, dist: 2.0 }), twoShot(cast.will, cast.jenny, { fov: 30, dist: 3.4 }), ramp(t, tLooks + 1.4, ctx.dur)), t)],
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses: { will, jenny }, camera: cam };
  },
};
