/* Oley subject finder: works out where the subject of a cover is, so edits can cut it out.
   guess(): no model needed. Background colours are learned from the cover's border and anything
   that clearly differs from them, near the middle, becomes the subject (good on portraits and
   product shots with plain backgrounds; it says "not sure" on busy covers instead of guessing).
   fromMask(): analyses a proper cut-out made by the app (when its model is installed). */
(function () {
  'use strict';
  const O = window.Oley, U = O.util;
  const MS = 160;

  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const fl = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  function toLab(px, N) {
    const L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N), Y = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = LIN[px[i * 4]], g = LIN[px[i * 4 + 1]], b = LIN[px[i * 4 + 2]];
      const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
      const Yv = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
      const fx = fl(X), fy = fl(Yv), fz = fl(Z);
      L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
      Y[i] = Math.pow(Yv, 1 / 2.2);
    }
    return { L, A, B, Y };
  }
  function pixels(img, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, size, size);
    try { return x.getImageData(0, 0, size, size).data; } catch (e) { return null; }
  }
  // separable max / min filters on a binary map
  function morph(src, r, isMax) {
    const N = MS, tmp = new Uint8Array(N * N), out = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = isMax ? 0 : 1;
      for (let k = -r; k <= r; k++) { const xx = x + k; const s = xx < 0 || xx >= N ? (isMax ? 0 : 1) : src[y * N + xx]; v = isMax ? v | s : v & s; }
      tmp[y * N + x] = v;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = isMax ? 0 : 1;
      for (let k = -r; k <= r; k++) { const yy = y + k; const s = yy < 0 || yy >= N ? (isMax ? 0 : 1) : tmp[yy * N + x]; v = isMax ? v | s : v & s; }
      out[y * N + x] = v;
    }
    return out;
  }
  function blur(src, r, passes) {
    const N = MS;
    let a = Float32Array.from(src), b = new Float32Array(N * N);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < N) { s += a[y * N + xx]; n++; } }
        b[y * N + x] = s / n;
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < N) { s += b[yy * N + x]; n++; } }
        a[y * N + x] = s / n;
      }
    }
    return a;
  }
  // keep the components that look like a subject, fill their holes
  function cleanup(bin) {
    const N = MS, lab = new Int32Array(N * N).fill(-1), stack = new Int32Array(N * N);
    const comps = [];
    for (let i = 0; i < N * N; i++) {
      if (!bin[i] || lab[i] >= 0) continue;
      const id = comps.length;
      let sp = 0, area = 0, sx = 0, sy = 0, top = 0, side = 0, bottom = 0;
      stack[sp++] = i;
      lab[i] = id;
      while (sp) {
        const j = stack[--sp], x = j % N, y = (j / N) | 0;
        area++; sx += x; sy += y;
        if (y === 0) top++;
        if (x === 0 || x === N - 1) side++;
        if (y === N - 1) bottom++;
        const nb = [x > 0 ? j - 1 : -1, x < N - 1 ? j + 1 : -1, y > 0 ? j - N : -1, y < N - 1 ? j + N : -1];
        for (const k of nb) if (k >= 0 && bin[k] && lab[k] < 0) { lab[k] = id; stack[sp++] = k; }
      }
      comps.push({ id, area, cx: sx / area / N, cy: sy / area / N, top, side, bottom });
    }
    const keep = new Set();
    comps.sort((a, b) => b.area - a.area);
    const big = comps[0];
    if (!big) return null;
    for (const c of comps) {
      const central = Math.abs(c.cx - 0.5) < 0.38 && c.cy > 0.08;
      if (c === big || (c.area > big.area * 0.18 && central)) keep.add(c.id);
    }
    const out = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) if (lab[i] >= 0 && keep.has(lab[i])) out[i] = 1;
    // fill holes: background reachable from the border stays background
    const seen = new Uint8Array(N * N);
    let sp = 0;
    for (let x = 0; x < N; x++) for (const y of [0, N - 1]) { const j = y * N + x; if (!out[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
    for (let y = 0; y < N; y++) for (const x of [0, N - 1]) { const j = y * N + x; if (!out[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; } }
    while (sp) {
      const j = stack[--sp], x = j % N, y = (j / N) | 0;
      const nb = [x > 0 ? j - 1 : -1, x < N - 1 ? j + 1 : -1, y > 0 ? j - N : -1, y < N - 1 ? j + N : -1];
      for (const k of nb) if (k >= 0 && !out[k] && !seen[k]) { seen[k] = 1; stack[sp++] = k; }
    }
    for (let i = 0; i < N * N; i++) if (!out[i] && !seen[i]) out[i] = 1;
    return out;
  }

  // where things are in a 0..1 mask (MS x MS) plus the cover's luminance
  function analyze(M, Y) {
    const N = MS;
    let area = 0, sx = 0, sy = 0, x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (M[y * N + x] < 0.5) continue;
      area++; sx += x; sy += y;
      if (x < x0 * N) x0 = x / N; if (x > x1 * N) x1 = x / N;
      if (y < y0 * N) y0 = y / N; if (y > y1 * N) y1 = y / N;
    }
    if (area < N * N * 0.01) return null;
    const cx = sx / area / N, cy = sy / area / N;
    // head: the top part of the subject
    const hy0 = Math.floor(y0 * N), hy1 = Math.floor((y0 + (y1 - y0) * 0.3) * N);
    let hs = 0, hx = 0, hyS = 0, rows = 0, widths = 0;
    for (let y = hy0; y <= hy1; y++) {
      let w = 0;
      for (let x = 0; x < N; x++) if (M[y * N + x] >= 0.5) { hs++; hx += x; hyS += y; w++; }
      if (w) { rows++; widths += w; }
    }
    const head = hs ? [hx / hs / N, hyS / hs / N, Math.max(0.08, widths / Math.max(1, rows) / N)] : [cx, y0 + 0.1, 0.2];
    // detail: strongest local contrast inside the head band (eyes, logos, edges)
    let best = -1, dx = head[0], dy = head[1];
    const R = 3;
    const yA = Math.max(R, hy0), yB = Math.min(N - R - 1, Math.floor((y0 + (y1 - y0) * 0.42) * N));
    for (let y = yA; y <= yB; y += 2) for (let x = R; x < N - R; x += 2) {
      if (M[y * N + x] < 0.6) continue;
      let s = 0, s2 = 0, n = 0;
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const v = Y[(y + j) * N + x + i]; s += v; s2 += v * v; n++; }
      const varc = s2 / n - (s / n) * (s / n);
      const score = varc * (1 - 0.6 * Math.abs(x / N - head[0]));
      if (score > best) { best = score; dx = x / N; dy = y / N; }
    }
    // outline points, ordered around the centre
    const pts = [];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      if (M[i] < 0.5) continue;
      if (M[i - 1] < 0.5 || M[i + 1] < 0.5 || M[i - N] < 0.5 || M[i + N] < 0.5) pts.push([x / N, y / N, Math.atan2(y / N - cy, x / N - cx)]);
    }
    pts.sort((a, b) => a[2] - b[2]);
    const step = Math.max(1, Math.floor(pts.length / 140));
    const edge = [];
    for (let i = 0; i < pts.length; i += step) edge.push(pts[i][0], pts[i][1]);
    const cov = new Float32Array(N);
    for (let y = 0; y < N; y++) { let w = 0; for (let x = 0; x < N; x++) if (M[y * N + x] >= 0.5) w++; cov[y] = w / N; }
    return { area: area / (N * N), bbox: [x0, y0, x1 + 1 / N, y1 + 1 / N], c: [cx, cy], head, detail: [dx, dy], edge: new Float32Array(edge), cov };
  }
  function maskCanvas(M) {
    const c = document.createElement('canvas');
    c.width = c.height = MS;
    const x = c.getContext('2d');
    const d = x.createImageData(MS, MS);
    for (let i = 0; i < MS * MS; i++) { const v = U.clamp(Math.round(M[i] * 255), 0, 255); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    x.putImageData(d, 0, 0);
    // smoother upsampled copy for the GPU
    const big = document.createElement('canvas');
    big.width = big.height = MS * 3;
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = true;
    bx.imageSmoothingQuality = 'high';
    bx.drawImage(c, 0, 0, big.width, big.height);
    return big;
  }

  O.Subject = {
    SIZE: MS,
    // a cut-out from the cover alone. Returns null when it isn't confident.
    guess(img) {
      const px = pixels(img, MS);
      if (!px) return null;
      const N = MS * MS;
      const { L, A, B, Y } = toLab(px, N);
      const border = [];
      const bw = 5;
      for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) if (x < bw || y < bw || x >= MS - bw || y >= MS - bw) border.push(y * MS + x);
      // k-means on the border colours
      const K = 5, cen = [], r = U.rng(77);
      cen.push(border[(r() * border.length) | 0]);
      const dist = (i, c) => { const dl = L[i] - c[0], da = A[i] - c[1], db = B[i] - c[2]; return Math.sqrt(0.45 * dl * dl + da * da + db * db); };
      let C = [[L[cen[0]], A[cen[0]], B[cen[0]]]];
      while (C.length < K) {
        let far = border[0], fd = -1;
        for (let k = 0; k < border.length; k += 3) { const i = border[k]; let d = 1e9; for (const c of C) d = Math.min(d, dist(i, c)); if (d > fd) { fd = d; far = i; } }
        C.push([L[far], A[far], B[far]]);
      }
      const cnt = new Float64Array(K);
      for (let it = 0; it < 9; it++) {
        const acc = C.map(() => [0, 0, 0]);
        cnt.fill(0);
        for (const i of border) {
          let bk = 0, bd = 1e9;
          for (let k = 0; k < K; k++) { const d = dist(i, C[k]); if (d < bd) { bd = d; bk = k; } }
          acc[bk][0] += L[i]; acc[bk][1] += A[i]; acc[bk][2] += B[i]; cnt[bk]++;
        }
        for (let k = 0; k < K; k++) if (cnt[k]) C[k] = [acc[k][0] / cnt[k], acc[k][1] / cnt[k], acc[k][2] / cnt[k]];
      }
      const bg = C.filter((c, k) => cnt[k] > border.length * 0.06);
      const D = new Float32Array(N);
      for (let i = 0; i < N; i++) { let d = 1e9; for (const c of bg) d = Math.min(d, dist(i, c)); D[i] = d; }
      const bd = border.map((i) => D[i]).sort((a, b) => a - b);
      const t0 = bd[Math.floor(bd.length * 0.9)] + 3, t1 = t0 + 16;
      const S = new Float32Array(N);
      for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
        const i = y * MS + x;
        const s = U.sat((D[i] - t0) / (t1 - t0));
        const px2 = (x / MS - 0.5) / 0.36, py2 = (y / MS - 0.58) / 0.42;
        S[i] = s * (0.35 + 0.65 * Math.exp(-0.5 * (px2 * px2 + py2 * py2)));
      }
      let bin = new Uint8Array(N);
      for (let i = 0; i < N; i++) bin[i] = S[i] > 0.4 ? 1 : 0;
      bin = morph(morph(bin, 2, true), 2, false); // close gaps
      bin = morph(morph(bin, 1, false), 1, true); // drop specks
      const clean = cleanup(bin);
      if (!clean) return null;
      // confidence: plausible size, clear separation, not glued to the top / sides
      let area = 0, inS = 0, outS = 0, nOut = 0, top = 0, side = 0;
      for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
        const i = y * MS + x;
        if (clean[i]) { area++; inS += S[i]; } else { outS += S[i]; nOut++; }
        if (clean[i] && y < 3) top++;
        if (clean[i] && (x < 3 || x >= MS - 3) && y < MS * 0.7) side++;
      }
      const af = area / N;
      const sep = inS / Math.max(1, area) - outS / Math.max(1, nOut);
      const conf = af > 0.06 && af < 0.7 && sep > 0.36 && top < MS * 3 * 0.35 && side < MS * 0.7 * 6 * 0.3;
      if (!conf) return null;
      const soft = blur(Float32Array.from(clean), 1, 2);
      const info = analyze(soft, Y);
      if (!info) return null;
      // a real subject is one solid shape, not scattered patches
      const bb = info.bbox, fill = info.area / Math.max(1e-4, (bb[2] - bb[0]) * (bb[3] - bb[1]));
      if (fill < 0.42) return null;
      info.kind = 'guess';
      info.canvas = maskCanvas(soft);
      info.res = MS * 3;
      return info;
    },
    // a cut-out the app made (grey PNG, white = subject)
    fromMask(maskImg, coverImg) {
      const mp = pixels(maskImg, MS);
      const cp = coverImg ? pixels(coverImg, MS) : null;
      if (!mp) return null;
      const N = MS * MS, M = new Float32Array(N);
      for (let i = 0; i < N; i++) M[i] = mp[i * 4] / 255;
      const Y = cp ? toLab(cp, N).Y : new Float32Array(N).fill(0.5);
      const info = analyze(M, Y);
      if (!info || info.area > 0.9) return null;
      info.kind = 'ml';
      info.canvas = maskImg;
      info.res = maskImg.naturalWidth || maskImg.width || 1024;
      return info;
    },
    // no subject: the whole cover acts as a card
    card(coverImg) {
      const cp = coverImg ? pixels(coverImg, MS) : null;
      const N = MS * MS;
      const Y = cp ? toLab(cp, N).Y : new Float32Array(N).fill(0.5);
      const M = new Float32Array(N);
      const m0 = Math.floor(MS * 0.04);
      for (let y = m0; y < MS - m0; y++) for (let x = m0; x < MS - m0; x++) M[y * MS + x] = 1;
      const info = analyze(M, Y);
      info.kind = 'card';
      info.head = [0.5, 0.36, 0.42];
      info.res = MS;
      return info;
    },
  };
})();
