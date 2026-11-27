/* Oley · Glass shots: the song as a polished app ad. It opens on a phone working out what's playing
   ("what song is playing?" typed on frosted glass, a blob, the listening circles, then the real cover,
   title and artist on a result card), dives into the cover, and runs the lyrics like a music app: lines
   scrolling over the blurred cover, or rolling round a drum. Between runs, a moment of UI per line: a
   search with track cards and a pointer that clicks one, frosted typing, a social post, a curved stage
   with the key word boxed, a search bar and a spinning record, a call pill, a notebook where the key
   word burns, a torn-paper iris on a pixel word, fire with the letters flying, an eyeball under a line
   of text, ghost type, an ink blot, a row of buttons clicked word by word, a map drawing a route, a phone
   with a ring round it, a cloudy sky, and the title as a logo. */
(function () {
  'use strict';
  const O = window.Oley;
  const Gk = O.Glass, Wk = O.Warp;
  const PI = Math.PI;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const eo = (u) => 1 - Math.pow(1 - cl(u, 0, 1), 3);
  const outBack = (k) => { k = cl(k, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const rgba = Wk.rgba;
  const BIG = 30;
  const fill = (g, col) => { g.fillStyle = rgba(col); g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2); };
  const low = (w) => (w.lo || w.txt.toLowerCase());
  const bare = (w) => low(w).replace(/[.,;:!?]+$/, '');
  const shown = (ws, t) => { let n = 0; for (const w of ws) if (t >= w.t - 0.04) n++; return n; };
  const prog = (w, t) => cl((t - w.t) / cl(w.end - w.t, 0.12, 0.8), 0, 1);
  const typed = (ws, t) => {
    const out = [];
    for (const w of ws) { if (t < w.t - 0.03) break; const s = low(w); out.push(s.slice(0, Math.max(1, Math.ceil(s.length * cl((t - w.t + 0.03) / cl((w.end - w.t) * 0.8, 0.1, 0.6), 0, 1))))); }
    return out.join(' ');
  };
  const lastKey = (ws) => { let k = ws.findIndex((w) => w.key); if (k < 0) k = ws.length - 1; return k; };
  const drift = (env, z1, r) => (lt) => { const k = lt / Math.max(0.5, env.dur); return { x: Math.sin(lt * 0.4 + env.ph) * 0.004, y: 0, z: 1 + (z1 || 0.05) * k, r: (r || 0) * (k - 0.5) }; };
  const title = (env) => (env.track && env.track.title) || 'Untitled';
  const artist = (env) => (env.track && (env.track.artist || env.track.artists)) || 'Oley';
  // the song's lines, in order, from the shots that have words
  const lineList = (env) => {
    const S = env.eng.shots, L = [];
    let me = -1;
    for (let i = 0; i < S.length; i++) if (S[i].ws && S[i].ws.length && !S[i].quiet) { if (i === env.idx) me = L.length; L.push(S[i]); }
    return { L, me };
  };
  const ACC = { blue: [20, 70, 240], orange: [252, 82, 10], purple: [134, 52, 210], green: [40, 200, 100] };

  const SH = {};

  // ---------------------------------------------------------------- the phone working out what's playing, then the real track
  SH.listen = (env) => {
    const D = Math.max(1.2, env.dur), long = D > 3.2;
    const P = long ? { blob: [0, 0.22], ask: [0.12, 0.5], dots: [0.48, 0.6], circ: [0.58, 0.84], card: [0.8, 1] } : { blob: [-1, -1], ask: [-1, -1], dots: [-1, -1], circ: [0, 0.6], card: [0.55, 1] };
    const ask = ['What', 'song', 'is', 'playing?'];
    const inn = (p, u) => u >= p[0] && u < p[1];
    return {
      bg: [12, 18, 60],
      anchors: [{ x: 0, y: -0.06, col: [20, 20, 26] }],
      portal: { x: 0, y: -0.06, r: 0.09, sq: true },
      cam: (lt) => { const u = lt / D; return { x: 0, y: 0, z: 1 + 0.06 * u + (inn(P.circ, u) ? 0.08 * Math.sin((u - P.circ[0]) / (P.circ[1] - P.circ[0]) * PI) : 0), r: 0 }; },
      fx: (lt) => { const u = lt / D; for (const p of [P.dots[1], P.circ[0], P.card[0]]) if (p > 0 && Math.abs(u - p) * D < 0.12) return { def: 1 - Math.abs(u - p) * D / 0.12 }; return null; },
      draw(g, lt, F) {
        const u = lt / D;
        if (u < P.circ[0]) {
          Gk.frost(g, env.asp, F.t);
          if (inn(P.blob, u)) { const k = (u - P.blob[0]) / (P.blob[1] - P.blob[0]); Gk.blob(g, -0.35 + k * 0.32, -0.08 + Math.sin(k * 3) * 0.05, 0.05 + k * 0.03, F.t, [20, 60, 240]); }
          if (inn(P.ask, u)) {
            const k = (u - P.ask[0]) / (P.ask[1] - P.ask[0]);
            const n = Math.min(ask.length, Math.floor(k * ask.length * 1.25) + 1), size = 0.06;
            const full = ask.join(' '), w = Gk.measure(full, size, { w: 500 });
            let x = -w / 2;
            ask.forEach((s, i) => {
              const m = Gk.measure(s + ' ', size, { w: 500 });
              if (i < n) { const age = k * ask.length * 1.25 - i; Gk.txt(g, s, x, 0, size, i === n - 1 && n < ask.length + 1 && age < 1.2 ? ACC.blue : [16, 16, 24], { w: i === n - 1 && age < 1.2 ? 700 : 500, blur: Math.max(0, 1 - age * 2.5) * 10, a: Math.min(1, age * 3) }); }
              x += m;
            });
          }
          if (inn(P.dots, u)) {
            const k = (u - P.dots[0]) / (P.dots[1] - P.dots[0]);
            for (let i = 0; i < 4; i++) { g.fillStyle = 'rgb(8,8,12)'; g.beginPath(); g.arc((i - 1.5) * 0.12 * (1 + k), Math.sin(k * 12 + i) * 0.02, 0.022, 0, PI * 2); g.fill(); }
          }
          return;
        }
        // listening: rings of blue breathing with the music
        const bg = g.createRadialGradient(0, 0, 0.05, 0, 0, 1.1);
        bg.addColorStop(0, 'rgb(20,60,220)'); bg.addColorStop(0.5, 'rgb(8,24,110)'); bg.addColorStop(1, 'rgb(2,4,20)');
        g.fillStyle = bg; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const kc = inn(P.circ, u) || u >= P.circ[1] ? (u - P.circ[0]) / (P.circ[1] - P.circ[0]) : 0;
        const breathe = 1 + 0.06 * Math.sin(F.t * 5) + 0.08 * F.pulse;
        for (let i = 5; i >= 1; i--) { g.fillStyle = 'rgba(40,110,255,' + (0.16 + 0.08 * (5 - i)) + ')'; g.beginPath(); g.arc(0, -0.06, 0.07 * i * breathe * (0.6 + 0.4 * eo(kc * 3)), 0, PI * 2); g.fill(); }
        const cardK = eo((u - P.card[0]) / (P.card[1] - P.card[0]));
        if (cardK < 1) {
          g.save(); g.globalAlpha = 1 - cardK;
          g.fillStyle = 'rgb(255,255,255)'; g.beginPath(); g.arc(0, -0.06, 0.07, 0, PI * 2); g.fill();
          Gk.icon(g, 'wave', 0, -0.06, 0.09, [20, 70, 240]);
          Gk.txt(g, 'Listening', -0.03, 0.12, 0.03, [255, 255, 255], { w: 600, align: 'center' });
          for (let i = 0; i < 3; i++) { const h = 0.008 + (F.level || 0.4) * 0.02 * (0.5 + 0.5 * Math.sin(F.t * 9 + i * 2)); g.fillStyle = '#fff'; g.fillRect(0.045 + i * 0.012, 0.12 - h / 2, 0.006, h); }
          g.restore();
        }
        if (cardK > 0) {
          // the result: the real cover, title and artist
          g.save(); g.globalAlpha = cardK;
          g.fillStyle = 'rgba(0,0,0,' + 0.55 * cardK + ')'; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
          const y = 0.05 + (1 - cardK) * 0.3, s = 0.26;
          g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30;
          Gk.art(g, env.img, 0, y - 0.12, s, 0.025, env.pal.vivid);
          g.shadowColor = 'transparent';
          Gk.txt(g, title(env), 0, y + 0.08, 0.04, [255, 255, 255], { w: 700, align: 'center' });
          Gk.txt(g, artist(env), 0, y + 0.13, 0.026, [190, 190, 200], { w: 500, align: 'center' });
          g.restore();
        }
      },
    };
  };

  // ---------------------------------------------------------------- the lyrics, music-app style, scrolling over the blurred cover
  SH.lyrics = (env) => {
    const sh0 = env.eng.shots[env.idx], tilt = !!(sh0 && sh0.run % 2 === 1);
    const size = 0.078, lead = 1.18, maxW = Math.min(env.asp * 0.84, 1.45), x0 = -maxW / 2;
    const fo = { w: 700 };
    const lay = (sh) => Gk.wrap(sh.ws.map((w) => ({ s: low(w), w })), size, maxW, fo);
    return {
      bg: [20, 16, 24],
      anchors: [{ x: 0, y: 0.42, col: [20, 16, 24] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1.02, r: tilt ? -0.06 : 0 }),
      draw(g, lt, F) {
        Gk.coverBg(g, env.img, env.asp, F.t, 0.42, env.pal.dark);
        const { L, me } = lineList(env);
        if (me < 0) return;
        // where each line sits; the list slides up one line as this shot starts
        const rows = L.map((sh, j) => (Math.abs(j - me) <= 4 ? lay(sh) : null));
        const hOf = (j) => (rows[j] ? rows[j].length * size * lead + size * 0.6 : 0);
        const scroll = (1 - eo(lt / 0.5)) * (me > 0 ? hOf(me - 1) : 0);
        let y = -0.08 + scroll;
        const ys = {};
        ys[me] = y;
        for (let j = me - 1, yy = y; j >= me - 4 && j >= 0; j--) { yy -= hOf(j); ys[j] = yy; }
        for (let j = me + 1, yy = y + hOf(me); j <= me + 4 && j < L.length; j++) { ys[j] = yy; yy += hOf(j); }
        if (tilt) g.transform(1, 0, -0.12, 1, 0, 0);
        for (const k in ys) {
          const j = +k, R = rows[j];
          if (!R) continue;
          const d = j - me, past = d < 0;
          const a = d === 0 ? 1 : Math.max(0.08, 0.42 - Math.abs(d) * 0.08);
          const blur = d === 0 ? 0 : Math.min(6, Math.abs(d) * 1.6);
          R.forEach((row, ri) => {
            const yy = ys[j] + ri * size * lead;
            if (yy < -0.8 || yy > 0.8) return;
            if (d !== 0) { Gk.txt(g, row.map((it) => it.s).join(' '), x0, yy, size, [255, 255, 255], { w: 700, a, blur }); return; }
            for (const it of row) {
              const p = F.t >= it.w.t - 0.02 ? 0.35 + 0.65 * prog(it.w, F.t) : 0.35;
              Gk.txt(g, it.s, x0 + it.x, yy, size, [255, 255, 255], { w: 700, a: p });
            }
          });
        }
      },
    };
  };

  // ---------------------------------------------------------------- the lyrics rolling round a drum
  SH.drum = (env) => {
    const size = 0.085, step = 0.55, R0 = 0.24;
    const fo = { w: 700, f: 'round' };
    return {
      bg: [26, 10, 18],
      anchors: [{ x: 0, y: 0.42, col: [26, 10, 18] }],
      cam: drift(env, 0.04, 0.02),
      draw(g, lt, F) {
        Gk.coverBg(g, env.img, env.asp, F.t, 0.55, [90, 20, 40]);
        const { L, me } = lineList(env);
        if (me < 0) return;
        const roll = (1 - eo(lt / 0.42)) * step;
        for (let d = -2; d <= 2; d++) {
          const j = me + d;
          if (j < 0 || j >= L.length) continue;
          const a = d * step - roll;
          if (Math.abs(a) > PI / 2 - 0.05) continue;
          const y = Math.sin(a) * R0 * 1.6, sy = Math.cos(a), al = Math.pow(Math.cos(a), 2.5);
          const ws = L[j].ws, txt = ws.map(low).join(' ');
          const sz = Math.min(size, (env.asp * 0.9) / Math.max(1, Gk.measure(txt, 1, fo)));
          const w = Gk.measure(txt, sz, fo);
          g.save(); g.translate(0, y); g.scale(1, sy);
          // bend a little as it rolls
          let x = -w / 2;
          if (d !== 0) Gk.txt(g, txt, x, 0, sz, [255, 255, 255], { w: 700, f: 'round', a: al, blur: Math.abs(a) * 4 });
          else ws.forEach((wd) => {
            const s = low(wd), m = Gk.measure(s + ' ', sz, fo);
            const p = F.t >= wd.t - 0.02 ? 0.4 + 0.6 * prog(wd, F.t) : 0.4;
            const bend = Math.sin(a) * ((x + m / 2) / Math.max(0.1, w / 2)) ** 2 * 0.04;
            Gk.txt(g, s, x, -bend, sz, [255, 255, 255], { w: 700, f: 'round', a: al * p, blur: Math.abs(a) > 0.05 ? Math.abs(a) * 4 : 0, shadow: 'rgba(0,0,0,0.4)', shadowBlur: 10 });
            x += m;
          });
          g.restore();
        }
      },
    };
  };

  // ---------------------------------------------------------------- a search, the results as track cards, a pointer that clicks one
  SH.search = (env) => {
    const { R } = env;
    const acc = env.sc.acc;
    const pick = R.i(0, 2);
    const cards = [
      { t: title(env), s: artist(env), d: '2:' + (10 + R.i(0, 49)) },
      { t: (env.prev && env.prev.length ? env.prev : env.ws).map(bare).join(' '), s: artist(env), d: '2:' + (10 + R.i(0, 49)) },
      { t: (env.next && env.next.length ? env.next : env.ws).map(bare).join(' '), s: artist(env), d: '3:0' + R.i(0, 9) },
    ];
    const done = () => { const w = env.ws[env.ws.length - 1]; return w ? w.t + 0.15 : env.t0 + 1; };
    const qW = Math.min(env.asp * 0.6, 0.9);
    return {
      bg: [40, 42, 48],
      anchors: [{ x: 0, y: 0.45, col: [30, 32, 36] }],
      cam: (lt) => { const t = env.t0 + lt, k = ss(done(), done() + 0.4, t); return { x: 0, y: -0.02 * k, z: 1 + 0.06 * k, r: 0 }; },
      draw(g, lt, F) {
        Gk.coverBg(g, env.img, env.asp, F.t, 0.62, [60, 60, 70]);
        const t = F.t, k = ss(done() - 0.1, done() + 0.3, t);
        const qy = -0.3 + (1 - k) * 0.28;
        g.fillStyle = 'rgba(30,32,36,0.85)'; Wk.rr(g, -qW / 2, qy - 0.032, qW, 0.064, 0.032); g.fill();
        Gk.icon(g, 'search', -qW / 2 + 0.035, qy, 0.04, [180, 180, 190]);
        const q = typed(env.ws, t);
        const qs = Math.min(0.032, (qW - 0.09) / Math.max(1, Gk.measure(q, 1, { w: 500 })));
        const qw = Gk.txt(g, q, -qW / 2 + 0.065, qy + 0.002, qs, [235, 235, 240], { w: 500 });
        if (k < 0.5 && (t * 2) % 1 < 0.6) { g.fillStyle = rgba(acc); g.fillRect(-qW / 2 + 0.07 + qw, qy - 0.018, 0.003, 0.036); }
        if (k <= 0) return;
        const cw = Math.min(env.asp * 0.62, 0.95), ch = 0.13, gap = 0.025;
        cards.forEach((c, i) => {
          const a = eo((t - done() - i * 0.08) / 0.35);
          if (a <= 0) return;
          const y = -0.15 + i * (ch + gap) + (1 - a) * 0.08;
          const sel = i === pick && t > done() + 0.9;
          const grow = sel ? eo((t - done() - 0.9) / 0.3) * 0.04 : 0;
          g.save(); g.globalAlpha = a;
          g.filter = a < 1 ? 'blur(' + (1 - a) * 8 + 'px)' : 'none';
          g.fillStyle = sel ? 'rgba(20,20,22,0.96)' : 'rgba(24,24,28,0.78)';
          Wk.rr(g, -cw / 2 - grow / 2, y - grow / 2, cw + grow, ch + grow, 0.02); g.fill();
          if (sel) { g.strokeStyle = rgba(acc, 0.7); g.lineWidth = 0.003; g.stroke(); }
          Gk.art(g, env.img, -cw / 2 + 0.075, y + ch / 2, ch * 0.72, 0.012, env.pal.vivid);
          g.save(); g.beginPath(); g.rect(-cw / 2 + 0.13, y, cw - 0.25, ch); g.clip();
          Gk.txt(g, c.t.toUpperCase(), -cw / 2 + 0.135, y + ch * 0.32, 0.03, [255, 255, 255], { w: 700 });
          Gk.txt(g, c.s, -cw / 2 + 0.135, y + ch * 0.58, 0.02, [170, 170, 180], { w: 500 });
          g.restore();
          Gk.txt(g, c.d, cw / 2 - 0.03, y + ch * 0.32, 0.02, [170, 170, 180], { w: 500, align: 'right' });
          if (sel) {
            const p = ((t - done()) * 0.12) % 1;
            g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(-cw / 2 + 0.135, y + ch * 0.82, cw * 0.62, 0.004);
            g.fillStyle = rgba(acc); g.fillRect(-cw / 2 + 0.135, y + ch * 0.82, cw * 0.62 * p, 0.004);
            Gk.icon(g, 'play', -cw / 2 + 0.135 + cw * 0.31, y + ch * 0.7, 0.03, [255, 255, 255]);
          }
          g.restore();
        });
        // the pointer drifts to the card it picks, and clicks
        const ct = t - done();
        if (ct > 0.2) {
          const tx = cw * 0.12, ty = -0.15 + pick * (ch + gap) + ch * 0.55;
          const m = eo((ct - 0.2) / 0.6), sx = env.asp * 0.35, sy = 0.4;
          Gk.cursor(g, sx + (tx - sx) * m, sy + (ty - sy) * m, 0.045, ct > 0.85 && ct < 1.0);
        }
      },
    };
  };

  // ---------------------------------------------------------------- frosted glass, the line blurring in a word at a time, the newest word blue
  SH.frost = (env) => {
    const size = Math.min(0.075, env.asp * 0.8 / Math.max(1, Gk.measure(env.ws.map(low).join(' '), 1, { w: 600 })));
    return {
      bg: [228, 232, 250],
      anchors: [{ x: 0, y: 0.4, col: [228, 232, 250] }],
      cam: drift(env, 0.08),
      draw(g, lt, F) {
        Gk.frost(g, env.asp, F.t);
        const n = shown(env.ws, F.t);
        Gk.blob(g, -env.asp * 0.3 + Math.sin(F.t * 0.6) * 0.05, -0.22, 0.04, F.t, ACC.blue);
        const words = env.ws.map(low);
        const full = Gk.measure(words.join(' '), size, { w: 600 });
        let x = -full / 2;
        words.forEach((s, i) => {
          const m = Gk.measure(s + ' ', size, { w: 600 });
          if (i < n) {
            const age = F.t - env.ws[i].t, newest = i === n - 1;
            Gk.txt(g, s, x, (1 - eo(age / 0.25)) * 0.03, size, newest ? ACC.blue : [16, 16, 26], { w: newest ? 700 : 600, blur: Math.max(0, 1 - age / 0.2) * 12, a: Math.min(1, age / 0.12 + 0.2) });
          }
          x += m;
        });
      },
    };
  };

  // ---------------------------------------------------------------- a social post: the line typed in, the key word boxed as we lean in
  SH.post = (env) => {
    const { R } = env;
    const card = document.createElement('canvas');
    let key = '';
    const k = lastKey(env.ws), kw = env.ws[k];
    const handle = '@' + String(artist(env)).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14);
    const purple = ACC.purple;
    return {
      bg: [10, 10, 12],
      anchors: [{ x: 0, y: 0.46, col: [10, 10, 12] }],
      cam: (lt) => { const t = env.t0 + lt, z = ss(kw.t - 0.2, kw.t + 0.4, t); return { x: -0.04 * z, y: -0.17 * z, z: 1 + 0.75 * z, r: -0.04 * z }; },
      draw(g, lt, F) {
        fill(g, [10, 10, 12]);
        const H = Math.round(F.H * 0.9), Wc = Math.round(H * 0.82);
        const s = typed(env.ws, F.t), boxed = F.t > kw.t + 0.05;
        if (key !== s + boxed + H) {
          key = s + boxed + H;
          card.width = Wc; card.height = H;
          const x = card.getContext('2d');
          x.fillStyle = 'rgb(18,18,20)'; Wk.rr(x, 0, 0, Wc, H, H * 0.04); x.fill();
          const u = H / 100;
          x.save(); x.beginPath(); x.arc(u * 8, u * 8, u * 4.5, 0, PI * 2); x.clip(); if (env.img) x.drawImage(env.img, u * 3.5, u * 3.5, u * 9, u * 9); else { x.fillStyle = '#888'; x.fill(); } x.restore();
          const nw = Gk.txt(x, String(artist(env)), u * 15, u * 6.4, u * 3.4, [255, 255, 255], { w: 700 });
          x.fillStyle = 'rgb(29,155,240)'; x.beginPath(); x.arc(u * 17 + nw, u * 6.4, u * 1.6, 0, PI * 2); x.fill();
          x.strokeStyle = '#fff'; x.lineWidth = u * 0.5; x.beginPath(); x.moveTo(u * 16.2 + nw, u * 6.5); x.lineTo(u * 16.9 + nw, u * 7.2); x.lineTo(u * 18 + nw, u * 5.8); x.stroke();
          Gk.txt(x, handle + ' · 2h', u * 15, u * 10, u * 2.8, [130, 130, 140], { w: 500 });
          // the text, wrapped; the key word in a box once it's sung
          const words = s.split(' '), size = u * 4.6;
          const rows = Gk.wrap(words.map((q) => ({ s: q })), size, Wc - u * 10, { w: 500 });
          rows.forEach((row, ri) => row.forEach((it) => {
            const yy = u * 20 + ri * size * 1.3;
            const isKey = boxed && it.s.replace(/[.,;:!?]+$/, '') === bare(kw);
            if (isKey) { x.fillStyle = rgba(purple); Wk.rr(x, u * 4 + it.x - u * 0.8, yy - size * 0.68, it.m + u * 1.6, size * 1.36, u * 0.8); x.fill(); }
            Gk.txt(x, it.s, u * 4 + it.x, yy, size, [255, 255, 255], { w: 500 });
          }));
          const my = u * 22 + rows.length * size * 1.3;
          x.save(); Wk.rr(x, u * 4, my, Wc - u * 8, H - my - u * 12, u * 2.5); x.clip();
          if (env.img) x.drawImage(env.img, u * 4, my - (Wc - u * 8 - (H - my - u * 12)) / 2, Wc - u * 8, Wc - u * 8); else { x.fillStyle = 'rgb(120,60,160)'; x.fillRect(0, 0, Wc, H); }
          x.restore();
          [['♡', ' 2.4K'], ['↻', ' 318'], ['💬', ' 96']].forEach(([ic, n], i) => Gk.txt(x, ic + n, u * 6 + i * u * 22, H - u * 5.5, u * 2.8, [140, 140, 150], { w: 500 }));
        }
        const w = 0.62, tl = 0.35 * (1 - eo(lt / 0.6));
        g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40;
        Wk.warp(g, { c: card, w: card.width, h: card.height }, 0, 0.02, w, 'persp', tl, 0);
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a curved stage, the line sliding across it, the key word boxed
  SH.stage = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    const purple = env.sc.acc[0] > 150 && env.sc.acc[2] > 150 ? env.sc.acc : ACC.purple;
    return {
      bg: [4, 4, 6],
      anchors: [{ x: 0, y: -0.05, col: [4, 4, 6] }],
      cam: drift(env, 0.12),
      draw(g, lt, F) {
        fill(g, [4, 4, 6]);
        // the purple floor and the dark convex screen above it
        const fl = g.createLinearGradient(0, 0.1, 0, 0.5);
        fl.addColorStop(0, rgba(mix(purple, [0, 0, 0], 0.3))); fl.addColorStop(1, rgba(mix(purple, [255, 255, 255], 0.15)));
        g.fillStyle = fl; g.beginPath(); g.moveTo(-env.asp, 0.5); g.lineTo(-env.asp * 0.45, 0.16); g.quadraticCurveTo(0, 0.24, env.asp * 0.45, 0.16); g.lineTo(env.asp, 0.5); g.fill();
        g.fillStyle = 'rgb(8,8,10)'; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.003;
        g.beginPath(); g.moveTo(-env.asp * 0.46, -0.3); g.quadraticCurveTo(0, -0.4, env.asp * 0.46, -0.3); g.lineTo(env.asp * 0.46, 0.15); g.quadraticCurveTo(0, 0.24, -env.asp * 0.46, 0.15); g.closePath(); g.fill(); g.stroke();
        // the line slides from right to left as it's sung
        const s = typed(env.ws, F.t), size = 0.075;
        const tw = Gk.measure(s, size, { w: 500 });
        const x = Math.min(-tw / 2, env.asp * 0.38 - tw);
        g.save(); g.beginPath(); g.rect(-env.asp * 0.45, -0.35, env.asp * 0.9, 0.55); g.clip();
        const words = s.split(' ');
        let xx = x;
        const sp = Gk.measure(' ', size, { w: 500 });
        words.forEach((q, i) => {
          const m = Gk.measure(q, size, { w: 500 });
          if (q.replace(/[.,;:!?]+$/, '') === bare(kw) && F.t > kw.t) { g.fillStyle = rgba(purple); Wk.rr(g, xx - 0.01, -0.03 - size * 0.62, m + 0.02, size * 1.25, 0.008); g.fill(); }
          Gk.txt(g, q, xx, -0.03, size, [255, 255, 255], { w: 500 });
          xx += m + sp;
        });
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a search bar under the title as a logo, then a record spinning
  SH.searchbar = (env) => {
    const cols = [[255, 90, 140], [255, 176, 40], [60, 200, 160], [150, 110, 255]];
    const t0 = title(env).slice(0, 12);
    const done = () => { const w = env.ws[env.ws.length - 1]; return w ? w.t + 0.2 : env.t0 + 1; };
    return {
      bg: [30, 30, 34],
      anchors: [{ x: 0, y: 0.1, col: [14, 14, 16] }],
      portal: { x: 0, y: 0.06, r: 0.1 },
      cam: drift(env, 0.08),
      draw(g, lt, F) {
        fill(g, [30, 30, 34]);
        const t = F.t, rec = ss(done(), done() + 0.5, t);
        // the title as a logo, one letter swapped for a square of the cover
        const size = 0.11, w = Gk.measure(t0, size, { w: 700 });
        let x = -w / 2;
        const swap = Math.min(t0.length - 1, 2);
        g.save(); g.globalAlpha = 1 - rec * 0.7; g.translate(0, -rec * 0.12);
        for (let i = 0; i < t0.length; i++) {
          const ch = t0[i], m = Gk.measure(ch, size, { w: 700 });
          if (i === swap && ch !== ' ') Gk.art(g, env.img, x + m / 2, -0.2, size * 0.72, 0.006, env.pal.vivid);
          else Gk.txt(g, ch, x, -0.2, size, cols[i % cols.length], { w: 700 });
          x += m;
        }
        g.restore();
        const bw = Math.min(env.asp * 0.6, 0.9);
        g.save(); g.globalAlpha = 1 - rec;
        g.fillStyle = 'rgb(48,49,54)'; Wk.rr(g, -bw / 2, -0.06, bw, 0.075, 0.0375); g.fill();
        Gk.icon(g, 'search', -bw / 2 + 0.04, -0.0225, 0.04, [170, 170, 180]);
        const q = typed(env.ws, t);
        Gk.txt(g, q, -bw / 2 + 0.07, -0.02, Math.min(0.032, (bw - 0.1) / Math.max(1, Gk.measure(q, 1, { w: 500 }))), [235, 235, 240], { w: 500 });
        g.restore();
        if (rec > 0) Gk.vinyl(g, 0, 0.06 + (1 - rec) * 0.4, 0.24, t * 2.4, env.img);
      },
    };
  };

  // ---------------------------------------------------------------- a call pill growing out of a green dot, the line typed inside
  SH.call = (env) => {
    return {
      bg: [212, 212, 214],
      anchors: [{ x: 0, y: 0.4, col: [212, 212, 214] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1.3 + 0.25 * ss(0, env.dur, lt), r: 0 }),
      draw(g, lt, F) {
        fill(g, [212, 212, 214]);
        const s = typed(env.ws, F.t), size = 0.03;
        const tw = Gk.measure(s, size, { w: 700 });
        const k = eo(lt / 0.45), w = 0.06 + (tw + 0.08) * k, h = 0.06;
        g.shadowColor = 'rgba(0,0,0,0.12)'; g.shadowBlur = 20;
        g.fillStyle = 'rgb(250,250,250)'; Wk.rr(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
        g.shadowColor = 'transparent';
        g.fillStyle = 'rgb(255,255,255)'; g.beginPath(); g.arc(-w / 2 + 0.03, 0, 0.022, 0, PI * 2); g.fill();
        Gk.icon(g, 'phone', -w / 2 + 0.03, 0, 0.032, [52, 199, 89]);
        g.save(); g.beginPath(); g.rect(-w / 2 + 0.055, -h / 2, w - 0.06, h); g.clip();
        Gk.txt(g, s, -w / 2 + 0.06, 0.001, size, [12, 12, 14], { w: 700 });
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a notebook page, the line written in, the key word burning
  SH.notebook = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    const rot = env.R.r(-0.2, -0.06);
    return {
      bg: [8, 8, 10],
      anchors: [{ x: 0.1, y: 0.1, col: [246, 242, 232] }],
      cam: (lt) => ({ x: 0.05, y: 0.02, z: 1.35 + 0.25 * ss(0, env.dur, lt), r: 0 }),
      draw(g, lt, F) {
        fill(g, [8, 8, 10]);
        Gk.embers(g, env.asp, F.t * 0.3, 30, 0.3);
        Gk.paper(g, 0.12, 0.12, 0.9, 1.0, rot);
        g.save(); g.translate(0.12, 0.12); g.rotate(rot);
        const size = 0.045, x0 = -0.3, y0 = -0.28;
        const n = shown(env.ws, F.t);
        let x = x0, y = y0;
        env.ws.forEach((w, i) => {
          const s = low(w), m = Gk.measure(s + ' ', size, { w: 400, f: 'serif', italic: true });
          if (x + m > 0.38) { x = x0; y += size * 1.25; }
          if (i < n) {
            const p = prog(w, F.t);
            if (i === k && F.t > w.t) {
              // it catches fire
              const fl = 0.5 + 0.5 * Math.sin(F.t * 23) * Math.sin(F.t * 7);
              g.save(); g.shadowColor = 'rgba(255,120,20,0.95)'; g.shadowBlur = 18 + fl * 12;
              Gk.txt(g, s, x, y, size, mix([255, 220, 120], [255, 90, 20], fl), { w: 400, f: 'serif', italic: true });
              g.restore();
              const sc = g.createRadialGradient(x + m / 2, y, 0, x + m / 2, y, m * 0.8);
              sc.addColorStop(0, 'rgba(60,20,0,0.35)'); sc.addColorStop(1, 'rgba(60,20,0,0)');
              g.fillStyle = sc; g.fillRect(x - m * 0.3, y - m * 0.8, m * 1.6, m * 1.6);
              for (let e = 0; e < 14; e++) { const q = (F.t * 0.8 + e * 0.07) % 1; g.fillStyle = 'rgba(255,' + (140 + e * 7) + ',40,' + (1 - q) + ')'; g.fillRect(x + (e / 14) * m, y - q * 0.12 - size * 0.4, 0.003, 0.004); }
            } else {
              g.save(); g.beginPath(); g.rect(x - 0.01, y - size, Gk.measure(s, size, { w: 400, f: 'serif', italic: true }) * p + 0.01, size * 2); g.clip();
              Gk.txt(g, s, x, y, size, [30, 30, 40], { w: 400, f: 'serif', italic: true });
              g.restore();
            }
          }
          x += m;
        });
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- torn paper opening on a pixel word
  SH.iris = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    const blades = 8;
    return {
      bg: [244, 240, 230],
      anchors: [{ x: 0, y: 0, col: [30, 30, 34] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1 + 0.2 * ss(0, env.dur, lt), r: lt * 0.15 }),
      draw(g, lt, F) {
        fill(g, [40, 40, 44]);
        const n = shown(env.ws, F.t), open = eo(lt / 0.5) * (0.32 + 0.05 * F.pulse);
        // the word through the opening
        const cur = env.ws[Math.max(0, n - 1)];
        if (cur) {
          const s = bare(cur).toUpperCase(), h = Math.min(0.16, (open * 1.6) / Math.max(1, s.length * 0.86));
          const ab = F.t - cur.t < 0.1 ? 0.006 : 0.0015;
          g.globalCompositeOperation = 'lighter';
          Gk.pixelWord(g, s, ab, 0, h, [255, 40, 60], [0, 0, 0], 0);
          Gk.pixelWord(g, s, -ab, 0, h, [40, 220, 255], [0, 0, 0], 0);
          g.globalCompositeOperation = 'source-over';
          Gk.pixelWord(g, s, 0, 0, h, [255, 255, 255], [10, 10, 12], h * 0.08);
        }
        // the torn blades round it
        for (let b = 0; b < blades; b++) {
          const a0 = (b / blades) * PI * 2 + lt * 0.4, a1 = a0 + PI * 2 / blades * 1.25;
          g.fillStyle = b % 2 ? 'rgb(240,236,226)' : 'rgb(226,222,210)';
          g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12;
          g.beginPath();
          g.moveTo(Math.cos(a0) * open, Math.sin(a0) * open);
          g.lineTo(Math.cos(a0) * 3, Math.sin(a0) * 3); g.lineTo(Math.cos(a1) * 3, Math.sin(a1) * 3);
          g.lineTo(Math.cos(a1 - 0.25) * open * 1.05, Math.sin(a1 - 0.25) * open * 1.05);
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(150,160,200,0.25)'; g.lineWidth = 0.002; g.shadowColor = 'transparent';
          for (let r = open + 0.05; r < 1.2; r += 0.05) { g.beginPath(); g.arc(0, 0, r, a0 + 0.05, a1 - 0.3); g.stroke(); }
        }
        g.shadowColor = 'transparent';
        const pre = env.ws.slice(0, n - 1).map(low).join(' ');
        if (pre) Gk.txt(g, pre, -env.asp * 0.38, -0.36, 0.035, [40, 40, 50], { w: 400, f: 'serif', italic: true, rot: -0.1 });
      },
    };
  };

  // ---------------------------------------------------------------- embers, a line glowing like heated metal, the key word's letters flying round
  SH.fire = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    const letters = bare(kw).toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
    const rest = env.ws.filter((_, i) => i !== k);
    return {
      bg: [16, 6, 2],
      anchors: [{ x: 0, y: 0.42, col: [16, 6, 2] }],
      cam: drift(env, 0.12, 0.05),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0.3, 0.05, 0, 0.2, 0.9);
        gr.addColorStop(0, 'rgb(90,30,8)'); gr.addColorStop(1, 'rgb(10,4,2)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        Gk.embers(g, env.asp, F.t, 120, 1);
        const n = shown(env.ws, F.t);
        const s = rest.filter((w) => F.t >= w.t - 0.04).map(low).join(' ');
        if (s) {
          g.save(); g.shadowColor = 'rgba(255,140,40,0.9)'; g.shadowBlur = 16;
          Gk.txt(g, s, 0, -0.3, 0.05, [255, 236, 210], { w: 700, f: 'serif', align: 'center', track: 0.02 });
          g.restore();
        }
        if (F.t > kw.t - 0.05) {
          const q = F.t - kw.t;
          letters.forEach((ch, i) => {
            const a = (i / letters.length) * PI * 2 + q * 0.6, r = 0.24 + 0.03 * Math.sin(q * 2 + i);
            const fly = eo(q / 0.5 - i * 0.06);
            const x = Math.cos(a) * r * 1.4 * fly, y = 0.04 + Math.sin(a) * r * fly;
            g.save(); g.shadowColor = 'rgba(255,90,60,0.9)'; g.shadowBlur = 14;
            Gk.txt(g, ch, x, y, 0.09, [255, 214, 214], { w: 700, f: 'serif', align: 'center', rot: Math.sin(q * 3 + i) * 0.5, a: fly });
            g.restore();
          });
          g.save(); g.shadowColor = 'rgba(255,170,60,1)'; g.shadowBlur = 30;
          g.strokeStyle = 'rgb(255,200,120)'; g.lineWidth = 0.008; g.beginPath(); g.arc(0, 0.04, 0.05 + 0.01 * F.pulse, 0, PI * 2); g.stroke();
          g.restore();
        }
      },
    };
  };

  // ---------------------------------------------------------------- an eyeball looking at a line of text arched over it
  SH.eye = (env) => {
    const txt = env.ws.map(low).join(' ');
    return {
      bg: [252, 252, 252],
      anchors: [{ x: 0.1, y: 0.4, col: [252, 252, 252] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1.1 + 0.15 * ss(0, env.dur, lt), r: -0.15 * ss(env.dur * 0.6, env.dur, lt) }),
      draw(g, lt, F) {
        fill(g, [252, 252, 252]);
        const n = shown(env.ws, F.t), shownTxt = env.ws.slice(0, n).map(low).join(' ');
        const r = 0.12, R = 0.25, span = Math.min(PI * 1.1, txt.length * 0.13);
        let a = -PI / 2 - span / 2;
        const step = span / Math.max(1, txt.length);
        let lx = 0, ly = -R;
        for (let i = 0; i < shownTxt.length; i++) {
          const ch = shownTxt[i], x = Math.cos(a) * R, y = 0.05 + Math.sin(a) * R;
          if (ch !== ' ') Gk.txt(g, ch, x, y, 0.05, [12, 12, 14], { w: 400, f: 'heavy', align: 'center', rot: a + PI / 2, shadow: 'rgba(0,0,0,0.45)', shadowBlur: 10, shadowY: 6 });
          lx = x; ly = y;
          a += step;
        }
        Gk.eye(g, 0, 0.05, r, lx, ly);
      },
    };
  };

  // ---------------------------------------------------------------- small white type on black with a huge ghost of it behind
  SH.ghost = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0.4, col: [0, 0, 0] }],
      cam: drift(env, 0.06),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        Gk.txt(g, bare(kw), -0.05 + Math.sin(F.t * 0.3) * 0.05 - lt * 0.03, -0.02, 0.38, [255, 255, 255], { w: 700, align: 'center', a: 0.08, blur: 3 });
        const s = typed(env.ws, F.t);
        const size = Math.min(0.06, env.asp * 0.7 / Math.max(1, Gk.measure(s, 1, { w: 700 })));
        Gk.txt(g, s, 0, 0, size, [255, 255, 255], { w: 700, align: 'center' });
        // the end of the line comes apart in specks
        const end = env.ws[env.ws.length - 1];
        if (end && F.t > end.end + 0.2) {
          const q = F.t - end.end - 0.2, w = Gk.measure(s, size, { w: 700 });
          for (let i = 0; i < 120; i++) { const hx = Math.abs(Math.sin(i * 91.7)) , hy = Math.abs(Math.sin(i * 37.3)); g.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - q * 1.5) + ')'; g.fillRect(-w / 2 + hx * w + q * 0.05 * (hy - 0.5), size * 0.2 + q * 0.12 * (0.3 + hy), 0.003, 0.003); }
        }
      },
    };
  };

  // ---------------------------------------------------------------- type with a long melting shadow, then an ink blot bursting with the key word
  SH.ink = (env) => {
    const k = lastKey(env.ws), kw = env.ws[k];
    const pts = []; const R = env.R; for (let i = 0; i < 60; i++) pts.push(R.r(0.75, 1.25));
    return {
      bg: [250, 250, 250],
      anchors: [{ x: 0, y: 0, col: [0, 0, 0] }],
      cam: drift(env, 0.1),
      draw(g, lt, F) {
        fill(g, [250, 250, 250]);
        const pre = env.ws.slice(0, k).filter((w) => F.t >= w.t - 0.04).map(low).join(' ');
        const size = 0.06;
        if (pre) {
          for (let i = 14; i >= 1; i--) Gk.txt(g, pre, 0, -0.04 + i * 0.012, size, [0, 0, 0], { w: 700, align: 'center', a: 0.05, blur: i * 0.6 });
          Gk.txt(g, pre, 0, -0.04, size, [10, 10, 12], { w: 700, align: 'center' });
        }
        if (F.t > kw.t - 0.05) {
          const q = eo((F.t - kw.t + 0.05) / 0.3), r = 0.17 * q;
          g.fillStyle = 'rgb(4,4,6)'; g.beginPath();
          for (let i = 0; i <= 60; i++) { const a = (i / 60) * PI * 2, rr = r * (i % 2 ? pts[i % 60] : 1) * (1 + 0.6 * Math.abs(Math.cos(a))); const x = Math.cos(a) * rr * 1.9, y = 0.12 + Math.sin(a) * rr * 0.55; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          g.fill();
          Gk.txt(g, bare(kw), 0, 0.12, 0.06 * q, [255, 255, 255], { w: 700, align: 'center' });
        }
      },
    };
  };

  // ---------------------------------------------------------------- a row of buttons, one per word, clicked as each is sung
  SH.buttons = (env) => {
    const icons = env.ws.map((_, i) => Gk.ICONS[(i + env.idx) % Gk.ICONS.length]);
    const orange = env.sc.acc[0] > 200 && env.sc.acc[1] < 150 ? env.sc.acc : ACC.orange;
    const gap = 0.17;
    return {
      bg: [34, 34, 36],
      anchors: [{ x: 0, y: 0.35, col: [34, 34, 36] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1.2 + 0.3 * ss(env.dur * 0.7, env.dur, lt), r: 0 }),
      draw(g, lt, F) {
        fill(g, [34, 34, 36]);
        const n = shown(env.ws, F.t), cur = Math.max(0, n - 1);
        // slide so the newest word's button is in the middle
        let off = 0;
        for (let i = 0; i < env.ws.length; i++) off += (i < cur ? 1 : 0);
        const prevOff = Math.max(0, cur - 1), w = env.ws[cur];
        const slide = w ? prevOff + (cur - prevOff) * eo((F.t - w.t + 0.1) / 0.3) : 0;
        env.ws.forEach((wd, i) => {
          const x = (i - slide) * gap, on = i === cur && F.t >= wd.t - 0.05, past = i < cur;
          if (Math.abs(x) > env.asp * 0.6) return;
          const r = 0.055 * (on ? 1 + 0.1 * outBack((F.t - wd.t) / 0.25) : 1);
          if (on) { g.save(); g.shadowColor = rgba(orange, 0.9); g.shadowBlur = 25; g.strokeStyle = rgba(orange); g.lineWidth = 0.006; g.beginPath(); g.arc(x, 0, r + 0.006, 0, PI * 2); g.stroke(); g.restore(); }
          g.fillStyle = on ? 'rgb(60,60,64)' : 'rgb(70,70,74)'; g.beginPath(); g.arc(x, 0, r, 0, PI * 2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.002; g.stroke();
          Gk.icon(g, icons[i], x, 0, 0.06, on ? orange : [240, 240, 244]);
          Gk.txt(g, bare(wd), x, 0.1, 0.026, [235, 235, 240], { w: 500, align: 'center', a: past || on ? 1 : 0.5 });
        });
        if (w && F.t > w.t - 0.25) { const m = eo((F.t - w.t + 0.25) / 0.25); Gk.cursor(g, 0.02 + (1 - m) * 0.15, 0.01 + (1 - m) * 0.1, 0.05, F.t > w.t - 0.02 && F.t < w.t + 0.1); }
      },
    };
  };

  // ---------------------------------------------------------------- a dark map, a route drawing itself, a timer
  SH.map = (env) => {
    const R = env.R;
    const blocks = []; for (let i = 0; i < 90; i++) blocks.push([R.r(-1.2, 1.2), R.r(-0.7, 0.7), R.r(0.04, 0.14), R.r(0.04, 0.12), R.r(-0.3, 0.3)]);
    const route = []; let x = -0.5, y = 0.25; for (let i = 0; i < 12; i++) { route.push([x, y]); x += R.r(0.06, 0.12); y += R.r(-0.1, 0.06); }
    const txt = env.ws.map(bare).join(' ');
    return {
      bg: [32, 44, 70],
      anchors: [{ x: 0.5, y: -0.4, col: [32, 44, 70] }],
      cam: (lt) => { const k = ss(0, env.dur, lt); return { x: -0.2 + k * 0.5, y: 0.1 - k * 0.2, z: 1.3, r: -0.1 }; },
      draw(g, lt, F) {
        fill(g, [32, 44, 70]);
        g.fillStyle = 'rgb(46,62,96)';
        for (const [bx, by, bw, bh, br] of blocks) { g.save(); g.translate(bx, by); g.rotate(br); g.fillRect(-bw / 2, -bh / 2, bw, bh); g.restore(); }
        g.strokeStyle = 'rgb(26,30,40)'; g.lineWidth = 0.02;
        g.beginPath(); g.moveTo(-1.2, 0.3); g.quadraticCurveTo(0, -0.2, 1.2, 0.1); g.moveTo(-0.3, -0.8); g.quadraticCurveTo(-0.1, 0, 0.3, 0.8); g.stroke();
        // the route, drawn as the line goes
        const n = shown(env.ws, F.t), k = cl(n / Math.max(1, env.ws.length) - 0.5 / env.ws.length + (env.ws[n - 1] ? prog(env.ws[n - 1], F.t) / env.ws.length : 0), 0, 1);
        const upto = k * (route.length - 1);
        g.strokeStyle = 'rgb(40,120,255)'; g.lineWidth = 0.012; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(route[0][0], route[0][1]);
        let hx = route[0][0], hy = route[0][1];
        for (let i = 1; i <= Math.floor(upto); i++) { g.lineTo(route[i][0], route[i][1]); hx = route[i][0]; hy = route[i][1]; }
        const f = upto - Math.floor(upto), a = route[Math.floor(upto)], b = route[Math.min(route.length - 1, Math.floor(upto) + 1)];
        hx = a[0] + (b[0] - a[0]) * f; hy = a[1] + (b[1] - a[1]) * f; g.lineTo(hx, hy); g.stroke();
        g.fillStyle = 'rgba(40,120,255,' + (0.25 + 0.2 * Math.sin(F.t * 6)) + ')'; g.beginPath(); g.arc(hx, hy, 0.035, 0, PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 0.012, 0, PI * 2); g.fill();
        g.fillStyle = 'rgb(40,120,255)'; g.beginPath(); g.arc(hx, hy, 0.008, 0, PI * 2); g.fill();
        // the line in spaced capitals, and a clock
        const cx = -0.2 + ss(0, env.dur, lt) * 0.5, cy = 0.1 - ss(0, env.dur, lt) * 0.2;
        g.save(); g.translate(cx, cy); g.rotate(0.1);
        const shownTxt = txt.slice(0, Math.ceil(txt.length * cl((F.t - env.t0) / Math.max(0.3, (env.ws[env.ws.length - 1] ? env.ws[env.ws.length - 1].end : env.t1) - env.t0), 0, 1)));
        Gk.txt(g, shownTxt.toUpperCase(), 0, -0.33, 0.022, [255, 255, 255], { w: 500, align: 'center', track: 0.6 });
        const secs = Math.max(0, F.t - env.t0), mm = Math.floor(secs / 60), sc2 = Math.floor(secs % 60);
        Gk.txt(g, '0' + mm + ':' + (sc2 < 10 ? '0' : '') + sc2, 0, 0.3, 0.06, [255, 255, 255], { w: 600, align: 'center' });
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a phone with a ring round it, the lyrics on its screen
  SH.phone = (env) => {
    const scr = document.createElement('canvas');
    const orange = ACC.orange;
    return {
      bg: [20, 22, 30],
      anchors: [{ x: 0.5, y: 0.4, col: [20, 22, 30] }],
      cam: drift(env, 0.08),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.05, 0, 0, 1);
        gr.addColorStop(0, 'rgb(50,60,90)'); gr.addColorStop(1, 'rgb(14,16,24)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const H = Math.round(F.H * 0.7), W = Math.round(H * 0.48);
        scr.width = W; scr.height = H;
        const x = scr.getContext('2d');
        x.fillStyle = '#0c0c10'; Wk.rr(x, 0, 0, W, H, W * 0.16); x.fill();
        x.save(); Wk.rr(x, W * 0.04, H * 0.02, W * 0.92, H * 0.96, W * 0.13); x.clip();
        x.setTransform(H, 0, 0, H, W / 2, H / 2);
        Gk.coverBg(x, env.img, 0.5, F.t, 0.4, env.pal.dark);
        const s = env.ws.map(low).join(' ');
        const rows = Gk.wrap(env.ws.map((w) => ({ s: low(w), w })), 0.045, 0.38, { w: 700 });
        rows.forEach((row, ri) => row.forEach((it) => Gk.txt(x, it.s, -0.19 + it.x, -0.05 + ri * 0.055, 0.045, [255, 255, 255], { w: 700, a: F.t >= it.w.t - 0.02 ? 0.4 + 0.6 * prog(it.w, F.t) : 0.35 })));
        x.restore();
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.fillStyle = '#000'; Wk.rr(x, W * 0.36, H * 0.035, W * 0.28, H * 0.03, H * 0.015); x.fill();
        // the ring, behind then in front
        const ring = (front) => { g.save(); g.shadowColor = rgba(orange, 0.9); g.shadowBlur = 25; g.strokeStyle = rgba(orange); g.lineWidth = 0.012; g.beginPath(); g.ellipse(0, 0.02, 0.42, 0.11, -0.25, front ? 0 : PI, front ? PI : PI * 2); g.stroke(); g.restore(); };
        ring(false);
        const sway = Math.sin(lt * 1.2) * 0.35;
        g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40;
        Wk.warp(g, { c: scr, w: W, h: H }, 0, 0.02, 0.34, 'persp', sway, 0);
        g.restore();
        ring(true);
        const pre = typed(env.ws, F.t);
        Gk.txt(g, pre, 0, -0.42, 0.035, [255, 255, 255], { w: 500, align: 'center' });
      },
    };
  };

  // ---------------------------------------------------------------- a cloudy pink sky, the letters dropping in
  SH.sky = (env) => {
    const R = env.R;
    const clouds = []; for (let i = 0; i < 16; i++) clouds.push([R.r(-1, 1), R.r(-0.5, 0.5), R.r(0.06, 0.16), R.r(0.2, 1)]);
    const txt = env.ws.map(low).join(' ');
    const size = Math.min(0.11, env.asp * 0.8 / Math.max(1, Gk.measure(txt, 1, { w: 700, f: 'serif' })));
    return {
      bg: [220, 110, 140],
      anchors: [{ x: 0, y: 0.4, col: [200, 90, 130] }],
      cam: drift(env, 0.08, 0.03),
      draw(g, lt, F) {
        const gr = g.createLinearGradient(0, -0.5, 0, 0.5);
        gr.addColorStop(0, 'rgb(150,70,150)'); gr.addColorStop(0.6, 'rgb(236,110,120)'); gr.addColorStop(1, 'rgb(250,160,110)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        for (const [cx, cy, r, d] of clouds) { const x = ((cx + F.t * 0.02 * d + 1) % 2) - 1; g.fillStyle = 'rgba(255,190,200,' + (0.25 + 0.3 * d) + ')'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x * env.asp + k * r * 0.6, cy - (k % 2) * r * 0.25, r, r * 0.5, 0, 0, PI * 2); g.fill(); } }
        // every letter falls into place on its word
        const w = Gk.measure(txt, size, { w: 700, f: 'serif' });
        let x = -w / 2, ci = 0;
        env.ws.forEach((wd, wi) => {
          const s = low(wd) + ' ';
          for (let i = 0; i < s.length; i++) {
            const ch = s[i], m = Gk.measure(ch, size, { w: 700, f: 'serif' });
            const q = F.t - wd.t - i * 0.025;
            if (q > -0.05 && ch !== ' ') {
              const k = outBack(q / 0.35);
              Gk.txt(g, ch, x, -0.02 - (1 - k) * 0.2 + Math.sin(F.t * 2 + ci * 0.4) * 0.006, size, [255, 240, 225], { w: 700, f: 'serif', a: cl(q / 0.12 + 0.3, 0, 1), blur: Math.max(0, 1 - q / 0.2) * 8, shadow: 'rgba(120,30,60,0.5)', shadowBlur: 12, shadowY: 4 });
            }
            x += m; ci++;
          }
        });
        const img = env.emoji && env.emoji();
        if (img) { const q = (lt / Math.max(1, env.dur)); g.save(); g.translate(-env.asp * 0.6 + q * env.asp * 1.2, 0.32 - Math.sin(q * PI) * 0.1); g.rotate(q * 2); g.drawImage(img, -0.08, -0.08, 0.16, 0.16); g.restore(); }
      },
    };
  };

  // ---------------------------------------------------------------- the title as a logo, brush strokes sweeping round it
  SH.logo = (env) => {
    const t0 = title(env);
    const ws = env.ws.length ? env.ws : [];
    const red = env.sc.acc;
    return {
      bg: [250, 246, 242],
      anchors: [{ x: 0, y: 0.4, col: [250, 246, 242] }],
      cam: drift(env, 0.06),
      draw(g, lt, F) {
        fill(g, [250, 246, 242]);
        const k = eo(lt / 0.6);
        g.strokeStyle = rgba(mix(red, [80, 20, 10], 0.3)); g.lineCap = 'round';
        for (let s = 0; s < 2; s++) {
          g.lineWidth = 0.004 + s * 0.002;
          g.beginPath();
          const y = s ? 0.12 : -0.12, dir = s ? 1 : -1;
          for (let i = 0; i <= 40 * k; i++) { const u = i / 40, x = (u - 0.5) * 0.9 * dir, yy = y + Math.sin(u * PI) * 0.03 * dir; if (i) g.lineTo(x, yy); else g.moveTo(x, yy); }
          g.stroke();
        }
        const txt = ws.length ? ws.map(low).join(' ') : t0;
        const size = Math.min(0.08, env.asp * 0.7 / Math.max(1, Gk.measure(txt, 1, { w: 700, track: 0.08 })));
        const n = ws.length ? Math.max(0, Math.round(txt.length * cl((F.t - ws[0].t) / Math.max(0.3, ws[ws.length - 1].end - ws[0].t), 0, 1))) : Math.round(txt.length * k);
        const s = txt.slice(0, n), w = Gk.measure(txt, size, { w: 700, track: 0.08 });
        const sw = Gk.txt(g, s, -w / 2, 0, size, [20, 16, 16], { w: 700, track: 0.08 });
        if (n < txt.length || (F.t * 2) % 1 < 0.5) { g.fillStyle = rgba(red); g.fillRect(-w / 2 + sw + 0.004, -size * 0.38, size * 0.55, size * 0.62); }
      },
    };
  };

  Gk.SHOTS = SH;
  Gk.QUIET = ['listen', 'logo', 'sky', 'map', 'phone', 'frost'];
  Gk.LYRIC = ['lyrics', 'drum'];
})();
