// Episode runtime: loads the voice timeline, builds each scene's set + cast on demand,
// and renders any moment of the episode deterministically (same T → same frame).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RIM } from './toon.js';
import { makeCharacter } from './cast.js';
import { SetBuilder } from './kit.js';
import { SceneCtx, add, blinkAt, talking, P, lookAt, headPos, clamp } from './director.js';
import { EXPR } from './character.js';
export { EXPR };

// Film look: vignette, warm/cool grade, a breath of grain, and fades to black.
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.35 }, fade: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1.05 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vignette, fade, sat; uniform vec3 tint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 7.0) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, sat) * tint;
      vec2 d = vUv - 0.5; d.x *= 1.3;
      c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.95, length(d));
      c.rgb *= 1.0 - fade;
      gl_FragColor = c;
    }`,
};

export class Runtime {
  constructor({ width = 1920, height = 1080, timeline, scenes, canvas }) {
    this.W = width; this.H = height; this.TL = timeline; this.defs = scenes;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, canvas });
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 1200);
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width / 2, height / 2), 0.45, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);
    this.composer.addPass(new OutputPass());
    this.active = null;
    // 2D overlay for titles / cards
    this.overlay = document.createElement('canvas');
    this.overlay.width = width; this.overlay.height = height;
    this.out = document.createElement('canvas');
    this.out.width = width; this.out.height = height;
  }

  sceneAt(T) {
    const list = this.TL.scenes;
    for (let i = list.length - 1; i >= 0; i--) if (T >= list[i].start - 0.6) return list[i];
    return list[0];
  }

  load(info) {
    if (this.active?.info.n === info.n) return this.active;
    if (this.active) this.dispose(this.active);
    const def = this.defs[info.n];
    const scene = new THREE.Scene();
    const S = new SetBuilder();
    const ctx = new SceneCtx(this.TL, info);
    const cast = {};
    for (const id of def.cast || []) { cast[id] = makeCharacter(id); scene.add(cast[id].root); }
    const env = def.build({ S, scene, ctx, cast, THREE }) || {};
    scene.add(S.group);
    this.active = { info, def, scene, S, ctx, cast, env };
    return this.active;
  }

  dispose(a) {
    a.scene.traverse((o) => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.(); });
  }

  applyPoses(poses, cast, ctx, t, T) {
    // Characters: scene pose + automatic acting (blink, breath, talk, look at speaker)
    for (const [id, c] of Object.entries(cast)) {
      const p = poses[id];
      if (!p) { c.root.visible = false; continue; }
      c.root.visible = p.visible !== false;
      const seed = id.length * 7 + id.charCodeAt(0);
      const env_ = ctx.mouth(id, t);
      let pose = add(P.stand(), p.noIdle ? null : P.idle(t, seed, p.idleAmt ?? 1), p);
      if (env_ > 0 || ctx.speaking(id, t)) pose = add(pose, talking(env_, t, seed, p.gesture ?? 0.6));
      // look at a target (another character id, a point, or the camera)
      let tgt = p.lookAt;
      if (tgt === undefined) { const cur = ctx.current(t); if (cur?.id && cur.id !== id && cast[cur.id] && t < cur.e + 1.5) tgt = cur.id; }
      if (tgt) {
        const tp = tgt === 'camera' ? this.camera.position.toArray() : typeof tgt === 'string' ? (cast[tgt] ? headPos(cast[tgt]) : null) : tgt;
        if (tp) {
          c.root.position.set(...pose.pos); c.root.rotation.y = pose.yaw || 0; c.root.updateMatrixWorld();
          const la = lookAt(c, pose.yaw || 0, pose.pos, tp);
          pose = add(pose, { head: { turn: la.head.turn * (p.lookAmt ?? 1), nod: la.head.nod * (p.lookAmt ?? 1) * 0.6 } });
          pose.look = la.look;
        }
      }
      pose.expr = { ...EXPR.neutral, ...(typeof p.face === 'string' ? EXPR[p.face] : p.face || {}), ...(pose.expr || {}) };
      pose.mouth = Math.max(env_, p.mouth || 0);
      pose.blink = Math.max(blinkAt(T, seed), p.blink || 0);
      pose.t = T;
      c.apply(pose);
    }
  }

  // Render global episode time T into the output canvas.
  frame(T) {
    const info = this.sceneAt(T);
    const a = this.load(info);
    const t = T - info.start;
    const { def, ctx, cast, S, scene, env } = a;
    S.update(t);
    // Two passes: the second sees everyone's settled positions (for look-at targets & cameras).
    let out;
    for (let pass = 0; pass < 2; pass++) {
      out = def.frame({ t, T, ctx, cast, env, S, scene }) || {};
      this.applyPoses(out.poses || {}, cast, ctx, t, T);
      scene.updateMatrixWorld(true);
    }
    scene.updateMatrixWorld(true);

    // Camera
    const cam = typeof out.camera === 'function' ? out.camera() : out.camera;
    if (cam) {
      this.camera.position.set(...cam.pos);
      this.camera.fov = cam.fov || 35;
      this.camera.up.set(Math.sin(cam.roll || 0), Math.cos(cam.roll || 0), 0);
      this.camera.lookAt(...cam.target);
      this.camera.updateProjectionMatrix();
    }

    // Fade in/out around scene boundaries
    const fadeIn = def.fadeIn ?? 0.6, fadeOut = def.fadeOut ?? 0.6;
    const toEnd = info.end + 0.6 - T;
    let fade = Math.max(clamp(1 - t / fadeIn), clamp(1 - toEnd / fadeOut));
    if (out.fade !== undefined) fade = Math.max(fade, out.fade);
    this.finish.uniforms.time.value = T;
    this.finish.uniforms.fade.value = fade;
    this.finish.uniforms.vignette.value = def.vignette ?? 0.35;
    this.finish.uniforms.tint.value.set(...(def.tint || [1, 1, 1]));
    this.finish.uniforms.sat.value = def.sat ?? 1.12;
    this.bloom.strength = def.bloom ?? 0.45;
    RIM.color.value.set(def.rim || '#fff2dd');
    RIM.strength.value = def.rimStrength ?? 0.55;
    this.renderPass.scene = scene;
    this.composer.render();

    // Composite overlay text
    const o = this.out.getContext('2d');
    o.drawImage(this.renderer.domElement, 0, 0, this.W, this.H);
    if (out.overlay) {
      const g = this.overlay.getContext('2d');
      g.clearRect(0, 0, this.W, this.H);
      out.overlay(g, this.W, this.H);
      o.drawImage(this.overlay, 0, 0);
    }
    return this.out;
  }
}

// Title text helper for overlays.
export function titleText(g, W, H, str, y, alpha, { size = 110, font = 'Cinzel', weight = 700, color = '#f6e7c4', spacing = 0.12, glow = 'rgba(255,200,120,0.6)' } = {}) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, alpha);
  g.font = `${weight} ${size}px ${font}`;
  g.letterSpacing = `${size * spacing}px`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = glow; g.shadowBlur = size * 0.4;
  g.fillStyle = color;
  g.fillText(str, W / 2 + (size * spacing) / 2, y);
  g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 10;
  g.fillText(str, W / 2 + (size * spacing) / 2, y);
  g.restore();
}
