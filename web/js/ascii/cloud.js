/* Oley · ASCII 3D scenes. Every design is a cloud of tens of thousands of shaded points sampled on real
   surfaces (petals, hulls, waves, terrain…) plus fine filaments, breathing slowly while a camera drifts
   round it. The ASCII mode renders the cloud at three pixels per character cell and prints the result.

   A design is one function that builds geometry with the builder below:
     O.Cloud.add('flowers', 'tulips', (B, R) => { …B.petal(…), B.sphere(…)… }, { cam: {…}, sky: […] });
   See d-*.js for the 120 built-in ones. */
(function () {
  'use strict';
  const O = window.Oley;
  const TAU = Math.PI * 2;
  const Cl = (O.Cloud = { designs: {}, list: [], cats: ['flowers', 'space', 'cars', 'cities', 'oceans', 'scenery'] });
  // the design files, in order (also loaded by the build worker, cloud-worker.js)
  Cl.FILES = ['kit3d.js', 'd-flowers.js', 'd-space.js', 'd-cars.js', 'd-cities.js', 'd-oceans.js', 'd-scenery.js'];
  // a small seeded random generator (no dependencies, so the worker can use it too)
  Cl.rng = function (seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    const R = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    R.r = (x, y) => x + (y - x) * R(); R.i = (x, y) => Math.floor(x + (y - x + 1) * R()); R.ch = (p) => R() < p; R.pick = (l) => l[Math.floor(R() * l.length) % l.length]; R.sgn = () => (R() < 0.5 ? -1 : 1);
    return R;
  };
  Cl.add = function (cat, name, build, meta) {
    const d = { cat, name, build, meta: meta || {} };
    (Cl.designs[cat] = Cl.designs[cat] || []).push(d);
    Cl.list.push(d);
    return d;
  };
  Cl.find = (name) => Cl.list.find((d) => d.name === name) || null;

  // ---------------------------------------------------------------- small vector kit
  const V = (Cl.V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    // an orthonormal frame with Z along the axis
    frame(axis) {
      const Z = V.norm(axis);
      let X = V.cross(Math.abs(Z[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], Z);
      X = V.norm(X);
      return [X, V.cross(Z, X), Z];
    },
  });
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hex = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
  Cl.mix = mix; Cl.smooth = smooth; Cl.clamp = clamp; Cl.hex = hex;
  // value noise for terrain, clouds and bark
  function makeNoise(seed) {
    const p = new Uint8Array(512), R = Cl.rng(seed);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const g = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
    const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const n3 = (x, y, z) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = f(x), v = f(y), w = f(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      const l = (a, b, t) => a + (b - a) * t;
      return l(l(l(g(p[AA] & 15, x, y, z), g(p[BA] & 15, x - 1, y, z), u), l(g(p[AB] & 15, x, y - 1, z), g(p[BB] & 15, x - 1, y - 1, z), u), v),
        l(l(g(p[AA + 1] & 15, x, y, z - 1), g(p[BA + 1] & 15, x - 1, y, z - 1), u), l(g(p[AB + 1] & 15, x, y - 1, z - 1), g(p[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
    };
    const fbm = (x, y, z, oct) => { let s = 0, a = 0.5, fq = 1; for (let i = 0; i < (oct || 4); i++) { s += a * n3(x * fq, y * fq, z * fq); fq *= 2.03; a *= 0.5; } return s; };
    return { n3, fbm };
  }

  // ---------------------------------------------------------------- the builder
  // Vertex: position 3, colour 3, hair vector 3, anim kind, a, b, seed, tip  (14 floats)
  const STRIDE = 14;
  // anim kinds (see the vertex shader): 0 still, 1 water, 2 twinkle, 3 spin round a pivot, 4 fall/rise (wraps in y),
  // 5 travel along x (wraps), 6 sway in the wind, 7 rise and fade (flames, embers, bubbles), 8 pulse with the beat, 9 travel along z (wraps)
  const A = (Cl.A = { still: 0, water: 1, twinkle: 2, spin: 3, fall: 4, travel: 5, sway: 6, rise: 7, beat: 8, travelZ: 9 });
  class Builder {
    constructor(seed) {
      this.R = Cl.rng(seed >>> 0);
      this.N = makeNoise(seed >>> 0);
      this.P = [];
      this.L = [];
      this.light = V.norm([-0.35, 0.55, 0.78]);
      this.amb = 0.32;
      this.dif = 0.85;
      this.grain = 0.3;
      this.M = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; // 3x3 rotation-scale (row major) + translation
      this.stack = [];
      this.pivots = [];
      this.anim = null;
      this.psz = 0;
      this.u = {};          // per design uniforms: wrapY, wrapX, wrapZ, swayY
    }
    // transforms
    push() { this.stack.push(this.M.slice()); return this; }
    pop() { this.M = this.stack.pop() || [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; return this; }
    mulM(R3, t) {
      const M = this.M, o = M.slice();
      // new = M * [R3 | t]
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = M[r * 3] * R3[c] + M[r * 3 + 1] * R3[3 + c] + M[r * 3 + 2] * R3[6 + c];
      for (let r = 0; r < 3; r++) o[9 + r] = M[r * 3] * t[0] + M[r * 3 + 1] * t[1] + M[r * 3 + 2] * t[2] + M[9 + r];
      this.M = o;
      return this;
    }
    move(x, y, z) { return this.mulM([1, 0, 0, 0, 1, 0, 0, 0, 1], [x, y, z]); }
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return this.mulM([1, 0, 0, 0, c, -s, 0, s, c], [0, 0, 0]); }
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return this.mulM([c, 0, s, 0, 1, 0, -s, 0, c], [0, 0, 0]); }
    rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return this.mulM([c, -s, 0, s, c, 0, 0, 0, 1], [0, 0, 0]); }
    scale(x, y, z) { if (y == null) { y = x; z = x; } return this.mulM([x, 0, 0, 0, y, 0, 0, 0, z], [0, 0, 0]); }
    // turn so local +z points along axis (and stand at p, if given)
    aim(axis, p) { const F = V.frame(axis); return this.mulM([F[0][0], F[1][0], F[2][0], F[0][1], F[1][1], F[2][1], F[0][2], F[1][2], F[2][2]], p || [0, 0, 0]); }
    // every point added inside fn gets this animation
    with(an, fn) { const o = this.anim; this.anim = an; try { fn(); } finally { this.anim = o; } return this; }
    tp(p) { const M = this.M; return [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[9], M[3] * p[0] + M[4] * p[1] + M[5] * p[2] + M[10], M[6] * p[0] + M[7] * p[1] + M[8] * p[2] + M[11]]; }
    tv(v) { const M = this.M; return [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]]; }
    // a pivot that spins: returns its index for anim 'spin'
    pivot(c, axis, speed) { const cw = this.tp(c), ax = V.norm(this.tv(axis)); this.pivots.push([cw[0], cw[1], cw[2], speed || 1, ax[0], ax[1], ax[2]]); return this.pivots.length - 1; }

    // light: how bright a surface with world normal n looks
    shade(n, two) {
      let d = V.dot(n, this.light);
      if (two) d = Math.abs(d);
      let s = this.amb + this.dif * Math.max(0, d);
      s *= 1 - this.grain * 0.5 + this.grain * this.R();
      if (this.R() < 0.03) s *= 1.45;
      return s;
    }
    // one point in local coordinates
    // (for points the hair-vector slot carries a size multiplier instead; 0 = normal)
    pt(p, c, an) {
      const w = this.tp(p), a = an || this.anim || null;
      this.P.push(w[0], w[1], w[2], c[0], c[1], c[2], this.psz, 0, 0, a ? a[0] : 0, a ? a[1] || 0 : 0, a ? a[2] || 0 : 0, this.R(), 0);
    }
    ptW(w, c, an) {
      const a = an || this.anim || null;
      this.P.push(w[0], w[1], w[2], c[0], c[1], c[2], this.psz, 0, 0, a ? a[0] : 0, a ? a[1] || 0 : 0, a ? a[2] || 0 : 0, this.R(), 0);
    }
    // bigger points inside fn (wide grounds and seas read as surfaces, not scattered dots)
    size(k, fn) { const o = this.psz; this.psz = k; try { fn(); } finally { this.psz = o; } return this; }
    // a fine filament from p along d (local), drawn as a line whose tip wavers
    hair(p, d, c0, c1, an) {
      const w = this.tp(p), v = this.tv(d), a = an || this.anim || null, s = this.R();
      const k = a ? a[0] : 0, ka = a ? a[1] || 0 : 0, kb = a ? a[2] || 0 : 0;
      this.L.push(w[0], w[1], w[2], c0[0], c0[1], c0[2], v[0], v[1], v[2], k, ka, kb, s, 0);
      this.L.push(w[0], w[1], w[2], c1[0], c1[1], c1[2], v[0], v[1], v[2], k, ka, kb, s, 1);
    }
    // a straight line: both ends share one anchor (the far end is anchor + offset), so moving / wrapping
    // animations carry the whole segment together and it can never stretch across the scene
    line(a, b, ca, cb, an) {
      const p = this.tp(a), q = this.tp(b), d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], s = this.R(), x = an || this.anim || null;
      const k = x ? x[0] : 0, ka = x ? x[1] || 0 : 0, kb = x ? x[2] || 0 : 0;
      this.L.push(p[0], p[1], p[2], ca[0], ca[1], ca[2], 0, 0, 0, k, ka, kb, s, 0);
      this.L.push(p[0], p[1], p[2], (cb || ca)[0], (cb || ca)[1], (cb || ca)[2], d[0], d[1], d[2], k, ka, kb, s, 2);
    }

    // ------------------------------------------------------------ surfaces
    // fn(u, v) → local point. o: { col: rgb | (u, v, p, n) → rgb, two, lit:false, an, hair: {n, len, c0, c1}, du }
    surf(fn, n, o) {
      o = o || {};
      const R = this.R, e = o.e || 0.003;
      const colF = typeof o.col === 'function' ? o.col : null, col = colF ? null : o.col || [1, 1, 1];
      for (let i = 0; i < n; i++) {
        const u = o.uPow ? Math.pow(R(), o.uPow) : R(), v = R();
        const p = fn(u, v);
        if (!p) continue;
        let nl;
        if (o.normal) nl = o.normal(u, v, p);
        else {
          const pu = fn(Math.min(1, u + e), v) || p, pv = fn(u, Math.min(1, v + e)) || p;
          const qu = u + e > 1 ? fn(u - e, v) : null, qv = v + e > 1 ? fn(u, v - e) : null;
          const du = qu ? V.sub(p, qu) : V.sub(pu, p), dv = qv ? V.sub(p, qv) : V.sub(pv, p);
          nl = V.norm(V.cross(du, dv));
          if (o.flip) nl = V.mul(nl, -1);
        }
        const nw = V.norm(this.tv(nl));
        let c = colF ? colF(u, v, p, nw) : col;
        if (!c) continue;
        if (o.lit !== false) { const s = this.shade(nw, o.two !== false); c = [c[0] * s, c[1] * s, c[2] * s]; }
        this.pt(p, c, o.an);
        if (o.hair && R() < o.hair.p) {
          const hl = o.hair.len * (0.5 + R());
          const d = V.norm([nl[0] + (R() - 0.5) * 0.9, nl[1] + (R() - 0.5) * 0.9, nl[2] + (R() - 0.5) * 0.9]);
          this.hair(p, V.mul(d, hl), o.hair.c0 || c, o.hair.c1 || [1, 1, 1], o.an);
        }
      }
      return this;
    }
    sphere(c, r, n, o) {
      o = o || {};
      const y0 = o.y0 == null ? -1 : o.y0, y1 = o.y1 == null ? 1 : o.y1;
      return this.surf((u, v) => {
        const y = y0 + (y1 - y0) * u, a = v * TAU, s = Math.sqrt(Math.max(0, 1 - y * y));
        return [c[0] + Math.cos(a) * s * r, c[1] + y * r, c[2] + Math.sin(a) * s * r];
      }, n, Object.assign({ normal: (u, v, p) => V.norm(V.sub(p, c)) }, o));
    }
    ellip(c, rx, ry, rz, n, o) {
      return this.surf((u, v) => {
        const y = -1 + 2 * u, a = v * TAU, s = Math.sqrt(Math.max(0, 1 - y * y));
        return [c[0] + Math.cos(a) * s * rx, c[1] + y * ry, c[2] + Math.sin(a) * s * rz];
      }, n, Object.assign({ normal: (u, v, p) => V.norm([(p[0] - c[0]) / (rx * rx), (p[1] - c[1]) / (ry * ry), (p[2] - c[2]) / (rz * rz)]) }, o));
    }
    // a tube between a and b, radius r0 → r1 (a cone when r1 = 0)
    cyl(a, b, r0, r1, n, o) {
      const ax = V.sub(b, a), F = V.frame(ax), L = V.len(ax);
      if (r1 == null) r1 = r0;
      return this.surf((u, v) => {
        const ang = v * TAU, r = r0 + (r1 - r0) * u, cs = Math.cos(ang), sn = Math.sin(ang);
        return [a[0] + F[0][0] * cs * r + F[1][0] * sn * r + F[2][0] * u * L, a[1] + F[0][1] * cs * r + F[1][1] * sn * r + F[2][1] * u * L, a[2] + F[0][2] * cs * r + F[1][2] * sn * r + F[2][2] * u * L];
      }, n, Object.assign({ normal: (u, v) => { const ang = v * TAU; return V.norm(V.add(V.mul(F[0], Math.cos(ang)), V.mul(F[1], Math.sin(ang)))); } }, o));
    }
    // a ring of radius R and thickness r, in the XZ plane round c
    torus(c, Rr, r, n, o) {
      return this.surf((u, v) => {
        const a = u * TAU, b = v * TAU, q = Rr + r * Math.cos(b);
        return [c[0] + Math.cos(a) * q, c[1] + r * Math.sin(b), c[2] + Math.sin(a) * q];
      }, n, Object.assign({ normal: (u, v) => { const a = u * TAU, b = v * TAU; return [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)]; } }, o));
    }
    // a flat annulus in the XZ plane (r0 = 0: a disc)
    disc(c, r0, r1, n, o) {
      return this.surf((u, v) => { const a = v * TAU, r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * u); return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r]; },
        n, Object.assign({ normal: () => [0, 1, 0] }, o));
    }
    // a parallelogram p0 + u·eu + v·ev
    quad(p0, eu, ev, n, o) {
      if (!this.psz && !(o && o.ps === 0) && V.len(eu) * V.len(ev) > 4) return this.size(o && o.ps ? o.ps : 1.8, () => this.quad(p0, eu, ev, n, Object.assign({}, o, { ps: 0 })));
      const nn = V.norm(V.cross(eu, ev));
      return this.surf((u, v) => [p0[0] + eu[0] * u + ev[0] * v, p0[1] + eu[1] * u + ev[1] * v, p0[2] + eu[2] * u + ev[2] * v], n, Object.assign({ normal: () => nn }, o));
    }
    // a box centred at c; col may be (face, fu, fv, p) → rgb with faces 0..5 = +x −x +y −y +z −z
    box(c, sx, sy, sz, n, o) {
      o = o || {};
      const R = this.R, hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const A2 = [sy * sz, sy * sz, sx * sz, sx * sz, sx * sy, sx * sy], tot = A2.reduce((a, b) => a + b, 0);
      const faces = o.faces || [0, 1, 2, 3, 4, 5];
      const tf = faces.reduce((a, f) => a + A2[f], 0);
      const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      void tot;
      for (let i = 0; i < n; i++) {
        let r = R() * tf, f = faces[0];
        for (const k of faces) { if (r < A2[k]) { f = k; break; } r -= A2[k]; }
        const a = R(), b = R();
        let p;
        if (f < 2) p = [f === 0 ? hx : -hx, -hy + a * sy, -hz + b * sz];
        else if (f < 4) p = [-hx + a * sx, f === 2 ? hy : -hy, -hz + b * sz];
        else p = [-hx + a * sx, -hy + b * sy, f === 4 ? hz : -hz];
        const lp = [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
        let col = typeof o.col === 'function' ? o.col(f, a, b, lp) : o.col || [1, 1, 1];
        if (!col) continue;
        const nw = V.norm(this.tv(N[f]));
        if (o.lit !== false && !(col.length > 3 && col[3])) { const s = this.shade(nw, false); col = [col[0] * s, col[1] * s, col[2] * s]; }
        this.pt(lp, col, o.an);
      }
      return this;
    }
    // a tube along a curve f(t) → p, radius r(t)
    tube(f, r, n, o) {
      const e = 0.002;
      return this.surf((u, v) => {
        const p = f(u), q = f(Math.min(1, u + e)), p0 = u + e > 1 ? f(u - e) : p;
        const T = V.norm(u + e > 1 ? V.sub(p, p0) : V.sub(q, p)), F = V.frame(T), a = v * TAU, rr = typeof r === 'function' ? r(u) : r;
        return [p[0] + (F[0][0] * Math.cos(a) + F[1][0] * Math.sin(a)) * rr, p[1] + (F[0][1] * Math.cos(a) + F[1][1] * Math.sin(a)) * rr, p[2] + (F[0][2] * Math.cos(a) + F[1][2] * Math.sin(a)) * rr];
      }, n, o);
    }
    // a heightfield y = h(x, z) over [x0, x1] × [z0, z1]
    terrain(x0, x1, z0, z1, h, n, o) {
      const e = 0.01 * Math.max(x1 - x0, z1 - z0);
      if (!this.psz && !(o && o.ps === 0)) return this.size(o && o.ps ? o.ps : 1.9, () => this.terrain(x0, x1, z0, z1, h, n, Object.assign({}, o, { ps: 0 })));
      return this.surf((u, v) => { const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * v; return [x, h(x, z), z]; }, n,
        Object.assign({ normal: (u, v, p) => V.norm([h(p[0] - e, p[2]) - h(p[0] + e, p[2]), 2 * e, h(p[0], p[2] - e) - h(p[0], p[2] + e)]) }, o));
    }
    // a soft volume of points (clouds, nebulae, foliage): gaussian round c
    blob(c, r, n, o) {
      o = o || {};
      const R = this.R, sq = o.sq || [1, 1, 1];
      for (let i = 0; i < n; i++) {
        const g = () => (R() + R() + R() - 1.5) * 1.15;
        const d = [g() * r * sq[0], g() * r * sq[1], g() * r * sq[2]];
        const p = [c[0] + d[0], c[1] + d[1], c[2] + d[2]];
        let col = typeof o.col === 'function' ? o.col(p, d) : o.col || [1, 1, 1];
        if (!col) continue;
        if (o.lit) { const s = this.shade(V.norm(this.tv(d)), false); col = [col[0] * s, col[1] * s, col[2] * s]; }
        this.pt(p, col, o.an);
      }
      return this;
    }
    // points along a polyline or a curve f(t)
    trail(f, n, col, o) {
      o = o || {};
      for (let i = 0; i < n; i++) {
        const t = this.R(), p = f(t), j = o.j || 0;
        const c = typeof col === 'function' ? col(t, p) : col;
        if (!c) continue;
        this.pt([p[0] + (this.R() - 0.5) * j, p[1] + (this.R() - 0.5) * j, p[2] + (this.R() - 0.5) * j], c, o.an);
      }
      return this;
    }
    // ------------------------------------------------------------ a petal (lily-like): a strip bent along its length,
    // cupped across, ruffled at the edges. Grows along +z of the local frame, opening out toward +x at azimuth az.
    // o: { L, W, az, open (0 up … 1.4 flat out), curl, cup, twist, ruf, tip, col: (u, v, front) → rgb, spots, hairP, hairLen }
    petal(o) {
      const N = 60, R = this.R, L = o.L, Wd = o.W;
      const rad = new Float32Array(N + 1), zz = new Float32Array(N + 1), ph = new Float32Array(N + 1);
      let r = (o.r0 || 0.02) * L, z = 0;
      for (let i = 0; i <= N; i++) {
        const u = i / N, a = (o.open0 == null ? 0.25 : o.open0) + (o.open || 1) * u + (o.curl || 0) * u * u * u;
        rad[i] = r; zz[i] = z; ph[i] = a;
        r += Math.sin(a) * L / N; z += Math.cos(a) * L / N;
      }
      const ca = Math.cos(o.az), sa = Math.sin(o.az);
      const shape = o.shape || ((u) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(u, 0, 1), 0.75)), 0.7));
      const ruf = o.ruf || 0, fr = o.fr || 18, phs = R() * TAU, cup = o.cup == null ? 0.3 : o.cup, tw = o.twist || 0, bend = o.bend || 0;
      const pos = (u, v) => {
        const f = clamp(u, 0, 1) * N, i = Math.min(N - 1, f | 0), t = f - i;
        const rr = rad[i] + (rad[i + 1] - rad[i]) * t, z2 = zz[i] + (zz[i + 1] - zz[i]) * t, a = ph[i] + (ph[i + 1] - ph[i]) * t;
        const w = Wd * shape(u);
        const nr = -Math.cos(a), nz = Math.sin(a);
        const off = w * (-cup * v * v + ruf * Math.sin(u * fr + phs + v * 1.3) * v * v * smooth(0.2, 0.7, u) - 0.08 * Math.exp(-(v * v) / 0.02));
        const sv = v * w, twa = tw * u, ct = Math.cos(twa), st = Math.sin(twa);
        const side = sv * ct - off * st, nn = sv * st + off * ct;
        const R2 = rr + nr * nn, Z2 = z2 + nz * nn, T2 = side + bend * u * u * L;
        return [ca * R2 - sa * T2, sa * R2 + ca * T2, Z2];
      };
      const n = o.n || 2500, colF = o.col;
      for (let i = 0; i < n; i++) {
        const u = Math.pow(R(), 0.85), v = R() * 2 - 1;
        const p = pos(u, v), e = 0.004;
        const pu = pos(u + e, v), pv = pos(u, v + e);
        let nl = V.norm(V.cross(V.sub(pu, p), V.sub(pv, p)));
        const nw = V.norm(this.tv(nl));
        const front = V.dot(nw, this.view || [0, 0, 1]) > 0;
        let c = colF ? colF(u, Math.abs(v), front, v) : [1, 1, 1];
        if (o.spots && u > 0.08 && u < 0.7 && front && R() < o.spots * (1 - u)) c = o.spotCol || [0.4, 0.02, 0.1];
        const s = this.shade(nw, true) * (0.6 + 0.4 * smooth(0, 0.3, u));
        c = [Math.min(1.2, c[0] * s), Math.min(1.2, c[1] * s), Math.min(1.2, c[2] * s)];
        this.pt(p, c, o.an);
        if (o.hairP && (v > 0.92 || v < -0.92) && R() < o.hairP) {
          const q = pos(Math.min(1.02, u + 0.03), v * 1.25), d = V.norm(V.add(V.sub(q, p), [(R() - 0.5) * 0.4, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4]));
          this.hair(p, V.mul(d, L * (o.hairLen || 0.05) * (0.5 + R())), c, o.hairCol || [1, 0.95, 0.96], o.an);
        }
      }
      return pos;
    }
  }
  Cl.Builder = Builder;
  // build a design's arrays (main thread or worker)
  Cl.build = function (design, seed) {
    const t0 = Date.now(), B = new Builder(seed);
    if (design.meta.view) B.view = V.norm(design.meta.view);
    let err = null;
    try { design.build(B, B.R, B); } catch (e) { err = String((e && e.stack) || e); }
    return { P: new Float32Array(B.P), L: new Float32Array(B.L), piv: B.pivots.slice(0, 8), u: B.u, err, ms: Date.now() - t0 };
  };

  // ---------------------------------------------------------------- GPU
  const VS = `#version 300 es
precision highp float;
in vec3 aPos, aCol, aVec;
in vec4 aAn;   // kind, a, b, seed
in float aTip;
uniform mat4 uVP;
uniform vec3 uEye;
uniform float uT, uPs, uBreathe, uHair, uPulse, uLevel, uAlpha, uH;
uniform vec4 uPiv[8];   // centre, speed
uniform vec3 uAx[8];
uniform vec2 uWrapY, uWrapX, uWrapZ;
uniform float uSwayY;
uniform vec3 uFogC;
uniform vec2 uFog;      // start, end (0 off)
out vec4 vC;
vec3 flow(vec3 p, float t) {
  return vec3(sin(p.y * 1.9 + t * .55) + .6 * sin(p.z * 3.1 + p.x * 1.3 + t * .37),
              sin(p.x * 2.2 + t * .47 + 1.7) + .6 * sin(p.z * 2.7 - t * .41 + p.y * .9),
              sin(p.x * 2.9 + p.y * 1.1 + t * .43) + .6 * sin(p.y * 2.5 - t * .52));
}
vec3 rotA(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c); }
void main() {
  vec3 p = aPos;
  vec3 col = aCol;
  float kind = aAn.x, a = aAn.y, b = aAn.z, s = aAn.w, t = uT;
  float alpha = uAlpha;
  if (kind > .5 && kind < 1.5) {          // water
    p.y += a * (sin(p.x * 1.7 + t * b) + .6 * sin(p.z * 2.3 - t * b * .8 + p.x * .7) + .3 * sin((p.x + p.z) * 4.1 + t * b * 1.7));
    col *= .85 + .3 * (.5 + .5 * sin(p.x * 3.1 + p.z * 2.2 + t * b * 1.3));
  } else if (kind < 2.5 && kind > 1.5) {  // twinkle
    col *= .45 + .55 * (.5 + .5 * sin(t * a + s * 80.)) + uPulse * .3;
  } else if (kind < 3.5 && kind > 2.5) {  // spin round a pivot
    int g = int(b + .5);
    vec4 pv = uPiv[g];
    p = pv.xyz + rotA(p - pv.xyz, uAx[g], t * pv.w * (a == 0. ? 1. : a));
  } else if (kind < 4.5 && kind > 3.5) {  // fall / rise, wrapping in y
    p.y = uWrapY.x + mod(p.y - uWrapY.x + t * a, uWrapY.y);
    p.x += sin(t * 1.3 + s * 40.) * b;
  } else if (kind < 5.5 && kind > 4.5) {  // travel along x
    p.x = uWrapX.x + mod(p.x - uWrapX.x + t * a, uWrapX.y);
  } else if (kind < 6.5 && kind > 5.5) {  // sway in the wind (more the higher it is)
    float h = max(0., p.y - uSwayY);
    float w = sin(t * b + p.x * .6 + s * .5) + .4 * sin(t * b * 2.3 + p.z * 1.7);
    p.x += a * h * h * w; p.z += a * .4 * h * h * cos(t * b * .8 + p.x);
  } else if (kind < 7.5 && kind > 6.5) {  // rise and fade
    float life = fract(t * a + s);
    p.y += life * b; p.x += sin(t * 2. + s * 30.) * b * .08 * life; p.z += cos(t * 1.7 + s * 20.) * b * .08 * life;
    col *= (1. - life) * (1. - life) * 1.6;
  } else if (kind < 8.5 && kind > 7.5) {  // pulse with the beat
    col *= 1. + uPulse * a + uLevel * a * .5;
  } else if (kind > 8.5) {                // travel along z
    p.z = uWrapZ.x + mod(p.z - uWrapZ.x + t * a, uWrapZ.y);
  }
  p += uBreathe * flow(p, t) + uBreathe * .25 * flow(p * 3.7 + 4., t * 1.9);
  if (aTip > 1.5) p += aVec;              // the far end of a rigid line
  else if (aTip > .5) {
    vec3 hv = aVec * uHair * (.75 + .45 * sin(t * 1.4 + s * 40.));
    hv += length(aVec) * .35 * vec3(sin(t * 2.1 + s * 61.), cos(t * 1.7 + s * 47.), sin(t * 1.3 + s * 29.));
    p += hv;
    alpha *= .55;
  }
  vec4 cp = uVP * vec4(p, 1.);
  gl_Position = cp;
  float w = max(cp.w, .05);
  float pk = aVec.x > 0. && aTip < .5 ? aVec.x : 1.;
  gl_PointSize = clamp(uPs * pk * uH / (w * 70.), 1., 7.);
  float fg = uFog.y > uFog.x ? smoothstep(uFog.x, uFog.y, distance(p, uEye)) : 0.;
  vC = vec4(mix(col, uFogC, fg), alpha);
}`;
  const FS = `#version 300 es
precision mediump float;
in vec4 vC;
out vec4 o;
void main() { o = vec4(vC.rgb * vC.a, vC.a); }`;
  const SKY = `
uniform vec3 uTop, uMid, uBot, uGlowC;
uniform float uHor, uAsp;
uniform vec3 uGlow;   // x, y (0..1) and radius
uniform vec3 uSea0, uSea1;   // open water below the true horizon: far, near
uniform float uSeaY, uSeaOn;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = uv.y > uHor ? mix(uMid, uTop, smoothstep(uHor, 1., uv.y)) : mix(uBot, uMid, smoothstep(0., uHor, uv.y));
  float sea = uSeaOn * smoothstep(uSeaY + .006, uSeaY - .006, uv.y);
  c = mix(c, mix(uSea1, uSea0, smoothstep(0., max(uSeaY, .05), uv.y)), sea);
  vec2 d = (uv - uGlow.xy) * vec2(uAsp, 1.);
  // the halo spills onto the water (its reflection); the disc itself sets behind the horizon
  if (uGlow.z > 0.) c += uGlowC * (exp(-length(d) / uGlow.z) * (.9 - sea * .35) + smoothstep(uGlow.z * .32, uGlow.z * .26, length(d)) * .9 * (1. - sea));
  c += (hash12(gl_FragCoord.xy) - .5) * .01;
  o = vec4(c, 1.);
}`;

  // A renderer living in the ASCII mode's GL context
  Cl.Renderer = class {
    constructor(G) {
      this.G = G;
      const gl = (this.gl = G.gl);
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('cloud shader: ' + gl.getShaderInfoLog(s)); return s; };
      const p = (this.p = gl.createProgram());
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      this.loc = {};
      for (const n of ['aPos', 'aCol', 'aVec', 'aAn', 'aTip']) this.loc[n] = gl.getAttribLocation(p, n);
      this.u = {};
      for (const n of ['uVP', 'uEye', 'uT', 'uPs', 'uBreathe', 'uHair', 'uPulse', 'uLevel', 'uAlpha', 'uH', 'uPiv', 'uAx', 'uWrapY', 'uWrapX', 'uWrapZ', 'uSwayY', 'uFogC', 'uFog']) this.u[n] = gl.getUniformLocation(p, n);
      this.pSky = G.program(SKY);
      this.rt = G.target(4, 4, { hdr: false });
      this.depth = gl.createRenderbuffer();
      this.dw = 0; this.dh = 0;
      this.cache = new Map();
      this.pending = new Map();
    }
    size(w, h) {
      const G = this.G, gl = this.gl;
      G.resizeTarget(this.rt, w, h);
      if (this.dw !== this.rt.w || this.dh !== this.rt.h) {
        this.dw = this.rt.w; this.dh = this.rt.h;
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.dw, this.dh);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.fb);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }
    // the design's GPU buffers, built off the main thread when it can be (so playback never stutters);
    // null until they're ready
    get(design, seed) {
      const key = design.name + ':' + seed;
      if (this.cache.has(key)) { const e = this.cache.get(key); this.cache.delete(key); this.cache.set(key, e); return e; }
      if (this.pending.has(key)) return null;
      const w = this.worker();
      if (w) { this.pending.set(key, design); w.postMessage({ key, name: design.name, seed }); return null; }
      return this.store(key, design, Cl.build(design, seed));
    }
    worker() {
      if (this.w !== undefined) return this.w;
      this.w = null;
      if (!/^https?:$/.test(location.protocol) || typeof Worker === 'undefined' || (O.params && O.params.get('assync') === '1')) return null;
      try {
        const w = new Worker('js/ascii/cloud-worker.js');
        w.onmessage = (ev) => {
          const m = ev.data || {}, d = this.pending.get(m.key);
          this.pending.delete(m.key);
          if (!d || this.dead) return;
          if (m.err) console.error('Oley ascii design ' + d.name, m.err);
          this.store(m.key, d, m);
        };
        w.onerror = (e) => { console.error('Oley ascii worker', e.message || e); e.preventDefault && e.preventDefault(); this.w = null; this.pending.clear(); };
        this.w = w;
      } catch (e) { this.w = null; }
      return this.w;
    }
    store(key, design, r) {
      if (r.err && !r.P.length) console.error('Oley ascii design ' + design.name, r.err);
      const gl = this.gl, mk = (arr) => {
        const vao = gl.createVertexArray(), buf = gl.createBuffer();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        const S = STRIDE * 4, L = this.loc;
        const at = (l, n, off) => { if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, S, off * 4); };
        at(L.aPos, 3, 0); at(L.aCol, 3, 3); at(L.aVec, 3, 6); at(L.aAn, 4, 9); at(L.aTip, 1, 13);
        gl.bindVertexArray(null);
        return { vao, buf, n: arr.length / STRIDE };
      };
      const e = { pts: mk(r.P), lines: mk(r.L), piv: r.piv || [], u: r.u || {}, err: r.err, meta: design.meta, count: r.P.length / STRIDE, ms: r.ms };
      this.cache.set(key, e);
      while (this.cache.size > 4) { const k0 = this.cache.keys().next().value; this.free(this.cache.get(k0)); this.cache.delete(k0); }
      return e;
    }
    free(e) { const gl = this.gl; for (const b of [e.pts, e.lines]) { gl.deleteBuffer(b.buf); gl.deleteVertexArray(b.vao); } }
    // draw design e at time t; cam from meta, k = 0..1 fade
    // asp: the aspect of the picture on screen (the target's pixels needn't be square: ASCII cells are tall)
    draw(e, t, A, fade, aspScreen) {
      const G = this.G, gl = this.gl, m = e.meta || {}, cm = m.cam || {};
      const w = this.rt.w, h = this.rt.h, asp = aspScreen || w / h;
      // sky
      const sky = m.sky || ['#000000', '#000000', '#000000'];
      const sc = (x) => (typeof x === 'string' ? hex(x) : x);
      const fk = fade == null ? 1 : fade;
      // skies are kept quiet: a bright sky would print as a wall of characters and bury the subject
      const sk = fk * (m.skyK == null ? 0.55 : m.skyK);
      const top = sc(sky[0]), mid = sc(sky[1] || sky[0]), bot = sc(sky[2] || sky[1] || sky[0]);
      // camera: orbit round a target, drifting
      const tg = cm.target || [0, 0, 0];
      const yaw = (cm.yaw || 0) + Math.sin(t * (cm.swaySpeed || 0.09)) * (cm.sway == null ? 0.22 : cm.sway) + (cm.spin || 0) * t;
      const pitch = (cm.pitch || 0.12) + Math.sin(t * 0.063 + 1) * (cm.bob == null ? 0.05 : cm.bob);
      const dist = (cm.dist || 6) * (1 + Math.sin(t * 0.041) * (cm.push == null ? 0.04 : cm.push)) * (1 - (A ? A.pulse : 0) * 0.008);
      const eye = [tg[0] + Math.sin(yaw) * Math.cos(pitch) * dist, tg[1] + Math.sin(pitch) * dist, tg[2] + Math.cos(yaw) * Math.cos(pitch) * dist];
      const VP = mat(eye, tg, (cm.fov || 38) * Math.PI / 180, asp, cm.near || 0.05, cm.far || 400, cm.roll || 0);
      const sea = m.sea || m.ground || null;   // open water or plain ground below the true horizon
      const seaY = 0.5 + 0.5 * Math.tan(pitch) / Math.tan(((cm.fov || 38) * Math.PI / 180) / 2);
      // a fifth glow number pins the sun to the real horizon (so it rides with the camera's bob)
      const gl0 = m.glow ? (m.glow[4] != null ? [m.glow[0], seaY + m.glow[4], m.glow[2], m.glow[3]] : m.glow) : null;
      G.draw(this.pSky, {
        uTop: top.map((v) => v * sk), uMid: mid.map((v) => v * sk), uBot: bot.map((v) => v * sk), uHor: m.horizon == null ? 0.45 : m.horizon, uAsp: asp,
        uGlow: gl0 ? [gl0[0], gl0[1], gl0[2]] : [0, 0, 0], uGlowC: gl0 ? sc(gl0[3]).map((v) => v * fk) : [0, 0, 0],
        // where the real horizon sits on screen for this camera (pitch looks down, so it rises)
        uSeaOn: sea ? 1 : 0, uSeaY: seaY,
        uSea0: sea ? sc(sea[0]).map((v) => v * fk) : [0, 0, 0], uSea1: sea ? sc(sea[1] || sea[0]).map((v) => v * fk) : [0, 0, 0],
      }, this.rt);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.fb);
      gl.viewport(0, 0, w, h);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.p);
      const U = this.u;
      gl.uniformMatrix4fv(U.uVP, false, VP);
      gl.uniform3f(U.uEye, eye[0], eye[1], eye[2]);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uPs, (m.ps || 2.4) * (cm.fov ? 38 / cm.fov : 1));
      gl.uniform1f(U.uH, h);
      gl.uniform1f(U.uBreathe, m.breathe == null ? 0.02 : m.breathe);
      gl.uniform1f(U.uHair, 1 + 0.45 * Math.sin(t * 0.55) + (A ? A.level * 0.6 : 0));
      gl.uniform1f(U.uPulse, A ? A.pulse : 0);
      gl.uniform1f(U.uLevel, A ? A.level : 0);
      const piv = new Float32Array(32), ax = new Float32Array(24);
      e.piv.forEach((q, i) => { piv.set([q[0], q[1], q[2], q[3]], i * 4); ax.set([q[4], q[5], q[6]], i * 3); });
      gl.uniform4fv(U.uPiv, piv); gl.uniform3fv(U.uAx, ax);
      const uu = e.u || {};
      gl.uniform2f(U.uWrapY, ...(uu.wrapY || [-10, 20]));
      gl.uniform2f(U.uWrapX, ...(uu.wrapX || [-20, 40]));
      gl.uniform2f(U.uWrapZ, ...(uu.wrapZ || [-20, 40]));
      gl.uniform1f(U.uSwayY, uu.swayY == null ? -10 : uu.swayY);
      const fog = m.fog || null;
      gl.uniform3f(U.uFogC, ...(fog ? sc(fog[0]).map((v) => v * sk) : [0, 0, 0]));
      gl.uniform2f(U.uFog, fog ? fog[1] : 0, fog ? fog[2] : 0);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      // points
      gl.disable(gl.BLEND); gl.depthMask(true);
      gl.uniform1f(U.uAlpha, fk);
      gl.bindVertexArray(e.pts.vao); gl.drawArrays(gl.POINTS, 0, e.pts.n);
      // filaments over them
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.uniform1f(U.uAlpha, 0.75 * fk);
      gl.bindVertexArray(e.lines.vao); gl.drawArrays(gl.LINES, 0, e.lines.n);
      gl.bindVertexArray(null);
      gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return this.rt;
    }
    destroy() { this.dead = true; if (this.w) { try { this.w.terminate(); } catch (e) {} } for (const e of this.cache.values()) this.free(e); this.cache.clear(); }
  };
  // view-projection (column-major) for a camera at eye looking at tg
  function mat(eye, tg, fov, asp, n, f, roll) {
    const Z = V.norm(V.sub(eye, tg));
    let up = [Math.sin(roll), Math.cos(roll), 0];
    let X = V.cross(up, Z); if (V.len(X) < 1e-4) X = [1, 0, 0]; X = V.norm(X);
    const Y = V.cross(Z, X);
    const tt = 1 / Math.tan(fov / 2);
    const P = [tt / asp, 0, 0, 0, 0, tt, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
    const Vw = [X[0], Y[0], Z[0], 0, X[1], Y[1], Z[1], 0, X[2], Y[2], Z[2], 0, -V.dot(X, eye), -V.dot(Y, eye), -V.dot(Z, eye), 1];
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + r] * Vw[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  }
  Cl.mat = mat;
})();
