/* Oley · Voxel worlds. Each one is built from boxes once per verse and comes with its own light,
   sky, camera path and a place to set the words: a floating island at sunset, a city street at dusk
   with the words laid on the road, a checkerboard path through a night sky, a meadow with a hedge
   heart seen from above, a ringed planet in space, a gold vault, a neon tunnel, and (from the album
   cover) a voxel statue of the cut-out and a pixel mural of the whole cover. All original. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const V = O.Vox;
  const { v3 } = V;
  const PI = Math.PI;
  const rngOf = (s) => { const R = U.rng(s >>> 0); R.r = R.range; R.ch = R.chance; R.sgn = R.sign; R.i = R.int; return R; };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const jit = (c, R, k) => { const j = 1 + (R() - 0.5) * (k || 0.12); return [Math.min(255, c[0] * j), Math.min(255, c[1] * j), Math.min(255, c[2] * j)]; };
  const n2 = (x, z, s) => { const h = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7 + s) * 43758.5453; return v - Math.floor(v); }; const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; const u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz); return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - w) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * w; };
  const fbm = (x, z, s) => n2(x, z, s) * 0.55 + n2(x * 2.1, z * 2.1, s + 3) * 0.3 + n2(x * 4.3, z * 4.3, s + 7) * 0.15;
  // a frame for the words: upright, facing a point
  const facing = (o, from, s, maxW) => { const n = v3.norm([from[0] - o[0], 0, from[2] - o[2]]); return { o, n, r: v3.norm(v3.cross([0, 1, 0], n)), u: [0, 1, 0], s, maxW: maxW || 56 }; };
  const flat = (o, fwd, s, maxW) => { const u = v3.norm([fwd[0], 0, fwd[2]]); return { o, n: [0, 1, 0], u, r: v3.cross(u, [0, 1, 0]), s, maxW: maxW || 56 }; };
  const L = (o) => Object.assign({ top: [0.3, 0.45, 0.8], hor: [0.9, 0.8, 0.75], bot: [0.25, 0.22, 0.28], sun: [0.4, 0.5, 0.6], sunCol: [1, 0.85, 0.7], amb: 0.65, fog: 0.008, rays: 0, stars: 0, aurora: 0, shadowR: 45 }, o);
  const tree = (B, x, y, z, R, leaf, h) => {
    h = h || R.i(4, 6);
    for (let k = 0; k < h; k++) B.vox(x, y + k, z, jit([110, 78, 52], R));
    const r = R.i(2, 3);
    for (let dx = -r; dx <= r; dx++) for (let dy = -1; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dy * dy * 1.3 + dz * dz > r * r + 1 || R() < 0.12) continue;
      B.vox(x + dx, y + h + dy, z + dz, jit(leaf, R, 0.25));
    }
  };

  const W = {};

  // ---------------------------------------------------------------- a floating island at sunset
  W.island = function (R, P) {
    const B = new V.Boxes(16000), S = R.i(1, 999);
    const RAD = 21, H = {};
    const grass = [102, 176, 74], dirt = [136, 98, 64], stone = [124, 122, 130];
    for (let x = -RAD; x <= RAD; x++) for (let z = -RAD; z <= RAD; z++) {
      const d = Math.hypot(x, z) / RAD + (fbm(x * 0.15, z * 0.15, S) - 0.5) * 0.35;
      if (d > 1) continue;
      H[x + ',' + z] = Math.round(2 + fbm(x * 0.09, z * 0.09, S + 5) * 6 * (1 - d * 0.6));
    }
    const hAt = (x, z) => H[x + ',' + z];
    for (const k in H) {
      const [x, z] = k.split(',').map(Number), h = H[k];
      const d = Math.hypot(x, z) / RAD;
      const bottom = Math.round(-2 - (1 - d) * 16 * (0.7 + fbm(x * 0.2, z * 0.2, S + 9) * 0.6));
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const q = hAt(x + a, z + b); return q == null || q < h; });
      B.vox(x, h, z, jit(grass, R, 0.18));
      if (edge) {
        for (let y = h - 1; y >= bottom; y--) B.vox(x, y, z, jit(y > h - 3 ? dirt : stone, R, 0.15));
      } else B.add(x + 0.5, (h + bottom) / 2, z + 0.5, 1, h - bottom, 1, dirt);
      if (R() < 0.05 && Math.hypot(x, z) < RAD - 3) B.add(x + 0.5, h + 1.2, z + 0.5, 0.35, 0.35, 0.35, R.pick([[255, 90, 120], [255, 220, 80], [240, 240, 255], [180, 120, 255]]), 0.1);
    }
    // trees, one of them in blossom
    const pink = [250, 168, 200];
    for (let i = 0; i < 9; i++) {
      const a = R.r(0, PI * 2), r = R.r(4, RAD - 4), x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      const h = hAt(x, z); if (h == null) continue;
      tree(B, x, h + 1, z, R, i < 3 ? pink : R.pick([[70, 150, 60], [90, 168, 70], [60, 130, 70]]));
    }
    // lanterns
    for (let i = 0; i < 6; i++) {
      const a = R.r(0, PI * 2), r = R.r(3, RAD - 3), x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
      const h = hAt(x, z); if (h == null) continue;
      B.add(x + 0.5, h + 2, z + 0.5, 0.18, 2, 0.18, [60, 50, 44]);
      B.add(x + 0.5, h + 3.2, z + 0.5, 0.55, 0.6, 0.55, [255, 190, 110], 0.9);
    }
    // smaller islands drifting round it
    for (let i = 0; i < 5; i++) {
      const a = R.r(0, PI * 2), r = R.r(32, 46), cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = R.r(-6, 10), s = R.i(2, 4);
      for (let x = -s; x <= s; x++) for (let z = -s; z <= s; z++) { if (x * x + z * z > s * s) continue; const dep = Math.round((s - Math.hypot(x, z)) * 1.4) + 1; B.vox(Math.round(cx + x), Math.round(cy), Math.round(cz + z), jit(grass, R, 0.18)); for (let y = 1; y <= dep; y++) B.vox(Math.round(cx + x), Math.round(cy) - y, Math.round(cz + z), jit(stone, R, 0.15)); }
    }
    const dir = R.sgn(), a0 = R.r(0, PI * 2);
    const cam = (t) => { const a = a0 + dir * t * 0.05; return { pos: [Math.cos(a) * 40, 16 + Math.sin(t * 0.13) * 2, Math.sin(a) * 40], at: [0, 6, 0], fov: 0.82 }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.36, 0.3, 0.6], hor: [1, 0.66, 0.52], bot: [0.3, 0.2, 0.34], sun: [Math.cos(a0 + PI) * 0.8, 0.22, Math.sin(a0 + PI) * 0.8], sunCol: [1, 0.72, 0.5], skyFill: [0.66, 0.6, 0.86], gndFill: [0.5, 0.36, 0.36], fog: 0.002, fogCol: [0.95, 0.66, 0.6], rays: 1, amb: 0.75, sunSize: 2 }),
      frame: (t) => { const c = cam(t); const dir2 = v3.norm([c.pos[0], 0, c.pos[2]]); const F = facing(v3.add([0, 12, 0], v3.mul(dir2, 12)), c.pos, 0.34, 64); F.base = 9.5; return F; },
      ink: [255, 255, 255], key: [255, 70, 130], shade: [70, 20, 50], parts: 'petals',
    };
  };

  // ---------------------------------------------------------------- a city street at dusk, the words laid on the road
  W.road = function (R, P) {
    const B = new V.Boxes(20000);
    const LEN = 420, SPEED = 5.2;
    B.add(0, -0.5, LEN / 2 - 30, 14, 1, LEN + 60, [52, 52, 58]);
    for (let z = -30; z < LEN; z += 6) B.add(0, 0.02, z, 0.35, 0.06, 2.6, [236, 232, 220], 0.15);
    for (const s of [-1, 1]) {
      B.add(s * 9.5, -0.2, LEN / 2 - 30, 5, 0.8, LEN + 60, [150, 148, 144]);
      for (let z = -20; z < LEN; z += 24) { B.add(s * 7.6, 2.5, z, 0.25, 5, 0.25, [40, 40, 46]); B.add(s * 6.9, 5, z, 1.6, 0.25, 0.4, [40, 40, 46]); B.add(s * 6.3, 4.8, z, 0.7, 0.3, 0.7, [255, 220, 160], 1.2); }
      let z = -30;
      while (z < LEN) {
        const w = R.r(7, 12), d = R.r(8, 12), h = R.r(9, 44) * (R.ch(0.12) ? 1.5 : 1);
        const col = R.pick([[150, 130, 120], [112, 112, 124], [176, 160, 140], [92, 96, 110], [170, 110, 96], [140, 150, 170]]);
        const x = s * (12 + d / 2);
        B.add(x, h / 2, z + w / 2, d, h, w, col);
        // lit windows on the face to the street
        const fx = s * (12 - 0.05);
        for (let wy = 2.5; wy < h - 1.5; wy += 2.6) for (let wz = z + 1.2; wz < z + w - 1; wz += 1.8) if (R() < 0.55) B.add(fx, wy, wz, 0.12, 1.2, 0.9, R.ch(0.8) ? [255, 210, 140] : [160, 200, 255], R.ch(0.85) ? 0.9 : 0.1);
        // a strip of shop sign
        if (R.ch(0.4)) B.add(fx, 3.4, z + w / 2, 0.2, 0.9, w * 0.7, R.pick([[255, 70, 90], [80, 220, 255], [255, 200, 60]]), 1.1);
        z += w + R.r(0.4, 2);
      }
    }
    const cam = (t) => { const z = t * SPEED; return { pos: [Math.sin(t * 0.3) * 0.8, 4.2, z], at: [0, 0.4, z + 13], fov: 0.95 }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.22, 0.26, 0.55], hor: [1, 0.6, 0.45], bot: [0.2, 0.18, 0.22], sun: [0.1, 0.18, 1], sunCol: [1, 0.6, 0.38], skyFill: [0.5, 0.55, 0.85], gndFill: [0.4, 0.3, 0.3], fog: 0.012, fogCol: [0.9, 0.55, 0.45], rays: 0.7, amb: 0.7, shadowR: 55 }),
      frame: (t, dur) => { const c = cam(t); return flat([0, 0.12, c.pos[2] + 13 + SPEED * Math.min(dur || 2, 4) * 0.55], [0, 0, 1], 0.36, 30); },
      tiles: true, ink: [250, 248, 240], key: [255, 220, 80], parts: 'dust',
    };
  };

  // ---------------------------------------------------------------- a checkerboard path through a night sky
  W.checker = function (R, P) {
    const B = new V.Boxes(16000);
    const px = (z) => Math.sin(z * 0.035) * 7 + Math.sin(z * 0.011) * 4;
    const LEN = 300, SPEED = 5.5;
    for (let z = -10; z < LEN; z++) {
      const cx = Math.round(px(z));
      for (let x = -3; x <= 3; x++) B.vox(cx + x, 0, z, (x + z) % 2 === 0 ? [240, 238, 245] : [26, 24, 32]);
      if (z % 9 === 0) for (const s of [-4, 4]) { B.vox(cx + s, 1, z, [70, 60, 90]); B.add(cx + s + 0.5, 2.3, z + 0.5, 0.5, 0.5, 0.5, [255, 170, 230], 1.4); }
    }
    // cubes hanging in the dark
    for (let i = 0; i < 260; i++) { const z = R.r(-10, LEN), x = px(z) + R.sgn() * R.r(13, 44), y = R.r(-12, 26), s = R.r(0.4, 2.2); B.add(x, y, z, s, s, s, R.pick([[120, 90, 200], [255, 120, 200], [90, 200, 255], [40, 36, 60]]), R.ch(0.35) ? 0.8 : 0); }
    const cam = (t) => { const z = t * SPEED; return { pos: [px(z) - 1.5, 3.6, z - 6], at: [px(z + 12), 2.8, z + 12], fov: 0.95 }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.05, 0.04, 0.16], hor: [0.3, 0.18, 0.45], bot: [0.03, 0.02, 0.06], sun: [-0.3, 0.6, 0.5], sunCol: [0.55, 0.6, 1], sunLight: [0.35, 0.38, 0.7], skyFill: [0.35, 0.3, 0.6], gndFill: [0.2, 0.1, 0.2], fog: 0.012, fogCol: [0.16, 0.1, 0.26], stars: 1, aurora: 1, amb: 0.7, sunSize: 0.6 }),
      frame: (t, dur) => { const c = cam(t); const z = c.pos[2] + 18 + SPEED * Math.min(dur || 2, 5); const F = facing([px(z), 5.5, z], [px(z - 20), 5.5, z - 20], 0.32, 62); F.base = 1.1; return F; },
      ink: [255, 200, 240], key: [255, 220, 120], glow: 0.6, parts: 'sparks',
    };
  };

  // ---------------------------------------------------------------- a meadow with a hedge heart, seen from above
  W.meadow = function (R, P) {
    const B = new V.Boxes(16000), S = R.i(1, 999);
    const X = 36, Z = 30;
    const hedge = new Set();
    for (let k = 0; k < 1600; k++) { const a = (k / 1600) * PI * 2, hx = 16 * Math.pow(Math.sin(a), 3), hz = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); for (const [ox, oz] of [[0, 0], [1, 0], [0, 1]]) hedge.add(Math.round(hx * 1.55) + ox + ',' + (Math.round(-hz * 1.55 - 2) + oz)); }
    for (let x = -X; x <= X; x++) for (let z = -Z; z <= Z; z++) {
      const h = fbm(x * 0.08, z * 0.08, S) > 0.62 ? 1 : 0;
      const g = mix([96, 170, 66], [130, 196, 80], fbm(x * 0.2, z * 0.2, S + 2));
      B.vox(x, h, z, jit(g, R, 0.14));
      if (h) B.add(x + 0.5, 0.5, z + 0.5, 1, 1, 1, [110, 84, 60]);
      if (hedge.has(x + ',' + z)) { B.vox(x, h + 1, z, jit([44, 110, 46], R, 0.2)); B.vox(x, h + 2, z, jit([56, 134, 52], R, 0.2)); if (R() < 0.12) B.add(x + 0.5, h + 3.1, z + 0.5, 0.3, 0.3, 0.3, [255, 120, 160], 0.1); }
      else if (R() < 0.06) B.add(x + 0.5, h + 1.15, z + 0.5, 0.3, 0.3, 0.3, R.pick([[255, 240, 120], [255, 120, 160], [250, 250, 255], [160, 120, 255]]), 0.05);
    }
    for (let i = 0; i < 14; i++) { const x = R.sgn() * R.i(22, X - 2), z = R.i(-Z + 2, Z - 2); tree(B, x, 1, z, R, R.pick([[70, 150, 60], [90, 168, 70]])); }
    const cam = (t) => ({ pos: [Math.sin(t * 0.06) * 5, 52 - Math.min(8, t * 0.35), -26 + Math.min(6, t * 0.2)], at: [0, 0, 1], fov: 0.85 });
    return {
      boxes: B, cam,
      L: L({ top: [0.35, 0.6, 0.95], hor: [0.8, 0.9, 1], bot: [0.3, 0.4, 0.3], sun: [0.4, 0.85, -0.3], sunCol: [1, 0.95, 0.85], skyFill: [0.6, 0.75, 1], gndFill: [0.35, 0.45, 0.3], fog: 0.0018, fogCol: [0.75, 0.85, 1], amb: 0.72, shadowR: 50 }),
      frame: () => flat([0, 3.4, 1], [0, 0, 1], 0.62, 46),
      raised: true, ink: [255, 246, 200], key: [255, 210, 60], parts: 'petals',
    };
  };

  // ---------------------------------------------------------------- a ringed planet in space
  W.space = function (R, P) {
    const B = new V.Boxes(16000);
    const vivid = (P.palette && P.palette.vivid) || [230, 120, 200];
    const r0 = 11;
    const cA = vivid, cB = mix(vivid, [255, 240, 220], 0.5), cC = mix(vivid, [30, 20, 60], 0.5);
    for (let x = -r0; x <= r0; x++) for (let y = -r0; y <= r0; y++) for (let z = -r0; z <= r0; z++) {
      const d = Math.hypot(x, y, z);
      if (d > r0 || d < r0 - 1.6) continue;
      const band = Math.sin(y * 0.7 + Math.sin(x * 0.3) * 0.8);
      B.vox(x, y, z, jit(band > 0.4 ? cB : band < -0.4 ? cC : cA, R, 0.15));
    }
    for (let i = 0; i < 1400; i++) { const a = R.r(0, PI * 2), r = R.r(16, 23), y = R.r(-0.4, 0.4); const x = Math.cos(a) * r, z = Math.sin(a) * r; const ty = y * Math.cos(0.4) + z * Math.sin(0.4), tz = -y * Math.sin(0.4) + z * Math.cos(0.4); const s = R.r(0.3, 0.8); B.add(x, ty, tz, s, s, s, R.pick([[230, 220, 200], [200, 180, 160], [250, 240, 230]])); }
    for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) for (let z = -3; z <= 3; z++) if (Math.hypot(x, y, z) <= 3) B.vox(x + 32, y + 10, z - 18, jit([190, 190, 200], R, 0.2));
    for (let i = 0; i < 500; i++) { const a = R.r(0, PI * 2), b = R.r(-1.3, 1.3), r = R.r(130, 170); B.add(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r, 0.6, 0.6, 0.6, [255, 255, 255], R.r(0.6, 2)); }
    const a0 = R.r(0, PI * 2), dir = R.sgn();
    const cam = (t) => { const a = a0 + dir * t * 0.045; return { pos: [Math.cos(a) * 52, 9 + Math.sin(t * 0.1) * 6, Math.sin(a) * 52], at: [0, 0, 0], fov: 0.8 }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.01, 0.01, 0.03], hor: [0.04, 0.03, 0.08], bot: [0.01, 0.01, 0.02], sun: [0.7, 0.3, 0.4], sunCol: [1, 0.95, 0.9], sunLight: [2.2, 2.1, 2], skyFill: [0.15, 0.12, 0.25], gndFill: [0.05, 0.04, 0.08], fog: 0.001, fogCol: [0.02, 0.02, 0.05], stars: 1.2, amb: 0.35, shadowR: 35, sunSize: 0.8 }),
      frame: (t) => { const c = cam(t); const d = v3.norm([c.pos[0], 0, c.pos[2]]); return facing(v3.add([0, 5, 0], v3.mul(d, 26)), c.pos, 0.32, 62); },
      ink: [255, 255, 255], key: vivid, glow: 0.5, parts: 'stars',
    };
  };

  // ---------------------------------------------------------------- a gold vault
  W.vault = function (R, P) {
    const B = new V.Boxes(16000);
    const gold = [250, 196, 60], deep = [120, 70, 20];
    for (let x = -26; x <= 26; x++) for (let z = -26; z <= 26; z++) B.vox(x, -1, z, (x + z) % 2 ? jit([60, 40, 26], R, 0.2) : jit([90, 62, 34], R, 0.2));
    for (let i = 0; i < 16; i++) {
      const cx = R.i(-20, 20), cz = R.i(-20, 20), s = R.i(2, 5);
      if (Math.hypot(cx, cz) < 7) continue;
      for (let y = 0; y < s; y++) for (let x = -s + y; x <= s - y; x++) for (let z = -s + y; z <= s - y; z++) if (R() < 0.8) B.vox(cx + x, y, cz + z, jit(R.ch(0.85) ? gold : [255, 235, 140], R, 0.2), R.ch(0.06) ? 0.6 : 0);
    }
    for (let x = -26; x <= 26; x += 2) for (const s2 of [-1, 1]) {
      // walls of bars, two sides; shelves with bars stacked on them
      for (const [wx, wz] of [[x, s2 * 27], [s2 * 27, x]]) {
        B.add(wx, 8, wz, wx === x ? 2 : 1, 16, wx === x ? 1 : 2, jit([84, 58, 36], R, 0.15));
        for (const sy of [3, 7, 11]) { B.add(wx - Math.sign(wx) * (wx === x ? 0 : 0.9), sy, wz - Math.sign(wz) * (wx === x ? 0.9 : 0), wx === x ? 2 : 0.8, 0.25, wx === x ? 0.8 : 2, deep); if (R() < 0.75) B.add(wx - Math.sign(wx) * (wx === x ? 0 : 0.9), sy + 0.45, wz - Math.sign(wz) * (wx === x ? 0.9 : 0), wx === x ? 1.6 : 0.6, 0.6, wx === x ? 0.6 : 1.6, jit(gold, R, 0.15), 0.15); }
      }
    }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; B.add(Math.cos(a) * 25, 15, Math.sin(a) * 25, 0.8, 0.8, 0.8, [255, 200, 120], 3); }
    const cam = (t) => { const a = 0.5 + t * 0.035; const r = 22 - Math.min(7, t * 0.3); return { pos: [Math.cos(a) * r, 8 - Math.min(3, t * 0.12), Math.sin(a) * r], at: [0, 4, 0], fov: 0.9 }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.12, 0.07, 0.04], hor: [0.35, 0.2, 0.08], bot: [0.08, 0.05, 0.03], sun: [0.3, 0.9, 0.25], sunCol: [1, 0.85, 0.55], sunLight: [1.6, 1.25, 0.8], skyFill: [0.8, 0.6, 0.35], gndFill: [0.3, 0.2, 0.1], fog: 0.012, fogCol: [0.26, 0.15, 0.07], amb: 0.75, shadowR: 32 }),
      frame: (t) => { const c = cam(t); const d = v3.norm([c.pos[0], 0, c.pos[2]]); return facing(v3.add([0, 6.5, 0], v3.mul(d, 5)), c.pos, 0.28, 60); },
      ink: [255, 248, 236], key: [255, 196, 50], glow: 0.3, shade: [60, 30, 8], parts: 'gold',
    };
  };

  // ---------------------------------------------------------------- a neon tunnel of frames
  W.tunnel = function (R, P) {
    const B = new V.Boxes(12000);
    const LEN = 360, SPEED = 9;
    const vivid = (P.palette && P.palette.vivid) || [255, 40, 70];
    for (let z = 0; z < LEN; z += 5) {
      const c = (z / 5) % 2 ? vivid : [240, 236, 255], g = (z / 5) % 3 === 0 ? 1.4 : 0.5;
      B.add(-7, 5, z, 0.4, 10, 0.4, c, g); B.add(7, 5, z, 0.4, 10, 0.4, c, g); B.add(0, 10, z, 14.4, 0.4, 0.4, c, g);
      for (let k = -6; k <= 6; k += 3) B.add(k, 10.5, z + 2.5, 0.15, 0.15, 5, [80, 80, 90]);
    }
    for (let z = 0; z < LEN; z += 2) for (let x = -6; x <= 6; x += 2) B.add(x, -0.1, z, 1.9, 0.2, 1.9, (x / 2 + z / 2) % 2 ? [24, 22, 30] : [36, 32, 44]);
    const cam = (t) => { const z = t * SPEED; return { pos: [Math.sin(t * 0.5) * 1.2, 4 + Math.sin(t * 0.37) * 0.8, z], at: [0, 4.6, z + 14], fov: 1.0, up: [Math.sin(t * 0.21) * 0.08, 1, 0] }; };
    return {
      boxes: B, cam,
      L: L({ top: [0.01, 0.01, 0.02], hor: [0.03, 0.02, 0.04], bot: [0.01, 0.01, 0.01], sun: [0.2, 0.9, 0.3], sunCol: [0.6, 0.6, 0.7], sunLight: [0.25, 0.25, 0.3], skyFill: [0.4, 0.3, 0.5], gndFill: [0.2, 0.1, 0.15], fog: 0.03, fogCol: [0.02, 0.01, 0.03], amb: 0.5, shadow: false }),
      frame: (t, dur) => { const c = cam(t); const F = facing([0, 5, c.pos[2] + 16 + SPEED * Math.min(dur || 2, 5)], [0, 5, c.pos[2]], 0.24, 54); F.base = 1.2; return F; },
      ink: [255, 255, 255], key: vivid, glow: 0.9, parts: 'sparks',
    };
  };

  // ---------------------------------------------------------------- the cover's cut-out as a voxel statue
  W.statue = function (R, P) {
    const B = new V.Boxes(16000);
    for (let x = -30; x <= 30; x++) for (let z = -30; z <= 30; z++) B.vox(x, -1, z, (x + z) % 2 ? [44, 42, 50] : [60, 58, 68]);
    B.add(0, 0.75, 0, 16, 1.5, 7, [200, 196, 188]);
    B.add(0, 1.6, 0, 17, 0.2, 8, [240, 236, 228]);
    for (let i = 0; i < 7; i++) { const a = PI * 1.08 + (i / 6) * PI * 0.84, r = 15 + (i % 2) * 4, h = 7 + (i % 3) * 3; B.add(Math.cos(a) * r, h / 2, Math.sin(a) * r, 1.4, h, 1.4, [60, 58, 66]); B.add(Math.cos(a) * r, h + 0.4, Math.sin(a) * r, 1.8, 0.6, 1.8, [255, 220, 170], 1.5); }
    const a0 = R.r(-0.6, 0.6);
    const cam = (t) => { const a = PI / 2 + a0 + Math.sin(t * 0.11) * 0.6; const r = 30 - Math.min(5, t * 0.15); return { pos: [Math.cos(a) * r, 9 + Math.sin(t * 0.07) * 3, Math.sin(a) * r], at: [0, 11, 0], fov: 0.82 }; };
    return {
      boxes: B, cam, statue: true,
      L: L({ top: [0.05, 0.05, 0.08], hor: [0.14, 0.12, 0.18], bot: [0.03, 0.03, 0.04], sun: [0.35, 0.8, 0.5], sunCol: [1, 0.95, 0.9], sunLight: [1.8, 1.7, 1.6], skyFill: [0.5, 0.5, 0.6], gndFill: [0.2, 0.18, 0.22], fog: 0.008, fogCol: [0.08, 0.07, 0.1], amb: 0.7, shadowR: 28 }),
      frame: (t) => { const c = cam(t); const d = v3.norm([c.pos[0], 0, c.pos[2]]); const F = facing(v3.add([0, 4, 0], v3.mul(d, 12)), c.pos, 0.26, 60); F.base = 6; return F; },
      ink: [255, 255, 255], key: (P.palette && P.palette.vivid) || [255, 200, 80], parts: 'dust',
    };
  };

  // ---------------------------------------------------------------- the cover as a pixel mural with depth
  W.mural = function (R, P) {
    const B = new V.Boxes(16000);
    for (let x = -44; x <= 44; x++) for (let z = -6; z <= 44; z++) B.vox(x, -1, z, (x + z) % 2 ? [200, 196, 190] : [186, 182, 176]);
    for (let i = 0; i < 10; i++) { const x = R.sgn() * R.i(22, 40), z = R.i(4, 40); tree(B, x, 0, z, R, R.pick([[70, 150, 60], [90, 168, 70], [250, 168, 200]])); }
    const sx = R.sgn(); const cam = (t) => { const x = sx * (-14 + Math.min(28, t * 0.8)); return { pos: [x, 11 + Math.sin(t * 0.2) * 1.5, 36 - Math.min(6, t * 0.2)], at: [x * 0.3, 14.5, -2], fov: 0.82 }; };
    return {
      boxes: B, cam, mural: true,
      L: L({ top: [0.42, 0.62, 0.95], hor: [0.95, 0.9, 0.85], bot: [0.5, 0.48, 0.45], sun: [-0.5, 0.7, 0.6], sunCol: [1, 0.92, 0.8], skyFill: [0.65, 0.75, 1], gndFill: [0.5, 0.45, 0.4], fog: 0.004, fogCol: [0.9, 0.88, 0.85], amb: 0.7, shadowR: 45 }),
      frame: (t) => { const c = cam(t); const F = facing([c.at[0], 7, 10], [c.pos[0], 7, c.pos[2]], 0.28, 60); F.base = 6; return F; },
      ink: [255, 255, 255], key: (P.palette && P.palette.vivid) || [230, 40, 60], glow: 0.15, parts: 'dust',
    };
  };

  V.WORLDS = W;
  V.PLACES = ['island', 'road', 'checker', 'meadow', 'space', 'vault', 'tunnel'];
  V.COVER_WORLDS = ['statue', 'mural'];

  // ---------------------------------------------------------------- the cover sampled into voxels
  V.coverVoxels = function (img, mask, n, depth) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, n, n);
    let d;
    try { d = x.getImageData(0, 0, n, n).data; } catch (e) { return []; }
    let m = null;
    if (mask) { const mc = document.createElement('canvas'); mc.width = mc.height = n; const mx = mc.getContext('2d', { willReadFrequently: true }); mx.drawImage(mask, 0, 0, n, n); m = mx.getImageData(0, 0, n, n).data; }
    const out = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 4;
      if (m && m[k] < 110) continue;
      const col = [d[k], d[k + 1], d[k + 2]], l = (0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2]) / 255;
      out.push({ i, j: n - 1 - j, col, dz: Math.round(l * depth) });
    }
    return out;
  };
})();
