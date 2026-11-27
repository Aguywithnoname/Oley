/* Oley R3: a small physically-based 3D renderer on WebGL2, built for filmed-looking lyric scenes.
   Procedural meshes (rounded boxes, planes, cylinders, spheres) with instancing; GGX lighting from
   spot and point lights with soft (PCF) shadows; reflections from a probe cubemap of the room;
   4x MSAA in HDR; true motion blur by accumulating sub-frames across a film shutter; bokeh depth of
   field from a thin-lens camera; then the shared bloom + filmic finish (O.Post). */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const HEAD = O.GLSL.HEAD, LIB = O.GLSL.LIB;

  // ================================================================ math (column-major mat4)
  const V3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  };
  const M4 = {
    I(o) { o = o || new Float32Array(16); o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
    mul(a, b, o) {
      o = o || new Float32Array(16);
      const r = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let w = 0; w < 4; w++) r[c * 4 + w] = a[w] * b[c * 4] + a[4 + w] * b[c * 4 + 1] + a[8 + w] * b[c * 4 + 2] + a[12 + w] * b[c * 4 + 3];
      o.set(r);
      return o;
    },
    persp(fovy, asp, n, f, o) {
      o = o || new Float32Array(16); o.fill(0);
      const t = 1 / Math.tan(fovy / 2);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
      return o;
    },
    look(eye, at, up, o) {
      o = o || new Float32Array(16);
      const z = V3.norm(V3.sub(eye, at)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
      o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0;
      o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
      o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0;
      o[12] = -V3.dot(x, eye); o[13] = -V3.dot(y, eye); o[14] = -V3.dot(z, eye); o[15] = 1;
      return o;
    },
    // translation, rotation (radians: R = Ry·Rx·Rz) and uniform scale
    trs(p, r, s, o) {
      o = o || new Float32Array(16);
      const [rx, ry, rz] = r || [0, 0, 0];
      const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
      const k = s == null ? 1 : s;
      // columns of Ry*Rx*Rz
      const m00 = cy * cz + sy * sx * sz, m01 = cx * sz, m02 = -sy * cz + cy * sx * sz;
      const m10 = -cy * sz + sy * sx * cz, m11 = cx * cz, m12 = sy * sz + cy * sx * cz;
      const m20 = sy * cx, m21 = -sx, m22 = cy * cx;
      o[0] = m00 * k; o[1] = m01 * k; o[2] = m02 * k; o[3] = 0;
      o[4] = m10 * k; o[5] = m11 * k; o[6] = m12 * k; o[7] = 0;
      o[8] = m20 * k; o[9] = m21 * k; o[10] = m22 * k; o[11] = 0;
      o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1;
      return o;
    },
    apply(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
    dir(m, p) { return V3.norm([m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]); },
  };

  // ================================================================ geometry
  function geo(p, n, u, i) { return { p: new Float32Array(p), n: new Float32Array(n), u: new Float32Array(u), i: p.length / 3 > 65000 ? new Uint32Array(i) : new Uint16Array(i) }; }
  function axisCoords(H, r, k, m) {
    const out = [];
    if (r <= 0 || k <= 0) { for (let i = 0; i <= m; i++) out.push(-H + (2 * H * i) / m); return out; }
    for (let i = 0; i <= k; i++) out.push(-(H - r) - r * Math.cos((i / k) * Math.PI * 0.5));
    for (let i = 1; i < m; i++) out.push(-(H - r) + (2 * (H - r) * i) / m);
    for (let i = 0; i <= k; i++) out.push(H - r + r * Math.sin((i / k) * Math.PI * 0.5));
    return out;
  }
  const FACES = [
    { n: 0, s: 1, u: [2, -1], v: [1, 1] }, { n: 0, s: -1, u: [2, 1], v: [1, 1] },
    { n: 1, s: 1, u: [0, 1], v: [2, -1] }, { n: 1, s: -1, u: [0, 1], v: [2, 1] },
    { n: 2, s: 1, u: [0, 1], v: [1, 1] }, { n: 2, s: -1, u: [0, -1], v: [1, 1] },
  ];
  const Geo = {
    // a box with rounded edges (r) and smooth normals; faces: [+x,-x,+y,-y,+z,-z] can be skipped
    rbox(w, h, d, r, k, o) {
      o = o || {};
      const H = [w / 2, h / 2, d / 2];
      r = Math.min(r || 0, H[0] * 0.999, H[1] * 0.999, H[2] * 0.999);
      k = r > 0 ? k || 4 : 0;
      const mid = o.mid || 1;
      const inner = [H[0] - r, H[1] - r, H[2] - r];
      const P = [], N = [], UV = [], I = [];
      FACES.forEach((F, fi) => {
        if (o.skip && o.skip.includes(fi)) return;
        const ua = F.u[0], va = F.v[0];
        const uc = axisCoords(H[ua], r, k, mid), vc = axisCoords(H[va], r, k, mid);
        const base = P.length / 3;
        for (let j = 0; j < vc.length; j++) for (let i = 0; i < uc.length; i++) {
          const p = [0, 0, 0];
          p[F.n] = F.s * H[F.n];
          p[ua] = F.u[1] * uc[i];
          p[va] = F.v[1] * vc[j];
          const c = [U.clamp(p[0], -inner[0], inner[0]), U.clamp(p[1], -inner[1], inner[1]), U.clamp(p[2], -inner[2], inner[2])];
          const dv = V3.sub(p, c), dl = V3.len(dv);
          let q, nn;
          if (dl < 1e-7 || r <= 0) { q = p; nn = [0, 0, 0]; nn[F.n] = F.s; }
          else { nn = V3.mul(dv, 1 / dl); q = V3.add(c, V3.mul(nn, r)); }
          P.push(q[0], q[1], q[2]); N.push(nn[0], nn[1], nn[2]);
          UV.push((uc[i] + H[ua]) / (2 * H[ua]), (vc[j] + H[va]) / (2 * H[va]));
        }
        const cols = uc.length;
        for (let j = 0; j < vc.length - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = base + j * cols + i, b = a + 1, c = a + cols + 1, dd = a + cols;
          I.push(a, b, c, a, c, dd);
        }
      });
      return geo(P, N, UV, I);
    },
    box(w, h, d) { return Geo.rbox(w, h, d, 0, 0, { mid: 1 }); },
    // a plane in XY facing +z; bend(x, y) -> z offset for curls (normals recomputed)
    plane(w, h, sx, sy, bend) {
      sx = sx || 1; sy = sy || 1;
      const P = [], N = [], UV = [], I = [];
      const z = (x, y) => (bend ? bend(x, y) : 0);
      for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
        const x = -w / 2 + (w * i) / sx, y = -h / 2 + (h * j) / sy;
        P.push(x, y, z(x, y));
        if (bend) { const e = Math.min(w, h) * 0.002; const dx = (z(x + e, y) - z(x - e, y)) / (2 * e), dy = (z(x, y + e) - z(x, y - e)) / (2 * e); const n = V3.norm([-dx, -dy, 1]); N.push(n[0], n[1], n[2]); }
        else N.push(0, 0, 1);
        UV.push(i / sx, j / sy);
      }
      for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) { const a = j * (sx + 1) + i; I.push(a, a + 1, a + sx + 2, a, a + sx + 2, a + sx + 1); }
      return geo(P, N, UV, I);
    },
    cyl(r, h, seg, caps, r2) {
      seg = seg || 32; r2 = r2 == null ? r : r2;
      const P = [], N = [], UV = [], I = [];
      const sl = (r - r2) / h;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        const n = V3.norm([c, sl, -s]);
        P.push(c * r, -h / 2, -s * r, c * r2, h / 2, -s * r2);
        N.push(n[0], n[1], n[2], n[0], n[1], n[2]);
        UV.push(i / seg, 0, i / seg, 1);
      }
      for (let i = 0; i < seg; i++) { const a = i * 2; I.push(a, a + 2, a + 3, a, a + 3, a + 1); }
      if (caps !== false) {
        for (const [y, rr, ny] of [[h / 2, r2, 1], [-h / 2, r, -1]]) {
          const c0 = P.length / 3;
          P.push(0, y, 0); N.push(0, ny, 0); UV.push(0.5, 0.5);
          for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; P.push(Math.cos(a) * rr, y, -Math.sin(a) * rr); N.push(0, ny, 0); UV.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5); }
          for (let i = 0; i < seg; i++) I.push(c0, c0 + 1 + i, c0 + 2 + i);
        }
      }
      return geo(P, N, UV, I);
    },
    // a ring around the z axis (arc < 2π gives a part ring, e.g. a mug handle)
    torus(R, r, sa, sb, arc) {
      sa = sa || 24; sb = sb || 12; arc = arc == null ? Math.PI * 2 : arc;
      const P = [], N = [], UV = [], I = [];
      for (let i = 0; i <= sa; i++) {
        const a = (i / sa) * arc, ca = Math.cos(a), sn = Math.sin(a);
        for (let j = 0; j <= sb; j++) {
          const b = (j / sb) * Math.PI * 2, cb = Math.cos(b), sb2 = Math.sin(b);
          P.push((R + r * cb) * ca, (R + r * cb) * sn, r * sb2);
          N.push(cb * ca, cb * sn, sb2);
          UV.push(i / sa, j / sb);
        }
      }
      for (let i = 0; i < sa; i++) for (let j = 0; j < sb; j++) { const a = i * (sb + 1) + j, b = a + sb + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
      return geo(P, N, UV, I);
    },
    sphere(r, seg) {
      seg = seg || 24;
      const P = [], N = [], UV = [], I = [];
      for (let j = 0; j <= seg; j++) {
        const v = j / seg, th = v * Math.PI;
        for (let i = 0; i <= seg * 2; i++) {
          const u = i / (seg * 2), ph = u * Math.PI * 2;
          const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), -Math.sin(th) * Math.sin(ph)];
          P.push(n[0] * r, n[1] * r, n[2] * r); N.push(n[0], n[1], n[2]); UV.push(u, 1 - v);
        }
      }
      const cols = seg * 2 + 1;
      for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) { const a = j * cols + i; I.push(a, a + cols, a + cols + 1, a, a + cols + 1, a + 1); }
      return geo(P, N, UV, I);
    },
    // join several geometries, each placed by a matrix
    merge(parts) {
      const P = [], N = [], UV = [], I = [];
      for (const { g, m } of parts) {
        const base = P.length / 3;
        for (let i = 0; i < g.p.length; i += 3) {
          const p = m ? M4.apply(m, [g.p[i], g.p[i + 1], g.p[i + 2]]) : [g.p[i], g.p[i + 1], g.p[i + 2]];
          const n = m ? M4.dir(m, [g.n[i], g.n[i + 1], g.n[i + 2]]) : [g.n[i], g.n[i + 1], g.n[i + 2]];
          P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]);
        }
        for (let i = 0; i < g.u.length; i++) UV.push(g.u[i]);
        for (let i = 0; i < g.i.length; i++) I.push(g.i[i] + base);
      }
      return geo(P, N, UV, I);
    },
  };

  // ================================================================ shaders
  const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aI0; layout(location=4) in vec4 aI1; layout(location=5) in vec4 aI2; layout(location=6) in vec4 aI3; layout(location=7) in vec4 aID;
