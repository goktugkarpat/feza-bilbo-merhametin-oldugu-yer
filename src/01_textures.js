/* ── Dokular: prosedürel, döşenebilir yüzey dokuları (renk + normal haritası) ──
   TEX.init() ortak ve orman yüzeylerini üretir; kefir/mağara/yanardağ/şehir/kale yüzeyleri TEX.ensure(tema) ile (ya da ilk kullanıldıkları an) üretilir;
   TEX.release(tema) / TEX.keepOnly(bölge) geride kalan bölgelerin yüzeylerini bellekten atar (gerekirse yeniden üretilir).
   Her yüzey: TEX.<ad> = { map, normalMap } (init'ten sonra hepsi var); TEX.M.<ad> = bir karonun metre boyu.
   normalMap'in alfa kanalı yüksekliği (0..1) taşır (zemin karışımlarında "yüksekliğe göre geçiş" için). */
const TEX = (function () {
  'use strict';
  // Metres covered by one texture tile.
  const M = { grass: 4, dirt: 3, cobble: 3, caveFloor: 4, caveSand: 3, castleFloor: 4, carpet: 2, brick: 2, rock: 3, wood: 1,
    bark: 1, roof: 2, plaster: 1, leaves: 2, fabric: 0.5, metal: 0.5, moss: 2, basalt: 4, ash: 3, lava: 6,
    yogurt: 4, biscuit: 3, cheese: 4, milk: 6, swiss: 1.5, townStone: 3, townPath: 4, plaza: 4, rampart: 3.6 };
  // Suggested material settings (TEX.mat): roughness, normalScale, metalness.
  const HINT = { grass: [0.9, 1], dirt: [0.95, 1], cobble: [0.8, 1], caveFloor: [0.75, 1], caveSand: [0.95, 1], castleFloor: [0.32, 0.8],
    carpet: [0.95, 0.8], brick: [0.85, 1], rock: [0.85, 1], wood: [0.7, 1], bark: [0.9, 1], roof: [0.55, 1], plaster: [0.9, 1],
    leaves: [0.7, 0.9], fabric: [0.9, 0.8], metal: [0.35, 0.6, 1], moss: [0.95, 1], shirt: [0.85, 0.6],
    basalt: [0.78, 1], ash: [0.96, 1], lava: [0.55, 0.7],
    yogurt: [0.46, 0.75], biscuit: [0.88, 1], cheese: [0.5, 0.85], milk: [0.22, 0.5], swiss: [0.48, 0.8],
    townStone: [0.78, 1], townPath: [0.72, 0.9], plaza: [0.66, 0.9], rampart: [0.88, 1] };

  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fract = x => x - Math.floor(x);
  const hyp = (x, y) => Math.sqrt(x * x + y * y);   // Math.hypot is slow in hot loops
  const hex3 = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  // Integer hash → [0,1)
  function hash(a, b) {
    let h = Math.imul(a ^ 0x5bd1e995, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  // Colour ramp → 256-entry LUT (stops: [[t, hex], ...], sRGB 0..255)
  function ramp(stops) {
    const L = new Float32Array(768);
    for (let i = 0; i < 256; i++) {
      const t = i / 255; let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const a = stops[k], b = stops[k + 1], u = clamp((t - a[0]) / (b[0] - a[0] || 1), 0, 1), ca = hex3(a[1]), cb = hex3(b[1]);
      for (let c = 0; c < 3; c++) L[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * u;
    }
    return L;
  }
  const li = t => (t <= 0 ? 0 : t >= 1 ? 255 : (t * 255) | 0);

  // ── Periodic value noise (quintic fade) — tiles because the lattice wraps (Px × Py cells over S pixels) ──
  function addNoise(out, S, Px, Py, seed, amp) {
    const r = mulberry32(seed * 7919 + Px * 131 + Py * 17), L = new Float32Array(Px * Py);
    for (let i = 0; i < L.length; i++) L[i] = r();
    const xa = new Int32Array(S), xb = new Int32Array(S), xw = new Float32Array(S), ya = new Int32Array(S), yb = new Int32Array(S), yw = new Float32Array(S);
    const ox = r() * Px, oy = r() * Py;
    for (let x = 0; x < S; x++) {
      let f = (x + 0.5) * Px / S + ox, fi = Math.floor(f), t = f - fi;
      xa[x] = fi % Px; xb[x] = (fi + 1) % Px; xw[x] = t * t * t * (t * (t * 6 - 15) + 10);
      f = (x + 0.5) * Py / S + oy; fi = Math.floor(f); t = f - fi;
      ya[x] = (fi % Py) * Px; yb[x] = ((fi + 1) % Py) * Px; yw[x] = t * t * t * (t * (t * 6 - 15) + 10);
    }
    const row = new Float32Array(Px);
    for (let y = 0; y < S; y++) {
      const a = ya[y], b = yb[y], w = yw[y];
      for (let i = 0; i < Px; i++) { const la = L[a + i]; row[i] = la + (L[b + i] - la) * w; }
      const o = y * S;
      for (let x = 0; x < S; x++) { const u = row[xa[x]]; out[o + x] += (u + (row[xb[x]] - u) * xw[x]) * amp; }
    }
  }
  const NC = {};
  // Tileable fbm normalised to 0..1. Py ≠ P gives stretched (anisotropic) noise: streaks along the axis with fewer cells.
  function fbm(S, P, oct, seed, gain = 0.5, Py = P) {
    const key = S + '_' + P + '_' + Py + '_' + oct + '_' + seed + '_' + gain;
    if (NC[key]) return NC[key];
    const n = S * S, out = new Float32Array(n);
    let amp = 1, px = P, py = Py;
    for (let o = 0; o < oct && px <= S / 2 && py <= S / 2; o++) { addNoise(out, S, px, py, seed + o * 101, amp); amp *= gain; px *= 2; py *= 2; }
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < n; i++) { const v = out[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const k = 1 / (hi - lo || 1);
    for (let i = 0; i < n; i++) out[i] = (out[i] - lo) * k;
    return (NC[key] = out);
  }
  // Bilinear wrap-around sample of a field
  function samp(F, S, x, y) {
    const m = S - 1; x -= 0.5; y -= 0.5;
    const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi;
    const x0 = xi & m, x1 = (xi + 1) & m, y0 = (yi & m) * S, y1 = ((yi + 1) & m) * S;
    const a = F[y0 + x0] + (F[y0 + x1] - F[y0 + x0]) * tx, b = F[y1 + x0] + (F[y1 + x1] - F[y1 + x0]) * tx;
    return a + (b - a) * ty;
  }

  // ── Periodic Voronoi: E = distance to the nearest cell border (uniform grooves), F1, C = cell index, ID = random per cell ──
  // sk > 0: smooth-min over the borders → rounded cell corners (pebbly cobbles). hex (N even): odd rows shifted half a cell →
  // mostly 6-sided cells (basalt columns).
  function voronoi(S, N, seed, jit, sk = 0, hex = false) {
    const c = S / N, r = mulberry32(seed * 131 + N), nc = N * N, W = N + 4, nw = W * W;
    const PX = new Float32Array(nc), PY = new Float32Array(nc), ID = new Float32Array(nc);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; PX[k] = (i + 0.5 + (hex ? (j & 1 ? 0.25 : -0.25) : 0) + (r() - 0.5) * jit) * c; PY[k] = (j + 0.5 + (r() - 0.5) * jit) * c; ID[k] = r();
    }
    // padded grid (cells -2..N+1) with wrapped points already offset → no wrap logic in the pixel loop
    const EX = new Float32Array(nw), EY = new Float32Array(nw), EK = new Int32Array(nw);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const ci = i - 2, cj = j - 2, iw = (ci + N) % N, jw = (cj + N) % N, k = jw * N + iw, e = j * W + i;
      EX[e] = PX[k] + (ci < 0 ? -S : ci >= N ? S : 0); EY[e] = PY[k] + (cj < 0 ? -S : cj >= N ? S : 0); EK[e] = k;
    }
    // per cell and neighbour: the bisector as (unit normal, offset) → border distance = CS - p·n
    const NB = [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1], NX = new Float32Array(nw * 8), NY = new Float32Array(nw * 8), CS = new Float32Array(nw * 8).fill(1e9);
    for (let j = 1; j < W - 1; j++) for (let i = 1; i < W - 1; i++) {
      const e = j * W + i;
      for (let q = 0; q < 8; q++) {
        const f = e + NB[q], dx = EX[f] - EX[e], dy = EY[f] - EY[e], l = hyp(dx, dy);
        if (l < 1e-4) continue;
        const nx = dx / l, ny = dy / l, p = e * 8 + q;
        NX[p] = nx; NY[p] = ny; CS[p] = (EX[f] + EX[e]) * 0.5 * nx + (EY[f] + EY[e]) * 0.5 * ny;
      }
    }
    const n = S * S, F1 = new Float32Array(n), E = new Float32Array(n), C = new Int32Array(n), isk = sk ? 1 / sk : 0;
    for (let y = 0, o = 0; y < S; y++) {
      const Y = y + 0.5, row = (Math.floor(Y / c) + 2) * W + 2;
      for (let x = 0; x < S; x++, o++) {
        const X = x + 0.5, b0 = row + Math.floor(X / c);
        let bd = 1e9, be = b0;
        for (let dj = -W; dj <= W; dj += W) for (let di = -1; di <= 1; di++) {
          const e = b0 + dj + di, qx = EX[e] - X, qy = EY[e] - Y, d = qx * qx + qy * qy;
          if (d < bd) { bd = d; be = e; }
        }
        let ed = 1e9, es = 0;
        for (let q = 0, p = be * 8; q < 8; q++, p++) {
          const t = CS[p] - X * NX[p] - Y * NY[p];
          if (t < ed) ed = t;
          if (sk) es += Math.exp(-t * isk);
        }
        F1[o] = Math.sqrt(bd); E[o] = sk ? -sk * Math.log(es) : ed; C[o] = EK[be];
      }
    }
    return { F1, E, C, ID, N, c };
  }

  // Separable wrap-around box blur (run twice ≈ gaussian). The vertical pass walks rows with one running sum per column
  // (cache-friendly; same sums in the same order as a column-by-column pass, so the result is identical).
  function blur(src, S, r) {
    const n = S * S, m = S - 1, tmp = new Float32Array(n), out = new Float32Array(n), inv = 1 / (2 * r + 1), col = new Float64Array(S);
    for (let y = 0; y < S; y++) {
      const o = y * S; let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[o + (k & m)];
      for (let x = 0; x < S; x++) { tmp[o + x] = acc * inv; acc += src[o + ((x + r + 1) & m)] - src[o + ((x - r) & m)]; }
    }
    for (let k = -r; k <= r; k++) { const o = (k & m) * S; for (let x = 0; x < S; x++) col[x] += tmp[o + x]; }
    for (let y = 0; y < S; y++) {
      const o = y * S, a = ((y + r + 1) & m) * S, b = ((y - r) & m) * S;
      for (let x = 0; x < S; x++) { out[o + x] = col[x] * inv; col[x] += tmp[a + x] - tmp[b + x]; }
    }
    return out;
  }
  // Cavity shading: darken pixels lower than their blurred neighbourhood (grooves), lift ridges a touch.
  function cavity(A, H, S, r, k, lo, hi = 1.06) {
    const B = blur(blur(H, S, r), S, r), n = S * S;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const f = clamp(1 + (H[i] - B[i]) * k, lo, hi);
      A[o] *= f; A[o + 1] *= f; A[o + 2] *= f;
    }
  }
  // Height → tangent-space normal map (OpenGL, +Y = +v; DataTexture row 0 = v 0). Alpha = normalised height.
  function normals(H, S, k) {
    const n = S * S, m = S - 1, out = new Uint8ClampedArray(n * 4);
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < n; i++) { const v = H[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const hk = 255 / (hi - lo || 1);
    for (let y = 0; y < S; y++) {
      const yo = y * S, yu = ((y + 1) & m) * S, yd = ((y - 1) & m) * S;
      for (let x = 0; x < S; x++) {
        const i = yo + x, dx = (H[yo + ((x + 1) & m)] - H[yo + ((x - 1) & m)]) * k, dy = (H[yu + x] - H[yd + x]) * k;
        const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1), o = i * 4;
        out[o] = (0.5 - dx * inv * 0.5) * 255; out[o + 1] = (0.5 - dy * inv * 0.5) * 255; out[o + 2] = (0.5 + inv * 0.5) * 255;
        out[o + 3] = (H[i] - lo) * hk;
      }
    }
    return out;
  }
  function dtex(data, S, srgb) {
    const t = new THREE.DataTexture(new Uint8Array(data.buffer), S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = ANISO; t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  }
  const surf = (A, H, S, k) => {
    for(let i=0;i<A.length;i+=4){const r=A[i],g=A[i+1],b=A[i+2],l=r*0.3+g*0.5+b*0.2;A[i]=r*0.38+l*0.22;A[i+1]=g*0.35+l*0.23;A[i+2]=b*0.38+l*0.24;}
    return {map:dtex(A,S,true),normalMap:dtex(normals(H,S,k),S,false)};
  };
  function paint(A, i, L, t, s) { const o = i * 4, j = li(t) * 3; A[o] = L[j] * s; A[o + 1] = L[j + 1] * s; A[o + 2] = L[j + 2] * s; A[o + 3] = 255; }
  function blend(A, i, r, g, b, a) { const o = i * 4; A[o] += (r - A[o]) * a; A[o + 1] += (g - A[o + 1]) * a; A[o + 2] += (b - A[o + 2]) * a; }

  // Scatter rounded, slightly irregular pebbles that sit on the existing height field.
  function pebbles(A, H, S, seed, count, r0, r1, pal, hk, pw = 2.2) {
    const m = S - 1, R = mulberry32(seed), P = pal.map(hex3);
    for (let n = 0; n < count; n++) {
      const cx = R() * S, cy = R() * S, rr = r0 + (r1 - r0) * Math.pow(R(), pw), asp = 0.6 + R() * 0.4, an = R() * Math.PI;
      const ca = Math.cos(an), sa = Math.sin(an), p1 = R() * TAU, p2 = R() * TAU, c = P[(R() * P.length) | 0], br = 0.84 + R() * 0.3;
      const ry = rr * asp, ext = rr * 1.25 + 1, hb = H[((cy | 0) & m) * S + ((cx | 0) & m)] + 0.02, ht = hk * (0.4 + 0.6 * rr / r1);
      const ph = R() * 50;
      for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, u = (qx * ca + qy * sa) / rr, v = (-qx * sa + qy * ca) / ry;
        const d0 = Math.sqrt(u * u + v * v); if (d0 > 1.35) continue;
        const th = Math.atan2(v, u), d = d0 / (1 + 0.12 * Math.sin(2 * th + p1) + 0.07 * Math.sin(3 * th + p2));
        const cov = clamp((1 - d) * ry + 0.5, 0, 1); if (cov <= 0) continue;
        const dome = Math.sqrt(Math.max(0, 1 - d * d)), h = hb + dome * ht, i = (py & m) * S + (px & m);
        if (h <= H[i]) continue;
        const sh = br * (0.74 + 0.26 * Math.sqrt(dome)) * (0.95 + 0.1 * hash(px & m, (py & m) + ph));
        blend(A, i, c[0] * sh, c[1] * sh, c[2] * sh, cov);
        H[i] += (h - H[i]) * cov;
      }
    }
  }

  // ───────────────────────────────────── Surfaces ─────────────────────────────────────
  function genGrass() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    // keep tile-sized (4 m) variation weak so the repeat doesn't show; most mottling is at 0.5–1 m
    const m4 = fbm(S, 4, 2, 11), m8 = fbm(S, 8, 4, 14), pat = fbm(S, 16, 3, 12), fine = fbm(S, 64, 2, 8), mot = new Float32Array(n);
    for (let i = 0; i < n; i++) mot[i] = m4[i] * 0.3 + m8[i] * 0.7;
    const base = ramp([[0, 0x282e28], [0.5, 0x41483b], [1, 0x61624b]]);
    const bl = ramp([[0, 0x393d31], [0.3, 0x4c503e], [0.58, 0x64664b], [0.82, 0x7b7757], [1, 0x9b9271]]);
    for (let i = 0; i < n; i++) { paint(A, i, base, 0.15 + mot[i] * 0.55 + fine[i] * 0.2, 1); H[i] = fine[i] * 0.08; }
    const R = mulberry32(21), NB = 15000;
    for (let b = 0; b < NB; b++) {
      const x0 = R() * S, y0 = R() * S, a = R() * TAU, len = 8 + R() * 13, w0 = 1.1 + R() * 0.9, bend = (R() - 0.5) * 0.5;
      const dx = Math.cos(a), dy = Math.sin(a), mi = ((y0 | 0) & m) * S + ((x0 | 0) & m);
      const tone = clamp(0.2 + mot[mi] * 0.36 + pat[mi] * 0.2 + R() * 0.34, 0, 1), hb = R() * 0.3, j = li(tone) * 3;
      const cr = bl[j], cg = bl[j + 1], cb = bl[j + 2];
      const x1 = x0 + dx * len, y1 = y0 + dy * len, pad = w0 + 1.5 + Math.abs(bend) * len * 0.3;
      const bx0 = Math.floor(Math.min(x0, x1) - pad), bx1 = Math.ceil(Math.max(x0, x1) + pad);
      const by0 = Math.floor(Math.min(y0, y1) - pad), by1 = Math.ceil(Math.max(y0, y1) + pad);
      for (let py = by0; py <= by1; py++) for (let px = bx0; px <= bx1; px++) {
        const qx = px + 0.5 - x0, qy = py + 0.5 - y0, s = (qx * dx + qy * dy) / len;
        if (s < 0 || s > 1) continue;
        const d = -qx * dy + qy * dx - bend * len * s * s, w = w0 * (1 - s * 0.82), cov = clamp(w - Math.abs(d) + 0.5, 0, 1);
        if (cov <= 0) continue;
        const e = d / w, h = hb + s * 0.62 + (1 - e * e) * 0.08, i = (py & m) * S + (px & m);
        if (h <= H[i]) continue;
        const k = (0.66 + 0.46 * s) * (1 + (1 - Math.abs(e)) * 0.06);
        blend(A, i, cr * k, cg * k, cb * k, cov);
        H[i] += (h - H[i]) * cov;
      }
    }
    // Rare tiny flowers: white daisies and yellow buttercups, a few in little clusters
    const F = mulberry32(23);
    for (let c = 0; c < 0; c++) {
      const cx = F() * S, cy = F() * S, cnt = 1 + ((F() * 3) | 0), daisy = F() < 0.5;
      for (let f = 0; f < cnt; f++) {
        const fx = cx + (F() - 0.5) * 30, fy = cy + (F() - 0.5) * 30, R0 = daisy ? 3.2 + F() * 1.2 : 2.6 + F() * 0.9, rot = F() * TAU;
        for (let py = Math.floor(fy - R0 - 2); py <= fy + R0 + 2; py++) for (let px = Math.floor(fx - R0 - 2); px <= fx + R0 + 2; px++) {
          const qx = px + 0.5 - fx, qy = py + 0.5 - fy, r = Math.sqrt(qx * qx + qy * qy), th = Math.atan2(qy, qx) + rot;
          const pr = R0 * (daisy ? 0.5 + 0.5 * Math.abs(Math.cos(2.5 * th)) : 0.72 + 0.28 * Math.abs(Math.cos(2.5 * th)));
          const cov = clamp(pr - r + 0.5, 0, 1); if (cov <= 0) continue;
          const i = (py & m) * S + (px & m), ctr = r < R0 * (daisy ? 0.34 : 0.3);
          const shade = 0.86 + 0.14 * clamp(r / R0, 0, 1);
          if (ctr) blend(A, i, daisy ? 250 : 240, daisy ? 196 : 150, daisy ? 40 : 30, cov);
          else if (daisy) blend(A, i, 240 * shade, 238 * shade, 228 * shade, cov);
          else blend(A, i, 255 * shade, 214 * shade, 48 * shade, cov);
          H[i] += (1.0 + (1 - r / R0) * 0.15 - H[i]) * cov;
        }
      }
    }
    cavity(A, H, S, 3, 1.1, 0.62, 1.08);
    return surf(A, H, S, 3.2);
  }

  function genDirt() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const b3 = fbm(S, 3, 2, 31), b6 = fbm(S, 6, 4, 37), mid = fbm(S, 12, 3, 32), fine = fbm(S, 96, 2, 33), V = voronoi(S, 7, 34, 0.9), wob = fbm(S, 16, 2, 35);
    const pal = ramp([[0, 0x5e3a1f], [0.3, 0x7d5230], [0.62, 0x9e7045], [1, 0xbf9463]]), big = new Float32Array(n);
    for (let i = 0; i < n; i++) big[i] = b3[i] * 0.35 + b6[i] * 0.65;
    for (let i = 0; i < n; i++) {
      const t = 0.08 + big[i] * 0.5 + mid[i] * 0.34;
      const crack = ss(0.58, 0.75, t) * ss(0.46, 0.62, mid[i]) * (1 - ss(0.3, 2.0, V.E[i] + (wob[i] - 0.5) * 3));
      paint(A, i, pal, t + (fine[i] - 0.5) * 0.16, 1 - crack * 0.3);
      H[i] = big[i] * 0.45 + mid[i] * 0.3 + fine[i] * 0.1 - crack * 0.16;
    }
    pebbles(A, H, S, 36, 270, 1.8, 11, [0x9a948a, 0xb89c78, 0xa0684a, 0xc2b69e, 0x857a6c, 0xb08a62], 0.5);
    cavity(A, H, S, 3, 1.5, 0.55, 1.08);
    return surf(A, H, S, 3.5);
  }

  function genCobble() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 10, 41, 0.6, 4.5), wob = fbm(S, 16, 3, 42), mot = fbm(S, 32, 3, 43), big = fbm(S, 4, 4, 44), fine = fbm(S, 128, 1, 7), grit = fbm(S, 64, 2, 8);
    const pal = [0xa39b91, 0xb2a99c, 0x979494, 0xb7a58e, 0xa8917e, 0x8f8a84, 0xbdb4a6, 0x9c9ea2].map(hex3);
    for (let i = 0; i < n; i++) {
      const k = V.C[i], id = V.ID[k], e = V.E[i] + (wob[i] - 0.5) * 5;
      const t = clamp((e - 2.2) / 17, 0, 1), dome = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - 2.2 + 0.5, 0, 1);
      const hs = 0.12 + dome * (0.75 + id * 0.25) + (mot[i] - 0.5) * 0.08 + (fine[i] - 0.5) * 0.02, hm = 0.03 + grit[i] * 0.07;
      H[i] = hm + (Math.max(hs, hm) - hm) * cov;
      const c = pal[(hash(k, 7) * pal.length) | 0];
      const br = (0.9 + hash(k, 9) * 0.2) * (0.9 + (mot[i] - 0.5) * 0.2 + (fine[i] - 0.5) * 0.05) * (0.68 + 0.32 * dome) * (1 + ss(0.75, 1, t) * 0.06);
      // mortar: dark sandy soil with moss creeping in
      const moss = ss(0.52, 0.72, big[i]) * (0.4 + grit[i] * 0.6);
      const mk = 0.8 + grit[i] * 0.4, mr = (92 + (80 - 92) * moss) * mk, mg = (82 + (118 - 82) * moss) * mk, mb = (70 + (46 - 70) * moss) * mk;
      const o = i * 4;
      A[o] = mr + (c[0] * br - mr) * cov; A[o + 1] = mg + (c[1] * br - mg) * cov; A[o + 2] = mb + (c[2] * br - mb) * cov; A[o + 3] = 255;
    }
    cavity(A, H, S, 4, 1.0, 0.62, 1.08);
    return surf(A, H, S, 5);
  }

  function genCaveFloor() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 4, 51, 0.8), wob = fbm(S, 8, 4, 52), mot = fbm(S, 8, 4, 53), crk = fbm(S, 5, 3, 54), crm = fbm(S, 3, 3, 55);
    const mos = fbm(S, 6, 4, 56), fuzz = fbm(S, 32, 3, 57), fine = fbm(S, 48, 3, 58), grit = fbm(S, 128, 1, 7);
    const pal = [0x656f7e, 0x727b89, 0x7c8594, 0x687581, 0x5e6673, 0x767f90].map(hex3);
    for (let i = 0; i < n; i++) {
      const k = V.C[i], id = V.ID[k], e = V.E[i] + (wob[i] - 0.5) * 9;
      const t = ss(0, 1, (e - 2.2) / 7), cov = clamp(e - 2.2 + 0.5, 0, 1);
      const cl = (1 - ss(0.006, 0.026, Math.abs(crk[i] - 0.5))) * ss(0.55, 0.7, crm[i]) * t;
      let h = 0.1 + t * (0.55 + id * 0.18) + fine[i] * 0.1 * t - cl * 0.28 + (grit[i] - 0.5) * 0.02;
      const c = pal[(hash(k, 3) * pal.length) | 0], br = (0.9 + hash(k, 5) * 0.2) * (0.86 + mot[i] * 0.22 + (fine[i] - 0.5) * 0.1) * (1 - cl * 0.4) * (0.88 + 0.12 * t);
      const g = 0.8 + grit[i] * 0.3;
      let r = 62 * g + (c[0] * br - 62 * g) * cov, gg = 68 * g + (c[1] * br - 68 * g) * cov, b = 80 * g + (c[2] * br - 80 * g) * cov;
      // teal moss: some of the joints and a few soft patches
      const ma = clamp(((1 - t) * ss(0.42, 0.62, mos[i]) + ss(0.74, 0.9, mos[i]) * 0.55) * ss(0.25, 0.65, fuzz[i]) * 1.3, 0, 0.85);
      r += (68 + fuzz[i] * 25 - r) * ma; gg += (79 + fuzz[i] * 30 - gg) * ma; b += (54 + fuzz[i] * 22 - b) * ma;
      h += ma * (0.06 + fuzz[i] * 0.08);
      const o = i * 4; A[o] = r; A[o + 1] = gg; A[o + 2] = b; A[o + 3] = 255; H[i] = h;
    }
    cavity(A, H, S, 4, 0.95, 0.66, 1.08);
    return surf(A, H, S, 4);
  }

  function genCaveSand() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const big = fbm(S, 6, 4, 61), mid = fbm(S, 16, 3, 62), fine = fbm(S, 128, 1, 7), grain = fbm(S, 64, 2, 8);
    const pal = ramp([[0, 0x7b6c58], [0.45, 0xa39275], [1, 0xc2b18f]]);
    for (let i = 0; i < n; i++) {
      const t = 0.1 + big[i] * 0.45 + mid[i] * 0.4;
      paint(A, i, pal, t + (grain[i] - 0.5) * 0.14 + (fine[i] - 0.5) * 0.08, 1);
      H[i] = big[i] * 0.35 + mid[i] * 0.25 + fine[i] * 0.12;
    }
    pebbles(A, H, S, 64, 420, 1.6, 8, [0x8a8a8c, 0xa39c8e, 0x6f7078, 0xb8ac96, 0x8c8e98, 0x7b6f60], 0.45, 2.5);
    // A few tiny crystal chips (teal / lilac)
    pebbles(A, H, S, 65, 26, 1.4, 2.4, [0x9d927b, 0x847464, 0xa69e8a], 0.3, 1);
    cavity(A, H, S, 3, 1.4, 0.58, 1.08);
    return surf(A, H, S, 3.2);
  }

  function genCastleFloor() {
    const S = 512, n = S * S, T = 128, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const warp = fbm(S, 4, 5, 71), cloud = fbm(S, 8, 4, 72), fine = fbm(S, 128, 1, 7), w2 = fbm(S, 16, 3, 74);
    const pal = [0x918b7e, 0x9b9283, 0x898579, 0x948c7d, 0x918b80, 0xa39887].map(hex3);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const tx = (x & (T - 1)) + 0.5, ty = (y & (T - 1)) + 0.5, k = (y >> 7) * 4 + (x >> 7), id = hash(k, 71);
      const e = Math.min(tx, T - tx, ty, T - ty), t = clamp((e - 1.7) / 5, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t));
      const cov = clamp(e - 1.7 + 0.5, 0, 1);
      // marble veins, a different cut per tile
      const an = id * Math.PI, u = tx * Math.cos(an) + ty * Math.sin(an);
      const v1 = Math.abs(Math.sin(u * 0.03 + warp[i] * 7 + id * 20)), v2 = Math.abs(Math.sin(u * 0.07 + w2[i] * 5 + id * 9));
      const vein = Math.pow(1 - v1, 18) * 0.9 + Math.pow(1 - v2, 30) * 0.5 * ss(0.4, 0.7, cloud[i]);
      const c = pal[(hash(k, 72) * pal.length) | 0], br = (0.9 + hash(k, 73) * 0.06) * (0.93 + cloud[i] * 0.12 + (fine[i] - 0.5) * 0.03) * (0.8 + 0.2 * bev);
      let r = c[0] * br, g = c[1] * br, b = c[2] * br;
      const va = clamp(vein, 0, 1) * 0.55;
      r += (182 - r) * va; g += (169 - g) * va; b += (144 - b) * va;
      const gr = 88 + fine[i] * 16;
      r = gr + (r - gr) * cov; g = gr * 0.95 + (g - gr * 0.95) * cov; b = gr * 1.12 + (b - gr * 1.12) * cov;
      let h = 0.1 + fine[i] * 0.05 + (0.9 + (cloud[i] - 0.5) * 0.02 - 0.1) * bev * cov;
      // gold inlay diamonds at the tile corners (covering the grout)
      const cx = Math.min(tx, T - tx), cy = Math.min(ty, T - ty), dd = cx + cy;
      if (dd < 20) {
        const ring = clamp(2.6 - Math.abs(dd - 15), 0, 1), dot = clamp(7.2 - Math.max(cx, cy) * 1.25 - Math.min(cx, cy) * 0.4, 0, 1), inset = clamp(18.8 - dd, 0, 1);
        const gold = Math.max(ring, dot), sheen = 0.78 + 0.34 * clamp((cy - cx) / 14 + 0.5, 0, 1);
        const ir = 129, ig = 116, ib = 97;
        r += (ir - r) * inset; g += (ig - g) * inset; b += (ib - b) * inset;
        r += (176 * sheen - r) * gold; g += (128 * sheen - g) * gold; b += (84 * sheen - b) * gold;
        h += (0.97 - h) * inset; h -= (1 - gold) * inset * 0.03 * (1 - ring);
      }
      const o = i * 4; A[o] = r; A[o + 1] = g; A[o + 2] = b; A[o + 3] = 255; H[i] = h;
    }
    cavity(A, H, S, 3, 0.9, 0.7, 1.05);
    return surf(A, H, S, 3);
  }

  // Damask motif SDF helpers (motif space: [-1,1]², y up)
  const sdCircle = (x, y, cx, cy, r) => hyp(x - cx, y - cy) - r;
  function ellipse(cx, cy, rx, ry, an) {
    const c = Math.cos(an), s = Math.sin(an), k = Math.min(rx, ry);
    return (x, y) => { const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry; return (Math.sqrt(u * u + v * v) - 1) * k; };
  }
  function rhombus(a, b) { const k = a * b / hyp(a, b); return (x, y) => (Math.abs(x) / a + Math.abs(y) / b - 1) * k; }
  const DM = [rhombus(0.2, 0.52), rhombus(0.13, 0.36), rhombus(0.07, 0.22), ellipse(0.36, 0.2, 0.25, 0.085, 0.65), ellipse(0.33, -0.26, 0.22, 0.075, -0.6),
    ellipse(0.16, 0.7, 0.12, 0.04, -0.5), ellipse(0.15, -0.72, 0.11, 0.035, 0.5)];
  function damask(u, v) {
    const x = Math.abs(u), y = v;
    if (x > 0.82 || Math.abs(y) > 0.88) return 0.1;
    let d = Math.max(DM[0](x, y), -DM[1](x, y));
    d = Math.min(d, DM[2](x, y), DM[3](x, y), DM[4](x, y), DM[5](x, y), DM[6](x, y));
    const ring = Math.abs(sdCircle(x, y, 0.6, 0.04, 0.15)) - 0.026;
    d = Math.min(d, Math.max(ring, -y), sdCircle(x, y, 0.6, -0.1, 0.05));
    return Math.min(d, sdCircle(x, y, 0, 0.66, 0.075), sdCircle(x, y, 0, 0.8, 0.04), sdCircle(x, y, 0, -0.66, 0.06));
  }
  function rosette(u, v) {
    const r = hyp(u, v), ring = Math.max(Math.abs(r - 0.28) - 0.012, 0);
    if (r > 0.22) return ring;
    const th = Math.atan2(v, u);
    return Math.min(r - 0.2 * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(4 * th)), 0.6)), ring);
  }
  function genCarpet() {
    const S=512,n=S*S,A=new Uint8ClampedArray(n*4),H=new Float32Array(n),big=fbm(S,4,4,81),mid=fbm(S,32,3,83),fine=fbm(S,128,1,7);
    for(let y=0,i=0;y<S;y++)for(let x=0;x<S;x++,i++){
      const u=((x+128)&255)-128,v=((y+128)&255)-128,ax=Math.abs(u),ay=Math.abs(v);
      const cloth=.75+big[i]*.22+(fine[i]-.5)*.11,tw=.5+.5*Math.sin((x+y*2)*TAU/6);
      const seam=Math.max(0,1-Math.abs(ax-113)/2.3),cross=(ax<4&&ay<84)||(Math.abs(v+28)<4&&ax<44),scar=Math.abs(v-u*.72-20)<1.5&&ax<86;
      const patch=ss(.64,.78,big[i])*(.35+mid[i]*.5),rune=cross?.74:scar?.35:0;
      let r=135*cloth,g=81*cloth,b=95*cloth;r+=(150-r)*rune;g+=(88-g)*rune;b+=(62-b)*rune;
      r+=(131-r)*seam*.65;g+=(93-g)*seam*.65;b+=(61-b)*seam*.65;
      const o=i*4;A[o]=r*(1-patch*.32);A[o+1]=g*(1-patch*.2);A[o+2]=b*(1-patch*.15);A[o+3]=255;
      H[i]=tw*.12+fine[i]*.12+mid[i]*.05+seam*.09-rune*.025;
    }cavity(A,H,S,2,1.2,.8,1.05);return surf(A,H,S,2.4);
  }

  // Castle wall blocks: 4 courses of 0.5 m, three blocks per course, running bond, bevelled and slightly chipped.
  function genBrick() {
    const S = 512, n = S * S, RH = 128, NB = 3, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 32, 3, 91), mot = fbm(S, 16, 4, 92), fine = fbm(S, 128, 1, 7), big = fbm(S, 4, 3, 94), crk = fbm(S, 8, 4, 95), pit = fbm(S, 64, 2, 8);
    const R = mulberry32(96), rows = S / RH, J = [];
    for (let r = 0; r < rows; r++) {
      const off = (r & 1 ? S / NB / 2 : 0) + (R() - 0.5) * 30, js = [];
      for (let k = 0; k < NB; k++) js.push(((off + k * S / NB + (R() - 0.5) * 40) % S + S) % S);
      J.push(js.sort((a, b) => a - b));
    }
    const pal = [0xa29a8e, 0xaba297, 0x958e84, 0xb0a79a, 0x9b958a, 0xa39c91, 0x999287].map(hex3);
    for (let y = 0, i = 0; y < S; y++) {
      const r = (y / RH) | 0, ly = (y % RH) + 0.5, js = J[r];
      for (let x = 0; x < S; x++, i++) {
        const X = x + 0.5; let k = NB - 1;
        for (let q = 0; q < NB; q++) if (X >= js[q]) k = q;
        const a = js[k], b = k < NB - 1 ? js[k + 1] : js[0] + S, lx = X >= a ? X - a : X + S - a, bw = b - a;
        const dx = Math.min(lx, bw - lx), dy = Math.min(ly, RH - ly), rc = 12;
        let e = (dx < rc && dy < rc) ? rc - hyp(rc - dx, rc - dy) : Math.min(dx, dy);
        e += (wob[i] - 0.5) * 8 - ss(0.7, 0.9, wob[i]) * 6;
        const id = r * 8 + k, t = clamp((e - 3.4) / 13, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - 3.4 + 0.5, 0, 1);
        const cl = (1 - ss(0, 0.014, Math.abs(crk[i] - 0.5))) * ss(0.62, 0.8, hash(id, 5) * 0.4 + big[i] * 0.6) * t;
        const pk = ss(0.7, 0.85, pit[i]) * t;
        const hb = bev * (0.85 + hash(id, 2) * 0.15) + (mot[i] - 0.5) * 0.14 + (fine[i] - 0.5) * 0.04 - cl * 0.25 - pk * 0.08;
        const hm = 0.06 + fine[i] * 0.05;
        H[i] = hm + (Math.max(hb, hm) - hm) * cov;
        const c = pal[(hash(id, 3) * pal.length) | 0];
        const br = (0.92 + hash(id, 4) * 0.14) * (0.88 + mot[i] * 0.2 + (fine[i] - 0.5) * 0.05) * (0.8 + 0.2 * bev) * (1 - cl * 0.35) * (1 - pk * 0.1)
          * (1 - (1 - ly / RH) * 0.12 * big[i]);
        const mr = 104 + fine[i] * 20, mg = 99 + fine[i] * 18, mb = 90 + fine[i] * 18, o = i * 4;
        A[o] = mr + (c[0] * br - mr) * cov; A[o + 1] = mg + (c[1] * br - mg) * cov; A[o + 2] = mb + (c[2] * br - mb) * cov; A[o + 3] = 255;
      }
    }
    cavity(A, H, S, 5, 1.1, 0.58, 1.07);
    return surf(A, H, S, 4.5);
  }

  // NEUTRAL light-grey rock: lumpy relief, craggy ridges, soft facets and a few fractures (tinted by the consumer).
  function genRock() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 4, 103, 0.9, 3), a = fbm(S, 4, 6, 101, 0.55), rg = fbm(S, 6, 5, 102, 0.55), wob = fbm(S, 16, 3, 105), msk = fbm(S, 3, 3, 110);
    const fine = fbm(S, 96, 2, 106), tint = fbm(S, 2, 2, 107), big = fbm(S, 2, 3, 111);
    const pal = ramp([[0, 0x858585], [0.4, 0xadadad], [0.75, 0xc9c9c9], [1, 0xe0e0e0]]);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const k = V.C[i], id = V.ID[k], e = V.E[i] + (wob[i] - 0.5) * 8;
      const fm = ss(0.5, 0.62, msk[i]), fr = fm * (1 - ss(0.2, 1.8, e));    // fractures along some borders only
      const an = id * TAU, cxp = x - (k % V.N + 0.5) * V.c, cyp = y - ((k / V.N | 0) + 0.5) * V.c;
      // floor(v + 0.5), not Math.round: same result, but in Safari's JavaScriptCore Math.round here made every later blur ~6× slower
      const wx = cxp - Math.floor(cxp / S + 0.5) * S, wy = cyp - Math.floor(cyp / S + 0.5) * S, tilt = (Math.cos(an) * wx + Math.sin(an) * wy) / V.c;
      const r1 = 1 - Math.abs(rg[i] * 2 - 1), ridge = r1 * r1;
      H[i] = a[i] * 0.5 + ridge * 0.3 + tilt * 0.12 * ss(0, 10, e) + fine[i] * 0.05 - fr * 0.18;
      const g = clamp(0.26 + a[i] * 0.4 + ridge * 0.06 + (big[i] - 0.5) * 0.25 + (fine[i] - 0.5) * 0.12 + tilt * 0.05, 0, 1);
      const s = (1 - fr * 0.22) * (0.97 + fine[i] * 0.06);
      const j = li(g) * 3, tw = (tint[i] - 0.5) * 7, o = i * 4;
      A[o] = (pal[j] + tw) * s; A[o + 1] = pal[j + 1] * s; A[o + 2] = (pal[j + 2] - tw) * s; A[o + 3] = 255;
    }
    cavity(A, H, S, 5, 1.6, 0.55, 1.1);
    return surf(A, H, S, 6);
  }

  function genWood() {
    const S = 512, n = S * S, PH = 128, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const gw = fbm(S, 2, 4, 111, 0.5, 16), gf = fbm(S, 4, 3, 112, 0.5, 64), fine = fbm(S, 128, 1, 7), big = fbm(S, 4, 3, 114), st = fbm(S, 2, 3, 116, 0.5, 48);
    const R = mulberry32(115), rows = S / PH, segs = [];
    for (let r = 0; r < rows; r++) {
      const j0 = R() * S, j1 = j0 + 190 + R() * 130, s = [];
      for (let q = 0; q < 2; q++) s.push({ off: R() * 40, tone: 0.86 + R() * 0.24, kx: R(), ky: 0.25 + R() * 0.5, kr: 5 + R() * 5, knot: R() < 0.6 });
      segs.push({ j0, j1, s });
    }
    const nails = [];
    const lw = ramp([[0, 0x6e3f1f], [0.5, 0x9a6232], [1, 0xc58c55]]);
    for (let y = 0, i = 0; y < S; y++) {
      const r = (y / PH) | 0, ly = (y % PH) + 0.5, sg = segs[r];
      for (let x = 0; x < S; x++, i++) {
        const X = x + 0.5, l0 = ((X - sg.j0) % S + S) % S, L1 = sg.j1 - sg.j0, q = l0 < L1 ? 0 : 1, lx = q ? l0 - L1 : l0, len = q ? S - L1 : L1;
        const P = sg.s[q];
        const dx = Math.min(lx, len - lx), dy = Math.min(ly, PH - ly), e = Math.min(dx, dy);
        const t = clamp((e - 1.3) / 4, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - 1.3 + 0.5, 0, 1);
        // grain rings, bulging around a knot
        let rc = ly + gw[i] * 26 + gf[i] * 4 + P.off + lx * 0.012;
        let kd = 99;
        if (P.knot) {
          const kx = P.kx * len, ky = P.ky * PH, ddx = (lx - kx) * 0.45, ddy = ly - ky;
          kd = Math.sqrt(ddx * ddx + ddy * ddy) / P.kr;
          rc += 14 * Math.exp(-kd * kd * 0.35) * Math.sign(ddy || 1);
        }
        const ring = fract(rc / 9.5), late = ss(0.72, 0.9, ring) * (1 - ss(0.93, 1, ring));
        let tone = 0.62 + (fine[i] - 0.5) * 0.1 + (big[i] - 0.5) * 0.12 + (st[i] - 0.5) * 0.16 - late * 0.48 + ring * 0.08;
        let sh = P.tone * (0.78 + 0.22 * bev);
        if (kd < 1.2) { const kk = 1 - ss(0.7, 1.2, kd); tone -= kk * (0.3 + 0.2 * Math.sin(kd * 9)); }
        const j = li(tone) * 3, o = i * 4, gr = 38 + fine[i] * 10;
        A[o] = gr + (lw[j] * sh - gr) * cov; A[o + 1] = gr * 0.75 + (lw[j + 1] * sh - gr * 0.75) * cov; A[o + 2] = gr * 0.5 + (lw[j + 2] * sh - gr * 0.5) * cov; A[o + 3] = 255;
        H[i] = 0.05 + (0.9 * bev - late * 0.06 + fine[i] * 0.03) * cov;
      }
      if (ly === 0.5) {
        for (const jx of [sg.j0, sg.j1]) for (const s of [-1, 1]) for (const ny of [0.27, 0.73]) nails.push([jx + s * 11, r * PH + ny * PH]);
      }
    }
    // Iron nail heads beside every joint
    const m = S - 1;
    for (const [nx, ny] of nails) {
      const rr = 4.2;
      for (let py = Math.floor(ny - 7); py <= ny + 7; py++) for (let px = Math.floor(nx - 7); px <= nx + 7; px++) {
        const qx = px + 0.5 - nx, qy = py + 0.5 - ny, d = hyp(qx, qy), i = (py & m) * S + (px & m);
        const dent = clamp(1 - Math.abs(d - rr - 1.2) / 1.6, 0, 1);
        H[i] -= dent * 0.06;
        const cov = clamp(rr - d + 0.5, 0, 1); if (cov <= 0) continue;
        const dome = Math.sqrt(Math.max(0, 1 - (d / rr) * (d / rr))), hl = clamp(1 - hyp(qx + 1.3, qy - 1.3) / 2.2, 0, 1);
        const g = 62 + dome * 40 + hl * 70;
        blend(A, i, g, g * 0.97, g * 1.03, cov);
        H[i] += (1.05 + dome * 0.25 - H[i]) * cov;
      }
    }
    cavity(A, H, S, 3, 1.0, 0.62, 1.05);
    return surf(A, H, S, 3.5);
  }

  // Vertical bark: two families of meandering furrows cross each other → long diamond plates.
  function genBark() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n), NF = 11;
    const w1 = fbm(S, 3, 4, 121, 0.5, 1), w2 = fbm(S, 3, 4, 126, 0.5, 1), fib = fbm(S, 64, 2, 122, 0.5, 4);
    const brk = fbm(S, 4, 2, 123, 0.4, 20), big = fbm(S, 3, 3, 124), fine = fbm(S, 128, 1, 7), wig = fbm(S, 24, 2, 127, 0.5, 6);
    const pal = ramp([[0, 0x22160d], [0.25, 0x3c2818], [0.55, 0x604028], [0.8, 0x7e5c3c], [1, 0x9a7a58]]);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const u = x / S * NF + (wig[i] - 0.5) * 0.25;
      const f1 = Math.abs(fract(u + (w1[i] - 0.5) * 1.6) - 0.5), f2 = Math.abs(fract(u + 0.5 + (w2[i] - 0.5) * 1.6) - 0.5);
      const f = Math.min(f1, f2);                        // 0 in a furrow … 0.25+ on a plate
      const plate = ss(0.03, 0.17, f), cr = (1 - ss(0, 0.012, Math.abs(brk[i] - 0.5))) * ss(0.12, 0.2, f) * ss(0.35, 0.6, big[i]);
      const h = plate * (0.62 + f * 0.8) + fib[i] * 0.14 + fine[i] * 0.03 - cr * 0.3;
      H[i] = h;
      const tone = clamp(plate * 0.6 + f * 0.7 + fib[i] * 0.2 + (fine[i] - 0.5) * 0.08 - cr * 0.35, 0, 1);
      paint(A, i, pal, tone, 0.94 + big[i] * 0.12);
      blend(A, i, 146, 134, 120, ss(0.72, 1, tone) * 0.22);   // weathered, slightly grey plate tops
    }
    cavity(A, H, S, 3, 1.2, 0.55, 1.08);
    return surf(A, H, S, 5);
  }

  // Scalloped roof tiles. v runs up the roof: each rounded lower edge overlaps the row below.
  function genRoof() {
    const S = 512, n = S * S, RH = 64, W = 64, NR = S / RH, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const fine = fbm(S, 128, 1, 7), mot = fbm(S, 16, 3, 132), big = fbm(S, 4, 3, 133);
    const pal = [0xd9542c, 0xe0683a, 0xc8472a, 0xe57d3e, 0xd05f35, 0xbf452b, 0xde7040].map(hex3);
    const out = [0, 0, 0, 0];
    function scale(x, r, ly, i) {   // colour + height of row r's tile at pixel column x; returns distance to its outline
      const off = (r & 1) ? W / 2 : 0, xs = ((x + 0.5 - off) % S + S) % S, k = (xs / W) | 0, lx = xs - k * W - W / 2;
      const d = ly >= 32 ? 32 - Math.abs(lx) : 32 - hyp(lx, ly - 32);
      const id = r * 16 + k, c = pal[(hash(id, 1) * pal.length) | 0], bev = Math.sqrt(clamp(d / 5, 0, 1));
      const br = (0.9 + hash(id, 2) * 0.18) * (1.08 - Math.min(ly, 96) / 64 * 0.26) * (0.78 + 0.22 * bev) * (0.95 + fine[i] * 0.08)
        * (1 - ss(0.65, 0.85, big[i]) * 0.12) * (1 + (mot[i] - 0.5) * 0.08);
      const rim = ly < 40 ? clamp(1 - Math.abs(d - 3.2) / 2.2, 0, 1) * 0.14 : 0, k2 = br * (1 + rim);
      out[0] = c[0] * k2; out[1] = c[1] * k2; out[2] = c[2] * k2;
      out[3] = (1 - ly / 105) * (0.55 + 0.45 * bev) + (mot[i] - 0.5) * 0.04 + fine[i] * 0.02;
      return d;
    }
    for (let y = 0, i = 0; y < S; y++) {
      const r = (y / RH) | 0, ly = (y % RH) + 0.5;
      for (let x = 0; x < S; x++, i++) {
        const d = scale(x, r, ly, i), cov = clamp(d + 0.5, 0, 1), o = i * 4;
        let R = out[0], G = out[1], B = out[2], h = out[3];
        if (cov < 1) {
          scale(x, (r + NR - 1) % NR, ly + RH, i);
          R = out[0] + (R - out[0]) * cov; G = out[1] + (G - out[1]) * cov; B = out[2] + (B - out[2]) * cov; h = out[3] + (h - out[3]) * cov;
        }
        A[o] = R; A[o + 1] = G; A[o + 2] = B; A[o + 3] = 255; H[i] = h;
      }
    }
    cavity(A, H, S, 4, 1.2, 0.55, 1.06);
    return surf(A, H, S, 4.5);
  }

  // Tudor wall face (0..1 per face, v up): timber frame on all 4 edges, a middle rail and corner braces over cream plaster.
  function genPlaster() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n), m = S - 1;
    const tr = fbm(S, 16, 4, 141), big = fbm(S, 3, 4, 142), fine = fbm(S, 128, 1, 7), gh = fbm(S, 2, 4, 144, 0.5, 24), gv = fbm(S, 24, 4, 145, 0.5, 2);
    const bump = fbm(S, 48, 2, 146);
    const BW = 20, MW = 13, mid = 256, BR = 9, lo = mid - MW, hi = mid + MW, top = S - BW;
    const braces = [[BW, top - 80, BW + 80, top], [S - BW, top - 80, S - BW - 80, top], [BW, hi + 80, BW + 80, hi], [S - BW, hi + 80, S - BW - 80, hi],
      [BW, lo - 72, BW + 72, lo], [S - BW, lo - 72, S - BW - 72, lo]].map(b => {
      const vx = b[2] - b[0], vy = b[3] - b[1], L = hyp(vx, vy);
      return { x: b[0], y: b[1], ux: vx / L, uy: vy / L, L };
    });
    const wood = ramp([[0, 0x3a2111], [0.5, 0x5a381d], [1, 0x7a502d]]);
    const pl = ramp([[0, 0xdcc9a2], [0.5, 0xe9d9b8], [1, 0xf3e7cc]]);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const X = x + 0.5, Y = y + 0.5;
      // signed distance inside the nearest beam (px) and which way its grain runs
      const dh = Math.max(BW - Math.min(Y, S - Y), MW - Math.abs(Y - mid)), dv = BW - Math.min(X, S - X);
      let best = dh, dir = 0;
      if (dv > best) { best = dv; dir = 1; }
      for (const b of braces) {
        const qx = X - b.x, qy = Y - b.y, s = qx * b.ux + qy * b.uy;
        if (s < -14 || s > b.L + 14) continue;
        const dd = BR - Math.abs(-qx * b.uy + qy * b.ux);
        if (dd > best) { best = dd; dir = 2; }
      }
      const cov = clamp(best + 0.5, 0, 1), bev = Math.sqrt(clamp(best / 4.5, 0, 1));
      const grain = dir === 0 ? gh[i] : dir === 1 ? gv[i] : samp(gh, S, (X - Y) * 1.0, (X + Y) * 1.0);
      const wt = clamp(grain * 0.85 + (fine[i] - 0.5) * 0.2 + 0.08, 0, 1), wj = li(wt) * 3, ws = (0.78 + 0.22 * bev) * (0.92 + big[i] * 0.14);
      const grime = 1 - clamp(1 - Y / 140, 0, 1) * 0.18 * (0.6 + big[i] * 0.8);
      const pt = clamp(big[i] * 0.4 + tr[i] * 0.5 + (fine[i] - 0.5) * 0.2, 0, 1), pj = li(pt) * 3, ps = grime * (0.97 + bump[i] * 0.05);
      const o = i * 4;
      A[o] = pl[pj] * ps + (wood[wj] * ws - pl[pj] * ps) * cov; A[o + 1] = pl[pj + 1] * ps + (wood[wj + 1] * ws - pl[pj + 1] * ps) * cov;
      A[o + 2] = pl[pj + 2] * ps + (wood[wj + 2] * ws - pl[pj + 2] * ps) * cov; A[o + 3] = 255;
      const hp = 0.3 + tr[i] * 0.06 + bump[i] * 0.05 + fine[i] * 0.02;
      H[i] = hp + (0.95 * bev + grain * 0.06 - hp) * cov;
    }
    // Plaster chipped off in two spots, showing little bricks underneath (storybook detail)
    for (const [cx, cy, rx, ry] of [[150, 104, 46, 27], [372, 408, 40, 24]]) {
      for (let py = cy - ry - 5; py <= cy + ry + 5; py++) for (let px = cx - rx - 5; px <= cx + rx + 5; px++) {
        const i = (py & m) * S + (px & m), qx = (px + 0.5 - cx) / rx, qy = (py + 0.5 - cy) / ry;
        const d = Math.sqrt(qx * qx + qy * qy) * (1 + (tr[i] - 0.5) * 0.7 + (fine[i] - 0.5) * 0.12);
        const rimA = clamp(1 - Math.abs(d - 1.08) * 9, 0, 1) * 0.5;
        blend(A, i, 252, 246, 230, rimA); H[i] += rimA * 0.06;
        const cov = clamp((1 - d) * ry * 0.7 + 0.5, 0, 1); if (cov <= 0) continue;
        const row = Math.floor(py / 11), bx = px + (row & 1) * 11, mx = Math.min(bx % 22, 22 - bx % 22), my = Math.min(py % 11, 11 - py % 11);
        const mort = clamp(1.8 - Math.min(mx, my), 0, 1), id = hash(Math.floor(bx / 22), row), br = 0.85 + id * 0.3;
        const r = 184 * br + (206 - 184 * br) * mort, g = 92 * br + (192 - 92 * br) * mort, b = 62 * br + (168 - 62 * br) * mort;
        blend(A, i, r, g, b, cov);
        H[i] += (0.12 + (1 - mort) * 0.08 * Math.sqrt(clamp(Math.min(mx, my) / 2, 0, 1)) - H[i]) * cov;
      }
    }
    // Wooden pegs at the joints
    const pegs = [[BW / 2, BW / 2], [S - BW / 2, BW / 2], [BW / 2, S - BW / 2], [S - BW / 2, S - BW / 2], [BW / 2, mid], [S - BW / 2, mid], [S / 2, mid], [S / 2, S - BW / 2]];
    for (const b of braces) { pegs.push([b.x + b.ux * 6, b.y + b.uy * 6]); pegs.push([b.x + b.ux * (b.L - 6), b.y + b.uy * (b.L - 6)]); }
    for (const [cx, cy] of pegs) for (let py = Math.floor(cy - 5); py <= cy + 5; py++) for (let px = Math.floor(cx - 5); px <= cx + 5; px++) {
      const d = hyp(px + 0.5 - cx, py + 0.5 - cy), cov = clamp(3.2 - d + 0.5, 0, 1); if (cov <= 0) continue;
      const i = (py & m) * S + (px & m), l = 1 + clamp(1 - hyp(px + 1.5 - cx, py - 0.5 - cy) / 2, 0, 1) * 0.5;
      blend(A, i, 70 * l, 44 * l, 24 * l, cov); H[i] += (1.08 - H[i]) * cov;
    }
    cavity(A, H, S, 5, 1.2, 0.58, 1.05);
    return surf(A, H, S, 4);
  }

  // NEUTRAL light-grey overlapping leaves (tinted by the consumer). Dark gaps give foliage depth.
  function genLeaves() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const big = fbm(S, 4, 3, 151), fine = fbm(S, 64, 2, 8);
    for (let i = 0; i < n; i++) { const g = 48 + big[i] * 28 + fine[i] * 10, o = i * 4; A[o] = A[o + 1] = A[o + 2] = g; A[o + 3] = 255; H[i] = big[i] * 0.1; }
    const WL = new Float32Array(66);   // leaf outline: half-width along the leaf
    for (let k = 0; k < 66; k++) { const s = Math.min(1, k / 64); WL[k] = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.85)), 0.8); }
    const R = mulberry32(153), NL = 2100;
    for (let l = 0; l < NL; l++) {
      const cx = R() * S, cy = R() * S, len = 22 + R() * 20, wid = len * (0.4 + R() * 0.14), an = R() * TAU, dx = Math.cos(an), dy = Math.sin(an);
      const hb = R() * 0.55, tilt = (R() - 0.35) * 0.4, bend = (R() - 0.5) * 0.35, dark = 0.8 - R() * 0.1;
      const br = 0.74 + R() * 0.24 + (big[((cy | 0) & m) * S + ((cx | 0) & m)] - 0.5) * 0.14;
      const hwM = wid * 0.5, ex = Math.abs(dx) * len * 0.5 + Math.abs(dy) * hwM + 3, ey = Math.abs(dy) * len * 0.5 + Math.abs(dx) * hwM + 3;
      for (let py = Math.floor(cy - ey); py <= cy + ey; py++) for (let px = Math.floor(cx - ex); px <= cx + ex; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, s = (qx * dx + qy * dy) / len + 0.5;
        if (s < 0 || s > 1) continue;
        const pr = -qx * dy + qy * dx - bend * len * (s - 0.5) * (s - 0.5) * 2, ap = Math.abs(pr);
        if (ap > hwM + 0.5) continue;
        const hw = hwM * WL[(s * 64) | 0], cov = clamp(hw - ap + 0.5, 0, 1); if (cov <= 0) continue;
        const tn = pr / (hw + 1e-3), h = hb + tilt * s + (1 - tn * tn) * 0.14, i = (py & m) * S + (px & m);
        if (h <= H[i]) continue;
        let g = 245 * br * (tn > 0 ? dark : 1) * (1 - tn * tn * tn * tn * 0.2) * (0.8 + 0.2 * Math.min(1, s * 3));
        if (ap < 0.75 && s > 0.05 && s < 0.92) g *= 1.1;
        const vv = fract(s * 6 - Math.abs(tn) * 1.4); if (vv < 0.06 || vv > 0.94) g *= 0.94;
        blend(A, i, g, g, g, cov);
        H[i] += (h - H[i]) * cov;
      }
    }
    cavity(A, H, S, 3, 1.4, 0.5, 1.06);
    return surf(A, H, S, 3.2);
  }

  function genFabric() {
    const S = 256, n = S * S, P = 8, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const fine = fbm(S, 128, 1, 7), big = fbm(S, 4, 3, 162), slub = fbm(S, 2, 2, 163, 0.5, 32);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const ci = (x / P) | 0, cj = (y / P) | 0, lx = ((x % P) + 0.5) / P - 0.5, ly = ((y % P) + 0.5) / P - 0.5, over = (ci + cj) & 1;
      const wpw = 0.42 + slub[i] * 0.1, wfw = 0.42 + hash(cj, 9) * 0.08;
      const pw = Math.max(0, Math.cos(Math.PI * clamp(lx / (wpw * 2) * 2, -1, 1) * 0.5)), pf = Math.max(0, Math.cos(Math.PI * clamp(ly / (wfw * 2) * 2, -1, 1) * 0.5));
      const hw = pw * (over ? 0.6 + 0.4 * Math.cos(Math.PI * ly) : 0.45), hf = pf * (!over ? 0.6 + 0.4 * Math.cos(Math.PI * lx) : 0.45);
      const top = hw > hf, h = Math.max(hw, hf);
      const tb = top ? 0.94 + hash(ci, 3) * 0.1 : 0.92 + hash(cj, 4) * 0.1;
      const g = 222 * tb * (0.72 + 0.28 * h) * (0.96 + fine[i] * 0.06) * (0.97 + big[i] * 0.05), o = i * 4;
      A[o] = A[o + 1] = A[o + 2] = g; A[o + 3] = 255;
      H[i] = h + fine[i] * 0.05;
    }
    return surf(A, H, S, 1.6);
  }

  function genMetal() {
    const S = 256, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const s1 = fbm(S, 2, 2, 171, 0.5, 128), s2 = fbm(S, 4, 2, 172, 0.5, 48), big = fbm(S, 2, 4, 173), dent = fbm(S, 8, 3, 174);
    for (let i = 0; i < n; i++) {
      const g = 205 * (1 + (s1[i] - 0.5) * 0.1 + (s2[i] - 0.5) * 0.07 + (big[i] - 0.5) * 0.08 - ss(0.72, 0.9, dent[i]) * 0.05), o = i * 4;
      A[o] = g * 0.99; A[o + 1] = g; A[o + 2] = g * 1.02; A[o + 3] = 255;
      H[i] = s1[i] * 0.12 + s2[i] * 0.08 - ss(0.72, 0.95, dent[i]) * 0.15;
    }
    const R = mulberry32(175);
    for (let s = 0; s < 46; s++) {
      const x0 = R() * S, y0 = R() * S, an = R() * TAU, len = 12 + R() * 60, w = 0.5 + R() * 0.5, lite = R() < 0.6, dx = Math.cos(an), dy = Math.sin(an);
      const x1 = x0 + dx * len, y1 = y0 + dy * len;
      for (let py = Math.floor(Math.min(y0, y1) - 2); py <= Math.max(y0, y1) + 2; py++) for (let px = Math.floor(Math.min(x0, x1) - 2); px <= Math.max(x0, x1) + 2; px++) {
        const qx = px + 0.5 - x0, qy = py + 0.5 - y0, t = (qx * dx + qy * dy) / len; if (t < 0 || t > 1) continue;
        const d = Math.abs(-qx * dy + qy * dx), cov = clamp(w - d + 0.5, 0, 1) * Math.sin(Math.PI * t) * 0.8; if (cov <= 0) continue;
        const i = (py & m) * S + (px & m), o = i * 4, f = lite ? 1.08 : 0.9;
        A[o] += (A[o] * f - A[o]) * cov; A[o + 1] += (A[o + 1] * f - A[o + 1]) * cov; A[o + 2] += (A[o + 2] * f - A[o + 2]) * cov;
        H[i] -= cov * 0.12;
      }
    }
    return surf(A, H, S, 2);
  }

  function genMoss() {
    const S = 256, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 20, 181, 1.0), w = fbm(S, 16, 2, 186), fuzz = fbm(S, 64, 2, 8), fine = fbm(S, 128, 1, 7), big = fbm(S, 4, 3, 184);
    const pal = ramp([[0, 0x1d4414], [0.3, 0x367d21], [0.6, 0x5fa82e], [0.85, 0x8fcb42], [1, 0xbde466]]);
    for (let i = 0; i < n; i++) {
      const q = clamp(V.F1[i] / (V.c * 0.8) + (w[i] - 0.5) * 0.5, 0, 1), tuft = Math.sqrt(1 - q * q);
      const h = big[i] * 0.35 + tuft * 0.3 + fuzz[i] * 0.22 + fine[i] * 0.13;
      H[i] = h;
      paint(A, i, pal, h * 1.1 - 0.08 + V.ID[V.C[i]] * 0.08, 1);
    }
    // little spore stalks with coloured capsules
    const R = mulberry32(185);
    for (let s = 0; s < 90; s++) {
      const x0 = R() * S, y0 = R() * S, an = R() * TAU, L = 2.5 + R() * 3, x1 = x0 + Math.cos(an) * L, y1 = y0 + Math.sin(an) * L;
      const c = R() < 0.55 ? [232, 206, 92] : [214, 118, 64];
      for (let py = Math.floor(Math.min(y0, y1) - 3); py <= Math.max(y0, y1) + 3; py++) for (let px = Math.floor(Math.min(x0, x1) - 3); px <= Math.max(x0, x1) + 3; px++) {
        const qx = px + 0.5 - x0, qy = py + 0.5 - y0, t = clamp((qx * (x1 - x0) + qy * (y1 - y0)) / (L * L), 0, 1);
        const d = hyp(qx - (x1 - x0) * t, qy - (y1 - y0) * t), i = (py & m) * S + (px & m);
        const st = clamp(0.55 - d + 0.5, 0, 1) * 0.8, cap = clamp(1.3 - hyp(px + 0.5 - x1, py + 0.5 - y1) + 0.5, 0, 1);
        if (st > 0) { blend(A, i, 150, 170, 70, st); H[i] += (0.9 + t * 0.2 - H[i]) * st; }
        if (cap > 0) { blend(A, i, c[0], c[1], c[2], cap); H[i] += (1.2 - H[i]) * cap; }
      }
    }
    cavity(A, H, S, 2, 1.5, 0.55, 1.1);
    return surf(A, H, S, 3);
  }

  // ───────────────────── Volcano surfaces (generated by TEX.ensure('volcano') or on first use) ─────────────────────
  // Walkable volcano floor: tops of basalt columns (mostly 6-sided slabs, ~0.67 m) at slightly different heights, bevelled with
  // worn light edges and a few chips, hairline cracks and small vesicle pits. Warm grey-brown slabs, each a touch warmer (red-brown)
  // or greyer than the next and a faint warm tint in a few cracks; the joints are deep warm-dark gaps, about half of them filled
  // with soft light ash (plus ash drifts and specks on the slabs) so it reads friendly and clear, not gloomy.
  // No slab may stand out (no orange accent slabs): the tile repeats every 4 m and on the iPad nothing hides the repeat but LEVEL's
  // soft macro tint, so any eye-catching slab would mark a visible grid across the whole volcano.
  function genBasalt() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 6, 201, 0.5, 0, true), wob = fbm(S, 16, 3, 202), mot = fbm(S, 8, 4, 203), crk = fbm(S, 6, 3, 204), crm = fbm(S, 4, 3, 205);
    const fine = fbm(S, 48, 3, 206), grit = fbm(S, 128, 1, 7), pit = fbm(S, 64, 2, 8), dust = fbm(S, 8, 4, 207), fuzz = fbm(S, 32, 3, 208), jw = fbm(S, 12, 3, 209);
    const pal = [0x74675f, 0x6b5f59, 0x7e7067, 0x71655f, 0x837368, 0x6a605c, 0x786b63, 0x6e6561].map(hex3);
    // per slab (looked up per pixel): colour (× brightness × warmth), pit depth, crack tint
    const nc = V.ID.length, SR = new Float32Array(nc), SG = new Float32Array(nc), SB = new Float32Array(nc),
      SP = new Float32Array(nc), SH = new Float32Array(nc);
    let mr = 0, mg = 0, mb = 0;
    for (let k = 0; k < nc; k++) {
      const c = pal[(hash(k, 11) * pal.length) | 0], sb = 0.9 + hash(k, 12) * 0.2, w = hash(k, 13), wm = w * w;   // most slabs only faintly warm
      SR[k] = c[0] * sb * (1 + 0.08 * wm); SG[k] = c[1] * sb * (1 - 0.03 * wm); SB[k] = c[2] * sb * (1 - 0.12 * wm);   // soft red-brown
      SP[k] = 0.3 + hash(k, 14) * 0.8; SH[k] = ss(0.6, 0.9, hash(k, 15)) * 0.2;
      mr += SR[k] / nc; mg += SG[k] / nc; mb += SB[k] / nc;
    }
    const soft = (v, lim) => (Math.abs(v) > 1e-3 ? lim * Math.tanh(v / lim) / v : 1);
    for (let k = 0; k < nc; k++) {   // soft-limit how far any slab strays from the average in brightness and in tint → no beacon slabs
      const l = (SR[k] + SG[k] + SB[k] - mr - mg - mb) / 3, cr = SR[k] - mr - l, cg = SG[k] - mg - l, cb = SB[k] - mb - l;
      const fl = soft(l, 13), fc = soft(Math.sqrt(cr * cr + cg * cg + cb * cb), 8), L = l * fl;
      SR[k] = mr + L + cr * fc; SG[k] = mg + L + cg * fc; SB[k] = mb + L + cb * fc;
    }
    for (let i = 0; i < n; i++) {
      const k = V.C[i], id = V.ID[k], e = V.E[i] + (wob[i] - 0.5) * 4 - ss(0.74, 0.92, wob[i]) * 3;   // chipped edges here and there
      const j0 = 1.5 + jw[i] * 2.6, t = ss(0, 1, (e - j0) / 9), cov = clamp(e - j0 + 0.5, 0, 1);       // joint width varies
      const cl = (1 - ss(0.005, 0.022, Math.abs(crk[i] - 0.5))) * ss(0.56, 0.72, crm[i]) * t;             // hairline cracks
      const pk = ss(0.77, 0.9, pit[i]) * t * SP[k];                                                        // vesicle pits
      const hs = 0.16 + t * (0.5 + id * 0.3) + (fine[i] - 0.5) * 0.08 * t - cl * 0.3 - pk * 0.1 + (grit[i] - 0.5) * 0.02;
      const br = (0.86 + mot[i] * 0.24 + (fine[i] - 0.5) * 0.12) * (1 - cl * 0.42) * (1 - pk * 0.32)
        * (0.84 + 0.16 * t) * (1 + (1 - ss(0.12, 0.55, t)) * 0.12);                                          // worn, lighter edges
      let r = SR[k] * br, g = SG[k] * br, b = SB[k] * br;
      const hc = cl * SH[k];                                                                               // faint warm tint in some cracks
      r += (168 - r) * hc; g += (94 - g) * hc; b += (60 - b) * hc;
      // joints: deep warm-dark gaps; soft light ash fills about half of them
      const ak = 0.84 + grit[i] * 0.22 + (fuzz[i] - 0.5) * 0.18, ar = 168 * ak, ag = 155 * ak, ab = 143 * ak;
      const fill = ss(0.4, 0.6, dust[i] * 0.65 + fuzz[i] * 0.35), gk = (0.8 + grit[i] * 0.35) * (0.8 + 0.2 * clamp(e / j0, 0, 1));
      const jr = 70 * gk + (ar - 70 * gk) * fill, jg = 57 * gk + (ag - 57 * gk) * fill, jb = 52 * gk + (ab - 52 * gk) * fill;
      const hm = 0.02 + fuzz[i] * 0.03 + fill * (0.09 + fuzz[i] * 0.05);
      r = jr + (r - jr) * cov; g = jg + (g - jg) * cov; b = jb + (b - jb) * cov;
      // soft ash drifts over parts of some slabs + fine ash specks
      const da = clamp(ss(0.62, 0.86, dust[i]) * ss(0.35, 0.7, fuzz[i]) * (1 - t * 0.55) * 0.75 + ss(0.8, 0.93, grit[i]) * t * 0.22, 0, 0.6);
      r += (ar - r) * da; g += (ag - g) * da; b += (ab - b) * da;
      const o = i * 4; A[o] = r; A[o + 1] = g; A[o + 2] = b; A[o + 3] = 255;
      H[i] = hm + (Math.max(hs, hm) - hm) * cov + da * 0.04;
    }
    cavity(A, H, S, 4, 0.9, 0.7, 1.08);
    return surf(A, H, S, 4);
  }

  // Volcano path: light warm-grey ash/sand with soft wind ripples, dark basalt + red scoria pebbles and a few tiny glowing ember chips.
  function genAsh() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const big = fbm(S, 5, 4, 211), mid = fbm(S, 16, 3, 212), fine = fbm(S, 128, 1, 7), grain = fbm(S, 64, 2, 8), wv = fbm(S, 3, 3, 213), rp = fbm(S, 4, 2, 214);
    const pal = ramp([[0, 0x897a6f], [0.45, 0xab9c8e], [1, 0xcbbdac]]);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const rip = Math.sin((y / S * 14 + x / S * 2 + wv[i] * 2.2) * TAU), ra = ss(0.35, 0.75, rp[i]);   // ripples in some areas only
      const t = 0.1 + big[i] * 0.45 + mid[i] * 0.38;
      paint(A, i, pal, t + (grain[i] - 0.5) * 0.15 + (fine[i] - 0.5) * 0.1 + rip * ra * 0.035, 1);
      H[i] = big[i] * 0.3 + mid[i] * 0.22 + fine[i] * 0.12 + grain[i] * 0.05 + rip * ra * 0.05;
    }
    pebbles(A, H, S, 215, 300, 1.6, 9, [0x564a46, 0x645852, 0x4a4240, 0x72665e, 0x8c5842, 0x7c4a3a, 0x9a8a7e], 0.5, 2.4);
    cavity(A, H, S, 3, 1.4, 0.6, 1.08);
    // tiny ember chips: hot yellow core, orange rim and a soft warm halo on the ash
    const R = mulberry32(217);
    for (let q = 0; q < 12; q++) {
      const cx = R() * S, cy = R() * S, rr = 2.4 + R() * 2.2, hot = 0.65 + R() * 0.35, hr = rr * 4, an = R() * Math.PI, asp = 0.6 + R() * 0.35;
      const ca = Math.cos(an), sa = Math.sin(an);
      for (let py = Math.floor(cy - hr); py <= cy + hr; py++) for (let px = Math.floor(cx - hr); px <= cx + hr; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, i = (py & m) * S + (px & m), hl = clamp(1 - hyp(qx, qy) / hr, 0, 1);
        blend(A, i, 240, 150, 92, hl * hl * 0.36 * hot);
        const u = (qx * ca + qy * sa) / rr, v = (-qx * sa + qy * ca) / (rr * asp), d = Math.sqrt(u * u + v * v);
        const cov = clamp((1 - d) * rr * asp + 0.5, 0, 1); if (cov <= 0) continue;
        const core = clamp(1 - d * 1.25, 0, 1) * hot;
        blend(A, i, 255, 116 + 124 * core, 34 + 96 * core, cov);
        H[i] += 0.1 * Math.sqrt(Math.max(0, 1 - d * d)) * cov;
      }
    }
    return surf(A, H, S, 3.2);
  }

  // Lava albedo for LEVEL's emissive lava shader (it scrolls this and wobbles it with TEX.noise). Bright yellow-orange molten
  // rivers swirl between warm red crust plates with glowing hairline cracks; the whole pattern is domain-warped so it looks like it
  // flows. Brightness = heat (crust darkest). normalMap: plates raised; its alpha (height) ≈ 0 in the molten channels, ≈ 1 on crust.
  function genLava() {
    const S = 512, n = S * S, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const V = voronoi(S, 5, 221, 0.95, 5), wob = fbm(S, 12, 3, 222), sw = fbm(S, 4, 4, 223), fine = fbm(S, 64, 2, 224), crk = fbm(S, 8, 3, 225);
    const grit = fbm(S, 128, 1, 7), wx = fbm(S, 3, 3, 226), wy = fbm(S, 3, 3, 227), band = fbm(S, 8, 3, 228);
    const pal = ramp([[0, 0x74261a], [0.14, 0x8e3016], [0.3, 0xbc3e14], [0.5, 0xea5a1a], [0.68, 0xff8c1e], [0.85, 0xffbf38], [1, 0xffea8c]]);
    const Qh = new Float32Array(n), Qz = new Float32Array(n), CH = V.ID.map((_, k) => hash(k, 3) * 0.7);   // per plate (not per pixel)
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const k = V.C[i], id = V.ID[k], thr = id < 0.2 ? 1e9 : 5 + (1 - id) * 9;   // 1 cell in 5 has no crust plate; the others differ in size
      const e = V.E[i] + (wob[i] - 0.5) * 8, crust = ss(thr, thr + 6, e), top = ss(thr + 4, thr + 22, e);
      const cr = (1 - ss(0.006, 0.026, Math.abs(crk[i] - 0.5))) * top * ss(0.35, 0.65, CH[k] + band[i] * 0.5);
      const flow = Math.sin((y / S * 6 + sw[i] * 2.5) * TAU) * 0.06;            // faint streaks along the flow (tileable)
      const molten = clamp(0.64 + (sw[i] - 0.5) * 0.5 + (fine[i] - 0.5) * 0.12 + flow - ss(0, 1, crust * 3) * 0.14, 0.45, 1);
      const cool = 0.05 + (fine[i] - 0.5) * 0.08 + (grit[i] - 0.5) * 0.06 + (1 - top) * 0.2;
      Qh[i] = Math.max(molten + (cool - molten) * crust, cr * 0.82);
      Qz[i] = crust * (0.55 + top * 0.3 + (fine[i] - 0.5) * 0.1 + (grit[i] - 0.5) * 0.04) - cr * 0.12 + (1 - crust) * (0.04 + sw[i] * 0.06 + flow * 0.2);
    }
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {   // domain warp (tileable offsets) → flowing shapes
      const X = x + 0.5 + (wx[i] - 0.5) * 26, Y = y + 0.5 + (wy[i] - 0.5) * 26;
      paint(A, i, pal, samp(Qh, S, X, Y), 1);
      H[i] = samp(Qz, S, X, Y);
    }
    return surf(A, H, S, 3);
  }

  // ───────────────────── Dairy surfaces (Kefir Vadisi; TEX.ensure('dairy') or on first use) ─────────────────────
  // Cavity shading for food: grooves darken warmly (red kept, blue lowered — like light in cream or cheese), never towards grey.
  function cavityWarm(A, H, S, r, k, lo, hi = 1.05) {
    const B = blur(blur(H, S, r), S, r), n = S * S;
    for (let i = 0, o = 0; i < n; i++, o += 4) {
      const f = clamp(1 + (H[i] - B[i]) * k, lo, hi);
      if (f < 1) { A[o] *= 1 - (1 - f) * 0.62; A[o + 1] *= 1 - (1 - f) * 0.95; A[o + 2] *= 1 - (1 - f) * 1.3; }
      else { A[o] *= f; A[o + 1] *= f; A[o + 2] *= f; }
    }
  }
  // One irregular rounded lump (crumb, berry bit, bubble) sitting on the height field; hb = base height (default: height at its centre).
  function lump(A, H, S, cx, cy, rr, asp, an, c, br, ht, hb, wob = 0.12, shade = 0.26) {
    const m = S - 1, ca = Math.cos(an), sa = Math.sin(an), ry = rr * asp, ext = rr * 1.3 + 1, p1 = cx * 1.7 + cy, p2 = cx - cy * 1.3;
    if (hb === undefined) hb = H[((cy | 0) & m) * S + ((cx | 0) & m)] + 0.02;
    for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
      const qx = px + 0.5 - cx, qy = py + 0.5 - cy, u = (qx * ca + qy * sa) / rr, v = (-qx * sa + qy * ca) / ry;
      const d0 = Math.sqrt(u * u + v * v); if (d0 > 1.45) continue;
      const th = Math.atan2(v, u), d = d0 / (1 + wob * Math.sin(2 * th + p1) + wob * 0.6 * Math.sin(3 * th + p2));
      const cov = clamp((1 - d) * ry + 0.5, 0, 1); if (cov <= 0) continue;
      const dome = Math.sqrt(Math.max(0, 1 - d * d)), h = hb + dome * ht, i = (py & m) * S + (px & m);
      if (h <= H[i]) continue;
      const sh = br * (1 - shade + shade * Math.sqrt(dome));
      blend(A, i, c[0] * sh, c[1] * sh, c[2] * sh, cov);
      H[i] += (h - H[i]) * cov;
    }
  }
  // Soft round highlight spot (baked glint on glossy berries / bubbles).
  function glint(A, S, cx, cy, r, a, c = [255, 250, 244]) {
    const m = S - 1;
    for (let py = Math.floor(cy - r - 1); py <= cy + r + 1; py++) for (let px = Math.floor(cx - r - 1); px <= cx + r + 1; px++) {
      const d = hyp(px + 0.5 - cx, py + 0.5 - cy) / r; if (d >= 1) continue;
      blend(A, (py & m) * S + (px & m), c[0], c[1], c[2], (1 - d * d) * a);
    }
  }

  // Walkable Kefir Vadisi ground: thick strained yogurt spread with a spatula — a few broad curved strokes, each one smoothing the
  // cream flat (slightly tilted) and pushing a low, soft ridge up along one edge (broad and barely brighter, so at the 4 m repeat it
  // reads as smooth swirled cream, not as sunlight caustics on wet sand), one soft-serve swirl dollop (only one, so the repeat
  // doesn't show), two shallow spoon scoops (an egg-shaped dent with the pushed-up cream on its front lip, a touch of whey inside)
  // and sparse tiny air pores. Near-white cream (the floor shader's tint and cavityWarm add the warmth; shading warms towards
  // beige, never grey). The same maps give the glossy yogurt hills (06 M.yog, triplanar), so the relief stays gentle.
  // The strokes are broad and smooth, so they are drawn at half resolution and upsampled (4× cheaper; ~20 ms instead of ~50 on JSC).
  function genYogurt() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n), LIP = new Float32Array(n);
    const big = fbm(S, 4, 3, 305), fine = fbm(S, 64, 2, 8), grit = fbm(S, 128, 1, 7);
    const pal = ramp([[0, 0xe4dccd], [0.45, 0xefe9de], [0.8, 0xf5f1e8], [1, 0xf9f6ef]]);   // near-white, a hair creamier and darker than the milk
    const Sh = 256, mh = Sh - 1, und = fbm(Sh, 5, 3, 306), mid = fbm(Sh, 12, 3, 308), Hh = new Float32Array(Sh * Sh), Lh = new Float32Array(Sh * Sh);
    for (let i = 0; i < Sh * Sh; i++) Hh[i] = und[i] * 0.42 + (mid[i] - 0.5) * 0.08;
    const R = mulberry32(307);
    // spatula strokes (half-res): arcs of a circle (centre cx,cy radius Rr), band half-width hw tapering where the spatula lifts off
    for (let s = 0; s < 14; s++) {
      const cx = R() * Sh, cy = R() * Sh, Rr = (60 + R() * 120) / 2, w = (30 + R() * 30) / 2, len = (90 + R() * 150) / 2, span = len / Rr, a0 = R() * TAU;
      const sg = R() < 0.5 ? 1 : -1, lv = (R() - 0.5) * 0.05, tilt = 0.05 + R() * 0.06, lipH = 0.05 + R() * 0.04;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let q = 0; q <= 16; q++) { const a = a0 + span * q / 16, x = cx + Math.cos(a) * Rr, y = cy + Math.sin(a) * Rr; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const pad = w * 1.6 + 1, rA = Math.max(0, Rr - pad), rB = Rr + pad, bx0 = Math.floor(x0 - pad), bx1 = Math.ceil(x1 + pad);
      const px_ = (px, py, qy) => {
        const qx = px + 0.5 - cx, r = hyp(qx, qy);
        let da = Math.atan2(qy, qx) - a0; da -= Math.floor(da / TAU) * TAU;
        const t = da / span; if (t > 1.08) return;
        const hw = w * (1 - 0.6 * ss(0.55, 1.05, t)) * (0.8 + 0.2 * ss(0, 0.2, t)), sc = (r - Rr) / hw * sg, as = Math.abs(sc);
        if (as > 1.6) return;
        const ca = ss(-0.02, 0.1, t) * (1 - ss(0.94, 1.08, t)), i = (py & mh) * Sh + (px & mh);
        const cov = ca * (1 - ss(0.7, 1, as)) * 0.92, tgt = und[i] * 0.42 + lv + tilt * sc + (mid[i] - 0.5) * 0.02;
        Hh[i] += (tgt - Hh[i]) * cov;
        const e1 = (sc - 0.9) / 0.3, e2 = (sc + 0.95) / 0.22;
        const lp = ca * lipH * ((e1 < 3 && e1 > -3 ? Math.exp(-e1 * e1) : 0) + (e2 < 3 && e2 > -3 ? 0.25 * Math.exp(-e2 * e2) : 0));
        if (lp > 0.002) { Hh[i] += lp; Lh[i] = Math.max(Lh[i] * (1 - cov), lp / 0.16); }
        else Lh[i] *= 1 - cov;
      };
      // only the pixels of the ring rA..rB on each row (two spans), clipped to the arc's bounding box
      for (let py = Math.floor(y0 - pad); py <= y1 + pad; py++) {
        const qy = py + 0.5 - cy, q2 = qy * qy; if (q2 >= rB * rB) continue;
        const xo = Math.sqrt(rB * rB - q2), xi = q2 < rA * rA ? Math.sqrt(rA * rA - q2) : 0;
        const l0 = Math.max(bx0, Math.floor(cx - xo)), l1 = Math.min(bx1, Math.ceil(cx - xi)), r0 = Math.max(bx0, Math.floor(cx + xi)), r1 = Math.min(bx1, Math.ceil(cx + xo));
        for (let px = l0; px <= l1; px++) px_(px, py, qy);
        for (let px = Math.max(r0, l1 + 1); px <= r1; px++) px_(px, py, qy);
      }
    }
    const MID = new Float32Array(n);   // upsample (bilinear, wrapping) + full-res fine detail
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const hx = (x + 0.5) * 0.5, hy = (y + 0.5) * 0.5;
      H[i] = samp(Hh, Sh, hx, hy) + (fine[i] - 0.5) * 0.015 + (grit[i] - 0.5) * 0.005; LIP[i] = samp(Lh, Sh, hx, hy); MID[i] = samp(mid, Sh, hx, hy);
    }
    // soft-serve swirl dollops: a spiral ridge winding up to a little peak
    for (let s = 0; s < 1; s++) {
      const cx = R() * S, cy = R() * S, Rr = 52 + R() * 16, turns = 2.2 + R() * 0.8, dir = R() < 0.5 ? -1 : 1, ph = R();
      for (let py = Math.floor(cy - Rr); py <= cy + Rr; py++) for (let px = Math.floor(cx - Rr); px <= cx + Rr; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, r = hyp(qx, qy) / Rr; if (r >= 1) continue;
        const i = (py & m) * S + (px & m), sp = r * turns + dir * Math.atan2(qy, qx) / TAU + ph;
        const band = 0.5 + 0.5 * Math.cos(TAU * sp), w = (1 - r * r) * (1 - r * r);
        const pk = Math.max(0, 1 - (r / 0.26) * (r / 0.26)), peak = 0.2 * pk * pk;   // soft rounded tip (no sharp point)
        const hs = H[i] * 0.4 + 0.3 + (band * 0.34 + (1 - r) * 0.3) * (1 - r * 0.5) + peak;
        H[i] += (hs - H[i]) * w; LIP[i] += (band * 0.8 - LIP[i]) * w;
      }
    }
    // spoon scoops: an egg-shaped dent (the spoon's bowl, wider at the front) with the cream it pushed piled up on its front lip
    // (relief only: no lip brightening, so no bright rings)
    const WH = new Float32Array(n);   // a touch of whey shine inside
    for (let s = 0; s < 2; s++) {
      const cx = R() * S, cy = R() * S, L = 18 + R() * 12, W = L * (0.66 + R() * 0.12), an = R() * TAU, dep = 0.2 + R() * 0.08;
      const ca = Math.cos(an), sa = Math.sin(an), ext = L * 1.7 + 3;
      for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, u = (qx * ca + qy * sa) / L, v = (-qx * sa + qy * ca) / (W * (1 + 0.14 * clamp(u, -1, 1)));
        const d = Math.sqrt(u * u + v * v); if (d > 1.6) continue;
        const i = (py & m) * S + (px & m);
        let dh = 0;
        if (d < 1) { const b = 1 - d * d; dh -= dep * b * (0.85 + 0.15 * u); WH[i] = Math.max(WH[i], ss(0.3, 0.95, b)); }
        const e = (d - 1.14) / 0.24, lp = 0.11 * Math.exp(-e * e) * (0.3 + 0.7 * ss(-0.5, 0.9, u));   // soft piled-up lip, mostly in front
        dh += lp;
        H[i] += dh;
      }
    }
    // tiny air pores
    for (let q = 0; q < 120; q++) {
      const cx = R() * S, cy = R() * S, rr = 0.9 + R() * 1.4;
      for (let py = Math.floor(cy - rr - 1); py <= cy + rr + 1; py++) for (let px = Math.floor(cx - rr - 1); px <= cx + rr + 1; px++) {
        const d = hyp(px + 0.5 - cx, py + 0.5 - cy) / rr; if (d >= 1) continue;
        H[(py & m) * S + (px & m)] -= 0.035 * (1 - d * d);
      }
    }
    for (let i = 0; i < n; i++) {
      paint(A, i, pal, 0.36 + big[i] * 0.32 + Math.min(1, LIP[i]) * 0.12 + (MID[i] - 0.5) * 0.1 + (fine[i] - 0.5) * 0.05, 1);
      const wh = WH[i] * 0.22;
      if (wh > 0) blend(A, i, 236, 226, 200, wh);   // a hint of whey
    }
    cavityWarm(A, H, S, 4, 1.4, 0.76, 1.04);
    return surf(A, H, S, 3.4);
  }

  // Kefir Vadisi path: packed golden biscuit crumbs with granola clusters (honey-toasted lumps), pale oat flakes with fine lines and
  // toasted rims, and a few glossy berry bits (dried cranberry, blueberry, strawberry). Warm golden — clearly not the forest dirt.
  function genBiscuit() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const big = fbm(S, 5, 4, 601), mid = fbm(S, 16, 3, 602), fine = fbm(S, 128, 1, 7), grain = fbm(S, 64, 2, 8);
    const pal = ramp([[0, 0xa66f2c], [0.4, 0xcc964a], [0.75, 0xe2b467], [1, 0xf0cd88]]);
    for (let i = 0; i < n; i++) {
      paint(A, i, pal, 0.18 + big[i] * 0.34 + mid[i] * 0.3 + (grain[i] - 0.5) * 0.24, 1);
      H[i] = big[i] * 0.25 + mid[i] * 0.2 + grain[i] * 0.1 + fine[i] * 0.06;
    }
    const crumb = [0xe8bc70, 0xd8a458, 0xc68c42, 0xf2d290, 0xb87c38, 0xe0b066];
    pebbles(A, H, S, 603, 1500, 1.4, 4.6, crumb, 0.3, 2.2);
    const R = mulberry32(604), T = [0xc98e46, 0xb97c38, 0xd9a458, 0xa96e32, 0xd29a50].map(hex3);
    // granola clusters: packed toasted lumps, a honey glint on some
    for (let c = 0; c < 62; c++) {
      const cx = R() * S, cy = R() * S, k = 4 + ((R() * 5) | 0), cr = 6 + R() * 6, hb = H[((cy | 0) & m) * S + ((cx | 0) & m)] + 0.04;
      for (let q = 0; q < k; q++) {
        const a = R() * TAU, rd = cr * Math.sqrt(R()), rr = 3.4 + R() * 3.6;
        lump(A, H, S, cx + Math.cos(a) * rd, cy + Math.sin(a) * rd, rr, 0.7 + R() * 0.3, R() * Math.PI, T[(R() * T.length) | 0], 0.88 + R() * 0.24,
          0.2 + rr * 0.03, hb + R() * 0.08, 0.2, 0.34);
      }
      if (R() < 0.45) glint(A, S, cx - 1.5, cy - 1.5, 2.2 + R() * 1.4, 0.35, [255, 226, 150]);
    }
    // oat flakes
    for (let f = 0; f < 58; f++) {
      const cx = R() * S, cy = R() * S, L = 12 + R() * 8, W = L * (0.56 + R() * 0.18), an = R() * TAU, ca = Math.cos(an), sa = Math.sin(an);
      const hb = H[((cy | 0) & m) * S + ((cx | 0) & m)] + 0.05, tilt = (R() - 0.5) * 0.3, curl = 0.05 + R() * 0.08, p1 = R() * TAU, p2 = R() * TAU;
      const tone = 0.9 + R() * 0.14, toast = R() * 0.5, ext = L * 1.35 + 2;
      for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, u = (qx * ca + qy * sa) / L, v = (-qx * sa + qy * ca) / W;
        const d0 = Math.sqrt(u * u + v * v); if (d0 > 1.3) continue;
        const th = Math.atan2(v, u), d = d0 / (1 + 0.08 * Math.sin(3 * th + p1) + 0.05 * Math.sin(5 * th + p2));
        const cov = clamp((1 - d) * W + 0.5, 0, 1); if (cov <= 0) continue;
        const edge = ss(0.55, 1, d), stri = 0.5 + 0.5 * Math.sin(v * W * 1.7 + u * 1.5 + p1), i = (py & m) * S + (px & m);
        const h = hb + 0.2 + tilt * u + curl * v * v + edge * 0.03 + stri * 0.012;
        if (h <= H[i]) continue;
        const e = clamp(edge * (0.55 + toast), 0, 1), s = tone * (0.95 + 0.05 * stri);
        blend(A, i, (236 + (200 - 236) * e) * s, (204 + (144 - 204) * e) * s, (140 + (74 - 140) * e) * s, cov);
        H[i] += (h - H[i]) * cov;
      }
    }
    pebbles(A, H, S, 605, 240, 3, 8.5, [0xd9a456, 0xc58a40, 0xe6bc72, 0xb57a36, 0xf0cf8e], 0.42, 2.4);
    // berry bits: a few glossy dried cranberries, blueberries and strawberry pieces
    const BER = [[[184, 36, 60], [150, 22, 46]], [[70, 62, 150], [48, 42, 112]], [[222, 70, 88], [246, 160, 168]]];
    for (let b = 0; b < 12; b++) {
      const cx = R() * S, cy = R() * S, kind = b % 3, rr = 5 + R() * 4.5, an = R() * Math.PI, asp = kind === 1 ? 0.85 + R() * 0.15 : 0.6 + R() * 0.3;
      const hb = H[((cy | 0) & m) * S + ((cx | 0) & m)] + 0.08, c = BER[kind];
      lump(A, H, S, cx, cy, rr, asp, an, c[0], 0.95 + R() * 0.1, 0.3, hb, kind === 1 ? 0.06 : 0.22, 0.42);
      if (kind === 2) lump(A, H, S, cx + 0.8, cy - 0.6, rr * 0.55, asp, an, c[1], 1, 0.3, hb + 0.02, 0.25, 0.1);   // pale strawberry inside
      if (kind === 0) lump(A, H, S, cx - 1, cy + 1, rr * 0.5, asp, an + 1, c[1], 1, 0.32, hb, 0.3, 0.3);             // cranberry wrinkle
      glint(A, S, cx - rr * 0.3, cy - rr * 0.3, rr * 0.35, 0.55);
    }
    cavityWarm(A, H, S, 3, 1.3, 0.64, 1.08);
    return surf(A, H, S, 3.5);
  }

  // Swiss cheese: warm yellow blocks (joints = true: plaza/arena slabs, 1 m rows in a loose running bond, bevelled with a slightly
  // deeper golden rind along the edges, narrow warm gaps) or one jointless slab (joints = false: props such as wheels and wedges).
  // Round holes ("eyes") of many sizes — a few big, most small — are smooth craters, darker and more golden inside, with a softly lit lip;
  // holes crossing a block edge cut into the bevel. No block may stand out (colour spread is soft-limited).
  function genCheese(S = 512, joints = true) {
    const n = S * S, m = S - 1, k = S / 512, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 16, 3, 501), mot = fbm(S, 8, 4, 502), fine = fbm(S, Math.min(128, S / 4), 1, 7), grit = fbm(S, 64, 2, 8), big = fbm(S, 3, 3, 503);
    const RH = 128 * k, NB = 3, rows = S / RH, R = mulberry32(504), J = [];
    for (let r = 0; r < rows; r++) {
      const off = (r & 1 ? S / NB / 2 : 0) + (R() - 0.5) * 50 * k, js = [];
      for (let q = 0; q < NB; q++) js.push(((off + q * S / NB + (R() - 0.5) * 50 * k) % S + S) % S);
      J.push(js.sort((a, b) => a - b));
    }
    const pal = [0xf4c647, 0xf8d25a, 0xf1be3e, 0xf9d766, 0xf0c34c, 0xf6cc52, 0xf3c955].map(hex3), NBk = rows * 8;
    const BR = new Float32Array(NBk), BG = new Float32Array(NBk), BB = new Float32Array(NBk), BH = new Float32Array(NBk);
    for (let id = 0; id < NBk; id++) { const c = pal[(hash(id, 3) * pal.length) | 0], s = 0.95 + hash(id, 4) * 0.08; BR[id] = c[0] * s; BG[id] = c[1] * s; BB[id] = c[2] * s; BH[id] = hash(id, 2); }
    const RIM = [230, 164, 54];
    for (let y = 0, i = 0; y < S; y++) {
      const r = (y / RH) | 0, ly = (y % RH) + 0.5, js = J[r];
      for (let x = 0; x < S; x++, i++) {
        let e = 999, id = 0, j0 = 2.6 * k;
        if (joints) {
          const X = x + 0.5; let q = NB - 1;
          for (let t = 0; t < NB; t++) if (X >= js[t]) q = t;
          const a = js[q], b = q < NB - 1 ? js[q + 1] : js[0] + S, lx = X >= a ? X - a : X + S - a, bw = b - a;
          const dx = Math.min(lx, bw - lx), dy = Math.min(ly, RH - ly), rc = 14 * k;
          e = (dx < rc && dy < rc) ? rc - hyp(rc - dx, rc - dy) : Math.min(dx, dy);
          e += (wob[i] - 0.5) * 3 * k; id = r * 8 + q; j0 += grit[i] * 1.2 * k;
        }
        const t = clamp((e - j0) / (12 * k), 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - j0 + 0.5, 0, 1);
        const hs = 0.3 + bev * (0.55 + BH[id] * 0.08) + (mot[i] - 0.5) * 0.05 + (fine[i] - 0.5) * 0.012, hm = 0.04 + grit[i] * 0.04;
        H[i] = hm + (Math.max(hs, hm) - hm) * cov;
        const br = (0.93 + mot[i] * 0.1 + (fine[i] - 0.5) * 0.03) * (0.84 + 0.16 * bev) * (1 + (big[i] - 0.5) * 0.06);
        let cr = BR[id] * br, cg = BG[id] * br, cb = BB[id] * br;
        const rind = (1 - ss(0, 0.8, t)) * 0.55;
        cr += (RIM[0] - cr) * rind; cg += (RIM[1] - cg) * rind; cb += (RIM[2] - cb) * rind;
        const wax = ss(0.66, 0.92, mot[i]) * 0.12;   // faint paler waxy streaks
        cr += (255 - cr) * wax; cg += (238 - cg) * wax; cb += (160 - cb) * wax;
        const gk = 0.82 + grit[i] * 0.3, o = i * 4;
        A[o] = 204 * gk + (cr - 204 * gk) * cov; A[o + 1] = 142 * gk + (cg - 142 * gk) * cov; A[o + 2] = 46 * gk + (cb - 46 * gk) * cov; A[o + 3] = 255;
      }
    }
    // holes: smooth craters, darker/more golden inside, a lighter cut lip around them
    const nh = Math.round(92 * k * k * (joints ? 1 : 1.25));
    for (let h = 0; h < nh + 70 * k * k; h++) {
      const pin = h >= nh, cx = R() * S, cy = R() * S, rr = pin ? (0.9 + R() * 1.3) * Math.max(1, k * 1.5) : (2.6 + 17 * Math.pow(R(), 2.3)) * (joints ? k : k * 1.3);
      const asp = 0.84 + R() * 0.16, an = R() * Math.PI, ca = Math.cos(an), sa = Math.sin(an), dep = Math.min(0.55, 0.1 + rr * 0.025 / k), ext = rr * 1.35 + 1;
      for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, u = (qx * ca + qy * sa) / rr, v = (-qx * sa + qy * ca) / (rr * asp), d = Math.sqrt(u * u + v * v);
        if (d > 1.3) continue;
        const i = (py & m) * S + (px & m), o = i * 4, c = clamp((1 - d) * rr * asp + 0.5, 0, 1);
        if (d > 1) { if (!pin) { const l = (1 - (d - 1) / 0.3) * 0.12; blend(A, i, 255, 226, 120, l); H[i] += l * 0.1; } continue; }
        const bowl = Math.sqrt(1 - d * d);
        H[i] -= dep * bowl * c;
        const f = 1 - (0.1 + 0.24 * bowl) * c;
        A[o] *= 1 - (1 - f) * 0.35; A[o + 1] *= 1 - (1 - f) * 0.8; A[o + 2] *= 1 - (1 - f) * 1.4;
      }
    }
    cavityWarm(A, H, S, 3, 1.0, 0.72, 1.05);
    return surf(A, H, S, 3.6);
  }

  // Milk / kefir albedo for LEVEL's liquid shader (scrolled + wobbled like the lava): creamy white with soft wave ripples (integer
  // wave vectors + tileable warp → seamless), faint cream marbling, two soft drop rings, and fizzy kefir bubbles (clusters + singles).
  // A soft light is baked into the ripples so they also read in an unlit shader. normalMap: ripples and bubble domes; alpha (height)
  // ≈ ripples, highest on the bubbles. Slightly cooler white than the creamy yogurt ground; tint it (e.g. warm ivory) for kefir.
  function genMilk() {
    const S = 512, n = S * S, m = S - 1, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wx = fbm(S, 3, 3, 401), wy = fbm(S, 3, 3, 402), cream = fbm(S, 3, 4, 403), fine = fbm(S, 32, 2, 404), big = fbm(S, 2, 3, 405);
    const WV = [[3, 1, 0.5, 0], [-1, 4, 0.36, 1.3], [2, -5, 0.24, 2.1], [7, 3, 0.12, 0.4], [-6, 5, 0.08, 4.2], [11, -4, 0.045, 1.7], [-5, 13, 0.03, 3.3]];   // [kx, ky, amp, phase]
    const pal = ramp([[0, 0xe6e3dd], [0.5, 0xf0eee9], [1, 0xf8f7f3]]);   // milk: a clean, slightly cooler white than the creamy yogurt ground
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const X = (x + 0.5 + (wx[i] - 0.5) * 38) / S, Y = (y + 0.5 + (wy[i] - 0.5) * 38) / S;
      let h = 0; for (let q = 0; q < WV.length; q++) { const w = WV[q]; h += Math.sin(TAU * (w[0] * X + w[1] * Y) + w[3]) * w[2]; }
      h = h / (1 + Math.abs(h) * 0.35);                               // soften the crests a little (thick creamy liquid)
      H[i] = h * 0.9;
      paint(A, i, pal, 0.55 + h * 0.14 + (big[i] - 0.5) * 0.2 + (fine[i] - 0.5) * 0.04, 1);
      const cm = ss(0.58, 0.84, cream[i]) * 0.35;                      // cream marbling
      if (cm > 0) blend(A, i, 242, 226, 192, cm);
    }
    const R = mulberry32(406);
    // drop rings
    for (let q = 0; q < 2; q++) {
      const cx = R() * S, cy = R() * S, r0 = 26 + R() * 40, wl = 9 + R() * 4, amp = 0.14 + R() * 0.08, ext = r0 + 36;
      for (let py = Math.floor(cy - ext); py <= cy + ext; py++) for (let px = Math.floor(cx - ext); px <= cx + ext; px++) {
        const r = hyp(px + 0.5 - cx, py + 0.5 - cy); if (r > ext) continue;
        const x2 = (r - r0) / 18, env = Math.exp(-x2 * x2) * ss(0, r0 * 0.5, r), w = Math.cos((r - r0) / wl * TAU) * amp * env, i = (py & m) * S + (px & m);
        H[i] += w;
        const o = i * 4, f = 1 + w * 0.12; A[o] *= f; A[o + 1] *= f; A[o + 2] *= f;
      }
    }
    // bake a soft light (from the upper left) into the smooth ripples so they read even in an unlit shader; shade warms, never greys
    for (let y = 0, i = 0; y < S; y++) {
      const yu = ((y + 1) & m) * S, yd = ((y - 1) & m) * S;
      for (let x = 0; x < S; x++, i++) {
        const sl = (H[y * S + ((x - 1) & m)] - H[y * S + ((x + 1) & m)]) + (H[yu + x] - H[yd + x]), f = clamp(1 + sl * 0.7, 0.94, 1.03), o = i * 4;
        if (f < 1) { A[o] *= 1 - (1 - f) * 0.7; A[o + 1] *= 1 - (1 - f) * 0.95; A[o + 2] *= 1 - (1 - f) * 1.35; }
        else { A[o] *= f; A[o + 1] *= f; A[o + 2] *= f; }
      }
    }
    for (let i = 0; i < n; i++) H[i] += (fine[i] - 0.5) * 0.012;   // a whisper of surface texture for the highlights
    // fizzy bubbles: soap-like film with a faint pink/blue sheen, a thin darker edge and a bright rim (so they read on white milk),
    // a soft warm contact shadow and a glint
    const bubble = (cx, cy, rb) => {
      const hb = H[((cy | 0) & m) * S + ((cx | 0) & m)], ph = R() * TAU, ex = rb * 1.4 + 1.5;
      for (let py = Math.floor(cy - ex); py <= cy + ex; py++) for (let px = Math.floor(cx - ex); px <= cx + ex; px++) {
        const qx = px + 0.5 - cx, qy = py + 0.5 - cy, d = hyp(qx, qy) / rb, i = (py & m) * S + (px & m), o = i * 4;
        if (d > 1.4) continue;
        if (d > 1) { const sh = (1 - (d - 1) / 0.4) * 0.13; A[o] *= 1 - sh * 0.5; A[o + 1] *= 1 - sh * 0.8; A[o + 2] *= 1 - sh * 1.2; continue; }   // soft warm contact shadow
        const c = clamp((1 - d) * rb + 0.5, 0, 1), dome = Math.sqrt(1 - d * d), rim = ss(0.6, 0.86, d) * (1 - ss(0.9, 0.97, d));
        const ir = 0.5 + 0.5 * Math.sin(Math.atan2(qy, qx) * 2 + ph + d * 3), edge = ss(0.88, 0.99, d);
        blend(A, i, 240 + 10 * ir, 240 - 2 * ir, 250 - 8 * ir, c * 0.55 * (1 - rim));   // thin film with a faint iridescent sheen
        blend(A, i, 255, 254, 250, c * rim * 0.95);                                        // bright rim
        blend(A, i, 206, 196, 184, c * edge * 0.45);                                       // thin darker edge
        H[i] += (hb + 0.35 + dome * 0.22 * Math.min(1.5, rb / 3) - H[i]) * c;
      }
      glint(A, S, cx - rb * 0.35, cy - rb * 0.35, Math.max(0.8, rb * 0.3), 0.9, [255, 255, 255]);
    };
    for (let c = 0; c < 22; c++) {
      const cx = R() * S, cy = R() * S, k = 5 + ((R() * 12) | 0), sp = 8 + R() * 11;
      for (let q = 0; q < k; q++) { const a = R() * TAU, rd = sp * Math.sqrt(R()); bubble(cx + Math.cos(a) * rd, cy + Math.sin(a) * rd, 1.8 + Math.pow(R(), 1.8) * 5); }
    }
    for (let q = 0; q < 70; q++) bubble(R() * S, R() * S, 1.5 + Math.pow(R(), 2) * 3.8);
    return surf(A, H, S, 4);
  }

  // ───────────────────── Town surfaces (Surlu Şehir; TEX.ensure('town') or on first use) ─────────────────────
  // Soft-limit how far each stone's colour strays from its group's average — brightness to ±lb, tint to ±lc (sRGB units) — so no
  // beacon stone marks the texture repeat. C: sRGB per stone (interleaved, changed in place); idx: the stones of one group.
  function tame(C, idx, lb, lc) {
    let mr = 0, mg = 0, mb = 0;
    for (const k of idx) { mr += C[k * 3]; mg += C[k * 3 + 1]; mb += C[k * 3 + 2]; }
    mr /= idx.length; mg /= idx.length; mb /= idx.length;
    const soft = (v, lim) => (Math.abs(v) > 1e-3 ? lim * Math.tanh(v / lim) / v : 1);
    for (const k of idx) {
      const o = k * 3, l = (C[o] + C[o + 1] + C[o + 2] - mr - mg - mb) / 3, cr = C[o] - mr - l, cg = C[o + 1] - mg - l, cb = C[o + 2] - mb - l;
      const L = l * soft(l, lb), fc = soft(Math.sqrt(cr * cr + cg * cg + cb * cb), lc);
      C[o] = mr + L + cr * fc; C[o + 1] = mg + L + cg * fc; C[o + 2] = mb + L + cb * fc;
    }
  }

  // Walkable town streets: small rounded honey / sand / cream cobbles (rows of ~0.2 m, stones 0.17–0.33 m long: smaller than
  // 'cobble') laid in gently wavy rows, each row with its own joints and every stone a little turned and wobbly; domed, worn
  // smoother and lighter on top, in warm sandy joints; a few thin moss lines creep along some row joints. The rows run along u (x):
  // LEVEL's rotated anti-tiling sample would cross them (anti: 0).
  function genTownStone() {
    const S = 512, n = S * S, NR = 15, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 32, 3, 701), mot = fbm(S, 16, 3, 702), wu = fbm(S, 4, 2, 703), wv = fbm(S, 4, 2, 704), msk = fbm(S, 6, 3, 705), fuzz = fbm(S, 32, 2, 706);
    const fine = fbm(S, 128, 1, 7), grit = fbm(S, 64, 2, 8), R = mulberry32(707);
    const pal = [0xe0c290, 0xd6b27e, 0xe8d4ae, 0xdcc49c, 0xd2b48c, 0xeadcbc, 0xd8b088, 0xcfbca0, 0xe2c8a0, 0xd9bc96].map(hex3);
    // row heights ±12 % (sum = S) → ROW / RY lookup
    const RY = [0], RHs = [], hs = [];
    for (let r = 0; r < NR; r++) hs.push(0.88 + R() * 0.24);
    const ht = hs.reduce((a, b) => a + b, 0);
    for (let r = 0; r < NR; r++) { RHs.push(hs[r] / ht * S); RY.push(RY[r] + RHs[r]); }
    const ROW = new Uint8Array(S);
    for (let y = 0, r = 0; y < S; y++) { while (r < NR - 1 && y + 0.5 >= RY[r + 1]) r++; ROW[y] = r; }
    // rows → stones: start x, width, turn, tilt, height, colour; RS / RI = each row's stone starts (sorted, wrapping) and ids
    const RS = [], RI = [], SX = [], SW = [], SC = [], SS = [], TX = [], TY = [], SH = [], col = [];
    for (let r = 0; r < NR; r++) {
      const cnt = 11 + ((R() * 3) | 0), w = [], row = [];
      let tw = 0, x = R() * S;
      for (let k = 0; k < cnt; k++) { const v = 0.7 + R() * 0.6; w.push(v); tw += v; }
      for (let k = 0; k < cnt; k++) {
        const id = SX.length, bw = w[k] / tw * S, an = (R() - 0.5) * 0.12, c = pal[(R() * pal.length) | 0], b = 0.92 + R() * 0.14;
        SX.push(x % S); SW.push(bw); SC.push(Math.cos(an)); SS.push(Math.sin(an)); TX.push((R() - 0.5) * 0.9); TY.push((R() - 0.5) * 0.9); SH.push(R());
        col.push(c[0] * b, c[1] * b, c[2] * b); row.push(id);
        x += bw;
      }
      row.sort((a, b) => SX[a] - SX[b]);
      RS.push(row.map(k => SX[k])); RI.push(row);
    }
    const C = new Float32Array(col);
    tame(C, SX.map((_, k) => k), 11, 8);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      // gently wavy rows and slightly slanted joints (tileable warp)
      let X = x + 0.5 + (wu[i] - 0.5) * 7, Y = y + 0.5 + (wv[i] - 0.5) * 11;
      X -= Math.floor(X / S) * S; Y -= Math.floor(Y / S) * S;
      let r = ROW[Y | 0];
      if (Y < RY[r]) r--; else if (Y >= RY[r + 1]) r++;
      const rh = RHs[r], ly = Y - RY[r], js = RS[r];
      let q = js.length - 1;
      for (let t = 0; t < js.length; t++) if (X >= js[t]) q = t;
      const id = RI[r][q], lx = X >= js[q] ? X - js[q] : X + S - js[q];
      // rounded, slightly turned stone inside its cell (joint half-width g)
      const bw = SW[id], qx = lx - bw * 0.5, qy = ly - rh * 0.5, u = qx * SC[id] + qy * SS[id], v = -qx * SS[id] + qy * SC[id];
      const g = 1.3, hx = bw * 0.5 - g, hy = rh * 0.5 - g, rc = Math.min(hx, hy) * 0.85, dx = Math.abs(u) - hx + rc, dy = Math.abs(v) - hy + rc;
      const e = rc - hyp(Math.max(dx, 0), Math.max(dy, 0)) - Math.min(Math.max(dx, dy), 0) + (wob[i] - 0.5) * 5 - ss(0.78, 0.94, wob[i]) * 1.5;
      // domed across the whole stone (no flat top: a plateau edge would draw a ring inside every stone)
      const t = clamp(e / (Math.min(hx, hy) * 0.85), 0, 1), dome = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e + 0.5, 0, 1);
      // moss: a few thin lines, mostly along the row joints (and just onto the stone edges there)
      const mo = ss(0.6, 0.74, msk[i]) * ss(0.28, 0.62, fuzz[i]) * (dy > dx ? 1 : 0.3);
      const hs = 0.12 + dome * (0.72 + SH[id] * 0.16) + (u * TX[id] + v * TY[id]) / rh * 0.14 * dome + (mot[i] - 0.5) * 0.07 + (fine[i] - 0.5) * 0.02;
      const hm = 0.03 + grit[i] * 0.07 + mo * 0.06;
      H[i] = hm + (Math.max(hs, hm) - hm) * cov;
      const br = (0.92 + (mot[i] - 0.5) * 0.14 + (fine[i] - 0.5) * 0.06 + (grit[i] - 0.5) * 0.05) * (0.76 + 0.24 * dome) * (1 + dome * dome * 0.06);
      const em = mo * (1 - ss(0, 0.45, t)) * 0.45, o = id * 3;
      let sr = C[o] * br, sg = C[o + 1] * br, sb = C[o + 2] * br;
      sr += (122 - sr) * em; sg += (140 - sg) * em; sb += (64 - sb) * em;
      // joints: warm sandy soil, moss where the lines run
      const mk = 0.84 + grit[i] * 0.32, ma = mo * 0.9, f = fuzz[i] * 30;
      const jr = (156 + (104 + f - 156) * ma) * mk, jg = (132 + (134 + f - 132) * ma) * mk, jb = (98 + (54 - 98) * ma) * mk, p = i * 4;
      A[p] = jr + (sr - jr) * cov; A[p + 1] = jg + (sg - jg) * cov; A[p + 2] = jb + (sb - jb) * cov; A[p + 3] = 255;
    }
    cavityWarm(A, H, S, 4, 1.1, 0.62, 1.06);
    return surf(A, H, S, 4.5);
  }

  // Plaza / market square / tournament arena pavers: fish-scale fans (Bogenpflaster) — rows of overlapping fans 1.33 m wide, 0.67 m
  // apart, each laid in concentric courses of small flat cream / sand pavers around a round foot stone; a slim outer course and the
  // foot stone are terracotta, so soft terracotta arcs scallop across a cream square (calm enough for the boss telegraphs). Bevelled
  // pavers in narrow sandy joints. The arcs bulge towards +v (north: up the screen). The rotated anti-tiling sample would break
  // the scallops (anti: 0).
  function genPlaza() {
    const S = 512, n = S * S, NF = 3, FW = S / NF, RF = FW / 2, NRW = NF * 2, NC = 6, CW = RF / NC, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 32, 3, 721), mot = fbm(S, 16, 3, 722), big = fbm(S, 4, 3, 723), fine = fbm(S, 128, 1, 7), grit = fbm(S, 64, 2, 8), R = mulberry32(724);
    // course radii: a small foot stone, even cream courses, a slimmer terracotta outer course
    const CR = [0, CW * 0.8];
    for (let k = 2; k < NC; k++) CR.push(CW * 0.8 + (RF - CW * 0.72 - CW * 0.8) * (k - 1) / (NC - 2));
    CR.push(RF);
    // stones per course (every fan alike): the foot stone (course 0), then rings of stones ~1.3 × the course width long
    const MK = [1], OFF = [0];
    for (let k = 1; k < NC; k++) { MK.push(Math.max(4, Math.round(TAU * (CR[k] + CR[k + 1]) * 0.5 / (1.3 * Math.max(CR[k + 1] - CR[k], CW * 0.9))))); OFF.push(OFF[k - 1] + MK[k - 1]); }
    const PER = OFF[NC - 1] + MK[NC - 1], NFAN = NF * NRW, NS = NFAN * PER, C = new Float32Array(NS * 3), SH = new Float32Array(NS), PH = new Float32Array(NFAN * NC);
    const cream = [0xeee2c8, 0xe8d8b8, 0xf2e8d2, 0xe6d4b4, 0xecdec2, 0xe4d6bc, 0xf0e0c2].map(hex3), terra = [0xd4825c, 0xda8e66, 0xcc7856, 0xde9870, 0xd08260, 0xd68a5e].map(hex3);
    const gC = [], gT = [];
    for (let f = 0; f < NFAN; f++) for (let k = 0; k < NC; k++) {
      PH[f * NC + k] = R();
      for (let q = 0; q < MK[k]; q++) {
        const s = f * PER + OFF[k] + q, tc = k === 0 || k === NC - 1, P = tc ? terra : cream, c = P[(R() * P.length) | 0], b = 0.95 + R() * 0.08;
        C[s * 3] = c[0] * b; C[s * 3 + 1] = c[1] * b; C[s * 3 + 2] = c[2] * b; SH[s] = R();
        (tc ? gT : gC).push(s);
      }
    }
    tame(C, gC, 8, 6); tame(C, gT, 9, 7);
    for (let y = 0, i = 0; y < S; y++) {
      const Y = y + 0.5, jf = Math.floor(Y / RF);
      for (let x = 0; x < S; x++, i++) {
        const X = x + 0.5;
        // the fan of row jf (its foot below the pixel) wins where it reaches; elsewhere the pixel is in the lower part of a row jf + 1
        // fan. eb = distance to the fans of the row below (they cut this fan's lower flanks)
        let j = jf, off = (j & 1) * RF, fi = Math.round((X - off) / FW), dx = X - fi * FW - off, dy = Y - j * RF, r = hyp(dx, dy), eb;
        if (r <= RF) {
          const o2 = ((j - 1) & 1) * RF, f2 = Math.round((X - o2) / FW);
          eb = hyp(X - f2 * FW - o2, Y - (j - 1) * RF) - RF;
        } else {
          eb = r - RF; j = jf + 1; off = (j & 1) * RF; fi = Math.round((X - off) / FW); dx = X - fi * FW - off; dy = Y - j * RF; r = hyp(dx, dy);
        }
        const fan = (((j % NRW) + NRW) % NRW) * NF + (((fi % NF) + NF) % NF);
        let k = NC - 1;
        while (k > 0 && r < CR[k]) k--;
        // course (radial) and stone (along the arc) edges, rounded corners
        const er = Math.min(k ? r - CR[k] : 1e9, CR[k + 1] - r, eb);
        let ea = 1e9, q = 0;
        if (k) { const u = (Math.atan2(dx, dy) / TAU + 0.5) * MK[k] + PH[fan * NC + k], qi = Math.floor(u), fu = u - qi; q = qi % MK[k]; ea = Math.min(fu, 1 - fu) * TAU * r / MK[k]; }
        const rc = 2.5, e = (er < rc && ea < rc ? rc - hyp(rc - er, rc - ea) : Math.min(er, ea)) + (wob[i] - 0.5) * 2.2;
        const j0 = 1.2 + grit[i] * 0.7, t = clamp((e - j0) / 3.5, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - j0 + 0.5, 0, 1);
        const s = fan * PER + OFF[k] + q, o = s * 3;
        const hs = 0.3 + bev * (0.55 + SH[s] * 0.1) + (mot[i] - 0.5) * 0.04 + (fine[i] - 0.5) * 0.015, hm = 0.05 + grit[i] * 0.05;
        H[i] = hm + (Math.max(hs, hm) - hm) * cov;
        const br = (0.93 + (mot[i] - 0.5) * 0.12 + (fine[i] - 0.5) * 0.05 + (big[i] - 0.5) * 0.06) * (0.82 + 0.18 * bev);
        const gk = 0.84 + grit[i] * 0.3, jr = 196 * gk, jg = 180 * gk, jb = 152 * gk, p = i * 4;
        A[p] = jr + (C[o] * br - jr) * cov; A[p + 1] = jg + (C[o + 1] * br - jg) * cov; A[p + 2] = jb + (C[o + 2] * br - jb) * cov; A[p + 3] = 255;
      }
    }
    cavityWarm(A, H, S, 3, 0.8, 0.74, 1.04);
    return surf(A, H, S, 2.8);
  }

  // Stone courses along u: NR rows (heights 1 ± hv/2 of the average, sum = S; ROW = the course of each pixel row), each cut into
  // nb blocks (nb picked from nbs, lengths 0.75–1.25 × the course's average; J = sorted, wrapping start positions) with no joint
  // closer than gap px to one in the course below (the last course also checks the first: the tile wraps).
  function courses(S, NR, R, hv, nbs, gap) {
    const RY = [0], RH = [], hs = [];
    for (let r = 0; r < NR; r++) hs.push(1 - hv / 2 + R() * hv);
    const ht = hs.reduce((a, b) => a + b, 0);
    for (let r = 0; r < NR; r++) { RH.push(hs[r] / ht * S); RY.push(RY[r] + RH[r]); }
    const ROW = new Uint8Array(S);
    for (let y = 0, r = 0; y < S; y++) { while (r < NR - 1 && y + 0.5 >= RY[r + 1]) r++; ROW[y] = r; }
    const wd = (a, b) => { const d = Math.abs(a - b) % S; return Math.min(d, S - d); }, J = [];
    for (let r = 0; r < NR; r++) {
      let js = null;
      for (let tr = 0; tr < 40; tr++) {
        const nb = nbs[(R() * nbs.length) | 0], w = [];
        let tw = 0, x = R() * S;
        for (let k = 0; k < nb; k++) { const v = 0.75 + R() * 0.5; w.push(v); tw += v; }
        const c = [];
        for (let k = 0; k < nb; k++) { c.push(x % S); x += w[k] / tw * S; }
        js = c.sort((a, b) => a - b);
        const near = [r > 0 ? J[r - 1] : null, r === NR - 1 ? J[0] : null].filter(Boolean);
        if (near.every(p => js.every(a => p.every(b => wd(a, b) > gap)))) break;
      }
      J.push(js);
    }
    return { RY, RH, ROW, J };
  }

  // Main street (LEVEL's path layer): big pale cream / light sand flagstones — 8 courses of ~0.5 m (±18 %), 3–6 slabs each
  // (0.5–1.7 m; no joint lines up with the one below), worn smooth with soft bevels, each slab a little tilted, a few chipped
  // corners, narrow light sandy joints with a rare tuft of moss. Paler, calmer and bigger than townStone's honey cobbles, so the
  // main route reads as a lighter, wider street (a brighter tint on townStone alone hardly shows after tone mapping). The courses
  // run along u (anti: 0).
  function genTownPath() {
    const S = 512, n = S * S, NR = 8, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 32, 3, 761), mot = fbm(S, 16, 4, 762), big = fbm(S, 4, 3, 763), msk = fbm(S, 8, 3, 764), fuzz = fbm(S, 32, 2, 766);
    const fine = fbm(S, 128, 1, 7), grain = fbm(S, 32, 4, 748), grit = fbm(S, 64, 2, 8), R = mulberry32(765);
    const { RY, RH, ROW, J } = courses(S, NR, R, 0.36, [3, 4, 5, 5, 6], 30);
    const pal = [0xf0e4ca, 0xeadabc, 0xf2e8d4, 0xe8d6b6, 0xeee0c4, 0xe4d4b8, 0xecdcc0].map(hex3), NBk = NR * 8;
    const C = new Float32Array(NBk * 3), BH = new Float32Array(NBk), TX = new Float32Array(NBk), TY = new Float32Array(NBk);
    for (let id = 0; id < NBk; id++) {
      const c = pal[(hash(id, 3) * pal.length) | 0], b = 0.94 + hash(id, 4) * 0.1;
      C[id * 3] = c[0] * b; C[id * 3 + 1] = c[1] * b; C[id * 3 + 2] = c[2] * b; BH[id] = hash(id, 2); TX[id] = hash(id, 6) - 0.5; TY[id] = hash(id, 7) - 0.5;
    }
    tame(C, Array.from({ length: NBk }, (_, k) => k), 11, 7);
    for (let y = 0, i = 0; y < S; y++) {
      const r = ROW[y], rh = RH[r], ly = y + 0.5 - RY[r], js = J[r], nb = js.length;
      for (let x = 0; x < S; x++, i++) {
        const X = x + 0.5; let k = nb - 1;
        for (let q = 0; q < nb; q++) if (X >= js[q]) k = q;
        const a = js[k], b = k < nb - 1 ? js[k + 1] : js[0] + S, lx = X >= a ? X - a : X + S - a, bw = b - a;
        const dx = Math.min(lx, bw - lx), dy = Math.min(ly, rh - ly), rc = 9;
        let e = (dx < rc && dy < rc) ? rc - hyp(rc - dx, rc - dy) : Math.min(dx, dy);
        e += (wob[i] - 0.5) * 4.5 - ss(0.8, 0.94, wob[i]) * 5;   // worn, a little irregular, here and there chipped edges
        const id = r * 8 + k, j0 = 1.8 + grit[i] * 0.6, t = clamp((e - j0) / 6, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - j0 + 0.5, 0, 1);
        const mo = ss(0.66, 0.76, msk[i]) * ss(0.35, 0.7, fuzz[i]);   // rare moss tufts in the joints
        const tl = ((lx - bw * 0.5) * TX[id] + (ly - rh * 0.5) * TY[id]) * 0.006 * bev;   // each slab a little tilted
        const hs = 0.3 + bev * (0.5 + BH[id] * 0.08) + tl + (mot[i] - 0.5) * 0.05 + (grain[i] - 0.5) * 0.02 + (fine[i] - 0.5) * 0.008;
        const hm = 0.06 + grit[i] * 0.05 + mo * 0.05;
        H[i] = hm + (Math.max(hs, hm) - hm) * cov;
        const br = (0.93 + (mot[i] - 0.5) * 0.1 + (grain[i] - 0.5) * 0.05 + (big[i] - 0.5) * 0.05) * (0.86 + 0.14 * bev) * (0.95 + 0.05 * ss(4, 16, e));
        const gk = 0.84 + grit[i] * 0.3, ma = mo * 0.85, f = fuzz[i] * 26, o = id * 3, p = i * 4;
        const jr = (192 + (108 + f - 192) * ma) * gk, jg = (172 + (136 + f - 172) * ma) * gk, jb = (140 + (62 - 140) * ma) * gk;
        A[p] = jr + (C[o] * br - jr) * cov; A[p + 1] = jg + (C[o + 1] * br - jg) * cov; A[p + 2] = jb + (C[o + 2] * br - jb) * cov; A[p + 3] = 255;
      }
    }
    cavityWarm(A, H, S, 3, 0.9, 0.72, 1.04);
    return surf(A, H, S, 3);
  }

  // Town walls (surlar) and round towers: big warm-beige sandstone blocks — 6 courses of ~0.6 m (heights vary a little), 2–4 blocks
  // each (0.9–1.8 m; no joint lines up with the one below), soft chamfered edges, a dressed face (a smooth drafted margin inside the
  // chamfer around a slightly grainier, gently pillowed field), soft horizontal bedding bands, sparse little pores, a rare faint
  // hairline crack and a few chipped corners, in recessed light mortar. Light and low in saturation (neutral cavity shading), so
  // LEVEL can tint it (vertex / instance colour). v runs up the wall (triplanar: world y).
  function genRampart() {
    const S = 512, n = S * S, m = S - 1, NR = 6, A = new Uint8ClampedArray(n * 4), H = new Float32Array(n);
    const wob = fbm(S, 32, 3, 741), mot = fbm(S, 16, 4, 742), big = fbm(S, 4, 3, 743), bed = fbm(S, 2, 3, 744, 0.5, 24), bed2 = fbm(S, 4, 2, 745, 0.5, 48);
    const crk = fbm(S, 8, 4, 746), fine = fbm(S, 128, 1, 7), grain = fbm(S, 32, 4, 748), R = mulberry32(747);
    const { RY, RH: RHs, ROW, J } = courses(S, NR, R, 0.2, [2, 3, 3, 4], 40);
    const pal = [0xdcd0b6, 0xd6c9ae, 0xe2d7c0, 0xd4c6aa, 0xdbcdb0, 0xe0d2b8, 0xd0c3a8, 0xd9cdb6].map(hex3), NBk = NR * 8, C = new Float32Array(NBk * 3), BH = new Float32Array(NBk);
    for (let id = 0; id < NBk; id++) { const c = pal[(hash(id, 3) * pal.length) | 0], b = 0.93 + hash(id, 4) * 0.12; C[id * 3] = c[0] * b; C[id * 3 + 1] = c[1] * b; C[id * 3 + 2] = c[2] * b; BH[id] = hash(id, 2); }
    tame(C, Array.from({ length: NBk }, (_, k) => k), 10, 6);
    for (let y = 0, i = 0; y < S; y++) {
      const r = ROW[y], rh = RHs[r], ly = y + 0.5 - RY[r], js = J[r], nb = js.length;
      for (let x = 0; x < S; x++, i++) {
        const X = x + 0.5; let k = nb - 1;
        for (let q = 0; q < nb; q++) if (X >= js[q]) k = q;
        const a = js[k], b = k < nb - 1 ? js[k + 1] : js[0] + S, lx = X >= a ? X - a : X + S - a, bw = b - a;
        const dx = Math.min(lx, bw - lx), dy = Math.min(ly, rh - ly), rc = 9;
        let e = (dx < rc && dy < rc) ? rc - hyp(rc - dx, rc - dy) : Math.min(dx, dy);
        e += (wob[i] - 0.5) * 5 - ss(0.74, 0.9, wob[i]) * 7;   // uneven, here and there chipped edges
        const id = r * 8 + k, j0 = 3.6, t = clamp((e - j0) / 12, 0, 1), bev = Math.sqrt(1 - (1 - t) * (1 - t)), cov = clamp(e - j0 + 0.5, 0, 1);
        const pu = 2 * lx / bw - 1, pv = 2 * ly / rh - 1, pw = (1 - pu * pu) * (1 - pv * pv);   // pillow face
        const fd = ss(19, 25, e + (wob[i] - 0.5) * 3);   // 0 on the drafted margin … 1 on the dressed field
        const cl = (1 - ss(0, 0.01, Math.abs(crk[i] - 0.5))) * ss(0.76, 0.9, hash(id, 5) * 0.5 + big[i] * 0.5) * fd;
        const bd = (bed[i] - 0.5) * 0.7 + (bed2[i] - 0.5) * 0.3;
        const hb = bev * (0.8 + BH[id] * 0.12) + pw * 0.07 * fd + (mot[i] - 0.5) * 0.08 + (fine[i] - 0.5) * 0.012 + (grain[i] - 0.5) * 0.05 * fd
          + bd * 0.03 - cl * 0.12, hm = 0.05 + fine[i] * 0.04;
        H[i] = hm + (Math.max(hb, hm) - hm) * cov;
        const br = (0.9 + (mot[i] - 0.5) * 0.12 + (fine[i] - 0.5) * 0.02 + (grain[i] - 0.5) * 0.08 * fd + bd * 0.16) * (0.84 + 0.16 * bev) * (1 + (1 - fd) * bev * 0.035) * (1 - cl * 0.18)
          * (1 - (1 - ly / rh) * 0.08 * big[i]);
        const mk = 0.9 + fine[i] * 0.15, mr = 204 * mk, mg = 196 * mk, mb = 180 * mk, o = id * 3, p = i * 4;
        A[p] = mr + (C[o] * br - mr) * cov; A[p + 1] = mg + (C[o + 1] * br - mg) * cov; A[p + 2] = mb + (C[o + 2] * br - mb) * cov; A[p + 3] = 255;
      }
    }
    // sparse little round pores (sandstone)
    for (let q = 0; q < 360; q++) {
      const cx = R() * S, cy = R() * S, rr = 0.9 + R() * R() * 2.6, dp = 0.04 + rr * 0.015;
      for (let py = Math.floor(cy - rr - 1); py <= cy + rr + 1; py++) for (let px = Math.floor(cx - rr - 1); px <= cx + rr + 1; px++) {
        const d = hyp(px + 0.5 - cx, py + 0.5 - cy) / rr; if (d >= 1) continue;
        const i = (py & m) * S + (px & m), b = 1 - d * d, o = i * 4;
        H[i] -= dp * b; A[o] *= 1 - 0.1 * b; A[o + 1] *= 1 - 0.11 * b; A[o + 2] *= 1 - 0.12 * b;
      }
    }
    cavity(A, H, S, 5, 1.1, 0.62, 1.06);
    return surf(A, H, S, 4);
  }

  // ── Feza's T-shirt: canvas print (clouds, pastel planes, stars on off-white) + ribbed-knit normal map ──
  function genShirt() {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'), R = mulberry32(501), ink = '#2c2733';
    g.fillStyle = '#eee8df'; g.fillRect(0, 0, S, S);   // #fbf8f3 toned down so it doesn't bloom in full sun
    const items = [];
    const place = (type, count, rad) => {
      for (let c = 0; c < count; c++) for (let t = 0; t < 60; t++) {
        const x = R() * S, y = R() * S;
        let ok = true;
        for (const it of items) {
          let dx = Math.abs(x - it.x), dy = Math.abs(y - it.y); dx = Math.min(dx, S - dx); dy = Math.min(dy, S - dy);
          if (dx * dx + dy * dy < (rad + it.rad) * (rad + it.rad)) { ok = false; break; }
        }
        if (ok) { items.push({ type, x, y, rad, a: (R() - 0.5) * 0.9, f: R() < 0.5 ? 1 : -1, v: R() }); break; }
      }
    };
    place('plane', 5, 54); place('cloud', 13, 30); place('star', 40, 7);
    const planeCols = ['#f4a0bd', '#8fc6ef', '#f5cd6a', '#f4a0bd', '#8fc6ef'];
    let pc = 0;
    for (const it of items) if (it.type === 'plane') it.col = planeCols[pc++ % 5];
    const starCols = ['#f28cb1', '#f2b650', '#86bdf0', '#f4a261'];
    const cloudPath = (w) => {
      g.beginPath();
      g.moveTo(-w * 0.9, w * 0.3);
      g.bezierCurveTo(-w * 1.25, w * 0.3, -w * 1.2, -w * 0.25, -w * 0.78, -w * 0.18);
      g.bezierCurveTo(-w * 0.8, -w * 0.62, -w * 0.25, -w * 0.72, -w * 0.12, -w * 0.4);
      g.bezierCurveTo(0, -w * 0.9, w * 0.62, -w * 0.82, w * 0.55, -w * 0.3);
      g.bezierCurveTo(w * 1.05, -w * 0.4, w * 1.2, w * 0.3, w * 0.8, w * 0.3);
      g.closePath();
    };
    const drawCloud = (w) => {
      g.save(); cloudPath(w); g.clip();
      g.fillStyle = 'rgba(196,190,222,0.85)'; g.translate(-w * 0.12, w * 0.1); cloudPath(w); g.translate(0, w * 0.38); g.fill();
      g.restore();
      cloudPath(w); g.strokeStyle = ink; g.lineWidth = 2.1; g.lineJoin = 'round'; g.stroke();
      g.beginPath(); g.arc(-w * 0.3, -w * 0.05, w * 0.18, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    };
    const drawPlane = (w, col) => {
      // watercolour body (side view, nose to the right), printed slightly off-register from the line art
      g.fillStyle = col; g.globalAlpha = 0.92;
      g.beginPath();
      g.moveTo(w * 0.55, 0);
      g.bezierCurveTo(w * 0.55, -w * 0.2, w * 0.2, -w * 0.2, -w * 0.3, -w * 0.12);
      g.lineTo(-w * 0.52, -w * 0.4); g.lineTo(-w * 0.64, -w * 0.38); g.lineTo(-w * 0.6, w * 0.06);
      g.bezierCurveTo(-w * 0.2, w * 0.16, w * 0.4, w * 0.2, w * 0.55, 0);
      g.fill();
      g.beginPath(); g.ellipse(w * 0.06, -w * 0.36, w * 0.36, w * 0.065, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(w * 0.02, w * 0.12, w * 0.3, w * 0.06, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;
      g.save(); g.translate(w * 0.04, w * 0.03);
      g.strokeStyle = ink; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(-w * 0.05, w * 0.18); g.bezierCurveTo(w * 0.2, w * 0.24, w * 0.45, w * 0.18, w * 0.55, 0); g.stroke();
      g.beginPath(); g.moveTo(-w * 0.3, -w * 0.14); g.lineTo(-w * 0.5, -w * 0.42); g.lineTo(-w * 0.62, -w * 0.4); g.stroke();
      g.beginPath(); g.moveTo(-w * 0.12, -w * 0.3); g.lineTo(-w * 0.12, -w * 0.12); g.moveTo(w * 0.2, -w * 0.3); g.lineTo(w * 0.2, -w * 0.12);
      g.moveTo(-w * 0.12, -w * 0.3); g.lineTo(w * 0.2, -w * 0.12); g.moveTo(w * 0.2, -w * 0.3); g.lineTo(-w * 0.12, -w * 0.12); g.stroke();
      g.beginPath(); g.moveTo(-w * 0.26, -w * 0.36); g.lineTo(w * 0.4, -w * 0.36); g.stroke();
      g.beginPath(); g.ellipse(w * 0.6, 0, w * 0.035, w * 0.2, 0, 0, TAU); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(w * 0.6, 0, w * 0.035, 0, TAU); g.fill();
      g.lineWidth = 1.7;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(-w * 0.02 + k * w * 0.15, -w * 0.02, w * 0.045, 0, TAU); g.stroke(); }
      g.restore();
    };
    const drawStar = (r, col) => {
      g.fillStyle = col; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k & 1 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill();
    };
    for (const it of items) for (let oy = -S; oy <= S; oy += S) for (let ox = -S; ox <= S; ox += S) {
      const x = it.x + ox, y = it.y + oy;
      if (x < -80 || x > S + 80 || y < -80 || y > S + 80) continue;
      g.save(); g.translate(x, y); g.rotate(it.a * (it.type === 'star' ? 2 : 0.6)); g.scale(it.f, 1);
      if (it.type === 'plane') drawPlane(76, it.col);
      else if (it.type === 'cloud') drawCloud(24 + it.v * 8);
      else drawStar(4.5 + it.v * 2.5, starCols[(it.v * 97 | 0) % 4]);
      g.restore();
    }
    // faint rib shading (the knit's valleys)
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(214,204,196,0.12)';
    for (let x = 0; x < S; x += 8) g.fillRect(x + 5, 0, 2, S);
    g.globalCompositeOperation = 'source-over';
    const map = new THREE.CanvasTexture(cv);
    map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = ANISO;
    map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter;
    // ribbed knit: vertical ribs every 8 px, little stacked stitch loops along each rib
    const n = S * S, H = new Float32Array(n);
    for (let y = 0, i = 0; y < S; y++) for (let x = 0; x < S; x++, i++) {
      const ph = ((x + 0.5) % 8) / 8, rib = Math.pow(0.5 - 0.5 * Math.cos(ph * TAU), 0.7);
      const st = 0.5 + 0.5 * Math.cos(((y + 0.5) / 6 + (((x / 4) | 0) & 1) * 0.5) * TAU);
      H[i] = rib * (0.85 + 0.15 * st);
    }
    return { map, normalMap: dtex(normals(H, S, 0.9), S, false) };
  }

  // Macro-variation noise (linear RGBA, 4 independent tileable fbm channels at different scales) — sample it at a large
  // world scale (e.g. uv = xz / 37) to tint/blend ground layers so the texture repeat never shows.
  function genNoise() {
    const S = 256, n = S * S, D = new Uint8ClampedArray(n * 4), F = [fbm(S, 4, 5, 191), fbm(S, 8, 4, 192), fbm(S, 16, 3, 193), fbm(S, 2, 5, 194)];
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) D[i * 4 + c] = F[c][i] * 255;
    return dtex(D, S, false);
  }

  function genPoison() {
    const S=512,n=S*S,A=new Uint8ClampedArray(n*4),H=new Float32Array(n),N=fbm(S,6,5,173),F=fbm(S,48,2,179),L=ramp([[0,0x182923],[0.5,0x465238],[1,0x7b7850]]);
    for(let i=0;i<n;i++){paint(A,i,L,N[i]*0.75+F[i]*0.25,1);H[i]=N[i]*0.28+F[i]*0.08;}
    return surf(A,H,S,1.8);
  }

  function genBlightSoil() {
    const S=512,n=S*S,A=new Uint8ClampedArray(n*4),H=new Float32Array(n),wet=fbm(S,5,5,211),grit=fbm(S,64,2,213),L=ramp([[0,0x3c4637],[.45,0x766c4f],[1,0xa39870]]);
    for(let i=0;i<n;i++){const w=ss(.52,.76,wet[i]);paint(A,i,L,.12+wet[i]*.66+grit[i]*.2,1-w*.25);H[i]=wet[i]*.3+grit[i]*.13-w*.08;}
    pebbles(A,H,S,217,120,1.5,7,[0xafa48a,0x8a816a,0xb4a082],.3);cavity(A,H,S,3,1.3,.68,1.05);return surf(A,H,S,3.2);
  }
  function genOathStone() {
    // The creature/prop surface must match its 256px lazy placeholder; a 512px generator silently produces flat fallback pixels.
    const S=256,n=S*S,A=new Uint8ClampedArray(n*4),H=new Float32Array(n),F=fbm(S,4,4,221),G=fbm(S,64,1,223),V=voronoi(S,7,227,.7),L=ramp([[0,0x554f43],[.5,0x8c806a],[1,0xb6a080]]);
    for(let i=0;i<n;i++){const crack=1-ss(.25,1.7,V.E[i]);paint(A,i,L,F[i]*.7+G[i]*.3,1-crack*.45);H[i]=F[i]*.23+G[i]*.06-crack*.12;}cavity(A,H,S,2,1.3,.67,1.05);return surf(A,H,S,2.8);
  }

  const GEN = { grass: genGrass, dirt: genDirt, cobble: genCobble, caveFloor: genCaveFloor, caveSand: genCaveSand, castleFloor: genCastleFloor,
    carpet: genCarpet, brick: genBrick, rock: genRock, wood: genWood, bark: genBark, roof: genRoof, plaster: genPlaster, leaves: genLeaves,
    fabric: genFabric, metal: genMetal, moss: genMoss, shirt: genShirt, basalt: genBasalt, ash: genAsh, lava: genLava,
    yogurt: genBlightSoil, biscuit: genAsh, cheese: genCaveFloor, milk: genPoison, swiss: genOathStone,
    townStone: genTownStone, townPath: genTownPath, plaza: genPlaza, rampart: genRampart };
  // Surfaces only the kefir/cave/volcano/town/castle zones need: TEX.init() gives them placeholder textures (real, shareable Texture objects)
  // whose pixels are generated by TEX.ensure(theme) — or automatically the first time anything reads image.data (GPU upload, canvas copy).
  // swiss = jointless cheese (256 px) for props and creatures (cheese wheels / wedges, the peynir wedge).
  const THEME = { forest: [], dairy: ['yogurt', 'biscuit', 'cheese', 'milk', 'swiss'], cave: ['caveFloor', 'caveSand'], volcano: ['basalt', 'ash', 'lava'],
    town: ['townStone', 'townPath', 'plaza', 'rampart'], castle: ['castleFloor', 'carpet', 'brick'] };
  const SIZE = { swiss: 256 };   // lazy surfaces that are not 512 px (a size here also makes a surface lazy when it has no theme)
  // Zone index → theme: ZONES (06_level.js) when it is there, else the Round 5 order.
  function themeOf(i) {
    try { if (typeof ZONES !== 'undefined' && ZONES && ZONES[i] && ZONES[i].theme) return ZONES[i].theme; } catch (e) { /* not loaded yet */ }
    return ['forest', 'dairy', 'cave', 'volcano', 'town', 'castle'][i];
  }
  const LAZY = {}, PEND = {};
  for (const th in THEME) for (const k of THEME[th]) LAZY[k] = SIZE[k] || 512;
  for (const k in SIZE) if (!LAZY[k]) LAZY[k] = SIZE[k];
  let batch = 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clearNC = () => { for (const k in NC) delete NC[k]; };
  const setData = (t, d) => Object.defineProperty(t.image, 'data', { value: d, writable: true, enumerable: true, configurable: true });
  function flat(n, r, g, b, a) { const d = new Uint8Array(n); for (let i = 0; i < n; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; } return d; }

  // A pending surface's image: reading image.data generates the pixels (realize swaps the getter for the real array).
  function arm(k, img) {
    Object.defineProperty(img, 'data', { enumerable: true, configurable: true, get() {
      if (PEND[k]) realize(k, true);
      const d = Object.getOwnPropertyDescriptor(img, 'data');
      return d && 'value' in d ? d.value : null;
    } });
  }
  function placeholder(k) {
    const S = LAZY[k], s = {};
    for (const [key, srgb] of [['map', true], ['normalMap', false]]) {
      const t = dtex(new Uint8Array(0), 1, srgb), img = { width: S, height: S };   // same sampler settings as a generated surface
      arm(k, img);
      t.image = img;   // clones (TEX.rep) share this image object through the texture's Source
      s[key] = t;
    }
    PEND[k] = s;
    return s;
  }
  // Free generated lazy surfaces (GPU copies of the textures and their TEX.rep clones + the pixel arrays) and make them pending
  // again. The Texture objects stay the same, so every material that holds them stays valid: TEX.ensure — or the next draw that
  // uses one — generates it again (same seeds → same pixels) and uploads it.
  function drop(list) {
    const out = [];
    for (const k of list) {
      const s = TEX[k];
      if (!LAZY[k] || PEND[k] || !s || !s.map || !s.normalMap) continue;
      const imgs = [s.map.image, s.normalMap.image];
      if (!imgs.every(im => im && typeof im === 'object' && (Object.getOwnPropertyDescriptor(im, 'data') || {}).configurable)) continue;
      PEND[k] = s;
      for (const im of imgs) arm(k, im);
      s.map.dispose(); s.normalMap.dispose();   // three.js deletes the GL texture once no texture sharing its image uses it
      for (const key in REP) if (key.slice(0, key.indexOf('@')) === k) { REP[key].map.dispose(); REP[key].normalMap.dispose(); }
      out.push(k);
    }
    return out;
  }
  const listOf = th => (th == null || th === 'all' ? Object.keys(LAZY) : THEME[th] || (LAZY[th] ? [th] : []));
  // Generate a pending surface and hand its pixels to the placeholder textures (never uploaded yet, or disposed by TEX.release:
  // either way three.js uploads them at their next use).
  function realize(k, lazy) {
    const P = PEND[k]; if (!P) return;
    delete PEND[k];
    const t = now(), n = LAZY[k] * LAZY[k] * 4;
    let g = null;
    batch++;
    try { g = GEN[k](); } catch (e) { console.error('TEX ' + k, e); }
    batch--;
    const md = g && g.map.image.data.length === n ? g.map.image.data : flat(n, 200, 200, 200, 255);
    const nd = g && g.normalMap.image.data.length === n ? g.normalMap.image.data : flat(n, 128, 128, 255, 128);
    setData(P.map, md); setData(P.normalMap, nd);
    if (!batch) clearNC();
    TEX.times[k] = Math.round(now() - t);
    if (lazy) console.log('TEX ' + k + ' ' + TEX.times[k] + ' ms (on first use; call TEX.ensure(theme) during the zone fade)');
  }
  const initTex = t => { if (typeof renderer !== 'undefined' && renderer.initTexture) renderer.initTexture(t); };

  const TEX = {
    M, HINT, ready: false, times: {},
    // Generate the common + forest surfaces (synchronous) and upload them to the GPU. Kefir/cave/volcano/town/castle surfaces get placeholders
    // (see TEX.ensure). Safe to call twice.
    init() {
      if (TEX.ready) return TEX;
      const t0 = now(), log = [];
      batch++;
      for (const k in GEN) {
        if (LAZY[k]) { if (!TEX[k]) TEX[k] = placeholder(k); continue; }
        const t = now();
        try { TEX[k] = GEN[k](); } catch (e) { console.error('TEX ' + k, e); TEX[k] = TEX[k] || fallback(); }
        TEX.times[k] = Math.round(now() - t); log.push(k + ' ' + TEX.times[k]);
      }
      TEX.noise = genNoise();
      batch--;
      clearNC();
      TEX.ready = true;
      const tu = now();
      TEX.upload();
      TEX.times.upload = Math.round(now() - tu); TEX.times.total = Math.round(now() - t0);
      console.log('TEX ' + log.join(', ') + ' | upload ' + TEX.times.upload + ' | total ' + TEX.times.total + ' ms (later: ' + Object.keys(PEND).join(', ') + ')');
      return TEX;
    },
    // Generate the surfaces a zone theme needs ('forest' | 'dairy' | 'cave' | 'volcano' | 'town' | 'castle', or a zone index 0..5 → ZONES[i].theme;
    // a surface name also works; no argument = all) and upload them. Call it while the screen is faded (LEVEL.build).
    // Cheap no-op when they already exist.
    ensure(theme) {
      if (!TEX.ready) TEX.init();
      if (typeof theme === 'number') theme = themeOf(theme);
      const todo = (theme == null || theme === 'all' ? Object.keys(PEND) : THEME[theme] || (LAZY[theme] ? [theme] : [])).filter(k => PEND[k]);
      if (!todo.length) return TEX;
      const t0 = now(), log = [];
      batch++;
      try { for (const k of todo) { realize(k); log.push(k + ' ' + TEX.times[k]); } } finally { batch--; if (!batch) clearNC(); }
      const tu = now();
      for (const k of todo) { initTex(TEX[k].map); initTex(TEX[k].normalMap); }
      console.log('TEX ensure ' + theme + ': ' + log.join(', ') + ' | upload ' + Math.round(now() - tu) + ' | total ' + Math.round(now() - t0) + ' ms');
      return TEX;
    },
    // Names of surfaces whose pixels are not generated yet.
    pending: () => Object.keys(PEND),
    // Free a zone theme's surfaces (same arguments as ensure; no argument / 'all' = every kefir/cave/volcano/town/castle surface): GPU
    // textures + pixels go, the surfaces become pending again (TEX.ensure or their next use makes them again, ~0.1–0.3 s under the
    // fade). For zones behind the player (≈ 12 MB each on the GPU). Don't call it for the zone on screen (its next frame would make
    // them again). Returns the names it freed.
    release(theme) {
      if (!TEX.ready) return [];
      if (typeof theme === 'number') theme = themeOf(theme);
      const out = drop(listOf(theme));
      if (out.length) console.log('TEX release ' + theme + ': ' + out.join(', '));
      return out;
    },
    // Free every lazy surface the given zone (index) or theme doesn't use — call it with the zone about to load, e.g. next to
    // TEX.ensure(i) under the loading fade. Returns the names it freed.
    keepOnly(theme) {
      if (!TEX.ready) return [];
      if (typeof theme === 'number') theme = themeOf(theme);
      if (theme == null || !(THEME[theme] || LAZY[theme])) return [];   // unknown zone/theme: keep everything
      const keep = new Set(listOf(theme));
      const out = drop(Object.keys(LAZY).filter(k => !keep.has(k)));
      if (out.length) console.log('TEX keepOnly ' + theme + ': released ' + out.join(', '));
      return out;
    },
    // Upload all generated textures to the GPU now (avoids a hitch the first time a surface appears). Pending ones are skipped.
    upload() {
      if (typeof renderer === 'undefined' || !renderer.initTexture) return;
      if (!TEX.ready && !TEX.grass) return;
      for (const k in GEN) { const s = TEX[k]; if (s && !PEND[k]) { renderer.initTexture(s.map); renderer.initTexture(s.normalMap); } }
      if (TEX.noise) renderer.initTexture(TEX.noise);
    },
    // Clones with their own repeat (share the GPU image), cached per name+repeat.
    rep(name, rx, ry = rx) {
      const key = name + '@' + rx + 'x' + ry, c = REP[key];
      if (c) return c;
      const s = TEX[name]; if (!s) return null;
      const map = s.map.clone(), normalMap = s.normalMap.clone();
      map.repeat.set(rx, ry); normalMap.repeat.set(rx, ry);
      return (REP[key] = { map, normalMap });
    },
    // MeshStandardMaterial for a surface with sensible defaults; o overrides (repeat: [rx, ry] uses rep()).
    mat(name, o = {}) {
      const h = HINT[name] || [0.7, 1], rp = o.repeat, s = rp ? TEX.rep(name, rp[0], rp[1]) : TEX[name];
      const p = Object.assign({ roughness: h[0], metalness: h[2] || 0 }, o); delete p.repeat;
      if (s) { p.map = s.map; p.normalMap = s.normalMap; p.normalScale = new THREE.Vector2(h[1], h[1]); }
      if (o.normalScale !== undefined) p.normalScale = typeof o.normalScale === 'number' ? new THREE.Vector2(o.normalScale, o.normalScale) : o.normalScale;
      return new THREE.MeshStandardMaterial(p);
    },
  };
  const REP = {};
  function fallback() {
    const d = new Uint8ClampedArray(4 * 4 * 4).fill(200), nn = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < 16; i++) { nn[i * 4] = 128; nn[i * 4 + 1] = 128; nn[i * 4 + 2] = 255; nn[i * 4 + 3] = 128; }
    return { map: dtex(d, 4, true), normalMap: dtex(nn, 4, false) };
  }
  return TEX;
})();
