/* Oley · Shadowplay: the song as a silhouette lyric video. Flat silhouettes (the album cover's own
   cut-out, or figures drawn for Oley) on black, white, red or a sunset; condensed capitals that arrive
   word by word, grey turning white; one accent colour. Every line is its own shot, and the shots are
   joined by camera moves that land on the words: diving into the dark of a figure to come out in the
   next scene, pulling back out of the sun or a moon to reveal where we are, whip pans, rolls, white and
   red flash frames with the picture inverted, glass that cracks and is flown through. The camera's own
   speed smears the frame (zoom, pan and roll blur), with an RGB split and a lens bulge on the rush. */
(function () {
  'use strict';
  const O = window.Oley;
  const S = O.Shadow;
  const CFG = {
    name: 'shadow', p: 'sh', cls: 'm-sh', label: 'Shadowplay', fonts: ['100px "Oley Heavy"'],
    lib: S.SHOTS, quiet: S.QUIET, fallback: ['horizon', 'night'],
    schemes: {
      noir: { name: 'noir', bg: [0, 0, 0], ink: [255, 255, 255], floor: [255, 255, 255] },
      paper: { name: 'paper', bg: [246, 234, 208], ink: [28, 22, 30], floor: [22, 18, 26], acc: [234, 92, 138] },
      red: { name: 'red', bg: [226, 18, 24], ink: [255, 255, 255], floor: [12, 10, 12], acc: [255, 232, 80] },
      white: { name: 'white', bg: [250, 250, 248], ink: [12, 12, 14], floor: [12, 12, 14] },
    },
    schemeDeck: ['noir', 'noir', 'paper', 'red', 'noir', 'white'],
    accents: [[214, 226, 40], [238, 34, 44], [58, 134, 255], [255, 112, 172]],
    types: ['horizon', 'echo', 'sun', 'tunnel', 'heads', 'big', 'night', 'warp', 'heart', 'dial', 'ring', 'sonar', 'hands', 'object'],
    trans: ['dive', 'pull', 'whip', 'roll', 'flash', 'dive', 'cut', 'shatter', 'whip', 'dive', 'pull', 'roll'],
    okType(t, q) {
      switch (t) {
        case 'echo': case 'big': return q.kw && q.kw.txt.length <= 9 && q.n <= 7;
        case 'object': return !!q.emo && q.n <= 6;
        case 'ring': return q.chars >= 8 && q.chars <= 46;
        case 'heart': case 'sonar': case 'hands': case 'tunnel': return q.n <= 6;
        case 'dial': return q.n <= 7;
        default: return true;
      }
    },
  };
  class Shadowplay extends S.Engine { constructor(ctx) { super(ctx, CFG); } }
  O.registerMode('shadow', Shadowplay, { label: 'Shadowplay', glow: false });
})();
