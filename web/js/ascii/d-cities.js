/* Oley · ASCII designs: cities. Skylines, bridges, neon streets, harbours, old towns and new ones. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A, K = Cl.K;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, add = K.add, clamp = Cl.clamp;
  const NIGHT = ['#03040c', '#0c0e1e', '#05050c'];
  const warm = (R) => (R() < 0.75 ? [1, 0.8, 0.45] : R() < 0.5 ? [0.7, 0.85, 1] : [1, 0.95, 0.85]);

  // a house: walls, a pitched roof, windows, maybe a chimney
  const house = (B, c, w, d, h, o) => {
    o = o || {};
    const R = B.R, wall = o.wall || [0.55, 0.42, 0.32], roof = o.roof || [0.45, 0.15, 0.1];
    K.tower(B, c, w, h, d, { on: o.on == null ? 0.5 : o.on, wall, lit: o.lit || [1, 0.75, 0.4], floor: h / 2, bay: w / 3, n: o.n || 900, faces: [4, 0, 1, 5] });
    const rh = o.rh || w * 0.45;
    B.surf((u, v) => [c[0] - w / 2 - 0.03 + u * (w + 0.06), c[1] + h + (1 - Math.abs(v * 2 - 1)) * rh, c[2] - d / 2 - 0.03 + v * (d + 0.06)], o.rn || 700, { col: (u, v) => (o.snow && (1 - Math.abs(v * 2 - 1)) > 0.2 ? [0.9, 0.92, 0.98] : roof) });
    for (const s of [-1, 1]) B.surf((u, v) => { const y = v * rh * (1 - Math.abs(u * 2 - 1)); return [c[0] + s * w / 2, c[1] + h + y, c[2] - d / 2 + u * d]; }, 120, { col: wall });
    if (o.chimney) { const p = [c[0] + w * 0.25, c[1] + h + rh * 0.5, c[2]]; B.box(V.add(p, [0, 0.12, 0]), 0.1, 0.35, 0.1, 120, { col: [0.35, 0.2, 0.15] }); if (o.smoke) K.smoke(B, V.add(p, [0, 0.3, 0]), 0.08, 1.2, 250); }
  };
  const water = (B, w, d, y, col, n, o) => K.sea(B, w, d, y, n || 10000, col || [0.02, 0.04, 0.08], Object.assign({ amp: 0.012, speed: 0.7 }, o || {}));
  // the skyline mirrored in still water
  const mirrored = (B, fn, y, k) => { fn(); B.push().move(0, 2 * y, 0).scale(1, -1, 1); B.with(null, () => fn(k || 0.35)); B.pop(); };

  // ================================================================ 1. a skyline at night over the river
  Cl.add('cities', 'skyline', (B, R) => {
    water(B, 12, 6, 0, [0.02, 0.03, 0.06], 12000, { glint: [0, 3, -6], glintCol: [1, 0.8, 0.5] });
    K.skyline(B, -9, 9, -7, -4, 34, { hmax: 4.5, hmin: 0.8, lit: warm });
    K.stars(B, 600, 30, { half: true, k: 0.6 });
  }, { sea: ['#0a0e1a', '#04060c'], cam: { dist: 7, pitch: 0.08, sway: 0.25, target: [0, 1.2, -3] }, sky: NIGHT, horizon: 0.4, breathe: 0.001 });

  // ================================================================ 2. the city from above, traffic flowing
  Cl.add('cities', 'aerial', (B, R) => {
    B.u.wrapX = [-6, 12]; B.u.wrapZ = [-6, 12];
    B.quad([-6, 0, -6], [12, 0, 0], [0, 0, 12], 9000, { col: () => add([0.08, 0.08, 0.09], 0.7 + R() * 0.4) });
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const x = i * 1.1, z = j * 1.1;
      if (R() < 0.12) { K.bush(B, [x, 0.1, z], 0.35, 200, [0.12, 0.3, 0.1]); continue; }
      const h = 0.15 + Math.pow(R(), 2.5) * (1.8 - Math.hypot(i, j) * 0.12);
      K.tower(B, [x, 0, z], 0.75, Math.max(0.12, h), 0.75, { on: 0.12, lit: warm(R), n: 900, wall: [0.42, 0.42, 0.48], faces: [2, 0, 1, 4, 5] });
    }
    for (let i = 0; i < 7000; i++) { const lane = Math.floor(R() * 11) - 5, alongX = R() < 0.5, d = -6 + R() * 12, side = R() < 0.5 ? -1 : 1, off = lane * 1.1 + 0.55 + side * 0.08; B.pt(alongX ? [d, 0.03, off] : [off, 0.03, d], side > 0 ? [1, 0.95, 0.85] : [1, 0.15, 0.1], [alongX ? A.travel : A.travelZ, side * (0.7 + R() * 0.3)]); }
  }, { cam: { dist: 6.5, pitch: 0.95, sway: 0.2, spin: 0.02 }, sky: NIGHT, breathe: 0.001 });

  // ================================================================ 3. a suspension bridge
  Cl.add('cities', 'bridge', (B, R) => {
    B.u.wrapX = [-10, 20];
    water(B, 12, 7, -0.5, [0.02, 0.04, 0.08], 10000, { glint: [3, 2, -8], glintCol: [1, 0.7, 0.4] });
    const span = 5, deckY = 0.6;
    for (const x of [-span / 2, span / 2]) for (const z of [-0.35, 0.35]) B.box([x, 1.2, z], 0.18, 3.4, 0.18, 1200, { col: [0.75, 0.25, 0.15] });
    for (const x of [-span / 2, span / 2]) for (const y of [1.9, 2.8]) B.box([x, y, 0], 0.15, 0.12, 0.85, 200, { col: [0.75, 0.25, 0.15] });
    B.box([0, deckY, 0], 14, 0.12, 0.8, 5000, { col: (f) => (f === 2 ? [0.25, 0.25, 0.27] : [0.55, 0.2, 0.12]) });
    for (const z of [-0.36, 0.36]) {
      const cab = (x) => { const a = Math.abs(x); return a < span / 2 ? 2.85 - (2.85 - deckY - 0.3) * (1 - Math.pow(a / (span / 2), 2)) : 2.85 - (a - span / 2) * 0.6; };
      B.trail((t) => { const x = -7 + t * 14; return [x, Math.max(deckY, cab(x)), z]; }, 2500, [0.85, 0.35, 0.2]);
      for (let x = -6.8; x < 6.8; x += 0.25) if (cab(x) > deckY + 0.05) B.line([x, deckY + 0.06, z], [x, cab(x), z], [0.6, 0.25, 0.15]);
    }
    for (let i = 0; i < 1200; i++) B.pt([-10 + R() * 20, deckY + 0.1, R() < 0.5 ? -0.15 : 0.15], R() < 0.5 ? [1, 0.95, 0.85] : [1, 0.2, 0.1], [A.travel, R() < 0.5 ? 2 : -2]);
    K.skyline(B, -10, 10, -9, -7, 30, { hmax: 4, lit: warm });
  }, { sea: ['#08101c', '#03070c'], cam: { dist: 8, pitch: 0.12, yaw: 0.45, sway: 0.25, target: [0, 1.2, -1] }, sky: ['#060818', '#2a1a38', '#50302a'], horizon: 0.36, breathe: 0.001 });

  // ================================================================ 4. a neon street
  Cl.add('cities', 'neon-street', (B, R) => {
    B.quad([-1.6, 0, -14], [3.2, 0, 0], [0, 0, 16], 12000, { lit: false, col: () => (R() < 0.05 ? (R() < 0.5 ? [1, 0.2, 0.7] : [0.2, 0.8, 1]) : add([0.08, 0.08, 0.1], 0.6 + R() * 0.5)) });
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) {
      const z = 1 - k * 1.6, h = 2.5 + R() * 3;
      K.tower(B, [s * 2.4, 0, z], 1.4, h, 1.5, { on: 0.45, lit: R() < 0.5 ? [1, 0.75, 0.45] : [0.6, 0.85, 1], n: 1300, faces: s < 0 ? [0, 2] : [1, 2] });
      for (let j = 0; j < 2; j++) { const col = [[1, 0.2, 0.65], [0.2, 0.85, 1], [1, 0.7, 0.15], [0.6, 0.3, 1]][(k + j * 3 + (s > 0 ? 1 : 0)) % 4]; B.box([s * 1.62, 0.9 + j * 0.9 + R() * 0.4, z + (R() - 0.5) * 0.6], 0.06, 0.3 + R() * 0.5, 0.4 + R() * 0.4, 260, { col: add(col, 1.3).concat(1), an: [A.twinkle, 1 + R() * 5] }); }
    }
    for (let i = 0; i < 6; i++) B.cyl([-1.5 + (i % 2) * 3, 0, -i * 2.4], [-1.5 + (i % 2) * 3, 2, -i * 2.4], 0.02, 0.02, 80, { col: [0.3, 0.3, 0.32] });
    K.rain(B, 2, 8, -0.1, 5, 900, { speed: 7, col: [0.5, 0.5, 0.7] });
  }, { cam: { dist: 4.5, pitch: 0.12, sway: 0.12, target: [0, 1.2, -4], fov: 48 }, sky: ['#05030a', '#140818', '#08040a'], horizon: 0.4, fog: ['#1a0a1c', 6, 18], breathe: 0.002 });

  // ================================================================ 5. an iron lattice tower, sparkling
  Cl.add('cities', 'lattice-tower', (B, R) => {
    const H = 4.6, leg = (y) => 1.15 * Math.pow(1 - y / H, 2.2) + 0.06;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      B.trail((t) => { const y = t * H; return [sx * leg(y), y - 1.6, sz * leg(y)]; }, 2500, [0.55, 0.42, 0.3]);
      for (let y = 0; y < H - 0.2; y += 0.18) { const a = leg(y), b = leg(y + 0.18); B.line([sx * a, y - 1.6, sz * a], [sx * b, y + 0.18 - 1.6, -sz * b], [0.45, 0.35, 0.25]); B.line([sx * a, y - 1.6, sz * a], [-sx * b, y + 0.18 - 1.6, sz * b], [0.45, 0.35, 0.25]); }
    }
    for (const y of [1.0, 2.4]) { const r = leg(y); B.box([0, y - 1.6, 0], r * 2.2, 0.1, r * 2.2, 900, { col: [0.6, 0.45, 0.3] }); }
    B.trail((t) => { const a = t * PI; return [Math.cos(a) * 0.95, -1.6 + Math.sin(a) * 0.55, 0]; }, 600, [0.55, 0.42, 0.3]);
    for (let i = 0; i < 900; i++) { const y = R() * H, r = leg(y); B.pt([(R() < 0.5 ? -1 : 1) * r, y - 1.6, (R() - 0.5) * 2 * r], [1.2, 1.1, 0.9], [A.twinkle, 6 + R() * 6]); }
    B.quad([-8, -1.6, -8], [16, 0, 0], [0, 0, 12], 7000, { col: () => mix([0.06, 0.12, 0.05], [0.1, 0.18, 0.08], R()) });
    K.skyline(B, -12, 12, -10, -8, 30, { hmax: 1.6, hmin: 0.6, lit: warm, y: -1.6 });
  }, { cam: { dist: 8.2, pitch: 0.05, sway: 0.3, target: [0, 0.8, 0] }, sky: ['#04060f', '#141a30', '#2a2020'], horizon: 0.3, breathe: 0.001 });

  // ================================================================ 6. a skyline mirrored in a still bay
  Cl.add('cities', 'reflection', (B, R) => {
    const sky = () => K.skyline(B, -8, 8, -6, -4, 28, { hmax: 4.2, lit: () => [0.95, 0.75, 0.9] });
    sky();
    B.push().move(0, 0, 0).scale(1, -1, 1); B.anim = [A.water, 0.02, 0.5]; K.skyline(B, -8, 8, -6, -4, 28, { hmax: 4.2, lit: () => [0.45, 0.35, 0.45], wall: [0.04, 0.04, 0.06] }); B.anim = null; B.pop();
    water(B, 10, 3, 0, [0.04, 0.03, 0.08], 6000);
  }, { sea: ['#1c0c22', '#08040c'], cam: { dist: 8, pitch: 0.02, sway: 0.2, target: [0, 0.4, -3] }, sky: ['#0a0418', '#3a1a3a', '#6a3040'], horizon: 0.55, glow: [0.6, 0, 0.08, '#ffb080', 0.03], breathe: 0.001 });

  // ================================================================ 7. a rainy alley
  Cl.add('cities', 'rain-alley', (B, R) => {
    B.quad([-1.4, 0, -10], [2.8, 0, 0], [0, 0, 12], 10000, { lit: false, col: () => (R() < 0.06 ? add([1, 0.75, 0.4], 0.6 + R()) : add([0.07, 0.07, 0.08], 0.6 + R() * 0.5)) });
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) K.tower(B, [s * 2.1, 0, 1 - k * 1.9], 1.4, 3 + R() * 2, 1.8, { on: 0.3, wall: [0.13, 0.11, 0.1], lit: [1, 0.75, 0.4], floor: 0.5, bay: 0.5, n: 1300, faces: s < 0 ? [0] : [1] });
    for (let k = 0; k < 4; k++) { const z = -k * 2.8; B.cyl([1.2, 0, z], [1.2, 2.1, z], 0.025, 0.02, 120, { col: [0.25, 0.25, 0.28] }); B.blob([1.05, 2.05, z], 0.07, 90, { col: () => [1.3, 1.0, 0.6] }); for (let i = 0; i < 260; i++) { const t = R(); B.pt([1.05 + (R() - 0.5) * t * 0.9, 2.05 - t * 2.05, z + (R() - 0.5) * t * 0.9], add([1, 0.8, 0.5], (1 - t) * 0.3)); } }
    for (let i = 0; i < 3; i++) { const z = -1 - i * 2.5, x = (R() - 0.5) * 1.2; B.cyl([x, 0, z], [x, 1.6, z], 0.12, 0.1, 400, { col: [0.06, 0.06, 0.07] }); B.sphere([x, 1.7, z], 0.1, 120, { col: [0.06, 0.06, 0.07] }); B.sphere([x, 1.85, z], 0.45, 900, { y0: 0.15, col: [[0.75, 0.1, 0.15], [0.1, 0.12, 0.15], [0.15, 0.3, 0.6]][i] }); }
    K.rain(B, 1.6, 7, -0.1, 5, 1400, { speed: 8 });
  }, { cam: { dist: 4.2, pitch: 0.1, sway: 0.12, target: [0, 1.2, -3], fov: 50 }, sky: ['#04050a', '#0a0c12', '#06060a'], horizon: 0.4, fog: ['#0c0e14', 4, 14], breathe: 0.002 });

  // ================================================================ 8. an interchange with ramps of traffic
  Cl.add('cities', 'interchange', (B, R) => {
    B.quad([-8, -0.02, -8], [16, 0, 0], [0, 0, 16], 7000, { col: () => mix([0.05, 0.08, 0.04], [0.08, 0.1, 0.06], R()) });
    const ring = (r, y, g) => {
      for (let i = 0; i < 4000; i++) { const a = R() * TAU, rr = r + (R() - 0.5) * 0.5; B.pt([Math.cos(a) * rr, y, Math.sin(a) * rr], add([0.22, 0.22, 0.24], 0.7 + R() * 0.4)); }
      for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; B.cyl([Math.cos(a) * r, -0.02, Math.sin(a) * r], [Math.cos(a) * r, y, Math.sin(a) * r], 0.06, 0.06, 80, { col: [0.5, 0.5, 0.52] }); }
      B.with([A.spin, 0, g], () => { for (let i = 0; i < 900; i++) { const a = R() * TAU, rr = r + (R() < 0.5 ? -0.12 : 0.12); B.pt([Math.cos(a) * rr, y + 0.05, Math.sin(a) * rr], rr > r ? [1, 0.95, 0.85] : [1, 0.15, 0.1]); } });
    };
    ring(2.2, 0.4, B.pivot([0, 0, 0], [0, 1, 0], 0.25)); ring(3.6, 0.9, B.pivot([0, 0, 0], [0, 1, 0], -0.18)); ring(5.0, 0.2, B.pivot([0, 0, 0], [0, 1, 0], 0.12));
    B.u.wrapX = [-8, 16];
    for (let i = 0; i < 6000; i++) B.pt([-8 + R() * 16, 1.4, (R() - 0.5) * 0.5], add([0.22, 0.22, 0.24], 0.7 + R() * 0.4));
    for (let i = 0; i < 900; i++) B.pt([-8 + R() * 16, 1.46, R() < 0.5 ? -0.12 : 0.12], R() < 0.5 ? [1, 0.95, 0.85] : [1, 0.15, 0.1], [A.travel, R() < 0.5 ? 2.5 : -2.5]);
    K.skyline(B, -12, 12, -12, -9, 30, { hmax: 4, lit: warm });
  }, { cam: { dist: 9, pitch: 0.6, sway: 0.25, target: [0, 0, -1] }, sky: NIGHT, breathe: 0.001 });

  // ================================================================ 9. a city of the future
  Cl.add('cities', 'future', (B, R) => {
    B.u.wrapX = [-12, 24];
    for (let i = 0; i < 26; i++) {
      const x = (R() - 0.5) * 16, z = -1 - R() * 9, h = 2 + R() * 6, r = 0.2 + R() * 0.4;
      B.cyl([x, -2, z], [x, -2 + h, z], r, r * (0.2 + R() * 0.6), Math.round(1500 * h * r + 300), { col: (u, v) => (Math.sin(u * h * 20) > 0.7 && Math.sin(v * 40) > -0.2 ? [0.4, 0.95, 1, 1] : [0.18, 0.2, 0.26]) });
      if (R() < 0.5) { B.push().move(x, -2 + h * (0.5 + R() * 0.3), z).rotX(PI / 2); B.torus([0, 0, 0], r * 1.8, 0.03, 500, { col: () => [1, 0.3, 0.9], lit: false, an: [A.twinkle, 2] }); B.pop(); }
      B.pt([x, -2 + h + 0.05, z], [1, 0.2, 0.2], [A.twinkle, 3]);
    }
    for (let i = 0; i < 4500; i++) { const lane = i % 4; B.pt([-12 + R() * 24, -0.5 + lane * 0.7, -2 - lane * 1.6], lane % 2 ? [1, 0.35, 0.8] : [0.4, 0.9, 1], [A.travel, (lane % 2 ? -1 : 1) * (2 + lane)]); }
  }, { cam: { dist: 7.5, pitch: 0.1, sway: 0.25, target: [0, 0.6, -3] }, sky: ['#02020a', '#0a0a24', '#1a0830'], horizon: 0.3, fog: ['#100a28', 7, 18], breathe: 0.002 });

  // ================================================================ 10. an old town of roofs and chimneys
  Cl.add('cities', 'old-town', (B, R) => {
    const N = B.N;
    B.terrain(-7, 7, -7, 3, (x, z) => -0.6 + Math.max(0, -z) * 0.18 + N.fbm(x * 0.3, 2, z * 0.3, 3) * 0.3, 7000, { col: [0.1, 0.12, 0.08] });
    for (let i = 0; i < 26; i++) {
      const x = (R() - 0.5) * 11, z = 1.5 - R() * 7, y = -0.6 + Math.max(0, -z) * 0.18;
      house(B, [x, y, z], 0.7 + R() * 0.5, 0.6 + R() * 0.4, 0.6 + R() * 0.6, { roof: mix([0.45, 0.15, 0.1], [0.3, 0.22, 0.2], R()), wall: mix([0.55, 0.45, 0.35], [0.7, 0.62, 0.5], R()), chimney: R() < 0.5, smoke: R() < 0.5, on: 0.45 });
    }
    K.tower(B, [0.6, 0.2, -4.8], 0.6, 2.4, 0.6, { on: 0.2, wall: [0.5, 0.45, 0.4], floor: 0.6, n: 1200 });
    B.cyl([0.6, 2.6, -4.8], [0.6, 3.6, -4.8], 0.42, 0.01, 1200, { col: [0.25, 0.3, 0.3] });
    K.moon(B, [-3, 4, -14], 0.6, 2000);
    K.stars(B, 900, 30, { half: true });
  }, { cam: { dist: 7, pitch: 0.25, sway: 0.25, target: [0, 0.5, -2] }, sky: ['#04060f', '#10142a', '#1a1820'], horizon: 0.35, breathe: 0.002 });

  // ================================================================ 11. a container harbour with cranes
  Cl.add('cities', 'harbour', (B, R) => {
    water(B, 12, 6, -0.3, [0.02, 0.05, 0.08], 9000, { glint: [-3, 1.5, -6], glintCol: [1, 0.8, 0.5] });
    B.quad([-9, 0, 0.5], [18, 0, 0], [0, 0, 4], 6000, { col: () => add([0.2, 0.2, 0.21], 0.7 + R() * 0.4) });
    const cols = [[0.75, 0.15, 0.1], [0.1, 0.35, 0.65], [0.9, 0.6, 0.1], [0.15, 0.5, 0.25], [0.8, 0.8, 0.82]];
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 1 + Math.floor(R() * 3); k++) B.box([-5 + i * 0.75, 0.15 + k * 0.3, 1.4 + j * 0.42], 0.7, 0.28, 0.38, 220, { col: (f, a) => add(cols[(i + j * 2 + k) % cols.length], (a * 12) % 1 < 0.2 ? 0.7 : 1) });
    for (let c = 0; c < 3; c++) {
      const x = -3 + c * 3.2;
      for (const z of [0.6, 2.6]) B.box([x, 1.5, z], 0.12, 3, 0.12, 500, { col: [0.85, 0.5, 0.1] });
      B.box([x, 3.0, 1.0], 0.15, 0.15, 5, 900, { col: [0.85, 0.5, 0.1] });
      B.line([x, 3.0, -0.8], [x, 1.4, -0.8], [0.6, 0.6, 0.6]);
      B.pt([x, 3.15, 1.0], [1, 0.2, 0.15], [A.twinkle, 2]);
    }
    K.hull(B, [0, -0.25, -1.6], 0, 7, 1.2, 0.7, [0.15, 0.18, 0.22], 6000);
    for (let i = 0; i < 12; i++) B.box([-2.8 + i * 0.5, 0.05, -1.6], 0.45, 0.3, 0.9, 150, { col: cols[i % cols.length] });
    K.stars(B, 500, 30, { half: true, k: 0.6 });
  }, { sea: ['#08101c', '#03070c'], cam: { dist: 9, pitch: 0.2, sway: 0.25, yaw: 0.35, target: [0, 1, 0] }, sky: ['#06081a', '#2a2040', '#4a3028'], horizon: 0.35, breathe: 0.001 });

  // ================================================================ 12. a ferris wheel turning over the lights
  Cl.add('cities', 'ferris-wheel', (B, R) => {
    const c = [0, 2.4, 0], r = 2.2, g = B.pivot(c, [0, 0, 1], 0.12);
    B.with([A.spin, 0, g], () => {
      for (const z of [-0.15, 0.15]) { B.trail((t) => [c[0] + Math.cos(t * TAU) * r, c[1] + Math.sin(t * TAU) * r, z], 3000, [0.8, 0.8, 0.85]); for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; B.line([c[0], c[1], z], [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, z], [0.55, 0.55, 0.6]); } }
      for (let i = 0; i < 1800; i++) { const a = R() * TAU; B.pt([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, (R() - 0.5) * 0.3], add([[1, 0.3, 0.6], [0.3, 0.8, 1], [1, 0.85, 0.3]][i % 3], 1.3), [A.twinkle, 3]); }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; B.box([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r - 0.2, 0], 0.25, 0.25, 0.3, 160, { col: [[0.9, 0.2, 0.2], [0.2, 0.4, 0.9], [0.95, 0.8, 0.15], [0.2, 0.7, 0.35]][k % 4] }); }
    });
    for (const s of [-1, 1]) { B.line([s * 1.2, 0, 0.25], c, [0.7, 0.7, 0.75]); B.line([s * 1.2, 0, -0.25], c, [0.7, 0.7, 0.75]); }
    B.quad([-8, 0, -6], [16, 0, 0], [0, 0, 9], 7000, { col: () => (R() < 0.04 ? [1, 0.7, 0.4] : add([0.08, 0.08, 0.1], 0.7 + R() * 0.4)) });
    K.skyline(B, -12, 12, -10, -7, 30, { hmax: 3.5, lit: warm });
  }, { cam: { dist: 8, pitch: 0.1, sway: 0.3, target: [0, 2, 0] }, sky: ['#08061a', '#2a1440', '#3a1a28'], horizon: 0.3, breathe: 0.002 });

  // ================================================================ 13. a desert city of domes under the moon
  Cl.add('cities', 'domes', (B, R) => {
    B.quad([-9, 0, -9], [18, 0, 0], [0, 0, 12], 8000, { col: () => mix([0.4, 0.3, 0.18], [0.5, 0.38, 0.24], R()) });
    for (let i = 0; i < 16; i++) {
      const x = (R() - 0.5) * 12, z = -1 - R() * 6, w = 0.6 + R() * 0.8, h = 0.5 + R() * 1.2;
      K.tower(B, [x, 0, z], w, h, w, { on: 0.3, wall: [0.62, 0.52, 0.4], lit: [1, 0.75, 0.4], floor: 0.4, bay: 0.35, n: 700 });
      if (R() < 0.6) B.sphere([x, h, z], w * 0.48, 900, { y0: 0, col: R() < 0.5 ? [0.2, 0.45, 0.55] : [0.75, 0.6, 0.3] });
    }
    for (let i = 0; i < 3; i++) { const x = -3 + i * 3, z = -4 - R() * 2; B.cyl([x, 0, z], [x, 3.2, z], 0.12, 0.08, 900, { col: [0.65, 0.55, 0.42] }); B.sphere([x, 3.3, z], 0.15, 150, { col: [0.75, 0.6, 0.3] }); }
    for (let i = 0; i < 3; i++) K.palm(B, [-4.5 + i * 4.5 + (R() - 0.5), 0, -0.5 - R() * 2], 1.3 + R() * 0.6, (R() - 0.5) * 0.5, { n: 260, fronds: 7 });
    K.moon(B, [3, 4.5, -14], 0.8, 2500);
    K.stars(B, 1200, 30, { half: true });
  }, { cam: { dist: 7.5, pitch: 0.12, sway: 0.3, target: [0, 1, -2] }, sky: ['#03040e', '#0e1430', '#1a1a2a'], horizon: 0.32, breathe: 0.001 });

  // ================================================================ 14. looking straight up between towers
  Cl.add('cities', 'looking-up', (B, R) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + R() * 0.25, r = 2.6 + R() * 0.6, w = 1.5 + R() * 0.6;
      B.push().rotY(-a + PI / 2);
      K.tower(B, [0, 0, -r - w / 2], w, 9 + R() * 7, w, { on: 0.25, lit: [1, 0.85, 0.6], wall: [0.16, 0.17, 0.2], glass: [0.06, 0.08, 0.12], floor: 0.3, bay: 0.3, n: 7000, faces: [4, 0, 1] });
      B.pop();
    }
    for (let i = 0; i < 7; i++) K.bird(B, [(R() - 0.5) * 2.5, 13 + R() * 3, (R() - 0.5) * 2.5], 0.35, [0.02, 0.02, 0.03]);
  }, { cam: { dist: 11, pitch: -1.47, sway: 0.12, bob: 0.015, spin: 0.04, target: [0, 11, 0], fov: 78 }, sky: ['#1a3a70', '#3a6aa8', '#5a88c0'], horizon: 0.3, breathe: 0.001 });

  // ================================================================ 15. an elevated train gliding past
  Cl.add('cities', 'elevated-train', (B, R) => {
    B.u.wrapX = [-12, 24];
    B.quad([-12, 0, -6], [24, 0, 0], [0, 0, 8], 7000, { col: () => add([0.09, 0.09, 0.1], 0.7 + R() * 0.4) });
    B.box([0, 1.6, 0], 24, 0.12, 1.0, 5000, { col: [0.45, 0.45, 0.48] });
    for (let x = -11; x <= 11; x += 2.2) B.box([x, 0.8, 0], 0.2, 1.6, 0.2, 300, { col: [0.45, 0.45, 0.48] });
    B.with([A.travel, 1.6], () => { for (let c = 0; c < 4; c++) B.box([-3 + c * 1.9, 2.05, 0], 1.8, 0.75, 0.75, 2200, { col: (f, a, b) => ((f === 4 || f === 5) && b > 0.45 && b < 0.85 && (a * 6) % 1 > 0.15 ? [1.1, 1.0, 0.8, 1] : f === 2 ? [0.5, 0.5, 0.55] : [0.75, 0.78, 0.82]) }); });
    K.skyline(B, -12, 12, -8, -4, 30, { hmax: 4.5, lit: warm });
    for (let i = 0; i < 8; i++) { const x = -10 + i * 2.8; B.cyl([x, 0, 1.6], [x, 1.2, 1.6], 0.02, 0.02, 60, { col: [0.3, 0.3, 0.32] }); B.blob([x, 1.25, 1.6], 0.05, 40, { col: () => [1, 0.8, 0.5] }); }
  }, { cam: { dist: 7, pitch: 0.12, yaw: 0.25, sway: 0.25, target: [0, 1.6, 0] }, sky: ['#05060f', '#1a1430', '#2a1a20'], horizon: 0.35, breathe: 0.001 });

  // ================================================================ 16. a harbour town with a lighthouse sweeping
  Cl.add('cities', 'lighthouse-town', (B, R) => {
    water(B, 12, 8, -0.4, [0.02, 0.04, 0.07], 9000);
    const N = B.N;
    B.terrain(-6, 6, -3, 2, (x, z) => -0.4 + Math.max(0, 0.6 - Math.abs(z + 0.5) * 0.4) * (1 + N.fbm(x * 0.5, 0, z, 3)), 7000, { col: [0.2, 0.18, 0.15] });
    for (let i = 0; i < 12; i++) house(B, [-4.5 + i * 0.75 + (R() - 0.5) * 0.2, 0.05, -0.8 + (R() - 0.5) * 0.8], 0.55, 0.5, 0.45 + R() * 0.4, { wall: mix([0.8, 0.75, 0.65], [0.6, 0.7, 0.8], R()), roof: mix([0.6, 0.2, 0.15], [0.2, 0.3, 0.45], R()), on: 0.5, n: 500 });
    const lh = [4.2, 0.1, 0.2];
    B.cyl(lh, V.add(lh, [0, 2.2, 0]), 0.3, 0.2, 2200, { col: (u) => (Math.floor(u * 6) % 2 ? [0.85, 0.15, 0.12] : [0.95, 0.95, 0.92]) });
    B.blob(V.add(lh, [0, 2.35, 0]), 0.12, 200, { col: () => [1.4, 1.3, 1] });
    const g = B.pivot(V.add(lh, [0, 2.35, 0]), [0, 1, 0], 0.7);
    B.with([A.spin, 0, g], () => { for (let i = 0; i < 4000; i++) { const t = Math.pow(R(), 0.6), w = t * 0.6; B.pt([lh[0] - t * 7, lh[1] + 2.35 + (R() - 0.5) * w * 0.4, lh[2] + (R() - 0.5) * w], add([1, 0.95, 0.75], (1 - t) * 0.7)); } });
    K.stars(B, 900, 30, { half: true });
  }, { sea: ['#08121e', '#03060c'], cam: { dist: 8, pitch: 0.12, sway: 0.25, target: [0, 1, -0.5] }, sky: ['#03050e', '#0c1428', '#0a1018'], horizon: 0.35, breathe: 0.001 });

  // ================================================================ 17. the city in snow
  Cl.add('cities', 'snowy-street', (B, R) => {
    B.quad([-2, 0, -12], [4, 0, 0], [0, 0, 14], 9000, { col: () => add([0.75, 0.78, 0.85], 0.6 + R() * 0.4) });
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) house(B, [s * 2.3, 0, 1 - k * 1.6], 1.4, 1.4, 1.4 + R() * 1.2, { wall: mix([0.45, 0.3, 0.25], [0.6, 0.55, 0.5], R()), roof: [0.3, 0.3, 0.32], snow: true, on: 0.6, lit: [1, 0.72, 0.38], chimney: R() < 0.5, smoke: true, n: 1100 });
    for (let k = 0; k < 4; k++) { const z = -k * 3; B.cyl([1.3, 0, z], [1.3, 2.2, z], 0.03, 0.03, 120, { col: [0.2, 0.2, 0.22] }); B.blob([1.3, 2.25, z], 0.08, 100, { col: () => [1.3, 1.0, 0.6] }); }
    K.snow(B, 3, 9, -0.1, 5, 2500, { speed: 0.5 });
  }, { cam: { dist: 4.6, pitch: 0.12, sway: 0.12, target: [0, 1.2, -3], fov: 50 }, sky: ['#0a0e1a', '#1a2030', '#141820'], horizon: 0.4, fog: ['#30364a', 5, 16], breathe: 0.002 });

  // ================================================================ 18. a skyline against the rising sun
  Cl.add('cities', 'sunrise', (B, R) => {
    // a silhouette has to block the sky, so the walls are drawn dense and in fat points
    B.size(2.4, () => K.skyline(B, -10, 10, -6, -4, 36, { hmax: 4.5, lit: () => [0.3, 0.18, 0.1], wall: [0.015, 0.01, 0.015], n: 2000 }));
    for (let i = 0; i < 9; i++) K.bird(B, [-2 + R() * 4, 3 + R() * 1.5, -2], 0.15, [0.02, 0.02, 0.02]);
    water(B, 12, 5, 0, [0.12, 0.05, 0.04], 7000, { glint: [0, 1.5, -6], glintCol: [1, 0.6, 0.3] });
  }, { sea: ['#3a1810', '#140806'], cam: { dist: 7.5, pitch: 0.06, sway: 0.2, target: [0, 1.4, -3] }, sky: ['#3a1a50', '#e06040', '#ffb060'], horizon: 0.38, glow: [0.5, 0, 0.16, '#ffd080', 0.05], breathe: 0.001 });

  // ================================================================ 19. a little toy city
  Cl.add('cities', 'toy-city', (B, R) => {
    B.quad([-4, 0, -4], [8, 0, 0], [0, 0, 8], 7000, { col: () => mix([0.4, 0.62, 0.3], [0.45, 0.68, 0.35], R()) });
    const pal = [[0.95, 0.45, 0.35], [0.98, 0.8, 0.35], [0.45, 0.7, 0.9], [0.95, 0.95, 0.92], [0.6, 0.5, 0.85]];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      if ((i + j) % 3 === 0 && R() < 0.5) { K.tree(B, [i * 1.1, 0, j * 1.1], 0.6, { leafN: 60, blob: 0.25, depth: 2 }); continue; }
      const h = 0.25 + R() * 1.0 * (1 - Math.hypot(i, j) * 0.1), col = pal[Math.floor(R() * pal.length)];
      B.box([i * 1.1, h / 2, j * 1.1], 0.8, h, 0.8, 700, { col: (f, a, b) => (f !== 2 && f !== 3 && (a * 3) % 1 > 0.3 && (b * h * 5) % 1 > 0.4 ? [0.2, 0.25, 0.35] : col) });
    }
    for (let i = 0; i < 2000; i++) { const t = R() * 8 - 4; B.pt(R() < 0.5 ? [t, 0.01, 0.55] : [0.55, 0.01, t], [0.3, 0.3, 0.32]); }
  }, { skyK: 0.9, cam: { dist: 14, pitch: 0.62, yaw: 0.78, sway: 0.2, fov: 26 }, sky: ['#04081a', '#0a1430', '#04081a'], breathe: 0.002 });

  // ================================================================ 20. a city of canals
  Cl.add('cities', 'canals', (B, R) => {
    water(B, 1.2, 10, 0, [0.04, 0.12, 0.14], 8000, { amp: 0.008 });
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) K.tower(B, [s * 1.9, 0, 2 - k * 1.5], 1.4, 1.5 + R() * 1.6, 1.4, { on: 0.35, wall: mix([0.75, 0.45, 0.3], [0.85, 0.75, 0.55], R()), lit: [1, 0.75, 0.4], floor: 0.45, bay: 0.4, n: 1300, faces: s < 0 ? [0, 2] : [1, 2] });
    for (let k = 0; k < 3; k++) { const z = -3 - k * 3.2; B.trail((t) => [-1.2 + t * 2.4, 0.15 + Math.sin(t * PI) * 0.45, z], 1100, [0.55, 0.48, 0.4], { j: 0.12 }); }
    for (let k = 0; k < 2; k++) { B.push().move(-0.3 + k * 0.6, 0.02, -k * 3.2).rotY(PI / 2); K.hull(B, [0, 0, 0], 0, 1.4, 0.25, 0.12, [0.05, 0.05, 0.06], 700, { sharp: 1.4 }); B.pop(); }
    K.moon(B, [0.5, 4.2, -14], 0.5, 1500);
    K.stars(B, 600, 30, { half: true });
  }, { skyK: 0.32, cam: { dist: 4.6, pitch: 0.16, sway: 0.15, target: [0, 1, -3], fov: 46 }, sky: ['#05070f', '#141a30', '#201820'], horizon: 0.4, breathe: 0.002 });
})();
