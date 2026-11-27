/* Oley · Glass kit: the pieces of a polished app-ad edit, drawn for Oley. A frosted, pearly background;
   the album cover blurred into a backdrop; a morphing blob; a mouse pointer that clicks; text that blurs in;
   a pixel word built from blocks; an eyeball; embers; a torn sheet of paper; a vinyl record; drawn icons
   for buttons. World units: the screen is 1 tall. */
(function () {
  'use strict';
  const O = window.Oley;
  const Gk = (O.Glass = O.Glass || {});
  const Wk = O.Warp;
  const PI = Math.PI;
  const rgba = Wk.rgba;
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  Gk.FONT = {
    ui: '"Oley Display", "Oley Sans", Inter, system-ui, sans-serif',
    round: '"Oley Round", Poppins, sans-serif',
    serif: '"Oley Serif", Georgia, serif',
    heavy: '"Oley Black", "Archivo Black", sans-serif',
  };
  // text with a weight and a family, centred or not; returns its width
  Gk.txt = function (g, s, x, y, size, col, o) {
    o = o || {};
    g.save();
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    g.scale(size / 100, size / 100);
    g.font = (o.italic ? 'italic ' : '') + (o.w || 500) + ' 100px ' + (Gk.FONT[o.f || 'ui'] || o.f);
    if ('letterSpacing' in g) g.letterSpacing = (o.track || 0) * 100 + 'px';
    g.fillStyle = rgba(col, o.a == null ? 1 : o.a);
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle';
    if (o.blur) g.filter = 'blur(' + o.blur + 'px)';
    if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.shadowBlur || 20; g.shadowOffsetY = o.shadowY || 0; }
    g.fillText(s, 0, 0);
    const w = g.measureText(s).width * size / 100;
    g.restore();
    return w;
  };
  const mctx = document.createElement('canvas').getContext('2d');
  Gk.measure = function (s, size, o) {
    o = o || {};
    mctx.font = (o.italic ? 'italic ' : '') + (o.w || 500) + ' 100px ' + (Gk.FONT[o.f || 'ui'] || o.f);
    if ('letterSpacing' in mctx) mctx.letterSpacing = (o.track || 0) * 100 + 'px';
    return mctx.measureText(s).width * size / 100;
  };
  // wrap words into rows no wider than maxW
  Gk.wrap = function (words, size, maxW, o) {
    const rows = [[]];
    let w = 0;
    const sp = Gk.measure(' ', size, o);
    for (const x of words) {
      const m = Gk.measure(x.s, size, o);
      if (rows[rows.length - 1].length && w + sp + m > maxW) { rows.push([]); w = 0; }
      const r = rows[rows.length - 1];
      x.x = r.length ? w + sp : 0; x.m = m;
      w = x.x + m;
      r.push(x);
    }
    return rows;
  };

  // ---------------------------------------------------------------- backdrops
  // a pearly, crinkled, frosted white
  let frostTex = null;
  Gk.frost = function (g, asp, t, tint) {
    if (!frostTex) {
      // crinkled foil: soft folds of white light over a pale lavender
      frostTex = document.createElement('canvas'); frostTex.width = frostTex.height = 512;
      const x = frostTex.getContext('2d');
      const gr = x.createLinearGradient(0, 0, 512, 512);
      gr.addColorStop(0, 'rgb(236,238,252)'); gr.addColorStop(1, 'rgb(214,220,246)');
      x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
      const R = O.asciiRng(41);
      const fold = (blur, n, wMin, wMax, col) => {
        x.filter = 'blur(' + blur + 'px)';
        for (let i = 0; i < n; i++) {
          x.strokeStyle = col(R); x.lineWidth = R.r(wMin, wMax); x.lineJoin = 'round';
          x.beginPath();
          let px = R.r(-60, 570), py = R.r(-60, 570);
          x.moveTo(px, py);
          for (let k = 0; k < 5; k++) { const nx = px + R.r(-90, 90), ny = py + R.r(-90, 90); x.lineTo(nx, ny); px = nx; py = ny; }
          x.stroke();
        }
      };
      fold(9, 60, 10, 26, (r) => 'rgba(160,172,232,' + r.r(0.15, 0.3) + ')');
      fold(5, 120, 4, 12, (r) => 'rgba(255,255,255,' + r.r(0.5, 0.9) + ')');
      fold(1.5, 90, 1, 3, (r) => 'rgba(255,255,255,' + r.r(0.4, 0.8) + ')');
      x.filter = 'none';
    }
    const s = asp * 1.25, a = Math.sin(t * 0.07) * 0.05;
    g.save(); g.rotate(a);
    g.drawImage(frostTex, -s / 2 - 0.1 + Math.sin(t * 0.11) * 0.05, -s / 2, s + 0.2, s);
    g.restore();
    if (tint) { g.fillStyle = rgba(tint, 0.18); g.fillRect(-30, -30, 60, 60); }
  };
  // the cover, heavily blurred and darkened, as a backdrop
  const blurCache = new WeakMap();
  Gk.coverBlur = function (img, dark) {
    if (!img) return null;
    let c = blurCache.get(img);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 192;
      const x = c.getContext('2d');
      x.filter = 'blur(14px) saturate(1.3)';
      x.drawImage(img, -24, -24, 240, 240);
      blurCache.set(img, c);
    }
    return c;
  };
  Gk.coverBg = function (g, img, asp, t, dark, fallback) {
    const c = Gk.coverBlur(img);
    const s = Math.max(asp, 1) * 1.6;
    if (c) {
      g.save(); g.rotate(Math.sin(t * 0.05) * 0.15); g.drawImage(c, -s / 2 + Math.sin(t * 0.13) * 0.05, -s / 2, s, s); g.restore();
    } else {
      const gr = g.createLinearGradient(0, -0.5, 0, 0.5);
      gr.addColorStop(0, rgba(fallback || [70, 40, 90])); gr.addColorStop(1, 'rgb(20,14,26)');
      g.fillStyle = gr; g.fillRect(-30, -30, 60, 60);
    }
    g.fillStyle = 'rgba(0,0,0,' + (dark == null ? 0.4 : dark) + ')'; g.fillRect(-30, -30, 60, 60);
  };
  // a soft blue blob that wobbles
  Gk.blob = function (g, x, y, r, t, col) {
    g.save();
    g.filter = 'blur(' + Math.max(1, r * 30) + 'px)';
    g.fillStyle = rgba(col || [20, 60, 240]);
    g.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * PI * 2, k = 1 + 0.22 * Math.sin(a * 2 + t * 2.1) + 0.12 * Math.sin(a * 3 - t * 1.7);
      const px = x + Math.cos(a) * r * k * 1.5, py = y + Math.sin(a) * r * k * 0.7;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.fill();
    g.restore();
  };
  // ---------------------------------------------------------------- a mouse pointer
  Gk.cursor = function (g, x, y, s, press) {
    const k = press ? 0.85 : 1;
    g.save(); g.translate(x, y); g.scale(s * k, s * k);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 1.0); g.lineTo(0.26, 0.76); g.lineTo(0.44, 1.12); g.lineTo(0.58, 1.05); g.lineTo(0.41, 0.7); g.lineTo(0.75, 0.7); g.closePath();
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
    g.fillStyle = '#111'; g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 0.08; g.strokeStyle = '#fff'; g.stroke();
    g.restore();
  };
  // ---------------------------------------------------------------- simple icons (unit box, centred)
  Gk.icon = function (g, kind, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.strokeStyle = rgba(col); g.fillStyle = rgba(col); g.lineWidth = 0.09; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    switch (kind) {
      case 'note': g.moveTo(-0.15, 0.3); g.lineTo(-0.15, -0.35); g.lineTo(0.3, -0.45); g.lineTo(0.3, 0.2); g.stroke(); g.beginPath(); g.ellipse(-0.27, 0.32, 0.14, 0.1, -0.4, 0, PI * 2); g.ellipse(0.18, 0.22, 0.14, 0.1, -0.4, 0, PI * 2); g.fill(); break;
      case 'mic': g.moveTo(0, -0.42); g.arc(0, -0.15, 0.14, -PI, 0); g.lineTo(0.14, 0.02); g.arc(0, 0.02, 0.14, 0, PI); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0.0, 0.26, 0.1, PI - 0.1); g.moveTo(0, 0.26); g.lineTo(0, 0.42); g.stroke(); break;
      case 'heart': g.moveTo(0, 0.35); g.bezierCurveTo(-0.5, 0, -0.35, -0.45, 0, -0.18); g.bezierCurveTo(0.35, -0.45, 0.5, 0, 0, 0.35); g.stroke(); break;
      case 'star': for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 0.18 : 0.42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke(); break;
      case 'bolt': g.moveTo(0.08, -0.45); g.lineTo(-0.2, 0.05); g.lineTo(0.02, 0.05); g.lineTo(-0.08, 0.45); g.lineTo(0.22, -0.08); g.lineTo(0, -0.08); g.closePath(); g.stroke(); break;
      case 'play': g.moveTo(-0.15, -0.3); g.lineTo(0.3, 0); g.lineTo(-0.15, 0.3); g.closePath(); g.stroke(); break;
      case 'wave': for (let i = -3; i <= 3; i++) { const h = 0.12 + 0.28 * Math.abs(Math.cos(i * 0.9)); g.moveTo(i * 0.11, -h); g.lineTo(i * 0.11, h); } g.stroke(); break;
      case 'moon': g.arc(0, 0, 0.32, 0.6, PI * 2 - 0.6); g.quadraticCurveTo(-0.05, 0, Math.cos(0.6) * 0.32, Math.sin(0.6) * 0.32); g.stroke(); break;
      case 'phone': g.moveTo(-0.3, -0.3); g.quadraticCurveTo(-0.35, 0.05, 0.1, 0.3); g.lineTo(0.28, 0.2); g.lineTo(0.12, 0.02); g.lineTo(0.02, 0.1); g.quadraticCurveTo(-0.12, 0, -0.1, -0.12); g.lineTo(-0.02, -0.2); g.lineTo(-0.18, -0.38); g.closePath(); g.fill(); break;
      case 'search': g.arc(-0.06, -0.06, 0.24, 0, PI * 2); g.moveTo(0.12, 0.12); g.lineTo(0.36, 0.36); g.stroke(); break;
      default: g.arc(0, 0, 0.3, 0, PI * 2); g.stroke();
    }
    g.restore();
  };
  Gk.ICONS = ['note', 'mic', 'heart', 'star', 'bolt', 'play', 'wave', 'moon'];

  // ---------------------------------------------------------------- a word built from blocks (the voxel mode's 5×7 font)
  Gk.pixelWord = function (g, s, x, y, h, col, edge, depth) {
    if (!O.Vox || !O.Vox.text) { Gk.txt(g, s, x, y, h, col, { align: 'center', w: 700 }); return; }
    const T = O.Vox.text(s), c = h / 7, w = T.w * c;
    const x0 = x - w / 2, y0 = y + h / 2;
    const cell = (dx, dy, fill) => { g.fillStyle = fill; for (const [cx, cy] of T.cells) g.fillRect(x0 + cx * c + dx, y0 - (cy + 1) * c + dy, c * 1.02, c * 1.02); };
    if (depth) for (let k = 4; k >= 1; k--) cell(depth * k / 4, depth * k / 4, rgba(edge));
    cell(-c * 0.18, 0, rgba(edge)); cell(c * 0.18, 0, rgba(edge)); cell(0, -c * 0.18, rgba(edge)); cell(0, c * 0.18, rgba(edge));
    cell(0, 0, rgba(col));
  };
  // ---------------------------------------------------------------- an eyeball looking toward (lx, ly)
  Gk.eye = function (g, x, y, r, lx, ly) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.filter = 'blur(6px)'; g.beginPath(); g.ellipse(x + r * 0.15, y + r * 1.05, r * 0.9, r * 0.22, 0, 0, PI * 2); g.fill(); g.filter = 'none';
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgb(250,240,236)'); gr.addColorStop(0.7, 'rgb(226,200,192)'); gr.addColorStop(1, 'rgb(170,130,124)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill();
    const d = Math.hypot(lx - x, ly - y) || 1, k = Math.min(1, d / r) * 0.45;
    const ix = x + (lx - x) / d * r * k, iy = y + (ly - y) / d * r * k, ir = r * 0.38;
    const ig = g.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir);
    ig.addColorStop(0, 'rgb(40,90,120)'); ig.addColorStop(0.6, 'rgb(90,150,180)'); ig.addColorStop(1, 'rgb(30,60,80)');
    g.fillStyle = ig; g.beginPath(); g.ellipse(ix, iy, ir * (1 - k * 0.3), ir, Math.atan2(iy - y, ix - x), 0, PI * 2); g.fill();
    g.fillStyle = 'rgb(10,12,16)'; g.beginPath(); g.arc(ix, iy, ir * 0.42, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(ix - ir * 0.3, iy - ir * 0.35, ir * 0.16, 0, PI * 2); g.fill();
    g.restore();
  };
  // ---------------------------------------------------------------- embers rising
  Gk.embers = function (g, asp, t, n, k) {
    for (let i = 0; i < n; i++) {
      const h1 = Math.sin(i * 12.9898) * 43758.5453 % 1, h2 = Math.sin(i * 78.233) * 12543.123 % 1, h = Math.abs(h1), v = Math.abs(h2);
      const y = 0.6 - ((t * (0.08 + v * 0.18) + h * 2) % 1.3);
      const x = (h - 0.5) * asp * 1.1 + Math.sin(t * (1 + v) + i) * 0.03;
      const a = Math.min(1, (0.6 - y) * 2) * (0.5 + 0.5 * Math.sin(t * 9 + i * 3)) * (k == null ? 1 : k);
      g.fillStyle = 'rgba(255,' + (120 + v * 90 | 0) + ',40,' + Math.max(0, a) + ')';
      const s = 0.002 + v * 0.004;
      g.fillRect(x, y, s, s * (1.5 + v * 2));
    }
  };
  // ---------------------------------------------------------------- a vinyl record with the cover as its label
  Gk.vinyl = function (g, x, y, r, rot, img) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgb(14,14,16)'; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = r * 0.006;
    for (let k = 0.42; k < 0.98; k += 0.035) { g.beginPath(); g.arc(0, 0, r * k, 0, PI * 2); g.stroke(); }
    const sh = g.createLinearGradient(-r, -r, r, r);
    sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(0, 0, r, 0, PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, r * 0.38, 0, PI * 2); g.clip();
    if (img) g.drawImage(img, -r * 0.38, -r * 0.38, r * 0.76, r * 0.76); else { g.fillStyle = 'rgb(220,60,90)'; g.fillRect(-r, -r, r * 2, r * 2); }
    g.restore();
    g.fillStyle = 'rgb(14,14,16)'; g.beginPath(); g.arc(0, 0, r * 0.03, 0, PI * 2); g.fill();
    g.restore();
  };
  // the cover (or a gradient) drawn in a rounded square
  Gk.art = function (g, img, x, y, s, r, fallback) {
    g.save(); Wk.rr(g, x - s / 2, y - s / 2, s, s, r); g.clip();
    if (img) g.drawImage(img, x - s / 2, y - s / 2, s, s);
    else { const gr = g.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); gr.addColorStop(0, rgba(fallback || [240, 90, 150])); gr.addColorStop(1, 'rgb(60,30,120)'); g.fillStyle = gr; g.fillRect(x - s / 2, y - s / 2, s, s); }
    g.restore();
  };
  // ---------------------------------------------------------------- a tile of words and a few lines of a sheet of paper
  Gk.paper = function (g, x, y, w, h, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
    g.fillStyle = 'rgb(246,242,232)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(120,150,200,0.45)'; g.lineWidth = 0.0025;
    for (let ly = -h / 2 + h * 0.12; ly < h / 2; ly += h * 0.055) { g.beginPath(); g.moveTo(-w / 2, ly); g.lineTo(w / 2, ly); g.stroke(); }
    g.strokeStyle = 'rgba(220,90,90,0.55)'; g.beginPath(); g.moveTo(-w / 2 + w * 0.14, -h / 2); g.lineTo(-w / 2 + w * 0.14, h / 2); g.stroke();
    g.fillStyle = 'rgb(30,30,34)';
    for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(-w / 2 + w * 0.05, -h / 2 + h * (0.06 + k * 0.068), w * 0.014, 0, PI * 2); g.fill(); }
    g.restore();
  };
})();
