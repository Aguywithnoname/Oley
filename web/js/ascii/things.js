/* Oley · ASCII things: more that grows and happens in code, drawn with Canvas 2D into the small
   picture the character pass reads. A blossom tree that branches up and drops petals, a night city
   whose windows light up with the song, fireworks that go up on the big words, and the lyric's emoji
   popping in as sprites. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const PI = Math.PI;
  const rng = (s) => O.asciiRng(s);
  const sm = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const outQ = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a == null ? 1 : a})`;
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  // ---------------------------------------------------------------- a blossom tree
  O.Tree = class {
    // o: { seed, t0, blooms: [times], col: blossom colour }
    constructor(o) {
      const R = rng(o.seed);
      this.t0 = o.t0;
      this.col = o.col || R.pick([[250, 190, 214], [255, 236, 240], [244, 150, 180], [255, 214, 120]]);
      this.b = [];
      const grow = (x, y, ang, len, w, depth, born) => {
        const dur = 0.55 + len * 1.6;
        const br = { x, y, ang, len, w, depth, born, dur };
        this.b.push(br);
        if (depth >= 7 || len < 0.035) { br.tip = true; return; }
        const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
        const n = depth < 2 ? 2 : R.ch(0.3) ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const spread = (i - (n - 1) / 2) * R.r(0.42, 0.7) + R.r(-0.12, 0.12);
          grow(ex, ey, ang + spread * (depth === 0 ? 0.8 : 1), len * R.r(0.66, 0.8), w * 0.68, depth + 1, born + dur * 0.75);
        }
      };
      grow(0, 0, R.r(-0.06, 0.06), 0.3, 0.05, 0, o.t0);
      const tips = this.b.filter((q) => q.tip);
      const blooms = (o.blooms || []).slice().sort((a, b) => a - b);
      this.flowers = tips.map((q, i) => {
        const ex = q.x + Math.sin(q.ang) * q.len, ey = q.y - Math.cos(q.ang) * q.len;
        const tb = blooms.length ? blooms[i % blooms.length] + R.r(0, 1.2) : q.born + q.dur + R.r(0.5, 4);
        return { x: ex, y: ey, tb: Math.max(tb, q.born + q.dur), r: R.r(0.018, 0.032), ph: R.r(0, 6) };
      });
      this.petals = Array.from({ length: 40 }, () => ({ x: R.r(-0.5, 0.5), t: R.r(0, 12), sp: R.r(0.04, 0.09), sw: R.r(0.02, 0.06), ph: R.r(0, 6) }));
      this.fade = null;
    }
    wilt(t) { if (this.fade == null) this.fade = t; }
    draw(x, t, bx, by, H, wind) {
      const fade = this.fade == null ? 1 : 1 - sm(this.fade, this.fade + 1.2, t);
      if (fade <= 0) return;
      x.save(); x.globalAlpha = fade; x.lineCap = 'round';
      const S = H;
      for (const q of this.b) {
        const g = outQ((t - q.born) / q.dur);
        if (g <= 0) continue;
        const sway = Math.sin(t * 0.8 + q.depth) * 0.015 * q.depth + wind * 0.02 * q.depth;
        const a = q.ang + sway;
        const x0 = bx + q.x * S, y0 = by + q.y * S, x1 = x0 + Math.sin(a) * q.len * S * g, y1 = y0 - Math.cos(a) * q.len * S * g;
        x.strokeStyle = rgb(mix([70, 46, 34], [120, 90, 70], q.depth / 7)); x.lineWidth = Math.max(1.6, q.w * S);
        x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      }
      for (const f of this.flowers) {
        const k = outQ((t - f.tb) / 0.7);
        if (k <= 0) continue;
        const r = f.r * S * k * (1 + 0.08 * Math.sin(t * 2 + f.ph));
        x.fillStyle = rgb(this.col);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + f.ph; x.beginPath(); x.arc(bx + f.x * S + Math.cos(a) * r * 0.6, by + f.y * S + Math.sin(a) * r * 0.6, r * 0.55, 0, PI * 2); x.fill(); }
        x.fillStyle = rgb([255, 230, 140]); x.beginPath(); x.arc(bx + f.x * S, by + f.y * S, r * 0.25, 0, PI * 2); x.fill();
      }
      // petals drifting down once it's in bloom
      const open = sm(this.flowers.length ? Math.min(...this.flowers.map((f) => f.tb)) : this.t0 + 6, this.t0 + 12, t);
      if (open > 0) {
        x.fillStyle = rgb(this.col, 0.9 * open);
        for (const p of this.petals) {
          const life = ((t - this.t0) * p.sp + p.t * 0.1) % 1;
          const px = bx + (p.x + Math.sin(t * 1.3 + p.ph) * p.sw + life * 0.2 + wind * 0.1) * S, py = by - S * 0.85 + life * S * 1.0;
          x.beginPath(); x.ellipse(px, py, S * 0.008, S * 0.005, t + p.ph, 0, PI * 2); x.fill();
        }
      }
      x.restore();
    }
  };

  // ---------------------------------------------------------------- a city at night, its windows lighting up with the song
  O.City = class {
    constructor(o) {
      const R = rng(o.seed);
      this.t0 = o.t0;
      this.b = [];
      let x = -0.02;
      while (x < 1.02) {
        const w = R.r(0.04, 0.1), h = R.r(0.18, 0.62) * (R.ch(0.15) ? 1.35 : 1);
        const win = [];
        const cols = Math.max(2, Math.floor(w / 0.014)), rows = Math.max(3, Math.floor(h / 0.03));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (R.ch(0.75)) win.push({ c, r, on: o.t0 + R.r(0, 14), off: R.ch(0.2) ? o.t0 + R.r(6, 30) : 1e9, warm: R.ch(0.8) });
        this.b.push({ x, w, h, cols, rows, win, ant: R.ch(0.25), tone: R.r(0.08, 0.16) });
        x += w + R.r(0.002, 0.012);
      }
      this.cars = Array.from({ length: 10 }, () => ({ sp: R.r(0.05, 0.14) * R.sgn(), ph: R(), red: R.ch(0.5) }));
      this.beats = (o.beats || []).slice();
      this.fade = null;
    }
    wilt(t) { if (this.fade == null) this.fade = t; }
    draw(x, t, W, Hh, pulse) {
      const fade = this.fade == null ? 1 : 1 - sm(this.fade, this.fade + 1.0, t);
      const rise = outQ((t - this.t0) / 1.6);
      if (fade <= 0 || rise <= 0) return;
      x.save(); x.globalAlpha = fade;
      const ground = Hh * 0.94;
      // a big moon behind
      x.fillStyle = rgb([236, 230, 210], 0.9 * rise); x.beginPath(); x.arc(W * 0.78, Hh * 0.24, Hh * 0.1, 0, PI * 2); x.fill();
      for (const b of this.b) {
        const h = b.h * Hh * rise, bx = b.x * W, bw = b.w * W, top = ground - h;
        x.fillStyle = rgb([255 * b.tone, 255 * b.tone, 255 * (b.tone + 0.04)]); x.fillRect(bx, top, bw, h);
        const cw = bw / b.cols, ch = Math.min(h / b.rows, Hh * 0.03);
        for (const wv of b.win) {
          if (t < wv.on || t > wv.off) continue;
          const wy = top + wv.r * ch + ch * 0.25;
          if (wy > ground - ch * 0.4) continue;
          x.fillStyle = wv.warm ? rgb([255, 214, 120], 0.95) : rgb([170, 210, 255], 0.9);
          x.fillRect(bx + wv.c * cw + cw * 0.25, wy, cw * 0.5, ch * 0.5);
        }
        if (b.ant) { const on = Math.sin(t * 4 + b.x * 30) > 0.2; x.fillStyle = on ? rgb([255, 60, 60]) : rgb([80, 20, 20]); x.fillRect(bx + bw / 2 - 1, top - Hh * 0.03, 3, 3); }
      }
      // the street, cars going past
      x.fillStyle = rgb([24, 24, 30]); x.fillRect(0, ground, W, Hh - ground);
      for (const c of this.cars) {
        const p = (((c.ph + t * c.sp) % 1) + 1) % 1;
        x.fillStyle = c.red ? rgb([255, 70, 60]) : rgb([255, 244, 200]);
        x.fillRect(p * W, ground + (c.sp > 0 ? 3 : 7), 6 + pulse * 4, 2);
      }
      x.restore();
    }
  };

  // ---------------------------------------------------------------- fireworks on the big words
  O.Fireworks = class {
    constructor(o) {
      const R = rng(o.seed);
      this.R = R;
      const pal = [[255, 90, 90], [255, 210, 80], [120, 200, 255], [200, 120, 255], [120, 255, 170], [255, 255, 255]];
      if (o.col) pal.push(o.col, o.col);
      this.shots = (o.times || []).map((tm) => ({ t: tm - 0.7, x: R.r(0.15, 0.85), y: R.r(0.18, 0.45), col: R.pick(pal), col2: R.pick(pal), n: R.i(30, 48), sz: R.r(0.2, 0.32), seed: R.i(1, 1e6) }));
      this.fade = null;
    }
    wilt(t) { if (this.fade == null) this.fade = t; }
    draw(x, t, W, Hh) {
      const fade = this.fade == null ? 1 : 1 - sm(this.fade, this.fade + 1.0, t);
      if (fade <= 0) return;
      x.save(); x.globalAlpha = fade; x.lineCap = 'round';
      // low hills and a few people watching
      x.fillStyle = rgb([22, 24, 32]);
      x.beginPath(); x.moveTo(0, Hh);
      for (let i = 0; i <= 40; i++) { const k = i / 40; x.lineTo(k * W, Hh * (0.9 - 0.05 * Math.sin(k * 7 + 1) - 0.03 * Math.sin(k * 17))); }
      x.lineTo(W, Hh); x.closePath(); x.fill();
      x.fillStyle = rgb([40, 40, 52]);
      for (let i = 0; i < 18; i++) { const px = ((i * 0.618) % 1) * W, ph = Hh * (0.035 + ((i * 0.37) % 1) * 0.02); x.fillRect(px, Hh * 0.9 - ph, Hh * 0.012, ph); x.beginPath(); x.arc(px + Hh * 0.006, Hh * 0.9 - ph - Hh * 0.01, Hh * 0.009, 0, PI * 2); x.fill(); }
      for (const s of this.shots) {
        const q = t - s.t;
        if (q < 0 || q > 3.2) continue;
        const ex = s.x * W, ey = s.y * Hh;
        if (q < 0.7) {
          // the rocket going up
          const k = outQ(q / 0.7), y = Hh + (ey - Hh) * k;
          x.strokeStyle = rgb([255, 230, 180], 0.9); x.lineWidth = 2;
          x.beginPath(); x.moveTo(ex, y); x.lineTo(ex, y + Hh * 0.05); x.stroke();
          continue;
        }
        const k = q - 0.7, R = rng(s.seed), rad = s.sz * Hh * outQ(k / 0.9);
        const a = Math.max(0, 1 - k / 2.4);
        for (let i = 0; i < s.n; i++) {
          const ang = (i / s.n) * PI * 2 + R.r(-0.1, 0.1), sp = R.r(0.7, 1);
          const px = ex + Math.cos(ang) * rad * sp, py = ey + Math.sin(ang) * rad * sp + k * k * Hh * 0.05;
          x.strokeStyle = rgb(i % 2 ? s.col : s.col2, a);
          x.lineWidth = Math.max(2, Hh * 0.014);
          x.beginPath(); x.moveTo(px, py); x.lineTo(px - Math.cos(ang) * Hh * 0.04 * a, py - Math.sin(ang) * Hh * 0.04 * a - Hh * 0.012); x.stroke();
          x.fillStyle = rgb([255, 250, 235], a); x.beginPath(); x.arc(px, py, Math.max(1.2, Hh * 0.01), 0, PI * 2); x.fill();
        }
        if (k < 0.15) { x.fillStyle = rgb([255, 255, 255], 1 - k / 0.15); x.beginPath(); x.arc(ex, ey, Hh * 0.04, 0, PI * 2); x.fill(); }
      }
      x.restore();
    }
  };

  // ---------------------------------------------------------------- the lyric's emoji as sprites
  O.Sprites = class {
    constructor(list) { this.list = list; }
    draw(x, t, W, Hh) {
      const PU = O.PU;
      if (!PU || !PU.Emoji) return;
      for (const s of this.list) {
        const q = t - s.t;
        if (q < -0.05 || q > s.life + 0.4) continue;
        const img = PU.Emoji.img && PU.Emoji.img(s.e);
        if (!img) continue;
        const pop = q < 0.35 ? 1 + 0.25 * Math.sin((q / 0.35) * PI) : 1;
        const inK = outQ(q / 0.3), outK = 1 - sm(s.life, s.life + 0.4, q);
        const size = s.size * Hh * inK * pop * (0.6 + 0.4 * outK);
        const cx = s.x * W + Math.sin(q * 1.3 + s.ph) * Hh * 0.01, cy = s.y * Hh - q * Hh * 0.025;
        x.save(); x.globalAlpha = outK; x.translate(cx, cy); x.rotate(s.rot + Math.sin(q * 1.1) * 0.08);
        x.drawImage(img, -size / 2, -size / 2, size, size);
        x.restore();
      }
    }
  };
})();
