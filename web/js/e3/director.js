/* Oley · Editlyric 3D director.
   Plans one shot per lyric line on an object in the room (never the same object twice in a row,
   never the same shot until the rest have had their turn), flies a real camera between them and
   renders it on the GPU. The camera is a pure function of time, so motion blur is real: every
   frame is several sub-frames along the camera's actual path. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const E3 = (O.E3 = O.E3 || {});
  const PI = Math.PI;
  let V3, M4;

  // ---------------------------------------------------------------- small maths
  const rng = (E3.rng = function (seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const f = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    f.r = (a, b) => a + (b - a) * f();
    f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
    f.sgn = () => (f() < 0.5 ? -1 : 1);
    return f;
  });
  E3.hash = function (str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const ease = (k) => { k = U.sat(k); return k * k * k * (k * (k * 6 - 15) + 10); };
  const sstep = (E3.sstep = (a, b, x) => { const k = U.sat((x - a) / (b - a)); return k * k * (3 - 2 * k); });
  function slerp(a, b, k) {
    const d = U.clamp(V3.dot(a, b), -1, 1);
    if (d > 0.9995) return V3.norm(V3.lerp(a, b, k));
    if (d < -0.995) {
      let m = V3.cross(a, [0, 1, 0]);
      if (V3.len(m) < 0.01) m = [1, 0, 0];
      m = V3.norm(m);
      return k < 0.5 ? slerp(a, m, k * 2) : slerp(m, b, k * 2 - 1);
    }
    const th = Math.acos(d), s = Math.sin(th);
    const wa = Math.sin((1 - k) * th) / s, wb = Math.sin(k * th) / s;
    return V3.norm([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
  }
  // smooth handheld wobble: a few sines with seeded phases
  function wob(seed) {
    const r = rng(seed), fs = [0.23, 0.41, 0.67, 1.13, 1.71], ph = fs.map(() => r() * 6.283), am = [1, 0.6, 0.35, 0.18, 0.08];
    return (t) => { let v = 0; for (let i = 0; i < fs.length; i++) v += am[i] * Math.sin(t * fs[i] * 6.283 + ph[i]); return v / 2.21; };
  }

  // ---------------------------------------------------------------- camera from a surface frame
  // F: {c, r, u, n, w, h}. A point on it from page coords (0..1, top-left origin)
  E3.onFrame = (F, u, v) => V3.add(F.c, V3.add(V3.mul(F.r, (u - 0.5) * F.w), V3.mul(F.u, (0.5 - v) * F.h)));
  function aim(F, T, a, b, d, roll) {
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const D = V3.norm([
      F.n[0] * ca * cb + F.r[0] * sa * cb + F.u[0] * sb,
      F.n[1] * ca * cb + F.r[1] * sa * cb + F.u[1] * sb,
      F.n[2] * ca * cb + F.r[2] * sa * cb + F.u[2] * sb,
    ]);
    const fwd = [-D[0], -D[1], -D[2]];
    let up = V3.sub(F.u, V3.mul(fwd, V3.dot(F.u, fwd)));
    if (V3.len(up) < 1e-3) up = [0, 1, 0];
    up = V3.norm(up);
    if (roll) { const rt = V3.norm(V3.cross(fwd, up)); up = V3.norm(V3.add(V3.mul(up, Math.cos(roll)), V3.mul(rt, Math.sin(roll)))); }
    return { pos: V3.add(T, V3.mul(D, d)), fwd, up, focus: d };
  }

  // rig presets: how the camera moves over a line. Flat things lie on the desk; walls stand up.
  const RIGS = {
    flat: [
      { id: 'top', w: 1, mk: (r) => ({ a: [r.r(-0.12, 0.12), r.r(-0.12, 0.12)], b: [r.r(-0.18, -0.05), r.r(-0.1, 0.04)], k: [1.12, 0.86], roll: [r.r(-0.16, 0.16), r.r(-0.1, 0.1)], fov: r.r(30, 38), fstop: r.r(2.4, 3.6) }) },
      { id: 'oblique', w: 1.6, mk: (r) => { const s = r.sgn(); return { a: [s * r.r(0.2, 0.5), s * r.r(0.05, 0.3)], b: [r.r(-0.95, -0.7), r.r(-0.8, -0.55)], k: [1.08, 0.82], roll: [0, s * 0.03], fov: r.r(32, 40), fstop: r.r(1.6, 2.4) }; } },
      { id: 'low', w: 0.8, mk: (r) => { const s = r.sgn(); return { a: [s * r.r(0.05, 0.35), s * r.r(0.0, 0.2)], b: [r.r(-1.16, -1.06), r.r(-1.1, -0.98)], k: [0.95, 0.8], roll: [0, 0], fov: r.r(28, 36), fstop: r.r(1.4, 2.0) }; } },
      { id: 'orbit', w: 1, mk: (r) => { const s = r.sgn(); return { a: [-s * r.r(0.4, 0.6), s * r.r(0.35, 0.55)], b: [r.r(-0.75, -0.55), r.r(-0.65, -0.45)], k: [1.0, 0.88], roll: [0, 0], fov: r.r(32, 38), fstop: r.r(1.8, 2.6) }; } },
    ],
    wall: [
      { id: 'push', w: 1.4, mk: (r) => ({ a: [r.r(-0.16, 0.16), r.r(-0.08, 0.08)], b: [r.r(-0.12, 0.08), r.r(-0.06, 0.06)], k: [1.18, 0.86], roll: [r.r(-0.05, 0.05), 0], fov: r.r(30, 40), fstop: r.r(2, 3.2) }) },
      { id: 'angle', w: 1.2, mk: (r) => { const s = r.sgn(); return { a: [s * r.r(0.42, 0.62), s * r.r(0.3, 0.45)], b: [r.r(-0.1, 0.12), r.r(-0.05, 0.08)], k: [1.0, 0.86], roll: [s * 0.04, 0], fov: r.r(30, 38), fstop: r.r(1.6, 2.4) }; } },
      { id: 'slide', w: 1, mk: (r) => { const s = r.sgn(); return { a: [-s * r.r(0.3, 0.45), s * r.r(0.25, 0.4)], b: [r.r(-0.08, 0.1), r.r(-0.04, 0.06)], k: [0.92, 0.88], roll: [0, 0], fov: r.r(30, 36), fstop: r.r(1.8, 2.6), look: 1 }; } },
      { id: 'crane', w: 0.8, mk: (r) => ({ a: [r.r(-0.2, 0.2), r.r(-0.15, 0.15)], b: [r.r(-0.32, -0.22), r.r(0.12, 0.25)], k: [1.05, 0.9], roll: [0, 0], fov: r.r(32, 40), fstop: r.r(2, 3) }) },
    ],
  };
  E3.RIGS = RIGS;

  // the camera for one shot: frame the shot's surface (or the part around the sung word) and move
  function shotCam(sh, t, asp) {
    const rg = sh.rig, F = sh.frame();
    const p = U.sat((t - sh.s) / Math.max(0.5, sh.e - sh.s));
    const pe = ease(p * 0.85 + 0.15 * p * p);
    const lerp = (v) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * pe : v);
    const fov = rg.fov, tn = Math.tan((fov * PI) / 360);
    const z = sh.zoom || 1;
    const hw = F.w * z, hh = F.h * z;
    let d = Math.max(hh / (2 * tn), hw / (2 * tn * asp)) / (sh.fill || 0.9);
    d *= lerp(rg.k);
    // a quick push on the line's key word
    if (sh.keyT != null && t > sh.keyT) { const q = t - sh.keyT; d *= 1 - 0.07 * Math.exp(-q * 4) * (1 - Math.exp(-q * 30)); }
    // where to look: between the middle of the surface and the word being sung
    const look = rg.look != null ? rg.look : sh.look == null ? 0.5 : sh.look;
    const fc = sh.focus ? sh.focus(t) : null;
    const cu = fc ? 0.5 + (fc.u - 0.5) * look : 0.5, cv = fc ? 0.5 + (fc.v - 0.5) * look : 0.5;
    const T = E3.onFrame(F, sh.cu != null ? sh.cu + (cu - 0.5) : cu, sh.cv != null ? sh.cv + (cv - 0.5) : cv);
    const c = aim(F, T, lerp(rg.a), lerp(rg.b), Math.max(0.09, d), lerp(rg.roll));
    // handheld
    const hs = sh.hand == null ? 1 : sh.hand;
    if (hs > 0) {
      const amp = c.focus * 0.006 * hs;
      const rt = V3.norm(V3.cross(c.fwd, c.up));
      c.pos = V3.add(c.pos, V3.add(V3.mul(rt, sh.wx(t) * amp), V3.mul(c.up, sh.wy(t) * amp)));
      c.fwd = V3.norm(V3.add(c.fwd, V3.add(V3.mul(rt, sh.wx(t + 7.3) * 0.0035 * hs), V3.mul(c.up, sh.wy(t + 3.1) * 0.0035 * hs))));
    }
    c.fov = fov;
    c.fstop = rg.fstop;
    return c;
  }

  // keep the camera inside the room and above the desk
  function contain(pos) {
    const D = O.Room.DESK;
    const p = [U.clamp(pos[0], -2.05, 2.25), U.clamp(pos[1], 0.3, 2.95), U.clamp(pos[2], -1.18, 1.6)];
    if (p[0] > -1.0 && p[0] < 1.0 && p[2] > -1.32 && p[2] < -0.44 && p[1] < D + 0.05) p[1] = D + 0.05;
    return p;
  }

  // ================================================================ director
  E3.Director = class {
    constructor(ctx, host) {
      V3 = O.R3.V3; M4 = O.R3.M4;
      this.ctx = ctx;
      this.host = host;
      this.ok = false;
      const G = (this.G = new O.GL(ctx.root, { cls: 'ed3', onRestored: () => ctx.stage.restartMode() }));
      if (!G.ok) { U.remove(G.canvas); return; }
      ctx.root.insertBefore(G.canvas, ctx.root.firstChild);
      this.r3 = new O.R3(G, {});
      this.room = new O.Room(this.r3, ctx);
      this.room.cam = (t) => this.camAt(t);
      this.pal = null;
      this.segs = [];
      this.track = null;
      this.seed = 1;
      this.asp = 16 / 9;
      this.scale = 1;
      this.slow = 0;
      this.paintedIdle = false;
      this.lastCam = null;
      this.ok = true;
      this.syncLook();
      this.idle();
      this.plan();
    }
    destroy() {
      if (this.G) { try { const l = this.G.gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {} U.remove(this.G.canvas); }
      this.ok = false;
    }
    syncLook() {
      const c = this.ctx;
      if (c.palette !== this.pal) { this.pal = c.palette; this.room.setPalette(c.palette); if (this.paintedIdle) this.idle(); }
      if (c.artImg !== this.art) { this.art = c.artImg; if (c.artImg) this.room.setArt(c.artImg); if (this.paintedIdle) this.idle(); }
    }
    onTrack(tr, salt) { this.track = tr || null; this.seed = E3.hash((tr && (tr.id || tr.title)) || 'x') ^ Math.imul(salt || 1, 2654435761); this.idle(); this.plan(); }
    onLyrics() { this.plan(); }
    onArt() { this.syncLook(); }
    // what every object shows before the song uses it
    idle() {
      this.paintedIdle = true;
      if (E3.idle) E3.idle(this);
    }

    // ---------------------------------------------------------------- planning
    plan() {
      const tl = this.ctx.tl, all = (tl && tl.lines) || [];
      const R = rng(this.seed ^ 0x5bd1e995);
      const ls = all.filter((L) => L.words && L.words.length);
      const segs = [];
      const used = {}, recent = [];
      let prevProp = null, prevProp2 = null;
      const pick = (L, s, e, inter) => {
        const pool = (inter ? E3.INTER : E3.SHOTS) || [];
        let best = null, tot = 0;
        const cand = [];
        for (const S of pool) {
          if (S.prop === prevProp) continue;
          if (L && S.fits && !S.fits(L)) continue;
          let w = S.w || 1;
          if (S.prop === prevProp2) w *= 0.35;
          if (L && S.kw && S.kw.test(L.text || '')) w *= 3.2;
          const ri = recent.lastIndexOf(S.id);
          if (ri >= 0) w *= Math.pow(0.08, Math.max(0, 1 - (recent.length - 1 - ri) / Math.max(4, pool.length * 0.8)));
          w /= 1 + (used[S.id] || 0) * 0.6;
          if (w > 0) { cand.push([S, w]); tot += w; }
        }
        if (!cand.length) return null;
        let x = R() * tot;
        for (const [S, w] of cand) { x -= w; if (x <= 0) { best = S; break; } }
        best = best || cand[cand.length - 1][0];
        used[best.id] = (used[best.id] || 0) + 1;
        recent.push(best.id);
        if (recent.length > 60) recent.shift();
        prevProp2 = prevProp; prevProp = best.prop;
        return this.instance(best, L, s, e, R, inter);
      };
      const end = tl && tl.duration ? tl.duration : ls.length ? ls[ls.length - 1].end + 30 : 1e6;
      const inters = (from, to) => {
        // long gaps: slow moves around the room, a new one every ~7s
        let s = from;
        while (to - s > 2.5) {
          const len = Math.min(to - s, R.r(6.5, 8.5));
          const e = to - s - len < 3 ? to : s + len;
          const sh = pick(null, s, e, true);
          if (sh) segs.push(sh);
          s = e;
        }
      };
      if (!ls.length) inters(0, Math.max(end, 600));
      else {
        if (ls[0].t > 3) inters(0, ls[0].t - 0.35);
        ls.forEach((L, i) => {
          const nx = ls[i + 1];
          const s = Math.max(segs.length ? segs[segs.length - 1].s + 0.35 : 0, L.t - 0.22);
          const lastW = L.words[L.words.length - 1];
          const singEnd = Math.max(L.singEnd || 0, lastW.t + (lastW.dur || 0.3));
          let e = nx ? nx.t - 0.22 : singEnd + 2.5;
          const gap = nx ? nx.t - singEnd : 99;
          const interAt = gap > 5.5 ? singEnd + 1.4 : null;
          if (interAt != null) e = interAt;
          const sh = pick(L, s, e, false);
          if (sh) segs.push(sh);
          if (interAt != null) inters(interAt, nx ? nx.t - 0.35 : Math.max(end, interAt + 20));
        });
      }
      segs.sort((a, b) => a.s - b.s);
      for (let i = 0; i < segs.length; i++) {
        const g = segs[i], nx = segs[i + 1];
        g.e = nx ? nx.s : g.s + 30;
        if (!nx) { g.fly = 0; continue; }
        const free = nx.s - (g.lastT != null ? g.lastT + 0.3 : g.s + 1.5);
        const lim = g.inter || nx.inter ? 1.8 : 1.05;
        g.fly = U.clamp(free, 0.3, lim);
        // how to get to the next shot
        const r = R();
        g.style = free < 0.18 && r < 0.3 ? 'cut' : free < 0.5 && r < 0.55 ? 'whip' : r < 0.18 ? 'rise' : 'fly';
        if (g.style === 'cut') g.fly = 0;
        if (g.style === 'whip') g.fly = Math.min(g.fly, R.r(0.26, 0.36));
      }
      this.segs = segs;
      this.segI = 0;
      this.live = new Set();
    }
    instance(S, L, s, e, R, inter) {
      const kind = S.surface || ((S.prop === 'phone' || S.prop === 'paper' || S.prop === 'book' || S.prop === 'receipt') ? 'flat' : 'wall');
      const sh = S.make(this, L, R) || {};
      sh.id = S.id;
      sh.prop = S.prop;
      sh.L = L;
      sh.s = s; sh.e = e;
      sh.inter = !!inter;
      if (!sh.frame) sh.frame = () => this.room.anchor(S.prop);
      if (sh.lastT == null && L) { const w = L.words[L.words.length - 1]; sh.lastT = w.t + Math.min(0.5, w.dur || 0.3); }
      if (sh.keyT == null && L && L.words[L.key] && L.words.length > 2) sh.keyT = L.words[L.key].t;
      if (!sh.rig) {
        const list = (S.rigs ? RIGS[kind].filter((g) => S.rigs.indexOf(g.id) >= 0) : RIGS[kind]) || RIGS[kind];
        let tot = 0; for (const g of list) tot += g.w;
        let x = R() * tot, g = list[0];
        for (const q of list) { x -= q.w; if (x <= 0) { g = q; break; } }
        sh.rig = g.mk(R);
        sh.rigId = g.id;
        if (S.rigTweak) S.rigTweak(sh.rig, R);
      }
      const sd = (R() * 1e9) | 0;
      sh.wx = wob(sd); sh.wy = wob(sd ^ 0x45d9f3b);
      return sh;
    }
    segAt(t) {
      const S = this.segs;
      if (!S.length) return -1;
      let i = Math.min(this.segI || 0, S.length - 1);
      while (i > 0 && S[i].s > t) i--;
      while (i < S.length - 1 && S[i + 1].s <= t) i++;
      this.segI = i;
      return S[i].s <= t ? i : -1;
    }

    // ---------------------------------------------------------------- the camera
    camAt(t) {
      const S = this.segs, asp = this.asp;
      let c;
      if (!S.length) c = { pos: [0.6, 1.4, 0.9], fwd: V3.norm([-0.5, -0.3, -1]), up: [0, 1, 0], fov: 44, focus: 1.6, fstop: 4 };
      else {
        let i = 0, lo = 0, hi = S.length - 1;
        while (lo <= hi) { const m = (lo + hi) >> 1; if (S[m].s <= t) { i = m; lo = m + 1; } else hi = m - 1; }
        const g = S[i], nx = S[i + 1];
        c = shotCam(g, t, asp);
        if (nx && g.fly > 0 && t > nx.s - g.fly) {
          const k = U.sat((t - (nx.s - g.fly)) / g.fly);
          const b = shotCam(nx, t, asp);
          const kp = ease(k);
          const kd = g.style === 'whip' ? sstep(0.18, 0.82, k) : ease(Math.pow(k, 0.85));
          const L = V3.dist(c.pos, b.pos);
          let pos = V3.lerp(c.pos, b.pos, kp);
          // pull back and swing over rather than slide through things
          let back = V3.mul(V3.add(c.fwd, b.fwd), -1); back[1] = 0;
          back = V3.len(back) < 0.05 ? [0, 0, 1] : V3.norm(back);
          const lift = g.style === 'whip' ? 0.04 : g.style === 'rise' ? 0.5 : 0.3;
          const amt = Math.min(0.55, lift * L) * Math.sin(PI * kp);
          pos = V3.add(pos, V3.add(V3.mul(back, amt * 0.7), [0, amt * (g.style === 'rise' ? 1 : 0.55), 0]));
          c = {
            pos, fwd: slerp(c.fwd, b.fwd, kd), up: slerp(c.up, b.up, kd),
            fov: U.lerp(c.fov, b.fov, kp), fstop: U.lerp(c.fstop, b.fstop, kp) * (1 + Math.sin(PI * kp) * 0.8),
            focus: Math.exp(U.lerp(Math.log(c.focus), Math.log(b.focus), kp)) + amt,
          };
        }
      }
      const pos = contain(c.pos);
      return { pos, at: V3.add(pos, V3.mul(c.fwd, Math.max(0.05, c.focus))), up: c.up, fov: c.fov, focus: c.focus, fstop: c.fstop, near: 0.012, far: 30 };
    }

    // ---------------------------------------------------------------- per frame
    frame(t, dt, A) {
      if (!this.ok) return;
      const ctx = this.ctx, G = this.G;
      this.syncLook();
      // size
      let s = O.glScale(ctx, true) * this.scale;
      if (G.size(ctx.W * s, ctx.H * s)) this.r3.resize(G.w, G.h);
      this.asp = G.w / Math.max(1, G.h);
      // surfaces: the shot on screen, the one we're flying to, and the one we just left
      const i = this.segAt(t);
      const want = new Set();
      if (i >= 0) {
        const g = this.segs[i];
        want.add(g);
        const nx = this.segs[i + 1];
        if (nx && t > nx.s - Math.max(g.fly, 0.05) - 0.4) want.add(nx);
        const pv = this.segs[i - 1];
        if (pv && t < g.s + 0.6) want.add(pv);
      } else if (this.segs.length) want.add(this.segs[0]);
      // don't let two shots fight over one object: the newest wins
      const byProp = {};
      for (const g of want) { const o = byProp[g.prop]; if (!o || g.s > o.s) byProp[g.prop] = g; }
      for (const k in byProp) {
        const g = byProp[k];
        try { if (g.paint) g.paint(t, A); if (g.set3) g.set3(t, A); } catch (e) { ctx.stage.reportError(e); }
      }
      this.room.tick(t, dt, A, byProp);
      // motion blur: as many sub-frames as the camera's movement needs
      const c1 = this.camAt(t), c0 = this.camAt(t - 1 / 120);
      const f1 = V3.norm(V3.sub(c1.at, c1.pos)), f0 = V3.norm(V3.sub(c0.at, c0.pos));
      const ang = Math.acos(U.clamp(V3.dot(f1, f0), -1, 1)) * 120 + (V3.dist(c1.pos, c0.pos) * 120) / Math.max(0.15, c1.focus);
      const shutter = 1 / 50;
      const px = (ang * shutter * G.w) / ((c1.fov * PI) / 180 * this.asp);
      const perf = ctx.settings.perf;
      const maxSub = perf === 'light' ? 3 : perf === 'smooth' ? 14 : 9;
      const sub = U.clamp(Math.ceil(px / 7), 1, maxSub);
      const fin = Object.assign({ bloom: 0.045, glow: 0, exposure: 1.12, vig: 0.42, grain: 0.03, ca: 0.0018, halation: 0.07, distort: 0.012, sat: 1.04, contrast: 1.06 }, this.finish || {});
      const t0 = performance.now();
      this.r3.frame(this.room.world, t, { sub, shutter, ao: perf !== 'light', dof: true, finish: fin });
      this.cpu = performance.now() - t0;
      // slow machine: render fewer pixels (the 5070 Ti never needs this)
      if (dt > 0.03 && dt < 0.5) this.slow++; else this.slow = Math.max(0, this.slow - 1);
      if (this.slow > 90 && this.scale > 0.55) { this.scale *= 0.85; this.slow = 0; }
      this.stats = { sub, seg: i, id: i >= 0 ? this.segs[i].id : '', rig: i >= 0 ? this.segs[i].rigId : '' };
    }
  };
})();
