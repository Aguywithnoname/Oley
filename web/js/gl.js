/* Oley lens: the WebGL2 toolkit the cinematic modes share.
   HDR render targets, energy-preserving bloom and a filmic finish (highlight roll-off, grain,
   chromatic aberration, lens falloff, dithering), so every mode looks filmed rather than drawn.
   Plain script (no modules) so it also runs from file:// inside Wallpaper Engine. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  // ================================================================ GLSL library
  const HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n';
  const LIB = `
#define PI 3.14159265359
#define TAU 6.28318530718
uniform vec2 uRes;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(hash12(i), hash12(i + vec2(1., 0.)), u.x), mix(hash12(i + vec2(0., 1.)), hash12(i + vec2(1., 1.)), u.x), u.y); }
float gnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*f*(f*(f*6.-15.)+10.);
  float a = dot(hash33(i) * 2. - 1., f);
  float b = dot(hash33(i + vec3(1., 0., 0.)) * 2. - 1., f - vec3(1., 0., 0.));
  float c = dot(hash33(i + vec3(0., 1., 0.)) * 2. - 1., f - vec3(0., 1., 0.));
  float d = dot(hash33(i + vec3(1., 1., 0.)) * 2. - 1., f - vec3(1., 1., 0.));
  float e = dot(hash33(i + vec3(0., 0., 1.)) * 2. - 1., f - vec3(0., 0., 1.));
  float g = dot(hash33(i + vec3(1., 0., 1.)) * 2. - 1., f - vec3(1., 0., 1.));
  float h = dot(hash33(i + vec3(0., 1., 1.)) * 2. - 1., f - vec3(0., 1., 1.));
  float k = dot(hash33(i + vec3(1., 1., 1.)) * 2. - 1., f - vec3(1., 1., 1.));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
float fbm2(vec2 p, int oct){ float a = .5, s = 0.; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 10; i++){ if (i >= oct) break; s += a * vnoise(p); p = m * p + 17.3; a *= .5; } return s; }
float fbm3(vec3 p, int oct){ float a = .5, s = 0.;
  for (int i = 0; i < 10; i++){ if (i >= oct) break; s += a * gnoise(p); p = p * 2.03 + vec3(11.7, 3.1, 7.9); a *= .5; } return s; }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
vec3 toLin(vec3 c){ return pow(max(c, 0.), vec3(2.2)); }
vec3 toSrgb(vec3 c){ return pow(max(c, 0.), vec3(1. / 2.2)); }
vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float sat(float x){ return clamp(x, 0., 1.); }
// unpremultiply a premultiplied sRGB texel and bring it to linear (premultiplied) space
vec4 linPremul(vec4 t){ return t.a > 0.0001 ? vec4(toLin(t.rgb / t.a) * t.a, t.a) : vec4(0.); }
`;
  const VS = HEAD + 'void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2. - 1., 0., 1.); }';
  O.GLSL = { HEAD, LIB };

  let support = null;
  O.glSupported = function () {
    if (support !== null) return support;
    if (O.params && O.params.get('nogl') === '1') return (support = false);
    try {
      const c = document.createElement('canvas');
      const g = c.getContext('webgl2');
      support = !!g;
      if (g) { const l = g.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
    } catch (e) { support = false; }
    return support;
  };

  // ================================================================ context
  O.GL = class {
    constructor(parent, opts) {
      opts = opts || {};
      const c = (this.canvas = document.createElement('canvas'));
      c.className = 'gl-canvas' + (opts.cls ? ' ' + opts.cls : '');
      parent.appendChild(c);
      let gl = null;
      try {
        gl = c.getContext('webgl2', {
          alpha: !!opts.alpha, antialias: false, depth: false, stencil: false, premultipliedAlpha: true,
          preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance',
        });
      } catch (e) { gl = null; }
      this.gl = gl;
      this.ok = !!gl;
      this.w = 0;
      this.h = 0;
      this.lost = false;
      this.targets = [];
      this.textures = [];
      if (!gl) return;
      this.floatRT = !!gl.getExtension('EXT_color_buffer_float');
      this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      this.maxAniso = this.aniso ? gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
      this.vao = gl.createVertexArray();
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; if (opts.onLost) opts.onLost(); });
      c.addEventListener('webglcontextrestored', () => { if (opts.onRestored) opts.onRestored(); });
    }
    // drawing-buffer size in device pixels; returns true when it changed
    size(w, h) {
      w = Math.max(2, Math.round(w));
      h = Math.max(2, Math.round(h));
      if (w === this.w && h === this.h) return false;
      this.canvas.width = w;
      this.canvas.height = h;
      this.w = w;
      this.h = h;
      return true;
    }
    program(fs, vs) {
      const gl = this.gl;
      const full = fs.indexOf('#version') === 0 ? fs : HEAD + LIB + fs;
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
          const log = gl.getShaderInfoLog(s) || '';
          const m = /ERROR: \d+:(\d+)/.exec(log);
          const at = m ? +m[1] : 0;
          const ctx = src.split('\n').map((l, i) => i + 1 + ': ' + l).slice(Math.max(0, at - 4), at + 3).join('\n');
          console.error('Oley shader error\n' + log + '\n' + ctx);
          throw new Error('shader: ' + log.split('\n')[0]);
        }
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs || VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, full));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('link: ' + gl.getProgramInfoLog(p));
      const uni = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        uni[info.name.replace(/\[0\]$/, '')] = { loc: gl.getUniformLocation(p, info.name), type: info.type, size: info.size };
      }
      return { p, uni };
    }
    blank() {
      if (!this._blank) this._blank = this.dataTexture(1, 1, new Uint8Array([0, 0, 0, 0]));
      return this._blank;
    }
    setUniforms(P, u, res) {
      const gl = this.gl;
      let unit = 0;
      for (const k in P.uni) {
        const d = P.uni[k], t = d.type;
        let v = u[k];
        if (t === gl.SAMPLER_2D || t === gl.UNSIGNED_INT_SAMPLER_2D || t === gl.INT_SAMPLER_2D) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v ? v.tex || v : this.blank().tex);
          gl.uniform1i(d.loc, unit);
          unit++;
          continue;
        }
        if (v === undefined) {
          if (k === 'uRes') v = res;
          else continue;
        }
        switch (t) {
          case gl.FLOAT: if (d.size > 1) gl.uniform1fv(d.loc, v); else gl.uniform1f(d.loc, v); break;
          case gl.FLOAT_VEC2: gl.uniform2fv(d.loc, v); break;
          case gl.FLOAT_VEC3: gl.uniform3fv(d.loc, v); break;
          case gl.FLOAT_VEC4: gl.uniform4fv(d.loc, v); break;
          case gl.INT: case gl.BOOL:
            if (d.size > 1) gl.uniform1iv(d.loc, v); else gl.uniform1i(d.loc, v === true ? 1 : v === false ? 0 : v | 0);
            break;
          case gl.INT_VEC2: gl.uniform2iv(d.loc, v); break;
          case gl.FLOAT_MAT3: gl.uniformMatrix3fv(d.loc, false, v); break;
          case gl.FLOAT_MAT4: gl.uniformMatrix4fv(d.loc, false, v); break;
          default: break;
        }
      }
    }
    // render target (HDR when the GPU allows it)
    target(w, h, o) {
      o = o || {};
      const gl = this.gl;
      const T = { w: 0, h: 0, tex: gl.createTexture(), fb: gl.createFramebuffer(), hdr: o.hdr !== false && this.floatRT, mips: !!o.mips, wrap: o.wrap || 'clamp' };
      this.resizeTarget(T, w, h);
      this.targets.push(T);
      return T;
    }
    resizeTarget(T, w, h) {
      w = Math.max(1, Math.round(w));
      h = Math.max(1, Math.round(h));
      if (T.w === w && T.h === h) return false;
      const gl = this.gl;
      T.w = w;
      T.h = h;
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, T.hdr ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, T.hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, T.mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wr = T.wrap === 'repeat' ? gl.REPEAT : T.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return true;
    }
    mipmap(T) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    // texture from an image or canvas. o: {srgb, mips, wrap, aniso, flip, premult, nearest}
    texture(src, o) {
      const T = { tex: this.gl.createTexture(), w: 0, h: 0, o: o || {}, fmt: 0 };
      this.textures.push(T);
      if (src) this.upload(T, src);
      return T;
    }
    upload(T, src) {
      const gl = this.gl, o = T.o;
      const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
      if (!w || !h) return false;
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, o.flip !== false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !o.srgb && o.premult !== false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      const fmt = o.srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8;
      let ok = true;
      try {
        if (w === T.w && h === T.h && fmt === T.fmt) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
        else gl.texImage2D(gl.TEXTURE_2D, 0, fmt, gl.RGBA, gl.UNSIGNED_BYTE, src);
      } catch (e) { ok = false; }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (!ok) return false;
      T.w = w;
      T.h = h;
      T.fmt = fmt;
      const mips = o.mips !== false;
      if (mips) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : o.nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, o.nearest ? gl.NEAREST : gl.LINEAR);
      const wr = o.wrap === 'repeat' ? gl.REPEAT : o.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      if (this.aniso && o.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(this.maxAniso, o.aniso));
      return true;
    }
    // raw byte textures (RGBA8 by default, R8 with o.r8)
    dataTexture(w, h, data, o) {
      o = o || {};
      const gl = this.gl;
      const T = { tex: gl.createTexture(), w, h, o, r8: !!o.r8 };
      this.textures.push(T);
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, T.r8 ? gl.R8 : gl.RGBA8, w, h, 0, T.r8 ? gl.RED : gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      const lin = o.linear ? gl.LINEAR : gl.NEAREST;
      if (o.mips) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : lin);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin);
      const wr = o.wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      return T;
    }
    updateData(T, x, y, w, h, data) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, T.r8 ? gl.RED : gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      if (T.o.mips) gl.generateMipmap(gl.TEXTURE_2D);
    }
    // tileable random texture for cheap noise in shaders
    noise() {
      if (this._noise) return this._noise;
      const S = 256, d = new Uint8Array(S * S * 4), r = U.rng(9127);
      for (let i = 0; i < d.length; i++) d[i] = (r() * 256) | 0;
      this._noise = this.dataTexture(S, S, d, { linear: true, wrap: 'repeat', mips: true });
      return this._noise;
    }
    // one full-screen pass. target null = the canvas. o.blend: 'add' | 'over'
    draw(P, u, target, o) {
      const gl = this.gl;
      let w, h;
      if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); w = target.w; h = target.h; }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); w = this.w; h = this.h; }
      gl.viewport(0, 0, w, h);
      gl.useProgram(P.p);
      this.setUniforms(P, u || {}, [w, h]);
      if (o && o.blend) {
        gl.enable(gl.BLEND);
        if (o.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
        else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      } else gl.disable(gl.BLEND);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    clear(target, r, g, b, a) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
      gl.viewport(0, 0, target ? target.w : this.w, target ? target.h : this.h);
      gl.clearColor(r || 0, g || 0, b || 0, a == null ? 1 : a);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    destroy() {
      const gl = this.gl;
      if (gl && !gl.isContextLost()) {
        for (const T of this.targets) { gl.deleteTexture(T.tex); gl.deleteFramebuffer(T.fb); }
        for (const T of this.textures) gl.deleteTexture(T.tex);
        const l = gl.getExtension('WEBGL_lose_context');
        if (l) l.loseContext();
      }
      this.targets = [];
      this.textures = [];
      U.remove(this.canvas);
    }
  };

  // ================================================================ bloom + filmic finish
  const DOWN = `
uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uFirst; out vec4 o;
vec3 S(vec2 uv){ vec3 c = texture(uSrc, uv).rgb; return uFirst > .5 ? min(c, vec3(24.)) : c; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 t = uTexel;
  vec3 a = S(uv + t * vec2(-2., 2.)), b = S(uv + t * vec2(0., 2.)), c = S(uv + t * vec2(2., 2.));
  vec3 d = S(uv + t * vec2(-2., 0.)), e = S(uv), f = S(uv + t * vec2(2., 0.));
  vec3 g = S(uv + t * vec2(-2., -2.)), h = S(uv + t * vec2(0., -2.)), i = S(uv + t * vec2(2., -2.));
  vec3 j = S(uv + t * vec2(-1., 1.)), k = S(uv + t * vec2(1., 1.)), l = S(uv + t * vec2(-1., -1.)), m = S(uv + t * vec2(1., -1.));
  o = vec4(e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125, 1.);
}`;
  const UP = `
uniform sampler2D uSrc; uniform sampler2D uAdd; uniform vec2 uTexel; uniform float uRadius; out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec2 t = uTexel * uRadius;
  vec3 s = texture(uSrc, uv + t * vec2(-1., 1.)).rgb + 2. * texture(uSrc, uv + t * vec2(0., 1.)).rgb + texture(uSrc, uv + t * vec2(1., 1.)).rgb
    + 2. * texture(uSrc, uv + t * vec2(-1., 0.)).rgb + 4. * texture(uSrc, uv).rgb + 2. * texture(uSrc, uv + t * vec2(1., 0.)).rgb
    + texture(uSrc, uv + t * vec2(-1., -1.)).rgb + 2. * texture(uSrc, uv + t * vec2(0., -1.)).rgb + texture(uSrc, uv + t * vec2(1., -1.)).rgb;
  o = vec4(texture(uAdd, uv).rgb + s / 16., 1.);
}`;
  const COMP = `
uniform sampler2D uScene; uniform sampler2D uBloom;
uniform float uTime, uBloomMix, uGlow, uExposure, uCA, uVig, uGrain, uDistort, uSat, uContrast, uFlash, uLevels, uHalation, uClip, uAces;
uniform vec3 uLift, uGain, uFlashCol; uniform vec2 uVigC;
out vec4 o;
vec3 rolloff(vec3 c){
  float m = max(c.r, max(c.g, c.b));
  float k = uClip;
  if (m > k) { float n = k + (1. - k) * (1. - exp(-(m - k) / (1. - k))); c *= n / m; c = mix(c, vec3(n), sat((m - 1.) * .18)); }
  return c;
}
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 uv = fc / uRes;
  vec2 cc = uv - .5; float asp = uRes.x / uRes.y;
  vec2 ca = cc * vec2(asp, 1.); float r2 = dot(ca, ca);
  vec2 uvd = .5 + cc * (1. + uDistort * r2);
  vec2 sh = cc * uCA * (.6 + r2);
  vec3 col = vec3(texture(uScene, uvd + sh).r, texture(uScene, uvd).g, texture(uScene, uvd - sh).b);
  vec3 bl = texture(uBloom, uvd).rgb / uLevels;
  col = mix(col, bl, uBloomMix) + bl * uGlow + bl * vec3(1., .32, .1) * uHalation;
  col = uAces > .5 ? clamp((col * uExposure * (2.51 * col * uExposure + .03)) / (col * uExposure * (2.43 * col * uExposure + .59) + .14), 0., 1.) : rolloff(col * uExposure);
  vec3 s = toSrgb(col);
  s = s * uGain + uLift * (1. - s);
  s = mix(vec3(luma(s)), s, uSat);
  s = (s - .5) * uContrast + .5;
  vec2 vc = (uv - uVigC) * vec2(asp, 1.);
  s *= 1. - uVig * smoothstep(.3, 1.15, length(vc));
  s = mix(s, uFlashCol, sat(uFlash));
  float t = floor(uTime * 30.);
  float g = hash12(fc + vec2(t * 37.17, t * 11.31)) + hash12(fc * 1.131 + vec2(t * 19.7, t * 53.1)) - 1.;
  s += g * uGrain * (1.1 - .7 * sat(luma(s)));
  s += (hash12(fc * 1.7 + fract(uTime * 3.1) * 91.7) - .5) / 255.;
  o = vec4(clamp(s, 0., 1.), 1.);
}`;
  const FINISH = {
    bloom: 0.05, glow: 0, exposure: 1, ca: 0, vig: 0.22, grain: 0.035, distort: 0, sat: 1, contrast: 1, flash: 0,
    halation: 0, clip: 0.8, lift: [0, 0, 0], gain: [1, 1, 1], flashCol: [1, 1, 1], vigC: [0.5, 0.5], radius: 1, aces: 0,
  };
  O.Post = class {
    constructor(G) {
      this.G = G;
      this.pDown = G.program(DOWN);
      this.pUp = G.program(UP);
      this.pComp = G.program(COMP);
      this.down = [];
      this.up = [];
      this.w = 0;
      this.h = 0;
    }
    resize(w, h) {
      if (w === this.w && h === this.h) return;
      this.w = w;
      this.h = h;
      const G = this.G;
      let lw = w, lh = h, i = 0;
      for (; i < 7; i++) {
        lw = Math.max(1, lw >> 1);
        lh = Math.max(1, lh >> 1);
        if (lw < 6 || lh < 6) break;
        if (this.down[i]) { G.resizeTarget(this.down[i], lw, lh); G.resizeTarget(this.up[i], lw, lh); }
        else { this.down.push(G.target(lw, lh)); this.up.push(G.target(lw, lh)); }
      }
      this.levels = i;
    }
    // scene: HDR target in linear light. o: finish settings (see FINISH)
    run(scene, o, out) {
      const G = this.G;
      this.resize(scene.w, scene.h);
      const n = this.levels;
      const f = Object.assign({}, FINISH, o || {});
      let src = f.bloomSrc || scene;
      for (let i = 0; i < n; i++) {
        G.draw(this.pDown, { uSrc: src, uTexel: [1 / src.w, 1 / src.h], uFirst: i === 0 ? 1 : 0 }, this.down[i]);
        src = this.down[i];
      }
      let up = this.down[n - 1];
      for (let i = n - 2; i >= 0; i--) {
        G.draw(this.pUp, { uSrc: up, uAdd: this.down[i], uTexel: [1 / up.w, 1 / up.h], uRadius: f.radius }, this.up[i]);
        up = this.up[i];
      }
      G.draw(this.pComp, {
        uScene: scene, uBloom: up, uLevels: n, uTime: f.time || performance.now() / 1000,
        uBloomMix: f.bloom, uGlow: f.glow, uExposure: f.exposure, uCA: f.ca, uVig: f.vig, uGrain: f.grain,
        uDistort: f.distort, uSat: f.sat, uContrast: f.contrast, uFlash: f.flash, uHalation: f.halation, uClip: f.clip,
        uLift: f.lift, uGain: f.gain, uFlashCol: f.flashCol, uVigC: f.vigC, uAces: f.aces,
      }, out || null);
    }
  };

  // ================================================================ film overlay for DOM-drawn modes
  O.Film = class {
    constructor(parent, o) {
      o = Object.assign({ grain: 0.09, vignette: 0.5 }, o || {});
      this.el = U.el('div', 'film', parent);
      this.g = U.el('div', 'film-grain', this.el);
      this.v = U.el('div', 'film-vig', this.el);
      this.g.style.backgroundImage = 'url(' + O.Film.tile() + ')';
      this.set(o.grain, o.vignette);
      this.n = 0;
    }
    set(grain, vignette) {
      if (grain != null) this.g.style.opacity = String(grain);
      if (vignette != null) this.v.style.opacity = String(vignette);
    }
    static tile() {
      if (O.Film._t) return O.Film._t;
      const S = 256, c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      const d = x.createImageData(S, S), r = U.rng(4411);
      for (let i = 0; i < S * S; i++) {
        const v = 128 + (r() + r() + r() - 1.5) * 150;
        d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = U.clamp(v, 0, 255);
        d.data[i * 4 + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      O.Film._t = c.toDataURL('image/png');
      return O.Film._t;
    }
    frame() {
      if (++this.n % 2) return;
      const x = (Math.random() * 256) | 0, y = (Math.random() * 256) | 0;
      this.g.style.transform = 'translate3d(' + -x + 'px,' + -y + 'px,0)';
    }
  };
  O.css('film', `
.gl-canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
.film { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 40; }
.film-grain { position: absolute; left: 0; top: 0; width: calc(100% + 256px); height: calc(100% + 256px); mix-blend-mode: overlay; will-change: transform; }
.film-vig { position: absolute; inset: 0; background: radial-gradient(ellipse 75% 72% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 82%, rgba(0,0,0,0.9) 100%); }
.perf-light .film-grain { display: none; }
`);

  // ================================================================ a GPU background under a DOM mode
  O.Backdrop = class {
    constructor(ctx, fs, o) {
      o = o || {};
      this.ctx = ctx;
      this.ok = O.glSupported();
      this.tex = {};
      if (!this.ok) return;
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      this.ok = G.ok;
      if (!G.ok) return;
      ctx.root.insertBefore(G.canvas, ctx.root.firstChild);
      this.p = G.program(fs);
      this.post = new O.Post(G);
      this.rt = G.target(4, 4);
      this.scale = o.scale || 0.6;
    }
    texture(name, src, o) {
      if (!this.ok) return null;
      if (!this.tex[name]) this.tex[name] = this.G.texture(null, o || {});
      if (src) this.G.upload(this.tex[name], src);
      return this.tex[name];
    }
    frame(u, finish) {
      if (!this.ok || this.G.lost) return;
      const ctx = this.ctx, G = this.G, s = O.glScale(ctx, false) * this.scale;
      if (G.size(ctx.W * s, ctx.H * s)) G.resizeTarget(this.rt, G.w, G.h);
      G.draw(this.p, u, this.rt);
      this.post.run(this.rt, finish);
    }
    destroy() { if (this.G) this.G.destroy(); }
  };

  // ================================================================ helpers
  // draw text into a tight canvas: returns metrics for placing it
  O.textBitmap = function (text, font, o) {
    o = o || {};
    const c = o.canvas || document.createElement('canvas');
    const x = c.getContext('2d');
    x.font = font;
    if (o.spacing) x.letterSpacing = o.spacing;
    const m = x.measureText(text);
    const asc = Math.ceil(Math.max(m.actualBoundingBoxAscent || 0, 1));
    const desc = Math.ceil(Math.max(m.actualBoundingBoxDescent || 0, 0));
    const left = Math.ceil(Math.max(m.actualBoundingBoxLeft || 0, 0));
    const right = Math.ceil(Math.max(m.actualBoundingBoxRight || m.width, 1));
    const pad = Math.ceil(o.pad || 0);
    const w = Math.max(2, left + right + pad * 2), h = Math.max(2, asc + desc + pad * 2);
    c.width = w;
    c.height = h;
    x.font = font;
    if (o.spacing) x.letterSpacing = o.spacing;
    x.textBaseline = 'alphabetic';
    x.fillStyle = o.color || '#fff';
    x.fillText(text, pad + left, pad + asc);
    return { canvas: c, w, h, asc, desc, left, right, pad, width: m.width, baseX: pad + left, baseY: pad + asc };
  };
  // critically damped spring (exact): s = {x, v}
  O.spring = function (s, target, omega, dt) {
    const x0 = s.x - target, e = Math.exp(-omega * dt), tmp = (s.v + omega * x0) * dt;
    s.x = target + (x0 + tmp) * e;
    s.v = (s.v - omega * tmp) * e;
    return s.x;
  };
  O.sp = (x) => ({ x: x || 0, v: 0 });
  // smooth random walk for handheld camera feel
  O.Shake = class {
    constructor(seed) { this.n = [0, 1, 2, 3, 4].map((k) => U.noise1(seed * 7 + k)); }
    at(t, k) { return this.n[k % 5](t); }
  };
  // linear-light colour from a 0..255 triple
  O.lin = (c) => [Math.pow(c[0] / 255, 2.2), Math.pow(c[1] / 255, 2.2), Math.pow(c[2] / 255, 2.2)];
  // render scale for GL modes: device pixels, scaled by the performance setting
  O.glScale = function (ctx, heavy) {
    const p = ctx.settings.perf;
    const d = window.devicePixelRatio || 1;
    let s = p === 'light' ? Math.min(1, d) * 0.6 : p === 'smooth' ? Math.min(2, d) : Math.min(1.5, d);
    if (heavy) s *= p === 'smooth' ? 1 : 0.85;
    // keep huge screens affordable
    const px = ctx.W * ctx.H * s * s;
    if (px > 5.2e6) s *= Math.sqrt(5.2e6 / px);
    return s;
  };
})();
