/* Oley · Editlyric 3D shots, part 1: shared helpers, the phone and the laptop.
   A shot paints one object's surface for one lyric line. Words only ever appear when they're sung. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, S = O.Surf, F = S.FAM;
  const E3 = (O.E3 = O.E3 || {});
  const PI = Math.PI;
  E3.SHOTS = E3.SHOTS || [];
  E3.INTER = E3.INTER || [];
  const rgb = (E3.rgb = (c, a) => U.rgba(c, a == null ? 1 : a));
  const sstep = (a, b, x) => { const k = U.sat((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const K = () => O.Ed.K;

  // ---------------------------------------------------------------- helpers
  const cache = new Map();
  E3.cached = function (key, w, h, draw) {
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
    draw(c.getContext('2d'), c.width, c.height);
    cache.set(key, c);
    if (cache.size > 48) cache.delete(cache.keys().next().value);
    return c;
  };
  const artKey = (D) => (D.ctx.artImg && D.ctx.artImg.src ? D.ctx.artImg.src.slice(-40) : 'none') + (D.ctx.palette ? D.ctx.palette.vividHex : '');
  // the album art as a soft, dark wallpaper
  E3.wallpaper = function (D, w, h, kind) {
    return E3.cached('wp:' + kind + ':' + w + 'x' + h + artKey(D), w, h, (x) => {
      const P = D.ctx.palette;
      x.fillStyle = rgb(P.dark); x.fillRect(0, 0, w, h);
      if (D.ctx.artImg) S.img(x, D.ctx.artImg, -w * 0.1, -h * 0.1, w * 1.2, h * 1.2, 0, { filter: `blur(${Math.round(w * 0.035)}px) saturate(1.25)` });
      const g = x.createLinearGradient(0, 0, 0, h);
      if (kind === 'light') { g.addColorStop(0, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0.05)'); }
      else { g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.6, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); }
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  };
  const str = (w) => w.raw || w.bare || '';
  // words of a line laid out in a box, drawn as they're sung, with the sung word as a camera target
  class Block {
    constructor(x, ws, o) {
      this.o = o;
      const items = ws.map((w) => ({ s: o.upper ? str(w).toUpperCase() : o.lower ? str(w).toLowerCase() : str(w), w }));
      let px = o.max, lay;
      for (;;) {
        const font = S.font(o.wt || 600, px, o.fam);
        lay = S.wrap(x, items, o.maxW, font);
        const wmax = Math.max(0, ...lay.map((l) => l.w));
        if ((lay.length * px * (o.lh || 1.16) <= o.maxH && wmax <= o.maxW && lay.length <= (o.maxLines || 99)) || px <= o.min) break;
        px = Math.max(o.min, px * 0.93);
      }
      this.px = px;
      this.font = S.font(o.wt || 600, px, o.fam);
      this.lh = px * (o.lh || 1.16);
      const H = lay.length * this.lh;
      const y0 = o.valign === 'middle' ? o.Y + (o.maxH - H) / 2 : o.valign === 'bottom' ? o.Y + o.maxH - H : o.Y;
      this.items = [];
      lay.forEach((ln, li) => {
        const ox = o.align === 'center' ? o.X + (o.maxW - ln.w) / 2 : o.align === 'right' ? o.X + o.maxW - ln.w : o.X;
        for (const p of ln.items) this.items.push({ w: p.it.w, s: p.s, x: ox + p.x, y: y0 + li * this.lh + px * 0.9, wd: p.w, li });
      });
      this.h = H; this.y0 = y0; this.n = lay.length;
      this.wmax = Math.max(0, ...lay.map((l) => l.w));
    }
    // k(item) 0..1: how far into view each word is
    k(it, t, dur) { return U.prog(it.w.t - 0.04, it.w.t - 0.04 + (dur || 0.16), t); }
    draw(x, t, st) {
      st = st || {};
      x.font = this.font; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
      for (const it of this.items) {
        const k = st.all ? 1 : this.k(it, t, st.dur);
        if (k <= 0) continue;
        x.globalAlpha = (st.alpha == null ? 1 : st.alpha) * U.sat(k * 1.6);
        x.fillStyle = (st.color && st.color(it, k)) || st.fill || '#fff';
        const dy = (1 - U.e('outCubic', k)) * (st.rise == null ? this.px * 0.22 : st.rise);
        if (st.stroke) { x.lineWidth = st.stroke; x.strokeStyle = st.strokeStyle || '#000'; x.lineJoin = 'round'; x.strokeText(it.s, it.x, it.y + dy); }
        x.fillText(it.s, it.x, it.y + dy);
      }
      x.globalAlpha = 1;
    }
    // the sung word, in page coordinates 0..1 (smoothly moving from word to word)
    focus(t) {
      const its = this.items, o = this.o;
      if (!its.length) return { u: 0.5, v: 0.5 };
      const pt = (it) => ({ u: (it.x + it.wd / 2) / o.W, v: (it.y - this.px * 0.32) / o.H });
      let k = -1;
      for (let i = 0; i < its.length; i++) { if (its[i].w.t <= t) k = i; else break; }
      if (k < 0) return pt(its[0]);
      const a = pt(its[k]), b = its[k + 1];
      if (!b) return a;
      const m = sstep(b.w.t - 0.3, b.w.t + 0.05, t), q = pt(b);
      return { u: a.u + (q.u - a.u) * m, v: a.v + (q.v - a.v) * m };
    }
    // the whole block's middle in page coordinates
    mid() { return { u: (this.o.X + this.o.maxW / 2) / this.o.W, v: (this.y0 + this.h / 2) / this.o.H }; }
  }
  E3.Block = Block;
  // repaint key: changes ~30x a second while anything is moving, and stops when the line is done
  E3.tick = (sh, t, extra) => {
    const live = t > sh.s - 1.2 && t < (sh.lastT || sh.s) + 0.8;
    return sh.id + ':' + (live ? Math.floor(t * 30) : t < sh.s ? 'pre' : 'post') + (extra == null ? '' : ':' + extra);
  };
  E3.clockStr = () => { const d = new Date(); let h = d.getHours() % 12; if (!h) h = 12; return h + ':' + String(d.getMinutes()).padStart(2, '0'); };
  E3.dateStr = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  E3.prevLines = (D, L, n) => { const ls = (D.ctx.tl && D.ctx.tl.lines) || []; const out = []; for (let i = L.i - 1; i >= 0 && out.length < n; i--) if (ls[i].words.length) out.unshift(ls[i]); return out; };
  const lineStr = (L) => L.words.map(str).join(' ');
  E3.lineStr = lineStr;
  const fits = (maxWords, maxChars) => (L) => L.words.length <= maxWords && lineStr(L).length <= maxChars;
  E3.fits = fits;
  const add = (o) => E3.SHOTS.push(o);
  E3.add = add;

  // ================================================================ the phone (900 x 1950, screen up on the desk)
  const PW = 900, PH = 1950;
  function statusBar(x, light) {
    const c = light ? '#111' : '#fff';
    x.fillStyle = c; x.font = S.font(600, 46); x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText(E3.clockStr(), 92, 86);
    // signal, wifi, battery
    for (let i = 0; i < 4; i++) S.fillRR(x, 640 + i * 18, 98 - 12 - i * 6, 12, 14 + i * 6, 3, c);
    x.strokeStyle = c; x.lineWidth = 3.5; S.rr(x, 728, 70, 70, 34, 10); x.stroke();
    S.fillRR(x, 734, 76, 52, 22, 6, c);
    // the island
    S.fillRR(x, PW / 2 - 130, 34, 260, 76, 38, '#000');
  }
  function homeBar(x, light) { S.fillRR(x, PW / 2 - 140, PH - 38, 280, 12, 6, light ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)'); }
  const phone = (o) => add(Object.assign({ prop: 'phone' }, o));
  const ppage = (D) => D.room.props.phone.page;

  // a notification on the lock screen
  phone({
    id: 'ph.lock', w: 1.1, kw: /\b(call|text|phone|message|night|tonight|late|wake|sleep|morning|time)\b/i, fits: fits(14, 90),
    make(D, L, R) {
      const pg = ppage(D), prev = E3.prevLines(D, L, 2);
      const apps = [['chat', 'Messages', '#33c759'], ['bell', 'Reminders', '#ff9f0a'], ['file', 'Notes', '#e0a800'], ['mail', 'Mail', '#0a84ff']];
      const app = R.pick(apps);
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 500, max: 50, min: 34, maxW: PW - 230, maxH: 260, X: 160, Y: 0, W: PW, H: PH, lh: 1.22 });
      const cardH = Math.max(170, blk.h + 120);
      const sh = {
        zoom: 0.62, look: 0.8, fill: 0.92,
        focus: (t) => { const f = blk.focus(t); return { u: f.u, v: (1180 + 92 + (f.v * PH) - 0) / PH }; },
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
          statusBar(x);
          x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,0.92)'; x.textBaseline = 'alphabetic';
          x.font = S.font(600, 48); x.fillText(E3.dateStr(), w / 2, 280);
          x.font = S.font(700, 250, F.display); x.fillText(E3.clockStr(), w / 2, 520);
          // older notifications under the new one
          let y = 1180 + cardH + 26;
          prev.slice().reverse().forEach((pl, i) => {
            const a = 0.72 - i * 0.22;
            S.fillRR(x, 50 + i * 16, y, w - 100 - i * 32, 150, 44, `rgba(40,40,46,${a * 0.75})`);
            x.globalAlpha = a; x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = S.font(600, 36); x.fillText(app[1], 140 + i * 16, y + 58);
            x.font = S.font(400, 36); let s = lineStr(pl); if (s.length > 34) s = s.slice(0, 33) + '…'; x.fillText(s, 140 + i * 16, y + 108);
            x.globalAlpha = 1; y += 168 - i * 30;
          });
          // the new one drops in when the first word is sung
          const k = U.e('outBack', U.prog(L.words[0].t - 0.15, L.words[0].t + 0.25, t));
          if (k > 0) {
            x.save(); x.translate(0, (1 - k) * -60); x.globalAlpha = U.sat(k * 2);
            S.shadow(x, 40, 10, 'rgba(0,0,0,0.35)');
            S.fillRR(x, 40, 1180, w - 80, cardH, 48, 'rgba(250,250,252,0.9)');
            S.noShadow(x);
            S.fillRR(x, 72, 1212, 64, 64, 15, app[2]);
            S.icon(x, app[0], 80, 1220, 48, '#fff');
            x.fillStyle = '#111'; x.font = S.font(600, 38); x.textAlign = 'left'; x.fillText(app[1].toUpperCase(), 160, 1258);
            x.fillStyle = '#777'; x.textAlign = 'right'; x.fillText('now', w - 80, 1258);
            x.translate(0, 1180 + 92);
            blk.draw(x, t, { fill: '#111', rise: 10 });
            x.restore();
          }
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // a chat: the line arrives as a message, word by word, after a typing bubble
  phone({
    id: 'ph.chat', w: 1.3, kw: /\b(you|me|baby|tell|say|said|talk|why|where|what|love)\b/i, fits: fits(18, 110),
    make(D, L, R) {
      const pg = ppage(D), prev = E3.prevLines(D, L, 3);
      const mine = R() < 0.45;
      const blue = mine ? '#0a84ff' : null;
      const who = (D.track && D.track.artist) || 'Unknown';
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 400, max: 52, min: 38, maxW: 560, maxH: 600, X: 0, Y: 0, W: PW, H: PH, lh: 1.22 });
      const bw = Math.max(140, blk.wmax + 70), bh = blk.h + 52;
      const bx = mine ? PW - 44 - bw : 44, by = PH - 330 - bh;
      const sh = {
        zoom: 0.6, look: 0.85, fill: 0.92,
        focus: (t) => { const f = blk.focus(t); return { u: (bx + 35 + f.u * PW) / PW, v: (by + 26 + f.v * PH) / PH }; },
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
          // header
          x.fillStyle = 'rgba(28,28,30,0.96)'; x.fillRect(0, 0, w, 330);
          statusBar(x);
          x.fillStyle = '#0a84ff'; x.font = S.font(400, 46); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('‹', 40, 250);
          x.fillStyle = '#555'; x.beginPath(); x.arc(w / 2, 200, 56, 0, PI * 2); x.fill();
          if (D.ctx.artImg) { x.save(); x.beginPath(); x.arc(w / 2, 200, 56, 0, PI * 2); x.clip(); S.img(x, D.ctx.artImg, w / 2 - 56, 144, 112, 112, 0); x.restore(); }
          x.fillStyle = '#fff'; x.font = S.font(500, 34); x.textAlign = 'center'; x.fillText(who.length > 24 ? who.slice(0, 23) + '…' : who, w / 2, 300);
          // history
          let y = by - 30;
          for (let i = prev.length - 1; i >= 0; i--) {
            const s = lineStr(prev[i]);
            x.font = S.font(400, 44);
            const lines = S.wrap(x, s.split(' '), 540, x.font);
            const hh = lines.length * 54 + 40, ww = Math.max(...lines.map((l) => l.w)) + 60;
            y -= hh + 18;
            if (y < 340) break;
            const me = (i + (mine ? 1 : 0)) % 2 === 0;
            const X = me ? w - 44 - ww : 44;
            S.fillRR(x, X, y, ww, hh, 40, me ? '#0a84ff' : '#262629');
            x.fillStyle = '#fff'; x.textAlign = 'left';
            lines.forEach((ln, j) => x.fillText(ln.items.map((q) => q.s).join(' '), X + 30, y + 64 + j * 54));
          }
          // typing dots, then the bubble growing with the words
          const t0 = L.words[0].t;
          if (t > t0 - 0.9 && t < t0 - 0.02 && !mine) {
            S.fillRR(x, 44, PH - 330 - 110, 170, 110, 55, '#262629');
            for (let i = 0; i < 3; i++) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i * 0.9)); x.fillStyle = `rgba(160,160,168,${a})`; x.beginPath(); x.arc(92 + i * 38, PH - 330 - 55, 13, 0, PI * 2); x.fill(); }
          }
          if (t >= t0 - 0.04) {
            const k = U.e('outBack', U.prog(t0 - 0.04, t0 + 0.22, t));
            // the bubble grows to fit the words sung so far
            let sw = 0, sl = 0;
            for (const it of blk.items) if (t >= it.w.t - 0.04) { sw = Math.max(sw, it.x + it.wd); sl = Math.max(sl, it.li); }
            const cw = Math.max(110, sw + 70), ch = (sl + 1) * blk.lh + 52;
            const X = mine ? w - 44 - cw : 44, Y = PH - 330 - ch;
            x.save(); x.translate(X + (mine ? cw : 0), Y + ch); x.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); x.translate(-(X + (mine ? cw : 0)), -(Y + ch));
            S.fillRR(x, X, Y, cw, ch, 44, blue || '#262629');
            x.translate(X + 35, Y + 26);
            blk.draw(x, t, { fill: '#fff', rise: 6 });
            x.restore();
          }
          // compose bar
          S.fillRR(x, 140, PH - 210, w - 200, 92, 46, '#1c1c1e');
          x.strokeStyle = '#3a3a3c'; x.lineWidth = 3; S.rr(x, 140, PH - 210, w - 200, 92, 46); x.stroke();
          x.fillStyle = '#6e6e73'; x.font = S.font(400, 40); x.textAlign = 'left'; x.fillText('Message', 180, PH - 150);
          x.fillStyle = '#3a3a3c'; x.beginPath(); x.arc(84, PH - 164, 40, 0, PI * 2); x.fill();
          x.fillStyle = '#aaa'; x.font = S.font(300, 64); x.textAlign = 'center'; x.fillText('+', 84, PH - 142);
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // notes: typed, with a caret and the odd typo fixed
  phone({
    id: 'ph.notes', w: 1, kw: /\b(write|wrote|words|remember|forget|list|note|diary|letter|paper)\b/i, fits: fits(22, 140),
    make(D, L, R) {
      const pg = ppage(D), prev = E3.prevLines(D, L, 3);
      const r2 = Object.assign(() => R(), { chance: (p) => R() < p, pick: R.pick, int: (a, b) => Math.floor(R.r(a, b + 1)) });
      const typos = K().pickTypos(L.words, r2, D.ctx.opts.typos !== false, 0.5);
      const font = S.font(400, 60, F.sans);
      const sh = {
        zoom: 0.55, look: 0.9, fill: 0.92, cv: null,
        foc: { u: 0.3, v: 0.5 },
        focus: () => sh.foc,
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#1c1c1e'; x.fillRect(0, 0, w, h);
          statusBar(x);
          x.fillStyle = '#ffd60a'; x.font = S.font(400, 46); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          x.fillText('‹ Notes', 34, 250);
          x.textAlign = 'right'; x.fillText('Done', w - 40, 250);
          x.fillStyle = '#8e8e93'; x.font = S.font(400, 34); x.textAlign = 'center'; x.fillText(E3.dateStr(), w / 2, 330);
          x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = S.font(700, 74); x.fillText((D.track && D.track.title ? D.track.title : 'untitled').slice(0, 18), 60, 450);
          let y = 560;
          x.font = S.font(400, 50); x.fillStyle = '#d0d0d4';
          for (const pl of prev) { const ls = S.wrap(x, lineStr(pl).split(' '), w - 120, x.font); for (const ln of ls) { x.fillText(ln.items.map((q) => q.s).join(' '), 60, y); y += 66; } y += 14; }
          y += 20;
          const st = K().typeLine(L.words, t, typos);
          x.font = font; x.fillStyle = '#fff';
          const ls = S.wrap(x, st.s ? st.s.split(' ') : [], w - 120, font);
          let cx = 60, cy = y;
          ls.forEach((ln, i) => {
            const s = ln.items.map((q) => q.s).join(' ');
            if (st.bad && i === ls.length - 1) {
              const cut = s.lastIndexOf(' ') + 1;
              x.fillStyle = '#fff'; x.fillText(s.slice(0, cut), 60, y);
              const bx = 60 + x.measureText(s.slice(0, cut)).width, bwid = x.measureText(s.slice(cut)).width;
              x.fillText(s.slice(cut), bx, y);
              x.strokeStyle = '#ff453a'; x.lineWidth = 4; x.beginPath();
              for (let k = 0; k <= bwid; k += 8) x.lineTo(bx + k, y + 12 + Math.sin(k / 4) * 4);
              x.stroke();
            } else x.fillText(s, 60, y);
            cx = 60 + x.measureText(s).width; cy = y; y += 78;
          });
          if (!ls.length) { cx = 60; cy = y; }
          if (Math.floor(t * 2) % 2 === 0 || t < (sh.lastT || 0)) S.fillRR(x, cx + 4, cy - 52, 6, 66, 3, '#ffd60a');
          sh.foc = { u: Math.min(0.75, cx / w), v: (cy - 20) / h };
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // an incoming call, the caller's name is the line
  phone({
    id: 'ph.call', w: 0.9, kw: /\b(call|calling|ring|phone|answer|hello|line|hear|voice)\b/i, fits: fits(9, 56),
    make(D, L, R) {
      const pg = ppage(D);
      const blk = new Block(pg.x, L.words, { fam: F.display, wt: 500, max: 96, min: 60, maxW: PW - 140, maxH: 420, X: 70, Y: 300, W: PW, H: PH, align: 'center', lh: 1.1 });
      const sh = {
        zoom: 0.7, look: 0.6, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
          statusBar(x);
          blk.draw(x, t, { fill: '#fff' });
          x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = S.font(400, 44); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
          x.fillText('mobile', w / 2, blk.y0 + blk.h + 70);
          const ring = (cx, col, icon) => {
            for (let i = 0; i < 2; i++) { const p = (t * 0.8 + i * 0.5) % 1; x.strokeStyle = `rgba(255,255,255,${0.35 * (1 - p)})`; x.lineWidth = 4; x.beginPath(); x.arc(cx, h - 360, 92 + p * 70, 0, PI * 2); x.stroke(); }
            x.fillStyle = col; x.beginPath(); x.arc(cx, h - 360, 92, 0, PI * 2); x.fill();
            S.icon(x, icon, cx - 44, h - 404, 88, '#fff');
          };
          ring(210, '#ff3b30', 'phone'); ring(w - 210, '#34c759', 'phone');
          x.fillStyle = '#fff'; x.font = S.font(400, 40);
          x.fillText('Decline', 210, h - 210); x.fillText('Accept', w - 210, h - 210);
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // search: the line typed into a search field, with suggestions that never give away what's next
  phone({
    id: 'ph.search', w: 0.9, kw: /\b(find|search|looking|lost|where|who|what|why|how|know)\b/i, fits: fits(10, 60),
    make(D, L, R) {
      const pg = ppage(D);
      const tails = R.pick([['lyrics', 'meaning', 'song', 'chords'], ['meaning', 'tiktok', 'slowed', 'lyrics'], ['song', 'lyrics', 'remix', 'live']]);
      const sh = {
        zoom: 0.5, look: 0.5, fill: 0.92, cv: 0.24,
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
          x.drawImage(E3.wallpaper(D, w, h, 'dark'), 0, 0);
          x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, w, h);
          statusBar(x);
          const st = K().typeLine(L.words, t, null);
          S.fillRR(x, 40, 200, w - 80, 110, 34, 'rgba(118,118,128,0.4)');
          S.icon(x, 'search', 70, 225, 60, 'rgba(235,235,245,0.6)');
          x.font = S.font(400, 50); x.textAlign = 'left'; x.textBaseline = 'middle';
          let s = st.s.toLowerCase(); const mw = w - 260;
          while (x.measureText(s).width > mw && s.length > 1) s = s.slice(1);
          x.fillStyle = s ? '#fff' : 'rgba(235,235,245,0.5)';
          x.fillText(s || 'Search', 150, 257);
          if (s && Math.floor(t * 2.4) % 2 === 0) S.fillRR(x, 154 + x.measureText(s).width, 225, 5, 64, 2, '#0a84ff');
          if (s) {
            x.fillStyle = 'rgba(235,235,245,0.6)'; x.font = S.font(600, 36); x.textBaseline = 'alphabetic'; x.fillText('Suggestions', 60, 410);
            tails.forEach((tl, i) => {
              const y = 470 + i * 120;
              S.icon(x, 'search', 60, y, 48, 'rgba(235,235,245,0.6)');
              x.fillStyle = '#fff'; x.font = S.font(400, 46); x.textBaseline = 'middle';
              let q = s + ' ' + tl; while (x.measureText(q).width > w - 200 && q.length > 1) q = q.slice(1);
              x.fillText(q, 140, y + 24);
              x.fillStyle = 'rgba(84,84,88,0.65)'; x.fillRect(140, y + 80, w - 180, 2);
            });
          }
          // keyboard
          const ky = h - 760;
          x.fillStyle = 'rgba(40,40,44,0.92)'; x.fillRect(0, ky, w, 760);
          const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
          const last = s.slice(-1);
          rows.forEach((row, ri) => {
            const kw = 78, gap = 10, tot = row.length * kw + (row.length - 1) * gap, x0 = (w - tot) / 2;
            row.split('').forEach((ch, ci) => {
              const X = x0 + ci * (kw + gap), Y = ky + 40 + ri * 140;
              const hit = ch === last && t < (sh.lastT || 0) + 0.2;
              S.fillRR(x, X, Y, kw, 116, 14, hit ? '#8e8e93' : '#5a5a5e');
              x.fillStyle = '#fff'; x.font = S.font(400, 50); x.textAlign = 'center'; x.fillText(ch, X + kw / 2, Y + 60);
            });
          });
          S.fillRR(x, 230, ky + 460, w - 460, 112, 14, '#5a5a5e');
          x.fillStyle = '#fff'; x.font = S.font(400, 40); x.fillText('space', w / 2, ky + 518);
          S.fillRR(x, w - 216, ky + 460, 180, 112, 14, '#0a84ff'); x.fillText('search', w - 126, ky + 518);
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // a voice memo: the waveform rolls and the words are transcribed as they come
  phone({
    id: 'ph.voice', w: 0.8, kw: /\b(voice|sing|song|hear|listen|sound|say|scream|whisper|record)\b/i, fits: fits(16, 100),
    make(D, L, R) {
      const pg = ppage(D);
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 600, max: 70, min: 46, maxW: PW - 140, maxH: 420, X: 70, Y: 1060, W: PW, H: PH, align: 'center', lh: 1.2 });
      const hist = new Float32Array(240);
      let hi = 0, lastT = -1;
      const sh = {
        zoom: 0.62, look: 0.7, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t, A) => {
          // the waveform follows the actual music
          if (t - lastT > 1 / 40 || t < lastT) { hist[hi++ % hist.length] = A ? U.sat(A.level * 1.6 + A.pulse * 0.4) : 0.3; lastT = t; }
          pg.paint(E3.tick(sh, t, hi), (x, w, h) => {
            x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
            statusBar(x);
            x.fillStyle = '#fff'; x.font = S.font(700, 70); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('New Recording', 60, 300);
            x.fillStyle = '#8e8e93'; x.font = S.font(400, 38); x.fillText(E3.dateStr(), 60, 360);
            const mid = 720, n = hist.length;
            for (let i = 0; i < n; i++) {
              const v = hist[(hi + i) % n];
              const X = 30 + (i / n) * (w - 60), H2 = 8 + v * 230;
              x.fillStyle = i > n - 3 ? '#ff453a' : 'rgba(255,255,255,0.82)';
              S.fillRR(x, X, mid - H2, 2.4, H2 * 2, 1.2, x.fillStyle);
            }
            x.fillStyle = '#ff453a'; x.fillRect(w - 34, 480, 4, 480);
            const el = Math.max(0, t - sh.s);
            x.fillStyle = '#fff'; x.font = S.font(300, 76, F.display); x.textAlign = 'center';
            x.fillText(`0:${String(Math.floor(el)).padStart(2, '0')}.${Math.floor((el % 1) * 100).toString().padStart(2, '0')}`, w / 2, 1010);
            blk.draw(x, t, { fill: '#fff', color: (it, k) => (it.w.key ? '#ff9f0a' : null) });
            x.fillStyle = '#1c1c1e'; x.fillRect(0, h - 420, w, 420);
            x.strokeStyle = '#fff'; x.lineWidth = 8; x.beginPath(); x.arc(w / 2, h - 230, 92, 0, PI * 2); x.stroke();
            S.fillRR(x, w / 2 - 44, h - 274, 88, 88, 16, '#ff453a');
            homeBar(x);
          });
        },
      };
      return sh;
    },
  });

  // navigation: the line is the next turn
  phone({
    id: 'ph.nav', w: 0.8, kw: /\b(road|drive|street|way|home|go|going|run|turn|left|right|leave|far|away|ride|car|city)\b/i, fits: fits(10, 58),
    make(D, L, R) {
      const pg = ppage(D);
      const seed = (R() * 1e6) | 0;
      const turn = R.pick(['right', 'left', 'straight']);
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 700, max: 66, min: 44, maxW: PW - 250, maxH: 250, X: 210, Y: 200, W: PW, H: PH, lh: 1.12 });
      const roads = E3.cached('nav' + seed, PW, PH, (x, w, h) => {
        const r = E3.rng(seed);
        x.fillStyle = '#1d2026'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#23272e';
        for (let i = 0; i < 40; i++) x.fillRect(r() * w, r() * h, 60 + r() * 220, 60 + r() * 220);
        x.strokeStyle = '#3a3f48'; x.lineCap = 'round';
        for (let i = 0; i < 26; i++) { x.lineWidth = 10 + r() * 22; x.beginPath(); const a = r() * PI; const cx = r() * w, cy = r() * h; x.moveTo(cx - Math.cos(a) * 1600, cy - Math.sin(a) * 1600); x.lineTo(cx + Math.cos(a) * 1600, cy + Math.sin(a) * 1600); x.stroke(); }
        x.fillStyle = '#1c3324'; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(r() * w, r() * h, 80 + r() * 150, 60 + r() * 120, r() * 3, 0, PI * 2); x.fill(); }
      });
      const sh = {
        zoom: 0.62, look: 0.6, fill: 0.92, cv: 0.3,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          const p = U.prog(sh.s, sh.e, t);
          x.save(); x.translate(w / 2, h * 0.62); x.rotate(-0.25 + p * 0.12); x.translate(-w / 2, -h * 0.62 - p * 260); x.drawImage(roads, -200, -200, w + 400, h + 400); x.restore();
          // the route
          x.strokeStyle = '#0a84ff'; x.lineWidth = 34; x.lineCap = 'round'; x.lineJoin = 'round';
          x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, h * 0.5);
          if (turn === 'right') x.quadraticCurveTo(w / 2, h * 0.42, w * 0.9, h * 0.4); else if (turn === 'left') x.quadraticCurveTo(w / 2, h * 0.42, w * 0.1, h * 0.4); else x.lineTo(w / 2, h * 0.2);
          x.stroke();
          x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2, h * 0.78, 36, 0, PI * 2); x.fill();
          x.fillStyle = '#0a84ff'; x.beginPath(); x.moveTo(w / 2, h * 0.78 - 26); x.lineTo(w / 2 + 20, h * 0.78 + 18); x.lineTo(w / 2, h * 0.78 + 8); x.lineTo(w / 2 - 20, h * 0.78 + 18); x.closePath(); x.fill();
          // the banner
          S.shadow(x, 30, 8); S.fillRR(x, 30, 130, w - 60, Math.max(260, blk.h + 110), 40, '#1f6f3d'); S.noShadow(x);
          x.save(); x.translate(110, 230); x.strokeStyle = '#fff'; x.lineWidth = 16; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
          if (turn === 'straight') { x.moveTo(0, 50); x.lineTo(0, -50); x.moveTo(-30, -20); x.lineTo(0, -50); x.lineTo(30, -20); }
          else { const s2 = turn === 'right' ? 1 : -1; x.moveTo(-10 * s2, 60); x.lineTo(-10 * s2, -10); x.quadraticCurveTo(-10 * s2, -40, 20 * s2, -40); x.lineTo(50 * s2, -40); x.moveTo(30 * s2, -62); x.lineTo(52 * s2, -40); x.lineTo(30 * s2, -18); }
          x.stroke(); x.restore();
          x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = S.font(600, 40); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(Math.round(800 - p * 700) + ' ft', 210, 186);
          blk.draw(x, t, { fill: '#fff', rise: 8 });
          // ETA
          S.fillRR(x, 30, h - 290, w - 60, 210, 40, 'rgba(28,28,30,0.95)');
          x.fillStyle = '#34c759'; x.font = S.font(700, 60); x.fillText(Math.max(1, Math.round(12 - p * 3)) + ' min', 80, h - 190);
          x.fillStyle = '#8e8e93'; x.font = S.font(400, 40); x.fillText('arrival ' + E3.clockStr(), 80, h - 128);
          homeBar(x);
        }),
      };
      return sh;
    },
  });

  // ================================================================ the laptop (1600 x 1040)
  const LW = 1600, LH = 1040;
  const laptop = (o) => add(Object.assign({ prop: 'laptop' }, o));
  const lpage = (D) => D.room.props.laptop.page;
  function desktop(D, x, w, h, title) {
    x.drawImage(E3.wallpaper(D, w, h, 'mid'), 0, 0);
    x.fillStyle = 'rgba(30,30,34,0.55)'; x.fillRect(0, 0, w, 40);
    x.fillStyle = '#fff'; x.font = S.font(700, 24); x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText('●', 24, 21); x.fillText(title || 'Finder', 60, 21);
    x.font = S.font(500, 24); ['File', 'Edit', 'View', 'Window', 'Help'].forEach((s, i) => x.fillText(s, 190 + i * 88, 21));
    x.textAlign = 'right'; x.fillText(new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + '  ' + E3.clockStr(), w - 24, 21);
    // dock
    S.fillRR(x, w / 2 - 330, h - 104, 660, 92, 26, 'rgba(255,255,255,0.18)');
    const cols = ['#0a84ff', '#34c759', '#ff9f0a', '#ff375f', '#bf5af2', '#64d2ff', '#ffd60a', '#8e8e93'];
    cols.forEach((c, i) => S.fillRR(x, w / 2 - 306 + i * 79, h - 92, 66, 66, 16, c));
  }
  function win(x, X, Y, W, H, title, dark) {
    S.shadow(x, 60, 24, 'rgba(0,0,0,0.5)');
    S.fillRR(x, X, Y, W, H, 18, dark ? '#1e1e1e' : '#f6f6f6');
    S.noShadow(x);
    x.save(); S.rr(x, X, Y, W, H, 18); x.clip();
    x.fillStyle = dark ? '#2b2b2b' : '#e8e8e8'; x.fillRect(X, Y, W, 56);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(X + 30 + i * 30, Y + 28, 9, 0, PI * 2); x.fill(); });
    x.fillStyle = dark ? '#bbb' : '#444'; x.font = S.font(600, 24); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(title, X + W / 2, Y + 29);
    x.restore();
  }

  // a terminal
  laptop({
    id: 'lt.term', w: 1, kw: /\b(code|system|error|machine|computer|run|kill|break|broken|control|power|access)\b/i, fits: fits(18, 110),
    make(D, L, R) {
      const pg = lpage(D), prev = E3.prevLines(D, L, 4);
      const cmd = R.pick(['echo', 'say', 'print', 'cat <<EOF #']);
      const user = 'oley@studio ~ % ';
      const font = S.font(500, 40, F.mono);
      const sh = {
        zoom: 0.62, look: 0.85, fill: 0.92, foc: { u: 0.4, v: 0.5 }, focus: () => sh.foc,
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          desktop(D, x, w, h, 'Terminal');
          const X = 120, Y = 110, W = w - 240, H = h - 260;
          win(x, X, Y, W, H, 'oley — zsh — 120×36', true);
          x.font = font; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          let y = Y + 120;
          const out = (s, col) => { x.fillStyle = col; const ls = S.wrap(x, s.split(' '), W - 80, font); for (const ln of ls) { x.fillText(ln.items.map((q) => q.s).join(' '), X + 40, y); y += 54; } };
          for (const pl of prev) { out(user + cmd + ' "' + lineStr(pl).toLowerCase() + '"', '#7f7f7f'); out(lineStr(pl).toLowerCase(), '#a6a6a6'); }
          const st = K().typeLine(L.words, t, null);
          x.fillStyle = '#28c840'; x.fillText(user, X + 40, y);
          const ux = X + 40 + x.measureText(user).width;
          x.fillStyle = '#fff';
          const s = cmd + ' "' + st.s.toLowerCase() + (t > sh.lastT ? '"' : '');
          const ls = S.wrap(x, s.split(' '), W - 80 - (ux - X - 40), font);
          let cx = ux, cy = y;
          ls.forEach((ln, i) => { const q = ln.items.map((p) => p.s).join(' '); x.fillText(q, i ? X + 40 : ux, y); cx = (i ? X + 40 : ux) + x.measureText(q).width; cy = y; y += 54; });
          if (t > sh.lastT + 0.15) { y += 0; x.fillStyle = '#e5e5e5'; out(lineStr(L).toLowerCase(), '#e5e5e5'); x.fillStyle = '#28c840'; x.fillText(user, X + 40, y); cx = ux; cy = y; }
          if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillRect(cx + 4, cy - 34, 22, 42); }
          sh.foc = { u: U.clamp(cx / w, 0.3, 0.7), v: cy / h };
        }),
      };
      return sh;
    },
  });

  // an alert box
  laptop({
    id: 'lt.alert', w: 1, kw: /\b(can't|cannot|won't|don't|no|never|wrong|lost|error|nothing|alone|leave)\b/i, fits: fits(12, 70),
    make(D, L, R) {
      const pg = lpage(D);
      const kind = R.pick(['notfound', 'quit', 'disk']);
      const body = { notfound: 'The item can’t be found. It may have been moved or deleted.', quit: 'Your changes will be lost if you don’t save them.', disk: 'There isn’t enough space left to keep this.' }[kind];
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 700, max: 44, min: 30, maxW: 600, maxH: 160, X: 500, Y: 360, W: LW, H: LH, align: 'center', lh: 1.18 });
      const sh = {
        zoom: 0.55, look: 0.5, fill: 0.92, cv: 0.48,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          desktop(D, x, w, h, 'Finder');
          x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 40, w, h);
          const k = U.e('outBack', U.prog(sh.s + 0.05, sh.s + 0.35, t));
          if (k <= 0) return;
          x.save(); x.translate(w / 2, 500); x.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); x.translate(-w / 2, -500); x.globalAlpha = U.sat(k * 2);
          const bh = 330 + blk.h;
          S.shadow(x, 70, 30, 'rgba(0,0,0,0.45)'); S.fillRR(x, 460, 200, 680, bh, 30, 'rgba(240,240,242,0.97)'); S.noShadow(x);
          // a warning sign (not anyone's logo)
          x.fillStyle = '#ffcc00'; x.beginPath(); x.moveTo(w / 2, 235); x.lineTo(w / 2 + 56, 330); x.lineTo(w / 2 - 56, 330); x.closePath(); x.fill();
          x.fillStyle = '#111'; x.font = S.font(800, 56); x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('!', w / 2, 322);
          blk.draw(x, t, { fill: '#111', rise: 6 });
          x.fillStyle = '#333'; x.font = S.font(400, 24);
          const ls = S.wrap(x, body.split(' '), 560, x.font);
          ls.forEach((ln, i) => x.fillText(ln.items.map((q) => q.s).join(' '), w / 2, 380 + blk.h + 20 + i * 32));
          const by = 200 + bh - 92;
          S.fillRR(x, 500, by, 290, 60, 14, 'rgba(0,0,0,0.08)'); S.fillRR(x, 810, by, 290, 60, 14, '#0a84ff');
          x.font = S.font(600, 26); x.fillStyle = '#111'; x.fillText(kind === 'quit' ? 'Don’t Save' : 'Cancel', 645, by + 40); x.fillStyle = '#fff'; x.fillText('OK', 955, by + 40);
          x.restore();
        }),
      };
      return sh;
    },
  });

  // a document being written
  laptop({
    id: 'lt.doc', w: 1, kw: /\b(write|story|book|page|letter|words|read|chapter|end)\b/i, fits: fits(24, 150),
    make(D, L, R) {
      const pg = lpage(D), prev = E3.prevLines(D, L, 3);
      const serif = R() < 0.6;
      const font = S.font(serif ? 400 : 500, 50, serif ? F.serif : F.sans);
      const sh = {
        zoom: 0.5, look: 0.9, fill: 0.92, foc: { u: 0.4, v: 0.5 }, focus: () => sh.foc,
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          desktop(D, x, w, h, 'Pages');
          win(x, 90, 80, w - 180, h - 210, (D.track && D.track.title ? D.track.title : 'Untitled') + '.pages', false);
          x.fillStyle = '#d9d9de'; x.fillRect(90, 136, w - 180, h - 266);
          x.fillStyle = '#fff'; x.fillRect(330, 160, w - 660, h - 290);
          x.fillStyle = '#111'; x.font = font; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          let y = 260;
          x.fillStyle = '#555';
          for (const pl of prev) { const ls = S.wrap(x, lineStr(pl).split(' '), w - 800, font); for (const ln of ls) { x.fillText(ln.items.map((q) => q.s).join(' '), 400, y); y += 68; } }
          y += 12;
          x.fillStyle = '#111';
          const st = K().typeLine(L.words, t, null);
          const ls = S.wrap(x, st.s ? st.s.split(' ') : [], w - 800, font);
          let cx = 400, cy = y;
          ls.forEach((ln) => { const q = ln.items.map((p) => p.s).join(' '); x.fillText(q, 400, y); cx = 400 + x.measureText(q).width; cy = y; y += 68; });
          if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = '#0a84ff'; x.fillRect(cx + 3, cy - 44, 4, 56); }
          sh.foc = { u: U.clamp(cx / w, 0.3, 0.7), v: cy / h };
        }),
      };
      return sh;
    },
  });

  // a file being copied, the line is its name
  laptop({
    id: 'lt.copy', w: 0.8, kw: /\b(move|moving|leave|take|gone|send|carry|away|time|wait|waiting|slow)\b/i, fits: fits(9, 50),
    make(D, L, R) {
      const pg = lpage(D);
      const blk = new Block(pg.x, L.words, { fam: F.sans, wt: 600, max: 40, min: 28, maxW: 560, maxH: 110, X: 640, Y: 410, W: LW, H: LH, lh: 1.15 });
      const sh = {
        zoom: 0.5, look: 0.5, fill: 0.92,
        focus: (t) => blk.focus(t),
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          desktop(D, x, w, h, 'Finder');
          win(x, 380, 300, 840, 360, 'Copy', false);
          // a document icon
          x.fillStyle = '#fff'; x.strokeStyle = '#bbb'; x.lineWidth = 3; S.rr(x, 440, 400, 140, 180, 10); x.fill(); x.stroke();
          if (D.ctx.artImg) S.img(x, D.ctx.artImg, 455, 420, 110, 110, 6);
          x.fillStyle = '#555'; x.font = S.font(500, 28); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
          x.fillText('Copying', 640, 390);
          blk.draw(x, t, { fill: '#111', rise: 4 });
          const n = L.words.length, done = L.words.filter((w2) => t >= w2.t).length;
          const k = n ? (done - 1 + U.sat((t - (L.words[Math.max(0, done - 1)].t)) / 0.4)) / n : 0;
          S.fillRR(x, 640, 560, 520, 18, 9, '#ddd');
          S.fillRR(x, 640, 560, 520 * U.sat(Math.max(0, k)), 18, 9, '#0a84ff');
          x.fillStyle = '#777'; x.font = S.font(400, 24); x.fillText(done + ' of ' + n + ' — about ' + Math.max(1, Math.round((sh.lastT - t) + 1)) + ' seconds', 640, 620);
        }),
      };
      return sh;
    },
  });

  // code
  laptop({
    id: 'lt.code', w: 0.8, kw: /\b(if|then|else|true|false|forever|never|always|again|repeat|loop|again)\b/i, fits: fits(16, 100),
    make(D, L, R) {
      const pg = lpage(D), prev = E3.prevLines(D, L, 3);
      const font = S.font(500, 34, F.mono);
      const sh = {
        zoom: 0.55, look: 0.85, fill: 0.92, foc: { u: 0.4, v: 0.5 }, focus: () => sh.foc,
        paint: (t) => pg.paint(E3.tick(sh, t), (x, w, h) => {
          desktop(D, x, w, h, 'Code');
          win(x, 80, 70, w - 160, h - 190, 'song.js — oley', true);
          x.fillStyle = '#1b1b1f'; x.fillRect(80, 126, 260, h - 246);
          ['src', '  song.js', '  lines.json', '  love.txt'].forEach((s, i) => { x.fillStyle = i === 1 ? '#fff' : '#888'; x.font = S.font(400, 24); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(s, 104, 172 + i * 38); });
          x.font = font;
          let ln = 1, y = 180;
          const row = (parts) => { x.fillStyle = '#5a5a66'; x.textAlign = 'right'; x.fillText(String(ln++), 420, y); x.textAlign = 'left'; let X = 450; for (const [s, c] of parts) { x.fillStyle = c; x.fillText(s, X, y); X += x.measureText(s).width; } y += 50; return X; };
          row([['// ', '#6a9955'], [(D.track && D.track.title) || 'untitled', '#6a9955']]);
          row([['const ', '#569cd6'], ['song', '#9cdcfe'], [' = ', '#d4d4d4'], ['[', '#ffd700']]);
          for (const pl of prev) { let s = lineStr(pl); if (s.length > 40) s = s.slice(0, 39) + '…'; row([['  "', '#ce9178'], [s, '#ce9178'], ['",', '#ce9178']]); }
          const st = K().typeLine(L.words, t, null);
          let s = st.s; if (s.length > 44) s = '…' + s.slice(-43);
          const cx = row([['  "', '#ce9178'], [s, '#ce9178'], [t > sh.lastT ? '",' : '', '#ce9178']]);
          const cy = y - 50;
          if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = '#aeafad'; x.fillRect(cx + 2, cy - 30, 3, 40); }
          row([[']', '#ffd700'], [';', '#d4d4d4']]);
          row([['play', '#dcdcaa'], ['(', '#d4d4d4'], ['song', '#9cdcfe'], [');', '#d4d4d4']]);
          sh.foc = { u: U.clamp(cx / w, 0.35, 0.7), v: cy / h };
        }),
      };
      return sh;
    },
  });
})();
