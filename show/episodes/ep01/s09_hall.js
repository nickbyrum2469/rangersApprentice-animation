// SCENE 9: The Baron's great hall. The Choosing: each ward steps forward; Will is refused;
// Halt crosses the hall and hands the Baron a folded paper.
import * as THREE from 'three';
import { toon, inked, tex } from '../../lib/toon.js';
import { room, box, table, windowMesh, banner, torch, motes, door, stoneMat, props } from '../../lib/kit.js';
import { P, add, ramp, key, walkPath, faceTo, shotOn, twoShot, overShoulder, drift, blendShot, headPos, coverage, clamp, lerp } from '../../lib/director.js';

const DAIS_Y = 0.4, TABLE_Z = -19.2;
const BARON = [0, -20.4];
const LINE_Z = -12.8, FRONT_Z = -15.6;
const WARDS = { horace: -1.6, alyss: -0.8, jenny: 0, george: 0.8, will: 1.6 };
const MASTERS = { rodney: 2.4, pauline: 3.4, chubb: 4.35, nigel: 5.3, farmer2: 6.3, farmer1: 7.3 };
const MZ = -18.2;
const HALT0 = [-4.2, -15.8];

function throne() {
  const g = new THREE.Group(); const m = toon('#5a2a1a');
  const seat = box(1.3, 0.12, 1.0, m); seat.position.y = 0.55; g.add(seat);
  const back = box(1.3, 2.2, 0.15, m); back.position.set(0, 1.6, -0.45); g.add(back);
  const cushion = box(1.1, 0.1, 0.85, toon('#8a1e22')); cushion.position.y = 0.65; g.add(cushion);
  for (const x of [-0.6, 0.6]) { const a = box(0.12, 0.5, 1.0, m); a.position.set(x, 0.85, 0); g.add(a); }
  return g;
}

