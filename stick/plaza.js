// City plaza, late afternoon: skyline, trees, brick wall (left), bench, lamp post, trash can + its lid.
import { W, H } from './stage3.js';
import { hash } from './rig3.js';

export const SET = { wall: -430, bench: [-235, -105, 38], post: 230, can: [-375, 62] };

function skyline(ctx, seed, x0, x1, base, hMin, hMax, col, win) {
  let x = x0, k = 0;
  while (x < x1) {
    const w = 70 + hash(seed + k * 1.7) * 140, h = hMin + hash(seed + k * 3.1) * (hMax - hMin);
    ctx.fillStyle = col; ctx.fillRect(x, base, w, h);
    if (win) { ctx.fillStyle = win; for (let wy = base + 16; wy < base + h - 14; wy += 20) for (let wx = x + 10; wx < x + w - 10; wx += 16) if (hash(wx * 0.31 + wy * 1.7 + seed) > 0.55) ctx.fillRect(wx, wy, 7, 10); }
    x += w + 6 + hash(seed + k) * 24; k++;
  }
}
function tree(ctx, x, y, s, leaf, dark) {
  ctx.fillStyle = '#6b4a35'; ctx.fillRect(x - 7 * s, y, 14 * s, 90 * s);
  for (const [dx, dy, r, c] of [[0, 120, 60, dark], [-44, 92, 44, leaf], [46, 96, 46, leaf], [0, 160, 44, leaf], [-20, 130, 40, leaf]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
}

export function plaza(ctx, v, t, F) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6db8ec'); g.addColorStop(0.5, '#a9d7f2'); g.addColorStop(0.8, '#ffe2bd'); g.addColorStop(1, '#ffd29e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  F.layer(ctx, v, 0.06);
  for (let k = 0; k < 8; k++) {
    const cx = -1500 + k * 420 + hash(k) * 200 - t * 5, cy = 260 + hash(k * 3) * 180;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(cx + j * 40 - 80, cy + Math.sin(j * 2) * 10, 55 + hash(j + k) * 30, 28 + hash(j * 2 + k) * 12, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  F.layer(ctx, v, 0.2);
  skyline(ctx, 5, -3200, 3200, -200, 160, 420, '#9fb6cf', 'rgba(255,255,255,0.35)');
  F.layer(ctx, v, 0.42);
  skyline(ctx, 21, -3000, 3000, -300, 220, 420, '#7f93ad', 'rgba(255,236,190,0.55)');
  F.layer(ctx, v, 0.65);
  for (let k = 0; k < 16; k++) tree(ctx, -2000 + k * 260 + hash(k) * 80, -30, 0.9 + hash(k * 2) * 0.4, '#5fa35a', '#4b8a4a');
  F.layer(ctx, v, 1);
  // pavement + curb + road
  ctx.fillStyle = '#d9cbb4'; ctx.fillRect(-3000, -170, 6000, 170);
  ctx.fillStyle = '#c4b49b'; for (let x = -3000; x < 3000; x += 64) ctx.fillRect(x, -170, 3, 170); for (let y = -60; y > -170; y -= 56) ctx.fillRect(-3000, y, 6000, 3);
  ctx.fillStyle = '#eee3cf'; ctx.fillRect(-3000, -3, 6000, 3);
  ctx.fillStyle = '#9a8f80'; ctx.fillRect(-3000, -184, 6000, 14);
  ctx.fillStyle = '#5b5f66'; ctx.fillRect(-3000, -1200, 6000, 1016);
  ctx.fillStyle = '#f2e7a0'; for (let x = -3000; x < 3000; x += 160) ctx.fillRect(x, -260, 80, 8);
}

// set pieces drawn in world space behind the fighters
export function setPieces(ctx, t) {
  // brick wall
  const wx = SET.wall;
  ctx.fillStyle = '#b4583f'; ctx.fillRect(wx - 900, 0, 900, 430);
  ctx.save(); ctx.beginPath(); ctx.rect(wx - 900, 0, 900, 430); ctx.clip();
  for (let row = 0; row * 22 < 430; row++) {
    const y = row * 22, off = row % 2 ? 24 : 0;
    ctx.fillStyle = '#9b4834';
    for (let x = wx - 900 - off; x < wx; x += 48) { ctx.fillStyle = hash(x * 0.3 + row) > 0.8 ? '#a4503a' : '#b85d43'; ctx.fillRect(x + 2, y + 2, 44, 18); }
  }
  ctx.restore();
  ctx.fillStyle = '#7d3a2a'; ctx.fillRect(wx - 6, 0, 6, 430);                      // wall edge shade
  ctx.fillStyle = '#d7c7b0'; ctx.fillRect(wx - 900, 430, 906, 14);                  // cap
  // poster on the wall
  ctx.save(); ctx.translate(wx - 150, 190); ctx.rotate(0.03);
  ctx.fillStyle = '#f4ecd8'; ctx.fillRect(-60, -80, 120, 160);
  ctx.fillStyle = '#e8262b'; ctx.fillRect(-50, -10, 45, 70); ctx.fillStyle = '#1f8fff'; ctx.fillRect(5, -10, 45, 70);
  ctx.scale(1, -1); ctx.fillStyle = '#222'; ctx.font = 'bold 30px Anton, Impact'; ctx.textAlign = 'center'; ctx.fillText('FIGHT', 0, -40); ctx.restore();
  // lamp post
  const px = SET.post;
  ctx.fillStyle = '#2f3540'; ctx.fillRect(px - 5, 0, 10, 330); ctx.fillRect(px - 12, 0, 24, 18);
  ctx.fillRect(px - 4, 322, 48, 7); ctx.beginPath(); ctx.moveTo(px + 30, 326); ctx.lineTo(px + 52, 300); ctx.lineTo(px + 20, 300); ctx.fill();
  // bench
  const [b0, b1, by] = SET.bench;
  ctx.fillStyle = '#3d3f45'; ctx.fillRect(b0 + 10, 0, 7, by); ctx.fillRect(b1 - 17, 0, 7, by); ctx.fillRect(b0 + 10, by, 7, 44); ctx.fillRect(b1 - 17, by, 7, 44);
  ctx.fillStyle = '#9b6b43'; ctx.fillRect(b0, by - 2, b1 - b0, 8); ctx.fillRect(b0, by + 20, b1 - b0, 7); ctx.fillRect(b0, by + 34, b1 - b0, 7);
  // trash can
  const [cx, ch] = SET.can;
  ctx.fillStyle = '#3e6b4f'; ctx.beginPath(); ctx.moveTo(cx - 22, ch); ctx.lineTo(cx + 22, ch); ctx.lineTo(cx + 18, 0); ctx.lineTo(cx - 18, 0); ctx.fill();
  ctx.fillStyle = '#335a42'; for (let k = -2; k <= 2; k++) ctx.fillRect(cx + k * 8 - 1.5, 6, 3, ch - 12);
}

// the trash-can lid: face 0 = seen edge-on (lying flat / thrown flat), 1 = face-on (held up as a shield)
export function drawLid(ctx, s) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot * Math.PI / 180);
  const rx = 25, ry = 4 + s.face * 21;
  ctx.fillStyle = '#8f9aa3'; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5d666e'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#c7d0d6'; ctx.beginPath(); ctx.ellipse(-6, ry * 0.3, rx * 0.5, ry * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
