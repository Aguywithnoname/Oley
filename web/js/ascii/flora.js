/* Oley · ASCII flora: a bouquet of lilies grown in code. Stems push up and fan out, leaves unfurl,
   buds swell and colour, then each lily opens its six petals (spotted, striped, with stamens) on a
   word of the song. Drawn with Canvas 2D into the small picture the ASCII pass reads, so every
   petal ends up made of characters. Also the grass the portraits stand in. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const PI = Math.PI;
  const sm = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const outQ = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a == null ? 1 : a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rng = (seed) => { const R = U.rng(seed >>> 0); R.r = R.range; R.ch = R.chance; R.sgn = R.sign; R.i = R.int; return R; };
  O.asciiRng = rng;

  // lily colours: petal, its throat, its tip, the spots
  const LILIES = [
    { p: [218, 34, 44], th: [120, 10, 24], tip: [236, 70, 70], sp: [70, 6, 14] },
    { p: [224, 82, 168], th: [150, 30, 110], tip: [244, 160, 210], sp: [110, 20, 70] },
    { p: [242, 204, 64], th: [214, 130, 30], tip: [250, 232, 140], sp: [150, 70, 20] },
    { p: [238, 228, 214], th: [210, 170, 140], tip: [250, 246, 238], sp: [150, 90, 70] },
    { p: [242, 134, 52], th: [190, 70, 20], tip: [250, 186, 110], sp: [110, 30, 10] },
    { p: [160, 22, 46], th: [90, 6, 24], tip: [196, 50, 70], sp: [50, 0, 10] },
  ];
  // a lily coloured from the album: the vivid colour as the petal
  function fromCover(c) {
    const l = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    return { p: c, th: mix(c, [40, 10, 20], 0.45), tip: mix(c, [255, 250, 240], l > 0.6 ? 0.3 : 0.45), sp: mix(c, [20, 0, 10], 0.7) };
  }

  O.Bouquet = class {
    // o: { seed, n, t0 (stems start), blooms: [times], cover: [r,g,b] or null }
    constructor(o) {
      const R = rng(o.seed);
      this.R = R;
      this.t0 = o.t0;
      this.fade = null;
      const n = o.n;
      const cols = LILIES.slice();
      if (o.cover) cols.push(fromCover(o.cover));
      // every colour once before any repeats
      for (let i = cols.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cols[i], cols[j]] = [cols[j], cols[i]]; }
      this.fl = [];
      const blooms = (o.blooms || []).slice().sort((a, b) => a - b);
      for (let i = 0; i < n; i++) {
        // fan out from the base; the middle ones tallest
        const k = n > 1 ? i / (n - 1) : 0.5;
        const ang = (k - 0.5) * R.r(1.25, 1.55) + R.r(-0.1, 0.1);
        const len = R.r(0.5, 1.0) * (1 - Math.abs(k - 0.5) * 0.45);
        const ts = o.t0 + R.r(0, 1.4) + Math.abs(k - 0.5) * 0.8;
        const tb = blooms.length ? blooms[i % blooms.length] + (i >= blooms.length ? R.r(0.3, 1.5) : 0) : ts + R.r(3.5, 7);
        const c = cols[i % cols.length];
        this.fl.push({
          ang, len, bend: R.r(-0.25, 0.25), ts, gd: R.r(1.8, 2.8), tb: Math.max(tb, ts + 2.2), c,
          size: R.r(0.2, 0.28) * (0.75 + len * 0.35), rot: R.r(0, PI * 2), ph: R.r(0, 6), wob: R.r(0.6, 1.2),
          leaves: [0.25, 0.42, 0.58].filter(() => R.ch(0.75)).map((f) => ({ f: f + R.r(-0.05, 0.05), side: R.sgn(), len: R.r(0.18, 0.3), ang: R.r(0.45, 0.8) })),
          spots: Array.from({ length: 14 }, () => [R.r(0.12, 0.5), R.r(-0.25, 0.25), R.r(0.6, 1.4)]),
        });
      }
      // smaller ones behind, big ones in front
      this.fl.sort((a, b) => a.size - b.size);
    }
    // ease the bouquet away (petals drop, then it dissolves)
    wilt(t) { if (this.fade == null) this.fade = t; }
    // x, y: the base in pixels; H: how tall the bouquet stands, in pixels
    draw(x, t, bx, by, H, wind) {
      const fade = this.fade == null ? 1 : 1 - sm(this.fade, this.fade + 1.2, t);
      if (fade <= 0) return false;
      x.save();
      x.globalAlpha = fade;
      x.lineCap = 'round'; x.lineJoin = 'round';
      const heads = [];
      for (const f of this.fl) {
        const g = outQ((t - f.ts) / f.gd);
        if (g <= 0) continue;
        const sway = Math.sin(t * 0.9 * f.wob + f.ph) * 0.05 + wind * 0.06;
        const a = f.ang + sway * g;
        const L = f.len * H;
        // the stem: a gentle curve, drawn as far as it has grown
        const tipX = bx + Math.sin(a) * L, tipY = by - Math.cos(a) * L;
        const cx = bx + Math.sin(a + f.bend) * L * 0.55, cy = by - Math.cos(a + f.bend) * L * 0.55;
        const pt = (u) => [(1 - u) * (1 - u) * bx + 2 * (1 - u) * u * cx + u * u * tipX, (1 - u) * (1 - u) * by + 2 * (1 - u) * u * cy + u * u * tipY];
        x.strokeStyle = rgb([58, 132, 52]); x.lineWidth = Math.max(2.4, H * 0.02);
        x.beginPath();
        for (let s = 0; s <= 24; s++) { const p = pt((s / 24) * g); s ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
        x.stroke();
        x.strokeStyle = rgb([120, 200, 96], 0.6); x.lineWidth = Math.max(1, H * 0.007);
        x.stroke();
        // leaves unfurl a little after the stem passes them
        for (const lf of f.leaves) {
          const lg = sm(lf.f + 0.05, lf.f + 0.45, g);
          if (lg <= 0) continue;
          const p = pt(lf.f), q = pt(lf.f + 0.02);
          const da = Math.atan2(q[0] - p[0], -(q[1] - p[1])) + lf.side * lf.ang * lg;
          const ll = lf.len * H * lg, lw = Math.max(2.2, ll * 0.2);
          x.save(); x.translate(p[0], p[1]); x.rotate(da);
          const gr = x.createLinearGradient(0, 0, 0, -ll);
          gr.addColorStop(0, rgb([40, 110, 40])); gr.addColorStop(1, rgb([110, 196, 84]));
          x.fillStyle = gr;
          x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(lw * lf.side, -ll * 0.5, lf.side * lw * 0.4, -ll); x.quadraticCurveTo(-lw * 0.6 * lf.side, -ll * 0.45, 0, 0); x.fill();
          x.restore();
        }
        if (g > 0.85) heads.push({ f, x: tipX, y: tipY, a });
      }
      // buds swell, then open on their word
      for (const h of heads) {
        const f = h.f, S = f.size * H;
        const bud = sm(f.ts + f.gd * 0.8, f.ts + f.gd + 1.2, t);
        const open = outQ((t - f.tb) / 0.9);
        const drop = this.fade == null ? 0 : sm(this.fade, this.fade + 0.8, t);
        x.save(); x.translate(h.x, h.y);
        if (open <= 0.01) {
          // a closed bud, greening to the petal colour
          x.rotate(h.a);
          const bl = S * (0.25 + 0.45 * bud), bw = bl * 0.28;
          const gr = x.createLinearGradient(0, 0, 0, -bl);
          gr.addColorStop(0, rgb([70, 140, 60])); gr.addColorStop(1, rgb(mix([110, 170, 80], f.c.p, bud * 0.7)));
          x.fillStyle = gr;
          x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(bw, -bl * 0.3, bw * 0.8, -bl * 0.8, 0, -bl); x.bezierCurveTo(-bw * 0.8, -bl * 0.8, -bw, -bl * 0.3, 0, 0); x.fill();
          x.restore();
          continue;
        }
        // six petals: three outer, three inner, fanning from the stem's line to a full star
        for (const layer of [0, 1]) {
          for (let i = 0; i < 3; i++) {
            const base = f.rot + (i * 2 * PI) / 3 + layer * (PI / 3);
            const closed = h.a + (i - 1) * 0.12 + layer * 0.05;
            const ang = closed + (base - closed) * open;
            const len = S * (0.55 + 0.45 * open) * (layer ? 0.92 : 1) * (1 - drop * 0.3);
            const wid = len * (0.14 + 0.12 * open) * (layer ? 1.15 : 1);
            const curl = (layer ? -1 : 1) * 0.12 * open;
            x.save(); x.rotate(ang); x.translate(0, drop * S * 0.6 * (i + 1) * 0.3);
            const gr = x.createLinearGradient(0, 0, 0, -len);
            gr.addColorStop(0, rgb(f.c.th)); gr.addColorStop(0.3, rgb(f.c.p)); gr.addColorStop(0.85, rgb(f.c.p)); gr.addColorStop(1, rgb(f.c.tip));
            x.fillStyle = gr;
            x.beginPath(); x.moveTo(0, 0);
            x.bezierCurveTo(wid, -len * 0.2, wid * 0.85, -len * 0.7, curl * len, -len);
            x.bezierCurveTo(-wid * 0.85, -len * 0.7, -wid, -len * 0.2, 0, 0);
            x.fill();
            // a darker vein down the middle, and freckles near the throat
            x.strokeStyle = rgb(f.c.th, 0.7); x.lineWidth = Math.max(0.6, wid * 0.16);
            x.beginPath(); x.moveTo(0, -len * 0.05); x.quadraticCurveTo(curl * len * 0.3, -len * 0.5, curl * len * 0.85, -len * 0.92); x.stroke();
            x.fillStyle = rgb(f.c.sp, 0.9);
            for (const s of f.spots) if ((s[0] * 10 + i + layer) % 2 < 1.2) { x.beginPath(); x.arc(s[1] * wid, -s[0] * len, Math.max(0.5, wid * 0.07 * s[2]), 0, PI * 2); x.fill(); }
            x.restore();
          }
        }
        // stamens
        if (open > 0.4) {
          const k = sm(0.4, 1, open);
          for (let i = 0; i < 6; i++) {
            const a = f.rot + i * (PI / 3) + 0.3, l = S * 0.5 * k;
            const ex = Math.sin(a) * l, ey = -Math.cos(a) * l;
            x.strokeStyle = rgb([226, 220, 160], 0.9); x.lineWidth = Math.max(0.5, S * 0.012);
            x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(ex * 0.5, ey * 0.6, ex, ey); x.stroke();
            x.fillStyle = rgb([196, 92, 30]); x.beginPath(); x.ellipse(ex, ey, S * 0.03, S * 0.05, a, 0, PI * 2); x.fill();
          }
        }
        x.restore();
      }
      x.restore();
      return true;
    }
  };

  // grass along the bottom, swaying in a slow wind
  O.Grass = class {
    constructor(seed, n) {
      const R = rng(seed);
      this.b = Array.from({ length: n }, () => ({ x: R(), h: R.r(0.35, 1), lean: R.r(-0.35, 0.35), ph: R.r(0, 6), w: R.r(0.6, 1.4), c: R.r(0, 1) }));
    }
    draw(x, t, W, y0, H, wind) {
      x.save(); x.lineCap = 'round';
      for (const b of this.b) {
        const h = b.h * H, sway = Math.sin(t * 1.1 + b.ph + b.x * 6) * 0.18 + wind * 0.25;
        const bx = b.x * W, tx = bx + (b.lean + sway) * h;
        x.strokeStyle = rgb(mix([46, 70, 40], [120, 150, 90], b.c), 0.9); x.lineWidth = Math.max(1, b.w * H * 0.03);
        x.beginPath(); x.moveTo(bx, y0); x.quadraticCurveTo(bx + (tx - bx) * 0.2, y0 - h * 0.6, tx, y0 - h); x.stroke();
      }
      x.restore();
    }
  };
})();
