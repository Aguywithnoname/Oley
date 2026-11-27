/* Oley · Shadowplay figures: silhouettes drawn for Oley (a standing figure, a profile head, an open
   hand, line-art hearts, moons, a rotary dial), the album cover's cut-out turned into a silhouette or an
   outline, emoji turned into solid shapes, and the condensed type everything is set in. World units:
   the screen is 1 tall. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const S = (O.Shadow = O.Shadow || {});
  const K = 400; // text is drawn at K× and scaled down, so tiny world sizes still get real font sizes

  // ---------------------------------------------------------------- a smooth closed path through points
  function spline(pts, closed, ten) {
    const p = new Path2D(), n = pts.length, k = (ten == null ? 0.5 : ten) / 3;
    const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
      if (b[2] || c[2]) { p.lineTo(c[0], c[1]); continue; } // a sharp corner
      p.bezierCurveTo(b[0] + (c[0] - a[0]) * k, b[1] + (c[1] - a[1]) * k, c[0] - (d[0] - b[0]) * k, c[1] - (d[1] - b[1]) * k, c[0], c[1]);
    }
    if (closed) p.closePath();
    return p;
  }
  S.spline = spline;
  const mirror = (half) => half.concat(half.slice(1, -1).reverse().map(([x, y, c]) => [-x, y, c]));

  // ---------------------------------------------------------------- the figures (drawn in their own boxes)
  // standing, facing us: 300 tall, x from the middle, y down from the top of the head
  const STAND = mirror([
    [0, 0], [10, 1.5], [16.5, 8], [18, 19], [16.5, 29], [12, 37], [8.5, 41], [8.5, 47], [19, 51], [33, 55], [39, 64],
    [41.5, 88], [43.5, 113], [46, 138], [47, 158], [49.5, 170], [47, 184], [41, 185], [38.5, 168], [37, 141], [33.5, 116], [31, 93], [28, 76],
    [26.5, 92], [23.5, 119], [27, 143], [28.5, 158], [27, 190], [24, 220], [25, 243], [20, 280], [25.5, 293], [25, 300, 1], [8, 300, 1],
    [8.5, 290], [9.5, 279], [8.5, 242], [7.5, 220], [5.5, 190], [0, 163],
  ]);
  // a head and shoulders in profile, facing right: 100 square
  const HEAD = [
    [-2, 100, 1], [0, 84], [10, 72], [20, 64], [22, 56], [16, 47], [13, 38], [11, 30], [13, 22], [12, 17], [17, 14], [19, 9], [25, 7], [29, 3], [36, 3], [41, 0], [48, 2], [54, 1], [58, 5], [63, 9],
    [65, 16], [66, 24], [68, 30], [67, 35], [69, 39], [75, 46], [71, 49], [72, 53], [69, 56], [70, 59], [67, 62], [67, 67], [61, 70], [55, 71], [53, 79], [59, 85], [72, 92], [78, 100, 1],
  ];
  // an open hand, fingers up, palm to us: 100 × 140
  const HAND = [
    [30, 140, 1], [30, 113], [23, 97], [11, 84], [3, 69], [4, 60], [10, 57], [18, 62], [28, 74], [30, 60], [25, 22], [26, 9], [32, 4], [37, 10], [40, 50], [41, 11],
    [45, 2], [51, 2], [55, 9], [54, 50], [57, 13], [62, 6], [68, 9], [68, 52], [72, 29], [77, 22], [83, 25], [81, 61], [79, 91], [71, 112], [67, 140, 1],
  ];
  // someone sitting, hugging their knees, seen from the side (facing right): 100 × 100
  const SIT = [
    [8, 100, 1], [5, 84], [6, 66], [11, 50], [17, 39], [16, 28], [18, 15], [27, 7], [37, 7], [44, 13], [46, 21], [49, 26], [45, 30], [42, 33], [52, 29], [64, 27],
    [72, 32], [74, 46], [72, 56], [75, 64], [77, 80], [78, 89], [86, 95], [89, 100, 1], [68, 100, 1], [65, 90], [62, 78], [49, 73], [35, 82], [30, 100, 1],
  ];
  const FIG = {};
  const mk = (name, pts, w, h, x0, base, core) => { FIG[name] = { path: spline(pts, true), w, h, x0, base, core }; };
  mk('stand', STAND, 100, 300, -50, [0, 300], [0, 110]);
  mk('head', HEAD, 80, 100, 0, [38, 100], [32, 50]);
  mk('hand', HAND, 86, 140, 0, [48, 140], [50, 100]);
  mk('sit', SIT, 90, 100, 0, [45, 100], [30, 50]);
  S.FIG = FIG;

  // draw a figure with its base at (x, y), h tall (world units)
  S.fig = function (g, name, x, y, h, col, o) {
    const F = FIG[name];
    if (!F) return;
    o = o || {};
    const k = h / F.h;
    g.save();
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flip ? -k : k, k);
    g.translate(-F.base[0], -F.base[1]);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    if (o.blur) g.filter = 'blur(' + o.blur + 'px)';
    if (o.line) { g.strokeStyle = col; g.lineWidth = o.line / k; g.lineJoin = 'round'; g.stroke(F.path); }
    else { g.fillStyle = col; g.fill(F.path); }
    g.restore();
  };
  // where a figure's torso is, in world units, for the camera to dive into
  S.figCore = function (name, x, y, h, flip) {
    const F = FIG[name], k = h / F.h;
    return [x + (F.core[0] - F.base[0]) * k * (flip ? -1 : 1), y + (F.core[1] - F.base[1]) * k];
  };

  // ---------------------------------------------------------------- drawn objects
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')';
  S.rgba = rgba;
  // an anatomical heart in a single line (about s tall)
  S.heart = function (g, x, y, s, col, lw, beat) {
    const k = s / 100 * (1 + (beat || 0) * 0.06);
    g.save(); g.translate(x, y); g.scale(k, k); g.translate(-50, -55);
    g.strokeStyle = col; g.lineWidth = lw / k; g.lineJoin = 'round'; g.lineCap = 'round';
    const body = spline([[50, 104], [34, 92], [17, 74], [8, 54], [10, 38], [20, 28], [32, 28], [40, 34], [46, 30], [56, 30], [66, 26], [80, 30], [90, 42], [92, 60], [84, 78], [68, 94]], true);
    g.stroke(body);
    const tube = (pts) => g.stroke(spline(pts, false));
    tube([[38, 33], [36, 20], [40, 8], [48, 4]]); tube([[46, 31], [46, 18], [52, 9], [62, 6], [70, 10], [72, 20]]);
    tube([[57, 31], [58, 19], [62, 14]]); tube([[66, 27], [76, 15], [84, 14]]);
    tube([[26, 29], [20, 18], [22, 10]]);
    tube([[44, 50], [52, 66], [56, 86]]); tube([[30, 60], [40, 74]]);
    g.restore();
  };
  // a crescent moon; ph 0 full disc, 1 thin crescent
  S.moon = function (g, x, y, r, col, bg, ph) {
    g.save(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (ph > 0.01) { g.fillStyle = bg; g.beginPath(); g.arc(x - r * ph * 0.65, y - r * ph * 0.25, r * (0.92 + ph * 0.05), 0, Math.PI * 2); g.fill(); }
    g.restore();
  };
  // a rotary dial: finger holes with numbers (or letters) round a centre label
  S.dial = function (g, x, y, r, col, lw, rot, labels, hi, hiCol) {
    g.save(); g.translate(x, y);
    g.strokeStyle = rgba(col); g.lineWidth = lw;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.52, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 10; i++) {
      const a = rot + (-0.6 + (i / 10) * 1.55) * Math.PI * 1.25, hx = Math.cos(a) * r * 0.76, hy = Math.sin(a) * r * 0.76;
      g.beginPath(); g.arc(hx, hy, r * 0.14, 0, Math.PI * 2); g.stroke();
      S.text(g, labels[i], hx, hy, r * 0.15, i === hi ? hiCol : col, { mid: true });
    }
    g.restore();
  };

  // ---------------------------------------------------------------- type
  const meas = document.createElement('canvas').getContext('2d');
  const FONT = '"Oley Heavy", "Anton", Impact, sans-serif';
  const mcache = new Map();
  S.measure = function (txt, size) {
    let m = mcache.get(txt);
    if (!m) {
      meas.font = K + 'px ' + FONT;
      const r = meas.measureText(txt);
      m = { w: r.width / K, asc: (r.actualBoundingBoxAscent || K * 0.74) / K, desc: (r.actualBoundingBoxDescent || 0) / K };
      if (mcache.size > 3000) mcache.clear();
      mcache.set(txt, m);
    }
    return { w: m.w * size, h: (m.asc + m.desc) * size, asc: m.asc * size };
  };
  // set a word: centred on x; on its baseline at y, or centred on y (o.mid). o: alpha, align, sx, skew, rot, grey (0..1 toward grey), reveal (0..1 of the letters)
  S.text = function (g, txt, x, y, size, col, o) {
    o = o || {};
    if (!txt) return;
    const m = S.measure(txt, size);
    g.save();
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
    if (o.sx || o.sy) g.scale(o.sx || 1, o.sy || 1);
    const k = size / K;
    g.scale(k, k);
    g.font = K + 'px ' + FONT;
    g.textBaseline = 'alphabetic';
    const ax = o.align === 'left' ? 0 : o.align === 'right' ? -m.w / k : -m.w / k / 2;
    const ay = o.mid ? (m.asc / k) / 2 : 0;
    let c = col;
    if (o.grey) c = [col[0] + (128 - col[0]) * o.grey, col[1] + (128 - col[1]) * o.grey, col[2] + (128 - col[2]) * o.grey];
    g.fillStyle = rgba(c, o.alpha == null ? 1 : o.alpha);
    if (o.stroke) { g.strokeStyle = rgba(o.stroke, (o.alpha == null ? 1 : o.alpha) * 0.9); g.lineWidth = K * 0.09; g.lineJoin = 'round'; g.strokeText(txt, ax, ay); }
    if (o.reveal != null && o.reveal < 1) {
      // letters arrive one at a time, the newest still grey
      const n = txt.length, shown = o.reveal * n;
      let xx = ax;
      for (let i = 0; i < n; i++) {
        const ch = txt[i], wch = g.measureText(ch).width;
        const a = Math.max(0, Math.min(1, shown - i));
        if (a > 0) { g.fillStyle = rgba(a < 1 ? [c[0] * 0.5 + 64, c[1] * 0.5 + 64, c[2] * 0.5 + 64] : c, (o.alpha == null ? 1 : o.alpha) * Math.min(1, a * 2)); g.fillText(ch, xx, ay); }
        xx += wch;
      }
    } else g.fillText(txt, ax, ay);
    g.restore();
    return m;
  };
  S.FONT = FONT;
  S.clearMeasure = () => mcache.clear();

  // ---------------------------------------------------------------- the cover's cut-out as a silhouette
  S.Cut = class {
    constructor(img, mask) {
      this.ok = false;
      if (!img || !mask) return;
      const N = 512, src = document.createElement('canvas');
      src.width = src.height = N;
      const sx = src.getContext('2d', { willReadFrequently: true });
      sx.drawImage(mask, 0, 0, N, N);
      let d;
      try { d = sx.getImageData(0, 0, N, N); } catch (e) { return; }
      const px = d.data;
      let x0 = N, y0 = N, x1 = 0, y1 = 0, cx = 0, cy = 0, n = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4, v = px[i] / 255;
        const a = Math.max(0, Math.min(1, (v - 0.42) / 0.16));
        px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a * 255;
        if (a > 0.5) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cx += x; cy += y; n++; }
      }
      if (n < N * N * 0.02) return;
      sx.putImageData(d, 0, 0);
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(src, x0, y0, w, h, 0, 0, w, h);
      this.alpha = c; this.w = w; this.h = h; this.asp = w / h;
      this.core = [(cx / n - x0) / w, (cy / n - y0) / h];
      // does it touch the bottom of the cover (a bust or a body cut off by the frame)?
      this.cropped = y1 > N * 0.96;
      // is it shaped like a figure (taller than wide, not a disc or a box)?
      this.fill = n / (w * h);
      this.figureLike = (this.asp < 0.85 && this.fill < 0.82) || (this.cropped && this.asp < 1.3 && this.fill < 0.74);
      this.tints = new Map();
      this.ok = true;
    }
    tint(col, line) {
      const key = col.join(',') + (line ? ':l' + line : '');
      let c = this.tints.get(key);
      if (c) return c;
      c = document.createElement('canvas');
      const pad = line ? Math.ceil(line) + 2 : 0;
      c.width = this.w + pad * 2; c.height = this.h + pad * 2;
      const x = c.getContext('2d');
      if (line) {
        // an outline: the shape grown by `line` px, minus the shape
        for (let a = 0; a < 16; a++) x.drawImage(this.alpha, pad + Math.cos((a / 16) * Math.PI * 2) * line, pad + Math.sin((a / 16) * Math.PI * 2) * line);
        x.globalCompositeOperation = 'destination-out';
        x.drawImage(this.alpha, pad, pad);
      } else x.drawImage(this.alpha, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = rgba(col);
      x.fillRect(0, 0, c.width, c.height);
      if (this.tints.size > 12) this.tints.clear();
      this.tints.set(key, c);
      return c;
    }
    // base centre at (x, y), h tall
    draw(g, x, y, h, col, o) {
      if (!this.ok) return;
      o = o || {};
      const w = h * this.asp, line = o.line ? Math.max(1.5, o.line * this.h / h) : 0;
      const c = this.tint(col, line ? Math.round(line) : 0);
      const pad = line ? (c.width - this.w) / 2 : 0, k = h / this.h;
      g.save();
      g.translate(x, y);
      if (o.rot) g.rotate(o.rot);
      if (o.flip) g.scale(-1, 1);
      if (o.alpha != null) g.globalAlpha *= o.alpha;
      if (o.blur) g.filter = 'blur(' + o.blur + 'px)';
      g.drawImage(c, -w / 2 - pad * k, -h - pad * k, c.width * k, c.height * k);
      g.restore();
    }
    corePt(x, y, h, flip) { return [x + (this.core[0] - 0.5) * h * this.asp * (flip ? -1 : 1), y - h + this.core[1] * h]; }
  };

  // ---------------------------------------------------------------- an emoji as a solid shape or an outline
  const ecache = new Map();
  S.emojiShape = function (img, col, line) {
    if (!img || !img.width) return null;
    const key = (img.src || img.width) + '|' + col.join(',') + '|' + (line || 0);
    let c = ecache.get(key);
    if (c) return c;
    const N = 256, pad = line ? line + 2 : 0;
    c = document.createElement('canvas'); c.width = c.height = N + pad * 2;
    const x = c.getContext('2d');
    if (line) {
      for (let a = 0; a < 16; a++) x.drawImage(img, pad + Math.cos((a / 16) * Math.PI * 2) * line, pad + Math.sin((a / 16) * Math.PI * 2) * line, N, N);
      x.globalCompositeOperation = 'destination-out';
      x.drawImage(img, pad, pad, N, N);
    } else x.drawImage(img, 0, 0, N, N);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = rgba(col); x.fillRect(0, 0, c.width, c.height);
    if (ecache.size > 60) ecache.clear();
    ecache.set(key, c);
    return c;
  };
})();