uniform mat4 uModel, uVP; uniform int uInst;
out vec3 vW; out vec3 vN; out vec2 vUv; out vec4 vD;
void main(){
  mat4 M = uModel; vec4 D = vec4(0.);
  if (uInst == 1) { M = uModel * mat4(aI0, aI1, aI2, aI3); D = aID; }
  vec4 w = M * vec4(aPos, 1.);
  vW = w.xyz; vN = mat3(M) * aNrm; vUv = aUv; vD = D;
  gl_Position = uVP * w;
}`;
  const FS = HEAD + 'precision highp sampler2DShadow;\nprecision highp samplerCube;\n' + LIB + `
#define NL 8
in vec3 vW; in vec3 vN; in vec2 vUv; in vec4 vD;
uniform vec3 uCam; uniform mat4 uView;
uniform vec3 uBase; uniform float uRough, uMetal, uAlpha, uSpecK, uClear;
uniform sampler2D uTex; uniform int uHasTex; uniform vec4 uTexST; uniform int uAtlas;
uniform sampler2D uEm; uniform int uHasEm; uniform vec3 uEmCol; uniform float uEmGain; uniform vec4 uEmST; uniform int uEmAtlas;
uniform sampler2D uBump; uniform float uBump0; uniform vec4 uBumpST;
uniform sampler2D uRgh; uniform int uHasRgh; uniform float uRghAmt;
uniform int uNL; uniform vec4 uLP[NL]; uniform vec4 uLC[NL]; uniform vec4 uLD[NL]; uniform float uLI[NL];
uniform sampler2DShadow uShadow; uniform mat4 uShVP; uniform int uShL; uniform float uShBias; uniform float uShSoft;
uniform samplerCube uEnv; uniform float uEnvGain, uEnvLod; uniform vec3 uAmb;
uniform vec3 uFogCol; uniform float uFog;
uniform int uProbe;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oD;
float D_GGX(float NoH, float a){ float a2 = a * a; float d = NoH * NoH * (a2 - 1.) + 1.; return a2 / (PI * d * d + 1e-7); }
float V_Smith(float NoV, float NoL, float a){ float k = a * .5; return .25 / max((NoV * (1. - k) + k) * (NoL * (1. - k) + k), 1e-4); }
vec3 F_Sch(vec3 f0, float x){ return f0 + (1. - f0) * pow(1. - x, 5.); }
vec3 envBRDF(vec3 f0, float r, float NoV){
  const vec4 c0 = vec4(-1., -.0275, -.572, .022); const vec4 c1 = vec4(1., .0425, 1.04, -.04);
  vec4 q = r * c0 + c1; float a = min(q.x * q.x, exp2(-9.28 * NoV)) * q.x + q.y;
  return f0 * (-1.04 * a + q.z) + (1.04 * a + q.w);
}
const vec2 PD[16] = vec2[16](vec2(-.94201624,-.39906216), vec2(.94558609,-.76890725), vec2(-.094184101,-.92938870), vec2(.34495938,.29387760),
  vec2(-.91588581,.45771432), vec2(-.81544232,-.87912464), vec2(-.38277543,.27676845), vec2(.97484398,.75648379), vec2(.44323325,-.97511554),
  vec2(.53742981,-.47373420), vec2(-.26496911,-.41893023), vec2(.79197514,.19090188), vec2(-.24188840,.99706507), vec2(-.81409955,.91437590),
  vec2(.19984126,.78641367), vec2(.14383161,-.14100790));
