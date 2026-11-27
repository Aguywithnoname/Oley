/* Oley · Voxel renderer: everything is a box. Instanced boxes (position, size, colour, glow, spin)
   lit by a low sun with a shadow map, a sky/ground fill, darkened voxel edges and distance fog, over a
   sky with a sun, light rays, stars and aurora. Renders HDR into the shared bloom finish. */
(function () {
  'use strict';
  const O = window.Oley;
  const V = (O.Vox = O.Vox || {});
  const HEAD = O.GLSL.HEAD;

  // ---------------------------------------------------------------- small vector and matrix kit
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  };
  V.v3 = v3;
  function persp(fov, asp, n, f, o) {
    const t = 1 / Math.tan(fov / 2);
    o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = (2 * f * n) / (n - f);
    return o;
  }
  function ortho(l, r, b, t, n, f, o) {
    o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1;
    return o;
  }
  function look(e, c, up, o) {
    const z = v3.norm(v3.sub(e, c)), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
    o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0; o[12] = -v3.dot(x, e); o[13] = -v3.dot(y, e); o[14] = -v3.dot(z, e); o[15] = 1;
    return o;
  }
  function mm(a, b, o) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
    return o;
  }
  V.mat = { persp, ortho, look, mm };

  // ---------------------------------------------------------------- shaders
  const VS_BOX = HEAD + `
layout(location=0) in vec3 aP;
layout(location=1) in vec3 aN;
layout(location=2) in vec3 iPos;
layout(location=3) in vec3 iSize;
layout(location=4) in vec4 iCol;
layout(location=5) in vec3 iRot;
uniform mat4 uVP;
out vec3 vW, vN, vL, vS, vNl;
out vec4 vC;
mat3 rot(vec3 r) {
  vec3 c = cos(r), s = sin(r);
  mat3 X = mat3(1., 0., 0., 0., c.x, s.x, 0., -s.x, c.x);
  mat3 Y = mat3(c.y, 0., -s.y, 0., 1., 0., s.y, 0., c.y);
  mat3 Z = mat3(c.z, s.z, 0., -s.z, c.z, 0., 0., 0., 1.);
  return Y * X * Z;
}
void main() {
  mat3 R = rot(iRot);
  vec3 lp = aP * iSize;
  vec3 w = iPos + R * lp;
  vW = w; vN = R * aN; vNl = aN; vL = lp; vS = iSize;
  vC = vec4(pow(max(iCol.rgb, 0.), vec3(2.2)), iCol.a);
  gl_Position = uVP * vec4(w, 1.);
}`;
  const FS_BOX = `
precision highp sampler2DShadow;
in vec3 vW, vN, vL, vS, vNl;
in vec4 vC;
uniform sampler2DShadow uShadow;
uniform mat4 uLVP;
uniform vec3 uSunDir, uSunCol, uSkyCol, uGndCol, uFogCol, uCam;
uniform float uFog, uAmb, uShadowOn, uFlash;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  // the shadow, four taps
  float sh = 1.;
  if (uShadowOn > .5) {
    vec4 lp = uLVP * vec4(vW + n * .04, 1.);
    vec3 p = lp.xyz / lp.w * .5 + .5;
    if (p.x > 0. && p.x < 1. && p.y > 0. && p.y < 1. && p.z < 1.) {
      vec2 tx = vec2(1. / 2048.);
      sh = .25 * (texture(uShadow, vec3(p.xy + vec2(-tx.x, -tx.y), p.z - .0015)) + texture(uShadow, vec3(p.xy + vec2(tx.x, -tx.y), p.z - .0015))
        + texture(uShadow, vec3(p.xy + vec2(-tx.x, tx.y), p.z - .0015)) + texture(uShadow, vec3(p.xy + vec2(tx.x, tx.y), p.z - .0015)));
    }
  }
  float sun = max(dot(n, uSunDir), 0.) * sh;
  vec3 hemi = mix(uGndCol, uSkyCol, n.y * .5 + .5);
  // voxel faces: top brightest, sides a step down, bottom darkest
  float face = n.y > .5 ? 1. : n.y < -.5 ? .55 : .8;
  // darker at the edges of each box face, so every cube reads as a cube
  vec3 a = abs(vL) / max(vS * .5, vec3(.001));
  vec3 m = step(abs(vNl), vec3(.5));
  float e = max(max(a.x * m.x, a.y * m.y), a.z * m.z);
  float edge = mix(1., .78, smoothstep(.82, 1., e));
  vec3 col = vC.rgb * (hemi * uAmb * face + uSunCol * sun) * edge;
  col += vC.rgb * vC.a * 3.2;
  col += vC.rgb * uFlash * .6;
  float d = length(vW - uCam);
  col = mix(col, uFogCol, 1. - exp(-d * uFog));
  o = vec4(col, 1.);
}`;
  const FS_DEPTH = `out vec4 o; void main() { o = vec4(1.); }`;
  const FS_SKY = `
uniform vec3 uTop, uHor, uBot, uSunDir, uSunCol, uF, uR, uU;
uniform float uTan, uAsp, uStars, uAurora, uRays, uTime, uSunSize;
out vec4 o;
void main() {
  vec2 p = (gl_FragCoord.xy / uRes) * 2. - 1.;
  vec3 d = normalize(uF + uR * p.x * uTan * uAsp + uU * p.y * uTan);
  float y = d.y;
  vec3 c = y > 0. ? mix(uHor, uTop, pow(clamp(y, 0., 1.), .55)) : mix(uHor, uBot, pow(clamp(-y, 0., 1.), .4));
  float s = max(dot(d, uSunDir), 0.);
  c += uSunCol * (pow(s, 900. / uSunSize) * 6. + pow(s, 24.) * .55 + pow(s, 4.) * .18);
  // rays fanning out of the sun
  if (uRays > 0.) {
    vec3 sp = normalize(cross(uSunDir, vec3(0., 1., 0.)) + vec3(0., .0001, 0.));
    vec3 sq = cross(sp, uSunDir);
    float ang = atan(dot(d, sq), dot(d, sp));
    float ray = pow(.5 + .5 * sin(ang * 18. + uTime * .2), 6.) * pow(s, 6.);
    c += uSunCol * ray * uRays * .5;
  }
  // stars, twinkling
  if (uStars > 0. && y > -.05) {
    vec2 q = vec2(atan(d.z, d.x), asin(clamp(d.y, -1., 1.))) * 160.;
    vec2 id = floor(q), f = fract(q) - .5;
    float h = hash12(id);
    float st = step(.985, h) * smoothstep(.22, 0., length(f)) * (.6 + .4 * sin(uTime * (1. + h * 4.) + h * 50.));
    c += vec3(.9, .92, 1.) * st * uStars * 2.;
  }
  // aurora bands
  if (uAurora > 0. && y > 0.) {
    float b = fbm2(vec2(atan(d.z, d.x) * 3. + uTime * .03, y * 4.), 4);
    float band = smoothstep(.15, .5, y) * smoothstep(.75, .35, y) * smoothstep(.45, .75, b);
    c += mix(vec3(.2, 1., .6), vec3(.6, .3, 1.), b) * band * uAurora * .7;
  }
  o = vec4(pow(max(c, 0.), vec3(2.2)), 1.);
}`;

  // a unit cube, 36 vertices with normals
  function cubeVerts() {
    const F = [
      [[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]],
      [[-1, 0, 0], [[-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-.5, -.5, -.5]]],
      [[0, 1, 0], [[-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5]]],
      [[0, -1, 0], [[-.5, -.5, .5], [-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5]]],
      [[0, 0, 1], [[.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5], [-.5, -.5, .5]]],
      [[0, 0, -1], [[-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5], [.5, -.5, -.5]]],
    ];
    const out = [];
    for (const [n, q] of F) for (const i of [0, 1, 2, 0, 2, 3]) out.push(...q[i], ...n);
    return new Float32Array(out);
  }

  // ---------------------------------------------------------------- the renderer
  V.Renderer = class {
    constructor(G) {
      this.G = G;
      const gl = (this.gl = G.gl);
      this.pBox = G.program(FS_BOX, VS_BOX);
      this.pDepth = G.program(FS_DEPTH, VS_BOX);
      this.pSky = G.program(FS_SKY);
      this.geo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo);
      gl.bufferData(gl.ARRAY_BUFFER, cubeVerts(), gl.STATIC_DRAW);
      // two instance sets: the world (static per scene) and what moves (letters, particles)
      this.sets = { world: this.makeSet(), dyn: this.makeSet() };
      // the shadow map
      this.SM = 2048;
      this.shTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.SM, this.SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      this.shFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.shadowOk = gl.checkFramebufferStatus ? true : false;
      // the main colour target gets a depth buffer
      this.rt = G.target(4, 4);
      this.depth = gl.createRenderbuffer();
      this.dw = 0; this.dh = 0;
      this.P = new Float32Array(16); this.Vw = new Float32Array(16); this.VP = new Float32Array(16);
      this.LP = new Float32Array(16); this.LV = new Float32Array(16); this.LVP = new Float32Array(16);
    }
    makeSet() {
      const gl = this.gl;
      const vao = gl.createVertexArray(), buf = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.geo);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      const st = 13 * 4;
      [[2, 3, 0], [3, 3, 12], [4, 4, 24], [5, 3, 40]].forEach(([loc, n, off]) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, st, off); gl.vertexAttribDivisor(loc, 1); });
      gl.bindVertexArray(null);
      return { vao, buf, n: 0, cap: 0 };
    }
    // data: Float32Array of 13 floats per box: x y z  sx sy sz  r g b glow  rx ry rz
    upload(name, data, n) {
      const gl = this.gl, S = this.sets[name];
      gl.bindBuffer(gl.ARRAY_BUFFER, S.buf);
      if (data.length > S.cap) { gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); S.cap = data.length; }
      else gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * 13);
      S.n = n;
    }
    ensure(w, h) {
      const gl = this.gl, G = this.G;
      G.resizeTarget(this.rt, w, h);
      if (this.dw !== this.rt.w || this.dh !== this.rt.h) {
        this.dw = this.rt.w; this.dh = this.rt.h;
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.dw, this.dh);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.fb);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }
    drawSets(P, u) {
      const gl = this.gl;
      gl.useProgram(P.p);
      this.G.setUniforms(P, u);
      for (const k of ['world', 'dyn']) {
        const S = this.sets[k];
        if (!S.n) continue;
        gl.bindVertexArray(S.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, S.n);
      }
      gl.bindVertexArray(null);
    }
    // cam: { pos, at, up, fov }; L: lighting and sky
    render(cam, L, t) {
      const gl = this.gl, G = this.G;
      const w = this.rt.w, h = this.rt.h, asp = w / h;
      persp(cam.fov, asp, 0.1, 400, this.P);
      look(cam.pos, cam.at, cam.up || [0, 1, 0], this.Vw);
      mm(this.P, this.Vw, this.VP);
      // the sun's view of the area round what we're looking at
      const sd = v3.norm(L.sun), c = cam.at, R = L.shadowR || 40;
      const lpos = v3.add(c, v3.mul(sd, 120));
      look(lpos, c, Math.abs(sd[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0], this.LV);
      ortho(-R, R, -R, R, 1, 260, this.LP);
      mm(this.LP, this.LV, this.LVP);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.BLEND);
      if (L.shadow !== false) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFb);
        gl.viewport(0, 0, this.SM, this.SM);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
        this.drawSets(this.pDepth, { uVP: this.LVP });
        gl.colorMask(true, true, true, true);
      }
      // sky
      gl.disable(gl.DEPTH_TEST);
      const f = v3.norm(v3.sub(cam.at, cam.pos)), r = v3.norm(v3.cross(f, cam.up || [0, 1, 0])), u = v3.cross(r, f);
      G.draw(this.pSky, { uTop: L.top, uHor: L.hor, uBot: L.bot, uSunDir: sd, uSunCol: L.sunCol, uF: f, uR: r, uU: u, uTan: Math.tan(cam.fov / 2), uAsp: asp,
        uStars: L.stars || 0, uAurora: L.aurora || 0, uRays: L.rays || 0, uTime: t, uSunSize: L.sunSize || 1 }, this.rt);
      // boxes
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.fb);
      gl.viewport(0, 0, w, h);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0 + 7);
      gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.useProgram(this.pBox.p);
      const lin = (c) => c.map((v) => Math.pow(v, 2.2));
      this.G.setUniforms(this.pBox, { uVP: this.VP, uLVP: this.LVP, uSunDir: sd, uSunCol: L.sunLight || lin(L.sunCol), uSkyCol: lin(L.skyFill || L.top), uGndCol: lin(L.gndFill || L.bot),
        uFogCol: lin(L.fogCol || L.hor), uCam: cam.pos, uFog: L.fog || 0.01, uAmb: L.amb || 0.6, uShadowOn: L.shadow === false ? 0 : 1, uFlash: L.flash || 0 });
      const sl = gl.getUniformLocation(this.pBox.p, 'uShadow');
      gl.uniform1i(sl, 7);
      for (const k of ['world', 'dyn']) {
        const S = this.sets[k];
        if (!S.n) continue;
        gl.bindVertexArray(S.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, S.n);
      }
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
      gl.activeTexture(gl.TEXTURE0);
      return this.rt;
    }
    // where a world point lands on screen (0..1), and whether it's in front
    project(p) {
      const m = this.VP, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return [x / w * 0.5 + 0.5, y / w * 0.5 + 0.5, w > 0];
    }
    destroy() {
      const gl = this.gl;
      if (!gl || gl.isContextLost()) return;
      gl.deleteTexture(this.shTex); gl.deleteFramebuffer(this.shFb); gl.deleteRenderbuffer(this.depth);
      for (const S of Object.values(this.sets)) { gl.deleteBuffer(S.buf); gl.deleteVertexArray(S.vao); }
      gl.deleteBuffer(this.geo);
    }
  };

  // ---------------------------------------------------------------- a growable list of boxes
  V.Boxes = class {
    constructor(cap) { this.d = new Float32Array((cap || 1024) * 13); this.n = 0; }
    clear() { this.n = 0; return this; }
    add(x, y, z, sx, sy, sz, c, glow, rx, ry, rz) {
      if ((this.n + 1) * 13 > this.d.length) { const nd = new Float32Array(this.d.length * 2); nd.set(this.d); this.d = nd; }
      const o = this.n * 13, d = this.d;
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = sx; d[o + 4] = sy; d[o + 5] = sz;
      d[o + 6] = c[0] / 255; d[o + 7] = c[1] / 255; d[o + 8] = c[2] / 255; d[o + 9] = glow || 0;
      d[o + 10] = rx || 0; d[o + 11] = ry || 0; d[o + 12] = rz || 0;
      this.n++;
    }
    // a unit voxel on the integer grid
    vox(x, y, z, c, glow) { this.add(x + 0.5, y + 0.5, z + 0.5, 1, 1, 1, c, glow); }
  };
})();
