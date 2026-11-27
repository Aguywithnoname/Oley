/* Polyester: the song cut like a fan edit. The cover is the footage. Its subject is cut out and held
   while the world behind it rushes past; hard cuts land on the words and the beat; white flashes,
   sliced wipes, radial zoom blur and RGB shake; electric arcs and an aura behind the subject; the words
   hit as giant chrome titles behind it. It ends on an extreme close-up. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('polyester', `
.m-poly { background: #000; }
.m-poly .po-cap { position: absolute; left: 7%; right: 7%; bottom: 6.5%; text-align: center; z-index: 5;
  font: 700 clamp(13px, 2.35vmin, 38px)/1.25 'Oley Display', 'Oley Sans', sans-serif; letter-spacing: -0.005em;
  text-shadow: 0 0.08em 0.6em rgba(0,0,0,0.75), 0 0 0.12em rgba(0,0,0,0.8); will-change: opacity, transform; }
.m-poly .po-cap span { color: rgba(255,255,255,0.38); transition: color .08s linear; }
.m-poly .po-cap span.on { color: #fff; }
.m-poly .po-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font: 400 9vmin 'Oley Heavy', Impact, sans-serif; text-transform: uppercase; }
`);

  // how each kind of shot is built
  const TYPES = {
    hero: { bg: 0, sub: 1, rim: 0.0, dim: 1.0 },
    rush: { bg: 1, sub: 1, rim: 0.9, dim: 0.95, speed: 1 },
    zoom: { bg: 2, sub: 1, rim: 0.65, dim: 0.95, zoom: 0.42 },
    mono: { bg: 3, sub: 1, rim: 0.5, dim: 0.85 },
    void: { bg: 4, sub: 1, rim: 1.0, dim: 1.0, aura: true },
    electric: { bg: 3, sub: 1, rim: 1.2, dim: 0.035, tint: 1.0, electric: true },
    punch: { bg: 0, sub: 0, rim: 0, dim: 1.0 },
    tilt: { bg: 0, sub: 0, rim: 0, dim: 1.0 },
    eye: { bg: 0, sub: 0, rim: 0, dim: 1.0 },
    split: { split: true },
  };
  const WEIGHTS = {
    intro: { void: 3, electric: 1 },
    line: { hero: 3.2, rush: 2, zoom: 1.6, mono: 1.4, tilt: 1, split: 0.8, electric: 0.9, void: 0.6 },
    chorus: { hero: 2.4, electric: 2, void: 1.6, zoom: 1.6, rush: 1.4, split: 1 },
    mid: { punch: 3.2, tilt: 1.6, rush: 1.1, zoom: 1, mono: 0.8, hero: 0.6 },
    gap: { void: 2, electric: 1.6, rush: 1.2, zoom: 1.2, punch: 1, mono: 0.8 },
    outro: { eye: 1 },
  };
  const SLICE = 0.3;

  // ================================================================ shaders
  const COPY = `uniform sampler2D uSrc; out vec4 o; void main(){ o = vec4(texture(uSrc, gl_FragCoord.xy / uRes).rgb, 1.); }`;
  const BLUR = `uniform sampler2D uSrc; uniform vec2 uDir; out vec4 o;
void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 a = vec3(0.); float ws = 0.;
  for (int i = -16; i <= 16; i++){ float x = float(i); float w = exp(-x * x / 72.); a += texture(uSrc, uv + uDir * x).rgb * w; ws += w; }
  o = vec4(a / ws, 1.); }`;
  const SCENE = `
uniform sampler2D uCover, uBlurA, uBlurB, uMask, uTitle, uFxB, uFxF;
uniform vec4 uCamA, uSubA, uShA, uSh2A, uCamB, uSubB, uShB, uSh2B;
uniform vec4 uTr, uTBox, uTFx, uBand;
uniform float uBandA, uTime, uCard, uRimLod, uFxBOn, uFxFOn, uTitleOn, uLodA, uLodB, uLodSub;
uniform vec3 uTint, uTint2, uDark;
uniform vec2 uSubC, uSubP;
out vec4 o;
vec2 fl(vec2 uv){ return vec2(uv.x, 1. - uv.y); }
vec2 camUV(vec4 cam, vec2 p){ return cam.xy + rot2(p, cam.w) * cam.z; }
float cardMask(vec2 uv, float soft){
  vec2 q = abs(uv - .5) - vec2(.5 - .028);
  float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - .028;
  return 1. - smoothstep(-soft, soft, d);
}
float maskAt(vec2 uv, float lod){
  if (uCard > .5) return cardMask(uv, .0018 + lod * .006);
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 0.;
  return textureLod(uMask, fl(uv), lod).r;
}
vec3 cover(vec2 uv, float lod){ return textureLod(uCover, fl(uv), lod).rgb; }
vec3 coverExt(vec2 uv, float lod){
  vec2 d = max(-uv, uv - 1.);
  float ou = max(d.x, d.y);
  vec3 c = cover(uv, lod);
  if (ou > -.03) {
    vec3 soft = mix(texture(uBlurA, fl(uv)).rgb, texture(uBlurB, fl(uv)).rgb, smoothstep(0., .25, ou));
    c = mix(c, soft, smoothstep(-.03, .03, ou)) * (1. - .5 * smoothstep(0., .45, ou));
  }
  return c;
}
vec3 bgRush(vec2 uv, float speed){
  vec3 acc = vec3(0.);
  float t = uTime * speed;
  for (int i = 0; i < 8; i++){
    float fi = float(i);
    acc += texture(uBlurA, fl(vec2(uv.x * .2 + t * (.8 + fi * .13) + fi * .37, uv.y + (fi - 3.5) * .007))).rgb;
  }
  acc /= 8.;
  float row = uv.y * 150.;
  float st = vnoise(vec2(row, floor(uTime * 22.) * 1.7 + uv.x * 1.5));
  float spark = step(.987, hash12(vec2(floor(row * 1.4), floor(uv.x * 5. + t * 7.)))) * 2.5;
  return acc * (.4 + 1.7 * st * st * st) + uTint2 * spark * .3;
}
vec3 bgZoom(vec2 uv, float amt){
  vec3 acc = vec3(0.); float ws = 0.;
  for (int i = 0; i < 14; i++){ float k = float(i) / 13.; float w = 1. - k * .55; acc += texture(uBlurA, fl(uSubC + (uv - uSubC) * (1. - amt * k))).rgb * w; ws += w; }
  return acc / ws;
}
vec3 bgMono(vec2 uv, float lod, float tint){
  vec3 c = coverExt(uv, lod + 1.);
  float l = pow(luma(c), 1.2) * 1.2;
  vec3 m = vec3(l) * vec3(.93, .98, 1.06);
  return mix(m, m * (uTint2 * 3. + .1), tint);
}
vec3 bgVoid(vec2 p){
  vec2 d = p - uSubP; float r = length(d); float a = atan(d.y, d.x);
  float rays = pow(vnoise(vec2(a * 9., uTime * .35)), 4.) * 1.6 + pow(vnoise(vec2(a * 23. + 4., uTime * .7)), 6.);
  vec3 c = uDark * .55 + uTint * .05;
  c += uTint * rays * .6 * exp(-r * 1.5);
  c += uTint2 * .2 * exp(-r * r * 2.5);
  vec2 g = p * 26. + vec2(0., uTime * .5);
  float dust = step(.991, hash12(floor(g))) * smoothstep(.5, 0., length(fract(g) - .5));
  return c + vec3(dust) * .7;
}
vec4 titleAt(vec2 suv){
  vec2 c = uTBox.xy;
  vec2 tuv = c + (suv - c) / uTFx.y;
  if (tuv.x < 0. || tuv.y < 0. || tuv.x > 1. || tuv.y > 1.) return vec4(0.);
  vec2 tt = fl(tuv);
  float a = textureLod(uTitle, tt, 0.).a;
  float glow = textureLod(uTitle, tt, 3.2).a * .75 + textureLod(uTitle, tt, 4.6).a * .45;
  vec2 px = 1. / vec2(textureSize(uTitle, 0));
  float ax = textureLod(uTitle, tt + vec2(px.x * 2.5, 0.), 1.3).a - textureLod(uTitle, tt - vec2(px.x * 2.5, 0.), 1.3).a;
  float ay = textureLod(uTitle, tt + vec2(0., px.y * 2.5), 1.3).a - textureLod(uTitle, tt - vec2(0., px.y * 2.5), 1.3).a;
  vec3 n = normalize(vec3(-ax, -ay, .42));
  float v = (tuv.y - (c.y - uTBox.w)) / (2. * uTBox.w);
  float hv = v - n.y * .3;
  vec3 sky = mix(vec3(.92, .95, 1.), vec3(.28, .33, .45), smoothstep(0., .47, hv));
  vec3 gnd = mix(vec3(.07, .07, .09), vec3(.5, .46, .48), smoothstep(.53, 1.05, hv));
  vec3 env = mix(sky, gnd, smoothstep(.488, .512, hv));
  env = mix(env, env * (toSrgb(uTint2) * 1.2 + .35), .22);
  vec3 L = normalize(vec3(-.5, .62, .6));
  float dif = max(dot(n, L), 0.);
  float spec = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 16.);
  vec3 chrome = toLin(env * (.6 + .5 * dif)) * 1.25 + vec3(spec) * 1.6;
  vec3 g = uTint2 * glow * uTFx.z;
  return vec4(chrome * a + g * (1. - a), a) * uTFx.x;
}
vec3 shotCol(vec4 cam, vec4 scam, vec4 sh, vec4 sh2, float lod, vec2 p, vec2 suv){
  vec2 uv = camUV(cam, p);
  float type = sh.x;
  vec3 c;
  if (type < .5) c = coverExt(uv, lod);
  else if (type < 1.5) c = bgRush(uv, sh2.y);
  else if (type < 2.5) c = bgZoom(uv, sh2.z);
  else if (type < 3.5) c = bgMono(uv, lod, sh2.x);
  else if (type < 4.5) c = bgVoid(p);
  else c = texture(uBlurA, fl(uv)).rgb * .5;
  c *= sh.w;
  if (uFxBOn > .5 && sh.y > .5) { vec4 a = linPremul(textureLod(uFxB, fl(suv), 0.)); c = c * (1. - a.a) + a.rgb * 2.6; }
  vec4 ti = uTitleOn > .5 ? titleAt(suv) : vec4(0.);
  bool behind = uTFx.w > .5 && sh.y > .5;
  if (behind) c = c * (1. - ti.a) + ti.rgb;
  if (sh.y > .5) {
    vec2 su = camUV(scam, p);
    float m = maskAt(su, 0.);
    if (uCard > .5) c *= 1. - .6 * cardMask(su - vec2(0., .045), .09) * (1. - m);
    float mb = maskAt(su, uRimLod);
    float mw = maskAt(su, uRimLod + 2.2);
    vec3 sc = cover(su, uCard > .5 ? uLodSub : lod);
    float rim = sat((m - mb) * 2.6) * sh.z;
    sc += uTint2 * rim * 1.5 + vec3(rim * .3);
    c += uTint2 * sat((mw - m) * 1.5) * sh.z * .45;
    c = mix(c, sc, m);
    // the title still reads through the subject standing in front of it: no letter is ever lost
    if (behind) c = mix(c, c * (1. - ti.a) + ti.rgb, .5 * m);
  }
  if (!behind) c = c * (1. - ti.a * .94) + ti.rgb * .94;
  return c;
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 suv = vec2(fc.x / uRes.x, 1. - fc.y / uRes.y);
  vec2 p = vec2(fc.x - .5 * uRes.x, .5 * uRes.y - fc.y) / uRes.y;
  float asp = uRes.x / uRes.y;
  bool useB = false; float edge = 0.;
  if (uTr.x > .5 && uTr.x < 1.5) {
    vec2 dir = vec2(cos(uTr.z), sin(uTr.z)); vec2 nr = vec2(-dir.y, dir.x);
    float ac = dot(p, nr), al = dot(p, dir);
    float bw = (asp + 1.) / uTr.w;
    float k = floor(ac / bw);
    float st = fract(sin(k * 12.9898 + 3.1) * 43758.5453);
    float span = asp + 1.3;
    float front = (uTr.y * 1.6 - st * .6) * span - span * .5;
    useB = al < front;
    edge = (1. - smoothstep(0., .004, abs(al - front))) * step(.002, uTr.y) * step(uTr.y, .998);
  } else if (uTr.x > 1.5) {
    float x = p.x + p.y * .14;
    float d = (uTr.y - .5) * asp;
    useB = x > d;
    edge = 1. - smoothstep(0., .0028, abs(x - d));
  }
  vec3 c = useB ? shotCol(uCamB, uSubB, uShB, uSh2B, uLodB, p, suv) : shotCol(uCamA, uSubA, uShA, uSh2A, uLodA, p, suv);
  if (uFxFOn > .5) { vec4 f = linPremul(textureLod(uFxF, fl(suv), 0.)); c = c * (1. - f.a) + f.rgb * 3.4; }
  c += vec3(edge) * 2.2;
  if (uBandA > 0. && suv.x > uBand.x && suv.x < uBand.z && suv.y > uBand.y && suv.y < uBand.w) c = mix(c, vec3(4.), uBandA);
  o = vec4(max(c, 0.), 1.);
}`;
  const FX = `
uniform sampler2D uScene; uniform float uZoom, uRGB, uSharp, uKick; uniform vec2 uZoomC, uShift, uMvB; uniform vec4 uMv; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv = .5 + (uv - .5) * (1. - uKick) + uShift;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - .5) * asp, .5 - uv.y);
  vec2 v = mat2(uMv.xy, uMv.zw) * p + uMvB;
  vec2 duv = vec2(v.x / asp, -v.y);
  vec3 col;
  if (uZoom > .002 || length(duv * uRes) > .8) {
    vec3 acc = vec3(0.); float ws = 0.;
    float j = hash12(gl_FragCoord.xy) / 17.;
    for (int i = 0; i < 18; i++){ float k = float(i) / 17. + j; float w = 1. - k * .45; acc += textureLod(uScene, uZoomC + (uv - uZoomC) * (1. - uZoom * k) - duv * k, 0.).rgb * w; ws += w; }
    col = acc / ws;
  } else col = textureLod(uScene, uv, 0.).rgb;
  if (uRGB > .0001) {
    vec2 d = (uv - .5) * uRGB * 2.2 + vec2(uRGB, 0.);
    col.r = mix(col.r, textureLod(uScene, uv + d, 0.).r, .9);
    col.b = mix(col.b, textureLod(uScene, uv - d, 0.).b, .9);
  }
  vec3 bl = textureLod(uScene, uv, 1.6).rgb;
  col += (col - bl) * uSharp;
  o = vec4(max(col, 0.), 1.);
}`;

  // ================================================================ helpers
  const cleanTitle = (s) => String(s || '').replace(/[()"“”]/g, '').replace(/[,.;:]+$/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  function chunksOf(L) {
    const ws = L.words.filter((w) => !w.adlib || L.adlib);
    const groups = [];
    let cur = [];
    for (const w of ws) {
      cur.push(w);
      const len = cur.map((x) => x.raw).join(' ').length;
      if (/[,.;!?]$/.test(w.raw) || cur.length >= 3 || len >= 13) { groups.push(cur); cur = []; }
    }
    if (cur.length) {
      const last = groups[groups.length - 1];
      if (last && cur.length === 1 && cur[0].raw.length <= 3 && last.length < 3) last.push(cur[0]);
      else groups.push(cur);
    }
    return groups.map((g) => ({ t0: g[0].t, text: cleanTitle(g.map((w) => w.raw).join(' ')), li: L.i, key: g.some((w) => w.key) }));
  }
  function jag(x, a, b, disp, depth, r) {
    if (depth === 0) { x.lineTo(b[0], b[1]); return; }
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const off = (r() - 0.5) * disp;
    const m = [mx - dy * off, my + dx * off];
    jag(x, a, m, disp * 0.62, depth - 1, r);
    jag(x, m, b, disp * 0.62, depth - 1, r);
  }

  class Polyester {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-poly');
      this.ok = O.glSupported();
      this.cap = U.el('div', 'po-cap', R);
      this.capLi = -2;
      this.capSpans = [];
      if (!this.ok) { this.fb = U.el('div', 'po-fallback', R); return; }
      const G = (this.G = new O.GL(R, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; this.fb = U.el('div', 'po-fallback', R); return; }
      this.post = new O.Post(G);
      this.pCopy = G.program(COPY);
      this.pBlur = G.program(BLUR);
      this.pScene = G.program(SCENE);
      this.pFx = G.program(FX);
      this.rtScene = G.target(4, 4, { mips: true });
      this.rtFx = G.target(4, 4);
      this.rtBlurA = G.target(512, 512, { wrap: 'mirror' });
      this.rtBlurB = G.target(256, 256, { wrap: 'mirror' });
      this.rtTmpA = G.target(512, 512);
      this.rtTmpB = G.target(256, 256);
      this.tCover = G.texture(null, { srgb: true, wrap: 'mirror', aniso: 4 });
      this.tMask = G.texture(null, { premult: false });
      this.cTitle = document.createElement('canvas');
      this.tTitle = G.texture(null, {});
      this.cFxB = document.createElement('canvas');
      this.cFxF = document.createElement('canvas');
      this.tFxB = G.texture(null, { mips: false });
      this.tFxF = G.texture(null, { mips: false });
      this.shake = new O.Shake(31);
      this.info = null;
      this.guessInfo = null;
      this.shots = null;
      this.titles = [];
      this.titleKey = '';
      this.tick = 0;
      this.coverPx = 600;
      this.minS = 0.4;
      this.setFallbackCover();
    }

    // ------------------------------------------------------------ data
    onTrack() { this.shots = null; }
    onLyrics() { this.shots = null; this.capLi = -2; }
    onResize() { this.titleKey = ''; }
    setFallbackCover() {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const x = c.getContext('2d');
      const p = this.ctx.palette;
      const g = x.createRadialGradient(256, 200, 20, 256, 256, 380);
      g.addColorStop(0, p.vividHex);
      g.addColorStop(0.55, p.secondHex);
      g.addColorStop(1, p.darkHex);
      x.fillStyle = g;
      x.fillRect(0, 0, 512, 512);
      this.useCover(c);
    }
    onArt(url, img) {
      // ask the app for a proper cut-out of this cover (it answers only when it can make one)
      const link = this.ctx.stage.link;
      if (link && img && this.ctx.opts.cutout !== false) link.send({ type: 'want', what: 'mask' });
      if (!this.ok) return;
      if (!img) { this.setFallbackCover(); return; }
      this.useCover(img);
    }
    useCover(img) {
      const G = this.G;
      if (!G.upload(this.tCover, img)) return;
      this.coverPx = Math.min(this.tCover.w, this.tCover.h);
      this.minS = U.clamp(340 / this.coverPx, 0.26, 0.62);
      // soft copies of the cover for backgrounds and extensions
      G.draw(this.pCopy, { uSrc: this.tCover }, this.rtTmpA);
      G.draw(this.pBlur, { uSrc: this.rtTmpA, uDir: [1.6 / 512, 0] }, this.rtBlurA);
      G.draw(this.pBlur, { uSrc: this.rtBlurA, uDir: [0, 1.6 / 512] }, this.rtTmpA);
      G.draw(this.pCopy, { uSrc: this.rtTmpA }, this.rtBlurA);
      G.draw(this.pCopy, { uSrc: this.rtBlurA }, this.rtTmpB);
      for (let k = 0; k < 2; k++) {
        G.draw(this.pBlur, { uSrc: this.rtTmpB, uDir: [2.6 / 256, 0] }, this.rtBlurB);
        G.draw(this.pBlur, { uSrc: this.rtBlurB, uDir: [0, 2.6 / 256] }, this.rtTmpB);
      }
      G.draw(this.pCopy, { uSrc: this.rtTmpB }, this.rtBlurB);
      this.coverImg = img instanceof HTMLImageElement ? img : null;
      this.guessInfo = this.coverImg && this.ctx.opts.cutout !== false ? O.Subject.guess(img) : null;
      this.cardInfo = O.Subject.card(img);
      if (this.ctx.maskImg) this.onMask(this.ctx.maskImg);
      else this.setInfo(this.guessInfo);
    }
    onMask(img) {
      if (!this.ok) return;
      if (img && this.ctx.opts.cutout !== false) {
        const info = O.Subject.fromMask(img, this.coverImg);
        if (info) { this.setInfo(info); return; }
      }
      this.setInfo(this.guessInfo);
    }
    setInfo(info) {
      this.info = info || this.cardInfo;
      if (info && info.canvas) this.G.upload(this.tMask, info.canvas);
      this.rimLod = Math.log2(Math.max(1, (this.info.res || 480) * 0.0075));
      this.titleKey = '';
    }

    // ------------------------------------------------------------ the edit plan
    plan() {
      const tl = this.ctx.tl, r = this.ctx.rng('cuts');
      const lines = tl.lines;
      const last = lines[lines.length - 1];
      const dur = Math.max(tl.duration || 0, last ? last.end + 4 : 0, 30);
      const cuts = [];
      const add = (t, kind, o) => cuts.push(Object.assign({ t, kind }, o || {}));
      if (!lines.length) {
        add(0, 'intro');
        for (let t = 2.2; t < dur; t += r.range(1.2, 2)) add(t, 'gap');
      } else {
        add(0, 'intro');
        for (let t = 1.6; t < lines[0].t - 0.8; t += r.range(1.3, 2)) add(t, 'gap');
        lines.forEach((L, i) => {
          add(L.t, L.repeat ? 'chorus' : 'line', { L });
          let lastT = L.t, n = 0;
          for (const w of L.words) {
            if (w.t <= L.t + 0.05) continue;
            n++;
            const since = w.t - lastT;
            if (since >= 0.85 && (w.key || n >= 3 || since > 1.5)) { add(w.t, 'mid', { L }); lastT = w.t; n = 0; }
          }
          const nx = lines[i + 1];
          const end = nx ? nx.t : dur;
          if (end - L.singEnd > 2.6) for (let t = L.singEnd + 0.4; t < end - 0.9; t += r.range(1.2, 1.9)) add(t, 'gap');
        });
        add(Math.min(dur - 0.5, last.singEnd + 0.8), 'outro');
      }
      cuts.sort((a, b) => a.t - b.t);
      const kept = [];
      for (const c of cuts) {
        const p = kept[kept.length - 1];
        if (p && c.t - p.t < 0.32) { if (c.kind === 'line' || c.kind === 'chorus') kept[kept.length - 1] = c; continue; }
        kept.push(c);
      }
      const shots = [];
      let prevType = '', splitAgo = 9;
      kept.forEach((c, i) => {
        const w = Object.assign({}, WEIGHTS[c.kind] || WEIGHTS.line);
        if (prevType) w[prevType] = 0;
        if (splitAgo < 6) w.split = 0;
        const type = r.weighted(Object.keys(w).map((k) => ({ v: k, w: w[k] })));
        splitAgo = type === 'split' ? 0 : splitAgo + 1;
        prevType = type;
        let trans = 'cut';
        if (c.kind === 'intro') trans = 'flash';
        else if (c.kind === 'outro') trans = 'whip';
        else if (c.kind === 'line' || c.kind === 'chorus') trans = r.weighted([{ v: 'cut', w: 3 }, { v: 'flash', w: c.kind === 'chorus' ? 2.6 : 1.6 }, { v: 'slice', w: 1.3 }, { v: 'whip', w: 1.5 }]);
        else if (c.kind === 'mid') trans = r.weighted([{ v: 'cut', w: 4 }, { v: 'whip', w: 1.4 }, { v: 'flash', w: 0.5 }]);
        else trans = r.weighted([{ v: 'cut', w: 2 }, { v: 'whip', w: 2 }, { v: 'slice', w: 1 }, { v: 'flash', w: 0.8 }]);
        if (i === 0) trans = 'cut';
        const rr = [];
        for (let k = 0; k < 8; k++) rr.push(r());
        let band = null;
        if (trans === 'flash' && r.chance(0.4)) {
          trans = 'band';
          band = r.chance(0.5) ? [0, r.range(0.62, 0.78), 1, 1] : [r.range(0.7, 0.86), 0, r.range(0.9, 1), 1];
        }
        const forced = O.params.get('potype');
        const move = c.kind === 'outro' ? 'none' : r.weighted([{ v: 'slam', w: 1.8 }, { v: 'slideL', w: 1 }, { v: 'slideR', w: 1 }, { v: 'pull', w: 0.8 }, { v: 'roll', w: 0.8 }, { v: 'none', w: 1.1 }]);
        shots.push({
          t0: c.t, t1: kept[i + 1] ? kept[i + 1].t : dur + 60, kind: c.kind, type: forced && TYPES[forced] ? forced : type, trans, band, r: rr, move,
          aura: (type === 'hero' && c.kind === 'chorus' && rr[6] < 0.5),
          electric: (type === 'hero' || type === 'zoom') && rr[7] < 0.18,
        });
      });
      this.shots = shots;
      // titles: each line in short chunks; the song title opens
      const titles = [];
      const title = cleanTitle(this.ctx.track ? this.ctx.track.title : '');
      if (title && (!lines.length || lines[0].t > 3)) titles.push({ t0: 0.4, t1: lines.length ? lines[0].t - 0.15 : dur, text: title, intro: true });
      lines.forEach((L) => {
        const cs = chunksOf(L);
        cs.forEach((c, k) => { c.t1 = cs[k + 1] ? cs[k + 1].t0 : Math.min(L.end, L.singEnd + 0.45); titles.push(c); });
      });
      this.titles = titles.filter((c) => c.text);
    }
    shotAt(t) {
      const s = this.shots;
      let lo = 0, hi = s.length - 1;
      if (t < s[0].t0) return 0;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t0 <= t) lo = m; else hi = m - 1; }
      return lo;
    }
    titleAt(t) {
      for (let i = this.titles.length - 1; i >= 0; i--) { const c = this.titles[i]; if (c.t0 <= t) return t < c.t1 ? c : null; }
      return null;
    }

    // ------------------------------------------------------------ cameras
    // returns the uniforms for one shot: background camera, subject camera, look
    shotLook(S, age, prog) {
      const ctx = this.ctx, info = this.info, asp = ctx.W / ctx.H;
      const T = TYPES[S.type] || TYPES.hero;
      const card = info.kind === 'card';
      const r = S.r, bb = info.bbox, bh = bb[3] - bb[1];
      const fill = Math.min(1, 1 / asp);
      let bg, subOn = T.sub, bgType = T.bg;
      const pushIn = 1 - 0.07 * U.e('outCubic', prog);
      switch (S.type) {
        case 'punch': {
          const s = Math.max(this.minS, U.clamp(info.head[2] * 2.3, 0.26, 0.52));
          const kick = 1 + 0.17 * Math.exp(-age * 11);
          bg = { x: info.head[0] + (r[0] - 0.5) * 0.06, y: info.head[1] + 0.03, s: s * kick * (1 - 0.04 * prog), a: (r[1] - 0.5) * 0.09 };
          break;
        }
        case 'tilt': {
          const s = Math.max(this.minS, 0.5) * (1 - 0.06 * prog);
          const a = (r[2] < 0.5 ? -1 : 1) * (0.1 + r[3] * 0.08);
          bg = { x: info.head[0] + (r[0] - 0.5) * 0.04, y: info.head[1] + 0.13, s, a: a + 0.025 * Math.sin(age * 1.3) };
          break;
        }
        case 'eye': {
          const s = Math.max(this.minS * 0.8, 0.2) * (1 - 0.24 * U.e('outCubic', U.sat(age / 6)));
          bg = { x: info.detail[0], y: info.detail[1], s, a: 0 };
          break;
        }
        case 'mono': {
          const s = Math.max(fill * 1.05, U.clamp(bh * 0.9, 0.56, 0.8)) * pushIn;
          bg = { x: info.c[0], y: U.clamp(info.head[1] + s * 0.24, s / 2 - 0.05, 1 - s / 2 + 0.05), s, a: (r[1] - 0.5) * 0.07 };
          break;
        }
        case 'hero': {
          // full-bleed: the cover fills the frame, head in the upper third
          const s = Math.max(fill, this.minS) * (1 + 0.12 * r[2]) * pushIn;
          const hw = (s * asp) / 2;
          bg = { x: U.clamp(info.c[0] + (r[0] - 0.5) * 0.05, Math.min(0.5, hw), Math.max(0.5, 1 - hw)), y: U.clamp(bb[1] - 0.035 + s / 2, Math.min(0.5, s / 2), Math.max(0.5, 1 - s / 2)), s, a: 0 };
          break;
        }
        default: {
          let s = U.clamp(bh * 1.18, 0.72, 1.02) * (S.type === 'electric' ? 0.9 : 1) * pushIn;
          bg = { x: info.c[0] + (r[0] - 0.5) * 0.04 + (S.type === 'rush' ? 0.02 * prog * (r[1] < 0.5 ? -1 : 1) : 0), y: bb[1] + s * 0.39, s, a: 0 };
        }
      }
      // entry move: the camera arrives fast and settles (speed-ramp feel)
      const e = 1 - U.e('outExpo', age / 0.45);
      const dir = r[3] < 0.5 ? -1 : 1;
      if (e > 0.0005) {
        if (S.move === 'slam') bg.s *= 1 + 0.38 * e;
        else if (S.move === 'pull') bg.s *= 1 - 0.24 * e;
        else if (S.move === 'slideL') bg.x += 0.2 * bg.s * e;
        else if (S.move === 'slideR') bg.x -= 0.2 * bg.s * e;
        else if (S.move === 'roll') { bg.a += 0.22 * e * dir; bg.s *= 1 + 0.12 * e; }
      }
      let sub = bg;
      if (card) {
        if (subOn) {
          const ch = 0.74 * (1 + 0.025 * Math.sin(age * 0.9)) * (1 + 0.05 * U.e('outCubic', prog));
          sub = { x: 0.5 + (S.move === 'slideL' ? 0.25 : S.move === 'slideR' ? -0.25 : 0) * e, y: 0.5, s: (1 / ch) * (S.move === 'slam' ? 1 + 0.5 * e : 1), a: (r[4] - 0.5) * 0.05 + (S.move === 'roll' ? 0.2 * e * dir : 0) };
          bg = { x: 0.5 + (r[0] - 0.5) * 0.1, y: 0.5, s: fill * 0.9 * pushIn, a: 0 };
          if (bgType === 0) bgType = 5;
        }
      }
      const H = ctx.H * this.scale;
      const lod = (s) => Math.max(0, Math.log2((this.coverPx * s) / H));
      return {
        cam: [bg.x, bg.y, bg.s, bg.a], sub: [sub.x, sub.y, sub.s, sub.a],
        sh: [bgType, subOn, T.rim || 0, T.dim == null ? 1 : T.dim],
        sh2: [T.tint || 0, (T.speed || 1) * (0.85 + r[5] * 0.4), (T.zoom || 0) * (0.85 + 0.3 * r[6]), 0],
        lod: lod(bg.s), lodSub: lod(sub.s), bgCam: bg, subCam: sub, subOn,
      };
    }
    // cover uv -> CSS px through a camera
    toScreen(u, v, cm) {
      const W = this.ctx.W, H = this.ctx.H;
      const dx = u - cm.x, dy = v - cm.y, c = Math.cos(cm.a), s = Math.sin(cm.a);
      return [((c * dx + s * dy) / cm.s) * H + W / 2, ((-s * dx + c * dy) / cm.s) * H + H / 2];
    }

    // ------------------------------------------------------------ title texture
    drawTitle(ch, cy) {
      const W = this.ctx.W, H = this.ctx.H, k = 0.5;
      const key = ch.text + '|' + Math.round(cy * 200) + '|' + W + 'x' + H;
      if (key === this.titleKey) return;
      this.titleKey = key;
      const c = this.cTitle;
      const cw = Math.max(2, Math.round(W * k)), chh = Math.max(2, Math.round(H * k));
      if (c.width !== cw || c.height !== chh) { c.width = cw; c.height = chh; }
      const x = c.getContext('2d');
      x.clearRect(0, 0, cw, chh);
      const font = (px) => `400 ${px}px 'Oley Heavy', Impact, sans-serif`;
      x.font = font(100);
      x.letterSpacing = '2px';
      const m = x.measureText(ch.text);
      let px = Math.min((cw * 0.9 * 100) / Math.max(1, m.width), chh * 0.42);
      x.font = font(px);
      x.letterSpacing = Math.round(px * 0.02) + 'px';
      const mm = x.measureText(ch.text);
      const asc = mm.actualBoundingBoxAscent, desc = mm.actualBoundingBoxDescent;
      const y = cy * chh + (asc - desc) / 2;
      x.textAlign = 'center';
      x.fillStyle = '#fff';
      x.fillText(ch.text, cw / 2, y);
      this.G.upload(this.tTitle, c);
      const hw = Math.min(0.5, mm.width / 2 / cw), hh = (asc + desc) / 2 / chh;
      this.tbox = [0.5, cy, hw, hh];
    }

    // ------------------------------------------------------------ fx layers (aura behind, arcs in front)
    drawFx(S, look, age, A) {
      const T = TYPES[S.type] || {};
      const aura = !!(T.aura || S.aura) && look.subOn, elec = !!(T.electric || S.electric) && look.subOn;
      this.fxBOn = aura;
      this.fxFOn = elec;
      if (!aura && !elec) return;
      const W = this.ctx.W, H = this.ctx.H, k = 0.5;
      const fw = Math.round(W * k), fh = Math.round(H * k);
      const info = this.info, cm = look.subCam, p = this.ctx.palette;
      const scr = (u, v) => { const q = this.toScreen(u, v, cm); return [q[0] * k, q[1] * k]; };
      const bb = info.bbox;
      const cen = scr(info.c[0], bb[1] + (bb[3] - bb[1]) * 0.36);
      const R = Math.min(fw, fh) * 0.62;
      const ec = U.mix(p.second, [140, 120, 255], 0.6);
      const glowCol = (a) => `rgba(${ec[0] | 0},${ec[1] | 0},${ec[2] | 0},${a})`;
      if (aura) {
        const c = this.cFxB;
        if (c.width !== fw || c.height !== fh) { c.width = fw; c.height = fh; }
        const x = c.getContext('2d');
        x.clearRect(0, 0, fw, fh);
        const grow = U.e('outCubic', age / 0.55), pulse = 1 + 0.06 * A.pulse;
        x.lineCap = 'round';
        x.lineJoin = 'round';
        for (let q = 0; q < 8; q++) {
          const side = q < 4 ? -1 : 1, j = q % 4;
          const a0 = -Math.PI / 2 + side * (0.38 + j * 0.37);
          const L1 = R * (0.4 + 0.05 * j) * grow * pulse, L2 = R * (0.52 + 0.1 * j) * grow * pulse;
          const p0 = [cen[0] + Math.cos(a0) * R * 0.08, cen[1] + Math.sin(a0) * R * 0.08];
          const p1 = [cen[0] + Math.cos(a0) * L1, cen[1] + Math.sin(a0) * L1];
          const a1 = a0 + side * (0.85 + 0.12 * j);
          const p2 = [p1[0] + Math.cos(a1) * L2, p1[1] + Math.sin(a1) * L2];
          const c1 = [(p0[0] + p1[0]) / 2 - Math.sin(a0) * side * R * 0.05, (p0[1] + p1[1]) / 2 + Math.cos(a0) * side * R * 0.05];
          const c2 = [(p1[0] + p2[0]) / 2 + Math.cos(a1 - side * 1.2) * R * 0.06, (p1[1] + p2[1]) / 2 + Math.sin(a1 - side * 1.2) * R * 0.06];
          // sample the leg as a tapered ribbon
          const bez = (a, c, b, tt) => [(1 - tt) * (1 - tt) * a[0] + 2 * (1 - tt) * tt * c[0] + tt * tt * b[0], (1 - tt) * (1 - tt) * a[1] + 2 * (1 - tt) * tt * c[1] + tt * tt * b[1]];
          const pts = [];
          for (let i = 0; i <= 14; i++) pts.push(bez(p0, c1, p1, i / 14));
          for (let i = 1; i <= 18; i++) pts.push(bez(p1, c2, p2, i / 18));
          const u = k * (H / 720);
          const ribbon = (wMax) => {
            const L = [], Rr = [];
            for (let i = 0; i < pts.length; i++) {
              const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
              let nx = -(b[1] - a[1]), ny = b[0] - a[0];
              const nl = Math.hypot(nx, ny) || 1;
              nx /= nl; ny /= nl;
              const f = i / (pts.length - 1);
              const w = wMax * (f < 0.45 ? 0.55 + f : 1 - (f - 0.45) / 0.55) * u;
              L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
              Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
            }
            const path = new Path2D();
            path.moveTo(L[0][0], L[0][1]);
            for (const pp of L) path.lineTo(pp[0], pp[1]);
            for (let i = Rr.length - 1; i >= 0; i--) path.lineTo(Rr[i][0], Rr[i][1]);
            path.closePath();
            return path;
          };
          x.fillStyle = glowCol(0.1); x.fill(ribbon(13));
          x.fillStyle = glowCol(0.28); x.fill(ribbon(6.5));
          x.fillStyle = 'rgba(214,230,255,0.9)'; x.fill(ribbon(3.2));
          x.fillStyle = 'rgba(255,255,255,1)'; x.fill(ribbon(1.3));
        }
        this.G.upload(this.tFxB, c);
      }
      if (elec) {
        const c = this.cFxF;
        if (c.width !== fw || c.height !== fh) { c.width = fw; c.height = fh; }
        if (this.tick % 2 === 0) {
          const x = c.getContext('2d');
          x.clearRect(0, 0, fw, fh);
          const r = U.rng((this.tick * 2654435761) >>> 0);
          const E = info.edge, n = E.length / 2;
          const cc = scr(info.c[0], info.c[1]);
          const strokes = (draw) => {
            const u = k * (H / 720);
            x.lineWidth = 16 * u; x.strokeStyle = glowCol(0.16); draw(); x.stroke();
            x.lineWidth = 6.5 * u; x.strokeStyle = glowCol(0.55); draw(); x.stroke();
            x.lineWidth = 2.4 * u; x.strokeStyle = 'rgba(235,245,255,1)'; draw(); x.stroke();
          };
          const bolts = 5 + Math.round(A.pulse * 6 + r() * 4);
          for (let b = 0; b < bolts && n; b++) {
            const i = (r() * n) | 0;
            const e = scr(E[i * 2], E[i * 2 + 1]);
            let dx = e[0] - cc[0], dy = e[1] - cc[1];
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl; dy /= dl;
            const ang = Math.atan2(dy, dx) + (r() - 0.5) * 0.9, len = R * (0.1 + r() * 0.3);
            const end = [e[0] + Math.cos(ang) * len, e[1] + Math.sin(ang) * len];
            const seed = r() * 1e9;
            strokes(() => { x.beginPath(); x.moveTo(e[0], e[1]); jag(x, e, end, 0.42, 5, U.rng(seed >>> 0)); });
            if (r() < 0.45) {
              const mid = [(e[0] + end[0]) / 2 + (r() - 0.5) * len * 0.2, (e[1] + end[1]) / 2 + (r() - 0.5) * len * 0.2];
              const ba = ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), bl = len * (0.35 + r() * 0.3);
              const bend = [mid[0] + Math.cos(ba) * bl, mid[1] + Math.sin(ba) * bl], s2 = r() * 1e9;
              strokes(() => { x.beginPath(); x.moveTo(mid[0], mid[1]); jag(x, mid, bend, 0.45, 4, U.rng(s2 >>> 0)); });
            }
          }
          // long strikes from above on the beat
          if (A.pulse > 0.55 || r() < 0.12) {
            const hx = scr(info.head[0], info.bbox[1]);
            const top = [hx[0] + (r() - 0.5) * fw * 0.5, -10];
            const seed = r() * 1e9;
            strokes(() => { x.beginPath(); x.moveTo(top[0], top[1]); jag(x, top, [hx[0] + (r() - 0.5) * 30 * k, hx[1]], 0.3, 6, U.rng(seed >>> 0)); });
          }
          // crackle hugging the outline
          for (let run = 0; run < 3 && n > 20; run++) {
            const i0 = (r() * n) | 0, len = 8 + ((r() * 10) | 0), seed = r() * 1e9;
            strokes(() => {
              const rr = U.rng(seed >>> 0);
              x.beginPath();
              for (let j = 0; j < len; j++) {
                const i = (i0 + j) % n, q = scr(E[i * 2], E[i * 2 + 1]);
                const jx = (rr() - 0.5) * 6 * k, jy = (rr() - 0.5) * 6 * k;
                if (j) x.lineTo(q[0] + jx, q[1] + jy); else x.moveTo(q[0] + jx, q[1] + jy);
              }
            });
          }
          this.G.upload(this.tFxF, c);
        }
      }
    }

    // ------------------------------------------------------------ caption
    caption(t) {
      const tl = this.ctx.tl, li = O.lineAt(tl, t), L = tl.lines[li];
      const show = this.ctx.opts.captions !== false && L && t < L.singEnd + 0.6 && t < L.end;
      if (li !== this.capLi) {
        this.capLi = li;
        this.cap.textContent = '';
        this.capSpans = [];
        if (L) for (const w of L.words) { const s = U.el('span', '', this.cap, w.raw + ' '); this.capSpans.push({ s, w, on: false }); }
      }
      for (const c of this.capSpans) { const on = c.w.t <= t + 0.02; if (on !== c.on) { c.on = on; c.s.classList.toggle('on', on); } }
      const op = show ? U.sat((t - L.t + 0.1) / 0.15) * (1 - U.sat((t - L.singEnd - 0.3) / 0.3)) : 0;
      if (Math.abs(op - (this.capOp || 0)) > 0.01) { this.capOp = op; this.cap.style.opacity = op.toFixed(2); }
    }

    // ------------------------------------------------------------ frame
    frame(t, dt, A) {
      this.caption(t);
      if (!this.ok) {
        const ch = this.titles && this.titleAt(t);
        if (this.fb) this.fb.textContent = ch ? ch.text : '';
        if (!this.titles || !this.titles.length) this.plan();
        return;
      }
      const G = this.G;
      if (G.lost) return;
      this.tick++;
      const ctx = this.ctx, W = ctx.W, H = ctx.H;
      this.scale = O.glScale(ctx, true);
      if (G.size(W * this.scale, H * this.scale)) {
        G.resizeTarget(this.rtScene, G.w, G.h);
        G.resizeTarget(this.rtFx, G.w, G.h);
      }
      if (!this.shots) this.plan();
      if (!this.info) this.setInfo(null);
      const si = this.shotAt(t), S = this.shots[si], prev = this.shots[si - 1], next = this.shots[si + 1];
      const age = Math.max(0, t - S.t0), prog = U.sat(age / Math.max(0.1, S.t1 - S.t0));
      let a = this.shotLook(S, age, prog), b = a, tr = [0, 0, 0, 0];
      if (S.type === 'split') {
        a = this.shotLook(Object.assign({}, S, { type: 'punch' }), age, prog);
        b = this.shotLook(Object.assign({}, S, { type: 'hero' }), age, prog);
        tr = [2, 1 - 0.5 * U.e('outCubic', age / 0.32) + 0.03 * Math.sin(age * 1.7), 0, 0];
      } else if (S.trans === 'slice' && prev && age < SLICE) {
        b = a;
        a = this.shotLook(prev, t - prev.t0, U.sat((t - prev.t0) / Math.max(0.1, prev.t1 - prev.t0)));
        tr = [1, U.e('inOutCubic', age / SLICE), 0.85 + S.r[4] * 0.5, 4 + Math.floor(S.r[5] * 3)];
      }
      // transitions and hits
      let flash = 0, bandA = 0;
      if (S.trans === 'flash') flash = age < 0.04 ? 1 : 0.9 * Math.exp(-(age - 0.04) * 15);
      if (S.trans === 'band' && age < 0.13) bandA = age < 0.08 ? 1 : 1 - (age - 0.08) / 0.05;
      let zoom = 0;
      if (S.trans === 'whip' && age < 0.15) zoom = 0.34 * (1 - age / 0.15);
      if (next && next.trans === 'whip' && next.t0 - t < 0.12) zoom = Math.max(zoom, 0.34 * (1 - (next.t0 - t) / 0.12));
      const ch = this.titleAt(t);
      const chAge = ch ? t - ch.t0 : 9;
      const hit = Math.exp(-chAge * 9);
      const kick = 0.032 * hit + 0.02 * A.pulse + 0.02 * Math.exp(-age * 12);
      const rgb = 0.0005 + 0.0032 * Math.exp(-age * 11) + 0.0024 * A.pulse + 0.0016 * hit;
      const amp = 0.004 * (A.pulse * 0.9 + Math.exp(-age * 7) * 0.7);
      const shift = [this.shake.at(t * 13, 0) * amp, this.shake.at(t * 11, 1) * amp];
      // subject position on screen (for the void glow, zoom centre and titles)
      const info = this.info, sc = a.subCam;
      const scr = this.toScreen(info.c[0], info.bbox[1] + (info.bbox[3] - info.bbox[1]) * 0.35, sc);
      const subP = [(scr[0] - W / 2) / H, (scr[1] - H / 2) / H];
      // title
      let titleOn = 0;
      if (ch) {
        let cy = 0.5;
        if (a.subOn && info.kind !== 'card') {
          const hs = this.toScreen(info.head[0], info.head[1], a.bgCam);
          cy = U.clamp(hs[1] / H + 0.13, 0.3, 0.62);
        } else if (!a.subOn) cy = 0.6;
        this.drawTitle(ch, cy);
        titleOn = 1;
      }
      const fadeIn = U.sat(chAge / 0.04), fadeOut = ch ? 1 - U.sat((t - (ch.t1 - 0.06)) / 0.06) : 0;
      this.drawFx(S, a, age, A);
      const p = ctx.palette;
      G.draw(this.pScene, {
        uCover: this.tCover, uBlurA: this.rtBlurA, uBlurB: this.rtBlurB, uMask: this.tMask, uTitle: this.tTitle, uFxB: this.tFxB, uFxF: this.tFxF,
        uCamA: a.cam, uSubA: a.sub, uShA: a.sh, uSh2A: a.sh2, uLodA: a.lod,
        uCamB: b.cam, uSubB: b.sub, uShB: b.sh, uSh2B: b.sh2, uLodB: b.lod, uLodSub: a.lodSub,
        uTr: tr, uTBox: this.tbox || [0.5, 0.5, 0.3, 0.1], uTFx: [fadeIn * fadeOut, 1 + 0.2 * Math.exp(-chAge * 12), 0.9 + 0.6 * A.pulse, 1],
        uBand: S.band || [0, 0, 0, 0], uBandA: bandA, uTime: t, uCard: info.kind === 'card' ? 1 : 0, uRimLod: this.rimLod || 1.5,
        uFxBOn: this.fxBOn ? 1 : 0, uFxFOn: this.fxFOn ? 1 : 0, uTitleOn: titleOn,
        uTint: O.lin(p.vivid), uTint2: O.lin(S.type === 'electric' ? U.mix(p.second, [140, 120, 255], 0.75) : U.mix(p.second, [110, 165, 255], 0.45)), uDark: O.lin(p.dark),
        uSubC: [info.c[0], info.c[1]], uSubP: subP,
      }, this.rtScene);
      G.mipmap(this.rtScene);
      // camera motion this frame -> per-pixel motion blur (affine: v = M p + b, in screen-height units)
      let mv = [0, 0, 0, 0], mvb = [0, 0];
      const sh = 1 / 60 * 0.9;
      if (age > sh && S.type !== 'split' && !(S.trans === 'slice' && age < SLICE)) {
        const c1 = a.bgCam, c0 = this.shotLook(S, age - sh, U.sat((age - sh) / Math.max(0.1, S.t1 - S.t0))).bgCam;
        const k = c1.s / c0.s, da = c1.a - c0.a, ca = Math.cos(da), sa = Math.sin(da);
        // p_prev = k R(da) p + R(-a0)(c1 - c0)/s0  ->  v = p - p_prev
        mv = [1 - k * ca, -k * sa, k * sa, 1 - k * ca];
        const dx = c1.x - c0.x, dy = c1.y - c0.y, c0c = Math.cos(c0.a), c0s = Math.sin(c0.a);
        mvb = [-(c0c * dx + c0s * dy) / c0.s, -(-c0s * dx + c0c * dy) / c0.s];
        const fps = 1 / Math.max(1 / 240, dt);
        const scale = U.clamp(fps / 60, 0.25, 1) * 1.1;
        mv = mv.map((x) => x * scale);
        mvb = mvb.map((x) => x * scale);
      }
      G.draw(this.pFx, {
        uScene: this.rtScene, uZoom: zoom, uZoomC: [scr[0] / W, 1 - scr[1] / H], uRGB: rgb, uSharp: 0.55, uKick: kick, uShift: shift, uMv: mv, uMvB: mvb,
      }, this.rtFx);
      this.post.run(this.rtFx, {
        time: t, bloom: 0.04, glow: 0.08, exposure: 1.0 + 0.07 * A.pulse, ca: 0.0012, vig: 0.42, grain: 0.05,
        sat: 1.14, contrast: 1.17, lift: [0.0, 0.006, 0.02], gain: [1.03, 1.0, 0.975], halation: 0.04, flash, clip: 0.82,
      });
    }
    destroy() { if (this.G) this.G.destroy(); }
  }

  O.registerMode('polyester', Polyester, { glow: false, gl: true, noIntro: true, label: 'Polyester' });
})();
