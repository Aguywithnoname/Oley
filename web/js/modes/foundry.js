/* Foundry: every lyric cast in metal, live on the GPU. No models, no footage: each letter is a
   distance field traced from the typeface and extruded with a polished bevel, ray-marched per pixel.
   Two finishes per letter (a satin or brushed face, a mirror edge), lit by a little photo studio:
   one off-axis softbox printed with the album cover, two strip lights for the edge lines, a dark
   room and a glossy floor that reflects it all. The song directs the camera like a scroll site:
   a cue script per line (hero, close-up, around, descend, macro, tracking the words), letters
   forming as they're sung, an exploded view with callouts while a line holds, then it blows apart
   as the camera flies on to the next one. One clock, the beat in the lights, bloom on the glints
   only, ACES and grain. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const PI = Math.PI;
  const ATLAS = 2048, GPX = 136, SPREAD = 16, PAD = SPREAD + 3, INF = 1e20;
  const MAXI = 256;

  O.css('foundry', `
.m-fd { background: #040405; }
.m-fd .gl-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.m-fd .fd-ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
`);

  // ---------------------------------------------------------------- small maths
  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  };
  function persp(fovy, asp, n, f, o) { o.fill(0); const t = 1 / Math.tan(fovy / 2); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f); return o; }
  function look(eye, at, up, o) {
    const z = V.norm(V.sub(eye, at)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
    o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0; o[12] = -V.dot(x, eye); o[13] = -V.dot(y, eye); o[14] = -V.dot(z, eye); o[15] = 1;
    return o;
  }
  function mm(a, b, o) { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function inv4(m, o) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    det = det ? 1 / det : 0;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  }
  const ease = (k) => { k = U.sat(k); return k * k * k * (k * (k * 6 - 15) + 10); };
  const out3 = (k) => 1 - Math.pow(1 - U.sat(k), 3);
  const in2 = (k) => { k = U.sat(k); return k * k; };
  const rng = (seed) => {
    let s = (seed >>> 0) || 0x9e3779b9;
    const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    f.r = (a, b) => a + (b - a) * f(); f.pick = (a) => a[Math.floor(f() * a.length) % a.length]; f.sgn = () => (f() < 0.5 ? -1 : 1);
    return f;
  };
  const hashS = (str) => { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const lin = (c) => c.map((v) => Math.pow(v / 255, 2.2));

  // ---------------------------------------------------------------- glyphs: type traced into distance fields (TinySDF method)
  function edt1d(g, off, stride, len, f, v, z) {
    v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = g[off];
    for (let q = 1, k = 0, s = 0; q < len; q++) {
      f[q] = g[off + q * stride];
      const q2 = q * q;
      do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    for (let q = 0, k = 0; q < len; q++) { while (z[k + 1] < q) k++; const r = v[k], qr = q - r; g[off + q * stride] = f[r] + qr * qr; }
  }
  function edt(g, w, h, f, v, z) { for (let x = 0; x < w; x++) edt1d(g, x, w, h, f, v, z); for (let y = 0; y < h; y++) edt1d(g, y * w, 1, w, f, v, z); }
  class Glyphs {
    constructor(gl, font) {
      this.gl = gl; this.font = font; this.map = new Map();
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, ATLAS, ATLAS, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(ATLAS * ATLAS).fill(255));
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.cx = 0; this.cy = 0; this.rowH = 0;
      this.cv = document.createElement('canvas');
      this.x = this.cv.getContext('2d', { willReadFrequently: true });
      const n = 400;
      this.f = new Float64Array(n); this.v = new Uint16Array(n); this.z = new Float64Array(n + 1);
    }
    measure(ch) { const x = this.x; x.font = this.font; return x.measureText(ch).width / GPX; }
    get(ch) {
      let g = this.map.get(ch);
      if (g) return g;
      const x = this.x;
      x.font = this.font;
      const m = x.measureText(ch);
      const adv = m.width / GPX;
      if (!ch.trim()) { g = { adv, empty: true }; this.map.set(ch, g); return g; }
      const asc = Math.ceil(m.actualBoundingBoxAscent || GPX * 0.75), dsc = Math.ceil(m.actualBoundingBoxDescent || 0);
      const l = Math.ceil(m.actualBoundingBoxLeft || 0), r = Math.ceil(m.actualBoundingBoxRight || m.width);
      const tw = Math.max(4, l + r) + PAD * 2, th = Math.max(4, asc + dsc) + PAD * 2;
      if (this.cx + tw > ATLAS) { this.cx = 0; this.cy += this.rowH + 2; this.rowH = 0; }
      if (this.cy + th > ATLAS) { this.map.clear(); this.cx = 0; this.cy = 0; this.rowH = 0; }
      this.cv.width = tw; this.cv.height = th;
      x.font = this.font; x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
      x.fillText(ch, PAD + l, PAD + asc);
      const a = x.getImageData(0, 0, tw, th).data, N = tw * th;
      const go = new Float64Array(N), gi = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const k = a[i * 4 + 3] / 255;
        go[i] = k === 1 ? 0 : k === 0 ? INF : Math.pow(Math.max(0, 0.5 - k), 2);
        gi[i] = k === 1 ? INF : k === 0 ? 0 : Math.pow(Math.max(0, k - 0.5), 2);
      }
      edt(go, tw, th, this.f, this.v, this.z); edt(gi, tw, th, this.f, this.v, this.z);
      const out = new Uint8Array(N);
      for (let i = 0; i < N; i++) { const d = Math.sqrt(go[i]) - Math.sqrt(gi[i]); out[i] = Math.max(0, Math.min(255, Math.round(255 * (0.5 + d / (2 * SPREAD))))); }
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, this.cx, this.cy, tw, th, gl.RED, gl.UNSIGNED_BYTE, out);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      g = {
        adv, hx: tw / 2 / GPX, hy: th / 2 / GPX,
        ox: (-l - PAD + tw / 2) / GPX, oy: -((-asc - PAD + th / 2) / GPX),
        uv: [this.cx / ATLAS, this.cy / ATLAS, (this.cx + tw) / ATLAS, (this.cy + th) / ATLAS],
      };
      this.cx += tw + 2; this.rowH = Math.max(this.rowH, th);
      this.map.set(ch, g);
      return g;
    }
  }

  // ---------------------------------------------------------------- shaders
  const ENV = `
uniform vec3 uLD[4], uLU[4], uLV[4], uLC[4]; uniform vec2 uLS[4]; uniform float uArtK, uRoom; uniform sampler2D uArt; uniform vec3 uSweep;
vec3 studio(vec3 d, float r) {
  vec3 c = mix(vec3(.0022, .0022, .0028), vec3(.011, .011, .013), smoothstep(-.3, .9, d.y)) * uRoom;
  // a big soft sweep in front of the set, so faces always have something to mirror
  c += uSweep * smoothstep(-.55, .15, d.y) * (1. - smoothstep(.45, .95, d.y)) * smoothstep(-.1, .7, d.z) * uRoom;
  float s = .012 + r * r * 1.1 + r * .06;
  for (int i = 0; i < 4; i++) {
    float k = dot(d, uLD[i]);
    if (k <= .04) continue;
    vec2 q = vec2(dot(d, uLU[i]), dot(d, uLV[i])) / k;
    vec2 hs = uLS[i];
    vec2 m2 = 1. - smoothstep(hs - s, hs + s, abs(q));
    float m = m2.x * m2.y * (hs.x * hs.y) / ((hs.x + s) * (hs.y + s));
    if (m <= 0.) continue;
    vec3 col = uLC[i];
    if (i == 0 && uArtK > 0.) col *= mix(vec3(1.), textureLod(uArt, clamp(q / hs * .5 + .5, 0., 1.), r * 7.).rgb * 1.7 + .12, uArtK);
    c += col * m;
  }
  return c;
}`;
  const VS = `#version 300 es
layout(location = 0) in vec3 aP;
uniform highp sampler2D uInst; uniform mat4 uVP; uniform float uMirror;
flat out int vId; out vec3 vW;
void main() {
  int id = gl_InstanceID;
  vec4 m0 = texelFetch(uInst, ivec2(0, id), 0), m1 = texelFetch(uInst, ivec2(1, id), 0), m2 = texelFetch(uInst, ivec2(2, id), 0);
  vec4 ex = texelFetch(uInst, ivec2(7, id), 0);
  vec4 lp = vec4(aP * (ex.xyz + ex.w), 1.);
  vec3 w = vec3(dot(m0, lp), dot(m1, lp), dot(m2, lp));
  if (uMirror > .5) w.y = -w.y;
  vW = w; vId = id;
  gl_Position = uVP * vec4(w, 1.);
}`;
  const FS = `
flat in int vId; in vec3 vW;
uniform highp sampler2D uInst; uniform sampler2D uAtlas;
uniform mat4 uVP; uniform vec3 uCam; uniform float uMirror, uPix, uMirK, uBlue, uDbg;
uniform vec3 uF0[2]; uniform vec4 uFP[2]; uniform vec4 uFX[2];
out vec4 o;
${ENV}
vec4 TL; vec4 EX; float BEV;
float sd2(vec2 p) {
  vec2 hs = EX.xy;
  vec2 q = clamp(p, -hs * .985, hs * .985);
  vec2 k = q / (2. * hs) + .5;
  vec2 uv = vec2(mix(TL.x, TL.z, k.x), mix(TL.w, TL.y, k.y));
  float v = textureLod(uAtlas, uv, 0.).r;
  return (v - .5) * ${(2 * SPREAD / GPX).toFixed(6)} + length(p - q);
}
float sdf(vec3 p) {
  float r = BEV;
  float d2 = sd2(p.xy) + r;
  vec2 w = vec2(d2, abs(p.z) - (EX.z - r));
  return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - r;
}
vec3 nrm(vec3 p) {
  const vec2 e = vec2(.0016, -.0016);
  return normalize(e.xyy * sdf(p + e.xyy) + e.yyx * sdf(p + e.yyx) + e.yxy * sdf(p + e.yxy) + e.xxx * sdf(p + e.xxx));
}
vec2 envAB(float r, float nv) {
  vec4 c0 = vec4(-1., -.0275, -.572, .022), c1 = vec4(1., .0425, 1.04, -.04);
  vec4 q = r * c0 + c1;
  float a = min(q.x * q.x, exp2(-9.28 * nv)) * q.x + q.y;
  return vec2(-1.04, 1.04) * a + q.zw;
}
void main() {
  vec4 m0 = texelFetch(uInst, ivec2(0, vId), 0), m1 = texelFetch(uInst, ivec2(1, vId), 0), m2 = texelFetch(uInst, ivec2(2, vId), 0);
  vec4 i0 = texelFetch(uInst, ivec2(3, vId), 0), i1 = texelFetch(uInst, ivec2(4, vId), 0), i2 = texelFetch(uInst, ivec2(5, vId), 0);
  TL = texelFetch(uInst, ivec2(6, vId), 0); EX = texelFetch(uInst, ivec2(7, vId), 0);
  vec4 MS = texelFetch(uInst, ivec2(8, vId), 0);
  BEV = MS.y;
  vec3 cam = uCam; vec3 wt = vW;
  if (uMirror > .5) { cam.y = -cam.y; wt.y = -wt.y; }
  vec4 c4 = vec4(cam, 1.), w4 = vec4(wt, 1.);
  vec3 ro = vec3(dot(i0, c4), dot(i1, c4), dot(i2, c4));
  vec3 tg = vec3(dot(i0, w4), dot(i1, w4), dot(i2, w4));
  vec3 rd = normalize(tg - ro);
  vec3 B = EX.xyz + EX.w;
  vec3 ird = 1. / rd;
  vec3 ta = (-B - ro) * ird, tb = (B - ro) * ird;
  vec3 tmin = min(ta, tb), tmax = max(ta, tb);
  float tN = max(max(tmin.x, tmin.y), tmin.z), tF = min(min(tmax.x, tmax.y), tmax.z);
  if (tF < 0. || tN > tF) discard;
  float t = max(tN, 0.);
  float best = 1e9, bt = t; bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float d = sdf(p);
    float rr = d / max(t, 1e-3);
    if (rr < best) { best = rr; bt = t; }
    if (d < max(.0004, uPix * t * .3)) { hit = true; break; }
    t += d * .92;
    if (t > tF) break;
  }
  float cov = hit ? 1. : 1. - smoothstep(0., uPix * 1.2, best);
  if (cov < .01) discard;
  if (!hit) t = bt;
  vec3 p = ro + rd * t;
  vec3 n = nrm(p);
  vec4 p4 = vec4(p, 1.);
  vec3 P = vec3(dot(m0, p4), dot(m1, p4), dot(m2, p4));
  float sc = length(m0.xyz);
  vec3 N = normalize(vec3(dot(m0.xyz, n), dot(m1.xyz, n), dot(m2.xyz, n)) / sc);
  vec3 Vd = normalize(cam - P);
  float nv = max(dot(N, Vd), 1e-3);
  vec3 R = reflect(-Vd, N);
  int fi = int(MS.z + .5);
  vec3 F0 = uF0[fi]; vec4 fp = uFP[fi]; vec4 fx = uFX[fi];
  // satin or brushed on the face, mirror on the bevel and the sides
  float face = smoothstep(.86, .97, abs(n.z));
  float rough = mix(fp.y, fp.x, face);
  float aniso = fp.z * face;
  vec3 col;
  if (uBlue > .5) {
    float edge = 1. - smoothstep(.2, .6, abs(abs(n.z) - .55) * 2.);
    col = vec3(.004, .012, .03) + vec3(.2, .6, 1.) * edge * 1.8;
  } else {
    vec3 spec;
    if (aniso > .01) {
      vec3 T = fp.w > 1.5 ? vec3(1., 0., 0.) : normalize(vec3(-p.y, p.x, 0.) + 1e-4);
      vec3 Tw = normalize(vec3(dot(m0.xyz, T), dot(m1.xyz, T), dot(m2.xyz, T)));
      // brushed metal: the reflection smeared along the grain, dithered so it never bands
      spec = vec3(0.);
      float jit = hash12(gl_FragCoord.xy) - .5;
      for (int k = 0; k < 8; k++) spec += studio(normalize(R + Tw * ((float(k) + jit) / 7. - .5) * aniso * (.3 + rough * .6)), rough * (1. - .35 * aniso) + .04);
      spec *= .125;
    } else spec = studio(R, rough);
    vec3 f0 = F0;
    // heat-tinted titanium: a thin film shifting with the angle
    if (fx.y > .01) f0 *= mix(vec3(1.), .55 + .55 * cos(6.2831 * (vec3(0., .33, .67) + nv * 1.4 + .15)), fx.y);
    vec2 ab = envAB(rough, nv);
    col = spec * (f0 * ab.x + ab.y);
    // lacquer: a dark base under a clear coat
    if (fx.x > .01) {
      float fc = .04 + .96 * pow(1. - nv, 5.);
      col = F0 * studio(N, 1.) * .9 + studio(R, .03) * fc * fx.x + col * .2;
    }
    // light that can't get into the letter's own corners
    float ao = 1.;
    for (int k = 1; k <= 3; k++) { float h = .018 * float(k); ao -= (h - sdf(p + n * h)) * pow(.5, float(k)) * 6.; }
    col *= clamp(ao, .25, 1.);
  }
  if (uDbg > .5) col = hit ? n * .5 + .5 : vec3(1., 0., 0.);
  float a = cov * MS.x;
  if (uMirror > .5) { col *= uMirK * exp(-max(P.y, 0.) * 1.6); }
  vec3 Pd = P; if (uMirror > .5) Pd.y = -Pd.y;
  vec4 cl = uVP * vec4(Pd, 1.);
  gl_FragDepth = hit ? clamp((cl.z / cl.w) * .5 + .5, 0., 1.) : 1.;
  o = vec4(col * a, a);
}`;
  // the room: dim walls, and a glossy floor with the studio in it, a pool of light and soft contact shadows
  const FS_BG = `
uniform mat4 uInvVP; uniform vec3 uCam; uniform vec3 uPool; uniform vec3 uPoolC; uniform vec3 uBack; uniform vec4 uSh[48]; uniform int uNS; uniform float uFloorK;
out vec4 o;
${ENV}
void main() {
  vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1.;
  vec4 a = uInvVP * vec4(ndc, -1., 1.), b = uInvVP * vec4(ndc, 1., 1.);
  vec3 ro = uCam, rd = normalize(b.xyz / b.w - a.xyz / a.w);
  vec3 col = studio(rd, .6) * .05 + uBack * exp(-abs(rd.y - .12) * 3.5) * smoothstep(-.2, .6, dot(normalize(rd.xz), normalize(uPool.xy - uCam.xz + 1e-4)));
  if (rd.y < 0. && ro.y > 0.) {
    float t = -ro.y / rd.y;
    vec3 P = ro + rd * t;
    vec3 R = reflect(rd, vec3(0., 1., 0.));
    float F = .04 + .96 * pow(1. - max(-rd.y, 0.), 5.);
    vec3 fl = vec3(.0035) + studio(R, .3) * F * .55 * uFloorK;
    fl += uPoolC * exp(-dot(P.xz - uPool.xy, P.xz - uPool.xy) * uPool.z);
    float sh = 1.;
    for (int i = 0; i < 48; i++) { if (i >= uNS) break; vec4 L = uSh[i]; vec2 d = P.xz - L.xy; sh *= 1. - .6 * exp(-dot(d, d) / (L.z * L.z)) * exp(-L.w * 1.4); }
    fl *= sh;
    col = mix(col, fl, exp(-t * .045));
  }
  o = vec4(col, 1.);
}`;
  const FS_TH = `uniform sampler2D uSrc; out vec4 o; void main() { vec3 c = texture(uSrc, gl_FragCoord.xy / uRes).rgb; o = vec4(max(c - 1.6, 0.) * .6, 1.); }`;
  const FS_ACC = `uniform sampler2D uSrc; uniform float uW; out vec4 o; void main() { o = texture(uSrc, gl_FragCoord.xy / uRes) * uW; }`;

  // ---------------------------------------------------------------- finishes
  const FIN = {
    chrome: { n: 'Polished chrome', f0: [0.97, 0.96, 0.94], rf: 0.07, re: 0.02, an: 0, am: 0 },
    satin: { n: 'Satin silver · circular brush', f0: [0.93, 0.92, 0.9], rf: 0.3, re: 0.03, an: 0.85, am: 1 },
    gold: { n: 'Brushed gold', f0: [1.0, 0.76, 0.36], rf: 0.26, re: 0.035, an: 0.7, am: 2 },
    gunmetal: { n: 'Gunmetal · satin', f0: [0.42, 0.43, 0.46], rf: 0.32, re: 0.05, an: 0.4, am: 2 },
    copper: { n: 'Spun copper', f0: [0.97, 0.62, 0.5], rf: 0.22, re: 0.03, an: 0.6, am: 1 },
    lacquer: { n: 'Black lacquer', f0: [0.014, 0.014, 0.016], rf: 0.06, re: 0.03, an: 0, am: 0, cc: 1 },
    titanium: { n: 'Heat-tinted titanium', f0: [0.62, 0.6, 0.64], rf: 0.16, re: 0.03, an: 0.3, am: 2, ir: 1 },
  };
  const PAIRS = [['satin', 'chrome'], ['chrome', 'gold'], ['gunmetal', 'chrome'], ['gold', 'titanium'], ['lacquer', 'chrome'], ['titanium', 'chrome'], ['copper', 'gunmetal'], ['satin', 'anod'], ['chrome', 'anod']];
  const FONTS = [
    { f: "400 GPXpx 'Oley Black', 'Arial Black', sans-serif", up: false },
    { f: "400 GPXpx 'Oley Heavy', Impact, sans-serif", up: true },
    { f: "800 GPXpx 'Oley Display', 'Oley Sans', sans-serif", up: false },
    { f: "400 GPXpx 'Oley Black', 'Arial Black', sans-serif", up: true },
  ];

  class Foundry {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-fd');
      this.ok = O.glSupported();
      this.lines = [];
      if (!this.ok) { this.fallback(); return; }
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; U.remove(G.canvas); this.fallback(); return; }
      const gl = (this.gl = G.gl);
      this.pL = G.program(FS, VS);
      this.pBg = G.program(FS_BG);
      this.pTh = G.program(FS_TH);
      this.pAcc = G.program(FS_ACC);
      this.post = new O.Post(G);
      this.rtS = G.target(4, 4); this.rtA = G.target(4, 4); this.rtT = G.target(4, 4);
      this.depth = gl.createRenderbuffer();
      // the cube each letter is ray-marched inside
      const c = [];
      const F = [[0, 1, 2, 3, [1, 0, 0]], [0, 1, 2, 3, [-1, 0, 0]]];
      void F;
      const corner = (x, y, z) => c.push(x, y, z);
      const quad = (a, b, cc, d) => { corner(...a); corner(...b); corner(...cc); corner(...a); corner(...cc); corner(...d); };
      const P = (x, y, z) => [x, y, z];
      quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)); quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1));
      quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)); quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1));
      quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)); quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1));
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(c), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      // per-letter data, a row of 9 texels each
      this.inst = gl.createTexture();
      this.instData = new Float32Array(9 * 4 * MAXI);
      gl.bindTexture(gl.TEXTURE_2D, this.inst);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 9, MAXI, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.Pm = new Float32Array(16); this.Vm = new Float32Array(16); this.VP = new Float32Array(16); this.IVP = new Float32Array(16);
      this.artT = this.solidTex([200, 200, 200]);
      this.glyphs = {};
      this.ov = U.el('canvas', 'fd-ov', ctx.root);
      this.ox = this.ov.getContext('2d');
      this.fontsOk = false;
      const fams = ['400 80px "Oley Black"', '400 80px "Oley Heavy"', '800 80px "Oley Display"', '500 80px "Oley Mono"'];
      Promise.all(fams.map((f) => document.fonts.load(f).catch(() => null))).then(() => { this.fontsOk = true; this.glyphs = {}; this.plan(); });
      setTimeout(() => { if (!this.fontsOk) { this.fontsOk = true; this.plan(); } }, 2500);
    }
    fallback() {
      const m = U.el('div', '', this.ctx.root);
      m.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:#ddd;font:500 2vmin var(--sans, sans-serif);text-align:center;padding:4vmin';
      m.textContent = 'Foundry needs WebGL2 (graphics acceleration). Pick another mode, or turn hardware acceleration on.';
    }
    solidTex(c) {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([c[0], c[1], c[2], 255]));
      return { tex: t };
    }
    glyphFor(font) {
      if (!this.glyphs[font]) this.glyphs[font] = new Glyphs(this.gl, font);
      return this.glyphs[font];
    }

    // ---------------------------------------------------------------- the song
    onTrack(tr) {
      const key = tr ? String(tr.id || tr.title || '') : '';
      if (key !== this.trackKey) {
        this.trackKey = key;
        if (O.params && O.params.has('fdseed')) this.salt = +O.params.get('fdseed') || 1;
        else {
          let m; try { m = JSON.parse(localStorage.getItem('oley.fd.plays') || '{}') || {}; } catch (e) { m = {}; }
          m[key] = (m[key] || 0) + 1; this.salt = m[key];
          try { localStorage.setItem('oley.fd.plays', JSON.stringify(m)); } catch (e) {}
        }
      }
      this.track = tr || null;
      this.plan();
    }
    onArt(url, img) {
      if (!this.gl) return;
      const gl = this.gl;
      if (img && (img.naturalWidth || img.width)) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img); } catch (e) {}
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (this.artT && this.artT.tex) gl.deleteTexture(this.artT.tex);
        this.artT = { tex: t };
        this.hasArt = true;
      }
      this.plan();
    }
    onLyrics() { this.plan(); }

    plan() {
      if (!this.ok || !this.fontsOk) return;
      const ctx = this.ctx, tl = ctx.tl, tr = this.track || {};
      const R = rng(hashS(this.trackKey || 'x') ^ Math.imul(this.salt || 1, 2654435761));
      // the song's look: a typeface, a pair of finishes, a studio
      const fo = R.pick(FONTS);
      this.font = fo.f.replace('GPX', GPX);
      this.upper = fo.up;
      const gl = this.glyphFor(this.font);
      const pair = R.pick(PAIRS), pal = ctx.palette;
      const anod = { n: 'Anodised', f0: pal ? lin(U.vivid(pal.vivid, 0.75, 0.75)).map((v) => Math.min(1, v * 1.1 + 0.04)) : [0.8, 0.2, 0.3], rf: 0.24, re: 0.04, an: 0.45, am: 2 };
      this.fin = pair.map((k) => (k === 'anod' ? anod : FIN[k]));
      this.blue = !!ctx.opts.blueprint;
      const tint = pal ? lin(U.vivid(pal.vivid, 0.6, 1)) : [1, 0.4, 0.5];
      const tint2 = pal ? lin(U.vivid(pal.second || pal.vivid, 0.45, 1)) : [0.4, 0.6, 1];
      this.studio = { tint, tint2, rot: R.r(0, PI * 2), side: R.sgn() };
      // the words: each line laid out in metal, letter by letter
      const ls = ((tl && tl.lines) || []).filter((L) => L.words && L.words.length);
      const lines = [];
      const mk = (words, t0, opts) => {
        const rows = [], maxC = 18;
        let row = [], n = 0;
        words.forEach((w) => { const s = w.s.length; if (row.length && n + 1 + s > maxC && rows.length < 2) { rows.push(row); row = []; n = 0; } row.push(w); n += s + (row.length > 1 ? 1 : 0); });
        if (row.length) rows.push(row);
        const letters = [], wordsOut = [];
        const sp = gl.measure(' ');
        let maxW = 0;
        const rowW = rows.map((r) => r.reduce((a, w) => a + w.chars.reduce((b, ch) => b + gl.measure(ch), 0), 0) + sp * (r.length - 1));
        maxW = Math.max(...rowW);
        rows.forEach((r, ri) => {
          let x = -rowW[ri] / 2;
          const y = 0.42 + (rows.length - 1 - ri) * 1.02;
          r.forEach((w) => {
            const x0 = x;
            w.chars.forEach((ch, ci) => {
              const adv = gl.measure(ch);
              if (ch.trim()) letters.push({ ch, x: x + adv / 2, y, w, ci, n: w.chars.length });
              x += adv;
            });
            wordsOut.push({ w, x0, x1: x, y, cx: (x0 + x) / 2 });
            x += sp;
          });
        });
        const L = Object.assign({ words: wordsOut, letters, W: maxW, H: rows.length * 1.02, rows: rows.length, t0 }, opts);
        letters.forEach((l, i) => { l.order = (l.y - 0.4) / Math.max(1, L.H) * 0.6 + (1 - Math.abs(l.x) / Math.max(1, maxW / 2)) * 0.4; l.j = i; l.seed = R(); l.lift = [R.r(-1, 1) * 2.4, R.r(0.4, 2.2), R.r(-1.6, 2.6)]; l.spin = [R.r(-3, 3), R.r(-3, 3), R.r(-2, 2)]; });
        lines.push(L);
        return L;
      };
      const wordsOf = (L) => L.words.map((w) => { const s = (this.upper ? (w.raw || w.bare).toUpperCase() : (w.raw || w.bare)).replace(/[“”"]/g, ''); return { s, chars: [...s], t: w.t, dur: w.dur || 0.3, key: !!w.key, raw: w.raw }; });
      const titleWords = (t) => String((tr.title || 'Oley') + (tr.artist ? ' — ' + tr.artist : '')).split(/\s+/).filter(Boolean).slice(0, 6).map((s, i) => { s = this.upper ? s.toUpperCase() : s; return { s, chars: [...s], t: t + 0.3 + i * 0.22, dur: 0.3, key: i === 0 }; });
      const FORMS = ['rebuild', 'drop', 'spin', 'rise', 'extrude'];
      const SHOTS = ['hero', 'close', 'track', 'around', 'descend', 'macro'];
      let lastShot = '', lastForm = '';
      const pickNot = (arr, not) => { let v = R.pick(arr); for (let k = 0; k < 4 && v === not; k++) v = R.pick(arr); return v; };
      const addLine = (words, t0, tSung, title) => {
        const form = pickNot(FORMS, lastForm), shot = pickNot(SHOTS, lastShot);
        lastForm = form; lastShot = shot;
        return mk(words, t0, { form, shot, tSung, title, az: R.sgn() * R.r(14, 34) });
      };
      if (!ls.length) {
        const end = Math.max((tl && tl.duration) || 0, 600);
        for (let t = 0; t < end; t += 9) addLine(titleWords(t), t, t + 2.5, true);
      } else {
        if (ls[0].t > 4) addLine(titleWords(0), 0, 2.5, true);
        ls.forEach((L, i) => {
          const ws = wordsOf(L);
          const last = ws[ws.length - 1];
          const sung = last.t + Math.min(0.6, last.dur);
          addLine(ws, ws[0].t - 0.55, sung, false);
          const nx = ls[i + 1];
          if (nx && nx.t - sung > 8) addLine(titleWords(sung + 3), sung + 3, sung + 5.5, true);
        });
      }
      // where each line stands: further into the studio each time, left and right
      lines.forEach((L, i) => {
        L.i = i;
        L.fw = L.words[0].w.t;
      });
      lines.forEach((L, i) => {
        L.P = [i ? (i % 2 ? 1 : -1) * R.r(1.2, 3.2) : 0, 0, -i * R.r(5.5, 7)];
        const nx = lines[i + 1];
        // hold the line until it's done, blow it apart while it's still in shot, then fly
        L.tExit = nx ? U.clamp(nx.fw - 0.8, L.tSung + 0.1, L.tSung + 2.6) : L.tSung + 3;
        L.apart = L.tExit - L.tSung > 1.5 ? [L.tSung + 0.2, L.tExit - 0.15] : null;
        L.tEnd = L.tExit + 1.0;
        L.exit = R.pick(['explode', 'explode', 'sweep', 'scatter']);
        const kw = L.words.find((w) => w.w.key) || L.words.reduce((a, b) => (b.w.s.length > a.w.s.length ? b : a), L.words[0]);
        L.key = kw;
        L.cues = this.cues(L, R);
      });
      // the camera's whole script, in order
      // each line's cues stop where the next line's start, so the camera never doubles back
      const cues = [];
      lines.forEach((L, i) => { const nx = lines[i + 1]; const lim = nx ? nx.cues[0].t - 0.3 : 1e9; cues.push(...L.cues.filter((c, k) => k === 0 || c.t < lim)); });
      cues.sort((a, b) => a.t - b.t);
      for (let i = 1; i < cues.length; i++) if (cues[i].t - cues[i - 1].t < 0.18) { cues.splice(i, 1); i--; }
      this.cueList = cues;
      this.lines = lines;
      // warm the glyphs up front so nothing hitches mid-song
      this.pending = new Set();
      lines.forEach((L) => L.letters.forEach((l) => this.pending.add(l.ch)));
      this.gl_ = gl;
    }
    // frame by size, not distance: each cue says how much of the scene must fit across the screen
    cues(L, R) {
      const P = L.P, C = [P[0], P[1] + 0.42 + (L.H - 1.02) / 2 + 0.36, P[2]];
      const at = (w) => [P[0] + w.cx, P[1] + w.y + 0.36, P[2]];
      const W = Math.max(2.2, L.W), a = L.az, t0 = L.fw - 0.15, ts = Math.max(L.tSung, t0 + 0.6), te = L.tExit;
      const kw = L.key, tk = kw.w.t;
      const q = (t, tgt, size, az, pol, roll) => ({ t, tgt, size, az, pol, roll: roll || 0 });
      const out = [];
      switch (L.shot) {
        case 'hero': out.push(q(t0, C, W * 1.25, a, 12), q(tk, C, W * 1.08, a * 0.45, 8), q(ts + 0.3, C, W * 1.3, -a * 0.35, 15)); break;
        case 'close': out.push(q(t0, C, W * 1.2, a, 10), q(tk - 0.12, at(kw), Math.max(1.1, (kw.x1 - kw.x0) * 1.7), -a * 0.3, 4), q(Math.max(tk + 0.9, ts), C, W * 1.15, a * 0.6, 12)); break;
        case 'track': L.words.forEach((w) => out.push(q(w.w.t - 0.1, at(w), Math.max(2.2, (w.x1 - w.x0) * 2.4, W * 0.5), a, 6))); out.push(q(ts + 0.25, C, W * 1.2, a * 0.5, 12)); out[0].t = Math.min(out[0].t, t0 + 0.35); break;
        case 'around': out.push(q(t0, C, W * 1.3, -Math.sign(a) * 48, 9), q((t0 + ts) / 2, C, W * 1.15, 0, 20), q(ts + 0.3, C, W * 1.3, Math.sign(a) * 48, 10)); break;
        case 'descend': out.push(q(t0, C, W * 1.35, a * 0.5, 36), q(ts, C, W * 1.15, a, 6)); break;
        default: { const f = L.letters[0]; const fp = f ? [P[0] + f.x, P[1] + f.y + 0.3, P[2]] : C; out.push(q(t0, fp, 1.0, Math.sign(a) * 58, 3), q(t0 + (ts - t0) * 0.6 + 0.3, C, W * 1.15, a * 0.6, 10)); }
      }
      if (L.apart) { const s = Math.sign(a) || 1; out.push(q(L.apart[0] + 0.7, C, W * 1.45, -s * 42, 18), q(L.apart[1], C, W * 1.35, -s * 22, 12)); }
      out.push(q(te + 0.12, C, W * 1.35, -a * 0.6, 13));
      for (let k = 1; k < out.length; k++) if (out[k].t <= out[k - 1].t + 0.2) out[k].t = out[k - 1].t + 0.2;
      return out;
    }
    camAt(t) {
      const cs = this.cueList, asp = this.asp || 16 / 9;
      const fov = 30 * PI / 180, fx = 2 * Math.atan(Math.tan(fov / 2) * asp);
      let c;
      if (!cs || !cs.length) c = { tgt: [0, 0.8, 0], size: 6, az: 20, pol: 10, roll: 0 };
      else {
        let i = 0;
        while (i < cs.length - 1 && cs[i + 1].t <= t) i++;
        const a = cs[i], b = cs[i + 1];
        if (!b || t <= a.t) c = a;
        else {
          const k = ease((t - a.t) / Math.max(0.05, b.t - a.t));
          c = { tgt: V.lerp(a.tgt, b.tgt, k), size: Math.exp(U.lerp(Math.log(a.size), Math.log(b.size), k)), az: U.lerp(a.az, b.az, k), pol: U.lerp(a.pol, b.pol, k), roll: U.lerp(a.roll, b.roll, k) };
        }
      }
      // never quite still
      const az = (c.az + 2.4 * Math.sin(t * 0.21) + 1.2 * Math.sin(t * 0.53)) * PI / 180, pol = (c.pol + 1.4 * Math.sin(t * 0.17)) * PI / 180;
      // oblique shots bring the near end closer, so give them more room
      const d = (c.size * (1 + 0.38 * Math.abs(Math.sin(az)))) / 2 / Math.tan(fx / 2) / 0.86;
      const pos = [c.tgt[0] + d * Math.sin(az) * Math.cos(pol), Math.max(0.12, c.tgt[1] + d * Math.sin(pol)), c.tgt[2] + d * Math.cos(az) * Math.cos(pol)];
      return { pos, tgt: c.tgt, fov, roll: c.roll || 0, d };
    }
    // a letter at time t: forming when it's sung, an exploded view while the line holds, gone when it leaves
    pose(L, l, t) {
      const w = l.w;
      const tf = w.t + (l.ci / Math.max(1, l.n)) * Math.min(0.32, w.dur * 0.8) - 0.04;
      const dF = 0.42;
      let k = U.sat((t - (tf - dF)) / dF);
      if (t < tf - dF) return null;
      const e = out3(k), f = 1 - e;
      let p = [l.x, l.y, 0], r = [0, 0, 0], s = 1, dz = 1, a = 1;
      switch (L.form) {
        case 'rebuild': p = V.add(p, V.mul(l.lift, f * 1.4)); r = V.mul(l.spin, f); break;
        case 'drop': { const b = k < 1 ? 1 - Math.abs(Math.cos(k * PI * 1.5)) * Math.pow(1 - k, 2) : 1; p[1] += 3.2 * (1 - b) * (k < 0.33 ? 1 : 0.3); r[0] = f * 0.6; break; }
        case 'spin': r[1] = f * PI * 2 * (l.seed < 0.5 ? 1 : -1); s = 0.4 + 0.6 * e; break;
        case 'rise': p[2] -= 3.5 * f; p[1] -= 0.6 * f; r[0] = -f * 1.4; break;
        default: dz = Math.max(0.04, e); r[0] = -f * PI / 2; p[1] += f * 0.35; break;
      }
      if (k < 0.15) a = k / 0.15;
      // a little life
      p[1] += Math.sin(t * 1.3 + l.j * 0.7) * 0.012;
      if (w.key && t > w.t) s *= 1 + 0.08 * Math.exp(-(t - w.t) * 5);
      // exploded view: parts lift apart in order, keep their faces to us so they stay readable
      if (L.apart) {
        const ap = ease((t - L.apart[0]) / 0.8) * (1 - ease((t - (L.apart[1] - 0.1)) / 0.5) * 0);
        if (ap > 0) { p = V.add(p, [l.x * 0.18 * ap, (l.order - 0.5) * 0.7 * ap, (l.order - 0.4) * 2.2 * ap]); r[1] += (l.seed - 0.5) * 0.5 * ap; }
      }
      // leaving: top parts go first
      const delay = (1 - l.order) * 0.3;
      const kx = U.sat((t - (L.tExit + delay)) / 0.7);
      if (kx > 0) {
        const ex = in2(kx);
        if (L.exit === 'sweep') { p[0] += ex * (6 + l.seed * 3) * (L.az > 0 ? -1 : 1); r[1] += ex * 1.5; }
        else if (L.exit === 'scatter') { p = V.add(p, [l.lift[0] * ex * 1.5, ex * 4.5 * (0.5 + l.seed), l.lift[2] * ex]); r = V.add(r, V.mul(l.spin, ex)); }
        else { p = V.add(p, V.mul(l.lift, ex * 2.6)); p[2] += ex * 3; r = V.add(r, V.mul(l.spin, ex * 1.4)); }
        s *= 1 - ex * 0.5;
        a *= 1 - U.sat((kx - 0.6) / 0.4);
      }
      if (a <= 0.003) return null;
      return { p: V.add(p, L.P), r, s, dz, a };
    }
    // write every visible letter's matrix, inverse, glyph and finish
    fill(t) {
      const D = this.instData;
      let n = 0;
      const shadows = [];
      this.vis = [];
      for (const L of this.lines) {
        if (t < L.t0 - 0.6 || t > L.tEnd) continue;
        this.vis.push(L);
        const gly = this.gl_;
        for (const l of L.letters) {
          if (n >= MAXI) break;
          const ps = this.pose(L, l, t);
          if (!ps) continue;
          const g = gly.get(l.ch);
          if (g.empty) continue;
          const [rx, ry, rz] = ps.r;
          const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
          // R = Ry·Rx·Rz
          const R00 = cy * cz + sy * sx * sz, R01 = -cy * sz + sy * sx * cz, R02 = sy * cx;
          const R10 = cx * sz, R11 = cx * cz, R12 = -sx;
          const R20 = -sy * cz + cy * sx * sz, R21 = sy * sz + cy * sx * cz, R22 = cy * cx;
          const s = ps.s;
          // the glyph tile's centre sits off the pen position
          const off = [g.ox - g.adv / 2, g.oy, 0];
          const T = [ps.p[0] + (R00 * off[0] + R01 * off[1]) * s, ps.p[1] + (R10 * off[0] + R11 * off[1]) * s, ps.p[2] + (R20 * off[0] + R21 * off[1]) * s];
          const o = n * 36;
          D[o] = R00 * s; D[o + 1] = R01 * s; D[o + 2] = R02 * s; D[o + 3] = T[0];
          D[o + 4] = R10 * s; D[o + 5] = R11 * s; D[o + 6] = R12 * s; D[o + 7] = T[1];
          D[o + 8] = R20 * s; D[o + 9] = R21 * s; D[o + 10] = R22 * s; D[o + 11] = T[2];
          const is = 1 / s;
          D[o + 12] = R00 * is; D[o + 13] = R10 * is; D[o + 14] = R20 * is; D[o + 15] = -(R00 * T[0] + R10 * T[1] + R20 * T[2]) * is;
          D[o + 16] = R01 * is; D[o + 17] = R11 * is; D[o + 18] = R21 * is; D[o + 19] = -(R01 * T[0] + R11 * T[1] + R21 * T[2]) * is;
          D[o + 20] = R02 * is; D[o + 21] = R12 * is; D[o + 22] = R22 * is; D[o + 23] = -(R02 * T[0] + R12 * T[1] + R22 * T[2]) * is;
          D[o + 24] = g.uv[0]; D[o + 25] = g.uv[1]; D[o + 26] = g.uv[2]; D[o + 27] = g.uv[3];
          const hz = 0.115 * ps.dz;
          D[o + 28] = g.hx; D[o + 29] = g.hy; D[o + 30] = hz; D[o + 31] = 0.03;
          D[o + 32] = ps.a; D[o + 33] = Math.min(0.024, hz * 0.6); D[o + 34] = l.w.key ? 1 : 0; D[o + 35] = s;
          n++;
          if (l.ci === 0 || l.ci === l.n - 1) shadows.push([T[0], T[2], 0.42 * s, Math.max(0, T[1] - 0.45)]);
        }
      }
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.inst);
      if (n) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 9, n, gl.RGBA, gl.FLOAT, D.subarray(0, n * 36));
      this.n = n;
      this.shadows = shadows.slice(0, 48);
    }
    // the studio, turning slowly and pushing on the beat
    lights(t) {
      const st = this.studio, pulse = this.pulse || 0;
      const rot = Math.sin(t * 0.05 + st.rot) * 0.35 + Math.sin(t * 0.13) * 0.12;
      const dir = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
      const frame = (d) => { const u = V.norm(V.cross([0, 1, 0], d)); const v = V.cross(d, u); return [u, v]; };
      const Ls = [
        { d: dir(rot + 0.5 * st.side, 0.3), s: [0.62, 0.46], c: V.mul([1, 0.97, 0.93], 4.6 * (1 + pulse * 0.35)) },
        { d: dir(rot - 1.25, 0.08), s: [0.07, 1.1], c: V.mul(st.tint, 6.5) },
        { d: dir(rot + 1.25, 0.12), s: [0.06, 1.0], c: V.mul(st.tint2, 5.5) },
        { d: dir(rot + Math.sin(t * 0.7) * 0.9, 1.15), s: [1.2, 0.16], c: V.mul([1, 1, 1], 1.6 + pulse * 2.5) },
      ];
      const f = (k) => Ls.flatMap((l) => l[k]);
      const UVs = Ls.map((l) => frame(l.d));
      return { LD: f('d'), LU: UVs.flatMap((x) => x[0]), LV: UVs.flatMap((x) => x[1]), LS: f('s'), LC: f('c') };
    }
    render(t, target) {
      const G = this.G, gl = this.gl;
      const cam = this.camAt(t);
      const up = [Math.sin(cam.roll * PI / 180), Math.cos(cam.roll * PI / 180), 0];
      persp(cam.fov, this.asp, 0.03, 200, this.Pm);
      look(cam.pos, cam.tgt, up, this.Vm);
      mm(this.Pm, this.Vm, this.VP);
      inv4(this.VP, this.IVP);
      this.cam = cam;
      this.fill(t);
      const Lt = this.lights(t);
      const env = { uLD: Lt.LD, uLU: Lt.LU, uLV: Lt.LV, uLS: Lt.LS, uLC: Lt.LC, uArtK: this.hasArt ? 0.85 : 0, uRoom: 1, uArt: this.artT, uSweep: V.mul([0.62, 0.62, 0.66], 1.1 + (this.pulse || 0) * 0.2) };
      const cur = this.vis && this.vis.length ? this.vis[this.vis.length - 1] : null;
      const pool = cur ? [cur.P[0], cur.P[2], 0.06] : [0, 0, 0.06];
      const sh = new Float32Array(48 * 4);
      (this.shadows || []).forEach((s, i) => sh.set(s, i * 4));
      // room and floor
      G.draw(this.pBg, Object.assign({ uInvVP: this.IVP, uCam: cam.pos, uPool: pool, uPoolC: V.mul(this.studio.tint, 0.02), uBack: V.mul(V.lerp(this.studio.tint, [1, 1, 1], 0.6), 0.035), uSh: sh, uNS: (this.shadows || []).length, uFloorK: 1 }, env), target);
      if (!this.n) return;
      // the letters, once in the floor and once for real
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
      gl.viewport(0, 0, target.w, target.h);
      gl.useProgram(this.pL.p);
      const fin = this.fin;
      const pix = (2 * Math.tan(cam.fov / 2)) / target.h;
      const base = Object.assign({ uInst: { tex: this.inst }, uAtlas: { tex: this.gl_.tex }, uVP: this.VP, uCam: cam.pos, uPix: pix, uMirK: 0.15, uBlue: this.blue ? 1 : 0, uDbg: O.params && O.params.has('fddbg') ? 1 : 0,
        uF0: fin.flatMap((f) => f.f0), uFP: fin.flatMap((f) => [f.rf, f.re, f.an, f.am]), uFX: fin.flatMap((f) => [f.cc || 0, f.ir || 0, 0, 0]) }, env);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
      gl.enable(gl.BLEND);
      gl.bindVertexArray(this.vao);
      for (const mir of [1, 0]) {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        if (mir) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        // mirrored geometry flips the winding
        gl.cullFace(mir ? gl.BACK : gl.FRONT);
        G.setUniforms(this.pL, Object.assign({ uMirror: mir }, base), [target.w, target.h]);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.n);
      }
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
    }
    frame(t, dt, A) {
      if (!this.ok || !this.lines.length) { if (this.G) this.G.clear(null, 0, 0, 0, 1); return; }
      const ctx = this.ctx, G = this.G, gl = this.gl;
      // glyphs not made yet: a few a frame, before they're needed
      if (this.pending && this.pending.size) { let k = 0; for (const ch of this.pending) { this.gl_.get(ch); this.pending.delete(ch); if (++k > 6) break; } }
      const s = O.glScale(ctx, true);
      if (G.size(ctx.W * s, ctx.H * s) || !this.dW || this.dW !== G.w || this.dH !== G.h) {
        for (const T of [this.rtS, this.rtA, this.rtT]) G.resizeTarget(T, G.w, G.h);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, G.w, G.h);
        this.dW = G.w; this.dH = G.h;
        const r = ctx.root.getBoundingClientRect();
        this.ov.width = Math.round(r.width * (window.devicePixelRatio || 1)); this.ov.height = Math.round(r.height * (window.devicePixelRatio || 1));
      }
      this.asp = G.w / Math.max(1, G.h);
      this.pulse = A ? U.sat(A.pulse) : 0;
      // motion blur: sub-frames along the real path when the camera or the letters move fast
      const c1 = this.camAt(t), c0 = this.camAt(t - 1 / 120);
      const f1 = V.norm(V.sub(c1.tgt, c1.pos)), f0 = V.norm(V.sub(c0.tgt, c0.pos));
      const ang = Math.acos(U.clamp(V.dot(f1, f0), -1, 1)) * 120 + (V.dist ? 0 : Math.hypot(...V.sub(c1.pos, c0.pos)) * 120 / Math.max(0.5, c1.d));
      let busy = false;
      for (const L of this.lines) if (t > L.t0 - 0.5 && t < L.tEnd) { for (const w of L.words) if (t > w.w.t - 0.5 && t < w.w.t + 0.4) busy = true; if (t > L.tExit - 0.05 && t < L.tExit + 1) busy = true; }
      const px = ang * (1 / 48) * G.h / c1.fov;
      const perf = ctx.settings.perf, maxSub = perf === 'light' ? 2 : perf === 'smooth' ? 10 : 7;
      // adaptive quality: if frames run long, fewer sub-frames first
      if (dt > 0.024 && dt < 0.5) this.slow = (this.slow || 0) + 1; else this.slow = Math.max(0, (this.slow || 0) - 2);
      if (this.slow > 45) { this.cap = Math.max(1, (this.cap || maxSub) - 1); this.slow = 0; }
      const K = U.clamp(Math.max(Math.ceil(px / 6), busy ? 3 : 1), 1, Math.min(maxSub, this.cap || maxSub));
      const shutter = 1 / 48;
      if (K === 1) this.render(t, this.rtA);
      else {
        G.clear(this.rtA, 0, 0, 0, 0);
        for (let k = 0; k < K; k++) {
          this.render(t - shutter * (1 - (k + 0.5) / K), this.rtS);
          G.draw(this.pAcc, { uSrc: this.rtS, uW: 1 / K }, this.rtA, { blend: 'add' });
        }
      }
      // bloom only on the glints, then ACES, grain
      G.draw(this.pTh, { uSrc: this.rtA }, this.rtT);
      this.post.run(this.rtA, { bloomSrc: this.rtT, time: t, aces: 1, exposure: 1.25, bloom: 0, glow: 0.42, halation: 0.04, vig: 0.42, grain: 0.04, ca: 0.0016, contrast: 1.04, sat: 1.02, clip: 0.9, radius: 1.2 }, null);
      this.drawLabels(t);
      this.stats = { K, n: this.n };
    }
    // two columns of callouts with leader lines, like an exploded product shot
    drawLabels(t) {
      const x = this.ox, W = this.ov.width, H = this.ov.height;
      x.clearRect(0, 0, W, H);
      if (this.ctx.opts.callouts === false) return;
      const k = Math.max(1, H / 900);
      const mono = (px, wt) => `${wt || 500} ${Math.round(px * k)}px 'Oley Mono', Consolas, monospace`;
      const tr = this.track || {};
      // corner marks
      x.fillStyle = 'rgba(235,235,240,0.55)'; x.font = mono(12, 600); x.textBaseline = 'top';
      const cur = this.vis && this.vis.length ? this.vis[this.vis.length - 1] : null;
      x.fillText('FOUNDRY · ' + String(tr.title || '').toUpperCase().slice(0, 30), 28 * k, 26 * k);
      x.textAlign = 'right';
      x.fillText((this.fin[0] && this.fin[0].n.toUpperCase()) + '  /  ' + (this.fin[1] && this.fin[1].n.toUpperCase()), W - 28 * k, 26 * k);
      if (cur) { x.textBaseline = 'bottom'; x.fillText('LINE ' + String(cur.i + 1).padStart(2, '0') + ' / ' + String(this.lines.length).padStart(2, '0'), W - 28 * k, H - 24 * k); }
      x.textAlign = 'left';
      x.fillStyle = 'rgba(255,40,60,0.9)'; x.beginPath(); x.arc(20 * k, 33 * k, 3.2 * k, 0, PI * 2); x.fill();
      if (!cur || !cur.apart) return;
      const ap = ease((t - cur.apart[0] - 0.5) / 0.5) * (1 - ease((t - cur.tExit + 0.05) / 0.25));
      if (ap <= 0.01) return;
      const pts = [];
      cur.words.forEach((w, i) => {
        const l = cur.letters.find((q) => q.w === w.w);
        const ps = l && this.pose(cur, l, t);
        if (!ps) return;
        const v = [ps.p[0] + (w.cx - l.x), ps.p[1] + 0.36, ps.p[2]];
        const M = this.VP;
        const cx = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], cy = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], cw = M[3] * v[0] + M[7] * v[1] + M[11] * v[2] + M[15];
        if (cw <= 0) return;
        pts.push({ i, s: w.w.s, sx: (cx / cw * 0.5 + 0.5) * W, sy: (1 - (cy / cw * 0.5 + 0.5)) * H });
      });
      const left = pts.filter((p) => p.sx < W / 2).sort((a, b) => a.sy - b.sy), right = pts.filter((p) => p.sx >= W / 2).sort((a, b) => a.sy - b.sy);
      x.globalAlpha = ap;
      x.lineWidth = 1 * k; x.strokeStyle = 'rgba(235,235,240,0.7)';
      [[left, 70 * k, 'left'], [right, W - 70 * k, 'right']].forEach(([col, X, al]) => {
        const gap = 46 * k, y0 = H / 2 - ((col.length - 1) * gap) / 2;
        col.forEach((p, j) => {
          const y = y0 + j * gap;
          x.beginPath(); x.moveTo(p.sx, p.sy); x.lineTo(X + (al === 'left' ? 150 * k : -150 * k), y); x.lineTo(X + (al === 'left' ? 140 * k : -140 * k), y); x.stroke();
          x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(p.sx, p.sy, 2.6 * k, 0, PI * 2); x.fill();
          x.textAlign = al; x.textBaseline = 'middle';
          x.fillStyle = 'rgba(255,40,60,0.95)'; x.font = mono(11, 700); x.fillText(String(p.i + 1).padStart(2, '0'), X, y - 9 * k);
          x.fillStyle = 'rgba(240,240,245,0.92)'; x.font = mono(13, 600); x.fillText(p.s.toUpperCase().slice(0, 18), X, y + 8 * k);
        });
      });
      x.globalAlpha = 1; x.textAlign = 'left';
    }
    onResize() { this.dW = 0; }
    destroy() {
      if (!this.G) return;
      try { const l = this.gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {}
      U.remove(this.G.canvas); U.remove(this.ov);
      this.gl = null;
    }
  }

  O.registerMode('foundry', Foundry, { label: 'Foundry', glow: false });
})();
