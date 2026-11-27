/* Oley · Pasteup collage scroll. For a run of lines, one long poster builds up instead of a new
   composition per phrase: each line is set as a type lockup (small lowercase lead-in, the key words
   huge and condensed, now and then an italic word), printed into coloured paper, and stays there while
   the next one prints below it. The camera eases down to follow, cut-outs and printed emoji slide in
   from the edges at different depths, and at the end it can pull back to show the whole sheet.
   Frame units as in the other layouts: 1 tall, A wide, y down. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, PU = O.PU, F = PU.FONT, C = PU.C, E = PU.E;
  const PI = Math.PI;
  const MC = PU.cv(8, 8).getContext('2d');
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const clean = (s) => PU.clean(String(s || ''));

  // how tall the capitals of a face are, per pixel of font size
  const capCache = {};
  function capOf(f, wt, it) {
    const k = f + wt + (it ? 'i' : '');
    if (capCache[k]) return capCache[k];
    MC.font = `${it ? 'italic ' : ''}${wt} 100px ${f}`;
    const m = MC.measureText('H');
    const v = m.actualBoundingBoxAscent ? m.actualBoundingBoxAscent / 100 : 0.72;
    return (capCache[k] = U.clamp(v, 0.5, 1));
  }
  // a fine dot screen knocked out of big ink, so it reads as printed rather than typed
  let SCR = null;
  function screenPat() {
    if (SCR) return SCR;
    const c = PU.cv(7, 7), x = c.getContext('2d'), g = x.createRadialGradient(3.5, 3.5, 0, 3.5, 3.5, 2.2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 7, 7);
    return (SCR = c);
  }
  function printed(c, k) {
    const x = c.getContext('2d');
    x.save(); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = k;
    x.fillStyle = x.createPattern(screenPat(), 'repeat'); x.fillRect(0, 0, c.width, c.height);
    x.restore();
    return PU.rough(c, 0.14);
  }
  // one word on its own canvas with a fixed baseline for its face and size, so mixed sizes line up
  function word(s, o, px) {
    const font = `${o.it ? 'italic ' : ''}${o.wt || 400} ${Math.round(px)}px ${o.f}`;
    MC.font = font;
    try { MC.letterSpacing = Math.round((o.ls || 0) * px) + 'px'; } catch (e) {}
    const m = MC.measureText(s);
    const asc = px * 1.02, dsc = px * 0.34, pad = Math.ceil(px * 0.06 + 3);
    const l = Math.max(0, m.actualBoundingBoxLeft || 0), r = Math.max(m.width, m.actualBoundingBoxRight || m.width);
    const c = PU.cv(l + r + pad * 2 + (o.it ? px * 0.12 : 0), asc + dsc + pad * 2), x = c.getContext('2d');
    x.font = font;
    try { x.letterSpacing = MC.letterSpacing; } catch (e) {}
    x.fillStyle = o.fill; x.fillText(s, pad + l, pad + asc);
    if (o.print) printed(c, o.print);
    return { c, base: pad + asc, pad, adv: m.width };
  }
  // ink that reads on a colour, from the scheme's own colours where it can
  function inksFor(bg, S, R) {
    const light = lum(S.paper) > 0.75 ? S.paper : [246, 240, 228], dark = lum(S.ink) < 0.3 ? S.ink : [20, 18, 22];
    const main = lum(bg) > 0.55 ? dark : light;
    const opts = [S.a, S.b, S.paper, [250, 214, 64], [252, 240, 220], dark].filter((c) => Math.abs(lum(c) - lum(bg)) > 0.32 && c !== main);
    const pop = opts.length && R.ch(0.45) ? R.pick(opts) : main;
    return { main, pop, dark, light };
  }
  PU.scrollBg = function (S, R, prev) {
    const sat = (c) => { const mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
    const cand = [S.a, S.b, S.bg].filter((c) => lum(c) > 0.12 && lum(c) < 0.8 && sat(c) > 0.3 && (!prev || c.join() !== prev.join()));
    if (cand.length) return R.pick(cand).slice();
    // fall back to a printed red, mustard, lime or sky
    return R.pick([[214, 46, 40], [216, 172, 42], [196, 222, 72], [160, 206, 232], [232, 104, 36]]);
  };

  // ---------------------------------------------------------------- one line as a lockup
  // returns tokens in block space (x from the block's left edge, y down from its top), plus its size
  function lockup(ws, P, ink, R, maxW, focus) {
    const n = ws.length;
    const strs = ws.map((w) => clean(w.raw));
    // the key words go big: the stressed one and maybe a neighbour or two, the whole line when it's short
    // the word with a picture, else the stressed one, else the longest
    let k = focus != null && focus >= 0 ? focus : ws.findIndex((w) => w.key);
    if (k < 0) { k = 0; strs.forEach((s, i) => { if (s.length > strs[k].length) k = i; }); }
    let s0 = k, s1 = k + 1;
    if (n <= 2 || P.text.length <= 12) { s0 = 0; s1 = n; }
    else {
      const want = R.pick([1, 2, 2, 3]);
      while (s1 - s0 < want) {
        const canR = s1 < n && strs.slice(s0, s1 + 1).join(' ').length <= 16, canL = s0 > 0 && strs.slice(s0 - 1, s1).join(' ').length <= 16;
        if (canR && (!canL || R.ch(k > n / 2 ? 0.75 : 0.45))) s1++; else if (canL) s0--; else break;
      }
    }
    const tail = ws.slice(s1);
    const script = tail.length === 1 && strs[s1].length <= 6 && R.ch(0.5);
    const HPX = P.HPX;
    const big = { f: F.cond, wt: 400, fill: C(ink.pop), print: 0.32 }, small = { f: F.round, wt: 500, fill: C(ink.main) }, scr = { f: F.serif, wt: 500, it: true, fill: C(ink.main) };
    let bigCap = R.r(0.085, 0.125);
    const bigText = strs.slice(s0, s1).join(' ').toUpperCase();
    // fit the big run in the width
    MC.font = `400 100px ${big.f}`;
    const bw100 = MC.measureText(bigText).width;
    const capB = capOf(big.f, 400);
    bigCap = Math.min(bigCap, ((maxW * 0.92 * HPX) / bw100) * 100 * capB / HPX);
    const bigPx = (bigCap / capB) * HPX;
    const smallPx = Math.max(15, bigPx * R.r(0.24, 0.3)), scrPx = bigPx * 0.62;
    const mk = (w, i, o, px, up) => Object.assign(word(up ? strs[i].toUpperCase() : strs[i], o, px), { w, i, px, big: o === big });
    const pre = [], mid = [], post = [];
    ws.forEach((w, i) => {
      if (i < s0) pre.push(mk(w, i, small, smallPx));
      else if (i < s1) mid.push(mk(w, i, big, bigPx, true));
      else post.push(script ? mk(w, i, scr, scrPx) : mk(w, i, small, smallPx));
    });
    const sp = (t) => (t.big ? t.px * 0.2 : t.px * 0.28);
    const widthOf = (row) => row.reduce((a, t, j) => a + t.adv + (j ? sp(t) : 0), 0) + (row.length > 1 ? 0 : 0);
    const rows = [];
    const inlineW = widthOf(pre) + widthOf(mid) + widthOf(post) + (pre.length ? smallPx * 0.45 : 0) + (post.length ? smallPx * 0.45 : 0);
    let mode;
    if (inlineW <= maxW * HPX && (R.ch(0.6) || (!pre.length && post.length <= 1))) { rows.push(pre.concat(mid, post)); mode = 'inline'; }
    else {
      mode = 'stack';
      if (pre.length) rows.push(pre);
      rows.push(mid);
      if (post.length) rows.push(post);
    }
    // rows that are still too wide get split
    const out = [];
    for (const row of rows) {
      if (widthOf(row) <= maxW * HPX * 1.02 || row.length < 2) { out.push(row); continue; }
      let a = [], w = 0;
      for (const t of row) { const add = t.adv + (a.length ? sp(t) : 0); if (a.length && w + add > maxW * HPX) { out.push(a); a = []; w = 0; } a.push(t); w += a.length > 1 ? add : t.adv; }
      if (a.length) out.push(a);
    }
    // set the rows: baselines from the top, each row aligned to the big row's left or right edge
    const toks = [];
    let y = 0, bw = 0;
    const al = R.pick(['l', 'l', 'r', 'c']);
    const rw = out.map(widthOf);
    const W = Math.max(...rw);
    out.forEach((row, ri) => {
      const cap = Math.max(...row.map((t) => (t.big ? bigCap : (t.px * capOf(F.round, 500)) / HPX)));
      y += (ri ? Math.max(cap * 0.42, 0.016) : 0) + cap;
      let x = al === 'l' ? 0 : al === 'r' ? W - rw[ri] : (W - rw[ri]) / 2;
      // inline: a small gap either side of the big run
      row.forEach((t, j) => {
        if (j) x += sp(t) + (mode === 'inline' && row[j - 1].big !== t.big ? smallPx * 0.3 : 0);
        toks.push({ t, x: x / HPX, y });
        x += t.adv;
      });
      bw = Math.max(bw, x / HPX);
      y += cap * 0.12;
    });
    return { toks, w: W / HPX, h: y + bigCap * 0.12, mode, al, big: bigText };
  }

  // ---------------------------------------------------------------- props
  // a four-point sparkle
  function sparkle(size, col) {
    const c = PU.cv(size, size), x = c.getContext('2d'), m = size / 2;
    x.fillStyle = C(col); x.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 - PI / 2, r = i % 2 ? m * 0.16 : m * 0.98; x.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); }
    x.closePath(); x.fill();
    return c;
  }
  // a big torn sheet of paper in another colour, like a hand or a wave cut from a magazine
  function sheet(w, h, col, R) {
    const c = PU.cv(w, h), x = c.getContext('2d');
    x.fillStyle = C(col); x.beginPath();
    const n = 26;
    x.moveTo(0, h * 0.5);
    for (let i = 0; i <= n; i++) { const k = i / n; x.lineTo(k * w, h * (0.22 + 0.16 * Math.sin(k * 5.3 + R.r(0, 0.4)) + R.r(-0.012, 0.012))); }
    for (let i = n; i >= 0; i--) { const k = i / n; x.lineTo(k * w, h * (0.78 + 0.14 * Math.sin(k * 4.1 + 1.7) + R.r(-0.012, 0.012))); }
    x.closePath(); x.fill();
    // a lighter fibre edge along the tear
    x.globalCompositeOperation = 'source-atop';
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = h * 0.012; x.stroke();
    return printed(c, 0.18);
  }
  // an incoming-call banner; the line types into it. Sizes in pixels.
  function callCard(P, w, h, namePx, nameY) {
    const { S, art } = P;
    const c = PU.cv(w, h), x = c.getContext('2d');
    x.fillStyle = 'rgba(38,38,42,0.95)'; x.beginPath(); x.roundRect(0, 0, w, h, Math.min(h * 0.28, namePx * 2.2)); x.fill();
    const r = Math.min(h * 0.3, namePx * 1.6), cx = r * 1.45, cy = h * 0.5;
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, PI * 2); x.clip();
    if (art && art.img) { try { x.drawImage(art.img, cx - r, cy - r, r * 2, r * 2); } catch (e) { x.fillStyle = C(S.a); x.fill(); } }
    else { x.fillStyle = C(S.a); x.fillRect(cx - r, cy - r, r * 2, r * 2); }
    x.restore();
    x.fillStyle = '#ff4f6d'; x.font = `600 ${Math.round(namePx)}px ${F.round}`; x.textBaseline = 'alphabetic';
    x.fillText((P.artist || P.title || 'unknown').slice(0, 26), r * 2.9, nameY);
    // decline and answer
    const bR = Math.min(h * 0.2, namePx * 1.25);
    [['#ff3b30', w - bR * 4.1], ['#34c759', w - bR * 1.6]].forEach(([col, X], j) => {
      x.fillStyle = col; x.beginPath(); x.arc(X, cy, bR, 0, PI * 2); x.fill();
      x.save(); x.translate(X, cy); x.rotate(j ? -0.6 : 2.3); x.fillStyle = '#fff';
      x.beginPath(); x.roundRect(-bR * 0.55, -bR * 0.14, bR * 1.1, bR * 0.28, bR * 0.14); x.fill();
      x.fillRect(-bR * 0.55, -bR * 0.14, bR * 0.22, bR * 0.42); x.fillRect(bR * 0.33, -bR * 0.14, bR * 0.22, bR * 0.42);
      x.restore();
    });
    return { c, textX: r * 2.9, textW: w - r * 2.9 - bR * 5.6 };
  }
  // a notepad page with a binder clip
  function notepad(w, h, S, R) {
    const c = PU.cv(w, h), x = c.getContext('2d');
    x.fillStyle = C([248, 244, 230]); x.fillRect(w * 0.03, h * 0.08, w * 0.94, h * 0.9);
    x.strokeStyle = 'rgba(70,110,170,0.35)'; x.lineWidth = Math.max(1, h * 0.006);
    for (let y = h * 0.28; y < h * 0.95; y += h * 0.11) { x.beginPath(); x.moveTo(w * 0.06, y); x.lineTo(w * 0.94, y); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(w * (0.1 + i * 0.1), h * 0.12, h * 0.012, 0, PI * 2); x.fill(); }
    // the clip
    const cw = w * 0.22, cx = w * R.r(0.6, 0.72);
    x.fillStyle = '#26262a'; x.beginPath(); x.moveTo(cx, h * 0.04); x.lineTo(cx + cw, h * 0.04); x.lineTo(cx + cw * 0.86, h * 0.17); x.lineTo(cx + cw * 0.14, h * 0.17); x.closePath(); x.fill();
    x.strokeStyle = '#b8b8bc'; x.lineWidth = h * 0.012; x.beginPath(); x.moveTo(cx + cw * 0.2, h * 0.05); x.lineTo(cx + cw * 0.3, 0); x.lineTo(cx + cw * 0.7, 0); x.lineTo(cx + cw * 0.8, h * 0.05); x.stroke();
    return PU.rough(c, 0.12);
  }
  // a label strip under a run of small words
  const strip = (w, h, col) => PU.rect(w, h, col, { rough: 0.15 });

  // ---------------------------------------------------------------- the scene
  PU.scrollMake = function (P) {
    const { S, R, A, HPX } = P;
    const bg = P.bg;
    const ink = inksFor(bg, S, R);
    const layers = [], track = [];
    const L = (c, o) => Object.assign({ c, x: 0, y: 0, z: 0, s: 1, rot: 0, tx: 0, ty: 0, a: 1, ax: 0.5, ay: 0.5, h: c.height / HPX }, o);
    const maxW = A * R.r(0.55, 0.7);
    let y = 0, lastAl = '', once = false, noted = false;
    const blocks = [];
    P.lines.forEach((ln, li) => {
      const ws = ln.ws;
      const text = ws.map((w) => clean(w.raw)).join(' ');
      const em = P.em.find((m) => m.li === li);
      const phone = !once && em && /^(📞|💬)/.test(em.e) && text.length <= 70 && R.ch(0.7);
      const gap = li ? R.r(0.06, 0.11) : 0;
      if (phone) {
        // the line comes in as a call, typing into the banner
        const bw = Math.min(A * 0.82, 1.0);
        const namePx = Math.round(0.032 * HPX);
        let msgPx = Math.round(0.036 * HPX), rows;
        const wrap = (px) => {
          MC.font = `500 ${px}px ${F.round}`;
          const avail = (bw - 0.05 * 2.9 - 0.04 * 5.6) * HPX;
          const out = [[]];
          ws.forEach((w) => { const cur = out[out.length - 1]; const tryS = cur.concat(w).map((q) => clean(q.raw)).join(' '); if (cur.length && MC.measureText(tryS).width > avail) out.push([w]); else cur.push(w); });
          return out;
        };
        rows = wrap(msgPx);
        while (rows.length > 2 && msgPx > 0.027 * HPX) { msgPx = Math.round(msgPx * 0.9); rows = wrap(msgPx); }
        if (rows.length > 2) rows = [rows[0], rows.slice(1).flat()];
        const nameY = namePx * 1.75, rowGap = msgPx * 1.3;
        const bhPx = nameY + rows.length * rowGap + msgPx * 0.75;
        const bh = bhPx / HPX;
        const cc = callCard(P, Math.round(bw * HPX), Math.round(bhPx), namePx, nameY);
        const top = y + gap, x0 = -bw / 2 + R.r(-0.06, 0.06) * A;
        const t = ws[0].t;
        once = true;
        layers.push(L(cc.c, { call: true, w: bw, h: bh, x: x0, y: top, ax: 0, ay: 0, z: 0.06, oy: top + bh / 2, gloss: 0.25, sg: 0.04, sa: 0.55, shBlur: 2.5, in: { t: t - 0.25, d: 0.4, dy: -0.18, ds: 0.12, e: 'back', fade: 1 } }));
        const tEnd = Math.max(t + 0.4, ln.end - 0.1), chars = rows.map((r) => r.map((q) => clean(q.raw)).join(' ').length), tot = chars.reduce((a2, b2) => a2 + b2, 0) || 1;
        let ts = t - 0.02;
        rows.forEach((row, ri) => {
          let str = row.map((q) => clean(q.raw)).join(' ');
          MC.font = `500 ${msgPx}px ${F.round}`;
          while (str.length > 4 && MC.measureText(str).width > cc.textW) str = str.slice(0, -2).trimEnd() + '…';
          const msg = word(str, { f: F.round, wt: 500, fill: '#f2f2f4' }, msgPx);
          const d = (tEnd - t) * (chars[ri] / tot);
          layers.push(L(msg.c, { x: x0 + cc.textX / HPX - msg.pad / HPX, y: top + (nameY + (ri + 1) * rowGap) / HPX, ax: 0, ay: msg.base / msg.c.height, z: 0.065, bias: 0.05, oy: top + bh / 2, shadow: false, rev: { t: ts, d: Math.max(0.15, d), m: 1, e: 'lin', soft: 0.04 } }));
          ts += d;
        });
        blocks.push({ li, top, h: bh, x0, w: bw, t, cx: x0 + bw / 2, al: 'c', call: true });
        y = top + bh;
        return;
      }
      const lk = lockup(ws, { text, HPX }, ink, R, maxW, em ? ws.indexOf(em.w) : null);
      let al = lk.al;
      if (al === lastAl && al !== 'c' && R.ch(0.6)) al = al === 'l' ? 'r' : 'l';
      lastAl = al;
      const m = R.r(0.1, 0.16);
      const x0 = al === 'l' ? -A / 2 + m : al === 'r' ? A / 2 - m - lk.w : -lk.w / 2 + R.r(-0.06, 0.06);
      const top = y + gap;
      const t0 = ws[0].t;
      // now and then the small lead-in sits on a label strip, or the tail is written on a notepad
      const smallsAll = lk.toks.filter((k) => !k.t.big);
      const rowsY = [...new Set(smallsAll.map((k) => k.y))];
      const bigY = Math.max(-1, ...lk.toks.filter((k) => k.t.big).map((k) => k.y));
      const smalls = smallsAll.filter((k) => k.y === rowsY[0]);
      const tail = smallsAll.filter((k) => k.y === rowsY[rowsY.length - 1] && k.y > bigY);
      const useStrip = smalls.length && smalls.length <= 5 && smalls[0].y < bigY && R.ch(0.22) && lk.mode === 'stack';
      const useNote = !useStrip && !noted && lk.mode === 'stack' && tail.length && tail.length <= 3 && R.ch(0.35);
      const recolor = (list, col) => layers.forEach((l) => { if (l.c && list.some((k) => k.t.c === l.c)) { const cx = l.c.getContext('2d'); cx.globalCompositeOperation = 'source-in'; cx.fillStyle = C(col); cx.fillRect(0, 0, l.c.width, l.c.height); cx.globalCompositeOperation = 'source-over'; } });
      lk.toks.forEach((k) => {
        const T = k.t, w = T.w;
        const wd = w.end > w.t ? w.end - w.t : 0.25;
        const d = T.big ? U.clamp(wd * 0.9, 0.2, 0.5) : U.clamp(wd * 0.8, 0.12, 0.3);
        layers.push(L(T.c, {
          x: x0 + k.x - T.pad / HPX, y: top + k.y, ax: 0, ay: T.base / T.c.height, z: T.big ? 0.02 : 0.03, oy: top + lk.h / 2,
          sg: 0.022, sa: 0.32, shBlur: 0.8, paper: 0.25, shadow: T.big,
          rev: { t: w.t - 0.03, d, m: 1, e: 'out3', soft: T.big ? 0.35 : 0.5 },
          in: { t: w.t - 0.03, d: 0.45, dy: T.big ? 0.016 : 0.01, e: 'out3' }, hit: T.big ? [w.t] : null,
        }));
      });
      if (useStrip) {
        const xs = smalls.map((k) => x0 + k.x), x1s = smalls.map((k) => x0 + k.x + k.t.adv / HPX);
        const sx0 = Math.min(...xs) - 0.012, sx1 = Math.max(...x1s) + 0.012, ky = top + smalls[0].y;
        const cap = (smalls[0].t.px * capOf(F.round, 500)) / HPX;
        const stc = strip(Math.round((sx1 - sx0) * HPX), Math.round(cap * 2.1 * HPX), lum(ink.main) > 0.5 ? [16, 14, 16] : [248, 244, 236]);
        // the words on it flip to the strip's ink
        recolor(smalls, lum(ink.main) > 0.5 ? [248, 244, 236] : [16, 14, 16]);
        layers.push(L(stc, { strip: true, bias: -0.04, w: sx1 - sx0, h: cap * 2.1, x: sx0, y: ky - cap * 0.5, ax: 0, ay: 0.5, z: 0.0, oy: top + lk.h / 2, sg: 0.012, sa: 0.3, rev: { t: smalls[0].t.w.t - 0.12, d: 0.2, m: 1, e: 'out3' } }));
      }
      if (useNote) {
        noted = true;
        const cap = (tail[0].t.px * capOf(F.round, 500)) / HPX;
        const bx0 = Math.min(...tail.map((k) => x0 + k.x)) - 0.035, bx1 = Math.max(...tail.map((k) => x0 + k.x + k.t.adv / HPX)) + 0.035;
        const ky = top + tail[0].y, by0 = Math.max(ky - cap * 3, top + bigY + 0.012), by1 = ky + cap * 1.6;
        recolor(tail, [30, 28, 36]);
        const np = notepad(Math.round((bx1 - bx0) * HPX), Math.round((by1 - by0) * HPX), S, R);
        layers.push(L(np, { note: true, bias: -0.04, w: bx1 - bx0, h: by1 - by0, x: bx0, y: by0, ax: 0, ay: 0, z: -0.015, oy: top + lk.h / 2, sg: 0.035, sa: 0.45, shBlur: 2, paper: 0.35, in: { t: tail[0].t.w.t - 0.3, d: 0.35, dy: 0.08, ds: 0.12, e: 'back', fade: 1 } }));
        lk.h = Math.max(lk.h, by1 - top);
      }
      blocks.push({ li, top, h: lk.h, x0, w: lk.w, t: t0, al, cx: x0 + lk.w / 2 });
      y = top + lk.h;
    });
    const totalH = y;
    // the camera: ease to each new line, the newest a little below the middle
    blocks.forEach((b, k) => {
      const cy = k === 0 ? b.top + b.h / 2 : Math.max(blocks[0].top + blocks[0].h / 2, b.top + b.h / 2 - 0.13);
      track.push({ t: Math.max(P.t0 - 0.2, b.t - 0.5), x: U.clamp(b.cx * 0.15, -A * 0.06, A * 0.06), y: cy });
    });
    // emoji and cut-outs beside the lines, on the side away from the type
    let side = R.sgn();
    P.em.forEach((m) => {
      const b = blocks.find((q) => q.li === m.li);
      if (!b || !m.st || b.call) return;
      const free = b.al === 'l' ? 1 : b.al === 'r' ? -1 : (side = -side);
      const sz = R.r(0.3, 0.46), ss = (sz * 512) / 360;
      const trk = track[blocks.indexOf(b)];
      // half off the edge of the frame, like a cut-out pasted over the border
      const ex = trk.x + free * (A / 2 - sz * R.r(0.12, 0.32));
      const ey = b.top + b.h * 0.5 + R.r(-0.1, 0.03);
      const nxB = blocks[blocks.indexOf(b) + 1];
      const front = R.ch(0.5) && !(nxB && ey + sz * 0.45 > nxB.top);
      const t = Math.max(P.t0, m.w.t - 0.12);
      if (R.ch(0.4)) layers.push(L(PU.burst(600, R.pick([S.a, S.b, ink.pop]), R.i(9, 14), { jag: true }), { w: sz * 1.25, h: sz * 1.25, x: ex - free * 0.02, y: ey - 0.02, z: front ? 0.05 : -0.16, oy: ey, rot: R.r(0, 1), sg: 0.03, sa: 0.35, paper: 0.4, v: { r: 0.05 * R.sgn() }, in: { t: t + 0.05, d: 0.35, ds: -0.7, e: 'back', fade: 1 } }));
      layers.push(L(m.st, { w: ss, h: ss, x: ex, y: ey, z: front ? 0.09 : -0.12, oy: ey, rot: R.r(-0.35, 0.35), gloss: 0.12, sg: 0.05, sa: 0.55, paper: 0.25, v: { r: R.r(-0.02, 0.02) }, bob: { a: 0.006, f: R.r(1.2, 2), ph: R.r(0, 6) }, in: { t, d: 0.5, dx: free * 0.55, dr: free * R.r(0.4, 0.9), e: 'out5' }, hit: [m.w.t + 0.4] }));
      if (R.ch(0.4)) {
        const lab = PU.micro(['x ' + Math.round((ex + A / 2) * 540) + '  y ' + Math.round(ey * 540 + 300)], { px: 18, wt: 500, fill: C(ink.main, 0.85) });
        layers.push(L(lab, { x: ex - free * sz * 0.1, y: ey + sz * 0.42, z: 0.1, oy: ey, shadow: false, in: { t: t + 0.3, d: 0.2, fade: 1 } }));
      }
    });
    // a torn sheet behind it all, a cover cut-out, and a few sparkles
    if (R.ch(0.55) && blocks.length > 1) {
      const b = R.pick(blocks.slice(0, -1));
      // a colour that stands off the paper and that the type still reads on
      const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      const cand = [S.paper, S.b, S.a, [150, 190, 226], [240, 214, 120], [236, 232, 222], [34, 32, 36]].filter((c) => dist(c, bg) > 110 && Math.abs(lum(c) - lum(ink.main)) > 0.38);
      const col = cand.length ? R.pick(cand) : null;
      if (col) {
        const sc = sheet(1600, 700, col, R);
        const yy = b.top + b.h + 0.05;
        layers.push(L(sc, { w: A * 1.9, h: 0.75, x: R.r(-0.1, 0.1), y: yy, z: -0.3, oy: yy, rot: R.r(-0.35, 0.35), sg: 0.06, sa: 0.5, paper: 0.45, in: { t: Math.max(P.t0, b.t - 0.2), d: 0.8, dx: R.sgn() * 1.2, e: 'out5' } }));
      }
    }
    if (P.art && P.art.ok && P.art.cut && R.ch(0.6)) {
      // printed so it never swallows the type: light when the ink is dark, dark when it's light
      const darkInk = lum(ink.main) < 0.5;
      const kind = R.pick(['dots', 'tone', 'duo']);
      const mid = [S.a, S.b, [150, 190, 226], [240, 214, 120], [60, 54, 66]].find((c) => Math.abs(lum(c) - lum(bg)) > 0.15 && Math.abs(lum(c) - lum(ink.main)) > 0.35) || (darkInk ? S.paper : [40, 36, 44]);
      const cols = darkInk
        ? (kind === 'dots' ? [S.paper] : kind === 'tone' ? [mid, S.paper] : [mid, S.paper])
        : (kind === 'dots' ? [[20, 18, 22]] : kind === 'tone' ? [[16, 14, 16], mid] : [[16, 14, 16], mid]);
      const cut = P.art.get(kind, cols, { border: R.ch(0.5) ? S.paper : null });
      const b = blocks[Math.min(blocks.length - 1, R.i(0, 1))];
      const s = R.sgn(), hh = R.r(0.8, 1.05);
      const yy = b.top + b.h / 2 + 0.45;
      layers.push(L(cut, { h: hh, x: s * A * R.r(0.3, 0.42), y: yy, ay: 1, z: -0.22, oy: yy - hh / 2, sg: 0.06, sa: 0.5, paper: 0.3, in: { t: Math.max(P.t0, b.t - 0.1), d: 0.7, dy: 0.5, e: 'out5' } }));
    }
    const nsp = R.i(2, 4);
    for (let i = 0; i < nsp; i++) {
      const b = R.pick(blocks);
      const sz = R.r(0.04, 0.08), yy = b.top + R.r(-0.05, b.h + 0.05);
      layers.push(L(sparkle(160, R.pick([ink.main, ink.pop, S.paper])), { w: sz, h: sz, x: R.r(-A * 0.45, A * 0.45), y: yy, z: R.r(-0.05, 0.12), oy: yy, shadow: R.ch(0.5), sg: 0.02, sa: 0.3, v: { r: R.r(-0.4, 0.4) }, in: { t: b.t + R.r(0, 0.5), d: 0.3, ds: -0.9, e: 'back', fade: 1 } }));
    }
    // and a little print furniture
    if (R.ch(0.5)) {
      const lab = PU.micro([(P.title || '').toUpperCase().slice(0, 22), '@' + (P.artist || 'oley').toLowerCase().replace(/\s+/g, '').slice(0, 16)], { px: 18, wt: 500, fill: C(ink.main, 0.75) });
      layers.push(L(lab, { x: -A / 2 + 0.05, y: blocks[0].top - 0.12, ax: 0, z: 0.02, oy: blocks[0].top, shadow: false, in: { t: P.t0, d: 0.3, fade: 1 } }));
    }
    // at the end, if there's a breath, pull back to show the whole sheet
    let reveal = null;
    const last = blocks[blocks.length - 1];
    const tr = Math.max(P.lastEnd + 0.3, P.t1 - 2);
    if (blocks.length >= 2 && P.t1 - tr > 0.8) reveal = { t: tr, x: 0, y: totalH / 2, dist: U.clamp(totalH + 0.35, 1.25, 3.2) * 1.35 };
    return { layers, track, reveal, totalH, last };
  };

  // where the camera is on the sheet at t
  PU.scrollCam = function (sc, t) {
    const tk = sc.track;
    let i = -1;
    while (i < tk.length - 1 && tk[i + 1].t <= t) i++;
    let x, y;
    if (i < 0) { x = tk[0].x; y = tk[0].y; }
    else { const a = tk[i - 1] || tk[i], b = tk[i], e = E.io(U.sat((t - b.t) / 1.0)); x = a.x + (b.x - a.x) * e; y = a.y + (b.y - a.y) * e; }
    let dist = 1.3;
    if (sc.reveal && t > sc.reveal.t) {
      const e = E.io(U.sat((t - sc.reveal.t) / 1.1));
      x += (sc.reveal.x - x) * e; y += (sc.reveal.y - y) * e; dist += (sc.reveal.dist - dist) * e;
    }
    return { x, y, dist };
  };
})();
