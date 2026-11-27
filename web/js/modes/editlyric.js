/* Editlyric: every line is acted out through a different scene — phones (typing, notifications, calls,
   alerts, search, maps, weather…), a desktop (error dialogs, a terminal, a spreadsheet…), real objects
   (a split-flap board, a receipt, neon, a typewriter, sticky notes, a book page, a fogged window, a label
   maker, a stamp, a slot machine, a boarding pass, a newspaper, an LED ticker, a heart monitor…) and
   kinetic type (falling words, a magnifier, a word tunnel, shattering glass, a poster, film subtitles).
   A planner picks scenes from the words and mood of each line and never lets one come back until most
   of the others have played; camera moves and transitions are varied the same way. The classic scenes
   from the first version are kept as rare cameos (at most once per song, and they can be turned off).
   A tiny typewriter caption runs along the bottom so the words are always readable. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  O.css('editlyric', `
.m-ed { background: #efeee9; }
.m-ed .ed-scene { position: absolute; inset: 0; overflow: hidden; will-change: opacity, transform, filter; }
.m-ed .paper { background: #efeee9; color: #161616; }
.m-ed .ink { background: #0c0c0d; color: #f4f4f2; }
.m-ed .ed-cap { position: absolute; left: 0; right: 0; bottom: 3.2vh; text-align: center; font: 400 max(10px, 0.95vmin) var(--mono); letter-spacing: 0.02em;
  color: rgba(0,0,0,0.5); white-space: pre; z-index: 4; transition: color 0.3s; }
.m-ed .ed-cap.light { color: rgba(255,255,255,0.5); }
.m-ed .ed-glitch { position: absolute; inset: 0; z-index: 5; pointer-events: none; display: none; }
.m-ed .ed-glitch i { position: absolute; left: 0; height: 2vh; background: #fff; mix-blend-mode: difference; }
/* typing + selection */
.m-ed .ed-row { position: absolute; left: 8vw; right: 8vw; top: 50%; display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline;
  column-gap: 0.26em; row-gap: 0.05em; transform: translateY(-50%); font-family: 'Oley Display', 'Oley Sans', sans-serif; font-weight: 600; letter-spacing: -0.025em; line-height: 1.12; }
