/* Oley settings window */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, P = O.params;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const MODES = [
    { k: 'auto', n: 'Auto', d: 'Picks a mode that fits each song’s mood.' },
    { k: 'constellation', n: 'Constellation', d: 'Each word becomes a star over the blurred cover; the key word blooms.' },
    { k: 'source', n: 'Source', d: 'The song typed as code, filmed in macro with a real lens: focus pulls, phone cards, a lighter flame.' },
    { k: 'orbit', n: 'Orbit', d: 'The cover hangs over a real-looking Earth, ringed by a spectrum that moves with the beat.' },
    { k: 'stack', n: 'Stack', d: 'One big word at a time on a silky gradient, rolling like a picker wheel.' },
    { k: 'nebula', n: 'Nebula', d: 'Big words cascade through a deep-space nebula while comets streak past.' },
    { k: 'messages', n: 'Messages', d: 'The song as a text thread: typing dots, bubbles, map cards, places.' },
    { k: 'editlyric', n: 'Editlyric', d: 'Every line becomes its own scene: phones, a desktop, real objects (neon, a typewriter, a departure board, a receipt…) and moving type. 45+ scenes that don’t repeat.' },
    { k: 'foundry', n: 'Foundry', d: 'Every line cast in metal, live on your graphics card: letters traced from the typeface and extruded with a polished bevel, satin or brushed faces with mirror edges, lit by a little photo studio with the album cover in the softbox and a glossy floor. The song directs the camera shot by shot, words form as they are sung, lines hold in an exploded view with callouts and then blow apart as the camera flies to the next.' },
    { k: 'ascii', n: 'ASCII', d: 'The song drawn in characters, a new scene every verse: the cover cut-out as code (cloth in wind, code rain, a binary scanner, spaced-out 3D prints, a spinning donut or cube) and 120 3D places picked by what the verse is about (flowers, space, cars, cities, oceans, landscapes), with the lyric emoji popping in.' },
    { k: 'voxel', n: 'Voxel', d: 'The song as a world made of cubes, a new place every verse: a floating island at sunset, a city street at dusk, a checkerboard path through the night, a meadow with a hedge heart, a ringed planet, a gold vault, a neon tunnel, and the album cover rebuilt as a voxel statue or a pixel mural. The words are built from blocks that fly together on each syllable and shatter when the line ends.' },
    { k: 'shadow', n: 'Shadowplay', d: 'A silhouette lyric video: flat figures (the cover\'s own cut-out) on black, white, red or a sunset, condensed capitals word by word, one accent colour, and every line its own shot, joined by camera moves on the words: diving into a figure, pulling back out of the sun, whip pans, rolls, flash frames, glass you fly through.' },
    { k: 'warp', n: 'Warp', d: 'Cut like a phone-made lyric edit: heavy type that bends (a wave that melts it, an arch, a fisheye, a cylinder, tipped back and extruded in 3D) over neon hearts and light rays, or typed into phone UI (a message bubble, a keyboard with the emoji repeated, a glowing pill, a file card, a weather card, a text selection), joined on the words by glitches, mosaics, diamond wipes, card flips and zoom punches.' },
    { k: 'glass', n: 'Glass', d: 'A polished app ad: it opens on a phone working out what\'s playing and landing on the real cover, title and artist, then runs the lyrics like a music app over the blurred cover (or rolling round a drum), broken up by moments of UI per line: a search with a pointer clicking, a social post, a call pill, a notebook where a word burns, a torn-paper iris, fire, an eyeball, buttons, a map, a phone with a ring round it.' },
    { k: 'pasteup', n: 'Pasteup', d: 'A moving paste-up: every word or phrase gets its own composition (huge cropped type, script and blackletter, ransom-note letters, the cover cut out in two inks, stickers, tickets, signs, scribbles), handed over with whips, push-throughs and sliding sheets, with real motion blur on the GPU.' },
    { k: 'polyester', n: 'Polyester', d: 'Cut like a fan edit: the cover’s subject cut out, hard cuts on the beat, flashes, slices, zoom blur, chrome titles behind.' },
    { k: 'motion', n: 'Motion', d: 'Code typed on camera: shallow focus, whip pans to every line, punch-ins on key words, a title banner.' },
    { k: 'afterglow', n: 'Afterglow', d: 'Words stacked over the full cover with little icons; in the gaps the camera pulls back to a glowing monitor.' },
  ];
  const NAME = Object.fromEntries(MODES.map((m) => [m.k, m.n]));
  // modes from the custom-modes folder join the list when the app reports them
  let customKey = '';
  function syncCustom() {
    const list = (S && S.custom) || [];
    const key = JSON.stringify(list);
    if (key === customKey) return;
    customKey = key;
    for (let i = MODES.length - 1; i >= 0; i--) if (MODES[i].custom) MODES.splice(i, 1);
    for (const c of list) { MODES.push({ k: c.k, n: c.n, d: c.d, custom: true, thumb: c.thumb }); NAME[c.k] = c.n; }
    buildModes();
    optsFor = '';
    const we = $('#weMode');
    if (we) we.innerHTML = '';
    const ds = $('#displays');
    if (ds) ds._key = '';
  }
  const OPTS = {
    constellation: [['opts.constellation.title', 'Write the artist and title in the sky', 'toggle'], ['clock', 'Lock-screen clock', 'toggle']],
    source: [['opts.source.handle', 'Cursor name', 'text', 'Artist’s first name'], ['opts.source.cards', 'Phone cards (calls, photos, chats)', 'toggle']],
    orbit: [['opts.orbit.planet', 'Planet', 'toggle']],
    stack: [['opts.stack.boxes', 'Highlight boxes on key words', 'toggle']],
    nebula: [['opts.nebula.comets', 'Comets', 'toggle']],
    messages: [['opts.messages.maps', 'Map cards', 'toggle'], ['opts.messages.places', 'Location tags', 'toggle']],
    editlyric: [['opts.editlyric.room3d', '3D room rendered on your graphics card (off: the flat scenes)', 'toggle'], ['opts.editlyric.caption', 'Typewriter caption along the bottom', 'toggle'], ['opts.editlyric.typos', 'Typos that get fixed', 'toggle'], ['opts.editlyric.classic', 'Now and then, one of the classic Editlyric scenes', 'toggle']],
    ascii: [['opts.ascii.flowers', '3D places between covers (flowers, space, cars, cities, oceans, landscapes)', 'toggle'], ['opts.ascii.accent', 'Grey everything but the strongest colour', 'toggle'],
      ['opts.ascii.density', 'Character size', 'select', [['fine', 'Fine'], ['normal', 'Medium'], ['chunky', 'Chunky']]]],
    glass: [['opts.glass.flashes', 'Glitches and flash frames between moments', 'toggle'], ['opts.glass.emoji', 'Emoji (flying through the sky)', 'toggle'], ['opts.glass.cover', 'The album cover (the backdrop, the cards, the record)', 'toggle']],
    warp: [['opts.warp.flashes', 'Glitches, flashes and inverted frames', 'toggle'], ['opts.warp.emoji', 'Emoji (on the keyboard and as objects)', 'toggle'], ['opts.warp.cover', 'The album cover as a scene', 'toggle']],
    shadow: [['opts.shadow.cover', 'Use the cover\'s cut-out as the figure', 'toggle'], ['opts.shadow.flashes', 'Flash frames and inverted frames', 'toggle'], ['opts.shadow.emoji', 'Emoji as solid shapes', 'toggle']],
    voxel: [['opts.voxel.cover', 'Album cover worlds (a voxel statue of the cut-out, a pixel mural)', 'toggle'], ['opts.voxel.particles', 'Petals, sparks and falling gold', 'toggle']],
    foundry: [['opts.foundry.callouts', 'Callouts and corner labels', 'toggle'], ['opts.foundry.blueprint', 'Blueprint view (edges only)', 'toggle']],
    pasteup: [['opts.pasteup.scroll', 'Collage scrolls (a verse builds up as one long poster)', 'select', [['mix', 'Mixed in'], ['only', 'Every verse'], ['off', 'Off']]],
      ['opts.pasteup.cutout', 'Cut the subject out of the cover', 'toggle'], ['opts.pasteup.emoji', 'Printed emoji next to words that have one', 'toggle'],
      ['opts.pasteup.emojiSet', 'Emoji set', 'select', [['fluent', 'Microsoft Fluent 3D'], ['apple', 'Apple']]], ['opts.pasteup.flashes', 'Flash frames between some words', 'toggle']],
    polyester: [['opts.polyester.captions', 'Lyric line along the bottom', 'toggle'], ['opts.polyester.cutout', 'Cut the subject out of the cover', 'toggle'],
      ['player.cutouts', 'Sharper cut-outs with the AI model (downloads 170 MB once)', 'toggle']],
    motion: [['opts.motion.handle', 'Cursor name', 'text', 'Artist’s first name'], ['opts.motion.keywords', 'Key words glow yellow', 'toggle']],
    afterglow: [['opts.afterglow.camera', 'Pull back to the monitor in long gaps', 'toggle'], ['opts.afterglow.dock', 'Player controls along the bottom', 'toggle']],
  };
  const LYR = {
    loading: ['warn', 'Finding lyrics…'], synced: ['ok', 'Synced lyrics'], plain: ['warn', 'Lyrics without timing'],
    none: ['warn', 'No lyrics found'], instrumental: ['ok', 'Instrumental'], error: ['warn', 'Lyrics service unreachable'],
  };

  let S = null;
  let link = null;
  const clock = new O.Clock();

  function get(obj, key) { return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setLocal(obj, key, value) {
    const parts = key.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = value;
  }
  function set(key, value) {
    if (!link) return;
    link.send({ type: 'set', key, value });
    if (S) { setLocal(S.settings, key, value); render(); }
  }
  function act(name, arg) { if (link) link.send({ type: 'action', name, arg }); }
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 4200);
  }

  // ---------------------------------------------------------------- controls
  function bind(root) {
    $$('[data-set]', root).forEach((el) => {
      if (el._bound) return;
      el._bound = true;
      const key = el.dataset.set;
      if (el.classList.contains('seg')) $$('button', el).forEach((b) => { b.onclick = () => set(key, b.dataset.v); });
      else if (el.type === 'checkbox') el.onchange = () => set(key, el.checked);
      else if (el.type === 'range') { el.oninput = outputs; el.onchange = () => set(key, parseFloat(el.value)); }
      else if (el.tagName === 'SELECT') el.onchange = () => set(key, el.dataset.num ? parseFloat(el.value) : el.value);
      else if (el.type === 'color') el.onchange = () => set(key, el.value);
      else if (el.type === 'text') el.onchange = () => set(key, el.value.trim());
    });
    $$('[data-act]', root).forEach((el) => {
      if (el._abound) return;
      el._abound = true;
      el.onclick = (e) => { e.stopPropagation(); act(el.dataset.act); if (el.dataset.act === 'we_install') toast('Installing the wallpaper…'); };
    });
  }
  function sync() {
    $$('[data-set]').forEach((el) => {
      const v = get(S.settings, el.dataset.set);
      if (document.activeElement === el && el.type !== 'checkbox') return;
      if (el.classList.contains('seg')) $$('button', el).forEach((b) => b.classList.toggle('on', String(v) === b.dataset.v));
      else if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'range') el.value = v;
      else if (el.tagName === 'SELECT') el.value = String(v);
      else if (el.type === 'color') el.value = v || '#ff3bd4';
      else if (el.type === 'text') el.value = v || '';
    });
    outputs();
  }
  function outputs() {
    const o = parseFloat($('#offset').value) || 0;
    $('#offsetOut').textContent = (o > 0 ? '+' : '') + o.toFixed(2) + ' s';
    $('#glowIOut').textContent = Math.round((parseFloat($('#glowI').value) || 0) * 100) + '%';
  }

  // ---------------------------------------------------------------- now playing
  let artKey = '';
  function renderNow() {
    const m = S.media || {}, tr = m.track;
    $('#heroTitle').textContent = tr ? tr.title : 'Play something on Spotify';
    $('#heroArtist').textContent = tr ? tr.artist + (tr.album ? ' · ' + tr.album : '') : (m.ok ? 'Oley follows what Spotify is playing.' : (m.error || 'Waiting for Windows’ media controls…'));
    $('#heroApp').textContent = tr ? (/spotify/i.test(tr.app || '') ? 'Spotify' : (tr.app || 'Player').split(/[!\\.]/)[0]) : 'Not playing';
    $('#sideTitle').textContent = tr ? tr.title : 'Nothing playing';
    $('#sideArtist').textContent = tr ? tr.artist : '';
    const art = tr && tr.art ? tr.art : '';
    if (art !== artKey) {
      artKey = art;
      const bg = art ? 'url("' + art + '")' : '';
      $('#heroArt').style.backgroundImage = bg;
      $('#heroBg').style.backgroundImage = bg;
      $('#sideArt').style.backgroundImage = bg;
      if (art) {
        const img = new Image();
        img.onload = () => {
          const p = O.paletteFrom(img);
          document.body.style.setProperty('--accent', U.hex(U.vivid(p.vivid, 0.55, 0.85)));
          document.body.style.setProperty('--accent2', U.hex(U.vivid(p.second, 0.5, 0.85)));
        };
        img.src = art;
      }
    }
    const L = S.lyrics || {};
    const ly = tr ? LYR[L.status] || ['warn', ''] : ['', 'No song'];
    const chip = $('#lyrChip');
    chip.className = 'chip ' + ly[0];
    chip.textContent = ly[1] + (L.status === 'synced' && L.source === 'local' ? ' (your file)' : '');
    $('#ppIcon').innerHTML = m.playing ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>' : '<path d="M8 5v14l11-7z" fill="currentColor"/>';
    if (tr) clock.report(m.pos || 0, !!m.playing, Date.now());
    const c = S.cinema || {};
    $('#cinemaBtn').classList.toggle('on', !!c.on);
    $('#cinemaLbl').textContent = c.on ? 'Cinema is on' : 'Cinema';
  }
  function fmt(s) { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - (tick.l || now)) / 1000);
    tick.l = now;
    clock.tick(dt);
    const tr = S && S.media && S.media.track;
    const dur = tr ? tr.duration || 0 : 0;
    const p = clock.pos;
    $('#barFill').style.width = (dur ? U.sat(p / dur) * 100 : 0).toFixed(2) + '%';
    const a = fmt(p), b = '-' + fmt(dur - p);
    if (tick.a !== a) { tick.a = a; $('#tA').textContent = tr ? a : '0:00'; $('#tB').textContent = tr ? b : '0:00'; }
  }

  // ---------------------------------------------------------------- modes
  function buildModes() {
    const box = $('#modes');
    box.innerHTML = '';
    for (const m of MODES) {
      const el = U.el('div', 'mode', box);
      el.dataset.k = m.k;
      const th = U.el('div', 'th', el);
      if (!m.custom) th.style.backgroundImage = 'url(img/thumbs/' + m.k + '.jpg)';
      else if (m.thumb) th.style.backgroundImage = 'url(custom-modes/' + encodeURIComponent(m.thumb) + ')';
      else { th.classList.add('blank'); th.textContent = m.n; }
      if (m.custom) U.el('span', 'badge-custom', el, 'Yours');
      U.el('div', 'nm', el, m.n);
      U.el('div', 'ds', el, m.d);
      if (m.k !== 'auto') {
        const lab = U.el('label', 'inauto', el);
        const cb = U.el('input', '', lab);
        cb.type = 'checkbox';
        lab.appendChild(document.createTextNode('In Auto'));
        lab.onclick = (e) => e.stopPropagation();
        cb.onchange = () => {
          let en = (S.settings.enabled || []).slice();
          if (cb.checked && !en.includes(m.k)) en.push(m.k);
          if (!cb.checked) en = en.filter((x) => x !== m.k);
          if (!en.length) { cb.checked = true; toast('Auto needs at least one mode.'); return; }
          set('enabled', en);
        };
        el._cb = cb;
      }
      el.onclick = () => set('mode', m.k);
    }
  }
  let optsFor = '';
  function renderModes() {
    const cur = S.settings.mode || 'auto';
    const en = S.settings.enabled || [];
    $$('.mode').forEach((el) => {
      el.classList.toggle('on', el.dataset.k === cur);
      if (el._cb) el._cb.checked = en.includes(el.dataset.k);
    });
    // options for the chosen mode
    if (optsFor !== cur) {
      optsFor = cur;
      const box = $('#modeOpts');
      box.innerHTML = '';
      const list = OPTS[cur];
      if (list) {
        for (const [key, label, kind, ph] of list) {
          const row = U.el('div', 'row', box);
          const l = U.el('div', '', row);
          U.el('div', 't', l, label);
          if (kind === 'toggle') {
            row.insertAdjacentHTML('beforeend', '<label class="sw"><input type="checkbox" data-set="' + key + '"><i></i></label>');
          } else if (kind === 'select') {
            const sel = U.el('select', '', row);
            for (const [v, n] of ph) { const o = U.el('option', '', sel, n); o.value = v; }
            sel.dataset.set = key;
          } else {
            const inp = U.el('input', '', row);
            inp.type = 'text';
            inp.placeholder = ph || '';
            inp.dataset.set = key;
          }
        }
        bind(box);
      }
    }
    // tell the preview which mode to show
    const fr = $('#preview');
    const st = fr && fr.contentWindow && fr.contentWindow.oleyStage;
    if (st && st._want !== cur) {
      st._want = cur;
      st.forcedMode = cur === 'auto' ? null : cur;
      st.autoPick = {};
      st.ensureMode();
    }
  }
  function previewLabel() {
    const fr = $('#preview');
    const st = fr && fr.contentWindow && fr.contentWindow.oleyStage;
    if (!st || !S) return;
    const cur = S.settings.mode || 'auto';
    const shown = NAME[st.modeName] || '';
    $('#pvLabel').textContent = 'Preview · ' + (cur === 'auto' ? 'Auto → ' + shown : shown) + (st.driver ? ' · demo song' : '');
  }

  // ---------------------------------------------------------------- displays & cinema
  function renderDisplays() {
    const box = $('#displays');
    const ds = S.displays || [];
    const key = JSON.stringify(ds.map((d) => [d.id, d.w, d.h, d.on, d.mode, d.primary])) + JSON.stringify(S.settings.cinema && S.settings.cinema.screens);
    if (box._key === key) return;
    box._key = key;
    box.innerHTML = '';
    if (!ds.length) {
      box.innerHTML = '<div class="row"><div><div class="t">Cinema opens on your main screen</div><div class="d">' + (S.shell === 'qt' ? 'No displays reported yet.' : 'Display settings need the full Oley app on Windows.') + '</div></div></div>';
      return;
    }
    ds.forEach((d, i) => {
      const row = U.el('div', 'disp' + (d.on ? ' on' : ''), box);
      U.el('div', 'scr', row, String(i + 1));
      const meta = U.el('div', 'meta', row);
      U.el('b', '', meta, d.name || 'Display ' + (i + 1));
      U.el('span', '', meta, d.w + ' × ' + d.h);
      if (d.primary) U.el('span', 'badge', meta, 'Main');
      const sel = U.el('select', '', row);
      for (const m of MODES) { const o = U.el('option', '', sel, m.n); o.value = m.k; }
      sel.value = d.mode || 'auto';
      sel.onchange = () => setScreens(d.id, { mode: sel.value });
      const sw = U.el('label', 'sw', row);
      sw.innerHTML = '<input type="checkbox"><i></i>';
      const cb = sw.firstChild;
      cb.checked = !!d.on;
      cb.onchange = () => {
        if (!cb.checked && ds.filter((x) => x.on).length <= 1) { cb.checked = true; toast('Cinema needs at least one screen.'); return; }
        setScreens(d.id, { on: cb.checked });
      };
    });
  }
  function setScreens(id, patch) {
    const ds = S.displays || [];
    const cur = {};
    for (const d of ds) cur[d.id] = { on: !!d.on, mode: d.mode || 'auto' };
    cur[id] = Object.assign(cur[id] || {}, patch);
    set('cinema.screens', cur);
    for (const d of ds) if (cur[d.id]) { d.on = cur[d.id].on; d.mode = cur[d.id].mode; }
    renderDisplays();
  }
  function renderCinemaNotes() {
    const c = S.cinema || {};
    const note = $('#hotkeyNote');
    note.textContent = c.hotkey_error ? c.hotkey_error : 'Turns Cinema on and off from anywhere.';
    note.style.color = c.hotkey_error ? '#ffb454' : '';
  }

  // ---------------------------------------------------------------- wallpaper & system
  let weMsgShown = '';
  function renderWE() {
    const we = S.we || {};
    const sel = $('#weMode');
    if (!sel.options.length) for (const m of MODES) { const o = U.el('option', '', sel, m.n); o.value = m.k; }
    if (S.shell !== 'qt') {
      $('#weTitle').textContent = 'Wallpaper Engine';
      $('#weNote').textContent = 'Installing the wallpaper needs the full Oley app on Windows.';
      $('#weBtn').disabled = true;
    } else if (!we.found) {
      $('#weTitle').textContent = 'Wallpaper Engine wasn’t found';
      $('#weNote').textContent = 'It’s looked for in your Steam library folders.';
      $('#weBtn').disabled = true;
    } else {
      $('#weTitle').textContent = we.installed ? (we.current ? 'Installed: “Oley Lyrics”' : 'Installed (an older version)') : 'Found Wallpaper Engine';
      $('#weNote').textContent = we.installed ? 'In Wallpaper Engine: My Wallpapers → Oley Lyrics. The wallpaper follows this app while it runs.' : we.path;
      $('#weBtn').disabled = false;
      $('#weBtn').textContent = we.installed ? (we.current ? 'Reinstall' : 'Update') : 'Install';
    }
    if (we.msg && we.msg !== weMsgShown) { weMsgShown = we.msg; toast(we.msg); }
  }
  function renderSystem() {
    const a = S.audio || {};
    const an = $('#audioNote');
    an.textContent = a.ok ? 'Listening to ' + (a.device || 'your speakers') + '. Nothing is recorded.' : a.error || 'Listens to the PC’s sound output for beats. Nothing is recorded.';
    $('#sysNote').textContent = 'Data folder: ' + (S.data_dir || '');
    $('#ver').textContent = S.version ? 'v' + S.version : '';
    $('#aboutVer').textContent = 'Version ' + (S.version || O.VERSION);
  }

  function render() {
    if (!S) return;
    syncCustom();
    renderNow();
    renderModes();
    renderDisplays();
    renderCinemaNotes();
    renderWE();
    renderSystem();
    sync();
  }

  // ---------------------------------------------------------------- nav
  function nav() {
    const main = $('#main');
    $$('#nav a').forEach((a) => { a.onclick = () => { const s = document.getElementById(a.dataset.go); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    const spy = () => {
      let best = 'now', bd = 1e9;
      for (const s of $$('section')) { const d = Math.abs(s.getBoundingClientRect().top - 80); if (d < bd) { bd = d; best = s.id; } }
      $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.go === best));
    };
    main.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // ---------------------------------------------------------------- welcome tour (js/welcome.js)
  let welcomed = false;
  function welcome(force) {
    if (!O.Welcome || O.Welcome.running()) return;
    if (!force && (welcomed || !S || S.settings.onboarded)) return;
    welcomed = true;
    const m = $('#main');
    if (m) m.scrollTop = 0;
    O.Welcome.start({ modes: MODES.length - 1, onDone: () => { if (S && !S.settings.onboarded) set('onboarded', true); } });
  }

  // ---------------------------------------------------------------- start
  function start() {
    if (O.Brand) O.Brand.mountAll();
    $('#tourAgain').onclick = () => welcome(true);
    buildModes();
    bind(document);
    nav();
    requestAnimationFrame(tick);
    $('#bar').onclick = (e) => {
      const tr = S && S.media && S.media.track;
      if (!tr || !tr.duration) return;
      const r = e.currentTarget.getBoundingClientRect();
      act('seek', U.sat((e.clientX - r.left) / r.width) * tr.duration);
    };
    const fr = $('#preview');
    fr.src = 'view.html?k=' + encodeURIComponent(P.get('k') || '') + '&role=preview&hud=0';
    fr.onload = () => { const st = fr.contentWindow.oleyStage; if (st) st._want = null; render(); };
    setInterval(previewLabel, 700);
    link = new O.Link('settings', '');
    link.on('open', () => $('#offline').classList.remove('on'));
    link.on('close', () => { $('#offline').textContent = 'Oley isn’t running. Start it again to change settings.'; $('#offline').classList.add('on'); });
    const first = () => setTimeout(() => welcome(P.get('welcome') === '1'), 250);
    link.on('hello', (m) => { if (m.state) { const was = S; S = m.state; render(); if (!was) first(); } });
    link.on('state', (m) => { const was = S; S = m.state; render(); if (!was) first(); });
    link.on('clock', (m) => clock.report(m.pos, m.playing, m.at));
    link.on('cmd', (m) => { if (m.cmd === 'close') { try { window.close(); } catch (e) {} } });
    $('#offline').classList.add('on');
    link.connect();
  }
  start();
})();
