/* Afterglow: the cover fills the screen and the words stack over it, the one being sung big in the
   middle, the one before small above, the next one small below, with little icons for words like
   "left", "city" or "started". A soft rim of light hugs the screen. In the long instrumental gaps and
   at the end the camera pulls back and you see it was a monitor glowing in a dark room all along. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('afterglow', `
.m-after { background: #000; }
.m-after .ag-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font: 700 12vmin 'Oley Round', sans-serif; text-shadow: 0 0.04em 0.3em rgba(0,0,0,0.5); }
`);

  // 24-unit icons (stroked unless f)
  const ICONS = {
    left: { d: 'M20 12H4.5M10.5 5.5 4 12l6.5 6.5' },
    right: { d: 'M4 12h15.5M13.5 5.5 20 12l-6.5 6.5' },
    up: { d: 'M12 20V4.5M5.5 10.5 12 4l6.5 6.5' },
    down: { d: 'M12 4v15.5M5.5 13.5 12 20l6.5-6.5' },
    play: { d: 'M7 4.5l12.5 7.5L7 19.5z', f: true },
    pause: { d: 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z', f: true },
    city: { d: 'M3.5 21V10h5V4h8v17M2.5 21h19M6 13.5v.5M6 17v.5M11.5 7.5h2M11.5 11h2M11.5 14.5h2M11.5 18h2', box: true },
    heart: { d: 'M12 20.5s-7.6-4.6-9.6-9C.9 8 3 4 6.8 4c2.2 0 3.6 1.3 5.2 3.2C13.6 5.3 15 4 17.2 4 21 4 23.1 8 21.6 11.5c-2 4.4-9.6 9-9.6 9z', f: true },
    phone: { d: 'M6.5 3h3.2l1.8 4.8-2.3 1.5a11.5 11.5 0 0 0 5.5 5.5l1.5-2.3 4.8 1.8v3.2A2.5 2.5 0 0 1 18.5 20 15.5 15.5 0 0 1 4 5.5 2.5 2.5 0 0 1 6.5 3z', f: true },
    home: { d: 'M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5.3v-6H9.3v6H4a1 1 0 0 1-1-1z', f: true },
    moon: { d: 'M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z', f: true },
    sun: { d: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 1.5v2.6M12 19.9v2.6M1.5 12h2.6M19.9 12h2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8' },
    star: { d: 'M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z', f: true },
    fire: { d: 'M12 22c4.1 0 7-2.8 7-6.8 0-3.7-2.6-6.3-4.3-8.9-.4 2-1.4 3.3-2.8 4C12.6 7 11.3 4.2 9 2c.3 3.6-4 6.7-4 11.4C5 19 8 22 12 22z', f: true },
    car: { d: 'M3 16.5V12l2.2-5h13.6L21 12v4.5M3 16.5h18M3 16.5V19h3v-2.5M18 16.5V19h3v-2.5M6.5 13.5h1M16.5 13.5h1' },
    plane: { d: 'M21 15.5l-8-5V4.5a1.5 1.5 0 0 0-3 0v6l-8 5v2l8-2.5V20l-2.5 1.5V23l4-1 4 1v-1.5L13 20v-5l8 2.5z', f: true },
    money: { d: 'M12 2.5v19M16.5 6.5c-.8-1.3-2.5-2-4.5-2-2.7 0-4.5 1.3-4.5 3.3 0 4.6 9 2.5 9 7.4 0 2-1.9 3.3-4.6 3.3-2.2 0-4-.8-4.8-2.4' },
    clock: { d: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM12 6.5V12l3.8 2.4' },
    rain: { d: 'M7 15.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 7.5a4 4 0 0 1-.5 8zM8 18.5l-1 2.5M12 18.5l-1 2.5M16 18.5l-1 2.5' },
    music: { d: 'M9 18V5.5l11-2V16M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    eye: { d: 'M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
    chat: { d: 'M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 20 17H10l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5z', f: true },
    globe: { d: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM2.5 12h19M12 2.5c2.7 2.6 4 5.8 4 9.5s-1.3 6.9-4 9.5c-2.7-2.6-4-5.8-4-9.5s1.3-6.9 4-9.5z' },
  };
  const WORDS = {};
  const map = (list, icon) => list.split(' ').forEach((w) => { WORDS[w] = icon; });
  map('left', 'left'); map('right', 'right'); map('up rise rising high higher', 'up'); map('down low lower fall falling', 'down');
  map('start started starting play playing begin began go', 'play'); map('stop stopped pause wait waiting', 'pause');
  map('city cities town downtown building buildings', 'city'); map('love loved lover heart hearts', 'heart');
  map('call calls called calling phone ring ringing', 'phone'); map('home house', 'home'); map('night nights tonight moon midnight', 'moon');
  map('sun sunny sunshine morning sunrise sunset day daylight', 'sun'); map('star stars', 'star'); map('fire burn burning burned flame flames hot', 'fire');
  map('car cars drive driving ride riding road', 'car'); map('fly flying flight plane planes sky', 'plane'); map('money cash rich paid pay', 'money');
  map('time clock hour hours minute minutes', 'clock'); map('rain raining storm cry crying tears', 'rain'); map('song songs music sing singing dance dancing', 'music');
  map('eyes eye see saw look looking watch watching', 'eye'); map('text texts message messages talk', 'chat'); map('world earth everywhere', 'globe');

  const SCREEN = `
uniform sampler2D uCover, uW0, uW1, uW2, uW3, uDock;
uniform vec4 uR0, uR1, uR2, uR3, uA, uL, uCov, uDockR;
uniform float uDockA, uDim;
out vec4 o;
vec4 spr(sampler2D s, vec4 r, float lod, vec2 p, vec2 off){
  vec2 uv = (p - off - r.xy) / (r.zw - r.xy);
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec4(0.);
  return textureLod(s, vec2(uv.x, 1. - uv.y), lod);
}
vec3 layer(vec3 c, sampler2D s, vec4 r, float a, float lod, vec2 p){
  if (a <= 0.001) return c;
  float hgt = r.w - r.y;
  float sh = spr(s, r, lod + 3.2, p, vec2(0., hgt * .03)).a;
  c *= 1. - sh * .5 * a;
  vec4 t = linPremul(spr(s, r, lod, p, vec2(0.)));
  return c * (1. - t.a * a) + t.rgb * a;
}
void main(){
  vec2 p = vec2(gl_FragCoord.x / uRes.x, 1. - gl_FragCoord.y / uRes.y);
  float asp = uRes.x / uRes.y;
  // the cover, filling the screen (Ken Burns drift)
  vec2 q = (p - .5) * vec2(asp, 1.);
  vec2 cu = uCov.xy + q * uCov.z;
  vec3 c = textureLod(uCover, vec2(cu.x, 1. - cu.y), max(0., uCov.w)).rgb * uDim;
  float v = length((p - .5) * vec2(asp, 1.) * vec2(.82, 1.));
  c *= 1. - .45 * smoothstep(.35, 1.05, v);
  c = layer(c, uW0, uR0, uA.x, uL.x, p);
  c = layer(c, uW1, uR1, uA.y, uL.y, p);
  c = layer(c, uW2, uR2, uA.z, uL.z, p);
  c = layer(c, uW3, uR3, uA.w, uL.w, p);
  vec4 d = linPremul(spr(uDock, uDockR, 0., p, vec2(0.)));
  c = c * (1. - d.a * uDockA) + d.rgb * uDockA;
  o = vec4(c, 1.);
}`;
  // the monitor in a dark room
  const ROOM = `
uniform sampler2D uScreen;
uniform vec3 uC, uF, uRt, uUp;
uniform float uTanH, uPull, uGlowA, uRot, uTime;
uniform vec3 uGlow1, uGlow2, uAvg;
out vec4 o;
const float DESK = 1.32, WALL = 2.6, BEZ = .028;
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
vec3 screenAt(vec2 xy, float lod){
  vec2 uv = vec2(xy.x / (uRes.x / uRes.y) * .5 + .5, xy.y * .5 + .5);
  return textureLod(uScreen, vec2(uv.x, 1. - uv.y), lod).rgb;
}
vec3 rimCol(vec2 xy){
  float a = atan(xy.y, xy.x) + uRot;
  return mix(uGlow1, uGlow2, .5 + .5 * sin(a * 2.)) * uGlowA;
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  float asp = uRes.x / uRes.y;
  vec2 hs = vec2(asp, 1.);
  if (uPull < .0005) {
    vec2 p = vec2(fc.x / uRes.x, 1. - fc.y / uRes.y);
    vec3 c = textureLod(uScreen, vec2(p.x, 1. - p.y), 0.).rgb;
    vec2 xy = (p - .5) * 2. * hs;
    float e = -sdBox(xy, hs, .03);
    c += rimCol(xy) * (exp(-e * 46.) * .75 + exp(-e * 12.) * .1);
    o = vec4(c, 1.); return;
  }
  vec2 nd = (fc - .5 * uRes) / (.5 * uRes.y);
  vec3 d = normalize(uF + nd.x * uTanH * uRt + nd.y * uTanH * uUp);
  vec3 col = vec3(.004, .004, .006);
  // monitor plane z = 0 (world y down)
  float ts = d.z > 1e-4 ? -uC.z / d.z : 1e9;
  vec3 P = uC + d * ts;
  float sd = sdBox(P.xy, hs, .03);
  float bd = sdBox(P.xy, hs + BEZ, .05);
  // desk plane y = DESK
  float td = d.y > 1e-4 ? (DESK - uC.y) / d.y : 1e9;
  float tw = d.z > 1e-4 ? (WALL - uC.z) / d.z : 1e9;
  if (ts < 1e8 && bd < 0.) {
    if (sd < 0.) {
      vec3 c = screenAt(P.xy, 0.);
      float e = -sd;
      c += rimCol(P.xy) * (exp(-e * 46.) * .75 + exp(-e * 12.) * .1);
      // a hint of glass reflection
      c += vec3(.012) * smoothstep(.6, -.4, P.x / asp + P.y);
      col = c;
    } else {
      // bezel: dark plastic, lit at its edge by the panel
      float k = sat(-bd / BEZ);
      col = vec3(.018, .018, .021) + rimCol(P.xy) * .35 * exp(-sd * 60.) + vec3(.03) * smoothstep(.0, 1., 1. - k) * .4;
    }
  } else {
    vec3 bias = vec3(0.);
    if (td < tw && td > 0.) {
      vec3 Q = uC + d * td;
      // light pooling on the desk under the screen, and a soft reflection of it
      float dz = abs(Q.z);
      float under = exp(-max(abs(Q.x) - asp, 0.) * 2.5) * exp(-dz * 1.3);
      vec3 r = reflect(d, vec3(0., -1., 0.));
      float tr = r.z > 1e-4 ? -Q.z / r.z : -1.;
      vec3 refl = vec3(0.);
      if (tr > 0.) {
        vec3 R = Q + r * tr;
        float rs = sdBox(R.xy, hs, .03);
        float fall = exp(-tr * 1.1);
        refl = screenAt(clamp(R.xy, -hs, hs), 6.2) * smoothstep(.3, -.1, rs) * .1 * fall;
        refl += (uGlow1 + uGlow2) * .5 * uGlowA * exp(-max(rs, 0.) * 10.) * .1 * fall;
      }
      vec3 rimAvg = (uGlow1 + uGlow2) * .5 * uGlowA;
      float pool = exp(-max(abs(Q.x) - asp * .7, 0.) * 1.6) * exp(-dz * 2.2);
      col = vec3(.006, .006, .008) + (uAvg * .5 + rimAvg * .6) * pool * .22 + refl;
      // the stand
      float post = step(abs(Q.x), .07) * step(Q.z, .35) * step(-.05, Q.z);
      col = mix(col, vec3(.01), post * .8);
    } else if (tw > 0. && tw < 1e8) {
      vec3 Q = uC + d * tw;
      float wd = sdBox(Q.xy, hs * .92, .2);
      bias = (rimCol(Q.xy) * 1.4 + uAvg * .5) * exp(-max(wd, 0.) * 1.15) * .42;
      col = vec3(.005, .005, .007) + bias;
    }
    // the glow that spills past the bezel
    if (ts < 1e8) col += rimCol(P.xy) * exp(-max(bd, 0.) * 22.) * .35;
    // stand neck behind the screen
    if (ts < 1e8 && abs(P.x) < .06 && P.y > 1. && P.y < DESK) col = mix(col, vec3(.012, .012, .014), .9);
  }
  o = vec4(col, 1.);
}`;

  class Afterglow {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-after');
      this.ok = O.glSupported();
      if (this.ok) {
        const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
        this.ok = G.ok;
        if (G.ok) {
          this.post = new O.Post(G);
          this.pScreen = G.program(SCREEN);
          this.pRoom = G.program(ROOM);
          this.rtScreen = G.target(4, 4, { mips: true });
          this.rtFinal = G.target(4, 4);
          this.tCover = G.texture(null, { srgb: true, aniso: 4 });
          this.tDock = G.texture(null, {});
          this.slots = [0, 1, 2, 3].map(() => ({ tex: G.texture(null, {}), word: null }));
        }
      }
      if (!this.ok) { this.fb = U.el('div', 'ag-fallback', ctx.root); return; }
      this.seq = [];
      this.cache = new Map();
      this.pull = O.sp(0);
      this.dockKey = '';
      this.coverOk = false;
      this.fallbackCover();
    }
    fallbackCover() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d'), p = this.ctx.palette;
      const g = x.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0, p.darkHex); g.addColorStop(0.6, p.secondHex); g.addColorStop(1, p.vividHex);
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      this.G.upload(this.tCover, c);
    }
    onArt(url, img) {
      if (!this.ok) return;
      if (!img) { this.fallbackCover(); return; }
      this.G.upload(this.tCover, img);
    }
    onLyrics(tl) {
      // every sung word in order; gaps between lines are remembered
      const seq = [];
      tl.lines.forEach((L) => L.words.forEach((w, k) => { if (!w.adlib || L.adlib) seq.push({ w, L, first: k === 0 }); }));
      this.seq = seq;
      this.cache.clear();
      if (this.slots) this.slots.forEach((s) => { s.word = null; });
    }
    // a word as a texture: text plus its icon
    sprite(item) {
      if (this.cache.has(item)) return this.cache.get(item);
      const F = 150;
      const text = item.w.raw.replace(/^[("“]+|[)"”]+$/g, '');
      const icon = ICONS[WORDS[item.w.w]];
      const c = document.createElement('canvas');
      const x = c.getContext('2d');
      const font = `700 ${F}px 'Oley Round', 'Segoe UI', sans-serif`;
      x.font = font;
      const m = x.measureText(text);
      const isz = icon ? F * 0.62 : 0, gap = icon ? F * 0.2 : 0, pad = Math.round(F * 0.32);
      const w = Math.ceil(m.width + isz + gap) + pad * 2, h = Math.ceil(F * 1.3) + pad * 2;
      c.width = w; c.height = h;
      x.font = font;
      x.textBaseline = 'alphabetic';
      const base = pad + F * 1.0;
      if (icon) {
        const ix = pad, iy = base - F * 0.36 - isz / 2;
        x.save();
        if (icon.box) { x.fillStyle = 'rgba(160,160,160,0.55)'; x.beginPath(); x.roundRect(ix - isz * 0.12, iy - isz * 0.12, isz * 1.24, isz * 1.24, isz * 0.18); x.fill(); }
        x.translate(ix, iy);
        x.scale(isz / 24, isz / 24);
        const path = new Path2D(icon.d);
        x.strokeStyle = x.fillStyle = 'rgba(255,255,255,0.92)';
        x.lineWidth = 2.3; x.lineCap = 'round'; x.lineJoin = 'round';
        if (icon.f) x.fill(path); else x.stroke(path);
        x.restore();
      }
      x.fillStyle = '#fff';
      x.fillText(text, pad + isz + gap, base);
      const s = { canvas: c, F, w, h, pad, base };
      this.cache.set(item, s);
      if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value);
      return s;
    }
    drawDock() {
      const W = this.ctx.W, H = this.ctx.H, key = W + 'x' + H;
      if (key === this.dockKey) return;
      this.dockKey = key;
      const c = document.createElement('canvas');
      const S = 2, w = 330, h = 44;
      c.width = w * S; c.height = h * S;
      const x = c.getContext('2d');
      x.scale(S, S);
      x.strokeStyle = x.fillStyle = 'rgba(255,255,255,0.88)';
      x.lineWidth = 1.7; x.lineCap = 'round'; x.lineJoin = 'round';
      const icons = [
        'M4 9h3l9 9h4M4 18h3l3-3M15 9h5m-3-3 3 3-3 3m0 6 3 3-3 3',
        'M6 6v12M19 6 9 12l10 6z',
        'M8 6h3v12H8zM14 6h3v12h-3z',
        'M18 6v12M5 6l10 6-10 6z',
        'M5 10a5 5 0 0 1 5-5h9l-3-3m3 3-3 3M19 14a5 5 0 0 1-5 5H5l3 3m-3-3 3-3',
      ];
      icons.forEach((d, i) => {
        x.save();
        x.translate(20 + i * 62, 10);
        const p = new Path2D(d);
        if (i === 1 || i === 2 || i === 3) x.fill(p);
        x.stroke(p);
        x.restore();
      });
      this.G.upload(this.tDock, c);
      this.dockAR = w / h;
    }
    // which word is current, and how far through the change to it we are
    stackAt(t) {
      const seq = this.seq;
      let i = -1, lo = 0, hi = seq.length - 1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (seq[m].w.t <= t) { i = m; lo = m + 1; } else hi = m - 1; }
      if (i < 0) return { i: -1, k: 1, show: 0 };
      const it = seq[i];
      const nx = seq[i + 1];
      // fade out in long gaps
      const gapEnd = nx ? nx.w.t : it.L.end + 99;
      const idle = t - it.L.singEnd;
      const show = nx && nx.L !== it.L && gapEnd - it.L.singEnd > 3 ? 1 - U.sat((idle - 0.6) / 0.5) : nx ? 1 : 1 - U.sat((idle - 1.2) / 0.6);
      return { i, k: U.e('outCubic', U.sat((t - it.w.t) / 0.26)), show };
    }
    frame(t, dt, A, jumped) {
      const ctx = this.ctx;
      if (!this.ok) {
        const st = this.seq.length ? this.stackAt(t) : null;
        if (this.fb) this.fb.textContent = st && st.i >= 0 && st.show > 0.5 ? this.seq[st.i].w.raw : '';
        if (!this.seq.length && ctx.tl.lines.length) this.onLyrics(ctx.tl);
        return;
      }
      const G = this.G;
      if (G.lost) return;
      const W = ctx.W, H = ctx.H, sc = O.glScale(ctx, false);
      if (G.size(W * sc, H * sc)) { G.resizeTarget(this.rtScreen, G.w, G.h); G.resizeTarget(this.rtFinal, G.w, G.h); }
      if (!this.seq.length && ctx.tl.lines.length) this.onLyrics(ctx.tl);
      this.drawDock();
      // ------------------------------------------------ the stack
      const st = this.stackAt(t);
      const fsBig = 0.135, fsSmall = 0.046;
      const rect = (sp, cx, cy, fs) => {
        const k = fs / sp.F;
        const w = (sp.w * k * H) / W, h = sp.h * k;
        const top = cy - (sp.base / sp.h) * h + fs * 0.36;
        return [cx - w / 2, top, cx + w / 2, top + h];
      };
      const items = [];
      if (st.i >= 0) {
        const k = st.k;
        const cur = this.seq[st.i], prev = this.seq[st.i - 1], prev2 = this.seq[st.i - 2], next = this.seq[st.i + 1];
        const yC = 0.5, gap = 0.012;
        const yPrev = yC - fsBig * 0.62 - gap - fsSmall * 0.5, yNext = yC + fsBig * 0.48 + gap + fsSmall * 0.6;
        // current: grows from the "next" slot into the middle
        items.push({ it: cur, cy: U.lerp(yNext, yC, k), fs: U.lerp(fsSmall, fsBig, k), a: 1 });
        if (prev) items.push({ it: prev, cy: U.lerp(yC, yPrev, k), fs: U.lerp(fsBig, fsSmall, k), a: 1 });
        if (prev2) items.push({ it: prev2, cy: yPrev - fsSmall * 0.9 * k, fs: fsSmall, a: 1 - k });
        if (next && next.L === cur.L) items.push({ it: next, cy: yNext + fsSmall * 0.6 * (1 - k), fs: fsSmall, a: k });
        items.forEach((x) => { x.a *= st.show; });
      }
      const u = { uCover: this.tCover, uDock: this.tDock };
      const names = ['0', '1', '2', '3'];
      const R = [], Aa = [], Ll = [];
      for (let s = 0; s < 4; s++) {
        const x = items[s];
        const slot = this.slots[s];
        if (!x || x.a <= 0.001) { R.push([0, 0, 0, 0]); Aa.push(0); Ll.push(0); u['uW' + names[s]] = slot.tex; continue; }
        const sp = this.sprite(x.it);
        if (slot.word !== x.it) { G.upload(slot.tex, sp.canvas); slot.word = x.it; }
        R.push(rect(sp, 0.5, x.cy, x.fs));
        Aa.push(x.a);
        Ll.push(Math.max(0, Math.log2(sp.F / (x.fs * H * sc))));
        u['uW' + names[s]] = slot.tex;
      }
      R.forEach((r, s) => { u['uR' + s] = r; });
      u.uA = Aa; u.uL = Ll;
      // cover framing: fill, with a slow drift
      const asp = W / H, cvs = Math.min(1, 1 / asp) * (0.94 - 0.05 * Math.sin(t * 0.05));
      u.uCov = [0.5 + 0.03 * Math.sin(t * 0.031), 0.5 + 0.025 * Math.sin(t * 0.027 + 1), cvs, Math.max(0, Math.log2((this.tCover.w * cvs) / (H * sc)))];
      const dh = 0.044, dw = (dh * this.dockAR * H) / W;
      u.uDockR = [0.5 - dw / 2, 0.93 - dh / 2, 0.5 + dw / 2, 0.93 + dh / 2];
      u.uDockA = this.ctx.opts.dock === false ? 0 : 0.7;
      u.uDim = 0.86;
      G.draw(this.pScreen, u, this.rtScreen);
      G.mipmap(this.rtScreen);
      // ------------------------------------------------ the camera: pull back in long gaps and at the end
      const tl = ctx.tl;
      let want = 0;
      if (ctx.opts.camera !== false && tl.lines.length) {
        const first = tl.lines[0].t, last = tl.lines[tl.lines.length - 1];
        if (t < first - 1.8) want = 1;
        else if (t > last.singEnd + 2) want = 1;
        else {
          const li = O.lineAt(tl, t), L = tl.lines[li], nx = tl.lines[li + 1];
          if (L && nx && nx.t - L.singEnd > 6 && t > L.singEnd + 1 && t < nx.t - 2.2) want = 1;
        }
      }
      if (jumped) this.pull = O.sp(want);
      O.spring(this.pull, want, 1.9, dt);
      const pull = U.clamp(this.pull.x, 0, 1.05);
      const e = U.e('inOutCubic', U.sat(pull));
      const tanH = Math.tan((38 * Math.PI) / 360);
      const D0 = 1 / tanH;
      const D = D0 * (1 + 2.1 * e);
      const yaw = 0.24 * e + 0.02 * Math.sin(t * 0.2) * e, pitch = 0.1 * e;
      const cam = O.CodeCam.cam(0.25 * e, -0.05 * e, D, yaw, pitch, -0.015 * e);
      const g = ctx.settings.glow || {};
      const p = ctx.palette;
      const gc1 = g.color === 'custom' ? U.parseHex(g.custom || '#3b6dff') : p.glow;
      const gc2 = g.color === 'custom' ? U.shiftHue(gc1, 40, 1, 0.95) : p.glow2;
      const inten = (g.cinema === 'off' ? 0 : U.clamp(+g.intensity || 0.8, 0, 1.5)) * (0.75 + 0.35 * A.level + 0.25 * A.pulse);
      this.rot = (this.rot || 0) + dt * 0.12;
      G.draw(this.pRoom, {
        uScreen: this.rtScreen, uC: cam.p, uF: cam.f, uRt: cam.r, uUp: cam.u, uTanH: tanH, uPull: e, uGlowA: inten, uRot: this.rot, uTime: t,
        uGlow1: O.lin(gc1), uGlow2: O.lin(gc2), uAvg: O.lin(p.avg),
      }, this.rtFinal);
      this.post.run(this.rtFinal, { time: t, bloom: 0.04, glow: 0.04 + 0.16 * e, vig: 0.2 + 0.3 * e, grain: 0.035 + 0.02 * e, ca: 0.0008 + 0.001 * e, halation: 0.03 });
    }
    destroy() { if (this.G) this.G.destroy(); }
  }
  O.registerMode('afterglow', Afterglow, { glow: false, gl: true, label: 'Afterglow' });
})();
