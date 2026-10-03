/* ── Efektler (FX): parçacıklar, kılıç izi, halkalar, uyarı daireleri, ışık sütunları, şimşek, kalkan, buz, mermiler, uçan yazılar ──
   Tek genel ad: FX (bkz. src/SPEC.md → "FX"). Her şey havuzlanır; kare başına bellek ayırma yapılmaz. */
'use strict';

const FX = (() => {
  let ready = false, clock = 0;
  const uTime = { value: 0 };
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _eu = new THREE.Euler(), _c = new THREE.Color();
  const _dbs = new THREE.Vector2(), ZAX = new THREE.Vector3(0, 0, 1), scr = { x: 0, y: 0, vis: false }, EMPTY = {};
  const sat = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - (1 - t) * (1 - t) * (1 - t);
  const backOut = t => { t -= 1; return 1 + 2.70158 * t * t * t + 1.70158 * t * t; };
  const keep = o => { o.userData.keep = true; return o; };   // shared geometry/material: survives disposeTree()
  const CHUNK_OUT = '#include <tonemapping_fragment>\n#include <colorspace_fragment>';   // correct output also in ?basit mode

  // Any colour → linear [r, g, b] × k (HDR allowed). Arrays pass through untouched (already linear). Cached.
  const colCache = new Map();
  function lin(c, k = 1) {
    if (c == null) return null;
    if (Array.isArray(c)) return k === 1 ? c : [c[0] * k, c[1] * k, c[2] * k];
    if (c.isColor) return [c.r * k, c.g * k, c.b * k];
    const key = k === 1 ? c : c + '*' + k;
    let a = colCache.get(key);
    if (!a) {
      if (colCache.size > 600) colCache.clear();
      _c.set(c); a = [_c.r * k, _c.g * k, _c.b * k]; colCache.set(key, a);
    }
    return a;
  }
  // Linear colour scaled so its brightest channel is k (keeps the hue: a blooming saber colour instead of a white blob).
  function hueNorm(c, k = 1) { const m = Math.max(c[0], c[1], c[2], 1e-4); return [c[0] / m * k, c[1] / m * k, c[2] / m * k]; }
  // hueNorm, and pale colours (the starter saber's cyan-white) pushed toward their hue: the arc must read as a colour.
  function vivid(c, k = 1) {
    const n = hueNorm(c), m = Math.min(n[0], n[1], n[2]);
    if (m > 0.3) { const d = m * 0.6; n[0] -= d; n[1] -= d; n[2] -= d; }
    return hueNorm(n, k);
  }

  // ───────────────────────── Atlas: 4 × 5 cells of 128 px, drawn with signed distance fields ─────────────────────────
  // Channels: R = shade (tint multiplier, darker rim), G = white highlight, A = coverage. Cells 0–15 keep their old places;
  // row 4 (Round 5) holds the new glyphs (16 ♫, 17–19 free). Only the cells in CELLS are painted.
  const SH = { GLOW: 0, STAR: 1, SPARK: 2, SMOKE: 3, HEART: 4, Z: 5, RING: 6, SHARD: 7, PLUS: 8, DOT: 9, PETAL: 10, FLAME: 11, SQUARE: 12, NOTE: 13, SWIRL: 14, FLOWER: 15,
    NOTES: 16 };
  const CELL = 128, ROWS = 5, PX1 = 1 / CELL;
  const aa = d => sat(0.5 - d / PX1);
  const gauss = (x, s) => Math.exp(-(x * x) / (s * s));
  function sdStar5(x, y, r, rf) {
    const k1x = 0.809016994375, k1y = -0.587785252292, k2x = -k1x, k2y = k1y;
    x = Math.abs(x);
    let d = Math.max(k1x * x + k1y * y, 0); x -= 2 * d * k1x; y -= 2 * d * k1y;
    d = Math.max(k2x * x + k2y * y, 0); x -= 2 * d * k2x; y -= 2 * d * k2y;
    x = Math.abs(x); y -= r;
    const bx = rf * -k1y, by = rf * k1x - 1;
    const h = clamp((x * bx + y * by) / (bx * bx + by * by), 0, r);
    return Math.hypot(x - bx * h, y - by * h) * Math.sign(y * bx - x * by);
  }
  function sdHeart(x, y) {
    return (Math.abs(x) * 0.86 + Math.abs(y - 0.56) * 0.7 - 0.42);
  }
  function sdSeg(px, py, ax, ay, bx, by) {
    const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
    const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
    return Math.hypot(pax - bax * h, pay - bay * h);
  }
  function sdBox(px, py, bx, by) {
    const dx = Math.abs(px) - bx, dy = Math.abs(py) - by;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
  }
  function sdTear(x, y, r1, r2, h) {   // uneven capsule: circle r1 at origin, r2 at (0, h)
    x = Math.abs(x);
    const b = (r1 - r2) / h, a = Math.sqrt(1 - b * b), k = -b * x + a * y;
    if (k < 0) return Math.hypot(x, y) - r1;
    if (k > a * h) return Math.hypot(x, y - h) - r2;
    return a * x + b * y - r1;
  }
  const smin = (a, b, k) => { const h = sat(0.5 + 0.5 * (b - a) / k); return b + (a - b) * h - k * h * (1 - h); };
  function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const PUFF = [[0, -0.05, 0.24], [-0.2, -0.08, 0.16], [0.2, -0.07, 0.17], [-0.08, 0.13, 0.18], [0.12, 0.12, 0.16]];
  const edgeShade = (d, w) => 0.64 + 0.36 * sat(-d / w);
  // Each painter gets cell coords x, y ∈ [-0.5, 0.5] (y up) and writes [shade, highlight, -, coverage] into o.
  const CELLS = [
    (x, y, o) => {   // 0 soft glow with a hot core
      const r = Math.hypot(x, y) * 2, e = Math.exp(-6);
      o[0] = 1; o[1] = Math.exp(-r * r * 22); o[3] = r >= 1 ? 0 : (Math.exp(-r * r * 6) - e) / (1 - e);
    },
    (x, y, o) => {   // 1 cracked execution rune, reused by the existing particle pool
      const blade = Math.abs(x) * 0.76 + Math.abs(y) - 0.35;
      const slit = sdBox(x, y, 0.024, 0.18);
      const d = Math.max(blade, -slit), f = aa(d), r = Math.hypot(x, y);
      const halo = 0.28 * Math.exp(-Math.max(d, 0) * 22) * sat((0.49 - r) / 0.08);
      o[3] = f + (1 - f) * halo; o[0] = 1 + (edgeShade(d, 0.07) - 1) * f;
      o[1] = f * (0.6 * gauss(x + 0.1, 0.022) + 0.18 * gauss(y - 0.12, 0.028));
    },
    (x, y, o) => {   // 2 four-point twinkle
      const r = Math.hypot(x, y), ax = Math.abs(x) / 0.47, ay = Math.abs(y) / 0.47;
      let c = Math.pow(sat(1 - Math.cbrt(ax * ax) - Math.cbrt(ay * ay)), 1.5);
      const bx = Math.abs(x + y) * 0.7071 / 0.23, by = Math.abs(x - y) * 0.7071 / 0.23;
      c = Math.max(c, 0.5 * Math.pow(sat(1 - Math.cbrt(bx * bx) - Math.cbrt(by * by)), 1.5), 0.65 * Math.exp(-r * r * 60));
      o[0] = 1; o[1] = Math.exp(-r * r * 130); o[3] = c;
    },
    (x, y, o) => {   // 3 cartoon smoke puff: cotton-ball lobes shaded from a height field
      const H = (px, py) => { let s = 0; for (const b of PUFF) { const dx = px - b[0], dy = py - b[1], q = b[2] * b[2] - dx * dx - dy * dy; s += Math.exp((q > 0 ? Math.sqrt(q) : 0) / 0.035); } return 0.035 * Math.log(s); };   // soft max: no hard creases
      const n0 = vnoise(x * 10 + 3, y * 10 + 7);
      let d = 1e9;
      for (const b of PUFF) d = smin(d, Math.hypot(x - b[0], y - b[1]) - b[2], 0.06);
      d += (n0 - 0.5) * 0.025;
      const e = 0.012, hx = (H(x + e, y) - H(x - e, y)) / (2 * e), hy = (H(x, y + e) - H(x, y - e)) / (2 * e);
      const l = 1 / Math.hypot(hx, hy, 1), nx = -hx * l, ny = -hy * l, nz = l;
      o[3] = sstep(0.015, -0.05, d) * (0.9 + 0.1 * n0);
      o[0] = 0.66 + 0.34 * Math.max(0, -0.45 * nx + 0.6 * ny + 0.66 * nz);
      o[1] = 0.3 * Math.pow(Math.max(0, -0.25 * nx + 0.32 * ny + 0.91 * nz), 14) * o[3];
    },
    (x, y, o) => {   // 4 jagged blood seal, shared by the legacy heart effects
      const d = (Math.abs(x) / 0.25 + Math.abs(y) / 0.42 - 1) * 0.19, f = aa(d);
      const cut = aa(sdSeg(x, y, -0.06, 0.22, 0.055, -0.12) - 0.024);
      o[3] = f * (1 - cut); o[0] = edgeShade(d, 0.06);
      o[1] = f * (1 - cut) * gauss(x + 0.06, 0.04) * sat(y + 0.2);
    },
    (x, y, o) => {   // 5 letter Z with a dark outline band
      const d = Math.min(sdSeg(x, y, -0.18, 0.2, 0.18, 0.2), sdSeg(x, y, 0.18, 0.2, -0.18, -0.2), sdSeg(x, y, -0.18, -0.2, 0.18, -0.2)) - 0.055;
      o[3] = aa(d - 0.04); o[0] = 0.3 + 0.7 * aa(d); o[1] = 0.45 * aa(d) * sat(y * 3 + 0.4);
    },
    (x, y, o) => {   // 6 ring / bubble
      const r = Math.hypot(x, y);
      o[3] = Math.max(gauss(r - 0.37, 0.045), 0.1 * sstep(0.15, 0.37, r) * (r < 0.37 ? 1 : 0));
      o[0] = 1; o[1] = gauss(r - 0.37, 0.03) * Math.pow(sat((-x + y) / (r + 1e-4) * 0.7071), 4) * 0.9;
    },
    (x, y, o) => {   // 7 faceted crystal shard
      const d = (Math.abs(x) / 0.15 + Math.abs(y) / 0.44 - 1) * 0.14, f = aa(d);
      o[3] = f; o[0] = x < 0 ? (y > 0 ? 1 : 0.84) : (y > 0 ? 0.74 : 0.6);
      o[1] = f * ((x < 0 && y > 0 ? 0.3 : 0) + 0.5 * gauss(x, 0.012) * (y > 0 ? 1 : 0.4));
    },
    (x, y, o) => {   // 8 rounded plus
      const d = Math.min(sdBox(x, y, 0.33, 0.1), sdBox(x, y, 0.1, 0.33)) - 0.04, f = aa(d);
      o[3] = f; o[0] = edgeShade(d, 0.05);
      o[1] = f * (0.8 * Math.exp(-((x + 0.03) ** 2 + (y - 0.22) ** 2) * 260) + 0.5 * Math.exp(-((x + 0.22) ** 2 + (y - 0.03) ** 2) * 260));
    },
    (x, y, o) => {   // 9 shiny ball
      const R = 0.36, f = aa(Math.hypot(x, y) - R), nx = x / R, ny = y / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      o[3] = f; o[0] = 0.5 + 0.5 * Math.max(0, -0.5 * nx + 0.6 * ny + 0.62 * nz);
      o[1] = f * 0.95 * Math.pow(Math.max(0, -0.278 * nx + 0.333 * ny + 0.9 * nz), 40);
    },
    (x, y, o) => {   // 10 petal / leaf with a vein
      const d = Math.max(Math.hypot(x - 0.27, y) - 0.4, Math.hypot(x + 0.27, y) - 0.4), f = aa(d);
      o[3] = f; o[0] = edgeShade(d, 0.06) * (1 - 0.25 * gauss(x, 0.012) * sat(1 - Math.abs(y) / 0.3)) * (x < 0 ? 1 : 0.88);
      o[1] = f * 0.45 * Math.exp(-((x + 0.05) ** 2 * 4 + (y - 0.08) ** 2) * 60);
    },
    (x, y, o) => {   // 11 flame tongue, hot core low
      const d = sdTear(x, y + 0.14, 0.23, 0.02, 0.55);
      o[3] = sstep(0.03, -0.09, d); o[0] = 0.72 + 0.28 * sat(-d / 0.1); o[1] = Math.exp(-(x * x * 5 + (y + 0.12) ** 2 * 2.2) * 22) * 0.9;
    },
    (x, y, o) => {   // 12 rounded square chip
      const d = sdBox(x, y, 0.24, 0.24) - 0.08, f = aa(d);
      o[3] = f; o[0] = edgeShade(d, 0.07) * (0.9 + 0.2 * (y - x)); o[1] = f * 0.6 * Math.exp(-((x + 0.14) ** 2 + (y - 0.14) ** 2) * 120);
    },
    (x, y, o) => {   // 13 broken iron link, emitted by the herald's curse
      const d0 = Math.abs(Math.hypot(x * 1.45, y + 0.12) - 0.17) - 0.035;
      const d1 = Math.abs(Math.hypot(x * 1.45, y - 0.12) - 0.17) - 0.035;
      const d = Math.min(d0, d1);
      o[3] = aa(d - 0.035); o[0] = 0.3 + 0.7 * aa(d); o[1] = 0.5 * aa(d) * Math.exp(-((x + 0.14) ** 2 + (y + 0.16) ** 2) * 300);
    },
    (x, y, o) => {   // 14 two-arm swirl
      const r = Math.hypot(x, y) / 0.45, a = Math.atan2(y, x);
      let v = (a / TAU) * 2 + r * 1.4; v -= Math.floor(v);
      o[3] = r >= 1 ? 0 : gauss(v - 0.5, 0.17) * Math.pow(1 - r, 0.9) * sstep(0, 0.2, r) + 0.6 * Math.exp(-r * r * 25);
      o[0] = 1; o[1] = Math.exp(-r * r * 40) * 0.8;
    },
    (x, y, o) => {   // 15 serrated curse seal
      const r = Math.hypot(x, y), a = Math.atan2(y, x) - Math.PI / 2;
      const d = (r - (0.27 + 0.09 * Math.pow(Math.max(0, Math.cos(8 * a)), 4))) * 0.75, f = aa(d), cf = aa(r - 0.1);
      const es = edgeShade(d, 0.06) * (0.9 + 0.1 * sat(r / 0.2));
      o[3] = f; o[0] = es + (1 - es) * cf; o[1] = f * (cf * 0.8 + 0.3 * Math.exp(-((x + 0.1) ** 2 + (y - 0.18) ** 2) * 200));
    },
    (x, y, o) => {   // 16 broken shackles
      const link = (px, py) => Math.abs(Math.hypot(px * 1.3, py) - 0.14) - 0.027;
      const d = Math.min(link(x + 0.2, y + 0.16), link(x - 0.2, y - 0.16), sdSeg(x, y, -0.15, -0.1, 0.15, 0.1) - 0.025);
      o[3] = aa(d - 0.035); o[0] = 0.3 + 0.7 * aa(d);
      o[1] = 0.5 * aa(d) * (Math.exp(-((x + 0.22) ** 2 + (y + 0.2) ** 2) * 300) + Math.exp(-((x - 0.13) ** 2 + (y + 0.13) ** 2) * 300));
    },
  ];
  function buildAtlas() {
    const W = CELL * 4, data = new Uint8Array(W * CELL * ROWS * 4), o = [0, 0, 0, 0];
    for (let cell = 0; cell < CELLS.length; cell++) {
      const cx = cell & 3, cy = cell >> 2, fn = CELLS[cell];
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) {
        o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
        fn((i + 0.5) / CELL - 0.5, (j + 0.5) / CELL - 0.5, o);
        const k = ((cy * CELL + j) * W + cx * CELL + i) * 4;
        data[k] = sat(o[0]) * 255 + 0.5; data[k + 1] = sat(o[1]) * 255 + 0.5; data[k + 2] = 0; data[k + 3] = sat(o[3]) * 255 + 0.5;
      }
    }
    const t = new THREE.DataTexture(data, W, CELL * ROWS, THREE.RGBAFormat);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }
  function buildBlobTex() {   // flat soft disc for ground markers under projectiles (alpha 1 in the middle, soft rim)
    const N = 64, data = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = Math.hypot((i + 0.5) / N - 0.5, (j + 0.5) / N - 0.5) * 2, k = (j * N + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = 255 * (1 - sstep(0.5, 1, r)) * (1 - 0.15 * sstep(0, 0.7, r));
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }
  // Ground marker under a kefir fizz bubble: a soft dark core (where it is) fading out through a soft pink glow (a coloured
  // halo that shows on the pale yogurt floor as well as on the biscuit path). Linear colours, straight alpha; colour-bleeds into the
  // transparent texels so mipmaps have no dark fringe.
  function buildFizzMarkTex() {
    const N = 64, data = new Uint8Array(N * N * 4), cc = lin('#2a1824'), cr = lin('#ff78b8');
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = Math.hypot((i + 0.5) / N - 0.5, (j + 0.5) / N - 0.5) * 2, k = (j * N + i) * 4;
      const ac = 0.46 * (1 - sstep(0.3, 0.68, r)), ar = 0.22 * sstep(0.34, 0.6, r) * (1 - sstep(0.7, 0.98, r));
      const A = ar + ac * (1 - ar), wr = A > 1e-3 ? ar / A : r > 0.55 ? 1 : 0;
      for (let q = 0; q < 3; q++) data[k + q] = Math.round(255 * (cr[q] * wr + cc[q] * (1 - wr)));
      data[k + 3] = Math.round(255 * A);
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }
  function buildGlowTex() {   // small radial glow for projectile halos (sprites)
    const N = 64, data = new Uint8Array(N * N * 4), o = [0, 0, 0, 0];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      CELLS[0]((i + 0.5) / N - 0.5, (j + 0.5) / N - 0.5, o);
      const k = (j * N + i) * 4, w = 255 * (0.8 + 0.2 * o[1]);
      data[k] = w; data[k + 1] = w; data[k + 2] = w; data[k + 3] = sat(o[3]) * 255;
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  }

  // ───────────────────────── Particles: two THREE.Points systems (additive + normal blend) ─────────────────────────
  const ST = 32;   // floats of CPU state per particle
  const PX = 0, PY = 1, PZ = 2, VX = 3, VY = 4, VZ = 5, AGE = 6, LIFE = 7, S0 = 8, S1 = 9, R0 = 10, G0 = 11, B0 = 12, R1 = 13, G1 = 14, B1 = 15,
    AL = 16, GRV = 17, DRG = 18, ROT = 19, SPN = 20, SHP = 21, POP = 22, FAD = 23, FLK = 24, BNC = 25, OX = 26, OZ = 27, ORB = 28, WOB = 29, STR = 30, PHS = 31;
  const uScale = { value: 1000 }, uMaxPt = { value: 256 };
  let SA = null, SN = null, atlas = null, glowTex = null, blobTex = null;
  const PT_VS = `attribute vec4 aCol; attribute vec4 aMisc; uniform float uScale, uMaxPt;
    varying vec4 vCol; varying vec2 vRot; varying vec2 vCell; varying float vStr, vSoft;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = min(uMaxPt, aMisc.x * uScale / max(0.2, -mv.z));
      if (aMisc.x <= 0.0 || aCol.a <= 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vCol = aCol; vRot = vec2(cos(aMisc.y), sin(aMisc.y));
      float sh = aMisc.z; vSoft = step(63.5, sh); sh -= 64.0 * vSoft;   // shape + 64 = soft shading (milk / kefir: no grey belly)
      vCell = vec2(mod(sh + 0.01, 4.0) - 0.01, floor(sh / 4.0 + 0.01)); vStr = aMisc.w;
    }`;
  const PT_FS = `uniform sampler2D uAtlas; varying vec4 vCol; varying vec2 vRot; varying vec2 vCell; varying float vStr, vSoft;
    void main() {
      vec2 p = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
      p = vec2(vRot.x * p.x + vRot.y * p.y, -vRot.y * p.x + vRot.x * p.y);
      p.x *= vStr;
      vec4 t = texture2D(uAtlas, (vCell + clamp(p, -0.5, 0.5) + 0.5) * vec2(0.25, ${1 / ROWS}));
      float a = t.a * vCol.a;
      if (dot(p, p) > 0.25 || a < 0.003) discard;
      float m = max(max(vCol.r, vCol.g), vCol.b);
      float sd = mix(t.r, 1.0 - (1.0 - t.r) * 0.5, vSoft);
      gl_FragColor = vec4(mix(vCol.rgb * sd, vec3(max(m, 1.0)), t.g), a);
      ${CHUNK_OUT}
    }`;
  function makeSys(cap, add) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 4), misc = new Float32Array(cap * 4);
    const aP = new THREE.BufferAttribute(pos, 3), aC = new THREE.BufferAttribute(col, 4), aM = new THREE.BufferAttribute(misc, 4);
    aP.setUsage(THREE.DynamicDrawUsage); aC.setUsage(THREE.DynamicDrawUsage); aM.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', aP); geo.setAttribute('aCol', aC); geo.setAttribute('aMisc', aM);
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas }, uScale, uMaxPt }, vertexShader: PT_VS, fragmentShader: PT_FS,
      transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.renderOrder = add ? 31 : 30; pts.name = add ? 'fxAdd' : 'fxNorm';
    scene.add(pts);
    return { cap, n: 0, d: new Float32Array(cap * ST), pos, col, misc, aP, aC, aM, geo, pts };
  }
  function updScale() {
    renderer.getDrawingBufferSize(_dbs);
    uScale.value = _dbs.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5));
  }

  // Scratch particle for presets (reset by P(); no allocations). Burst origin/scale apply to every emitted particle.
  const sp = {};
  let bx = 0, by = 0, bz = 0, bk = 1;
  function P(add, shape, x, y, z) {
    sp.add = add; sp.shape = shape; sp.x = x; sp.y = y; sp.z = z; sp.vx = 0; sp.vy = 0; sp.vz = 0;
    sp.life = 1; sp.size = 0.3; sp.size1 = undefined; sp.color = C.W1; sp.color1 = undefined; sp.alpha = 1;
    sp.grav = 0; sp.drag = 0; sp.rot = Math.random() * TAU; sp.spin = 0; sp.pop = 0; sp.fade = 1; sp.flick = 0; sp.bounce = 0;
    sp.orbit = 0; sp.ox = undefined; sp.oz = undefined; sp.wob = 0; sp.stretch = 1; sp.delay = 0; sp.phase = undefined; sp.glow = 1; sp.soft = 0;
    return sp;
  }
  function emitRaw(p) {
    const S = p.add === false || p.add === 0 ? SN : SA;
    const i = S.n < S.cap ? S.n++ : (Math.random() * S.cap) | 0;
    const d = S.d, o = i * ST, k = bk;
    d[o + PX] = bx + (p.x - bx) * k; d[o + PY] = by + (p.y - by) * k; d[o + PZ] = bz + (p.z - bz) * k;
    d[o + VX] = (p.vx || 0) * k; d[o + VY] = (p.vy || 0) * k; d[o + VZ] = (p.vz || 0) * k;
    d[o + AGE] = -(p.delay || 0); d[o + LIFE] = p.life > 0 ? p.life : 1;
    const s0 = (p.size ?? 0.3) * k; d[o + S0] = s0; d[o + S1] = p.size1 == null ? s0 : p.size1 * k;
    const g = p.glow || 1, c0 = lin(p.color ?? C.W1), c1 = p.color1 == null ? c0 : lin(p.color1);
    d[o + R0] = c0[0] * g; d[o + G0] = c0[1] * g; d[o + B0] = c0[2] * g; d[o + R1] = c1[0] * g; d[o + G1] = c1[1] * g; d[o + B1] = c1[2] * g;
    d[o + AL] = p.alpha ?? 1; d[o + GRV] = (p.grav || 0) * k; d[o + DRG] = p.drag || 0;
    d[o + ROT] = p.rot ?? Math.random() * TAU; d[o + SPN] = p.spin || 0; d[o + SHP] = (p.shape || 0) + (p.soft ? 64 : 0);
    d[o + POP] = p.pop || 0; d[o + FAD] = p.fade || 1; d[o + FLK] = p.flick || 0; d[o + BNC] = p.bounce || 0;
    d[o + OX] = bx + ((p.ox ?? p.x) - bx) * k; d[o + OZ] = bz + ((p.oz ?? p.z) - bz) * k; d[o + ORB] = p.orbit || 0;
    d[o + WOB] = (p.wob || 0) * k; d[o + STR] = p.stretch || 1; d[o + PHS] = p.phase ?? Math.random() * TAU;
  }
  function upd(a, n) { a.clearUpdateRanges(); a.addUpdateRange(0, n); a.needsUpdate = true; }
  function stepSys(S, dt, te) {
    const d = S.d, pos = S.pos, col = S.col, misc = S.misc;
    let n = S.n, i = 0;
    while (i < n) {
      const o = i * ST, life = d[o + LIFE];
      const age = d[o + AGE] + dt;
      if (age >= life) { n--; if (i < n) d.copyWithin(o, n * ST, n * ST + ST); continue; }
      d[o + AGE] = age;
      const i3 = i * 3, i4 = i * 4;
      if (age < 0) { misc[i4] = 0; col[i4 + 3] = 0; pos[i3] = d[o + PX]; pos[i3 + 1] = d[o + PY]; pos[i3 + 2] = d[o + PZ]; i++; continue; }
      let vx = d[o + VX], vy = d[o + VY], vz = d[o + VZ];
      const drag = d[o + DRG], g = d[o + GRV];
      if (drag > 0) { const f = 1 / (1 + drag * dt); vx *= f; vy *= f; vz *= f; }
      vy -= g * dt;
      let x = d[o + PX] + vx * dt, y = d[o + PY] + vy * dt, z = d[o + PZ] + vz * dt;
      const wob = d[o + WOB];
      if (wob !== 0) x += Math.cos(age * 4.2 + d[o + PHS]) * wob * dt;
      const orb = d[o + ORB];
      if (orb !== 0) {
        const a = orb * dt, c = Math.cos(a), s = Math.sin(a), cx = d[o + OX], cz = d[o + OZ], dx = x - cx, dz = z - cz;
        x = cx + dx * c - dz * s; z = cz + dx * s + dz * c;
      }
      if (g > 0 && y < 0.03) { y = 0.03; if (vy < 0) { vy = -vy * d[o + BNC]; vx *= 0.55; vz *= 0.55; d[o + SPN] *= 0.5; } }
      d[o + PX] = x; d[o + PY] = y; d[o + PZ] = z; d[o + VX] = vx; d[o + VY] = vy; d[o + VZ] = vz;
      const t = age / life;
      let s = d[o + S0] + (d[o + S1] - d[o + S0]) * t;
      const pop = d[o + POP];
      if (pop > 0 && age < pop) s *= backOut(age / pop);
      const fd = d[o + FAD];
      let a = d[o + AL] * (1 - (fd === 1 ? t : fd === 2 ? t * t : Math.pow(t, fd)));
      const fl = d[o + FLK];
      if (fl !== 0) a *= 0.6 + 0.4 * Math.sin(age * fl + d[o + PHS]);
      let rot = d[o + ROT] + d[o + SPN] * dt; d[o + ROT] = rot;
      let str = d[o + STR];
      if (str > 1) {   // velocity-aligned streak (in screen space)
        const sx = te[0] * vx + te[4] * vy + te[8] * vz, sy = te[1] * vx + te[5] * vy + te[9] * vz;
        rot = Math.atan2(sy, sx) - Math.PI / 2;
        str = 1 + (str - 1) * Math.min(1, (sx * sx + sy * sy) / 9);
      }
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      col[i4] = d[o + R0] + (d[o + R1] - d[o + R0]) * t; col[i4 + 1] = d[o + G0] + (d[o + G1] - d[o + G0]) * t;
      col[i4 + 2] = d[o + B0] + (d[o + B1] - d[o + B0]) * t; col[i4 + 3] = a;
      misc[i4] = s; misc[i4 + 1] = rot; misc[i4 + 2] = d[o + SHP]; misc[i4 + 3] = str;
      i++;
    }
    S.n = n;
    S.geo.setDrawRange(0, n);
    if (n > 0) { upd(S.aP, n * 3); upd(S.aC, n * 4); upd(S.aM, n * 4); }
  }

  // ───────────────────────── Presets ─────────────────────────
  let C = null;   // palette: linear colours, HDR (> 1.25 blooms)
  function palette() {
    C = {
      W1: [1, 1, 1], W2: [2, 2, 2], W3: [3, 3, 3],
      YEL: lin('#c8a272', 2.3), GOLD: lin('#ffb638', 2.5), ORG: lin('#ff8a2a', 2.6), RED: lin('#ff4a2a', 2.2),
      PINKG: lin('#a75045', 2.6), HEARTS: ['#922f35', '#b56d53', '#887668', '#ac897a'].map(h => lin(h, 1.05)),
      ICE: lin('#aabdb9'), ICEG: lin('#789e9c', 2.1), ICEW: lin('#d1dcd1', 2.2), GREEN: lin('#a59c65', 2.1), GREENW: lin('#dbd6b5', 2.1), PLUS: lin('#b1a578'),
      PURP: lin('#86639b', 2.2), MAG: lin('#944258', 2.1), BLUE: lin('#70538c', 2.2),
      FIRE0: lin('#ffc850', 2.4), FIRE1: lin('#ff4a1a', 2.0),
      DUST: lin('#a38e7a'), SMOKE: lin('#9e9595'), GHOST: lin('#dcd0ff'), DARK: lin('#8a6ab8'),
      SPORE: lin('#919b62'), SPOREG: lin('#a0ab70', 2.2), ZC: lin('#665e56'), NOTE: lin('#b6a58e'),
      CONF: ['#925447', '#ffd23f', '#899798', '#6a7952', '#7d6b7b', '#ff9a3c'].map(h => lin(h)),
      CONFG: ['#925447', '#ffd23f', '#899798', '#6a7952', '#7d6b7b', '#ff9a3c'].map(h => lin(h, 2.6)),
      SLIME: lin('#c8f7e4'), SLIMEG: ['#9ff5d8', '#d8b8ff', '#fff0a0', '#a8e8ff'].map(h => lin(h, 2.2)),
      DIRTDUST: lin('#c9a882'),
      BUBW: lin('#e6f6ff', 1.5), BUBD: lin('#eef9ff'), BUBR: lin('#cdeaff', 1.2),
      BUBP: ['#99625d', '#8faaa4', '#938093', '#9d9c64', '#b5a588'].map(h => lin(h)),
      PASTELG: ['#a86258', '#92a39c', '#8b7589', '#8e9b75', '#b1a180'].map(h => lin(h, 1.8)),
      GLITTER: ['#af705d', '#8d7891', '#b19b8f', '#879e9e'].map(h => lin(h, 2.0)).concat([[1.5, 1.4, 1.2]]),
      // Volcano (Round 3): molten orange that blooms in its own hue, cheerful light smoke, white steam puffs. Kept near 1–1.5:
      // the final (neutral) tone mapping desaturates brighter values toward white, and lava must read ORANGE.
      LAVA0: lin('#ffb530', 1.45), LAVA1: lin('#ff7a1a', 1.3), LAVA2: lin('#ff4414', 0.95), LAVAG: hueNorm(lin('#ff8a2a'), 1.1),
      LFL0: hueNorm(lin('#ffa830'), 1.35), LFL1: hueNorm(lin('#ff561a'), 0.95), EMB0: lin('#ffc84a', 2.2), EMB1: lin('#ff5a1a', 1.5),
      CRUST: lin('#8a5a48'), ASH: lin('#c6b4ae'), ASHL: lin('#d8c8c0'), STEAM: lin('#fffaf5'),
      ROCKC: ['#6a4430', '#8a5c3c', '#a87a52'].map(h => lin(h)), JELLY: '#ff5fb0',
      // Kefir Vadisi (Round 4): milk and kefir stay just under 1 (never bloom into a white blob; normal blend, so however many
      // overlap they stay creamy); droplets use the soft atlas shading (p.soft: a light cool belly, not grey) + a white glint.
      // Crumbs: golden biscuit browns. Sparkles: pastel strawberry / blueberry / honey / mint.
      MILK: lin('#a5a17c', 0.97), MILKW: lin('#b8ae8b', 0.97), MILKC: lin('#818c72', 0.95), MILKP: lin('#a8956c', 0.9),
      KEFIR: lin('#aca079', 0.96), KEFIRB: ['#b9a58c', '#a18b81', '#869588', '#a0a27d'].map(h => lin(h, 0.97)),
      KEFG: ['#b27567', '#91a5a1', '#b99b70', '#9da17a', '#968093'].map(h => lin(h, 1.8)),
      KEFR: ['#a56d66', '#7f9b97', '#8f7886', '#8a936b', '#aa9679'].map(h => lin(h)),
      CRUMB: ['#e3ad5c', '#c98a3c', '#f0cb86', '#b0702e', '#dca050'].map(h => lin(h)), OAT: lin('#f4e2b8'), CRUMBD: lin('#efdcb6'),
      // Surlu Şehir (Round 5): toasty simit browns + cream sesame; hoof dust in sand and cream puffs (the sandy ones show on
      // the pale plaza, the cream ones on the honey cobbles); silver sparkles a touch cool beside the gold, and solid gold /
      // sky-blue stars for the pale plaza; candy-coloured music notes (the solid ones stay under 1: they never bloom).
      SIMITC: ['#c8742c', '#a95a20', '#e09a4a', '#8c4818', '#d6883a'].map(h => lin(h)), SESAME: lin('#fff0c6'), SESAMED: lin('#f2d9a0'),
      HOOFD: ['#e2c08e', '#faf0de', '#d8b480', '#f4e6cc'].map(h => lin(h)), HOOFP: ['#c9a676', '#ad8656'].map(h => lin(h)),
      SILV: lin('#eef4ff', 2.6), SILVB: lin('#bcd6ff', 2.4), SILVG: lin('#dfeaff', 1.6),
      SHOEG: lin('#b9875c', 0.98), SHOEY: lin('#c1a284', 0.98), SHOEB: lin('#91809f', 0.98),
      NOTEC: ['#b57666', '#8fa4a2', '#b4a484', '#849374', '#917d95', '#bd8a6b'].map(h => lin(h, 0.95)),
      // Round 6 (boss bonus games): solid bonk / dizzy / marker stars (a touch over 1: they bloom a little, but stay solid on
      // pale floors), the serin taş's mint shards and cool mist, the big soap bubble's film pink-lilac.
      BONK: lin('#c4a178', 1.05), BONK2: lin('#ad8064', 1.0), DZ0: lin('#bd927a', 1.05), DZ1: lin('#bfc0b1', 1.0), MSTAR: lin('#c1a17d', 1.0),
      MINT: ['#9a90a7', '#b5a7b8', '#786881', '#c7bdbf', '#968ca1'].map(h => lin(h)), MINTG: lin('#8b789b', 1.8), MINTW: lin('#c5b9d0', 2.0),
      MIST: lin('#bdb5bd', 0.97), SOAPF: lin('#89679a', 0.95),
    };
    C.NOTEG = C.NOTEC.map(c => hueNorm(c, 2.2));
  }
  const N = (n, K) => Math.max(1, Math.round(n * K));
  function radial(q, s0, s1, u0, u1) { const a = Math.random() * TAU, s = frand(s0, s1); q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s; q.vy = frand(u0, u1); return a; }
  function twinkles(n, x, y, z, spread, col, size) {
    for (let i = 0; i < n; i++) {
      const q = P(1, SH.SPARK, x + frand(-spread, spread), y + frand(-spread * 0.6, spread), z + frand(-spread, spread));
      q.vx = frand(-0.4, 0.4); q.vy = frand(0.3, 1.2); q.vz = frand(-0.4, 0.4); q.size = frand(0.7, 1.2) * size; q.size1 = 0.04;
      q.life = frand(0.5, 0.9); q.pop = 0.1; q.flick = frand(14, 24); q.rot = frand(-0.3, 0.3); q.spin = frand(-1.5, 1.5);
      q.color = col || (i % 3 ? C.W3 : C.YEL); q.delay = frand(0, 0.12); emitRaw(q);
    }
  }
  function flashGlow(x, y, z, size, col, life, alpha) {
    const q = P(1, SH.GLOW, x, y, z); q.size = size; q.size1 = size * 0.35; q.life = life; q.color = col; q.alpha = alpha; emitRaw(q);
  }
  const MAIN = { hit: 6, crit: 12, sparkle: 8, cheer: 6, coin: 5, dust: 6, step: 2, levelup: 22, ice: 10, fire: 8, smoke: 6, heal: 7, magic: 8,
    portal: 6, spore: 6, ghost: 5, debris: 10, zzz: 3, embers: 8, confetti: 28, star: 1, shadowPuff: 6, zap: 6,
    slime: 2, dirt: 8, bubblePop: 7, bubbles: 3, bubble: 7, pop: 7, glitter: 3, dig: 8, mud: 8, clods: 8, trail: 2,
    lava: 12, magma: 12, erupt: 16, eruption: 16, volcano: 16, steam: 4, vent: 4, jelly: 9, splat: 9,
    milk: 12, cream: 12, yogurt: 12, splash: 12, fizz: 10, kefir: 10, foam: 6, fizzPop: 8, crumbs: 10, crumb: 10, biscuit: 10,
    hoof: 5, gallop: 5, hooves: 5, notes: 7, note: 7, music: 7, horseshoe: 16, clink: 16, simit: 10, sesame: 10,
    bonk: 6, hearts: 10, heart: 10, love: 10, charm: 10, bigPop: 16, crack: 12, rend: 8, cinder: 14, oath: 8, dread: 12 };
  const B = {
    dread(x,y,z,o,K) {
      const dir=o.dir||{x:0,z:1},col=lin('#79518e',1.6);
      for(let i=0,n=N(12,K);i<n;i++){
        const side=(i/Math.max(1,n-1)-.5)*1.2,q=P(i%3===0?1:0,SH.SHARD,x,y,z);
        q.vx=dir.x*3.6+dir.z*side*2;q.vz=dir.z*3.6-dir.x*side*2;q.vy=.5+(i%3)*.22;
        q.size=.32;q.size1=.08;q.life=.52;q.color=i%3===0?col:lin('#b8a38f');q.grav=2.5;q.drag=1.2;q.spin=side*8;q.fade=2;emitRaw(q);
      }
      for(let i=0;i<3;i++){
        const q=P(0,SH.SMOKE,x,y-.25,z);q.vx=dir.x*(1+i*.5);q.vz=dir.z*(1+i*.5);q.vy=.3;
        q.size=.35;q.size1=.95;q.life=.65;q.alpha=.35;q.color=lin('#584653');q.drag=2;q.fade=2;emitRaw(q);
      }
    },
    rend(x, y, z, o, K) {
      const col = lin(o.color || '#a75749', 1.25), dx = o.dir ? o.dir.x : 0, dz = o.dir ? o.dir.z : 0;
      for (let i = 0, n = N(8, K); i < n; i++) {
        const q = P(i < 2 ? 1 : 0, SH.SHARD, x, y, z);
        radial(q, 1.5, 4.5, 0.6, 2.5); q.vx += dx * 2; q.vz += dz * 2;
        q.size = frand(0.2, 0.4); q.size1 = 0.05; q.life = frand(0.25, 0.55); q.grav = 8; q.drag = 1.4;
        q.spin = frand(-12, 12); q.color = i < 2 ? lin('#c6ae91', 1.6) : col; q.fade = 2.5; emitRaw(q);
      }
      flashGlow(x, y, z, 0.7, col, 0.12, 0.3);
    },
    cinder(x, y, z, o, K) {
      const col = lin(o.color || '#af6f54', 1.5);
      for (let i = 0, n = N(14, K); i < n; i++) {
        const q = P(i % 4 === 0 ? 1 : 0, i % 4 === 0 ? SH.SPARK : SH.SHARD, x, y, z);
        radial(q, 2.2, 6, 1.5, 4.7); q.grav = 11; q.bounce = 0.25; q.drag = 0.8;
        q.size = frand(0.16, 0.42); q.size1 = q.size * 0.6; q.life = frand(0.65, 1.1);
        q.color = i % 4 === 0 ? col : lin(i & 1 ? '#685953' : '#9d8270'); q.color1 = lin('#58494b');
        q.spin = frand(-14, 14); q.fade = 2; emitRaw(q);
      }
      for (let i = 0; i < N(3, K); i++) {
        const q = P(0, SH.SMOKE, x, 0.15, z); radial(q, 1.2, 2.8, 0.1, 0.4);
        q.size = 0.75; q.size1 = 1.8; q.life = 0.9; q.alpha = 0.4; q.drag = 2.4; q.color = lin('#77706a'); emitRaw(q);
      }
    },
    oath(x, y, z, o, K) {
      for (let i = 0, n = N(8, K); i < n; i++) {
        const a = i / n * TAU, r = o.radius || 1.2, q = P(0, SH.STAR, x + Math.sin(a) * r, y, z + Math.cos(a) * r);
        q.vy = 1.1; q.size = 0.28; q.size1 = 0.08; q.life = 0.6; q.delay = (i % 3) * 0.035;
        q.color = lin(o.color || '#b79b81', 1.15); q.rot = a; q.fade = 2; emitRaw(q);
      }
    },
    // opts.color (the saber's blade colour, or a projectile's colour): the flash, ring and energy streaks take that hue and
    // a few crackling sparks fly off — a "zap". The cute yellow stars stay. No coloured droplets (a red blade must never
    // look like anything but sparks).
    hit(x, y, z, o, K) {
      const dx = o.dir ? o.dir.x * 2.2 : 0, dz = o.dir ? o.dir.z * 2.2 : 0, cc = o.color ? vivid(lin(o.color), 2.3) : null;
      flashGlow(x, y, z, 1.1, cc || C.W3, 0.1, cc ? 0.36 : 0.6);
      let q = P(1, SH.RING, x, y, z); q.life = 0.22; q.size = 0.35; q.size1 = 1.7; q.color = cc || C.YEL; q.alpha = 0.75; q.fade = 1.6; emitRaw(q);
      for (let i = 0, n = N(6, K); i < n; i++) {
        q = P(1, SH.STAR, x, y, z); radial(q, 2.2, 4.4, 1.4, 3.8); q.vx += dx; q.vz += dz;
        q.size = frand(0.34, 0.48); q.size1 = 0.14; q.life = frand(0.36, 0.52); q.drag = 3; q.grav = 7; q.spin = frand(-9, 9); q.pop = 0.07; q.fade = 2.5;
        q.color = i & 1 ? C.YEL : cc || C.W2; q.color1 = C.GOLD; emitRaw(q);
      }
      for (let i = 0, n = N(4, K); i < n; i++) {
        q = P(1, SH.GLOW, x, y, z); radial(q, 6, 9, 0, 3); q.vx += dx * 1.5; q.vz += dz * 1.5;
        q.size = cc ? 0.6 : 0.8; q.size1 = 0.2; q.stretch = 5; q.life = frand(0.12, 0.18); q.drag = 6;
        q.color = cc ? (i & 1 ? C.W2 : cc) : C.W3; q.color1 = cc || C.YEL; emitRaw(q);
      }
      if (cc) for (let i = 0, n = N(3, K); i < n; i++) {   // crackle: tiny flickering sparks in the blade colour
        q = P(1, SH.SPARK, x + frand(-0.25, 0.25), y + frand(-0.2, 0.3), z + frand(-0.25, 0.25)); radial(q, 0.6, 1.6, 0.2, 1.2);
        q.size = frand(0.2, 0.3); q.size1 = 0.03; q.life = frand(0.18, 0.3); q.flick = 30; q.rot = frand(-0.4, 0.4); q.color = cc; q.delay = frand(0, 0.06); emitRaw(q);
      }
    },
    crit(x, y, z, o, K) {
      const dx = o.dir ? o.dir.x * 2.5 : 0, dz = o.dir ? o.dir.z * 2.5 : 0, cc = o.color ? vivid(lin(o.color), 2.3) : null;
      flashGlow(x, y, z, cc ? 1.6 : 2.1, cc || C.W3, 0.15, cc ? 0.42 : 0.75);
      let q = P(1, SH.RING, x, y, z); q.life = 0.32; q.size = 0.5; q.size1 = 3.4; q.color = C.GOLD; q.alpha = 0.9; q.fade = 1.6; emitRaw(q);
      q = P(1, SH.RING, x, y, z); q.life = 0.22; q.size = 0.3; q.size1 = 2.2; q.color = cc || C.W3; q.alpha = 0.6; q.fade = 1.4; emitRaw(q);
      for (let i = 0, n = N(cc ? 10 : 12, K); i < n; i++) {
        q = P(1, SH.STAR, x, y, z); radial(q, 3, 6, 1.8, 5); q.vx += dx; q.vz += dz;
        q.size = frand(0.42, 0.62); q.size1 = 0.16; q.life = frand(0.45, 0.65); q.drag = 2.6; q.grav = 7; q.spin = frand(-10, 10); q.pop = 0.08; q.fade = 2.5;
        q.color = i % 3 === 0 ? cc || C.W2 : i % 3 === 1 ? C.YEL : C.GOLD; q.color1 = C.GOLD; emitRaw(q);
      }
      for (let i = 0, n = N(7, K); i < n; i++) {
        q = P(1, SH.GLOW, x, y, z); radial(q, 8, 12, 0, 4); q.vx += dx * 1.5; q.vz += dz * 1.5;
        q.size = cc ? 0.8 : 1.1; q.size1 = 0.3; q.stretch = 6; q.life = frand(0.14, 0.22); q.drag = 5;
        q.color = cc ? (i & 1 ? C.W2 : cc) : C.W3; q.color1 = cc || C.GOLD; emitRaw(q);
      }
      twinkles(N(5, K), x, y, z, 0.7, null, 0.45);
      if (cc) twinkles(N(3, K), x, y, z, 0.5, cc, 0.4);
    },
    sparkle(x, y, z, o, K) { twinkles(N(8, K), x, y, z, 0.5, o.color ? lin(o.color, 2.8) : null, 0.42); },
    cheer(x, y, z, o, K) {
      flashGlow(x, y, z, 1.8, C.PINKG, 0.3, 0.4);
      let q;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const a = (i / n) * TAU + frand(-0.3, 0.3), s = frand(0.6, 1.4), ph = frand(0, TAU);
        q = P(0, SH.SHARD, x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s * 0.6; q.vy = frand(1.8, 2.8); q.drag = 1.6; q.grav = -0.4; q.wob = 1.1; q.phase = ph;
        q.size = frand(0.38, 0.54); q.life = frand(1.3, 1.8); q.pop = 0.22; q.fade = 3; q.rot = frand(-0.35, 0.35); q.spin = frand(-0.6, 0.6);
        q.color = C.HEARTS[i % 4]; q.delay = i * 0.03; emitRaw(q);
        q.add = 1; q.shape = SH.GLOW; q.size *= 2.1; q.color = C.PINKG; q.alpha = 0.14; emitRaw(q);   // soft glow travelling with the heart
      }
      for (let i = 0, n = N(7, K); i < n; i++) {
        q = P(1, SH.STAR, x, y + 0.1, z); radial(q, 1.6, 3.4, 2.2, 4.2); q.drag = 2.4; q.grav = 1.5;
        q.size = frand(0.28, 0.42); q.size1 = 0.08; q.life = frand(0.8, 1.15); q.spin = frand(-6, 6); q.pop = 0.08; q.fade = 2;
        q.color = i & 1 ? C.YEL : C.GOLD; emitRaw(q);
      }
      twinkles(N(6, K), x, y + 0.2, z, 0.6, null, 0.4);
      for (let i = 0, n = N(2, K); i < n; i++) {
        q = P(0, SH.NOTE, x + frand(-0.4, 0.4), y + 0.3, z + frand(-0.2, 0.2)); q.vy = frand(1.0, 1.4); q.vx = frand(-0.5, 0.5); q.wob = 0.8;
        q.size = 0.4; q.life = 1.5; q.pop = 0.2; q.fade = 3; q.rot = frand(-0.3, 0.3); q.color = C.NOTE; q.delay = 0.12 + i * 0.22; emitRaw(q);
      }
    },
    coin(x, y, z, o, K) {
      flashGlow(x, y, z, 1.0, C.GOLD, 0.2, 0.7);
      let q;
      for (let i = 0, n = N(5, K); i < n; i++) {
        q = P(1, SH.SPARK, x, y, z); radial(q, 0.8, 1.8, 1.5, 3); q.grav = 3; q.size = frand(0.28, 0.4); q.size1 = 0.05; q.life = frand(0.4, 0.55);
        q.flick = 20; q.rot = 0; q.color = i & 1 ? C.YEL : C.W3; emitRaw(q);
      }
      for (let i = 0; i < N(2, K); i++) {
        q = P(1, SH.STAR, x, y, z); radial(q, 0.3, 0.8, 1.8, 2.6); q.drag = 2; q.size = 0.3; q.size1 = 0.06; q.life = 0.55; q.spin = frand(-6, 6); q.color = C.GOLD; emitRaw(q);
      }
    },
    dust(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.DUST, dx = o.dir ? o.dir.x * 1.2 : 0, dz = o.dir ? o.dir.z * 1.2 : 0;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x + frand(-0.2, 0.2), y + 0.1, z + frand(-0.2, 0.2)); radial(q, 0.8, 2.0, 0.2, 0.7); q.vx += dx; q.vz += dz;
        q.drag = 3.2; q.size = frand(0.45, 0.65); q.size1 = q.size * 2.1; q.life = frand(0.6, 0.95); q.alpha = 0.8; q.fade = 2.2; q.pop = 0.12;
        q.spin = frand(-1, 1); q.color = col; emitRaw(q);
      }
    },
    step(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.DUST;
      for (let i = 0, n = N(2, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x + frand(-0.1, 0.1), y + 0.05, z + frand(-0.1, 0.1)); radial(q, 0.3, 0.7, 0.15, 0.35);
        q.drag = 3; q.size = frand(0.22, 0.28); q.size1 = q.size * 2.2; q.life = frand(0.4, 0.5); q.alpha = 0.6; q.fade = 2; q.spin = frand(-1, 1); q.color = col; emitRaw(q);
      }
    },
    levelup(x, y, z, o, K) {
      const per = N(22, K), y0 = Math.max(0.12, y - 0.8);
      let q;
      for (let a = 0; a < 3; a++) for (let i = 0; i < per; i++) {
        const ang = a * TAU / 3 + i * 0.42, r = 0.95 - i * 0.012, kind = i % 3;
        q = P(1, kind === 0 ? SH.STAR : kind === 1 ? SH.SPARK : SH.GLOW, x + Math.cos(ang) * r, y0, z + Math.sin(ang) * r);
        q.vy = 3.1; q.orbit = 5.2; q.ox = x; q.oz = z; q.life = 0.95; q.delay = i * 0.035; q.size = kind === 2 ? 0.5 : kind === 1 ? 0.42 : 0.34; q.size1 = 0.08;
        q.color = C.GOLD; q.color1 = C.W2; q.spin = 4; q.pop = 0.08; q.flick = kind === 1 ? 20 : 0; emitRaw(q);
      }
      for (let i = 0, n = N(14, K); i < n; i++) {
        q = P(1, SH.STAR, x + frand(-0.4, 0.4), y0 + 0.2, z + frand(-0.4, 0.4)); radial(q, 0.5, 1.6, 4.5, 7.5);
        q.grav = 5; q.drag = 0.8; q.size = frand(0.3, 0.46); q.size1 = 0.1; q.life = frand(1.1, 1.5); q.spin = frand(-5, 5); q.fade = 2;
        q.color = i & 1 ? C.YEL : C.W3; q.delay = frand(0, 0.25); emitRaw(q);
      }
      flashGlow(x, y0 + 0.3, z, 3.4, C.GOLD, 0.6, 0.55);
      ring(x, z, { r0: 0.4, r1: 3.2, dur: 0.7, color: '#ffc640', width: 0.42 });
      lightFlash(x, z, '#ffd27a', 7, 0.8);
    },
    ice(x, y, z, o, K) {
      const dx = o.dir ? o.dir.x * 2 : 0, dz = o.dir ? o.dir.z * 2 : 0, col = o.color ? lin(o.color) : C.ICE;
      let q;
      for (let i = 0, n = N(10, K); i < n; i++) {
        q = P(0, SH.SHARD, x, y, z); radial(q, 2.5, 5.5, 2, 5); q.vx += dx; q.vz += dz; q.grav = 10; q.bounce = 0.3;
        q.size = frand(0.3, 0.46); q.size1 = q.size * 0.7; q.life = frand(0.7, 1.0); q.spin = frand(-14, 14); q.fade = 3; q.color = col; emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {
        q = P(1, SH.GLOW, x, y, z); radial(q, 0.6, 1.6, 0, 0.8); q.drag = 3; q.size = 0.8; q.size1 = 1.7; q.life = 0.38; q.alpha = 0.45; q.color = C.ICEG; emitRaw(q);
      }
      twinkles(N(8, K), x, y, z, 0.7, C.ICEW, 0.4);
      for (let i = 0; i < N(2, K); i++) {
        q = P(0, SH.SMOKE, x, y - 0.2, z); radial(q, 0.4, 0.9, 0.2, 0.5); q.drag = 2.5; q.size = 0.8; q.size1 = 2.0; q.life = 0.8; q.alpha = 0.35; q.color = C.ICE; q.spin = frand(-1, 1); emitRaw(q);
      }
    },
    fire(x, y, z, o, K) {
      const c0 = o.color ? lin(o.color, 3.2) : C.FIRE0;
      let q;
      for (let i = 0, n = N(8, K); i < n; i++) {
        q = P(1, SH.FLAME, x + frand(-0.25, 0.25), y + frand(0, 0.2), z + frand(-0.25, 0.25));
        q.vy = frand(1.4, 2.6); q.vx = frand(-0.4, 0.4); q.vz = frand(-0.4, 0.4); q.drag = 1; q.size = frand(0.75, 1.0); q.size1 = 0.2;
        q.life = frand(0.45, 0.7); q.rot = frand(-0.25, 0.25); q.wob = 0.6; q.color = c0; q.color1 = C.FIRE1; q.alpha = 0.85; q.fade = 1.5; q.pop = 0.08; q.delay = frand(0, 0.12); emitRaw(q);
      }
      for (let i = 0; i < N(3, K); i++) {
        q = P(1, SH.GLOW, x + frand(-0.2, 0.2), y + 0.15, z + frand(-0.2, 0.2)); q.vy = frand(0.8, 1.3); q.size = 1.3; q.size1 = 0.5; q.life = 0.5; q.alpha = 0.45; q.color = C.ORG; q.color1 = C.FIRE1; emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {
        q = P(1, SH.GLOW, x + frand(-0.3, 0.3), y + frand(0, 0.3), z + frand(-0.3, 0.3)); q.vy = frand(2, 3.5); q.vx = frand(-0.5, 0.5); q.vz = frand(-0.5, 0.5);
        q.size = frand(0.1, 0.16); q.life = frand(0.8, 1.2); q.flick = 16; q.wob = 1; q.color = C.ORG; q.color1 = C.RED; emitRaw(q);
      }
      q = P(0, SH.SMOKE, x, y + 0.5, z); q.vy = 0.9; q.size = 0.5; q.size1 = 1.3; q.life = 0.9; q.alpha = 0.28; q.delay = 0.2; q.color = C.SMOKE; q.spin = frand(-1, 1); emitRaw(q);
    },
    smoke(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.SMOKE;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x + frand(-0.2, 0.2), y, z + frand(-0.2, 0.2)); radial(q, 0.2, 0.6, 0.6, 1.2);
        q.drag = 1.4; q.size = frand(0.5, 0.65); q.size1 = q.size * 2.6; q.life = frand(1.0, 1.5); q.alpha = 0.7; q.fade = 1.8; q.pop = 0.15;
        q.spin = frand(-0.8, 0.8); q.color = col; emitRaw(q);
      }
    },
    heal(x, y, z, o, K) {
      let q;
      for (let i = 0, n = N(7, K); i < n; i++) {
        q = P(0, SH.PLUS, x + frand(-0.55, 0.55), y + frand(-0.3, 0.6), z + frand(-0.4, 0.4)); q.vy = frand(1.1, 1.9);
        q.size = frand(0.34, 0.46); q.size1 = 0.2; q.life = frand(0.9, 1.2); q.pop = 0.14; q.rot = 0; q.fade = 3; q.color = C.PLUS; q.delay = frand(0, 0.3); emitRaw(q);
        q.add = 1; q.shape = SH.GLOW; q.size *= 1.8; q.size1 = 0.3; q.color = C.GREEN; q.alpha = 0.3; emitRaw(q);
      }
      for (let i = 0, n = N(10, K); i < n; i++) {
        const a = Math.random() * TAU, r = frand(0.5, 0.7);
        q = P(1, SH.GLOW, x + Math.cos(a) * r, y - 0.4, z + Math.sin(a) * r); q.vy = frand(1.2, 1.7); q.orbit = 3; q.ox = x; q.oz = z;
        q.size = 0.24; q.size1 = 0.05; q.life = frand(0.8, 1.1); q.flick = 18; q.color = C.GREENW; q.delay = frand(0, 0.2); emitRaw(q);
      }
      for (let i = 0; i < N(2, K); i++) {
        q = P(0, SH.SHARD, x + frand(-0.3, 0.3), y + 0.2, z); q.vy = 1.4; q.wob = 0.6; q.size = 0.3; q.life = 1.1; q.pop = 0.2; q.fade = 3; q.rot = frand(-0.3, 0.3);
        q.color = C.HEARTS[i & 3]; q.delay = 0.1 + i * 0.15; emitRaw(q);
      }
    },
    magic(x, y, z, o, K) {
      const c = o.color ? lin(o.color, 2.6) : C.PURP;
      let q;
      for (let i = 0, n = N(8, K); i < n; i++) {
        q = P(1, SH.SPARK, x, y, z); radial(q, 0.8, 2, 0.5, 1.5); q.orbit = 2.5; q.ox = x; q.oz = z; q.drag = 1.5;
        q.size = frand(0.3, 0.42); q.size1 = 0.05; q.life = frand(0.5, 0.75); q.flick = 18; q.rot = 0; q.color = i & 1 ? c : C.MAG; emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {
        q = P(1, SH.GLOW, x, y, z); radial(q, 0.5, 1, 0, 0.6); q.drag = 2; q.size = 0.5; q.size1 = 0.1; q.life = 0.45; q.alpha = 0.8; q.color = c; emitRaw(q);
      }
      for (let i = 0; i < N(2, K); i++) {
        q = P(1, SH.SWIRL, x, y, z); q.size = 0.6; q.size1 = 1.4; q.life = 0.45; q.spin = i ? -7 : 7; q.alpha = 0.7; q.fade = 1.5; q.color = c; emitRaw(q);
      }
    },
    portal(x, y, z, o, K) {
      const c = o.color ? lin(o.color, 2.6) : C.BLUE;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const a = Math.random() * TAU, r = frand(1.0, 1.4);
        const q = P(1, i & 1 ? SH.GLOW : SH.SPARK, x + Math.cos(a) * r, y + frand(-0.4, 0.4), z + Math.sin(a) * r);
        q.vx = -Math.cos(a) * r * 1.1; q.vz = -Math.sin(a) * r * 1.1; q.vy = 0.6; q.orbit = 4; q.ox = x; q.oz = z;
        q.life = 0.8; q.size = i & 1 ? 0.3 : 0.36; q.size1 = 0.05; q.flick = 16; q.rot = 0; q.color = i % 3 ? c : C.PURP; emitRaw(q);
      }
    },
    spore(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.SPORE;
      let q;
      for (let i = 0, n = N(6, K); i < n; i++) {
        q = P(0, SH.DOT, x, y, z); radial(q, 0.3, 1, 0.4, 1); q.drag = 1.8; q.grav = -0.3; q.wob = 0.5;
        q.size = frand(0.13, 0.2); q.size1 = 0.05; q.life = frand(0.8, 1.2); q.pop = 0.1; q.color = col; emitRaw(q);
      }
      for (let i = 0; i < N(3, K); i++) {
        q = P(1, SH.GLOW, x, y, z); radial(q, 0.2, 0.6, 0.2, 0.6); q.size = 0.4; q.size1 = 0.15; q.life = 0.6; q.alpha = 0.5; q.color = C.SPOREG; emitRaw(q);
      }
    },
    ghost(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.GHOST;
      for (let i = 0, n = N(5, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x, y, z); radial(q, 0.3, 0.6, 0.4, 0.8); q.drag = 1.5; q.wob = 0.6;
        q.size = 0.45; q.size1 = 1.2; q.life = frand(0.8, 1.1); q.alpha = 0.55; q.fade = 1.8; q.spin = frand(-1, 1); q.color = col; emitRaw(q);
      }
      twinkles(N(4, K), x, y, z, 0.4, C.PURP, 0.36);
    },
    debris(x, y, z, o, K) {
      const base = o.color ?? '#b08a5a', v = [lin(base, 0.7), lin(base), lin(base, 1.25)];
      const dx = o.dir ? o.dir.x * 2 : 0, dz = o.dir ? o.dir.z * 2 : 0;
      let q;
      for (let i = 0, n = N(10, K); i < n; i++) {
        q = P(0, i % 3 ? SH.SQUARE : SH.SHARD, x, y, z); radial(q, 1.8, 4.5, 3, 6.5); q.vx += dx; q.vz += dz;
        q.grav = 13; q.bounce = 0.35; q.size = frand(0.2, 0.36); q.life = frand(0.9, 1.4); q.spin = frand(-12, 12); q.fade = 4; q.color = v[i % 3]; emitRaw(q);
      }
      for (let i = 0; i < N(3, K); i++) {
        q = P(0, SH.SMOKE, x, Math.max(0.1, y - 0.3), z); radial(q, 0.6, 1.4, 0.2, 0.6); q.drag = 3; q.size = 0.5; q.size1 = 1.2; q.life = 0.7; q.alpha = 0.75; q.fade = 2; q.color = C.DUST; q.spin = frand(-1, 1); emitRaw(q);
      }
      flashGlow(x, y, z, 1.1, C.W2, 0.12, 0.6);
    },
    zzz(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.ZC;
      for (let i = 0, n = N(3, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x + 0.08 * i, y + 0.08 * i, z); q.vx = 0.35; q.vy = 0.5; q.wob = 0.35;
        q.size = 0.5 + i * 0.12; q.size1 = q.size * 1.6; q.life = 1.7; q.pop = 0.25; q.fade = 2.5; q.rot = -0.25; q.spin = 0.12; q.color = col; q.delay = i * 0.5; emitRaw(q);
      }
    },
    embers(x, y, z, o, K) {
      const c = o.color ? lin(o.color, 2.6) : C.ORG;
      for (let i = 0, n = N(8, K); i < n; i++) {
        const q = P(1, SH.GLOW, x + frand(-0.5, 0.5), y + frand(0, 0.3), z + frand(-0.5, 0.5)); q.vy = frand(0.8, 1.8); q.vx = frand(-0.3, 0.3);
        q.wob = 0.7; q.flick = 12; q.size = frand(0.08, 0.14); q.life = frand(1, 1.8); q.color = c; q.color1 = C.RED; q.delay = frand(0, 0.4); emitRaw(q);
      }
    },
    confetti(x, y, z, o, K) {
      const shapes = [SH.SQUARE, SH.SHARD, SH.STAR, SH.SHARD, SH.SQUARE, SH.SHARD];
      for (let i = 0, n = N(28, K); i < n; i++) {
        const q = P(0, shapes[i % 6], x, y, z); radial(q, 1.5, 3.5, 4.5, 7.5); q.grav = 5.5; q.drag = 1.9; q.spin = frand(-10, 10); q.wob = 1.2;
        q.size = frand(0.17, 0.26); q.life = frand(1.8, 2.6); q.fade = 4; q.color = C.CONF[(i * 7) % 6]; q.delay = frand(0, 0.08); emitRaw(q);
      }
    },
    star(x, y, z, o, K) {
      const c = o.color ? lin(o.color, 3) : C.YEL;
      for (let i = 0, n = N(1, K); i < n; i++) {
        const q = P(1, SH.STAR, x + frand(-0.06, 0.06), y + frand(-0.06, 0.06), z + frand(-0.06, 0.06));
        q.vx = frand(-0.3, 0.3); q.vy = frand(-0.1, 0.4); q.vz = frand(-0.3, 0.3); q.size = 0.32; q.size1 = 0.04; q.life = 0.38; q.spin = frand(-6, 6);
        q.color = c; q.color1 = C.ORG; emitRaw(q);
      }
      if (Math.random() < 0.35) twinkles(1, x, y, z, 0.15, null, 0.3);
    },
    shadowPuff(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.DARK;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x, y, z); radial(q, 1, 1.8, 0.3, 0.6); q.drag = 2.6; q.size = 0.5; q.size1 = 1.4; q.life = frand(0.6, 0.8);
        q.alpha = 0.75; q.fade = 2; q.pop = 0.1; q.spin = frand(-1, 1); q.color = col; emitRaw(q);
      }
      twinkles(N(4, K), x, y, z, 0.4, C.PURP, 0.36);
    },
    zap(x, y, z, o, K) {   // electric sparks (lightning impact)
      const c = o.color ? lin(o.color, 2.8) : C.PURP;
      flashGlow(x, y, z, 1.3, C.W3, 0.12, 0.7);
      for (let i = 0, n = N(6, K); i < n; i++) {
        const q = P(1, SH.GLOW, x, y, z); radial(q, 5, 8, -1, 3); q.size = 0.6; q.size1 = 0.2; q.stretch = 5; q.life = frand(0.12, 0.2); q.drag = 5; q.color = i & 1 ? C.W3 : c; emitRaw(q);
      }
      twinkles(N(3, K), x, y, z, 0.3, c, 0.35);
    },
    // Snail slime trail (GAME emits one behind a moving snail every ~0.2 s): glossy pastel droplets that lie on the ground
    // for ~2 s, and a tiny twinkle now and then — sparkly, never gooey. opts.color tints the droplets.
    slime(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.SLIME;
      let q;
      for (let i = 0, n = N(2, K); i < n; i++) {   // soft wet sheen: overlapping translucent blobs form a streak
        const sz = frand(0.4, 0.52);
        q = P(0, SH.GLOW, x + frand(-0.07, 0.07), sz * 0.28, z + frand(-0.07, 0.07));
        q.size = sz; q.size1 = sz * 0.7; q.life = frand(1.9, 2.4); q.alpha = 0.36; q.fade = 3; q.rot = 0; q.color = col; q.delay = i * 0.08; emitRaw(q);
      }
      const bs = frand(0.08, 0.12);   // one glossy bead
      q = P(0, SH.DOT, x + frand(-0.1, 0.1), bs * 0.45, z + frand(-0.1, 0.1));
      q.size = bs; q.size1 = bs * 0.6; q.life = frand(1.6, 2.1); q.alpha = 0.7; q.fade = 3; q.pop = 0.12; q.rot = 0; q.color = col; emitRaw(q);
      if (Math.random() < 0.8 * K) {   // glitter
        q = P(1, SH.SPARK, x + frand(-0.18, 0.18), frand(0.05, 0.18), z + frand(-0.18, 0.18)); q.vy = frand(0.05, 0.2);
        q.size = frand(0.16, 0.26); q.size1 = 0.03; q.life = frand(0.7, 1.1); q.flick = frand(12, 20); q.rot = 0; q.spin = frand(-1, 1);
        q.color = C.SLIMEG[(Math.random() * C.SLIMEG.length) | 0]; q.delay = frand(0, 0.3); emitRaw(q);
      }
    },
    // Mole digging: brown earth clods hop out and bounce, with soft dust. opts: {color (soil), dir, scale, count}.
    dirt(x, y, z, o, K) {
      const base = o.color ?? '#8a5a34', v = [lin(base, 0.62), lin(base), lin(base, 1.3)];
      const dx = o.dir ? o.dir.x * 1.2 : 0, dz = o.dir ? o.dir.z * 1.2 : 0;
      let q;
      for (let i = 0, n = N(8, K); i < n; i++) {
        q = P(0, i % 3 ? SH.DOT : SH.SQUARE, x + frand(-0.2, 0.2), Math.max(0.05, y) + 0.05, z + frand(-0.2, 0.2)); radial(q, 0.8, 2.4, 2.4, 4.6);
        q.vx += dx; q.vz += dz; q.grav = 12; q.bounce = 0.3; q.drag = 0.4;
        q.size = frand(0.11, 0.2); q.life = frand(0.7, 1.05); q.spin = frand(-9, 9); q.fade = 4; q.color = v[i % 3]; emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {
        q = P(0, SH.SMOKE, x + frand(-0.25, 0.25), Math.max(0.05, y) + 0.1, z + frand(-0.25, 0.25)); radial(q, 0.5, 1.2, 0.2, 0.6); q.vx += dx * 0.5; q.vz += dz * 0.5;
        q.drag = 3; q.size = frand(0.4, 0.55); q.size1 = q.size * 2; q.life = frand(0.55, 0.8); q.alpha = 0.7; q.fade = 2; q.pop = 0.1; q.spin = frand(-1, 1);
        q.color = C.DIRTDUST; emitRaw(q);
      }
    },
    // Soap bubble popping: the film flicks out as a thin ring, tiny droplets and pastel rainbow twinkles.
    bubblePop(x, y, z, o, K) {
      const col = o.color ? hueNorm(lin(o.color), 1.2) : C.BUBR;
      let q = P(1, SH.RING, x, y, z); q.size = 0.55; q.size1 = 1.15; q.life = 0.18; q.color = col; q.alpha = 0.8; q.fade = 1.3; emitRaw(q);
      q = P(1, SH.GLOW, x, y, z); q.size = 0.6; q.size1 = 0.2; q.life = 0.12; q.color = col; q.alpha = 0.25; emitRaw(q);
      for (let i = 0, n = N(7, K); i < n; i++) {
        q = P(0, SH.DOT, x, y, z); radial(q, 1.6, 3.2, 0.4, 2.2); q.grav = 7; q.drag = 1;
        q.size = frand(0.07, 0.11); q.size1 = 0.03; q.life = frand(0.35, 0.55); q.alpha = 0.85; q.color = C.BUBD; emitRaw(q);
      }
      for (let i = 0, n = N(6, K); i < n; i++) {
        q = P(1, SH.SPARK, x + frand(-0.3, 0.3), y + frand(-0.25, 0.3), z + frand(-0.3, 0.3)); q.vx = frand(-0.5, 0.5); q.vy = frand(0.3, 1.1); q.vz = frand(-0.5, 0.5);
        q.size = frand(0.2, 0.32); q.size1 = 0.03; q.life = frand(0.45, 0.7); q.pop = 0.08; q.flick = frand(14, 22); q.rot = frand(-0.3, 0.3);
        q.color = C.PASTELG[i % C.PASTELG.length]; q.delay = frand(0, 0.08); emitRaw(q);
      }
    },
    // Floating soap bubbles + glitter (the dragon's bubble breath, or any playful puff). opts: {dir:{x,z}, speed, color}.
    bubbles(x, y, z, o, K) {
      const sp = o.speed || 3, dx = o.dir ? o.dir.x : 0, dz = o.dir ? o.dir.z : 0, tint = o.color ? hueNorm(lin(o.color), 1.3) : null;
      let q;
      for (let i = 0, n = N(3, K); i < n; i++) {
        const s = sp * frand(0.6, 1.1);
        // normal blend: however many overlap (a breath cone emits them every frame) they stay pastel, never a white cloud
        q = P(0, SH.RING, x + frand(-0.15, 0.15), y + frand(-0.15, 0.15), z + frand(-0.15, 0.15)); radial(q, 0.2, 0.8, -0.2, 0.6);
        q.vx += dx * s; q.vz += dz * s; q.drag = 1.1; q.grav = -0.25; q.wob = 0.6;
        q.size = frand(0.3, 0.6); q.size1 = q.size * 1.25; q.life = frand(0.7, 1.1); q.alpha = 0.95; q.fade = 3; q.pop = 0.15; q.rot = frand(-0.5, 0.5);
        q.color = tint || C.BUBP[(Math.random() * C.BUBP.length) | 0]; emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {
        const s = sp * frand(0.7, 1.25);
        q = P(1, i & 1 ? SH.SPARK : SH.STAR, x, y, z); radial(q, 0.3, 1.0, -0.3, 0.8);
        q.vx += dx * s; q.vz += dz * s; q.drag = 1.4; q.size = frand(0.16, 0.26); q.size1 = 0.04; q.life = frand(0.45, 0.75); q.alpha = 0.8;
        q.flick = 18; q.spin = frand(-6, 6); q.color = C.GLITTER[(Math.random() * 4) | 0]; emitRaw(q);
      }
    },
    // ── Volcano (Round 3) ── Molten droplets use NORMAL blending with HDR colours: they bloom orange, and however many
    // overlap they never add up to a white blob. Only the small flames/embers/glows are additive (hue-normalised).
    // Lava ball landing: orange splash crown that bounces and cools to red-orange, flames, rising embers, a few crust chips,
    // a light warm smoke puff (+ a warm light flash). opts: {color (tint), scale (< 0.7: small ambient pop, no light),
    // ring: true → also a soft orange splash ring on the ground (off by default: GAME draws its own damage-radius ring)}.
    lava(x, y, z, o, K) {
      const t = o.color ? lin(o.color) : null, d0 = t ? hueNorm(t, 2.3) : C.LAVA0, d1 = t ? hueNorm(t, 1.25) : C.LAVA2, gy = Math.max(0.05, y), big = bk >= 0.7;
      flashGlow(x, gy + 0.25, z, 1.8, t ? hueNorm(t, 1.1) : C.LAVAG, 0.18, 0.32);
      let q;
      for (let i = 0, n = N(12, K); i < n; i++) {   // splash crown
        q = P(0, SH.DOT, x + frand(-0.15, 0.15), gy + 0.1, z + frand(-0.15, 0.15)); radial(q, 1.4, 3.6, 3, 6.2);
        q.grav = 12; q.bounce = 0.22; q.drag = 0.3; q.size = frand(0.14, 0.26); q.size1 = q.size * 0.55; q.life = frand(0.75, 1.1);
        q.fade = 3; q.pop = 0.05; q.color = i % 3 ? d0 : C.LAVA1; q.color1 = d1; q.delay = frand(0, 0.05); emitRaw(q);
      }
      for (let i = 0, n = N(4, K); i < n; i++) {   // short flame tongues (normal blend: stay orange however many overlap)
        q = P(0, SH.FLAME, x + frand(-0.3, 0.3), gy + frand(0, 0.15), z + frand(-0.3, 0.3));
        q.vy = frand(1.6, 2.8); q.vx = frand(-0.5, 0.5); q.vz = frand(-0.5, 0.5); q.drag = 1.2; q.size = frand(0.55, 0.8); q.size1 = 0.15;
        q.life = frand(0.3, 0.45); q.rot = frand(-0.3, 0.3); q.color = C.LAVA0; q.color1 = C.LAVA2; q.alpha = 0.9; q.fade = 1.5; q.pop = 0.06; emitRaw(q);
      }
      for (let i = 0, n = N(8, K); i < n; i++) {   // embers drifting up
        q = P(1, SH.GLOW, x + frand(-0.4, 0.4), gy + frand(0.1, 0.5), z + frand(-0.4, 0.4)); q.vy = frand(1.2, 2.6); q.vx = frand(-0.6, 0.6); q.vz = frand(-0.6, 0.6);
        q.drag = 0.8; q.wob = 0.8; q.flick = 14; q.size = frand(0.09, 0.15); q.size1 = 0.03; q.life = frand(0.8, 1.4); q.color = C.EMB0; q.color1 = C.EMB1; q.delay = frand(0, 0.2); emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // little cooled crust pebbles
        q = P(0, SH.DOT, x, gy + 0.1, z); radial(q, 1.2, 2.6, 3, 5); q.grav = 13; q.bounce = 0.3;
        q.size = frand(0.08, 0.13); q.life = frand(0.8, 1.1); q.fade = 4; q.color = C.CRUST; emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {   // light warm puff
        q = P(0, SH.SMOKE, x + frand(-0.2, 0.2), gy + 0.3, z + frand(-0.2, 0.2)); radial(q, 0.2, 0.6, 0.7, 1.2); q.drag = 1.4;
        q.size = 0.45; q.size1 = 1.3; q.life = frand(0.9, 1.2); q.alpha = 0.38; q.fade = 2; q.pop = 0.12; q.spin = frand(-0.8, 0.8); q.color = C.ASHL; q.delay = 0.08; emitRaw(q);
      }
      if (o.ring) ring(x, z, { r0: 0.2 * bk, r1: (o.ring > 0.3 ? o.ring : 1.7) * bk, dur: 0.42, color: o.color || '#ff7a1a', k: 1.25, edge: 0.18, width: 0.5 * bk });
      if (big) lightFlash(x, z, '#ff9a4a', 3, 0.3);
    },
    // Volcano top / vent eruption: a lava fountain shooting up and raining back, a flame column, cute light smoke puffs
    // billowing from the top and a shower of embers. opts: {color, scale}.
    erupt(x, y, z, o, K) {
      const t = o.color ? lin(o.color) : null, d0 = t ? hueNorm(t, 2.3) : C.LAVA0, d1 = t ? hueNorm(t, 1.25) : C.LAVA2;
      flashGlow(x, y + 0.3, z, 2.3, t ? hueNorm(t, 1.1) : C.LAVAG, 0.25, 0.34);
      let q;
      for (let i = 0, n = N(16, K); i < n; i++) {   // fountain
        q = P(0, SH.DOT, x + frand(-0.12, 0.12), y, z + frand(-0.12, 0.12)); radial(q, 0.4, 2.0, 5.5, 9);
        q.grav = 12; q.bounce = 0.2; q.drag = 0.25; q.size = frand(0.12, 0.24); q.size1 = q.size * 0.5; q.life = frand(1.2, 1.7);
        q.fade = 3; q.pop = 0.05; q.color = i % 3 ? d0 : C.LAVA1; q.color1 = d1; q.delay = frand(0, 0.18); emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {   // flame column
        q = P(0, SH.FLAME, x + frand(-0.15, 0.15), y + 0.05, z + frand(-0.15, 0.15));
        q.vy = frand(3.5, 5.5); q.vx = frand(-0.4, 0.4); q.vz = frand(-0.4, 0.4); q.drag = 1.6; q.size = frand(0.9, 1.25); q.size1 = 0.25;
        q.life = frand(0.3, 0.45); q.rot = frand(-0.15, 0.15); q.color = C.LAVA0; q.color1 = C.LAVA2; q.alpha = 0.9; q.fade = 1.5; q.pop = 0.06; q.delay = i * 0.03; emitRaw(q);
      }
      for (let i = 0, n = N(4, K); i < n; i++) {   // smoke puffs billowing from the top (light and friendly, never dark)
        q = P(0, SH.SMOKE, x + frand(-0.15, 0.15), y + 0.35, z + frand(-0.15, 0.15)); radial(q, 0.3, 0.9, 1.6, 2.4); q.drag = 1.3; q.wob = 0.4;
        q.size = frand(0.42, 0.55); q.size1 = q.size * 3; q.life = frand(1.5, 2.1); q.alpha = 0.8; q.fade = 2.2; q.pop = 0.15;
        q.spin = frand(-0.7, 0.7); q.color = C.ASHL; q.delay = 0.05 + i * 0.07; emitRaw(q);
      }
      for (let i = 0, n = N(10, K); i < n; i++) {   // ember shower
        q = P(1, SH.GLOW, x + frand(-0.2, 0.2), y + frand(0, 0.3), z + frand(-0.2, 0.2)); radial(q, 0.3, 1.4, 2, 4.5); q.drag = 0.9; q.wob = 0.8;
        q.flick = 14; q.size = frand(0.09, 0.15); q.size1 = 0.03; q.life = frand(1, 1.8); q.color = C.EMB0; q.color1 = C.EMB1; q.delay = frand(0, 0.25); emitRaw(q);
      }
      if (bk >= 0.7) lightFlash(x, z, '#ffa050', 4, 0.4);
    },
    // Cute white steam puffs from a vent ("puf puf"): cotton-ball puffs rising one after another. opts: {color, dir, scale}.
    steam(x, y, z, o, K) {
      const col = o.color ? lin(o.color) : C.STEAM, dx = o.dir ? o.dir.x * 0.8 : 0, dz = o.dir ? o.dir.z * 0.8 : 0;
      for (let i = 0, n = N(4, K); i < n; i++) {
        const q = P(0, SH.SMOKE, x + frand(-0.08, 0.08), y + i * 0.05, z + frand(-0.08, 0.08)); radial(q, 0.05, 0.3, 0.9, 1.4);
        q.vx += dx; q.vz += dz; q.drag = 0.9; q.wob = 0.45; q.grav = -0.2;
        q.size = frand(0.26, 0.34); q.size1 = q.size * 3.4; q.life = frand(1.3, 1.8); q.alpha = 0.85; q.fade = 2.2; q.pop = 0.2;
        q.spin = frand(-0.7, 0.7); q.color = col; q.delay = i * 0.14; emitRaw(q);
      }
      if (Math.random() < 0.5 * K) twinkles(1, x, y + 0.45, z, 0.2, C.W2, 0.28);
    },
    // A jelly blob splats (Çürük Taç's spit landing / swatted): glossy droplets in its colour, a soft ring, a few sparkles.
    jelly(x, y, z, o, K) {
      const c = lin(o.color || C.JELLY), cg = hueNorm(c, 1.3);
      let q = P(1, SH.RING, x, y, z); q.size = 0.4; q.size1 = 1.3; q.life = 0.22; q.color = cg; q.alpha = 0.7; q.fade = 1.4; emitRaw(q);
      for (let i = 0, n = N(9, K); i < n; i++) {
        q = P(0, SH.DOT, x, y, z); radial(q, 1.3, 3.0, 1.5, 3.8); q.grav = 10; q.bounce = 0.15; q.drag = 0.5;
        q.size = frand(0.1, 0.18); q.size1 = q.size * 0.7; q.life = frand(0.7, 1.0); q.fade = 3; q.pop = 0.06; q.color = c; emitRaw(q);
      }
      twinkles(N(4, K), x, y, z, 0.35, cg, 0.32);
    },
    // ── Kefir Vadisi (Round 4) ── Milk, kefir and crumbs are NORMAL-blend particles with colours just under 1: creamy, and
    // however many overlap they never add up to a bloomed white blob. Only the tiny pastel sparkles are additive.
    // Creamy milk splash: a crown of glossy droplets stretched along their flight (they bounce once and lie as beads), a
    // central jet, a soft spray puff, a creamy puddle sheen spreading on the floor and a few pastel sparkles.
    // opts: {color (tint: kefir cream, strawberry milk…), dir, scale (< 0.7: a small plop without the puddle), count,
    // ring: true | radius (a soft cream splash ring on the ground; off by default — GAME draws its own damage rings)}.
    milk(x, y, z, o, K) {
      const t = o.color ? hueNorm(lin(o.color), 0.97) : null, cols = t ? [t, t, [t[0] * 0.95, t[1] * 0.95, t[2] * 0.95]] : [C.MILK, C.MILKW, C.MILKC];
      const gy = Math.max(0.04, y), dx = o.dir ? o.dir.x * 1.3 : 0, dz = o.dir ? o.dir.z * 1.3 : 0, big = bk >= 0.7;
      let q = P(0, SH.RING, x, gy + 0.32, z); q.size = 0.5; q.size1 = 1.5; q.life = 0.26; q.alpha = 0.7; q.fade = 1.4; q.rot = 0; q.color = cols[1]; emitRaw(q);
      for (let i = 0, n = N(7, K); i < n; i++) {   // the crown wall: creamy lobes flung up and out in a ring, soon falling back
        const a = (i / n) * TAU + frand(-0.2, 0.2), s = frand(0.8, 1.3);
        q = P(0, SH.SMOKE, x + Math.cos(a) * 0.22, gy + 0.08, z + Math.sin(a) * 0.22);
        q.vx = Math.cos(a) * s + dx * 0.5; q.vz = Math.sin(a) * s + dz * 0.5; q.vy = frand(1.7, 2.4); q.grav = 7; q.drag = 1.2;
        q.size = frand(0.3, 0.38); q.size1 = q.size * 1.35; q.life = frand(0.32, 0.42); q.alpha = 0.95; q.fade = 2.2; q.pop = 0.07; q.spin = frand(-2, 2); q.color = cols[i % 2]; emitRaw(q);
      }
      for (let i = 0, n = N(12, K); i < n; i++) {   // splash droplets
        const a = (i / n) * TAU + frand(-0.25, 0.25), s = frand(1.3, 3.0);
        q = P(0, SH.DOT, x + Math.cos(a) * 0.15, gy + 0.08, z + Math.sin(a) * 0.15);
        q.vx = Math.cos(a) * s + dx; q.vz = Math.sin(a) * s + dz; q.vy = frand(2.8, 5.0);
        q.grav = 11; q.bounce = 0.12; q.drag = 0.35; q.stretch = 1.8; q.soft = 1; q.size = frand(0.15, 0.25); q.size1 = q.size * 0.55;
        q.life = frand(0.65, 0.95); q.fade = 3; q.pop = 0.05; q.color = cols[i % 3]; q.delay = frand(0, 0.05); emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // the jet in the middle (the classic milk-drop splash)
        q = P(0, SH.DOT, x + frand(-0.05, 0.05), gy + 0.12, z + frand(-0.05, 0.05)); q.vx = frand(-0.3, 0.3) + dx * 0.3; q.vz = frand(-0.3, 0.3) + dz * 0.3;
        q.vy = frand(4.4, 6.0); q.grav = 11; q.bounce = 0.1; q.drag = 0.2; q.stretch = 2.2; q.soft = 1; q.size = frand(0.2, 0.28); q.size1 = q.size * 0.6;
        q.life = frand(0.8, 1.0); q.fade = 3; q.pop = 0.05; q.color = cols[0]; q.delay = 0.06 + i * 0.05; emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {   // soft spray
        q = P(0, SH.SMOKE, x + frand(-0.15, 0.15), gy + 0.2, z + frand(-0.15, 0.15)); radial(q, 0.4, 1.0, 0.6, 1.1); q.vx += dx * 0.4; q.vz += dz * 0.4;
        q.drag = 3; q.size = frand(0.34, 0.42); q.size1 = q.size * 2.3; q.life = frand(0.45, 0.6); q.alpha = 0.55; q.fade = 2; q.pop = 0.08; q.spin = frand(-1, 1); q.color = cols[2]; q.delay = 0.04; emitRaw(q);
      }
      if (big) for (let i = 0; i < 2; i++) {   // creamy puddle sheen spreading on the floor, fading slowly (capped: a big slam gets a
        const sz = (i ? 0.6 : 0.9) * Math.min(1, 1.3 / bk);   // bigger crown, never a wide white haze)
        q = P(0, SH.GLOW, x + frand(-0.1, 0.1) + dx * 0.12, sz * 0.22, z + frand(-0.1, 0.1) + dz * 0.12);
        q.size = sz; q.size1 = sz * 1.6; q.life = frand(1.0, 1.3); q.alpha = 0.45; q.fade = 2.5; q.rot = 0; q.color = t || C.MILKP; q.delay = 0.1 + i * 0.05; emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // pastel sparkles
        q = P(1, SH.SPARK, x + frand(-0.45, 0.45), gy + frand(0.15, 0.6), z + frand(-0.45, 0.45)); q.vy = frand(0.3, 0.9);
        q.size = frand(0.18, 0.28); q.size1 = 0.03; q.life = frand(0.45, 0.7); q.pop = 0.08; q.flick = frand(14, 22); q.rot = frand(-0.3, 0.3);
        q.color = C.KEFG[(i + ((Math.random() * 5) | 0)) % 5]; q.delay = frand(0.03, 0.15); emitRaw(q);
      }
      if (o.ring) ring(x, z, { r0: 0.25 * bk, r1: (o.ring > 0.3 ? o.ring : 1.6) * bk, dur: 0.42, color: o.color || '#fff0dc', k: 0.6, edge: 0.3, width: 0.45 * bk });
    },
    // Rising sparkly kefir fizz: glossy cream beads and pastel film bubbles wobbling up (buoyant, speeding up a little), each
    // bubble popping at the top with a tiny pastel sparkle, plus glitter. opts: {color (tints the cream beads), dir + speed (a foamy
    // spray along dir instead of rising: the Kefir Devi's shake / geyser), scale, count}. Cheap: fine to emit often (the
    // bubbling kefir spring, a river surface, a happy kefir creature).
    fizz(x, y, z, o, K) {
      const tint = o.color ? hueNorm(lin(o.color), 0.97) : null, dir = o.dir, spd = o.speed || 4;
      let q;
      for (let i = 0, n = N(10, K); i < n; i++) {
        const bead = i % 3 === 0, sz = bead ? frand(0.08, 0.13) : frand(0.17, 0.32), L = frand(0.75, 1.25), dl = frand(0, 0.25), ph = frand(0, TAU);
        const x0 = x + frand(-0.28, 0.28), y0 = y + frand(-0.1, 0.15), z0 = z + frand(-0.28, 0.28), wob = frand(0.35, 0.75);
        q = P(0, bead ? SH.DOT : SH.RING, x0, y0, z0); q.soft = 1;
        let xe, ye, ze;
        if (dir) {   // spray: pushed along dir, slowed by drag, then floating up
          const s = spd * frand(0.55, 1.1), dg = 1.6, e = (1 - Math.exp(-dg * L)) / dg;
          q.vx = dir.x * s + frand(-0.7, 0.7); q.vz = dir.z * s + frand(-0.7, 0.7); q.vy = frand(0.6, 2.0); q.drag = dg;
          xe = x0 + q.vx * e; ze = z0 + q.vz * e; ye = y0 + q.vy * e + 0.4 * L * L;
        } else {
          q.vx = frand(-0.25, 0.25); q.vz = frand(-0.25, 0.25); q.vy = frand(0.5, 1.1);
          xe = x0 + q.vx * L; ze = z0 + q.vz * L; ye = y0 + q.vy * L + 0.8 * L * L;
        }
        xe += wob / 4.2 * (Math.sin(4.2 * L + ph) - Math.sin(ph));
        q.grav = -1.6; q.wob = wob; q.phase = ph;
        q.size = sz; q.size1 = sz * 1.3; q.life = L; q.alpha = 0.95; q.fade = 6; q.pop = 0.14; q.rot = frand(-0.5, 0.5); q.delay = dl;
        q.color = bead ? tint || C.KEFIRB[i & 3] : C.KEFR[i % 5]; emitRaw(q);
        if (!bead) {   // pop sparkle where the bubble ends up
          q = P(1, SH.SPARK, xe, ye, ze); q.size = frand(0.2, 0.3); q.size1 = 0.03; q.life = 0.3; q.pop = 0.05; q.flick = 22; q.rot = frand(-0.3, 0.3);
          q.color = C.KEFG[i % 5]; q.delay = dl + L * 0.93; emitRaw(q);
        }
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // glitter rising with them
        q = P(1, i & 1 ? SH.SPARK : SH.STAR, x + frand(-0.3, 0.3), y + frand(0, 0.3), z + frand(-0.3, 0.3));
        q.vx = dir ? dir.x * spd * 0.5 : frand(-0.2, 0.2); q.vz = dir ? dir.z * spd * 0.5 : frand(-0.2, 0.2); q.vy = frand(0.6, 1.3); q.drag = 1.2; q.wob = 0.5;
        q.size = frand(0.15, 0.24); q.size1 = 0.03; q.life = frand(0.6, 0.9); q.flick = 18; q.spin = frand(-4, 4); q.color = C.KEFG[(Math.random() * 5) | 0]; q.delay = frand(0, 0.3); emitRaw(q);
      }
    },
    // Foamy kefir spray (the geyser from the Kefir Devi's bottle): soft cream foam clumps thrown along dir that swell and melt
    // away, with fizz bubbles in them. opts: {dir, speed, color, scale, count}.
    foam(x, y, z, o, K) {
      const c = o.color ? hueNorm(lin(o.color), 0.96) : null, dir = o.dir, spd = o.speed || 4;
      for (let i = 0, n = N(6, K); i < n; i++) {
        const s = spd * frand(0.5, 1.05), q = P(0, SH.SMOKE, x + frand(-0.12, 0.12), y + frand(-0.1, 0.1), z + frand(-0.12, 0.12)); radial(q, 0.3, 1.1, 0.4, 1.4);
        if (dir) { q.vx += dir.x * s; q.vz += dir.z * s; }
        q.drag = 2.2; q.grav = -0.3; q.wob = 0.4; q.size = frand(0.3, 0.42); q.size1 = q.size * 2.3; q.life = frand(0.8, 1.2); q.alpha = 0.92; q.fade = 2.4; q.pop = 0.12;
        q.spin = frand(-1.2, 1.2); q.color = c || (i & 1 ? C.MILKW : C.MILK); q.delay = i * 0.02; emitRaw(q);
      }
      B.fizz(x, y, z, o, K * 0.6);
    },
    // A kefir bubble pops (the 'fizz' projectile does this by itself when GAME removes it): the pink film flicks out as a
    // ring, milky droplets spray and fall, pastel sparkles twinkle and a few baby bubbles fizz upward. opts: {color, scale}.
    fizzPop(x, y, z, o, K) {
      const c = o.color ? hueNorm(lin(o.color), 0.97) : C.KEFIR;
      // the film flicks out in the bubble's own pink (the 'fizz' projectile's film band), so the pop reads on the cream floor
      let q = P(0, SH.RING, x, y, z); q.size = 0.5; q.size1 = 1.3; q.life = 0.2; q.color = lin(FIZZ_FILM_A); q.alpha = 0.9; q.fade = 1.3; emitRaw(q);
      q = P(1, SH.RING, x, y, z); q.size = 0.45; q.size1 = 1.2; q.life = 0.16; q.color = C.KEFG[0]; q.alpha = 0.3; q.fade = 1.3; emitRaw(q);
      for (let i = 0, n = N(8, K); i < n; i++) {
        q = P(0, SH.DOT, x, y, z); radial(q, 1.4, 3.0, 0.6, 2.4); q.grav = 9; q.drag = 0.8; q.bounce = 0.1; q.stretch = 1.6; q.soft = 1;
        q.size = frand(0.07, 0.12); q.size1 = q.size * 0.6; q.life = frand(0.45, 0.65); q.fade = 3; q.color = i & 1 ? C.MILK : c; emitRaw(q);
      }
      for (let i = 0, n = N(6, K); i < n; i++) {
        q = P(1, SH.SPARK, x + frand(-0.3, 0.3), y + frand(-0.25, 0.3), z + frand(-0.3, 0.3)); q.vx = frand(-0.5, 0.5); q.vy = frand(0.3, 1.1); q.vz = frand(-0.5, 0.5);
        q.size = frand(0.2, 0.32); q.size1 = 0.03; q.life = frand(0.45, 0.7); q.pop = 0.08; q.flick = frand(14, 22); q.rot = frand(-0.3, 0.3);
        q.color = C.KEFG[i % 5]; q.delay = frand(0, 0.08); emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {
        q = P(0, i ? SH.RING : SH.DOT, x + frand(-0.2, 0.2), y + frand(-0.1, 0.1), z + frand(-0.2, 0.2)); q.vy = frand(0.6, 1.2); q.grav = -1; q.wob = 0.5; q.soft = 1;
        q.size = frand(0.08, 0.14); q.size1 = q.size * 1.3; q.life = frand(0.6, 0.9); q.fade = 6; q.pop = 0.1; q.color = i ? C.KEFR[i % 5] : c; q.delay = 0.05; emitRaw(q);
      }
    },
    // Biscuit crumbs: golden chips (faceted and rounded) and round bits hop out, tumble and bounce, a pale oat flake or two
    // flutter down, and a light biscuit-dust puff. opts: {color (biscuit tone), dir, scale, count}.
    crumbs(x, y, z, o, K) {
      const v = o.color ? [lin(o.color, 0.72), lin(o.color), lin(o.color, 1.18)] : o.pal || C.CRUMB, dx = o.dir ? o.dir.x * 1.4 : 0, dz = o.dir ? o.dir.z * 1.4 : 0;
      const gy = Math.max(0.05, y);
      let q;
      for (let i = 0, n = N(10, K); i < n; i++) {
        const sh = i % 3 === 0 ? SH.SQUARE : i % 3 === 1 ? SH.SHARD : SH.DOT;
        q = P(0, sh, x + frand(-0.15, 0.15), gy + 0.05, z + frand(-0.15, 0.15)); radial(q, 1.0, 2.8, 2.4, 4.8); q.vx += dx; q.vz += dz;
        q.grav = 12; q.bounce = 0.35; q.drag = 0.3; q.size = sh === SH.DOT ? frand(0.1, 0.15) : frand(0.14, 0.23);
        q.life = frand(0.8, 1.2); q.spin = frand(-10, 10); q.fade = 4; q.color = v[i % v.length]; q.delay = frand(0, 0.03); emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {   // oat flakes flutter
        q = P(0, SH.SHARD, x + frand(-0.1, 0.1), gy + 0.1, z + frand(-0.1, 0.1)); radial(q, 0.6, 1.5, 2.2, 3.4); q.vx += dx * 0.6; q.vz += dz * 0.6;
        q.grav = 5; q.drag = 1.6; q.wob = 0.9; q.bounce = 0.1; q.size = frand(0.16, 0.22); q.life = frand(1.0, 1.3); q.spin = frand(-6, 6); q.fade = 4; q.color = C.OAT; emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {   // biscuit dust
        q = P(0, SH.SMOKE, x + frand(-0.2, 0.2), gy + 0.1, z + frand(-0.2, 0.2)); radial(q, 0.4, 1.0, 0.2, 0.6); q.vx += dx * 0.5; q.vz += dz * 0.5;
        q.drag = 3; q.size = frand(0.32, 0.45); q.size1 = q.size * 2.1; q.life = frand(0.5, 0.75); q.alpha = 0.6; q.fade = 2; q.pop = 0.1; q.spin = frand(-1, 1); q.color = C.CRUMBD; emitRaw(q);
      }
    },
    // ── Surlu Şehir (Round 5) ── A simit breaks (the Simitçi's throw ends): a soft golden "pop" ring and twinkles, toasty crumbs
    // in simit browns (or opts.color) and cream sesame seeds tumbling out. opts: {color, dir, scale, count}.
    simit(x, y, z, o, K) {
      simO.color = o.color; simO.dir = o.dir; simO.pal = C.SIMITC;
      B.crumbs(x, y, z, simO, K);
      simO.color = simO.dir = null;
      const gy = Math.max(0.05, y);
      let q = P(1, SH.RING, x, y, z); q.size = 0.45; q.size1 = 1.3; q.life = 0.22; q.rot = 0; q.color = C.GOLD; q.alpha = 0.55; q.fade = 1.4; emitRaw(q);
      flashGlow(x, y, z, 0.9, C.GOLD, 0.12, 0.35);
      twinkles(N(3, K), x, y, z, 0.35, C.YEL, 0.3);
      for (let i = 0, n = N(7, K); i < n; i++) {
        q = P(0, SH.SHARD, x + frand(-0.12, 0.12), gy + 0.06, z + frand(-0.12, 0.12)); radial(q, 0.8, 2.4, 2.2, 4.2);
        q.grav = 11; q.bounce = 0.3; q.drag = 0.4; q.size = frand(0.075, 0.1); q.life = frand(0.8, 1.2); q.spin = frand(-12, 12); q.fade = 4;
        q.color = i % 3 ? C.SESAME : C.SESAMED; q.delay = frand(0, 0.04); emitRaw(q);
      }
    },
    // The knight's big horse: a warm dust puff rolling out in a low ring (sandy and cream puffs mixed: one of them always shows,
    // on the honey cobbles or the pale plaza), two tiny pebbles and a few golden sparkles twinkling up, one of them a little
    // solid gold star (gallop steps, the rear landing, the charge's skid stop). Cheap: fine once per hoof beat. opts: {dir
    // (pushes the dust: behind a galloping hoof, or ahead in a skid), color (dust tint), scale (≈ 2: the rear landing — a wide
    // stomp ring with golden stars), count}.
    hoof(x, y, z, o, K) {
      const t = o.color ? lin(o.color) : null, gy = Math.max(0.04, y), dx = o.dir ? o.dir.x * 1.6 : 0, dz = o.dir ? o.dir.z * 1.6 : 0, big = bk >= 1.5;
      let q;
      for (let i = 0, n = N(5, K) + (big ? 3 : 0); i < n; i++) {   // the dust ring
        const a = (i / n) * TAU + frand(-0.3, 0.3), s = frand(1.1, 1.9);
        q = P(0, SH.SMOKE, x + Math.cos(a) * 0.16, gy + 0.08, z + Math.sin(a) * 0.16);
        q.vx = Math.cos(a) * s + dx; q.vz = Math.sin(a) * s + dz; q.vy = frand(0.35, 0.8); q.drag = 3.4; q.grav = -0.15;
        q.size = frand(0.3, 0.42); q.size1 = q.size * 2.2; q.life = frand(0.55, 0.85); q.alpha = 0.92; q.fade = 2.2; q.pop = 0.1; q.spin = frand(-1.2, 1.2);
        q.color = t || C.HOOFD[i & 3]; q.delay = frand(0, 0.03); emitRaw(q);
      }
      for (let i = 0, n = N(2, K); i < n; i++) {   // tiny pebbles hop
        q = P(0, SH.DOT, x + frand(-0.1, 0.1), gy + 0.05, z + frand(-0.1, 0.1)); radial(q, 0.6, 1.6, 1.6, 2.8); q.vx += dx * 0.5; q.vz += dz * 0.5;
        q.grav = 12; q.bounce = 0.3; q.size = frand(0.06, 0.09); q.life = frand(0.5, 0.7); q.fade = 4; q.color = C.HOOFP[i & 1]; emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // golden sparkles on the rim of the puff (over the floor, not lost in the dust)
        const a = (i / n) * TAU + frand(-0.5, 0.5), r = frand(0.45, 0.65), st = i === 0;
        q = P(st ? 0 : 1, st ? SH.STAR : SH.SPARK, x + Math.cos(a) * r, gy + frand(0.2, 0.4), z + Math.sin(a) * r);
        q.vx = Math.cos(a) * 0.5 + dx * 0.3; q.vy = frand(0.6, 1.1); q.vz = Math.sin(a) * 0.5 + dz * 0.3; q.drag = 1.5;
        q.life = frand(0.55, 0.8); q.fade = 1.6; q.pop = 0.08; q.rot = frand(-0.3, 0.3); q.delay = frand(0.05, 0.14);
        if (st) { q.size = frand(0.13, 0.16); q.size1 = 0.05; q.spin = frand(-5, 5); q.color = C.SHOEG; }
        else { q.size = frand(0.3, 0.4); q.size1 = 0.06; q.flick = frand(12, 18); q.color = i === 2 ? C.YEL : C.GOLD; }
        emitRaw(q);
      }
      if (big) for (let i = 0, n = N(4, K); i < n; i++) {   // the rear landing: solid golden stars hop out of the stomp
        q = P(0, SH.SHARD, x, gy + 0.15, z); radial(q, 0.5, 1.1, 1.6, 2.4); q.grav = 5; q.drag = 1.2;
        q.size = frand(0.13, 0.17); q.size1 = 0.05; q.life = frand(0.6, 0.8); q.spin = frand(-6, 6); q.pop = 0.08; q.fade = 2; q.color = i & 1 ? C.SHOEY : C.SHOEG; q.delay = frand(0.02, 0.08); emitRaw(q);
      }
    },
    // Little music notes (♪ and ♫) popping out, rising and swaying, candy-coloured with a soft glow each; a faint golden sound
    // ring or two and twinkles (the Tellal's drum boom, the knight's horn). opts: {dir (+ speed): the notes stream out along dir —
    // the horn's bell; color (one colour for all), scale, count}.
    notes(x, y, z, o, K) {
      const dir = o.dir, spd = o.speed || 2.2, tc = o.color ? hueNorm(lin(o.color), 0.95) : null, tg = tc ? hueNorm(tc, 2.2) : null, r0 = (Math.random() * 6) | 0;
      let q;
      for (let i = 0, n = N(7, K); i < n; i++) {
        const a = (i / n) * TAU + frand(-0.35, 0.35), ci = (r0 + i) % 6;
        q = P(0, i % 3 === 1 ? SH.NOTES : SH.NOTE, x + Math.cos(a) * 0.22, y + frand(-0.1, 0.15), z + Math.sin(a) * 0.22);
        if (dir) { const s = spd * frand(0.6, 1.1); q.vx = dir.x * s + Math.cos(a) * 0.35; q.vz = dir.z * s + Math.sin(a) * 0.35; q.vy = frand(0.7, 1.3); q.drag = 1.3; }
        else { const s = frand(0.6, 1.2); q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s * 0.7; q.vy = frand(1.4, 2.2); q.drag = 1.5; }
        q.grav = -0.35; q.wob = frand(0.9, 1.4); q.phase = frand(0, TAU);
        q.size = frand(0.4, 0.52); q.size1 = q.size * 0.9; q.life = frand(1.2, 1.7); q.pop = 0.2; q.fade = 3; q.rot = frand(-0.3, 0.3); q.spin = frand(-0.35, 0.35);
        q.color = tc || C.NOTEC[ci]; q.delay = i * 0.04; emitRaw(q);
        q.add = 1; q.shape = SH.GLOW; q.size *= 1.9; q.size1 = q.size * 0.8; q.color = tg || C.NOTEG[ci]; q.alpha = 0.15; emitRaw(q);   // its glow, on the same path
      }
      for (let i = 0; i < (dir ? 1 : 2); i++) {   // sound rings
        q = P(1, SH.RING, x, y, z); q.size = 0.6; q.size1 = dir ? 1.6 : i ? 2.0 : 2.6; q.life = 0.3; q.rot = 0; q.color = C.GOLD; q.alpha = i ? 0.3 : 0.42; q.fade = 1.4; q.delay = i * 0.1; emitRaw(q);
      }
      twinkles(N(4, K), x, y + 0.2, z, 0.5, null, 0.34);
    },
    // A silver horseshoe lands (the knight's toss — GAME's mortar end): a ring gliding out over the ground (stops at ~1.3 m ×
    // scale) of little gold and sky-blue stars (normal blend with a soft glow each: they read on the pale plaza too) between
    // silver sparkles (the shine on the darker stones), a slower golden inner ring, a bright glint with two "clink" streaks,
    // gold stars hopping and a little warm dust. opts: {color (tints the silver sparkles), scale, ring: true | radius (a soft
    // warm-gold ground ring; off by default — GAME draws its own)}.
    horseshoe(x, y, z, o, K) {
      const gy = Math.max(0.05, y), tc = o.color ? hueNorm(lin(o.color), 2.4) : null;
      flashGlow(x, gy + 0.3, z, 1.4, C.SILV, 0.12, 0.36);
      let q;
      for (let i = 0, n = N(16, K); i < n; i++) {   // the ring: evenly spaced, gliding outward and slowing
        const a = (i / n) * TAU + frand(-0.06, 0.06), s = frand(3.9, 4.3), st = !(i & 1), b = i & 2;
        q = P(st ? 0 : 1, st ? SH.STAR : SH.SPARK, x + Math.cos(a) * 0.22, gy + 0.16, z + Math.sin(a) * 0.22);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s; q.vy = frand(0.05, 0.3); q.drag = 3.6; q.life = frand(0.7, 0.85); q.fade = 2; q.pop = 0.06; q.rot = frand(-0.3, 0.3);
        if (st) {
          q.size = frand(0.22, 0.26); q.size1 = 0.1; q.spin = frand(-5, 5); q.color = b ? C.SHOEB : C.SHOEG; emitRaw(q);
          q.add = 1; q.shape = SH.GLOW; q.size *= 2; q.size1 = 0.1; q.spin = 0; q.color = b ? C.SILVB : C.GOLD; q.alpha = 0.22; emitRaw(q);   // its glow, on the same path
        } else { q.size = frand(0.34, 0.42); q.size1 = 0.16; q.flick = frand(10, 16); q.color = tc && b ? tc : b ? C.SILVB : C.SILV; emitRaw(q); }
      }
      for (let i = 0, n = N(8, K); i < n; i++) {   // inner ring: small gold twinkles, slower
        const a = ((i + 0.5) / n) * TAU + frand(-0.1, 0.1), s = frand(2.0, 2.4);
        q = P(1, SH.SPARK, x + Math.cos(a) * 0.15, gy + 0.12, z + Math.sin(a) * 0.15);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s; q.vy = frand(0.05, 0.25); q.drag = 3.6;
        q.size = frand(0.22, 0.28); q.size1 = 0.08; q.life = frand(0.6, 0.75); q.fade = 2; q.pop = 0.06; q.flick = frand(14, 20); q.rot = frand(-0.3, 0.3);
        q.color = i & 1 ? C.YEL : C.GOLD; q.delay = 0.05; emitRaw(q);
      }
      for (let i = 0; i < 2; i++) {   // clink streaks
        q = P(1, SH.GLOW, x + (i ? 0.12 : -0.12), gy + 0.2, z); q.vx = i ? 2.2 : -2.2; q.vy = 5.5; q.drag = 5;
        q.size = 0.55; q.size1 = 0.15; q.stretch = 4; q.life = 0.16; q.color = C.SILV; emitRaw(q);
      }
      for (let i = 0, n = N(4, K); i < n; i++) {   // gold stars hop up
        q = P(0, SH.SHARD, x, gy + 0.2, z); radial(q, 0.6, 1.4, 2.6, 3.6); q.grav = 7; q.drag = 1;
        q.size = frand(0.2, 0.26); q.size1 = 0.08; q.life = frand(0.6, 0.8); q.spin = frand(-7, 7); q.pop = 0.08; q.fade = 2; q.color = i & 1 ? C.SHOEY : C.SHOEG; emitRaw(q);
      }
      for (let i = 0, n = N(3, K); i < n; i++) {   // warm dust
        q = P(0, SH.SMOKE, x + frand(-0.2, 0.2), gy + 0.08, z + frand(-0.2, 0.2)); radial(q, 0.5, 1.1, 0.3, 0.6);
        q.drag = 3; q.size = frand(0.32, 0.42); q.size1 = q.size * 2.1; q.life = frand(0.5, 0.7); q.alpha = 0.6; q.fade = 2; q.pop = 0.1; q.spin = frand(-1, 1); q.color = C.HOOFD[i % 3]; emitRaw(q);
      }
      if (o.ring) ring(x, z, { r0: 0.25 * bk, r1: (o.ring > 0.3 ? o.ring : 1.5) * bk, dur: 0.4, color: '#ffe6a8', k: 1.0, edge: 0.25, width: 0.4 * bk });
    },
    // ── Boss bonus games (Round 6) ──
    // Bonk! (Mezar Kazıcısı's head tapped while it peeks; x, y, z = the head): a white "tok" flash + ring, a ring of 6 solid
    // yellow stars flung out flat round the head, circling a little as they slow down and fade, twinkles, and a soft dust puff
    // on the floor round the hole. opts: {color (dust tint), scale, count}.
    bonk(x, y, z, o, K) {
      const dc = o.color ? lin(o.color) : null;
      flashGlow(x, y, z, 1.2, C.W3, 0.1, 0.6);
      let q = P(1, SH.RING, x, y, z); q.size = 0.3; q.size1 = 1.7; q.life = 0.2; q.rot = 0; q.color = C.W2; q.alpha = 0.75; q.fade = 1.4; emitRaw(q);
      for (let i = 0, n = N(6, K); i < n; i++) {
        const a = (i / n) * TAU + frand(-0.1, 0.1), s = frand(3.0, 3.4);
        q = P(0, SH.SHARD, x + Math.cos(a) * 0.2, y + 0.12, z + Math.sin(a) * 0.2);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s; q.vy = frand(0.5, 0.9); q.drag = 3.8; q.grav = 0.8; q.orbit = 2.6; q.ox = x; q.oz = z;
        q.size = frand(0.4, 0.46); q.size1 = 0.2; q.life = frand(0.75, 0.9); q.pop = 0.08; q.fade = 2.2; q.rot = frand(-0.4, 0.4); q.spin = frand(-6, 6);
        q.color = i & 1 ? C.BONK2 : C.BONK; emitRaw(q);
        q.add = 1; q.shape = SH.GLOW; q.size *= 2; q.size1 = 0.2; q.spin = 0; q.color = C.GOLD; q.alpha = 0.25; emitRaw(q);   // its glow, on the same path
      }
      twinkles(N(3, K), x, y + 0.2, z, 0.4, null, 0.36);
      for (let i = 0, n = N(5, K); i < n; i++) {   // dust round the hole
        const a = (i / n) * TAU + frand(-0.3, 0.3), s = frand(0.9, 1.5);
        q = P(0, SH.SMOKE, x + Math.cos(a) * 0.4, 0.1, z + Math.sin(a) * 0.4);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s; q.vy = frand(0.2, 0.5); q.drag = 3.4;
        q.size = frand(0.3, 0.4); q.size1 = q.size * 2.1; q.life = frand(0.5, 0.75); q.alpha = 0.85; q.fade = 2.2; q.pop = 0.1; q.spin = frand(-1, 1);
        q.color = dc || (i & 1 ? C.DUST : C.DIRTDUST); emitRaw(q);
      }
    },
    // Love hearts (the king's blush, the horse's happy munch, the dragon charmed): a fountain of big glossy hearts rising and
    // swaying, each with a soft pink glow, a pink ring, pink and golden twinkles and a few little gold stars. Aliases
    // 'heart', 'love', 'charm'. opts: {color (one colour for all hearts), scale, count}.
    hearts(x, y, z, o, K) {
      const tc = o.color ? lin(o.color) : null;
      flashGlow(x, y, z, 2.2, C.PINKG, 0.32, 0.42);
      let q = P(1, SH.RING, x, y, z); q.size = 0.5; q.size1 = 2.8; q.life = 0.36; q.rot = 0; q.color = C.PINKG; q.alpha = 0.55; q.fade = 1.5; emitRaw(q);
      for (let i = 0, n = N(10, K); i < n; i++) {
        const a = (i / n) * TAU + frand(-0.25, 0.25), s = frand(0.8, 1.8), ph = frand(0, TAU);
        q = P(0, SH.SHARD, x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25);
        q.vx = Math.cos(a) * s; q.vz = Math.sin(a) * s * 0.7; q.vy = frand(2.0, 3.4); q.drag = 1.5; q.grav = -0.3; q.wob = 1.2; q.phase = ph;
        q.size = frand(0.42, 0.66); q.size1 = q.size * 0.85; q.life = frand(1.5, 2.1); q.pop = 0.25; q.fade = 3; q.rot = frand(-0.35, 0.35); q.spin = frand(-0.5, 0.5);
        q.color = tc || C.HEARTS[i % 4]; q.delay = i * 0.03; emitRaw(q);
        q.add = 1; q.shape = SH.GLOW; q.size *= 2.1; q.size1 = q.size * 0.7; q.color = C.PINKG; q.alpha = 0.14; emitRaw(q);   // its glow, on the same path
      }
      twinkles(N(6, K), x, y + 0.3, z, 0.7, C.PINKG, 0.4);
      twinkles(N(3, K), x, y + 0.3, z, 0.6, null, 0.36);
      for (let i = 0, n = N(3, K); i < n; i++) {
        q = P(0, SH.SHARD, x, y + 0.2, z); radial(q, 0.6, 1.3, 2.4, 3.4); q.grav = 5; q.drag = 1.2;
        q.size = frand(0.16, 0.2); q.size1 = 0.06; q.life = frand(0.7, 0.9); q.spin = frand(-6, 6); q.pop = 0.08; q.fade = 2; q.color = C.SHOEY; q.delay = frand(0.05, 0.15); emitRaw(q);
      }
    },
    // The Kefir Devi's big soap bubble pops (x, y, z = its centre; scale = the bubble's radius): the film flicks out as a wide
    // pink-lilac ring (normal blend: shows on the pale kefir floor) with a pastel shine, glossy droplets fly off the film and fall,
    // confetti bursts out, baby bubbles fizz up, pastel sparkles, and a soft pink ring glides over the floor.
    // opts: {color (droplet tint), scale, count, ring: false (no ground ring)}.
    bigPop(x, y, z, o, K) {
      const tint = o.color ? hueNorm(lin(o.color), 0.97) : null;
      flashGlow(x, y, z, 2.6, C.PASTELG[1], 0.14, 0.3);
      let q = P(0, SH.RING, x, y, z); q.size = 1.9; q.size1 = 3.6; q.life = 0.24; q.rot = 0; q.color = C.SOAPF; q.alpha = 0.85; q.fade = 1.3; emitRaw(q);
      q = P(1, SH.RING, x, y, z); q.size = 1.7; q.size1 = 3.3; q.life = 0.2; q.rot = 0; q.color = C.PASTELG[0]; q.alpha = 0.35; q.fade = 1.3; emitRaw(q);
      for (let i = 0, n = N(14, K); i < n; i++) {   // droplets flung off the film
        const a = Math.random() * TAU, e = frand(-0.5, 0.9), c = Math.sqrt(1 - e * e), s = frand(2.2, 4);
        q = P(0, SH.DOT, x + Math.cos(a) * c * 0.9, y + e * 0.9, z + Math.sin(a) * c * 0.9);
        q.vx = Math.cos(a) * c * s; q.vy = e * s + 1.2; q.vz = Math.sin(a) * c * s;
        q.grav = 9; q.drag = 0.7; q.bounce = 0.1; q.stretch = 1.7; q.soft = 1; q.size = frand(0.09, 0.15); q.size1 = q.size * 0.6;
        q.life = frand(0.6, 0.9); q.fade = 3; q.color = tint || C.KEFR[i % 5]; emitRaw(q);
      }
      const shapes = [SH.SQUARE, SH.SHARD, SH.STAR, SH.SHARD, SH.SHARD, SH.SQUARE];
      for (let i = 0, n = N(16, K); i < n; i++) {   // confetti
        const a = Math.random() * TAU, e = frand(-0.2, 0.8), c = Math.sqrt(1 - e * e), s = frand(1.4, 3.2);
        q = P(0, shapes[i % 6], x + Math.cos(a) * c * 0.7, y + e * 0.7, z + Math.sin(a) * c * 0.7);
        q.vx = Math.cos(a) * c * s; q.vy = e * s + frand(2.4, 4); q.vz = Math.sin(a) * c * s;
        q.grav = 4.5; q.drag = 2; q.wob = 1.1; q.spin = frand(-10, 10); q.size = frand(0.16, 0.24); q.life = frand(1.6, 2.2); q.fade = 4;
        q.color = C.CONF[(i * 7) % 6]; q.delay = frand(0, 0.06); emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {   // baby bubbles fizz up
        q = P(0, SH.RING, x + frand(-0.5, 0.5), y + frand(-0.3, 0.4), z + frand(-0.5, 0.5)); q.vx = frand(-0.3, 0.3); q.vy = frand(0.6, 1.2); q.vz = frand(-0.3, 0.3);
        q.grav = -1; q.wob = 0.5; q.soft = 1; q.size = frand(0.12, 0.2); q.size1 = q.size * 1.25; q.life = frand(0.8, 1.1); q.fade = 5; q.pop = 0.12;
        q.color = C.KEFR[i % 5]; q.delay = frand(0.04, 0.12); emitRaw(q);
      }
      for (let i = 0, n = N(8, K); i < n; i++) {   // pastel sparkles where the film was
        const a = Math.random() * TAU, e = frand(-0.6, 0.8), c = Math.sqrt(1 - e * e);
        q = P(1, SH.SPARK, x + Math.cos(a) * c * 0.95, y + e * 0.95, z + Math.sin(a) * c * 0.95); q.vx = Math.cos(a) * c * 0.8; q.vy = frand(0.3, 1.0); q.vz = Math.sin(a) * c * 0.8;
        q.size = frand(0.26, 0.38); q.size1 = 0.04; q.life = frand(0.5, 0.75); q.pop = 0.08; q.flick = frand(14, 22); q.rot = frand(-0.3, 0.3);
        q.color = C.PASTELG[i % C.PASTELG.length]; q.delay = frand(0, 0.08); emitRaw(q);
      }
      if (o.ring !== false) ring(x, z, { r0: 0.5 * bk, r1: 2.0 * bk, dur: 0.45, color: '#ff9ad8', k: 0.6, edge: 0.15, width: 0.5 * bk });
    },
    // A serin taş (the cool mint boulder) cracks when the rolling lava turtle bumps it: a cool flash + ring, mint crystal shards
    // and rounded chips tumbling out and bouncing, cool white mist billowing, frosty twinkles. opts: {color (shard tint), dir, scale, count}.
    crack(x, y, z, o, K) {
      const v = o.color ? [lin(o.color, 0.8), lin(o.color), lin(o.color, 1.15)] : C.MINT, dx = o.dir ? o.dir.x * 1.5 : 0, dz = o.dir ? o.dir.z * 1.5 : 0;
      flashGlow(x, y, z, 1.8, C.MINTG, 0.16, 0.5);
      let q = P(1, SH.RING, x, y, z); q.size = 0.5; q.size1 = 2.2; q.life = 0.24; q.rot = 0; q.color = C.MINTG; q.alpha = 0.55; q.fade = 1.4; emitRaw(q);
      for (let i = 0, n = N(12, K); i < n; i++) {   // crystal shards
        q = P(0, SH.SHARD, x + frand(-0.3, 0.3), y + frand(-0.2, 0.3), z + frand(-0.3, 0.3)); radial(q, 2.2, 4.8, 2.4, 5.2); q.vx += dx; q.vz += dz;
        q.grav = 11; q.bounce = 0.3; q.drag = 0.3; q.size = frand(0.26, 0.42); q.size1 = q.size * 0.8; q.life = frand(0.9, 1.3); q.spin = frand(-12, 12); q.fade = 4;
        q.color = v[i % v.length]; emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {   // rounded boulder chips
        q = P(0, i & 1 ? SH.DOT : SH.SQUARE, x + frand(-0.2, 0.2), y, z + frand(-0.2, 0.2)); radial(q, 1.2, 2.6, 2, 3.8); q.vx += dx * 0.6; q.vz += dz * 0.6;
        q.grav = 12; q.bounce = 0.35; q.size = frand(0.2, 0.32); q.life = frand(1.0, 1.3); q.spin = frand(-8, 8); q.fade = 4; q.color = v[(i + 1) % v.length]; emitRaw(q);
      }
      for (let i = 0, n = N(5, K); i < n; i++) {   // cool mist
        q = P(0, SH.SMOKE, x + frand(-0.25, 0.25), y + frand(-0.1, 0.2), z + frand(-0.25, 0.25)); radial(q, 0.3, 0.9, 0.7, 1.4);
        q.grav = -0.2; q.drag = 1.2; q.wob = 0.4; q.size = frand(0.4, 0.5); q.size1 = q.size * 3; q.life = frand(1.2, 1.7); q.alpha = 0.8; q.fade = 2.2; q.pop = 0.15;
        q.spin = frand(-0.8, 0.8); q.color = C.MIST; q.delay = i * 0.04; emitRaw(q);
      }
      twinkles(N(8, K), x, y + 0.2, z, 0.8, C.MINTW, 0.42);
    },
  };
  const simO = { color: null, dir: null, pal: null };   // scratch opts: the simit break reuses the crumbs preset
  // Friendly aliases (other modules may guess a name): all fall back to a real preset instead of the generic sparkle.
  B.bubble = B.bubblePop; B.pop = B.bubblePop; B.glitter = B.bubbles; B.dig = B.dirt; B.mud = B.dirt; B.clods = B.dirt; B.trail = B.slime;
  B.magma = B.lava; B.eruption = B.erupt; B.volcano = B.erupt; B.vent = B.steam; B.splat = B.jelly;
  B.cream = B.milk; B.yogurt = B.milk; B.splash = B.milk; B.kefir = B.fizz; B.crumb = B.crumbs; B.biscuit = B.crumbs;
  B.gallop = B.hoof; B.hooves = B.hoof; B.note = B.notes; B.music = B.notes; B.clink = B.horseshoe; B.sesame = B.simit;
  B.heart = B.hearts; B.love = B.hearts; B.charm = B.hearts;
  let warnedKind = null;
  function burst(kind, x, y, z, o) {
    if (!ready) init();
    o = o || EMPTY;
    let f = B[kind];
    if (!f) { if (warnedKind !== kind) { warnedKind = kind; console.warn('FX.burst: unknown kind', kind); } f = B.sparkle; }
    y = y ?? 0;
    bx = x; by = y; bz = z; bk = o.scale || 1;
    f(x, y, z, o, o.count ? o.count / (MAIN[kind] || 8) : 1);
    bk = 1;
  }
  function emit(p) {
    if (!ready) init();
    bx = p.x || 0; by = p.y || 0; bz = p.z || 0; bk = 1;
    emitRaw(p);
  }

  // ───────────────────────── Pools for mesh effects ─────────────────────────
  // Every pooled item: {obj, on, gen, t}. Handles check gen, so a stale remove() never kills a reused slot.
  const pools = {};
  function acquire(name, max) {
    const pl = pools[name];
    let it = null;
    for (const x of pl.items) if (!x.on) { it = x; break; }
    if (!it && pl.items.length < max) { it = pl.make(); pl.items.push(it); }
    if (!it) { it = pl.items[0]; for (const x of pl.items) if (x.t0 < it.t0) it = x; release(it); }
    it.on = true; it.gen++; it.t = 0; it.t0 = clock; it.dying = 0; it.obj.visible = true;
    return it;
  }
  function release(it) { it.on = false; it.gen++; it.obj.visible = false; if (it.onRelease) it.onRelease(); }
  function handle(it, obj) {
    const g = it.gen;
    return { obj, remove() { if (it.gen === g && it.on && !it.dying) { if (it.kill) it.kill(); else release(it); } } };
  }
  function addPool(name, make) { pools[name] = { items: [], make }; }

  const QUAD_VS = `uniform float uSize; varying vec2 vP;
    void main() { vP = position.xz * uSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x * uSize, position.y, position.z * uSize, 1.0); }`;
  let QUAD = null;
  function quadGeo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);
    return keep(g);
  }
  function fxMesh(geo, mat, order) {
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = order; m.frustumCulled = false; m.visible = false; m.matrixAutoUpdate = true;
    scene.add(m);
    return m;
  }

  // ── Slash (lightsaber swoosh): a thin bright energy arc traced by the blade tip, bright head, fading tail ──
  const SLASH_VS = `uniform float uA0, uArc, uR0, uR1; varying vec2 vUv;
    void main() { float a = uA0 + uArc * position.x; float r = mix(uR0, uR1, position.y);
      vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(sin(a) * r, 0.0, cos(a) * r, 1.0); }`;
  // Energy arc: a thin white-hot core line (tinted by the blade colour) inside a soft coloured glow shell, plus a faint
  // coloured "blade blur" sweep on the inner side. uCol = blade colour (linear, <= 1: the shell stays a crisp colour, never
  // a pale blob); uEdge = the hue-normalised colour × 1.8 (the core blooms in the blade's colour). Only the short leading
  // head gets a touch of pure white.
  const SLASH_FS = `uniform vec3 uCol, uEdge; uniform float uHead, uLen, uFade; varying vec2 vUv;
    void main() {
      float d = uHead - vUv.x, k = clamp(d / uLen, 0.0, 1.0);
      float vis = smoothstep(-0.012, 0.004, d) * step(d, uLen);
      float yc = 0.76 - 0.06 * k;                                    // the tip trace curls slightly inward toward the tail
      float wc = mix(0.04, 0.016, k), wg = mix(0.13, 0.05, k);       // core / glow half-widths thin toward the tail
      float dy = vUv.y - yc, core = exp(-dy * dy / (wc * wc)), glow = exp(-dy * dy / (wg * wg));
      float sweep = smoothstep(0.15, yc, vUv.y) * (1.0 - smoothstep(yc, yc + 0.05, vUv.y));
      float tail = pow(1.0 - k, 1.5), head = pow(1.0 - k, 9.0);
      float flick = 0.88 + 0.12 * sin(vUv.x * 60.0 - uHead * 40.0);  // a little energy crackle along the arc
      vec3 c = uCol * (0.9 * glow * tail * flick + 0.16 * sweep * tail * tail)
             + uEdge * core * (0.8 * tail + 0.6 * head)
             + vec3(1.0) * core * (0.1 * tail + 0.9 * head) + uEdge * 0.3 * glow * head;
      // premultiplied "over": the core (and a little of the shell) partly covers what is behind, so a red blade stays red
      // over bright green grass instead of adding up to orange; the soft outer glow stays additive (alpha 0)
      float a = clamp(0.9 * core * sqrt(tail) + 0.6 * glow * tail, 0.0, 0.92);
      gl_FragColor = vec4(c * vis * uFade, a * vis * uFade);
      ${CHUNK_OUT}
    }`;
  let SLASH_GEO = null;
  function slashGeo() {
    const NU = 40, NV = 5, pos = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) pos.push(i / NU, j / NV, 0);
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
    return keep(g);
  }
  addPool('slash', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uA0: { value: 0 }, uArc: { value: 1 }, uR0: { value: 0.5 }, uR1: { value: 2 }, uHead: { value: 0 }, uLen: { value: 0.85 }, uFade: { value: 1 }, uCol: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() } },
      vertexShader: SLASH_VS, fragmentShader: SLASH_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    });
    return { obj: fxMesh(SLASH_GEO, mat, 22), mat, on: false, gen: 0, t: 0, dur: 0.22 };
  });
  function slash(x, y, z, face, dir, color = '#fff', radius = 1.9, arc = 2.4) {
    if (!ready) init();
    dir = dir < 0 ? -1 : 1;
    const it = acquire('slash', 6), u = it.mat.uniforms, n = vivid(lin(color || '#9fe8ff'));
    u.uA0.value = -dir * arc / 2; u.uArc.value = dir * arc; u.uR1.value = radius; u.uR0.value = radius * 0.65;
    u.uCol.value.setRGB(n[0] * 0.9, n[1] * 0.9, n[2] * 0.9); u.uEdge.value.setRGB(n[0] * 1.8, n[1] * 1.8, n[2] * 1.8);
    u.uHead.value = 0; u.uFade.value = 1;
    it.obj.position.set(x, y, z); it.obj.rotation.set(0, face, 0.26 * dir, 'YXZ');
    it.dur = 0.24; it.r = radius;
    it.colG = it.colG || [0, 0, 0]; it.colG[0] = n[0] * 2.4; it.colG[1] = n[1] * 2.4; it.colG[2] = n[2] * 2.4;
  }
  function stepSlash(it, dt) {
    it.t += dt;
    const p = it.t / it.dur, u = it.mat.uniforms;
    if (p >= 1) { release(it); return; }
    const head = easeOut(Math.min(1, p / 0.6));
    u.uHead.value = head; u.uFade.value = 1 - sstep(0.5, 1, p);
    if (head < 0.98) {   // small energy sparks crackling off the blade tip (blade-coloured, only a few white)
      const a = u.uA0.value + u.uArc.value * head, r = it.r * 0.8;
      it.obj.updateMatrixWorld();
      _v.set(Math.sin(a) * r, 0, Math.cos(a) * r).applyMatrix4(it.obj.matrixWorld);
      bx = _v.x; by = _v.y; bz = _v.z; bk = 1;
      const q = P(1, Math.random() < 0.6 ? SH.SPARK : SH.GLOW, _v.x, _v.y, _v.z);
      q.vx = frand(-1.2, 1.2); q.vy = frand(0.4, 1.6); q.vz = frand(-1.2, 1.2); q.size = frand(0.12, 0.24); q.size1 = 0.02; q.life = frand(0.2, 0.32); q.drag = 3;
      q.flick = 26; q.color = Math.random() < 0.25 ? C.W2 : it.colG; q.rot = 0; emitRaw(q);
    }
  }

  // ── Ground ring / shockwave ──
  const RING_FS = `uniform vec3 uCol; uniform float uR, uW, uA, uEdge; varying vec2 vP;
    void main() {
      float r = length(vP), s = (uR - r) / uW;
      float body = smoothstep(-0.04 / uW, 0.0, s) * pow(clamp(1.0 - s, 0.0, 1.0), 2.2);
      float e = (r - uR) / 0.06, edge = exp(-e * e);
      float seg = 0.82 + 0.18 * sin(atan(vP.y, vP.x) * 9.0 + r * 4.0);
      vec3 c = uCol * body * seg + (uCol * 0.5 + vec3(1.2) * uEdge) * edge;
      gl_FragColor = vec4(c * uA, 1.0);
      ${CHUNK_OUT}
    }`;
  addPool('ring', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 1 }, uR: { value: 1 }, uW: { value: 0.3 }, uA: { value: 1 }, uEdge: { value: 1 }, uCol: { value: new THREE.Color() } },
      vertexShader: QUAD_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { obj: fxMesh(QUAD, mat, 12), mat, on: false, gen: 0, t: 0 };
  });
  function ring(x, z, o = EMPTY) {
    if (!ready) init();
    // optional (Round 3): o.k = colour intensity (default 2.2), o.edge = white rim amount (default 1; lava uses a little)
    const it = acquire('ring', 14), c = lin(o.color ?? '#fff3c4', o.k ?? 2.2);
    it.r0 = o.r0 ?? 0.3; it.r1 = o.r1 ?? 4; it.dur = o.dur ?? 0.45; it.w = o.width ?? 0.35;
    it.mat.uniforms.uCol.value.setRGB(c[0], c[1], c[2]); it.mat.uniforms.uEdge.value = o.edge ?? 1;
    it.obj.position.set(x, o.y ?? 0.06, z);
    stepRing(it, 0);
  }
  function stepRing(it, dt) {
    it.t += dt;
    const p = it.t / it.dur, u = it.mat.uniforms;
    if (p >= 1) { release(it); return; }
    const r = it.r0 + (it.r1 - it.r0) * easeOut(p), w = it.w * (1 - 0.45 * p);
    u.uR.value = r; u.uW.value = Math.max(0.05, Math.min(w, r)); u.uSize.value = r + 0.25; u.uA.value = 1 - Math.pow(p, 1.6);
  }

  // ── Telegraphs: filling disk / cone on the ground (danger zones kids can read) ──
  const TELE_FS = `uniform vec3 uCol; uniform float uR, uP, uA, uHalf, uT, uFlash; varying vec2 vP;
    void main() {
      vec2 q = vec2(abs(vP.x), vP.y);
      float r = length(vP), dw = -1e3;
      if (uHalf < 3.1) { vec2 e = vec2(sin(uHalf), cos(uHalf)); dw = dot(q, e) > 0.0 ? q.x * e.y - q.y * e.x : r; }
      float d = max(dw, r - uR);
      float inside = smoothstep(0.025, -0.025, d);
      float pulse = 1.0 + 0.35 * smoothstep(0.6, 1.0, uP) * sin(uT * 22.0);
      float line = exp(-d * d / 0.0045);
      float fr = uR * uP, hurry = smoothstep(0.6, 1.0, uP);
      float filled = smoothstep(fr + 0.03, fr - 0.03, r) * inside;
      float front = exp(-(r - fr) * (r - fr) / 0.006) * inside * step(0.01, uP) * step(uP, 0.995);
      vec2 gp = vP * 2.3 + vec2(0.0, uT * 0.35); gp.x += 0.5 * step(1.0, mod(floor(gp.y), 2.0));
      float dots = smoothstep(0.16, 0.07, abs(fract(gp.x + gp.y) - 0.5));   // diagonal claw scores across the danger floor
      float g = smoothstep(0.0, uR, r);
      // Danger stays the enemy's hue and only gets deeper and more opaque
      // as it fills; the fill is kept under 1.0 so it never blooms into a pale disc. Only the outline and the front glow.
      float m = max(max(uCol.r, uCol.g), uCol.b);
      vec3 base = uCol / max(m, 1e-3);
      vec3 fillCol = mix(base, base * base, 0.5 * uP) * 0.93;
      fillCol = mix(fillCol, min(vec3(0.97), base * 0.6 + 0.4), dots * 0.3);
      float aFill = inside * (0.1 + 0.14 * g * g + 0.07 * dots) + filled * mix(0.25, 0.55, uP) * (0.85 + 0.15 * g) * (1.0 + 0.18 * hurry * sin(uT * 22.0));
      float a = 1.0 - (1.0 - aFill) * (1.0 - line * 0.95) * (1.0 - front * 0.85);
      vec3 col = mix(fillCol, base * 1.9 * pulse, line);
      col = mix(col, base * 1.5 + vec3(0.2, 0.08, 0.04), front * 0.8);
      col = mix(col, base * 0.97, uFlash * inside * (1.0 - line));   // completion: a strong pulse in the hue (still < 1, no white bloom)
      col = mix(col, base * 2.8, uFlash * line);
      a = max(a, uFlash * (0.88 * inside + line));
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uA);
      ${CHUNK_OUT}
    }`;
  addPool('tele', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 1 }, uR: { value: 1 }, uP: { value: 0 }, uA: { value: 1 }, uHalf: { value: 4 }, uT: uTime, uFlash: { value: 0 }, uCol: { value: new THREE.Color() } },
      vertexShader: QUAD_VS, fragmentShader: TELE_FS, transparent: true, depthWrite: false,
    });
    return { obj: fxMesh(QUAD, mat, 10), mat, on: false, gen: 0, t: 0 };
  });
  // Enemy danger stays ember red, distinct from the hunter's violet curses.
  const TELE_DEF = '#d95a3c';
  function teleColor(color) {
    _c.set(color || TELE_DEF);
    return _c;
  }
  function teleStart(x, z, face, half, r, dur, color) {
    if (!ready) init();
    const it = acquire('tele', 16), u = it.mat.uniforms, c = teleColor(color);
    u.uCol.value.setRGB(c.r, c.g, c.b); u.uR.value = r; u.uHalf.value = half; u.uSize.value = r + 0.2; u.uP.value = 0; u.uFlash.value = 0; u.uA.value = 0;
    it.obj.position.set(x, 0.045, z); it.obj.rotation.set(0, face, 0); it.obj.scale.setScalar(0.6);
    it.dur = Math.max(0.05, dur || 1);
    return handle(it, it.obj);
  }
  const telegraph = (x, z, r, dur, color) => teleStart(x, z, 0, 4, r, dur, color);
  const telegraphCone = (x, z, face, angle, len, dur, color) => teleStart(x, z, face, Math.min(3.0, (angle || 1) / 2), len, dur, color);
  function stepTele(it, dt) {
    it.t += dt;
    const u = it.mat.uniforms, p = Math.min(1, it.t / it.dur);
    const pin = Math.min(1, it.t / 0.14);
    it.obj.scale.setScalar(0.6 + 0.4 * backOut(pin));
    u.uP.value = p;
    if (it.t < it.dur) { u.uA.value = Math.min(1, it.t / 0.1); return; }
    const f = (it.t - it.dur) / 0.2;
    if (f >= 1) { release(it); return; }
    u.uFlash.value = 1 - f; u.uA.value = 1 - f * f;
  }

  // ── Lane telegraph (Round 3: the lava turtle's roll): a rounded strip from (x0,z0) to (x1,z1) in the same friendly
  // style as the circle — candy colour, bright outline, deeper fill — that fills from the start toward the end, with soft
  // chevrons drifting along it so a kid sees which way the charge will go. Local +z points from start to end.
  const LANE_VS = `uniform vec2 uHalf; varying vec2 vP;
    void main() { vP = vec2(position.x * uHalf.x, position.z * uHalf.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(vP.x, position.y, vP.y, 1.0); }`;
  const LANE_FS = `uniform vec3 uCol; uniform float uHL, uHW, uP, uA, uT, uFlash; varying vec2 vP;
    void main() {
      float d = length(vec2(vP.x, vP.y - clamp(vP.y, -uHL, uHL))) - uHW;   // stadium (capsule) distance
      float inside = smoothstep(0.025, -0.025, d);
      float line = exp(-d * d / 0.0045);
      float s = vP.y + uHL + uHW, L = 2.0 * (uHL + uHW);   // 0 at the start cap, L at the end cap
      float fr = L * uP, hurry = smoothstep(0.6, 1.0, uP), pulse = 1.0 + 0.35 * hurry * sin(uT * 22.0);
      float filled = smoothstep(fr + 0.05, fr - 0.05, s) * inside;
      float front = exp(-(s - fr) * (s - fr) / 0.012) * inside * step(0.01, uP) * step(uP, 0.995);
      float ax = abs(vP.x);
      float chev = smoothstep(0.17, 0.07, abs(fract((s + 0.6 * ax - uT * 1.8) / 1.25) - 0.5)) * smoothstep(uHW * 0.78, uHW * 0.5, ax) * inside;
      float g = smoothstep(0.0, uHW, ax);
      float m = max(max(uCol.r, uCol.g), uCol.b);
      vec3 base = uCol / max(m, 1e-3);
      vec3 fillCol = mix(base, base * base, 0.5 * uP) * 0.93;
      fillCol = mix(fillCol, min(vec3(0.97), base * 0.5 + 0.5), chev * 0.6);
      float aFill = inside * (0.1 + 0.14 * g * g + 0.2 * chev) + filled * mix(0.25, 0.55, uP) * (0.85 + 0.15 * g) * (1.0 + 0.18 * hurry * sin(uT * 22.0));
      float a = 1.0 - (1.0 - aFill) * (1.0 - line * 0.95) * (1.0 - front * 0.85);
      vec3 col = mix(fillCol, base * 1.9 * pulse, line);
      col = mix(col, base * 1.5 + vec3(0.2, 0.08, 0.04), front * 0.8);
      col = mix(col, base * 0.97, uFlash * inside * (1.0 - line));   // completion pulse in the hue (no white bloom)
      col = mix(col, base * 2.8, uFlash * line);
      a = max(a, uFlash * (0.88 * inside + line));
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uA);
      ${CHUNK_OUT}
    }`;
  addPool('lane', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uHalf: { value: new THREE.Vector2(1, 1) }, uHL: { value: 1 }, uHW: { value: 0.5 }, uP: { value: 0 }, uA: { value: 1 }, uT: uTime, uFlash: { value: 0 }, uCol: { value: new THREE.Color() } },
      vertexShader: LANE_VS, fragmentShader: LANE_FS, transparent: true, depthWrite: false,
    });
    return { obj: fxMesh(QUAD, mat, 10), mat, on: false, gen: 0, t: 0, warm: false };
  });
  function laneSet(it, x0, z0, x1, z1, width, dur, color) {
    const u = it.mat.uniforms, c = teleColor(color);
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), hw = Math.max(0.2, (width > 0 ? width : 2) / 2), hl = len / 2;
    u.uCol.value.setRGB(c.r, c.g, c.b); u.uHL.value = hl; u.uHW.value = hw; u.uHalf.value.set(hw + 0.15, hl + hw + 0.15);
    u.uP.value = 0; u.uFlash.value = 0; u.uA.value = 0;
    it.obj.position.set((x0 + x1) / 2, 0.047, (z0 + z1) / 2); it.obj.rotation.set(0, len > 1e-4 ? Math.atan2(dx, dz) : 0, 0); it.obj.scale.set(0.7, 1, 0.94);
    it.dur = Math.max(0.05, dur || 1); it.warm = false;
  }
  function telegraphLine(x0, z0, x1, z1, width, dur, color) {
    if (!ready) init();
    const n = v => (typeof v === 'number' && isFinite(v) ? v : 0);
    x0 = n(x0); z0 = n(z0); x1 = n(x1); z1 = n(z1);
    const it = acquire('lane', 6);
    laneSet(it, x0, z0, x1, z1, n(width), n(dur), color);
    return handle(it, it.obj);
  }
  function stepLane(it, dt) {
    it.t += dt;
    const u = it.mat.uniforms, p = Math.min(1, it.t / it.dur), pin = backOut(Math.min(1, it.t / 0.16));
    it.obj.scale.set(0.7 + 0.3 * pin, 1, 0.94 + 0.06 * pin);
    u.uP.value = p;
    if (it.t < it.dur) { u.uA.value = it.warm ? 0 : Math.min(1, it.t / 0.1); return; }
    const f = (it.t - it.dur) / 0.2;
    if (f >= 1 || it.warm) { release(it); return; }
    u.uFlash.value = 1 - f; u.uA.value = 1 - f * f;
  }

  // ── Marker (Round 6): the friendly "come here!" spot (the fallen crown, the carrot, the hole the mole peeks from, a floating
  // heart). It must never look like the danger circle (a pink disc that fills up): it is an OUTLINE — a round shiny golden hoop
  // (lighter crest, white shine, a thin darker rim so it also reads on pale floors), chasing lights round its inner side, four
  // little chevrons sliding inward from outside ("here!"), pulsing ×1.08 at 3 Hz, with sparkles rising off it and a solid
  // star bobbing above it (both particles: the marker is one mesh). The inside stays empty floor.
  // Premultiplied output: alpha covers what is under the hoop, the soft glow round it adds.
  const MARK_FS = `uniform vec3 uCol, uEdge, uAcc; uniform float uR, uA, uT, uN; varying vec2 vP;
    void main() {
      float r = length(vP), a = atan(vP.y, vP.x), hw = 0.08 + 0.035 * uR, d = (r - uR) / hw;
      // the hoop: a round tube, deep at its sides, bright at the crest, a white shine line, a darker rim round it
      float tube = 1.0 - smoothstep(0.8, 1.0, abs(d));
      float crest = sqrt(max(0.0, 1.0 - d * d));
      float shine = exp(-(d + 0.35) * (d + 0.35) / 0.035) * (0.65 + 0.35 * sin(a * 3.0 - uT * 2.5));
      float rim = (1.0 - smoothstep(1.35, 1.6, abs(d))) * (1.0 - tube);
      vec3 deep = uEdge * 1.9;
      vec3 tubeCol = mix(deep, uCol * 1.1, smoothstep(0.1, 0.85, crest)) + vec3(0.9) * shine;
      // chasing light bulbs sitting on the hoop (every 4th one lit, running round)
      float ci = floor(a / 6.2831853 * uN + 0.5), la = ci / uN * 6.2831853;
      float ld = length(vP - uR * vec2(cos(la), sin(la))), br = hw * 0.5;
      float lamp = 1.0 - smoothstep(br, br + 0.016, ld), lampRim = (1.0 - smoothstep(br + 0.016, br + 0.034, ld)) * (1.0 - lamp);
      float chase = pow(0.5 + 0.5 * cos(ci * 1.5707963 - uT * 9.0), 3.0);
      // four chevrons (right / up / left / down), sliding in toward the hoop and fading in / out: "here!"
      float a4 = mod(a + 0.7853982, 1.5707963) - 0.7853982, cu = r * cos(a4), cv = r * sin(a4);
      float k = fract(uT * 0.9), cc = uR + hw + 0.4 - 0.26 * k, fa = smoothstep(0.0, 0.15, k) * (1.0 - smoothstep(0.8, 1.0, k));
      float dch = abs((cu - cc) - abs(cv) * 0.9) * 0.74, arm = 1.0 - smoothstep(0.2, 0.25, abs(cv));
      float chev = (1.0 - smoothstep(0.045, 0.06, dch)) * arm * fa, chevRim = (1.0 - smoothstep(0.06, 0.082, dch)) * arm * fa;
      // soft glow round the hoop (additive; kept low so a pale floor is not washed out)
      float go = max(abs(r - uR) - hw, 0.0);
      vec3 add = uCol * 0.22 * exp(-go * go / 0.025) * (0.85 + 0.15 * sin(uT * 18.85));
      vec3 P = vec3(0.0); float A = 0.0, s;
      s = rim * 0.88; P = P * (1.0 - s) + uEdge * s; A = A * (1.0 - s) + s;
      s = tube * 0.98; P = P * (1.0 - s) + tubeCol * s; A = A * (1.0 - s) + s;
      s = lampRim * 0.8; P = P * (1.0 - s) + uEdge * s; A = A * (1.0 - s) + s;
      s = lamp; P = P * (1.0 - s) + uAcc * (0.75 + 0.9 * chase) * s; A = A * (1.0 - s) + s;
      s = chevRim * 0.88; P = P * (1.0 - s) + uEdge * s; A = A * (1.0 - s) + s;
      s = chev; P = P * (1.0 - s) + (uCol * 1.12 + vec3(0.12)) * s; A = A * (1.0 - s) + s;
      gl_FragColor = vec4((P + add) * uA, A * uA);
      ${CHUNK_OUT}
    }`;
  addPool('marker', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 1 }, uR: { value: 1 }, uA: { value: 1 }, uT: { value: 0 }, uN: { value: 16 },
        uCol: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uAcc: { value: new THREE.Color() } },
      vertexShader: QUAD_VS, fragmentShader: MARK_FS, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const it = { obj: fxMesh(QUAD, mat, 11), mat, on: false, gen: 0, t: 0, r: 1, dur: 0, acc: 0, star: true, sy: 1.6,
      cG: [0, 0, 0], cS: [0, 0, 0], cA: [0, 0, 0] };
    it.kill = () => { it.dying = 1; };
    return it;
  });
  // marker(x, z, r = 0.9, dur = 0 (until remove), color = '#ffd23f' (gold; pink '#bc4743' for the dragon's hearts), o) →
  // {obj, move(x, z), remove()}. o: {accent (the lights; default cream on gold, gold on other colours), star: false (no star),
  // starY (default 1.6)}. remove() fades it out in 0.3 s; a stale handle never touches a reused marker.
  function marker(x, z, r = 0.9, dur = 0, color = '#ffd23f', o = EMPTY) {
    if (!ready) init();
    const it = acquire('marker', 8), u = it.mat.uniforms, g = it.gen;
    r = Math.max(0.3, +r || 0.9); o = o || EMPTY;
    const base = hueNorm(lin(color || '#ffd23f'));
    _c.setRGB(base[0], base[1], base[2]); _c.getHSL(_hsl);
    const goldish = _hsl.h > 0.07 && _hsl.h < 0.2, acc = lin(o.accent || (goldish ? '#fff4c8' : '#ffd23f'));
    u.uCol.value.setRGB(base[0] * 1.05, base[1] * 1.05, base[2] * 1.05);
    u.uEdge.value.setRGB(base[0] * base[0] * 0.38, base[1] * base[1] * 0.38, base[2] * base[2] * 0.38);   // deeper, more saturated rim
    u.uAcc.value.setRGB(acc[0], acc[1], acc[2]);
    u.uR.value = r; u.uSize.value = r + 1.0; u.uA.value = 0; u.uT.value = 0;
    u.uN.value = 4 * Math.max(2, Math.round(r * TAU / 0.36 / 4));
    for (let i = 0; i < 3; i++) { it.cG[i] = base[i] * 2.4; it.cS[i] = base[i] * 0.98; it.cA[i] = acc[i] * 2.2; }
    it.r = r; it.dur = Math.max(0, +dur || 0); it.acc = 0; it.star = o.star !== false; it.sy = o.starY ?? 1.6;
    it.obj.position.set(+x || 0, 0.05, +z || 0); it.obj.scale.setScalar(0.55);
    return {
      obj: it.obj,
      move(nx, nz) { if (it.gen === g && it.on) it.obj.position.set(+nx || 0, 0.05, +nz || 0); },
      remove() { if (it.gen === g && it.on && !it.dying) it.kill(); },
    };
  }
  function stepMarker(it, dt) {
    it.t += dt;
    const u = it.mat.uniforms;
    let s = 0.55 + 0.45 * backOut(Math.min(1, it.t / 0.3)), a = Math.min(1, it.t / 0.15);
    if (it.dur > 0 && it.t >= it.dur && !it.dying) it.dying = 1;
    if (it.dying) { it.dying -= dt / 0.3; if (it.dying <= 0) { release(it); return; } a *= it.dying; s *= 1 + 0.25 * (1 - it.dying); }
    const pulse = 1 + 0.04 * (1 - Math.cos(it.t * TAU * 3));
    it.obj.scale.setScalar(s * pulse);
    u.uA.value = a; u.uT.value = it.t;
    const x = it.obj.position.x, z = it.obj.position.z, R = it.r * s * pulse;
    bx = x; by = 0; bz = z; bk = 1;
    let q;
    if (!it.dying) {
      it.acc += dt;
      while (it.acc >= 0.08) {   // 2 sparkles every 0.08 s rising off the hoop: one additive twinkle, one solid little star (pale floors)
        it.acc -= 0.08;
        let ang = Math.random() * TAU, rr = R * frand(0.94, 1.04);
        q = P(1, SH.SPARK, x + Math.cos(ang) * rr, 0.12, z + Math.sin(ang) * rr); q.vx = Math.cos(ang) * 0.12; q.vz = Math.sin(ang) * 0.12; q.vy = frand(0.8, 1.4);
        q.drag = 0.6; q.size = frand(0.22, 0.32); q.size1 = 0.04; q.life = frand(0.7, 1.0); q.pop = 0.08; q.flick = frand(12, 20); q.rot = frand(-0.3, 0.3);
        q.color = Math.random() < 0.5 ? it.cG : it.cA; emitRaw(q);
        ang = Math.random() * TAU; rr = R * frand(0.94, 1.04);
        q = P(0, SH.SHARD, x + Math.cos(ang) * rr, 0.14, z + Math.sin(ang) * rr); q.vy = frand(0.7, 1.2); q.drag = 0.5; q.wob = 0.4;
        q.size = frand(0.11, 0.15); q.size1 = 0.04; q.life = frand(0.7, 1.0); q.pop = 0.1; q.fade = 2; q.spin = frand(-4, 4); q.color = it.cS; emitRaw(q);
      }
    }
    if (it.star && dt > 1e-6) {   // the bobbing star: re-emitted every frame for one frame (life 1.5 dt), so it follows move() exactly
      const life = dt * 1.5 + 1e-4, yy = it.sy + 0.1 * Math.sin(it.t * 5.2), sz = 0.46 * (1 + 0.06 * Math.sin(it.t * TAU * 3));
      q = P(1, SH.GLOW, x, yy, z); q.size = 0.9; q.size1 = 0.9; q.life = life; q.fade = 60; q.alpha = 0.16 * a; q.color = C.GOLD; emitRaw(q);
      q = P(0, SH.SHARD, x, yy, z); q.size = sz; q.size1 = sz; q.life = life; q.fade = 60; q.rot = 0.2 * Math.sin(it.t * 2.6); q.alpha = a; q.color = C.MSTAR; emitRaw(q);
    }
  }

  // ── Dizzy stars (Round 6): 5 solid yellow stars circling above a stunned boss's head, each with a soft glow, now and then a
  // twinkle. Particles only (re-emitted every frame for one frame): no mesh, no draw call of its own.
  // dizzy(x, y, z, r = 0.55 (orbit radius), dur = 0 (until remove)) → {move(x, y, z), remove()}.
  addPool('dizzy', () => {
    const it = { obj: new THREE.Object3D(), on: false, gen: 0, t: 0, x: 0, y: 0, z: 0, r: 0.55, dur: 0, acc: 0 };
    it.kill = () => { it.dying = 1; };
    return it;
  });
  function dizzy(x, y, z, r = 0.55, dur = 0) {
    if (!ready) init();
    const it = acquire('dizzy', 8), g = it.gen;
    it.x = +x || 0; it.y = +y || 0; it.z = +z || 0; it.r = Math.max(0.2, +r || 0.55); it.dur = Math.max(0, +dur || 0); it.acc = 0;
    return {
      obj: it.obj,
      move(nx, ny, nz) { if (it.gen === g && it.on) { it.x = +nx || 0; it.y = +ny || 0; it.z = +nz || 0; } },
      remove() { if (it.gen === g && it.on && !it.dying) it.kill(); },
    };
  }
  function stepDizzy(it, dt) {
    it.t += dt;
    let a = Math.min(1, it.t / 0.2), R = it.r * (0.5 + 0.5 * easeOut(Math.min(1, it.t / 0.3)));
    if (it.dur > 0 && it.t >= it.dur && !it.dying) it.dying = 1;
    if (it.dying) { it.dying -= dt / 0.3; if (it.dying <= 0) { release(it); return; } a *= it.dying; R *= 1 + 0.6 * (1 - it.dying); }
    if (dt <= 1e-6) return;
    const life = dt * 1.5 + 1e-4, base = it.t * 3.4, sz = 0.2 + 0.16 * it.r;
    bx = it.x; by = it.y; bz = it.z; bk = 1;
    let q;
    for (let i = 0; i < 5; i++) {
      const ang = base + i * TAU / 5, c = Math.cos(ang), s = Math.sin(ang);
      const px = it.x + c * R, pz = it.z + s * R, py = it.y + 0.2 * R * Math.sin(ang + 1.1) + 0.03 * Math.sin(it.t * 7 + i * 1.3);
      const k = 1 + 0.08 * Math.sin(it.t * 9 + i * 2.1);
      q = P(0, SH.SHARD, px, py, pz); q.size = sz * k; q.size1 = q.size; q.life = life; q.fade = 60; q.rot = it.t * 2.5 + i; q.alpha = a; q.color = i & 1 ? C.DZ1 : C.DZ0; emitRaw(q);
      q = P(1, SH.GLOW, px, py, pz); q.size = sz * 2.3; q.size1 = q.size; q.life = life; q.fade = 60; q.alpha = 0.22 * a; q.color = C.GOLD; emitRaw(q);
    }
    it.acc += dt;
    if (it.acc > 0.12 && !it.dying) {   // a twinkle left behind on the orbit
      it.acc = 0;
      const ang = base + ((Math.random() * 5) | 0) * TAU / 5 - 0.3;
      twinkles(1, it.x + Math.cos(ang) * R, it.y, it.z + Math.sin(ang) * R, 0.08, null, 0.28);
    }
  }

  // ── Beam: soft vertical light column (loot, level-up) ──
  // The column starts above the item/hero (uCut, world metres) so the thing that dropped stays clearly visible, and the
  // body stays below the bloom threshold (uCol is hue-normalised in beam()); only the thin core may glow a little.
  const BEAM_VS = `attribute float aL; varying float vL, vY, vF, vR, vX;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec2 nh = normal.xz, vh = cameraPosition.xz - wp.xz;   // horizontal fresnel: same look at any camera pitch
      vF = dot(nh, nh) > 1e-6 && dot(vh, vh) > 1e-6 ? abs(dot(normalize(nh), normalize(vh))) : 1.0;
      vL = aL; vY = position.y; vR = length(position.xz); vX = position.x;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const BEAM_FS = `uniform vec3 uCol; uniform float uA, uT, uH, uCut; varying float vL, vY, vF, vR, vX;
    void main() {
      vec3 c;
      float F = clamp(vF, 0.0, 1.0);   // MSAA can extrapolate varyings past 0 at silhouettes: pow(<0) = NaN
      float y = clamp(vY, 0.0, 1.0), yw = y * uH;
      float low = smoothstep(uCut - 0.3, uCut + 0.35, yw);            // nothing in front of the dropped item
      float yr = clamp((yw - uCut) / max(uH - uCut, 0.3), 0.0, 1.0);   // 0 where the column starts, 1 at its top
      float top = (1.0 - yr) * smoothstep(1.0, 0.55, yr) * low;
      if (vL < 0.5) {
        c = uCol * pow(F, 1.6) * top * (0.8 + 0.2 * sin(y * 16.0 - uT * 6.0 + vX * 3.0)) * 0.4;
      } else if (vL < 1.5) {
        float m = max(max(uCol.r, uCol.g), uCol.b);
        c = mix(uCol, vec3(m), 0.35) * pow(F, 2.5) * top * top * 0.36;
      } else {
        float r = vR / 2.6;
        float e = (r - 0.42 - 0.05 * sin(uT * 3.0)) / 0.035, g = 0.3 * exp(-r * r * 7.0) + 0.5 * exp(-e * e);
        c = uCol * g * 0.7 * smoothstep(1.0, 0.8, r);
      }
      gl_FragColor = vec4(c * uA, 1.0);
      ${CHUNK_OUT}
    }`;
  let BEAM_GEO = null;
  function beamGeo() {
    const parts = [
      [new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0), 0],
      [new THREE.CylinderGeometry(0.22, 0.22, 1, 12, 1, true).translate(0, 0.5, 0), 1],
      [new THREE.CircleGeometry(2.6, 40).rotateX(-Math.PI / 2).translate(0, 0.012, 0), 2],
    ];
    const P3 = [], N3 = [], L1 = [];
    for (const [g0, l] of parts) {
      const g = g0.toNonIndexed(), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { P3.push(p.getX(i), p.getY(i), p.getZ(i)); N3.push(n.getX(i), n.getY(i), n.getZ(i)); L1.push(l); }
      g0.dispose(); g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N3, 3));
    g.setAttribute('aL', new THREE.Float32BufferAttribute(L1, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 3);
    return keep(g);
  }
  addPool('beam', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 }, uT: uTime, uH: { value: 3.5 }, uCut: { value: 1.1 }, uCol: { value: new THREE.Color() } },
      vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const it = { obj: fxMesh(BEAM_GEO, mat, 14), mat, on: false, gen: 0, t: 0 };
    it.kill = () => { it.dying = 1; };
    return it;
  });
  // opts (optional): {k: intensity multiplier (e.g. 0.5 for common loot), cut: world y where the column starts (default 1.1)}
  function beam(x, z, color, height = 3.5, dur = 0, opts = EMPTY) {
    if (!ready) init();
    const it = acquire('beam', 12), c = lin(color || '#fff2b0');
    // Hue-normalised: brightest channel 1, and pale/white colours dimmed by luminance (additive white washes out fastest).
    const mx = Math.max(c[0], c[1], c[2], 1e-3), lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const k = Math.min(1 / mx, 0.62 / Math.max(lum, 1e-3)) * (opts.k ?? 1);
    it.mat.uniforms.uCol.value.setRGB(c[0] * k, c[1] * k, c[2] * k);
    it.mat.uniforms.uH.value = height; it.mat.uniforms.uCut.value = opts.cut ?? 1.1;
    it.col = lin(color || '#fff2b0', 2.2 * Math.min(1, k * 1.3));
    it.h = height; it.rad = 0.26; it.acc = 0; it.dur = dur; it.cut = opts.cut ?? 1.1;
    it.obj.position.set(x, 0, z); it.obj.scale.set(it.rad, 0.01, it.rad);
    return handle(it, it.obj);
  }
  function stepBeam(it, dt) {
    it.t += dt;
    const u = it.mat.uniforms;
    if (it.dur > 0 && it.t > it.dur && !it.dying) it.dying = 1;
    let a = 1;
    if (it.dying) { it.dying -= dt / 0.3; if (it.dying <= 0) { release(it); return; } a = it.dying; }
    const grow = easeOut(Math.min(1, it.t / 0.35));
    it.obj.scale.set(it.rad * (1 + 0.25 * (1 - grow)), it.h * grow, it.rad * (1 + 0.25 * (1 - grow)));
    u.uH.value = Math.max(0.01, it.h * grow);
    u.uA.value = a * (0.92 + 0.08 * Math.sin(it.t * 5));
    it.acc += dt;
    if (it.acc > 0.12 && a > 0.5) {   // motes rising inside the column (start above the item)
      it.acc = 0;
      const p = it.obj.position, ang = Math.random() * TAU, r = Math.random() * 0.22;
      bx = p.x; by = 0; bz = p.z; bk = 1;
      const q = P(1, Math.random() < 0.6 ? SH.SPARK : SH.GLOW, p.x + Math.cos(ang) * r, it.cut * 0.85, p.z + Math.sin(ang) * r);
      q.vy = frand(1.2, 2.0); q.size = frand(0.14, 0.24); q.size1 = 0.04; q.life = frand(0.9, 1.3); q.flick = 16; q.rot = 0; q.color = it.col; emitRaw(q);
    }
  }

  // ── Lightning: camera-facing jagged ribbons, re-jittered for flicker ──
  const BOLT_VS = `attribute vec2 aUv; varying vec2 vUv; void main() { vUv = aUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const BOLT_FS = `uniform vec3 uCol; uniform float uA; varying vec2 vUv;
    void main() {
      float v = vUv.y, core = exp(-v * v * 26.0), glow = exp(-v * v * 3.0) * (1.0 - v * v);
      gl_FragColor = vec4((vec3(3.0) * core + uCol * glow * 2.1) * vUv.x * uA, 1.0);
      ${CHUNK_OUT}
    }`;
  const BOLT_CAP = 2400, BOLT_PTS = 16;
  const bPath = new Float32Array(3 * 260), bSide = new Float32Array(3 * 260);
  addPool('bolt', () => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(BOLT_CAP * 3), uv = new Float32Array(BOLT_CAP * 2);
    const aP = new THREE.BufferAttribute(pos, 3), aU = new THREE.BufferAttribute(uv, 2);
    aP.setUsage(THREE.DynamicDrawUsage); aU.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', aP); geo.setAttribute('aUv', aU); geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 }, uCol: { value: new THREE.Color() } },
      vertexShader: BOLT_VS, fragmentShader: BOLT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = fxMesh(geo, mat, 24); m.matrixAutoUpdate = false;
    return { obj: m, mat, geo, pos, uv, aP, aU, pts: new Float32Array(BOLT_PTS * 3), np: 0, on: false, gen: 0, t: 0, regen: 0, fl: 1 };
  });
  function ribbon(L, m, width, inten, nv, taper) {
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, pos = L.pos, uv = L.uv;
    for (let i = 0; i < m; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(m - 1, i + 1) * 3, o = i * 3;
      const tx = bPath[i1] - bPath[i0], ty = bPath[i1 + 1] - bPath[i0 + 1], tz = bPath[i1 + 2] - bPath[i0 + 2];
      const vx = cx - bPath[o], vy = cy - bPath[o + 1], vz = cz - bPath[o + 2];
      const sx = ty * vz - tz * vy, sy = tz * vx - tx * vz, sz = tx * vy - ty * vx;
      const tp = taper ? 1 - i / (m - 1) * 0.85 : (i === 0 || i === m - 1 ? 0.55 : 1);
      const w = width * 0.5 * tp / (Math.hypot(sx, sy, sz) || 1);
      bSide[o] = sx * w; bSide[o + 1] = sy * w; bSide[o + 2] = sz * w;
    }
    const put = (i, sgn, k) => {
      const o = i * 3, p = nv * 3;
      pos[p] = bPath[o] + bSide[o] * sgn; pos[p + 1] = bPath[o + 1] + bSide[o + 1] * sgn; pos[p + 2] = bPath[o + 2] + bSide[o + 2] * sgn;
      uv[nv * 2] = k; uv[nv * 2 + 1] = sgn; nv++;
    };
    for (let i = 0; i < m - 1; i++) {
      if (nv + 6 > BOLT_CAP) break;
      const k0 = taper ? inten * (1 - 0.6 * i / (m - 1)) : inten, k1 = taper ? inten * (1 - 0.6 * (i + 1) / (m - 1)) : inten;
      put(i, 1, k0); put(i, -1, k0); put(i + 1, 1, k1); put(i + 1, 1, k1); put(i, -1, k0); put(i + 1, -1, k1);
    }
    return nv;
  }
  function jag(ax, ay, az, bx2, by2, bz2, m, first, amp) {   // appends a jagged segment to bPath, returns new count
    const dx = bx2 - ax, dy = by2 - ay, dz = bz2 - az, len = Math.hypot(dx, dy, dz) || 1e-3;
    const n = Math.min(24, Math.max(3, Math.ceil(len / 0.3)));
    let p1x = dz, p1y = 0, p1z = -dx; let l1 = Math.hypot(p1x, p1z);
    if (l1 < 1e-4) { p1x = 1; p1z = 0; l1 = 1; }
    p1x /= l1; p1z /= l1;
    const p2x = (dy * p1z) / len, p2y = (dz * p1x - dx * p1z) / len, p2z = (-dy * p1x) / len;
    for (let k = first ? 0 : 1; k <= n && m < 258; k++) {
      const t = k / n, env = k === 0 || k === n ? 0 : Math.pow(Math.sin(Math.PI * t), 0.6);
      const r1 = (Math.random() * 2 - 1) * amp * env, r2 = (Math.random() * 2 - 1) * amp * env;
      bPath[m * 3] = ax + dx * t + p1x * r1 + p2x * r2; bPath[m * 3 + 1] = ay + dy * t + p1y * r1 + p2y * r2; bPath[m * 3 + 2] = az + dz * t + p1z * r1 + p2z * r2;
      m++;
    }
    return m;
  }
  const forkSrc = new Float32Array(3 * 260);
  function lightning(points, color = '#bfa8ff') {
    if (!ready) init();
    if (!points || points.length < 2) return;
    const L = acquire('bolt', 6), c = lin(color, 1.6);
    L.mat.uniforms.uCol.value.setRGB(c[0], c[1], c[2]);
    L.np = Math.min(BOLT_PTS, points.length);
    for (let i = 0; i < L.np; i++) { const p = points[i]; L.pts[i * 3] = p.x; L.pts[i * 3 + 1] = p.y; L.pts[i * 3 + 2] = p.z; }
    L.life = 0.3; L.regen = 0; L.fl = 1;
    boltRegen(L);
    const zo = { color };
    for (let i = 1; i < L.np; i++) burst('zap', L.pts[i * 3], L.pts[i * 3 + 1], L.pts[i * 3 + 2], zo);
    const mid = (L.np - 1) >> 1;
    lightFlash(L.pts[mid * 3], L.pts[mid * 3 + 2], color, 3, 0.25);
  }
  function boltRegen(L) {
    // main path is generated first into bPath; keep a copy for the forks
    const P3 = L.pts;
    let m = 0;
    for (let s = 0; s < L.np - 1; s++) {
      const o = s * 3, len = Math.hypot(P3[o + 3] - P3[o], P3[o + 4] - P3[o + 1], P3[o + 5] - P3[o + 2]);
      m = jag(P3[o], P3[o + 1], P3[o + 2], P3[o + 3], P3[o + 4], P3[o + 5], m, s === 0, Math.min(0.45, 0.12 + len * 0.06));
    }
    for (let i = 0, n = m * 3; i < n; i++) forkSrc[i] = bPath[i];
    let nv = ribbon(L, m, 0.62, 1, 0, false);
    const main = m, forks = main > 6 ? Math.min(4, 1 + ((main / 14) | 0)) : 0;
    for (let f = 0; f < forks; f++) {
      const i = 2 + ((Math.random() * (main - 4)) | 0), o = i * 3;
      const ax = forkSrc[o], ay = forkSrc[o + 1], az = forkSrc[o + 2];
      const tx = forkSrc[o + 3] - forkSrc[o - 3], ty = forkSrc[o + 4] - forkSrc[o - 2], tz = forkSrc[o + 5] - forkSrc[o - 1];
      const tl = Math.hypot(tx, ty, tz) || 1, flen = frand(0.6, 1.3);
      const fm = jag(ax, ay, az, ax + (tx / tl) * flen + frand(-0.7, 0.7), ay + (ty / tl) * flen + frand(-0.5, 0.3), az + (tz / tl) * flen + frand(-0.7, 0.7), 0, true, 0.16);
      nv = ribbon(L, fm, 0.34, 0.75, nv, true);
    }
    L.geo.setDrawRange(0, nv);
    upd(L.aP, nv * 3); upd(L.aU, nv * 2);
  }
  function stepBolt(L, dt) {
    L.t += dt;
    if (L.t >= L.life) { release(L); return; }
    L.regen -= dt;
    if (L.regen <= 0) { L.regen = 0.05; L.fl = frand(0.7, 1); boltRegen(L); }
    const t = L.t;
    L.mat.uniforms.uA.value = (t < 0.035 ? t / 0.035 : Math.pow(1 - (t - 0.035) / (L.life - 0.035), 1.4)) * L.fl;
  }

  // ── Broken oath shield: ash ribs, copper runes and moving fissures ──
  const SHIELD_VS = `varying vec3 vN, vV, vO;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vO = position; gl_Position = projectionMatrix * mv; }`;
  const SHIELD_FS = `uniform float uT, uA; varying vec3 vN, vV, vO;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      float f = clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), fr = pow(f, 2.2);
      float az = atan(vO.x, vO.z), stepY = floor(vO.y * 5.0);
      float crack = 1.0 - smoothstep(0.018, 0.07, abs(fract(az * 1.91 + stepY * 0.085) - 0.5));
      float seal = 1.0 - smoothstep(0.025, 0.085, abs(abs(vO.y) - 0.38));
      float teeth = step(0.52, fract(az * 2.55)) * (1.0 - smoothstep(0.12, 0.22, abs(abs(vO.y) - 0.38)));
      float pulse = 0.8 + 0.2 * sin(uT * 2.1 + az * 3.0);
      vec3 ash = vec3(0.33, 0.28, 0.41), copper = vec3(0.51, 0.29, 0.64);
      vec3 c = ash * (fr * 1.25 + 0.035) + copper * (crack * 0.5 + seal * 0.6 + teeth * 0.22) * pulse;
      if (gl_FrontFacing) c += vec3(0.65, 0.59, 0.48) * pow(max(dot(n, normalize(vec3(-0.45, 0.7, 0.55) + v)), 0.0), 90.0) * 0.25;
      else c *= 0.35;
      gl_FragColor = vec4(c * uA, 1.0);
      ${CHUNK_OUT}
    }`;
  addPool('shield', () => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: uTime, uA: { value: 1 } }, vertexShader: SHIELD_VS, fragmentShader: SHIELD_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const it = { obj: fxMesh(G.sphere(40), mat, 26), mat, on: false, gen: 0, t: 0, target: null, acc: 0 };
    it.kill = () => { it.dying = 1; };
    it.onRelease = () => { it.target = null; };
    return it;
  });
  function shield(obj) {
    if (!ready) init();
    const it = acquire('shield', 4);
    it.target = obj; it.acc = 0; it.obj.scale.setScalar(0.01);
    followPos(it, 0.8);
    return handle(it, it.obj);
  }
  function followPos(it, yOff) {
    const t = it.target;
    if (!t) return;
    if (t.isObject3D) t.getWorldPosition(_v); else _v.set(t.x || 0, t.y || 0, t.z || 0);
    it.obj.position.set(_v.x, _v.y + yOff, _v.z);
  }
  function stepShield(it, dt) {
    it.t += dt;
    followPos(it, 0.8);
    let s = backOut(Math.min(1, it.t / 0.3)), a = 1;
    if (it.dying) { it.dying -= dt / 0.28; if (it.dying <= 0) { release(it); return; } a = it.dying; s = 1 + (1 - it.dying) * 0.3; }
    const wob = 1 + Math.sin(it.t * 6) * 0.02;
    it.obj.scale.set(1.15 * s * wob, 1.05 * s / wob, 1.15 * s * wob);
    it.mat.uniforms.uA.value = a;
    it.acc += dt;
    if (it.acc > 0.12 && !it.dying) {
      it.acc = 0;
      const p = it.obj.position, u = Math.random() * TAU, v = frand(-0.3, 0.9);
      bx = p.x; by = p.y; bz = p.z; bk = 1;
      const q = P(1, SH.SPARK, p.x + Math.cos(u) * 1.15 * Math.sqrt(1 - v * v), p.y + v * 1.05, p.z + Math.sin(u) * 1.15 * Math.sqrt(1 - v * v));
      q.vy = 0.4; q.size = frand(0.22, 0.34); q.size1 = 0.04; q.life = 0.6; q.flick = 18; q.rot = 0; q.color = C.CONFG[(Math.random() * 6) | 0]; emitRaw(q);
    }
  }

  // ── Ice block around a frozen enemy ──
  let ICE_GEO = null, ICE_MAT = null;
  function iceGeo() {   // unit: radius ~0.62, height ~1 (clear rounded ice cube + crystal spikes)
    const k = new Kit(), rnd = mulberry32(11), ax = new THREE.Vector3(), q = new THREE.Quaternion();
    const tint = (x, y) => _c.setRGB(0.30 + 0.20 * sat(y), 0.23 + 0.18 * sat(y), 0.43 + 0.24 * sat(y));
    const spike = (x, y, z, w, h, tilt, yaw) => {
      ax.set(Math.cos(yaw), 0, -Math.sin(yaw)); q.setFromAxisAngle(ax, tilt);
      k.push([x, y, z], q);
      k.add(G.cyl(1, 1, 6), tint, [0, h * 0.5, 0], [0, yaw * 2, 0], [w, h, w]);
      k.add(G.cone(6), tint, [0, h + w * 0.7, 0], [0, yaw * 2, 0], [w, w * 1.4, w]);
      k.pop();
    };
    k.add(G.rbox(2), tint, [0, 0.5, 0], [0, 0.35, 0], [1.2, 1.0, 1.2]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rnd() * 0.5, r = 0.55 + rnd() * 0.1;
      spike(Math.sin(a) * r, 0, Math.cos(a) * r, 0.1 + rnd() * 0.07, 0.25 + rnd() * 0.35, 0.55 + rnd() * 0.35, a);
    }
    spike(0.18, 0.92, -0.1, 0.12, 0.22, 0.35, 2.2); spike(-0.2, 0.9, 0.12, 0.1, 0.16, 0.45, -1.1);
    return keep(k.build());
  }
  addPool('ice', () => {
    const it = { obj: fxMesh(ICE_GEO, ICE_MAT, 8), on: false, gen: 0, t: 0, target: null, acc: 0 };
    it.obj.renderOrder = 8;
    it.kill = () => {
      const p = it.obj.position;
      burst('ice', p.x, p.y + it.h * 0.45, p.z, { scale: Math.max(0.8, it.r * 1.1) });
      release(it);
    };
    it.onRelease = () => { it.target = null; };
    return it;
  });
  const _box = new THREE.Box3();
  function iceBlock(obj, radius = 0.6) {
    if (!ready) init();
    const it = acquire('ice', 16);
    it.target = obj; it.r = radius; it.acc = 0;
    let h = radius * 1.8;
    if (obj && obj.isObject3D) {
      try { _box.setFromObject(obj); if (!_box.isEmpty() && isFinite(_box.max.y)) h = clamp(_box.max.y - Math.max(0, _box.min.y), radius * 1.2, radius * 5); } catch (e) { /* keep default */ }
    }
    it.h = h;
    followPos(it, 0); it.obj.position.y = 0;
    it.obj.rotation.y = Math.random() * TAU;
    it.obj.scale.setScalar(0.01);
    burst('ice', it.obj.position.x, h * 0.5, it.obj.position.z, { count: 5, scale: 0.8 });
    return handle(it, it.obj);
  }
  function stepIce(it, dt) {
    it.t += dt;
    followPos(it, 0); it.obj.position.y = 0;
    const s = backOut(Math.min(1, it.t / 0.22));
    const sxz = it.r * 0.95 / 0.6, sy = it.h * 1.08;   // radius = block radius (GAME passes enemy r*1.25+0.15)
    it.obj.scale.set(sxz * s, sy * s, sxz * s);
    it.acc += dt;
    if (it.acc > 0.35) {   // occasional glint
      it.acc = 0;
      const p = it.obj.position, a = Math.random() * TAU;
      bx = p.x; by = 0; bz = p.z; bk = 1;
      const q = P(1, SH.SPARK, p.x + Math.sin(a) * it.r * 0.9, frand(0.3, 1) * it.h, p.z + Math.cos(a) * it.r * 0.9 + 0.1);
      q.size = frand(0.3, 0.45); q.size1 = 0.02; q.life = 0.45; q.rot = 0; q.spin = 2; q.color = C.ICEW; q.pop = 0.08; emitRaw(q);
    }
  }

  // ───────────────────────── Projectiles ─────────────────────────
  const PROJ = {
    magic: { core: 'comet', col: '#ad70ff', halo: 0.62, hk: 1.05, r: 0.14, hot: '#e6faff', hotK: 1.65 },
    crescent: { core: 'crescent', col: '#8aa995', halo: 1.2, hk: 0.7 },
    arcane: { core: 'arrow', col: '#ad758a', halo: 0.62, hk: 0.85 },
    star: { core: 'star', col: '#ffd23f', halo: 0.95, hk: 1.5 },
    spore: { core: 'puff', col: '#b8f050', halo: 0.62, hk: 1.3, r: 0.15 },
    ghost: { core: 'ball', col: '#b9a0ff', halo: 0.8, hk: 1.5, r: 0.15, hot: '#efe8ff', hotK: 1.6 },
    fire: { core: 'ball', col: '#ff7a1c', halo: 0.95, hk: 1.8, r: 0.14, hot: '#fff0a0', hotK: 3 },
    ice: { core: 'shard', col: '#93aaa9', halo: 0.72, hk: 1.4 },
    // The dragon now blows big glittery pink/purple bubbles (not fire): an iridescent shell around a saturated pink glow,
    // so it stays readable (and never a white blob).
    dragonfire: { core: 'lava', col: '#c04536', halo: 1.55, hk: 1.25, r: 0.46, halo2: '#c47a55', shadow: 2 },
    pet: { core: 'ball', col: '#ff9a3c', halo: 0.62, hk: 1.8, r: 0.1, hot: '#fff3c0', hotK: 3 },
    // Snail soap bubble: iridescent film, soft pastel halo, wobbles, pops with sparkles when it disappears.
    bubble: { core: 'jelly', col: '#63814c', halo: 0.95, hk: 0.8, r: 0.3, pop: 1 },
    // Round 3 (a boss in every zone + the volcano): Çürük Taç's glossy jiggly jelly blobs, Mezar Kazıcısı's tumbling dirt
    // clods, the lava turtle's glowing lava balls and the fire chick's little embers. shadow: 1 = soft
    // dark blob on the ground under it, 2 = warm light pool (both follow the projectile's height).
    jelly: { core: 'jelly', col: '#756043', halo: 0.95, hk: 0.42, r: 0.27, shadow: 1 },
    rock: { core: 'rock', col: '#9a6a44', haloCol: '#ffe2b8', halo: 0.85, hk: 0.3, r: 0.25, shadow: 1 },
    lavaball: { core: 'lava', col: '#ff8a2a', halo: 1.5, hk: 1.05, r: 0.3, halo2: '#ff9a30', shadow: 2 },
    ember: { core: 'ember', col: '#ff7a1c', halo: 0.8, hk: 0.95, r: 0.09, halo2: '#ffb040' },
    // Round 4 (Kefir Vadisi): the foam puffs' and the Kefir Devi's slow kefir bubble — a glossy bubble half full of pastel
    // kefir, fizzing inside; pops with sparkles by itself (popKind 'fizzPop') when GAME removes it. It must stay easy to
    // spot over the pale yogurt floor: tinted kefir, a pink-lilac film band with a berry outline (shader), a soft pink aura
    // drawn with normal blending (an additive glow vanishes on a bright floor) and a ground marker with a dark core and a
    // pink ring (shadow 3). haloA = the aura's opacity (normal blending).
    fizz: { core: 'fizz', col: '#a0a46d', haloCol: '#96875e', halo: 1.75, hk: 1, haloA: 0.45, r: 0.31, pop: 1, popKind: 'fizzPop', shadow: 3 },
    // Round 5 (Surlu Şehir): the Simitçi's simit — a toasty twisted sesame ring spinning flat like a frisbee, tipped toward the
    // camera so its hole always shows (it ends in GAME's 'crumbs', or FX 'simit' with sesame) — and the knight's lucky silver
    // horseshoe, lobbed as a mortar: it tumbles in the screen plane, rocking to flash its shine, and leaves a silver and gold
    // sparkle trail (it lands with FX 'horseshoe': a ring of sparkles). Both keep a soft dark blob on the floor (shadow 1).
    simit: { core: 'simit', col: '#d0842f', haloCol: '#ffe4b8', halo: 1.15, hk: 0.3, r: 0.37, shadow: 1 },
    horseshoe: { core: 'horseshoe', col: '#e8eef8', haloCol: '#f2f0ff', halo: 1.15, hk: 0.3, r: 0.38, shadow: 1 },
    // Round 6 (boss bonus games): the dragon's friendship heart — a puffy glossy pink heart that keeps facing the camera,
    // swaying and beating "ba-dum" (fresnel rim + a baked glint: 2 draw calls with its halo; no floor blob — GAME puts a
    // marker under it) — and the Kefir Devi's big soap bubble: radius 1 (GAME scales the group), an iridescent swirling film,
    // little bubbles drifting up inside it (drawn by the same shader: 1 draw call) and the pink-ringed floor blob (shadow 3).
    // Neither pops by itself: GAME bursts 'hearts' / 'sparkle' / 'bigPop' where it wants them.
    heart: { core: 'heart', col: '#ad4944', halo: 1.35, hk: 0.85, r: 0.36 },
    bigbubble: { core: 'soap', col: '#99a578', halo: 0, r: 1, shadow: 3, shadowK: 2.2 },
  };
  // Last colour GAME asked for per kind: FX.trail(kind, x, y, z) has no colour, so the trail matches the projectile.
  const lastCol = {};
  // Lava ball: molten sphere in object space — bright cracks flowing between warm orange crust plates, hot glowing rim.
  const LAVA_VS = `varying vec3 vO, vN, vV;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vO = position; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
  const LAVA_FS = `uniform float uT; uniform vec3 uHot, uMid, uCrust; varying vec3 vO, vN, vV;
    float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vn(vec3 x) {
      vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
    }
    void main() {
      vec3 p = vO * 2.6 + vec3(0.0, -uT * 0.9, uT * 0.35);
      float n = vn(p) * 0.65 + vn(p * 2.3 + 7.1) * 0.35;
      float crust = smoothstep(0.5, 0.66, n), crack = 1.0 - smoothstep(0.0, 0.07, abs(n - 0.5));
      vec3 c = mix(uMid, uCrust, crust);
      c = mix(c, uHot, crack * 0.9);
      float f = clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
      c = mix(c, uHot * 0.8, pow(f, 2.5) * 0.6);
      c *= 0.92 + 0.08 * sin(uT * 7.0 + vO.y * 5.0);
      gl_FragColor = vec4(c, 1.0);
      ${CHUNK_OUT}
    }`;
  function lavaMat(col) {
    const h = lin('#ffd24a', 1.9), m = hueNorm(lin(col), 1.05), k = lin('#b8401a', 0.6);
    return new THREE.ShaderMaterial({ uniforms: { uT: uTime, uHot: { value: new THREE.Color(h[0], h[1], h[2]) }, uMid: { value: new THREE.Color(m[0], m[1], m[2]) },
      uCrust: { value: new THREE.Color(k[0], k[1], k[2]) } }, vertexShader: LAVA_VS, fragmentShader: LAVA_FS });
  }
  let ROCK_GEO = null, EMBER_GEO = null, SIMIT_GEO = null, SHOE_GEO = null, SHADOW_GEO = null, SHADOW_DARK = null, SHADOW_GLOW = null, SHADOW_FIZZ = null;
  function rockGeo() {   // soft lumpy dirt clod (radius ~1) with a few pebbles stuck in it
    const base = new THREE.IcosahedronGeometry(1, 3), p = base.attributes.position, v = new THREE.Vector3(), key = [], nrm = new Map();
    const lump = (x, y, z) => 0.74 + 0.3 * vnoise(x * 2.1 + 5, z * 2.1 + y * 1.7) + 0.16 * vnoise(x * 5.3 + 1, y * 5.3 - z * 2.6);
    for (let i = 0; i < p.count; i++) {   // displaced along the normal by smooth noise (same corner → same spot)
      v.fromBufferAttribute(p, i);
      key[i] = Math.round(v.x * 1e3) + ',' + Math.round(v.y * 1e3) + ',' + Math.round(v.z * 1e3);
      const s = lump(v.x, v.y, v.z);
      p.setXYZ(i, v.x * s, v.y * s * 0.84, v.z * s);
    }
    base.computeVertexNormals();   // flat face normals (non-indexed) → averaged per corner for a smooth clod
    const n = base.attributes.normal;
    for (let i = 0; i < p.count; i++) { const a = nrm.get(key[i]) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); nrm.set(key[i], a); }
    for (let i = 0; i < p.count; i++) { const a = nrm.get(key[i]), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    const cD = new THREE.Color('#4e3122'), cM = new THREE.Color('#7a5236'), cL = new THREE.Color('#9c7048'), t = new THREE.Color();
    const k = new Kit();
    k.add(base, (x, y, z) => t.copy(cD).lerp(cM, sat(0.5 + y * 0.55)).lerp(cL, sat((vnoise(x * 3.1 + 3, z * 3.1 + y * 2.3) - 0.55) * 2.4)));
    k.add(G.dodeca(), '#a8a29a', [0.66, 0.26, 0.5], [0.4, 0.7, 0.1], 0.22);
    k.add(G.dodeca(), '#8f8a84', [-0.72, -0.08, 0.42], [1.1, 0.2, 0.5], 0.17);
    k.add(G.dodeca(), '#c8a070', [-0.2, -0.52, -0.7], [0.3, 1.2, 0.2], 0.19);
    k.add(G.dodeca(), '#b0a498', [0.1, 0.7, -0.35], [0.9, 0.4, 1.3], 0.14);
    const g = k.build();
    base.dispose();
    return keep(g);
  }
  function emberGeo() {   // teardrop: round nose toward +z (the flight direction), tail tapering toward -z
    const pts = [];
    for (let i = 0; i <= 14; i++) { const y = -2.4 + (2.4 * i) / 14; pts.push(new THREE.Vector2(Math.pow((y + 2.4) / 2.4, 1.5), y)); }
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a))); }
    pts[pts.length - 1].x = 0;
    const g = new THREE.LatheGeometry(pts, 12);
    g.rotateX(Math.PI / 2);
    return keep(g);
  }
  function weldN(g) {   // smooth vertex normals across the seams of a displaced geometry (same corner → one normal)
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, key = [], acc = new Map();
    for (let i = 0; i < p.count; i++) {
      key[i] = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
      const a = acc.get(key[i]) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(key[i], a);
    }
    for (let i = 0; i < p.count; i++) { const a = acc.get(key[i]), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    return g;
  }
  // Simit (unit: outer radius ≈ 1, flat in XZ): a two-strand dough rope twisted round the ring — toasty grooves, golden
  // ridges — dotted with cream sesame seeds lying on its top and sides. One merged vertex-coloured mesh.
  function simitGeo() {
    // A serrated execution wheel replaces the sesame bread projectile. One merged mesh.
    const ring = new THREE.TorusGeometry(0.67, 0.115, 8, 32).rotateX(-Math.PI / 2), k = new Kit();
    k.add(ring, '#777c7d');
    k.add(ring, '#5d4f49', [0,0,0], null, [0.65,0.65,0.65]);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      k.add(G.cone(4), i & 1 ? '#b6b7a9' : '#979b98', [Math.sin(a)*.82,0,Math.cos(a)*.82], [Math.PI/2,a+.32,0], [.16,.38,.065]);
      k.add(G.sphere(6,4), '#ad8063', [Math.sin(a)*.67,.095,Math.cos(a)*.67], null, [.034,.03,.034]);
    }
    const g = k.build();
    ring.dispose();
    return keep(g);
  }
  // Horseshoe (unit: outer radius ≈ 1, in the XY plane facing +z, opening down): a chunky rounded silver band over a 290° arc
  // (a little wider at the toe) with a soft groove along both faces, round knobs at the heels and three gold studs a side.
  function shoeGeo() {
    const R = 0.74, HW = 0.22, HT = 0.12, A = 2.52, NA = 44, NS = 16, pos = [], idx = [];
    for (let i = 0; i <= NA; i++) {
      const a = -A + 2 * A * i / NA, sx = Math.sin(a), cy = Math.cos(a), hw = HW * (1 + 0.12 * cy);   // a = 0 at the top (the toe)
      for (let j = 0; j < NS; j++) {
        const b = j / NS * TAU, cb = Math.cos(b), sb = Math.sin(b);
        const ex = Math.sign(cb) * Math.pow(Math.abs(cb), 0.55), ez = Math.sign(sb) * Math.pow(Math.abs(sb), 0.55);   // rounded rectangle
        pos.push(sx * (R + ex * hw), cy * (R + ex * hw), ez * HT);
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NS; j++) {
      const a = i * NS + j, b = i * NS + (j + 1) % NS, c = a + NS, d = b + NS;
      idx.push(a, b, c, b, d, c);
    }
    const band = new THREE.BufferGeometry();
    band.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); band.setIndex(idx); band.computeVertexNormals();
    const cS = new THREE.Color('#eef2fa'), cD = new THREE.Color('#aab6ca'), t = new THREE.Color(), k = new Kit();
    k.add(band, (x, y, z) => { const e = (Math.hypot(x, y) - R) / 0.07; return t.copy(cS).lerp(cD, 0.6 * Math.exp(-e * e) * sstep(0.75, 0.97, Math.abs(z) / HT)); });
    for (const s of [-1, 1]) {
      k.add(G.sphere(16), '#eef2fa', [s * Math.sin(A) * R, Math.cos(A) * R, 0], 0, [HW * 1.12, HW * 1.12, HT * 1.25]);   // heel knobs
      for (const a of [0.62, 1.3, 1.98]) for (const f of [-1, 1]) k.add(G.sphere(10), '#ffc43a', [s * Math.sin(a) * R, Math.cos(a) * R, f * (HT - 0.012)], 0, [0.058, 0.058, 0.036]);
    }
    const g = k.build();
    band.dispose();
    return keep(g);
  }
  // Cartoon chrome (the horseshoe): the view-space reflection picks a banded sky — light blue above, a bright white horizon
  // line, a warm dusky ground below — so the silver reads as SHINY at any light and the bands slide over it as it tumbles;
  // vertex colours tint it (gold studs, the darker groove), plus a white fresnel rim and a crisp top-left glint.
  const CHROME_VS = `varying vec3 vN, vV, vC;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vC = color; gl_Position = projectionMatrix * mv; }`;
  const CHROME_FS = `uniform vec3 uSky, uHor, uGnd; varying vec3 vN, vV, vC;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV), r = reflect(-v, n);
      float y = r.y + 0.12 * r.x + 0.04;
      vec3 env = y > 0.0 ? mix(uHor, uSky, smoothstep(0.0, 0.5, y)) : mix(uHor * 0.82, uGnd, smoothstep(0.16, 0.38, -y));
      env += vec3(0.5) * exp(-y * y / 0.002);
      float f = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.6);
      vec3 c = env * vC + vec3(0.55) * f;
      float h = max(dot(n, normalize(vec3(-0.45, 0.7, 0.55) + v)), 0.0);
      c += vec3(1.3) * smoothstep(0.986, 0.996, h) + vec3(0.18) * pow(h, 24.0);
      gl_FragColor = vec4(c, 1.0);
      ${CHUNK_OUT}
    }`;
  function chromeMat() {
    const C3 = (h, k) => { const a = lin(h, k); return new THREE.Color(a[0], a[1], a[2]); };
    return new THREE.ShaderMaterial({ uniforms: { uSky: { value: C3('#cadcff', 0.95) }, uHor: { value: C3('#ffffff', 1.05) }, uGnd: { value: C3('#665760', 1) } },
      vertexShader: CHROME_VS, fragmentShader: CHROME_FS, vertexColors: true });
  }
  // Iridescent soap-film shell (additive): nearly clear in the middle, pastel rainbow at the rim, two glossy glints.
  const BUB_VS = `varying vec3 vN, vV, vO, vW;
    void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vec4 mv = viewMatrix * wp;
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vO = position; vW = wp.xyz; gl_Position = projectionMatrix * mv; }`;
  const BUB_FS = `uniform float uT; uniform vec3 uTint; varying vec3 vN, vV, vO, vW;
    vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      float f = clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), fr = f * f;
      float h = fract(f * 1.2 + vO.y * 0.55 + (vW.x - vW.z) * 0.12 + uT * 0.22 + 0.08 * sin(vO.x * 6.0 + uT * 1.9));
      vec3 film = mix(vec3(1.0), hue(h), 0.62);
      film = mix(film, uTint, 0.3);
      vec3 c = film * (0.07 + fr * 1.3);
      if (gl_FrontFacing) {
        c += vec3(pow(max(dot(n, normalize(vec3(-0.45, 0.7, 0.55) + v)), 0.0), 140.0) * 1.7);
        c += vec3(pow(max(dot(n, normalize(vec3(0.5, -0.45, 0.7) + v)), 0.0), 36.0) * 0.3);
      } else c *= 0.45;
      gl_FragColor = vec4(c, 1.0);
      ${CHUNK_OUT}
    }`;
  function bubbleMat(tint) {
    return new THREE.ShaderMaterial({ uniforms: { uT: uTime, uTint: { value: new THREE.Color(tint) } }, vertexShader: BUB_VS, fragmentShader: BUB_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  }
  // Kefir bubble (Round 4): a glossy bubble half full of pastel kefir. Below the sloshing kefir line the kefir shows through
  // the film (top-left shading into a deeper cool belly, beads of fizz rising, a bright meniscus under the line); above it you
  // look through the pink-tinted dome onto the kefir's lighter top surface (ray/plane hit in object space: vC = camera in
  // object space), where little fizz bubbles appear and pop. The kid must spot and dodge it over the pale yogurt floor, so
  // the edge reads like a cartoon bubble: a shimmering pink ↔ lilac film band, a crisp berry outline (both measured in
  // screen-radius terms, rho, so they stay a few pixels wide at gameplay zoom), a round white glint and a small second one.
  // Normal blending, body colours under 1 (only the glint blooms).
  const FIZZ_VS = `varying vec3 vN, vV, vO, vC;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vO = position;
      vC = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
      gl_Position = projectionMatrix * mv; }`;
  const FIZZ_FS = `uniform float uT; uniform vec3 uCream, uShade, uTop, uLine, uDome, uFilmA, uFilmB; varying vec3 vN, vV, vO, vC;
    vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
    float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float beads(vec3 p) {   // one little ring-shaped bubble in about half the cells of a 3D grid
      vec3 ci = floor(p), cf = fract(p) - 0.5;
      float r = h3(ci);
      vec3 o = vec3(h3(ci + 3.1), h3(ci + 7.7), h3(ci + 1.9)) - 0.5;
      float d = length(cf - o * 0.5), rr = 0.1 + 0.1 * r;
      return step(0.5, r) * (smoothstep(rr + 0.05, rr, d) - 0.55 * smoothstep(rr - 0.02, rr - 0.08, d));
    }
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      float nd = clamp(dot(n, v), 0.0, 1.0), rho = sqrt(1.0 - nd * nd);   // rho ≈ distance from the centre in bubble radii on screen
      vec3 L = normalize(vec3(-0.45, 0.7, 0.55));
      float lev = 0.06 + 0.07 * sin(vO.x * 2.6 + uT * 3.3) + 0.045 * sin(vO.z * 3.4 - uT * 2.4);
      vec3 rd = normalize(vO - vC);
      vec3 col; float a;
      if (vO.y < lev) {
        float lam = clamp(dot(n, L) * 0.55 + 0.45, 0.0, 1.0);
        col = mix(uShade, uCream, smoothstep(0.1, 0.95, lam));
        col += 0.12 * beads(vO * 4.2 - vec3(0.0, uT * 1.1, 0.0)) * nd;
        col = mix(col, uTop, exp(-(lev - vO.y) * 26.0) * 0.8);
        a = 0.97;
      } else {
        float t = (lev - vC.y) / min(rd.y, -1e-3);
        vec3 hp = vC + rd * t;
        if (rd.y < -0.02 && dot(hp, hp) < 0.97) {
          float e = dot(hp.xz, hp.xz) / max(1e-3, 0.97 - lev * lev);
          col = uTop * (0.95 + 0.05 * sin(hp.x * 7.0 + uT * 3.0) * sin(hp.z * 6.0 - uT * 2.0));
          col += 0.3 * beads(vec3(hp.x * 4.0, uT * 0.7, hp.z * 4.0));
          col = mix(col, uShade, smoothstep(0.35, 1.0, e) * 0.5);
          a = 0.93;
        } else { col = uDome; a = 0.4; }
        col = mix(col, uDome, 0.08);   // seen through the pink-tinted dome
      }
      col *= 0.74 + 0.34 * clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);   // round: lighter top-left, deeper bottom-right
      // film band toward the edge: pink ↔ lilac shimmer with a hint of rainbow, then the berry outline
      float band = smoothstep(0.6, 0.78, rho);
      float sw = 0.5 + 0.5 * sin(rho * 9.0 + vO.y * 3.2 + vO.x * 1.7 + uT * 1.8);
      vec3 film = mix(uFilmA, uFilmB, sw);
      col = mix(col, film, band * 0.92); a = max(a, band * 0.94);
      float line = smoothstep(0.86, 0.93, rho);
      col = mix(col, uLine, line); a = max(a, line);
      // round cartoon glint top-left (blooms a little), a soft sheen around it and a small glint bottom-right
      float h1 = max(dot(n, normalize(L + v)), 0.0), h2 = max(dot(n, normalize(vec3(0.5, -0.45, 0.7) + v)), 0.0);
      float s1 = smoothstep(0.972, 0.988, h1), s2 = smoothstep(0.986, 0.995, h2);
      col = mix(col, vec3(1.4), s1) + vec3(0.22) * pow(h1, 24.0) * (1.0 - s1);
      col = mix(col, vec3(1.0), s2 * 0.75);
      a = max(a, max(s1, s2 * 0.8));
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      ${CHUNK_OUT}
    }`;
  // col = GAME's shot colour: it tints the kefir (clearly: a pastel of it, so the bubble never melts into the pale yogurt
  // floor; creamy/white colours fall back to lilac), shading into a deeper, cooler belly. The film band (pink ↔ lilac),
  // the berry outline, the dome tint and the halo are the bubble's own colours, the same for every shot colour.
  const FIZZ_CREAM = '#b2aa80', FIZZ_LILAC = '#899373', FIZZ_FILM_A = '#a09b6c', FIZZ_FILM_B = '#8d7065', FIZZ_LINE = '#534e40', FIZZ_DOME = '#a39c87';
  function fizzMat(col) {
    let t = hueNorm(lin(col), 0.95);
    const sat = 1 - Math.min(t[0], t[1], t[2]) / Math.max(t[0], t[1], t[2], 1e-4);
    if (sat < 0.35) { const l = hueNorm(lin(FIZZ_LILAC), 0.95), w = 1 - sstep(0.15, 0.35, sat); t = t.map((v, i) => v + (l[i] - v) * w); }
    const k = lin(FIZZ_CREAM, 0.95), mixc = (a, b, w) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * w);
    // mid-tone pastels (brightest channel ≈ 0.7-0.8): brighter ones get washed out to white by the tone mapping
    const c = mixc(k, t, 0.75).map(v => v * 0.86), tp = mixc(k, t, 0.9).map(v => v * 0.8), lil = hueNorm(lin(FIZZ_LILAC), 0.95);
    const sh = mixc(t, lil, 0.35).map(v => v * 0.5), C3 = a => new THREE.Color(a[0], a[1], a[2]);
    return new THREE.ShaderMaterial({ uniforms: { uT: uTime, uCream: { value: C3(c) }, uShade: { value: C3(sh) }, uTop: { value: C3(tp) },
      uLine: { value: new THREE.Color(FIZZ_LINE) }, uDome: { value: new THREE.Color(FIZZ_DOME) },
      uFilmA: { value: new THREE.Color(FIZZ_FILM_A) }, uFilmB: { value: new THREE.Color(FIZZ_FILM_B) } },
      vertexShader: FIZZ_VS, fragmentShader: FIZZ_FS, transparent: true, depthWrite: false });
  }
  // Puffy heart (unit: ~2 wide, facing +z): a sphere whose outline is pushed out to the classic heart curve (polar radius table
  // round the heart's middle), flattened to a chubby cushion that is thicker in the lobes than at the tip. Smooth normals.
  let HEART_GEO = null;
  function heartGeo() {
    const g = new THREE.OctahedronGeometry(1, 0);
    g.scale(0.7, 1.1, 0.4);
    return keep(g);
  }
  // Glossy candy heart: pink standard material, soft pink emissive (never dull in a dark cave), a white-pink fresnel rim and a
  // crisp baked glint on the upper-left lobe (view-space half vector: no extra mesh).
  function heartMat(col) {
    const c = new THREE.Color(col), m = stdMat({ color: c, emissive: c.clone().multiplyScalar(0.5), emissiveIntensity: 0.4, roughness: 0.25, metalness: 0, envMapIntensity: 0.6 });
    rimify(m, 0xc69b82, 0.8, 2.2);
    return patchMat(m, { key: 'glint',
      fOut: 'outgoingLight += vec3(1.35) * smoothstep(0.972, 0.99, max(dot(normal, normalize(vec3(-0.45, 0.7, 0.55) + normalize(vViewPosition))), 0.0));' });
  }
  // Big soap bubble (Round 6, radius 1 in object space): mostly clear (you see the floor through it) with swirling thin-film
  // rainbow colours that thicken into a strong iridescent band at the edge, a lilac cartoon outline (reads on the pale kefir
  // floor), a round window glint and a crescent reflection; 5 little bubbles drift up inside it (ray-sphere hits in object
  // space: parallax without extra meshes), each with its own rainbow rim and glint. Normal blending, glints bloom.
  const SOAP_FS = `uniform float uT; uniform vec3 uTint, uLine; varying vec3 vN, vV, vO, vC;
    vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      float nd = clamp(dot(n, v), 0.0, 1.0), rho = sqrt(1.0 - nd * nd);
      vec3 rd = normalize(vO - vC);
      vec3 mc = vec3(0.0); float ma = 0.0, best = 1e3;
      for (int i = 0; i < 5; i++) {
        float fi = float(i), k = fract(uT * 0.11 + fi * 0.23);
        float rs = (0.1 + 0.04 * mod(fi * 2.0, 3.0)) * sin(3.1415927 * k);
        vec3 c = vec3(0.42 * sin(fi * 2.4 + uT * 0.5), mix(-0.5, 0.5, k), 0.38 * cos(fi * 1.7 + uT * 0.4));
        vec3 oc = vC - c; float b = dot(oc, rd), h = b * b - dot(oc, oc) + rs * rs;
        if (h > 0.0) {
          float t = -b - sqrt(h);
          if (t > 0.0 && t < best) {
            best = t;
            vec3 ns = (oc + rd * t) / rs; float rim = 1.0 - abs(dot(ns, rd));
            float pupil = (1.0 - smoothstep(0.04, 0.1, abs(ns.x))) * (1.0 - smoothstep(0.72, 0.86, abs(ns.y)));
            mc = mix(vec3(0.75,0.66,0.4),vec3(0.035,0.045,0.035),pupil) * (0.6 + 0.4 * rim); ma = 0.75 + 0.2 * rim;
            float gl = smoothstep(0.9, 0.97, max(dot(ns, normalize(vec3(-0.5, 0.7, 0.5) - rd)), 0.0));
            mc = mix(mc, vec3(1.3), gl); ma = max(ma, gl);
          }
        }
      }
      float sw = sin(vO.x * 3.1 + uT * 0.9) + sin(vO.y * 4.3 - uT * 0.7 + vO.z * 2.0) + sin(vO.z * 3.7 + vO.x * 1.3 + uT * 1.1);
      vec3 film = mix(uTint * 0.55, vec3(0.35,0.19,0.13), 0.35 + 0.2 * sin(sw));
      float veins = pow(max(0.0, sin(vO.x * 13.0 + vO.z * 7.0 + sw * 0.6)), 16.0);
      film += vec3(0.2,0.12,0.06) * veins;
      float band = smoothstep(0.5, 0.9, rho);
      float fa = 0.07 + 0.1 * smoothstep(0.3, 1.0, 0.5 + 0.5 * sin(sw * 1.7)) + 0.72 * band;
      vec3 fc = film * (0.72 + 0.32 * band);
      float a = fa + ma * (1.0 - fa);
      vec3 col = (fc * fa + mc * ma * (1.0 - fa)) / max(a, 1e-3);
      float line = smoothstep(0.9, 0.955, rho);
      col = mix(col, uLine, line); a = max(a, line * 0.95);
      vec3 L = normalize(vec3(-0.45, 0.7, 0.55));
      float s1 = smoothstep(0.955, 0.975, max(dot(n, normalize(L + v)), 0.0));
      float cres = smoothstep(0.64, 0.72, rho) * (1.0 - smoothstep(0.8, 0.86, rho)) * smoothstep(0.25, 0.6, n.x - n.y);
      col = mix(col, vec3(1.5), s1); a = max(a, s1);
      col = mix(col, vec3(1.15), cres * 0.8); a = max(a, cres * 0.75);
      gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      ${CHUNK_OUT}
    }`;
  function soapMat(col) {
    const t = hueNorm(lin(col), 0.95);
    return new THREE.ShaderMaterial({ uniforms: { uT: uTime, uTint: { value: new THREE.Color(t[0], t[1], t[2]) }, uLine: { value: new THREE.Color('#6f7251') } },
      vertexShader: FIZZ_VS, fragmentShader: SOAP_FS, transparent: true, depthWrite: false });
  }
  const projMats = new Map(), projs = [];
  let STAR_GEO = null, SHARD_GEO = null, CRESCENT_GEO = null;
  function starGeo() {
    // Four hooked execution blades around a central rune; no toy star silhouette.
    const shape=new THREE.Shape(), pts=[[0,1],[.18,.25],[.8,.48],[.25,.08],[1,-.12],[.26,-.25],[.48,-.8],[.08,-.25],[-.12,-1],[-.25,-.26],[-.8,-.48],[-.25,-.08],[-1,.12],[-.26,.25],[-.48,.8],[-.08,.25]];
    pts.forEach((v,i)=>i?shape.lineTo(v[0],v[1]):shape.moveTo(v[0],v[1]));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1});g.center();
    return keep(g);
  }
  function projMat(key, make) { let m = projMats.get(key); if (!m) { m = keep(make()); projMats.set(key, m); } return m; }
  function projectile(kind, color) {
    if (!ready) init();
    const D = PROJ[kind] || PROJ.star, col = color || D.col, g = new THREE.Group();
    g.name = 'fxProj';
    if (color && PROJ[kind]) lastCol[kind] = color;
    let core, glint = null;
    if (D.core === 'jelly') {   // translucent glossy shell, a lighter candy heart inside, a glint that keeps facing the camera
      const cc = new THREE.Color(col), lite = cc.clone().lerp(new THREE.Color('#ffffff'), 0.45), deep = cc.clone().multiplyScalar(0.55);
      const m = projMat('jelly|' + col, () => rimify(stdMat({ color: cc, emissive: deep, emissiveIntensity: 0.6, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.58, envMapIntensity: 0.6 }),
        lite, 0.5, 2.6));
      core = new THREE.Mesh(G.sphere(28), m); core.scale.setScalar(D.r);
      const im = new THREE.Mesh(G.sphere(16), projMat('jellyIn|' + col, () => glowMat(cc, 0.8)));
      im.scale.setScalar(0.6); im.position.y = -0.12; core.add(im);
      // the glint is drawn after the shell (not dimmed by it); only the half poking out of the surface shows
      glint = new THREE.Mesh(G.sphere(10), projMat('glint', () => glowMat('#ffffff', 1.5, { transparent: true }))); glint.scale.set(0.24, 0.17, 0.1); glint.renderOrder = 25; core.add(glint);
    } else if (D.core === 'rock') {
      const m = projMat('rock', () => {
        const o = { roughness: 1 }, D0 = typeof TEX !== 'undefined' && TEX && TEX.dirt && TEX.dirt.normalMap ? TEX.dirt.normalMap : null;
        if (D0) { o.normalMap = D0; o.normalScale = new THREE.Vector2(0.8, 0.8); }   // grainy earth detail (shared texture, 1 tile per clod)
        return rimify(vcMat(o), 0xffe0b8, 0.28, 2.6);
      });
      core = new THREE.Mesh(ROCK_GEO, m); core.scale.setScalar(D.r); core.castShadow = false;
    } else if (D.core === 'fizz') {
      core = new THREE.Mesh(G.sphere(24), projMat('fizz|' + col, () => fizzMat(col))); core.scale.setScalar(D.r); core.renderOrder = 24;
    } else if (D.core === 'heart') {
      core = new THREE.Mesh(HEART_GEO, projMat('heart|' + col, () => heartMat(col))); core.scale.setScalar(D.r);
    } else if (D.core === 'soap') {
      core = new THREE.Mesh(G.sphere(40), projMat('soap|' + col, () => soapMat(col))); core.scale.setScalar(D.r); core.renderOrder = 24;
    } else if (D.core === 'simit') {   // glossy molasses glaze: a little shine and a warm rim so it reads on the honey cobbles
      core = new THREE.Mesh(SIMIT_GEO, projMat('simit', () => rimify(vcMat({ roughness: 0.36, envMapIntensity: 0.75 }), 0xffe2b0, 0.35, 2.4)));
      core.scale.setScalar(D.r);
    } else if (D.core === 'horseshoe') {   // polished cartoon silver with gold studs
      core = new THREE.Mesh(SHOE_GEO, projMat('horseshoe', chromeMat)); core.scale.setScalar(D.r);
    } else if (D.core === 'lava') {
      core = new THREE.Mesh(G.sphere(24), projMat('lava|' + col, () => lavaMat(col))); core.scale.setScalar(D.r);
    } else if (D.core === 'ember') {   // hot yellow heart inside an additive orange flame teardrop
      core = new THREE.Mesh(EMBER_GEO, projMat('emberShell|' + col, () => glowMat(col, 1.2, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
      core.scale.setScalar(D.r); core.renderOrder = 23;
      const hot = new THREE.Mesh(G.sphere(12), projMat('ball|#ffe08a|1.9', () => glowMat('#ffe08a', 1.9)));
      hot.scale.setScalar(0.6); hot.position.z = 0.12; core.add(hot);
    } else if (D.core === 'comet') {
      // A round pearl with two orbiting motes and a short taper: stronger than a spark, unlike the long arrow skill.
      core = new THREE.Group();
      const heart = new THREE.Mesh(G.sphere(12), projMat('wandPearl', () => glowMat('#e6faff', 1.65)));
      heart.scale.setScalar(0.14); core.add(heart);
      const tail = new THREE.Mesh(G.sphere(12), projMat('wandTail|' + col, () => glowMat(col, 1.05)));
      tail.scale.set(0.075, 0.075, 0.28); tail.position.z = -0.21; core.add(tail);
      for (let i = 0; i < 2; i++) {
        const mote = new THREE.Mesh(G.sphere(8), projMat('wandMote', () => glowMat('#b5f7ff', 1.25)));
        mote.scale.setScalar(0.055); core.add(mote);
      }
    } else if (D.core === 'crescent') {
      if (!CRESCENT_GEO) {
        CRESCENT_GEO = keep(new THREE.RingGeometry(0.58, 0.78, 32, 1, 0, Math.PI).rotateX(Math.PI / 2));
        const p = CRESCENT_GEO.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
          const nr = 0.58 + (r > 0.68 ? 0.2 : -0.035) * Math.sin(a);
          p.setXYZ(i, x * nr / r, 0, z * nr / r);
        }
      }
      core = new THREE.Mesh(CRESCENT_GEO, projMat('crescent|' + col, () => glowMat(col, 1.65, { side: THREE.DoubleSide })));
    } else if (D.core === 'arrow') {
      // A long crystal arrow with swept fins: readable even beside the tiny round wand spark.
      core = new THREE.Group();
      const m = projMat('arrow|' + col, () => rimify(stdMat({ color: col, emissive: col, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.25 }), 0xfff1bd, 0.55, 2));
      const head = new THREE.Mesh(G.octa(), m); head.scale.set(0.2, 0.13, 0.48); head.position.z = 0.18; core.add(head);
      const shaft = new THREE.Mesh(G.sphere(12), projMat('arrowShaft', () => glowMat('#ffe5a0', 1.2)));
      shaft.scale.set(0.045, 0.045, 0.43); shaft.position.z = -0.28; core.add(shaft);
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(G.octa(), m); fin.scale.set(0.075, 0.055, 0.25);
        fin.rotation.y = side * 0.7; fin.position.set(side * 0.13, 0, -0.43); core.add(fin);
      }
    } else if (D.core === 'star') {
      const m = projMat('star|' + col, () => rimify(stdMat({ color: col, emissive: col, emissiveIntensity: 0.75, roughness: 0.25, metalness: 0.2 }), 0xffffff, 0.8, 2.0));
      core = new THREE.Mesh(STAR_GEO, m); core.scale.setScalar(0.28);
    } else if (D.core === 'shard') {
      const m = projMat('shard|' + col, () => rimify(stdMat({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.2, flatShading: true }), 0xffffff, 0.9, 1.6));
      core = new THREE.Mesh(G.octa(), m); core.scale.set(0.15, 0.36, 0.15);
    } else if (D.core === 'puff') {
      const m = projMat('puff|' + col, () => stdMat({ color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.5 }));
      core = new THREE.Mesh(G.ico(2), m); core.scale.setScalar(D.r);
    } else if (D.core === 'bubble') {
      core = new THREE.Mesh(G.sphere(24), projMat('bubble|' + col, () => bubbleMat(col))); core.scale.setScalar(D.r);
      core.renderOrder = 24;
      if (D.inner) {   // glowing heart inside the big dragon bubble
        const im = new THREE.Mesh(G.sphere(16), projMat('ball|' + D.inner + '|' + D.innerK, () => glowMat(D.inner, D.innerK)));
        im.scale.setScalar(D.innerR); g.add(im);
      }
    } else {
      const m = projMat('ball|' + col, () => glowMat(D.hot || col, D.hotK || 2.5));
      core = new THREE.Mesh(G.sphere(16), m); core.scale.setScalar(D.r);
    }
    g.add(core);
    const hc = color && D.haloFromCol ? color : D.haloCol || col;
    const hm = !(D.halo > 0) ? null : D.haloA   // normal-blended aura (reads on bright floors) vs the usual additive glow
      ? projMat('haloN|' + hc + '|' + D.haloA, () => new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(hc), opacity: D.haloA, depthWrite: false, transparent: true }))
      : projMat('halo|' + hc + '|' + D.hk, () => new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(hc).multiplyScalar(D.hk), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    let halo = null, halo2 = null, shadow = null;
    if (D.halo > 0) { halo = new THREE.Sprite(hm); halo.scale.setScalar(D.halo); g.add(halo); }
    if (D.halo2) {
      const hm2 = projMat('halo|' + D.halo2 + '|2', () => new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(D.halo2).multiplyScalar(1.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo2 = new THREE.Sprite(hm2); halo2.scale.setScalar(D.halo * 0.6); g.add(halo2);
    }
    if (D.shadow) {   // ground marker: kept on the floor under the projectile by stepProjs (starts at the usual flight height)
      shadow = new THREE.Mesh(SHADOW_GEO, D.shadow === 2 ? SHADOW_GLOW : D.shadow === 3 ? SHADOW_FIZZ : SHADOW_DARK);
      shadow.scale.setScalar(D.r * (D.shadowK || (D.shadow === 2 ? 5.5 : D.shadow === 3 ? 3.8 : 3.4))); shadow.position.y = 0.035 - 0.85; shadow.renderOrder = 9; g.add(shadow);
    }
    g.userData.fxp = { kind, core, halo, halo2, hs: D.halo, cs: core.scale.x, t: Math.random() * 10, seen: false, age: 0, star: D.core === 'star', shard: D.core === 'shard',
      bub: D.core === 'bubble', pop: D.pop || 0, popKind: D.popKind || 'bubblePop', popCol: color || null, lp: D.pop ? new THREE.Vector3() : null,
      look: D.core, glint, shadow, ss: shadow ? shadow.scale.x : 0, glow: D.shadow === 2, reg: true };
    g.addEventListener('added', projAdded);
    projs.push(g);
    return g;
  }
  // GAME may keep a projectile in its own pool (the big bubble, the hearts): taken out of the scene it leaves the registry,
  // and when it is added again it comes back (animated, floor blob placed) instead of standing still.
  function projAdded(e) {
    const g = e.target, u = g.userData.fxp;
    if (u && !u.reg) { u.reg = true; u.seen = false; u.age = 0; projs.push(g); }
  }
  function inScene(o) { while (o.parent) o = o.parent; return o === scene; }
  function stepProjs(dt) {
    for (let i = projs.length - 1; i >= 0; i--) {
      const g = projs[i], u = g.userData.fxp;
      if (!g.parent || !inScene(g)) {   // removed by GAME (hit / swatted / expired), or a warm-up copy never shown in play
        u.age += dt;
        if (u.seen || u.age > 3) {
          if (u.seen && u.pop) burst(u.popKind, u.lp.x, u.lp.y, u.lp.z, { scale: u.pop, color: u.popCol });   // bubbles always pop
          u.reg = false; projs[i] = projs[projs.length - 1]; projs.pop();
        }
        continue;
      }
      u.seen = true; u.t += dt;
      if (u.lp) g.getWorldPosition(u.lp);
      if (u.halo) u.halo.scale.setScalar(u.hs * (1 + Math.sin(u.t * 9) * 0.08 + Math.sin(u.t * 23) * 0.04));
      if (u.halo2) u.halo2.scale.setScalar(u.hs * 0.6 * (1 + Math.sin(u.t * 13 + 1) * 0.1));
      if (u.star) {   // face the camera and spin like a thrown star
        g.getWorldQuaternion(_q).invert();
        u.core.quaternion.copy(_q).multiply(camera.quaternion).multiply(_q2.setFromAxisAngle(ZAX, -u.t * 9));
      } else if (u.look === 'comet') {
        for (let j = 2; j < 4; j++) {
          const a = u.t * 14 + j * Math.PI;
          u.core.children[j].position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, -0.08);
        }
      } else if (u.shard) { u.core.rotation.y += dt * 7; u.core.rotation.z = 0.5; }
      else if (u.bub) {   // soap film wobble + gentle bob
        const w = Math.sin(u.t * 7.3) * 0.07, w2 = Math.sin(u.t * 5.1 + 1.3) * 0.05;
        u.core.scale.set(u.cs * (1 + w), u.cs * (1 - w + w2), u.cs * (1 + w2)); u.core.position.y = Math.sin(u.t * 3.1) * 0.05;
      } else if (u.look === 'jelly') {   // jiggly squash & stretch, a little hop; the glint stays top-left toward the camera
        const w = Math.sin(u.t * 9.5) * 0.12, w2 = Math.sin(u.t * 6.3 + 1.1) * 0.06;
        u.core.scale.set(u.cs * (1 + w), u.cs * (1 - w * 1.1 + w2), u.cs * (1 + w2)); u.core.position.y = Math.abs(Math.sin(u.t * 4.2)) * 0.06;
        if (u.glint) {
          g.getWorldQuaternion(_q).invert();
          u.glint.position.set(-0.4, 0.52, 0.75).applyQuaternion(camera.quaternion).applyQuaternion(_q).multiplyScalar(0.97);
          u.glint.quaternion.copy(_q).multiply(camera.quaternion);
        }
      } else if (u.look === 'fizz') {   // soft wobble + a slow bob (the kefir inside sloshes in the shader)
        const w = Math.sin(u.t * 6.1) * 0.06, w2 = Math.sin(u.t * 4.3 + 1.1) * 0.045;
        u.core.scale.set(u.cs * (1 + w), u.cs * (1 - w + w2), u.cs * (1 + w2)); u.core.position.y = Math.sin(u.t * 2.7) * 0.05;
      } else if (u.look === 'simit') {   // spins flat like a thrown ring, tipped toward the camera (the hole shows), wobbling a little
        g.getWorldQuaternion(_q).invert();
        _q2.setFromEuler(_eu.set(0.36 + 0.12 * Math.sin(u.t * 5.3), 0, 0.14 * Math.sin(u.t * 3.7)));
        u.core.quaternion.copy(_q).multiply(_q2).multiply(_q3.setFromAxisAngle(UP, u.t * 11));
      } else if (u.look === 'horseshoe') {   // tumbles in the screen plane (the U always shows), rocking so the silver flashes
        g.getWorldQuaternion(_q).invert();
        _q2.setFromEuler(_eu.set(0.24 * Math.sin(u.t * 4.1), 0.6 * Math.sin(u.t * 2.9), 0));
        u.core.quaternion.copy(_q).multiply(camera.quaternion).multiply(_q2).multiply(_q3.setFromAxisAngle(ZAX, -u.t * 8));
      } else if (u.look === 'heart') {   // faces the camera, sways and tilts a little, beats "ba-dum" once a second, bobs
        g.getWorldQuaternion(_q).invert();
        _q2.setFromEuler(_eu.set(0.1 * Math.sin(u.t * 2.3), 0.38 * Math.sin(u.t * 1.9), 0.12 * Math.sin(u.t * 1.6)));
        u.core.quaternion.copy(_q).multiply(camera.quaternion).multiply(_q2);
        const ph = (u.t / 1.1) % 1, d1 = (ph - 0.1) / 0.055, d2 = (ph - 0.3) / 0.055, beat = 1 + 0.1 * Math.exp(-d1 * d1) + 0.06 * Math.exp(-d2 * d2);
        u.core.scale.setScalar(u.cs * beat); u.core.position.y = Math.sin(u.t * 2.6) * 0.04;
        if (u.halo) u.halo.scale.setScalar(u.hs * (0.94 + 0.5 * (beat - 1)));
      } else if (u.look === 'soap') {   // big soft wobble of the film, slow
        const w = Math.sin(u.t * 4.1) * 0.045, w2 = Math.sin(u.t * 3.3 + 1.3) * 0.035;
        u.core.scale.set(u.cs * (1 + w), u.cs * (1 - w + w2), u.cs * (1 + w2));
      } else if (u.look === 'rock') { u.core.rotation.x += dt * 7; u.core.rotation.z = Math.sin(u.t * 3) * 0.35; }   // tumbling clod
      else if (u.look === 'lava') { u.core.rotation.y += dt * 1.4; u.core.scale.setScalar(u.cs * (1 + Math.sin(u.t * 11) * 0.04)); }
      else if (u.look === 'ember') {   // flickering flame
        u.core.scale.set(u.cs * (1 + Math.sin(u.t * 31) * 0.12), u.cs * (1 + Math.sin(u.t * 23 + 1) * 0.12), u.cs * (1 + Math.sin(u.t * 27 + 2) * 0.16));
      } else u.core.scale.setScalar(u.cs * (1 + Math.sin(u.t * 21) * 0.07));
      if (u.shadow) {   // stay on the floor under the projectile: smaller and fainter-looking the higher it flies
        g.getWorldPosition(_v);
        const h = Math.max(0, _v.y), sy = g.scale.y || 1;
        u.shadow.position.set(0, (0.035 - _v.y) / sy, 0);
        u.shadow.scale.setScalar(u.ss * (u.glow ? clamp(1.3 - 0.09 * h, 0.55, 1.3) : clamp(1.15 - 0.12 * h, 0.45, 1.1)));
      }
    }
  }
  // color (optional): the projectile's colour (else the last colour FX.projectile got for this kind, else the default).
  function trail(kind, x, y, z, color) {
    if (!ready) init();
    bx = x; by = y; bz = z; bk = 1;
    let q;
    switch (kind) {
      case 'jelly': {   // glossy drips that plop onto the floor and fade there, now and then a tiny sparkle
        const c = lin(color || lastCol.jelly || C.JELLY);
        if (Math.random() < 0.3) {
          q = P(0, SH.DOT, x + frand(-0.1, 0.1), y - 0.14, z + frand(-0.1, 0.1)); q.vx = frand(-0.3, 0.3); q.vy = frand(-0.3, 0.3); q.vz = frand(-0.3, 0.3);
          q.grav = 8; q.bounce = 0.1; q.size = frand(0.07, 0.12); q.size1 = q.size * 0.7; q.life = frand(0.9, 1.3); q.fade = 3; q.pop = 0.08; q.color = c; emitRaw(q);
        }
        if (Math.random() < 0.15) {
          q = P(1, SH.SPARK, x + frand(-0.2, 0.2), y + frand(-0.15, 0.2), z + frand(-0.2, 0.2)); q.vy = frand(0.1, 0.4);
          q.size = frand(0.12, 0.2); q.size1 = 0.02; q.life = frand(0.35, 0.5); q.flick = 18; q.rot = 0; q.color = hueNorm(c, 2.2); emitRaw(q);
        }
        break;
      }
      case 'rock':   // earth crumbs trickle off the tumbling clod, a faint dust wisp
        if (Math.random() < 0.35) {
          q = P(0, Math.random() < 0.5 ? SH.SQUARE : SH.DOT, x + frand(-0.12, 0.12), y + frand(-0.1, 0.1), z + frand(-0.12, 0.12)); q.vx = frand(-0.5, 0.5); q.vy = frand(0, 0.8); q.vz = frand(-0.5, 0.5);
          q.grav = 10; q.bounce = 0.3; q.size = frand(0.05, 0.09); q.life = frand(0.5, 0.8); q.spin = frand(-8, 8); q.fade = 4; q.color = C.ROCKC[(Math.random() * 3) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.12) { q = P(0, SH.SMOKE, x, y, z); q.vy = 0.2; q.size = 0.22; q.size1 = 0.6; q.life = 0.6; q.alpha = 0.35; q.fade = 2; q.spin = frand(-1, 1); q.color = C.DIRTDUST; emitRaw(q); }
        break;
      case 'lavaball':   // flame licks, embers, now and then a molten drip and a light puff
        q = P(1, SH.FLAME, x + frand(-0.06, 0.06), y + frand(-0.05, 0.05), z + frand(-0.06, 0.06)); q.vy = frand(0.3, 0.8);
        q.size = frand(0.42, 0.58); q.size1 = 0.1; q.life = frand(0.22, 0.34); q.rot = frand(-0.3, 0.3); q.alpha = 0.42; q.color = C.LFL0; q.color1 = C.LFL1; emitRaw(q);
        if (Math.random() < 0.55) {
          q = P(1, SH.GLOW, x + frand(-0.2, 0.2), y + frand(-0.15, 0.15), z + frand(-0.2, 0.2)); radial(q, 0.2, 0.9, 0.4, 1.4);
          q.wob = 0.6; q.flick = 14; q.size = frand(0.07, 0.12); q.size1 = 0.02; q.life = frand(0.6, 1.0); q.color = C.EMB0; q.color1 = C.EMB1; emitRaw(q);
        }
        if (Math.random() < 0.18) {
          q = P(0, SH.DOT, x + frand(-0.15, 0.15), y - 0.1, z + frand(-0.15, 0.15)); q.vx = frand(-0.4, 0.4); q.vy = frand(-0.5, 0.3); q.vz = frand(-0.4, 0.4);
          q.grav = 9; q.bounce = 0.15; q.size = frand(0.07, 0.11); q.size1 = q.size * 0.6; q.life = frand(0.6, 0.9); q.fade = 3; q.color = C.LAVA0; q.color1 = C.LAVA2; emitRaw(q);
        }
        if (Math.random() < 0.1) {
          q = P(0, SH.SMOKE, x, y + 0.1, z); q.vy = 0.5; q.size = 0.3; q.size1 = 0.9; q.life = 0.8; q.alpha = 0.3; q.fade = 2; q.spin = frand(-1, 1); q.color = C.ASH; emitRaw(q);
        }
        break;
      case 'ember':   // a short glowing tail and tiny crackling sparks
        q = P(1, SH.GLOW, x + frand(-0.03, 0.03), y + frand(-0.03, 0.03), z + frand(-0.03, 0.03)); q.vy = frand(0.1, 0.4);
        q.size = 0.24; q.size1 = 0.05; q.life = frand(0.2, 0.3); q.alpha = 0.35; q.color = C.LFL0; q.color1 = C.LFL1; emitRaw(q);
        if (Math.random() < 0.3) {
          q = P(1, SH.SPARK, x + frand(-0.08, 0.08), y + frand(-0.05, 0.08), z + frand(-0.08, 0.08)); q.vx = frand(-0.5, 0.5); q.vy = frand(0.2, 0.9); q.vz = frand(-0.5, 0.5);
          q.size = frand(0.1, 0.16); q.size1 = 0.02; q.life = frand(0.3, 0.5); q.flick = 20; q.rot = frand(-0.3, 0.3); q.color = C.EMB0; emitRaw(q);
        }
        break;
      case 'fizz': {   // tiny cream beads and pastel baby bubbles wobbling up behind it, pastel glitter now and then
        const tc = color || lastCol.fizz, tint = tc ? hueNorm(lin(tc), 0.97) : null;
        if (Math.random() < 0.4) {
          const bead = Math.random() < 0.5;
          q = P(0, bead ? SH.DOT : SH.RING, x + frand(-0.2, 0.2), y + frand(-0.18, 0.1), z + frand(-0.2, 0.2)); q.vx = frand(-0.15, 0.15); q.vy = frand(0.3, 0.7); q.vz = frand(-0.15, 0.15);
          q.grav = -1; q.wob = 0.5; q.soft = 1; q.size = bead ? frand(0.05, 0.08) : frand(0.08, 0.13); q.size1 = q.size * 1.25; q.life = frand(0.5, 0.8); q.fade = 6; q.pop = 0.1;
          q.color = bead ? tint || C.KEFIRB[(Math.random() * 4) | 0] : C.KEFR[(Math.random() * 5) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.25) {
          q = P(1, SH.SPARK, x + frand(-0.25, 0.25), y + frand(-0.2, 0.2), z + frand(-0.25, 0.25)); q.vy = frand(0.1, 0.4);
          q.size = frand(0.12, 0.2); q.size1 = 0.02; q.life = frand(0.35, 0.55); q.flick = 18; q.rot = 0; q.color = C.KEFG[(Math.random() * 5) | 0]; emitRaw(q);
        }
        break;
      }
      case 'simit':   // sesame seeds and toasty crumbs trickle off the spinning ring, now and then a golden twinkle
        if (Math.random() < 0.35) {
          const sd = Math.random() < 0.6;
          q = P(0, sd ? SH.PETAL : SH.DOT, x + frand(-0.22, 0.22), y + frand(-0.1, 0.08), z + frand(-0.22, 0.22)); q.vx = frand(-0.4, 0.4); q.vy = frand(0.2, 0.9); q.vz = frand(-0.4, 0.4);
          q.grav = 10; q.bounce = 0.3; q.size = sd ? frand(0.07, 0.1) : frand(0.05, 0.08); q.life = frand(0.6, 0.9); q.spin = frand(-10, 10); q.fade = 4;
          q.color = sd ? C.SESAME : C.SIMITC[(Math.random() * 5) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.12) twinkles(1, x, y, z, 0.2, C.GOLD, 0.28);
        break;
      case 'horseshoe': {   // a sparkle trail: silver and gold twinkles hanging in the air behind it, a soft silver glow, and
        // little solid gold / sky-blue stars among them (they still show over the pale plaza, where the additive ones fade)
        const tc = color || lastCol.horseshoe;
        q = P(1, SH.GLOW, x + frand(-0.04, 0.04), y + frand(-0.04, 0.04), z + frand(-0.04, 0.04)); q.size = 0.4; q.size1 = 0.08; q.life = 0.24; q.alpha = 0.28; q.color = C.SILVG; emitRaw(q);
        if (Math.random() < 0.8) {
          const st = Math.random() < 0.3, gd = Math.random() < 0.45;
          q = P(st ? 0 : 1, st ? SH.STAR : SH.SPARK, x + frand(-0.3, 0.3), y + frand(-0.26, 0.26), z + frand(-0.3, 0.3)); q.vx = frand(-0.3, 0.3); q.vy = frand(-0.1, 0.35); q.vz = frand(-0.3, 0.3);
          q.drag = 1.5; q.size = st ? frand(0.15, 0.2) : frand(0.26, 0.36); q.size1 = 0.04; q.life = frand(0.5, 0.75); q.pop = 0.06; q.flick = st ? 0 : frand(14, 22);
          q.rot = frand(-0.3, 0.3); q.spin = st ? frand(-5, 5) : 0;
          q.color = st ? (gd ? C.SHOEG : C.SHOEB) : gd ? C.GOLD : tc && Math.random() < 0.5 ? hueNorm(lin(tc), 2.4) : C.SILV; emitRaw(q);
        }
        break;
      }
      case 'heart':   // little pink hearts drifting up behind it, and pink twinkles
        if (Math.random() < 0.35) {
          q = P(0, SH.SHARD, x + frand(-0.18, 0.18), y + frand(-0.15, 0.1), z + frand(-0.18, 0.18)); q.vx = frand(-0.2, 0.2); q.vy = frand(0.25, 0.6); q.vz = frand(-0.2, 0.2);
          q.wob = 0.6; q.grav = -0.2; q.drag = 1; q.size = frand(0.13, 0.2); q.size1 = q.size * 0.6; q.life = frand(0.6, 0.9); q.pop = 0.1; q.fade = 2.5; q.rot = frand(-0.35, 0.35);
          q.color = C.HEARTS[(Math.random() * 4) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.3) {
          q = P(1, SH.SPARK, x + frand(-0.25, 0.25), y + frand(-0.2, 0.2), z + frand(-0.25, 0.25)); q.vy = frand(0.1, 0.4);
          q.size = frand(0.14, 0.22); q.size1 = 0.02; q.life = frand(0.35, 0.55); q.flick = 18; q.rot = 0; q.color = C.PINKG; emitRaw(q);
        }
        break;
      case 'bigbubble':   // pastel glitter round the big bubble, now and then a baby bubble floating off
        if (Math.random() < 0.5) {
          q = P(1, SH.SPARK, x + frand(-0.7, 0.7), y + frand(-0.6, 0.6), z + frand(-0.7, 0.7)); q.vy = frand(0.1, 0.4);
          q.size = frand(0.16, 0.26); q.size1 = 0.02; q.life = frand(0.4, 0.6); q.flick = 18; q.rot = 0; q.color = C.PASTELG[(Math.random() * C.PASTELG.length) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.12) {
          q = P(0, SH.RING, x + frand(-0.5, 0.5), y + frand(-0.4, 0.3), z + frand(-0.5, 0.5)); q.vy = frand(0.3, 0.6); q.grav = -0.6; q.wob = 0.5; q.soft = 1;
          q.size = frand(0.12, 0.2); q.size1 = q.size * 1.2; q.life = frand(0.7, 1.0); q.fade = 5; q.pop = 0.12; q.color = C.KEFR[(Math.random() * 5) | 0]; emitRaw(q);
        }
        break;
      case 'star': burst('star', x, y, z); break;
      case 'spore':
        q = P(0, SH.DOT, x, y, z); q.vx = frand(-0.2, 0.2); q.vy = frand(0.1, 0.4); q.vz = frand(-0.2, 0.2); q.size = frand(0.1, 0.16); q.size1 = 0.03; q.life = 0.5; q.color = C.SPORE; emitRaw(q);
        if (Math.random() < 0.5) { q = P(1, SH.GLOW, x, y, z); q.size = 0.35; q.size1 = 0.1; q.life = 0.3; q.alpha = 0.5; q.color = C.SPOREG; emitRaw(q); }
        break;
      case 'magic':
        q = P(1, SH.GLOW, x, y, z); q.size = 0.23; q.size1 = 0.025; q.life = 0.22; q.alpha = 0.6; q.color = lastCol.magic || C.W2; emitRaw(q);
        if (Math.random() < 0.45) {
          q = P(1, SH.SPARK, x + frand(-0.13, 0.13), y + frand(-0.13, 0.13), z);
          q.size = 0.12; q.size1 = 0; q.life = 0.28; q.color = '#a68bb7'; q.vy = 0.3; emitRaw(q);
        }
        break;
      case 'crescent':
        q = P(1, SH.SPARK, x + frand(-0.4, 0.4), y, z + frand(-0.4, 0.4));
        q.size = 0.2; q.size1 = 0; q.life = 0.28; q.color = '#8aa995'; emitRaw(q);
        break;
      case 'arcane':
        q = P(1, SH.SPARK, x, y, z); q.size = 0.23; q.size1 = 0.035; q.life = 0.28; q.alpha = 0.8; q.color = '#ad758a'; emitRaw(q);
        if (Math.random() < 0.35) twinkles(1, x, y, z, 0.12, '#ffe6a0', 0.3);
        break;
      case 'ghost':
        q = P(0, SH.SMOKE, x, y, z); q.vy = 0.2; q.size = 0.3; q.size1 = 0.7; q.life = 0.55; q.alpha = 0.35; q.spin = frand(-1, 1); q.color = C.GHOST; emitRaw(q);
        if (Math.random() < 0.3) twinkles(1, x, y, z, 0.1, C.PURP, 0.3);
        break;
      case 'ice':
        q = P(1, SH.GLOW, x, y, z); q.size = 0.4; q.size1 = 0.1; q.life = 0.3; q.alpha = 0.6; q.color = C.ICEG; emitRaw(q);
        if (Math.random() < 0.4) { q = P(0, SH.SHARD, x, y, z); q.vy = 0.3; q.size = 0.16; q.size1 = 0.04; q.life = 0.4; q.spin = 6; q.color = C.ICE; emitRaw(q); }
        break;
      case 'bubble':   // pastel glitter + now and then a tiny baby bubble
        if (Math.random() < 0.45) {
          q = P(1, SH.SPARK, x + frand(-0.22, 0.22), y + frand(-0.2, 0.2), z + frand(-0.22, 0.22)); q.vy = frand(0.1, 0.4);
          q.size = frand(0.12, 0.2); q.size1 = 0.02; q.life = frand(0.35, 0.55); q.flick = 18; q.rot = 0; q.alpha = 0.85;
          q.color = C.PASTELG[(Math.random() * C.PASTELG.length) | 0]; emitRaw(q);
        }
        if (Math.random() < 0.06) {
          q = P(1, SH.RING, x + frand(-0.15, 0.15), y, z + frand(-0.15, 0.15)); q.vy = frand(0.3, 0.6); q.wob = 0.5;
          q.size = frand(0.1, 0.16); q.life = frand(0.6, 0.9); q.alpha = 0.8; q.fade = 3; q.color = C.BUBW; emitRaw(q);
        }
        break;
      case 'dragonfire':   // pink/purple glitter and little bubbles (the dragon blows bubbles now, not fire)
        q = P(1, Math.random() < 0.55 ? SH.SPARK : SH.STAR, x + frand(-0.3, 0.3), y + frand(-0.3, 0.3), z + frand(-0.3, 0.3));
        q.vx = frand(-0.4, 0.4); q.vy = frand(0.1, 0.6); q.vz = frand(-0.4, 0.4); q.size = frand(0.18, 0.3); q.size1 = 0.03; q.life = frand(0.4, 0.6);
        q.flick = 16; q.spin = frand(-5, 5); q.color = C.GLITTER[(Math.random() * C.GLITTER.length) | 0]; emitRaw(q);
        if (Math.random() < 0.18) {
          q = P(1, SH.RING, x + frand(-0.25, 0.25), y + frand(-0.2, 0.2), z + frand(-0.25, 0.25)); q.vy = frand(0.3, 0.7); q.wob = 0.6;
          q.size = frand(0.14, 0.26); q.life = frand(0.6, 0.9); q.alpha = 0.85; q.fade = 3; q.color = C.PASTELG[(Math.random() * 3) | 0]; emitRaw(q);
        }
        break;
      case 'fire': case 'pet': {
        const big = kind === 'pet' ? 0.6 : 1;
        q = P(1, SH.FLAME, x + frand(-0.05, 0.05) * big, y, z + frand(-0.05, 0.05) * big); q.vy = frand(0.4, 0.9); q.size = 0.45 * big; q.size1 = 0.08; q.life = frand(0.25, 0.4);
        q.rot = frand(-0.3, 0.3); q.color = C.FIRE0; q.color1 = C.FIRE1; emitRaw(q);
        if (Math.random() < 0.3) { q = P(1, SH.GLOW, x, y, z); radial(q, 0.3, 0.8, 0.5, 1.2); q.size = 0.1 * big; q.life = 0.6; q.flick = 14; q.color = C.ORG; emitRaw(q); }
        break;
      }
      default: burst('sparkle', x, y, z, { count: 1 });
    }
  }

  // ───────────────────────── Floating text (DOM) ─────────────────────────
  const TXT = [], TXT_N = 30;
  let txtLayer = null, flashDiv = null;
  const TXT_STYLE = {
    dmg: { cls: 'ft-dmg', life: 0.85, rise: 1.2, drift: 0.35 },
    crit: { cls: 'ft-crit', life: 1.15, rise: 1.5, drift: 0.2, rot: 10 },
    heal: { cls: 'ft-heal', life: 1.1, rise: 1.4, drift: 0.2, plus: true },
    gold: { cls: 'ft-gold', life: 1.0, rise: 1.3, drift: 0.2, plus: true },
    xp: { cls: 'ft-xp', life: 1.2, rise: 1.6, drift: 0.15, plus: true },
    word: { cls: 'ft-word', life: 0.95, rise: 0.9, drift: 0.3, rot: 14 },
  };
  const WORD_COLS = ['#bb7863', '#c59774', '#afa398', '#927e78'];
  function burstPoly() {   // four execution blades around the critical-hit seal
    return 'polygon(50% 0%,62% 24%,88% 12%,76% 38%,100% 50%,76% 62%,88% 88%,62% 76%,50% 100%,38% 76%,12% 88%,24% 62%,0% 50%,24% 38%,12% 12%,38% 24%)';
  }
  function initText() {
    if (typeof document === 'undefined' || !document.body) return;
    const st = document.createElement('style');
    st.id = 'fxTextStyle';
    st.textContent = `
