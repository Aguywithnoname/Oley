/* Oley stage: owns the clock, the current mode, edge glow, song intro card, status line. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  O.modes = O.modes || {};
  O.MODE_ORDER = ['constellation', 'source', 'orbit', 'stack', 'nebula', 'messages', 'editlyric', 'pasteup', 'foundry', 'ascii', 'voxel', 'shadow', 'warp', 'glass', 'polyester', 'motion', 'afterglow'];
  // built-in modes register themselves from js/modes; your own come from the custom-modes folder (see MAKING-MODES.md)
  O.registerMode = function (name, cls, meta) {
    cls.meta = meta || {};
    if (!O.MODE_ORDER.includes(name)) { O.MODE_ORDER.push(name); cls.meta.custom = true; }
    O.modes[name] = cls;
  };

  // inject a stylesheet once (modes keep their CSS next to their code)
  const injected = {};
  O.css = function (id, text) {
    if (injected[id]) return;
    injected[id] = true;
    const s = document.createElement('style');
    s.setAttribute('data-oley', id);
    s.textContent = text;
    document.head.appendChild(s);
  };

  O.DEFAULT_SETTINGS = {
    mode: 'auto',
    enabled: O.MODE_ORDER.slice(),
    intro: true,
    clock: true,
    offset: 0,
    perf: 'balanced',
    glow: { cinema: 'auto', intensity: 0.8, color: 'cover', custom: '#ff3bd4', notch: false, react: true },
    opts: {
      constellation: { title: true },
      source: { handle: '', cards: true },
      orbit: { planet: true },
      stack: { boxes: true },
      nebula: { comets: true },
      messages: { maps: true, places: true },
      editlyric: { room3d: true, caption: true, typos: true, classic: true },
      pasteup: { cutout: true, flashes: true, emoji: true, emojiSet: 'fluent', scroll: 'mix' },
      foundry: { callouts: true, blueprint: false },
      ascii: { flowers: true, accent: true, density: 'fine' },
      voxel: { cover: true, particles: true },
      shadow: { cover: true, flashes: true, emoji: true },
      warp: { flashes: true, emoji: true, cover: true },
      glass: { flashes: true, emoji: true, cover: true },
      polyester: { captions: true, cutout: true },
      motion: { handle: '', keywords: true },
      afterglow: { camera: true, dock: true },
    },
  };
  function merge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const k in over) {
      const b = base ? base[k] : undefined;
      out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, over[k]) : over[k];
    }
    return out;
  }
  O.mergeSettings = merge;

  // mood -> how well each mode suits it (Auto mode)
  const AFFINITY = {
    sad: { constellation: 3, afterglow: 2.4, stack: 2, editlyric: 1.6, pasteup: 0.8, foundry: 1.6, ascii: 1.8, voxel: 1, shadow: 2.4, warp: 0.8, glass: 2.2, messages: 1.4, source: 1.3, nebula: 1, motion: 0.9, orbit: 0.8, polyester: 0.5 },
    tender: { constellation: 2.4, messages: 2.4, afterglow: 2.4, editlyric: 2, pasteup: 1.2, foundry: 1.8, ascii: 2, voxel: 1.6, shadow: 2.6, warp: 1.6, glass: 2.6, stack: 1.8, nebula: 1.4, source: 0.9, orbit: 0.9, motion: 0.8, polyester: 0.5 },
    hype: { polyester: 3.2, pasteup: 3, foundry: 2, ascii: 1, voxel: 2.6, shadow: 2.2, warp: 3, glass: 1.4, orbit: 3, nebula: 2.4, motion: 2.2, editlyric: 2, stack: 1.6, source: 1.4, messages: 1, afterglow: 1, constellation: 0.7 },
    angry: { polyester: 3, pasteup: 2.6, source: 3, motion: 2.6, orbit: 2.4, editlyric: 1.8, nebula: 1.4, stack: 1, messages: 0.8, afterglow: 0.8, constellation: 0.7 },
    neutral: {},
  };

  // ================================================================ edge glow
  O.Glow = class {
    constructor(el, stage) {
      this.el = el;
      this.stage = stage;
      this.inner = U.el('div', 'glow-color', el);
      this.I = 0;
      this.rot = 0;
      this.maskKey = '';
      this.colKey = '';
    }
    build() {
      const st = this.stage, W = st.W, H = st.H, notch = !!(st.settings.glow || {}).notch;
      const key = W + 'x' + H + ':' + notch;
      if (key === this.maskKey || !W || !H) return;
      this.maskKey = key;
      const s = Math.min(1, 1600 / Math.max(W, H));
      const cw = Math.max(2, Math.round(W * s)), ch = Math.max(2, Math.round(H * s));
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      const r = Math.max(10, Math.min(cw, ch) * 0.018);
      const path = new Path2D();
      const nw = cw * 0.135, nh = Math.max(10, ch * 0.03), nr = nh * 0.45, nx = (cw - nw) / 2;
      path.moveTo(r, 0);
      if (notch) {
        path.lineTo(nx - nr, 0);
        path.quadraticCurveTo(nx, 0, nx, nr);
        path.lineTo(nx, nh - nr);
        path.quadraticCurveTo(nx, nh, nx + nr, nh);
        path.lineTo(nx + nw - nr, nh);
        path.quadraticCurveTo(nx + nw, nh, nx + nw, nh - nr);
        path.lineTo(nx + nw, nr);
        path.quadraticCurveTo(nx + nw, 0, nx + nw + nr, 0);
      }
      path.lineTo(cw - r, 0);
      path.quadraticCurveTo(cw, 0, cw, r);
      path.lineTo(cw, ch - r);
      path.quadraticCurveTo(cw, ch, cw - r, ch);
      path.lineTo(r, ch);
      path.quadraticCurveTo(0, ch, 0, ch - r);
      path.lineTo(0, r);
      path.quadraticCurveTo(0, 0, r, 0);
      path.closePath();
      x.lineJoin = 'round';
      x.strokeStyle = '#fff';
      x.shadowColor = '#fff';
      // wide bloom
      x.globalAlpha = 0.55; x.lineWidth = 10 * s * 2; x.shadowBlur = 70 * s * 2; x.stroke(path);
      x.globalAlpha = 0.6; x.lineWidth = 6 * s * 2; x.shadowBlur = 28 * s * 2; x.stroke(path);
      // bright core
      x.globalAlpha = 1; x.lineWidth = 3.2 * s * 2; x.shadowBlur = 5 * s * 2; x.stroke(path);
      let url;
      try { url = c.toDataURL('image/png'); } catch (e) { return; }
      this.el.style.webkitMaskImage = 'url(' + url + ')';
      this.el.style.maskImage = 'url(' + url + ')';
    }
    colours() {
      const st = this.stage, g = st.settings.glow || {};
      let a, b;
      if (g.color === 'custom') {
        a = U.parseHex(g.custom || '#ff3bd4');
        b = U.shiftHue(a, 42, 1, 0.95);
      } else {
        a = st.palette.glow;
        b = st.palette.glow2;
      }
      const key = U.hex(a) + U.hex(b);
      if (key === this.colKey) return;
      this.colKey = key;
      const A = U.rgba(a, 1), B = U.rgba(b, 1), M = U.rgba(U.mix(a, [255, 255, 255], 0.35), 1);
      this.inner.style.background = `conic-gradient(from 0deg, ${A}, ${B}, ${A}, ${M}, ${B}, ${A})`;
    }
    frame(dt, Au, on) {
      const g = this.stage.settings.glow || {};
      const inten = U.clamp(+g.intensity || 0.8, 0, 1.5);
      const react = g.react !== false;
      let target = 0;
      if (on) target = react ? inten * (0.5 + 0.38 * U.sat(Au.level * 1.3) + 0.4 * Au.pulse) : inten * 0.8;
      this.I = U.damp(this.I, target, on ? 9 : 4, dt);
      if (this.I < 0.003 && !on) { if (this.el.style.display !== 'none') this.el.style.display = 'none'; return; }
      if (this.el.style.display === 'none') this.el.style.display = '';
      this.build();
      this.colours();
      this.rot += dt * (0.018 + 0.02 * Au.level);
      this.el.style.opacity = U.clamp(this.I, 0, 1).toFixed(3);
      this.inner.style.transform = `translate(-50%,-50%) rotate(${(this.rot * 360) % 360}deg) scale(${1 + Au.pulse * 0.03})`;
    }
  };

  // ================================================================ intro card ("song presentation")
  O.Intro = class {
    constructor(el, stage) {
      this.el = el;
      this.stage = stage;
      this.card = U.el('div', 'np-card', el);
      this.art = U.el('div', 'np-art', this.card);
      this.title = U.el('div', 'np-title', this.card);
      this.artist = U.el('div', 'np-artist', this.card);
      const ctl = U.el('div', 'np-ctl', this.card);
      ctl.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M3 6h3l11 12h4M3 18h3l4-4.4M14 6h3l4 0m-4-3 4 3-4 3m0 6 4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5 9 12l10 7z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
        '<span class="np-play"><svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg></span>' +
        '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5l10 7-10 7z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
        '<svg viewBox="0 0 24 24"><path d="M4 9a5 5 0 0 1 5-5h9l-3-3m3 3-3 3M20 15a5 5 0 0 1-5 5H6l3 3m-3-3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.pill = U.el('div', 'np-pill', this.card, 'Lyrics');
      this.t = -1;
      this.hold = 3;
      this.el.style.display = 'none';
    }
    show(track, long) {
      this.title.textContent = track.title || '';
      this.artist.textContent = track.artist || '';
      this.hold = long ? 3.0 : 1.7;
      this.t = 0;
      this.el.style.display = '';
    }
    setArt(url) { this.art.style.backgroundImage = url ? 'url("' + url + '")' : ''; }
    hide() { if (this.t >= 0 && this.t < this.hold + 0.5) this.t = this.hold + 0.5; }
    frame(dt) {
      if (this.t < 0) return;
      this.t += dt;
      const tin = U.e('outCubic', this.t / 0.55);
      const tout = U.e('inCubic', (this.t - this.hold - 0.5) / 0.6);
      const op = tin * (1 - tout);
      const sc = 0.92 + 0.08 * tin + 0.05 * tout;
      const bl = (1 - tin) * 12 + tout * 10;
      this.card.style.opacity = op.toFixed(3);
      this.card.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(4)})`;
      this.card.style.filter = bl > 0.2 ? `blur(${bl.toFixed(1)}px)` : 'none';
      if (this.t > this.hold + 1.2) { this.t = -1; this.el.style.display = 'none'; }
    }
    get active() { return this.t >= 0 && this.t < this.hold + 0.6; }
  };

  // ================================================================ lock-screen clock (shared)
  O.LockClock = class {
    constructor(parent, cls) {
      this.el = U.el('div', 'lock-clock ' + (cls || ''), parent);
      this.d = U.el('div', 'lc-date', this.el);
      this.t = U.el('div', 'lc-time', this.el);
      this.last = '';
    }
    update() {
      const now = new Date(), s = U.fmtClock(now);
      if (s !== this.last) { this.last = s; this.t.textContent = s; this.d.textContent = U.fmtDateShort(now); }
    }
  };

  // ================================================================ stage
  O.Stage = class {
    constructor(root, opts) {
      this.root = root;
      this.opts = opts || {};
      this.role = this.opts.role || 'view';
      this.screenId = this.opts.screen || '';
      this.forcedMode = this.opts.mode || null;
      this.settings = merge(O.DEFAULT_SETTINGS, {});
      this.clock = new O.Clock();
      this.track = null;
      this.artUrl = null;
      this.artImg = null;
      this.maskImg = null;
      this.maskSrc = null;
      this.palette = O.defaultPalette();
      this.tl = O.buildTimeline(null, 0, '');
      this.A = { level: 0, bass: 0, mid: 0, high: 0, beat: 0, pulse: 0, energy: 0.3, bands: new Float32Array(24), live: false };
      this.audioIn = null;
      this.lastAudio = 0;
      this.connected = false;
      this.mode = null;
      this.modeName = '';
      this.autoPick = {};
      this.decideAt = 0;
      this.lastWordKey = '';
      root.classList.add('oley-stage');
      if (this.role) root.classList.add('role-' + this.role);
      this.modeLayer = U.el('div', 'layer modes', root);
      this.glow = new O.Glow(U.el('div', 'layer glow', root), this);
      this.intro = new O.Intro(U.el('div', 'layer intro', root), this);
      this.idle = U.el('div', 'layer idle', root);
      this.idleClock = new O.LockClock(this.idle, 'idle-clock');
      this.idleMsg = U.el('div', 'idle-msg', this.idle);
      this.hud = U.el('div', 'layer hud', root);
      this.hudMsg = U.el('div', 'hud-msg', this.hud);
      this.hudErr = U.el('div', 'hud-err', this.hud);
      if (this.opts.hud === false) this.hud.style.display = 'none';
      this.hudT = 0;
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      window.addEventListener('resize', () => this.resize());
      this.ready = false;
      // canvases and GPU text need the faces loaded before they draw (CSS only loads what the page uses)
      if (document.fonts && document.fonts.load) {
        ['400 64px "Oley Heavy"', '700 56px "Oley Mono"', '400 40px "Oley Mono"', '800 64px "Oley Display"', '700 64px "Oley Display"',
          '600 40px "Oley Sans"', '700 40px "Oley Sans"', 'italic 400 64px "Oley Serif"', '400 64px "Oley Serif"', '700 40px "Oley Round"']
          .forEach((f) => { try { document.fonts.load(f).catch(() => {}); } catch (e) {} });
      }
      const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
        this.ready = true;
        this.ensureMode(true);
      });
      this.loop = this.loop.bind(this);
      this.lastNow = 0;
      requestAnimationFrame(this.loop);
    }

    quality() {
      const p = this.settings.perf;
      return p === 'light' ? 0.6 : p === 'smooth' ? 1 : 0.85;
    }
    dpr() {
      const p = this.settings.perf;
      const d = window.devicePixelRatio || 1;
      return p === 'light' ? Math.min(1, d) * 0.75 : p === 'smooth' ? Math.min(2, d) : Math.min(1.25, d);
    }

    setSettings(s) {
      const before = this.settings;
      this.settings = merge(O.DEFAULT_SETTINGS, s || {});
      document.documentElement.classList.toggle('perf-light', this.settings.perf === 'light');
      if (before.mode !== this.settings.mode || String(before.enabled) !== String(this.settings.enabled)) {
        this.autoPick = {};
        this.ensureMode();
      }
      if (this.mode && this.mode.onSettings) this.safe(() => this.mode.onSettings(this.settings));
      this.glow.maskKey = '';
      this.glow.colKey = '';
    }
    setConnected(c) {
      this.connected = c;
      this.updateIdleText();
    }

    // ---------------------------------------------------------- data in
    setTrack(tr) {
      const prev = this.track;
      const changed = !prev !== !tr || (tr && prev && tr.id !== prev.id);
      this.track = tr || null;
      this.updateIdleText();
      if (!tr) {
        if (changed) {
          this.tl = O.buildTimeline(null, 0, '');
          this.intro.hide();
          if (this.mode) this.safe(() => { this.mode.onTrack(null); this.mode.onLyrics(this.tl); });
        }
        return;
      }
      if (changed) {
        this.tl = O.buildTimeline(null, tr.duration || 0, tr.title || '');
        this.tl.status = 'loading';
        this.decideAt = performance.now() + 2600;
        this.pendingDecision = true;
        if (this.settings.intro && !(this.mode && this.mode.constructor.meta.noIntro) && this.role !== 'thumb') {
          this.intro.show(tr, this.clock.targetNow() < 20);
        }
        if (this.mode) this.safe(() => { this.mode.onTrack(tr); this.mode.onLyrics(this.tl); });
      }
      if (tr.art !== this.artSrc) this.loadArt(tr.art);
    }
    loadArt(src) {
      this.artSrc = src;
      if (!src) { this.applyArt(null, null); return; }
      const img = new Image();
      if (/^https?:/.test(src) && location.protocol === 'file:') img.crossOrigin = 'anonymous';
      img.onload = () => { if (this.artSrc === src) this.applyArt(src, img); };
      img.onerror = () => { if (this.artSrc === src) this.applyArt(null, null); };
      img.src = src;
    }
    applyArt(url, img) {
      this.artUrl = url;
      this.artImg = img;
      this.maskImg = null;
      if (this.mode && this.mode.onMask) this.safe(() => this.mode.onMask(null));
      const pm = O.params.get('mask');
      if (img && pm && /^[\w./-]+$/.test(pm)) this.setMask({ url: pm, art: url });
      this.palette = img ? O.paletteFrom(img) : O.defaultPalette();
      const p = this.palette;
      const rs = this.root.style;
      rs.setProperty('--vivid', p.vividHex);
      rs.setProperty('--second', p.secondHex);
      rs.setProperty('--dark', p.darkHex);
      rs.setProperty('--light', p.lightHex);
      this.intro.setArt(url);
      this.glow.colKey = '';
      if (this.mode) this.safe(() => this.mode.onArt(url, img, p));
    }
    // a cut-out of the cover's subject, made by the app (white = subject)
    setMask(m) {
      if (!m || !m.url) return;
      if (m.art && this.artUrl && m.art !== this.artUrl && m.art !== this.artSrc) return;
      const src = m.url;
      this.maskSrc = src;
      const img = new Image();
      if (/^https?:/.test(src) && location.protocol === 'file:') img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (this.maskSrc !== src) return;
        this.maskImg = img;
        if (this.mode && this.mode.onMask) this.safe(() => this.mode.onMask(img));
      };
      img.src = src;
    }
    restartMode() {
      const n = this.modeName;
      if (!n) return;
      this.modeName = '';
      this.switchMode(n);
    }
    setLyrics(lyr) {
      if (!lyr) return;
      if (this.track && lyr.id && this.track.id && lyr.id !== this.track.id) return;
      let lines = lyr.lines || [];
      let synced = !!lyr.synced;
      if (!synced && !lines.length && lyr.plain) lines = O.estimateLines(lyr.plain, (this.track && this.track.duration) || 0);
      if (!synced && lines.length && lyr.estimated == null) lyr.estimated = true;
      this.tl = O.buildTimeline({ status: lyr.status, synced, lines }, (this.track && this.track.duration) || 0, (this.track && this.track.title) || '');
      this.tl.status = lyr.status || (lines.length ? 'synced' : 'none');
      this.tl.estimated = !synced && lines.length > 0;
      if (this.pendingDecision) { this.pendingDecision = false; this.ensureMode(); }
      if (this.mode) this.safe(() => this.mode.onLyrics(this.tl));
      this.showStatus();
    }
    setAudio(a, synthetic) {
      if (!a) return;
      this.audioIn = a;
      this.lastAudio = performance.now();
      this.A.live = !synthetic;
    }
    showStatus() {
      const st = this.tl.status;
      const map = {
        loading: 'Finding lyrics…',
        none: 'No lyrics found for this song',
        instrumental: 'Instrumental',
        error: 'Couldn\'t reach the lyrics service. Retrying…',
      };
      let msg = map[st] || '';
      if (!msg && this.tl.estimated) msg = 'These lyrics have no timing, so they follow along roughly';
      this.hudMsg.textContent = msg;
      this.hudT = msg ? (st === 'none' || st === 'instrumental' ? 1e9 : 6) : 0;
    }

    // ---------------------------------------------------------- modes
    wantedMode() {
      let m = this.forcedMode || this.settings.mode || 'auto';
      if (m === 'auto') {
        m = this.autoMode();
        if (!m) return null; // still deciding: wait for the lyrics (the intro card is showing)
      }
      if (!O.modes[m]) m = O.MODE_ORDER.find((x) => O.modes[x]) || '';
      return m;
    }
    autoMode() {
      const key = this.track ? this.track.id || this.track.title || 'x' : 'idle';
      if (this.autoPick[key]) return this.autoPick[key];
      if (this.pendingDecision) return this.modeName || null;
      const usable = (m) => O.modes[m] && (!(O.modes[m].meta || {}).gl || O.glSupported());
      let enabled = (this.settings.enabled || O.MODE_ORDER).filter(usable);
      if (!enabled.length) enabled = O.MODE_ORDER.filter(usable);
      const aff = AFFINITY[this.tl.mood] || {};
      const r = U.rng(U.hash(key) ^ 0x51ed27);
      let items = enabled.map((m) => ({ v: m, w: (aff[m] || 1) * (m === this.lastAuto && enabled.length > 1 ? 0 : 1) }));
      if (!items.some((i) => i.w > 0)) items = enabled.map((m) => ({ v: m, w: 1 }));
      const pick = r.weighted(items);
      if (this.track) { this.autoPick[key] = pick; this.lastAuto = pick; }
      return pick;
    }
    ensureMode(force) {
      if (!this.ready) return;
      const want = this.wantedMode();
      if (want && (want !== this.modeName || (force && !this.mode))) this.switchMode(want);
    }
    makeCtx(root, name) {
      const st = this;
      return {
        root, stage: st, name,
        get W() { return st.W; },
        get H() { return st.H; },
        get u() { return Math.min(st.W, (st.H * 16) / 9) / 100; },
        get palette() { return st.palette; },
        get track() { return st.track; },
        get tl() { return st.tl; },
        get art() { return st.artUrl; },
        get artImg() { return st.artImg; },
        get maskImg() { return st.maskImg; },
        get settings() { return st.settings; },
        get opts() { return (st.settings.opts || {})[name] || {}; },
        get quality() { return st.quality(); },
        get dpr() { return st.dpr(); },
        get playing() { return st.clock.playing; },
        rng: (s) => U.rng((st.tl.seed ^ U.hash(name + ':' + s)) >>> 0),
      };
    }
    switchMode(name) {
      const Cls = O.modes[name];
      if (!Cls) return;
      const old = this.mode, oldRoot = old && old.__root;
      const root = U.el('div', 'mode-root mode-' + name, this.modeLayer);
      const ctx = this.makeCtx(root, name);
      let m;
      try { m = new Cls(ctx); } catch (e) { this.reportError(e); U.remove(root); return; }
      m.__root = root;
      ['onTrack', 'onArt', 'onLyrics', 'frame', 'destroy', 'onResize', 'onMask'].forEach((k) => { if (!m[k]) m[k] = function () {}; });
      this.mode = m;
      this.modeName = name;
      this.root.dataset.mode = name;
      this.safe(() => {
        m.onTrack(this.track);
        if (this.artUrl || this.artImg) m.onArt(this.artUrl, this.artImg, this.palette);
        if (this.maskImg) m.onMask(this.maskImg);
        m.onLyrics(this.tl);
      });
      root.style.opacity = '0';
      requestAnimationFrame(() => requestAnimationFrame(() => { root.style.transition = 'opacity .8s ease'; root.style.opacity = '1'; }));
      if (old) {
        oldRoot.style.transition = 'opacity .7s ease';
        oldRoot.style.opacity = '0';
        oldRoot.style.pointerEvents = 'none';
        setTimeout(() => { this.safe(() => old.destroy()); U.remove(oldRoot); }, 760);
      }
      this.clock.jumped = true;
    }
    glowOn() {
      const g = (this.settings.glow || {}).cinema || 'auto';
      if (g === 'off') return false;
      if (g === 'on') return true;
      const meta = this.mode ? this.mode.constructor.meta || {} : {};
      return !!meta.glow;
    }

    // ---------------------------------------------------------- frame loop
    resize() {
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      this.glow.maskKey = '';
      if (this.mode) this.safe(() => this.mode.onResize(this.W, this.H));
    }
    updateAudio(dt) {
      const A = this.A, a = this.audioIn;
      const fresh = a && performance.now() - this.lastAudio < 600;
      const playing = this.clock.playing;
      if (fresh && playing) {
        A.level = U.damp(A.level, +a.level || 0, 16, dt);
        A.bass = U.damp(A.bass, +a.bass || 0, 20, dt);
        A.mid = U.damp(A.mid, +a.mid || 0, 14, dt);
        A.high = U.damp(A.high, +a.high || 0, 14, dt);
        const b = a.bands || [];
        for (let i = 0; i < A.bands.length; i++) {
          const v = +b[i] || 0;
          A.bands[i] = v > A.bands[i] ? U.damp(A.bands[i], v, 30, dt) : U.damp(A.bands[i], v, 7, dt);
        }
        if (a.beat) { A.pulse = Math.max(A.pulse, U.clamp(+a.beat, 0.4, 1)); a.beat = 0; }
      } else {
        // no live audio: breathe gently and kick on sung words
        const tgt = playing ? 0.32 : 0.04;
        A.level = U.damp(A.level, tgt, 2, dt);
        A.bass = U.damp(A.bass, tgt, 2, dt);
        A.mid = U.damp(A.mid, tgt * 0.8, 2, dt);
        A.high = U.damp(A.high, tgt * 0.6, 2, dt);
        const tt = performance.now() / 1000;
        for (let i = 0; i < A.bands.length; i++) A.bands[i] = U.damp(A.bands[i], playing ? 0.18 + 0.12 * Math.sin(tt * 2.1 + i * 0.7) * Math.sin(tt * 0.7 + i) : 0.02, 4, dt);
        const li = O.lineAt(this.tl, this.clock.t);
        const L = this.tl.lines[li];
        const wi = O.wordAt(L, this.clock.t);
        const k = li + ':' + wi;
        if (playing && wi >= 0 && k !== this.lastWordKey) A.pulse = Math.max(A.pulse, L.words[wi].key ? 0.8 : 0.45);
        this.lastWordKey = k;
      }
      A.pulse = Math.max(0, A.pulse - dt * 3.4);
      A.energy = U.damp(A.energy, A.level, 0.4, dt);
    }
    loop(now) {
      requestAnimationFrame(this.loop);
      if (document.hidden && this.role !== 'thumb') { this.lastNow = now; return; }
      const dt = this.lastNow ? Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000)) : 1 / 60;
      this.lastNow = now;
      if (this.driver) this.driver.tick();
      this.clock.offset = +this.settings.offset || 0;
      this.clock.tick(dt);
      this.updateAudio(dt);
      if (this.pendingDecision && performance.now() > this.decideAt) { this.pendingDecision = false; this.ensureMode(); }
      const t = this.clock.t;
      if (this.mode && this.ready) {
        const jumped = this.clock.consumeJump();
        try { this.mode.frame(t, dt, this.A, jumped); } catch (e) { this.reportError(e); }
      }
      this.glow.frame(dt, this.A, this.glowOn() && this.role !== 'thumb');
      this.intro.frame(dt);
      this.frameIdle(dt);
      if (this.hudT > 0) {
        this.hudT -= dt;
        this.hudMsg.style.opacity = this.hudT > 1e8 ? '0.55' : U.sat(this.hudT).toFixed(2);
      } else if (this.hudMsg.style.opacity !== '0') this.hudMsg.style.opacity = '0';
    }
    updateIdleText() {
      let msg = '';
      if (!this.track) {
        if (this.role === 'wallpaper' && !this.connected) msg = 'Start Oley to see lyrics here';
        else if (this.connected || this.role === 'preview') msg = 'Play something on Spotify';
        else msg = 'Connecting to Oley…';
      }
      this.idleMsg.textContent = msg;
    }
    frameIdle(dt) {
      const show = !this.track && !this.driver;
      this.idleOp = U.damp(this.idleOp || 0, show ? 1 : 0, 3, dt);
      if (this.idleOp < 0.01) { if (this.idle.style.display !== 'none') this.idle.style.display = 'none'; return; }
      this.idle.style.display = '';
      this.idle.style.opacity = this.idleOp.toFixed(3);
      this.idleClock.update();
    }
    safe(fn) { try { fn(); } catch (e) { this.reportError(e); } }
    reportError(e) {
      console.error(e);
      const msg = (e && (e.stack || e.message)) || String(e);
      this.hudErr.textContent = 'Oley: ' + String(msg).split('\n').slice(0, 2).join(' ');
      this.hudErr.style.opacity = '0.8';
      clearTimeout(this.errT);
      this.errT = setTimeout(() => { this.hudErr.style.opacity = '0'; }, 9000);
      if (this.link) this.link.send({ type: 'log', level: 'error', msg: String(msg).slice(0, 2000) });
    }
  };
})();
