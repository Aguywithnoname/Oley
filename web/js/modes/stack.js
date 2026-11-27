/* Stack: one big word at a time on a living gradient. The word before sits small above it,
   the next ones wait below, and the column rolls up like a picker wheel. Key words get a box. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('stack', `
.m-st { background: #12081f; }
.m-st .st-shade { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,0.12), rgba(0,0,0,0) 70%); }
.m-st .st-col { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.m-st .st-w { position: absolute; left: 0; top: 0; white-space: nowrap; font: 700 var(--sf) 'Oley Round', 'Oley Sans', sans-serif; line-height: 1.12; color: #fff;
  letter-spacing: -0.02em; padding: 0 0.16em; border-radius: 0.14em; will-change: transform, opacity; text-shadow: 0 0.04em 0.4em rgba(40,0,60,0.18); }
.m-st .st-w .bx { position: absolute; inset: 0.06em 0 0.02em; border-radius: 0.12em; background: #fff; transform-origin: 0 50%; z-index: 0; }
.m-st .st-w .ink { position: absolute; left: 0; top: 0; padding: 0 0.16em; z-index: 1; color: var(--ink, #2a0e40); text-shadow: none; clip-path: inset(0 100% 0 0); pointer-events: none; }
.m-st .st-w.on { text-shadow: none; }
.m-st .st-title { position: absolute; left: 0; right: 0; top: 50%; text-align: center; color: #fff; font-family: 'Oley Round', sans-serif; will-change: opacity, transform; }
.m-st .st-title b { display: block; font-weight: 700; font-size: var(--sf); line-height: 1.05; letter-spacing: -0.02em; }
.m-st .st-title span { display: block; font-weight: 500; font-size: calc(var(--sf) * 0.32); opacity: 0.8; margin-bottom: 0.4em; }
.m-st .st-clock { top: 6vh; }
`);


  const MESH = `
uniform vec3 uC0, uC1, uC2, uC3, uC4, uBase;
uniform float uTime, uPulse;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.);
  float t = uTime * .045;
  vec2 w = vec2(fbm2(p * .8 + t, 4), fbm2(p * .8 + 3.7 - t * .8, 4)) - .5;
  vec2 q = p + w * .85;
  vec3 acc = uBase * .6; float ws = .6;
  vec2 c0 = vec2(-.75 + .25 * sin(t * 1.3), .35 + .2 * cos(t * .9));
  vec2 c1 = vec2(-.1 + .3 * cos(t * 1.1), -.3 + .2 * sin(t * 1.4));
  vec2 c2 = vec2(.55 + .2 * sin(t * .8 + 2.), .25 + .25 * cos(t * 1.2));
  vec2 c3 = vec2(.85 + .2 * cos(t * 1.5), -.35 + .2 * sin(t));
  vec2 c4 = vec2(.1 + .4 * sin(t * .6 + 4.), .5 + .15 * cos(t * 1.7));
  float f0 = exp(-dot(q - c0, q - c0) * 2.2), f1 = exp(-dot(q - c1, q - c1) * 2.4), f2 = exp(-dot(q - c2, q - c2) * 2.2);
  float f3 = exp(-dot(q - c3, q - c3) * 2.6), f4 = exp(-dot(q - c4, q - c4) * 3.);
  acc += uC0 * f0 + uC1 * f1 + uC2 * f2 + uC3 * f3 + uC4 * f4; ws += f0 + f1 + f2 + f3 + f4;
  vec3 c = acc / ws;
  // soft light falling across the silk
  float sheen = smoothstep(-.7, .7, q.y * .8 + q.x * .3 + .25 * sin(q.x * 2.2 + t * 3.));
  c *= .78 + .38 * sheen;
  c *= 1. + .12 * smoothstep(.62, .95, fbm2(q * 3. + t, 4));
  o = vec4(c * (1. + uPulse * .05), 1.);
}`;

  class Stack {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-st');
      this.bd = new O.Backdrop(ctx, MESH, { scale: 0.5 });
      U.el('div', 'st-shade', R);
      this.film = new O.Film(R, { grain: 0.06, vignette: 0.12 });
      this.col = U.el('div', 'st-col', R);
      this.title = U.el('div', 'st-title', R);
      this.items = new Map();
      this.flat = [];
      this.time = 0;
      this.n = [U.noise1(1), U.noise1(2), U.noise1(3), U.noise1(4), U.noise1(5), U.noise1(6)];
      this.cols = null;
      this.resize();
    }
    resize() {
      const u = this.ctx.u;
      this.base = Math.max(40, u * 8.4);
      this.root.style.setProperty('--sf', this.base.toFixed(1) + 'px');
    }
    onResize() { this.resize(); this.clear(); }
    onTrack(tr) {
      this.title.innerHTML = '';
      if (tr) { U.el('span', '', this.title, U.mainArtist(tr.artist)); U.el('b', '', this.title, tr.title || ''); }
      this.clear();
    }
    onArt(url, img, p) {
      // a lush gradient from the cover (orange → pink → violet → blue feel)
      const a = p.vivid, b = p.second;
      this.cols = [
        U.vivid(U.shiftHue(a, -48, 1, 1), 0.75, 1),
        U.vivid(a, 0.65, 0.95),
        U.vivid(U.shiftHue(a, 38, 1, 1), 0.6, 0.85),
        U.vivid(U.shiftHue(b, 18, 1, 1), 0.62, 0.78),
        U.vivid(U.shiftHue(b, 70, 1, 0.8), 0.75, 0.6),
      ];
      this.baseCol = U.mix(U.vivid(b, 0.6, 0.35), [10, 6, 30], 0.5);
      this.inkCol = U.hex(U.mix(U.vivid(b, 0.7, 0.45), [20, 0, 40], 0.45));
    }
    onLyrics(tl) {
      this.flat = [];
      tl.lines.forEach((L, li) => L.words.forEach((w, wi) => this.flat.push({ L, w, li, wi })));
      this.clear();
    }
    clear() {
      for (const [, it] of this.items) U.remove(it.el);
      this.items.clear();
    }
    indexAt(t) {
      const f = this.flat;
      let lo = 0, hi = f.length - 1, ans = -1;
      while (lo <= hi) {
        const m = (lo + hi) >> 1;
        if (f[m].w.t <= t) { ans = m; lo = m + 1; } else hi = m - 1;
      }
      return ans;
    }
    makeItem(g) {
      const F = this.flat[g];
      const el = U.el('div', 'st-w', this.col);
      const r = this.ctx.rng('st' + g);
      const txt = (F.w.bare || F.w.raw);
      el.appendChild(document.createTextNode(txt));
      const bx = U.el('span', 'bx', el);
      bx.style.transform = 'scaleX(0)';
      // the dark copy of the word, cut to exactly the part the box has wiped over, so the wipe never whites a letter out
      const ink = U.el('span', 'ink', el);
      ink.textContent = txt;
      const w = U.textWidth(txt, `700 ${this.base}px 'Oley Round'`) + this.base * 0.4;
      const maxW = this.ctx.W * 0.86;
      const fit = w > maxW ? maxW / w : 1;
      const boxed = this.ctx.opts.boxes !== false && F.w.key && F.L.words.length > 2 && F.L.mood !== 'sad';
      const it = { g, F, el, bx, ink, s: 0.3, y: null, op: 0, fit, boxed, boxP: 0, dead: false, w: Math.min(w, maxW), tilt: F.L.mood === 'hype' ? r.range(-3, 3) : 0 };
      this.items.set(g, it);
      return it;
    }

    drawMesh(dt, A) {
      const cols = this.cols || [[255, 140, 60], [255, 70, 140], [180, 60, 220], [90, 70, 230], [40, 40, 160]];
      const base = this.baseCol || [30, 14, 70];
      this.bd.frame({ uC0: O.lin(cols[0]), uC1: O.lin(cols[1]), uC2: O.lin(cols[2]), uC3: O.lin(cols[3]), uC4: O.lin(cols[4]), uBase: O.lin(base),
        uTime: this.time * (1 + 0.6 * A.energy), uPulse: A.pulse }, { time: this.time, bloom: 0.03, glow: 0, vig: 0.12, grain: 0.03, clip: 0.9 });
      this.film.frame();
    }

    frame(t, dt, A, jumped) {
      const ctx = this.ctx, H = ctx.H;
      this.time += dt;
      this.drawMesh(dt, A);
      const c = this.indexAt(t);
      if (jumped) this.clear();
      // title before the first word
      // (it is gone before the first word lands in the same spot, so the two never sit on top of each other)
      const first = this.flat.length ? this.flat[0].w.t : 1e9;
      const showTitle = c < 0 && ctx.track && first - t > 0.9;
      this.tOp = U.damp(this.tOp || 0, showTitle ? 1 : 0, showTitle ? 4 : 9, dt);
      this.title.style.opacity = this.tOp.toFixed(3);
      this.title.style.transform = `translateY(-50%) scale(${(0.96 + 0.04 * this.tOp).toFixed(3)})`;
      // which words are in the column
      const want = new Set();
      if (c >= 0) {
        const curLine = this.flat[c].li;
        for (let g = c - 3; g <= c + 4; g++) {
          const F = this.flat[g];
          if (!F) continue;
          if (g > c && F.li > curLine + 1) continue;
          if (g > c && F.li > curLine && F.L.t - t > 1.6) continue;
          if (g < c && F.li < curLine - 1) continue;
          want.add(g);
        }
      }
      for (const g of want) if (!this.items.has(g)) this.makeItem(g);
      // targets
      const targets = [];
      for (const [g, it] of this.items) {
        if (!want.has(g)) it.dead = true;
        const d = g - c;
        const ad = Math.abs(d);
        it.ts = (ad === 0 ? 1 : ad === 1 ? 0.36 : ad === 2 ? 0.28 : 0.23) * it.fit;
        it.top = it.dead ? 0 : d === 0 ? 1 : d === -1 ? 0.85 : d === 1 ? 0.62 : ad === 2 ? 0.42 : 0.18;
        targets.push(it);
      }
      targets.sort((a, b) => a.g - b.g);
      // stack vertically around the current word
      const lh = this.base * 1.12;
      const curIdx = targets.findIndex((it) => it.g === c);
      const ys = new Array(targets.length);
      if (curIdx >= 0) {
        ys[curIdx] = 0;
        for (let i = curIdx - 1; i >= 0; i--) {
          const a = targets[i], b = targets[i + 1];
          const gap = (a.F.li !== b.F.li ? lh * 0.22 : lh * 0.05);
          ys[i] = ys[i + 1] - (lh * b.ts) / 2 - (lh * a.ts) / 2 - gap;
        }
        for (let i = curIdx + 1; i < targets.length; i++) {
          const a = targets[i - 1], b = targets[i];
          const gap = (a.F.li !== b.F.li ? lh * 0.22 : lh * 0.05);
          ys[i] = ys[i - 1] + (lh * a.ts) / 2 + (lh * b.ts) / 2 + gap;
        }
      } else targets.forEach((it, i) => { ys[i] = (i - targets.length / 2) * lh * 0.4; });
      const bgInk = this.inkCol || '#3b1366';
      targets.forEach((it, i) => {
        const ty = ys[i];
        if (it.y == null) { it.y = ty + lh * 0.5; it.s = it.ts * 0.8; }
        it.y = U.damp(it.y, ty, 11, dt);
        it.s = U.damp(it.s, it.ts, 12, dt);
        it.op = U.damp(it.op, it.top, it.dead ? 14 : 9, dt);
        const cur = it.g === c;
        const pulse = cur ? 1 + A.pulse * 0.03 : 1;
        const sc = it.s * pulse;
        const st = it.el.style;
        st.transform = `translate(-50%,${(it.y - lh / 2).toFixed(1)}px) scale(${sc.toFixed(4)}) rotate(${it.tilt.toFixed(2)}deg)`;
        st.opacity = it.op.toFixed(3);
        // box wipe on key words
        const boxOn = it.boxed && cur;
        it.boxP = U.damp(it.boxP, boxOn ? 1 : 0, boxOn ? 16 : 10, dt);
        if (it.boxed) {
          it.bx.style.transform = `scaleX(${it.boxP.toFixed(3)})`;
          it.ink.style.clipPath = `inset(-0.2em ${((1 - it.boxP) * 100).toFixed(2)}% -0.2em 0)`;
          if (it.inkCol !== bgInk) { it.inkCol = bgInk; it.ink.style.color = bgInk; }
          const on = it.boxP > 0.5;
          if (on !== it.on) { it.on = on; it.el.classList.toggle('on', on); }
        }
        if (it.dead && it.op < 0.02) { U.remove(it.el); this.items.delete(it.g); }
      });
      void H;
    }
    destroy() { this.bd.destroy(); }
  }
  O.registerMode('stack', Stack, { label: 'Stack', glow: false });
})();