#fxText{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:4;user-select:none;-webkit-user-select:none}
#fxText .ft{position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;will-change:transform,opacity;--o:#2b1747;--f:#fff;--h:#fff;
  font:900 34px/1 "Avenir Next Rounded","Arial Rounded MT Bold","Nunito","Avenir Next","Trebuchet MS",system-ui,sans-serif;letter-spacing:.01em}
#fxText .ft b,#fxText .ft i{display:block;font:inherit;font-style:normal;padding:0 .12em}
#fxText .ft b{color:var(--o);-webkit-text-stroke:.24em var(--o);text-shadow:0 .1em 0 var(--o),0 .18em .28em rgba(30,10,50,.4)}
#fxText .ft i{position:absolute;left:0;top:0;color:var(--f);background:linear-gradient(180deg,var(--h) 8%,var(--f) 66%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
#fxText .ft-heal{--f:#a0ac7f;--h:#d8d0b5;--o:#303827;font-size:32px}
#fxText .ft-gold{--f:#cda875;--h:#e0ccac;--o:#423021;font-size:28px}
#fxText .ft-xp{--f:#9570a8;--h:#c9b5d7;--o:#2e203c;font-size:24px}
#fxText .ft-word{--h:#d9c6cb;font-size:44px}
#fxText .ft-crit{--f:#bd908f;--h:#e3cfc7;--o:#2b1626;font-size:52px}
#fxText .ft-crit::before{content:"";position:absolute;left:50%;top:50%;width:2.3em;height:2.3em;margin:-1.15em 0 0 -1.15em;z-index:-1;
  background:radial-gradient(circle,#672c3b 0,#361d2d 64%,#97645b 100%);clip-path:${burstPoly()};-webkit-clip-path:${burstPoly()};opacity:.92}
#fxFlash{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3;opacity:0}`;
    document.head.appendChild(st);
    txtLayer = document.createElement('div'); txtLayer.id = 'fxText';
    for (let i = 0; i < TXT_N; i++) {
      const el = document.createElement('div'), b = document.createElement('b'), f = document.createElement('i');
      b.setAttribute('aria-hidden','true');
      el.className = 'ft'; el.appendChild(b); el.appendChild(f); txtLayer.appendChild(el);
      TXT.push({ el, b, f, on: false, t: 0, life: 1, x: 0, y: 0, z: 0, rise: 1, rot: 0, t0: 0, dx: 0,
        st: 'dmg', num: null, ox: 0, oy: 0, oz: 0, w: 0, h: 0, lift: 0, side: 0, bump: 0, sx: 0, sy: 0 });
    }
    document.body.appendChild(txtLayer);
    if (!POST.on) {
      flashDiv = document.createElement('div'); flashDiv.id = 'fxFlash';
      document.body.appendChild(flashDiv);
    }
  }
  // Screen box (CSS px at scale 1) estimated from the font size: no layout reads.
  const TXT_FS = { dmg: 34, crit: 52, heal: 32, gold: 28, xp: 24, word: 44 };
  function textBox(it, s) {
    let fs = TXT_FS[it.st] || 34;
    it.viewW = innerWidth || 1;
    if (it.st === 'word') fs = Math.min(fs, Math.max(1, it.viewW - 32) / ((0.72 * s.length + 0.8) * 1.15));
    it.el.style.fontSize = it.st === 'word' ? fs.toFixed(2) + 'px' : '';
    it.w = fs * ((it.st === 'word' ? 0.72 : 0.6) * s.length + (it.st === 'word' ? 0.8 : 0.4)); it.h = fs * 1.08;
    if (it.st === 'crit') { it.w = Math.max(it.w, fs * 1.75); it.h = fs * 1.55; }   // POW starburst
  }
  const TXT_MERGE_T = 0.35, TXT_MERGE_D = 0.75, TXT_DMG_MAX = 6;
  function floatText(x, y, z, text, style = 'dmg') {
    if (!ready) init();
    if (!TXT.length) return;
    const st = TXT_STYLE[style] ? style : 'dmg', S = TXT_STYLE[st];
    let s = String(text);
    const num = st === 'dmg' && /^\d+$/.test(s) ? +s : null;
    let it = null, nDmg = 0, oldDmg = null;
    for (const t of TXT) {
      if (!t.on || t.st !== 'dmg') continue;
      // several hits on the same target within a moment → one summed number
      if (num !== null && t.num !== null && clock - t.t0 < TXT_MERGE_T && Math.abs(t.ox - x) < TXT_MERGE_D && Math.abs(t.oz - z) < TXT_MERGE_D && Math.abs(t.oy - y) < 1) {
        t.num += num; s = String(t.num);
        t.b.textContent = s; t.f.textContent = s; textBox(t, s); t.bump = 1;
        return;
      }
      nDmg++;
      if (!oldDmg || t.t0 < oldDmg.t0) oldDmg = t;
    }
    if (st === 'dmg' && nDmg >= TXT_DMG_MAX) it = oldDmg;   // cap concurrent damage numbers: recycle the oldest
    if (!it) for (const t of TXT) if (!t.on) { it = t; break; }
    if (!it) { it = TXT[0]; for (const t of TXT) if (t.t0 < it.t0) it = t; }
    if (S.plus && /^\d/.test(s)) s = '+' + s;
    it.b.textContent = s; it.f.textContent = s;
    it.el.className = 'ft ' + S.cls;
    if (st === 'word') it.el.style.setProperty('--f', WORD_COLS[(Math.random() * WORD_COLS.length) | 0]);
    else it.el.style.removeProperty('--f');
    it.on = true; it.t = 0; it.t0 = clock; it.life = S.life; it.rise = S.rise;
    it.st = st; it.num = num; it.ox = x; it.oy = y; it.oz = z; it.lift = 0; it.side = 0; it.bump = 0;
    textBox(it, s);
    it.x = x + frand(-S.drift, S.drift); it.y = y; it.z = z + frand(-0.1, 0.1); it.dx = frand(-0.25, 0.25);
    it.rot = S.rot ? frand(-S.rot, S.rot) : 0;
    it.el.style.visibility = 'visible'; it.el.style.opacity = '0';
  }
  // Top margin (CSS px) that no floating text rises past, so numbers never climb into the HUD / boss bar.
  // UI may set FX.textTop = its boss-bar bottom while the boss bar shows (null = automatic). Automatic: 12 % of the
  // screen height, or under a showing boss bar (#ui .u-boss.on, looked up 4x a second: portrait puts it lower).
  let txtTop = null, bbEl = null, bbToast = null, bbT = -1, bbBot = 0;
  function textTopPx() {
    const H = innerHeight || 1;
    if (typeof txtTop === 'number' && isFinite(txtTop) && txtTop > 0) return Math.min(txtTop, 0.45 * H);
    if (clock - bbT > 0.25 || clock < bbT) {
      bbT = clock; bbBot = 0;
      if (!bbEl || !bbEl.isConnected) bbEl = typeof document !== 'undefined' ? document.querySelector('.u-boss') : null;
      if (bbEl && bbEl.classList.contains('on')) { const r = bbEl.getBoundingClientRect(); if (r.height > 0) bbBot = r.bottom + 8; }
      if (!bbToast || !bbToast.isConnected) bbToast = typeof document !== 'undefined' ? document.querySelector('.u-toast') : null;
      if (bbToast && bbToast.classList.contains('on')) { const r = bbToast.getBoundingClientRect(); if (r.height > 0) bbBot = Math.max(bbBot, r.bottom + 8); }
    }
    return Math.min(Math.max(0.12 * H, bbBot), 0.45 * H);
  }
  const TACT = [];
  function txtHit(a, n, x, y) {   // the first (oldest) of TACT[0..n-1] that text a would overlap at screen centre (x, y)
    for (let k = 0; k < n; k++) {
      const b = TACT[k];
      if (Math.abs(x - b.sx - b.side) * 2 < a.w + b.w && Math.abs(y - b.sy - b.lift) * 2 < a.h + b.h) return b;
    }
    return null;
  }
  function stepText(dt) {
    let na = 0;
    for (const it of TXT) {
      if (!it.on) continue;
      it.t += dt;
      const p = it.t / it.life;
      if (p >= 1) { it.on = false; it.el.style.visibility = 'hidden'; continue; }
      const rise = it.rise * (1 - Math.exp(-it.t * 2.6));
      _v.set(it.x + it.dx * p, it.y + rise, it.z);
      toScreen(_v, scr);
      if (!scr.vis) { it.el.style.opacity = '0'; continue; }
      it.sx = scr.x; it.sy = scr.y;
      let j = na++;   // insertion sort: oldest first
      while (j > 0 && TACT[j - 1].t0 > it.t0) { TACT[j] = TACT[j - 1]; j--; }
      TACT[j] = it;
    }
    // De-overlap: older texts keep their place; a newer text that overlaps one is pushed up above it (4 px gap).
    // The lift only ever grows, so texts never bounce back down. No text passes the top margin (textTopPx): a text
    // there stays put, and one that would be pushed past it steps aside (left/right of the text it overlaps) instead.
    const top = textTopPx(), W = innerWidth || 1;
    for (let i = 0; i < na; i++) {
      const a = TACT[i];
      if (a.st === 'word' && a.viewW !== W) textBox(a, a.f.textContent);
      if (a.bump > 0) a.bump = Math.max(0, a.bump - dt / 0.18);
      const p = a.t / a.life;
      const pop = a.t < 0.2 ? 0.3 + 0.7 * backOut(a.t / 0.2) : 1;
      const s = pop * (p > 0.7 ? 1 - (p - 0.7) * 0.5 : 1) * (1 + 0.3 * a.bump);
      const o = p < 0.62 ? 1 : 1 - (p - 0.62) / 0.38;
      // smallest lift that keeps the whole box under the margin: rotated corners, pop/merge scale, the POW starburst (1.15 em)
      const rr = a.rot * (Math.PI / 180);
      let up = 0.52 * (a.h * Math.abs(Math.cos(rr)) + a.w * Math.abs(Math.sin(rr)));
      if (a.st === 'crit') up = Math.max(up, TXT_FS.crit * 1.18);
      const yMin = top + up * Math.max(1, s) - a.sy;
      let L = Math.max(a.lift, yMin), X = a.side, dir = 0;
      for (let pass = 0; pass < 12; pass++) {
        const b = txtHit(a, i, a.sx + X, a.sy + L);
        if (!b) break;
        const bx = b.sx + b.side, above = b.sy + b.lift - (a.h + b.h) * 0.5 - 4 - a.sy;
        if (above >= yMin) { L = above; continue; }
        // no room above (HUD band): step aside. The first step picks a free, on-screen side (the side it leans to first),
        // later steps in this frame keep that direction so it never ping-pongs between two neighbours.
        const d = (a.w + b.w) * 0.5 + 4;
        const fits = dd => (dd > 0 ? bx + d + a.w * 0.5 <= W : bx - d - a.w * 0.5 >= 0);
        if (!dir) {
          const pref = a.sx + X >= bx ? 1 : -1;
          dir = fits(pref) && !txtHit(a, i, bx + pref * d, a.sy + L) ? pref
            : fits(-pref) && !txtHit(a, i, bx - pref * d, a.sy + L) ? -pref : fits(pref) ? pref : -pref;
        } else if (!fits(dir)) dir = -dir;
        X = bx + dir * d - a.sx;
      }
      a.lift = a.t < 0.15 || L > a.lift - 2 ? L : a.lift + (L - a.lift) * Math.min(1, dt * 22);   // glide if pushed late
      a.side = a.t < 0.15 ? X : a.side + (X - a.side) * Math.min(1, dt * 22);
      const boxW = a.st === 'crit' ? Math.max(a.w, TXT_FS.crit * 2.3) : a.w;
      const boxH = a.st === 'crit' ? Math.max(a.h, TXT_FS.crit * 2.3) : a.h;
      const half = Math.min(W * 0.5, (boxW * Math.abs(Math.cos(rr)) + boxH * Math.abs(Math.sin(rr))) * s * 0.5 + 8);
      a.side = clamp(a.sx + a.side, half, W - half) - a.sx;
      a.el.style.transform = 'translate3d(' + (a.sx + a.side).toFixed(1) + 'px,' + (a.sy + a.lift).toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + s.toFixed(3) + ') rotate(' + a.rot.toFixed(1) + 'deg)';
      a.el.style.opacity = o.toFixed(3);
    }
    for (let i = 0; i < na; i++) TACT[i] = null;
  }

  // ───────────────────────── Camera shake, screen flash, light flash ─────────────────────────
  const shakeOffset = new THREE.Vector3();
  let shk = 0, flA = 0, flT = 0, flD = 0, flOn = false, lfI = 0, lfT = 0, lfD = 0;
  // Light bursts drive core's LIGHTS.flash (renderFrame lends it a pooled light) — no extra PointLight in the scene.
  function flashL() { return typeof LIGHTS !== 'undefined' && LIGHTS.flash ? LIGHTS.flash : null; }
  function shake(a = 0.3) { shk = Math.min(1.2, Math.max(shk, a) + a * 0.25); }
  function flash(color = '#ff3040', amount = 0.5, dur = 0.35) {
    if (!ready) init();
    const rem = flOn ? flA * (1 - flT / flD) : 0;
    if (amount < rem) return;
    POST.tint.set(color);
    if (flashDiv) flashDiv.style.boxShadow = 'inset 0 0 180px 60px ' + new THREE.Color(color).getStyle();
    flA = amount; flT = 0; flD = Math.max(0.05, dur); flOn = true;
  }
  function lightFlash(x, z, color = '#fff2c0', intensity = 5, dur = 0.35) {
    if (!ready) init();
    const L = flashL();
    if (!L) return;
    if (lfD > 0 && lfI * (1 - lfT / lfD) ** 2 > intensity) return;
    L.color.set(color); L.x = x; L.y = 1.6; L.z = z; L.distance = 10; L.decay = 1.6;
    lfI = intensity; lfT = 0; lfD = Math.max(0.05, dur); L.intensity = intensity;
  }
  function stepScreen(dt) {
    if (shk > 0) {
      shk = shk * Math.exp(-6.5 * dt) - dt * 0.03;
      if (shk <= 0.002) { shk = 0; shakeOffset.set(0, 0, 0); }
      else {
        const t = clock;
        shakeOffset.set((Math.sin(t * 51) + Math.sin(t * 33.7 + 1.3)) * 0.5 * shk, (Math.sin(t * 47.3 + 0.7) + Math.sin(t * 29.1 + 2.2)) * 0.3 * shk,
          (Math.sin(t * 43.9 + 2.9) + Math.sin(t * 37.3 + 0.4)) * 0.5 * shk);
      }
    }
    if (flOn) {
      flT += dt;
      const k = 1 - flT / flD;
      const v = k <= 0 ? 0 : flA * k * k;
      if (k <= 0) flOn = false;
      POST.tintAmt = v;
      if (flashDiv) flashDiv.style.opacity = Math.min(1, v * 1.6).toFixed(3);
    }
    if (lfD > 0) {
      const L = flashL();
      lfT += dt;
      const k = 1 - lfT / lfD;
      if (k <= 0) lfD = 0;
      if (L) L.intensity = k <= 0 ? 0 : lfI * k * k;
    }
  }

  // ───────────────────────── init / update / clear ─────────────────────────
  function init() {
    if (ready) return;
    ready = true;
    palette();
    atlas = buildAtlas(); glowTex = buildGlowTex(); blobTex = buildBlobTex();
    try {
      const gl = renderer.getContext(), r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      if (r && r[1]) uMaxPt.value = Math.max(32, r[1]);
    } catch (e) { /* keep default */ }
    updScale();
    RESIZE_HOOKS.push(updScale);
    SN = makeSys(1000, false); SA = makeSys(2000, true);
    QUAD = quadGeo(); SLASH_GEO = slashGeo(); BEAM_GEO = beamGeo(); STAR_GEO = starGeo();
    ICE_GEO = iceGeo(); ROCK_GEO = rockGeo(); EMBER_GEO = emberGeo(); SIMIT_GEO = simitGeo(); SHOE_GEO = shoeGeo(); HEART_GEO = heartGeo();
    SHADOW_GEO = keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    SHADOW_DARK = keep(new THREE.MeshBasicMaterial({ map: blobTex, color: 0x2a1824, transparent: true, opacity: 0.4, depthWrite: false }));
    SHADOW_GLOW = keep(new THREE.MeshBasicMaterial({ map: blobTex, color: new THREE.Color('#ff7020').multiplyScalar(0.5), transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }));
    SHADOW_FIZZ = keep(new THREE.MeshBasicMaterial({ map: keep(buildFizzMarkTex()), transparent: true, depthWrite: false }));
    ICE_MAT = keep(rimify(vcMat({ roughness: 0.34, metalness: 0.1, transparent: true, opacity: 0.32, flatShading: true, emissive: 0x45245f, emissiveIntensity: 0.24, envMapIntensity: 1.1, depthWrite: false }), 0x9a79ad, 0.28, 2.2));
    initText();
    // pre-create a few pooled meshes and compile their shaders now (no hitch on first use)
    const pre = { slash: 3, ring: 4, tele: 3, lane: 1, beam: 2, bolt: 2, shield: 1, marker: 1 };
    const made = [];
    for (const k in pre) for (let i = 0; i < pre[k]; i++) { const it = pools[k].make(); pools[k].items.push(it); made.push(it.obj); }
    for (const o of made) o.visible = true;
    try { renderer.compile(scene, camera); } catch (e) { /* compile lazily */ }
    for (const o of made) o.visible = false;
  }
  // Compile the lit materials (ice, projectiles) with the current scene lights/fog — call after a level is built (optional).
  function warm() {
    if (!ready) init();
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ICE_GEO, ICE_MAT));
    for (const k in PROJ) g.add(projectile(k));
    g.position.copy(CAM.target);
    scene.add(g);
    try { renderer.compile(scene, camera); } catch (e) { /* ignore */ }
    scene.remove(g);
    // An invisible lane telegraph rides along into the next real draw (GAME's warm-up render right after this call):
    // ANGLE/Metal only builds the pipeline at the first draw, so the lava turtle's first roll does not hitch.
    const it = acquire('lane', 6);
    laneSet(it, CAM.target.x, CAM.target.z + 1, CAM.target.x, CAM.target.z - 1, 1.5, 0.3, null);
    it.warm = true;
  }
  const STEP = { slash: stepSlash, ring: stepRing, tele: stepTele, lane: stepLane, beam: stepBeam, bolt: stepBolt, shield: stepShield, ice: stepIce,
    marker: stepMarker, dizzy: stepDizzy };
  function update(dt) {
    if (!ready) return;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    clock += dt; uTime.value = clock;
    for (const k in STEP) {
      const f = STEP[k], items = pools[k].items;
      for (let i = 0; i < items.length; i++) if (items[i].on) f(items[i], dt);
    }
    stepProjs(dt);
    const te = camera.matrixWorldInverse.elements;
    stepSys(SA, dt, te); stepSys(SN, dt, te);
    stepText(dt);
    stepScreen(dt);
  }
  function clear() {
    if (!ready) return;
    SA.n = 0; SN.n = 0; SA.geo.setDrawRange(0, 0); SN.geo.setDrawRange(0, 0);
    for (const k in pools) for (const it of pools[k].items) if (it.on) release(it);
    for (const t of TXT) { t.on = false; t.el.style.visibility = 'hidden'; }
    for (const g of projs) g.userData.fxp.reg = false;
    projs.length = 0;
    shk = 0; shakeOffset.set(0, 0, 0);
    if (flOn) { flOn = false; POST.tintAmt = 0; if (flashDiv) flashDiv.style.opacity = '0'; }
    if (lfD > 0) { lfD = 0; const L = flashL(); if (L) L.intensity = 0; }
  }
  function stats() {
    const act = {};
    for (const k in pools) act[k] = pools[k].items.filter(i => i.on).length + '/' + pools[k].items.length;
    return { add: SA ? SA.n : 0, norm: SN ? SN.n : 0, projs: projs.length, text: TXT.filter(t => t.on).length, pools: act };
  }

  return {
    init, update, clear, warm, stats, burst, emit, slash, ring, telegraph, telegraphCone, telegraphLine, marker, dizzy, beam, lightning, shield, iceBlock,
    projectile, trail, floatText, shake, flash, lightFlash, shakeOffset, SHAPES: SH,
    get atlas() { return atlas; },
    get textTop() { return txtTop; }, set textTop(v) { txtTop = v; },
  };
})();
