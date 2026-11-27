/* Source: the song typed live as code, filmed in macro. A named cursor types each word while a
   floating camera with a wide-open lens drifts along it, so only the line being typed is sharp.
   Little phone cards answer the words (calls, recents, hidden photos, group chats), fire words light a
   real-looking flame, lies glitch, and the cover flies through the lens at the start and the end. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const CW = O.CodeCam.CW, LH = O.CodeCam.LH;

  O.css('source', `
.m-src { background: #050608; }
.m-src .src-cover { position: absolute; left: 50%; top: 50%; width: 62vmin; height: 62vmin; margin: -31vmin 0 0 -31vmin; background: #111 center / cover;
  box-shadow: 0 4vmin 12vmin rgba(0,0,0,0.7); will-change: transform, opacity, filter; transform-origin: 46% 46%; z-index: 3; display: none; }
.m-src .src-fallback { position: absolute; left: 8%; right: 8%; top: 50%; transform: translateY(-50%); font: 700 4.2vmin/1.5 var(--mono); color: #9fbbe6; white-space: pre-wrap; }
`);

  const TRIG = {
    call: new Set('call calls calling called phone ring ringing rings dial'.split(' ')),
    recents: new Set('answer answered lies lie ignore ignored missed waiting wait alone nobody voicemail hours'.split(' ')),
    photos: new Set('picture pictures photo photos memories memory remember album camera polaroid'.split(' ')),
    toast: new Set('say said says tell told text texted texts message friends talk talking everyone everybody'.split(' ')),
    pill: new Set('him her who name somebody someone anybody anyone them'.split(' ')),
    flame: new Set('fire flame flames burn burning burned light lights candle moth heat hot smoke lit lighter'.split(' ')),
    glitch: new Set('false lie lies liar fake wrong broken nothing'.split(' ')),
  };
  const STATUS = { him: 'asleep', her: 'typing…', who: 'no results', name: '1 result', somebody: 'offline', someone: 'last seen 3:09 am', them: 'muted', anyone: 'no results', anybody: 'no results' };

  // phone-style cards, drawn once into a canvas and filmed on the editor
  function drawCard(kind, o) {
    const c = document.createElement('canvas');
    const S = 2;
    const W = (kind === 'pill' ? 360 : 560) * S, H = (kind === 'call' ? 170 : kind === 'recents' ? 250 : kind === 'photos' ? 250 : kind === 'pill' ? 74 : 150) * S;
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.scale(S, S);
    const w = W / S, h = H / S;
    const mono = (wt, px) => `${wt} ${px}px 'Oley Mono', Consolas, monospace`;
    x.fillStyle = kind === 'pill' ? 'rgba(10,12,16,0.82)' : 'rgba(16,19,26,0.92)';
    x.strokeStyle = kind === 'pill' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.14)';
    x.lineWidth = kind === 'pill' ? 2 : 1.4;
    x.beginPath();
    x.roundRect(2, 2, w - 4, h - 4, kind === 'pill' ? (h - 4) / 2 : 22);
    x.fill();
    x.stroke();
    x.textBaseline = 'alphabetic';
    const clock = U.fmtClockAmPm(new Date());
    if (kind === 'call') {
      x.fillStyle = 'rgba(233,238,246,0.6)'; x.font = mono(400, 17); x.fillText(clock, 30, 46);
      x.fillStyle = '#e9eef6'; x.font = mono(700, 46); x.fillText(o.name, 28, 100);
      x.fillStyle = '#ffb36b'; x.font = mono(400, 21); x.fillText('calling…', 30, 136);
      const cx = w - 92, cy = h / 2;
      const g = x.createRadialGradient(cx, cy, 20, cx, cy, 70);
      g.addColorStop(0, 'rgba(255,140,40,0.0)'); g.addColorStop(0.55, 'rgba(255,140,40,0.35)'); g.addColorStop(1, 'rgba(255,140,40,0)');
      x.fillStyle = g; x.fillRect(cx - 80, cy - 80, 160, 160);
      x.strokeStyle = '#ff9a3d'; x.lineWidth = 9; x.beginPath(); x.arc(cx, cy, 38, 0, Math.PI * 2); x.stroke();
    } else if (kind === 'recents') {
      x.fillStyle = 'rgba(233,238,246,0.6)'; x.font = mono(400, 17); x.fillText('recents', 30, 44);
      const d = new Date();
      [0, 3, 14].forEach((m, k) => {
        const y = 86 + k * 40;
        x.font = mono(400, 21);
        x.fillStyle = '#e9eef6'; x.fillText(o.name, 30, y);
        x.fillStyle = '#ffad5c'; x.fillText('outgoing', 170, y);
        x.fillStyle = '#e9eef6'; x.fillText(U.fmtClockAmPm(new Date(d - m * 60000)), 330, y);
        x.fillStyle = '#ff4f5e'; x.fillText('×', 500, y);
      });
      x.font = mono(400, 21);
      x.fillStyle = '#e9eef6'; x.fillText(o.name + ' (14)', 30, 214);
      x.fillStyle = '#ff4f5e'; x.fillText('no answer', 330, 214);
    } else if (kind === 'photos') {
      x.fillStyle = 'rgba(233,238,246,0.6)'; x.font = mono(400, 17); x.fillText('hidden album', 30, 44);
      x.fillStyle = '#e9eef6'; x.font = mono(700, 40); x.fillText(o.n + ' photos', 28, 94);
      for (let k = 0; k < 4; k++) {
        const tx = 30 + k * 128, ty = 120, s = 104;
        x.save();
        x.beginPath(); x.roundRect(tx, ty, s, s, 10); x.clip();
        if (o.img) {
          const iw = o.img.naturalWidth || o.img.width, ih = o.img.naturalHeight || o.img.height;
          const cs = Math.min(iw, ih) * 0.45, px = [0.1, 0.7, 0.3, 0.9][k] * (iw - cs), py = [0.2, 0.6, 0.85, 0.35][k] * (ih - cs);
          x.filter = 'saturate(0.6) brightness(0.8)';
          try { x.drawImage(o.img, px, py, cs, cs, tx, ty, s, s); } catch (e) {}
          x.filter = 'none';
        } else { x.fillStyle = '#222833'; x.fillRect(tx, ty, s, s); }
        x.restore();
        x.strokeStyle = 'rgba(255,173,92,0.75)'; x.lineWidth = 2; x.beginPath(); x.roundRect(tx, ty, s, s, 10); x.stroke();
      }
    } else if (kind === 'toast') {
      x.fillStyle = 'rgba(233,238,246,0.6)'; x.font = mono(400, 17); x.fillText('group chat · ' + o.count + ' new', 30, 46);
      x.fillStyle = '#e9eef6'; x.font = mono(700, 27);
      let line = '"' + o.quote + '."';
      while (x.measureText(line).width > w - 60 && line.length > 6) line = line.slice(0, -5) + '…"';
      x.fillText(line, 30, 100);
    } else if (kind === 'pill') {
      x.font = mono(600, 26);
      x.fillStyle = '#fff'; x.fillText(o.word, 30, 47);
      const ww = x.measureText(o.word).width;
      x.font = mono(400, 26);
      x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillText(o.status ? ' · ' + o.status : '', 30 + ww, 47);
    }
    return c;
  }

  class Source {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-src');
      this.cc = O.glSupported() ? new O.CodeCam(ctx, { theme: 'source', keyWords: false }) : null;
      if (!this.cc || !this.cc.ok) { this.fb = U.el('div', 'src-fallback', ctx.root); this.cc = null; return; }
      this.cover = U.el('div', 'src-cover', ctx.root);
      this.sp = { x: O.sp(0), y: O.sp(0), d: O.sp(12), yaw: O.sp(0.15), pitch: O.sp(0.6), roll: O.sp(0), ap: O.sp(3) };
      this.shake = new O.Shake(11);
      this.fired = new Set();
      this.card = null;
      this.flame = null;
      this.glitch = null;
      this.cardT = -99;
      this.inited = false;
      this.tag();
    }
    tag() {
      const tr = this.ctx.track;
      const h = (this.ctx.opts.handle || '').trim() || U.firstName(tr && tr.artist);
      const c = O.CodeCam.tag(h.slice(0, 14), '#ff2b3f', '#ffffff');
      this.cc.setTex('tagA', c);
      this.tagR = c.width / c.height;
    }
    onTrack() { if (this.cc) this.tag(); }
    onArt(url, img) {
      this.artImg = img || null;
      if (this.cover) this.cover.style.backgroundImage = url ? 'url("' + url + '")' : '';
      this.artUrl = url;
    }
    onLyrics(tl) {
      let she = 0, he = 0;
      for (const L of tl.lines) for (const w of L.words) { if (w.w === 'she' || w.w === 'her') she++; if (w.w === 'he' || w.w === 'him' || w.w === 'his') he++; }
      this.pron = he > she ? 'him' : 'her';
      if (!this.cc) return;
      const built = O.Code.buildRows(tl, this.ctx, { header: '// ' + U.fmtClockAmPm(new Date()) + '.', max: 44 });
      this.rowOf = built.rowOf;
      this.cc.setRows(built.rows);
      this.fired.clear();
      this.card = null;
      this.flame = null;
      this.glitch = null;
      this.inited = false;
    }
    // something the words call for
    trigger(L, w, wx, wy, t) {
      const key = L.i + ':' + w.i;
      if (this.fired.has(key)) return;
      this.fired.add(key);
      const b = (w.w || '').replace(/'/g, '');
      const opts = this.ctx.opts;
      if (TRIG.glitch.has(b)) this.glitch = { row: this.curRow, t0: t };
      if (TRIG.flame.has(b)) this.flame = { x: wx + CW * 1.4, y: wy + LH * 0.15, t0: t, life: 3.2 };
      if (opts.cards === false || t - this.cardT < 3.5) {
        if (TRIG.pill.has(b) && opts.cards !== false && !this.card) this.show('pill', L, wx + CW, wy + LH * 0.9, t, { word: b, status: STATUS[b] || '' });
        return;
      }
      let kind = null;
      for (const k of ['call', 'recents', 'photos', 'toast']) if (TRIG[k].has(b)) { kind = k; break; }
      if (!kind) { if (TRIG.pill.has(b)) this.show('pill', L, wx + CW, wy + LH * 0.9, t, { word: b, status: STATUS[b] || '' }); return; }
      this.cardT = t;
      const row = this.cc.rows[this.curRow] || {};
      const o = { name: this.pron, n: 100 + (U.hash(L.text) % 300), img: this.artImg, count: 2 + (U.hash(L.text) % 6),
        quote: L.words.filter((x) => !x.adlib).slice(-4).map((x) => x.bare || x.w).join(' ').toLowerCase() };
      this.show(kind, L, ((row.indent || 0) * 2 + 7) * CW, wy + LH * 1.3, t, o);
    }
    show(kind, L, x, y, t, o) {
      const c = drawCard(kind, o);
      this.cc.setTex('card', c);
      const wEm = kind === 'pill' ? 6.2 : 9.6;
      this.card = { kind, x, y, w: wEm, h: (wEm * c.height) / c.width, t0: t, li: L.i };
    }
    frameCover(t) {
      // fly through the lens at the start, pull back out at the end
      const tl = this.ctx.tl, dur = (this.ctx.track && this.ctx.track.duration) || 0;
      const first = tl.lines.length ? tl.lines[0].t : 4;
      let op = 0, sc = 1, bl = 0;
      if (this.artUrl && t < first + 0.2) {
        const z = U.prog(Math.max(0.2, first - 1.6), first - 0.1, t);
        sc = 1 + 11 * U.e('inExpo', z); op = 1 - U.prog(0.55, 1, z); bl = z * 14;
      } else if (this.artUrl && dur > 20 && t > dur - 4.2) {
        const z = U.prog(dur - 4.2, dur - 2.6, t);
        sc = 1 + 11 * (1 - U.e('outExpo', z)); op = U.prog(0, 0.5, z); bl = (1 - z) * 12;
      }
      const s = this.cover.style;
      s.display = op > 0.01 ? 'block' : 'none';
      if (op > 0.01) { s.opacity = op.toFixed(3); s.transform = `scale(${sc.toFixed(3)})`; s.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : 'none'; }
    }
    frame(t, dt, A, jumped) {
      const ctx = this.ctx, tl = ctx.tl;
      if (!this.cc) { const L = tl.lines[O.lineAt(tl, t)]; if (this.fb) this.fb.textContent = L ? L.text : ''; return; }
      if (jumped) { this.card = null; this.flame = null; this.glitch = null; this.fired.clear(); }
      const cc = this.cc, st = cc.update(t, jumped);
      this.curRow = st.row;
      const L = tl.lines[st.li];
      const cx = st.col * CW, cy = st.row * LH + LH * 0.5;
      // words that trigger something, as they are typed
      if (L) {
        const wi = O.wordAt(L, t);
        if (wi >= 0 && t - L.words[wi].t < 0.6) this.trigger(L, L.words[wi], cx, st.row * LH, t);
      }
      // ---------------------------------------------------- camera: macro, floating, wide open
      const asp = ctx.W / ctx.H, tanH = Math.tan((40 * Math.PI) / 360);
      const chorus = L && L.repeat && t < L.singEnd + 0.5;
      const breathe = 1 + 0.08 * Math.sin(t * 0.21);
      // a card pulls focus to itself for a moment
      const cd = this.card && t - this.card.t0 > 0.25 && t - this.card.t0 < 2.4 ? this.card : null;
      let rowsVis = (chorus ? 8.5 : 4.8) * breathe;
      const yaw = 0.08 * Math.sin(t * 0.13 + 1.2) + 0.03;
      const pitch = chorus ? 0.45 : 0.6;
      const roll = 0.05 * Math.sin(t * 0.09);
      let tx = cx - rowsVis * LH * asp * 0.12, ty = cy, fx = cx, fy = cy;
      if (cd) {
        rowsVis = Math.max(rowsVis, 6.2);
        fx = cd.x + cd.w * 0.4; fy = cd.y + cd.h * 0.5;
        tx = (fx + cx) / 2 - rowsVis * LH * asp * 0.05; ty = fy * 0.62 + cy * 0.38;
      }
      const D = (rowsVis * LH) / (2 * tanH);
      const ap = rowsVis * (chorus ? 0.42 : 0.6);
      const S = this.sp;
      if (!this.inited || jumped) {
        S.x = O.sp(tx); S.y = O.sp(ty); S.d = O.sp(D); S.yaw = O.sp(yaw); S.pitch = O.sp(pitch); S.roll = O.sp(roll); S.ap = O.sp(ap);
        this.fd = O.sp(fy); this.fdx = O.sp(fx);
        this.inited = true;
      }
      O.spring(S.x, tx, 3.6, dt);
      O.spring(S.y, ty, 4.2, dt);
      O.spring(S.d, D, 2.2, dt);
      O.spring(S.yaw, yaw, 1.5, dt);
      O.spring(S.pitch, pitch, 1.5, dt);
      O.spring(S.roll, roll, 1.5, dt);
      O.spring(S.ap, ap, 2, dt);
      const sh = this.shake, hh = 1 + A.pulse * 0.4;
      const cam = O.CodeCam.cam(S.x.x + sh.at(t * 0.55, 3) * 0.12 * hh, S.y.x + sh.at(t * 0.5, 4) * 0.08 * hh, S.d.x,
        S.yaw.x + sh.at(t * 0.45, 0) * 0.02 * hh, S.pitch.x + sh.at(t * 0.4, 1) * 0.016 * hh, S.roll.x + sh.at(t * 0.35, 2) * 0.012 * hh);
      cam.tanH = tanH;
      // focus racks between the typing and a card
      if (!this.fd) this.fd = O.sp(fy);
      O.spring(this.fd, fy, 5, dt);
      if (!this.fdx) this.fdx = O.sp(fx);
      O.spring(this.fdx, fx, 5, dt);
      cam.fd = Math.max(1, (this.fdx.x - cam.p[0]) * cam.f[0] + (this.fd.x - cam.p[1]) * cam.f[1] + (0 - cam.p[2]) * cam.f[2]);
      cam.aper = S.ap.x;
      // ---------------------------------------------------- overlays
      const x = { curRow: st.row, finish: { bloom: 0.06, glow: 0.16, vig: 0.5, grain: 0.05, halation: 0.06, contrast: 1.04, ca: 0.0016 } };
      const blink = st.typing ? 1 : (t * 1.1) % 1 < 0.55 ? 1 : 0.15;
      x.curA = [cx + 0.02, st.row * LH + 0.14, cx + CW * 0.92, st.row * LH + LH - 0.14];
      x.curAC = [1.0, 0.024, 0.05, blink];
      x.tagRA = [cx, st.row * LH - 0.82, cx + 0.68 * this.tagR, st.row * LH - 0.14];
      x.tagAA = 1;
      x.win = [-1.2, -2.7, 120, 0];
      if (this.card) {
        const c = this.card, age = t - c.t0;
        const Lc = tl.lines[c.li];
        const p = U.e('outBack', U.prog(0, 0.45, age));
        const out = Lc ? U.prog(Math.max(3.2, Lc.singEnd - c.t0 + 1.5), Math.max(3.8, Lc.singEnd - c.t0 + 2.1), age) : 0;
        const k = 0.9 + 0.1 * p, y = c.y + (1 - p) * LH * 0.5;
        x.cardR = [c.x, y, c.x + c.w * k, y + c.h * k];
        x.cardA = U.sat(p) * (1 - out);
        if (out >= 1 || age > 9) this.card = null;
      }
      if (this.flame) {
        const f = this.flame, age = t - f.t0;
        const a = U.prog(0, 0.4, age) * (1 - U.prog(f.life - 0.6, f.life, age));
        x.flame = [f.x, f.y, 1.15 * (0.92 + 0.08 * Math.sin(age * 9)), a];
        if (age > f.life) this.flame = null;
      }
      if (this.glitch) {
        const g = this.glitch, age = t - g.t0;
        x.glitch = [g.row, 0, 0, age < 0.7 ? (1 - age / 0.7) * (0.6 + 0.4 * Math.sin(age * 60)) : 0];
        if (age > 0.7) this.glitch = null;
      }
      x.cut = !!jumped;
      cc.render(cam, x, t, dt);
      this.frameCover(t);
    }
    destroy() { if (this.cc) this.cc.destroy(); }
  }
  O.registerMode('source', Source, { label: 'Source', glow: false, noIntro: true, gl: true });
})();
