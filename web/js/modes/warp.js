/* Oley · Warp: the song cut like a phone-made lyric edit. Each line is its own moment: heavy type that
   bends (a wave that melts it, an arch, a fisheye, a cylinder, tipped back and extruded in 3D) over neon
   hearts, halftone, light rays and a ring of text; or the line typed into phone UI (a message bubble, a
   keyboard with the emoji repeated, a glowing pill, a file card, a weather card, a text selection with a
   spell-check squiggle, a spinner with a caption, label boxes); an emoji with giant letters behind it; the
   album cover with one word at a time. Moments are joined on the words with glitches, a mosaic, a
   diamond wipe, card flips, zoom punches, whip pans and flashes, and the camera's speed smears it all. */
(function () {
  'use strict';
  const O = window.Oley;
  const S = O.Shadow, Wk = O.Warp;
  const CFG = {
    name: 'warp', p: 'wp', cls: 'm-wp', label: 'Warp',
    fonts: ['100px "Oley Black"', '100px "Oley Heavy"', '500 100px "Oley Display"', '700 100px "Oley Display"', '100px "Oley Serif"'],
    lib: Wk.SHOTS, quiet: Wk.QUIET, fallback: ['neonwave', 'crt'],
    schemes: { any: { name: 'any', bg: [0, 0, 0], ink: [255, 255, 255], floor: [255, 255, 255] } },
    schemeDeck: ['any'],
    accents: [[255, 60, 210], [60, 220, 255], [170, 255, 60], [255, 50, 70], [170, 90, 255], [255, 190, 40]],
    types: ['stack3d', 'neonwave', 'curve', 'persp', 'imessage', 'arch', 'keyboard', 'glow', 'file', 'weather', 'select', 'loader', 'labels', 'object', 'bulge', 'cover', 'crt', 'stretch', 'neonwave', 'imessage', 'persp'],
    trans: ['glitch', 'whip', 'zoom', 'pixel', 'diamond', 'flip', 'glitch', 'cut', 'whip', 'roll', 'flash', 'zoom', 'dive', 'pull'],
    post: { bloom: 0.16, glow: 0.14, vig: 0.22, grain: 0.035, contrast: 1.04, sat: 1.06 },
    okType(t, q) {
      switch (t) {
        case 'object': case 'keyboard': return t === 'keyboard' ? q.n <= 9 : !!q.emo && q.n <= 6;
        case 'arch': case 'weather': case 'stretch': return q.kw && q.kw.txt.length <= 10;
        case 'curve': return q.chars <= 30;
        case 'labels': return q.n <= 5 && q.chars <= 30;
        case 'select': return q.chars <= 40;
        case 'cover': return !!(q.s && q.eng && q.eng.img);
        case 'bulge': return q.kw && q.kw.txt.length <= 8;
        case 'glow': return q.n >= 2 && q.n <= 7;
        case 'crt': return q.n <= 5;
        default: return true;
      }
    },
  };
  class Warp extends S.Engine {
    constructor(ctx) { super(ctx, CFG); }
  }
  O.registerMode('warp', Warp, { label: 'Warp', glow: false });
})();
