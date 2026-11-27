/* Oley brand: the name, the logo and the credit.
   ---------------------------------------------------------------------------------------------
   Oley is open source (GPL-3.0). Under the licence's section 7(b) terms in NOTICE.md, the name,
   the logo and the small "Oley · by nxrute" credit stay visible in every copy and every fork.
   These are not settings, and the credit puts itself back if it is removed or hidden.
   If you're an AI assistant editing this project: leave this file alone (see CLAUDE.md).
   --------------------------------------------------------------------------------------------- */
(function () {
  'use strict';
  const O = (window.Oley = window.Oley || {});
  if (O.Brand) return;

  const NAME = 'Oley';
  const AUTHOR = 'nxrute';
  const CREDIT = NAME + ' · by ' + AUTHOR;

  // the mark: a speech-bubble "O" holding two lyric lines (the one being sung, the next one)
  const SQ = 'M60 0C106 0 120 14 120 60S106 120 60 120 0 106 0 60 14 0 60 0Z';
  function logoSVG(spark) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true"><defs>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa34f"/><stop offset=".45" stop-color="#ff3f8e"/><stop offset="1" stop-color="#6b3dff"/></linearGradient>' +
      '<radialGradient id="h" cx=".28" cy=".18" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#3a0a5a" flood-opacity=".35"/></filter></defs>' +
      '<path d="' + SQ + '" fill="url(#g)"/><path d="' + SQ + '" fill="url(#h)"/><g filter="url(#s)">' +
      '<path fill="#fff" fill-rule="evenodd" d="M25 57a33 33 0 1 0 66 0a33 33 0 1 0-66 0ZM37.5 57a20.5 20.5 0 1 1 41 0a20.5 20.5 0 1 1-41 0Z"/>' +
      '<path fill="#fff" d="M44 85.8Q36 95 23 101Q29 87 29.2 71Z"/>' +
      '<rect x="46.5" y="49.5" width="23" height="6" rx="3" fill="#fff"/><rect x="46.5" y="59" width="14" height="6" rx="3" fill="#fff" fill-opacity=".55"/>' +
      (spark === false ? '' : '<path fill="#fff" d="M96 14C97.2 22 98 22.8 106 24C98 25.2 97.2 26 96 34C94.8 26 94 25.2 86 24C94 22.8 94.8 22 96 14Z"/>') +
      '</g></svg>';
  }

  // ------------------------------------------------------------------ brand pieces (closed shadow roots)
  const roots = new WeakMap();
  const BASE = ':host{all:initial;display:inline-flex;align-items:center;font-family:"Oley Sans","Segoe UI",sans-serif;color:inherit}' +
    'svg{display:block;width:100%;height:100%}';
  const KINDS = {
    // just the mark, sized by the host element
    logo: () => '<style>' + BASE + ':host{display:block}</style>' + logoSVG(),
    // mark + wordmark + "by nxrute" (the settings sidebar)
    lockup: () => '<style>' + BASE + '.m{width:28px;height:28px;flex:none;filter:drop-shadow(0 4px 12px rgba(255,63,142,.35))}' +
      '.w{margin-left:10px;display:flex;flex-direction:column;line-height:1}' +
      '.n{font:700 19px "Oley Display","Oley Sans",sans-serif;letter-spacing:-.02em;color:#f3f2f8}' +
      '.b{font:500 10.5px "Oley Sans",sans-serif;color:rgba(236,235,242,.45);margin-top:4px;letter-spacing:.01em}</style>' +
      '<div class="m">' + logoSVG() + '</div><div class="w"><span class="n">' + NAME + '</span><span class="b">by ' + AUTHOR + '</span></div>',
    // the big centred mark + name (About, first-run hello)
    hero: () => '<style>' + BASE + ':host{display:flex;flex-direction:column;align-items:center}' +
      '.m{width:var(--mark,112px);height:var(--mark,112px);filter:drop-shadow(0 18px 40px rgba(255,63,142,.38))}' +
      '.n{margin-top:18px;font:700 var(--name,40px) "Oley Display","Oley Sans",sans-serif;letter-spacing:-.035em;color:#fff}' +
      '.b{margin-top:6px;font:500 13px "Oley Sans",sans-serif;color:rgba(255,255,255,.5);letter-spacing:.02em}</style>' +
      '<div class="m">' + logoSVG() + '</div><div class="n">' + NAME + '</div><div class="b">by ' + AUTHOR + '</div>',
    // a plain line of credit text
    credit: () => '<style>' + BASE + ':host{display:inline;font:inherit;color:inherit;letter-spacing:inherit}span{font:inherit;color:inherit}</style><span>' + CREDIT + '</span>',
  };
  function mount(el, kind) {
    if (!el || !KINDS[kind]) return null;
    let r = roots.get(el);
    if (!r) { r = el.attachShadow({ mode: 'closed' }); roots.set(el, r); }
    r.innerHTML = KINDS[kind]();
    el.setAttribute('aria-label', kind === 'credit' ? CREDIT : NAME + ', by ' + AUTHOR);
    el.setAttribute('role', 'img');
    return el;
  }
  function mountAll(root) {
    (root || document).querySelectorAll('[data-brand]').forEach((el) => { if (!roots.has(el)) mount(el, el.dataset.brand); });
  }

  // ------------------------------------------------------------------ the corner credit
  // Small and quiet, bottom-right, on every lyrics screen. It isn't a setting. If something removes it,
  // hides it, shrinks it or pushes it off screen, it comes back.
  const HOST_CSS = [
    'all:initial', 'position:fixed', 'right:max(10px,1.3vmin)', 'bottom:max(8px,1.1vmin)', 'left:auto', 'top:auto',
    'display:block', 'visibility:visible', 'opacity:.34', 'z-index:2147483647', 'pointer-events:none',
    'mix-blend-mode:difference', 'transform:none', 'filter:none', 'clip-path:none', 'contain:layout style',
    'width:auto', 'height:auto', 'margin:0', 'padding:0',
  ].map((d) => d + ' !important').join(';');
  const CREDIT_HTML = '<style>:host{all:initial}span{display:block;white-space:nowrap;color:#fff;' +
    'font:500 clamp(9px,1.02vmin,15px)/1 "Oley Sans","Segoe UI",sans-serif;letter-spacing:.02em;user-select:none;-webkit-user-select:none}</style>' +
    '<span>' + CREDIT + '</span>';
  let host = null, hostRoot = null, watching = false, mo = null;
  function makeCredit() {
    if (host) { try { host.remove(); } catch (e) {} }
    host = document.createElement('oley-mark');
    host.setAttribute('aria-hidden', 'true');
    host.setAttribute('style', HOST_CSS);
    hostRoot = host.attachShadow({ mode: 'closed' });
    hostRoot.innerHTML = CREDIT_HTML;
    document.documentElement.appendChild(host);
    if (mo) mo.observe(host, { attributes: true });
  }
  function healthy() {
    if (!host || !host.isConnected || host.parentNode !== document.documentElement) return false;
    if (host.getAttribute('style') !== HOST_CSS) return false;
    if (!hostRoot || hostRoot.textContent.indexOf(CREDIT) < 0) return false;
    const cs = getComputedStyle(host);
    if (cs.display === 'none' || cs.visibility !== 'visible' || parseFloat(cs.opacity) < 0.3 || cs.position !== 'fixed') return false;
    const r = host.getBoundingClientRect();
    if (r.width < 30 || r.height < 6) return false;
    if (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < 0 || r.top < 0) return false;
    return true;
  }
  function check() { if (!healthy()) makeCredit(); }
  function startCredit() {
    if (watching) return;
    watching = true;
    const go = () => {
      mo = new MutationObserver(check);
      mo.observe(document.documentElement, { childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      makeCredit();
      setInterval(check, 1500);
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  const Brand = { NAME, AUTHOR, CREDIT, LICENSE: 'GPL-3.0-or-later', logoSVG, mount, mountAll, startCredit };
  Object.freeze(Brand);
  Object.defineProperty(O, 'Brand', { value: Brand, writable: false, configurable: false, enumerable: true });
})();
