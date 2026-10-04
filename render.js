// Renders an episode to MP4 (or still frames) by stepping the deterministic
// timeline frame by frame in headless Chromium and piping PNGs into ffmpeg.
//
//   node render.js                                  full-quality 1080p MP4
//   node render.js --preview                        fast half-res draft
//   node render.js --from 11 --to 21                render a time range
//   node render.js --stills 3,15,26                 save PNG frames only
//   node render.js --ep episodes/ep01/cold-open.js --out out/ep01.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

const ep = opt('ep', 'episodes/ep01/cold-open.js');
const preview = !!opt('preview', false);
const scale = parseFloat(opt('scale', preview ? 0.5 : 1));
const fps = parseInt(opt('fps', preview ? 24 : 30), 10);
const workers = parseInt(opt('workers', 3), 10);
const stills = opt('stills', null);
const out = opt('out', `out/${path.basename(ep, '.js')}${preview ? '-preview' : ''}.mp4`);

(async () => {
  fs.mkdirSync('out/stills', { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const url = 'file://' + path.resolve('player.html') + `?render=1&scale=${scale}&ep=${encodeURIComponent(ep)}`;
  const pages = await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage({ viewport: { width: 1920 * scale, height: 1080 * scale } });
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.goto(url);
    await page.evaluate(() => RA.ready);
    return page;
  }));
  const duration = await pages[0].evaluate(() => RA.episode.duration);
  const grab = (page, T) => page.evaluate((T) => { RA.renderFrame(T); return document.getElementById('c').toDataURL('image/png'); }, T)
    .then((d) => Buffer.from(d.split(',')[1], 'base64'));

  if (stills) {
    const times = String(stills).split(',').map(Number);
    await Promise.all(times.map(async (T, i) => {
      const file = `out/stills/${path.basename(ep, '.js')}-${T.toFixed(2)}s.png`;
      fs.writeFileSync(file, await grab(pages[i % workers], T));
      console.log('wrote', file);
    }));
    return browser.close();
  }

  const from = parseFloat(opt('from', 0)), to = Math.min(parseFloat(opt('to', duration)), duration);
  const total = Math.round((to - from) * fps);
  // Film grain + gentle sharpening are added in ffmpeg; canvas PNGs stay clean and small.
  const vf = preview ? 'format=yuv420p' : 'noise=alls=2:allf=t,format=yuv420p';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', vf, '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'slow', '-crf', preview ? '26' : '20',
    '-tune', 'film', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  const pending = new Map();
  let next = 0, written = 0;
  let flushing = Promise.resolve();
  const flush = () => (flushing = flushing.then(drain));
  const drain = async () => {
    while (pending.has(written)) {
      const buf = await pending.get(written); pending.delete(written);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      written++;
      if (written % fps === 0 || written === total) process.stdout.write(`\r${written}/${total} frames  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  };
  await Promise.all(pages.map(async (page) => {
    while (next < total) {
      const i = next++;
      pending.set(i, grab(page, from + i / fps));
      await pending.get(i);
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\nwrote ${out}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
