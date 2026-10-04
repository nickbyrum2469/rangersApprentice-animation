// Silhouette character rig.
// A figure is a skeleton of absolute limb angles (radians, canvas convention:
// 0 = right, PI/2 = down, -PI/2 = up) drawn as thick rounded strokes, plus
// costume pieces (cloak, hood, bow, quiver). A rim-light pass outlines the
// side facing the moon, which is what makes flat silhouettes read as 3D.
(function () {
  const RA = window.RA;
  const { PI, cos, sin } = Math;
  const D = PI / 2; // straight down

  const chars = (RA.chars = {});

  const pt = (p, a, l) => [p[0] + cos(a) * l, p[1] + sin(a) * l];

  // Body proportions per character build.
  chars.BUILDS = {
    boy:    { torso: 0.30, upper: 0.16, fore: 0.15, thigh: 0.22, shin: 0.22, headR: 0.072, chest: 0.17, limb: 0.06, leg: 0.075 },
    man:    { torso: 0.31, upper: 0.17, fore: 0.16, thigh: 0.23, shin: 0.23, headR: 0.062, chest: 0.19, limb: 0.06, leg: 0.075 },
    big:    { torso: 0.31, upper: 0.17, fore: 0.16, thigh: 0.23, shin: 0.23, headR: 0.062, chest: 0.25, limb: 0.08, leg: 0.09 },
  };

  chars.POSES = {
    stand: { lean: -D, head: 0, armL: [D + 0.12, D + 0.04], armR: [D - 0.1, D - 0.02], legL: [D + 0.07, D + 0.05], legR: [D - 0.07, D - 0.05] },
  };

  // Front-facing climb cycle (the figure faces into the wall, seen from behind).
  chars.climb = function (phase) {
    const s = sin(phase * 2 * PI), c = cos(phase * 2 * PI);
    return {
      lean: -D + s * 0.04, head: -s * 0.08,
      armL: [-D - 0.75 - s * 0.35, -D - 0.25 - s * 0.45],
      armR: [-D + 0.75 - s * 0.35, -D + 0.25 - s * 0.45],
      legL: [D + 0.45 + s * 0.35, D + 0.05 + c * 0.25],
      legR: [D - 0.45 + s * 0.35, D - 0.05 + c * 0.25],
    };
  };

  // Gentle idle: breathing sway layered on any pose.
  chars.idle = function (pose, t, amt = 1) {
    const b = sin(t * 1.6) * 0.015 * amt;
    return { ...pose, lean: pose.lean + b, armL: pose.armL.map((a) => a - b), armR: pose.armR.map((a) => a + b) };
  };

  // Draws a figure. (x, y) is the hip. h ~ total standing height in px.
  chars.figure = function (ctx, t, x, y, h, pose, look = {}) {
    const B = chars.BUILDS[look.build || 'man'];
    const facing = look.facing || 1;
    const hip = [x, y];
    const neck = pt(hip, pose.lean, B.torso * h);
    const headC = pt(neck, pose.lean + (pose.head || 0), B.headR * h * 1.25);

    const limb = (from, [a1, a2], l1, l2) => { const j = pt(from, a1, l1 * h); return [from, j, pt(j, a2, l2 * h)]; };
    const shL = pt(neck, pose.lean - D, B.chest * h * 0.35), shR = pt(neck, pose.lean + D, B.chest * h * 0.35);
    const armL = limb(shL, pose.armL, B.upper, B.fore), armR = limb(shR, pose.armR, B.upper, B.fore);
    const legL = limb(pt(hip, pose.lean - D, B.chest * h * 0.18), pose.legL, B.thigh, B.shin);
    const legR = limb(pt(hip, pose.lean + D, B.chest * h * 0.18), pose.legR, B.thigh, B.shin);

    const stroke = (pts, w) => {
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]);
      ctx.stroke();
    };

    const paint = (col) => {
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // cloak (behind body)
      if (look.cloak) {
        const { length = 0.62, wind = 1, spread = 1 } = look.cloak;
        const L = length * h, down = pose.lean + PI; // direction from neck toward hips
        const flap = (k, i) => sin(t * 3.2 - k * 5 + i) * 0.06 * h * wind * k + RA.noise1(t * 1.7 + k * 3 + i, 3) * 0.03 * h * wind * k;
        const sweep = -facing * wind * 0.22 * h; // wind blows cloak behind the figure
        const hem = [];
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          const across = (k - 0.5) * B.chest * h * 2.4 * spread;
          const base = pt(pt(neck, down, L), pose.lean + D, across);
          hem.push([base[0] + sweep * (0.6 + k * 0.6) + flap(1, i), base[1] + flap(1, i + 2) * 0.5 - k * 0.04 * h * wind]);
        }
        const back = pt(neck, pose.lean - facing * D, B.chest * h * 0.7);
        ctx.beginPath();
        ctx.moveTo(...pt(neck, pose.lean + facing * D, B.chest * h * 0.55));
        ctx.lineTo(...(facing > 0 ? hem[hem.length - 1] : hem[0]));
        const ordered = facing > 0 ? [...hem].reverse() : hem;
        ordered.forEach((p) => ctx.lineTo(...p));
        ctx.quadraticCurveTo(back[0] + sweep * 0.5, back[1] + L * 0.3, back[0], back[1]);
        ctx.closePath(); ctx.fill();
      }

      // quiver on the back
      if (look.quiver) {
        const qa = pose.lean + facing * 0.45 + PI;
        const q0 = pt(neck, pose.lean - facing * D, B.chest * h * 0.4);
        const q1 = pt(q0, qa, 0.3 * h);
        stroke([pt(q0, qa, -0.06 * h), q1], 0.05 * h);
        for (let i = -1; i <= 1; i++) { // fletchings poking out
          const f = pt(pt(q0, qa, -0.08 * h), qa + PI + i * 0.25, 0.04 * h);
          stroke([pt(q0, qa, -0.06 * h), f], 0.012 * h);
        }
      }

        const perp = pose.lean + D, down = pose.lean + PI;
      const limbs = (pts, w) => {
        stroke([pts[0], pts[1]], w); stroke([pts[1], pts[2]], w * 0.82);
      };
      const hand = (p, r) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * PI); ctx.fill(); };
      const boot = (leg, w) => {
        const f = leg[2], a = Math.atan2(leg[2][1] - leg[1][1], leg[2][0] - leg[1][0]);
        ctx.beginPath(); ctx.ellipse(f[0] + cos(a) * w * 0.2 + facing * w * 0.25 * (look.front ? 0 : 1), f[1], w * (look.front ? 0.6 : 0.85), w * 0.55, 0, 0, 2 * PI); ctx.fill();
      };
      limbs(armR, B.limb * h); hand(armR[2], B.limb * h * 0.62);
      limbs(legR, B.leg * h); boot(legR, B.leg * h);
      // torso: shoulders → waist → flared tunic hem
      const sw = B.chest * h * 0.5, hw = B.chest * h * 0.36, tw = B.chest * h * 0.46;
      const hem = pt(hip, down, 0.075 * h);
      ctx.beginPath();
      ctx.moveTo(...pt(neck, perp, sw)); ctx.lineTo(...pt(hip, perp, hw)); ctx.lineTo(...pt(hem, perp, tw));
      ctx.lineTo(...pt(hem, perp, -tw)); ctx.lineTo(...pt(hip, perp, -hw)); ctx.lineTo(...pt(neck, perp, -sw));
      ctx.quadraticCurveTo(...pt(neck, pose.lean, sw * 0.3), ...pt(neck, perp, sw));
      ctx.fill();
      stroke([neck, pt(neck, pose.lean + (pose.head || 0), B.headR * h * 0.6)], 0.05 * h);
      limbs(legL, B.leg * h); boot(legL, B.leg * h);
      limbs(armL, B.limb * h); hand(armL[2], B.limb * h * 0.62);
      // head + messy hair
      ctx.beginPath(); ctx.arc(headC[0], headC[1], B.headR * h, 0, 2 * PI); ctx.fill();
      if (look.hair === 'messy') {
        const r = RA.rng(5);
        for (let i = 0; i < 7; i++) {
          const a = pose.lean + (pose.head || 0) + (i - 3) * 0.32;
          ctx.beginPath(); ctx.arc(...pt(headC, a, B.headR * h * 0.9), B.headR * h * (0.32 + r() * 0.15), 0, 2 * PI); ctx.fill();
        }
      }
      // hood: enlarged head with a point trailing back
      if (look.hood) {
        const hr = B.headR * h * 1.35;
        const tip = pt(headC, pose.lean + PI * 0.5 + facing * -PI * 0.75, hr * 2.1);
        ctx.beginPath();
        ctx.arc(headC[0], headC[1], hr, 0, 2 * PI); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(...pt(headC, pose.lean - facing * 0.4, hr));
        ctx.quadraticCurveTo(tip[0], tip[1] - hr * 0.2, tip[0] + RA.noise1(t * 2, 8) * hr * 0.15, tip[1]);
        ctx.lineTo(...pt(headC, pose.lean + PI + facing * 0.9, hr));
        ctx.fill();
        // shoulders of the mantle
        stroke([pt(neck, pose.lean - D, B.chest * h * 0.75), pt(neck, pose.lean + D, B.chest * h * 0.75)], 0.07 * h);
      }
      // hair (ponytail / long hair silhouettes for other characters)
      if (look.hair === 'long') {
        ctx.beginPath(); ctx.ellipse(headC[0] - facing * B.headR * h * 0.4, headC[1] + B.headR * h * 1.2, B.headR * h * 0.75, B.headR * h * 1.8, 0, 0, 2 * PI); ctx.fill();
      }
      // longbow held in the front hand
      if (look.bow === 'hand') {
        const hand = armL[2], bl = 0.5 * h;
        const top = [hand[0] + facing * 0.03 * h, hand[1] - bl], bot = [hand[0] + facing * 0.03 * h, hand[1] + bl];
        ctx.lineWidth = 0.022 * h;
        ctx.beginPath(); ctx.moveTo(...top); ctx.quadraticCurveTo(hand[0] + facing * 0.17 * h, hand[1], ...bot); ctx.stroke();
        ctx.lineWidth = Math.max(1, 0.004 * h);
        ctx.beginPath(); ctx.moveTo(...top); ctx.lineTo(...bot); ctx.stroke();
      }
    };

    ctx.save();
    if (look.rim) {
      const [dx, dy] = look.rimOffset || [2.5, -2];
      ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha = look.rimAlpha ?? 0.85;
      ctx.shadowColor = look.rim; ctx.shadowBlur = 6;
      paint(look.rim);
      ctx.restore();
    }
    paint(look.color || '#04060b');
    ctx.restore();
    return { hip, neck, head: headC, handL: armL[2], handR: armR[2], footL: legL[2], footR: legR[2] };
  };

  // The Ranger: a hand-shaped silhouette (cowl, mottled cloak, longbow, quiver)
  // because the cloak, not the skeleton, is what makes the character read.
  // (x, y) = feet on the ground. Designed facing right; facing:-1 mirrors.
  chars.ranger = function (ctx, t, x, y, h, o = {}) {
    const f = o.facing || 1, u = h / 100;
    const w = (o.wind ?? 1) * (1 + 0.25 * RA.noise1(t * 0.9, 12));
    const br = sin(t * 1.6) * 0.4; // breathing
    const P = (px, py) => [x + f * px * u, y + py * u];
    const paint = (col) => {
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // legs & boots below the hem
      ctx.lineWidth = 6.5 * u;
      ctx.beginPath(); ctx.moveTo(...P(-3, -40)); ctx.lineTo(...P(-5, -4)); ctx.moveTo(...P(3, -40)); ctx.lineTo(...P(5, -4)); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(...P(-3.5, -2.5), 5.5 * u, 3 * u, 0, 0, 2 * PI); ctx.ellipse(...P(7, -2.5), 5.5 * u, 3 * u, 0, 0, 2 * PI); ctx.fill();
      // arrows in the quiver, poking above the back shoulder
      ctx.lineWidth = 1.1 * u;
      [[-6, -76, -17, -91], [-4, -77, -14.5, -94], [-8, -75, -19.5, -88]].forEach(([a, b, c2, d]) => {
        ctx.beginPath(); ctx.moveTo(...P(a, b)); ctx.lineTo(...P(c2, d + br)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(...P(c2, d + br)); ctx.lineTo(...P(c2 - 2.5, d + 4 + br)); ctx.lineTo(...P(c2 + 1, d + 4.5 + br)); ctx.fill();
      });
      // cloak + cowl in one shape
      ctx.beginPath();
      ctx.moveTo(...P(1, -100 + br));
      ctx.quadraticCurveTo(...P(7, -99 + br), ...P(8.5, -88 + br));    // cowl brow overhanging the face
      ctx.lineTo(...P(5.5, -84 + br));
      ctx.quadraticCurveTo(...P(11, -80 + br), ...P(11, -64));          // chest
      ctx.quadraticCurveTo(...P(12, -45), ...P(9, -23));               // front edge
      const hem = 9;
      for (let i = 0; i <= hem; i++) {                                 // wavy hem streaming back
        const k = i / hem;
        const hx = 9 - k * (30 + w * 10), hy = -22 + k * (2 - w * 3) + sin(t * 3.4 - k * 6) * 1.6 * w * k + (i % 2 ? 1.2 : 0);
        ctx.lineTo(...P(hx, hy));
      }
      ctx.quadraticCurveTo(...P(-22 - w * 11 + sin(t * 2.3) * 2 * w, -56), ...P(-10, -77 + br)); // back billow
      ctx.quadraticCurveTo(...P(-9, -84 + br), ...P(-14 - w * 3, -91 + br + sin(t * 4) * 0.8)); // cowl tail
      ctx.quadraticCurveTo(...P(-7, -100 + br), ...P(1, -100 + br));
      ctx.closePath(); ctx.fill();
      // bow arm emerging from the cloak
      ctx.lineWidth = 5 * u;
      ctx.beginPath(); ctx.moveTo(...P(8, -72 + br)); ctx.lineTo(...P(13.5, -61)); ctx.lineTo(...P(17, -53)); ctx.stroke();
      ctx.beginPath(); ctx.arc(...P(17.5, -52), 3 * u, 0, 2 * PI); ctx.fill();
      // longbow, nearly his own height
      ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(...P(15, -98)); ctx.quadraticCurveTo(...P(28, -52), ...P(15, -6)); ctx.stroke();
      ctx.lineWidth = Math.max(1, 0.35 * u);
      ctx.beginPath(); ctx.moveTo(...P(15, -98)); ctx.lineTo(...P(15, -6)); ctx.stroke();
    };
    ctx.save();
    if (o.rim) {
      ctx.save(); ctx.translate(...(o.rimOffset || [2.5, -2])); ctx.globalAlpha = o.rimAlpha ?? 0.9;
      ctx.shadowColor = o.rim; ctx.shadowBlur = 8; paint(o.rim); ctx.restore();
    }
    paint(o.color || '#04060b');
    ctx.restore();
  };

  // Ready-made characters for the series.
  chars.cast = {
    halt: { build: 'man', hood: true, cloak: { length: 0.66 }, bow: 'hand', quiver: true },
    will: { build: 'boy', hair: 'messy', front: true },
    horace: { build: 'big' },
    alyss: { build: 'man', hair: 'long' },
  };
})();
