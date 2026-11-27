/* Pasteup: the song as a moving paste-up, shot in 3D. Every word or short phrase gets its own
   composition: big type with real thickness, script and blackletter, ransom-note scraps, the cover's
   subject cut out in two inks, halftone dots, stickers, tickets, signs, scribbles. The layers sit at
   different depths in front of a lit wall, cast soft shadows on each other, catch a key light and
   go soft out of focus. A wide-lens camera drifts, orbits and dollies through them, gets knocked by
   every sung word, and gets from one composition to the next by moving: flying through the paper,
   panning across, letting a sheet drop in. All on the GPU, with real motion blur. One colour scheme
   per song and a different edit every play. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, PU = O.PU, E = PU.E;
  const PI = Math.PI;
  const D0 = 1.35, FOV0 = 2 * Math.atan(0.5 / D0);

  O.css('pasteup', `
.m-pu { background: #0c0b0c; }
.m-pu .gl-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
`);

  // ---------------------------------------------------------------- small 3D maths
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  function persp(fovy, asp, n, f, o) { o.fill(0); const t = 1 / Math.tan(fovy / 2); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f); return o; }
  function look(eye, at, up, o) {
    const z = V.norm(V.sub(eye, at)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
    o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0; o[12] = -V.dot(x, eye); o[13] = -V.dot(y, eye); o[14] = -V.dot(z, eye); o[15] = 1;
    return o;
  }
  function mm(a, b, o) { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

  const VS = `#version 300 es
layout(location = 0) in vec2 aQ;
uniform vec3 uC[4]; uniform mat4 uVP; uniform vec3 uExt; uniform float uExtN;
out vec2 vUV; out vec3 vW; out float vI;
void main() {
  int i = int(aQ.x + .5) + int(aQ.y + .5) * 2;
  float k = uExtN > 1.5 ? float(gl_InstanceID) / (uExtN - 1.) : 1.;
  vec3 w = uC[i] + uExt * (1. - k);
  vW = w; vI = k;
  gl_Position = uVP * vec4(w, 1.);
  vUV = vec2(aQ.x, 1. - aQ.y);
}`;
  // a piece of paper in the light: soft focus by depth, a wipe-on, a key light with a pool and a
  // sheen, thickness shaded darker, a shadow mode, fog into the wall colour, soft edges
  const FS_LAYER = `
in vec2 vUV; in vec3 vW; in float vI;
uniform sampler2D uT; uniform sampler2D uPaper;
uniform float uA, uBlur, uLit, uGloss, uShadow, uPaperK, uFogK, uExtN;
uniform vec4 uRev; uniform vec2 uTS, uKey; uniform vec3 uMul, uN, uCam, uLP, uPool, uFogC, uShC;
out vec4 o;
void main() {
  vec2 g = vec2(fwidth(vUV.x * uTS.x), fwidth(vUV.y * uTS.y));
  float lod = log2(max(max(g.x, g.y), 1e-4));
  vec4 c = textureLod(uT, vUV, max(lod, 0.) + uBlur);
  vec2 q = vec2(vUV.x, 1. - vUV.y);
  float m = 1.;
  int md = int(uRev.x + .5);
  if (md > 0) {
    float sf = max(uRev.z, .001), p = uRev.y * (1. + sf);
    float v = md == 1 ? q.x : md == 2 ? 1. - q.x : md == 3 ? q.y : md == 5 ? 1. - q.y : fract(atan(q.y - .5, q.x - .5) / 6.2831853 + .75);
    m = 1. - smoothstep(p - sf, p, v);
  }
  vec2 fw = max(fwidth(vUV), vec2(1e-5)) * 1.2;
  vec2 e = smoothstep(vec2(0.), fw, vUV) * smoothstep(vec2(0.), fw, 1. - vUV);
  float a = uA * m * e.x * e.y;
  if (uShadow > .5) { o = vec4(uShC * c.a, c.a) * a; return; }
  vec3 N = normalize(uN), Vd = normalize(uCam - vW);
  if (dot(N, Vd) < 0.) N = -N;
  vec3 L = normalize(uLP - vW);
  float dif = max(dot(N, L), 0.);
  float pool = exp(-dot(vW.xy - uPool.xy, vW.xy - uPool.xy) * uPool.z);
  float lit = mix(1., (.42 + .7 * dif) * (.62 + uKey.y * pool) * uKey.x, uLit);
  vec3 rgb = c.rgb * uMul;
  if (uExtN > 1.5 && vI < .999) rgb *= mix(.28, .5, vI);
  rgb *= lit;
  vec3 H = normalize(L + Vd);
  rgb += pow(max(dot(N, H), 0.), 70.) * uGloss * c.a;
  float pk = texture(uPaper, vW.xy * .9 + vec2(.13, .37)).r;
  rgb *= mix(1., pk * 1.12, uPaperK);
  float d = length(uCam - vW);
  rgb = mix(rgb, uFogC * c.a, clamp(uFogK * d, 0., .7));
  o = vec4(rgb, c.a) * a;
}`;
  const FS_ACC = `uniform sampler2D uSrc; uniform float uW; out vec4 o;
void main() { o = texture(uSrc, gl_FragCoord.xy / uRes) * uW; }`;
  const FS_FIN = `
uniform sampler2D uSrc; uniform float uTime, uGrain, uVig, uCA, uFlash, uGlow, uInv, uGlitch; uniform vec3 uFlashCol; out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float ca = uCA;
  // a broken-signal cut: bands of the picture slip sideways and the colours split
  if (uGlitch > 0.) {
    float fr = floor(uTime * 30.);
    float band = floor(uv.y * (14. + 26. * hash12(vec2(fr, 3.))));
    float h = hash12(vec2(band, fr)), on = step(.45, hash12(vec2(band * 1.7, fr + 9.)));
    uv.x += (h - .5) * .22 * uGlitch * on;
    float blk = step(.93, hash12(floor(uv * vec2(18., 30.)) + fr));
    uv += (vec2(hash12(vec2(band, fr + 2.)), hash12(vec2(fr, band))) - .5) * .06 * uGlitch * blk;
    ca += .05 * uGlitch;
  }
  vec2 d = uv - .5;
  ca *= (.3 + dot(d, d) * 2.);
  vec3 c = vec3(texture(uSrc, uv - d * ca).r, texture(uSrc, uv).g, texture(uSrc, uv + d * ca).b);
  // a little glow off the brightest paper
  vec3 gl = vec3(0.);
  for (int i = 0; i < 8; i++) { float a = float(i) * .785; gl += max(texture(uSrc, uv + vec2(cos(a), sin(a)) * vec2(uRes.y / uRes.x, 1.) * .012).rgb - .72, 0.); }
  c += gl * uGlow;
  float fr = floor(uTime * 24.);
  float n = hash12(gl_FragCoord.xy + fr * 41.7) + hash12(gl_FragCoord.xy * .5 + fr * 13.3) - 1.;
  c += n * uGrain;
  float r = length(d * vec2(uRes.x / uRes.y, 1.));
  c *= 1. - uVig * smoothstep(.45, 1.05, r);
  c = mix(c, uFlashCol, uFlash);
  c = mix(c, 1. - clamp(c, 0., 1.), uInv);
  if (uGlitch > 0.) { float fr = floor(uTime * 30.); c += (hash12(vec2(floor(gl_FragCoord.y / 3.), fr)) - .5) * .12 * uGlitch; }
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

  // ---------------------------------------------------------------- moving from one composition to the next
  // k runs 0..1 over [b - pre, b + post]; out() moves the old card, inn() the new one.
  // pivot 'cam' turns things round the camera: a real pan.
  const TR = {
    cut: { pre: 0, post: 0, w: 0.6 },
    slam: { pre: 0, post: 0.15, w: 1.3, out: (c) => { c.a = 0; }, inn: (c, k, d) => { const e = E.out5(k); c.pz += 0.6 * (1 - e); c.rz += 0.06 * d * (1 - e); } },
    flash: { pre: 0, post: 0.12, w: 0.4, flash: true, out: (c) => { c.a = 0; } },
    fly: { pre: 0.16, post: 0.26, w: 1.5, out: (c, k) => { c.pz += 2.6 * E.in3(k); c.a *= 1 - U.sat((k - 0.75) / 0.25); }, inn: (c, k) => { c.pz -= 3.2 * (1 - E.out5(k)); } },
    whip: { pre: 0.08, post: 0.14, w: 1.2, out: (c, k, d) => { c.ry -= d * 1.05 * E.io(k); c.pv = 1; }, inn: (c, k, d) => { c.ry += d * 1.05 * (1 - E.io(k)); c.pv = 1; } },
    vwhip: { pre: 0.08, post: 0.14, w: 0.7, out: (c, k, d) => { c.rx -= d * 0.9 * E.io(k); c.pv = 1; }, inn: (c, k, d) => { c.rx += d * 0.9 * (1 - E.io(k)); c.pv = 1; } },
    push: { pre: 0.12, post: 0.18, w: 0.8, out: (c, k) => { const q = U.sat(k / 0.55); c.pz += 1.15 * E.in3(q); if (k > 0.55) c.a = 0; }, inn: (c, k) => { if (k < 0.45) { c.a = 0; return; } c.pz -= 0.5 * (1 - E.out5(U.sat((k - 0.45) / 0.55))); } },
    smear: { pre: 0.1, post: 0.12, w: 0.6, out: (c, k) => { const q = U.sat(k / 0.5); c.sx *= 1 + 5 * E.in3(q); c.a *= k < 0.5 ? 1 - q * 0.6 : 0; }, inn: (c, k) => { if (k < 0.45) { c.a = 0; return; } c.sx *= 1 + 1.6 * (1 - E.out5(U.sat((k - 0.45) / 0.55))); } },
    slide: { pre: 0, post: 0.26, w: 0.8, tail: true, out: (c, k) => { const e = E.out3(k); c.pz -= 0.95 * e; c.a *= 1 - 0.5 * e; }, inn: (c, k, d) => { const e = E.out5(k); c.py -= d * 1.4 * (1 - e); c.rx += 0.5 * d * (1 - e); c.pz += 0.12 * (1 - e); } },
    drop: { pre: 0, post: 0.3, w: 1, tail: true, out: (c, k) => { const e = E.out3(k); c.pz -= 0.95 * e; c.a *= 1 - 0.5 * e; }, inn: (c, k, d) => { const e = E.out3(k); c.py += 1.3 * (1 - e); c.rx -= 1.1 * (1 - e); c.rz += d * 0.25 * (1 - e); c.pz += 0.35 * (1 - e); } },
    backfly: { pre: 0.14, post: 0.24, w: 1.1, out: (c, k) => { c.pz -= 3.4 * E.in3(k); c.a *= 1 - U.sat((k - 0.6) / 0.4); }, inn: (c, k) => { if (k < 0.3) { c.a = 0; return; } const e = E.out5(U.sat((k - 0.3) / 0.7)); c.pz += 1.05 * (1 - e); c.a *= U.sat((k - 0.3) * 6); } },
    crash: { pre: 0, post: 0.2, w: 0.9, out: (c) => { c.a = 0; }, inn: (c, k, d) => { const e = E.out5(k); c.pz += 1.15 * (1 - e); c.rz += d * 0.35 * (1 - e); c.ry += d * 0.4 * (1 - e); } },
    // a disc of the next page's paper grows over everything, then the page is there
    iris: { pre: 0.42, post: 0, w: 0.5, snap: true, nocam: true },
    // a hard cut hidden in a burst of broken signal
    glitch: { pre: 0, post: 0, w: 0.5, glitch: true },
    // the page turns over like a card, the next one on its back
    flipY: { pre: 0.12, post: 0.18, w: 0.9, out: (c, k, d) => { const q = U.sat(k / 0.5); c.ry -= d * 1.5708 * E.in3(q); c.pz += 0.15 * q; if (k > 0.5) c.a = 0; }, inn: (c, k, d) => { if (k < 0.5) { c.a = 0; return; } const e = E.out3((k - 0.5) / 0.5); c.ry += d * 1.5708 * (1 - e); c.pz += 0.15 * (1 - e); } },
    // the old page falls over backwards and the next one rises out of the dark
    tumble: { pre: 0.16, post: 0.22, w: 0.8, out: (c, k) => { const e = E.in3(k); c.rx -= 1.35 * e; c.py -= 0.35 * e; c.pz -= 0.3 * e; c.a *= 1 - U.sat((k - 0.7) / 0.3); }, inn: (c, k, d) => { if (k < 0.35) { c.a = 0; return; } const e = E.out5(U.sat((k - 0.35) / 0.65)); c.pz -= 0.9 * (1 - e); c.rz += d * 0.12 * (1 - e); c.a *= U.sat((k - 0.35) * 5); } },
    // a twist and a rush in
    spiral: { pre: 0.1, post: 0.18, w: 0.8, out: (c, k, d) => { const e = E.in3(k); c.rz += d * 1.3 * e; c.s *= 1 + 1.6 * e; c.a *= 1 - U.sat((k - 0.6) / 0.4); }, inn: (c, k, d) => { if (k < 0.4) { c.a = 0; return; } const e = E.out5(U.sat((k - 0.4) / 0.6)); c.rz -= d * 0.9 * (1 - e); c.s *= 1 - 0.55 * (1 - e); } },
    roll: { pre: 0.08, post: 0.16, w: 0.7, out: (c, k, d) => { const q = U.sat(k / 0.5); c.rz += d * 0.9 * E.in3(q); c.pz += 0.7 * E.in3(q); if (k > 0.5) c.a = 0; }, inn: (c, k, d) => { if (k < 0.5) { c.a = 0; return; } const e = E.out5((k - 0.5) / 0.5); c.rz -= d * 0.7 * (1 - e); c.pz += 0.4 * (1 - e); } },
  };
  const INSIDE = ['slam', 'whip', 'fly', 'smear', 'cut', 'push', 'flash', 'vwhip', 'roll', 'backfly', 'crash', 'flipY', 'spiral'];
  const BETWEEN = ['fly', 'drop', 'slide', 'whip', 'roll', 'vwhip', 'push', 'backfly', 'iris', 'glitch', 'flipY', 'tumble'];
  // into and out of a collage scroll
  const INTO_SCROLL = [['iris', 1.2], ['glitch', 0.7], ['drop', 0.6], ['slide', 0.5], ['push', 0.5], ['fly', 0.4]];
  const OUT_SCROLL = [['glitch', 1.1], ['iris', 0.9], ['slam', 0.5], ['crash', 0.4], ['flash', 0.3]];
  // how the camera moves over one composition
  const CAMS = ['orbit', 'dolly', 'crane', 'drift', 'dutch', 'arc', 'low', 'high', 'push', 'spin', 'pull'];
  function camMove(R, kind) {
    kind = kind || R.pick(CAMS);
    const s = R.sgn();
    const c = { yaw: [0, 0], pitch: [0, 0], dist: [1.36, 1.3], roll: [0, 0], tx: [0, 0], ty: [0, 0], ap: R.r(2.6, 4.2) };
    if (kind === 'orbit') { c.yaw = [-s * R.r(0.1, 0.22), s * R.r(0.08, 0.2)]; c.pitch = [R.r(-0.08, 0.08), R.r(-0.06, 0.06)]; c.dist = [R.r(1.32, 1.42), R.r(1.24, 1.32)]; }
    else if (kind === 'dolly') { c.yaw = [s * R.r(0.05, 0.14), s * R.r(0.02, 0.08)]; c.pitch = [R.r(-0.05, 0.05), R.r(-0.03, 0.03)]; c.dist = [R.r(1.5, 1.62), R.r(1.2, 1.28)]; }
    else if (kind === 'crane') { c.yaw = [s * R.r(0.04, 0.12), s * R.r(0.04, 0.12)]; c.pitch = [-s * R.r(0.12, 0.2), s * R.r(0.08, 0.16)]; c.dist = [1.38, 1.3]; }
    else if (kind === 'dutch') { c.yaw = [s * R.r(0.1, 0.2), s * R.r(0.02, 0.1)]; c.roll = [s * R.r(0.05, 0.1), -s * R.r(0.0, 0.04)]; c.dist = [1.4, 1.3]; }
    // a wide sweep round the page
    else if (kind === 'arc') { c.yaw = [-s * R.r(0.28, 0.38), s * R.r(0.12, 0.22)]; c.pitch = [R.r(-0.04, 0.04), R.r(-0.04, 0.04)]; c.dist = [1.42, 1.3]; }
    // looking up at it, rising
    else if (kind === 'low') { c.yaw = [s * R.r(0.05, 0.12), s * R.r(0.0, 0.06)]; c.pitch = [-R.r(0.2, 0.28), -R.r(0.06, 0.12)]; c.dist = [1.36, 1.28]; }
    // looking down on it, settling
    else if (kind === 'high') { c.yaw = [-s * R.r(0.04, 0.1), s * R.r(0.02, 0.06)]; c.pitch = [R.r(0.2, 0.28), R.r(0.05, 0.1)]; c.dist = [1.4, 1.3]; }
    // a fast push in
    else if (kind === 'push') { c.yaw = [s * R.r(0.02, 0.06), s * R.r(0.0, 0.03)]; c.pitch = [R.r(-0.03, 0.03), 0]; c.dist = [R.r(1.75, 1.9), R.r(1.16, 1.22)]; }
    // the frame turns slowly as it drifts
    else if (kind === 'spin') { c.yaw = [s * R.r(0.06, 0.12), -s * R.r(0.04, 0.08)]; c.roll = [-s * R.r(0.08, 0.13), s * R.r(0.06, 0.1)]; c.dist = [1.38, 1.3]; }
    // starts close, pulls back to show it all
    else if (kind === 'pull') { c.yaw = [-s * R.r(0.08, 0.14), s * R.r(0.02, 0.06)]; c.pitch = [R.r(-0.06, 0.06), R.r(-0.03, 0.03)]; c.dist = [R.r(1.1, 1.16), R.r(1.38, 1.46)]; }
    else { c.yaw = [s * R.r(0.04, 0.1), -s * R.r(0.04, 0.1)]; c.pitch = [R.r(-0.05, 0.05), R.r(-0.05, 0.05)]; c.dist = [1.38, 1.32]; }
    c.tx = [R.r(-0.04, 0.04), R.r(-0.04, 0.04)]; c.ty = [R.r(-0.03, 0.03), R.r(-0.03, 0.03)];
    c.kind = kind;
    return c;
  }
  // a shuffled deck: everything comes round once before anything repeats, and never within 'gap' draws
  class Deck {
    constructor(R, items) { this.R = R; this.items = items; this.q = []; this.hist = []; }
    refill() {
      const add = [];
      for (const [id, n] of this.items) for (let k = 0; k < n; k++) add.push(id);
      for (let i = add.length - 1; i > 0; i--) { const j = Math.floor(this.R() * (i + 1)); [add[i], add[j]] = [add[j], add[i]]; }
      // what was just used goes to the back of the new deck
      const recent = new Set(this.hist.slice(-6));
      add.sort((a, b) => (recent.has(a) ? 1 : 0) - (recent.has(b) ? 1 : 0));
      this.q.push(...add);
    }
    draw(ok, gap) {
      ok = ok || (() => true);
      for (let pass = 0; pass < 3; pass++) {
        if (this.q.length < 3) this.refill();
        const near = new Set(this.hist.slice(-(gap || 0)));
        let i = this.q.findIndex((id) => ok(id) && !near.has(id));
        if (i < 0 && pass === 2) i = this.q.findIndex((id) => ok(id));
        if (i >= 0) { const id = this.q.splice(i, 1)[0]; this.hist.push(id); return id; }
        this.refill();
      }
      return null;
    }
  }

  class Pasteup {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-pu');
      this.ok = O.glSupported();
      this.cards = [];
      this.trackKey = null;
      this.salt = 1;
      this.art = null;
      this.S = null;
      if (!this.ok) { this.fallback(); return; }
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; U.remove(G.canvas); this.fallback(); return; }
      const gl = (this.gl = G.gl);
      this.pLayer = G.program(FS_LAYER, VS);
      this.loc = {};
      for (const n of ['uC', 'uVP', 'uExt', 'uExtN', 'uT', 'uPaper', 'uA', 'uBlur', 'uLit', 'uGloss', 'uShadow', 'uPaperK', 'uFogK', 'uRev', 'uTS', 'uMul', 'uN', 'uCam', 'uLP', 'uPool', 'uFogC', 'uShC', 'uKey']) this.loc[n] = gl.getUniformLocation(this.pLayer.p, n);
      this.pAcc = G.program(FS_ACC);
      this.pFin = G.program(FS_FIN);
      this.rtS = G.target(4, 4);
      this.rtA = G.target(4, 4);
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      this.P = new Float32Array(16); this.Vw = new Float32Array(16); this.VP = new Float32Array(16);
      this.white = this.tex(PU.solid([255, 255, 255]));
      this.paper = this.tex(PU.solid([255, 255, 255]), true);
      if (O.Ed && O.Ed.K && O.Ed.K.tex) {
        const im = new Image();
        im.onload = () => { if (!this.gl) return; this.drop(this.paper); this.paper = this.tex(im, true); };
        im.src = O.Ed.K.tex('paper');
      }
      this.makeDust();
      this.fontsOk = false;
      const fams = ['italic 500 80px "Oley Serif"', '400 80px "Oley Heavy"', '400 80px "Oley Black"', '800 80px "Oley Display"', '400 80px "Oley Serif"', '600 80px "Oley Serif"', '500 80px "Oley Mono"', '700 80px "Oley Mono"', '500 80px "Oley Round"'];
      Promise.all(fams.map((f) => document.fonts.load(f).catch(() => null))).then(() => { this.fontsOk = true; this.dropAll(); });
      setTimeout(() => { if (!this.fontsOk) { this.fontsOk = true; this.dropAll(); } }, 2500);
    }
    fallback() {
      const m = U.el('div', '', this.ctx.root);
      m.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#ddd;font:500 2vmin var(--sans, sans-serif);text-align:center;padding:4vmin';
      m.textContent = 'Pasteup needs WebGL2 (graphics acceleration). Pick another mode, or turn hardware acceleration on.';
    }
    // flecks of paper and dust floating in the room, soft when they're out of focus
    makeDust() {
      const dot = PU.cv(64, 64), x = dot.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      this.dotT = this.tex(dot);
      const sc = PU.rect(64, 44, [255, 255, 255], { torn: 1.5 });
      this.scrapT = this.tex(sc);
      const R = PU.rng(77);
      this.dust = [];
      for (let i = 0; i < 46; i++) this.dust.push({ x: R.r(-1.5, 1.5), y: R.r(-0.9, 0.9), z: R.r(-0.9, 0.95), s: R.r(0.006, 0.02), scrap: R.ch(0.35), vx: R.r(-0.02, 0.02), vy: R.r(0.005, 0.03), r: R.r(0, 6), vr: R.r(-0.6, 0.6), ph: R.r(0, 6), acc: R.ch(0.3) });
    }

    // ---------------------------------------------------------------- GPU textures
    tex(src, repeat) {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { /* tainted or empty */ }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      return { tex: t, w: src.width || src.naturalWidth || 4, h: src.height || src.naturalHeight || 4 };
    }
    drop(T) { if (T && T.tex && this.gl) this.gl.deleteTexture(T.tex); }

    // ---------------------------------------------------------------- the song
    onTrack(tr) {
      const key = tr ? String(tr.id || tr.title || '') : '';
      if (key !== this.trackKey) {
        this.trackKey = key;
        if (O.params && O.params.has('puseed')) this.salt = +O.params.get('puseed') || 1;
        else {
          let m = O._puPlays;
          if (!m) { try { m = JSON.parse(localStorage.getItem('oley.pu.plays') || '{}') || {}; } catch (e) { m = {}; } O._puPlays = m; }
          m[key] = (m[key] || 0) + 1;
          this.salt = m[key];
          const ks = Object.keys(m);
          if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete m[k];
          try { localStorage.setItem('oley.pu.plays', JSON.stringify(m)); } catch (e) {}
        }
      }
      this.track = tr || null;
      this.plan();
    }
    onArt(url, img) {
      const link = this.ctx.stage.link;
      if (link && img && this.ctx.opts.cutout !== false) link.send({ type: 'want', what: 'mask' });
      this.coverImg = img || null;
      this.makeArt();
    }
    onMask() { this.makeArt(); }
    makeArt() {
      const img = this.coverImg;
      if (!img) { this.art = null; this.plan(); return; }
      let mask = null;
      if (this.ctx.opts.cutout !== false) {
        try {
          const info = this.ctx.maskImg ? O.Subject.fromMask(this.ctx.maskImg, img) : O.Subject.guess(img);
          mask = info && info.canvas ? info.canvas : null;
          if (!mask && this.ctx.maskImg) { const g = O.Subject.guess(img); mask = g && g.canvas; }
        } catch (e) { mask = null; }
      }
      try { this.art = new PU.Art(img, mask); } catch (e) { this.ctx.stage.reportError(e); this.art = null; }
      this.plan();
    }
    onLyrics() { this.plan(); }
    // a change to Pasteup's own options plans the song again
    onSettings() {
      const o = this.ctx.opts;
      if (this.cutKey != null && String(o.cutout) !== this.cutKey) { this.cutKey = String(o.cutout); this.makeArt(); return; }
      this.cutKey = String(o.cutout);
      if (this.optKey != null && [o.scroll, o.emoji, o.emojiSet, o.flashes].join('|') !== this.optKey) this.plan();
    }
    onResize() { this.dropAll(); }

    plan() {
      if (!this.ok) return;
      this.dropAll();
      { const o = this.ctx.opts; this.optKey = [o.scroll, o.emoji, o.emojiSet, o.flashes].join('|'); }
      const ctx = this.ctx, tl = ctx.tl, R = PU.rng(PU.hash(this.trackKey || 'x') ^ Math.imul(this.salt || 1, 2654435761));
      this.S = PU.scheme(ctx.palette, R);
      this.lastBg = [this.S.bg[0] / 255, this.S.bg[1] / 255, this.S.bg[2] / 255];
      const lines = ((tl && tl.lines) || []).filter((L) => L.words && L.words.length);
      const cards = [];
      const tr = this.track || {};
      const title = tr.title || 'Oley', artist = tr.artist || '';
      // between verses: the title and the artist, a composition every ~2.4s
      const inter = (from, to) => {
        const src = (title + ' ' + artist).split(/\s+/).filter(Boolean);
        let t = from, j = 0;
        while (to - t > 1.2) {
          const n = Math.min(src.length, R.i(1, 2));
          const ws = [];
          for (let k = 0; k < n; k++) { const s = src[(j + k) % src.length]; ws.push({ raw: s, bare: s, t: t + 0.12 + k * 0.32, dur: 0.3, i: k, key: k === 0 }); }
          j += n;
          cards.push({ t0: t, ws, inter: true });
          t += Math.min(to - t, R.r(2.1, 2.8));
        }
      };
      if (!lines.length) inter(0, Math.max(tl && tl.duration ? tl.duration : 0, 900));
      else {
        if (lines[0].t > 2) inter(0, lines[0].t - 0.06);
        // runs of lines that become one collage scroll instead of a composition per phrase
        const smode = (O.params && O.params.get('puscroll')) || ctx.opts.scroll || 'mix';
        const inScroll = new Map();
        if (smode !== 'off') {
          const runs = [];
          let cur = [0];
          for (let li = 1; li < lines.length; li++) {
            const pv = lines[li - 1], gapT = lines[li].t - Math.max(pv.singEnd || 0, pv.words[pv.words.length - 1].t + 0.3);
            if (gapT > 3 || cur.length >= 8) { runs.push(cur); cur = []; }
            cur.push(li);
          }
          runs.push(cur);
          let prev = false, made = 0;
          runs.forEach((run, ri) => {
            const dur = lines[run[run.length - 1]].t - lines[run[0]].t;
            const ok = smode === 'only' || (run.length >= 3 && dur >= 6);
            const pick = ok && (smode === 'only' || (!prev && R.ch(made ? 0.42 : 0.62)));
            prev = pick;
            if (!pick) return;
            made++;
            // long runs become sheets of three to five lines
            for (let k = 0; k < run.length;) {
              const left = run.length - k, n = left <= 5 ? left : R.i(3, Math.min(4, left - 2));
              for (let j = k; j < k + n; j++) inScroll.set(run[j], ri * 100 + k);
              k += n;
            }
          });
        }
        lines.forEach((L, li) => {
          const sid = inScroll.get(li);
          if (sid != null) {
            if (inScroll.get(li - 1) !== sid) cards.push({ t0: L.words[0].t - 0.06, ws: [], L, first: true, scroll: { lines: [] } });
            const sc = cards[cards.length - 1];
            sc.scroll.lines.push({ ws: L.words, t: L.t, end: Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.3) });
            sc.ws = sc.ws.concat(L.words);
          } else {
            const groups = PU.group(L);
            groups.forEach((g, gi) => cards.push({ t0: g[0].t - 0.06, ws: g, L, first: gi === 0 }));
          }
          const nx = lines[li + 1];
          const end = Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.4);
          // a collage that ends before a break holds a little longer, so the camera can pull back over it
          const hold = inScroll.has(li) ? 1.6 : 0;
          if (nx && nx.t - end > 4.5 + hold) inter(end + 1.2 + hold, nx.t - 0.06);
          if (!nx) inter(end + 1.6 + hold, Math.max(tl.duration || 0, end + 30));
        });
      }
      cards.sort((a, b) => a.t0 - b.t0);
      // squeeze out cards that would only flash by
      for (let i = 1; i < cards.length; i++) if (cards[i].t0 - cards[i - 1].t0 < 0.22 && !cards[i].inter && !cards[i].scroll && !cards[i - 1].scroll) { cards[i - 1].ws = cards[i - 1].ws.concat(cards[i].ws); cards.splice(i, 1); i--; }
      if (cards.length) cards[0].t0 = Math.min(cards[0].t0, 0);
      // looks for the song's sections: each verse and chorus printed in its own scheme
      const schemes = PU.schemeSet(ctx.palette, R);
      {
        let sec = 0, inSec = 0, last = -1;
        cards.forEach((c, i) => {
          const pv = cards[i - 1];
          const gapT = pv ? c.t0 - (pv.ws.length ? pv.ws[pv.ws.length - 1].t + 0.3 : pv.t0) : 0;
          if (i && (c.inter || c.scroll || pv.scroll || pv.inter || (c.first && (gapT > 1.4 || inSec >= 4)))) { sec++; inSec = 0; }
          if (c.first) inSec++;
          c.sec = sec;
        });
        const order = [];
        for (let k = 0; k <= sec; k++) {
          let j = k === 0 ? 0 : Math.floor(R() * schemes.length);
          if (j === last) j = (j + 1 + Math.floor(R() * (schemes.length - 1))) % schemes.length;
          order.push(j); last = j;
        }
        cards.forEach((c) => { c.S = schemes[order[c.sec]]; });
      }
      // pick a layout for each from a shuffled deck: all of them come round before any repeats
      const ids = Object.keys(PU.TPL), recent = [];
      const tplDeck = new Deck(R, ids.map((id) => [id, 1]));
      const trDeck = { inside: new Deck(R, INSIDE.map((k) => [k, Math.max(1, Math.round(TR[k].w * 2))])), between: new Deck(R, BETWEEN.map((k) => [k, Math.max(1, Math.round(TR[k].w * 2))])) };
      const camDeck = new Deck(R, CAMS.map((k) => [k, k === 'orbit' ? 2 : 1]));
      let lastTr = '', lastScrollBg = null;
      const wpick = (list) => { let tt = 0; for (const [, w] of list) tt += w; let y = R() * tt; for (const [k, w] of list) { y -= w; if (y <= 0) return k; } return list[0][0]; };
      cards.forEach((c, i) => {
        c.i = i;
        c.text = c.ws.map((w) => PU.clean(w.raw || '')).join(' ');
        c.key = Math.max(0, c.ws.findIndex((w) => w.key));
        if (c.scroll) {
          c.tpl = 'scroll';
          c.seed = (R() * 4294967296) >>> 0;
          c.tr = i ? wpick(INTO_SCROLL.filter(([k]) => k !== lastTr && !(k === 'flash' && ctx.opts.flashes === false))) : 'cut';
          lastTr = c.tr;
          c.dir = R.sgn();
          c.impact = null;
          c.cam = camMove(R, camDeck.draw(null, 3));
          c.scroll.bg = PU.scrollBg(c.S, R, lastScrollBg);
          lastScrollBg = c.scroll.bg;
          recent.push('scroll');
          if (c.tr === 'iris') c.irisT = c.t0;
          return;
        }
        if (!c.ws[c.key] || !c.ws[c.key].key) { let b = 0; c.ws.forEach((w, k) => { if (PU.clean(w.raw).length > PU.clean(c.ws[b].raw).length) b = k; }); c.key = b; }
        const stub = { ws: c.ws, text: c.text, art: this.art };
        const fits = (id) => { const T = PU.TPL[id]; return !T.fits || T.fits(stub); };
        let pick = tplDeck.draw(fits, Math.min(14, ids.length - 4)) || 'mega';
        if (O.params && O.params.has('putpl') && PU.TPL[O.params.get('putpl')]) pick = O.params.get('putpl');
        recent.push(pick);
        c.tpl = pick;
        c.seed = (R() * 4294967296) >>> 0;
        // how it arrives
        const gap = i ? c.t0 - (cards[i - 1].ws[cards[i - 1].ws.length - 1].t + 0.3) : 0;
        const deck = c.first && gap > 0.5 ? trDeck.between : trDeck.inside;
        c.tr = deck.draw((k) => k !== lastTr && !(k === 'flash' && ctx.opts.flashes === false), 2) || 'cut';
        // a cut needs time to read; very short cards don't get long moves
        const room = (cards[i + 1] ? cards[i + 1].t0 : c.t0 + 2) - c.t0;
        if (room < 0.5 && (c.tr === 'slide' || c.tr === 'drop' || c.tr === 'fly')) c.tr = 'slam';
        // leaving a collage scroll: the camera is somewhere down the sheet, so no pans or fly-throughs
        if (i && cards[i - 1].scroll) c.tr = wpick(OUT_SCROLL.filter(([k]) => !(k === 'flash' && ctx.opts.flashes === false)));
        if (c.tr === 'iris') c.irisT = c.t0;
        lastTr = c.tr;
        c.dir = R.sgn();
        c.impact = !c.inter && c.ws[c.key] && c.ws[c.key].key && R.ch(0.35) ? c.ws[c.key].t + 0.02 : null;
        c.cam = camMove(R, camDeck.draw(null, 3));
      });
      for (let i = 0; i < cards.length; i++) cards[i].t1 = cards[i + 1] ? cards[i + 1].t0 : cards[i].t0 + 8;
      // emoji: a die-cut sticker next to the line when a sung word has an obvious picture
      if (ctx.opts.emoji !== false && PU.emojiAt) {
        PU.Emoji.setBase(this.serverBase());
        PU.Emoji.setSet(ctx.opts.emojiSet || 'fluent');
        const COMMON = /^(love|loved|loving|heart|hearts|see|seen|saw|look|looking|looked|watch|time|think|thinking|thought|night|tonight|eyes|mind|home|world|sing|song|music|run|wait|please|sorry|fly|sky|money|paid|rich|city|cool|lit)$/;
        let last = -9, lastE = '';
        const pickIn = (all, ws) => {
          let best = null;
          ws.forEach((w) => {
            const gi = all.indexOf(w);
            const e = gi >= 0 ? PU.emojiAt(all, gi) : null;
            if (!e) return;
            const bare = String(w.raw || '').toLowerCase().replace(/[^a-z]/g, '');
            const strong = !COMMON.test(bare), ctxHit = /^(line|up|broken|blue|ring|high)$/.test(bare);
            const score = (ctxHit ? 3 : 0) + (strong ? 2 : 0) + (w.key ? 1 : 0);
            if (!best || score > best.score) best = { e, w, score, ctxHit, strong };
          });
          return best;
        };
        cards.forEach((c) => {
          if (!c.scroll) return;
          c.scroll.em = [];
          const seen = new Set();
          c.scroll.lines.forEach((ln, li) => {
            const b = pickIn(ln.ws, ln.ws);
            if (!b || seen.has(b.e)) return;
            if (!(b.ctxHit || (b.strong ? R.ch(0.85) : R.ch(0.3)))) return;
            seen.add(b.e);
            c.scroll.em.push({ li, e: b.e, w: b.w, kind: R.pick(['print', 'print', 'sticker', 'riso', 'ink']) });
            PU.Emoji.want(b.e);
          });
        });
        cards.forEach((c, i) => {
          if (c.inter || c.scroll || !c.L || c.t1 - c.t0 < 0.5) return;
          const all = c.L.words;
          let best = null;
          c.ws.forEach((w) => {
            const gi = all.indexOf(w);
            const e = gi >= 0 ? PU.emojiAt(all, gi) : null;
            if (!e) return;
            const bare = String(w.raw || '').toLowerCase().replace(/[^a-z]/g, '');
            const strong = !COMMON.test(bare);
            const ctxHit = /^(line|up|broken|blue|ring|high)$/.test(bare);
            const score = (ctxHit ? 3 : 0) + (strong ? 2 : 0) + (w.key ? 1 : 0);
            if (!best || score > best.score) best = { e, w, score, ctxHit, strong };
          });
          if (!best || best.e === lastE) return;
          const show = best.ctxHit || (best.strong ? R.ch(0.9) && i - last >= 2 : R.ch(0.35) && i - last >= 3);
          if (!show) return;
          c.emoji = { e: best.e, w: best.w };
          last = i; lastE = best.e;
          PU.Emoji.want(best.e);
        });
      }
      this.cards = cards;
      this.ci = 0;
    }
    build(c) {
      if (c.built || !this.fontsOk) return;
      const T = PU.TPL[c.tpl];
      const tr = this.track || {};
      const P = { ws: c.ws, text: c.text, key: c.key, S: c.S || this.S, R: PU.rng(c.seed), A: this.A, HPX: this.HPX, art: this.art, title: tr.title || 'Oley', artist: tr.artist || '', t0: c.t0, t1: c.t1, i: c.i };
      let spec = null;
      c.bg = (c.S || this.S).bg;
      if (c.scroll) {
        // a collage scroll: the emoji that have arrived are printed for it
        const em = [];
        c.emWait = false;
        for (const m of c.scroll.em || []) {
          const st = PU.Emoji.sticker(m.e, m.kind, c.S || this.S);
          if (st) em.push(Object.assign({ st }, m)); else c.emWait = true;
        }
        const lastEnd = c.scroll.lines[c.scroll.lines.length - 1].end;
        try {
          spec = PU.scrollMake(Object.assign(P, { lines: c.scroll.lines, em, bg: c.scroll.bg, lastEnd }));
          c.sc = { track: spec.track, reveal: spec.reveal };
          c.bg = c.scroll.bg;
        } catch (e) { this.ctx.stage.reportError(e); spec = null; }
      }
      if (!spec) {
        try { spec = T.make(P); } catch (e) { this.ctx.stage.reportError(e); spec = PU.TPL.mega.make(Object.assign(P, { R: PU.rng(c.seed) })); }
      }
      c.layers = [];
      spec.layers.forEach((l, k) => {
        if (l.bg) { if (l.col) c.bg = l.col; return; }
        const ar = l.c.width / l.c.height;
        if (l.w == null) l.w = l.h * ar;
        else if (l.h == null) l.h = l.w / ar;
        l.T = this.tex(l.c);
        l.c = null;
        l.k = k;
        c.layers.push(l);
      });
      if (c.tr === 'drop' || c.tr === 'slide') {
        const sh = PU.rect(800, 460, c.bg, { torn: 0.6 });
        PU.rough(sh, 0.05);
        c.layers.unshift({ T: this.tex(sh), w: this.A * 1.3, h: 1.3, x: 0, y: 0, z: -0.42, s: 1, rot: 0, tx: 0, ty: 0, a: 1, ax: 0.5, ay: 0.5, sg: 0.12, sa: 0.7, paper: 0.45, k: -1 });
      }
      if (c.emoji) this.addEmoji(c);
      if (c.tr === 'iris') {
        // the disc of the new page's paper, held in front of the camera wherever it is
        const R = PU.rng(c.seed ^ 0x1215), N = 1024, disc = PU.cv(N, N), dx = disc.getContext('2d');
        dx.fillStyle = PU.C(c.bg); dx.beginPath();
        for (let k = 0; k <= 180; k++) { const a = (k / 180) * Math.PI * 2, r = N * 0.47 * (1 + 0.006 * Math.sin(a * 13 + R.r(0, 6)) + R.r(-0.002, 0.002)); dx.lineTo(N / 2 + Math.cos(a) * r, N / 2 + Math.sin(a) * r); }
        dx.closePath(); dx.fill();
        const cx = R.r(-0.25, 0.25) * this.A, cy = R.r(-0.2, 0.2);
        const D = 2.15 * Math.hypot(this.A / 2 + Math.abs(cx), 0.5 + Math.abs(cy)) / 0.94;
        c.layers.push({ T: this.tex(disc), w: D, h: D, x: cx, y: cy, z: 0.5, s: 1, rot: 0, tx: 0, ty: 0, a: 1, ax: 0.5, ay: 0.5, screen: true, iris: true, paper: 0.5, sg: 0.07, sa: 0.55, k: 1e4,
          in: { t: c.t0 - 0.42, d: 0.42, ds: -0.985, e: 'in3' }, out: { t: c.t0 + 0.03, d: 0.16 } });
      }
      c.tilt = !!(spec.cam && spec.cam.tilt);
      c.built = true;
    }
    // where Oley's own server lives (the page may be opened from a file, as in Wallpaper Engine)
    serverBase() {
      if (/^https?:$/.test(location.protocol)) return location.origin;
      const a = this.ctx.stage && this.ctx.stage.artUrl;
      const m = a && /^(https?:\/\/(?:127\.0\.0\.1|localhost):\d+)\//.exec(a);
      if (m) return m[1];
      const ws = this.ctx.stage && this.ctx.stage.link && this.ctx.stage.link.ws;
      const u = ws && ws.url && /^ws:\/\/([^/]+)\//.exec(ws.url);
      return u ? 'http://' + u[1] : '';
    }
    // put the sticker where the composition is emptiest
    addEmoji(c) {
      const em = c.emoji;
      if (!em || c.emDone) return;
      const A = this.A, R = PU.rng(c.seed ^ 0x51ed);
      // printed to suit the page it lands on
      const kind = /^(xerox|halftone|tabloid|misreg|page)$/.test(c.tpl) ? R.pick(['ink', 'riso']) : R.pick(['sticker', 'sticker', 'print']);
      const st = PU.Emoji.sticker(em.e, kind, c.S || this.S);
      if (!st) return;
      c.emDone = true;
      const hh = R.r(0.22, 0.3);
      const spots = [[0, 0.3], [A * 0.34, 0.2], [-A * 0.34, 0.2], [A * 0.33, -0.25], [-A * 0.33, -0.25], [A * 0.12, 0.33], [-A * 0.12, 0.33]];
      let best = spots[0], bs = 1e9;
      for (const sp of spots) {
        const x0 = sp[0] - hh / 2, x1 = sp[0] + hh / 2, y0 = sp[1] - hh / 2, y1 = sp[1] + hh / 2;
        let o = 0;
        for (const l of c.layers) {
          if (l.z < -0.2 || l.a < 0.3 || l.w > A * 1.2) continue;
          const lx0 = l.x - l.ax * l.w * l.s, lx1 = lx0 + l.w * l.s, ly0 = l.y - l.ay * l.h * l.s, ly1 = ly0 + l.h * l.s;
          o += Math.max(0, Math.min(x1, lx1) - Math.max(x0, lx0)) * Math.max(0, Math.min(y1, ly1) - Math.max(y0, ly0)) * (l.z > 0 ? 2 : 1);
        }
        o += R() * 0.002;
        if (o < bs) { bs = o; best = sp; }
      }
      // pop in on the word, but early enough that it stays up a beat before the next card
      const t = Math.max(c.t0 + 0.04, Math.min(em.w.t, c.t1 - 0.85));
      const ss = hh * 512 / 360; // the sticker canvas has a margin around the picture
      c.layers.push({ T: this.tex(st), w: ss, h: ss, x: best[0], y: best[1], z: 0.17, s: 1, rot: R.r(-0.28, 0.28), tx: 0, ty: 0, a: 1, ax: 0.5, ay: 0.5,
        gloss: kind === 'sticker' ? 0.3 : 0.08, sg: 0.05, sa: 0.5, paper: kind === 'sticker' ? 0.05 : 0.3, k: 999, bob: { a: 0.008, f: R.r(1.6, 2.4), ph: R.r(0, 6) },
        in: { t: t - 0.02, d: 0.26, ds: 1.3, dr: R.sgn() * R.r(0.5, 1), dz: 0.45, e: 'back', fade: 1 }, hit: [t + 0.26] });
    }
    unbuild(c) {
      if (!c.built) return;
      for (const l of c.layers) this.drop(l.T);
      c.layers = null;
      c.built = false;
      c.emDone = false;
      c.sc = null;
    }
    dropAll() { for (const c of this.cards) this.unbuild(c); }

    // ---------------------------------------------------------------- the camera
    camOf(c, t) {
      if (c.scroll) {
        // down the collage: the sheet's own track, with a slow handheld drift so the layers part
        const p = c.sc ? PU.scrollCam(c.sc, t) : { x: 0, y: 0, dist: 1.3 };
        const ph = (c.seed % 97) * 0.1;
        const cam = { yaw: 0.05 * Math.sin(t * 0.31 + ph), pitch: 0.035 * Math.sin(t * 0.23 + ph * 1.7), dist: p.dist * (1 + 0.02 * Math.sin(t * 0.2 + ph)), roll: 0.012 * Math.sin(t * 0.17 + ph), tx: p.x, ty: -p.y, ap: 2.6, jx: 0, jy: 0 };
        for (let i = 0; i < c.ws.length; i++) { const d = t - c.ws[i].t; if (d > 0 && d < 0.4 && c.ws[i].key) cam.dist *= 1 - 0.012 * Math.exp(-d * 12); }
        if (this.pulse) cam.dist *= 1 - this.pulse * 0.004;
        return cam;
      }
      const m = c.cam, p = U.sat((t - c.t0) / Math.max(0.6, c.t1 - c.t0)), q = E.io(p) * 0.4 + p * 0.6;
      const lp = (v) => v[0] + (v[1] - v[0]) * q;
      const k = c.tilt ? 2.2 : 1;
      const cam = { yaw: lp(m.yaw) * k, pitch: lp(m.pitch) * k, dist: lp(m.dist), roll: lp(m.roll), tx: lp(m.tx), ty: lp(m.ty), ap: m.ap, jx: 0, jy: 0 };
      for (let i = 0; i < c.ws.length; i++) {
        const d = t - c.ws[i].t;
        if (d > 0 && d < 0.45) { cam.dist *= 1 - 0.018 * Math.exp(-d * 12); cam.jx += 0.005 * Math.exp(-d * 20) * Math.sin(d * 90 + i * 2); cam.jy += 0.004 * Math.exp(-d * 20) * Math.cos(d * 77 + i); }
      }
      if (this.pulse) cam.dist *= 1 - this.pulse * 0.006;
      return cam;
    }
    // the camera at t: a card's own move, blended across a transition
    camAt(t) {
      const cs = this.cards;
      let i = 0, lo = 0, hi = cs.length - 1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (cs[mid].t0 <= t) { i = mid; lo = mid + 1; } else hi = mid - 1; }
      let a = cs[i], b = null, k = 0;
      const nx = cs[i + 1];
      if (nx) { const tr = TR[nx.tr] || TR.cut; if (t >= nx.t0 - tr.pre && tr.pre > 0) { b = nx; k = (t - (nx.t0 - tr.pre)) / (tr.pre + tr.post); } }
      if (!b && i > 0) { const tr = TR[a.tr] || TR.cut; if (t < a.t0 + tr.post && tr.pre + tr.post > 0) { b = a; a = cs[i - 1]; k = (t - (b.t0 - tr.pre)) / (tr.pre + tr.post); } }
      let c = this.camOf(a, t);
      if (b) {
        const tb = TR[b.tr] || TR.cut;
        const c2 = this.camOf(b, t), e = tb.nocam || a.scroll ? (t >= b.t0 ? 1 : 0) : E.io(U.sat(k));
        for (const key of ['yaw', 'pitch', 'dist', 'roll', 'tx', 'ty', 'ap', 'jx', 'jy']) c[key] += (c2[key] - c[key]) * e;
      }
      const T = [c.tx + c.jx, c.ty + c.jy, 0];
      const pos = [T[0] + c.dist * Math.sin(c.yaw) * Math.cos(c.pitch), T[1] + c.dist * Math.sin(c.pitch), c.dist * Math.cos(c.yaw) * Math.cos(c.pitch)];
      const fwd = V.norm(V.sub(T, pos));
      const rt = V.norm(V.cross(fwd, [0, 1, 0])), up0 = V.cross(rt, fwd);
      const up = V.add(V.mul(up0, Math.cos(c.roll)), V.mul(rt, Math.sin(c.roll)));
      return { pos, T, fwd, up, rt: V.norm(V.cross(fwd, up)), focus: c.dist, ap: c.ap };
    }
    // a card's own transform at t (null when it's off screen)
    cardAt(i, t) {
      const c = this.cards[i], nx = this.cards[i + 1];
      const ti = TR[c.tr] || TR.cut, to = nx ? TR[nx.tr] || TR.cut : null;
      if (i > 0 && t < c.t0 - ti.pre) return null;
      if (nx && t >= nx.t0 + (to.pre + to.post === 0 ? 0 : to.post)) return null;
      const ct = { s: 1, sx: 1, rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, a: 1, pv: 0 };
      if (i > 0 && ti.inn && t < c.t0 + ti.post) { const w = ti.pre + ti.post; ti.inn(ct, w ? U.sat((t - (c.t0 - ti.pre)) / w) : 1, c.dir); }
      if (nx && to.out && t >= nx.t0 - to.pre) { const w = to.pre + to.post; to.out(ct, w ? U.sat((t - (nx.t0 - to.pre)) / w) : 1, nx.dir); }
      if (ct.a <= 0.002) return null;
      ct.cx = Math.cos(ct.rx); ct.sxr = Math.sin(ct.rx); ct.cy = Math.cos(ct.ry); ct.sy = Math.sin(ct.ry); ct.cz = Math.cos(ct.rz); ct.sz = Math.sin(ct.rz);
      return ct;
    }
    pose(l, t, c) {
      // an iris hides the new page until its disc has covered the screen
      if (c.irisT != null && t < c.irisT && !l.iris) return null;
      if (l.out && t > l.out.t + l.out.d) return null;
      let a = l.a, x = l.x, y = l.y, z = l.z, s = l.s, rot = l.rot, tx = l.tx, ty = l.ty;
      const n = l.in;
      if (n) {
        if (t < n.t) return null;
        const k = U.sat((t - n.t) / n.d), e = (E[n.e] || E.expo)(k), f = 1 - e;
        x += (n.dx || 0) * f; y += (n.dy || 0) * f; z += (n.dz || 0) * f; s *= 1 + (n.ds || 0) * f; rot += (n.dr || 0) * f;
        tx += (n.dtx || 0) * f; ty += (n.dty || 0) * f;
        if (n.fade) a *= U.sat(k * 3);
      }
      const dt = t - c.t0;
      if (l.v) { x += (l.v.x || 0) * dt; y += (l.v.y || 0) * dt; s *= 1 + (l.v.s || 0) * dt; rot += (l.v.r || 0) * dt; }
      if (l.grow && t > l.grow.t) s *= 1 + l.grow.k * E.out3(U.sat((t - l.grow.t) / 0.3));
      if (l.bob) y += Math.sin(t * l.bob.f * 6.283 / 2 + l.bob.ph) * l.bob.a;
      if (l.path && t > l.path.t) { const k = E.io(U.sat((t - l.path.t) / l.path.d)); x += l.path.dx * k; y += l.path.dy * k; }
      if (l.out && t > l.out.t) a *= 1 - U.sat((t - l.out.t) / l.out.d);
      if (l.hit) for (const th of l.hit) { const q = t - th; if (q > 0 && q < 0.5 && (!n || n.t + n.d < th)) s *= 1 + 0.035 * Math.exp(-q * 16); }
      let rv = 0, rp = 1, rs = 0.02;
      if (l.rev) {
        const R = l.rev, k = U.sat((t - R.t) / R.d);
        if (t < R.t) return null;
        let e;
        if (R.e && R.e.indexOf('step') === 0) { const N = +R.e.slice(4) || 4; e = Math.min(1, Math.ceil(k * N) / N); }
        else e = (E[R.e] || E.out3)(k);
        rv = R.m; rp = e; rs = R.soft == null ? 0.03 : R.soft;
      }
      return { a, x, y, z, s, rot, tx, ty, rv, rp, rs };
    }
    // a layer's four corners in the world (y up). Things further back are scaled up so the composition
    // reads the same from the home camera, and move apart when the camera moves.
    corners(l, p, ct, out) {
      const comp = (D0 - p.z) / D0;
      const W = l.w * p.s * comp, H = l.h * p.s * comp;
      const cr = Math.cos(p.rot), sr = Math.sin(p.rot), ctx_ = Math.cos(p.tx), stx = Math.sin(p.tx), cty = Math.cos(p.ty), sty = Math.sin(p.ty);
      const pvz = ct.pv ? D0 : 0;
      for (let i = 0; i < 4; i++) {
        const u = i & 1, v = i >> 1;
        let x = (u - l.ax) * W, y = (v - l.ay) * H;
        const x1 = x * cr - y * sr, y1 = x * sr + y * cr;
        const y2 = y1 * ctx_, z2 = y1 * stx;
        const x3 = x1 * cty + z2 * sty, z3 = -x1 * sty + z2 * cty;
        // depth compensation about the layer's anchor (a collage line), so parallax is right wherever the camera is on the sheet
        const oy = l.oy || 0;
        x = x3 + p.x * comp; y = -(y2 + oy + (p.y - oy) * comp); let z = z3 + p.z;
        // the card: scale, turn (round the camera for pans), move
        x *= ct.s * ct.sx; y *= ct.s; z = z * ct.s - pvz;
        let xa = x * ct.cz - y * ct.sz, ya = x * ct.sz + y * ct.cz;
        let yb = ya * ct.cx - z * ct.sxr, zb = ya * ct.sxr + z * ct.cx;
        let xc = xa * ct.cy + zb * ct.sy, zc = -xa * ct.sy + zb * ct.cy;
        out[i * 3] = xc + ct.px; out[i * 3 + 1] = yb + ct.py; out[i * 3 + 2] = zc + pvz + ct.pz;
      }
    }

    // ---------------------------------------------------------------- drawing
    draw(it, cam) {
      const gl = this.gl, L = this.loc;
      gl.uniform3fv(L.uC, it.C);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, it.T.tex);
      gl.uniform2f(L.uTS, it.T.w, it.T.h);
      gl.uniform1f(L.uA, it.a);
      gl.uniform4f(L.uRev, it.rv || 0, it.rp == null ? 1 : it.rp, it.rs || 0.02, 0);
      const mul = it.mul || [1, 1, 1];
      gl.uniform3f(L.uMul, mul[0], mul[1], mul[2]);
      gl.uniform3f(L.uN, it.n[0], it.n[1], it.n[2]);
      gl.uniform1f(L.uLit, it.lit == null ? 1 : it.lit);
      gl.uniform1f(L.uGloss, it.gloss || 0);
      gl.uniform1f(L.uShadow, it.sh ? 1 : 0);
      gl.uniform1f(L.uPaperK, it.paperK || 0);
      gl.uniform1f(L.uBlur, it.blur || 0);
      const n = it.ext ? it.ext.n : 1;
      gl.uniform1f(L.uExtN, n);
      if (it.ext) gl.uniform3f(L.uExt, -it.n[0] * it.ext.d, -it.n[1] * it.ext.d, -it.n[2] * it.ext.d); else gl.uniform3f(L.uExt, 0, 0, 0);
      if (n > 1) gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n); else gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    renderAt(t, target, A) {
      const G = this.G, gl = this.gl, L = this.loc, S = this.curS || this.S;
      const cam = this.camAt(t);
      persp(FOV0, A, 0.02, 40, this.P);
      look(cam.pos, cam.T, cam.up, this.Vw);
      mm(this.P, this.Vw, this.VP);
      // the wall colour, handed over with the cards
      let bg = this.bgAt(t);
      this.lastBg = bg;
      G.clear(target, bg[0] * 0.5, bg[1] * 0.5, bg[2] * 0.5, 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
      gl.viewport(0, 0, target.w, target.h);
      gl.useProgram(this.pLayer.p);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.vao);
      gl.uniformMatrix4fv(L.uVP, false, this.VP);
      gl.uniform3f(L.uCam, cam.pos[0], cam.pos[1], cam.pos[2]);
      const lp = [-0.75 + Math.sin(t * 0.13) * 0.25, 0.85, 1.25];
      gl.uniform3f(L.uLP, lp[0], lp[1], lp[2]);
      gl.uniform3f(L.uPool, -0.25 + Math.sin(t * 0.11) * 0.2, 0.18 + Math.cos(t * 0.09) * 0.08, 0.55);
      gl.uniform3f(L.uFogC, bg[0] * 0.6, bg[1] * 0.6, bg[2] * 0.6);
      gl.uniform1f(L.uFogK, 0.07);
      const bl = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
      gl.uniform2f(L.uKey, U.lerp(1, 0.84, U.sat((bl - 0.3) / 0.4)), U.lerp(0.5, 0.16, U.sat((bl - 0.3) / 0.4)));
      const shc = [bg[0] * 0.12, bg[1] * 0.12, bg[2] * 0.12];
      gl.uniform3f(L.uShC, shc[0], shc[1], shc[2]);
      gl.uniform1i(L.uT, 0);
      gl.uniform1i(L.uPaper, 1);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.paper.tex);
      const depthOf = (c3) => V.dot(V.sub(c3, cam.pos), cam.fwd);
      const blurOf = (dp) => U.clamp(Math.abs(dp - cam.focus) * cam.ap - 0.15, 0, 5.5);
      // the wall
      const wz = -1.9, ww = 7, wh = 4.4;
      this.draw({ C: new Float32Array([-ww, wh, wz, ww, wh, wz, -ww, -wh, wz, ww, -wh, wz]), T: this.white, a: 1, mul: bg, n: [0, 0, 1], paperK: 0.5, blur: 0 }, cam);
      // everything else, back to front
      const items = [];
      const i0 = Math.max(0, this.ci - 2), i1 = Math.min(this.cards.length - 1, this.ci + 2);
      for (let i = i0; i <= i1; i++) {
        const c = this.cards[i];
        if (!c.built) continue;
        const ct = this.cardAt(i, t);
        if (!ct) continue;
        // layers of one card are ordered by where a single ray (camera → the card's middle) crosses their planes,
        // so overlapping parallel layers keep their stacking whatever angle the camera looks from
        let ray = null;
        for (const l of c.layers) {
          const p = this.pose(l, t, c);
          if (!p || p.a * ct.a < 0.003) continue;
          const C = new Float32Array(12);
          this.corners(l, p, ct, C);
          if (l.screen) {
            // held in front of the camera: map the home view onto wherever the camera is now
            const k = cam.focus / D0;
            for (let q = 0; q < 4; q++) {
              const vx = C[q * 3], vy = C[q * 3 + 1], vz = C[q * 3 + 2] - D0;
              for (let j = 0; j < 3; j++) C[q * 3 + j] = cam.pos[j] + (cam.rt[j] * vx + cam.up[j] * vy - cam.fwd[j] * vz) * k;
            }
          }
          const e1 = [C[3] - C[0], C[4] - C[1], C[5] - C[2]], e2 = [C[6] - C[0], C[7] - C[1], C[8] - C[2]];
          const n = V.norm(V.cross(e2, e1));
          const ctr = [(C[0] + C[9]) / 2, (C[1] + C[10]) / 2, (C[2] + C[11]) / 2];
          let dp = depthOf(ctr);
          if (!l.screen) {
            if (!ray) { const d = V.sub(ctr, cam.pos), len = Math.hypot(d[0], d[1], d[2]) || 1; ray = [d[0] / len, d[1] / len, d[2] / len]; ray.f = V.dot(ray, cam.fwd); }
            const den = V.dot(ray, n);
            if (Math.abs(den) > 0.3) { const tt = V.dot(V.sub([C[0], C[1], C[2]], cam.pos), n) / den; if (tt > 0.05) dp = tt * ray.f; }
          }
          dp -= l.bias || 0;
          const a = p.a * ct.a;
          const ext = l.ext ? { n: l.ext.n || 20, d: l.ext.d * ((D0 - p.z) / D0) } : null;
          const it = { C, T: l.T, a, n, dp, blur: l.screen ? 0 : blurOf(dp), rv: p.rv, rp: p.rp, rs: p.rs, gloss: l.gloss || 0, paperK: l.paper == null ? 0.18 : l.paper, ext, lit: l.lit };
          items.push(it);
          if (l.shadow !== false) {
            // a soft shadow on whatever is behind, away from the light
            const gap = (l.sg || 0.05) + (ext ? ext.d * 0.6 : 0);
            const off = [-0.35 * gap * 0.8, -0.45 * gap * 0.8, -gap];
            const SC = new Float32Array(12);
            for (let k = 0; k < 4; k++) { SC[k * 3] = C[k * 3] + off[0] + n[0] * 0; SC[k * 3 + 1] = C[k * 3 + 1] + off[1]; SC[k * 3 + 2] = C[k * 3 + 2] + off[2]; }
            const sdp = dp + gap;
            items.push({ C: SC, T: l.T, a: a * (l.sa || 0.42), n, dp: sdp, blur: l.shBlur != null ? l.shBlur + blurOf(sdp) * 0.5 : Math.max(4.2, blurOf(sdp) + 3.2), sh: true, rv: p.rv, rp: p.rp, rs: p.rs });
          }
        }
      }
      // dust and paper flecks
      const P = S.paper, Ac = S.a;
      for (const d of this.dust) {
        const x = d.x + d.vx * t + Math.sin(t * 0.3 + d.ph) * 0.03, y = ((d.y + d.vy * t + 0.9) % 1.8 + 1.8) % 1.8 - 0.9, z = d.z;
        const s = d.s, r = d.r + d.vr * t, cr = Math.cos(r) * s, sr = Math.sin(r) * s;
        const C = new Float32Array([x - cr + sr, y + sr + cr, z, x + cr + sr, y - sr + cr, z, x - cr - sr, y + sr - cr, z, x + cr - sr, y - sr - cr, z]);
        const dp = depthOf([x, y, z]);
        if (dp < 0.05) continue;
        const col = d.acc ? Ac : P;
        items.push({ C, T: d.scrap ? this.scrapT : this.dotT, a: d.scrap ? 0.75 : 0.45, mul: [col[0] / 255, col[1] / 255, col[2] / 255], n: [0, 0, 1], dp, blur: blurOf(dp), lit: 0.6 });
      }
      items.sort((p, q) => q.dp - p.dp);
      for (const it of items) this.draw(it, cam);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
    }
    bgAt(t) {
      const cs = this.cards;
      const toV = (c) => [c[0] / 255, c[1] / 255, c[2] / 255];
      const i = this.ci || 0, c = cs[i];
      let col = toV((c && c.bg) || this.S.bg);
      const nx = cs[i + 1];
      if (nx && nx.bg) { const tr = TR[nx.tr] || TR.cut; if (t >= nx.t0 - tr.pre) { const k = tr.snap ? (t >= nx.t0 ? 1 : 0) : tr.pre + tr.post ? U.sat((t - (nx.t0 - tr.pre)) / (tr.pre + tr.post)) : 1; const b = toV(nx.bg); col = col.map((v, j) => v + (b[j] - v) * E.io(k)); } }
      if (i > 0 && c && cs[i - 1].bg) { const tr = TR[c.tr] || TR.cut; if (t < c.t0 + tr.post && tr.pre + tr.post > 0) { const k = U.sat((t - (c.t0 - tr.pre)) / (tr.pre + tr.post)); const a = toV(cs[i - 1].bg), b = toV(c.bg || this.S.bg); col = a.map((v, j) => v + (b[j] - v) * E.io(k)); } }
      return col;
    }

    // ---------------------------------------------------------------- per frame
    frame(t, dt, A) {
      if (!this.ok || !this.S) return;
      const ctx = this.ctx, G = this.G;
      const s = O.glScale(ctx, true);
      if (G.size(ctx.W * s, ctx.H * s)) { G.resizeTarget(this.rtS, G.w, G.h); G.resizeTarget(this.rtA, G.w, G.h); }
      const asp = G.w / Math.max(1, G.h);
      if (Math.abs(asp - (this.A || 0)) > 0.002 || Math.abs(G.h - (this.HPX || 0)) > 2) { this.A = asp; this.HPX = G.h; this.dropAll(); }
      this.pulse = A ? A.pulse : 0;
      const cs = this.cards;
      if (!cs.length) { G.clear(null, 0, 0, 0, 1); return; }
      let i = Math.min(this.ci || 0, cs.length - 1);
      while (i > 0 && cs[i].t0 > t) i--;
      while (i < cs.length - 1 && cs[i + 1].t0 <= t) i++;
      this.ci = i;
      this.build(cs[i]);
      // an emoji that finished downloading after its card was built still gets stuck on
      if (cs[i].emoji && !cs[i].emDone && t < cs[i].emoji.w.t && PU.Emoji.ready(cs[i].emoji.e)) this.addEmoji(cs[i]);
      // a collage whose emoji arrived late is set again, if they haven't been sung yet
      for (const k of [i, i + 1]) {
        const c = cs[k];
        if (c && c.built && c.emWait && c.scroll && c.scroll.em.some((m) => m.w.t > t + 0.4 && PU.Emoji.ready(m.e))) { this.unbuild(c); this.build(c); }
      }
      if (cs[i - 1] && t < cs[i].t0 + 0.5) this.build(cs[i - 1]);
      if (cs[i + 1] && !cs[i + 1].built && t > cs[i + 1].t0 - 1.5) this.build(cs[i + 1]);
      else if (cs[i + 2] && !cs[i + 2].built && t > cs[i + 2].t0 - 1.0) this.build(cs[i + 2]);
      for (let k = 0; k < cs.length; k++) if (cs[k].built && (k < i - 2 || k > i + 3)) this.unbuild(cs[k]);
      // motion blur: more sub-frames while things move fast
      let fast = false;
      for (let k = Math.max(1, i - 1); k <= Math.min(cs.length - 1, i + 1); k++) { const tr = TR[cs[k].tr] || TR.cut; if (t > cs[k].t0 - tr.pre - 0.03 && t < cs[k].t0 + tr.post + 0.05) fast = true; }
      let hit = false;
      for (const l of cs[i].layers || []) if (l.in && t - l.in.t > -0.02 && t - l.in.t < l.in.d + 0.02) hit = true;
      const perf = ctx.settings.perf, maxSub = perf === 'light' ? 3 : perf === 'smooth' ? 14 : 10;
      const K = fast ? maxSub : hit ? Math.ceil(maxSub * 0.6) : 3;
      // a collage glides rather than whips: a shorter shutter keeps the type crisp while the camera follows
      const shutter = cs[i].scroll && !fast ? 1 / 140 : 1 / 40;
      G.clear(this.rtA, 0, 0, 0, 0);
      this.curS = cs[i].S || this.S;
      for (let k = 0; k < K; k++) {
        const ts = t - shutter * (1 - (k + 0.5) / K);
        this.renderAt(ts, this.rtS, asp);
        G.draw(this.pAcc, { uSrc: this.rtS, uW: 1 / K }, this.rtA, { blend: 'add' });
      }
      let fl = 0;
      const ci = cs[i];
      if (ci.tr === 'flash' && t >= ci.t0) fl = Math.pow(1 - U.sat((t - ci.t0) / 0.12), 2) * 0.85;
      let inv = 0, ca = 0.007;
      if (ci.impact != null && ctx.opts.flashes !== false) { const q = t - ci.impact; if (q >= 0 && q < 0.05) inv = 1; }
      for (const w of ci.ws) { const q = t - w.t; if (q > 0 && q < 0.3) ca += (ci.scroll ? 0.012 : 0.03) * Math.exp(-q * 18); }
      let gl = 0;
      for (const k of [i, i + 1]) { const c = cs[k]; if (c && c.tr === 'glitch') { const q = t - c.t0; if (q > -0.14 && q < 0.2) gl = Math.max(gl, q < 0 ? 1 + q / 0.14 : 1 - q / 0.2); } }
      const S = ci.S || this.S;
      G.draw(this.pFin, {
        uSrc: this.rtA, uGlitch: gl, uTime: t, uGrain: perf === 'light' ? 0.03 : 0.05, uVig: 0.38, uCA: ca, uInv: inv, uFlash: fl, uGlow: 0.07 * (1 - U.sat((0.2126 * this.lastBg[0] + 0.7152 * this.lastBg[1] + 0.0722 * this.lastBg[2] - 0.3) / 0.3)),
        uFlashCol: S.dark ? [S.paper[0] / 255, S.paper[1] / 255, S.paper[2] / 255] : [S.a[0] / 255, S.a[1] / 255, S.a[2] / 255],
      }, null);
      this.stats = { i, tpl: cs[i].tpl, tr: cs[i].tr, K };
    }
    destroy() {
      if (!this.G) return;
      this.dropAll();
      for (const T of [this.paper, this.white, this.dotT, this.scrapT]) this.drop(T);
      try { const l = this.gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {}
      U.remove(this.G.canvas);
      this.gl = null;
    }
  }

  O.registerMode('pasteup', Pasteup, { label: 'Pasteup', glow: false });
})();
