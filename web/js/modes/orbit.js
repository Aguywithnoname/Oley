/* Orbit: a planet's horizon seen from space. The cover is a spinning sun on the horizon that flares
   with the music; the words race in as heavy tilted capitals. Bottom left, a revolver of song discs:
   it turns to the next song when one starts, and scrolling over it skips songs (back or forward). */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const TAU = Math.PI * 2;

  O.css('orbit', `
.m-or { background: #020306; }
.m-or .or-sun { position: absolute; left: 0; top: 0; border-radius: 50%; background: #300 center / cover no-repeat; will-change: transform; box-shadow: 0 0 1.2vmin rgba(255,240,220,0.55), inset 0 0 2vmin rgba(0,0,0,0.35); }
.m-or .or-sun::after { content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, rgba(255,255,255,0.32), rgba(255,255,255,0) 42%), radial-gradient(circle at 60% 66%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%); }
.m-or .or-words { position: absolute; left: 5%; top: 22%; width: 46%; height: 52%; perspective: 950px; perspective-origin: 0% 50%; }
.m-or .or-block { position: absolute; left: 0; top: 50%; width: 100%; transform-style: preserve-3d; transform-origin: 0% 50%; will-change: transform, opacity, filter; }
.m-or .or-w { display: inline-block; font-family: 'Oley Heavy', 'Bahnschrift', Impact, sans-serif; text-transform: uppercase; color: #f3f1ee; line-height: 0.9; text-shadow: 0 0 0.35em rgba(255,235,215,0.18), 0 0.04em 0.18em rgba(0,0,0,0.45);
  letter-spacing: 0.005em; margin-right: 0.18em; vertical-align: top; will-change: transform, opacity, filter; white-space: nowrap; }
.m-or .or-w.s { opacity: 0.92; }
.m-or .or-prog { position: absolute; left: 30%; right: 30%; bottom: 4.2%; height: 2px; background: rgba(255,255,255,0.14); border-radius: 2px; }
.m-or .or-prog i { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(255,255,255,0.75); border-radius: 2px; }
.m-or .or-prog b { position: absolute; top: 50%; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px #fff; }
.m-or .or-time { position: absolute; bottom: calc(4.2% + 10px); font: 500 max(10px, 0.8vmin) 'Oley Sans', sans-serif; color: rgba(255,255,255,0.45); }
.m-or .or-rev { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.m-or .or-ch { position: absolute; left: 0; top: 0; border-radius: 50%; will-change: transform; }
.m-or .or-ch::before { content: ''; position: absolute; inset: -9%; border-radius: 50%; background: radial-gradient(circle, rgba(0,0,0,0) 62%, rgba(255,255,255,0.07) 63%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 72%); }
.m-or .or-disc { position: absolute; inset: 0; border-radius: 50%; background: #0b0b0d center / cover no-repeat; box-shadow: 0 0 1.4vmin rgba(0,0,0,0.6), inset 0 0 1.2vmin rgba(0,0,0,0.45); }
.m-or .or-disc.blank { background: repeating-radial-gradient(circle, #0d0d10 0 2px, #17171b 2px 3px); }
.m-or .or-disc::after { content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle, #050506 0 5%, rgba(255,255,255,0.18) 5.6%, rgba(0,0,0,0) 7%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.25) 31%, rgba(0,0,0,0) 33%),
    conic-gradient(from 20deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.16) 30deg, rgba(255,255,255,0) 70deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,0.1) 210deg, rgba(255,255,255,0) 250deg); }
.m-or .or-hit { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: auto; cursor: pointer; }
.m-or .or-hint { position: absolute; left: 0; top: 0; font: 500 max(10px, 1.05vmin) 'Oley Sans', sans-serif; color: rgba(255,255,255,0.75); white-space: nowrap; letter-spacing: 0.02em;
  text-shadow: 0 1px 6px rgba(0,0,0,0.8); pointer-events: none; opacity: 0; transition: opacity .3s; }
.m-or .or-tt { position: absolute; font-family: 'Oley Heavy', Impact, sans-serif; text-transform: uppercase; color: rgba(255,255,255,0.85); letter-spacing: 0.08em; white-space: nowrap; will-change: opacity; }
`);

  function circumcircle(a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
    const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
    return { x: ux, y: uy, r: Math.hypot(a.x - ux, a.y - uy) };
  }


  // ================================================================ GPU: a planet, a sky and a sun
  const SCENE = `
uniform vec3 uP, uSun, uMini, uGlowC, uGlowC2;
uniform float uTime, uSpin, uEnergy, uPulse, uPlanet, uSeed;
uniform float uBands[24];
uniform vec2 uDrift;
out vec4 o;
vec3 starL(vec2 p, float cell, float dens, float seed){
  vec2 g = floor(p / cell), f = p / cell - g;
  vec3 h = hash33(vec3(g, seed));
  if (h.x > dens) return vec3(0.);
  vec2 pos = .15 + h.yz * .7;
  float d = length((f - pos) * cell);
  float b = pow(hash12(g + seed * 3.1), 7.) * 3. + .06;
  float rad = .5 + b * .45;
  float tw = .82 + .18 * sin(uTime * (1. + h.y * 3.) + h.z * 20.);
  vec3 col = mix(vec3(1., .82, .66), vec3(.72, .84, 1.), h.y);
  float s = b * tw * exp(-d * d / (rad * rad));
  // diffraction cross on the brightest
  if (b > 1.2) { vec2 a = abs((f - pos) * cell); s += b * .25 * (exp(-a.y * 1.4) * exp(-a.x * .22) + exp(-a.x * 1.4) * exp(-a.y * .22)); }
  return col * s;
}
vec3 rotX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
void main(){
  vec2 q = gl_FragCoord.xy;
  vec2 sp = q + uDrift;
  float rs0 = uRes.y / 900.;
  vec3 col = vec3(.0012, .0016, .0032);
  col += starL(sp, 4.5 * rs0, .14, 1.) * .3 + starL(sp, 10. * rs0, .22, 2.) * .65 + starL(sp, 29. * rs0, .3, 3.) * 1.3;
  vec2 mw = rot2(sp / uRes.y, .52);
  float band = exp(-pow((mw.y - .22) * 3., 2.));
  float neb = fbm2(mw * 3.4, 5);
  col += (vec3(.035, .04, .055) * smoothstep(.35, .8, neb) * 1.5 + vec3(.018, .014, .028) * neb) * band;
  col *= 1. - .55 * band * smoothstep(.5, .76, fbm2(mw * 7. + 3., 4));
  vec2 sunDir = normalize(uSun.xy - uP.xy);
  if (uPlanet > .5) {
    vec2 d = (q - uP.xy) / uP.z;
    float r = length(d);
    vec3 L = normalize(vec3(-.42, .5, .76));
    float sunSide = sat(dot(d / max(r, 1e-4), sunDir) * .5 + .5);
    if (r < 1.) {
      vec3 n = vec3(d, sqrt(1. - r * r));
      vec3 pf = rotY(rotX(n, .45), uSpin);
      // land, sea and ice, all procedural so coastlines stay crisp
      vec3 q = pf * 1.7 + uSeed;
      float h = fbm3(q + .6 * vec3(fbm3(q * 1.3 + 4., 3)), 8);
      float land = smoothstep(.035, .055, h);
      float v = fbm3(pf * 9. + uSeed * 2., 5);
      float arid = smoothstep(-.05, .25, fbm3(pf * 2.5 + 9., 3) + (abs(pf.y) < .5 ? .1 : -.2));
      vec3 ocean = mix(vec3(.0015, .005, .016), vec3(.004, .018, .04), smoothstep(-.15, .05, h));
      vec3 green = mix(vec3(.014, .026, .012), vec3(.034, .045, .022), v + .5);
      vec3 desert = mix(vec3(.075, .06, .042), vec3(.13, .105, .075), v + .5);
      vec3 alb = mix(ocean, mix(green, desert, arid), land);
      alb = mix(alb, vec3(.6, .63, .68), smoothstep(.76, .9, abs(pf.y) + v * .08));
      float sea = 1. - land;
      vec3 cp = pf * 13. + vec3(uSpin * 3., 0., 0.);
      float w1 = fbm3(cp * .55 + 11., 3);
      float cl = fbm3(cp + vec3(w1, -w1, w1) * 1.6, 6);
      cl = smoothstep(.0, .42, cl + .16 * fbm3(pf * 48. + 2., 3));
      cl *= .65 + .35 * smoothstep(-.2, .3, fbm3(pf * 4. + 5., 2));
      float ndl = dot(n, L);
      float lit = max(ndl, 0.) * .9 + .06;
      vec3 c = alb * lit * 1.8;
      c = mix(c, vec3(.4, .43, .48) * lit, cl * .86);
      // cloud tops catch the light as it grazes them
      c += vec3(1., .9, .8) * cl * smoothstep(.0, .2, ndl) * (1. - smoothstep(.2, .5, ndl)) * .15;
      c += vec3(1., .9, .75) * pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 50.) * (1. - cl) * sea * .7;
      // limb: darkening toward the edge, then a thin bright atmosphere
      float mu = n.z;
      c *= .35 + .65 * smoothstep(0., .55, mu);
      float top = sat(n.y * .8 + .35);
      c += vec3(.2, .48, 1.) * pow(1. - mu, 6.) * (.15 + 1.4 * top);
      c += vec3(.55, .75, 1.) * pow(1. - mu, 18.) * (.3 + 2. * top);
      col = c;
    } else {
      float hd = (r - 1.) * uP.z / uRes.y;
      float top = sat(d.y / max(r, 1e-4) * .8 + .35);
      col += vec3(.24, .55, 1.) * (exp(-hd * 160.) * .9 + exp(-hd * 30.) * .16) * (.12 + 1.1 * top);
    }
  }
  // the sun's corona, alive with the music
  vec2 ds = q - uSun.xy; float rs = length(ds) / uSun.z; float an = atan(ds.y, ds.x);
  if (rs > .97) {
    float NB = 120.;
    float tt = an / TAU + .5;
    float bi = floor(tt * NB);
    float bt = (bi + .5) / NB;
    float m = bt < .5 ? bt * 2. : (1. - bt) * 2.;
    float v = uBands[int(clamp((1. - m) * 23. * .85, 0., 23.))];
    float fl = .75 + .25 * vnoise(vec2(bi * .37, uTime * 6.));
    float len = (.06 + 1.0 * pow(v, 1.2) * fl + uPulse * .1) * uEnergy;
    float k = rs - 1.06;
    float across = abs(fract(tt * NB) - .5);
    float bar = (1. - smoothstep(.16, .26, across)) * step(0., k) * (1. - smoothstep(len * .85, len, k));
    float glow = exp(-max(rs - 1., 0.) * 3.) * .5 + exp(-max(rs - 1., 0.) * .9) * .08;
    vec3 gold = mix(uGlowC, uGlowC2, .45);
    col += gold * (bar * 2.6 + glow * uEnergy);
  }
  col += vec3(1., .92, .82) * exp(-abs(ds.y) / (uSun.z * .02)) * exp(-abs(ds.x) / (uSun.z * 6.)) * (.12 + uPulse * .3);
  vec2 axis = uRes * .5 - uSun.xy;
  for (int i = 1; i <= 3; i++) {
    vec2 gp = uSun.xy + axis * (.6 + float(i) * .45);
    float gr = uSun.z * (.22 + .16 * float(i));
    col += mix(uGlowC, vec3(.45, .65, 1.), float(i) / 3.) * smoothstep(gr, gr * .6, length(q - gp)) * .03;
  }
  vec2 dm = q - uMini.xy; float rm = length(dm) / max(uMini.z, 1.);
  if (uMini.z > 0. && rm > .97) col += mix(uGlowC, uGlowC2, .5) * (exp(-(rm - 1.) * 3.) * .35 + pow(vnoise(vec2(atan(dm.y, dm.x) * 10., uTime)), 3.) * exp(-(rm - 1.) * 4.) * .6) * uEnergy * .5;
  o = vec4(col, 1.);
}`;

  class Orbit {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-or');
      this.glOk = O.glSupported();
      if (this.glOk) {
        const G = (this.G = new O.GL(R, { onRestored: () => ctx.stage.restartMode() }));
        this.glOk = G.ok;
        if (G.ok) {
          this.post = new O.Post(G);
          this.pScene = G.program(SCENE);
          this.rt = G.target(4, 4);
        }
      }
      this.film = new O.Film(R, { grain: 0.06, vignette: 0.25 });
      this.sun = U.el('div', 'or-sun', R);
      this.revolver();
      this.words = U.el('div', 'or-words', R);
      this.tt = U.el('div', 'or-tt', R);
      this.prog = U.el('div', 'or-prog', R);
      this.progFill = U.el('i', '', this.prog);
      this.progDot = U.el('b', '', this.prog);
      this.tA = U.el('div', 'or-time', R);
      this.tB = U.el('div', 'or-time', R);
      this.blocks = [];
      this.li = -99;
      this.time = 0;
      this.spin = 0;
      this.bars = new Float32Array(144);
      this.n1 = U.noise1(21);
      this.bgKey = '';
      this.layout();
    }
    layout() {
      const W = this.ctx.W, H = this.ctx.H;
      const u = Math.min(H, W * 0.5625);
      this.P = { x: W * 0.6, y: H * 0.5 + u * 0.86, r: u * 1.1 };
      this.sunR = u * 0.105;
      this.sunX = W * 0.6;
      this.sunY = H * 0.6;
      const s = this.sunR * 2;
      Object.assign(this.sun.style, { width: s + 'px', height: s + 'px' });
      // the revolver: a wheel of six discs whose centre sits below the bottom edge, so only the top one shows whole
      const rv = this.rev;
      rv.dr = Math.max(26, u * 0.072);
      rv.wr = rv.dr * 2.25;
      rv.cx = Math.max(rv.dr * 1.6, W * 0.09);
      rv.cy = H + rv.wr * 0.18;
      this.mR = rv.dr; this.mX = rv.cx; this.mY = rv.cy - rv.wr;
      for (const c of rv.ch) Object.assign(c.el.style, { width: rv.dr * 2 + 'px', height: rv.dr * 2 + 'px' });
      Object.assign(rv.hit.style, { width: rv.dr * 2.3 + 'px', height: rv.dr * 2.3 + 'px', transform: `translate(${(this.mX - rv.dr * 1.15).toFixed(1)}px,${(this.mY - rv.dr * 1.15).toFixed(1)}px)` });
      rv.hint.style.transform = `translate(${(this.mX - rv.dr * 0.2).toFixed(1)}px,${(this.mY - rv.dr * 1.75).toFixed(1)}px) translateX(-30%)`;
      this.tA.style.left = '30%';
      this.tB.style.right = '30%';
      this.bgKey = '';
    }
    onResize() { this.layout(); this.rebuild(); }
    // ------------------------------------------------------------ the revolver of song discs
    revolver() {
      const el = U.el('div', 'or-rev', this.root);
      const rv = (this.rev = { el, ch: [], slot: 0, ang: 0, vel: 0, nudge: 0, key: null, expect: 0, expectT: 0, wheelAcc: 0, lastAct: 0, hover: false, hk: 0, urls: {} });
      for (let i = 0; i < 6; i++) {
        const c = U.el('div', 'or-ch', el);
        const d = U.el('div', 'or-disc blank', c);
        rv.ch.push({ el: c, disc: d, slot: null, url: '' });
      }
      rv.hit = U.el('div', 'or-hit', this.root);
      rv.hit.setAttribute('data-wheel', '');
      rv.hint = U.el('div', 'or-hint', this.root, 'Scroll to change song');
      const role = this.ctx.stage && this.ctx.stage.role;
      const live = role === 'cinema' || role === 'window' || role === 'view';
      if (!live) rv.hit.style.pointerEvents = 'none';
      rv.hit.addEventListener('mouseenter', () => { rv.hover = true; });
      rv.hit.addEventListener('mouseleave', () => { rv.hover = false; rv.wheelAcc = 0; });
      rv.hit.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = performance.now();
        rv.wheelAcc += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
        if (now - rv.lastAct < 650 || Math.abs(rv.wheelAcc) < 40) return;
        const dir = rv.wheelAcc > 0 ? 1 : -1;
        rv.wheelAcc = 0;
        rv.lastAct = now;
        this.skip(dir);
      }, { passive: false });
    }
    // turn the revolver now (a click forward) and ask the player for the next / previous song
    skip(dir) {
      const rv = this.rev, link = this.ctx.stage && this.ctx.stage.link;
      rv.nudge = dir;
      rv.expect = dir; rv.expectT = performance.now();
      if (link && link.connected !== false) link.send({ type: 'action', name: dir > 0 ? 'next' : 'prev' });
    }
    revTrack(tr) {
      const rv = this.rev;
      const key = tr ? (tr.id || '') + '|' + (tr.title || '') + '|' + (tr.artist || '') : null;
      if (key === rv.key) return;
      const first = rv.key == null;
      rv.key = key;
      if (!key) return;
      if (!first) {
        const asked = rv.expect && performance.now() - rv.expectT < 8000 ? rv.expect : 1;
        rv.slot += asked;
        rv.expect = 0;
      }
      rv.nudge = 0;
      rv.urls[rv.slot] = '';
      rv.artFor = rv.slot;
    }
    revArt(url) {
      const rv = this.rev;
      rv.urls[rv.artFor == null ? rv.slot : rv.artFor] = url || '';
    }
    revFrame(dt, A) {
      const rv = this.rev;
      // a spring with a little overshoot: the cylinder clicks round
      const target = rv.slot * 60 + rv.nudge * 14;
      const k = 120, c = 13;
      rv.vel += (-(rv.ang - target) * k - rv.vel * c) * Math.min(dt, 0.05);
      rv.ang += rv.vel * Math.min(dt, 0.05);
      if (rv.expect && performance.now() - rv.expectT > 2500) { rv.expect = 0; rv.nudge = 0; }
      rv.hk = U.damp(rv.hk, rv.hover ? 1 : 0, 8, dt);
      // at rest only the one disc shows; the other chambers come into view while the cylinder turns (or peek on hover)
      const moving = Math.min(1, Math.abs(rv.vel) / 120);
      rv.mk = U.damp(rv.mk || 0, moving, moving > rv.mk ? 20 : 3, dt);
      const show = Math.max(rv.mk, rv.hk * 0.5);
      rv.hint.style.opacity = (rv.hk * 0.9).toFixed(3);
      const spin = (this.spin * 360) % 360;
      for (let i = 0; i < 6; i++) {
        const ch = rv.ch[i];
        // which slot this chamber shows: the one nearest the active slot with s ≡ i (mod 6)
        let s = rv.slot + ((((i - rv.slot) % 6) + 9) % 6) - 3;
        if (ch.slot !== s) ch.slot = s;
        const url = rv.urls[s] || '';
        if (url !== ch.url) {
          ch.url = url;
          ch.disc.style.backgroundImage = url ? 'url("' + url + '")' : '';
          ch.disc.classList.toggle('blank', !url);
        }
        const a = ((-90 + s * 60 - rv.ang) * Math.PI) / 180;
        const x = rv.cx + Math.cos(a) * rv.wr, y = rv.cy + Math.sin(a) * rv.wr;
        const top = Math.max(0, Math.cos(a + Math.PI / 2));
        const sc = (0.8 + 0.2 * top) * (1 + rv.hk * 0.07 * top) * (1 + (A ? A.pulse : 0) * 0.02 * top);
        const own = s === rv.slot ? spin * 0.6 : 0;
        ch.el.style.transform = `translate(${(x - rv.dr).toFixed(1)}px,${(y - rv.dr).toFixed(1)}px) scale(${sc.toFixed(4)}) rotate(${own.toFixed(1)}deg)`;
        ch.el.style.opacity = Math.max(Math.pow(top, 10), show * (0.45 + 0.55 * top)).toFixed(3);
        ch.el.style.zIndex = String(Math.round(top * 10));
      }
    }
    onTrack(tr) {
      this.revTrack(tr);
      this.tt.innerHTML = '';
      if (tr) this.tt.textContent = (U.mainArtist(tr.artist) + ' — ' + (tr.title || '')).trim();
      this.rebuild();
    }
    onArt(url) {
      const bg = url ? 'url("' + url + '")' : '';
      this.sun.style.backgroundImage = bg;
      this.artUrl = url || '';
      this.revArt(url);
    }
    onLyrics() { this.rebuild(); }
    rebuild() {
      for (const b of this.blocks) U.remove(b.el);
      this.blocks = [];
      this.li = -99;
    }

    // ------------------------------------------------------------ the sky, the planet and the sun's corona (GPU)
    drawGL(t, dt, A) {
      const G = this.G, ctx = this.ctx, W = ctx.W, H = ctx.H;
      const s = O.glScale(ctx, false) * 0.9;
      if (G.size(W * s, H * s)) G.resizeTarget(this.rt, G.w, G.h);
      const k = s, p = ctx.palette;
      const col = p.glow, col2 = U.mix(col, [255, 220, 160], 0.35);
      const energy = 0.6 + A.bass * 0.6 + A.pulse * 0.45;
      const bands = new Float32Array(24);
      for (let i = 0; i < 24; i++) bands[i] = A.bands[i] || 0;
      G.draw(this.pScene, {
        uSeed: (ctx.tl.seed % 97) * 0.37,
        uP: [this.P.x * k, (H - this.P.y) * k, this.P.r * k], uSun: [this.sunX * k, (H - this.sunY) * k, this.sunR * k],
        uMini: [this.mX * k, (H - this.mY) * k, this.mR * k], uTime: t, uSpin: this.time * 0.004, uEnergy: energy, uPulse: A.pulse,
        uBands: bands, uGlowC: O.lin(col), uGlowC2: O.lin(col2), uPlanet: this.ctx.opts.planet === false ? 0 : 1, uDrift: [this.n1(this.time * 0.05) * 6 * k, this.n1(this.time * 0.04 + 3) * 4 * k],
      }, this.rt);
      this.post.run(this.rt, { time: t, bloom: 0.05, glow: 0.12, vig: 0.34, grain: 0.04, halation: 0.05, clip: 0.85, ca: 0.0008 });
    }

    // ------------------------------------------------------------ words
    makeBlock(li) {
      const L = this.ctx.tl.lines[li];
      if (!L) return null;
      const u = this.ctx.u;
      const el = U.el('div', 'or-block', this.words);
      const n = L.words.length;
      const base = u * (n <= 3 ? 8.6 : n <= 5 ? 7.4 : n <= 8 ? 6 : 4.9);
      const r = this.ctx.rng('or' + li);
      const items = L.words.map((w, i) => {
        const s = U.el('span', 'or-w', el, (w.bare || w.raw).toUpperCase());
        const small = O.STOP.has(w.w) && w.w.length <= 4 && !w.key;
        const size = base * (w.key ? 1.16 : small ? 0.52 : 1);
        s.style.fontSize = size.toFixed(1) + 'px';
        if (small) s.classList.add('s');
        s.style.opacity = '0';
        return { el: s, w, small, dx: r.range(-1, 1) };
      });
      const tilt = 26 + r.range(-6, 6), rz = -4 + r.range(-3, 3);
      const blk = { li, L, el, items, tilt, rz, out: false, outT: 0 };
      this.blocks.push(blk);
      return blk;
    }

    frame(t, dt, A, jumped) {
      const ctx = this.ctx, tl = ctx.tl, H = ctx.H;
      this.time += dt;
      this.film.frame();
      if (this.glOk && !this.G.lost) this.drawGL(t, dt, A);
      if (ctx.playing) this.spin += dt * (0.06 + A.level * 0.08);
      this.sun.style.transform = `translate(${(this.sunX - this.sunR).toFixed(1)}px,${(this.sunY - this.sunR).toFixed(1)}px) rotate(${(this.spin * 360) % 360}deg) scale(${(1 + A.pulse * 0.035).toFixed(4)})`;
      this.revFrame(dt, A);

      const li = O.lineAt(tl, t);
      if (li !== this.li || jumped) {
        if (jumped) this.rebuild();
        for (const b of this.blocks) if (!b.out) { b.out = true; b.outT = 0; }
        if (li >= 0) this.makeBlock(li);
        this.li = li;
      }
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const b = this.blocks[i];
        if (b.out) {
          b.outT += dt;
          const k = U.e('inCubic', b.outT / 0.5);
          b.el.style.opacity = (1 - k).toFixed(3);
          b.el.style.filter = k > 0.05 ? `blur(${(k * 10).toFixed(1)}px)` : 'none';
          b.el.style.transform = `translateY(-50%) translateX(${(-k * 18).toFixed(2)}%) translateZ(${(k * 260).toFixed(1)}px) rotateY(${b.tilt}deg) rotateZ(${b.rz}deg)`;
          if (b.outT > 0.55) { U.remove(b.el); this.blocks.splice(i, 1); }
          continue;
        }
        const L = b.L;
        const rest = L.gapAfter > 4 ? U.prog(L.singEnd + 1.5, L.singEnd + 3.5, t) : 0;
        const drift = (t - L.t) * 1.2;
        b.el.style.opacity = (1 - rest * 0.7).toFixed(3);
        b.el.style.filter = 'none';
        b.el.style.transform = `translateY(-50%) translateZ(${(drift * 6).toFixed(1)}px) rotateY(${(b.tilt - drift * 0.4).toFixed(2)}deg) rotateZ(${b.rz}deg)`;
        const col = this.ctx.palette.glow;
        for (const it of b.items) {
          const p = U.prog(it.w.t - 0.06, it.w.t + 0.24, t);
          const e = U.e('outExpo', p);
          const st = it.el.style;
          st.opacity = U.sat(p * 2.2).toFixed(3);
          st.transform = `translate3d(${((1 - e) * -90).toFixed(1)}px,0,${((1 - e) * -520).toFixed(1)}px)`;
          const bl = (1 - e) * 9;
          st.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
          const sm = 1 - U.prog(0.15, 0.9, p);
          st.textShadow = sm > 0.02 ? `${(-40 * sm).toFixed(0)}px 0 ${(14 * sm).toFixed(0)}px ${U.rgba(col, 0.55 * sm)}, ${(-90 * sm).toFixed(0)}px 0 ${(28 * sm).toFixed(0)}px ${U.rgba(col, 0.3 * sm)}` : 'none';
        }
      }
      // title in the dark when there's nothing to sing
      const showTT = ctx.track && (li < 0 || tl.status === 'none' || tl.status === 'instrumental');
      this.ttOp = U.damp(this.ttOp || 0, showTT ? 1 : 0, 2, dt);
      this.tt.style.opacity = this.ttOp.toFixed(3);
      this.tt.style.fontSize = (ctx.u * 2.6).toFixed(1) + 'px';
      this.tt.style.transform = `translate(${(ctx.W * 0.06).toFixed(0)}px,${(H * 0.4).toFixed(0)}px)`;
      // progress
      const dur = (ctx.track && ctx.track.duration) || 0;
      if (dur > 0) {
        const f = U.sat(t / dur);
        this.progFill.style.width = (f * 100).toFixed(2) + '%';
        this.progDot.style.left = (f * 100).toFixed(2) + '%';
        const fm = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
        const ta = fm(Math.max(0, t)), tb = '-' + fm(Math.max(0, dur - t));
        if (this._ta !== ta) { this._ta = ta; this.tA.textContent = ta; this.tB.textContent = tb; }
        this.prog.style.display = '';
      } else this.prog.style.display = 'none';
    }
    destroy() { if (this.G) this.G.destroy(); }
  }
  O.registerMode('orbit', Orbit, { label: 'Orbit', glow: false });
})();
