// Style test 2: city plaza. Uses the bench, the lamp post, the brick wall and the trash-can lid.
// aim: [target, stopShort, dy, pass]  — target 'who.part' | '@prop' | '#x,y' (a point in the set)
import { Track } from './rig3.js';
import { Fight, Prop, two, on, prop, fixed, W, H } from './stage3.js';
import { plaza, setPieces, drawLid, SET } from './plaza.js';

const r = new Track('red', { phase: 0 }), b = new Track('blue', { phase: 1.9 });
const WALL = SET.wall, POST = SET.post;

// ── intro: Red ready, Blue leaning on the lamp post ──
r.at(0, 'idle', { x: -60, f: 1 }).at(0.7, 'idle', { head: 12 }).at(1.1, 'idle', { head: -8 }).at(1.5, 'fight', { bob: 2 }).at(2.6, 'fight', { bob: 2 });
b.at(0, 'cool', { x: POST - 28, f: -1 }).at(2.0, 'cool').at(2.2, 'idle', { x: 190, e: 'out' })
  .at(2.45, 'beckon', { x: 172, walk: 1 }).at(2.55, 'beckon', { hA: [30, 106] }).at(2.65, 'beckon', { hA: [46, 98] }).at(2.8, 'fight', { x: 150, bob: 2 });

// ── exchange ──
r.at(2.78, 'crouch', { x: -56 }).at(2.95, 'run', { x: 10, e: 'in' })
  .at(3.05, 'jab', { x: 34, e: 'out', aim: { hA: ['blue.C', 26, 0, 0] } }).at(3.14, 'fight', { x: 36 })
  .at(3.23, 'cross', { x: 40, e: 'out', aim: { hB: ['blue.C', 24, -2, 0] } }).at(3.32, 'fight', { x: 38 })
  .at(3.38, 'chamber', { x: 38 }).at(3.48, 'rkick', { x: 42, e: 'out' }).at(3.6, 'fight', { x: 40 });
b.at(2.98, 'fight', { x: 140 })
  .at(3.05, 'guardHi', { e: 'out', aim: { hA: ['red.hA', 0, 0, 1] } }).at(3.14, 'fight')
  .at(3.23, 'guardHi', { e: 'out', aim: { hB: ['red.hB', 0, 0, 1] } }).at(3.33, 'fight')
  .at(3.44, 'duck', { e: 'out' }).at(3.54, 'duck')
  .at(3.64, 'body', { dx: -10, e: 'out', aim: { hB: ['red.chest', 0, 0, 0] } }).at(3.8, 'fight', { dx: -8 });
r.at(3.64, 'fight').at(3.8, 'hitBody', { x: 6, e: 'out' }).at(3.98, 'fight', { x: -24 });
// Blue sweeps low, Red hops back up onto the bench
b.at(3.95, 'fight', { x: 92 }).at(4.08, 'sweep', { x: 66, e: 'out' }).at(4.3, 'fight', { x: 70 });
r.at(4.02, 'crouch', { x: -30 }).at(4.14, 'tuck', { x: -96, y: 30, arc: 34, e: 'out' }).at(4.32, 'crouch', { x: -150, y: SET.bench[2], e: 'out' })
  .at(4.48, 'crouch', { y: SET.bench[2], hip: [-4, 36] });
// ── Red springs off the bench: flying kick, Blue crosses arms and slides ──
r.at(4.62, 'tuck', { x: -96, y: 92, e: 'out' }).at(4.78, 'flykick', { x: -24, y: 70, e: 'out', aim: { fA: ['blue.C', 30, -6, 0] } })
  .at(5.0, 'land', { x: -6, y: 0, e: 'in' }).at(5.25, 'fight', { x: -8 });
