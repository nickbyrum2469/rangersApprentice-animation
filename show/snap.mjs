// Screenshot any show page:  node show/snap.mjs "lineup.html?ids=will,halt" out/x.png
import { chromium } from 'playwright';
import { serve } from './serve.mjs';
const [page, out = 'out/snap.png'] = process.argv.slice(2);
const srv = await serve(8124);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror:', e.message));
const t0 = Date.now();
await p.goto(`http://localhost:8124/show/${page}`);
await p.waitForFunction(() => window.done, null, { timeout: 120000 });
await p.screenshot({ path: out });
console.log('saved', out, Date.now() - t0, 'ms');
await b.close(); srv.close();
