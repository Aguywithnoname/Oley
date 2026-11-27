/* Oley · ASCII designs: oceans. Waves, ships, lighthouses, and what swims under the surface. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A, K = Cl.K;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, add = K.add, sm = Cl.smooth, clamp = Cl.clamp;
  const DEEP = ['#020812', '#04182a', '#010408'];

  // light shafts from the surface, for underwater scenes
  // each shaft is a slanted sheet of faint points that thins out with depth and shimmers gently
  const rays = (B, n, top, col, o) => {
    const R = B.R, len = (o && o.len) || 6, k0 = (o && o.k) || 0.4, sl = (o && o.slant) == null ? 0.18 : o.slant;
    for (let k = 0; k < n; k++) {
      const x = (R() - 0.5) * 10, z = -1 - R() * 6, w = 0.25 + R() * 0.35, m = Math.round(700 * w * len / 6);
      for (let i = 0; i < m; i++) { const t = Math.pow(R(), 1.3), wi = w * (1 + t * 0.8); B.pt([x + sl * t * len + (R() - 0.5) * wi, top - t * len, z + (R() - 0.5) * wi * 0.6], add(col || [0.5, 0.8, 0.9], k0 * (1 - t) * (0.6 + R() * 0.4)), [A.twinkle, 0.25, 0.6 + R()]); }
    }
  };
  const bubbles = (B, n, w, y0, h) => { const R = B.R; for (let i = 0; i < n; i++) B.pt([(R() - 0.5) * w, y0, (R() - 0.5) * w * 0.5], [0.75, 0.9, 1], [A.rise, 0.08 + R() * 0.1, h]); };
  const seabed = (B, y, col) => { const N = B.N; B.terrain(-9, 9, -9, 3, (x, z) => y + N.fbm(x * 0.4, 3, z * 0.4, 4) * 0.5, 9000, { col: (u, v, p) => mix(col || [0.15, 0.2, 0.18], add(col || [0.15, 0.2, 0.18], 1.8), 0.5 + N.fbm(p[0] * 2, 0, p[2] * 2, 2)) }); };

  // ================================================================ 1. waves at sunset
  Cl.add('oceans', 'sunset-waves', (B, R) => {
    K.sea(B, 14, 12, -0.6, 22000, [0.16, 0.06, 0.1], { amp: 0.09, speed: 1.1, glint: [0, 0.9, -14], glintCol: [1, 0.7, 0.35] });
    for (let i = 0; i < 5; i++) K.bird(B, [-2 + R() * 4, 1.6 + R(), -3 - R() * 3], 0.2, [0.04, 0.03, 0.04]);
  }, { sea: ['#3a1622', '#14060c'], cam: { dist: 6, pitch: 0.08, sway: 0.1, target: [0, 0, -3] }, sky: ['#1a0a30', '#c04a50', '#ff9a50'], horizon: 0.45, glow: [0.5, 0, 0.12, '#ffc070', 0.035], breathe: 0.002 });

  // ================================================================ 2. the moon's path on the sea
  Cl.add('oceans', 'moonlit-sea', (B, R) => {
    K.sea(B, 14, 12, -0.6, 22000, [0.05, 0.08, 0.16], { amp: 0.07, speed: 0.8, glint: [0, 0.5, -14], glintCol: [0.85, 0.9, 1] });
    K.moon(B, [0, 3.2, -16], 1.0, 4000);
    K.stars(B, 1600, 34, { half: true });
    K.cloud(B, [-4, 4, -18], 6, 1.2, 2500, [0.2, 0.22, 0.3]);
  }, { sea: ['#0c1630', '#04080f'], cam: { dist: 6, pitch: 0.06, sway: 0.1, target: [0, 0.6, -4] }, sky: ['#01030a', '#06102a', '#02040a'], horizon: 0.45, breathe: 0.002 });

  // ================================================================ 3. a lighthouse on the cliffs in a swell
  Cl.add('oceans', 'lighthouse', (B, R) => {
    const N = B.N;
    K.sea(B, 12, 10, -1, 16000, [0.03, 0.06, 0.1], { amp: 0.12, speed: 1.3 });
    B.terrain(0.5, 6, -4, 3, (x, z) => -1 + Math.max(0, 1.6 - Math.abs(z + 0.5) * 0.5 - Math.max(0, 1.6 - x) * 1.2) * (1 + N.fbm(x, 0, z, 3) * 0.6), 9000, { col: (u, v, p) => (p[1] > 0.4 ? [0.18, 0.28, 0.12] : [0.3, 0.27, 0.24]) });
    for (let i = 0; i < 2000; i++) { const t = R(), z = -3 + t * 5, x = 1.5 + Math.sin(z) * 0.2 + (R() - 0.5) * 0.3; B.pt([x, -0.95 + R() * 0.2, z], add([0.95, 0.97, 1], 0.6 + R() * 0.5), [A.water, 0.12, 1.3]); }
    const lh = [3, 0.55, -0.5];
    B.cyl(lh, V.add(lh, [0, 2.4, 0]), 0.32, 0.22, 2600, { col: (u) => (Math.floor(u * 5) % 2 ? [0.85, 0.15, 0.12] : [0.95, 0.95, 0.92]) });
    B.cyl(V.add(lh, [0, 2.4, 0]), V.add(lh, [0, 2.75, 0]), 0.2, 0.2, 400, { col: [1.3, 1.2, 0.9], lit: false });
    B.cyl(V.add(lh, [0, 2.75, 0]), V.add(lh, [0, 3.0, 0]), 0.24, 0.02, 300, { col: [0.2, 0.2, 0.22] });
    const g = B.pivot(V.add(lh, [0, 2.55, 0]), [0, 1, 0], 0.6);
    B.with([A.spin, 0, g], () => { for (let i = 0; i < 4500; i++) { const t = Math.pow(R(), 0.6), w = t * 0.8; B.pt([lh[0] - t * 9, lh[1] + 2.55 + (R() - 0.5) * w * 0.3, lh[2] + (R() - 0.5) * w], add([1, 0.95, 0.75], (1 - t) * 0.75)); } });
    K.stars(B, 900, 30, { half: true });
  }, { sea: ['#08121e', '#03070c'], cam: { dist: 8, pitch: 0.1, sway: 0.25, target: [1, 0.8, -0.5] }, sky: ['#02040c', '#0a1428', '#04080e'], horizon: 0.38, breathe: 0.002 });

  // ================================================================ 4. a whale breaching
  Cl.add('oceans', 'whale', (B, R) => {
    K.sea(B, 14, 10, -0.5, 18000, [0.04, 0.1, 0.16], { amp: 0.06 });
    K.fish(B, [0, 0.8, -1], 0.3, 4.2, { pitch: 1.0, h: 0.2, w: 0.22, n: 9000, tail: 0.18, tailH: 1.3, dorsal: 0.25,
      col: (u, v, up) => (up > 0.55 ? mix([0.1, 0.12, 0.16], [0.18, 0.2, 0.25], u) : (Math.sin(v * 70) > 0.4 && u < 0.4 ? [0.85, 0.85, 0.82] : [0.6, 0.62, 0.64])), finCol: [0.12, 0.14, 0.18] });
    for (const s of [-1, 1]) B.push().move(-0.2, 1.1, -1 + s * 0.4).rotX(s * 1.2).petal({ L: 1.4, W: 0.25, az: s > 0 ? 0 : PI, open0: 1.4, open: 0.4, curl: 0.4, n: 900, col: () => [0.15, 0.17, 0.2] }) && B.pop();
    for (let i = 0; i < 5000; i++) { const a = R() * TAU, r = 0.6 + R() * 1.8; B.pt([Math.cos(a) * r * 0.6, -0.5 + Math.pow(R(), 2) * 1.6 * (1 - r / 2.6), -1.6 + Math.sin(a) * r * 0.5], add([0.9, 0.95, 1], 0.5 + R() * 0.5), [A.rise, 0.3 + R() * 0.3, 0.4]); }
  }, { sea: ['#2a3e4c', '#0c1a24'], cam: { dist: 8.5, pitch: 0.06, sway: 0.25, target: [0, 1, -1] }, sky: ['#30506a', '#8aa8b8', '#c0c8c8'], horizon: 0.4, fog: ['#8090a0', 9, 22], breathe: 0.003 });

  // ================================================================ 5. jellyfish drifting in the dark
  Cl.add('oceans', 'jellyfish', (B, R) => {
    for (let k = 0; k < 7; k++) {
      const c = [(R() - 0.5) * 6, (R() - 0.5) * 3, -R() * 4], r = 0.3 + R() * 0.4, col = [[1, 0.4, 0.8], [0.4, 0.8, 1], [0.8, 0.5, 1], [1, 0.7, 0.4]][k % 4];
      B.with([A.rise, 0.015, 0.8], () => {
        B.surf((u, v) => { const a = v * TAU, y = Math.cos(u * PI * 0.5), rr = Math.sin(u * PI * 0.5) * r * (1 + 0.08 * Math.sin(a * 8) * u); return [c[0] + Math.cos(a) * rr, c[1] + y * r * 0.7, c[2] + Math.sin(a) * rr]; }, 1600, { col: (u) => add(col, 0.35 + u * 0.7), lit: false });
        for (let t = 0; t < 26; t++) { const a = (t / 26) * TAU, s = [c[0] + Math.cos(a) * r * 0.9, c[1], c[2] + Math.sin(a) * r * 0.9]; B.trail((q) => [s[0] + Math.sin(q * 9 + t) * 0.06, s[1] - q * (1.4 + (t % 3) * 0.4), s[2] + Math.cos(q * 7 + t) * 0.06], 70, (q) => add(col, (1 - q) * 0.8)); }
        for (let t = 0; t < 4; t++) B.trail((q) => [c[0] + Math.sin(q * 4 + t) * r * 0.25, c[1] - q * 0.9, c[2] + Math.cos(q * 4 + t) * r * 0.25], 160, (q) => add([1, 0.9, 0.95], (1 - q) * 0.9));
      });
    }
    bubbles(B, 150, 8, -3, 6);
    K.sparks(B, [0, 0, -2], 9, 6, 200, [0.4, 0.7, 0.9]);
  }, { cam: { dist: 7, pitch: 0.05, sway: 0.3, target: [0, 0, -1.5] }, sky: DEEP, fog: ['#02101c', 6, 14], breathe: 0.02 });

  // ================================================================ 6. a coral reef with a school of fish
  Cl.add('oceans', 'reef', (B, R) => {
    seabed(B, -2, [0.35, 0.3, 0.22]);
    const cc = [[1, 0.35, 0.4], [1, 0.6, 0.2], [0.85, 0.3, 0.85], [0.3, 0.75, 0.6], [0.95, 0.85, 0.4]];
    for (let i = 0; i < 26; i++) {
      const p = [(R() - 0.5) * 9, -2, -R() * 5], col = cc[Math.floor(R() * cc.length)], kind = R();
      if (kind < 0.4) for (let b = 0; b < 6; b++) { const d = V.norm([(R() - 0.5) * 1.4, 1, (R() - 0.5) * 1.4]); B.cyl(p, V.add(p, V.mul(d, 0.4 + R() * 0.6)), 0.05, 0.03, 220, { col }); }
      else if (kind < 0.7) B.sphere(V.add(p, [0, 0.2, 0]), 0.3 + R() * 0.3, 900, { y0: -0.2, col: (u, v) => add(col, Math.sin(u * 40 + v * 30) > 0 ? 1 : 0.7) });
      else for (let b = 0; b < 30; b++) { const a = R() * TAU, r = R() * 0.3; B.hair([p[0] + Math.cos(a) * r, -1.95, p[2] + Math.sin(a) * r], [0, 0.35 + R() * 0.3, 0], add(col, 0.6), col, [A.sway, 0.6, 1.5]); }
    }
    B.u.swayY = -2;
    // a handful of reef fish circling slowly: big enough to read as fish, not as noise
    const g = B.pivot([0, 0, -2.6], [0, 1, 0], -0.22);
    const kinds = [(u, v, up) => (Math.sin(u * 18) > 0.55 ? [0.95, 0.95, 0.92] : [1, 0.45, 0.1]), (u, v, up) => mix([1, 0.85, 0.15], [0.15, 0.35, 0.9], sm(0.4, 0.6, u)), (u, v, up) => mix([0.35, 0.75, 1], [0.1, 0.2, 0.6], up), (u, v, up) => mix([1, 0.9, 0.2], [0.95, 0.5, 0.1], up)];
    B.with([A.spin, 0, g], () => { for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + R() * 0.3, r = 1.6 + R() * 0.9; K.fish(B, [Math.cos(a) * r, 0.1 + (R() - 0.5) * 0.9, -2.6 + Math.sin(a) * r], -a + PI, 0.5 + R() * 0.2, { n: 900, col: kinds[i % kinds.length] }); } });
    rays(B, 7, 3.5);
    bubbles(B, 80, 6, -2, 5);
  }, { cam: { dist: 7, pitch: 0.12, sway: 0.3, target: [0, -0.8, -2] }, sky: ['#02101c', '#0a3a50', '#041824'], horizon: 0.3, fog: ['#04263a', 6, 15], breathe: 0.01 });

  // ================================================================ 7. a sailboat on a breeze
  Cl.add('oceans', 'sailboat', (B, R) => {
    K.sea(B, 14, 12, -0.3, 20000, [0.05, 0.15, 0.25], { amp: 0.05, glint: [2, 1.2, -14], glintCol: [1, 0.95, 0.8] });
    B.with([A.water, 0.05, 1], () => {
      K.hull(B, [0, -0.2, 0], 0.2, 2.6, 0.75, 0.45, [0.92, 0.92, 0.9], 4000);
      K.sail(B, [0.15, -0.15, 0], 2.8, 1.2, [0.97, 0.96, 0.92], 3000);
      K.sail(B, [0.1, -0.15, 0.02], 2.4, 1.0, [0.95, 0.94, 0.9], 2200, { jib: true });
    });
    K.cloud(B, [-3, 3.5, -12], 5, 1, 2500, [0.9, 0.9, 0.95]); K.cloud(B, [4, 4, -14], 4, 0.8, 2000, [0.9, 0.9, 0.95]);
    for (let i = 0; i < 3; i++) K.bird(B, [-1.5 + R() * 3, 2.4 + R(), -2], 0.15, [0.15, 0.15, 0.18]);
  }, { sea: ['#1c3c5c', '#0a1a2c'], cam: { dist: 6.5, pitch: 0.1, yaw: 0.6, sway: 0.3, target: [0, 1, 0] }, sky: ['#1a4a8a', '#7aa8d8', '#c8dce8'], horizon: 0.45, breathe: 0.003 });

  // ================================================================ 8. a ship in a storm
  Cl.add('oceans', 'storm-ship', (B, R) => {
    K.sea(B, 14, 12, -0.6, 22000, [0.05, 0.07, 0.08], { amp: 0.22, speed: 1.6 });
    for (let i = 0; i < 3000; i++) B.pt([(R() - 0.5) * 20, -0.45 + R() * 0.2, -R() * 14], add([0.8, 0.85, 0.85], 0.4 + R() * 0.4), [A.water, 0.22, 1.6]);
    B.push().rotZ(0.12);
    B.with([A.water, 0.18, 1.4], () => {
      K.hull(B, [0, -0.3, -1], 0.3, 4.5, 1.0, 0.8, [0.2, 0.08, 0.06], 6000);
      B.box([0.6, 0.35, -1], 1.4, 0.7, 0.8, 1500, { col: (f, a, b) => (f === 4 && b > 0.5 && (a * 6) % 1 > 0.3 ? [1, 0.85, 0.4, 1] : [0.85, 0.85, 0.82]) });
      B.cyl([0.5, 0.7, -1], [0.5, 1.4, -1], 0.12, 0.1, 400, { col: [0.75, 0.2, 0.1] });
      K.smoke(B, [0.5, 1.45, -1], 0.15, 1.6, 600, [0.3, 0.3, 0.32]);
    });
    B.pop();
    K.rain(B, 8, 8, -0.6, 6, 2600, { speed: 9, wind: 0.08, col: [0.5, 0.55, 0.6] });
    K.cloud(B, [0, 5, -10], 18, 1.6, 6000, [0.18, 0.2, 0.24], { puffs: 12 });
  }, { sea: ['#12161a', '#06080a'], cam: { dist: 7, pitch: 0.08, sway: 0.3, roll: 0.05, target: [0, 0.6, -1] }, sky: ['#0a0c10', '#1a2028', '#0c0e12'], horizon: 0.42, breathe: 0.004 });

  // ================================================================ 9. light falling through the water
  Cl.add('oceans', 'sunbeams', (B, R) => {
    seabed(B, -2.5, [0.55, 0.5, 0.38]);
    rays(B, 12, 3.6, [0.6, 0.85, 0.9], { len: 6.5, k: 0.85, slant: 0.22 });
    // the underside of the surface: rippling bright caustic lines
    for (let i = 0; i < 14000; i++) { const x = (R() - 0.5) * 18, z = 2 - R() * 12, c = Math.abs(Math.sin(x * 1.7 + Math.sin(z * 1.3) * 1.5) * Math.sin(z * 1.9 + Math.sin(x * 1.1))); B.pt([x, 3.6 + Math.sin(x * 2 + z) * 0.08, z], add([0.45, 0.75, 0.85], 0.15 + Math.pow(c, 3) * 0.9), [A.water, 0.08, 0.8]); }
    for (let i = 0; i < 4; i++) K.fish(B, [(R() - 0.5) * 5, (R() - 0.5) * 2, -2 - R() * 3], R() * TAU, 0.7, { n: 900, col: (u, v, up) => mix([0.9, 0.85, 0.3], [0.2, 0.4, 0.8], up) });
    bubbles(B, 120, 8, -2.5, 6);
  }, { cam: { dist: 6.5, pitch: -0.2, sway: 0.25, target: [0, 0.9, -3], fov: 46 }, sky: ['#0a4a68', '#06304a', '#021420'], horizon: 0.6, fog: ['#0a4058', 7, 16], breathe: 0.008 });

  // ================================================================ 10. an island with palms
  Cl.add('oceans', 'island', (B, R) => {
    K.sea(B, 14, 12, -0.2, 20000, [0.05, 0.35, 0.45], { amp: 0.03 });
    B.terrain(-3, 3, -2.5, 1.5, (x, z) => -0.2 + Math.max(0, 0.6 - (x * x * 0.12 + (z + 0.5) * (z + 0.5) * 0.3)) * 1.2, 9000, { col: (u, v, p) => (p[1] < -0.1 ? [0.9, 0.82, 0.62] : p[1] < 0.15 ? [0.95, 0.88, 0.68] : [0.25, 0.45, 0.15]) });
    for (let i = 0; i < 5; i++) K.palm(B, [(R() - 0.5) * 2.5, 0.2, -0.5 + (R() - 0.5) * 1], 1.6 + R() * 0.8, (R() - 0.5) * 0.6, { an: [A.sway, 0.04, 1.2] });
    B.u.swayY = 0.5;
    for (let i = 0; i < 2500; i++) { const a = R() * TAU, rx = 3.1 + R() * 0.2, rz = 1.9; B.pt([Math.cos(a) * rx, -0.18, -0.5 + Math.sin(a) * rz], add([0.95, 0.97, 1], 0.6 + R() * 0.5), [A.water, 0.03, 1]); }
    K.cloud(B, [-4, 3.2, -10], 4, 0.8, 2000, [0.95, 0.95, 1]);
  }, { sea: ['#1a6070', '#0a3440'], cam: { dist: 7.5, pitch: 0.18, sway: 0.3, target: [0, 0.6, -0.6] }, sky: ['#1a5aa8', '#6aa8e0', '#b8e0f0'], horizon: 0.4, breathe: 0.003 });

  // ================================================================ 11. an iceberg
  Cl.add('oceans', 'iceberg', (B, R) => {
    const N = B.N;
    K.sea(B, 14, 12, 0, 18000, [0.02, 0.06, 0.1], { amp: 0.03 });
    const berg = (sgn, k) => B.surf((u, v) => { const a = v * TAU, y = u, r = (1.6 - u * 1.2) * (1 + N.fbm(Math.cos(a) * 2, u * 3, Math.sin(a) * 2, 3) * 0.7); return [Math.cos(a) * r, sgn * y * (sgn > 0 ? 2.4 : 4) + (1 - Math.abs(Math.sin(a * 3))) * 0.2 * sgn, Math.sin(a) * r * 0.8 - 1]; }, k, { col: (u) => (sgn > 0 ? mix([0.75, 0.88, 0.98], [0.95, 0.98, 1], u) : add([0.2, 0.55, 0.65], 0.5 * (1 - u * 0.8))) });
    berg(1, 14000);
    berg(-1, 7000);
    K.stars(B, 400, 30, { half: true, k: 0.4 });
  }, { sea: ['#0c1a2a', '#040a12'], cam: { dist: 8, pitch: 0.02, sway: 0.3, target: [0, 0.4, -1] }, sky: ['#2a3a5a', '#6a8098', '#a8b8c8'], horizon: 0.5, breathe: 0.002 });

  // ================================================================ 12. dolphins leaping
  Cl.add('oceans', 'dolphins', (B, R) => {
    K.sea(B, 14, 12, -0.3, 20000, [0.05, 0.25, 0.4], { amp: 0.05 });
    for (let k = 0; k < 3; k++) {
      const x = -2 + k * 1.8, z = -1 - k * 0.8, ph = k * 0.7;
      const arc = (t) => [x - 1 + t * 2, -0.3 + Math.sin(t * PI) * (1.3 - k * 0.2), z];
      const t0 = 0.3 + ph * 0.2, p = arc(t0), q = arc(t0 + 0.05), ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      K.fish(B, p, 0, 1.4 - k * 0.15, { pitch: ang + 0.2, h: 0.15, w: 0.13, n: 3000, tail: 0.2, tailH: 1.1, dorsal: 0.8, col: (u, v, up) => mix([0.85, 0.88, 0.9], [0.35, 0.42, 0.5], sm(0.35, 0.6, up)), finCol: [0.35, 0.42, 0.5] });
      for (let i = 0; i < 600; i++) { const t = R() * 0.3; B.pt(V.add(arc(t), [(R() - 0.5) * 0.15, (R() - 0.5) * 0.15, (R() - 0.5) * 0.15]), add([0.9, 0.95, 1], 0.7), [A.rise, 0.5 + R() * 0.4, -0.4]); }
    }
  }, { sea: ['#164468', '#082038'], cam: { dist: 7, pitch: 0.06, sway: 0.25, target: [0, 0.4, -1.5] }, sky: ['#2a6aa8', '#7ab0d8', '#d0e4f0'], horizon: 0.42, breathe: 0.003 });

  // ================================================================ 13. an anglerfish in the deep
  Cl.add('oceans', 'anglerfish', (B, R) => {
    K.fish(B, [0, 0, 0], 0.3, 2.4, { h: 0.42, w: 0.32, n: 7000, prof: (u) => Math.pow(Math.sin(PI * Math.pow(u, 0.45)), 0.8) * (1 - 0.45 * u), col: (u, v, up) => add([0.34, 0.22, 0.27], (0.55 + 0.25 * Math.sin(u * 40)) * (0.6 + 0.6 * up)), finCol: [0.22, 0.15, 0.18], dorsal: 0.4 });
    B.push().rotY(0.3);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * PI - PI / 2; B.cyl([1.05, -0.05 + Math.sin(a) * 0.35, Math.cos(a) * 0.3], [1.2, -0.05 + Math.sin(a) * 0.3, Math.cos(a) * 0.25], 0.015, 0.002, 30, { col: [0.95, 0.95, 0.9] }); }
    B.trail((t) => [0.6 + t * 0.9, 0.42 + Math.sin(t * PI) * 0.6, 0], 400, [0.3, 0.25, 0.25]);
    B.blob([1.5, 0.45, 0], 0.08, 400, { col: () => [1.4, 1.5, 1] });
    B.pop();
    B.blob([1.4, 0.45, 0.4], 0.9, 1500, { col: (p, d) => add([0.3, 0.9, 1], 0.4 * Math.exp(-V.len(d) * 2)) });
    K.sparks(B, [0, 0, -2], 10, 6, 260, [0.3, 0.6, 0.9]);
  }, { cam: { dist: 5.2, pitch: 0.05, sway: 0.3, target: [0.4, 0.1, 0] }, sky: ['#000204', '#010608', '#000204'], breathe: 0.01 });

  // ================================================================ 14. surf on a beach
  Cl.add('oceans', 'shoreline', (B, R) => {
    const N = B.N;
    B.terrain(-9, 9, -1, 4, (x, z) => -0.6 + z * 0.12 + N.fbm(x * 0.5, 0, z * 0.5, 3) * 0.05, 10000, { col: (u, v, p) => (p[2] < 0.6 ? [0.55, 0.48, 0.38] : [0.85, 0.78, 0.6]) });
    K.sea(B, 14, 6, -0.62, 14000, [0.05, 0.3, 0.38], { amp: 0.035 });
    for (let k = 0; k < 4; k++) { const z = 0.3 - k * 1.5; for (let i = 0; i < 2200; i++) { const x = (R() - 0.5) * 18; B.pt([x, -0.55 + R() * 0.05, z + Math.sin(x * 0.7 + k) * 0.2 + (R() - 0.5) * 0.15], add([0.95, 0.97, 1], 0.6 + R() * 0.5), [A.water, 0.04, 1.2]); } }
    for (const x of [-4.6, 4.2]) K.palm(B, [x, -0.45, 1.2], 2.2, x > 0 ? 0.35 : -0.35);
  }, { cam: { dist: 6.5, pitch: 0.3, sway: 0.25, yaw: 0.2, target: [0, -0.2, 0] }, sky: ['#2a7ac0', '#7ac0e8', '#d8f0f8'], horizon: 0.4, breathe: 0.002 });

  // ================================================================ 15. inside the curl of a wave
  Cl.add('oceans', 'barrel', (B, R) => {
    // we ride inside the tube: the wall streams past, the open end glows ahead
    B.u.wrapZ = [-15, 11];
    for (let i = 0; i < 34000; i++) {
      const z = -15 + R() * 11, a = Math.pow(R(), 0.85) * PI * 1.35, r = 1.8 + Math.sin(a * 2) * 0.1 + (R() - 0.5) * 0.06;
      const p = [Math.cos(a + 0.2) * r * 1.1, -0.6 + Math.sin(a + 0.2) * r, z];
      const lip = a > PI * 1.15, depth = clamp((-z - 4) / 11, 0, 1);
      const c = lip ? add([0.85, 0.95, 1], 0.8 + R() * 0.4) : add(mix([0.02, 0.22, 0.28], [0.15, 0.6, 0.62], Math.pow(a / (PI * 1.35), 1.3)), (0.55 + R() * 0.45) * (1 - depth * 0.35));
      B.pt(p, c, [A.travelZ, 3]);
    }
    // streaks of foam running along the wall
    for (let k = 0; k < 40; k++) { const a = R() * PI * 1.2, z0 = -15 + R() * 9; B.trail((t) => { const r = 1.78; return [Math.cos(a + 0.2) * r * 1.1, -0.6 + Math.sin(a + 0.2) * r, z0 + t * 1.6]; }, 60, add([0.8, 0.95, 1], 0.7), { an: [A.travelZ, 3] }); }
    for (let i = 0; i < 3000; i++) B.pt([(R() - 0.5) * 1.5, -0.6 + R() * 0.3, -15 + R() * 11], add([0.9, 0.97, 1], 0.5), [A.travelZ, 3]);
    B.blob([0, 0.2, -15], 0.7, 1800, { col: (p, d) => add([1, 0.95, 0.82], 0.6 + 0.6 * Math.exp(-V.len(d) * 3)) });
  }, { cam: { dist: 3, pitch: 0.02, sway: 0.06, bob: 0.03, target: [0.2, 0.3, -8], fov: 62 }, sky: ['#0a3040', '#1a5a6a', '#2a7080'], skyK: 0.35, glow: [0.5, 0.52, 0.12, '#a0d0d0'], breathe: 0.004 });

  // ================================================================ 16. a manta ray gliding
  Cl.add('oceans', 'manta', (B, R) => {
    seabed(B, -2.6, [0.45, 0.42, 0.32]);
    B.with([A.sway, 0.0, 0], () => {
      B.surf((u, v) => { const x = (u - 0.5) * 4.2, w = 1 - Math.pow(Math.abs(u - 0.5) * 2, 1.6), z = (v - 0.5) * 1.5 * w - Math.abs(u - 0.5) * 0.6, y = Math.sin(Math.abs(u - 0.5) * 6) * 0.25 * Math.abs(u - 0.5) * 2 + (0.5 - Math.abs(v - 0.5)) * 0.12 * w; return [x, 0.4 + y, z]; }, 9000, { col: (u, v, p, n) => (n[1] < 0 ? mix([0.16, 0.18, 0.22], [0.3, 0.32, 0.38], v) : [0.85, 0.85, 0.85]) });
      B.trail((t) => [0, 0.42, 0.6 + t * 2.2], 300, [0.12, 0.13, 0.15]);
      for (const s of [-1, 1]) B.cyl([s * 0.25, 0.42, -0.75], [s * 0.3, 0.4, -1.05], 0.06, 0.03, 120, { col: [0.12, 0.13, 0.15] });
    });
    rays(B, 10, 4);
    for (let i = 0; i < 12; i++) K.fish(B, [(R() - 0.5) * 3, 0.1 + R() * 0.4, (R() - 0.5) * 2], PI / 2, 0.25, { n: 150, col: () => [0.85, 0.85, 0.5], dorsal: false, eye: false });
  }, { cam: { dist: 5, pitch: 0.3, sway: 0.3, target: [0, 0.1, 0] }, sky: ['#04263a', '#0a4a64', '#02121c'], horizon: 0.55, fog: ['#063a50', 6, 14], breathe: 0.012 });

  // ================================================================ 17. a sea turtle
  Cl.add('oceans', 'turtle', (B, R) => {
    seabed(B, -2.4, [0.5, 0.45, 0.33]);
    B.ellip([0, 0, 0], 1.0, 0.36, 0.78, 7000, { col: (u, v, p, n) => (n[1] > 0 ? (Math.sin(p[0] * 9) * Math.sin(p[2] * 9) > 0.15 ? [0.4, 0.3, 0.15] : [0.55, 0.42, 0.22]) : [0.85, 0.8, 0.6]) });
    B.ellip([1.15, 0.05, 0], 0.32, 0.2, 0.22, 1200, { col: [0.55, 0.5, 0.35] });
    for (const s of [-1, 1]) {
      B.push().move(0.45, -0.05, s * 0.65).rotY(s * 0.6); B.petal({ L: 1.0, W: 0.28, az: s > 0 ? PI / 2 : -PI / 2, open0: 1.5, open: 0.3, curl: 0.3, n: 900, col: () => [0.55, 0.5, 0.35], an: [A.sway, 0.2, 1] }); B.pop();
      B.push().move(-0.8, -0.05, s * 0.5); B.petal({ L: 0.45, W: 0.2, az: s > 0 ? PI / 2 : -PI / 2, open0: 1.5, open: 0.4, n: 300, col: () => [0.55, 0.5, 0.35] }); B.pop();
    }
    rays(B, 9, 4);
    for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 8; B.cyl([x, -2.4, -2 - R() * 4], [x + (R() - 0.5) * 0.4, -2.4 + 1 + R() * 2, -2 - R() * 4], 0.03, 0.01, 200, { col: [0.2, 0.5, 0.2], an: [A.sway, 0.15, 1.2] }); }
    B.u.swayY = -2.4;
  }, { cam: { dist: 6.0, pitch: 0.3, sway: 0.3, yaw: 0.5, target: [0.2, -0.2, 0] }, sky: ['#063a52', '#0a5a7a', '#02141c'], horizon: 0.55, fog: ['#064a64', 6, 14], breathe: 0.012 });

  // ================================================================ 18. a kelp forest
  Cl.add('oceans', 'kelp', (B, R) => {
    seabed(B, -3, [0.3, 0.28, 0.2]);
    B.u.swayY = -3;
    for (let k = 0; k < 30; k++) {
      const x = (R() - 0.5) * 10, z = -R() * 7, h = 4 + R() * 3;
      B.with([A.sway, 0.025, 0.6 + R() * 0.3], () => {
        B.trail((t) => [x + Math.sin(t * 3 + k) * 0.15, -3 + t * h, z], Math.round(250 * h), [0.35, 0.3, 0.1]);
        for (let i = 0; i < 18; i++) { const t = 0.1 + R() * 0.9, p = [x + Math.sin(t * 3 + k) * 0.15, -3 + t * h, z]; B.push().aim([R() - 0.5, 0.8, R() - 0.5], p).petal({ L: 0.5, W: 0.12, az: R() * TAU, open0: 0.6, open: 0.4, ruf: 0.3, fr: 30, n: 90, col: () => mix([0.4, 0.38, 0.1], [0.6, 0.55, 0.2], B.R()) }) && B.pop(); }
      });
    }
    rays(B, 10, 4, [0.6, 0.85, 0.6]);
    for (let i = 0; i < 20; i++) K.fish(B, [(R() - 0.5) * 6, (R() - 0.5) * 3, -R() * 5], R() * TAU, 0.2, { n: 100, col: () => [0.85, 0.6, 0.2], dorsal: false, eye: false });
  }, { cam: { dist: 6.2, pitch: 0.05, sway: 0.3, target: [0, 0, -2.5] }, sky: ['#0a3a2a', '#1a5a40', '#04140c'], horizon: 0.6, fog: ['#0a3424', 5, 13], breathe: 0.01 });

  // ================================================================ 19. a pier at dusk
  Cl.add('oceans', 'pier', (B, R) => {
    K.sea(B, 14, 12, -0.5, 18000, [0.12, 0.08, 0.14], { amp: 0.03, glint: [0, 1.2, -14], glintCol: [1, 0.6, 0.4] });
    for (let i = 0; i < 9000; i++) { const z = 2 - R() * 12, x = (R() - 0.5) * 1.2; B.pt([x, 0.1, z], add([0.35, 0.25, 0.18], 0.6 + R() * 0.4 * (Math.sin(z * 25) > 0.6 ? 0.3 : 1))); }
    for (let z = 2; z > -10; z -= 0.9) for (const x of [-0.55, 0.55]) { B.cyl([x, -0.6, z], [x, 0.6, z], 0.04, 0.04, 120, { col: [0.25, 0.18, 0.12] }); }
    B.trail((t) => [-0.58, 0.55, 2 - t * 12], 1200, [0.3, 0.22, 0.16]); B.trail((t) => [0.58, 0.55, 2 - t * 12], 1200, [0.3, 0.22, 0.16]);
    for (let k = 0; k < 3; k++) { const z = -4.4 - k * 2.6; B.cyl([0.58, 0.1, z], [0.58, 1.3, z], 0.02, 0.02, 60, { col: [0.2, 0.2, 0.2] }); B.blob([0.58, 1.33, z], 0.04, 40, { col: () => [1.3, 1, 0.6] }); }
    for (let i = 0; i < 4; i++) K.bird(B, [-1 + R() * 2, 2 + R(), -5 - R() * 3], 0.18, [0.05, 0.04, 0.06]);
  }, { sea: ['#2a1428', '#0e060e'], cam: { dist: 3.8, pitch: 0.1, sway: 0.12, target: [0, 0.6, -4], fov: 50 }, sky: ['#201040', '#a04a70', '#ff9a60'], horizon: 0.42, glow: [0.5, 0, 0.11, '#ffb070', 0.03], breathe: 0.002 });

  // ================================================================ 20. glowing waves on a night shore
  Cl.add('oceans', 'glow-tide', (B, R) => {
    const N = B.N;
    B.terrain(-9, 9, -1, 4, (x, z) => -0.6 + z * 0.1 + N.fbm(x * 0.5, 0, z * 0.5, 3) * 0.05, 9000, { col: [0.06, 0.06, 0.07] });
    K.sea(B, 14, 8, -0.62, 14000, [0.01, 0.02, 0.04], { amp: 0.04 });
    for (let k = 0; k < 5; k++) { const z = 0.4 - k * 1.3; for (let i = 0; i < 2600; i++) { const x = (R() - 0.5) * 18; B.pt([x, -0.56 + R() * 0.06, z + Math.sin(x * 0.6 + k * 2) * 0.25 + (R() - 0.5) * 0.12], add([0.2, 0.95, 1], 0.5 + R() * 0.9 - k * 0.12), [A.water, 0.04, 1.1]); } }
    K.stars(B, 2000, 30, { half: true });
  }, { sea: ['#04060c', '#020306'], cam: { dist: 6.5, pitch: 0.2, sway: 0.25, target: [0, -0.2, -0.8] }, sky: ['#010208', '#040a18', '#010206'], horizon: 0.42, breathe: 0.002 });
})();
