// RED vs BLUE — Round 1: The Standoff.
// Choreography is written in story seconds. Hit-stops and slow motion stretch real time around it.
import { Track, clamp, lerp } from './engine.js';
import { Fight, follow, on, W, H } from './stage.js';
import { rooftop, embers } from './rooftop.js';

const r = new Track({ phase: 0 }), b = new Track({ phase: 1.7 });
const R = { f: 1 }, B = { f: -1 };

// --- standoff ---
r.at(0, 'stand', { x: -330, ...R }).at(1.3, 'stand', { head: -10 }).at(2.1, 'stand', { head: 2 }).hold(3.3);
b.at(0, 'stand', { x: 330, ...B }).hold(2.4).at(2.62, 'stand', { head: 22, e: 'out' }).at(2.8, 'stand', { head: -6, e: 'out' }).hold(3.9);
r.at(3.6, 'ready', { e: 'out' }).hold(4.6);
b.at(4.2, 'ready', { e: 'out' }).hold(4.6);
// --- the dash and the first clash ---
r.at(4.76, 'dash', { x: -250, e: 'in' }).at(4.98, 'dash', { x: -72, e: 'lin' }).at(5.05, 'cross', { x: -52, hB: [52, 116], e: 'out' });
b.at(4.76, 'dash', { x: 250, e: 'in' }).at(4.98, 'dash', { x: 72, e: 'lin' }).at(5.05, 'cross', { x: 52, hB: [52, 116], e: 'out' });
r.at(5.3, 'guard', { x: -66, e: 'out' }).at(5.42, 'guard', { x: -50 });
b.at(5.3, 'guard', { x: 66, e: 'out' }).at(5.42, 'guard', { x: 50 });
// --- exchange: everything gets answered ---
r.at(5.55, 'jab', { e: 'out' }).at(5.66, 'guard');                            // jab → high block
b.at(5.53, 'blockHi', { e: 'out' }).at(5.68, 'guard');
r.at(5.79, 'cross', { dx: 4, hB: [74, 112], e: 'out' }).at(5.88, 'cross', { hB: [62, 90] });   // cross → parried down
b.at(5.78, 'parry', { hA: [30, 112], e: 'out' }).at(5.86, 'parry');
b.at(5.95, 'windB', { e: 'in' }).at(6.08, 'hookB', { e: 'out' }).at(6.2, 'hookB', { hB: [40, 112] });  // hook → ducked
r.at(6.04, 'duck', { e: 'out', x: -50 }).at(6.13, 'duck', { hB: [10, 56] }).at(6.27, 'upper', { e: 'out' }).at(6.42, 'guard');   // uppercut → matrix lean
b.at(6.27, 'lean', { e: 'out' }).at(6.42, 'guard');
b.at(6.5, 'chamber', { e: 'in' }).at(6.58, 'fkick', { e: 'out' }).at(6.74, 'guard', { x: 42 });     // front kick → checked, Red slides
r.at(6.56, 'blockMid', { e: 'out' }).at(6.84, 'blockMid', { x: -86, e: 'out' }).at(7.02, 'guard', { x: -80, bob: 3 });
b.at(7.02, 'guard', { x: 45, bob: 3 });
// --- spinning back kick → blocked, Blue slides ---
r.at(7.2, 'guard', { x: -76 }).at(7.36, 'turn', { f: -1, dx: 8, e: 'in' }).at(7.5, 'bkick', { f: -1, dx: 6, e: 'out' })
  .at(7.64, 'turn', { f: -1 }).at(7.8, 'guard', { f: 1 });
