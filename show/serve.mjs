// Tiny static server so the browser can load ES modules (file:// blocks them).
//   node show/serve.mjs            → http://localhost:8123/show/player.html
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };

export function serve(port = 8123) {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => srv.listen(port, () => ok(srv)));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  serve().then(() => console.log('http://localhost:8123/show/player.html'));
}
