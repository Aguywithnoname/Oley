/* Oley · the shot engine behind Shadowplay and Warp: a song cut into shots (a line each, long lines in
   two, quiet shots for the breaks), a look per section, shot types dealt from a deck, and camera moves
   between shots that land on the first word of the next line: dives into a colour of the last shot,
   pull-backs out of a portal, whip pans, rolls, flashes, hard cuts, glass cracking, glitches, a mosaic,
   a diamond wipe, a card flip, a zoom punch. Shots draw in a 2D canvas (world units, the screen 1 tall);
   the camera's own speed then smears the frame on the graphics card. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const S = (O.Shadow = O.Shadow || {});
  const PI = Math.PI;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const eo = (u) => 1 - Math.pow(1 - cl(u, 0, 1), 3);
  const eio = (u) => { u = cl(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

  O.css('shadow', `
.m-sh, .m-wp { background: #000; }
.m-sh .sh-msg, .m-wp .sh-msg { position: absolute; inset: 0; display: grid; place-items: center; color: #ddd; font: 500 2vmin var(--sans, sans-serif); text-align: center; padding: 4vmin; }
`);

  const FX = `
uniform sampler2D uSrc; uniform vec2 uK, uB; uniform float uAsp, uInv, uMax, uGlitch, uPix, uSeed, uDef;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // mosaic
  if (uPix > 1.) uv = (floor(uv * uRes / uPix) + .5) * uPix / uRes;
  // glitch: bands of the picture knocked sideways
  float gsh = 0.;
  if (uGlitch > 0.) {
    float band = floor(uv.y * (14. + 20. * hash12(vec2(uSeed, 1.))));
    float r = hash12(vec2(band, uSeed));
    if (r < .6 * uGlitch) { gsh = (hash12(vec2(band, uSeed + 3.)) - .5) * .3 * uGlitch; uv.x += gsh; }
  }
  vec2 s = vec2((uv.x - .5) * uAsp, .5 - uv.y);
  vec2 sp = vec2(uK.x * s.x - uK.y * s.y, uK.y * s.x + uK.x * s.y) + uB;
  vec2 d = sp - s; float L = length(d); if (L > uMax) d *= uMax / L;
  vec3 c = vec3(0.);
  float n = L * uRes.y > 1.5 ? 18. : 1.;
  for (int i = 0; i < 18; i++) {
    if (float(i) >= n) break;
    vec2 q = s + d * ((float(i) + .5) / n);
    c += texture(uSrc, vec2(q.x / uAsp + .5, .5 - q.y)).rgb;
  }
  c /= n;
  if (uDef > .5) {
    // out of focus: a disc of taps
    vec3 a = texture(uSrc, uv).rgb; float wsum = 1.;
    for (int i = 0; i < 24; i++) {
      float fi = float(i), r = sqrt((fi + .5) / 24.), th = fi * 2.39996;
      vec2 o = vec2(cos(th), sin(th)) * r * uDef / uRes;
      a += texture(uSrc, uv + o).rgb; wsum += 1.;
    }
    c = a / wsum;
  }
  if (abs(gsh) > 0.) { vec2 q = vec2(uv.x + gsh * .3, uv.y); c.r = mix(c.r, texture(uSrc, q).r, .8); c.b = mix(c.b, texture(uSrc, vec2(uv.x - gsh * .3, uv.y)).b, .8); }
  c = mix(c, toLin(1. - toSrgb(c)), uInv);
  o = vec4(c, 1.);
}`;

  S.Engine = class {
    constructor(ctx, cfg) {
      this.ctx = ctx;
      this.cfg = cfg;
      ctx.root.classList.add(cfg.cls);
      this.shots = [];
      this.trans = [];
      this.ok = O.glSupported();
      if (!this.ok) { this.fallback(); return; }
      const G = (this.G = new O.GL(ctx.root, { onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { this.ok = false; U.remove(G.canvas); this.fallback(); return; }
      this.cv = document.createElement('canvas');
      this.g = this.cv.getContext('2d', { alpha: false });
      this.snap = document.createElement('canvas');
      this.snapKey = -1;
      this.tex = G.texture(null, { srgb: true, mips: false });
      this.pFx = G.program(FX);
      this.rt = G.target(4, 4);
      this.post = new O.Post(G);
      this.cut = null;
      if (document.fonts && document.fonts.load) Promise.all((cfg.fonts || ['100px "Oley Heavy"']).map((f) => document.fonts.load(f))).then(() => { S.clearMeasure && S.clearMeasure(); this.plan(); }).catch(() => {});
    }
    fallback() { U.el('div', 'sh-msg', this.ctx.root, this.cfg.label + ' needs WebGL2 (graphics acceleration). Pick another mode, or turn hardware acceleration on.'); }

    // ---------------------------------------------------------------- the cover's cut-out becomes the figure
    onArt(url, img) {
      const link = this.ctx.stage.link;
      if (link && img) link.send({ type: 'want', what: 'mask' });
      this.img = img || null;
      this.makeCut();
    }
    onMask() { this.makeCut(); }
    makeCut() {
      this.cut = null;
      const img = this.img;
      if (img && (this.ctx.opts || {}).cover !== false) {
        try {
          const info = this.ctx.maskImg ? O.Subject.fromMask(this.ctx.maskImg, img) : O.Subject.guess(img);
          if (info && info.canvas) { const c = new S.Cut(img, info.canvas); if (c.ok) this.cut = c; }
        } catch (e) { this.cut = null; }
      }
      this.plan();
    }
    onTrack(tr) { this.track = tr || null; this.plan(); }
    onLyrics() { this.plan(); }
    onSettings() { this.makeCut(); }
    onResize() { this.plan(); }
    serverBase() {
      if (/^https?:$/.test(location.protocol)) return location.origin;
      const a = this.ctx.stage && this.ctx.stage.artUrl;
      const m = a && /^(https?:\/\/(?:127\.0\.0\.1|localhost):\d+)\//.exec(a);
      return m ? m[1] : '';
    }

    // ---------------------------------------------------------------- the song cut into shots
    plan() {
      if (!this.ok) return;
      const ctx = this.ctx, tl = ctx.tl, P = O.params;
      const seed = U.hash(((this.track && (this.track.id || this.track.title)) || 'x') + this.cfg.name) ^ ((P && +P.get(this.cfg.p + 'seed')) || 0);
      const R = O.asciiRng(seed);
      const asp = ctx.W / Math.max(1, ctx.H);
      const clean = (raw) => String(raw || '').toUpperCase().replace(/[“”"()\[\],.;:]/g, '').replace(/’/g, "'").trim();
      const lower = (raw) => String(raw || '').replace(/[“”"()\[\]]/g, '').replace(/’/g, "'").trim();
      const lines = ((tl && tl.lines) || []).filter((L) => L.words && L.words.length);
      const end = (L) => Math.max(L.singEnd || 0, L.words[L.words.length - 1].t + 0.4);
      const PU = O.PU;
      if (PU && PU.Emoji) { PU.Emoji.setBase(this.serverBase()); PU.Emoji.setSet((ctx.opts && ctx.opts.emojiSet) || (((ctx.settings && ctx.settings.opts) || {}).pasteup || {}).emojiSet || 'fluent'); }
      // shots: a line each, long lines in two
      const raw = [];
      const title = this.track && this.track.title ? String(this.track.title) : '';
      if (title && (!lines.length || lines[0].t > 2.6)) {
        const tw = clean(title).split(/\s+/).filter(Boolean).slice(0, 5).map((txt, k) => ({ txt, raw: txt, lo: txt.toLowerCase(), t: 0.5 + k * 0.32, end: 0.5 + k * 0.32 + 0.3, key: k === 0 }));
        raw.push({ t0: 0, ws: tw, quiet: true, gapBefore: 9 });
        const first = lines.length ? lines[0].t : 0;
        for (let a = 3.6; a < first - 2.4; a += 2.8) raw.push({ t0: a, ws: [], quiet: true, gapBefore: 0 });
      }
      lines.forEach((L, li) => {
        const all = L.words.map((w, k) => { const nx = L.words[k + 1]; return { txt: clean(w.raw), lo: lower(w.raw), raw: w.raw, t: w.t, end: w.end || (nx ? nx.t : w.t + 0.4), key: !!w.key, li, k }; }).filter((w) => w.txt);
        if (!all.length) return;
        // emoji for the line, if a word has an obvious one
        let emo = null;
        if (PU && PU.emojiAt && (ctx.opts || {}).emoji !== false) for (let k = 0; k < L.words.length && !emo; k++) { const e = PU.emojiAt(L.words, k); if (e) emo = e; }
        const gap = li ? L.t - end(lines[li - 1]) : L.t;
        const parts = [];
        const dur = end(L) - L.t;
        if (all.length > 7 || (dur > 3.6 && all.length > 4)) {
          const mid = L.t + dur / 2;
          let cut = 1, best = 1e9;
          for (let k = 2; k < all.length - 1; k++) { const d = Math.abs(all[k].t - mid); if (d < best) { best = d; cut = k; } }
          parts.push(all.slice(0, cut), all.slice(cut));
        } else parts.push(all);
        parts.forEach((ws, pi) => raw.push({ t0: ws[0].t - 0.05, ws, emo, gapBefore: pi ? 0 : gap, lineEnd: end(L) }));
        // a long break after the line gets a quiet shot of its own
        const nx = lines[li + 1];
        if (nx && nx.t - end(L) > 3.6) {
          // long breaks get quiet shots of their own, a few seconds each
          const a = end(L) + 0.5, len = nx.t - 0.3 - a, k = Math.max(1, Math.round(len / 2.8));
          for (let q = 0; q < k; q++) raw.push({ t0: a + (len / k) * q, ws: [], quiet: true, gapBefore: 0 });
        }
      });
      if (!raw.length) raw.push({ t0: 0, ws: [], quiet: true, gapBefore: 9 });
      raw[0].t0 = 0;
      // shots too short to read join the one before
      const shots = [];
      for (const r of raw) {
        const pv = shots[shots.length - 1];
        if (pv && r.t0 - pv.t0 < 0.5 && !r.quiet && !pv.quiet) { pv.ws = pv.ws.concat(r.ws); continue; }
        shots.push(r);
      }
      const dur = (tl && tl.duration) || 0;
      shots.forEach((s, i) => { s.t1 = shots[i + 1] ? shots[i + 1].t0 : Math.max(dur, s.t0 + 6); s.dur = s.t1 - s.t0; });
      // looks per section, types from a deck, never twice running
      const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let sdeck = [], adeck = [], tdeck = [], scheme = null, acc = null, inSec = 0;
      const pal = ctx.palette || {};
      const vivid = pal.vivid, sat = vivid ? (Math.max(...vivid) - Math.min(...vivid)) / 255 : 0;
      const recent = [];
      const force = P && P.get(this.cfg.p + 'shot');
      const cfg = this.cfg, st = {};
      shots.forEach((s, i) => {
        if (!scheme || s.gapBefore > 3 || inSec >= 6) {
          if (!sdeck.length) sdeck = shuffle(cfg.schemeDeck);
          if (scheme && sdeck[0] === scheme.name) sdeck.push(sdeck.shift());
          if (!adeck.length) adeck = shuffle(cfg.accents.concat(sat > 0.35 ? [vivid] : []));
          scheme = cfg.schemes[sdeck.shift()]; acc = scheme.acc || adeck.shift(); inSec = 0;
        }
        inSec++;
        s.sc = Object.assign({}, scheme, { acc });
        const ws = s.ws, n = ws.length, chars = ws.reduce((a, w) => a + w.txt.length + 1, 0);
        const kw = ws.find((w) => w.key) || ws[n - 1];
        const ok = (t) => {
          if (recent.includes(t) && !(cfg.repeat || []).includes(t)) return false;
          if (s.quiet && !cfg.quiet.includes(t)) return false;
          if (!n) return cfg.quiet.includes(t);
          return cfg.okType ? cfg.okType(t, { n, chars, kw, emo: s.emo, s, eng: this }) : true;
        };
        let type = null;
        if (i === 0 && s.quiet && cfg.intro) type = cfg.intro;
        if (!type && cfg.pickType) type = cfg.pickType(s, i, st, ok, R);
        for (let tries = 0; tries < 2 && !type; tries++) {
          if (!tdeck.length || tries) tdeck = tdeck.concat(shuffle(cfg.types));
          const k = tdeck.findIndex(ok);
          if (k >= 0) type = tdeck.splice(k, 1)[0];
        }
        if (!type) type = n ? cfg.fallback[0] : cfg.fallback[1];
        if (force && cfg.lib[force] && (n || cfg.quiet.includes(force))) type = force;
        s.type = type;
        recent.push(type); if (recent.length > 3) recent.shift();
        s.seed = (R() * 4294967296) >>> 0;
        s.variant = R.i(0, 3);
      });
      this.shots = shots;
      this.asp = asp;
      shots.forEach((s, i) => this.build(i));
      // the moves between shots
      let trd = [];
      const forceT = P && P.get(this.cfg.p + 'trans');
      const flashes = (ctx.opts || {}).flashes !== false;
      this.trans = [];
      for (let i = 0; i < shots.length - 1; i++) {
        const A = shots[i], B = shots[i + 1];
        const okT = (t) => {
          if (t === 'pull') return !!B.obj.portal;
          if (!flashes && (t === 'flash' || t === 'cut' || t === 'glitch')) return false;
          if (t === 'shatter') return A.dur > 1.4;
          return true;
        };
        let type = null;
        if (forceT) type = forceT;
        if (!type && cfg.pairTrans) type = cfg.pairTrans(A, B, R);
        for (let tries = 0; tries < 2 && !type; tries++) {
          if (!trd.length || tries) trd = trd.concat(shuffle(cfg.trans));
          const k = trd.findIndex(okT);
          if (k >= 0) type = trd.splice(k, 1)[0];
        }
        if (type === 'pull' && !B.obj.portal) type = 'dive';
        type = type || 'dive';
        const tr = { type, tc: B.t0, dir: R.sgn(), seed: (R() * 4294967296) >>> 0 };
        const lim = (d, sh, f) => Math.min(d, sh.dur * f);
        const D = { dive: [0.38, 0.5], pull: [0.25, 0.9], whip: [0.2, 0.22], roll: [0.3, 0.45], flash: [0.14, 0.4], cut: [0.05, 0.3], shatter: [0.62, 0.5], glitch: [0.12, 0.2], pixel: [0.2, 0.22], diamond: [0.08, 0.34], flip: [0.17, 0.2], zoom: [0.2, 0.35], cont: [0.01, 0.01], blur: [0.3, 0.35], iris: [0.06, 0.5], bars: [0.06, 0.4] }[type] || [0.2, 0.3];
        tr.dOut = lim(D[0], A, 0.45); tr.dIn = lim(D[1], B, 0.5);
        if (type === 'whip') { tr.h = Math.min(0.2, A.dur * 0.3, B.dur * 0.3); tr.axis = R.ch(0.7) ? 0 : 1; }
        if (type === 'iris') { tr.poly = []; const n = R.i(6, 9); for (let k = 0; k < n; k++) tr.poly.push([(k / n) * PI * 2 + R.r(-0.2, 0.2), R.r(0.8, 1.15)]); }
        if (type === 'bars') { tr.bars = []; let x = 0; while (x < 1) { const w = R.r(0.01, 0.06); tr.bars.push([x, w, R.r(0, 0.5)]); x += w; } }
        if (type === 'dive' || type === 'shatter') {
          // dive into the part of A that is the colour B starts in
          const anc = A.obj.anchors || [{ x: 0, y: 0, col: A.obj.bg }];
          const dist = (c) => Math.abs(c[0] - B.obj.bg[0]) + Math.abs(c[1] - B.obj.bg[1]) + Math.abs(c[2] - B.obj.bg[2]);
          let best = anc[0];
          for (const a of anc) if (dist(a.col) < dist(best.col)) best = a;
          tr.anchor = type === 'shatter' ? { x: R.r(-0.15, 0.15) * asp, y: R.r(-0.15, 0.1), col: [255, 255, 255] } : best;
          tr.bridge = type === 'shatter' ? [255, 255, 255] : dist(best.col) > 90 ? B.obj.bg : null;
          if (type === 'shatter') tr.cracks = this.cracks(tr.anchor, O.asciiRng(tr.seed));
        }
        this.trans.push(tr);
      }
      this.snapKey = -1;
    }
    build(i) {
      const s = this.shots[i];
      const R = O.asciiRng(s.seed), pal = this.ctx.palette || {};
      const PU = O.PU, emo = s.emo;
      if (emo && PU && PU.Emoji) PU.Emoji.want(emo);
      const env = {
        R, sc: s.sc, ws: s.ws, asp: this.asp, t0: s.t0, t1: s.t1, dur: s.dur, ph: R.r(0, 6), variant: s.variant, cut: this.cut,
        pal: { dark: pal.dark || [30, 24, 50], light: pal.light || [250, 220, 200], vivid: pal.vivid || [240, 100, 140] },
        emoji: () => (emo && PU && PU.Emoji ? PU.Emoji.img(emo) : null), emo, track: this.track, eng: this,
        idx: i, prev: i > 0 ? this.shots[i - 1].ws : [], next: this.shots[i + 1] ? this.shots[i + 1].ws : [], img: this.img,
      };
      try { s.obj = this.cfg.lib[s.type](env); } catch (e) { console.error(e); s.obj = this.cfg.lib[this.cfg.fallback[s.ws.length ? 0 : 1]](env); }
      if (!s.obj.anchors || !s.obj.anchors.length) s.obj.anchors = [{ x: 0, y: 0, col: s.obj.bg }];
    }
    cracks(P, R) {
      const lines = [], n = R.i(9, 13), rings = [];
      const angs = []; for (let i = 0; i < n; i++) angs.push((i / n) * PI * 2 + R.r(-0.2, 0.2));
      for (const a0 of angs) {
        const pts = [[P.x, P.y]]; let a = a0, r = 0;
        while (r < 1.6) { r += R.r(0.05, 0.16); a += R.r(-0.18, 0.18); pts.push([P.x + Math.cos(a) * r, P.y + Math.sin(a) * r]); }
        lines.push(pts);
      }
      for (const rr of [0.05, 0.13, 0.26]) for (let i = 0; i < n; i++) if (R() < 0.7) rings.push([angs[i], angs[(i + 1) % n] + (i === n - 1 ? PI * 2 : 0), rr * R.r(0.8, 1.2)]);
      return { P, lines, rings };
    }

    // ---------------------------------------------------------------- the camera, shot by shot, with the moves in and out
    shotAt(t) { const S2 = this.shots; let i = 0; while (i < S2.length - 1 && S2[i + 1].t0 <= t) i++; return i; }
    zoomAbout(c, px, py, m) { c.x = px + (c.x - px) / m; c.y = py + (c.y - py) / m; c.z *= m; }
    camOf(i, t) {
      const sh = this.shots[i], lt = t - sh.t0;
      const c = Object.assign({ x: 0, y: 0, z: 1, r: 0, ox: 0, oy: 0 }, sh.obj.cam(lt));
      // the key word punches in
      for (const w of sh.ws) { const q = t - w.t; if (q > -0.03 && q < 0.7) { const e = Math.exp(-Math.max(0, q) * 7) * cl((q + 0.03) / 0.05, 0, 1); c.z *= 1 + (w.key ? 0.06 : 0.012) * e; if (w.key) c.r += 0.025 * e * ((w.k || 0) % 2 ? 1 : -1); } }
      c.z *= 1 + 0.014 * (this.pulse || 0);
      const tin = this.trans[i - 1], tout = this.trans[i];
      if (tin) this.moveIn(tin, c, t, sh);
      if (tout) this.moveOut(tout, c, t, sh);
      return c;
    }
    whipA(tr, t) { return eio((t - (tr.tc - tr.h)) / (2 * tr.h)); }
    span(tr) { return tr.axis ? [0, 1.04] : [this.asp * 1.02, 0]; }
    moveOut(tr, c, t, A) {
      if (tr.type === 'whip') { if (t < tr.tc - tr.h) return; const a = this.whipA(tr, t), sp = this.span(tr); c.ox -= tr.dir * a * sp[0]; c.oy -= tr.dir * a * sp[1]; return; }
      const u = cl((t - (tr.tc - tr.dOut)) / tr.dOut, 0, 1);
      if (u <= 0) return;
      switch (tr.type) {
        case 'dive': this.zoomAbout(c, tr.anchor.x, tr.anchor.y, Math.exp(7.5 * Math.pow(u, 3))); break;
        case 'pull': c.z *= 1 + 0.35 * u * u; break;
        case 'roll': c.r += tr.dir * 1.3 * Math.pow(u, 2.2); c.z *= 1 + 0.7 * u * u; break;
        case 'flash': c.z *= 1 + 0.12 * u * u; break;
        case 'shatter': { const v = cl((u - 0.5) / 0.5, 0, 1); if (v > 0) this.zoomAbout(c, tr.anchor.x, tr.anchor.y, Math.exp(7 * Math.pow(v, 2.2))); else c.x += Math.sin(t * 90) * 0.004 * ss(0, 0.15, u) * (1 - ss(0.15, 0.4, u)); break; }
        case 'glitch': c.x += (Math.sin(t * 173) * 0.5 + Math.sin(t * 97)) * 0.01 * u; c.z *= 1 + 0.06 * u; break;
        case 'pixel': c.z *= 1 + 0.25 * u * u; break;
        case 'flip': c.sx = Math.cos(u * PI / 2); c.z *= 1 + 0.15 * u; break;
        case 'zoom': c.z *= Math.exp(2.2 * Math.pow(u, 2.5)); c.r += tr.dir * 0.2 * u * u; break;
        case 'blur': c.z *= 1 + 0.05 * u; break;
        case 'iris': case 'bars': c.z *= 1 + 0.04 * u; break;
        default: break;
      }
    }
    moveIn(tr, c, t, B) {
      if (tr.type === 'whip') { if (t > tr.tc + tr.h) return; const a = this.whipA(tr, t), sp = this.span(tr); c.ox += tr.dir * (1 - a) * sp[0]; c.oy += tr.dir * (1 - a) * sp[1]; return; }
      const u = (t - tr.tc) / tr.dIn;
      if (u >= 1 || u < 0) return;
      const e = 1 - eo(u);
      switch (tr.type) {
        case 'dive': case 'shatter': this.zoomAbout(c, c.x, c.y, 1 + 1.7 * e * e); c.r += tr.dir * 0.12 * e * e; break;
        case 'pull': {
          const p = B.obj.portal, hyp = Math.hypot(this.asp, 1) / 2;
          const m0 = Math.max(1, hyp / (p.r * (p.sq ? 1.42 : 1) * c.z));
          this.zoomAbout(c, p.x, p.y, Math.pow(m0, 1 - eo(u)));
          break;
        }
        case 'roll': c.r -= tr.dir * 1.1 * e * e; c.z *= 1 + 0.8 * e * e; break;
        case 'flash': c.z *= 1 + 0.25 * e * e; break;
        case 'cut': c.z *= 1 + 0.16 * e * e; break;
        case 'glitch': c.z *= 1 + 0.1 * e * e; c.x -= (Math.sin(t * 151) * 0.5 + Math.sin(t * 89)) * 0.01 * e; break;
        case 'pixel': c.z *= 1 + 0.3 * e * e; break;
        case 'flip': c.sx = Math.sin(eo(u) * PI / 2) * (u < 1 ? 1 : 1); c.z *= 1 + 0.15 * e; break;
        case 'zoom': c.z *= 1 / (1 + 0.6 * e * e) * (1 + 0.0 * e); c.r -= tr.dir * 0.2 * e * e; break;
        case 'diamond': c.z *= 1 + 0.25 * e; break;
        case 'blur': c.z *= 1 + 0.06 * e; break;
        case 'iris': c.z *= 1 + 0.35 * e; c.r += tr.dir * 0.25 * e; break;
        case 'bars': c.z *= 1 + 0.08 * e; break;
        default: break;
      }
    }
    // what's on screen at t: one shot, or two during a whip pan
    items(t) {
      const i = this.shotAt(t), out = [{ i, cam: this.camOf(i, t) }];
      const tout = this.trans[i], tin = this.trans[i - 1];
      if (tout && tout.type === 'whip' && t > tout.tc - tout.h) out.push({ i: i + 1, cam: this.camOf(i + 1, t) });
      if (tin && tin.type === 'whip' && t < tin.tc + tin.h) out.unshift({ i: i - 1, cam: this.camOf(i - 1, t) });
      if (tin && tin.type === 'diamond' && t < tin.tc + tin.dIn) { out[0].diamond = eo((t - tin.tc) / tin.dIn); out[0].tr = tin; out.unshift({ i: i - 1, cam: this.camOf(i - 1, Math.min(t, tin.tc)) }); }
      if (tin && (tin.type === 'iris' || tin.type === 'bars') && t < tin.tc + tin.dIn) { out[0].reveal = { kind: tin.type, u: eo((t - tin.tc) / tin.dIn), tr: tin }; out.unshift({ i: i - 1, cam: this.camOf(i - 1, Math.min(t, tin.tc)) }); }
      // a dissolve: the next shot fades up over this one
      const dz = (tr) => eio((t - (tr.tc - tr.dOut)) / (tr.dOut + tr.dIn));
      if (tout && tout.type === 'blur' && t > tout.tc - tout.dOut) out.push({ i: i + 1, cam: this.camOf(i + 1, t), alpha: dz(tout) });
      if (tin && tin.type === 'blur' && t < tin.tc + tin.dIn) { out[0].alpha = dz(tin); out.unshift({ i: i - 1, cam: this.camOf(i - 1, t) }); }
      return out;
    }
    // global effects at t: flashes, inversion
    fx(t) {
      const i = this.shotAt(t), sh = this.shots[i];
      const f = { flash: 0, flashCol: [255, 255, 255], inv: 0, glitch: 0, pix: 0, def: 0 };
      const tin = this.trans[i - 1], tout = this.trans[i];
      const add = (a, col) => { if (a > f.flash) { f.flash = a; f.flashCol = col; } };
      for (const tr of [tin, tout]) {
        if (!tr) continue;
        const q = t - tr.tc;
        if (tr.type === 'flash') { if (q > -0.03 && q < 0.05) add(1, [255, 255, 255]); else if (q >= 0.05 && q < 0.12) { add(0.85, this.shots[this.shotAt(tr.tc)].sc.acc); f.inv = 1; } }
        if (tr.type === 'cut' && q >= 0 && q < 0.05) f.inv = 1;
        if ((tr.type === 'dive' || tr.type === 'shatter') && tr.bridge) { const u = (t - (tr.tc - tr.dOut * 0.35)) / (tr.dOut * 0.35); if (u > 0 && q < 0) add(eo(u), tr.bridge); if (q >= 0 && q < 0.06) add(1 - q / 0.06, tr.bridge); }
        if (tr.type === 'shatter') { const u = (t - (tr.tc - tr.dOut)) / tr.dOut; if (u > 0 && u < 0.08) add(0.6, [255, 255, 255]); }
        if (tr.type === 'glitch' && q > -tr.dOut && q < tr.dIn) f.glitch = Math.max(f.glitch, 1 - Math.abs(q) / (q < 0 ? tr.dOut : tr.dIn));
        if (tr.type === 'pixel' && q > -tr.dOut && q < tr.dIn) f.pix = Math.max(f.pix, Math.pow(1 - Math.abs(q) / (q < 0 ? tr.dOut : tr.dIn), 2));
        if (tr.type === 'zoom' && q > -0.02 && q < 0.04) add(0.7, [255, 255, 255]);
        if (tr.type === 'blur' && q > -tr.dOut && q < tr.dIn) f.def = Math.max(f.def, Math.sin(PI * eio((q + tr.dOut) / (tr.dOut + tr.dIn))));
      }
      const own = sh.obj.fx && sh.obj.fx(t - sh.t0);
      if (own) { if (own.def) f.def = Math.max(f.def, own.def); add(own.flash || 0, own.flashCol || [255, 255, 255]); if (own.glitch) f.glitch = Math.max(f.glitch, own.glitch); if (own.pix) f.pix = Math.max(f.pix, own.pix); if (own.inv) f.inv = Math.max(f.inv, own.inv); }
      if (sh.obj.hit && sh.obj.hit(t)) f.inv = Math.max(f.inv, 1);
      if ((this.ctx.opts || {}).flashes === false) { f.flash *= 0.4; f.inv = 0; f.glitch *= 0.3; }
      return f;
    }

    // ---------------------------------------------------------------- drawing
    drawShot(g, W, H, i, cam, t, it) {
      const sh = this.shots[i];
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (cam.ox || cam.oy) { g.beginPath(); g.rect(H * cam.ox, H * cam.oy, W, H); g.clip(); }
      let dm = null;
      if (it && it.diamond != null) {
        // the next shot opens in a diamond that grows from the middle
        const r = it.diamond * Math.hypot(W, H) * 0.75, cx = W / 2, cy = H / 2;
        dm = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
        g.beginPath(); g.moveTo(dm[0][0], dm[0][1]); for (const p of dm) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
      }
      let rv = null;
      if (it && it.reveal) {
        rv = it.reveal;
        const u = rv.u, cx = W / 2, cy = H / 2, R0 = Math.hypot(W, H) * 0.6;
        g.beginPath();
        if (rv.kind === 'iris') {
          // a torn opening that turns as it grows
          const rot = (1 - u) * 1.2 * rv.tr.dir;
          rv.pts = rv.tr.poly.map(([a, k]) => [cx + Math.cos(a + rot) * R0 * u * k, cy + Math.sin(a + rot) * R0 * u * k]);
          g.moveTo(rv.pts[0][0], rv.pts[0][1]); for (const p of rv.pts) g.lineTo(p[0], p[1]); g.closePath();
        } else {
          for (const [x0, w, d] of rv.tr.bars) { const k = cl((u - d * 0.6) / 0.4, 0, 1); if (k > 0) g.rect(x0 * W, 0, w * W * k + 1, H); }
        }
        g.clip();
      }
      if (it && it.alpha != null) g.globalAlpha = cl(it.alpha, 0, 1);
      g.translate(W / 2 + H * cam.ox, H / 2 + H * cam.oy);
      g.rotate(-cam.r);
      if (cam.sx != null && cam.sx !== 1) g.scale(Math.max(0.002, cam.sx), 1);
      g.scale(H * cam.z, H * cam.z);
      g.translate(-cam.x, -cam.y);
      const F = { t, pulse: this.pulse || 0, level: this.level || 0, beat: this.beat || 0, asp: this.asp, W, H, z: cam.z };
      sh.obj.draw(g, t - sh.t0, F);
      // the previous shot, seen through this one's portal as we pull back
      const tin = this.trans[i - 1];
      if (tin && tin.type === 'pull' && t < tin.tc + tin.dIn && this.snapKey === i) {
        const p = sh.obj.portal, u = (t - tin.tc) / tin.dIn, a = 1 - ss(0.55, 1, u);
        const hyp = Math.hypot(this.asp, 1) / 2, r = p.r * (p.sq ? 1.42 : 1), h = 2 * r / hyp, w = h * this.asp;
        if (a > 0) {
          g.save(); g.beginPath();
          if (p.sq) g.rect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); else g.arc(p.x, p.y, p.r, 0, PI * 2);
          g.clip(); g.globalAlpha = a; g.drawImage(this.snap, p.x - w / 2, p.y - h / 2, w, h); g.restore();
          g.strokeStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; g.lineWidth = 0.003 / cam.z * 2; g.beginPath();
          if (p.sq) g.rect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); else g.arc(p.x, p.y, p.r, 0, PI * 2);
          g.stroke();
        }
      }
      // glass cracking before we fly through it
      const tout = this.trans[i];
      if (tout && tout.type === 'shatter' && t > tout.tc - tout.dOut) {
        const u = (t - (tout.tc - tout.dOut)) / tout.dOut, gr = ss(0, 0.14, u), C = tout.cracks;
        g.lineJoin = 'round'; g.lineCap = 'round';
        for (const [col, off, lw] of [['rgba(255,40,60,0.55)', 0.004, 0.004], ['rgba(60,220,255,0.5)', -0.004, 0.004], ['rgba(255,255,255,0.95)', 0, 0.0028]]) {
          g.strokeStyle = col; g.lineWidth = lw;
          g.beginPath();
          for (const L of C.lines) { const n = Math.max(2, Math.ceil(L.length * gr)); g.moveTo(L[0][0] + off, L[0][1]); for (let k = 1; k < n; k++) g.lineTo(L[k][0] + off, L[k][1]); }
          for (const [a0, a1, r] of C.rings) { if (r > gr * 0.4) continue; g.moveTo(C.P.x + Math.cos(a0) * r + off, C.P.y + Math.sin(a0) * r); g.arc(C.P.x + off, C.P.y, r, a0, a1); }
          g.stroke();
        }
        // a hot spot where it hit
        const hs = g.createRadialGradient(C.P.x, C.P.y, 0, C.P.x, C.P.y, 0.08);
        hs.addColorStop(0, 'rgba(255,255,255,0.9)'); hs.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hs; g.fillRect(C.P.x - 0.1, C.P.y - 0.1, 0.2, 0.2);
      }
      g.restore();
      if (rv && rv.kind === 'iris' && rv.pts) {
        // the torn paper edge round the opening
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = H * 0.03;
        g.strokeStyle = 'rgb(242,238,228)'; g.lineWidth = H * 0.025; g.lineJoin = 'miter';
        g.beginPath(); g.moveTo(rv.pts[0][0], rv.pts[0][1]); for (const p of rv.pts) g.lineTo(p[0], p[1]); g.closePath(); g.stroke();
        g.restore();
      }
      if (dm) {
        // a striped border round the opening diamond
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        const acc = sh.sc.acc, lw = H * 0.05;
        g.lineWidth = lw; g.lineJoin = 'miter';
        g.strokeStyle = 'rgba(' + acc.join(',') + ',1)';
        g.setLineDash([lw * 0.6, lw * 0.6]); g.lineDashOffset = -t * H * 0.6;
        g.beginPath(); g.moveTo(dm[0][0], dm[0][1]); for (const p of dm) g.lineTo(p[0], p[1]); g.closePath(); g.stroke();
        g.restore();
      }
    }
    render(g, W, H, t) {
      for (const it of this.items(t)) this.drawShot(g, W, H, it.i, it.cam, t, it);
    }
    // the last frame of the shot before a pull-back, kept to show through the portal
    ensureSnap(i) {
      if (this.snapKey === i) return;
      const tr = this.trans[i - 1];
      if (!tr || tr.type !== 'pull') return;
      const W = Math.max(2, Math.round(this.cv.width / 2)), H = Math.max(2, Math.round(this.cv.height / 2));
      this.snap.width = W; this.snap.height = H;
      const g = this.snap.getContext('2d');
      const t = tr.tc - 1 / 60;
      this.drawShot(g, W, H, i - 1, this.camOf(i - 1, t), t);
      this.snapKey = i;
    }

    // ---------------------------------------------------------------- per frame
    frame(t, dt, A) {
      if (!this.ok || !this.shots.length) return;
      const ctx = this.ctx, G = this.G;
      const sc = O.glScale(ctx, false);
      G.size(ctx.W * sc, ctx.H * sc);
      const W = G.w, H = G.h;
      if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; this.snapKey = -1; }
      if (Math.abs(W / H - this.asp) > 0.01) this.plan();
      this.pulse = A ? A.pulse : 0;
      this.level = A ? A.level || 0 : 0;
      this.beat = A ? A.beat || 0 : 0;
      const i = this.shotAt(t);
      this.ensureSnap(i);
      const g = this.g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      this.render(g, W, H, t);
      G.upload(this.tex, this.cv);
      // the camera's own movement over the shutter, for the blur
      const items = this.items(t);
      const main = items.length > 1 ? items.reduce((a, b) => (Math.abs(b.cam.ox) + Math.abs(b.cam.oy) < Math.abs(a.cam.ox) + Math.abs(a.cam.oy) ? b : a)) : items[0];
      const dtS = 1 / 45, c = main.cam, p = this.camOf(main.i, t - dtS);
      const k = p.z / c.z, D = c.r - p.r;
      const kc = k * Math.cos(D), ks = k * Math.sin(D);
      const ox = c.ox, oy = c.oy;
      const cr = Math.cos(-p.r), sr = Math.sin(-p.r), dx = (c.x - p.x) * p.z, dy = (c.y - p.y) * p.z;
      const bx = -(kc * ox - ks * oy) + (cr * dx - sr * dy) + p.ox, by = -(ks * ox + kc * oy) + (sr * dx + cr * dy) + p.oy;
      if (!this.rt.w || this.rt.w !== W || this.rt.h !== H) G.resizeTarget(this.rt, W, H);
      const f = this.fx(t);
      G.draw(this.pFx, { uSrc: this.tex, uK: [kc, ks], uB: [bx, by], uAsp: W / H, uInv: f.inv, uMax: 0.35, uGlitch: f.glitch, uPix: f.pix > 0.01 ? Math.max(1, f.pix * H * 0.06) : 0, uSeed: Math.floor(t * 24) % 97, uDef: f.def * H * 0.025 }, this.rt);
      const zr = Math.log(c.z / p.z) / dtS, blur = Math.hypot(kc - 1, ks) + Math.hypot(bx, by);
      const PP = this.cfg.post || {};
      this.post.run(this.rt, Object.assign({
        time: t, bloom: 0.08, glow: 0.05, vig: 0.25, grain: 0.045, contrast: 1.03, sat: 1.02, clip: 0.95,
      }, PP, {
        ca: (PP.ca || 0.0012) + Math.min(0.012, blur * 0.05) + f.glitch * 0.01, distort: cl(zr * 0.012, -0.25, 0.35),
        flash: f.flash, flashCol: f.flashCol.map((v) => v / 255),
      }), null);
      this.stats = { shot: i, type: this.shots[i].type, scheme: this.shots[i].sc.name, trIn: this.trans[i - 1] ? this.trans[i - 1].type : '', trOut: this.trans[i] ? this.trans[i].type : '', n: this.shots.length };
    }
    destroy() {
      if (this.G) { try { this.G.destroy(); } catch (e) {} U.remove(this.G.canvas); }
    }
  };

})();