b.at(7.46, 'blockMid', { e: 'out' }).at(7.74, 'blockMid', { x: 100, e: 'out' });
// --- jumping roundhouse → ducked; sweep → backflip ---
b.at(7.86, 'ready', { x: 96 }).at(8.06, 'rkick', { x: 42, y: 30, arc: 22, e: 'out' }).at(8.2, 'ready', { x: 32, y: 0 });
r.at(7.98, 'duck', { x: -50, e: 'out' }).at(8.2, 'duck').at(8.34, 'sweep', { e: 'out' }).hold(8.58).at(8.86, 'guard', { x: -45 });
b.at(8.62, 'tuck', { x: 132, arc: 95, rot: 360, e: 'lin' }).at(8.72, 'land', { x: 142, e: 'out' }).hold(8.98);
// --- Blue's flurry: Red is driven back, then slips the big cross and lands a body shot ---
const rx = (t) => lerp(-45, -125, clamp((t - 9.25) / 0.7));
b.at(9.08, 'ready', { x: 140 }).at(9.24, 'guard', { x: rx(9.24) + 96, e: 'in' });
b.at(9.3, 'jab', { x: rx(9.3) + 95, e: 'out' }).at(9.37, 'guard', { x: rx(9.37) + 95 })
  .at(9.44, 'cross', { x: rx(9.44) + 95, hB: [72, 112], e: 'out' }).at(9.51, 'guard', { x: rx(9.51) + 95 })
  .at(9.57, 'jab', { x: rx(9.57) + 95, e: 'out' }).at(9.63, 'windB', { x: rx(9.63) + 95 })
  .at(9.7, 'hookB', { x: rx(9.7) + 95, e: 'out' }).at(9.78, 'guard', { x: rx(9.78) + 95 })
  .at(9.88, 'cross', { x: -22, hB: [86, 120], e: 'out' }).hold(9.95)
  .at(10.12, 'hitBody', { x: 8, e: 'out' });
r.at(9.25, 'guard', { x: rx(9.25) })
  .at(9.3, 'blockHi', { x: rx(9.3), e: 'out' }).at(9.44, 'parry', { x: rx(9.44), e: 'out' })
  .at(9.57, 'blockHi', { x: rx(9.57), e: 'out' }).at(9.7, 'blockHi', { x: rx(9.7), hA: [24, 126], hB: [34, 134], e: 'out' })
  .at(9.85, 'slip', { x: -112, hA: [30, 90], e: 'out' }).at(9.95, 'slip', { x: -108, hA: [72, 86], e: 'out' })
  .at(10.14, 'guard', { x: -102 });
// --- Blue answers instantly: a hook that snaps Red's head back ---
b.at(10.24, 'windB', { x: -6 }).at(10.36, 'hookB', { x: -16, hB: [74, 128], e: 'out' }).at(10.55, 'guard', { x: -12 });
r.hold(10.36).at(10.5, 'hitHead', { x: -150, e: 'out' }).at(10.76, 'stagger', { x: -215 }).at(11.0, 'guard', { x: -250, head: -22 })
  .at(11.25, 'guard', { x: -262, head: -2, e: 'out' }).at(11.9, 'guard', { x: -300, walk: 1, bob: 2 });
// Blue backs off, beckoning
b.at(11.55, 'guard', { x: 30, walk: 1 }).at(11.7, 'beckon', { x: 50 }).at(11.78, 'beckon', { hA: [34, 114] }).at(11.86, 'beckon', { hA: [50, 104] })
  .at(11.94, 'beckon', { x: 60, hA: [34, 114] });
// --- both charge, both leap: flying kicks collide ---
r.at(12.05, 'ready', { x: -300, walk: 0 }).at(12.22, 'dash', { x: -262, e: 'in' }).at(12.3, 'tuck', { x: -240, y: 12 }).at(12.48, 'airkick', { x: -196, y: 70, e: 'out' });
b.at(12.05, 'ready', { x: 60 }).at(12.22, 'dash', { x: 22, e: 'in' }).at(12.3, 'tuck', { x: 0, y: 12 }).at(12.48, 'airkick', { x: -44, y: 70, e: 'out' });
r.at(12.85, 'tuck', { x: -330, y: 34, e: 'out' }).at(13.05, 'land', { x: -385, y: 0, e: 'in' }).at(13.45, 'land', { x: -440, e: 'out' }).hold(14.0);
b.at(12.85, 'tuck', { x: 90, y: 34, e: 'out' }).at(13.05, 'land', { x: 145, y: 0, e: 'in' }).at(13.45, 'land', { x: 200, e: 'out' }).hold(14.1);
// --- they rise. Red wipes his mouth; Blue rolls his neck. Then: go. ---
r.at(14.5, 'stand', { x: -440 }).at(14.7, 'wipe', { hA: [44, 120] }).at(14.98, 'wipe', { hA: [-12, 116] }).at(15.1, 'stand').at(15.28, 'ready', { e: 'out' })
  .hold(15.45).at(15.75, 'dash', { x: -330, e: 'in' });
b.at(14.6, 'stand', { x: 200 }).at(14.8, 'stand', { head: 20 }).at(15.0, 'stand', { head: -8 }).at(15.28, 'ready', { e: 'out' })
  .hold(15.45).at(15.75, 'dash', { x: 90, e: 'in' });

