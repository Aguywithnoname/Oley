/* Oley first-run welcome and guided tour.
   Hello (the app sits blurred, the mark focuses in) → a short greeting → a tour where the page stays
   blurred except the one control being explained, with a small arrow pointing at it → "All set", and the
   whole app comes into focus. Every animation runs off W.now(), so a recording can step it frame by frame. */
(function () {
  'use strict';
  const O = window.Oley;
  const W = {};
  W.now = () => performance.now() / 1000;
  W.manual = false;                       // true: the caller calls W.tick() (recordings)

  const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const outC = (t) => 1 - Math.pow(1 - sat(t), 3);
  const outX = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * sat(t)));
  const inOut = (t) => { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const approach = (v, to, k, dt) => v + (to - v) * (1 - Math.exp(-k * dt));
  const $ = (s, r) => (r || document).querySelector(s);

  // ------------------------------------------------------------------ the tour
  function firstRow(sel) {
    return () => {
      const els = Array.from(document.querySelectorAll(sel));
      if (!els.length) return null;
      const top = els[0].getBoundingClientRect().top;
      return els.filter((e) => Math.abs(e.getBoundingClientRect().top - top) < 4).slice(0, 4);
    };
  }
  const STEPS = [
    { el: '#heroCard', pad: 6, t: 'This is what’s playing', d: 'Oley follows Spotify by itself. Play a song and the lyrics are found and timed for you.' },
    { el: '#cinemaBtn', adv: true, t: 'Click this to fill your screen with lyrics', d: 'That’s Cinema. <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd> turns it on and off from anywhere; any key or click closes it.' },
    { el: '#windowBtn', adv: true, t: 'Click this for lyrics in a window', d: 'Move it, resize it, keep it next to your work. Press <kbd>F</kbd> inside it for full screen.' },
    { el: '#previewCard', pad: 6, t: 'Watch the look here', d: 'The preview plays the lyrics mode you pick, live, with whatever you’re listening to.' },
    { el: firstRow('#modes .mode'), adv: true, t: 'Click a mode to change how the words look', d: 'Auto picks one that fits each song’s mood. Untick “In Auto” to keep a mode out of the mix.' },
    { el: '#glowRow', adv: true, t: 'Click here to turn the glow on or off', d: 'A soft light around the edges of your screen, coloured by the cover and pulsing with the music.' },
    { el: '#nav', pad: 6, prefer: 'right', t: 'Everything else is in here', d: 'Screens, Wallpaper Engine, starting with Windows, and About, where you can take this tour again.' },
  ];

  // ------------------------------------------------------------------ DOM
  const ICON_CODE = '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/></svg>';
  const ICON_SPARK = '<svg viewBox="0 0 24 24"><path d="M12 3c.6 4.6 1.9 6 6.5 6.6-4.6.6-5.9 2-6.5 6.6-.6-4.6-1.9-6-6.5-6.6C10.1 9 11.4 7.6 12 3zM19 15.5c.25 1.8.75 2.3 2.5 2.5-1.75.2-2.25.7-2.5 2.5-.25-1.8-.75-2.3-2.5-2.5 1.75-.2 2.25-.7 2.5-2.5z"/></svg>';
  function build(opt) {
    const root = document.createElement('div');
    root.className = 'wl';
    const n = opt.modes || 17;
    const hello = 'Hello.'.split('').map((c, i) => '<span data-fx="' + (1.05 + i * 0.075).toFixed(3) + ',0.95,20,0.18,14">' + c + '</span>').join('');
    root.innerHTML =
      '<div class="wl-veil"></div><div class="wl-orbs"><i></i><i></i><i></i></div>' +
      '<div class="wl-ring"></div>' +
      '<svg class="wl-arrow" viewBox="0 0 34 46"><path d="M17 43C13 33 21 24 17 6"/><path d="M9 13l8-9 8 9"/></svg>' +
      '<div class="wl-tip"><div class="wl-step"><span class="wl-n"></span><span class="wl-dots">' + STEPS.map(() => '<i></i>').join('') + '</span></div>' +
      '<div class="wl-tt"></div><div class="wl-td"></div>' +
      '<div class="wl-nav"><button class="wl-skip">Skip tour</button><span class="sp"></span><button class="wl-back">Back</button><button class="wl-next">Next</button></div></div>' +
      '<div class="wl-hello">' +
      '  <div data-fx="0.2,1.35,36,0.34,0"><div class="wl-mark" data-brand="logo"></div></div>' +
      '  <div class="wl-hi">' + hello + '</div>' +
      '  <div class="wl-sub" data-fx="1.7,0.9,14,0,8">Welcome to Oley: lyrics for whatever’s playing, drawn ' + n + ' different ways.</div>' +
      '  <div class="wl-card" data-fx="2.15,0.95,18,0.03,16">' +
      '    <div class="wl-row"><div class="wl-ic a">' + ICON_CODE + '</div><div><b>Open source, made by nxrute</b><span>Free for everyone. All of the code is right there in the Oley folder, ready to read.</span></div></div>' +
      '    <div class="wl-row"><div class="wl-ic b">' + ICON_SPARK + '</div><div><b>Add your own lyrics modes</b><span>Ask your AI, like Claude, to make a new mode or change one. Or edit the code yourself; <code>MAKING-MODES.md</code> shows how.</span></div></div>' +
      '  </div>' +
      '  <div class="wl-btns" data-fx="2.6,0.8,10,0,8"><button class="wl-go">Show me around</button><button class="wl-later">Skip</button></div>' +
      '  <div class="wl-foot" data-fx="3.0,0.8,6,0,0"><span data-brand="credit"></span> · open source (GPL-3.0)</div>' +
      '</div>' +
      '<div class="wl-done" style="display:none">' +
      '  <div data-fx="0.1,0.9,22,0.25,0"><svg class="wl-check" viewBox="0 0 84 84"><defs><linearGradient id="wlG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa34f"/><stop offset=".5" stop-color="#ff3f8e"/><stop offset="1" stop-color="#7a45ff"/></linearGradient></defs>' +
      '    <circle cx="42" cy="42" r="38" stroke="url(#wlG)" stroke-width="4.5" stroke-dasharray="239" stroke-dashoffset="239" transform="rotate(-90 42 42)"/><path d="M27 43.5l10 10 21-22" stroke="#fff" stroke-width="5.5" stroke-dasharray="46" stroke-dashoffset="46"/></svg></div>' +
      '  <div class="wl-hi" data-fx="0.45,0.95,22,0.06,12">All set.</div>' +
      '  <div class="wl-sub" data-fx="0.9,0.85,12,0,8">You should now be able to operate it.<br>Play a song and enjoy.</div>' +
      '  <div class="wl-small" data-fx="1.2,0.8,8,0,6">You can take this tour again any time, in About.</div>' +
      '  <div class="wl-btns" data-fx="1.45,0.8,8,0,8"><button class="wl-go wl-finish">Start using Oley</button></div>' +
      '</div>';
    document.body.appendChild(root);
    if (O.Brand) O.Brand.mountAll(root);
    const fxOf = (box) => Array.from(box.querySelectorAll('[data-fx]')).map((el) => {
      const [at, dur, b, s, y] = el.dataset.fx.split(',').map(parseFloat);
      return { el, at, dur, b, s, y };
    });
    return {
      root, veil: $('.wl-veil', root), orbs: Array.from(root.querySelectorAll('.wl-orbs i')), orbBox: $('.wl-orbs', root),
      ring: $('.wl-ring', root), arrow: $('.wl-arrow', root), tip: $('.wl-tip', root),
      tipN: $('.wl-n', root), tipDots: Array.from(root.querySelectorAll('.wl-dots i')), tipT: $('.wl-tt', root), tipD: $('.wl-td', root),
      back: $('.wl-back', root), next: $('.wl-next', root),
      hello: $('.wl-hello', root), helloFx: fxOf($('.wl-hello', root)),
      done: $('.wl-done', root), doneFx: fxOf($('.wl-done', root)),
      circle: $('.wl-check circle', root), tick: $('.wl-check path', root),
    };
  }
  function fx(it, p) {
    const q = outX(p);
    const st = it.el.style;
    st.opacity = q.toFixed(3);
    st.filter = q >= 0.999 ? 'none' : 'blur(' + ((1 - q) * it.b).toFixed(2) + 'px)';
    st.transform = 'translateY(' + ((1 - q) * it.y).toFixed(2) + 'px) scale(' + (1 + (1 - q) * it.s).toFixed(4) + ')';
  }
  function fxOut(it, p) {
    const q = outC(p);
    const st = it.el.style;
    st.opacity = (1 - q).toFixed(3);
    st.filter = 'blur(' + (q * 14).toFixed(2) + 'px)';
    st.transform = 'scale(' + (1 - q * 0.035).toFixed(4) + ')';
  }

  // ------------------------------------------------------------------ state
  let S = null;
  const main = () => document.getElementById('main');
  function targetRect(step) {
    let els = typeof step.el === 'function' ? step.el() : document.querySelector(step.el);
    if (!els) return null;
    if (!Array.isArray(els)) els = [els];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const e of els) {
      const r = e.getBoundingClientRect();
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    const p = step.pad == null ? 8 : step.pad;
    const r0 = parseFloat(getComputedStyle(els[0]).borderTopLeftRadius) || 10;
    return { x: x0 - p, y: y0 - p, w: x1 - x0 + 2 * p, h: y1 - y0 + 2 * p, r: Math.min(26, r0 + p), els };
  }
  function scrollFor(step) {
    const m = main();
    const t = targetRect(step);
    if (!m || !t || !m.contains(t.els[0])) return null;
    const mr = m.getBoundingClientRect();
    const room = mr.height - 220;                             // leave space for the caption
    let want = m.scrollTop + (t.y - mr.top) - Math.max(24, (room - t.h) * 0.35);
    if (t.y - mr.top > 40 && t.y + t.h < mr.bottom - 200) return null;   // already comfortable
    want = Math.max(0, Math.min(m.scrollHeight - m.clientHeight, want));
    return Math.abs(want - m.scrollTop) < 4 ? null : { from: m.scrollTop, to: want };
  }

  W.running = () => !!S;
  W.start = function (opt) {
    if (S) return;
    opt = opt || {};
    const t = W.now();
    S = {
      opt, d: build(opt), phase: 'hello', t0: t, last: t, step: -1, shown: -1, swapT: 0, advAt: 0, scroll: null,
      veilB: 0, veilA: 0, hole: null, ring: 0, tipA: 0, tipX: 0, tipY: 0, side: 'below',
    };
    const d = S.d;
    $('.wl-hello .wl-go', d.root).onclick = () => W.tour();
    $('.wl-later', d.root).onclick = () => W.close();
    $('.wl-skip', d.root).onclick = () => W.close();
    d.back.onclick = () => W.back();
    d.next.onclick = () => W.next();
    $('.wl-finish', d.root).onclick = () => W.close();
    S.keys = (e) => {
      if (!S) return;
      if (e.key === 'Escape') { W.close(); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        if (S.phase === 'hello') W.tour(); else if (S.phase === 'tour') W.next(); else if (S.phase === 'done') W.close();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && S.phase === 'tour') { W.back(); e.preventDefault(); }
    };
    S.clicks = (e) => {
      if (!S || S.phase !== 'tour') return;
      const st = STEPS[S.step];
      if (!st || !st.adv) return;
      const tr = targetRect(st);
      if (tr && tr.els.some((el) => el.contains(e.target))) S.advAt = W.now() + 0.7;
    };
    window.addEventListener('keydown', S.keys, true);
    document.addEventListener('click', S.clicks, true);
    const m = main();
    if (m) { S.sb = m.style.scrollBehavior; m.style.scrollBehavior = 'auto'; }
    if (!W.manual) requestAnimationFrame(loop);
  };
  W.tour = function () {
    if (!S || S.phase !== 'hello') return;
    S.phase = 'tour'; S.leaveT = W.now();
    W.go(0);
  };
  W.go = function (i) {
    if (!S) return;
    if (i >= STEPS.length) return W.finish();
    i = Math.max(0, i);
    S.step = i; S.stepT = W.now(); S.advAt = 0;
    const sc = scrollFor(STEPS[i]);
    S.scroll = sc ? Object.assign(sc, { t0: W.now(), dur: 0.75 }) : null;
  };
  W.next = () => S && S.phase === 'tour' && W.go(S.step + 1);
  W.back = () => S && S.phase === 'tour' && S.step > 0 && W.go(S.step - 1);
  W.finish = function () {
    if (!S || S.phase === 'done' || S.phase === 'closing') return;
    S.phase = 'done'; S.t0 = W.now();
    S.d.done.style.display = '';
    S.d.doneFx.forEach((it) => fx(it, 0));
  };
  W.close = function () {
    if (!S || S.phase === 'closing') return;
    S.from = S.phase; S.phase = 'closing'; S.t0 = W.now();
    if (S.opt.onDone) { try { S.opt.onDone(); } catch (e) {} }
  };
  W.tick = function () { if (S) frame(W.now()); };
  function loop() { if (!S) return; frame(W.now()); requestAnimationFrame(loop); }

  // ------------------------------------------------------------------ one frame
  function frame(now) {
    const d = S.d, dt = Math.min(0.1, Math.max(0, now - S.last));
    S.last = now;
    const vw = innerWidth, vh = innerHeight;
    const ph = S.phase, pt = now - S.t0;
    if (S.advAt && now >= S.advAt) { S.advAt = 0; W.next(); }

    // scroll the page under the tour
    if (S.scroll) {
      const p = (now - S.scroll.t0) / S.scroll.dur;
      const m = main();
      if (m) m.scrollTop = S.scroll.from + (S.scroll.to - S.scroll.from) * inOut(p);
      if (p >= 1) S.scroll = null;
    }

    // the veil: how blurred and dark the app is
    const wantB = ph === 'hello' ? 26 : ph === 'tour' ? 8 : ph === 'done' ? 24 : 0;
    const wantA = ph === 'hello' ? 0.5 : ph === 'tour' ? 0.4 : ph === 'done' ? 0.5 : 0;
    const k = ph === 'closing' ? 3.2 : 5;
    S.veilB = approach(S.veilB, wantB, ph === 'hello' ? 6 : k, dt);
    S.veilA = approach(S.veilA, wantA, ph === 'hello' ? 7 : k, dt);
    d.veil.style.backdropFilter = d.veil.style.webkitBackdropFilter = S.veilB < 0.15 ? 'none' : 'blur(' + S.veilB.toFixed(2) + 'px) saturate(' + (1 + S.veilB / 100).toFixed(3) + ')';
    d.veil.style.background = 'rgba(8,7,14,' + S.veilA.toFixed(3) + ')';
    d.veil.style.pointerEvents = ph === 'closing' ? 'none' : 'auto';

    // colour drifting behind the hello and the finish
    const orbOn = ph === 'hello' || ph === 'done' ? 1 : 0;
    S.orb = approach(S.orb || 0, orbOn, 2.5, dt);
    d.orbBox.style.opacity = S.orb.toFixed(3);
    d.orbs.forEach((o, i) => {
      const a = now * (0.16 + i * 0.05) + i * 2.1;
      o.style.transform = 'translate(' + (Math.cos(a) * 22 + (i - 1) * 14).toFixed(2) + 'vmax,' + (Math.sin(a * 1.3) * 16).toFixed(2) + 'vmax)';
    });

    // the hole around the control in focus
    let tgt = null;
    if (ph === 'tour') tgt = targetRect(STEPS[S.step]);
    if (!S.hole) S.hole = { x: vw / 2, y: vh / 2, w: 0, h: 0, r: 12 };
    const H = S.hole;
    if (tgt) {
      const kk = 9;
      H.x = approach(H.x, tgt.x, kk, dt); H.y = approach(H.y, tgt.y, kk, dt);
      H.w = approach(H.w, tgt.w, kk, dt); H.h = approach(H.h, tgt.h, kk, dt); H.r = approach(H.r, tgt.r, kk, dt);
    } else {
      const cx = H.x + H.w / 2, cy = H.y + H.h / 2;
      H.w = approach(H.w, 0, 8, dt); H.h = approach(H.h, 0, 8, dt);
      H.x = cx - H.w / 2; H.y = cy - H.h / 2;
    }
    if (H.w > 2 && H.h > 2 && ph !== 'closing') {
      const r = Math.min(H.r, H.w / 2, H.h / 2), x = H.x, y = H.y, w = H.w, h = H.h;
      d.veil.style.clipPath = 'path(evenodd, "M0 0H' + vw + 'V' + vh + 'H0Z M' + (x + r).toFixed(1) + ' ' + y.toFixed(1) + 'H' + (x + w - r).toFixed(1) +
        'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (x + w).toFixed(1) + ' ' + (y + r).toFixed(1) + 'V' + (y + h - r).toFixed(1) +
        'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (x + w - r).toFixed(1) + ' ' + (y + h).toFixed(1) + 'H' + (x + r).toFixed(1) +
        'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x.toFixed(1) + ' ' + (y + h - r).toFixed(1) + 'V' + (y + r).toFixed(1) +
        'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (x + r).toFixed(1) + ' ' + y.toFixed(1) + 'Z")';
    } else d.veil.style.clipPath = 'none';
    S.ring = approach(S.ring, tgt && H.w > 8 ? 1 : 0, 6, dt);
    d.ring.style.opacity = (S.ring * (0.85 + 0.15 * Math.sin(now * 3.2))).toFixed(3);
    d.ring.style.transform = 'translate(' + H.x.toFixed(1) + 'px,' + H.y.toFixed(1) + 'px)';
    d.ring.style.width = H.w.toFixed(1) + 'px';
    d.ring.style.height = H.h.toFixed(1) + 'px';
    d.ring.style.borderRadius = Math.min(H.r, H.w / 2, H.h / 2).toFixed(1) + 'px';

    // the caption and its arrow
    if (ph === 'tour' && S.shown !== S.step) {
      S.tipA = approach(S.tipA, 0, 18, dt);
      if (S.tipA < 0.04 || S.shown < 0) {
        const st = STEPS[S.step];
        d.tipN.textContent = (S.step + 1) + ' of ' + STEPS.length;
        d.tipDots.forEach((dot, i) => dot.classList.toggle('on', i === S.step));
        d.tipT.textContent = st.t;
        d.tipD.innerHTML = st.d;
        d.back.style.visibility = S.step ? 'visible' : 'hidden';
        d.next.textContent = S.step === STEPS.length - 1 ? 'Finish' : 'Next';
        S.shown = S.step; S.swapT = now; S.snap = true; S.tipA = 0;
      }
    }
    let tipVis = 0;
    if (ph === 'tour' && S.shown === S.step) tipVis = outX((now - S.swapT - (S.scroll ? 0.55 : 0.28)) / 0.6);
    else if (ph !== 'tour') tipVis = 0;
    S.tipA = ph === 'tour' && S.shown === S.step ? tipVis : approach(S.tipA, 0, 14, dt);
    if (tgt && S.shown === S.step) {
      const tw = d.tip.offsetWidth, th = d.tip.offsetHeight, gap = 58;
      const fits = {
        below: tgt.y + tgt.h + gap + th < vh - 12, above: tgt.y - gap - th > 12,
        right: tgt.x + tgt.w + gap + tw < vw - 12, left: tgt.x - gap - tw > 12,
      };
      const st = STEPS[S.step];
      let side = [st.prefer, 'below', 'above', 'right', 'left'].find((k) => k && fits[k]) || 'over';
      let x, y;
      if (side === 'below' || side === 'above') {
        x = Math.max(14, Math.min(vw - tw - 14, tgt.x + tgt.w / 2 - tw / 2));
        y = side === 'below' ? tgt.y + tgt.h + gap : tgt.y - gap - th;
      } else if (side === 'over') {
        x = Math.max(14, Math.min(vw - tw - 14, tgt.x + tgt.w - tw - 18));
        y = Math.max(14, Math.min(vh - th - 14, tgt.y + tgt.h - th - 18));
      } else {
        y = Math.max(14, Math.min(vh - th - 14, tgt.y + tgt.h / 2 - th / 2));
        x = side === 'right' ? tgt.x + tgt.w + gap : tgt.x - gap - tw;
      }
      if (S.snap) { S.tipX = x; S.tipY = y; S.snap = false; }
      S.tipX = approach(S.tipX, x, 10, dt); S.tipY = approach(S.tipY, y, 10, dt);
      S.side = side;
      // arrow between caption and target, pointing at the target, gently bobbing
      const bob = Math.sin(now * 4.2) * 3.5;
      let ax, ay, rot;
      const cx = Math.max(tgt.x + 18, Math.min(tgt.x + tgt.w - 18, S.tipX + tw / 2));
      const cy = Math.max(tgt.y + 14, Math.min(tgt.y + tgt.h - 14, S.tipY + th / 2));
      if (side === 'below') { ax = cx - 17; ay = tgt.y + tgt.h + 6 + bob; rot = 0; }
      else if (side === 'above') { ax = cx - 17; ay = tgt.y - 52 - bob; rot = 180; }
      else if (side === 'right') { ax = tgt.x + tgt.w + 12 + bob; ay = cy - 23; rot = -90; }
      else if (side === 'left') { ax = tgt.x - 46 - bob; ay = cy - 23; rot = 90; }
      else { ax = -100; ay = -100; rot = 0; }
      d.arrow.style.transform = 'translate(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px) rotate(' + rot + 'deg)';
    }
    const tq = S.tipA;
    d.tip.style.opacity = tq.toFixed(3);
    d.tip.style.filter = tq > 0.995 ? 'none' : 'blur(' + ((1 - tq) * 10).toFixed(2) + 'px)';
    d.tip.style.transform = 'translate(' + S.tipX.toFixed(1) + 'px,' + (S.tipY + (1 - tq) * (S.side === 'above' ? -10 : 10)).toFixed(1) + 'px) scale(' + (0.97 + 0.03 * tq).toFixed(4) + ')';
    d.tip.style.pointerEvents = tq > 0.5 ? 'auto' : 'none';
    d.arrow.style.opacity = (S.side === 'over' ? 0 : tq * 0.95).toFixed(3);

    // hello
    if (d.hello.style.display !== 'none') {
      if (ph === 'hello') d.helloFx.forEach((it) => fx(it, (pt - it.at) / it.dur));
      else {
        const leaveT = S.leaveT != null ? S.leaveT : S.t0;
        const p = (now - leaveT) / 0.55;
        d.helloFx.forEach((it) => fxOut(it, p));
        if (p >= 1) d.hello.style.display = 'none';
      }
      d.hello.style.pointerEvents = ph === 'hello' ? 'auto' : 'none';
    }
    // all set
    if (ph === 'done' || (ph === 'closing' && S.from === 'done')) {
      if (ph === 'done') {
        d.doneFx.forEach((it) => fx(it, (pt - it.at) / it.dur));
        d.circle.setAttribute('stroke-dashoffset', (239 * (1 - inOut((pt - 0.2) / 0.85))).toFixed(1));
        d.tick.setAttribute('stroke-dashoffset', (46 * (1 - outC((pt - 0.85) / 0.45))).toFixed(1));
      } else d.doneFx.forEach((it) => fxOut(it, pt / 0.5));
      d.done.style.pointerEvents = ph === 'done' ? 'auto' : 'none';
    }
    if (ph === 'closing' && pt > 1.6 && S.veilB < 0.3) end();
  }
  function end() {
    if (!S) return;
    window.removeEventListener('keydown', S.keys, true);
    document.removeEventListener('click', S.clicks, true);
    const m = main();
    if (m) m.style.scrollBehavior = S.sb || '';
    S.d.root.remove();
    S = null;
  }
  W.steps = STEPS;
  O.Welcome = W;
})();
