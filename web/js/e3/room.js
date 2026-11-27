/* Oley room: the set every Editlyric shot is filmed in — a late-night room with a brick wall, a desk,
   a lamp that throws real shadows, a phone, a laptop, a typewriter, papers, a book, a receipt printer,
   a mug, a neon sign, a cork board, a wall TV and a rainy window over a city. Every surface that can
   carry words is a live canvas page. All sizes are in metres; y is up; the desk top is at 0.75. */
(function () {
  'use strict';
  const O = window.Oley, U = O.util, R = O.R3, Geo = R.Geo, M4 = R.M4, V3 = R.V3, S = O.Surf;
  const PI = Math.PI;
  const DESK = 0.75;

  // a texture from the Editlyric kit's generated images (async, upgrades when loaded)
  function kitTex(G, kind, o) {
    const T = G.texture(null, Object.assign({ srgb: true, mips: true, aniso: 16, wrap: 'repeat' }, o || {}));
    const img = new Image();
    img.onload = () => { G.upload(T, img); T.ready = true; if (T.onready) T.onready(); };
    img.src = O.Ed.K.tex(kind);
    return T;
  }
  // a linear (non-sRGB) copy for bump/roughness use
  function kitLin(G, kind) { return kitTex(G, kind, { srgb: false, premult: false }); }

  class Room {
    constructor(r3, ctx) {
      this.r3 = r3; this.G = r3.G; this.ctx = ctx;
      const G = this.G;
      this.world = { objects: [], lights: [], amb: [0.007, 0.007, 0.01], envGain: 1, bg: [0, 0, 0], fog: 0.02, fogCol: [0.004, 0.004, 0.007], shSoft: 0.0026, shBias: 0.0007, probeDirty: true, probePos: [0.1, 1.15, -0.55], pose: (t) => this.pose(t) };
      this.dyn = [];      // objects whose transforms are set each pose()
      this.props = {};
      this.tex = {
        wood: kitTex(G, 'wood'), woodL: kitLin(G, 'wood'), brick: kitTex(G, 'brick'), brickL: kitLin(G, 'brick'),
        concrete: kitTex(G, 'concrete'), concreteL: kitLin(G, 'concrete'), cork: kitTex(G, 'cork'), paper: kitTex(G, 'paper'),
        drops: kitLin(G, 'drops'),
      };
      for (const k in this.tex) this.tex[k].onready = () => { this.world.probeDirty = true; };
      this.build();
    }
    // ---------------------------------------------------------------- helpers
    add(g, mat, p, r, o) {
      o = o || {};
      const ob = { mesh: g.vao ? g : this.r3.mesh(g, o.inst), mat, model: M4.trs(p || [0, 0, 0], r || [0, 0, 0], 1), shadow: o.shadow !== false, probe: o.probe !== false, base: { p: p || [0, 0, 0], r: r || [0, 0, 0] } };
      this.world.objects.push(ob);
      return ob;
    }
    light(l) { this.world.lights.push(l); return l; }
    page(w, h, o) { return new S.Page(this.G, w, h, o); }
    // a group: a parent transform (desk position + yaw) for parts placed in its local space
    group(p, yaw) { return { p, yaw: yaw || 0, parts: [], m: M4.trs(p, [0, yaw || 0, 0], 1) }; }
    part(gr, g, mat, lp, lr, o) {
      const ob = this.add(g, mat, [0, 0, 0], [0, 0, 0], o);
      ob.lp = lp || [0, 0, 0]; ob.lr = lr || [0, 0, 0]; ob.gr = gr;
      gr.parts.push(ob);
      this.place(ob);
      return ob;
    }
    place(ob) { M4.mul(ob.gr.m, M4.trs(ob.lp, ob.lr, ob.ls == null ? 1 : ob.ls), ob.model); }
    regroup(gr) { M4.trs(gr.p, [gr.rx || 0, gr.yaw, gr.rz || 0], 1, gr.m); for (const ob of gr.parts) this.place(ob); }
    // a local point / direction of a group in world space
    wp(gr, lp) { return M4.apply(gr.m, lp); }
    wd(gr, ld) { return M4.dir(gr.m, ld); }

    // ---------------------------------------------------------------- the set
    build() {
      const T = this.tex;
      // ---- shell: floor, walls, ceiling, the window opening in the left wall
      this.add(Geo.plane(7, 7), { color: [0.36, 0.31, 0.28], rough: 0.4, tex: T.wood, st: [5, 9, 0, 0], clear: 0.3, bump: T.woodL, bumpAmt: 0.0005, bumpST: [5, 9, 0, 0] }, [0, 0, 0.5], [-PI / 2, 0, 0]);
      this.add(Geo.plane(7, 3.2), { color: [0.6, 0.56, 0.54], rough: 0.9, tex: T.brick, st: [4.5, 4.5, 0, 0], bump: T.brickL, bumpAmt: 0.005, bumpST: [4.5, 4.5, 0, 0] }, [0, 1.6, -1.3]);
      const lw = { color: [0.36, 0.34, 0.33], rough: 0.92, tex: T.concrete, st: [2, 1.5, 0, 0], bump: T.concreteL, bumpAmt: 0.0015 };
      const WX = -2.2, wz0 = -1.05, wz1 = 0.25, wy0 = 0.95, wy1 = 2.3;
      this.add(Geo.plane(1.3 - 1.3 + (wz0 + 1.3), 3.2), lw, [WX, 1.6, (-1.3 + wz0) / 2], [0, PI / 2, 0]);
      this.add(Geo.plane(4.3 - wz1 + 0.05, 3.2), lw, [WX, 1.6, (wz1 + 4.3) / 2], [0, PI / 2, 0]);
      this.add(Geo.plane(wz1 - wz0, wy0), lw, [WX, wy0 / 2, (wz0 + wz1) / 2], [0, PI / 2, 0]);
      this.add(Geo.plane(wz1 - wz0, 3.2 - wy1), lw, [WX, (wy1 + 3.2) / 2, (wz0 + wz1) / 2], [0, PI / 2, 0]);
      this.add(Geo.plane(7, 3.2), lw, [2.4, 1.6, 0.5], [0, -PI / 2, 0]);
      this.add(Geo.plane(7, 7), { color: [0.05, 0.05, 0.055], rough: 0.95 }, [0, 3.2, 0.5], [PI / 2, 0, 0], { shadow: false });
      // skirting along the back wall
      this.add(Geo.box(7, 0.09, 0.02), { color: [0.03, 0.03, 0.03], rough: 0.5 }, [0, 0.045, -1.29]);
      this.buildWindow(WX, wz0, wz1, wy0, wy1);
      // ---- the desk
      const top = { color: [0.42, 0.32, 0.25], rough: 0.36, tex: T.wood, st: [3, 1.4, 0, 0], clear: 0.32, bump: T.woodL, bumpAmt: 0.00035, bumpST: [3, 1.4, 0, 0] };
      this.add(Geo.rbox(1.9, 0.045, 0.82, 0.006, 3), top, [0, DESK - 0.0225, -0.88]);
      const leg = { color: [0.02, 0.02, 0.022], rough: 0.35, metal: 1 };
      for (const [x, z] of [[-0.9, -0.52], [0.9, -0.52], [-0.9, -1.24], [0.9, -1.24]]) this.add(Geo.box(0.04, DESK - 0.045, 0.04), leg, [x, (DESK - 0.045) / 2, z]);
      this.add(Geo.box(1.84, 0.06, 0.02), leg, [0, DESK - 0.075, -1.24]);
      this.buildLamp();
      this.buildPhone();
      this.buildLaptop();
      this.buildTV();
      this.buildNeon();
      this.buildCork();
      this.buildClutter();
      this.buildTypewriter();
      this.buildPapers();
      this.buildBook();
      this.buildPrinter();
      this.buildFrame();
      // ---- city light through the window, a little cold fill
      this.light({ type: 'spot', pos: [WX - 1.2, 2.1, -0.4], dir: [1, -0.32, -0.12], color: [0.42, 0.55, 1], intensity: 7, range: 9, outer: 0.7, inner: 0.25, radius: 0.6 });
      this.light({ type: 'point', pos: [0.4, 2.6, 1.6], color: [0.5, 0.55, 0.75], intensity: 0.25, range: 7, radius: 1 });
    }
    buildWindow(WX, z0, z1, y0, y1) {
      const T = this.tex;
      const fr = { color: [0.015, 0.015, 0.016], rough: 0.4, metal: 0.6 };
      const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2, ww = z1 - z0, wh = y1 - y0;
      this.add(Geo.box(0.08, 0.05, ww + 0.1), fr, [WX + 0.02, y0 - 0.02, cz]);
      this.add(Geo.box(0.12, 0.04, ww + 0.16), { color: [0.75, 0.74, 0.72], rough: 0.6 }, [WX + 0.05, y0 - 0.06, cz]);
      this.add(Geo.box(0.08, 0.05, ww + 0.1), fr, [WX + 0.02, y1 + 0.02, cz]);
      for (const z of [z0 - 0.025, cz, z1 + 0.025]) this.add(Geo.box(0.08, wh + 0.06, 0.05), fr, [WX + 0.02, cy, z]);
      this.add(Geo.box(0.06, 0.035, ww), fr, [WX + 0.02, cy + 0.18, cz]);
      // the city outside: a big emissive picture far away
      this.city = this.page(1600, 900);
      this.drawCity();
      this.add(Geo.plane(9, 5.1), { color: [0, 0, 0], em: this.city.tex, emGain: 1.2 }, [WX - 3.4, 1.9, cz], [0, PI / 2, 0], { shadow: false });
      // glass with rain, and the fog layer the "fog" scene writes into
      this.glassMat = { color: [0.9, 0.95, 1], rough: 0.06, alpha: 0.12, clear: 1, blend: true, bump: T.drops, bumpAmt: 0.004, bumpST: [2.2, 2.2, 0, 0] };
      this.glass = this.add(Geo.plane(ww, wh), this.glassMat, [WX + 0.015, cy, cz], [0, PI / 2, 0], { shadow: false, probe: false });
      this.fogPage = this.page(1024, 1100);
      this.fogMat = { color: [0.82, 0.86, 0.9], rough: 0.5, alpha: 1, tex: this.fogPage.tex, blend: true };
      this.fogPage.paint('clear', (x, w, h) => x.clearRect(0, 0, w, h));
      this.fogW = ww - 0.02; this.fogH = wh - 0.02;
      this.fog = this.add(Geo.plane(ww - 0.02, wh - 0.02), this.fogMat, [WX + 0.025, cy, cz], [0, PI / 2, 0], { shadow: false, probe: false });
      this.win = { x: WX, z0, z1, y0, y1, cz, cy };
    }
    drawCity() {
      const pal = this.ctx.palette || O.defaultPalette();
      const tint = U.vivid(pal.vivid, 0.5, 1);
      this.city.paint('city' + tint.join(','), (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#05070d'); g.addColorStop(0.55, U.rgba(U.mix([20, 28, 52], tint, 0.25), 1)); g.addColorStop(1, '#0a0b12');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        const r = U.rng(77);
        // far buildings with lit windows
        for (let layer = 0; layer < 3; layer++) {
          let bx = -20;
          while (bx < w) {
            const bw = r.range(40, 120) * (1 + layer * 0.3), bh = r.range(120, 420) * (1 - layer * 0.15);
            const y0 = h * (0.62 + layer * 0.06) - bh;
            x.fillStyle = `rgb(${8 + layer * 4},${9 + layer * 4},${14 + layer * 5})`;
            x.fillRect(bx, y0, bw, h - y0);
            for (let wy = y0 + 8; wy < h * 0.95; wy += 11) for (let wx = bx + 6; wx < bx + bw - 6; wx += 9) {
              if (r() < 0.22) { x.fillStyle = r() < 0.7 ? `rgba(255,${r.int(170, 220)},${r.int(90, 140)},${r.range(0.4, 0.95).toFixed(2)})` : `rgba(160,200,255,${r.range(0.3, 0.8).toFixed(2)})`; x.fillRect(wx, wy, 4, 5); }
            }
            bx += bw + r.range(2, 18);
          }
        }
        // big soft lights (out of focus through the glass)
        for (let i = 0; i < 70; i++) {
          const X = r() * w, Y = h * r.range(0.35, 0.95), R2 = r.range(4, 26);
          const c = r() < 0.5 ? [255, 190, 110] : r() < 0.5 ? [120, 170, 255] : tint;
          const gg = x.createRadialGradient(X, Y, 0, X, Y, R2);
          gg.addColorStop(0, U.rgba(c, 0.85)); gg.addColorStop(0.6, U.rgba(c, 0.25)); gg.addColorStop(1, U.rgba(c, 0));
          x.fillStyle = gg; x.beginPath(); x.arc(X, Y, R2, 0, PI * 2); x.fill();
        }
      });
    }
    buildLamp() {
      const enamel = { color: [0.012, 0.012, 0.013], rough: 0.22, clear: 0.7 };
      const chrome = { color: [0.85, 0.85, 0.87], rough: 0.12, metal: 1 };
      const b = [-0.68, DESK, -1.1], j = [-0.6, DESK + 0.4, -1.02], hd = [-0.38, DESK + 0.52, -0.86];
      const seg = (a, c, r, mat) => {
        const d = V3.sub(c, a), L = V3.len(d);
        const yaw = Math.atan2(d[0], d[2]), pitch = Math.acos(U.clamp(d[1] / L, -1, 1));
        return this.add(Geo.cyl(r, L, 16), mat, V3.lerp(a, c, 0.5), [pitch, yaw, 0]);
      };
      this.add(Geo.cyl(0.08, 0.022, 40), enamel, [b[0], DESK + 0.011, b[2]]);
      seg([b[0], DESK + 0.02, b[2]], j, 0.008, chrome);
      seg(j, hd, 0.008, chrome);
      this.add(Geo.sphere(0.016, 12), enamel, j);
      // the shade points down toward the desk
      const aim = V3.norm(V3.sub([-0.18, DESK, -0.72], hd));
      const yaw = Math.atan2(aim[0], aim[2]), pitch = Math.acos(U.clamp(-aim[1], -1, 1));
      this.add(Geo.cyl(0.03, 0.13, 40, true, 0.085), enamel, V3.add(hd, V3.mul(aim, 0.03)), [pitch + PI, yaw, 0]);
      this.bulb = this.add(Geo.sphere(0.022, 16), { color: [0, 0, 0], emCol: [1, 0.78, 0.52], emGain: 60 }, V3.add(hd, V3.mul(aim, 0.08)), [0, 0, 0], { shadow: false });
      this.lamp = this.light({ type: 'spot', pos: V3.add(hd, V3.mul(aim, 0.1)), dir: aim, color: [1, 0.78, 0.55], intensity: 6.5, range: 5, outer: 0.85, inner: 0.3, radius: 0.07, shadow: true });
      // light bouncing back up off the desk
      this.light({ type: 'point', pos: [-0.2, DESK + 0.18, -0.78], color: [1, 0.72, 0.5], intensity: 0.22, range: 2.2, radius: 0.6 });
    }
    buildPhone() {
      const g = this.group([-0.06, DESK, -0.66], 0.42);
      const pw = 0.0715, ph = 0.1495, pd = 0.0082;
      const frame = { color: [0.55, 0.53, 0.5], rough: 0.24, metal: 1 };
      const body = this.part(g, Geo.rbox(pw, pd, ph, 0.0095, 6, { mid: 2 }), frame, [0, pd / 2, 0]);
      const page = this.page(900, 1950);
      // the glass: a flat rounded rectangle carrying the screen page (top of the page = far end)
      const scr = this.part(g, this.screenGeo(pw - 0.0042, ph - 0.0042, 0.0085), { color: [0.004, 0.004, 0.005], rough: 0.3, clear: 0.12, spec: 0.35, em: page.tex, emGain: 1.25 }, [0, pd + 0.0001, 0]);
      const back = this.part(g, Geo.rbox(0.026, 0.002, 0.03, 0.006, 4), { color: [0.05, 0.05, 0.055], rough: 0.2, clear: 0.6 }, [pw / 2 - 0.018, -0.0005, -ph / 2 + 0.02]);
      void body; void back;
      this.props.phone = { g, page, scr, w: pw - 0.0042, h: ph - 0.0042, top: pd + 0.0005, glow: this.light({ type: 'point', pos: this.wp(g, [0, 0.03, 0]), color: [0.6, 0.7, 1], intensity: 0.02, range: 0.8, radius: 0.05 }) };
    }
    // a flat rounded-rectangle screen facing +y with uv across it (top of the page = far end, -z)
    screenGeo(w, h, r) {
      const outline = [];
      const N = 10;
      const corner = (cx, cz, a0) => { for (let i = 0; i <= N; i++) { const a = a0 + (i / N) * (PI / 2); outline.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
      corner(w / 2 - r, h / 2 - r, 0); corner(-w / 2 + r, h / 2 - r, PI / 2); corner(-w / 2 + r, -h / 2 + r, PI); corner(w / 2 - r, -h / 2 + r, PI * 1.5);
      const P = [0, 0, 0], Nn = [0, 1, 0], UV = [0.5, 0.5], I = [];
      outline.forEach(([x, z], i) => { P.push(x, 0, z); Nn.push(0, 1, 0); UV.push(x / w + 0.5, 0.5 - z / h); if (i) I.push(0, i, i + 1); });
      I.push(0, outline.length, 1);
      return { p: new Float32Array(P), n: new Float32Array(Nn), u: new Float32Array(UV), i: new Uint16Array(I) };
    }
    buildLaptop() {
      const g = this.group([0.42, DESK, -0.98], -0.32);
      const alu = { color: [0.6, 0.61, 0.64], rough: 0.3, metal: 1 };
      const bw = 0.312, bd = 0.22, bt = 0.0155;
      this.part(g, Geo.rbox(bw, bt, bd, 0.006, 4), alu, [0, bt / 2, 0]);
      // keyboard + trackpad drawn on a page, sitting in the deck
      const kb = this.page(1024, 720);
      this.drawKeyboard(kb);
      this.part(g, Geo.plane(bw - 0.03, bd - 0.025), { color: [0.9, 0.9, 0.9], rough: 0.55, tex: kb.tex }, [0, bt + 0.0002, 0.002], [-PI / 2, 0, 0]);
      // the lid, hinged at the back edge, open ~108°
      const lid = this.group([0, 0, 0], 0);
      lid.parent = g;
      const open = (108 * PI) / 180;
      const lw = bw, lh = 0.205, lt = 0.006;
      const page = this.page(1600, 1040);
      const hinge = [0, bt, -bd / 2 + 0.004];
      const lm = M4.mul(g.m, M4.mul(M4.trs(hinge, [-(open - PI / 2) * 1, 0, 0], 1), M4.I()));
      const lidOb = this.add(Geo.rbox(lw, lh, lt, 0.005, 4), alu, [0, 0, 0]);
      lidOb.model = M4.mul(lm, M4.trs([0, lh / 2, -lt / 2], [0, 0, 0], 1));
      const bez = this.add(Geo.box(lw - 0.006, lh - 0.006, 0.0004), { color: [0.01, 0.01, 0.012], rough: 0.06, clear: 1 }, [0, 0, 0]);
      bez.model = M4.mul(lm, M4.trs([0, lh / 2, 0.0003], [0, 0, 0], 1));
      const sw = lw - 0.024, sh = sw * (1040 / 1600);
      const disp = this.add(Geo.plane(sw, sh), { color: [0.003, 0.003, 0.004], rough: 0.3, clear: 0.12, spec: 0.35, em: page.tex, emGain: 1.1 }, [0, 0, 0], [0, 0, 0], { probe: false });
      disp.model = M4.mul(lm, M4.trs([0, lh / 2 + 0.004, 0.0006], [0, 0, 0], 1));
      const center = M4.apply(disp.model, [0, 0, 0]), normal = M4.dir(disp.model, [0, 0, 1]);
      this.props.laptop = { g, page, disp, w: sw, h: sh, center, normal, lm, glow: this.light({ type: 'point', pos: V3.add(center, V3.mul(normal, 0.18)), color: [0.55, 0.65, 1], intensity: 0.12, range: 1.6, radius: 0.2 }) };
    }
    drawKeyboard(pg) {
      pg.paint('kb', (x, w, h) => {
        x.fillStyle = '#9da0a6'; x.fillRect(0, 0, w, h);
        const rows = [14, 14, 13, 12, 9], kh = 46, gap = 8, top = 40;
        rows.forEach((n, ri) => {
          const kw = (w - 60 - gap * (n - 1)) / n;
          for (let i = 0; i < n; i++) {
            const X = 30 + i * (kw + gap), Y = top + ri * (kh + gap);
            const wide = ri === 4 && i === 4;
            S.fillRR(x, X, Y, wide ? kw * 1 : kw, kh, 7, '#16171a');
            x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(X + 4, Y + 3, kw - 8, 2);
          }
        });
        S.fillRR(x, w / 2 - 190, top + 5 * (kh + gap) + 30, 380, 230, 14, '#a6a9ae');
      });
    }
    buildTV() {
      const p = [1.42, 1.42, -1.26], tw = 1.0, th = 0.58;
      this.add(Geo.rbox(tw + 0.02, th + 0.02, 0.04, 0.004, 3), { color: [0.012, 0.012, 0.013], rough: 0.18, clear: 0.8 }, p);
      const page = this.page(1600, 900);
      const disp = this.add(Geo.plane(tw - 0.012, th - 0.012), { color: [0.003, 0.003, 0.003], rough: 0.3, clear: 0.12, spec: 0.35, em: page.tex, emGain: 0.95 }, [p[0], p[1], p[2] + 0.0205], [0, 0, 0], { probe: false });
      this.props.tv = { page, disp, center: [p[0], p[1], p[2] + 0.021], normal: [0, 0, 1], w: tw - 0.012, h: th - 0.012, glow: this.light({ type: 'point', pos: [p[0], p[1], p[2] + 0.35], color: [0.6, 0.7, 1], intensity: 0.15, range: 2.4, radius: 0.4 }) };
    }
    buildNeon() {
      const p = [0.22, 1.72, -1.27];
      const page = this.page(2048, 560);
      // the clear acrylic plate the tubes sit on
      const tubes = this.add(Geo.plane(1.18, 1.18 * (560 / 2048)), { color: [0, 0, 0], alpha: 1, em: page.tex, emGain: 9, blend: true }, [p[0], p[1], p[2] + 0.03], [0, 0, 0], { shadow: false });
      tubes.mat.tex = page.tex;
      // little standoffs that hold the tubes off the wall
      for (const dx of [-0.5, 0.5]) for (const dy of [-0.1, 0.1]) this.add(Geo.cyl(0.006, 0.03, 12), { color: [0.85, 0.85, 0.9], rough: 0.2, metal: 1 }, [p[0] + dx, p[1] + dy, p[2] + 0.015], [PI / 2, 0, 0], { probe: false });
      const lt = this.light({ type: 'point', pos: [p[0], p[1] - 0.05, p[2] + 0.25], color: [1, 0.2, 0.5], intensity: 0.55, range: 3.2, radius: 0.5 });
      this.props.neon = { page, tubes, light: lt, center: [p[0], p[1], p[2] + 0.03], normal: [0, 0, 1], w: 1.18, h: 1.18 * (560 / 2048) };
    }
    buildCork() {
      const p = [-0.86, 1.48, -1.275], bw = 0.74, bh = 0.52;
      this.add(Geo.rbox(bw + 0.04, bh + 0.04, 0.02, 0.004, 2), { color: [0.42, 0.3, 0.2], rough: 0.5, tex: this.tex.wood, st: [0.5, 0.5, 0, 0] }, p);
      const page = this.page(1480, 1040);
      const ob = this.add(Geo.plane(bw, bh), { color: [1, 1, 1], rough: 0.95, tex: page.tex, bump: this.tex.concreteL, bumpAmt: 0.0012 }, [p[0], p[1], p[2] + 0.0105]);
      this.props.cork = { p: [p[0], p[1], p[2] + 0.011], w: bw, h: bh, page, ob };
      const paintBase = () => page.paint('base' + (S.pattern(page.x, 'cork') ? 1 : 0), (x, w, h) => this.corkBase(x, w, h));
      S.pattern(page.x, 'cork', () => { page.force(); paintBase(); this.world.probeDirty = true; });
      paintBase();
    }
    buildClutter() {
      // mug of coffee
      const mug = { color: [0.72, 0.7, 0.66], rough: 0.3, clear: 0.6 };
      this.add(Geo.cyl(0.042, 0.095, 40), mug, [0.16, DESK + 0.0475, -0.6]);
      this.add(Geo.torus(0.024, 0.0065, 20, 10, PI), mug, [0.16 + 0.041, DESK + 0.05, -0.6], [0, 0, -PI / 2]);
      this.add(Geo.cyl(0.036, 0.002, 32), { color: [0.06, 0.03, 0.015], rough: 0.08, clear: 1 }, [0.16, DESK + 0.083, -0.6]);
      // books stacked at the back right
      const cols = [[0.35, 0.08, 0.06], [0.08, 0.12, 0.2], [0.75, 0.68, 0.55], [0.1, 0.1, 0.1]];
      let y = DESK;
      cols.forEach((c, i) => { const h = 0.028 + (i % 2) * 0.01; this.add(Geo.rbox(0.24 - i * 0.012, h, 0.17 - i * 0.008, 0.003, 2), { color: c, rough: 0.6 }, [0.82, y + h / 2, -1.12], [0, 0.12 * (i % 2 ? 1 : -1), 0]); y += h; });
    }

    buildTypewriter() {
      const g = this.group([-0.5, DESK, -0.93], 0.3);
      const enamel = { color: [0.012, 0.03, 0.022], rough: 0.2, clear: 0.9 };
      const chrome = { color: [0.9, 0.9, 0.92], rough: 0.1, metal: 1 };
      const rubber = { color: [0.012, 0.012, 0.012], rough: 0.65 };
      this.part(g, Geo.rbox(0.34, 0.07, 0.27, 0.026, 6, { mid: 2 }), enamel, [0, 0.035, 0]);
      this.part(g, Geo.rbox(0.33, 0.05, 0.11, 0.02, 5), enamel, [0, 0.085, -0.075]);
      this.part(g, Geo.rbox(0.3, 0.012, 0.16, 0.006, 3), { color: [0.01, 0.01, 0.01], rough: 0.4 }, [0, 0.074, 0.05], [-0.22, 0, 0]);
      // keys: black caps with letters (an atlas), on stepped rows
      const atlas = this.page(1024, 640);
      const rows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM,.'];
      const chars = rows.join('');
      atlas.paint('keys', (x, w, h) => {
        x.fillStyle = '#060606'; x.fillRect(0, 0, w, h);
        const n = chars.length, cw = w / 8, chh = h / 5;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = S.font(700, 64, S.FAM.sans);
        for (let i = 0; i < n; i++) {
          const cx = cw * (i % 8) + cw / 2, cy = chh * Math.floor(i / 8) + chh / 2;
          const g = x.createRadialGradient(cx, cy - 10, 4, cx, cy, cw * 0.5);
          g.addColorStop(0, '#202020'); g.addColorStop(0.8, '#0a0a0a'); g.addColorStop(1, '#000');
          x.fillStyle = g; x.fillRect(cx - cw / 2, cy - chh / 2, cw, chh);
          x.fillStyle = '#ecebe2'; x.fillText(chars[i], cx, cy + 3);
        }
      });
      const keys = this.r3.mesh(Geo.cyl(0.0088, 0.006, 24), 40);
      const ko = this.part(g, keys, { color: [1, 1, 1], rough: 0.25, clear: 0.6, tex: atlas.tex, atlas: true }, [0, 0, 0]);
      const ring = this.r3.mesh(Geo.cyl(0.0098, 0.002, 24, false), 40);
      const ro = this.part(g, ring, chrome, [0, 0, 0]);
      this.tw = { g, keys, ring, ko, ro, rows, chars, list: [] };
      let i = 0;
      rows.forEach((row, ri) => {
        row.split('').forEach((ch, ci) => {
          const x = (ci - (row.length - 1) / 2) * 0.026 + (ri % 2) * 0.006, z = 0.115 - ri * 0.03, y = 0.082 + ri * 0.009;
          this.tw.list.push({ ch, x, y, z, idx: chars.indexOf(ch), down: 0 });
          i++;
        });
      });
      // carriage: platen, knobs, paper bail and the sheet
      const car = this.group([0, 0, 0], 0);
      car.parent = g;
      this.tw.car = car;
      this.tw.carParts = [];
      const cp = (geo, mat, lp, lr) => { const ob = this.add(geo, mat, [0, 0, 0]); ob.lp = lp; ob.lr = lr || [0, 0, 0]; this.tw.carParts.push(ob); return ob; };
      cp(Geo.cyl(0.023, 0.38, 32), rubber, [0, 0.122, -0.095], [0, 0, PI / 2]);
      cp(Geo.cyl(0.02, 0.022, 32), chrome, [0.2, 0.122, -0.095], [0, 0, PI / 2]);
      cp(Geo.cyl(0.02, 0.022, 32), chrome, [-0.2, 0.122, -0.095], [0, 0, PI / 2]);
      cp(Geo.cyl(0.003, 0.36, 12), chrome, [0, 0.142, -0.072], [0, 0, PI / 2]);
      cp(Geo.box(0.36, 0.014, 0.02), chrome, [0, 0.148, -0.112]);
      const paper = this.page(1240, 1500);
      this.tw.paper = paper;
      const sheet = cp(Geo.plane(0.215, 0.26, 4, 16, (x, y) => -0.022 * Math.pow((y + 0.13) / 0.26, 2)), { color: [0.82, 0.8, 0.76], rough: 0.92, tex: paper.tex }, [0, 0.135 + 0.13, -0.1], [-0.12, 0, 0]);
      this.tw.sheet = sheet;
      this.tw.carX = 0;
      this.typewriterPose(0);
      // where the next letter lands (local to the typewriter)
      this.tw.strike = [0, 0.15, -0.075];
    }
    typewriterPose(carX, pressed) {
      const t = this.tw, g = t.g;
      t.carX = carX;
      for (const ob of t.carParts) M4.mul(g.m, M4.trs([ob.lp[0] + carX, ob.lp[1], ob.lp[2]], ob.lr, 1), ob.model);
      t.list.forEach((k, i) => {
        const d = pressed && pressed[k.ch] ? pressed[k.ch] : 0;
        const m = M4.trs([k.x, k.y - d * 0.004, k.z], [-0.22, 0, 0], 1);
        const a = 1 / 40;
        this.r3.setInst(t.keys, i, m, [(k.idx % 8) / 8, 1 - (Math.floor(k.idx / 8) + 1) / 5, 1 / 8, 1 / 5]);
        this.r3.setInst(t.ring, i, M4.trs([k.x, k.y - 0.002 - d * 0.004, k.z], [-0.22, 0, 0], 1), [0, 0, 1, 1]);
        void a;
      });
      this.r3.flushInst(t.keys, t.list.length);
      this.r3.flushInst(t.ring, t.list.length);
      t.ko.model.set(g.m); t.ro.model.set(g.m);
    }
    buildPapers() {
      const paperMat = (pg) => ({ color: [0.8, 0.78, 0.74], rough: 0.9, tex: pg.tex });   // real paper isn't pure white: under the lamp it would blow out and wash the ink away
      const curl = (x, y) => 0.004 * Math.pow(Math.abs(x) / 0.105, 3) + 0.003 * Math.pow(Math.max(0, y / 0.148), 4);
      // the sheet on top floats a few millimetres over the one under it, which lies flat: no z-fighting, and its
      // curled corners can never poke up through the top sheet
      const g = this.group([0.06, DESK + 0.0042, -0.9], -0.14);
      const pg = this.page(1240, 1754);
      const ob = this.part(g, Geo.plane(0.21, 0.297, 12, 16, curl), paperMat(pg), [0, 0, 0], [-PI / 2, 0, 0]);
      // a second sheet under it, slightly turned
      const g2 = this.group([0.1, DESK + 0.0006, -0.88], 0.1);
      const pg2 = this.page(620, 877);
      pg2.paint('blank', (x, w, h) => { x.fillStyle = '#f2efe6'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 22; i++) x.fillRect(70, 110 + i * 30, 300 + ((i * 97) % 170), 7); });
      this.part(g2, Geo.plane(0.21, 0.297, 2, 2), paperMat(pg2), [0, 0, 0], [-PI / 2, 0, 0]);
      this.props.paper = { g, page: pg, ob, w: 0.21, h: 0.297 };
    }
    buildBook() {
      const g = this.group([0.6, DESK, -0.6], -0.42);
      this.part(g, Geo.rbox(0.33, 0.01, 0.235, 0.004, 3), { color: [0.18, 0.05, 0.04], rough: 0.55 }, [0, 0.005, 0]);
      this.part(g, Geo.rbox(0.315, 0.016, 0.222, 0.003, 2), { color: [0.86, 0.82, 0.74], rough: 0.85 }, [0, 0.017, 0]);
      const page = this.page(1024, 1440), left = this.page(512, 720);
      left.paint('l', (x, w, h) => { x.fillStyle = '#f1ead9'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(40,32,24,0.55)'; for (let i = 0; i < 26; i++) x.fillRect(48, 70 + i * 23, 400 - (i % 7 === 6 ? 160 : 0), 6); });
      const bend = (side) => (x, y) => { const u = side > 0 ? (x + 0.0775) / 0.155 : 1 - (x + 0.0775) / 0.155; return 0.012 * Math.pow(Math.max(0, 1 - u), 2.2) + 0.002 * Math.sin(U.sat(u) * PI); };
      this.part(g, Geo.plane(0.155, 0.218, 16, 4, bend(-1)), { color: [1, 1, 1], rough: 0.9, tex: left.tex }, [-0.0785, 0.0255, 0], [-PI / 2, 0, 0]);
      const rp = this.part(g, Geo.plane(0.155, 0.218, 16, 4, bend(1)), { color: [1, 1, 1], rough: 0.9, tex: page.tex }, [0.0785, 0.0255, 0], [-PI / 2, 0, 0]);
      this.props.book = { g, page, ob: rp, w: 0.155, h: 0.218 };
    }
    buildPrinter() {
      const g = this.group([0.74, DESK, -0.82], -0.75);
      const plastic = { color: [0.03, 0.03, 0.032], rough: 0.35, clear: 0.3 };
      this.part(g, Geo.rbox(0.11, 0.085, 0.14, 0.014, 5), plastic, [0, 0.0425, 0]);
      this.part(g, Geo.box(0.075, 0.003, 0.01), { color: [0, 0, 0], rough: 0.9 }, [0, 0.02, 0.07]);
      this.part(g, Geo.sphere(0.003, 8), { color: [0, 0, 0], emCol: [0.2, 1, 0.45], emGain: 12 }, [0.04, 0.07, 0.066], [0, 0, 0], { shadow: false });
      const page = this.page(512, 3072);
      const strip = this.part(g, Geo.plane(0.06, 0.36, 2, 24, (x, y) => 0.002 * Math.sin((y + 0.18) * 30)), { color: [1, 1, 1], rough: 0.85, tex: page.tex }, [0, 0.0015, 0.07 + 0.18], [-PI / 2, 0, PI]);
      this.props.receipt = { g, page, strip, len: 0.36, out: 0 };
      this.receiptOut(0);
    }
    // how far the receipt has come out of the printer (metres)
    receiptOut(m) {
      const R = this.props.receipt;
      R.out = m;
      R.strip.lp = [0, 0.0015, 0.07 - 0.18 + m];
      this.place(R.strip);
    }
    buildFrame() {
      const p = [-0.12, 2.02, -1.275];
      this.add(Geo.rbox(0.36, 0.36, 0.025, 0.003, 2), { color: [0.015, 0.015, 0.015], rough: 0.4 }, p);
      this.add(Geo.plane(0.34, 0.34), { color: [0.95, 0.95, 0.95], rough: 0.9 }, [p[0], p[1], p[2] + 0.0126]);
      const art = this.page(512, 512);
      this.artPage = art;
      this.artOb = this.add(Geo.plane(0.27, 0.27), { color: [1, 1, 1], rough: 0.35, clear: 0.5, tex: art.tex }, [p[0], p[1], p[2] + 0.0132]);
    }
    corkBase(x, w, h) {
      const pat = S.pattern(x, 'cork');
      x.fillStyle = pat || '#8a6a48'; x.fillRect(0, 0, w, h);
      if (!pat) return;
      x.fillStyle = 'rgba(70,40,15,0.12)'; x.fillRect(0, 0, w, h);
    }
    // a surface's frame in world space: centre, right, up (towards the top of its text), normal, size
    frameOf(ob, w, h, ax) {
      ax = ax || {};
      const m = ob.model;
      return { c: M4.apply(m, ax.c || [0, 0, 0]), r: V3.norm(M4.dir(m, ax.r || [1, 0, 0])), u: V3.norm(M4.dir(m, ax.u || [0, 1, 0])), n: V3.norm(M4.dir(m, ax.n || [0, 0, 1])), w, h };
    }
    anchor(name) {
      const P = this.props;
      switch (name) {
        case 'phone': return this.frameOf(P.phone.scr, P.phone.w, P.phone.h, { u: [0, 0, -1], n: [0, 1, 0] });
        case 'laptop': return this.frameOf(P.laptop.disp, P.laptop.w, P.laptop.h);
        case 'tv': return this.frameOf(P.tv.disp, P.tv.w, P.tv.h);
        case 'neon': return this.frameOf(P.neon.tubes, P.neon.w, P.neon.h);
        case 'typewriter': return this.frameOf(this.tw.sheet, 0.215, 0.26);
        case 'paper': return this.frameOf(P.paper.ob, P.paper.w, P.paper.h);
        case 'book': return this.frameOf(P.book.ob, P.book.w, P.book.h);
        case 'receipt': return this.frameOf(P.receipt.strip, 0.06, 0.36);
        case 'cork': return this.frameOf(P.cork.ob, P.cork.w, P.cork.h);
        case 'window': return this.frameOf(this.fog, this.fogW, this.fogH);
        case 'art': return this.frameOf(this.artOb, 0.27, 0.27);
      }
      return { c: [0, 1.1, -0.9], r: [1, 0, 0], u: [0, 1, 0], n: [0, 0, 1], w: 1, h: 0.6 };
    }
    setArt(img) {
      this.artPage.paint('art' + (img ? img.src : ''), (x, w, h) => { S.img(x, img, 0, 0, w, h, 0); });
      this.world.probeDirty = true;
    }
    // ---------------------------------------------------------------- per-song looks
    setPalette(pal) {
      const c = U.vivid(pal.vivid, 0.75, 1), lc = O.lin(c);
      const n = this.props.neon;
      n.light.color = [lc[0] / Math.max(...lc), lc[1] / Math.max(...lc), lc[2] / Math.max(...lc)];
      n.color = c;
      this.drawCity();
      this.world.probeDirty = true;
    }
    // ---------------------------------------------------------------- per frame
    // lights that live on their own: the neon's hum, the phone waking up when it's used
    tick(t, dt, A, active) {
      const P = this.props, N = P.neon;
      if (active.neon) { N.lastCol = N.light.color.slice(); N.lastOn = N.light.intensity; }
      else {
        if (N.lastCol) N.light.color = N.lastCol;
        N.light.intensity = 0.55 * (0.985 + 0.015 * Math.sin(t * 100) + (A ? A.pulse * 0.04 : 0));
      }
      const ph = P.phone, on = active.phone ? 1 : 0;
      ph.wake = ph.wake == null ? 0 : ph.wake + (on - ph.wake) * Math.min(1, dt * (on ? 9 : 1.5));
      ph.scr.mat.emGain = 0.08 + 1.07 * ph.wake;
      ph.glow.intensity = 0.03 * ph.wake;
    }
    pose(t) {
      if (this.posers) for (const f of this.posers) f(t);
      return this.cam ? this.cam(t) : { pos: [0.2, 1.3, 0.6], at: [0, 0.9, -0.9], fov: 40, focus: 1.4, fstop: 2.8 };
    }
  }
  Room.DESK = DESK;
  O.Room = Room;
})();
