/* Oley · Pasteup layouts, part two: polaroids, a spinning record, a cassette, a tabloid front page,
   flip-letters, misregistered print, a tunnel of frames, a sticker bomb, a Swiss grid poster, a
   photocopy with tape, and a halftone wall with the word knocked out of it. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, PU = O.PU, F = PU.FONT, C = PU.C;
  const PI = Math.PI;
  const T = PU.TPL, H = PU.H;
  const { L, line, arrive, subject, deco, plate, up, clean, hits } = H;
  const deep = [12, 11, 13];
  const txt = (P) => P.ws.map((w) => clean(w.raw)).join(' ');
  const span = (P) => { const a = P.ws[0], b = P.ws[P.ws.length - 1]; return Math.max(0.2, Math.min(1.6, b.t + Math.min(0.5, b.dur || 0.3) - a.t)); };

  // ---------------------------------------------------------------- polaroids fanned out, the line written on the front one
  T.polaroid = {
    w: 1.1, fits: (P) => P.text.length <= 22 && P.art && P.art.ok,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const shot = (k, zoom, ox, oy) => {
        const W = 760, Hh = 920, m = 46, ph = 690;
        const c = PU.cv(W, Hh), x = c.getContext('2d');
        x.fillStyle = C([246, 244, 238]); x.fillRect(0, 0, W, Hh);
        const im = P.art.card(k, k === 'tri' ? [deep, S.a, S.paper] : [deep, S.paper], W - m * 2, ph, { zoom, ox, oy });
        x.drawImage(im, m, m);
        const g = x.createLinearGradient(0, m, 0, m + ph); g.addColorStop(0, 'rgba(255,240,220,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
        x.fillStyle = g; x.fillRect(m, m, W - m * 2, ph);
        return PU.rough(c, 0.05);
      };
      const side = R.sgn();
      for (let i = 2; i >= 0; i--) {
        const c = shot(R.pick(['tone', 'duo', 'tri']), R.r(1.05, 1.6), R.r(-0.2, 0.2), R.r(-0.2, 0.2));
        ly.push(L(c, P, { h: 0.78, x: side * (i * 0.16 - 0.1), y: -0.02 + i * 0.02, z: -0.05 - i * 0.08, rot: side * (i * 0.12 - 0.04) + R.r(-0.04, 0.04), gloss: 0.35, sg: 0.06,
          in: arrive(P.t0 + (2 - i) * 0.07, { dy: 1.1, dr: side * 0.5, dtx: 0.6, d: 0.32, e: 'out5' }) }));
      }
      // the handwriting on the front one's strip
      const front = ly[ly.length - 1];
      const t = PU.fit(txt(P), { f: F.hand, wt: 400, fill: C([22, 30, 70]) }, 0.62 * 0.78 * (760 / 920) * P.HPX, 0.09 * P.HPX);
      const dy = 0.78 * (0.5 - 120 / 920);
      ly.push(L(t, P, { x: front.x - Math.sin(front.rot) * dy, y: front.y + Math.cos(front.rot) * dy, z: front.z + 0.002, rot: front.rot, shadow: false, bias: 0.3, rev: { t: P.ws[0].t - 0.04, d: span(P), m: 1, e: 'lin', soft: 0.03 } }));
      ly.push(L(PU.tape(260, 70), P, { x: front.x + R.r(-0.1, 0.1), y: front.y - 0.4, z: front.z + 0.01, rot: R.r(-0.25, 0.25), sg: 0.02, in: arrive(P.t0 + 0.25, { ds: 0.4, fade: 1, d: 0.12 }) }));
      const big = PU.fit(up(clean(P.ws[P.key].raw)), { f: F.cond, fill: C(S.ink), rough: 0.3 }, A * 0.38 * P.HPX, 0.42 * P.HPX);
      ly.push(L(big, P, { x: -side * A * 0.27, y: R.r(-0.1, 0.1), z: 0.08, ext: { d: 0.05 }, in: arrive(P.ws[P.key].t, { ds: 0.5, dty: -side * 0.8, fade: 1, d: 0.2 }), hit: [P.ws[P.key].t] }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a record spinning under the light
  T.vinyl = {
    w: 1, fits: (P) => P.text.length <= 20,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const side = R.sgn();
      const SZ = 1100, m = SZ / 2;
      const d = PU.cv(SZ, SZ), x = d.getContext('2d');
      x.fillStyle = '#0b0b0c'; x.beginPath(); x.arc(m, m, m - 4, 0, PI * 2); x.fill();
      for (let r = m * 0.36; r < m - 10; r += 3.2) { x.strokeStyle = `rgba(255,255,255,${0.025 + Math.random() * 0.035})`; x.lineWidth = 1; x.beginPath(); x.arc(m, m, r, 0, PI * 2); x.stroke(); }
      for (const r of [m * 0.55, m * 0.72, m * 0.86]) { x.strokeStyle = 'rgba(0,0,0,0.9)'; x.lineWidth = 6; x.beginPath(); x.arc(m, m, r, 0, PI * 2); x.stroke(); }
      x.save(); x.beginPath(); x.arc(m, m, m * 0.33, 0, PI * 2); x.clip();
      if (P.art && P.art.ok) x.drawImage(P.art.card('tri', [deep, S.a, S.paper], SZ * 0.66, SZ * 0.66, { zoom: 1.1 }), m - SZ * 0.33, m - SZ * 0.33);
      else { x.fillStyle = C(S.a); x.fillRect(0, 0, SZ, SZ); }
      x.restore();
      x.fillStyle = C(S.paper); x.font = `700 ${Math.round(SZ * 0.022)}px ${F.mono}`; x.textAlign = 'center';
      x.fillText(up(P.title || 'OLEY').slice(0, 22) + '  ·  33⅓', m, m + SZ * 0.27);
      x.fillStyle = '#000'; x.beginPath(); x.arc(m, m, SZ * 0.012, 0, PI * 2); x.fill();
      // a sleeve behind it
      if (P.art && P.art.ok) {
        const sl = P.art.card(R.pick(['tone', 'duo']), [deep, S.paper], 900, 900, { zoom: R.r(1, 1.3), frame: S.paper });
        ly.push(L(sl, P, { h: 0.86, x: side * A * 0.2, y: 0.02, z: -0.12, rot: side * 0.05, gloss: 0.25, in: arrive(P.t0, { dx: side * 1.2, d: 0.3, e: 'out5' }) }));
      }
      const disc = L(d, P, { h: 0.82, x: side * A * 0.04, y: 0.02, z: 0.0, tx: R.r(-0.35, -0.15), ty: side * R.r(0.15, 0.3), gloss: 0.9, sg: 0.05, v: { r: side * 3.49 }, in: arrive(P.t0 + 0.06, { dx: side * 0.6, dr: side * 2, d: 0.34, e: 'out5' }) });
      ly.push(disc);
      // the shine on it stays put while it turns
      const sh = PU.cv(512, 512), sx = sh.getContext('2d');
      const g = sx.createConicGradient(R.r(0, PI), 256, 256);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.08, 'rgba(255,255,255,0.22)'); g.addColorStop(0.16, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(0.58, 'rgba(255,255,255,0.18)'); g.addColorStop(0.66, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.beginPath(); sx.arc(256, 256, 252, 0, PI * 2); sx.arc(256, 256, 256 * 0.34, 0, PI * 2, true); sx.fill();
      ly.push(L(sh, P, { h: 0.82, x: disc.x, y: disc.y, z: 0.003, tx: disc.tx, ty: disc.ty, shadow: false, lit: 0, bias: 0.3, in: arrive(P.t0 + 0.06, { dx: side * 0.6, d: 0.34, e: 'out5', fade: 1 }) }));
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: R.pick([F.cond, F.black]), fill: C(S.ink), rough: 0.25 }, A * 0.5, 0.3);
      const stackY = -((parts.length - 1) * 0.3) / 2;
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: -side * A * 0.26, y: P.ws.length > 2 ? stackY + i * 0.3 : (i - (parts.length - 1) / 2) * 0.32, w: p.w, h: p.h, z: 0.1, ext: { d: 0.05 }, in: arrive(P.ws[i].t, { dx: -side * 0.25, dty: side * 0.9, fade: 1, d: 0.2 }), hit: [P.ws[i].t] })));
      deco(P, ly, 1);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a cassette with the line on its label, reels turning
  T.cassette = {
    w: 0.9, fits: (P) => P.text.length <= 26,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const W = 1300, Hh = 820;
      const b = PU.cv(W, Hh), x = b.getContext('2d');
      const body = R.pick([[28, 28, 30], [236, 232, 222], S.b, [190, 30, 40]]);
      x.fillStyle = C(body); x.beginPath(); x.roundRect(0, 0, W, Hh, 40); x.fill();
      const g = x.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
      x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, W, Hh, 40); x.fill();
      // label
      x.fillStyle = C(S.paper); x.beginPath(); x.roundRect(80, 60, W - 160, 470, 18); x.fill();
      x.fillStyle = C(S.a); x.fillRect(80, 60, W - 160, 70);
      x.fillStyle = C(S.on(S.a)); x.font = `800 40px ${F.grot}`; x.textBaseline = 'middle'; x.fillText('A', 110, 96);
      x.font = `600 28px ${F.mono}`; x.fillText(up(P.title || '').slice(0, 26) + '   C-60', 170, 97);
      x.strokeStyle = C(S.on(S.paper), 0.25); x.lineWidth = 2;
      for (let y = 210; y < 520; y += 56) { x.beginPath(); x.moveTo(120, y); x.lineTo(W - 120, y); x.stroke(); }
      // the window, a real hole so the reels behind show through
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.roundRect(330, 300, W - 660, 170, 85); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 6; x.beginPath(); x.roundRect(330, 300, W - 660, 170, 85); x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.moveTo(260, Hh); x.lineTo(330, 640); x.lineTo(W - 330, 640); x.lineTo(W - 260, Hh); x.fill();
      for (const [sx, sy] of [[40, 40], [W - 40, 40], [40, Hh - 40], [W - 40, Hh - 40], [W / 2, Hh - 70]]) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(sx, sy, 14, 0, PI * 2); x.fill(); }
      const hh = 0.72, k = hh / Hh, cx = R.r(-0.08, 0.08) * A, rot = R.r(-0.08, 0.08), tx = R.r(-0.25, 0.1), ty = R.r(-0.3, 0.3);
      // reels and tape behind the window
      const reel = PU.cv(320, 320), rx = reel.getContext('2d');
      rx.fillStyle = '#3a2a22'; rx.beginPath(); rx.arc(160, 160, 158, 0, PI * 2); rx.fill();
      rx.fillStyle = '#f2f2f2'; rx.beginPath(); rx.arc(160, 160, 62, 0, PI * 2); rx.fill();
      rx.fillStyle = '#222'; for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; rx.fillRect(160 + Math.cos(a) * 40 - 7, 160 + Math.sin(a) * 40 - 7, 14, 14); }
      rx.fillStyle = '#111'; rx.beginPath(); rx.arc(160, 160, 22, 0, PI * 2); rx.fill();
      const rel = (dx) => { const lx = (dx - W / 2) * k, ly2 = (385 - Hh / 2) * k; return [cx + lx * Math.cos(rot) - ly2 * Math.sin(rot), lx * Math.sin(rot) + ly2 * Math.cos(rot)]; };
      for (const dx of [470, W - 470]) { const [rx2, ry2] = rel(dx); ly.push(L(reel, P, { h: 0.17, x: rx2, y: ry2, z: -0.012, tx, ty, shadow: false, v: { r: -4 }, in: arrive(P.t0, { dy: 1.2, d: 0.34, e: 'out5' }) })); }
      ly.push(L(PU.solid([20, 16, 14]), P, { w: 0.42, h: 0.06, x: cx, y: rel(470)[1], z: -0.02, rot, tx, ty, shadow: false, in: arrive(P.t0, { dy: 1.2, d: 0.34, e: 'out5' }) }));
      ly.push(L(b, P, { h: hh, x: cx, y: 0, z: 0, rot, tx, ty, gloss: 0.5, ext: { d: 0.035, n: 10 }, sg: 0.08, in: arrive(P.t0, { dy: 1.2, dtx: 0.7, d: 0.34, e: 'out5' }) }));
      // the line, handwritten on the label
      const t = PU.fit(txt(P), { f: F.hand, fill: C([24, 30, 80]) }, (W - 300) * k * P.HPX, 120 * k * P.HPX);
      const [lx, lyy] = rel(W / 2);
      const ly0 = lyy + (215 - 385) * k * Math.cos(rot);
      ly.push(L(t, P, { x: lx - (215 - 385) * k * Math.sin(rot), y: ly0, z: 0.002, rot, tx, ty, shadow: false, bias: 0.3, rev: { t: P.ws[0].t - 0.04, d: span(P), m: 1, e: 'lin', soft: 0.03 } }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a tabloid front page, the line as the headline
  T.tabloid = {
    w: 1, fits: (P) => P.text.length <= 24,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const W = 1200, Hh = 1500, news = [232, 228, 214];
      const c = PU.cv(W, Hh), x = c.getContext('2d');
      x.fillStyle = C(news); x.fillRect(0, 0, W, Hh);
      x.fillStyle = C(deep); x.textBaseline = 'alphabetic';
      const mast = 'THE ' + up((P.artist || 'OLEY').split(/\s+/)[0]).slice(0, 10) + ' TIMES';
      const mt = PU.fit(mast, { f: F.gothic, fill: C(deep) }, W - 120, 150);
      x.drawImage(mt, (W - mt.width) / 2, 30);
      x.fillRect(50, 200, W - 100, 6); x.fillRect(50, 214, W - 100, 2);
      x.font = `600 22px ${F.mono}`; x.fillText(new Date().toDateString().toUpperCase() + '   ·   LATE EDITION   ·   NO. ' + (100 + P.i), 60, 250);
      if (P.art && P.art.ok) { const im = P.art.get('dots', [deep], { full: true }); x.drawImage(im, 60, 820, 640, 560); x.strokeStyle = C(deep); x.lineWidth = 3; x.strokeRect(60, 820, 640, 560); }
      x.fillStyle = C(deep, 0.55);
      for (let col = 0; col < 2; col++) for (let i = 0; i < 26; i++) x.fillRect(col ? 740 : 60, (col ? 820 : 1400) + i * 22, col ? 400 : 640, 9);
      PU.rough(c, 0.12);
      const rot = R.r(-0.1, 0.1);
      const PH = 1.02;
      const pg = L(c, P, { h: PH, y: 0.14, x: R.r(-0.1, 0.1) * A, z: -0.06, rot, tx: R.r(-0.35, -0.2), paper: 0.6, in: arrive(P.t0, { dy: -1.4, dtx: -0.8, d: 0.34, e: 'out5' }) });
      ly.push(pg);
      // the headline lands one word at a time, then a red bar under it
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: C(deep) }, PH * (W - 120) / Hh, 0.24);
      const hy = pg.y + PH * ((470 - Hh / 2) / Hh);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: pg.x + p.x * Math.cos(rot), y: hy + p.x * Math.sin(rot), w: p.w, h: p.h, z: -0.055, rot, tx: pg.tx, shadow: false, bias: 0.4, in: arrive(P.ws[i].t, { ds: 0.6, fade: 1, d: 0.12 }), hit: [P.ws[i].t] })));
      ly.push(L(PU.solid([200, 20, 30]), P, { w: PH * (W - 160) / Hh, h: 0.02, x: pg.x, y: hy + 0.16, z: -0.055, rot, tx: pg.tx, shadow: false, bias: 0.4, rev: { t: P.ws[P.ws.length - 1].t + 0.1, d: 0.25, m: 1, e: 'out5' } }));
      const sub = subject(P, { h: 1.0, x: R.sgn() * A * 0.34, z: 0.14, border: true, in: arrive(P.t0 + 0.2, { dy: 0.4, d: 0.3, e: 'out5' }) });
      if (sub && R.ch(0.7)) ly.push(sub);
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- every letter a block that flips up into place
  T.flip = {
    w: 1.1, fits: (P) => clean(P.text).replace(/\s/g, '').length <= 12 && P.ws.length <= 3,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { kind: 'dots', h: 1.1, x: R.sgn() * A * 0.3, z: -0.4, shadow: false, a: 0.6 });
      if (sub) ly.push(sub);
      const chars = [];
      P.ws.forEach((w) => { const s = up(clean(w.raw)); const sp = Math.max(0.15, Math.min(0.6, (w.dur || 0.3) * 0.9)); [...s].forEach((ch, i) => chars.push({ ch, t: w.t + (i / Math.max(1, s.length)) * sp, gap: i === 0 && chars.length > 0 })); });
      const n = chars.length + chars.filter((c) => c.gap).length * 0.4;
      const slot = Math.min(0.26, (A * 0.9) / n);
      const tiles = [[S.paper, S.on(S.paper)], [S.a, S.on(S.a)], [deep, [246, 244, 238]]];
      let X = -(n * slot) / 2 + slot / 2;
      const style = R.i(0, 2);
      chars.forEach((c, i) => {
        if (c.gap) X += slot * 0.4;
        const [bg, fg] = style === 2 ? tiles[i % 3] : tiles[style];
        const S2 = 300, t = PU.cv(S2, S2 * 1.3), x = t.getContext('2d');
        x.fillStyle = C(bg); x.beginPath(); x.roundRect(4, 4, S2 - 8, S2 * 1.3 - 8, 26); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(4, S2 * 0.65 - 2, S2 - 8, 4);
        const g = PU.fit(c.ch, { f: F.cond, fill: C(fg) }, S2 * 0.8, S2 * 1.05);
        x.drawImage(g, (S2 - g.width) / 2, (S2 * 1.3 - g.height) / 2);
        ly.push(L(PU.rough(t, 0.08), P, { x: X, y: 0, h: slot * 1.25, z: 0.03, ext: { d: 0.035, n: 10 }, gloss: 0.3, sg: 0.05, ay: 1, in: { t: c.t - 0.05, d: 0.32, dtx: -1.57, e: 'back', fade: 1 }, hit: [c.t + 0.2] }));
        ly[ly.length - 1].y = slot * 0.62;
        X += slot;
      });
      deco(P, ly, 2);
      return { layers: ly, cam: { tilt: true } };
    },
  };

  // ---------------------------------------------------------------- misregistered print: three inks drift in and lock
  T.misreg = {
    w: 1, fits: (P) => P.text.length <= 18,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { kind: 'tone', h: 1.05, x: R.sgn() * A * 0.28, z: -0.25 });
      if (sub && R.ch(0.6)) ly.push(sub);
      const s = up(txt(P));
      const fam = R.pick([F.cond, F.black, F.grot]);
      const inks = [S.b, S.a, S.dark ? S.ink : deep];
      const tl = P.ws[0].t, lock = P.ws[P.ws.length - 1].t + 0.05;
      inks.forEach((col, i) => {
        const c = PU.fit(s, { f: fam, wt: 900, fill: C(col), rough: 0.3 }, A * 0.86 * P.HPX, 0.42 * P.HPX);
        const off = [[-0.05, 0.035], [0.045, -0.03], [0, 0]][i];
        const fin = [[-0.006, 0.004], [0.005, -0.003], [0, 0]][i];
        ly.push(L(c, P, { x: fin[0], y: fin[1], z: 0.02 + i * 0.03, shadow: i === 2, in: { t: tl - 0.08 + i * 0.05, d: Math.max(0.3, lock - tl + 0.15), dx: off[0] * 3, dy: off[1] * 3, dz: (i - 1) * 0.5, e: 'out5', fade: 1 }, hit: i === 2 ? [lock] : null }));
      });
      ly.push(L(PU.reg(160, S.ink), P, { x: -A / 2 + 0.12, y: 0.36, z: 0.1, shadow: false, in: arrive(P.t0, { fade: 1, d: 0.2 }), v: { r: 0.2 } }));
      ly.push(L(PU.swatch(420, 50, [S.b, S.a, deep, S.paper]), P, { x: A / 2 - 0.2, y: 0.42, z: 0.1, shadow: false, in: arrive(P.t0 + 0.1, { fade: 1, d: 0.2 }) }));
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a tunnel of frames going back into the dark
  T.tunnel = {
    w: 0.9, fits: (P) => P.text.length <= 16,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const n = 9, s = up(txt(P));
      for (let i = n; i >= 1; i--) {
        const col = i % 2 ? S.a : S.ink;
        const f = PU.frameRect(1600, 900, col, 14);
        ly.push(L(f, P, { w: A * 0.9, h: 0.9, z: -i * 0.32, rot: (i % 2 ? 1 : -1) * 0.02 * i, a: 1 - i / (n + 3), shadow: false, in: arrive(P.t0 + (n - i) * 0.025, { dz: -2.5, d: 0.4, e: 'out5', fade: 1 }), v: { r: (i % 2 ? 1 : -1) * 0.04 } }));
        if (i % 3 === 0) { const m = PU.txt(s, { f: F.mono, wt: 700, px: 34, fill: C(col) }); ly.push(L(m, P, { x: -A * 0.42, ax: 0, y: -0.42, z: -i * 0.32, a: 0.8, shadow: false, in: arrive(P.t0 + (n - i) * 0.025, { dz: -2.5, d: 0.4, e: 'out5', fade: 1 }) })); }
      }
      const parts = line(P, P.ws.map((w) => up(clean(w.raw))), { f: F.cond, fill: C(S.ink), rough: 0.25 }, A * 0.72, 0.42);
      parts.forEach((p, i) => ly.push(L(p.c, P, { x: p.x, w: p.w, h: p.h, z: 0.06, ext: { d: 0.06 }, in: arrive(P.ws[i].t, { dz: -2, fade: 1, d: 0.22, e: 'out5' }), hit: [P.ws[i].t] })));
      return { layers: ly, cam: { tilt: true } };
    },
  };

  // ---------------------------------------------------------------- a sticker bomb
  T.stickers = {
    w: 1, fits: (P) => P.ws.length <= 5,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const sub = subject(P, { h: 1.0, x: R.r(-0.2, 0.2) * A, z: -0.1, border: true, in: arrive(P.t0, { dy: 0.4, d: 0.3, e: 'out5' }) });
      if (sub) ly.push(sub);
      const shapes = ['circle', 'burst', 'pill', 'tag', 'rect'];
      const cols = [S.a, S.paper, S.b, deep, [255, 214, 0]];
      const make = (str, shape, col, big) => {
        const tc = S.on(col);
        const t = PU.fit(str, { f: big ? F.cond : R.pick([F.black, F.grot, F.cond]), wt: 900, fill: C(tc) }, big ? 900 : 520, big ? 320 : 180);
        const W = shape === 'circle' || shape === 'burst' ? Math.max(t.width, t.height) * 1.5 : t.width + t.height * 0.9, Hh = shape === 'circle' || shape === 'burst' ? W : t.height * 1.7;
        const c = shape === 'burst' ? PU.burst(W, col, 18, { inner: 0.8 }) : PU.cv(W + 16, Hh + 16);
        const x = c.getContext('2d');
        if (shape !== 'burst') {
          x.fillStyle = C([250, 250, 248]); x.beginPath();
          if (shape === 'circle') x.arc((W + 16) / 2, (Hh + 16) / 2, W / 2 + 7, 0, PI * 2); else x.roundRect(0, 0, W + 16, Hh + 16, shape === 'pill' ? Hh : 18);
          x.fill();
          x.fillStyle = C(col); x.beginPath();
          if (shape === 'circle') x.arc((W + 16) / 2, (Hh + 16) / 2, W / 2, 0, PI * 2); else x.roundRect(8, 8, W, Hh, shape === 'pill' ? Hh : 12);
          x.fill();
          if (shape === 'tag') { x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(8 + Hh * 0.35, 8 + Hh / 2, Hh * 0.12, 0, PI * 2); x.fill(); x.globalCompositeOperation = 'source-over'; }
        }
        x.drawImage(t, (c.width - t.width) / 2 + (shape === 'tag' ? Hh * 0.2 : 0), (c.height - t.height) / 2);
        return PU.rough(c, 0.1);
      };
      // small ones fill in across the card, the sung words land big
      const extras = [up(P.title || 'oley').slice(0, 12), 'NO. ' + (P.i + 1), up((P.artist || '').split(/\s+/)[0] || 'LIVE').slice(0, 10), '★', 'SIDE ' + (P.i % 2 ? 'B' : 'A'), '100%'];
      const dur = Math.max(0.6, (P.t1 || P.t0 + 1.5) - P.t0);
      const nEx = R.i(3, 5);
      for (let i = 0; i < nEx; i++) {
        const c = make(R.pick(extras), R.pick(shapes), R.pick(cols), false);
        const tt = P.t0 + 0.05 + (i / nEx) * Math.min(dur * 0.7, 1.2);
        ly.push(L(c, P, { h: R.r(0.1, 0.16), x: R.r(-0.45, 0.45) * A, y: R.r(-0.38, 0.38), z: 0.02 + i * 0.012, rot: R.r(-0.5, 0.5), gloss: 0.5, sg: 0.03, in: arrive(tt, { ds: 0.9, dr: R.r(-0.6, 0.6), d: 0.14, e: 'back', fade: 1 }) }));
      }
      P.ws.forEach((w, i) => {
        const c = make(up(clean(w.raw)), i === P.key ? 'burst' : R.pick(['pill', 'rect', 'circle', 'tag']), i === P.key ? S.a : R.pick([S.paper, S.b, deep]), true);
        const h = i === P.key ? 0.36 : 0.22;
        ly.push(L(c, P, { h, x: (i - (P.ws.length - 1) / 2) * A * 0.2 + R.r(-0.04, 0.04), y: R.r(-0.12, 0.12), z: 0.1 + i * 0.02, rot: R.r(-0.18, 0.18), gloss: 0.55, sg: 0.04, ext: { d: 0.012, n: 6 }, in: arrive(w.t, { ds: 1.1, dr: R.r(-0.8, 0.8), d: 0.15, e: 'back', fade: 1 }), hit: [w.t] }));
      });
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a Swiss grid poster
  T.swiss = {
    w: 1, fits: (P) => P.ws.length >= 1 && P.ws.length <= 4,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const cols = 6, cw = A / cols, rows = 4, rh = 1 / rows;
      const used = new Set();
      const blocks = R.i(4, 6);
      for (let i = 0; i < blocks; i++) {
        let c, r, k = 0;
        do { c = R.i(0, cols - 1); r = R.i(0, rows - 1); k++; } while (used.has(c + ',' + r) && k < 20);
        used.add(c + ',' + r);
        const w = R.i(1, 2), h = R.i(1, 2);
        const col = R.pick([S.a, S.b, S.ink, S.paper]);
        ly.push(L(PU.solid(col), P, { w: cw * w * 0.98, h: rh * h * 0.98, x: -A / 2 + (c + w / 2) * cw, y: -0.5 + (r + h / 2) * rh, z: -0.08 - R.r(0, 0.12), shadow: true, sg: 0.04, rev: { t: P.t0 + i * 0.05, d: 0.22, m: R.pick([1, 2, 3, 5]), e: 'out5' } }));
      }
      for (let i = 1; i < cols; i++) ly.push(L(PU.solid(S.ink), P, { w: 0.0025, h: 1.1, x: -A / 2 + i * cw, z: -0.02, a: 0.35, shadow: false, rev: { t: P.t0, d: 0.3, m: 3, e: 'out5' } }));
      for (let i = 1; i < rows; i++) ly.push(L(PU.solid(S.ink), P, { w: A * 1.1, h: 0.0025, y: -0.5 + i * rh, z: -0.02, a: 0.35, shadow: false, rev: { t: P.t0, d: 0.3, m: 1, e: 'out5' } }));
      // the words, flush left in a tight grotesk, each in its own row
      const n = P.ws.length, rowH = Math.min(0.27, 0.78 / n);
      P.ws.forEach((w, i) => {
        const c = PU.fit(clean(w.raw).toLowerCase(), { f: F.grot, wt: 900, ls: -0.04, fill: C(i === P.key ? S.a : S.ink) }, A * 0.58 * P.HPX, rowH * 1.05 * P.HPX);
        ly.push(L(c, P, { x: -A / 2 + cw * 0.55, ax: 0, y: -0.5 + 0.13 + rowH * (i + 0.5), ay: 0.5, z: 0.06, ext: { d: 0.03 }, in: arrive(w.t, { dx: -0.2, dty: 0.9, fade: 1, d: 0.2 }), hit: [w.t] }));
      });
      const num = PU.txt(String(P.i + 1).padStart(2, '0'), { f: F.grot, wt: 900, px: 0.2 * P.HPX, fill: C(S.ink) });
      ly.push(L(num, P, { x: A / 2 - cw * 0.2, ax: 1, y: 0.5 - rh * 0.2, ay: 1, z: 0.05, in: arrive(P.t0 + 0.15, { dy: 0.1, fade: 1, d: 0.2 }) }));
      ly.push(L(PU.micro([up(P.title || '').slice(0, 22), up(P.artist || '').slice(0, 22), 'Grid 6 × 4'], { px: 20, fill: C(S.ink, 0.85) }), P, { x: A / 2 - cw * 0.2, ax: 1, y: -0.46, ay: 0, z: 0.05, shadow: false, in: arrive(P.t0 + 0.1, { fade: 1, d: 0.2 }) }));
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a photocopy of the cover taped to the wall, the line typed on a strip
  T.xerox = {
    w: 1, fits: (P) => P.text.length <= 30 && P.art && P.art.ok,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const cp = P.art.card('duo', [deep, [238, 236, 230]], 1100, 1300, { zoom: R.r(1.05, 1.4), ox: R.r(-0.1, 0.1), oy: R.r(-0.1, 0.1) });
      PU.rough(cp, 0.45);
      const cx = cp.getContext('2d');
      cx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 6; i++) cx.fillRect(0, Math.random() * 1300, 1100, 1 + Math.random() * 3);
      const rot = R.r(-0.08, 0.08), x0 = R.sgn() * A * R.r(0.08, 0.18);
      ly.push(L(cp, P, { h: 0.95, x: x0, y: 0.01, z: -0.08, rot, paper: 0.5, tx: R.r(-0.1, 0.1), in: arrive(P.t0, { dy: 1.2, dr: 0.2, d: 0.3, e: 'out5' }) }));
      for (const [dx, dy] of [[-0.36, -0.44], [0.36, -0.44], [-0.36, 0.44], [0.36, 0.44]]) ly.push(L(PU.tape(240, 64), P, { h: 0.06, x: x0 + dx * 0.95 * (1100 / 1300), y: dy * 0.98, z: -0.07, rot: rot + (dx * dy > 0 ? 0.7 : -0.7), sg: 0.01, in: arrive(P.t0 + 0.22, { ds: 0.3, fade: 1, d: 0.1 }) }));
      // the strip of typed paper
      const s = txt(P);
      const t = PU.fit(s, { f: F.type, wt: 700, fill: C(deep) }, A * 0.8 * P.HPX, 0.09 * P.HPX);
      const st = PU.rect(t.width + 80, t.height + 50, [244, 241, 232], { torn: 0.4 });
      PU.rough(st, 0.05);
      ly.push(L(st, P, { x: -x0 * 0.4, y: R.r(0.12, 0.28), z: 0.08, rot: R.r(-0.06, 0.06), sg: 0.05, in: arrive(P.ws[0].t - 0.15, { dx: -0.8, d: 0.2, e: 'out5' }) }));
      ly.push(L(t, P, { x: -x0 * 0.4, y: ly[ly.length - 1].y, z: 0.082, rot: ly[ly.length - 1].rot, shadow: false, bias: 0.3, rev: { t: P.ws[0].t - 0.03, d: span(P), m: 1, e: 'step' + Math.max(3, s.length), soft: 0.002 } }));
      ly.push(L(PU.txt('COPY ' + (P.i + 1) + '/50', { f: F.stencil, px: 60, fill: C([200, 30, 30], 0.85), rough: 0.5 }), P, { x: x0 + 0.2, y: -0.36, z: -0.06, rot: -0.2, shadow: false, in: arrive(P.t0 + 0.3, { ds: 0.5, fade: 1, d: 0.1 }) }));
      return { layers: ly };
    },
  };

  // ---------------------------------------------------------------- a wall of halftone dots, the word knocked out of it
  T.halftone = {
    w: 0.9, fits: (P) => P.text.length <= 14 && P.art && P.art.ok,
    make(P) {
      const { S, R, A } = P;
      const ly = [plate(P)];
      const dots = P.art.get('dots', [S.dark ? S.a : S.ink], { full: true });
      ly.push(L(dots, P, { w: A * 1.25, h: A * 1.25, z: -0.15, shadow: false, v: { s: 0.04, r: R.r(-0.02, 0.02) }, in: arrive(P.t0, { ds: 0.25, fade: 1, d: 0.3, e: 'out5' }) }));
      const s = up(txt(P));
      const knock = PU.fit(s, { f: F.cond, fill: C(S.bg), st: C(S.bg), sw: 10 }, A * 0.95 * P.HPX, 0.6 * P.HPX);
      const outl = PU.fit(s, { f: F.cond, fill: null, ol: 5, oc: C(S.dark ? S.ink : S.a) }, A * 0.95 * P.HPX, 0.6 * P.HPX);
      const w0 = P.ws[0];
      ly.push(L(knock, P, { z: 0.02, sg: 0.06, rev: { t: w0.t - 0.04, d: span(P), m: 1, e: 'out3', soft: 0.02 } }));
      ly.push(L(outl, P, { x: 0.02, y: 0.02, z: 0.05, shadow: false, rev: { t: w0.t + 0.04, d: span(P), m: 1, e: 'out3', soft: 0.02 }, hit: hits(P) }));
      deco(P, ly, 2);
      return { layers: ly };
    },
  };
})();
