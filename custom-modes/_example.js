/* Example lyrics mode: "Karaoke".
   ---------------------------------------------------------------------------------------------
   Files starting with "_" are ignored. To try this one, copy it to karaoke.js (same folder),
   then open Oley's settings: it shows up under Lyrics modes with a "Yours" badge.
   Full guide: MAKING-MODES.md in the Oley folder.
   --------------------------------------------------------------------------------------------- */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  class Karaoke {
    // ctx: { root, W, H, u, palette, track, tl, artImg, maskImg, settings, opts, quality, dpr, rng(seed) }
    constructor(ctx) {
      this.ctx = ctx;
      this.cv = U.el('canvas', '', ctx.root);
      this.cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      this.g = this.cv.getContext('2d');
      this.glow = 0;
      this.onResize();
    }
    onResize() {
      const d = this.ctx.dpr;
      this.cv.width = Math.round(this.ctx.W * d);
      this.cv.height = Math.round(this.ctx.H * d);
    }
    // a song's lyrics, already timed: tl.lines[i] = { t, end, text, words: [{ t, end, raw, key }], key, mood }
    onLyrics(tl) { this.tl = tl; }

    // called every frame: t = song time in seconds, A = audio { level, bass, mid, high, beat, pulse, bands }
    frame(t, dt, A) {
      const g = this.g, d = this.ctx.dpr, W = this.ctx.W, H = this.ctx.H, p = this.ctx.palette;
      g.setTransform(d, 0, 0, d, 0, 0);

      // background: the cover's two main colours, breathing with the beat
      this.glow = U.damp(this.glow, A.pulse || 0, 10, dt);
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, U.rgba(p.dark, 1));
      bg.addColorStop(0.6, U.rgba(p.vivid, 0.35 + this.glow * 0.15));
      bg.addColorStop(1, U.rgba(p.second, 0.5));
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      const tl = this.tl;
      if (!tl || !tl.lines.length) return;
      const i = O.lineAt(tl, t);
      const size = Math.max(28, this.ctx.u * 5.2);
      g.textAlign = 'left';
      g.textBaseline = 'middle';

      // the line being sung: words light up as they're sung, the key word in the cover's colour
      const L = tl.lines[Math.max(0, i)];
      if (i >= 0) {
        g.font = `700 ${size}px 'Oley Display', 'Oley Sans', sans-serif`;
        const gap = size * 0.28;
        const widths = L.words.map((w) => g.measureText(w.raw).width);
        let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) / 2;
        L.words.forEach((w, k) => {
          const on = O.wordProg(w, t);                // 0..1 through this word
          g.fillStyle = 'rgba(255,255,255,0.28)';
          g.fillText(w.raw, x, H / 2);
          g.save();
          g.beginPath();
          g.rect(x, 0, widths[k] * on, H);              // reveal the sung part
          g.clip();
          g.fillStyle = w.key ? U.hex(U.vivid(p.vivid, 0.5, 1)) : '#fff';
          g.fillText(w.raw, x, H / 2);
          g.restore();
          x += widths[k] + gap;
        });
      }
      // the next line, waiting underneath
      const N = tl.lines[i + 1];
      if (N) {
        g.font = `600 ${size * 0.5}px 'Oley Sans', sans-serif`;
        g.textAlign = 'center';
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fillText(N.text, W / 2, H / 2 + size * 1.25);
      }
    }
    destroy() { U.remove(this.cv); }
  }

  // name (lowercase, unique), the class, and what Settings shows
  O.registerMode('karaoke', Karaoke, { label: 'Karaoke', desc: 'The line being sung lights up word by word, with the next line waiting below.' });
})();
