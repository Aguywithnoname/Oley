/* Oley · Warp shots: each line as a moment of a phone-made edit. 3D outlined type stacking up over a
   bright landscape; heavy white type over a neon heart, halftone, light rays and a ring of text, melting
   into a wave once the line is sung; a lowercase line wrapped round a turning cylinder; type tipped back
   in perspective and extruded, the key word stretched out in red; a message bubble typing itself; one
   huge arched word over a bubble; a keyboard typing with the emoji repeated; a glowing pill and big
   yellow humped rows; a file card; a weather card; a text selection with a squiggle; a spinner and a
   caption; label boxes in quotes; an emoji with giant letters behind it; a blue tile through a fisheye;
   the album cover with one word at a time; a CRT gradient with the sound drawn across it. */
(function () {
  'use strict';
  const O = window.Oley;
  const S = O.Shadow, Wk = O.Warp;
  const PI = Math.PI;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgba = Wk.rgba;
  const outBack = (k) => { k = cl(k, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const BIG = 30;
  const fill = (g, col) => { g.fillStyle = rgba(col); g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2); };
  const NEON = [[255, 60, 210], [60, 255, 140], [60, 220, 255], [255, 150, 40], [170, 90, 255], [255, 60, 90]];
  const lastKey = (ws) => { let k = ws.findIndex((w) => w.key); if (k < 0) k = ws.length - 1; return k; };
  const drift = (env, z1, r) => (lt) => { const k = lt / Math.max(0.5, env.dur); return { x: Math.sin(lt * 0.5 + env.ph) * 0.006, y: 0, z: 1 + (z1 || 0.06) * k, r: (r || 0) * (k - 0.5) }; };
  // how many words are in by t
  const shown = (ws, t) => { let n = 0; for (const w of ws) if (t >= w.t - 0.04) n++; return n; };
  const low = (w) => (w.lo || w.txt.toLowerCase()).replace(/[.,;:!?]+$/, '');
  // typed so far: each word letter by letter over its own time; the key word sung long gets its vowel stretched
  const typed = (ws, t, stretch) => {
    const out = [];
    for (const w of ws) {
      if (t < w.t - 0.03) break;
      let s = low(w);
      const d = w.end - w.t;
      if (stretch && w.key && d > 0.45) s = Wk.stretch(s, cl(Math.round(d / 0.07), 3, 11));
      const k = cl((t - w.t + 0.03) / cl(d * 0.8, 0.1, 0.7), 0, 1);
      out.push(s.slice(0, Math.max(1, Math.ceil(s.length * k))));
    }
    return out.join(' ');
  };
  // rows of words, fitted to a width (in units of the font size)
  const rowsOf = (ws, maxEm, font) => {
    const R = [[]];
    let w = 0;
    for (const x of ws) {
      const m = Wk.measure(x.t, 1, font || 'heavy', 400) + 0.28;
      if (R[R.length - 1].length && w + m > maxEm) { R.push([]); w = 0; }
      R[R.length - 1].push(x); w += m;
    }
    return R;
  };
  const px = (F, size) => Math.min(360, Math.max(24, size * F.H * 1.15));

  const SH = {};

  // ---------------------------------------------------------------- 3D outlined type stacking over a bright landscape
  SH.stack3d = (env) => {
    const { R, sc } = env;
    const hill = env.variant % 2 ? [110, 196, 60] : mix(env.pal.vivid, [90, 190, 90], 0.5);
    const side = mix(hill, [0, 0, 0], 0.7);
    const words = env.ws.map((w, i) => ({ t: w.txt, key: w.key, i }));
    const rows = rowsOf(words, 7.5);
    const size = cl(0.62 / rows.length / 0.95, 0.09, 0.17);
    return {
      bg: [80, 150, 230],
      anchors: [{ x: 0, y: -0.38, col: [80, 150, 230] }],
      cam: drift(env, 0.12, 0.05),
      draw(g, lt, F) {
        Wk.landscape(g, env.asp, F.t, hill);
        const n = shown(env.ws, F.t);
        Wk.neonHeart(g, 0, 0.06, 0.62 + F.pulse * 0.03, [255, 50, 70], 0.8);
        const spec = (col) => ({ rows: rows.map((r) => r.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: col || (w.key || (w.i === n - 1 && w.i >= 3) ? sc.acc : [255, 255, 255]) }))), font: 'heavy', px: px(F, size), lead: 0.92, stroke: col ? null : [[24, 40, 24], px(F, size) * 0.06] });
        const face = Wk.block(spec()), sd = Wk.block(spec(side));
        const ww = face.w / face.px * size;
        Wk.extrude(g, face, sd, 0, 0, ww, 'hump', 0.12, 0, 0.35, 0.012, 0.018);
      },
    };
  };

  // ---------------------------------------------------------------- heavy white type over a neon heart, melting into a wave
  SH.neonwave = (env) => {
    const { R, sc } = env;
    const words = env.ws.map((w, i) => ({ t: w.txt, key: w.key, i }));
    const rows = rowsOf(words, 6.2);
    const size = cl(0.62 / rows.length / 0.95, 0.09, 0.19);
    const ring = (env.ws.map((w) => w.txt).join(' ') + '  ·  ').repeat(4);
    const last = env.ws[env.ws.length - 1], melt0 = last ? last.t + 0.35 : 1e9;
    const k0 = R.i(0, NEON.length - 1);
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0.05, col: [0, 0, 0] }],
      portal: { x: 0, y: 0, r: 0.16 },
      cam: drift(env, 0.08, -0.04),
      fx: (lt) => { const t = env.t0 + lt; for (const w of env.ws) if (w.key && t > w.t && t < w.t + 0.06) return { glitch: 0.5 }; return null; },
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        const n = shown(env.ws, F.t), hc = NEON[(k0 + n) % NEON.length];
        Wk.halftone(g, 0, 0, 1.8, mix(hc, [0, 0, 0], 0.55), 0.9);
        Wk.rays(g, 0, 0, 1.2, 18, F.t * 0.15, [255, 255, 255], 0.18);
        Wk.ringText(g, 0, 0, 0.45, ring, 0.045, [70, 70, 74], F.t * 0.12);
        Wk.neonHeart(g, 0, 0.04, 0.8 + F.pulse * 0.04, hc, 1);
        const melt = ss(melt0, melt0 + 0.8, F.t);
        const b = Wk.block({ rows: rows.map((r) => r.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: w.i === n - 1 && n > 1 ? sc.acc : [255, 255, 255] }))), font: 'heavy', px: px(F, size), lead: 0.9 });
        const ww = b.w / b.px * size;
        Wk.warp(g, b, 0, melt * 0.03, Math.min(env.asp * 0.95, ww), 'wave', 0.025 + melt * 0.13, F.t * 2.2, { freq: 0.9 + melt * 0.4 });
      },
    };
  };

  // ---------------------------------------------------------------- a lowercase line wrapped round a turning cylinder
  SH.curve = (env) => {
    const { R, sc } = env;
    const words = env.ws.map((w, i) => ({ t: low(w), i }));
    const size = cl(0.95 / Math.max(4, words.reduce((a, w) => a + w.t.length + 1, 0) * 0.55), 0.07, 0.15);
    const hc = NEON[R.i(0, NEON.length - 1)], dir = R.sgn();
    return {
      bg: [6, 6, 8],
      anchors: [{ x: 0, y: 0.25, col: [6, 6, 8] }],
      portal: { x: 0, y: 0.03, r: 0.12 },
      cam: drift(env, 0.1, 0.06),
      draw(g, lt, F) {
        fill(g, [6, 6, 8]);
        Wk.halftone(g, 0, 0, 1.6, mix(hc, [0, 0, 0], 0.6), 0.8);
        Wk.rays(g, 0, 0, 1.1, 14, -F.t * 0.2, [255, 255, 255], 0.22);
        Wk.neonHeart(g, 0, 0.04, 0.78, hc, 0.9);
        const n = shown(env.ws, F.t);
        const b = Wk.block({ rows: [words.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: [255, 255, 255] }))], font: 'heavy', px: px(F, size), lead: 0.95, gap: 0.22 });
        const ww = b.w / b.px * size;
        Wk.warp(g, b, 0, -0.02, ww, 'cyl', 0.25, dir * (0.35 * Math.sin(lt * 1.3) + (1 - ss(0, 0.5, lt)) * 1.2), { span: 2.3 });
      },
    };
  };

  // ---------------------------------------------------------------- tipped back in perspective, extruded; the key word stretched out in red
  SH.persp = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws);
    const red = sc.acc[0] > 200 && sc.acc[1] < 120 ? sc.acc : [235, 40, 50];
    const words = env.ws.map((w, i) => ({ t: i === k && w.end - w.t > 0.45 ? Wk.stretch(w.txt, cl(Math.round((w.end - w.t) / 0.09), 3, 8)) : w.txt, key: i === k, i }));
    const top = rowsOf(words.filter((w) => !w.key), 6), key = words[k];
    const size = 0.11, amt = R.sgn() * 0.55, rot = R.r(-0.22, -0.08);
    const ghost = env.ws.map((w) => w.txt).join(' ');
    return {
      bg: [10, 10, 12],
      anchors: [{ x: 0.3, y: 0.3, col: red }, { x: -0.5, y: -0.4, col: [10, 10, 12] }],
      cam: (lt) => { const c = drift(env, 0.25, 0.04)(lt); c.r += rot * 0.3; return c; },
      draw(g, lt, F) {
        const n = shown(env.ws, F.t), kOn = n > k;
        fill(g, kOn ? mix([10, 10, 12], red, 0.35) : [10, 10, 12]);
        Wk.rays(g, 0, -0.1, 1.3, 16, F.t * 0.1, [255, 255, 255], 0.2);
        Wk.txt(g, ghost, 0, -0.25, 0.3, [255, 255, 255], 'heavy', { align: 'center', w: 400, a: 0.05 });
        g.save(); g.rotate(rot);
        const bt = Wk.block({ rows: top.map((r) => r.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: [255, 255, 255] }))), font: 'heavy', px: px(F, size), lead: 0.9 });
        const bs = Wk.block({ rows: top.map((r) => r.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: [120, 120, 126] }))), font: 'heavy', px: px(F, size), lead: 0.9 });
        const wt = bt.w / bt.px * size;
        const ht = Wk.extrude(g, bt, bs, 0, -0.08, wt, 'persp', amt * 0.5, 0, 0.25, 0.006, 0.012);
        if (kOn) {
          const ks = size * 1.5, a = ss(env.ws[k].t - 0.05, env.ws[k].t + 0.06, F.t);
          const bk = Wk.block({ rows: [[{ t: key.t, col: red }]], font: 'heavy', px: px(F, ks) }), bks = Wk.block({ rows: [[{ t: key.t, col: mix(red, [0, 0, 0], 0.6) }]], font: 'heavy', px: px(F, ks) });
          const wk = Math.min(env.asp * 0.6, bk.w / bk.px * ks);   // narrow enough that perspective and tilt never push its end off screen
          Wk.extrude(g, bk, bks, 0.02, -0.08 + ht / 2 + ks * 0.55, wk, 'persp', amt, 0, 0.4, 0.01, 0.022, { alpha: a });
        }
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a message bubble typing itself
  SH.imessage = (env) => {
    const { R, sc } = env;
    const blue = [10, 132, 255], size = 0.062;
    const prev = env.prev && env.prev.length && R.ch(0.6) ? env.prev.map(low).join(' ') : '';
    const last = env.ws[env.ws.length - 1];
    // the bubble grows from its right end; once it's wider than the screen the camera keeps the newest letters in view
    const rightAt = (t) => Math.max(env.asp * 0.32, -env.asp * 0.42 + Wk.measure(typed(env.ws, t, true), size, 'ui', 500) + size * 1.1);
    return {
      bg: [236, 236, 240],
      anchors: [{ x: 0, y: 0.38, col: [236, 236, 240] }, { x: 0.1, y: 0.04, col: blue }],
      cam: (lt) => { const r = rightAt(env.t0 + lt); return { x: Math.max(0, r - env.asp * 0.32), y: 0, z: 1.05 + 0.08 * ss(0, env.dur, lt), r: -0.03 + 0.02 * Math.sin(lt * 0.7) }; },
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.1, 0, 0, 1.1);
        gr.addColorStop(0, 'rgb(246,246,248)'); gr.addColorStop(1, 'rgb(196,196,202)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        if (prev) {
          const w = Math.min(env.asp * 0.8, Wk.measure(prev, size * 0.85, 'ui') + size * 1.2), h = size * 1.6;
          g.fillStyle = 'rgb(229,229,234)'; Wk.rr(g, -env.asp * 0.42, -0.2 - h / 2, w, h, h / 2); g.fill();
          Wk.txt(g, prev, -env.asp * 0.42 + size * 0.5, -0.2, size * 0.85, [20, 20, 24], 'ui');
        }
        const s = typed(env.ws, F.t, true), right = rightAt(F.t);
        const pop = outBack(lt / 0.3);
        g.save(); g.translate(right, 0.02); g.scale(pop, pop); g.translate(-right, -0.02);
        Wk.bubble(g, s, right, 0.02, size, blue, [255, 255, 255]);
        if (last && F.t > last.t + 0.25) Wk.txt(g, 'Delivered', right, 0.02 + size * 1.55, size * 0.5, [140, 140, 148], 'ui', { align: 'right' });
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- one huge arched word over a bubble
  SH.arch = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k], rest = env.ws.filter((_, i) => i !== k);
    const size = cl(env.asp * 0.85 / Math.max(3, kw.txt.length * 0.82), 0.12, 0.3);
    const blue = [10, 132, 255];
    return {
      bg: [238, 238, 240],
      anchors: [{ x: 0, y: -0.15, col: [16, 16, 18] }, { x: 0, y: 0.4, col: [238, 238, 240] }],
      cam: drift(env, 0.08, 0.03),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.1, 0, 0, 1.1);
        gr.addColorStop(0, 'rgb(248,248,250)'); gr.addColorStop(1, 'rgb(200,200,206)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const s = typed(rest, F.t, true);
        if (s) Wk.bubble(g, s, Math.min(env.asp * 0.45, Wk.measure(s, 0.05, 'ui') / 2 + 0.05), 0.16, 0.05, blue, [255, 255, 255]);
        const a = ss(kw.t - 0.06, kw.t + 0.04, F.t);
        if (a > 0) {
          const drop = (1 - outBack((F.t - kw.t + 0.06) / 0.3)) * -0.3;
          // a green swipe as the word lands
          const q = F.t - kw.t;
          if (q > -0.06 && q < 0.15) { g.fillStyle = rgba([60, 230, 90], 1 - Math.abs(q) / 0.15); g.save(); g.rotate(-0.1); g.fillRect(-env.asp, -0.05, env.asp * 2, 0.09); g.restore(); }
          const b = Wk.block({ rows: [[{ t: kw.txt, col: [16, 16, 18] }]], font: 'heavy', px: px(F, size), track: -0.02 });
          Wk.warp(g, b, 0, -0.12 + drop, Math.min(env.asp * 0.92, b.w / b.px * size), 'arch', 0.55, 0, { alpha: a });
        }
      },
    };
  };

  // ---------------------------------------------------------------- a keyboard typing, the emoji repeated after
  SH.keyboard = (env) => {
    const { R, sc } = env;
    const size = 0.07, fw = Math.min(env.asp * 0.9, 1.25);
    const nx = (env.next || []).slice(0, 2).map(low);
    return {
      bg: [244, 244, 246],
      anchors: [{ x: 0, y: -0.38, col: [244, 244, 246] }],
      cam: (lt) => ({ x: 0, y: 0.05, z: 1.15 + 0.06 * ss(0, env.dur, lt), r: 0.06 * Math.sin(lt * 0.6 + env.ph) }),
      draw(g, lt, F) {
        fill(g, [244, 244, 246]);
        const s = typed(env.ws, F.t, true);
        // the text field
        g.fillStyle = 'rgb(255,255,255)'; Wk.rr(g, -fw / 2, -0.3, fw, 0.16, 0.08); g.fill();
        g.strokeStyle = 'rgb(200,200,206)'; g.lineWidth = 0.003; g.stroke();
        let tw = Wk.txt(g, s, -fw / 2 + 0.05, -0.22, size, [12, 12, 14], 'ui', { w: 500 });
        const img = env.emoji && env.emoji();
        const done = env.ws.length && F.t > env.ws[env.ws.length - 1].t + 0.15;
        if (img && done) {
          const m = Math.min(6, Math.floor((F.t - env.ws[env.ws.length - 1].t - 0.15) / 0.12) + 1);
          for (let i = 0; i < m && -fw / 2 + 0.07 + tw + i * size * 1.1 < fw / 2 - 0.02; i++) g.drawImage(img, -fw / 2 + 0.07 + tw + i * size * 1.1, -0.22 - size * 0.55, size * 1.05, size * 1.05);
        }
        if ((F.t * 2) % 1 < 0.6) { g.fillStyle = 'rgb(10,132,255)'; g.fillRect(-fw / 2 + 0.055 + tw + 0.004, -0.255, 0.004, 0.07); }
        // suggestions, then the keys
        const ky = 0.0;
        g.fillStyle = 'rgb(208,211,217)'; g.fillRect(-fw / 2, ky - 0.08, fw, 0.08);
        nx.forEach((w, i) => Wk.txt(g, w, -fw / 2 + fw * (0.25 + i * 0.4), ky - 0.04, 0.035, [30, 30, 34], 'ui', { align: 'center', w: 400 }));
        const cur = s.slice(-1).toUpperCase();
        Wk.keyboard(g, -fw / 2, ky, fw, /[A-Z]/.test(cur) && (F.t * 8) % 1 < 0.7 ? cur : '', F.t);
      },
    };
  };

  // ---------------------------------------------------------------- a glowing pill, then big yellow humped rows
  SH.glow = (env) => {
    const { R, sc } = env;
    const amber = [255, 184, 30];
    const first = env.ws[0];
    const label = first ? first.lo.replace(/[.,;:!?]+$/, '') : '';
    const pillTxt = label.charAt(0).toUpperCase() + label.slice(1) + '!';
    const rest = env.ws.slice(1).map((w, i) => ({ t: w.txt, i: i + 1 }));
    const rows = rowsOf(rest, 7.5);
    const size = cl(0.62 / Math.max(1, rows.length) / 0.9, 0.1, 0.22);
    return {
      bg: [8, 6, 4],
      anchors: [{ x: 0, y: 0, col: amber }],
      cam: drift(env, 0.15, 0.06),
      draw(g, lt, F) {
        fill(g, [8, 6, 4]);
        const n = shown(env.ws, F.t);
        const pk = 1 - ss(rest.length && rest[0] ? env.ws[1].t - 0.1 : 1e9, (env.ws[1] ? env.ws[1].t : 1e9) + 0.2, F.t);
        if (pk > 0 && first) {
          const k = cl((F.t - first.t) / 0.35, 0, 1), s = pillTxt.slice(0, Math.max(1, Math.ceil(pillTxt.length * k)));
          g.save(); g.globalAlpha = pk; g.shadowColor = rgba(amber, 0.9); g.shadowBlur = 18;
          Wk.pill(g, s, 0, 0, 0.055, [40, 28, 8], amber, amber, true);
          g.restore();
        }
        if (n > 1) {
          const b = Wk.block({ rows: rows.map((r) => r.map((w) => ({ t: w.t, a: w.i < n ? 1 : 0, col: amber }))), font: 'heavy', px: px(F, size), lead: 0.88, track: -0.02 });
          const ww = Math.min(env.asp * 1.15, b.w / b.px * size);
          Wk.warp(g, b, 0, 0.08, ww, 'hump', 0.25, 0);
        }
      },
    };
  };

  // ---------------------------------------------------------------- a file card, the line as its name, tipped in 3D
  SH.file = (env) => {
    const { R, sc } = env;
    const tilt = R.sgn() * R.r(0.25, 0.45);
    const card = document.createElement('canvas');
    let key = '';
    return {
      bg: [248, 248, 250],
      anchors: [{ x: 0, y: 0.4, col: [248, 248, 250] }],
      cam: drift(env, 0.1, 0.04),
      draw(g, lt, F) {
        fill(g, [248, 248, 250]);
        const n = shown(env.ws, F.t);
        const name = env.ws.slice(0, n).map(low).join(' ') + (n >= env.ws.length ? '.mp3' : '');
        const H = Math.round(F.H * 0.22), Wc = Math.round(H * 4.2);
        if (key !== name + H) {
          key = name + H;
          card.width = Wc; card.height = H;
          const x = card.getContext('2d');
          x.clearRect(0, 0, Wc, H);
          x.fillStyle = '#fff'; Wk.rr(x, 4, 4, Wc - 8, H - 8, H * 0.22); x.fill();
          x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 3; x.stroke();
          x.fillStyle = 'rgb(235,240,250)'; Wk.rr(x, H * 0.18, H * 0.18, H * 0.64, H * 0.64, H * 0.14); x.fill();
          x.fillStyle = 'rgb(10,132,255)';
          for (let i = 0; i < 7; i++) { const bh = H * (0.12 + 0.3 * Math.abs(Math.sin(i * 1.7 + 0.5))); x.fillRect(H * 0.3 + i * H * 0.06, H * 0.5 - bh / 2, H * 0.035, bh); }
          x.save(); x.beginPath(); x.rect(H * 0.95, 0, Wc - H * 1.1, H); x.clip();
          Wk.txt(x, name || ' ', H * 0.98, H * 0.4, H * 0.26, [16, 16, 18], 'ui', { w: 700 });
          Wk.txt(x, 'Audio Recording · ' + (1 + (name.length % 9) * 0.3).toFixed(1) + ' MB', H * 0.98, H * 0.68, H * 0.16, [140, 140, 150], 'ui', { w: 500 });
          x.restore();
        }
        const ww = Math.min(env.asp * 0.85, 1.0);
        g.save(); g.shadowColor = 'rgba(0,0,0,0.18)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
        Wk.warp(g, { c: card, w: card.width, h: card.height }, 0, 0, ww, 'persp', tilt * (1 - 0.6 * ss(0, env.dur, lt)), 0);
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- a weather card: a small label, one huge thin word, the rest small
  SH.weather = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k];
    const top = env.ws.slice(0, k).map(low).join(' '), bot = env.ws.slice(k + 1).map(low).join(' ');
    const size = cl(env.asp * 0.7 / Math.max(2, kw.txt.length * 0.6), 0.14, 0.32);
    return {
      bg: [40, 110, 210],
      anchors: [{ x: 0, y: 0.4, col: [70, 140, 225] }],
      cam: drift(env, 0.1),
      draw(g, lt, F) {
        const gr = g.createLinearGradient(0, -0.5, 0, 0.5);
        gr.addColorStop(0, 'rgb(28,92,196)'); gr.addColorStop(1, 'rgb(96,160,232)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        g.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 8; i++) { const x = ((i * 0.41 + F.t * 0.02) % 1.8 - 0.9) * env.asp, y = 0.3 + (i % 3) * 0.06; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 0.05, y - (j % 2) * 0.02, 0.08, 0.04, 0, 0, PI * 2); g.fill(); } }
        const n = shown(env.ws, F.t);
        if (top) Wk.txt(g, top, 0, -0.26, 0.05, [255, 255, 255], 'ui', { align: 'center', w: 500, a: n > 0 ? 1 : 0 });
        if (n > k) Wk.txt(g, kw.lo.replace(/[.,;:!?]+$/, ''), 0, -0.02, size, [255, 255, 255], 'ui', { align: 'center', w: 400, a: ss(kw.t - 0.05, kw.t + 0.1, F.t) });
        if (bot && n > k + 1) Wk.txt(g, bot, 0, 0.17, 0.045, [255, 255, 255], 'ui', { align: 'center', w: 500 });
      },
    };
  };

  // ---------------------------------------------------------------- a text selection walking word to word, a squiggle under the key word
  SH.select = (env) => {
    const { R, sc } = env;
    const words = env.ws.map(low), size = cl(env.asp * 0.8 / Math.max(6, words.join(' ').length * 0.55), 0.05, 0.12);
    const k = lastKey(env.ws);
    return {
      bg: [240, 240, 242],
      anchors: [{ x: 0, y: 0.38, col: [240, 240, 242] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1.1 + 0.25 * ss(0, env.dur, lt), r: 0 }),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
        gr.addColorStop(0, 'rgb(250,250,252)'); gr.addColorStop(1, 'rgb(190,190,196)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const n = shown(env.ws, F.t);
        const full = words.join(' '), tw = Wk.measure(full, size, 'ui', 500);
        let x = -tw / 2;
        const sp = Wk.measure(' ', size, 'ui', 500);
        words.forEach((w, i) => {
          const ww = Wk.measure(w, size, 'ui', 500);
          if (i < n) {
            if (i === n - 1) {
              g.fillStyle = 'rgba(0,122,255,0.22)'; g.fillRect(x - 0.004, -size * 0.62, ww + 0.008, size * 1.24);
              g.fillStyle = 'rgb(0,122,255)';
              g.fillRect(x - 0.006, -size * 0.62, 0.004, size * 1.24); g.fillRect(x + ww + 0.002, -size * 0.62, 0.004, size * 1.24);
              g.beginPath(); g.arc(x - 0.004, -size * 0.66, 0.008, 0, PI * 2); g.arc(x + ww + 0.004, size * 0.66, 0.008, 0, PI * 2); g.fill();
            }
            Wk.txt(g, w, x, 0, size, [12, 12, 14], 'ui', { w: 500 });
            if (i === k) Wk.squiggle(g, x, x + ww, size * 0.72, size * 0.12);
          }
          x += ww + sp;
        });
      },
    };
  };

  // ---------------------------------------------------------------- a spinner and a caption; at night a lens flare
  SH.loader = (env) => {
    const { R, sc } = env;
    const night = env.variant % 2 === 1;
    return {
      bg: night ? [14, 14, 16] : [232, 232, 234],
      anchors: [{ x: 0, y: -0.06, col: night ? [14, 14, 16] : [232, 232, 234] }],
      cam: drift(env, 0.05),
      draw(g, lt, F) {
        fill(g, night ? [14, 14, 16] : [232, 232, 234]);
        if (night) {
          const gl = g.createRadialGradient(0, -0.06, 0, 0, -0.06, 0.12);
          gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.3, 'rgba(160,200,255,0.5)'); gl.addColorStop(0.55, 'rgba(255,170,90,0.25)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gl; g.fillRect(-0.2, -0.26, 0.4, 0.4);
        } else Wk.spinner(g, 0, -0.06, 0.03, F.t, [40, 40, 44]);
        const s = typed(env.ws, F.t, false);
        if (s) {
          const size = 0.042, w = Wk.measure(s, size, 'serif', 400) + 0.04;
          g.fillStyle = night ? 'rgba(200,210,230,0.85)' : 'rgb(10,10,12)'; g.fillRect(-w / 2, 0.08 - size * 0.75, w, size * 1.5);
          Wk.txt(g, s, 0, 0.082, size, night ? [10, 10, 12] : [255, 255, 255], 'serif', { align: 'center', w: 400 });
        }
      },
    };
  };

  // ---------------------------------------------------------------- words in label boxes, in quotes, with a small subtitle
  SH.labels = (env) => {
    const { R, sc } = env;
    const red = [226, 20, 30];
    const size = cl(env.asp * 0.6 / Math.max(4, env.ws.reduce((a, w) => a + w.lo.length + 1, 0) * 0.42), 0.05, 0.11);
    return {
      bg: [210, 210, 212],
      anchors: [{ x: 0, y: 0.4, col: [180, 180, 184] }],
      cam: drift(env, 0.08),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.1, 0, 0, 0.95);
        gr.addColorStop(0, 'rgb(250,250,250)'); gr.addColorStop(1, 'rgb(150,150,154)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const n = shown(env.ws, F.t), words = env.ws.map(low);
        const ws = words.map((w) => Wk.measure(w, size, 'cond', 400) + size * 0.3), tw = ws.reduce((a, b) => a + b, 0);
        let x = -tw / 2;
        words.forEach((w, i) => {
          if (i < n) {
            const red1 = i % 2 === 0;
            g.fillStyle = rgba(red1 ? red : [255, 255, 255]); g.fillRect(x, -size * 0.62, ws[i], size * 1.24);
            g.strokeStyle = 'rgb(16,16,18)'; g.lineWidth = 0.004; if (!red1) g.strokeRect(x, -size * 0.62, ws[i], size * 1.24);
            Wk.txt(g, w, x + ws[i] / 2, size * 0.04, size, [12, 12, 14], 'cond', { align: 'center', w: 400 });
          }
          x += ws[i];
        });
        if (n) { Wk.txt(g, '“', -tw / 2 - size * 0.5, -size * 0.6, size * 1.4, [16, 16, 18], 'heavy', { align: 'center', w: 400 }); }
        if (n >= words.length) Wk.txt(g, '”', tw / 2 + size * 0.5, -size * 0.6, size * 1.4, [16, 16, 18], 'heavy', { align: 'center', w: 400 });
        if (n) Wk.txt(g, words.slice(0, n).join(' · ').toUpperCase(), 0, size * 1.1, size * 0.22, [40, 40, 44], 'ui', { align: 'center', w: 500 });
      },
    };
  };

  // ---------------------------------------------------------------- the line's emoji as an object, giant letters behind it
  SH.object = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k];
    const letters = kw.txt.replace(/[^A-Z0-9']/g, '') || kw.txt;
    const half = Math.ceil(letters.length / 2);
    const size = cl((env.asp * 0.92 - 0.12) / Math.max(1, Wk.measure(letters, 1, 'heavy', 400)), 0.14, 0.5);
    return {
      bg: [236, 236, 238],
      anchors: [{ x: 0, y: 0.42, col: [236, 236, 238] }],
      cam: drift(env, 0.12, 0.05),
      draw(g, lt, F) {
        const gr = g.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
        gr.addColorStop(0, 'rgb(248,248,250)'); gr.addColorStop(1, 'rgb(205,205,210)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        const n = shown(env.ws, F.t);
        // the letters slide in from both sides
        const slide = 1 - outBack((F.t - env.t0) / 0.5);
        const a = Wk.txt(g, letters.slice(0, half), -0.06 - slide * 0.8, 0.02, size, [14, 14, 16], 'heavy', { align: 'right', w: 400 });
        Wk.txt(g, letters.slice(half), 0.06 + slide * 0.8, 0.02, size, [14, 14, 16], 'heavy', { align: 'left', w: 400 });
        const img = env.emoji && env.emoji();
        const s = 0.34 * (1 + F.pulse * 0.05), bob = Math.sin(lt * 3) * 0.015, spin = Math.sin(lt * 1.7) * 0.15;
        g.save(); g.translate(0, bob); g.rotate(spin);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(0, s * 0.55, s * 0.4, s * 0.08, 0, 0, PI * 2); g.fill();
        if (img) g.drawImage(img, -s / 2, -s / 2, s, s);
        else { g.fillStyle = rgba(sc.acc); g.beginPath(); g.arc(0, 0, s * 0.42, 0, PI * 2); g.fill(); }
        g.restore();
        const rest = env.ws.filter((_, i) => i !== k && i < n).map(low).join(' ');
        if (rest) Wk.txt(g, rest, 0, 0.36, 0.04, [40, 40, 44], 'ui', { align: 'center', w: 600 });
      },
    };
  };

  // ---------------------------------------------------------------- a blue tile, the key word repeated, through a fisheye
  SH.bulge = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k];
    const blue = sc.acc[2] > 200 && sc.acc[0] < 120 ? sc.acc : [0, 112, 255];
    const tile = document.createElement('canvas');
    let key = '';
    return {
      bg: [238, 238, 240],
      anchors: [{ x: 0, y: 0, col: blue }],
      cam: (lt) => ({ x: 0, y: 0, z: 1 + 0.08 * ss(0, env.dur, lt), r: 0.08 * Math.sin(lt * 0.9 + env.ph) }),
      draw(g, lt, F) {
        fill(g, [238, 238, 240]);
        const n = shown(env.ws, F.t), txt = env.ws.slice(0, Math.max(1, n)).map((w) => w.txt).join('');
        const S2 = Math.round(F.H * 0.7);
        if (key !== txt + S2) {
          key = txt + S2;
          tile.width = tile.height = S2;
          const x = tile.getContext('2d');
          x.fillStyle = rgba(blue); x.fillRect(0, 0, S2, S2);
          x.fillStyle = '#fff'; x.font = '400 ' + Math.round(S2 * 0.22) + 'px ' + Wk.FONTS.heavy; x.textBaseline = 'middle';
          for (let r = 0; r < 4; r++) x.fillText((txt + ' ').repeat(4), -S2 * 0.2 * r - S2 * 0.1, S2 * (0.15 + r * 0.25));
        }
        const s = 0.7;
        g.save(); Wk.rr(g, -s / 2, -s / 2, s, s, s * 0.1); g.clip();
        Wk.warp(g, { c: tile, w: tile.width, h: tile.height }, 0, 0, s, 'bulge', 0.9 + 0.2 * Math.sin(lt * 2), 0);
        g.restore();
      },
    };
  };

  // ---------------------------------------------------------------- the album cover, one word at a time over it
  SH.cover = (env) => {
    const { R, sc } = env;
    return {
      bg: [8, 8, 10],
      anchors: [{ x: 0, y: 0.46, col: [8, 8, 10] }],
      cam: drift(env, 0.12, 0.04),
      fx: (lt) => { const t = env.t0 + lt; for (const w of env.ws) if (w.key && t > w.t && t < w.t + 0.08) return { glitch: 0.7 }; return null; },
      draw(g, lt, F) {
        fill(g, [8, 8, 10]);
        const img = env.img, s = 0.84;
        if (img) {
          g.save(); Wk.rr(g, -s / 2, -s / 2, s, s, 0.04); g.clip();
          const z = 1.05 + 0.1 * ss(0, env.dur, lt);
          g.drawImage(img, -s * z / 2, -s * z / 2, s * z, s * z);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-s, -s, s * 2, s * 2);
          g.restore();
        }
        let cur = null;
        for (const w of env.ws) if (F.t >= w.t - 0.03) cur = w;
        if (cur) {
          const k = outBack((F.t - cur.t + 0.03) / 0.22);
          const col = cur.key ? sc.acc : [255, 255, 255];
          g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 20;
          Wk.txt(g, low(cur), 0, 0, 0.12 * (0.7 + 0.3 * k), col, 'ui', { align: 'center', w: 700 });
          g.restore();
        }
      },
    };
  };

  // ---------------------------------------------------------------- a CRT gradient with white lines bending and the sound drawn across it
  SH.crt = (env) => {
    const { R, sc } = env;
    const hist = new Float32Array(120);
    let lastT = -1;
    return {
      bg: [60, 60, 200],
      anchors: [{ x: 0, y: 0, col: [255, 255, 255] }],
      cam: drift(env, 0.05),
      draw(g, lt, F) {
        const gr = g.createLinearGradient(-env.asp / 2, 0, env.asp / 2, 0);
        gr.addColorStop(0, 'rgb(40,170,255)'); gr.addColorStop(0.5, 'rgb(90,80,240)'); gr.addColorStop(1, 'rgb(200,60,230)');
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        if (Math.abs(F.t - lastT) > 0.012) { hist.copyWithin(1, 0); hist[0] = (F.level || 0.25 + 0.25 * Math.sin(F.t * 9) * Math.sin(F.t * 2.3)); lastT = F.t; }
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.003;
        for (let i = 0; i < 9; i++) { const x0 = (-0.5 + i / 8) * env.asp; g.beginPath(); for (let y = -0.55; y <= 0.55; y += 0.02) g.lineTo(x0 + Math.sin(y * 6 + F.t * 1.5 + i) * 0.025 * (1 - Math.abs(y)), y); g.stroke(); }
        g.save(); g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 12; g.strokeStyle = 'rgb(255,255,255)'; g.lineWidth = 0.006;
        g.beginPath(); for (let i = 0; i < hist.length; i++) { const x = (-0.5 + i / (hist.length - 1)) * env.asp * 1.1, y = 0.1 + Math.sin(i * 0.5 + F.t * 6) * hist[i] * 0.08; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
        g.restore();
        g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = -0.5; y < 0.5; y += 0.008) g.fillRect(-BIG, y, BIG * 2, 0.003);
        const bx = Math.sin(lt * 0.9) * env.asp * 0.3; g.fillStyle = 'rgb(250,250,255)'; g.beginPath(); g.arc(bx, -0.12, 0.06, 0, PI * 2); g.fill();
        const s = typed(env.ws, F.t, false);
        if (s) Wk.txt(g, s, 0, 0.3, 0.05, [255, 255, 255], 'ui', { align: 'center', w: 700 });
      },
    };
  };

  // ---------------------------------------------------------------- the key word stretched tall and pixelated on each hit
  SH.stretch = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k];
    const dark = env.variant % 2 === 0;
    return {
      bg: dark ? [0, 0, 0] : [236, 236, 238],
      anchors: [{ x: 0, y: 0, col: dark ? [255, 255, 255] : [12, 12, 14] }],
      cam: drift(env, 0.1),
      fx: (lt) => { const t = env.t0 + lt; for (const w of env.ws) { const q = t - w.t; if (q > 0 && q < 0.1) return { pix: 1 - q / 0.1 }; } return null; },
      draw(g, lt, F) {
        fill(g, dark ? [0, 0, 0] : [236, 236, 238]);
        const n = shown(env.ws, F.t);
        let cur = env.ws[Math.max(0, n - 1)];
        if (!cur) return;
        const txt = low(cur), w = Wk.measure(txt, 0.2, 'heavy', 400);
        const sx = Math.min(1.6, env.asp * 0.8 / w), sy = (cur.key ? 3.2 : 2.2) * (0.85 + 0.15 * outBack((F.t - cur.t) / 0.25));
        g.save(); g.scale(sx, sy);
        Wk.txt(g, txt, 0, 0.01, 0.2, dark ? [255, 255, 255] : [12, 12, 14], 'heavy', { align: 'center', w: 400 });
        g.restore();
      },
    };
  };

  Wk.SHOTS = SH;
  Wk.QUIET = ['crt', 'loader', 'neonwave', 'curve', 'stack3d', 'bulge'];
})();
