/* Oley · ASCII designs: space. Planets, galaxies, a black hole, nebulae, stations, comets and more. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A, K = Cl.K;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, sm = Cl.smooth, clamp = Cl.clamp, add = K.add;
  const DARK = ['#000000', '#01010a', '#000000'];

  // banded gas giant texture
  const bands = (B, cols, o) => (d) => {
    o = o || {};
    const N = B.N, lat = d[1] + N.fbm(d[0] * 3, d[1] * 6, d[2] * 3, 3) * (o.swirl || 0.08);
    const k = 0.5 + 0.5 * Math.sin(lat * (o.f || 16) + Math.sin(lat * 5) * 2);
    let c = mix(cols[0], cols[1], k);
    c = mix(c, cols[2], sm(0.5, 0.9, Math.abs(Math.sin(lat * 7.3))) * 0.4);
    if (o.spot) { const dx = d[0] - o.spot[0], dy = d[1] - o.spot[1], dz = d[2] - o.spot[2]; const q = dx * dx * 0.6 + dy * dy * 4 + dz * dz * 0.6; if (q < 0.02) c = mix(c, [0.75, 0.3, 0.15], 1 - q / 0.02); }
    return c;
  };
  const earthTex = (B) => (d) => {
    const N = B.N, h = N.fbm(d[0] * 1.7 + 3, d[1] * 1.7, d[2] * 1.7, 5);
    if (Math.abs(d[1]) > 0.86 + h * 0.2) return [0.92, 0.95, 1];
    if (h > 0.04) return mix([0.18, 0.35, 0.12], [0.55, 0.45, 0.28], clamp((h - 0.04) * 5 + Math.abs(d[1]) * 0.3, 0, 1));
    return mix([0.02, 0.08, 0.25], [0.05, 0.25, 0.45], clamp(h + 0.4, 0, 1));
  };
  const earth = (B, c, r, n, o) => {
    o = o || {};
    const R = B.R, N = B.N;
    K.planet(B, c, r, n, earthTex(B), { atmo: [0.35, 0.6, 1] });
    for (let i = 0; i < n * 0.35; i++) {
      const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s];
      const cl = N.fbm(d[0] * 3 + 9, d[1] * 5, d[2] * 3, 4);
      if (cl < 0.08) continue;
      const lit = Math.max(0, V.dot(d, B.light));
      B.pt(V.add(c, V.mul(d, r * 1.012)), add([0.95, 0.96, 1], 0.12 + 0.9 * lit));
    }
    if (o.lights !== false) for (let i = 0; i < n * 0.25; i++) {
      const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s];
      if (V.dot(d, B.light) > -0.05 || N.fbm(d[0] * 1.7 + 3, d[1] * 1.7, d[2] * 1.7, 5) < 0.06 || R() < 0.6) continue;
      B.pt(V.add(c, V.mul(d, r * 1.004)), add([1, 0.75, 0.35], 0.5 + R() * 0.7), [A.twinkle, 0.5 + R()]);
    }
  };

  // ================================================================ 1. a ringed planet
  Cl.add('space', 'ringed-planet', (B, R) => {
    B.light = V.norm([-0.7, 0.35, 0.6]);
    K.planet(B, [0, 0, 0], 1.25, 14000, bands(B, [[0.85, 0.72, 0.5], [0.65, 0.5, 0.35], [0.95, 0.88, 0.7]], { f: 14 }));
    K.rings(B, [0, 0, 0], 1.6, 2.7, 16000, [0.85, 0.78, 0.62], [0.15, 1, 0.35]);
    K.moon(B, [-2.8, 0.9, -1.5], 0.18, 800);
    K.moon(B, [2.4, -1.1, 0.8], 0.12, 500);
    K.stars(B, 1800, 40);
  }, { cam: { dist: 7, pitch: 0.22, sway: 0.35, yaw: -0.3 }, sky: DARK, breathe: 0.003 });

  // ================================================================ 2. a spiral galaxy, turning
  Cl.add('space', 'galaxy', (B, R) => {
    const g = B.pivot([0, 0, 0], [0, 1, 0], 0.06);
    B.with([A.spin, 0, g], () => {
      const arms = 2 + (R() < 0.5 ? 0 : 2);
      for (let i = 0; i < 26000; i++) {
        const k = i % arms, t = Math.pow(R(), 0.8), r = 0.15 + 3.6 * t, a = (k * TAU) / arms + Math.log(r + 0.2) * 2.4;
        const j = (R() + R() + R() - 1.5) * 0.32 * (0.4 + r * 0.25);
        const p = [Math.cos(a) * r + j * Math.sin(a), (R() - 0.5) * 0.12 * (1.2 - t), Math.sin(a) * r - j * Math.cos(a)];
        let c = mix([1, 0.85, 0.6], [0.65, 0.78, 1], sm(0.1, 0.6, t));
        if (R() < 0.02 && t > 0.2) c = [1, 0.4, 0.6];
        B.pt(p, add(c, (0.35 + Math.pow(R(), 4) * 1.2) * (1.3 - t * 0.6)));
      }
      B.blob([0, 0, 0], 0.32, 5000, { sq: [1, 0.45, 1], col: (p, d) => add([1, 0.88, 0.65], 1.4 - V.len(d) * 2) });
      for (let i = 0; i < 2500; i++) { const r = Math.sqrt(R()) * 4.2, a = R() * TAU; B.pt([Math.cos(a) * r, (R() - 0.5) * 0.4, Math.sin(a) * r], add([0.6, 0.65, 0.8], 0.15 + R() * 0.2)); }
    });
    K.stars(B, 1200, 40);
  }, { cam: { dist: 7.5, pitch: 0.55, sway: 0.25 }, sky: DARK, breathe: 0.002 });

  // ================================================================ 3. a black hole with its accretion disc
  Cl.add('space', 'black-hole', (B, R) => {
    const g = B.pivot([0, 0, 0], [0.05, 1, 0.1], 0.35);
    const disc = (r) => { const q = (r - 0.75) / 2; return mix([1, 0.95, 0.85], mix([1, 0.55, 0.15], [0.6, 0.12, 0.05], sm(0.3, 1, q)), sm(0, 0.35, q)); };
    B.with([A.spin, 0, g], () => {
      for (let i = 0; i < 26000; i++) {
        const r = 0.75 + Math.pow(R(), 1.6) * 2.2, a = R() * TAU, b = 0.6 + 0.4 * Math.sin(r * 18 + Math.sin(a * 3) * 0.5);
        B.pt([Math.cos(a) * r, (R() - 0.5) * 0.02 * r, Math.sin(a) * r], add(disc(r), b * (1.6 - (r - 0.75) * 0.45)));
      }
    });
    // the far side of the disc, bent up over the hole by its gravity
    B.push().rotX(PI / 2);
    for (let i = 0; i < 9000; i++) {
      const r = 0.62 + Math.pow(R(), 1.8) * 0.9, a = R() * TAU;
      B.pt([Math.cos(a) * r, Math.sin(a) * r * 0.92, -0.3], add(disc(0.75 + (r - 0.62) * 1.6), 0.9 * (1.2 - (r - 0.62))));
    }
    B.pop();
    // the hole itself (black points hide whatever is behind) and its photon ring
    B.sphere([0, 0, 0], 0.55, 6000, { col: [0, 0, 0], lit: false });
    for (let i = 0; i < 2600; i++) { const a = R() * TAU, r = 0.58 + R() * 0.02; B.pt([Math.cos(a) * r, Math.sin(a) * r, 0.05], [1.4, 1.2, 1]); }
    K.stars(B, 2000, 40);
  }, { cam: { dist: 6.4, pitch: 0.1, sway: 0.18 }, sky: DARK, breathe: 0.002 });

  // ================================================================ 4. a nebula with pillars
  Cl.add('space', 'nebula', (B, R) => {
    const cols = [[0.9, 0.2, 0.55], [0.15, 0.7, 0.75], [1, 0.55, 0.2], [0.45, 0.3, 0.95]];
    for (let i = 0; i < 9; i++) {
      const c = [(R() - 0.5) * 5, (R() - 0.5) * 2.6, (R() - 0.5) * 2 - 1], col = cols[i % cols.length];
      B.blob(c, 0.6 + R() * 0.7, 3200, { sq: [1.4, 0.8, 0.8], col: (p, d) => add(col, 0.25 + 0.5 * Math.exp(-V.len(d) * 1.4) + Math.pow(R(), 6)) });
    }
    // dust pillars, lit along their edges
    for (let i = 0; i < 3; i++) {
      const x = -1.4 + i * 1.3, h = 1.4 + R() * 1.2;
      B.surf((u, v) => { const a = v * TAU, r = (0.35 - u * 0.22) * (1 + B.N.fbm(Math.cos(a) * 2, u * 6 + i, Math.sin(a) * 2, 3) * 0.7); return [x + Math.cos(a) * r + u * 0.2, -1.8 + u * h, Math.sin(a) * r]; }, 4500, { col: (u, v, p, n) => mix([0.08, 0.04, 0.03], [1, 0.75, 0.5], Math.pow(Math.max(0, V.dot(n, [0.3, 0.8, 0.5])), 3) * 0.8) });
    }
    K.stars(B, 1600, 30);
    K.sparks(B, [0, 0, -1], 6, 3, 80, [1, 1, 1]);
  }, { cam: { dist: 6.5, pitch: 0.05, sway: 0.3 }, sky: DARK, breathe: 0.01 });

  // ================================================================ 5. the Earth and the Moon
  Cl.add('space', 'earth-moon', (B, R) => {
    B.light = V.norm([-0.8, 0.25, 0.55]);
    earth(B, [0.4, -0.2, 0], 1.6, 16000);
    K.moon(B, [-2.6, 1.0, -2.2], 0.42, 2600);
    K.stars(B, 1800, 40);
  }, { cam: { dist: 6.8, pitch: 0.1, sway: 0.3, target: [-0.3, 0, 0] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 6. the solar system, orbiting
  Cl.add('space', 'solar-system', (B, R) => {
    B.light = [0, 1, 0];
    B.sphere([0, 0, 0], 0.5, 6000, { col: () => add([1, 0.7, 0.2], 1.2 + R() * 0.5), lit: false, an: [A.twinkle, 3] });
    B.blob([0, 0, 0], 0.55, 1500, { col: () => [1, 0.55, 0.1] });
    const P = [{ r: 0.9, s: 0.06, c: [0.7, 0.6, 0.5] }, { r: 1.3, s: 0.1, c: [0.95, 0.75, 0.4] }, { r: 1.8, s: 0.11, c: [0.25, 0.45, 0.9] }, { r: 2.3, s: 0.08, c: [0.85, 0.35, 0.2] }, { r: 3.0, s: 0.24, c: [0.85, 0.7, 0.5] }, { r: 3.8, s: 0.19, c: [0.9, 0.82, 0.55], ring: 1 }, { r: 4.5, s: 0.14, c: [0.55, 0.8, 0.9] }];
    P.forEach((p, i) => {
      for (let k = 0; k < 900; k++) { const a = R() * TAU; B.pt([Math.cos(a) * p.r, 0, Math.sin(a) * p.r], [0.18, 0.2, 0.28]); }
      const a0 = R() * TAU, c = [Math.cos(a0) * p.r, 0, Math.sin(a0) * p.r];
      const g = B.pivot([0, 0, 0], [0, 1, 0], 0.5 / Math.pow(p.r, 1.5));
      B.with([A.spin, 0, Math.min(7, g)], () => {
        B.sphere(c, p.s, Math.round(300 + 2500 * p.s), { col: (u) => mix(p.c, add(p.c, 0.6), 0.5 + 0.5 * Math.sin(u * 30)), two: false });
        if (p.ring) K.rings(B, c, p.s * 1.4, p.s * 2.2, 1000, [0.8, 0.75, 0.6], [0.2, 1, 0.3]);
      });
    });
    K.stars(B, 1500, 40);
  }, { cam: { dist: 8.5, pitch: 0.55, sway: 0.25 }, sky: DARK, breathe: 0.002 });

  // ================================================================ 7. a comet
  Cl.add('space', 'comet', (B, R) => {
    const head = [1.6, 0.6, 0], away = V.norm([-1, -0.25, -0.2]);
    K.rock(B, head, 0.12, 900, [0.5, 0.5, 0.55]);
    B.blob(head, 0.28, 3500, { col: (p, d) => add([0.75, 0.9, 1], 1.3 - V.len(d) * 3) });
    for (let i = 0; i < 9000; i++) {
      const t = Math.pow(R(), 1.4), spread = 0.05 + t * 0.9, q = V.add(head, V.mul(away, t * 5.5));
      B.pt([q[0] + (R() - 0.5) * spread, q[1] + (R() - 0.5) * spread * 0.6, q[2] + (R() - 0.5) * spread], add(mix([0.85, 0.95, 1], [0.4, 0.6, 1], t), (1 - t) * 1.2 + 0.1));
    }
    for (let i = 0; i < 500; i++) { const t = R(), q = V.add(head, V.mul(away, t * 4.5)); B.hair(q, V.mul(V.norm([away[0], away[1] + 0.2, away[2]]), 0.3 + t), [0.9, 0.8, 0.6], [1, 0.9, 0.7]); }
    K.stars(B, 2200, 40);
  }, { cam: { dist: 7.5, pitch: 0.12, sway: 0.25, target: [-0.6, 0, 0] }, sky: DARK, breathe: 0.004 });

  // ================================================================ 8. an asteroid belt round a planet
  Cl.add('space', 'asteroids', (B, R) => {
    B.light = V.norm([-0.8, 0.4, 0.4]);
    K.planet(B, [0.6, -0.3, -4], 2.6, 14000, bands(B, [[0.7, 0.4, 0.3], [0.85, 0.6, 0.4], [0.95, 0.85, 0.7]], { f: 22, swirl: 0.15 }));
    const g = B.pivot([0.6, -0.3, -4], [0, 1, 0.15], 0.08);
    B.with([A.spin, 0, g], () => { for (let i = 0; i < 70; i++) { const a = R() * TAU, r = 4.2 + R() * 1.4; K.rock(B, [0.6 + Math.cos(a) * r, -0.3 + (R() - 0.5) * 0.3, -4 + Math.sin(a) * r], 0.04 + Math.pow(R(), 3) * 0.25, 260, [0.4, 0.37, 0.34]); } });
    K.stars(B, 1800, 40);
  }, { cam: { dist: 8, pitch: 0.15, sway: 0.3, target: [0, 0, -1.5] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 9. a globular star cluster
  Cl.add('space', 'star-cluster', (B, R) => {
    for (let i = 0; i < 16000; i++) {
      const r = Math.pow(R(), 2.2) * 2.6, y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y);
      const c = R() < 0.15 ? [1, 0.6, 0.35] : R() < 0.3 ? [0.7, 0.8, 1] : [1, 0.95, 0.85];
      B.pt([Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], add(c, (0.4 + Math.pow(R(), 6) * 2) * (1.4 - r * 0.35)), [A.twinkle, 1 + R() * 3]);
    }
    K.stars(B, 2000, 40);
  }, { cam: { dist: 7, pitch: 0.2, sway: 0.4, spin: 0.02 }, sky: DARK, breathe: 0.003 });

  // ================================================================ 10. a turning space station over the Earth
  Cl.add('space', 'station', (B, R) => {
    B.light = V.norm([-0.6, 0.5, 0.6]);
    earth(B, [0, -9.6, -3], 8, 26000, { lights: false });
    const g = B.pivot([0, 0.6, 0], [0, 0.2, 1], 0.12);
    B.with([A.spin, 0, g], () => {
      B.push().move(0, 0.6, 0).rotX(PI / 2 + 0.2);
      B.torus([0, 0, 0], 1.5, 0.16, 9000, { col: (u, v) => (Math.sin(u * TAU * 24) > 0.85 ? [0.95, 0.85, 0.5, 1] : [0.75, 0.76, 0.8]) });
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; B.cyl([0, 0, 0], [Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5], 0.04, 0.04, 500, { col: [0.6, 0.6, 0.65] }); }
      B.cyl([0, -0.5, 0], [0, 0.5, 0], 0.2, 0.2, 1500, { col: [0.8, 0.8, 0.82] });
      B.pop();
    });
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
      const x0 = sx * (0.45 + k * 0.85);
      B.quad([x0, 0.55, -0.25], [sx * 0.75, 0, 0], [0, 0.1, 0.5], 1600, { col: (u, v) => ((u * 8) % 1 < 0.08 || (v * 4) % 1 < 0.1 ? [0.55, 0.5, 0.35] : [0.12, 0.18, 0.4]), two: true });
    }
    K.stars(B, 1600, 40);
  }, { cam: { dist: 6.5, pitch: 0.2, sway: 0.35, target: [0, 0.3, 0] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 11. a rocket lifting off at night
  Cl.add('space', 'launch', (B, R) => {
    B.light = V.norm([0.6, 0.3, 0.8]);
    const rx = 0, by = -0.3;
    B.cyl([rx, by, 0], [rx, by + 2.4, 0], 0.22, 0.22, 4500, { col: (u, v) => (Math.abs(u - 0.7) < 0.03 ? [0.1, 0.1, 0.12] : [0.92, 0.92, 0.9]) });
    B.cyl([rx, by + 2.4, 0], [rx, by + 3.1, 0], 0.22, 0.01, 1200, { col: [0.92, 0.92, 0.9] });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.5; B.quad([rx + Math.cos(a) * 0.2, by, Math.sin(a) * 0.2], [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], [0, 0.5, 0], 300, { col: [0.75, 0.1, 0.1] }); }
    // gantry
    for (let k = 0; k < 4; k++) { const x = 1.0 + (k % 2) * 0.35, z = -0.15 + (k > 1 ? 0.35 : 0); B.cyl([x, -2.2, z], [x, 2.6, z], 0.025, 0.025, 500, { col: [0.6, 0.25, 0.15] }); }
    for (let y = -2.2; y < 2.6; y += 0.3) { B.line([1.0, y, -0.15], [1.35, y + 0.3, 0.2], [0.6, 0.25, 0.15]); B.line([1.35, y, -0.15], [1.0, y + 0.3, 0.2], [0.6, 0.25, 0.15]); }
    // flame downward and billowing smoke
    for (let i = 0; i < 5000; i++) { const a = R() * TAU, r = 0.2 * Math.sqrt(R()); B.pt([rx + Math.cos(a) * r, by - 0.05, Math.sin(a) * r], add(mix([1, 0.95, 0.7], [1, 0.4, 0.05], R()), 1.4), [A.rise, 1.5 + R(), -1.8 - R()]); }
    for (let i = 0; i < 7000; i++) { const a = R() * TAU, r = 0.3 + R() * 2.6; B.pt([Math.cos(a) * r, -2.2 + R() * 0.3, Math.sin(a) * r * 0.6], add([0.75, 0.7, 0.65], 0.4 + R() * 0.5 * (1 - r / 3)), [A.rise, 0.05 + R() * 0.1, 0.9]); }
    B.quad([-5, -2.25, -3], [10, 0, 0], [0, 0, 6], 3000, { col: [0.12, 0.12, 0.13] });
    K.stars(B, 1800, 40, { half: true });
  }, { cam: { dist: 8.5, pitch: 0.05, sway: 0.25, target: [0.2, 0.2, 0] }, sky: ['#02030a', '#0a0c1a', '#2a1a10'], horizon: 0.2, breathe: 0.004 });

  // ================================================================ 12. earthrise over the moon
  Cl.add('space', 'earthrise', (B, R) => {
    B.light = V.norm([-0.9, 0.3, 0.4]);
    const N = B.N;
    B.terrain(-7, 7, -6, 3, (x, z) => -1.2 + N.fbm(x * 0.5, 2, z * 0.5, 5) * 0.6 - Math.max(0, 0.25 - Math.pow(N.n3(x * 1.4, 0, z * 1.4) + 0.3, 2)) * 0.8, 24000, { col: (u, v, p) => add([0.62, 0.61, 0.6], 0.7 + N.fbm(p[0] * 4, 1, p[2] * 4, 3) * 0.6) });
    earth(B, [1.5, 1.4, -14], 2.3, 14000, { lights: false });
    // a lander
    B.box([-0.8, -0.75, 0], 0.4, 0.3, 0.4, 900, { col: [0.85, 0.7, 0.2] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.cyl([-0.8 + sx * 0.18, -0.75, sz * 0.18], [-0.8 + sx * 0.38, -1.15, sz * 0.38], 0.015, 0.015, 120, { col: [0.7, 0.7, 0.72] });
    K.stars(B, 2200, 40, { half: true });
  }, { cam: { dist: 5.6, pitch: 0.1, sway: 0.2, target: [0, 0, -2] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 13. a pulsar sweeping its beams
  Cl.add('space', 'pulsar', (B, R) => {
    const ax = V.norm([0.35, 1, 0.1]), g = B.pivot([0, 0, 0], [0.1, 1, 0.05], 1.2);
    B.with([A.spin, 0, g], () => {
      B.sphere([0, 0, 0], 0.22, 2500, { col: () => [1.2, 1.25, 1.5], lit: false });
      for (const s of [-1, 1]) for (let i = 0; i < 6000; i++) { const t = Math.pow(R(), 0.7), w = 0.03 + t * 0.4, d = V.mul(ax, s * (0.25 + t * 4)); B.pt([d[0] + (R() - 0.5) * w, d[1] + (R() - 0.5) * w * 0.3, d[2] + (R() - 0.5) * w], add([0.7, 0.85, 1], 1.4 - t * 1.2)); }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; B.trail((t) => { const th = t * PI, r = 1.1 * Math.sin(th) * Math.sin(th); return [Math.cos(a) * r, Math.cos(th) * 1.1 * 0.9, Math.sin(a) * r]; }, 300, () => [0.35, 0.45, 0.8]); }
    });
    B.blob([0, 0, 0], 2.4, 5000, { col: (p, d) => add(mix([0.3, 0.2, 0.6], [0.1, 0.5, 0.6], R()), 0.25 * Math.exp(-V.len(d) * 0.5)) });
    K.stars(B, 1800, 40);
  }, { cam: { dist: 7, pitch: 0.15, sway: 0.3 }, sky: DARK, breathe: 0.003 });

  // ================================================================ 14. two stars in a dance: a blue giant feeding a small orange star
  Cl.add('space', 'binary-stars', (B, R) => {
    const g = B.pivot([0, 0, 0], [0, 1, 0.1], 0.18);
    B.with([A.spin, 0, g], () => {
      B.sphere([-1.3, 0, 0], 0.85, 9000, { col: () => add([0.62, 0.78, 1], 1.0 + R() * 0.35), lit: false, an: [A.twinkle, 4] });
      for (let i = 0; i < 1500; i++) { const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), r = 0.88 + Math.pow(R(), 3) * 0.3; B.pt([-1.3 + Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], add([0.45, 0.6, 1], 0.6)); }
      B.sphere([1.6, 0, 0], 0.32, 3000, { col: () => add([1, 0.62, 0.25], 1.15 + R() * 0.3), lit: false });
      for (let i = 0; i < 5000; i++) { const r = 0.42 + Math.pow(R(), 1.5) * 0.7, a = R() * TAU; B.pt([1.6 + Math.cos(a) * r, (R() - 0.5) * 0.02, Math.sin(a) * r], add(mix([1, 0.9, 0.6], [0.9, 0.35, 0.1], (r - 0.42) / 0.7), 1.3 - (r - 0.42))); }
      // the stream: from the giant's surface, curving in to the disc
      for (let i = 0; i < 5000; i++) { const t = R(), a = -0.4 + t * 2.4, rr = 0.5 + (1 - t) * 1.0; const p = [1.6 - Math.cos(a) * rr * (1 - t * 0.2), (R() - 0.5) * 0.03, Math.sin(a) * rr * 0.6]; B.pt([p[0] + (R() - 0.5) * 0.05, p[1], p[2] + (R() - 0.5) * 0.05], add(mix([0.7, 0.85, 1], [1, 0.75, 0.4], t), 1.0)); }
    });
    K.stars(B, 2000, 40);
  }, { cam: { dist: 6.6, pitch: 0.45, sway: 0.25 }, sky: DARK, breathe: 0.003 });

  // ================================================================ 15. auroras on a night-side planet
  Cl.add('space', 'aurora-planet', (B, R) => {
    B.light = V.norm([0.9, 0.1, -0.4]);
    const c = [0, -2.2, -1];
    earth(B, c, 2.6, 22000);
    const pole = V.norm([0.1, 1, 0.2]), F = V.frame(pole);
    for (let i = 0; i < 9000; i++) {
      const a = R() * TAU, lat = 0.42 + Math.sin(a * 3) * 0.05, h = Math.pow(R(), 1.8) * 0.12;
      const d = V.norm(V.add(V.add(V.mul(F[0], Math.cos(a) * lat), V.mul(F[1], Math.sin(a) * lat)), V.mul(pole, Math.sqrt(1 - lat * lat))));
      B.pt(V.add(c, V.mul(d, 2.6 * (1.01 + h))), add(mix([0.2, 1, 0.5], [0.8, 0.3, 1], h * 7), 1.3 - h * 5), [A.twinkle, 1.5]);
    }
    K.stars(B, 2200, 40);
  }, { cam: { dist: 5.6, pitch: 0.45, sway: 0.25, target: [0, 0.0, 0] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 16. a supernova shell
  Cl.add('space', 'supernova', (B, R) => {
    B.sphere([0, 0, 0], 0.18, 1500, { col: () => [1.5, 1.4, 1.2], lit: false });
    B.blob([0, 0, 0], 0.4, 3000, { col: () => [0.9, 0.85, 1] });
    for (let i = 0; i < 18000; i++) {
      const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s];
      const fil = B.N.fbm(d[0] * 4, d[1] * 4, d[2] * 4, 4);
      if (fil < -0.02 && R() < 0.7) continue;
      const r = 1.8 + fil * 0.9 + (R() - 0.5) * 0.15;
      B.pt(V.mul(d, r), add(mix([1, 0.35, 0.25], [0.3, 0.8, 1], sm(-0.1, 0.25, fil)), 0.6 + fil * 2), [A.beat, 0.6]);
    }
    for (let i = 0; i < 300; i++) { const y = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s]; B.hair(V.mul(d, 1.9), V.mul(d, 0.15 + R() * 0.3), [0.6, 0.3, 0.2], [1, 0.8, 0.5]); }
    K.stars(B, 1800, 40);
  }, { cam: { dist: 7, pitch: 0.2, sway: 0.4, spin: 0.015 }, sky: DARK, breathe: 0.01 });

  // ================================================================ 17. a wormhole: rings falling away, stars streaming in
  Cl.add('space', 'wormhole', (B, R) => {
    B.u.wrapZ = [-30, 34];
    for (let k = 0; k < 18; k++) {
      const z = 2 - k * 1.8, r = 1.6 + Math.sin(k * 0.7) * 0.25;
      B.push().move(Math.sin(k * 0.5) * 0.4, Math.cos(k * 0.4) * 0.3, z).rotX(PI / 2);
      B.torus([0, 0, 0], r, 0.04, 1300, { col: () => add(mix([0.3, 0.6, 1], [0.9, 0.3, 1], k / 18), 1 - k / 22), lit: false });
      B.pop();
    }
    for (let i = 0; i < 4000; i++) { const a = R() * TAU, r = 0.2 + R() * 1.4; B.pt([Math.cos(a) * r, Math.sin(a) * r, -30 + R() * 34], add([0.85, 0.9, 1], 0.6 + R()), [A.travelZ, 4 + R() * 6]); }
    B.blob([0, 0, -30], 1.2, 3000, { col: () => [1, 0.95, 1] });
  }, { cam: { dist: 3.5, pitch: 0.0, sway: 0.08, bob: 0.03, target: [0, 0, -4], fov: 60 }, sky: DARK, breathe: 0.004 });

  // ================================================================ 18. a satellite over the Earth's limb
  Cl.add('space', 'satellite', (B, R) => {
    B.light = V.norm([-0.7, 0.6, 0.4]);
    earth(B, [0, -11, -4], 9.5, 26000, { lights: false });
    const g = B.pivot([0, 0.4, 0], [0.2, 1, 0.1], 0.05);
    B.with([A.spin, 0, g], () => {
      B.box([0, 0.4, 0], 0.5, 0.5, 0.7, 2400, { col: (f) => (f === 4 || f === 5 ? [0.85, 0.7, 0.2] : [0.85, 0.75, 0.3]) });
      for (const s of [-1, 1]) B.quad([s * 0.27, 0.25, -0.15], [s * 1.9, 0, 0], [0, 0.3, 0.3], 3200, { col: (u, v) => ((u * 10) % 1 < 0.06 || (v * 3) % 1 < 0.08 ? [0.6, 0.6, 0.62] : [0.1, 0.16, 0.4]), two: true });
      B.push().move(0, 0.75, 0.25).rotX(-0.6);
      B.surf((u, v) => { const r = u * 0.35, a = v * TAU; return [Math.cos(a) * r, r * r * 1.2, Math.sin(a) * r]; }, 1400, { col: [0.9, 0.9, 0.92] });
      B.cyl([0, 0, 0], [0, 0.3, 0], 0.01, 0.01, 60, { col: [0.7, 0.7, 0.7] });
      B.pop();
    });
    K.stars(B, 1800, 40);
  }, { cam: { dist: 5.2, pitch: 0.25, sway: 0.35, target: [0, 0.2, 0] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 19. Jupiter and its moons
  Cl.add('space', 'jupiter', (B, R) => {
    B.light = V.norm([-0.6, 0.2, 0.75]);
    K.planet(B, [0.5, 0, -1], 2.1, 22000, bands(B, [[0.85, 0.7, 0.55], [0.6, 0.42, 0.3], [0.95, 0.9, 0.82]], { f: 26, swirl: 0.12, spot: [0.4, -0.35, 0.85] }));
    const moons = [[-2.4, 0.35, 0.8, 0.16], [-3.2, -0.3, -0.5, 0.12], [-1.7, -0.6, 1.4, 0.1], [2.9, 0.5, 1.2, 0.14]];
    moons.forEach((m, i) => K.planet(B, [m[0], m[1], m[2]], m[3], 900, (d) => (i === 0 ? mix([0.9, 0.8, 0.3], [0.7, 0.4, 0.1], 0.5 + B.N.n3(d[0] * 5, d[1] * 5, d[2] * 5)) : add([0.7, 0.68, 0.65], 0.8 + B.N.n3(d[0] * 6, d[1] * 6, d[2] * 6) * 0.6))));
    K.stars(B, 1800, 40);
  }, { cam: { dist: 7.2, pitch: 0.1, sway: 0.3, target: [-0.4, 0, 0] }, sky: DARK, breathe: 0.002 });

  // ================================================================ 20. a meteor shower over the hills
  Cl.add('space', 'meteor-shower', (B, R) => {
    const N = B.N;
    B.terrain(-12, 12, -10, 2, (x, z) => -1.6 + N.fbm(x * 0.25, 4, z * 0.25, 4) * 1.4 + Math.max(0, -z - 4) * 0.08, 9000, { col: [0.02, 0.025, 0.03], lit: false });
    K.tree(B, [2.2, -1.5, -0.5], 1.6, { leaf: [0.02, 0.03, 0.025], bark: [0.02, 0.02, 0.02], leafN: 110 });
    // the Milky Way: a dense band
    for (let i = 0; i < 12000; i++) { const t = R() * 2 - 1, w = (R() + R() + R() - 1.5) * 0.18, p = V.mul(V.norm([t * 1.6, 0.55 + t * 0.35 + w, -1]), 30); B.pt(p, add(mix([0.8, 0.8, 1], [1, 0.85, 0.7], R()), 0.25 + Math.pow(R(), 5) * 1.5), [A.twinkle, 1 + R() * 2]); }
    K.stars(B, 2400, 32, { half: true });
    B.u.wrapY = [-2, 14];
    for (let i = 0; i < 26; i++) { const p = [(R() - 0.5) * 22, -2 + R() * 14, -12 - R() * 4], d = [-0.5 - R() * 0.4, -0.75, 0]; B.line(p, V.add(p, V.mul(d, 1.2 + R())), [0.2, 0.25, 0.4], [1, 1, 1], [A.fall, -(5 + R() * 5), 0]); }
  }, { cam: { dist: 6, pitch: -0.18, sway: 0.15, target: [0, 1.0, -3] }, sky: ['#04060f', '#0a1020', '#02030a'], horizon: 0.35, breathe: 0.002 });
})();