b.at(4.6, 'fight', { x: 64 }).at(4.78, 'cross2', { e: 'out', aim: { hA: ['red.fA', 0, 0, 1] } }).at(5.05, 'cross2', { x: 150, e: 'out' }).at(5.3, 'fight', { x: 160 });
// ── Blue grabs the lamp post, swings around it into a double kick ──
b.at(5.45, 'fight', { x: 182, aim: { hB: [`#${POST - 6},118`, 0, 0, 0] } })
  .at(5.58, 'tuck', { x: 200, y: 24, aim: { hB: [`#${POST - 6},120`, 0, 0, 0] } })
  .at(5.68, 'tuck', { x: 170, y: 46, rot: -20, aim: { hB: [`#${POST - 6},122`, 0, 0, 0] } })
  .at(5.82, 'dblkick', { x: 74, y: 44, rot: -10, e: 'out', aim: { fA: ['red.chest', 0, 0, 0], fB: ['red.chest', 0, -14, 0] } })
  .at(6.05, 'land', { x: 76, y: 0, rot: 0, e: 'in' }).at(6.35, 'fight', { x: 76 });
r.at(5.6, 'fight', { x: -6 }).hold(5.82);
// Red is launched across the plaza into the brick wall, slides down it
r.at(5.98, 'airhit', { x: -150, y: 62, rot: 16, e: 'out' }).at(6.28, 'airhit', { x: WALL + 40, y: 86, rot: 26, e: 'lin' })
  .at(6.45, 'hitHead', { x: WALL + 30, y: 34, rot: 0, e: 'in' }).at(6.75, 'sit', { x: WALL + 30, y: 0, e: 'out' })
  .at(6.95, 'sit', { head: 44 }).at(7.1, 'sit', { head: 6 }).at(7.25, 'sit', { head: 30 });
// ── Blue comes in for the finish; Red grabs the trash-can lid and blocks ──
b.at(6.6, 'idle', { x: 60 }).at(7.1, 'fight', { x: -150, walk: 1 }).at(7.32, 'run', { x: -200, walk: 0 })
  .at(7.48, 'tuck', { x: -250, y: 44 }).at(7.64, 'flykick', { x: -300, y: 30, e: 'out', aim: { fA: ['@lid', 6, 0, 2] } })
  .at(7.84, 'tuck', { x: -240, y: 56, rot: 30, e: 'out' }).at(8.04, 'land', { x: -210, y: 0, rot: 0, e: 'in' }).at(8.3, 'fight', { x: -205 });
r.at(7.4, 'sit', { head: 20, aim: { hA: [`#${SET.can[0]},${SET.can[1] + 2}`, 0, 0, 0] } })
  .at(7.58, 'sit', { torso: 92, head: 10, e: 'out', aim: { hA: [`#${WALL + 70},100`, 0, 0, 0] } })
  .at(7.7, 'sit', { torso: 92, head: 10, aim: { hA: [`#${WALL + 70},100`, 0, 0, 0] } })
  .at(7.9, 'sit', { torso: 92, head: 16, aim: { hA: [`#${WALL + 68},96`, 0, 0, 0] } })
  // springs up and frisbees the lid at Blue
  .at(8.1, 'kneel', { x: WALL + 50, loose: [0, 0.85] }).at(8.3, 'windup', { x: WALL + 60, loose: [0, 0.85] })
  .at(8.45, 'throw', { x: WALL + 80, e: 'out', loose: [0, 0.85] }).at(8.7, 'fight', { x: WALL + 76 });
b.at(8.5, 'lean', { e: 'out' }).at(8.8, 'fight');
// ── Blue charges again: Red ducks, Blue punches the WALL; Red kicks him into it ──
b.at(9.1, 'fight', { x: -250 }).at(9.28, 'run', { x: -320, e: 'in' })
  .at(9.42, 'cross', { x: -344, e: 'out', aim: { hB: [`#${WALL},128`, 0, 0, 0] } }).at(9.55, 'ouch', { x: -330, e: 'out' }).at(9.8, 'ouch', { hA: [26, 116] });
