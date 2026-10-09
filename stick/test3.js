// Style test 3: dusk rooftop, tight framing, lit fighters, big poses, planted feet, one big hit.
import { Track } from './rig3.js';
import { Fight, two, on, W, H } from './stage4.js';
import { dusk, beams, foreground, grade, SET } from './dusk.js';

// exaggerated poses: strong line of action
const P = {
  lunge:   { hip: [18, 50], torso: 42, bend: 8, head: 12, hA: [92, 96], hB: [-34, 66], fA: [42, 0], fB: [-48, 4] },
  slip:    { hip: [-8, 58], torso: 132, bend: -18, head: 26, hA: [12, 104], hB: [-22, 94], fA: [28, 0], fB: [-28, 0] },
  wind:    { hip: [-6, 60], torso: 98, bend: -6, head: -6, hA: [24, 96], hB: [-38, 104], fA: [24, 0], fB: [-30, 0] },
  hook:    { hip: [14, 56], torso: 60, bend: 12, head: 6, hA: [20, 84], hB: [64, 120], fA: [36, 0], fB: [-26, 2] },
  block:   { hip: [-6, 58], torso: 98, bend: -6, head: -18, hA: [26, 132], hB: [18, 98], fA: [22, 0], fB: [-32, 0] },
  spin:    { hip: [0, 36], torso: 58, bend: 14, head: 16, hA: [-30, 50], hB: [30, 56], fA: [24, 0], fB: [-30, 0] },
  sweep:   { hip: [-6, 22], torso: 66, bend: 12, head: 14, hA: [18, 2], hB: [-36, 44], fA: [86, 6], fB: [-12, 0], kA: -1 },
  tuck:    { hip: [0, 54], torso: 88, bend: 20, head: 8, hA: [26, 76], hB: [14, 68], fA: [20, 28], fB: [4, 22] },
  axeUp:   { hip: [0, 64], torso: 104, bend: -8, head: -12, hA: [-12, 96], hB: [-34, 88], fA: [30, 132], fB: [-6, 22], kA: 1 },
  axeDown: { hip: [0, 64], torso: 84, bend: 10, head: -4, hA: [-16, 92], hB: [-36, 84], fA: [62, 44], fB: [-8, 18] },
  xblock:  { hip: [-4, 44], torso: 84, bend: 8, head: -8, hA: [26, 128], hB: [34, 122], fA: [30, 0], fB: [-34, 0] },
  shove:   { hip: [2, 64], torso: 92, bend: -4, head: -16, hA: [30, 150], hB: [38, 146], fA: [26, 0], fB: [-30, 0] },
  run:     { hip: [10, 58], torso: 50, bend: 10, head: 20, hA: [-34, 66], hB: [36, 82], fA: [30, 8], fB: [-36, 22] },
  knee:    { hip: [0, 62], torso: 76, bend: 10, head: -6, hA: [-24, 100], hB: [-40, 92], fA: [30, 64], fB: [-14, 22] },
  upper:   { hip: [12, 70], torso: 98, bend: -10, head: -16, hA: [44, 176], hB: [-34, 62], fA: [32, 0], fB: [-32, 10] },
  airhit:  { hip: [0, 60], torso: 156, bend: -22, head: 44, hA: [-38, 118], hB: [8, 134], fA: [40, 26], fB: [18, 6] },
  slump:   { hip: [6, 16], torso: 100, bend: 16, head: 34, hA: [28, 4], hB: [12, 8], fA: [66, 0], fB: [54, 0] },
  kneel:   { hip: [-6, 36], torso: 68, bend: 14, head: 14, hA: [38, 4], hB: [-28, 40], fA: [24, 0], fB: [-36, 4] },
  stance:  { hip: [0, 60], torso: 78, bend: 8, head: -8, hA: [30, 80], hB: [10, 70], fA: [26, 0], fB: [-28, 0] },
  beckon:  { hip: [0, 64], torso: 86, bend: 2, head: -8, hA: [52, 100], hB: [-8, 40], fA: [20, 0], fB: [-20, 0] },
};

const r = new Track('red', { phase: 0 }), b = new Track('blue', { phase: 1.9 });
const BX = SET.beams[0];

// 1. Red explodes forward — Blue slips back, the punch whiffs
r.at(0, P.stance, { x: -62, f: 1, bob: 2 }).at(0.3, P.stance, { x: -62, bob: 2 }).at(0.42, 'crouch', { x: -70, e: 'out' })
  .at(0.56, P.lunge, { x: -14, e: 'out' }).at(0.72, P.stance, { x: -10 });
b.at(0, P.stance, { x: 64, f: -1, bob: 2 }).at(0.46, P.stance, { x: 64, bob: 2 }).at(0.56, P.slip, { x: 74, e: 'out' }).at(0.7, P.stance, { x: 68 });
// 2. Blue answers with a hook — Red blocks it with the forearm
b.at(0.78, P.wind, { x: 66 }).at(0.88, P.hook, { x: 56, e: 'out', aim: { hB: ['red.C', 20, 2, 0] } }).at(0.98, P.stance, { x: 62 });
r.at(0.8, P.stance).at(0.88, P.block, { e: 'out', aim: { hA: ['blue.hB', 0, 0, 1] } }).at(0.98, P.stance);
// 3. Red drops into a spinning sweep — Blue leaps over it and drops an axe kick — Red catches it crossed-arm, knees buckle
r.at(1.06, P.spin, { f: -1 }).at(1.16, P.sweep, { f: 1, e: 'out' }).at(1.3, 'crouch', { x: -10 })
  .at(1.44, P.xblock, { e: 'out', aim: { hA: ['blue.fA', 0, 0, 1], hB: ['blue.fA', -6, -6, 1] } }).at(1.56, P.xblock, { hip: [-4, 36] });
