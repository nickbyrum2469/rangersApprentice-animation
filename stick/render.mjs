// Render a stick fight to MP4:  node stick/render.mjs [round1] [--stills 10,50,120]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { serve } from '../show/serve.mjs';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--')) || 'round1';
const si = args.indexOf('--stills');
const stills = si >= 0 ? args[si + 1].split(',').map(Number) : null;
const srv = await serve(8131);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error(m.text()));
await page.goto(`http://localhost:8131/stick/page.html?render=1&fight=${name}`);
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
const n = await page.evaluate(() => window.frameCount);
const qa = await page.evaluate(() => (window.FIGHT.qa ? window.FIGHT.qa() : []));
for (const q of qa) console.log(`contact ${q.t.toFixed(2)}s ${q.type.padEnd(5)} ${q.at.padEnd(8)} gap ${q.gap}${q.ok ? '' : '   <-- MISS'}`);
if (qa.some((q) => !q.ok) && !args.includes('--force')) { console.log('contact check failed'); await browser.close(); srv.close(); process.exit(1); }
fs.mkdirSync('out/stick', { recursive: true });
const grab = async (i) => Buffer.from((await page.evaluate((i) => window.drawFrame(i), i)).split(',')[1], 'base64');
if (stills) {
  // the cloth sim is stateful, so play up to each still
  let k = 0;
  for (let i = 0; i <= Math.max(...stills); i++) {
    const want = stills.includes(i);
    const buf = await (want ? grab(i) : page.evaluate((i) => { window.FIGHT.draw(document.getElementById('c').getContext('2d'), i); }, i));
    if (want) fs.writeFileSync(`out/stick/${name}_${String(i).padStart(4, '0')}.jpg`, buf);
  }
  console.log(`${n} frames total; stills written`);
} else {
  const tmp = `out/stick/${name}.video.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '24', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    if (!ff.stdin.write(await grab(i))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 48 === 0) process.stdout.write(`\r${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  fs.writeFileSync(`out/stick/${name}_sound.json`, JSON.stringify({ duration: n / 24, events: await page.evaluate(() => window.sound()) }, null, 1));
  console.log(`\nwrote ${tmp} (${(n / 24).toFixed(1)}s) and sound cues`);
}
await browser.close(); srv.close();