const CUT = 15.66;
const events = [
  { t: 5.05, type: 'clash', x: 0, y: 116, power: 5 },
  { t: 4.62, type: 'speed', dur: 0.42, dir: -1 }, { t: 5.05, type: 'speed', dur: 0.3, radial: true },
  { t: 5.08, type: 'dust', x: -62, dir: -1, power: 1 }, { t: 5.08, type: 'dust', x: 62, dir: 1, power: 1 },
  { t: 5.55, type: 'block', at: 'red.hA', power: 1 },
  { t: 5.79, type: 'block', at: 'red.hB', power: 1 },
  { t: 6.58, type: 'block', at: 'blue.fA', power: 2 }, { t: 6.6, type: 'dust', x: -66, dir: -1, power: 1.2 },
  { t: 7.5, type: 'block', at: 'red.fB', power: 2, frames: 3 }, { t: 7.52, type: 'dust', x: 52, dir: 1, power: 1.3 },
  { t: 8.36, type: 'dust', x: 10, power: 0.8 },
  { t: 8.72, type: 'land', x: 142, power: 1 },
  { t: 9.3, type: 'block', at: 'blue.hA', power: 1 }, { t: 9.44, type: 'block', at: 'blue.hB', power: 1 },
  { t: 9.57, type: 'block', at: 'blue.hA', power: 1 }, { t: 9.7, type: 'block', at: 'blue.hB', power: 1 },
  { t: 9.95, type: 'hit', at: 'red.hA', power: 3, by: 'red', color: '#ffd6c8', ring: '#ff5a3c' },
  { t: 10.36, type: 'hit', at: 'blue.hB', power: 4, by: 'blue', color: '#d8ecff', ring: '#3aa0ff' },
  { t: 10.78, type: 'dust', x: -215, dir: -1, power: 0.8 },
  { t: 12.18, type: 'speed', dur: 0.3, dir: 1 },
  { t: 12.48, type: 'clash', x: -120, y: 150, power: 6, frames: 10 }, { t: 12.48, type: 'speed', dur: 0.5, radial: true },
  { t: 13.05, type: 'land', x: -385, dir: -1, power: 1.4 }, { t: 13.05, type: 'land', x: 145, dir: 1, power: 1.4 },
  { t: 13.25, type: 'dust', x: -420, dir: -1, power: 1 }, { t: 13.25, type: 'dust', x: 180, dir: 1, power: 1 },
  { t: 15.5, type: 'speed', dur: 0.3, dir: -1 },
];
// sound-only cues
const cues = [
  { t: 0, type: 'music', cue: 'standoff' }, { t: 4.6, type: 'music', cue: 'riser' }, { t: 5.05, type: 'music', cue: 'fight' },
  { t: 12.28, type: 'music', cue: 'slowmo' }, { t: 13.05, type: 'music', cue: 'tension' }, { t: 15.4, type: 'music', cue: 'riser' },
  { t: CUT, type: 'music', cue: 'cut' },
  { t: 2.62, type: 'crack' }, { t: 3.6, type: 'cloth' }, { t: 4.2, type: 'cloth' },
  { t: 4.7, type: 'step', x: -260 }, { t: 4.7, type: 'step', x: 260 },
  { t: 7.36, type: 'cloth' }, { t: 8.22, type: 'step', x: 32 }, { t: 8.3, type: 'cloth' }, { t: 11.72, type: 'step', x: 40 },
  { t: 11.4, type: 'step', x: -270 }, { t: 12.2, type: 'step', x: -262 }, { t: 12.2, type: 'step', x: 22 },
  { t: 13.05, type: 'slide', dur: 0.45, x: -400 }, { t: 13.05, type: 'slide', dur: 0.45, x: 160 },
  { t: 14.55, type: 'cloth' }, { t: 15.28, type: 'cloth' },
];

