// Style test for the v2 rig: jab → parry → counter → caught kick → throw → roll up → duck → uppercut.
// Contacts are AIMED: [target 'who.part', stop-short, dy, pass]. Pass 0 = attacks, 1 = reactions to attacks, 2 = reactions to those.
import { Track } from './rig2.js';
import { Fight, wide, park, W, H } from './stage2.js';

const r = new Track('red', { phase: 0 }), b = new Track('blue', { phase: 1.9 });

// walk in, arms loose
r.at(0, 'idle', { x: -170, f: 1 }).at(0.2, 'idle').at(0.7, 'fight', { x: -52, walk: 1, bob: 2 }).at(0.82, 'fight', { walk: 0, bob: 2 });
b.at(0, 'idle', { x: 170, f: -1 }).at(0.2, 'idle').at(0.7, 'fight', { x: 52, walk: 1, bob: 2 }).at(0.84, 'fight', { walk: 0, bob: 2 });
// 1. Red jab → Blue parries it down
r.at(0.92, 'jab', { dx: 16, e: 'out', aim: { hA: ['blue.C', 30, -4, 0] } });
b.at(0.92, 'fight', { e: 'out', hB: [14, 70], aim: { hA: ['red.hA', 0, 0, 1] } });
b.at(1.02, 'fight', { hA: [36, 56], e: 'out' });
r.at(1.02, 'jab', { e: 'out', aim: { hA: ['blue.hA', 0, 0, 2] } });
// 2. Blue counters straight to Red's face
b.at(1.08, 'step', { hA: [16, 70] }).at(1.16, 'reach', { dx: -10, e: 'out', hA: [10, 78], aim: { hB: ['red.C', 16, 0, 0] } });
r.at(1.16, 'fight', { dx: -10, hA: [30, 70] });
r.at(1.32, 'recoil', { dx: -34, e: 'out' }).at(1.5, 'fight', { dx: -8 });
b.at(1.36, 'fight', { e: 'out' });
// 3. Red's front kick → Blue CATCHES it
r.at(1.62, 'chamber', { e: 'in' }).at(1.74, 'kick', { dx: 16, e: 'out', aim: { fA: ['blue.N', 22, -24, 0] } });
b.at(1.66, 'fight').at(1.76, 'pull', { e: 'out', aim: { hA: ['red.fA', -4, 4, 1], hB: ['red.fA', 4, -2, 1] } });
// Red hops on one leg while Blue holds the foot
b.at(1.9, 'pull', { dx: -4, hA: [40, 74], hB: [34, 68], e: 'io' }).at(2.04, 'pull', { dx: -2, hA: [44, 80], hB: [38, 74] });
r.at(1.9, 'hop', { dx: -2, fB: [-4, 14], aim: { fA: ['blue.hA', 0, 0, 2] } })
  .at(2.04, 'hop', { dx: 2, fB: [-4, 0], aim: { fA: ['blue.hA', 0, 0, 2] } })
  .at(2.16, 'hop', { fB: [-4, 12], aim: { fA: ['blue.hA', 0, 0, 2] } });
// 4. Blue heaves: Red flips backward, slams down, bounces, rolls up
b.at(2.16, 'pull', { hA: [40, 84], hB: [34, 78] }).at(2.26, 'heave', { e: 'out' }).at(2.6, 'fight', { e: 'io' });
r.at(2.26, 'tuck', { dx: -10, y: 26, rot: 70, e: 'out' })
  .at(2.62, 'sprawl', { x: -240, y: 0, arc: 120, rot: 360, e: 'lin' })
  .at(2.74, 'sprawl', { x: -262, y: 16, rot: 372, e: 'out' })
  .at(2.86, 'tuck', { x: -284, y: -18, rot: 520, e: 'in' })
  .at(3.08, 'tuck', { x: -318, y: -18, rot: 720, e: 'lin' })
  .at(3.2, 'kneel', { x: -326, y: 0, rot: 720, e: 'out' }).at(3.45, 'fight', { x: -322, bob: 2 });
b.at(2.9, 'beckon', { dx: 4 }).at(3.0, 'beckon', { hA: [30, 104] }).at(3.1, 'beckon', { hA: [46, 96] }).at(3.25, 'fight', { bob: 2 });
// 5. Red charges, ducks Blue's straight, uppercut launches Blue
r.at(3.55, 'crouch', { x: -318 }).at(3.8, 'lunge', { x: -84, e: 'in' });
b.at(3.7, 'step', { dx: -4 }).at(3.86, 'reach', { dx: -10, e: 'out', hA: [10, 78], aim: { hB: ['red.C', -30, 50, 0] } });   // aimed where Red's head WAS
r.at(3.88, 'duck', { dx: 8, e: 'out' }).at(3.96, 'duck', { hA: [24, 30] });
r.at(4.06, 'upper', { dx: 6, e: 'out', aim: { hA: ['blue.C', 2, -16, 0] } });
b.hold(4.06);
b.at(4.4, 'airhit', { x: 130, y: 120, rot: 160, e: 'out' })
  .at(4.74, 'tuck', { x: 214, y: 10, rot: 330, e: 'in' })
  .at(4.84, 'land', { x: 232, y: 0, rot: 360, e: 'out' })
  .at(5.15, 'land', { x: 268, e: 'out' })
  .at(5.6, 'fight', { x: 262, bob: 2 });
r.at(4.3, 'upper').at(4.7, 'fight', { dx: 8, bob: 2 }).hold(6.2);
b.hold(6.2);

const events = [
  { t: 0.92, type: 'block', at: 'red.hA' },
  { t: 1.16, type: 'hit', at: 'blue.hB', power: 2 },
  { t: 1.76, type: 'grab', at: 'blue.hA' },
  { t: 2.62, type: 'land', x: -240, power: 1.6 }, { t: 2.86, type: 'dust', x: -284, power: 0.8 }, { t: 3.2, type: 'dust', x: -326, dir: -1, power: 0.7 },
  { t: 4.06, type: 'hit', at: 'red.hA', power: 4 },
  { t: 4.84, type: 'land', x: 232, dir: 1, power: 1.3 }, { t: 5.0, type: 'dust', x: 250, dir: 1, power: 1 },
];
const cues = [
  { t: 0, type: 'music', cue: 'fight' }, { t: 6.0, type: 'music', cue: 'end' },
  { t: 0.3, type: 'step', x: -140 }, { t: 0.45, type: 'step', x: -100 }, { t: 0.35, type: 'step', x: 140 }, { t: 0.5, type: 'step', x: 100 },
  { t: 1.62, type: 'cloth' }, { t: 1.9, type: 'step', x: -60 }, { t: 2.04, type: 'step', x: -60 }, { t: 2.26, type: 'cloth' },
  { t: 3.6, type: 'step', x: -260 }, { t: 3.7, type: 'step', x: -180 }, { t: 4.84, type: 'slide', dur: 0.35, x: 250 },
];

export const fight = new Fight({
  end: 6.2,
  fighters: {
    red: { track: r, color: '#e8262b' },
    blue: { track: b, color: '#1f8fff' },
  },
  events, cues,
  camera: (t, F) => wide(F, t, { zoom: 1.75, oy: 108 }),
  scene: park,
  overlay(ctx, t) {
    ctx.font = '42px Anton, Impact, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left';
    ctx.fillText('RED vs BLUE  ·  style test', 48, H - 48);
  },
});
