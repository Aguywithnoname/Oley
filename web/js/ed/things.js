/* Editlyric scenes — real things, part 1: a split-flap departure board, a receipt printing, a neon sign
   on brick, a typewriter, sticky notes on cork, a highlighter on a book page, a word written in a fogged
   window, a label maker, a ransom note and a rubber stamp. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-things', `
.m-ed .th-abs { position: absolute; }
.m-ed .rc-paper { position: absolute; color: #262626; font-family: var(--mono); text-transform: uppercase; box-shadow: 0 1.4vmin 3vmin rgba(0,0,0,0.45); will-change: transform; }
.m-ed .rc-paper .ln { display: flex; justify-content: space-between; gap: 1em; white-space: pre; }
.m-ed .rc-paper .ln.c { justify-content: center; }
.m-ed .rc-paper .sep { border-top: 0.14em dashed #3a3a3a; margin: 0.6em 0; opacity: 0.8; }
.m-ed .ne-w { display: inline-block; white-space: pre; }
.m-ed .st-note { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; will-change: transform, opacity; }
.m-ed .st-note::after { content: ''; position: absolute; right: 0; bottom: 0; width: 26%; height: 22%; background: linear-gradient(135deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0.12) 50%, rgba(255,255,255,0.35) 54%, rgba(0,0,0,0.06) 70%); pointer-events: none; }
.m-ed .mk-w { position: relative; display: inline; }
.m-ed .mk-w i { position: absolute; left: -0.08em; right: -0.08em; top: 0.12em; bottom: -0.02em; background: rgba(255,226,40,0.62); mix-blend-mode: multiply; transform-origin: 0 50%; transform: scaleX(0); border-radius: 0.12em 0.3em 0.2em 0.16em; z-index: -1; }
.m-ed .fg-w { display: inline-block; white-space: pre; color: transparent; -webkit-background-clip: text; background-clip: text; background-repeat: no-repeat; will-change: clip-path; }
.m-ed .lb-tape { position: absolute; overflow: hidden; white-space: pre; will-change: transform, width; }
.m-ed .rn-c { display: inline-block; line-height: 1; will-change: transform, opacity; filter: drop-shadow(0.03em 0.05em 0.04em rgba(0,0,0,0.35)); }
`);

  // ================================================================ 20. split-flap departure board
  class Flap extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      this.el.style.background = 'radial-gradient(ellipse 80% 70% at 50% 40%, #1a1b1e, #050506)';
      const n = U.clamp(Math.round(this.ws.length / 2.6), 1, 5);
      const chunks = K.chunks(L, n);
      const maxC = Math.min(20, Math.max(8, ...chunks.map((c) => c.text.length)));
      this.cols = maxC;
      const rows = Math.max(4, chunks.length);
      const totTiles = 5 + maxC + 3 + 1.6;
      const tw = Math.min((W * 0.84) / (totTiles * 1.1), (H * 0.6) / (rows * 1.5 + 0.6));
      const th = tw * 1.42, gap = tw * 0.1;
      this.tw = tw; this.th = th; this.gap = gap;
      const bw = totTiles * (tw + gap), bh = rows * (th + gap * 3) + th * 0.9;
      this.bx = (W - bw) / 2; this.by = (H - bh) / 2 + th * 0.4;
      const cv = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      Object.assign(cv.style, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px' });
      this.el.appendChild(cv);
      this.cv = cv; this.x = cv.getContext('2d'); this.dpr = dpr;
      const amber = this.v % 2 === 1;
      this.ink = amber ? '#ffb21c' : '#f2f0e6';
      const now = K.now();
      const g0 = String.fromCharCode(65 + r.int(0, 5));
      this.rows = [];
      for (let i = 0; i < rows; i++) {
        const c = chunks[i];
        const tm = new Date(now.getTime() + (i * 7 + r.int(2, 6)) * 60000);
        const hh = ('0' + tm.getHours()).slice(-2) + ':' + ('0' + tm.getMinutes()).slice(-2);
        const t0 = c ? c.t - 0.06 : L.t - 0.2 + i * 0.12;
        this.rows.push({ t0, cells: [
          ...hh.split('').map((ch, k) => ({ tgt: ch, t: L.t - 0.25 + i * 0.05 + k * 0.03, x: k })),
          ...(c ? c.text.toUpperCase().slice(0, maxC).padEnd(maxC, ' ') : ''.padEnd(maxC, ' ')).split('').map((ch, k) => ({ tgt: ch, t: t0 + k * 0.028, x: 5.8 + k })),
          ...(c ? g0 + (r.int(1, 39) + '').padStart(2, '0') : '   ').split('').map((ch, k) => ({ tgt: ch, t: (c ? c.end : L.t) + 0.05 + k * 0.04, x: 5.8 + maxC + 0.8 + k })),
        ] });
      }
      const FL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (const row of this.rows) for (const cell of row.cells) {
        const q = U.rng(U.hash(cell.x + ':' + row.t0 + ':' + cell.tgt));
        const n2 = cell.tgt === ' ' ? 0 : q.int(3, 9);
        cell.seq = [' '];
        for (let k = 0; k < n2; k++) cell.seq.push(FL[q.int(0, FL.length - 1)]);
        cell.seq.push(cell.tgt);
      }
      const lab = U.el('div', '', this.el);
      Object.assign(lab.style, { position: 'absolute', left: this.bx + 'px', top: this.by - th * 0.95 + 'px', right: this.bx + 'px', display: 'flex', alignItems: 'center', gap: u * 1.5 + 'px', color: '#e8e8e8', font: `700 ${(th * 0.42).toFixed(1)}px 'Oley Sans', sans-serif`, letterSpacing: '0.12em' });
      lab.innerHTML = `<span style="color:${this.ink}">${K.icon('send')}</span><span style="flex:1">DEPARTURES</span><span style="font-weight:500;opacity:0.7;font-size:0.8em">TIME · DESTINATION · GATE</span>`;
      const sheen = U.el('div', 'ed-fill', this.el);
      sheen.style.background = 'linear-gradient(170deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 35%), radial-gradient(ellipse 90% 80% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55))';
      this.font = `${(th * 0.74).toFixed(1)}px 'Oley Heavy', 'Oley Sans', sans-serif`;
    }
    cellAt(cell, t) {
      const step = 0.065;
      const k = (t - cell.t) / step;
      const n = cell.seq.length - 1;
      if (k <= 0) return { a: ' ', b: ' ', ph: -1 };
      if (k >= n) return { a: cell.tgt, b: cell.tgt, ph: -1 };
      const i = Math.floor(k);
      return { a: cell.seq[i], b: cell.seq[i + 1], ph: k - i };
    }
    drawTile(x, y, w, h, a, b, ph) {
      const c = this.x, mid = y + h / 2, R = w * 0.08;
      const half = (top, ch, sy, shade) => {
        c.save();
        c.translate(0, mid); c.scale(1, sy); c.translate(0, -mid);
        c.beginPath();
        if (top) c.rect(x, y, w, h / 2 - 0.5); else c.rect(x, mid + 0.5, w, h / 2 - 0.5);
        c.clip();
        const g = c.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#2a2a2d'); g.addColorStop(0.5, top ? '#1f1f22' : '#18181a'); g.addColorStop(1, '#121214');
        c.fillStyle = g;
        c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, R) : c.rect(x, y, w, h); c.fill();
        if (ch !== ' ') { c.fillStyle = this.ink; c.fillText(ch, x + w / 2, mid + h * 0.02); }
        if (shade) { c.fillStyle = `rgba(0,0,0,${shade.toFixed(3)})`; c.fillRect(x, y, w, h); }
        c.restore();
      };
      if (ph < 0) { half(true, a, 1, 0); half(false, a, 1, 0); }
      else {
        half(true, b, 1, 0);
        half(false, a, 1, 0);
        if (ph < 0.5) half(true, a, Math.cos(ph * Math.PI), ph * 0.9);
        else half(false, b, -Math.cos(ph * Math.PI), (1 - ph) * 0.7);
      }
      c.fillStyle = '#050505'; c.fillRect(x, mid - 1, w, 2);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x, mid + 1, w, 1);
    }
    update(t) {
      const c = this.x, d = this.dpr;
      let busy = !this._drawn;
      const st = this.rows.map((row) => row.cells.map((cell) => { const s = this.cellAt(cell, t); if (s.ph >= 0 || s.a !== cell._a) busy = true; cell._a = s.a; return s; }));
      if (!busy) return;
      this._drawn = true;
      c.setTransform(d, 0, 0, d, 0, 0);
      c.clearRect(0, 0, this.W, this.H);
      c.fillStyle = '#0d0d0f';
      const pad = this.tw * 0.5;
      c.fillRect(this.bx - pad, this.by - pad, (this.cols + 10.4) * (this.tw + this.gap) + pad * 0.4, this.rows.length * (this.th + this.gap * 3) + pad * 1.2);
      c.font = this.font; c.textAlign = 'center'; c.textBaseline = 'middle';
      this.rows.forEach((row, ri) => {
        const y = this.by + ri * (this.th + this.gap * 3);
        row.cells.forEach((cell, ci) => {
          const s = st[ri][ci];
          this.drawTile(this.bx + cell.x * (this.tw + this.gap), y, this.tw, this.th, s.a, s.b, s.ph);
        });
      });
    }
    focus() {
      const t = this.mode.t;
      const ri = Math.max(0, this.rows.findIndex((r, i) => !this.rows[i + 1] || t < this.rows[i + 1].t0));
      return { x: this.W / 2, y: this.by + ri * (this.th + this.gap * 3) + this.th / 2 };
    }
  }
  Ed.add('flap', Flap, { fam: 'thing', w: 1.1, max: 20, vars: 2, cams: ['still', 'push', 'drift', 'track', 'dutch'], trig: 'leave leaving gone go going away flight train plane fly flying station departure goodbye far home travel next time late' });

  // ================================================================ 21. a receipt printing the line
  class Receipt extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 50% 60% at 50% 55%, rgba(255,220,170,0.22), rgba(0,0,0,0) 70%), linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url(${K.tex(this.v % 2 ? 'wood' : 'concrete')})`;
      bg.style.backgroundSize = `100% 100%, 100% 100%, ${this.v % 2 ? 900 : 640}px auto`;
      const rw = Math.min(W * 0.34, u * 38), fs = rw / 21;
      this.slotY = H * 0.86;
      const pr = U.el('div', 'th-abs', this.el);
      Object.assign(pr.style, { left: (W - rw * 1.4) / 2 + 'px', top: this.slotY + 'px', width: rw * 1.4 + 'px', height: H * 0.3 + 'px', borderRadius: `${u * 1.4}px ${u * 1.4}px 0 0`, background: 'linear-gradient(180deg, #3a3b3f 0%, #232427 18%, #18191b 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 -1vmin 3vmin rgba(0,0,0,0.5)', zIndex: 3 });
      const slot = U.el('div', '', pr);
      Object.assign(slot.style, { position: 'absolute', left: '7%', right: '7%', top: u * 0.9 + 'px', height: u * 0.55 + 'px', borderRadius: '99px', background: '#050505', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.12)' });
      const led = U.el('div', '', pr); Object.assign(led.style, { position: 'absolute', right: '9%', top: u * 3.2 + 'px', width: u * 0.8 + 'px', height: u * 0.8 + 'px', borderRadius: '50%', background: '#3dff7a', boxShadow: '0 0 1vmin #3dff7a' });
      const p = U.el('div', 'rc-paper', this.el);
      Object.assign(p.style, { left: (W - rw) / 2 + 'px', width: rw + 'px', bottom: H - this.slotY - u * 0.6 + 'px', padding: `${fs * 2.2}px ${fs * 1.4}px ${fs * 1.6}px`, boxSizing: 'border-box', fontSize: fs + 'px', lineHeight: '1.45', zIndex: 2,
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0) 8%, rgba(0,0,0,0) 92%, rgba(0,0,0,0.07)), url(${K.tex('paper')})`, backgroundSize: '100% 100%, 300px auto' });
      const zz = []; const N = 26; for (let i = 0; i <= N; i++) zz.push(`${(i / N * 100).toFixed(2)}% ${i % 2 ? 0 : 0.9}%`);
      p.style.clipPath = `polygon(${zz.join(',')}, 100% 100%, 0 100%)`;
      this.p = p;
      const tr = this.ctx.track || {};
      const now = K.now();
      const lines = [];
      const add = (html, cls, t) => { const d = U.el('div', cls || 'ln', p); d.innerHTML = html; d.style.display = 'none'; lines.push({ d, t }); return d; };
      const t0 = L.t - 0.3;
      add(`<b style="font-size:1.55em;letter-spacing:0.08em">${K.esc(String(tr.artist || 'OLEY').toUpperCase().slice(0, 18))}</b>`, 'ln c', t0);
      add(`${K.esc(String(tr.title || '').toUpperCase().slice(0, 24))}`, 'ln c', t0 + 0.04);
      add(`<span>${K.esc(now.toLocaleDateString())}</span><span>${K.clock(now)}</span>`, 'ln', t0 + 0.08);
      add(`<span>ORDER #${(U.hash(L.text) % 9000 + 1000)}</span><span>TABLE ${r.int(1, 24)}</span>`, 'ln', t0 + 0.12);
      add('', 'sep', t0 + 0.16);
      let total = 0;
      this.ws.forEach((w) => {
        const pr2 = (U.hash(w.w) % 1900) / 100 + 0.99;
        total += pr2;
        add(`<span>1 ${K.esc(K.bare(w).toUpperCase())}</span><span>${pr2.toFixed(2)}</span>`, 'ln', w.t - 0.02);
      });
      const e = L.singEnd + 0.05, f = Math.min(1, this.tail / 0.6);
      add('', 'sep', e);
      add(`<b>TOTAL</b><b>${total.toFixed(2)}</b>`, 'ln', e + 0.06 * f);
      add(`<span>CARD ****${r.int(1000, 9999)}</span><span>APPROVED</span>`, 'ln', e + 0.12 * f);
      add(`<span style="letter-spacing:0.3em">THANK YOU</span>`, 'ln c', e + 0.2 * f);
      const bc = add('', 'ln c', e + 0.28 * f);
      let bars = '';
      for (let i = 0; i < 46; i++) bars += `<i style="display:inline-block;width:${(r.int(1, 3) * 0.09).toFixed(2)}em;height:2.6em;margin-right:${(r.int(1, 3) * 0.07).toFixed(2)}em;background:${i % 2 ? 'transparent' : '#222'}"></i>`;
      bc.innerHTML = `<span style="line-height:0;margin-top:0.6em">${bars}</span>`;
      this.lines = lines;
      this.y = O.sp(0);
      this.h = 0;
    }
    update(t, dt) {
      for (const l of this.lines) { const on = t >= l.t; if (on !== l.on) { l.on = on; l.d.style.display = on ? '' : 'none'; } }
      const h = this.p.offsetHeight;
      if (h !== this.h) { if (this.h) this.y.x += h - this.h; this.h = h; }
      O.spring(this.y, 0, 16, dt);
      this.p.style.transform = `translateY(${this.y.x.toFixed(1)}px)`;
    }
    focus() { return { x: this.W / 2, y: this.slotY - this.u * 6 }; }
  }
  Ed.add('receipt', Receipt, { fam: 'thing', w: 0.95, max: 14, vars: 2, cams: ['still', 'push', 'track', 'drift'], trig: 'pay paid price cost money buy bought owe worth cheap free spend spent cash rich bill check' });

  // ================================================================ 22. a neon sign on a brick wall
  class Neon extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      const wall = U.el('div', 'ed-fill', this.el);
      wall.style.backgroundImage = `url(${K.tex('brick')})`;
      wall.style.backgroundSize = Math.round(W * 0.42) + 'px auto';
      wall.style.filter = 'brightness(0.32) saturate(0.85)';
      const pal = this.pal;
      const c1 = U.vivid(pal.vivid, 0.75, 1), c2 = U.vivid(U.shiftHue(pal.second, 0), 0.7, 1);
      this.c1 = c1; this.c2 = U.lum(c2) > 0.0 && Math.abs(U.rgb2hsv(c1)[0] - U.rgb2hsv(c2)[0]) > 40 ? c2 : U.vivid(U.shiftHue(c1, 150), 0.7, 1);
      this.glow = U.el('div', 'ed-fill', this.el);
      this.glow.style.background = `radial-gradient(ellipse 55% 45% at 50% 48%, ${U.rgba(c1, 0.55)}, ${U.rgba(c1, 0.12)} 55%, rgba(0,0,0,0) 80%)`;
      this.glow.style.mixBlendMode = 'screen';
      this.glow.style.opacity = '0';
      const kind = this.v % 3;
      const fam = kind === 0 ? "500 {s} 'Oley Round', sans-serif" : kind === 1 ? "italic 600 {s} 'Oley Serif', serif" : "400 {s} 'Oley Heavy', sans-serif";
      const txt = K.text(L, kind !== 2);
      const big = K.fit(txt, fam, W * 0.82 * (this.ws.length > 5 ? 1.7 : 1), u * (this.ws.length > 6 ? 8 : 11), u * 4.2);
      const box = U.el('div', 'ed-fill', this.el);
      Object.assign(box.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${W * 0.08}px`, textAlign: 'center', boxSizing: 'border-box' });
      const mk = (cls) => {
        const t2 = U.el('div', cls, box);
        Object.assign(t2.style, { font: fam.replace('{s}', big.toFixed(1) + 'px'), lineHeight: '1.18', position: 'absolute', left: W * 0.08 + 'px', right: W * 0.08 + 'px', textTransform: kind === 2 ? 'uppercase' : 'lowercase', letterSpacing: kind === 2 ? '0.04em' : '0.01em' });
        return t2;
      };
      const sh = mk(''); sh.style.color = 'rgba(0,0,0,0.55)'; sh.style.transform = 'translate(0.05em,0.09em)'; sh.style.filter = 'blur(2px)';
      sh.textContent = txt;
      const tx = mk('');
      this.items = K.wordEls(tx, this.ws, 'ne-w');
      this.items.forEach((it) => { it.col = it.w.key ? this.c2 : c1; it.el.style.opacity = '1'; it.state = -1; this.setOn(it, 0); });
      this.box = box; this.tx = tx;
      K.grain(this.el, 0.18);
      this.n = U.noise1(U.hash('ne' + L.i));
      // posts holding the sign
      [0.3, 0.7].forEach((fx) => { const c = U.el('div', '', this.el); Object.assign(c.style, { position: 'absolute', left: W * fx + 'px', top: 0, width: '2px', height: H * 0.28 + 'px', background: 'linear-gradient(#000, #222)', opacity: '0.7' }); });
    }
    setOn(it, v) {
      const C = it.col, el = it.el;
      if (v > 0.5) {
        el.style.color = U.rgba(U.mix(C, [255, 255, 255], 0.78), 1);
        el.style.textShadow = `0 0 0.02em #fff, 0 0 0.05em ${U.rgba(C, 1)}, 0 0 0.12em ${U.rgba(C, 0.95)}, 0 0 0.28em ${U.rgba(C, 0.8)}, 0 0 0.6em ${U.rgba(C, 0.55)}, 0 0 1.1em ${U.rgba(C, 0.35)}`;
      } else {
        el.style.color = U.rgba(U.mix(C, [120, 120, 120], 0.55), 0.22);
        el.style.textShadow = '0 0 0.01em rgba(255,255,255,0.25)';
      }
    }
    update(t, dt, A) {
      let lit = 0;
      for (const it of this.items) {
        const k = t - (it.w.t - 0.03);
        let on = k > 0 ? 1 : 0;
        if (k > 0 && k < 0.2) on = k < 0.03 || (k > 0.07 && k < 0.1) || k > 0.16 ? 1 : 0;
        if (on && this.n(t * 3 + it.i * 7) > 0.93) on = 0;
        if (on !== it.state) { it.state = on; this.setOn(it, on); }
        lit += on;
      }
      const f = lit / Math.max(1, this.items.length);
      this.glow.style.opacity = (f * (0.85 + 0.15 * this.n(t * 9)) + A.pulse * 0.05).toFixed(3);
      void dt;
    }
    focus() { return { x: this.W / 2, y: this.H / 2 }; }
  }
  Ed.add('neon', Neon, { fam: 'thing', w: 1.15, max: 12, vars: 3, adlib: true, cams: ['still', 'push', 'drift', 'hand', 'dutch'], trig: 'night tonight lights light city bar club open love fire glow neon bright dark late party' });

  // ================================================================ 23. a typewriter
  class Typewriter extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,225,180,0.16), rgba(0,0,0,0) 70%), linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.62)), url(${K.tex('wood')})`;
      bg.style.backgroundSize = '100% 100%, 100% 100%, 1000px auto';
      const nch = Math.max(8, K.text(L).length);
      const fs = Math.max(13, Math.min(u * 2.7, (W * 0.56) / (nch * 0.6)));
      const font = `400 ${fs}px 'Courier New', 'Oley Mono', monospace`;
      this.cw = U.textWidth('M', font);
      this.fs = fs;
      this.lineH = fs * 1.55;
      this.typeX = Math.min(W * 0.62, W * 0.08 + nch * this.cw); this.typeY = H * 0.6;
      this.typeX = Math.max(this.typeX, W * 0.5);
      const pw = Math.min(W * 0.8, this.cw * 66);
      this.margin = this.cw * 5;
      const car = U.el('div', 'th-abs', this.el);
      Object.assign(car.style, { left: 0, top: 0, width: pw + 'px', height: '1px', willChange: 'transform' });
      this.car = car;
      const paper = U.el('div', 'th-abs', car);
      const tint = ['#fbf8ef', '#f3e9cf', '#fbf8ef'][this.v % 3];
      Object.assign(paper.style, { left: 0, top: -H * 1.3 + 'px', width: pw + 'px', height: H * 1.3 + this.lineH * 1.1 + 'px', background: `linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0) 4%, rgba(0,0,0,0) 96%, rgba(0,0,0,0.06)), url(${K.tex('paper')}) ${tint}`, backgroundBlendMode: 'normal, multiply', boxShadow: '0 1vmin 4vmin rgba(0,0,0,0.5)' });
      this.paper = paper;
      // earlier lines of the song, already typed
      const prevs = [];
      for (let i = L.i - 1; i >= 0 && prevs.length < 7; i--) { const P = this.ctx.tl.lines[i]; if (P && P.text) prevs.unshift(K.text(P)); }
      this.prev = U.el('div', 'th-abs', car);
      Object.assign(this.prev.style, { left: this.margin + 'px', bottom: this.lineH * 0.15 + 'px', font, color: '#262626', lineHeight: this.lineH + 'px', whiteSpace: 'pre', opacity: '0.92' });
      this.prev.textContent = prevs.join('\n');
      this.prev.style.top = 'auto';
      this.prev.style.position = 'absolute';
      // the line being typed
      this.cur = U.el('div', 'th-abs', car);
      Object.assign(this.cur.style, { left: this.margin + 'px', top: -this.lineH * 0.82 + 'px', font, color: '#1b1b1b', whiteSpace: 'pre', lineHeight: this.lineH + 'px' });
      this.prev.style.bottom = this.lineH * 0.92 + 'px';
      const red = this.v % 3 === 2;
      this.chars = [];
      const r = this.r;
      this.ws.forEach((w, wi) => {
        const s = K.bare(w), span = K.span(w);
        for (let k = 0; k <= s.length; k++) {
          const ch = k < s.length ? s[k] : wi < this.ws.length - 1 ? ' ' : '';
          if (!ch) continue;
          const e = U.el('span', '', this.cur, ch);
          const ink = r.range(0.72, 1);
          e.style.opacity = '0';
          e.style.display = 'inline-block';
          e.style.transform = `translateY(${r.range(-0.03, 0.04).toFixed(3)}em) rotate(${r.range(-1.6, 1.6).toFixed(2)}deg)`;
          if (red && w.key) e.style.color = '#b3121b';
          e.style.textShadow = `0 0 ${(0.02 + (1 - ink) * 0.02).toFixed(3)}em rgba(0,0,0,0.6)`;
          this.chars.push({ e, t: k < s.length ? w.t - 0.02 + (k / Math.max(1, s.length)) * span : w.t - 0.02 + span + 0.01, ink, col: this.chars.length });
        }
      });
      // the platen and paper bail
      const pl = U.el('div', 'th-abs', car);
      Object.assign(pl.style, { left: -pw * 0.08 + 'px', width: pw * 1.16 + 'px', top: this.lineH * 0.35 + 'px', height: u * 7 + 'px', borderRadius: u * 3.5 + 'px', background: 'linear-gradient(180deg, #050505 0%, #2b2b2b 30%, #111 55%, #000 100%)', boxShadow: '0 1.4vmin 2.4vmin rgba(0,0,0,0.6)' });
      const bail = U.el('div', 'th-abs', car);
      Object.assign(bail.style, { left: -pw * 0.04 + 'px', width: pw * 1.08 + 'px', top: this.lineH * 0.12 + 'px', height: u * 0.55 + 'px', borderRadius: '99px', background: 'linear-gradient(180deg,#f2f2f2,#8d8d8d 60%,#cfcfcf)', boxShadow: '0 0.3vmin 0.6vmin rgba(0,0,0,0.4)' });
      [0.3, 0.7].forEach((fx) => { const rl = U.el('div', '', bail); Object.assign(rl.style, { position: 'absolute', left: fx * 100 + '%', top: -u * 0.5 + 'px', width: u * 2.2 + 'px', height: u * 1.6 + 'px', borderRadius: u * 0.6 + 'px', background: 'linear-gradient(180deg,#333,#000)' }); });
      // the type guide (stays put while the carriage moves)
      const tg = U.el('div', 'th-abs', this.el);
      Object.assign(tg.style, { left: this.typeX - u * 1.6 + 'px', top: this.typeY + this.lineH * 0.05 + 'px', width: u * 3.2 + 'px', height: u * 2.2 + 'px', background: 'linear-gradient(180deg,#d9d9d9,#7b7b7b)', clipPath: 'polygon(0 0, 38% 0, 50% 45%, 62% 0, 100% 0, 85% 100%, 15% 100%)', boxShadow: '0 0 1px #000' });
      this.sp = O.sp(0);
      this.jit = 0;
    }
    update(t, dt) {
      const L = this.L;
      let col = 0, last = -9;
      for (const c of this.chars) {
        const on = t >= c.t;
        if (on !== c.on) { c.on = on; c.e.style.opacity = on ? c.ink.toFixed(2) : '0'; if (on && t - c.t < 0.05) this.jit = 1; }
        if (on) { col = c.col + 1; last = c.t; }
      }
      const ret = U.e('inOutCubic', U.prog(L.singEnd + 0.12, L.singEnd + 0.12 + Math.min(0.45, this.tail * 0.8), t));
      const target = this.typeX - this.margin - this.cw * col * (1 - ret);
      if (!this._i) { this.sp.x = this.typeX - this.margin; this._i = true; }
      O.spring(this.sp, target, 34, dt);
      this.jit = Math.max(0, this.jit - dt * 14);
      const lf = ret * this.lineH;
      this.car.style.transform = `translate(${this.sp.x.toFixed(1)}px,${(this.typeY - lf + this.jit * 1.2).toFixed(1)}px)`;
      void last;
    }
    focus() { return { x: this.typeX, y: this.typeY - this.lineH * 0.4 }; }
  }
  Ed.add('typewriter', Typewriter, { fam: 'thing', w: 1.2, max: 16, vars: 3, cams: ['still', 'push', 'hand', 'track'], trig: 'write wrote letter words story page paper type typed' });

  // ================================================================ 24. sticky notes slapped on cork
  class Stickies extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 75% 70% at 50% 45%, rgba(255,240,215,0.12), rgba(0,0,0,0.45)), url(${K.tex('cork')})`;
      bg.style.backgroundSize = `100% 100%, ${Math.round(this.m * 0.55)}px auto`;
      const fr = U.el('div', 'ed-fill', this.el);
      fr.style.boxShadow = `inset 0 0 0 ${u * 1.6}px #6b4a2b, inset 0 0 0 ${u * 1.9}px #3a2615, inset 0 ${u * 2.4}px ${u * 3}px rgba(0,0,0,0.5)`;
      const n = U.clamp(Math.round(this.ws.length / 2.4), 1, 4);
      const chunks = K.chunks(L, n);
      const S = Math.min(H * (n > 2 ? 0.36 : 0.44), W * 0.24);
      const spots = { 1: [[0.5, 0.48]], 2: [[0.34, 0.47], [0.66, 0.5]], 3: [[0.25, 0.42], [0.52, 0.56], [0.77, 0.42]], 4: [[0.36, 0.3], [0.64, 0.32], [0.36, 0.68], [0.64, 0.7]] }[chunks.length];
      const cols = r.shuffle(['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#fed7aa', '#ddd6fe']);
      const pin = this.v % 2 === 1;
      this.notes = chunks.map((c, i) => {
        const nt = U.el('div', 'st-note', this.el);
        const col = cols[i % cols.length];
        const [fx, fy] = spots[i];
        Object.assign(nt.style, { left: W * fx - S / 2 + 'px', top: H * fy - S / 2 + 'px', width: S + 'px', height: S + 'px', padding: S * 0.1 + 'px',
          background: `linear-gradient(170deg, ${U.rgba(U.mix(U.parseHex(col), [255, 255, 255], 0.35), 1)}, ${col} 30%, ${U.rgba(U.mix(U.parseHex(col), [0, 0, 0], 0.07), 1)})` });
        const txt = U.el('div', '', nt);
        const fsz = K.fit(c.text, "400 {s} 'Ink Free', 'Segoe Print', cursive", S * 1.55, S * 0.2, S * 0.1);
        Object.assign(txt.style, { font: `400 ${fsz.toFixed(1)}px var(--hand)`, color: '#1d2a4a', lineHeight: '1.12', transform: `rotate(${r.range(-3, 2).toFixed(1)}deg)` });
        const words = K.wordEls(txt, c.words);
        if (pin) {
          const p = U.el('div', '', nt); Object.assign(p.style, { position: 'absolute', left: '50%', top: S * 0.04 + 'px', width: S * 0.1 + 'px', height: S * 0.1 + 'px', marginLeft: -S * 0.05 + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #ff8a8a, #d11a2a 55%, #7a0b14)', boxShadow: `${S * 0.03}px ${S * 0.05}px ${S * 0.04}px rgba(0,0,0,0.45)` });
        } else {
          const tp = U.el('div', '', nt); Object.assign(tp.style, { position: 'absolute', left: '28%', top: -S * 0.06 + 'px', width: '44%', height: S * 0.14 + 'px', background: 'rgba(250,250,245,0.55)', transform: `rotate(${r.range(-6, 6).toFixed(1)}deg)`, boxShadow: '0 0 1px rgba(0,0,0,0.2)', backdropFilter: 'blur(1px)' });
        }
        return { nt, c, words, rot: r.range(-7, 7), t0: c.t - 0.16, S };
      });
    }
    update(t) {
      for (const N of this.notes) {
        const p = U.prog(N.t0, N.t0 + 0.2, t);
        N.nt.style.opacity = p > 0 ? '1' : '0';
        const e = U.e('outBack', p);
        N.nt.style.transform = `rotate(${N.rot.toFixed(2)}deg) scale(${(1.35 - 0.35 * e).toFixed(4)})`;
        const lift = 1 - U.e('outCubic', p);
        N.nt.style.boxShadow = `${(N.S * (0.02 + lift * 0.06)).toFixed(1)}px ${(N.S * (0.04 + lift * 0.12)).toFixed(1)}px ${(N.S * (0.05 + lift * 0.14)).toFixed(1)}px rgba(0,0,0,${(0.38 - lift * 0.15).toFixed(2)})`;
        K.wordAnim(N.words, t, 0.3, (it, q, el) => { el.style.opacity = q > 0 ? '1' : '0'; el.style.clipPath = q < 1 ? `inset(-20% ${((1 - q) * 100).toFixed(1)}% -20% -5%)` : 'none'; });
      }
    }
    focus() { const N = this.notes.filter((x) => this.mode.t >= x.t0).pop() || this.notes[0]; const e = N.nt; return { x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2 }; }
  }
  Ed.add('stickies', Stickies, { fam: 'thing', w: 1.1, min: 2, max: 18, vars: 2, cams: ['still', 'push', 'drift', 'track'], trig: 'remember remind forget note notes list need gotta tomorrow later dont' });

  // ================================================================ 25. a highlighter on a book page
  class Marker extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u;
      this.el.style.background = '#2a2522';
      const wrap = U.el('div', 'ed-fill', this.el); wrap.style.perspective = W * 1.2 + 'px';
      const pg = U.el('div', 'th-abs', wrap);
      const pw = W * 0.96, ph = H * 1.2;
      Object.assign(pg.style, { left: (W - pw) / 2 + 'px', top: -H * 0.08 + 'px', width: pw + 'px', height: ph + 'px', transformOrigin: '50% 50%', transform: `rotateX(14deg) rotateZ(${this.v % 2 ? 2 : -2}deg)`,
        background: `linear-gradient(90deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 3%, rgba(0,0,0,0) 9%, rgba(0,0,0,0) 94%, rgba(0,0,0,0.08) 100%), url(${K.tex('paper')}) #f4ecd8`, backgroundBlendMode: 'normal, multiply', boxShadow: '0 2vmin 6vmin rgba(0,0,0,0.6)' });
      this.pg = pg;
      const tr = this.ctx.track || {};
      const fs = Math.max(15, u * 2.55);
      const hdr = U.el('div', 'th-abs', pg);
      Object.assign(hdr.style, { left: pw * 0.17 + 'px', right: pw * 0.12 + 'px', top: H * 0.14 + 'px', textAlign: 'center', font: `500 ${fs * 0.62}px 'Oley Serif', serif`, letterSpacing: '0.24em', color: '#6d6355', textTransform: 'uppercase' });
      hdr.textContent = tr.title || '';
      const body = U.el('div', 'th-abs', pg);
      Object.assign(body.style, { left: pw * 0.17 + 'px', right: pw * 0.12 + 'px', top: H * 0.2 + 'px', height: H * 0.52 + 'px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden',
        font: `400 ${fs}px 'Oley Serif', Georgia, serif`, color: '#2b241c', lineHeight: '1.62', textAlign: 'justify', hyphens: 'auto' });
      const par = U.el('p', '', body);
      par.style.margin = '0'; par.style.textIndent = '1.6em'; par.style.isolation = 'isolate';
      const prev = [];
      for (let i = L.i - 1; i >= 0 && prev.length < 9; i--) { const P = this.ctx.tl.lines[i]; if (P && P.text && !P.adlib) prev.unshift(K.text(P)); }
      if (prev.length) par.appendChild(document.createTextNode(prev.map((s) => s.replace(/[.,]?$/, ',')).join(' ') + ' '));
      this.items = this.ws.map((w, i) => {
        const s = U.el('span', 'mk-w', par);
        const hl = U.el('i', '', s);
        s.appendChild(document.createTextNode(K.bare(w)));
        if (i < this.ws.length - 1) par.appendChild(document.createTextNode(' '));
        return { w, s, hl, p: -1 };
      });
      par.appendChild(document.createTextNode('.'));
      const orn = U.el('div', 'th-abs', pg);
      Object.assign(orn.style, { left: pw * 0.17 + 'px', right: pw * 0.12 + 'px', top: H * 0.76 + 'px', textAlign: 'center', color: '#8a7d6a', font: `400 ${fs * 1.1}px 'Oley Serif', serif` });
      orn.textContent = '❦';
      const pn = U.el('div', 'th-abs', pg);
      Object.assign(pn.style, { left: pw * 0.17 + 'px', right: pw * 0.12 + 'px', top: H * 0.98 + 'px', textAlign: 'center', color: '#7a6f60', font: `400 ${fs * 0.7}px 'Oley Serif', serif` });
      pn.textContent = String(12 + L.i * 2);
      this.body = body;
      const blur = (top) => { const b = U.el('div', 'ed-fill', this.el); Object.assign(b.style, { backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', WebkitMaskImage: `linear-gradient(${top ? '180deg' : '0deg'}, #000 0%, rgba(0,0,0,0) 30%)`, maskImage: `linear-gradient(${top ? '180deg' : '0deg'}, #000 0%, rgba(0,0,0,0) 30%)` }); };
      blur(true); blur(false);
      const lt = U.el('div', 'ed-fill', this.el);
      lt.style.background = 'radial-gradient(ellipse 70% 60% at 55% 45%, rgba(255,240,210,0.1), rgba(0,0,0,0.28))';
    }
    update(t) {
      for (const it of this.items) {
        const p = U.e('inOutSine', U.prog(it.w.t - 0.03, it.w.t - 0.03 + Math.max(0.16, Math.min(0.45, it.w.dur * 0.75)), t));
        if (p !== it.p) { it.p = p; it.hl.style.transform = `scaleX(${p.toFixed(3)})`; }
      }
    }
    focus() {
      const t = this.mode.t;
      const it = this.items.filter((x) => t >= x.w.t - 0.05).pop() || this.items[0];
      const p = K.off(it.s, this.pg);
      return { x: this.pg.offsetLeft + p.x + p.w / 2, y: this.pg.offsetTop + p.y + p.h / 2 };
    }
  }
  Ed.add('marker', Marker, { fam: 'thing', w: 1.1, max: 18, vars: 2, cams: ['still', 'push', 'drift', 'track'], trig: 'read book story page chapter words know remember line lines' });

  // ================================================================ 26. written with a finger on a fogged window
  class Fog extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u;
      const base = U.el('div', 'ed-fill', this.el);
      K.cover(this, base, 'filter:saturate(1.15) contrast(1.05)');
      const fog = U.el('div', 'ed-fill', this.el);
      K.cover(this, fog, `filter:blur(${Math.round(this.m * 0.022)}px) brightness(1.18) saturate(0.6);transform:scale(1.06)`);
      const haze = U.el('div', 'ed-fill', this.el);
      haze.style.background = 'linear-gradient(180deg, rgba(238,242,247,0.66), rgba(222,229,236,0.58))';
      const drops = U.el('div', 'ed-fill', this.el);
      drops.style.backgroundImage = `url(${K.tex('drops')})`; drops.style.backgroundSize = Math.round(this.m * 0.45) + 'px auto'; drops.style.opacity = '0.7';
      const art = this.ctx.art;
      const txt = K.text(L, true);
      const font = "400 {s} 'Ink Free', 'Segoe Print', cursive";
      const fsz = K.fit(txt, font, W * 0.8 * (this.ws.length > 4 ? 2 : 1), u * (this.ws.length > 6 ? 8.5 : 12), u * 4.6);
      const box = U.el('div', 'th-abs', this.el);
      Object.assign(box.style, { left: W * 0.1 + 'px', right: W * 0.1 + 'px', top: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', alignContent: 'center', textAlign: 'center', font: `400 ${fsz.toFixed(1)}px var(--hand)`, lineHeight: '1.15', columnGap: '0.32em', transform: `rotate(${this.r.range(-4, 2).toFixed(1)}deg)` });
      this.box = box;
      this.items = this.ws.map((w) => {
        const e = U.el('span', 'fg-w', box, K.bare(w).toLowerCase());
        if (art) { e.style.backgroundImage = `url("${art}")`; e.style.textShadow = '0 0 0.07em rgba(255,255,255,0.9), 0 0.015em 0.03em rgba(20,30,40,0.35)'; e.style.webkitTextStroke = '0.012em rgba(255,255,255,0.35)'; }
        else { e.style.color = 'rgba(40,50,60,0.55)'; }
        e.style.clipPath = 'inset(-20% 100% -20% -5%)';
        if (art) e.style.filter = 'saturate(1.35) brightness(0.82) contrast(1.12)';
        return { w, e, drips: [], p: -1 };
      });
      this.art = art;
      this.placed = false;
    }
    place() {
      // the sharp cover shows through each letter exactly where it sits behind the glass
      const img = this.ctx.artImg;
      const iw = (img && img.naturalWidth) || 1, ih = (img && img.naturalHeight) || 1;
      const s = Math.max(this.W / iw, this.H / ih), bw = iw * s, bh = ih * s, ox = (this.W - bw) / 2, oy = (this.H - bh) / 2;
      const bx = this.box.offsetLeft, by = this.box.offsetTop;
      for (const it of this.items) {
        const x = bx + it.e.offsetLeft, y = by + it.e.offsetTop;
        it.e.style.backgroundSize = `${bw.toFixed(1)}px ${bh.toFixed(1)}px`;
        it.e.style.backgroundPosition = `${(ox - x).toFixed(1)}px ${(oy - y).toFixed(1)}px`;
        const r = U.rng(U.hash(it.w.w + this.L.i));
        const n = r.int(0, 2);
        for (let k = 0; k < n; k++) {
          const d = U.el('div', '', this.box);
          Object.assign(d.style, { position: 'absolute', left: x - bx + it.e.offsetWidth * r.range(0.15, 0.85) + 'px', top: y - by + it.e.offsetHeight * 0.78 + 'px', width: Math.max(2, this.u * 0.28) + 'px', height: '0px', borderRadius: '99px', background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.08))' });
          it.drips.push({ d, len: it.e.offsetHeight * r.range(0.3, 1.1), sp: r.range(0.5, 1.4) });
        }
      }
      this.placed = true;
    }
    update(t) {
      if (!this.placed && this.box.offsetWidth) this.place();
      for (const it of this.items) {
        const dur = Math.max(0.22, Math.min(0.6, it.w.dur * 0.85));
        const p = U.prog(it.w.t - 0.04, it.w.t - 0.04 + dur, t);
        if (p !== it.p) { it.p = p; it.e.style.clipPath = p < 1 ? `inset(-20% ${((1 - U.e('inOutSine', p)) * 105).toFixed(1)}% -20% -5%)` : 'none'; }
        for (const d of it.drips) { const k = U.sat((t - it.w.t - 0.35) * 0.45 * d.sp); d.d.style.height = (d.len * U.e('outCubic', k)).toFixed(1) + 'px'; }
      }
    }
    focus() { const it = this.items.filter((x) => this.mode.t >= x.w.t - 0.05).pop() || this.items[0]; return { x: this.box.offsetLeft + it.e.offsetLeft + it.e.offsetWidth / 2, y: this.box.offsetTop + it.e.offsetTop + it.e.offsetHeight / 2 }; }
  }
  Ed.add('fog', Fog, { fam: 'thing', w: 1.15, max: 12, vars: 1, moods: { sad: 1.8, tender: 1.6, hype: 0.5 }, cams: ['still', 'push', 'drift', 'track'], trig: 'rain cold window outside inside cry tears winter breath miss missing alone you name' });

  // ================================================================ 27. a label maker punching out the line
  class Label extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 60% 55% at 45% 45%, rgba(255,250,240,0.2), rgba(0,0,0,0.5)), url(${K.tex(this.v % 2 ? 'wood' : 'concrete')})`;
      bg.style.backgroundSize = `100% 100%, ${this.v % 2 ? 1000 : 700}px auto`;
      const tapeCol = ['#c62828', '#151515', '#1e4fbd', '#2e7d32'][this.v % 4];
      this.slotX = W * 0.74;
      const T = K.text(L).toUpperCase();
      let th = u * 7.2;
      const tw0 = U.textWidth(T, `700 ${(th * 0.58).toFixed(1)}px 'Oley Round'`) * 1.1 + u * 4;
      if (tw0 > this.slotX - W * 0.05) th *= (this.slotX - W * 0.05) / tw0;
      th = Math.max(u * 3.2, th);
      this.tapeY = H * 0.5 - th / 2;
      const tape = U.el('div', 'lb-tape', this.el);
      Object.assign(tape.style, { right: W - this.slotX + 'px', top: this.tapeY + 'px', height: th + 'px', borderRadius: u * 0.35 + 'px',
        background: `linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.05) 22%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.18) 100%), ${tapeCol}`,
        boxShadow: '0 0.5vmin 1.2vmin rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: `0 ${u * 1.4}px 0 ${u * 2.4}px`, boxSizing: 'border-box' });
      const txt = U.el('div', '', tape);
      Object.assign(txt.style, { font: `700 ${(th * 0.58).toFixed(1)}px 'Oley Round', 'Oley Sans', sans-serif`, letterSpacing: '0.1em', color: 'rgba(250,250,250,0.94)', textShadow: '0 -0.04em 0 rgba(0,0,0,0.45), 0 0.05em 0 rgba(255,255,255,0.35), 0 0 0.02em rgba(255,255,255,0.4)', textTransform: 'uppercase' });
      this.tape = tape; this.txt = txt;
      this.chars = [];
      this.ws.forEach((w, wi) => {
        const s = K.bare(w).toUpperCase(), span = K.span(w);
        for (let k = 0; k < s.length; k++) { const e = U.el('span', '', txt, s[k]); e.style.display = 'none'; this.chars.push({ e, t: w.t - 0.02 + (k / s.length) * span }); }
        if (wi < this.ws.length - 1) { const e = U.el('span', '', txt, ' '); e.style.display = 'none'; this.chars.push({ e, t: w.t - 0.02 + span + 0.01 }); }
      });
      // the label maker itself
      const dev = U.el('div', 'th-abs', this.el);
      Object.assign(dev.style, { left: this.slotX - u * 1 + 'px', top: H * 0.27 + 'px', width: W * 0.36 + 'px', height: H * 0.46 + 'px', borderRadius: `${u * 4}px ${u * 10}px ${u * 10}px ${u * 4}px`,
        background: 'radial-gradient(ellipse 60% 50% at 30% 25%, #4a4b50, #26272b 60%, #151518)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset -1vmin -1.5vmin 3vmin rgba(0,0,0,0.5), 0 2vmin 5vmin rgba(0,0,0,0.6)', zIndex: 3 });
      const slot = U.el('div', '', dev); Object.assign(slot.style, { position: 'absolute', left: '0', top: H * 0.23 - th * 0.65 + 'px', width: u * 1.6 + 'px', height: th * 1.3 + 'px', background: '#050505', borderRadius: '0 3px 3px 0' });
      const dial = U.el('div', '', dev); Object.assign(dial.style, { position: 'absolute', left: '30%', top: '18%', width: H * 0.24 + 'px', height: H * 0.24 + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #5b5c62, #2a2b2f 65%)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.12), 0 0.6vmin 1.4vmin rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.75)', font: `700 ${u * 1.1}px 'Oley Sans', sans-serif` });
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((ch, i) => { const s = U.el('span', '', dial, ch); const a = (i / 26) * Math.PI * 2; Object.assign(s.style, { position: 'absolute', left: 50 + Math.cos(a) * 40 + '%', top: 50 + Math.sin(a) * 40 + '%', transform: 'translate(-50%,-50%)' }); });
      this.dial = dial;
      this.wid = O.sp(u * 3.8);
    }
    update(t, dt) {
      const L = this.L;
      let n = 0;
      for (const c of this.chars) { const on = t >= c.t; if (on !== c.on) { c.on = on; c.e.style.display = on ? '' : 'none'; } if (on) n++; }
      const target = this.txt.offsetWidth + this.u * 3.8;
      O.spring(this.wid, target, 22, dt);
      this.tape.style.width = this.wid.x.toFixed(1) + 'px';
      const cut = U.prog(L.singEnd + 0.12, L.singEnd + 0.12 + Math.min(0.5, this.tail * 0.85), t);
      const g = U.e('inQuad', cut);
      this.tape.style.transform = cut > 0 ? `translate(${(-g * this.u * 4).toFixed(1)}px,${(g * this.u * 2.6).toFixed(1)}px) rotate(${(-g * 4).toFixed(2)}deg)` : 'none';
      this.dial.style.transform = `rotate(${(-n * 13.8).toFixed(1)}deg)`;
    }
    focus() { return { x: this.slotX - Math.min(this.wid.x, this.W * 0.3) / 2, y: this.tapeY }; }
  }
  Ed.add('label', Label, { fam: 'thing', w: 1, max: 9, vars: 4, cams: ['still', 'push', 'track', 'drift'], trig: 'name names label call called mine yours who print' });

  // ================================================================ 28. a ransom note of cut-out letters
  class Ransom extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      bg.style.backgroundImage = `radial-gradient(ellipse 30% 40% at 30% 35%, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%), radial-gradient(ellipse 40% 30% at 72% 70%, rgba(0,0,0,0.08), rgba(0,0,0,0) 70%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35)), url(${K.tex('paper')})`;
      bg.style.backgroundSize = '100% 100%, 100% 100%, 100% 100%, 420px auto';
      const total = K.text(L).length;
      const base = u * (total > 34 ? 4.4 : total > 20 ? 5.6 : 7.4);
      const box = U.el('div', 'th-abs', this.el);
      Object.assign(box.style, { left: W * 0.08 + 'px', right: W * 0.08 + 'px', top: 0, bottom: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', rowGap: base * 0.25 + 'px' });
      this.box = box;
      const fonts = ["900 {s} 'Oley Display', sans-serif", "400 {s} 'Oley Heavy', sans-serif", "italic 700 {s} 'Oley Serif', serif", "700 {s} 'Oley Round', sans-serif", "400 {s} 'Oley Black', sans-serif", "700 {s} var(--mono)", "600 {s} 'Oley Serif', serif"];
      const pal = this.pal;
      const bgs = [['#fdfdfb', '#111'], ['#111', '#fafafa'], ['#e3dccb', '#1a1a1a'], ['#ffe14a', '#111'], ['#d62828', '#fff'], [U.hex(U.vivid(pal.vivid, 0.6, 0.9)), '#fff'], ['news', '#111'], ['cover', '#fff']];
      this.chars = [];
      this.ws.forEach((w) => {
        const s = K.bare(w), span = K.span(w);
        const wd = U.el('span', '', box); wd.style.display = 'inline-flex'; wd.style.marginRight = base * 0.42 + 'px'; wd.style.alignItems = 'center';
        for (let k = 0; k < s.length; k++) {
          const c = U.el('span', 'rn-c', wd, r.chance(0.5) ? s[k].toUpperCase() : s[k].toLowerCase());
          const f = r.pick(fonts), sz = base * r.range(0.82, 1.28);
          const [b, fg] = r.pick(bgs);
          c.style.font = f.replace('{s}', sz.toFixed(1) + 'px');
          c.style.color = fg;
          c.style.padding = `${(sz * r.range(0.06, 0.16)).toFixed(1)}px ${(sz * r.range(0.08, 0.16)).toFixed(1)}px`;
          if (b === 'news') { c.style.backgroundImage = `url(${K.tex('paper')})`; c.style.backgroundColor = '#d9d6cf'; c.style.backgroundBlendMode = 'multiply'; }
          else if (b === 'cover' && this.ctx.art) { c.style.backgroundImage = `url("${this.ctx.art}")`; c.style.backgroundSize = `${(sz * 6).toFixed(0)}px`; c.style.backgroundPosition = `${r.int(0, 100)}% ${r.int(0, 100)}%`; c.style.textShadow = '0 0.03em 0.06em rgba(0,0,0,0.6)'; }
          else c.style.background = b;
          const pts = [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => `${(x + r.range(-5, 5)).toFixed(1)}% ${(y + r.range(-6, 6)).toFixed(1)}%`);
          c.style.clipPath = `polygon(${pts.join(',')})`;
          c.style.opacity = '0';
          this.chars.push({ c, t: w.t - 0.02 + (k / s.length) * span, rot: r.range(-9, 9), dy: r.range(-0.12, 0.12) * sz });
        }
      });
    }
    update(t) {
      for (const ch of this.chars) {
        const p = U.prog(ch.t, ch.t + 0.09, t);
        if (p === ch.p) continue;
        ch.p = p;
        ch.c.style.opacity = p > 0 ? '1' : '0';
        ch.c.style.transform = `translateY(${ch.dy.toFixed(1)}px) rotate(${ch.rot.toFixed(1)}deg) scale(${(1.35 - 0.35 * U.e('outCubic', p)).toFixed(3)})`;
      }
    }
    focus() { const ch = this.chars.filter((x) => this.mode.t >= x.t).pop() || this.chars[0]; const p = K.off(ch.c, this.el); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }
  }
  Ed.add('ransom', Ransom, { fam: 'thing', w: 1, max: 10, vars: 1, moods: { angry: 2, hype: 1.5, tender: 0.4 }, cams: ['still', 'push', 'hand', 'track', 'dutch'], trig: 'want need give money pay take back tell never now or else threat hurt' });

  // ================================================================ 29. a rubber stamp slammed on a document
  class Stamp extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const doc = U.el('div', 'ed-fill', this.el);
      doc.style.backgroundImage = `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.3)), url(${K.tex('paper')})`;
      doc.style.backgroundSize = '100% 100%, 380px auto';
      doc.style.backgroundColor = '#f6f3ea';
      this.doc = doc;
      const tr = this.ctx.track || {};
      const fs = Math.max(13, u * 1.7);
      const head = U.el('div', 'th-abs', doc);
      Object.assign(head.style, { left: W * 0.14 + 'px', right: W * 0.14 + 'px', top: H * 0.1 + 'px', font: `400 ${fs}px 'Courier New', var(--mono)`, color: '#2a2a2a', lineHeight: '1.65' });
      head.innerHTML = `<div style="font:700 ${(fs * 1.25).toFixed(1)}px 'Oley Sans',sans-serif;letter-spacing:0.3em;border-bottom:2px solid #2a2a2a;padding-bottom:0.4em;margin-bottom:0.8em">${K.esc(String(tr.artist || 'OLEY').toUpperCase())}</div>` +
        `DATE: ${K.esc(K.now().toLocaleDateString())}<br>RE:&nbsp;&nbsp; ${K.esc(String(tr.title || '').toUpperCase())}<br>REF:&nbsp; ${U.hash(L.text) % 90000 + 10000}`;
      const body = U.el('div', 'th-abs', doc);
      Object.assign(body.style, { left: W * 0.14 + 'px', right: W * 0.14 + 'px', top: H * 0.36 + 'px', font: `400 ${(fs * 1.25).toFixed(1)}px 'Courier New', var(--mono)`, color: '#1d1d1d', lineHeight: '1.5' });
      this.words = K.wordEls(body, this.ws);
      for (let i = 0; i < 5; i++) { const b = U.el('div', 'th-abs', doc); Object.assign(b.style, { left: W * 0.14 + 'px', width: W * r.range(0.4, 0.72) + 'px', top: H * (0.62 + i * 0.05) + 'px', height: fs * 0.55 + 'px', background: 'rgba(40,40,40,0.16)', borderRadius: '2px', filter: 'blur(0.6px)' }); }
      const kw = K.clean(K.bare(K.key(L))).toUpperCase() || 'VOID';
      const ink = ['rgba(196,28,38,0.86)', 'rgba(28,62,168,0.84)', 'rgba(20,20,20,0.86)'][this.v % 3];
      const st = U.el('div', 'th-abs', this.el);
      const sz = K.fit(kw, "400 {s} 'Oley Heavy'", W * 0.44, u * 10, u * 4);
      Object.assign(st.style, { left: W * r.range(0.42, 0.52) + 'px', top: H * r.range(0.5, 0.58) + 'px', padding: `${sz * 0.12}px ${sz * 0.28}px ${sz * 0.06}px`, border: `${sz * 0.075}px solid ${ink}`, outline: `${sz * 0.03}px solid ${ink}`, outlineOffset: `${sz * 0.05}px`, color: ink,
        font: `400 ${sz.toFixed(1)}px 'Oley Heavy', 'Oley Sans', sans-serif`, letterSpacing: '0.06em', lineHeight: '1', textAlign: 'center', whiteSpace: 'nowrap', borderRadius: sz * 0.06 + 'px', opacity: '0',
        WebkitMaskImage: `url(${K.tex('distress')})`, maskImage: `url(${K.tex('distress')})`, WebkitMaskSize: '360px', maskSize: '360px', mixBlendMode: 'multiply', transformOrigin: '50% 50%' });
      st.innerHTML = `${K.esc(kw)}<div style="font:700 ${(sz * 0.2).toFixed(1)}px 'Oley Sans',sans-serif;letter-spacing:0.3em;margin-top:0.25em">${K.esc(K.now().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase())}</div>`;
      this.st = st;
      this.rot = r.range(-14, -6);
      this.kt = K.key(L).t;
    }
    update(t) {
      K.wordAnim(this.words, t, 0.14, (it, p, el) => { el.style.opacity = p > 0 ? '1' : '0'; });
      const p = U.prog(this.kt - 0.12, this.kt, t);
      const e = U.e('inQuad', p);
      this.st.style.opacity = p > 0 ? U.sat(p * 1.4).toFixed(3) : '0';
      this.st.style.transform = `translate(-50%,-50%) rotate(${this.rot.toFixed(1)}deg) scale(${(1.9 - 0.9 * e).toFixed(4)})`;
      this.st.style.filter = p < 1 ? `blur(${((1 - e) * 6).toFixed(1)}px)` : 'none';
      const k = t - this.kt;
      const sh = k > 0 && k < 0.3 ? Math.exp(-k * 14) : 0;
      this.doc.style.transform = sh ? `translate(${(Math.sin(k * 90) * sh * this.u * 0.6).toFixed(1)}px,${(Math.cos(k * 70) * sh * this.u * 0.8).toFixed(1)}px)` : 'none';
    }
    focus() { return this.mode.t > this.kt - 0.2 ? { x: this.st.offsetLeft, y: this.st.offsetTop } : { x: this.W / 2, y: this.H * 0.4 }; }
  }
  Ed.add('stamp', Stamp, { fam: 'thing', w: 1, max: 14, vars: 3, adlib: false, cams: ['still', 'push', 'drift', 'track'], trig: 'never no yes done over final deal sign signed approved denied rejected official promise end enough' });
})();
