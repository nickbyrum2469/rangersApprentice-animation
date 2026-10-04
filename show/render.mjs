// Render the episode (or a slice) to MP4 with its soundtrack.
//   node show/render.mjs                         all animated scenes, 1280x720 → 1080p
//   node show/render.mjs --from 0 --to 55        a time range (seconds of episode time)
//   node show/render.mjs --scenes 1,2            specific scenes
//   node show/render.mjs --preview               960x540, faster
// Animation is rendered "on twos" (12 drawings/s shown at 24 fps), like TV anime.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true; };
const ep = opt('ep', 'ep01');
const preview = !!opt('preview', false);
const scale = parseFloat(opt('scale', preview ? 0.5 : 2 / 3));
const drawFps = parseInt(opt('drawfps', 12), 10), fps = 24;
const workers = parseInt(opt('workers', 2), 10);
const out = opt('out', `out/${ep}${preview ? '-preview' : ''}.mp4`);

const srv = await serve(8126);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pages = await Promise.all(Array.from({ length: workers }, async () => {
  const p = await browser.newPage({ viewport: { width: Math.round(1920 * scale), height: Math.round(1080 * scale) } });
  p.on('pageerror', (e) => console.error('pageerror:', e.message));
  await p.goto(`http://localhost:8126/show/player.html?render=1&ep=${ep}&scale=${scale}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 180000 });
  return p;
}));
const info = await pages[0].evaluate(() => window.EP);
let ranges;
if (opt('scenes')) ranges = String(opt('scenes')).split(',').map(Number).map((n) => info.scenes.find((s) => s.n === n)).filter(Boolean).map((s) => [Math.max(0, s.start - 0.6), s.end + 0.6]);
else if (opt('from') !== undefined) ranges = [[parseFloat(opt('from', 0)), parseFloat(opt('to', info.scenes.at(-1).end + 0.6))]];
else ranges = [[0, info.scenes.at(-1).end + 0.6]];

// frame list (episode times) at the drawing rate
const times = [];
for (const [a, b] of ranges) for (let T = a; T < b; T += 1 / drawFps) times.push(T);
console.log(`${times.length} drawings (${(times.length / drawFps / 60).toFixed(1)} min) with ${workers} workers`);

fs.mkdirSync('out', { recursive: true });
const tmp = out.replace(/\.mp4$/, '.video.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(drawFps), '-i', '-',
  '-vf', `fps=${fps},scale=1920:1080:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-tune', 'animation', tmp],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const grab = (p, T) => p.evaluate((T) => window.renderAt(T).toDataURL('image/jpeg', 0.93), T).then((d) => Buffer.from(d.split(',')[1], 'base64'));
const pending = new Map();
let next = 0, written = 0, chain = Promise.resolve();
const t0 = Date.now();
const drain = async () => {
  while (pending.has(written)) {
    const buf = await pending.get(written); pending.delete(written);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    written++;
    if (written % 24 === 0 || written === times.length) {
      const el = (Date.now() - t0) / 1000, eta = (el / written) * (times.length - written);
      process.stdout.write(`\r${written}/${times.length}  ${el.toFixed(0)}s elapsed, ~${(eta / 60).toFixed(0)} min left   `);
    }
  }
};
await Promise.all(pages.map(async (p) => {
  while (next < times.length) {
    const i = next++;
    pending.set(i, grab(p, times[i]));
    await pending.get(i);
    chain = chain.then(drain);
    await chain;
  }
}));
await chain;
ff.stdin.end();
await new Promise((r) => ff.on('close', r));

// soundtrack: cut the same ranges from the episode mix and lay them under the video
const audio = `out/${ep}/episode_audio.wav`;
const parts = ranges.map(([a, b]) => `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${a}]`);
const labels = ranges.map(([a]) => `[a${a}]`).join('');
const filter = `${parts.join(';')};${labels}concat=n=${ranges.length}:v=0:a=1[aout]`;
await new Promise((ok, bad) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', audio, '-i', tmp, '-filter_complex', filter, '-map', '1:v', '-map', '[aout]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', (c) => (c ? bad(c) : ok())));
fs.unlinkSync(tmp);
console.log(`\nwrote ${out}`);
await browser.close(); srv.close();
