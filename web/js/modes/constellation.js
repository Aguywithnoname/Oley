/* Constellation: each sung word becomes a star; the line is drawn as a star map over the
   blurred cover, a crosshair follows the voice and the line's key word blooms large. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.grainURL = function () {
    if (O._grain) return O._grain;
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const x = c.getContext('2d');
    const d = x.createImageData(160, 160);
    const r = U.rng(99);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.floor(r() * 255);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    O._grain = c.toDataURL('image/png');
    return O._grain;
  };


  const SMOKE = `
uniform sampler2D uCover;
uniform float uTime, uPulse, uHas;
uniform vec3 uTint, uTint2;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.);
  float t = uTime * .028;
  vec2 q = p * 1.15;
  vec2 w1 = vec2(fbm2(q * 1.3 + t, 5), fbm2(q * 1.3 + 5.2 - t, 5));
  vec2 w2 = vec2(fbm2(q * 2.1 + w1 * 2.2 + 1.7 + t * 1.3, 5), fbm2(q * 2.1 + w1 * 2.2 + 9.2 - t, 5));
  vec2 cu = .5 + rot2(p, sin(t * .7) * .25) * .42 + (w2 - .5) * .6;
  vec3 c = uHas > .5 ? textureLod(uCover, vec2(cu.x, 1. - cu.y), 3.2).rgb : mix(uTint2, uTint, w2.x);
  // where the smoke is thick the light lives
  float smoke = fbm2(q * 2.6 + w2 * 3.2 + t * 2., 7);
  float wisp = smoothstep(.42, .82, smoke);
  float fine = smoothstep(.55, .9, fbm2(q * 7. + w2 * 4. - t * 3., 5));
  c *= .16 + 1.9 * wisp + .5 * fine * wisp;
  c = mix(vec3(luma(c)), c, 1.3);
  c *= 1. - smoothstep(.3, 1.05, length(p * vec2(.78, 1.))) * .9;
  o = vec4(max(c, 0.) * (1. + uPulse * .07), 1.);
}`;

  O.css('constellation', `
.m-cs { background: #07050a; }
.m-cs .cs-shade { position: absolute; inset: 0; background: radial-gradient(ellipse 72% 66% at 50% 58%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.88) 100%); }
.m-cs svg.cs-map { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.m-cs .cs-edge { stroke: rgba(255,255,255,0.7); stroke-width: 1.2; fill: none; stroke-linecap: round; }
.m-cs .cs-edge.x { stroke: rgba(255,255,255,0.38); stroke-width: 0.9; }
.m-cs .cs-grp { position: absolute; inset: 0; will-change: opacity, transform; }
.m-cs .cs-node { position: absolute; left: 0; top: 0; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: #fff;
  box-shadow: 0 0 6px 1px rgba(255,255,255,0.85); will-change: transform, opacity; }
.m-cs .cs-label { position: absolute; left: 0; top: 0; font: 500 var(--fs) 'Oley Sans', sans-serif; color: rgba(255,255,255,0.92);
  white-space: nowrap; text-shadow: 0 1px 10px rgba(0,0,0,0.55); will-change: transform, opacity; }
.m-cs .cs-big { position: absolute; left: 0; top: 0; font: 700 var(--fb) 'Oley Round', 'Oley Sans', sans-serif; color: #fff8ea;
  white-space: nowrap; letter-spacing: -0.015em; will-change: transform, opacity, filter; }
.m-cs .cs-ring { position: absolute; left: 0; top: 0; width: var(--rs); height: var(--rs); margin: calc(var(--rs) / -2) 0 0 calc(var(--rs) / -2);
  border: 1.6px solid rgba(255,255,255,0.95); border-radius: 50%; box-shadow: 0 0 12px rgba(255,255,255,0.35); box-sizing: border-box; will-change: transform, opacity; }
.m-cs .cs-ring::before, .m-cs .cs-ring::after { content: ''; position: absolute; left: 50%; top: 50%; background: #fff; border-radius: 1px; }
.m-cs .cs-ring::before { width: 52%; height: 1.6px; transform: translate(-50%, -50%); }
.m-cs .cs-ring::after { width: 1.6px; height: 52%; transform: translate(-50%, -50%); }
.m-cs .cs-title { position: absolute; left: 0; top: 0; text-align: center; color: rgba(255,255,255,0.86); white-space: nowrap;
  font: 500 var(--ft) 'Oley Sans', sans-serif; letter-spacing: 0.46em; text-transform: uppercase; will-change: opacity, transform; }
.m-cs .cs-title small { display: block; margin-top: 0.7em; font-size: 0.58em; letter-spacing: 0.55em; opacity: 0.72; }
.m-cs .cs-clock { z-index: 1; }
`);

  class Constellation {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-cs');
      this.bd = new O.Backdrop(ctx, SMOKE, { scale: 0.55 });
      this.cover = this.bd.texture('cover', null, { srgb: true });
      U.el('div', 'cs-shade', R);
      this.film = new O.Film(R, { grain: 0.08, vignette: 0.2 });
      this.clock = new O.LockClock(R, 'cs-clock');
      this.svg = U.svg('svg', { class: 'cs-map' }, R);
      this.layer = U.el('div', 'cs-layer', R);
      this.title = U.el('div', 'cs-title', R);
      this.ring = U.el('div', 'cs-ring', R);
      this.groups = [];
      this.li = -99;
      this.ringX = null;
      this.ringY = 0;
      this.time = 0;
      this.titleOp = 0;
      this.n1 = U.noise1(31);
      this.n2 = U.noise1(57);
      this.resize();
    }
    resize() {
      const W = this.ctx.W, H = this.ctx.H, u = this.ctx.u;
      const q = this.ctx.quality;
      this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const s = this.root.style;
      s.setProperty('--fs', Math.max(11, u * 0.92).toFixed(1) + 'px');
      s.setProperty('--fb', Math.max(28, u * 3.3).toFixed(1) + 'px');
      s.setProperty('--rs', Math.max(18, u * 1.55).toFixed(1) + 'px');
      s.setProperty('--ft', Math.max(12, u * 1.15).toFixed(1) + 'px');
    }
    onResize() {
      this.resize();
      this.clearGroups();
      this.li = -99;
    }
    onTrack(tr) {
      this.clearGroups();
      this.li = -99;
      this.title.innerHTML = '';
      if (tr) {
        U.el('span', '', this.title, U.mainArtist(tr.artist) || '');
        U.el('small', '', this.title, tr.title || '');
      }
    }
    onArt(url, img) {
      this.hasArt = !!(img && this.bd.texture('cover', img, { srgb: true }));
    }
    onLyrics() {
      this.clearGroups();
      this.li = -99;
    }
    clearGroups() {
      for (const g of this.groups) { U.remove(g.div); U.remove(g.g); }
      this.groups = [];
    }

    // ------------------------------------------------------------ layout
    layout(words, seed, band) {
      const W = this.ctx.W, H = this.ctx.H, u = this.ctx.u;
      const r = this.ctx.rng(seed);
      const n = words.length;
      const clock = this.ctx.settings.clock !== false;
      const cy = H * (band != null ? band : clock ? 0.6 : 0.54);
      const span = Math.min(W * 0.68, W * (0.14 + n * 0.064));
      const x0 = W * 0.5 - span / 2;
      const dy = H * 0.15;
      const slope = r.range(-0.9, 0.9) * dy;
      let y = cy - slope / 2 + r.range(-0.3, 0.3) * dy;
      const rev = false;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const f = n === 1 ? 0.5 : i / (n - 1);
        const ff = rev ? 1 - f : f;
        const jitter = n > 1 ? r.range(-0.32, 0.32) * (span / (n - 1)) : 0;
        y += r.range(-1, 1) * dy * 0.85 + slope / Math.max(1, n - 1);
        y = U.clamp(y, cy - dy, cy + dy);
        pts.push({ x: x0 + ff * span + jitter, y });
      }
      // keep stars apart so labels stay readable
      const min = u * 4.6;
      for (let it = 0; it < 8; it++) {
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = pts[i], b = pts[j];
          const dx = b.x - a.x, dyy = b.y - a.y, d = Math.hypot(dx, dyy) || 0.01;
          if (d < min) {
            const p = (min - d) / 2;
            a.x -= (dx / d) * p; a.y -= (dyy / d) * p; b.x += (dx / d) * p; b.y += (dyy / d) * p;
          }
        }
      }
      for (const p of pts) { p.x = U.clamp(p.x, W * 0.08, W * 0.92); p.y = U.clamp(p.y, H * 0.3, H * 0.9); }
      const edges = [];
      for (let i = 1; i < n; i++) edges.push({ a: i - 1, b: i, x: false });
      for (let i = 2; i < n; i++) {
        if (r.chance(0.38)) edges.push({ a: i - 2, b: i, x: true });
        if (i > 3 && r.chance(0.2)) edges.push({ a: r.int(0, i - 3), b: i, x: true });
      }
      return { pts, edges, r };
    }

    makeGroup(li) {
      const L = this.ctx.tl.lines[li];
      if (!L) return null;
      const u = this.ctx.u, H = this.ctx.H, W = this.ctx.W;
      const { pts, edges } = this.layout(L.words, 'line' + li);
      const div = U.el('div', 'cs-grp', this.layer);
      const g = U.svg('g', {}, this.svg);
      const grp = { li, L, pts, div, g, nodes: [], labels: [], edges: [], big: null, old: false, op: 1, oldT: 0 };
      L.words.forEach((w, i) => {
        const p = pts[i];
        const nd = U.el('div', 'cs-node', div);
        nd.style.transform = `translate(${p.x}px,${p.y}px) scale(0)`;
        const lb = U.el('div', 'cs-label', div, w.bare || w.raw);
        const right = p.x < W * 0.86;
        lb.style.transform = `translate(${p.x + (right ? u * 0.55 : -u * 0.55)}px,${p.y + u * 0.45}px)` + (right ? '' : ' translateX(-100%)');
        lb.style.opacity = '0';
        grp.nodes.push(nd);
        grp.labels.push(lb);
      });
      for (const e of edges) {
        const a = pts[e.a], b = pts[e.b];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const el = U.svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'cs-edge' + (e.x ? ' x' : '') }, g);
        el.style.strokeDasharray = len + ' ' + len;
        el.style.strokeDashoffset = String(len);
        grp.edges.push({ el, a: e.a, b: e.b, len });
      }
      // the key word blooms large under its star
      const kw = L.words[L.key];
      if (kw && L.words.length > 1) {
        const big = U.el('div', 'cs-big', div, kw.bare || kw.raw);
        const p = pts[L.key];
        const bw = U.textWidth(kw.bare || kw.raw, `700 ${Math.max(28, u * 3.3)}px 'Oley Round'`);
        const bx = U.clamp(p.x - bw / 2, W * 0.04, W * 0.96 - bw);
        const by = U.clamp(p.y + u * 1.5, H * 0.1, H * 0.92);
        big.style.transform = `translate(${bx}px,${by}px)`;
        big.style.opacity = '0';
        big._x = bx; big._y = by;
        const c = this.ctx.palette.vivid;
        big.style.textShadow = `0 0 ${u * 1.4}px ${U.rgba(U.mix(c, [255, 255, 255], 0.35), 0.75)}, 0 0 ${u * 0.3}px rgba(255,255,255,0.6)`;
        grp.big = big;
      }
      this.groups.push(grp);
      return grp;
    }

    retire(grp) {
      if (grp.old) return;
      grp.old = true;
      grp.oldT = 0;
    }

    // ------------------------------------------------------------ frame
    frame(t, dt, A, jumped) {
      const ctx = this.ctx, tl = ctx.tl, u = ctx.u, W = ctx.W, H = ctx.H;
      this.time += dt;
      if (ctx.settings.clock !== false) { this.clock.el.style.display = ''; this.clock.update(); } else this.clock.el.style.display = 'none';
      this.drawBackground(dt, A);

      const li = O.lineAt(tl, t);
      if (li !== this.li || jumped) {
        if (jumped || li < this.li || li > this.li + 1) this.clearGroups();
        for (const g of this.groups) this.retire(g);
        if (li >= 0) {
          const prev = this.groups.find((g) => g.li === li);
          if (!prev) this.makeGroup(li);
          else prev.old = false;
        }
        this.li = li;
      }
      // groups
      let ringTarget = null;
      for (let gi = this.groups.length - 1; gi >= 0; gi--) {
        const g = this.groups[gi];
        if (g.old) {
          g.oldT += dt;
          const k = U.e('outCubic', g.oldT / 1.1);
          g.div.style.opacity = (1 - 0.72 * k).toFixed(3);
          g.g.style.opacity = (1 - 0.66 * k).toFixed(3);
          g.div.style.transform = `translateY(${(-k * H * 0.03).toFixed(1)}px)`;
          g.g.setAttribute('transform', `translate(0 ${(-k * H * 0.03).toFixed(1)})`);
          for (const lb of g.labels) lb.style.opacity = (0.92 * (1 - k)).toFixed(3);
          if (g.big) {
            g.big.style.opacity = (1 - k).toFixed(3);
            g.big.style.transform = `translate(${g.big._x}px,${g.big._y}px) scale(${(1 - 0.35 * k).toFixed(3)})`;
          }
          const older = this.groups.filter((x) => x.old && x.oldT > 0).length;
          if (g.oldT > 6 || (older > 2 && gi === 0)) {
            U.remove(g.div); U.remove(g.g);
            this.groups.splice(gi, 1);
          }
          continue;
        }
        const L = g.L, ws = L.words;
        // fade the whole line during long instrumental breaks
        const rest = U.prog(L.singEnd + 2.5, L.singEnd + 5, t) * (L.gapAfter > 5 ? 1 : 0);
        g.div.style.opacity = (1 - rest * 0.45).toFixed(3);
        let cur = -1;
        ws.forEach((w, i) => {
          const p = U.prog(w.t - 0.06, w.t + 0.3, t);
          if (w.t - 0.06 <= t) cur = i;
          const pt = g.pts[i];
          const breathe = 1 + 0.18 * Math.sin(this.time * 2 + i) * (p >= 1 ? 1 : 0);
          const sc = U.e('outBack', p) * breathe * (i === cur ? 1 + A.pulse * 0.6 : 1);
          g.nodes[i].style.transform = `translate(${pt.x}px,${pt.y}px) scale(${sc.toFixed(3)})`;
          g.nodes[i].style.opacity = U.sat(p * 1.5).toFixed(3);
          const keyShown = g.big && i === L.key ? U.prog(w.t, w.t + 0.25, t) : 0;
          g.labels[i].style.opacity = (U.sat(p * 1.2) * 0.92 * (1 - keyShown)).toFixed(3);
        });
        for (const e of g.edges) {
          const w = ws[e.b];
          const p = U.e('outCubic', U.prog(w.t - 0.14, w.t + (e.x ? 0.45 : 0.22), t));
          e.el.style.strokeDashoffset = (e.len * (1 - p)).toFixed(1);
        }
        if (g.big) {
          const kw = ws[L.key];
          const kp = U.prog(kw.t - 0.04, kw.t + 0.42, t);
          const sc = 0.62 + 0.38 * U.e('outBack', kp) + A.pulse * 0.025;
          const fade = 1 - U.prog(L.singEnd + 1.6, L.singEnd + 3.2, t);
          g.big.style.opacity = (U.sat(kp * 1.6) * fade).toFixed(3);
          g.big.style.transform = `translate(${g.big._x}px,${g.big._y}px) scale(${sc.toFixed(3)})`;
          const bl = (1 - kp) * 10;
          g.big.style.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none';
        }
        if (cur >= 0) ringTarget = g.pts[cur];
        else if (ws.length) ringTarget = null;
      }
      // the crosshair follows the voice
      const ringSt = this.ring.style;
      if (ringTarget) {
        if (this.ringX == null) { this.ringX = ringTarget.x; this.ringY = ringTarget.y; }
        const k = 13;
        this.ringX = U.damp(this.ringX, ringTarget.x, k, dt);
        this.ringY = U.damp(this.ringY, ringTarget.y, k, dt);
        const orbit = this.groups.length && !this.groups[this.groups.length - 1].old ? 0 : 1;
        const ox = Math.cos(this.time * 1.3) * u * 0.6 * orbit, oy = Math.sin(this.time * 1.3) * u * 0.6 * orbit;
        ringSt.opacity = '1';
        ringSt.transform = `translate(${(this.ringX + ox).toFixed(1)}px,${(this.ringY + oy).toFixed(1)}px) rotate(${(this.time * 18) % 360}deg) scale(${(1 + A.pulse * 0.25).toFixed(3)})`;
      } else {
        ringSt.opacity = '0';
        this.ringX = null;
      }
      // artist & title, written into the sky at the start
      const showTitle = ctx.opts.title !== false && ctx.track && (li < 1) && tl.status !== 'none';
      const noLyrics = ctx.track && (tl.status === 'none' || tl.status === 'instrumental');
      this.titleOp = U.damp(this.titleOp, showTitle || noLyrics ? 1 : 0, 2.2, dt);
      if (this.titleOp > 0.01) {
        const tw = this.title.offsetWidth || 1;
        const ty = li < 0 || noLyrics ? H * 0.56 : H * 0.42;
        this.title.style.opacity = this.titleOp.toFixed(3);
        this.title.style.transform = `translate(${((W - tw) / 2).toFixed(1)}px,${ty.toFixed(1)}px)`;
        this.title.style.display = '';
      } else this.title.style.display = 'none';
    }

    drawBackground(dt, A) {
      const p = this.ctx.palette;
      this.bd.frame({ uCover: this.cover, uTime: this.time, uPulse: A.pulse, uHas: this.hasArt ? 1 : 0, uTint: O.lin(p.vivid), uTint2: O.lin(p.dark) },
        { time: this.time, bloom: 0.05, glow: 0.1, vig: 0.15, grain: 0.02, sat: 1.05 });
      this.film.frame();
    }
    destroy() { this.bd.destroy(); }
  }
  O.registerMode('constellation', Constellation, { label: 'Constellation', glow: true });
})();