const shots = [
  { t: 0, cam: (t) => ({ x: 0, y: 170, zoom: 0.7 + t * 0.03 }) },
  { t: 1.4, cam: (t, F) => on(F, 'red', t, { zoom: 3.4, oy: 62, ox: -10, rot: -3 }) },
  { t: 2.3, cam: (t, F) => on(F, 'blue', t, { zoom: 3.2, oy: 60, ox: 8, rot: 3 }) },
  { t: 3.3, cam: (t, F) => on(F, 'red', t, { zoom: 2.0 + (t - 3.3) * 0.5, oy: 10, rot: -5 }) },
  { t: 3.9, cam: (t, F) => on(F, 'blue', t, { zoom: 2.0 + (t - 3.9) * 0.5, oy: 10, rot: 5 }) },
  { t: 4.6, cam: (t, F) => follow(F, t, { oy: 40, fit: 820 }) },
  { t: 5.3, cam: (t, F) => follow(F, t, { oy: 34, fit: 860, rot: 2 }) },
  { t: 6.9, cam: (t, F) => follow(F, t, { oy: 30, fit: 860, rot: -3 }) },
  { t: 7.84, cam: (t, F) => follow(F, t, { oy: 50, fit: 800, max: 1.9 }) },
  { t: 9.0, cam: (t, F) => follow(F, t, { oy: 24, fit: 900, rot: 4 }) },
  { t: 10.3, cam: (t, F) => follow(F, t, { oy: 30, fit: 860, rot: -6 }) },
  { t: 11.0, cam: (t, F) => on(F, 'red', t, { zoom: 3.3, oy: 58, rot: -2 }) },
  { t: 11.55, cam: (t, F) => on(F, 'blue', t, { zoom: 2.4, oy: 30, rot: 3 }) },
  { t: 12.0, cam: (t, F) => follow(F, t, { oy: 60, fit: 820, rot: 0 }) },
  { t: 12.4, cam: (t, F) => ({ ...follow(F, t, { oy: 50, fit: 740 }), rot: -4 }) },
  { t: 13.0, cam: (t) => ({ x: -120, y: 120, zoom: 1.0 - (t - 13) * 0.03 }) },
  { t: 14.4, cam: (t, F) => follow(F, t, { oy: 60, fit: 760 }) },
  { t: 15.2, cam: (t, F) => ({ ...follow(F, t, { oy: 50, fit: 700 }), zoom: 1.0 + (t - 15.2) * 1.4 }) },
];

const font = (px) => `${px}px Anton, Impact, sans-serif`;
function titles(ctx, t, i) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // cinematic bars during the standoff
  const bar = t < 4.6 ? 108 : Math.max(0, 108 * (1 - (t - 4.6) / 0.15));
  if (bar > 0 && t < CUT) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar); }
  const slam = (text, x, y, px, t0, t1, color = '#fff', align = 'center') => {
    if (t < t0 || t > t1) return;
    const u = clamp((t - t0) / 0.12), out = clamp((t1 - t) / 0.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(lerp(1.7, 1, u), lerp(1.7, 1, u)); ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.globalAlpha = u * out; ctx.font = font(px); ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = px * 0.12; ctx.strokeStyle = '#000'; ctx.strokeText(text, 0, 0); ctx.fillStyle = color; ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  slam('ROUND 1', W / 2, H / 2 - 40, 190, 0.35, 1.3);
  slam('THE STANDOFF', W / 2, H / 2 + 95, 60, 0.55, 1.3, '#ffd28a');
  slam('RED', 300, H - 210, 150, 1.55, 2.25, '#ff3b30', 'left');
  slam('BLUE', W - 300, H - 210, 150, 2.45, 3.25, '#2f8cff', 'right');
  if (t >= CUT) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    slam('ROUND 2', W / 2, H / 2 - 30, 200, CUT + 0.35, 99);
    slam('THE FALL', W / 2, H / 2 + 110, 64, CUT + 0.6, 99, '#ffd28a');
  }
}

export const fight = new Fight({
  end: CUT + 2.4,
  fighters: {
    red: { track: r, body: '#120a0d', far: '#47262e', rim: '#ff9a4d', accent: '#e3242b', trail: '#ff4a3a', band: true,
      tails: [[7, 8, 'knot', '#e3242b', 5, -110], [6, 8, 'knot', '#b81a20', 4, -95]] },
    blue: { track: b, body: '#090b14', far: '#2a3248', rim: '#ffb070', accent: '#1f7bff', trail: '#3aa0ff', scarf: true,
      tails: [[9, 10, 'scarf', '#1f7bff', 9, -105]] },
  },
  events, cues, shots, titles,
  slows: [{ a: 12.3, b: 12.48, rate: 0.3 }, { a: 12.48, b: 12.8, rate: 0.45 }],
  scene: rooftop, front: (ctx, t) => embers(ctx, t),
});
