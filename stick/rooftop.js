// Rooftop at sunset: sky, sun, two parallax skylines, the roof with its props, floating embers.
import { W, H } from './stage.js';
import { hash } from './engine.js';

const SIL = '#1c1226', EDGE = 'rgba(255,150,90,0.55)';

function skyline(ctx, seed, x0, x1, base, hMin, hMax, col, win) {
  let x = x0, k = 0;
  while (x < x1) {
    const w = 50 + hash(seed + k * 1.7) * 120, h = hMin + hash(seed + k * 3.1) * (hMax - hMin);
    ctx.fillStyle = col; ctx.fillRect(x, base, w + 1, h);
    if (hash(seed + k * 5.3) > 0.7) ctx.fillRect(x + w * 0.45, base + h, 3, 40 + hash(k) * 60);   // antenna
    if (win) for (let wy = base + 12; wy < base + h - 10; wy += 14) for (let wx = x + 8; wx < x + w - 8; wx += 12)
      if (hash(wx * 0.37 + wy * 1.13 + seed) > 0.86) { ctx.fillStyle = win; ctx.fillRect(wx, wy, 5, 6); ctx.fillStyle = col; }
    x += w + 4 + hash(seed + k) * 30; k++;
  }
}

export function rooftop(ctx, v, t, F) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d1640'); g.addColorStop(0.35, '#6b2a5e'); g.addColorStop(0.62, '#e0566a'); g.addColorStop(0.8, '#ffa766'); g.addColorStop(1, '#ffd38a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // sun + glow
  F.layer(ctx, v, 0.06);
  const sx = 170, sy = 20;
  const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, 520);
  glow.addColorStop(0, 'rgba(255,240,200,0.95)'); glow.addColorStop(0.18, 'rgba(255,200,130,0.55)'); glow.addColorStop(1, 'rgba(255,120,90,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 520, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff1cf'; ctx.beginPath(); ctx.arc(sx, sy, 92, 0, Math.PI * 2); ctx.fill();
  // cloud streaks
  F.layer(ctx, v, 0.12);
  for (let k = 0; k < 9; k++) {
    const y = 120 + hash(k * 2.3) * 260, x = -1400 + hash(k * 7.1) * 2800 - t * (6 + k), w = 300 + hash(k * 4.4) * 700;
    ctx.fillStyle = `rgba(255,${150 + (k % 3) * 25},${150 + (k % 2) * 30},${0.16 + hash(k) * 0.14})`;
    ctx.beginPath(); ctx.ellipse(x, y, w, 7 + hash(k * 9) * 10, 0, 0, Math.PI * 2); ctx.fill();
  }
  // far skyline + haze
  F.layer(ctx, v, 0.25);
  skyline(ctx, 11, -2600, 2600, -260, 120, 330, '#5a2f5c', 'rgba(255,214,150,0.55)');
  F.layer(ctx, v, 0.25);
  const hz = ctx.createLinearGradient(0, -100, 0, 60); hz.addColorStop(0, 'rgba(255,170,120,0.0)'); hz.addColorStop(1, 'rgba(255,170,120,0.45)');
  ctx.fillStyle = hz; ctx.fillRect(-3000, -260, 6000, 330);
  // mid skyline
  F.layer(ctx, v, 0.5);
  skyline(ctx, 47, -2400, 2400, -400, 260, 400, '#341c40', 'rgba(255,200,120,0.75)');

  // the roof
  F.layer(ctx, v, 1);
  ctx.fillStyle = '#21142a'; ctx.fillRect(-1200, -2000, 2400, 2000);                 // facade
  const fl = ctx.createLinearGradient(0, 26, 0, -48); fl.addColorStop(0, '#5b3550'); fl.addColorStop(0.35, '#3b2238'); fl.addColorStop(1, '#2a1830');
  ctx.fillStyle = fl; ctx.fillRect(-1200, -48, 2400, 74);                              // roof floor seen at an angle
  ctx.fillStyle = '#7d4a5c'; ctx.fillRect(-1200, 24, 2400, 3);                          // far edge highlight
  ctx.fillStyle = '#160d1c'; ctx.fillRect(-1200, -60, 2400, 13);                        // near lip
  ctx.fillStyle = 'rgba(255,170,110,0.35)'; ctx.fillRect(-1200, -48, 2400, 2);
  // AC unit
  prop(ctx, () => { ctx.rect(-640, 22, 130, 78); }, true);
  ctx.strokeStyle = '#3b2740'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-575, 62, 26, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a = t * 9 + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(-575, 62); ctx.lineTo(-575 + Math.cos(a) * 22, 62 + Math.sin(a) * 22); ctx.stroke(); }
  // vent pipes
  prop(ctx, () => { ctx.rect(-470, 22, 16, 92); ctx.rect(-470, 104, 52, 14); ctx.rect(-426, 70, 14, 46); });
  // water tower
  prop(ctx, () => {
    ctx.rect(560, 22, 8, 170); ctx.rect(690, 22, 8, 170); ctx.rect(620, 22, 6, 170);
    ctx.rect(540, 186, 180, 160); ctx.moveTo(530, 346); ctx.lineTo(630, 410); ctx.lineTo(730, 346);
  }, true);
  ctx.strokeStyle = SIL; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(560, 40); ctx.lineTo(698, 180); ctx.moveTo(698, 40); ctx.lineTo(560, 180); ctx.stroke();
  // antenna with a blinking light
  prop(ctx, () => { ctx.rect(-842, 22, 7, 470); ctx.moveTo(-880, 380); ctx.lineTo(-800, 380); ctx.lineTo(-800, 386); ctx.lineTo(-880, 386); });
  if (Math.floor(t * 1.2) % 2 === 0) {
    const bl = ctx.createRadialGradient(-838, 496, 0, -838, 496, 34); bl.addColorStop(0, 'rgba(255,60,60,1)'); bl.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(-838, 496, 34, 0, Math.PI * 2); ctx.fill();
  }
  // railing at the far edge
  ctx.fillStyle = SIL; ctx.fillRect(-1200, 62, 2400, 4);
  for (let x = -1200; x < 1200; x += 70) ctx.fillRect(x, 24, 4, 40);
}

function prop(ctx, path, top = false) {
  ctx.beginPath(); path(); ctx.fillStyle = SIL; ctx.fill();
  ctx.save(); ctx.clip(); ctx.translate(-3, -3); ctx.strokeStyle = EDGE; ctx.lineWidth = 3; ctx.beginPath(); path(); ctx.stroke(); ctx.restore();
}

export function embers(ctx, t) {
  for (let k = 0; k < 36; k++) {
    const span = 2600, x = ((hash(k * 3.7) * span - t * (60 + hash(k) * 90)) % span + span) % span - span / 2;
    const y = 10 + hash(k * 9.1) * 420 + Math.sin(t * 1.5 + k) * 12;
    ctx.fillStyle = `rgba(255,${190 + (k % 4) * 15},140,${0.35 + hash(k * 2) * 0.4})`;
    ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(k * 5) * 2.2, 0, Math.PI * 2); ctx.fill();
  }
}