.m-ed .ed-w { position: relative; white-space: pre; z-index: 1; }
.m-ed .ed-w.serif { font-family: 'Oley Serif', Georgia, serif; font-style: italic; font-weight: 500; letter-spacing: 0; }
.m-ed .ed-w.typo::after { content: ''; position: absolute; left: 0; right: 0; bottom: -0.04em; border-bottom: 0.08em dotted #e0313b; }
.m-ed .ed-hl { position: absolute; left: 0; top: 0; background: #e9dfbf; z-index: 0; border-radius: 0.06em; will-change: transform, width, height, opacity; }
.m-ed .ink .ed-hl { background: #3b3424; }
.m-ed .ed-hd { position: absolute; left: 0; top: 0; width: 0.11em; background: #b07d1c; z-index: 2; will-change: transform, height, opacity; }
.m-ed .ed-hd::before { content: ''; position: absolute; left: 50%; width: 0.36em; height: 0.36em; margin-left: -0.18em; border-radius: 50%; background: #b07d1c; }
.m-ed .ed-hd.a::before { top: -0.3em; } .m-ed .ed-hd.b::before { bottom: -0.3em; }
/* finder */
.m-ed .ed-finder { background: radial-gradient(ellipse 80% 70% at 50% 45%, #3f8a3f 0%, #2b6a2b 45%, #194419 100%); color: #fff; }
.m-ed .fd-top { position: absolute; left: 4vw; top: 5vh; font-family: 'Oley Sans', sans-serif; }
.m-ed .fd-top small { display: block; font-size: max(9px, 0.85vmin); letter-spacing: 0.12em; opacity: 0.7; font-weight: 600; }
.m-ed .fd-top b { font-size: max(12px, 1.5vmin); font-weight: 600; }
.m-ed .fd-ring { position: absolute; left: 50%; top: 44%; border-radius: 50%; background: rgba(255,255,255,0.2); will-change: transform; }
.m-ed .fd-disk { position: absolute; left: 50%; top: 44%; border-radius: 50%; background: #fff; will-change: transform, box-shadow; }
.m-ed .fd-tag { position: absolute; left: 50%; top: 44%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #e9e9ee 55%, #c9c9d2);
  box-shadow: inset 0 0 0 0.6vmin #f6f6f8, 0 2vmin 5vmin rgba(0,0,0,0.35); opacity: 0; will-change: transform, opacity; }
.m-ed .fd-tag::after { content: ''; position: absolute; inset: 32%; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fafafa, #dedee4); box-shadow: inset 0 0 0.6vmin rgba(0,0,0,0.12); }
.m-ed .fd-dist { position: absolute; left: 4vw; bottom: 13vh; font: 500 var(--fdd) 'Oley Sans', sans-serif; letter-spacing: -0.02em; }
.m-ed .fd-text { position: absolute; left: 4vw; bottom: 8vh; font: 500 var(--fdt) 'Oley Sans', sans-serif; opacity: 0.92; }
.m-ed .fd-text span { opacity: 0; transition: opacity 0.15s; } .m-ed .fd-text span.on { opacity: 1; }
.m-ed .fd-here { position: absolute; left: 4vw; bottom: 8vh; font: 600 var(--fdd) 'Oley Sans', sans-serif; opacity: 0; }
/* rings */
.m-ed svg.rg { position: absolute; inset: 0; width: 100%; height: 100%; }
.m-ed svg.rg text { font-family: 'Oley Display', 'Oley Sans', sans-serif; fill: #141414; letter-spacing: -0.01em; }
/* camera */
.m-ed .cam-vf { position: absolute; left: 50%; top: 47%; overflow: hidden; border-radius: 2.2vmin; background: #222 center / cover; will-change: transform; }
.m-ed .cam-vf::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 6vmin rgba(0,0,0,0.35); }
.m-ed .cam-note { position: absolute; left: 50%; top: 46%; font: 400 var(--cn) var(--hand); color: #fff; white-space: nowrap; -webkit-text-stroke: 0.035em rgba(0,0,0,0.85);
  paint-order: stroke fill; text-shadow: 0 0.04em 0.2em rgba(0,0,0,0.4); will-change: clip-path, transform; }
.m-ed .cam-bar { position: absolute; left: 50%; display: flex; align-items: center; justify-content: space-between; transform: translateX(-50%); }
.m-ed .cam-shut { width: 7.2vmin; height: 7.2vmin; border-radius: 50%; border: 0.55vmin solid #fff; box-sizing: border-box; display: grid; place-items: center; }
.m-ed .cam-shut i { width: 82%; height: 82%; border-radius: 50%; background: #fff; transition: transform 0.12s; }
.m-ed .cam-thumb { width: 4.6vmin; height: 4.6vmin; border-radius: 0.8vmin; background: #333 center / cover; border: 0.2vmin solid rgba(255,255,255,0.6); }
.m-ed .cam-ico { width: 4vmin; height: 4vmin; border-radius: 50%; background: rgba(255,255,255,0.12); display: grid; place-items: center; color: #fff; }
.m-ed .cam-ico svg { width: 55%; height: 55%; }
.m-ed .cam-top { position: absolute; left: 50%; display: flex; gap: 2vmin; transform: translateX(-50%); color: rgba(255,255,255,0.85); font: 600 max(10px, 1.1vmin) 'Oley Sans', sans-serif; }
.m-ed .cam-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
/* canvas */
.m-ed .cv-dot { position: absolute; left: 0; top: 0; width: 0.7vmin; height: 0.7vmin; will-change: transform; }
.m-ed .cv-photo { position: absolute; left: 50%; top: 46%; background: #ddd center / cover; border: 0.8vmin solid #fff; box-shadow: 0 2.4vmin 6vmin rgba(0,0,0,0.25); will-change: transform, opacity; }
.m-ed .cv-info { position: absolute; left: 50%; top: 46%; background: #fff; border-radius: 1.6vmin; box-shadow: 0 1.6vmin 5vmin rgba(0,0,0,0.18); padding: 2vmin 2.2vmin;
  font: 500 max(10px, 1.15vmin) 'Oley Sans', sans-serif; color: #222; will-change: transform, opacity; box-sizing: border-box; }
.m-ed .cv-info b { display: block; font-size: 1.25em; margin-bottom: 0.2em; } .m-ed .cv-info .big { font-size: 1.9em; font-weight: 700; margin: 0.25em 0 0.6em; }
.m-ed .cv-info .r { display: flex; justify-content: space-between; gap: 2em; opacity: 0.6; line-height: 1.8; border-top: 1px solid rgba(0,0,0,0.06); }
.m-ed .cv-giz { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; will-change: transform, opacity; }
.m-ed .cv-tool { position: absolute; left: 3vw; bottom: 7vh; display: flex; align-items: center; gap: 1.2vmin; background: #fff; border-radius: 99px; padding: 1vmin 1.6vmin;
  box-shadow: 0 0.6vmin 2vmin rgba(0,0,0,0.12); will-change: opacity, transform; }
.m-ed .cv-tool i { width: 0.6vmin; height: 3.4vmin; border-radius: 0.4vmin 0.4vmin 0.1vmin 0.1vmin; background: #444; }
.m-ed .cv-tool b { width: 1.8vmin; height: 1.8vmin; border-radius: 50%; }
.m-ed .cv-lab { position: absolute; left: 0; top: 0; padding: 0.6vmin 1.2vmin; border-radius: 99px; background: #fff; box-shadow: 0 0.4vmin 1.6vmin rgba(0,0,0,0.12);
  font: 600 var(--cvl) 'Oley Sans', sans-serif; color: #111; white-space: nowrap; will-change: transform, opacity; }
.m-ed .cv-lab::before { content: ''; display: inline-block; width: 0.5em; height: 0.5em; border-radius: 50%; background: var(--c, #3478f6); margin-right: 0.45em; vertical-align: 0.06em; }
/* emoji brackets */
.m-ed .em-row { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 0.22em; white-space: nowrap;
  font: 700 var(--emf) 'Oley Display', 'Oley Sans', sans-serif; letter-spacing: -0.03em; color: #111; }
.m-ed .em-slot { display: inline-flex; align-items: center; font-weight: 500; }
.m-ed .em-slot b { display: inline-block; min-width: 0.9em; text-align: center; font-family: var(--emoji); font-weight: 400; font-size: 0.78em; will-change: transform; }
.m-ed .em-slot b.x { font-family: 'Oley Display', sans-serif; font-weight: 800; color: #c5161e; font-size: 0.9em; }
.m-ed .em-arrow { font-family: 'Oley Sans', sans-serif; font-weight: 500; will-change: transform, opacity; }
/* chat */
.m-ed .ch-col { position: absolute; left: 50%; top: 22vh; bottom: 0; width: var(--chw); transform: translateX(-50%); font: 500 var(--chf) 'Oley Sans', sans-serif;
  display: flex; flex-direction: column; gap: 0.45em; }
.m-ed .ch-time { text-align: center; font-size: 0.5em; color: #8b8b90; font-weight: 600; margin-bottom: 0.4em; }
.m-ed .ch-b { max-width: 78%; padding: 0.42em 0.78em 0.48em; border-radius: 1.05em; line-height: 1.25; will-change: transform, opacity; }
.m-ed .ch-b.in { align-self: flex-start; background: #e6e6ea; color: #111; } .m-ed .ch-b.out { align-self: flex-end; background: #1d8cff; color: #fff; }
.m-ed .ch-b span { opacity: 0; transition: opacity 0.14s; } .m-ed .ch-b span.on { opacity: 1; }
.m-ed .ch-dots { display: flex; gap: 0.2em; } .m-ed .ch-dots i { width: 0.36em; height: 0.36em; border-radius: 50%; background: #9a9aa0; animation: msg-bob 1.1s infinite; }
.m-ed .ch-dots i:nth-child(2) { animation-delay: 0.15s; } .m-ed .ch-dots i:nth-child(3) { animation-delay: 0.3s; }
.m-ed .ch-input { position: absolute; left: 0; right: 0; top: 66vh; display: flex; align-items: center; gap: 0.1em; padding: 0.42em 0.8em; border-radius: 1.1em;
  border: 1px solid rgba(0,0,0,0.12); background: #fff; font-size: 0.82em; font-weight: 500; color: #a2a2a7; white-space: pre; }
.m-ed .ch-input i { display: inline-block; width: 0.08em; height: 1.05em; background: #1d8cff; border-radius: 0.04em; }
/* edit menu */
.m-ed .mn-date { position: absolute; font: 500 var(--mnd) 'Oley Sans', sans-serif; color: #8d8d8a; white-space: nowrap; }
.m-ed .mn-bar { position: absolute; display: flex; align-items: stretch; background: #fff; border-radius: 0.6em; box-shadow: 0 0.5em 1.8em rgba(0,0,0,0.16);
  font: 500 var(--mnf) 'Oley Sans', sans-serif; color: #111; white-space: nowrap; overflow: hidden; will-change: transform, opacity; }
.m-ed .mn-bar span { padding: 0.55em 1em; border-left: 1px solid rgba(0,0,0,0.08); } .m-ed .mn-bar span:first-child { border-left: 0; }
.m-ed .mn-bar span.del { color: #e0313b; }
/* giant */
.m-ed .gt-word { position: absolute; left: 50%; top: 50%; font: 900 var(--gtf) 'Oley Display', 'Oley Black', sans-serif; letter-spacing: -0.05em; color: #f4f4f2;
  white-space: nowrap; line-height: 0.8; will-change: transform, opacity, filter; }
.m-ed .gt-small { position: absolute; left: 6vw; top: 8vh; font: 600 var(--gts) 'Oley Display', sans-serif; color: rgba(255,255,255,0.75); white-space: nowrap; }
`);

  // ---------------------------------------------------------------- vocab
  const S = (s) => new Set(s.split(' '));
  const TRIG = {
    finder: S('where here there find found lost near close closer far come home way somewhere anywhere everywhere distance miles location away waiting'),
    camera: S('picture pictures photo photos camera see look looking eyes smile moment remember memory memories face flash pose watch saw seen'),
    canvas: S('break broke broken apart pieces piece scattered world everything mess fall falling pull tear tore shatter glass build make design'),
    message: S('say said text texts call calling called tell told talk message reply answer words read phone send sent typing saw'),
    editmenu: S('from far delete erase forget copy paste again replace change undo mistake rewrite lines write wrote afar'),
    rings: S('round around again end forever always circle circles spin spinning over orbit loop repeat turn turning'),
    giant: S('never no go run now stop fire die kill yeah hey loud up down gone free'),
  };
  const EMOJI = {};
  const addE = (words, e) => words.split(' ').forEach((w) => { EMOJI[w] = e; });
  addE('leave leaving left run running ran away escape gone go', '🏃');
  addE('love loved lover loving', '❤️'); addE('heart hearts', '❤️'); addE('broken heartbreak heartache', '💔');
  addE('both together us we', '🤝'); addE('cry crying cried tears tear', '😢'); addE('fire burn burning flame flames hot', '🔥');
  addE('money cash rich paid', '💸'); addE('night moon tonight midnight', '🌙'); addE('sun sunrise morning sunshine', '☀️');
  addE('call phone calling called', '📞'); addE('home house', '🏠'); addE('dance dancing dancer', '💃'); addE('drive car ride driving', '🚗');
  addE('kiss lips kissing', '💋'); addE('eyes see look watch watching', '👀'); addE('sleep dream dreaming dreams asleep', '😴');
  addE('time clock hours wait waiting', '⏳'); addE('world earth', '🌍'); addE('stars star shine shining', '✨'); addE('rain raining', '🌧️');
  addE('die dead death kill', '💀'); addE('music song sing singing', '🎵'); addE('city lights', '🌃'); addE('ocean sea water wave waves', '🌊');
  addE('rose roses flowers', '🌹'); addE('angel', '😇'); addE('devil', '😈'); addE('picture pictures photo photos', '📸'); addE('cold ice freeze', '🧊');
  addE('hand hands hold holding', '🫶'); addE('think mind thought thoughts', '💭'); addE('fly flying sky high', '🕊️'); addE('alone lonely', '🥀');
  addE('party drink drinks', '🥂'); addE('secret secrets', '🤫'); addE('crazy', '🌀'); addE('forever always', '♾️'); addE('step steps walk walking', '👣');
  const NEG = S('never no nothing not dont don\'t cant can\'t wont won\'t nobody');
  const ARROW = {};
  ['leave', 'away', 'back', 'gone', 'left', 'past', 'behind', 'apart'].forEach((w) => { ARROW[w] = '←'; });
  ['up', 'high', 'higher', 'rise', 'fly', 'sky', 'top', 'both', 'together', 'heaven'].forEach((w) => { ARROW[w] = '↗'; });
  ['down', 'fall', 'falling', 'low', 'sink', 'under', 'drown'].forEach((w) => { ARROW[w] = '↘'; });
  ['go', 'forward', 'next', 'run', 'come', 'on', 'over', 'home'].forEach((w) => { ARROW[w] = '→'; });
  const ICON = {
    flash: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8"/></svg>',
    flip: '<svg viewBox="0 0 24 24"><path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  // a believable typo: swap two letters or hit a neighbouring key
  const KEYS = 'qwertyuiop asdfghjkl zxcvbnm';
  function typoOf(word, r) {
    const w = word;
    if (w.length < 4) return null;
    const i = r.int(Math.floor(w.length / 2), w.length - 1);
    if (r.chance(0.5) && i > 0) return w.slice(0, i - 1) + w[i] + w[i - 1] + w.slice(i + 1);
    const ch = w[i].toLowerCase(), k = KEYS.indexOf(ch);
    const nb = k >= 0 ? (KEYS[k + 1] && KEYS[k + 1] !== ' ' ? KEYS[k + 1] : KEYS[k - 1]) : 'n';
    return w.slice(0, i) + (nb || 'n') + w.slice(i + 1);
  }
  // what a word shows at progress p (0..1) through its typing window, typo and all
  function typed(word, p, typo) {
    if (!typo) return { s: word.slice(0, Math.ceil(word.length * U.sat(p) - 1e-6)), bad: false };
    let first = 0;
    while (first < word.length && word[first] === typo[first]) first++;
    if (p < 0.42) return { s: typo.slice(0, Math.ceil(typo.length * (p / 0.42) - 1e-6)), bad: false };
    if (p < 0.6) return { s: typo, bad: true };
    if (p < 0.72) {
      const k = U.prog(0.6, 0.72, p);
      return { s: typo.slice(0, Math.round(typo.length - (typo.length - first) * k)), bad: k < 0.5 };
    }
    const k = U.prog(0.72, 0.95, p);
    return { s: word.slice(0, first + Math.ceil((word.length - first) * k - 1e-6)), bad: false };
  }
  function fitSize(text, font, maxW, size, min) {
    const w = U.textWidth(text, font.replace('{s}', size + 'px'));
    return w > maxW ? Math.max(min || 10, size * (maxW / w)) : size;
  }

  // ================================================================ scenes
  class Scene {
    constructor(host, mode, L, opts) {
      this.mode = mode;
      this.ctx = mode.ctx;
      this.L = L;
      this.opts = opts || {};
      this.el = U.el('div', 'ed-scene', host);
      this.dark = false;
      this.r = this.ctx.rng('scene' + L.i);
      this.age = 0;
    }
    get u() { return this.ctx.u; }
    // the cover as an <img> cloned from the decoded one, so it shows on the first frame
    cover(parent) {
      const art = this.ctx.artImg;
      if (art) {
        const im = art.cloneNode();
        im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit';
        parent.appendChild(im);
      } else if (this.ctx.art) parent.style.backgroundImage = 'url("' + this.ctx.art + '")';
    }
    update() {}
    exitAt() { return 1e9; }
    destroy() { U.remove(this.el); }
  }

  // ---- words typed one after another; the current word is selected with handles
  class TypeScene extends Scene {
    constructor(host, mode, L, opts) {
      super(host, mode, L, opts);
      this.dark = !!opts.dark;
      this.el.classList.add(this.dark ? 'ink' : 'paper');
      const n = L.words.length, u = this.u;
      const size = u * (n <= 2 ? 10 : n <= 4 ? 8 : n <= 6 ? 6.4 : n <= 9 ? 5.2 : 4.3);
      this.row = U.el('div', 'ed-row', this.el);
      this.row.style.fontSize = size.toFixed(1) + 'px';
      this.hl = U.el('div', 'ed-hl', this.row);
      this.ha = U.el('div', 'ed-hd a', this.row);
      this.hb = U.el('div', 'ed-hd b', this.row);
      const r = this.r;
      const typoAt = mode.ctx.opts.typos !== false && r.chance(0.45) ? r.pick(L.words.map((w, i) => i).filter((i) => (L.words[i].bare || '').length >= 4 && L.words[i].dur > 0.32)) : undefined;
      this.words = L.words.map((w, i) => {
        const txt = w.bare || w.raw;
        const el = U.el('span', 'ed-w', this.row, '');
        if ((w.w === 'i' && i === 0) || (O.STOP.has(w.w) && w.w.length <= 3 && r.chance(0.22))) el.classList.add('serif');
        return { w, el, txt, typo: i === typoAt ? typoOf(txt, r) : null, shown: null, bad: false };
      });
      this.sel = { x: 0, y: 0, w: 0, h: 0, op: 0, init: false };
    }
    update(t, dt) {
      const L = this.L;
      let cur = -1;
      this.words.forEach((W, i) => {
        const w = W.w;
        const span = Math.max(0.18, Math.min(W.typo ? w.dur * 0.95 : w.dur * 0.8, W.typo ? 1.4 : 0.07 * W.txt.length + 0.16));
        const p = U.prog(w.t - 0.02, w.t - 0.02 + span, t);
        if (t >= w.t - 0.02) cur = i;
        const st = typed(W.txt, p, W.typo);
        if (st.s !== W.shown) { W.shown = st.s; W.el.textContent = st.s; W.el.style.display = st.s ? '' : 'none'; }
        if (st.bad !== W.bad) { W.bad = st.bad; W.el.classList.toggle('typo', st.bad); }
      });
      // selection follows the current word
      const S2 = this.sel;
      const on = cur >= 0 && t < L.singEnd + 0.5;
      if (cur >= 0) {
        const el = this.words[cur].el;
        const x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
        if (!S2.init) { S2.x = x; S2.y = y; S2.w = w; S2.h = h; S2.init = true; }
        S2.x = U.damp(S2.x, x, 22, dt); S2.y = U.damp(S2.y, y, 22, dt);
        S2.w = U.damp(S2.w, w, 26, dt); S2.h = U.damp(S2.h, h, 26, dt);
      }
      S2.op = U.damp(S2.op, on ? 1 : 0, 10, dt);
      const pad = 0.04 * parseFloat(this.row.style.fontSize);
      this.hl.style.transform = `translate(${(S2.x - pad).toFixed(1)}px,${(S2.y + S2.h * 0.08).toFixed(1)}px)`;
      this.hl.style.width = (S2.w + pad * 2).toFixed(1) + 'px';
      this.hl.style.height = (S2.h * 0.86).toFixed(1) + 'px';
      this.hl.style.opacity = S2.op.toFixed(3);
      this.ha.style.height = (S2.h * 0.86).toFixed(1) + 'px';
      this.hb.style.height = (S2.h * 0.86).toFixed(1) + 'px';
      this.ha.style.transform = `translate(${(S2.x - pad - 2).toFixed(1)}px,${(S2.y + S2.h * 0.08).toFixed(1)}px)`;
      this.hb.style.transform = `translate(${(S2.x + S2.w + pad - 2).toFixed(1)}px,${(S2.y + S2.h * 0.08).toFixed(1)}px)`;
      this.ha.style.opacity = this.hb.style.opacity = S2.op.toFixed(3);
    }
    focus() {
      const S2 = this.sel, rw = this.row;
      if (!S2.init) return null;
      return { x: rw.offsetLeft + S2.x + S2.w / 2, y: rw.offsetTop - rw.offsetHeight / 2 + S2.y + S2.h / 2 };
    }
  }

  // ---- a tracker counting the distance down to the last word
  class FinderScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.dark = true;
      this.el.classList.add('ed-finder');
      const u = this.u, H = this.ctx.H, minD = Math.min(this.ctx.W, H);
      this.el.style.setProperty('--fdd', (u * 4.6).toFixed(1) + 'px');
      this.el.style.setProperty('--fdt', (u * 2.4).toFixed(1) + 'px');
      const top = U.el('div', 'fd-top', this.el);
      U.el('small', '', top, 'FINDING');
      U.el('b', '', top, (U.firstName(this.ctx.track && this.ctx.track.artist) || 'your') + '’s tag');
      this.S = minD * 0.4;
      this.ring = U.el('div', 'fd-ring', this.el);
      this.disk = U.el('div', 'fd-disk', this.el);
      this.tag = U.el('div', 'fd-tag', this.el);
      for (const e of [this.ring, this.disk, this.tag]) { e.style.width = e.style.height = this.S + 'px'; e.style.margin = `${-this.S / 2}px 0 0 ${-this.S / 2}px`; }
      this.dist = U.el('div', 'fd-dist', this.el, '');
      this.text = U.el('div', 'fd-text', this.el);
      this.spans = L.words.map((w) => U.el('span', '', this.text, (w.bare || w.raw) + ' '));
      this.here = U.el('div', 'fd-here', this.el, (L.words[L.words.length - 1].bare || '').toLowerCase());
      this.d0 = this.r.range(2.4, 8.5);
    }
    update(t, dt, A) {
      const L = this.L, last = L.words[L.words.length - 1];
      const p = U.prog(L.t, last.t, t);
      const d = 0.1 + (this.d0 - 0.1) * Math.pow(1 - p, 1.6);
      const ds = d.toFixed(1) + ' m';
      if (ds !== this._ds) { this._ds = ds; this.dist.textContent = ds; }
      const done = U.prog(last.t, last.t + 0.35, t);
      L.words.forEach((w, i) => { const on = t >= w.t - 0.03; if (this.spans[i]._on !== on) { this.spans[i]._on = on; this.spans[i].classList.toggle('on', on); } });
      const pulse = 1 + 0.035 * Math.sin(this.age * 5) + A.pulse * 0.04;
      const ds2 = 0.48 + 0.42 * p;
      this.ring.style.transform = `scale(${(pulse * (1 - done * 0.3)).toFixed(3)})`;
      this.ring.style.opacity = (1 - done).toFixed(3);
      this.disk.style.transform = `scale(${(ds2 * pulse * (1 - done * 0.2)).toFixed(3)})`;
      this.disk.style.boxShadow = `0 0 ${(4 + p * 40).toFixed(0)}px ${(p * 18).toFixed(0)}px rgba(255,255,255,${(0.25 + p * 0.5).toFixed(2)})`;
      this.disk.style.opacity = (1 - done).toFixed(3);
      this.tag.style.opacity = done.toFixed(3);
      this.tag.style.transform = `perspective(900px) rotateY(${(48 - 20 * done + Math.sin(this.age) * 6).toFixed(1)}deg) rotateX(${(10).toFixed(1)}deg) scale(${(0.5 + 0.12 * done).toFixed(3)})`;
      this.dist.style.opacity = (1 - done).toFixed(3);
      this.text.style.opacity = (0.92 * (1 - done)).toFixed(3);
      this.here.style.opacity = done.toFixed(3);
      this.here.style.transform = `translateY(${((1 - done) * 12).toFixed(1)}px)`;
    }
  }

  // ---- the line spinning in rings
  class RingsScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.el.classList.add('paper');
      const W = this.ctx.W, H = this.ctx.H, m = Math.min(W, H), u = this.u;
      const svg = U.svg('svg', { class: 'rg', viewBox: `0 0 ${W} ${H}` }, this.el);
      const defs = U.svg('defs', {}, svg);
      const cx = W / 2, cy = H / 2;
      const phrase = L.words.filter((w) => !w.adlib).map((w) => (w.bare || '').toLowerCase()).join(' ') + '. ';
      const rings = [
        { r: m * 0.56, size: u * 7.2, weight: 700, op: 1, dir: 1 },
        { r: m * 0.36, size: u * 4.2, weight: 500, op: 0.55, dir: -1 },
        { r: m * 0.205, size: u * 2.2, weight: 500, op: 0.85, dir: 1 },
      ];
      this.groups = rings.map((R, k) => {
        const id = 'rg' + L.i + '_' + k + '_' + Math.floor(Math.random() * 1e6);
        U.svg('path', { id, d: `M ${cx - R.r},${cy} a ${R.r},${R.r} 0 1,1 ${2 * R.r},0 a ${R.r},${R.r} 0 1,1 ${-2 * R.r},0` }, defs);
        const g = U.svg('g', {}, svg);
        const tx = U.svg('text', { 'font-size': R.size.toFixed(1), 'font-weight': R.weight, opacity: R.op }, g);
        const tp = U.svg('textPath', { href: '#' + id }, tx);
        const pw = U.textWidth(phrase, `${R.weight} ${R.size}px 'Oley Display'`) || 1;
        const reps = Math.max(1, Math.floor((2 * Math.PI * R.r) / pw));
        tp.textContent = phrase.repeat(reps);
        return { g, R, rot: this.r.range(0, 360) };
      });
      U.svg('circle', { cx, cy, r: m * 0.1, fill: 'none', stroke: '#141414', 'stroke-width': 1.4, opacity: 0.85 }, svg);
      this.arc = U.svg('path', { d: `M ${cx - m * 0.03},${cy - m * 0.01} q ${m * 0.02},${m * 0.02} ${m * 0.05},${-m * 0.01}`, fill: 'none', stroke: '#141414', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
      this.cx = cx; this.cy = cy;
    }
    update(t, dt, A) {
      const p = U.e('outCubic', U.prog(this.L.t - 0.1, this.L.t + 0.7, t));
      const speed = 1 - 0.85 * p;
      this.groups.forEach((G, k) => {
        G.rot += dt * G.R.dir * (8 + 120 * speed + A.pulse * 20) * (k === 0 ? 0.6 : 1);
        const s = 1.35 - 0.35 * p;
        G.g.setAttribute('transform', `translate(${this.cx} ${this.cy}) scale(${s.toFixed(4)}) rotate(${G.rot.toFixed(2)}) translate(${-this.cx} ${-this.cy})`);
      });
      this.el.style.opacity = U.sat(p * 2).toFixed(3);
    }
  }

  // ---- camera app; the line is written by hand on the photo
  class CameraScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.dark = true;
      this.el.classList.add('ink');
      const W = this.ctx.W, H = this.ctx.H, u = this.u;
      const vw = Math.min(W * 0.42, H * 0.56), vh = H * 0.66;
      this.vf = U.el('div', 'cam-vf', this.el);
      Object.assign(this.vf.style, { width: vw + 'px', height: vh + 'px', marginLeft: -vw / 2 + 'px', marginTop: -vh / 2 + 'px' });
      this.cover(this.vf);
      const top = U.el('div', 'cam-top', this.el);
      top.style.top = (H * 0.47 - vh / 2 - u * 3.2) + 'px';
      top.innerHTML = '<span style="width:1.4em;display:inline-block">' + ICON.flash + '</span><span>LIVE</span><span>1×</span>';
      const bar = U.el('div', 'cam-bar', this.el);
      bar.style.width = vw + 'px';
      bar.style.top = (H * 0.47 + vh / 2 + u * 1.6) + 'px';
      this.thumb = U.el('div', 'cam-thumb', bar);
      this.thumb.style.position = 'relative';
      this.thumb.style.overflow = 'hidden';
      this.cover(this.thumb);
      this.shut = U.el('div', 'cam-shut', bar);
      this.shutIn = U.el('i', '', this.shut);
      const flip = U.el('div', 'cam-ico', bar);
      flip.innerHTML = ICON.flip;
      // the handwritten bit: short lines whole, long ones around the key word; "and" becomes "+"
      let ws = L.words.filter((w) => !w.adlib);
      if (ws.length > 4) { const k = L.words[L.key]; const i = Math.max(0, ws.indexOf(k)); ws = ws.slice(Math.max(0, i - 2), i + 1); }
      this.noteWords = ws;
      const txt = ws.map((w) => (w.w === 'and' ? '+' : (w.bare || '').toLowerCase())).join(' ');
      const size = fitSize(txt, "400 {s} 'Ink Free', 'Segoe Print', cursive", vw * 0.86, u * 7.2, u * 3);
      this.el.style.setProperty('--cn', size.toFixed(1) + 'px');
      this.note = U.el('div', 'cam-note', this.el, txt);
      this.note.style.transform = `translate(-50%,-50%) rotate(${this.r.range(-8, -3).toFixed(1)}deg)`;
      this.flash = U.el('div', 'cam-flash', this.el);
      this.n1 = U.noise1(L.i + 3);
    }
    update(t, dt, A) {
      const L = this.L, ws = this.noteWords;
      const a = this.age;
      this.vf.style.transform = `translate(${(this.n1(a * 1.3) * 5).toFixed(1)}px,${(this.n1(a * 1.1 + 4) * 4).toFixed(1)}px) rotate(${(this.n1(a * 0.7 + 9) * 0.8).toFixed(2)}deg) scale(${(1.0 + A.pulse * 0.006).toFixed(4)})`;
      let p = 0;
      if (ws.length) {
        const w0 = ws[0], w1 = ws[ws.length - 1];
        p = U.prog(w0.t - 0.05, w1.t + Math.min(0.5, w1.dur), t);
      }
      this.note.style.clipPath = `inset(-20% ${((1 - p) * 100).toFixed(1)}% -20% -5%)`;
      const snap = U.prog(L.singEnd + 0.15, L.singEnd + 0.3, t), fl = snap > 0 && snap < 1 ? 1 : 0;
      const fo = U.prog(L.singEnd + 0.3, L.singEnd + 0.7, t);
      this.flash.style.opacity = (Math.max(fl * 0.85, (1 - fo) * (snap >= 1 ? 0.85 : 0))).toFixed(3);
      this.shutIn.style.transform = `scale(${snap > 0 && fo < 1 ? 0.82 : 1})`;
    }
  }

  // ---- a design canvas: photo, file info, a transform gizmo; then it all flies apart
  class CanvasScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.el.classList.add('paper');
      const W = this.ctx.W, H = this.ctx.H, u = this.u, m = Math.min(W, H), r = this.r;
      this.el.style.setProperty('--cvl', Math.max(11, u * 1.35).toFixed(1) + 'px');
      this.dots = [];
      const cols = ['#3478f6', '#e5484d', '#8e4ec6', '#30a46c', '#f76b15'];
      for (let i = 0; i < 46; i++) {
        const d = U.el('div', 'cv-dot', this.el);
        d.style.background = r.pick(cols);
        d.style.opacity = (0.35 + r() * 0.5).toFixed(2);
        this.dots.push({ el: d, x: r() * W, y: r() * H, vx: r.range(-6, 6), vy: r.range(-6, 6) });
      }
      const ps = m * 0.36;
      this.info = U.el('div', 'cv-info', this.el);
      Object.assign(this.info.style, { width: ps * 0.95 + 'px', marginLeft: ps * 0.05 + 'px', marginTop: -ps * 0.42 + 'px' });
      const title = (this.ctx.track && this.ctx.track.title) || 'untitled';
      const now = new Date();
      this.info.innerHTML = `<b>${title.replace(/[<>&]/g, '').slice(0, 26).toLowerCase()}.jpg</b><div class="big">${(200 + (U.hash(title) % 700)).toString()}.${U.hash(title) % 10} MB</div>` +
        `<div class="r"><span>Kind</span><span>JPEG image</span></div><div class="r"><span>Dimensions</span><span>3024 × 4032</span></div>` +
        `<div class="r"><span>Created</span><span>${U.fmtDateLong(now)}</span></div><div class="r"><span>Album</span><span>Hidden</span></div>`;
      this.photo = U.el('div', 'cv-photo', this.el);
      Object.assign(this.photo.style, { width: ps + 'px', height: ps + 'px', marginLeft: -ps * 0.95 + 'px', marginTop: -ps / 2 + 'px' });
      this.cover(this.photo);
      const giz = U.svg('svg', { class: 'cv-giz', viewBox: `0 0 ${W} ${H}` }, this.el);
      const gx = W / 2 - ps * 0.45, gy = H * 0.46;
      const ax = (x2, y2, c) => { U.svg('line', { x1: gx, y1: gy, x2, y2, stroke: c, 'stroke-width': 2.4 }, giz); U.svg('circle', { cx: x2, cy: y2, r: 4.5, fill: c }, giz); };
      ax(gx + ps * 0.42, gy - ps * 0.05, '#e5484d');
      ax(gx - ps * 0.08, gy - ps * 0.42, '#30a46c');
      ax(gx - ps * 0.3, gy + ps * 0.26, '#3478f6');
      U.svg('path', { d: `M ${gx + ps * 0.3},${gy + ps * 0.12} A ${ps * 0.32},${ps * 0.32} 0 0,1 ${gx - ps * 0.12},${gy + ps * 0.3}`, fill: 'none', stroke: '#3478f6', 'stroke-width': 2, opacity: 0.8 }, giz);
      U.svg('path', { d: `M ${gx - ps * 0.32},${gy - ps * 0.1} A ${ps * 0.34},${ps * 0.34} 0 0,1 ${gx + ps * 0.05},${gy - ps * 0.33}`, fill: 'none', stroke: '#f76b15', 'stroke-width': 2, opacity: 0.8 }, giz);
      this.giz = giz;
      const tool = U.el('div', 'cv-tool', this.el);
      tool.innerHTML = '<i></i><i style="background:#222;height:3.8vmin"></i><i style="background:#999"></i><i style="background:#e5484d"></i><b style="background:#111"></b><b style="background:#3478f6"></b><b style="background:#30a46c"></b><b style="background:#e5484d"></b>';
      this.tool = tool;
      // labels for the words, placed around the photo
      this.labs = L.words.filter((w) => !w.adlib).map((w, k, arr) => {
        const el = U.el('div', 'cv-lab', this.el, (w.bare || '').toLowerCase());
        el.style.setProperty('--c', r.pick(cols));
        const a = -Math.PI * 0.85 + (k / Math.max(1, arr.length - 1)) * Math.PI * 1.7 + r.range(-0.15, 0.15);
        const rad = ps * r.range(0.72, 0.95);
        return { el, w, x: W / 2 - ps * 0.25 + Math.cos(a) * rad * 1.25, y: H * 0.46 + Math.sin(a) * rad * 0.9, a, rot: r.range(-6, 6) };
      });
      this.parts = [this.photo, this.info, this.giz, this.tool];
      this.dirs = this.parts.map(() => ({ x: r.range(-1, 1), y: r.range(-1, 1), r: r.range(-40, 40) }));
    }
    update(t, dt, A) {
      const L = this.L, W = this.ctx.W, H = this.ctx.H;
      const nextT = L.end;
      const boomStart = Math.min(nextT - 0.55, L.singEnd + 1.2);
      const boom = U.e('inCubic', U.prog(boomStart, boomStart + 0.55, t));
      const enter = U.e('outBack', U.prog(L.t - 0.15, L.t + 0.45, t));
      for (const d of this.dots) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.el.style.transform = `translate(${(d.x + (d.x - W / 2) * boom * 0.8).toFixed(1)}px,${(d.y + (d.y - H / 2) * boom * 0.8).toFixed(1)}px)`;
      }
      const tilt = 1 - enter;
      this.photo.style.transform = `perspective(1200px) rotateX(${(16 + tilt * 30).toFixed(1)}deg) rotateY(${(-22 - tilt * 20).toFixed(1)}deg) rotateZ(${(-5).toFixed(1)}deg) ` +
        `translate(${(this.dirs[0].x * boom * W * 0.7).toFixed(1)}px,${(this.dirs[0].y * boom * H * 0.7).toFixed(1)}px) rotate(${(this.dirs[0].r * boom).toFixed(1)}deg)`;
      this.info.style.transform = `perspective(1200px) rotateX(10deg) rotateY(-14deg) translate(${(this.dirs[1].x * boom * W * 0.7 + tilt * 60).toFixed(1)}px,${(this.dirs[1].y * boom * H * 0.7).toFixed(1)}px) rotate(${(this.dirs[1].r * boom).toFixed(1)}deg)`;
      this.giz.style.transform = `translate(${(this.dirs[2].x * boom * W * 0.5).toFixed(1)}px,${(this.dirs[2].y * boom * H * 0.5).toFixed(1)}px)`;
      this.tool.style.transform = `translate(${(this.dirs[3].x * boom * W * 0.4).toFixed(1)}px,${(Math.abs(this.dirs[3].y) * boom * H * 0.4).toFixed(1)}px)`;
      for (const p of this.parts) p.style.opacity = (U.sat(enter * 1.5) * (1 - boom)).toFixed(3);
      for (const lb of this.labs) {
        const p = U.e('outBack', U.prog(lb.w.t - 0.05, lb.w.t + 0.3, t));
        lb.el.style.opacity = (U.sat(p * 1.4) * (1 - boom)).toFixed(3);
        const bx = (lb.x - W / 2) * boom * 1.2, by = (lb.y - H / 2) * boom * 1.2;
        lb.el.style.transform = `translate(${(lb.x + bx).toFixed(1)}px,${(lb.y + by).toFixed(1)}px) translate(-50%,-50%) scale(${(0.6 + 0.4 * p).toFixed(3)}) rotate(${(lb.rot + boom * 50).toFixed(1)}deg)`;
      }
    }
  }

  // ---- big line with an emoji swapped into brackets, plus a direction arrow
  class EmojiScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.el.classList.add('paper');
      const W = this.ctx.W, u = this.u, r = this.r;
      const ws = L.words;
      let target = -1;
      ws.forEach((w, i) => { if (target < 0 && EMOJI[w.w] && i > 0) target = i; });
      if (target < 0) ws.forEach((w, i) => { if (target < 0 && EMOJI[w.w]) target = i; });
      this.target = target;
      const slotAfter = target > 0 ? Math.max(0, target - 1) : 0;
      this.row = U.el('div', 'em-row', this.el);
      const allTxt = ws.map((w) => w.bare).join(' ') + ' (😀) →';
      const size = fitSize(allTxt, "700 {s} 'Oley Display'", W * 0.86, u * 8.4, u * 3.4);
      this.el.style.setProperty('--emf', size.toFixed(1) + 'px');
      this.items = [];
      ws.forEach((w, i) => {
        const el = U.el('span', 'ed-w', this.row, '');
        const txt = w.bare || w.raw;
        this.items.push({ w, el, txt, typo: i === target && mode.ctx.opts.typos !== false && r.chance(0.6) ? typoOf(txt, r) : null, shown: null });
        if (i === slotAfter && target >= 0) {
          this.slot = U.el('span', 'em-slot', this.row);
          this.slot.innerHTML = '(<b class="x">✗</b>)';
          this.slotB = this.slot.querySelector('b');
          this.slot.style.display = 'none';
        }
      });
      const neg = ws.find((w) => NEG.has(w.w));
      this.negFirst = !!neg;
      this.emoji = target >= 0 ? EMOJI[ws[target].w] : null;
      let arrow = null;
      for (const w of ws) if (ARROW[w.w]) arrow = ARROW[w.w];
      this.arrow = U.el('span', 'em-arrow', this.row, arrow || r.pick(['↗', '←', '→']));
      this.arrow.style.opacity = '0';
      this.swapped = false;
    }
    update(t, dt) {
      const L = this.L;
      this.items.forEach((W2) => {
        const w = W2.w;
        const span = Math.max(0.16, Math.min(W2.typo ? w.dur * 0.95 : w.dur * 0.8, W2.typo ? 1.2 : 0.07 * W2.txt.length + 0.15));
        const st = typed(W2.txt, U.prog(w.t - 0.02, w.t - 0.02 + span, t), W2.typo);
        if (st.s !== W2.shown) { W2.shown = st.s; W2.el.textContent = st.s; W2.el.style.display = st.s ? '' : 'none'; }
        W2.el.classList.toggle('typo', st.bad);
      });
      if (this.slot) {
        const firstShown = t >= this.L.words[0].t + 0.1;
        this.slot.style.display = firstShown ? '' : 'none';
        const tw = this.L.words[this.target];
        const sw = t >= tw.t - 0.02;
        if (sw !== this.swapped) {
          this.swapped = sw;
          this.slotB.className = sw ? '' : 'x';
          this.slotB.textContent = sw ? this.emoji : '✗';
          this.popT = t;
        }
        const pp = U.prog(this.popT || 0, (this.popT || 0) + 0.3, t);
        this.slotB.style.transform = `scale(${(sw ? 0.6 + 0.4 * U.e('outBack', pp) : 1).toFixed(3)})`;
      }
      const ap = U.e('outBack', U.prog(L.singEnd - 0.05, L.singEnd + 0.3, t));
      this.arrow.style.opacity = U.sat(ap * 1.5).toFixed(3);
      this.arrow.style.transform = `translateX(${((1 - ap) * -10).toFixed(1)}px)`;
    }
  }

  // ---- a light chat: last line sent, this line arrives, the next one starts being typed
  class ChatScene extends Scene {
    constructor(host, mode, L, opts) {
      super(host, mode, L, opts);
      this.el.classList.add('paper');
      this.el.style.background = '#f6f6f3';
      const W = this.ctx.W, H = this.ctx.H, u = this.u;
      const prev = opts.prev, next = opts.next;
      this.el.style.setProperty('--chf', Math.max(15, u * 2.6).toFixed(1) + 'px');
      this.el.style.setProperty('--chw', Math.min(W * 0.8, u * 52).toFixed(0) + 'px');
      const col = U.el('div', 'ch-col', this.el);
      const tm = U.el('div', 'ch-time', col);
      const d = new Date();
      tm.textContent = 'Today ' + (O.hour12 ? U.fmtClockAmPm(d).toUpperCase() : U.fmtClock(d));
      if (prev) {
        const b = U.el('div', 'ch-b out', col);
        b.textContent = prev.words.filter((w) => !w.adlib).map((w) => w.bare).join(' ');
        this.prevB = b;
      }
      this.inB = U.el('div', 'ch-b in', col);
      this.dots = U.el('div', 'ch-dots', this.inB);
      this.dots.innerHTML = '<i></i><i></i><i></i>';
      this.spans = L.words.map((w) => U.el('span', '', this.inB, (w.bare || w.raw) + ' '));
      this.spans.forEach((s) => { s.style.display = 'none'; });
      // the compose field stays empty: the next line is never typed here ahead of its time
      this.input = U.el('div', 'ch-input', col);
      this.caret = U.el('i', '', this.input);
      U.el('span', '', this.input, 'Message');
      void next;
    }
    update(t, dt) {
      const L = this.L;
      const arrived = t >= L.t - 0.05;
      this.dots.style.display = arrived ? 'none' : '';
      this.spans.forEach((s, i) => {
        s.style.display = arrived ? '' : 'none';
        const on = t >= L.words[i].t - 0.03;
        if (s._on !== on) { s._on = on; s.classList.toggle('on', on); }
      });
      const ep = U.e('outBack', U.prog(L.t - 0.7, L.t - 0.35, t));
      this.inB.style.transform = `scale(${(0.85 + 0.15 * ep).toFixed(3)})`;
      this.inB.style.transformOrigin = '0 100%';
      this.inB.style.opacity = U.sat(ep * 1.4).toFixed(3);
      const blink = Math.floor(this.age * 1.9) % 2 === 0;
      if (blink !== this._blink) { this._blink = blink; this.caret.style.opacity = blink ? '1' : '0'; }
    }
  }

  // ---- the line typed big, then its end selected with the edit menu under it
  class EditMenuScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.el.classList.add('paper');
      const W = this.ctx.W, u = this.u;
      this.type = new TypeScene(this.el, mode, L, {});
      this.type.el.style.background = 'transparent';
      const fs = parseFloat(this.type.row.style.fontSize);
      this.type.row.style.fontWeight = '700';
      this.el.style.setProperty('--mnd', Math.max(12, fs * 0.36).toFixed(1) + 'px');
      this.el.style.setProperty('--mnf', Math.max(12, u * 1.8).toFixed(1) + 'px');
      this.date = U.el('div', 'mn-date', this.el, U.fmtDateLong(new Date()));
      this.bar = U.el('div', 'mn-bar', this.el);
      this.bar.innerHTML = '<span>Cut</span><span>Copy</span><span>Paste</span><span class="del">Delete</span><span>AutoFill</span>';
      this.bar.style.opacity = '0';
      void W;
    }
    update(t, dt, A) {
      const L = this.L, ws = L.words;
      this.type.update(t, dt, A);
      // keep the selection on the last two words once they're in
      const T = this.type, k0 = Math.max(0, ws.length - 2);
      const selOn = t >= ws[ws.length - 1].t + Math.min(0.4, ws[ws.length - 1].dur);
      if (selOn) {
        const a = T.words[k0].el, b = T.words[ws.length - 1].el;
        if (a.offsetWidth && b.offsetWidth) {
          const S2 = T.sel;
          const x = a.offsetLeft, y = a.offsetTop, w = b.offsetLeft + b.offsetWidth - a.offsetLeft, h = a.offsetHeight;
          S2.x = U.damp(S2.x, x, 18, dt); S2.y = U.damp(S2.y, y, 18, dt); S2.w = U.damp(S2.w, w, 18, dt); S2.h = h; S2.op = 1;
          const pad = 0.04 * parseFloat(T.row.style.fontSize);
          T.hl.style.transform = `translate(${(S2.x - pad).toFixed(1)}px,${(S2.y + h * 0.08).toFixed(1)}px)`;
          T.hl.style.width = (S2.w + pad * 2).toFixed(1) + 'px';
          T.hl.style.opacity = '1';
          T.ha.style.transform = `translate(${(S2.x - pad - 2).toFixed(1)}px,${(S2.y + h * 0.08).toFixed(1)}px)`;
          T.hb.style.transform = `translate(${(S2.x + S2.w + pad - 2).toFixed(1)}px,${(S2.y + h * 0.08).toFixed(1)}px)`;
          T.ha.style.opacity = T.hb.style.opacity = '1';
        }
      }
      const rw = T.row, rowR = { left: rw.offsetLeft, top: rw.offsetTop - rw.offsetHeight / 2, right: rw.offsetLeft + rw.offsetWidth, bottom: rw.offsetTop + rw.offsetHeight / 2 };
      const mp = U.e('outBack', U.prog(ws[ws.length - 1].t + 0.35, ws[ws.length - 1].t + 0.65, t));
      this.bar.style.opacity = U.sat(mp * 1.5).toFixed(3);
      const bw = this.bar.offsetWidth;
      const sx = rowR.left + T.sel.x + T.sel.w / 2;
      this.bar.style.transform = `translate(${U.clamp(sx - bw / 2, 10, this.ctx.W - bw - 10).toFixed(1)}px,${(rowR.bottom + this.u * 2.2).toFixed(1)}px) scale(${(0.9 + 0.1 * mp).toFixed(3)})`;
      const dw = this.date.offsetWidth;
      this.date.style.transform = `translate(${(rowR.right - dw).toFixed(1)}px,${(rowR.top - this.u * 3.6).toFixed(1)}px)`;
      this.date.style.opacity = U.prog(L.t, L.t + 0.4, t).toFixed(3);
    }
  }

  // ---- one word, huge, white on black, cropped by the screen
  class GiantScene extends Scene {
    constructor(host, mode, L) {
      super(host, mode, L);
      this.dark = true;
      this.el.classList.add('ink');
      const u = this.u, r = this.r;
      const kw = L.words[L.key];
      this.kw = kw;
      const txt = (kw.bare || kw.raw).toLowerCase().replace(/[^\p{L}\p{N}'’]/gu, '');
      this.el.style.setProperty('--gtf', (u * (txt.length <= 4 ? 34 : txt.length <= 7 ? 26 : 19)).toFixed(1) + 'px');
      this.el.style.setProperty('--gts', (u * 2.4).toFixed(1) + 'px');
      this.word = U.el('div', 'gt-word', this.el, txt);
      this.rot = r.range(-16, -8);
      this.off = { x: r.range(-0.06, 0.06), y: r.range(-0.04, 0.06) };
      const rest = L.words.filter((w) => w !== kw && !w.adlib);
      this.small = rest.length ? U.el('div', 'gt-small', this.el, '') : null;
      this.rest = rest;
    }
    update(t, dt, A) {
      const W = this.ctx.W, H = this.ctx.H, kw = this.kw;
      const p = U.prog(kw.t - 0.03, kw.t + 0.22, t);
      const e = U.e('outExpo', p);
      this.word.style.opacity = U.sat(p * 3).toFixed(3);
      this.word.style.filter = p < 1 ? `blur(${((1 - e) * 14).toFixed(1)}px)` : 'none';
      this.word.style.transform = `translate(-50%,-50%) translate(${(this.off.x * W).toFixed(1)}px,${(this.off.y * H).toFixed(1)}px) rotate(${this.rot.toFixed(1)}deg) scale(${(1.35 - 0.35 * e + A.pulse * 0.02).toFixed(4)})`;
      if (this.small) {
        const s = this.rest.filter((w) => t >= w.t - 0.03).map((w) => w.bare.toLowerCase()).join(' ');
        if (s !== this._s) { this._s = s; this.small.textContent = s; }
      }
    }
  }

  // ================================================================ classic scenes (from the first version) — rare cameos now
  const Ed = O.Ed, K = Ed.K;
  const T2S = (s) => [...s].join(' ');
  const CL = { fam: 'classic', classic: true };
  Ed.add('type', TypeScene, Object.assign({ w: 1, max: 16, cams: ['still', 'push', 'track'] }, CL));
  Ed.add('finder', FinderScene, Object.assign({ w: 0.8, needTrig: true, trig: T2S(TRIG.finder), max: 12 }, CL));
  Ed.add('rings', RingsScene, Object.assign({ w: 0.7, trig: T2S(TRIG.rings), min: 2, max: 9, cams: ['still', 'push'] }, CL));
  Ed.add('camera', CameraScene, Object.assign({ w: 0.8, needTrig: true, trig: T2S(TRIG.camera) }, CL));
  Ed.add('canvas', CanvasScene, Object.assign({ w: 0.7, needTrig: true, trig: T2S(TRIG.canvas), max: 12 }, CL));
  Ed.add('emoji', EmojiScene, Object.assign({ w: 0.9, fit: (L) => L.words.some((w) => EMOJI[w.w]), max: 10, cams: ['still', 'push'] }, CL));
  Ed.add('message', ChatScene, Object.assign({ w: 0.8, needTrig: true, trig: T2S(TRIG.message) }, CL));
  Ed.add('editmenu', EditMenuScene, Object.assign({ w: 0.8, trig: T2S(TRIG.editmenu), max: 12, cams: ['still', 'push'] }, CL));
  Ed.add('giant', GiantScene, Object.assign({ w: 0.8, max: 5, adlib: true, cams: ['still', 'push', 'hand'] }, CL));

  O.css('editlyric-engine', `
.m-ed .ed-host { position: absolute; inset: 0; }
.m-ed .ed-shot { position: absolute; inset: 0; overflow: hidden; backface-visibility: hidden; }
.m-ed .ed-over { position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0; }
.m-ed .ed-bar { position: absolute; left: 0; right: 0; height: 0; background: #000; z-index: 7; pointer-events: none; }
`);

  // ================================================================ transitions (d = seconds, w = weight per mood)
  const TR = {
    cut: { d: 0, w: { neutral: 2.2, sad: 0.7, tender: 0.7, hype: 2.2, angry: 2.2 } },
    dissolve: { d: 0.42, w: { neutral: 0.8, sad: 2.2, tender: 2.2, hype: 0.2, angry: 0.2 } },
    dip: { d: 0.5, w: { neutral: 0.5, sad: 1.5, tender: 1.1, hype: 0.3, angry: 0.4 } },
    flash: { d: 0.32, w: { neutral: 0.8, sad: 0.2, tender: 0.3, hype: 2, angry: 1.6 } },
    whip: { d: 0.3, w: { neutral: 1.2, sad: 0.4, tender: 0.5, hype: 1.8, angry: 1.6 } },
    zoomin: { d: 0.42, w: { neutral: 1, sad: 0.6, tender: 0.7, hype: 1.6, angry: 1.4 } },
    zoomout: { d: 0.45, w: { neutral: 0.8, sad: 0.8, tender: 0.9, hype: 0.9, angry: 0.8 } },
    iris: { d: 0.5, w: { neutral: 0.8, sad: 0.6, tender: 1, hype: 0.6, angry: 0.4 } },
    wipe: { d: 0.42, w: { neutral: 0.9, sad: 0.5, tender: 0.6, hype: 0.9, angry: 0.9 } },
    push: { d: 0.42, w: { neutral: 1, sad: 0.6, tender: 0.8, hype: 1, angry: 0.9 } },
    slide: { d: 0.46, w: { neutral: 0.8, sad: 0.6, tender: 0.8, hype: 0.6, angry: 0.5 } },
    spin: { d: 0.42, w: { neutral: 0.5, sad: 0.2, tender: 0.2, hype: 1.4, angry: 1.2 } },
    flip: { d: 0.55, w: { neutral: 0.6, sad: 0.4, tender: 0.6, hype: 0.6, angry: 0.4 } },
    blinds: { d: 0.5, w: { neutral: 0.6, sad: 0.6, tender: 0.6, hype: 0.6, angry: 0.6 } },
    shutter: { d: 0.36, w: { neutral: 0.7, sad: 0.4, tender: 0.4, hype: 1, angry: 1 } },
    glitch: { d: 0.2, w: { neutral: 0.7, sad: 0.2, tender: 0.1, hype: 1.6, angry: 2 } },
    rgb: { d: 0.26, w: { neutral: 0.5, sad: 0.2, tender: 0.1, hype: 1.4, angry: 1.6 } },
    lens: { d: 0.5, w: { neutral: 0.6, sad: 0.5, tender: 0.6, hype: 0.8, angry: 0.6 } },
  };
  const CAMS = ['still', 'push', 'pull', 'drift', 'dutch', 'hand', 'rise', 'track'];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  let UID = 0;

  // ================================================================ the mode
  class Editlyric {
    constructor(ctx) {
      this.ctx = ctx;
      this.uid = ++UID;
      const R = (this.root = ctx.root);
      R.classList.add('m-ed');
      this.host = U.el('div', 'ed-host', R);
      this.over = U.el('div', 'ed-over', R);
      this.bars = [U.el('div', 'ed-bar', R), U.el('div', 'ed-bar', R)];
      this.bars[0].style.top = '0'; this.bars[1].style.bottom = '0';
      this.cap = U.el('div', 'ed-cap', R);
      this.gl = U.el('div', 'ed-glitch', R);
      for (let i = 0; i < 7; i++) U.el('i', '', this.gl);
      // filters: directional motion blur (whips) and an RGB split
      const svg = U.svg('svg', { width: 0, height: 0, style: 'position:absolute;width:0;height:0' }, R);
      const defs = U.svg('defs', {}, svg);
      this.fid = { x: 'edmbx' + this.uid, y: 'edmby' + this.uid, rgb: 'edrgb' + this.uid };
      this.mb = {};
      ['x', 'y'].forEach((ax) => {
        const f = U.svg('filter', { id: this.fid[ax], x: '-5%', y: '-5%', width: '110%', height: '110%', 'color-interpolation-filters': 'sRGB' }, defs);
        this.mb[ax] = U.svg('feGaussianBlur', { stdDeviation: '0 0' }, f);
      });
      const fr = U.svg('filter', { id: this.fid.rgb, x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' }, defs);
      U.svg('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', result: 'r' }, fr);
      this.rgbR = U.svg('feOffset', { in: 'r', dx: 0, result: 'r2' }, fr);
      U.svg('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: '0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0', result: 'gb' }, fr);
      this.rgbB = U.svg('feOffset', { in: 'gb', dx: 0, result: 'gb2' }, fr);
      U.svg('feBlend', { in: 'r2', in2: 'gb2', mode: 'screen' }, fr);
      this.cur = null;
      this.trans = null;
      this.plan = [];
      this.key = '';
      this.glT = 9;
      this.t = 0;
      this.salt = 0;
      this.trackKey = null;
      K.warm(['grain', 'paper', 'cork', 'wood', 'brick', 'concrete', 'asphalt', 'felt']);
      // the 3D room on the GPU, unless it's switched off or the machine can't do WebGL2
      this.d3 = null;
      if (O.E3 && O.E3.Director && ctx.opts.room3d !== false && O.glSupported()) {
        try { this.d3 = new O.E3.Director(ctx, this); if (!this.d3.ok) this.d3 = null; }
        catch (e) { ctx.stage.reportError(e); this.d3 = null; }
        if (this.d3) R.classList.add('m-ed3');
      }
    }
    onTrack(tr) {
      const key = tr ? String(tr.id || tr.title || '') : '';
      if (key !== this.trackKey) { this.trackKey = key; this.salt = this.playCount(key); }
      this.clear();
      if (this.d3) this.d3.onTrack(tr, this.salt);
    }
    onArt() { if (this.d3) this.d3.onArt(); }
    // every play of a song gets its own edit
    playCount(key) {
      if (O.params.has('edseed')) return +O.params.get('edseed') || 0;
      const m = (O._edPlays = O._edPlays || LS.get('oley.ed.plays', {}));
      m[key] = (m[key] || 0) + 1;
      const ks = Object.keys(m);
      if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete m[k];
      LS.set('oley.ed.plays', m);
      return m[key];
    }
    history() { return (O._edHist = O._edHist || LS.get('oley.ed.hist', [])); }
    remember(name) {
      const h = this.history();
      h.push(name);
      if (h.length > 40) h.splice(0, h.length - 40);
      LS.set('oley.ed.hist', h);
    }

    // ---------------------------------------------------------------- planning
    onLyrics(tl) {
      if (this.d3) { this.d3.onLyrics(tl); return; }
      this.plan = this.planSong(tl);
      this.clear();
    }
    planSong(tl) {
      const r = U.rng((tl.seed ^ U.hash('edplan:' + this.salt)) >>> 0);
      const opts = this.ctx.opts;
      const classicOn = opts.classic !== false;
      const all = Object.keys(Ed.scenes).filter((n) => !Ed.scenes[n].meta.inter);
      const inters = Object.keys(Ed.scenes).filter((n) => Ed.scenes[n].meta.inter);
      const hist = this.history().slice(-24);
      const force = O.params.get('edscene'), list = (O.params.get('edlist') || '').split(',').filter((n) => Ed.scenes[n]);
      const last = {}, uses = {}, varUse = {}, trUse = {};
      let prev = { fam: '', cam: '', tr: '', pres: '', type: '' }, accentPrev = false, interPrev = '';
      const pickInter = () => {
        const c = inters.filter((n) => n !== interPrev);
        interPrev = c.length ? r.pick(c) : inters[0];
        return interPrev;
      };
      const plan = tl.lines.map((L, i) => {
        const ws = L.words.map((w) => w.w);
        const n = K.words(L).length;
        const fits = all.filter((name) => {
          const m = Ed.scenes[name].meta;
          if (m.classic && (!classicOn || uses[name])) return false;
          if (n < m.min || n > m.max) return false;
          try { if (m.fit && !m.fit(L)) return false; } catch (e) { return false; }
          return true;
        });
        const cool = U.clamp(Math.floor(fits.length * 0.62), 2, 18);
        const cands = [];
        for (const name of fits) {
          const m = Ed.scenes[name].meta;
          let s = m.w;
          let hits = 0;
          for (const w of ws) if (m.trigSet.has(w)) hits++;
          if (hits) s *= 1 + 2.4 * Math.min(2, hits);
          else if (m.needTrig) s *= 0.12;
          s *= m.moods[L.mood] || 1;
          if (L.adlib && m.adlib) s *= 2;
          if (last[name] != null && i - last[name] < cool) s = 0;
          s *= Math.pow(m.classic ? 0.04 : 0.3, uses[name] || 0);
          if (m.fam === prev.fam) s *= 0.3;
          if (m.classic) s *= 0.15;
          const hi = hist.lastIndexOf(name);
          if (hi >= 0 && i < 14) s *= 0.25 + 0.6 * (1 - (hist.length - hi) / hist.length);
          if (s > 0) cands.push({ v: name, w: Math.pow(s, 1.35) });
        }
        let pick = r.weighted(cands);
        if (!pick) {
          // everything is cooling down (tiny pools): take whatever was used longest ago
          const pool = fits.length ? fits : ['type'];
          pick = pool.slice().sort((a, b) => (last[a] == null ? -1 : last[a]) - (last[b] == null ? -1 : last[b]))[0];
        }
        if (list.length) pick = list[i % list.length];
        else if (force && Ed.scenes[force]) pick = force;
        const m = Ed.scenes[pick].meta;
        last[pick] = i;
        uses[pick] = (uses[pick] || 0) + 1;
        // variant, phone presentation, camera move, transition
        if (varUse[pick] == null) varUse[pick] = r.int(0, 97);
        let v = varUse[pick]++ % Math.max(1, m.vars);
        if (O.params.has('edv')) v = +O.params.get('edv') % Math.max(1, m.vars);
        let pres = '';
        if (m.fam === 'phone') {
          pres = r.weighted(['float', 'desk', 'close'].filter((p) => p !== prev.pres).map((p) => ({ v: p, w: { float: 0.9, desk: 0.75, close: 1.6 }[p] })));
          if (O.params.get('edpres')) pres = O.params.get('edpres');
        }
        let cams = (m.cams || ['still']).filter((c) => c !== prev.cam);
        if (!cams.length) cams = m.cams || ['still'];
        let cam = r.pick(cams);
        if (m.fam === 'phone' && pres !== 'close' && (m.cams || []).includes('track')) cam = 'track';
        if (O.params.get('edcam')) cam = O.params.get('edcam');
        const mood = L.mood || 'neutral';
        let tr = r.weighted(Object.keys(TR).filter((k) => k !== prev.tr).map((k) => ({ v: k, w: (TR[k].w[mood] || 1) * Math.pow(0.55, trUse[k] || 0) })));
        if (i === 0) tr = 'dissolve';
        if (O.params.get('edtr')) tr = O.params.get('edtr');
        trUse[tr] = (trUse[tr] || 0) + 1;
        const accent = !accentPrev && (mood === 'hype' || mood === 'angry' ? r.chance(0.6) : r.chance(0.3));
        accentPrev = accent;
        const P = { type: pick, v, pres, cam, tr, dir: r.int(0, 3), accent, dark: r.chance(0.3) };
        // a long instrumental break after this line gets its own interlude
        const nx = tl.lines[i + 1];
        const gap = nx ? nx.t - L.singEnd : tl.duration ? tl.duration - L.singEnd : 0;
        if (gap > 4.2 && inters.length) P.inter = { at: L.singEnd + 1.1, type: pickInter(), tr: r.pick(['dissolve', 'zoomout', 'dip', 'blinds']) };
        prev = { fam: m.fam, cam, tr, pres: pres || prev.pres, type: pick };
        return P;
      });
      this.preInter = inters.length ? pickInter() : null;
      return plan;
    }

    // ---------------------------------------------------------------- shots
    clear() {
      if (this.trans) this.endTrans();
      if (this.cur) this.kill(this.cur);
      this.cur = null;
      this.key = '';
    }
    kill(sh) {
      try { sh.s.destroy(); } catch (e) {}
      U.remove(sh.wrap);
    }
    slotAt(t) {
      const tl = this.ctx.tl, ls = tl.lines;
      if (!ls.length) return { key: 'none' + Math.floor(t / 10), inter: this.preInter || 'np' };
      let li = O.lineAt(tl, t + 0.02);
      const nx = ls[li + 1];
      if (nx) {
        const P = this.plan[li + 1] || {};
        const lead = Math.min(0.24, (TR[P.tr] ? TR[P.tr].d : 0) * 0.55);
        const cur = ls[li];
        if (t >= nx.t - lead && (!cur || t >= cur.singEnd + 0.06)) li++;
      }
      if (li < 0) return { key: 'pre', inter: this.preInter || 'np', end: ls[0].t };
      const P = this.plan[li] || {};
      if (P.inter && t >= P.inter.at) return { key: 'i' + li, inter: P.inter.type, li, end: ls[li + 1] ? ls[li + 1].t : (tl.duration || t + 30), tr: P.inter.tr };
      return { key: 'l' + li, li };
    }
    make(slot) {
      const tl = this.ctx.tl;
      const wrap = U.el('div', 'ed-shot', this.host);
      const cam = U.el('div', 'ed-cam', wrap);
      let L, P, Cls;
      if (slot.inter) {
        const t0 = this.t;
        L = { i: -1, t: t0, end: slot.end || t0 + 10, singEnd: t0, words: [], key: 0, mood: tl.mood, text: '' };
        P = { type: slot.inter, cam: 'push', v: U.hash(slot.key + this.salt) % 7 };
        Cls = Ed.scenes[slot.inter];
      } else {
        L = tl.lines[slot.li];
        P = this.plan[slot.li] || { type: 'type', cam: 'still', tr: 'cut' };
        Cls = Ed.scenes[P.type] || Ed.scenes.type;
      }
      const o = { v: P.v, pres: P.pres, salt: this.salt, dark: P.dark, prev: tl.lines[slot.li - 1], next: tl.lines[slot.li + 1] };
      let s;
      try { s = new Cls(cam, this, L, o); } catch (e) {
        this.ctx.stage.reportError(e);
        cam.innerHTML = '';
        s = new Ed.scenes.type(cam, this, L.words.length ? L : this.ctx.tl.lines[0] || L, {});
      }
      if (!slot.inter) this.remember(P.type);
      const sh = { s, wrap, cam, L, P, slot, n: U.noise1(U.hash(slot.key + ':' + this.salt)), dir: (U.hash(slot.key) % 2) ? 1 : -1,
        sz: O.sp(1), sx: O.sp(0), sy: O.sp(0), ft: null };
      // the tracking camera starts on its subject
      return sh;
    }
    frame(t, dt, A, jumped) {
      this.t = t;
      if (this.d3) {
        try { this.d3.frame(t, dt, A, jumped); } catch (e) { this.ctx.stage.reportError(e); }
        this.caption3(t);
        return;
      }
      const slot = this.slotAt(t);
      if (jumped && slot.key !== this.key) this.clear();
      if (slot.key !== this.key) {
        const old = this.cur;
        const nw = this.make(slot);
        let how = 'cut';
        if (old && !jumped) how = slot.inter ? slot.tr || 'dissolve' : (nw.P.tr || 'cut');
        if (old && old.slot.inter && !slot.inter && how === 'cut') how = 'dissolve';
        if (this.trans) this.endTrans();
        if (old) {
          if (how === 'cut' || !TR[how] || !TR[how].d) this.kill(old);
          else this.startTrans(how, old, nw);
        }
        this.cur = nw;
        this.key = slot.key;
      }
      const tick = (sh) => {
        sh.s.age += dt;
        try { if (sh.s.tick) sh.s.tick(t, dt, A); else sh.s.update(t, dt, A); } catch (e) { this.ctx.stage.reportError(e); }
      };
      if (this.cur) { tick(this.cur); this.camera(this.cur, t, dt, A); }
      if (this.trans) {
        const T = this.trans;
        if (T.a) tick(T.a);
        T.age += dt;
        const k = U.sat(T.age / T.d);
        this.applyTrans(T, k);
        if (k >= 1) this.endTrans();
      }
      this.glitchBars(dt);
      this.accent(t, dt);
      this.drawCaption(t);
    }

    // ---------------------------------------------------------------- camera
    camera(sh, t, dt, A) {
      const W = this.ctx.W, H = this.ctx.H, s = sh.s, P = sh.P, L = sh.L;
      const cam = P.cam || 'still', a = s.age, n = sh.n;
      const life = L && L.end > L.t ? U.prog(L.t - 0.25, L.end, t) : U.sat(a / 8);
      let f = null;
      if (cam === 'track' || cam === 'push' || cam === 'pull') { try { f = s.focus ? s.focus() : null; } catch (e) { f = null; } }
      let Z = 1, x = 0, y = 0, rot = 0, px = W / 2, py = H / 2;
      let tf = '';
      if (cam === 'track') {
        if (f && isFinite(f.x) && isFinite(f.y)) sh.ft = f;
        const ff = sh.ft || { x: W / 2, y: H / 2 };
        O.spring(sh.sz, sh.ft ? 1.42 : 1.06, 4.2, dt);
        let Zt = sh.sz.x * (1 + A.pulse * 0.005);
        const kw = L && L.words[L.key];
        if (kw && P.accent) { const kp = t - kw.t; if (kp >= 0 && kp < 0.6) Zt *= 1 + 0.045 * Math.exp(-kp * 8); }
        const tx = U.clamp(W * 0.5 - Zt * ff.x, W - Zt * W, 0), ty = U.clamp(H * 0.5 - Zt * ff.y, H - Zt * H, 0);
        if (!sh.trInit) { sh.sx.x = (W - W * sh.sz.x) / 2; sh.sy.x = (H - H * sh.sz.x) / 2; sh.trInit = true; }
        O.spring(sh.sx, tx, 5.5, dt); O.spring(sh.sy, ty, 5.5, dt);
        sh.cam.style.transformOrigin = '0 0';
        tf = `translate(${sh.sx.x.toFixed(2)}px,${sh.sy.x.toFixed(2)}px) scale(${Zt.toFixed(4)})`;
        const v = Math.hypot(sh.sx.v, sh.sy.v);
        const bl = v > 900 ? Math.min(4, (v - 900) / 700) : 0;
        if (Math.abs(bl - (sh.bl || 0)) > 0.15) { sh.bl = bl; sh.cam.style.filter = bl > 0.2 ? `blur(${bl.toFixed(1)}px)` : ''; }
      } else {
        if (f && isFinite(f.x)) { px = U.clamp(f.x, W * 0.15, W * 0.85); py = U.clamp(f.y, H * 0.15, H * 0.85); }
        switch (cam) {
          case 'push': Z = 1 + 0.075 * U.e('inOutSine', life); break;
          case 'pull': Z = 1.11 - 0.095 * U.e('inOutSine', life); break;
          case 'drift': Z = 1.06; x = (life - 0.5) * W * 0.034 * sh.dir; y = (life - 0.5) * H * 0.01; break;
          case 'dutch': Z = 1.07 + 0.03 * life; rot = sh.dir * U.lerp(-2.4, -0.9, U.e('outCubic', life)); break;
          case 'hand': Z = 1.045; x = n(a * 0.9) * W * 0.006; y = n(a * 0.8 + 3) * H * 0.008; rot = n(a * 0.6 + 7) * 0.45; break;
          case 'rise': Z = 1.06; y = (0.5 - life) * H * 0.03; break;
          default: Z = 1.006; x = n(a * 0.25 + 1) * W * 0.0016; y = n(a * 0.22 + 2) * H * 0.0016;
        }
        const kw = L && L.words[L.key];
        if (kw && P.accent) { const kp = t - kw.t; if (kp >= 0 && kp < 0.6) Z *= 1 + 0.05 * Math.exp(-kp * 8); }
        Z *= 1 + A.pulse * 0.005;
        const need = 1 + 2 * Math.max(Math.abs(x) / W, Math.abs(y) / H) + (Math.abs(rot) * Math.PI / 180) * 1.9;
        if (Z < need) Z = need;
        sh.cam.style.transformOrigin = `${px.toFixed(1)}px ${py.toFixed(1)}px`;
        tf = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${Z.toFixed(4)})`;
      }
      if (tf !== sh.tf) { sh.tf = tf; sh.cam.style.transform = tf; }
    }
    // a white pop / RGB kick on the key word of hype lines
    accent(t, dt) {
      const sh = this.cur;
      let v = 0;
      if (sh && sh.L && sh.P.accent && !this.trans && (sh.L.mood === 'hype' || sh.L.mood === 'angry')) {
        const kw = sh.L.words[sh.L.key];
        const kp = t - kw.t;
        if (kp >= 0 && kp < 0.14) v = 0.34 * (1 - kp / 0.14);
      }
      if (!this.trans || !/flash|dip/.test(this.trans.name)) {
        if (v > 0) { this.over.style.background = '#fff'; this.over.style.opacity = v.toFixed(3); this._ov = true; }
        else if (this._ov) { this.over.style.opacity = '0'; this._ov = false; }
      }
      void dt;
    }

    // ---------------------------------------------------------------- transitions
    startTrans(name, a, b) {
      const W = this.ctx.W, H = this.ctx.H;
      let f = null;
      try { f = a.s.focus ? a.s.focus() : null; } catch (e) { f = null; }
      const fx = f && isFinite(f.x) ? U.clamp(f.x, 0, W) : W / 2, fy = f && isFinite(f.y) ? U.clamp(f.y, 0, H) : H / 2;
      const top = /zoomin|spin|lens/.test(name) ? 'a' : 'b';
      a.wrap.style.zIndex = top === 'a' ? '2' : '1';
      b.wrap.style.zIndex = top === 'a' ? '1' : '2';
      this.trans = { name, a, b, age: 0, d: TR[name].d, dir: (b.P && b.P.dir) || 0, fx, fy, fo: `${fx.toFixed(0)}px ${fy.toFixed(0)}px` };
      this.applyTrans(this.trans, 0);
    }
    endTrans() {
      const T = this.trans;
      if (!T) return;
      this.trans = null;
      if (T.a) this.kill(T.a);
      const eb = T.b.wrap.style;
      ['transform', 'filter', 'clipPath', 'opacity', 'boxShadow', 'transformOrigin', 'zIndex', 'webkitMaskImage', 'maskImage'].forEach((k) => { eb[k] = ''; });
      this.over.style.opacity = '0';
      this.bars[0].style.height = this.bars[1].style.height = '0';
      this.mb.x.setAttribute('stdDeviation', '0 0'); this.mb.y.setAttribute('stdDeviation', '0 0');
    }
    applyTrans(T, k) {
      const ea = T.a.wrap.style, eb = T.b.wrap.style, W = this.ctx.W, H = this.ctx.H, dir = T.dir;
      const E = (n, x) => U.e(n, x == null ? k : x);
      const ax = dir < 2 ? 'x' : 'y', sg = dir % 2 ? 1 : -1;
      const mv = (p) => (ax === 'x' ? `translateX(${p.toFixed(2)}%)` : `translateY(${p.toFixed(2)}%)`);
      const ov = (col, v) => { this.over.style.background = col; this.over.style.opacity = U.sat(v).toFixed(3); };
      switch (T.name) {
        case 'dissolve': eb.opacity = E('inOutSine').toFixed(3); break;
        case 'dip': { const v = k < 0.5 ? k * 2 : (1 - k) * 2; ov('#000', E('inOutSine', v)); eb.opacity = k < 0.5 ? '0' : '1'; break; }
        case 'flash': { const v = k < 0.22 ? k / 0.22 : 1 - E('outCubic', (k - 0.22) / 0.78); ov('#fff', v * 0.95); eb.opacity = k < 0.2 ? '0' : '1'; break; }
        case 'whip': {
          const q = E('inOutCubic'), bl = Math.sin(Math.PI * k) * (ax === 'x' ? W : H) * 0.03;
          this.mb[ax].setAttribute('stdDeviation', ax === 'x' ? `${bl.toFixed(1)} 0` : `0 ${bl.toFixed(1)}`);
          ea.filter = eb.filter = `url(#${this.fid[ax]})`;
          ea.transform = mv(sg * q * 100); eb.transform = mv(sg * (q - 1) * 100);
          break;
        }
        case 'push': { const q = E('inOutCubic'); ea.transform = mv(sg * q * 100); eb.transform = mv(sg * (q - 1) * 100); ea.filter = `brightness(${(1 - 0.35 * q).toFixed(3)})`; break; }
        case 'zoomin': {
          const q = E('inCubic');
          ea.transformOrigin = T.fo; ea.transform = `scale(${(1 + 2.6 * q).toFixed(4)})`; ea.opacity = (1 - q * q).toFixed(3); ea.filter = `blur(${(q * 14).toFixed(1)}px)`;
          eb.transform = `scale(${(1.14 - 0.14 * E('outCubic')).toFixed(4)})`;
          break;
        }
        case 'zoomout': {
          const q = E('outCubic');
          eb.transform = `scale(${(1.5 - 0.5 * q).toFixed(4)})`; eb.opacity = U.sat(k * 2.2).toFixed(3); eb.filter = k < 1 ? `blur(${((1 - q) * 16).toFixed(1)}px)` : '';
          ea.transform = `scale(${(1 - 0.18 * q).toFixed(4)})`; ea.filter = `brightness(${(1 - 0.5 * q).toFixed(3)})`;
          break;
        }
        case 'iris': { const q = E('inOutCubic'), R = Math.hypot(W, H); eb.clipPath = `circle(${(q * R).toFixed(1)}px at ${T.fx.toFixed(0)}px ${T.fy.toFixed(0)}px)`; break; }
        case 'wipe': { const p = ((1 - E('inOutCubic')) * 100).toFixed(2); eb.clipPath = ['inset(0 0 0 ' + p + '%)', 'inset(0 ' + p + '% 0 0)', 'inset(' + p + '% 0 0 0)', 'inset(0 0 ' + p + '% 0)'][dir]; break; }
        case 'slide': {
          const q = E('outCubic');
          eb.transform = `translateY(${((1 - q) * 100).toFixed(2)}%)`; eb.boxShadow = '0 -2vmin 7vmin rgba(0,0,0,0.4)';
          ea.transform = `scale(${(1 - 0.06 * q).toFixed(4)})`; ea.filter = `brightness(${(1 - 0.45 * q).toFixed(3)})`;
          break;
        }
        case 'spin': {
          const q = E('inCubic'), q2 = E('outCubic');
          ea.transformOrigin = T.fo; ea.transform = `rotate(${(q * 75 * sg).toFixed(2)}deg) scale(${(1 + q * 1.3).toFixed(3)})`; ea.opacity = (1 - q).toFixed(3); ea.filter = `blur(${(q * 12).toFixed(1)}px)`;
          eb.transform = `rotate(${((1 - q2) * -14 * sg).toFixed(2)}deg) scale(${(1.2 - 0.2 * q2).toFixed(3)})`;
          break;
        }
        case 'flip': {
          const axis = dir % 2 ? 'Y' : 'X';
          if (k < 0.5) { const q = E('inCubic', k * 2); ea.transform = `perspective(1600px) rotate${axis}(${(q * 90).toFixed(2)}deg)`; ea.filter = `brightness(${(1 - 0.6 * q).toFixed(3)})`; eb.opacity = '0'; }
          else { const q = E('outCubic', (k - 0.5) * 2); ea.opacity = '0'; eb.opacity = '1'; eb.transform = `perspective(1600px) rotate${axis}(${((1 - q) * -90).toFixed(2)}deg)`; eb.filter = `brightness(${(0.4 + 0.6 * q).toFixed(3)})`; }
          break;
        }
        case 'blinds': {
          const q = E('inOutCubic'), N = 11, sz = (dir % 2 ? W : H) / N, a = (q * sz).toFixed(1);
          const g = `repeating-linear-gradient(${dir % 2 ? 90 : 0}deg, #000 0px, #000 ${a}px, transparent ${a}px, transparent ${sz.toFixed(1)}px)`;
          eb.webkitMaskImage = g; eb.maskImage = g;
          break;
        }
        case 'shutter': {
          const v = k < 0.5 ? E('inCubic', k * 2) : 1 - E('outCubic', (k - 0.5) * 2);
          this.bars[0].style.height = this.bars[1].style.height = (v * 50.5).toFixed(2) + '%';
          eb.opacity = k < 0.5 ? '0' : '1';
          break;
        }
        case 'glitch': {
          const j = Math.floor(T.age * 60) % 3;
          if (k < 0.62) { ea.transform = `translateX(${[-1.4, 1.8, -0.7][j]}%)`; ea.clipPath = `inset(${[0, 18, 6][j]}% 0 ${[30, 4, 12][j]}% 0)`; eb.opacity = '0'; }
          else { ea.opacity = '0'; eb.opacity = '1'; eb.transform = `translateX(${[0.9, -0.6, 0][j]}%)`; }
          this.glT = 0;
          break;
        }
        case 'rgb': {
          const sp = Math.sin(Math.PI * k) * W * 0.014;
          this.rgbR.setAttribute('dx', (-sp).toFixed(1)); this.rgbB.setAttribute('dx', sp.toFixed(1));
          const f = `url(#${this.fid.rgb})`;
          if (k < 0.5) { ea.filter = f; ea.transform = `translateX(${(Math.sin(T.age * 90) * sp * 0.25).toFixed(1)}px)`; eb.opacity = '0'; }
          else { ea.opacity = '0'; eb.opacity = '1'; eb.filter = f; }
          break;
        }
        case 'lens': {
          const q = E('inExpo');
          ea.transformOrigin = T.fo; ea.transform = `scale(${(1 + q * 7).toFixed(3)})`; ea.filter = `blur(${(q * 10).toFixed(1)}px)`; ea.opacity = (1 - U.prog(0.72, 1, k)).toFixed(3);
          eb.opacity = U.prog(0.55, 1, k).toFixed(3);
          break;
        }
        default: eb.opacity = '1';
      }
    }
    glitchBars(dt) {
      if (this.glT < 0.2) {
        this.glT += dt;
        this.gl.style.display = '';
        const bars = this.gl.children;
        for (let k = 0; k < bars.length; k++) {
          const b = bars[k];
          b.style.top = (Math.random() * 100).toFixed(1) + '%';
          b.style.width = (20 + Math.random() * 80).toFixed(0) + '%';
          b.style.left = (Math.random() * 30).toFixed(0) + '%';
          b.style.height = (0.4 + Math.random() * 2.6).toFixed(1) + 'vh';
        }
      } else if (this.gl.style.display !== 'none') this.gl.style.display = 'none';
    }
    drawCaption(t) {
      const on = this.ctx.opts.caption !== false;
      const sh = this.cur;
      let s = '';
      if (on && sh && sh.L && sh.L.words.length && sh.s.caption !== false) {
        const cw = O.wordAt(sh.L, t);
        s = sh.L.words.slice(0, cw + 1).map((w) => w.bare.toLowerCase()).join(' ');
      }
      if (s !== this._cap) { this._cap = s; this.cap.textContent = s; }
      const dark = sh ? !!sh.s.dark : false;
      if (dark !== this._capDark) { this._capDark = dark; this.cap.classList.toggle('light', dark); }
    }
    onResize() { if (!this.d3) this.clear(); }
    caption3(t) {
      let s = '';
      if (this.ctx.opts.caption !== false) {
        const tl = this.ctx.tl, li = O.lineAt(tl, t + 0.02), L = tl.lines[li];
        if (L && L.words.length && t < (L.singEnd || L.end) + 0.6) { const cw = O.wordAt(L, t); if (cw >= 0) s = L.words.slice(0, cw + 1).map((w) => w.bare.toLowerCase()).join(' '); }
      }
      if (s !== this._cap) { this._cap = s; this.cap.textContent = s; }
    }
    destroy() { this.clear(); if (this.d3) this.d3.destroy(); }
  }
  O.registerMode('editlyric', Editlyric, { label: 'Editlyric', glow: false });
})();
