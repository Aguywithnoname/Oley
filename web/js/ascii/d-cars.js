/* Oley · ASCII designs: cars. Every vehicle is built from a side profile (kit3d.js K.car) with real
   spinning wheels, lamps and glass, set somewhere it belongs. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A, K = Cl.K;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, add = K.add;
  const C = K.CARS;

  // a road along x: asphalt, lane dashes, edge lines
  const road = (B, x0, x1, z0, z1, y, o) => {
    o = o || {};
    const R = B.R, wet = o.wet;
    B.quad([x0, y, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], o.n || 9000, { lit: false, col: (u, v, p) => {
      const zc = (z0 + z1) / 2;
      if (Math.abs(p[2] - zc) < 0.035 && ((p[0] * 1.2) % 1 + 1) % 1 < 0.5) return o.dash || [0.85, 0.8, 0.5];
      if (Math.abs(p[2] - z0) < 0.05 || Math.abs(p[2] - z1) < 0.05) return [0.7, 0.7, 0.7];
      const c = add([0.1, 0.1, 0.11], 0.7 + R() * 0.6);
      return wet && R() < 0.04 ? add(o.wetCol || [1, 0.8, 0.5], 0.5 + R()) : c;
    } });
  };
  // a street lamp
  const lamp = (B, p, h, col) => {
    B.cyl(p, V.add(p, [0, h, 0]), 0.03, 0.025, 260, { col: [0.25, 0.25, 0.28] });
    B.cyl(V.add(p, [0, h, 0]), V.add(p, [0.35, h + 0.05, 0]), 0.02, 0.02, 80, { col: [0.25, 0.25, 0.28] });
    B.blob(V.add(p, [0.38, h - 0.03, 0]), 0.06, 120, { col: () => add(col || [1, 0.82, 0.5], 1.4) });
    for (let i = 0; i < 400; i++) { const t = B.R(), r = t * 0.6; const a = B.R() * TAU; B.pt([p[0] + 0.38 + Math.cos(a) * r, p[1] + h - t * h, p[2] + Math.sin(a) * r], add(col || [1, 0.82, 0.5], (1 - t) * 0.25)); }
  };
  // a car and its reflection on a wet or shiny ground
  const carRefl = (B, p, yaw, spec, o, k) => {
    K.car(B, p, yaw, spec, o);
    B.push().move(0, 2 * p[1], 0).scale(1, -1, 1);
    K.car(B, p, yaw, spec, Object.assign({}, o, { col: add(o.col || spec.col || [0.7, 0.1, 0.1], k || 0.35), lights: false, n: Math.round((o.n || 9000) * 0.5) }));
    B.pop();
  };

  // ================================================================ 1. a red coupe on a wet street at night
  Cl.add('cars', 'coupe', (B, R) => {
    road(B, -6, 6, -1.5, 1.6, 0, { wet: true, n: 12000 });
    carRefl(B, [0, 0, 0.1], 0.35, C.coupe, { col: [0.8, 0.06, 0.08], n: 12000, spin: 0 }, 0.3);
    for (let i = 0; i < 4; i++) lamp(B, [-4 + i * 2.8, 0, -1.7], 1.9);
    K.skyline(B, -9, 9, -9, -7, 26, { hmax: 3.5 });
  }, { cam: { dist: 5.2, pitch: 0.18, yaw: 0.5, sway: 0.35, target: [0, 0.4, 0] }, sky: ['#04050c', '#14101e', '#0a0608'], horizon: 0.35, breathe: 0.003 });

  // ================================================================ 2. a classic bug under a tree
  Cl.add('cars', 'beetle', (B, R) => {
    B.quad([-5, 0, -3], [10, 0, 0], [0, 0, 5], 8000, { col: (u, v) => mix([0.25, 0.4, 0.15], [0.35, 0.5, 0.2], R()) });
    K.car(B, [0, 0, 0.2], -0.5, C.beetle, { col: [0.2, 0.62, 0.65], n: 11000 });
    K.tree(B, [-1.8, 0, -1.6], 3.2, { leafN: 160, blob: 0.13, leaf: [0.22, 0.45, 0.14] });
    for (let i = 0; i < 300; i++) { const a = R() * TAU, r = R() * 1.6; B.pt([-1.8 + Math.cos(a) * r, 0.005, -1.6 + Math.sin(a) * r * 0.7], [0.06, 0.1, 0.04]); }
  }, { cam: { dist: 5.0, pitch: 0.25, yaw: -0.2, sway: 0.35, target: [-0.3, 0.6, -0.3] }, sky: ['#1a3060', '#5a80a8', '#a8c0c8'], horizon: 0.4, breathe: 0.003 });

  // ================================================================ 3. a pickup in the desert at sunset
  Cl.add('cars', 'pickup', (B, R) => {
    const N = B.N;
    B.terrain(-8, 8, -8, 3, (x, z) => N.fbm(x * 0.3, 2, z * 0.3, 3) * 0.3 * Math.max(0, -z * 0.3), 9000, { col: (u, v, p) => mix([0.6, 0.38, 0.2], [0.8, 0.55, 0.3], 0.5 + N.fbm(p[0] * 2, 0, p[2] * 2, 2)) });
    K.car(B, [0, 0, 0.3], 0.4, C.pickup, { col: [0.55, 0.12, 0.08], n: 12000 });
    const cactus = (p, h) => { B.cyl(p, V.add(p, [0, h, 0]), 0.09, 0.08, 500, { col: [0.2, 0.4, 0.18] }); for (const s of [-1, 1]) { const q = V.add(p, [s * 0.05, h * (0.4 + R() * 0.2), 0]); B.cyl(q, V.add(q, [s * 0.3, 0, 0]), 0.06, 0.06, 120, { col: [0.2, 0.4, 0.18] }); B.cyl(V.add(q, [s * 0.3, 0, 0]), V.add(q, [s * 0.3, h * 0.3, 0]), 0.06, 0.05, 160, { col: [0.2, 0.4, 0.18] }); } };
    cactus([-2.4, 0, -1.5], 1.5); cactus([2.8, 0, -3], 1.2); cactus([-4, 0, -5], 1.8);
    K.mountains(B, -14, 14, -14, 3, 2.5, 8000, { low: [0.45, 0.22, 0.15], high: [0.6, 0.3, 0.2], snow: false });
  }, { cam: { dist: 6, pitch: 0.15, yaw: 0.6, sway: 0.3, target: [0, 0.6, -0.5] }, sky: ['#1a1030', '#c04a30', '#ffb050'], horizon: 0.3, glow: [0.3, 0.32, 0.12, '#ffcc66'], breathe: 0.003 });

  // ================================================================ 4. a formula car at speed
  Cl.add('cars', 'f1', (B, R) => {
    B.u.wrapX = [-12, 24];
    road(B, -12, 12, -1.6, 1.6, 0, { dash: [0.3, 0.3, 0.3], n: 9000 });
    for (let i = 0; i < 48; i++) { const x = -12 + i * 0.5; B.box([x, 0.01, 1.75], 0.48, 0.02, 0.2, 60, { col: i % 2 ? [0.9, 0.1, 0.1] : [0.95, 0.95, 0.95], an: [A.travel, 7] }); B.box([x, 0.01, -1.75], 0.48, 0.02, 0.2, 60, { col: i % 2 ? [0.9, 0.1, 0.1] : [0.95, 0.95, 0.95], an: [A.travel, 7] }); }
    K.car(B, [0, 0, 0], 0, C.f1, { col: [0.9, 0.1, 0.12], n: 10000, spin: 18 });
    // wings
    B.box([-1.35, 0.12, 0], 0.25, 0.03, 1.1, 500, { col: [0.15, 0.15, 0.16] }); B.box([1.2, 0.55, 0], 0.3, 0.04, 0.95, 500, { col: [0.15, 0.15, 0.16] });
    B.cyl([1.15, 0.3, 0.35], [1.15, 0.55, 0.35], 0.02, 0.02, 60, { col: [0.15, 0.15, 0.16] }); B.cyl([1.15, 0.3, -0.35], [1.15, 0.55, -0.35], 0.02, 0.02, 60, { col: [0.15, 0.15, 0.16] });
    for (let i = 0; i < 600; i++) { const p = [-12 + R() * 24, 0.1 + R() * 1.2, (R() - 0.5) * 4]; B.line(p, V.add(p, [0.5 + R(), 0, 0]), [0, 0, 0], [0.7, 0.75, 0.85], [A.travel, 14]); }
    for (let i = 0; i < 30; i++) K.tower(B, [-12 + i * 0.8, 0, -4], 0.7, 0.8 + R() * 0.3, 0.6, { on: 0.8, lit: [0.9, 0.9, 1], n: 300, faces: [4] });
  }, { cam: { dist: 4.6, pitch: 0.22, yaw: 0.9, sway: 0.25, target: [0, 0.3, 0] }, sky: ['#02040a', '#0a1020', '#04060a'], horizon: 0.4, breathe: 0.002 });

  // ================================================================ 5. an off-roader on rocks
  Cl.add('cars', 'jeep', (B, R) => {
    const N = B.N;
    B.terrain(-7, 7, -7, 3, (x, z) => N.fbm(x * 0.6, 1, z * 0.6, 4) * 0.5 - 0.05, 12000, { col: (u, v, p) => mix([0.35, 0.28, 0.2], [0.55, 0.45, 0.32], 0.5 + N.fbm(p[0] * 3, 3, p[2] * 3, 2)) });
    for (let i = 0; i < 9; i++) K.rock(B, [(R() - 0.5) * 8, 0, -1 - R() * 4], 0.2 + R() * 0.4, 400, [0.45, 0.4, 0.35]);
    K.car(B, [0, 0.12, 0.3], -0.6, C.jeep, { col: [0.3, 0.38, 0.22], n: 11000 });
    B.cyl([0.95, 0.75, 0.3], [1.0, 0.75, 0.3], 0.22, 0.22, 400, { col: [0.06, 0.06, 0.06] });
    K.mountains(B, -16, 16, -16, 3, 4, 9000, { low: [0.2, 0.22, 0.2], high: [0.4, 0.4, 0.42] });
  }, { cam: { dist: 5.5, pitch: 0.2, yaw: -0.5, sway: 0.3, target: [0, 0.6, -0.4] }, sky: ['#18304a', '#7088a0', '#c0a080'], horizon: 0.38, breathe: 0.003 });

  // ================================================================ 6. a muscle car at a night gas station
  Cl.add('cars', 'gas-station', (B, R) => {
    B.quad([-6, 0, -3], [12, 0, 0], [0, 0, 6], 9000, { col: () => add([0.18, 0.18, 0.2], 0.7 + R() * 0.5) });
    // canopy
    B.box([0, 2.0, -0.6], 5, 0.25, 2.6, 4000, { col: (f) => (f === 3 ? [1.4, 1.35, 1.25, 1] : f === 4 ? [0.85, 0.12, 0.1] : [0.9, 0.9, 0.9]) });
    for (const x of [-2, 2]) B.cyl([x, 0, -0.6], [x, 1.9, -0.6], 0.08, 0.08, 400, { col: [0.85, 0.85, 0.85] });
    for (const x of [-1, 1]) { B.box([x, 0.4, -1.1], 0.4, 0.8, 0.3, 700, { col: (f) => (f === 4 ? [0.15, 0.2, 0.25] : [0.85, 0.1, 0.1]) }); B.blob([x, 0.6, -0.95], 0.05, 40, { col: () => [0.4, 1, 0.6] }); }
    for (let i = 0; i < 1500; i++) { const a = R() * TAU, r = Math.sqrt(R()) * 2.6; B.pt([Math.cos(a) * r, 0.005, -0.6 + Math.sin(a) * r * 0.6], [0.5, 0.48, 0.45]); }
    K.car(B, [0.2, 0, 0.6], 0.15, C.muscle, { col: [0.1, 0.2, 0.6], n: 11000 });
    K.stars(B, 800, 30, { half: true });
  }, { cam: { dist: 6, pitch: 0.12, yaw: 0.6, sway: 0.3, target: [0, 0.8, -0.2] }, sky: ['#02030a', '#0a0c18', '#04040a'], horizon: 0.3, breathe: 0.002 });

  // ================================================================ 7. a vintage roadster on a cobbled street
  Cl.add('cars', 'roadster', (B, R) => {
    B.quad([-6, 0, -2.5], [12, 0, 0], [0, 0, 5], 12000, { lit: false, col: (u, v, p) => { const cx = (p[0] * 6) % 1, cz = (p[2] * 5 + Math.floor(p[0] * 6) * 0.5) % 1; return Math.abs(cx) < 0.12 || Math.abs(cz) < 0.12 ? [0.08, 0.07, 0.06] : add([0.4, 0.33, 0.25], 0.6 + R() * 0.3); } });
    K.car(B, [0, 0, 0.3], -0.35, C.roadster, { col: [0.1, 0.25, 0.18], n: 11000, rim: [0.85, 0.8, 0.6] });
    for (let i = 0; i < 3; i++) lamp(B, [-3 + i * 3, 0, -1.6], 2.2, [1, 0.7, 0.35]);
    for (let i = 0; i < 8; i++) K.tower(B, [-7 + i * 2, 0, -3.2], 1.8, 2.2 + R(), 1, { on: 0.45, lit: [1, 0.75, 0.4], wall: [0.25, 0.18, 0.13], n: 1100, floor: 0.4, bay: 0.4, faces: [4, 2] });
  }, { cam: { dist: 5.4, pitch: 0.16, yaw: -0.3, sway: 0.3, target: [0, 0.7, -0.4] }, sky: ['#06040a', '#1a1018', '#0c0806'], horizon: 0.4, fog: ['#1a1210', 5, 12], breathe: 0.003 });

  // ================================================================ 8. a red bus in the city
  Cl.add('cars', 'bus', (B, R) => {
    road(B, -8, 8, -1.8, 1.8, 0, { n: 9000 });
    K.car(B, [0, 0, 0.4], 0.25, C.bus, { col: [0.82, 0.08, 0.08], n: 14000 });
    K.skyline(B, -10, 10, -6, -3, 20, { hmax: 3, hmin: 1.2 });
    for (let i = 0; i < 5; i++) lamp(B, [-6 + i * 3, 0, -2], 2.2);
  }, { cam: { dist: 7, pitch: 0.12, yaw: 0.55, sway: 0.3, target: [0, 1, 0] }, sky: ['#0a1428', '#3a4a6a', '#8a7060'], horizon: 0.35, breathe: 0.003 });

  // ================================================================ 9. a motorbike
  Cl.add('cars', 'motorbike', (B, R) => {
    road(B, -7, 7, -1.5, 1.5, 0, { n: 9000 });
    B.push().rotY(0.5);
    const wr = 0.34, fx = -0.75, rx = 0.75;
    for (const x of [fx, rx]) {
      const g = B.pivot([x, wr, 0], [0, 0, 1], 0);
      B.with([A.spin, 0, g], () => { B.push().move(x, wr, 0).rotX(PI / 2); B.torus([0, 0, 0], wr * 0.82, wr * 0.18, 1500, { col: [0.06, 0.06, 0.07] }); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; B.line([0, 0, 0], [Math.cos(a) * wr * 0.7, 0, Math.sin(a) * wr * 0.7], [0.7, 0.7, 0.72]); } B.disc([0, 0, 0], 0, 0.06, 80, { col: [0.6, 0.6, 0.62] }); B.pop(); });
    }
    const tube = (a, b, r, c) => B.cyl(a, b, r, r, Math.round(500 * V.len(V.sub(b, a)) + 60), { col: c || [0.15, 0.15, 0.16] });
    tube([rx, wr, 0], [0.1, 0.55, 0], 0.035); tube([0.1, 0.55, 0], [-0.45, 0.95, 0], 0.04); tube([fx, wr, 0.06], [-0.5, 1.05, 0.06], 0.03, [0.7, 0.7, 0.72]); tube([fx, wr, -0.06], [-0.5, 1.05, -0.06], 0.03, [0.7, 0.7, 0.72]);
    B.ellip([-0.2, 0.95, 0], 0.32, 0.14, 0.17, 2200, { col: [0.95, 0.55, 0.05] });
    B.ellip([0.3, 0.88, 0], 0.32, 0.06, 0.15, 900, { col: [0.1, 0.07, 0.05] });
    B.box([0.0, 0.5, 0], 0.4, 0.3, 0.26, 1100, { col: [0.3, 0.3, 0.32] });
    tube([-0.5, 1.05, -0.35], [-0.5, 1.05, 0.35], 0.02, [0.7, 0.7, 0.72]);
    tube([0.0, 0.42, 0.15], [0.95, 0.6, 0.15], 0.04, [0.75, 0.75, 0.78]);
    B.blob([-0.62, 0.95, 0], 0.07, 120, { col: () => [1, 0.95, 0.8] });
    B.pop();
    K.skyline(B, -10, 10, -8, -6, 22, { hmax: 3 });
  }, { cam: { dist: 4, pitch: 0.12, yaw: 0.4, sway: 0.35, target: [0, 0.6, 0] }, sky: ['#04050c', '#121428', '#1a1010'], horizon: 0.35, breathe: 0.002 });

  // ================================================================ 10. cars racing round an oval
  Cl.add('cars', 'race-oval', (B, R) => {
    for (let i = 0; i < 16000; i++) { const a = R() * TAU, r = 3 + R() * 1.4; B.pt([Math.cos(a) * r, 0, Math.sin(a) * r], add([0.13, 0.13, 0.14], 0.7 + R() * 0.5)); }
    for (let i = 0; i < 3000; i++) { const a = R() * TAU; B.pt([Math.cos(a) * 3, 0.01, Math.sin(a) * 3], Math.sin(a * 60) > 0 ? [0.9, 0.1, 0.1] : [0.95, 0.95, 0.95]); B.pt([Math.cos(a) * 4.4, 0.01, Math.sin(a) * 4.4], [0.85, 0.85, 0.85]); }
    B.disc([0, -0.01, 0], 0, 2.95, 6000, { col: () => mix([0.15, 0.32, 0.12], [0.22, 0.42, 0.15], R()) });
    const cols = [[0.9, 0.1, 0.1], [0.1, 0.35, 0.9], [0.95, 0.8, 0.1], [0.1, 0.7, 0.3], [0.95, 0.45, 0.1], [0.85, 0.85, 0.9]];
    cols.forEach((c, i) => {
      const g = B.pivot([0, 0, 0], [0, 1, 0], -(0.42 + i * 0.03));
      const a = (i / cols.length) * TAU, r = 3.35 + (i % 3) * 0.4;
      B.with([A.spin, 0, g], () => { B.push().move(Math.cos(a) * r, 0, Math.sin(a) * r).rotY(-a).scale(0.55); K.car(B, [0, 0, 0], PI / 2, C.f1, { col: c, n: 2500, lights: false }); B.pop(); });
    });
    for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; K.tower(B, [Math.cos(a) * 5.4, 0, Math.sin(a) * 5.4], 0.7, 0.6, 0.5, { on: 0.7, lit: [0.9, 0.9, 1], n: 200, faces: [4, 5, 0, 1, 2] }); }
  }, { cam: { dist: 9, pitch: 0.65, sway: 0.25, spin: 0.03 }, sky: ['#02030a', '#08101c', '#02030a'], breathe: 0.002 });

  // ================================================================ 11. a highway at night in long exposure
  Cl.add('cars', 'light-trails', (B, R) => {
    B.u.wrapX = [-14, 28];
    road(B, -14, 14, -2.2, 2.2, 0, { n: 8000, dash: [0.4, 0.4, 0.4] });
    for (let i = 0; i < 5000; i++) { const lane = (i % 4), z = -1.8 + lane * 0.5 + (R() - 0.5) * 0.05, white = lane < 2; B.pt([-14 + R() * 28, 0.25 + (R() - 0.5) * 0.04, z], white ? add([1, 0.95, 0.85], 1 + R() * 0.5) : add([1, 0.12, 0.08], 1 + R() * 0.4), [A.travel, white ? 9 : -9]); }
    for (let i = 0; i < 6; i++) { const x = -10 + i * 4; B.cyl([x, 0, -2.5], [x, 2.4, -2.5], 0.04, 0.04, 200, { col: [0.3, 0.3, 0.3] }); B.cyl([x, 2.4, -2.5], [x, 2.4, -1.2], 0.03, 0.03, 120, { col: [0.3, 0.3, 0.3] }); B.blob([x, 2.35, -1.2], 0.06, 80, { col: () => [1, 0.75, 0.4] }); }
    K.skyline(B, -16, 16, -12, -8, 30, { hmax: 5 });
  }, { cam: { dist: 6, pitch: 0.2, yaw: 0.75, sway: 0.25, target: [0, 0.8, -0.5] }, sky: ['#04040c', '#141020', '#0a0608'], horizon: 0.35, breathe: 0.002 });

  // ================================================================ 12. a car on a winding mountain road
  Cl.add('cars', 'mountain-road', (B, R) => {
    const N = B.N, path = (t) => [Math.sin(t * 3.2) * 2.2, -0.6 + t * 2.4, 3 - t * 12];
    B.terrain(-9, 9, -12, 4, (x, z) => -1.2 + N.fbm(x * 0.2, 1, z * 0.2, 4) * 1.5 + Math.max(0, -z) * 0.25 + Math.abs(x) * 0.15, 14000, { col: (u, v, p) => mix([0.15, 0.3, 0.12], [0.3, 0.32, 0.25], 0.5 + N.fbm(p[0], 0, p[2], 2)) });
    for (let i = 0; i < 9000; i++) { const t = R(), p = path(t), w = (R() - 0.5) * 0.9; B.pt([p[0] + w, p[1] + 0.02, p[2]], Math.abs(w) < 0.02 ? [0.9, 0.85, 0.5] : add([0.2, 0.2, 0.22], 0.8 + R() * 0.4)); }
    for (let i = 0; i < 700; i++) { const t = R(), p = path(t); B.pt([p[0] - 0.5, p[1] + 0.12, p[2]], [0.8, 0.8, 0.82]); }
    const p0 = path(0.08);
    B.push().move(p0[0], p0[1], p0[2]).scale(0.45); K.car(B, [0, 0, 0], PI / 2 + 0.3, C.coupe, { col: [0.95, 0.75, 0.1], n: 5000 }); B.pop();
    for (let i = 0; i < 26; i++) K.pine(B, [(R() < 0.5 ? -1 : 1) * (2.5 + R() * 5), 0, -R() * 10], 0.8 + R() * 0.8, { n: 500 });
    K.mountains(B, -20, 20, -22, 4, 7, 9000, { low: [0.18, 0.22, 0.2], high: [0.4, 0.42, 0.45] });
  }, { cam: { dist: 6.5, pitch: 0.3, sway: 0.25, target: [0, 0.5, -2] }, sky: ['#2a4a7a', '#8aa8c8', '#d8d0c0'], horizon: 0.5, fog: ['#8090a0', 9, 25], breathe: 0.002 });

  // ================================================================ 13. a convertible on a coast road at sunset
  Cl.add('cars', 'coast-road', (B, R) => {
    K.sea(B, 14, 10, -1.5, 12000, [0.12, 0.08, 0.12], { amp: 0.03, glint: [0, 0.6, -12], glintCol: [1, 0.6, 0.3] });
    road(B, -8, 8, -0.6, 1.2, 0, { n: 8000 });
    for (let i = 0; i < 3000; i++) { const x = -8 + R() * 16; B.pt([x, 0.12 + R() * 0.05, -0.65], [0.85, 0.85, 0.85]); }
    B.quad([-8, -1.5, 1.25], [16, 0, 0], [0, 1.5, 0.05], 5000, { col: () => mix([0.4, 0.3, 0.22], [0.5, 0.4, 0.3], R()) });
    K.car(B, [0.5, 0, 0.3], 0.2, C.roadster, { col: [0.9, 0.85, 0.75], n: 11000, rim: [0.85, 0.85, 0.9] });
    for (const x of [-4, 4]) K.palm(B, [x, 0, 1.6], 2.6, 0.2);
  }, { cam: { dist: 5.6, pitch: 0.12, yaw: 0.35, sway: 0.3, target: [0, 0.6, -1] }, sky: ['#201040', '#c04a50', '#ff9a50'], horizon: 0.42, glow: [0.45, 0.43, 0.12, '#ffb060'], breathe: 0.003 });

  // ================================================================ 14. a rally car throwing dust
  Cl.add('cars', 'rally', (B, R) => {
    const N = B.N;
    B.terrain(-8, 8, -8, 3, (x, z) => N.fbm(x * 0.4, 5, z * 0.4, 3) * 0.25, 10000, { col: (u, v, p) => mix([0.55, 0.42, 0.28], [0.68, 0.55, 0.38], 0.5 + N.fbm(p[0] * 3, 1, p[2] * 3, 2)) });
    K.car(B, [0, 0, 0.2], 0.3, Object.assign({}, C.coupe, { stripe2: 0.2, stripeCol: [0.1, 0.35, 0.95] }), { col: [0.95, 0.95, 0.95], n: 11000, spin: 12 });
    for (let i = 0; i < 6000; i++) { const t = R(), a = R() * TAU, r = 0.1 + t * 1.6; B.pt([0.9 + t * 2.8 + Math.cos(a) * r * 0.3, 0.05 + Math.abs(Math.sin(a)) * r * 0.6, 0.2 + Math.sin(a) * r * 0.5], add([0.75, 0.62, 0.45], 0.45 + (1 - t) * 0.4), [A.rise, 0.25 + R() * 0.2, 0.5]); }
    for (let i = 0; i < 14; i++) K.pine(B, [(R() - 0.5) * 14, 0, -3 - R() * 5], 1.2 + R(), { n: 500 });
  }, { cam: { dist: 5.4, pitch: 0.16, yaw: -0.6, sway: 0.3, target: [0.4, 0.5, 0] }, sky: ['#3a5a8a', '#a0b8d0', '#e0d8c0'], horizon: 0.4, fog: ['#b0a890', 6, 16], breathe: 0.003 });

  // ================================================================ 15. a monster truck over a row of wrecks
  Cl.add('cars', 'monster-truck', (B, R) => {
    B.quad([-7, 0, -4], [14, 0, 0], [0, 0, 7], 9000, { col: () => mix([0.3, 0.22, 0.14], [0.4, 0.3, 0.2], R()) });
    for (let i = 0; i < 3; i++) { B.push().move(-1.6 + i * 1.6, 0, -0.1).scale(1, 0.4, 1); K.car(B, [0, 0, 0], PI / 2, C.coupe, { col: [[0.5, 0.5, 0.55], [0.4, 0.2, 0.15], [0.2, 0.3, 0.45]][i], n: 3000, lights: false }); B.pop(); }
    K.car(B, [0, 0.4, 0.2], 0.3, C.monster, { col: [0.1, 0.65, 0.2], n: 12000, spin: 3, rim: [0.85, 0.85, 0.2] });
    for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; B.blob([Math.cos(a) * 6, 2.5 + Math.sin(i) * 0.2, Math.sin(a) * 4 - 2], 0.08, 30, { col: () => [1, 0.95, 0.85] }); }
  }, { cam: { dist: 6.4, pitch: 0.12, yaw: 0.5, sway: 0.3, target: [0, 1.1, 0] }, sky: ['#02030a', '#0a0c18', '#04040a'], horizon: 0.3, breathe: 0.003 });

  // ================================================================ 16. a taxi in the rain
  Cl.add('cars', 'taxi-rain', (B, R) => {
    road(B, -7, 7, -1.6, 1.6, 0, { wet: true, wetCol: [1, 0.3, 0.6], n: 12000 });
    carRefl(B, [0, 0, 0.2], 0.4, C.taxi, { col: [0.98, 0.78, 0.08], n: 12000 }, 0.3);
    B.box([0.05, 0.84, 0.2], 0.3, 0.08, 0.15, 150, { col: [1, 0.95, 0.7, 1] });
    for (let i = 0; i < 9; i++) { K.tower(B, [-8 + i * 2, 0, -2.6], 1.8, 2 + R() * 2, 1, { on: 0.5, lit: R() < 0.5 ? [1, 0.3, 0.7] : [0.3, 0.8, 1], n: 1100, faces: [4, 2] }); B.box([-8 + i * 2, 1.3, -2.0], 0.9, 0.25, 0.04, 200, { col: [R() < 0.5 ? 1 : 0.2, 0.3, R() < 0.5 ? 0.9 : 0.4, 1], an: [A.twinkle, 2 + R() * 4] }); }
    K.rain(B, 6, 3, -0.2, 4, 1600, { speed: 8 });
  }, { cam: { dist: 5.2, pitch: 0.15, yaw: 0.45, sway: 0.3, target: [0, 0.6, -0.3] }, sky: ['#04050a', '#0a0c14', '#06060a'], horizon: 0.35, breathe: 0.003 });

  // ================================================================ 17. a camper van by a lake with a fire
  Cl.add('cars', 'camper', (B, R) => {
    K.sea(B, 10, 6, -0.05, 8000, [0.03, 0.05, 0.1], { amp: 0.01, glint: [-2.4, 0.3, -12], glintCol: [0.9, 0.92, 1] });
    B.quad([-6, 0, 0.3], [12, 0, 0], [0, 0, 3], 6000, { col: () => mix([0.12, 0.18, 0.08], [0.2, 0.25, 0.12], R()) });
    K.car(B, [0.3, 0, 1.4], -0.3, Object.assign({}, C.van, { stripeCol: [0.95, 0.95, 0.9] }), { col: [0.3, 0.6, 0.62], n: 12000 });
    K.fire(B, [-1.6, 0, 1.8], 0.18, 0.7, 1500);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; B.sphere([-1.6 + Math.cos(a) * 0.28, 0.04, 1.8 + Math.sin(a) * 0.28], 0.06, 60, { col: [0.4, 0.38, 0.35] }); }
    K.moon(B, [-2.4, 3, -14], 0.6, 2500);
    K.stars(B, 1600, 30, { half: true });
    K.mountains(B, -18, 18, -16, 3, 3, 7000, { low: [0.03, 0.05, 0.06], high: [0.1, 0.12, 0.15] });
  }, { cam: { dist: 5.8, pitch: 0.1, yaw: 0.5, sway: 0.3, target: [-0.3, 0.7, 0.5] }, sky: ['#02040c', '#0a1428', '#04060c'], horizon: 0.38, breathe: 0.003 });

  // ================================================================ 18. a hover car over a neon city
  Cl.add('cars', 'hover-car', (B, R) => {
    B.u.wrapX = [-14, 28];
    for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 22, z = -2 - R() * 12, h = 2 + R() * 8; K.tower(B, [x, -6, z], 0.6 + R() * 0.8, h, 0.6 + R() * 0.6, { on: 0.35, lit: R() < 0.5 ? [1, 0.25, 0.8] : [0.25, 0.85, 1], n: 900, faces: [4, 0, 1, 2], beacon: R() < 0.3 }); }
    for (let i = 0; i < 4000; i++) { const lane = i % 3; B.pt([-14 + R() * 28, 0.6 + lane * 0.9, -3 - lane * 2], lane === 1 ? [1, 0.3, 0.3] : [1, 0.95, 0.85], [A.travel, lane === 1 ? -6 : 6]); }
    K.car(B, [0, 0.6, 0.6], 0.3, C.hover, { col: [0.85, 0.85, 0.9], n: 11000 });
    B.blob([0, 0.62, 0.6], 0.35, 1500, { sq: [2.5, 0.25, 1.2], col: () => [0.3, 0.8, 1] });
    for (let i = 0; i < 600; i++) B.pt([(R() - 0.5) * 1.6, 0.55 - R() * 0.6, 0.6 + (R() - 0.5) * 0.7], add([0.3, 0.8, 1], 0.6), [A.rise, 1, -0.5]);
  }, { cam: { dist: 5.2, pitch: 0.12, yaw: 0.35, sway: 0.3, target: [0, 0.8, 0] }, sky: ['#08021a', '#2a0838', '#601040'], horizon: 0.25, fog: ['#30082a', 6, 18], breathe: 0.004 });

  // ================================================================ 19. a tractor in the fields with a barn
  Cl.add('cars', 'tractor', (B, R) => {
    for (let i = 0; i < 14000; i++) { const x = -8 + R() * 16, z = -9 + R() * 11, row = Math.sin(z * 9) > 0.3; B.pt([x, row ? 0.05 : 0, z], row ? add([0.65, 0.55, 0.2], 0.7 + R() * 0.4) : add([0.35, 0.25, 0.15], 0.6 + R() * 0.4)); }
    K.car(B, [0, 0, 0.3], -0.4, C.tractor, { col: [0.15, 0.55, 0.15], n: 8000, rim: [0.95, 0.8, 0.1] });
    // the big rear wheels
    for (const s of [-1, 1]) { B.push().move(0.55 * Math.cos(0.4), 0.42, 0.3 + s * 0.48).rotY(-0.4).rotX(PI / 2); B.torus([0, 0, 0], 0.34, 0.1, 1500, { col: [0.06, 0.06, 0.06] }); B.disc([0, 0, 0], 0, 0.26, 400, { col: [0.95, 0.8, 0.1] }); B.pop(); }
    // barn
    B.box([-3.2, 1.0, -4], 2.4, 2, 1.8, 5000, { col: (f, a, b) => (f === 4 && a > 0.35 && a < 0.65 && b < 0.6 ? [0.95, 0.95, 0.9] : [0.7, 0.12, 0.08]) });
    B.surf((u, v) => [-4.4 + u * 2.4, 2.0 + (1 - Math.abs(v * 2 - 1)) * 0.8, -4.9 + v * 1.8], 2500, { col: [0.35, 0.3, 0.3] });
    for (let i = 0; i < 8; i++) K.tree(B, [2 + i * 0.9, 0, -6.5 - R()], 1.6 + R() * 0.6, { leafN: 90 });
  }, { cam: { dist: 6.2, pitch: 0.18, yaw: 0.3, sway: 0.3, target: [-0.6, 0.8, -1] }, sky: ['#2a5a9a', '#90b8d8', '#e8e0c0'], horizon: 0.45, breathe: 0.003 });

  // ================================================================ 20. an angular electric truck in a studio
  Cl.add('cars', 'studio', (B, R) => {
    B.surf((u, v) => { const x = (u - 0.5) * 12, z = -3 + v * 7, y = z < -1 ? (-1 - z) * (-1 - z) * 0.6 : 0; return [x, y, z]; }, 14000, { col: (u, v, p) => add([0.85, 0.85, 0.9], 0.05 + 0.65 * Math.exp(-(p[0] * p[0] + (p[2] - 0.3) * (p[2] - 0.3)) * 0.3)) });
    carRefl(B, [0, 0, 0.3], 0.55, C.wedge, { col: [0.62, 0.64, 0.68], n: 13000, rim: [0.2, 0.2, 0.22] }, 0.2);
    for (let i = 0; i < 700; i++) { const t = R(); B.pt([-0.8 + t * 1.6, 0.98 + (1 - Math.abs(t - 0.5) * 2) * 0.05, 0.3], [1.3, 1.3, 1.4]); }
  }, { skyK: 1, cam: { dist: 5.6, pitch: 0.2, yaw: -0.4, sway: 0.4, target: [0, 0.5, 0] }, sky: ['#040406', '#0a0a0e', '#060608'], breathe: 0.002 });
})();