float shadowAt(vec3 P, vec3 N){
  vec4 s = uShVP * vec4(P + N * (.003 + uShSoft * 2.6), 1.);
  vec3 q = s.xyz / s.w * .5 + .5;
  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1. || q.z > 1.) return 1.;
  float a = hash12(gl_FragCoord.xy) * TAU; mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
  float sum = 0.;
  for (int i = 0; i < 16; i++) sum += texture(uShadow, vec3(q.xy + R * PD[i] * uShSoft, q.z - uShBias));
  return sum / 16.;
}
vec3 perturb(vec3 N, vec3 P, float h){
  vec3 dx = dFdx(P), dy = dFdy(P); float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dy, N), r2 = cross(N, dx); float det = dot(dx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 r = abs(det) * N - g;
  float l2 = dot(r, r);
  return l2 > 1e-24 && abs(det) > 1e-14 ? r * inversesqrt(l2) : N;
}
void main(){
  vec3 N = vN; N = dot(N, N) > 1e-12 ? normalize(N) : vec3(0., 1., 0.);
  vec3 V = normalize(uCam - vW);
  vec2 uv = vUv;
  vec3 base = uBase; float alpha = uAlpha;
  if (uHasTex == 1) {
    vec2 tuv = uAtlas == 1 ? vD.xy + uv * vD.zw : uv * uTexST.xy + uTexST.zw;
    vec4 t = texture(uTex, tuv); base *= t.rgb; alpha *= t.a;
  }
  if (alpha < .02) discard;
  float rough = uRough;
  if (uHasRgh == 1) rough = clamp(rough + (texture(uRgh, uv * uBumpST.xy + uBumpST.zw).r - .5) * uRghAmt, .03, 1.);
  if (uBump0 > 0.) N = perturb(N, vW, texture(uBump, uv * uBumpST.xy + uBumpST.zw).r * uBump0);
  float NoV = max(dot(N, V), 1e-3);
  vec3 f0 = mix(vec3(.04 * uSpecK), base, uMetal);
  vec3 diffC = base * (1. - uMetal);
  float a = max(rough * rough, .002);
  vec3 col = vec3(0.);
  for (int i = 0; i < NL; i++) {
    if (i >= uNL) break;
    vec3 Lv = uLP[i].xyz - vW; float d = length(Lv); vec3 L = Lv / d;
    float NoL = dot(N, L);
    if (NoL <= 0.) continue;
    float rng = uLP[i].w;
    float att = 1. / (d * d + .0004) * pow(sat(1. - pow(d / rng, 4.)), 2.);
    if (uLD[i].w > -1.5) att *= smoothstep(uLD[i].w, uLI[i], dot(-L, uLD[i].xyz));
    if (att <= 0.) continue;
    if (i == uShL && uProbe == 0) att *= shadowAt(vW, N);
    vec3 H = normalize(L + V); float NoH = max(dot(N, H), 0.), VoH = max(dot(V, H), 0.);
    float aL = sat(a + uLC[i].w / (2. * d));
    vec3 F = F_Sch(f0, VoH);
    vec3 spec = D_GGX(NoH, aL) * (a * a) / (aL * aL) * V_Smith(NoV, NoL, a) * F;
    vec3 diff = diffC / PI * (1. - F);
    col += (diff + spec) * uLC[i].rgb * NoL * att;
    if (uClear > 0.) { float ac = .02; vec3 Fc = F_Sch(vec3(.04), VoH) * uClear; col += D_GGX(NoH, sat(ac + uLC[i].w / (2. * d))) * V_Smith(NoV, NoL, ac) * Fc * uLC[i].rgb * NoL * att; }
  }
  // image-based light from the room probe
  vec3 R = reflect(-V, N);
  vec3 envS = uProbe == 1 ? uAmb : textureLod(uEnv, R, rough * uEnvLod).rgb * uEnvGain;
  vec3 envD = uProbe == 1 ? uAmb : textureLod(uEnv, N, uEnvLod).rgb * uEnvGain;
  col += diffC * (envD + uAmb * .35) + envS * envBRDF(f0, rough, NoV);
  if (uClear > 0. && uProbe == 0) col += textureLod(uEnv, R, .02 * uEnvLod).rgb * uEnvGain * envBRDF(vec3(.04), .03, NoV) * uClear;
  // emission (screens, neon, bulbs)
  if (uHasEm == 1) {
    vec2 euv = uEmAtlas == 1 ? vD.xy + uv * vD.zw : uv * uEmST.xy + uEmST.zw;
    vec4 e = texture(uEm, euv);
    col += e.rgb * uEmCol * uEmGain;
  } else col += uEmCol * uEmGain;
  float vz = -(uView * vec4(vW, 1.)).z;
  col = mix(col, uFogCol, 1. - exp(-uFog * vz));
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.);
  col = min(col, vec3(4000.));
  oC = vec4(col * alpha, alpha);
  oD = vec4(vz, 0., 0., alpha > .5 ? 1. : 0.);
}`;
  const FS_DEPTH = HEAD + 'out vec4 o; void main(){ o = vec4(1.); }';
  const FS_ACC = 'uniform sampler2D uSrc; uniform float uW; out vec4 o; void main(){ o = vec4(texture(uSrc, gl_FragCoord.xy / uRes).rgb * uW, uW); }';
  // ambient occlusion from the view-space depth buffer (half res), then a depth-aware blur
  const FS_AO = `
