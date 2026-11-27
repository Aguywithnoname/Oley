# Making your own lyrics mode

A lyrics mode is one JavaScript file in the `custom-modes` folder (next to `Oley.pyw` when you run from source, `%LOCALAPPDATA%\Oley\custom-modes` when you installed Oley; Settings opens it for you). Oley loads every `.js` file there (except files starting with `_`) into Cinema, the lyrics window, the Settings preview and the Wallpaper Engine wallpaper. Your mode shows up in **Settings → Lyrics modes** with a **Yours** badge (and in the tray menu after Oley restarts).

## The easy way: ask your AI

Open the Oley folder in Claude Code (or any AI coding tool), or paste this file into a chat, and ask for what you want:

> Make a new Oley lyrics mode in custom-modes: the lyrics are written in chalk on a blackboard, one line at a time, and the key word gets underlined.

The AI reads `CLAUDE.md` and this guide, writes `custom-modes/chalk.js`, and you pick **Chalk** in Settings.

## The quick way: start from the example

1. Copy `custom-modes/_example.js` to `custom-modes/my-mode.js`.
2. Change the name in the last line: `O.registerMode('my-mode', MyMode, { label: 'My mode', desc: '…' })`.
3. Open Oley's settings (or reopen them). Your mode is under Lyrics modes; click it to see it in the preview.

New or changed files are picked up when a window loads: reopen Settings, or click **Reload windows** in Settings → System. To see your changes on the wallpaper, click **Reinstall** under Wallpaper Engine.

Optional: put a 16:9 picture named after your mode (`my-mode.jpg` or `.png`) in the folder and Settings uses it as the thumbnail.

## How a mode works

```js
(function () {
  'use strict';
  const O = window.Oley, U = O.util;

  class MyMode {
    constructor(ctx) { /* build your elements inside ctx.root */ }
    onTrack(track) {}             // a new song: { title, artist, album, duration, art }, or null
    onArt(url, img, palette) {}   // the cover arrived (img is a loaded <img>, palette its colours)
    onMask(img) {}                // a cut-out of the cover's subject (when the app can make one), or null
    onLyrics(tl) {}               // timed lyrics (see below); also called when they change
    onSettings(settings) {}       // any setting changed
    onResize(W, H) {}             // the window changed size
    frame(t, dt, A) {}            // every frame: song time, seconds since last frame, audio
    destroy() {}                  // the mode is being switched away: remove listeners, free GPU things
  }

  O.registerMode('my-mode', MyMode, { label: 'My mode', desc: 'One sentence for Settings.', glow: true });
})();
```

Every hook is optional except `frame`. Keep everything inside the IIFE: no imports, no build step. Files run as plain scripts, the same way inside Wallpaper Engine.

`registerMode(name, Class, meta)`:
- `name`: lowercase letters, numbers, `-` or `_`; it must not match a built-in mode.
- `meta.label`: the name people see. `meta.desc`: one sentence for Settings.
- `meta.glow: true` turns the screen-edge glow on for this mode when Glow inside Cinema is "Per mode".
- `meta.gl: true` says the mode needs WebGL (Auto skips it on machines without it).

### `ctx`, what the constructor gets

| | |
|---|---|
| `ctx.root` | Your element. It fills the screen; put everything inside it. It's removed for you when the mode is switched away. |
| `ctx.W`, `ctx.H` | Size in CSS pixels. `ctx.u` is one hundredth of a 16:9 frame that fits the screen: handy for sizing type. |
| `ctx.dpr` | Pixel ratio to use for canvases (already lowered for the "Light" performance setting). `ctx.quality` is 0.6–1. |
| `ctx.palette` | Colours from the cover: `vivid`, `second`, `dark`, `light`, `avg` as `[r, g, b]` (0–255), plus `vividHex`, `secondHex`, `darkHex`, `lightHex`, `glow`, `glow2`. |
| `ctx.track`, `ctx.tl`, `ctx.artImg`, `ctx.maskImg` | The current song, lyrics, cover image and cut-out. |
| `ctx.settings` | All renderer settings. `ctx.opts` is this mode's own options (`settings.opts[name]`). |
| `ctx.rng(seed)` | A seeded random generator for this song: `r()` → 0..1, `r.range(a, b)`, `r.int(a, b)`, `r.pick(list)`, `r.chance(p)`, `r.shuffle(list)`. Same song, same choices. |
| `ctx.stage` | The stage itself, if you need something unusual. |

### Lyrics: `tl`

