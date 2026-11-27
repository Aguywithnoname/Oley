/* Oley · Pasteup emoji: when a sung word has an obvious picture, an emoji is printed into the paste-up
   next to it: a die-cut sticker, a halftoned magazine cut-out, a photocopy in one ink, or a two-ink riso
   print. Words are read in context ("you know my line" is a phone line, a line of text isn't), and only
   the clear ones get one. The pictures are Apple's set by default (Microsoft's Fluent 3D as an option);
   Oley's own server downloads each one the first time a song needs it and keeps it on disk. */
(function () {
  'use strict';
  const O = window.Oley, PU = O.PU;
  const PI = Math.PI;

  // ---------------------------------------------------------------- words to pictures
  const MAP = {};
  const add = (words, e) => words.split(' ').forEach((w) => { MAP[w] = e; });
  add('call calls calling called phone phones ring ringing rang dial dialing dialed hotline voicemail', '📞');
  add('text texts texting texted message messages dm dms', '💬');
  add('cellphone iphone screen screens', '📱');
  add('love loved lover lovers loving', '❤️');
  add('heart hearts', '❤️');
  add('heartbreak heartbroken heartache', '💔');
  add('kiss kisses kissed kissing lips', '💋');
  add('cry crying cried tears teardrops', '😭');
  add('fire flame flames burn burning burned burnt lit', '🔥');
  add('money cash bands racks dollar dollars bills rich paid', '💸');
  add('diamond diamonds jewels jewelry', '💎');
  add('gold golden', '🏆');
  add('crown king queen kings queens royalty', '👑');
  add('night tonight midnight moon moonlight', '🌙');
  add('sun sunshine sunlight summer', '☀️');
  add('sunrise sunset dawn', '🌅');
  add('star stars starlight shine shining sparkle glitter', '✨');
  add('rain raining rainy', '🌧️');
  add('storm storms thunder lightning', '⛈️');
  add('snow snowing winter freezing frozen cold', '❄️');
  add('home house', '🏠');
  add('car cars drive driving drove ride riding highway', '🚗');
  add('plane flight airport jet', '✈️');
  add('dance dancing danced dancer', '💃');
  add('eyes see seen saw look looking looked watch watching stare staring', '👀');
  add('sleep sleeping asleep slept bed', '😴');
  add('dream dreams dreaming dreamt dreamed', '💭');
  add('think thinking thought thoughts', '💭');
  add('mind brain', '🧠');
  add('time clock hours minutes late', '⏰');
  add('wait waiting waited', '⏳');
  add('world earth globe planet', '🌍');
  add('music song songs sing singing sang melody radio', '🎶');
  add('dead death die dying died kill killing killed killer ghost', '💀');
  add('ghosted ghosting', '👻');
  add('devil demon demons evil sins sinner', '😈');
  add('angel angels heaven halo', '😇');
  add('crazy insane psycho', '🤪');
  add('party parties drink drinks drinking cheers champagne wine', '🥂');
  add('drunk tipsy wasted', '🥴');
  add('smoke smoking', '💨');
  add('secret secrets whisper', '🤫');
  add('lonely alone', '🥀');
  add('rose roses flower flowers', '🌹');
  add('ocean sea waves wave beach water', '🌊');
  add('fly flying wings sky skies bird birds', '🕊️');
  add('lock locked', '🔒');
  add('key keys', '🔑');
  add('picture pictures photo photos camera', '📸');
  add('win winning won winner champion', '🏆');
  add('city downtown streets', '🌃');
  add('lie lies lying liar lied', '🤥');
  add('pray praying prayer prayers bless blessed god', '🙏');
  add('hurt hurts hurting pain bleed bleeding scars', '🩹');
  add('run running ran runaway escape', '🏃');
  add('stop', '🛑');
  add('boom bomb explode exploding', '💥');
  add('cool chill', '😎');
  add('laugh laughing laughed funny', '😂');
  add('angry mad rage', '😤');
  add('sorry please', '🥺');
  add('birthday cake', '🎂');
  add('coffee', '☕');
  add('mirror', '🪞');
  add('door doors', '🚪');
  add('letter letters mail', '💌');
  add('gift present', '🎁');
  add('forever infinity', '♾️');
  add('shy blush blushing', '😳');
  add('crown', '👑');
  add('butterfly butterflies', '🦋');
  add('chains chained', '⛓️');
  add('bullet bullets', '💥');
  add('magic', '🪄');
  add('candle candles', '🕯️');
  add('maybach benz porsche lambo ferrari backseat', '🏎️');
  add('scooter vespa', '🛵');
  add('paparazzi flash', '📸');
  add('superstar famous fame', '🌟');
  add('mansion palace castle', '🏰');
  add('vacation island', '🏝️');
  add('tour travel', '✈️');
  add('shout shouting yell yelling scream screaming loud accusation', '📢');
  add('rainbow', '🌈');
  add('rocket space astronaut', '🚀');
  add('sorrow', '🥀');
  add('minutes seconds', '⏱️');
  // words that only mean the picture in context
  const CTX = [
    // "you know my line", "hit my line", "on the line": a phone line
    { w: /^line$/, ok: (p) => /^(my|your|the|his|her|a|our)$/.test(p[0] || ''), e: '📞' },
    { w: /^up$/, ok: (p) => p[0] === 'hit' || (p[0] === 'me' && p[1] === 'hit'), e: '📞' },
    { w: /^broken$/, ok: (p, n) => /^hearts?$/.test(n[0] || '') || /^(heart|hearts)$/.test(p[0] || ''), e: '💔' },
    { w: /^blue$/, ok: (p) => /^(feeling|feel|so|im)$/.test(p[0] || ''), e: '💙' },
    { w: /^ring$/, ok: (p) => /^(a|the|your|my|diamond|wedding)$/.test(p[0] || ''), e: '💍' },
    { w: /^high$/, ok: (p) => /^(so|get|getting|im|got)$/.test(p[0] || ''), e: '🎈' },
  ];
  const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
  // the picture for one word of a line, or null
  PU.emojiAt = function (words, i) {
    const w = norm(words[i].raw || words[i].bare);
    const prev = [norm(words[i - 1] && (words[i - 1].raw || words[i - 1].bare)), norm(words[i - 2] && (words[i - 2].raw || words[i - 2].bare))];
    const next = [norm(words[i + 1] && (words[i + 1].raw || words[i + 1].bare))];
    for (const c of CTX) if (c.w.test(w) && c.ok(prev, next)) return c.e;
    if (w === 'line' || w === 'up' || w === 'broken' || w === 'blue' || w === 'ring' || w === 'high') return null;
    return MAP[w] || null;
  };
  PU.cp = (e) => [...e].map((c) => c.codePointAt(0).toString(16)).join('-');

  // ---------------------------------------------------------------- loading
  const cache = new Map();
  const SRC = {
    apple: (cp) => ['https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-160/' + cp + '.png', 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/' + cp + '.png'],
    fluent: (cp) => ['https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/' + cp + '.webp', 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/' + cp.replace(/-fe0f/g, '') + '_3d.png'],
  };
  PU.Emoji = {
    base: '',
    set: 'fluent',
    setBase(b) { if (b) this.base = b; },
    setSet(k) { k = SRC[k] ? k : 'fluent'; if (k !== this.set) { this.set = k; cache.clear(); } },
    want(e) {
      if (!e || cache.has(e)) return;
      const rec = { ok: false, out: new Map(), tries: 0 };
      cache.set(e, rec);
      const cp = PU.cp(e), set = this.set;
      const srcs = [];
      if (this.base) srcs.push(this.base + '/emoji/' + set + '/' + cp + '.png');
      srcs.push(...SRC[set](cp));
      const next = () => {
        if (rec.tries >= srcs.length) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { if (img.naturalWidth > 8) { rec.img = img; rec.ok = true; } else { rec.tries++; next(); } };
        img.onerror = () => { rec.tries++; next(); };
        img.src = srcs[rec.tries];
      };
      next();
    },
    ready(e) { const r = cache.get(e); return !!(r && r.ok); },
    img(e) { const r = cache.get(e); return r && r.ok ? r.img : null; },
    // the emoji printed into the paste-up. kind: sticker | print | ink | riso. S: the colour scheme
    sticker(e, kind, S) {
      const r = cache.get(e);
      if (!r || !r.ok) return null;
      kind = kind || 'sticker';
      const key = kind + (S ? S.ink.join() + S.a.join() + S.paper.join() : '');
      if (r.out.has(key)) return r.out.get(key);
      let c = null;
      try { c = make(r.img, kind, S); } catch (err) { c = null; }
      r.out.set(key, c);
      return c;
    },
  };

  // ---------------------------------------------------------------- printing them
  // Canvas is SZ square with a wide clear margin (the drop shadow blurs out before the quad's edge);
  // the picture plus its paper edge fills the middle 360/512.
  const SZ = 512, PAD = 100;
  const sm = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  // a dot screen: how much of a cell of size cs at angle ang is inked for a tone of k (0..1)
  function dot(x, y, cs, ang, k) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const u = (x * ca + y * sa) / cs, v = (-x * sa + y * ca) / cs;
    const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
    const d = Math.sqrt(fu * fu + fv * fv) * cs;
    const rad = cs * 0.72 * Math.sqrt(Math.max(0, k));
    return sm(rad + 0.8, rad - 0.8, d);
  }
  function make(img, kind, S) {
    const lu = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
    const paper = S ? S.paper : [250, 247, 240], acc = S ? S.a : [230, 50, 60];
    // photocopies are always a dark ink on paper
    const ink = S && lu(S.ink) < 0.35 ? S.ink : [22, 19, 24];
    // the picture, scaled up smoothly (Apple's are 64 or 160 px)
    const src = PU.cv(SZ, SZ), sx = src.getContext('2d', { willReadFrequently: true });
    sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
    const B = kind === 'sticker' ? 24 : 9;
    const inner = 360 - B * 2, off = (SZ - inner) / 2;
    sx.drawImage(img, off, off, inner, inner);
    const id = sx.getImageData(0, 0, SZ, SZ), d = id.data, N = SZ * SZ;
    const al = new Float32Array(N);
    for (let i = 0; i < N; i++) al[i] = sm(0.32, 0.62, d[i * 4 + 3] / 255);
    const cs = kind === 'ink' ? 7 : kind === 'riso' ? 6.5 : 5.5;
    // stretch the tones so a pale picture (a yellow face) still prints its features
    let lo = 1, hi = 0;
    if (kind === 'ink' || kind === 'riso') {
      const hist = new Uint32Array(64); let n = 0;
      for (let i = 0; i < N; i++) if (al[i] > 0.5) { const L = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; hist[Math.min(63, (L * 64) | 0)]++; n++; }
      let acc0 = 0;
      for (let k = 0; k < 64; k++) { acc0 += hist[k]; if (lo > 0.99 && acc0 > n * 0.04) lo = k / 64; if (acc0 > n * 0.9) { hi = (k + 1) / 64; break; } }
      if (hi - lo < 0.2) { lo = Math.max(0, lo - 0.1); hi = Math.min(1, lo + 0.3); }
    }
    for (let i = 0; i < N; i++) {
      const a = al[i];
      if (a <= 0) { d[i * 4 + 3] = 0; continue; }
      const x = i % SZ, y = (i / SZ) | 0;
      let r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      let R, G, Bc;
      if (kind === 'ink' || kind === 'riso') {
        // one or two inks on paper, like a photocopy or a riso print
        const Ln = Math.min(1, Math.max(0, (L - lo) / (hi - lo)));
        const tone = Math.pow(1 - Ln, 0.9) * 0.92 + 0.04;
        const m1 = dot(x, y, cs, 0.26, tone);
        R = paper[0] + (ink[0] - paper[0]) * m1; G = paper[1] + (ink[1] - paper[1]) * m1; Bc = paper[2] + (ink[2] - paper[2]) * m1;
        if (kind === 'riso') {
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
          const m2 = dot(x + 3, y + 2, cs, 1.31, Math.min(1, sat * 1.1) * 0.85);
          // the second ink multiplies over the first, a little out of register
          R *= 1 - m2 * (1 - acc[0] / 255); G *= 1 - m2 * (1 - acc[1] / 255); Bc *= 1 - m2 * (1 - acc[2] / 255);
        }
      } else {
        // the picture's own colours, printed: a little flatter and warmer, with a visible dot in the midtones
        const k = kind === 'print' ? 1 : 0.5;
        const g0 = 0.88;
        r = L * 255 + (r - L * 255) * g0 + 6; g = L * 255 + (g - L * 255) * g0 + 2; b = L * 255 + (b - L * 255) * g0 - 6;
        const tone = 1 - L;
        const m = dot(x, y, cs, 0.785, Math.min(1, tone * 1.1 + 0.06));
        const lift = 0.2 * k, sink = 0.36 * k;
        const lr = r + (255 - r) * lift, lg = g + (255 - g) * lift, lb = b + (255 - b) * lift;
        R = lr + (r * (1 - sink) - lr) * m; G = lg + (g * (1 - sink) - lg) * m; Bc = lb + (b * (1 - sink) - lb) * m;
      }
      d[i * 4] = Math.max(0, Math.min(255, R)); d[i * 4 + 1] = Math.max(0, Math.min(255, G)); d[i * 4 + 2] = Math.max(0, Math.min(255, Bc)); d[i * 4 + 3] = a * 255;
    }
    sx.putImageData(id, 0, 0);
    // the paper edge it was cut out with
    const sil = PU.cv(SZ, SZ), sl = sil.getContext('2d');
    sl.drawImage(src, 0, 0);
    sl.globalCompositeOperation = 'source-in'; sl.fillStyle = PU.C(paper); sl.fillRect(0, 0, SZ, SZ);
    const out = PU.cv(SZ, SZ), x = out.getContext('2d');
    const n = B > 12 ? 32 : 20;
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2, j = B * (0.92 + 0.08 * Math.sin(i * 2.3)); x.drawImage(sil, Math.cos(a) * j, Math.sin(a) * j); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; x.drawImage(sil, Math.cos(a) * B * 0.5, Math.sin(a) * B * 0.5); }
    x.drawImage(src, 0, 0);
    // a little wear
    PU.rough(out, kind === 'sticker' ? 0.05 : 0.12);
    x.getImageData(0, 0, 1, 1);
    return out;
  }
})();
