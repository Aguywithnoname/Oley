/* Oley code camera: lyrics typed as code in an editor that is filmed by a virtual camera with a real
   lens. Text comes from a signed-distance font, so it stays razor sharp at any zoom, and every pixel is
   integrated over the lens aperture and the shutter interval: true depth of field and bokeh, true
   motion blur, colour fringing on whip pans. Shared by Source and Motion. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  // ================================================================ lyric -> code
  const CONJ = new Set('cause because cos cuz and but or so if when where while though until till til then yet since unless nor whether'.split(' '));
  const PREP = new Set('for to in on at with from of like about into onto through without over under after before around inside outside by than'.split(' '));
  const VERB = new Set(('say said says tell told call calls called know knows knew make makes made feel feels felt see sees saw keep keeps kept cry cries cried ' +
    'love loves loved need needs want wants give gives gave take takes took think thinks believe believes leave leaves left lie lies lied hold holds find finds found ' +
    'sleep sleeps slept is are was were be been do does did miss misses missed hate run runs ran dance dancing stay stays go goes went come comes came touch kiss ' +
    'break breaks lose loses lost burn burns fall falls falling count counting turn turns show shows play plays wait waits remember forget trust hear hears heard ' +
    'let bring pull drive move live lives die dies get gets got gotta wanna gonna can could would should will wont cant dont doesnt didnt isnt aint finds speak talk ' +
    'walk walking look looking watch watching hide hides seems seem seemed switch thinkin thinking guess guessing').split(' '));
  const ME = new Set('i me my mine myself im ive ill id'.split(' '));
  const YOU = new Set('you your yours youre yourself u ya youll youve youd'.split(' '));
  const BOOL = new Set('true false never always yes no nothing everything forever nobody everybody'.split(' '));
  const NUM = /^(\d+|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|first|second|third|last)$/;
  function cls(b) {
    if (ME.has(b)) return 'me';
    if (YOU.has(b)) return 'you';
    if (O.HOT_WORDS.has(b) || b === 'false') return 'hot';
    if (BOOL.has(b)) return 'bool';
    if (NUM.test(b)) return 'num';
    return 'id';
  }
  // one lyric line -> tokens of code. Tokens remember which sung word they belong to (w).
  function codeFor(line, r) {
    const toks = [];
    const ws = line.words;
    const real = ws.map((w, i) => ({ i, b: (w.w || '').replace(/'/g, ''), ad: w.adlib })).filter((x) => x.b && !x.ad);
    const adlibs = ws.filter((w) => w.adlib).map((w) => w.bare || w.w).join(' ');
    if (!real.length) return { indent: 0, toks: [{ s: '// ' + line.text.replace(/[()]/g, ''), c: 'cm', w: 0 }] };
    const first = real[0].b;
    let indent = CONJ.has(first) || line.i === 0 ? 0 : r.chance(0.55) ? 1 : 0;
    let open = 0, tail = '';
    real.forEach((x, k) => {
      const b = x.b;
      if (k === 0) {
        if (CONJ.has(b) && real.length > 1) {
          if (r.chance(0.5)) { toks.push({ s: b, c: 'kw', w: x.i, lead: true }); toks.push({ s: ': ', c: 'pun', w: x.i }); tail = ': '; }
          else { toks.push({ s: b, c: 'kw', w: x.i, lead: true }); toks.push({ s: '(', c: 'pun', w: x.i }); open++; tail = '('; }
        } else if (indent) {
          toks.push({ s: '.', c: 'pun', w: x.i });
          const call = VERB.has(b) || PREP.has(b);
          toks.push({ s: b, c: call ? 'fn' : cls(b), w: x.i, lead: call });
          if (call && real.length > 1) { toks.push({ s: '(', c: 'pun', w: x.i }); open++; tail = '('; } else tail = 'id';
        } else {
          const call = (VERB.has(b) || PREP.has(b)) && real.length > 1;
          toks.push({ s: b, c: call ? 'fn' : cls(b), w: x.i, lead: call });
          if (call) { toks.push({ s: '(', c: 'pun', w: x.i }); open++; tail = '('; } else tail = 'id';
        }
        return;
      }
      const sep = tail === 'id' ? '.' : '';
      if (b === 'that' && k < real.length - 1 && r.chance(0.6)) {
        if (sep) toks.push({ s: sep, c: 'pun', w: x.i });
        toks.push({ s: 'that', c: 'kw', w: x.i });
        toks.push({ s: ' => ', c: 'pun', w: x.i });
        tail = '=>';
        return;
      }
      if ((PREP.has(b) || VERB.has(b)) && k < real.length - 1 && open < 4) {
        if (sep) toks.push({ s: sep, c: 'pun', w: x.i });
        toks.push({ s: b, c: 'fn', w: x.i });
        toks.push({ s: '(', c: 'pun', w: x.i });
        open++;
        tail = '(';
        return;
      }
      if (sep) toks.push({ s: sep, c: 'pun', w: x.i });
      const c = cls(b);
      toks.push({ s: b, c: c === 'id' && k === real.length - 1 && r.chance(0.3) ? 'fn' : c, w: x.i });
      tail = 'id';
    });
    const lastW = real[real.length - 1].i;
    toks.push({ s: ')'.repeat(open) + ';', c: 'pun', w: lastW, close: true });
    if (adlibs) toks.push({ s: '  // ' + adlibs, c: 'cm', w: lastW, close: true });
    return { indent, toks };
  }
  // the whole song as rows of code. Long lines wrap the way real code does.
  function buildRows(tl, ctx, o) {
    o = o || {};
    const rows = [];
    const rowOf = [], rowsOf = [];
    const MAX = o.max || 46;
    if (o.header) rows.push({ kind: 'cm', text: o.header, at: -1e9 });
    rows.push({ kind: 'blank', at: -1e9 });
    tl.lines.forEach((L, i) => {
      const prev = tl.lines[i - 1];
      if (prev && L.t - prev.singEnd > 7) {
        rows.push({ kind: 'blank', at: prev.singEnd + 1 });
        rows.push({ kind: 'cm', text: '// …', at: prev.singEnd + 1.2 });
      } else if (prev && L.t - prev.singEnd > 3.2) rows.push({ kind: 'blank', at: prev.singEnd + 0.6 });
      const r = ctx.rng('code' + i);
      const c = codeFor(L, r);
      const parts = [];
      let cur = [], len = 0;
      for (const tk of c.toks) {
        const startsWord = !tk.close && tk.c !== 'pun' && cur.length && len > MAX * 0.55;
        if (startsWord && len + tk.s.length > MAX) {
          const tail = [];
          while (cur.length && cur[cur.length - 1].c === 'pun' && cur[cur.length - 1].s === '.') tail.unshift(cur.pop());
          parts.push(cur);
          cur = tail;
          len = tail.reduce((a, x) => a + x.s.length, 0);
        }
        cur.push(tk);
        len += tk.s.length;
      }
      if (cur.length) parts.push(cur);
      rowsOf[i] = [];
      parts.forEach((toks, k) => {
        const fw = toks.find((x) => !x.close);
        const w0 = fw ? L.words[fw.w] : L.words[0];
        rowsOf[i].push(rows.length);
        if (k === 0) rowOf[i] = rows.length;
        rows.push({ kind: 'lyric', li: i, at: (k === 0 ? L.t : w0.t) - 0.05, indent: c.indent + (k ? 1 : 0), toks, first: k === 0 });
      });
    });
    return { rows, rowOf, rowsOf };
  }
  O.Code = { codeFor, cls, buildRows };

  // ================================================================ signed-distance font
  const INF = 1e20;
  function edt1d(grid, offset, stride, length, f, v, z) {
    v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
    for (let q = 1, k = 0, s = 0; q < length; q++) {
      f[q] = grid[offset + q * stride];
      const q2 = q * q;
      do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    for (let q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const r = v[k], qr = q - r;
      grid[offset + q * stride] = f[r] + qr * qr;
    }
  }
  function edt(data, w, h, f, v, z) {
    for (let x = 0; x < w; x++) edt1d(data, x, w, h, f, v, z);
    for (let y = 0; y < h; y++) edt1d(data, y * w, 1, w, f, v, z);
  }
  const FAMILY = "'Oley Mono', 'Cascadia Mono', Consolas, 'Nirmala UI', 'Segoe UI', 'Noto Sans', sans-serif";
  class SdfFont {
    constructor() {
      const F = (this.F = 56), B = (this.B = 12), R = (this.R = 12);
      const c = document.createElement('canvas');
      const x = c.getContext('2d', { willReadFrequently: true });
      this.font = `700 ${F}px ${FAMILY}`;
      x.font = this.font;
      const m = x.measureText('M');
      this.adv = m.width;
      this.asc = Math.ceil(m.fontBoundingBoxAscent || F * 0.93);
      this.desc = Math.ceil(m.fontBoundingBoxDescent || F * 0.24);
      this.cw = Math.ceil(this.adv) + 2 * B;
      this.ch = this.asc + this.desc + 2 * B;
      this.cols = 16;
      this.rows = 16;
      this.W = this.cw * this.cols;
      this.H = this.ch * this.rows;
      this.data = new Uint8Array(this.W * this.H);
      this.canvas = c;
      this.cx = x;
      c.width = this.cw * 2;
      c.height = this.ch;
      const n = Math.max(c.width, c.height);
      this.f = new Float64Array(n);
      this.v = new Uint16Array(n);
      this.z = new Float64Array(n + 1);
      this.map = new Map();
      this.next = 1;
      this.dirty = [];
      for (let cp = 32; cp < 127; cp++) this.add(String.fromCharCode(cp));
      this.dirty = [];
    }
    // slot for a grapheme; wide graphemes take two neighbouring slots
    add(g) {
      if (this.map.has(g)) return this.map.get(g);
      const x = this.cx;
      x.font = this.font;
      const w = x.measureText(g).width;
      const wide = w > this.adv * 1.35;
      let slot = this.next;
      if (wide && slot % this.cols === this.cols - 1) slot++;
      if (slot + (wide ? 1 : 0) >= this.cols * this.rows) { this.map.set(g, { slot: 0, wide: false }); return this.map.get(g); }
      this.next = slot + (wide ? 2 : 1);
      const info = { slot, wide };
      this.map.set(g, info);
      const W = this.cw * (wide ? 2 : 1), H = this.ch, B = this.B;
      x.clearRect(0, 0, this.canvas.width, this.canvas.height);
      x.fillStyle = '#fff';
      x.textBaseline = 'alphabetic';
      const box = this.adv * (wide ? 2 : 1);
      const sx = w > box ? box / w : 1;
      x.save();
      x.translate(B + (box - w * sx) / 2, B + this.asc);
      x.scale(sx, 1);
      x.fillText(g, 0, 0);
      x.restore();
      const img = x.getImageData(0, 0, W, H).data;
      const N = W * H, outer = new Float64Array(N), inner = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const a = img[i * 4 + 3] / 255;
        outer[i] = a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2);
        inner[i] = a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
      }
      edt(outer, W, H, this.f, this.v, this.z);
      edt(inner, W, H, this.f, this.v, this.z);
      const ox = (slot % this.cols) * this.cw, oy = Math.floor(slot / this.cols) * this.ch;
      const cell = new Uint8Array(N);
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx;
        const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
        const v = Math.round(255 - 255 * (d / this.R + 0.25));
        const b = U.clamp(v, 0, 255);
        this.data[(oy + y) * this.W + ox + xx] = b;
        cell[i] = b;
      }
      this.dirty.push({ x: ox, y: oy, w: W, h: H, data: cell });
      return info;
    }
  }
  let sharedFont = null;
  O.CodeFont = () => sharedFont || (sharedFont = new SdfFont());
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const graphemes = (s) => (segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s));

  // ================================================================ renderer
  const COLS = 128, ROWS = 256, CW = 0.6, LH = 1.55;
  const SCENE = `
uniform sampler2D uAtlas, uTagA, uTagB, uCard, uBanner, uTab;
uniform sampler2D uGrid;
uniform vec2 uAtlasPx, uCellPx;
uniform float uF, uB, uR, uEmH, uBase, uACols, uRowBase, uCurRow, uSelAmt, uTime, uThin, uKeyGlow;
uniform vec3 uPal[16];
uniform vec3 uBg, uLineHi, uSel, uOut, uGut;
uniform vec4 uWin, uCurA, uCurAC, uTagRA, uCurB, uCurBC, uTagRB, uRing, uCardR, uBannerR, uTabR, uFlame, uSelR, uGlitch;
uniform float uCardA, uBannerA, uTagAA, uTagBA;
uniform vec3 uC0, uF0, uR0, uU0, uC1, uF1, uR1, uU1;
uniform float uFd0, uFd1, uTanH, uAper, uMaxN, uChroma;
out vec4 o;
const float CW = ${CW.toFixed(3)}, LH = ${LH.toFixed(3)};
const float COLS = ${COLS}., ROWS = ${ROWS}.;
vec4 tex(sampler2D s, vec4 r, vec2 p){
  vec2 uv = (p - r.xy) / (r.zw - r.xy);
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec4(0.);
  return linPremul(textureLod(s, vec2(uv.x, 1. - uv.y), 0.));
}
float box(vec2 p, vec4 r, float aa){
  vec2 d = max(r.xy - p, p - r.zw);
  float e = max(d.x, d.y);
  return 1. - smoothstep(-aa, aa, e);
}
vec4 glyph(vec2 p, float aa){
  float col = floor(p.x / CW), row = floor(p.y / LH);
  if (col < 0. || col >= COLS || row < uRowBase || row >= uRowBase + ROWS) return vec4(0.);
  vec4 g = texelFetch(uGrid, ivec2(int(col), int(mod(row, ROWS))), 0);
  if (g.a < .5) return vec4(0.);
  float gi = floor(g.r * 255. + .5);
  if (gi < .5) return vec4(0.);
  float sty = floor(g.g * 255. + .5), fl = floor(g.b * 255. + .5);
  float ci = mod(sty, 16.), thin = mod(floor(sty / 16.), 2.), ital = floor(sty / 32.);
  vec2 f = p - vec2(col * CW, row * LH);
  // glitch: shaken characters on the flagged row
  if (uGlitch.w > 0. && abs(row - uGlitch.x) < .5) {
    float h = hash12(vec2(col, floor(uTime * 24.)));
    f.x += (h - .5) * .5 * uGlitch.w; f.y += (hash12(vec2(col + 7., floor(uTime * 24.))) - .5) * .4 * uGlitch.w;
  }
  f.y -= (LH - uEmH) * .5;
  if (ital > .5) f.x += (uBase - f.y) * .2;
  if (mod(fl, 8.) >= 4.) f.x += CW;         // right half of a wide glyph
  vec2 org = vec2(mod(gi, uACols), floor(gi / uACols)) * uCellPx;
  vec2 lp = vec2(uB + f.x * uF, uB + f.y * uF);
  float wmax = mod(fl, 4.) >= 2. || mod(fl, 8.) >= 4. ? uCellPx.x * 2. : uCellPx.x;
  if (lp.x < .5 || lp.y < .5 || lp.x > wmax - .5 || lp.y > uCellPx.y - .5) return vec4(0.);
  float d = textureLod(uAtlas, (org + lp) / uAtlasPx, 0.).r;
  float de = (.75 - d) * uR / uF + thin * uThin;
  float cov = 1. - smoothstep(-aa, aa, de);
  vec3 c = uPal[int(ci)];
  if (mod(fl, 2.) > .5) c *= uKeyGlow;
  return vec4(c * cov, cov);
}
vec3 flame(vec2 p){
  vec2 q = (p - uFlame.xy) / uFlame.z;
  q.y = -q.y;
  if (q.y < -.4 || q.y > 2.6 || abs(q.x) > 1.) return vec3(0.);
  float t = uTime;
  float wob = (vnoise(vec2(q.y * 2.6 - t * 7., t * 1.7)) - .5) * .32 * max(q.y, 0.) + (vnoise(vec2(t * 3.1, 1.)) - .5) * .08 * q.y;
  float x = q.x - wob;
  float h = 1.75 + .25 * vnoise(vec2(t * 5., 3.));
  float w = .34 * pow(max(q.y + .08, 0.) / (h + .08), .55) * (1. - pow(max(q.y, 0.) / h, 2.)) + .02;
  float d = abs(x) / w;
  float body = (1. - smoothstep(.55, 1., d)) * smoothstep(-.1, .06, q.y) * (1. - smoothstep(h * .9, h, q.y));
  float core = (1. - smoothstep(.0, .55, d)) * smoothstep(.0, .25, q.y) * (1. - smoothstep(.55, 1.2, q.y));
  float blue = (1. - smoothstep(.0, .7, d)) * (1. - smoothstep(-.05, .25, q.y)) * smoothstep(-.3, -.05, q.y);
  vec3 c = vec3(1., .42, .08) * body * 2.4 + vec3(1., .86, .55) * core * 5. + vec3(.25, .45, 1.) * blue * 1.6;
  return c * uFlame.w;
}
vec3 surf(vec2 p, float aa){
  vec3 col = uOut;
  bool inWin = p.x > uWin.x && p.x < uWin.z && p.y > uWin.y;
  if (inWin) {
    col = uBg;
    float row = floor(p.y / LH);
    if (abs(row - uCurRow) < .5) col = uLineHi;
    if (uSelAmt > 0. && row >= uSelR.x && row <= uSelR.y && p.x > uSelR.z) {
      vec4 g = texelFetch(uGrid, ivec2(int(clamp(floor(p.x / CW), 0., COLS - 1.)), int(mod(row, ROWS))), 0);
      if (g.a > .5) col = mix(col, uSel, uSelAmt);
    }
    // soft gutter rule
    col = mix(col, uGut, (1. - smoothstep(0., aa * 2. + .02, abs(p.x - 4.55 * CW))) * .35);
    vec4 gl = glyph(p, aa);
    col = col * (1. - gl.a) + gl.rgb;
    // the window's edge
    col *= mix(.55, 1., smoothstep(0., .25, min(p.x - uWin.x, uWin.z - p.x)));
  }
  if (uTabR.w > uTabR.y && p.y < uTabR.w && p.y > uTabR.y && p.x > uTabR.x && p.x < uTabR.z) { vec4 t = tex(uTab, uTabR, p); col = col * (1. - t.a) + t.rgb; }
  // cursors and their name tags
  float ca = box(p, uCurA, aa) * uCurAC.a;
  col = mix(col, uCurAC.rgb, ca);
  float cb = box(p, uCurB, aa) * uCurBC.a;
  col = mix(col, uCurBC.rgb, cb);
  if (uTagAA > 0.) { vec4 t = tex(uTagA, uTagRA, p) * uTagAA; col = col * (1. - t.a) + t.rgb; }
  if (uTagBA > 0.) { vec4 t = tex(uTagB, uTagRB, p) * uTagBA; col = col * (1. - t.a) + t.rgb; }
  if (uRing.w > 0.) {
    float d = abs(length(p - uRing.xy) - uRing.z);
    col += vec3(1., .58, .18) * (1. - smoothstep(.04, .1 + aa, d)) * uRing.w * 2.2;
    col += vec3(1., .5, .15) * exp(-d * 6.) * uRing.w * .35;
  }
  if (uCardA > 0.) { vec4 t = tex(uCard, uCardR, p) * uCardA; col = col * (1. - t.a) + t.rgb; }
  if (uBannerA > 0.) { vec4 t = tex(uBanner, uBannerR, p) * uBannerA; col = col * (1. - t.a) + t.rgb; }
  if (uFlame.w > 0.) col += flame(p);
  return col;
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 ndc = (fc - .5 * uRes) / (.5 * uRes.y);
  // how blurred is this pixel? (circle of confusion + motion, in pixels)
  vec3 d1 = normalize(uF1 + ndc.x * uTanH * uR1 + ndc.y * uTanH * uU1);
  float t1 = d1.z > 1e-4 ? -uC1.z / d1.z : 1e4;
  vec3 P = uC1 + d1 * t1;
  float dep = max(dot(P - uC1, uF1), 1e-3);
  float pxw = 2. * dep * uTanH / uRes.y;
  float coc = uAper * abs(1. - dep / uFd1) / pxw;
  vec3 q = P - uC0; float qz = max(dot(q, uF0), 1e-3);
  vec2 sp0 = vec2(dot(q, uR0), dot(q, uU0)) / (qz * uTanH);
  float mot = length(sp0 - ndc) * .5 * uRes.y;
  float nf = clamp(ceil(coc * coc * .085 + mot * .5 + 1.), 1., uMaxN);
  int n = int(nf);
  vec3 acc = vec3(0.), ws = vec3(0.);
  float rot = hash12(fc) * TAU, tj = hash12(fc + 17.31);
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    float fi = float(i);
    float rr = sqrt((fi + .5) / nf), th = fi * 2.39996323 + rot;
    vec2 lens = vec2(cos(th), sin(th)) * rr;
    float tau = n == 1 ? 1. : fract(fi * .618034 + tj);
    vec2 pj = n == 1 ? vec2(0.) : hash22(fc + fi * 7.13) - .5;
    vec2 nd = (fc + pj - .5 * uRes) / (.5 * uRes.y);
    vec3 C = mix(uC0, uC1, tau), Fw = normalize(mix(uF0, uF1, tau)), Rt = normalize(mix(uR0, uR1, tau)), Up = normalize(mix(uU0, uU1, tau));
    float Fd = mix(uFd0, uFd1, tau);
    vec3 dir = normalize(Fw + nd.x * uTanH * Rt + nd.y * uTanH * Up);
    vec3 Pf = C + dir * (Fd / dot(dir, Fw));
    vec3 Ol = C + (Rt * lens.x + Up * lens.y) * uAper;
    vec3 dd = normalize(Pf - Ol);
    if (dd.z <= 1e-4) continue;
    vec3 Q = Ol + dd * (-Ol.z / dd.z);
    float dq = max(dot(Q - C, Fw), 1e-3);
    float aa = dq * uTanH / uRes.y * 1.3 + uAper * abs(1. - dq / Fd) / sqrt(nf) * 1.15;
    vec3 c = surf(Q.xy, aa);
    vec3 w = vec3(1. + uChroma * (.5 - tau) * 2., 1., 1. + uChroma * (tau - .5) * 2.);
    acc += c * w; ws += w;
  }
  o = vec4(acc / max(ws, vec3(1e-4)), 1.);
}`;

  // camera looking at (tx, ty) on the editor from dist, with yaw/pitch/roll (radians)
  function lookCam(tx, ty, dist, yaw, pitch, roll) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const C = [tx + dist * sy * cp, ty - dist * sp, -dist * cy * cp];
    const f = norm([tx - C[0], ty - C[1], -C[2]]);
    let r = norm(cross(f, [0, -1, 0]));
    let u = cross(r, f);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const r2 = [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr];
    const u2 = [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr];
    return { p: C, f, r: r2, u: u2, fd: dist };
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  const THEMES = {
    motion: {
      bg: '#202022', lineHi: '#28282b', sel: '#2b4f99', out: '#0a0a0b', gut: '#3a3a3e',
      pal: { gutter: '#56565c', gutterCur: '#a2a2a8', kw: '#ff5b5b', fn: '#f4f4f4', id: '#f4f4f4', me: '#f4f4f4', you: '#f4f4f4', hot: '#ffd23f',
        bool: '#c792ea', num: '#c792ea', pun: '#dcdcdc', cm: '#7d7d84', str: '#a5e075', key: '#ffd23f', lead: '#ff5b5b', white: '#ffffff' },
    },
    source: {
      bg: '#0c0f15', lineHi: '#121620', sel: '#24406e', out: '#050608', gut: '#1b2130',
      pal: { gutter: '#3c4656', gutterCur: '#7c8799', kw: '#f3f6fb', fn: '#e4ebf5', id: '#9fbbe6', me: '#ff9a4d', you: '#7fd3ff', hot: '#ff4f5e',
        bool: '#c99bff', num: '#d7a6ff', pun: '#6c7a8e', cm: '#56627a', str: '#b5e48c', key: '#ffffff', lead: '#ffffff', white: '#ffffff' },
    },
  };
  const PAL_ORDER = ['gutter', 'gutterCur', 'kw', 'fn', 'id', 'me', 'you', 'hot', 'bool', 'num', 'pun', 'cm', 'str', 'key', 'lead', 'white'];
  const linHex = (h) => O.lin(U.parseHex(h));

  O.CodeCam = class {
    constructor(ctx, o) {
      this.ctx = ctx;
      this.o = o || {};
      this.theme = THEMES[this.o.theme] || THEMES.motion;
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      this.ok = G.ok;
      if (!G.ok) return;
      this.font = O.CodeFont();
      const F = this.font;
      this.tAtlas = G.dataTexture(F.W, F.H, F.data, { r8: true, linear: true });
      F.dirty = [];
      this.grid = new Uint8Array(COLS * ROWS * 4);
      this.tGrid = G.dataTexture(COLS, ROWS, this.grid, {});
      this.pScene = G.program(SCENE);
      this.post = new O.Post(G);
      this.rt = G.target(4, 4);
      this.pal = new Float32Array(48);
      PAL_ORDER.forEach((k, i) => { const c = linHex(this.theme.pal[k]); this.pal.set(c, i * 3); });
      this.rows = [];
      this.rowState = [];
      this.base = 0;
      this.tex = {};
      ['tagA', 'tagB', 'card', 'banner', 'tab'].forEach((k) => { this.tex[k] = G.texture(null, { mips: true }); });
      this.maxN = { light: 12, balanced: 32, smooth: 48 };
      this.quality = 1;
      this.slow = 0;
      this.prevCam = null;
    }
    // ---------------------------------------------------------- document
    setRows(rows) {
      this.rows = rows;
      this.rowState = rows.map(() => ({ typed: -1, key: '' }));
      this.grid.fill(0);
      this.base = 0;
      this.gridDirty = true;
      this.lastT = -1;
    }
    colorIndex(tk, L) {
      if (tk.c === 'cm') return 11;
      const w = L && L.words[tk.w];
      if (w && w.key && tk.c !== 'pun' && !tk.close && this.o.keyWords !== false) return 13;
      if (tk.lead && this.theme.pal.lead !== this.theme.pal.fn) return 14;
      return Math.max(0, PAL_ORDER.indexOf(tk.c));
    }
    // how many characters of each token of row ri are typed at time t
    typedRow(ri, t) {
      const c = this.rows[ri];
      if (c.kind !== 'lyric') return t >= c.at ? 1e9 : 0;
      const L = this.ctx.tl.lines[c.li];
      if (!L) return 0;
      const out = [];
      const groups = new Map();
      for (const tk of c.toks) if (!tk.close) groups.set(tk.w, (groups.get(tk.w) || 0) + tk.s.length);
      const before = new Map();
      for (const tk of c.toks) {
        const w = L.words[tk.w] || L.words[0];
        let n;
        if (tk.close) n = Math.floor(tk.s.length * U.prog(L.singEnd - 0.05, L.singEnd + 0.25, t));
        else {
          const chars = groups.get(tk.w);
          const dur = U.clamp(w.dur * 0.78, 0.07, 0.55);
          const typed = Math.floor(chars * U.prog(w.t - 0.03, w.t - 0.03 + dur, t) + 1e-6);
          const b = before.get(tk.w) || 0;
          n = U.clamp(typed - b, 0, tk.s.length);
          before.set(tk.w, b + tk.s.length);
        }
        out.push(n);
      }
      return out;
    }
    writeRow(ri, typed, curRow) {
      const g = this.grid, F = this.font;
      const gr = ri % ROWS;
      const off = gr * COLS * 4;
      g.fill(0, off, off + COLS * 4);
      const c = this.rows[ri];
      const put = (col, ch, ci, flags, thin, ital) => {
        if (col < 0 || col >= COLS) return 0;
        const gi = F.add(ch);
        const k = off + col * 4;
        g[k] = gi.slot; g[k + 1] = ci + (thin ? 16 : 0) + (ital ? 32 : 0); g[k + 2] = flags | (gi.wide ? 2 : 0); g[k + 3] = 255;
        if (gi.wide && col + 1 < COLS) { const k2 = k + 4; g[k2] = gi.slot; g[k2 + 1] = g[k + 1]; g[k2 + 2] = flags | 4; g[k2 + 3] = 255; return 2; }
        return 1;
      };
      const num = String(ri + 1);
      const any = c.kind === 'blank' ? false : c.kind === 'lyric' ? (typed || []).some((n) => n > 0) : typed > 0;
      if (any || ri <= curRow) for (let i = 0; i < num.length; i++) put(4 - num.length + i, num[i], ri === curRow ? 1 : 0, 0, true, false);
      let col = 6 + (c.indent || 0) * 2;
      if (c.kind === 'cm') {
        if (typed > 0) for (const ch of graphemes(c.text)) col += put(col, ch, 11, 0, true, true);
        return col;
      }
      if (c.kind !== 'lyric') return col;
      const L = this.ctx.tl.lines[c.li];
      c.toks.forEach((tk, i) => {
        const n = typed[i];
        const gs = graphemes(tk.s);
        const ci = this.colorIndex(tk, L);
        const key = ci === 13 ? 1 : 0;
        for (let j = 0; j < gs.length; j++) {
          if (j >= n) { col += 1; continue; }
          col += put(col, gs[j], ci, key, tk.c === 'cm', tk.c === 'cm');
        }
      });
      return col;
    }
    // advance the typing to time t; returns where the typing cursor is
    update(t, jumped) {
      const rows = this.rows;
      if (!rows.length) return { row: 0, col: 6, li: -1, typing: false };
      if (jumped || t < this.lastT - 0.05) { this.rowState = rows.map(() => ({ typed: -1, key: '' })); this.grid.fill(0); this.gridDirty = true; }
      this.lastT = t;
      // the row being typed now (the last row whose time has come)
      let cur = 0;
      for (let i = 0; i < rows.length; i++) { if (rows[i].at <= t) cur = i; else break; }
      // keep the window of rows on the GPU around the cursor
      const base = Math.max(0, cur - ROWS + 40);
      if (base !== this.base) { this.base = base; this.grid.fill(0); this.rowState = rows.map(() => ({ typed: -1, key: '' })); this.gridDirty = true; }
      const changed = [];
      let curCol = 6, typing = false;
      const lo = Math.max(base, cur - 3), hi = Math.min(rows.length - 1, base + ROWS - 1);
      for (let i = base; i <= hi; i++) {
        const st = this.rowState[i];
        if (i < lo && st.typed !== -1 && st.done) continue;
        let typed;
        if (rows[i].at > t) typed = rows[i].kind === 'lyric' ? rows[i].toks.map(() => 0) : 0;
        else typed = this.typedRow(i, t);
        const key = (Array.isArray(typed) ? typed.join(',') : String(typed > 0)) + (i === cur ? 'c' : '');
        if (key !== st.key) {
          st.key = key;
          st.typed = typed;
          const end = this.writeRow(i, typed, cur);
          st.end = end;
          changed.push(i);
        }
        if (rows[i].kind === 'lyric') {
          const full = rows[i].toks.every((tk, k) => typed[k] >= tk.s.length);
          st.done = full && i < cur;
        } else st.done = i < cur;
      }
      // cursor column: just after the last typed character of the current row
      const c = rows[cur];
      if (c.kind === 'lyric') {
        const typed = this.rowState[cur].typed || [];
        let col2 = 6 + (c.indent || 0) * 2, lastTyped = col2;
        c.toks.forEach((tk, k) => { const n = typed[k] || 0; if (n > 0) lastTyped = col2 + graphemes(tk.s.slice(0, n)).length; col2 += graphemes(tk.s).length; });
        curCol = lastTyped;
        const L = this.ctx.tl.lines[c.li];
        typing = L && t >= L.t - 0.05 && t < L.singEnd + 0.3;
      } else curCol = this.rowState[cur].end || 6;
      if (changed.length || this.gridDirty) this.uploadRows(changed);
      // new glyphs that were added to the atlas
      const F = this.font;
      if (F.dirty.length) { for (const d of F.dirty) this.G.updateData(this.tAtlas, d.x, d.y, d.w, d.h, d.data); F.dirty = []; }
      return { row: cur, col: curCol, li: c.li == null ? -1 : c.li, typing };
    }
    uploadRows(list) {
      const G = this.G;
      if (this.gridDirty || list.length > 24) { G.updateData(this.tGrid, 0, 0, COLS, ROWS, this.grid); this.gridDirty = false; return; }
      for (const ri of list) {
        const gr = ri % ROWS;
        G.updateData(this.tGrid, 0, gr, COLS, 1, this.grid.subarray(gr * COLS * 4, (gr + 1) * COLS * 4));
      }
    }
    rowLen(ri) { const st = this.rowState[ri]; return st && st.end ? st.end : 6; }
    // ---------------------------------------------------------- overlays drawn as small textures
    setTex(name, canvas) { if (this.ok) this.G.upload(this.tex[name], canvas); }
    static tag(text, bg, fg) {
      const c = document.createElement('canvas');
      const x = c.getContext('2d');
      const font = "700 44px 'Oley Mono', Consolas, monospace";
      x.font = font;
      const w = Math.ceil(x.measureText(text).width) + 36, h = 64;
      c.width = w; c.height = h;
      x.font = font;
      x.fillStyle = bg;
      x.beginPath();
      x.roundRect(0, 0, w, h, [12, 12, 12, 0]);
      x.fill();
      x.fillStyle = fg;
      x.textBaseline = 'middle';
      x.fillText(text, 18, h / 2 + 2);
      return c;
    }
    // ---------------------------------------------------------- frame
    static cam(tx, ty, dist, yaw, pitch, roll) { return lookCam(tx, ty, dist, yaw, pitch, roll); }
    render(cam, x, t, dt) {
      const G = this.G, ctx = this.ctx;
      if (!this.ok || G.lost) return;
      // keep the frame rate up on slower GPUs: fewer lens samples first, then fewer pixels
      if (dt > 0.03) this.slow = Math.min(60, this.slow + 1); else if (dt < 0.019) this.slow = Math.max(0, this.slow - 1);
      if (this.slow > 40) this.quality = Math.max(0.45, this.quality - 0.02);
      else if (this.slow === 0) this.quality = Math.min(1, this.quality + 0.004);
      const s = O.glScale(ctx, true) * (this.quality < 0.7 ? 0.8 : 1);
      if (G.size(ctx.W * s, ctx.H * s)) G.resizeTarget(this.rt, G.w, G.h);
      // the shutter stays open for at most 1/50 s, whatever the frame rate
      let prev = this.prevCam && !x.cut ? this.prevCam : cam;
      this.prevCam = cam;
      const k = Math.min(1, 0.02 / Math.max(1e-3, dt));
      if (prev !== cam && k < 1) {
        const m = (a, b) => a.map((v, i) => v + (b[i] - v) * k);
        prev = { p: m(cam.p, prev.p), f: m(cam.f, prev.f), r: m(cam.r, prev.r), u: m(cam.u, prev.u), fd: cam.fd + (prev.fd - cam.fd) * k };
      }
      const F = this.font, th = this.theme;
      const perf = ctx.settings.perf || 'balanced';
      const maxN = Math.max(4, Math.round((this.maxN[perf] || 26) * this.quality));
      const z4 = [0, 0, 0, 0];
      G.draw(this.pScene, {
        uAtlas: this.tAtlas, uGrid: this.tGrid, uTagA: this.tex.tagA, uTagB: this.tex.tagB, uCard: this.tex.card, uBanner: this.tex.banner, uTab: this.tex.tab,
        uAtlasPx: [F.W, F.H], uCellPx: [F.cw, F.ch], uF: F.F, uB: F.B, uR: F.R, uEmH: (F.asc + F.desc) / F.F, uBase: F.asc / F.F, uACols: F.cols,
        uRowBase: this.base, uCurRow: x.curRow == null ? -9 : x.curRow, uSelAmt: x.selAmt || 0, uSelR: x.selR || z4, uTime: t, uThin: 0.018, uKeyGlow: x.keyGlow || 1.6,
        uPal: this.pal, uBg: linHex(th.bg), uLineHi: linHex(th.lineHi), uSel: linHex(th.sel), uOut: linHex(th.out), uGut: linHex(th.gut),
        uWin: x.win || [-1.2, -2.6, COLS * CW, 0], uCurA: x.curA || z4, uCurAC: x.curAC || z4, uTagRA: x.tagRA || z4, uTagAA: x.tagAA || 0,
        uCurB: x.curB || z4, uCurBC: x.curBC || z4, uTagRB: x.tagRB || z4, uTagBA: x.tagBA || 0,
        uRing: x.ring || z4, uCardR: x.cardR || z4, uCardA: x.cardA || 0, uBannerR: x.bannerR || z4, uBannerA: x.bannerA || 0,
        uTabR: x.tabR || z4, uFlame: x.flame || z4, uGlitch: x.glitch || z4,
        uC0: prev.p, uF0: prev.f, uR0: prev.r, uU0: prev.u, uFd0: prev.fd, uC1: cam.p, uF1: cam.f, uR1: cam.r, uU1: cam.u, uFd1: cam.fd,
        uTanH: cam.tanH || 0.27, uAper: cam.aper || 0, uMaxN: maxN, uChroma: x.chroma || 0,
      }, this.rt);
      this.post.run(this.rt, Object.assign({ time: t, bloom: 0.05, glow: 0.12, vig: 0.42, grain: 0.04, ca: 0.0012, halation: 0.05 }, x.finish || {}));
    }
    destroy() { if (this.G) this.G.destroy(); }
  };
  O.CodeCam.CW = CW;
  O.CodeCam.LH = LH;
  O.CodeCam.COLS = COLS;
  O.CodeCam.graphemes = graphemes;
})();