uniform sampler2D uDep; uniform vec2 uFull; uniform float uTan, uAsp, uRad, uStr; out vec4 o;
vec3 posAt(vec2 uv){ float z = texture(uDep, uv).r; if (z <= 0.) z = 1000.; vec2 nd = uv * 2. - 1.; return vec3(nd.x * uTan * uAsp * z, nd.y * uTan * z, -z); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 P = posAt(uv);
  if (-P.z > 60.) { o = vec4(1.); return; }
  vec2 px = 1. / uFull;
  vec3 N = normalize(cross(posAt(uv + vec2(px.x, 0.)) - P, posAt(uv + vec2(0., px.y)) - P));
  if (dot(N, -P) < 0.) N = -N;
  float occ = 0.; float a0 = hash12(gl_FragCoord.xy) * 6.283;
  float rpx = uRad / (-P.z * uTan * 2.);
  for (int i = 0; i < 16; i++) {
    float f = (float(i) + .5) / 16.;
    float a = a0 + float(i) * 2.39996;
    vec2 off = vec2(cos(a) / uAsp, sin(a)) * sqrt(f) * rpx;
    vec3 S = posAt(uv + off);
    vec3 d = S - P; float l = length(d);
    occ += max(dot(N, d / max(l, 1e-4)) - .08, 0.) * (1. - smoothstep(0., 1., l / (uRad * 1.6)));
  }
  float ao = clamp(1. - uStr * occ / 16., 0., 1.);
  if (!(ao == ao)) ao = 1.;
  o = vec4(vec3(ao), 1.);
}`;
  const FS_AOBLUR = `
