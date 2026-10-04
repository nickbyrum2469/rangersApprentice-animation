// Render specific moments as PNGs for review:  node show/stills.mjs 5,20,33 [ep01] [scale]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const [times, ep = 'ep01', scale = '0.5'] = process.argv.slice(2);
const srv = await serve(8125);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920 * scale, height: 1080 * scale } });
p.on('console', (m) => ['error', 'warning'].includes(m.type()) && console.log(m.type() + ':', m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(`http://localhost:8125/show/player.html?render=1&ep=${ep}&scale=${scale}`);
await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
fs.mkdirSync('out/stills', { recursive: true });
for (const T of times.split(',').map(Number)) {
  const t0 = Date.now();
  const data = await p.evaluate((T) => window.renderAt(T).toDataURL('image/jpeg', 0.9), T);
  const f = `out/stills/${ep}-${T.toFixed(1)}.jpg`;
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  console.log(f, Date.now() - t0, 'ms');
}
await b.close(); srv.close();
