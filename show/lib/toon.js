// Cartoon look: cel-shaded materials, ink outlines, procedural storybook textures.
import * as THREE from 'three';

// 3-step light ramp shared by every toon material → crisp cartoon shading bands.
const ramp = (() => {
  const d = new Uint8Array([150, 150, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 2, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

// Anime rim light: a bright fresnel edge on characters. Scenes set its colour/strength.
export const RIM = { color: { value: new THREE.Color('#fff2dd') }, strength: { value: 0.55 } };
function addRim(m) {
  m.onBeforeCompile = (s) => {
    s.uniforms.rimColor = RIM.color; s.uniforms.rimStrength = RIM.strength;
    s.fragmentShader = 'uniform vec3 rimColor; uniform float rimStrength;\n' + s.fragmentShader.replace('#include <opaque_fragment>',
      'float rimF = 1.0 - clamp(dot(normalize(vViewPosition), -normal), 0.0, 1.0);\n outgoingLight += rimColor * smoothstep(0.62, 0.78, rimF) * rimStrength * diffuseColor.rgb;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'rim';
}

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = JSON.stringify([color, opts.map?.uuid, opts.emissive, opts.side, opts.transparent, opts.opacity, opts.rim, opts.vertexColors]);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const { unique, rim, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...rest });
  if (rim) addRim(m);
  if (!opts.unique) matCache.set(key, m);
  return m;
}

// Ink outline: a back-face shell pushed out along normals (the classic anime "inverted hull").
const outlineMats = new Map();
export function outlineMat(thickness = 0.012, color = 0x24160f) {
  const key = thickness + ':' + color;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.thick = { value: thickness };
    s.vertexShader = 'uniform float thick;\n' + s.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n transformed += normalize(normal) * thick;');
  };
  m.customProgramCacheKey = () => 'outline' + key;
  outlineMats.set(key, m);
  return m;
}

// Mesh with outline child. Outline thickness is in world units, divided by the object's scale.
export function inked(geo, mat, thickness = 0.012, castShadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  if (thickness > 0) {
    const o = new THREE.Mesh(geo, outlineMat(thickness));
    o.userData.outline = true;
    m.add(o);
  }
  return m;
}

// ---------------- procedural textures ----------------
function canvasTex(w, h, paint, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return '#' + c.getHexString();
};

export const tex = {
  // Castle stone: rough-cut blocks in courses.
  stone(base = '#9a8f80', seed = 1, rows = 8) {
    return canvasTex(512, 512, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = shade(base, -0.22); g.fillRect(0, 0, w, h);
      const rh = h / rows;
      for (let y = 0; y < rows; y++) {
        let x = -r() * 80;
        while (x < w) {
          const bw = 60 + r() * 70;
          g.fillStyle = shade(base, (r() - 0.5) * 0.12);
          g.beginPath(); g.roundRect(x + 3, y * rh + 3, bw - 6, rh - 6, 6); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 6, y * rh + 4, bw - 12, 3);
          for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`; g.beginPath(); g.arc(x + r() * bw, y * rh + r() * rh, 1 + r() * 3, 0, 7); g.fill(); }
          x += bw;
        }
      }
    });
  },
  planks(base = '#8a5a35', seed = 2, n = 6, vertical = false) {
    return canvasTex(512, 512, (g, w, h) => {
      const r = rng(seed);
      const pw = (vertical ? w : h) / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = shade(base, (r() - 0.5) * 0.1);
        if (vertical) g.fillRect(i * pw, 0, pw, h); else g.fillRect(0, i * pw, w, pw);
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
        for (let k = 0; k < 7; k++) { // grain
          g.beginPath();
          const o = i * pw + r() * pw;
          if (vertical) { g.moveTo(o, 0); g.bezierCurveTo(o + 6, h / 3, o - 6, h / 2, o + 3, h); }
          else { g.moveTo(0, o); g.bezierCurveTo(w / 3, o + 6, w / 2, o - 6, w, o + 3); }
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,0.35)';
        if (vertical) g.fillRect(i * pw, 0, 3, h); else g.fillRect(0, i * pw, w, 3);
      }
    });
  },
  plaster(base = '#e8dcc0', seed = 3) {
    return canvasTex(256, 256, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(${r() > 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 10, 0, 7); g.fill(); }
    });
  },
  grass(base = '#6f9a45', seed = 4) {
    return canvasTex(256, 256, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 900; k++) {
        g.strokeStyle = shade(base, (r() - 0.4) * 0.16); g.lineWidth = 1.5;
        const x = r() * w, y = r() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - 4 - r() * 6); g.stroke();
      }
    });
  },
  dirt(base = '#a88a62', seed = 5) {
    return canvasTex(256, 256, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 600; k++) { g.fillStyle = shade(base, (r() - 0.5) * 0.18); g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 3, 0, 7); g.fill(); }
    });
  },
  flagstone(base = '#8d877c', seed = 6) {
    return canvasTex(512, 512, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = shade(base, -0.25); g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        g.fillStyle = shade(base, (r() - 0.5) * 0.1);
        g.beginPath(); g.roundRect(x * 128 + 4 + r() * 4, y * 128 + 4 + r() * 4, 118, 118, 10); g.fill();
      }
    });
  },
  thatch(base = '#c8a35a', seed = 7) {
    return canvasTex(256, 256, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = shade(base, -0.1); g.fillRect(0, 0, w, h);
      for (let k = 0; k < 1500; k++) {
        g.strokeStyle = shade(base, (r() - 0.5) * 0.25); g.lineWidth = 1.2;
        const x = r() * w, y = r() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 10 + r() * 14); g.stroke();
      }
    });
  },
  // Mottled Ranger cloak camouflage.
  mottled(a = '#5e6b4a', b = '#7d8466', c = '#3f4a35', seed = 8) {
    return canvasTex(256, 256, (g, w, h) => {
      const r = rng(seed);
      g.fillStyle = a; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 160; k++) {
        g.fillStyle = r() > 0.5 ? b : c; g.globalAlpha = 0.55;
        g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 18, 4 + r() * 12, r() * 3, 0, 7); g.fill();
      }
    });
  },
  books(seed = 9) {
    return canvasTex(512, 512, (g, w, h) => {
      const r = rng(seed);
      const cols = ['#7a2e24', '#2f4a6a', '#5a6b2f', '#8a6a2a', '#4a2f5a', '#2a5a52', '#6a4a2a'];
      g.fillStyle = '#3a2716'; g.fillRect(0, 0, w, h);
      for (let row = 0; row < 4; row++) {
        let x = 4;
        const top = row * 128 + 10;
        while (x < w - 10) {
          const bw = 10 + r() * 16, bh = 90 + r() * 26;
          g.fillStyle = cols[Math.floor(r() * cols.length)];
          g.fillRect(x, top + 118 - bh, bw, bh);
          g.fillStyle = 'rgba(255,220,150,0.35)'; g.fillRect(x + 2, top + 118 - bh + 10, bw - 4, 3);
          x += bw + 1;
        }
        g.fillStyle = '#5a3d22'; g.fillRect(0, row * 128 + 118, w, 10);
      }
    });
  },
};
