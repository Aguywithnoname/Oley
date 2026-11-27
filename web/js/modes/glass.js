/* Oley · Glass: the song as a polished app ad. It opens on the phone working out what's playing and
   landing on the real cover, title and artist; dives into the cover; and runs the lyrics like a music
   app (lines scrolling over the blurred cover, or rolling round a drum), broken up by moments of UI
   that each carry a line: a search with track cards and a pointer, frosted typing, a social post, a
   curved stage, a search bar and a record, a call pill, a notebook where a word burns, a torn-paper
   iris, fire, an eyeball, ghost type, an ink blot, buttons, a map, a phone, a sky, a logo. Joined by
   soft focus dissolves, torn-paper irises, barcode wipes, zooms and the odd glitch. */
(function () {
  'use strict';
  const O = window.Oley;
  const S = O.Shadow, Gk = O.Glass;
  const CFG = {
    name: 'glass', p: 'gl', cls: 'm-wp', label: 'Glass',
    fonts: ['500 100px "Oley Display"', '700 100px "Oley Display"', '700 100px "Oley Round"', 'italic 400 100px "Oley Serif"', '700 100px "Oley Serif"', '100px "Oley Black"'],
    lib: Gk.SHOTS, quiet: Gk.QUIET, fallback: ['lyrics', 'logo'], intro: 'listen', repeat: Gk.LYRIC,
    schemes: { any: { name: 'any', bg: [0, 0, 0], ink: [255, 255, 255], floor: [255, 255, 255] } },
    schemeDeck: ['any'],
    accents: [[252, 82, 10], [134, 52, 210], [20, 110, 255], [40, 200, 110], [255, 60, 120]],
    types: ['search', 'frost', 'post', 'stage', 'searchbar', 'call', 'notebook', 'iris', 'fire', 'eye', 'ghost', 'ink', 'buttons', 'map', 'phone', 'sky', 'logo'],
    trans: ['blur', 'blur', 'iris', 'bars', 'zoom', 'whip', 'blur', 'pixel', 'glitch', 'dive', 'flip', 'pull', 'blur', 'cut'],
    post: { bloom: 0.1, glow: 0.08, vig: 0.2, grain: 0.022, contrast: 1.02, sat: 1.04 },
    // the lyrics come in runs of a few lines, with a moment of UI or two between runs
    pickType(s, i, st, ok, R) {
      if (s.quiet) return null;
      if (st.run > 0) { st.run--; s.run = st.id; return st.rt; }
      if (st.ui > 0) { st.ui--; return null; }
      st.id = (st.id || 0) + 1;
      st.rt = R.ch(0.62) ? 'lyrics' : 'drum';
      st.run = R.i(1, 2);
      st.ui = R.ch(0.7) ? 2 : 1;
      s.run = st.id;
      return st.rt;
    },
    pairTrans(A, B, R) {
      if (A.type === B.type && Gk.LYRIC.includes(A.type)) return 'cont';
      if (A.type === 'listen') return 'dive';
      if (Gk.LYRIC.includes(B.type) && R() < 0.5) return 'blur';
      return null;
    },
    okType(t, q) {
      const kl = q.kw ? q.kw.txt.length : 0;
      switch (t) {
        case 'call': return q.chars <= 42;
        case 'eye': return q.chars <= 34;
        case 'fire': case 'iris': return kl <= 9;
        case 'ink': return kl <= 10 && q.n >= 2;
        case 'buttons': return q.n <= 8;
        case 'post': return q.chars <= 90;
        default: return true;
      }
    },
  };
  class Glass extends S.Engine { constructor(ctx) { super(ctx, CFG); } }
  O.registerMode('glass', Glass, { label: 'Glass', glow: false });
})();
