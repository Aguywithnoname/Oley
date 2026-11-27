/* Editlyric scenes — the computer: a cascade of error dialogs, a spreadsheet, a terminal, a file dragged
   to the trash, a copy progress dialog and a command-bar search, on a desktop made from the cover. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, Ed = O.Ed, K = Ed.K, Shot = Ed.Shot;

  O.css('ed-desk', `
.m-ed .dk-dock { position: absolute; left: 50%; display: flex; align-items: center; gap: 1.1vmin; padding: 0.9vmin 1.2vmin; border-radius: 1.8vmin; transform: translateX(-50%);
  background: rgba(255,255,255,0.18); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); box-shadow: 0 0 0 1px rgba(255,255,255,0.18) inset, 0 1vmin 3vmin rgba(0,0,0,0.3); }
.m-ed .dk-dock i { width: 4.6vmin; height: 4.6vmin; border-radius: 1.1vmin; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2), 0 0.3vmin 0.8vmin rgba(0,0,0,0.25); }
.m-ed .dk-icon { position: absolute; display: flex; flex-direction: column; align-items: center; color: #fff; text-align: center; font: 500 var(--dki) 'Oley Sans', sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,0.6); will-change: transform; }
.m-ed .dk-icon .im { position: relative; }
.m-ed .dk-icon .lb { margin-top: 0.5em; padding: 0.1em 0.45em; border-radius: 0.35em; max-width: 12em; line-height: 1.25; }
.m-ed .dk-retro { background: #c3c3c3; color: #000; box-shadow: inset -1px -1px 0 #0a0a0a, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #dfdfdf, 0.6vmin 0.8vmin 0 rgba(0,0,0,0.35) !important; border-radius: 0 !important; font-family: Tahoma, 'Segoe UI', 'Oley Sans', sans-serif !important; }
.m-ed .dk-retro .tb { background: linear-gradient(90deg, #000080, #1084d0) !important; color: #fff; height: 1.9em !important; margin: 3px; padding: 0 0.3em 0 0.5em !important; border: 0 !important; }
.m-ed .dk-retro .tb .ctl { opacity: 1 !important; }
.m-ed .dk-retro .tb .ctl span { width: 1.25em; height: 1.1em; display: grid; place-items: center; background: #c3c3c3; color: #000; font-size: 0.8em; font-weight: 700; box-shadow: inset -1px -1px 0 #0a0a0a, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080; }
.m-ed .dk-btn { display: inline-block; padding: 0.42em 1.6em; border-radius: 0.4em; font-weight: 500; }
.m-ed .dk-retro .dk-btn { border-radius: 0; background: #c3c3c3; box-shadow: inset -1px -1px 0 #0a0a0a, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #dfdfdf; outline: 1px dotted #000; outline-offset: -5px; }
.m-ed .dk-cell { position: absolute; border-right: 1px solid #e1e1e1; border-bottom: 1px solid #e1e1e1; box-sizing: border-box; padding: 0 0.4em; white-space: nowrap; overflow: visible; display: flex; align-items: center; }
.m-ed .dk-term { font-family: var(--mono); white-space: pre-wrap; word-break: break-word; }
`);

  // ---------------------------------------------------------------- base: a desktop made from the cover
  class DeskShot extends Shot {
    constructor(host, mode, L, o, cfg) {
      super(host, mode, L, o);
      cfg = cfg || {};
      this.dark = true;
      const u = this.u, W = this.W, H = this.H;
      const wall = U.el('div', 'ed-fill', this.el);
      this.wall = K.cover(this, wall, `filter:blur(${(this.m * 0.012).toFixed(0)}px) saturate(1.3) brightness(0.85);transform:scale(1.08)`);
      const sh = U.el('div', 'ed-fill', this.el);
      sh.style.background = 'radial-gradient(ellipse 85% 70% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45))';
      if (cfg.dock !== false) {
        const dock = U.el('div', 'dk-dock', this.el);
        dock.style.bottom = H * 0.022 + 'px';
        const pal = this.pal;
        const cols = [pal.vivid, pal.second, U.shiftHue(pal.vivid, 40), U.shiftHue(pal.second, -50), [235, 235, 240], [60, 60, 70], U.shiftHue(pal.vivid, 160)];
        cols.forEach((c, i) => { const it = U.el('i', '', dock); it.style.background = `linear-gradient(160deg, ${U.rgba(U.mix(c, [255, 255, 255], 0.25), 1)}, ${U.rgba(U.mix(c, [0, 0, 0], 0.2), 1)})`; if (i === 4) it.style.marginLeft = '1.4vmin'; });
        this.dock = dock;
      }
      // top bar: a clock on the right
      const bar = U.el('div', '', this.el);
      Object.assign(bar.style, { position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(18, u * 2.2) + 'px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: u * 1.6 + 'px', padding: `0 ${u * 1.6}px`, color: '#fff', font: `500 ${Math.max(11, u * 1.15).toFixed(1)}px 'Oley Sans', sans-serif`, background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(12px)' });
      bar.innerHTML = K.icon('wifi') + K.icon('search') + '<span>' + K.esc(K.now().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) + '&nbsp;&nbsp;' + K.clock(K.now()) + '</span>';
      this.n = U.noise1(U.hash('dk' + L.i));
    }
    win(o) { return K.window(this.el, Object.assign({ fs: Math.max(12, this.u * 1.3) }, o)); }
  }
  const DK = { fam: 'desk', cams: ['still', 'push', 'drift', 'track', 'dutch'] };

  // ================================================================ 14. error dialogs pile up, one per word
  class Errors extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const u = this.u, W = this.W, H = this.H, r = this.r;
      this.retro = this.v % 2 === 1;
      const items = this.ws.length > 9 ? K.chunks(L, 8).map((c) => ({ t: c.t, text: c.text })) : this.ws.map((w) => ({ t: w.t, text: K.bare(w) }));
      const ww = Math.min(W * 0.36, u * 40), wh = u * 15.5;
      const n = items.length;
      const dx = u * 2.6, dy = u * 3;
      const x0 = W * 0.5 - ww / 2 - (dx * (n - 1)) / 2, y0 = H * 0.46 - wh / 2 - (dy * (n - 1)) / 2;
      const app = this.r.pick(['System', 'Explorer', 'Memories', 'Heart.exe', 'Finder']);
      const suf = [' could not be found.', ' is not responding.', ' was moved or deleted.', ' cannot be opened.', ' stopped working.'];
      this.wins = items.map((it, i) => {
        const w = this.win({ x: x0 + dx * i, y: y0 + dy * i, w: ww, h: wh, title: this.retro ? app : '', dark: !this.retro && this.v % 4 === 2 });
        if (this.retro) w.el.classList.add('dk-retro');
        w.el.style.opacity = '0';
        const b = w.body;
        Object.assign(b.style, { display: 'flex', gap: u * 1.6 + 'px', padding: `${u * 1.8}px ${u * 2}px`, boxSizing: 'border-box' });
        const ic = U.el('div', '', b); ic.innerHTML = K.icon(r.chance(0.6) ? 'err' : 'warn'); Object.assign(ic.style, { fontSize: u * 4 + 'px', color: ic.innerHTML.includes('M10.3') ? '#f5b400' : '#e5393b', flex: 'none' });
        const col = U.el('div', '', b); col.style.flex = '1';
        const msg = U.el('div', '', col);
        msg.innerHTML = `<b style="font-weight:700">“${K.esc(it.text)}”</b>${K.esc(r.pick(suf))}`;
        Object.assign(msg.style, { fontSize: '1.05em', lineHeight: '1.35' });
        const bt = U.el('div', '', col); bt.style.textAlign = 'right'; bt.style.marginTop = u * 1.6 + 'px';
        const ok = U.el('span', 'dk-btn', bt, 'OK');
        if (!this.retro) { ok.style.background = '#2f6bff'; ok.style.color = '#fff'; }
        return { w, t: it.t, s: r.range(0.96, 0.99) };
      });
    }
    update(t) {
      for (const it of this.wins) {
        const k = U.prog(it.t - 0.04, it.t + 0.12, t);
        it.w.el.style.opacity = k > 0 ? '1' : '0';
        it.w.el.style.transform = `scale(${(it.s + (1 - it.s) * U.e('outCubic', k)).toFixed(4)})`;
      }
    }
    focus() { const it = this.wins.filter((x) => this.mode.t >= x.t - 0.04).pop() || this.wins[0]; const e = it.w.el; return { x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2 }; }
  }
  Ed.add('errors', Errors, Object.assign({ w: 1, max: 30, vars: 4, trig: 'wrong error mistake mistakes broken break crash fail failed fault sorry lie lies lying problem problems bad again' }, DK));

  // ================================================================ 15. a spreadsheet, one word per cell
  class Sheet extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o, { dock: false });
      const u = this.u, W = this.W, H = this.H;
      const fs = Math.max(12, u * 1.35);
      const w = this.win({ x: W * 0.06, y: H * 0.07, w: W * 0.88, h: H * 0.86, title: ((this.ctx.track && this.ctx.track.title) || 'Book1') + '.xlsx', fs });
      this.w = w;
      const b = w.body;
      b.style.background = '#fff'; b.style.color = '#222';
      const tool = U.el('div', '', b);
      Object.assign(tool.style, { height: fs * 2.6 + 'px', background: '#f3f3f3', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: fs * 1.4 + 'px', padding: `0 ${fs}px`, fontSize: '0.92em', color: '#444' });
      tool.innerHTML = ['File', 'Home', 'Insert', 'Formulas', 'Data', 'View'].map((s, i) => `<span style="${i === 1 ? 'border-bottom:2px solid #1d6f42;padding-bottom:2px;color:#1d6f42;font-weight:600' : ''}">${s}</span>`).join('');
      const fb = U.el('div', '', b);
      Object.assign(fb.style, { height: fs * 2.1 + 'px', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', fontSize: '0.95em' });
      this.nameBox = U.el('div', '', fb, 'B3'); Object.assign(this.nameBox.style, { width: fs * 6 + 'px', paddingLeft: fs * 0.6 + 'px', borderRight: '1px solid #ddd', height: '100%', display: 'flex', alignItems: 'center' });
      const fx = U.el('div', '', fb); fx.innerHTML = '<i style="font-style:italic;color:#777;padding:0 0.8em;font-family:Georgia,serif">fx</i>';
      this.fbar = U.el('div', '', fb); this.fbar.style.flex = '1';
      const grid = U.el('div', '', b);
      Object.assign(grid.style, { position: 'absolute', left: 0, right: 0, top: fs * 4.7 + 'px', bottom: 0, overflow: 'hidden', fontSize: '1em' });
      this.grid = grid;
      const n = this.ws.length;
      const perRow = n > 8 ? Math.ceil(n / 2) : n;
      const cw = Math.min(fs * 9, (W * 0.88 - fs * 3) / (perRow + 2)), ch = fs * 1.9, hx = fs * 2.6;
      const cols = Math.ceil((W * 0.88) / cw) + 1;
      for (let c = 0; c < cols; c++) { const h = U.el('div', 'dk-cell', grid, String.fromCharCode(65 + (c % 26))); Object.assign(h.style, { left: hx + c * cw + 'px', top: 0, width: cw + 'px', height: ch + 'px', background: '#f3f3f3', justifyContent: 'center', color: '#555' }); }
      for (let rr = 0; rr < 30; rr++) { const h = U.el('div', 'dk-cell', grid, String(rr + 1)); Object.assign(h.style, { left: 0, top: ch + rr * ch + 'px', width: hx + 'px', height: ch + 'px', background: '#f3f3f3', justifyContent: 'center', color: '#555' }); }
      for (let rr = 0; rr < 30; rr++) for (let c = 0; c < cols; c++) { const e = U.el('div', 'dk-cell', grid); Object.assign(e.style, { left: hx + c * cw + 'px', top: ch + rr * ch + 'px', width: cw + 'px', height: ch + 'px' }); }
      this.cells = this.ws.map((w, i) => {
        const col = 1 + (i % perRow), row = 2 + Math.floor(i / perRow);
        const e = U.el('div', 'dk-cell', grid);
        Object.assign(e.style, { left: hx + col * cw + 'px', top: ch + row * ch + 'px', width: cw + 'px', height: ch + 'px', border: '0', zIndex: 2, fontWeight: w.key ? '700' : '400' });
        return { w, e, col, row, ref: String.fromCharCode(65 + col) + (row + 1) };
      });
      this.sel = U.el('div', '', grid);
      Object.assign(this.sel.style, { position: 'absolute', border: '2px solid #1d6f42', boxSizing: 'border-box', zIndex: 3, width: cw + 'px', height: ch + 'px', boxShadow: '0 0 0 1px #fff inset' });
      const hd = U.el('div', '', this.sel); Object.assign(hd.style, { position: 'absolute', right: '-4px', bottom: '-4px', width: '7px', height: '7px', background: '#1d6f42', border: '1px solid #fff' });
      this.range = U.el('div', '', grid);
      Object.assign(this.range.style, { position: 'absolute', background: 'rgba(29,111,66,0.12)', border: '1px solid #1d6f42', zIndex: 1, opacity: '0' });
      this.cw = cw; this.ch = ch; this.hx = hx; this.perRow = perRow;
      this.sp = { x: O.sp(hx + cw), y: O.sp(ch * 3) };
    }
    update(t, dt) {
      const L = this.L, cw = this.cw, ch = this.ch, hx = this.hx;
      let cur = 0;
      this.cells.forEach((c, i) => {
        const st = K.typed(K.bare(c.w), U.prog(c.w.t - 0.02, c.w.t - 0.02 + K.span(c.w), t));
        if (st.s !== c.s) { c.s = st.s; c.e.textContent = st.s; }
        if (t >= c.w.t - 0.04) cur = i;
      });
      const c = this.cells[cur];
      O.spring(this.sp.x, hx + c.col * cw, 26, dt); O.spring(this.sp.y, ch + c.row * ch, 26, dt);
      this.sel.style.transform = `translate(${this.sp.x.x.toFixed(1)}px,${this.sp.y.x.toFixed(1)}px)`;
      const done = t > L.singEnd + 0.2;
      const nb = done ? 'B3' : c.ref;
      const fv = done ? `=JOIN(" ", B3:${this.cells[this.cells.length - 1].ref})` : c.s || '';
      if (nb + fv !== this._nb) { this._nb = nb + fv; this.nameBox.textContent = nb; this.fbar.textContent = fv; }
      const k = U.prog(L.singEnd + 0.2, L.singEnd + 0.45, t);
      const rows = Math.ceil(this.cells.length / this.perRow);
      Object.assign(this.range.style, { left: hx + cw + 'px', top: ch * 3 + 'px', width: cw * Math.min(this.perRow, this.cells.length) * U.e('outCubic', k) + 'px', height: ch * rows + 'px', opacity: k > 0 ? '1' : '0' });
    }
    focus() { const g = this.grid, w = this.w.el, b = this.w.body; return { x: w.offsetLeft + b.offsetLeft + g.offsetLeft + this.sp.x.x + this.cw / 2, y: w.offsetTop + b.offsetTop + g.offsetTop + this.sp.y.x + this.ch / 2 }; }
  }
  Ed.add('sheet', Sheet, Object.assign({ w: 0.8, min: 3, max: 16, trig: 'count counting numbers money math plan business work job pay bills cost worth' }, DK));

  // ================================================================ 16. a terminal
  class Term extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const u = this.u, W = this.W, H = this.H;
      this.kind = this.v % 3;
      const fs = Math.max(13, u * 1.75);
      const ww = Math.min(W * 0.8, fs * 50), wh = H * 0.66;
      const w = this.win({ x: (W - ww) / 2, y: H * 0.13, w: ww, h: wh, dark: true, title: 'zsh — 80×24', fs: Math.max(12, u * 1.2) });
      w.el.style.background = 'rgba(16,18,24,0.94)';
      w.tb.style.background = 'rgba(40,42,50,0.96)';
      const b = w.body;
      const tx = U.el('div', 'dk-term', b);
      Object.assign(tx.style, { position: 'absolute', inset: '0', padding: `${fs * 0.8}px ${fs}px`, fontSize: fs + 'px', lineHeight: '1.42', color: '#d6dde8', overflow: 'hidden' });
      const user = String((this.ctx.track && this.ctx.track.artist) || 'you').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'you';
      const prompt = `<span style="color:#7ee787">${user}@oley</span> <span style="color:#79c0ff">~</span> % `;
      const last = new Date(K.now().getTime() - 3600e3 * 5);
      tx.innerHTML = `<span style="color:#8b949e">Last login: ${K.esc(last.toDateString())} on ttys002</span>\n` + prompt;
      const key = K.clean(K.bare(K.key(L))).toLowerCase() || 'you';
      this.pre = ['echo "', 'git commit -m "', 'grep -ri "'][this.kind];
      this.cmd = U.el('span', '', tx);
      this.car = U.el('span', '', tx, ' ');
      Object.assign(this.car.style, { background: '#d6dde8', display: 'inline-block', width: '0.6em' });
      this.out = U.el('div', '', tx);
      this.key = key;
      this.prompt = prompt;
      this.tx = tx;
      this.typos = K.pickTypos(this.ws, this.r, this.ctx.opts.typos !== false, 0.35);
    }
    update(t) {
      const L = this.L;
      const st = K.typeLine(this.ws, t, this.typos);
      const tail = this.kind === 2 ? '" ~/memories' : '"';
      const body = st.s.toLowerCase().replace(/"/g, '\\"');
      const s = this.pre + body + (t > L.singEnd ? tail : '');
      if (s !== this._s) { this._s = s; this.cmd.textContent = s; }
      const run = t > L.singEnd + 0.18;
      if (run && !this._run) {
        this._run = true;
        const txt = K.esc(K.text(L));
        if (this.kind === 0) this.out.innerHTML = txt + '\n' + this.prompt;
        else if (this.kind === 1) this.out.innerHTML = `[main ${(U.hash(L.text) >>> 0).toString(16).slice(0, 7)}] ${txt}\n 1 file changed, 1 insertion(+)\n` + this.prompt;
        else {
          const k = K.esc(this.key), files = ['2019/summer.txt', 'drafts/unsent.txt', 'notes/' + k + '.md', 'voice/' + k + '.m4a'];
          this.out.innerHTML = files.map((f) => `<span style="color:#d2a8ff">~/memories/${f}</span>: … <span style="color:#ff7b72;font-weight:700">${k}</span> …`).join('\n') + '\n' + this.prompt;
        }
        this.tx.appendChild(this.car);
      }
      const typing = this.ws.some((w) => t >= w.t - 0.05 && t <= w.t + K.span(w) + 0.05);
      this.car.style.opacity = typing || Math.floor(t * 2) % 2 === 0 ? '1' : '0';
    }
    focus() { const p = K.off(this.car, this.el); return { x: p.x, y: p.y }; }
  }
  Ed.add('term', Term, Object.assign({ w: 0.9, max: 14, vars: 3, trig: 'run running code start stop delete erase find search remember memory memories commit again' }, DK));

  // ================================================================ 17. a file, renamed to the line, dragged into the trash
  class Trash extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const u = this.u, W = this.W, H = this.H, r = this.r;
      this.el.style.setProperty('--dki', Math.max(11, u * 1.2).toFixed(1) + 'px');
      const icon = (x, y, kind, label, big) => {
        const ic = U.el('div', 'dk-icon', this.el);
        Object.assign(ic.style, { left: x + 'px', top: y + 'px', width: u * (big ? 16 : 10) + 'px' });
        const im = U.el('div', 'im', ic);
        const s = u * (big ? 8.6 : 6);
        im.style.width = s + 'px'; im.style.height = s * (kind === 'file' ? 1.25 : 0.82) + 'px';
        if (kind === 'folder') im.innerHTML = `<svg viewBox="0 0 60 48" width="100%" height="100%"><path d="M2 8a4 4 0 0 1 4-4h16l5 5h27a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#5aa2f0"/><path d="M2 15h56v27a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#7cb8f7"/></svg>`;
        else if (kind === 'trash') im.innerHTML = `<svg viewBox="0 0 48 56" width="100%" height="100%"><path d="M6 12h36l-3 40a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="rgba(235,240,248,0.85)" stroke="rgba(0,0,0,0.25)"/><path d="M14 18v31M24 18v31M34 18v31" stroke="rgba(0,0,0,0.16)" stroke-width="2"/><rect x="3" y="7" width="42" height="6" rx="2" fill="rgba(245,248,252,0.95)" stroke="rgba(0,0,0,0.25)"/><g class="pp" opacity="0"><path d="M12 9c4-8 20-8 24 0" fill="#f4f4f4" stroke="#bbb"/><path d="M16 6l8 4 9-5" stroke="#ccc" fill="none"/></g></svg>`;
        else {
          im.style.background = '#fff'; im.style.borderRadius = s * 0.06 + 'px'; im.style.boxShadow = '0 0.4vmin 1.2vmin rgba(0,0,0,0.35)'; im.style.overflow = 'hidden';
          const th = U.el('div', '', im); Object.assign(th.style, { position: 'absolute', left: '8%', right: '8%', top: '8%', height: '55%', overflow: 'hidden', borderRadius: '2px' }); K.cover(this, th);
          for (let i = 0; i < 4; i++) { const l = U.el('div', '', im); Object.assign(l.style, { position: 'absolute', left: '10%', width: (40 + ((i * 37) % 45)) + '%', top: 70 + i * 7 + '%', height: '3%', background: '#d8d8d8' }); }
        }
        const lb = U.el('div', 'lb', ic, label);
        return { ic, im, lb };
      };
      const names = ['Photos', 'Old', 'Drafts', 'Untitled', 'Voice notes', 'Backups'];
      for (let i = 0; i < 5; i++) icon(W - u * 13, H * 0.08 + i * u * 11, 'folder', names[(i + r.int(0, 5)) % names.length]);
      this.tr = icon(W - u * 14, H - u * 18, 'trash', 'Trash');
      this.file = icon(W * 0.42, H * 0.36, 'file', '', true);
      const lb = this.file.lb;
      lb.style.background = '#2f6bff'; lb.style.textShadow = 'none'; lb.style.fontSize = '1.25em';
      this.words = K.wordEls(lb, this.ws);
      this.ext = U.el('span', '', lb, '.jpg'); this.ext.style.opacity = '0.75';
      this.lb = lb;
      this.ptr = K.pointer(this.el, Math.max(16, u * 2.3));
      this.p0 = { x: W * 0.8, y: H * 0.9 };
      this.fx = W * 0.42; this.fy = H * 0.36;
    }
    update(t) {
      const L = this.L, u = this.u, W = this.W, H = this.H;
      K.wordAnim(this.words, t, 0.15, (it, p, el) => { el.style.opacity = p > 0 ? '1' : '0'; });
      const f = U.clamp((this.tail + 0.35) / 1.35, 0.4, 1), s = L.singEnd - 0.35 * f;
      const a1 = U.e('inOutCubic', U.prog(s, s + 0.35 * f, t)), drag = U.e('inOutCubic', U.prog(s + 0.42 * f, s + 1.05 * f, t)), drop = U.prog(s + 1.05 * f, s + 1.3 * f, t);
      const fc = { x: this.fx + u * 8, y: this.fy + u * 5 };
      const tc = { x: W - u * 9, y: H - u * 14 };
      let px = U.lerp(this.p0.x, fc.x, a1), py = U.lerp(this.p0.y, fc.y, a1);
      if (drag > 0) { px = U.lerp(fc.x, tc.x, drag); py = U.lerp(fc.y, tc.y, drag) - Math.sin(Math.PI * drag) * H * 0.08; }
      this.ptr.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
      this.ptr.style.opacity = t > s - 0.1 ? '1' : '0';
      if (t > s + 0.3 * f) this.lb.style.background = 'transparent';
      const lift = U.prog(s + 0.32 * f, s + 0.45 * f, t);
      this.file.ic.style.transform = `translate(${((px - fc.x) * (drag > 0 ? 1 : 0)).toFixed(1)}px,${((py - fc.y) * (drag > 0 ? 1 : 0)).toFixed(1)}px) scale(${(1 + 0.05 * lift - 0.85 * drop).toFixed(3)})`;
      this.file.ic.style.opacity = (1 - drop).toFixed(3);
      this.file.ic.style.filter = lift > 0 && drop < 1 ? `drop-shadow(0 ${(u * 1.4).toFixed(1)}px ${(u * 1.6).toFixed(1)}px rgba(0,0,0,0.35))` : '';
      const full = drop > 0.6;
      if (full !== this._full) { this._full = full; const g = this.tr.im.querySelector('.pp'); if (g) g.setAttribute('opacity', full ? '1' : '0'); }
      this.tr.ic.style.transform = `scale(${(1 + 0.12 * Math.sin(Math.PI * drop)).toFixed(3)})`;
    }
    focus() { return { x: this.fx + this.u * 8, y: this.fy + this.u * 9 }; }
  }
  Ed.add('trash', Trash, Object.assign({ w: 0.9, max: 10, needTrig: true, trig: 'delete throw trash away forget forgot gone lose lost bin erase done over past old goodbye' }, DK));

  // ================================================================ 18. a copy / upload in progress
  class Progress extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const u = this.u, W = this.W, H = this.H;
      this.up = this.v % 2 === 1;
      const ww = Math.min(W * 0.5, u * 52), wh = u * 19;
      const w = this.win({ x: (W - ww) / 2, y: H * 0.38 - wh / 2, w: ww, h: wh, title: this.up ? 'Uploading' : 'Copy', fs: Math.max(12, u * 1.35) });
      this.w = w;
      const b = w.body;
      Object.assign(b.style, { display: 'flex', gap: u * 2.2 + 'px', padding: `${u * 2.2}px ${u * 2.6}px`, boxSizing: 'border-box' });
      const ic = U.el('div', '', b); Object.assign(ic.style, { position: 'relative', width: u * 6.4 + 'px', height: u * 8 + 'px', flex: 'none', background: '#fff', borderRadius: '3px', boxShadow: '0 0.3vmin 1vmin rgba(0,0,0,0.25)', overflow: 'hidden' });
      const th = U.el('div', '', ic); Object.assign(th.style, { position: 'absolute', inset: '8%', bottom: '30%', overflow: 'hidden' }); K.cover(this, th);
      const col = U.el('div', '', b); col.style.flex = '1'; col.style.minWidth = '0';
      const to = (this.ctx.track && this.ctx.track.artist) || 'Backup';
      const hd = U.el('div', '', col); hd.innerHTML = (this.up ? 'Uploading to ' : 'Copying to ') + '<b>' + K.esc(to) + '</b>'; hd.style.fontSize = '0.95em'; hd.style.opacity = '0.75';
      const nm = U.el('div', '', col); Object.assign(nm.style, { fontSize: '1.3em', fontWeight: 700, marginTop: '0.3em', lineHeight: '1.25' });
      this.words = K.wordEls(nm, this.ws);
      const bar = U.el('div', '', col); Object.assign(bar.style, { position: 'relative', height: u * 0.9 + 'px', borderRadius: '99px', background: 'rgba(0,0,0,0.1)', marginTop: u * 1.4 + 'px', overflow: 'hidden' });
      this.fill = U.el('div', '', bar); Object.assign(this.fill.style, { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: '99px', background: 'linear-gradient(90deg,#2f6bff,#5b8cff)' });
      this.info = U.el('div', '', col); Object.assign(this.info.style, { fontSize: '0.9em', opacity: '0.65', marginTop: '0.5em', fontVariantNumeric: 'tabular-nums' });
      this.size = this.r.range(40, 900);
      this.nm = nm;
    }
    update(t) {
      const L = this.L;
      K.wordAnim(this.words, t, 0.2);
      const p = U.e('inOutSine', U.prog(L.t - 0.1, L.singEnd + 0.25, t));
      this.fill.style.width = (p * 100).toFixed(2) + '%';
      const done = p >= 1;
      const s = done ? 'Done ✓' : `${(this.size * p).toFixed(1)} MB of ${this.size.toFixed(1)} MB — about ${Math.max(1, Math.ceil((L.singEnd - t) + 0.3))} seconds`;
      if (s !== this._s) { this._s = s; this.info.textContent = s; this.info.style.color = done ? '#1f9d55' : ''; this.info.style.opacity = done ? '1' : '0.65'; }
      this.w.el.style.height = Math.max(this.u * 19, this.nm.offsetHeight + this.u * 14) + 'px';
    }
    focus() { const e = this.w.el; return { x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2 }; }
  }
  Ed.add('progress', Progress, Object.assign({ w: 0.9, max: 14, vars: 2, trig: 'wait waiting loading slowly slow almost soon getting copy send sending sent upload' }, DK));

  // ================================================================ 19. command-bar search over the desktop
  class Spot extends DeskShot {
    constructor(host, mode, L, o) {
      super(host, mode, L, o);
      const u = this.u, W = this.W, H = this.H;
      const pw = Math.min(W * 0.56, u * 62);
      const p = U.el('div', '', this.el);
      Object.assign(p.style, { position: 'absolute', left: (W - pw) / 2 + 'px', top: H * 0.2 + 'px', width: pw + 'px', borderRadius: u * 1.8 + 'px', overflow: 'hidden',
        background: 'rgba(236,236,240,0.78)', backdropFilter: 'blur(30px) saturate(1.6)', WebkitBackdropFilter: 'blur(30px) saturate(1.6)', boxShadow: '0 3vmin 8vmin rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.3) inset', color: '#111', fontFamily: "'Oley Sans', sans-serif" });
      this.panel = p;
      const f = U.el('div', '', p);
      Object.assign(f.style, { display: 'flex', alignItems: 'center', gap: u * 1.4 + 'px', padding: `${u * 1.6}px ${u * 2}px`, fontSize: u * 3 + 'px', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden' });
      const ic = U.el('span', '', f); ic.innerHTML = K.icon('search'); ic.style.opacity = '0.5';
      const tb = U.el('span', '', f); tb.style.flex = '1'; tb.style.overflow = 'hidden'; tb.style.direction = 'rtl'; tb.style.textAlign = 'left';
      const inner = U.el('span', '', tb); inner.style.direction = 'ltr'; inner.style.unicodeBidi = 'plaintext';
      this.el.style.setProperty('--caret', '#2f6bff');
      this.typos = K.pickTypos(this.ws, this.r, this.ctx.opts.typos !== false, 0.4);
      this.ty = K.typer(inner, this.ws, this.typos);
      this.list = U.el('div', '', p);
      Object.assign(this.list.style, { borderTop: '1px solid rgba(0,0,0,0.1)', padding: `${u * 0.8}px ${u * 0.8}px ${u * 1.2}px`, fontSize: u * 1.45 + 'px', display: 'none' });
      const tr = this.ctx.track || {};
      this.rows = [
        { sec: 'Top Hit', ic: 'cover', main: tr.title || 'Song', sub: tr.artist || '' },
        { sec: 'Documents', ic: 'file', main: '{q}.txt', sub: 'Documents' },
        { sec: 'Messages', ic: 'chat', main: '“{q}”', sub: U.firstName(tr.artist) || 'Messages' },
        { sec: 'Web', ic: 'globe', main: 'Search the web for “{q}”', sub: '' },
      ].map((d) => {
        const s = U.el('div', '', this.list, d.sec); Object.assign(s.style, { fontSize: '0.78em', fontWeight: 600, opacity: '0.5', padding: '0.7em 0.8em 0.3em' });
        const rw = U.el('div', '', this.list); Object.assign(rw.style, { display: 'flex', alignItems: 'center', gap: '0.8em', padding: '0.5em 0.8em', borderRadius: '0.6em' });
        const i = U.el('div', '', rw); Object.assign(i.style, { position: 'relative', width: '2.1em', height: '2.1em', borderRadius: '0.45em', overflow: 'hidden', flex: 'none', display: 'grid', placeItems: 'center', background: d.ic === 'cover' ? '' : 'rgba(0,0,0,0.08)', fontSize: '1em' });
        if (d.ic === 'cover') K.cover(this, i); else i.innerHTML = K.icon(d.ic);
        const tx = U.el('div', '', rw); tx.style.flex = '1'; tx.style.overflow = 'hidden'; tx.style.whiteSpace = 'nowrap'; tx.style.textOverflow = 'ellipsis';
        const sub = U.el('span', '', rw, d.sub); sub.style.opacity = '0.5'; sub.style.fontSize = '0.85em';
        return { d, rw, tx };
      });
    }
    update(t, dt, A) {
      const L = this.L;
      const st = this.ty.update(t);
      const q = st.s;
      const show = q.length > 1;
      this.list.style.display = show ? '' : 'none';
      if (q !== this._q) { this._q = q; this.rows.forEach((r) => { r.tx.textContent = r.d.main.replace('{q}', q.toLowerCase()); }); }
      let sel = 0;
      if (t > L.singEnd + 0.15) sel = Math.min(3, Math.floor((t - L.singEnd - 0.15) / 0.35) + 1);
      this.rows.forEach((r, i) => { const on = i === sel; if (on !== r.on) { r.on = on; r.rw.style.background = on ? '#2f6bff' : ''; r.rw.style.color = on ? '#fff' : ''; } });
      this.panel.style.transform = `scale(${(1 + A.pulse * 0.004).toFixed(4)})`;
      void dt;
    }
    focus() { const p = this.panel; return { x: p.offsetLeft + p.offsetWidth / 2, y: p.offsetTop + this.u * 4 }; }
  }
  Ed.add('spot', Spot, Object.assign({ w: 1, max: 12, trig: 'find search looking where what who know' }, DK));
})();