b.at(1.06, 'crouch', { x: 66 }).at(1.16, P.tuck, { x: 64, y: 54, e: 'out' }).at(1.3, P.axeUp, { x: 52, y: 70 })
  .at(1.44, P.axeDown, { x: 40, y: 34, e: 'out', aim: { fA: ['red.C', 0, 20, 0] } });
// 4. Red shoves him off — Blue backflips away
r.at(1.66, P.shove, { e: 'out' }).at(1.84, P.stance, { x: -8, bob: 2 });
b.at(1.66, P.tuck, { x: 70, y: 70, rot: 120, e: 'out' }).at(1.86, P.tuck, { x: 120, y: 30, rot: 300 }).at(1.96, 'land', { x: 132, y: 0, rot: 360, e: 'out' });
// 5. Blue rushes in with a flying knee — Red rises into an uppercut — BIG HIT — Blue crashes into the steel beams
b.at(2.08, 'crouch', { x: 130 }).at(2.22, P.run, { x: 84, e: 'in' }).at(2.34, P.knee, { x: 46, y: 32, e: 'out' });
r.at(2.16, P.stance, { x: -4 }).at(2.3, 'crouch', { x: 0, e: 'out' })
  .at(2.4, P.upper, { x: 6, e: 'out', aim: { hA: ['blue.C', 0, -16, 0] } }).hold(2.62).at(2.85, P.stance, { x: 10, bob: 2 });
b.hold(2.4).at(2.58, P.airhit, { x: 150, y: 150, rot: 470, e: 'out' }).at(2.82, P.airhit, { x: BX - 34, y: 70, rot: 520, e: 'lin' })
  .at(2.98, P.airhit, { x: BX - 30, y: 30, rot: 540, e: 'in' }).at(3.16, P.slump, { x: BX - 36, y: 0, rot: 720, e: 'out' });
// 6. Blue gets back up. Red: "come on."
b.at(3.6, P.slump, { head: 10 }).at(3.95, P.kneel, { x: BX - 50 }).at(4.35, P.stance, { x: BX - 56, bob: 2 }).hold(5.2);
r.at(3.7, P.stance, { x: 14, bob: 2 }).at(4.05, P.beckon, { x: 18 }).at(4.15, P.beckon, { hA: [38, 112] }).at(4.25, P.beckon, { hA: [52, 100] })
  .at(4.35, P.beckon, { hA: [38, 112] }).at(4.55, P.stance, { bob: 2 }).hold(5.2);

const events = [
  { t: 0.56, type: 'dust', x: -40, dir: -1, power: 0.6 },
  { t: 0.88, type: 'block', at: 'blue.hB' },
  { t: 1.16, type: 'dust', x: 50, power: 0.8 },
  { t: 1.44, type: 'block', at: 'blue.fA', power: 2 }, { t: 1.46, type: 'dust', x: -10, power: 1.3 },
  { t: 1.96, type: 'land', x: 132, power: 0.8 },
  { t: 2.4, type: 'hit', at: 'red.hA', power: 5 },
  { t: 2.82, type: 'clang', x: BX - 2, y: 72, power: 3, by: 'blue' },
  { t: 2.84, type: 'dust', x: BX - 20, dir: -1, power: 1.4 },
  { t: 3.16, type: 'land', x: BX - 36, power: 0.7 },
];
const cues = [
  { t: 0, type: 'music', cue: 'fight' }, { t: 4.7, type: 'music', cue: 'end' },
  { t: 0.42, type: 'step', x: -70 }, { t: 2.2, type: 'step', x: 100 }, { t: 2.3, type: 'cloth' }, { t: 3.95, type: 'step', x: BX - 50 },
];
const shots = [
  { t: 0, cam: two({ zoom: 2.45, oy: 4 }) },
  { t: 1.0, cam: two({ zoom: 2.0, oy: 40, rot: -3 }), blend: 0.16 },
  { t: 2.04, cam: on('red', { zoom: 2.4, ox: 40, oy: 10, rot: 4 }) },
  { t: 2.42, cam: on('blue', { zoom: 1.75, ox: 30, oy: 10, lag: 0.22 }), whip: 1 },
  { t: 3.05, cam: two({ zoom: 1.55, oy: 30 }) },
  { t: 3.45, cam: on('blue', { zoom: 2.7, oy: 6, rot: -2 }) },
  { t: 3.98, cam: on('red', { zoom: 2.8, oy: 8, rot: 2 }) },
];

const END = 4.75;
export const fight = new Fight({
  end: END + 1.4,
  fighters: {
    red: { track: r, color: '#ff2d2d', glow: '#ff3b2f', trail: '#ff6a3d' },
    blue: { track: b, color: '#1f9bff', glow: '#2aa6ff', trail: '#55c8ff' },
  },
  events, cues, shots,
  scene: dusk, set: (ctx, t) => beams(ctx, t), front: foreground, grade,
  overlay(ctx, t) {
    if (t < END) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const u = Math.min(1, (t - END - 0.2) / 0.15); if (u <= 0) return;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.5 - 0.5 * u, 1.5 - 0.5 * u); ctx.globalAlpha = u;
    ctx.font = '130px Anton, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff2d2d'; ctx.fillText('RED', -230, 0); ctx.fillStyle = '#fff'; ctx.fillText('vs', 0, 0); ctx.fillStyle = '#1f9bff'; ctx.fillText('BLUE', 250, 0);
    ctx.restore();
  },
});