r.at(9.2, 'fight', { x: WALL + 40 }).at(9.38, 'duck', { x: WALL + 36, e: 'out' })
  .at(9.55, 'tuck', { x: WALL + 90, y: -20, rot: -180, e: 'lin' }).at(9.75, 'tuck', { x: WALL + 150, y: -20, rot: -360, e: 'lin' })
  .at(9.88, 'crouch', { x: -270, y: 0, rot: -360, f: -1 }).at(10.0, 'chamber', { x: -278, f: -1 })
  .at(10.12, 'rkick', { x: -282, e: 'out', aim: { fA: ['blue.chest', 0, 6, 0] } }).at(10.3, 'fight', { x: -280 });
b.at(10.12, 'ouch', { x: -332 }).at(10.26, 'hitBody', { x: WALL + 26, e: 'out' }).at(10.5, 'hitHead', { x: WALL + 64, e: 'out' })
  .at(10.75, 'fight', { x: WALL + 60, f: 1 });
// ── final clash ──
r.at(10.75, 'fight', { x: -230 }).at(10.95, 'run', { x: -262, e: 'in' }).at(11.12, 'cross', { x: -262, e: 'out', aim: { hB: ['#-315,114', 0, 0, 0] } })
  .at(11.45, 'crouch', { x: -170, e: 'out' }).at(11.9, 'fight', { x: -172, bob: 2 }).hold(13.2);
b.at(10.95, 'run', { x: -366, e: 'in' }).at(11.12, 'cross', { x: -366, e: 'out', aim: { hB: ['#-315,114', 0, 0, 0] } })
  .at(11.45, 'crouch', { x: WALL + 40, e: 'out' }).at(11.9, 'fight', { x: WALL + 44, bob: 2 }).hold(13.2);

// the lid: on the can → in Red's hand → thrown → hits the post → clatters down
const lid = new Prop('lid', drawLid);
lid.at(0, { x: SET.can[0], y: SET.can[1] + 4, face: 0 }).at(7.4, { x: SET.can[0], y: SET.can[1] + 4, face: 0 })
  .at(7.41, { attach: ['red', 'hA', 0, 0], face: 0.2 }).at(7.58, { attach: ['red', 'hA', 6, 0], face: 1 })
  .at(8.3, { attach: ['red', 'hA', 0, 0], face: 0.5, rot: -20 }).at(8.45, { attach: ['red', 'hA', 0, 0], face: 0.15, rot: 0 })
  .at(8.66, { x: -200, y: 128, face: 0.15, rot: 0 }).at(9.0, { x: POST - 30, y: 122, face: 0.2, rot: 20 })
  .at(9.22, { x: POST + 8, y: 54, face: 0.6, rot: 300, e: 'in' }).at(9.42, { x: POST + 40, y: 5, face: 0, rot: 360, e: 'out' });

