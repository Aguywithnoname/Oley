/* Oley · Pasteup layouts, part three: the cut-out as code. A terminal printing the subject in
   characters while the line is typed at the prompt; the subject exploded into five prints spaced out in
   depth; sliced into strips that fly in and lock; a pop-art grid in different inks; a scanner HUD
   tagging the words on it; a mosaic that resolves; and green code raining down into a figure. */
(function () {
  'use strict';
  const O = window.Oley, PU = O.PU, F = PU.FONT, C = PU.C;
  const T = PU.TPL, H = PU.H;
  const { L, arrive, deco, plate, up, clean, hits } = H;
  const deep = [12, 11, 13];
  const txt = (P) => P.ws.map((w) => clean(w.raw)).join(' ');
  const span = (P) => { const a = P.ws[0], b = P.ws[P.ws.length - 1]; return Math.max(0.2, Math.min(1.8, b.t + 0.35 - a.t)); };
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const cut = (P) => P.art && P.art.ok;
  // a lit ink for a dark ground, from the scheme where it can
  const glowInk = (S) => (lum(S.a) > 0.35 ? S.a : [120, 255, 150]);

  // ---------------------------------------------------------------- a terminal printing the subject in characters
  T.terminal = {
    w: 1, fits: (P) => P.text.length <= 44 && cut(P),
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const W = 1500, Hh = 980, bar = 64;
      const win = PU.cv(W, Hh), x = win.getContext('2d');
      x.fillStyle = 'rgba(16,17,20,0.97)'; x.beginPath(); x.roundRect(0, 0, W, Hh, 26); x.fill();
      x.fillStyle = '#26272c'; x.beginPath(); x.roundRect(0, 0, W, bar, [26, 26, 0, 0]); x.fill();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(40 + i * 34, bar / 2, 11, 0, Math.PI * 2); x.fill(); });
      x.fillStyle = 'rgba(255,255,255,0.45)'; x.font = `500 26px ${F.mono}`; x.textAlign = 'center';
      x.fillText('oley — ascii --cover — 80×48', W / 2, bar / 2 + 9);
      const wh = R.r(0.74, 0.84), ww = wh * (W / Hh), side = R.sgn(), wx = side * R.r(0.02, 0.08) * A, rot = R.r(-0.05, 0.05);
      ly.push(L(win, P, { w: ww, h: wh, x: wx, y: 0.02, z: -0.04, rot, gloss: 0.2, sg: 0.06, sa: 0.5, in: arrive(P.t0, { dy: 0.9, dr: side * 0.2, d: 0.3, e: 'out5' }) }));
      // the subject, printed line by line
      const ink = glowInk(S);
      const art = P.art.code(R.pick(['ascii', 'ascii', 'binary']), [ink, [250, 250, 245]], { dark: true, cell: 12 });
      const ah = wh * 0.78, aw = (ah * art.width) / art.height;
      const ax = wx - ww * 0.5 + ww * 0.06 + Math.min(aw, ww * 0.5) / 2;
      ly.push(L(art, P, { h: Math.min(ah, (ww * 0.5 * art.height) / art.width), x: ax, y: 0.02 + 0.04, z: -0.035, rot, shadow: false, bias: 0.2, rev: { t: P.t0 + 0.12, d: Math.max(0.6, span(P)), m: 5, e: 'step24', soft: 0.01 } }));
      // the prompt, typed as it's sung
      const s = txt(P);
      const px = 0.034 * P.HPX;
      const rows = [];
      let cur = '$ echo "';
      for (const w of s.split(' ')) { if ((cur + w).length > 22 && cur.length > 8) { rows.push(cur); cur = '  '; } cur += w + ' '; }
      rows.push(cur.trimEnd() + '"');
      const tx = wx + ww * 0.08, ty0 = 0.02 - wh * 0.28;
      let tAt = P.ws[0].t - 0.05;
      const per = span(P) / Math.max(1, s.length);
      rows.forEach((r, i) => {
        const c = PU.txt(r, { f: F.mono, wt: 500, px, fill: C([232, 232, 236]) });
        const d = Math.max(0.12, r.length * per);
        ly.push(L(c, P, { x: tx, ax: 0, y: ty0 + i * 0.05, z: -0.035, rot, shadow: false, bias: 0.25, rev: { t: tAt, d, m: 1, e: 'step' + Math.max(3, r.length), soft: 0.002 } }));
        tAt += d;
      });
      const out = PU.txt('→ rendered ' + (2000 + Math.floor(R() * 4000)).toLocaleString('en') + ' glyphs in 0.0' + (1 + Math.floor(R() * 8)) + 's', { f: F.mono, wt: 500, px: px * 0.8, fill: C(ink) });
      ly.push(L(out, P, { x: tx, ax: 0, y: ty0 + rows.length * 0.05 + 0.03, z: -0.035, rot, shadow: false, bias: 0.25, in: arrive(tAt + 0.1, { fade: 1, d: 0.15 }) }));
      ly.push(L(PU.solid([232, 232, 236]), P, { w: px / P.HPX * 0.62, h: px / P.HPX * 1.05, x: tx + 0.005, ax: 0, y: ty0 + rows.length * 0.05 + 0.08, z: -0.034, rot, shadow: false, bias: 0.25, in: arrive(tAt + 0.25, { fade: 1, d: 0.05 }) }));
      // the key word, big and solid, over the window's corner
      const kw = up(clean(P.ws[P.key].raw));
      const big = PU.fit(kw, { f: F.cond, fill: C(S.dark ? S.ink : S.a), rough: 0.2 }, A * 0.34 * P.HPX, 0.28 * P.HPX);
      ly.push(L(big, P, { x: -side * A * 0.27, y: 0.3, z: 0.1, ext: { d: 0.05 }, in: arrive(P.ws[P.key].t, { ds: 0.6, dz: 0.4, fade: 1, d: 0.2, e: 'out5' }), hit: [P.ws[P.key].t] }));
      deco(P, ly, 1);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- the subject exploded into prints spaced out in depth
  T.exploded = {
    w: 1.1, fits: (P) => P.ws.length <= 6 && P.text.length <= 30 && cut(P) && P.art.cut,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const ink = S.dark ? S.paper : deep;
      const prints = [
        P.art.get('dots', [S.a]),
        P.art.code('lines', [ink]),
        P.art.get('duo', [deep, S.a]),
        P.art.code(S.dark ? 'ascii' : 'binary', [S.dark ? S.a : ink, ink], { dark: S.dark, cell: 12 }),
        P.art.get('tone', [deep, S.paper]),
      ];
      const n = prints.length, side = R.sgn();
      const t0 = P.t0, t1 = P.ws[P.ws.length - 1].t;
      prints.forEach((c, i) => {
        const k = i / (n - 1), z = 0.36 - k * 0.95;
        const tA = t0 + (t1 - t0) * k * 0.8;
        ly.push(L(c, P, { h: 0.9, x: side * (k - 0.5) * A * 0.16, y: 0.48, ay: 1, z, a: i === n - 1 ? 1 : 0.92, sg: 0.05, sa: 0.35, paper: 0.25,
          in: arrive(tA, { dz: -1.2, ds: 0.2, fade: 1, d: 0.35, e: 'out5' }), v: { r: (i % 2 ? 1 : -1) * 0.01 } }));
      });
      // the words threaded between the layers
      P.ws.forEach((w, i) => {
        const s = up(clean(w.raw));
        const c = PU.fit(s, { f: i === P.key ? F.cond : F.black, wt: 900, fill: C(i === P.key ? S.a : S.dark ? S.ink : deep), rough: 0.2 }, A * 0.42 * P.HPX, (i === P.key ? 0.24 : 0.12) * P.HPX);
        const k = (i + 0.5) / P.ws.length, z = 0.4 - k * 0.9;
        ly.push(L(c, P, { x: -side * A * (0.2 - k * 0.12), y: -0.32 + k * 0.62, z, ext: i === P.key ? { d: 0.05 } : null, in: arrive(w.t, { dz: 0.6, fade: 1, d: 0.2, e: 'out5' }), hit: [w.t] }));
      });
      ly.push(L(PU.micro(['LAYERS 05', 'SPACING 0.24', 'Z ' + (0.36).toFixed(2) + ' → ' + (-0.59).toFixed(2)], { px: 20, fill: C(S.dark ? S.ink : deep, 0.75) }), P, { x: A / 2 - 0.2, y: -0.4, z: 0.2, shadow: false, in: arrive(t0 + 0.2, { fade: 1, d: 0.2 }) }));
      return { layers: ly, cam: { tilt: true } };
    },
  };

  // ---------------------------------------------------------------- sliced into strips that fly in and lock together
  T.slices = {
    w: 1, fits: (P) => P.text.length <= 34 && cut(P),
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const kind = R.pick(['duo', 'tri', 'tone']);
      const src = P.art.cut ? P.art.get(kind, kind === 'tri' ? [deep, S.a, S.paper] : kind === 'tone' ? [deep, S.paper] : [deep, S.a]) : P.art.card(kind, kind === 'tri' ? [deep, S.a, S.paper] : [deep, S.a], 760, 900, {});
      const n = R.i(6, 9), hh = 0.98, ww = (hh * src.width) / src.height;
      const cx = R.sgn() * A * R.r(0.12, 0.22), top = 0.5 - hh;
      const t0 = P.t0, tl = P.ws[P.key].t;
      for (let i = 0; i < n; i++) {
        const sh = Math.ceil(src.height / n), c = PU.cv(src.width, sh);
        c.getContext('2d').drawImage(src, 0, i * sh, src.width, sh, 0, 0, src.width, sh);
        const h = hh / n, y = top + (i + 0.5) * h, dir = i % 2 ? 1 : -1;
        const t = t0 + (tl - t0) * (i / n);
        ly.push(L(c, P, { w: ww, h: h * 1.002, x: cx, y, z: 0.02 + (i % 3) * 0.004, shadow: i % 2 === 0, sg: 0.03, sa: 0.3,
          in: { t: t - 0.05, d: 0.36, dx: dir * A * 1.2, dr: dir * 0.04, e: 'out5' } }));
        if (i % 2 === 0 && R.ch(0.6)) ly.push(L(PU.micro(['SL.' + String(i + 1).padStart(2, '0')], { px: 18, fill: C(S.dark ? S.ink : deep, 0.7) }), P, { x: cx + dir * (ww / 2 + 0.06), y, z: 0.03, shadow: false, in: arrive(t + 0.2, { fade: 1, d: 0.1 }) }));
      }
      // the line on a solid band
      const s = up(txt(P));
      const t = PU.fit(s, { f: F.cond, fill: C(S.on(S.a)) }, A * 0.8 * P.HPX, 0.15 * P.HPX);
      const bw = t.width / P.HPX + 0.08, bh = t.height / P.HPX + 0.03, by = R.r(0.18, 0.3);
      ly.push(L(PU.rect(Math.round(bw * P.HPX), Math.round(bh * P.HPX), S.a, { rough: 0.1 }), P, { w: bw, h: bh, x: -cx * 0.3, y: by, z: 0.08, rot: R.r(-0.04, 0.04), rev: { t: P.ws[0].t - 0.12, d: 0.22, m: 1, e: 'out5' } }));
      ly.push(L(t, P, { x: -cx * 0.3, y: by, z: 0.085, rot: ly[ly.length - 1].rot, shadow: false, bias: 0.3, rev: { t: P.ws[0].t - 0.03, d: span(P), m: 1, e: 'out3', soft: 0.03 }, hit: [tl] }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a pop-art grid of the subject in different inks
  T.popgrid = {
    w: 1, fits: (P) => P.text.length <= 28 && cut(P),
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const pairs = [[S.a, deep], [[250, 214, 64], [214, 36, 90]], [[64, 200, 230], deep], [[244, 240, 232], S.a], [[232, 72, 50], [40, 30, 110]], [S.b, [252, 250, 245]]];
      for (let i = pairs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
      const cols = 3, rows = 2, gw = A * 0.9, cw = gw / cols, chh = 0.86 / rows;
      const cs = Math.min(cw, chh) * 0.96;
      let k = 0;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const [bg, ink] = pairs[k % pairs.length];
        const c = PU.cv(600, 600), x = c.getContext('2d');
        x.fillStyle = C(bg); x.fillRect(0, 0, 600, 600);
        const im = P.art.cut ? P.art.get('duo', [ink, bg.map((v) => Math.min(255, v + 40))]) : P.art.card('duo', [ink, bg], 600, 600, {});
        const s = Math.min(560 / im.width, 560 / im.height);
        x.drawImage(im, 300 - (im.width * s) / 2, 600 - im.height * s, im.width * s, im.height * s);
        const w = P.ws[Math.min(P.ws.length - 1, Math.floor((k / (cols * rows)) * P.ws.length))];
        ly.push(L(PU.rough(c, 0.06), P, { w: cs, h: cs, x: -gw / 2 + cw * (q + 0.5), y: -0.43 + chh * (r + 0.5), z: 0.0, sg: 0.02, sa: 0.3,
          in: arrive(Math.max(P.t0, w.t - 0.1 + k * 0.03), { ds: -0.85, dr: R.r(-0.3, 0.3), fade: 1, d: 0.24, e: 'back' }) }));
        k++;
      }
      // the line across the middle on a strip
      const s = up(txt(P));
      const t = PU.fit(s, { f: F.cond, fill: C([252, 250, 245]) }, A * 0.8 * P.HPX, 0.16 * P.HPX);
      const bw = t.width / P.HPX + 0.07, bh = t.height / P.HPX + 0.03;
      ly.push(L(PU.rect(Math.round(bw * P.HPX), Math.round(bh * P.HPX), deep), P, { w: bw, h: bh, y: 0.0, z: 0.08, rot: R.r(-0.03, 0.03), rev: { t: P.ws[0].t - 0.1, d: 0.2, m: 1, e: 'out5' } }));
      ly.push(L(t, P, { y: 0.0, z: 0.085, rot: ly[ly.length - 1].rot, shadow: false, bias: 0.3, rev: { t: P.ws[0].t - 0.03, d: span(P), m: 1, e: 'out3', soft: 0.03 }, hit: hits(P) }));
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a scanner: the subject engraved, bracketed and tagged
  T.scanner = {
    w: 1, fits: (P) => P.ws.length <= 7 && cut(P) && P.art.cut,
    make(P) {
      const { S, R, A } = P;
      const ink = S.dark ? S.paper : deep, hot = S.a;
      const ly = [plate(P)];
      const side = R.sgn();
      const sub = P.art.code('lines', [ink], { cell: 6 });
      const hh = 0.92, ww = (hh * sub.width) / sub.height, sx = side * A * 0.2, sy = 0.5 - hh / 2 - 0.02;
      const d = Math.max(0.7, span(P));
      ly.push(L(sub, P, { h: hh, x: sx, y: sy, z: 0, sg: 0.03, sa: 0.3, rev: { t: P.t0 + 0.05, d, m: 5, e: 'lin', soft: 0.04 } }));
      // the scan line runs down with the reveal
      const bar = PU.rect(800, 10, hot);
      ly.push(L(bar, P, { w: ww * 1.25, h: 0.008, x: sx, y: sy - hh / 2, z: 0.03, shadow: false, in: arrive(P.t0 + 0.05, { fade: 1, d: 0.05 }), path: { t: P.t0 + 0.05, d, dx: 0, dy: hh }, out: { t: P.t0 + 0.05 + d, d: 0.2 } }));
      // corner brackets close in
      const br = (w, h) => { const c = PU.cv(w, h), x = c.getContext('2d'); x.strokeStyle = C(hot); x.lineWidth = 10; x.beginPath(); x.moveTo(5, h); x.lineTo(5, 5); x.lineTo(w, 5); x.stroke(); return c; };
      const bw = ww * 0.55, bh = hh * 0.55;
      [[-1, -1, 0], [1, -1, Math.PI / 2], [1, 1, Math.PI], [-1, 1, -Math.PI / 2]].forEach(([dx, dy, r], i) => {
        ly.push(L(br(120, 120), P, { w: 0.09, h: 0.09, x: sx + dx * bw, y: sy + dy * bh, z: 0.04, rot: r, shadow: false, in: arrive(P.t0 + 0.1 + i * 0.04, { dx: dx * 0.15, dy: dy * 0.15, fade: 1, d: 0.25, e: 'out5' }) }));
      });
      // each word gets a tag pinned to the subject
      P.ws.forEach((w, i) => {
        const s = up(clean(w.raw));
        const isK = i === P.key;
        const c = PU.txt(s, { f: isK ? F.cond : F.mono, wt: isK ? 400 : 700, px: (isK ? 0.11 : 0.045) * P.HPX, fill: C(isK ? hot : ink) });
        const tw = c.width / P.HPX, th = c.height / P.HPX;
        const ty = -0.36 + (i / Math.max(1, P.ws.length - 1)) * 0.68;
        const tx = sx - side * (ww / 2 + 0.12 + tw / 2) + (i % 2 ? -side * 0.05 : 0);
        const box = PU.cv(Math.round((tw + 0.03) * P.HPX), Math.round((th + 0.016) * P.HPX)), bx = box.getContext('2d');
        bx.strokeStyle = C(isK ? hot : ink, 0.9); bx.lineWidth = 3; bx.strokeRect(1.5, 1.5, box.width - 3, box.height - 3);
        ly.push(L(box, P, { x: tx, y: ty, z: 0.05, shadow: false, in: arrive(w.t - 0.02, { ds: 0.4, fade: 1, d: 0.12 }) }));
        ly.push(L(c, P, { x: tx, y: ty, z: 0.052, shadow: false, bias: 0.2, rev: { t: w.t - 0.02, d: 0.14, m: 1, e: 'step' + Math.max(2, s.length), soft: 0.002 }, hit: [w.t] }));
        // the leader line to a point on the subject
        const px0 = tx + side * (tw / 2 + 0.015), px1 = sx + R.r(-0.25, 0.25) * ww, py1 = sy + R.r(-0.3, 0.3) * hh;
        const len = Math.hypot(px1 - px0, py1 - ty), ang = Math.atan2(py1 - ty, px1 - px0);
        const ln = PU.solid(isK ? hot : ink);
        ly.push(L(ln, P, { w: len, h: 0.003, x: (px0 + px1) / 2, y: (ty + py1) / 2, z: 0.045, rot: ang, shadow: false, rev: { t: w.t, d: 0.15, m: side > 0 ? 1 : 2, e: 'out3' } }));
        ly.push(L(PU.solid(hot), P, { w: 0.012, h: 0.012, x: px1, y: py1, z: 0.046, rot: Math.PI / 4, shadow: false, in: arrive(w.t + 0.12, { ds: 1.2, fade: 1, d: 0.12 }) }));
      });
      ly.push(L(PU.micro(['● REC  00:0' + Math.floor(R() * 9) + ':' + String(Math.floor(R() * 59)).padStart(2, '0') + ':12', 'SUBJECT 01 · MATCH ' + (90 + R() * 9.9).toFixed(1) + '%'], { px: 22, fill: C(ink, 0.8) }), P, { x: -A / 2 + 0.06, ax: 0, y: -0.42, z: 0.06, shadow: false, in: arrive(P.t0, { fade: 1, d: 0.2 }) }));
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a mosaic that resolves as the line is sung
  T.mosaic = {
    w: 0.9, fits: (P) => P.text.length <= 24 && cut(P),
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const cols = [deep, S.a];
      const steps = [64, 36, 18, 9];
      const hh = 0.9, side = R.sgn(), x = side * A * 0.2;
      const t0 = P.t0, tEnd = P.ws[P.ws.length - 1].t + 0.1;
      const hw = (c) => (hh * c.width) / c.height;
      steps.forEach((px, i) => {
        const c = P.art.code('pixel', cols, { cell: px, gapPx: px > 20 ? 2 : 0 });
        const ta = t0 + ((tEnd - t0) * i) / steps.length, tb = t0 + ((tEnd - t0) * (i + 1)) / steps.length;
        ly.push(L(c, P, { w: hw(c), h: hh, x, y: 0.02, z: 0.0 + i * 0.002, shadow: i === 0, sg: 0.04, in: arrive(ta, { fade: 1, d: 0.05, ds: i ? 0 : 0.2 }), out: { t: tb, d: 0.06 } }));
      });
      const fin = P.art.cut ? P.art.get('duo', cols) : P.art.card('duo', cols, 760, 900, {});
      ly.push(L(fin, P, { w: hw(fin), h: hh, x, y: 0.02, z: 0.01, sg: 0.04, in: arrive(tEnd, { fade: 1, d: 0.08 }), hit: [tEnd] }));
      // stacked down the other side
      P.ws.forEach((w, i) => {
        const s = up(clean(w.raw));
        const c = PU.fit(s, { f: F.stencil, fill: C(i === P.key ? S.a : S.dark ? S.ink : deep), rough: 0.25 }, A * 0.38 * P.HPX, (0.8 / Math.max(3, P.ws.length)) * P.HPX);
        ly.push(L(c, P, { x: -side * A * 0.22, y: -0.36 + (i + 0.5) * (0.74 / P.ws.length), z: 0.05, in: arrive(w.t, { dx: -side * 0.1, fade: 1, d: 0.12, e: 'out5' }), hit: [w.t] }));
      });
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- green code raining down into a figure
  T.matrix = {
    w: 0.9, fits: (P) => P.text.length <= 36 && cut(P),
    make(P) {
      const { S, R, A } = P;
      const green = [92, 255, 140], hot = lum(S.a) > 0.3 ? S.a : green;
      const ly = [plate(P, [6, 12, 8])];
      // columns of falling characters, at three depths
      const col = (h, n, a) => {
        const c = PU.cv(Math.round(n * 24), h), x = c.getContext('2d');
        x.font = `700 22px ${F.mono}`;
        for (let q = 0; q < n; q++) {
          const len = 6 + Math.floor(R() * 30), y0 = Math.floor(R() * h);
          for (let k = 0; k < len; k++) {
            const y = (y0 - k * 24 + h * 2) % h, f = 1 - k / len;
            x.fillStyle = k === 0 ? 'rgba(230,255,235,' + a + ')' : `rgba(${green[0]},${green[1]},${green[2]},${a * f * 0.9})`;
            x.fillText('01ZX7#$%&*+=<>{}'[Math.floor(R() * 16)], q * 24 + 2, y);
          }
        }
        return c;
      };
      const dur = Math.max(2, (P.t1 || P.t0 + 3) - P.t0 + 0.5);
      [[-0.4, 0.5, 40], [-0.2, 0.7, 34], [0.12, 0.9, 26]].forEach(([z, a, n]) => {
        const c = col(2400, n, a);
        ly.push(L(c, P, { w: A * 1.6, h: 3.2, y: -0.6, z, shadow: false, in: arrive(P.t0, { fade: 1, d: 0.3 }), path: { t: P.t0, d: dur * 1.6, dx: 0, dy: 1.6 + z } }));
      });
      // the figure, made of code, raining in from the top
      const fig = P.art.code('matrix', [green, [230, 255, 235]], { dark: true, cell: 13 });
      const hh = 0.95, side = R.sgn();
      ly.push(L(fig, P, { h: hh, x: side * A * 0.18, y: 0.03, z: 0.0, shadow: false, rev: { t: P.t0 + 0.05, d: Math.max(0.8, span(P)), m: 5, e: 'out3', soft: 0.3 } }));
      // the line, typed in green, its key word in white
      P.ws.forEach((w, i) => {
        const s = clean(w.raw);
        const isK = i === P.key;
        const c = PU.txt(isK ? s.toUpperCase() : s, { f: isK ? F.cond : F.mono, wt: isK ? 400 : 700, px: (isK ? 0.15 : 0.055) * P.HPX, fill: C(isK ? [236, 255, 240] : hot) });
        ly.push(L(c, P, { x: -side * A * 0.43, ax: 0, y: -0.3 + i * (0.66 / Math.max(1, P.ws.length)), z: 0.06, shadow: false, rev: { t: w.t - 0.02, d: 0.16, m: 1, e: 'step' + Math.max(2, s.length), soft: 0.002 }, hit: [w.t] }));
      });
      return { layers: ly };
    },
  };
})();