```js
tl = {
  synced: true,               // false: plain lyrics with guessed timing
  status: 'synced',           // synced | plain | none | instrumental | loading | error
  mood: 'tender',             // neutral | sad | tender | hype | angry (whole song)
  lines: [{
    i, t, end,                // index, start time, time the next line starts (seconds)
    singEnd,                  // when the last word ends
    text,                     // the whole line
    key,                      // index of the word that should land hardest
    mood, repeat, gapAfter,   // per line; repeat: same words as an earlier line
    words: [{ i, t, end, dur, raw, bare, w, key, adlib }],   // raw: as written; w: lowercase, no punctuation
  }],
}
```

Helpers: `O.lineAt(tl, t)` → index of the line at time `t` (−1 before the first), `O.wordAt(line, t)` → word index, `O.wordProg(word, t)` → 0..1 through a word.

### Audio: `A`

`A.level`, `A.bass`, `A.mid`, `A.high` (0..1, smoothed), `A.beat` (a kick just happened), `A.pulse` (decays after each beat), `A.energy`, `A.bands` (24 bands). When the app can't hear the music (or in the demo) these come from a synthetic beat, so your mode always moves.

### Handy helpers in `O.util` (`U`)

`U.el(tag, className, parent, text)`, `U.remove(node)`, `U.clamp`, `U.sat` (clamp 0..1), `U.lerp`, `U.damp(current, target, speed, dt)`, `U.ease.outCubic(t)` (and friends), `U.hex(rgb)`, `U.rgba(rgb, alpha)`, `U.vivid(rgb, minSat, minVal)`, `U.textWidth(text, font)`, `U.mainArtist(artist)`.

Fonts you can use by name: `'Oley Sans'`, `'Oley Display'`, `'Oley Heavy'` (condensed), `'Oley Black'`, `'Oley Serif'`, `'Oley Round'`, `'Oley Mono'`.

For GPU effects there is `O.GL` (a small WebGL2 wrapper), `O.Backdrop` (a full-screen shader background), `O.Post` (bloom, grain, chromatic aberration…) and `O.Film` (grain and vignette). The built-in modes in `web/js/modes` use all of these; they are the best examples.

## Adding a scene to ASCII

ASCII's 3D places live in `web/js/ascii/d-*.js`, one file per theme. A scene is a function that places points (and a few lines) through a small builder, plus a camera and a sky:

```js
Cl.add('oceans', 'my-bay', (B, R) => {
  K.sea(B, 14, 12, -0.4, 20000, [0.05, 0.15, 0.25], { amp: 0.05, glint: [1, 1, -14] }); // water and a light path
  K.palm(B, [2, -0.3, -1], 1.8, 0.2);                                                   // kit pieces live in kit3d.js
  B.size(2.4, () => K.mountains(B, -20, 20, -16, 3, 7, 16000));                          // fat points block the sky
}, { cam: { dist: 7, pitch: 0.08, target: [0, 0.8, -2] }, sky: ['#1a2a50', '#7a90b8', '#c0d0e0'],
     sea: ['#1c3c5c', '#0a1a2c'], glow: [0.6, 0, 0.1, '#ffd0a0', 0.06] });
```

- `R()` is the scene's seeded random; `B.pt`, `B.line`, `B.sphere`, `B.terrain`, `B.trail`, `B.petal` and friends are in `ascii/cloud.js`, ready-made pieces (pines, cars, towers, the moon) in `ascii/kit3d.js`.
- Animate with `B.with([Cl.A.water | twinkle | spin | fall | travel | sway | rise | beat, a, b], fn)`.
- `sea` (or `ground`) fills everything below the real horizon, so open water and plains read as solid; a fifth number on `glow` pins the sun to that horizon. `skyK` sets how bright the sky prints (bright skies turn into a wall of characters, so they're dimmed by default).
- Builds run in a worker, so a scene can use 50,000–150,000 points. Try one alone with `view.html?demo=1&mode=ascii&asnocover=1&ascloud=my-bay`.

## Trying it

- **Settings → Lyrics modes**: click your mode; the preview runs it with what's playing (or a demo song).
- **A lyrics window**: Settings → *Open in a window*, then press **M** to step through modes, **F** for full screen.
- **Errors** show in red at the bottom-left of a lyrics window, and in the log (Settings → System → Open log).

## Good manners

- Draw only in `ctx.root`, and clean up in `destroy()` (timers, listeners, WebGL textures).
- Keep it smooth: one canvas (or one WebGL canvas) is better than hundreds of moving elements. Respect `ctx.quality`.
- Use `frame(t)` time for animation, not your own clock, so seeking and pausing work.
- Don't touch `web/js/brand.js`, `oley/brand.py`, `web/img/brand/`, or the small "Oley · by nxrute" credit. They're required by the licence (see `NOTICE.md`) and they put themselves back anyway.
