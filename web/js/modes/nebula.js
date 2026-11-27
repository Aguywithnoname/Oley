/* Nebula: big rounded words cascade across a drifting emission nebula, with dark dust lanes, real
   stars and neon comets streaking past. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('nebula', `
.m-nb { background: #06021a; }
.m-nb .nb-words { position: absolute; inset: 0; }
.m-nb .nb-blk { position: absolute; left: 0; top: 0; will-change: transform, opacity, filter; }
.m-nb .nb-w { position: absolute; left: 0; top: 0; white-space: nowrap; font-family: 'Oley Round', 'Oley Sans', sans-serif; font-weight: 700; line-height: 1;
  color: #d8c6ff; letter-spacing: -0.015em; padding: 0.06em 0.14em 0.1em; border-radius: 0.12em; will-change: transform, opacity, filter;
  text-shadow: 0 0 0.35em rgba(170,120,255,0.55); }
.m-nb .nb-w.cur { color: #fff; text-shadow: 0 0 0.45em rgba(255,255,255,0.45); }
.m-nb .nb-w.box { color: #fff; text-shadow: none; }
.m-nb .nb-vig { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 50%, rgba(2,0,10,0.75) 100%); }
`);

  // ================================================================ GPU sky: layered emission nebula, dust, stars, comets
  const SKY = `
uniform vec3 uC0, uC1, uC2, uC3, uC4;
uniform float uTime, uPulse, uSeed, uComW;
uniform vec4 uCom[4], uComC[4];
out vec4 o;
vec3 ramp(float v){
  if (v < .3) return mix(uC0, uC1, v / .3);
  if (v < .6) return mix(uC1, uC2, (v - .3) / .3);
  if (v < .85) return mix(uC2, uC3, (v - .6) / .25);
  return mix(uC3, uC4, (v - .85) / .15);
}
float neb(vec2 p, float t){
  vec2 w = vec2(fbm2(p * 1.1 + t * .02, 4), fbm2(p * 1.1 + 7.3 - t * .015, 4));
  float v = fbm2(p * 1.5 + w * 1.7, 7);
  float fil = pow(1. - abs(vnoise(p * 3.6 + w * 3.) - .5) * 2., 3.) * .1;
  return v + fil * v;
}
vec3 starL(vec2 p, float cell, float dens, float seed){
  vec2 g = floor(p / cell), f = p / cell - g;
  vec3 h = hash33(vec3(g, seed));
  if (h.x > dens) return vec3(0.);
  vec2 pos = .15 + h.yz * .7;
  vec2 dv = (f - pos) * cell;
  float d = length(dv);
  float b = pow(hash12(g + seed * 3.1), 7.) * 3. + .05;
  float rad = .5 + b * .4;
  float s = b * exp(-d * d / (rad * rad)) * (.85 + .15 * sin(uTime * (1.3 + h.y * 2.) + h.z * 30.));
  if (b > 1.3) { vec2 a = abs(dv); s += b * .22 * (exp(-a.y * 1.5) * exp(-a.x * .2) + exp(-a.x * 1.5) * exp(-a.y * .2)); }
  return mix(vec3(1., .85, .75), vec3(.75, .82, 1.), h.y) * s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime;
  vec2 p1 = uv * 1.25 + vec2(t * .006, t * .003) + uSeed;
  float a = neb(p1, t);
  vec2 p2 = rot2(uv, .4) * 2.05 - vec2(t * .01, 0.) + uSeed * 1.7;
  float b = neb(p2, t + 30.);
  float v = smoothstep(.36, 1.04, a * .78 + b * .42);
  vec3 col = ramp(v) * (.03 + .95 * pow(v, 2.3)) * (1. + uPulse * .08);
  // dark dust lanes cut through the glow
  float dust = smoothstep(.46, .76, fbm2(uv * 2.3 + vec2(-t * .008, t * .004) + 9. + uSeed, 6));
  col *= 1. - .78 * dust * (1. - v * .45);
  // bright knots where the gas is densest
  col += ramp(1.) * pow(sat((v - .8) * 5.), 3.) * .35;
  float px = uRes.y / 900.;
  vec2 sp = gl_FragCoord.xy;
  vec3 st = starL(sp, 4.5 * px, .16, 1.) * .35 + starL(sp, 11. * px, .22, 2.) * .7 + starL(sp, 33. * px, .32, 3.) * 1.4;
  col += st * (1. - .6 * dust) * (1. - .5 * v);
  // comets: hot head, long glowing tail
  for (int i = 0; i < 4; i++) {
    vec4 c = uCom[i];
    if (uComC[i].a <= 0.) continue;
    vec2 D = vec2(cos(c.z), sin(c.z));
    vec2 q = sp - c.xy;
    float s = -dot(q, D);
    float d = abs(q.x * D.y - q.y * D.x);
    float along = sat(s / c.w);
    float w = uComW * (1. - along * .75);
    float tail = (s > -w * 2. ? 1. : 0.) * pow(1. - along, 1.6) * step(s, c.w);
    float g = exp(-d * d / (w * w)) * tail + exp(-d * d / (w * w * 36.)) * tail * .18;
    float head = exp(-length(q) / (uComW * 1.6));
    col += (uComC[i].rgb * (g * 2.2 + head * 3.) + vec3(head * head) * 2.) * uComC[i].a;
  }
  o = vec4(col, 1.);
}`;

  class Nebula {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-nb');
      this.glOk = O.glSupported();
      if (this.glOk) {
        const G = (this.G = new O.GL(R, { onRestored: () => ctx.stage.restartMode() }));
        this.glOk = G.ok;
        if (G.ok) { this.post = new O.Post(G); this.pSky = G.program(SKY); this.rt = G.target(4, 4); }
      }
      this.film = new O.Film(R, { grain: 0.07, vignette: 0.3 });
      U.el('div', 'nb-vig', R);
      this.wordsEl = U.el('div', 'nb-words', R);
      this.blocks = [];
      this.li = -99;
      this.time = 0;
      this.flying = [];
      this.nextComet = 1.2;
      this.n1 = U.noise1(12);
    }
    onResize() { this.clearBlocks(); }
    onTrack() { this.clearBlocks(); }
    onArt() {}
    onLyrics(tl) {
      // long lines become short phrases, a cascade each
      this.chunks = [];
      tl.lines.forEach((L, li) => {
        const ws = L.words, n = ws.length;
        if (n <= 6) { this.chunks.push({ L, li, ws, t: ws[0].t, end: L.end }); return; }
        const parts = Math.ceil(n / 5), size = Math.ceil(n / parts);
        let i = 0;
        while (i < n) {
          let j = Math.min(n, i + size);
          for (let k = Math.max(i + 2, j - 2); k <= Math.min(n - 1, j + 1); k++) if (/[,;:]$/.test(ws[k - 1].raw)) { j = k; break; }
          if (n - j === 1) j = n;
          const part = ws.slice(i, j);
          this.chunks.push({ L, li, ws: part, t: part[0].t, end: j < n ? ws[j].t : L.end });
          i = j;
        }
      });
      this.clearBlocks();
    }
    chunkAt(t) {
      const c = this.chunks || [];
      let lo = 0, hi = c.length - 1, ans = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (c[m].t - 0.05 <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
      return ans;
    }
    clearBlocks() {
      for (const b of this.blocks) U.remove(b.el);
      this.blocks = [];
      this.li = -99;
    }

    makeBlock(ci) {
      const C = this.chunks[ci];
      if (!C) return null;
      const L = C.L, li = ci;
      const W = this.ctx.W, H = this.ctx.H, u = this.ctx.u;
      const r = this.ctx.rng('nb' + li);
      const el = U.el('div', 'nb-blk', this.wordsEl);
      const items = [];
      let x = 0, y = 0, colX = 0;
      const ang = r.range(-10, -4);
      const many = C.ws.length > 4;
      const hasKey = C.ws.some((w) => w.key);
      let star = -1, best = -1;
      if (!hasKey) C.ws.forEach((w, i) => { const sc = O.STOP.has(w.w) ? 0 : w.w.length; if (sc > best) { best = sc; star = i; } });
      C.ws.forEach((w, i) => {
        const small = O.STOP.has(w.w) && w.w.length <= 4;
        const big = w.key || i === star;
        const size = u * (big ? (many ? 8.2 : 9.6) : small ? (many ? 3.6 : 4.2) : many ? 5.6 : 6.6);
        const txt = w.bare || w.raw;
        const tw = U.textWidth(txt, `700 ${size}px 'Oley Round'`) + size * 0.28;
        if (i > 0) {
          const prev = items[i - 1];
          x += prev.tw * r.range(0.45, 0.72);
          y += Math.max(prev.size * 0.86, size * 0.62) * r.range(0.9, 1.04);
          if (x + tw > W * 0.66) { colX += W * 0.06; x = colX + r.range(-0.03, 0.03) * W; y += size * 0.15; }
        }
        const s = U.el('div', 'nb-w', el, txt);
        s.style.fontSize = size.toFixed(1) + 'px';
        s.style.opacity = '0';
        items.push({ el: s, w, x, y, size, tw, rot: r.range(-4, 4), box: w.key && L.words.length > 2 && L.mood !== 'sad' });
      });
      // centre the cascade
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const it of items) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x + it.tw); y0 = Math.min(y0, it.y); y1 = Math.max(y1, it.y + it.size); }
      const bw = x1 - x0, bh = y1 - y0;
      const scale = Math.min(1, (W * 0.8) / bw, (H * 0.72) / bh);
      const ox = W * 0.5 - (bw * scale) / 2 - x0 * scale + r.range(-0.04, 0.04) * W;
      const oy = H * 0.5 - (bh * scale) / 2 - y0 * scale + r.range(-0.03, 0.03) * H;
      const blk = { li, L, C, el, items, ox, oy, scale, ang: ang * 0.25, out: false, outT: 0, dir: r.sign() };
      for (const it of items) it.el.style.transform = `translate(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px) rotate(${it.rot.toFixed(1)}deg)`;
      this.blocks.push(blk);
      return blk;
    }

    spawnComets(strong) {
      const W = this.ctx.W, H = this.ctx.H, r = Math.random;
      const ang = (28 + (r() - 0.5) * 14) * (Math.PI / 180);
      const sx = -W * 0.15 + r() * W * 0.5, sy = -H * 0.2 + r() * H * 0.35;
      const p = this.ctx.palette;
      const cols = [U.mix(U.vivid(p.vivid, 0.8, 1), [255, 80, 216], 0.5), U.mix(U.vivid(p.second, 0.8, 1), [182, 255, 59], 0.6)];
      const off = H * (0.035 + r() * 0.03);
      for (let k = 0; k < 2; k++) {
        this.flying.push({ x: sx + Math.sin(ang) * off * k, y: sy - Math.cos(ang) * off * k - k * H * 0.02, ang, speed: W * (0.85 + r() * 0.35) * (strong ? 1.25 : 1),
          len: W * (0.35 + r() * 0.15), col: cols[k], age: -k * 0.08, life: 2.4 });
      }
    }
    updateComets(dt, A) {
      if (this.ctx.opts.comets === false) { this.flying = []; return; }
      this.nextComet -= dt;
      if (this.nextComet <= 0 || (A.pulse > 0.9 && this.nextComet < 2)) { this.spawnComets(A.pulse > 0.9); this.nextComet = 3.2 + Math.random() * 2.6; }
      for (let i = this.flying.length - 1; i >= 0; i--) {
        const c = this.flying[i];
        c.age += dt;
        const hx = c.x + Math.cos(c.ang) * c.speed * Math.max(0, c.age);
        if (c.age > c.life || hx - c.len > this.ctx.W * 1.2) this.flying.splice(i, 1);
      }
    }
    drawSky(t, A) {
      const G = this.G, ctx = this.ctx, W = ctx.W, H = ctx.H, s = O.glScale(ctx, false) * 0.8;
      if (G.size(W * s, H * s)) G.resizeTarget(this.rt, G.w, G.h);
      const p = ctx.palette;
      const deep = [5, 2, 16], low = U.mix(U.vivid(p.second, 0.7, 0.3), [6, 2, 20], 0.35), mid = U.vivid(p.second, 0.65, 0.55);
      const hot = U.vivid(U.mix(p.vivid, p.second, 0.4), 0.62, 0.85), lite = U.mix(hot, [235, 220, 255], 0.5);
      const com = new Float32Array(16), cc = new Float32Array(16);
      this.flying.slice(0, 4).forEach((c, i) => {
        if (c.age < 0) return;
        const hx = c.x + Math.cos(c.ang) * c.speed * c.age, hy = c.y + Math.sin(c.ang) * c.speed * c.age;
        // shader space: device pixels, y up
        com.set([hx * s, (H - hy) * s, -c.ang, c.len * s], i * 4);
        const fade = 1 - U.prog(c.life * 0.7, c.life, c.age);
        const lc = O.lin(c.col);
        cc.set([lc[0], lc[1], lc[2], fade], i * 4);
      });
      G.draw(this.pSky, {
        uC0: O.lin(deep), uC1: O.lin(low), uC2: O.lin(mid), uC3: O.lin(hot), uC4: O.lin(lite),
        uTime: t, uPulse: A.pulse, uSeed: (ctx.tl.seed % 101) * 0.13, uComW: 2.6 * s * (H / 900), uCom: com, uComC: cc,
      }, this.rt);
      this.post.run(this.rt, { time: t, bloom: 0.06, glow: 0.16, vig: 0.34, grain: 0.03, halation: 0.03, sat: 1.08, contrast: 1.06 });
    }

    frame(t, dt, A, jumped) {
      const ctx = this.ctx, tl = ctx.tl, W = ctx.W, H = ctx.H;
      this.time += dt;
      this.updateComets(dt, A);
      if (this.glOk && !this.G.lost) this.drawSky(t, A);
      this.film.frame();

      const li = this.chunkAt(t);
      if (li !== this.li || jumped) {
        if (jumped) this.clearBlocks();
        for (const b of this.blocks) if (!b.out) { b.out = true; b.outT = 0; }
        if (li >= 0) this.makeBlock(li);
        this.li = li;
      }
      const vivid = ctx.palette.vivid;
      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const b = this.blocks[i];
        const drift = (t - b.L.t) * 4;
        if (b.out) {
          b.outT += dt;
          const k = U.e('inCubic', b.outT / 0.6);
          b.el.style.opacity = (1 - k).toFixed(3);
          b.el.style.filter = `blur(${(k * 8).toFixed(1)}px)`;
          b.el.style.transform = `translate(${(b.ox - k * W * 0.08 * b.dir).toFixed(1)}px,${(b.oy - k * H * 0.1 - drift).toFixed(1)}px) scale(${(b.scale * (1 + k * 0.15)).toFixed(4)}) rotate(${b.ang.toFixed(2)}deg)`;
          if (b.outT > 0.62) { U.remove(b.el); this.blocks.splice(i, 1); }
          continue;
        }
        const lastChunk = b.C.ws[b.C.ws.length - 1] === b.L.words[b.L.words.length - 1];
        const rest = lastChunk && b.L.gapAfter > 4 ? U.prog(b.L.singEnd + 1.5, b.L.singEnd + 3.5, t) : 0;
        b.el.style.opacity = (1 - rest * 0.6).toFixed(3);
        b.el.style.filter = 'none';
        b.el.style.transform = `translate(${b.ox.toFixed(1)}px,${(b.oy - drift).toFixed(1)}px) scale(${(b.scale * (1 + A.pulse * 0.012)).toFixed(4)}) rotate(${b.ang.toFixed(2)}deg)`;
        const cw0 = O.wordAt(b.L, t);
        const cw = cw0 - b.L.words.indexOf(b.C.ws[0]);
        b.items.forEach((it, k) => {
          const p = U.prog(it.w.t - 0.05, it.w.t + 0.28, t);
          const e = U.e('outBack', p);
          const st = it.el.style;
          st.opacity = U.sat(p * 2).toFixed(3);
          st.transform = `translate(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px) rotate(${it.rot.toFixed(1)}deg) scale(${(0.55 + 0.45 * e).toFixed(4)})`;
          const bl = (1 - p) * 8;
          st.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
          const cur = k === cw;
          if (it.cur !== cur) { it.cur = cur; it.el.classList.toggle('cur', cur); }
          const boxed = it.box && p >= 1 && k >= cw - 1 && t < b.L.singEnd + 0.8;
          if (it.boxed !== boxed) {
            it.boxed = boxed;
            it.el.classList.toggle('box', boxed);
            st.background = boxed ? U.rgba(U.mix(vivid, [120, 60, 255], 0.35), 0.88) : 'transparent';
          }
        });
      }
    }
    destroy() { if (this.G) this.G.destroy(); }
  }
  O.registerMode('nebula', Nebula, { label: 'Nebula', glow: false });
})();