const events = [
  { t: 3.05, type: 'block', at: 'red.hA' }, { t: 3.23, type: 'block', at: 'red.hB' },
  { t: 3.64, type: 'hit', at: 'blue.hB', power: 2 },
  { t: 4.08, type: 'dust', x: 0, power: 0.6 }, { t: 4.32, type: 'land', x: -150, power: 0.4 },
  { t: 4.78, type: 'block', at: 'red.fA', power: 2 }, { t: 4.8, type: 'dust', x: 70, dir: 1, power: 1.1 }, { t: 5.0, type: 'land', x: -6, power: 0.8 },
  { t: 5.45, type: 'grab', at: 'blue.hB', vs: `#${POST - 6},118` },
  { t: 5.82, type: 'hit', at: 'blue.fA', power: 4 },
  { t: 6.28, type: 'wallhit', x: WALL, y: 120, power: 4 }, { t: 6.75, type: 'dust', x: WALL + 30, dir: 1, power: 0.7 },
  { t: 6.05, type: 'land', x: 76, power: 0.8 },
  { t: 7.4, type: 'grab', at: 'red.hA', vs: '@lid', r: 24 },
  { t: 7.64, type: 'clang', at: 'blue.fA', vs: '@lid', r: 26 },
  { t: 8.04, type: 'land', x: -210, power: 0.8 },
  { t: 9.0, type: 'clang', x: POST - 22, y: 122, power: 1 },
  { t: 9.42, type: 'wallhit', x: WALL, y: 128, power: 1 },
  { t: 10.12, type: 'hit', at: 'red.fA', power: 3 },
  { t: 10.26, type: 'wallhit', x: WALL, y: 112, power: 2 },
  { t: 11.12, type: 'clash', x: -315, y: 114, power: 6 },
  { t: 11.2, type: 'dust', x: -260, dir: 1, power: 1.3 }, { t: 11.2, type: 'dust', x: -370, dir: -1, power: 1.3 },
];
const cues = [
  { t: 0, type: 'music', cue: 'fight' }, { t: 12.6, type: 'music', cue: 'end' },
  { t: 2.2, type: 'step', x: 190 }, { t: 2.5, type: 'step', x: 172 }, { t: 2.9, type: 'step', x: 0 }, { t: 4.3, type: 'step', x: -150 },
  { t: 7.2, type: 'step', x: -160 }, { t: 7.32, type: 'step', x: -200 }, { t: 8.3, type: 'cloth' }, { t: 9.28, type: 'step', x: -320 },
  { t: 9.55, type: 'cloth' }, { t: 9.9, type: 'step', x: -270 }, { t: 10.95, type: 'step', x: -262 }, { t: 11.2, type: 'slide', dur: 0.35, x: -200 },
  { t: 9.2, type: 'clatter', x: POST + 20 }, { t: 9.42, type: 'clatter', x: POST + 40 },
];

const shots = [
  { t: 0, cam: fixed(30, 130, 1.4, { dz: 0.03 }) },
  { t: 1.35, cam: on('red', { zoom: 2.9, oy: 46, rot: -2 }) },
  { t: 1.95, cam: on('blue', { zoom: 2.5, oy: 34, rot: 2 }) },
  { t: 2.8, cam: two({ zoom: 1.8, oy: 20 }) },
  { t: 4.22, cam: two({ zoom: 1.5, oy: 60, rot: -4 }), blend: 0.3 },
  { t: 5.35, cam: on('blue', { zoom: 1.85, ox: -30, oy: 20, rot: 3 }) },
  { t: 5.84, cam: on('red', { zoom: 1.3, ox: -70, oy: 30, lag: 0.25 }), whip: -1 },
  { t: 6.6, cam: on('red', { zoom: 2.1, ox: 40, oy: 20 }) },
  { t: 7.2, cam: two({ zoom: 1.75, oy: 20 }) },
  { t: 8.46, cam: prop('lid', { zoom: 1.55, ox: 60 }), whip: 1 },
  { t: 9.06, cam: two({ zoom: 1.8, oy: 24, rot: -2 }), whip: -1 },
  { t: 10.2, cam: on('blue', { zoom: 2.3, ox: 10, oy: 20, rot: 4 }) },
  { t: 10.62, cam: two({ zoom: 1.7, oy: 20 }) },
  { t: 10.98, cam: (t) => ({ x: -315, y: 120, zoom: 2.0 + (t - 10.98) * 1.2, rot: 3 }) },
  { t: 11.35, cam: two({ zoom: 1.6, oy: 40 }) },
];

const font = (px) => `${px}px Anton, Impact, sans-serif`;
const END = 12.6;
export const fight = new Fight({
  end: END + 1.8,
  fighters: { red: { track: r, color: '#e8262b' }, blue: { track: b, color: '#1f8fff' } },
  props: { lid }, events, cues, shots,
  slows: [{ a: 10.98, b: 11.12, rate: 0.35 }, { a: 11.12, b: 11.4, rate: 0.5 }],
  scene: plaza, set: (ctx, t) => setPieces(ctx, t),
  overlay(ctx, t) {
    if (t < END) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const u = Math.min(1, (t - END - 0.25) / 0.15);
    if (u <= 0) return;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1.6 - 0.6 * u, 1.6 - 0.6 * u); ctx.globalAlpha = u;
    ctx.font = font(150); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('TO BE CONTINUED', 0, 0);
    ctx.restore();
  },
});
