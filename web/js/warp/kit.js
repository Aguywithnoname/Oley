/* Oley · Warp kit: the pieces of a phone-made lyric edit, all drawn for Oley. Heavy type set into a
   block and then bent (a wave that melts it down, an arch, a fisheye bulge, wrapped round a cylinder,
   tipped back in perspective) and extruded into 3D; neon hearts, halftone dots, light rays and a ring of
   text turning behind; and phone UI to set lyrics in: a message bubble typing, a keyboard, a glowing
   pill, a file card, a weather card, a text selection with a spell-check squiggle, a loading spinner with
   a caption, label boxes. Everything is in world units (the screen is 1 tall). */
(function () {
  'use strict';
  const O = window.Oley;
  const Wk = (O.Warp = O.Warp || {});
  const PI = Math.PI;
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')';
  Wk.rgba = rgba;
  const FONTS = {
    heavy: '"Oley Black", "Archivo Black", "Arial Black", sans-serif',
    cond: '"Oley Heavy", "Anton", Impact, sans-serif',
    ui: '"Oley Display", "Oley Sans", "Inter", system-ui, sans-serif',
    serif: '"Oley Serif", Georgia, serif',
  };
  Wk.FONTS = FONTS;

  // ---------------------------------------------------------------- type set into a block (an offscreen canvas)
  const blocks = new Map();
  const scratch = document.createElement('canvas').getContext('2d');
  // spec: { rows: [[{ t, col }]], font, w (weight), px, lead, track (em), stroke: [col, px], align }
  Wk.block = function (spec) {
    const key = JSON.stringify(spec);
    let b = blocks.get(key);
    if (b) { blocks.delete(key); blocks.set(key, b); return b; }
    const px = Math.max(8, Math.round(spec.px)), f = (spec.w || 400) + ' ' + px + 'px ' + (FONTS[spec.font] || spec.font || FONTS.heavy);
    const lead = spec.lead || 0.95, track = (spec.track || 0) * px, gap = (spec.gap == null ? 0.28 : spec.gap) * px;
    scratch.font = f;
    if ('letterSpacing' in scratch) scratch.letterSpacing = track + 'px';
    const rows = spec.rows.map((r) => {
      const items = r.map((w) => ({ w, m: scratch.measureText(w.t).width }));
      return { items, width: items.reduce((a, q, i) => a + q.m + (i ? gap : 0), 0) };
    });
    const sw = spec.stroke ? spec.stroke[1] : 0;
    const pad = Math.ceil(px * 0.12 + sw * 2);
    const W = Math.ceil(Math.max(1, ...rows.map((r) => r.width)) + pad * 2), H = Math.ceil(rows.length * px * lead + px * 0.28 + pad * 2);
    const c = document.createElement('canvas');
    c.width = Math.min(4096, W); c.height = Math.min(4096, H);
    const x = c.getContext('2d');
    x.font = f;
    if ('letterSpacing' in x) x.letterSpacing = track + 'px';
    x.textBaseline = 'alphabetic';
    x.lineJoin = 'round';
    rows.forEach((r, ri) => {
      let xx = spec.align === 'left' ? pad : (W - r.width) / 2;
      const yy = pad + (ri + 1) * px * lead - px * 0.04;
      for (const q of r.items) {
        if (q.w.a !== 0) {
          if (spec.stroke) { x.strokeStyle = rgba(spec.stroke[0]); x.lineWidth = sw * 2; x.strokeText(q.w.t, xx, yy); }
          x.fillStyle = rgba(q.w.col || [255, 255, 255], q.w.a == null ? 1 : q.w.a);
          x.fillText(q.w.t, xx, yy);
        }
        q.x = xx; q.y = yy;
        xx += q.m + gap;
      }
    });
    b = { c, w: c.width, h: c.height, rows, px };
    blocks.set(key, b);
    while (blocks.size > 48) blocks.delete(blocks.keys().next().value);
    return b;
  };

  // ---------------------------------------------------------------- bending a block as it's drawn (slices)
  // draws block b centred on (cx, cy), ww wide (world). mode: wave | arch | hump | bulge | cyl | persp | flat
  Wk.warp = function (g, b, cx, cy, ww, mode, amt, ph, o) {
    o = o || {};
    const hh = ww * b.h / b.w, N = o.n || (mode === 'flat' ? 1 : 64);
    const cw = b.w, ch = b.h;
    if (o.alpha != null) { g.save(); g.globalAlpha *= o.alpha; }
    if (mode === 'flat' || !amt) { g.drawImage(b.c, cx - ww / 2, cy - hh / 2, ww, hh); if (o.alpha != null) g.restore(); return hh; }
    if (mode === 'bulge') return bulge(g, b, cx, cy, ww, hh, amt, o);
    const span = o.span || 2.4;
    for (let k = 0; k < N; k++) {
      const u0 = k / N, u1 = (k + 1) / N, u = (u0 + u1) / 2;
      let x0 = cx - ww / 2 + u0 * ww, x1 = cx - ww / 2 + u1 * ww, top = cy - hh / 2, h = hh;
      if (mode === 'wave') {
        const a = u * (o.freq || 1.6) * PI * 2 + ph;
        const sy = 1 + amt * 1.6 * (0.5 + 0.5 * Math.sin(a + 1.2));
        h = hh * sy; top = cy - hh / 2 + Math.sin(a) * amt * hh * 0.35;
      } else if (mode === 'arch') {
        const s = 2 * u - 1; h = hh * (1 + amt * s * s); top = cy + hh / 2 - h;
      } else if (mode === 'hump') {
        const s = 2 * u - 1; top = cy - hh / 2 - amt * hh * (1 - s * s); h = hh * (1 + amt * 0.3 * (1 - s * s));
      } else if (mode === 'cyl') {
        const a0 = (u0 - 0.5) * span + ph, a1 = (u1 - 0.5) * span + ph, a = (a0 + a1) / 2;
        if (Math.cos(a) < 0.05) continue;
        const R = ww / 2 / Math.sin(Math.min(PI / 2, span / 2));
        x0 = cx + R * Math.sin(a0); x1 = cx + R * Math.sin(a1);
        if (x1 < x0) continue;
        const sy = 0.8 + 0.2 * Math.cos(a);
        h = hh * sy; top = cy - h / 2 + (1 - Math.cos(a)) * amt * hh;
      } else if (mode === 'persp') {
        // tipped back: the left end far, the right end near (amt < 0 flips it)
        const far = 1 - Math.abs(amt) * 0.75, s = amt > 0 ? u : 1 - u;
        const z0 = far + (1 - far) * (amt > 0 ? u0 : 1 - u0), z1 = far + (1 - far) * (amt > 0 ? u1 : 1 - u1);
        const X = (uu, z) => cx + (uu - 0.5) * ww * z * 1.1;
        x0 = X(u0, z0); x1 = X(u1, z1);
        const z = far + (1 - far) * s;
        h = hh * z; top = cy - h / 2 + (1 - z) * hh * 0.6;
      }
      const sx = u0 * cw, sw = Math.max(1, cw / N + 0.6);
      g.drawImage(b.c, sx, 0, Math.min(sw, cw - sx), ch, x0, top, (x1 - x0) * (1 + 0.6 / Math.max(1, cw / N)), h);
    }
    if (o.alpha != null) g.restore();
    return hh;
  };
  // a fisheye: through a scratch canvas, rows then columns
  const tmp = document.createElement('canvas');
  function bulge(g, b, cx, cy, ww, hh, amt, o) {
    const N = 48, cw = b.w, ch = b.h;
    tmp.width = cw; tmp.height = ch;
    const t = tmp.getContext('2d');
    t.clearRect(0, 0, cw, ch);
    const map = (s) => { const k = 1 + amt * 2; return Math.sign(s) * (1 - Math.pow(1 - Math.abs(s), k)); };
    for (let k = 0; k < N; k++) {
      const v0 = k / N, v1 = (k + 1) / N;
      const y0 = (map(v0 * 2 - 1) + 1) / 2 * ch, y1 = (map(v1 * 2 - 1) + 1) / 2 * ch;
      t.drawImage(b.c, 0, v0 * ch, cw, ch / N + 1, 0, y0, cw, y1 - y0 + 1);
    }
    for (let k = 0; k < N; k++) {
      const u0 = k / N, u1 = (k + 1) / N;
      const x0 = cx - ww / 2 + (map(u0 * 2 - 1) + 1) / 2 * ww, x1 = cx - ww / 2 + (map(u1 * 2 - 1) + 1) / 2 * ww;
      g.drawImage(tmp, u0 * cw, 0, cw / N + 1, ch, x0, cy - hh / 2, x1 - x0 + 0.002, hh);
    }
    if (o.alpha != null) g.restore();
    return hh;
  }
  // a block pushed back into 3D: dark copies behind, the face on top
  Wk.extrude = function (g, face, side, cx, cy, ww, mode, amt, ph, depth, dx, dy, o) {
    const n = Math.max(4, Math.round(depth * 60));
    for (let k = n; k >= 1; k--) Wk.warp(g, side, cx + dx * k / n, cy + dy * k / n, ww, mode, amt, ph, { n: 36 });
    return Wk.warp(g, face, cx, cy, ww, mode, amt, ph, o);
  };

  // ---------------------------------------------------------------- backdrops
  // a heart outline glowing like neon
  Wk.heartPath = function (cx, cy, s) {
    const p = new Path2D();
    p.moveTo(cx, cy + s * 0.42);
    p.bezierCurveTo(cx - s * 0.62, cy - s * 0.02, cx - s * 0.52, cy - s * 0.56, cx, cy - s * 0.26);
    p.bezierCurveTo(cx + s * 0.52, cy - s * 0.56, cx + s * 0.62, cy - s * 0.02, cx, cy + s * 0.42);
    p.closePath();
    return p;
  };
  Wk.neonHeart = function (g, cx, cy, s, col, k) {
    const p = Wk.heartPath(cx, cy, s);
    g.save();
    g.lineJoin = 'round';
    g.strokeStyle = rgba(col, 0.25 * k); g.lineWidth = s * 0.11; g.stroke(p);
    g.strokeStyle = rgba(col, 0.55 * k); g.lineWidth = s * 0.05; g.stroke(p);
    g.strokeStyle = rgba([255, 255, 255].map((v, i) => v * 0.5 + col[i] * 0.5), 0.95 * k); g.lineWidth = s * 0.018; g.stroke(p);
    g.restore();
  };
  // halftone dots, bigger in the middle
  const htc = new Map();
  Wk.halftone = function (g, cx, cy, size, col, a) {
    const key = col.join(',');
    let c = htc.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 512;
      const x = c.getContext('2d');
      x.fillStyle = rgba(col);
      const n = 46;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5, v = (j + 0.5) / n - 0.5, d = Math.hypot(u, v);
        const r = Math.max(0, 0.48 - d * 0.75) * (512 / n);
        if (r > 0.3) { x.beginPath(); x.arc((i + 0.5) * 512 / n, (j + 0.5) * 512 / n, r, 0, PI * 2); x.fill(); }
      }
      htc.set(key, c);
    }
    g.save(); g.globalAlpha *= a; g.drawImage(c, cx - size / 2, cy - size / 2, size, size); g.restore();
  };
  // rays of light from a point
  Wk.rays = function (g, cx, cy, r, n, rot, col, a) {
    g.save();
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * PI * 2, w = (PI / n) * (0.35 + 0.3 * Math.sin(i * 7.1));
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a0 + w); g.closePath(); g.fill();
    }
    g.restore();
  };
  // a line of text running round a circle
  Wk.ringText = function (g, cx, cy, r, txt, size, col, rot) {
    g.save();
    g.fillStyle = rgba(col);
    g.font = '400 100px ' + FONTS.heavy;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const per = (size * 0.78) / r;
    const n = Math.min(txt.length, Math.floor((PI * 2) / per));
    for (let i = 0; i < n; i++) {
      const a = rot + i * per;
      g.save(); g.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.rotate(a + PI / 2); g.scale(size / 100, size / 100); g.fillText(txt[i], 0, 0); g.restore();
    }
    g.restore();
  };
  // a sky with soft clouds over a rolling hill
  Wk.landscape = function (g, asp, t, hill) {
    const sky = g.createLinearGradient(0, -0.5, 0, 0.3);
    sky.addColorStop(0, 'rgb(40,110,220)'); sky.addColorStop(1, 'rgb(150,200,250)');
    g.fillStyle = sky; g.fillRect(-30, -30, 60, 60);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 0.37 + t * 0.01) % 1.6 - 0.8) * asp, y = -0.38 + (i % 3) * 0.07;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 0.04, y - (k % 2) * 0.015, 0.06, 0.028, 0, 0, PI * 2); g.fill(); }
    }
    const gr = g.createLinearGradient(0, 0.05, 0, 0.5);
    gr.addColorStop(0, 'rgb(' + hill.join(',') + ')'); gr.addColorStop(1, 'rgb(' + hill.map((v) => v * 0.55).join(',') + ')');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-30, 30); g.lineTo(-asp, 0.2); g.bezierCurveTo(-asp * 0.4, -0.05, asp * 0.1, 0.02, asp, 0.12); g.lineTo(30, 30); g.fill();
  };

  // ---------------------------------------------------------------- phone UI
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  Wk.rr = rr;
  const txt = (g, s, x, y, size, col, font, o) => {
    o = o || {};
    g.save(); g.translate(x, y); g.scale(size / 100, size / 100);
    g.font = (o.w || 500) + ' 100px ' + (FONTS[font] || font);
    g.fillStyle = rgba(col, o.a == null ? 1 : o.a);
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle';
    g.fillText(s, 0, 0);
    const w = g.measureText(s).width * size / 100;
    g.restore();
    return w;
  };
  Wk.txt = txt;
  Wk.measure = (s, size, font, w) => { scratch.font = (w || 500) + ' 100px ' + (FONTS[font] || font); if ('letterSpacing' in scratch) scratch.letterSpacing = '0px'; return scratch.measureText(s).width * size / 100; };
  // a sent message bubble; returns its width. (x, y) = its right edge, vertical centre
  Wk.bubble = function (g, s, x, y, size, col, ink, o) {
    o = o || {};
    const w = Math.max(size * 0.9, Wk.measure(s, size, 'ui', 500) + size * 1.1), h = size * 1.9, r = h / 2;
    const x0 = x - w;
    g.fillStyle = rgba(col);
    rr(g, x0, y - h / 2, w, h, r); g.fill();
    // the tail
    g.beginPath(); g.moveTo(x - size * 0.5, y + h / 2 - size * 0.55); g.quadraticCurveTo(x + size * 0.05, y + h / 2, x + size * 0.32, y + h / 2 + size * 0.05);
    g.quadraticCurveTo(x - size * 0.2, y + h / 2 + size * 0.05, x - size * 0.75, y + h / 2 - size * 0.25); g.fill();
    if (s) txt(g, s, x0 + size * 0.55, y + size * 0.03, size, ink, 'ui', { w: 500 });
    return w;
  };
  // a pill (a toast, a tag)
  Wk.pill = function (g, s, cx, cy, size, fill, ink, edge, icon) {
    const tw = Wk.measure(s, size, 'ui', 700), w = tw + size * (icon ? 2.3 : 1.6), h = size * 2;
    rr(g, cx - w / 2, cy - h / 2, w, h, size * 0.5);
    if (fill) { g.fillStyle = rgba(fill); g.fill(); }
    if (edge) { g.strokeStyle = rgba(edge); g.lineWidth = size * 0.07; g.stroke(); }
    txt(g, s, cx - w / 2 + size * 0.8, cy + size * 0.04, size, ink, 'ui', { w: 700 });
    if (icon) { const ix = cx + w / 2 - size * 1.05, iy = cy; g.fillStyle = rgba(ink); g.beginPath(); g.moveTo(ix - size * 0.3, iy - size * 0.45); g.lineTo(ix + size * 0.3, iy - size * 0.45); g.lineTo(ix + size * 0.3, iy + size * 0.45); g.lineTo(ix, iy + size * 0.2); g.lineTo(ix - size * 0.3, iy + size * 0.45); g.closePath(); g.fill(); }
    return w;
  };
  // an on-screen keyboard (top edge at y)
  const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  Wk.keyboard = function (g, x, y, w, hot, t) {
    const kh = w * 0.105, gap = w * 0.012, kw = (w - gap * 11) / 10;
    g.fillStyle = 'rgb(208,211,217)'; g.fillRect(x, y, w, kh * 4.6);
    KEYS.forEach((row, ri) => {
      const rw = row.length * kw + (row.length - 1) * gap, x0 = x + (w - rw) / 2;
      for (let i = 0; i < row.length; i++) {
        const kx = x0 + i * (kw + gap), ky = y + gap * 2 + ri * (kh + gap * 1.6);
        const on = hot === row[i];
        g.fillStyle = on ? 'rgb(170,176,186)' : 'rgb(255,255,255)'; rr(g, kx, ky, kw, kh, kw * 0.14); g.fill();
        txt(g, row[i], kx + kw / 2, ky + kh * 0.52, kh * 0.5, [20, 20, 24], 'ui', { align: 'center', w: 400 });
        if (on) { g.fillStyle = 'rgb(255,255,255)'; rr(g, kx - kw * 0.15, ky - kh * 1.25, kw * 1.3, kh * 1.2, kw * 0.2); g.fill(); txt(g, row[i], kx + kw / 2, ky - kh * 0.65, kh * 0.75, [20, 20, 24], 'ui', { align: 'center', w: 400 }); }
      }
    });
    return kh * 4.6;
  };
  // a loading spinner
  Wk.spinner = function (g, cx, cy, r, t, col) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2, k = ((i - Math.floor(t * 12)) % 12 + 12) % 12;
      g.strokeStyle = rgba(col, 0.25 + 0.75 * (k / 11)); g.lineWidth = r * 0.22; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
    }
  };
  // a red spell-check squiggle
  Wk.squiggle = function (g, x0, x1, y, a, col) {
    g.strokeStyle = rgba(col || [230, 30, 40]); g.lineWidth = a * 0.45; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x0, y);
    for (let x = x0, k = 0; x <= x1; x += a, k++) g.lineTo(x, y + (k % 2 ? a * 0.6 : -a * 0.1));
    g.stroke();
  };
  // stretch a word's vowel the way people type a sung-out word ("lyyyying")
  Wk.stretch = function (s, n) {
    if (n < 2) return s;
    const m = /([aeiouy])(?!.*[aeiouy])/i.exec(s) || /([aeiouy])/i.exec(s);
    if (!m) return s;
    return s.slice(0, m.index + 1) + m[1].repeat(n - 1) + s.slice(m.index + 1);
  };
})();
