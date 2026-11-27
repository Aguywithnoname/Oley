/* Messages: the song as a text conversation. Typing dots, grey and blue bubbles lighting up word by
   word, location tags under some lines, a map card now and then, tapbacks and read receipts. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('messages', `
.m-msg { background: #000; }
.m-msg .msg-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 55% 60% at 50% 55%, var(--mg, rgba(120,40,160,0.18)), rgba(0,0,0,0) 70%); }
.m-msg .msg-stage { position: absolute; inset: 0; perspective: 1700px; }
.m-msg .msg-wrap { position: absolute; left: 50%; top: 0; height: 100%; width: var(--mw); margin-left: calc(var(--mw) / -2); transform-style: preserve-3d;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 26%, #000 100%); mask-image: linear-gradient(to bottom, transparent 0%, #000 26%, #000 100%); will-change: transform; }
.m-msg .msg-list { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; will-change: transform; }
.m-msg .msg-item { display: flex; flex-direction: column; margin-top: 0.42em; font: 500 var(--mf) 'Oley Sans', 'Segoe UI', sans-serif; will-change: opacity, transform; }
.m-msg .msg-item.sent { align-items: flex-end; } .m-msg .msg-item.recv { align-items: flex-start; }
.m-msg .msg-b { position: relative; max-width: 78%; padding: 0.5em 0.85em 0.55em; border-radius: 1.15em; line-height: 1.28; color: #fff; letter-spacing: -0.005em; }
.m-msg .recv .msg-b { background: #262629; }
.m-msg .sent .msg-b { background: linear-gradient(180deg, #3d8bff, #0a6cff); }
.m-msg .msg-b::after { content: ''; position: absolute; bottom: 0; width: 0.9em; height: 1em; }
.m-msg .recv .msg-b::after { left: -0.35em; border-bottom-right-radius: 0.8em; background: #262629; clip-path: path('M 0 16 Q 8 14 9 0 L 14 0 L 14 16 Z'); }
.m-msg .sent .msg-b::after { right: -0.35em; background: #0a6cff; clip-path: path('M 14 16 Q 6 14 5 0 L 0 0 L 0 16 Z'); }
.m-msg .msg-b .w { opacity: 0.32; transition: opacity 0.16s linear; }
.m-msg .msg-b .w.on { opacity: 1; }
.m-msg .msg-b.feat { font-size: 0.82em; padding: 0.35em 0.75em; background: #1c1c1f; color: rgba(255,255,255,0.85); font-style: italic; }
.m-msg .msg-dots { display: flex; gap: 0.22em; padding: 0.62em 0.85em; }
.m-msg .msg-dots i { width: 0.42em; height: 0.42em; border-radius: 50%; background: #8e8e93; animation: msg-bob 1.1s infinite ease-in-out; }
.m-msg .msg-dots i:nth-child(2) { animation-delay: 0.15s; } .m-msg .msg-dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes msg-bob { 0%, 60%, 100% { transform: translateY(0); opacity: 0.55; } 30% { transform: translateY(-0.22em); opacity: 1; } }
.m-msg .msg-loc { display: flex; align-items: center; gap: 0.35em; margin: 0.32em 0.6em 0; font-size: 0.7em; color: rgba(235,235,245,0.6); font-weight: 500; }
.m-msg .msg-loc svg { width: 0.95em; height: 0.95em; }
.m-msg .msg-time { align-self: center; margin: 0.9em 0 0.3em; font-size: 0.66em; color: rgba(235,235,245,0.55); font-weight: 600; }
.m-msg .msg-time b { font-weight: 700; color: rgba(235,235,245,0.75); }
.m-msg .msg-read { margin: 0.25em 0.3em 0; font-size: 0.64em; color: rgba(235,235,245,0.5); font-weight: 600; }
.m-msg .msg-tap { position: absolute; top: -0.9em; width: 1.75em; height: 1.75em; border-radius: 50%; background: #2c2c30; border: 0.14em solid #000; display: grid; place-items: center;
  font-size: 0.8em; font-family: var(--emoji); transform: scale(0); }
.m-msg .sent .msg-tap { left: -1.1em; } .m-msg .recv .msg-tap { right: -1.1em; }
.m-msg .msg-map { width: 74%; border-radius: 1.05em; overflow: hidden; background: #1b1c20; box-shadow: 0 0.4em 1.6em rgba(0,0,0,0.45); }
.m-msg .msg-map canvas { display: block; width: 100%; height: 7.4em; }
.m-msg .msg-map .mm-b { padding: 0.55em 0.8em 0.65em; background: #232327; }
.m-msg .msg-map .mm-t { font-weight: 700; font-size: 0.92em; color: #fff; line-height: 1.25; }
.m-msg .msg-map .mm-s { display: flex; align-items: center; gap: 0.3em; margin-top: 0.2em; font-size: 0.68em; color: rgba(235,235,245,0.6); }
.m-msg .msg-map .mm-s svg { width: 0.95em; height: 0.95em; }
.m-msg .msg-map .mm-tag { position: absolute; margin: 0.45em 0 0 0.6em; font-size: 0.58em; font-weight: 700; color: rgba(255,255,255,0.75); letter-spacing: 0.02em; }
`);

  const PLACES = ['Shibuya Crossing, Tokyo', 'Brooklyn Bridge, New York', 'Marine Drive, Mumbai', 'Shoreditch, London', 'Le Marais, Paris',
    'Venice Beach, Los Angeles', 'Gangnam, Seoul', 'Nyhavn, Copenhagen', 'Alexanderplatz, Berlin', 'Bondi Beach, Sydney', 'Hauz Khas, New Delhi',
    'Downtown Dubai', 'Sunset Blvd, Los Angeles', 'Trastevere, Rome', 'Harajuku, Tokyo', 'Times Square, New York', 'Bandra, Mumbai',
    'Gamla Stan, Stockholm', 'Ocean Drive, Miami', 'Kreuzberg, Berlin', 'Myeongdong, Seoul', 'Camden, London', 'Montmartre, Paris', 'Indiranagar, Bengaluru'];
  const PLACE_WORDS = new Set('city town street streets road drive driving ride home here there away place places miles highway avenue downtown world corner block hood west east north south ocean beach coast'.split(' '));
  const LOVE = new Set('love loved lover heart hearts baby kiss darling forever'.split(' '));
  const ME = new Set('i me my mine myself im ill ive'.split(' '));
  const PIN = '<svg viewBox="0 0 24 24"><path d="M3 11 21 3l-8 18-2-8z" fill="currentColor"/></svg>';

  // a dark-mode city map, drawn the way a maps app renders one: water, parks, blocks of buildings,
  // a street hierarchy with casings, a highway, labels and the pin
  function drawMap(canvas, r, accent, place) {
    const W = canvas.width, H = canvas.height, x = canvas.getContext('2d');
    const n = U.noise2((r() * 1e6) | 0);
    x.fillStyle = '#1d1e20';
    x.fillRect(0, 0, W, H);
    // water: a river with soft banks
    const rv = { y: H * r.range(0.25, 0.75), a: H * r.range(0.12, 0.3), w: H * r.range(0.16, 0.26), f: r.range(1.2, 2.2) };
    const riverY = (px) => rv.y + Math.sin((px / W) * rv.f * Math.PI + 1.3) * rv.a * 0.5 + n(px / W * 2.5, 3.1) * rv.a * 0.6;
    const inWater = (px, py) => Math.abs(py - riverY(px)) < rv.w / 2 + 2;
    x.fillStyle = '#16283c';
    x.beginPath();
    for (let px = -10; px <= W + 10; px += 8) x.lineTo(px, riverY(px) - rv.w / 2);
    for (let px = W + 10; px >= -10; px -= 8) x.lineTo(px, riverY(px) + rv.w / 2);
    x.closePath();
    x.fill();
    // city grid in a rotated frame
    const ang = r.range(-0.5, 0.5), cell = W * r.range(0.075, 0.1), ca = Math.cos(ang), sa = Math.sin(ang);
    const toW = (gx, gy) => [W / 2 + gx * ca - gy * sa, H / 2 + gx * sa + gy * ca];
    const span = Math.ceil(Math.hypot(W, H) / cell / 2) + 1;
    const park = { gx: r.int(-3, 2), gy: r.int(-2, 1), w: r.int(1, 2), h: r.int(1, 2) };
    for (let i = -span; i < span; i++) for (let j = -span; j < span; j++) {
      const c = toW((i + 0.5) * cell, (j + 0.5) * cell);
      if (c[0] < -cell || c[0] > W + cell || c[1] < -cell || c[1] > H + cell || inWater(c[0], c[1])) continue;
      const isPark = i >= park.gx && i < park.gx + park.w && j >= park.gy && j < park.gy + park.h;
      x.save();
      x.translate(c[0], c[1]);
      x.rotate(ang);
      const bs = cell * 0.84;
      if (isPark) {
        x.fillStyle = '#1d3123';
        x.beginPath(); x.roundRect(-bs / 2, -bs / 2, bs, bs, cell * 0.06); x.fill();
        x.fillStyle = 'rgba(70,120,80,0.25)';
        for (let k = 0; k < 6; k++) { x.beginPath(); x.arc((r() - 0.5) * bs * 0.8, (r() - 0.5) * bs * 0.8, cell * r.range(0.03, 0.07), 0, Math.PI * 2); x.fill(); }
      } else {
        x.fillStyle = '#222326';
        x.fillRect(-bs / 2, -bs / 2, bs, bs);
        // buildings packed in the block, lit from the top left
        const k = r.int(2, 3), bw = bs / k;
        for (let u = 0; u < k; u++) for (let v = 0; v < k; v++) {
          if (r() < 0.12) continue;
          const pad = bw * r.range(0.06, 0.16);
          const bx = -bs / 2 + u * bw + pad, by = -bs / 2 + v * bw + pad, w = bw - pad * 2, h = bw - pad * 2;
          const sh = r.range(0.7, 1.15);
          x.fillStyle = `rgb(${(41 * sh) | 0},${(42 * sh) | 0},${(46 * sh) | 0})`;
          x.fillRect(bx, by, w, h);
          x.fillStyle = 'rgba(0,0,0,0.28)';
          x.fillRect(bx, by + h - Math.max(1.5, h * 0.12), w, Math.max(1.5, h * 0.12));
        }
      }
      x.restore();
    }
    // streets: casing then fill; every fourth is an avenue
    const street = (gx0, gy0, gx1, gy1, wid, col, casing) => {
      const p0 = toW(gx0, gy0), p1 = toW(gx1, gy1);
      x.lineCap = 'butt';
      x.strokeStyle = casing; x.lineWidth = wid + 2.2;
      x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke();
      x.strokeStyle = col; x.lineWidth = wid;
      x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke();
    };
    const L = span * cell;
    for (let i = -span; i <= span; i++) {
      const big = i % 4 === 0;
      street(i * cell, -L, i * cell, L, big ? cell * 0.11 : cell * 0.055, big ? '#3d3e43' : '#2e2f33', '#18191b');
      street(-L, i * cell, L, i * cell, big ? cell * 0.11 : cell * 0.055, big ? '#3d3e43' : '#2e2f33', '#18191b');
    }
    // bridges over the river where avenues cross it
    // highway: a sweeping curve across town
    x.lineCap = 'round';
    const hy0 = H * r.range(0.1, 0.9), hy1 = H * r.range(0.1, 0.9);
    const hw = (px) => [px, hy0 + (hy1 - hy0) * (px / W) + Math.sin((px / W) * Math.PI) * H * 0.18];
    for (const [wid, col] of [[cell * 0.2, '#2a2417'], [cell * 0.15, '#6d5a31']]) {
      x.strokeStyle = col; x.lineWidth = wid;
      x.beginPath();
      for (let px = -20; px <= W + 20; px += 10) { const q = hw(px); if (px === -20) x.moveTo(q[0], q[1]); else x.lineTo(q[0], q[1]); }
      x.stroke();
    }
    // labels
    const label = (txt, px, py, size, col, spacing, rot) => {
      x.save(); x.translate(px, py); x.rotate(rot || 0);
      x.font = `600 ${size}px 'Oley Sans', 'Segoe UI', sans-serif`;
      x.letterSpacing = spacing || '0px';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 3; x.strokeStyle = 'rgba(20,21,23,0.85)'; x.strokeText(txt, 0, 0);
      x.fillStyle = col; x.fillText(txt, 0, 0);
      x.restore();
    };
    const area = String(place || '').split(',').pop().trim().toUpperCase() || 'DOWNTOWN';
    label(area, W * r.range(0.25, 0.75), H * r.range(0.18, 0.3), H * 0.055, 'rgba(170,172,180,0.75)', '3px');
    const st = String(place || 'Main St').split(',')[0].trim();
    const sp = toW(0.5 * cell, -1.5 * cell);
    label(st, sp[0], sp[1], H * 0.045, 'rgba(220,220,228,0.85)', '0px', ang);
    // pin with a soft shadow
    const px = W * 0.52, py = H * 0.48, R = H * 0.085;
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath(); x.ellipse(px, py + R * 1.7, R * 0.55, R * 0.2, 0, 0, Math.PI * 2); x.fill();
    const g = x.createLinearGradient(px, py - R, px, py + R);
    g.addColorStop(0, U.hex(U.mix(accent, [255, 255, 255], 0.15)));
    g.addColorStop(1, U.hex(U.mix(accent, [0, 0, 0], 0.18)));
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, R, Math.PI * 0.82, Math.PI * 2.18);
    x.lineTo(px, py + R * 1.65);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = Math.max(1.5, R * 0.12);
    x.stroke();
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(px, py, R * 0.36, 0, Math.PI * 2); x.fill();
  }
  class Messages {
    constructor(ctx) {
      this.ctx = ctx;
      const R = (this.root = ctx.root);
      R.classList.add('m-msg');
      U.el('div', 'msg-glow', R);
      this.stageEl = U.el('div', 'msg-stage', R);
      this.wrap = U.el('div', 'msg-wrap', this.stageEl);
      this.list = U.el('div', 'msg-list', this.wrap);
      this.items = [];
      this.plan = [];
      this.scroll = null;
      this.time = 0;
      this.n1 = U.noise1(5);
      this.resize();
    }
    resize() {
      const u = this.ctx.u, W = this.ctx.W;
      const mw = Math.max(340, Math.min(W * 0.9, u * 46));
      this.root.style.setProperty('--mw', mw.toFixed(0) + 'px');
      this.root.style.setProperty('--mf', Math.max(16, Math.min(40, u * 1.85)).toFixed(1) + 'px');
    }
    onResize() { this.resize(); this.reset(); }
    onTrack() { this.reset(); }
    onArt(url, img, p) {
      this.root.style.setProperty('--mg', U.rgba(U.vivid(p.vivid, 0.6, 0.6), 0.16));
    }
    onLyrics(tl) {
      // decide each line's look once per song
      const r = this.ctx.rng('plan');
      const opts = this.ctx.opts;
      let side = 'recv', lastMap = -9;
      this.plan = tl.lines.map((L, i) => {
        const ws = L.words;
        const me = ws.filter((w) => ME.has(w.w)).length;
        if (i > 0) side = r.chance(me ? 0.55 : 0.4) ? (side === 'recv' ? 'sent' : 'recv') : side;
        if (i > 1 && this.plan && false) side = 'recv';
        const placey = ws.some((w) => PLACE_WORDS.has(w.w));
        const map = opts.maps !== false && i - lastMap > 4 && L.words.length >= 3 && !L.adlib && (placey ? r.chance(0.6) : r.chance(0.08));
        if (map) lastMap = i;
        const prev = tl.lines[i - 1];
        return {
          side: L.adlib ? 'recv' : map ? 'recv' : side,
          map,
          feat: L.adlib,
          loc: !map && !L.adlib && opts.places !== false && (placey ? r.chance(0.55) : r.chance(0.2)) ? r.pick(PLACES) : null,
          mapPlace: r.pick(PLACES),
          heart: ws.some((w) => LOVE.has(w.w)) && r.chance(0.7),
          header: i === 0 || (prev && L.t - prev.singEnd > 9),
          typing: !prev || L.t - prev.singEnd > 1.1,
        };
      });
      this.reset();
    }
    reset() {
      for (const it of this.items) U.remove(it.el);
      this.items = [];
      this.scroll = null;
      this.built = -1;
    }

    // ------------------------------------------------------------ items
    addHeader(L) {
      const el = U.el('div', 'msg-item msg-time-row', this.list);
      el.style.alignItems = 'center';
      const d = new Date();
      const tm = U.el('div', 'msg-time', el);
      tm.innerHTML = '<b>Today</b> ' + (O.hour12 ? U.fmtClockAmPm(d).toUpperCase() : U.fmtClock(d));
      this.items.push({ el, kind: 'hdr', li: L.i, born: 0 });
    }
    addLine(li, instant) {
      const L = this.ctx.tl.lines[li], P = this.plan[li];
      if (!L || !P) return null;
      if (P.header) this.addHeader(L);
      const el = U.el('div', 'msg-item ' + P.side, this.list);
      const it = { el, kind: 'line', li, L, P, words: [], born: instant ? -1 : L.t, typingEl: null, bubble: null, tap: null };
      if (P.map) {
        const card = U.el('div', 'msg-map', el);
        card.style.position = 'relative';
        U.el('div', 'mm-tag', card, 'Maps');
        const cv = U.el('canvas', '', card);
        cv.width = 1040; cv.height = 480;
        drawMap(cv, this.ctx.rng('map' + li), this.ctx.palette.vivid, P.mapPlace);
        const b = U.el('div', 'mm-b', card);
        const t = U.el('div', 'mm-t', b);
        L.words.forEach((w) => { const s = U.el('span', 'w', t, w.raw + ' '); s.style.opacity = '0.32'; it.words.push(s); });
        const sub = U.el('div', 'mm-s', b);
        sub.innerHTML = PIN + '<span></span>';
        sub.lastChild.textContent = P.mapPlace;
        it.bubble = card;
      } else {
        const b = U.el('div', 'msg-b' + (P.feat ? ' feat' : ''), el);
        L.words.forEach((w) => { const s = U.el('span', 'w', b, w.raw + ' '); it.words.push(s); });
        it.bubble = b;
        if (P.heart) { it.tap = U.el('div', 'msg-tap', b, '❤️'); }
        if (P.loc) {
          const loc = U.el('div', 'msg-loc', el);
          loc.innerHTML = PIN + '<span></span>';
          loc.lastChild.textContent = P.loc;
        }
      }
      if (P.typing && !instant) {
        it.typingEl = U.el('div', 'msg-b msg-dots', el);
        it.typingEl.innerHTML = '<i></i><i></i><i></i>';
        it.bubble.style.display = 'none';
        for (const extra of el.querySelectorAll('.msg-loc')) extra.style.display = 'none';
      }
      if (instant) for (const s of it.words) s.classList.add('on');
      this.items.push(it);
      return it;
    }
    trim() {
      while (this.items.length > 14) {
        const it = this.items.shift();
        U.remove(it.el);
        this.scrollShift = (this.scrollShift || 0) + 1;
      }
    }

    frame(t, dt, A, jumped) {
      const ctx = this.ctx, tl = ctx.tl, H = ctx.H;
      this.time += dt;
      // the line about to be sung appears a beat early as typing dots
      const lead = 0.75;
      let li = O.lineAt(tl, t + lead);
      if (jumped || li < this.built) { this.reset(); }
      if (this.built < 0 && li >= 0) {
        for (let k = Math.max(0, li - 6); k < li; k++) this.addLine(k, true);
        this.built = li - 1;
      }
      while (this.built < li) {
        this.built++;
        this.addLine(this.built, false);
        this.trim();
      }
      // animate the live items
      let newest = null;
      let lastSent = null;
      for (const it of this.items) {
        if (it.kind !== 'line') continue;
        const L = it.L;
        const age = t - (it.born < 0 ? -1e9 : L.t - lead);
        const ap = U.e('outBack', U.prog(0, 0.32, age));
        it.el.style.opacity = U.sat(ap * 1.4).toFixed(3);
        it.el.style.transform = it.born < 0 ? 'none' : `translateY(${((1 - ap) * 14).toFixed(1)}px) scale(${(0.92 + 0.08 * ap).toFixed(3)})`;
        it.el.style.transformOrigin = it.P.side === 'sent' ? '100% 100%' : '0% 100%';
        if (it.typingEl && t >= L.t - 0.06) {
          U.remove(it.typingEl);
          it.typingEl = null;
          it.bubble.style.display = '';
          for (const extra of it.el.querySelectorAll('.msg-loc')) extra.style.display = '';
          this.measure = true;
        }
        if (!it.typingEl) {
          L.words.forEach((w, k) => {
            const on = t >= w.t - 0.04;
            const s = it.words[k];
            if (s && s._on !== on) { s._on = on; s.classList.toggle('on', on); if (it.P.map) s.style.opacity = on ? '1' : '0.32'; }
          });
          if (it.tap) {
            const p = U.e('outBack', U.prog(L.singEnd, L.singEnd + 0.35, t));
            it.tap.style.transform = `scale(${p.toFixed(3)})`;
          }
        }
        newest = it;
        if (it.P.side === 'sent' && !it.P.map && !it.P.feat) lastSent = it;
      }
      // read receipt under the latest sent message
      if (this.readFor !== lastSent) {
        if (this.readEl) U.remove(this.readEl);
        this.readEl = null;
        this.readFor = lastSent;
        if (lastSent) {
          this.readEl = U.el('div', 'msg-read', lastSent.el, 'Read ' + (O.hour12 ? U.fmtClockAmPm(new Date()).toUpperCase() : U.fmtClock(new Date())));
          this.measure = true;
        }
      }
      if (this.readEl && lastSent) this.readEl.style.opacity = U.prog(lastSent.L.singEnd + 0.4, lastSent.L.singEnd + 0.8, t).toFixed(2);
      // keep the newest message at about two-thirds height
      let target = this.scroll == null ? 0 : this.scrollTarget;
      if (newest) {
        const bottom = newest.el.offsetTop + newest.el.offsetHeight;
        target = H * 0.66 - bottom;
      }
      this.scrollTarget = target;
      if (this.scroll == null) this.scroll = target;
      this.scroll = U.damp(this.scroll, target, 7, dt);
      this.list.style.transform = `translateY(${this.scroll.toFixed(1)}px)`;
      const T = this.time;
      this.wrap.style.transform = `rotateY(${(this.n1(T * 0.07) * 5 - 3).toFixed(2)}deg) rotateX(${(this.n1(T * 0.05 + 7) * 3 + 2).toFixed(2)}deg) translateZ(${(A.pulse * 8).toFixed(1)}px)`;
    }
    destroy() {}
  }
  O.registerMode('messages', Messages, { label: 'Messages', glow: true });
})();
