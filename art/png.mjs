// Rasterise an SVG to PNG with headless Chromium:  node art/png.mjs art/cast.svg art/cast.png
import { chromium } from 'playwright';
import fs from 'node:fs';
const [inp, out] = process.argv.slice(2);
const svg = fs.readFileSync(inp, 'utf8');
const w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await p.screenshot({ path: out });
await b.close();
console.log('wrote', out);