uniform sampler2D uAo, uDep; uniform vec2 uDir; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; float z0 = texture(uDep, uv).r;
  float s = 0., w = 0.;
  for (int i = -4; i <= 4; i++) {
    vec2 q = uv + uDir * float(i) / uRes;
    float z = texture(uDep, q).r; float k = exp(-float(i * i) / 10.) * exp(-abs(z - z0) / max(z0 * .02, .002));
    s += texture(uAo, q).r * k; w += k;
  }
  o = vec4(vec3(s / max(w, 1e-4)), 1.);
}`;
  const FS_AOAPPLY = `
uniform sampler2D uCol, uAo; out vec4 o;
void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 c = texture(uCol, uv).rgb; float a = clamp(texture(uAo, uv).r, 0., 1.); o = vec4(c * mix(1., a, .85), 1.); }`;
  // depth of field: half-res colour + signed circle of confusion, gather blur, full-res mix
  const FS_COC = `
uniform sampler2D uCol, uDep; uniform float uFocus, uK, uMaxR; uniform vec2 uFull; out vec4 o;
float coc(float z){ return clamp(uK * (z - uFocus) / max(z, .001), -uMaxR, uMaxR); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 t = .5 / uFull;
  vec3 c = (texture(uCol, uv + t * vec2(-1., -1.)).rgb + texture(uCol, uv + t * vec2(1., -1.)).rgb + texture(uCol, uv + t * vec2(-1., 1.)).rgb + texture(uCol, uv + t * vec2(1., 1.)).rgb) * .25;
  float z = min(min(texture(uDep, uv + t * vec2(-1., -1.)).r, texture(uDep, uv + t * vec2(1., -1.)).r), min(texture(uDep, uv + t * vec2(-1., 1.)).r, texture(uDep, uv + t * vec2(1., 1.)).r));
  if (z <= 0.) z = 1000.;
  o = vec4(min(c, vec3(64.)), coc(z) * .5);
}`;
  const FS_BOKEH = `
uniform sampler2D uSrc; uniform float uMaxR; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 px = 1. / uRes;
  vec4 c0 = texture(uSrc, uv); float cs = abs(c0.a);
  vec3 acc = c0.rgb; float tot = 1.;
  float rad = .6; float ang = hash12(gl_FragCoord.xy) * 6.283;
  for (int i = 0; i < 200; i++) {
    if (rad >= uMaxR) break;
    vec2 tc = uv + vec2(cos(ang), sin(ang)) * px * rad;
    vec4 s = texture(uSrc, tc); float ss = abs(s.a);
    if (s.a > c0.a) ss = min(ss, cs * 2.);
    float m = smoothstep(rad - .5, rad + .5, ss);
    acc += mix(acc / tot, s.rgb, m); tot += 1.;
    ang += 2.39996323; rad += .85 / rad;
  }
  o = vec4(acc / tot, c0.a);
}`;
  const FS_DOFMIX = `
