/* Oley · ASCII designs: scenery. Mountains, forests, waterfalls, deserts, auroras and quiet places. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A, K = Cl.K;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, add = K.add, sm = Cl.smooth, clamp = Cl.clamp;

  const cabin = (B, c, w, d, h, o) => {
    o = o || {};
    B.box([c[0], c[1] + h / 2, c[2]], w, h, d, 2200, { col: (f, a, b) => ((f === 4 || f === 0) && Math.abs(a - 0.5) < 0.12 && b > 0.35 && b < 0.7 ? [1.2, 0.8, 0.4, 1] : (b * 8) % 1 < 0.12 ? [0.18, 0.1, 0.06] : [0.38, 0.22, 0.12]) });
    const rh = w * 0.5;
    B.surf((u, v) => [c[0] - w / 2 - 0.1 + u * (w + 0.2), c[1] + h + (1 - Math.abs(v * 2 - 1)) * rh, c[2] - d / 2 - 0.1 + v * (d + 0.2)], 2200, { col: () => (o.snow ? add([0.9, 0.93, 1], 0.8 + B.R() * 0.3) : [0.25, 0.15, 0.1]) });
    for (const s of [-1, 1]) B.surf((u, v) => [c[0] + s * w / 2, c[1] + h + v * rh * (1 - Math.abs(u * 2 - 1)), c[2] - d / 2 + u * d], 200, { col: [0.38, 0.22, 0.12] });
    const ch = [c[0] + w * 0.25, c[1] + h + rh * 0.6, c[2] + d * 0.2];
    B.box(ch, 0.18, 0.6, 0.18, 200, { col: [0.35, 0.3, 0.28] });
    K.smoke(B, V.add(ch, [0, 0.35, 0]), 0.12, 2.2, 600);
  };

  const halo = (B, c, r, n, col, k) => { const R = B.R; for (let i = 0; i < n; i++) { const a = R() * TAU, d = r * Math.sqrt(-Math.log(1 - R() * 0.98)) * 0.5; B.pt([c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, c[2] - 0.5], add(col, (k || 0.5) * Math.exp(-d / r * 2.2) * (0.6 + R() * 0.4)), [A.twinkle, 0.3, 0.5]); } };
  // a rock face standing up from y0 to top(x), along z (with a little relief)
  const face = (B, x0, x1, z, y0, top, n, col, gap) => { const R = B.R, N = B.N; for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0); if (gap && Math.abs(x) < gap) continue; const t = top(x), y = y0 + R() * (t - y0); B.pt([x, y, z + N.fbm(x * 1.3, y * 1.3, 0, 3) * 0.35], col(x, y, t)); } };

  // ================================================================ 1. mountains at dawn
  Cl.add('scenery', 'mountain-dawn', (B, R) => {
    B.light = V.norm([0.8, 0.3, 0.4]);
    // the far range is pale with haze, the near range dark with snow on the tops; fat points so the ridges hide the sky
    B.size(7, () => K.mountains(B, -30, 30, -26, 4, 15, 18000, { low: [0.32, 0.26, 0.4], high: [0.55, 0.45, 0.56], snowY: 0.62, snowCol: [1, 0.86, 0.82] }));
    B.size(5, () => K.mountains(B, -20, 20, -14, 3.5, 9, 24000, { low: [0.08, 0.08, 0.12], high: [0.3, 0.24, 0.3], snowY: 0.5, snowCol: [1, 0.8, 0.74] }));
    K.sea(B, 9, 4, -0.2, 7000, [0.12, 0.1, 0.18], { amp: 0.004, glint: [3, 0.5, -8], glintCol: [1, 0.75, 0.6] });
    B.size(1.6, () => { for (let i = 0; i < 14; i++) K.pine(B, [(R() - 0.5) * 14, -0.2, 1 + R() * 1.4], 0.9 + R() * 0.7, { n: 380, col: [0.03, 0.05, 0.05] }); });
    for (let i = 0; i < 4; i++) K.bird(B, [-1 + R() * 3, 3 + R(), -5], 0.15, [0.05, 0.04, 0.06]);
  }, { sea: ['#2a2038', '#0c0a14'], skyK: 0.85, cam: { dist: 8, pitch: -0.04, sway: 0.15, target: [0, 1.4, -4] }, sky: ['#1a2450', '#b06a80', '#ffb890'], horizon: 0.45, fog: ['#806a88', 12, 32], glow: [0.72, 0, 0.09, '#ffd0a0', 0.08], breathe: 0.001 });

  // ================================================================ 2. pines in the fog
  Cl.add('scenery', 'misty-pines', (B, R) => {
    const N = B.N;
    // rows of pines going back into the fog: each row a shade paler, mist drifting between them
    for (let row = 0; row < 5; row++) {
      const z = 0.5 - row * 2.4, y = -1 + row * 0.3;
      B.size(row < 2 ? 1.5 : 2, () => { for (let i = 0; i < 11; i++) K.pine(B, [(R() - 0.5) * (10 + row * 5), y + N.n3(i, row, 0) * 0.3, z - R() * 0.8], 1.8 + R() * 1.4, { n: 260, col: [0.03, 0.06, 0.05] }); });
    }
    B.u.wrapX = [-12, 24];
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3500; i++) B.pt([(R() - 0.5) * 24, -0.6 + k * 0.3 + (R() - 0.5) * 0.4, -1 - k * 2.4 + (R() - 0.5) * 1.2], add([0.62, 0.68, 0.74], 0.22 + R() * 0.2), [A.travel, 0.08 + R() * 0.06]);
  }, { skyK: 0.85, cam: { dist: 6.5, pitch: 0.04, sway: 0.15, target: [0, 0.9, -3] }, sky: ['#2a3442', '#6a7886', '#8a96a2'], horizon: 0.4, fog: ['#6a7684', 2, 14], glow: [0.64, 0, 0.16, '#a8b0b8', 0.2], breathe: 0.002 });

  // ================================================================ 3. a waterfall into a pool
  Cl.add('scenery', 'waterfall', (B, R) => {
    const N = B.N;
    const top = (x) => 2.6 + N.fbm(x * 0.6, 1, 0, 4) * 1.2 - Math.max(0, 1.4 - Math.abs(x)) * 0.25, t0 = top(0) - 0.05;
    const rock = (x, y, t) => (y > t - 0.15 ? [0.14, 0.3, 0.12] : mix([0.2, 0.19, 0.18], [0.44, 0.41, 0.37], clamp(0.5 + N.fbm(x * 2, y * 3, 0, 2) + Math.sin(y * 7) * 0.12, 0, 1)));
    // the cliff: a plateau on top and a rock face below, split by the fall
    B.size(2, () => {
      B.terrain(-8, 8, -5, -1.1, (x, z) => (Math.abs(x) < 0.55 ? t0 - 0.05 : top(x) + N.fbm(x, 2, z, 3) * 0.3), 9000, { col: (u, v, p) => (p[1] > 1.5 ? mix([0.12, 0.28, 0.1], [0.2, 0.36, 0.14], R()) : [0.3, 0.28, 0.26]) });
      face(B, -8, 8, -1.1, -1.5, top, 26000, rock, 0.55);
    });
    // the fall: separate ribbons of water, each with its own brightness and speed
    B.u.wrapY = [-1.5, t0 + 1.5];
    for (let k = 0; k < 18; k++) {
      const sx = -0.48 + (k / 17) * 0.96 + (R() - 0.5) * 0.04, br = 0.55 + R() * 0.6, sp = 2.6 + R() * 0.9;
      for (let i = 0; i < 420; i++) { const y = -1.5 + R() * (t0 + 1.5); B.pt([sx + (R() - 0.5) * 0.05, y, -1.2 + Math.max(0, t0 - y) * 0.03], add([0.82, 0.93, 1], br * (0.7 + R() * 0.4)), [A.fall, -sp, 0.01]); }
    }
    // the lip where it pours over, and the pool with its spray
    for (let i = 0; i < 600; i++) B.pt([(R() - 0.5) * 1.1, t0 + (R() - 0.5) * 0.08, -1.25 - R() * 0.6], add([0.85, 0.95, 1], 0.9));
    K.sea(B, 2.6, 1.4, -1.45, 4500, [0.1, 0.25, 0.3], { amp: 0.02 });
    for (let i = 0; i < 2500; i++) { const a = R() * TAU, r = Math.pow(R(), 0.7) * 1.3; B.pt([Math.cos(a) * r, -1.4, -0.9 + Math.sin(a) * r * 0.5], add([0.9, 0.95, 1], 0.55), [A.rise, 0.3 + R() * 0.3, 1.1]); }
    B.quad([-7, -1.5, 0.4], [14, 0, 0], [0, 0, 3], 5000, { col: () => mix([0.1, 0.22, 0.08], [0.18, 0.3, 0.12], R()) });
    for (let i = 0; i < 6; i++) K.tree(B, [(i < 3 ? -1 : 1) * (2.6 + R() * 3), -1.5, 0.8 + R() * 1.2], 1.6 + R() * 0.8, { leafN: 110 });
  }, { ground: ['#14200e', '#0a1208'], skyK: 0.7, cam: { dist: 7.5, pitch: 0.06, sway: 0.2, target: [0, 0.6, -1.2] }, sky: ['#3a6a9a', '#90b8d0', '#c8d8d8'], horizon: 0.45, breathe: 0.002 });

  // ================================================================ 4. desert dunes, sand streaming off the crests
  Cl.add('scenery', 'dunes', (B, R) => {
    const N = B.N;
    const h = (x, z) => { const k = Math.sin(x * 0.45 + N.fbm(x * 0.1, 0, z * 0.1, 2) * 3 + z * 0.15); return -1 + Math.pow(Math.abs(k), 0.8) * 1.2 * (0.6 + 0.4 * Math.sin(z * 0.25)) + Math.max(0, -z) * 0.05; };
    B.terrain(-12, 12, -14, 3, h, 26000, { col: (u, v, p, n) => mix([0.55, 0.3, 0.15], [0.98, 0.7, 0.42], clamp(0.2 + n[0] * 0.6 + n[1] * 0.4, 0, 1)) });
    B.u.wrapX = [-12, 24];
    for (let i = 0; i < 1500; i++) { const x = (R() - 0.5) * 24, z = -R() * 12; B.pt([x, h(x, z) + 0.05 + R() * 0.1, z], add([1, 0.8, 0.55], 0.5), [A.travel, 1.2 + R()]); }
  }, { cam: { dist: 8, pitch: 0.1, sway: 0.25, target: [0, -0.2, -3] }, sky: ['#3a2a5a', '#e07a50', '#ffc070'], horizon: 0.4, glow: [0.35, 0, 0.11, '#ffe0a0', 0.07], ground: ['#7a4426', '#3a1e0c'], skyK: 0.7, breathe: 0.001 });

  // ================================================================ 5. the northern lights over a lake
  Cl.add('scenery', 'aurora', (B, R) => {
    K.sea(B, 12, 8, -0.8, 12000, [0.02, 0.06, 0.06], { amp: 0.006 });
    for (let i = 0; i < 20; i++) K.pine(B, [(R() - 0.5) * 14, -0.8, -5 - R() * 2], 1.0 + R() * 1.2, { n: 400, col: [0.02, 0.04, 0.03] });
    for (let band = 0; band < 3; band++) for (let i = 0; i < 9000; i++) {
      const t = R() * 2 - 1, x = t * 12, z = -9 - band * 2 + Math.sin(t * 4 + band) * 2, y0 = 2.2 + Math.sin(t * 3 + band * 2) * 0.6, h = Math.pow(R(), 1.6) * 3.2;
      const c = add(mix([0.15, 1, 0.45], [0.75, 0.3, 1], clamp(h / 3, 0, 1)), (1.2 - h * 0.3) * (0.6 + 0.4 * Math.sin(t * 30 + band)));
      B.pt([x, y0 + h, z], c, [A.twinkle, 0.6 + R()]);
      if (i % 3 === 0) B.pt([x, -0.8 - (y0 + h + 0.8) * 0.9, z], add(c, 0.3), [A.water, 0.006, 0.6]);
    }
    K.stars(B, 2000, 30, { half: true });
  }, { cam: { dist: 6.5, pitch: 0.12, sway: 0.2, target: [0, 1.6, -4] }, sky: ['#01030a', '#03101a', '#01040a'], horizon: 0.38, sea: ['#04100e', '#010605'], breathe: 0.003 });

  // ================================================================ 6. a path under cherry trees
  Cl.add('scenery', 'blossom-path', (B, R) => {
    B.quad([-0.8, 0, -12], [1.6, 0, 0], [0, 0, 14], 7000, { col: () => (R() < 0.15 ? [0.98, 0.75, 0.82] : mix([0.55, 0.45, 0.35], [0.65, 0.55, 0.42], R())) });
    B.quad([-6, -0.01, -12], [12, 0, 0], [0, 0, 14], 9000, { col: () => mix([0.25, 0.4, 0.18], [0.35, 0.5, 0.22], R()) });
    const pinks = (k) => mix([0.98, 0.72, 0.82], [0.95, 0.55, 0.7], k);
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) K.tree(B, [s * (1.6 + R() * 0.5), 0, 1.5 - i * 2], 2.6 + R() * 0.6, { leaf: pinks, leafN: 140, blob: 0.15, bark: [0.2, 0.12, 0.1] });
    B.u.wrapY = [0, 5];
    for (let i = 0; i < 400; i++) B.pt([(R() - 0.5) * 5, R() * 5, 2 - R() * 13], add([0.98, 0.75, 0.82], 0.9), [A.fall, -0.3 - R() * 0.2, 0.2]);
  }, { cam: { dist: 4.5, pitch: 0.12, sway: 0.15, target: [0, 1.1, -4], fov: 48 }, sky: ['#6a8ab8', '#b8c8e0', '#e8e0e8'], horizon: 0.42, fog: ['#c0c0d0', 6, 16], breathe: 0.003 });

  // ================================================================ 7. rice terraces in mist
  Cl.add('scenery', 'terraces', (B, R) => {
    const N = B.N;
    const raw = (x, z) => 2.6 * Math.exp(-((x - 1) * (x - 1) * 0.06 + (z + 3) * (z + 3) * 0.08)) + N.fbm(x * 0.2, 0, z * 0.2, 3) * 0.6;
    const step = (x, z) => Math.floor(raw(x, z) * 5) / 5 - 1;
    B.terrain(-9, 9, -10, 3, step, 30000, { col: (u, v, p) => { const f = (raw(p[0], p[2]) * 5) % 1; return f > 0.9 ? [0.3, 0.25, 0.15] : f < 0.5 && R() < 0.5 ? add([0.55, 0.65, 0.75], 0.5 + R() * 0.3) : mix([0.25, 0.45, 0.15], [0.45, 0.6, 0.2], R()); } });
    for (let i = 0; i < 6; i++) K.tree(B, [(R() - 0.5) * 10, -0.5, -6 - R() * 2], 1.4, { leafN: 80 });
  }, { ground: ['#1a3010', '#0e1a08'], skyK: 0.6, cam: { dist: 9, pitch: 0.32, sway: 0.25, target: [0, 0, -3] }, sky: ['#5a7a98', '#a8bccc', '#d8e0e0'], horizon: 0.45, fog: ['#8a9aa4', 11, 26], breathe: 0.001 });

  // ================================================================ 8. a canyon with a river
  Cl.add('scenery', 'canyon', (B, R) => {
    const N = B.N, cx = (z) => Math.sin(z * 0.3) * 1.5;
    // terraced walls (stepped, so the layers read as bands), a green ribbon of river at the bottom
    const h = (x, z) => { const w = Math.abs(x - cx(z)); if (w < 0.9) return -1.5; const r = Math.min(4.2, (w - 0.9) * 1.4) + N.fbm(x * 0.4, 1, z * 0.4, 3) * 0.5; return -1.5 + Math.floor(r * 3) / 3 + (r * 3 % 1) * 0.08; };
    B.size(2.2, () => B.terrain(-10, 10, -16, 3, h, 36000, { col: (u, v, p) => { if (p[1] < -1.4) return [0.2, 0.4, 0.42]; const s = Math.sin(p[1] * 9 + N.fbm(p[0] * 0.5, p[1], p[2] * 0.5, 2) * 2); return mix([0.55, 0.22, 0.1], [0.9, 0.58, 0.36], 0.5 + 0.5 * s); } }));
    B.with([A.water, 0.01, 1.2], () => { for (let i = 0; i < 4000; i++) { const z = 3 - R() * 19, x = cx(z) + (R() - 0.5) * 1.5; B.pt([x, -1.44, z], add([0.25, 0.55, 0.55], 0.6 + Math.pow(R(), 6) * 1.2)); } });
    for (let i = 0; i < 3; i++) K.bird(B, [(R() - 0.5) * 3, 1.5 + R(), -4 - R() * 3], 0.18, [0.1, 0.08, 0.08]);
  }, { ground: ['#5a2a14', '#2a1208'], skyK: 0.7, cam: { dist: 8, pitch: 0.42, sway: 0.2, target: [0, -0.6, -4] }, sky: ['#3a6aa0', '#90b8d8', '#e0d0b8'], horizon: 0.5, fog: ['#b88a68', 10, 24], breathe: 0.001 });

  // ================================================================ 9. a volcano erupting at night
  Cl.add('scenery', 'volcano', (B, R) => {
    const N = B.N;
    const h = (x, z) => { const r = Math.hypot(x, z + 3); return -1.5 + Math.max(0, 3.6 - r * 0.9) * (1 + N.fbm(x * 0.5, 0, z * 0.5, 3) * 0.2) - (r < 0.6 ? (0.6 - r) * 1.5 : 0); };
    // the cone is drawn dense so it stands black against the glowing ash cloud behind it
    halo(B, [0, 2.4, -5.5], 2.6, 18000, [1, 0.38, 0.1], 1.0);
    B.size(4, () => B.terrain(-9, 9, -11, 3, h, 30000, { col: (u, v, p) => { const ang = Math.atan2(p[2] + 3, p[0]); const lava = Math.sin(ang * 5 + N.n3(p[0], p[1], p[2]) * 3) > 0.92 && p[1] > -1.2; return lava ? [1.4, 0.4, 0.05, 1] : mix([0.04, 0.03, 0.03], [0.12, 0.09, 0.08], R()); } }));
    K.fire(B, [0, 2.1, -3], 0.4, 2.2, 3500, { c0: [1, 0.85, 0.3], c1: [0.95, 0.2, 0.02], embers: 500 });
    for (let i = 0; i < 4000; i++) B.pt([(R() - 0.5) * 0.8, 2.3, -3 + (R() - 0.5) * 0.8], add([0.4, 0.3, 0.28], 0.5 + R() * 0.4), [A.rise, 0.06 + R() * 0.05, 5]);
    K.stars(B, 1200, 30, { half: true });
  }, { ground: ['#0a0504', '#040202'], skyK: 1, cam: { dist: 13, pitch: 0.03, sway: 0.18, target: [0, 1.4, -3] }, sky: ['#030206', '#1a0608', '#3a1006'], horizon: 0.35, breathe: 0.002 });

  // ================================================================ 10. a lone tree on a hill
  Cl.add('scenery', 'lone-tree', (B, R) => {
    const h = K.hills(B, 10, 8, -1.2, 0.4, 20000, [0.2, 0.42, 0.15], { f: 0.25 });
    const top = [0.6, h(0.6, -1) + 0.0, -1];
    K.tree(B, top, 3.4, { leafN: 260, blob: 0.14, depth: 5, spread: 1.4 });
    for (let i = 0; i < 4; i++) K.cloud(B, [(R() - 0.5) * 14, 3.5 + R() * 1.5, -10 - R() * 4], 3, 0.8, 2200, [0.95, 0.96, 1]);
    B.u.swayY = -1;
  }, { cam: { dist: 8, pitch: 0.06, sway: 0.25, target: [0, 1, -1.5] }, sky: ['#2a6ab8', '#7ab0e0', '#c8e0f0'], horizon: 0.42, breathe: 0.003 });

  // ================================================================ 11. an autumn forest, leaves falling
  Cl.add('scenery', 'autumn', (B, R) => {
    B.quad([-8, 0, -10], [16, 0, 0], [0, 0, 12], 10000, { col: () => mix([0.5, 0.25, 0.08], [0.75, 0.45, 0.12], R()) });
    const leafC = (k) => (k < 0.33 ? [0.85, 0.3, 0.08] : k < 0.66 ? [0.95, 0.6, 0.1] : [0.7, 0.15, 0.08]);
    for (let i = 0; i < 16; i++) K.tree(B, [(R() - 0.5) * 12, 0, 1 - R() * 9], 2.2 + R() * 1.5, { leaf: leafC, leafN: 110, blob: 0.13 });
    B.u.wrapY = [0, 5];
    for (let i = 0; i < 500; i++) B.pt([(R() - 0.5) * 10, R() * 5, -R() * 8], leafC(R()), [A.fall, -0.35 - R() * 0.25, 0.25]);
  }, { cam: { dist: 6.5, pitch: 0.12, sway: 0.25, target: [0, 1.2, -3] }, sky: ['#4a6a98', '#c8b090', '#e8c8a0'], horizon: 0.42, fog: ['#c0a080', 7, 18], breathe: 0.003 });

  // ================================================================ 12. a cabin in the snow
  Cl.add('scenery', 'snow-cabin', (B, R) => {
    K.hills(B, 10, 8, -0.5, 0.25, 12000, () => add([0.42, 0.48, 0.6], 0.7 + R() * 0.25), { f: 0.25 });
    cabin(B, [0, -0.5, -1], 2, 1.6, 1.2, { snow: true });
    // the window light spilling onto the snow
    for (let i = 0; i < 1500; i++) { const a = R() * PI, r = Math.sqrt(R()) * 1.8; B.pt([Math.cos(a) * r, -0.48, -0.15 + Math.sin(a) * r], add([1, 0.7, 0.4], 0.5 * (1 - r / 1.8))); }
    B.size(1.6, () => { for (let i = 0; i < 20; i++) K.pine(B, [(R() < 0.5 ? -1 : 1) * (2.4 + R() * 6), -0.5, -1 - R() * 7], 1.4 + R() * 1.4, { n: 320, snow: true }); });
    K.snow(B, 7, 6, -0.5, 6, 1300, { speed: 0.4 });
  }, { ground: ['#3a4458', '#1c2232'], skyK: 0.9, cam: { dist: 6.2, pitch: 0.1, sway: 0.22, target: [0, 0.5, -1.2] }, sky: ['#060a16', '#141c30', '#2a3448'], horizon: 0.4, breathe: 0.002 });

  // ================================================================ 13. mountains mirrored in a still lake
  Cl.add('scenery', 'mirror-lake', (B, R) => {
    B.light = V.norm([-0.6, 0.5, 0.5]);
    const ridge = (k) => K.mountains(B, -18, 18, -11, 3.5, 5, k ? 10000 : 20000, k ? { low: [0.06, 0.08, 0.1], high: [0.2, 0.2, 0.26], snowY: 0.55, snowCol: [0.5, 0.48, 0.55], y: 0 } : { low: [0.1, 0.14, 0.14], high: [0.42, 0.38, 0.42], snowY: 0.55, snowCol: [1, 0.9, 0.86], y: 0 });
    B.size(5, () => ridge(0));
    // the reflection: the same ridge upside down, darker and gently rippling
    B.push().scale(1, -1, 1); B.anim = [A.water, 0.006, 0.6]; B.size(5, () => ridge(1)); B.anim = null; B.pop();
    B.size(1.6, () => { for (let i = 0; i < 16; i++) { const x = (R() - 0.5) * 16, hh = 0.6 + R() * 0.8; K.pine(B, [x, 0, -7 + R()], hh, { n: 300, col: [0.03, 0.06, 0.05] }); } });
    for (let i = 0; i < 2500; i++) { const x = (R() - 0.5) * 20; B.pt([x, 0.01, -2 - R() * 5], add([0.9, 0.8, 0.8], 0.15 + Math.pow(R(), 8) * 0.8), [A.water, 0.004, 0.6]); }
  }, { sea: ['#3a3048', '#100e18'], skyK: 0.85, cam: { dist: 8, pitch: 0.03, sway: 0.15, target: [0, 0.6, -5] }, sky: ['#1a3060', '#b08898', '#f0c0a0'], horizon: 0.5, breathe: 0.001 });

  // ================================================================ 14. wind turbines on the hills
  Cl.add('scenery', 'wind-farm', (B, R) => {
    const h = K.hills(B, 12, 10, -1.2, 0.5, 18000, [0.25, 0.45, 0.18], { f: 0.2 });
    for (let k = 0; k < 5; k++) {
      const x = -5 + k * 2.6, z = -2 - (k % 2) * 3, base = [x, h(x, z), z], H = 2.6 - (k % 2) * 0.4, hub = V.add(base, [0, H, 0]);
      B.cyl(base, hub, 0.06, 0.035, 900, { col: [0.92, 0.92, 0.94] });
      B.box(V.add(hub, [0, 0, 0.08]), 0.12, 0.12, 0.3, 150, { col: [0.92, 0.92, 0.94] });
      const g = B.pivot(V.add(hub, [0, 0, 0.25]), [0, 0, 1], 0.8 + k * 0.1);
      B.with([A.spin, 0, g], () => { for (let b = 0; b < 3; b++) { const a = (b / 3) * TAU + k; B.trail((t) => V.add(hub, [Math.cos(a) * t * 1.3, Math.sin(a) * t * 1.3, 0.25]), 500, [0.95, 0.95, 0.97], { j: 0.03 }); } });
    }
    for (let i = 0; i < 4; i++) K.cloud(B, [(R() - 0.5) * 16, 4 + R(), -12], 3, 0.7, 1800, [0.95, 0.96, 1]);
  }, { cam: { dist: 9, pitch: 0.05, sway: 0.25, target: [0, 0.9, -2.5] }, sky: ['#2a6ab8', '#7ab0e0', '#d0e4f0'], horizon: 0.42, breathe: 0.002 });

  // ================================================================ 15. a bamboo grove
  Cl.add('scenery', 'bamboo', (B, R) => {
    B.quad([-6, 0, -8], [12, 0, 0], [0, 0, 10], 7000, { col: () => mix([0.15, 0.2, 0.08], [0.25, 0.3, 0.12], R()) });
    B.u.swayY = 0;
    for (let i = 0; i < 40; i++) {
      const x = (R() - 0.5) * 9, z = 1 - R() * 7, h = 4 + R() * 3;
      B.with([A.sway, 0.01, 0.5 + R() * 0.3], () => {
        B.cyl([x, 0, z], [x + (R() - 0.5) * 0.3, h, z], 0.07, 0.05, Math.round(200 * h), { col: (u) => ((u * h * 2.5) % 1 < 0.06 ? [0.35, 0.4, 0.15] : mix([0.45, 0.6, 0.2], [0.6, 0.7, 0.3], u)) });
        for (let k = 0; k < 10; k++) { const y = h * (0.5 + R() * 0.5); B.push().aim([R() - 0.5, 0.2, R() - 0.5], [x, y, z]).petal({ L: 0.4, W: 0.06, az: R() * TAU, open0: 1.2, open: 0.5, n: 60, col: () => [0.25, 0.5, 0.15] }) && B.pop(); }
      });
    }
  }, { cam: { dist: 5.5, pitch: 0.18, sway: 0.2, target: [0, 2, -2], fov: 48 }, sky: ['#3a5a3a', '#8ab088', '#c8d8b8'], horizon: 0.45, fog: ['#a0b898', 5, 14], breathe: 0.003 });

  // ================================================================ 16. the savanna at sunset
  Cl.add('scenery', 'savanna', (B, R) => {
    B.quad([-14, 0, -14], [28, 0, 0], [0, 0, 16], 12000, { col: () => mix([0.3, 0.18, 0.06], [0.5, 0.32, 0.1], R()) });
    // flat-topped acacias, drawn dense so they print as clean black shapes against the sun
    const acacia = (p, s) => B.size(2.2, () => {
      B.cyl(p, V.add(p, [0.1 * s, 1.4 * s, 0]), 0.07 * s, 0.045 * s, 700, { col: [0.03, 0.02, 0.015] });
      for (let k = 0; k < 4; k++) { const d = [Math.cos(k * 1.6) * 0.9, 0.5, Math.sin(k * 1.6) * 0.6]; B.cyl(V.add(p, [0.1 * s, 1.4 * s, 0]), V.add(p, V.mul(V.add(d, [0.1, 1.4, 0]), s)), 0.035 * s, 0.02 * s, 220, { col: [0.03, 0.02, 0.015] }); }
      B.blob(V.add(p, [0.1 * s, 1.95 * s, 0]), 0.5 * s, 4500, { sq: [2.2, 0.26, 1.6], col: () => [0.02, 0.025, 0.012] });
    });
    acacia([-2.6, 0, -3], 1.4); acacia([3.2, 0, -6], 1.0); acacia([6, 0, -9], 0.8);
    for (let i = 0; i < 5; i++) K.bird(B, [-0.5 + R() * 2, 2.6 + R() * 0.8, -6], 0.16, [0.03, 0.02, 0.02]);
    F_grass(B);
  }, { ground: ['#4a2a10', '#1e1006'], skyK: 0.9, cam: { dist: 7, pitch: 0.04, sway: 0.15, target: [0, 1.2, -3] }, sky: ['#3a1a40', '#d0603a', '#ffb050'], horizon: 0.42, glow: [0.52, 0, 0.16, '#ffd070', 0.05], breathe: 0.002 });
  function F_grass(B) { const R = B.R; for (let i = 0; i < 1600; i++) { const x = (R() - 0.5) * 20, z = 2 - R() * 12, h = 0.2 + R() * 0.4; B.hair([x, 0, z], [(R() - 0.5) * 0.1, h, 0], [0.4, 0.25, 0.08], [0.85, 0.6, 0.2], [A.sway, 0.4, 1.4]); } B.u.swayY = 0; }

  // ================================================================ 17. a river winding down a green valley
  Cl.add('scenery', 'valley', (B, R) => {
    const N = B.N, rx = (z) => Math.sin(z * 0.35) * 2.2;
    const h = (x, z) => { const d = Math.abs(x - rx(z)); return -1 + Math.min(3.5, d * d * 0.18) + N.fbm(x * 0.3, 2, z * 0.3, 4) * 0.5; };
    B.terrain(-10, 10, -16, 3, h, 32000, { col: (u, v, p) => (Math.abs(p[0] - rx(p[2])) < 0.55 ? add([0.35, 0.65, 0.85], 0.9 + R() * 0.4) : mix([0.12, 0.3, 0.08], [0.3, 0.45, 0.15], 0.5 + N.fbm(p[0], 0, p[2], 2))) });
    for (let i = 0; i < 12; i++) { const z = 1 - R() * 13, x = rx(z) + (R() < 0.5 ? -1 : 1) * (1 + R() * 3); K.tree(B, [x, h(x, z), z], 1 + R() * 0.6, { leafN: 70 }); }
    for (let i = 0; i < 3; i++) K.cloud(B, [(R() - 0.5) * 14, 4, -14], 4, 0.8, 1800, [0.95, 0.96, 1]);
  }, { ground: ['#1e3a16', '#10200a'], skyK: 0.6, cam: { dist: 8, pitch: 0.35, sway: 0.25, target: [0, 0, -4] }, sky: ['#2a6ab0', '#7ab0dc', '#d0e8f0'], horizon: 0.5, fog: ['#8aa8b8', 14, 30], breathe: 0.001 });

  // ================================================================ 18. a sea arch
  Cl.add('scenery', 'sea-arch', (B, R) => {
    const N = B.N;
    K.sea(B, 14, 10, -1, 16000, [0.05, 0.18, 0.28], { amp: 0.07, speed: 1.2 });
    B.push().move(0.5, -1, -2.5);
    B.surf((u, v) => { const a = u * PI, rr = 1.6 + (v - 0.5) * 0.9, n = N.fbm(u * 4, v * 3, 0, 3) * 0.3; return [Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 1.2 + n, (v - 0.5) * 1.4 + n]; }, 16000, { col: (u, v, p) => mix([0.45, 0.38, 0.3], [0.65, 0.55, 0.42], 0.5 + 0.5 * Math.sin(p[1] * 8)) });
    B.pop();
    B.terrain(-9, -3, -6, 2, (x, z) => -1 + Math.max(0, (-3 - x)) * 1.6 + N.fbm(x, 0, z, 3) * 0.6, 9000, { col: (u, v, p) => (p[1] > 2 ? [0.2, 0.35, 0.15] : [0.5, 0.42, 0.32]) });
    for (let i = 0; i < 3000; i++) { const a = R() * PI, x = 0.5 + Math.cos(a) * 2.6; B.pt([x, -0.95, -2.5 + (R() - 0.5) * 1.8], add([0.95, 0.97, 1], 0.6), [A.water, 0.07, 1.2]); }
    for (let i = 0; i < 4; i++) K.bird(B, [(R() - 0.5) * 4, 2.5 + R(), -3], 0.18, [0.15, 0.15, 0.18]);
  }, { cam: { dist: 8, pitch: 0.06, sway: 0.25, target: [0, 0.4, -2] }, sky: ['#3a7ab8', '#90c0e0', '#e0ecf0'], horizon: 0.42, sea: ['#143a52', '#0a1e2c'], breathe: 0.002 });

  // ================================================================ 19. a tent and a fire under the stars
  Cl.add('scenery', 'camp', (B, R) => {
    B.quad([-8, 0, -8], [16, 0, 0], [0, 0, 10], 9000, { col: () => mix([0.04, 0.06, 0.03], [0.07, 0.09, 0.05], R()) });
    B.surf((u, v) => { const x = (u - 0.5) * 1.6, y = (1 - Math.abs(u * 2 - 1)) * 1.1; return [x - 1, y, -0.5 + v * 1.8]; }, 4000, { col: (u, v) => (v > 0.97 && Math.abs(u - 0.5) < 0.25 ? [1, 0.6, 0.25, 1] : [0.85, 0.45, 0.15]) });
    K.fire(B, [0.9, 0, 0.6], 0.24, 1.0, 2400);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; B.sphere([0.9 + Math.cos(a) * 0.32, 0.04, 0.6 + Math.sin(a) * 0.32], 0.07, 60, { col: [0.35, 0.33, 0.3] }); }
    for (let i = 0; i < 3000; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 2.5; B.pt([0.9 + Math.cos(a) * r, 0.01, 0.6 + Math.sin(a) * r], add([1, 0.6, 0.3], 0.4 * (1 - r / 2.5))); }
    B.size(2.4, () => { for (let i = 0; i < 16; i++) K.pine(B, [(R() - 0.5) * 18, 0, -5 - R() * 5], 2.8 + R() * 1.8, { n: 300, col: [0.005, 0.01, 0.01] }); });
    // the Milky Way: a broad soft band with a brighter core and dark lanes
    B.size(1.6, () => { for (let i = 0; i < 20000; i++) { const t = R() * 2 - 1, w = (R() + R() + R() - 1.5) * 0.16, lane = Math.abs(w - Math.sin(t * 5) * 0.03) < 0.02 ? 0.25 : 1, p = V.mul(V.norm([t * 1.5, 0.3 + w + t * 0.28, -1]), 30); B.pt(p, add(mix([0.75, 0.78, 1], [1, 0.86, 0.7], R()), lane * (0.35 + Math.pow(R(), 5) * 1.4) * (1.2 - Math.abs(w) * 3)), [A.twinkle, 1 + R() * 2]); } });
    K.stars(B, 2200, 30, { half: true });
  }, { ground: ['#06080a', '#030404'], skyK: 1, cam: { dist: 6, pitch: 0.1, sway: 0.2, target: [0, 1.4, -1] }, sky: ['#02030c', '#1a2a58', '#1a2a58'], horizon: 0.58, breathe: 0.003 });

  // ================================================================ 20. a full moon behind the pines
  Cl.add('scenery', 'moon-pines', (B, R) => {
    // a big low moon right behind the treeline, with its halo, so the pines cut black shapes across it
    K.moon(B, [0.6, 1.9, -14], 2.4, 11000);
    halo(B, [0.6, 1.9, -14.3], 4.2, 14000, [0.75, 0.8, 0.95], 0.7);
    const N = B.N;
    B.size(2, () => B.terrain(-12, 12, -6, 2, (x, z) => -1 + N.fbm(x * 0.3, 1, z * 0.3, 3) * 0.8 + Math.max(0, -z - 2) * 0.3, 9000, { col: [0.01, 0.015, 0.02], lit: false }));
    B.size(2.2, () => { for (let i = 0; i < 24; i++) K.pine(B, [(R() - 0.5) * 16, -0.6 + R() * 0.5, -3 - R() * 3], 1.6 + R() * 1.8, { n: 360, col: [0.004, 0.008, 0.008] }); });
    K.sparks(B, [0, 0.3, -1], 8, 2, 90, [0.85, 1, 0.5]);
    K.stars(B, 1400, 30, { half: true });
  }, { ground: ['#030406', '#010203'], skyK: 1, cam: { dist: 6.5, pitch: 0.05, sway: 0.12, target: [0, 1.2, -4] }, sky: ['#02040e', '#18264c', '#18264c'], horizon: 0.56, breathe: 0.002 });
})();
