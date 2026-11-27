/* Oley · Shadowplay shots. Each lyric line (or half of a long one) becomes one shot: a figure on a
   horizon, a word echoing down the screen, a sunset with rings off the sun, a tunnel of squares, two
   profiles facing, one huge word, a night with a crescent, a hyperspace warp, a heart drawn in one line,
   a rotary dial, a ring with the words round it, a sonar target, an emoji as a solid shape, two hands.
   A shot draws itself in world units (the screen is 1 tall, y down, 0 in the middle), and says where
   the camera can dive into it (anchors) and where a previous shot can be revealed from (portal). */
(function () {
  'use strict';
  const O = window.Oley;
  const S = O.Shadow;
  const PI = Math.PI;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgba = S.rgba;
  const outBack = (k) => { k = cl(k, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const BIG = 30;

  // how a word stands at time t: arrived (a), still grey (g), its pop (p)
  const wv = (w, t) => {
    const a = ss(w.t - 0.07, w.t + 0.03, t);
    const g = 1 - ss(w.t, w.t + cl(w.end - w.t, 0.12, 0.45), t);
    return { a, g: g * 0.75, p: outBack((t - w.t + 0.07) / 0.3) };
  };
  S.wv = wv;
  // set words in centred rows no wider than maxW
  function rows(ws, size, maxW, gap) {
    const out = [[]];
    let w = 0;
    gap = gap == null ? size * 0.22 : gap;
    for (const x of ws) {
      const m = S.measure(x.txt, size).w;
      if (out[out.length - 1].length && w + gap + m > maxW) { out.push([]); w = 0; }
      const r = out[out.length - 1];
      w += (r.length ? gap : 0) + m;
      r.push({ w: x, m });
    }
    return out.map((r) => { const tw = r.reduce((a, q, i) => a + q.m + (i ? gap : 0), 0); let x = -tw / 2; for (const q of r) { q.x = x + q.m / 2; x += q.m + gap; } return { items: r, w: tw }; });
  }
  // draw laid-out rows centred at (cx, cy)
  function drawRows(g, R, cx, cy, size, lead, t, col, acc, o) {
    o = o || {};
    const H = R.length * size * lead;
    R.forEach((r, ri) => {
      const y = cy - H / 2 + (ri + 0.5) * size * lead;
      for (const q of r.items) {
        const s = wv(q.w, t);
        if (s.a <= 0) continue;
        const k = o.pop ? 0.82 + 0.18 * s.p : 1;
        S.text(g, q.w.txt, cx + q.x, y + (1 - s.a) * size * 0.25, size * k, q.w.key ? acc : col, { mid: true, alpha: s.a, grey: q.w.key ? 0 : s.g, skew: o.skew, sx: o.sx });
      }
    });
    return H;
  }
  S.rows = rows; S.drawRows = drawRows;
  // a world-filling rectangle
  const fill = (g, col) => { g.fillStyle = rgba(col); g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2); };
  // the main figure: the cover's cut-out when there is one, otherwise the drawn one
  function figure(env, g, x, y, h, col, o) {
    o = o || {};
    if (env.cut && env.cut.ok && env.cut.figureLike && !o.drawn) {
      const hh = env.cut.cropped ? h * 0.75 : h;
      if (o.rim) env.cut.draw(g, x, y, hh, o.rim, { line: o.rimW || 0.0035, flip: o.flip, rot: o.rot });
      env.cut.draw(g, x, y, hh, col, o);
      return env.cut.corePt(x, y, hh, o.flip);
    }
    if (o.rim) S.fig(g, 'stand', x, y, h, rgba(o.rim), { line: o.rimW || 0.004, flip: o.flip, rot: o.rot });
    S.fig(g, 'stand', x, y, h, rgba(col), o);
    return S.figCore('stand', x, y, h, o.flip);
  }
  const lastKey = (ws) => { let k = ws.findIndex((w) => w.key); if (k < 0) k = ws.length - 1; return k; };
  // a camera that drifts in slowly and turns a touch
  const drift = (env, z1, r) => (lt) => { const k = lt / Math.max(0.5, env.dur); return { x: Math.sin(lt * 0.4 + env.ph) * 0.006, y: 0, z: 1 + (z1 || 0.06) * k, r: (r || 0) * (k - 0.5) }; };

  const SH = {};

  // ---------------------------------------------------------------- a figure on the horizon, the words beside it; the horizon tilts on the key word
  SH.horizon = (env) => {
    const { R, sc } = env, inv = env.variant % 2 === 1;
    const sky = inv ? sc.floor : sc.bg, floor = inv ? sc.bg : sc.floor, figc = sky, rim = floor;
    const fy = 0.22 + R.r(-0.04, 0.04), side = R.sgn(), fx = side * R.r(0.08, env.asp * 0.25), fh = R.r(0.24, 0.36);
    const size = 0.068 + R.r(0, 0.02), maxW = env.asp * 0.44;
    const RW = rows(env.ws, size, maxW);
    const k = lastKey(env.ws), kt = env.ws[k] ? env.ws[k].t : 1e9;
    const tiltDir = R.sgn(), tilt = R.ch(0.6) ? R.r(0.22, 0.4) : 0;
    const core = (env.cut && env.cut.ok && env.cut.figureLike) ? env.cut.corePt(fx, fy, fh * (env.cut.cropped ? 0.75 : 1)) : S.figCore('stand', fx, fy, fh);
    return {
      bg: sky,
      anchors: [{ x: core[0], y: core[1], col: figc }, { x: -fx * 0.6, y: fy + 0.18, col: floor }, { x: -fx, y: -0.3, col: sky }],
      cam: (lt) => { const c = drift(env, 0.08)(lt); c.r += tilt * tiltDir * ss(kt - env.t0 - 0.05, kt - env.t0 + 0.35, lt); return c; },
      draw(g, lt, F) {
        fill(g, sky);
        g.fillStyle = rgba(floor); g.fillRect(-BIG, fy, BIG * 2, BIG);
        figure(env, g, fx, fy + 0.002, fh, figc, { rim, flip: side > 0 });
        drawRows(g, RW, -fx * 0.15 - side * env.asp * 0.08, fy - fh - 0.04 - RW.length * size * 0.55, size, 1.12, F.t, rim === sc.bg ? sc.bg : rim, sc.acc);
      },
    };
  };

  // ---------------------------------------------------------------- the key word echoing down the screen
  SH.echo = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k], lead = env.ws.slice(0, k), tail = env.ws.slice(k + 1);
    const tight = env.variant % 2 === 1; // tight copies like an extrusion, or a full stack
    const n = tight ? R.i(5, 8) : R.i(4, 6);
    let size = cl(env.asp * 0.62 / Math.max(2, kw.txt.length * 0.46), 0.08, 0.2);
    const sub = (z) => z * 0.45;
    const fit = (z) => { const a = rows(lead, sub(z), env.asp * 0.7).length * (lead.length ? 1 : 0), b = rows(tail, sub(z), env.asp * 0.7).length * (tail.length ? 1 : 0); return (tight ? z * 1.2 + (n - 1) * z * 0.18 : n * z * 1.02) + (a + b) * sub(z) * 1.2 + z * 0.5; };
    while (size > 0.05 && fit(size) > 0.86) size *= 0.92;
    const step = tight ? size * 0.18 : size * 1.02;
    const RW = rows(lead, sub(size), env.asp * 0.7), RT = rows(tail, sub(size), env.asp * 0.7);
    const top = -fit(size) / 2 + (lead.length ? RW.length * sub(size) * 1.2 : 0) + size * 0.55;
    const dt = Math.max(0.06, Math.min(0.16, (kw.end - kw.t) / n));
    return {
      bg: sc.bg,
      anchors: [{ x: env.asp * 0.4, y: 0.4, col: sc.bg }],
      cam: (lt) => { const c = drift(env, 0.05)(lt); c.y = (tight ? 0 : 1) * (ss(kw.t - env.t0, kw.t - env.t0 + n * dt + 0.3, lt) - 0.5) * step * 0.6; return c; },
      draw(g, lt, F) {
        fill(g, sc.bg);
        const t = F.t;
        drawRows(g, RW, 0, top - size * 0.55 - RW.length * sub(size) * 0.6, sub(size), 1.15, t, sc.ink, sc.acc);
        for (let i = n - 1; i >= 0; i--) {
          const ti = kw.t - 0.04 + i * dt, a = ss(ti - 0.03, ti + 0.05, t);
          if (a <= 0) continue;
          const done = ss(kw.t + n * dt, kw.t + n * dt + 0.25, t);
          const fade = tight ? 1 - i / (n + 1) : 1 - (n - 1 - i) / (n + 1) * (1 - done);
          const col = i === n - 1 && done > 0.5 ? sc.acc : mix(sc.bg, sc.ink, Math.max(0.15, fade));
          const y = top + i * step - (1 - a) * step * 0.6;
          // a smear as each copy drops in
          if (a < 1) for (let s = 1; s <= 3; s++) S.text(g, kw.txt, 0, y - s * step * 0.18 * (1 - a), size, col, { mid: true, alpha: 0.18 * a, sy: 1.04 });
          S.text(g, kw.txt, 0, y, size, col, { mid: true, alpha: a, sy: 1.04 });
        }
        drawRows(g, RT, 0, top + (n - 1) * step + size * 0.6 + RT.length * sub(size) * 0.6, sub(size), 1.15, t, sc.ink, sc.acc);
      },
    };
  };

  // ---------------------------------------------------------------- a sunset: the sun, rings off it on the beat, silhouettes close to us
  SH.sun = (env) => {
    const { R, sc, pal } = env;
    const top = mix(pal.dark, [70, 52, 110], 0.5), mid = mix([255, 170, 150], pal.light, 0.3), low = [255, 226, 190];
    const sx = R.r(-0.15, 0.15) * env.asp, sy = 0.08, sr = R.r(0.05, 0.075);
    const hz = 0.17;
    const ridge = []; for (let i = 0; i <= 24; i++) ridge.push([(-0.5 + i / 24) * env.asp * 1.6, hz - Math.max(0, Math.sin(i * 0.55 + R.r(0, 6)) * 0.05 + R.r(0, 0.03))]);
    const size = 0.085, RW = rows(env.ws, size, env.asp * 0.55);
    const ink = sc.name === 'paper' ? sc.acc : [255, 120, 160];
    const fg = R.ch(0.5);
    return {
      bg: low,
      anchors: [{ x: sx, y: sy, col: [255, 246, 226] }, { x: 0, y: 0.45, col: fg ? [22, 18, 28] : mix(top, [20, 14, 30], 0.6) }],
      portal: { x: sx, y: sy, r: sr },
      cam: drift(env, 0.07, 0.02),
      draw(g, lt, F) {
        const gr = g.createLinearGradient(0, -0.55, 0, hz);
        gr.addColorStop(0, rgba(top)); gr.addColorStop(0.6, rgba(mid)); gr.addColorStop(1, rgba(low));
        g.fillStyle = gr; g.fillRect(-BIG, -BIG, BIG * 2, BIG * 2);
        // the sun and its glow
        const gl = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 5);
        gl.addColorStop(0, 'rgba(255,240,210,0.9)'); gl.addColorStop(1, 'rgba(255,200,170,0)');
        g.fillStyle = gl; g.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
        g.fillStyle = 'rgb(255,246,226)'; g.beginPath(); g.arc(sx, sy, sr * (1 + F.pulse * 0.05), 0, PI * 2); g.fill();
        // rings, one per word and one per beat
        g.lineWidth = 0.004;
        for (const w of env.ws) { const q = F.t - w.t; if (q < 0 || q > 1.6) continue; g.strokeStyle = 'rgba(255,240,230,' + (0.7 * (1 - q / 1.6)) + ')'; g.beginPath(); g.arc(sx, sy, sr * (1.4 + q * 5), 0, PI * 2); g.stroke(); }
        // the far shore
        g.fillStyle = rgba(mix(top, [20, 14, 30], 0.6)); g.beginPath(); g.moveTo(-BIG, BIG); for (const p of ridge) g.lineTo(p[0], p[1]); g.lineTo(BIG, hz); g.lineTo(BIG, BIG); g.fill();
        // the water's shine
        g.fillStyle = 'rgba(255,230,210,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(sx - sr * (1.6 - i * 0.2), hz + 0.02 + i * 0.025, sr * (3.2 - i * 0.4), 0.006);
        drawRows(g, RW, 0, -0.3, size, 1.05, F.t, ink, sc.acc === ink ? [255, 255, 255] : sc.acc);
        // close silhouettes, out of focus
        if (fg) { figure(env, g, -env.asp * 0.33, 0.62, 0.9, [22, 18, 28], { blur: 3 }); figure(env, g, env.asp * 0.33, 0.62, 0.86, [22, 18, 28], { blur: 3, flip: true }); }
        else { g.fillStyle = 'rgb(22,18,28)'; g.beginPath(); g.ellipse(0, 0.62, env.asp * 0.5, 0.2, 0, 0, PI * 2); g.fill(); }
      },
    };
  };

  // ---------------------------------------------------------------- an endless tunnel of squares; words fly up out of it
  SH.tunnel = (env) => {
    const { R, sc } = env;
    const ca = sc.name === 'noir' ? [244, 226, 140] : sc.acc, cb = sc.name === 'noir' ? [16, 14, 18] : sc.bg;
    const q = 0.72, sp = R.r(0.45, 0.7);
    const size = 0.09;
    return {
      bg: cb,
      anchors: [{ x: 0, y: 0, col: ca }],
      portal: { x: 0, y: 0, r: 0.16, sq: true },
      cam: (lt) => ({ x: 0, y: 0, z: 1, r: Math.sin(lt * 0.5 + env.ph) * 0.03 }),
      draw(g, lt, F) {
        fill(g, cb);
        // squares from big to small, sliding toward us forever
        const ph = (lt * sp) % 2, s0 = 3.2 * Math.pow(q, -ph);
        for (let k = 0; k < 26; k++) {
          const s = s0 * Math.pow(q, k);
          if (s < 0.004) break;
          if (s > 6) continue;
          g.fillStyle = rgba((k + Math.floor(lt * sp)) % 2 ? ca : cb);
          g.fillRect(-s / 2, -s / 2, s, s);
        }
        // a figure far down the tunnel, coming closer
        const fh = 0.05 + ss(0, env.dur, lt) * 0.12;
        figure(env, g, 0, fh * 0.45, fh, [10, 10, 12]);
        // each word flies up out of the middle and settles
        let y = -0.36;
        for (const w of env.ws) {
          const s = wv(w, F.t);
          if (s.a <= 0) continue;
          const k = outBack((F.t - w.t + 0.07) / 0.45);
          const z = 0.25 + 0.75 * k;
          S.text(g, w.txt, 0, y * z, size * z * (w.key ? 1.25 : 1), w.key && sc.acc !== ca ? sc.acc : [255, 255, 255], { mid: true, alpha: s.a, skew: -0.15 * (1 - k), stroke: [12, 10, 14] });
          y += size * 1.15;
        }
      },
    };
  };

  // ---------------------------------------------------------------- two profiles facing; the key word flips them black to white
  SH.heads = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kt = env.ws[k] ? env.ws[k].t : 1e9;
    const size = 0.085, RW = rows(env.ws, size, env.asp * 0.3);
    const gap = R.r(0.22, 0.32), hh = R.r(0.55, 0.7);
    return {
      bg: [255, 255, 255],
      anchors: [{ x: -env.asp * 0.32, y: 0.3, col: [0, 0, 0] }, { x: 0, y: -0.4, col: [255, 255, 255] }],
      cam: drift(env, 0.05, -0.03),
      hit: (t) => (t > kt - 0.02 && t < kt + 0.08 ? 1 : 0),
      draw(g, lt, F) {
        const flip = F.t > kt;
        const bg = flip ? [0, 0, 0] : [255, 255, 255], fg = flip ? [255, 255, 255] : [0, 0, 0];
        fill(g, bg);
        S.fig(g, 'head', -gap - 0.22, 0.52, hh, rgba(fg));
        S.fig(g, 'head', gap + 0.22, 0.52, hh, rgba(flip ? sc.acc : fg), { flip: true, line: flip ? 0.004 : 0 });
        if (!flip) S.fig(g, 'head', gap + 0.22, 0.52, hh, rgba(fg), { flip: true });
        drawRows(g, RW, 0, -0.05, size, 1.1, F.t, fg, sc.acc);
      },
    };
  };

  // ---------------------------------------------------------------- one huge word, tilted, sliding in; or lying on the floor under a fallen figure
  SH.big = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k], rest = env.ws.filter((_, i) => i !== k);
    const floor = env.variant % 2 === 1;
    const size = cl(env.asp * 0.8 / Math.max(2, kw.txt.length * 0.5), 0.12, 0.42) * (floor ? 0.8 : 1);
    const rot = R.r(-0.18, 0.18), skew = R.r(-0.25, 0.25), from = R.sgn();
    const RW = rows(rest, 0.065, env.asp * 0.6);
    const bg = floor ? sc.bg : sc.bg, ink = sc.ink;
    return {
      bg,
      anchors: [{ x: 0, y: floor ? 0.35 : -0.4, col: floor ? sc.floor : bg }],
      cam: drift(env, 0.1, 0.03),
      draw(g, lt, F) {
        fill(g, bg);
        const s = wv(kw, F.t), m = 1 - ss(kw.t - 0.06, kw.t + 0.22, F.t);
        if (floor) {
          g.fillStyle = rgba(sc.floor); g.fillRect(-BIG, 0.05, BIG * 2, BIG);
          drawRows(g, RW, 0, -0.22, 0.065, 1.1, F.t, ink, sc.acc);
          if (s.a > 0) {
            for (let i = 3; i >= 0; i--) S.text(g, kw.txt, from * m * 0.6 - from * i * 0.03 * m, 0.27, size, sc.acc, { mid: true, sy: 0.42, skew: -0.9, alpha: i ? 0.15 * s.a : s.a });
          }
          S.fig(g, 'stand', -0.05, 0.25, 0.26, rgba(sc.bg === sc.floor ? [0, 0, 0] : sc.bg), { rot: PI / 2 * from * 0.9 });
        } else {
          drawRows(g, RW, 0, -0.32, 0.065, 1.1, F.t, ink, sc.acc);
          if (s.a > 0) for (let i = 4; i >= 0; i--) S.text(g, kw.txt, from * m * 0.9 - from * i * 0.05 * m, 0.04, size, i ? mix(bg, ink, 0.3) : ink, { mid: true, rot, skew, sy: 1.1, alpha: i ? 0.3 * s.a * m : s.a });
        }
      },
    };
  };

  // ---------------------------------------------------------------- night: stars arriving, a crescent, white silhouettes on a line
  SH.night = (env) => {
    const { R, sc } = env;
    const stars = []; for (let i = 0; i < 220; i++) stars.push([R.r(-1.2, 1.2) * env.asp, R.r(-0.8, 0.35), R.r(0.6, 2), R.r(0, 1)]);
    const mx = R.sgn() * env.asp * R.r(0.22, 0.34), my = -0.3, mr = 0.05;
    const hz = 0.25, size = 0.075, RW = rows(env.ws, size, env.asp * 0.55);
    return {
      bg: [4, 4, 8],
      anchors: [{ x: mx + mr * 0.5, y: my + mr * 0.3, col: [255, 255, 255] }, { x: 0, y: 0, col: [4, 4, 8] }],
      portal: { x: mx, y: my, r: mr },
      cam: drift(env, 0.06),
      draw(g, lt, F) {
        fill(g, [4, 4, 8]);
        const n = ss(0, Math.min(env.dur, 2.5), lt);
        for (const s of stars) { if (s[3] > n) continue; const tw = 0.6 + 0.4 * Math.sin(F.t * 3 + s[3] * 40); g.fillStyle = 'rgba(255,255,255,' + tw + ')'; const r = s[2] * 0.0011; g.fillRect(s[0] - r, s[1] - r, r * 2, r * 2); }
        S.moon(g, mx, my, mr, [255, 255, 255], [4, 4, 8], 0.3 + 0.7 * ss(0, env.dur, lt));
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-BIG, hz, BIG * 2, 0.002);
        figure(env, g, -0.08, hz, 0.28, [255, 255, 255]);
        if (!env.cut || !env.cut.ok || !env.cut.figureLike) S.fig(g, 'stand', 0.03, hz, 0.25, 'rgb(255,255,255)', { flip: true });
        drawRows(g, RW, 0, -0.08, size, 1.1, F.t, [255, 255, 255], sc.acc);
      },
    };
  };

  // ---------------------------------------------------------------- hyperspace: light streaks rushing past a figure floating
  SH.warp = (env) => {
    const { R, sc } = env;
    const st = []; for (let i = 0; i < 260; i++) st.push([R.r(0, PI * 2), R.r(0, 1), R.r(0.5, 1.5)]);
    const size = 0.08;
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0.06, col: [255, 255, 255] }, { x: 0.45, y: -0.35, col: [0, 0, 0] }],
      cam: (lt) => ({ x: 0, y: 0, z: 1 + lt * 0.02, r: lt * 0.05 }),
      fx: (lt) => (lt < 0.05 ? { flash: 1, flashCol: [255, 255, 255] } : lt < 0.1 ? { flash: 0.9, flashCol: sc.acc } : null),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        const sp = 1.6 + F.pulse * 0.8;
        g.lineCap = 'round';
        for (const s of st) {
          const d = (s[1] + lt * sp * 0.35 * s[2]) % 1, r0 = 0.03 + d * d * 1.2, r1 = r0 * (1.15 + d * 0.5);
          g.strokeStyle = 'rgba(235,240,255,' + Math.min(1, d * 2) + ')';
          g.lineWidth = 0.001 + d * 0.004;
          g.beginPath(); g.moveTo(Math.cos(s[0]) * r0, Math.sin(s[0]) * r0); g.lineTo(Math.cos(s[0]) * r1, Math.sin(s[0]) * r1); g.stroke();
        }
        figure(env, g, 0, 0.16 + Math.sin(lt * 1.3) * 0.01, 0.34, [255, 255, 255], { rot: -0.35 + Math.sin(lt * 0.8) * 0.05 });
        let y = -0.3;
        for (const w of env.ws) {
          const s = wv(w, F.t);
          if (s.a > 0) { const k = outBack((F.t - w.t + 0.07) / 0.35); S.text(g, w.txt, 0, y, size * (0.3 + 0.7 * k) * (w.key ? 1.3 : 1), w.key ? sc.acc : [255, 255, 255], { mid: true, alpha: s.a }); }
          y += size * 1.1;
        }
      },
    };
  };

  // ---------------------------------------------------------------- a heart drawn in one line; the words set round it, tilted
  SH.heart = (env) => {
    const { R, sc } = env;
    const red = sc.name === 'red' ? [255, 255, 255] : [230, 30, 40];
    const bg = [0, 0, 0], hs = R.r(0.36, 0.46);
    const spots = [[-0.32, -0.26, -0.18], [0.3, -0.27, 0.12], [-0.28, 0.24, 0.1], [0.3, 0.24, -0.16], [0, -0.38, 0], [0, 0.38, 0.05]];
    return {
      bg,
      anchors: [{ x: 0, y: 0.03, col: bg }],
      portal: { x: 0, y: 0.03, r: hs * 0.18 },
      cam: drift(env, 0.09, 0.03),
      draw(g, lt, F) {
        fill(g, bg);
        g.save(); g.shadowColor = rgba(red, 0.9); g.shadowBlur = 8;
        S.heart(g, 0, 0, hs, rgba(red), 0.0035, F.pulse);
        g.restore();
        figure(env, g, 0, 0.09, 0.14, [255, 255, 255], { drawn: true, line: 0 });
        env.ws.forEach((w, i) => {
          const s = wv(w, F.t), p = spots[i % spots.length], sz = w.key ? 0.075 : 0.056;
          if (s.a > 0) S.text(g, w.txt, p[0] * env.asp / 1.5, p[1] + (i >= spots.length ? 0.07 : 0), sz, w.key ? sc.acc : [255, 255, 255], { mid: true, rot: p[2], alpha: s.a, grey: s.g });
        });
      },
    };
  };

  // ---------------------------------------------------------------- a rotary dial that turns a notch on every word
  SH.dial = (env) => {
    const { R, sc } = env;
    const k = lastKey(env.ws), kw = env.ws[k];
    const letter = (kw.txt.replace(/[^A-Z0-9]/g, '') || 'O')[0];
    const hi = R.i(0, 9);
    const labels = '1234567890'.split(''); labels[hi] = letter;
    const r = 0.38, size = 0.06;
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0, col: [0, 0, 0] }],
      portal: { x: 0, y: 0, r: r * 0.5 },
      cam: drift(env, 0.12, -0.04),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        let rot = 0;
        for (const w of env.ws) rot += 0.32 * outBack((F.t - w.t) / 0.3) * (F.t > w.t ? 1 : 0);
        S.dial(g, 0, 0, r, [255, 255, 255], 0.0035, rot * 0.4, labels, hi, sc.acc);
        const RW = rows(env.ws, size, r * 0.9);
        drawRows(g, RW, 0, 0, Math.min(size, 0.16 / Math.max(1, RW.length)), 1.1, F.t, [255, 255, 255], sc.acc);
      },
    };
  };

  // ---------------------------------------------------------------- a white ring in 3D with the words running round it
  SH.ring = (env) => {
    const { R, sc } = env;
    const rx = 0.42, ry = 0.15, th = 0.055, w0 = 0.3;
    const txt = env.ws.map((w) => w.txt).join('  ') + '  ';
    const spin = R.sgn() * R.r(0.25, 0.4);
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0.02, col: [0, 0, 0] }],
      portal: { x: 0, y: 0, r: 0.1 },
      cam: drift(env, 0.12, 0.02),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        // the side, then the top
        g.fillStyle = 'rgb(170,170,176)'; g.beginPath(); g.ellipse(0, th, rx, ry, 0, 0, PI * 2); g.fill();
        g.fillStyle = 'rgb(246,246,248)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.fill();
        g.fillStyle = 'rgb(150,150,156)'; g.beginPath(); g.ellipse(0, 0, rx * w0 / 0.42 * 0.9, ry * w0 / 0.42 * 0.9, 0, 0, PI * 2); g.fill();
        g.fillStyle = 'rgb(0,0,0)'; g.beginPath(); g.ellipse(0, th * 0.6, rx * w0 / 0.42 * 0.9, ry * w0 / 0.42 * 0.9, 0, 0, PI * 2); g.fill();
        // the letters printed round the top
        const shown = env.ws.reduce((a, w) => a + (F.t > w.t - 0.05 ? w.txt.length + 2 : 0), 0);
        const n = txt.length, rm = (rx + rx * w0 / 0.42 * 0.9) / 2, rmy = (ry + ry * w0 / 0.42 * 0.9) / 2;
        for (let i = 0; i < Math.min(n, shown); i++) {
          const a = lt * spin + (i / n) * PI * 2, x = Math.cos(a) * rm, y = Math.sin(a) * rmy;
          const tx = -Math.sin(a) * rm, ty = Math.cos(a) * rmy;
          S.text(g, txt[i], x, y, 0.05, [20, 20, 24], { mid: true, rot: Math.atan2(ty, tx), sy: 0.55 + 0.45 * Math.abs(Math.sin(a)) });
        }
        S.fig(g, 'stand', Math.cos(lt * spin * 0.5 + 2) * rm * 0.9, Math.sin(lt * spin * 0.5 + 2) * rmy * 0.9, 0.08, 'rgb(10,10,12)');
      },
    };
  };

  // ---------------------------------------------------------------- a figure in the middle of a sonar: circles going out, words in the corners
  SH.sonar = (env) => {
    const { R, sc } = env;
    const fh = 0.62, fy = 0.42;
    const pos = [[-0.26, -0.3], [0.26, -0.3], [-0.26, 0.12], [0.26, 0.12], [0, -0.42], [0, 0.3]];
    const ring = sc.name === 'red' ? [0, 0, 0] : [200, 30, 40];
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: 0.05, col: [0, 0, 0] }, { x: 0, y: 0.45, col: [255, 255, 255] }],
      cam: drift(env, 0.08, -0.02),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        g.fillStyle = 'rgb(255,255,255)'; g.fillRect(-BIG, 0.3, BIG * 2, BIG);
        g.strokeStyle = rgba(ring, 0.8); g.lineWidth = 0.0025;
        for (let i = 0; i < 6; i++) { const r = ((lt * 0.12 + i / 6) % 1) * 0.9; g.globalAlpha = 1 - r / 0.9; g.beginPath(); g.arc(0, -0.1, r, 0, PI * 2); g.stroke(); }
        g.globalAlpha = 1;
        g.beginPath(); g.moveTo(-0.6, -0.55); g.lineTo(0.6, 0.35); g.moveTo(0.6, -0.55); g.lineTo(-0.6, 0.35); g.stroke();
        figure(env, g, 0, fy, fh, [0, 0, 0], { rim: [255, 255, 255], rimW: 0.003 });
        env.ws.forEach((w, i) => {
          const s = wv(w, F.t), p = pos[i % pos.length];
          if (s.a > 0) S.text(g, w.txt, p[0] * env.asp / 1.3, p[1] + Math.floor(i / pos.length) * 0.08, w.key ? 0.095 : 0.075, w.key ? sc.acc : [255, 255, 255], { mid: true, alpha: s.a, grey: s.g, sx: 0.92 });
        });
      },
    };
  };

  // ---------------------------------------------------------------- the line's emoji as a solid shape (or drawn in one line), with a dot and the words
  SH.object = (env) => {
    const { R, sc } = env;
    const line = R.ch(0.5), side = R.sgn();
    const size = 0.075, RW = rows(env.ws, size, env.asp * 0.4);
    return {
      bg: sc.bg,
      anchors: [{ x: -side * env.asp * 0.22, y: 0, col: line ? sc.bg : sc.ink }],
      cam: drift(env, 0.08, 0.03),
      draw(g, lt, F) {
        fill(g, sc.bg);
        g.strokeStyle = rgba(sc.ink, 0.5); g.lineWidth = 0.002; g.beginPath(); g.moveTo(-BIG, 0.3 + 0.1); g.lineTo(BIG, 0.25); g.stroke();
        const img = env.emoji && env.emoji();
        const a = ss(0, 0.3, lt), sz = 0.46 * (0.9 + 0.1 * outBack(lt / 0.4));
        if (img) {
          const c = S.emojiShape(img, line ? sc.acc : sc.ink, line ? 3 : 0);
          if (c) { g.globalAlpha = a; g.drawImage(c, -side * env.asp * 0.22 - sz / 2, -sz / 2 - 0.02, sz, sz); g.globalAlpha = 1; }
        } else {
          g.fillStyle = rgba(sc.acc); g.beginPath(); g.arc(-side * env.asp * 0.22, 0, 0.12 * a, 0, PI * 2); g.fill();
        }
        drawRows(g, RW, side * env.asp * 0.2, 0, size, 1.15, F.t, sc.ink, sc.acc, { pop: true });
      },
    };
  };

  // ---------------------------------------------------------------- two hands reaching up into the words
  SH.hands = (env) => {
    const { R, sc } = env;
    const size = 0.085, RW = rows(env.ws, size, env.asp * 0.34);
    return {
      bg: [0, 0, 0],
      anchors: [{ x: 0, y: -0.45, col: [0, 0, 0] }],
      cam: drift(env, 0.1),
      draw(g, lt, F) {
        fill(g, [0, 0, 0]);
        const up = ss(0, 0.6, lt) * 0.08 + F.pulse * 0.01;
        S.fig(g, 'hand', -0.3, 0.72 - up, 0.6, 'rgb(255,255,255)', { line: 0.003, rot: 0.25, flip: true });
        S.fig(g, 'hand', 0.3, 0.72 - up, 0.6, 'rgb(255,255,255)', { line: 0.003, rot: -0.25 });
        drawRows(g, RW, 0, -0.18, size, 1.1, F.t, [255, 255, 255], sc.acc, { pop: true });
      },
    };
  };

  S.SHOTS = SH;
  // shots that work without words (the intro and the breaks)
  S.QUIET = ['sun', 'night', 'warp', 'tunnel', 'heart', 'ring'];
})();
