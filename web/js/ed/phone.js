/* Editlyric scenes — phone screens. Each line plays out on a realistic phone that is either floating,
   lying on a table, or filmed as a close-up that follows the action: typing on the keyboard, lock-screen
   notifications, an incoming call, an alert, search, a checklist, a story, a voice memo, navigation,
   weather, a timer, a post and a passcode. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-phone', `
.m-ed .ph-ui { font-family: 'Oley Sans', sans-serif; }
.m-ed .pu-abs { position: absolute; }
.m-ed .pu-hdr { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; }
.m-ed .pu-card { position: absolute; overflow: hidden; }
.m-ed .pu-frost { background: rgba(246,246,248,0.74); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6); color: #111; }
.m-ed .pu-frost.dk { background: rgba(40,40,44,0.62); color: #fff; }
.m-ed .pu-btn { position: absolute; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.m-ed .pu-row { position: absolute; left: 0; right: 0; display: flex; align-items: center; }
.m-ed .pu-hair { position: absolute; height: 1px; background: rgba(128,128,128,0.25); }
.m-ed .pu-sticker { display: inline-block; padding: 0.12em 0.34em 0.16em; border-radius: 0.28em; margin: 0.08em 0.06em; font-weight: 700; will-change: transform, opacity; }
.m-ed .pu-key { position: absolute; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; line-height: 1; }
.m-ed .pu-key b { font-weight: 400; } .m-ed .pu-key small { font-weight: 600; letter-spacing: 0.12em; opacity: 0.85; }
`);

  // ---------------------------------------------------------------- base: a phone with a screen to draw on
  class PhoneShot extends Shot {
    constructor(host, mode, L, o, cfg) {
      super(host, mode, L, o);
      cfg = cfg || {};
      this.uiDark = cfg.dark != null ? !!cfg.dark : !!o.dark;
      this.P = K.phone(this, { pres: o.pres || this.r.pick(['float', 'desk', 'close']) });
      this.ui = this.P.ui; this.su = this.P.su; this.sw = this.P.sw; this.sh = this.P.sh;
      this.ui.style.background = cfg.bg || (this.uiDark ? '#000' : '#f2f2f7');
      this.ui.style.color = this.uiDark ? '#fff' : '#111';
      this.dark = this.P.pres === 'close' ? this.uiDark : true;
      if (cfg.status !== false) this.sb = K.statusBar(this.P, cfg.sbDark != null ? cfg.sbDark : this.uiDark, cfg.sbo);
      this.blue = this.uiDark ? '#0a84ff' : '#007aff';
    }
    abs(cls, x, y, w, h, parent) {
      const e = U.el('div', 'pu-abs' + (cls ? ' ' + cls : ''), parent || this.ui);
      const su = this.su;
      if (x != null) e.style.left = x * su + 'px';
      if (y != null) e.style.top = y * su + 'px';
      if (w != null) e.style.width = w * su + 'px';
      if (h != null) e.style.height = h * su + 'px';
      return e;
    }
    fs(el, s, weight) { el.style.fontSize = s * this.su + 'px'; if (weight) el.style.fontWeight = weight; return el; }
    caretAt(car) { const p = K.off(car, this.ui); return { x: p.x, y: p.y + p.h / 2 }; }
  }
  Ed.PhoneShot = PhoneShot;
  const PH = { fam: 'phone', cams: ['still', 'push', 'drift', 'track', 'hand'] };
  const NEG = new Set("never no not don't dont can't cant won't wont nothing nobody stop leave gone lost".split(' '));
  const hasNeg = (L) => L.words.some((w) => NEG.has(w.w));

  // ================================================================ 1. typing on the keyboard (note / message / post caption)
  class Keys extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: o.dark, bg: o.dark ? '#000' : '#fff' });
      const su = this.su, sw = this.sw, ui = this.ui, r = this.r, dark = this.uiDark;
      this.kind = this.v % 3;
      this.kb = K.keyboard(ui, sw, su, dark, { retBlue: this.kind === 1, ret: this.kind === 1 ? '<span style="font-size:0.62em">send</span>' : null });
      this.press = K.typist(this.kb);
      const kbTop = this.sh - this.kb.h;
      this.typos = K.pickTypos(this.ws, r, this.ctx.opts.typos !== false, 0.45);
      const acc = this.kind === 0 ? '#e3a008' : this.blue;
      ui.style.setProperty('--caret', acc);
      if (this.kind === 0) {
        const h = this.abs('pu-hdr', 0, 12, 100, 9);
        h.style.padding = `0 ${su * 4}px`; h.style.color = acc; this.fs(h, 4.3, 500);
        h.innerHTML = `<span>${K.icon('chevL')} Notes</span><span style="font-weight:600">Done</span>`;
        const d = this.abs('', 0, 23, 100); d.style.textAlign = 'center'; d.style.color = '#8e8e93'; this.fs(d, 3.1, 500);
        d.textContent = U.fmtDateLong(K.now());
        this.box = this.abs('', 6, 30, 88); this.fs(this.box, 7, 700); this.box.style.lineHeight = '1.18'; this.box.style.letterSpacing = '-0.01em';
      } else if (this.kind === 1) {
        const hd = this.abs('', 0, 11, 100, 22); hd.style.textAlign = 'center';
        hd.style.borderBottom = '1px solid ' + (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
        hd.style.background = dark ? 'rgba(28,28,30,0.9)' : 'rgba(249,249,249,0.94)';
        const av = this.abs('', 43, 1.5, 14, 14, hd); av.style.borderRadius = '50%'; av.style.overflow = 'hidden';
        K.cover(this, av);
        const nm = this.abs('', 0, 16.5, 100, null, hd); this.fs(nm, 3, 500); nm.style.textAlign = 'center';
        nm.textContent = (U.firstName(this.ctx.track && this.ctx.track.artist) || 'Unknown') + ' ›';
        const ts = this.abs('', 0, 37, 100); ts.style.textAlign = 'center'; ts.style.color = '#8e8e93'; this.fs(ts, 2.9, 500);
        ts.textContent = 'Today ' + K.clock(K.now());
        this.thread = this.abs('', 0, 44, 100);
        this.field = this.abs('', 14, 0, 74); this.field.style.top = kbTop - su * 12.5 + 'px';
        Object.assign(this.field.style, { minHeight: su * 9.4 + 'px', borderRadius: su * 5 + 'px', border: '1px solid ' + (dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'), padding: `${su * 2}px ${su * 11}px ${su * 2}px ${su * 3.6}px`, boxSizing: 'border-box', lineHeight: '1.25' });
        this.fs(this.field, 4.3, 400);
        const plus = this.abs('', 3, 0, 9, 9); plus.style.top = kbTop - su * 12.3 + 'px'; plus.style.borderRadius = '50%';
        plus.style.background = dark ? '#2c2c2e' : '#e9e9eb'; plus.style.display = 'grid'; plus.style.placeItems = 'center'; plus.style.color = '#8e8e93'; this.fs(plus, 5);
        plus.innerHTML = K.icon('plus');
        this.box = U.el('div', '', this.field);
        this.send = this.abs('', 0, 0, 7.4, 7.4, this.field);
        Object.assign(this.send.style, { right: su * 1 + 'px', left: 'auto', bottom: su * 0.9 + 'px', top: 'auto', borderRadius: '50%', background: this.blue, color: '#fff', display: 'grid', placeItems: 'center', fontSize: su * 4.4 + 'px', opacity: '0' });
        this.send.innerHTML = K.icon('up');
        this.sent = this.abs('', 0, 0); this.sent.style.display = 'none';
        Object.assign(this.sent.style, { right: su * 4 + 'px', left: 'auto', maxWidth: su * 72 + 'px', background: this.blue, color: '#fff', borderRadius: su * 5 + 'px', padding: `${su * 2.2}px ${su * 3.6}px`, lineHeight: '1.25' });
        this.fs(this.sent, 4.3, 400);
      } else {
        const h = this.abs('pu-hdr', 0, 12, 100, 9); h.style.padding = `0 ${su * 4}px`; this.fs(h, 4.3, 600);
        h.innerHTML = `<span>${K.icon('chevL')}</span><span>New post</span><span style="color:${this.blue}">Share</span>`;
        const th = this.abs('', 4, 26, 24, 24); th.style.borderRadius = su * 1.5 + 'px'; th.style.overflow = 'hidden'; K.cover(this, th);
        this.box = this.abs('', 32, 26, 64); this.fs(this.box, 4.6, 400); this.box.style.lineHeight = '1.3';
        const rows = ['Tag people', 'Add location', 'Add music'];
        rows.forEach((s, i) => {
          const rw = this.abs('pu-row', 0, 58 + i * 11, 100, 11); rw.style.padding = `0 ${su * 4}px`; rw.style.justifyContent = 'space-between'; this.fs(rw, 4, 400);
          rw.style.borderTop = '1px solid ' + (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
          rw.innerHTML = `<span>${s}</span><span style="opacity:0.4">${K.icon('chevR')}</span>`;
        });
      }
      this.ty = K.typer(this.box, this.ws, this.typos);
      this.tap = K.tap(ui, su * 12, !dark);
    }
    update(t, dt) {
      const L = this.L, su = this.su;
      let st = { s: '', cur: -1 };
      const sending = this.kind === 1 && t > L.singEnd + Math.min(0.25, this.tail * 0.35);
      if (!sending) st = this.ty.update(t);
      this.press(st.s, t);
      this.kb.update(t);
      // suggestions follow the word being typed
      const w = st.cur >= 0 ? this.ws[st.cur] : null;
      const part = st.s.slice(st.s.lastIndexOf(' ') + 1);
      let sg = ['I', 'The', 'I’m'];
      if (w && part && part.length < K.bare(w).length) { const full = K.bare(w); sg = ['“' + part + '”', full, full.length > 3 ? K.cap(full) + 's' : full + '!']; }
      else if (w) { const f = K.bare(w); sg = [f, f + ',', f + '…']; }
      const key = sg.join('|');
      if (key !== this._sg) { this._sg = key; this.kb.slots.forEach((s, i) => { s.textContent = sg[i]; s.style.fontWeight = i === 1 && w ? '600' : '400'; }); }
      if (this.kind === 1) {
        this.send.style.opacity = st.s && !sending ? '1' : '0';
        if (sending) {
          if (!this._sentT) {
            this._sentT = t;
            this.sent.textContent = K.text(L);
            this.sent.style.display = '';
            this.box.style.visibility = 'hidden';
            const sp = K.off(this.send, this.ui);
            this.tap.fire(t, sp.x + sp.w / 2, sp.y + sp.h / 2);
          }
          const k = U.e('outBack', U.prog(this._sentT, this._sentT + Math.min(0.42, this.tail), t));
          const fy = parseFloat(this.field.style.top), ty = this.thread.offsetTop + su * 2;
          this.sent.style.top = U.lerp(fy, ty, k).toFixed(1) + 'px';
          this.sent.style.transform = `scale(${(0.86 + 0.14 * k).toFixed(3)})`;
          this.sent.style.transformOrigin = '100% 100%';
        }
      }
      this.tap.update(t);
      void dt;
    }
    sfocus() { return this.kind === 1 && this._sentT ? { x: this.sw * 0.6, y: this.thread.offsetTop + this.su * 8 } : this.caretAt(this.ty.car); }
  }
  Ed.add('keys', Keys, Object.assign({ w: 1.3, max: 16, vars: 3, trig: 'type typing text texting write wrote say tell message' }, PH));

  // ================================================================ 2. lock screen notifications
  class Lock extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#000' });
      const su = this.su, ui = this.ui;
      const wp = this.abs('', 0, 0, 100, 216.5);
      this.wp = K.cover(this, wp, 'transform:scale(1.12)');
      const g = this.abs('', 0, 0, 100, 216.5); g.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 35%, rgba(0,0,0,0.45))';
      const lk = this.abs('', 46, 13.5, 8, 8); lk.style.color = '#fff'; this.fs(lk, 5); lk.innerHTML = K.icon('lock');
      const dt = this.abs('', 0, 24, 100); dt.style.textAlign = 'center'; dt.style.color = '#fff'; this.fs(dt, 4.4, 600);
      dt.textContent = K.now().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
      const ck = this.abs('', 0, 29, 100); ck.style.textAlign = 'center'; ck.style.color = '#fff'; ck.style.fontFamily = "'Oley Display', sans-serif"; this.fs(ck, 24, 600);
      ck.style.letterSpacing = '-0.03em'; ck.style.lineHeight = '1.05';
      ck.textContent = K.clock(K.now());
      const n = U.clamp(Math.round(this.ws.length / 3), 1, 4);
      this.chunks = K.chunks(L, n);
      const tr = this.ctx.track || {};
      const who = this.v % 2 ? (U.firstName(tr.artist) || 'Unknown') : (tr.artist || 'Unknown');
      const app = this.r.pick(['Messages', 'Messages', 'Mail', 'Reminders']);
      const icon = app === 'Mail' ? 'mail' : app === 'Reminders' ? 'check' : 'chat';
      const acc = K.accent(this);
      this.cards = this.chunks.map((c, i) => {
        const cd = this.abs('pu-card pu-frost', 3.5, 0, 93);
        Object.assign(cd.style, { borderRadius: su * 5.4 + 'px', padding: `${su * 3}px ${su * 3.6}px`, boxSizing: 'border-box', opacity: '0', boxShadow: '0 1px 0 rgba(0,0,0,0.05)' });
        const row = U.el('div', '', cd);
        Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: su * 2.2 + 'px', fontSize: su * 3.1 + 'px', color: 'rgba(0,0,0,0.55)', fontWeight: 500 });
        const ic = U.el('div', '', row);
        Object.assign(ic.style, { width: su * 6.6 + 'px', height: su * 6.6 + 'px', borderRadius: su * 1.6 + 'px', display: 'grid', placeItems: 'center', color: '#fff', fontSize: su * 4 + 'px', background: `linear-gradient(180deg, ${U.hex(U.shiftHue(U.parseHex(acc), 0, 0.8, 1.15))}, ${acc})`, flex: 'none' });
        ic.innerHTML = K.icon(icon);
        const ap = U.el('span', '', row, app.toUpperCase()); ap.style.flex = '1'; ap.style.letterSpacing = '0.04em';
        U.el('span', '', row, i === this.chunks.length - 1 ? 'now' : 'now');
        const ti = U.el('div', '', cd, who);
        Object.assign(ti.style, { fontWeight: 600, fontSize: su * 3.9 + 'px', marginTop: su * 1.8 + 'px' });
        const body = U.el('div', '', cd);
        Object.assign(body.style, { fontSize: su * 3.9 + 'px', lineHeight: '1.3', marginTop: su * 0.4 + 'px' });
        const words = K.wordEls(body, c.words);
        return { cd, c, words, y: O.sp(0), h: 0, on: false };
      });
      const fl = (x, ic) => { const b = this.abs('pu-btn pu-frost dk', x, 192, 12.5, 12.5); this.fs(b, 5.2); b.innerHTML = K.icon(ic); };
      fl(9, 'bolt'); fl(78.5, 'cam');
    }
    update(t, dt) {
      const su = this.su;
      let y = 70 * su;
      const vis = this.cards.filter((c) => t >= c.c.t - 0.14).reverse();
      for (const c of this.cards) {
        const on = t >= c.c.t - 0.14;
        if (!on) { c.cd.style.opacity = '0'; continue; }
        if (!c.on) { c.on = true; c.y.x = 52 * su; c.t0 = t; }
        K.wordAnim(c.words, t, 0.2);
      }
      for (const c of vis) {
        c.h = c.cd.offsetHeight || 20 * su;
        O.spring(c.y, y, 15, dt);
        const k = U.e('outCubic', U.prog(c.t0, c.t0 + 0.3, t));
        c.cd.style.top = c.y.x.toFixed(1) + 'px';
        c.cd.style.opacity = U.sat(k * 1.6).toFixed(3);
        c.cd.style.transform = `scale(${(0.92 + 0.08 * k).toFixed(4)})`;
        y += c.h + 2.2 * su;
      }
      this.wp.style.transform = `scale(${(1.12 + this.age * 0.006).toFixed(4)})`;
    }
    sfocus() { const c = this.cards.filter((x) => x.on).pop(); return c ? { x: this.sw / 2, y: c.y.x + c.h / 2 } : { x: this.sw / 2, y: 45 * this.su }; }
  }
  Ed.add('lock', Lock, Object.assign({ w: 1.2, min: 2, max: 18, vars: 2, trig: 'phone message text texts notification night tonight call missed' }, PH));

  // ================================================================ 3. incoming call: the line is who's calling
  class Call extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#111' });
      const su = this.su;
      const bg = this.abs('', 0, 0, 100, 216.5); K.blurCover(this, bg, su * 9, 'opacity:0.9');
      const g = this.abs('', 0, 0, 100, 216.5); g.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.7))';
      const sm = this.abs('', 0, 22, 100); sm.style.textAlign = 'center'; sm.style.color = 'rgba(255,255,255,0.7)'; this.fs(sm, 3.6, 500);
      sm.textContent = 'incoming call…';
      this.sm = sm;
      this.name = this.abs('', 7, 28, 86); this.name.style.textAlign = 'center'; this.name.style.color = '#fff'; this.fs(this.name, 8.2, 500);
      this.name.style.lineHeight = '1.12'; this.name.style.letterSpacing = '-0.02em';
      this.words = K.wordEls(this.name, this.ws);
      this.sub = this.abs('', 0, 0, 100); this.sub.style.textAlign = 'center'; this.sub.style.color = 'rgba(255,255,255,0.6)'; this.fs(this.sub, 3.6, 500);
      this.sub.textContent = 'mobile';
      this.rings = [0, 1, 2].map(() => { const r = this.abs('', 31, 98, 38, 38); r.style.borderRadius = '50%'; r.style.border = `${su * 0.5}px solid rgba(255,255,255,0.5)`; return r; });
      this.av = this.abs('', 31, 98, 38, 38); this.av.style.borderRadius = '50%'; this.av.style.overflow = 'hidden'; this.av.style.boxShadow = '0 1vmin 4vmin rgba(0,0,0,0.4)';
      K.cover(this, this.av);
      const small = (x, ic, lab) => { const b = this.abs('', x, 152, 20); b.style.textAlign = 'center'; b.style.color = '#fff'; this.fs(b, 2.9, 500); b.innerHTML = `<div style="font-size:2em;margin-bottom:0.3em">${K.icon(ic)}</div>${lab}`; };
      small(12, 'clock', 'Remind Me'); small(68, 'chat', 'Message');
      const btn = (x, col, rot, lab) => {
        const b = this.abs('pu-btn', x, 176, 18, 18); b.style.background = col; this.fs(b, 8);
        b.innerHTML = `<span style="display:inline-block;transform:rotate(${rot}deg)">${K.icon('phone')}</span>`;
        const l = this.abs('', x - 4, 197, 26); l.style.textAlign = 'center'; l.style.color = '#fff'; this.fs(l, 3.3, 500); l.textContent = lab;
        return { b, l };
      };
      this.dec = btn(13, '#eb4d3d', 135, 'Decline');
      this.acc = btn(69, '#30c85a', 0, 'Accept');
      this.neg = hasNeg(L);
      this.tap = K.tap(this.ui, su * 22);
    }
    update(t, dt, A) {
      const L = this.L, su = this.su;
      K.wordAnim(this.words, t, 0.25);
      this.sub.style.top = this.name.offsetTop + this.name.offsetHeight + su * 1.5 + 'px';
      const a = this.age;
      this.rings.forEach((r, i) => {
        const k = ((a * 0.7 + i / 3) % 1);
        r.style.transform = `scale(${(1 + k * 0.75 + A.pulse * 0.03).toFixed(3)})`;
        r.style.opacity = ((1 - k) * 0.55).toFixed(3);
      });
      const end = L.singEnd + 0.2;
      if (t >= end && !this._tp) {
        this._tp = true;
        const b = this.neg ? this.dec.b : this.acc.b;
        const p = K.off(b, this.ui);
        this.tap.fire(t, p.x + p.w / 2, p.y + p.h / 2);
      }
      if (this._tp) {
        const k = U.e('inOutCubic', U.prog(end + 0.1, end + 0.5, t));
        if (this.neg) {
          this.acc.b.style.opacity = this.acc.l.style.opacity = (1 - k).toFixed(3);
          this.sm.textContent = k > 0.5 ? 'call ended' : 'incoming call…';
        } else {
          this.dec.b.style.opacity = this.dec.l.style.opacity = (1 - k).toFixed(3);
          this.acc.l.style.opacity = (1 - k).toFixed(3);
          this.acc.b.style.left = U.lerp(69, 41, k) * su + 'px';
          this.acc.b.style.background = k > 0.5 ? '#eb4d3d' : '#30c85a';
          this.acc.b.firstChild.style.transform = `rotate(${(k * 135).toFixed(1)}deg)`;
          const s = Math.max(0, t - end - 0.4);
          this.sm.textContent = k > 0.5 ? '00:' + ('0' + Math.floor(s)).slice(-2) : 'incoming call…';
        }
      }
      this.tap.update(t);
      void dt;
    }
    sfocus() { return { x: this.sw / 2, y: this.name.offsetTop + this.name.offsetHeight / 2 }; }
  }
  Ed.add('call', Call, Object.assign({ w: 0.9, max: 14, needTrig: true, trig: 'call calling called phone ring ringing answer hello pick hear voice line' }, PH));

  // ================================================================ 4. an alert / an action sheet
  class Alert extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: o.dark, bg: o.dark ? '#000' : '#f2f2f7' });
      const su = this.su, dark = this.uiDark;
      // the app behind: a photo grid of the cover
      const grid = this.abs('', 0, 11, 100, 205);
      for (let i = 0; i < 18; i++) {
        const c = this.abs('', (i % 3) * 33.6, Math.floor(i / 3) * 33.6, 33.2, 33.2, grid); c.style.overflow = 'hidden';
        K.cover(this, c, `transform:scale(${1.4 + (i % 4) * 0.3}) translate(${((i * 37) % 30) - 15}%,${((i * 23) % 30) - 15}%);filter:hue-rotate(${(i * 25) % 60 - 30}deg) saturate(${0.8 + (i % 3) * 0.2})`);
      }
      this.dim = this.abs('', 0, 0, 100, 216.5); this.dim.style.background = 'rgba(0,0,0,0.4)'; this.dim.style.opacity = '0';
      const kw = K.bare(K.key(L));
      const ks = new Set(L.words.map((w) => w.w));
      this.action = ks.has('delete') || ks.has('erase') ? 'Delete' : ks.has('leave') || ks.has('leaving') ? 'Leave' : ks.has('stay') ? 'Stay' : ks.has('go') ? 'Go' : hasNeg(L) ? 'Don’t Allow' : 'OK';
      this.sheet = this.v % 2 === 1 && this.ws.length >= 4;
      const accent = this.action === 'Delete' || this.action === 'Leave' ? '#ff3b30' : this.blue;
      const card = (cls) => { const c = this.abs('pu-card pu-frost' + (dark ? ' dk' : ''), 0, 0); c.className += cls ? ' ' + cls : ''; return c; };
      if (!this.sheet) {
        this.box = card(); Object.assign(this.box.style, { left: 14 * su + 'px', width: 72 * su + 'px', borderRadius: su * 4.4 + 'px', textAlign: 'center' });
        const ti = U.el('div', '', this.box, K.cap(kw) + (L.text.includes('?') ? '?' : ''));
        Object.assign(ti.style, { fontWeight: 600, fontSize: su * 4.3 + 'px', padding: `${su * 4.6}px ${su * 4}px 0` });
        const ms = U.el('div', '', this.box);
        Object.assign(ms.style, { fontSize: su * 3.6 + 'px', lineHeight: '1.32', padding: `${su * 1.2}px ${su * 4.4}px ${su * 4.4}px` });
        this.words = K.wordEls(ms, this.ws);
        const bt = U.el('div', '', this.box);
        Object.assign(bt.style, { display: 'flex', borderTop: '1px solid rgba(128,128,128,0.3)', fontSize: su * 4.2 + 'px' });
        const b1 = U.el('div', '', bt, 'Cancel'); b1.style.cssText = `flex:1;padding:${su * 3}px 0;color:${this.blue};border-right:1px solid rgba(128,128,128,0.3)`;
        this.btn = U.el('div', '', bt, this.action); this.btn.style.cssText = `flex:1;padding:${su * 3}px 0;color:${accent};font-weight:600`;
        this.box.style.top = 90 * su + 'px';
      } else {
        this.chunks = K.chunks(L, U.clamp(Math.round(this.ws.length / 2.5), 2, 4));
        this.box = card(); Object.assign(this.box.style, { left: 3 * su + 'px', width: 94 * su + 'px', borderRadius: su * 4 + 'px', textAlign: 'center' });
        const ti = U.el('div', '', this.box, (this.ctx.track && this.ctx.track.title) || 'Choose');
        Object.assign(ti.style, { fontSize: su * 3.2 + 'px', color: '#8e8e93', fontWeight: 500, padding: `${su * 3.4}px ${su * 4}px` });
        this.opts = this.chunks.map((c) => {
          const rw = U.el('div', '', this.box);
          Object.assign(rw.style, { borderTop: '1px solid rgba(128,128,128,0.28)', padding: `${su * 3.7}px ${su * 3}px`, fontSize: su * 4.6 + 'px', color: this.blue });
          return { rw, c, words: K.wordEls(rw, c.words) };
        });
        const cb = this.abs('pu-card pu-frost' + (dark ? ' dk' : ''), 3, 0, 94);
        Object.assign(cb.style, { borderRadius: su * 4 + 'px', textAlign: 'center', padding: `${su * 3.7}px 0`, fontSize: su * 4.6 + 'px', fontWeight: 600, color: this.blue, bottom: su * 5 + 'px', top: 'auto' });
        cb.textContent = 'Cancel';
        this.cancel = cb;
        this.box.style.bottom = su * 20 + 'px'; this.box.style.top = 'auto';
        this.btn = this.opts[this.opts.length - 1].rw;
      }
      this.tap = K.tap(this.ui, su * 14, !dark);
    }
    update(t, dt) {
      const L = this.L;
      const k = U.prog(L.t - 0.22, L.t + 0.12, t);
      this.dim.style.opacity = k.toFixed(3);
      const end = L.singEnd + 0.22, out = U.e('inCubic', U.prog(end + 0.25, end + 0.5, t));
      if (!this.sheet) {
        const e = U.e('outCubic', k);
        this.box.style.opacity = (U.sat(k * 2) * (1 - out)).toFixed(3);
        this.box.style.transform = `scale(${(1.16 - 0.16 * e - 0.06 * out).toFixed(4)})`;
        K.wordAnim(this.words, t, 0.2);
      } else {
        const e = U.e('outCubic', k);
        const off = (1 - e + out) * 100;
        this.box.style.transform = `translateY(${off.toFixed(2)}%)`;
        this.cancel.style.transform = `translateY(${(off * 2).toFixed(2)}%)`;
        for (const o of this.opts) K.wordAnim(o.words, t, 0.2);
      }
      if (t >= end && !this._tp) {
        this._tp = true;
        const p = K.off(this.btn, this.ui);
        this.btn.style.background = 'rgba(128,128,128,0.25)';
        this.tap.fire(t, p.x + p.w / 2, p.y + p.h / 2);
      }
      this.tap.update(t);
      void dt;
    }
    sfocus() { const p = K.off(this.box, this.ui); return { x: this.sw / 2, y: p.y + p.h / 2 }; }
  }
  Ed.add('alert', Alert, Object.assign({ w: 1.1, max: 16, vars: 2, trig: 'sure delete leave stay allow wait stop really should ready choose decide ok okay' }, PH));

  // ================================================================ 5. search with suggestions
  class Search extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: o.dark, bg: o.dark ? '#000' : '#fff' });
      const su = this.su, dark = this.uiDark;
      this.kb = K.keyboard(this.ui, this.sw, su, dark, { retBlue: true, ret: '<span style="font-size:0.62em">search</span>' });
      this.press = K.typist(this.kb);
      const f = this.abs('', 4, 14, 76, 11);
      Object.assign(f.style, { borderRadius: su * 3 + 'px', background: dark ? '#1c1c1e' : '#ececf0', display: 'flex', alignItems: 'center', gap: su * 2 + 'px', padding: `0 ${su * 3}px`, boxSizing: 'border-box', overflow: 'hidden', whiteSpace: 'nowrap' });
      this.fs(f, 4.5, 400);
      const ic = U.el('span', '', f); ic.innerHTML = K.icon('search'); ic.style.color = '#8e8e93';
      const tb = U.el('span', '', f); tb.style.flex = '1'; tb.style.overflow = 'hidden'; tb.style.direction = 'rtl'; tb.style.textAlign = 'left';
      const inner = U.el('span', '', tb); inner.style.direction = 'ltr'; inner.style.unicodeBidi = 'plaintext';
      this.field = f;
      const cn = this.abs('', 82, 16.5, 16); cn.style.color = this.blue; this.fs(cn, 4.1, 400); cn.textContent = 'Cancel';
      this.typos = K.pickTypos(this.ws, this.r, this.ctx.opts.typos !== false, 0.5);
      this.ui.style.setProperty('--caret', this.blue);
      this.ty = K.typer(inner, this.ws, this.typos);
      this.list = this.abs('', 0, 29, 100);
      const tr = this.ctx.track || {};
      this.suffix = [' lyrics', ' meaning', ' ' + (tr.artist || 'song').toLowerCase(), ' song', ' remix', ' slowed'];
      this.rows = [0, 1, 2, 3, 4].map(() => {
        const rw = U.el('div', '', this.list);
        Object.assign(rw.style, { display: 'flex', alignItems: 'center', gap: su * 3 + 'px', padding: `${su * 2.6}px ${su * 4.4}px`, fontSize: su * 4.2 + 'px', borderBottom: '1px solid ' + (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), whiteSpace: 'nowrap', overflow: 'hidden' });
        const i2 = U.el('span', '', rw); i2.innerHTML = K.icon('search'); i2.style.color = '#8e8e93';
        const tx = U.el('span', '', rw); tx.style.overflow = 'hidden'; tx.style.textOverflow = 'ellipsis';
        return { rw, tx };
      });
      // the "result" once it's all typed
      this.res = this.abs('', 4, 31, 92);
      Object.assign(this.res.style, { display: 'flex', gap: su * 3.6 + 'px', alignItems: 'center', opacity: '0', padding: su * 3 + 'px', borderRadius: su * 4 + 'px', background: dark ? '#1c1c1e' : '#f2f2f6', boxSizing: 'border-box' });
      const th = U.el('div', '', this.res); Object.assign(th.style, { position: 'relative', width: su * 20 + 'px', height: su * 20 + 'px', borderRadius: su * 2 + 'px', overflow: 'hidden', flex: 'none' }); K.cover(this, th);
      const inf = U.el('div', '', this.res);
      inf.innerHTML = `<div style="font-size:${su * 2.8}px;color:#8e8e93;font-weight:600;letter-spacing:0.05em">TOP HIT</div><div style="font-size:${su * 4.6}px;font-weight:700;margin-top:0.2em">${K.esc(tr.title || 'Song')}</div><div style="font-size:${su * 3.4}px;opacity:0.6">Song · ${K.esc(tr.artist || '')}</div>`;
      this.tap = K.tap(this.ui, su * 14, !dark);
    }
    update(t, dt) {
      const L = this.L, su = this.su;
      const st = this.ty.update(t);
      this.press(st.s, t);
      this.kb.update(t);
      const typed = st.s.toLowerCase();
      const done = t > L.singEnd + 0.3;
      const key = typed + (done ? '#' : '');
      if (key !== this._k) {
        this._k = key;
        this.rows.forEach((r, i) => {
          const show = typed.length >= 2 && !done;
          r.rw.style.display = show ? 'flex' : 'none';
          if (show) r.tx.innerHTML = K.esc(typed) + '<b>' + K.esc(this.suffix[i]) + '</b>';
        });
      }
      if (t > L.singEnd + 0.12 && !this._tp) { this._tp = true; const p = this.kb.keyAt('\n'); this.kb.press('\n', t); this.tap.fire(t, p.x + p.w / 2, this.sh - this.kb.h + p.y + this.kb.rowH * 0.45); }
      const k = U.e('outCubic', U.prog(L.singEnd + 0.3, L.singEnd + 0.6, t));
      this.res.style.opacity = k.toFixed(3);
      this.res.style.transform = `translateY(${((1 - k) * su * 4).toFixed(1)}px)`;
      this.tap.update(t);
      void dt;
    }
    sfocus() { return this.caretAt(this.ty.car); }
  }
  Ed.add('search', Search, Object.assign({ w: 1.1, max: 12, trig: 'why how what where who search find know looking question answer wonder' }, PH));

  // ================================================================ 6. a checklist that ticks itself off
  class Todo extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: o.dark, bg: o.dark ? '#000' : '#fff' });
      const su = this.su, dark = this.uiDark;
      this.acc = K.accent(this, 0.6, 0.9);
      const back = this.abs('', 3, 12.5, 40); back.style.color = this.blue; this.fs(back, 4.2, 400); back.innerHTML = K.icon('chevL') + ' Lists';
      const ti = this.abs('', 5, 23, 70); ti.style.color = this.acc; this.fs(ti, 8.4, 700); ti.style.letterSpacing = '-0.02em';
      ti.textContent = this.v % 2 ? 'Today' : K.cap(K.clean(K.bare(K.key(this.L))).toLowerCase()) || 'Today';
      this.cnt = this.abs('', 75, 23, 20); this.cnt.style.textAlign = 'right'; this.cnt.style.color = this.acc; this.fs(this.cnt, 8.4, 700);
      const n = U.clamp(Math.round(this.ws.length / 2.6), 2, 5);
      this.chunks = K.chunks(L, n);
      this.rows = this.chunks.map((c, i) => {
        const rw = this.abs('', 0, 40 + i * 17, 100);
        Object.assign(rw.style, { display: 'flex', alignItems: 'flex-start', gap: su * 3.4 + 'px', padding: `${su * 3}px ${su * 5}px ${su * 3}px`, boxSizing: 'border-box', opacity: '0' });
        const ck = U.el('div', '', rw);
        Object.assign(ck.style, { width: su * 6 + 'px', height: su * 6 + 'px', borderRadius: '50%', border: `${su * 0.45}px solid ${dark ? '#48484a' : '#c7c7cc'}`, flex: 'none', display: 'grid', placeItems: 'center', boxSizing: 'border-box', color: '#fff', fontSize: su * 3.6 + 'px', marginTop: su * 0.3 + 'px' });
        const tx = U.el('div', '', rw);
        Object.assign(tx.style, { position: 'relative', fontSize: su * 4.9 + 'px', lineHeight: '1.25', flex: '1', paddingBottom: su * 3 + 'px', borderBottom: '1px solid ' + (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') });
        const words = K.wordEls(tx, c.words);
        const strike = U.el('div', '', tx);
        Object.assign(strike.style, { position: 'absolute', left: 0, top: '0.68em', height: su * 0.35 + 'px', background: 'currentColor', width: '0', opacity: '0.6' });
        return { rw, ck, tx, words, strike, c, done: false };
      });
      this.tap = K.tap(this.ui, su * 12, !dark);
    }
    update(t, dt) {
      let done = 0, y = 40 * this.su;
      for (const R of this.rows) {
        const k = U.e('outCubic', U.prog(R.c.t - 0.15, R.c.t + 0.15, t));
        R.rw.style.opacity = k.toFixed(3);
        R.rw.style.top = y + 'px';
        y += R.rw.offsetHeight;
        K.wordAnim(R.words, t, 0.2);
        const dt2 = R.c.end + 0.05;
        const p = U.prog(dt2, dt2 + 0.3, t);
        if (p > 0 && !R.done) {
          R.done = true;
          R.ck.style.background = this.acc; R.ck.style.borderColor = this.acc;
          R.ck.innerHTML = K.icon('check');
          const q = K.off(R.ck, this.ui); this.tap.fire(t, q.x + q.w / 2, q.y + q.h / 2);
        }
        if (R.done) {
          done++;
          R.ck.style.transform = `scale(${(0.7 + 0.3 * U.e('outBack', p)).toFixed(3)})`;
          if (this.v % 2 === 0) { R.strike.style.width = (U.e('inOutCubic', p) * Math.min(100, (R.tx.scrollWidth / Math.max(1, R.tx.offsetWidth)) * 100)).toFixed(1) + '%'; R.tx.style.opacity = (1 - 0.45 * p).toFixed(3); }
        }
      }
      const s = String(this.rows.length - done);
      if (s !== this._c) { this._c = s; this.cnt.textContent = s; }
      this.tap.update(t);
      void dt;
    }
    sfocus(t) { const R = this.rows.filter((x) => t >= x.c.t - 0.15).pop() || this.rows[0]; const p = K.off(R.rw, this.ui); return { x: this.sw / 2, y: p.y + p.h / 2 }; }
  }
  Ed.add('todo', Todo, Object.assign({ w: 1, min: 3, max: 20, vars: 2, trig: 'remember forget list need gotta promise again every everything things' }, PH));

  // ================================================================ 7. a story with text stickers
  class Story extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#000', sbDark: true });
      const su = this.su, r = this.r;
      const bg = this.abs('', 0, 0, 100, 216.5); bg.style.overflow = 'hidden';
      this.img = K.cover(this, bg, 'transform-origin:50% 50%');
      const g = this.abs('', 0, 0, 100, 216.5); g.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0) 22%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.5))';
      const segs = this.abs('', 3, 12, 94, 1);
      Object.assign(segs.style, { display: 'flex', gap: su * 1 + 'px' });
      const N = r.int(3, 6), cur = r.int(0, N - 1);
      this.segs = [];
      for (let i = 0; i < N; i++) {
        const s = U.el('div', '', segs); Object.assign(s.style, { flex: '1', height: su * 0.7 + 'px', borderRadius: '99px', background: 'rgba(255,255,255,0.35)', overflow: 'hidden', position: 'relative' });
        const f = U.el('div', '', s); Object.assign(f.style, { position: 'absolute', left: 0, top: 0, bottom: 0, background: '#fff', width: i < cur ? '100%' : '0' });
        if (i === cur) this.fill = f;
      }
      const tr = this.ctx.track || {};
      const hd = this.abs('', 4, 15.5, 92); Object.assign(hd.style, { display: 'flex', alignItems: 'center', gap: su * 2.4 + 'px', color: '#fff' }); this.fs(hd, 3.6, 600);
      const av = U.el('div', '', hd); Object.assign(av.style, { position: 'relative', width: su * 8 + 'px', height: su * 8 + 'px', borderRadius: '50%', overflow: 'hidden', flex: 'none', boxShadow: '0 0 0 1px rgba(255,255,255,0.4)' }); K.cover(this, av);
      U.el('span', '', hd, String(tr.artist || 'oley').toLowerCase().replace(/[^a-z0-9._]+/g, ''));
      const tm = U.el('span', '', hd, r.int(1, 23) + 'h'); tm.style.opacity = '0.65'; tm.style.fontWeight = '400'; tm.style.flex = '1';
      const x = U.el('span', '', hd); x.innerHTML = K.icon('more') + '&nbsp;&nbsp;' + K.icon('x');
      // stickers
      const style = this.v % 3;
      const acc = K.accent(this);
      const box = this.abs('', 6, 0, 88); box.style.textAlign = 'center'; box.style.lineHeight = '1.32';
      this.fs(box, this.ws.length > 9 ? 6.2 : this.ws.length > 5 ? 7.4 : 9, 700);
      this.box = box;
      this.items = this.ws.map((w, i) => {
        const s = U.el('span', 'pu-sticker', box, K.bare(w));
        if (style === 0) { s.style.background = '#fff'; s.style.color = '#111'; }
        else if (style === 1) { s.style.background = acc; s.style.color = U.lum(U.parseHex(acc)) > 0.6 ? '#111' : '#fff'; }
        else { s.style.background = 'rgba(0,0,0,0.82)'; s.style.color = '#fff'; }
        s.style.opacity = '0';
        if (i < this.ws.length - 1) box.appendChild(document.createTextNode(' '));
        return { w, el: s, rot: r.range(-3, 3), p: -1 };
      });
      box.style.transform = `rotate(${r.range(-4, 4).toFixed(1)}deg)`;
      const bt = this.abs('', 4, 199, 92); Object.assign(bt.style, { display: 'flex', alignItems: 'center', gap: su * 3.5 + 'px', color: '#fff' }); this.fs(bt, 3.6, 400);
      const inp = U.el('div', '', bt, 'Send message'); Object.assign(inp.style, { flex: '1', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '99px', padding: `${su * 2.4}px ${su * 4}px` });
      const hr = U.el('span', '', bt); hr.innerHTML = K.icon('heartO'); hr.style.fontSize = su * 6 + 'px';
      const sd = U.el('span', '', bt); sd.innerHTML = K.icon('send'); sd.style.fontSize = su * 6 + 'px';
    }
    update(t, dt) {
      const L = this.L;
      this.fill.style.width = (U.prog(L.t - 0.2, L.end, t) * 100).toFixed(2) + '%';
      K.wordAnim(this.items, t, 0.32, (it, p, el) => {
        el.style.opacity = U.sat(p * 4).toFixed(3);
        el.style.transform = `rotate(${it.rot.toFixed(1)}deg) scale(${(0.4 + 0.6 * U.e('outBack', p)).toFixed(3)})`;
      });
      this.box.style.top = (this.sh - this.box.offsetHeight) / 2 + 'px';
      const a = this.age;
      this.img.style.transform = `scale(${(1.08 + a * 0.015).toFixed(4)}) translate(${(Math.sin(a * 0.3) * 1.2).toFixed(2)}%, 0)`;
      void dt;
    }
    sfocus() { return { x: this.sw / 2, y: this.sh / 2 }; }
  }
  Ed.add('story', Story, Object.assign({ w: 1.2, max: 16, vars: 3, trig: 'today tonight night party everybody look watch story' }, PH));

  // ================================================================ 8. voice memo with a live transcript
  class Voice extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#000' });
      const su = this.su, sw = this.sw;
      const bk = this.abs('', 3, 12.5, 60); bk.style.color = '#ff453a'; this.fs(bk, 4.1); bk.innerHTML = K.icon('chevL') + ' All Recordings';
      const ti = this.abs('', 5, 24, 90); this.fs(ti, 6.6, 700); ti.textContent = 'New Recording ' + (2 + (U.hash(this.L.text) % 40));
      const dt = this.abs('', 5, 33, 90); dt.style.color = '#8e8e93'; this.fs(dt, 3.4, 500); dt.textContent = U.fmtDateLong(K.now()) + ' · ' + K.clock(K.now());
      this.cv = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.round(sw * dpr); this.cv.height = Math.round(48 * su * dpr);
      Object.assign(this.cv.style, { position: 'absolute', left: 0, top: 46 * su + 'px', width: sw + 'px', height: 48 * su + 'px' });
      this.ui.appendChild(this.cv);
      this.cx = this.cv.getContext('2d'); this.dpr = dpr;
      this.hist = [];
      this.acc = 0;
      this.tm = this.abs('', 0, 98, 100); this.tm.style.textAlign = 'center'; this.fs(this.tm, 9, 300); this.tm.style.fontVariantNumeric = 'tabular-nums'; this.tm.style.letterSpacing = '-0.01em';
      this.tx = this.abs('', 7, 120, 86); this.fs(this.tx, 5.6, 600); this.tx.style.lineHeight = '1.25';
      this.words = K.wordEls(this.tx, this.ws);
      const btn = this.abs('', 39, 186, 22, 22); Object.assign(btn.style, { borderRadius: '50%', border: `${su * 1}px solid #fff`, boxSizing: 'border-box', display: 'grid', placeItems: 'center' });
      this.stop = U.el('div', '', btn); Object.assign(this.stop.style, { width: su * 8 + 'px', height: su * 8 + 'px', borderRadius: su * 1.6 + 'px', background: '#ff3b30' });
      this.t0 = this.L.t - 0.25;
    }
    update(t, dt, A) {
      const su = this.su, x = this.cx, W = this.cv.width, H = this.cv.height, d = this.dpr;
      this.acc += dt;
      while (this.acc > 1 / 40) { this.acc -= 1 / 40; this.hist.push(U.sat(A.level * 0.9 + A.bands[3] * 0.5 + A.pulse * 0.4) * (0.35 + 0.65 * Math.abs(Math.sin(this.hist.length * 1.7)))); }
      if (this.hist.length > 400) this.hist.splice(0, this.hist.length - 400);
      x.clearRect(0, 0, W, H);
      const step = 1.6 * su * d, mid = W * 0.5;
      for (let i = this.hist.length - 1, k = 0; i >= 0; i--, k++) {
        const px = mid - k * step;
        if (px < -step) break;
        const v = this.hist[i], h = Math.max(2 * d, v * H * 0.9);
        x.fillStyle = '#ff453a';
        x.fillRect(px - su * 0.45 * d, (H - h) / 2, su * 0.9 * d, h);
      }
      x.fillStyle = 'rgba(255,255,255,0.18)';
      for (let px = mid + step; px < W; px += step) x.fillRect(px - su * 0.3 * d, H / 2 - d, su * 0.6 * d, 2 * d);
      x.fillStyle = '#0a84ff'; x.fillRect(mid - d, 0, 2 * d, H);
      const s = Math.max(0, t - this.t0);
      const str = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + Math.floor(s % 60)).slice(-2) + ',' + ('0' + Math.floor((s % 1) * 100)).slice(-2);
      if (str !== this._s) { this._s = str; this.tm.textContent = str; }
      const cw = O.wordAt(this.L, t);
      K.wordAnim(this.words, t, 0.18, (it, p, el) => { el.style.opacity = U.sat(p * 3).toFixed(3); });
      this.words.forEach((it) => { const cur = this.L.words[cw] === it.w; if (cur !== it.cur) { it.cur = cur; it.el.style.color = cur ? '#fff' : '#9a9aa0'; } });
      this.stop.style.transform = `scale(${(1 + A.pulse * 0.06).toFixed(3)})`;
    }
    sfocus() { return { x: this.sw / 2, y: 96 * this.su }; }
  }
  Ed.add('voice', Voice, Object.assign({ w: 0.9, max: 18, needTrig: true, trig: 'say said voice sing singing song talk talking hear listen sound record words scream whisper' }, PH));

  // ================================================================ 9. navigation: the line is the next turn
  class Nav extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#1b1f27' });
      const su = this.su, sw = this.sw, sh = this.sh, r = this.r;
      const night = this.v % 2 === 0;
      this.ui.style.background = night ? '#1b2029' : '#e9e6df';
      const mapW = sw * 2.4, mapH = sh * 2.6;
      const wrap = this.abs('', 0, 0, 100, 216.5); wrap.style.perspective = sw * 1.4 + 'px'; wrap.style.perspectiveOrigin = '50% 30%'; wrap.style.overflow = 'hidden';
      const map = U.el('div', '', wrap);
      Object.assign(map.style, { position: 'absolute', left: (sw - mapW) / 2 + 'px', top: (sh * 0.76 - mapH) + 'px', width: mapW + 'px', height: mapH + 'px', transformOrigin: '50% 100%' });
      this.map = map;
      const svg = U.svg('svg', { width: mapW, height: mapH, viewBox: `0 0 ${mapW} ${mapH}` }, map);
      const C = night ? { bg: '#1b2029', blk: '#232935', park: '#1f3a2c', water: '#16314f', road: '#3b4352', road2: '#4b5466', label: '#8b93a3' } : { bg: '#e9e6df', blk: '#f4f2ed', park: '#cfe5c5', water: '#a9cdf0', road: '#ffffff', road2: '#ffd98a', label: '#6b6b6b' };
      U.svg('rect', { x: 0, y: 0, width: mapW, height: mapH, fill: C.bg }, svg);
      U.svg('path', { d: `M ${mapW * r.range(0.6, 0.8)} 0 C ${mapW * 0.9} ${mapH * 0.2}, ${mapW * 0.55} ${mapH * 0.35}, ${mapW} ${mapH * 0.5} L ${mapW} 0 Z`, fill: C.water }, svg);
      for (let i = 0; i < 4; i++) U.svg('rect', { x: r.range(0, mapW * 0.8), y: r.range(0, mapH * 0.9), width: r.range(60, 160) * su / 4, height: r.range(60, 160) * su / 4, rx: 8, fill: C.park }, svg);
      const g = U.svg('g', { transform: `rotate(${r.range(-8, 8).toFixed(1)} ${mapW / 2} ${mapH / 2})` }, svg);
      const step = su * r.range(13, 18);
      for (let x = -mapW; x < mapW * 2; x += step) U.svg('line', { x1: x, y1: -mapH, x2: x, y2: mapH * 2, stroke: C.road, 'stroke-width': su * (r.chance(0.18) ? 2.6 : 1.3) }, g);
      for (let y = -mapH; y < mapH * 2; y += step * r.range(0.8, 1.2)) U.svg('line', { x1: -mapW, y1: y, x2: mapW * 2, y2: y, stroke: C.road, 'stroke-width': su * (r.chance(0.18) ? 2.6 : 1.3) }, g);
      // the route: up the middle, then a turn
      const ks = new Set(L.words.map((w) => w.w));
      this.turn = ks.has('left') ? 'L' : ks.has('right') ? 'R' : ks.has('back') || ks.has('around') ? 'U' : r.pick(['L', 'R', 'S']);
      const cx = mapW / 2, by = mapH - sh * 0.24, ty = mapH - sh * 1.35;
      const ex = this.turn === 'L' ? cx - mapW * 0.3 : this.turn === 'R' ? cx + mapW * 0.3 : cx;
      const d = this.turn === 'S' ? `M ${cx} ${by} L ${cx} ${ty - sh}` : this.turn === 'U' ? `M ${cx} ${by} L ${cx} ${ty} Q ${cx} ${ty - step} ${cx + step} ${ty - step} L ${cx + step} ${by}` : `M ${cx} ${by} L ${cx} ${ty} Q ${cx} ${ty - step * 0.6} ${(cx + (ex - cx) * 0.12)} ${ty - step * 0.6} L ${ex} ${ty - step * 0.6}`;
      U.svg('path', { d, fill: 'none', stroke: '#0b5bd3', 'stroke-width': su * 6.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      U.svg('path', { d, fill: 'none', stroke: '#3d8bff', 'stroke-width': su * 4.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      this.dist0 = r.int(3, 9) * 100;
      // the puck
      const pk = this.abs('', 43, 150, 14, 14); Object.assign(pk.style, { borderRadius: '50%', background: '#fff', boxShadow: '0 0.4vmin 1.6vmin rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center', color: '#1a73ff', fontSize: su * 8 + 'px' });
      pk.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 3 19 20 12 16.5 5 20z" fill="currentColor"/></svg>`;
      // banner
      const bn = this.abs('', 3, 12, 94); Object.assign(bn.style, { borderRadius: su * 4.4 + 'px', background: night ? '#1d6b47' : '#1f7a4f', color: '#fff', padding: `${su * 3.6}px ${su * 4}px`, boxSizing: 'border-box', display: 'flex', gap: su * 3.4 + 'px', boxShadow: '0 1vmin 3vmin rgba(0,0,0,0.35)' });
      const ar = U.el('div', '', bn); ar.innerHTML = K.icon({ L: 'turnL', R: 'turnR', U: 'uturn', S: 'straight' }[this.turn]); Object.assign(ar.style, { fontSize: su * 13 + 'px', lineHeight: '1' });
      const col = U.el('div', '', bn); col.style.flex = '1'; col.style.minWidth = '0';
      this.dist = U.el('div', '', col, ''); Object.assign(this.dist.style, { fontSize: su * 7.4 + 'px', fontWeight: 700, letterSpacing: '-0.02em' });
      const st = U.el('div', '', col); Object.assign(st.style, { fontSize: su * 5 + 'px', fontWeight: 600, lineHeight: '1.18', marginTop: su * 0.6 + 'px' });
      this.words = K.wordEls(st, this.ws);
      this.banner = bn;
      // eta card
      const eta = this.abs('', 0, 192, 100, 25); Object.assign(eta.style, { background: night ? '#1c1c1e' : '#fff', borderRadius: `${su * 5}px ${su * 5}px 0 0`, display: 'flex', alignItems: 'center', padding: `0 ${su * 6}px ${su * 4}px`, boxSizing: 'border-box', gap: su * 4 + 'px', color: night ? '#fff' : '#111' });
      const mins = r.int(4, 38);
      const arr = new Date(K.now().getTime() + mins * 60000);
      eta.innerHTML = `<div style="flex:1"><div style="font-size:${su * 6}px;font-weight:700;color:#30d158">${mins} min</div><div style="font-size:${su * 3.4}px;opacity:0.6">${(mins * 0.6).toFixed(1)} km · ${K.clock(arr)}</div></div><div style="background:#ff3b30;color:#fff;font-weight:700;font-size:${su * 4}px;padding:${su * 2.2}px ${su * 5}px;border-radius:99px">End</div>`;
    }
    update(t, dt) {
      const L = this.L, life = U.prog(L.t - 0.25, L.end, t);
      const d = Math.max(0, Math.round((this.dist0 * (1 - life)) / 10) * 10);
      const s = d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m';
      if (s !== this._d) { this._d = s; this.dist.textContent = s; }
      this.map.style.transform = `rotateX(52deg) translateY(${(life * this.sh * 0.5).toFixed(1)}px)`;
      K.wordAnim(this.words, t, 0.22);
      void dt;
    }
    sfocus() { return { x: this.sw / 2, y: this.banner.offsetTop + this.banner.offsetHeight / 2 }; }
  }
  Ed.add('nav', Nav, Object.assign({ w: 0.9, max: 14, vars: 2, needTrig: true, trig: 'drive driving road street way left right turn go going home miles city highway lost find where ride car' }, PH));

  // ================================================================ 10. weather: the line is the forecast
  class Weather extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#2a4a73' });
      const su = this.su, sw = this.sw, sh = this.sh, r = this.r;
      const ks = new Set(L.words.map((w) => w.w));
      const has = (s) => s.split(' ').some((w) => ks.has(w));
      let cond = has('rain raining rainy storm tears cry crying') ? 'rain' : has('snow cold ice freeze frozen winter') ? 'snow' : has('thunder lightning storm') ? 'storm' : has('sun sunny sunshine summer hot heat') ? 'sun' : has('night moon dark tonight midnight stars') ? 'night' : null;
      if (!cond) cond = { sad: 'rain', tender: 'night', hype: 'sun', angry: 'storm' }[L.mood] || r.pick(['sun', 'night', 'cloud']);
      this.cond = cond;
      const grad = { rain: ['#4d5d73', '#27313f'], snow: ['#9fb2c8', '#5c6f86'], storm: ['#3a3f52', '#15171f'], sun: ['#3d8ce0', '#7ec2ff'], night: ['#0e1630', '#273663'], cloud: ['#6f8399', '#3c4b5d'] }[cond];
      this.ui.style.background = `linear-gradient(180deg, ${grad[0]}, ${grad[1]})`;
      this.cv = document.createElement('canvas');
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      this.cv.width = Math.round(sw * dpr); this.cv.height = Math.round(sh * dpr); this.dpr = dpr;
      Object.assign(this.cv.style, { position: 'absolute', left: 0, top: 0, width: sw + 'px', height: sh + 'px' });
      this.ui.appendChild(this.cv);
      this.cx = this.cv.getContext('2d');
      this.parts = [];
      const N = cond === 'rain' || cond === 'storm' ? 140 : cond === 'snow' ? 90 : cond === 'night' ? 70 : 0;
      for (let i = 0; i < N; i++) this.parts.push({ x: r() * sw, y: r() * sh, z: r.range(0.4, 1), s: r() });
      const tr = this.ctx.track || {};
      const city = this.abs('', 0, 22, 100); city.style.textAlign = 'center'; city.style.color = '#fff'; this.fs(city, 7.6, 500); city.style.textShadow = '0 1px 3px rgba(0,0,0,0.2)';
      city.textContent = K.cap(K.clean(K.bare(K.key(L))).toLowerCase()) || 'Home';
      const lab = this.abs('', 0, 18, 100); lab.style.textAlign = 'center'; lab.style.color = 'rgba(255,255,255,0.75)'; this.fs(lab, 2.9, 600); lab.style.letterSpacing = '0.08em';
      lab.innerHTML = K.icon('pin') + ' ' + K.esc(String(tr.artist || 'MY LOCATION').toUpperCase());
      this.temp0 = { sun: 27, night: 14, rain: 11, snow: -3, storm: 16, cloud: 17 }[cond] + r.int(-3, 3);
      this.tp = this.abs('', 0, 31, 100); this.tp.style.textAlign = 'center'; this.tp.style.color = '#fff'; this.fs(this.tp, 26, 300); this.tp.style.letterSpacing = '-0.04em'; this.tp.style.lineHeight = '1';
      this.tp.style.textIndent = '0.25em';
      const cn = this.abs('', 8, 60, 84); cn.style.textAlign = 'center'; cn.style.color = '#fff'; this.fs(cn, 5.2, 600); cn.style.lineHeight = '1.22';
      this.words = K.wordEls(cn, this.ws);
      this.cn = cn;
      this.hl = this.abs('', 0, 0, 100); this.hl.style.textAlign = 'center'; this.hl.style.color = 'rgba(255,255,255,0.85)'; this.fs(this.hl, 3.8, 500);
      this.hl.textContent = `H:${this.temp0 + 4}°  L:${this.temp0 - 6}°`;
      const card = this.abs('pu-card', 4, 120, 92, 40); Object.assign(card.style, { borderRadius: su * 4.4 + 'px', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(16px)', color: '#fff', padding: `${su * 3}px ${su * 3.6}px`, boxSizing: 'border-box' });
      const ic = { rain: 'rain', snow: 'snow', storm: 'bolt', sun: 'sun', night: 'moon', cloud: 'cloud' }[cond];
      let hrs = `<div style="font-size:${su * 3}px;opacity:0.7;padding-bottom:${su * 2}px;border-bottom:1px solid rgba(255,255,255,0.2)">${K.icon('clock')} HOURLY FORECAST</div><div style="display:flex;justify-content:space-between;margin-top:${su * 3}px;text-align:center;font-size:${su * 3.6}px;font-weight:600">`;
      const now = K.now();
      for (let i = 0; i < 6; i++) hrs += `<div><div style="opacity:0.85">${i ? ((now.getHours() + i) % 24) : 'Now'}</div><div style="font-size:1.6em;margin:0.35em 0">${K.icon(i > 3 && cond === 'rain' ? 'cloud' : ic)}</div><div>${this.temp0 - Math.round(i * 0.6)}°</div></div>`;
      card.innerHTML = hrs + '</div>';
    }
    update(t, dt, A) {
      const L = this.L, x = this.cx, d = this.dpr, sw = this.sw, sh = this.sh;
      const k = U.e('outCubic', U.prog(L.t - 0.3, L.t + 0.9, t));
      const tv = Math.round(U.lerp(this.temp0 - 9, this.temp0, k)) + '°';
      if (tv !== this._t) { this._t = tv; this.tp.textContent = tv; }
      K.wordAnim(this.words, t, 0.22);
      this.hl.style.top = this.cn.offsetTop + this.cn.offsetHeight + this.su * 1.2 + 'px';
      x.setTransform(d, 0, 0, d, 0, 0);
      x.clearRect(0, 0, sw, sh);
      const c = this.cond;
      if (c === 'rain' || c === 'storm') {
        x.strokeStyle = 'rgba(210,225,255,0.45)'; x.lineCap = 'round';
        for (const p of this.parts) {
          p.y += dt * sh * 0.9 * p.z; p.x -= dt * sw * 0.08 * p.z;
          if (p.y > sh) { p.y -= sh + 20; p.x = Math.random() * sw * 1.1; }
          x.lineWidth = 0.6 + p.z; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + sw * 0.012 * p.z, p.y - sh * 0.03 * p.z); x.stroke();
        }
        if (c === 'storm' && A.pulse > 0.75 && Math.random() < 0.12) { x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 0, sw, sh); }
      } else if (c === 'snow') {
        x.fillStyle = 'rgba(255,255,255,0.85)';
        for (const p of this.parts) {
          p.y += dt * sh * 0.08 * p.z; p.x += Math.sin(this.age * 1.3 + p.s * 9) * dt * sw * 0.02;
          if (p.y > sh) { p.y -= sh + 10; }
          x.beginPath(); x.arc(p.x, p.y, 1 + p.z * 2.2, 0, Math.PI * 2); x.fill();
        }
      } else if (c === 'night') {
        for (const p of this.parts) { if (p.y > sh * 0.55) continue; x.fillStyle = `rgba(255,255,255,${(0.3 + 0.6 * Math.abs(Math.sin(this.age * (1 + p.s * 2) + p.s * 7))).toFixed(2)})`; x.fillRect(p.x, p.y, 1.6 * p.z, 1.6 * p.z); }
      } else if (c === 'sun') {
        const g = x.createRadialGradient(sw * 0.85, sh * 0.05, 0, sw * 0.85, sh * 0.05, sw * 0.9);
        g.addColorStop(0, `rgba(255,250,220,${(0.55 + A.pulse * 0.1).toFixed(2)})`); g.addColorStop(0.35, 'rgba(255,240,200,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, sw, sh);
      }
    }
    sfocus() { return { x: this.sw / 2, y: this.cn.offsetTop + this.cn.offsetHeight / 2 }; }
  }
  Ed.add('weather', Weather, Object.assign({ w: 0.9, max: 14, vars: 1, needTrig: true, trig: 'rain raining storm thunder lightning cold snow ice freeze sun sunny sunshine summer winter weather sky cloud clouds hot heat night moon stars' }, PH));

  // ================================================================ 11. a timer running down with the line
  class Timer extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#000' });
      const su = this.su;
      const ti = this.abs('', 5, 22, 90); this.fs(ti, 8.4, 700); ti.textContent = 'Timers';
      const ed = this.abs('', 5, 13, 30); ed.style.color = '#ff9f0a'; this.fs(ed, 4.2, 400); ed.textContent = 'Edit';
      const R = 38;
      const svg = U.svg('svg', { width: 100 * su, height: 100 * su, viewBox: '0 0 100 100' }, this.ui);
      Object.assign(svg.style, { position: 'absolute', left: 0, top: 36 * su + 'px' });
      U.svg('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: '#2c2c2e', 'stroke-width': 3 }, svg);
      this.ring = U.svg('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: '#ff9f0a', 'stroke-width': 3, 'stroke-linecap': 'round', transform: 'rotate(-90 50 50)', 'stroke-dasharray': (2 * Math.PI * R).toFixed(2), 'stroke-dashoffset': 0 }, svg);
      this.C = 2 * Math.PI * R;
      this.svg = svg;
      this.num = this.abs('', 0, 76, 100); this.num.style.textAlign = 'center'; this.fs(this.num, 15, 300); this.num.style.fontVariantNumeric = 'tabular-nums'; this.num.style.letterSpacing = '-0.02em';
      const bell = this.abs('', 0, 96, 100); bell.style.textAlign = 'center'; bell.style.color = '#8e8e93'; this.fs(bell, 3.6, 500);
      const endAt = new Date(K.now().getTime() + Math.max(1, L.end - L.t) * 1000);
      bell.innerHTML = K.icon('bell') + ' ' + K.clock(endAt);
      this.lab = this.abs('', 8, 144, 84); this.lab.style.textAlign = 'center'; this.fs(this.lab, 6, 600); this.lab.style.lineHeight = '1.2';
      this.words = K.wordEls(this.lab, this.ws);
      const b = (x, bg, col, txt) => { const e = this.abs('pu-btn', x, 172, 22, 22); Object.assign(e.style, { background: bg, color: col, boxShadow: `0 0 0 ${su * 0.7}px #000, 0 0 0 ${su * 1}px ${bg}` }); this.fs(e, 4, 500); e.textContent = txt; return e; };
      b(6, '#333335', '#fff', 'Cancel'); b(72, '#3d2a10', '#ff9f0a', 'Pause');
      this.dur = Math.max(1, L.end - L.t);
    }
    update(t, dt, A) {
      const L = this.L;
      const p = U.prog(L.t - 0.2, L.end - 0.05, t);
      this.ring.setAttribute('stroke-dashoffset', (this.C * p).toFixed(2));
      const rem = Math.max(0, this.dur * (1 - p));
      const s = '00:' + ('0' + Math.floor(rem)).slice(-2) + '.' + Math.floor((rem % 1) * 10);
      if (s !== this._s) { this._s = s; this.num.textContent = s; }
      K.wordAnim(this.words, t, 0.22);
      const pulse = 1 + A.pulse * 0.012 + (t > L.singEnd ? 0.02 * Math.sin((t - L.singEnd) * 18) * Math.exp(-(t - L.singEnd) * 3) : 0);
      this.svg.style.transform = `scale(${pulse.toFixed(4)})`;
    }
    sfocus() { return { x: this.sw / 2, y: 86 * this.su }; }
  }
  Ed.add('timer', Timer, Object.assign({ w: 0.9, max: 14, needTrig: true, trig: 'time wait waiting minute minutes seconds second hours clock late tonight forever countdown soon running out' }, PH));

  // ================================================================ 12. a post: the line is the caption, the cover is the photo
  class Post extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: o.dark, bg: o.dark ? '#000' : '#fff' });
      const su = this.su, r = this.r, dark = this.uiDark;
      const tr = this.ctx.track || {};
      this.handle = String(tr.artist || 'oley').toLowerCase().replace(/[^a-z0-9._]+/g, '') || 'oley';
      const top = this.abs('pu-hdr', 0, 12, 100, 10); top.style.padding = `0 ${su * 4}px`; this.fs(top, 5.4, 700);
      top.innerHTML = `<span style="letter-spacing:-0.02em">For you ${K.icon('chevD')}</span><span style="display:flex;gap:${su * 4}px">${K.icon('heartO')}${K.icon('send')}</span>`;
      const hd = this.abs('', 3.5, 25, 93, 11); Object.assign(hd.style, { display: 'flex', alignItems: 'center', gap: su * 2.6 + 'px' }); this.fs(hd, 3.6, 600);
      const av = U.el('div', '', hd); Object.assign(av.style, { position: 'relative', width: su * 8.6 + 'px', height: su * 8.6 + 'px', borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 ${su * 0.5}px ${dark ? '#000' : '#fff'}, 0 0 0 ${su * 0.9}px ${K.accent(this)}`, flex: 'none' });
      K.cover(this, av);
      const nm = U.el('div', '', hd); nm.style.flex = '1'; nm.innerHTML = `${K.esc(this.handle)}<div style="font-weight:400;font-size:0.82em;opacity:0.7">${K.esc(tr.title || 'Original audio')}</div>`;
      const mo = U.el('span', '', hd); mo.innerHTML = K.icon('more');
      const im = this.abs('', 0, 37, 100, 100); im.style.overflow = 'hidden'; this.img = K.cover(this, im);
      this.big = this.abs('', 32, 69, 36, 36); this.big.style.color = '#fff'; this.big.style.filter = 'drop-shadow(0 1vmin 2vmin rgba(0,0,0,0.35))'; this.big.style.opacity = '0'; this.fs(this.big, 36);
      this.big.innerHTML = K.icon('heart');
      const ac = this.abs('', 4, 139.5, 92, 9); Object.assign(ac.style, { display: 'flex', alignItems: 'center', gap: su * 4.2 + 'px' }); this.fs(ac, 6.4);
      this.heart = U.el('span', '', ac); this.heart.innerHTML = K.icon('heartO');
      const c1 = U.el('span', '', ac); c1.innerHTML = K.icon('comment');
      const c2 = U.el('span', '', ac); c2.innerHTML = K.icon('send'); c2.style.flex = '1';
      const c3 = U.el('span', '', ac); c3.innerHTML = K.icon('bookmark');
      this.likes0 = r.int(1200, 88000);
      this.lk = this.abs('', 4.4, 150, 92); this.fs(this.lk, 3.8, 600);
      this.cap = this.abs('', 4.4, 157, 91); this.fs(this.cap, 3.9, 400); this.cap.style.lineHeight = '1.32';
      const h = U.el('b', '', this.cap, this.handle + ' '); h.style.fontWeight = '600';
      this.words = K.wordEls(this.cap, this.ws);
      this.more = this.abs('', 4.4, 0, 90); this.more.style.color = '#8e8e93'; this.fs(this.more, 3.5, 400);
      this.more.textContent = `View all ${r.int(40, 2400).toLocaleString()} comments`;
      const ks = new Set(L.words.map((w) => w.w));
      this.loveT = ['love', 'like', 'heart', 'kiss', 'baby', 'adore'].some((w) => ks.has(w)) || r.chance(0.55) ? K.key(L).t + 0.05 : 1e9;
    }
    update(t, dt) {
      const L = this.L, su = this.su;
      K.wordAnim(this.words, t, 0.2);
      this.more.style.top = this.cap.offsetTop + this.cap.offsetHeight + su * 1.4 + 'px';
      const lk = t >= this.loveT;
      if (lk !== this._lk) { this._lk = lk; this.heart.innerHTML = K.icon(lk ? 'heart' : 'heartO'); this.heart.style.color = lk ? '#ff3040' : ''; }
      const p = U.prog(this.loveT, this.loveT + 0.9, t);
      this.big.style.opacity = (p > 0 && p < 1 ? (p < 0.75 ? 1 : (1 - p) * 4) : 0).toFixed(3);
      this.big.style.transform = `scale(${(p < 0.25 ? U.e('outBack', p / 0.25) * 1.1 : 1.1 - 0.1 * U.prog(0.25, 0.4, p)).toFixed(3)})`;
      this.heart.style.transform = `scale(${(1 + 0.35 * Math.sin(Math.PI * U.prog(this.loveT, this.loveT + 0.3, t))).toFixed(3)})`;
      const n = this.likes0 + Math.floor(U.prog(L.t, L.end, t) * 900) + (lk ? 1 : 0);
      const s = `${n.toLocaleString()} likes`;
      if (s !== this._s) { this._s = s; this.lk.textContent = s; }
      this.img.style.transform = `scale(${(1.02 + this.age * 0.004).toFixed(4)})`;
      void dt;
    }
    sfocus(t) { return t > this.L.t + 0.6 ? { x: this.sw / 2, y: this.cap.offsetTop + this.cap.offsetHeight / 2 } : { x: this.sw / 2, y: 87 * this.su }; }
  }
  Ed.add('post', Post, Object.assign({ w: 1, max: 18, vars: 2, trig: 'love like heart pretty beautiful famous everybody picture photo post world' }, PH));

  // ================================================================ 13. a passcode, one word per digit
  class Pass extends PhoneShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dark: true, bg: '#000' });
      const su = this.su;
      const bg = this.abs('', 0, 0, 100, 216.5); K.blurCover(this, bg, su * 7, 'opacity:0.75;filter:blur(' + su * 7 + 'px) brightness(0.7)');
      const lk = this.abs('', 46, 17, 8, 8); lk.style.color = '#fff'; this.fs(lk, 5.4); lk.innerHTML = K.icon('lock');
      this.title = this.abs('', 6, 28, 88); Object.assign(this.title.style, { textAlign: 'center', color: '#fff', lineHeight: '1.2' }); this.fs(this.title, this.ws.length > 7 ? 5 : 6.2, 600);
      this.words = K.wordEls(this.title, this.ws);
      const n = U.clamp(this.ws.length, 4, 6);
      this.dots = this.abs('', 0, 0, 100); Object.assign(this.dots.style, { display: 'flex', justifyContent: 'center', gap: su * 4.6 + 'px' });
      this.dd = [];
      for (let i = 0; i < n; i++) { const d = U.el('i', '', this.dots); Object.assign(d.style, { width: su * 3.2 + 'px', height: su * 3.2 + 'px', borderRadius: '50%', border: `${su * 0.35}px solid #fff`, boxSizing: 'border-box' }); this.dd.push(d); }
      const lets = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ', '', '+', ''];
      this.keys = {};
      const digs = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
      digs.forEach((dg, i) => {
        if (!dg) return;
        const col = i % 3, row = Math.floor(i / 3);
        const k = this.abs('pu-key pu-frost dk', 11 + col * 28, 86 + row * 26, 22, 22);
        k.style.background = 'rgba(255,255,255,0.16)';
        k.innerHTML = `<b style="font-size:${su * 9}px">${dg}</b><small style="font-size:${su * 2.1}px">${lets[i]}</small>`;
        this.keys[dg] = k;
      });
      const em = this.abs('', 8, 194, 30); em.style.color = '#fff'; this.fs(em, 4, 400); em.textContent = 'Emergency';
      const cn = this.abs('', 70, 194, 24); cn.style.color = '#fff'; this.fs(cn, 4, 400); cn.style.textAlign = 'right'; cn.textContent = 'Cancel';
      this.code = this.ws.map((w) => String(U.hash(w.w + this.L.i) % 10));
      this.neg = hasNeg(L);
      this.n = n;
    }
    update(t, dt) {
      const L = this.L, su = this.su;
      K.wordAnim(this.words, t, 0.22);
      this.dots.style.top = this.title.offsetTop + this.title.offsetHeight + su * 5 + 'px';
      const cnt = K.sungN(this.ws, t, 0.02);
      const shown = Math.min(this.n, Math.round((cnt / Math.max(1, this.ws.length)) * this.n));
      const end = L.singEnd + 0.15;
      const fail = this.neg && t > end;
      const sk = fail ? U.prog(end, end + 0.5, t) : 0;
      this.dd.forEach((d, i) => { const on = i < shown && !(fail && sk > 0.6); if (on !== d._on) { d._on = on; d.style.background = on ? '#fff' : 'transparent'; } });
      this.dots.style.transform = sk > 0 && sk < 1 ? `translateX(${(Math.sin(sk * 36) * (1 - sk) * su * 4).toFixed(1)}px)` : 'none';
      for (const k in this.keys) this.keys[k].style.background = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < this.ws.length; i++) { const w = this.ws[i]; if (t >= w.t - 0.02 && t < w.t + 0.16) this.keys[this.code[i]].style.background = 'rgba(255,255,255,0.55)'; }
      if (!this.neg && t > end) {
        const k = U.e('inOutCubic', U.prog(end + 0.15, end + 0.6, t));
        this.ui.style.transform = `scale(${(1 + 0.08 * k).toFixed(4)})`;
        this.ui.style.opacity = (1 - k * 0.85).toFixed(3);
      }
      void dt;
    }
    sfocus() { return { x: this.sw / 2, y: this.title.offsetTop + this.title.offsetHeight }; }
  }
  Ed.add('pass', Pass, Object.assign({ w: 0.8, max: 12, needTrig: true, trig: 'secret secrets key keys lock locked open inside let in try code password unlock door' }, PH));
})();
