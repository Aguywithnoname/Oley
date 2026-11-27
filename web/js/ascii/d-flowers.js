/* Oley · ASCII designs: flowers. A small botanical kit (stems, leaves, lilies, tulips, roses, daisies,
   sunflowers, poppies, lotus, blossom, orchids, irises, hibiscus, peonies, callas, bells, dandelions,
   lavender, hydrangea) and twenty compositions built from it. */
(function () {
  'use strict';
  const O = window.Oley, Cl = O.Cloud, V = Cl.V, A = Cl.A;
  const TAU = Math.PI * 2, PI = Math.PI;
  const mix = Cl.mix, sm = Cl.smooth, hx = Cl.hex, K = Cl.K;
  const add = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // ---------------------------------------------------------------- the kit
  const F = (Cl.F = {});
  // a stem: a quadratic curve a → c → b
  F.stem = function (B, a, c, b, r, col, n) {
    const f = (t) => { const m = 1 - t; return [m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1], m * m * a[2] + 2 * m * t * c[2] + t * t * b[2]]; };
    const L = V.len(V.sub(a, c)) + V.len(V.sub(c, b));
    B.tube(f, (u) => r * (1 - 0.35 * u), n || Math.round(900 * L + 200), { col: col || [0.22, 0.42, 0.13] });
    return f;
  };
  // a leaf from p along axis, opening toward azimuth az
  F.leaf = function (B, p, axis, az, L, o) {
    o = o || {};
    const d = o.dark || [0.09, 0.25, 0.07], l = o.light || [0.3, 0.52, 0.16];
    B.push().aim(axis, p);
    B.petal({ L, W: L * (o.w || 0.14), az, open0: o.open0 == null ? 0.9 : o.open0, open: o.open == null ? 0.45 : o.open, curl: o.curl == null ? 0.3 : o.curl, cup: 0.5, twist: (B.R() - 0.5) * 0.8, ruf: 0.04, fr: 9, n: o.n || Math.round(1700 * L),
      col: (u, v) => { let c = mix(d, l, 0.25 + 0.5 * B.R() * u); if (v < 0.06) c = mix(c, l, 0.6); return c; }, hairP: 0.04, hairLen: 0.03, hairCol: [0.6, 0.75, 0.45] });
    B.pop();
  };
  // stamens and a pistil standing out of a flower's throat (local +z)
  F.stamens = function (B, L, o) {
    o = o || {};
    const R = B.R, n = o.n || 6, base = R() * TAU;
    for (let i = 0; i <= n; i++) {
      const pist = i === n, a = pist ? R() * TAU : base + (i * TAU) / n + (R() - 0.5) * 0.4;
      const len = L * (pist ? o.pist || 0.78 : (o.len || 0.6) * (0.9 + R() * 0.2)), spread = pist ? 0.1 : o.spread || 0.38;
      const ca = Math.cos(a), sa = Math.sin(a);
      const at = (t) => [ca * spread * len * t * t, sa * spread * len * t * t, len * t * (1 - 0.12 * t)];
      for (let k = 0; k < (o.fil || 260); k++) { const t = R(), p = at(t); B.pt(p, pist ? [0.6, 0.72, 0.36] : mix(o.filCol || [0.75, 0.82, 0.32], [0.95, 0.8, 0.25], t)); }
      const tip = at(1);
      B.blob(tip, L * (pist ? 0.018 : 0.026), pist ? 60 : 160, { sq: pist ? [1, 1, 1] : [1.6, 0.7, 0.7], col: () => (pist ? [0.42, 0.5, 0.2] : mix(o.anther || [0.55, 0.18, 0.05], [0.95, 0.5, 0.14], R())) });
    }
  };
  // a lily: two whorls of three recurved, ruffled petals
  F.lily = function (B, p, axis, L, pal, o) {
    o = o || {};
    const R = B.R, droop = !!o.wilt, base = R() * TAU, nP = o.n || 1500;
    B.push().aim(axis, p);
    for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) {
      const az = base + (i * TAU) / 3 + (k ? TAU / 6 : 0) + (R() - 0.5) * 0.24;
      const inner = k === 1;
      B.petal({
        L: L * (0.9 + R() * 0.16), W: L * (inner ? 0.21 + R() * 0.03 : 0.15 + R() * 0.03), az,
        open0: droop ? 0.1 : 0.7 + R() * 0.2, open: droop ? 0.5 : 0.9 + R() * 0.35, curl: droop ? 0.8 : 1.2 + R() * 1.1,
        twist: (R() - 0.5) * 2, bend: (R() - 0.5) * 0.36, cup: 0.22 + R() * 0.18, ruf: 0.16 + R() * 0.14, fr: 16 + R() * 10,
        n: inner ? nP : Math.round(nP * 0.8), spots: droop ? 0 : pal.spots || 0, spotCol: pal.spot,
        col: (u, v, front) => {
          if (droop) return mix(mix(pal.wilt || [0.88, 0.76, 0.26], pal.edge || [1, 0.86, 0.91], sm(0.8, 1, v) * 0.7), [0.74, 0.4, 0.5], 0.2 + 0.2 * Math.sin(u * 9));
          if (!front) return mix(mix(pal.back || [0.8, 0.42, 0.55], [0.66, 0.7, 0.34], (1 - sm(0, 0.35, v)) * 0.75), pal.edge || [1, 0.86, 0.91], sm(0.8, 1, v) * 0.7);
          let c = mix(pal.main, pal.mid || pal.main, sm(0.3, 0.85, v));
          if (v < 0.12 && u > 0.25) c = mix(c, pal.deep || add(pal.main, 0.5), 0.35 * (1 - v / 0.12));
          c = mix(c, pal.edge || [1, 0.86, 0.91], Math.max(sm(0.8, 1, v), sm(0.86, 1, u) * 0.6));
          return mix(c, pal.throat || [0.9, 0.82, 0.22], (1 - sm(0.12, 0.5, u)) * (1 - sm(0.08, 0.3 + 0.2 * (1 - u), v)));
        },
        hairP: droop ? 0.03 : 0.07, hairLen: 0.05, hairCol: droop ? [0.95, 0.88, 0.6] : [0.97, 0.85, 0.9],
      });
    }
    if (!droop) F.stamens(B, L, { anther: pal.anther });
    B.pop();
  };
  // a closed bud
  F.bud = function (B, p, axis, L, c0, c1) {
    B.push().aim(axis, p);
    B.surf((u, v) => {
      const th = v * TAU, rib = Math.cos(3 * th), rad = 0.17 * L * Math.pow(Math.sin(PI * Math.pow(u, 0.72)), 0.8) * (1 + 0.1 * rib);
      return [rad * Math.cos(th), rad * Math.sin(th), u * L];
    }, Math.round(5000 * L), { col: (u) => mix(c0 || [0.28, 0.46, 0.14], c1 || [0.88, 0.84, 0.3], sm(0.05, 0.55, u)), hair: { p: 0.05, len: L * 0.03, c0: [0.9, 0.88, 0.5], c1: [1, 1, 0.85] } });
    B.pop();
  };
  // a tulip: six cupped petals that stay mostly closed
  F.tulip = function (B, p, axis, L, col, o) {
    o = o || {};
    const R = B.R, base = R() * TAU, open = o.open == null ? 0.15 : o.open;
    B.push().aim(axis, p);
    for (let k = 0; k < 2; k++) for (let i = 0; i < 3; i++) {
      B.petal({ L: L * (0.95 + R() * 0.1), W: L * 0.46, az: base + (i * TAU) / 3 + (k ? TAU / 6 : 0), open0: 0.35 + open, open: 0.1 + open, curl: -0.55 + open * 0.8, cup: 0.65, twist: (R() - 0.5) * 0.3, ruf: 0.02,
        shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.92 + 0.08)), 0.5) * (1 - 0.25 * u * u),
        n: o.n || 1100, col: (u, v, front) => { let c = mix(add(col, 0.55), col, sm(0, 0.4, u)); if (o.edge) c = mix(c, o.edge, sm(0.75, 1, Math.max(v, u * 0.9))); return front ? c : add(c, 0.7); } });
    }
    B.pop();
  };
  // a rose (or peony): petals are cupped segments of a widening bowl laid in a spiral — the inner ones wrap
  // tight round the heart, the outer ones open, and their rims roll back
  F.rose = function (B, p, axis, L, col, o) {
    o = o || {};
    const N = o.petals || 22, ruf = o.ruf == null ? 0.025 : o.ruf, heart = o.heart || add(col, 0.55), rimC = o.edge || mix(col, [1, 1, 1], 0.25);
    const g0 = B.grain; B.grain = 0.12;
    B.push().aim(axis, p);
    for (let k = 0; k < N; k++) {
      const q = k / (N - 1), r0 = L * (0.05 + 0.4 * Math.pow(q, 0.85)), h = L * (0.4 + 0.25 * q) * (o.flat ? 1 - 0.4 * q : 1);
      const span = 2.7 - 1.1 * q, az = k * 2.39996, flare = (o.flare || 1) * (0.1 + 0.9 * q * q), lean = q * (o.open || 0.5);
      B.surf((u, v) => {
        const a = az + (v - 0.5) * span, side = Math.sin(PI * v), rim = sm(0.5, 1, u);
        let r = r0 * (0.5 + 0.5 * Math.sin(u * PI * 0.55 + 0.25)) + rim * rim * L * 0.18 * flare + u * lean * L * 0.35;
        r += ruf * L * Math.sin(v * 15 + k * 2.7) * rim;
        const z = u * h - rim * rim * flare * L * 0.08 - (1 - side) * 0.05 * L * u;
        return [Math.cos(a) * r, Math.sin(a) * r, z];
      }, Math.round((o.n || 650) * (0.45 + q)), { col: (u, v) => mix(mix(heart, col, sm(0, 0.5, u) * (0.5 + 0.5 * q)), rimC, sm(0.85, 1, u) * 0.5 * (0.3 + q)) });
    }
    B.pop();
    B.grain = g0;
  };
  // a daisy-like flower: many thin flat petals round a domed disc
  F.daisy = function (B, p, axis, L, pc, cc, o) {
    o = o || {};
    const R = B.R, N = o.petals || 22, base = R() * TAU;
    B.push().aim(axis, p);
    for (let i = 0; i < N; i++) B.petal({ L: L * (0.9 + R() * 0.15), W: L * (o.w || 0.08), az: base + (i * TAU) / N + (R() - 0.5) * 0.1, open0: o.flat == null ? 1.35 : o.flat, open: o.droop || 0.25, curl: 0.1, cup: 0.25, ruf: 0, r0: o.r0 || 0.22,
      shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.88 + 0.12)), 0.4), n: o.n || 260, col: (u, v, front) => (front ? mix(add(pc, 0.8), pc, sm(0, 0.3, u)) : add(pc, 0.7)) });
    const r = L * (o.r0 || 0.22) * 1.15, Nn = o.disc || 900;
    for (let i = 0; i < Nn; i++) {
      const k = i / Nn, rr = Math.sqrt(k) * r, a = i * 2.39996, z = (1 - k) * r * (o.dome || 0.35);
      const c = mix(cc, add(cc, 0.55), Math.sqrt(k)), s = B.shade([0, 0, 1], false);
      B.pt([Math.cos(a) * rr, Math.sin(a) * rr, z], add(c, s));
    }
    B.pop();
  };
  // a poppy: four wide crumpled petals, a dark heart
  F.poppy = function (B, p, axis, L, col, o) {
    o = o || {};
    const R = B.R, base = R() * TAU;
    B.push().aim(axis, p);
    for (let i = 0; i < 4; i++) B.petal({ L, W: L * 0.62, az: base + (i * TAU) / 4 + (R() - 0.5) * 0.3, open0: 0.5, open: o.open || 0.5, curl: -0.2, cup: 0.45, ruf: 0.12, fr: 22, twist: (R() - 0.5) * 0.5,
      shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.8 + 0.2)), 0.35), n: o.n || 1500,
      col: (u, v, front) => { let c = mix(add(col, 0.6), col, sm(0, 0.35, u)); if (u < 0.18 && v < 0.6) c = mix(c, [0.05, 0.03, 0.04], 0.85 * (1 - u / 0.18)); return front ? c : add(c, 0.65); } });
    B.sphere([0, 0, L * 0.08], L * 0.09, 300, { col: [0.3, 0.38, 0.2] });
    for (let i = 0; i < 220; i++) { const a = R() * TAU, r = L * (0.1 + R() * 0.08); B.hair([Math.cos(a) * L * 0.06, Math.sin(a) * L * 0.06, L * 0.05], [Math.cos(a) * r, Math.sin(a) * r, L * 0.1 * R()], [0.12, 0.08, 0.1], [0.15, 0.1, 0.25]); }
    B.pop();
  };
  // five round notched petals (cherry, apple blossom)
  F.blossom = function (B, p, axis, L, col, o) {
    o = o || {};
    const R = B.R, base = R() * TAU;
    B.push().aim(axis, p);
    for (let i = 0; i < 5; i++) B.petal({ L, W: L * 0.6, az: base + (i * TAU) / 5, open0: 0.9, open: 0.5, curl: 0.1, cup: 0.4, ruf: 0.03,
      shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.85 + 0.15)), 0.4) * (1 - 0.3 * Math.exp(-Math.pow((u - 1) * 6, 2))), n: o.n || 220,
      col: (u) => mix(o.heart || add(col, 0.75), col, sm(0, 0.45, u)) });
    for (let i = 0; i < 14; i++) { const a = R() * TAU; B.hair([0, 0, 0], [Math.cos(a) * L * 0.3, Math.sin(a) * L * 0.3, L * 0.25], [0.95, 0.9, 0.85], o.anther || [0.95, 0.75, 0.3]); }
    B.pop();
  };
  // a cupped bell hanging down along axis (bluebells, lily of the valley)
  F.bell = function (B, p, axis, L, col, o) {
    o = o || {};
    B.push().aim(axis, p);
    B.surf((u, v) => {
      const a = v * TAU, lip = sm(0.75, 1, u), r = L * (0.18 + 0.2 * Math.sin(u * PI * 0.55) + 0.18 * lip * lip) * (1 + 0.06 * Math.cos(a * 6) * lip);
      return [Math.cos(a) * r, Math.sin(a) * r, u * L - lip * lip * L * 0.12];
    }, o.n || 500, { col: (u) => mix(add(col, 0.6), col, sm(0.1, 0.8, u)) });
    B.pop();
  };
  // a ball of tiny florets (hydrangea, allium)
  F.ball = function (B, c, r, col, o) {
    o = o || {};
    const R = B.R, n = o.n || 110;
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + 0.5) / n, a = i * 2.39996, s = Math.sqrt(1 - y * y);
      const d = [Math.cos(a) * s, y, Math.sin(a) * s];
      if (d[1] < (o.cut == null ? -0.5 : o.cut)) continue;
      const fl = mix(col, o.col2 || add(col, 1.2), R());
      F.blossom(B, V.add(c, V.mul(d, r)), d, r * (o.fs || 0.28), fl, { n: o.pn || 50 });
    }
  };
  // a dandelion clock: a sphere of seeds on fine stalks
  F.puff = function (B, c, r, o) {
    o = o || {};
    const R = B.R, n = o.n || 520;
    B.sphere(c, r * 0.12, 200, { col: [0.55, 0.5, 0.35] });
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + 0.5) / n, a = i * 2.39996, s = Math.sqrt(1 - y * y), d = [Math.cos(a) * s, y, Math.sin(a) * s];
      const tip = V.add(c, V.mul(d, r));
      B.line(V.add(c, V.mul(d, r * 0.12)), tip, [0.75, 0.75, 0.7], [0.95, 0.95, 0.92]);
      for (let k = 0; k < 7; k++) { const e = V.norm([d[0] + (R() - 0.5) * 1.2, d[1] + (R() - 0.5) * 1.2, d[2] + (R() - 0.5) * 1.2]); B.hair(tip, V.mul(e, r * 0.2), [0.95, 0.95, 0.92], [1, 1, 1]); }
    }
  };
  // grass blades as filaments over a patch
  F.grass = function (B, x0, x1, z0, z1, y, n, o) {
    o = o || {};
    const R = B.R;
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * R(), z = z0 + (z1 - z0) * R(), h = (o.h || 0.35) * (0.4 + R());
      const c0 = o.c0 || [0.12, 0.28, 0.08], c1 = o.c1 || [0.4, 0.6, 0.2];
      B.hair([x, y, z], [(R() - 0.5) * h * 0.4, h, (R() - 0.5) * h * 0.4], c0, mix(c1, [0.8, 0.8, 0.5], R() * 0.2), o.an || [A.sway, 0.08, 1.2]);
    }
  };
  // ground: dark soil / moss under a scene
  F.ground = function (B, w, d, y, col, n) {
    const N = B.N;
    B.terrain(-w, w, -d, d, (x, z) => y + N.fbm(x * 0.8, 0, z * 0.8, 3) * 0.12, n || 6000, { col: (u, v, p) => mix(col || [0.08, 0.1, 0.05], add(col || [0.08, 0.1, 0.05], 1.8), 0.5 + N.fbm(p[0] * 3, 1, p[2] * 3, 2)) });
  };
  F.water = function (B, w, d, y, col, n, amp, sp) {
    B.with([A.water, amp || 0.025, sp || 1], () => B.quad([-w, y, -d], [2 * w, 0, 0], [0, 0, 2 * d], n || 9000, { col: (u, v) => mix(col || [0.05, 0.1, 0.18], add(col || [0.05, 0.1, 0.18], 2.2), Math.pow(B.R(), 3)), lit: false }));
  };

  // stargazer palette, white lily, tiger lily
  const STAR = { main: [0.82, 0.07, 0.27], mid: [0.95, 0.33, 0.52], edge: [1, 0.86, 0.91], deep: [0.46, 0.01, 0.14], spots: 0.5, spot: [0.46, 0.01, 0.14], throat: [0.9, 0.82, 0.22], anther: [0.55, 0.2, 0.05] };
  const WHITE = { main: [0.96, 0.95, 0.9], mid: [1, 1, 0.97], edge: [1, 1, 1], deep: [0.85, 0.85, 0.7], spots: 0.04, spot: [0.6, 0.55, 0.3], throat: [0.75, 0.85, 0.35], back: [0.85, 0.9, 0.75], anther: [0.75, 0.4, 0.08] };
  const TIGER = { main: [0.95, 0.42, 0.06], mid: [1, 0.55, 0.15], edge: [1, 0.7, 0.35], deep: [0.7, 0.2, 0.02], spots: 0.7, spot: [0.18, 0.04, 0.02], throat: [0.95, 0.75, 0.2], back: [0.9, 0.5, 0.2], anther: [0.45, 0.12, 0.03] };

  // ================================================================ 1. stargazer lilies (three open, one wilting, a bud)
  Cl.add('flowers', 'stargazer', (B) => {
    const root = [0.12, -2.5, -0.35];
    const fl = [{ c: [-0.52, 0.8, 0], a: [-0.72, 0.28, 0.63], L: 1.15 }, { c: [0.52, 0.18, 0.28], a: [0.3, 0.02, 0.95], L: 1.2 }, { c: [-0.6, -0.85, 0.12], a: [-0.42, -0.5, 0.75], L: 1.18 }];
    const wilt = { c: [0.78, -0.8, -0.1], a: [0.22, -0.95, 0.2], L: 0.95 }, bud = { c: [0.34, 1.2, -0.3], a: [0.25, 0.95, 0.15], L: 0.72 };
    for (const f of [...fl, wilt, bud]) { const ax = V.norm(f.a); F.stem(B, f.c, [f.c[0] - ax[0] * 0.7, f.c[1] - ax[1] * 0.7 - 0.3, f.c[2] - ax[2] * 0.7], root, 0.032); }
    F.leaf(B, [0.05, 0.75, -0.3], [0.2, 0.9, 0.3], 0.3, 0.9); F.leaf(B, [0.1, -0.2, -0.3], [-0.1, 0.9, 0.3], 2.6, 0.85);
    F.leaf(B, [0.2, -0.5, -0.35], [0.5, 0.7, 0.3], 0, 0.95); F.leaf(B, [0.1, -1.4, -0.3], [-0.5, 0.6, 0.4], 3.3, 0.8);
    F.bud(B, bud.c, bud.a, bud.L);
    F.lily(B, wilt.c, wilt.a, wilt.L, STAR, { wilt: true, n: 1000 });
    for (const f of fl) F.lily(B, f.c, f.a, f.L, STAR);
  }, { cam: { dist: 6.2, pitch: 0.06, sway: 0.25, target: [0, -0.1, 0] }, sky: ['#000000', '#03020a', '#000000'], breathe: 0.035 });

  // ================================================================ 2. a bed of tulips swaying
  Cl.add('flowers', 'tulip-bed', (B, R) => {
    const cols = [[0.86, 0.08, 0.12], [0.98, 0.78, 0.12], [0.95, 0.35, 0.55], [0.55, 0.12, 0.6], [0.98, 0.5, 0.12], [0.96, 0.94, 0.9]];
    B.u.swayY = -1.2;
    F.ground(B, 4.5, 3, -1.25, [0.07, 0.06, 0.04], 5000);
    for (let i = 0; i < 26; i++) {
      const x = (R() - 0.5) * 6.5, z = (R() - 0.5) * 4 - 0.4, h = 0.6 + R() * 0.7;
      const col = cols[(i * 7 + (R() * 2 | 0)) % cols.length];
      const top = [x + (R() - 0.5) * 0.25, -1.2 + h, z];
      B.with([A.sway, 0.05, 1.1], () => {
        F.stem(B, [x, -1.25, z], [x, -1.25 + h * 0.5, z], top, 0.022, null, 260);
        F.tulip(B, top, [(R() - 0.5) * 0.3, 1, (R() - 0.5) * 0.3], 0.34 + R() * 0.08, col, { n: 420, open: R() * 0.25 });
        if (R() < 0.7) F.leaf(B, [x, -1.2, z], [(R() - 0.5), 1, (R() - 0.5) * 0.6], R() * TAU, 0.5 + R() * 0.3, { w: 0.2, n: 500, open: 0.25, curl: 0.4 });
      });
    }
  }, { cam: { dist: 5.6, pitch: 0.28, sway: 0.3, target: [0, -0.5, 0] }, sky: ['#0c1430', '#2a1c34', '#000000'], horizon: 0.55, breathe: 0.01, fog: ['#141024', 5, 11] });

  // ================================================================ 3. one red rose
  Cl.add('flowers', 'rose', (B, R) => {
    F.stem(B, [0, -2.6, 0], [0.15, -1.2, 0.1], [0, 0.15, 0], 0.045, [0.18, 0.35, 0.1]);
    for (let i = 0; i < 14; i++) { const y = -2.3 + R() * 2.1, x = 0.05 * Math.sin(y); B.cyl([x, y, 0], [x + (R() - 0.5) * 0.14, y + 0.1, (R() - 0.5) * 0.14], 0.016, 0, 30, { col: [0.45, 0.25, 0.12] }); }
    F.leaf(B, [0.05, -0.9, 0], [0.8, 0.5, 0.3], 0, 0.7, { w: 0.3, n: 1200 }); F.leaf(B, [0.08, -1.6, 0], [-0.8, 0.4, 0.3], PI, 0.75, { w: 0.3, n: 1200 });
    F.leaf(B, [0.02, -0.4, 0], [-0.6, 0.7, 0.4], 2.2, 0.5, { w: 0.3, n: 800 });
    for (let i = 0; i < 5; i++) { B.push().aim([0, 1, 0], [0, 0.15, 0]); B.petal({ L: 0.45, W: 0.06, az: (i * TAU) / 5, open0: 1.5, open: 1.1, curl: 0.6, n: 220, col: () => [0.2, 0.4, 0.12] }); B.pop(); }
    F.rose(B, [0, 0.1, 0], [0, 1, 0.3], 1.0, [0.78, 0.03, 0.1], { petals: 24, n: 900, heart: [0.4, 0.01, 0.05], edge: [0.95, 0.25, 0.3] });
    B.with([A.twinkle, 2.5], () => { for (let i = 0; i < 40; i++) { const a = R() * TAU, r = 0.3 + R() * 0.55; B.pt([Math.cos(a) * r, 0.5 + R() * 0.4, Math.sin(a) * r * 0.6 + 0.3], [1, 1, 1]); } });
  }, { cam: { dist: 5.0, pitch: 0.4, sway: 0.4, target: [0, -0.25, 0] }, sky: ['#000000', '#0e0206', '#000000'], breathe: 0.018 });

  // more kit
  F.lotus = function (B, p, axis, L, col, o) {
    o = o || {};
    const R = B.R;
    B.push().aim(axis, p);
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 8; i++) {
      const q = layer / 2;
      B.petal({ L: L * (1 - q * 0.22), W: L * 0.36, az: (i * TAU) / 8 + layer * 0.39 + (R() - 0.5) * 0.1, open0: 0.35 + (1 - q) * 0.8 * (o.open || 1), open: 0.2 + (1 - q) * 0.35, curl: -0.3, cup: 0.7, ruf: 0.01, r0: 0.05,
        shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.9 + 0.1)), 0.6) * (1 - Math.pow(u, 4) * 0.7), n: o.n || 520,
        col: (u, v, front) => { const c = mix([0.98, 0.93, 0.9], col, sm(0.35, 1, u) * (0.7 + 0.3 * v)); return front ? c : add(c, 0.8); } });
    }
    B.cyl([0, 0, 0], [0, 0, L * 0.18], L * 0.13, L * 0.16, 400, { col: [0.75, 0.8, 0.3] });
    B.disc([0, 0, L * 0.18], 0, L * 0.16, 200, { col: (u, v) => (Math.sin(v * 40) * Math.sin(u * 20) > 0.3 ? [0.4, 0.45, 0.15] : [0.85, 0.85, 0.4]) });
    B.pop();
  };
  F.pad = function (B, c, r, col) {
    B.disc(c, 0, r, Math.round(1600 * r * r * 4 + 120), { col: (u, v) => (v < 0.04 ? null : mix(col || [0.12, 0.3, 0.1], [0.25, 0.48, 0.15], (Math.sin(v * 60) > 0.6 ? 0.6 : 0.2) + 0.2 * B.R())) });
  };
  F.orchid = function (B, p, axis, L, col, lip, o) {
    o = o || {};
    const R = B.R;
    B.push().aim(axis, p);
    for (let i = 0; i < 3; i++) B.petal({ L, W: L * 0.28, az: PI / 2 + (i * TAU) / 3, open0: 1.5, open: 0.08, curl: 0.05, cup: 0.15, ruf: 0, r0: 0.02, n: 360, col: (u) => mix(add(col, 0.9), col, sm(0, 0.5, u)) });
    for (const s of [-1, 1]) B.petal({ L: L * 0.95, W: L * 0.62, az: PI / 2 + s * 1.15, open0: 1.5, open: 0.05, curl: 0.05, cup: 0.12, ruf: 0.02, r0: 0.02, shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.75 + 0.25)), 0.5), n: 620,
      col: (u, v) => mix(mix(add(col, 0.9), col, sm(0, 0.4, u)), o.vein || col, (Math.sin(v * 30) > 0.85 ? 0.25 : 0)) });
    B.petal({ L: L * 0.5, W: L * 0.3, az: -PI / 2, open0: 1.2, open: 0.6, curl: 0.2, cup: 0.8, ruf: 0.08, r0: 0.02, n: 380, col: (u) => mix([0.95, 0.85, 0.2], lip, sm(0.1, 0.5, u)) });
    B.pop();
  };
  F.iris = function (B, p, axis, L, col, o) {
    o = o || {};
    const R = B.R, base = R() * TAU;
    B.push().aim(axis, p);
    for (let i = 0; i < 3; i++) {
      B.petal({ L: L * 0.9, W: L * 0.4, az: base + (i * TAU) / 3, open0: 0.2, open: -0.05, curl: -0.4, cup: 0.6, ruf: 0.1, fr: 14, n: 600, col: (u, v, f) => add(mix(add(col, 0.8), col, u), f ? 1 : 0.75) });
      B.petal({ L, W: L * 0.45, az: base + (i * TAU) / 3 + PI / 3, open0: 1.0, open: 1.0, curl: 1.2, cup: 0.3, ruf: 0.12, fr: 14, n: 800, col: (u, v, f) => { let c = mix(add(col, 0.55), col, sm(0.2, 0.7, u)); if (u < 0.45 && v < 0.2) c = mix([0.98, 0.8, 0.1], c, u / 0.45); if (u < 0.5 && Math.sin(v * 40) > 0.7) c = mix(c, [0.98, 0.98, 0.95], 0.4); return add(c, f ? 1 : 0.75); },
        hairP: 0.05, hairLen: 0.04, hairCol: [1, 0.85, 0.2] });
    }
    B.pop();
  };
  F.spathe = function (B, p, axis, L, col) {
    B.push().aim(axis, p);
    B.surf((u, v) => {
      const a = (v - 0.5) * PI * 1.65, r = L * (0.06 + 0.24 * Math.pow(u, 0.9)), lip = sm(0.72, 1, u);
      const x = Math.cos(a) * r - lip * lip * L * 0.28 * Math.cos(a * 0.5), y = Math.sin(a) * r;
      return [x, y, u * L + lip * L * 0.1 * Math.cos(a)];
    }, 1500, { col: (u) => mix([0.55, 0.7, 0.35], col, sm(0.05, 0.4, u)) });
    B.cyl([0, 0, 0.05 * L], [0, 0, 0.6 * L], 0.03 * L, 0.025 * L, 220, { col: [0.98, 0.8, 0.15] });
    B.pop();
  };
  F.spike = function (B, base, h, col, o) {
    o = o || {};
    const R = B.R;
    const top = [base[0] + (R() - 0.5) * 0.1, base[1] + h, base[2] + (R() - 0.5) * 0.1];
    B.line(base, top, [0.25, 0.35, 0.18], [0.35, 0.45, 0.25], o.an);
    for (let i = 0; i < (o.n || 60); i++) { const t = 0.6 + R() * 0.4, q = V.lerp(base, top, t); B.pt([q[0] + (R() - 0.5) * 0.035, q[1], q[2] + (R() - 0.5) * 0.035], add(mix(col, add(col, 1.5), R()), 0.6 + R() * 0.6), o.an); }
  };

  // ================================================================ 4. sunflowers at dusk
  Cl.add('flowers', 'sunflowers', (B, R) => {
    const heads = [{ p: [-1.1, 0.5, 0], a: [-0.2, 0.15, 1] }, { p: [0.25, 0.9, -0.3], a: [0.1, 0.25, 1] }, { p: [1.25, -0.1, 0.2], a: [0.25, 0.05, 1] }];
    for (const h of heads) {
      F.stem(B, [h.p[0] * 0.6, -2.6, h.p[2] - 0.3], [h.p[0], -0.8, h.p[2] - 0.5], V.sub(h.p, V.mul(V.norm(h.a), 0.12)), 0.06, [0.25, 0.42, 0.14]);
      F.leaf(B, [h.p[0] * 0.8, -1.2, h.p[2] - 0.4], [h.p[0] > 0 ? 1 : -1, 0.5, 0.4], 0, 0.7, { w: 0.45, n: 1300, open: 0.6 });
      F.leaf(B, [h.p[0] * 0.75, -0.5, h.p[2] - 0.45], [h.p[0] > 0 ? -1 : 1, 0.6, 0.3], 0, 0.6, { w: 0.45, n: 1100, open: 0.6 });
      // the back of the head and its green sepals
      B.push().aim(h.a, h.p); for (let i = 0; i < 18; i++) B.petal({ L: 0.32, W: 0.07, az: (i * TAU) / 18, open0: 1.6, open: 0.3, curl: 0.2, r0: 0.6, n: 70, col: () => [0.2, 0.36, 0.1] }); B.pop();
      F.daisy(B, h.p, h.a, 0.55, [0.98, 0.72, 0.05], [0.28, 0.14, 0.04], { petals: 34, w: 0.13, r0: 0.78, dome: 0.12, disc: 3400, n: 170, flat: 1.45, droop: 0.15 });
    }
    F.grass(B, -3, 3, -1, 1, -2.6, 500, { h: 0.6 });
  }, { cam: { dist: 6.4, pitch: 0.05, sway: 0.2, target: [0, -0.2, 0] }, sky: ['#071226', '#2a1c2c', '#3a2418'], horizon: 0.3, glow: [0.82, 0.25, 0.25, '#ff8a3a'], breathe: 0.012 });

  // ================================================================ 5. a field of daisies at sunset
  Cl.add('flowers', 'daisy-field', (B, R) => {
    B.u.swayY = -1.3;
    F.ground(B, 5, 4, -1.32, [0.08, 0.12, 0.05], 6000);
    F.grass(B, -5, 5, -4, 3, -1.3, 1400, { h: 0.32 });
    for (let i = 0; i < 70; i++) {
      const x = (R() - 0.5) * 8, z = (R() - 0.5) * 6 - 0.5, h = 0.2 + R() * 0.35, top = [x, -1.3 + h, z];
      B.with([A.sway, 0.12, 1.3], () => {
        B.line([x, -1.3, z], top, [0.2, 0.4, 0.12], [0.3, 0.5, 0.18]);
        F.daisy(B, top, [(R() - 0.5) * 0.6, 1, 0.5 + R() * 0.4], 0.11 + R() * 0.06, [0.97, 0.97, 0.94], [0.96, 0.75, 0.1], { petals: 16, n: 34, disc: 90, w: 0.12 });
      });
    }
  }, { cam: { dist: 4.4, pitch: 0.18, sway: 0.3, target: [0, -1.0, -0.4] }, sky: ['#120a26', '#4a2440', '#7a3a24'], horizon: 0.42, glow: [0.7, 0.42, 0.18, '#ffb060'], fog: ['#2a1420', 4, 9], breathe: 0.008 });

  // ================================================================ 6. a lotus pond
  Cl.add('flowers', 'lotus-pond', (B, R) => {
    F.water(B, 5, 4, -1, [0.03, 0.08, 0.1], 9000, 0.012, 0.8);
    for (let i = 0; i < 14; i++) F.pad(B, [(R() - 0.5) * 7, -0.98, (R() - 0.5) * 5 - 0.5], 0.25 + R() * 0.3);
    F.lotus(B, [-0.3, -0.92, 0.2], [0.05, 1, 0.15], 0.75, [0.95, 0.35, 0.55]);
    F.lotus(B, [1.4, -0.95, -0.9], [0.1, 1, 0.1], 0.55, [0.96, 0.45, 0.6], { open: 0.6 });
    F.bud(B, [-1.6, -1.0, -0.6], [0.1, 1, 0.2], 0.55, [0.35, 0.5, 0.25], [0.95, 0.45, 0.6]);
    F.stem(B, [-1.6, -1.4, -0.6], [-1.6, -1.2, -0.6], [-1.6, -1.0, -0.6], 0.02);
    K.sparks(B, [0, 0, -0.5], 6, 2, 60, [0.9, 1, 0.5]);
  }, { cam: { dist: 5.2, pitch: 0.42, sway: 0.25, target: [0, -0.7, -0.3] }, sky: ['#02060a', '#0a1a22', '#02060a'], horizon: 0.6, breathe: 0.01 });

  // ================================================================ 7. a blossoming cherry branch, petals falling
  Cl.add('flowers', 'cherry-branch', (B, R) => {
    const pink = [0.98, 0.72, 0.8];
    const branch = (a, b, r, depth) => {
      B.cyl(a, b, r, r * 0.7, Math.round(2500 * V.len(V.sub(b, a)) * r * 10 + 80), { col: [0.18, 0.1, 0.08] });
      if (depth <= 0) { for (let k = 0; k < 4; k++) F.blossom(B, V.add(b, [(R() - 0.5) * 0.3, (R() - 0.5) * 0.25, (R() - 0.5) * 0.3]), [R() - 0.5, R() - 0.3, 0.8], 0.11, pink, { n: 120, heart: [0.85, 0.3, 0.45] }); return; }
      for (let i = 0; i < 2; i++) { const d = V.sub(b, a), nd = V.norm([d[0] + (R() - 0.5) * 1.5, d[1] + (R() - 0.3) * 1.2, d[2] + (R() - 0.5) * 0.8]); branch(b, V.add(b, V.mul(nd, V.len(d) * 0.7)), r * 0.65, depth - 1); }
      if (R() < 0.7) F.blossom(B, V.lerp(a, b, 0.6), [0, 0, 1], 0.1, pink, { n: 110, heart: [0.85, 0.3, 0.45] });
    };
    branch([-3.5, -1.2, 0], [-1.6, -0.4, 0.1], 0.09, 4);
    B.u.wrapY = [-2.5, 5];
    for (let i = 0; i < 160; i++) B.pt([(R() - 0.5) * 7, -2.5 + R() * 5, (R() - 0.5) * 2], add(pink, 0.8 + R() * 0.4), [A.fall, -0.25 - R() * 0.2, 0.15]);
  }, { cam: { dist: 5.5, pitch: 0.05, sway: 0.3, target: [-0.6, 0, 0] }, sky: ['#060312', '#140a22', '#060312'], glow: [0.75, 0.75, 0.1, '#c8c0ff'], breathe: 0.025 });

  // ================================================================ 8. poppies in the wind
  Cl.add('flowers', 'poppies', (B, R) => {
    B.u.swayY = -1.4;
    F.ground(B, 5, 4, -1.42, [0.1, 0.1, 0.04], 5000);
    F.grass(B, -5, 5, -4, 3, -1.4, 1300, { h: 0.5, c1: [0.6, 0.6, 0.25] });
    for (let i = 0; i < 26; i++) {
      const x = (R() - 0.5) * 7, z = (R() - 0.5) * 5 - 0.3, h = 0.5 + R() * 0.7, top = [x, -1.4 + h, z];
      B.with([A.sway, 0.08, 1.6], () => {
        F.stem(B, [x, -1.4, z], [x + 0.1, -1.4 + h * 0.5, z], top, 0.015, [0.3, 0.45, 0.2], 200);
        if (R() < 0.85) F.poppy(B, top, [(R() - 0.5) * 0.7, 1, 0.6], 0.22 + R() * 0.08, [0.9, 0.08, 0.04], { n: 380 });
        else F.bud(B, top, [0.3, 1, 0.2], 0.2, [0.3, 0.45, 0.2], [0.5, 0.55, 0.3]);
      });
    }
  }, { cam: { dist: 4.8, pitch: 0.2, sway: 0.3, target: [0, -0.8, -0.3] }, sky: ['#1a0a08', '#4a1a10', '#2a1008'], horizon: 0.4, glow: [0.3, 0.38, 0.22, '#ff7030'], fog: ['#2a0e08', 4, 9], breathe: 0.01 });

  // ================================================================ 9. a moth orchid spray
  Cl.add('flowers', 'orchid', (B, R) => {
    B.cyl([0, -2.2, 0], [0, -1.6, 0], 0.55, 0.65, 2500, { col: (u, v) => mix([0.85, 0.85, 0.82], [0.7, 0.68, 0.65], v) });
    for (let i = 0; i < 4; i++) F.leaf(B, [0, -1.6, 0], [Math.cos(i * 1.7), 0.35, Math.sin(i * 1.7)], 0, 0.9, { w: 0.35, n: 1400, open: 0.4, dark: [0.08, 0.22, 0.08], light: [0.2, 0.42, 0.15] });
    const P0 = [-0.6, -1.6, 0], P1 = [-0.5, 1.9, 0.1], P2 = [2.2, 0.9, 0.2];
    const arc = (t) => { const m = 1 - t; return [m * m * P0[0] + 2 * m * t * P1[0] + t * t * P2[0], m * m * P0[1] + 2 * m * t * P1[1] + t * t * P2[1], m * m * P0[2] + 2 * m * t * P1[2] + t * t * P2[2]]; };
    B.tube(arc, 0.02, 1400, { col: [0.25, 0.35, 0.18] });
    for (let i = 0; i < 6; i++) {
      const t = 0.42 + i * 0.1, p = arc(t), s = 1 - i * 0.06;
      F.orchid(B, V.add(p, [0, -0.12, 0.12]), [0.15, -0.15, 1], 0.6 * s, [0.97, 0.9, 0.96], [0.8, 0.12, 0.45], { vein: [0.85, 0.4, 0.65] });
    }
    F.bud(B, arc(1), [1, -0.3, 0.3], 0.16, [0.6, 0.7, 0.4], [0.95, 0.9, 0.95]);
  }, { cam: { dist: 5.6, pitch: 0.12, sway: 0.25, target: [0.4, 0.2, 0] }, sky: ['#04020a', '#120814', '#04020a'], breathe: 0.015 });

  // ================================================================ 10. irises
  Cl.add('flowers', 'iris', (B, R) => {
    const cols = [[0.42, 0.18, 0.78], [0.28, 0.3, 0.85], [0.55, 0.15, 0.6]];
    for (let i = 0; i < 3; i++) {
      const x = -1.3 + i * 1.3 + (R() - 0.5) * 0.3, top = [x, -0.1 + R() * 0.8, (R() - 0.5) * 0.6];
      F.stem(B, [x, -2.5, top[2]], [x, -1.2, top[2]], top, 0.035, [0.2, 0.38, 0.15]);
      for (let k = 0; k < 3; k++) B.push().aim([(R() - 0.5) * 0.4, 1, (R() - 0.5) * 0.3], [x + (R() - 0.5) * 0.2, -2.5, top[2]]).petal({ L: 1.9 + R() * 0.6, W: 0.09, az: R() * TAU, open0: 0.05, open: 0.3, curl: 0.2, cup: 0.4, n: 900, col: () => mix([0.12, 0.3, 0.12], [0.3, 0.5, 0.2], B.R()) }) && B.pop();
      F.iris(B, top, [0, 1, 0.15], 0.95, cols[i]);
    }
  }, { cam: { dist: 5.4, pitch: 0.12, sway: 0.3, target: [0, 0, 0] }, sky: ['#05050f', '#0e0c20', '#05050f'], breathe: 0.015 });

  // ================================================================ 11. a hibiscus, close
  Cl.add('flowers', 'hibiscus', (B, R) => {
    F.leaf(B, [-0.2, -0.3, -0.4], [-1, -0.2, -0.3], 0, 1.4, { w: 0.4, n: 2400, open: 0.3 });
    F.leaf(B, [0.3, -0.2, -0.4], [1, -0.5, -0.2], 0, 1.3, { w: 0.4, n: 2200, open: 0.3 });
    const col = [0.92, 0.12, 0.22], base = R() * TAU;
    B.push().aim([0.05, 0.25, 1], [0, 0, 0]);
    for (let i = 0; i < 5; i++) B.petal({ L: 1.25, W: 0.78, az: base + (i * TAU) / 5, open0: 1.0 + (R() - 0.5) * 0.2, open: 0.35, curl: 0.55, cup: 0.45, twist: 0.5, ruf: 0.14, fr: 20, r0: 0.03,
      shape: (u) => Math.pow(Math.sin(PI * Math.min(1, u * 0.7 + 0.3)), 0.4) * (0.25 + 0.75 * sm(0, 0.5, u)), n: 3400,
      col: (u, v, f) => { let c = mix([0.42, 0.01, 0.07], col, sm(0.08, 0.32, u)); c = mix(c, [1, 0.42, 0.4], sm(0.85, 1, u) * 0.35); c = add(c, 0.62 + 0.38 * (1 - v * v)); if (Math.sin(v * 28 + u * 3) > 0.93) c = add(c, 0.8); return f ? c : add(c, 0.75); } });
    const tip = [0, 0, 1.2];
    B.cyl([0, 0, 0], tip, 0.035, 0.025, 600, { col: [0.95, 0.3, 0.35] });
    for (let i = 0; i < 60; i++) { const t = 0.55 + R() * 0.4, a = R() * TAU; B.hair([0, 0, t * 1.2], [Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.04], [0.95, 0.5, 0.4], [1, 0.85, 0.2]); }
    for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; B.blob([Math.cos(a) * 0.07, Math.sin(a) * 0.07, 1.27], 0.025, 40, { col: () => [0.85, 0.05, 0.15] }); }
    B.pop();
  }, { cam: { dist: 4.4, pitch: 0.35, yaw: 0.3, sway: 0.35, target: [0, 0.1, 0.3] }, sky: ['#020403', '#06100a', '#020403'], breathe: 0.02 });

  // ================================================================ 12. a peony, close
  Cl.add('flowers', 'peony', (B, R) => {
    F.leaf(B, [0, -0.5, -0.2], [-1, -0.3, -0.2], 0, 1.2, { w: 0.25, n: 1500 }); F.leaf(B, [0, -0.5, -0.2], [1, -0.4, 0], 0, 1.1, { w: 0.25, n: 1500 });
    F.leaf(B, [0, -0.5, -0.2], [0.2, -0.6, 1], 0, 0.9, { w: 0.25, n: 1200 });
    F.rose(B, [0, -0.35, 0], [0, 0.75, 1], 1.15, [0.93, 0.42, 0.6], { petals: 36, n: 760, ruf: 0.035, flare: 1.15, open: 0.8, heart: [0.98, 0.88, 0.84], edge: [1, 0.78, 0.86] });
  }, { cam: { dist: 4.6, pitch: 0.45, sway: 0.35, target: [0, 0, 0.1] }, sky: ['#05020a', '#100612', '#05020a'], breathe: 0.018 });

  // ================================================================ 13. calla lilies in a glass vase
  Cl.add('flowers', 'callas', (B, R) => {
    // the vase: just its glints and the waterline
    for (let i = 0; i < 2600; i++) { const y = -2.3 + R() * 1.7, a = R() * TAU, r = 0.42 + 0.06 * Math.sin((y + 2.3) * 2); const edge = Math.pow(Math.abs(Math.sin(a)), 8); if (R() > 0.12 + edge * 0.8) continue; B.pt([Math.cos(a) * r, y, Math.sin(a) * r], add([0.7, 0.85, 0.9], 0.5 + edge * 0.8)); }
    B.disc([0, -1.0, 0], 0, 0.43, 700, { col: [0.25, 0.4, 0.45], lit: false });
    B.disc([0, -2.3, 0], 0.35, 0.44, 400, { col: [0.6, 0.7, 0.75] });
    const heads = 5;
    for (let i = 0; i < heads; i++) {
      const a = (i / heads) * TAU + R() * 0.3, top = [Math.cos(a) * (0.5 + R() * 0.4), 0.2 + R() * 0.9, Math.sin(a) * 0.4 + 0.1];
      F.stem(B, [Math.cos(a) * 0.15, -2.2, Math.sin(a) * 0.15], [Math.cos(a) * 0.25, -0.6, Math.sin(a) * 0.2], top, 0.03, [0.25, 0.48, 0.18]);
      F.spathe(B, top, V.norm([top[0] * 0.6, 1, 0.5]), 0.75, [0.98, 0.97, 0.94]);
    }
  }, { cam: { dist: 6.4, pitch: 0.1, sway: 0.3, target: [0, -0.5, 0] }, sky: ['#04050a', '#0a0c16', '#04050a'], breathe: 0.012 });

  // ================================================================ 14. bluebells in a wood
  Cl.add('flowers', 'bluebells', (B, R) => {
    F.ground(B, 5, 4, -1.5, [0.06, 0.1, 0.05], 6000);
    F.grass(B, -5, 5, -4, 2, -1.5, 900, { h: 0.25 });
    for (let i = 0; i < 4; i++) K.tree(B, [(i - 1.5) * 2.4 + (R() - 0.5), -1.5, -3 - R() * 1.5], 3.2, { leafN: 60, blob: 0.12, leaf: [0.12, 0.28, 0.1] });
    for (let s = 0; s < 16; s++) {
      const x = (R() - 0.5) * 6, z = (R() - 0.5) * 3, h = 0.5 + R() * 0.4;
      const arc = (t) => [x + t * 0.35, -1.5 + Math.sin(t * PI * 0.6) * h, z];
      B.with([A.sway, 0.05, 1.1], () => {
        B.tube(arc, 0.012, 180, { col: [0.2, 0.42, 0.18] });
        for (let k = 0; k < 6; k++) { const t = 0.45 + k * 0.1, q = arc(t); F.bell(B, V.add(q, [0, -0.02, 0]), [0.3, -1, 0.1], 0.12, [0.35, 0.3, 0.9], { n: 160 }); }
      });
      B.u.swayY = -1.5;
    }
  }, { cam: { dist: 4.6, pitch: 0.18, sway: 0.3, target: [0, -1, -0.4] }, sky: ['#03060a', '#0c1a20', '#04080a'], horizon: 0.5, fog: ['#0a161c', 3.5, 9], breathe: 0.01 });

  // ================================================================ 15. a dandelion clock, seeds flying away
  Cl.add('flowers', 'dandelion', (B, R) => {
    F.stem(B, [0, -2.6, 0], [0.2, -1, 0], [0.05, 0.3, 0], 0.03, [0.35, 0.45, 0.25]);
    F.puff(B, [0.05, 0.75, 0], 0.62, { n: 380 });
    F.stem(B, [-1.3, -2.6, -0.5], [-1.4, -1.6, -0.5], [-1.35, -0.8, -0.4], 0.025, [0.35, 0.45, 0.25]);
    F.daisy(B, [-1.35, -0.8, -0.4], [0.2, 0.6, 1], 0.28, [0.98, 0.78, 0.08], [0.95, 0.7, 0.05], { petals: 60, w: 0.05, r0: 0.15, n: 50, disc: 200 });
    for (let i = 0; i < 40; i++) {
      const p = [0.05 + R() * 3, 0.8 + R() * 1.5, (R() - 0.5) * 1.5];
      B.with([A.rise, 0.04 + R() * 0.04, 2.5], () => { for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; B.hair(p, [Math.cos(a) * 0.08, 0.07, Math.sin(a) * 0.08], [0.9, 0.9, 0.85], [1, 1, 1]); } B.line(p, V.add(p, [0, -0.15, 0]), [0.8, 0.8, 0.75], [0.5, 0.45, 0.35]); });
    }
    F.grass(B, -3, 3, -1.5, 1, -2.6, 500, { h: 0.5 });
  }, { cam: { dist: 6.4, pitch: 0.08, sway: 0.3, target: [0, -0.2, 0] }, sky: ['#0a0603', '#2a1808', '#4a2a0c'], horizon: 0.25, glow: [0.25, 0.3, 0.3, '#ffb040'], breathe: 0.02 });

  // ================================================================ 16. lavender rows to the horizon
  Cl.add('flowers', 'lavender', (B, R) => {
    B.u.swayY = -1.4;
    F.ground(B, 6, 8, -1.42, [0.12, 0.08, 0.05], 5000);
    for (let row = 0; row < 9; row++) {
      const x = (row - 4) * 0.9;
      for (let k = 0; k < 40; k++) {
        const z = 2 - k * 0.32 + (R() - 0.5) * 0.1;
        for (let s = 0; s < 6; s++) F.spike(B, [x + (R() - 0.5) * 0.45, -1.4, z + (R() - 0.5) * 0.2], 0.35 + R() * 0.15, [0.52, 0.32, 0.82], { n: 12, an: [A.sway, 0.1, 1.4] });
      }
    }
    K.tree(B, [2.6, -1.4, -10], 1.8, { leafN: 120, blob: 0.15 });
  }, { cam: { dist: 4.2, pitch: 0.2, sway: 0.15, target: [0, -0.9, -2] }, sky: ['#14183a', '#5a3a5a', '#e07a40'], horizon: 0.38, glow: [0.5, 0.38, 0.2, '#ffa050'], fog: ['#3a2440', 4, 13], breathe: 0.006 });

  // ================================================================ 17. hydrangeas
  Cl.add('flowers', 'hydrangea', (B, R) => {
    const cols = [[0.35, 0.45, 0.95], [0.6, 0.38, 0.88], [0.9, 0.5, 0.75]];
    for (let i = 0; i < 6; i++) F.leaf(B, [(R() - 0.5) * 2, -1.0, (R() - 0.5)], [(R() - 0.5) * 2, 0.4, R()], R() * TAU, 0.8, { w: 0.4, n: 1300, open: 0.5 });
    const heads = [[-1.0, 0.1, 0], [0.7, 0.45, -0.3], [0.2, -0.6, 0.5]];
    heads.forEach((c, i) => { F.stem(B, [c[0] * 0.5, -2.4, c[2]], [c[0], -1.2, c[2]], c, 0.04); F.ball(B, c, 0.62, cols[i], { n: 120, fs: 0.3, pn: 40, cut: -0.35 }); });
  }, { cam: { dist: 5.6, pitch: 0.2, sway: 0.3, target: [0, -0.2, 0] }, sky: ['#03030a', '#0a0a18', '#03030a'], breathe: 0.015 });

  // ================================================================ 18. a wildflower meadow
  Cl.add('flowers', 'wildflowers', (B, R) => {
    B.u.swayY = -1.4;
    F.ground(B, 5, 4, -1.42, [0.07, 0.12, 0.04], 6000);
    F.grass(B, -5, 5, -4, 3, -1.4, 1500, { h: 0.4 });
    for (let i = 0; i < 90; i++) {
      const x = (R() - 0.5) * 8, z = (R() - 0.5) * 6 - 0.5, h = 0.2 + R() * 0.45, top = [x, -1.4 + h, z], kind = R();
      B.with([A.sway, 0.1, 1.2 + R() * 0.4], () => {
        B.line([x, -1.4, z], top, [0.2, 0.38, 0.12], [0.3, 0.5, 0.18]);
        if (kind < 0.3) F.daisy(B, top, [0, 1, 0.7], 0.1, [0.97, 0.97, 0.94], [0.96, 0.75, 0.1], { petals: 14, n: 26, disc: 60 });
        else if (kind < 0.5) F.daisy(B, top, [0, 1, 0.7], 0.1, [0.2, 0.35, 0.95], [0.25, 0.2, 0.5], { petals: 10, n: 30, disc: 40, w: 0.2 });
        else if (kind < 0.7) F.blossom(B, top, [0, 1, 0.6], 0.08, [0.98, 0.85, 0.1], { n: 40 });
        else if (kind < 0.85) F.poppy(B, top, [0, 1, 0.6], 0.12, [0.92, 0.12, 0.05], { n: 90 });
        else F.spike(B, V.sub(top, [0, h, 0]), h + 0.1, [0.8, 0.35, 0.7], { n: 30 });
      });
    }
    // butterflies
    for (let i = 0; i < 4; i++) { const p = [(R() - 0.5) * 4, -0.7 + R() * 0.6, (R() - 0.5) * 2]; B.push().move(p[0], p[1], p[2]).rotY(R() * TAU); for (const sd of [-1, 1]) B.with([A.twinkle, 6], () => B.petal({ L: 0.13, W: 0.09, az: sd > 0 ? 0 : PI, open0: 1.3, open: 0, n: 90, col: () => [0.98, 0.55, 0.12] })); B.pop(); }
  }, { cam: { dist: 4.4, pitch: 0.18, sway: 0.3, target: [0, -1.0, -0.4] }, sky: ['#0a1a3a', '#2a4a6a', '#8aa0a0'], horizon: 0.45, fog: ['#2a3a48', 4, 10], breathe: 0.008 });

  // ================================================================ 19. a bouquet in a vase on a table
  Cl.add('flowers', 'bouquet', (B, R) => {
    B.quad([-3, -2.0, -2], [6, 0, 0], [0, 0, 3.5], 14000, { col: (u, v) => mix([0.16, 0.09, 0.05], [0.26, 0.15, 0.08], 0.5 + 0.5 * Math.sin(u * 90 + Math.sin(v * 9) * 3)) });
    B.surf((u, v) => { const y = -2 + u * 1.3, a = v * TAU, r = 0.32 + 0.22 * Math.sin(u * PI * 0.9); return [Math.cos(a) * r, y, Math.sin(a) * r]; }, 3500, { col: (u, v, p, n) => mix([0.12, 0.25, 0.35], [0.6, 0.8, 0.9], Math.pow(Math.max(0, n[0] * 0.5 + n[2] * 0.6), 6)) });
    const top = [0, -0.7, 0];
    const at = (x, y, z) => [x, y, z];
    F.rose(B, at(-0.35, 0.35, 0.3), [-0.4, 1, 0.5], 0.42, [0.85, 0.08, 0.15], { petals: 18, n: 300, heart: [0.4, 0.01, 0.05] });
    F.rose(B, at(0.4, 0.2, 0.35), [0.5, 1, 0.5], 0.38, [0.98, 0.8, 0.82], { petals: 18, n: 280, heart: [0.9, 0.55, 0.6] });
    F.lily(B, at(0.05, 0.8, 0), [0.1, 1, 0.6], 0.75, WHITE, { n: 650 });
    F.tulip(B, at(-0.75, 0.5, -0.2), [-0.6, 1, 0.2], 0.3, [0.95, 0.45, 0.1], { n: 300 });
    F.tulip(B, at(0.8, 0.65, -0.25), [0.6, 1, 0.1], 0.3, [0.55, 0.15, 0.6], { n: 300 });
    for (let i = 0; i < 7; i++) F.daisy(B, at((R() - 0.5) * 1.6, 0.1 + R() * 0.6, (R() - 0.5) * 0.8 + 0.3), [R() - 0.5, 1, 0.8], 0.12, [0.98, 0.98, 0.95], [0.95, 0.75, 0.1], { petals: 14, n: 40, disc: 70 });
    for (let i = 0; i < 9; i++) { const a = R() * TAU, end = [Math.cos(a) * 0.9, 0.2 + R() * 0.7, Math.sin(a) * 0.5]; B.line(top, end, [0.25, 0.4, 0.15], [0.3, 0.45, 0.2]); F.leaf(B, end, [Math.cos(a), 0.3, Math.sin(a)], 0, 0.35, { w: 0.25, n: 300 }); }
  }, { cam: { dist: 4.6, pitch: 0.16, sway: 0.35, target: [0, -0.1, 0] }, sky: ['#060404', '#120a08', '#060404'], breathe: 0.012 });

  // ================================================================ 20. water lilies under the moon
  Cl.add('flowers', 'water-lilies', (B, R) => {
    K.sea(B, 6, 6, -1, 12000, [0.02, 0.04, 0.07], { amp: 0.01, speed: 0.7, glint: [1.6, 0.25, -6], glintCol: [0.9, 0.92, 1] });
    for (let i = 0; i < 16; i++) F.pad(B, [(R() - 0.5) * 7, -0.99, (R() - 0.5) * 5 - 0.4], 0.22 + R() * 0.25, [0.08, 0.22, 0.1]);
    for (let i = 0; i < 6; i++) {
      const p = [(R() - 0.5) * 5, -0.96, (R() - 0.5) * 3.5 - 0.3];
      F.daisy(B, p, [0, 1, 0.05], 0.3, [0.97, 0.97, 1], [0.95, 0.85, 0.3], { petals: 18, w: 0.24, r0: 0.25, flat: 0.95, droop: 0.4, n: 70, disc: 120, dome: 0.5 });
    }
    K.moon(B, [2.6, 3.4, -9], 0.7, 3000);
    K.stars(B, 700, 30, { half: true });
    K.sparks(B, [0, -0.3, -0.5], 6, 1.4, 50, [0.85, 1, 0.45]);
  }, { cam: { dist: 5.0, pitch: 0.32, sway: 0.25, target: [0, -0.6, -0.6] }, sky: ['#020410', '#060c1c', '#02040a'], glow: [0.68, 0.82, 0.12, '#b8c8ff'], breathe: 0.01 });
})();
