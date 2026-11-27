/* Motion: the song typed as code and shot like an edit. A camera with a real lens rides the cursor in
   close-up with shallow focus, whips to every new line with motion blur and colour fringing, snaps
   back to show the whole file, punches in on the key words (they glow yellow), selects everything at
   the end of a section, clicks into new lines and ends on a title banner. Two named cursors share
   the typing: verses are the artist's, the hooks are "you". */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const CW = O.CodeCam.CW, LH = O.CodeCam.LH;

  O.css('motion', `
.m-motion { background: #0a0a0b; }
.m-motion .mo-fallback { position: absolute; left: 8%; right: 8%; top: 50%; transform: translateY(-50%); font: 700 4.2vmin/1.5 var(--mono); color: #eee; white-space: pre-wrap; }
`);
  const slug = (s) => String(s || 'lyrics').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lyrics';

  class Motion {
    constructor(ctx) {
      this.ctx = ctx;
      ctx.root.classList.add('m-motion');
      this.cc = O.glSupported() ? new O.CodeCam(ctx, { theme: 'motion', keyWords: ctx.opts.keywords !== false }) : null;
      if (!this.cc || !this.cc.ok) { this.fb = U.el('div', 'mo-fallback', ctx.root); this.cc = null; return; }
      this.sp = { x: O.sp(0), y: O.sp(0), d: O.sp(18), yaw: O.sp(0.2), pitch: O.sp(0.1), roll: O.sp(0), ap: O.sp(1.2) };
      this.shake = new O.Shake(5);
      this.last = { A: { row: 1, col: 6 }, B: { row: 1, col: 6 } };
      this.rowWas = -1;
      this.rowT = 0;
      this.inited = false;
      this.tags();
    }
    tags() {
      const tr = this.ctx.track;
      const h = (this.ctx.opts.handle || '').trim() || U.firstName(tr && tr.artist);
      const ta = O.CodeCam.tag(h.slice(0, 14), '#ff3b3b', '#ffffff'), tb = O.CodeCam.tag('you', '#ffd23f', '#141414');
      this.cc.setTex('tagA', ta);
      this.cc.setTex('tagB', tb);
      this.tagAR = ta.width / ta.height;
      this.tagBR = tb.width / tb.height;
      const c = document.createElement('canvas');
      c.width = 2400; c.height = 120;
      const x = c.getContext('2d');
      x.fillStyle = '#18181a'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#202022'; x.fillRect(40, 18, 520, 102);
      x.fillStyle = '#ffd23f'; x.fillRect(40, 18, 520, 4);
      x.font = "600 46px 'Oley Mono', Consolas, monospace";
      x.fillStyle = '#e8e8ea'; x.textBaseline = 'middle';
      x.fillText((slug(tr && tr.title) + '.js').slice(0, 18), 80, 72);
      x.fillStyle = '#6b6b70'; x.fillText('×', 500, 72);
      this.cc.setTex('tab', c);
      this.banner(tr);
    }
    banner(tr) {
      const c = document.createElement('canvas');
      c.width = 2400; c.height = 420;
      const x = c.getContext('2d');
      const p = this.ctx.palette;
      const g = x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, '#1a0a12');
      g.addColorStop(0.45, U.hex(U.mix(p.vivid, [255, 120, 40], 0.65)));
      g.addColorStop(0.8, U.hex(U.mix(p.vivid, [255, 200, 90], 0.55)));
      g.addColorStop(1, '#2a1208');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      const sun = x.createRadialGradient(1200, 330, 10, 1200, 330, 200);
      sun.addColorStop(0, 'rgba(255,240,210,1)'); sun.addColorStop(0.35, 'rgba(255,170,90,0.9)'); sun.addColorStop(1, 'rgba(255,90,40,0)');
      x.fillStyle = sun; x.fillRect(900, 120, 600, 300);
      x.font = "800 120px 'Oley Display', 'Oley Sans', sans-serif";
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillText(tr ? tr.title : 'Oley', 1204, 156);
      x.fillStyle = '#fff'; x.fillText(tr ? tr.title : 'Oley', 1200, 150);
      x.font = "600 54px 'Oley Sans', sans-serif";
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillText(tr ? U.mainArtist(tr.artist) : '', 1200, 250);
      this.cc.setTex('banner', c);
    }
    onTrack() { if (this.cc) this.tags(); }
    onArt() { if (this.cc) this.banner(this.ctx.track); }
    onLyrics(tl) {
      const tr = this.ctx.track;
      const header = '// ' + (tr ? (U.mainArtist(tr.artist) + ' - ' + tr.title).toLowerCase() : 'oley');
      const built = O.Code.buildRows(tl, this.ctx, { header, max: 50 });
      this.rowOf = built.rowOf;
      this.rowsOf = built.rowsOf;
      if (this.fb) { this.fbLines = tl.lines; return; }
      this.cc.setRows(built.rows);
      // who types what: the hooks (repeated lines) belong to "you"
      this.who = tl.lines.map((L) => (L.repeat ? 'B' : 'A'));
      // edit beats: quick pull-backs, select-alls, clicks into new lines
      const r = this.ctx.rng('motion');
      this.wides = [];
      this.sels = [];
      this.clicks = [];
      tl.lines.forEach((L, i) => {
        const nx = tl.lines[i + 1];
        if (i % 4 === 2 || (L.repeat && !(tl.lines[i - 1] && tl.lines[i - 1].repeat))) this.wides.push([L.t - 0.12, L.t + r.range(0.55, 0.9)]);
        if (nx && nx.t - L.singEnd > 3) this.sels.push([L.singEnd + 0.35, nx.t - 0.25, i]);
        const pv = tl.lines[i - 1];
        if (!pv || L.t - pv.singEnd > 2) this.clicks.push([L.t - 0.35, i]);
      });
      const last = tl.lines[tl.lines.length - 1];
      this.endT = last ? last.singEnd + 1.1 : 1e9;
      this.inited = false;
    }
    onResize() {}
    inWin(list, t) { for (const w of list) if (t >= w[0] && t < w[1]) return w; return null; }

    frame(t, dt, A, jumped) {
      if (!this.cc) {
        const tl = this.ctx.tl, L = tl.lines[O.lineAt(tl, t)];
        if (this.fb) this.fb.textContent = L ? L.text : '';
        return;
      }
      const ctx = this.ctx, cc = this.cc, tl = ctx.tl;
      const st = cc.update(t, jumped);
      const L = tl.lines[st.li];
      const who = L && this.who ? this.who[st.li] || 'A' : 'A';
      if (st.row !== this.rowWas) { this.rowT = t; this.rowWas = st.row; }
      const sinceRow = t - this.rowT;
      // the active cursor follows the typing, the other one waits where it stopped
      this.last[who] = { row: st.row, col: st.col };
      const cx = st.col * CW, cy = st.row * LH + LH * 0.5;
      // ---------------------------------------------------- direction
      const H = ctx.H, W = ctx.W, asp = W / H;
      const tanH = Math.tan((34 * Math.PI) / 360);
      const wide = this.inWin(this.wides, t);
      const sel = this.inWin(this.sels, t);
      const ending = t > this.endT;
      const wi = L ? O.wordAt(L, t) : -1;
      const w = L && wi >= 0 ? L.words[wi] : null;
      const punch = w && w.key && t < w.end + 0.15 && st.typing;
      let rowsVis = 7.2, yaw = (Math.floor(st.row / 6) % 2 ? -1 : 1) * 0.07, pitch = 0.5, roll = (Math.floor(st.row / 3) % 2 ? 1 : -1) * 0.075;
      let tx = cx - rowsVis * LH * asp * 0.1, ty = cy;
      let omegaXY = 11, omegaD = 7;
      if (sinceRow < 0.35) omegaXY = 24;
      if (punch) { rowsVis = 4.4; omegaD = 13; }
      if (wide || sel || ending) {
        rowsVis = ending ? 26 : 19;
        yaw *= 0.25; pitch = 0.08; roll *= 0.3;
        ty = cy - rowsVis * LH * (ending ? 0.08 : 0.22);
        tx = 20 * CW + rowsVis * LH * asp * 0.12;
        omegaD = 11; omegaXY = 13;
      }
      const D = (rowsVis * LH) / (2 * tanH);
      // lens: lines a row away fall out of focus in close-up
      const ap = rowsVis * 0.55 * (wide || sel || ending ? 0.12 : 1);
      const S = this.sp;
      if (!this.inited || jumped) {
        S.x = O.sp(tx); S.y = O.sp(ty); S.d = O.sp(D); S.yaw = O.sp(yaw); S.pitch = O.sp(pitch); S.roll = O.sp(roll); S.ap = O.sp(ap);
        this.inited = true;
      }
      O.spring(S.x, tx, omegaXY, dt);
      O.spring(S.y, ty, omegaXY, dt);
      O.spring(S.d, D, omegaD, dt);
      O.spring(S.yaw, yaw, 2.6, dt);
      O.spring(S.pitch, pitch, 3, dt);
      O.spring(S.roll, roll, 2.4, dt);
      O.spring(S.ap, ap, 6, dt);
      // handheld micro-motion
      const sh = this.shake, hh = 0.6 + A.pulse * 0.6;
      const yawN = S.yaw.x + sh.at(t * 0.7, 0) * 0.012 * hh, pitchN = S.pitch.x + sh.at(t * 0.6, 1) * 0.01 * hh;
      const rollN = S.roll.x + sh.at(t * 0.5, 2) * 0.008 * hh;
      const cam = O.CodeCam.cam(S.x.x + sh.at(t * 0.9, 3) * 0.05, S.y.x + sh.at(t * 0.8, 4) * 0.04, S.d.x * (1 - 0.012 * A.pulse), yawN, pitchN, rollN);
      cam.tanH = tanH;
      // focus on the cursor's line: distance from camera to the cursor point along the view axis
      const fp = [cx, cy, 0];
      cam.fd = Math.max(1, (fp[0] - cam.p[0]) * cam.f[0] + (fp[1] - cam.p[1]) * cam.f[1] + (fp[2] - cam.p[2]) * cam.f[2]);
      cam.aper = S.ap.x;
      // ---------------------------------------------------- overlays
      const blink = st.typing ? 1 : (t * 1.1) % 1 < 0.55 ? 1 : 0.12;
      const x = { curRow: st.row, finish: { bloom: 0.06, glow: 0.2, vig: 0.46, grain: 0.05, halation: 0.09, contrast: 1.05, ca: 0.0014 } };
      const pos = (k) => this.last[k];
      const a = pos('A'), b = pos('B');
      const aActive = who === 'A';
      const ax = a.col * CW, ay = a.row * LH;
      x.curA = [ax + 0.02, ay + 0.16, ax + CW * 0.92, ay + LH - 0.16];
      x.curAC = [1.0, 0.045, 0.045, aActive ? blink : 0.85];
      x.tagRA = [ax, ay - 0.86, ax + 0.72 * this.tagAR, ay - 0.14];
      x.tagAA = 1;
      const bx = b.col * CW, by = b.row * LH;
      const bVis = this.who && this.who.some((v) => v === 'B') ? 1 : 0;
      x.curB = [bx - 0.03, by + 0.12, bx + 0.07, by + LH - 0.12];
      x.curBC = [1.0, 0.65, 0.05, bVis * (!aActive ? blink : 0.9)];
      x.tagRB = [bx, by - 0.86, bx + 0.72 * this.tagBR, by - 0.14];
      x.tagBA = bVis;
      x.win = [-1.2, -2.7, 50 * CW + 30, 0];
      x.tabR = [-1.2, -2.7, 50 * CW + 30, -0.75];
      // select all at the end of a section
      if (sel) {
        x.selAmt = U.sat((t - sel[0]) / 0.12) * (1 - U.sat((t - (sel[1] - 0.12)) / 0.12));
        x.selR = [0, st.row, 5.6 * CW, 0];
      }
      // click into a new line
      const ck = this.inWin(this.clicks.map((c) => [c[0], c[0] + 0.75, c[1]]), t);
      if (ck && this.rowOf) {
        const ri = this.rowOf[ck[2]];
        const rowEl = cc.rows[ri];
        const k = (t - ck[0]) / 0.75;
        const px = (6 + ((rowEl && rowEl.indent) || 0) * 2) * CW, py = ri * LH + LH * 0.5;
        x.ring = [px, py, 0.35 + 0.9 * U.e('outCubic', k), (1 - k) * 0.95];
      }
      // banner at the end
      if (ending) {
        const k = U.e('outCubic', (t - this.endT) / 0.9);
        const top = cy - 26 * LH * 0.62;
        x.bannerR = [-1.2, top - 8 + 8 * k, 50 * CW + 30, top + 1.2 * k];
        x.bannerA = U.sat((t - this.endT) / 0.25);
      }
      // colour fringes when the camera whips
      const speed = Math.abs(S.x.v) + Math.abs(S.y.v) * 1.2 + Math.abs(S.d.v) * 0.3;
      x.chroma = U.clamp((speed - 12) / 70, 0, 0.9);
      x.cut = !!jumped;
      x.keyGlow = 1.7 + A.pulse * 0.5;
      cc.render(cam, x, t, dt);
    }
    destroy() { if (this.cc) this.cc.destroy(); }
  }
  O.registerMode('motion', Motion, { glow: false, gl: true, noIntro: true, label: 'Motion' });
})();
