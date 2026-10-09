// Stage v4: cinematic presentation on top of v3.
//  * fighters are LIT: soft glow in their own color + a warm rim light from the horizon side
//  * colored glowing motion trails; hit flashes in the attacker's color that light up the scene
//  * planted feet (FootLock), tight framing, foreground occluders, depth-of-field background
import { joints, Springs, FootLock, drawFighter, limbPath, clamp, lerp, hash } from './rig3.js';
import { Fight as Base, W, H } from './stage3.js';
import { FPS } from './engine.js';
export { W, H };
export { two, on, prop, fixed } from './stage3.js';

export class Fight extends Base {
  constructor(def) {
    super(def);
    this.locks = Object.fromEntries(this.names.map((n) => [n, new FootLock()]));
    this.rim = def.rim || { color: '#ffb36b', dx: 2.4, dy: 1.2 };
  }
  attackerOf(e) { return e.by || (e.at ? e.at.split('.')[0] : null); }

  draw(ctx, i) {
    const fr = this.frames[i], t = fr.t, dt = i > 0 ? t - this.frames[i - 1].t : 0;
    const J = {};
    for (const n of this.names) {
      const tr = this.tracks[n], sp = this.springs[n].step(tr, t, dt);
      const feet = this.locks[n].step(joints(tr, t), t, dt);
      J[n] = joints(tr, t, { ...sp, fA: feet.fA, fB: feet.fB });
    }
    const cam = this.cameraAt(t);
    let shx = 0, shy = 0, kick = 0;
    for (const s of this.stops) {
      if (s.frame === undefined || i < s.frame) continue;
      const age = (i - s.frame) / FPS, a = s.shake * Math.exp(-age * 8);
      shx += a * 26 * (hash(i * 3.1 + s.t) - 0.5) * 2; shy += a * 20 * (hash(i * 7.7 + s.t) - 0.5) * 2; kick += s.kick * Math.exp(-age * 9);
    }
    const v = { x: cam.x, y: cam.y, zoom: cam.zoom * (1 + kick), rot: cam.rot || 0, shx, shy };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const impact = fr.stop && fr.k < fr.stop.impact ? (fr.k % 2 ? 'neg' : 'inv') : null;
    if (impact) { this.drawImpact(ctx, v, J, fr.stop, impact); this.overlay && this.overlay(ctx, t, i, this); return; }

    this.scene(ctx, v, t, this);
    this.layer(ctx, v, 1);
    this.set && this.set(ctx, t, this);
    this.decals(ctx, t);
    for (const n of this.names) {   // contact shadow
      const h = clamp(1 - J[n].y / 220, 0.25, 1);
      const g = ctx.createRadialGradient(J[n].H[0], 0, 2, J[n].H[0], 0, 46 * h);
      g.addColorStop(0, `rgba(0,0,0,${0.45 * h})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(J[n].H[0], 0, 46 * h, 8 * h, 0, 0, Math.PI * 2); ctx.fill();
    }
    this.lightPools(ctx, t);
    this.dust(ctx, t);
    for (const n of this.names) this.smears(ctx, n, t, i);
    for (const n of (this.order ? this.order(t) : this.names)) this.drawLit(ctx, J[n], this.fighters[n], this.squash(n, t, J[n]));
    for (const p of Object.values(this.props)) p.draw(ctx, p.sample(t, this.tracks, true), t);
    this.impactLines(ctx, t);
    this.debris(ctx, t);
    this.front && this.front(ctx, v, t, this);   // foreground occluders (own parallax)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.flashes(ctx, t, v);
    if (cam.whip) this.whip(ctx, cam.whip, i);
    this.grade && this.grade(ctx, t, i);
    this.overlay && this.overlay(ctx, t, i, this);
  }

  // glow + rim light + body
  drawLit(ctx, J, F, squash) {
    ctx.save();
    ctx.shadowColor = F.glow || F.color; ctx.shadowBlur = 26;
    drawFighter(ctx, J, F, { alpha: 0.55, mono: F.color, width: 12 });
    ctx.restore();
    ctx.save(); ctx.translate(this.rim.dx, this.rim.dy);
    drawFighter(ctx, J, F, { mono: this.rim.color, width: 12.5, squash });
    ctx.restore();
    drawFighter(ctx, J, F, { squash });
  }

  // fast limbs leave a glowing streak in the fighter's own color
  smears(ctx, n, t, i) {
    const F = this.fighters[n], tr = F.track;
    const now = joints(tr, t), was = joints(tr, t - 0.035);
    for (const [end, root, mid] of [['hA', 'sh', 'eA'], ['hB', 'sh', 'eB'], ['fA', 'H', 'kA'], ['fB', 'H', 'kB']]) {
      const sp = Math.hypot(now[end][0] - was[end][0], now[end][1] - was[end][1]) / 0.035;
      const key = n + end, st = this.limbState[key] || {};
      if (sp > 1000 && !st.fast && !this.frames[i].stop) this.autoSfx.push({ time: i / FPS, type: 'whoosh', power: clamp(sp / 2400, 0.3, 1), x: now[end][0] });
      st.fast = sp > 650; this.limbState[key] = st;
      const a = clamp((sp - 450) / 900);
      if (a < 0.05) continue;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let k = 1; k <= 3; k++) {
        const G = joints(tr, t - k * 0.014);
        ctx.globalAlpha = a * (0.42 - k * 0.1); ctx.strokeStyle = F.color; ctx.lineWidth = 11;
        ctx.beginPath(); limbPath(ctx, G[root], G[mid], G[end]); ctx.stroke();
      }
      // glowing ribbon along the path of the fist/foot
      const pts = []; for (let k = 0; k <= 9; k++) pts.push(joints(tr, t - k * 0.011)[end]);
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = F.color; ctx.shadowBlur = 18;
      for (let k = 0; k < pts.length - 1; k++) {
        ctx.globalAlpha = a * (1 - k / pts.length) * 0.9; ctx.strokeStyle = F.trail || F.color; ctx.lineWidth = 12 * (1 - k / pts.length) + 2;
        ctx.beginPath(); ctx.moveTo(...pts[k]); ctx.lineTo(...pts[k + 1]); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // light from hits spills onto the ground and the set
  lightPools(ctx, t) {
    for (const e of this.events) {
      if (!['hit', 'clash', 'block', 'clang', 'wallhit'].includes(e.type)) continue;
      const age = t - e.t, life = e.type === 'block' ? 0.2 : 0.45;
      if (age < 0 || age > life) continue;
      const col = this.flashColor(e), R = (e.type === 'clash' ? 520 : e.type === 'block' ? 160 : 300) * (1 + age);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R);
      g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - age / life;
      ctx.fillStyle = g; ctx.fillRect(e.x - R, e.y - R, R * 2, R * 2); ctx.restore();
    }
  }
  flashColor(e) {
    if (e.color) return e.color;
    if (e.type === 'clang' || e.type === 'wallhit') return '#ffd27a';
    const a = this.attackerOf(e);
    return a && this.fighters[a] ? this.fighters[a].color : '#ffffff';
  }
  // screen-space bloom flash for the first frames after a hit
  flashes(ctx, t, v) {
    for (const e of this.events) {
      if (!['hit', 'clash'].includes(e.type)) continue;
      const age = t - e.t; if (age < 0 || age > 0.18) continue;
      const k = (1 - age / 0.18) * (e.type === 'clash' ? 0.5 : 0.28);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k;
      ctx.fillStyle = this.flashColor(e); ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // impact lines in the attacker's color, hollow in the middle so the contact stays visible
  impactLines(ctx, t) {
    for (const [k, e] of this.events.entries()) {
      if (!['hit', 'block', 'clash', 'clang', 'wallhit'].includes(e.type)) continue;
      const age = t - e.t, life = e.type === 'block' ? 0.18 : 0.3;
      if (age < 0 || age > life) continue;
      const u = age / life, big = e.type === 'clash' ? 2.2 : e.type === 'block' ? 0.8 : 1 + (e.power || 1) * 0.18;
      const n = e.type === 'block' ? 8 : 14, r0 = (22 + 46 * u) * big, len = 46 * big * (1 - u * 0.5);
      const col = this.flashColor(e);
      ctx.save(); ctx.translate(e.x, e.y); ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.globalAlpha = 1 - u * 0.7;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + hash(k * 7 + j) * 0.5, w = 0.05 + hash(j + k) * 0.05, L = len * (0.6 + hash(j * 3 + k) * 0.9);
        ctx.fillStyle = j % 3 ? col : '#ffffff';
        ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); ctx.lineTo(Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L)); ctx.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); ctx.fill();
      }
      ctx.strokeStyle = col; ctx.lineWidth = 4 * (1 - u); ctx.beginPath(); ctx.arc(0, 0, r0 * 0.8, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let j = 0; j < 12; j++) {   // sparks
        const a = hash(j * 5.1 + k) * Math.PI * 2, sp = 220 + hash(j * 2.3 + k) * 360, d0 = sp * age, d1 = sp * Math.max(0, age - 0.025);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * d1, Math.sin(a) * d1 - 300 * age * age); ctx.lineTo(Math.cos(a) * d0, Math.sin(a) * d0 - 300 * age * age); ctx.stroke();
      }
      if (e.type === 'clash') { ctx.lineWidth = 9 * (1 - u); ctx.beginPath(); ctx.arc(0, 0, 40 + u * 650, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }
}
