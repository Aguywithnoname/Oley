/* Oley · Editlyric 3D shots, part 2: the TV, the neon sign, the typewriter, paper, the book,
   the receipt printer, the cork board, the fogged window, the slow moves between verses, and
   what every object shows before the song gets to it. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, S = O.Surf, F = S.FAM;
  const E3 = O.E3;
  const PI = Math.PI;
  const rgb = E3.rgb, Block = E3.Block, fits = E3.fits, lineStr = E3.lineStr, add = E3.add;
  const sstep = (a, b, x) => { const k = U.sat((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const str = (w) => w.raw || w.bare || '';
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ================================================================ the TV (1600 x 900)
  const TW = 1600, TH = 900;
  const tvp = (D) => D.room.props.tv.page;
  const tv = (o) => add(Object.assign({ prop: 'tv', surface: 'wall' }, o));
  const kenBurns = (x, D, w, h, t, sh, z) => {
    const p = U.prog(sh.s - 1, sh.e + 1, t);
    if (D.ctx.artImg) S.img(x, D.ctx.artImg, 0, 0, w, h, 0, { zoom: (z || 1.15) + p * 0.12, ox: (p - 0.5) * 0.4, oy: 0.1 });
    else { x.fillStyle = rgb(D.ctx.palette.dark); x.fillRect(0, 0, w, h); }
  };

  tv({
    id: 'tv.news', w: 1, kw: /\b(news|world|everybody|they|people|tonight|now|breaking|break|fire|war|today)\b/i, fits: fits(11, 70),
    make(D, L, R) {
      const pg = tvp(D), prev = E3.prevLines(D, L, 4);
      const blk = new Block(pg.x, L.words, { fam: F.heavy, wt: 800, max: 70, min: 40, maxW: 1180, maxH: 160, X: 230, Y: 628, W: TW, H: TH, upper: true, lh: 1.04, maxLines: 2 });
      const red = R() < 0.5 ? '#d7141a' : rgb(U.vivid(D.ctx.palette.vivid, 0.8, 0.85));
      const tick = prev.map(lineStr).join('   •   ').toUpperCase() || ((D.track && D.track.title) || 'LIVE').toUpperCase();
      const sh = {
        zoom: 0.92, look: 0.35, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          kenBurns(x, D, w, h, t, sh, 1.25);
          const g = x.createLinearGradient(0, h * 0.45, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
          x.fillStyle = g; x.fillRect(0, 0, w, h);
          const k = U.e('outCubic', U.prog(sh.s, sh.s + 0.4, t));
          const bh = Math.max(110, blk.h + 40);
          x.fillStyle = 'rgba(255,255,255,0.96)'; x.fillRect(200, 612, (w - 380) * k, bh);
          x.fillStyle = red; x.fillRect(200, 560, 270 * k, 52);
          x.fillStyle = '#fff'; x.font = S.font(800, 34, F.heavy); x.textAlign = 'left'; x.textBaseline = 'middle';
          if (k > 0.6) x.fillText('BREAKING', 218, 588);
          x.fillStyle = '#0d1b3e'; x.fillRect(470, 560, 200 * k, 52);
          x.fillStyle = '#fff'; x.font = S.font(600, 30); if (k > 0.8) x.fillText(E3.clockStr(), 492, 588);
          blk.draw(x, t, { fill: '#0d1b3e', rise: 0 });
          // the ticker
          x.fillStyle = '#0d1b3e'; x.fillRect(0, 822, w, 64);
          x.fillStyle = red; x.fillRect(0, 822, 180, 64);
          x.fillStyle = '#fff'; x.font = S.font(800, 30, F.heavy); x.textAlign = 'center'; x.fillText('LIVE', 90, 855);
          x.save(); x.beginPath(); x.rect(180, 822, w - 180, 64); x.clip();
          x.font = S.font(600, 30); x.textAlign = 'left';
          const tw2 = x.measureText(tick + '   •   ').width;
          const off = (t * 140) % tw2;
          for (let X = 200 - off; X < w; X += tw2) x.fillText(tick + '   •   ', X, 855);
          x.restore();
          // channel bug
          x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = S.font(800, 36, F.heavy); x.textAlign = 'right'; x.fillText('OLEY 24', w - 60, 70);
          x.fillStyle = red; x.beginPath(); x.arc(w - 250, 70, 9, 0, PI * 2); x.fill();
        }),
      };
      return sh;
    },
  });

  tv({
    id: 'tv.film', w: 1.1, kw: /\b(movie|film|scene|dream|remember|story|eyes|look|watch|see)\b/i, fits: fits(16, 96),
    make(D, L, R) {
      const pg = tvp(D);
      const yellow = R() < 0.35;
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 600, max: 54, min: 38, maxW: 1240, maxH: 140, X: 180, Y: 660, W: TW, H: TH, align: 'center', lh: 1.2, maxLines: 2, valign: 'bottom' });
      const sh = {
        zoom: 0.9, look: 0.3, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          kenBurns(x, D, w, h, t, sh, 1.3);
          x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 0, w, h);
          x.fillStyle = '#000'; x.fillRect(0, 0, w, 96); x.fillRect(0, h - 96, w, 96);
          blk.draw(x, t, { fill: yellow ? '#ffe14a' : '#fff', stroke: 7, strokeStyle: 'rgba(0,0,0,0.85)', rise: 0, dur: 0.08 });
        }),
      };
      return sh;
    },
  });

  // a departure board, one word per row, the letters flapping into place
  tv({
    id: 'tv.board', w: 0.9, kw: /\b(leave|leaving|gone|go|fly|flight|away|home|train|plane|somewhere|anywhere|destination|far)\b/i,
    fits: (L) => L.words.length >= 2 && L.words.length <= 7 && L.words.every((w) => str(w).length <= 12),
    make(D, L, R) {
      const pg = tvp(D);
      const amber = R() < 0.6;
      const col = amber ? '#ffb000' : '#f2f2f2';
      const gates = L.words.map((w, i) => String.fromCharCode(65 + ((i * 7 + 3) % 8)) + (1 + ((i * 13 + 5) % 30)));
      const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const rowY = (i) => 236 + i * 88;
      const sh = {
        zoom: 0.9, look: 0.55, fill: 0.92,
        focus: (t) => {
          let k = 0; L.words.forEach((w, i) => { if (t >= w.t) k = i; });
          return { u: 0.42, v: (rowY(k) + 30) / TH };
        },
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#060606'; x.fillRect(0, 0, w, h);
          x.fillStyle = col; x.font = S.font(800, 46, F.heavy); x.textAlign = 'left'; x.textBaseline = 'middle';
          x.fillText('DEPARTURES', 80, 90);
          x.textAlign = 'right'; x.font = S.font(600, 40, F.mono); x.fillText(E3.clockStr(), w - 80, 90);
          x.fillStyle = '#555'; x.font = S.font(700, 24, F.sans); x.textAlign = 'left';
          ['TIME', 'DESTINATION', 'GATE', 'REMARKS'].forEach((s, i) => x.fillText(s, [80, 290, 1030, 1200][i], 170));
          const cw = 44, chh = 70;
          const tile = (X, Y, ch, on) => {
            S.fillRR(x, X, Y, cw - 4, chh, 6, '#161616');
            x.fillStyle = '#000'; x.fillRect(X, Y + chh / 2 - 1, cw - 4, 2);
            if (ch && ch !== ' ') { x.fillStyle = on ? col : '#3a3a3a'; x.font = S.font(700, 46, F.mono); x.textAlign = 'center'; x.fillText(ch, X + (cw - 4) / 2, Y + chh / 2 + 2); }
          };
          const now = new Date();
          L.words.forEach((wd, i) => {
            const Y = rowY(i), s = str(wd).toUpperCase().replace(/[^A-Z0-9'&]/g, '');
            const tm = new Date(now.getTime() + (i + 1) * 5 * 60000);
            const ts = String(tm.getHours()).padStart(2, '0') + ':' + String(tm.getMinutes()).padStart(2, '0');
            const on = t >= wd.t - 0.35;
            for (let c = 0; c < 5; c++) tile(80 + c * cw, Y, on ? ts[c] : '', on);
            for (let c = 0; c < 15; c++) {
              const settle = wd.t + c * 0.03;
              let ch = '';
              if (t >= settle) ch = s[c] || '';
              else if (t >= wd.t - 0.35) ch = AZ[Math.floor(hash(Math.floor(t * 30) + c * 7 + i * 31) * AZ.length)];
              tile(290 + c * cw, Y, ch, true);
            }
            for (let c = 0; c < 3; c++) tile(1030 + c * cw, Y, on ? gates[i][c] || '' : '', true);
            let rem = '';
            if (t >= wd.t) { const nx = L.words[i + 1]; rem = !nx || t < nx.t ? (Math.floor(t * 2) % 2 ? 'BOARDING' : '') : 'DEPARTED'; }
            else if (on) rem = 'ON TIME';
            x.fillStyle = rem === 'BOARDING' ? '#3ddc84' : rem === 'DEPARTED' ? '#777' : col;
            x.font = S.font(700, 34, F.mono); x.textAlign = 'left'; x.fillText(rem, 1200, Y + chh / 2 + 2);
          });
        }),
      };
      return sh;
    },
  });

  tv({
    id: 'tv.karaoke', w: 0.9, kw: /\b(sing|song|music|dance|loud|radio|tune|melody|chorus)\b/i, fits: fits(14, 80),
    make(D, L, R) {
      const pg = tvp(D);
      const P = D.ctx.palette, c = rgb(U.vivid(P.vivid, 0.85, 1));
      const blk = new Block(pg.x, L.words, { fam: F.heavy, wt: 800, max: 96, min: 54, maxW: 1360, maxH: 320, X: 120, Y: 280, W: TW, H: TH, align: 'center', lh: 1.2, maxLines: 3, valign: 'middle' });
      const sh = {
        zoom: 0.9, look: 0.4, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
          x.font = blk.font; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
          for (const it of blk.items) {
            x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,0.75)'; x.lineJoin = 'round';
            x.strokeText(it.s, it.x, it.y);
            x.fillStyle = '#fff'; x.fillText(it.s, it.x, it.y);
            const p = U.prog(it.w.t, it.w.t + Math.max(0.12, it.w.dur || 0.3), t);
            if (p > 0) { x.save(); x.beginPath(); x.rect(it.x - 6, it.y - blk.px, (it.wd + 12) * p, blk.px * 1.4); x.clip(); x.fillStyle = c; x.fillText(it.s, it.x, it.y); x.restore(); }
          }
          // count-in dots
          const t0 = L.words[0].t;
          for (let i = 0; i < 4; i++) { const on = t < t0 && t > t0 - (4 - i) * 0.25; x.fillStyle = on ? c : 'rgba(255,255,255,0.15)'; x.beginPath(); x.arc(w / 2 - 90 + i * 60, 200, 14, 0, PI * 2); x.fill(); }
        }),
      };
      return sh;
    },
  });

  // ================================================================ the neon sign (2048 x 560, see-through)
  const NEON = [[255, 46, 136], [40, 220, 255], [255, 170, 40], [120, 255, 110], [180, 100, 255], [255, 70, 70]];
  E3.neonPaint = function (x, w, h, blk, lit, col) {
    x.clearRect(0, 0, w, h);
    x.font = blk.font; x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.lineJoin = 'round'; x.lineCap = 'round';
    for (const it of blk.items) {
      const k = lit(it);
      // the glass tube, dark when off
      x.lineWidth = 20; x.strokeStyle = 'rgba(28,24,30,0.95)'; x.strokeText(it.s, it.x, it.y);
      x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,0.08)'; x.strokeText(it.s, it.x - 2, it.y - 3);
      if (k <= 0.01) continue;
      x.globalAlpha = k;
      x.lineWidth = 18; x.strokeStyle = rgb(col); x.strokeText(it.s, it.x, it.y);
      x.lineWidth = 7; x.strokeStyle = rgb(U.mix(col, [255, 255, 255], 0.75)); x.strokeText(it.s, it.x, it.y);
      x.globalAlpha = 1;
    }
  };
  const flick = (dt, seed) => {
    if (dt < 0) return 0;
    if (dt > 0.42) return 1;
    const q = Math.floor(dt * 40);
    return hash(q + seed * 17) < 0.25 + dt * 1.6 ? 1 : 0.08;
  };
  add({
    prop: 'neon', id: 'neon', surface: 'wall', w: 1.3, rigs: ['push', 'angle', 'slide', 'crane'],
    kw: /\b(light|lights|night|neon|glow|bright|shine|city|fire|burn|electric|love|heart|open)\b/i, fits: fits(5, 26),
    make(D, L, R) {
      const N = D.room.props.neon, pg = N.page;
      const fam = R.pick(["'Segoe Script', 'Brush Script MT', cursive", F.round, "'Bahnschrift', 'Oley Sans', sans-serif", F.hand]);
      const col = R() < 0.45 ? U.vivid(D.ctx.palette.vivid, 0.85, 1) : R.pick(NEON);
      const blk = new Block(pg.x, L.words, { fam, wt: 500, max: 230, min: 90, maxW: 1800, maxH: 470, X: 124, Y: 40, W: 2048, H: 560, align: 'center', lh: 1.02, maxLines: 2, valign: 'middle', lower: R() < 0.5 });
      const lit = (t) => (it) => flick(t - it.w.t + 0.02, it.w.i + 3);
      const sh = {
        zoom: 1.15, look: 0.35, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => E3.neonPaint(x, w, h, blk, lit(t), col)),
        set3: (t, A) => {
          let on = 0; for (const it of blk.items) on += lit(t)(it);
          on /= Math.max(1, blk.items.length);
          const lc = O.lin(col), m = Math.max(...lc);
          N.light.color = [lc[0] / m, lc[1] / m, lc[2] / m];
          N.light.intensity = 0.62 * on * (1 + (A ? A.pulse * 0.12 : 0));
          N.driven = true;
        },
      };
      return sh;
    },
  });

  // ================================================================ the typewriter
  add({
    prop: 'typewriter', id: 'tw.type', surface: 'wall', w: 1.4, rigs: ['push', 'angle', 'crane'],
    kw: /\b(write|wrote|letter|words|type|story|paper|dear|sign|name)\b/i, fits: fits(22, 120),
    make(D, L, R) {
      const room = D.room, tw = room.tw, pg = tw.paper;
      const PW = 1240, PH = 1500, margin = 150, lh = 78, strikeY = PH * 0.84;
      const font = "400 60px 'Courier New', 'Oley Mono', monospace";
      pg.x.font = font;
      const adv = pg.x.measureText('M').width;
      const maxC = Math.floor((PW - margin * 2) / adv);
      // every character with the time its key is struck
      const chars = [];
      let row = 0, col = 0;
      L.words.forEach((w) => {
        const s = str(w);
        if (col && col + 1 + s.length > maxC) { row++; col = 0; }
        else if (col) { chars.push({ ch: ' ', t: w.t - 0.03, row, col }); col++; }
        const span = Math.min(Math.max(0.06, (w.dur || 0.3) * 0.8), 0.07 * s.length);
        for (let j = 0; j < s.length; j++) { chars.push({ ch: s[j], t: w.t + (j / Math.max(1, s.length)) * span, row, col, seed: hash(chars.length + w.i * 13) }); col++; }
      });
      const rows = row + 1;
      const prev = E3.prevLines(D, L, 4).map((pl) => lineStr(pl));
      const typedAt = (t) => { let n = 0; while (n < chars.length && chars[n].t <= t) n++; return n; };
      // the paper advances a line at the start of each new row
      const rowStart = []; chars.forEach((c) => { if (rowStart[c.row] == null) rowStart[c.row] = c.t; });
      const scroll = (t) => { let s = 0; for (let r = 1; r < rows; r++) s += sstep(rowStart[r] - 0.16, rowStart[r] - 0.02, t); return s; };
      const carX = (t) => {
        const n = typedAt(t);
        if (!n) return -((margin - PW / 2) / PW) * 0.215;
        const c = chars[n - 1];
        const nx = chars[n];
        let colF = c.col + sstep(c.t, c.t + 0.035, t);
        if (nx && nx.row !== c.row) colF = U.lerp(colF, 0, sstep(nx.t - 0.2, nx.t - 0.05, t));
        return U.clamp(-((margin + colF * adv - PW / 2) / PW) * 0.215, -0.12, 0.12);
      };
      const paperBase = E3.cached('twpaper', PW, PH, (x, w, h) => {
        x.fillStyle = '#f3efe4'; x.fillRect(0, 0, w, h);
        const r = E3.rng(7);
        for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(120,100,70,${r() * 0.05})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
      });
      const sh = {
        zoom: 0.5, look: 1, fill: 0.9, hand: 0.7,
        frame: () => { const Fm = room.frameOf(tw.sheet, 0.215, 0.26), cx = carX(sh._t || 0); Fm.c = [Fm.c[0] - Fm.r[0] * cx, Fm.c[1] - Fm.r[1] * cx, Fm.c[2] - Fm.r[2] * cx]; return Fm; },
        focus: () => ({ u: 0.5, v: (strikeY - 40) / PH }),
        paint: (t) => {
          const n = typedAt(t);
          pg.paint(sh.id + ':' + n + ':' + Math.round(scroll(t) * 20), (x, w, h) => {
            x.drawImage(paperBase, 0, 0);
            const sc = scroll(t);
            x.font = font; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
            // earlier lines, already typed, higher up the sheet
            prev.forEach((s, i) => {
              const y = strikeY - (prev.length - i + sc) * lh - 30;
              x.fillStyle = 'rgba(25,22,20,0.82)';
              x.fillText(s.length > maxC ? s.slice(0, maxC - 1) + '…' : s, margin, y);
            });
            for (let i = 0; i < n; i++) {
              const c = chars[i];
              if (c.ch === ' ') continue;
              const y = strikeY - (Math.round(sc) > c.row ? 0 : 0) - (sc - c.row) * lh + (c.seed - 0.5) * 3;
              x.fillStyle = `rgba(18,16,15,${0.78 + c.seed * 0.2})`;
              x.fillText(c.ch, margin + c.col * adv + (c.seed - 0.5) * 1.6, y);
            }
          });
        },
        set3: (t) => {
          sh._t = t;
          const n = typedAt(t), pressed = {};
          for (let i = Math.max(0, n - 4); i < n; i++) { const c = chars[i], q = t - c.t; if (q < 0.09) pressed[c.ch.toUpperCase()] = Math.max(pressed[c.ch.toUpperCase()] || 0, 1 - q / 0.09); }
          room.typewriterPose(carX(t), pressed);
        },
      };
      return sh;
    },
  });

  // ================================================================ paper on the desk (A4, 1240 x 1754)
  const AW = 1240, AH = 1754;
  const paperBase = (kind) => E3.cached('a4' + kind, AW, AH, (x, w, h) => {
    x.fillStyle = kind === 'ruled' ? '#f7f5ee' : '#f4f1e8'; x.fillRect(0, 0, w, h);
    const r = E3.rng(kind.length * 31);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(110,95,70,${r() * 0.045})`; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    if (kind === 'ruled') {
      x.strokeStyle = 'rgba(90,140,200,0.35)'; x.lineWidth = 2;
      for (let y = 260; y < h - 80; y += 74) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
      x.strokeStyle = 'rgba(220,70,70,0.45)'; x.beginPath(); x.moveTo(170, 0); x.lineTo(170, h); x.stroke();
      x.fillStyle = 'rgba(60,60,60,0.08)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(70, 300 + i * 560, 26, 0, PI * 2); x.fill(); }
    }
  });
  const paper = (o) => add(Object.assign({ prop: 'paper', surface: 'flat' }, o));
  const filler = (D, L, n) => { const pl = E3.prevLines(D, L, n).map(lineStr); return pl.length ? pl : ['', '']; };

  paper({
    id: 'pa.stamp', w: 1, kw: /\b(no|never|denied|stop|done|over|final|approved|yes|true|real|forever)\b/i, fits: fits(8, 46),
    make(D, L, R) {
      const pg = D.room.props.paper.page;
      const prev = filler(D, L, 5);
      const ink = R() < 0.7 ? [196, 30, 40] : [30, 70, 170];
      const tilt = R.r(-0.16, 0.06);
      const blk = new Block(pg.x, L.words, { fam: F.black, wt: 900, max: 170, min: 90, maxW: 900, maxH: 760, X: 170, Y: 700, W: AW, H: AH, align: 'center', upper: true, lh: 1.02, valign: 'middle' });
      const sh = {
        zoom: 0.62, look: 0.6, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(paperBase('memo'), 0, 0);
          x.fillStyle = '#222'; x.font = S.font(700, 46, F.type); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          x.fillText('MEMORANDUM', 150, 220);
          x.font = S.font(400, 34, F.type);
          x.fillText('TO:   you', 150, 300); x.fillText('RE:   ' + ((D.track && D.track.title) || 'tonight'), 150, 350);
          x.fillRect(150, 380, w - 300, 3);
          x.fillStyle = 'rgba(30,30,30,0.85)';
          let y = 450;
          for (const s of prev) { const ls = S.wrap(x, s.split(' '), w - 300, x.font); for (const ln of ls) { x.fillText(ln.items.map((q) => q.s).join(' '), 150, y); y += 50; } y += 10; }
          // each word lands like a rubber stamp
          x.save(); x.translate(w / 2, 1080); x.rotate(tilt); x.translate(-w / 2, -1080);
          x.font = blk.font;
          for (const it of blk.items) {
            const q = t - it.w.t + 0.03;
            if (q < 0) continue;
            const k = U.sat(q / 0.09), s = 1 + (1 - k) * 0.35;
            x.save(); x.translate(it.x + it.wd / 2, it.y - blk.px * 0.35); x.scale(s, s);
            x.globalAlpha = 0.86 * k;
            x.fillStyle = rgb(ink); x.textAlign = 'center'; x.fillText(it.s, 0, blk.px * 0.35);
            // worn ink
            x.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < 26; i++) { const r2 = hash(i + it.w.i * 40); x.globalAlpha = 0.35; x.fillRect((r2 - 0.5) * it.wd, (hash(i * 3 + it.w.i) - 0.7) * blk.px, 2 + r2 * 9, 2 + hash(i) * 6); }
            x.restore();
          }
          x.restore();
          // the stamp border around what's landed
          const done = blk.items.filter((it) => t >= it.w.t);
          if (done.length) {
            x.save(); x.translate(w / 2, 1080); x.rotate(tilt); x.translate(-w / 2, -1080);
            const y0 = Math.min(...done.map((it) => it.y - blk.px)) - 30, y1 = Math.max(...done.map((it) => it.y)) + 40;
            x.globalAlpha = 0.8; x.strokeStyle = rgb(ink); x.lineWidth = 12; S.rr(x, 130, y0, w - 260, y1 - y0, 20); x.stroke();
            x.restore();
          }
        }),
      };
      return sh;
    },
  });

  paper({
    id: 'pa.hand', w: 1.1, kw: /\b(write|letter|dear|note|sign|name|love|heart|miss|remember|yours)\b/i, fits: fits(16, 90),
    make(D, L, R) {
      const pg = D.room.props.paper.page;
      const ink = R.pick(['#1b2f7a', '#1a1a1a', '#5a1020']);
      const blk = new Block(pg.x, L.words, { fam: F.hand, wt: 400, max: 96, min: 60, maxW: 940, maxH: 1150, X: 200, Y: 270, W: AW, H: AH, lh: 1.04 });
      // snap rows onto the ruled lines
      const lineOf = (y) => 260 + Math.round((y - 260) / 74) * 74;
      blk.items.forEach((it) => { it.y = lineOf(it.y + blk.lh * 0.1) - 14; });
      const sh = {
        zoom: 0.58, look: 0.85, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(paperBase('ruled'), 0, 0);
          x.font = blk.font; x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = ink;
          for (const it of blk.items) {
            const p = U.prog(it.w.t - 0.03, it.w.t - 0.03 + Math.min(0.5, Math.max(0.12, (it.w.dur || 0.3) * 0.9)), t);
            if (p <= 0) continue;
            x.save(); x.beginPath(); x.rect(it.x - 10, it.y - blk.px * 1.2, (it.wd + 20) * p, blk.px * 1.7); x.clip();
            x.globalAlpha = 0.92; x.fillText(it.s, it.x, it.y);
            x.restore();
            // the pen tip
            if (p < 1) { x.fillStyle = ink; x.beginPath(); x.arc(it.x + it.wd * p, it.y - blk.px * 0.3, 5, 0, PI * 2); x.fill(); }
          }
        }),
      };
      return sh;
    },
  });

  paper({
    id: 'pa.redact', w: 0.9, kw: /\b(secret|truth|lie|lies|hide|hidden|know|tell|nobody|never|confess)\b/i, fits: fits(14, 84),
    make(D, L, R) {
      const pg = D.room.props.paper.page;
      const prev = filler(D, L, 6);
      const blk = new Block(pg.x, L.words, { fam: F.type, wt: 700, max: 62, min: 42, maxW: 940, maxH: 420, X: 150, Y: 860, W: AW, H: AH, lh: 1.5 });
      const sh = {
        zoom: 0.55, look: 0.7, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(paperBase('memo'), 0, 0);
          x.save(); x.translate(w - 330, 210); x.rotate(-0.12); x.strokeStyle = 'rgba(190,30,30,0.75)'; x.lineWidth = 8; x.strokeRect(-150, -58, 300, 92);
          x.fillStyle = 'rgba(190,30,30,0.75)'; x.font = S.font(900, 52, F.black); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CLASSIFIED', 0, -12); x.restore();
          x.fillStyle = '#222'; x.font = S.font(700, 40, F.type); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          x.fillText('FILE NO. ' + (1000 + (L.i * 37) % 9000), 150, 220);
          x.font = S.font(400, 34, F.type); x.fillStyle = 'rgba(30,30,30,0.85)';
          let y = 330;
          prev.forEach((s, i) => {
            const ls = S.wrap(x, (s || 'and the rest was never written down').split(' '), w - 300, x.font);
            for (const ln of ls) {
              let X = 150;
              ln.items.forEach((q, j) => { if ((i + j) % 4 === 1) { x.fillStyle = '#111'; x.fillRect(X - 4, y - 30, q.w + 8, 40); } else { x.fillStyle = 'rgba(30,30,30,0.85)'; x.fillText(q.s, X, y); } X += q.w + x.measureText(' ').width; });
              y += 50;
            }
            y += 8;
          });
          // the line: black bars that lift off as the words are sung
          x.font = blk.font;
          for (const it of blk.items) {
            const p = U.prog(it.w.t - 0.04, it.w.t + 0.16, t);
            x.fillStyle = '#7a0f14'; x.globalAlpha = U.sat(p * 2); x.fillText(it.s, it.x, it.y); x.globalAlpha = 1;
            if (p < 1) { x.fillStyle = '#0c0c0c'; x.fillRect(it.x - 6 + it.wd * p, it.y - blk.px * 0.85, (it.wd + 12) * (1 - p), blk.px * 1.08); }
          }
        }),
      };
      return sh;
    },
  });

  // ================================================================ the book: a highlighter goes over the line
  add({
    prop: 'book', id: 'bk.hi', surface: 'flat', w: 1, kw: /\b(read|book|page|story|chapter|word|words|learn|know|lesson|line)\b/i, fits: fits(12, 70),
    make(D, L, R) {
      const pg = D.room.props.book.page;
      const BW = 1024, BH = 1440, font = S.font(400, 40, F.serif), lh = 62;
      const hi = R.pick(['rgba(255,226,40,0.55)', 'rgba(120,255,150,0.45)', 'rgba(255,120,200,0.45)']);
      // the page: earlier lyrics as prose, the line in the middle of it
      const pre = E3.prevLines(D, L, 6).map(lineStr).join('. ');
      const fill = 'and the night went on like it always does, slow and bright and nobody noticed when it changed';
      const before = (pre ? pre + '. ' : fill + '. ').split(' ').slice(-48);
      const after = 'and that was the part I kept, folded small, carried everywhere until the edges went soft'.split(' ');
      pg.x.font = font;
      const items = [...before.map((s) => ({ s })), ...L.words.map((w) => ({ s: str(w), w })), ...after.map((s) => ({ s }))];
      const lines = S.wrap(pg.x, items, BW - 220, font);
      const pos = [];
      let start = 0;
      lines.forEach((ln, i) => ln.items.forEach((p) => { if (p.it.w) pos.push({ w: p.it.w, x: 110 + p.x, y: 170 + i * lh, wd: p.w }); }));
      if (pos.length) start = Math.max(0, Math.floor((pos[0].y - 170) / lh) - 8);
      const shift = start * lh;
      pos.forEach((p) => { p.y -= shift; });
      const sh = {
        zoom: 0.55, look: 0.9, fill: 0.92,
        focus: (t) => { let k = 0; pos.forEach((p, i) => { if (t >= p.w.t) k = i; }); const p = pos[k]; return { u: (p.x + p.wd / 2) / BW, v: (p.y - 14) / BH }; },
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#f1ead9'; x.fillRect(0, 0, w, h);
          const g = x.createLinearGradient(0, 0, 90, 0); g.addColorStop(0, 'rgba(90,70,40,0.25)'); g.addColorStop(1, 'rgba(90,70,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 90, h);
          // highlight under the text
          for (const p of pos) {
            const k = U.prog(p.w.t - 0.05, p.w.t + Math.max(0.12, Math.min(0.45, p.w.dur || 0.3)), t);
            if (k <= 0) continue;
            x.fillStyle = hi;
            x.beginPath(); x.moveTo(p.x - 8, p.y - 34); x.lineTo(p.x - 8 + (p.wd + 16) * k, p.y - 37); x.lineTo(p.x - 8 + (p.wd + 16) * k, p.y + 12); x.lineTo(p.x - 8, p.y + 10); x.closePath(); x.fill();
          }
          x.fillStyle = '#2b241c'; x.font = font; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          lines.forEach((ln, i) => { const y = 170 + i * lh - shift; if (y < 120 || y > h - 120) return; ln.items.forEach((p) => x.fillText(p.s, 110 + p.x, y)); });
          x.fillStyle = '#8a7a60'; x.font = S.font(400, 30, F.serif); x.textAlign = 'center'; x.fillText(String(100 + (L.i * 7) % 300), w / 2, h - 60);
        }),
      };
      return sh;
    },
  });

  // ================================================================ the receipt printer
  add({
    prop: 'receipt', id: 'rc.print', surface: 'flat', w: 0.9, rigs: ['oblique', 'low', 'top'],
    kw: /\b(pay|paid|price|cost|money|buy|bought|cash|worth|spend|bill|owe|free|cheap|rich)\b/i, fits: (L) => L.words.length <= 9 && L.words.every((w) => str(w).length <= 14),
    make(D, L, R) {
      const Rc = D.room.props.receipt, pg = Rc.page;
      const PXM = 512 / 0.06, RW = 512, RH = 3072, rowH = 62, top = 40;
      const rows = [];
      const t0 = L.words[0].t - 0.6;
      const title = ((D.track && D.track.title) || 'OLEY').toUpperCase().slice(0, 18);
      rows.push({ t: t0, s: title, big: true, h: 90 }, { t: t0 + 0.08, s: new Date().toLocaleDateString() + '  ' + E3.clockStr(), h: 54 }, { t: t0 + 0.14, dash: true, h: 40 });
      let tot = 0;
      L.words.forEach((w, i) => { const pr = 0.99 + Math.floor(hash(w.i + L.i) * 9) + (i % 3); tot += pr; rows.push({ t: w.t - 0.02, s: '1 ' + str(w).toUpperCase(), price: pr.toFixed(2), h: rowH, w }); });
      const end = sh0(L);
      rows.push({ t: end, dash: true, h: 40 }, { t: end + 0.08, s: 'TOTAL', price: tot.toFixed(2), bold: true, h: 70 }, { t: end + 0.2, s: 'THANK YOU', center: true, h: 80 });
      let y = top; rows.forEach((r) => { r.y = y; y += r.h; });
      const feed = (t) => { let m = top; for (const r of rows) m += r.h * sstep(r.t, r.t + 0.1, t); return m; };
      const sh = {
        zoom: 0.42, look: 1, fill: 0.9, lastT: end + 0.3,
        focus: (t) => ({ u: 0.5, v: Math.max(0.03, (feed(t) - 50) / RH) }),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#f7f6f1'; x.fillRect(0, 0, w, h);
          x.fillStyle = '#1d1d1d'; x.textBaseline = 'alphabetic';
          for (const r of rows) {
            if (t < r.t) break;
            if (r.dash) { x.font = S.font(600, 30, F.mono); x.textAlign = 'left'; x.fillText('- - - - - - - - - - - - - - -', 28, r.y + 28); continue; }
            x.font = S.font(r.big || r.bold ? 800 : 600, r.big ? 56 : 32, F.mono);
            if (r.big || r.center) { x.textAlign = 'center'; x.fillText(r.s, w / 2, r.y + r.h - 22); continue; }
            x.textAlign = 'left'; x.fillText(r.s, 28, r.y + r.h - 20);
            if (r.price) { x.textAlign = 'right'; x.fillText(r.price, w - 28, r.y + r.h - 20); }
          }
        }),
        set3: (t) => D.room.receiptOut(Math.min(0.355, feed(t) / PXM + 0.004)),
      };
      return sh;
    },
  });
  function sh0(L) { const w = L.words[L.words.length - 1]; return w.t + Math.min(0.5, w.dur || 0.3) + 0.15; }

  // ================================================================ the cork board: sticky notes
  add({
    prop: 'cork', id: 'ck.notes', surface: 'wall', w: 1, rigs: ['push', 'angle', 'slide'],
    kw: /\b(remember|forget|don't|plan|list|todo|reminder|need|want|things|names?)\b/i, fits: fits(9, 60),
    make(D, L, R) {
      const C = D.room.props.cork, pg = C.page;
      const CW = 1480, CH = 1040;
      const cols = ['#ffe873', '#ff9ec7', '#9fe2ff', '#b6f29a', '#ffc27a'];
      // a few words per note
      const groups = [];
      L.words.forEach((w, i) => { const g = groups[groups.length - 1]; if (g && g.length < (L.words.length > 5 ? 2 : 1) && str(w).length < 9) g.push(w); else groups.push([w]); });
      const n = groups.length, gc = Math.min(4, Math.ceil(Math.sqrt(n * 1.6))), gr = Math.ceil(n / gc);
      const notes = groups.map((g, i) => {
        const cx = (i % gc + 0.5) / gc, cy = (Math.floor(i / gc) + 0.5) / gr;
        const size = Math.min(380, (CW - 120) / gc - 30, (CH - 120) / gr - 30);
        return { g, t: g[0].t, x: 60 + cx * (CW - 120) + R.r(-20, 20), y: 60 + cy * (CH - 120) + R.r(-16, 16), s: size, rot: R.r(-0.12, 0.12), c: R.pick(cols), text: g.map(str).join(' ') };
      });
      const sh = {
        zoom: 0.95, look: 0.55, fill: 0.92,
        focus: (t) => { let k = 0; notes.forEach((nt, i) => { if (t >= nt.t) k = i; }); return { u: notes[k].x / CW, v: notes[k].y / CH }; },
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          D.room.corkBase(x, w, h);
          for (const nt of notes) {
            const q = t - nt.t + 0.04;
            if (q < 0) continue;
            const k = U.e('outBack', U.sat(q / 0.22));
            x.save(); x.translate(nt.x, nt.y); x.rotate(nt.rot); x.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
            x.globalAlpha = U.sat(q / 0.08);
            S.shadow(x, 24, 10, 'rgba(0,0,0,0.35)');
            x.fillStyle = nt.c; x.fillRect(-nt.s / 2, -nt.s / 2, nt.s, nt.s);
            S.noShadow(x);
            const g = x.createLinearGradient(0, -nt.s / 2, 0, nt.s / 2); g.addColorStop(0, 'rgba(0,0,0,0.06)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-nt.s / 2, -nt.s / 2, nt.s, nt.s);
            x.fillStyle = '#1d1d1d'; x.textAlign = 'center'; x.textBaseline = 'middle';
            let px = nt.s * 0.3; x.font = S.font(400, px, F.hand);
            while (x.measureText(nt.text).width > nt.s * 0.84 && px > 20) { px *= 0.92; x.font = S.font(400, px, F.hand); }
            const ls = S.wrap(x, nt.text.split(' '), nt.s * 0.84, x.font);
            ls.forEach((ln, j) => x.fillText(ln.items.map((p) => p.s).join(' '), 0, (j - (ls.length - 1) / 2) * px * 1.1 + 8));
            // the pin
            x.fillStyle = '#c0161f'; x.beginPath(); x.arc(0, -nt.s / 2 + 26, 15, 0, PI * 2); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(-5, -nt.s / 2 + 21, 5, 0, PI * 2); x.fill();
            x.restore();
          }
        }),
      };
      return sh;
    },
  });

  // ================================================================ the window: written with a finger in the fog
  add({
    prop: 'window', id: 'wn.fog', surface: 'wall', w: 1.1, rigs: ['push', 'angle', 'crane'],
    kw: /\b(rain|cold|window|outside|breath|fog|glass|winter|cry|tears|alone|wait|waiting)\b/i, fits: fits(8, 44),
    make(D, L, R) {
      const room = D.room, pg = room.fogPage;
      const FW = 1024, FH = 1100;
      const blk = new Block(pg.x, L.words, { fam: F.hand, wt: 400, max: 190, min: 96, maxW: 860, maxH: 820, X: 82, Y: 140, W: FW, H: FH, align: 'center', lh: 1.0, valign: 'middle' });
      const fogBase = E3.cached('fog', FW, FH, (x, w, h) => {
        const r = E3.rng(3);
        x.fillStyle = 'rgba(214,222,232,0.72)'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { const a = r() * 0.12; x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 14, 0, PI * 2); x.fill(); }
      });
      const drips = blk.items.map((it, i) => ({ x: it.x + hash(i) * it.wd, len: 60 + hash(i + 9) * 160 }));
      const sh = {
        zoom: 0.8, look: 0.6, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.clearRect(0, 0, w, h);
          x.globalAlpha = U.sat((t - sh.s + 0.6) / 0.6);
          x.drawImage(fogBase, 0, 0);
          x.globalAlpha = 1;
          x.globalCompositeOperation = 'destination-out';
          x.font = blk.font; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.lineCap = 'round';
          blk.items.forEach((it, i) => {
            const p = U.prog(it.w.t - 0.03, it.w.t - 0.03 + Math.min(0.6, Math.max(0.15, (it.w.dur || 0.3) * 0.9)), t);
            if (p <= 0) return;
            x.save(); x.beginPath(); x.rect(it.x - 30, it.y - blk.px * 1.2, (it.wd + 60) * p, blk.px * 1.8); x.clip();
            x.lineWidth = blk.px * 0.09; x.strokeStyle = '#000'; x.strokeText(it.s, it.x, it.y); x.fillText(it.s, it.x, it.y);
            x.restore();
            // a drop runs down from the letters
            const d = drips[i], q = U.sat((t - it.w.t - 0.4) / 2.5);
            if (q > 0) { x.lineWidth = 7; x.beginPath(); x.moveTo(d.x, it.y); x.lineTo(d.x, it.y + d.len * q); x.stroke(); }
          });
          x.globalCompositeOperation = 'source-over';
        }),
      };
      return sh;
    },
  });

  // ================================================================ between verses: slow moves around the room
  const inter = (o) => E3.INTER.push(o);
  const D3 = () => O.Room.DESK;
  inter({
    prop: 'room', id: 'in.room', surface: 'wall', w: 1.2,
    make(D, L, R) {
      const s = R.sgn();
      return {
        frame: () => ({ c: [0.05, 1.12, -0.95], r: [1, 0, 0], u: [0, 1, 0], n: [0, 0, 1], w: 2.4, h: 1.35 }),
        zoom: 1, look: 0, hand: 0.6,
        rig: { a: [s * R.r(0.25, 0.45), -s * R.r(0.05, 0.25)], b: [R.r(0.02, 0.15), R.r(0.1, 0.22)], k: [1.02, 0.86], roll: [0, 0], fov: R.r(38, 46), fstop: R.r(3.2, 5) },
      };
    },
  });
  inter({
    prop: 'desk', id: 'in.desk', surface: 'flat', w: 1,
    make(D, L, R) {
      const s = R.sgn();
      return {
        frame: () => ({ c: [0.0, D3(), -0.82], r: [1, 0, 0], u: [0, 0, -1], n: [0, 1, 0], w: 1.7, h: 0.75 }),
        zoom: 0.8, look: 0, hand: 0.5,
        rig: { a: [s * R.r(0.05, 0.3), -s * R.r(0.05, 0.3)], b: [R.r(-0.75, -0.5), R.r(-0.45, -0.2)], k: [1.0, 0.82], roll: [s * 0.08, -s * 0.04], fov: R.r(34, 42), fstop: R.r(2.2, 3.2) },
      };
    },
  });
  inter({
    prop: 'art', id: 'in.art', surface: 'wall', w: 0.8,
    make(D, L, R) {
      return { zoom: 1.7, look: 0, hand: 0.5, rig: { a: [R.r(-0.3, 0.3), R.r(-0.15, 0.15)], b: [R.r(-0.25, -0.1), R.r(-0.05, 0.05)], k: [1.25, 0.9], roll: [0, 0], fov: R.r(30, 36), fstop: R.r(1.6, 2.4) } };
    },
  });
  inter({
    prop: 'window', id: 'in.window', surface: 'wall', w: 0.9,
    make(D, L, R) {
      return { zoom: 1.05, look: 0, hand: 0.6, rig: { a: [R.r(0.25, 0.45), R.r(0.05, 0.2)], b: [R.r(-0.1, 0.05), R.r(0.0, 0.12)], k: [1.05, 0.9], roll: [0, 0], fov: R.r(36, 44), fstop: R.r(2.0, 3.0) } };
    },
  });
  inter({
    prop: 'tv', id: 'in.tv', surface: 'wall', w: 0.9,
    make(D, L, R) {
      const sh = { zoom: 1.3, look: 0, hand: 0.6, paint: (t) => E3.nowPlaying(D, t), rig: { a: [R.r(-0.5, -0.25), R.r(-0.2, 0)], b: [R.r(-0.15, 0), R.r(-0.05, 0.08)], k: [1.1, 0.9], roll: [0, 0], fov: R.r(34, 42), fstop: R.r(2, 3) } };
      return sh;
    },
  });

  // the TV's "now playing" screen
  E3.nowPlaying = function (D, t) {
    const pg = tvp(D), tr = D.track || {};
    const dur = (D.ctx.tl && D.ctx.tl.duration) || 0;
    pg.paint('np:' + (tr.title || '') + ':' + Math.floor(t) + (D.ctx.artImg ? 1 : 0) + (D.ctx.palette ? D.ctx.palette.vividHex : ''), (x, w, h) => {
      x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
      if (D.ctx.artImg) { S.shadow(x, 50, 18, 'rgba(0,0,0,0.5)'); S.img(x, D.ctx.artImg, 140, 170, 560, 560, 26); S.noShadow(x); }
      x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      let ts = tr.title || 'Oley'; x.font = S.font(800, 76, F.display); while (x.measureText(ts).width > 760 && ts.length > 2) ts = ts.slice(0, -2) + '…';
      x.fillText(ts, 780, 420);
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = S.font(500, 46); x.fillText((tr.artist || '').slice(0, 30), 780, 490);
      const p = dur ? U.sat(t / dur) : 0;
      S.fillRR(x, 780, 600, 680, 10, 5, 'rgba(255,255,255,0.25)'); S.fillRR(x, 780, 600, 680 * p, 10, 5, '#fff');
      const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      x.font = S.font(500, 30); x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillText(fmt(Math.max(0, t)), 780, 650); x.textAlign = 'right'; if (dur) x.fillText('-' + fmt(Math.max(0, dur - t)), 1460, 650);
    });
  };

  // ================================================================ what everything shows before the song uses it
  E3.idle = function (D) {
    const room = D.room, P = room.props, tr = D.track || {};
    P.phone.page.paint('idle:' + E3.clockStr() + Math.random(), (x, w, h) => {
      x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      x.font = S.font(600, 48); x.fillText(E3.dateStr(), w / 2, 280);
      x.font = S.font(700, 250, F.display); x.fillText(E3.clockStr(), w / 2, 520);
      S.fillRR(x, w / 2 - 140, h - 38, 280, 12, 6, 'rgba(255,255,255,0.85)');
    });
    P.laptop.page.paint('idle' + Math.random(), (x, w, h) => {
      x.drawImage(E3.wallpaper(D, w, h, 'mid'), 0, 0);
      x.fillStyle = 'rgba(30,30,34,0.55)'; x.fillRect(0, 0, w, 40);
      x.fillStyle = '#fff'; x.font = S.font(600, 24); x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillText(E3.clockStr(), w - 24, 21);
      x.textAlign = 'center'; x.font = S.font(200, 190, F.display); x.textBaseline = 'alphabetic'; x.fillText(E3.clockStr(), w / 2, 470);
    });
    E3.nowPlaying(D, 0);
    // the neon shows the song's title until the song needs it
    const N = P.neon;
    const words = String(tr.title || 'oley').split(/\s+/).slice(0, 4).map((s, i) => ({ raw: s, bare: s, t: -1, i }));
    const blk = new Block(N.page.x, words, { fam: "'Segoe Script', 'Brush Script MT', cursive", wt: 500, max: 220, min: 90, maxW: 1800, maxH: 470, X: 124, Y: 40, W: 2048, H: 560, align: 'center', lh: 1.02, maxLines: 2, valign: 'middle', lower: true });
    const col = U.vivid(D.ctx.palette.vivid, 0.85, 1);
    N.page.paint('idle' + Math.random(), (x, w, h) => E3.neonPaint(x, w, h, blk, () => 1, col));
    N.driven = false;
    room.tw.paper.paint('idle' + Math.random(), (x, w, h) => { x.fillStyle = '#f3efe4'; x.fillRect(0, 0, w, h); });
    room.typewriterPose(0.08, null);
    P.paper.page.paint('idle' + Math.random(), (x, w, h) => {
      x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#222'; x.font = S.font(700, 46, F.type); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('MEMORANDUM', 150, 220);
      x.fillRect(150, 250, w - 300, 3);
      x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 16; i++) x.fillRect(150, 330 + i * 60, 600 + ((i * 97) % 300), 16);
    });
    P.book.page.paint('idle' + Math.random(), (x, w, h) => { x.fillStyle = '#f1ead9'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(40,32,24,0.6)'; for (let i = 0; i < 18; i++) x.fillRect(110, 140 + i * 62, 800 - (i % 6 === 5 ? 300 : 0), 14); });
    P.receipt.page.paint('idle', (x, w, h) => { x.fillStyle = '#f7f6f1'; x.fillRect(0, 0, w, h); });
    room.receiptOut(0.012);
    P.cork.page.paint('idle' + Math.random(), (x, w, h) => {
      room.corkBase(x, w, h);
      if (D.ctx.artImg) { x.save(); x.translate(380, 470); x.rotate(-0.06); S.shadow(x, 20, 8); x.fillStyle = '#fafafa'; x.fillRect(-180, -200, 360, 420); S.noShadow(x); S.img(x, D.ctx.artImg, -155, -175, 310, 310, 0); x.restore(); }
      x.save(); x.translate(1050, 380); x.rotate(0.08); S.shadow(x, 18, 8); x.fillStyle = '#ffe873'; x.fillRect(-150, -150, 300, 300); S.noShadow(x); x.restore();
    });
    room.fogPage.paint('idle', (x, w, h) => x.clearRect(0, 0, w, h));
  };
})();
