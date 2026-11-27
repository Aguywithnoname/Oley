/* Editlyric scenes — real things, part 2: letter tiles on a game board, a slot machine, a boarding pass,
   a newspaper front page, an LED ticker, a highway sign at dusk, a heart monitor, a stock chart,
   Morse code on a paper tape and a fortune card turned over. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-things2', `
.m-ed .t2 { position: absolute; }
.m-ed .tl-tile { position: absolute; display: grid; place-items: center; border-radius: 9%; font-family: 'Oley Sans', sans-serif; font-weight: 700; color: #2b2116;
  background: linear-gradient(160deg, #f8ead0 0%, #ecd7ab 55%, #dcc28c 100%); box-shadow: inset 0 -0.08em 0 rgba(120,85,40,0.35), inset 0 0.05em 0 rgba(255,255,255,0.6), 0.04em 0.08em 0.12em rgba(0,0,0,0.4); will-change: transform, opacity; }
.m-ed .tl-tile small { position: absolute; right: 9%; bottom: 5%; font-size: 0.3em; font-weight: 600; }
.m-ed .sl-reel { position: absolute; overflow: hidden; border-radius: 0.6vmin; background: #fbfbf7; }
.m-ed .sl-strip { position: absolute; left: 0; right: 0; top: 0; will-change: transform; }
.m-ed .sl-strip div { display: flex; align-items: center; justify-content: center; text-align: center; font-family: 'Oley Heavy', 'Oley Sans', sans-serif; color: #1b1b1b; line-height: 1; padding: 0 0.2em; box-sizing: border-box; }
.m-ed .bp-f small { display: block; font-size: 0.62em; letter-spacing: 0.14em; opacity: 0.6; font-weight: 600; margin-bottom: 0.25em; }
.m-ed .bp-f b { display: block; font-weight: 700; }
.m-ed .np-col { column-count: 3; column-gap: 1.6em; text-align: justify; hyphens: auto; }
`);

  const PTS = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 };

  // ================================================================ 30. letter tiles played on a board
  class Tiles extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 60% 55% at 50% 42%, rgba(255,235,200,0.22), rgba(0,0,0,0.55)), url(${K.tex('wood')})`;
      bg.style.backgroundSize = '100% 100%, 1000px auto';
      const words = this.ws.map((w) => ({ w, s: K.clean(K.bare(w)).replace(/['’-]/g, '').toUpperCase() })).filter((x) => x.s);
      const maxLen = Math.max(4, ...words.map((x) => x.s.length));
      const cols = Math.max(11, maxLen + 4), rows = Math.max(7, words.length + 2);
      const cs = Math.min((W * 0.86) / cols, (H * 0.8) / rows);
      const bw = cs * cols, bh = cs * rows;
      const wrap = U.el('div', 'ed-fill', this.el); wrap.style.perspective = W * 1.4 + 'px';
      const bd = U.el('div', 't2', wrap);
      Object.assign(bd.style, { left: (W - bw) / 2 + 'px', top: (H - bh) / 2 - H * 0.03 + 'px', width: bw + 'px', height: bh + 'px', background: '#8a1c1c', padding: cs * 0.12 + 'px', boxSizing: 'content-box', borderRadius: cs * 0.15 + 'px', boxShadow: '0 2vmin 5vmin rgba(0,0,0,0.55)', transform: `rotateX(${(this.v % 2 ? 22 : 12)}deg) rotateZ(${r.range(-3, 3).toFixed(1)}deg)` });
      this.bd = bd;
      const prem = [['#d1495b', 'TW'], ['#f2a2ad', 'DW'], ['#2f6eb5', 'TL'], ['#9cc9e8', 'DL']];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const c = U.el('div', 't2', bd);
        const q = U.hash(x * 31 + y * 17 + ':' + L.i) % 23;
        const pr = q < 4 ? prem[q] : null;
        Object.assign(c.style, { left: cs * 0.12 + x * cs + 'px', top: cs * 0.12 + y * cs + 'px', width: cs - 2 + 'px', height: cs - 2 + 'px', background: pr ? pr[0] : '#e6dcc3', color: 'rgba(255,255,255,0.85)', font: `700 ${(cs * 0.22).toFixed(1)}px 'Oley Sans', sans-serif`, display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' });
        if (pr) c.textContent = pr[1];
      }
      this.tiles = [];
      this.score = 0;
      words.forEach((x, wi) => {
        const row = 1 + wi;
        const col0 = Math.max(1, Math.min(cols - x.s.length - 1, Math.round((cols - x.s.length) / 2 + (wi % 2 ? 1 : -1) * r.int(0, 2))));
        const span = K.span(x.w);
        x.s.split('').forEach((ch, k) => {
          const tl = U.el('div', 'tl-tile', bd);
          Object.assign(tl.style, { left: cs * 0.12 + (col0 + k) * cs + cs * 0.04 + 'px', top: cs * 0.12 + row * cs + cs * 0.04 + 'px', width: cs * 0.88 + 'px', height: cs * 0.88 + 'px', fontSize: cs * 0.6 + 'px', opacity: '0' });
          tl.innerHTML = `${K.esc(ch)}<small>${PTS[ch.toLowerCase()] || 0}</small>`;
          this.tiles.push({ tl, t: x.w.t - 0.03 + (k / x.s.length) * span, rot: r.range(-14, 14), pts: PTS[ch.toLowerCase()] || 0 });
        });
      });
      const sc = U.el('div', 't2', this.el);
      Object.assign(sc.style, { right: W * 0.04 + 'px', top: H * 0.06 + 'px', padding: `${u * 1}px ${u * 1.8}px`, borderRadius: u * 1.2 + 'px', background: 'rgba(15,12,10,0.72)', color: '#f3e3bf', font: `600 ${u * 1.4}px 'Oley Sans', sans-serif`, letterSpacing: '0.12em', textAlign: 'right' });
      sc.innerHTML = 'SCORE<div style="font:700 ' + u * 3.6 + 'px \'Oley Display\',sans-serif;letter-spacing:0">0</div>';
      this.sc = sc.lastChild;
      this.cs = cs;
    }
    update(t) {
      let sum = 0;
      for (const T of this.tiles) {
        const p = U.prog(T.t, T.t + 0.16, t);
        if (p > 0) sum += T.pts;
        if (p === T.p) continue;
        T.p = p;
        const e = U.e('outCubic', p);
        T.tl.style.opacity = p > 0 ? '1' : '0';
        T.tl.style.transform = `translateY(${(-(1 - e) * this.cs * 1.4).toFixed(1)}px) rotate(${((1 - e) * T.rot).toFixed(1)}deg) scale(${(1.25 - 0.25 * e).toFixed(3)})`;
      }
      if (sum !== this._sum) { this._sum = sum; this.sc.textContent = String(sum * (sum > 20 ? 2 : 1)); }
    }
    focus() { const T = this.tiles.filter((x) => this.mode.t >= x.t).pop() || this.tiles[0]; if (!T) return null; return { x: this.bd.offsetLeft + T.tl.offsetLeft + this.cs / 2, y: this.bd.offsetTop + T.tl.offsetTop + this.cs / 2 }; }
  }
  Ed.add('tiles', Tiles, { fam: 'thing', w: 0.95, max: 7, vars: 2, cams: ['still', 'push', 'track', 'drift'], trig: 'word words play game spell letters win lose score' });

  // ================================================================ 31. a slot machine landing on each word
  class Slots extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      let bok = '';
      for (let i = 0; i < 14; i++) bok += `radial-gradient(circle at ${r.int(0, 100)}% ${r.int(0, 100)}%, rgba(255,${r.int(150, 220)},${r.int(60, 140)},${r.range(0.15, 0.35).toFixed(2)}) 0, rgba(0,0,0,0) ${r.int(3, 7)}%),`;
      bg.style.background = bok + 'radial-gradient(ellipse at 50% 40%, #4a0d14, #12030a 75%)';
      const items = this.ws.length > 5 ? K.chunks(L, 5).map((c) => ({ t: c.t, s: c.text })) : this.ws.map((w) => ({ t: w.t, s: K.bare(w) }));
      const n = items.length;
      const cw = Math.min(W * 0.84, n * u * 20), chh = H * 0.62;
      const cab = U.el('div', 't2', this.el);
      Object.assign(cab.style, { left: (W - cw) / 2 + 'px', top: (H - chh) / 2 + 'px', width: cw + 'px', height: chh + 'px', borderRadius: u * 2.4 + 'px', padding: u * 1.6 + 'px', boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #f4f4f4 0%, #9c9ca2 18%, #e6e6ea 32%, #5d5d63 64%, #d8d8dc 82%, #77777d 100%)', boxShadow: '0 3vmin 7vmin rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.4)' });
      const inner = U.el('div', 't2', cab);
      Object.assign(inner.style, { inset: u * 1.6 + 'px', borderRadius: u * 1.4 + 'px', background: 'linear-gradient(#1a0508, #2b0a10)', boxShadow: 'inset 0 1vmin 2.5vmin rgba(0,0,0,0.8)' });
      const head = U.el('div', 't2', inner);
      Object.assign(head.style, { left: 0, right: 0, top: u * 1.2 + 'px', textAlign: 'center', color: '#ffd34d', font: `400 ${u * 3.6}px 'Oley Heavy', sans-serif`, letterSpacing: '0.18em', textShadow: '0 0 0.3em rgba(255,180,40,0.8)' });
      head.textContent = '★ JACKPOT ★';
      this.head = head;
      const rh = chh * 0.5, gap = u * 1.2;
      const rw = (cw - u * 3.2 - u * 4 - gap * (n - 1)) / n;
      const fill = ['7', '★', 'BAR', '♥', '♦', '♣', 'WIN'];
      for (let i = L.i - 1; i >= 0 && fill.length < 16; i--) { const P = this.ctx.tl.lines[i]; if (P) K.words(P).slice(0, 2).forEach((w) => fill.push(K.bare(w).toUpperCase())); }
      this.reels = items.map((it, i) => {
        const re = U.el('div', 'sl-reel', inner);
        Object.assign(re.style, { left: u * 2 + i * (rw + gap) + 'px', top: (chh - u * 3.2 - rh) / 2 + u * 2.2 + 'px', width: rw + 'px', height: rh + 'px' });
        const strip = U.el('div', 'sl-strip', re);
        const cellH = rh / 3;
        const N = 18;
        const fs = K.fit(it.s.toUpperCase(), "400 {s} 'Oley Heavy'", rw * 0.9, cellH * 0.62, cellH * 0.22);
        for (let k = 0; k < N; k++) {
          const d = U.el('div', '', strip, k === N - 2 ? it.s.toUpperCase() : r.pick(fill));
          Object.assign(d.style, { height: cellH + 'px', fontSize: (k === N - 2 ? fs : cellH * 0.42) + 'px', color: k === N - 2 ? '#c4161c' : ['#1b1b1b', '#c4161c', '#1d4fbd'][k % 3] });
        }
        const sh = U.el('div', 'ed-fill', re); sh.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 22%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.15) 78%, rgba(0,0,0,0.75) 100%)';
        return { re, strip, t: it.t, cellH, N, sp: r.range(14, 19) };
      });
      const pl = U.el('div', 't2', inner);
      Object.assign(pl.style, { left: u * 1 + 'px', right: u * 1 + 'px', top: (chh - u * 3.2) / 2 + u * 2.2 - 1 + 'px', height: '2px', background: 'rgba(255,40,40,0.85)', boxShadow: '0 0 8px rgba(255,40,40,0.9)' });
      this.bulbs = [];
      const per = Math.round(cw / (u * 3.2));
      for (let i = 0; i < per; i++) for (const yy of [-u * 0.2, chh - u * 1.2]) { const b = U.el('div', 't2', cab); Object.assign(b.style, { left: (i + 0.5) * (cw / per) - u * 0.5 + 'px', top: yy + 'px', width: u * 1 + 'px', height: u * 1 + 'px', borderRadius: '50%' }); this.bulbs.push({ b, i }); }
      this.end = items[n - 1].t + 0.25;
    }
    update(t) {
      for (const R of this.reels) {
        const stopT = R.t, land = 0.28;
        const total = (R.N - 3) * R.cellH;
        let y;
        if (t < stopT) { const v = R.sp * R.cellH; y = -(((t - this.L.t + 2) * v) % (total * 0.7)); R.strip.style.filter = 'blur(2.2px)'; }
        else { const k = U.prog(stopT, stopT + land, t); y = -total + (1 - U.e('outBack', k)) * R.cellH * 1.6; R.strip.style.filter = k < 0.4 ? 'blur(1px)' : 'none'; }
        R.strip.style.transform = `translateY(${y.toFixed(1)}px)`;
      }
      const win = t > this.end;
      const ph = Math.floor(t * (win ? 10 : 6));
      for (const B of this.bulbs) { const on = win ? ph % 2 === 0 : (B.i + ph) % 3 === 0; if (on !== B.on) { B.on = on; B.b.style.background = on ? 'radial-gradient(circle, #fff7cf, #ffcc33 60%)' : '#5a3a10'; B.b.style.boxShadow = on ? '0 0 1.2vmin #ffcc33' : 'none'; } }
      this.head.style.opacity = win ? (ph % 2 ? '1' : '0.55') : '0.9';
    }
    focus() { const R = this.reels.filter((x) => this.mode.t >= x.t - 0.2).pop() || this.reels[0]; const re = R.re; const p = K.off(re, this.el); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }
  }
  Ed.add('slots', Slots, { fam: 'thing', w: 1, max: 14, vars: 1, moods: { hype: 1.8, angry: 1.2, sad: 0.5 }, cams: ['still', 'push', 'hand', 'track'], trig: 'luck lucky win money gamble bet chance play game rich jackpot vegas dice cash' });

  // ================================================================ 32. a boarding pass
  class Ticket extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 60% 55% at 50% 45%, rgba(255,240,220,0.18), rgba(0,0,0,0.6)), url(${K.tex(this.v % 2 ? 'concrete' : 'wood')})`;
      bg.style.backgroundSize = `100% 100%, ${this.v % 2 ? 700 : 1000}px auto`;
      const tw = Math.min(W * 0.78, H * 1.75), th = tw * 0.4;
      const wrap = U.el('div', 'ed-fill', this.el); wrap.style.perspective = W * 1.6 + 'px';
      const card = U.el('div', 't2', wrap);
      Object.assign(card.style, { left: (W - tw) / 2 + 'px', top: (H - th) / 2 + 'px', width: tw + 'px', height: th + 'px', transform: `rotateX(16deg) rotateZ(${r.range(-5, -2).toFixed(1)}deg)`, transformStyle: 'preserve-3d', fontFamily: "'Oley Sans', sans-serif", color: '#1c1c1c', fontSize: tw * 0.021 + 'px' });
      const acc = K.accent(this, 0.55, 0.75);
      const main = U.el('div', 't2', card);
      Object.assign(main.style, { left: 0, top: 0, width: tw * 0.76 + 'px', height: th + 'px', background: '#fbfaf6', borderRadius: `${tw * 0.018}px 0 0 ${tw * 0.018}px`, overflow: 'hidden', boxShadow: '0 2vmin 4vmin rgba(0,0,0,0.5)' });
      const stub = U.el('div', 't2', card);
      Object.assign(stub.style, { left: tw * 0.76 + 'px', top: 0, width: tw * 0.24 + 'px', height: th + 'px', background: '#fbfaf6', borderRadius: `0 ${tw * 0.018}px ${tw * 0.018}px 0`, overflow: 'hidden', boxShadow: '0 2vmin 4vmin rgba(0,0,0,0.5)', borderLeft: '2px dashed rgba(0,0,0,0.25)', boxSizing: 'border-box', transformOrigin: '0 100%' });
      this.stub = stub;
      const plane = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" fill="currentColor"/></svg>`;
      const band = (el, w) => { const b = U.el('div', '', el); Object.assign(b.style, { height: th * 0.2 + 'px', background: `linear-gradient(90deg, ${acc}, ${U.hex(U.shiftHue(U.parseHex(acc), 25, 1, 0.8))})`, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6em', padding: `0 ${w * 0.05}px`, fontWeight: 700, letterSpacing: '0.12em', fontSize: '1.1em' }); return b; };
      const b1 = band(main, tw * 0.76); b1.innerHTML = `<span style="font-size:1.6em">${plane}</span><span style="flex:1">OLEY AIR</span><span style="font-weight:500;opacity:0.85">BOARDING PASS</span>`;
      const b2 = band(stub, tw * 0.24); b2.innerHTML = `<span style="font-size:1.4em">${plane}</span><span>OLEY AIR</span>`;
      const code = (w) => (K.clean(K.bare(w)).replace(/[^A-Za-z]/g, '').toUpperCase() + 'XXX').slice(0, 3);
      const first = this.ws.find((w) => !O.STOP.has(w.w)) || this.ws[0];
      const from = code(first), to = code(K.key(L));
      const tr = this.ctx.track || {};
      const now = K.now();
      const brd = new Date(now.getTime() + 35 * 60000);
      const gate = String.fromCharCode(65 + r.int(0, 5)) + r.int(1, 39), seat = r.int(1, 38) + 'ABCDEF'[r.int(0, 5)], fl = 'OL ' + r.int(100, 999);
      const body = U.el('div', '', main);
      Object.assign(body.style, { padding: `${th * 0.06}px ${tw * 0.035}px`, display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: `${th * 0.04}px ${tw * 0.02}px` });
      const f = (lab, val, span) => { const d = U.el('div', 'bp-f', body); d.innerHTML = `<small>${lab}</small><b>${val}</b>`; if (span) d.style.gridColumn = span; return d; };
      f('PASSENGER', K.esc(String(tr.artist || 'GUEST').toUpperCase().slice(0, 22)), 'span 2');
      f('FLIGHT', fl); f('DATE', K.esc(now.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()));
      const rt = f('', `<span style="font-size:2.6em;letter-spacing:0.02em">${from}</span> <span style="font-size:1.6em;color:${acc};vertical-align:0.3em">${plane}</span> <span style="font-size:2.6em;letter-spacing:0.02em">${to}</span>`, 'span 2');
      rt.firstChild.remove();
      f('GATE', gate); f('SEAT', seat);
      const dest = U.el('div', '', main);
      Object.assign(dest.style, { position: 'absolute', left: tw * 0.035 + 'px', right: tw * 0.035 + 'px', bottom: th * 0.08 + 'px' });
      dest.innerHTML = `<div style="font-size:0.62em;letter-spacing:0.14em;opacity:0.6;font-weight:600;margin-bottom:0.3em">DESTINATION · BOARDING ${K.clock(brd)}</div>`;
      const dl = U.el('div', '', dest); Object.assign(dl.style, { fontWeight: 800, fontSize: (this.ws.length > 7 ? 1.75 : 2.3) + 'em', lineHeight: '1.08', letterSpacing: '-0.01em', textTransform: 'uppercase' });
      this.words = K.wordEls(dl, this.ws);
      const sb = U.el('div', '', stub);
      Object.assign(sb.style, { padding: `${th * 0.06}px ${tw * 0.02}px`, fontSize: '0.92em' });
      sb.innerHTML = `<div class="bp-f" style="margin-bottom:0.6em"><small>FROM → TO</small><b style="font-size:1.6em">${from} → ${to}</b></div><div class="bp-f" style="margin-bottom:0.6em"><small>GATE · SEAT</small><b>${gate} · ${seat}</b></div>`;
      let bars = '';
      for (let i = 0; i < 40; i++) bars += `<i style="display:inline-block;height:100%;width:${r.int(1, 3)}px;margin-right:${r.int(1, 3)}px;background:#111"></i>`;
      const bc = U.el('div', '', stub); Object.assign(bc.style, { position: 'absolute', left: tw * 0.02 + 'px', right: tw * 0.02 + 'px', bottom: th * 0.08 + 'px', height: th * 0.18 + 'px', overflow: 'hidden', whiteSpace: 'nowrap' }); bc.innerHTML = bars;
      [0, 1].forEach((k) => { const h = U.el('div', 't2', card); Object.assign(h.style, { left: tw * 0.76 - th * 0.04 + 'px', top: k ? th - th * 0.04 + 'px' : -th * 0.04 + 'px', width: th * 0.08 + 'px', height: th * 0.08 + 'px', borderRadius: '50%', background: 'rgba(20,16,12,0.92)' }); });
      this.card = card;
    }
    update(t) {
      K.wordAnim(this.words, t, 0.2);
      const L = this.L;
      const k = U.e('inOutCubic', U.prog(L.singEnd + 0.1, L.singEnd + 0.1 + Math.min(0.5, this.tail * 0.8), t));
      this.stub.style.transform = k > 0 ? `translate(${(k * this.u * 4).toFixed(1)}px,${(k * this.u * 2).toFixed(1)}px) rotate(${(k * 9).toFixed(2)}deg)` : 'none';
    }
    focus() { const c = this.card; return { x: c.offsetLeft + c.offsetWidth * 0.38, y: c.offsetTop + c.offsetHeight * 0.75 }; }
  }
  Ed.add('ticket', Ticket, { fam: 'thing', w: 1, max: 12, vars: 2, cams: ['still', 'push', 'drift', 'track'], needTrig: false, trig: 'fly flight flying plane leave leaving away far travel trip destination home somewhere anywhere go going ticket' });

  // ================================================================ 33. the front page
  class Paper extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      this.el.style.background = '#1a1918';
      const pw = Math.min(W * 0.78, H * 1.1), ph = pw * 1.3;
      const pg = U.el('div', 't2', this.el);
      Object.assign(pg.style, { left: (W - pw) / 2 + 'px', top: H * 0.06 + 'px', width: pw + 'px', height: ph + 'px', backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0.07) 50%, rgba(255,255,255,0.08) 51%, rgba(0,0,0,0) 54%), url(${K.tex('paper')})`, backgroundColor: '#e8e3d6', backgroundBlendMode: 'normal, multiply', boxShadow: '0 2vmin 6vmin rgba(0,0,0,0.6)', color: '#151515', padding: `${pw * 0.04}px ${pw * 0.05}px`, boxSizing: 'border-box', fontFamily: "'Oley Serif', Georgia, serif", transformOrigin: '50% 40%' });
      this.pg = pg;
      const tr = this.ctx.track || {};
      const fs = pw / 46;
      const mast = U.el('div', '', pg);
      Object.assign(mast.style, { textAlign: 'center', font: `700 ${fs * 4.4}px 'Oley Serif', serif`, letterSpacing: '-0.01em', lineHeight: '1', paddingBottom: fs * 0.5 + 'px' });
      mast.textContent = 'The ' + K.cap(U.firstName(tr.artist) || 'Evening') + ' ' + r.pick(['Gazette', 'Herald', 'Chronicle', 'Courier', 'Echo']);
      const dl = U.el('div', '', pg);
      Object.assign(dl.style, { display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #151515', borderBottom: '1px solid #151515', padding: `${fs * 0.3}px 0`, font: `600 ${fs * 0.8}px 'Oley Sans', sans-serif`, letterSpacing: '0.12em', textTransform: 'uppercase' });
      dl.innerHTML = `<span>Vol. ${r.int(12, 140)}</span><span>${K.esc(K.now().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))}</span><span>Price ${r.int(1, 3)}.${r.int(10, 99)}</span>`;
      const hl = U.el('div', '', pg);
      const hsz = fs * (this.ws.length > 8 ? 3.4 : this.ws.length > 5 ? 4.2 : 5.4);
      Object.assign(hl.style, { font: `900 ${hsz.toFixed(1)}px 'Oley Display', 'Oley Sans', sans-serif`, letterSpacing: '-0.03em', lineHeight: '0.98', textAlign: 'center', margin: `${fs * 0.9}px 0 ${fs * 0.6}px`, textTransform: this.v % 2 ? 'uppercase' : 'none' });
      this.words = K.wordEls(hl, this.ws);
      const prev = this.ctx.tl.lines[L.i - 1];
      const sub = U.el('div', '', pg, prev ? '“' + K.text(prev) + '”' : (tr.title || ''));
      Object.assign(sub.style, { font: `italic 500 ${fs * 1.25}px 'Oley Serif', serif`, textAlign: 'center', marginBottom: fs * 0.8 + 'px', opacity: '0.85' });
      const row = U.el('div', '', pg); Object.assign(row.style, { display: 'flex', gap: fs * 1.4 + 'px', borderTop: '1px solid #151515', paddingTop: fs * 0.8 + 'px' });
      const ph1 = U.el('div', '', row); Object.assign(ph1.style, { position: 'relative', flex: '0 0 46%', height: pw * 0.42 + 'px', overflow: 'hidden' });
      K.cover(this, ph1, 'filter:grayscale(1) contrast(1.35) brightness(1.05)');
      const dots = U.el('div', 'ed-fill', ph1); dots.style.background = 'radial-gradient(circle, rgba(0,0,0,0) 38%, rgba(0,0,0,0.38) 40%) 0 0 / 4px 4px'; dots.style.mixBlendMode = 'multiply';
      const cap = U.el('div', '', ph1, ''); void cap;
      const col = U.el('div', 'np-col', row); Object.assign(col.style, { flex: '1', font: `400 ${fs * 0.78}px 'Oley Serif', serif`, lineHeight: '1.38', columnCount: '2', height: pw * 0.42 + 'px', overflow: 'hidden' });
      const pool = [];
      for (let i = Math.max(0, L.i - 12); i < L.i; i++) { const P = this.ctx.tl.lines[i]; if (P) pool.push(K.text(P)); }
      const filler = ['sources say', 'witnesses described', 'late last night', 'the city', 'it remains unclear', 'officials declined to comment', 'according to', 'a spokesperson said', 'in a statement'];
      let txt = '';
      for (let i = 0; i < 26; i++) txt += (i % 3 === 0 && pool.length ? r.pick(pool) : K.cap(r.pick(filler))) + (i % 4 === 3 ? '. ' : ', ');
      col.textContent = txt;
      this.spin = this.v % 2 === 0;
    }
    update(t) {
      const L = this.L;
      K.wordAnim(this.words, t, 0.18, (it, p, el) => { el.style.opacity = p > 0 ? '1' : '0'; });
      if (this.spin) {
        const k = U.e('outCubic', U.prog(L.t - 0.3, L.t + 0.35, t));
        this.pg.style.transform = `rotate(${((1 - k) * 720).toFixed(1)}deg) scale(${(0.08 + 0.92 * k).toFixed(4)})`;
      } else this.pg.style.transform = `rotate(${(-1.5).toFixed(1)}deg)`;
    }
    focus() { return { x: this.W / 2, y: this.pg.offsetTop + this.pg.offsetHeight * 0.2 }; }
  }
  Ed.add('paper', Paper, { fam: 'thing', w: 1, max: 14, vars: 2, cams: ['still', 'push', 'drift', 'track'], trig: 'news everybody world heard story famous town city talk talking people breaking headline' });

  // ================================================================ 34. an LED dot-matrix ticker
  class Led extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,255,255,0.08), rgba(0,0,0,0.75)), url(${K.tex('concrete')})`;
      bg.style.backgroundSize = '100% 100%, 600px auto';
      const col = [[255, 170, 30], [255, 50, 40], [60, 255, 110], [235, 240, 255]][this.v % 4];
      this.col = col;
      const rows = 16;
      const pw = W * 0.86, pitch = Math.min(pw / 92, (H * 0.36) / rows);
      const cols = Math.floor(pw / pitch);
      const ph = rows * pitch;
      const fr = U.el('div', 't2', this.el);
      const fx = (W - cols * pitch) / 2, fy = (H - ph) / 2;
      Object.assign(fr.style, { left: fx - u * 1.6 + 'px', top: fy - u * 1.6 + 'px', width: cols * pitch + u * 3.2 + 'px', height: ph + u * 3.2 + 'px', borderRadius: u * 0.8 + 'px', background: 'linear-gradient(180deg,#3b3c40,#1a1b1d 40%,#2a2b2e)', boxShadow: '0 2vmin 5vmin rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2)' });
      [[0.6, 0.6], [0.6, 99.4], [99.4, 0.6], [99.4, 99.4]].forEach(([a, b]) => { const s = U.el('div', '', fr); Object.assign(s.style, { position: 'absolute', left: `calc(${a}% - ${u * 0.5}px)`, top: `calc(${b}% - ${u * 0.5}px)`, width: u * 0.9 + 'px', height: u * 0.9 + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ddd, #555)' }); });
      const mk = () => { const c = document.createElement('canvas'); const d = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(cols * pitch * d); c.height = Math.round(ph * d); Object.assign(c.style, { position: 'absolute', left: fx + 'px', top: fy + 'px', width: cols * pitch + 'px', height: ph + 'px' }); this.el.appendChild(c); return [c, c.getContext('2d'), d]; };
      [this.cv, this.x, this.d] = mk();
      [this.gc, this.gx] = mk();
      this.gc.style.filter = `blur(${(pitch * 0.9).toFixed(1)}px)`; this.gc.style.mixBlendMode = 'screen'; this.gc.style.opacity = '0.9';
      this.rows = rows; this.cols = cols; this.pitch = pitch;
      this.off = document.createElement('canvas'); this.off.width = 2048; this.off.height = rows;
      this.ox = this.off.getContext('2d', { willReadFrequently: true });
      this.shift = 0;
    }
    render(text) {
      const o = this.ox;
      o.clearRect(0, 0, 2048, this.rows);
      o.font = "700 13px 'Oley Sans', sans-serif"; o.textBaseline = 'alphabetic'; o.fillStyle = '#fff';
      o.fillText(text, 1, 12.5);
      const w = Math.min(2048, Math.ceil(o.measureText(text).width) + 2);
      const img = o.getImageData(0, 0, Math.max(1, w), this.rows).data;
      return { w, on: (x, y) => x >= 0 && x < w && img[(y * w + x) * 4 + 3] > 110 };
    }
    update(t, dt) {
      const L = this.L;
      const text = K.sung(this.ws, t, true).toUpperCase();
      if (text !== this._t) { this._t = text; this.bm = this.render(text); this.dirty = true; }
      const over = this.bm ? Math.max(0, this.bm.w - this.cols + 2) : 0;
      const sh = Math.round(over);
      const blink = t > L.singEnd + 0.3 ? Math.floor((t - L.singEnd) * 3) % 2 : 0;
      if (sh !== this.shift || this.dirty || blink !== this._b) {
        this.shift = sh; this.dirty = false; this._b = blink;
        const x = this.x, g = this.gx, d = this.d, p = this.pitch, c = this.col;
        x.setTransform(d, 0, 0, d, 0, 0); g.setTransform(d, 0, 0, d, 0, 0);
        x.fillStyle = '#060606'; x.fillRect(0, 0, this.cols * p, this.rows * p);
        g.clearRect(0, 0, this.cols * p, this.rows * p);
        const offC = `rgba(${Math.round(c[0] * 0.13)},${Math.round(c[1] * 0.13)},${Math.round(c[2] * 0.13)},1)`;
        const onC = `rgb(${c[0]},${c[1]},${c[2]})`, core = `rgb(${Math.round(U.lerp(c[0], 255, 0.6))},${Math.round(U.lerp(c[1], 255, 0.6))},${Math.round(U.lerp(c[2], 255, 0.6))})`;
        for (let yy = 0; yy < this.rows; yy++) for (let xx = 0; xx < this.cols; xx++) {
          const on = !blink && this.bm && this.bm.on(xx + sh, yy);
          const cx = (xx + 0.5) * p, cy = (yy + 0.5) * p;
          x.fillStyle = on ? onC : offC;
          x.beginPath(); x.arc(cx, cy, p * 0.38, 0, Math.PI * 2); x.fill();
          if (on) { x.fillStyle = core; x.beginPath(); x.arc(cx - p * 0.06, cy - p * 0.06, p * 0.16, 0, Math.PI * 2); x.fill(); g.fillStyle = onC; g.beginPath(); g.arc(cx, cy, p * 0.55, 0, Math.PI * 2); g.fill(); }
        }
      }
      void dt;
    }
    focus() { return { x: this.W / 2, y: this.H / 2 }; }
  }
  Ed.add('led', Led, { fam: 'thing', w: 1.05, max: 14, vars: 4, adlib: true, cams: ['still', 'push', 'drift', 'dutch', 'hand'], trig: 'news now everybody world loud live breaking open late night city' });

  // ================================================================ 35. a highway sign at dusk
  class Sign extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const pal = this.pal;
      const top = U.rgba(U.mix(pal.dark, [8, 12, 30], 0.6), 1), mid = U.rgba(U.mix(U.vivid(pal.vivid, 0.5, 0.8), [255, 120, 60], 0.45), 1);
      this.el.style.background = `linear-gradient(180deg, ${top} 0%, ${U.rgba(U.mix(U.parseHex('#2a2f5a'), pal.second, 0.3), 1)} 42%, ${mid} 70%, #ffb36b 78%, #1a1410 78.2%)`;
      const sun = U.el('div', 'ed-fill', this.el); sun.style.background = 'radial-gradient(ellipse 30% 14% at 62% 78%, rgba(255,230,170,0.9), rgba(255,170,90,0.25) 40%, rgba(0,0,0,0) 70%)';
      const road = U.el('div', 'ed-fill', this.el); road.style.perspective = H * 0.6 + 'px'; road.style.perspectiveOrigin = '50% 0%';
      const pl = U.el('div', 't2', road);
      Object.assign(pl.style, { left: -W + 'px', width: W * 3 + 'px', top: H * 0.78 + 'px', height: H * 3 + 'px', transformOrigin: '50% 0%', transform: 'rotateX(84deg)',
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0) 49.6%, rgba(255,214,80,0.9) 49.6%, rgba(255,214,80,0.9) 49.8%, rgba(0,0,0,0) 49.8%, rgba(0,0,0,0) 50.2%, rgba(255,214,80,0.9) 50.2%, rgba(255,214,80,0.9) 50.4%, rgba(0,0,0,0) 50.4%), repeating-linear-gradient(180deg, rgba(240,240,240,0.85) 0 ${H * 0.12}px, rgba(0,0,0,0) ${H * 0.12}px ${H * 0.3}px), url(${K.tex('asphalt')})`,
        backgroundSize: `100% 100%, 0.35% 100%, 400px auto`, backgroundPosition: '0 0, 60% 0, 0 0', backgroundRepeat: 'no-repeat, no-repeat, repeat', filter: 'brightness(0.55)' });
      this.road = pl;
      const g = U.el('div', 't2', this.el);
      const sw = Math.min(W * 0.62, u * 70), sh = sw * 0.42;
      Object.assign(g.style, { left: (W - sw) / 2 + 'px', top: H * 0.25 + 'px', width: sw + 'px', height: sh + 'px', transformOrigin: '50% 100%' });
      this.g = g;
      [-0.18, 1.12].forEach((fx) => { const p = U.el('div', 't2', g); Object.assign(p.style, { left: sw * fx + 'px', top: sh * 0.2 + 'px', width: sw * 0.05 + 'px', height: H + 'px', background: 'linear-gradient(90deg,#2a2c30,#5a5d63 40%,#2a2c30)' }); });
      const beam = U.el('div', 't2', g); Object.assign(beam.style, { left: -sw * 0.2 + 'px', width: sw * 1.4 + 'px', top: sh * 0.25 + 'px', height: sh * 0.08 + 'px', background: 'repeating-linear-gradient(45deg, #3b3e44 0 6px, #24262a 6px 12px)', boxShadow: '0 0.6vmin 1.2vmin rgba(0,0,0,0.5)' });
      const panel = U.el('div', 't2', g);
      Object.assign(panel.style, { left: 0, top: 0, width: sw + 'px', height: sh + 'px', borderRadius: sw * 0.03 + 'px', background: `linear-gradient(170deg, rgba(255,255,255,0.12), rgba(0,0,0,0.12)), url(${K.tex('grain')}) #0b6e3b`, backgroundSize: '100% 100%, 128px', backgroundBlendMode: 'normal, soft-light', boxShadow: `inset 0 0 0 ${sw * 0.012}px #0b6e3b, inset 0 0 0 ${sw * 0.02}px #f2f2f2, 0 1.5vmin 3vmin rgba(0,0,0,0.55)`, color: '#f4f4f4', fontFamily: "'Oley Sans', sans-serif" });
      const tab = U.el('div', 't2', g, 'EXIT ' + r.int(4, 88));
      Object.assign(tab.style, { left: sw * 0.04 + 'px', top: -sh * 0.2 + 'px', padding: `${sh * 0.03}px ${sw * 0.03}px`, background: '#0b6e3b', color: '#f4f4f4', font: `600 ${sh * 0.11}px 'Oley Sans', sans-serif`, borderRadius: `${sw * 0.015}px ${sw * 0.015}px 0 0`, boxShadow: `inset 0 0 0 ${sw * 0.008}px #f2f2f2` });
      const tx = U.el('div', 't2', panel);
      const fsz = K.fit(K.text(L), "600 {s} 'Oley Sans'", sw * 0.78 * (this.ws.length > 4 ? 2 : 1), sh * 0.24, sh * 0.1);
      Object.assign(tx.style, { left: sw * 0.07 + 'px', right: sw * 0.2 + 'px', top: '50%', transform: 'translateY(-50%)', font: `600 ${fsz.toFixed(1)}px 'Oley Sans', sans-serif`, lineHeight: '1.12', letterSpacing: '0.01em' });
      this.words = K.wordEls(tx, this.ws);
      const ar = U.el('div', 't2', panel); Object.assign(ar.style, { right: sw * 0.05 + 'px', bottom: sh * 0.12 + 'px', fontSize: sh * 0.34 + 'px', transform: `rotate(${this.v % 2 ? 45 : -45}deg)` }); ar.innerHTML = K.icon('up');
      const mi = U.el('div', 't2', panel, `${r.pick(['½', '1', '1 ½', '2'])} MILE`); Object.assign(mi.style, { right: sw * 0.04 + 'px', top: sh * 0.1 + 'px', font: `600 ${sh * 0.1}px 'Oley Sans', sans-serif` });
      this.sweep = U.el('div', 'ed-fill', panel); this.sweep.style.background = 'linear-gradient(100deg, rgba(255,255,255,0) 40%, rgba(255,255,240,0.22) 50%, rgba(255,255,255,0) 60%)'; this.sweep.style.backgroundSize = '300% 100%'; this.sweep.style.borderRadius = 'inherit';
      K.grain(this.el, 0.14);
    }
    update(t, dt, A) {
      const L = this.L, life = U.prog(L.t - 0.25, L.end, t);
      K.wordAnim(this.words, t, 0.25, (it, p, el) => { el.style.opacity = (0.25 + 0.75 * U.sat(p * 2)).toFixed(3); el.style.textShadow = p > 0 && p < 1 ? `0 0 ${(0.3 * (1 - p)).toFixed(2)}em rgba(255,255,230,0.9)` : 'none'; });
      const s = 0.86 + 0.24 * U.e('inQuad', life);
      this.g.style.transform = `translateY(${(-life * this.H * 0.06 + Math.sin(this.age * 7) * 1.2).toFixed(1)}px) scale(${s.toFixed(4)})`;
      this.road.style.backgroundPosition = `0 0, 60% ${(this.age * this.H * 1.6).toFixed(0)}px, 0 ${(this.age * this.H * 1.6).toFixed(0)}px`;
      this.sweep.style.backgroundPosition = `${(100 - life * 160).toFixed(1)}% 0`;
      void dt; void A;
    }
    focus() { return { x: this.W / 2, y: this.g.offsetTop + this.g.offsetHeight / 2 }; }
  }
  Ed.add('sign', Sign, { fam: 'thing', w: 0.95, max: 10, vars: 2, cams: ['still', 'push', 'hand', 'drift'], trig: 'road highway drive driving exit way home miles away leave leaving next town city go going street direction lost' });

  // ================================================================ 36. a heart monitor
  class Ecg extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      this.el.style.background = 'radial-gradient(ellipse at 50% 50%, #2c2e31, #0c0d0e)';
      const bz = U.el('div', 't2', this.el);
      const mw = W * 0.86, mh = H * 0.8;
      Object.assign(bz.style, { left: (W - mw) / 2 + 'px', top: (H - mh) / 2 + 'px', width: mw + 'px', height: mh + 'px', borderRadius: u * 2 + 'px', background: 'linear-gradient(160deg,#4b4d52,#26282b 40%,#1b1c1f)', boxShadow: '0 2vmin 6vmin rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18)' });
      const sc = U.el('div', 't2', bz);
      const pad = u * 2;
      Object.assign(sc.style, { left: pad + 'px', top: pad + 'px', right: pad + 'px', bottom: pad + 'px', borderRadius: u * 0.8 + 'px', overflow: 'hidden', background: `linear-gradient(rgba(0,255,120,0.05) 1px, transparent 1px) 0 0 / ${u * 2.4}px ${u * 2.4}px, linear-gradient(90deg, rgba(0,255,120,0.05) 1px, transparent 1px) 0 0 / ${u * 2.4}px ${u * 2.4}px, #020604`, boxShadow: 'inset 0 0 4vmin rgba(0,0,0,0.9)' });
      const sw = mw - pad * 2, sh = mh - pad * 2;
      this.sw = sw; this.shh = sh;
      const cw = sw * 0.72, ch = sh * 0.5;
      this.cv = document.createElement('canvas');
      const d = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.round(cw * d); this.cv.height = Math.round(ch * d); this.d = d;
      Object.assign(this.cv.style, { position: 'absolute', left: u * 1.5 + 'px', top: sh * 0.1 + 'px', width: cw + 'px', height: ch + 'px', filter: 'drop-shadow(0 0 3px rgba(60,255,140,0.7))' });
      sc.appendChild(this.cv);
      this.cx = this.cv.getContext('2d'); this.cw = cw; this.ch = ch;
      const side = U.el('div', 't2', sc);
      Object.assign(side.style, { left: cw + u * 3 + 'px', right: u * 1.5 + 'px', top: sh * 0.08 + 'px', fontFamily: "'Oley Sans', sans-serif" });
      const blk = (lab, col, big) => { const b = U.el('div', '', side); Object.assign(b.style, { color: col, marginBottom: u * 1.4 + 'px' }); b.innerHTML = `<div style="font-size:${u * 1.2}px;font-weight:600;letter-spacing:0.1em;opacity:0.8">${lab}</div>`; const v = U.el('div', '', b, big); Object.assign(v.style, { fontSize: u * 6 + 'px', fontWeight: 600, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }); return v; };
      this.hr = blk('HR  bpm', '#43ff8a', '--');
      blk('SpO₂ %', '#3fd0ff', String(95 + (U.hash(L.text) % 5))).style.fontSize = u * 4.4 + 'px';
      blk('NIBP mmHg', '#f1f1f1', '118/76').style.fontSize = u * 3.4 + 'px';
      this.alarm = U.el('div', '', side, ''); Object.assign(this.alarm.style, { color: '#ff3b3b', font: `700 ${u * 1.8}px 'Oley Sans', sans-serif`, letterSpacing: '0.12em' });
      const lyr = U.el('div', 't2', sc);
      Object.assign(lyr.style, { left: u * 2 + 'px', right: u * 2 + 'px', bottom: sh * 0.08 + 'px', color: '#43ff8a', font: `600 ${u * 3}px var(--mono)`, lineHeight: '1.25', textShadow: '0 0 0.4em rgba(60,255,140,0.6)' });
      this.words = K.wordEls(lyr, this.ws);
      const scan = U.el('div', 'ed-fill', sc); scan.style.background = 'repeating-linear-gradient(180deg, rgba(0,0,0,0.18) 0 1px, rgba(0,0,0,0) 1px 3px)';
      const ks = new Set(L.words.map((w) => w.w));
      this.flat = ['die', 'dead', 'death', 'dying', 'gone', 'over', 'end', 'stop', 'stopped', 'kill', 'killing'].some((w) => ks.has(w)) ? K.key(L).t : 1e9;
      this.bpm = { hype: 118, angry: 126, sad: 64, tender: 70 }[L.mood] || 84;
      this.sweep = 2.8;
      this.lastX = -1;
    }
    val(tt) {
      if (tt > this.flat) return 0;
      const P = 60 / this.bpm;
      let v = 0;
      const k0 = Math.floor(tt / P);
      for (let k = k0 - 1; k <= k0 + 1; k++) {
        const b = k * P + 0.35, x = tt - b;
        const gs = (m, s, a) => a * Math.exp(-((x - m) * (x - m)) / (2 * s * s));
        v += gs(-0.17, 0.025, 0.12) + gs(-0.035, 0.01, -0.13) + gs(0, 0.011, 1) + gs(0.032, 0.012, -0.26) + gs(0.23, 0.05, 0.28);
      }
      return v;
    }
    update(t) {
      const x = this.cx, d = this.d, w = this.cw, h = this.ch;
      x.setTransform(d, 0, 0, d, 0, 0);
      const head = ((t % this.sweep) / this.sweep) * w;
      const yOf = (tt) => h * 0.62 - this.val(tt) * h * 0.5;
      x.lineWidth = Math.max(1.5, this.u * 0.22); x.strokeStyle = '#43ff8a'; x.lineJoin = 'round';
      if (this.lastX < 0 || head < this.lastX - 1 || head - this.lastX > w * 0.3) {
        x.clearRect(0, 0, w, h);
        x.beginPath();
        for (let px = 0; px <= head; px += 1.5) { const tt = t - (head - px) / w * this.sweep; px === 0 ? x.moveTo(px, yOf(tt)) : x.lineTo(px, yOf(tt)); }
        x.stroke();
      } else {
        x.clearRect(this.lastX, 0, Math.min(w - this.lastX, head - this.lastX + w * 0.04), h);
        x.beginPath();
        for (let px = this.lastX; px <= head; px += 1.5) { const tt = t - (head - px) / w * this.sweep; px === this.lastX ? x.moveTo(px, yOf(tt)) : x.lineTo(px, yOf(tt)); }
        x.stroke();
      }
      x.fillStyle = '#c9ffd9'; x.beginPath(); x.arc(head, yOf(t), this.u * 0.45, 0, Math.PI * 2); x.fill();
      this.lastX = head;
      const flat = t > this.flat;
      const s = flat ? '0' : String(this.bpm + Math.round(Math.sin(t * 0.7) * 2));
      if (s !== this._s) { this._s = s; this.hr.textContent = s; }
      const al = flat ? (Math.floor(t * 4) % 2 ? 'ASYSTOLE' : '') : '';
      if (al !== this._al) { this._al = al; this.alarm.textContent = al; }
      K.wordAnim(this.words, t, 0.15, (it, p, el) => { el.style.opacity = p > 0 ? '1' : '0'; el.style.color = it.w.key ? '#e9fff0' : ''; });
    }
    focus() { return { x: this.W / 2, y: this.H * 0.42 }; }
  }
  Ed.add('ecg', Ecg, { fam: 'thing', w: 0.9, max: 14, needTrig: true, cams: ['still', 'push', 'drift', 'hand'], trig: 'heart heartbeat beat beating alive breathe breathing breath die dead dying hospital pulse life living heal' });

  // ================================================================ 37. a stock chart: the line is the company
  class Stock extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      this.el.style.background = 'linear-gradient(180deg, #0c1016, #06080b)';
      this.el.style.fontFamily = "'Oley Sans', sans-serif";
      const ks = new Set(L.words.map((w) => w.w));
      const down = L.mood === 'sad' || L.mood === 'angry' || ['fall', 'falling', 'down', 'lose', 'lost', 'crash', 'broke', 'broken', 'never', 'nothing'].some((w) => ks.has(w));
      this.down = down;
      const col = down ? '#ff4d5a' : '#20d28b';
      this.col = col;
      const sym = (K.clean(K.bare(K.key(L))).replace(/[^A-Za-z]/g, '').toUpperCase() + 'XXXX').slice(0, Math.min(4, Math.max(3, K.bare(K.key(L)).length)));
      const hd = U.el('div', 't2', this.el);
      Object.assign(hd.style, { left: W * 0.07 + 'px', right: W * 0.07 + 'px', top: H * 0.08 + 'px', color: '#e8edf3' });
      hd.innerHTML = `<div style="display:flex;gap:${u}px;align-items:center;font-size:${u * 1.5}px;font-weight:600;color:#8a96a6"><span style="background:#1c2633;color:#cfe3ff;padding:0.2em 0.6em;border-radius:0.4em;letter-spacing:0.08em">${sym}</span><span>OLEY · ${K.esc(((this.ctx.track && this.ctx.track.artist) || 'MARKET').toUpperCase())}</span></div>`;
      const nm = U.el('div', '', hd); Object.assign(nm.style, { fontSize: u * (this.ws.length > 7 ? 3.4 : 4.4) + 'px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: '1.1', marginTop: u * 0.8 + 'px' });
      this.words = K.wordEls(nm, this.ws);
      const pr = U.el('div', '', hd); Object.assign(pr.style, { display: 'flex', alignItems: 'baseline', gap: u * 1.4 + 'px', marginTop: u * 0.8 + 'px' });
      this.price = U.el('span', '', pr, ''); Object.assign(this.price.style, { fontSize: u * 3.4 + 'px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' });
      this.chg = U.el('span', '', pr, ''); Object.assign(this.chg.style, { fontSize: u * 1.6 + 'px', fontWeight: 700, color: col, background: down ? 'rgba(255,77,90,0.14)' : 'rgba(32,210,139,0.14)', padding: '0.2em 0.6em', borderRadius: '0.4em', fontVariantNumeric: 'tabular-nums' });
      const cw = W * 0.86, chh = H * 0.42, cx0 = W * 0.07, cy0 = H * 0.44;
      const svg = U.svg('svg', { width: cw, height: chh, viewBox: `0 0 ${cw} ${chh}` }, this.el);
      Object.assign(svg.style, { position: 'absolute', left: cx0 + 'px', top: cy0 + 'px', overflow: 'visible' });
      for (let i = 0; i <= 4; i++) U.svg('line', { x1: 0, x2: cw, y1: (i / 4) * chh, y2: (i / 4) * chh, stroke: 'rgba(255,255,255,0.06)', 'stroke-dasharray': '4 6' }, svg);
      const N = 140, pts = [];
      let v = 0.5, drift = (down ? -1 : 1) * 0.0045;
      for (let i = 0; i < N; i++) { v += drift + r.range(-0.022, 0.022) + (i > N * 0.7 ? drift * 2.2 : 0); v = U.clamp(v, 0.04, 0.96); pts.push(v); }
      const P = pts.map((p, i) => [(i / (N - 1)) * cw, chh - p * chh]);
      const d = 'M ' + P.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');
      const defs = U.svg('defs', {}, svg);
      const gid = 'stk' + L.i + '_' + r.int(0, 1e6);
      const lg = U.svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      U.svg('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': 0.35 }, lg); U.svg('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 0 }, lg);
      const cid = gid + 'c';
      const cp = U.svg('clipPath', { id: cid }, defs);
      this.clip = U.svg('rect', { x: 0, y: -20, width: 0, height: chh + 40 }, cp);
      U.svg('path', { d: d + ` L ${cw} ${chh} L 0 ${chh} Z`, fill: `url(#${gid})`, 'clip-path': `url(#${cid})` }, svg);
      U.svg('path', { d, fill: 'none', stroke: col, 'stroke-width': Math.max(2, u * 0.28), 'stroke-linejoin': 'round', 'clip-path': `url(#${cid})` }, svg);
      this.dot = U.svg('circle', { r: u * 0.55, fill: col }, svg);
      this.ring = U.svg('circle', { r: u * 0.55, fill: 'none', stroke: col, 'stroke-width': 2 }, svg);
      this.pp = P; this.pts = pts; this.cw = cw; this.cx0 = cx0; this.cy0 = cy0;
      this.base = r.range(40, 420);
      const tabs = U.el('div', 't2', this.el);
      Object.assign(tabs.style, { left: W * 0.07 + 'px', top: H * 0.9 + 'px', display: 'flex', gap: u * 2.4 + 'px', color: '#6f7b8b', font: `600 ${u * 1.3}px 'Oley Sans', sans-serif` });
      tabs.innerHTML = ['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((s, i) => `<span style="${i === 0 ? `color:#e8edf3;background:#1c2633;padding:0.2em 0.7em;border-radius:0.5em` : 'padding:0.2em 0'}">${s}</span>`).join('');
    }
    update(t) {
      const L = this.L;
      K.wordAnim(this.words, t, 0.2);
      const k = U.e('inOutSine', U.prog(L.t - 0.3, L.singEnd + 0.3, t));
      const i = Math.max(0, Math.min(this.pp.length - 1, Math.round(k * (this.pp.length - 1))));
      const p = this.pp[i];
      this.clip.setAttribute('width', (p[0] + 1).toFixed(1));
      this.dot.setAttribute('cx', p[0].toFixed(1)); this.dot.setAttribute('cy', p[1].toFixed(1));
      const rp = (this.age * 1.3) % 1;
      this.ring.setAttribute('cx', p[0].toFixed(1)); this.ring.setAttribute('cy', p[1].toFixed(1)); this.ring.setAttribute('r', (this.u * (0.55 + rp * 1.6)).toFixed(1)); this.ring.setAttribute('opacity', (1 - rp).toFixed(2));
      const price = this.base * (0.6 + this.pts[i] * 0.8), p0 = this.base * (0.6 + this.pts[0] * 0.8);
      const ch = ((price - p0) / p0) * 100;
      const s = price.toFixed(2);
      if (s !== this._s) { this._s = s; this.price.textContent = '$' + s; this.chg.textContent = (ch >= 0 ? '▲ +' : '▼ ') + ch.toFixed(2) + '%'; }
    }
    focus() { const k = this.clip.getAttribute('width'); return { x: this.cx0 + (+k || 0), y: this.cy0 + this.H * 0.2 }; }
  }
  Ed.add('stock', Stock, { fam: 'thing', w: 0.9, max: 14, vars: 1, cams: ['still', 'push', 'drift', 'track'], trig: 'money rich high higher rise rising fall falling up down crash worth value broke gold million billion invest market' });

  // ================================================================ 38. Morse code on a paper tape
  const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
  class Morse extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      this.el.style.background = 'radial-gradient(ellipse 80% 70% at 30% 40%, #1d2433, #07090d 75%)';
      const lampS = Math.min(H * 0.26, W * 0.16);
      const lamp = U.el('div', 't2', this.el);
      Object.assign(lamp.style, { left: W * 0.08 + 'px', top: H * 0.12 + 'px', width: lampS + 'px', height: lampS + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #555a63, #1d2026 60%, #0b0c0e)', boxShadow: '0 2vmin 4vmin rgba(0,0,0,0.6), inset 0 0 0 ' + u * 0.8 + 'px #8d9097' });
      this.glass = U.el('div', '', lamp);
      Object.assign(this.glass.style, { position: 'absolute', inset: '14%', borderRadius: '50%', background: 'radial-gradient(circle at 45% 40%, #3b2f1c, #1a140b 70%)' });
      this.halo = U.el('div', 'ed-fill', this.el);
      this.halo.style.background = `radial-gradient(circle at ${(W * 0.08 + lampS / 2).toFixed(0)}px ${(H * 0.12 + lampS / 2).toFixed(0)}px, rgba(255,214,120,0.55), rgba(255,180,60,0.12) ${(lampS * 1.2).toFixed(0)}px, rgba(0,0,0,0) ${(lampS * 2.6).toFixed(0)}px)`;
      this.halo.style.mixBlendMode = 'screen';
      this.halo.style.opacity = '0';
      this.tapeY = H * 0.56;
      const tp = U.el('div', 't2', this.el);
      Object.assign(tp.style, { left: 0, right: 0, top: this.tapeY + 'px', height: H * 0.1 + 'px', backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.14)), url(${K.tex('paper')})`, backgroundColor: '#efe6cf', backgroundBlendMode: 'normal, multiply', boxShadow: '0 1vmin 2vmin rgba(0,0,0,0.5)', overflow: 'hidden' });
      this.tape = tp;
      this.headX = W * 0.78;
      const hd = U.el('div', 't2', this.el);
      Object.assign(hd.style, { left: this.headX - u * 1.2 + 'px', top: this.tapeY - H * 0.05 + 'px', width: u * 2.4 + 'px', height: H * 0.2 + 'px', background: 'linear-gradient(90deg,#2b2d31,#6b6e75 50%,#2b2d31)', borderRadius: u * 0.4 + 'px', boxShadow: '0 1vmin 2vmin rgba(0,0,0,0.5)' });
      // schedule every dot and dash
      this.syms = []; this.letters = [];
      let after = -1e9;
      for (const w of this.ws) {
        const s = K.clean(K.bare(w)).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!s) continue;
        let units = 0;
        for (const ch of s) units += (MORSE[ch] || '').split('').reduce((a, c) => a + (c === '.' ? 2 : 4), 0) + 2;
        // keep words in order: a word starts when it's sung, or right after the previous one finishes
        let tt = Math.max(w.t - 0.02, after);
        const unit = U.clamp((Math.max(0.12, w.end - tt) * 0.92) / Math.max(1, units), 0.012, 0.085);
        for (const ch of s) {
          for (const c of MORSE[ch] || '') { const len = c === '.' ? unit : unit * 3; this.syms.push({ t: tt, len, dash: c === '-' }); tt += len + unit; }
          this.letters.push({ ch, t: tt });
          tt += unit * 2;
        }
        this.letters.push({ ch: ' ', t: tt });
        after = tt;
      }
      this.speed = W * 0.11;
      this.marks = this.syms.map((s) => {
        const m = U.el('div', 't2', tp);
        const w = s.dash ? s.len * this.speed : Math.max(u * 0.7, s.len * this.speed);
        Object.assign(m.style, { top: '42%', height: s.dash ? '16%' : u * 0.7 + 'px', width: w + 'px', borderRadius: '99px', background: '#1b1b1b', opacity: '0' });
        if (!s.dash) m.style.width = u * 0.7 + 'px';
        return { m, s, w };
      });
      this.txt = U.el('div', 't2', this.el);
      Object.assign(this.txt.style, { left: W * 0.08 + 'px', right: W * 0.08 + 'px', top: this.tapeY + H * 0.15 + 'px', color: '#f3e7c8', font: `400 ${u * 3.4}px 'Courier New', var(--mono)`, letterSpacing: '0.04em', textAlign: 'left', whiteSpace: 'pre-wrap' });
      const cap = U.el('div', 't2', this.el);
      Object.assign(cap.style, { left: W * 0.08 + lampS * 1.25 + 'px', top: H * 0.16 + 'px', color: 'rgba(243,231,200,0.6)', font: `600 ${u * 1.3}px 'Oley Sans', sans-serif`, letterSpacing: '0.3em' });
      cap.textContent = 'RECEIVING · ' + ((this.ctx.track && this.ctx.track.title) || '').toUpperCase();
    }
    update(t) {
      let on = false;
      for (const M of this.marks) {
        const s = M.s;
        const vis = t >= s.t;
        if (vis !== M.vis) { M.vis = vis; M.m.style.opacity = vis ? '1' : '0'; }
        if (vis) {
          const age = t - s.t;
          const grown = s.dash ? Math.min(M.w, age * this.speed) : M.w;
          M.m.style.width = grown.toFixed(1) + 'px';
          M.m.style.left = (this.headX - age * this.speed).toFixed(1) + 'px';
        }
        if (t >= s.t && t < s.t + s.len) on = true;
      }
      this.glass.style.background = on ? 'radial-gradient(circle at 45% 40%, #fff7d6, #ffcf5a 45%, #b36b10 85%)' : 'radial-gradient(circle at 45% 40%, #3b2f1c, #1a140b 70%)';
      this.halo.style.opacity = on ? '1' : '0';
      const s = this.letters.filter((l) => t >= l.t).map((l) => l.ch).join('').toUpperCase();
      if (s !== this._s) { this._s = s; this.txt.textContent = s; }
    }
    focus() { return { x: this.headX - this.W * 0.1, y: this.tapeY + this.H * 0.05 }; }
  }
  Ed.add('morse', Morse, { fam: 'thing', w: 0.85, max: 9, vars: 1, cams: ['still', 'push', 'drift'], trig: 'signal signals code message call calling hear listen anybody out there sos help secret' });

  // ================================================================ 39. a fortune card turned over on the key word
  class Card extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 45% 55% at 50% 48%, rgba(255,240,210,0.26), rgba(0,0,0,0.7) 80%), url(${K.tex('felt')})`;
      bg.style.backgroundSize = '100% 100%, 256px';
      const ch = H * 0.66, cw = ch * 0.58;
      const acc = K.accent(this, 0.5, 0.7);
      const back = (el) => {
        Object.assign(el.style, { background: `repeating-linear-gradient(45deg, rgba(212,175,95,0.55) 0 2px, rgba(0,0,0,0) 2px 14px), repeating-linear-gradient(-45deg, rgba(212,175,95,0.55) 0 2px, rgba(0,0,0,0) 2px 14px), radial-gradient(circle, ${acc}, #0d1330 80%)`, boxShadow: `inset 0 0 0 ${cw * 0.03}px #f4ead2, inset 0 0 0 ${cw * 0.045}px #c9a55a`, borderRadius: cw * 0.05 + 'px' });
      };
      [-1, 1].forEach((s) => { const c = U.el('div', 't2', this.el); Object.assign(c.style, { left: W / 2 - cw / 2 + s * cw * 0.95 + 'px', top: (H - ch) / 2 + ch * 0.06 + 'px', width: cw + 'px', height: ch + 'px', transform: `rotate(${s * 12}deg)`, boxShadow: '0 1.5vmin 3vmin rgba(0,0,0,0.6)' }); back(c); });
      const wrap = U.el('div', 't2', this.el);
      Object.assign(wrap.style, { left: (W - cw) / 2 + 'px', top: (H - ch) / 2 + 'px', width: cw + 'px', height: ch + 'px', perspective: cw * 4 + 'px' });
      const card = U.el('div', 't2', wrap);
      Object.assign(card.style, { inset: '0', transformStyle: 'preserve-3d', willChange: 'transform' });
      this.card = card;
      const fb = U.el('div', 't2', card); Object.assign(fb.style, { inset: '0', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }); back(fb);
      const ff = U.el('div', 't2', card);
      Object.assign(ff.style, { inset: '0', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: cw * 0.05 + 'px', background: `url(${K.tex('paper')}) #f1e6c8`, backgroundBlendMode: 'multiply', boxShadow: `inset 0 0 0 ${cw * 0.03}px #f6efdc, inset 0 0 0 ${cw * 0.04}px #b8913f, inset 0 0 0 ${cw * 0.06}px #f1e6c8, inset 0 0 0 ${cw * 0.065}px #b8913f`, fontFamily: "'Oley Serif', serif", color: '#3b2b14', textAlign: 'center', overflow: 'hidden' });
      const rom = (n) => { const m = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]]; let s = ''; for (const [k, v] of m) while (n >= v) { s += k; n -= v; } return s; };
      const num = U.el('div', 't2', ff, rom((L.i % 21) + 1)); Object.assign(num.style, { left: 0, right: 0, top: ch * 0.05 + 'px', font: `600 ${cw * 0.09}px 'Oley Serif', serif`, letterSpacing: '0.1em' });
      const art = U.el('div', 't2', ff); Object.assign(art.style, { left: cw * 0.13 + 'px', right: cw * 0.13 + 'px', top: ch * 0.15 + 'px', height: ch * 0.6 + 'px', borderRadius: `${cw * 0.37}px ${cw * 0.37}px ${cw * 0.02}px ${cw * 0.02}px`, overflow: 'hidden', boxShadow: `0 0 0 ${cw * 0.012}px #b8913f` });
      K.cover(this, art, 'filter:sepia(0.25) saturate(1.1)');
      const tt = U.el('div', 't2', ff, (K.clean(K.bare(K.key(L))) || 'the fool').toUpperCase()); Object.assign(tt.style, { left: cw * 0.06 + 'px', right: cw * 0.06 + 'px', top: ch * 0.8 + 'px', font: `600 ${cw * 0.1}px 'Oley Serif', serif`, letterSpacing: '0.16em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
      this.shadow = U.el('div', 't2', this.el);
      Object.assign(this.shadow.style, { left: (W - cw) / 2 + 'px', top: (H - ch) / 2 + 'px', width: cw + 'px', height: ch + 'px', borderRadius: cw * 0.05 + 'px', boxShadow: '0 2vmin 4vmin rgba(0,0,0,0.65)', zIndex: '-1' });
      wrap.style.zIndex = '2';
      const ln = U.el('div', 't2', this.el);
      Object.assign(ln.style, { left: W * 0.1 + 'px', right: W * 0.1 + 'px', top: H * 0.06 + 'px', textAlign: 'center', color: '#f4ead2', font: `italic 500 ${u * (this.ws.length > 8 ? 2.4 : 3)}px 'Oley Serif', serif`, textShadow: '0 0.1em 0.4em rgba(0,0,0,0.7)' });
      this.words = K.wordEls(ln, this.ws);
      this.kt = K.key(L).t;
      this.rot = r.range(-4, 4);
    }
    update(t) {
      K.wordAnim(this.words, t, 0.22);
      const p = U.prog(this.kt - 0.18, this.kt + 0.32, t);
      const e = U.e('inOutCubic', p);
      const lift = Math.sin(Math.PI * p);
      this.card.style.transform = `translateZ(${(lift * this.u * 6).toFixed(1)}px) rotateY(${(180 - 180 * e).toFixed(2)}deg) rotateZ(${(this.rot * (1 - e)).toFixed(2)}deg)`;
      this.shadow.style.transform = `translate(${(lift * this.u * 2).toFixed(1)}px,${(lift * this.u * 3).toFixed(1)}px) scale(${(1 - lift * 0.08).toFixed(3)})`;
      this.shadow.style.opacity = (0.9 - lift * 0.4).toFixed(3);
    }
    focus() { return { x: this.W / 2, y: this.H / 2 }; }
  }
  Ed.add('card', Card, { fam: 'thing', w: 1, max: 14, vars: 1, cams: ['still', 'push', 'drift'], trig: 'fate future destiny luck lucky magic believe stars sign written fortune tell meant chance' });
})();
