/* Oley surfaces: canvas pages that live on 3D objects (a phone screen, a laptop, a TV, paper, neon).
   Text that appears word by word as it's sung, wrapped paragraphs, rounded cards, the shared icon set,
   cover images, and a texture that re-uploads to the GPU only when the page changed. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const S = (O.Surf = {});

  // ---------------------------------------------------------------- a page bound to a GPU texture
  S.Page = class {
    constructor(G, w, h, o) {
      o = o || {};
      this.G = G;
      this.c = document.createElement('canvas');
      this.c.width = w; this.c.height = h;
      this.w = w; this.h = h;
      this.x = this.c.getContext('2d');
      this.tex = G.texture(this.c, { srgb: true, mips: true, aniso: 16, wrap: o.wrap || 'clamp' });
      this.sig = '';
    }
    // draw(x, w, h) runs only when key changed; returns true if uploaded
    paint(key, draw) {
      if (key === this.sig) return false;
      this.sig = key;
      const x = this.x;
      x.save();
      draw(x, this.w, this.h);
      x.restore();
      this.G.upload(this.tex, this.c);
      return true;
    }
    force() { this.sig = '#'; }
  };

  // ---------------------------------------------------------------- text
  S.font = (wt, px, fam) => `${wt || 400} ${Math.round(px * 10) / 10}px ${fam || "'Oley Sans', 'Segoe UI', sans-serif"}`;
  S.FAM = {
    sans: "'Oley Sans', 'Segoe UI', sans-serif", display: "'Oley Display', 'Oley Sans', sans-serif", serif: "'Oley Serif', Georgia, serif",
    heavy: "'Oley Heavy', 'Oley Sans', sans-serif", black: "'Oley Black', 'Oley Sans', sans-serif", round: "'Oley Round', 'Oley Sans', sans-serif",
    mono: "'Oley Mono', Consolas, monospace", type: "'Courier New', 'Oley Mono', monospace", hand: "'Ink Free', 'Segoe Print', 'Oley Serif', cursive",
  };
  // lay words out in lines no wider than maxW. items: strings or {s, ...}
  S.wrap = function (x, items, maxW, font, space) {
    x.font = font;
    const sp = space == null ? x.measureText(' ').width : space;
    const lines = [];
    let cur = { items: [], w: 0 };
    for (const it of items) {
      const s = typeof it === 'string' ? it : it.s;
      const w = x.measureText(s).width;
      const nw = cur.items.length ? cur.w + sp + w : w;
      if (cur.items.length && nw > maxW) { lines.push(cur); cur = { items: [], w: 0 }; }
      cur.items.push({ it, s, x: cur.items.length ? cur.w + sp : 0, w });
      cur.w = cur.items.length === 1 ? w : cur.w + sp + w;
    }
    if (cur.items.length) lines.push(cur);
    return lines;
  };
  // a paragraph of sung words: each word fades/rises in at its time. o: {font, lh, color, align, t, dur, rise, maxW, hi(word)->color}
  S.para = function (x, ws, X, Y, o) {
    const items = ws.map((w) => ({ s: w.bare || w.raw || String(w), w }));
    const lines = S.wrap(x, items, o.maxW || 1e9, o.font);
    const lh = o.lh || 40;
    x.font = o.font;
    x.textBaseline = 'alphabetic';
    let last = null;
    lines.forEach((ln, li) => {
      const ox = o.align === 'center' ? X - ln.w / 2 : o.align === 'right' ? X - ln.w : X;
      for (const p of ln.items) {
        const w = p.it.w;
        let k = 1;
        if (o.t != null && w && w.t != null) k = U.prog(w.t - 0.03, w.t - 0.03 + (o.dur || 0.18), o.t);
        if (k <= 0) continue;
        x.globalAlpha = (o.alpha == null ? 1 : o.alpha) * U.sat(k * 1.6);
        x.fillStyle = (o.hi && o.hi(w, k)) || o.color || '#fff';
        x.fillText(p.s, ox + p.x, Y + li * lh + (1 - U.e('outCubic', k)) * (o.rise || 0));
        last = { x: ox + p.x + p.w, y: Y + li * lh, w: p.w, word: w };
      }
    });
    x.globalAlpha = 1;
    return { lines, h: lines.length * lh, last, n: lines.length };
  };
  // typed text (with a fixed-up typo) for a line at time t, using the Editlyric typing model
  S.typed = (ws, t, typos) => (O.Ed && O.Ed.K ? O.Ed.K.typeLine(ws, t, typos) : { s: ws.filter((w) => t >= w.t).map((w) => w.bare).join(' '), bad: false, cur: -1 });

  // ---------------------------------------------------------------- shapes
  S.rr = function (x, X, Y, W, H, r) {
    x.beginPath();
    if (x.roundRect) x.roundRect(X, Y, W, H, r);
    else { r = Math.min(r, W / 2, H / 2); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  };
  S.fillRR = function (x, X, Y, W, H, r, fill) { S.rr(x, X, Y, W, H, r); x.fillStyle = fill; x.fill(); };
  S.shadow = (x, blur, oy, col) => { x.shadowBlur = blur; x.shadowOffsetX = 0; x.shadowOffsetY = oy || 0; x.shadowColor = col || 'rgba(0,0,0,0.35)'; };
  S.noShadow = (x) => { x.shadowBlur = 0; x.shadowOffsetY = 0; x.shadowColor = 'transparent'; };
  // an image cropped to cover the box (optionally rounded)
  S.img = function (x, img, X, Y, W, H, r, o) {
    if (!img || !(img.naturalWidth || img.width)) { if (r != null) S.fillRR(x, X, Y, W, H, r || 0, '#333'); else { x.fillStyle = '#333'; x.fillRect(X, Y, W, H); } return; }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(W / iw, H / ih) * ((o && o.zoom) || 1);
    const dw = iw * s, dh = ih * s;
    const ox = ((o && o.ox) || 0) * (dw - W), oy = ((o && o.oy) || 0) * (dh - H);
    x.save();
    if (r) { S.rr(x, X, Y, W, H, r); x.clip(); } else { x.beginPath(); x.rect(X, Y, W, H); x.clip(); }
    if (o && o.filter) x.filter = o.filter;
    x.drawImage(img, X + (W - dw) / 2 - ox, Y + (H - dh) / 2 - oy, dw, dh);
    x.restore();
  };
  // a texture image (from the Editlyric kit) as a CSS-less pattern fill
  const pats = {};
  S.pattern = function (x, kind, cb) {
    const p = pats[kind];
    if (p && p.img.complete && p.img.naturalWidth) return x.createPattern(p.img, 'repeat');
    if (!p) { const img = new Image(); img.onload = () => { if (cb) cb(); }; img.src = O.Ed.K.tex(kind); pats[kind] = { img }; }
    return null;
  };

  // ---------------------------------------------------------------- icons (the Editlyric kit's set, as canvas paths)
  const icache = {};
  S.icon = function (x, name, X, Y, size, color, a, b) {
    const key = name + (a == null ? '' : ':' + a) + (b == null ? '' : ':' + b);
    let ops = icache[key];
    if (!ops) {
      const html = O.Ed.K.icon(name, a, b);
      ops = [];
      const re = /<(path|rect)\s+([^>]*?)\/?>/g;
      let m;
      while ((m = re.exec(html))) {
        const at = {};
        m[2].replace(/([a-z-]+)="([^"]*)"/g, (_, k, v) => { at[k] = v; });
        if (m[1] === 'rect') {
          const p = new Path2D();
          const rx = +at.rx || 0;
          if (p.roundRect) p.roundRect(+at.x, +at.y, +at.width, +at.height, rx); else p.rect(+at.x, +at.y, +at.width, +at.height);
          ops.push({ p, fill: at.fill && at.fill !== 'none' ? at.fill : null, stroke: at.stroke ? at.stroke : null, sw: +at['stroke-width'] || 1, op: at['stroke-opacity'] || at['fill-opacity'] });
        } else ops.push({ p: new Path2D(at.d), fill: at.fill === 'none' ? null : at.fill || 'currentColor', stroke: at.stroke || null, sw: +at['stroke-width'] || 2 });
      }
      icache[key] = ops;
    }
    x.save();
    x.translate(X, Y);
    x.scale(size / 24, size / 24);
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const o of ops) {
      x.globalAlpha = o.op ? +o.op : 1;
      if (o.fill) { x.fillStyle = o.fill === 'currentColor' ? color : o.fill; x.fill(o.p); }
      if (o.stroke) { x.strokeStyle = o.stroke === 'currentColor' ? color : o.stroke; x.lineWidth = o.sw; x.stroke(o.p); }
    }
    x.restore();
  };
  S.caret = function (x, X, Y, h, col, on) { if (!on) return; x.fillStyle = col; S.fillRR(x, X, Y - h * 0.82, Math.max(2, h * 0.075), h, h * 0.04, col); };
})();
