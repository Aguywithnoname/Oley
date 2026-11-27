/* Oley renderer core: utilities, timing, mood, palette, clock, link, demo.
   Plain script (no modules) so it also runs from file:// inside Wallpaper Engine. */
(function () {
  'use strict';
  const O = (window.Oley = window.Oley || {});
  O.VERSION = '2.1.0';

  // ================================================================ utilities
  const U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  U.prog = (a, b, v) => U.sat(U.inv(a, b, v));
  // frame-rate independent smoothing toward a target (k = speed per second)
  U.damp = (cur, target, k, dt) => target + (cur - target) * Math.exp(-k * dt);
  U.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outSine: (t) => Math.sin((t * Math.PI) / 2),
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outBackSoft: (t) => {
      const c1 = 0.9, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };
  U.e = (name, t) => U.ease[name](U.sat(t));

  U.el = function (tag, cls, parent, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  U.svg = function (tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  U.remove = (n) => { if (n && n.parentNode) n.parentNode.removeChild(n); };
  U.later = (n, ms) => setTimeout(() => U.remove(n), ms);

  U.hash = function (s) {
    let h = 2166136261 >>> 0;
    s = String(s == null ? '' : s);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  // seeded random (mulberry32) with helpers
  U.rng = function (seed) {
    let a = (typeof seed === 'number' ? seed : U.hash(seed)) >>> 0;
    if (!a) a = 0x9e3779b9;
    const r = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (x, y) => x + (y - x) * r();
    r.int = (x, y) => Math.floor(x + (y - x + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length) % Math.max(1, arr.length)];
    r.chance = (p) => r() < p;
    r.sign = () => (r() < 0.5 ? -1 : 1);
    r.weighted = (items) => {
      let tot = 0;
      for (const it of items) tot += Math.max(0, it.w);
      if (tot <= 0) return items.length ? items[0].v : undefined;
      let x = r() * tot;
      for (const it of items) {
        x -= Math.max(0, it.w);
        if (x <= 0) return it.v;
      }
      return items[items.length - 1].v;
    };
    r.shuffle = (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const tmp = a2[i]; a2[i] = a2[j]; a2[j] = tmp;
      }
      return a2;
    };
    return r;
  };

  // smooth 1D/2D value noise (cheap, seeded)
  U.noise1 = function (seed) {
    const r = U.rng(seed), N = 256, v = new Float32Array(N);
    for (let i = 0; i < N; i++) v[i] = r() * 2 - 1;
    return (x) => {
      const i = Math.floor(x), f = x - i, a = v[i & 255], b = v[(i + 1) & 255];
      const s = f * f * (3 - 2 * f);
      return a + (b - a) * s;
    };
  };
  U.noise2 = function (seed) {
    const r = U.rng(seed), N = 256, perm = new Uint8Array(512), g = new Float32Array(N);
    for (let i = 0; i < N; i++) { perm[i] = i; g[i] = r(); }
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (let i = 0; i < N; i++) perm[i + N] = perm[i];
    const val = (ix, iy) => g[perm[(ix & 255) + perm[iy & 255]]];
    return (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = val(ix, iy), b = val(ix + 1, iy), c = val(ix, iy + 1), d = val(ix + 1, iy + 1);
      return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    };
  };

  // ---------------------------------------------------------------- colour
  U.hex = function (c) {
    const h = (v) => ('0' + Math.round(U.clamp(v, 0, 255)).toString(16)).slice(-2);
    return '#' + h(c[0]) + h(c[1]) + h(c[2]);
  };
  U.parseHex = function (s) {
    s = String(s || '').replace('#', '');
    if (s.length === 3) s = s.split('').map((x) => x + x).join('');
    const n = parseInt(s, 16);
    if (isNaN(n)) return [255, 255, 255];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  U.mix = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)];
  U.lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  U.rgb2hsv = function (c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  };
  U.hsv2rgb = function (h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  U.shiftHue = function (c, deg, sMul, vMul) {
    const h = U.rgb2hsv(c);
    return U.hsv2rgb(h[0] + deg, U.sat(h[1] * (sMul || 1)), U.sat(h[2] * (vMul || 1)));
  };
  U.vivid = function (c, minS, minV) {
    const h = U.rgb2hsv(c);
    return U.hsv2rgb(h[0], Math.max(h[1], minS == null ? 0.55 : minS), Math.max(h[2], minV == null ? 0.85 : minV));
  };

  // ---------------------------------------------------------------- text
  const measureCtx = document.createElement('canvas').getContext('2d');
  U.textWidth = function (text, font) {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  };
  U.fmtClock = function (d) {
    d = d || new Date();
    let h = d.getHours();
    const m = ('0' + d.getMinutes()).slice(-2);
    if (O.hour12) { h = h % 12 || 12; }
    return (O.hour12 ? String(h) : ('0' + h).slice(-2)) + ':' + m;
  };
  U.fmtClockAmPm = function (d) {
    d = d || new Date();
    let h = d.getHours();
    const ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + ':' + ('0' + d.getMinutes()).slice(-2) + ' ' + ap;
  };
  U.fmtDateShort = function (d) {
    d = d || new Date();
    try { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch (e) { return d.toDateString().slice(0, 10); }
  };
  U.fmtDateLong = function (d) {
    d = d || new Date();
    try { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return d.toDateString(); }
  };
  try {
    const hc = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    O.hour12 = hc === 'h12' || hc === 'h11';
  } catch (e) { O.hour12 = false; }
  U.firstName = function (artist) {
    let a = String(artist || '').split(/,|&| feat\.? | ft\.? | x | and /i)[0].trim();
    a = a.replace(/^the\s+/i, '');
    const w = a.split(/\s+/)[0] || 'you';
    return w.toLowerCase().replace(/[^a-z0-9$]/gi, '') || 'you';
  };
  U.mainArtist = function (artist) {
    return String(artist || '').split(/,| & | feat\.? | ft\.? /i)[0].trim();
  };
  O.util = U;

  // ================================================================ words & mood
  const words = (s) => new Set(s.split(/\s+/).filter(Boolean));
  O.STOP = words("a an the and or but so if of to in on at by for from with as is am are was were be been being it its it's this that these those i me my you your yours he him his she her we us our they them their do does did done have has had not no oh ooh yeah yea uh ah hey la na da mm hmm just than then what when who why how all any can could would should will shall may might must im i'm youre you're dont don't cant can't wont won't aint ain't gonna wanna gotta got get let lets let's up out over into onto off too very some such own same ll ve re s t d m o y cause 'cause cuz til 'til till");
  O.MOOD_WORDS = {
    sad: words('miss missing missed gone alone lonely cry crying cried tears tear goodbye bye broken break breaking hurt hurts hurting pain sorry lost lose losing cold empty die dying dead fade fading without leave leaving left apart sad blue grey gray rain raining drown drowning ghost ghosts memory memories remember regret wrong last ending sorrow heartbreak heartache scars bleed bleeding grave away far distance silence quiet numb tired alone lonely wish wished'),
    tender: words('love lover loving loved baby babe darling honey hold holding close closer kiss kissing kisses touch heart hearts gently gentle soft stay together forever always yours mine sweet beautiful angel dream dreaming dreams sunrise morning moon stars slow arms skin warm care adore'),
    hype: words('party dance dancing turn money cash rich fire lit wild crazy run running jump loud louder bounce club drink shots drip ice flex hustle win winning champion boss fast faster speed race racing higher top bang boom rock roll shake move gang lambo racin flashing lights'),
    angry: words('hate fight fighting kill killing damn hell mad rage war blood enemy enemies liar lies lying burn burning scream screaming smash revenge villain monster fake'),
  };
  O.HOT_WORDS = words('heart hearts love blood fire flame burn burning lie lies liar false cry tears die dead kill pain hurt danger red devil sin');

  O.cleanWord = function (raw) {
    return String(raw || '').toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9'à-ÿ]/g, '').replace(/^'+|'+$/g, '');
  };
  O.syllables = function (w) {
    w = String(w || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    if (w.length <= 3) return 1;
    let n = (w.match(/[aeiouy]+/g) || []).length;
    if (/e$/.test(w) && !/le$/.test(w) && n > 1) n--;
    if (/(ed)$/.test(w) && !/(ted|ded)$/.test(w) && n > 1) n--;
    return Math.max(1, Math.min(n, 6));
  };

  // split a lyric line into words; keeps ad-lib (bracketed) info
  O.splitWords = function (text) {
    const out = [];
    let depth = 0;
    const parts = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
    for (const p of parts) {
      if (!p) continue;
      const opens = (p.match(/[([]/g) || []).length, closes = (p.match(/[)\]]/g) || []).length;
      const inParen = depth > 0 || opens > 0;
      depth = Math.max(0, depth + opens - closes);
      const bare = p.replace(/[()[\]{}"“”]/g, '');
      const w = O.cleanWord(bare);
      if (!bare.replace(/[^\p{L}\p{N}]/gu, '') && !w) {
        // pure punctuation like "-" : glue onto previous word
        if (out.length) out[out.length - 1].raw += ' ' + p;
        continue;
      }
      out.push({ raw: p, bare, w, adlib: inParen, syl: O.syllables(w) });
    }
    return out;
  };

  function moodScores(ws) {
    const s = { sad: 0, tender: 0, hype: 0, angry: 0 };
    for (const x of ws) for (const k in s) if (O.MOOD_WORDS[k].has(x.w)) s[k] += 1;
    return s;
  }

  // ================================================================ lyrics parsing & timing
  O.parseLRC = function (text) {
    const out = [];
    let offset = 0;
    const tagRe = /^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/;
    const wordRe = /<(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)>/g;
    const sec = (m, s) => parseInt(m, 10) * 60 + parseFloat(String(s).replace(':', '.'));
    for (const raw of String(text || '').split(/\r?\n/)) {
      const meta = raw.match(/^\s*\[(ar|ti|al|by|offset|length|re|ve|au|#):([^\]]*)\]\s*$/i);
      if (meta) {
        if (meta[1].toLowerCase() === 'offset') offset = (parseFloat(meta[2]) || 0) / 1000;
        continue;
      }
      const stamps = [];
      let rest = raw, m;
      while ((m = rest.match(tagRe))) {
        stamps.push(sec(m[1], m[2]));
        rest = rest.slice(m[0].length);
      }
      if (!stamps.length) continue;
      let wordTimes = null;
      if (wordRe.test(rest)) {
        wordRe.lastIndex = 0;
        wordTimes = [];
        const pieces = rest.split(wordRe);
        // pieces: [lead, m, s, text, m, s, text, ...]
        for (let i = 1; i + 2 < pieces.length + 1; i += 3) {
          const t = sec(pieces[i], pieces[i + 1]);
          const txt = (pieces[i + 2] || '').trim();
          if (txt) for (const wtxt of txt.split(/\s+/)) wordTimes.push({ t: t - offset, w: wtxt });
        }
      }
      const clean = rest.replace(wordRe, '').trim();
      for (const t of stamps) out.push({ t: Math.max(0, t - offset), text: clean, words: wordTimes });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  };

  // spread plain (unsynced) lyrics across the song
  O.estimateLines = function (plain, duration) {
    const lines = String(plain || '').split(/\r?\n/).map((s) => s.trim());
    const dur = duration > 30 ? duration : 200;
    const start = Math.min(14, dur * 0.07), end = dur - Math.min(10, dur * 0.05);
    const weights = lines.map((s) => (s ? 1 + O.splitWords(s).length * 0.18 : 0.6));
    const tot = weights.reduce((a, b) => a + b, 0) || 1;
    let t = start;
    const out = [];
    lines.forEach((s, i) => {
      out.push({ t, text: s });
      t += ((end - start) * weights[i]) / tot;
    });
    return out;
  };

  /* Build the timeline every mode works from.
     lyr = {status, synced, lines:[{t, text, words?}]}
     Each line: {i, t, end, singEnd, next, text, words:[{i,t,end,raw,bare,w,syl,adlib,key}], key, mood, repeat, adlib} */
  O.buildTimeline = function (lyr, duration, seedText) {
    const src = (lyr && lyr.lines) || [];
    const tl = {
      lines: [], synced: !!(lyr && lyr.synced), status: (lyr && lyr.status) || 'none',
      duration: duration || 0, mood: 'neutral', seed: U.hash(seedText || 'oley'), first: 0, gaps: [],
    };
    const raw = src.map((l) => ({ t: +l.t || 0, text: String(l.text || '').trim(), words: l.words || null }));
    const seen = new Map();
    for (let i = 0; i < raw.length; i++) {
      const L = raw[i];
      if (!L.text) continue;
      const ws = O.splitWords(L.text);
      if (!ws.length) continue;
      let next = duration && duration > L.t ? duration : L.t + 7;
      for (let j = i + 1; j < raw.length; j++) { if (raw[j].t > L.t) { next = raw[j].t; break; } }
      const avail = Math.max(0.25, next - L.t);
      const syl = ws.reduce((a, w) => a + w.syl, 0);
      let sing = Math.min(avail * 0.94, Math.max(0.55, syl / 4.1 + 0.2));
      if (avail < 0.8) sing = avail * 0.92;
      const line = { i: tl.lines.length, t: L.t, next, text: L.text, words: [], key: 0, mood: 'neutral' };
      // explicit word stamps (enhanced LRC) when they match
      let stamped = false;
      if (L.words && L.words.length === ws.length) {
        stamped = true;
        ws.forEach((w, k) => { w.t = Math.max(L.t, +L.words[k].t || L.t); });
      }
      if (!stamped) {
        const weights = ws.map((w) => w.syl + 0.35 + (/[,.;!?]$/.test(w.raw) ? 0.4 : 0));
        const tot = weights.reduce((a, b) => a + b, 0);
        let acc = 0;
        ws.forEach((w, k) => { w.t = L.t + (acc / tot) * sing; acc += weights[k]; });
      }
      ws.forEach((w, k) => {
        w.i = k;
        w.end = k + 1 < ws.length ? ws[k + 1].t : Math.max(w.t + 0.18, stamped ? Math.min(next, w.t + 0.8) : L.t + sing);
        w.dur = Math.max(0.06, w.end - w.t);
      });
      line.words = ws;
      line.singEnd = ws[ws.length - 1].end;
      line.end = next;
      line.adlib = ws.every((w) => w.adlib);
      // key word: the one that should land hardest
      let best = -1, bestScore = -1e9;
      ws.forEach((w, k) => {
        if (w.adlib && !line.adlib) return;
        let s = 0;
        if (!O.STOP.has(w.w)) s += 2;
        s += Math.min(w.w.length, 9) * 0.28;
        for (const m in O.MOOD_WORDS) if (O.MOOD_WORDS[m].has(w.w)) s += 1.6;
        if (k === ws.length - 1) s += 0.9;
        if (/[!]$/.test(w.raw)) s += 1;
        if (k === 0) s -= 0.4;
        if (s > bestScore) { bestScore = s; best = k; }
      });
      line.key = Math.max(0, best);
      ws.forEach((w, k) => { w.key = k === line.key; });
      const norm = ws.map((w) => w.w).join(' ');
      line.repeat = seen.has(norm);
      line.repeatOf = seen.has(norm) ? seen.get(norm) : -1;
      if (!seen.has(norm)) seen.set(norm, line.i);
      line._ms = moodScores(ws);
      tl.lines.push(line);
    }
    // moods, smoothed with neighbours and the title
    const titleWords = O.splitWords(seedText || '');
    const tScore = moodScores(titleWords);
    const songTot = { sad: tScore.sad * 2, tender: tScore.tender * 2, hype: tScore.hype * 2, angry: tScore.angry * 2 };
    tl.lines.forEach((L, i) => {
      const s = { sad: 0, tender: 0, hype: 0, angry: 0 };
      for (let d = -1; d <= 1; d++) {
        const N = tl.lines[i + d];
        if (!N) continue;
        const w = d === 0 ? 1 : 0.45;
        for (const k in s) s[k] += N._ms[k] * w;
      }
      let mk = 'neutral', mv = 0.9;
      for (const k in s) if (s[k] > mv) { mv = s[k]; mk = k; }
      L.mood = mk;
      for (const k in songTot) songTot[k] += L._ms[k];
    });
    tl.lines.forEach((L) => { delete L._ms; });
    let sm = 'neutral', sv = Math.max(2, tl.lines.length * 0.08);
    for (const k in songTot) if (songTot[k] > sv) { sv = songTot[k]; sm = k; }
    tl.mood = sm;
    tl.first = tl.lines.length ? tl.lines[0].t : 0;
    // gaps (instrumental breaks)
    tl.lines.forEach((L, i) => {
      const nx = tl.lines[i + 1];
      L.gapAfter = nx ? nx.t - L.singEnd : (duration ? duration - L.singEnd : 0);
    });
    return tl;
  };

  O.lineAt = function (tl, t) {
    const ls = tl.lines;
    if (!ls.length || t < ls[0].t) return -1;
    let lo = 0, hi = ls.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ls[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
  O.wordAt = function (line, t) {
    if (!line) return -1;
    const ws = line.words;
    let k = -1;
    for (let i = 0; i < ws.length; i++) { if (ws[i].t <= t) k = i; else break; }
    return k;
  };
  O.wordProg = (w, t) => U.sat((t - w.t) / Math.max(0.05, w.dur));

  // ================================================================ palette
  O.defaultPalette = function () {
    return mkPalette([255, 70, 160], [120, 70, 255], [12, 8, 22], [240, 230, 255], [120, 60, 150]);
  };
  function mkPalette(vivid, second, dark, light, avg) {
    return {
      vivid, second, dark, light, avg,
      vividHex: U.hex(vivid), secondHex: U.hex(second), darkHex: U.hex(dark), lightHex: U.hex(light),
      glow: U.vivid(vivid, 0.5, 1),
      glow2: U.vivid(second, 0.45, 0.95),
    };
  }
  O.paletteFrom = function (img) {
    const S = 40;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d', { willReadFrequently: true });
    let d;
    try { x.drawImage(img, 0, 0, S, S); d = x.getImageData(0, 0, S, S).data; } catch (e) { return O.defaultPalette(); }
    const B = 24, bw = new Float64Array(B), br = new Float64Array(B), bg = new Float64Array(B), bb = new Float64Array(B);
    const px = [];
    let ar = 0, ag = 0, ab = 0;
    for (let i = 0; i < d.length; i += 4) {
      const col = [d[i], d[i + 1], d[i + 2]];
      const hsv = U.rgb2hsv(col);
      px.push({ c: col, l: U.lum(col) });
      ar += col[0]; ag += col[1]; ab += col[2];
      if (hsv[2] < 0.16) continue;
      const w = Math.pow(hsv[1], 1.6) * (0.35 + hsv[2]);
      const k = Math.floor(hsv[0] / (360 / B)) % B;
      bw[k] += w; br[k] += col[0] * w; bg[k] += col[1] * w; bb[k] += col[2] * w;
    }
    const n = px.length || 1;
    const avg = [ar / n, ag / n, ab / n];
    px.sort((a, b) => a.l - b.l);
    const avgOf = (arr) => {
      let r = 0, g = 0, b = 0;
      for (const p of arr) { r += p.c[0]; g += p.c[1]; b += p.c[2]; }
      const m = arr.length || 1;
      return [r / m, g / m, b / m];
    };
    const dark = avgOf(px.slice(0, Math.max(1, Math.floor(n * 0.25))));
    const light = avgOf(px.slice(Math.floor(n * 0.85)));
    // merge neighbouring hue buckets
    const score = [];
    for (let k = 0; k < B; k++) score.push({ k, w: bw[k] + 0.5 * (bw[(k + 1) % B] + bw[(k + B - 1) % B]) });
    score.sort((a, b) => b.w - a.w);
    const total = bw.reduce((a, b) => a + b, 0);
    let vivid, second;
    if (total < 6) {
      // nearly grey cover: tint from the average, keep it tasteful
      const h = U.rgb2hsv(avg);
      vivid = U.hsv2rgb(h[1] > 0.08 ? h[0] : 265, 0.55, 1);
      second = U.hsv2rgb((h[1] > 0.08 ? h[0] : 265) + 40, 0.5, 0.9);
    } else {
      const k1 = score[0].k;
      const col = (k) => [br[k] / (bw[k] || 1), bg[k] / (bw[k] || 1), bb[k] / (bw[k] || 1)];
      vivid = col(k1);
      let k2 = -1;
      for (const s of score.slice(1)) {
        const dist = Math.min(Math.abs(s.k - k1), B - Math.abs(s.k - k1)) * (360 / B);
        if (dist >= 40 && s.w > score[0].w * 0.12) { k2 = s.k; break; }
      }
      second = k2 >= 0 ? col(k2) : U.shiftHue(vivid, 38, 1, 0.92);
      vivid = U.vivid(vivid, 0.62, 0.95);
      second = U.vivid(second, 0.5, 0.88);
    }
    return mkPalette(vivid, second, dark, light, avg);
  };

  // ================================================================ clock
  // A turntable-style clock: follows the app's reports without jitter.
  O.Clock = class {
    constructor() {
      this.pos = 0;
      this.playing = false;
      this.target = { pos: 0, perf: performance.now(), playing: false };
      this.inited = false;
      this.jumped = true;
      this.offset = 0;
    }
    report(pos, playing, atEpochMs) {
      const now = Date.now();
      let p = +pos || 0;
      if (playing && atEpochMs) p += Math.max(-1, Math.min(5, (now - atEpochMs) / 1000));
      this.target = { pos: p, perf: performance.now(), playing: !!playing };
      if (!this.inited) { this.pos = p; this.inited = true; this.jumped = true; }
    }
    set(pos, playing) { this.target = { pos, perf: performance.now(), playing: !!playing }; this.pos = pos; this.jumped = true; this.inited = true; }
    targetNow() {
      const T = this.target;
      return T.pos + (T.playing ? (performance.now() - T.perf) / 1000 : 0);
    }
    tick(dt) {
      const tgt = this.targetNow();
      const err = tgt - this.pos;
      if (Math.abs(err) > 0.4) {
        this.pos = tgt;
        this.jumped = true;
      } else if (this.target.playing) {
        const rate = 1 + U.clamp(err * 0.9, -0.06, 0.06);
        this.pos += dt * rate;
      } else {
        this.pos += err * Math.min(1, dt * 8);
      }
      this.playing = this.target.playing;
    }
    get t() { return this.pos + this.offset; }
    consumeJump() { const j = this.jumped; this.jumped = false; return j; }
  };

  // ================================================================ link to the app
  O.params = new URLSearchParams(location.search);
  O.Link = class {
    constructor(role, screen) {
      this.role = role;
      this.screen = screen || '';
      this.handlers = {};
      this.ws = null;
      this.connected = false;
      this.attempt = 0;
      this.closed = false;
    }
    on(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); return this; }
    emit(type, msg) {
      for (const f of this.handlers[type] || []) { try { f(msg); } catch (e) { console.error(e); } }
    }
    urls() {
      const q = 'role=' + encodeURIComponent(this.role) + '&screen=' + encodeURIComponent(this.screen);
      if (/^https?:$/.test(location.protocol)) {
        return ['ws://' + location.host + '/ws?k=' + encodeURIComponent(O.params.get('k') || '') + '&' + q];
      }
      const L = window.OLEY_LINK || {};
      const ports = L.ports && L.ports.length ? L.ports : [47830, 47831, 47832, 47833];
      return ports.map((p) => 'ws://127.0.0.1:' + p + '/ws?k=' + encodeURIComponent(L.key || '') + '&' + q);
    }
    connect() {
      if (this.closed) return;
      const list = this.urls();
      const url = list[this.attempt % list.length];
      let ws;
      try { ws = new WebSocket(url); } catch (e) { this.retry(); return; }
      this.ws = ws;
      ws.onopen = () => { this.connected = true; this.attempt = 0; this.emit('open', {}); };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg && msg.type) { this.emit(msg.type, msg); this.emit('*', msg); }
      };
      ws.onclose = () => {
        const was = this.connected;
        this.connected = false;
        this.ws = null;
        if (was) this.emit('close', {});
        this.retry();
      };
      ws.onerror = () => {};
    }
    retry() {
      if (this.closed) return;
      this.attempt++;
      const wait = Math.min(4000, 250 * Math.pow(1.6, Math.min(this.attempt, 8)));
      setTimeout(() => this.connect(), wait);
    }
    send(obj) {
      if (this.ws && this.ws.readyState === 1) { try { this.ws.send(JSON.stringify(obj)); return true; } catch (e) {} }
      return false;
    }
  };

  // ================================================================ demo song (original words, used for previews)
  O.DEMO = {
    track: { id: 'demo', title: 'Night Signal', artist: 'Oley', album: 'Demo', duration: 92, art: 'img/demo-cover.jpg', demo: true },
    lrc: [
      '[00:04.20] I keep your name on my screen tonight',
      '[00:08.00] Three missed calls and the city lights',
      '[00:11.70] Tell me where you are, I\'ll be right there',
      '[00:15.40] Every picture of us hanging in the air',
      '[00:19.20] We said forever like it meant nothing at all',
      '[00:23.00] Now I\'m counting every step down the hall',
      '[00:26.80] Don\'t you leave me in the middle of the night',
      '[00:30.60] I can feel the fire burning in my eyes',
      '[00:34.30] (oh-oh)',
      '[00:35.60] Call me when the morning finds you alone',
      '[00:39.40] I\'ll be dancing in the kitchen of our home',
      '[00:43.20] You and me, we never leave',
      '[00:46.60] Round and round again',
      '[00:49.80] Round and round again',
      '[00:53.00]',
      '[00:58.40] Saw this moment coming from afar',
      '[01:02.20] Your heart is a city with the lights turned off',
      '[01:06.00] Delete the photos, I still know them by heart',
      '[01:09.80] Tears in the rain and I\'m falling apart',
      '[01:13.60] Run, run, run',
      '[01:16.20] You and me, we never leave',
      '[01:19.60] Tell me where you are',
      '[01:22.80] I\'ll be right here',
      '[01:27.00]',
    ].join('\n'),
  };

  // Drives a stage with the demo song and a synthetic beat (previews, thumbnails, Wallpaper Engine without the app).
  O.DemoDriver = class {
    constructor(stage, start) {
      this.stage = stage;
      this.t0 = performance.now();
      this.start = +start || 0;
      this.beatLen = 60 / 118;
      this.n1 = U.noise1(7);
      const tr = Object.assign({}, O.DEMO.track);
      const cov = O.params.get('cover');
      if (cov && /^[\w./-]+$/.test(cov)) tr.art = cov;
      stage.setTrack(tr);
      stage.setLyrics({ status: 'synced', synced: true, lines: O.parseLRC(O.DEMO.lrc) });
      stage.clock.set(this.start, true);
    }
    pos() {
      const d = O.DEMO.track.duration;
      if (this.stage.freeze) return this.start % d;
      return (this.start + (performance.now() - this.t0) / 1000) % d;
    }
    tick() {
      const p = this.pos();
      if (this.stage.freeze) {
        const c = this.stage.clock;
        c.pos = p;
        c.target = { pos: p, perf: performance.now(), playing: true };
        c.inited = true;
      } else if (Math.abs(this.stage.clock.targetNow() - p) > 0.5) this.stage.clock.set(p, true);
      else this.stage.clock.report(p, true, Date.now());
      const ph = (p % this.beatLen) / this.beatLen;
      const kick = Math.exp(-ph * 7);
      const bands = [];
      for (let i = 0; i < 24; i++) {
        const base = 0.55 - i * 0.017;
        const n = 0.5 + 0.5 * this.n1(p * 3 + i * 1.7);
        bands.push(U.sat(base * (0.45 + 0.55 * n) + (i < 5 ? kick * 0.45 : kick * 0.12)));
      }
      this.stage.setAudio({ level: 0.5 + 0.3 * kick, bass: 0.35 + 0.6 * kick, mid: 0.45, high: 0.3, beat: ph < 0.06 ? 1 : 0, bands }, true);
    }
  };
})();
