// Construction rooftop at dusk. Background is pushed back (haze, blur, low contrast) so the fighters pop.
import { W, H } from './stage4.js';
import { hash } from './rig3.js';

export const SET = { beams: [330, 760, 32] };   // steel I-beam stack: x from, x to, beam height

function city(ctx, seed, x0, x1, base, hMin, hMax, col, win, p) {
  let x = x0, k = 0;
  while (x < x1) {
    const w = 80 + hash(seed + k * 1.7) * 160, h = hMin + hash(seed + k * 3.1) * (hMax - hMin);
    ctx.fillStyle = col; ctx.fillRect(x, base, w, h);
    if (hash(seed + k * 9) > 0.75) ctx.fillRect(x + w * 0.4, base + h, 4, 50 + hash(k) * 70);
    if (win) { ctx.fillStyle = win; for (let wy = base + 18; wy < base + h - 14; wy += 22) for (let wx = x + 12; wx < x + w - 12; wx += 18) if (hash(wx * 0.37 + wy * 1.3 + seed) > 0.82) ctx.fillRect(wx, wy, 6, 8); }
    x += w + 8 + hash(seed + k) * 30; k++;
  }
}

export function dusk(ctx, v, t, F) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#110d2a'); g.addColorStop(0.35, '#2e1f4d'); g.addColorStop(0.6, '#7a3463'); g.addColorStop(0.78, '#e2685a'); g.addColorStop(0.9, '#ffb06a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // setting sun + glow, low on the horizon
  F.layer(ctx, v, 0.05);
  const sg = ctx.createRadialGradient(260, -20, 10, 260, -20, 700);
  sg.addColorStop(0, 'rgba(255,220,150,0.95)'); sg.addColorStop(0.12, 'rgba(255,150,90,0.55)'); sg.addColorStop(1, 'rgba(255,90,90,0)');
  ctx.fillStyle = sg; ctx.fillRect(-700, -720, 1900, 1400);
  // stars
  ctx.fillStyle = 'rgba(255,240,255,0.8)';
  for (let k = 0; k < 60; k++) { const x = -1600 + hash(k * 3.3) * 3200, y = 260 + hash(k * 7.1) * 300; ctx.fillRect(x, y, 2, 2); }
  // far city in haze
  F.layer(ctx, v, 0.18);
  city(ctx, 3, -3400, 3400, -240, 140, 380, '#3a2550', 'rgba(255,190,120,0.55)');
  F.layer(ctx, v, 0.18);
  const hz = ctx.createLinearGradient(0, -240, 0, 60); hz.addColorStop(0, 'rgba(255,140,110,0.0)'); hz.addColorStop(0.75, 'rgba(255,140,110,0.38)'); hz.addColorStop(1, 'rgba(255,170,120,0.55)');
  ctx.fillStyle = hz; ctx.fillRect(-3400, -240, 6800, 300);
  // mid: tower crane + unfinished frames, soft focus
  ctx.save(); ctx.filter = 'blur(3px)';
  F.layer(ctx, v, 0.45);
  ctx.fillStyle = '#251a3a'; ctx.strokeStyle = '#251a3a';
  const cx = -520;
  ctx.fillRect(cx - 12, -300, 24, 760);
  ctx.lineWidth = 3; for (let y = -300; y < 460; y += 30) { ctx.beginPath(); ctx.moveTo(cx - 12, y); ctx.lineTo(cx + 12, y + 30); ctx.stroke(); }
  ctx.fillRect(cx - 260, 440, 980, 16); ctx.fillRect(cx - 250, 400, 70, 40);
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 420, 440); ctx.lineTo(cx + 420 + Math.sin(t * 0.8) * 6, 230); ctx.stroke();
  ctx.fillRect(cx + 380 + Math.sin(t * 0.8) * 6, 210, 90, 18);
  for (const [fx, fw, fh] of [[300, 360, 300], [900, 300, 220], [-1400, 420, 340]]) {
    for (let y = -300; y < -300 + fh + 300; y += 70) ctx.fillRect(fx, y, fw, 7);
    for (let x = fx; x <= fx + fw; x += 60) ctx.fillRect(x, -300, 7, fh + 300);
  }
  ctx.restore();
  // rooftop deck
  F.layer(ctx, v, 1);
  ctx.fillStyle = '#1c1426'; ctx.fillRect(-4000, -1600, 8000, 1600);
  const dk = ctx.createLinearGradient(0, 0, 0, -120); dk.addColorStop(0, '#3a2738'); dk.addColorStop(1, '#1c1426');
  ctx.fillStyle = dk; ctx.fillRect(-4000, -120, 8000, 120);
  ctx.fillStyle = 'rgba(255,150,100,0.55)'; ctx.fillRect(-4000, -2, 8000, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = -4000; x < 4000; x += 140) ctx.fillRect(x, -120, 3, 118);
}

// big steel beam stack the fighters can crash into
export function beams(ctx, t) {
  const [x0, x1, bh] = SET.beams;
  // three I-beams lying flush on top of each other, ends slightly staggered, I-profile visible at the near end
  for (let k = 0; k < 3; k++) {
    const y = k * bh, sx = x0 + [0, 14, 6][k];
    ctx.fillStyle = '#4a3a52'; ctx.fillRect(sx, y, x1 - sx, bh);
    ctx.fillStyle = '#2c2133'; ctx.fillRect(sx + 18, y + 7, x1 - sx - 18, bh - 14);          // web shadow
    ctx.fillStyle = '#5d4a66'; ctx.fillRect(sx, y + bh - 6, x1 - sx, 6); ctx.fillRect(sx, y, x1 - sx, 5);   // flanges
    ctx.fillStyle = '#6b5577'; ctx.fillRect(sx, y, 16, 6); ctx.fillRect(sx, y + bh - 6, 16, 6); ctx.fillRect(sx + 5, y, 6, bh);   // I-profile end
    ctx.fillStyle = 'rgba(255,170,110,0.75)'; ctx.fillRect(sx, y + bh - 2, x1 - sx, 2);
  }
  ctx.fillStyle = '#d8a13a'; ctx.fillRect(x0 + 60, bh * 3, 8, 60); ctx.fillRect(x0 + 50, bh * 3 + 52, 28, 8);   // a little warning flag post
}

// blurred foreground objects passing in front of the lens (sell depth during camera moves)
export function foreground(ctx, v, t, F) {
  ctx.save(); ctx.filter = 'blur(10px)';
  F.layer(ctx, v, 1.7);
  ctx.fillStyle = 'rgba(14,8,22,0.85)';
  for (const x of [-900, 520, 1500]) ctx.fillRect(x, -400, 22, 1400);   // plain blurred poles, no crossbars
  ctx.restore();
}

export function grade(ctx) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,25,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
