/* Oley renderer bootstrap: connects a stage to the app (or runs the demo). */
(function () {
  'use strict';
  const O = window.Oley, P = O.params;
  const isFile = location.protocol === 'file:';
  const role = P.get('role') || (isFile ? 'wallpaper' : 'view');
  const screen = P.get('screen') || '';
  document.body.classList.add('role-' + role);
  const NAME = O.Brand ? O.Brand.NAME : 'Oley';
  document.title = role === 'cinema' ? NAME + ' Cinema ' + screen : role === 'window' ? NAME : NAME + ' ' + role;
  // the small credit in the corner (js/brand.js); thumbnails are the only screens without it
  if (role !== 'thumb') {
    if (O.Brand) O.Brand.startCredit();
    else { const s = document.createElement('script'); s.src = 'js/brand.js'; s.onload = () => O.Brand && O.Brand.startCredit(); document.head.appendChild(s); }
  }

  const stage = new O.Stage(document.getElementById('stage'), {
    role, screen, mode: P.get('mode') || null, hud: P.get('hud') !== '0',
  });
  window.oleyStage = stage;
  window.addEventListener('error', (e) => stage.reportError(e.error || e.message));

  // URL overrides (thumbnails, tests, per-window choices)
  const over = {};
  if (P.has('glow')) over.glow = { cinema: P.get('glow') };
  if (P.has('intro')) over.intro = P.get('intro') !== '0';
  if (P.has('clock')) over.clock = P.get('clock') !== '0';
  if (P.has('perf')) over.perf = P.get('perf');
  if (P.has('notch')) over.glow = Object.assign(over.glow || {}, { notch: P.get('notch') === '1' });
  stage.setSettings(over);
  const withOver = (s) => O.mergeSettings(O.mergeSettings(O.DEFAULT_SETTINGS, s || {}), over);

  const startDemo = (start) => { if (!stage.driver) stage.driver = new O.DemoDriver(stage, start || 0); };
  const stopDemo = () => { stage.driver = null; };

  if (P.get('demo') === '1') {
    startDemo(+P.get('start') || 0);
    if (P.get('freeze') === '1') stage.freeze = true;
    return;
  }

  const link = new O.Link(role, screen);
  stage.link = link;
  const solo = new O.Standalone(stage);
  let soloTimer = null;
  let demoTimer = null;

  link.on('open', () => {
    clearTimeout(soloTimer);
    solo.stop();
    stage.setConnected(true);
  });
  link.on('close', () => {
    stage.setConnected(false);
    if (role === 'wallpaper') soloTimer = setTimeout(() => { if (!link.connected && solo.start()) stopDemo(); }, 5000);
  });
  link.on('hello', (m) => {
    if (m.settings) stage.setSettings(withOver(m.settings));
    if (m.mode && !P.get('mode')) { stage.forcedMode = m.mode; stage.ensureMode(); }
  });
  link.on('settings', (m) => stage.setSettings(withOver(m.settings)));
  link.on('track', (m) => {
    if (m.track) { clearTimeout(demoTimer); stopDemo(); }
    stage.setTrack(m.track || null);
    if (!m.track && role === 'preview') demoTimer = setTimeout(() => { if (!stage.track || stage.driver) startDemo(0); }, 900);
  });
  link.on('lyrics', (m) => { if (!stage.driver) stage.setLyrics(m.lyrics); });
  link.on('clock', (m) => { if (!stage.driver) stage.clock.report(m.pos, m.playing, m.at); });
  link.on('audio', (m) => { if (!stage.driver) stage.setAudio(m.a); });
  link.on('mask', (m) => { if (!stage.driver) stage.setMask({ url: m.url, art: m.art }); });
  link.on('cmd', (m) => {
    if (m.screen && m.screen !== screen) return;
    if (m.cmd === 'close') { try { window.close(); } catch (e) {} }
    else if (m.cmd === 'reload') location.reload();
    else if (m.cmd === 'mode') { stage.forcedMode = m.arg || null; stage.autoPick = {}; stage.ensureMode(); }
  });
  link.connect();

  // previews show the demo song when nothing is playing
  if (role === 'preview') demoTimer = setTimeout(() => { if (!stage.track) startDemo(0); }, 1200);
  // a wallpaper with no app and no Wallpaper Engine media integration still shows the clock
  if (role === 'wallpaper') soloTimer = setTimeout(() => { if (!link.connected) solo.start(); }, 6000);

  // ---------------------------------------------------------------- input
  const opened = performance.now();
  if (role === 'cinema') {
    const tell = (e) => {
      if (performance.now() - opened < 1500) return; // the hotkey's own keys are still held
      if (e.type === 'keydown' && /^(Control|Alt|Shift|Meta|AltGraph)$/.test(e.key)) return;
      // a mode can own the scroll wheel over part of the screen (Orbit's song revolver): that doesn't close Cinema
      if (e.type === 'wheel' && e.target && e.target.closest && e.target.closest('[data-wheel]')) return;
      link.send({ type: 'input', kind: e.type, key: e.key || '' });
    };
    ['keydown', 'mousedown', 'touchstart'].forEach((ev) => window.addEventListener(ev, tell, true));
    window.addEventListener('wheel', tell, { passive: true, capture: true });
  }
  if (role === 'window') {
    let hideT = 0;
    const show = () => {
      document.body.classList.remove('hide-cursor');
      clearTimeout(hideT);
      hideT = setTimeout(() => document.body.classList.add('hide-cursor'), 2500);
    };
    window.addEventListener('mousemove', show);
    show();
    window.addEventListener('dblclick', () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
      } else if (e.key === ' ') {
        link.send({ type: 'action', name: 'play_pause' });
        e.preventDefault();
      } else if (e.key === 'm' || e.key === 'M') {
        const list = O.MODE_ORDER.filter((x) => O.modes[x]);
        const i = list.indexOf(stage.modeName);
        stage.forcedMode = list[(i + 1) % list.length];
        stage.ensureMode();
      } else if (e.key === 'ArrowRight') link.send({ type: 'action', name: 'next' });
      else if (e.key === 'ArrowLeft') link.send({ type: 'action', name: 'prev' });
    });
  }
})();
