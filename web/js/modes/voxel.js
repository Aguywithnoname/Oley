/* Oley · Voxel: the song as a world made of cubes. Each verse is a different place built from
   blocks (a floating island at sunset, a city street at dusk, a checkerboard path through the night,
   a meadow with a hedge heart, a ringed planet, a gold vault, a neon tunnel, and the album cover
   rebuilt as a voxel statue or a pixel mural), dealt from a shuffled deck. The camera never stops
   moving: it orbits, dollies down the road, flies the path, sinks over the meadow, and rushes into a
   storm of cubes to get to the next place. The words are built from cubes too: each one flies
   together on its syllable, the key word bigger and lit, laid on the road or standing in the scene,
   and the line shatters into falling blocks when the next one comes. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const PI = Math.PI;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const outBack = (k) => { k = Math.min(1, Math.max(0, k)); const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  O.css('voxel', `
.m-vx { background: #0b0a10; }
.m-vx .vx-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #ddd; font: 500 2vmin var(--sans, sans-serif); text-align: center; padding: 4vmin; }
`);

  class Voxel {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-vx');
      this.ok = O.glSupported();
      this.secs = [];
      this.lines = [];
      if (!this.ok) { this.fallback(); return; }
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; U.remove(G.canvas); this.fallback(); return; }
      try { this.R3 = new O.Vox.Renderer(G); } catch (e) { ctx.stage.reportError(e); this.ok = false; this.fallback(); return; }
      this.post = new O.Post(G);
      this.dyn = new O.Vox.Boxes(8000);
      this.worldOf = null;
      this.texts = new Map();
    }
    fallback() { U.el('div', 'vx-msg', this.ctx.root, 'Voxel needs WebGL2 (graphics acceleration). Pick another mode, or turn hardware acceleration on.'); }

    // ---------------------------------------------------------------- the cover, for the statue and the mural
    onArt(url, img) {
      const link = this.ctx.stage.link;
      if (link && img) link.send({ type: 'want', what: 'mask' });
      this.img = img || null;
      this.makeCover();
    }
    onMask() { this.makeCover(); }
    makeCover() {
      const img = this.img;
      this.statueVox = null; this.muralVox = null;
      if (img) {
        let mask = null;
        try { const info = this.ctx.maskImg ? O.Subject.fromMask(this.ctx.maskImg, img) : O.Subject.guess(img); mask = info && info.canvas ? info.canvas : null; } catch (e) { mask = null; }
        this.statueVox = O.Vox.coverVoxels(img, mask, 46, 3);
        this.muralVox = O.Vox.coverVoxels(img, null, 60, 5);
        this.cutOk = !!mask;
      }
      this.plan();
    }
    onTrack(tr) { this.track = tr || null; this.plan(); }
    onLyrics() { this.plan(); }
    onSettings() { this.plan(); }
    onResize() { this.texts.clear(); }

    // ---------------------------------------------------------------- the song in verses, a world each
    plan() {
      if (!this.ok) return;
      const ctx = this.ctx, tl = ctx.tl;
      const R = O.asciiRng ? O.asciiRng(U.hash((this.track && (this.track.id || this.track.title)) || 'v') ^ (O.params && +O.params.get('vxseed') || 0)) : null;
      if (!R) return;
      this.R = R;
      const lines = ((tl && tl.lines) || []).filter((L) => L.words && L.words.length);
      const end = (L) => Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.4);
      const secs = [];
      let cur = null;
      lines.forEach((L, i) => {
        const pv = lines[i - 1];
        if (!cur || L.t - end(pv) > 3.2 || cur.lines.length >= 6) { cur = { t0: L.t - 0.5, lines: [] }; secs.push(cur); }
        cur.lines.push(L);
      });
      if (!secs.length) secs.push({ t0: 0, lines: [] });
      secs[0].t0 = 0;
      const dur = (tl && tl.duration) || 0;
      for (let i = 0; i < secs.length; i++) secs[i].t1 = secs[i + 1] ? secs[i + 1].t0 : Math.max(dur, (secs[i].lines.length ? end(secs[i].lines[secs[i].lines.length - 1]) : 0) + 30);
      // deal the worlds: every place before any repeats, and the cover's own worlds every few verses
      const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let deck = [], cdeck = [], last = '';
      const op = this.ctx.opts || {};
      const art = op.cover !== false && !!(this.statueVox && this.statueVox.length);
      const force = O.params && O.params.get('vxworld');
      secs.forEach((s, i) => {
        let w;
        if (art && i % 3 === 1) { if (!cdeck.length) cdeck = shuffle(this.cutOk ? ['statue', 'mural'] : ['mural', 'statue']); w = cdeck.shift(); }
        else { if (!deck.length) { deck = shuffle(O.Vox.PLACES); if (deck[0] === last) deck.push(deck.shift()); } w = deck.shift(); }
        if (force && O.Vox.WORLDS[force] && (art || O.Vox.PLACES.includes(force))) w = force;
        s.world = w; s.seed = (R() * 4294967296) >>> 0; s.built = null;
        s.keys = s.lines.flatMap((L) => L.words.filter((x) => x.key).map((x) => x.t)).filter((k) => k > s.t0 + 0.5);
        last = w;
      });
      this.secs = secs;
      // the lines, each ending when the next one starts (or holding a beat if there's a gap)
      this.lines = lines.map((L, i) => {
        const nx = lines[i + 1];
        let t1 = nx && nx.t - end(L) < 2.5 ? nx.t - 0.06 : end(L) + 1.4;
        const si = this.secAtT(L.t), sn = secs[si + 1];
        if (sn && t1 > sn.t0 - 0.2) t1 = sn.t0 - 0.2;
        return { L, i, t0: L.t - 0.25, t1, ws: L.words };
      });
      // the title, built while the intro plays
      if (lines.length && lines[0].t > 3 && this.track && this.track.title) {
        const ws = String(this.track.title).split(/\s+/).slice(0, 6).map((raw, k) => ({ raw, t: 0.6 + k * 0.25, key: k === 0 }));
        this.lines.unshift({ title: true, i: -1, t0: 0.3, t1: lines[0].t - 0.5, ws });
      }
      this.texts.clear();
      this.worldOf = null;
    }
    // the camera's clock for a verse: it surges forward on every key word
    warp(sec, t) { let w = t - sec.t0; for (const k of sec.keys || []) w += 0.75 * ss(k - 0.05, k + 0.45, t); return w; }
    secAtT(t) { const S = this.secs; let i = 0; while (i < S.length - 1 && S[i + 1].t0 <= t) i++; return i; }
    build(sec) {
      if (sec.built) return sec.built;
      const R = O.asciiRng(sec.seed);
      const W = O.Vox.WORLDS[sec.world](R, { palette: this.ctx.palette });
      // the cover's mural goes into the world itself
      if (W.mural && this.muralVox) {
        const n = 60, s = 0.45;
        for (const v of this.muralVox) for (let k = 0; k <= v.dz; k++) W.boxes.add((v.i - n / 2) * s, 1.6 + v.j * s, -2 + k * s * 0.7, s, s, s * 0.7, v.col, 0);
        W.boxes.add(0, 1.6 + (n * s) / 2 - s / 2, -2.6, n * s + 1.4, n * s + 1.4, 0.4, [40, 38, 44]);
      }
      sec.built = W;
      return W;
    }

    // ---------------------------------------------------------------- a line built from cubes
    textFor(line, W, t) {
      const key = line.i + ':' + (W.id || '');
      let T = this.texts.get(key);
      if (T) return T;
      const F = W.frame(Math.max(0, t), line.t1 - line.t0);
      const R = O.asciiRng(1009 + line.i * 7919);
      // set the words in rows that fit
      // the key word is set bigger, so it takes its bigger width in the row too (or it would run into its neighbours)
      const words = line.ws.map((w, k) => { const g = O.Vox.text(String(w.raw).replace(/^[("'“]+|[)"'”,.!?;:]+$/g, '') || '-'), kk = w.key || line.title ? 1.12 : 1; return { w, k, g, kk, ew: g.w * kk }; });
      const setRows = (maxW) => {
        const rows = [[]];
        let rw = 0;
        for (const wd of words) {
          const add = (rows[rows.length - 1].length ? 4 : 0) + wd.ew;
          if (rows[rows.length - 1].length && rw + add > maxW) { rows.push([]); rw = 0; }
          rows[rows.length - 1].push(wd); rw += rows[rows.length - 1].length > 1 ? add : wd.ew;
        }
        return rows;
      };
      const rowW = (row) => row.reduce((a, wd, j) => a + wd.ew + (j ? 4 : 0), 0);
      const flat = F.n[1] > 0.9;
      const cubes = [], tiles = [];
      const rowH = 10;
      let rows = setRows(F.maxW);
      // fit the block to the view from where the camera will be, choosing the row width that lets it be biggest
      if (!W.tiles) {
        const c = W.cam(Math.max(0, t) + Math.max(0.5, Math.min(5, line.t1 - line.t0))), d = Math.max(4, O.Vox.v3.len(O.Vox.v3.sub(F.o, c.pos)));
        const vh = 2 * d * Math.tan((c.fov || 0.9) / 2), vw = vh * (this.ctx.W / Math.max(1, this.ctx.H));
        let best = -1;
        for (const mw of [F.maxW, F.maxW * 1.3, F.maxW * 1.65, F.maxW * 2]) {
          const rs = setRows(mw), wpx = Math.max(10, ...rs.map(rowW)), hpx = rs.length * rowH - 3;
          const sc = Math.min(F.s, (0.7 * vw) / wpx, (0.56 * vh) / hpx) * (rs.length > 3 ? 0.9 : 1);
          if (sc > best * 1.04) { best = sc; rows = rs; }
        }
        F.s = Math.min(F.s, best);
      }
      // road markings read from near to far: the first words nearest
      if (W.tiles) rows.reverse();
      const Htot = rows.length * rowH - 3;
      if (F.base != null) { const lift = F.base - (F.o[1] - (Htot / 2) * F.s); F.o = [F.o[0], F.o[1] + lift, F.o[2]]; }
      const ry = Math.atan2(-F.r[2], F.r[0]);
      rows.forEach((row, ri) => {
        const ww = rowW(row);
        let x = -ww / 2;
        const y0 = Htot / 2 - (ri + 1) * rowH + 3;
        for (const wd of row) {
          const isK = !!wd.w.key || line.title;
          const kk = wd.kk;
          const col = isK ? W.key : W.ink, glow = (W.glow || 0.12) + (isK ? 0.35 : 0);
          for (const [cx, cy] of wd.g.cells) {
            const lx = x + (cx + 0.5) * kk, ly = (y0 + cy + 0.5 - (y0 + 3.5)) * kk + y0 + 3.5;
            const pos = [0, 1, 2].map((a) => F.o[a] + F.r[a] * lx * F.s + F.u[a] * ly * F.s + F.n[a] * (W.raised ? F.s : 0));
            const ang = R() * PI * 2, rad = R.r(3, 7) * F.s * 5;
            const from = [0, 1, 2].map((a) => pos[a] + F.r[a] * Math.cos(ang) * rad + F.u[a] * Math.sin(ang) * rad * 0.6 + F.n[a] * R.r(1, 3) * F.s * 5 + (a === 1 ? R.r(1, 3) : 0));
            cubes.push({ pos, from, k: wd.k, d: R() * 0.12, col, glow, s: F.s * 0.92 * kk, th: F.s * (isK ? 2 : 1) * (W.raised ? 2 : 1), rot: [R.r(-3, 3), R.r(-3, 3), R.r(-3, 3)], v: [0, 1, 2].map((a) => F.n[a] * R.r(-1, 2.5) * F.s * 6 + F.r[a] * (lx / Math.max(1, F.maxW / 2)) * R.r(2, 6) * F.s * 6 + (a === 1 ? R.r(3, 8) : 0)), spin: [R.r(-8, 8), R.r(-8, 8), R.r(-8, 8)] });
          }
          if (W.tiles) {
            const pal = [[220, 40, 44], [250, 200, 40], [30, 70, 170], [20, 20, 24], [240, 238, 230]];
            const tc = pal[(((line.i + 2) * 3 + wd.k) % pal.length + pal.length) % pal.length];
            const cx0 = x + wd.ew / 2, cy0 = y0 + 3.5;
            const pos = [0, 1, 2].map((a) => F.o[a] + F.r[a] * cx0 * F.s + F.u[a] * cy0 * F.s - F.n[a] * 0.05);
            tiles.push({ pos, w: (wd.ew + 4) * F.s, h: (7 + 4) * F.s, col: tc, k: wd.k });
            // letters that read on their tile
            const lum = (0.2126 * tc[0] + 0.7152 * tc[1] + 0.0722 * tc[2]) / 255;
            for (const c of cubes) if (c.k === wd.k && !c.tiled) { c.col = lum > 0.6 ? [20, 18, 24] : [252, 250, 245]; c.tiled = true; }
          }
          x += wd.ew + 4;
        }
      });
      T = { cubes, tiles, ry, flat, F, shade: W.shade || [18, 14, 26] };
      this.texts.set(key, T);
      return T;
    }
    drawText(line, W, t) {
      const T = this.textFor(line, W, this.warp(this.secs[this.secAtT(Math.max(0, line.t0 + 0.3))], line.t0));
      const B = this.dyn;
      const shat = t - line.t1;
      for (const tl of T.tiles) {
        const w = line.ws[tl.k];
        const k = ss(w.t - 0.12, w.t + 0.1, t) * (shat > 0 ? 1 - ss(0, 0.35, shat) : 1);
        if (k <= 0.01) continue;
        B.add(tl.pos[0], tl.pos[1], tl.pos[2], tl.w * k, 0.08, tl.h * k, tl.col, 0.05, 0, T.ry, 0);
      }
      for (const c of T.cubes) {
        const w = line.ws[c.k];
        const q = t - (w.t - 0.08 + c.d);
        if (q < 0) continue;
        let p, rot = [0, T.ry, 0], s = c.s, th = c.th;
        if (shat > 0) {
          // shatter: fly off and fall, spinning, shrinking away
          if (shat > 1.5) continue;
          const g = -26;
          p = [c.pos[0] + c.v[0] * shat, c.pos[1] + c.v[1] * shat + 0.5 * g * shat * shat, c.pos[2] + c.v[2] * shat];
          rot = [c.spin[0] * shat, T.ry + c.spin[1] * shat, c.spin[2] * shat];
          const k = 1 - ss(0.6, 1.5, shat);
          s *= k; th *= k;
        } else {
          const k = outBack(q / 0.34);
          p = [0, 1, 2].map((a) => c.from[a] + (c.pos[a] - c.from[a]) * k);
          const r = 1 - Math.min(1, q / 0.34);
          rot = [c.rot[0] * r, T.ry + c.rot[1] * r, c.rot[2] * r];
          // a little jump on the beat of its own word
          const hit = q > 0.3 && q < 0.7 ? Math.sin(((q - 0.3) / 0.4) * PI) * 0.12 : 0;
          if (T.flat) p[1] += hit * c.s * 4; else s *= 1 + hit;
        }
        if (T.flat) B.add(p[0], p[1], p[2], s, th, s, c.col, c.glow, rot[0], rot[1], rot[2]);
        else {
          B.add(p[0], p[1], p[2], s, s, th, c.col, c.glow, rot[0], rot[1], rot[2]);
          // a dark block a little behind and below: reads as an outline and depth on any background
          if (shat <= 0) { const F = T.F, o = c.s * 0.38; B.add(p[0] + F.r[0] * o - F.n[0] * th * 0.9, p[1] - o - F.n[1] * th * 0.9, p[2] + F.r[2] * o - F.n[2] * th * 0.9, s * 1.08, s * 1.08, th, T.shade, 0, rot[0], rot[1], rot[2]); }
        }
      }
    }

    // ---------------------------------------------------------------- things in the air
    particles(W, cam, t, pulse) {
      const B = this.dyn, kind = W.parts, at = cam.at;
      const n = kind === 'petals' ? 140 : kind === 'gold' ? 120 : kind === 'sparks' ? 110 : kind === 'stars' ? 40 : 70;
      for (let i = 0; i < n; i++) {
        const h1 = hash(i * 3.1 + 1), h2 = hash(i * 7.7 + 2), h3 = hash(i * 1.3 + 3), ph = hash(i * 9.1);
        const span = 50;
        let x = at[0] + (h1 - 0.5) * span, z = at[2] + (h2 - 0.5) * span, y;
        if (kind === 'petals' || kind === 'gold') {
          const fall = kind === 'gold' ? 7 : 2.2;
          y = at[1] + 22 - ((t * fall * (0.6 + h3) + ph * 40) % 40);
          x += Math.sin(t * 0.7 + ph * 9) * 2.5;
          const s = kind === 'gold' ? 0.45 : 0.28;
          B.add(x, y, z, s, kind === 'gold' ? s : s * 0.25, s, kind === 'gold' ? [255, 206, 70] : [255, 170 + h3 * 40, 200], kind === 'gold' ? 0.4 + pulse * 0.6 : 0.15, t * (1 + h1) + ph, t * 1.3 + ph * 4, t * 0.7);
        } else if (kind === 'sparks') {
          y = at[1] - 8 + ((t * (1 + h3 * 2) + ph * 30) % 30);
          const s = 0.12 + h3 * 0.12;
          B.add(x, y, z, s, s, s, h1 > 0.5 ? [255, 160, 230] : [160, 220, 255], 1.5 + pulse * 2 + Math.sin(t * 6 + ph * 20) * 0.8);
        } else if (kind === 'stars') {
          y = at[1] + (h3 - 0.5) * 40;
          const s = 0.2;
          B.add(x * 1.5, y, z * 1.5, s, s, s, [255, 255, 255], 1 + pulse * 2 + Math.sin(t * 3 + ph * 20));
        } else {
          y = at[1] + (h3 - 0.5) * 14 + Math.sin(t * 0.4 + ph * 6) * 1.5;
          const s = 0.1;
          B.add(x * 0.7, y, z * 0.7, s, s, s, [255, 230, 190], 0.8 + pulse);
        }
      }
    }
    // the cover statue flying together cube by cube, then breathing with the song
    statue(W, sec, t, pulse) {
      if (!this.statueVox) return;
      const B = this.dyn, n = 46, s = 0.5, q0 = t - sec.t0;
      for (let k = 0; k < this.statueVox.length; k++) {
        const v = this.statueVox[k];
        const h = hash(k * 1.7), h2 = hash(k * 3.3);
        const tx = (v.i - n / 2) * s, ty = 1.9 + v.j * s;
        const start = 0.2 + (v.j / n) * 1.4 + h * 0.4, k2 = outBack((q0 - start) / 0.8);
        if (q0 < start) continue;
        const th = 2 + v.dz;
        for (let d = 0; d < th; d++) {
          const tz = (d - (th - 1) / 2) * s;
          const fx = tx + (h - 0.5) * 50, fy = ty + 30 + h2 * 20, fz = tz + (h2 - 0.5) * 40;
          const wob = Math.sin(t * 2 + v.i * 0.3 + v.j * 0.2) * 0.04 * (1 + pulse * 2);
          B.add(fx + (tx - fx) * k2, fy + (ty - fy) * k2 + wob, fz + (tz - fz) * k2, s * 0.96, s * 0.96, s * 0.96, v.col, 0.06 + pulse * 0.1, (1 - Math.min(1, k2)) * 4 * h, 0, 0);
        }
      }
    }
    // a storm of cubes rushing at the camera between worlds
    storm(cam, t, tb, next) {
      const q = t - tb;
      if (q < -0.55 || q > 0.45) return 0;
      const B = this.dyn, v3 = O.Vox.v3;
      const f = v3.norm(v3.sub(cam.at, cam.pos)), r = v3.norm(v3.cross(f, [0, 1, 0])), u = v3.cross(r, f);
      const NW = next && next.L ? next.L : null;
      const cols = NW ? [NW.hor, NW.sunCol, NW.top].map((c) => c.map((v) => Math.min(255, 40 + v * 230))) : [[255, 255, 255]];
      // a warp of cubes streaming past the camera: thickest right at the cut
      const dens = 1 - Math.min(1, Math.abs(q) / 0.5);
      const N = Math.round(300 * dens), rx = -Math.asin(Math.max(-1, Math.min(1, f[1]))), ry = Math.atan2(f[0], f[2]);
      for (let i = 0; i < N; i++) {
        const h1 = hash(i * 1.1), h2 = hash(i * 2.3), h3 = hash(i * 4.7), h4 = hash(i * 7.9);
        const d = 46 * (1 - (((q + 0.55) * 1.6 + h4) % 1)) - 3;
        if (d < 1.2) continue;
        const a = h1 * PI * 2, rr = 2.2 + h3 * h3 * 9;
        const p = [0, 1, 2].map((k) => cam.pos[k] + f[k] * d + r[k] * Math.cos(a) * rr + u[k] * Math.sin(a) * rr * 0.75);
        const s = (0.22 + h2 * 0.55) * Math.min(1, d / 6);
        B.add(p[0], p[1], p[2], s, s, s * (1 + dens * 5), cols[i % cols.length], 0.5 + dens, rx, ry, h1 * 6);
      }
      return Math.exp(-Math.pow(q / 0.09, 2));
    }
    // ---------------------------------------------------------------- per frame
    frame(t, dt, A) {
      if (!this.ok || !this.secs.length) return;
      const ctx = this.ctx, G = this.G;
      const sc = O.glScale(ctx, true);
      G.size(ctx.W * sc, ctx.H * sc);
      this.R3.ensure(G.w, G.h);
      const pulse = A ? A.pulse : 0;
      const si = this.secAtT(t), sec = this.secs[si], nx = this.secs[si + 1];
      const W = this.build(sec);
      if (this.worldOf !== sec) {
        this.worldOf = sec;
        W.id = W.id || si + ':' + sec.world;
        this.R3.upload('world', W.boxes.d, W.boxes.n);
        this.texts.clear();
        // build the next world now, while this one plays
        if (nx) setTimeout(() => { try { this.build(nx); } catch (e) { /* built on arrival instead */ } }, 400);
      }
      const tt = this.warp(sec, t);
      const cam = Object.assign({}, W.cam(tt));
      // rush forward into the next world
      if (nx) {
        const k = ss(nx.t0 - 0.7, nx.t0, t);
        if (k > 0) { const f = O.Vox.v3.norm(O.Vox.v3.sub(cam.at, cam.pos)); cam.pos = O.Vox.v3.add(cam.pos, O.Vox.v3.mul(f, k * k * 10)); cam.at = O.Vox.v3.add(cam.at, O.Vox.v3.mul(f, k * k * 10)); cam.fov = cam.fov * (1 + k * 0.35); }
      }
      // settle in from the storm
      const ent = 1 - ss(sec.t0, sec.t0 + 0.6, t);
      if (si > 0 && ent > 0) cam.fov *= 1 + ent * 0.3;
      // key words and beats punch in a little
      let punch = pulse * 0.025;
      for (const ln of this.lines) { if (t < ln.t0 || t > ln.t1 + 0.2) continue; for (const w of ln.ws) if (w.key) { const q = t - w.t; if (q > 0 && q < 0.5) punch += 0.05 * Math.exp(-q * 9); } }
      cam.fov *= 1 - punch;
      // what moves
      this.dyn.clear();
      if (W.statue) this.statue(W, sec, t, pulse);
      for (const ln of this.lines) {
        if (t < ln.t0 || t > ln.t1 + 1.6) continue;
        if (this.secAtT(Math.max(0, ln.t0 + 0.3)) !== si && !ln.title) continue;
        if (ln.title && si !== 0) continue;
        this.drawText(ln, W, t);
      }
      if ((this.ctx.opts || {}).particles !== false) this.particles(W, cam, t, pulse);
      let flash = 0;
      if (nx) flash = Math.max(flash, this.storm(cam, t, nx.t0, nx.built));
      if (si > 0) flash = Math.max(flash, this.storm(cam, t, sec.t0, W));
      this.R3.upload('dyn', this.dyn.d, this.dyn.n);
      const Lt = Object.assign({}, W.L, { flash: flash * 0.8 + pulse * 0.05 });
      const rt = this.R3.render(cam, Lt, t);
      const night = (W.L.top[0] + W.L.top[1] + W.L.top[2]) < 0.4;
      this.post.run(rt, { time: t, bloom: night ? 0.22 : 0.12, glow: night ? 0.3 : 0.18, vig: 0.42, grain: 0.03, ca: 0.0012 + flash * 0.004, contrast: 1.05, sat: 1.08, clip: 0.9, exposure: 1 + flash * 0.6 }, null);
      this.stats = { world: sec.world, sec: si, boxes: W.boxes.n, dyn: this.dyn.n };
    }
    destroy() {
      if (this.R3) try { this.R3.destroy(); } catch (e) {}
      if (this.G) { try { this.G.destroy(); } catch (e) {} U.remove(this.G.canvas); }
    }
  }

  O.registerMode('voxel', Voxel, { label: 'Voxel', glow: false });
})();
