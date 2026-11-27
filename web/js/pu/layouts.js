/* Oley · Pasteup layouts: one composition per word or short phrase. Each returns paper layers
   (a canvas, where it sits in the frame, how deep, how it arrives and drifts). Frame units: the
   frame is 1 tall and A wide, (0,0) in the middle, y down. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, PU = O.PU, F = PU.FONT, C = PU.C;
  const PI = Math.PI;
  const T = (PU.TPL = {});

  // ---------------------------------------------------------------- helpers
  const plate = (P, col) => L(PU.solid(col || P.S.bg), P, { w: P.A * 2.2, h: 2.2, z: -0.02, bg: true, col: col || P.S.bg });
  const L = (c, P, o) => Object.assign({ c, x: 0, y: 0, z: 0, s: 1, rot: 0, tx: 0, ty: 0, a: 1, ax: 0.5, ay: 0.5 }, o.h == null && o.w == null ? { h: c.height / P.HPX } : {}, o);
  // the words of a card set on one line at one size, each arriving when it's sung
  function line(P, strs, o, maxW, maxH, gapEm) {
    const ms = strs.map((s) => PU.txt(s, Object.assign({}, o, { px: 100, rough: 0, sh: null })));
    const gap = (gapEm == null ? 0.22 : gapEm) * 100;
    const tw = ms.reduce((a, c) => a + c.width, 0) + gap * (ms.length - 1), th = Math.max(...ms.map((c) => c.height));
    const px = Math.min((maxW * P.HPX) / tw, (maxH * P.HPX) / th) * 100;
    const k = px / 100;
    const cs = strs.map((s) => PU.txt(s, Object.assign({}, o, { px })));
    let X = (-tw * k) / 2 / P.HPX;
    return cs.map((c, i) => { const w = c.width / P.HPX, cx = X + w / 2; X += w + (gap * k) / P.HPX; return { c, x: cx, w, h: c.height / P.HPX }; });
  }
  const arrive = (t, o) => Object.assign({ t: t - 0.03, d: 0.16, e: 'expo' }, o);
  const cutCols = (P, kind) => {
    const S = P.S, R = P.R, deep = [12, 11, 13];
    if (kind === 'tri') return [deep, S.a, S.paper];
    if (kind === 'dots') return [S.dark ? S.a : S.ink];
    if (kind === 'tone') return [deep, S.paper];
    return R.ch(0.5) ? [deep, S.a] : [deep, S.paper];
  };
  // the cover's subject cut out (or, without a clean cut-out, a photo card)
  function subject(P, o) {
    const { R, art, S } = P;
    if (!art || !art.ok) return null;
    const kind = o.kind || R.pick(['duo', 'duo', 'tone', 'tri', 'dots']);
    const cols = cutCols(P, kind);
    if (art.cut) {
      const c = art.get(kind, cols, { border: o.border ? S.paper : null });
      return L(c, P, Object.assign({ h: o.h || 1.0, ay: 1, y: 0.52, z: 0.04 }, o));
    }
    const c = art.card(kind === 'dots' ? 'tone' : kind, kind === 'dots' ? [[12, 11, 13], S.paper] : cols, 700, 860, { torn: 1, frame: o.frameCol || null });
    return L(c, P, Object.assign({ h: (o.h || 1.0) * 0.72, ay: 0.5, y: 0.04, z: 0.04, rot: R.r(-0.06, 0.06) }, o));
  }
  // small print in the corners
  function deco(P, layers, n) {
    const { R, A, S } = P;
    const tr = (P.title || 'untitled').toUpperCase(), ar = (P.artist || '').toUpperCase();
    const pool = [
      () => PU.micro([tr.slice(0, 24), ar.slice(0, 24)], { px: 20, fill: C(S.ink, 0.85) }),
      () => PU.micro(['NO. ' + String(P.i + 1).padStart(3, '0'), 'SIDE ' + (P.i % 2 ? 'B' : 'A')], { px: 20, fill: C(S.ink, 0.85) }),
      () => PU.barcode(220, 60, S.ink),
      () => PU.micro([new Date().getFullYear() + ' ©  ' + ar.slice(0, 16)], { px: 18, fill: C(S.ink, 0.7) }),
      () => PU.txt(String(P.i + 1).padStart(2, '0'), { f: F.cond, px: 70, fill: C(S.a) }),
      () => PU.micro(['* * *  ' + tr.slice(0, 14) + '  * * *'], { px: 18, fill: C(S.a) }),
      () => PU.reg(90, S.ink),
      () => PU.swatch(260, 40, [S.a, S.b, S.ink, S.paper, [0, 160, 220], [230, 0, 126], [255, 220, 0]]),
      () => PU.micro(['● REC  ' + String(Math.floor(P.t0 / 60)).padStart(2, '0') + ':' + String(Math.floor(P.t0 % 60)).padStart(2, '0') + ':' + String(Math.floor((P.t0 % 1) * 24)).padStart(2, '0')], { px: 20, wt: 700, fill: C(S.a) }),
      () => PU.micro(['P. ' + String(P.i + 3).padStart(2, '0'), '— ' + (ar || tr).slice(0, 12)], { px: 18, fill: C(S.ink, 0.8) }),
      () => PU.micro(['→ PLAY LOUD'], { px: 20, wt: 700, fill: C(S.ink, 0.85) }),
      () => PU.micro(['[ ' + tr.slice(0, 16) + ' ]', 'TAKE ' + (1 + (P.i % 7)) + ' / ROLL 04'], { px: 18, fill: C(S.ink, 0.8) }),
    ];
    const spots = [[-A / 2 + 0.05, -0.44, 0, 0], [A / 2 - 0.05, -0.44, 1, 0], [-A / 2 + 0.05, 0.44, 0, 1], [A / 2 - 0.05, 0.44, 1, 1]];
    for (let i = 0; i < n; i++) {
      const sp = spots.splice(R.i(0, spots.length - 1), 1)[0];
      if (!sp) break;
      const mk = pool.splice(R.i(0, pool.length - 1), 1)[0];
      layers.push(L(mk(), P, { x: sp[0], y: sp[1], ax: sp[2], ay: sp[3], z: 0.22, shadow: false, in: arrive(P.t0, { d: 0.25, fade: 1, dy: 0.02 }) }));
    }
  }
  const hits = (P) => P.ws.map((w) => w.t);
  const up = (s) => s.toUpperCase();
  const clean = (s) => s.replace(/^[("'“]+|[)"'”,.!?;:]+$/g, '');
  PU.clean = clean;

  // ---------------------------------------------------------------- the layouts
  // one or two words, huge, cropped by the frame, with the subject in front or behind
  T.mega = {
    w: 1.3, fits: (P) => P.ws.length <= 2 && P.text.length <= 15,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const fam = R.pick([F.cond, F.cond, F.black, F.stencil]);
      const col = R.ch(0.7) ? S.ink : S.a;
      const barCol = col === S.a ? (S.dark ? S.paper : S.ink) : R.ch(0.6) ? S.a : S.b;
      if (R.ch(0.65)) ly.push(L(PU.solid(barCol), P, { w: A * 1.6, h: R.r(0.14, 0.24), rot: R.r(-0.14, 0.14), y: R.r(-0.08, 0.14), z: -0.07, rev: { t: P.t0, d: 0.22, m: R.ch(0.5) ? 1 : 2, e: 'out5' } }));
      const sub = subject(P, { x: R.sgn() * A * R.r(0.16, 0.3), h: R.r(0.95, 1.12), z: R.ch(0.5) ? 0.16 : -0.24, in: arrive(P.t0, { dy: 0.25, d: 0.32, e: 'out5' }), v: { s: 0.02 } });
      if (sub) ly.push(sub);
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: fam, fill: C(col), rough: 0.3, sh: R.ch(0.35) ? [10, 10] : null, shc: C(col === S.a ? S.ink : S.a), st: C(S.bg), sw: 4 }, A * R.r(0.9, 1.15), 0.66);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, y: R.r(-0.04, 0.06), w: p.w, h: p.h, z: 0.05, ext: { d: 0.07 }, in: arrive(P.ws[i].t, { ds: 0.45, dty: R.r(-0.9, 0.9), dtx: R.r(-0.5, 0.5), dz: 0.3, fade: 1, d: 0.2 }), hit: [P.ws[i].t] })));
      deco(P, ly, R.i(1, 2));
      return { layers: ly };
    },
  };

  // words stacked down the frame, every one in a different face
  T.stack = {
    w: 1.4, fits: (P) => P.ws.length >= 2 && P.ws.length <= 4,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const side = R.sgn();
      const faces = [[F.cond, 400, 1], [F.script, 400, 0], [F.gothic, 400, 0], [F.black, 400, 1], [F.serif, 600, 0], [F.grot, 900, 1]];
      const n = P.ws.length, rowH = Math.min(0.3, 0.84 / n);
      const sub = subject(P, { x: -side * A * R.r(0.22, 0.3), h: R.r(0.95, 1.1), z: -0.2, in: arrive(P.t0, { dx: -side * 0.3, d: 0.3, e: 'out5' }) });
      if (sub) ly.push(sub);
      const x0 = side > 0 ? -A / 2 + 0.1 : A / 2 - 0.1;
      P.ws.forEach((w, i) => {
        const fc = R.pick(faces);
        const s = fc[2] ? up(clean(w.raw)) : clean(w.raw);
        const col = i % 2 ? S.a : S.ink;
        const c = PU.fit(s, { f: fc[0], wt: fc[1], fill: C(col), rough: fc[2] ? 0.3 : 0.1 }, A * 0.62 * P.HPX, rowH * 1.25 * P.HPX);
        const y = -0.42 + (i + 0.5) * (0.84 / n);
        ly.push(L(c, P, { x: x0, ax: side > 0 ? 0 : 1, y, z: 0.03 + i * 0.05, ext: fc[2] ? { d: 0.05 } : null, rot: R.r(-0.05, 0.05), in: arrive(w.t, { dx: side * R.r(0.15, 0.35), dty: -side * R.r(0.6, 1.2), fade: 1, d: 0.22 }), hit: [w.t] }));
      });
      deco(P, ly, 1);
      return { layers: ly };
    },
  };

  // a tape across the frame printed with small text, the word huge over it in two passes of ink
  T.band = {
    w: 1, fits: (P) => P.ws.length <= 3 && P.text.length <= 18,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const rot = R.r(0.08, 0.2) * R.sgn();
      const tape = PU.rect(2400, 180, S.a);
      const tx = tape.getContext('2d');
      tx.fillStyle = C(S.on(S.a)); tx.font = `600 34px ${F.mono}`; tx.textBaseline = 'middle';
      const rep = (up(P.title || 'oley') + '  ✶  ' + up(P.artist || '') + '  ✶  ').repeat(12);
      tx.fillText(rep, 0, 40); tx.fillText(rep.slice(9), -40, 140);
      ly.push(L(tape, P, { w: A * 1.7, h: 0.15, rot, y: R.r(-0.05, 0.1), z: -0.09, v: { x: 0.03 * R.sgn() }, rev: { t: P.t0, d: 0.24, m: 1, e: 'out5' } }));
      const sub = subject(P, { kind: 'dots', x: R.sgn() * A * 0.28, h: 1.1, z: -0.38, shadow: false, a: 0.9, in: arrive(P.t0, { fade: 1, d: 0.4 }) });
      if (sub) ly.push(sub);
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: null, ol: 7, oc: C(S.a) }, A * 0.95, 0.5);
      const solid = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: C(S.ink), rough: 0.25 }, A * 0.95, 0.5);
      parts.forEach((p, i) => {
        ly.push(L(p.c, P, { x: p.x + 0.045, y: 0.04, w: p.w, h: p.h, z: -0.03, shadow: false, rot: rot * 0.3, in: arrive(P.ws[i].t, { ds: 0.3, fade: 1 }) }));
        ly.push(L(solid[i].c, P, { x: p.x, y: 0, w: p.w, h: p.h, z: 0.07, ext: { d: 0.06 }, rot: rot * 0.3, in: arrive(P.ws[i].t + 0.04, { ds: 0.3, fade: 1 }), hit: [P.ws[i].t] }));
      });
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // every letter on its own scrap of paper, landing one after another
  T.ransom = {
    w: 1, fits: (P) => P.ws.length === 1 && clean(P.ws[0].raw).length >= 2 && clean(P.ws[0].raw).length <= 9,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { kind: 'dots', h: 1.05, x: R.r(-0.2, 0.2), a: 0.55, z: -0.32, shadow: false });
      if (sub) ly.push(sub);
      const w = P.ws[0], s = clean(w.raw);
      const n = s.length, slot = Math.min(0.3, (A * 0.86) / n);
      const span = Math.max(0.18, Math.min(0.6, (w.dur || 0.35) * 0.9));
      const faces = [F.cond, F.black, F.serif, F.gothic, F.grot, F.stencil, F.round, F.script];
      for (let i = 0; i < n; i++) {
        const bgc = R.pick([S.paper, S.a, S.ink, S.b, S.paper]);
        const fg = S.on(bgc);
        const ch = R.ch(0.6) ? s[i].toUpperCase() : s[i].toLowerCase();
        const g = PU.txt(ch, { f: R.pick(faces), wt: R.pick([400, 700, 900]), px: slot * P.HPX * R.r(0.9, 1.15), fill: C(fg) });
        const pw = g.width * R.r(1.15, 1.4), ph = g.height * R.r(1.05, 1.25);
        const c = PU.rect(pw, ph, bgc, { torn: 0.8 });
        c.getContext('2d').drawImage(g, (pw - g.width) / 2, (ph - g.height) / 2);
        PU.rough(c, 0.2);
        const tt = w.t + (i / n) * span;
        ly.push(L(c, P, { x: (i - (n - 1) / 2) * slot, y: R.r(-0.05, 0.05), rot: R.r(-0.2, 0.2), z: 0.02 + R.r(0, 0.14), sg: 0.05, in: arrive(tt, { ds: 0.6, d: 0.1, e: 'back', fade: 1 }), hit: [tt] }));
      }
      deco(P, ly, 1);
      return { layers: ly };
    },
  };

  // a script word written across a toned print of the cover
  T.script = {
    w: 1, fits: (P) => P.text.length <= 20,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      if (P.art && P.art.ok) {
        const kind = R.pick(['tone', 'duo', 'tri']);
        const c = P.art.card(kind, kind === 'tri' ? [[12, 11, 13], S.b, S.paper] : [[12, 11, 13], S.dark ? S.b : S.paper], 1280, 720, { zoom: R.r(1.0, 1.25), oy: R.r(-0.1, 0.1) });
        ly.push(L(c, P, { w: A * 1.08, h: 1.08, z: -0.5, shadow: false, a: 0.92, v: { s: 0.025 } }));
      }
      const txt = P.ws.map((w) => clean(w.raw)).join(' ');
      const c = PU.fit(txt, { f: F.script, wt: 400, fill: C(S.a), sh: [8, 10], shc: C([10, 9, 10], 0.85) }, A * 0.9 * P.HPX, 0.5 * P.HPX);
      const w0 = P.ws[0], wl = P.ws[P.ws.length - 1];
      const d = Math.max(0.25, Math.min(1.4, wl.t + Math.min(0.5, wl.dur || 0.3) - w0.t));
      ly.push(L(c, P, { y: R.r(-0.08, 0.06), rot: R.r(-0.08, 0.04), z: 0.1, sg: 0.1, rev: { t: w0.t - 0.04, d, m: 1, e: 'lin', soft: 0.04 }, hit: hits(P) }));
      const cap = PU.txt(up(P.artist || P.title || ''), { f: F.grot, wt: 800, px: 0.035 * P.HPX, ls: 0.3, fill: C(S.paper) });
      ly.push(L(cap, P, { y: 0.3, z: 0.12, in: arrive(P.t0, { fade: 1, d: 0.3 }) }));
      return { layers: ly };
    },
  };

  // the word repeated in rows that run opposite ways, one row inked solid
  T.marquee = {
    w: 1, fits: (P) => P.text.length <= 16,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const s = up(P.ws.map((w) => clean(w.raw)).join(' ')) + '  ✶  ';
      const rows = 7, rh = 1.02 / rows, hot = 3;
      for (let r = 0; r < rows; r++) {
        const hotRow = r === hot;
        const c = PU.txt(s.repeat(4), hotRow ? { f: F.cond, px: rh * 0.9 * P.HPX, fill: C(S.on(S.a)) } : { f: F.cond, px: rh * 0.9 * P.HPX, fill: r % 2 ? null : C(S.ink, 0.9), ol: r % 2 ? 3 : 0, oc: C(S.ink, 0.8) });
        if (hotRow) ly.push(L(PU.solid(S.a), P, { w: A * 1.6, h: rh * 1.02, y: -0.51 + (r + 0.5) * rh, z: -0.12, rev: { t: P.ws[0].t - 0.05, d: 0.18, m: 1, e: 'out5' } }));
        const dir = r % 2 ? 1 : -1;
        ly.push(L(c, P, { y: -0.51 + (r + 0.5) * rh, x: dir * 0.3, z: hotRow ? -0.1 : -0.3 - (r % 2) * 0.12, shadow: hotRow, a: hotRow ? 1 : 0.8, v: { x: dir * R.r(0.18, 0.3) }, in: arrive(hotRow ? P.ws[0].t : P.t0 + r * 0.02, { dx: dir * 0.4, d: 0.25, e: 'out5' }), hit: hotRow ? hits(P) : null }));
      }
      const sub = subject(P, { h: 1.0, x: R.r(-0.15, 0.15) * A, z: 0.18, border: true, in: arrive(P.t0 + 0.05, { dy: 0.4, d: 0.3, e: 'out5' }) });
      if (sub) ly.push(sub);
      return { layers: ly };
    },
  };

  // a tilted photo card with the line slapped on as a sticker
  T.card = {
    w: 1.1, fits: (P) => P.text.length <= 26,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const ghost = PU.txt(up(P.ws.map((w) => clean(w.raw)).join(' ')), { f: F.cond, px: 0.7 * P.HPX, fill: null, ol: 4, oc: C(S.ink, 0.35) });
      ly.push(L(ghost, P, { z: -0.6, shadow: false, h: 0.75, v: { x: -0.02 } }));
      if (P.art && P.art.ok) {
        const kind = R.pick(['tone', 'duo', 'tri']);
        const c = P.art.card(kind, kind === 'tri' ? [[12, 11, 13], S.a, S.paper] : [[12, 11, 13], S.paper], 760, 940, { frame: S.paper, zoom: R.r(1, 1.3) });
        ly.push(L(c, P, { h: 0.82, x: R.r(-0.1, 0.1), z: 0, gloss: 0.5, sg: 0.12, rot: R.r(-0.1, 0.1), ty: R.r(0.25, 0.4) * R.sgn(), tx: R.r(-0.15, 0.15), in: arrive(P.t0, { dy: 0.9, dr: R.r(-0.4, 0.4), d: 0.34, e: 'out5' }), v: { r: 0.01 } }));
      }
      // the sticker
      const txt = up(P.ws.map((w) => clean(w.raw)).join(' '));
      const t = PU.fit(txt, { f: F.black, fill: C(S.on(S.a)) }, A * 0.55 * P.HPX, 0.15 * P.HPX);
      const pad = t.height * 0.35;
      const st = PU.rect(t.width + pad * 2, t.height + pad * 1.4, S.a, { r: pad * 0.5 });
      st.getContext('2d').drawImage(t, pad, pad * 0.7);
      PU.rough(st, 0.25);
      ly.push(L(st, P, { x: R.r(-0.2, 0.2), y: R.r(0.12, 0.26), z: 0.14, gloss: 0.6, rot: R.r(-0.1, 0.1), in: arrive(P.ws[0].t, { ds: 0.5, d: 0.12, e: 'back', fade: 1 }), hit: hits(P) }));
      ly.push(L(PU.barcode(260, 80, S.ink), P, { x: R.r(0.15, 0.3), y: -0.32, z: 0.2, rot: R.r(-0.1, 0.1), in: arrive(P.t0 + 0.1, { ds: 0.4, d: 0.12, e: 'back', fade: 1 }) }));
      deco(P, ly, 1);
      return { layers: ly };
    },
  };

  // three tall panels of the cover in different inks, the word across all of them
  T.panels = {
    w: 1, fits: (P) => P.text.length <= 16 && P.art && P.art.ok,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P, [10, 9, 10])];
      const inks = [[[12, 11, 13], S.a], [[12, 11, 13], S.paper], [S.ink, S.b], [[12, 11, 13], S.b]];
      const pw = A / 3;
      for (let i = 0; i < 3; i++) {
        const c = P.art.card(R.pick(['duo', 'tone']), R.pick(inks), 600, 1100, { zoom: R.r(1.2, 1.8), ox: R.r(-0.2, 0.2), oy: R.r(-0.2, 0.2) });
        const dir = i % 2 ? 1 : -1;
        ly.push(L(c, P, { x: (i - 1) * pw, w: pw * 1.005, h: 1.02, z: [-0.2, -0.08, -0.27][i], in: arrive(P.t0 + i * 0.05, { dy: dir * 1.1, d: 0.28, e: 'out5' }), v: { y: dir * 0.01 } }));
      }
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: C(S.paper), st: C([10, 9, 10]), sw: 10, rough: 0.2 }, A * 0.96, 0.55);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, y: 0.02, w: p.w, h: p.h, z: 0.13, ext: { d: 0.06 }, in: arrive(P.ws[i].t, { ds: 0.5, dtx: R.r(-1, 1), fade: 1, d: 0.2 }), hit: [P.ws[i].t] })));
      return { layers: ly };
    },
  };

  // a design tool: the word in a selection box with handles, a pointer grabs a corner and pulls
  T.frame = {
    w: 0.9, fits: (P) => P.text.length <= 18,
    make(P) {
      const { S, R, A } = P;
      const light = R.ch(0.6);
      const bgc = light ? S.paper : S.bg, ink = light ? [16, 16, 18] : S.ink;
      const ly = [plate(P, bgc)];
      // faint grid
      const g = PU.cv(1600, 900), gx = g.getContext('2d');
      gx.strokeStyle = C(ink, 0.08); gx.lineWidth = 2;
      for (let x = 0; x <= 1600; x += 50) { gx.beginPath(); gx.moveTo(x, 0); gx.lineTo(x, 900); gx.stroke(); }
      for (let y = 0; y <= 900; y += 50) { gx.beginPath(); gx.moveTo(0, y); gx.lineTo(1600, y); gx.stroke(); }
      ly.push(L(g, P, { w: 1.5 * (1600 / 900), h: 1.5, z: -0.4, shadow: false }));
      const txt = P.ws.map((w) => clean(w.raw)).join(' ');
      const c = PU.fit(txt, { f: R.pick([F.grot, F.black, F.serif]), wt: 800, fill: C(ink), it: R.ch(0.3) }, A * 0.7 * P.HPX, 0.32 * P.HPX);
      const tw = c.width / P.HPX, th = c.height / P.HPX;
      const w0 = P.ws[0], wl = P.ws[P.ws.length - 1];
      const d = Math.max(0.2, Math.min(1.2, wl.t + 0.15 - w0.t));
      const grow = wl.t + 0.25;
      ly.push(L(c, P, { z: 0.04, ext: { d: 0.03 }, rev: { t: w0.t - 0.04, d, m: 1, e: 'step' + Math.max(2, txt.length), soft: 0.002 }, grow: { t: grow, k: 0.14 } }));
      // the box
      const bw = Math.ceil(c.width + 40), bh = Math.ceil(c.height + 40);
      const b = PU.cv(bw, bh), bx = b.getContext('2d');
      bx.strokeStyle = C(S.a); bx.lineWidth = 3; bx.strokeRect(6, 6, bw - 12, bh - 12);
      bx.fillStyle = '#fff';
      for (const [hx, hy] of [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]]) { const X = 6 + hx * (bw - 12), Y = 6 + hy * (bh - 12); bx.fillRect(X - 9, Y - 9, 18, 18); bx.strokeRect(X - 9, Y - 9, 18, 18); }
      ly.push(L(b, P, { z: 0.07, shadow: false, in: arrive(w0.t - 0.02, { fade: 1, d: 0.08, ds: 0.06 }), grow: { t: grow, k: 0.14 } }));
      const lab = PU.micro([`W ${Math.round(tw * 1000)}  H ${Math.round(th * 1000)}`], { px: 22, fill: C([255, 255, 255]) });
      const tag = PU.rect(lab.width + 16, lab.height + 8, S.a, { r: 6 }); tag.getContext('2d').drawImage(lab, 8, 4);
      ly.push(L(tag, P, { y: th / 2 + 0.06, z: 0.08, in: arrive(w0.t + 0.05, { fade: 1, d: 0.1 }) }));
      // the pointer comes in and drags the corner
      const cur = PU.cursor(0.05 * P.HPX, light ? '#111' : '#fff', light ? '#fff' : '#111');
      const cx = (bw / 2) / P.HPX, cy = (bh / 2) / P.HPX;
      ly.push(L(cur, P, { x: cx, y: cy, ax: 0.08, ay: 0.05, z: 0.18, in: { t: grow - 0.35, d: 0.3, dx: 0.35, dy: 0.25, e: 'out3', fade: 1 }, path: { t: grow, d: 0.3, dx: cx * 0.14, dy: cy * 0.14 } }));
      return { layers: ly };
    },
  };

  // a message bubble on a wall of the same word
  T.bubble = {
    w: 0.9, fits: (P) => P.text.length <= 40,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const ghost = PU.txt(up(clean(P.ws[P.key].raw)), { f: F.cond, px: 0.9 * P.HPX, fill: C(S.ink, 0.07) });
      ly.push(L(ghost, P, { h: 0.95, z: -0.55, shadow: false, v: { s: 0.03 } }));
      const txt = P.ws.map((w) => clean(w.raw)).join(' ');
      const t = PU.fit(txt, { f: F.grot, wt: 600, fill: C(S.on(S.a)) }, A * 0.62 * P.HPX, 0.14 * P.HPX);
      const pad = t.height * 0.42;
      const bw = t.width + pad * 2, bh = t.height + pad * 1.5;
      const b = PU.cv(bw + 30, bh + 20), bx = b.getContext('2d');
      bx.fillStyle = C(S.a); bx.beginPath(); bx.roundRect(0, 0, bw, bh, bh / 2); bx.fill();
      bx.beginPath(); bx.moveTo(bw - bh * 0.3, bh * 0.7); bx.quadraticCurveTo(bw + 10, bh + 4, bw + 26, bh + 6); bx.quadraticCurveTo(bw - 10, bh * 0.95, bw - bh * 0.5, bh * 0.88); bx.fill();
      const by = R.r(-0.06, 0.06);
      ly.push(L(b, P, { y: by, z: 0.06, gloss: 0.5, in: arrive(P.ws[0].t - 0.12, { ds: -0.6, d: 0.2, e: 'back', fade: 1 }), hit: hits(P) }));
      const w0 = P.ws[0], wl = P.ws[P.ws.length - 1];
      ly.push(L(t, P, { y: by - (10 / P.HPX), x: -15 / P.HPX, z: 0.065, shadow: false, rev: { t: w0.t - 0.03, d: Math.max(0.15, wl.t - w0.t + 0.12), m: 1, e: 'step' + Math.max(2, P.ws.length), soft: 0.002 } }));
      const rd = PU.micro(['Delivered'], { px: 22, fill: C(S.ink, 0.6) });
      ly.push(L(rd, P, { x: (bw / 2) / P.HPX - 0.04, y: by + bh / 2 / P.HPX + 0.04, ax: 1, z: 0.06, shadow: false, in: arrive(wl.t + 0.2, { fade: 1, d: 0.15 }) }));
      return { layers: ly };
    },
  };

  // a road sign that swings in
  T.sign = {
    w: 0.8, fits: (P) => P.ws.length <= 2 && P.text.length <= 11,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { kind: 'dots', h: 1.1, x: R.sgn() * A * 0.28, z: -0.36, shadow: false, a: 0.7 });
      if (sub) ly.push(sub);
      const shape = R.pick(['tri', 'dia', 'oct', 'circ']);
      const s = PU.sign(shape, 900, S.a, S.dark ? [14, 12, 14] : S.ink, P.ws.map((w) => clean(w.raw)).join(' '), R.pick([F.cond, F.black]));
      ly.push(L(PU.solid(S.dark ? [70, 70, 74] : [40, 40, 44]), P, { w: 0.03, h: 0.6, y: 0.47, z: -0.03, in: arrive(P.ws[0].t - 0.2, { dy: 0.6, d: 0.2, e: 'out5' }) }));
      ly.push(L(s, P, { h: 0.66, y: -0.06, z: 0.06, ext: { d: 0.025, n: 10 }, gloss: 0.4, rot: R.r(-0.08, 0.08), in: arrive(P.ws[0].t - 0.08, { dr: R.sgn() * 0.9, ds: -0.4, d: 0.32, e: 'back', fade: 1 }), hit: hits(P), v: { r: 0.02 } }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // the word, a marker loop round the key word and an arrow at it
  T.scribble = {
    w: 1, fits: (P) => P.text.length <= 22,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: R.pick([F.cond, F.black]), fill: C(S.ink), rough: 0.3 }, A * 0.86, 0.42);
      const y = R.r(-0.05, 0.05);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, y, w: p.w, h: p.h, z: 0.02, ext: { d: 0.05 }, in: arrive(P.ws[i].t, { dy: -0.08, dtx: -R.r(0.8, 1.3), fade: 1, d: 0.2 }), hit: [P.ws[i].t] })));
      const k = P.key, kp = parts[k], kw = P.ws[k];
      const lp = PU.loop(kp.w * P.HPX * 1.35, kp.h * P.HPX * 1.5, S.a, 14);
      ly.push(L(lp, P, { x: kp.x, y, z: 0.11, sg: 0.06, rot: R.r(-0.1, 0.1), rev: { t: kw.t + 0.05, d: 0.35, m: 4, e: 'out3', soft: 0.02 } }));
      const ar = PU.arrow(0.36 * P.HPX, 0.26 * P.HPX, S.a, 12, kp.x > 0);
      ly.push(L(ar, P, { x: kp.x - (kp.x > 0 ? -1 : 1) * (kp.w / 2 + 0.2), y: y + 0.26, z: 0.11, rev: { t: kw.t + 0.25, d: 0.25, m: kp.x > 0 ? 2 : 1, e: 'out3' } }));
      const note = PU.txt(R.pick(['this.', 'yes', '!!', 'again', 'circle it', 'me']), { f: F.hand, px: 0.07 * P.HPX, fill: C(S.a) });
      ly.push(L(note, P, { x: kp.x - (kp.x > 0 ? -1 : 1) * (kp.w / 2 + 0.36), y: y + 0.36, z: 0.13, rot: R.r(-0.15, 0.1), in: arrive(kw.t + 0.45, { fade: 1, d: 0.12 }) }));
      return { layers: ly };
    },
  };

  // a starburst turning behind the word, a ring of small type turning the other way
  T.burst = {
    w: 1, fits: (P) => P.text.length <= 16,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const b = PU.burst(1200, S.a, R.i(14, 30), { inner: R.r(0.55, 0.78), jag: R.ch(0.5) });
      const bh = R.r(0.62, 0.8);
      ly.push(L(b, P, { h: bh, x: R.r(-0.2, 0.2) * A, z: -0.25, ext: { d: 0.03, n: 8 }, v: { r: 0.25 * R.sgn() }, in: arrive(P.t0, { ds: -0.8, d: 0.3, e: 'back' }) }));
      // a ring of text
      const ring = PU.cv(1000, 1000), rx = ring.getContext('2d');
      const s = (up(P.title || 'oley') + ' · ' + up(P.artist || '') + ' · ').repeat(3).slice(0, 90);
      rx.fillStyle = C(S.ink); rx.font = `700 34px ${F.mono}`; rx.textAlign = 'center';
      for (let i = 0; i < s.length; i++) { rx.save(); rx.translate(500, 500); rx.rotate((i / s.length) * PI * 2); rx.fillText(s[i], 0, -440); rx.restore(); }
      ly.push(L(ring, P, { h: bh * 1.12, x: ly[1].x, z: -0.2, shadow: false, v: { r: -0.15 * R.sgn() }, in: arrive(P.t0, { fade: 1, d: 0.3 }) }));
      const sub = subject(P, { h: 0.95, x: ly[1].x + R.r(-0.1, 0.1), z: -0.06, border: true, in: arrive(P.t0 + 0.04, { dy: 0.3, d: 0.3, e: 'out5' }) });
      if (sub && R.ch(0.6)) ly.push(sub);
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.black, fill: C(S.dark ? S.ink : [16, 16, 18]), st: C(S.bg), sw: 8 }, A * 0.8, 0.34);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, y: 0.22, w: p.w, h: p.h, z: 0.14, ext: { d: 0.06 }, in: arrive(P.ws[i].t, { ds: 0.4, dty: R.r(-1, 1), fade: 1, d: 0.2 }), hit: [P.ws[i].t] })));
      return { layers: ly };
    },
  };

  // outline copies of the word going back into depth, the solid one in front
  T.echo = {
    w: 0.9, fits: (P) => P.text.length <= 14,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const s = up(P.ws.map((w) => clean(w.raw)).join(' '));
      const o = PU.fit(s, { f: F.cond, fill: null, ol: 5, oc: C(S.a) }, A * 0.7 * P.HPX, 0.5 * P.HPX);
      const f = PU.fit(s, { f: F.cond, fill: C(S.ink), rough: 0.3 }, A * 0.7 * P.HPX, 0.5 * P.HPX);
      const n = 7;
      const ex = R.r(0.02, 0.05) * R.sgn(), ey = R.r(0.015, 0.035) * R.sgn();
      for (let i = n; i >= 1; i--) ly.push(L(o, P, { shadow: false, z: -i * 0.2, x: ex * i * 3, y: ey * i * 3, s: 1 + i * 0.09, a: 1 - i / (n + 2), in: arrive(P.ws[0].t - 0.05 + (n - i) * 0.018, { dz: -1.5, d: 0.3, e: 'out5', fade: 1 }) }));
      ly.push(L(f, P, { z: 0.06, ext: { d: 0.06 }, in: arrive(P.ws[0].t, { ds: 0.4, fade: 1 }), hit: hits(P) }));
      return { layers: ly, cam: { tilt: true } };
    },
  };

  // a contact sheet of the cover, the line on a strip across it
  T.grid = {
    w: 0.9, fits: (P) => P.text.length <= 24 && P.art && P.art.ok,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P, [12, 11, 13])];
      const cw = A / 3, ch = 0.5;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const kind = R.pick(['duo', 'tone', 'tri']);
        const cols = kind === 'tri' ? [[12, 11, 13], S.a, S.paper] : [[12, 11, 13], R.pick([S.a, S.paper, S.b])];
        const img = P.art.card(kind, cols, 640, 430, { zoom: R.r(1.1, 2), ox: R.r(-0.3, 0.3), oy: R.r(-0.3, 0.3), frame: [12, 11, 13] });
        ly.push(L(img, P, { x: (c - 1) * cw, y: (r - 0.5) * ch, w: cw * 0.98, h: ch * 0.96, z: R.r(-0.3, -0.06), in: arrive(P.t0 + (r * 3 + c) * 0.035, { ds: -0.5, d: 0.16, e: 'out5', fade: 1 }) }));
      }
      ly.push(L(PU.solid(S.a), P, { w: A * 1.5, h: 0.2, z: 0.03, rot: R.r(-0.05, 0.05), rev: { t: P.ws[0].t - 0.06, d: 0.16, m: 1, e: 'out5' } }));
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: C(S.on(S.a)) }, A * 0.9, 0.16);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, w: p.w, h: p.h, z: 0.08, in: arrive(P.ws[i].t, { dy: 0.05, fade: 1, d: 0.1 }), hit: [P.ws[i].t] })));
      return { layers: ly };
    },
  };

  // a ticket stub sliding in over another
  T.ticket = {
    w: 0.8, fits: (P) => P.text.length <= 16,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const txt = P.ws.map((w) => clean(w.raw)).join(' ');
      const back = PU.ticket(1400, 560, S, P.title || 'oley', R);
      ly.push(L(back, P, { h: 0.42, x: 0.15, y: -0.12, z: -0.12, gloss: 0.3, rot: R.r(0.1, 0.2), a: 0.85, in: arrive(P.t0, { dx: 1.2, d: 0.3, e: 'out5' }) }));
      const tk = PU.ticket(1400, 560, S, txt, R);
      ly.push(L(tk, P, { h: 0.5, y: 0.05, z: 0.08, gloss: 0.5, sg: 0.1, rot: R.r(-0.12, -0.03), in: arrive(P.ws[0].t - 0.06, { dx: -1.4, dr: -0.3, d: 0.26, e: 'out5' }), hit: hits(P) }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // letters flying in out of the depth and locking into the word
  T.fly = {
    w: 0.9, fits: (P) => P.ws.length <= 2 && P.text.length <= 11,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { h: 1.05, x: R.sgn() * A * 0.3, z: -0.3, in: arrive(P.t0, { fade: 1, d: 0.3 }) });
      if (sub) ly.push(sub);
      const s = up(P.ws.map((w) => clean(w.raw)).join(' '));
      const fam = R.pick([F.cond, F.black, F.stencil]);
      const letters = line(P, s.split('').filter((ch) => ch !== ' '), { f: fam, fill: C(S.ink), rough: 0.25 }, A * 0.85, 0.5, 0.04);
      const w0 = P.ws[0], wl = P.ws[P.ws.length - 1];
      const span = Math.max(0.15, Math.min(0.7, wl.t + 0.2 - w0.t));
      letters.forEach((p, i) => {
        const tt = w0.t - 0.05 + (i / letters.length) * span;
        ly.push(L(p.c, P, { x: p.x, w: p.w, h: p.h, z: 0.04, ext: { d: 0.06 }, in: { t: tt, d: 0.24, dz: -R.r(2, 4), dx: R.r(-0.6, 0.6), dy: R.r(-0.5, 0.5), dr: R.r(-1.5, 1.5), e: 'out5', fade: 1 }, hit: [tt + 0.2] }));
      });
      return { layers: ly, cam: { tilt: true } };
    },
  };

  // a torn-out magazine page: the key word in blackletter, the rest small in a column
  T.page = {
    w: 0.9, fits: (P) => P.ws.length >= 2 && P.text.length <= 40,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const pg = PU.rect(900, 1200, S.paper, { torn: 1.2 });
      const px = pg.getContext('2d');
      if (P.art && P.art.ok) { const im = P.art.card('tone', [[20, 18, 20], S.paper], 820, 560, {}); px.drawImage(im, 40, 40); }
      px.fillStyle = C(S.on(S.paper), 0.3);
      for (let i = 0; i < 9; i++) px.fillRect(40, 660 + i * 36, 380 + ((i * 53) % 200), 12);
      PU.rough(pg, 0.15);
      const side = R.sgn();
      ly.push(L(pg, P, { h: 0.92, x: side * A * 0.2, z: -0.08, rot: side * R.r(0.03, 0.08), in: arrive(P.t0, { dy: 1.1, d: 0.3, e: 'out5' }) }));
      const k = P.key;
      const kw = PU.fit(clean(P.ws[k].raw), { f: F.gothic, fill: C(S.a), sh: [6, 6], shc: C([10, 9, 10], 0.9) }, A * 0.55 * P.HPX, 0.36 * P.HPX);
      ly.push(L(kw, P, { x: -side * A * 0.2, y: -0.1, z: 0.12, ext: { d: 0.04 }, rot: R.r(-0.06, 0.06), in: arrive(P.ws[k].t, { ds: 0.5, fade: 1, d: 0.14 }), hit: [P.ws[k].t] }));
      let yy = 0.12;
      P.ws.forEach((w, i) => {
        if (i === k) return;
        const c = PU.txt(up(clean(w.raw)), { f: F.grot, wt: 800, px: 0.06 * P.HPX, fill: C(S.ink), ls: 0.05, st: C(S.bg), sw: 3 });
        ly.push(L(c, P, { x: -side * A * 0.2, y: yy, z: 0.1, in: arrive(w.t, { dx: -0.1, fade: 1, d: 0.12 }) }));
        yy += 0.075;
      });
      return { layers: ly };
    },
  };

  PU.H = { L, line, arrive, subject, deco, plate, cutCols, up, clean, hits };

  // ---------------------------------------------------------------- splitting a line into cards
  PU.group = function (L) {
    const ws = L.words, out = [];
    let cur = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const nx = ws[i + 1];
      const span = (nx ? nx.t : Math.max(w.t + 0.4, L.singEnd || 0)) - cur[0].t;
      const chars = cur.map((q) => clean(q.raw)).join(' ').length;
      const punct = /[,.!?;:]$/.test(w.raw || '');
      if (!nx || cur.length >= 4 || span >= 1.25 || (span >= 0.5 && (chars >= 10 || punct || w.key || cur.length >= 3))) { out.push(cur); cur = []; }
    });
    // a last scrap that's too short joins the one before
    if (out.length > 1) {
      const last = out[out.length - 1], prev = out[out.length - 2];
      const dur = (L.singEnd || last[last.length - 1].t + 0.3) - last[0].t;
      if (dur < 0.3 && prev.length + last.length <= 5) { out.pop(); prev.push(...last); }
    }
    return out;
  };
})();
