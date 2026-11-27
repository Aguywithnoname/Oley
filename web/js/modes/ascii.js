/* Oley · ASCII: the song drawn in characters, like code art. Every verse is a different scene, dealt
   from shuffled decks so nothing comes round twice:
   - a 3D design (ascii/cloud.js + d-*.js): 120 of them, flowers, space, cars, cities, oceans and
     scenery, picked from what the verse is about;
   - now and then the cover's cut-out as code for a few seconds at the start of a verse (a portrait
     that moves like cloth in wind, green rain, a binary scanner, prints spaced out in 3D, a donut or a
     cube), dissolving into the verse's design;
   - rarely, fireworks on the big words, a storm or fire.
   The lyric's emoji pop in as sprites, the key word rises huge behind, the line is set as a serif
   caption above, and scenes change by decoding cell by cell. Two passes: the scene is drawn at one
   pixel per character cell, then each cell is printed as a glyph from that scene's character set. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  // character sets, darkest to brightest
  const SETS = {
    ascii: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    donut: ' .,-~:;=!*#$@',
    code: ' .:-=+*<>{}[]/01ZX7#$%&@',
    binary: ' .:01',
    blocks: ' ░▒▓█',
  };
  const SET_ORDER = ['ascii', 'donut', 'code', 'binary', 'blocks'];
  const DENSITY = { fine: 112, normal: 86, chunky: 62 };
  // scene → [style of the cut-out (-1 none), environment (0 none), character set]
  const SCENE = {
    portrait: [0, 0, 'ascii'], rain: [1, 0, 'code'], scan: [2, 0, 'binary'], planes: [3, 0, 'ascii'], donut: [4, 0, 'donut'], cube: [5, 0, 'donut'],
    fireworks: [-1, 0, 'ascii'], fire: [-1, 2, 'blocks'], storm: [-1, 3, 'ascii'],
  };
  const P_SCENES = ['portrait', 'planes', 'rain', 'donut', 'scan', 'cube'];
  const E_SCENES = ['fireworks', 'storm', 'fire'];
  // what a verse is about → which kind of design it gets
  const TOPIC = {
    flowers: /\b(flowers?|roses?|bloom\w*|petals?|garden|spring|lil(y|ies)|daisy|daisies|blossom\w*|kiss\w*|hearts?|pretty|beautiful|love|lover|sweet|honey|perfume)\b/g,
    space: /\b(stars?|space|moon|galax\w*|planets?|universe|cosmic|orbit\w*|heaven\w*|rocket\w*|astronaut|gravity|comet|satellite|alien|mars|saturn|venus|infinity|eclipse|light ?years)\b/g,
    cars: /\b(cars?|drive|driving|drove|road|roads|highway|ride|riding|speed\w*|fast|race|racing|engine|wheels?|gas|miles|cruise|cruising|lane|freeway|backseat|shotgun|garage|crash\w*|headlights?)\b/g,
    cities: /\b(city|cities|town|streets?|downtown|buildings?|skyline|towers?|avenue|block|neon|subway|traffic|crowd\w*|bridge|rooftops?|club|party|lights|hotel|apartment|window)\b/g,
    oceans: /\b(sea|seas|ocean\w*|waves?|water|tide\w*|shore|beach\w*|sail\w*|boat|ship|swim\w*|drown\w*|deep|island|sand|coast|harbou?r|dive|diving|mermaid|salt)\b/g,
    scenery: /\b(mountains?|hills?|river\w*|forest|trees?|fields?|rain\w*|snow\w*|sun|sunset|sunrise|wind|valley|lake|desert|sky|skies|cloud\w*|storm|home|road trip|summer|winter|autumn|fall|nature|earth|world|far away)\b/g,
  };
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  O.css('ascii', `
.m-as { background: #050506; }
.m-as .as-cap { position: absolute; left: 7vw; right: 7vw; top: 4.2vh; text-align: center; font-family: 'Oley Serif', Georgia, serif; font-weight: 500;
  font-size: 4.4vmin; line-height: 1.14; color: #f4f0e8; letter-spacing: -0.005em; text-shadow: 0 0.3vmin 1.6vmin rgba(0,0,0,0.85); pointer-events: none; }
.m-as .as-cap .w { display: inline-block; opacity: 0; transform: translateY(0.35em); filter: blur(0.25em); transition: opacity .22s ease-out, transform .32s cubic-bezier(.2,.8,.2,1), filter .3s ease-out; white-space: pre; }
.m-as .as-cap .w.on { opacity: 1; transform: none; filter: none; }
.m-as .as-cap .w.k { font-style: italic; }
.m-as .as-cap.out { opacity: 0; transition: opacity .5s; }
.m-as .as-term { position: absolute; left: 2.6vw; bottom: 2.4vh; font: 500 1.3vmin 'Oley Mono', Consolas, monospace; color: rgba(150, 240, 160, 0.5); pointer-events: none; white-space: pre; }
.m-as .as-term i { display: inline-block; width: 0.62em; height: 1.05em; vertical-align: -0.15em; background: rgba(150, 240, 160, 0.7); animation: as-blink 1s steps(1) infinite; }
@keyframes as-blink { 50% { opacity: 0; } }
.m-as .as-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #ddd; font: 500 2vmin var(--sans, sans-serif); text-align: center; padding: 4vmin; }
`);

  // ---------------------------------------------------------------- pass one: the scene, one pixel per character cell
  const FS_SCENE = `
uniform sampler2D uBack, uFront, uCover, uFull, uCloud;
uniform float uCloudOn;
uniform float uTime, uPulse, uLevel, uCoverW, uFlow, uKeep, uLod, uLodF, uSoft, uSeed, uStyle, uEnv, uEnvW, uFlash, uAsp;
uniform vec4 uBox;
uniform vec3 uGrey, uAcc;
out vec4 o;
vec4 over(vec4 a, vec4 b) { return b + a * (1. - b.a); }
float satOf(vec3 c) { float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); return mx > .001 ? (mx - mn) / mx : 0.; }
// grey it all, except where the colour is strong; lifted so dark parts still print
vec3 tone(vec3 rgb) {
  float l = luma(rgb), s = satOf(rgb);
  vec3 g = vec3(.13 + .87 * smoothstep(.03, .9, l)) * uGrey;
  return mix(g, max(rgb * 1.08, vec3(.1)), mix(1., smoothstep(.3, .55, s), uKeep));
}
vec2 boxQ(vec2 uv) { return (uv - uBox.xy) / (uBox.zw * 2.) + .5; }
vec4 cutAt(vec2 q) {
  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) return vec4(0.);
  vec4 c = textureLod(uCover, q, uLod);
  if (uSoft > 0.) { vec2 d = (q - .5) * vec2(1., 1.08); c *= smoothstep(.5, .5 - uSoft, length(d) + fbm2(q * 6. + 3., 2) * .06); }
  return c;
}
// the classic portrait: strong colour moves like cloth in wind
vec4 portrait(vec2 uv) {
  vec2 q = boxQ(uv);
  if (q.x < -.05 || q.x > 1.05 || q.y < -.05 || q.y > 1.05) return vec4(0.);
  vec4 c0 = textureLod(uCover, clamp(q, 0., 1.), uLod);
  float s0 = c0.a > .01 ? satOf(c0.rgb / c0.a) : 0.;
  float k = uFlow * (.18 + 1.5 * smoothstep(.22, .6, s0) * uKeep);
  vec2 w = vec2(fbm2(q * 3.1 + vec2(uTime * .42, uTime * .1), 3), fbm2(q * 3.1 + vec2(5.2, -uTime * .37), 3)) - .5;
  vec2 q2 = q + w * k * vec2(.045, .025) + vec2(sin(q.y * 13. - uTime * 2.6 + q.x * 5.), .4 * cos(q.x * 9. - uTime * 2.1)) * k * .007;
  vec4 c = cutAt(clamp(q2, 0., 1.));
  if (c.a < .003) return vec4(0.);
  return vec4(tone(c.rgb / c.a) * c.a, c.a);
}
// code rain falling through the figure, brighter where it is
vec4 rain(vec2 uv) {
  vec4 c = cutAt(boxQ(uv));
  float col = floor(uv.x * uRes.x);
  float h = hash12(vec2(col, 3.1 + uSeed)), h2 = hash12(vec2(col, 7.7));
  float y = 1. - uv.y;
  float head = fract(h * 7.3 + uTime * (.18 + h2 * .32));
  float dist = fract(head - y);
  float tr = exp(-dist * 6.) * step(dist, .75);
  float head2 = fract(h2 * 3.1 + uTime * (.11 + h * .2));
  tr = max(tr, .6 * exp(-fract(head2 - y) * 9.));
  float a = c.a, l = a > .01 ? luma(c.rgb / a) : 0.;
  float b = tr * (.16 + 1.1 * a * (.35 + .65 * l)) + a * (.12 + .25 * l);
  vec3 g = mix(vec3(.25, 1., .45), vec3(.9, 1., .92), smoothstep(.92, 1., tr));
  g = mix(g, uAcc, .25 * a);
  return vec4(g * b, max(a, min(1., b * 1.5)));
}
// a binary scanner sweeping the figure
vec4 scan(vec2 uv) {
  float band = fract(uTime * .18) * 1.3 - .15, d = uv.y - band;
  float slip = (hash12(vec2(floor(uv.y * 70.), floor(uTime * 18.))) - .5) * .05 * exp(-abs(d) * 25.);
  vec4 c = cutAt(boxQ(uv + vec2(slip, 0.)));
  if (c.a < .01) return vec4(0.);
  vec3 rgb = tone(c.rgb / c.a);
  float glow = exp(-abs(d) * 45.), past = smoothstep(.0, .15, -d);
  rgb = mix(rgb * (.62 + .38 * past), uAcc * 1.5, glow);
  return vec4(rgb * c.a, c.a);
}
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
// the figure exploded into prints spaced out in depth, turning
vec4 planes(vec2 uv) {
  vec2 p = (uv - .5) * vec2(uAsp, 1.);
  float th = sin(uTime * .33) * .7, ph = sin(uTime * .21) * .12;
  vec3 ro = rotX(rotY(vec3(0., .02, 2.5), th), ph), rd = rotX(rotY(normalize(vec3(p, -1.75)), th), ph);
  vec4 acc = vec4(0.);
  float S = uBox.w * 2. * 1.25;
  for (int i = 0; i < 5; i++) {
    float z = .62 - float(i) * .31;
    float t = (z - ro.z) / rd.z;
    if (t <= 0.) continue;
    vec3 hp = ro + rd * t;
    vec2 q = vec2(hp.x, hp.y + .08) / S + .5;
    vec4 c = cutAt(q);
    if (c.a < .01) continue;
    vec3 rgb = c.rgb / c.a;
    float k = float(i) / 4.;
    vec3 col = i == 0 ? tone(rgb) : mix(uAcc, uGrey * .7, k) * (.35 + .75 * luma(rgb)) * (1. - .12 * float(i));
    if (i == 2) col = mix(col, vec3(.3, 1., .5) * luma(rgb), .6);
    acc = acc + vec4(col * c.a, c.a) * (1. - acc.a);
  }
  return acc;
}
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - .02; }
vec3 spin(vec3 p) { return rotX(rotY(p, uTime * .55), uTime * .37 + .6); }
float shape(vec3 p, bool cube) { p = spin(p); return cube ? sdBox(p, vec3(.3)) : sdTorus(p, vec2(.36, .16)); }
// the cover wrapped on a spinning donut, or a spinning cube
vec4 solid(vec2 uv, bool cube) {
  vec2 p = (uv - vec2(.5, .44)) * vec2(uAsp, 1.);
  vec3 ro = vec3(0., 0., 2.), rd = normalize(vec3(p, -1.55));
  float t = 0.;
  for (int i = 0; i < 56; i++) { float d = shape(ro + rd * t, cube); if (d < .002) break; t += d; if (t > 4.) return vec4(0.); }
  vec3 h = ro + rd * t;
  vec2 e = vec2(.002, 0.);
  vec3 n = normalize(vec3(shape(h + e.xyy, cube) - shape(h - e.xyy, cube), shape(h + e.yxy, cube) - shape(h - e.yxy, cube), shape(h + e.yyx, cube) - shape(h - e.yyx, cube)));
  float li = .1 + .9 * max(0., dot(n, normalize(vec3(-.4, .7, .6)))) + .25 * pow(max(0., dot(reflect(rd, n), normalize(vec3(-.4, .7, .6)))), 12.);
  vec3 lp = spin(h);
  vec2 tq;
  if (cube) { vec3 a = abs(lp); tq = a.x > a.y && a.x > a.z ? lp.zy : a.y > a.z ? lp.xz : lp.xy; tq = tq / .6 + .5; }
  else { tq = vec2(atan(lp.z, lp.x) / 6.2831853 + .5, atan(lp.y, length(lp.xz) - .36) / 6.2831853 + .5); tq.x = fract(tq.x * 2.); }
  vec3 tex = textureLod(uFull, tq, uLodF).rgb;
  return vec4(tone(tex) * li * 1.15, 1.);
}
// ---------------------------------------------------------------- places
vec3 space(vec2 uv) {
  vec2 p = (uv - .5) * vec2(uAsp, 1.);
  float n = fbm2(p * 1.5 + vec2(uTime * .015, 3.), 4);
  vec3 c = vec3(.22, .08, .36) * smoothstep(.42, .9, n) * .7 + uAcc * .18 * smoothstep(.6, .95, n);
  for (int L = 0; L < 3; L++) {
    float s = fract(uTime * .05 + float(L) / 3.);
    vec2 q = p * mix(22., 3., s) + float(L) * 17.;
    vec2 id = floor(q), f = fract(q) - .5;
    float h = hash12(id + float(L));
    vec2 off = vec2(hash12(id * 1.3), hash12(id * 2.1)) - .5;
    float b = smoothstep(.18, 0., length(f - off * .6)) * step(.72, h) * sin(s * 3.14159);
    c += vec3(.9, .92, 1.) * b * 1.3;
  }
  // a ringed planet
  vec2 pc = p - vec2(.34 * uAsp * .55, .12);
  float r = length(pc), R = .19;
  if (r < R) { vec3 nn = normalize(vec3(pc, sqrt(R * R - r * r))); float li = max(0., dot(nn, normalize(vec3(-.6, .5, .6)))); float bands = .5 + .5 * sin(pc.y * 70. + fbm2(pc * 8., 2) * 4.); c = mix(uAcc * .9, vec3(1., .85, .6), bands * .5) * (.08 + li); }
  vec2 rp = vec2(pc.x * cos(.35) + pc.y * sin(.35), -pc.x * sin(.35) + pc.y * cos(.35));
  float rr = length(rp * vec2(1., 3.6));
  if (rr > .25 && rr < .36 && !(r < R && rp.y > 0.)) c += vec3(.9, .8, .6) * (.5 + .5 * sin(rr * 120.)) * .8;
  return c;
}
vec3 fire(vec2 uv) {
  float y = uv.y;
  float n = fbm2(vec2(uv.x * 7. * uAsp * .6, y * 4. - uTime * 2.6), 4);
  float n2 = fbm2(vec2(uv.x * 14. + 3., y * 8. - uTime * 4.), 3);
  float hgt = .55 + .25 * (uLevel + uPulse * .6);
  float f = clamp((1. - y / hgt) * (n * 1.35 + n2 * .35) * 1.6 - .35, 0., 1.4);
  return vec3(1.6 * f, 1.25 * f * f, .9 * f * f * f * f) * .9;
}
vec3 storm(vec2 uv) {
  float colx = floor(uv.x * uRes.x * .5);
  float y = 1. - uv.y;
  float h = hash12(vec2(colx, 1.7));
  float dr = fract(h * 5.3 + uTime * (1.4 + h) + uv.x * .6);
  float drop = step(fract(y * 3. + dr * 3.), .07) * step(.35, h);
  vec3 c = vec3(.45, .55, .7) * drop * .6;
  float cl = fbm2(vec2(uv.x * 2.5 + uTime * .03, uv.y * 3.), 5);
  c += vec3(.5, .55, .65) * smoothstep(.45, .8, cl) * smoothstep(.45, 1., uv.y) * (.35 + uFlash * 2.2);
  c += vec3(.8, .85, 1.) * uFlash * .25;
  return c;
}
vec3 ocean(vec2 uv) {
  vec2 p = (uv - .5) * vec2(uAsp, 1.);
  float hz = -.06;
  vec3 c = vec3(0.);
  vec2 mp = vec2(.3 * uAsp * .6, .26);
  float md = length(p - mp);
  c += vec3(.95, .92, .8) * smoothstep(.1, .095, md) + vec3(.5, .5, .6) * .4 * exp(-md * 7.);
  if (p.y < hz) {
    float dy = hz - p.y;
    float w = sin(p.x * 18. / (dy + .05) + uTime * 1.4 + fbm2(p * 6. + uTime * .2, 2) * 3.) * .5 + .5;
    float line = pow(w, 10.) * (.25 + .75 * smoothstep(.0, .3, dy));
    float refl = exp(-abs(p.x - mp.x) * (9. + dy * 20.)) * (.35 + .65 * step(.6, hash12(floor(p * vec2(60., 90.)) + floor(uTime * 6.))));
    c = vec3(.2, .35, .6) * line * .8 + vec3(.95, .9, .75) * refl * .9 + vec3(.04, .07, .14);
  }
  return c;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float hc = hash12(floor(gl_FragCoord.xy) * 1.7 + uSeed);
  vec4 col = vec4(0.);
  // the 3D design, rendered at 3x3 pixels per cell: mostly the average, a little of the brightest so fine lines survive
  if (uCloudOn > .5) {
    ivec2 c0 = ivec2(gl_FragCoord.xy) * 3;
    vec3 sm = vec3(0.), mx = vec3(0.);
    for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) { vec3 v = texelFetch(uCloud, c0 + ivec2(i, j), 0).rgb; sm += v; mx = max(mx, v); }
    col = vec4(sm / 9. * .62 + mx * .38, 1.);
  }
  if (uEnv > .5) {
    vec3 e = uEnv < 1.5 ? space(uv) : uEnv < 2.5 ? fire(uv) : uEnv < 3.5 ? storm(uv) : ocean(uv);
    col = vec4(e * uEnvW, 1.);
  }
  col = over(col, textureLod(uBack, uv, 0.));
  vec4 cv = vec4(0.);
  if (uCoverW > .001 && uStyle > -.5) {
    cv = uStyle < .5 ? portrait(uv) : uStyle < 1.5 ? rain(uv) : uStyle < 2.5 ? scan(uv) : uStyle < 3.5 ? planes(uv) : solid(uv, uStyle > 4.5);
    col = over(col, cv * step(hc, uCoverW));
  }
  col = over(col, textureLod(uFront, uv, 0.));
  // alpha carries how much of the cut-out is here, for the decoding front
  o = vec4(col.rgb, cv.a);
}`;

  // ---------------------------------------------------------------- pass two: print each cell as a glyph
  const FS_GLYPH = `
uniform sampler2D uAtlas, uCells;
uniform vec2 uCell;
uniform float uOff, uN, uBin, uTime, uPulse, uCoverW, uScr, uSeed;
out vec4 o;
void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 cell = floor(px / uCell);
  vec2 loc = px - cell * uCell;
  vec4 s = texelFetch(uCells, ivec2(cell), 0);
  vec3 c = s.rgb;
  float lum = luma(c) * (1. + uPulse * .14);
  float hc = hash12(cell * 1.7 + uSeed);
  float idx = 0.;
  if (lum > .018) {
    idx = clamp(floor(pow(lum, .82) * (uN - 1.) + (hash12(cell) - .5) * .9), 1., uN - 1.);
    // ones and zeros: the brightness picks dot, colon or digit, the digit itself flickers
    if (uBin > .5 && idx >= 3.) idx = 3. + step(.5, hash12(cell + floor(uTime * 6. + hash12(cell * 3.) * 6.)));
  }
  if (lum < .02) { float h = hash12(cell * 1.31 + 7.); if (h > .9965) { idx = 1.; c = vec3(.32 + .2 * sin(uTime * 1.7 + h * 300.)); } }
  float fr = floor(uTime * 20.);
  bool front = uCoverW > .001 && uCoverW < .999 && s.a > .05 && abs(hc - uCoverW) < .08;
  bool scr = front || (lum > .02 && hash12(cell * .9 + fr) < uScr);
  if (scr) idx = 1. + floor(hash12(cell + fr * 1.37) * (uN - 1.));
  float m = idx < .5 ? 0. : texelFetch(uAtlas, ivec2(int(uOff + idx) * int(uCell.x) + int(loc.x), int(loc.y)), 0).r;
  vec3 gc = clamp(c * 1.85, 0., 1.6);
  o = vec4(toLin(gc) * m, 1.);
}`;

  class Ascii {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-as');
      this.ok = O.glSupported();
      this.secs = [];
      if (!this.ok) { this.fallback(); return; }
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; U.remove(G.canvas); this.fallback(); return; }
      this.pScene = G.program(FS_SCENE);
      try { this.cloud = O.Cloud ? new O.Cloud.Renderer(G) : null; } catch (e) { console.error('Oley ascii 3D', e); this.cloud = null; }
      this.pGlyph = G.program(FS_GLYPH);
      this.post = new O.Post(G);
      this.rt = G.target(4, 4);
      this.rtC = G.target(4, 4);
      this.back = document.createElement('canvas');
      this.front = document.createElement('canvas');
      this.bx = this.back.getContext('2d');
      this.fx = this.front.getContext('2d');
      this.backT = G.texture(null, { mips: false });
      this.frontT = G.texture(null, { mips: false });
      this.coverT = null;
      this.fullT = null;
      this.cut = false;
      this.cap = U.el('div', 'as-cap', ctx.root);
      this.term = U.el('div', 'as-term', ctx.root);
      this.capKey = '';
      this.fontsOk = false;
      Promise.all(['400 80px "Oley Heavy"', '500 80px "Oley Mono"', 'italic 500 80px "Oley Serif"', '500 80px "Oley Serif"'].map((f) => document.fonts.load(f).catch(() => null)))
        .then(() => { this.fontsOk = true; this.atlasKey = ''; });
      setTimeout(() => { this.fontsOk = true; }, 2500);
    }
    fallback() {
      U.el('div', 'as-msg', this.ctx.root, 'ASCII needs WebGL2 (graphics acceleration). Pick another mode, or turn hardware acceleration on.');
    }
    // where Oley's own server lives, for the emoji
    serverBase() {
      if (/^https?:$/.test(location.protocol)) return location.origin;
      const a = this.ctx.stage && this.ctx.stage.artUrl;
      const m = a && /^(https?:\/\/(?:127\.0\.0\.1|localhost):\d+)\//.exec(a);
      return m ? m[1] : '';
    }

    // ---------------------------------------------------------------- the cover, cut out where it can be
    onArt(url, img) {
      const link = this.ctx.stage.link;
      if (link && img) link.send({ type: 'want', what: 'mask' });
      this.img = img || null;
      this.makeCover();
    }
    onMask() { this.makeCover(); }
    makeCover() {
      if (!this.ok) return;
      const img = this.img;
      if (!img) { this.cut = false; this.coverT = null; this.fullT = null; this.plan(); return; }
      const S = 512, full = document.createElement('canvas');
      full.width = full.height = S;
      full.getContext('2d').drawImage(img, 0, 0, S, S);
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, S, S);
      let mask = null;
      try {
        const info = this.ctx.maskImg ? O.Subject.fromMask(this.ctx.maskImg, img) : O.Subject.guess(img);
        mask = info && info.canvas ? info.canvas : null;
      } catch (e) { mask = null; }
      this.cut = !!mask;
      if (mask) { x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0, S, S); x.globalCompositeOperation = 'source-over'; }
      if (!this.coverT) { this.coverT = this.G.texture(c, { mips: true }); this.fullT = this.G.texture(full, { mips: true, wrap: 'repeat' }); }
      else { this.G.upload(this.coverT, c); this.G.upload(this.fullT, full); }
      this.plan();
    }
    onTrack(tr) { this.track = tr || null; this.plan(); }
    onLyrics() { this.plan(); }
    onResize() { this.atlasKey = ''; }
    onSettings() {
      const o = this.ctx.opts, k = [o.flowers, o.density, o.accent].join('|');
      if (this.optKey != null && k !== this.optKey) { this.atlasKey = ''; this.plan(); }
    }

    // ---------------------------------------------------------------- the song in sections, a scene each
    plan() {
      if (!this.ok) return;
      const ctx = this.ctx, tl = ctx.tl, o = ctx.opts;
      this.optKey = [o.flowers, o.density, o.accent].join('|');
      const R = O.asciiRng(U.hash((this.track && (this.track.id || this.track.title)) || 'x') ^ (O.params && +O.params.get('asseed') || 0));
      this.R = R;
      const lines = ((tl && tl.lines) || []).filter((L) => L.words && L.words.length);
      const end = (L) => Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.4);
      const secs = [];
      let cur = null;
      lines.forEach((L, i) => {
        const pv = lines[i - 1];
        if (!cur || L.t - end(pv) > 3.2 || cur.lines.length >= 6) { cur = { t0: L.t - 0.35, lines: [] }; secs.push(cur); }
        cur.lines.push(L);
      });
      const dur = (tl && tl.duration) || 0;
      if (!secs.length || secs[0].t0 > 8) secs.unshift({ t0: 0, lines: [], intro: true });
      else secs[0].intro = secs[0].t0 > 1.5;
      secs[0].t0 = 0;
      for (let i = 0; i < secs.length; i++) secs[i].t1 = secs[i + 1] ? secs[i + 1].t0 : Math.max(dur, (secs[i].lines.length ? end(secs[i].lines[secs[i].lines.length - 1]) : 0) + 20);
      // deal the scenes. Every verse gets a place (a 3D design, rarely fireworks / storm / fire); now and then
      // a verse opens with the cover's cut-out for a few seconds, which then dissolves into the verse's place.
      const art = !!this.coverT, places = o.flowers !== false || !art;
      const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const deck = (list, firstPick) => { let q = [], first = firstPick; return () => { if (!list.length) return null; if (!q.length) { q = shuffle(list); if (first) { q.splice(q.indexOf(first), 1); q.unshift(first); first = null; } } return q.shift(); }; };
      const nextP = deck(P_SCENES, 'portrait'), nextE = deck(E_SCENES, null);
      const CL = O.Cloud, cats = CL ? CL.cats.filter((c) => (CL.designs[c] || []).length) : [];
      const decks = {};
      for (const c of cats) decks[c] = deck(CL.designs[c], null);
      let catQ = [];
      const nextCat = () => { if (!catQ.length) catQ = shuffle(cats); return catQ.shift(); };
      const prm = O.params || new URLSearchParams();
      const force = prm.get('asscene'), forceD = CL && prm.get('ascloud') ? CL.find(prm.get('ascloud')) : null, forceC = prm.get('ascat'), noCover = prm.get('asnocover') === '1';
      let lastCover = -9, lastCat = '';
      secs.forEach((s, si) => {
        // the cover: the first verse, then about one verse in three (never two in a row)
        let cover = null;
        if (art && !noCover && (!places || si === 0 || (si - lastCover >= 3 && R.ch(0.75)) || (si - lastCover >= 2 && R.ch(0.25)))) { cover = nextP(); lastCover = si; }
        if (force && SCENE[force] && SCENE[force][0] >= 0 && art) cover = force;
        // the place
        let place = null;
        if (places || !cover) {
          if (force && SCENE[force] && SCENE[force][0] < 0) place = { kind: force };
          else if (!cats.length || (R.ch(0.12) && !cover && si > 0)) place = { kind: nextE() };
          else {
            const txt = s.lines.map((L) => L.text || '').join(' ').toLowerCase();
            let best = null, bs = 0;
            for (const c of cats) { const m = txt.match(TOPIC[c]); const sc = (m ? m.length : 0) + (c === lastCat ? -0.6 : 0) + R() * 0.3; if (m && sc > bs) { bs = sc; best = c; } }
            const cat = forceC && decks[forceC] ? forceC : best || nextCat();
            lastCat = cat;
            const d = forceD || decks[cat]();
            place = d ? { kind: 'cloud', d, seed: (R() * 4294967296) >>> 0 } : { kind: nextE() };
          }
        }
        s.cover = cover;
        s.place = place;
        const dur = s.t1 - s.t0;
        s.coverHold = place ? U.clamp(dur * 0.35, 3, s.intro ? 4.5 : 6) : 1e9;
        s.scene = place ? (place.kind === 'cloud' ? place.d.cat + '/' + place.d.name : place.kind) : cover;
        // the words things happen on: each line's key word, and its last
        const keys = [];
        for (const L of s.lines) {
          const ks = L.words.filter((w) => w.key);
          keys.push((ks[0] || L.words[Math.floor(L.words.length / 2)]).t);
          if (R.ch(0.5)) keys.push(L.words[L.words.length - 1].t);
        }
        if (!keys.length) for (let k = 0; k < 8; k++) keys.push(s.t0 + 2.5 + k * 1.6);
        const vivid = ctx.palette && ctx.palette.vivid;
        if (place && place.kind === 'fireworks') s.obj = new O.Fireworks({ seed: (R() * 4294967296) >>> 0, times: keys, col: vivid });
        s.flashes = place && place.kind === 'storm' ? keys.filter(() => R.ch(0.55)) : [];
      });
      this.secs = secs;
      // the key word, huge, behind
      this.hits = [];
      for (const L of lines) {
        if (!R.ch(0.6)) continue;
        const ks = L.words.filter((w) => w.key && String(w.raw).replace(/[^\p{L}\p{N}]/gu, '').length >= 3);
        const w = ks.length ? ks[0] : L.words.reduce((a, b) => (String(b.raw).length > String(a.raw).length ? b : a));
        const s = String(w.raw).replace(/^[("'“]+|[)"'”,.!?;:]+$/g, '').toUpperCase();
        if (s.length < 2 || s.length > 12) continue;
        // in front (lower, smaller) when the cover could be up: it never hides behind the cut-out
        const S2 = secs[this.secAtIn(secs, w.t)];
        const front = !!(S2 && S2.cover && w.t < S2.t0 + S2.coverHold + 1.2);
        this.hits.push({ t: w.t, t1: end(L) + 0.6, s, front });
      }
      // the lyric's emoji, popping in as sprites
      const PU = O.PU, spr = [];
      if (PU && PU.emojiAt && PU.Emoji) {
        PU.Emoji.setBase(this.serverBase());
        let lastE = '';
        for (const L of lines) {
          let best = null;
          L.words.forEach((w, i) => {
            const e = PU.emojiAt(L.words, i);
            if (!e) return;
            const bare = String(w.raw || '').toLowerCase().replace(/[^a-z]/g, '');
            const sc = (/^(line|up|broken|blue|ring|high)$/.test(bare) ? 3 : 0) + (bare.length > 4 ? 1 : 0) + (w.key ? 1 : 0);
            if (!best || sc > best.sc) best = { e, w, sc };
          });
          if (!best || best.e === lastE || !R.ch(best.sc >= 3 ? 1 : 0.7)) continue;
          lastE = best.e;
          PU.Emoji.want(best.e);
          // never on top of the big key word: if one is up while this sprite is, it pops in above the word instead
          const st = best.w.t - 0.05, clash = this.hits.some((h) => !h.front && h.t - 0.05 < st + 2.6 && h.t1 + 0.4 > st);
          spr.push({ e: best.e, t: st, life: 2.6, x: R.pick([R.r(0.1, 0.3), R.r(0.7, 0.9)]), y: clash ? R.r(0.21, 0.26) : R.r(0.32, 0.62), size: clash ? R.r(0.17, 0.21) : R.r(0.2, 0.3), rot: R.r(-0.3, 0.3), ph: R.r(0, 6) });
        }
      }
      this.sprites = new O.Sprites(spr);
      this.seed = R() * 100;
    }
    secAt(t) { return this.secAtIn(this.secs, t); }
    secAtIn(S, t) {
      let i = 0;
      while (i < S.length - 1 && S[i + 1].t0 <= t) i++;
      return i;
    }

    // ---------------------------------------------------------------- glyphs, every set in one strip
    atlas(cw, ch) {
      const key = cw + 'x' + ch + (this.fontsOk ? 'f' : '');
      if (key === this.atlasKey) return;
      this.atlasKey = key;
      const font = `500 ${Math.round(ch * 0.98)}px 'Oley Mono', Consolas, monospace`;
      // put every ramp in true order of ink for this font and size: a glyph lighter than the one before it
      // (like '_' after '+') prints a dark contour line across every smooth gradient
      const mc = document.createElement('canvas'); mc.width = cw; mc.height = ch;
      const mx = mc.getContext('2d', { willReadFrequently: true });
      mx.font = font; mx.textBaseline = 'alphabetic'; mx.textAlign = 'center'; mx.fillStyle = '#fff';
      const ink = (g) => { mx.clearRect(0, 0, cw, ch); mx.fillText(g, cw / 2, Math.round(ch * 0.8)); const d = mx.getImageData(0, 0, cw, ch).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s; };
      const ramp = (k) => {
        const str = SETS[k];
        if (k === 'binary' || k === 'blocks') return str;
        const rest = [...str.slice(1)].map((g, i) => ({ g, i, v: ink(g) }));
        rest.sort((a, b) => a.v - b.v || a.i - b.i);
        return str[0] + rest.map((r) => r.g).join('');
      };
      const all = SET_ORDER.map(ramp).join('');
      this.offs = {};
      let off = 0;
      for (const k of SET_ORDER) { this.offs[k] = off; off += SETS[k].length; }
      const c = document.createElement('canvas');
      c.width = cw * all.length; c.height = ch;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#fff'; x.textBaseline = 'alphabetic'; x.textAlign = 'center';
      x.font = font;
      for (let i = 0; i < all.length; i++) {
        const g = all[i], X = i * cw;
        // shade blocks are drawn by hand (the bundled mono font doesn't have them)
        const lvl = '░▒▓█'.indexOf(g);
        if (lvl >= 0) {
          if (lvl === 3) { x.fillRect(X, 0, cw, ch); continue; }
          const dens = [0.25, 0.5, 0.75][lvl];
          for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
            const on = lvl === 1 ? (xx + yy) % 2 === 0 : lvl === 0 ? xx % 2 === 0 && yy % 2 === 0 : !(xx % 2 === 1 && yy % 2 === 1);
            if (on && dens) x.fillRect(X + xx, yy, 1, 1);
          }
          continue;
        }
        x.fillText(g, X + cw / 2, Math.round(ch * 0.8));
      }
      if (this.atlasT) this.G.upload(this.atlasT, c);
      else this.atlasT = this.G.texture(c, { mips: false, nearest: true });
    }

    // ---------------------------------------------------------------- per frame
    frame(t, dt, A) {
      if (!this.ok) return;
      const ctx = this.ctx, G = this.G, o = ctx.opts;
      const s = O.glScale(ctx, false);
      if (G.size(ctx.W * s, ctx.H * s)) G.resizeTarget(this.rt, G.w, G.h);
      const rowsT = DENSITY[o.density] || DENSITY.fine;
      const ch = U.clamp(Math.round(G.h / rowsT), 6, 28), cw = Math.max(4, Math.round(ch * 0.6));
      this.atlas(cw, ch);
      const cols = Math.ceil(G.w / cw), rows = Math.ceil(G.h / ch);
      G.resizeTarget(this.rtC, cols, rows);
      const LH = Math.max(80, rows * 2), LW = Math.round((LH * G.w) / G.h);
      for (const c of [this.back, this.front]) if (c.width !== LW || c.height !== LH) { c.width = LW; c.height = LH; }
      const bx = this.bx, fx = this.fx;
      bx.clearRect(0, 0, LW, LH); fx.clearRect(0, 0, LW, LH);
      const pulse = A ? A.pulse : 0, level = A ? A.level : 0;
      let coverW = 0, scr = 0, style = -1, env = 0, envW = 0, set = 'ascii', flash = 0, sec = null, cloudRT = null;
      if (this.secs.length) {
        const i = this.secAt(t), pv = this.secs[i - 1], nx = this.secs[i + 1];
        sec = this.secs[i];
        const age = t - sec.t0, pl = sec.place;
        const cov = sec.cover ? SCENE[sec.cover] : null;
        style = cov ? cov[0] : -1;
        const hasCut = style >= 0 && this.coverT;
        // the cut-out decodes in cell by cell, stays a few seconds, then decodes away into the place
        coverW = hasCut ? ss(0, 0.9, age) * (1 - ss(sec.coverHold, sec.coverHold + 0.9, age)) : 0;
        const coverUp = hasCut && age < sec.coverHold + 0.6;
        const pset = pl ? (pl.kind === 'cloud' ? pl.d.meta.set || 'ascii' : SCENE[pl.kind][2]) : 'ascii';
        set = coverUp && cov ? cov[2] : pset;
        if (pl && pl.kind !== 'cloud') env = SCENE[pl.kind][1];
        envW = env ? ss(0, 1.2, age) : 0;
        const wind = Math.sin(t * 0.23) * 0.5 + Math.sin(t * 0.61) * 0.3;
        // a burst of decoding on every change of scene, and when the cover hands over to the place
        for (const S of [sec, nx]) if (S) { const q = t - S.t0; if (q > -0.3 && q < 0.45) scr = Math.max(scr, 0.55 * (q < 0 ? 1 + q / 0.3 : 1 - q / 0.45)); }
        if (hasCut && pl) { const q = age - (sec.coverHold + 0.6); if (q > -0.25 && q < 0.4) scr = Math.max(scr, 0.4 * (q < 0 ? 1 + q / 0.25 : 1 - q / 0.4)); }
        // the 3D design: fades up as the verse starts, down just before the next
        if (pl && pl.kind === 'cloud' && this.cloud) {
          try {
            const e = this.cloud.get(pl.d, pl.seed);
            if (e) {
              // fades up once it's built and the verse has started, down just before the next
              if (sec.readyAt == null || t < sec.readyAt) sec.readyAt = t;
              this.cloud.size(cols * 3, rows * 3);
              const fade = ss(0, 1.1, t - Math.max(sec.t0, sec.readyAt - 0.001)) * (1 - ss(-0.4, 0, t - sec.t1));
              cloudRT = this.cloud.draw(e, age + 4, A, fade, G.w / G.h);
            }
          } catch (err) { cloudRT = null; console.error('Oley ascii design', err); }
          // build the next verse's design ahead of time, well before it's needed
          if (nx && nx.place && nx.place.kind === 'cloud' && sec.t1 - t < 7 && !nx.built) { nx.built = true; try { this.cloud.get(nx.place.d, nx.place.seed); } catch (err) { /* drawn as nothing */ } }
        }
        // fireworks from the last verse fade while this one starts
        if (pv && pv.obj && t < sec.t0 + 1.4) { pv.obj.wilt && pv.obj.wilt(sec.t0 - 0.3); this.drawObj(pv, fx, t, LW, LH, wind, pulse); }
        if (sec.obj) { sec.obj.fade = null; this.drawObj(sec, fx, t, LW, LH, wind, pulse); }
        // lightning
        for (const ft of sec.flashes || []) { const q = t - ft; if (q > 0 && q < 0.5) flash = Math.max(flash, Math.exp(-q * 9) * (q < 0.08 || (q > 0.14 && q < 0.2) ? 1 : 0.4)); }
        if (flash > 0.45) this.bolt(fx, t, LW, LH, sec);
        // the key word, huge: in front and lower while the cover is up, big in the middle otherwise
        const pal = ctx.palette || {};
        for (const h of this.hits) {
          if (t < h.t - 0.05 || t > h.t1 + 0.4) continue;
          const k = ss(h.t - 0.05, h.t + 0.18, t) * (1 - ss(h.t1, h.t1 + 0.4, t));
          const front = h.front;
          const X = front ? fx : bx;
          X.save();
          X.font = `400 ${Math.round(LH * (front ? 0.24 : 0.4))}px 'Oley Heavy', Impact, sans-serif`;
          const mw = X.measureText(h.s).width, sc = Math.min(1, (LW * 0.92) / mw);
          X.translate(LW / 2, LH * (front ? 0.86 : 0.58)); X.scale(sc, 1);
          const col = pal.vivid || [255, 80, 120];
          X.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(front ? 0.88 : 0.9) * k})`;
          X.textAlign = 'center'; X.textBaseline = 'middle';
          const rev = ss(h.t - 0.05, h.t + 0.25, t);
          X.beginPath(); X.rect(-mw / 2 - 10, -LH, (mw + 20) * rev, LH * 2); X.clip();
          X.fillText(h.s, 0, 0);
          X.restore();
        }
        if (this.sprites) this.sprites.draw(fx, t, LW, LH);
        this.caption(t, sec);
      }
      G.upload(this.backT, this.back);
      G.upload(this.frontT, this.front);
      const side = Math.min(G.h * (this.cut ? 0.8 : 0.66), G.w * 0.7);
      const cx = 0.5 + Math.sin(t * 0.07) * 0.01, cy = (side / 2 + G.h * (this.cut ? 0.0 : 0.06)) / G.h;
      const br = 1 + Math.sin(t * 0.21) * 0.008 + pulse * 0.004;
      const pal = ctx.palette || {};
      const gl = pal.light || [236, 236, 244], acc = pal.vivid || [255, 80, 120];
      G.draw(this.pScene, {
        uBack: this.backT, uFront: this.frontT, uCover: this.coverT || null, uFull: this.fullT || null,
        uTime: t, uPulse: pulse, uLevel: level, uCoverW: this.coverT ? coverW : 0, uFlow: 1, uKeep: o.accent === false ? 0 : 1,
        uLod: Math.max(0, Math.log2((512 * cw) / side)), uLodF: Math.max(0, Math.log2((512 * cw) / (G.h * 0.4))), uSoft: this.cut ? 0 : 0.22, uSeed: this.seed || 0,
        uStyle: style, uEnv: env, uEnvW: envW, uFlash: flash, uAsp: G.w / G.h, uCloud: cloudRT, uCloudOn: cloudRT ? 1 : 0,
        uBox: [cx, cy, (side * br) / 2 / G.w, (side * br) / 2 / G.h],
        uGrey: [0.78 + (gl[0] / 255) * 0.14, 0.8 + (gl[1] / 255) * 0.14, 0.84 + (gl[2] / 255) * 0.14], uAcc: [acc[0] / 255, acc[1] / 255, acc[2] / 255],
      }, this.rtC);
      if (cloudRT && O.params && O.params.get('asraw') === '1') { this.post.run(cloudRT, { time: t, bloom: 0, glow: 0, vig: 0, grain: 0 }, null); return; }
      G.draw(this.pGlyph, {
        uAtlas: this.atlasT, uCells: this.rtC, uCell: [cw, ch], uOff: this.offs[set], uN: SETS[set].length, uBin: set === 'binary' ? 1 : 0,
        uTime: t, uPulse: pulse, uCoverW: this.coverT ? coverW : 0, uScr: scr, uSeed: this.seed || 0,
      }, this.rt);
      this.post.run(this.rt, { time: t, bloom: 0.07, glow: 0.18, vig: 0.4, grain: 0.022, ca: 0.0008, contrast: 1.04, sat: 1.05, clip: 0.92 }, null);
      const what = sec ? sec.scene : 'boot';
      this.term.innerHTML = '$ oley ascii --scene ' + what + ' --charset ' + set + ' --grid ' + cols + 'x' + rows + '  ' + esc(((this.track && this.track.title) || '').slice(0, 32)) + ' <i></i>';
      this.stats = { cols, rows, cw, ch, scene: what, set, coverW: +coverW.toFixed(2), scr: +scr.toFixed(2) };
    }
    drawObj(S, x, t, W, H, wind, pulse) {
      const ob = S.obj;
      if (S.scene === 'fireworks') ob.draw(x, t, W, H);
      void wind; void pulse;
    }
    // a lightning bolt, new every flash
    bolt(x, t, W, H, sec) {
      const R = O.asciiRng(Math.floor(t * 3) + 77);
      let px = W * R.r(0.2, 0.8), py = 0;
      x.save(); x.strokeStyle = 'rgba(235,240,255,0.95)'; x.lineWidth = Math.max(2, H * 0.012); x.lineJoin = 'round';
      x.beginPath(); x.moveTo(px, py);
      while (py < H * 0.85) { px += R.r(-0.06, 0.06) * W; py += R.r(0.05, 0.11) * H; x.lineTo(px, py); }
      x.stroke(); x.restore();
      void sec;
    }

    // the line, set as a caption, its key word in italics
    caption(t, sec) {
      const tl = this.ctx.tl, lines = (tl && tl.lines) || [];
      let L = null;
      for (const l of lines) { if (l.words && l.words.length && l.t - 0.15 <= t) L = l; else if (l.t - 0.15 > t) break; }
      const end = L ? Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.4) : 0;
      const live = L && t < end + Math.min(2.5, Math.max(0.6, (L.gapAfter || 3) - 0.4));
      const key = live ? 'L' + L.i : sec && sec.intro ? 'intro' : '';
      if (key !== this.capKey) {
        this.capKey = key;
        this.cap.classList.remove('out');
        this.cap.innerHTML = '';
        this.capWs = [];
        if (live) {
          L.words.forEach((w, i) => {
            const sp = U.el('span', 'w' + (w.key ? ' k' : ''), this.cap, (i ? ' ' : '') + w.raw);
            this.capWs.push([sp, w.t]);
          });
        } else if (key === 'intro') {
          const tr = this.track || {};
          const a = U.el('span', 'w k', this.cap, tr.title || 'Oley');
          const b = U.el('span', 'w', this.cap, tr.artist ? '  —  ' + tr.artist : '');
          this.capWs = [[a, 0.3], [b, 0.9]];
        } else this.cap.classList.add('out');
      }
      for (const [sp, wt] of this.capWs || []) sp.classList.toggle('on', t >= wt - 0.06);
    }
    destroy() {
      if (this.cloud) { try { this.cloud.destroy(); } catch (e) {} }
      if (this.G) { try { this.G.destroy(); } catch (e) {} U.remove(this.G.canvas); }
    }
  }

  O.registerMode('ascii', Ascii, { label: 'ASCII', glow: false });
})();
