/* Oley · ASCII 3D kit: the pieces the designs are assembled from — sky things (stars, moons, planets,
   clouds), land (mountains, rocks, trees of several kinds), water, weather (rain, snow, smoke, fire),
   buildings, vehicles (a car body from a side profile, wheels, boats) and swimming creatures. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, sm = Cl.smooth, clamp = Cl.clamp;
  const add = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const K = (Cl.K = {});
  K.add = add;

  // ---------------------------------------------------------------- sky
  // stars on a big sphere (or a box of space), twinkling
  K.stars = function (B, n, r, o) {
    o = o || {};
    const R = B.R;
    B.with([A.twinkle, 1.2 + R() * 2], () => {
      for (let i = 0; i < n; i++) {
        const y = o.half ? R() * 0.95 + 0.05 : R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y);
        const b = Math.pow(R(), 5) * 1.2 + 0.25;
        const tint = R() < 0.3 ? [1, 0.85, 0.7] : R() < 0.5 ? [0.75, 0.85, 1] : [1, 1, 1];
        B.pt([Math.cos(a) * s * r + (o.c ? o.c[0] : 0), y * r * (o.flat || 1) + (o.c ? o.c[1] : 0), Math.sin(a) * s * r + (o.c ? o.c[2] : 0)], add(tint, b * (o.k || 1)), [A.twinkle, 1 + R() * 3]);
      }
    });
  };
  // a lit sphere: planet or moon; tex(p) → colour on the unit sphere
  K.planet = function (B, c, r, n, tex, o) {
    o = o || {};
    const g0 = B.grain; B.grain = 0.06;
    B.sphere(c, r, n, { col: (u, v, p, nw) => { const d = V.mul(V.sub(p, c), 1 / r); return tex(d, nw); }, two: false });
    B.grain = g0;
    if (o.atmo) { const R = B.R; for (let i = 0; i < n * 0.12; i++) { const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s]; B.pt(V.add(c, V.mul(d, r * (1.02 + R() * 0.05))), add(o.atmo, 0.4 + 0.5 * Math.max(0, V.dot(d, B.light)))); } }
  };
  K.moon = function (B, c, r, n) {
    const N = B.N;
    K.planet(B, c, r, n || 4000, (d) => { const cr = N.fbm(d[0] * 4, d[1] * 4, d[2] * 4, 4); return add([0.85, 0.84, 0.8], 0.75 + cr * 0.6 - (cr > 0.18 ? 0.25 : 0)); });
  };
  // a ring system round c in the plane with normal nrm
  K.rings = function (B, c, r0, r1, n, col, nrm) {
    const R = B.R;
    B.push().aim(nrm || [0, 1, 0.25], c);
    for (let i = 0; i < n; i++) {
      const r = r0 + (r1 - r0) * Math.sqrt(R()), a = R() * TAU, band = 0.6 + 0.4 * Math.sin(r * 40) * Math.sin(r * 13);
      if ((r - r0) / (r1 - r0) > 0.62 && (r - r0) / (r1 - r0) < 0.67) continue; // a gap
      B.pt([Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.01], add(col, band * (0.7 + R() * 0.4)));
    }
    B.pop();
  };
  // soft clouds made of points
  K.cloud = function (B, c, w, h, n, col, o) {
    o = o || {};
    const R = B.R;
    for (let k = 0; k < (o.puffs || 7); k++) {
      const pc = [c[0] + (R() - 0.5) * w, c[1] + (R() - 0.3) * h * 0.6, c[2] + (R() - 0.5) * w * 0.4];
      B.blob(pc, h * (0.35 + R() * 0.35), Math.round(n / (o.puffs || 7)), { sq: [1.6, 0.8, 1], col: (p, d) => add(col, 0.6 + 0.5 * clamp(d[1] / h + 0.5, 0, 1)), an: o.an });
    }
  };
  // a shooting star / streak
  K.streak = function (B, a, b, col, n) { B.trail((t) => V.lerp(a, b, t), n || 200, (t) => add(col, t * t)); };

  // ---------------------------------------------------------------- land
  // a range of mountains as a ridge heightfield along x (far behind), with snow above snowY
  K.mountains = function (B, x0, x1, z, depth, hmax, n, o) {
    o = o || {};
    const N = B.N, sc = o.sc || 0.6, base = o.y || 0;
    const h = (x, zz) => { const r = N.fbm(x * sc, 3.3, zz * 0.4, 5) * 1.6 + 0.35, t = 1 - Math.abs((zz - z) / depth); return base + Math.max(0, r) * hmax * Math.max(0, t) * (0.6 + 0.4 * Math.cos(x * 0.21)); };
    B.terrain(x0, x1, z - depth, z + depth, h, n, { col: (u, v, p, nw) => {
      const hh = (p[1] - base) / hmax;
      let c = mix(o.low || [0.12, 0.15, 0.12], o.high || [0.3, 0.3, 0.33], clamp(hh * 1.3, 0, 1));
      if (o.snow !== false && hh > (o.snowY || 0.55) && nw[1] > 0.35) c = o.snowCol || [0.92, 0.94, 1];
      return c;
    } });
    return h;
  };
  // rolling ground
  K.hills = function (B, w, d, y, amp, n, col, o) {
    o = o || {};
    const N = B.N, f = o.f || 0.35;
    const h = (x, z) => y + N.fbm(x * f, 7.1, z * f, 4) * amp * 2;
    B.terrain(-w, w, -d, d, h, n, { col: (u, v, p) => { const g = N.fbm(p[0] * 2.3, 1.7, p[2] * 2.3, 2); return typeof col === 'function' ? col(p, g) : mix(col, add(col, 1.6), 0.5 + g); } });
    return h;
  };
  K.rock = function (B, c, r, n, col) {
    const N = B.N, s = B.R() * 9;
    B.surf((u, v) => { const y = -1 + 2 * u, a = v * TAU, q = Math.sqrt(Math.max(0, 1 - y * y)), d = [Math.cos(a) * q, y, Math.sin(a) * q], k = 1 + N.fbm(d[0] * 2 + s, d[1] * 2, d[2] * 2, 3) * 0.6; return [c[0] + d[0] * r * k, c[1] + Math.max(-0.2, d[1]) * r * k * 0.7, c[2] + d[2] * r * k]; }, n, { col: col || [0.35, 0.33, 0.3] });
  };
  // a conifer: stacked drooping tiers of needles
  K.pine = function (B, base, h, o) {
    o = o || {};
    const R = B.R, tiers = o.tiers || 7, col = o.col || [0.07, 0.2, 0.1], snow = o.snow;
    B.cyl(base, V.add(base, [0, h * 0.95, 0]), h * 0.035, h * 0.01, Math.round(160 * h), { col: [0.22, 0.14, 0.08] });
    for (let k = 0; k < tiers; k++) {
      const q = k / tiers, y = base[1] + h * (0.18 + 0.8 * q), rr = h * 0.32 * (1 - q * 0.85), n = Math.round((o.n || 900) * h * (1 - q * 0.6) / tiers * 3);
      for (let i = 0; i < n; i++) {
        const a = R() * TAU, r = rr * Math.sqrt(R()), dy = -r * 0.45 + (R() - 0.5) * h * 0.04;
        const p = [base[0] + Math.cos(a) * r, y + dy, base[2] + Math.sin(a) * r];
        const lit = 0.55 + 0.45 * Math.max(0, Math.cos(a) * B.light[0] + Math.sin(a) * B.light[2]);
        let c = add(col, lit * (0.7 + R() * 0.6));
        if (snow && R() < 0.45 && dy > -r * 0.4) c = add([0.9, 0.93, 1], 0.7 + lit * 0.3);
        B.pt(p, c);
      }
    }
  };
  // a broadleaf tree: a recursive trunk and branches with leafy blobs at the tips
  K.tree = function (B, base, h, o) {
    o = o || {};
    const R = B.R, bark = o.bark || [0.25, 0.17, 0.11], leaf = o.leaf || [0.18, 0.38, 0.12];
    const tips = [];
    const branch = (p, d, len, r, depth) => {
      const q = V.add(p, V.mul(d, len));
      B.cyl(p, q, r, r * 0.7, Math.round(400 * len * (r / 0.05) + 40), { col: bark });
      if (depth === 0) { tips.push(q); return; }
      const nb = depth > 2 ? 2 : 3;
      for (let i = 0; i < nb; i++) {
        const nd = V.norm([d[0] + (R() - 0.5) * (o.spread || 1.1), d[1] + 0.25 + R() * 0.3, d[2] + (R() - 0.5) * (o.spread || 1.1)]);
        branch(q, nd, len * (0.62 + R() * 0.15), r * 0.65, depth - 1);
      }
    };
    branch(base, [0, 1, 0], h * 0.38, h * 0.05, o.depth || 4);
    if (o.bare) return tips;
    for (const t of tips) B.blob(t, h * (o.blob || 0.11), o.leafN || 140, { col: (p, d) => { const k = clamp(0.55 + d[1] * 3 + V.dot(V.norm(d), B.light) * 0.3, 0.2, 1.3); return typeof leaf === 'function' ? add(leaf(B.R()), k) : add(mix(leaf, add(leaf, 1.6), B.R() * 0.6), k); }, an: o.an });
    return tips;
  };
  // a palm: a curved trunk and drooping fronds
  K.palm = function (B, base, h, lean, o) {
    o = o || {};
    const R = B.R;
    const f = (t) => [base[0] + lean * h * t * t, base[1] + h * t, base[2]];
    B.tube(f, (u) => h * 0.035 * (1 - 0.4 * u), Math.round(900 * h), { col: (u, v) => add([0.4, 0.3, 0.2], 0.7 + 0.3 * (Math.sin(u * 60) > 0 ? 1 : 0.6)) });
    const top = f(1);
    for (let i = 0; i < (o.fronds || 9); i++) {
      const a = (i / (o.fronds || 9)) * TAU + R() * 0.3;
      B.push().aim([Math.cos(a), 0.55, Math.sin(a)], top);
      B.petal({ L: h * 0.45, W: h * 0.07, az: 0, open0: 0.2, open: 1.6, curl: 0.8, cup: -0.2, ruf: 0.9, fr: 70, n: o.n || 700, col: () => mix([0.1, 0.3, 0.08], [0.3, 0.5, 0.15], B.R()), an: o.an });
      B.pop();
    }
    for (let i = 0; i < 4; i++) B.sphere(V.add(top, [(R() - 0.5) * h * 0.05, -h * 0.03, (R() - 0.5) * h * 0.05]), h * 0.025, 60, { col: [0.35, 0.25, 0.1] });
  };
  K.bush = function (B, c, r, n, col) { B.blob(c, r, n, { sq: [1.3, 0.8, 1.3], col: (p, d) => add(col, clamp(0.6 + d[1] / r + V.dot(V.norm(d), B.light) * 0.4, 0.25, 1.3)) }); };

  // ---------------------------------------------------------------- water and weather
  K.sea = function (B, w, d, y, n, col, o) {
    o = o || {};
    const R = B.R, hi = o.hi || add(col, 3);
    B.with([A.water, o.amp == null ? 0.05 : o.amp, o.speed || 1], () => {
      B.quad([-w, y, -d], [2 * w, 0, 0], [0, 0, 2 * d], n, { lit: false, ps: o.ps || 1.4, col: (u, v, p) => {
        let c = mix(col, hi, Math.pow(R(), 4));
        if (o.glint) { const dx = p[0] - o.glint[0], k = Math.exp(-dx * dx / (o.glint[1] * (0.3 + Math.max(0, p[2] - o.glint[2] + 12) * 0.05))); if (R() < k * 0.3) c = add(o.glintCol || [1, 0.85, 0.6], 0.35 + R() * 0.45); }
        return c;
      } });
      // a light path on the water (sun or moon): a column of small sparks, narrow at the horizon and wider toward us
      if (o.glint) {
        const g = o.glint, gc = o.glintCol || [1, 0.85, 0.6], np = o.pathN || Math.round(n * 0.22), near = o.pathNear == null ? d * 0.25 : o.pathNear;
        B.size(1, () => { for (let i = 0; i < np; i++) {
          const z = -d + Math.pow(R(), 0.8) * (d + near), f = (z + d) / (d + near), sp = Math.sqrt(g[1]) * (0.25 + f * 1.4);
          const x = g[0] + (R() + R() + R() - 1.5) * sp;
          B.pt([x, y + 0.01, z], add(gc, (0.3 + R() * 0.7) * (1 - f * 0.45)));
        } });
      }
    });
  };
  K.rain = function (B, w, d, y0, y1, n, o) {
    o = o || {};
    B.u.wrapY = [y0, y1 - y0];
    const R = B.R;
    for (let i = 0; i < n; i++) { const p = [(R() - 0.5) * 2 * w, y0 + R() * (y1 - y0), (R() - 0.5) * 2 * d]; B.line(p, V.add(p, [o.wind || 0.02, -(o.len || 0.18), 0]), o.col || [0.5, 0.6, 0.75], o.col || [0.75, 0.85, 1], [A.fall, -(o.speed || 7), 0]); }
  };
  K.snow = function (B, w, d, y0, y1, n, o) {
    o = o || {};
    B.u.wrapY = [y0, y1 - y0];
    const R = B.R;
    for (let i = 0; i < n; i++) B.pt([(R() - 0.5) * 2 * w, y0 + R() * (y1 - y0), (R() - 0.5) * 2 * d], add([0.95, 0.97, 1], 0.6 + R() * 0.5), [A.fall, -(o.speed || 0.5) * (0.6 + R() * 0.8), 0.08]);
  };
  // fire: points rising and fading from a base, plus embers
  K.fire = function (B, c, r, h, n, o) {
    o = o || {};
    const R = B.R;
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, rr = r * Math.sqrt(R()) * (1 - 0.3 * R());
      const col = mix(o.c0 || [1, 0.85, 0.35], o.c1 || [0.95, 0.25, 0.04], R());
      B.pt([c[0] + Math.cos(a) * rr, c[1], c[2] + Math.sin(a) * rr], add(col, 1.3), [A.rise, 0.9 + R() * 1.1, h * (0.5 + R() * 0.7) * (1 - rr / r * 0.6)]);
    }
    for (let i = 0; i < (o.embers || 60); i++) B.pt([c[0] + (R() - 0.5) * r, c[1], c[2] + (R() - 0.5) * r], [1, 0.6, 0.2], [A.rise, 0.2 + R() * 0.25, h * 3]);
  };
  K.smoke = function (B, c, r, h, n, col) {
    const R = B.R;
    for (let i = 0; i < n; i++) B.pt([c[0] + (R() - 0.5) * r, c[1], c[2] + (R() - 0.5) * r], add(col || [0.5, 0.5, 0.52], 0.5 + R() * 0.4), [A.rise, 0.1 + R() * 0.12, h]);
  };
  // fireflies / sparkles drifting
  K.sparks = function (B, c, w, h, n, col) {
    const R = B.R;
    for (let i = 0; i < n; i++) B.pt([c[0] + (R() - 0.5) * w, c[1] + (R() - 0.5) * h, c[2] + (R() - 0.5) * w], add(col || [1, 0.9, 0.4], 1.2), [A.twinkle, 1.5 + R() * 3]);
  };

  // ---------------------------------------------------------------- buildings
  // a tower with lit windows: grid of windows on four faces, some lit (beat-reactive if beat)
  K.tower = function (B, c, w, h, d, o) {
    o = o || {};
    const R = B.R, rows = Math.max(3, Math.round(h / (o.floor || 0.12))), cols = Math.max(2, Math.round(w / (o.bay || 0.12)));
    const wall = o.wall || [0.09, 0.09, 0.11], lit = o.lit || [1, 0.82, 0.5], on = o.on == null ? 0.38 : o.on;
    const seed = R() * 1000;
    const isOn = (f, a, b) => { const ci = Math.floor(a * cols), ri = Math.floor(b * rows); const hsh = Math.sin(ci * 12.9898 + ri * 78.233 + f * 3.1 + seed) * 43758.5453; return (hsh - Math.floor(hsh)) < on; };
    const inWin = (a, b, n1, n2) => { const fa = (a * n1) % 1, fb = (b * n2) % 1; return fa > 0.18 && fa < 0.82 && fb > 0.25 && fb < 0.8; };
    const n = Math.round((o.n || 1400) * clamp(Math.sqrt(w * h * 3), 0.35, 2.4));
    B.box([c[0], c[1] + h / 2, c[2]], w, h, d, n, { faces: o.faces || [0, 1, 4, 5, 2], col: (f, a, b) => {
      if (f === 2) return add(wall, 1.3);
      const nn = f < 2 ? Math.max(2, Math.round(d / (o.bay || 0.12))) : cols;
      if (inWin(a, b, f < 2 ? nn : cols, rows)) {
        if (isOn(f, f < 2 ? b : a, b)) { const k = 0.75 + R() * 0.5; return [lit[0] * k, lit[1] * k, lit[2] * k, 1]; }
        return o.glass || [0.05, 0.07, 0.1];
      }
      return wall;
    } });
    if (o.spire) B.cyl([c[0], c[1] + h, c[2]], [c[0], c[1] + h + o.spire, c[2]], w * 0.04, 0.002, 200, { col: [0.5, 0.5, 0.55] });
    if (o.beacon) B.pt([c[0], c[1] + h + (o.spire || 0) + 0.02, c[2]], [1, 0.15, 0.1], [A.twinkle, 3]);
  };
  // a whole skyline of towers along x at depth range
  K.skyline = function (B, x0, x1, z0, z1, n, o) {
    o = o || {};
    const R = B.R;
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + R() * 0.8) / n, z = z0 + (z1 - z0) * R();
      const h = (o.hmin || 0.6) + Math.pow(R(), 1.6) * (o.hmax || 3) * (1 - Math.abs(x - (x0 + x1) / 2) / ((x1 - x0) * 0.75));
      const w = 0.25 + R() * 0.4;
      K.tower(B, [x, o.y || 0, z], w, Math.max(0.3, h), 0.25 + R() * 0.4, { on: 0.2 + R() * 0.35, lit: o.lit ? o.lit(R) : undefined, n: o.n || 900, spire: R() < 0.15 ? h * 0.2 : 0, beacon: R() < 0.3, wall: o.wall, faces: [4, 0, 1, 2] });
    }
  };

  // ---------------------------------------------------------------- vehicles
  // A car from a side profile. spec: { L (length), W (width), top: [[x, y]...] roof line from front to back,
  // bot: ground clearance, wheels: [x...], wr (wheel radius), col, glass, belt (window bottom y), pillars: [[x0, x1]...] windows }
  K.car = function (B, p, yaw, s, o) {
    o = o || {};
    const R = B.R;
    B.push().move(p[0], p[1], p[2]).rotY(yaw || 0);
    const L = s.L, W = s.W, top = s.top, bot = s.bot || 0.12, wr = s.wr || 0.17;
    const yTop = (x) => { for (let i = 0; i < top.length - 1; i++) { const a = top[i], b = top[i + 1]; if (x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])) { const t = (x - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * t; } } return bot + 0.1; };
    const x0 = Math.min(...top.map((q) => q[0])), x1 = Math.max(...top.map((q) => q[0]));
    const arch = (x, y) => s.wheels.some((wx) => (x - wx) * (x - wx) + (y - wr) * (y - wr) < (wr * 1.18) * (wr * 1.18));
    const isWin = (x, y) => s.win && s.win.some((wn) => x > wn[0] && x < wn[1] && y > (s.belt || 0) && y < yTop(x) - (s.roofT || 0.035));
    const paint = o.col || s.col || [0.75, 0.08, 0.1], glass = s.glass || [0.08, 0.1, 0.14];
    const lustre = (c) => mix(c, [1, 1, 1], Math.pow(R(), 9) * 0.6);
    const area = (x1 - x0) * 0.5;
    const n = o.n || 9000;
    // sides (rounded in toward the roof)
    for (let i = 0; i < n * 0.45; i++) {
      const x = x0 + (x1 - x0) * R(), yt = yTop(x), y = bot + (yt - bot) * R();
      if (arch(x, y)) continue;
      const side = R() < 0.5 ? -1 : 1, k = (y - bot) / Math.max(0.01, yt - bot);
      const z = side * W / 2 * (1 - 0.18 * Math.pow(k, 3) - 0.08 * Math.pow(Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2)), 6));
      const nw = V.norm(B.tv([0, 0.25 * k, side]));
      let c = isWin(x, y) ? glass : paint;
      if (s.stripe && Math.abs(y - s.stripe[0]) < s.stripe[1]) c = s.stripeCol || [0.95, 0.95, 0.95];
      c = add(lustre(c), B.shade(nw, false));
      B.pt([x, y, z], c);
    }
    // the top surface: hood, roof, trunk (with the windscreen / rear window as glass)
    for (let i = 0; i < n * 0.4; i++) {
      const x = x0 + (x1 - x0) * R(), zt = (R() * 2 - 1), yt = yTop(x);
      const z = zt * W / 2 * (1 - 0.18), y = yt - 0.02 * zt * zt * 3;
      const dx = 0.01, sl = (yTop(Math.min(x1, x + dx)) - yTop(Math.max(x0, x - dx))) / (2 * dx);
      const nw = V.norm(B.tv([-sl, 1, zt * 0.4]));
      const winTop = s.screens && s.screens.some((sc) => x > sc[0] && x < sc[1]) && Math.abs(zt) < 0.85;
      let c = winTop ? glass : paint;
      if (s.stripe2 && Math.abs(zt) < s.stripe2) c = s.stripeCol || [0.95, 0.95, 0.95];
      B.pt([x, y, z], add(lustre(c), B.shade(nw, false)));
    }
    // front and back faces
    for (let i = 0; i < n * 0.15; i++) {
      const front = R() < 0.5, x = front ? x0 : x1, y = bot + (yTop(x) + 0.0 - bot) * R(), z = (R() * 2 - 1) * W / 2 * 0.95;
      let c = paint;
      const hl = Math.abs(Math.abs(z) - W * 0.34) < W * 0.08 && Math.abs(y - (bot + (yTop(x) - bot) * 0.62)) < 0.04;
      if (hl) c = front ? [1, 0.97, 0.85, 1] : [1, 0.1, 0.06, 1];
      else if (front && y < bot + (yTop(x) - bot) * 0.45 && Math.abs(z) < W * 0.3) c = [0.05, 0.05, 0.06];
      B.pt([x + (front ? -0.005 : 0.005), y, z], c[3] ? c : add(c, B.shade(V.norm(B.tv([front ? -1 : 1, 0, 0])), false)));
    }
    // lamps glow a little beyond the body
    if (o.lights !== false) for (const side of [-1, 1]) {
      const yh = bot + (yTop(x0) - bot) * 0.62, yb = bot + (yTop(x1) - bot) * 0.62;
      B.blob([x0 - 0.02, yh, side * W * 0.34], 0.03, 40, { col: () => [1, 0.95, 0.8] });
      B.blob([x1 + 0.02, yb, side * W * 0.34], 0.025, 30, { col: () => [1, 0.12, 0.06] });
      if (o.beams) for (let i = 0; i < 260; i++) { const t = R(), sp = t * 0.35; B.pt([x0 - 0.05 - t * 2.2, yh - t * 0.15 + (R() - 0.5) * sp, side * W * 0.34 + (R() - 0.5) * sp * 2], add([1, 0.92, 0.7], (1 - t) * 0.45)); }
    }
    // wheels: tyre, rim, spinning
    for (const wx of s.wheels) for (const side of [-1, 1]) {
      const c = [wx, wr, side * (W / 2 - 0.02)];
      // spinning wheels need a pivot each; parked ones just keep whatever animation the car has
      const g = o.spin ? B.pivot(c, [0, 0, 1], -o.spin) : -1;
      B.with(g >= 0 ? [A.spin, 0, g] : B.anim, () => {
        B.push().move(c[0], c[1], c[2]).rotX(PI / 2);
        B.torus([0, 0, 0], wr * 0.78, wr * 0.22, 500, { col: [0.06, 0.06, 0.065] });
        B.disc([0, side * 0.04, 0], 0, wr * 0.6, 260, { col: (u, v) => (Math.sin(v * TAU * (s.spokes || 5)) > 0.2 ? s.rim || [0.75, 0.76, 0.8] : [0.1, 0.1, 0.11]) });
        B.pop();
      });
    }
    B.pop();
    return { x0, x1, yTop };
  };
  // ready-made profiles (front of the car at -x)
  K.CARS = {
    coupe: { L: 2.1, W: 0.9, bot: 0.1, wr: 0.16, wheels: [-0.68, 0.66], belt: 0.42, top: [[-1.05, 0.28], [-0.9, 0.36], [-0.35, 0.42], [-0.05, 0.62], [0.35, 0.64], [0.85, 0.42], [1.05, 0.38]], win: [[-0.12, 0.72]], screens: [[-0.35, -0.05], [0.4, 0.82]] },
    beetle: { L: 1.9, W: 0.85, bot: 0.12, wr: 0.17, wheels: [-0.6, 0.62], belt: 0.48, top: [[-0.95, 0.3], [-0.85, 0.42], [-0.5, 0.52], [-0.2, 0.78], [0.25, 0.8], [0.7, 0.55], [0.95, 0.3]], win: [[-0.22, 0.55]], screens: [[-0.45, -0.2]] },
    pickup: { L: 2.5, W: 1, bot: 0.2, wr: 0.22, wheels: [-0.8, 0.82], belt: 0.62, top: [[-1.25, 0.5], [-1.15, 0.62], [-0.55, 0.66], [-0.35, 0.95], [0.15, 0.97], [0.2, 0.62], [1.25, 0.62]], win: [[-0.38, 0.17]], screens: [[-0.55, -0.35]] },
    f1: { L: 2.6, W: 0.85, bot: 0.06, wr: 0.18, wheels: [-0.85, 0.85], belt: 9, top: [[-1.3, 0.12], [-1.0, 0.16], [-0.3, 0.24], [-0.05, 0.38], [0.25, 0.4], [0.6, 0.3], [1.1, 0.34], [1.3, 0.5]] },
    jeep: { L: 2.0, W: 0.95, bot: 0.24, wr: 0.24, wheels: [-0.62, 0.62], belt: 0.66, top: [[-1.0, 0.58], [-0.9, 0.7], [-0.4, 0.72], [-0.35, 1.08], [0.95, 1.08], [1.0, 0.7]], win: [[-0.3, 0.9]], screens: [[-0.4, -0.35]] },
    muscle: { L: 2.3, W: 0.95, bot: 0.1, wr: 0.18, wheels: [-0.75, 0.72], belt: 0.42, top: [[-1.15, 0.33], [-1.0, 0.42], [-0.3, 0.46], [-0.02, 0.66], [0.4, 0.67], [0.75, 0.47], [1.15, 0.44]], win: [[-0.05, 0.7]], screens: [[-0.3, -0.03], [0.42, 0.74]], stripe2: 0.18 },
    roadster: { L: 2.2, W: 0.8, bot: 0.16, wr: 0.21, wheels: [-0.72, 0.78], belt: 9, top: [[-1.1, 0.42], [-1.0, 0.56], [-0.25, 0.56], [-0.2, 0.75], [-0.12, 0.56], [0.95, 0.55], [1.1, 0.45]], screens: [[-0.22, -0.12]] },
    bus: { L: 3.2, W: 1.05, bot: 0.15, wr: 0.2, wheels: [-1.0, 0.95], belt: 0.55, top: [[-1.6, 1.0], [-1.55, 1.75], [1.6, 1.75], [1.6, 1.0]], win: [[-1.5, 1.5]], screens: [[-1.6, -1.5]] },
    van: { L: 2.3, W: 0.95, bot: 0.16, wr: 0.18, wheels: [-0.72, 0.72], belt: 0.6, top: [[-1.15, 0.5], [-1.05, 0.62], [-0.75, 1.02], [1.15, 1.04], [1.15, 0.5]], win: [[-0.72, 0.9]], screens: [[-1.0, -0.78]], stripe: [0.6, 0.06] },
    hover: { L: 2.2, W: 0.95, bot: 0.12, wr: 0.01, wheels: [], belt: 0.35, top: [[-1.1, 0.22], [-0.7, 0.3], [-0.2, 0.55], [0.4, 0.56], [0.9, 0.36], [1.1, 0.3]], win: [[-0.3, 0.6]], screens: [[-0.6, -0.2]] },
    wedge: { L: 2.4, W: 1.0, bot: 0.16, wr: 0.2, wheels: [-0.78, 0.78], belt: 0.55, top: [[-1.2, 0.45], [-1.1, 0.52], [0.0, 0.98], [1.2, 0.62], [1.2, 0.45]], win: [[-0.5, 0.75]], screens: [[-0.85, -0.05]] },
    taxi: { L: 2.2, W: 0.92, bot: 0.12, wr: 0.17, wheels: [-0.7, 0.7], belt: 0.48, top: [[-1.1, 0.36], [-1.0, 0.45], [-0.45, 0.48], [-0.25, 0.78], [0.45, 0.8], [0.7, 0.5], [1.1, 0.46]], win: [[-0.27, 0.65]], screens: [[-0.45, -0.25], [0.48, 0.7]] },
    monster: { L: 2.2, W: 1.0, bot: 0.62, wr: 0.42, wheels: [-0.72, 0.72], belt: 1.0, top: [[-1.1, 0.88], [-1.0, 0.98], [-0.45, 1.0], [-0.3, 1.32], [0.3, 1.32], [0.35, 1.0], [1.1, 1.0]], win: [[-0.32, 0.32]], screens: [[-0.45, -0.3]] },
    tractor: { L: 2.0, W: 0.9, bot: 0.3, wr: 0.22, wheels: [-0.65, 0.55], belt: 0.95, top: [[-1.0, 0.6], [-0.9, 0.72], [0.05, 0.75], [0.1, 1.45], [0.95, 1.45], [0.95, 0.8]], win: [[0.15, 0.9]] },
  };

  // a boat hull: a half-shell along x, with optional cabin / mast
  K.hull = function (B, p, yaw, L, Wd, H, col, n, o) {
    o = o || {};
    B.push().move(p[0], p[1], p[2]).rotY(yaw || 0);
    B.surf((u, v) => {
      const x = (u - 0.5) * L, k = 1 - Math.pow(Math.abs(u - 0.45) / 0.55, o.sharp || 2.2), w = Wd / 2 * Math.max(0.02, k), a = PI + v * PI;
      return [x, Math.sin(a) * H * Math.max(0.15, k), Math.cos(a) * w];
    }, n || 3000, { col: col || [0.75, 0.75, 0.72] });
    // deck
    B.surf((u, v) => { const x = (u - 0.5) * L, k = 1 - Math.pow(Math.abs(u - 0.45) / 0.55, o.sharp || 2.2); return [x, 0.002, (v * 2 - 1) * Wd / 2 * Math.max(0.02, k)]; }, Math.round((n || 3000) * 0.5), { col: o.deck || [0.55, 0.4, 0.25] });
    B.pop();
  };
  K.sail = function (B, foot, h, w, col, n, o) {
    o = o || {};
    B.cyl(foot, V.add(foot, [0, h * 1.05, 0]), 0.012, 0.008, 300, { col: [0.5, 0.4, 0.3] });
    B.surf((u, v) => { const y = foot[1] + v * h, ww = w * (1 - v) * (o.jib ? 0.8 : 1), bulge = Math.sin(u * PI) * ww * 0.15 * (1 - v); return [foot[0] + (o.jib ? -1 : 1) * u * ww, y, foot[2] + bulge]; }, n || 2000, { col: col || [0.95, 0.94, 0.9], an: o.an });
  };

  // ---------------------------------------------------------------- creatures
  // a swimmer along +x: a body of revolution with a radius profile, fins and a tail
  K.fish = function (B, p, yaw, L, o) {
    o = o || {};
    B.push().move(p[0], p[1], p[2]).rotY(yaw || 0).rotZ(o.pitch || 0);
    const prof = o.prof || ((u) => Math.pow(Math.sin(PI * Math.pow(u, 0.6)), 0.9) * (1 - 0.3 * u));
    const H = L * (o.h || 0.18), Wd = L * (o.w || 0.12);
    const col = o.col || ((u, v, up) => mix([0.85, 0.85, 0.9], [0.3, 0.4, 0.55], up));
    B.surf((u, v) => { const x = (0.5 - u) * L, a = v * TAU, r = prof(u); return [x, Math.sin(a) * H * r * (o.flat ? 0.5 : 1), Math.cos(a) * Wd * r]; }, o.n || 2500,
      { col: (u, v, q) => col(u, v, clamp(q[1] / (H + 1e-6) * 0.5 + 0.5, 0, 1)), an: o.an });
    // tail fin
    B.surf((u, v) => { const x = -L * 0.5 - u * L * (o.tail || 0.25), s = (v * 2 - 1) * (0.15 + u) * H * (o.tailH || 1.6); return [x, s, 0]; }, Math.round((o.n || 2500) * 0.2), { col: o.finCol || [0.5, 0.55, 0.7], an: o.an });
    if (o.dorsal !== false) B.surf((u, v) => [L * (0.15 - u * 0.3), H * (0.9 + v * (1 - u) * (o.dorsal || 0.8)), 0], Math.round((o.n || 2500) * 0.08), { col: o.finCol || [0.5, 0.55, 0.7], an: o.an });
    if (o.eye !== false) for (const s of [-1, 1]) B.blob([L * 0.38, H * 0.2, s * Wd * 0.55], L * 0.012, 20, { col: () => [0.02, 0.02, 0.02], an: o.an });
    B.pop();
  };
  // a bird in flight (a V of two swept wings), flapping is just a sway
  K.bird = function (B, p, s, col) {
    for (const side of [-1, 1]) B.trail((t) => [p[0] + side * t * s, p[1] + Math.sin(t * PI) * s * 0.25 - t * s * 0.1, p[2] - t * s * 0.15], 40, col || [0.1, 0.1, 0.12]);
  };
})();
