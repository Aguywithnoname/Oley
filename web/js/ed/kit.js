/* Editlyric kit: the shared parts every scene is built from — word timing helpers, procedural
   textures (paper, cork, brick, wood, asphalt, felt, concrete, grain), a generic icon set, a realistic
   phone (floating, lying on a desk, or a cropped close-up that follows the action), a desktop window,
   an on-screen keyboard, tap ripples and a mouse pointer. Scenes register themselves with O.Ed.add. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const Ed = (O.Ed = { scenes: {}, K: {} });
  const K = Ed.K;

  Ed.add = function (name, cls, meta) {
    const m = Object.assign({ name, w: 1, fam: 'misc', min: 1, max: 40, vars: 1, cams: ['still', 'push', 'drift'], trig: '', moods: {} }, meta || {});
    m.trigSet = new Set(String(m.trig).split(/\s+/).filter(Boolean));
    cls.meta = m;
    Ed.scenes[name] = cls;
  };

  O.css('ed-kit', `
.m-ed .ed-scene { position: absolute; inset: 0; overflow: hidden; }
.m-ed .ed-cam { position: absolute; inset: 0; transform-origin: 0 0; will-change: transform; }
.m-ed .ed-fill { position: absolute; inset: 0; }
.m-ed .ed-grain { position: absolute; inset: -128px; pointer-events: none; mix-blend-mode: overlay; opacity: 0.22; background-size: 256px 256px; }
.m-ed .ed-vig { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 85%, rgba(0,0,0,0.6) 100%); }
.m-ed .ed-ic { display: inline-block; width: 1em; height: 1em; vertical-align: -0.14em; }
.m-ed .ed-ic svg { width: 100%; height: 100%; display: block; overflow: visible; }
/* phone */
.m-ed .ph-root { position: absolute; inset: 0; perspective: 1900px; perspective-origin: 50% 45%; overflow: hidden; }
.m-ed .ph-back { position: absolute; inset: 0; background: #111; }
/* flat on purpose: in preserve-3d the screen, body and glass sit in one plane and fight (the body's sheen showed through half the screen) */
.m-ed .ph-dev { position: absolute; left: 0; top: 0; transform-style: flat; will-change: transform; }
.m-ed .ph-body { position: absolute; inset: 0; border-radius: var(--rad);
  background: linear-gradient(140deg, #b4b4ba 0%, #55555b 14%, #29292d 42%, #46464b 70%, #9c9ca3 88%, #3c3c41 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.32), inset 0 0 0 calc(var(--bez) * 0.42) #121214, inset 0 0 0 var(--bez) #050506, var(--shadow); }
.m-ed .ph-scr { position: absolute; left: var(--bez); top: var(--bez); right: var(--bez); bottom: var(--bez); border-radius: calc(var(--rad) - var(--bez)); overflow: hidden; background: #000; transform: translateZ(0); }
.m-ed .ph-ui { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.m-ed .ph-glass { position: absolute; left: var(--bez); top: var(--bez); right: var(--bez); bottom: var(--bez); border-radius: calc(var(--rad) - var(--bez)); pointer-events: none; z-index: 8;
  background: linear-gradient(var(--ga, 118deg), rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 18%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 100%); }
.m-ed .ph-hole { position: absolute; left: 50%; border-radius: 50%; background: radial-gradient(circle at 38% 36%, #39404e 0%, #0b0c10 46%, #000 70%); z-index: 9; box-shadow: 0 0 0 1px rgba(255,255,255,0.06); }
.m-ed .ph-btn { position: absolute; border-radius: 3px; background: linear-gradient(90deg, #303034, #8e8e95 45%, #3a3a3f); }
.m-ed .ph-sb { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-between; z-index: 6; font-family: 'Oley Sans', sans-serif; font-weight: 600; }
.m-ed .ph-sb .r { display: flex; align-items: center; gap: 0.32em; }
.m-ed .ph-home { position: absolute; left: 50%; bottom: 0; border-radius: 99px; z-index: 6; }
/* tap ripple + pointer */
.m-ed .ed-tap { position: absolute; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 55%, rgba(255,255,255,0) 72%);
  box-shadow: 0 0 0 1.5px rgba(255,255,255,0.65); z-index: 30; opacity: 0; will-change: transform, opacity; }
.m-ed .ed-tap.dk { background: radial-gradient(circle, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 72%); box-shadow: 0 0 0 1.5px rgba(0,0,0,0.25); }
.m-ed .ed-ptr { position: absolute; left: 0; top: 0; z-index: 40; pointer-events: none; will-change: transform; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); }
/* keyboard */
.m-ed .kb { position: absolute; left: 0; right: 0; bottom: 0; font-family: 'Oley Sans', sans-serif; }
.m-ed .kb.lt { background: #d1d3d9; color: #111; } .m-ed .kb.dk { background: #2b2b2e; color: #f2f2f2; }
.m-ed .kb .sg { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-around; font-weight: 500; }
.m-ed .kb .sg span { flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 0.3em; border-radius: 0.4em; }
.m-ed .kb .sg i { width: 1px; align-self: stretch; margin: 0.55em 0; background: rgba(0,0,0,0.16); } .m-ed .kb.dk .sg i { background: rgba(255,255,255,0.16); }
.m-ed .kb .k { position: absolute; display: grid; place-items: center; border-radius: 0.28em; font-weight: 400; }
.m-ed .kb.lt .k { background: #fdfdfd; box-shadow: 0 1px 0 rgba(0,0,0,0.33); } .m-ed .kb.dk .k { background: #6b6b6f; box-shadow: 0 1px 0 rgba(0,0,0,0.5); }
.m-ed .kb.lt .k.fn { background: #adb1b9; } .m-ed .kb.dk .k.fn { background: #454548; }
.m-ed .kb .k.dn { filter: brightness(0.86); }
.m-ed .kb .pop { position: absolute; display: grid; place-items: center; border-radius: 0.38em; font-weight: 400; z-index: 4; opacity: 0; pointer-events: none;
  box-shadow: 0 0.12em 0.4em rgba(0,0,0,0.3); }
.m-ed .kb.lt .pop { background: #fff; } .m-ed .kb.dk .pop { background: #77777b; }
/* desktop window */
.m-ed .dw { position: absolute; border-radius: 0.7em; overflow: hidden; font-family: 'Oley Sans', sans-serif; box-shadow: 0 2.4em 5em rgba(0,0,0,0.45), 0 0.5em 1.4em rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.25); }
.m-ed .dw .tb { height: 2.3em; display: flex; align-items: center; padding: 0 0.9em; gap: 0.8em; font-size: 1em; font-weight: 600; }
.m-ed .dw .tb .tt { flex: 1; text-align: center; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-ed .dw .tb .ctl { display: flex; gap: 1.15em; opacity: 0.7; font-weight: 400; }
`);

  // ================================================================ words & timing
  K.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  K.bare = (w) => (w ? w.bare || w.raw || '' : '');
  K.words = (L) => (L.adlib ? L.words.slice() : L.words.filter((w) => !w.adlib));
  K.text = (L, lower) => { const s = K.words(L).map(K.bare).join(' '); return lower ? s.toLowerCase() : s; };
  K.on = (w, t, lead) => t >= w.t - (lead == null ? 0.03 : lead);
  K.sungN = (ws, t, lead) => { let n = 0; for (const w of ws) if (K.on(w, t, lead)) n++; return n; };
  K.sung = (ws, t, lower, lead) => { const s = ws.slice(0, K.sungN(ws, t, lead)).map(K.bare).join(' '); return lower ? s.toLowerCase() : s; };
  K.key = (L) => L.words[L.key] || L.words[0];
  K.clean = (s) => String(s || '').replace(/[^\p{L}\p{N}'’ -]/gu, '').trim();
  K.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  // split a line into n phrase chunks (balanced by word count), each with its start time and text
  K.chunks = function (L, n) {
    const ws = K.words(L);
    n = Math.max(1, Math.min(n, ws.length));
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = Math.round((k * ws.length) / n), b = Math.round(((k + 1) * ws.length) / n);
      const part = ws.slice(a, b);
      if (part.length) out.push({ words: part, t: part[0].t, end: part[part.length - 1].end, text: part.map(K.bare).join(' ') });
    }
    return out;
  };
  // typing: how long a word takes, and what it shows part-way (typo, backspace and fix included)
  K.span = (w, typo) => Math.max(0.16, Math.min(typo ? w.dur * 0.95 : w.dur * 0.8, typo ? 1.3 : 0.065 * K.bare(w).length + 0.14));
  const KEYS = 'qwertyuiop asdfghjkl zxcvbnm';
  K.typo = function (word, r) {
    const w = word;
    if (w.length < 4) return null;
    const i = r.int(Math.floor(w.length / 2), w.length - 1);
    if (r.chance(0.5) && i > 0 && w[i] !== w[i - 1]) return w.slice(0, i - 1) + w[i] + w[i - 1] + w.slice(i + 1);
    const ch = w[i].toLowerCase(), k = KEYS.indexOf(ch);
    const nb = k >= 0 ? (KEYS[k + 1] && KEYS[k + 1] !== ' ' ? KEYS[k + 1] : KEYS[k - 1]) : 'n';
    return w.slice(0, i) + (nb && nb !== ' ' ? nb : 'n') + w.slice(i + 1);
  };
  K.typed = function (word, p, typo) {
    if (!typo) return { s: word.slice(0, Math.ceil(word.length * U.sat(p) - 1e-6)), bad: false };
    let first = 0;
    while (first < word.length && word[first] === typo[first]) first++;
    if (p < 0.42) return { s: typo.slice(0, Math.ceil(typo.length * (p / 0.42) - 1e-6)), bad: false };
    if (p < 0.6) return { s: typo, bad: true };
    if (p < 0.72) { const k = U.prog(0.6, 0.72, p); return { s: typo.slice(0, Math.round(typo.length - (typo.length - first) * k)), bad: k < 0.5 }; }
    const k = U.prog(0.72, 0.95, p);
    return { s: word.slice(0, first + Math.ceil((word.length - first) * k - 1e-6)), bad: false };
  };
  // the whole line as typed text at time t: { s, bad, cur } (cur = index of the word being typed)
  K.typeLine = function (ws, t, typos) {
    let s = '', bad = false, cur = -1;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      if (t < w.t - 0.02) break;
      const ty = typos && typos[i];
      const st = K.typed(K.bare(w), U.prog(w.t - 0.02, w.t - 0.02 + K.span(w, ty), t), ty);
      s += (i ? ' ' : '') + st.s;
      bad = st.bad;
      cur = i;
    }
    return { s, bad, cur };
  };
  K.pickTypos = function (ws, r, on, chance) {
    const out = {};
    if (!on || !r.chance(chance == null ? 0.4 : chance)) return out;
    const c = ws.map((w, i) => i).filter((i) => K.bare(ws[i]).length >= 4 && ws[i].dur > 0.3);
    if (c.length) { const i = r.pick(c); out[i] = K.typo(K.bare(ws[i]), r); }
    return out;
  };
  K.fit = function (text, font, maxW, size, min) {
    const w = U.textWidth(text, font.replace('{s}', size + 'px'));
    return w > maxW ? Math.max(min || 8, size * (maxW / w)) : size;
  };
  K.clock = (d) => (O.hour12 ? U.fmtClockAmPm(d).replace(/\s?[ap]m$/i, '') : U.fmtClock(d));
  K.now = () => new Date();
  K.initials = (s) => String(s || 'oley').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

  // ================================================================ textures
  const texCache = {};
  const TEXV = 'oley.tex.2.';
  K.tex = function (kind) {
    if (texCache[kind]) return texCache[kind];
    let url = null;
    try { url = localStorage.getItem(TEXV + kind); } catch (e) {}
    if (!url) { url = TEX[kind](); try { localStorage.setItem(TEXV + kind, url); } catch (e) {} }
    texCache[kind] = url;
    return url;
  };
  // make textures ahead of time, one per idle moment, so a scene never waits for one
  K.warm = function (kinds) {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
    let i = 0;
    const next = () => { if (i >= kinds.length) return; const k = kinds[i++]; try { K.tex(k); } catch (e) {} setTimeout(() => idle(next, { timeout: 600 }), 90); };
    setTimeout(() => idle(next, { timeout: 600 }), 200);
  };
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function pixels(x, w, h, fn) {
    const d = x.createImageData(w, h), a = d.data;
    for (let y = 0, i = 0; y < h; y++) for (let xx = 0; xx < w; xx++, i += 4) { const c = fn(xx, y); a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = c.length > 3 ? c[3] : 255; }
    x.putImageData(d, 0, 0);
  }
  const gauss = (r) => r() + r() + r() - 1.5;
  // fn evaluated every f pixels, then smoothly upscaled into a W×H canvas
  function lowres(W, H, f, fn) {
    const w = Math.ceil(W / f), h = Math.ceil(H / f);
    const [sc, sx] = canvas(w, h);
    pixels(sx, w, h, (px, py) => fn(px * f, py * f));
    const [c, x] = canvas(W, H);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(sc, 0, 0, W, H);
    return [c, x];
  }
  function fine(x, W, H, amp, r) {
    const d = x.getImageData(0, 0, W, H), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const n = (r() - 0.5) * amp; a[i] += n; a[i + 1] += n; a[i + 2] += n; }
    x.putImageData(d, 0, 0);
  }
  // tileable value noise: wraps at the period p
  function tnoise(seed, p) {
    const n = U.noise2(seed);
    return (x, y) => {
      const fx = x / p, fy = y / p;
      const a = n(x, y), b = n(x - p, y), c = n(x, y - p), d = n(x - p, y - p);
      return U.lerp(U.lerp(a, b, fx), U.lerp(c, d, fx), fy);
    };
  }
  const TEX = {
    grain() {
      const [c, x] = canvas(256, 256), r = U.rng(911);
      pixels(x, 256, 256, () => { const v = U.clamp(128 + gauss(r) * 150, 0, 255); return [v, v, v]; });
      return c.toDataURL('image/png');
    },
    paper() {
      const S = 512, r = U.rng(31), n1 = tnoise(5, 512 / 64), n2 = tnoise(6, 512 / 16);
      const [c, x] = lowres(S, S, 2, (px, py) => { const m = (n1(px / 64, py / 64) - 0.5) * 9 + (n2(px / 16, py / 16) - 0.5) * 5; return [244 + m, 241 + m, 233 + m * 1.1]; });
      fine(x, S, S, 14, r);
      x.lineCap = 'round';
      for (let i = 0; i < 700; i++) {
        const X = r() * S, Y = r() * S, a = r() * Math.PI * 2, l = 4 + r() * 16;
        x.strokeStyle = r() < 0.5 ? `rgba(120,110,95,${0.04 + r() * 0.05})` : `rgba(255,255,255,${0.1 + r() * 0.1})`;
        x.lineWidth = 0.4 + r() * 0.7;
        x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a + 0.6) * l * 0.5, Y + Math.sin(a + 0.6) * l * 0.5, X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke();
      }
      return c.toDataURL('image/jpeg', 0.9);
    },
    cork() {
      const S = 512, r = U.rng(77), n1 = tnoise(8, 512 / 40);
      const [c, x] = lowres(S, S, 4, (px, py) => { const m = (n1(px / 40, py / 40) - 0.5) * 30; return [170 + m, 126 + m * 0.85, 80 + m * 0.6]; });
      fine(x, S, S, 26, r);
      const cols = [[110, 72, 40], [208, 168, 118], [146, 102, 60], [88, 56, 30], [226, 190, 140]];
      for (let i = 0; i < 8000; i++) {
        const cc = cols[(r() * cols.length) | 0], rr = 0.5 + r() * r() * 3.2;
        x.fillStyle = `rgba(${cc[0]},${cc[1]},${cc[2]},${(0.35 + r() * 0.55).toFixed(2)})`;
        x.fillRect(r() * S, r() * S, rr * 1.6, rr * (0.8 + r() * 0.9));
      }
      return c.toDataURL('image/jpeg', 0.88);
    },
    brick() {
      const Wd = 1024, Hd = 512, r = U.rng(41), n1 = tnoise(9, 1024 / 32), n2 = tnoise(10, 1024 / 8);
      const bw = 128, bh = 48, mo = 7;
      const tone = {};
      const [c, x] = lowres(Wd, Hd, 2, (px, py) => {
        const row = Math.floor(py / bh), off = row % 2 ? bw / 2 : 0;
        const col = Math.floor((px + off) / bw) % (Wd / bw);
        const lx = (px + off) % bw, ly = py % bh;
        const nn = (n1(px / 32, py / 32) - 0.5) * 22 + (n2(px / 8, py / 8) - 0.5) * 18;
        if (lx < mo || ly < mo) { const v = 92 + nn * 0.8; return [v, v * 0.96, v * 0.9]; }
        const key = row + ':' + col;
        if (!tone[key]) { const q = U.rng(U.hash(key)); tone[key] = [q.range(-26, 22), q.range(-8, 8)]; }
        const [tv, th] = tone[key];
        const edge = Math.min(lx - mo, ly - mo, bw - lx, bh - ly);
        const v = tv + nn + (edge < 4 ? (4 - edge) * -6 : 0);
        return [148 + v + th, 64 + v * 0.7, 48 + v * 0.55];
      });
      fine(x, Wd, Hd, 22, r);
      return c.toDataURL('image/jpeg', 0.88);
    },
    asphalt() {
      const S = 512, r = U.rng(51), n1 = tnoise(12, 512 / 48);
      const [c, x] = lowres(S, S, 4, (px, py) => { const m = (n1(px / 48, py / 48) - 0.5) * 16; return [38 + m, 39 + m, 43 + m]; });
      fine(x, S, S, 40, r);
      x.fillStyle = 'rgba(200,200,205,0.35)';
      for (let i = 0; i < 4000; i++) x.fillRect(r() * S, r() * S, 1 + r(), 1 + r());
      return c.toDataURL('image/jpeg', 0.88);
    },
    wood() {
      // planks of oak: grain runs along x, irregular late-wood lines, fibres, a seam between planks
      const Wd = 1024, Hd = 512, r = U.rng(61), n1 = tnoise(13, 1024 / 256), n2 = tnoise(14, 1024 / 64), n3 = tnoise(17, 1024 / 8);
      const plank = 171;
      const [c, x] = lowres(Wd, Hd, 2, (px, py) => {
        const pk = Math.floor(py / plank), ly = py - pk * plank;
        const sh = pk * 37.7;
        const yy = py + sh + (n1(px / 256, (py + sh) / 96) - 0.5) * 70 + (n2(px / 64, py / 24) - 0.5) * 9;
        const ring = yy / (5.5 + pk * 0.8);
        const f = ring - Math.floor(ring);
        const late = Math.pow(1 - f, 7) * 0.8;
        const fiber = n3(px / 8, py * 1.7) - 0.5;
        let v = late * 34 + fiber * 12 + (n1(px / 256 + pk, 0.5) - 0.5) * 16 + pk * 4;
        if (ly < 2 || ly > plank - 2) v += 46;
        else if (ly < 4) v -= 10;
        return [146 - v, 98 - v * 0.78, 60 - v * 0.52];
      });
      fine(x, Wd, Hd, 10, r);
      x.fillStyle = 'rgba(40,22,10,0.35)';
      for (let i = 0; i < 2600; i++) x.fillRect(r() * Wd, r() * Hd, 1 + r() * 3, 1);
      return c.toDataURL('image/jpeg', 0.9);
    },
    felt() {
      const S = 256, [c, x] = canvas(S, S), r = U.rng(71);
      pixels(x, S, S, () => { const m = gauss(r) * 14; return [22 + m * 0.4, 88 + m, 54 + m * 0.6]; });
      return c.toDataURL('image/jpeg', 0.9);
    },
    distress() {
      const S = 512, r = U.rng(91), n1 = tnoise(18, 512 / 24), n2 = tnoise(19, 512 / 96);
      const [fc, fx] = lowres(S, S, 2, (px, py) => { const v = (n1(px / 24, py / 24) * 0.6 + n2(px / 96, py / 96) * 0.4) * 255; return [v, v, v]; });
      const src = fx.getImageData(0, 0, S, S).data;
      const [c, x] = canvas(S, S);
      const d = x.createImageData(S, S), a = d.data;
      for (let i = 0; i < a.length; i += 4) { const v = src[i] / 255 + (r() - 0.5) * 0.14; a[i + 3] = v < 0.36 ? 0 : v < 0.42 ? 120 : 255; }
      x.putImageData(d, 0, 0);
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 260; i++) { x.beginPath(); x.ellipse(r() * S, r() * S, 0.6 + r() * r() * 5, 0.6 + r() * 2.5, r() * 3, 0, Math.PI * 2); x.fill(); }
      void fc;
      return c.toDataURL('image/png');
    },
    drops() {
      const S = 512, [c, x] = canvas(S, S), r = U.rng(93);
      for (let i = 0; i < 2600; i++) {
        const big = r() < 0.06, rad = big ? 3 + r() * 7 : 0.6 + r() * 2.4, X = r() * S, Y = r() * S;
        const g = x.createRadialGradient(X - rad * 0.35, Y - rad * 0.4, rad * 0.1, X, Y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.45, 'rgba(255,255,255,0.18)'); g.addColorStop(0.85, 'rgba(40,50,60,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(X, Y, rad, rad * (0.85 + r() * 0.3), 0, 0, Math.PI * 2); x.fill();
      }
      return c.toDataURL('image/png');
    },
    concrete() {
      const S = 512, r = U.rng(81), n1 = tnoise(15, 512 / 64), n2 = tnoise(16, 512 / 12);
      const [c, x] = lowres(S, S, 2, (px, py) => { const m = (n1(px / 64, py / 64) - 0.5) * 30 + (n2(px / 12, py / 12) - 0.5) * 14; return [126 + m, 125 + m, 121 + m]; });
      fine(x, S, S, 24, r);
      x.fillStyle = 'rgba(40,40,40,0.4)';
      for (let i = 0; i < 1200; i++) x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
      return c.toDataURL('image/jpeg', 0.88);
    },
  };
  // a layer of film grain over a scene
  K.grain = (parent, op) => { const g = U.el('div', 'ed-grain', parent); g.style.backgroundImage = 'url(' + K.tex('grain') + ')'; if (op != null) g.style.opacity = op; return g; };
  K.vig = (parent, op) => { const v = U.el('div', 'ed-vig', parent); if (op != null) v.style.opacity = op; return v; };
  K.bg = (el, kind, size) => { el.style.backgroundImage = 'url(' + K.tex(kind) + ')'; el.style.backgroundSize = size || ''; };

  // ================================================================ icons (generic line icons, 24×24)
  const P = (d, sw) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const F = (d) => `<path d="${d}" fill="currentColor"/>`;
  const IC = {
    search: P('M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.4 15.4 21 21', 2.2),
    mic: P('M12 3.2a2.8 2.8 0 0 1 2.8 2.8v5.5a2.8 2.8 0 0 1-5.6 0V6A2.8 2.8 0 0 1 12 3.2zM5.8 11.2a6.2 6.2 0 0 0 12.4 0M12 17.5v3.3'),
    phone: F('M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z'),
    chat: F('M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v8.5A2.5 2.5 0 0 1 19 18h-8.5L5.5 21.5V18h-.5A2.5 2.5 0 0 1 2.5 15.5V7A2.5 2.5 0 0 1 5 4.5z'),
    bell: F('M12 22a2.4 2.4 0 0 0 2.3-1.9H9.7A2.4 2.4 0 0 0 12 22zm7-5.5V11a7 7 0 0 0-5.4-6.8v-.6a1.6 1.6 0 0 0-3.2 0v.6A7 7 0 0 0 5 11v5.5l-1.8 1.8v.9h17.6v-.9z'),
    chevR: P('M9 5.5 15.5 12 9 18.5', 2.4), chevL: P('M15 5.5 8.5 12 15 18.5', 2.4), chevD: P('M5.5 9 12 15.5 18.5 9', 2.4),
    x: P('M6 6l12 12M18 6 6 18', 2.2), check: P('M4.5 12.5 9.5 17.5 19.5 6.5', 2.4), plus: P('M12 5v14M5 12h14', 2.2),
    heart: F('M12 20.8s-7.4-4.5-9.5-9.1C1.1 8.4 3.1 4.6 6.8 4.6c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.7 0 5.7 3.8 4.3 7.1-2.1 4.6-9.5 9.1-9.5 9.1z'),
    heartO: P('M12 20.3s-7.2-4.4-9.2-8.9C1.4 8.3 3.3 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.5 0 5.4 3.5 4 6.6-2 4.5-9.2 8.9-9.2 8.9z', 1.9),
    comment: P('M20.5 11.6a8.3 8.3 0 0 1-12.2 7.3L3.6 20.4l1.5-4.6a8.3 8.3 0 1 1 15.4-4.2z', 1.9),
    send: P('M21 3 3.5 10.6l7 2.9 2.9 7zM21 3l-10.5 10.5', 1.9),
    bookmark: P('M6.5 3.5h11v17l-5.5-4-5.5 4z', 1.9),
    more: F('M5 10.3a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zm7 0a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zm7 0a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z'),
    lock: P('M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5V12A1.5 1.5 0 0 1 6 10.5zM8 10.5V7.6a4 4 0 0 1 8 0v2.9'),
    trash: P('M4 6.5h16M9.5 6.5v-2h5v2M6.3 6.5l1 14h9.4l1-14M10 10.5v6.5M14 10.5v6.5', 1.8),
    file: P('M6.5 2.5h8l4.5 4.5v14.5H6.5zM14.5 2.5V7H19', 1.7),
    warn: F('M10.3 3.9a2 2 0 0 1 3.4 0l8 13.9a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3zM11 9v5.2h2V9zm0 7v2h2v-2z'),
    err: F('M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zM8.6 7.2 7.2 8.6 10.6 12l-3.4 3.4 1.4 1.4 3.4-3.4 3.4 3.4 1.4-1.4-3.4-3.4 3.4-3.4-1.4-1.4-3.4 3.4z'),
    info: F('M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zM11 10.5v7h2v-7zm0-4v2h2v-2z'),
    play: F('M7.5 4.6v14.8a.8.8 0 0 0 1.2.7l12-7.4a.8.8 0 0 0 0-1.4l-12-7.4a.8.8 0 0 0-1.2.7z'),
    pause: F('M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z'),
    sun: P('M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6', 1.8),
    moon: F('M20.6 14.6A8.6 8.6 0 0 1 9.4 3.4a8.6 8.6 0 1 0 11.2 11.2z'),
    cloud: F('M7 19h10.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 6.1 12a3.6 3.6 0 0 0 .9 7z'),
    rain: F('M7 15.5h10.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 6.1 8.5a3.6 3.6 0 0 0 .9 7z') + P('M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5', 1.6),
    snow: F('M7 14.5h10.6a4.2 4.2 0 0 0 .5-8.4A6.2 6.2 0 0 0 6.1 7.5a3.6 3.6 0 0 0 .9 7z') + F('M8 17.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 1.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4-1.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z'),
    bolt: F('M13.2 2 4.5 13.6h6.4L9.8 22l8.9-11.9h-6.5z'),
    turnL: P('M15 20.5V13a3.5 3.5 0 0 0-3.5-3.5H5M9 5.5l-4 4 4 4', 2.6), turnR: P('M9 20.5V13a3.5 3.5 0 0 1 3.5-3.5H19M15 5.5l4 4-4 4', 2.6),
    straight: P('M12 20.5V4.5M7 9.5l5-5 5 5', 2.6), uturn: P('M8 20.5V9a4 4 0 0 1 8 0v4.5M12.5 10.5l3.5 3.5 3.5-3.5', 2.6),
    pin: F('M12 2.3a7 7 0 0 1 7 7c0 5.3-7 12.4-7 12.4S5 14.6 5 9.3a7 7 0 0 1 7-7zm0 4.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z'),
    clock: P('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7.5V12l3 2', 1.9),
    mail: P('M3.5 6h17v12h-17zM3.5 6.5l8.5 6.5 8.5-6.5', 1.8),
    cal: P('M4 5.5h16v15H4zM4 9.5h16M8.5 3v4M15.5 3v4', 1.8),
    cam: P('M4 7.5h3.2l1.6-2.5h6.4l1.6 2.5H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1zM12 9.5a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z', 1.8),
    globe: P('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM3 12h18M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9S9.5 5.6 12 3z', 1.6),
    del: P('M8.8 5.5H20a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H8.8L2.7 12zM11.5 9.2l5.6 5.6M17.1 9.2l-5.6 5.6', 1.7),
    shift: P('M12 4 3.8 12.3h4.4v7.2h7.6v-7.2h4.4z', 1.7), ret: P('M19 5.5v6a2.5 2.5 0 0 1-2.5 2.5H5.5M9.5 9.5 5 14l4.5 4.5', 1.8),
    smile: P('M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM8.2 14.2a4.6 4.6 0 0 0 7.6 0M9 9.6v.6M15 9.6v.6', 1.7),
    music: F('M9 17.2V6.6l11-2.1v10.3a2.8 2.8 0 1 1-2-2.7V8.3l-7 1.3v7.9a2.8 2.8 0 1 1-2-2.7z'),
    down: P('M12 3.5V16M6.5 10.5 12 16l5.5-5.5M4.5 20.5h15', 2), up: P('M12 20V7.5M6.5 13 12 7.5l5.5 5.5', 2.4),
    share: P('M12 3v12M8 7l4-4 4 4M5.5 11.5V20h13v-8.5', 1.8), vol: F('M3.5 9.2h3.8L12 5.2v13.6l-4.7-4H3.5z') + P('M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.3a8 8 0 0 1 0 11.4', 1.8),
    wifi: F('M12 18.2a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM2.2 9.4a14 14 0 0 1 19.6 0l-1.9 2a11.3 11.3 0 0 0-15.8 0zm3.7 3.8a8.8 8.8 0 0 1 12.2 0l-1.9 2a6.1 6.1 0 0 0-8.4 0z'),
    signal: F('M2 15.5h3.4V20H2zM7.3 12.5h3.4V20H7.3zM12.6 9h3.4v11h-3.4zM17.9 5h3.4v15h-3.4z'),
    star: F('M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z'),
    stop: F('M6 6h12v12H6z'), rec: F('M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z'),
    bat: (lv, col) => `<rect x="1.6" y="7" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.3"/><rect x="21.6" y="10" width="1.6" height="4" rx="0.8" fill="currentColor" fill-opacity="0.45"/><rect x="3.2" y="8.6" width="${(15.8 * U.sat(lv)).toFixed(2)}" height="6.8" rx="1.7" fill="${col || 'currentColor'}"/>`,
  };
  K.icon = function (name, a, b) {
    const v = IC[name];
    const inner = typeof v === 'function' ? v(a, b) : v || '';
    return `<span class="ed-ic"><svg viewBox="0 0 24 24">${inner}</svg></span>`;
  };
  K.iconEl = (parent, name, cls, a, b) => { const s = U.el('span', cls || '', parent); s.innerHTML = K.icon(name, a, b); return s; };
  // the mouse pointer (classic arrow)
  K.pointer = function (parent, size) {
    const p = U.el('div', 'ed-ptr', parent);
    p.innerHTML = `<svg width="${size}" height="${size * 1.45}" viewBox="0 0 16 23"><path d="M1 1v17.5l4.4-4.1 2.9 6.8 3-1.3-2.9-6.6h6z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
    return p;
  };

  // ================================================================ cover images
  K.cover = function (shot, parent, css) {
    const art = shot.ctx.artImg;
    let n;
    if (art) { n = art.cloneNode(); n.draggable = false; } else { n = document.createElement('div'); if (shot.ctx.art) { n.style.backgroundImage = 'url("' + shot.ctx.art + '")'; n.style.backgroundSize = 'cover'; n.style.backgroundPosition = 'center'; } else n.style.background = 'linear-gradient(135deg,#3a3f5a,#121420)'; }
    n.style.cssText += ';position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;display:block;' + (css || '');
    parent.appendChild(n);
    return n;
  };
  K.blurCover = (shot, parent, px, css) => K.cover(shot, parent, `filter:blur(${px}px) saturate(1.25);transform:scale(1.18);` + (css || ''));
  K.pal = (shot) => shot.ctx.palette || O.defaultPalette();
  K.accent = (shot, minS, minV) => U.hex(U.vivid(K.pal(shot).vivid, minS == null ? 0.55 : minS, minV == null ? 0.85 : minV));

  // ================================================================ tap ripple
  K.tap = function (parent, size, dark) {
    const el = U.el('div', 'ed-tap' + (dark ? ' dk' : ''), parent);
    el.style.width = el.style.height = size + 'px';
    return {
      el, t0: -9,
      fire(t, x, y) { this.t0 = t; this.x = x; this.y = y; },
      update(t) {
        const k = (t - this.t0) / 0.42;
        if (k < 0 || k > 1) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
        el.style.opacity = (k < 0.15 ? k / 0.15 : 1 - U.e('inQuad', U.prog(0.15, 1, k))).toFixed(3);
        el.style.transform = `translate(${(this.x - size / 2).toFixed(1)}px,${(this.y - size / 2).toFixed(1)}px) scale(${(0.55 + 0.6 * U.e('outCubic', k)).toFixed(3)})`;
      },
    };
  };

  // ================================================================ base class
  class Shot {
    constructor(host, mode, L, o) {
      this.mode = mode;
      this.ctx = mode.ctx;
      this.L = L;
      this.o = o || {};
      this.v = this.o.v || 0;
      this.r = this.ctx.rng('shot' + L.i + ':' + (this.o.salt || 0) + ':' + (this.constructor.meta ? this.constructor.meta.name : ''));
      this.el = U.el('div', 'ed-scene', host);
      this.dark = false;
      this.age = 0;
      this.W = this.ctx.W; this.H = this.ctx.H; this.u = this.ctx.u; this.m = Math.min(this.W, this.H);
      this.ws = K.words(L);
      this.tail = Math.max(0.3, ((L.end || L.t + 3) - (L.singEnd || L.t)) - 0.26);
    }
    get pal() { return K.pal(this); }
    tick(t, dt, A) { this.update(t, dt, A); if (this.P) this.P.update(t, dt, A, this.sfocus ? this.sfocus(t) : null); }
    update() {}
    focus() { return this.P && this.sfocus ? this.P.toView(this.sfocus(this.mode.t)) : null; }
    destroy() { U.remove(this.el); }
  }
  Ed.Shot = Shot;

  // ================================================================ the phone
  // pres: 'float' (whole phone, slightly turned, over the blurred cover), 'desk' (lying on a table),
  // 'close' (a big cropped close-up that pans to wherever the action is on the screen)
  K.phone = function (shot, o) {
    o = o || {};
    const W = shot.W, H = shot.H, r = shot.r;
    const pres = o.pres || 'float';
    const root = U.el('div', 'ph-root', shot.el);
    const back = U.el('div', 'ph-back', root);
    let sw, sh;
    if (pres === 'close') { sw = Math.min(W * 0.66, H * 1.02); sh = sw * 2.165; }
    else if (pres === 'desk') { sh = Math.min(H * 0.9, W * 1.05); sw = sh * 0.462; }
    else { sh = Math.min(H * 0.93, W * 1.3); sw = sh * 0.462; }
    const bez = Math.max(4, sw * 0.03), rad = sw * 0.13;
    const dev = U.el('div', 'ph-dev', root);
    const DW = sw + bez * 2, DH = sh + bez * 2;
    Object.assign(dev.style, { width: DW + 'px', height: DH + 'px' });
    dev.style.setProperty('--bez', bez + 'px');
    dev.style.setProperty('--rad', rad + 'px');
    // side buttons
    const btn = (side, top, h) => { const b = U.el('div', 'ph-btn', dev); Object.assign(b.style, { top: top * DH + 'px', height: h * DH + 'px', width: Math.max(2, bez * 0.45) + 'px', [side]: -Math.max(2, bez * 0.38) + 'px' }); };
    btn('left', 0.19, 0.045); btn('left', 0.26, 0.08); btn('right', 0.24, 0.11);
    const body = U.el('div', 'ph-body', dev);
    const scr = U.el('div', 'ph-scr', dev);
    const ui = U.el('div', 'ph-ui', scr);
    Object.assign(ui.style, { width: sw + 'px', height: sh + 'px' });
    const glass = U.el('div', 'ph-glass', dev);
    const hole = U.el('div', 'ph-hole', dev);
    const hs = sw * 0.034;
    Object.assign(hole.style, { width: hs + 'px', height: hs + 'px', marginLeft: -hs / 2 + 'px', top: bez + sw * 0.03 + 'px' });
    const su = sw / 100;
    // backdrop
    if (pres === 'desk') {
      const kind = o.surface || r.pick(['wood', 'concrete', 'felt']);
      back.style.backgroundImage = `radial-gradient(ellipse 70% 60% at 42% 38%, rgba(255,240,220,0.18), rgba(0,0,0,0) 60%), radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%), url(${K.tex(kind)})`;
      back.style.backgroundSize = `100% 100%, 100% 100%, ${kind === 'felt' ? 256 : 768}px auto`;
      body.style.setProperty('--shadow', `0 ${sw * 0.06}px ${sw * 0.12}px rgba(0,0,0,0.55), 0 ${sw * 0.015}px ${sw * 0.03}px rgba(0,0,0,0.5)`);
    } else {
      K.blurCover(shot, back, Math.max(24, shot.m * 0.05), 'opacity:0.85');
      const dim = U.el('div', 'ed-fill', back);
      dim.style.background = 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0.7))';
      body.style.setProperty('--shadow', `0 ${sw * 0.08}px ${sw * 0.2}px rgba(0,0,0,0.6), 0 ${sw * 0.02}px ${sw * 0.05}px rgba(0,0,0,0.45)`);
    }
    const n1 = U.noise1(U.hash('ph' + shot.L.i)), sp = { y: O.sp(0) };
    const base = {
      float: { rx: r.range(3, 7), ry: r.sign() * r.range(8, 16), rz: r.range(-2, 2) },
      desk: { rx: r.range(36, 46), ry: 0, rz: r.sign() * r.range(10, 24) },
      close: { rx: 0, ry: 0, rz: r.range(-1.2, 1.2) },
    }[pres];
    let fy = sh * 0.45; // close-up: the screen point kept in the middle of the view
    const P = {
      pres, root, back, dev, scr, ui, glass, sw, sh, su, bez,
      // a point on the screen → where it shows in the view (rotation ignored)
      toView(p) {
        if (!p) return null;
        const S = P.s || 1;
        return { x: P.dx + (bez + p.x) * S, y: P.dy + (bez + p.y) * S };
      },
      update(t, dt, A, f) {
        const a = shot.age;
        let rx = base.rx, ry = base.ry, rz = base.rz, S = 1, dx, dy;
        if (pres === 'close') {
          if (f) fy = f.y;
          const tgt = U.clamp(fy, H * 0.42, sh - H * 0.42);
          if (!P._init) { sp.y.x = tgt; P._init = true; }
          O.spring(sp.y, tgt, 7, dt);
          dx = (W - DW) / 2; dy = H / 2 - bez - sp.y.x;
          ry = n1(a * 0.4) * 1.2; rx = n1(a * 0.33 + 5) * 1.0;
        } else {
          S = pres === 'desk' ? 1 : 1;
          dx = (W - DW) / 2 + n1(a * 0.25 + 3) * W * 0.004; dy = (H - DH) / 2 + n1(a * 0.3 + 7) * H * 0.006;
          rx += n1(a * 0.35) * (pres === 'float' ? 2.2 : 1.2); ry += n1(a * 0.28 + 2) * (pres === 'float' ? 3 : 0.6); rz += n1(a * 0.2 + 9) * 0.6;
          if (pres === 'desk') dy += H * 0.02;
        }
        P.s = S; P.dx = dx; P.dy = dy;
        dev.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
        glass.style.setProperty('--ga', (112 + ry * 2.2 + rz).toFixed(1) + 'deg');
        glass.style.opacity = (0.6 + 0.2 * Math.sin(ry * 0.12)).toFixed(3);
        void A; void t;
      },
    };
    return P;
  };
  // status bar + home indicator on a phone screen
  K.statusBar = function (P, dark, opts) {
    opts = opts || {};
    const su = P.su;
    const sb = U.el('div', 'ph-sb', P.ui);
    Object.assign(sb.style, { height: su * 11 + 'px', padding: `0 ${su * 7.5}px`, fontSize: su * 3.7 + 'px', color: dark ? '#fff' : '#111' });
    U.el('span', '', sb, opts.time != null ? opts.time : K.clock(K.now()));
    const rr = U.el('div', 'r', sb);
    rr.innerHTML = K.icon('signal') + K.icon('wifi') + `<span class="ed-ic" style="width:1.7em"><svg viewBox="0 0 24 24">${IC.bat(opts.bat == null ? 0.82 : opts.bat, opts.batCol)}</svg></span>`;
    const hb = U.el('div', 'ph-home', P.ui);
    Object.assign(hb.style, { width: su * 36 + 'px', height: su * 1.3 + 'px', marginLeft: -su * 18 + 'px', bottom: su * 2.2 + 'px', background: dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' });
    return sb;
  };

  // ================================================================ on-screen keyboard
  // returns { el, h, press(ch, t), update(t), keyAt(ch) } — letters pop up as they're "pressed"
  K.keyboard = function (parent, w, su, dark, opts) {
    opts = opts || {};
    const kb = U.el('div', 'kb ' + (dark ? 'dk' : 'lt'), parent);
    const sgH = su * 10.5, rowH = su * 11.4, gap = su * 1.25, padX = su * 0.8;
    const h = sgH + rowH * 4 + su * 13;
    Object.assign(kb.style, { height: h + 'px', fontSize: su * 5.2 + 'px' });
    const sg = U.el('div', 'sg', kb);
    Object.assign(sg.style, { height: sgH + 'px', fontSize: su * 4.1 + 'px' });
    const slots = [U.el('span', '', sg, ''), U.el('i', '', sg), U.el('span', '', sg, ''), U.el('i', '', sg), U.el('span', '', sg, '')];
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const keyW = (w - padX * 2 - gap * 9) / 10;
    const map = {};
    const mk = (x, y, ww, label, fn) => {
      const k = U.el('div', 'k' + (fn ? ' fn' : ''), kb);
      Object.assign(k.style, { left: x + 'px', top: y + 'px', width: ww + 'px', height: rowH - gap * 1.4 + 'px' });
      if (label != null) k.innerHTML = label;
      return k;
    };
    rows.forEach((row, ri) => {
      const y = sgH + ri * rowH;
      const totalW = row.length * keyW + (row.length - 1) * gap;
      const x0 = (w - totalW) / 2;
      row.split('').forEach((ch, i) => {
        const k = mk(x0 + i * (keyW + gap), y, keyW, ch);
        map[ch] = { k, x: x0 + i * (keyW + gap), y, w: keyW };
      });
    });
    const y3 = sgH + 2 * rowH, fnW = keyW * 1.35;
    const sh = mk(padX, y3, fnW, K.icon('shift'), true); sh.style.fontSize = '0.8em';
    const dl = mk(w - padX - fnW, y3, fnW, K.icon('del'), true); dl.style.fontSize = '0.8em';
    map['⌫'] = { k: dl, x: w - padX - fnW, y: y3, w: fnW };
    const y4 = sgH + 3 * rowH;
    const n123 = mk(padX, y4, keyW * 2.4, '123', true); n123.style.fontSize = '0.72em';
    const emo = mk(padX + keyW * 2.4 + gap, y4, keyW * 1.2, K.icon('smile'), true); emo.style.fontSize = '0.8em';
    const spX = padX + keyW * 3.6 + gap * 2, spW = w - spX - padX - keyW * 2.4 - gap;
    const sp = mk(spX, y4, spW, '<span style="font-size:0.62em;opacity:0.8">space</span>');
    map[' '] = { k: sp, x: spX, y: y4, w: spW };
    const rt = mk(w - padX - keyW * 2.4, y4, keyW * 2.4, opts.ret || '<span style="font-size:0.62em">return</span>', true);
    if (opts.retBlue) { rt.style.background = '#1a7cf5'; rt.style.color = '#fff'; }
    map['\n'] = { k: rt, x: w - padX - keyW * 2.4, y: y4, w: keyW * 2.4 };
    // bottom strip: globe + mic
    const bot = U.el('div', '', kb);
    Object.assign(bot.style, { position: 'absolute', left: su * 7 + 'px', right: su * 7 + 'px', top: y4 + rowH + su * 1.2 + 'px', display: 'flex', justifyContent: 'space-between', fontSize: su * 5.6 + 'px', opacity: '0.6' });
    bot.innerHTML = K.icon('globe') + K.icon('mic');
    const pop = U.el('div', 'pop', kb);
    Object.assign(pop.style, { width: keyW * 1.5 + 'px', height: rowH * 1.25 + 'px', fontSize: '1.35em' });
    let downK = null, downT = -9;
    return {
      el: kb, h, slots: [slots[0], slots[2], slots[4]], keyW, rowH,
      keyAt(ch) { return map[ch] || null; },
      press(ch, t) {
        const m = map[ch] || map[String(ch).toLowerCase()];
        if (!m) return null;
        if (downK) downK.k.classList.remove('dn');
        downK = m; downT = t;
        m.k.classList.add('dn');
        if (ch.length === 1 && /\p{L}/u.test(ch)) {
          pop.textContent = ch;
          pop.style.left = m.x + m.w / 2 - keyW * 0.75 + 'px';
          pop.style.top = m.y - rowH * 1.1 + 'px';
          pop.style.opacity = '1';
        }
        return m;
      },
      update(t) {
        if (downK && t - downT > 0.09) { downK.k.classList.remove('dn'); downK = null; pop.style.opacity = '0'; }
      },
    };
  };
  // drives keyboard presses from a typed string as it grows
  K.typist = function (kb) {
    let last = '';
    return (s, t) => {
      if (s === last) return;
      if (s.length > last.length) kb.press(s[s.length - 1] === ' ' ? ' ' : s[s.length - 1].toLowerCase(), t);
      else if (s.length < last.length) kb.press('⌫', t);
      last = s;
    };
  };

  // ================================================================ layout + text helpers
  O.css('ed-kit2', `
.m-ed .ed-caret { display: inline-block; width: 0.075em; height: 1.08em; margin-left: 0.03em; vertical-align: -0.17em; background: var(--caret, #1a7cf5); border-radius: 0.04em; }
.m-ed .ed-typo { text-decoration: underline dotted #e0313b; text-decoration-thickness: 0.09em; text-underline-offset: 0.12em; }
.m-ed .ed-wd { display: inline-block; white-space: pre; will-change: transform, opacity; }
`);
  // position of el inside root (offset chain; ignores transforms)
  K.off = function (el, root) {
    let x = 0, y = 0, n = el;
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  // typed text with a caret (and typos that get fixed) inside el
  K.typer = function (el, ws, typos) {
    const txt = U.el('span', '', el), car = U.el('span', 'ed-caret', el);
    let last = null, lastBad = false;
    return {
      txt, car,
      update(t) {
        const st = K.typeLine(ws, t, typos);
        if (st.s !== last || st.bad !== lastBad) {
          last = st.s; lastBad = st.bad;
          if (st.bad) { const i = st.s.lastIndexOf(' ') + 1; txt.innerHTML = K.esc(st.s.slice(0, i)) + '<span class="ed-typo">' + K.esc(st.s.slice(i)) + '</span>'; }
          else txt.textContent = st.s;
        }
        let typing = false;
        for (const w of ws) if (t >= w.t - 0.05 && t <= w.t + K.span(w, typos && typos[ws.indexOf(w)]) + 0.05) { typing = true; break; }
        const on = typing || Math.floor(t * 1.9) % 2 === 0;
        if (on !== this._on) { this._on = on; car.style.opacity = on ? '1' : '0'; }
        return st;
      },
    };
  };
  // words as separate spans that appear as they're sung; fx(item, p, el) styles each (p: 0..1 since its time)
  K.wordEls = function (parent, ws, cls, sep) {
    return ws.map((w, i) => {
      const el = U.el('span', 'ed-wd' + (cls ? ' ' + cls : ''), parent, K.bare(w));
      el.style.opacity = '0';
      if (sep !== false && i < ws.length - 1) parent.appendChild(document.createTextNode(' '));
      return { w, el, i, p: -1 };
    });
  };
  K.wordAnim = function (items, t, dur, fx) {
    for (const it of items) {
      const p = U.prog(it.w.t - 0.03, it.w.t - 0.03 + (dur || 0.22), t);
      if (p === it.p) continue;
      it.p = p;
      if (fx) fx(it, p, it.el);
      else { it.el.style.opacity = U.sat(p * 2.2).toFixed(3); it.el.style.transform = p < 1 ? `translateY(${((1 - U.e('outCubic', p)) * 0.22).toFixed(3)}em)` : 'none'; }
    }
  };

  // ================================================================ desktop window
  K.window = function (parent, o) {
    const w = U.el('div', 'dw', parent);
    const dark = !!o.dark;
    Object.assign(w.style, { left: o.x + 'px', top: o.y + 'px', width: o.w + 'px', height: o.h + 'px', fontSize: o.fs + 'px', background: dark ? '#1f1f22' : '#fbfbfb', color: dark ? '#eee' : '#1b1b1b' });
    const tb = U.el('div', 'tb', w);
    tb.style.background = dark ? '#2a2a2e' : '#ececee';
    tb.style.borderBottom = '1px solid ' + (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)');
    if (o.icon) K.iconEl(tb, o.icon).style.opacity = '0.7';
    U.el('div', 'tt', tb, o.title || '');
    const ctl = U.el('div', 'ctl', tb);
    ctl.innerHTML = '<span>—</span><span>☐</span><span>✕</span>';
    const body = U.el('div', '', w);
    Object.assign(body.style, { position: 'absolute', left: 0, right: 0, top: '2.3em', bottom: 0 });
    return { el: w, body, tb };
  };
})();
