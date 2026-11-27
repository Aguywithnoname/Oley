/* Oley · Pasteup kit: the print shop. Type set onto canvases (condensed, script, blackletter, ransom
   scraps), the cover turned into two- and three-tone cut-outs and halftone dots, paper shapes
   (bars, stickers, tickets, signs, starbursts, scribbles, cursors) and a colour scheme per song. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const PU = (O.PU = O.PU || {});
  const PI = Math.PI;

  PU.FONT = {
    cond: "'Oley Heavy', 'Bahnschrift Condensed', Impact, sans-serif",
    black: "'Oley Black', 'Arial Black', sans-serif",
    grot: "'Oley Display', 'Oley Sans', sans-serif",
    round: "'Oley Round', 'Oley Sans', sans-serif",
    serif: "'Oley Serif', Georgia, serif",
    script: "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', 'Oley Serif', cursive",
    gothic: "'Old English Text MT', 'Goudy Text MT', 'Oley Serif', serif",
    mono: "'Oley Mono', Consolas, monospace",
    hand: "'Ink Free', 'Segoe Print', 'Oley Serif', cursive",
    stencil: "Stencil, 'Oley Heavy', Impact, sans-serif",
    type: "'Courier New', 'Oley Mono', monospace",
  };
  const F = PU.FONT;
  PU.E = {
    lin: (k) => k,
    out3: (k) => 1 - Math.pow(1 - k, 3),
    out5: (k) => 1 - Math.pow(1 - k, 5),
    expo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    back: (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    in3: (k) => k * k * k,
    io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    step4: (k) => Math.floor(k * 4) / 4,
  };
  PU.rng = function (seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    f.r = (a, b) => a + (b - a) * f();
    f.i = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
    f.sgn = () => (f() < 0.5 ? -1 : 1);
    f.ch = (p) => f() < p;
    return f;
  };
  PU.hash = function (str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const C = (PU.C = (c, a) => U.rgba(c, a == null ? 1 : a));
  const cv = (PU.cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.min(4096, Math.ceil(w))); c.height = Math.max(2, Math.min(4096, Math.ceil(h))); return c; });
  const MC = cv(8, 8).getContext('2d');

  // ---------------------------------------------------------------- colour schemes
  const CUR = [
    { n: 'sodium', bg: [20, 16, 14], ink: [244, 236, 220], a: [255, 122, 34], b: [96, 44, 30] },
    { n: 'mint', bg: [214, 232, 220], ink: [16, 30, 26], a: [232, 64, 56], b: [44, 116, 94] },
    { n: 'bone', bg: [238, 232, 220], ink: [16, 18, 40], a: [44, 62, 222], b: [250, 186, 40] },
    { n: 'plum', bg: [38, 18, 42], ink: [246, 222, 234], a: [252, 110, 162], b: [124, 74, 206] },
    { n: 'lemon', bg: [246, 226, 64], ink: [16, 16, 18], a: [214, 36, 58], b: [252, 250, 244] },
    { n: 'tide', bg: [12, 40, 46], ink: [240, 236, 224], a: [255, 112, 92], b: [64, 184, 172] },
    { n: 'news', bg: [228, 224, 212], ink: [22, 22, 22], a: [206, 30, 32], b: [128, 126, 120] },
    { n: 'lilac', bg: [194, 174, 242], ink: [24, 16, 44], a: [212, 255, 64], b: [252, 250, 250] },
    { n: 'rust', bg: [182, 74, 38], ink: [252, 240, 222], a: [24, 20, 18], b: [250, 196, 120] },
    { n: 'forest', bg: [18, 34, 24], ink: [236, 232, 210], a: [236, 200, 64], b: [118, 160, 96] },
  ];
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  // finish a scheme with the derived inks
  function finish(S) {
    S.dark = lum(S.bg) < 0.45;
    S.deep = [14, 12, 14];
    S.on = (c) => (lum(c) > 0.55 ? [16, 14, 16] : [248, 244, 236]);
    S.paper = S.dark ? [240, 233, 220] : [252, 250, 245];
    S.duo = S.dark ? [S.bg, S.a] : [S.ink, S.a];
    return S;
  }
  // several looks for one song, so each section of it is printed differently: the cover's own dark and
  // light, its colour as the paper, plain newsprint or night, and a house scheme or two
  PU.schemeSet = function (pal, R) {
    const out = [];
    const first = PU.scheme(pal, R);
    out.push(first);
    if (pal) {
      const a = U.vivid(pal.vivid, 0.72, 0.88), b = U.vivid(pal.second, 0.45, 0.7);
      const dark = { n: 'cover-dark', bg: U.mix(pal.dark, [10, 9, 10], 0.55), ink: [244, 238, 228], a, b };
      const light = { n: 'cover-light', bg: U.mix(a, [246, 241, 232], 0.8), ink: [20, 18, 22], a: U.vivid(pal.vivid, 0.8, 0.62), b };
      const av = U.vivid(pal.vivid, 0.78, 0.55);
      const loud = { n: 'cover-loud', bg: av, ink: lum(av) > 0.5 ? [18, 16, 20] : [250, 246, 238], a: lum(av) > 0.5 ? [252, 250, 245] : [18, 16, 20], b: U.vivid(pal.second, 0.6, 0.5) };
      for (const S of [dark, light, loud]) if (S.n !== first.n) out.push(S);
    }
    out.push(R() < 0.5 ? { n: 'night', bg: [12, 11, 13], ink: [244, 240, 232], a: pal ? U.vivid(pal.vivid, 0.85, 0.6) : [255, 70, 60], b: [120, 118, 126] }
      : { n: 'newsprint', bg: [232, 228, 216], ink: [20, 20, 22], a: pal ? U.vivid(pal.vivid, 0.85, 0.5) : [210, 30, 30], b: [140, 136, 128] });
    const cur = CUR.slice();
    for (let k = 0; k < 2; k++) { const i = Math.floor(R() * cur.length); out.push(Object.assign({}, cur.splice(i, 1)[0])); }
    return out.map((S) => finish(S));
  };
  PU.scheme = function (pal, R) {
    let S;
    if (pal && R() < 0.6) {
      const a = U.vivid(pal.vivid, 0.72, 0.88), b = U.vivid(pal.second, 0.45, 0.7);
      if (R() < 0.55) S = { n: 'cover-dark', bg: U.mix(pal.dark, [10, 9, 10], 0.55), ink: [244, 238, 228], a, b };
      else S = { n: 'cover-light', bg: U.mix(a, [246, 241, 232], 0.8), ink: [20, 18, 22], a: U.vivid(pal.vivid, 0.8, 0.62), b };
    } else S = Object.assign({}, R.pick(CUR));
    return finish(S);
  };

  // ---------------------------------------------------------------- type
  // set a string onto a canvas. px: font size in pixels. o: f, wt, it, ls (em), sx (squeeze), fill, st/sw (stroke under),
  // ol/oc (outline only), sh [dx,dy] + shc (offset copy), rough (0..1 worn ink), up
  PU.txt = function (s, o) {
    o = o || {};
    if (o.up) s = s.toUpperCase();
    const px = Math.round(o.px || 200);
    const font = `${o.it ? 'italic ' : ''}${o.wt || 400} ${px}px ${o.f || F.cond}`;
    MC.font = font;
    try { MC.letterSpacing = Math.round((o.ls || 0) * px) + 'px'; } catch (e) {}
    const mt = MC.measureText(s);
    const asc = Math.max(mt.actualBoundingBoxAscent || px * 0.75, px * 0.2), dsc = Math.max(mt.actualBoundingBoxDescent || px * 0.1, px * 0.02);
    const l = Math.max(0, mt.actualBoundingBoxLeft || 0), r = Math.max(mt.width, mt.actualBoundingBoxRight || mt.width);
    const sx = o.sx || 1, sw = (o.sw || 0) + (o.ol || 0);
    const shx = o.sh ? Math.abs(o.sh[0]) : 0, shy = o.sh ? Math.abs(o.sh[1]) : 0;
    const pad = Math.ceil(px * 0.05 + sw + 2);
    const c = cv((l + r) * sx + pad * 2 + shx, asc + dsc + pad * 2 + shy);
    const x = c.getContext('2d');
    x.font = font;
    try { x.letterSpacing = MC.letterSpacing; } catch (e) {}
    x.translate(pad + (o.sh && o.sh[0] < 0 ? shx : 0), pad + asc + (o.sh && o.sh[1] < 0 ? shy : 0));
    x.scale(sx, 1);
    x.translate(l, 0);
    x.lineJoin = 'round'; x.lineCap = 'round';
    if (o.sh) { x.fillStyle = o.shc || '#000'; x.fillText(s, o.sh[0] / sx, o.sh[1]); }
    if (o.sw && o.st) { x.lineWidth = (o.sw * 2) / sx; x.strokeStyle = o.st; x.strokeText(s, 0, 0); }
    if (o.fill !== null) { x.fillStyle = o.fill || '#fff'; x.fillText(s, 0, 0); }
    if (o.ol) { x.lineWidth = o.ol / sx; x.strokeStyle = o.oc || '#fff'; x.strokeText(s, 0, 0); }
    if (o.rough) PU.rough(c, o.rough);
    return c;
  };
  // a string sized to fit a box (frame units * pxPerUnit)
  PU.fit = function (s, o, maxW, maxH) {
    const t = PU.txt(s, Object.assign({}, o, { px: 100, rough: 0 }));
    const k = Math.min(maxW / t.width, maxH / t.height) * 100;
    return PU.txt(s, Object.assign({}, o, { px: U.clamp(k, 14, 1100) }));
  };
  // worn ink: specks and scratches knocked out of whatever is on the canvas
  PU.rough = function (c, amt) {
    const x = c.getContext('2d'), n = Math.round(((c.width * c.height) / 900) * amt);
    x.save(); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n; i++) { x.globalAlpha = 0.4 + Math.random() * 0.6; x.beginPath(); x.arc(Math.random() * c.width, Math.random() * c.height, 0.6 + Math.random() * Math.random() * 3.2, 0, PI * 2); x.fill(); }
    x.globalAlpha = 0.5; x.lineWidth = 1.2;
    for (let i = 0; i < n / 60; i++) { const X = Math.random() * c.width, Y = Math.random() * c.height; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (Math.random() - 0.5) * 80, Y + (Math.random() - 0.5) * 8); x.stroke(); }
    x.restore();
    return c;
  };
  PU.solid = (col, a) => { const c = cv(4, 4), x = c.getContext('2d'); x.fillStyle = C(col, a); x.fillRect(0, 0, 4, 4); return c; };
  PU.rect = (w, h, col, o) => {
    o = o || {};
    const c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = C(col);
    if (o.r) { x.beginPath(); x.roundRect(0, 0, w, h, o.r); x.fill(); } else x.fillRect(0, 0, w, h);
    if (o.torn) PU.torn(c, o.torn);
    if (o.rough) PU.rough(c, o.rough);
    return c;
  };
  // torn / deckled edges
  PU.torn = function (c, amt) {
    const x = c.getContext('2d'), w = c.width, h = c.height, j = Math.max(2, Math.min(w, h) * 0.009 * amt);
    x.save(); x.globalCompositeOperation = 'destination-in';
    x.beginPath();
    const pts = [];
    const edge = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { const k = i / n; pts.push([x0 + (x1 - x0) * k + (Math.random() - 0.5) * j * (y0 === y1 ? 0.6 : 2), y0 + (y1 - y0) * k + (Math.random() - 0.5) * j * (y0 === y1 ? 2 : 0.6)]); } };
    const nx = Math.ceil(w / 7), ny = Math.ceil(h / 7);
    edge(j, j, w - j, j, nx); edge(w - j, j, w - j, h - j, ny); edge(w - j, h - j, j, h - j, nx); edge(j, h - j, j, j, ny);
    pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath(); x.fill(); x.restore();
    return c;
  };
  PU.micro = function (lines, o) {
    o = o || {};
    const px = o.px || 22, lh = px * 1.3;
    MC.font = `${o.wt || 500} ${px}px ${o.f || F.mono}`;
    const w = Math.max(...lines.map((s) => MC.measureText(s).width)) + 8;
    const c = cv(w, lh * lines.length + 6), x = c.getContext('2d');
    x.font = MC.font; x.fillStyle = o.fill || '#fff'; x.textBaseline = 'top';
    lines.forEach((s, i) => x.fillText(s, 4, 3 + i * lh));
    return c;
  };
  PU.barcode = function (w, h, col) {
    const c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = C(col);
    let X = 0;
    while (X < w) { const bw = 1 + Math.floor(Math.random() * 4) * (w / 160); if (Math.random() < 0.58) x.fillRect(X, 0, bw, h * 0.82); X += bw + w / 160; }
    x.font = `500 ${Math.round(h * 0.15)}px ${F.mono}`; x.textBaseline = 'bottom';
    x.fillText(String(Math.floor(Math.random() * 9e11 + 1e11)), 0, h);
    return c;
  };
  PU.burst = function (size, col, n, o) {
    o = o || {};
    const c = cv(size, size), x = c.getContext('2d'), R1 = size * 0.47, R0 = size * 0.94 * (o.inner || 0.36);
    x.fillStyle = C(col); x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * PI * 2, r = i % 2 ? R0 : R1 * (o.jag ? 0.82 + Math.random() * 0.18 : 1); x.lineTo(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r); }
    x.closePath(); x.fill();
    return c;
  };
  // a marker loop round something, drawn twice over like a real pen
  PU.loop = function (w, h, col, lw) {
    const c = cv(w, h), x = c.getContext('2d');
    x.strokeStyle = C(col); x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    for (let i = 0; i <= 140; i++) {
      const k = i / 120, a = -PI * 0.6 + k * PI * 2;
      const rx = (w / 2 - lw) * (0.92 + 0.08 * Math.sin(k * 7)), ry = (h / 2 - lw) * (0.9 + 0.1 * Math.cos(k * 5));
      x.lineTo(w / 2 + Math.cos(a) * rx * (1 - k * 0.04), h / 2 + Math.sin(a) * ry * (1 - k * 0.06));
    }
    x.stroke();
    return c;
  };
  PU.arrow = function (w, h, col, lw, flip) {
    const c = cv(w, h), x = c.getContext('2d');
    x.strokeStyle = C(col); x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
    if (flip) { x.translate(w, 0); x.scale(-1, 1); }
    const ex = w - lw * 2, ey = h * 0.25;
    x.beginPath(); x.moveTo(lw * 2, h - lw * 2); x.bezierCurveTo(w * 0.15, h * 0.2, w * 0.6, h * 0.95, ex, ey); x.stroke();
    x.beginPath(); x.moveTo(ex - w * 0.16, ey - h * 0.02); x.lineTo(ex, ey); x.lineTo(ex - w * 0.06, ey + h * 0.2); x.stroke();
    return c;
  };
  PU.cursor = function (size, fill, line) {
    const c = cv(size, size * 1.4), x = c.getContext('2d'), k = size / 24;
    x.scale(k, k);
    x.beginPath(); x.moveTo(2, 2); x.lineTo(2, 26); x.lineTo(8, 20.5); x.lineTo(12, 30); x.lineTo(16, 28.4); x.lineTo(12, 19); x.lineTo(20, 19); x.closePath();
    x.fillStyle = fill || '#111'; x.fill(); x.lineWidth = 1.6; x.strokeStyle = line || '#fff'; x.stroke();
    return c;
  };
  // a sign: triangle, circle, diamond or octagon with the word inside
  PU.sign = function (shape, size, col, ink, word, f) {
    const c = cv(size, size), x = c.getContext('2d'), m = size / 2, lw = size * 0.05;
    x.beginPath();
    if (shape === 'tri') { x.moveTo(m, size * 0.06); x.lineTo(size * 0.96, size * 0.9); x.lineTo(size * 0.04, size * 0.9); }
    else if (shape === 'dia') { x.moveTo(m, size * 0.03); x.lineTo(size * 0.97, m); x.lineTo(m, size * 0.97); x.lineTo(size * 0.03, m); }
    else if (shape === 'oct') { for (let i = 0; i < 8; i++) { const a = PI / 8 + (i * PI) / 4; x.lineTo(m + Math.cos(a) * m * 0.97, m + Math.sin(a) * m * 0.97); } }
    else x.arc(m, m, m * 0.95, 0, PI * 2);
    x.closePath();
    x.fillStyle = C(col); x.fill(); x.lineWidth = lw; x.strokeStyle = C(ink); x.stroke();
    x.save(); x.clip();
    const t = PU.fit(word, { f, wt: 400, fill: C(ink), up: true }, size * (shape === 'tri' ? 0.56 : 0.7), size * 0.34);
    x.drawImage(t, m - t.width / 2, (shape === 'tri' ? size * 0.62 : m) - t.height / 2);
    x.restore();
    return PU.rough(c, 0.5);
  };
  // a ticket stub
  PU.ticket = function (w, h, S, word, R) {
    const c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = C(S.paper); x.beginPath(); x.roundRect(0, 0, w, h, h * 0.06); x.fill();
    x.save(); x.globalCompositeOperation = 'destination-out';
    for (const X of [w * 0.72]) for (const Y of [0, h]) { x.beginPath(); x.arc(X, Y, h * 0.09, 0, PI * 2); x.fill(); }
    x.restore();
    x.strokeStyle = C(S.on(S.paper), 0.5); x.setLineDash([h * 0.03, h * 0.03]); x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.72, h * 0.1); x.lineTo(w * 0.72, h * 0.9); x.stroke(); x.setLineDash([]);
    x.fillStyle = C(S.a); x.fillRect(0, 0, w * 0.72, h * 0.16);
    x.fillStyle = C(S.on(S.a)); x.font = `600 ${Math.round(h * 0.08)}px ${F.mono}`; x.textBaseline = 'middle'; x.fillText('ADMIT ONE  ·  NO ' + R.i(100, 999), w * 0.04, h * 0.08);
    const t = PU.fit(word, { f: F.cond, fill: C(S.on(S.paper)), up: true, rough: 0.2 }, w * 0.64, h * 0.5);
    x.drawImage(t, w * 0.36 - t.width / 2, h * 0.56 - t.height / 2);
    x.fillStyle = C(S.on(S.paper)); x.font = `600 ${Math.round(h * 0.07)}px ${F.mono}`; x.textBaseline = 'alphabetic';
    x.fillText('ROW ' + 'ABCDEFGH'[R.i(0, 7)] + '   SEAT ' + R.i(1, 40) + '   GATE ' + R.i(1, 12), w * 0.04, h * 0.93);
    x.save(); x.translate(w * 0.86, h * 0.5); x.rotate(-PI / 2); x.drawImage(PU.barcode(h * 0.7, w * 0.16, S.on(S.paper)), -h * 0.35, -w * 0.08); x.restore();
    return PU.rough(c, 0.35);
  };

  // a registration target, like the ones in the margin of a print sheet
  PU.reg = function (size, col) {
    const c = cv(size, size), x = c.getContext('2d'), m = size / 2;
    x.strokeStyle = C(col); x.lineWidth = Math.max(1.5, size * 0.03);
    x.beginPath(); x.arc(m, m, size * 0.3, 0, PI * 2); x.stroke();
    x.beginPath(); x.moveTo(m, size * 0.04); x.lineTo(m, size * 0.96); x.moveTo(size * 0.04, m); x.lineTo(size * 0.96, m); x.stroke();
    x.fillStyle = C(col); x.beginPath(); x.arc(m, m, size * 0.12, 0, PI / 2); x.lineTo(m, m); x.fill(); x.beginPath(); x.arc(m, m, size * 0.12, PI, PI * 1.5); x.lineTo(m, m); x.fill();
    return c;
  };
  // a colour bar
  PU.swatch = function (w, h, cols) {
    const c = cv(w, h), x = c.getContext('2d'), n = cols.length;
    cols.forEach((k, i) => { x.fillStyle = C(k); x.fillRect((i * w) / n + 1, 0, w / n - 2, h); });
    return c;
  };
  // a strip of matte tape
  PU.tape = function (w, h, col) {
    const c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = C(col || [236, 228, 200], 0.72); x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < h; y += 3) { x.fillRect(0, y, 2 + Math.random() * 5, 3); x.fillRect(w - 2 - Math.random() * 5, y, 8, 3); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, Math.random() * 30, 1);
    return c;
  };
  // an outlined frame
  PU.frameRect = function (w, h, col, lw) {
    const c = cv(w, h), x = c.getContext('2d');
    x.strokeStyle = C(col); x.lineWidth = lw; x.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    return c;
  };

  // ---------------------------------------------------------------- the cover as print
  const SZ = 720;
  PU.Art = class {
    constructor(img, maskCanvas) {
      this.ok = false;
      this.cache = new Map();
      if (!img || !(img.naturalWidth || img.width)) return;
      const c = cv(SZ, SZ), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, SZ, SZ);
      let px;
      try { px = x.getImageData(0, 0, SZ, SZ).data; } catch (e) { return; }
      const N = SZ * SZ, Y = new Float32Array(N);
      const hist = new Uint32Array(256);
      for (let i = 0; i < N; i++) { const v = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]; Y[i] = v / 255; hist[Math.min(255, v | 0)]++; }
      const pct = (p) => { let a = 0; for (let i = 0; i < 256; i++) { a += hist[i]; if (a >= N * p) return i / 255; } return 1; };
      const lo = pct(0.03), hi = Math.max(lo + 0.1, pct(0.97));
      for (let i = 0; i < N; i++) Y[i] = U.sat((Y[i] - lo) / (hi - lo));
      this.med = pct(0.5);
      this.Y = Y;
      this.img = img;
      // subject mask (from the app's cut-out or a guess); without one, cut-outs become photo cards
      this.M = null;
      if (maskCanvas) {
        const m = cv(SZ, SZ), mx = m.getContext('2d', { willReadFrequently: true });
        mx.drawImage(maskCanvas, 0, 0, SZ, SZ);
        const d = mx.getImageData(0, 0, SZ, SZ).data, M = new Float32Array(N);
        let area = 0, x0 = SZ, y0 = SZ, x1 = 0, y1 = 0;
        for (let i = 0; i < N; i++) { const v = d[i * 4] / 255; M[i] = v; if (v > 0.5) { area++; const X = i % SZ, Yy = (i / SZ) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Yy < y0) y0 = Yy; if (Yy > y1) y1 = Yy; } }
        if (area > N * 0.04 && area < N * 0.9) {
          this.M = M;
          const pad = 14;
          this.box = [Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(SZ, x1 + pad), Math.min(SZ, y1 + pad)];
        }
      }
      this.ok = true;
    }
    get cut() { return !!this.M; }
    // kind: duo | tri | tone | dots ; cols: inks; o.full: whole square (no mask); o.border: paper outline (sticker)
    get(kind, cols, o) {
      o = o || {};
      const key = kind + cols.map((c) => c.join(',')).join('|') + (o.full ? 'F' : '') + (o.border ? 'B' : '') + (o.thr || '');
      if (this.cache.has(key)) return this.cache.get(key);
      const N = SZ * SZ, Y = this.Y, M = o.full ? null : this.M;
      const c = cv(SZ, SZ), x = c.getContext('2d'), im = x.createImageData(SZ, SZ), d = im.data;
      const thr = o.thr || U.clamp(this.med + 0.02, 0.35, 0.65);
      const ss = (a, b, v) => { const k = U.sat((v - a) / (b - a)); return k * k * (3 - 2 * k); };
      const c0 = cols[0], c1 = cols[1] || cols[0], c2 = cols[2] || c1;
      for (let i = 0; i < N; i++) {
        const n = (((i * 1103515245 + 12345) >>> 8) % 1000) / 1000 - 0.5;
        const v = Y[i] + n * 0.05;
        let r, g, b, a = M ? M[i] : 1;
        if (kind === 'duo') { const k = ss(thr - 0.035, thr + 0.035, v); r = c0[0] + (c1[0] - c0[0]) * k; g = c0[1] + (c1[1] - c0[1]) * k; b = c0[2] + (c1[2] - c0[2]) * k; }
        else if (kind === 'tri') {
          const k1 = ss(thr - 0.17, thr - 0.12, v), k2 = ss(thr + 0.12, thr + 0.17, v);
          const m0 = [c0[0] + (c1[0] - c0[0]) * k1, c0[1] + (c1[1] - c0[1]) * k1, c0[2] + (c1[2] - c0[2]) * k1];
          r = m0[0] + (c2[0] - m0[0]) * k2; g = m0[1] + (c2[1] - m0[1]) * k2; b = m0[2] + (c2[2] - m0[2]) * k2;
        } else if (kind === 'tone') { const k = Math.pow(ss(0.02, 0.98, v), 0.9); r = c0[0] + (c1[0] - c0[0]) * k; g = c0[1] + (c1[1] - c0[1]) * k; b = c0[2] + (c1[2] - c0[2]) * k; }
        else { r = c0[0]; g = c0[1]; b = c0[2]; a = 0; }
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a * 255;
      }
      if (kind === 'dots') {
        // halftone: dots on a 45° grid, bigger where the picture is darker
        const cell = 9, ca = Math.SQRT1_2;
        for (let yy = 0; yy < SZ; yy++) for (let xx = 0; xx < SZ; xx++) {
          const u = (xx + yy) * ca, v = (yy - xx) * ca;
          const cu = (Math.floor(u / cell) + 0.5) * cell, cvv = (Math.floor(v / cell) + 0.5) * cell;
          const sx = Math.round((cu - cvv) * ca), sy = Math.round((cu + cvv) * ca);
          const si = U.clamp(sy, 0, SZ - 1) * SZ + U.clamp(sx, 0, SZ - 1);
          const rad = Math.sqrt(1 - Y[si]) * cell * 0.62;
          const dd = Math.hypot(u - cu, v - cvv);
          const i = yy * SZ + xx;
          d[i * 4 + 3] = U.sat(rad - dd + 0.5) * (M ? M[i] : 1) * 255;
        }
      }
      x.putImageData(im, 0, 0);
      let out = c;
      if (o.border && M) {
        // a paper edge round the cut-out, like a sticker
        const b = cv(SZ, SZ), bx = b.getContext('2d');
        bx.filter = 'blur(5px)'; bx.drawImage(c, 0, 0); bx.filter = 'none';
        const bd = bx.getImageData(0, 0, SZ, SZ);
        const pc = o.border;
        for (let i = 0; i < N; i++) { const a = bd.data[i * 4 + 3]; bd.data[i * 4] = pc[0]; bd.data[i * 4 + 1] = pc[1]; bd.data[i * 4 + 2] = pc[2]; bd.data[i * 4 + 3] = a > 8 ? 255 : a * 30; }
        bx.putImageData(bd, 0, 0);
        bx.drawImage(c, 0, 0);
        out = b;
      }
      // crop to the subject
      if (M && this.box) {
        const [x0, y0, x1, y1] = this.box, cc = cv(x1 - x0, y1 - y0);
        cc.getContext('2d').drawImage(out, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        out = cc;
      }
      if (o.torn && !M) PU.torn(out, o.torn);
      this.cache.set(key, out);
      if (this.cache.size > 24) this.cache.delete(this.cache.keys().next().value);
      return out;
    }
    // a framed crop of the cover (a photo card)
    card(kind, cols, w, h, o) {
      o = o || {};
      const src = this.get(kind, cols, { full: true });
      const c = cv(w, h), x = c.getContext('2d');
      const s = Math.max(w / SZ, h / SZ) * (o.zoom || 1);
      x.drawImage(src, (w - SZ * s) / 2 + (o.ox || 0) * w, (h - SZ * s) / 2 + (o.oy || 0) * h, SZ * s, SZ * s);
      if (o.frame) { x.strokeStyle = C(o.frame); x.lineWidth = Math.max(6, w * 0.035); x.strokeRect(0, 0, w, h); }
      if (o.torn) PU.torn(c, o.torn);
      return c;
    }
    // the cut-out as code: drawn in characters, ones and zeros, engraved lines or big pixels.
    // kind: ascii | binary | matrix | lines | pixel ; cols: [ink] or [ink, second ink]
    // o.full: the whole square; o.dark: light characters meant for a dark ground; o.cell: character height in px
    code(kind, cols, o) {
      o = o || {};
      const key = 'code' + kind + cols.map((c) => c.join(',')).join('|') + (o.full ? 'F' : '') + (o.dark ? 'D' : '') + (o.cell || '');
      if (this.cache.has(key)) return this.cache.get(key);
      const Y = this.Y, M = o.full ? null : this.M;
      const c = cv(SZ, SZ), x = c.getContext('2d');
      const at = (X, Yy) => { const i = U.clamp(Yy | 0, 0, SZ - 1) * SZ + U.clamp(X | 0, 0, SZ - 1); return [Y[i], M ? M[i] : 1]; };
      const c0 = cols[0], c1 = cols[1] || cols[0];
      // tone that decides how much ink: on a dark ground the bright parts get the dense characters
      const ink = (v) => (o.dark ? v : 1 - v);
      if (kind === 'ascii' || kind === 'binary' || kind === 'matrix') {
        const ch = o.cell || (kind === 'matrix' ? 15 : 13), cw = Math.round(ch * 0.62);
        const RAMP = kind === 'binary' ? '  .:01' : kind === 'matrix' ? ' .:-=+*1708#%@' : " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
        x.font = `700 ${Math.round(ch * 1.02)}px 'Oley Mono', Consolas, monospace`;
        x.textBaseline = 'alphabetic';
        const rnd = (n) => (((n * 1103515245 + 12345) >>> 8) % 1000) / 1000;
        const cols2 = Math.ceil(SZ / cw), rows = Math.ceil(SZ / ch);
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols2; q++) {
          const [v, m] = at(q * cw + cw / 2, r * ch + ch / 2);
          if (m < 0.45) continue;
          let k = ink(v);
          if (kind === 'matrix') k *= 0.55 + 0.45 * Math.abs(Math.sin(q * 1.7 + r * 0.21 + rnd(q) * 6));
          if (k < 0.06) continue;
          let g;
          if (kind === 'binary') g = rnd(r * 977 + q) < 0.5 ? '0' : '1';
          else if (kind === 'matrix') g = '01ZX7#$%&*+=<>{}[]/'[Math.floor(rnd(r * 131 + q * 17) * 19)];
          else g = RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(k * (RAMP.length - 1))))];
          const col = k > 0.72 ? c1 : c0;
          x.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${kind === 'ascii' ? 1 : 0.35 + 0.65 * k})`;
          x.fillText(g, q * cw, r * ch + ch * 0.85);
        }
      } else if (kind === 'lines') {
        // an engraving: horizontal lines that thicken where the picture is darker
        const gap = o.cell || 7;
        x.fillStyle = C(c0);
        for (let yy = gap / 2; yy < SZ; yy += gap) for (let xx = 0; xx < SZ; xx += 2) {
          const [v, m] = at(xx, yy + Math.sin(xx * 0.03) * 1.5);
          if (m < 0.45) continue;
          const th = ink(v) * gap * 0.92;
          if (th > 0.35) x.fillRect(xx, yy - th / 2 + Math.sin(xx * 0.03) * 1.5, 2, th);
        }
      } else {
        // big square pixels
        const px = o.cell || 24;
        for (let yy = 0; yy < SZ; yy += px) for (let xx = 0; xx < SZ; xx += px) {
          const [v, m] = at(xx + px / 2, yy + px / 2);
          if (m < 0.45) continue;
          const k = v;
          const col = [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
          x.fillStyle = C(col); x.fillRect(xx, yy, px - (o.gapPx || 0), px - (o.gapPx || 0));
        }
      }
      let out = c;
      if (M && this.box) {
        const [x0, y0, x1, y1] = this.box, cc = cv(x1 - x0, y1 - y0);
        cc.getContext('2d').drawImage(out, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
        out = cc;
      }
      this.cache.set(key, out);
      if (this.cache.size > 24) this.cache.delete(this.cache.keys().next().value);
      return out;
    }
  };
})();
