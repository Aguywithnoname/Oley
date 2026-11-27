/* Editlyric interludes: what fills the screen during intros and long instrumental breaks —
   a now-playing card with the real position and a live spectrum, a lock-screen glance with the clock,
   and a glowing spectrum on a glossy stage. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-inter', `
.m-ed .it-art { position: absolute; border-radius: 1.4vmin; overflow: hidden; box-shadow: 0 3vmin 7vmin rgba(0,0,0,0.55), 0 0.6vmin 1.6vmin rgba(0,0,0,0.4);
  -webkit-box-reflect: below 0.6vmin linear-gradient(transparent 58%, rgba(255,255,255,0.2)); will-change: transform; }
.m-ed .it-info { position: absolute; color: #fff; font-family: 'Oley Sans', sans-serif; }
.m-ed .it-info b { display: block; font: 700 var(--itT) 'Oley Display', sans-serif; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-ed .it-info small { display: block; font-size: var(--itA); opacity: 0.72; margin-top: 0.25em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-ed .it-bar { position: relative; height: 0.55vmin; border-radius: 99px; background: rgba(255,255,255,0.22); margin-top: 3vmin; overflow: hidden; }
.m-ed .it-bar i { position: absolute; left: 0; top: 0; bottom: 0; background: #fff; border-radius: 99px; }
.m-ed .it-tm { display: flex; justify-content: space-between; font-size: var(--itS); opacity: 0.6; margin-top: 0.8vmin; font-variant-numeric: tabular-nums; }
.m-ed .it-ctl { display: flex; justify-content: center; gap: 6vmin; font-size: var(--itC); margin-top: 2.2vmin; }
.m-ed .it-spec { display: flex; align-items: flex-end; gap: 0.35vmin; height: 5vmin; margin-top: 2.6vmin; }
.m-ed .it-spec i { flex: 1; background: rgba(255,255,255,0.85); border-radius: 0.3vmin 0.3vmin 0 0; min-height: 2px; }
.m-ed .it-clock { position: absolute; left: 0; right: 0; text-align: center; color: #fff; font-family: 'Oley Display', sans-serif; text-shadow: 0 0.4vmin 3vmin rgba(0,0,0,0.25); }
.m-ed .it-clock small { display: block; font: 600 var(--itD) 'Oley Sans', sans-serif; opacity: 0.85; letter-spacing: 0.01em; }
.m-ed .it-clock b { display: block; font-weight: 600; font-size: var(--itK); letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.m-ed .it-pill { position: absolute; left: 50%; display: flex; align-items: center; gap: 1.6vmin; padding: 1.2vmin 2.2vmin 1.2vmin 1.2vmin; border-radius: 2.4vmin;
  background: rgba(30,30,34,0.55); backdrop-filter: blur(20px) saturate(1.4); -webkit-backdrop-filter: blur(20px) saturate(1.4); color: #fff; font: 500 var(--itS) 'Oley Sans', sans-serif; transform: translateX(-50%); white-space: nowrap; }
.m-ed .it-pill .th { position: relative; width: 6vmin; height: 6vmin; border-radius: 1vmin; overflow: hidden; flex: none; }
.m-ed .it-pill .bars { display: flex; gap: 0.4vmin; align-items: flex-end; height: 2.6vmin; }
.m-ed .it-pill .bars i { width: 0.5vmin; background: var(--acc); border-radius: 0.3vmin; }
.m-ed .it-eq { position: absolute; left: 50%; display: flex; align-items: flex-end; transform: translateX(-50%); -webkit-box-reflect: below 0.4vmin linear-gradient(transparent 40%, rgba(255,255,255,0.28)); }
.m-ed .it-eq i { border-radius: 0.4vmin 0.4vmin 0 0; }
`);

  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };

  // ---- now playing card
  class NowPlaying extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      this.caption = false;
      const W = this.W, H = this.H, u = this.u;
      const bg = U.el('div', 'ed-fill', this.el);
      K.blurCover(this, bg, this.m * 0.07, 'opacity:0.95');
      const dim = U.el('div', 'ed-fill', this.el);
      dim.style.background = 'radial-gradient(ellipse 90% 80% at 40% 40%, rgba(0,0,0,0.18), rgba(0,0,0,0.62))';
      const S = Math.min(H * 0.44, W * 0.27);
      const infoW = Math.min(W * 0.34, S * 1.3);
      const gx = (W - (S + u * 5 + infoW)) / 2;
      this.art = U.el('div', 'it-art', this.el);
      Object.assign(this.art.style, { left: gx + 'px', top: (H - S) / 2 - H * 0.03 + 'px', width: S + 'px', height: S + 'px' });
      K.cover(this, this.art);
      const tr = this.ctx.track || {};
      const info = U.el('div', 'it-info', this.el);
      Object.assign(info.style, { left: gx + S + u * 5 + 'px', width: infoW + 'px', top: '50%', transform: 'translateY(-56%)' });
      info.style.setProperty('--itT', (u * 3.4).toFixed(1) + 'px');
      info.style.setProperty('--itA', (u * 2).toFixed(1) + 'px');
      info.style.setProperty('--itS', Math.max(10, u * 1.25).toFixed(1) + 'px');
      info.style.setProperty('--itC', (u * 3).toFixed(1) + 'px');
      U.el('b', '', info, tr.title || 'Untitled');
      U.el('small', '', info, tr.artist || '');
      const bar = U.el('div', 'it-bar', info);
      this.fill = U.el('i', '', bar);
      const tm = U.el('div', 'it-tm', info);
      this.t1 = U.el('span', '', tm, '0:00');
      this.t2 = U.el('span', '', tm, '-0:00');
      const ctl = U.el('div', 'it-ctl', info);
      ctl.innerHTML = '<span style="transform:scaleX(-1);display:inline-block">' + K.icon('play') + K.icon('play') + '</span>' + K.icon('pause') + '<span>' + K.icon('play') + K.icon('play') + '</span>';
      const spec = U.el('div', 'it-spec', info);
      this.spec = [];
      for (let i = 0; i < 24; i++) this.spec.push(U.el('i', '', spec));
      this.n = U.noise1(U.hash('np' + this.L.t));
    }
    update(t, dt, A) {
      const dur = (this.ctx.track && this.ctx.track.duration) || this.ctx.tl.duration || 0;
      const p = dur ? U.sat(t / dur) : 0;
      this.fill.style.width = (p * 100).toFixed(2) + '%';
      const s1 = fmt(t), s2 = '-' + fmt(dur - t);
      if (s1 !== this._s1) { this._s1 = s1; this.t1.textContent = s1; this.t2.textContent = s2; }
      for (let i = 0; i < 24; i++) this.spec[i].style.height = (6 + 94 * U.sat(A.bands[i] * 1.25)).toFixed(1) + '%';
      const a = this.age;
      this.art.style.transform = `perspective(1400px) rotateY(${(9 + this.n(a * 0.3) * 4).toFixed(2)}deg) rotateX(${(this.n(a * 0.25 + 4) * 3).toFixed(2)}deg) scale(${(1 + A.pulse * 0.012).toFixed(4)})`;
    }
  }

  // ---- lock-screen glance: the real time over the cover
  class Glance extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      this.caption = false;
      const W = this.W, H = this.H, u = this.u;
      this.aod = this.v % 2 === 1;
      const bg = U.el('div', 'ed-fill', this.el);
      if (this.aod) bg.style.background = '#000';
      else {
        this.img = K.cover(this, bg, 'filter:blur(3px) saturate(1.1) brightness(0.8);transform:scale(1.08)');
        const g = U.el('div', 'ed-fill', this.el);
        g.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)';
      }
      const ck = U.el('div', 'it-clock', this.el);
      ck.style.top = H * (this.aod ? 0.3 : 0.12) + 'px';
      ck.style.setProperty('--itK', (u * (this.aod ? 13 : 17)).toFixed(1) + 'px');
      ck.style.setProperty('--itD', (u * 2).toFixed(1) + 'px');
      if (this.aod) { ck.style.opacity = '0.78'; ck.style.fontWeight = '500'; }
      const d = K.now();
      this.date = U.el('small', '', ck, d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
      this.clock = U.el('b', '', ck, K.clock(d));
      const tr = this.ctx.track || {};
      const pill = U.el('div', 'it-pill', this.el);
      pill.style.setProperty('--itS', Math.max(11, u * 1.6).toFixed(1) + 'px');
      pill.style.setProperty('--acc', K.accent(this));
      pill.style.bottom = H * (this.aod ? 0.2 : 0.1) + 'px';
      if (this.aod) pill.style.background = 'rgba(255,255,255,0.06)';
      const th = U.el('div', 'th', pill);
      K.cover(this, th);
      const tx = U.el('div', '', pill);
      tx.innerHTML = '<b style="font-weight:600">' + K.esc(tr.title || '') + '</b><br><span style="opacity:0.65">' + K.esc(tr.artist || '') + '</span>';
      const bars = U.el('div', 'bars', pill);
      bars.style.marginLeft = '2vmin';
      this.bars = [0, 1, 2, 3].map(() => U.el('i', '', bars));
    }
    update(t, dt, A) {
      const s = K.clock(K.now());
      if (s !== this._s) { this._s = s; this.clock.textContent = s; }
      this.bars.forEach((b, i) => { b.style.height = (18 + 82 * U.sat(A.bands[2 + i * 4] * 1.4)).toFixed(0) + '%'; });
      if (this.img) this.img.style.transform = `scale(${(1.08 + this.age * 0.006).toFixed(4)})`;
      void t;
    }
  }

  // ---- a glowing spectrum on a glossy black stage
  class Spectrum extends Shot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      this.dark = true;
      this.caption = false;
      const W = this.W, H = this.H, u = this.u;
      const acc = K.pal(this);
      const c1 = U.vivid(acc.vivid, 0.6, 1), c2 = U.vivid(acc.second, 0.55, 0.95);
      this.el.style.background = `radial-gradient(ellipse 70% 45% at 50% 70%, ${U.rgba(c1, 0.16)}, rgba(0,0,0,0) 70%), #050506`;
      const N = 40, bw = Math.min(W * 0.012, u * 1.3), gap = bw * 0.55;
      const eq = U.el('div', 'it-eq', this.el);
      eq.style.top = H * 0.24 + 'px';
      eq.style.height = H * 0.36 + 'px';
      eq.style.gap = gap + 'px';
      this.bars = [];
      for (let i = 0; i < N; i++) {
        const b = U.el('i', '', eq);
        const c = U.mix(c1, c2, i / (N - 1));
        Object.assign(b.style, { width: bw + 'px', background: `linear-gradient(180deg, ${U.rgba(U.mix(c, [255, 255, 255], 0.45), 1)}, ${U.rgba(c, 1)})`, boxShadow: `0 0 ${bw * 1.6}px ${U.rgba(c, 0.55)}` });
        this.bars.push(b);
      }
      const tr = this.ctx.track || {};
      const tt = U.el('div', 'ed-fill', this.el);
      Object.assign(tt.style, { top: H * 0.12 + 'px', bottom: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.8)', font: `600 ${(u * 1.5).toFixed(1)}px 'Oley Sans', sans-serif`, letterSpacing: '0.32em', textTransform: 'uppercase' });
      tt.textContent = (tr.title || '') + (tr.artist ? '  ·  ' + tr.artist : '');
      K.grain(this.el, 0.16);
      this.n = U.noise1(9);
    }
    update(t, dt, A) {
      const N = this.bars.length;
      for (let i = 0; i < N; i++) {
        const f = (i / (N - 1)) * 23, a = Math.floor(f), b = Math.min(23, a + 1), k = f - a;
        const v = U.lerp(A.bands[a], A.bands[b], k) * (0.9 + 0.2 * this.n(i * 0.7 + this.age * 2));
        this.bars[i].style.height = (3 + 97 * U.sat(v * 1.3)).toFixed(1) + '%';
      }
      void t; void dt;
    }
  }

  Ed.add('np', NowPlaying, { inter: true });
  Ed.add('glance', Glance, { inter: true, vars: 2 });
  Ed.add('spectrum', Spectrum, { inter: true });
})();
