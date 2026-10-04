// Anime face painter. Each character's face is a 2D drawing (eyes, brows, nose, mouth, blush)
// painted onto a canvas and wrapped onto the front of the 3D head, like a cel-animated face.
// The drawing is regenerated only when the expression state changes.
//
// state = { eye: 'open'|'half'|'closed'|'happy'|'wide', lid (0..1 upper lid lowering), lidAng (-1 angry .. +1 sad),
//           lx, ly (iris look -1..1), brow (-1..1 height), browAng (-1 angry .. +1 worried),
//           mouth: 'closed'|'open1'|'open2'|'open3'|'o'|'grin', smile (-1..1), blush 0..1 }
const S = 512;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export class AnimeFace {
  constructor(design) {
    this.d = design;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = S;
    this.key = '';
    const f = design.face || {};
    this.cfg = {
      eyeY: f.eyeY ?? 250, eyeX: (f.eyeX ?? 82) * 1.13, eyeW: (f.eyeW ?? 92) * 1.42, eyeH: (f.eyeH ?? 104) * 1.42,
      iris: design.eyes || '#5a3a20', line: f.line || '#2a1610', lash: f.lash ?? 1,
      mouthY: f.mouthY ?? 388, mouthW: (f.mouthW ?? 34) * 1.2, browY: (f.browY ?? 150) - 22, browW: f.browW ?? 70, browT: f.browT ?? 9,
      browCol: design.browColor || design.hair?.color || '#3a2a1a', skin: design.skin,
      tired: f.tired || 0, narrow: f.narrow || 0,
    };
  }

  // returns true if the canvas changed
  draw(st) {
    const q = (v, n = 4) => Math.round(v * n) / n;
    const s = { eye: st.eye, lid: q(st.lid ?? 0), lidAng: q(st.lidAng ?? 0), lx: q(st.lx ?? 0, 3), ly: q(st.ly ?? 0, 3), brow: q(st.brow ?? 0), browAng: q(st.browAng ?? 0), mouth: st.mouth, smile: q(st.smile ?? 0), blush: q(st.blush ?? 0, 2) };
    const key = JSON.stringify(s);
    if (key === this.key) return false;
    this.key = key;
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, S, S);
    const c = this.cfg, d = this.d;
    g.lineCap = 'round'; g.lineJoin = 'round';

    // blush & freckles first (under everything)
    const blush = Math.max(s.blush, d.blush ? 0.6 : 0);
    if (blush > 0) {
      for (const sx of [-1, 1]) {
        const x = 256 + sx * (c.eyeX + 14), y = c.eyeY + c.eyeH * 0.62;
        const gr = g.createRadialGradient(x, y, 2, x, y, 42);
        gr.addColorStop(0, `rgba(255,110,110,${0.45 * blush})`); gr.addColorStop(1, 'rgba(255,110,110,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 44, 24, 0, 0, 7); g.fill();
        g.strokeStyle = `rgba(220,70,70,${0.55 * blush})`; g.lineWidth = 2.5;
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * 12 - 5, y + 7); g.lineTo(x + i * 12 + 5, y - 7); g.stroke(); }
      }
    }
    if (d.freckles) {
      g.fillStyle = 'rgba(160,90,50,0.55)';
      [[-1, 0], [1, 0]].forEach(([sx]) => { for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(256 + sx * (40 + (i % 3) * 13), c.eyeY + c.eyeH * 0.55 + (i % 2) * 9 - (i > 2 ? 6 : 0), 2.6, 0, 7); g.fill(); } });
    }
    if (d.scar) { g.strokeStyle = 'rgba(150,70,60,0.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(256 + c.eyeX - 6, c.browY - 30); g.lineTo(256 + c.eyeX + 14, c.eyeY + 34); g.stroke(); }

    for (const sx of [-1, 1]) this.eye(g, 256 + sx * c.eyeX, c.eyeY, sx, s);
    for (const sx of [-1, 1]) this.brow(g, 256 + sx * c.eyeX, sx, s);

    // nose: a tiny shadow stroke
    g.strokeStyle = shade(c.skin, -0.35); g.lineWidth = 4;
    const ny = c.eyeY + c.eyeH * 0.82 + (d.nose === 'big' ? 6 : 0);
    g.beginPath(); g.moveTo(258, ny - (d.nose === 'long' ? 26 : 14)); g.lineTo(262, ny); g.lineTo(254, ny + 3); g.stroke();
    if (d.nose === 'big') { g.beginPath(); g.arc(256, ny, 12, 0.2, Math.PI - 0.2); g.stroke(); }

    this.mouth(g, 256, c.mouthY, s);
    if (d.beard) { // anime moustache, painted
      g.fillStyle = d.beard.color || d.hair.color; g.strokeStyle = c.line; g.lineWidth = 3;
      const big = d.beard.style === 'big' ? 1.3 : 1;
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(256 + sx * 4, c.mouthY - 26);
        g.quadraticCurveTo(256 + sx * 40 * big, c.mouthY - 34 * big, 256 + sx * 62 * big, c.mouthY - 2);
        g.quadraticCurveTo(256 + sx * 34 * big, c.mouthY - 14, 256 + sx * 4, c.mouthY - 12);
        g.closePath(); g.fill(); g.stroke();
      }
    }
    return true;
  }

  eye(g, cx, cy, sx, s) {
    const c = this.cfg;
    const w = c.eyeW * (s.eye === 'wide' ? 1.05 : 1), h = c.eyeH * (1 - c.narrow * 0.35) * (s.eye === 'wide' ? 1.1 : 1);
    const L = c.line;
    if (s.eye === 'closed' || s.eye === 'happy') {
      g.strokeStyle = L; g.lineWidth = 9;
      g.beginPath();
      if (s.eye === 'happy') { g.moveTo(cx - w * 0.45, cy + 8); g.quadraticCurveTo(cx, cy - h * 0.38, cx + w * 0.45, cy + 8); }
      else { g.moveTo(cx - w * 0.48, cy + 4); g.quadraticCurveTo(cx, cy + h * 0.2, cx + w * 0.48, cy + 4); }
      g.stroke();
      // outer lash flick
      g.beginPath(); g.moveTo(cx + sx * w * 0.45, cy + 6); g.lineTo(cx + sx * w * 0.62, cy - 4); g.stroke();
      return;
    }
    // eye white shape: rounded top, flatter bottom
    const top = cy - h * 0.5, bot = cy + h * 0.45;
    const shape = () => {
      g.beginPath();
      g.moveTo(cx - w * 0.5, cy + h * 0.05);
      g.bezierCurveTo(cx - w * 0.5, top - h * 0.05, cx + w * 0.5, top - h * 0.05, cx + w * 0.5, cy + h * 0.05);
      g.bezierCurveTo(cx + w * 0.45, bot + h * 0.02, cx - w * 0.45, bot + h * 0.02, cx - w * 0.5, cy + h * 0.05);
    };
    g.save();
    shape(); g.fillStyle = '#fdfbf6'; g.fill();
    g.clip();
    // iris
    const ir = s.eye === 'wide' ? 0.7 : 1;
    const ix = cx + s.lx * w * 0.2, iy = cy + h * 0.06 - s.ly * h * 0.14;
    const iw = w * 0.36 * ir, ih = h * 0.46 * ir;
    const gr = g.createLinearGradient(0, iy - ih, 0, iy + ih);
    gr.addColorStop(0, shade(c.iris, -0.55)); gr.addColorStop(0.45, shade(c.iris, -0.1)); gr.addColorStop(1, shade(c.iris, 0.45));
    g.fillStyle = gr; g.beginPath(); g.ellipse(ix, iy, iw, ih, 0, 0, 7); g.fill();
    g.strokeStyle = shade(c.iris, -0.6); g.lineWidth = 3; g.stroke();
    g.fillStyle = shade(c.iris, -0.75); g.beginPath(); g.ellipse(ix, iy + ih * 0.05, iw * 0.45, ih * 0.5, 0, 0, 7); g.fill();
    // glints
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(ix - iw * 0.35, iy - ih * 0.4, iw * 0.32, ih * 0.24, -0.4, 0, 7); g.fill();
    g.beginPath(); g.arc(ix + iw * 0.4, iy + ih * 0.42, iw * 0.13, 0, 7); g.fill();
    // upper-lid shadow on the white
    g.fillStyle = 'rgba(120,90,110,0.25)'; g.fillRect(cx - w, top - h, w * 2, h * 0.28 + h * 0.2);
    // lowered lid (sleepy / half / angry / sad): skin covers the top of the eye
    const lid = Math.max(s.eye === 'half' ? 0.55 : 0, s.lid, c.tired);
    let lidL = 0, lidR = 0;
    if (lid > 0 || s.lidAng) {
      const ang = s.lidAng * sx; // + → outer side lower (sad), − → inner side lower (angry)
      lidL = top + h * (lid * 0.75) + h * 0.22 * Math.max(0, -ang * sx) + h * 0.22 * Math.max(0, ang * -sx) * 0;
      const inner = top + h * lid * 0.75 + h * 0.3 * Math.max(0, -s.lidAng);
      const outer = top + h * lid * 0.75 + h * 0.3 * Math.max(0, s.lidAng);
      const yL = sx > 0 ? inner : outer, yR = sx > 0 ? outer : inner;
      g.fillStyle = c.skin; g.beginPath(); g.moveTo(cx - w, top - h); g.lineTo(cx + w, top - h); g.lineTo(cx + w * 0.6, yR); g.lineTo(cx - w * 0.6, yL); g.closePath(); g.fill();
      lidL = yL; lidR = yR;
    }
    g.restore();
    // lash line
    g.strokeStyle = c.line; g.fillStyle = c.line;
    const lt = lid > 0 || s.lidAng;
    g.lineWidth = 9 * c.lash;
    g.beginPath();
    if (lt) { g.moveTo(cx - w * 0.52, lidL + 2); g.lineTo(cx + w * 0.52, lidR + 2); }
    else { g.moveTo(cx - w * 0.52, cy + h * 0.02); g.bezierCurveTo(cx - w * 0.5, top - h * 0.06, cx + w * 0.5, top - h * 0.06, cx + w * 0.52, cy + h * 0.02); }
    g.stroke();
    // wing at the outer corner
    const oy = lt ? (sx > 0 ? lidR : lidL) : cy - h * 0.05;
    g.lineWidth = 7 * c.lash;
    g.beginPath(); g.moveTo(cx + sx * w * 0.48, oy + 4); g.lineTo(cx + sx * w * 0.66, oy - 8 * c.lash); g.stroke();
    // lower lash: short, thin, outer half
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx + sx * w * 0.1, bot + 3); g.quadraticCurveTo(cx + sx * w * 0.35, bot + 2, cx + sx * w * 0.47, cy + h * 0.15); g.stroke();
    // eyelid crease
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(80,40,30,0.5)';
    g.beginPath(); g.moveTo(cx - w * 0.35, top - 10 + (lt ? (lidL - top) * 0.5 : 0)); g.quadraticCurveTo(cx, top - 20 + (lt ? (lidL - top) * 0.5 : 0), cx + w * 0.4, top - 8 + (lt ? (lidR - top) * 0.5 : 0)); g.stroke();
  }

  brow(g, cx, sx, s) {
    const c = this.cfg;
    const y = c.browY - s.brow * 22 - (s.eye === 'wide' ? 14 : 0);
    const inner = y + s.browAng * -18 + (s.browAng < 0 ? 4 : 0);
    const outer = y + s.browAng * 10;
    const xi = cx - sx * c.browW * 0.45, xo = cx + sx * c.browW * 0.55;
    g.strokeStyle = c.browCol; g.lineWidth = c.browT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(xi, inner); g.quadraticCurveTo((xi + xo) / 2, Math.min(inner, outer) - 9, xo, outer + 3); g.stroke();
  }

  mouth(g, cx, cy, s) {
    const c = this.cfg, w = c.mouthW, L = c.line;
    const sm = s.smile;
    g.strokeStyle = L; g.lineWidth = 5;
    const inside = '#8a2a2a', tongue = '#e07070';
    const openShape = (ww, hh, teeth = false) => {
      g.beginPath();
      g.moveTo(cx - ww, cy - sm * 6);
      g.quadraticCurveTo(cx, cy - hh * 0.15 + sm * 2, cx + ww, cy - sm * 6);
      g.quadraticCurveTo(cx + ww * 0.6, cy + hh, cx, cy + hh);
      g.quadraticCurveTo(cx - ww * 0.6, cy + hh, cx - ww, cy - sm * 6);
      g.fillStyle = inside; g.fill();
      g.save(); g.clip();
      g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + hh * 0.95, ww * 0.6, hh * 0.45, 0, 0, 7); g.fill();
      if (teeth) { g.fillStyle = '#fff'; g.fillRect(cx - ww, cy - hh * 0.2, ww * 2, hh * 0.32); }
      g.restore();
      g.lineWidth = 4; g.stroke();
    };
    switch (s.mouth) {
      case 'open1': openShape(w * 0.6, w * 0.38); break;
      case 'open2': openShape(w * 0.75, w * 0.8); break;
      case 'open3': openShape(w * 0.9, w * 1.25, true); break;
      case 'grin': openShape(w * 1.2, w * 0.7, true); break;
      case 'o': g.fillStyle = inside; g.beginPath(); g.ellipse(cx, cy + 6, w * 0.32, w * 0.45, 0, 0, 7); g.fill(); g.lineWidth = 4; g.stroke(); break;
      default: {
        g.beginPath();
        g.moveTo(cx - w * 0.75, cy - sm * 10);
        g.quadraticCurveTo(cx, cy + sm * 14, cx + w * 0.75, cy - sm * 10);
        g.stroke();
      }
    }
  }
}
