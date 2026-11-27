/* Editlyric scenes — kinetic type: words that fall and pile up, a magnifying glass reading the line,
   a tunnel built from the words, a pane of glass that shatters on the key word, a Swiss poster and a
   film still with subtitles. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-kinetic', `
.m-ed .kn { position: absolute; }
.m-ed .kn-box { position: absolute; left: 0; top: 0; white-space: nowrap; line-height: 1; will-change: transform; }
.m-ed .kn-wall { position: absolute; left: 50%; top: 50%; white-space: nowrap; overflow: hidden; backface-visibility: hidden; }
.m-ed .kn-shard { position: absolute; inset: 0; will-change: transform, opacity; }
.m-ed .kn-mask { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: 0.06em; margin-bottom: -0.06em; }
.m-ed .kn-mask > span { display: inline-block; will-change: transform; }
`);

  // ================================================================ 40. words drop in and pile up
  class Fall extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const theme = this.v % 3;
      const acc = K.accent(this, 0.6, 0.85);
      const bgc = ['#efede6', acc, '#0b0b0c'][theme], fg = ['#121212', '#fff', '#f2f2f2'][theme];
      this.dark = theme !== 0;
      this.el.style.background = bgc;
      if (theme === 0) { const p = U.el('div', 'ed-fill', this.el); p.style.backgroundImage = `url(${K.tex('paper')})`; p.style.opacity = '0.5'; p.style.mixBlendMode = 'multiply'; }
      const n = this.ws.length;
      const base = u * (n > 10 ? 4.6 : n > 6 ? 5.8 : 7.6);
      this.floor = H * 0.9;
      this.boxes = this.ws.map((w, i) => {
        const e = U.el('div', 'kn-box', this.el, K.bare(w));
        const big = w.key ? 1.55 : r.range(0.85, 1.12);
        Object.assign(e.style, { font: `${w.key ? 900 : 800} ${(base * big).toFixed(1)}px 'Oley Display', 'Oley Sans', sans-serif`, color: w.key && theme !== 1 ? acc : fg, letterSpacing: '-0.03em', padding: '0.02em 0.04em', opacity: '0' });
        if (w.key && theme === 1) { e.style.background = '#111'; e.style.padding = '0.06em 0.16em'; }
        return { w, e, i, x: 0, y: -H * 0.2, vy: 0, a: r.range(-30, 30), va: r.range(-90, 90), drop: w.t - 0.06, live: false, rest: false, wpx: 0, hpx: 0, tx: 0 };
      });
      this.sky = new Float32Array(Math.ceil(W / 4) + 2).fill(this.floor);
      const fl = U.el('div', 'kn', this.el);
      Object.assign(fl.style, { left: 0, right: 0, top: this.floor + 'px', height: '2px', background: fg, opacity: '0.25' });
      this.shake = 0;
      this.wrapEl = this.el;
    }
    update(t, dt) {
      const W = this.W, g = this.H * 5.2;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (const B of this.boxes) {
        if (!B.live && t >= B.drop) {
          B.live = true;
          B.wpx = B.e.offsetWidth; B.hpx = B.e.offsetHeight;
          const r = U.rng(U.hash(B.w.w + B.i + this.L.i));
          B.x = U.clamp(W * 0.12 + r() * (W * 0.76 - B.wpx), W * 0.03, W * 0.97 - B.wpx);
          B.y = -B.hpx * 1.1; B.vy = this.H * 1.4;
          B.e.style.opacity = '1';
        }
        if (!B.live || B.rest) continue;
        for (let s = 0; s < steps; s++) {
          B.vy += g * h; B.y += B.vy * h; B.a += B.va * h; B.va *= Math.pow(0.2, h);
          const i0 = Math.max(0, Math.floor(B.x / 4)), i1 = Math.min(this.sky.length - 1, Math.ceil((B.x + B.wpx) / 4));
          let top = this.floor;
          for (let k = i0; k <= i1; k++) top = Math.min(top, this.sky[k]);
          if (B.y + B.hpx >= top) {
            B.y = top - B.hpx;
            if (B.vy > this.H * 0.6) { B.vy = -B.vy * 0.28; B.va = -B.a * 6; if (B.w.key) this.shake = 1; }
            else { B.vy = 0; B.rest = true; B.a = U.clamp(B.a * 0.15, -4, 4); for (let k = i0; k <= i1; k++) this.sky[k] = B.y + B.hpx * 0.06; break; }
          }
        }
      }
      this.shake = Math.max(0, this.shake - dt * 4);
      const sx = Math.sin(t * 80) * this.shake * this.u * 0.8, sy = Math.cos(t * 70) * this.shake * this.u * 0.6;
      for (const B of this.boxes) if (B.live) B.e.style.transform = `translate(${(B.x + sx).toFixed(1)}px,${(B.y + sy).toFixed(1)}px) rotate(${B.a.toFixed(2)}deg)`;
    }
    focus() { const B = this.boxes.filter((b) => b.live).pop(); return B ? { x: B.x + B.wpx / 2, y: Math.max(B.y + B.hpx / 2, this.H * 0.3) } : { x: this.W / 2, y: this.H / 2 }; }
  }
  Ed.add('fall', Fall, { fam: 'kinetic', w: 1.1, max: 14, vars: 3, moods: { hype: 1.5, angry: 1.4, sad: 0.8 }, cams: ['still', 'push', 'hand', 'track'], trig: 'fall falling fell down drop dropped crash crashing heavy weight gravity ground floor' });

  // ================================================================ 41. a magnifying glass reading the line
  class Lens extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = false;
      const W = this.W, H = this.H, u = this.u;
      const page = U.el('div', 'ed-fill', this.el);
      page.style.backgroundImage = `radial-gradient(ellipse 80% 70% at 50% 45%, rgba(255,255,255,0.1), rgba(0,0,0,0.25)), url(${K.tex('paper')})`;
      page.style.backgroundColor = '#efe9dc';
      page.style.backgroundBlendMode = 'normal, multiply';
      const fs = Math.max(13, u * 1.75);
      const mkText = (parent) => {
        const tx = U.el('div', 'kn', parent);
        Object.assign(tx.style, { left: W * 0.08 + 'px', right: W * 0.08 + 'px', top: H * 0.1 + 'px', bottom: H * 0.06 + 'px', font: `400 ${fs}px 'Oley Serif', Georgia, serif`, color: '#2a2622', lineHeight: '1.7', textAlign: 'justify', overflow: 'hidden' });
        const prev = [];
        for (let i = L.i - 1; i >= 0 && prev.length < 10; i--) { const P = this.ctx.tl.lines[i]; if (P && P.text) prev.unshift(K.text(P)); }
        tx.appendChild(document.createTextNode(prev.join(' · ') + (prev.length ? ' · ' : '')));
        const spans = this.ws.map((w, i) => { const s = U.el('span', '', tx, K.bare(w)); if (i < this.ws.length - 1) tx.appendChild(document.createTextNode(' ')); return s; });
        return { tx, spans };
      };
      this.base = mkText(this.el);
      const D = Math.min(H * 0.42, W * 0.3);
      this.D = D;
      this.sh = U.el('div', 'kn', this.el);
      Object.assign(this.sh.style, { left: 0, top: 0, width: D + 'px', height: D + 'px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.32), rgba(0,0,0,0) 70%)', filter: 'blur(6px)' });
      this.hd = U.el('div', 'kn', this.el);
      Object.assign(this.hd.style, { left: 0, top: 0, width: D * 0.16 + 'px', height: D * 0.75 + 'px', borderRadius: D * 0.06 + 'px', background: 'linear-gradient(90deg,#1b1210,#4a2f22 45%,#22160f)', boxShadow: '0 1vmin 2vmin rgba(0,0,0,0.45)', transformOrigin: '50% 0' });
      this.lens = U.el('div', 'kn', this.el);
      Object.assign(this.lens.style, { left: 0, top: 0, width: D + 'px', height: D + 'px', borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 ${D * 0.035}px #b9bcc2, 0 0 0 ${D * 0.05}px #6f7279, 0 1.6vmin 3vmin rgba(0,0,0,0.45), inset 0 0 ${D * 0.08}px rgba(0,0,0,0.35)`, background: '#efe9dc' });
      const inner = U.el('div', 'kn', this.lens);
      Object.assign(inner.style, { left: 0, top: 0, width: W + 'px', height: H + 'px', backgroundImage: page.style.backgroundImage, backgroundColor: '#efe9dc', backgroundBlendMode: 'normal, multiply', transformOrigin: '0 0' });
      this.mag = mkText(inner);
      this.inner = inner;
      const glare = U.el('div', 'ed-fill', this.lens);
      glare.style.background = 'radial-gradient(ellipse 40% 26% at 32% 24%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%), radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(80,90,100,0.25) 72%, rgba(0,0,0,0) 74%)';
      this.Z = 2.1;
      this.p = { x: O.sp(W * 0.3), y: O.sp(H * 0.4) };
      this.acc = K.accent(this, 0.6, 0.6);
    }
    update(t, dt) {
      const W = this.W, H = this.H, D = this.D;
      let cur = 0;
      this.ws.forEach((w, i) => { if (t >= w.t - 0.05) cur = i; });
      [this.base, this.mag].forEach((S) => S.spans.forEach((s, i) => { const on = t >= this.ws[i].t - 0.05; const st = i === cur && on ? 2 : on ? 1 : 0; if (st !== s._st) { s._st = st; s.style.fontWeight = st ? '700' : '400'; s.style.color = st === 2 ? this.acc : ''; } }));
      const sp = this.base.spans[cur];
      const tx = this.base.tx;
      const fx = tx.offsetLeft + sp.offsetLeft + sp.offsetWidth / 2, fy = tx.offsetTop + sp.offsetTop + sp.offsetHeight / 2;
      if (!this._i) { this.p.x.x = fx; this.p.y.x = fy; this._i = true; }
      O.spring(this.p.x, fx, 7, dt); O.spring(this.p.y, fy, 7, dt);
      const cx = this.p.x.x, cy = this.p.y.x;
      const lx = cx - D / 2, ly = cy - D / 2;
      this.lens.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
      this.sh.style.transform = `translate(${(lx + D * 0.12).toFixed(1)}px,${(ly + D * 0.16).toFixed(1)}px)`;
      this.hd.style.transform = `translate(${(cx + D * 0.32).toFixed(1)}px,${(cy + D * 0.36).toFixed(1)}px) rotate(-38deg)`;
      this.inner.style.transform = `translate(${(-lx + cx - cx * this.Z).toFixed(1)}px,${(-ly + cy - cy * this.Z).toFixed(1)}px) scale(${this.Z})`;
      void W; void H;
    }
    focus() { return { x: this.p.x.x, y: this.p.y.x }; }
  }
  Ed.add('lens', Lens, { fam: 'kinetic', w: 1, min: 2, max: 16, vars: 1, cams: ['still', 'push', 'drift'], trig: 'look looking see closer close detail small find search notice little' });

  // ================================================================ 42. a tunnel built from the words
  class Tunnel extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u;
      const acc = K.accent(this, 0.7, 1);
      this.el.style.background = '#030303';
      const persp = Math.min(W, H) * 0.55;
      const sc = U.el('div', 'ed-fill', this.el);
      sc.style.perspective = persp + 'px';
      sc.style.overflow = 'hidden';
      const rig = U.el('div', 'kn', sc);
      Object.assign(rig.style, { left: '50%', top: '50%', width: '0', height: '0', transformStyle: 'preserve-3d' });
      this.rig = rig;
      const S = Math.min(W, H) * 0.95, len = S * 7;
      this.len = len; this.S = S;
      this.font = `400 ${(S * 0.15).toFixed(1)}px 'Oley Heavy', 'Oley Sans', sans-serif`;
      // the near end of the walls stays in front of the camera
      this.rigZ = persp * 0.7 - len / 2;
      const walls = [
        `translate(-50%,-50%) rotateX(-90deg) translateZ(${-S / 2}px)`,
        `translate(-50%,-50%) rotateX(90deg) translateZ(${-S / 2}px)`,
        `translate(-50%,-50%) rotateY(90deg) translateZ(${-S / 2}px)`,
        `translate(-50%,-50%) rotateY(-90deg) translateZ(${-S / 2}px)`,
      ];
      this.walls = walls.map((tf, i) => {
        const w = U.el('div', 'kn-wall', rig);
        const side = i >= 2;
        Object.assign(w.style, { width: (side ? len : S) + 'px', height: (side ? S : len) + 'px', transform: tf, background: i % 2 ? '#0b0b0d' : '#121215' });
        const tx = U.el('div', 'kn', w);
        Object.assign(tx.style, { left: 0, top: 0, font: this.font, color: i % 2 ? acc : '#ededed', textTransform: 'uppercase', lineHeight: '1.05', wordBreak: 'break-all', overflowWrap: 'anywhere' });
        if (side) Object.assign(tx.style, { width: len * 1.6 + 'px', height: S + 'px', whiteSpace: 'normal' });
        else Object.assign(tx.style, { writingMode: 'vertical-rl', textOrientation: 'mixed', height: len * 1.6 + 'px', width: S + 'px' });
        return { w, tx, side };
      });
      const fog = U.el('div', 'ed-fill', this.el);
      fog.style.background = 'radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.9) 9%, rgba(0,0,0,0) 46%)';
      this.big = U.el('div', 'kn', this.el);
      Object.assign(this.big.style, { left: '50%', top: '50%', font: `400 ${(u * 9).toFixed(1)}px 'Oley Heavy', 'Oley Sans', sans-serif`, color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap', textShadow: `0 0 0.3em ${acc}` });
      this.P = null;
    }
    update(t, dt, A) {
      const s = K.sung(this.ws, t, false).toUpperCase();
      if (s !== this._s) {
        this._s = s;
        const unit = s ? s + '  •  ' : '';
        this.per = unit ? Math.max(40, U.textWidth(unit, this.font)) : 1;
        const txt = unit ? unit.repeat(Math.ceil((this.len * 1.6 * 3) / this.per) + 2) : '';
        for (const W2 of this.walls) W2.tx.textContent = txt;
      }
      const off = -((t * this.S * 1.2) % this.per);
      for (const W2 of this.walls) W2.tx.style.transform = W2.side ? `translateX(${off.toFixed(1)}px)` : `translateY(${off.toFixed(1)}px)`;
      this.rig.style.transform = `translateZ(${this.rigZ.toFixed(1)}px) rotateZ(${(t * 5).toFixed(2)}deg)`;
      const cw = O.wordAt(this.L, t);
      const w = cw >= 0 ? this.L.words[cw] : null;
      const txt = w ? K.bare(w) : '';
      if (txt !== this._b) { this._b = txt; this.big.textContent = txt; this._bt = w ? w.t : 0; }
      const p = U.prog(this._bt, this._bt + 0.25, t);
      this.big.style.transform = `translate(-50%,-50%) scale(${(0.4 + 0.6 * U.e('outBack', p) + A.pulse * 0.03).toFixed(3)})`;
      this.big.style.opacity = txt ? U.sat(p * 3).toFixed(3) : '0';
      void dt;
    }
    focus() { return { x: this.W / 2, y: this.H / 2 }; }
  }
  Ed.add('tunnel', Tunnel, { fam: 'kinetic', w: 0.9, max: 12, vars: 1, adlib: true, moods: { hype: 2, angry: 1.6, sad: 0.4, tender: 0.4 }, cams: ['still', 'push', 'dutch', 'hand'], trig: 'fast run running faster speed tunnel deeper inside forever endless go higher' });

  // ================================================================ 43. a pane of glass that shatters on the key word
  class Shatter extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const bg = U.el('div', 'ed-fill', this.el);
      K.blurCover(this, bg, this.m * 0.02, 'filter:blur(' + Math.round(this.m * 0.02) + 'px) brightness(0.45) saturate(1.2)');
      const kw = K.key(L);
      this.kt = kw.t;
      const fsz = u * (this.ws.length > 7 ? 4.6 : 6.4);
      const mkPane = (parent) => {
        const p = U.el('div', 'ed-fill', parent);
        Object.assign(p.style, { background: 'linear-gradient(115deg, rgba(220,235,255,0.2) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.14) 36%, rgba(190,215,240,0.08) 60%, rgba(255,255,255,0.18) 100%)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' });
        const tx = U.el('div', 'kn', p);
        Object.assign(tx.style, { left: W * 0.1 + 'px', right: W * 0.1 + 'px', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', font: `800 ${fsz.toFixed(1)}px 'Oley Display', 'Oley Sans', sans-serif`, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: '1.08', textShadow: '0 0.04em 0.12em rgba(0,0,0,0.35)' });
        const spans = this.ws.map((w, i) => { const s = U.el('span', '', tx, K.bare(w)); s.style.opacity = '0'; if (i < this.ws.length - 1) tx.appendChild(document.createTextNode(' ')); return s; });
        return { p, tx, spans };
      };
      this.whole = mkPane(this.el);
      this.kidx = Math.max(0, this.ws.indexOf(kw));
      // after the break: the key word and the rest of the line, unbroken
      this.post = U.el('div', 'kn', this.el);
      Object.assign(this.post.style, { left: W * 0.08 + 'px', right: W * 0.08 + 'px', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', color: '#fff', zIndex: 3 });
      this.postItems = this.ws.slice(this.kidx).map((w, i) => {
        const e = U.el('span', '', this.post, K.bare(w));
        Object.assign(e.style, { display: i === 0 ? 'block' : 'inline-block', font: i === 0 ? `900 ${(fsz * 2.1).toFixed(1)}px 'Oley Display', sans-serif` : `700 ${(fsz * 0.8).toFixed(1)}px 'Oley Display', sans-serif`, letterSpacing: '-0.03em', marginRight: i ? '0.28em' : '0', lineHeight: '1.05', opacity: '0', textShadow: '0 0.05em 0.3em rgba(0,0,0,0.5)' });
        return { w, e };
      });
      // the cracks + shards, built at impact time
      this.cr = U.svg('svg', { class: 'kn', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, this.el);
      this.cr.style.left = '0'; this.cr.style.top = '0'; this.cr.style.opacity = '0';
      this.shards = null;
      this.r2 = U.rng(U.hash('sh' + L.i));
      void r;
    }
    impact() {
      const W = this.W, H = this.H, r = this.r2;
      const ks = this.whole.spans[Math.max(0, this.kidx)];
      const tx = this.whole.tx;
      const cx = tx.offsetLeft + ks.offsetLeft + ks.offsetWidth / 2, cy = tx.offsetTop - tx.offsetHeight / 2 + ks.offsetTop + ks.offsetHeight / 2;
      this.cx = cx; this.cy = cy;
      const N = 11, R1 = Math.min(W, H) * r.range(0.12, 0.2), R2 = Math.hypot(W, H);
      const angs = [];
      for (let i = 0; i < N; i++) angs.push(((i + r.range(0.15, 0.85)) / N) * Math.PI * 2);
      let d = '';
      angs.forEach((a) => { d += `M ${cx} ${cy} L ${cx + Math.cos(a) * R2} ${cy + Math.sin(a) * R2} `; });
      for (let ring = 0; ring < 2; ring++) { const R = R1 * (ring ? 2.3 : 1); d += 'M '; angs.forEach((a, i) => { d += `${(cx + Math.cos(a) * R * r.range(0.85, 1.15)).toFixed(1)} ${(cy + Math.sin(a) * R * r.range(0.85, 1.15)).toFixed(1)} ${i < angs.length - 1 ? 'L ' : 'Z '}`; }); }
      U.svg('path', { d, fill: 'none', stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 1.4 }, this.cr);
      // shards: wedges split by two rings
      const pts = (a, R) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
      this.shards = [];
      const tmpl = this.whole.p;
      angs.forEach((a, i) => {
        const b = angs[(i + 1) % N] + (i === N - 1 ? Math.PI * 2 : 0);
        const rs = [0, R1, R1 * 2.3, R2];
        for (let k = 0; k < 3; k++) {
          const poly = k === 0 ? [[cx, cy], pts(a, rs[1]), pts(b, rs[1])] : [pts(a, rs[k]), pts(a, rs[k + 1]), pts(b, rs[k + 1]), pts(b, rs[k])];
          const sh = tmpl.cloneNode(true);
          sh.classList.add('kn-shard');
          sh.style.clipPath = `polygon(${poly.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
          this.el.appendChild(sh);
          const mx = poly.reduce((s, p) => s + p[0], 0) / poly.length, my = poly.reduce((s, p) => s + p[1], 0) / poly.length;
          const dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1;
          const sp = (0.25 + r() * 0.6) * Math.min(W, H) * (k === 0 ? 1.6 : 1);
          this.shards.push({ el: sh, ox: mx, oy: my, vx: (dx / dl) * sp, vy: (dy / dl) * sp - Math.min(W, H) * 0.3, va: r.range(-260, 260), x: 0, y: 0, a: 0 });
        }
      });
      tmpl.style.visibility = 'hidden';
    }
    update(t, dt) {
      const kt = this.kt;
      this.whole.spans.forEach((s, i) => { const on = t >= this.ws[i].t - 0.04; if (on !== s._on) { s._on = on; s.style.opacity = on ? '1' : '0'; } });
      const crack = t >= kt - 0.02, boom = t >= kt + 0.16;
      this.cr.style.opacity = crack && !boom ? '1' : '0';
      if (crack && !this._cr) { this._cr = true; if (!this.shards) this.impact(); this.shards.forEach((S) => { S.el.style.visibility = 'hidden'; }); this.whole.p.style.visibility = ''; }
      if (boom && this.shards) {
        if (!this._boom) {
          this._boom = true; this.whole.p.style.visibility = 'hidden';
          this.shards.forEach((S) => { S.el.style.visibility = ''; S.el.querySelectorAll('span').forEach((s, i) => { s.style.opacity = t >= this.ws[i].t - 0.04 ? '1' : '0'; }); });
        }
        const g = this.H * 2.6;
        for (const S of this.shards) {
          S.vy += g * dt; S.x += S.vx * dt; S.y += S.vy * dt; S.a += S.va * dt;
          S.el.style.transformOrigin = `${S.ox.toFixed(0)}px ${S.oy.toFixed(0)}px`;
          S.el.style.transform = `translate(${S.x.toFixed(1)}px,${S.y.toFixed(1)}px) rotate(${S.a.toFixed(1)}deg)`;
        }
      }
      this.postItems.forEach((it, i) => {
        const t0 = i === 0 ? kt + 0.16 : Math.max(kt + 0.2, it.w.t - 0.04);
        const p = U.prog(t0, t0 + 0.22, t);
        it.e.style.opacity = U.sat(p * 2).toFixed(3);
        it.e.style.transform = i === 0 ? `scale(${(1.6 - 0.6 * U.e('outBack', p)).toFixed(3)})` : `translateY(${((1 - U.e('outCubic', p)) * 0.3).toFixed(2)}em)`;
      });
    }
    focus() { return { x: this.cx || this.W / 2, y: this.cy || this.H / 2 }; }
  }
  Ed.add('shatter', Shatter, { fam: 'kinetic', w: 0.9, min: 2, max: 14, vars: 1, needTrig: true, moods: { angry: 2, hype: 1.6 }, cams: ['still', 'push', 'hand'], trig: 'break broke broken shatter shattered glass apart pieces crack cracked crash fall falling smash tear destroy' });

  // ================================================================ 44. a Swiss poster
  class Poster extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const W = this.W, H = this.H, u = this.u, r = this.r;
      const pal = this.pal;
      const theme = this.v % 3;
      const acc = U.hex(U.vivid(pal.vivid, 0.65, 0.9));
      const bg = ['#f1eee6', '#111111', acc][theme], fg = ['#111', '#f1eee6', U.lum(U.parseHex(acc)) > 0.6 ? '#111' : '#fff'][theme];
      this.dark = theme !== 0;
      this.el.style.background = bg;
      this.el.style.color = fg;
      const paper = U.el('div', 'ed-fill', this.el); paper.style.backgroundImage = `url(${K.tex('paper')})`; paper.style.mixBlendMode = 'multiply'; paper.style.opacity = theme === 0 ? '0.6' : '0.25';
      const grid = U.el('div', 'ed-fill', this.el);
      grid.style.backgroundImage = `repeating-linear-gradient(90deg, ${theme === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'} 0 1px, transparent 1px ${(W / 12).toFixed(1)}px)`;
      const num = U.el('div', 'kn', this.el, ('0' + (L.i + 1)).slice(-2));
      Object.assign(num.style, { right: -W * 0.02 + 'px', top: -H * 0.16 + 'px', font: `400 ${H * 0.62}px 'Oley Black', sans-serif`, color: theme === 2 ? 'rgba(0,0,0,0.14)' : acc, letterSpacing: '-0.06em', lineHeight: '1', opacity: theme === 2 ? '1' : '0.95' });
      this.num = num;
      const blk = U.el('div', 'kn', this.el);
      Object.assign(blk.style, { left: W * 0.06 + 'px', top: H * 0.07 + 'px', width: W * 0.2 + 'px', height: u * 0.9 + 'px', background: fg });
      const tr = this.ctx.track || {};
      const meta = U.el('div', 'kn', this.el);
      Object.assign(meta.style, { left: W * 0.06 + 'px', top: H * 0.1 + 'px', font: `700 ${u * 1.2}px 'Oley Sans', sans-serif`, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: '1.5' });
      meta.innerHTML = `${K.esc(tr.artist || '')}<br><span style="opacity:0.6">${K.esc(tr.title || '')}</span><br><span style="opacity:0.6">No. ${('0' + (L.i + 1)).slice(-2)} — ${K.esc(K.now().getFullYear())}</span>`;
      const n = this.ws.length;
      const fsz = u * (n > 9 ? 5.4 : n > 5 ? 7 : 9.4);
      const tx = U.el('div', 'kn', this.el);
      Object.assign(tx.style, { left: W * 0.06 + 'px', right: W * 0.12 + 'px', bottom: H * 0.15 + 'px', font: `900 ${fsz.toFixed(1)}px 'Oley Display', 'Oley Sans', sans-serif`, letterSpacing: '-0.045em', lineHeight: '0.92', textTransform: this.v % 2 ? 'none' : 'lowercase' });
      this.items = this.ws.map((w, i) => {
        const m = U.el('span', 'kn-mask', tx);
        const s = U.el('span', '', m, K.bare(w));
        if (w.key && theme !== 2) s.style.color = acc;
        if (i < n - 1) tx.appendChild(document.createTextNode(' '));
        return { w, s, p: -1 };
      });
      const rule = U.el('div', 'kn', this.el);
      Object.assign(rule.style, { left: W * 0.06 + 'px', right: W * 0.06 + 'px', bottom: H * 0.1 + 'px', height: '3px', background: fg, transformOrigin: '0 50%' });
      this.rule = rule;
      K.grain(this.el, 0.18);
      void r;
    }
    update(t) {
      const L = this.L;
      for (const it of this.items) {
        const p = U.prog(it.w.t - 0.04, it.w.t + 0.2, t);
        if (p === it.p) continue;
        it.p = p;
        it.s.style.transform = `translateY(${((1 - U.e('outExpo', p)) * 105).toFixed(1)}%)`;
      }
      this.rule.style.transform = `scaleX(${U.e('inOutCubic', U.prog(L.t - 0.2, L.singEnd, t)).toFixed(4)})`;
      this.num.style.transform = `translateY(${((1 - U.e('outExpo', U.prog(L.t - 0.25, L.t + 0.4, t))) * -30).toFixed(1)}%)`;
    }
    focus() { const it = this.items.filter((x) => this.mode.t >= x.w.t - 0.05).pop() || this.items[0]; const p = K.off(it.s, this.el); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }
  }
  Ed.add('poster', Poster, { fam: 'kinetic', w: 1.2, max: 16, vars: 3, cams: ['still', 'push', 'drift', 'track'], trig: '' });

  // ================================================================ 45. a film still with subtitles
  class Film extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      this.caption = false;
      const W = this.W, H = this.H, u = this.u, r = this.r;
      this.el.style.background = '#000';
      const fh = Math.min(H, W / 2.39);
      const fr = U.el('div', 'kn', this.el);
      Object.assign(fr.style, { left: 0, right: 0, top: (H - fh) / 2 + 'px', height: fh + 'px', overflow: 'hidden' });
      this.img = K.cover(this, fr, 'filter:contrast(1.12) saturate(0.88) sepia(0.12)');
      const leak = U.el('div', 'ed-fill', fr);
      leak.style.background = 'radial-gradient(ellipse 50% 70% at 0% 30%, rgba(255,120,40,0.4), rgba(0,0,0,0) 60%)';
      leak.style.mixBlendMode = 'screen'; leak.style.opacity = '0';
      this.leak = leak;
      K.vig(fr, 0.8);
      K.grain(fr, 0.34);
      this.fr = fr;
      const yel = this.v % 2 === 1;
      const sub = U.el('div', 'kn', fr);
      Object.assign(sub.style, { left: W * 0.12 + 'px', right: W * 0.12 + 'px', bottom: fh * 0.08 + 'px', textAlign: 'center', font: `600 ${(u * 2.6).toFixed(1)}px 'Oley Sans', sans-serif`, color: yel ? '#ffe04a' : '#fff', lineHeight: '1.25',
        textShadow: '0 0 0.12em #000, 0.05em 0.05em 0 #000, -0.05em 0.05em 0 #000, 0.05em -0.05em 0 #000, -0.05em -0.05em 0 #000' });
      this.chunks = K.chunks(L, U.clamp(Math.ceil(this.ws.length / 7), 1, 3));
      this.sub = sub;
      this.items = [];
      if (this.v % 2 === 0) {
        const tc = U.el('div', 'kn', fr);
        Object.assign(tc.style, { left: W * 0.03 + 'px', top: fh * 0.06 + 'px', color: 'rgba(255,255,255,0.8)', font: `500 ${u * 1.2}px var(--mono)`, letterSpacing: '0.08em' });
        this.tc = tc;
      }
      this.n = U.noise1(U.hash('fm' + L.i));
      this.lt = r.range(0, 4);
    }
    update(t) {
      const ci = Math.max(0, this.chunks.findIndex((c, i) => !this.chunks[i + 1] || t < this.chunks[i + 1].t - 0.05));
      if (ci !== this._ci) { this._ci = ci; this.sub.innerHTML = ''; this.items = K.wordEls(this.sub, this.chunks[ci].words); }
      K.wordAnim(this.items, t, 0.12, (it, p, el) => { el.style.opacity = U.sat(p * 2).toFixed(3); });
      const a = this.age;
      this.fr.style.transform = `translate(${(this.n(a * 9) * 0.6).toFixed(2)}px,${(this.n(a * 7 + 3) * 0.8).toFixed(2)}px)`;
      this.img.style.transform = `scale(${(1.05 + a * 0.01).toFixed(4)})`;
      this.leak.style.opacity = U.sat(Math.sin((a + this.lt) * 0.9) * 1.4 - 0.4).toFixed(3);
      if (this.tc) { const f = Math.floor(t * 24); const s = `${('0' + Math.floor(t / 3600)).slice(-2)}:${('0' + Math.floor(t / 60) % 60).slice(-2)}:${('0' + Math.floor(t) % 60).slice(-2)}:${('0' + (f % 24)).slice(-2)}`; if (s !== this._tc) { this._tc = s; this.tc.textContent = s; } }
    }
    focus() { return { x: this.W / 2, y: this.H * 0.62 }; }
  }
  Ed.add('film', Film, { fam: 'kinetic', w: 1.1, max: 22, vars: 2, moods: { sad: 1.4, tender: 1.4 }, cams: ['still', 'push', 'drift', 'pull'], trig: 'movie film scene story remember memory memories night dream dreams' });
})();