export default {
  cast: ['baron', 'rodney', 'pauline', 'chubb', 'nigel', 'farmer1', 'farmer2', 'halt', 'horace', 'alyss', 'jenny', 'george', 'will'],
  rim: '#fff0d4', rimStrength: 0.5, bloom: 0.45, fill: 0.45,
  build({ S, scene, cast }) {
    scene.background = new THREE.Color('#1e1812');
    scene.fog = new THREE.Fog('#3a2c20', 22, 55);
    const hall = room(S, { w: 14, d: 34, h: 9, wallBase: '#a89478', floor: 'flag', open: ['front'], beams: true });
    hall.position.z = -7;
    // dais, long table and throne
    const dais = box(14, DAIS_Y, 5, stoneMat('#9a8a74', [3, 1], 81)); dais.position.set(0, DAIS_Y / 2, -21.5); S.add(dais);
    const tb = table(6, 1.3, 0.85, '#5a3a22'); tb.position.set(0, DAIS_Y, TABLE_Z); S.add(tb);
    const cloth = box(6.1, 0.4, 1.35, toon('#7a1a1e'), 0.006); cloth.position.set(0, DAIS_Y + 0.68, TABLE_Z); S.add(cloth);
    const th = throne(); th.position.set(BARON[0], DAIS_Y, BARON[1] - 0.1); S.add(th);
    const folder = props.folder(); folder.position.set(0.9, DAIS_Y + 0.9, TABLE_Z + 0.1); S.add(folder);
    const paper = props.paper(); paper.visible = false; S.add(paper);
    // pillars, banners, torches, tall windows
    for (let z = -16; z <= 6; z += 5.5) for (const x of [-5.2, 5.2]) {
      const p = inked(new THREE.CylinderGeometry(0.45, 0.5, 9, 14), stoneMat('#a08c70', [1, 3], 82), 0.02); p.position.set(x, 4.5, z); S.add(p);
    }
    for (let z = -14; z <= 4; z += 5.5) for (const x of [-6.8, 6.8]) { const b = banner(1.2, 3.6); b.position.set(x, 7.6, z); b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; S.add(b); }
    const bb = banner(2.2, 5); bb.position.set(0, 8.4, -23.7); S.add(bb);
    [[-4.7, 3.2, -16], [4.7, 3.2, -16], [-4.7, 3.2, -5], [4.7, 3.2, -5]].forEach((p) => torch(S, p, { intensity: 2.0, dist: 10 }));
    for (let z = -18; z <= 6; z += 6) for (const x of [-6.78, 6.78]) { const w = windowMesh(1.2, 3.2, true, '#fff2d6'); w.position.set(x, 3.5, z + 2.5); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; S.add(w); }
    const sun = new THREE.DirectionalLight('#fff0d8', 1.1); sun.position.set(-14, 12, -4); sun.target.position.set(0, 0, -10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 14, bottom: -6, near: 1, far: 60 });
    S.add(sun); S.add(sun.target);
    S.add(new THREE.HemisphereLight('#ffe4c0', '#3a2a1a', 0.7));
    motes(S, [0, 0.5, -10], [12, 7, 22], { n: 260, color: '#fff2d0', sz: 0.04, speed: 0.1 });
    const list = props.paper(); list.scale.set(1.3, 1, 1.6); cast.baron.attach('list', list, 'R');
    cast.chubb.attach('ladle', props.ladle(), 'R').rotation.set(Math.PI, 0, 0);
    const haltPaper = props.paper(); cast.halt.attach('paper', haltPaper, 'R');
    return { folder, paper, list, haltPaper };
  },

  frame({ t, ctx, cast, env }) {
    const L = (m, k = 0) => ctx.line(m, k), A = (m) => ctx.act(m);
    const tRod = A('SIR RODNEY, Battle').s, tPau = A('LADY PAULINE').s, tChu = A('MASTER CHUBB, ladle').s, tNig = A('MASTER NIGEL').s, tHF = A('HORSEMASTER').s, tHalt = A('And in the shadow').s;
    const tMorning = L('Good morning').s, tBread = L('Bread waits').s, tQuite = L('Quite right').s;
    const tHorF = A('Horace marches').s, tHorB = L('Battleschool, my lord.', 0).s, tCirc1 = A('walks a slow circle').s, tStrong = L('Strong. Good reach').s, tSag = A('sags with relief').s;
    const tAlyss = L('Alyss Mainwaring').s, tCurtsy = A('curtsies perfectly').s, tDiplo = L('The Diplomatic Service').s, tPauline = L('She came in asking').s;
    const tJenny = L('Jenny.').s, tKitch = L('The kitchens!').s, tSauce = L('Can you make a sauce').s, tLumps = L('I can make a sauce').s, tNarrow = A("Chubb's eyes narrow").s, tYes = L('Hm. Yes. Fine').s;
    const tGeorge = L('George Carter').s, tScribe = L('Scribeschool').s, tNigel = L('He argues').s, tLaugh = ctx.sfx('soft_crowd_laugh');
    const tWill = L('And Will.').s, tWillF = A('Will steps forward').s, tWillB = L('Battleschool, my lord.', 1).s, tCirc2 = A('walks the same slow circle').s;
    const tSmall = L("You're very small").s, tFast = L("I'm fast").s, tClimb = L("It isn't about climbing").s, tPlease = L('Please, sir').s, tFlicker = A('Something flickers').s;
    const tNo = ctx.lines.find((l) => l.text.trim() === 'No.'), tSilent = A('The hall is silent').s, tOther = L('another craft').s, tNoLord = L('No, my lord').s, tSigh = A('The Baron sighs').s;
    const tPlace = A('He places a folded').s, tUnfold = A('The Baron unfolds').s, tDecide = L("I'll give you my decision").s, tMyLord = L('My lord, I').s, tTomorrow = L('Tomorrow.').s, tFold = A('He folds the paper').s, tEyes = A("Close on Will's eyes").s;

    const poses = {};
    const baronH = () => headPos(cast.baron);
    // ---------- wards ----------
    const turnFor = {
      horace: [tHorF, tSag + 1.2], alyss: [tCurtsy - 0.6, tPauline + 4.8], jenny: [tKitch - 0.4, tYes + 1.6], george: [tScribe - 0.6, tLaugh + 0.8], will: [tWillF, 1e9],
    };
    for (const [id, x] of Object.entries(WARDS)) {
      const [a, b] = turnFor[id];
      const fwd = ramp(t, a, a + 1.0) * (1 - ramp(t, b, b + 1.2));
      const z = lerp(LINE_Z, FRONT_Z, fwd);
      const moving = (t > a && t < a + 1.0) || (t > b && t < b + 1.2);
      const ph = (t - a) * 1.6;
      let p = add(moving ? P.walk(ph, 1) : P.stand(), { pos: [x * (1 - fwd * 0.8), 0, z], yaw: Math.PI + (moving && t > b ? 0 : 0), face: 'neutral', gesture: 0.5 });
      if (!moving && fwd < 0.1) p = add(p, P.handsBehind());
      poses[id] = p;
    }
    // individual acting
    poses.horace.face = t < tHorB ? 'determined' : t < tSag ? 'worried' : t < tSag + 2 ? 'grin' : t > tFlicker && t < tSigh ? 'sad' : 'proud';
    if (t > tSag && t < tSag + 1.2) poses.horace = add(poses.horace, { spine: { bend: 0.25 }, head: { nod: 0.3 } });
    if (t > tSilent && t < tSigh) poses.horace = add(poses.horace, { head: { nod: 0.5 }, lookAt: [WARDS.horace, 0, -13] });
    poses.alyss.face = t > tPauline ? 'happy' : t > tCurtsy ? 'neutral' : 'neutral';
    if (t > tCurtsy && t < tCurtsy + 1.3) poses.alyss = add(poses.alyss, P.curtsy(Math.sin(((t - tCurtsy) / 1.3) * Math.PI)));
    poses.jenny.face = t < tKitch ? 'worried' : t < tSauce ? 'surprised' : t < tYes ? 'determined' : t < tYes + 3 ? 'laugh' : 'happy';
    if (t > tKitch && t < tKitch + 3) poses.jenny = add(poses.jenny, { armL: { fwd: 1.1, bend: 1.8, out: -0.3 }, armR: { fwd: 1.1, bend: 1.8, out: -0.3 } });
    if (t > tYes + 0.5 && t < tYes + 2.5) poses.jenny = add(poses.jenny, { hipY: Math.abs(Math.sin(t * 10)) * 0.06 });
    poses.george.face = t < tScribe ? 'worried' : t < tNigel ? 'determined' : t < tLaugh + 1 ? 'embarrassed' : 'happy';
    if (t > tScribe && t < tNigel) {
      const k = Math.floor((t - tScribe) / 2.8) % 3;
      poses.george = add(poses.george, k === 0 ? P.point('R', 0.3) : k === 1 ? P.chin('R') : P.shrug(0.6));
    }
    // Will
    poses.will.face = t < tWill ? (t > tHalt && t < tMorning ? 'curious' : 'worried') : t < tSmall ? 'determined' : t < tFast + 1 ? 'worried' : t < tPlease ? 'scared' : t < tNo.s ? 'hurt' : t < tPlace ? 'sad' : t < tEyes ? 'surprised' : 'curious';
    if (t > tHalt && t < tMorning) poses.will.lookAt = headPos(cast.halt);
    if (t > tFast && t < tFast + 2.5) poses.will = add(poses.will, P.fist('R'));
    if (t > tPlease && t < tFlicker) poses.will = add(poses.will, { armL: { fwd: 0.6, bend: 0.4 }, armR: { fwd: 0.6, bend: 0.4 }, spine: { bend: 0.1 } });
    if (t > tUnfold - 0.5) poses.will.lookAt = [0, DAIS_Y + 1.1, TABLE_Z];

    // ---------- Rodney: circles the candidates ----------
    const circle = (ward, t0, dur) => {
      const c = [WARDS[ward] * 0.2, FRONT_Z];
      const a = ramp(t, t0, t0 + dur, 'linear') * Math.PI * 2 + Math.PI;
      return { pos: [c[0] + Math.sin(a) * 0.95, 0, c[1] + Math.cos(a) * 0.95], yaw: a + Math.PI / 2, ph: (t - t0) * 1.5 };
    };
    let rod;
    const rodHome = [MASTERS.rodney, DAIS_Y, MZ];
    const inCircle = (t > tCirc1 - 1 && t < tSag + 1) ? ['horace', tCirc1 - 0.6, tStrong - tCirc1 + 0.6] : (t > tCirc2 - 1 && t < tNo.e + 1.5) ? ['will', tCirc2 - 0.6, tSmall - tCirc2 + 0.6] : null;
    if (inCircle && t > inCircle[1] && t < inCircle[1] + inCircle[2]) {
      const c = circle(inCircle[0], inCircle[1], inCircle[2]);
      rod = add(P.walk(c.ph, 0.7), P.handsBehind(), { pos: c.pos, yaw: c.yaw, face: 'stern', lookAt: headPos(cast[inCircle[0]]) });
      if (inCircle[0] === 'horace' && t > inCircle[1] + inCircle[2] - 0.8) rod = add(rod, P.reach('R', 0.8));
    } else if (inCircle) {
      const w = inCircle[0];
      rod = add(P.handsBehind(), { pos: [WARDS[w] * 0.2 + 0.9, 0, FRONT_Z - 0.9], yaw: faceTo([WARDS[w] * 0.2 + 0.9, 0, FRONT_Z - 0.9], [WARDS[w] * 0.2, 0, FRONT_Z]), face: w === 'horace' ? 'smirk' : 'stern', lookAt: headPos(cast[w]) });
      if (w === 'will' && t > tNo.s - 0.2 && t < tNo.e + 0.3) rod = add(rod, { head: { turn: Math.sin(t * 10) * 0.25 } });
    } else rod = add(P.handsBehind(), { pos: rodHome, yaw: -0.25, face: 'stern' });
    poses.rodney = rod;

    // ---------- other masters ----------
    poses.pauline = add(P.handsBehind(), { pos: [MASTERS.pauline, DAIS_Y, MZ], yaw: -0.2, face: t > tPauline && t < tJenny ? 'smirk' : 'neutral' });
    poses.chubb = add(t > tBread - 0.2 && t < tBread + 2 ? P.point('R', 0.2) : P.handsOnHips(), { pos: [MASTERS.chubb, DAIS_Y, MZ], yaw: -0.25, face: t > tNarrow && t < tYes ? 'stern' : t > tYes && t < tGeorge ? 'smirk' : 'stern' });
    poses.nigel = add(P.handsBehind(), { pos: [MASTERS.nigel, DAIS_Y, MZ], yaw: -0.25, face: t > tNigel && t < tWill ? 'smirk' : 'neutral' });
    poses.farmer2 = add(P.armsCrossed(), { pos: [MASTERS.farmer2, DAIS_Y, MZ], yaw: -0.25, face: 'neutral' });
    poses.farmer1 = add(P.handsBehind(), { pos: [MASTERS.farmer1, DAIS_Y, MZ], yaw: -0.25, face: 'happy' });

    // ---------- the Baron ----------
    let baron = add(P.sit('down'), { pos: [BARON[0], DAIS_Y + 0.66 - cast.baron.dim.leg + 0.1, BARON[1]], yaw: 0, face: 'happy', gesture: 0.9 });
    baron = add(baron, t > tQuite && t < tSigh + 1 ? { armR: { fwd: 1.2, bend: 1.3, out: -0.1 } } : { armL: { fwd: 0.9, bend: 0.8 }, armR: { fwd: 0.9, bend: 0.8 } });
    baron.face = t < tBread ? 'grin' : t < tWill ? 'happy' : t < tFlicker ? 'neutral' : t < tSigh ? 'sad' : t < tUnfold + 0.6 ? 'worried' : t < tDecide ? 'surprised' : 'stern';
    if (t > tUnfold - 0.2 && t < tFold + 0.5) baron = add(baron, { armL: { fwd: 1.3, bend: 1.2, out: -0.2 }, armR: { fwd: 1.3, bend: 1.2, out: -0.2 }, head: { nod: 0.3 } });
    if (t > tUnfold + 1.5 && t < tDecide) baron.lookAt = headPos(cast.will);
    poses.baron = baron;
    env.list.visible = t > tQuite + 0.6 && t < tSigh + 1;

    // ---------- Halt: in the shadows; crosses the hall with the paper ----------
    const hp = walkPath(t, [HALT0, [-1.8, -17.2], [-0.4, TABLE_Z + 1.0]], tSigh + 1.0, tPlace, { stride: 0.55 });
    const hback = walkPath(t, [[-0.4, TABLE_Z + 1.0], [-1.8, -17.2], HALT0], tPlace + 1.4, tUnfold + 2.0, { stride: 0.55 });
    let halt;
    if (t < tSigh + 1.0) halt = add(P.armsCrossed(), { pos: [HALT0[0], 0, HALT0[1]], yaw: 0.8, hood: 1, face: 'stern', lookAt: t > tFlicker ? headPos(cast.will) : headPos(cast.baron), lookAmt: t > tFlicker ? 1 : 0.3 });
    else if (t < tPlace) halt = add(P.walk(hp.phase, 0.8), { pos: hp.pos, yaw: hp.yaw, hood: 1, face: 'stern' });
    else if (t < tPlace + 1.4) halt = add(P.reach('R', ramp(t, tPlace, tPlace + 0.5) * (1 - ramp(t, tPlace + 0.8, tPlace + 1.3))), { pos: [-0.4, 0, TABLE_Z + 1.0], yaw: Math.PI, hood: 1, face: 'stern', lookAt: baronH() });
    else if (t < tUnfold + 2.0) halt = add(P.walk(hback.phase, 0.8), { pos: hback.pos, yaw: hback.yaw, hood: 1, face: 'stern' });
    else halt = add(P.armsCrossed(), { pos: [HALT0[0], 0, HALT0[1]], yaw: 0.8, hood: 1, face: 'stern', lookAt: headPos(cast.will) });
    halt.cloak = { wind: 0.25 };
    poses.halt = halt;
    env.haltPaper.visible = t > tSigh && t < tPlace + 0.7;
    // the paper: on the table, then in the Baron's hands, then into the folder
    env.paper.visible = t > tPlace + 0.7;
    if (t < tUnfold) env.paper.position.set(-0.3, DAIS_Y + 0.9, TABLE_Z + 0.3);
    else if (t < tFold) { const h = new THREE.Vector3(); cast.baron.arms.R.hand.getWorldPosition(h); env.paper.position.set(h.x - 0.12, h.y + 0.05, h.z + 0.05); env.paper.rotation.set(-1.2, 0, 0); }
    else { const k = ramp(t, tFold, tFold + 1.0); env.paper.position.set(lerp(-0.2, 0.9, k), DAIS_Y + 0.92, TABLE_Z + 0.1); env.paper.rotation.set(0, 0, 0); }
    // crowd parts for Halt: wards lean away as he passes
    if (t > tSigh + 1 && t < tPlace) for (const id of ['horace', 'alyss']) poses[id] = add(poses[id], { spine: { side: 0.12 }, lookAt: headPos(cast.halt) });

    // ---------- camera ----------
    const S_ = (id, o) => shotOn(cast[id], o);
    const masterShot = (id) => drift(S_(id, { angle: 0.25, dist: 1.5, fov: 30 }), t, 0.02);
    // who is being addressed right now: the Baron and the masters talk to the ward who stepped forward
    const ward = t < tAlyss ? 'horace' : t < tJenny ? 'alyss' : t < tGeorge ? 'jenny' : t < tWill ? 'george' : 'will';
    const pairs = { baron: ward, chubb: ward === 'jenny' ? 'jenny' : 'baron', rodney: ward, pauline: ward, nigel: ward, horace: ward === 'horace' ? 'rodney' : 'baron', alyss: 'pauline', jenny: 'chubb', george: 'nigel', will: t < tFast ? 'baron' : 'rodney' };
    const shots = [
      [0, () => blendShot({ pos: [0, 4.5, 8], target: [0, 2.5, -20], fov: 44 }, { pos: [0, 2.6, -6], target: [0, 2.0, -20], fov: 40 }, ramp(t, 0, tRod, 'sine'))],
      [tRod, () => masterShot('rodney')], [tPau, () => masterShot('pauline')], [tChu, () => masterShot('chubb')], [tNig, () => masterShot('nigel')],
      [tHF, () => drift(twoShot(cast.farmer2, cast.farmer1, { fov: 34 }), t)],
      [tHalt, () => drift(blendShot({ pos: [-1.8, 1.7, -12.8], target: headPos(cast.halt), fov: 34 }, { pos: [-2.6, 1.7, -14.0], target: headPos(cast.halt), fov: 28 }, ramp(t, tHalt, tHalt + 2.5)), t, 0.01)],
      [tHalt + 2.6, () => drift(S_('will', { angle: -0.4, dist: 0.9 }), t)],
      [tMorning, () => drift(S_('baron', { angle: 0.2, dist: 2.0, fov: 32 }), t)],
      [tBread, () => masterShot('chubb')],
      [tQuite, () => drift(S_('baron', { angle: -0.3, dist: 1.8, fov: 32 }), t)],
      [tHorF, () => drift({ pos: [-3.2, 1.3, -11], target: headPos(cast.horace), fov: 38 }, t)],
      [tHorB, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('horace', {})],
      [tCirc1, () => drift({ pos: [-0.3, 2.2, -11.6], target: [-0.2, 1.3, FRONT_Z], fov: 36 }, t)],
      [tStrong, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('rodney', {})],
      [tSag, () => drift(S_('horace', { angle: 0.3, dist: 1.0 }), t)],
      [tAlyss, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('baron', {})],
      [tCurtsy, () => drift({ pos: [-2.5, 1.2, -12.6], target: headPos(cast.alyss), fov: 36 }, t)],
      [tDiplo, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('alyss', {})],
      [tNarrow, () => masterShot('chubb')], [tNarrow + 0.8, () => drift(S_('baron', { angle: 0.4, dist: 1.4 }), t)],
      [tYes, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('chubb', {})],
      [tLaugh, () => drift({ pos: [2.5, 2.0, -11], target: [0, 1.4, -16], fov: 42 }, t)],
      [tWill, () => drift(S_('baron', { angle: 0.1, dist: 1.5, fov: 30 }), t)],
      [tWillF, () => drift({ pos: [0, 7.5, -5], target: [0.3, 0.8, FRONT_Z], fov: 40 }, t)],           // tiny Will in the huge hall
      [tWillB, () => drift(S_('will', { angle: 0.2, dist: 0.9 }), t)],
      [tCirc2, () => drift({ pos: [1.6, 0.9, -12.2], target: headPos(cast.rodney), fov: 38 }, t)],     // Rodney towering, from Will's height
      [tSmall, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('will', {})],
      [tFlicker, () => drift(S_('baron', { angle: 0.15, dist: 1.0, fov: 28 }), t, 0.01)],
      [tFlicker + 1.0, () => drift({ pos: [-2.6, 1.7, -14.2], target: headPos(cast.halt), fov: 26 }, t, 0.01)],
      [tNo.s - 0.1, () => drift(S_('rodney', { angle: 0.2, dist: 0.9, fov: 28 }), t, 0.01)],
      [tSilent, () => drift({ pos: [0, 5.5, -3], target: [0, 1, -16], fov: 42 }, t)],
      [tSilent + 0.8, () => drift(S_('horace', { angle: -0.3, dist: 0.9 }), t)],
      [tOther, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('baron', {})],
      [tSigh, () => drift(S_('baron', { angle: 0.3, dist: 1.4 }), t)],
      [tSigh + 1.2, () => drift({ pos: [3.0, 1.3, -11.5], target: headPos(cast.halt), fov: 40 }, t)],
      [tPlace, () => ({ pos: [0.9, DAIS_Y + 1.7, TABLE_Z + 1.2], target: [-0.3, DAIS_Y + 0.9, TABLE_Z + 0.3], fov: 36 })],   // the paper on the table
      [tUnfold, () => drift(S_('baron', { angle: -0.2, dist: 1.0, fov: 28 }), t, 0.01)],
      [tUnfold + 1.8, () => drift(S_('will', { angle: 0.1, dist: 0.8, fov: 28 }), t, 0.01)],
      [tDecide, () => coverage(ctx, t, cast, pairs, { startWide: false, noOTS: ['baron'], toward: [0, -6] }) || S_('baron', {})],
      [tFold, () => ({ pos: [0.6, DAIS_Y + 1.4, TABLE_Z + 1.0], target: [0.6, DAIS_Y + 0.9, TABLE_Z + 0.1], fov: 34 })],
      [tEyes, () => { const h = headPos(cast.will); return { pos: [h[0] + 0.05, h[1] + 0.02, h[2] - 0.32], target: [h[0], h[1] + 0.02, h[2]], fov: 30 }; }], // extreme close-up
    ];
    let cam = shots[0][1];
    for (const [at, f] of shots) if (t >= at) cam = f;
    return { poses, camera: cam };
  },
};