uniform sampler2D uSharp, uBlur, uDep; uniform float uFocus, uK, uMaxR; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 s = texture(uSharp, uv).rgb; vec4 b = texture(uBlur, uv);
  float z = texture(uDep, uv).r; if (z <= 0.) z = 1000.;
  float c = abs(clamp(uK * (z - uFocus) / max(z, .001), -uMaxR, uMaxR));
  float m = max(smoothstep(.7, 2.2, c), smoothstep(.7, 2.2, abs(b.a) * 2.) * step(b.a, 0.));
  o = vec4(mix(s, b.rgb, m), 1.);
}`;

  // ================================================================ renderer
  const UNIT = { uTex: 0, uEm: 1, uBump: 2, uRgh: 3, uShadow: 4 };
  class R3 {
    constructor(G, o) {
      o = o || {};
      this.G = G;
      const gl = (this.gl = G.gl);
      this.pStd = G.program(FS, VS);
      this.pDepth = G.program(FS_DEPTH, VS);
      this.pAcc = G.program(FS_ACC);
      this.pCoc = G.program(FS_COC);
      this.pBokeh = G.program(FS_BOKEH);
      this.pMix = G.program(FS_DOFMIX);
      this.pAo = G.program(FS_AO);
      this.pAoBlur = G.program(FS_AOBLUR);
      this.pAoApply = G.program(FS_AOAPPLY);
      this.post = new O.Post(G);
      this.samples = o.samples == null ? 4 : o.samples;
      this.w = 0; this.h = 0;
      this.vp = new Float32Array(16); this.view = new Float32Array(16); this.proj = new Float32Array(16);
      this.tmp = new Float32Array(16);
      // shadow map
      this.shSize = o.shadow || 2048;
      this.shTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shSize, this.shSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      this.shFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
      gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.shVP = new Float32Array(16);
      // environment probe
      this.envSize = o.env || 128;
      this.env = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.env);
      for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, G.floatRT ? gl.RGBA16F : gl.RGBA8, this.envSize, this.envSize, 0, gl.RGBA, G.floatRT ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      this.envLod = Math.log2(this.envSize);
      this.dummyCube = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.dummyCube);
      for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      this.envFb = gl.createFramebuffer();
      this.envDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.envDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.envSize, this.envSize);
      this.stats = { draws: 0, sub: 1 };
    }
    // ---------------------------------------------------------------- uniforms (fixed texture units)
    setU(P, u) {
      const gl = this.gl;
      for (const k in u) {
        const d = P.uni[k];
        if (!d) continue;
        const v = u[k], t = d.type;
        if (t === gl.SAMPLER_2D || t === gl.SAMPLER_2D_SHADOW) {
          const unit = UNIT[k] == null ? 6 : UNIT[k];
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v ? v.tex || v : this.G.blank().tex);
          gl.uniform1i(d.loc, unit);
          continue;
        }
        if (t === gl.SAMPLER_CUBE) { gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_CUBE_MAP, v || this.dummyCube); gl.uniform1i(d.loc, 15); continue; }
        if (v === undefined) continue;
        switch (t) {
          case gl.FLOAT: if (d.size > 1) gl.uniform1fv(d.loc, v); else gl.uniform1f(d.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(d.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(d.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(d.loc, v); break;
          case gl.INT: case gl.BOOL: gl.uniform1i(d.loc, v | 0); break;
          case gl.FLOAT_MAT4: gl.uniformMatrix4fv(d.loc, false, v); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(d.loc, false, v); break;
          default: break;
        }
      }
      gl.activeTexture(gl.TEXTURE0);
    }
    // ---------------------------------------------------------------- GPU meshes
    mesh(g, inst) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
      buf(g.p, 0, 3); buf(g.n, 1, 3); buf(g.u, 2, 2);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.i, gl.STATIC_DRAW);
      const M = { vao, n: g.i.length, type: g.i instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, inst: null };
      if (inst) {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, inst * 80, gl.DYNAMIC_DRAW);
        for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, 80, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
        M.inst = { buf: b, max: inst, data: new Float32Array(inst * 20), count: 0 };
      }
      gl.bindVertexArray(null);
      return M;
    }
    // instance i: matrix + vec4 data
    setInst(M, i, m, d) {
      const a = M.inst.data, o = i * 20;
      a.set(m, o);
      a[o + 16] = d ? d[0] : 0; a[o + 17] = d ? d[1] : 0; a[o + 18] = d ? d[2] : 1; a[o + 19] = d ? d[3] : 1;
    }
    flushInst(M, count) {
      const gl = this.gl;
      M.inst.count = count;
      gl.bindBuffer(gl.ARRAY_BUFFER, M.inst.buf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, M.inst.data, 0, count * 20);
    }
    // ---------------------------------------------------------------- targets
    resize(w, h) {
      w = Math.max(16, Math.round(w)); h = Math.max(16, Math.round(h));
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h;
      const G = this.G, gl = this.gl;
      if (this.ms) { gl.deleteFramebuffer(this.ms.fb); this.ms.rbs.forEach((r) => gl.deleteRenderbuffer(r)); }
      let samples = Math.min(this.samples, gl.getParameter(gl.MAX_SAMPLES) || 0);
      const make = (s) => {
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const rbs = [];
        const rb = (fmt, att) => { const r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r); if (s > 0) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, s, fmt, w, h); else gl.renderbufferStorage(gl.RENDERBUFFER, fmt, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, att, gl.RENDERBUFFER, r); rbs.push(r); };
        const cf = G.floatRT ? gl.RGBA16F : gl.RGBA8;
        rb(cf, gl.COLOR_ATTACHMENT0); rb(cf, gl.COLOR_ATTACHMENT1); rb(gl.DEPTH_COMPONENT24, gl.DEPTH_ATTACHMENT);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        if (!ok) { gl.deleteFramebuffer(fb); rbs.forEach((r) => gl.deleteRenderbuffer(r)); return null; }
        return { fb, rbs, s };
      };
      this.ms = make(samples) || make(0);
      if (!this.col) {
        this.col = G.target(w, h); this.dep = G.target(w, h); this.acc = G.target(w, h);
        this.dA = G.target(w / 2, h / 2); this.dB = G.target(w / 2, h / 2); this.out = G.target(w, h);
        this.aoA = G.target(w / 2, h / 2, { hdr: false }); this.aoB = G.target(w / 2, h / 2, { hdr: false }); this.lit = G.target(w, h);
      } else {
        for (const T of [this.col, this.dep, this.acc, this.out, this.lit]) G.resizeTarget(T, w, h);
        for (const T of [this.dA, this.dB, this.aoA, this.aoB]) G.resizeTarget(T, w / 2, h / 2);
      }
    }
    // ---------------------------------------------------------------- drawing
    setCamera(cam, asp) {
      M4.persp((cam.fov * Math.PI) / 180, asp, cam.near || 0.02, cam.far || 60, this.proj);
      M4.look(cam.pos, cam.at, cam.up || [0, 1, 0], this.view);
      M4.mul(this.proj, this.view, this.vp);
    }
    lightsU(world, probe) {
      const L = world.lights.filter((l) => l.on !== false).slice(0, 8);
      const P = new Float32Array(32), C = new Float32Array(32), D = new Float32Array(32), I = new Float32Array(8);
      let sh = -1;
      L.forEach((l, i) => {
        P.set([l.pos[0], l.pos[1], l.pos[2], l.range || 8], i * 4);
        const k = l.intensity == null ? 1 : l.intensity;
        C.set([l.color[0] * k, l.color[1] * k, l.color[2] * k, l.radius || 0.02], i * 4);
        if (l.type === 'spot') { const d = V3.norm(l.dir); D.set([d[0], d[1], d[2], Math.cos(l.outer || 0.6)], i * 4); I[i] = Math.cos(l.inner || 0.3); }
        else { D.set([0, -1, 0, -2], i * 4); I[i] = 1; }
        if (l.shadow && sh < 0 && !probe) sh = i;
      });
      return { uNL: L.length, uLP: P, uLC: C, uLD: D, uLI: I, uShL: sh };
    }
    drawList(world, prog, common, pass) {
      const gl = this.gl;
      const blend = pass === 'blend';
      for (const ob of world.objects) {
        if (ob.visible === false || !ob.mesh) continue;
        if (pass === 'shadow' && ob.shadow === false) continue;
        if (pass === 'probe' && ob.probe === false) continue;
        const isBlend = ob.mat && ob.mat.blend;
        if (pass !== 'shadow' && pass !== 'probe' && !!isBlend !== blend) continue;
        if (pass === 'probe' && isBlend) continue;
        const M = ob.mesh;
        if (M.inst && !M.inst.count) continue;
        const u = { uModel: ob.model, uInst: M.inst ? 1 : 0 };
        if (prog === this.pStd) Object.assign(u, this.matU(ob.mat || {}));
        this.setU(prog, u);
        gl.bindVertexArray(M.vao);
        if (M.inst) gl.drawElementsInstanced(gl.TRIANGLES, M.n, M.type, 0, M.inst.count);
        else gl.drawElements(gl.TRIANGLES, M.n, M.type, 0);
        this.stats.draws++;
      }
    }
    matU(m) {
      return {
        uBase: m.color || [0.8, 0.8, 0.8], uRough: m.rough == null ? 0.5 : m.rough, uMetal: m.metal || 0, uAlpha: m.alpha == null ? 1 : m.alpha, uSpecK: m.spec == null ? 1 : m.spec, uClear: m.clear || 0,
        uTex: m.tex || null, uHasTex: m.tex ? 1 : 0, uTexST: m.st || [1, 1, 0, 0], uAtlas: m.atlas ? 1 : 0,
        uEm: m.em || null, uHasEm: m.em ? 1 : 0, uEmCol: m.emCol || (m.em ? [1, 1, 1] : [0, 0, 0]), uEmGain: m.emGain == null ? 1 : m.emGain, uEmST: m.emST || [1, 1, 0, 0], uEmAtlas: m.emAtlas ? 1 : 0,
        uBump: m.bump || null, uBump0: m.bump ? m.bumpAmt || 0.002 : 0, uBumpST: m.bumpST || m.st || [1, 1, 0, 0],
        uRgh: m.rgh || null, uHasRgh: m.rgh ? 1 : 0, uRghAmt: m.rghAmt || 0.3,
      };
    }
    shadows(world) {
      const gl = this.gl;
      const l = world.lights.find((x) => x.shadow && x.on !== false);
      if (!l) return;
      const at = V3.add(l.pos, l.dir);
      const up = Math.abs(V3.norm(l.dir)[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
      const P = M4.persp((l.outer || 0.6) * 2.1, 1, 0.05, l.range || 8), Vw = M4.look(l.pos, at, up);
      M4.mul(P, Vw, this.shVP);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
      gl.viewport(0, 0, this.shSize, this.shSize);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 2.5);
      gl.useProgram(this.pDepth.p);
      this.setU(this.pDepth, { uVP: this.shVP });
      this.drawList(world, this.pDepth, null, 'shadow');
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    // the room as seen from the probe point, for reflections
    probe(world, pos) {
      const gl = this.gl, G = this.G;
      const dirs = [[1, 0, 0, 0, -1, 0], [-1, 0, 0, 0, -1, 0], [0, 1, 0, 0, 0, 1], [0, -1, 0, 0, 0, -1], [0, 0, 1, 0, -1, 0], [0, 0, -1, 0, -1, 0]];
      const proj = M4.persp(Math.PI / 2, 1, 0.02, 40);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.envFb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.envDepth);
      gl.viewport(0, 0, this.envSize, this.envSize);
      gl.useProgram(this.pStd.p);
      const lu = this.lightsU(world, true);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      for (let f = 0; f < 6; f++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, this.env, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        const d = dirs[f];
        const view = M4.look(pos, V3.add(pos, [d[0], d[1], d[2]]), [d[3], d[4], d[5]]);
        const vp = M4.mul(proj, view);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.setU(this.pStd, Object.assign({ uVP: vp, uView: view, uCam: pos, uProbe: 1, uAmb: world.amb || [0.02, 0.02, 0.025], uEnvGain: 0, uEnvLod: 0, uShadow: this.shTex, uShVP: this.shVP, uShBias: 0.0015, uShSoft: 0.002, uEnv: this.dummyCube, uFogCol: [0, 0, 0], uFog: 0 }, lu));
        this.drawList(world, this.pStd, null, 'probe');
      }
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.env);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    scene(world, cam) {
      const gl = this.gl;
      this.setCamera(cam, this.w / this.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.ms.fb);
      gl.viewport(0, 0, this.w, this.h);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      const bg = world.bg || [0, 0, 0];
      gl.clearBufferfv(gl.COLOR, 0, [bg[0], bg[1], bg[2], 1]);
      gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.useProgram(this.pStd.p);
      const common = Object.assign({ uVP: this.vp, uView: this.view, uCam: cam.pos, uProbe: 0, uAmb: world.amb || [0.02, 0.02, 0.025],
        uEnv: null, uEnvGain: world.envGain == null ? 1 : world.envGain, uEnvLod: this.envLod, uShadow: this.shTex, uShVP: this.shVP, uShBias: world.shBias || 0.0012, uShSoft: world.shSoft || 0.0016,
        uFogCol: world.fogCol || [0, 0, 0], uFog: world.fog || 0 }, this.lightsU(world, false));
      common.uEnv = this.env;
      common.uRes = [this.w, this.h];
      this.setU(this.pStd, common);
      this.drawList(world, this.pStd, null, 'opaque');
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      this.drawList(world, this.pStd, null, 'blend');
      gl.depthMask(true); gl.disable(gl.BLEND);
      // resolve
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.ms.fb);
      for (const [att, T] of [[gl.COLOR_ATTACHMENT0, this.col], [gl.COLOR_ATTACHMENT1, this.dep]]) {
        gl.readBuffer(att);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.fb);
        gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      }
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    // full frame: world.pose(t) places everything (and returns the camera) for any time t
    frame(world, t, o) {
      o = o || {};
      const G = this.G, gl = this.gl;
      this.stats.draws = 0;
      let cam = world.pose(t);
      this.shadows(world);
      if (world.probeDirty) { this.probe(world, world.probePos || [0, 1.2, 0]); world.probeDirty = false; }
      const K = Math.max(1, Math.min(16, o.sub || 1)), sh = o.shutter || 1 / 48;
      this.stats.sub = K;
      if (K === 1) this.scene(world, cam);
      else {
        G.clear(this.acc, 0, 0, 0, 0);
        for (let k = 0; k < K; k++) {
          const ts = t - sh * (1 - (k + 0.5) / K);
          cam = world.pose(ts);
          this.scene(world, cam);
          G.draw(this.pAcc, { uSrc: this.col, uW: 1 / K }, this.acc, { blend: 'add' });
        }
        cam = world.pose(t);
      }
      let color = K === 1 ? this.col : this.acc;
      // ambient occlusion
      if (o.ao !== false) {
        const tn = Math.tan((cam.fov * Math.PI) / 360);
        G.draw(this.pAo, { uDep: this.dep, uFull: [this.w, this.h], uTan: tn, uAsp: this.w / this.h, uRad: o.aoRadius || 0.06, uStr: o.aoStrength || 1.6 }, this.aoA);
        G.draw(this.pAoBlur, { uAo: this.aoA, uDep: this.dep, uDir: [1, 0] }, this.aoB);
        G.draw(this.pAoBlur, { uAo: this.aoB, uDep: this.dep, uDir: [0, 1] }, this.aoA);
        G.draw(this.pAoApply, { uCol: color, uAo: this.aoA }, this.lit);
        color = this.lit;
      }
      // depth of field
      let img = color;
      if (o.dof !== false && cam.fstop) {
        const f = (cam.sensor || 0.036) / (2 * Math.tan((cam.fov * Math.PI) / 360) * (this.w / this.h));
        const zf = Math.max(cam.focus || 1, f * 1.5);
        const kpx = ((f * f) / cam.fstop / (zf - f)) / (cam.sensor || 0.036) * this.w * 0.5 * (o.dofScale || 1);
        const maxR = Math.min(28, this.w / 70);
        G.draw(this.pCoc, { uCol: color, uDep: this.dep, uFocus: zf, uK: kpx, uMaxR: maxR, uFull: [this.w, this.h] }, this.dA);
        G.draw(this.pBokeh, { uSrc: this.dA, uMaxR: maxR * 0.5 }, this.dB);
        G.draw(this.pMix, { uSharp: color, uBlur: this.dB, uDep: this.dep, uFocus: zf, uK: kpx, uMaxR: maxR }, this.out);
        img = this.out;
      }
      this.post.run(img, Object.assign({ time: t }, o.finish || {}), null);
      return cam;
    }
  }

  O.R3 = R3;
  O.R3.M4 = M4;
  O.R3.V3 = V3;
  O.R3.Geo = Geo;
})();
